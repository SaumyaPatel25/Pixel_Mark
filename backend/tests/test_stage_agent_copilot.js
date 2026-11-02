/**
 * Test suite for STAGE Copilot Micro-DOM Extraction & Canvas Cropping
 * Target: backend/static/stage-agent.js
 *
 * Verifies:
 * 1. Syntax integrity of stage-agent.js
 * 2. Micro-DOM extraction with visibility filtering, bounding rects, and node capping
 * 3. Element crop capture handling (with html2canvas or ephemeral fallback)
 * 4. Ephemeral mutation application & revert (CSS staging & text restoration)
 * 5. Parent postMessage communication handshake
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let JSDOM;
try {
  JSDOM = require(path.resolve(__dirname, '../../web/node_modules/jsdom')).JSDOM;
} catch (e) {
  try {
    JSDOM = require('jsdom').JSDOM;
  } catch (err) {
    console.error('JSDOM not available:', err);
    process.exit(1);
  }
}

console.log('--- Running STAGE Agent Copilot Tests ---');

// 1. Static syntax check
console.log('1. Checking static syntax of stage-agent.js...');
const scriptPath = path.resolve(__dirname, '../static/stage-agent.js');
try {
  execSync(`node -c "${scriptPath}"`, { stdio: 'pipe' });
  console.log('   ✓ Syntax check passed (node -c exited 0)');
} catch (e) {
  console.error('   ✗ Syntax check failed:', e.message);
  process.exit(1);
}

// 2. Set up JSDOM environment
console.log('2. Setting up JSDOM environment...');
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>STAGE Copilot Test Page</title>
</head>
<body>
  <header class="header-main">
    <h1 id="main-heading">Entrext AI Canvas</h1>
    <p class="subtitle">Turn live websites into visual staging canvases.</p>
  </header>
  <main class="content-section">
    <div class="card" id="card-1">
      <h2>Interactive Editing</h2>
      <p>Direct live feedback on DOM nodes.</p>
      <button id="cta-button" class="btn btn-primary">Start Free Trial</button>
      <a href="/pricing" class="link-pricing">View Pricing</a>
    </div>
    <div class="form-container">
      <input type="text" id="email-input" placeholder="Enter your email" />
      <span class="badge badge-info">New Feature</span>
    </div>
    <!-- Hidden element that should be skipped by filter -->
    <div id="hidden-element" style="display: none;">Should be skipped</div>
    <!-- STAGE internal nodes that must be rejected -->
    <div id="stage-hud-badge">HUD</div>
    <div id="stage-inspector-root">Inspector Root</div>
    <div id="stage-edit-overlay-container">Overlay Container</div>
  </main>
</body>
</html>
`;

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/demo',
  runScripts: 'dangerously',
  resources: 'usable'
});

const { window } = dom;
const { document, NodeFilter, Node } = window;

// Polyfill minimal browser APIs needed by stage-agent
window.innerHeight = 800;
window.innerWidth = 1200;
window.devicePixelRatio = 1;
window.requestAnimationFrame = function(cb) { return setTimeout(cb, 16); };
window.cancelAnimationFrame = function(id) { clearTimeout(id); };
window.CSS = {
  escape: function(str) {
    return String(str).replace(/([^\w-])/g, '\\$1');
  }
};
Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
  get() { return this.textContent; },
  set(v) { this.textContent = v; },
  configurable: true
});

// Mock getBoundingClientRect on elements
const origGetBoundingClientRect = window.Element.prototype.getBoundingClientRect;
window.Element.prototype.getBoundingClientRect = function() {
  if (this.id === 'hidden-element' || (this.style && this.style.display === 'none')) {
    return { top: -999, left: -999, width: 0, height: 0, bottom: -999, right: -999 };
  }
  if (this.id === 'cta-button') {
    return { top: 120, left: 250, width: 140, height: 42, bottom: 162, right: 390 };
  }
  if (this.id === 'main-heading') {
    return { top: 40, left: 100, width: 300, height: 35, bottom: 75, right: 400 };
  }
  return { top: 50, left: 50, width: 100, height: 30, bottom: 80, right: 150 };
};

// Mock postMessage for parent
const parentMessages = [];
window.parent = {
  postMessage: function(msg, origin) {
    parentMessages.push(msg);
  }
};

// Execute stage-agent script inside the JSDOM window
const scriptContent = fs.readFileSync(scriptPath, 'utf8');
window.eval(scriptContent);

console.log('   ✓ stage-agent.js evaluated inside JSDOM environment');

// 3. Test micro-DOM extraction
console.log('3. Testing extractMicroDomSnippet...');
assert(typeof window.__STAGE__.extractMicroDomSnippet === 'function', 'extractMicroDomSnippet must be exposed');

const microDom = window.__STAGE__.extractMicroDomSnippet(40);
assert(Array.isArray(microDom), 'microDom result must be an array');
assert(microDom.length > 0, 'microDom should contain visible elements');
assert(microDom.length <= 40, 'microDom must not exceed maxElements (40)');

// Validate compact node schema
microDom.forEach((node, idx) => {
  assert(typeof node.selector === 'string', `Node ${idx} selector must be string`);
  assert(typeof node.tag === 'string', `Node ${idx} tag must be string`);
  assert(typeof node.className === 'string', `Node ${idx} className must be string`);
  assert(typeof node.text === 'string', `Node ${idx} text must be string`);
  assert(node.rect && typeof node.rect.top === 'number', `Node ${idx} rect.top must be number`);
  assert(typeof node.rect.left === 'number', `Node ${idx} rect.left must be number`);
  assert(typeof node.rect.width === 'number', `Node ${idx} rect.width must be number`);
  assert(typeof node.rect.height === 'number', `Node ${idx} rect.height must be number`);
});

// Verify STAGE internal nodes are rejected
const stageNodeFound = microDom.find(n =>
  n.selector.includes('stage-hud-badge') ||
  n.selector.includes('stage-inspector-root') ||
  n.selector.includes('stage-edit-overlay-container')
);
assert(!stageNodeFound, 'STAGE internal nodes must be excluded from microDom');

// Verify hidden elements are rejected
const hiddenFound = microDom.find(n => n.selector.includes('hidden-element'));
assert(!hiddenFound, 'Hidden elements must be excluded from microDom');

// Verify payload size is compact (< 3KB)
const jsonPayload = JSON.stringify(microDom);
const payloadSizeKb = Buffer.byteLength(jsonPayload, 'utf8') / 1024;
console.log(`   ✓ Extracted ${microDom.length} visible elements, payload size: ${payloadSizeKb.toFixed(2)} KB (< 3KB limit)`);
assert(payloadSizeKb < 3.0, 'Micro-DOM payload must be strictly < 3KB');

// 4. Test captureElementCrop helper
console.log('4. Testing captureElementCrop...');
assert(typeof window.__STAGE__.captureElementCrop === 'function', 'captureElementCrop must be exposed');

let cropCalled = false;
window.__STAGE__.captureElementCrop('#cta-button', (base64, rect) => {
  cropCalled = true;
  assert(rect !== null, 'Crop callback should supply rect');
  assert(rect.width === 140, 'Rect width should match button bounding rect');
});
assert(cropCalled, 'captureElementCrop callback should be invoked synchronously or upon completion');
console.log('   ✓ captureElementCrop successfully called with element rect');

// Test invalid selector crop
let invalidCalled = false;
window.__STAGE__.captureElementCrop('#non-existent-selector', (base64, rect) => {
  invalidCalled = true;
  assert(base64 === null, 'Missing element should return null base64');
  assert(rect === null, 'Missing element should return null rect');
});
assert(invalidCalled, 'Missing element crop should invoke callback with null');
console.log('   ✓ captureElementCrop handles missing element gracefully');

// 5. Test postMessage STAGE_REQUEST_MICRO_DOM
console.log('5. Testing postMessage event STAGE_REQUEST_MICRO_DOM...');
parentMessages.length = 0;
window.dispatchEvent(new window.MessageEvent('message', {
  data: {
    type: 'STAGE_REQUEST_MICRO_DOM',
    query: 'Change the trial button to emerald green'
  }
}));

assert(parentMessages.length > 0, 'Parent postMessage should receive response');
const microDomMsg = parentMessages.find(m => m.type === 'STAGE_MICRO_DOM_RESULT');
assert(microDomMsg, 'STAGE_MICRO_DOM_RESULT message must be sent to parent');
assert.strictEqual(microDomMsg.query, 'Change the trial button to emerald green');
assert(Array.isArray(microDomMsg.candidates), 'Candidates must be an array');
console.log(`   ✓ STAGE_REQUEST_MICRO_DOM returned ${microDomMsg.candidates.length} candidates to parent`);

// 6. Test postMessage STAGE_CAPTURE_ELEMENT_CROP
console.log('6. Testing postMessage event STAGE_CAPTURE_ELEMENT_CROP...');
parentMessages.length = 0;
window.dispatchEvent(new window.MessageEvent('message', {
  data: {
    type: 'STAGE_CAPTURE_ELEMENT_CROP',
    selector: '#cta-button'
  }
}));

assert(parentMessages.length > 0, 'Parent postMessage should receive crop response');
const cropMsg = parentMessages.find(m => m.type === 'STAGE_ELEMENT_CROP_RESULT');
assert(cropMsg, 'STAGE_ELEMENT_CROP_RESULT message must be sent to parent');
assert.strictEqual(cropMsg.selector, '#cta-button');
assert(cropMsg.rect !== undefined, 'Rect must be provided in crop result');
console.log('   ✓ STAGE_CAPTURE_ELEMENT_CROP returned STAGE_ELEMENT_CROP_RESULT');

// 7. Test STAGE_APPLY_EPHEMERAL_MUTATION & STAGE_REVERT_EPHEMERAL_MUTATION
console.log('7. Testing ephemeral mutations (apply & revert)...');
const ctaEl = document.querySelector('#cta-button');
const originalText = ctaEl.innerText;
assert.strictEqual(originalText, 'Start Free Trial');

// Apply ephemeral mutation
window.dispatchEvent(new window.MessageEvent('message', {
  data: {
    type: 'STAGE_APPLY_EPHEMERAL_MUTATION',
    selector: '#cta-button',
    cssRules: '#cta-button { background-color: #10b981 !important; color: #ffffff !important; }',
    textMutation: 'Claim Free Access Now'
  }
}));

// Verify staging style element was created
const styleEl = document.getElementById('stage-ephemeral-staging');
assert(styleEl !== null, 'Staging style element #stage-ephemeral-staging must be injected');
assert(styleEl.textContent.includes('background-color: #10b981'), 'Staging style must contain cssRules');

// Verify element text was mutated and original text backed up
assert.strictEqual(ctaEl.innerText, 'Claim Free Access Now');
assert.strictEqual(ctaEl.dataset.stageOriginalText, 'Start Free Trial');
console.log('   ✓ Ephemeral CSS and text mutation successfully applied');

// Re-apply mutation to verify original text backup is NOT overwritten
window.dispatchEvent(new window.MessageEvent('message', {
  data: {
    type: 'STAGE_APPLY_EPHEMERAL_MUTATION',
    selector: '#cta-button',
    cssRules: '#cta-button { background-color: #059669 !important; }',
    textMutation: 'Updated Second Time'
  }
}));
assert.strictEqual(ctaEl.innerText, 'Updated Second Time');
assert.strictEqual(ctaEl.dataset.stageOriginalText, 'Start Free Trial', 'Original text must be preserved on subsequent mutations');

// Revert ephemeral mutation
window.dispatchEvent(new window.MessageEvent('message', {
  data: {
    type: 'STAGE_REVERT_EPHEMERAL_MUTATION',
    selector: '#cta-button'
  }
}));

const revertedStyleEl = document.getElementById('stage-ephemeral-staging');
assert(revertedStyleEl === null, 'Staging style element must be removed on revert');
assert.strictEqual(ctaEl.innerText, 'Start Free Trial', 'Element text must be restored to original text');
assert.strictEqual(ctaEl.dataset.stageOriginalText, undefined, 'Dataset stageOriginalText must be cleaned up');
console.log('   ✓ Ephemeral mutation successfully reverted and original state restored');

console.log('\n--- All STAGE Agent Copilot tests passed! ✓ ---');
process.exit(0);
