from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint, ST_Y, ST_X
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.models import Ocorrencia, Usuario

router = APIRouter(prefix="/api/v1/ocorrencias", tags=["Ocorrências e Validação"])

class OcorrenciaCreate(BaseModel):
    categoria: str
    descricao: Optional[str] = None
    latitude: float
    longitude: float
    usuario_id: int

@router.post("", status_code=status.HTTP_201_CREATED)
def criar_ocorrencia(payload: OcorrenciaCreate, db: Session = Depends(get_db)):
    # Verifica se o usuário existe
    usuario = db.query(Usuario).filter(Usuario.id == payload.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Criação do ponto espacial PostGIS (SRID 4326 - WGS84)
    ponto_geom = WKTElement(f'POINT({payload.longitude} {payload.latitude})', srid=4326)
    # Nota: Se estiver usando geoalchemy2 puro com WKTElement, certifique-se de importar WKTElement de geoalchemy2
    
    # Maneira alternativa direta compatível com GeoAlchemy2 sem import extra:
    ponto_geom = func.ST_SetSRID(func.ST_MakePoint(payload.longitude, payload.latitude), 4326)

    nova_ocorrencia = Ocorrencia(
        categoria=payload.categoria,
        descricao=payload.descricao,
        status="Pendente",
        ico=10.0,  # Pontuação inicial de confiança ao criar
        ipa=5.0,   # Índice de prioridade inicial
        geom=ponto_geom,
        usuario_id=payload.usuario_id
    )

    db.add(nova_ocorrencia)
    
    # Bonifica o usuário criador com 15 pontos de engajamento comunitário
    usuario.pontos += 15
    
    db.commit()
    db.refresh(nova_ocorrencia)

    return {
        "mensagem": "Ocorrência registrada com sucesso!",
        "ocorrencia_id": nova_ocorrencia.id,
        "status": nova_ocorrencia.status
    }


@router.post("/{ocorrencia_id}/validar", status_code=status.HTTP_200_OK)
def validar_ocorrencia(ocorrencia_id: int, usuario_id: int = Query(...), db: Session = Depends(get_db)):
    ocorrencia = db.query(Ocorrencia).filter(Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada.")

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário validador não encontrado.")

    # Incrementa o Índice de Confiança da Ocorrência (ICO) em +15% a cada validação comunitária
    ocorrencia.ico = min(100.0, ocorrencia.ico + 15.0)
    
    # Se atingir 50% ou mais de ICO, o status muda automaticamente para 'Em Validação' ou 'Confirmado'
    if ocorrencia.ico >= 50.0 and ocorrencia.status == "Pendente":
        ocorrencia.status = "Confirmado"

    # Recompensa o cidadão que validou com 5 pontos
    usuario.pontos += 5

    db.commit()

    return {
        "mensagem": "Validação comunitária registrada com sucesso!",
        "novo_ico": ocorrencia.ico,
        "status_atual": ocorrencia.status,
        "pontos_usuario": usuario.pontos
    }