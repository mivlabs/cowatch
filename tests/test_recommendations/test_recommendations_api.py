import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert body["model_loaded"] is False  # MODEL_DIR — пустой tmpdir на каждый тест


@pytest.mark.asyncio
async def test_recommendations_without_trained_model_returns_503(client):
    resp = await client.get("/recommendations/1")
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_model_info_without_trained_model_returns_404(client):
    resp = await client.get("/admin/model-info")
    assert resp.status_code == 404
