"""Вход через Telegram: проверка подписи initData и привязка аккаунта.

Mini App получает от Telegram строку initData (query string с полями user,
auth_date, hash, ...). Подлинность проверяется HMAC-SHA256 по схеме из
документации Telegram: secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token),
hash = HMAC_SHA256(key=secret_key, msg=data_check_string), где
data_check_string — все поля, кроме hash, отсортированные по ключу и
склеенные через перевод строки как key=value. Поле signature (Ed25519,
появилось в Bot API 7.10) в проверочную строку входит: оно одно из
«полученных полей».

Пользователь Telegram хранится в той же таблице users, что и почтовые
аккаунты: строка с telegram_id, без email и пароля. Так ачивки, история и
комнаты работают для него без исключений, а один человек, зашедший с сайта
и из Telegram, — это пока два разных аккаунта (связывание не делаем).

Токен бота сюда попадает только из окружения (TELEGRAM_BOT_TOKEN); без него
вход через Telegram отключён, и /auth/telegram отвечает 503.
"""
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import parse_qsl

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.models.user import User
from app.services.achievement_service import grant_achievement
from app.services.auth import create_access_token, create_refresh_token

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
# Сколько живёт initData: Telegram подписывает его при каждом открытии Mini App,
# так что сутки — с запасом. Старый initData с украденного устройства дольше
# суток принят не будет.
INIT_DATA_MAX_AGE_SECONDS = int(os.getenv("TELEGRAM_INIT_DATA_MAX_AGE", str(24 * 60 * 60)))
# Токен для Mini App живёт дольше обычных 30 минут: фильм идёт два часа, а
# повторно подписать initData можно только перезапуском приложения.
TELEGRAM_TOKEN_EXPIRE_HOURS = int(os.getenv("TELEGRAM_TOKEN_EXPIRE_HOURS", "12"))

USERNAME_MAX_LEN = 50
_USERNAME_RETRY_LIMIT = 20


class InitDataError(ValueError):
    """initData не прошёл проверку: нет hash, подпись не сходится или данные устарели."""


@dataclass(frozen=True)
class TelegramUser:
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    language_code: str | None = None

    @property
    def display_name(self) -> str:
        return " ".join(part for part in (self.first_name, self.last_name) if part).strip()


def telegram_login_enabled() -> bool:
    return bool(TELEGRAM_BOT_TOKEN)


async def ensure_users_schema(engine: AsyncEngine) -> None:
    """Готовит старую таблицу users к аккаунтам из Telegram.

    Как и ensure_achievements_schema: Alembic'а в проекте нет, create_all не
    меняет существующие таблицы, поэтому крошечная идемпотентная миграция
    при старте — добавить telegram_id и снять NOT NULL с email и пароля.
    """
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT"))
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_telegram_id ON users (telegram_id)"))
        await conn.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL"))
        await conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))


def validate_init_data(
    init_data: str,
    bot_token: str,
    *,
    max_age_seconds: int = INIT_DATA_MAX_AGE_SECONDS,
    now: float | None = None,
) -> dict[str, str]:
    """Проверяет подпись initData и возвращает его поля (без hash).

    Бросает InitDataError, если подпись не сходится, auth_date отсутствует
    или старше max_age_seconds. Значения возвращаются уже URL-декодированными,
    user — ещё строкой JSON (см. parse_telegram_user).
    """
    if not init_data or not bot_token:
        raise InitDataError("initData или токен бота пустые")

    fields = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = fields.pop("hash", None)
    if not received_hash:
        raise InitDataError("в initData нет поля hash")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(fields.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise InitDataError("подпись initData не сходится")

    try:
        auth_date = int(fields.get("auth_date", ""))
    except ValueError:
        raise InitDataError("в initData нет корректного auth_date") from None

    current_time = time.time() if now is None else now
    if current_time - auth_date > max_age_seconds:
        raise InitDataError("initData устарел, откройте приложение заново")

    return fields


def parse_telegram_user(fields: dict[str, str]) -> TelegramUser:
    """Достаёт пользователя из поля user (JSON) проверенного initData."""
    raw_user = fields.get("user")
    if not raw_user:
        raise InitDataError("в initData нет поля user")
    try:
        data = json.loads(raw_user)
    except json.JSONDecodeError:
        raise InitDataError("поле user в initData не является JSON") from None

    try:
        telegram_id = int(data["id"])
    except (KeyError, TypeError, ValueError):
        raise InitDataError("в поле user нет id") from None

    return telegram_user_from_fields(
        telegram_id,
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        username=data.get("username"),
        photo_url=data.get("photo_url"),
        language_code=data.get("language_code"),
    )


def telegram_user_from_fields(
    telegram_id: int,
    *,
    first_name: str | None,
    last_name: str | None = None,
    username: str | None = None,
    photo_url: str | None = None,
    language_code: str | None = None,
) -> TelegramUser:
    """Нормализует поля пользователя Telegram (из initData или от бота)."""
    return TelegramUser(
        id=telegram_id,
        first_name=str(first_name or "").strip() or f"tg{telegram_id}",
        last_name=(str(last_name).strip() or None) if last_name else None,
        username=(str(username).strip().lstrip("@") or None) if username else None,
        photo_url=photo_url or None,
        language_code=language_code or None,
    )


def _username_candidates(tg_user: TelegramUser):
    """Сначала @username из Telegram, потом имя, потом tg<id>; дальше первый
    вариант со случайным суффиксом, пока не найдётся свободный."""
    bases = []
    for base in (tg_user.username, tg_user.first_name, f"tg{tg_user.id}"):
        if base and base not in bases:
            bases.append(base[:USERNAME_MAX_LEN])
    for base in bases:
        yield base
    while True:
        suffix = secrets.token_hex(2)
        yield f"{bases[0][: USERNAME_MAX_LEN - len(suffix) - 1]}_{suffix}"


async def _is_username_taken(db: AsyncSession, username: str) -> bool:
    result = await db.execute(select(User.id).where(User.username == username))
    return result.scalar_one_or_none() is not None


async def get_user_by_telegram_id(db: AsyncSession, telegram_id: int) -> User | None:
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    return result.scalar_one_or_none()


async def get_or_create_telegram_user(db: AsyncSession, tg_user: TelegramUser) -> tuple[User, bool]:
    """Находит пользователя по telegram_id или заводит нового.

    Возвращает (user, is_new). Имя в CoWatch выбирается один раз при создании
    и дальше не меняется вслед за Telegram: по нему подписаны сообщения в
    чате и ачивки, пусть оно будет стабильным.
    """
    existing = await get_user_by_telegram_id(db, tg_user.id)
    if existing is not None:
        return existing, False

    attempts = 0
    for candidate in _username_candidates(tg_user):
        attempts += 1
        if attempts > _USERNAME_RETRY_LIMIT:
            break
        if len(candidate) < 2 or await _is_username_taken(db, candidate):
            continue
        user = User(username=candidate, telegram_id=tg_user.id, email=None, hashed_password=None)
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            # Параллельный первый вход того же человека (два открытия Mini App
            # подряд) или кто-то успел занять имя между проверкой и вставкой.
            await db.rollback()
            existing = await get_user_by_telegram_id(db, tg_user.id)
            if existing is not None:
                return existing, False
            continue
        await db.refresh(user)
        await grant_achievement(db, user.id, "first_step")
        logger.info("Новый пользователь из Telegram: user_id=%s telegram_id=%s", user.id, tg_user.id)
        return user, True

    raise RuntimeError("Не удалось подобрать свободное имя для пользователя Telegram")


def issue_tokens(user: User) -> tuple[str, str]:
    """JWT для аккаунта из Telegram. sub у него не email (его нет), а tg:<id>:
    rooms читает sub только для логов и требует непустую строку."""
    claims = {"sub": f"tg:{user.telegram_id}", "user_id": user.id, "username": user.username}
    access = create_access_token(claims, expires_delta=timedelta(hours=TELEGRAM_TOKEN_EXPIRE_HOURS))
    refresh = create_refresh_token(claims)
    return access, refresh
