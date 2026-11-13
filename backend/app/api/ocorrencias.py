from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint, ST_DWithin, ST_X, ST_Y
from typing import Optional
from app.core.database import get_db
from app.models.models import Ocorrencia

router = APIRouter(prefix="/api/v1/ocorrencias", tags=["Ocorrências e Mapa"])

@router.get("")
def listar_ocorrencias_mapa(
    lat: Optional[float] = Query(None, description="Latitude central do usuário"),
    lon: Optional[float] = Query(None, description="Longitude central do usuário"),
    raio_metros: int = Query(2000, description="Raio de busca em metros (padrão: 2km)"),
    categoria: Optional[str] = Query(None, description="Filtro por categoria de obstáculo"),
    status: Optional[str] = Query(None, description="Filtro por status da ocorrência"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Extrai latitude (Y) e longitude (X) diretamente da geometria PostGIS
    query = db.query(
        Ocorrencia.id,
        Ocorrencia.categoria,
        Ocorrencia.descricao,
        Ocorrencia.status,
        Ocorrencia.ico,
        Ocorrencia.ipa,
        Ocorrencia.criado_em,
        ST_Y(Ocorrencia.geom).label("latitude"),
        ST_X(Ocorrencia.geom).label("longitude")
    )

    # Filtro espacial PostGIS: busca apenas ocorrências dentro do raio informado
    if lat is not None and lon is not None:
        ponto_usuario = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
        # Cast para geography garante cálculo preciso em metros
        query = query.filter(
            func.ST_DWithin(
                func.Geography(Ocorrencia.geom),
                func.Geography(ponto_usuario),
                raio_metros
            )
        )

    if categoria:
        query = query.filter(Ocorrencia.categoria == categoria)
    if status:
        query = query.filter(Ocorrencia.status == status)

    resultados = query.offset(skip).limit(limit).all()

    return {
        "total": len(resultados),
        "ocorrencias": [
            {
                "id": r.id,
                "categoria": r.categoria,
                "descricao": r.descricao,
                "status": r.status,
                "ico": r.ico,
                "ipa": r.ipa,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "criado_em": r.criado_em
            }
            for r in resultados
        ]
    }