// Controller for STAGE Extension Popup
document.addEventListener('DOMContentLoaded', async () => {
  const projectIdInput = document.getElementById('projectId');
  const activateBtn = document.getElementById('activateBtn');
  const modeStatus = document.getElementById('modeStatus');

  // 1. Restore saved Project ID if available
  chrome.storage.local.get(['lastProjectId', 'isActive'], (result) => {
    if (result.lastProjectId) {
      projectIdInput.value = result.lastProjectId;
    }
    if (result.isActive) {
      modeStatus.innerText = 'Active';
      modeStatus.classList.add('active');
    }
  });

  // 2. Handle Activation
  activateBtn.addEventListener('click', () => {
    const projectId = projectIdInput.value.trim();
    if (!projectId) {
      alert("Please enter a valid Project ID from your dashboard.");
      return;
    }

    // Save for persistence
    chrome.storage.local.set({ lastProjectId: projectId, isActive: true });

    // Update UI
    modeStatus.innerText = 'Active';
    modeStatus.classList.add('active');

    // Notify background worker to inject/enable
    chrome.runtime.sendMessage({ 
      type: 'ACTIVATE_FEEDBACK', 
      projectId: projectId 
    });

    // Close popup after a short delay
    setTimeout(() => window.close(), 600);
  });
});
