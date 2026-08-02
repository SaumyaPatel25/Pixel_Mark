import asyncio
import time
import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from database import AsyncSessionLocal
from models import User, Organization, OrgMember, Project, Session, CanvasFrame
from sqlalchemy import select

async def benchmark():
    print("[BENCHMARK] Running database query performance benchmark...")
    async with AsyncSessionLocal() as db:
        # Benchmark 1: Query OrgMember by user_id
        start = time.perf_counter()
        for _ in range(50):
            res = await db.execute(select(OrgMember).where(OrgMember.user_id == "non_existent_user_12345"))
            _ = res.scalars().all()
        elapsed_org_member = (time.perf_counter() - start) * 1000

        # Benchmark 2: Query Project by org_id
        start = time.perf_counter()
        for _ in range(50):
            res = await db.execute(select(Project).where(Project.org_id == "non_existent_org_12345"))
            _ = res.scalars().all()
        elapsed_project = (time.perf_counter() - start) * 1000

        # Benchmark 3: Query Session by project_id
        start = time.perf_counter()
        for _ in range(50):
            res = await db.execute(select(Session).where(Session.project_id == "non_existent_proj_12345"))
            _ = res.scalars().all()
        elapsed_session = (time.perf_counter() - start) * 1000

        # Benchmark 4: Query CanvasFrame by project_id
        start = time.perf_counter()
        for _ in range(50):
            res = await db.execute(select(CanvasFrame).where(CanvasFrame.project_id == "non_existent_proj_12345"))
            _ = res.scalars().all()
        elapsed_frame = (time.perf_counter() - start) * 1000

        print(f"50x OrgMember by user_id: {elapsed_org_member:.2f} ms")
        print(f"50x Project by org_id: {elapsed_project:.2f} ms")
        print(f"50x Session by project_id: {elapsed_session:.2f} ms")
        print(f"50x CanvasFrame by project_id: {elapsed_frame:.2f} ms")

if __name__ == "__main__":
    asyncio.run(benchmark())
