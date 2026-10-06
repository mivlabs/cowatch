"""Логика ачивок и watch-history, вынесенная из routers/auth.py.

Ачивки заводятся один раз при старте сервиса (seed_achievements), а не лениво
при первом попадании — иначе запись Achievement может вообще не существовать,
если событие, которое должно было её создать, ни разу не произошло.

Ключ ачивки — поле code (см. SEED_ACHIEVEMENTS). Название, описание, иконка
и порядок — просто данные, которые seed_achievements обновляет при каждом
старте, поэтому переименовать наклейку можно правкой этого файла, без
миграции и без потери уже выданных UserAchievement.

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

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.models.achievement import Achievement, UserAchievement, WatchHistory
from app.models.user import User

logger = logging.getLogger(__name__)

# Группы наклеек в профиле. Порядок групп = порядок показа.
CATEGORY_HALL = "hall"
CATEGORY_CHAT = "chat"
CATEGORY_WATCH = "watch"

# Полный список ачивок. code — стабильный идентификатор, по нему выдаёт
# grant_achievement (внутренний HTTP-эндпоинт для notifications и
# registration-флоу). Пороги живут в notifications/app/services/rules.py,
# здесь только то, что видит пользователь.
SEED_ACHIEVEMENTS: list[dict] = [
    # --- Зал ---
    {
        "code": "first_step",
        "title": "Первый шаг",
        "description": "Зарегистрируйся в CoWatch",
        "icon": "🎬",
        "category": CATEGORY_HALL,
        "sort_order": 10,
    },
    {
        "code": "first_room",
        "title": "Хозяин вечеринки",
        "description": "Создай свою первую комнату",
        "icon": "🏠",
        "category": CATEGORY_HALL,
        "sort_order": 20,
    },
    {
        "code": "hospitable",
        "title": "Гостеприимный",
        "description": "Позови друга: пусть кто-нибудь зайдёт в твою комнату по коду",
        "icon": "🔑",
        "category": CATEGORY_HALL,
        "sort_order": 30,
    },
    {
        "code": "full_house",
        "title": "Полный кинозал",
        "description": "Собери в своей комнате пять зрителей сразу",
        "icon": "🍿",
        "category": CATEGORY_HALL,
        "sort_order": 40,
    },
    {
        "code": "film_club",
        "title": "Киноклуб",
        "description": "Создай 10 комнат",
        "icon": "🎪",
        "category": CATEGORY_HALL,
        "sort_order": 50,
    },
    {
        "code": "social_butterfly",
        "title": "Душа компании",
        "description": "Зайди в 5 разных комнат",
        "icon": "🎉",
        "category": CATEGORY_HALL,
        "sort_order": 60,
    },
    {
        "code": "regular",
        "title": "Завсегдатай",
        "description": "Зайди в 25 разных комнат",
        "icon": "🛋️",
        "category": CATEGORY_HALL,
        "sort_order": 70,
    },
    # --- Общение ---
    {
        "code": "chatterbox",
        "title": "Болтун",
        "description": "Отправь 100 сообщений в чатах комнат",
        "icon": "💬",
        "category": CATEGORY_CHAT,
        "sort_order": 10,
    },
    {
        "code": "commentator",
        "title": "Комментатор",
        "description": "Отправь 1000 сообщений в чатах комнат",
        "icon": "🎙️",
        "category": CATEGORY_CHAT,
        "sort_order": 20,
    },
    {
        "code": "emotions",
        "title": "Эмоции через край",
        "description": "Отправь 50 реакций во время просмотра",
        "icon": "🔥",
        "category": CATEGORY_CHAT,
        "sort_order": 30,
    },
    # --- Просмотр ---
    {
        "code": "first_session",
        "title": "Первый киносеанс",
        "description": "Досмотри фильм вместе с друзьями до самых титров",
        "icon": "🎞️",
        "category": CATEGORY_WATCH,
        "sort_order": 10,
    },
    {
        "code": "double_feature",
        "title": "Двойной сеанс",
        "description": "Досмотри два фильма за один день",
        "icon": "🎟️",
        "category": CATEGORY_WATCH,
        "sort_order": 20,
    },
    {
        "code": "encore",
        "title": "На бис",
        "description": "Досмотри один и тот же фильм второй раз",
        "icon": "🔁",
        "category": CATEGORY_WATCH,
        "sort_order": 30,
    },
    {
        "code": "night_owl",
        "title": "Полуночник",
        "description": "Досмотри фильм между полуночью и пятью утра",
        "icon": "🌙",
        "category": CATEGORY_WATCH,
        "sort_order": 40,
    },
    {
        "code": "marathon",
        "title": "Марафонец",
        "description": "Суммарно посмотри 10+ часов видео в CoWatch",
        "icon": "🏃",
        "category": CATEGORY_WATCH,
        "sort_order": 50,
    },
    {
        "code": "cinephile",
        "title": "Киноман",
        "description": "Суммарно посмотри 50+ часов видео в CoWatch",
        "icon": "🎥",
        "category": CATEGORY_WATCH,
        "sort_order": 60,
    },
]

# Первая итерация ачивок не знала поля code — ключом был title. По этой
# таблице seed_achievements проставляет коды строкам, заведённым до миграции,
# чтобы уже выданные наклейки не потерялись и не задвоились.
LEGACY_TITLE_TO_CODE: dict[str, str] = {
    "Первый шаг": "first_step",
    "Хозяин вечеринки": "first_room",
    "Душа компании": "social_butterfly",
    "Полный кинозал": "full_house",
    "Болтун": "chatterbox",
    "Первый киносеанс": "first_session",
    "Марафонец": "marathon",
}

CATEGORY_ORDER = {CATEGORY_HALL: 0, CATEGORY_CHAT: 1, CATEGORY_WATCH: 2}


async def ensure_achievements_schema(engine: AsyncEngine) -> None:
    """Добавляет в старую таблицу achievements колонки code/category/sort_order.

    Сервис создаёт таблицы через Base.metadata.create_all, который не умеет
    добавлять колонки в уже существующие таблицы — на проде таблица
    achievements заведена первой итерацией без этих полей. Alembic'а в
    проекте нет, поэтому миграция идемпотентная и крошечная: ADD COLUMN IF
    NOT EXISTS, а NOT NULL на code навешивается в seed_achievements() после
    того, как все строки получили код.
    """
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE achievements ADD COLUMN IF NOT EXISTS code VARCHAR(64)"))
        await conn.execute(text(
            "ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category VARCHAR(32) NOT NULL DEFAULT 'hall'"
        ))
        await conn.execute(text(
            "ALTER TABLE achievements ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0"
        ))
        await conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_achievements_code ON achievements (code)"
        ))


async def seed_achievements(db: AsyncSession) -> None:
    """Идемпотентно приводит таблицу achievements к SEED_ACHIEVEMENTS.

    Вызывается при старте приложения (после ensure_achievements_schema).
    Строки без code (из первой итерации) получают код по названию, затем
    каждая ачивка из списка либо обновляется (название/описание/иконка/
    порядок), либо создаётся. Выданные UserAchievement при этом не трогаются.
    """
    result = await db.execute(select(Achievement))
    existing = list(result.scalars().all())

    for achievement in existing:
        if achievement.code is None:
            legacy_code = LEGACY_TITLE_TO_CODE.get(achievement.title)
            if legacy_code is None:
                logger.warning("Ачивка '%s' без кода и не из первой итерации — пропускаю", achievement.title)
                continue
            achievement.code = legacy_code

    by_code = {a.code: a for a in existing if a.code is not None}

    for spec in SEED_ACHIEVEMENTS:
        achievement = by_code.get(spec["code"])
        if achievement is None:
            db.add(Achievement(**spec))
            continue
        achievement.title = spec["title"]
        achievement.description = spec["description"]
        achievement.icon = spec["icon"]
        achievement.category = spec["category"]
        achievement.sort_order = spec["sort_order"]

    await db.commit()

    # Теперь, когда у всех строк есть код, можно закрепить NOT NULL (на свежих
    # базах create_all уже сделал это сам, ALTER тогда no-op).
    await db.execute(text("ALTER TABLE achievements ALTER COLUMN code SET NOT NULL"))
    await db.commit()


@dataclass
class GrantResult:
    granted: bool
    reason: str | None = None
    # Заполняются, когда ачивка найдена — чтобы вызывающий (internal API ->
    # notifications -> Telegram-бот) мог назвать наклейку, не зная SEED_ACHIEVEMENTS.
    code: str | None = None
    title: str | None = None
    icon: str | None = None


async def grant_achievement(db: AsyncSession, user_id: int, achievement_code: str) -> GrantResult:
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
                    achievement_code, user_id)
        return GrantResult(granted=False, reason="unknown_user")

    achievement_result = await db.execute(
        select(Achievement).where(Achievement.code == achievement_code)
    )
    achievement = achievement_result.scalar_one_or_none()
    if achievement is None:
        logger.error("Ачивка '%s' не заведена как seed-запись", achievement_code)
        return GrantResult(granted=False, reason="unknown_achievement")

    stmt = (
        pg_insert(UserAchievement)
        .values(user_id=user_id, achievement_id=achievement.id)
        .on_conflict_do_nothing(index_elements=["user_id", "achievement_id"])
        .returning(UserAchievement.id)
    )
    result = await db.execute(stmt)
    await db.commit()

    details = {"code": achievement.code, "title": achievement.title, "icon": achievement.icon}
    if result.scalar_one_or_none() is None:
        return GrantResult(granted=False, reason="already_granted", **details)

    logger.info("Пользователь %s получил ачивку '%s'", user_id, achievement_code)
    return GrantResult(granted=True, **details)


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
