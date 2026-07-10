import asyncio
import traceback
import sys
import ssl
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Try 1: Original URL from .env
url_1 = "postgresql+asyncpg://neondb_owner:npg_nVHq5Eu9YNUT@ep-soft-fog-apo5qj7w-pooler.c-7.us-east-1.aws.neon.tech/neondb"

# Try 2: Non-pooler URL
url_2 = "postgresql+asyncpg://neondb_owner:npg_nVHq5Eu9YNUT@ep-soft-fog-apo5qj7w.us-east-1.aws.neon.tech/neondb"

# Try 3: URL with options parameter (explicit endpoint ID)
url_3 = "postgresql+asyncpg://neondb_owner:npg_nVHq5Eu9YNUT@ep-soft-fog-apo5qj7w-pooler.c-7.us-east-1.aws.neon.tech/neondb?options=-c%20project=ep-soft-fog-apo5qj7w"

def log(msg):
    print(msg, flush=True)
    sys.stdout.flush()

async def test_engine(name, url, connect_args):
    log(f"\n--- Testing Configuration: {name} ---")
    log(f"URL: {url}")
    log(f"Connect Args: {connect_args}")
    try:
        engine = create_async_engine(url, connect_args=connect_args)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            row = result.fetchone()
            log(f"SUCCESS {name}!")
            log(f"DB Version: {row[0]}")
            await engine.dispose()
            return True
    except Exception as e:
        log(f"FAILED {name}!")
        traceback.print_exc()
        return False

async def main():
    # 1. Test original with ssl='require'
    await test_engine("1. Original Pooler + ssl='require'", url_1, {"ssl": "require"})
    
    # 2. Test original with SSLContext (ssl=True)
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    await test_engine("2. Original Pooler + SSLContext", url_1, {"ssl": ssl_ctx})
    
    # 3. Test non-pooler with ssl='require'
    await test_engine("3. Non-pooler + ssl='require'", url_2, {"ssl": "require"})
    
    # 4. Test non-pooler with SSLContext
    await test_engine("4. Non-pooler + SSLContext", url_2, {"ssl": ssl_ctx})

    # 5. Test with options endpoint
    await test_engine("5. Endpoint project option + ssl='require'", url_3, {"ssl": "require"})

if __name__ == "__main__":
    asyncio.run(main())
