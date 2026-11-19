from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, ocorrencias, rotas
from app.core.database import Base, engine
from app.models import models  # noqa: F401

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ACESSA+ API",
    version="1.0.0",
    description="Backend oficial da plataforma de acessibilidade urbana e mobilidade de Recife-PE",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ocorrencias.router)
app.include_router(rotas.router)


@app.get("/api/v1/health", tags=["Status"])
def health_check():
    return {
        "status": "online",
        "projeto": "ACESSA+",
        "cidade": "Recife-PE",
    }
