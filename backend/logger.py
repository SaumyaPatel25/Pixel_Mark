import logging
import sys
from config import settings

class SecretFilter(logging.Filter):
    """
    Redacts sensitive information from logs.
    Targets sensitive tokens and any strings containing 'Bearer'.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        msg = str(record.msg)
        
        # Redact Bearer tokens (safety precaution)
        if "Bearer" in msg:
            import re
            msg = re.sub(r"Bearer\s+[a-zA-Z0-9\-\._~+/]+=*", "Bearer [REDACTED_TOKEN]", msg)

        record.msg = msg
        return True

def setup_logger():
    logger = logging.getLogger("stage")
    logger.setLevel(logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter('%(asctime)s | %(levelname)-8s | %(name)s | %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    handler.setFormatter(formatter)
    
    # Apply the secret filter
    handler.addFilter(SecretFilter())
    
    logger.addHandler(handler)
    return logger

logger = setup_logger()
