# Workflows & Data Pipelines

This document details the critical internal data pipelines, focusing heavily on the `postMessage` communication bridge between the Next.js parent shell and the injected `stage-agent.js` iframe.

## The Cross-Window Bridge

Because STAGE operates by wrapping an external website in an `<iframe>`, direct cross-origin DOM manipulation is blocked by browser security models. To overcome this, the STAGE Proxy Engine injects `stage-agent.js` into the proxied HTML. 

The Next.js shell and the `stage-agent.js` script communicate asynchronously using `window.postMessage`.

### 1. Parent (Next.js) ➔ Iframe (Agent)
The parent application controls the state of the workspace and dictates what mode the agent should operate in.

- **`STAGE_ENABLE_EDIT_MODE` / `STAGE_DISABLE_EDIT_MODE`**: 
  - Toggles the Blueprint Canvas visual selection mode. When enabled, the agent intercepts clicks and highlights hovered DOM nodes instead of executing default browser behavior.
- **`STAGE_SET_EDIT_MODE`**:
  - Sent with `{ active: boolean }`. An alternative explicit setter for toggling edit capabilities.
- **`STAGE_PREVIEW_EDIT`** (Implicit/Dynamic):
  - When a user tweaks a style in the Next.js Inspector, the payload is sent down to the agent to apply inline CSS rules instantly for live preview without triggering a full page reload or saving to the DB.

### 2. Iframe (Agent) ➔ Parent (Next.js)
The agent acts as the eyes and ears inside the proxy, extracting contextual metadata and relaying it up to the Next.js stores (like `blueprintStore.ts`).

- **`STAGE_AGENT_READY`**: 
  - Fired when the agent finishes initializing its MutationObservers and performance hooks. Signals the parent to drop loading states.
- **`STAGE_EDIT_ELEMENT_SELECTED`**:
  - **Trigger**: The user clicks an element while in Edit Mode.
  - **Payload**:
    ```json
    {
      "type": "STAGE_EDIT_ELEMENT_SELECTED",
      "tag": "div",
      "selector": "div.hero-container > h1#main-title",
      "outerHTML": "<h1 id=\"main-title\">...</h1>",
      "innerText": "Welcome",
      "computedStyles": { "color": "rgb(0,0,0)", "fontSize": "24px" }
    }
    ```
  - **Action**: Hydrates the Next.js Inspector panel with the targeted node's current state.
- **`STAGE_NAV`**:
  - **Trigger**: The user navigates to an internal link within the iframe.
  - **Payload**: Includes `page_url`, `page_title`, and `referrer_url`.
  - **Action**: Instructs Next.js to update the browser URL bar to match the iframe's internal routing, keeping deep-links shareable.
- **`STAGE_RENDERER_DETECTED`**:
  - **Trigger**: On load, the agent scans for Canvas/WebGL contexts (Three.js, Pixi, React Three Fiber).
  - **Payload**: `{ renderer_type: "dom" | "webgl" | "mixed", has_canvas: true }`
  - **Action**: Adjusts the Blueprint UI (e.g., disabling DOM-specific CSS properties if the target is entirely WebGL).
- **`STAGE_PERFORMANCE_UPDATE`**:
  - **Trigger**: Fires roughly every second if `requestAnimationFrame` is active.
  - **Payload**: `{ fps: 60, rAFActive: true }`.
- **`STAGE_ASSET_DEGRADED`**:
  - **Trigger**: The agent intercepts a failed network request (e.g., a broken image or 404 script).
  - **Action**: Logs to the backend proxy diagnostic service.

## The Blueprint Persistence Pipeline

1. **Drafting**: When `STAGE_EDIT_ELEMENT_SELECTED` is received, `blueprintStore.ts` marks it as the `activeTarget`.
2. **Previewing**: Adjustments made in the UI are sent down via postMessage and rendered instantly in the iframe.
3. **Saving**: Clicking "Save Edit" pushes a payload to `POST /canvas/{project_id}/edits`.
4. **Hydration**: On subsequent page loads, the Next.js shell fetches all saved edits. Once `STAGE_AGENT_READY` is received, the shell blasts all saved edits down to the agent, which loops through the CSS selectors and permanently reapplies the styles to reconstruct the visual state.
