"""Логика ачивок и watch-history, вынесенная из routers/auth.py.

Ачивки заводятся один раз при старте сервиса (seed_achievements), а не лениво
при первом попадании — иначе запись Achievement может вообще не существовать,
если событие, которое должно было её создать, ни разу не произошло.

Гости (user_id, выданный /auth/guest) не существуют в таблице users — у них
нет пароля, почты, ничего. UserAchievement.user_id и WatchHistory.user_id
ссылаются на users.id через FK ondelete=CASCADE, поэтому попытка выдать
ачивку/историю несуществующему user_id либо упадёт на FK, либо потребует
превратить FK в мягкую связь. Решение: гости не получают персистентные
ачивки и историю — grant_achievement/record_watch_history тихо пропускают
неизвестных user_id (см. reason="unknown_user"). Это осознанный компромисс,
а не забытый баг: если понадобится ачивка и для гостей, им сначала нужно
завести настоящую строку в users (например guest-пользователь без пароля).
"""
import logging
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement, UserAchievement, WatchHistory
from app.models.user import User

logger = logging.getLogger(__name__)

# Ачивки первой итерации кросс-сервисной системы. title — стабильный
# идентификатор ачивки для grant_achievement (используется и внутренним
# HTTP-эндпоинтом, и registration-флоу).
SEED_ACHIEVEMENTS: list[dict] = [
    {
        "title": "Первый шаг",
        "description": "Зарегистрируйся в CoWatch",
        "icon": "🎬",
    },
    {
        "title": "Хозяин вечеринки",
        "description": "Создай свою первую комнату",
        "icon": "🏠",
    },
    {
        "title": "Душа компании",
        "description": "Присоединись к 5 разным комнатам",
        "icon": "🎉",
    },
    {
        "title": "Полный кинозал",
        "description": "Собери в своей комнате максимум участников",
        "icon": "🍿",
    },
    {
        "title": "Болтун",
        "description": "Отправь 100 сообщений в чатах комнат",
        "icon": "💬",
    },
    {
        "title": "Первый киносеанс",
        "description": "Досмотри видео вместе с друзьями до конца",
        "icon": "🎞️",
    },
    {
        "title": "Марафонец",
        "description": "Суммарно посмотри 10+ часов видео в CoWatch",
        "icon": "🏃",
    },
]


async def seed_achievements(db: AsyncSession) -> None:
    """Идемпотентно создаёт все ачивки первой итерации. Вызывается при старте приложения."""
    existing = await db.execute(select(Achievement.title))
    existing_titles = {row[0] for row in existing.all()}

    for spec in SEED_ACHIEVEMENTS:
        if spec["title"] not in existing_titles:
            db.add(Achievement(**spec))

    await db.commit()


@dataclass
class GrantResult:
    granted: bool
    reason: str | None = None


async def grant_achievement(db: AsyncSession, user_id: int, achievement_title: str) -> GrantResult:
    """Атомарно и идемпотентно выдаёт ачивку одним UPSERT'ом.

    notifications держит prefetch_count=10 — до 10 событий обрабатываются
    параллельно, в том числе два события для одного user_id почти одновременно
    (например два video.watch_completed из разных комнат). Раньше тут было
    SELECT UserAchievement -> если пусто -> INSERT (read-modify-write без
    блокировки в Python) — та же болезнь, что была в counters.increment():
    оба конкурентных таска могли пройти проверку "уже выдано?" до того, как
    любой из них закоммитится, и создать дубликат строки. UniqueConstraint
    ("user_id", "achievement_id") в модели UserAchievement + INSERT ... ON
    CONFLICT DO NOTHING делают идемпотентность гарантией на уровне БД, а не
    везением в чередовании корутин.
    """
    user = await db.get(User, user_id)
    if user is None:
        logger.info("Пропускаю выдачу '%s' для user_id=%s: пользователь не найден (гость?)",
                    achievement_title, user_id)
        return GrantResult(granted=False, reason="unknown_user")

    achievement_result = await db.execute(
        select(Achievement).where(Achievement.title == achievement_title)
    )
    achievement = achievement_result.scalar_one_or_none()
    if achievement is None:
        logger.error("Ачивка '%s' не заведена как seed-запись", achievement_title)
        return GrantResult(granted=False, reason="unknown_achievement")

    stmt = (
        pg_insert(UserAchievement)
        .values(user_id=user_id, achievement_id=achievement.id)
        .on_conflict_do_nothing(index_elements=["user_id", "achievement_id"])
        .returning(UserAchievement.id)
    )
    result = await db.execute(stmt)
    await db.commit()

    if result.scalar_one_or_none() is None:
        return GrantResult(granted=False, reason="already_granted")

    logger.info("Пользователь %s получил ачивку '%s'", user_id, achievement_title)
    return GrantResult(granted=True)


async def record_watch_history(
    db: AsyncSession,
    user_id: int,
    movie_title: str,
    movie_url: str,
    duration_minutes: int,
) -> GrantResult:
    """Пишет запись в WatchHistory. Гости (см. модуль docstring) пропускаются."""
    user = await db.get(User, user_id)
    if user is None:
        return GrantResult(granted=False, reason="unknown_user")

    db.add(WatchHistory(
        user_id=user_id,
        movie_title=movie_title,
        movie_url=movie_url,
        duration_minutes=duration_minutes,
    ))
    await db.commit()
    return GrantResult(granted=True)
