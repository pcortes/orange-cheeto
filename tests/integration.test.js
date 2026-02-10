/**
 * Integration tests for Orange Cheeto Extension
 * Tests multiple components working together with mocked chrome.storage APIs
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock chrome.storage API
const createMockStorage = () => {
  let syncData = {};
  let localData = {};
  const listeners = [];

  return {
    sync: {
      get: vi.fn((keys, callback) => {
        if (callback) {
          if (keys === null) {
            callback({ ...syncData });
          } else if (typeof keys === 'object' && !Array.isArray(keys)) {
            // keys is default values object
            const result = { ...keys };
            Object.keys(syncData).forEach(k => {
              result[k] = syncData[k];
            });
            callback(result);
          } else {
            callback({ ...syncData });
          }
        }
        return Promise.resolve(syncData);
      }),
      set: vi.fn((data, callback) => {
        const changes = {};
        Object.keys(data).forEach(key => {
          changes[key] = { oldValue: syncData[key], newValue: data[key] };
          syncData[key] = data[key];
        });
        listeners.forEach(cb => cb(changes, 'sync'));
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: vi.fn((callback) => {
        syncData = {};
        if (callback) callback();
        return Promise.resolve();
      }),
      _getData: () => ({ ...syncData }),
      _setData: (data) => { syncData = { ...data }; }
    },
    local: {
      get: vi.fn((keys, callback) => {
        if (callback) callback({ ...localData });
        return Promise.resolve(localData);
      }),
      set: vi.fn((data, callback) => {
        Object.assign(localData, data);
        if (callback) callback();
        return Promise.resolve();
      }),
      _getData: () => ({ ...localData }),
      _setData: (data) => { localData = { ...data }; }
    },
    onChanged: {
      addListener: vi.fn((callback) => {
        listeners.push(callback);
      }),
      removeListener: vi.fn((callback) => {
        const idx = listeners.indexOf(callback);
        if (idx >= 0) listeners.splice(idx, 1);
      })
    }
  };
};

// ============================================================================
// INLINE MODULE CODE FOR TESTING
// ============================================================================

// From src/shared/locales.js
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

const LOCALES = {
  en: {
    meta: { code: "en", name: "English", nativeName: "English" },
    nicknames: [
      { id: "orange-cheeto", text: "Orange Cheeto", defaultEnabled: true },
      { id: "mango-mussolini", text: "Mango Mussolini", defaultEnabled: true },
      { id: "cheeto-benito", text: "Cheeto Benito", defaultEnabled: true },
      { id: "tangerine-tyrant", text: "The Tangerine Tyrant", defaultEnabled: true },
      { id: "agent-orange", text: "Agent Orange", defaultEnabled: true },
      { id: "dorito-mussolini", text: "Dorito Mussolini", defaultEnabled: false },
      { id: "cheeto-jesus", text: "Cheeto Jesus", defaultEnabled: false }
    ]
  },
  es: {
    meta: { code: "es", name: "Spanish", nativeName: "Espanol" },
    nicknames: [
      { id: "orange-cheeto", text: "El Cheeto Naranja", defaultEnabled: true },
      { id: "mango-mussolini", text: "Don Peluca", defaultEnabled: true },
      { id: "cheeto-benito", text: "El Emperador Bronceado", defaultEnabled: true },
      { id: "tangerine-tyrant", text: "Trumpudo", defaultEnabled: true },
      { id: "agent-orange", text: "El Tuitero Loco", defaultEnabled: true },
      { id: "dorito-mussolini", text: "Mandarina en Jefe", defaultEnabled: false },
      { id: "cheeto-jesus", text: "El Guero Griton", defaultEnabled: false }
    ]
  },
  fr: {
    meta: { code: "fr", name: "French", nativeName: "Francais" },
    nicknames: [
      { id: "orange-cheeto", text: "Le Clown Orange", defaultEnabled: true },
      { id: "mango-mussolini", text: "Monsieur Toupet", defaultEnabled: true },
      { id: "cheeto-benito", text: "Le Roi Solarium", defaultEnabled: true },
      { id: "tangerine-tyrant", text: "La Carotte Presidentielle", defaultEnabled: true },
      { id: "agent-orange", text: "Tonton Tango", defaultEnabled: true },
      { id: "dorito-mussolini", text: "Le Grand Blond", defaultEnabled: false },
      { id: "cheeto-jesus", text: "Sa Majeste des Tweets", defaultEnabled: false }
    ]
  },
  de: {
    meta: { code: "de", name: "German", nativeName: "Deutsch" },
    nicknames: [
      { id: "orange-cheeto", text: "Der Orangene Gockel", defaultEnabled: true },
      { id: "mango-mussolini", text: "Toupetchen", defaultEnabled: true },
      { id: "cheeto-benito", text: "Der Mauerbauer", defaultEnabled: true },
      { id: "tangerine-tyrant", text: "Cheetolinchen", defaultEnabled: true },
      { id: "agent-orange", text: "Der Goldene Polterer", defaultEnabled: true },
      { id: "dorito-mussolini", text: "Schwurbel-Donald", defaultEnabled: false },
      { id: "cheeto-jesus", text: "Das Lachsorangen-Gespenst", defaultEnabled: false }
    ]
  }
};

function getNicknamesForLanguage(langCode) {
  return LOCALES[langCode]?.nicknames || LOCALES.en.nicknames;
}

// From src/shared/storage.js
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

function migrateToV2(oldData) {
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

  Object.values(LEGACY_TEXT_TO_ID).forEach(id => {
    newData.enabledNicknames[id] = false;
  });

  if (Array.isArray(oldData.replacements)) {
    for (const item of oldData.replacements) {
      if (!item || typeof item.text !== 'string') continue;

      const normalizedText = item.text.toLowerCase().trim();
      const mappedId = LEGACY_TEXT_TO_ID[normalizedText];

      if (mappedId) {
        newData.enabledNicknames[mappedId] = item.enabled ?? true;
      } else {
        newData.customNicknames.push({
          text: item.text,
          enabled: item.enabled ?? true
        });
      }
    }
  }

  return newData;
}

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

// From src/content/index.js
function normalizeLocale(locale) {
  if (!locale) return 'en';
  const normalized = locale.toLowerCase().replace('_', '-');
  const primary = normalized.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(primary) ? primary : 'en';
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration: Storage Migration with Chrome API', () => {
  let mockStorage;
  let chrome;

  beforeEach(() => {
    mockStorage = createMockStorage();
    chrome = { storage: mockStorage };
    global.chrome = chrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  describe('Full migration workflow', () => {
    it('migrates v1 data and persists to chrome.storage', async () => {
      // Setup: v1 data in storage
      const v1Data = {
        enabled: true,
        animationType: 'glow',
        replacements: [
          { text: "orange cheeto", enabled: true },
          { text: "mango mussolini", enabled: false },
          { text: "My Custom", enabled: true }
        ]
      };
      mockStorage.sync._setData(v1Data);

      // Action: Load and migrate
      const loaded = await new Promise(resolve => {
        chrome.storage.sync.get(null, resolve);
      });
      const migrated = migrateToV2(loaded);

      // Save migrated data
      await new Promise(resolve => {
        chrome.storage.sync.set(migrated, resolve);
      });

      // Verify: Check stored data
      const stored = mockStorage.sync._getData();
      expect(stored.schemaVersion).toBe(2);
      expect(stored.language).toBe('auto');
      expect(stored.animationType).toBe('glow');
      expect(stored.enabledNicknames['orange-cheeto']).toBe(true);
      expect(stored.enabledNicknames['mango-mussolini']).toBe(false);
      expect(stored.customNicknames[0].text).toBe('My Custom');
    });

    it('preserves v2 data without modification', async () => {
      // Setup: v2 data already in storage
      const v2Data = {
        schemaVersion: 2,
        enabled: false,
        language: 'es',
        animationType: 'pulse',
        enabledNicknames: {
          'orange-cheeto': false,
          'mango-mussolini': true
        },
        customNicknames: []
      };
      mockStorage.sync._setData(v2Data);

      // Action: Load and attempt migrate
      const loaded = await new Promise(resolve => {
        chrome.storage.sync.get(null, resolve);
      });
      const result = migrateToV2(loaded);

      // Verify: Should be unchanged
      expect(result).toEqual(v2Data);
      expect(result.language).toBe('es');
      expect(result.enabled).toBe(false);
    });

    it('handles empty storage (fresh install)', async () => {
      // Setup: Empty storage
      mockStorage.sync._setData({});

      // Action: Load and migrate
      const loaded = await new Promise(resolve => {
        chrome.storage.sync.get(null, resolve);
      });
      const migrated = migrateToV2(loaded);

      // Verify: Should get v2 defaults
      expect(migrated.schemaVersion).toBe(2);
      expect(migrated.enabled).toBe(true);
      expect(migrated.language).toBe('auto');
      expect(migrated.animationType).toBe('shimmer');
    });
  });

  describe('Storage change listeners', () => {
    it('notifies listeners when settings change', async () => {
      const changeHandler = vi.fn();
      chrome.storage.onChanged.addListener(changeHandler);

      // Change a setting
      await new Promise(resolve => {
        chrome.storage.sync.set({ enabled: false }, resolve);
      });

      expect(changeHandler).toHaveBeenCalledWith(
        { enabled: { oldValue: undefined, newValue: false } },
        'sync'
      );
    });
  });
});

describe('Integration: Language Detection with Replacer', () => {
  beforeEach(() => {
    document.documentElement.lang = '';
    if (document.body) {
      document.body.lang = '';
    }
    document.querySelectorAll('meta').forEach(m => m.remove());
  });

  function detectPageLanguage() {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return normalizeLocale(htmlLang);

    const bodyLang = document.body?.lang;
    if (bodyLang) return normalizeLocale(bodyLang);

    const metaLang = document.querySelector(
      'meta[http-equiv="Content-Language"]'
    )?.content;
    if (metaLang) return normalizeLocale(metaLang);

    const ogLocale = document.querySelector(
      'meta[property="og:locale"]'
    )?.content;
    if (ogLocale) return normalizeLocale(ogLocale);

    return 'en';
  }

  function getEnabledNicknames(language, enabledNicknames, customNicknames = []) {
    const results = [];
    const nicknames = getNicknamesForLanguage(language);

    for (const nickname of nicknames) {
      if (enabledNicknames && enabledNicknames[nickname.id]) {
        results.push(nickname.text);
      }
    }

    for (const custom of customNicknames) {
      if (custom.enabled) {
        results.push(custom.text);
      }
    }

    return results;
  }

  describe('Language to nicknames flow', () => {
    it('detects Spanish page and returns Spanish nicknames', () => {
      // Setup: Spanish page
      document.documentElement.lang = 'es-MX';

      // Detect language
      const language = detectPageLanguage();
      expect(language).toBe('es');

      // Get nicknames for detected language
      const enabledNicknames = {
        'orange-cheeto': true,
        'mango-mussolini': true
      };
      const nicknames = getEnabledNicknames(language, enabledNicknames);

      expect(nicknames).toContain('El Cheeto Naranja');
      expect(nicknames).toContain('Don Peluca');
      expect(nicknames).not.toContain('Orange Cheeto');
    });

    it('detects French page and returns French nicknames', () => {
      document.documentElement.lang = 'fr-FR';

      const language = detectPageLanguage();
      expect(language).toBe('fr');

      const enabledNicknames = {
        'orange-cheeto': true,
        'tangerine-tyrant': true
      };
      const nicknames = getEnabledNicknames(language, enabledNicknames);

      expect(nicknames).toContain('Le Clown Orange');
      expect(nicknames).toContain('La Carotte Presidentielle');
    });

    it('detects German page and returns German nicknames', () => {
      document.documentElement.lang = 'de';

      const language = detectPageLanguage();
      expect(language).toBe('de');

      const enabledNicknames = {
        'cheeto-benito': true,
        'agent-orange': true
      };
      const nicknames = getEnabledNicknames(language, enabledNicknames);

      expect(nicknames).toContain('Der Mauerbauer');
      expect(nicknames).toContain('Der Goldene Polterer');
    });

    it('falls back to English for unsupported language', () => {
      document.documentElement.lang = 'zh-CN';

      const language = detectPageLanguage();
      expect(language).toBe('en');

      const enabledNicknames = { 'orange-cheeto': true };
      const nicknames = getEnabledNicknames(language, enabledNicknames);

      expect(nicknames).toContain('Orange Cheeto');
    });

    it('includes custom nicknames in all languages', () => {
      document.documentElement.lang = 'es';

      const language = detectPageLanguage();
      const enabledNicknames = { 'orange-cheeto': true };
      const customNicknames = [
        { text: 'My Custom Name', enabled: true },
        { text: 'Disabled Custom', enabled: false }
      ];

      const nicknames = getEnabledNicknames(language, enabledNicknames, customNicknames);

      expect(nicknames).toContain('El Cheeto Naranja');
      expect(nicknames).toContain('My Custom Name');
      expect(nicknames).not.toContain('Disabled Custom');
    });
  });

  describe('Language override behavior', () => {
    it('uses manual language setting over auto-detect', () => {
      // Page is Spanish
      document.documentElement.lang = 'es';

      // But user has set language to German
      const userLanguage = 'de';

      // When not "auto", use the user setting
      const effectiveLanguage = userLanguage !== 'auto'
        ? userLanguage
        : detectPageLanguage();

      expect(effectiveLanguage).toBe('de');

      const enabledNicknames = { 'orange-cheeto': true };
      const nicknames = getEnabledNicknames(effectiveLanguage, enabledNicknames);

      expect(nicknames).toContain('Der Orangene Gockel');
      expect(nicknames).not.toContain('El Cheeto Naranja');
    });

    it('uses auto-detect when language is "auto"', () => {
      document.documentElement.lang = 'fr';

      const userLanguage = 'auto';
      const effectiveLanguage = userLanguage === 'auto'
        ? detectPageLanguage()
        : userLanguage;

      expect(effectiveLanguage).toBe('fr');
    });
  });
});

describe('Integration: Settings Persistence Simulation', () => {
  let mockStorage;
  let chrome;

  beforeEach(() => {
    mockStorage = createMockStorage();
    chrome = { storage: mockStorage };
    global.chrome = chrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  // Simulate OrangeCheetoStorage methods
  const createStorageWrapper = () => {
    return {
      async get(key = null) {
        return new Promise(resolve => {
          chrome.storage.sync.get(null, (result) => {
            const migrated = migrateToV2(result);
            if (key) {
              resolve(migrated[key]);
            } else {
              resolve(migrated);
            }
          });
        });
      },
      async set(data) {
        return new Promise(resolve => {
          chrome.storage.sync.set(data, resolve);
        });
      },
      async setLanguage(language) {
        const validLanguages = ['auto', 'en', 'es', 'fr', 'de'];
        if (validLanguages.includes(language)) {
          await this.set({ language });
        }
      },
      async toggleNickname(nicknameId) {
        const settings = await this.get();
        const current = settings.enabledNicknames[nicknameId] ?? false;
        const newState = !current;
        const enabledNicknames = { ...settings.enabledNicknames };
        enabledNicknames[nicknameId] = newState;
        await this.set({ enabledNicknames });
        return newState;
      }
    };
  };

  describe('Popup settings workflow', () => {
    it('changes language and persists across sessions', async () => {
      const storage = createStorageWrapper();

      // Initial state
      mockStorage.sync._setData(getDefaultSettings());

      // Change language
      await storage.setLanguage('es');

      // Verify persisted
      const settings = await storage.get();
      expect(settings.language).toBe('es');

      // Simulate "session restart" - new storage wrapper
      const storage2 = createStorageWrapper();
      const reloadedSettings = await storage2.get();
      expect(reloadedSettings.language).toBe('es');
    });

    it('toggles nickname and persists', async () => {
      const storage = createStorageWrapper();
      mockStorage.sync._setData(getDefaultSettings());

      // orange-cheeto starts enabled
      let settings = await storage.get();
      expect(settings.enabledNicknames['orange-cheeto']).toBe(true);

      // Toggle off
      const newState = await storage.toggleNickname('orange-cheeto');
      expect(newState).toBe(false);

      // Verify persisted
      settings = await storage.get();
      expect(settings.enabledNicknames['orange-cheeto']).toBe(false);
    });

    it('maintains other settings when changing one', async () => {
      const storage = createStorageWrapper();
      mockStorage.sync._setData({
        ...getDefaultSettings(),
        animationType: 'pulse',
        enabled: false
      });

      // Change only language
      await storage.setLanguage('fr');

      // Verify other settings unchanged
      const settings = await storage.get();
      expect(settings.language).toBe('fr');
      expect(settings.animationType).toBe('pulse');
      expect(settings.enabled).toBe(false);
    });
  });
});

describe('Integration: Complete Workflow Simulation', () => {
  let mockStorage;
  let chrome;

  beforeEach(() => {
    mockStorage = createMockStorage();
    chrome = { storage: mockStorage };
    global.chrome = chrome;
    document.documentElement.lang = '';
  });

  afterEach(() => {
    delete global.chrome;
  });

  it('simulates full user workflow: fresh install -> use -> language change', async () => {
    // Step 1: Fresh install - use default settings (not empty migration)
    // In the real app, safeLoadSettings returns defaults for fresh install
    const settings = getDefaultSettings();
    mockStorage.sync._setData(settings);

    expect(settings.schemaVersion).toBe(2);
    expect(settings.language).toBe('auto');
    expect(settings.enabledNicknames['orange-cheeto']).toBe(true);

    // Step 3: User visits Spanish page
    document.documentElement.lang = 'es-ES';

    const detectPageLanguage = () => {
      const htmlLang = document.documentElement.lang;
      if (htmlLang) return normalizeLocale(htmlLang);
      return 'en';
    };

    const effectiveLanguage = settings.language === 'auto'
      ? detectPageLanguage()
      : settings.language;

    expect(effectiveLanguage).toBe('es');

    // Step 4: Get Spanish nicknames
    const nicknames = getNicknamesForLanguage(effectiveLanguage);
    const enabledTexts = nicknames
      .filter(n => settings.enabledNicknames[n.id])
      .map(n => n.text);

    expect(enabledTexts).toContain('El Cheeto Naranja');
    expect(enabledTexts).toContain('Don Peluca');

    // Step 5: User changes language to French manually
    settings.language = 'fr';
    await new Promise(resolve => {
      chrome.storage.sync.set({ language: 'fr' }, resolve);
    });

    // Step 6: Verify French nicknames now used
    const frenchNicknames = getNicknamesForLanguage('fr');
    const frenchEnabled = frenchNicknames
      .filter(n => settings.enabledNicknames[n.id])
      .map(n => n.text);

    expect(frenchEnabled).toContain('Le Clown Orange');
    expect(frenchEnabled).toContain('Monsieur Toupet');

    // Step 7: Verify storage persisted correctly
    const finalStorage = mockStorage.sync._getData();
    expect(finalStorage.language).toBe('fr');
  });

  it('simulates upgrade from v1 to v2 with user data preservation', async () => {
    // Step 1: User has v1 data with customizations
    const v1Data = {
      enabled: true,
      animationType: 'glow',
      replacements: [
        { text: "orange cheeto", enabled: true },
        { text: "mango mussolini", enabled: false },
        { text: "cheeto benito", enabled: true },
        { text: "the tangerine tyrant", enabled: false },
        { text: "agent orange", enabled: true },
        { text: "dorito mussolini", enabled: true }, // User enabled this
        { text: "cheeto jesus", enabled: false },
        { text: "User's Custom Nickname", enabled: true }
      ]
    };
    mockStorage.sync._setData(v1Data);

    // Step 2: Extension updates and migrates
    const loaded = await new Promise(resolve => {
      chrome.storage.sync.get(null, resolve);
    });
    const migrated = migrateToV2(loaded);

    // Step 3: Save migrated data
    await new Promise(resolve => {
      chrome.storage.sync.set(migrated, resolve);
    });

    // Step 4: Verify user customizations preserved
    expect(migrated.animationType).toBe('glow');
    expect(migrated.enabledNicknames['orange-cheeto']).toBe(true);
    expect(migrated.enabledNicknames['mango-mussolini']).toBe(false);
    expect(migrated.enabledNicknames['dorito-mussolini']).toBe(true); // User change preserved
    expect(migrated.customNicknames[0].text).toBe("User's Custom Nickname");

    // Step 5: User can now use new language feature
    expect(migrated.language).toBe('auto');

    // Step 6: Change to German
    migrated.language = 'de';
    await new Promise(resolve => {
      chrome.storage.sync.set({ language: 'de' }, resolve);
    });

    // Step 7: Get German nicknames with preserved enabled states
    const germanNicknames = getNicknamesForLanguage('de');
    const enabled = germanNicknames
      .filter(n => migrated.enabledNicknames[n.id])
      .map(n => n.text);

    // Dorito-mussolini was enabled by user in v1
    expect(enabled).toContain('Schwurbel-Donald');
    // Mango-mussolini was disabled by user in v1
    expect(enabled).not.toContain('Toupetchen');
  });
});
