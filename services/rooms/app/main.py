from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
# 🔥 ЯВНЫЙ ИМПОРТ ПРЯМО ИЗ ФАЙЛА rooms.py
from app.routers.rooms import router as rooms_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    title="Rooms Service",
    description="Управление комнатами WatchParty",
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

# 🔥 Явно подключаем роутер с комнатами и вебсокетами
app.include_router(rooms_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "rooms"}