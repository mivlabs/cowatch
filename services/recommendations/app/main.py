from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine
from app.routers.recommendations import router as recommendations_router
from app.routers.catalog import router as catalog_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Recommendations Service",
    description="Content-based рекомендации фильмов для CoWatch на основе истории совместных просмотров",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendations_router)
app.include_router(catalog_router)


@app.get("/health")
async def health_check():
    model_loaded = (Path(settings.model_dir) / "latest.joblib").exists()
    return {"status": "healthy", "service": "recommendations", "model_loaded": model_loaded}
