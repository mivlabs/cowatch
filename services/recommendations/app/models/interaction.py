from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class WatchEvent(Base):
    """
    Одна строка = один пользователь посмотрел один контент в одной комнате.

    Источник правды — rooms_db.participants + rooms_db.rooms (см. etl.py):
    join_room фиксирует user_id + room_id + joined_at, а комната несёт
    current_movie_title. Эта таблица — денормализованная копия для ML,
    обновляется батчем через sync_watch_events(), не realtime.

    unique(room_id, user_id) — чтобы повторный прогон ETL был идемпотентным
    (upsert, а не дублирование строк при каждом запуске).
    """

    __tablename__ = "watch_events"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_room_user"),)

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(36), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)

    content_title = Column(String(300), nullable=False)
    content_id = Column(Integer, ForeignKey("content_items.id"), nullable=True, index=True)

    joined_at = Column(DateTime(timezone=True), nullable=False)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
