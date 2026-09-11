#!/usr/bin/env bash
# Прогоняет pytest для каждого сервиса отдельно.
#
# Почему не один `pytest tests/`: все сервисы называют свой корневой пакет
# `app` (services/<name>/app/...), поэтому им нужен разный PYTHONPATH.
# Конфтесты сами подчищают sys.modules/sys.path, но простой прогон по
# сервисам отдельными процессами надёжнее и ровно так же работает в CI.
#
# Использование:
#   ./scripts/test.sh                  # все сервисы
#   ./scripts/test.sh auth              # только auth
#
# Требует поднятых postgres + redis (см. docker-compose.yml) и переменные
# окружения TEST_AUTH_DATABASE_URL / TEST_ROOMS_DATABASE_URL /
# TEST_MESSAGES_DATABASE_URL / TEST_REDIS_URL, если дефолты (localhost:5432,
# localhost:6379) вам не подходят.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SERVICES=("auth" "rooms" "messages" "notifications" "recommendations")
if [[ $# -gt 0 ]]; then
  SERVICES=("$@")
fi

status=0
for svc in "${SERVICES[@]}"; do
  echo "=== pytest: ${svc} ==="
  if ! PYTHONPATH="services/${svc}" python3 -m pytest "tests/test_${svc}" -v; then
    status=1
  fi
done

exit "${status}"
