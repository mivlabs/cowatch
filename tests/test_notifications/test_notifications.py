import asyncio

import pytest


async def wait_until(predicate, timeout: float = 5.0, interval: float = 0.05) -> bool:
    """Опрашивает predicate() (sync или async) до timeout секунд — нужен, потому
    что consumer обрабатывает событие из очереди асинхронно, без гарантии,
    когда именно он закончит между `publish` и проверкой результата."""
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        result = predicate()
        if asyncio.iscoroutine(result):
            result = await result
        if result:
            return True
        await asyncio.sleep(interval)
    return False


@pytest.mark.asyncio
async def test_health_check(notifications_client):
    resp = await notifications_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy", "service": "notifications"}


@pytest.mark.asyncio
async def test_room_created_event_grants_host_achievement(
    auth_client_http, publish_raw_event
):
    """Интеграционный путь целиком: событие room.created публикуется в реальный
    RabbitMQ (см. publish_raw_event в conftest), реальный consumer notifications
    его забирает, дёргает /internal/achievements/grant в auth (через ASGI,
    без сокета — см. conftest), и ачивка появляется в профиле пользователя."""
    register_resp = await auth_client_http.post(
        "/auth/register",
        json={"email": "party-host@cowatch.fun", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    await publish_raw_event("room.created", user_id, {
        "room_id": "11111111-1111-1111-1111-111111111111",
        "room_code": "ABCDEF",
        "title": "Вечер кино",
        "content_id": None,
    })

    async def _achievement_granted():
        profile_resp = await auth_client_http.get(f"/auth/profile/{user_id}")
        titles = [a["title"] for a in profile_resp.json()["achievements"]]
        return "Хозяин вечеринки" in titles

    assert await wait_until(_achievement_granted, timeout=10.0), (
        "Ачивка 'Хозяин вечеринки' не появилась в профиле после room.created"
    )


@pytest.mark.asyncio
async def test_message_sent_events_grant_chatterbox_at_threshold(
    auth_client_http, publish_raw_event
):
    register_resp = await auth_client_http.post(
        "/auth/register",
        json={"email": "chatterbox@cowatch.fun", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    for i in range(100):
        await publish_raw_event("message.sent", user_id, {"channel_id": 1, "message_id": i})

    async def _achievement_granted():
        profile_resp = await auth_client_http.get(f"/auth/profile/{user_id}")
        titles = [a["title"] for a in profile_resp.json()["achievements"]]
        return "Болтун" in titles

    assert await wait_until(_achievement_granted, timeout=15.0), (
        "Ачивка 'Болтун' не появилась после 100 message.sent"
    )


@pytest.mark.asyncio
async def test_video_watch_completed_grants_first_session_and_records_history(
    auth_client_http, publish_raw_event
):
    register_resp = await auth_client_http.post(
        "/auth/register",
        json={"email": "viewer@cowatch.fun", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    await publish_raw_event("video.watch_completed", user_id, {
        "room_id": "22222222-2222-2222-2222-222222222222",
        "room_code": "ZZZZZZ",
        "content_id": None,
        "content_title": "Интерстеллар",
        "duration_seconds": 3600,
    })

    async def _achievement_and_history_present():
        profile_resp = await auth_client_http.get(f"/auth/profile/{user_id}")
        body = profile_resp.json()
        titles = [a["title"] for a in body["achievements"]]
        return "Первый киносеанс" in titles and body["total_movies"] == 1

    assert await wait_until(_achievement_and_history_present, timeout=10.0), (
        "Ачивка 'Первый киносеанс' и/или WatchHistory не появились после video.watch_completed"
    )

    profile_resp = await auth_client_http.get(f"/auth/profile/{user_id}")
    body = profile_resp.json()
    assert body["total_hours"] == 1.0
    assert body["history"][0]["movie_title"] == "Интерстеллар"


@pytest.mark.asyncio
async def test_unknown_event_type_is_ignored_without_crashing(
    notifications_client, publish_raw_event
):
    """rules.handle_event логирует и выходит для неизвестных routing key — но
    неизвестные события даже не попадут в очередь notifications, потому что
    consumer биндит только 4 конкретных routing key. Проверяем, что сервис
    остаётся живым после события, которое consumer не подписан слушать."""
    await publish_raw_event("some.unbound.event", 1, {})
    resp = await notifications_client.get("/health")
    assert resp.status_code == 200
