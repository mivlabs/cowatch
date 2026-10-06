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
import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.internal import (
    GrantAchievementRequest,
    GrantAchievementResponse,
    InternalActionResponse,
    RecordHistoryRequest,
)
from app.schemas.telegram import (
    InternalTelegramTokenRequest,
    TelegramAuthResponse,
    TelegramLink,
    TelegramLinksResponse,
    TelegramUserResponse,
)
from app.services import telegram
from app.services.achievement_service import (
    LEGACY_TITLE_TO_CODE,
    grant_achievement,
    record_watch_history,
)

INTERNAL_API_SECRET = os.environ["INTERNAL_API_SECRET"]
if len(INTERNAL_API_SECRET) < 16:
    raise RuntimeError(
        "INTERNAL_API_SECRET слишком короткий/слабый для секрета, который "
        "защищает публично достижимый эндпоинт — задай длинное случайное значение."
    )

router = APIRouter(prefix="/internal", tags=["Internal"])


def verify_internal_secret(x_internal_secret: str = Header(default="")) -> None:
    # Header(default="") гарантирует str, а не None, даже когда заголовок
    # отсутствует — compare_digest требует одинаковый тип у обоих аргументов.
    # Обычное `!=` тут не годится: этот эндпоинт достижим с публичного порта
    # auth без gateway перед собой (см. docstring модуля), а сравнение строк
    # по символам до первого несовпадения — классическая timing-атака,
    # позволяющая подбирать секрет байт за байтом по времени ответа.
    if not hmac.compare_digest(x_internal_secret, INTERNAL_API_SECRET):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal secret",
        )


@router.post(
    "/achievements/grant",
    response_model=GrantAchievementResponse,
    response_model_exclude_none=True,
    dependencies=[Depends(verify_internal_secret)],
)
async def grant_achievement_endpoint(
    req: GrantAchievementRequest,
    db: AsyncSession = Depends(get_db),
):
    code = req.achievement_code or LEGACY_TITLE_TO_CODE.get(req.achievement_title or "")
    if code is None:
        return GrantAchievementResponse(granted=False, reason="unknown_achievement")
    result = await grant_achievement(db, req.user_id, code)
    return GrantAchievementResponse(
        granted=result.granted,
        reason=result.reason,
        code=result.code,
        title=result.title,
        icon=result.icon,
    )


@router.post(
    "/telegram/token",
    response_model=TelegramAuthResponse,
    dependencies=[Depends(verify_internal_secret)],
)
async def telegram_token_endpoint(
    req: InternalTelegramTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Токен CoWatch для пользователя Telegram по его telegram_id — для бота.

    Бот уже знает, кто ему пишет (Telegram доставляет апдейты только через
    токен бота), поэтому initData здесь не нужен. Эндпоинт внутренний:
    снаружи по нему можно было бы войти под кем угодно, отсюда общий секрет.
    """
    tg_user = telegram.telegram_user_from_fields(
        req.telegram_id,
        first_name=req.first_name,
        last_name=req.last_name,
        username=req.username,
    )
    user, is_new = await telegram.get_or_create_telegram_user(db, tg_user)
    access_token, refresh_token = telegram.issue_tokens(user)
    return TelegramAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=TelegramUserResponse(
            id=user.id, username=user.username, telegram_id=user.telegram_id, is_new=is_new
        ),
    )


@router.get(
    "/telegram/users",
    response_model=TelegramLinksResponse,
    dependencies=[Depends(verify_internal_secret)],
)
async def telegram_users_endpoint(
    user_ids: list[int] = Query(..., max_length=100),
    db: AsyncSession = Depends(get_db),
):
    """Какие из этих user_id привязаны к Telegram — чтобы бот знал, кому
    можно написать (хосту комнаты, получателю наклейки)."""
    result = await db.execute(
        select(User.id, User.telegram_id, User.username).where(
            User.id.in_(user_ids), User.telegram_id.is_not(None)
        )
    )
    return TelegramLinksResponse(
        users=[
            TelegramLink(user_id=user_id, telegram_id=telegram_id, username=username)
            for user_id, telegram_id, username in result.all()
        ]
    )


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
