import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

from realtime.redis_broadcaster import RedisBroadcaster
from realtime.connection_manager import ConnectionManager
from redis.exceptions import ConnectionError, TimeoutError

@pytest.fixture
def mock_realtime_manager():
    manager = ConnectionManager()
    manager.broadcast_to_session_local = AsyncMock()
    return manager

@pytest.fixture
def broadcaster():
    b = RedisBroadcaster()
    b.redis_url = "redis://mock"
    return b

@pytest.mark.asyncio
async def test_publish_event_success(broadcaster, mock_realtime_manager):
    # Mock redis client
    mock_redis = AsyncMock()
    broadcaster.get_redis = AsyncMock(return_value=mock_redis)

    event = {
        "event_type": "marker_created",
        "session_id": "sess-1",
        "timestamp": "2023-01-01T00:00:00Z",
        "payload": {}
    }
    
    with patch("realtime.redis_broadcaster.realtime_manager", mock_realtime_manager):
        await broadcaster.publish_event("sess-1", event)

        # It should serialize and publish
        assert mock_redis.publish.call_count == 1
        args, _ = mock_redis.publish.call_args
        assert args[0] == "session:sess-1"
        payload = json.loads(args[1])
        assert payload["event_type"] == "marker_created"

        # Should NOT fall back to local broadcast since Redis succeeded
        assert mock_realtime_manager.broadcast_to_session_local.call_count == 0

@pytest.mark.asyncio
async def test_publish_event_fallback_redis_unreachable(broadcaster, mock_realtime_manager):
    # Mock redis client throwing ConnectionError
    mock_redis = AsyncMock()
    mock_redis.publish.side_effect = ConnectionError("Mock offline")
    broadcaster.get_redis = AsyncMock(return_value=mock_redis)

    event = {
        "event_type": "marker_created",
        "session_id": "sess-1",
        "timestamp": "2023-01-01T00:00:00Z",
        "payload": {}
    }
    
    with patch("realtime.redis_broadcaster.realtime_manager", mock_realtime_manager):
        await broadcaster.publish_event("sess-1", event)

        # It should try to publish
        assert mock_redis.publish.call_count == 1

        # Because it failed, it must fall back to local broadcast
        assert mock_realtime_manager.broadcast_to_session_local.call_count == 1
        args, _ = mock_realtime_manager.broadcast_to_session_local.call_args
        assert args[0] == "sess-1"
        assert args[1] == event

@pytest.mark.asyncio
async def test_subscribe_and_unsubscribe(broadcaster):
    assert "sess-1" not in broadcaster._active_sessions
    assert "sess-1" not in broadcaster._subscriptions

    # Test subscribe
    with patch.object(broadcaster, "_subscriber_loop", new_callable=AsyncMock) as mock_loop:
        broadcaster.subscribe_to_session("sess-1")
        assert "sess-1" in broadcaster._active_sessions
        assert "sess-1" in broadcaster._subscriptions
        task = broadcaster._subscriptions["sess-1"]
        
        # Test unsubscribe
        broadcaster.unsubscribe_from_session("sess-1")
        assert "sess-1" not in broadcaster._active_sessions
        assert "sess-1" not in broadcaster._subscriptions
        assert task.cancelled()

@pytest.mark.asyncio
async def test_subscriber_loop_receives_event(broadcaster, mock_realtime_manager):
    broadcaster._active_sessions.add("sess-1")
    
    # Mock redis pubsub
    mock_pubsub = AsyncMock()
    
    async def mock_listen():
        yield {"type": "message", "data": json.dumps({"event_type": "marker_created"})}
        # Then we simulate unsubscribing so the loop breaks
        broadcaster._active_sessions.remove("sess-1")
        yield {"type": "unsubscribe"}
        
    mock_pubsub.listen = mock_listen
    
    mock_redis = AsyncMock()
    mock_redis.pubsub.return_value = mock_pubsub
    broadcaster.get_redis = AsyncMock(return_value=mock_redis)
    
    with patch("realtime.redis_broadcaster.realtime_manager", mock_realtime_manager):
        await broadcaster._subscriber_loop("sess-1")
        
        # Should have forwarded the payload to local broadcast
        assert mock_realtime_manager.broadcast_to_session_local.call_count == 1
        args, _ = mock_realtime_manager.broadcast_to_session_local.call_args
        assert args[0] == "sess-1"
        assert args[1]["event_type"] == "marker_created"

@pytest.mark.asyncio
async def test_subscriber_loop_reconnect_backoff(broadcaster):
    broadcaster._active_sessions.add("sess-1")
    
    # We will simulate redis being None, then available
    # To test backoff without waiting, we patch asyncio.sleep
    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        call_count = 0
        async def mock_get_redis():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                return None
            
            # 3rd time it returns a working mock, but we immediately stop it
            mock_pubsub = AsyncMock()
            async def empty_listen():
                broadcaster._active_sessions.remove("sess-1")
                yield {"type": "message", "data": "{}"}
            mock_pubsub.listen = empty_listen
            mock_redis = AsyncMock()
            mock_redis.pubsub.return_value = mock_pubsub
            return mock_redis
            
        broadcaster.get_redis = mock_get_redis
        
        await broadcaster._subscriber_loop("sess-1")
        
        # It should have slept twice for backoff (1s, 2s)
        assert mock_sleep.call_count == 2
        assert mock_sleep.call_args_list[0][0][0] == 1
        assert mock_sleep.call_args_list[1][0][0] == 2
