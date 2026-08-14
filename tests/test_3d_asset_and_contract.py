import pytest
import urllib.parse
from proxy.asset_resolver import is_binary_3d_url, get_asset_failure_fallback
from proxy.runtime_policy import get_failure_fallback_response
from routes.proxy import guess_binary_content_type as routes_guess_type, is_binary_3d_url as routes_is_3d
from utils.proxy_rewriter import rewrite_html

def test_3d_binary_mime_types():
    assert routes_guess_type("https://example.com/model.wasm") == "application/wasm"
    assert routes_guess_type("https://example.com/texture.ktx2") == "image/ktx2"
    assert routes_guess_type("https://example.com/texture.basis") == "application/octet-stream"
    assert routes_guess_type("https://example.com/scene.exr") == "image/x-exr"
    assert routes_guess_type("https://example.com/scene.hdr") == "image/vnd.radiance"
    assert routes_guess_type("https://example.com/model.glb") == "model/gltf-binary"
    assert routes_guess_type("https://example.com/model.gltf") == "model/gltf+json"
    assert routes_guess_type("https://example.com/model.fbx") == "model/fbx"

def test_is_binary_3d_url():
    assert routes_is_3d("https://example.com/asset.glb") is True
    assert routes_is_3d("https://example.com/asset.wasm") is True
    assert routes_is_3d("https://example.com/asset.ktx2") is True
    assert routes_is_3d("https://example.com/asset.js") is False
    assert routes_is_3d("https://example.com/asset.css") is False

def test_3d_asset_failure_fallback_returns_explicit_error():
    fallback = get_asset_failure_fallback("https://example.com/model.glb", 404)
    assert fallback.status_code == 404
    assert fallback.headers.get("X-STAGE-Asset-Error") == "upstream-404"
    assert len(fallback.body) > 0  # not empty 204

    upstream_err = get_failure_fallback_response("https://example.com/model.wasm", "Connection timed out")
    assert upstream_err.status_code == 504
    assert upstream_err.headers.get("X-STAGE-Asset-Error") == "upstream-timeout"

def test_bootstrap_injects_canonical_contract():
    html = "<html><head></head><body></body></html>"
    rewritten = rewrite_html(
        html=html,
        session_id="session-abc",
        page_url="https://target.com/test",
        base_url="https://target.com",
        api_base="https://stage.api.com"
    )
    assert "window.STAGE.assetBase" in rewritten
    assert "window.STAGE.pageBase" in rewritten
    assert "buildStageAssetUrl" in rewritten
    assert "assertStageProxyContract" in rewritten
    assert "markCanvasContext" in rewritten
    assert "getCanvasContextType" in rewritten
    assert "webglcontextlost" in rewritten
    assert "webglcontextrestored" in rewritten

def test_stage_agent_asset_diagnostics_and_builder():
    with open("backend/static/stage-agent.js", "r", encoding="utf-8") as f:
        agent_code = f.read()
    assert "function buildStageAssetUrl(absoluteUrl)" in agent_code
    assert "function postAssetDiagnostic(url, status, mime, bytes, reason)" in agent_code
    assert "STAGE_DIAGNOSTIC" in agent_code
    assert "ASSET_FAILURE" in agent_code
    assert "buildStageAssetUrl(absoluteUrl)" in agent_code
