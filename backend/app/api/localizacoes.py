import os
from functools import lru_cache
from threading import Lock
from time import monotonic, sleep
from typing import Any
import requests
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/v1/localizacoes", tags=["Localização"])

NOMINATIM_URL = os.getenv(
    "NOMINATIM_URL",
    "https://nominatim.openstreetmap.org/search",
)
USER_AGENT = os.getenv(
    "NOMINATIM_USER_AGENT",
    "AcessaMais/1.0 (https://github.com/EduardoDudu006/acessa-mais2)",
)
_request_lock = Lock()
_last_request_at = 0.0


def _buscar_nominatim(query: str) -> list[dict[str, Any]]:
    global _last_request_at

    with _request_lock:
        tempo_espera = 1.0 - (monotonic() - _last_request_at)
        if tempo_espera > 0:
            sleep(tempo_espera)
        try:
            response = requests.get(
                NOMINATIM_URL,
                params={
                    "q": query,
                    "format": "jsonv2",
                    "addressdetails": 1,
                    "countrycodes": "br",
                    "limit": 5,
                    "accept-language": "pt-BR",
                },
                headers={"User-Agent": USER_AGENT},
                timeout=8,
            )
            response.raise_for_status()
            return response.json()
        finally:
            _last_request_at = monotonic()


@lru_cache(maxsize=256)
def _buscar_endereco_em_cache(
    query: str,
) -> tuple[tuple[str, str, str, str], ...]:
    try:
        resultados = _buscar_nominatim(query)
    except requests.RequestException as error:
        raise HTTPException(
            status_code=503,
            detail="Serviço de busca de endereços indisponível. Tente novamente.",
        ) from error

    return tuple(
        (
            str(item["place_id"]),
            str(item["display_name"]),
            str(item["lat"]),
            str(item["lon"]),
        )
        for item in resultados
        if item.get("place_id")
        and item.get("display_name")
        and item.get("lat")
        and item.get("lon")
    )


@router.get("/buscar")
def buscar_endereco(
    endereco: str = Query(min_length=3, max_length=250),
):
    query = " ".join(endereco.split())
    resultados = _buscar_endereco_em_cache(query.casefold())
    return {
        "resultados": [
            {
                "id": item_id,
                "endereco": nome,
                "latitude": float(latitude),
                "longitude": float(longitude),
            }
            for item_id, nome, latitude, longitude in resultados
        ]
    }
