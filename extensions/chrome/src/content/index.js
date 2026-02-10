/**
 * Orange Cheeto - Content Script Entry Point
 * Initializes the text replacement engine and handles communication
 */

(async function() {
  'use strict';

  // Avoid running multiple times
  if (window.__orangeCheetoInitialized) {
    return;
  }
  window.__orangeCheetoInitialized = true;

  let observer = null;

  /**
   * Initialize the extension
   */
  async function init() {
    try {
      // Load settings
      const settings = await OrangeCheetoStorage.get();

      // Check if enabled
      if (!settings.enabled) {
        console.log('[Orange Cheeto] Extension is disabled');
        return;
      }

      // Get enabled replacements
      const enabledReplacements = await OrangeCheetoStorage.getEnabledReplacements();

      if (enabledReplacements.length === 0) {
        console.log('[Orange Cheeto] No replacements enabled');
        return;
      }

      // Initialize replacer
      Replacer.init(settings, enabledReplacements);

      // Process existing content
      const initialCount = Replacer.processElement(document.body);

      // Start observing for dynamic content
      observer = TextWalker.observe((addedNodes) => {
        for (const node of addedNodes) {
          Replacer.processElement(node);
        }
        // Update badge count
        updateBadge();
      });

      // Update badge with initial count
      updateBadge();

      console.log(`[Orange Cheeto] Initialized - ${initialCount} replacements made`);
    } catch (error) {
      console.error('[Orange Cheeto] Initialization error:', error);
    }
  }

  /**
   * Update the extension badge with replacement count
   */
  function updateBadge() {
    const count = Replacer.getCount();
    chrome.runtime.sendMessage({
      type: 'updateBadge',
      count: count
    }).catch(() => {
      // Ignore errors when service worker is inactive
    });
  }

  /**
   * Handle settings changes
   */
  function handleSettingsChange(changes) {
    // Check if extension was toggled
    if (changes.enabled) {
      if (changes.enabled.newValue) {
        // Re-initialize when enabled
        if (observer) {
          observer.disconnect();
        }
        init();
      } else {
        // Revert all changes when disabled
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        Replacer.revertAll();
        updateBadge();
      }
      return;
    }

    // If replacements or animation changed, refresh
    if (changes.replacements || changes.animationType || changes.customText) {
      // Need to re-process with new settings
      // For now, just update animation classes on existing replacements
      if (changes.animationType) {
        const newType = changes.animationType.newValue;
        const replaced = document.querySelectorAll('.oc-replaced');

        for (const el of replaced) {
          // Remove all animation classes
          el.classList.remove(
            'oc-replaced--shimmer',
            'oc-replaced--glow',
            'oc-replaced--pulse'
          );

          // Add new animation class if not 'none'
          if (newType !== 'none') {
            el.classList.add(`oc-replaced--${newType}`);
          }
        }
      }
    }
  }

  /**
   * Listen for messages from popup or background
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'getCount':
        sendResponse({ count: Replacer.getCount() });
        return true;

      case 'refresh':
        // Re-process the page
        if (observer) {
          observer.disconnect();
        }
        Replacer.revertAll();
        init();
        sendResponse({ success: true });
        return true;

      case 'toggle':
        // Toggle and respond with new state
        OrangeCheetoStorage.toggleEnabled().then(newState => {
          sendResponse({ enabled: newState });
        });
        return true; // Indicate async response

      default:
        return false;
    }
  });

  // Listen for storage changes
  OrangeCheetoStorage.onChange(handleSettingsChange);

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
