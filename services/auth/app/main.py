from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routers import auth
from app.models.user import User  # <--- ВОТ ЭТА СТРОЧКА ВСЁ ИСПРАВЛЯЕТ!

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Теперь SQLAlchemy "видит" модель User и создаст таблицу users
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    title="Auth Service",
    description="Сервис аутентификации и авторизации",
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

app.include_router(auth.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth"}