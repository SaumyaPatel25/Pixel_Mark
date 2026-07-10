import asyncio
import logging
import sys

from config import settings
from database import DATABASE_URL
from main import ALLOWED_ORIGINS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_selftest():
    logger.info("=== PixelMark Config Self-Test ===")
    
    # 1. Database
    dialect = DATABASE_URL.split(":")[0] if DATABASE_URL else "unknown"
    logger.info(f"Database dialect: {dialect}")
    if "neon.tech" in DATABASE_URL:
        logger.info("NeonDB production URL detected.")
    else:
        logger.info("Local/Fallback database detected.")

    # 2. CORS
    logger.info(f"CORS Allowed Origins: {ALLOWED_ORIGINS}")
    
    # 3. JWT Secret
    secret_len = len(settings.jwt_secret_key)
    logger.info(f"JWT Secret length: {secret_len} (default? {settings.jwt_secret_key == 'dev_secret_key_123'})")
    if secret_len < 16 and settings.environment == "production":
        logger.warning("JWT Secret is too short for production!")
        
    # 4. Environment
    logger.info(f"Environment: {settings.environment}")
    logger.info("=== Self-Test Complete ===")

if __name__ == "__main__":
    run_selftest()
