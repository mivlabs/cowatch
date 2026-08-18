<div align="center">

# CoWatch

Сервис для совместного просмотра видео с друзьями: общий плеер, синхронизация play/pause/seek, чат и реакции в реальном времени.

**[cowatch.fun](https://cowatch.fun)** · [Быстрый старт](#быстрый-старт) · [Возможности](#возможности) · [Архитектура](#архитектура) · [Планы](#планы)

<br />

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## Демо

Проект уже развёрнут и доступен по адресу **[https://cowatch.fun](https://cowatch.fun)**.

> **Для пользователей из России:** сайт может не открываться или работать нестабильно без VPN. Это ограничение связано с доступностью хостинга и внешних сервисов, а не с блокировкой со стороны проекта.

Можно создать комнату, отправить другу 6-буквенный код и смотреть YouTube, Rutube, Vimeo или прямую ссылку на видео вместе.

---

## Возможности

| | |
|---|---|
| **Синхронный плеер** | Воспроизведение, пауза и перемотка синхронизируются у всех участников через WebSocket |
| **Разные источники** | YouTube, Rutube, Vimeo, прямые ссылки на видеофайлы |
| **Чат** | Сообщения в комнате во время просмотра |
| **Реакции** | Эмодзи поверх видео |
| **Роли host / guest** | Управление плеером и смена видео только у хоста |
| **Гостевой вход** | Можно зайти с ником без регистрации |
| **Регистрация** | Email, пароль, JWT |
| **Комнаты** | Приватные комнаты по коду, до 50 участников |
| **Real-time** | Redis Pub/Sub для рассылки событий |

---

## Как пользоваться

1. Зайди на [cowatch.fun](https://cowatch.fun) или подними проект локально.
2. Создай комнату или введи код приглашения.
3. Хост вставляет ссылку на видео. Остальные участники видят тот же ролик в том же месте таймлайна.

У гостей плеер синхронизирован с хостом, чат открывается сразу после входа в комнату.

---

## Архитектура

Бэкенд разбит на микросервисы. События в комнатах (чат, видео, реакции) идут через WebSocket и Redis Pub/Sub.

```mermaid
flowchart TB
    subgraph Client["Frontend (React + Vite)"]
        UI[RoomPage / VideoPlayer]
        WS_CLIENT[WebSocket Client]
    end

    subgraph Backend["Backend (FastAPI)"]
        AUTH["Auth Service :8001"]
        ROOMS["Rooms Service :8003"]
        MSG["Messages Service :8002"]
    end

    subgraph Infra["Инфраструктура"]
        PG[(PostgreSQL 16)]
        REDIS[(Redis 7)]
        RMQ[(RabbitMQ 3)]
    end

    UI --> AUTH
    UI --> ROOMS
    WS_CLIENT <-->|"ws://rooms/ws/{code}"| ROOMS
    AUTH --> PG
    ROOMS --> PG
    ROOMS --> REDIS
    MSG --> PG
    MSG --> REDIS
```

### Стек

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, React Query, React Router, React Player

**Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Redis, JWT

**Инфра:** Docker Compose

---

## Быстрый старт

Нужны Docker Desktop, Node.js 20+ и Git.

### 1. Клонировать репозиторий

```bash
git clone https://github.com/your-username/cowatch.git
cd cowatch
```

### 2. Запустить сервисы

```bash
docker-compose up -d postgres redis
docker-compose up -d auth rooms
```

Проверка:

```bash
curl http://localhost:8001/health
curl http://localhost:8003/health
```

### 3. Запустить фронтенд

```bash
cd frontend
npm install
npm run dev
```

Фронтенд будет на [http://localhost:5173](http://localhost:5173).

### Переменные окружения

Файл `frontend/.env` (если нужен):

```env
VITE_AUTH_URL=http://localhost:8001
VITE_API_URL=http://localhost:8003
VITE_WS_URL=ws://localhost:8003
```

---

## Структура проекта

```
cowatch/
├── frontend/           # React SPA
├── services/
│   ├── auth/         # Регистрация, логин, гостевой JWT
│   ├── rooms/        # Комнаты, WebSocket, синхронизация видео
│   └── messages/     # Сервис сообщений
├── docker-compose.yml
└── README.md
```

---

## API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/auth/register` | Регистрация |
| `POST` | `/auth/login` | Вход |
| `POST` | `/auth/guest?username=…` | Гостевой вход |
| `POST` | `/rooms/` | Создать комнату |
| `GET` | `/rooms/{code}` | Получить комнату |
| `PATCH` | `/rooms/{code}/video` | Сменить видео (только хост) |
| `WS` | `/rooms/ws/{code}?token=…` | Чат, видео-события, реакции |

Типы WebSocket-событий: `chat_message`, `video_play`, `video_pause`, `video_seek`, `video_changed`, `video_reaction`, `connected`, `system`.

---

## Планы

- Личный кабинет с достижениями и историей просмотра
- Публичные комнаты
- Поиск фильмов и сериалов прямо в интерфейсе
- Мобильная версия сайта или отдельное приложение
- API Gateway как единая точка входа
- Уведомления при приглашении в комнату
- Более точная синхронизация с учётом сетевой задержки

---

## Вклад в проект

Pull request'ы и issue приветствуются. Перед PR стоит описать задачу в issue и проверить сборку: `npm run build`.

---

## Лицензия

MIT
