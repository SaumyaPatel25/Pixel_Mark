import time
import re
from typing import Any, Dict, Optional

class InMemoryCache:
    def __init__(self):
        # Storage: { key: { "value": Any, "expires_at": float } }
        self._store: Dict[str, Dict[str, Any]] = {}
        self.hits = 0
        self.misses = 0
        self.invalidations = 0

    def get(self, key: str) -> Optional[Any]:
        self._cleanup()
        entry = self._store.get(key)
        if entry:
            if entry["expires_at"] > time.time():
                self.hits += 1
                return entry["value"]
            else:
                del self._store[key]
        self.misses += 1
        return None

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        self._cleanup()
        self._store[key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds
        }

    def invalidate(self, pattern: str) -> None:
        """
        Invalidate cache entries using a simple wildcard/glob pattern.
        E.g., "user:123:*" or "*:projects:*"
        """
        regex_pattern = re.compile("^" + pattern.replace("*", ".*") + "$")
        keys_to_delete = [k for k in self._store.keys() if regex_pattern.match(k)]
        for k in keys_to_delete:
            del self._store[k]
        self.invalidations += len(keys_to_delete)

    def invalidate_user_keys(self, user_id: str) -> None:
        self.invalidate(f"user:{user_id}:*")

    def get_stats(self) -> Dict[str, int]:
        total = self.hits + self.misses
        hit_rate = int((self.hits / total) * 100) if total > 0 else 0
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate_pct": hit_rate,
            "invalidations": self.invalidations,
            "size": len(self._store)
        }

    def _cleanup(self) -> None:
        now = time.time()
        expired_keys = [k for k, v in self._store.items() if v["expires_at"] <= now]
        for k in expired_keys:
            del self._store[k]

cache = InMemoryCache()

# Global telemetry metrics for system observability (Task 10)
SYSTEM_METRICS = {
    "session_reuses": 0,
    "idle_closures": 0,
    "fallback_to_screenshot": 0
}
