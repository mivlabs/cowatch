-- Каждый бэкенд-сервис использует свою собственную базу данных внутри
-- одного контейнера postgres (см. docker-compose.yml -> DATABASE_URL).
-- Раньше эти базы нигде не создавались, и auth/messages/rooms падали
-- на старте с "database "auth_db" does not exist" при первом запуске
-- на чистом volume. Этот скрипт выполняется автоматически один раз,
-- когда Postgres инициализирует пустой /var/lib/postgresql/data
-- (см. docker-entrypoint-initdb.d в образе postgres).
CREATE DATABASE auth_db;
CREATE DATABASE messages_db;
CREATE DATABASE rooms_db;
