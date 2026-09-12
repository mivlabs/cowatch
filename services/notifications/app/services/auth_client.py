"""HTTP-клиент к внутренним эндпоинтам auth-сервиса.

notifications никогда не пишет напрямую в auth_db — только через
/internal/achievements/grant и /internal/history/record, защищённые общим
секретом (см. services/auth/app/routers/internal.py). Так auth остаётся
единственным владельцем своей БД."""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth:8000")
# Тот же секрет, что и в services/auth/app/routers/internal.py — без дефолта
# и с той же проверкой длины: если тут будет молчаливый fallback на
# публично известную строку, а на auth его по ошибке уберут (или наоборот),
# сервисы либо разъедутся по секрету, либо синхронно "договорятся" на
# небезопасном значении. Требуем явную настройку в обоих местах.
INTERNAL_API_SECRET = os.environ["INTERNAL_API_SECRET"]
if len(INTERNAL_API_SECRET) < 16:
    raise RuntimeError(
        "INTERNAL_API_SECRET слишком короткий/слабый — см. services/auth/app/routers/internal.py"
    )


def _make_client() -> httpx.AsyncClient:
    """Отдельная фабрика (а не инлайн httpx.AsyncClient(...) в каждой функции) —
    чтобы интеграционные тесты могли подменить транспорт на ASGITransport
    поверх реального FastAPI-приложения auth, вместо поднятия настоящего
    HTTP-сервера в отдельном процессе."""
    return httpx.AsyncClient(base_url=AUTH_SERVICE_URL, timeout=5.0)


def _headers() -> dict:
    return {"X-Internal-Secret": INTERNAL_API_SECRET}


async def grant_achievement(user_id: int, achievement_title: str) -> None:
    try:
        async with _make_client() as client:
            resp = await client.post(
                "/internal/achievements/grant",
                json={"user_id": user_id, "achievement_title": achievement_title},
                headers=_headers(),
            )
            resp.raise_for_status()
    except Exception:
        logger.exception("Не удалось выдать ачивку '%s' пользователю %s", achievement_title, user_id)


async def record_watch_history(user_id: int, movie_title: str, movie_url: str, duration_seconds: float) -> None:
    try:
        async with _make_client() as client:
            resp = await client.post(
                "/internal/history/record",
                json={
                    "user_id": user_id,
                    "movie_title": movie_title,
                    "movie_url": movie_url,
                    "duration_seconds": duration_seconds,
                },
                headers=_headers(),
            )
            resp.raise_for_status()
    except Exception:
        logger.exception("Не удалось записать watch-history для пользователя %s", user_id)
