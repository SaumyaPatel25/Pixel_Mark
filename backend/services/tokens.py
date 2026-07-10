import secrets
import hashlib
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import AuthToken

def _generate_token() -> tuple[str, str]:
    raw   = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed

async def create_token(db: AsyncSession, user_id: str,
                       purpose: str, expires_minutes: int) -> str:
    raw, hashed = _generate_token()
    token = AuthToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=hashed,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=expires_minutes)
    )
    db.add(token)
    await db.commit()
    return raw  # only raw token goes to the user

async def consume_token(db: AsyncSession, raw: str,
                        purpose: str) -> AuthToken | None:
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    result = await db.execute(
        select(AuthToken).where(
            AuthToken.token_hash == hashed,
            AuthToken.purpose    == purpose,
            AuthToken.used_at    == None,
            AuthToken.expires_at >= datetime.utcnow()
        )
    )
    token = result.scalar_one_or_none()
    if token:
        token.used_at = datetime.utcnow()
        await db.commit()
    return token
