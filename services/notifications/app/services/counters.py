from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.counters import UserCounter


async def increment(db: AsyncSession, user_id: int, name: str, by: int = 1) -> int:
    """Атомарно увеличивает счётчик одним UPSERT'ом и возвращает новое значение.

    consumer.py держит prefetch_count=10 — до 10 событий обрабатываются
    параллельно, в том числе несколько message.sent для одного user_id сразу.
    Раньше это было select() -> counter.value += by -> commit() (read-modify-write
    в Python), что под конкурентной нагрузкой теряло инкременты: два таска читали
    одно и то же значение до того, как любой из них закоммитил (см. упавший
    test_message_sent_events_grant_chatterbox_at_threshold — после 100 событий
    счётчик оказывался заметно меньше 100). INSERT ... ON CONFLICT DO UPDATE
    SET value = value + :by выполняет чтение-и-запись одной атомарной операцией
    на стороне Postgres, так что гонки быть не может.
    """
    stmt = (
        pg_insert(UserCounter)
        .values(user_id=user_id, name=name, value=by)
        .on_conflict_do_update(
            index_elements=["user_id", "name"],
            set_={"value": UserCounter.value + by},
        )
        .returning(UserCounter.value)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.scalar_one()
