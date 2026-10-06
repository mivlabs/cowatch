"""Настройки бота из окружения.

Все секреты (токен бота, общий секрет внутренних эндпоинтов auth) берутся
только из переменных окружения — дефолтов для них нет намеренно, чтобы бот
не мог молча запуститься с чужим или тестовым значением.
"""
import os
from collections.abc import Mapping
from dataclasses import dataclass

DEFAULT_MINI_APP_URL = "https://cowatch.fun/tg"
DEFAULT_SITE_URL = "https://cowatch.fun"
DEFAULT_AUTH_SERVICE_URL = "http://auth:8000"
DEFAULT_ROOMS_SERVICE_URL = "http://rooms:8000"
WEBHOOK_PATH = "/telegram/webhook"


class ConfigError(RuntimeError):
    """Не хватает обязательной переменной окружения или она заведомо негодная."""


@dataclass(frozen=True)
class Settings:
    bot_token: str
    internal_api_secret: str
    auth_service_url: str = DEFAULT_AUTH_SERVICE_URL
    rooms_service_url: str = DEFAULT_ROOMS_SERVICE_URL
    mini_app_url: str = DEFAULT_MINI_APP_URL
    site_url: str = DEFAULT_SITE_URL
    # Без RABBITMQ_URL бот работает только на команды: уведомления о гостях и
    # наклейках приходят из cowatch.events, см. services/consumer.py.
    rabbitmq_url: str | None = None
    # Публичный адрес сервиса (например, домен Railway). Задан — бот принимает
    # апдейты вебхуком на WEBHOOK_PATH; не задан — long polling.
    webhook_url: str | None = None
    webhook_secret: str = ""
    port: int = 8000

    def app_url(self, path: str = "") -> str:
        """Адрес экрана Mini App: app_url('/room/ABC123') -> https://cowatch.fun/tg/room/ABC123."""
        return self.mini_app_url.rstrip("/") + path

    @property
    def webhook_endpoint(self) -> str | None:
        if not self.webhook_url:
            return None
        return self.webhook_url.rstrip("/") + WEBHOOK_PATH


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    env = os.environ if env is None else env

    bot_token = env.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not bot_token:
        raise ConfigError("TELEGRAM_BOT_TOKEN не задан — возьмите токен у @BotFather и положите в окружение")

    internal_api_secret = env.get("INTERNAL_API_SECRET", "")
    if len(internal_api_secret) < 16:
        raise ConfigError(
            "INTERNAL_API_SECRET не задан или короче 16 символов — он должен совпадать "
            "со значением у сервиса auth (см. services/auth/app/routers/internal.py)"
        )

    return Settings(
        bot_token=bot_token,
        internal_api_secret=internal_api_secret,
        auth_service_url=env.get("AUTH_SERVICE_URL", DEFAULT_AUTH_SERVICE_URL).rstrip("/"),
        rooms_service_url=env.get("ROOMS_SERVICE_URL", DEFAULT_ROOMS_SERVICE_URL).rstrip("/"),
        mini_app_url=env.get("MINI_APP_URL", DEFAULT_MINI_APP_URL).rstrip("/"),
        site_url=env.get("SITE_URL", DEFAULT_SITE_URL).rstrip("/"),
        rabbitmq_url=env.get("RABBITMQ_URL") or None,
        webhook_url=(env.get("WEBHOOK_URL") or "").strip() or None,
        webhook_secret=env.get("WEBHOOK_SECRET", ""),
        port=int(env.get("PORT", "8000")),
    )
