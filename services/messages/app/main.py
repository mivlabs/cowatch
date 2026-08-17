from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.models.message import Channel, Message  # Импортируем модели, чтобы SQLAlchemy их увидел
from app.routers import router as messages_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы при старте
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    title="Messages Service",
    description="Сервис сообщений и WebSocket",
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

app.include_router(messages_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "messages"}