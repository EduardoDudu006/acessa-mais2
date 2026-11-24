from typing import Optional
import requests
from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db, IS_SQLITE
from app.core.geo import distancia_metros
from app.models.models import Ocorrencia

router = APIRouter(prefix="/api/v1/rotas", tags=["Rotas Acessíveis"])


class RotaRequest(BaseModel):
    origem_lat: float = Field(ge=-90, le=90)
    origem_lon: float = Field(ge=-180, le=180)
    destino_lat: float = Field(ge=-90, le=90)
    destino_lon: float = Field(ge=-180, le=180)
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

        obstaculos_encontrados = set()
        if IS_SQLITE:
            ocorrencias_confirmadas = (
                db.query(Ocorrencia)
                .filter(Ocorrencia.status.in_(["Confirmado", "Em Validação"]))
                .all()
            )
            for lon, lat in coordenadas_trajeto[::5]:
                for ocorrencia in ocorrencias_confirmadas:
                    if (
                        distancia_metros(
                            lat,
                            lon,
                            ocorrencia.latitude,
                            ocorrencia.longitude,
                        )
                        <= 15
                    ):
                        obstaculos_encontrados.add(ocorrencia.id)
        else:
            for lon, lat in coordenadas_trajeto[::5]:
                ponto_analise = func.ST_SetSRID(
                    func.ST_MakePoint(lon, lat),
                    4326,
                )
                conflito = (
                    db.query(Ocorrencia.id)
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
                    obstaculos_encontrados.add(conflito.id)
        obstaculos_no_caminho = len(obstaculos_encontrados)

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
