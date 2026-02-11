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
  let currentSettings = null;

  /**
   * Detect page language from HTML lang attribute or meta tags
   * @returns {string} Language code (en, es, fr, de)
   */
  function detectPageLanguage() {
    // Check html lang attribute
    const htmlLang = document.documentElement.lang || '';
    const langCode = htmlLang.split('-')[0].toLowerCase();

    // Check if it's a supported language
    if (typeof OrangeCheetoLocales !== 'undefined' &&
        OrangeCheetoLocales.isLanguageSupported(langCode)) {
      return langCode;
    }

    // Fallback: check meta tags
    const metaLang = document.querySelector('meta[http-equiv="content-language"]');
    if (metaLang) {
      const metaCode = metaLang.content.split('-')[0].toLowerCase();
      if (typeof OrangeCheetoLocales !== 'undefined' &&
          OrangeCheetoLocales.isLanguageSupported(metaCode)) {
        return metaCode;
      }
    }

    // Default to English
    return 'en';
  }

  /**
   * Get enabled replacements based on language setting
   * @param {object} settings - Current settings
   * @returns {string[]} Array of enabled replacement texts
   */
  function getLocalizedReplacements(settings) {
    // Determine effective language
    let langCode = settings.language || 'auto';
    if (langCode === 'auto') {
      langCode = detectPageLanguage();
    }

    const results = [];

    // If locales are available, use localized nicknames
    if (typeof OrangeCheetoLocales !== 'undefined') {
      const nicknames = OrangeCheetoLocales.getNicknamesForLanguage(langCode);
      const defaultNicknames = OrangeCheetoLocales.getNicknamesForLanguage('en');

      // Build a map of English text -> enabled state from user settings
      const enabledMap = {};
      if (Array.isArray(settings.replacements)) {
        for (const r of settings.replacements) {
          if (r && r.text) {
            enabledMap[r.text.toLowerCase()] = r.enabled;
          }
        }
      }

      // For each localized nickname, check if the English equivalent is enabled
      for (let i = 0; i < nicknames.length; i++) {
        const localizedNick = nicknames[i];
        const englishNick = defaultNicknames[i];

        // Check if enabled by looking up English text in user's settings
        const englishText = englishNick.text.toLowerCase();
        const isEnabled = enabledMap.hasOwnProperty(englishText)
          ? enabledMap[englishText]
          : localizedNick.defaultEnabled;

        if (isEnabled) {
          results.push(localizedNick.text);
        }
      }
    }

    // Also include custom nicknames (not in locales)
    if (Array.isArray(settings.replacements)) {
      const builtInTexts = new Set();
      if (typeof OrangeCheetoLocales !== 'undefined') {
        const defaultNicknames = OrangeCheetoLocales.getNicknamesForLanguage('en');
        for (const nick of defaultNicknames) {
          builtInTexts.add(nick.text.toLowerCase());
        }
      }

      for (const r of settings.replacements) {
        if (r && r.text && r.enabled) {
          // Check if this is a custom nickname (not in built-in list)
          if (!builtInTexts.has(r.text.toLowerCase())) {
            results.push(r.text);
          }
        }
      }
    }

    return results;
  }

  /**
   * Initialize the extension
   */
  async function init() {
    try {
      // Load settings
      const settings = await OrangeCheetoStorage.get();
      currentSettings = settings;

      // Check if enabled
      if (!settings.enabled) {
        console.log('[Orange Cheeto] Extension is disabled');
        return;
      }

      // Get enabled replacements (localized)
      const enabledReplacements = getLocalizedReplacements(settings);

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
    // Update currentSettings with any changes
    if (currentSettings) {
      for (const key in changes) {
        currentSettings[key] = changes[key].newValue;
      }
    }

    // Check if extension was toggled
    if (changes.enabled !== undefined) {
      // Update Replacer's settings reference
      if (Replacer.settings) {
        Replacer.settings.enabled = changes.enabled.newValue;
      }

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
        console.log('[Orange Cheeto] Extension disabled - reverted all replacements');
      }
      return;
    }

    // If language changed, re-process with new nicknames
    if (changes.language) {
      if (observer) {
        observer.disconnect();
      }
      Replacer.revertAll();
      init();
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

      case 'getPageLanguage':
        sendResponse({ language: detectPageLanguage() });
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
