// PixelMark Extension: Content Script
(function() {
  console.log("PixelMark Extension Content Script Loaded");

  let isEnabled = false;
  let activeProjectId = null;
  let isCtrlPressed = false;
  let badge = null;

  const API_BASE = 'http://localhost:8765';

  // 1. Listen for activation from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ENABLE_OVERLAY') {
      isEnabled = true;
      activeProjectId = request.projectId;
      console.log("PixelMark Feedback Mode Activated for Project:", activeProjectId);
      createGlobalBadge();
      sendResponse({ status: "success" });
    }
  });

  const createGlobalBadge = () => {
    if (badge) return;
    badge = document.createElement('div');
    badge.innerHTML = '⚡ <b>EXTENSION ACTIVE</b> — Ctrl+Click to audit';
    Object.assign(badge.style, {
      position: 'fixed',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#9333ea',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '10px',
      fontWeight: '900',
      zIndex: '2147483647',
      pointerEvents: 'none',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      fontFamily: 'sans-serif'
    });
    document.body.appendChild(badge);
  };

  // 2. Control Logic
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') isCtrlPressed = true;
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') isCtrlPressed = false;
  });

  document.addEventListener('mouseover', (e) => {
    if (isEnabled && isCtrlPressed) {
      e.target.style.outline = '2px dashed #a855f7';
    }
  }, true);

  document.addEventListener('mouseout', (e) => {
    if (isEnabled) {
      e.target.style.outline = '';
    }
  }, true);

  const getSelector = (el) => {
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el.parentElement) {
      let index = Array.from(el.parentElement.children).indexOf(el) + 1;
      path.unshift(`${el.tagName.toLowerCase()}:nth-child(${index})`);
      el = el.parentElement;
    }
    return path.join(' > ');
  };

  // 3. Capture & Post
  document.addEventListener('click', async (e) => {
    if (!isEnabled || !isCtrlPressed) return;

    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    const selector = getSelector(el);
    const text = prompt("Enter feedback for this element:");
    
    if (!text) return;

    const payload = {
      project_id: activeProjectId,
      text: text,
      author_name: "Extension User",
      page_url: window.location.href,
      component_ref: {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
        selector: selector
      },
      screenshot_url: null // Extension screenshot logic requires html2canvas bundling
    };

    try {
      const response = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log("Feedback saved successfully!");
        alert("Feedback pinned!");
      } else {
        console.error("Failed to save feedback");
      }
    } catch (err) {
      console.error("Error communicating with PixelMark Backend:", err);
      alert("Backend unreachable. Ensure PixelMark is running.");
    }
  }, true);

})();
