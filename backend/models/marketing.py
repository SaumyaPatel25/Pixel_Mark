"""
backend/models/marketing.py

SQLAlchemy 2.0 models for marketing landing page analytics and user inquiries.
Tracks signup CTA clicks and contact query submissions.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func

try:
    from backend.db.base import Base
except ImportError:
    from database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class LandingCtaClick(Base):
    __tablename__ = "landing_cta_clicks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    cta_id = Column(String(64), nullable=False, index=True)  # e.g., 'hero_signup_cta', 'client_toggle_cta'
    target_role = Column(String(32), nullable=True, default="client")  # 'client' | 'developer' | 'general'
    page_url = Column(String(256), nullable=True)
    referrer = Column(String(256), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(256), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, index=True)


class LandingQuery(Base):
    __tablename__ = "landing_queries"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(128), nullable=False)
    email = Column(String(256), nullable=False, index=True)
    role = Column(String(32), nullable=True, default="client")  # 'client' | 'developer' | 'agency' | 'other'
    subject = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="pending", index=True)  # 'pending' | 'processed' | 'contacted'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, index=True)
