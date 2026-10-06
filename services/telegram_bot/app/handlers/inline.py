"""Inline-режим: «@бот ABC123» в любом чате отправляет туда приглашение в комнату.

Нужно включить у @BotFather: /setinline. Без кода показываем подсказку и
кнопку, открывающую Mini App, чтобы создать комнату.
"""
import logging

from aiogram import Router
from aiogram.types import (
    InlineQuery,
    InlineQueryResultArticle,
    InlineQueryResultsButton,
    InputTextMessageContent,
    WebAppInfo,
)

from app import keyboards, texts
from app.config import Settings
from app.links import mini_app_link, normalize_room_code
from app.services.cowatch import CowatchApi, CowatchApiError, RoomNotFound

logger = logging.getLogger(__name__)

router = Router(name="inline")


def _article(result_id: str, title: str, description: str, text: str, reply_markup=None) -> InlineQueryResultArticle:
    return InlineQueryResultArticle(
        id=result_id,
        title=title,
        description=description,
        input_message_content=InputTextMessageContent(message_text=text, parse_mode="HTML"),
        reply_markup=reply_markup,
    )


@router.inline_query()
async def inline_invite(query: InlineQuery, api: CowatchApi, settings: Settings, bot_username: str) -> None:
    code = normalize_room_code(query.query)
    create_button = InlineQueryResultsButton(
        text="Создать комнату", web_app=WebAppInfo(url=settings.app_url())
    )

    if not code:
        await query.answer(
            [
                _article(
                    "hint",
                    texts.inline_hint_title(),
                    texts.inline_hint_description(bot_username),
                    texts.help_text(bot_username),
                )
            ],
            cache_time=30,
            button=create_button,
        )
        return

    try:
        room = await api.get_room(code)
    except RoomNotFound:
        await query.answer(
            [_article(f"missing-{code}", texts.inline_not_found_title(code), "", texts.room_not_found(code))],
            cache_time=5,
            button=create_button,
        )
        return
    except CowatchApiError:
        await query.answer([], cache_time=1, button=create_button)
        return

    link = mini_app_link(bot_username, code)
    await query.answer(
        [
            _article(
                f"invite-{code}",
                texts.inline_invite_title(room),
                texts.inline_invite_description(room),
                texts.invite_message(room, link),
                reply_markup=keyboards.invite_keyboard(bot_username, code),
            )
        ],
        cache_time=5,
        is_personal=False,
    )
