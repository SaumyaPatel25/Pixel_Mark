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

async def run_migration(target_conn=None):
    db_url_str = str(target_conn.engine.url) if target_conn else str(engine.url)
    is_postgres = ("postgresql" in db_url_str or "postgres" in db_url_str)
    ts_type = "TIMESTAMP WITH TIME ZONE" if is_postgres else "TIMESTAMP"
    json_type = "JSONB" if is_postgres else "JSON"

    async def _do_migrate(conn):
        # Helper to inspect columns for a table
        async def get_cols(table_name):
            def _inspect(sync_conn):
                inspector = inspect(sync_conn)
                if table_name not in inspector.get_table_names():
                    return []
                return [c["name"] for c in inspector.get_columns(table_name)]
            return await conn.run_sync(_inspect)

        # Helper to get all tables
        async def get_table_names():
            return await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())

        tables = await get_table_names()

        # 1. Projects columns
        if "projects" in tables:
            proj_cols = await get_cols("projects")
            if "status" not in proj_cols:
                print("Adding status to projects table...")
                await conn.execute(text("ALTER TABLE projects ADD COLUMN status VARCHAR DEFAULT 'active'"))
            if "soft_deleted_at" not in proj_cols:
                print("Adding soft_deleted_at to projects table...")
                await conn.execute(text(f"ALTER TABLE projects ADD COLUMN soft_deleted_at {ts_type} NULL"))
            if "allow_reviewer_dom_edit" not in proj_cols:
                print("Adding allow_reviewer_dom_edit to projects table...")
                bool_default = "TRUE" if is_postgres else "1"
                await conn.execute(text(f"ALTER TABLE projects ADD COLUMN allow_reviewer_dom_edit BOOLEAN DEFAULT {bool_default}"))
            if "sla_config" not in proj_cols:
                print("Adding sla_config to projects table...")
                await conn.execute(text(f"ALTER TABLE projects ADD COLUMN sla_config {json_type} NULL"))

        # 2. Subscriptions columns
        if "subscriptions" in tables:
            sub_cols = await get_cols("subscriptions")
            if "past_due_since" not in sub_cols:
                print("Adding past_due_since to subscriptions table...")
                await conn.execute(text(f"ALTER TABLE subscriptions ADD COLUMN past_due_since {ts_type} NULL"))
            if "is_test_mode" not in sub_cols:
                print("Adding is_test_mode to subscriptions table...")
                bool_default = "FALSE" if is_postgres else "0"
                await conn.execute(text(f"ALTER TABLE subscriptions ADD COLUMN is_test_mode BOOLEAN DEFAULT {bool_default}"))
            if "seats_allowed" not in sub_cols:
                print("Adding seats_allowed to subscriptions table...")
                await conn.execute(text("ALTER TABLE subscriptions ADD COLUMN seats_allowed INTEGER DEFAULT 1"))
            if "projects_allowed" not in sub_cols:
                print("Adding projects_allowed to subscriptions table...")
                await conn.execute(text("ALTER TABLE subscriptions ADD COLUMN projects_allowed INTEGER DEFAULT 1"))

        # 3. Notification Preferences columns
        if "notification_preferences" in tables:
            np_cols = await get_cols("notification_preferences")
            if "email_frequency" not in np_cols:
                print("Adding email_frequency to notification_preferences table...")
                await conn.execute(text("ALTER TABLE notification_preferences ADD COLUMN email_frequency VARCHAR DEFAULT 'digest_15m'"))
            if "notify_on_all_pins" not in np_cols:
                print("Adding notify_on_all_pins to notification_preferences table...")
                bool_false = "FALSE" if is_postgres else "0"
                await conn.execute(text(f"ALTER TABLE notification_preferences ADD COLUMN notify_on_all_pins BOOLEAN DEFAULT {bool_false}"))
            if "notify_on_assigned" not in np_cols:
                print("Adding notify_on_assigned to notification_preferences table...")
                bool_true = "TRUE" if is_postgres else "1"
                await conn.execute(text(f"ALTER TABLE notification_preferences ADD COLUMN notify_on_assigned BOOLEAN DEFAULT {bool_true}"))
            if "notify_on_mentions" not in np_cols:
                print("Adding notify_on_mentions to notification_preferences table...")
                bool_true = "TRUE" if is_postgres else "1"
                await conn.execute(text(f"ALTER TABLE notification_preferences ADD COLUMN notify_on_mentions BOOLEAN DEFAULT {bool_true}"))
            if "notify_on_status_change" not in np_cols:
                print("Adding notify_on_status_change to notification_preferences table...")
                bool_true = "TRUE" if is_postgres else "1"
                await conn.execute(text(f"ALTER TABLE notification_preferences ADD COLUMN notify_on_status_change BOOLEAN DEFAULT {bool_true}"))

        # 4. Organizations columns
        if "organizations" in tables:
            org_cols = await get_cols("organizations")
            if "is_internal" not in org_cols:
                print("Adding is_internal column to organizations...")
                bool_false = "FALSE" if is_postgres else "0"
                await conn.execute(text(f"ALTER TABLE organizations ADD COLUMN is_internal BOOLEAN DEFAULT {bool_false}"))

        # 5. Sessions columns
        if "sessions" in tables:
            session_cols = await get_cols("sessions")
            if "current_page_url" not in session_cols:
                print("Adding current_page_url to sessions table...")
                await conn.execute(text("ALTER TABLE sessions ADD COLUMN current_page_url VARCHAR NULL"))
            if "pages_visited" not in session_cols:
                print("Adding pages_visited to sessions table...")
                await conn.execute(text("ALTER TABLE sessions ADD COLUMN pages_visited INTEGER DEFAULT 0"))
            if "updated_at" not in session_cols:
                print("Adding updated_at to sessions table...")
                await conn.execute(text(f"ALTER TABLE sessions ADD COLUMN updated_at {ts_type} NULL"))
            if "renderer_type" not in session_cols:
                print("Adding renderer_type to sessions table...")
                await conn.execute(text("ALTER TABLE sessions ADD COLUMN renderer_type VARCHAR NULL"))
            if "heavy_mode" not in session_cols:
                print("Adding heavy_mode to sessions table...")
                bool_false = "FALSE" if is_postgres else "0"
                await conn.execute(text(f"ALTER TABLE sessions ADD COLUMN heavy_mode BOOLEAN DEFAULT {bool_false}"))
            if "render_detected_at" not in session_cols:
                print("Adding render_detected_at to sessions table...")
                await conn.execute(text(f"ALTER TABLE sessions ADD COLUMN render_detected_at {ts_type} NULL"))
            if "canvas_count" not in session_cols:
                print("Adding canvas_count to sessions table...")
                await conn.execute(text("ALTER TABLE sessions ADD COLUMN canvas_count INTEGER NULL"))
            if "has_webgl" not in session_cols:
                print("Adding has_webgl to sessions table...")
                await conn.execute(text("ALTER TABLE sessions ADD COLUMN has_webgl BOOLEAN NULL"))
            if "has_three_js" not in session_cols:
                print("Adding has_three_js to sessions table...")
                await conn.execute(text("ALTER TABLE sessions ADD COLUMN has_three_js BOOLEAN NULL"))

        # 6. Page visits table
        if "page_visits" not in tables:
            print("Creating page_visits table...")
            if is_postgres:
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
            pv_cols = await get_cols("page_visits")
            if "metadata" not in pv_cols:
                print("Adding metadata to page_visits table...")
                await conn.execute(text(f"ALTER TABLE page_visits ADD COLUMN metadata {json_type} NULL"))

        # 7. Markers columns
        if "markers" in tables:
            marker_cols = await get_cols("markers")
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
                await conn.execute(text(f"ALTER TABLE markers ADD COLUMN canvas_context {json_type} NULL"))
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
                await conn.execute(text(f"ALTER TABLE markers ADD COLUMN updated_at {ts_type} NULL"))
            if "is_inside_shadow_dom" not in marker_cols:
                print("Adding is_inside_shadow_dom to markers table...")
                bool_false = "FALSE" if is_postgres else "0"
                await conn.execute(text(f"ALTER TABLE markers ADD COLUMN is_inside_shadow_dom BOOLEAN DEFAULT {bool_false}"))
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
                await conn.execute(text(f"ALTER TABLE markers ADD COLUMN shadow_host_class_list {json_type} NULL"))
            if "shadow_path" not in marker_cols:
                print("Adding shadow_path to markers table...")
                await conn.execute(text("ALTER TABLE markers ADD COLUMN shadow_path TEXT NULL"))

        # 8. Audit artifacts table
        if "audit_artifacts" not in tables:
            print("Creating audit_artifacts table...")
            if is_postgres:
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

        # 9. Org invites table
        if "org_invites" not in tables:
            print("Creating org_invites table...")
            await conn.execute(text(f"""
                CREATE TABLE org_invites (
                    id VARCHAR PRIMARY KEY,
                    org_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    role VARCHAR NOT NULL DEFAULT 'developer',
                    max_uses INTEGER NOT NULL DEFAULT 5,
                    current_use_count INTEGER NOT NULL DEFAULT 0,
                    expires_at {ts_type} NULL,
                    password_hash VARCHAR NULL,
                    created_by VARCHAR NOT NULL REFERENCES users(id),
                    revoked_at {ts_type} NULL,
                    created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("[OK] org_invites table created successfully!")

        # 10. Performance Indexes
        if "markers" in tables:
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_markers_session_id ON markers (session_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_markers_page_url ON markers (page_url)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_markers_page_visit_id ON markers (page_visit_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_markers_created_at ON markers (created_at)"))
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_session_marker_number ON markers (session_id, marker_number)"))
        if "page_visits" in tables:
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits (session_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_page_visits_page_url ON page_visits (page_url)"))
        if "sessions" in tables:
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at)"))
        if "audit_artifacts" in tables:
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_artifacts_session_id ON audit_artifacts (session_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_artifacts_page_visit_id ON audit_artifacts (page_visit_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_artifacts_created_at ON audit_artifacts (created_at)"))

    if target_conn:
        await _do_migrate(target_conn)
    else:
        async with engine.begin() as conn:
            await _do_migrate(conn)

if __name__ == "__main__":
    asyncio.run(run_migration())
    print("Migration completed successfully!")
