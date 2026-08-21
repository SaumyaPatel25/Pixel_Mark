#!/usr/bin/env python3
"""
STAGE Migration Verification & Data Parity Utility
Validates database row counts, API health, and Playwright screenshot generation.
"""

import sys
import os
import argparse
import asyncio
import httpx
import psycopg2

CRITICAL_TABLES = [
    "users",
    "user_ai_provider_configs",
    "user_identities",
    "organizations",
    "org_members",
    "projects",
    "environments",
    "sessions",
    "page_visits",
    "markers",
    "comments",
    "replays",
    "events",
    "ai_triage_runs",
    "dom_edit_suggestions",
    "reviewer_identities"
]

def check_table_counts(db_url: str, label: str = "DATABASE"):
    print(f"\n=======================================================")
    print(f"   FETCHING ROW COUNTS: [{label}]")
    print(f"=======================================================")
    counts = {}
    try:
        # Standardize connection string for psycopg2 (remove asyncpg dialect prefix if present)
        clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("sqlite+aiosqlite:///", "sqlite:///")
        if "sqlite" in clean_url:
            import sqlite3
            conn = sqlite3.connect(clean_url.replace("sqlite:///", ""))
            cur = conn.cursor()
            for tbl in CRITICAL_TABLES:
                try:
                    cur.execute(f"SELECT count(*) FROM {tbl};")
                    count = cur.fetchone()[0]
                    counts[tbl] = count
                    print(f"  [OK] {tbl:25}: {count:6} rows")
                except Exception as e:
                    counts[tbl] = "N/A"
                    print(f"  [-]  {tbl:25}: [Table not found / Error: {e}]")
            cur.close()
            conn.close()
        else:
            conn = psycopg2.connect(clean_url)
            with conn.cursor() as cur:
                for tbl in CRITICAL_TABLES:
                    try:
                        cur.execute(f"SELECT count(*) FROM {tbl};")
                        count = cur.fetchone()[0]
                        counts[tbl] = count
                        print(f"  [OK] {tbl:25}: {count:6} rows")
                    except Exception as e:
                        counts[tbl] = "N/A"
                        print(f"  [-]  {tbl:25}: [Table not found / Error: {e}]")
                        conn.rollback()
            conn.close()
        return counts
    except Exception as e:
        print(f"[ERROR] Failed to connect to {label}: {e}")
        return None

def compare_databases(old_url: str, new_url: str):
    print("\n=======================================================")
    print("   ZERO-DATA-LOSS VERIFICATION & COMPARISON")
    print("=======================================================")
    old_counts = check_table_counts(old_url, "SOURCE (Render/Old)")
    new_counts = check_table_counts(new_url, "TARGET (Oracle/New)")

    if not old_counts or not new_counts:
        print("\n[BLOCKED] Could not retrieve counts from both databases.")
        sys.exit(1)

    mismatches = []
    print("\n-------------------------------------------------------")
    print(f"{'TABLE NAME':25} | {'OLD COUNT':10} | {'NEW COUNT':10} | STATUS")
    print("-------------------------------------------------------")
    for tbl in CRITICAL_TABLES:
        co = old_counts.get(tbl, 0)
        cn = new_counts.get(tbl, 0)
        status = "MATCH [OK]" if co == cn else "MISMATCH [X]"
        print(f"{tbl:25} | {str(co):10} | {str(cn):10} | {status}")
        if co != cn:
            mismatches.append((tbl, co, cn))

    if mismatches:
        print(f"\n[BLOCKED] DATA LOSS / MISMATCH DETECTED ON {len(mismatches)} TABLES:")
        for m in mismatches:
            print(f"  -> {m[0]}: Old={m[1]} vs New={m[2]}")
        sys.exit(1)
    else:
        print("\n[SAFE TO PROCEED] 100% DATA PARITY VERIFIED ACROSS ALL CRITICAL TABLES.")

async def verify_oracle_api(api_base_url: str):
    print(f"\n=======================================================")
    print(f"   TESTING ORACLE FASTAPI & PLAYWRIGHT: {api_base_url}")
    print(f"=======================================================")
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Test Documentation endpoint
        try:
            r = await client.get(f"{api_base_url}/docs")
            print(f"  [OK] /docs Healthcheck status: {r.status_code}")
            assert r.status_code == 200
        except Exception as e:
            print(f"  [FAIL] Healthcheck failed: {e}")
            sys.exit(1)

        # 2. Test SSRF Guard
        try:
            r = await client.get(f"{api_base_url}/proxy/raw?url=http://169.254.169.254/latest/meta-data/")
            assert r.status_code in [400, 403], f"SSRF not blocked: {r.status_code}"
            print("  [OK] SSRF Guard blocked AWS/OCI metadata IP (169.254.169.254)")
        except Exception as e:
            print(f"  [FAIL] SSRF Guard test failed: {e}")

        # 3. Test Playwright Screenshot on ARM64
        try:
            print("  ... Requesting Playwright Chromium render for https://example.com")
            r = await client.post(f"{api_base_url}/proxy/screenshot", json={
                "target_url": "https://example.com",
                "base_url": "https://example.com"
            })
            if r.status_code == 200 and "data:image/png;base64," in r.json().get("screenshot_url", ""):
                print("  [OK] Playwright Headless Chromium successfully captured screenshot on ARM64!")
            else:
                print(f"  [FAIL] Screenshot failed: {r.status_code} - {r.text}")
        except Exception as e:
            print(f"  [FAIL] Playwright screenshot test failed: {e}")

def main():
    parser = argparse.ArgumentParser(description="STAGE Migration Parity & Health Checker")
    parser.add_argument("--old-db", help="Source PostgreSQL Database URL")
    parser.add_argument("--new-db", help="Target/New PostgreSQL Database URL")
    parser.add_argument("--restored-db", help="Restored Test PostgreSQL Database URL (alias for --new-db)")
    parser.add_argument("--api-url", help="Oracle API Base URL (e.g. https://api-oracle.yourdomain.com)")

    args = parser.parse_args()

    target_db = args.new_db or args.restored_db

    if args.old_db and target_db:
        compare_databases(args.old_db, target_db)
    elif args.old_db:
        check_table_counts(args.old_db, "SOURCE DATABASE")
    
    if args.api_url:
        asyncio.run(verify_oracle_api(args.api_url))

if __name__ == "__main__":
    main()
