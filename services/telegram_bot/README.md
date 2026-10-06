# Telegram-бот и Mini App CoWatch

Бот — отдельный сервис на Python 3.11 и [aiogram 3](https://docs.aiogram.dev/). Mini App живёт
во фронтенде по адресу `/tg` (`frontend/src/telegram`) и открывается внутри Telegram.

## Что умеет

| Где | Что |
|---|---|
| `/start` | Приветствие и кнопка «Открыть CoWatch» (web_app). `/start ABC234` — карточка комнаты из deep link |
| `/new название` | Создаёт комнату от имени автора сообщения, отвечает кодом и кнопками «Открыть», «Пригласить друзей», «Скопировать код». Работает и в группах |
| `/join КОД`, любой текст с кодом или ссылкой | Карточка комнаты и кнопка «Открыть комнату» |
| `/profile` | Наклейки, фильмы, часы в зале, кнопка в профиль Mini App |
| Inline: `@бот ABC234` | Приглашение в комнату в любом чате (нужен `/setinline` в BotFather) |
| Кнопка меню | Открывает Mini App, ставится самим ботом при старте |
| Уведомления | `room.joined` → хосту «такой-то зашёл в комнату»; `achievement.granted` → «новая наклейка». Только тем, кто заходил через Telegram |

Как бот действует от имени пользователя: auth отдаёт JWT по `telegram_id` через внутренний
эндпоинт `POST /internal/telegram/token` (общий секрет `INTERNAL_API_SECRET`), дальше бот ходит
в публичный API rooms с этим токеном — ровно как сайт. Mini App логинится сама:
`POST /auth/telegram` с `Telegram.WebApp.initData`, auth проверяет подпись токеном бота.

## Переменные окружения

| Переменная | Обязательно | Что это |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | да | Токен от @BotFather. Тот же токен нужен сервису **auth** — он проверяет подпись initData |
| `INTERNAL_API_SECRET` | да | Совпадает со значением у auth и notifications, не короче 16 символов |
| `AUTH_SERVICE_URL` | | По умолчанию `http://auth:8000` (docker-compose). На Railway — публичный URL auth |
| `ROOMS_SERVICE_URL` | | По умолчанию `http://rooms:8000` |
| `MINI_APP_URL` | | Адрес Mini App, по умолчанию `https://cowatch.fun/tg` |
| `SITE_URL` | | `https://cowatch.fun` |
| `RABBITMQ_URL` | | Без него бот работает только на команды, уведомлений не будет |
| `WEBHOOK_URL` | | Публичный адрес сервиса. Задан — вебхук на `/telegram/webhook`, не задан — long polling |
| `WEBHOOK_SECRET` | | Секрет заголовка `X-Telegram-Bot-Api-Secret-Token` для вебхука |
| `PORT` | | Порт `/health` (и вебхука), по умолчанию 8000 |

Секреты не хранятся в репозитории: локально — в `.env` (он в `.gitignore`), на Railway — в Variables сервиса.

## Настройка в BotFather

1. `/newbot` — создать бота, сохранить токен.
2. `/mybots` → бот → **Bot Settings** → **Configure Mini App** → **Enable Mini App** → URL `https://cowatch.fun/tg`.
   После этого работают ссылки `t.me/<бот>?startapp=КОД`, которые бот и Mini App рассылают как приглашения.
3. `/setinline` → выбрать бота → подсказка, например `код комнаты`. Это включает `@бот ABC234`.
4. Кнопку меню и список команд бот выставляет сам при каждом старте (`configure_bot` в `app/main.py`).

## Локальный запуск

```bash
# .env рядом с docker-compose.yml: TELEGRAM_BOT_TOKEN=..., INTERNAL_API_SECRET=...
docker compose --profile telegram up -d telegram_bot
```

Сервис вынесен в compose-профиль `telegram`, чтобы без токена остальной проект поднимался как раньше.
Mini App локально: `npm run dev` во `frontend/`, страница `http://localhost:5173/tg` вне Telegram показывает
заглушку со ссылкой на бота — initData есть только внутри Telegram. Для разработки интерфейса подойдёт
`?tgWebAppMock=1` (см. `frontend/src/lib/telegram.ts`), а настоящий вход проверяется через туннель
(например, `cloudflared tunnel --url http://localhost:5173`) и `MINI_APP_URL` на адрес туннеля.

## Тесты

```bash
PYTHONPATH=services/telegram_bot python -m pytest tests/test_telegram_bot
```

Сеть не нужна: Telegram и сервисы CoWatch заменены фейками. Проверка подписи initData
тестируется на стороне auth (`tests/test_auth/test_telegram.py`).
