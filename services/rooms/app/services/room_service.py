import os
import json
import redis.asyncio as aioredis
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.room import Room, Participant
from app.schemas.room import RoomCreate

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/3")
redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)


async def create_room(db: AsyncSession, room_in: RoomCreate, user_id: int) -> Room:
    """
    Создаёт комнату и добавляет создателя как host.
    """
    room = Room(
        host_id=user_id,
        title=room_in.title,
        is_private=room_in.is_private,
        max_participants=room_in.max_participants,
    )
    db.add(room)
    await db.flush()  # Получаем room.id без commit

    # Создатель автоматически становится участником с ролью host
    host_participant = Participant(
        room_id=room.id,
        user_id=user_id,
        role="host",
    )
    db.add(host_participant)
    await db.commit()
    await db.refresh(room)
    return room


async def get_room_by_code(db: AsyncSession, code: str) -> Room:
    """
    Ищет комнату по короткому коду приглашения.
    """
    result = await db.execute(select(Room).where(Room.code == code))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    return room


async def join_room(db: AsyncSession, code: str, user_id: int) -> dict:
    """
    Присоединяет пользователя к комнате.
    Проверяет лимит участников и дубликаты.
    """
    room = await get_room_by_code(db, code)

    # Проверяем не участник ли уже
    existing = await db.execute(
        select(Participant).where(
            Participant.room_id == room.id,
            Participant.user_id == user_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already in this room"
        )

    # Проверяем лимит
    count_result = await db.execute(
        select(func.count()).select_from(Participant).where(Participant.room_id == room.id)
    )
    current_count = count_result.scalar()
    if current_count >= room.max_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is full"
        )

    # Добавляем участника
    participant = Participant(
        room_id=room.id,
        user_id=user_id,
        role="guest",
    )
    db.add(participant)
    await db.commit()

    # Уведомляем всех в комнате через Redis Pub/Sub
    await redis_client.publish(
        f"room:{room.id}:events",
        json.dumps({"type": "user_joined", "user_id": user_id})
    )

    return {"room": room, "user_role": "guest"}


async def get_participants_count(db: AsyncSession, room_id: UUID) -> int:
    """Считает количество участников в комнате."""
    result = await db.execute(
        select(func.count()).select_from(Participant).where(Participant.room_id == room_id)
    )
    return result.scalar()