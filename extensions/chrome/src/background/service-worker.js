/**
 * Orange Cheeto - Background Service Worker
 * Handles install, badge updates, and message passing
 */

// Default settings (same as in storage.js)
const DEFAULTS = {
  enabled: true,
  animationType: 'shimmer',
  replacements: [
    { text: "orange cheeto", enabled: true },
    { text: "mango mussolini", enabled: true },
    { text: "cheeto benito", enabled: true },
    { text: "the tangerine tyrant", enabled: true },
    { text: "agent orange", enabled: true },
    { text: "dorito mussolini", enabled: false },
    { text: "cheeto jesus", enabled: false }
  ]
};

// Track replacement counts per tab
const tabCounts = new Map();

/**
 * Handle extension install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default settings on first install
    await chrome.storage.sync.set(DEFAULTS);
    console.log('[Orange Cheeto] Extension installed with defaults');
  } else if (details.reason === 'update') {
    // Migrate settings if needed on update
    const settings = await chrome.storage.sync.get(DEFAULTS);

    // Ensure all default keys exist (for new settings in updates)
    const merged = { ...DEFAULTS, ...settings };
    await chrome.storage.sync.set(merged);

    console.log('[Orange Cheeto] Extension updated');
  }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'updateBadge':
      // Update badge for specific tab
      if (sender.tab?.id) {
        updateBadge(sender.tab.id, message.count);
      }
      return false;

    case 'getBadgeCount':
      // Return count for specific tab
      if (message.tabId) {
        sendResponse({ count: tabCounts.get(message.tabId) || 0 });
      }
      return true;

    case 'getSettings':
      // Return current settings
      chrome.storage.sync.get(DEFAULTS).then(settings => {
        sendResponse(settings);
      });
      return true; // Async response

    default:
      return false;
  }
});

/**
 * Update the extension badge for a tab
 * @param {number} tabId - Tab ID
 * @param {number} count - Replacement count
 */
function updateBadge(tabId, count) {
  // Store count
  tabCounts.set(tabId, count);

  // Update badge text
  const text = count > 0 ? String(count) : '';
  chrome.action.setBadgeText({
    text: text,
    tabId: tabId
  });

  // Set badge background color (orange theme)
  chrome.action.setBadgeBackgroundColor({
    color: '#ff8c00',
    tabId: tabId
  });

  // Set badge text color (dark for readability)
  chrome.action.setBadgeTextColor({
    color: '#ffffff',
    tabId: tabId
  });
}

/**
 * Clear badge when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  tabCounts.delete(tabId);
});

/**
 * Clear badge when tab navigates to new page
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    // Reset count for this tab
    tabCounts.set(tabId, 0);
    chrome.action.setBadgeText({
      text: '',
      tabId: tabId
    });
  }
});

/**
 * Handle extension enable/disable
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;

  if (changes.enabled) {
    // Notify all tabs of state change
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'settingsChanged',
            changes: changes
          }).catch(() => {
            // Tab might not have content script loaded
          });
        }
      }
    });
  }
});

console.log('[Orange Cheeto] Service worker loaded');
