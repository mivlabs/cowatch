import json
import os
import asyncio
from fastapi import APIRouter, HTTPException, status, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.database import get_db
from app.schemas.room import RoomCreate, RoomResponse
from app.services.room_service import create_room, get_room_by_code
from app.core.security import get_user_id_from_token
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/rooms", tags=["Rooms"])
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_new_room(
    room_data: RoomCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)  # 🔥 Реальный пользователь из JWT
):
    host_id = current_user["id"]  # 🔥 Используем реальный user_id
    print(f"👤 [API] Пользователь {host_id} ({current_user['email']}) создаёт комнату")
    
    new_room = await create_room(db, room_data, host_id)
    
    await redis_client.set(f"room:participants:{new_room.code}", 0)
    await redis_client.set(f"room:host:{new_room.code}", str(host_id))
    
    return {
        "id": getattr(new_room, 'id', 0),
        "code": getattr(new_room, 'code', ''),
        "host_id": getattr(new_room, 'host_id', host_id),
        "title": getattr(new_room, 'title', room_data.title),
        "is_private": getattr(new_room, 'is_private', room_data.is_private),
        "max_participants": getattr(new_room, 'max_participants', room_data.max_participants),
        "current_movie_url": getattr(new_room, 'current_movie_url', None),
        "current_movie_title": getattr(new_room, 'current_movie_title', None),
        "current_position": float(getattr(new_room, 'current_position', 0) or 0),
        "is_playing": bool(getattr(new_room, 'is_playing', False)),
        "created_at": str(getattr(new_room, 'created_at', '')),
        "participants_count": 1
    }


@router.get("/{code}", response_model=RoomResponse)
async def get_room(code: str, db: AsyncSession = Depends(get_db)):
    room = await get_room_by_code(db, code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    count_str = await redis_client.get(f"room:participants:{code}")
    active_connections = int(count_str) if count_str else 0
    participants_count = max(1, active_connections)
    
    # 🔥 Получаем реальный host_id из Redis (если есть)
    host_id_str = await redis_client.get(f"room:host:{code}")
    host_id = int(host_id_str) if host_id_str else getattr(room, 'host_id', 1)
    
    return {
        "id": getattr(room, 'id', 0),
        "code": getattr(room, 'code', ''),
        "host_id": host_id,
        "title": getattr(room, 'title', ''),
        "is_private": getattr(room, 'is_private', False),
        "max_participants": getattr(room, 'max_participants', 10),
        "current_movie_url": getattr(room, 'current_movie_url', None),
        "current_movie_title": getattr(room, 'current_movie_title', None),
        "current_position": float(getattr(room, 'current_position', 0) or 0),
        "is_playing": bool(getattr(room, 'is_playing', False)),
        "created_at": str(getattr(room, 'created_at', '')),
        "participants_count": participants_count
    }


@router.patch("/{code}/video")
async def update_room_video(
    code: str, 
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)  # 🔥 Только авторизованные
):
    room = await get_room_by_code(db, code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # 🔥 Проверяем что только хост может менять видео
    host_id_str = await redis_client.get(f"room:host:{code}")
    if host_id_str and int(host_id_str) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only host can change video")
    
    url = data.get("url", "")
    title = data.get("title")
    
    room.current_movie_url = url if url.strip() else None
    if title:
        room.current_movie_title = title
    room.current_position = 0
    room.is_playing = False
    
    await db.commit()
    await db.refresh(room)
    
    await redis_client.publish(f"room:events:{code}", json.dumps({
        "type": "video_changed",
        "url": url,
        "title": title,
        "timestamp": __import__('datetime').datetime.utcnow().isoformat()
    }))
    
    print(f"🎬 [API] Видео в комнате {code} обновлено: {url}")
    return {"status": "ok", "url": url}


@router.websocket("/ws/{code}")
async def room_websocket(websocket: WebSocket, code: str):
    print(f"🟢 [WS] Попытка подключения к комнате: {code}")
    
    # 🔥 Извлекаем токен из query-параметра
    token = websocket.query_params.get("token", "")
    user_id = 0
    user_email = "Guest"
    
    if token:
        try:
            user_id = get_user_id_from_token(token)
            from app.core.security import get_user_email_from_token
            user_email = get_user_email_from_token(token)
            print(f"👤 [WS] Авторизованный пользователь: {user_id} ({user_email})")
        except Exception as e:
            print(f"⚠️ [WS] Невалидный токен: {e}")
            user_id = 0
            user_email = "Guest"
    else:
        print(f"🎭 [WS] Гостевое подключение")
    
    try:
        await websocket.accept()
        print(f"✅ [WS] WebSocket принят для комнаты: {code}")
        
        # 🔥 СЕРВЕРНОЕ ОПРЕДЕЛЕНИЕ ХОСТА
        host_key = f"room:host:{code}"
        is_host = False
        
        existing_host = await redis_client.get(host_key)
        if not existing_host:
            await redis_client.set(host_key, str(user_id))
            is_host = True
            print(f"👑 [WS] Назначен новый хост: {user_id}")
        else:
            # Проверяем, совпадает ли текущий user с хостом
            is_host = (str(user_id) == existing_host)
            print(f"👤 [WS] Подключился {'хост' if is_host else 'гость'}: {user_id}")
        
        current_count = await redis_client.incr(f"room:participants:{code}")
        print(f"👥 [WS] Участников в комнате: {current_count}")
        
        channel_name = f"room:events:{code}"
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(channel_name)
        
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": f"Подключено к комнате {code}. Участников: {current_count}",
            "is_host": is_host,
            "user_id": user_id,
            "username": user_email
        }))

        async def listen_redis():
            try:
                async for message in pubsub.listen():
                    if message["type"] == "message":
                        try:
                            await websocket.send_text(message["data"])
                        except Exception:
                            break
            except Exception:
                pass

        listener = asyncio.create_task(listen_redis())

        while True:
            try:
                data = await websocket.receive_text()
                await redis_client.publish(channel_name, data)
            except WebSocketDisconnect:
                print(f"🔴 [WS] Клиент отключился: {code}")
                break
            except Exception as e:
                print(f"❌ [WS] Ошибка получения: {e}")
                break
    except Exception as e:
        print(f"💥 [WS] КРИТИЧЕСКАЯ ОШИБКА: {e}")
    finally:
        print(f"🧹 [WS] Очистка для {code}")
        
        current_count = await redis_client.decr(f"room:participants:{code}")
        if current_count < 0:
            await redis_client.set(f"room:participants:{code}", 0)
        
        if is_host:
            await redis_client.delete(f"room:host:{code}")
            print(f"👑 [WS] Хост отключился, флаг очищен")
        
        print(f"👥 [WS] Осталось участников: {max(0, current_count)}")
        
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
        if 'listener' in locals():
            listener.cancel()