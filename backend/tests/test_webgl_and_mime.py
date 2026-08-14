import pytest
from utils.proxy_rewriter import rewrite_html, inject_webgl_patch, inject_offscreen_canvas_patch
from routes.proxy import MIME_TYPE_MAP, get_mime_type, guess_binary_content_type

def test_webgl_patch_injection():
    html = "<html><head><title>3D Canvas</title></head><body><canvas id='c'></canvas></body></html>"
    rewritten = rewrite_html(
        html=html,
        session_id="test-session-123",
        page_url="https://example.com/3d",
        base_url="https://example.com",
        api_base="http://localhost:8765",
        conservative_render_mode=True
    )
    assert "preserveDrawingBuffer" in rewritten
    assert "STAGE_WEBGL_CONTEXT_LOST" in rewritten
    assert "STAGE_WEBGL_CONTEXT_RESTORED" in rewritten
    assert "OffscreenCanvas" in rewritten
    assert "window.getCanvasContextType" in rewritten

def test_mime_type_mappings():
    assert get_mime_type("https://example.com/model.glb") == "model/gltf-binary"
    assert get_mime_type("https://example.com/model.gltf") == "model/gltf+json"
    assert get_mime_type("https://example.com/mesh.obj") == "model/obj"
    assert get_mime_type("https://example.com/texture.ktx2") == "image/ktx2"
    assert get_mime_type("https://example.com/environment.hdr") == "image/vnd.radiance"
    assert get_mime_type("https://example.com/shader.wgsl") == "text/wgsl"
    assert get_mime_type("https://example.com/engine.wasm") == "application/wasm"
    assert get_mime_type("https://example.com/font.woff2") == "font/woff2"

def test_guess_binary_content_type():
    assert guess_binary_content_type("https://example.com/scene.glb") == "model/gltf-binary"
    assert guess_binary_content_type("https://example.com/texture.exr") == "image/x-exr"
