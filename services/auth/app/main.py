import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import engine, Base
from app.routers import auth

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("uvicorn.error")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.debug(f"🔥🔥🔥 ЗАПРОС ПОЛУЧЕН: {request.method} {request.url}")
        logger.debug(f"Headers: {dict(request.headers)}")
        try:
            response = await call_next(request)
            logger.debug(f"✅ ОТВЕТ ОТПРАВЛЕН: {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"💥💥💥 КРИТИЧЕСКАЯ ОШИБКА ПРИ ОБРАБОТКЕ ЗАПРОСА: {e}", exc_info=True)
            raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 [AUTH] Запуск приложения, создаем таблицы БД...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ [AUTH] База данных готова!")
    yield
    logger.info("🛑 [AUTH] Остановка приложения...")
    await engine.dispose()

app = FastAPI(
    title="Auth Service",
    description="Аутентификация и управление пользователями",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

@app.get("/health")
async def health_check():
    logger.debug("🩺 [AUTH] Health check запрошен")
    return {"status": "healthy", "service": "auth"}
