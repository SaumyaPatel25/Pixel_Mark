import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text, inspect

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///./test.db"
else:
    # Ensure it keeps using asyncpg
    if "sslmode=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?")[0]

print(f"Connecting to database async: {DATABASE_URL}")

connect_args = {}
if "neon.tech" in DATABASE_URL:
    connect_args = {"ssl": True}

engine = create_async_engine(DATABASE_URL, connect_args=connect_args)

async def run_migration():
    async with engine.begin() as conn:
        # Check sessions columns
        def check_sessions(sync_conn):
            inspector = inspect(sync_conn)
            return [c["name"] for c in inspector.get_columns("sessions")]
        
        session_cols = await conn.run_sync(check_sessions)
        if "current_page_url" not in session_cols:
            print("Adding current_page_url to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN current_page_url VARCHAR NULL"))
        if "pages_visited" not in session_cols:
            print("Adding pages_visited to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN pages_visited INTEGER DEFAULT 0"))
        if "updated_at" not in session_cols:
            print("Adding updated_at to sessions table...")
            col_type = "TIMESTAMP WITH TIME ZONE" if "postgresql" in DATABASE_URL else "TIMESTAMP"
            await conn.execute(text(f"ALTER TABLE sessions ADD COLUMN updated_at {col_type} NULL"))
        if "renderer_type" not in session_cols:
            print("Adding renderer_type to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN renderer_type VARCHAR NULL"))
        if "heavy_mode" not in session_cols:
            print("Adding heavy_mode to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN heavy_mode BOOLEAN DEFAULT FALSE"))
        if "render_detected_at" not in session_cols:
            print("Adding render_detected_at to sessions table...")
            col_type = "TIMESTAMP WITH TIME ZONE" if "postgresql" in DATABASE_URL else "TIMESTAMP"
            await conn.execute(text(f"ALTER TABLE sessions ADD COLUMN render_detected_at {col_type} NULL"))
        if "canvas_count" not in session_cols:
            print("Adding canvas_count to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN canvas_count INTEGER NULL"))
        if "has_webgl" not in session_cols:
            print("Adding has_webgl to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN has_webgl BOOLEAN NULL"))
        if "has_three_js" not in session_cols:
            print("Adding has_three_js to sessions table...")
            await conn.execute(text("ALTER TABLE sessions ADD COLUMN has_three_js BOOLEAN NULL"))

        # Check if page_visits table exists
        def check_tables(sync_conn):
            inspector = inspect(sync_conn)
            return inspector.get_table_names()
            
        tables = await conn.run_sync(check_tables)
        if "page_visits" not in tables:
            print("Creating page_visits table...")
            if "postgresql" in DATABASE_URL:
                await conn.execute(text("""
                    CREATE TABLE page_visits (
                        id VARCHAR PRIMARY KEY,
                        session_id VARCHAR NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                        page_url VARCHAR NOT NULL,
                        page_title VARCHAR NULL,
                        visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        renderer_type VARCHAR NULL,
                        screenshot_url VARCHAR NULL,
                        metadata JSONB NULL
                    )
                """))
            else:
                await conn.execute(text("""
                    CREATE TABLE page_visits (
                        id VARCHAR PRIMARY KEY,
                        session_id VARCHAR NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                        page_url VARCHAR NOT NULL,
                        page_title VARCHAR NULL,
                        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        renderer_type VARCHAR NULL,
                        screenshot_url VARCHAR NULL,
                        metadata JSON NULL
                    )
                """))
            print("[OK] page_visits table created successfully!")
        else:
            # Check page_visits columns
            def check_page_visits(sync_conn):
                inspector = inspect(sync_conn)
                return [c["name"] for c in inspector.get_columns("page_visits")]
            
            pv_cols = await conn.run_sync(check_page_visits)
            if "metadata" not in pv_cols:
                print("Adding metadata to page_visits table...")
                col_type = "JSONB" if "postgresql" in DATABASE_URL else "JSON"
                await conn.execute(text(f"ALTER TABLE page_visits ADD COLUMN metadata {col_type} NULL"))

        # Check markers columns
        def check_markers(sync_conn):
            inspector = inspect(sync_conn)
            return [c["name"] for c in inspector.get_columns("markers")]
            
        marker_cols = await conn.run_sync(check_markers)
        if "page_url" not in marker_cols:
            print("Adding page_url to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN page_url VARCHAR NULL"))
        if "page_title" not in marker_cols:
            print("Adding page_title to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN page_title VARCHAR NULL"))
        if "renderer_type" not in marker_cols:
            print("Adding renderer_type to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN renderer_type VARCHAR NULL DEFAULT 'unknown'"))
        if "canvas_context" not in marker_cols:
            print("Adding canvas_context to markers table...")
            col_type = "JSONB" if "postgresql" in DATABASE_URL else "JSON"
            await conn.execute(text(f"ALTER TABLE markers ADD COLUMN canvas_context {col_type} NULL"))
        if "marker_number" not in marker_cols:
            print("Adding marker_number to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN marker_number INTEGER DEFAULT 0"))
        if "agent_version" not in marker_cols:
            print("Adding agent_version to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN agent_version VARCHAR NULL DEFAULT '1.0'"))
        if "page_visit_id" not in marker_cols:
            print("Adding page_visit_id to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN page_visit_id VARCHAR NULL REFERENCES page_visits(id) ON DELETE SET NULL"))
        if "updated_at" not in marker_cols:
            print("Adding updated_at to markers table...")
            col_type = "TIMESTAMP WITH TIME ZONE" if "postgresql" in DATABASE_URL else "TIMESTAMP"
            await conn.execute(text(f"ALTER TABLE markers ADD COLUMN updated_at {col_type} NULL"))
        if "is_inside_shadow_dom" not in marker_cols:
            print("Adding is_inside_shadow_dom to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN is_inside_shadow_dom BOOLEAN DEFAULT FALSE"))
        if "norm_x" not in marker_cols:
            print("Adding norm_x to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN norm_x FLOAT NULL"))
        if "norm_y" not in marker_cols:
            print("Adding norm_y to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN norm_y FLOAT NULL"))
        if "canvas_snapshot" not in marker_cols:
            print("Adding canvas_snapshot to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN canvas_snapshot TEXT NULL"))
        if "shadow_root_depth" not in marker_cols:
            print("Adding shadow_root_depth to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN shadow_root_depth INTEGER NULL"))
        if "shadow_host_tag" not in marker_cols:
            print("Adding shadow_host_tag to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN shadow_host_tag VARCHAR NULL"))
        if "shadow_host_id" not in marker_cols:
            print("Adding shadow_host_id to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN shadow_host_id VARCHAR NULL"))
        if "shadow_host_class_list" not in marker_cols:
            print("Adding shadow_host_class_list to markers table...")
            col_type = "JSONB" if "postgresql" in DATABASE_URL else "JSON"
            await conn.execute(text(f"ALTER TABLE markers ADD COLUMN shadow_host_class_list {col_type} NULL"))
        if "shadow_path" not in marker_cols:
            print("Adding shadow_path to markers table...")
            await conn.execute(text("ALTER TABLE markers ADD COLUMN shadow_path TEXT NULL"))

        # Check if audit_artifacts table exists
        if "audit_artifacts" not in tables:
            print("Creating audit_artifacts table...")
            if "postgresql" in DATABASE_URL:
                await conn.execute(text("""
                    CREATE TABLE audit_artifacts (
                        id VARCHAR PRIMARY KEY,
                        session_id VARCHAR NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                        page_visit_id VARCHAR NULL REFERENCES page_visits(id) ON DELETE SET NULL,
                        kind VARCHAR NOT NULL,
                        payload JSONB NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """))
            else:
                await conn.execute(text("""
                    CREATE TABLE audit_artifacts (
                        id VARCHAR PRIMARY KEY,
                        session_id VARCHAR NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                        page_visit_id VARCHAR NULL REFERENCES page_visits(id) ON DELETE SET NULL,
                        kind VARCHAR NOT NULL,
                        payload JSON NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
            print("[OK] audit_artifacts table created successfully!")

        # Safety Sequential Renumbering of markers to prevent unique constraint failures
        print("Renumbering existing markers sequentially per session...")
        sessions_res = await conn.execute(text("SELECT DISTINCT session_id FROM markers"))
        session_ids = [r[0] for r in sessions_res.fetchall()]
        for s_id in session_ids:
            markers_res = await conn.execute(
                text("SELECT id FROM markers WHERE session_id = :sid ORDER BY created_at ASC, id ASC"),
                {"sid": s_id}
            )
            marker_rows = markers_res.fetchall()
            for idx, row in enumerate(marker_rows, start=1):
                await conn.execute(
                    text("UPDATE markers SET marker_number = :num WHERE id = :mid"),
                    {"num": idx, "mid": row[0]}
                )
        print("[OK] Renumbering completed successfully!")

        # Create Database Indexes to speed up lookups (Safe for both Postgres and SQLite)
        print("Creating performance indexes...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_markers_session_id ON markers (session_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_markers_page_url ON markers (page_url)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_markers_page_visit_id ON markers (page_visit_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_markers_created_at ON markers (created_at)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits (session_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_page_visits_page_url ON page_visits (page_url)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_artifacts_session_id ON audit_artifacts (session_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_artifacts_page_visit_id ON audit_artifacts (page_visit_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_artifacts_created_at ON audit_artifacts (created_at)"))
        print("[OK] Indexes created successfully!")

        # Create Unique Index (serves as unique constraint on SQLite/PostgreSQL)
        print("Creating unique index uq_session_marker_number on markers...")
        # Check if the unique constraint or unique index already exists
        # In SQLite, CREATE UNIQUE INDEX IF NOT EXISTS is safe.
        # In PostgreSQL, CREATE UNIQUE INDEX IF NOT EXISTS is safe.
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_session_marker_number ON markers (session_id, marker_number)"))
        print("[OK] Unique constraint index created successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
    print("Migration completed successfully!")
