from typing import Optional
import requests
from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Ocorrencia

router = APIRouter(prefix="/api/v1/rotas", tags=["Rotas Acessíveis"])


class RotaRequest(BaseModel):
    origem_lat: float
    origem_lon: float
    destino_lat: float
    destino_lon: float
    perfil: Optional[str] = "cadeira_de_rodas"  # cadeira_de_rodas, pe_lento, geral


@router.post("/calcular")
def calcular_rota_acessivel(payload: RotaRequest, db: Session = Depends(get_db)):
    coords_str = f"{payload.origem_lon},{payload.origem_lat};{payload.destino_lon},{payload.destino_lat}"
    osrm_url = (
        f"http://router.project-osrm.org/route/v1/foot/{coords_str}"
        "?overview=full&geometries=geojson"
    )

    try:
        response = requests.get(osrm_url, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(
                status_code=400,
                detail="Não foi possível calcular a rota a pé para os pontos informados.",
            )

        rota_principal = data["routes"][0]
        geometria_geojson = rota_principal["geometry"]
        coordenadas_trajeto = geometria_geojson["coordinates"]  # Lista de [lon, lat]

        obstaculos_no_caminho = 0
        for lon, lat in coordenadas_trajeto[::5]:
            ponto_analise = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
            conflito = (
                db.query(Ocorrencia)
                .filter(
                    Ocorrencia.status.in_(["Confirmado", "Em Validação"]),
                    func.ST_DWithin(
                        func.Geography(Ocorrencia.geom),
                        func.Geography(ponto_analise),
                        15,
                    ),
                )
                .first()
            )
            if conflito:
                obstaculos_no_caminho += 1

        fator_velocidade = {
            "cadeira_de_rodas": 1.15,
            "pe_lento": 1.35,
            "geral": 1.0,
        }.get(payload.perfil or "cadeira_de_rodas", 1.15)

        tempo_minutos = round((rota_principal["duration"] / 60.0) * fator_velocidade, 1)
        fator_seguranca = (
            "Alto"
            if obstaculos_no_caminho == 0
            else "Moderado (Atenção a obstáculos reportados)"
        )

        return {
            "status": "sucesso",
            "perfil": payload.perfil,
            "distancia_metros": rota_principal["distance"],
            "tempo_estimado_minutos": tempo_minutos,
            "obstaculos_proximos": obstaculos_no_caminho,
            "avaliar_seguranca": fator_seguranca,
            "geometria": geometria_geojson,
        }
    except HTTPException:
        raise
    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Serviço de roteamento OSRM indisponível no momento.",
        )
