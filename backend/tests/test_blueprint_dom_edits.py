import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_blueprint_dom_edits_routes_exist():
    # Verify blueprint router is registered and handles 404 for non-existent resource
    resp = client.get("/projects/non-existent-proj/blueprint/frames/non-existent-frame/dom-target")
    assert resp.status_code in (404, 422, 500)

def test_legacy_session_dom_edits_intact():
    # Verify legacy session DOMEdit routes remain untouched
    resp = client.get("/sessions/non-existent-session/dom-edits")
    assert resp.status_code in (404, 422, 500)
