import json
import os
from typing import Literal
import requests
from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db, IS_SQLITE
from app.core.geo import distancia_metros
from app.models.models import Ocorrencia

router = APIRouter(prefix="/api/v1/rotas", tags=["Rotas a Pé"])

VALHALLA_URL = os.getenv(
    "VALHALLA_URL",
    "https://valhalla1.openstreetmap.de/route",
)
USER_AGENT = os.getenv(
    "NOMINATIM_USER_AGENT",
    "AcessaMais/1.0 (https://github.com/EduardoDudu006/acessa-mais2)",
)
VELOCIDADES_CAMINHADA_KMH = {
    "pedestre": 4.5,
    "pe_lento": 3.0,
}


class RotaRequest(BaseModel):
    origem_lat: float = Field(ge=-90, le=90)
    origem_lon: float = Field(ge=-180, le=180)
    destino_lat: float = Field(ge=-90, le=90)
    destino_lon: float = Field(ge=-180, le=180)
    perfil: Literal["pedestre", "pe_lento", "cadeira_de_rodas"] = "pedestre"


def decodificar_polyline6(encoded: str) -> list[list[float]]:
    coordenadas = []
    indice = 0
    latitude = 0
    longitude = 0

    while indice < len(encoded):
        deltas = []
        for _ in range(2):
            resultado = 0
            deslocamento = 0
            while True:
                if indice >= len(encoded):
                    raise ValueError("Polyline truncada.")
                valor = ord(encoded[indice]) - 63
                indice += 1
                if valor < 0:
                    raise ValueError("Polyline inválida.")
                resultado |= (valor & 0x1F) << deslocamento
                deslocamento += 5
                if valor < 0x20:
                    break
            deltas.append(
                ~(resultado >> 1) if resultado & 1 else resultado >> 1
            )

        latitude += deltas[0]
        longitude += deltas[1]
        coordenadas.append([longitude / 1_000_000, latitude / 1_000_000])

    return coordenadas


def criar_pedido_valhalla(payload: RotaRequest) -> dict:
    if payload.perfil == "cadeira_de_rodas":
        raise HTTPException(
            status_code=422,
            detail=(
                "A rota específica para cadeira de rodas ainda não está disponível. "
                "A rota pedestre pode incluir escadas e não verifica rampas ou "
                "continuidade das calçadas."
            ),
        )

    return {
        "locations": [
            {"lat": payload.origem_lat, "lon": payload.origem_lon},
            {"lat": payload.destino_lat, "lon": payload.destino_lon},
        ],
        "costing": "pedestrian",
        "units": "kilometers",
        "costing_options": {
            "pedestrian": {
                "walking_speed": VELOCIDADES_CAMINHADA_KMH[payload.perfil],
            }
        },
    }


def validar_resposta_valhalla(data: object) -> dict:
    if (
        not isinstance(data, dict)
        or not isinstance(data.get("trip"), dict)
        or data.get("status", 0) != 0
    ):
        raise ValueError("Valhalla não retornou uma rota.")
    return data["trip"]


@router.post("/calcular")
def calcular_rota_acessivel(
    payload: RotaRequest,
    db: Session = Depends(get_db),
):
    pedido = criar_pedido_valhalla(payload)
    try:
        response = requests.get(
            VALHALLA_URL,
            params={"json": json.dumps(pedido, separators=(",", ":"))},
            headers={"User-Agent": USER_AGENT},
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as error:
        raise HTTPException(
            status_code=503,
            detail="Serviço de roteamento pedestre indisponível no momento.",
        ) from error

    try:
        trip = validar_resposta_valhalla(data)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível calcular uma rota a pé para esses pontos.",
        ) from error

    try:
        resumo = trip["summary"]
        geometria_geojson = {
            "type": "LineString",
            "coordinates": decodificar_polyline6(
                trip["legs"][0]["shape"]
            ),
        }
        distancia_metros_rota = float(resumo["length"]) * 1000
        duracao_segundos = float(resumo["time"])
        coordenadas_trajeto = geometria_geojson["coordinates"]
        if len(coordenadas_trajeto) < 2:
            raise ValueError("A rota não contém pontos suficientes.")
    except (IndexError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="O serviço de roteamento retornou uma rota inválida.",
        ) from error

    obstaculos_encontrados = set()
    pontos_analise = coordenadas_trajeto[::5]
    if pontos_analise[-1] != coordenadas_trajeto[-1]:
        pontos_analise.append(coordenadas_trajeto[-1])

    if IS_SQLITE:
        ocorrencias_confirmadas = (
            db.query(Ocorrencia)
            .filter(Ocorrencia.status.in_(["Confirmado", "Em Validação"]))
            .all()
        )
        for lon, lat in pontos_analise:
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
        for lon, lat in pontos_analise:
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

    quantidade_relatos_proximos = len(obstaculos_encontrados)
    return {
        "status": "sucesso",
        "perfil": payload.perfil,
        "provedor": "Valhalla/OpenStreetMap",
        "distancia_metros": distancia_metros_rota,
        "tempo_estimado_minutos": round(duracao_segundos / 60.0, 1),
        "obstaculos_proximos": quantidade_relatos_proximos,
        "avaliar_seguranca": (
            "Relatos comunitários próximos"
            if quantidade_relatos_proximos
            else "Nenhum relato próximo registrado"
        ),
        "geometria": geometria_geojson,
    }
