import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import engine, Base, async_session
from app.routers import auth, internal, telegram
from app.services.achievement_service import ensure_achievements_schema, seed_achievements
from app.services.telegram import ensure_users_schema, telegram_login_enabled

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

    # create_all не добавляет колонки в существующие таблицы — для старой
    # таблицы achievements (без code/category/sort_order) нужна эта миграция.
    await ensure_achievements_schema(engine)
    # Старая таблица users: добавить telegram_id, снять NOT NULL с email/пароля.
    await ensure_users_schema(engine)
    async with async_session() as db:
        await seed_achievements(db)
    logger.info("✅ [AUTH] Seed-ачивки на месте!")
    if telegram_login_enabled():
        logger.info("✅ [AUTH] Вход через Telegram включён")
    else:
        logger.warning("⚠️ [AUTH] TELEGRAM_BOT_TOKEN не задан — /auth/telegram отвечает 503")

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
app.include_router(telegram.router, prefix="/auth")
app.include_router(internal.router)

@app.get("/health")
async def health_check():
    logger.debug("🩺 [AUTH] Health check запрошен")
    return {"status": "healthy", "service": "auth"}
