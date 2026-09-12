"""Тесты внутреннего API auth (notifications -> auth). См. app/routers/internal.py.

INTERNAL_API_SECRET фиксируется в conftest.py (до импорта app.main, иначе
app/routers/internal.py уже прочитал бы старое значение при импорте)."""
import pytest

INTERNAL_SECRET = "test-internal-secret"


def _headers():
    return {"X-Internal-Secret": INTERNAL_SECRET}


@pytest.mark.asyncio
async def test_grant_achievement_rejects_wrong_secret(client):
    resp = await client.post(
        "/auth/register",
        json={"email": "secret@cowatch.fun", "password": "hunter2hunter2"},
    )
    user_id = resp.json()["id"]

    resp = await client.post(
        "/internal/achievements/grant",
        json={"user_id": user_id, "achievement_title": "Хозяин вечеринки"},
        headers={"X-Internal-Secret": "wrong-secret"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_grant_achievement_is_idempotent(client):
    """Повторный вызов /internal/achievements/grant с тем же user_id+achievement_title
    не должен создавать вторую запись UserAchievement — иначе профиль показывал бы
    задублированные ачивки в списке."""
    register_resp = await client.post(
        "/auth/register",
        json={"email": "idempotent@cowatch.fun", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    first = await client.post(
        "/internal/achievements/grant",
        json={"user_id": user_id, "achievement_title": "Хозяин вечеринки"},
        headers=_headers(),
    )
    assert first.status_code == 200
    assert first.json() == {"granted": True, "reason": None}

    second = await client.post(
        "/internal/achievements/grant",
        json={"user_id": user_id, "achievement_title": "Хозяин вечеринки"},
        headers=_headers(),
    )
    assert second.status_code == 200
    assert second.json() == {"granted": False, "reason": "already_granted"}

    profile_resp = await client.get(f"/auth/profile/{user_id}")
    titles = [a["title"] for a in profile_resp.json()["achievements"]]
    assert titles.count("Хозяин вечеринки") == 1


@pytest.mark.asyncio
async def test_grant_achievement_skips_unknown_user_guest(client):
    """Гости (см. /auth/guest) не существуют в таблице users — выдача им ачивки
    через internal API должна тихо no-op'нуться, а не падать на FK."""
    resp = await client.post(
        "/internal/achievements/grant",
        json={"user_id": 999999, "achievement_title": "Хозяин вечеринки"},
        headers=_headers(),
    )
    assert resp.status_code == 200
    assert resp.json() == {"granted": False, "reason": "unknown_user"}


@pytest.mark.asyncio
async def test_record_history_updates_profile_totals(client):
    register_resp = await client.post(
        "/auth/register",
        json={"email": "history@cowatch.fun", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    resp = await client.post(
        "/internal/history/record",
        json={
            "user_id": user_id,
            "movie_title": "Матрица",
            "movie_url": "ABC123",
            "duration_seconds": 7200,
        },
        headers=_headers(),
    )
    assert resp.status_code == 200
    assert resp.json() == {"granted": True, "reason": None}

    profile_resp = await client.get(f"/auth/profile/{user_id}")
    body = profile_resp.json()
    assert body["total_movies"] == 1
    assert body["total_hours"] == 2.0
