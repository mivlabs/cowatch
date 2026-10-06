import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, async_session, engine
from app.routers.catalog import router as catalog_router
from app.routers.recommendations import router as recommendations_router
from app.services.migrations import ensure_content_columns
from app.services.model_store import store


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_content_columns(conn)

    # Обучение из базы в фоне: старт не ждёт, пока модель посчитается,
    # а дальше цикл переобучает её по расписанию (см. model_store.py).
    retrain_task = asyncio.create_task(store.run_forever(async_session, settings.retrain_interval_hours))
    try:
        yield
    finally:
        retrain_task.cancel()
        try:
            await retrain_task
        except asyncio.CancelledError:
            pass
        await engine.dispose()


app = FastAPI(
    title="Recommendations Service",
    description="Content-based рекомендации фильмов для CoWatch на основе каталога TMDB и истории совместных просмотров",
    version="0.2.0",
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
    return {"status": "healthy", "service": "recommendations", "model_loaded": store.loaded}
