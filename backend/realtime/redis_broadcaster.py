import asyncio
import json
import logging
from typing import Dict, Any

from redis import asyncio as aioredis
from redis.exceptions import ConnectionError, TimeoutError

from config import settings
from realtime.connection_manager import realtime_manager

logger = logging.getLogger("stage.realtime")

class RedisBroadcaster:
    def __init__(self):
        self.redis_url = settings.redis_url
        self.pool = None
        self.redis = None
        self._subscriptions: Dict[str, asyncio.Task] = {}
        self._active_sessions = set()
        
    async def connect(self):
        if not self.pool:
            # We don't fail hard if Redis is down initially, we just warn.
            try:
                self.pool = aioredis.ConnectionPool.from_url(
                    self.redis_url, 
                    decode_responses=True,
                    health_check_interval=30
                )
                self.redis = aioredis.Redis(connection_pool=self.pool)
                await self.redis.ping()
                logger.info("[WS-Redis] Connected to Redis pub/sub backbone.")
            except Exception as e:
                logger.warning(f"[WS-Redis] Redis unavailable at boot: {e}. Running in single-instance degraded mode.")
                self.redis = None

    async def get_redis(self):
        if not self.redis:
            await self.connect()
        return self.redis

    async def publish_event(self, session_id: str, event: dict):
        """
        Publishes an event to the Redis channel for the given session.
        If Redis is unreachable, falls back to direct local broadcast (degraded mode).
        NOTE: In a healthy state, we publish to Redis AND let the local subscriber pick it up
        and broadcast it locally. This avoids double-delivery while ensuring horizontal sync.
        """
        # Ensure event is serializable via the schema
        from realtime.events import EventEnvelope
        try:
            payload = EventEnvelope.model_validate(event).model_dump(mode="json")
            payload_str = json.dumps(payload)
        except Exception as e:
            logger.error(f"[WS-Redis] Event serialization failed during publish: {e}")
            return

        redis = await self.get_redis()
        if redis:
            try:
                await redis.publish(f"session:{session_id}", payload_str)
                return
            except (ConnectionError, TimeoutError) as e:
                logger.warning(f"[WS-Redis] Publish failed (unreachable): {e}. Falling back to local broadcast.")
                self.redis = None # reset to trigger reconnect next time
            except Exception as e:
                logger.error(f"[WS-Redis] Publish error: {e}. Falling back to local broadcast.")

        # Degraded fallback: just broadcast locally
        await realtime_manager.broadcast_to_session_local(session_id, event)

    def subscribe_to_session(self, session_id: str):
        if session_id in self._subscriptions:
            return # already subscribed locally

        self._active_sessions.add(session_id)
        task = asyncio.create_task(self._subscriber_loop(session_id))
        self._subscriptions[session_id] = task

    def unsubscribe_from_session(self, session_id: str):
        if session_id in self._active_sessions:
            self._active_sessions.remove(session_id)

        task = self._subscriptions.pop(session_id, None)
        if task:
            task.cancel()

    async def _subscriber_loop(self, session_id: str):
        channel_name = f"session:{session_id}"
        backoff = 1

        while session_id in self._active_sessions:
            redis = await self.get_redis()
            if not redis:
                await asyncio.sleep(min(backoff, 30))
                backoff *= 2
                continue
                
            pubsub = None
            try:
                pubsub = redis.pubsub()
                await pubsub.subscribe(channel_name)
                logger.info(f"[WS-Redis] Subscribed to {channel_name}")
                backoff = 1 # reset backoff
                
                async for message in pubsub.listen():
                    if session_id not in self._active_sessions:
                        break # exit cleanly if we unsubscribed
                        
                    if message['type'] == 'message':
                        try:
                            payload = json.loads(message['data'])
                            # We received an event from Redis. Now broadcast it to our LOCAL websocket clients.
                            # The origin instance also receives its own event this way.
                            await realtime_manager.broadcast_to_session_local(session_id, payload)
                        except json.JSONDecodeError:
                            logger.error(f"[WS-Redis] Malformed JSON payload on {channel_name}")
                        except Exception as e:
                            logger.error(f"[WS-Redis] Error processing incoming message: {e}")
                            
            except (ConnectionError, TimeoutError) as e:
                logger.warning(f"[WS-Redis] Subscription to {channel_name} dropped: {e}. Retrying in {min(backoff, 30)}s")
                self.redis = None # Trigger reconnect
                await asyncio.sleep(min(backoff, 30))
                backoff *= 2
            except asyncio.CancelledError:
                logger.info(f"[WS-Redis] Subscription to {channel_name} cancelled locally")
                break
            except Exception as e:
                logger.error(f"[WS-Redis] Subscription loop error for {channel_name}: {e}")
                await asyncio.sleep(min(backoff, 30))
                backoff *= 2
            finally:
                # Clean up pubsub if loop restarted or exited
                try:
                    if pubsub:
                        await pubsub.unsubscribe(channel_name)
                        await pubsub.close()
                except:
                    pass

        logger.info(f"[WS-Redis] Unsubscribed from {channel_name}")

    async def get_redis_health(self) -> dict:
        redis = await self.get_redis()
        is_connected = False
        if redis:
            try:
                await redis.ping()
                is_connected = True
            except:
                pass
        
        return {
            "redis_connected": is_connected,
            "active_local_sessions": len(self._active_sessions),
            "active_subscriptions": len(self._subscriptions)
        }

redis_broadcaster = RedisBroadcaster()
