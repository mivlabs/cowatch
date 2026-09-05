import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy", "service": "auth"}


@pytest.mark.asyncio
async def test_register_creates_user(client):
    resp = await client.post(
        "/auth/register",
        json={"email": "masha@cowatch.fun", "password": "hunter2hunter2"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "masha@cowatch.fun"
    assert body["is_active"] is True
    assert "id" in body


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_400(client):
    payload = {"email": "dup@cowatch.fun", "password": "hunter2hunter2"}
    first = await client.post("/auth/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/auth/register", json=payload)
    assert second.status_code == 400
    assert "already registered" in second.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_grants_first_achievement(client):
    await client.post(
        "/auth/register",
        json={"email": "achiever@cowatch.fun", "password": "hunter2hunter2"},
    )
    profile_resp = await client.get("/auth/profile/1")
    assert profile_resp.status_code == 200
    body = profile_resp.json()
    assert len(body["achievements"]) == 1
    assert body["achievements"][0]["title"] == "Первый шаг"
    # Регрессия: раньше AchievementResponse требовал unlocked_at, которого
    # не было в выборке select(Achievement) — эндпоинт падал с 500.
    assert body["achievements"][0]["unlocked_at"] is not None


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(
        "/auth/register",
        json={"email": "login@cowatch.fun", "password": "correct-horse"},
    )
    resp = await client.post(
        "/auth/login",
        json={"email": "login@cowatch.fun", "password": "correct-horse"},
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
        json={"email": "login2@cowatch.fun", "password": "correct-horse"},
    )
    resp = await client.post(
        "/auth/login",
        json={"email": "login2@cowatch.fun", "password": "wrong-password"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client):
    resp = await client.post(
        "/auth/login",
        json={"email": "ghost@cowatch.fun", "password": "whatever12345"},
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
