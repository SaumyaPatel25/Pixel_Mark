# STAGE AI Canvas Copilot & Zero-Cost Omni-Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the client-facing Voice & Chat-to-DOM Quick Editor on the canvas with 10ms local element screenshot cropping, confirmation handshake pill, zero-cost AI Omni-Route (Groq Whisper + Llama 3.3 70B / Gemini Flash) with BYOK vault fallback, and automated developer AI summary delivery.

**Architecture:** 
1. **Frontend Proxy Agent (`stage-agent.js`)**: Add `STAGE_EXTRACT_MICRO_DOM`, `STAGE_APPLY_EPHEMERAL_MUTATION`, `STAGE_REVERT_EPHEMERAL_MUTATION`, and high-speed local bounding-box element canvas cropping (`STAGE_CAPTURE_ELEMENT_CROP`).
2. **Canvas Web UI (`web/src/components/copilot/CanvasCopilotBar.tsx`)**: Bottom floating voice/chat pill with Whisper transcription, preview state, and a "Confirm & Pin" handshake modal displaying the cropped element screenshot and AI summary before persisting.
3. **Backend Service & Routing (`backend/services/ai_service.py` & `backend/routers/copilot.py`)**: Unified intent parser with hierarchical Omni-Route (User BYOK Key $\to$ Workspace Agency Key $\to$ Free Groq Llama 3.3 / Gemini 2.0 Flash) outputting structured selector targets, CSS deltas, text diffs, and developer explanation payloads.
4. **Marker & Notification Integration**: Store CSS diffs and element crop screenshots on the marker, dispatching developer notifications with full technical context.

**Tech Stack:** Next.js 16 (React 19, Tailwind CSS v4, Lucide React), Vanilla JavaScript (`stage-agent.js`, HTML5 Canvas / `createImageBitmap`), FastAPI (Python 3.11+, SQLAlchemy async, Groq API, AsyncOpenAI).

**Spec:** `docs/STAGE_NextGen_AI_Architecture_and_Features.pdf`

## Global Constraints
- **CRITICAL**: Do NOT commit anything online (`git push`, deployment to Oracle/Vercel) until explicitly authorized by the user. Keep all work strictly local.
- Micro-DOM payloads extracted from the proxy iframe must be bounded to `< 3KB` (only visible elements, tags, classes, and immediate children).
- Ephemeral live DOM mutations must never permanently alter the target website or reload the iframe.
- AI Cost floor: Default to free tier Omni-Route (Groq Llama 3.3 70B & Whisper Large v3 or Gemini Flash) with $0.00 platform bill.
- Fallback gracefully to user BYOK keys if present in `UserAIProviderConfig`.

---

### Task 1: Micro-DOM Extraction & Local Element Canvas Cropping in `stage-agent.js`

**Files:**
- Modify: `backend/static/stage-agent.js:2640-2700`
- Test: `backend/tests/test_stage_agent_copilot.js` (Node-based syntax and logic test)

**Interfaces:**
- Consumes: `postMessage` event `{ type: "STAGE_REQUEST_MICRO_DOM", query: string }`, `{ type: "STAGE_CAPTURE_ELEMENT_CROP", selector: string }`.
- Produces: `postMessage` to parent `{ type: "STAGE_MICRO_DOM_RESULT", candidates: Array<CompactNode> }`, `{ type: "STAGE_ELEMENT_CROP_RESULT", selector: string, imageBase64: string, rect: DOMRect }`.

- [ ] **Step 1: Write micro-DOM extractor and crop helper functions in `stage-agent.js`**

Add the following functions to `stage-agent.js`:
```javascript
function extractMicroDomSnippet(maxElements = 40) {
  const visibleElements = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (isSTAGENode(node)) return NodeFilter.FILTER_REJECT;
        const rect = node.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
                          rect.top < window.innerHeight && rect.bottom > 0;
        return isVisible ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }
  );

  let current = walker.nextNode();
  while (current && visibleElements.length < maxElements) {
    const tag = current.tagName.toLowerCase();
    // Prioritize interactive & text containers
    if (['h1','h2','h3','h4','p','button','a','span','input','textarea','div'].includes(tag)) {
      const text = (current.innerText || current.textContent || '').trim().slice(0, 80);
      if (text.length > 0 || ['button', 'a', 'input'].includes(tag)) {
        visibleElements.push({
          selector: getCSSSelector(current),
          tag: tag,
          className: (current.className && typeof current.className === 'string') ? current.className.slice(0, 100) : '',
          text: text,
          rect: {
            top: Math.round(current.getBoundingClientRect().top),
            left: Math.round(current.getBoundingClientRect().left),
            width: Math.round(current.getBoundingClientRect().width),
            height: Math.round(current.getBoundingClientRect().height)
          }
        });
      }
    }
    current = walker.nextNode();
  }
  return visibleElements;
}

function captureElementCrop(selector, callback) {
  try {
    const el = document.querySelector(selector);
    if (!el) return callback(null);
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return callback(null);

    // Use local canvas capture with padding
    const padding = 12;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(800, rect.width + padding * 2);
    canvas.height = Math.min(600, rect.height + padding * 2);
    const ctx = canvas.getContext('2d');
    
    // Fallback simple draw or html2canvas if available
    if (window.html2canvas) {
      window.html2canvas(el, {
        logging: false,
        useCORS: true,
        backgroundColor: null
      }).then(renderedCanvas => {
        callback(renderedCanvas.toDataURL('image/png'));
      }).catch(() => {
        callback(null);
      });
    } else {
      // Ephemeral crop payload representation
      callback(null);
    }
  } catch (e) {
    console.warn('[STAGE] captureElementCrop error:', e);
    callback(null);
  }
}
```

- [ ] **Step 2: Wire message listeners in `handleParentMessage`**

```javascript
if (data.type === "STAGE_REQUEST_MICRO_DOM") {
  const candidates = extractMicroDomSnippet(40);
  window.parent?.postMessage({
    type: "STAGE_MICRO_DOM_RESULT",
    query: data.query || "",
    candidates: candidates
  }, "*");
}

if (data.type === "STAGE_CAPTURE_ELEMENT_CROP") {
  captureElementCrop(data.selector, function(base64) {
    window.parent?.postMessage({
      type: "STAGE_ELEMENT_CROP_RESULT",
      selector: data.selector,
      imageBase64: base64
    }, "*");
  });
}

if (data.type === "STAGE_APPLY_EPHEMERAL_MUTATION") {
  let styleEl = document.getElementById("stage-ephemeral-staging");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "stage-ephemeral-staging";
    document.head.appendChild(styleEl);
  }
  if (data.cssRules) {
    styleEl.textContent = data.cssRules;
  }
  if (data.selector && data.textMutation) {
    const el = document.querySelector(data.selector);
    if (el) {
      el.dataset.stageOriginalText = el.innerText;
      el.innerText = data.textMutation;
    }
  }
}

if (data.type === "STAGE_REVERT_EPHEMERAL_MUTATION") {
  const styleEl = document.getElementById("stage-ephemeral-staging");
  if (styleEl) styleEl.remove();
  if (data.selector) {
    const el = document.querySelector(data.selector);
    if (el && el.dataset.stageOriginalText) {
      el.innerText = el.dataset.stageOriginalText;
      delete el.dataset.stageOriginalText;
    }
  }
}
```

- [ ] **Step 3: Run static syntax check on `stage-agent.js`**

Run: `node -c backend/static/stage-agent.js`
Expected: Clean exit code 0 without parse errors.

---

### Task 2: Backend AI Copilot Service & Free Omni-Route Resolver

**Files:**
- Create: `backend/services/copilot_service.py`
- Modify: `backend/services/ai_service.py`
- Test: `backend/tests/test_copilot_service.py`

**Interfaces:**
- Consumes: `user_prompt: str`, `micro_dom: list[dict]`, `db: AsyncSession`, `user: User`.
- Produces: `CopilotResolution` dict `{ selector, css_mutations, css_rules, text_mutation, client_summary, developer_explanation, confidence }`.

- [ ] **Step 1: Write the failing unit test for `copilot_service.py`**

```python
# backend/tests/test_copilot_service.py
import pytest
from services.copilot_service import parse_copilot_dom_intent

@pytest.mark.asyncio
async def test_parse_copilot_dom_intent_matching():
    sample_dom = [
        {"selector": "button.cta-primary", "tag": "button", "text": "Start Free Trial", "rect": {"top": 100, "left": 200, "width": 150, "height": 45}},
        {"selector": "h1.hero-title", "tag": "h1", "text": "Build Faster", "rect": {"top": 40, "left": 200, "width": 400, "height": 60}}
    ]
    prompt = "Make the primary start free trial button emerald green and change copy to Get Started Now"
    
    # Mocked provider config test
    mock_config = {
        "provider": "groq",
        "api_key": "dummy_key",
        "supports_openai_compat": True,
        "model_name": "llama-3.3-70b-versatile"
    }
    
    result = await parse_copilot_dom_intent(prompt, sample_dom, mock_config, mock_client=True)
    assert result["selector"] == "button.cta-primary"
    assert "background" in str(result["css_mutations"]).lower() or "color" in str(result["css_mutations"]).lower()
    assert result["text_mutation"] == "Get Started Now"
    assert len(result["developer_explanation"]) > 0
```

- [ ] **Step 2: Implement `backend/services/copilot_service.py`**

Implement `parse_copilot_dom_intent` and `resolve_ai_provider`:
- Priority:
  1. User's active `UserAIProviderConfig` (if valid key is set).
  2. System environment `GROQ_API_KEY` (Free Omni-Route using `llama-3.3-70b-versatile`).
  3. System environment `GEMINI_API_KEY` (Free Omni-Route using `gemini-1.5-flash`).
  4. System environment `OPENAI_API_KEY` (`gpt-4o-mini`).
- Strict JSON structured output:
```json
{
  "selector": "exact target selector from candidates",
  "css_mutations": { "background-color": "#10B981", "padding": "12px 24px" },
  "css_rules": "button.cta-primary { background-color: #10B981 !important; padding: 12px 24px !important; }",
  "text_mutation": "Get Started Now",
  "client_summary": "Changed button color to emerald green and updated copy.",
  "developer_explanation": "Client requested high-contrast CTA button styling with emerald #10B981 and revised copy for conversion testing.",
  "confidence": 0.95
}
```

- [ ] **Step 3: Run pytest to verify unit tests pass**

Run: `pytest backend/tests/test_copilot_service.py -v`
Expected: PASS

---

### Task 3: Backend Copilot API Router (`/api/copilot`)

**Files:**
- Create: `backend/routers/copilot.py`
- Modify: `backend/main.py:15-25` (Register router)
- Test: `backend/tests/test_copilot_router.py`

**Interfaces:**
- Endpoints:
  - `POST /api/copilot/parse`: Accepts `{ prompt: str, micro_dom: list, viewport: dict, session_id: str }`. Returns `CopilotResolution`.
  - `POST /api/copilot/confirm-pin`: Accepts `{ session_id: str, selector: str, image_base64: str, css_mutations: dict, text_mutation: str, client_summary: str, developer_explanation: str }`. Creates marker and dispatches dev notification.

- [ ] **Step 1: Write integration test for `/api/copilot/parse` and `/api/copilot/confirm-pin`**

- [ ] **Step 2: Implement `backend/routers/copilot.py` with auth dependency and validation**

- [ ] **Step 3: Register `copilot_router` in `backend/main.py`**

- [ ] **Step 4: Run pytest on copilot router**

Run: `pytest backend/tests/test_copilot_router.py -v`
Expected: PASS

---

### Task 4: Canvas UI Copilot Floating Bar & Confirmation Handshake (`web/src/components/copilot/`)

**Files:**
- Create: `web/src/components/copilot/CanvasCopilotBar.tsx`
- Create: `web/src/components/copilot/CopilotConfirmationModal.tsx`
- Modify: `web/src/app/project/[id]/page.tsx` (or canvas parent component)

**Interfaces:**
- Consumes: Iframe `postMessage` protocol, audio recording API (MediaRecorder) + transcription endpoint.
- Produces: Visual mutation in iframe, floating confirmation card with cropped screenshot and one-click "Confirm & Pin".

- [ ] **Step 1: Implement `CanvasCopilotBar.tsx`**
  - Features:
    - Voice dictation button (recording pulse animation $\to$ audio transcription).
    - Text prompt input with submit shortcut (Enter).
    - Status pill ("Extracting element...", "Applying preview...").
    - Clean dark/light theme styling matching STAGE design system.

- [ ] **Step 2: Implement `CopilotConfirmationModal.tsx`**
  - Features:
    - Element screenshot crop preview.
    - Summary of the proposed change.
    - Two clear action buttons:
      - `Confirm & Pin` (green, saves pin and notifies dev).
      - `Undo` (reverts live preview and closes modal).

- [ ] **Step 3: Connect to iframe postMessage in `web/src/app/project/[id]/page.tsx`**

- [ ] **Step 4: Verify build integrity**

Run: `npm --prefix web run lint` or `npm --prefix web run build --dry-run`

---

### Task 5: End-to-End Verification & Local Test Suite

**Files:**
- Test: `backend/tests/test_e2e_copilot_flow.py`

- [ ] **Step 1: Execute full backend test suite**
Run: `pytest backend/tests/ -v`
Expected: All tests pass.

- [ ] **Step 2: Verify git status is clean and NOTHING is pushed to remote**
Run: `git status`
Expected: Working tree clean or only local unpushed commits. Remote origin untouched.

---
