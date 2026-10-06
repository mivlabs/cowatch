"""Публичный вход через Telegram Mini App.

Фронт (frontend/src/telegram) отправляет сюда Telegram.WebApp.initData как
есть; сервис проверяет подпись токеном бота, находит или заводит
пользователя и отдаёт обычный JWT CoWatch — дальше Mini App ходит в rooms
с тем же Bearer-токеном, что и сайт.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.telegram import TelegramAuthResponse, TelegramInitDataRequest, TelegramUserResponse
from app.services import telegram

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Telegram"])


@router.post("/telegram", response_model=TelegramAuthResponse)
async def login_with_telegram(req: TelegramInitDataRequest, db: AsyncSession = Depends(get_db)):
    if not telegram.telegram_login_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram login is not configured",
        )

    try:
        fields = telegram.validate_init_data(req.init_data, telegram.TELEGRAM_BOT_TOKEN)
        tg_user = telegram.parse_telegram_user(fields)
    except telegram.InitDataError as exc:
        logger.info("Отклонён initData: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram initData")

    user, is_new = await telegram.get_or_create_telegram_user(db, tg_user)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token, refresh_token = telegram.issue_tokens(user)
    return TelegramAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=TelegramUserResponse(
            id=user.id, username=user.username, telegram_id=user.telegram_id, is_new=is_new
        ),
    )
