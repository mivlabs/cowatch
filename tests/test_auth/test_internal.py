"""Тесты внутреннего API auth (notifications -> auth). См. app/routers/internal.py.

INTERNAL_API_SECRET фиксируется в conftest.py (до импорта app.main, иначе
app/routers/internal.py уже прочитал бы старое значение при импорте)."""
import asyncio

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.database import async_session
from app.models.achievement import Achievement, UserAchievement
from app.services.achievement_service import grant_achievement

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
async def test_user_achievement_unique_constraint_rejects_duplicate_row(client):
    """Проверяет саму защиту на уровне БД детерминированно, без асинхронного
    тайминга: UniqueConstraint("user_id", "achievement_id") должен реально
    существовать и реально отклонять дубликат.

    Почему не просто гонять grant_achievement() из N параллельных корутин и
    надеяться поймать гонку: проверила руками — на локальном Postgres с
    пулом на 5-6 соединений и вызовами в одном процессе через asyncio.gather
    connection pool checkout успевает достаточно сериализовать SELECT->COMMIT
    каждого вызова, чтобы гонка НЕ воспроизводилась стабильно, даже на старой
    (select-then-insert) реализации — то есть такой тест мог бы годами
    зелёным проходить и с багом, и без него, в зависимости от удачи с
    планировщиком. В проде race window шире (notifications и auth — разные
    процессы, реальный HTTP/сеть между ними), но полагаться на тайминг в
    самом тесте — то самое "удачное чередование корутин", от которого просили
    не зависеть. Поэтому здесь два первых INSERT'а с одинаковым
    (user_id, achievement_id) идут напрямую, без ON CONFLICT — если
    констрейнта нет или он снят, второй INSERT молча пройдёт и тест это
    поймает; если констрейнт есть, он гарантированно (не по везению)
    поднимет IntegrityError на равно втором вызове."""
    register_resp = await client.post(
        "/auth/register",
        json={"email": "constraint@cowatch.fun", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    async with async_session() as db:
        achievement_id = (
            await db.execute(select(Achievement.id).where(Achievement.title == "Хозяин вечеринки"))
        ).scalar_one()

        db.add(UserAchievement(user_id=user_id, achievement_id=achievement_id))
        await db.commit()

        db.add(UserAchievement(user_id=user_id, achievement_id=achievement_id))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()

    async with async_session() as db:
        row_count = (
            await db.execute(
                select(func.count()).select_from(UserAchievement).where(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement_id,
                )
            )
        ).scalar()
    assert row_count == 1


@pytest.mark.asyncio
async def test_grant_achievement_concurrent_calls_leave_a_single_row(client):
    """Проверяет grant_achievement() (не голый констрейнт) под реальной
    конкурентной нагрузкой: notifications обрабатывает до 10 событий
    параллельно (prefetch_count=10), значит два video.watch_completed для
    одного пользователя могут вызвать grant_achievement() почти одновременно.

    В отличие от test_user_achievement_unique_constraint_rejects_duplicate_row
    выше, этот тест НЕ доказывает сам факт гонки (см. её докстринг — локальная
    гонка тайминг-зависима и ненадёжно воспроизводится через asyncio.gather),
    а проверяет наблюдаемое поведение публичной функции при реальной
    конкурентности: ровно один вызов должен получить granted=True, остальные —
    already_granted, и в БД должна остаться ровно одна строка — независимо от
    того, как их раскидает планировщик."""
    register_resp = await client.post(
        "/auth/register",
        json={"email": "concurrent@cowatch.fun", "password": "hunter2hunter2"},
    )
    user_id = register_resp.json()["id"]

    async def _grant():
        async with async_session() as db:
            return await grant_achievement(db, user_id, "Хозяин вечеринки")

    results = await asyncio.gather(*(_grant() for _ in range(10)))

    granted_count = sum(1 for r in results if r.granted)
    already_granted_count = sum(1 for r in results if r.reason == "already_granted")
    assert granted_count == 1
    assert already_granted_count == 9

    async with async_session() as db:
        achievement_id = (
            await db.execute(select(Achievement.id).where(Achievement.title == "Хозяин вечеринки"))
        ).scalar_one()
        row_count = (
            await db.execute(
                select(func.count()).select_from(UserAchievement).where(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement_id,
                )
            )
        ).scalar()
    assert row_count == 1


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
