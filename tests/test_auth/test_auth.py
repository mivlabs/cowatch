import pytest
from app.database import Base, async_session, engine
from app.models.achievement import Achievement
from app.services.achievement_service import (
    SEED_ACHIEVEMENTS,
    ensure_achievements_schema,
    seed_achievements,
)
from sqlalchemy import select, text


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy", "service": "auth"}


@pytest.mark.asyncio
async def test_register_creates_user(client):
    resp = await client.post(
        "/auth/register",
        json={"email": "masha@cowatch.fun", "username": "masha", "password": "hunter2hunter2"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "masha@cowatch.fun"
    assert body["is_active"] is True
    assert "id" in body


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_400(client):
    payload = {"email": "dup@cowatch.fun", "username": "dup", "password": "hunter2hunter2"}
    first = await client.post("/auth/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/auth/register", json=payload)
    assert second.status_code == 400
    assert "already registered" in second.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_grants_first_achievement(client):
    await client.post(
        "/auth/register",
        json={"email": "achiever@cowatch.fun", "username": "achiever", "password": "hunter2hunter2"},
    )
    profile_resp = await client.get("/auth/profile/1")
    assert profile_resp.status_code == 200
    body = profile_resp.json()
    # Профиль отдаёт всю коллекцию: полученные с unlocked_at, остальные с null.
    assert len(body["achievements"]) == len(SEED_ACHIEVEMENTS)
    unlocked = [a for a in body["achievements"] if a["unlocked_at"] is not None]
    assert [a["code"] for a in unlocked] == ["first_step"]
    assert unlocked[0]["title"] == "Первый шаг"
    assert unlocked[0]["category"] == "hall"
    # Порядок — по группам (зал, общение, просмотр), внутри по sort_order.
    categories = [a["category"] for a in body["achievements"]]
    assert categories == sorted(categories, key=["hall", "chat", "watch"].index)
    assert body["achievements"][0]["code"] == "first_step"


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(
        "/auth/register",
        json={"email": "login@cowatch.fun", "username": "login", "password": "correct-horse"},
    )
    resp = await client.post(
        "/auth/login",
        json={"email": "login@cowatch.fun", "username": "login", "password": "correct-horse"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client):
    await client.post(
        "/auth/register",
        json={"email": "login2@cowatch.fun", "username": "login2", "password": "correct-horse"},
    )
    resp = await client.post(
        "/auth/login",
        json={"email": "login2@cowatch.fun", "username": "login2", "password": "wrong-password"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client):
    resp = await client.post(
        "/auth/login",
        json={"email": "ghost@cowatch.fun", "username": "ghost", "password": "whatever12345"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_guest_login_issues_token(client):
    resp = await client.post("/auth/guest", params={"username": "Маруся"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"] == "guest_session"


@pytest.mark.asyncio
async def test_guest_login_rejects_short_username(client):
    resp = await client.post("/auth/guest", params={"username": "a"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_profile_for_unknown_user_returns_guest_stub(client):
    """Профиль для несуществующего user_id — это гость, а не 404 (см. auth.py)."""
    resp = await client.get("/auth/profile/999999")
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "Гость_999999"
    assert body["achievements"] == []
    assert body["history"] == []


@pytest.mark.asyncio
async def test_legacy_achievements_table_is_migrated_and_reseeded(client):
    """Прод-таблица achievements заведена первой итерацией без колонок
    code/category/sort_order, а Base.metadata.create_all колонок не добавляет.
    Проверяем путь старта на такой базе: ensure_achievements_schema добавляет
    колонки, seed_achievements проставляет коды старым строкам по названию
    (чтобы выданные UserAchievement не потерялись и наклейки не задвоились)
    и дозаводит новые ачивки."""
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS user_achievements CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS achievements CASCADE"))
        await conn.execute(text(
            "CREATE TABLE achievements ("
            " id SERIAL PRIMARY KEY, title VARCHAR NOT NULL,"
            " description VARCHAR NOT NULL, icon VARCHAR NOT NULL)"
        ))
        await conn.execute(text(
            "INSERT INTO achievements (title, description, icon) VALUES"
            " ('Первый шаг', 'Зарегистрируйся в CoWatch', '🎬'),"
            " ('Полный кинозал', 'Собери в своей комнате максимум участников', '🍿')"
        ))

    await ensure_achievements_schema(engine)
    async with async_session() as db:
        await seed_achievements(db)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        rows = (await db.execute(select(Achievement).order_by(Achievement.id))).scalars().all()

    assert len(rows) == len(SEED_ACHIEVEMENTS)
    assert {r.code for r in rows} == {spec["code"] for spec in SEED_ACHIEVEMENTS}
    # Старые строки сохранили id и получили код, описание обновилось из seed.
    assert rows[0].id == 1 and rows[0].code == "first_step"
    assert rows[1].id == 2 and rows[1].code == "full_house"
    assert rows[1].description == "Собери в своей комнате пять зрителей сразу"
    assert rows[1].category == "hall" and rows[1].sort_order == 40

    # Повторный старт ничего не ломает и не дублирует.
    await ensure_achievements_schema(engine)
    async with async_session() as db:
        await seed_achievements(db)
        count = len((await db.execute(select(Achievement))).scalars().all())
    assert count == len(SEED_ACHIEVEMENTS)
