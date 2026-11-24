import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, localizacoes, ocorrencias, rotas
from app.core.database import Base, engine
from app.models import models  # noqa: F401

Base.metadata.create_all(bind=engine)
origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app = FastAPI(
    title="ACESSA+ API",
    version="1.0.0",
    description="Backend oficial da plataforma de acessibilidade urbana e mobilidade de Recife-PE",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(localizacoes.router)
app.include_router(ocorrencias.router)
app.include_router(rotas.router)


@app.get("/api/v1/health", tags=["Status"])
def health_check():
    return {
        "status": "online",
        "projeto": "ACESSA+",
        "cidade": "Recife-PE",
    }
