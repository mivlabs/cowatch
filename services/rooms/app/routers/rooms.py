@router.websocket("/ws/{code}")
async def room_websocket(websocket: WebSocket, code: str):
    print(f"🚀 [WS] ЗАПРОС ДОШЕЛ ДО ФУНКЦИИ! Комната: {code}")
    
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
    
    try:
        await websocket.accept()
        print(f"✅ [WS] WebSocket принят для комнаты: {code}")
        
        # 🔥 УЛУЧШЕННАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ ХОСТА С ОТЛАДКОЙ
        host_key = f"room:host:{code}"
        existing_host = await redis_client.get(host_key)
        
        print(f"🔍 [WS] ОТЛАДКА ХОСТА: existing_host='{existing_host}', current_user_id={user_id} (type: {type(user_id)})")
        
        is_host = False
        if not existing_host:
            await redis_client.set(host_key, str(user_id))
            is_host = True
            print(f"👑 [WS] Назначен новый хост: {user_id}")
        else:
            # Сравниваем как строки, чтобы избежать проблем с типами int/str
            is_host = (str(user_id) == str(existing_host))
            status_text = "👑 ХОСТ" if is_host else "👥 ГОСТЬ"
            print(f"👤 [WS] Подключился {status_text}: {user_id} (Сравнение: '{user_id}' == '{existing_host}' -> {is_host})")
        
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