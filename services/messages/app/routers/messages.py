import logging
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import get_user_id_from_token
from app.database import async_session
from app.events import publish_event
from app.models.message import Channel, Message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["Messages"])

class ConnectionManager:
    def __init__(self):
        # Храним все активные подключения
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        # Отправляем сообщение всем подключённым клиентам
        for connection in self.active_connections:
            await connection.send_text(message)

# Создаём глобальный экземпляр менеджера
manager = ConnectionManager()

async def _get_or_create_channel(db, channel_id: int) -> None:
    channel = await db.get(Channel, channel_id)
    if channel is None:
        db.add(Channel(id=channel_id, name=f"channel-{channel_id}"))
        await db.commit()


async def _persist_message(channel_id: int, sender_id: int, content: str) -> Message:
    async with async_session() as db:
        await _get_or_create_channel(db, channel_id)
        message = Message(channel_id=channel_id, sender_id=sender_id, content=content)
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message


@router.websocket("/ws/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: int):
    # Идентифицируем отправителя по JWT в query-параметре (тот же приём, что
    # и в rooms/ws/{code}) — раньше sender_id нигде не читался, сообщения
    # вообще не сохранялись в БД.
    token = websocket.query_params.get("token", "")
    sender_id = 0
    if token:
        try:
            sender_id = get_user_id_from_token(token)
        except Exception as e:
            logger.warning("Невалидный токен в messages ws: %s", e)

    # 1. Принимаем соединение
    await manager.connect(websocket)

    # 2. Сообщаем всем, что кто-то зашёл
    await manager.broadcast(f"🟢 Пользователь подключился к каналу {channel_id}")

    try:
        # 3. Бесконечный цикл ожидания сообщений
        while True:
            data = await websocket.receive_text()

            message = await _persist_message(channel_id, sender_id, data)
            if sender_id:
                await publish_event("message.sent", sender_id, {
                    "channel_id": channel_id,
                    "message_id": message.id,
                })

            # 4. Рассылаем полученное сообщение всем в канале
            await manager.broadcast(f"💬 Канал {channel_id}: {data}")
    except WebSocketDisconnect:
        # 5. Обрабатываем отключение
        manager.disconnect(websocket)
        await manager.broadcast(f"🔴 Пользователь покинул канал {channel_id}")