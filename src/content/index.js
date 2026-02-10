/**
 * Orange Cheeto - Content Script Entry Point
 * Initializes the text replacement engine and handles communication
 */

// Language Detection Functions
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

/**
 * Normalize any locale string to a supported language code
 * @param {string} locale - Raw locale (e.g., "es-MX", "en_US", "fr-CA")
 * @returns {string} Supported language code or 'en' as fallback
 */
function normalizeLocale(locale) {
  if (!locale) return 'en';

  // Lowercase, handle underscore format (og:locale uses en_US)
  const normalized = locale.toLowerCase().replace('_', '-');

  // Extract primary language tag (before region)
  const primary = normalized.split('-')[0];

  // Return if supported, else fallback to English
  return SUPPORTED_LANGUAGES.includes(primary) ? primary : 'en';
}

/**
 * Parse potentially comma-separated Content-Language values
 * @param {string} header - e.g., "en, es" or "en-US"
 * @returns {string} First supported language or 'en'
 */
function parseContentLanguage(header) {
  if (!header) return null;

  const languages = header.split(',').map(l => l.trim());
  for (const lang of languages) {
    const normalized = normalizeLocale(lang);
    if (normalized !== 'en' || lang.toLowerCase().startsWith('en')) {
      return normalized;
    }
  }
  return 'en';
}

/**
 * Detect page language using tiered approach
 * @returns {string} Supported language code (always returns valid value)
 */
function detectPageLanguage() {
  // Tier 1: HTML lang attribute (most reliable)
  const htmlLang = document.documentElement.lang;
  if (htmlLang) return normalizeLocale(htmlLang);

  // Tier 2: Body lang attribute
  const bodyLang = document.body?.lang;
  if (bodyLang) return normalizeLocale(bodyLang);

  // Tier 3: Meta Content-Language (may be comma-separated)
  const metaLang = document.querySelector(
    'meta[http-equiv="Content-Language"]'
  )?.content;
  if (metaLang) return parseContentLanguage(metaLang);

  // Tier 4: Open Graph locale
  const ogLocale = document.querySelector(
    'meta[property="og:locale"]'
  )?.content;
  if (ogLocale) return normalizeLocale(ogLocale);

  // Tier 5: Browser preference as last resort
  const browserLang = navigator.language;
  if (browserLang) return normalizeLocale(browserLang);

  // Final fallback
  return 'en';
}

// Export for testing and use by other modules
if (typeof window !== 'undefined') {
  window.OrangeCheetoLanguage = {
    SUPPORTED_LANGUAGES,
    normalizeLocale,
    parseContentLanguage,
    detectPageLanguage
  };
}

(async function() {
  'use strict';

  // Avoid running multiple times
  if (window.__orangeCheetoInitialized) {
    return;
  }
  window.__orangeCheetoInitialized = true;

  let observer = null;
  let currentLanguage = 'en';

  /**
   * Determine the effective language based on settings and page detection
   * @param {object} settings - Current storage settings
   * @returns {string} Language code to use
   */
  function getEffectiveLanguage(settings) {
    if (settings.language === 'auto') {
      return detectPageLanguage();
    }
    return settings.language || 'en';
  }

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

      // Determine language
      currentLanguage = getEffectiveLanguage(settings);
      console.log(`[Orange Cheeto] Using language: ${currentLanguage}`);

      // Get enabled replacements for detected language
      const enabledReplacements = await OrangeCheetoStorage.getEnabledReplacements(currentLanguage);

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
   * Reprocess the entire page with new settings/language
   */
  async function reprocessPage() {
    // Remove existing replacements
    document.querySelectorAll('.oc-replaced').forEach(el => {
      const text = document.createTextNode(el.dataset.original || el.textContent);
      el.replaceWith(text);
    });

    // Disconnect observer temporarily
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    // Reset replacer
    if (typeof Replacer !== 'undefined' && Replacer.reset) {
      Replacer.reset();
    }

    // Re-initialize with new settings
    await init();
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

    // If language changed, need to reprocess
    if (changes.language) {
      reprocessPage();
      return;
    }

    // If nickname settings changed, need to reprocess
    if (changes.enabledNicknames || changes.customNicknames) {
      reprocessPage();
      return;
    }

    // If animation changed, just update classes (no reprocess needed)
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

  /**
   * Listen for messages from popup or background
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'getCount':
        sendResponse({ count: Replacer.getCount() });
        return true;

      case 'getLanguage':
        sendResponse({ language: currentLanguage });
        return true;

      case 'refresh':
        // Re-process the page
        reprocessPage().then(() => {
          sendResponse({ success: true });
        });
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
