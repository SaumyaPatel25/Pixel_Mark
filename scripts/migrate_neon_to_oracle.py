"""
STAGE Comprehensive Database Migration Script: Source DB -> Oracle Cloud PostgreSQL
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, text
from database import Base

# Import all model modules to register all SQLAlchemy models
import models.core
import models.notifications
import models.webhooks
import models.share_link
import models.marketing
import markers.models


async def migrate_data():
    source_url = os.getenv("SOURCE_DATABASE_URL", "sqlite+aiosqlite:///./backend/test.db")
    target_url = os.getenv("TARGET_DATABASE_URL")

    if not target_url:
        print("❌ Error: TARGET_DATABASE_URL environment variable is required!")
        sys.exit(1)

    print(f"🔄 Source DB: {source_url.split('@')[-1] if '@' in source_url else source_url}")
    print(f"🔄 Target Oracle DB: {target_url.split('@')[-1] if '@' in target_url else target_url}")

    source_engine = create_async_engine(source_url, echo=False)
    target_engine = create_async_engine(target_url, echo=False)

    print("🏗️ Creating tables on Oracle PostgreSQL...")
    async with target_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SourceSession = async_sessionmaker(source_engine, expire_on_commit=False, class_=AsyncSession)
    TargetSession = async_sessionmaker(target_engine, expire_on_commit=False, class_=AsyncSession)

    # Get all registered SQLAlchemy models dynamically
    all_models = [mapper.class_ for mapper in Base.registry.mappers]
    print(f"📋 Discovered {len(all_models)} registered model tables.")

    async with SourceSession() as src_db, TargetSession() as tgt_db:
        # Disable FK constraints during bulk migration
        try:
            await tgt_db.execute(text("SET session_replication_role = 'replica';"))
        except Exception:
            pass

        for model in all_models:
            model_name = model.__name__
            try:
                result = await src_db.execute(select(model))
                records = result.scalars().all()
                if not records:
                    print(f"  ℹ️ {model_name}: 0 records in source.")
                    continue

                print(f"  📦 Migrating {len(records)} records for {model_name}...")
                for rec in records:
                    await tgt_db.merge(rec)
                await tgt_db.commit()
                print(f"  ✅ {model_name}: Successfully migrated {len(records)} records.")
            except Exception as e:
                await tgt_db.rollback()
                print(f"  ⚠️ Skipping {model_name} due to migration error: {e}")

        try:
            await tgt_db.execute(text("SET session_replication_role = 'origin';"))
            await tgt_db.commit()
        except Exception:
            pass

    print("\n🎉 Comprehensive Migration to Oracle Cloud PostgreSQL complete!")

if __name__ == "__main__":
    asyncio.run(migrate_data())
