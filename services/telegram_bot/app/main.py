"""Точка входа Telegram-бота CoWatch.

Режимы приёма апдейтов:
  - long polling (по умолчанию) — ничего настраивать не нужно, подходит для
    Railway и для локального запуска;
  - вебхук — если задан WEBHOOK_URL (публичный адрес сервиса): бот сам
    регистрирует https://<WEBHOOK_URL>/telegram/webhook у Telegram.

В обоих режимах поднимается маленький aiohttp-сервер с /health на PORT —
так Railway видит живой сервис, а в вебхук-режиме туда же приходят апдейты.
Параллельно, если задан RABBITMQ_URL, слушаем cowatch.events и шлём
уведомления (см. services/consumer.py, services/notifier.py).
"""
import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand, MenuButtonWebApp, WebAppInfo
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web

from app.config import WEBHOOK_PATH, Settings, load_settings
from app.handlers import commands, inline
from app.services.consumer import EventsConsumer
from app.services.cowatch import CowatchApi
from app.services.notifier import Notifier

logger = logging.getLogger("telegram_bot")

BOT_COMMANDS = [
    BotCommand(command="new", description="Создать комнату"),
    BotCommand(command="join", description="Зайти в комнату по коду"),
    BotCommand(command="profile", description="Наклейки и часы в зале"),
    BotCommand(command="app", description="Открыть CoWatch"),
    BotCommand(command="help", description="Что умеет бот"),
]


async def configure_bot(bot: Bot, settings: Settings) -> None:
    """Меню команд и кнопка «CoWatch» слева от поля ввода, открывающая Mini App.
    Делается при каждом старте — идемпотентно и избавляет от ручной настройки в BotFather."""
    await bot.set_my_commands(BOT_COMMANDS)
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="CoWatch", web_app=WebAppInfo(url=settings.app_url()))
    )


async def health(_: web.Request) -> web.Response:
    return web.json_response({"status": "healthy", "service": "telegram_bot"})


def build_dispatcher(api: CowatchApi, settings: Settings, bot_username: str) -> Dispatcher:
    dp = Dispatcher()
    dp.include_routers(commands.router, inline.router)
    dp.workflow_data.update(api=api, settings=settings, bot_username=bot_username)
    return dp


async def run() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = load_settings()

    bot = Bot(token=settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    api = CowatchApi(settings)
    me = await bot.get_me()
    logger.info("Бот @%s, Mini App: %s", me.username, settings.app_url())

    dp = build_dispatcher(api, settings, me.username)
    await configure_bot(bot, settings)

    consumer: EventsConsumer | None = None
    if settings.rabbitmq_url:
        consumer = EventsConsumer(settings.rabbitmq_url, Notifier(bot, api, settings, me.username).handle_event)
    else:
        logger.warning("RABBITMQ_URL не задан — уведомления о гостях и наклейках отключены")

    app = web.Application()
    app.router.add_get("/health", health)

    allowed_updates = dp.resolve_used_update_types()
    if settings.webhook_endpoint:
        SimpleRequestHandler(
            dispatcher=dp, bot=bot, secret_token=settings.webhook_secret or None
        ).register(app, path=WEBHOOK_PATH)
        setup_application(app, dp, bot=bot)
        await bot.set_webhook(
            settings.webhook_endpoint,
            secret_token=settings.webhook_secret or None,
            allowed_updates=allowed_updates,
        )
        logger.info("Вебхук: %s", settings.webhook_endpoint)
    else:
        await bot.delete_webhook(drop_pending_updates=False)
        logger.info("Режим long polling")

    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", settings.port).start()
    logger.info("HTTP /health на порту %s", settings.port)

    if consumer is not None:
        await consumer.start()

    try:
        if settings.webhook_endpoint:
            await asyncio.Event().wait()
        else:
            await dp.start_polling(bot, allowed_updates=allowed_updates)
    finally:
        if consumer is not None:
            await consumer.stop()
        await runner.cleanup()
        await api.close()
        await bot.session.close()


def main() -> None:
    try:
        asyncio.run(run())
    except (KeyboardInterrupt, SystemExit):
        pass


if __name__ == "__main__":
    main()
