import pytest
from starlette.testclient import TestClient


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy", "service": "messages"}


def test_websocket_broadcast(sync_app):
    with TestClient(sync_app) as tc:
        with tc.websocket_connect("/messages/ws/1") as ws1:
            # Подключение рассылается всем активным соединениям, включая самого себя.
            joined = ws1.receive_text()
            assert "подключ" in joined

            with tc.websocket_connect("/messages/ws/1") as ws2:
                # Второй клиент тоже получает свой собственный join-бродкаст —
                # его нужно вычитать, иначе он перепутается с чат-сообщением ниже.
                assert "подключ" in ws2.receive_text()
                assert "подключ" in ws1.receive_text()

                ws2.send_text("привет из канала 1")
                # Оба клиента должны получить бродкаст с сообщением.
                assert "привет из канала 1" in ws1.receive_text()
                assert "привет из канала 1" in ws2.receive_text()
