import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Usuario

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")
if len(SECRET_KEY) < 32 or SECRET_KEY.startswith("replace-with-"):
    raise RuntimeError(
        "Configure SECRET_KEY com uma chave aleatória de pelo menos 32 caracteres."
    )
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)


def verificar_senha(senha_pura: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_pura, senha_hash)


def obter_hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def criar_token_acesso(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _obter_usuario_da_credencial(
    credentials: HTTPAuthorizationCredentials,
    db: Session,
) -> Usuario:
    erro_credencial = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou expiradas.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        email = payload.get("sub")
        if not email:
            raise erro_credencial
    except JWTError:
        raise erro_credencial

    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise erro_credencial
    return usuario


def obter_usuario_atual(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    return _obter_usuario_da_credencial(credentials, db)


def obter_usuario_opcional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        optional_bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> Optional[Usuario]:
    if credentials is None:
        return None
    return _obter_usuario_da_credencial(credentials, db)
