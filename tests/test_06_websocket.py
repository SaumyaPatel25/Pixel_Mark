import websockets
import asyncio
import json
import pytest
import uuid

RAILWAY_URL = "https://pixelmark-production.up.railway.app"
RAILWAY_WS = RAILWAY_URL.replace("https://", "wss://")

async def test_websocket_connects():
    session_id = f"test-session-{uuid.uuid4().hex[:6]}"
    uri = f"{RAILWAY_WS}/ws/session/{session_id}"
    async with websockets.connect(uri) as websocket:
        assert websocket.open
        print(f"\nWebSocket Connect: PASS ({uri})")

async def test_websocket_broadcast_two_clients():
    session_id = f"test-session-{uuid.uuid4().hex[:6]}"
    uri = f"{RAILWAY_WS}/ws/session/{session_id}"
    
    async with websockets.connect(uri) as ws1, \
               websockets.connect(uri) as ws2:
        
        msg = {"type": "marker_created", "data": {"id": "m1", "title": "Test Broadcast"}}
        await ws1.send(json.dumps(msg))
        
        # ws2 should receive it
        response = await asyncio.wait_for(ws2.recv(), timeout=5.0)
        data = json.loads(response)
        assert data["type"] == "marker_created"
        assert data["data"]["id"] == "m1"
        print("WebSocket Broadcast (2 clients): PASS")

async def test_websocket_broadcast_three_clients():
    session_id = f"test-session-{uuid.uuid4().hex[:6]}"
    uri = f"{RAILWAY_WS}/ws/session/{session_id}"
    
    async with websockets.connect(uri) as ws1, \
               websockets.connect(uri) as ws2, \
               websockets.connect(uri) as ws3:
        
        msg = {"type": "ping", "data": "hello"}
        await ws1.send(json.dumps(msg))
        
        r2 = await asyncio.wait_for(ws2.recv(), timeout=5.0)
        r3 = await asyncio.wait_for(ws3.recv(), timeout=5.0)
        
        assert json.loads(r2)["type"] == "ping"
        assert json.loads(r3)["type"] == "ping"
        print("WebSocket Broadcast (3 clients): PASS")

async def test_websocket_different_sessions_isolated():
    session_a = f"session-A-{uuid.uuid4().hex[:4]}"
    session_b = f"session-B-{uuid.uuid4().hex[:4]}"
    
    uri_a = f"{RAILWAY_WS}/ws/session/{session_a}"
    uri_b = f"{RAILWAY_WS}/ws/session/{session_b}"
    
    async with websockets.connect(uri_a) as ws_a, \
               websockets.connect(uri_b) as ws_b:
        
        await ws_a.send(json.dumps({"type": "secret", "data": "A only"}))
        
        try:
            # ws_b should NOT receive it
            await asyncio.wait_for(ws_b.recv(), timeout=2.0)
            pytest.fail("ws_b received message from session_a!")
        except asyncio.TimeoutError:
            print("WebSocket Session Isolation: PASS")

async def test_websocket_json_message_types():
    session_id = f"test-types-{uuid.uuid4().hex[:6]}"
    uri = f"{RAILWAY_WS}/ws/session/{session_id}"
    
    async with websockets.connect(uri) as ws1, \
               websockets.connect(uri) as ws2:
        
        types = ["marker_created", "marker_updated", "marker_deleted", "ping"]
        for t in types:
            msg = {"type": t, "data": {}}
            await ws1.send(json.dumps(msg))
            resp = await asyncio.wait_for(ws2.recv(), timeout=2.0)
            assert json.loads(resp)["type"] == t
            
        print("WebSocket Message Types: PASS")

async def test_websocket_project_connects():
    project_id = f"{uuid.uuid4()}"
    uri = f"{RAILWAY_WS}/ws/{project_id}"
    async with websockets.connect(uri) as websocket:
        assert websocket.open
        print(f"\nWebSocket Project Connect: PASS ({uri})")

async def test_websocket_reconnect():
    session_id = f"test-reconnect-{uuid.uuid4().hex[:6]}"
    uri = f"{RAILWAY_WS}/ws/session/{session_id}"
    
    # Connect and disconnect
    async with websockets.connect(uri) as ws:
        assert ws.open
    
    # Reconnect
    async with websockets.connect(uri) as ws1, \
               websockets.connect(uri) as ws2:
        await ws1.send(json.dumps({"type": "after_reconnect"}))
        resp = await asyncio.wait_for(ws2.recv(), timeout=2.0)
        assert json.loads(resp)["type"] == "after_reconnect"
        
    print("WebSocket Reconnect: PASS")
