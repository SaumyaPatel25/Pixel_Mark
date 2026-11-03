/**
 * Test Suite for Sandboxed Browser Subagent & Site Fingerprint Extraction
 * Target: backend/static/stage-agent.js
 *
 * Verifies:
 * a. extractSiteFingerprint() extracts correct title, meta, headings, colors, and ctas.
 * b. Payload size is strictly < 2KB.
 * c. STAGE_REQUEST_SITE_FINGERPRINT responds with STAGE_SITE_FINGERPRINT_RESULT.
 * d. Project scoping class applied on mutation (scoped styles & body class).
 * e. Malformed selectors handled gracefully without throwing unhandled exceptions.
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

console.log('=== Running STAGE Agent Sandbox & Fingerprint Test Suite ===\n');

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
console.log('\n2. Setting up JSDOM sandboxed DOM environment...');
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Entrext AI Platform - Automated Visual Review</title>
  <meta name="description" content="Next-generation visual staging canvas and design copilot.">
  <meta property="og:description" content="Next-generation visual staging canvas and design copilot.">
  <style>
    body { background-color: rgb(15, 23, 42); color: rgb(248, 250, 252); }
    header { background-color: rgb(30, 41, 59); color: rgb(255, 255, 255); }
    .btn-primary { background-color: rgb(99, 102, 241); color: rgb(255, 255, 255); border-radius: 8px; padding: 12px 24px; }
    .btn-secondary { background-color: rgb(16, 185, 129); color: rgb(255, 255, 255); border-radius: 6px; padding: 10px 20px; }
  </style>
</head>
<body>
  <header class="hero-header">
    <h1 id="hero-title">Supercharge Web Testing with AI</h1>
    <p>Transform how engineering and design review live interfaces.</p>
  </header>
  <main class="main-content">
    <section class="features">
      <h2 id="feature-1">Instant Design Heuristics</h2>
      <p>WCAG 2.1 compliance and spatial rhythm.</p>
      <h2 id="feature-2">Autonomous Browser Subagent</h2>
      <p>Scoped ephemeral styles and live DOM mutations.</p>
      <h3 id="feature-3">One-Click Pin Generation</h3>
      <p>Capture micro-DOM snapshots instantly.</p>
      <h3 id="feature-4">Multi-Project Isolation</h3>
      <p>Sandbox style scopes per project ID.</p>
      <!-- 6th heading to test top-5 truncation -->
      <h3 id="feature-overflow">Heading that should be excluded from top 5</h3>
    </section>
    <div class="actions">
      <button id="cta-trial" class="btn btn-primary">Start Free Trial</button>
      <a id="cta-demo" href="/demo" class="btn btn-secondary">Book a Demo</a>
      <button id="cta-contact" class="btn btn-primary">Contact Sales</button>
      <!-- 4th button to test top-3 cta truncation -->
      <button id="cta-overflow">Overflow Button</button>
    </div>
    <!-- Internal STAGE elements that must be ignored -->
    <div id="stage-hud-badge">HUD Internal</div>
    <div id="stage-edit-overlay-container">
      <button id="stage-internal-btn">Internal STAGE Action</button>
    </div>
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
const { document } = window;

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

// ============================================================================
// Test a: extractSiteFingerprint() content verification
// ============================================================================
console.log('\n3. Testing extractSiteFingerprint() extraction (Test a)...');
assert(typeof window.__STAGE__.extractSiteFingerprint === 'function', 'extractSiteFingerprint must be exposed on window.__STAGE__');

const fp = window.__STAGE__.extractSiteFingerprint();

// Title extraction
assert.strictEqual(fp.title, 'Entrext AI Platform - Automated Visual Review', 'Title must match page <title>');
console.log('   ✓ Extracted title:', fp.title);

// Description extraction
assert.strictEqual(fp.description, 'Next-generation visual staging canvas and design copilot.', 'Description must match meta[name=description]');
console.log('   ✓ Extracted description:', fp.description);

// Headings extraction (top 5 h1, h2, h3)
assert(Array.isArray(fp.headings), 'Headings must be an array');
assert.strictEqual(fp.headings.length, 5, 'Must extract exactly top 5 headings');
assert.strictEqual(fp.headings[0].tag, 'h1');
assert.strictEqual(fp.headings[0].text, 'Supercharge Web Testing with AI');
assert(fp.headings[0].selector && fp.headings[0].selector.length > 0, 'Heading must include CSS selector');
assert.strictEqual(fp.headings[1].tag, 'h2');
assert.strictEqual(fp.headings[1].text, 'Instant Design Heuristics');
assert.strictEqual(fp.headings[2].tag, 'h2');
assert.strictEqual(fp.headings[3].tag, 'h3');
assert.strictEqual(fp.headings[4].tag, 'h3');
// 6th heading was excluded
const hasOverflowHeading = fp.headings.some(h => h.text.includes('Overflow'));
assert(!hasOverflowHeading, 'Headings beyond top 5 must be excluded');
console.log(`   ✓ Extracted top 5 headings successfully (excluded 6th overflow)`);

// Dominant computed colors
assert(Array.isArray(fp.dominant_colors), 'dominant_colors must be an array');
assert(Array.isArray(fp.colors), 'colors alias must exist and be an array');
assert(fp.dominant_colors.length >= 2, 'dominant_colors must contain at least 2 computed colors');
// Verify hex format #RRGGBB
fp.dominant_colors.forEach(col => {
  assert(/^#[0-9A-F]{6}$/i.test(col), `Color ${col} must be normalized hex format`);
});
assert(fp.dominant_colors.includes('#0F172A'), 'dominant_colors should include body background #0F172A');
assert(fp.dominant_colors.includes('#F8FAFC'), 'dominant_colors should include body text #F8FAFC');
console.log('   ✓ Extracted dominant computed colors:', fp.dominant_colors);

// Primary CTA buttons extraction (top 3)
assert(Array.isArray(fp.cta_buttons), 'cta_buttons must be an array');
assert(Array.isArray(fp.ctas), 'ctas alias must exist and be an array');
assert.strictEqual(fp.cta_buttons.length, 3, 'cta_buttons must cap at top 3');
assert.strictEqual(fp.cta_buttons[0].text, 'Start Free Trial');
assert(fp.cta_buttons[0].selector.includes('cta-trial'));
assert.strictEqual(fp.cta_buttons[0].styles.backgroundColor, 'rgb(99, 102, 241)');
assert.strictEqual(fp.cta_buttons[0].styles.borderRadius, '8px');
assert.strictEqual(fp.cta_buttons[0].styles.padding, '12px 24px');

assert.strictEqual(fp.cta_buttons[1].text, 'Book a Demo');
assert.strictEqual(fp.cta_buttons[1].styles.backgroundColor, 'rgb(16, 185, 129)');
assert.strictEqual(fp.cta_buttons[2].text, 'Contact Sales');

// Verify internal STAGE button was excluded
const hasInternalBtn = fp.cta_buttons.some(b => b.text.includes('Internal STAGE'));
assert(!hasInternalBtn, 'STAGE internal nodes must be excluded from cta_buttons');
console.log(`   ✓ Extracted top 3 CTA buttons with computed styles: [${fp.cta_buttons.map(b => b.text).join(', ')}]`);

// ============================================================================
// Test b: Payload size strictly < 2KB
// ============================================================================
console.log('\n4. Testing payload size boundary < 2KB (Test b)...');
const jsonPayload = JSON.stringify(fp);
const payloadByteLength = Buffer.byteLength(jsonPayload, 'utf8');
const payloadSizeKb = payloadByteLength / 1024;
console.log(`   ✓ Fingerprint payload byte size: ${payloadByteLength} bytes (${payloadSizeKb.toFixed(2)} KB)`);
assert(payloadByteLength < 2048, `Payload must be strictly < 2KB (2048 bytes), got ${payloadByteLength} bytes`);

// ============================================================================
// Test c: STAGE_REQUEST_SITE_FINGERPRINT postMessage handler
// ============================================================================
console.log('\n5. Testing STAGE_REQUEST_SITE_FINGERPRINT postMessage event (Test c)...');
parentMessages.length = 0;
window.dispatchEvent(new window.MessageEvent('message', {
  data: {
    type: 'STAGE_REQUEST_SITE_FINGERPRINT'
  }
}));

assert(parentMessages.length > 0, 'Parent must receive postMessage response');
const fpMsg = parentMessages.find(m => m.type === 'STAGE_SITE_FINGERPRINT_RESULT');
assert(fpMsg, 'STAGE_SITE_FINGERPRINT_RESULT message must be sent to parent');
assert.strictEqual(fpMsg.title, 'Entrext AI Platform - Automated Visual Review');
assert.strictEqual(fpMsg.description, 'Next-generation visual staging canvas and design copilot.');
assert.strictEqual(fpMsg.headings.length, 5);
assert(Array.isArray(fpMsg.dominant_colors));
assert.strictEqual(fpMsg.cta_buttons.length, 3);
console.log('   ✓ STAGE_REQUEST_SITE_FINGERPRINT replied with valid STAGE_SITE_FINGERPRINT_RESULT');

// ============================================================================
// Test d: Project-scoped styling isolation & body class application
// ============================================================================
console.log('\n6. Testing Project-Scoped Styling Isolation (Test d)...');
const trialButton = document.querySelector('#cta-trial');
assert.strictEqual(trialButton.innerText, 'Start Free Trial');

// Apply ephemeral mutation with projectId
const testProjectId = 'project_alpha_42';
window.dispatchEvent(new window.MessageEvent('message', {
  data: {
    type: 'STAGE_APPLY_EPHEMERAL_MUTATION',
    projectId: testProjectId,
    selector: '#cta-trial',
    cssRules: '#cta-trial { background-color: #10B981 !important; color: #FFFFFF !important; }',
    textMutation: 'Claim Free Access Now'
  }
}));

// Verify scoping class added to body
const expectedScopeClass = `stage-copilot-scoped-${testProjectId}`;
assert(
  document.body.classList.contains(expectedScopeClass),
  `document.body.classList must contain ${expectedScopeClass}`
);
console.log(`   ✓ document.body.classList contains scoped class: ${expectedScopeClass}`);

// Verify style tag created and rules scoped
const stagingStyle = document.getElementById('stage-ephemeral-staging');
assert(stagingStyle !== null, '#stage-ephemeral-staging must be injected');
assert.strictEqual(stagingStyle.getAttribute('data-project-id'), testProjectId);
assert(
  stagingStyle.textContent.includes(`.${expectedScopeClass}`),
  'CSS rules must be scoped with project class prefix'
);
assert(
  stagingStyle.textContent.includes('background-color: #10B981'),
  'CSS rules must contain declaration payload'
);
console.log('   ✓ Ephemeral styles scoped with .stage-copilot-scoped-* and #stage-ephemeral-staging');

// Verify text mutation
assert.strictEqual(trialButton.innerText, 'Claim Free Access Now');
assert.strictEqual(trialButton.dataset.stageOriginalText, 'Start Free Trial');

// Revert ephemeral mutation with projectId
window.dispatchEvent(new window.MessageEvent('message', {
  data: {
    type: 'STAGE_REVERT_EPHEMERAL_MUTATION',
    projectId: testProjectId,
    selector: '#cta-trial'
  }
}));

// Verify cleanup
const revertedStyle = document.getElementById('stage-ephemeral-staging');
assert(revertedStyle === null, '#stage-ephemeral-staging must be removed');
assert(
  !document.body.classList.contains(expectedScopeClass),
  'Scoping class must be removed from document.body on revert'
);
assert.strictEqual(trialButton.innerText, 'Start Free Trial', 'Button text must revert to original');
assert.strictEqual(trialButton.dataset.stageOriginalText, undefined, 'Dataset backup must be deleted');
console.log('   ✓ Ephemeral mutation reverted: body scope class removed, styles cleared, text restored');

// ============================================================================
// Test e: Defensive Hardening against Malformed Selectors
// ============================================================================
console.log('\n7. Testing Defensive Hardening against Malformed Selectors (Test e)...');

const malformedSelectors = [
  ':::invalid[[[selector',
  '#cta-button:invalid-pseudo-class()',
  'div[unclosed-attribute="',
  '..double-dot',
  '//xpath/is/not/css'
];

malformedSelectors.forEach((badSel, i) => {
  // Test captureElementCrop with bad selector
  let cropDone = false;
  window.__STAGE__.captureElementCrop(badSel, (base64, rect) => {
    cropDone = true;
    assert.strictEqual(base64, null, 'Malformed selector should return null base64');
    assert.strictEqual(rect, null, 'Malformed selector should return null rect');
  });
  assert(cropDone, `captureElementCrop must safely invoke callback on bad selector ${badSel}`);

  // Test STAGE_CAPTURE_ELEMENT_CROP message with bad selector
  window.dispatchEvent(new window.MessageEvent('message', {
    data: {
      type: 'STAGE_CAPTURE_ELEMENT_CROP',
      selector: badSel
    }
  }));

  // Test STAGE_APPLY_EPHEMERAL_MUTATION with bad selector
  window.dispatchEvent(new window.MessageEvent('message', {
    data: {
      type: 'STAGE_APPLY_EPHEMERAL_MUTATION',
      selector: badSel,
      cssRules: `${badSel} { color: red; }`,
      textMutation: 'Should Not Crash'
    }
  }));

  // Test STAGE_REVERT_EPHEMERAL_MUTATION with bad selector
  window.dispatchEvent(new window.MessageEvent('message', {
    data: {
      type: 'STAGE_REVERT_EPHEMERAL_MUTATION',
      selector: badSel
    }
  }));

  // Test STAGE_APPLY_MUTATION with bad selector
  window.dispatchEvent(new window.MessageEvent('message', {
    data: {
      type: 'STAGE_APPLY_MUTATION',
      payload: {
        targetSelector: badSel,
        htmlPayload: '<div>Safe</div>'
      }
    }
  }));

  // Test STAGE_RECONCILE_MUTATIONS with bad selector
  window.dispatchEvent(new window.MessageEvent('message', {
    data: {
      type: 'STAGE_RECONCILE_MUTATIONS',
      mutations: [
        {
          actionType: 'move',
          targetSelector: badSel,
          htmlPayload: JSON.stringify({ targetParentSelector: badSel, action: 'inside' })
        },
        {
          actionType: 'replace',
          targetSelector: badSel,
          htmlPayload: '<span>Safe</span>'
        }
      ]
    }
  }));
});

console.log(`   ✓ All ${malformedSelectors.length} malformed selectors handled gracefully without unhandled DOMExceptions`);

console.log('\n=== All Task 2 Sandbox & Fingerprint Tests Passed! ✓ ===');
process.exit(0);
