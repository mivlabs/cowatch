from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

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

@router.websocket("/ws/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: int):
    # 1. Принимаем соединение
    await manager.connect(websocket)
    
    # 2. Сообщаем всем, что кто-то зашёл
    await manager.broadcast(f"🟢 Пользователь подключился к каналу {channel_id}")
    
    try:
        # 3. Бесконечный цикл ожидания сообщений
        while True:
            data = await websocket.receive_text()
            # 4. Рассылаем полученное сообщение всем в канале
            await manager.broadcast(f"💬 Канал {channel_id}: {data}")
    except WebSocketDisconnect:
        # 5. Обрабатываем отключение
        manager.disconnect(websocket)
        await manager.broadcast(f"🔴 Пользователь покинул канал {channel_id}")