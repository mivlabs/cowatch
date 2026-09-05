import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy", "service": "rooms"}


@pytest.mark.asyncio
async def test_create_room_requires_auth(client):
    resp = await client.post("/rooms/", json={"title": "Матрица"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_room_success(client, auth_headers):
    resp = await client.post(
        "/rooms/",
        json={"title": "Матрица", "is_private": True, "max_participants": 5},
        headers=auth_headers(1, "host@cowatch.fun"),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Матрица"
    assert body["host_id"] == 1
    assert len(body["code"]) == 6
    assert body["participants_count"] == 1


@pytest.mark.asyncio
async def test_get_room_by_code(client, auth_headers):
    create_resp = await client.post(
        "/rooms/",
        json={"title": "Дюна"},
        headers=auth_headers(1, "host@cowatch.fun"),
    )
    code = create_resp.json()["code"]

    resp = await client.get(f"/rooms/{code}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Дюна"


@pytest.mark.asyncio
async def test_get_room_unknown_code_returns_404(client):
    resp = await client.get("/rooms/ZZZZZZ")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_join_room_success(client, auth_headers):
    create_resp = await client.post(
        "/rooms/",
        json={"title": "Интерстеллар", "max_participants": 5},
        headers=auth_headers(1, "host@cowatch.fun"),
    )
    code = create_resp.json()["code"]

    join_resp = await client.post(
        f"/rooms/{code}/join",
        headers=auth_headers(2, "guest@cowatch.fun"),
    )
    assert join_resp.status_code == 200
    body = join_resp.json()
    assert body["user_role"] == "guest"
    assert body["room"]["participants_count"] == 2


@pytest.mark.asyncio
async def test_join_room_twice_returns_400(client, auth_headers):
    create_resp = await client.post(
        "/rooms/",
        json={"title": "Начало", "max_participants": 5},
        headers=auth_headers(1, "host@cowatch.fun"),
    )
    code = create_resp.json()["code"]

    await client.post(f"/rooms/{code}/join", headers=auth_headers(2, "guest@cowatch.fun"))
    second = await client.post(f"/rooms/{code}/join", headers=auth_headers(2, "guest@cowatch.fun"))
    assert second.status_code == 400
    assert "already" in second.json()["detail"].lower()


@pytest.mark.asyncio
async def test_join_full_room_returns_400(client, auth_headers):
    create_resp = await client.post(
        "/rooms/",
        json={"title": "Тесная комната", "max_participants": 2},
        headers=auth_headers(1, "host@cowatch.fun"),
    )
    code = create_resp.json()["code"]

    # host (1) уже занимает одно место, следующий гость (2) заполняет комнату
    ok = await client.post(f"/rooms/{code}/join", headers=auth_headers(2, "guest2@cowatch.fun"))
    assert ok.status_code == 200

    overflow = await client.post(f"/rooms/{code}/join", headers=auth_headers(3, "guest3@cowatch.fun"))
    assert overflow.status_code == 400
    assert "full" in overflow.json()["detail"].lower()


@pytest.mark.asyncio
async def test_join_unknown_room_returns_404(client, auth_headers):
    resp = await client.post("/rooms/ZZZZZZ/join", headers=auth_headers(1, "user@cowatch.fun"))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_room_invalid_body_returns_422(client, auth_headers):
    resp = await client.post(
        "/rooms/",
        json={"title": ""},
        headers=auth_headers(1, "host@cowatch.fun"),
    )
    assert resp.status_code == 422
