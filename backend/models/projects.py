"""
backend/models/projects.py

SQLAlchemy 2.0 model and SLA configuration definitions for Projects.
Re-exports canonical Project model from core to ensure single declarative registry.
"""

from typing import Optional, Dict, Any
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import JSONB

try:
    from backend.models.core import Project, ProjectModel, Environment, CanvasFrame, CanvasFlow
except ImportError:
    from models.core import Project, ProjectModel, Environment, CanvasFrame, CanvasFlow

__all__ = [
    "Project",
    "ProjectModel",
    "Environment",
    "CanvasFrame",
    "CanvasFlow",
]
