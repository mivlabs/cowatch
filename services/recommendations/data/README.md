# Демонстрационные данные

`sample_content.csv` и `sample_watch_events.csv` — **синтетические** данные
для локальной разработки, юнит-тестов и `ml/train.py --sample`, когда нет
доступа к боевой Postgres (rooms_db) или TMDB API.

Это не выгрузка из прод-БД CoWatch. Структура (`content_id`, `title`, `genres`,
`overview`, `user_id`, `joined_at`) совпадает с реальными таблицами
(`app/models/content.py`, `app/models/interaction.py`), но конкретные фильмы и
пользователи придуманы, чтобы можно было честно тестировать pipeline без
доступа к чужим персональным данным.

Реальные данные сервис получает только через `POST /admin/sync-watch-events`
(ETL из `rooms_db`, см. `app/services/etl.py`) — на живом сервере эти CSV
не читаются никогда.
