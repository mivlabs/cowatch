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


async def _register(auth_client_http, email: str) -> int:
    resp = await auth_client_http.post(
        "/auth/register",
        json={"email": email, "username": email.split("@")[0], "password": "hunter2hunter2"},
    )
    return resp.json()["id"]


async def _unlocked_codes(auth_client_http, user_id: int) -> set[str]:
    profile_resp = await auth_client_http.get(f"/auth/profile/{user_id}")
    return {a["code"] for a in profile_resp.json()["achievements"] if a["unlocked_at"]}


async def _wait_for_codes(auth_client_http, user_id: int, expected: set[str], timeout: float = 10.0) -> set[str]:
    """Ждёт, пока в профиле появятся все expected коды, и возвращает полный набор."""
    async def _ready():
        return expected <= await _unlocked_codes(auth_client_http, user_id)

    await wait_until(_ready, timeout=timeout)
    return await _unlocked_codes(auth_client_http, user_id)


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
        json={"email": "party-host@cowatch.fun", "username": "party-host", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    await publish_raw_event("room.created", user_id, {
        "room_id": "11111111-1111-1111-1111-111111111111",
        "room_code": "ABCDEF",
        "title": "Вечер кино",
        "content_id": None,
    })

    async def _achievement_granted():
        return "first_room" in await _unlocked_codes(auth_client_http, user_id)

    assert await wait_until(_achievement_granted, timeout=10.0), (
        "Ачивка 'Хозяин вечеринки' не появилась в профиле после room.created"
    )


@pytest.mark.asyncio
async def test_message_sent_events_grant_chatterbox_at_threshold(
    auth_client_http, publish_raw_event
):
    register_resp = await auth_client_http.post(
        "/auth/register",
        json={"email": "chatterbox@cowatch.fun", "username": "chatterbox", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    for i in range(100):
        await publish_raw_event("message.sent", user_id, {"channel_id": 1, "message_id": i})

    async def _achievement_granted():
        return "chatterbox" in await _unlocked_codes(auth_client_http, user_id)

    assert await wait_until(_achievement_granted, timeout=15.0), (
        "Ачивка 'Болтун' не появилась после 100 message.sent"
    )


@pytest.mark.asyncio
async def test_video_watch_completed_grants_first_session_and_records_history(
    auth_client_http, publish_raw_event
):
    register_resp = await auth_client_http.post(
        "/auth/register",
        json={"email": "viewer@cowatch.fun", "username": "viewer", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    await publish_raw_event("video.watch_completed", user_id, {
        "room_id": "22222222-2222-2222-2222-222222222222",
        "room_code": "ZZZZZZ",
        "content_id": None,
        "content_title": "Интерстеллар",
        "content_url": "https://youtu.be/zSWdZVtXT7E",
        "duration_seconds": 3600,
        "completed": True,
        "local_hour": 21,
        "local_date": "2026-10-05",
    })

    async def _achievement_and_history_present():
        profile_resp = await auth_client_http.get(f"/auth/profile/{user_id}")
        body = profile_resp.json()
        codes = [a["code"] for a in body["achievements"] if a["unlocked_at"]]
        return "first_session" in codes and body["total_movies"] == 1

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


@pytest.mark.asyncio
async def test_room_joined_grants_host_hospitable_and_full_house(
    auth_client_http, publish_raw_event
):
    """room.joined приходит от гостя, но две наклейки получает хозяин комнаты:
    «Гостеприимный» за первого гостя и «Полный кинозал», когда в комнате
    собралось 5 зрителей (не «максимум слайдера», как в первой итерации)."""
    host_id = await _register(auth_client_http, "host@cowatch.fun")
    guest_id = await _register(auth_client_http, "guest@cowatch.fun")

    await publish_raw_event("room.joined", guest_id, {
        "room_id": "33333333-3333-3333-3333-333333333333",
        "room_code": "QQQQQQ",
        "host_id": host_id,
        "participants_count": 2,
        "max_participants": 2,
    })
    codes = await _wait_for_codes(auth_client_http, host_id, {"hospitable"})
    assert "hospitable" in codes
    assert "full_house" not in codes, "Комната на двоих не должна давать «Полный кинозал»"

    await publish_raw_event("room.joined", guest_id, {
        "room_id": "33333333-3333-3333-3333-333333333333",
        "room_code": "QQQQQQ",
        "host_id": host_id,
        "participants_count": 5,
        "max_participants": 50,
    })
    codes = await _wait_for_codes(auth_client_http, host_id, {"full_house"})
    assert "full_house" in codes
    # Гость за свои два входа ничего «хозяйского» не получает.
    assert not {"hospitable", "full_house"} & await _unlocked_codes(auth_client_http, guest_id)


@pytest.mark.asyncio
async def test_reaction_sent_events_grant_emotions_at_threshold(
    auth_client_http, publish_raw_event
):
    user_id = await _register(auth_client_http, "reactions@cowatch.fun")

    for i in range(50):
        await publish_raw_event("reaction.sent", user_id, {"room_code": "RRRRRR", "emoji": "🔥"})

    codes = await _wait_for_codes(auth_client_http, user_id, {"emotions"}, timeout=15.0)
    assert "emotions" in codes


@pytest.mark.asyncio
async def test_unfinished_watch_counts_hours_but_not_first_session(
    auth_client_http, publish_raw_event
):
    """Выход из комнаты посреди фильма (completed=False, как при разрыве
    вебсокета) пишет историю и часы, но «Первый киносеанс» не даёт."""
    user_id = await _register(auth_client_http, "leaver@cowatch.fun")

    await publish_raw_event("video.watch_completed", user_id, {
        "room_code": "LLLLLL",
        "content_title": "Дюна",
        "content_url": "https://youtu.be/n9xhJrPXop4",
        "duration_seconds": 1200,
        "completed": False,
    })

    async def _history_present():
        body = (await auth_client_http.get(f"/auth/profile/{user_id}")).json()
        return body["total_movies"] == 1

    assert await wait_until(_history_present, timeout=10.0)
    await asyncio.sleep(0.5)
    assert "first_session" not in await _unlocked_codes(auth_client_http, user_id)


@pytest.mark.asyncio
async def test_completed_watches_grant_night_owl_double_feature_and_encore(
    auth_client_http, publish_raw_event
):
    user_id = await _register(auth_client_http, "owl@cowatch.fun")
    base = {
        "room_code": "NNNNNN",
        "content_title": "Бегущий по лезвию",
        "content_url": "https://youtu.be/eogpIG53Cis",
        "duration_seconds": 600,
        "completed": True,
    }

    # Первый просмотр до конца, в 02:00 по времени зрителя.
    await publish_raw_event("video.watch_completed", user_id, {**base, "local_hour": 2, "local_date": "2026-10-06"})
    codes = await _wait_for_codes(auth_client_http, user_id, {"first_session", "night_owl"})
    assert {"first_session", "night_owl"} <= codes
    assert not {"double_feature", "encore"} & codes

    # Тот же фильм ещё раз в тот же день (днём): «Двойной сеанс» и «На бис».
    await publish_raw_event("video.watch_completed", user_id, {**base, "local_hour": 15, "local_date": "2026-10-06"})
    codes = await _wait_for_codes(auth_client_http, user_id, {"double_feature", "encore"})
    assert {"double_feature", "encore"} <= codes
