from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    criar_token_acesso,
    obter_hash_senha,
    obter_usuario_atual,
    verificar_senha,
)
from app.models.models import Usuario
from app.schemas.user_schemas import TokenResponse, UsuarioCreate, UsuarioLogin

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticação"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def registrar_usuario(payload: UsuarioCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    usuario_existente = (
        db.query(Usuario)
        .filter(func.lower(Usuario.email) == email)
        .first()
    )
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já está cadastrado no ACESSA+.",
        )

    novo_usuario = Usuario(
        nome=payload.nome,
        email=email,
        senha_hash=obter_hash_senha(payload.senha),
        pontos=0,
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)

    return {
        "access_token": criar_token_acesso(data={"sub": novo_usuario.email}),
        "token_type": "bearer",
        "usuario": {
            "id": novo_usuario.id,
            "nome": novo_usuario.nome,
            "email": novo_usuario.email,
            "pontos": novo_usuario.pontos,
        },
    }


@router.post("/login", response_model=TokenResponse)
def fazer_login(payload: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = (
        db.query(Usuario)
        .filter(func.lower(Usuario.email) == payload.email.lower())
        .first()
    )
    if not usuario or not verificar_senha(payload.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
        )

    access_token = criar_token_acesso(data={"sub": usuario.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "pontos": usuario.pontos,
        },
    }


@router.get("/me")
def obter_perfil(usuario: Usuario = Depends(obter_usuario_atual)):
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "pontos": usuario.pontos,
    }


@router.get("/ranking")
def obter_ranking(db: Session = Depends(get_db)):
    usuarios = (
        db.query(Usuario)
        .order_by(Usuario.pontos.desc(), Usuario.nome.asc())
        .limit(20)
        .all()
    )
    return {
        "usuarios": [
            {
                "id": usuario.id,
                "nome": usuario.nome,
                "pontos": usuario.pontos,
            }
            for usuario in usuarios
        ]
    }
