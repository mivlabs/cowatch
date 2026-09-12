"""Внутренние эндпоинты для межсервисного взаимодействия (notifications -> auth).

Защищены общим секретом из окружения, а не JWT — это не эндпоинты для
браузера/фронтенда, и notifications не должен иметь пользовательских
токенов, чтобы выдавать ачивки. Секрет передаётся в заголовке
X-Internal-Secret и должен совпадать со значением INTERNAL_API_SECRET
у обоих сервисов (см. .env / docker-compose.yml).

ВАЖНО: auth ходит в интернет напрямую, БЕЗ gateway перед собой (gateway в
этом репо — пустая заготовка, см. services/gateway) — /internal/* физически
достижим с публичного порта/домена auth, единственная защита — этот секрет.
Раньше тут был `os.getenv("INTERNAL_API_SECRET", "dev-internal-secret-change-this")`
— если в проде забыть выставить переменную окружения, сервис молча
соглашался на секрет, который лежит открытым текстом в этом файле в
публичном репозитории на GitHub, то есть фактически работал БЕЗ защиты.
Теперь сервис явно падает при старте, если секрет не задан — это должно
быть жёстко видно при деплое, а не тихо дырявить прод.
"""
import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.internal import (
    GrantAchievementRequest,
    InternalActionResponse,
    RecordHistoryRequest,
)
from app.services.achievement_service import grant_achievement, record_watch_history

INTERNAL_API_SECRET = os.environ["INTERNAL_API_SECRET"]
if len(INTERNAL_API_SECRET) < 16:
    raise RuntimeError(
        "INTERNAL_API_SECRET слишком короткий/слабый для секрета, который "
        "защищает публично достижимый эндпоинт — задай длинное случайное значение."
    )

router = APIRouter(prefix="/internal", tags=["Internal"])


def verify_internal_secret(x_internal_secret: str = Header(default="")) -> None:
    if x_internal_secret != INTERNAL_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal secret",
        )


@router.post(
    "/achievements/grant",
    response_model=InternalActionResponse,
    dependencies=[Depends(verify_internal_secret)],
)
async def grant_achievement_endpoint(
    req: GrantAchievementRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await grant_achievement(db, req.user_id, req.achievement_title)
    return InternalActionResponse(granted=result.granted, reason=result.reason)


@router.post(
    "/history/record",
    response_model=InternalActionResponse,
    dependencies=[Depends(verify_internal_secret)],
)
async def record_history_endpoint(
    req: RecordHistoryRequest,
    db: AsyncSession = Depends(get_db),
):
    duration_minutes = round(req.duration_seconds / 60)
    result = await record_watch_history(
        db,
        req.user_id,
        req.movie_title or "Без названия",
        req.movie_url,
        duration_minutes,
    )
    return InternalActionResponse(granted=result.granted, reason=result.reason)
