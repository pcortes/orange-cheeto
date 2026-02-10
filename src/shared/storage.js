/**
 * Chrome Storage Sync Wrapper
 * Manages extension settings with sync across devices
 *
 * Schema v2 adds:
 * - schemaVersion for migration tracking
 * - language setting ("auto" | "en" | "es" | "fr" | "de")
 * - enabledNicknames: ID-based nickname enable/disable
 * - customNicknames: User-added custom nicknames
 */

// Legacy text-to-ID mapping for migration
const LEGACY_TEXT_TO_ID = {
  "orange cheeto": "orange-cheeto",
  "mango mussolini": "mango-mussolini",
  "cheeto benito": "cheeto-benito",
  "the tangerine tyrant": "tangerine-tyrant",
  "tangerine tyrant": "tangerine-tyrant",
  "agent orange": "agent-orange",
  "dorito mussolini": "dorito-mussolini",
  "cheeto jesus": "cheeto-jesus"
};

/**
 * Migrate v1 storage to v2 schema
 * @param {object} oldData - Top-level storage data (NOT nested in 'settings')
 * @returns {object} Migrated data
 */
function migrateToV2(oldData) {
  // Already migrated?
  if (oldData.schemaVersion === 2) {
    return oldData;
  }

  const newData = {
    schemaVersion: 2,
    enabled: oldData.enabled ?? true,
    language: "auto",
    animationType: oldData.animationType ?? 'shimmer',
    enabledNicknames: {},
    customNicknames: []
  };

  // Initialize all built-ins as disabled
  Object.values(LEGACY_TEXT_TO_ID).forEach(id => {
    newData.enabledNicknames[id] = false;
  });

  // Process old replacements array
  if (Array.isArray(oldData.replacements)) {
    for (const item of oldData.replacements) {
      // Guard against malformed items
      if (!item || typeof item.text !== 'string') continue;

      const normalizedText = item.text.toLowerCase().trim();
      const mappedId = LEGACY_TEXT_TO_ID[normalizedText];

      if (mappedId) {
        // Built-in nickname - map to ID
        newData.enabledNicknames[mappedId] = item.enabled ?? true;
      } else {
        // Custom nickname - preserve as-is
        newData.customNicknames.push({
          text: item.text,
          enabled: item.enabled ?? true
        });
      }
    }
  }

  return newData;
}

/**
 * Get default settings for v2 schema
 * @returns {object} Default v2 settings
 */
function getDefaultSettings() {
  return {
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
}

/**
 * Safely load and migrate settings
 * @returns {Promise<object>} Settings (migrated if needed)
 */
async function safeLoadSettings() {
  try {
    const data = await new Promise((resolve) => {
      chrome.storage.sync.get(null, (result) => {
        resolve(result || {});
      });
    });
    return migrateToV2(data);
  } catch (e) {
    console.error('[Orange Cheeto] Settings load error, using defaults:', e);
    return getDefaultSettings();
  }
}

const OrangeCheetoStorage = {
  // v2 Default settings
  defaults: getDefaultSettings(),

  /**
   * Get all settings or specific key (with migration)
   * @param {string|null} key - Optional specific key to get
   * @returns {Promise<object|any>}
   */
  async get(key = null) {
    const settings = await safeLoadSettings();
    if (key) {
      return settings[key];
    }
    return settings;
  },

  /**
   * Set one or more settings
   * @param {object} data - Key-value pairs to save
   * @returns {Promise<void>}
   */
  async set(data) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(data, resolve);
    });
  },

  /**
   * Get enabled nicknames for a given language
   * Returns array of text strings for enabled built-in + custom nicknames
   * @param {string} language - Language code (en, es, fr, de)
   * @returns {Promise<string[]>}
   */
  async getEnabledReplacements(language = 'en') {
    const settings = await this.get();
    const results = [];

    // Get nicknames from locales.js if available
    const locales = typeof window !== 'undefined' && window.OrangeCheetoLocales;
    const nicknames = locales
      ? locales.getNicknamesForLanguage(language)
      : [];

    // Add enabled built-in nicknames
    for (const nickname of nicknames) {
      if (settings.enabledNicknames && settings.enabledNicknames[nickname.id]) {
        results.push(nickname.text);
      }
    }

    // Add enabled custom nicknames (shown in all languages)
    if (Array.isArray(settings.customNicknames)) {
      for (const custom of settings.customNicknames) {
        if (custom.enabled) {
          results.push(custom.text);
        }
      }
    }

    return results;
  },

  /**
   * Toggle the extension on/off
   * @returns {Promise<boolean>} New enabled state
   */
  async toggleEnabled() {
    const current = await this.get('enabled');
    const newState = !current;
    await this.set({ enabled: newState });
    return newState;
  },

  /**
   * Toggle a built-in nickname by ID
   * @param {string} nicknameId - Nickname ID (e.g., "orange-cheeto")
   * @returns {Promise<boolean>} New enabled state
   */
  async toggleNickname(nicknameId) {
    const settings = await this.get();
    const current = settings.enabledNicknames[nicknameId] ?? false;
    const newState = !current;

    const enabledNicknames = { ...settings.enabledNicknames };
    enabledNicknames[nicknameId] = newState;

    await this.set({ enabledNicknames });
    return newState;
  },

  /**
   * Toggle a custom nickname by index
   * @param {number} index - Index in customNicknames array
   * @returns {Promise<boolean>} New enabled state
   */
  async toggleCustomNickname(index) {
    const settings = await this.get();
    const customNicknames = [...(settings.customNicknames || [])];

    if (index >= 0 && index < customNicknames.length) {
      customNicknames[index].enabled = !customNicknames[index].enabled;
      await this.set({ customNicknames });
      return customNicknames[index].enabled;
    }
    return false;
  },

  /**
   * Add a custom nickname
   * @param {string} text - Nickname text
   * @returns {Promise<void>}
   */
  async addCustomNickname(text) {
    const settings = await this.get();
    const customNicknames = [...(settings.customNicknames || [])];
    customNicknames.push({ text, enabled: true });
    await this.set({ customNicknames });
  },

  /**
   * Remove a custom nickname
   * @param {number} index - Index in customNicknames array
   * @returns {Promise<void>}
   */
  async removeCustomNickname(index) {
    const settings = await this.get();
    const customNicknames = [...(settings.customNicknames || [])];

    if (index >= 0 && index < customNicknames.length) {
      customNicknames.splice(index, 1);
      await this.set({ customNicknames });
    }
  },

  /**
   * Set language preference
   * @param {string} language - Language code ("auto" | "en" | "es" | "fr" | "de")
   * @returns {Promise<void>}
   */
  async setLanguage(language) {
    const validLanguages = ['auto', 'en', 'es', 'fr', 'de'];
    if (validLanguages.includes(language)) {
      await this.set({ language });
    }
  },

  /**
   * Set animation type
   * @param {string} type - Animation type
   * @returns {Promise<void>}
   */
  async setAnimationType(type) {
    const validTypes = ['shimmer', 'glow', 'pulse', 'none'];
    if (validTypes.includes(type)) {
      await this.set({ animationType: type });
    }
  },

  /**
   * Add listener for storage changes
   * @param {function} callback - Callback function
   */
  onChange(callback) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        callback(changes);
      }
    });
  },

  /**
   * Reset to defaults
   * @returns {Promise<void>}
   */
  async reset() {
    await this.set(this.defaults);
  },

  /**
   * Run migration if needed (called by background worker on install/update)
   * @returns {Promise<boolean>} True if migration was performed
   */
  async runMigrationIfNeeded() {
    const data = await new Promise((resolve) => {
      chrome.storage.sync.get(null, (result) => {
        resolve(result || {});
      });
    });

    if (data.schemaVersion !== 2) {
      const migrated = migrateToV2(data);
      await this.set(migrated);
      console.log('[Orange Cheeto] Migrated storage to v2 schema');
      return true;
    }
    return false;
  },

  /**
   * Export settings as JSON string
   * @returns {Promise<string>}
   */
  async export() {
    const settings = await this.get();
    return JSON.stringify(settings, null, 2);
  },

  /**
   * Import settings from JSON string
   * @param {string} json - JSON string
   * @returns {Promise<boolean>} Success status
   */
  async import(json) {
    try {
      const settings = JSON.parse(json);
      // Validate basic structure for v2
      if (settings.schemaVersion === 2) {
        if (typeof settings.enabled !== 'boolean' ||
            typeof settings.enabledNicknames !== 'object') {
          return false;
        }
      } else {
        // Legacy v1 format - migrate it
        const migrated = migrateToV2(settings);
        await this.set(migrated);
        return true;
      }
      await this.set(settings);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OrangeCheetoStorage,
    migrateToV2,
    getDefaultSettings,
    safeLoadSettings,
    LEGACY_TEXT_TO_ID
  };
}

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.OrangeCheetoStorage = OrangeCheetoStorage;
}
