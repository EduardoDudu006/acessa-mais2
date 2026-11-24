from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.database import get_db, IS_SQLITE
from app.core.geo import distancia_metros
from app.core.security import obter_usuario_atual, obter_usuario_opcional
from app.models.models import Ocorrencia, Usuario, ValidacaoOcorrencia

router = APIRouter(prefix="/api/v1/ocorrencias", tags=["Ocorrências e Validação"])


class OcorrenciaCreate(BaseModel):
    categoria: str = Field(min_length=2, max_length=100)
    descricao: Optional[str] = Field(default=None, max_length=2000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


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
    limite: int = Query(default=500, ge=1, le=1000),
    db: Session = Depends(get_db),
    usuario: Optional[Usuario] = Depends(obter_usuario_opcional),
):
    if IS_SQLITE:
        query = db.query(Ocorrencia)
    else:
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

    if lat is not None and lon is not None and not IS_SQLITE:
        ponto_ref = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        query = query.filter(
            func.ST_DWithin(
                func.Geography(Ocorrencia.geom),
                func.Geography(ponto_ref),
                raio_metros,
            )
        )

    ordered_query = query.order_by(Ocorrencia.id.desc())
    rows = ordered_query.all() if IS_SQLITE else ordered_query.limit(limite).all()
    if IS_SQLITE and lat is not None and lon is not None:
        rows = [
            row
            for row in rows
            if distancia_metros(lat, lon, row.latitude, row.longitude)
            <= raio_metros
        ]
    if IS_SQLITE:
        rows = rows[:limite]
    validacoes_do_usuario = set()
    if usuario and rows:
        ids_ocorrencias = [row.id for row in rows]
        validacoes_do_usuario = {
            ocorrencia_id
            for (ocorrencia_id,) in db.query(
                ValidacaoOcorrencia.ocorrencia_id
            )
            .filter(
                ValidacaoOcorrencia.usuario_id == usuario.id,
                ValidacaoOcorrencia.ocorrencia_id.in_(ids_ocorrencias),
            )
            .all()
        }
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
            "validada_por_mim": row.id in validacoes_do_usuario,
            "criado_em": row.criado_em.isoformat() if row.criado_em else None,
        }
        for row in rows
    ]
    return {"ocorrencias": ocorrencias, "total": len(ocorrencias)}


@router.get("/resumo", status_code=status.HTTP_200_OK)
def obter_resumo(db: Session = Depends(get_db)):
    total = db.query(func.count(Ocorrencia.id)).scalar() or 0
    por_status = (
        db.query(Ocorrencia.status, func.count(Ocorrencia.id))
        .group_by(Ocorrencia.status)
        .all()
    )
    por_categoria = (
        db.query(Ocorrencia.categoria, func.count(Ocorrencia.id))
        .group_by(Ocorrencia.categoria)
        .order_by(func.count(Ocorrencia.id).desc())
        .all()
    )
    return {
        "total": total,
        "por_status": {status: quantidade for status, quantidade in por_status},
        "por_categoria": [
            {"categoria": categoria, "quantidade": quantidade}
            for categoria, quantidade in por_categoria
        ],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def criar_ocorrencia(
    payload: OcorrenciaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    localizacao = (
        {"latitude": payload.latitude, "longitude": payload.longitude}
        if IS_SQLITE
        else {
            "geom": func.ST_SetSRID(
                func.ST_MakePoint(payload.longitude, payload.latitude),
                4326,
            )
        }
    )
    ico_inicial = 10.0
    ipa_inicial = _calcular_ipa(payload.categoria, ico_inicial)

    nova_ocorrencia = Ocorrencia(
        categoria=payload.categoria,
        descricao=payload.descricao,
        status="Pendente",
        ico=ico_inicial,
        ipa=ipa_inicial,
        usuario_id=usuario.id,
        **localizacao,
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
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    ocorrencia = db.query(Ocorrencia).filter(Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada.")

    if ocorrencia.usuario_id == usuario.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode validar uma ocorrência criada por você.",
        )

    validacao = ValidacaoOcorrencia(
        ocorrencia_id=ocorrencia.id,
        usuario_id=usuario.id,
    )
    db.add(validacao)

    ocorrencia.ico = min(100.0, (ocorrencia.ico or 0.0) + 15.0)
    ocorrencia.ipa = _calcular_ipa(ocorrencia.categoria, ocorrencia.ico)

    if ocorrencia.ico >= 50.0 and ocorrencia.status in ("Pendente", "Em Validação"):
        ocorrencia.status = "Confirmado"
    elif ocorrencia.ico >= 25.0 and ocorrencia.status == "Pendente":
        ocorrencia.status = "Em Validação"

    usuario.pontos = (usuario.pontos or 0) + 5
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já validou esta ocorrência.",
        )
    db.refresh(ocorrencia)
    db.refresh(usuario)

    return {
        "mensagem": "Validação comunitária registrada com sucesso!",
        "novo_ico": ocorrencia.ico,
        "novo_ipa": ocorrencia.ipa,
        "status_atual": ocorrencia.status,
        "pontos_usuario": usuario.pontos,
    }
