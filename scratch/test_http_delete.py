import sys
import os
import requests

# Set local base url for the running app
BASE_URL = "http://127.0.0.1:8765"

# Ensure backend is in PYTHONPATH to import database utilities
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "OneDrive", "Desktop", "Entrext", "backend"))

import asyncio
from database import AsyncSessionLocal
from models import Marker
from sqlalchemy import select

async def get_test_marker():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Marker).limit(1))
        marker = res.scalar_one_or_none()
        if marker:
            return marker.id, marker.session_id
        return None, None

def run_test():
    # 1. Fetch marker info directly from DB
    marker_id, session_id = asyncio.run(get_test_marker())
    if not marker_id:
        print("No markers found in database.")
        return

    print(f"Testing real HTTP delete for Marker ID: {marker_id}, Session ID: {session_id}")

    # 2. Get session markers before deletion
    resp_before = requests.get(f"{BASE_URL}/markers/session/{session_id}")
    print(f"GET session markers before delete status: {resp_before.status_code}")
    if resp_before.status_code == 200:
        markers_before = [m["id"] for m in resp_before.json()]
        print(f"Is marker in list before? {marker_id in markers_before}")

    # 3. Call DELETE
    resp_delete = requests.delete(f"{BASE_URL}/markers/{marker_id}")
    print(f"DELETE status: {resp_delete.status_code}")
    if resp_delete.status_code == 200:
        print(f"DELETE response: {resp_delete.json()}")
    else:
        print(f"DELETE failed: {resp_delete.text}")

    # 4. Get session markers after deletion
    resp_after = requests.get(f"{BASE_URL}/markers/session/{session_id}")
    print(f"GET session markers after delete status: {resp_after.status_code}")
    if resp_after.status_code == 200:
        markers_after = [m["id"] for m in resp_after.json()]
        print(f"Is marker in list after? {marker_id in markers_after}")

    # 5. Get feedback list after deletion
    resp_feedback = requests.get(f"{BASE_URL}/sessions/{session_id}/feedback")
    print(f"GET feedback status: {resp_feedback.status_code}")
    if resp_feedback.status_code == 200:
        feedback_after = [f["id"] for f in resp_feedback.json().get("items", [])]
        print(f"Is marker in feedback list after? {marker_id in feedback_after}")

if __name__ == "__main__":
    run_test()
