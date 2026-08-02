import sys
import os
import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from models import User, UserIdentity, Organization, OrgMember, Project
from services.identity_resolver import resolve_canonical_user

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session

@pytest.mark.asyncio
async def test_identity_resolution_same_email_multiple_providers(db_session: AsyncSession):
    test_email = f"canonical-{uuid.uuid4().hex[:8]}@example.com"

    # 1. Sign in via Google SSO
    user_google = await resolve_canonical_user(
        db=db_session,
        provider="google",
        provider_user_id="google-uid-101",
        email=test_email,
        name="Alex Dev",
        avatar_url="https://lh3.googleusercontent.com/avatar.jpg",
        email_verified=True
    )
    assert user_google is not None
    assert user_google.email == test_email
    canonical_id = user_google.id

    # 2. Sign in via GitHub OAuth with the SAME verified email
    user_github = await resolve_canonical_user(
        db=db_session,
        provider="github",
        provider_user_id="github-uid-202",
        email=test_email.upper(), # test case-insensitivity
        name="Alex Dev GitHub",
        avatar_url="https://avatars.githubusercontent.com/avatar.jpg",
        email_verified=True
    )
    assert user_github.id == canonical_id, "GitHub login must resolve to the exact same canonical User ID"

    # 3. Sign in via Email Link with the SAME verified email
    user_email_link = await resolve_canonical_user(
        db=db_session,
        provider="email_link",
        provider_user_id="firebase-uid-303",
        email=test_email,
        name="Alex Dev",
        email_verified=True
    )
    assert user_email_link.id == canonical_id, "Email Link login must resolve to the exact same canonical User ID"

    # 4. Verify user_identities contains all linked provider records for canonical_id
    identities_res = await db_session.execute(
        select(UserIdentity).where(UserIdentity.user_id == canonical_id)
    )
    identities = identities_res.scalars().all()
    providers = {i.provider for i in identities}
    assert "google" in providers
    assert "github" in providers
    assert "email_link" in providers

@pytest.mark.asyncio
async def test_user_data_survives_logout_and_relogin(db_session: AsyncSession):
    test_email = f"persisted-{uuid.uuid4().hex[:8]}@example.com"

    # 1. Register canonical user and create a project
    user = await resolve_canonical_user(
        db=db_session,
        provider="google",
        provider_user_id="google-uid-999",
        email=test_email,
        name="Persistent User",
        email_verified=True
    )
    canonical_id = user.id

    org_res = await db_session.execute(select(OrgMember).where(OrgMember.user_id == canonical_id))
    org_member = org_res.scalars().first()
    assert org_member is not None

    project = Project(
        id=str(uuid.uuid4()),
        org_id=org_member.org_id,
        name="Persistent Blueprint App",
        url="https://example.com"
    )
    db_session.add(project)

    # Save onboarding state
    user.onboarding_state_json = {"isCompleted": True, "isDismissed": True, "userRole": "developer"}
    db_session.add(user)
    await db_session.commit()

    # 2. Simulate session logout & re-login via GitHub with same email
    relogin_user = await resolve_canonical_user(
        db=db_session,
        provider="github",
        provider_user_id="github-uid-999",
        email=test_email,
        name="Persistent User",
        email_verified=True
    )
    assert relogin_user.id == canonical_id

    # Verify project still exists under canonical user's workspace
    project_res = await db_session.execute(select(Project).where(Project.org_id == org_member.org_id))
    projects = project_res.scalars().all()
    assert len(projects) == 1
    assert projects[0].name == "Persistent Blueprint App"

    # Verify onboarding state survived logout/relogin
    assert relogin_user.onboarding_state_json is not None
    assert relogin_user.onboarding_state_json.get("isCompleted") is True
