# CoWatch (cowatch.fun)

Платформа для совместного просмотра фильмов и сериалов с друзьями в реальном времени.

## Концепция
Создайте комнату, пригласите друзей по короткой ссылке, выберите фильм из каталога TMDB — и смотрите вместе с синхронизированным воспроизведением и live-чатом.

## Архитектура
Микросервисная архитектура на Python 3.11 + FastAPI:
- **Auth Service** (порт 8001): регистрация, JWT токены, OAuth2
- **Messages Service** (порт 8002): live-чат в комнате через WebSocket + Redis Pub/Sub
- **Rooms Service** (порт 8003): управление комнатами, участниками, состоянием
- **Video Sync Service** (порт 8005): синхронизация воспроизведения между клиентами
- **Catalog Service** (порт 8006): интеграция с TMDB API
- **Gateway** (порт 8000): единая точка входа, JWT валидация, роутинг

## Стек
- Backend: Python 3.11, FastAPI, SQLAlchemy 2.0 (async)
- БД: PostgreSQL 16 (asyncpg)
- Кэш/Real-time: Redis 7 (Pub/Sub, sessions)
- Очереди: RabbitMQ 3 (для фоновых задач)
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Инфра: Docker Compose, GitHub Actions

## Ключевые фичи
- Real-time синхронизация видео между участниками (NTP-like sync)
- Масштабируемый WebSocket через Redis Pub/Sub
- Каталог фильмов через TMDB API
- Приватные комнаты по коротким ссылкам
- Live-чат с реакциями во время просмотра
- Система ролей (host/guest)

## Быстрый старт
1. Убедись что Docker Desktop запущен
2. Запусти инфраструктуру:
   docker-compose up -d
3. Проверь статус:
   docker-compose ps