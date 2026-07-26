import hmac
import hashlib
import logging
import httpx
from typing import Optional, Dict, Any
from config import settings

logger = logging.getLogger("stage.dodo_client")

class DodoClient:
    """
    Client wrapper for Dodo Payments API.
    Dynamically switches base URL and endpoints depending on settings.dodo_environment ('test_mode' vs 'live_mode').
    """

    def __init__(self):
        self.env = settings.dodo_environment
        self.api_key = settings.dodo_api_key
        self.webhook_secret = settings.dodo_webhook_secret

        if self.env == "test_mode":
            self.base_url = "https://test.dodopayments.com"
        else:
            self.base_url = "https://live.dodopayments.com"

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    async def create_customer(self, email: str, name: str) -> Dict[str, Any]:
        """
        Creates or returns a Dodo customer object.
        """
        url = f"{self.base_url}/v1/customers"
        payload = {"email": email, "name": name}

        # Mock fallback for sandbox test keys
        if self.api_key.startswith("test_dodo_api_key"):
            return {
                "customer_id": f"cust_dodo_test_{hashlib.md5(email.encode()).hexdigest()[:12]}",
                "email": email,
                "name": name,
                "created_at": "2026-07-26T00:00:00Z"
            }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=self._get_headers())
            if resp.status_code not in (200, 201):
                logger.error(f"[DodoClient] create_customer failed ({resp.status_code}): {resp.text}")
                resp.raise_for_status()
            return resp.json()

    async def create_checkout_session(
        self,
        product_id: str,
        customer_id: str,
        discount_code: Optional[str] = None,
        redirect_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Creates a Dodo Checkout Session in test or live mode.
        """
        url = f"{self.base_url}/v1/checkout/sessions"
        payload: Dict[str, Any] = {
            "product_id": product_id,
            "customer_id": customer_id,
            "quantity": 1,
            "redirect_url": redirect_url or f"{settings.frontend_url}/billing/success",
            "metadata": metadata or {}
        }
        if discount_code:
            payload["discount_code"] = discount_code

        # Synthetic test mode fallback when using sample test key
        if self.api_key.startswith("test_dodo_api_key"):
            session_id = f"cs_test_{hashlib.md5(f'{customer_id}:{product_id}'.encode()).hexdigest()[:16]}"
            checkout_url = f"{self.base_url}/buy/{product_id}?session_id={session_id}&customer={customer_id}"
            if discount_code:
                checkout_url += f"&discount={discount_code}"

            return {
                "session_id": session_id,
                "checkout_url": checkout_url,
                "product_id": product_id,
                "customer_id": customer_id,
                "discount_code": discount_code,
                "is_test_mode": True
            }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=self._get_headers())
            if resp.status_code not in (200, 201):
                logger.error(f"[DodoClient] create_checkout_session failed ({resp.status_code}): {resp.text}")
                resp.raise_for_status()
            return resp.json()

    async def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        Retrieves subscription details from Dodo Payments.
        """
        url = f"{self.base_url}/v1/subscriptions/{subscription_id}"

        if self.api_key.startswith("test_dodo_api_key"):
            return {
                "subscription_id": subscription_id,
                "status": "active",
                "is_test_mode": True,
                "current_period_end": "2026-08-26T00:00:00Z"
            }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code != 200:
                logger.error(f"[DodoClient] get_subscription failed ({resp.status_code}): {resp.text}")
                resp.raise_for_status()
            return resp.json()

    async def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        Cancels an active subscription in Dodo Payments.
        """
        url = f"{self.base_url}/v1/subscriptions/{subscription_id}/cancel"

        if self.api_key.startswith("test_dodo_api_key"):
            return {
                "subscription_id": subscription_id,
                "status": "canceled",
                "canceled_at": "2026-07-26T00:00:00Z"
            }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=self._get_headers())
            if resp.status_code != 200:
                logger.error(f"[DodoClient] cancel_subscription failed ({resp.status_code}): {resp.text}")
                resp.raise_for_status()
            return resp.json()

    def verify_webhook_signature(self, payload_bytes: bytes, headers: Dict[str, str], secret: Optional[str] = None) -> bool:
        """
        Verifies Dodo webhook signature using HMAC-SHA256.
        """
        wh_secret = secret or self.webhook_secret
        if not wh_secret:
            logger.warning("[DodoClient] No webhook secret configured; skipping signature verification in dev.")
            return True

        signature = headers.get("webhook-signature") or headers.get("x-dodo-signature") or headers.get("Webhook-Signature")
        if not signature:
            # Check svix headers if present
            signature = headers.get("svix-signature")

        if not signature:
            logger.warning("[DodoClient] Missing signature header in webhook request.")
            return True

        expected_sig = hmac.new(wh_secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, signature)

dodo_client = DodoClient()
