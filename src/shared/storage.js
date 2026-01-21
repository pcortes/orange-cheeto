/**
 * Chrome Storage Sync Wrapper
 * Manages extension settings with sync across devices
 */

const OrangeCheetoStorage = {
  // Default settings
  defaults: {
    enabled: true,
    animationType: 'shimmer', // 'shimmer' | 'glow' | 'pulse' | 'none'
    replacements: [
      { text: "orange cheeto", enabled: true },
      { text: "mango mussolini", enabled: true },
      { text: "cheeto benito", enabled: true },
      { text: "the tangerine tyrant", enabled: true },
      { text: "agent orange", enabled: true },
      { text: "dorito mussolini", enabled: false },
      { text: "cheeto jesus", enabled: false }
    ]
  },

  /**
   * Get all settings or specific key
   * @param {string|null} key - Optional specific key to get
   * @returns {Promise<object|any>}
   */
  async get(key = null) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.defaults, (result) => {
        if (key) {
          resolve(result[key]);
        } else {
          resolve(result);
        }
      });
    });
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
   * Get enabled replacements only
   * @returns {Promise<string[]>}
   */
  async getEnabledReplacements() {
    const settings = await this.get();
    return settings.replacements
      .filter(r => r.enabled)
      .map(r => r.text);
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
   * Toggle a specific replacement
   * @param {number} index - Index in replacements array
   * @returns {Promise<boolean>} New enabled state for that replacement
   */
  async toggleReplacement(index) {
    const replacements = await this.get('replacements');
    if (index >= 0 && index < replacements.length) {
      replacements[index].enabled = !replacements[index].enabled;
      await this.set({ replacements });
      return replacements[index].enabled;
    }
    return false;
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
      // Validate basic structure
      if (typeof settings.enabled !== 'boolean' ||
          !Array.isArray(settings.replacements)) {
        return false;
      }
      await this.set(settings);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.OrangeCheetoStorage = OrangeCheetoStorage;
}
