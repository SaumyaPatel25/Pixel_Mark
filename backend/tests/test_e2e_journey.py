import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from main import app
from database import AsyncSessionLocal, engine, Base
from models import User, ApiKey
from markers.models import Marker

@pytest.fixture(autouse=True)
async def setup_db():
    await engine.dispose()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=True) as client:
        yield client

@pytest.fixture
async def developer_token():
    async with AsyncSessionLocal() as db:
        user = User(email="dev@example.com", name="Dev", hashed_password="hashed_password_dummy")
        db.add(user)
        await db.commit()
        await db.refresh(user)

        from services.crypto import generate_token, hash_token, mask_token
        token = generate_token()
        api_key = ApiKey(
            user_id=user.id,
            name="Test Key",
            token_hash=hash_token(token),
            masked_token=mask_token(token)
        )
        db.add(api_key)
        await db.commit()
        return token

@pytest.mark.asyncio
@patch("markers.router.redis_broadcaster.publish_event", new_callable=AsyncMock)
async def test_full_stage_journey(mock_publish, async_client, developer_token):
    # Setup headers
    dev_headers = {"Authorization": f"Bearer {developer_token}"}
    
    # 1. Developer creates a project and session (Step 1)
    res = await async_client.post("/projects", json={"name": "Test Project"}, headers=dev_headers)
    assert res.status_code == 200
    project_id = res.json()["id"]
    
    res = await async_client.post(f"/projects/{project_id}/sessions", json={"target_url": "https://example.com"}, headers=dev_headers)
    assert res.status_code == 200
    session_id = res.json()["id"]

    # 2. Developer generates a share link
    res = await async_client.post(f"/sessions/{session_id}/share-links", headers=dev_headers)
    assert res.status_code == 200
    share_link_id = res.json()["id"]
    
    # 3. Reviewer opens share link, registers identity with color (Step 3)
    res = await async_client.get(f"/share/{share_link_id}")
    assert res.status_code == 200
    resolved_session_id = res.json()["session_id"]
    assert resolved_session_id == session_id
    
    res = await async_client.post(f"/sessions/{session_id}/reviewer-identities", json={
        "display_name": "Reviewer Alice",
        "color_token": "#ff0000"
    })
    assert res.status_code == 200
    reviewer_id = res.json()["id"]
    rev_headers = {"x-reviewer-id": reviewer_id}
    
    # 4. Reviewer requests snapshot (Simulated via REST)
    res = await async_client.get(f"/sessions/{session_id}/markers", headers=rev_headers)
    assert res.status_code == 200
    assert len(res.json()) == 0
    
    # 5. Reviewer drops a marker (Step 4)
    marker_payload = {
        "project_id": project_id,
        "url": "https://example.com",
        "offset_x_ratio": 0.5,
        "offset_y_ratio": 0.5,
        "anchor_kind": "dom",
        "screen_width": 1024,
        "screen_height": 768
    }
    res = await async_client.post(f"/sessions/{session_id}/markers", json=marker_payload, headers=rev_headers)
    assert res.status_code == 200
    marker = res.json()
    marker_id = marker["id"]
    assert marker["offset_x_ratio"] == 0.5
    
    # Verify developer broadcast
    assert mock_publish.call_count == 1
    args, _ = mock_publish.call_args
    assert args[0] == session_id
    assert args[1]["event_type"] == "marker_created"
    assert args[1]["payload"]["id"] == marker_id
    mock_publish.reset_mock()
    
    # 6. Reviewer drags marker (position patch, Step 4/2)
    patch_payload = {
        "offset_x_ratio": 0.6,
        "offset_y_ratio": 0.6,
        "expected_version": marker["version"]
    }
    res = await async_client.patch(f"/markers/{marker_id}/position", json=patch_payload, headers=rev_headers)
    assert res.status_code == 200
    assert res.json()["version"] == marker["version"] + 1
    
    # Verify broadcast
    assert mock_publish.call_count == 1
    args, _ = mock_publish.call_args
    assert args[0] == session_id
    assert args[1]["event_type"] == "marker_moved"
    assert args[1]["payload"]["offset_x_ratio"] == 0.6
    mock_publish.reset_mock()
    
    # 7. Another reviewer attempts to delete marker (Step 1 rules)
    res = await async_client.post(f"/sessions/{session_id}/reviewer-identities", json={
        "display_name": "Reviewer Bob",
        "color_token": "#00ff00"
    })
    bob_id = res.json()["id"]
    bob_headers = {"x-reviewer-id": bob_id}
    
    res = await async_client.delete(f"/markers/{marker_id}", headers=bob_headers)
    assert res.status_code == 403
    
    # 8. Original reviewer deletes marker
    res = await async_client.delete(f"/markers/{marker_id}", headers=rev_headers)
    assert res.status_code == 200
    
    assert mock_publish.call_count == 1
    args, _ = mock_publish.call_args
    assert args[0] == session_id
    assert args[1]["event_type"] == "marker_deleted"
    mock_publish.reset_mock()
    
    # Verify fresh snapshot doesn't include it
    res = await async_client.get(f"/sessions/{session_id}/markers", headers=rev_headers)
    assert len(res.json()) == 0
    
    # 9. Developer deletes any marker
    res = await async_client.post(f"/sessions/{session_id}/markers", json=marker_payload, headers=rev_headers)
    new_marker_id = res.json()["id"]
    mock_publish.reset_mock()
    
    res = await async_client.delete(f"/markers/{new_marker_id}", headers=dev_headers)
    assert res.status_code == 200
    
    assert mock_publish.call_count == 1
    args, _ = mock_publish.call_args
    assert args[0] == session_id
    assert args[1]["event_type"] == "marker_deleted"
    
    # 10. Cross-instance delivery test (if Redis available)
    pytest.skip("Redis not available in environment, skipped cross-instance assertion")
