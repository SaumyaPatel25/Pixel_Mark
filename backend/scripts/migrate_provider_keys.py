import os
import sys
import asyncio
from cryptography.fernet import InvalidToken

# Adjust sys.path to run from backend directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import AsyncSessionLocal
from models.core import UserAIProviderConfig
from utils.encryption import encrypt_secret, _fernet
from sqlalchemy import select

async def migrate_keys():
    print("Starting AI Provider API key migration...")
    
    async with AsyncSessionLocal() as session:
        # Fetch all provider configs
        result = await session.execute(select(UserAIProviderConfig))
        configs = result.scalars().all()
        
        migrated_count = 0
        total_count = len(configs)
        
        for config in configs:
            if not config.encrypted_api_key:
                continue
                
            # Check if key is already encrypted
            is_encrypted = False
            try:
                # If decrypt succeeds, it is already encrypted
                _fernet.decrypt(config.encrypted_api_key.encode())
                is_encrypted = True
            except (InvalidToken, Exception):
                # Decryption failed; it must be legacy plaintext
                is_encrypted = False
                
            if not is_encrypted:
                # Encrypt in place
                raw_key = config.encrypted_api_key
                try:
                    encrypted_key = encrypt_secret(raw_key)
                    config.encrypted_api_key = encrypted_key
                    session.add(config)
                    migrated_count += 1
                    print(f"Migrated provider config ID {config.id} ({config.provider}) to encrypted storage.")
                except Exception as e:
                    print(f"Failed to encrypt config ID {config.id}: {e}")
                    
        if migrated_count > 0:
            await session.commit()
            
        print(f"Migration completed. Total configs checked: {total_count}. Configs migrated to encrypted at rest: {migrated_count}.")

if __name__ == "__main__":
    asyncio.run(migrate_keys())
