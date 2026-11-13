from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# 1. IMPORTAÇÃO DOS ROUTERS (auth, ocorrencias e rotas)
from app.api import auth, ocorrencias, rotas

load_dotenv()

app = FastAPI(
    title="ACESSA+ API",
    version="1.0.0",
    description="Backend oficial da plataforma de acessibilidade urbana e mobilidade de Recife-PE",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configuração de CORS para permitir requisições do Frontend e Mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. REGISTRO DOS ROUTERS NA APLICAÇÃO
app.include_router(auth.router)
app.include_router(ocorrencias.router)
app.include_router(rotas.router)

@app.get("/api/v1/health", tags=["Status"])
def health_check():
    return {
        "status": "online",
        "projeto": "ACESSA+",
        "cidade": "Recife - PE"
    }