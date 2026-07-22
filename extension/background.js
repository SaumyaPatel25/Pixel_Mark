// Service worker for STAGE Extension Fallback
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ACTIVATE_FEEDBACK') {
    // Forward the activation to the content script in the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'ENABLE_OVERLAY', 
          projectId: request.projectId 
        }, (response) => {
          if (chrome.runtime.lastError) {
             console.warn("Content script not ready in this tab yet.");
          }
        });
      }
    });
  }
});

// Clear activation state on navigation if needed (optional)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // You could auto-resume here if the URL matches a saved project target
  }
});
