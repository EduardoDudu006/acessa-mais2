from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID, ST_X, ST_Y
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Ocorrencia, Usuario

router = APIRouter(prefix="/api/v1/ocorrencias", tags=["Ocorrências e Validação"])


class OcorrenciaCreate(BaseModel):
    categoria: str
    descricao: Optional[str] = None
    latitude: float
    longitude: float
    usuario_id: int


def _calcular_ipa(categoria: str, ico: float) -> float:
    pesos_categoria = {
        "Calçada irregular ou buraco": 7.5,
        "Ausência de rampa de acessibilidade": 8.5,
        "Rampa obstruída ou fora do padrão": 8.0,
        "Piso tátil danificado ou ausente": 7.5,
        "Obstáculo fixo na passagem (poste, entulho)": 8.5,
        "Semáforo sem sinal sonoro": 9.0,
    }
    base = pesos_categoria.get(categoria, 6.0)
    return round(min(10.0, base + (ico / 100.0) * 1.5), 1)


@router.get("", status_code=status.HTTP_200_OK)
def listar_ocorrencias(
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    raio_metros: float = Query(default=5000.0, gt=0),
    status_filtro: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(
        Ocorrencia.id,
        Ocorrencia.categoria,
        Ocorrencia.descricao,
        Ocorrencia.status,
        Ocorrencia.ico,
        Ocorrencia.ipa,
        Ocorrencia.usuario_id,
        Ocorrencia.criado_em,
        func.ST_Y(Ocorrencia.geom).label("latitude"),
        func.ST_X(Ocorrencia.geom).label("longitude"),
    )

    if status_filtro:
        query = query.filter(Ocorrencia.status == status_filtro)

    if lat is not None and lon is not None:
        ponto_ref = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        query = query.filter(
            func.ST_DWithin(
                func.Geography(Ocorrencia.geom),
                func.Geography(ponto_ref),
                raio_metros,
            )
        )

    rows = query.order_by(Ocorrencia.id.desc()).all()
    ocorrencias = [
        {
            "id": row.id,
            "categoria": row.categoria,
            "descricao": row.descricao,
            "status": row.status,
            "ico": row.ico,
            "ipa": row.ipa,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "usuario_id": row.usuario_id,
            "criado_em": row.criado_em.isoformat() if row.criado_em else None,
        }
        for row in rows
    ]
    return {"ocorrencias": ocorrencias, "total": len(ocorrencias)}


@router.post("", status_code=status.HTTP_201_CREATED)
def criar_ocorrencia(payload: OcorrenciaCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == payload.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    ponto_geom = func.ST_SetSRID(
        func.ST_MakePoint(payload.longitude, payload.latitude), 4326
    )
    ico_inicial = 10.0
    ipa_inicial = _calcular_ipa(payload.categoria, ico_inicial)

    nova_ocorrencia = Ocorrencia(
        categoria=payload.categoria,
        descricao=payload.descricao,
        status="Pendente",
        ico=ico_inicial,
        ipa=ipa_inicial,
        geom=ponto_geom,
        usuario_id=payload.usuario_id,
    )
    db.add(nova_ocorrencia)
    usuario.pontos = (usuario.pontos or 0) + 15
    db.commit()
    db.refresh(nova_ocorrencia)

    return {
        "mensagem": "Ocorrência registrada com sucesso!",
        "ocorrencia_id": nova_ocorrencia.id,
        "status": nova_ocorrencia.status,
        "ico": nova_ocorrencia.ico,
        "ipa": nova_ocorrencia.ipa,
        "pontos_usuario": usuario.pontos,
    }


@router.post("/{ocorrencia_id}/validar", status_code=status.HTTP_200_OK)
def validar_ocorrencia(
    ocorrencia_id: int,
    usuario_id: int = Query(...),
    db: Session = Depends(get_db),
):
    ocorrencia = db.query(Ocorrencia).filter(Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada.")

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário validador não encontrado.")

    ocorrencia.ico = min(100.0, (ocorrencia.ico or 0.0) + 15.0)
    ocorrencia.ipa = _calcular_ipa(ocorrencia.categoria, ocorrencia.ico)

    if ocorrencia.ico >= 50.0 and ocorrencia.status in ("Pendente", "Em Validação"):
        ocorrencia.status = "Confirmado"
    elif ocorrencia.ico >= 25.0 and ocorrencia.status == "Pendente":
        ocorrencia.status = "Em Validação"

    usuario.pontos = (usuario.pontos or 0) + 5
    db.commit()
    db.refresh(ocorrencia)
    db.refresh(usuario)

    return {
        "mensagem": "Validação comunitária registrada com sucesso!",
        "novo_ico": ocorrencia.ico,
        "novo_ipa": ocorrencia.ipa,
        "status_atual": ocorrencia.status,
        "pontos_usuario": usuario.pontos,
    }
