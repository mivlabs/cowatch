"""Вход через Telegram Mini App: проверка initData и привязка аккаунта.

initData собирается здесь так же, как его подписывает Telegram (см.
app/services/telegram.py), с тестовым токеном бота — настоящий токен в тестах
не нужен и в репозитории не лежит.
"""
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from app.services import telegram
from jose import jwt

BOT_TOKEN = "123456:TEST-TOKEN-NOT-REAL"
INTERNAL_SECRET = "test-internal-secret"
JWT_SECRET = "test-secret-do-not-use-in-prod"


def make_init_data(
    user: dict,
    *,
    bot_token: str = BOT_TOKEN,
    auth_date: int | None = None,
    tamper_after_signing: dict | None = None,
) -> str:
    fields = {
        "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
        "user": json.dumps(user, ensure_ascii=False, separators=(",", ":")),
        "auth_date": str(auth_date if auth_date is not None else int(time.time())),
        "signature": "dGVzdC1zaWduYXR1cmU",
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if tamper_after_signing:
        fields.update(tamper_after_signing)
    return urlencode(fields)


MASHA = {"id": 777000111, "first_name": "Маша", "last_name": "К", "username": "traqmaris", "language_code": "ru"}


@pytest.fixture
def telegram_enabled(monkeypatch):
    monkeypatch.setattr(telegram, "TELEGRAM_BOT_TOKEN", BOT_TOKEN)


# --- чистая проверка подписи -------------------------------------------------

def test_validate_init_data_accepts_signed_payload():
    fields = telegram.validate_init_data(make_init_data(MASHA), BOT_TOKEN)
    assert "hash" not in fields
    user = telegram.parse_telegram_user(fields)
    assert user.id == 777000111
    assert user.username == "traqmaris"
    assert user.display_name == "Маша К"


def test_validate_init_data_rejects_tampered_user():
    forged_user = json.dumps({**MASHA, "id": 1}, separators=(",", ":"))
    init_data = make_init_data(MASHA, tamper_after_signing={"user": forged_user})
    with pytest.raises(telegram.InitDataError):
        telegram.validate_init_data(init_data, BOT_TOKEN)


def test_validate_init_data_rejects_other_bot_token():
    init_data = make_init_data(MASHA, bot_token="999:OTHER-BOT")
    with pytest.raises(telegram.InitDataError):
        telegram.validate_init_data(init_data, BOT_TOKEN)


def test_validate_init_data_rejects_missing_hash():
    with pytest.raises(telegram.InitDataError):
        telegram.validate_init_data("auth_date=1&user=%7B%7D", BOT_TOKEN)


def test_validate_init_data_rejects_stale_auth_date():
    init_data = make_init_data(MASHA, auth_date=1_000_000)
    with pytest.raises(telegram.InitDataError, match="устарел"):
        telegram.validate_init_data(init_data, BOT_TOKEN, max_age_seconds=3600, now=1_000_000 + 3601)
    # Ровно на границе ещё принимается.
    telegram.validate_init_data(init_data, BOT_TOKEN, max_age_seconds=3600, now=1_000_000 + 3600)


# --- публичный /auth/telegram -------------------------------------------------

@pytest.mark.asyncio
async def test_telegram_login_disabled_without_bot_token(client, monkeypatch):
    monkeypatch.setattr(telegram, "TELEGRAM_BOT_TOKEN", "")
    resp = await client.post("/auth/telegram", json={"init_data": make_init_data(MASHA)})
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_telegram_login_creates_user_and_issues_token(client, telegram_enabled):
    resp = await client.post("/auth/telegram", json={"init_data": make_init_data(MASHA)})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["is_new"] is True
    assert body["user"]["telegram_id"] == 777000111
    assert body["user"]["username"] == "traqmaris"

    payload = jwt.decode(body["access_token"], JWT_SECRET, algorithms=["HS256"])
    assert payload["user_id"] == body["user"]["id"]
    assert payload["sub"] == "tg:777000111"
    assert payload["username"] == "traqmaris"
    # Токен для Mini App живёт часами, а не 30 минут.
    assert payload["exp"] - time.time() > 6 * 3600

    profile = (await client.get(f"/auth/profile/{body['user']['id']}")).json()
    assert profile["email"] is None
    assert profile["username"] == "traqmaris"
    unlocked = [a["code"] for a in profile["achievements"] if a["unlocked_at"]]
    assert unlocked == ["first_step"]


@pytest.mark.asyncio
async def test_telegram_login_is_idempotent_per_telegram_id(client, telegram_enabled):
    first = (await client.post("/auth/telegram", json={"init_data": make_init_data(MASHA)})).json()
    # Человек сменил имя в Telegram — аккаунт тот же, имя в CoWatch не меняется.
    renamed = {**MASHA, "first_name": "Мария", "username": "maria_k"}
    second = (await client.post("/auth/telegram", json={"init_data": make_init_data(renamed)})).json()

    assert second["user"]["id"] == first["user"]["id"]
    assert second["user"]["is_new"] is False
    assert second["user"]["username"] == "traqmaris"


@pytest.mark.asyncio
async def test_telegram_login_picks_free_username_on_collision(client, telegram_enabled):
    await client.post(
        "/auth/register",
        json={"email": "masha@cowatch.fun", "username": "traqmaris", "password": "hunter2hunter2"},
    )
    resp = await client.post("/auth/telegram", json={"init_data": make_init_data(MASHA)})
    assert resp.status_code == 200
    username = resp.json()["user"]["username"]
    assert username != "traqmaris"
    assert username == "Маша"  # второй кандидат: имя из Telegram


@pytest.mark.asyncio
async def test_telegram_login_rejects_bad_signature(client, telegram_enabled):
    init_data = make_init_data(MASHA, bot_token="999:OTHER-BOT")
    resp = await client.post("/auth/telegram", json={"init_data": init_data})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_email_login_still_works_and_telegram_account_has_no_password(client, telegram_enabled):
    await client.post(
        "/auth/register",
        json={"email": "login@cowatch.fun", "username": "login", "password": "correct-horse"},
    )
    await client.post("/auth/telegram", json={"init_data": make_init_data(MASHA)})

    ok = await client.post("/auth/login", json={"email": "login@cowatch.fun", "password": "correct-horse"})
    assert ok.status_code == 200
    bad = await client.post("/auth/login", json={"email": "login@cowatch.fun", "password": "wrong"})
    assert bad.status_code == 401


# --- внутренние эндпоинты для бота -------------------------------------------

@pytest.mark.asyncio
async def test_internal_telegram_token_requires_secret(client):
    resp = await client.post(
        "/internal/telegram/token",
        json={"telegram_id": 42, "first_name": "Bot user"},
        headers={"X-Internal-Secret": "wrong"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_internal_telegram_token_and_lookup(client, telegram_enabled):
    headers = {"X-Internal-Secret": INTERNAL_SECRET}

    resp = await client.post(
        "/internal/telegram/token",
        json={"telegram_id": 777000111, "first_name": "Маша", "username": "@traqmaris"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["user"]["is_new"] is True
    assert body["user"]["username"] == "traqmaris"
    user_id = body["user"]["id"]
    assert jwt.decode(body["access_token"], JWT_SECRET, algorithms=["HS256"])["user_id"] == user_id

    # Вход через Mini App тем же человеком попадает в тот же аккаунт.
    mini_app = (await client.post("/auth/telegram", json={"init_data": make_init_data(MASHA)})).json()
    assert mini_app["user"]["id"] == user_id
    assert mini_app["user"]["is_new"] is False

    # Почтовый аккаунт без Telegram в выдаче не появляется.
    email_user = (
        await client.post(
            "/auth/register",
            json={"email": "plain@cowatch.fun", "username": "plain", "password": "hunter2hunter2"},
        )
    ).json()

    lookup = await client.get(
        "/internal/telegram/users",
        params=[("user_ids", user_id), ("user_ids", email_user["id"]), ("user_ids", 999999)],
        headers=headers,
    )
    assert lookup.status_code == 200
    assert lookup.json() == {
        "users": [{"user_id": user_id, "telegram_id": 777000111, "username": "traqmaris"}]
    }


@pytest.mark.asyncio
async def test_grant_response_names_the_sticker(client):
    """notifications публикует achievement.granted для бота по этим полям."""
    user = (
        await client.post(
            "/auth/register",
            json={"email": "sticker@cowatch.fun", "username": "sticker", "password": "hunter2hunter2"},
        )
    ).json()
    resp = await client.post(
        "/internal/achievements/grant",
        json={"user_id": user["id"], "achievement_code": "first_room"},
        headers={"X-Internal-Secret": INTERNAL_SECRET},
    )
    assert resp.json() == {
        "granted": True,
        "code": "first_room",
        "title": "Хозяин вечеринки",
        "icon": "🏠",
    }
