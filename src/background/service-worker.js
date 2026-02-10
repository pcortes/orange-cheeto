/**
 * Orange Cheeto - Background Service Worker
 * Handles install, badge updates, message passing, and storage migration
 */

// Import storage utilities (service worker context)
importScripts('../shared/storage.js');

// v2 Default settings - use getDefaultSettings from storage.js
const DEFAULTS_V2 = {
  schemaVersion: 2,
  enabled: true,
  language: "auto",
  animationType: 'shimmer',
  enabledNicknames: {
    "orange-cheeto": true,
    "mango-mussolini": true,
    "cheeto-benito": true,
    "tangerine-tyrant": true,
    "agent-orange": true,
    "dorito-mussolini": false,
    "cheeto-jesus": false
  },
  customNicknames: []
};

// Track replacement counts per tab
const tabCounts = new Map();

/**
 * Handle extension install and update - run storage migration
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First install: set v2 defaults
    await chrome.storage.sync.set(DEFAULTS_V2);
    console.log('[Orange Cheeto] Extension installed with v2 schema defaults');
  } else if (details.reason === 'update') {
    // Update: run migration from v1 to v2 if needed
    try {
      const migrated = await OrangeCheetoStorage.runMigrationIfNeeded();
      if (migrated) {
        console.log('[Orange Cheeto] Extension updated - storage migrated to v2');
      } else {
        console.log('[Orange Cheeto] Extension updated - already on v2 schema');
      }
    } catch (e) {
      console.error('[Orange Cheeto] Migration error:', e);
      // Fallback: ensure v2 defaults exist
      await chrome.storage.sync.set(DEFAULTS_V2);
    }
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
      // Return current settings (with v2 migration)
      OrangeCheetoStorage.get().then(settings => {
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
 * Handle settings changes (enabled, language, nicknames)
 * Notify all tabs when relevant settings change
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;

  // Notify tabs when enabled, language, or nicknames change
  const needsNotification = changes.enabled ||
                            changes.language ||
                            changes.enabledNicknames ||
                            changes.customNicknames;

  if (needsNotification) {
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
