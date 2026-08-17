import uuid
import secrets
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


def generate_room_code() -> str:
    """
    Генерирует 6-символьный код для приглашения.
    Алфавит без похожих символов (O/0, I/1).
    Энтропия: 32^6 = ~1 млрд комбинаций.
    """
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))


class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(6), unique=True, index=True, nullable=False, default=generate_room_code)
    host_id = Column(Integer, nullable=False, index=True)
    title = Column(String(100), nullable=False)
    is_private = Column(Boolean, default=True)
    max_participants = Column(Integer, default=10)
    current_movie_url = Column(String(500), nullable=True)
    current_movie_title = Column(String(200), nullable=True)
    current_position = Column(Integer, default=0)
    is_playing = Column(Boolean, default=False)
    last_sync_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    participants = relationship("Participant", back_populates="room", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, nullable=False, index=True)
    role = Column(String(10), nullable=False, default="guest")
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="participants")