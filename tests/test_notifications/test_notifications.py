import pytest


@pytest.mark.skip(
    reason=(
        "notifications-сервис ещё не реализован (services/notifications/app/main.py "
        "пустой, FastAPI-приложения там нет) — тесты добавим вместе с реализацией."
    )
)
def test_notifications_service_not_implemented_yet():
    ...
