from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    pontos = Column(Integer, default=0, nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())


class Ocorrencia(Base):
    __tablename__ = "ocorrencias"

    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=True)
    status = Column(String(50), default="Pendente", nullable=False)  # Pendente, Em Validação, Confirmado, Resolvido
    ico = Column(Float, default=0.0, nullable=False)  # Índice de Confiança da Ocorrência
    ipa = Column(Float, default=0.0, nullable=False)  # Índice de Prioridade de Acessibilidade
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
