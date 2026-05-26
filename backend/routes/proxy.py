from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse
import httpx

router = APIRouter(prefix="/proxy", tags=["proxy"])

@router.get("/")
async def proxy_url(url: str):
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(url)
            return Response(content=resp.content, media_type=resp.headers.get("content-type", "text/html"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
