"""Inline-клавиатуры бота.

web_app-кнопки Telegram показывает только в личных чатах; в группах вместо
них ссылка t.me/<bot>?startapp=<код>, которая откроет то же Mini App.
"""
from aiogram.types import CopyTextButton, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from app import texts
from app.config import Settings
from app.links import mini_app_link, share_link


def open_app_keyboard(settings: Settings, label: str = "Открыть CoWatch") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=label, web_app=WebAppInfo(url=settings.app_url()))]]
    )


def room_keyboard(
    settings: Settings,
    bot_username: str,
    room: dict,
    *,
    private_chat: bool,
) -> InlineKeyboardMarkup:
    code = str(room.get("code") or "")
    deep_link = mini_app_link(bot_username, code)
    if private_chat:
        open_button = InlineKeyboardButton(
            text="Открыть комнату", web_app=WebAppInfo(url=settings.app_url(f"/room/{code}"))
        )
    else:
        open_button = InlineKeyboardButton(text="Открыть комнату", url=deep_link)

    return InlineKeyboardMarkup(
        inline_keyboard=[
            [open_button],
            [
                InlineKeyboardButton(
                    text="Пригласить друзей",
                    url=share_link(deep_link, texts.invite_share_text(room)),
                ),
                InlineKeyboardButton(text="Скопировать код", copy_text=CopyTextButton(text=code)),
            ],
        ]
    )


def invite_keyboard(bot_username: str, code: str) -> InlineKeyboardMarkup:
    """Кнопка под приглашением в чужом чате: только url, web_app там недоступен."""
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="Открыть комнату", url=mini_app_link(bot_username, code))]]
    )


def profile_keyboard(settings: Settings, bot_username: str, *, private_chat: bool) -> InlineKeyboardMarkup:
    if private_chat:
        button = InlineKeyboardButton(text="Открыть профиль", web_app=WebAppInfo(url=settings.app_url("/profile")))
    else:
        button = InlineKeyboardButton(text="Открыть CoWatch", url=mini_app_link(bot_username))
    return InlineKeyboardMarkup(inline_keyboard=[[button]])
