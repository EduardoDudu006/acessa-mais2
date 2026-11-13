from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID
from pydantic import BaseModel
import requests
from typing import List, Optional
from app.core.database import get_db
from app.models.models import Ocorrencia

router = APIRouter(prefix="/api/v1/rotas", tags=["Rotas Acessíveis"])

class RotaRequest(BaseModel):
    origem_lat: float
    origem_lon: float
    destino_lat: float
    destino_lon: float
    perfil: Optional[str] = "cadeira_de_rodas" # cadeira_de_rodas, pe_lento, geral

@router.post("/calcular")
def calcular_rota_acessivel(payload: RotaRequest, db: Session = Depends(get_db)):
    # 1. Consulta o OSRM público para pedestres (walking profile)
    # Coordenadas no OSRM devem seguir o padrão: {longitude},{latitude}
    coords_str = f"{payload.origem_lon},{payload.origem_lat};{payload.destino_lon},{payload.destino_lat}"
    osrm_url = f"http://router.project-osrm.org/route/v1/foot/{coords_str}?overview=full&geometries=geojson"

    try:
        response = requests.get(osrm_url, timeout=10)
        data = response.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(status_code=400, detail="Não foi possível calcular a rota a pé para os pontos informados.")

        rota_principal = data["routes"][0]
        geometria_geojson = rota_principal["geometry"] # Linestring GeoJSON do trajeto
        coordenadas_trajeto = geometria_geojson["coordinates"] # Lista de [lon, lat]

        # 2. Validação espacial: verifica se existem obstáculos confirmados em um raio de 15 metros do trajeto
        obstaculos_no_caminho = 0
        for lon, lat in coordenadas_trajeto[::5]: # Amostragem a cada 5 pontos para otimização
            ponto_analise = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
            
            conflito = db.query(Ocorrencia).filter(
                Ocorrencia.status.in_(["Confirmado", "Em Validação"]),
                ST_DWithin(func.Geography(Ocorrencia.geom), func.Geography(ponto_analise), 15) # 15 metros de raio
            ).first()

            if conflito:
                obstaculos_no_caminho += 1

        fator_seguranca = "Alto" if obstaculos_no_caminho == 0 else "Moderado (Atenção a obstáculos reportados)"

        return {
            "status": "sucesso",
            "distancia_metros": rota_principal["distance"],
            "tempo_estimado_minutos": round(rota_principal["duration"] / 60, 1),
            "obstaculos_proximos": obstaculos_no_caminho,
            "avaliar_seguranca": fator_seguranca,
            "geometria": geometria_geojson
        }

    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Serviço de roteamento OSRM indisponível no momento.")