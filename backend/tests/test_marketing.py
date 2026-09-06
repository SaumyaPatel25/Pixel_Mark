"""
backend/tests/test_marketing.py

Unit and integration tests for STAGE marketing endpoints:
1. CTA Click Tracking:
   - Validates CTA click records are persisted to DB with ip_address, user_agent, target_role, page_url.
   - Validates CTA stats endpoint aggregates counts by cta_id and role.
2. Contact Query Submission:
   - Validates user inquiries are saved to DB with status "pending".
   - Verifies email delivery triggers to saumya@entrext.com with proper template and sender data.
   - Validates input validation (rejects invalid email, too short message, etc.).
"""

import os
import sys
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy import select
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from dependencies import get_db
from main import app
from models.marketing import LandingCtaClick, LandingQuery

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio
async def test_cta_click_tracking_persists_to_db():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "cta_id": "hero_signup_cta",
            "target_role": "client",
            "page_url": "https://stage.entrext.com",
            "referrer": "https://google.com"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 TestBrowser",
            "X-Forwarded-For": "203.0.113.195"
        }
        response = await client.post("/marketing/cta-click", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["cta_id"] == "hero_signup_cta"
        assert data["target_role"] == "client"

    # Verify directly in DB
    async with TestingSessionLocal() as db:
        res = await db.execute(select(LandingCtaClick).where(LandingCtaClick.cta_id == "hero_signup_cta"))
        click = res.scalar_one_or_none()
        assert click is not None
        assert click.target_role == "client"
        assert click.ip_address == "203.0.113.195"
        assert click.user_agent == "Mozilla/5.0 TestBrowser"


@pytest.mark.asyncio
async def test_cta_stats_aggregation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Send several CTA clicks
        await client.post("/marketing/cta-click", json={"cta_id": "client_toggle_cta", "target_role": "client"})
        await client.post("/marketing/cta-click", json={"cta_id": "client_toggle_cta", "target_role": "client"})
        await client.post("/marketing/cta-click", json={"cta_id": "dev_toggle_cta", "target_role": "developer"})
        await client.post("/marketing/cta-click", json={"cta_id": "free_plan_signup", "target_role": "general"})

        stats_resp = await client.get("/marketing/cta-stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["total_clicks"] >= 4
        assert stats["by_cta"]["client_toggle_cta"] == 2
        assert stats["by_cta"]["dev_toggle_cta"] == 1
        assert stats["by_role"]["developer"] == 1
        assert len(stats["recent_clicks"]) >= 4


@pytest.mark.asyncio
async def test_contact_query_submission_and_email_alert():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        query_payload = {
            "name": "Sarah Jenkins",
            "email": "sarah@designstudio.co",
            "role": "client",
            "subject": "Question about live website review with external clients",
            "message": "We have 15 client projects launching this quarter. Does STAGE support custom domains and zero-install client comments?"
        }

        with patch("routes.marketing.send_email_wrapper") as mock_send_email:
            response = await client.post("/marketing/contact-query", json=query_payload)
            assert response.status_code == 201
            data = response.json()
            assert data["success"] is True
            assert "Thank you" in data["message"]

            # Verify email dispatch parameters
            mock_send_email.assert_called_once()
            kwargs = mock_send_email.call_args.kwargs
            subject_arg = kwargs.get("subject", "")
            to_arg = kwargs.get("to", "")
            html_arg = kwargs.get("html", "")

            assert to_arg == "saumya@entrext.com"
            assert "Sarah Jenkins" in subject_arg
            assert "Client" in subject_arg
            assert "sarah@designstudio.co" in html_arg
            assert "zero-install client comments" in html_arg

    # Verify query stored in database
    async with TestingSessionLocal() as db:
        res = await db.execute(select(LandingQuery).where(LandingQuery.email == "sarah@designstudio.co"))
        query_record = res.scalar_one_or_none()
        assert query_record is not None
        assert query_record.name == "Sarah Jenkins"
        assert query_record.role == "client"
        assert query_record.status == "pending"


@pytest.mark.asyncio
async def test_contact_query_validation_errors():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Invalid email
        res1 = await client.post("/marketing/contact-query", json={
            "name": "Alex",
            "email": "invalid-email-address",
            "subject": "Hi",
            "message": "Hello there testing"
        })
        assert res1.status_code == 422

        # Message too short
        res2 = await client.post("/marketing/contact-query", json={
            "name": "Alex",
            "email": "alex@test.com",
            "subject": "Hi",
            "message": "Hi"
        })
        assert res2.status_code == 422
