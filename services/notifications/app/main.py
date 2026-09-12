import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.services import consumer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await consumer.start()
    logger.info("✅ [NOTIFICATIONS] Consumer cowatch.events запущен")

    yield

    await consumer.stop()
    await engine.dispose()


app = FastAPI(
    title="Notifications Service",
    description="Слушает cowatch.events и выдаёт ачивки через auth-сервис",
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


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "notifications"}
