/**
 * Unit tests for storage migration in src/shared/storage.js
 * Tests migrateToV2, getDefaultSettings, LEGACY_TEXT_TO_ID mapping
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Inline the module code for testing
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

describe('LEGACY_TEXT_TO_ID', () => {
  it('maps all expected built-in nicknames', () => {
    expect(LEGACY_TEXT_TO_ID["orange cheeto"]).toBe("orange-cheeto");
    expect(LEGACY_TEXT_TO_ID["mango mussolini"]).toBe("mango-mussolini");
    expect(LEGACY_TEXT_TO_ID["cheeto benito"]).toBe("cheeto-benito");
    expect(LEGACY_TEXT_TO_ID["the tangerine tyrant"]).toBe("tangerine-tyrant");
    expect(LEGACY_TEXT_TO_ID["agent orange"]).toBe("agent-orange");
    expect(LEGACY_TEXT_TO_ID["dorito mussolini"]).toBe("dorito-mussolini");
    expect(LEGACY_TEXT_TO_ID["cheeto jesus"]).toBe("cheeto-jesus");
  });

  it('maps "tangerine tyrant" without "the" to same ID', () => {
    expect(LEGACY_TEXT_TO_ID["tangerine tyrant"]).toBe("tangerine-tyrant");
    expect(LEGACY_TEXT_TO_ID["the tangerine tyrant"]).toBe("tangerine-tyrant");
  });

  it('has exactly 7 unique ID values', () => {
    const uniqueIds = new Set(Object.values(LEGACY_TEXT_TO_ID));
    expect(uniqueIds.size).toBe(7);
  });
});

describe('getDefaultSettings', () => {
  it('returns object with schemaVersion 2', () => {
    const defaults = getDefaultSettings();
    expect(defaults.schemaVersion).toBe(2);
  });

  it('has enabled set to true', () => {
    const defaults = getDefaultSettings();
    expect(defaults.enabled).toBe(true);
  });

  it('has language set to "auto"', () => {
    const defaults = getDefaultSettings();
    expect(defaults.language).toBe('auto');
  });

  it('has animationType set to "shimmer"', () => {
    const defaults = getDefaultSettings();
    expect(defaults.animationType).toBe('shimmer');
  });

  it('has all 7 built-in nicknames in enabledNicknames', () => {
    const defaults = getDefaultSettings();
    expect(Object.keys(defaults.enabledNicknames).length).toBe(7);
  });

  it('has first 5 nicknames enabled, last 2 disabled by default', () => {
    const defaults = getDefaultSettings();
    expect(defaults.enabledNicknames["orange-cheeto"]).toBe(true);
    expect(defaults.enabledNicknames["mango-mussolini"]).toBe(true);
    expect(defaults.enabledNicknames["cheeto-benito"]).toBe(true);
    expect(defaults.enabledNicknames["tangerine-tyrant"]).toBe(true);
    expect(defaults.enabledNicknames["agent-orange"]).toBe(true);
    expect(defaults.enabledNicknames["dorito-mussolini"]).toBe(false);
    expect(defaults.enabledNicknames["cheeto-jesus"]).toBe(false);
  });

  it('has empty customNicknames array', () => {
    const defaults = getDefaultSettings();
    expect(defaults.customNicknames).toEqual([]);
  });
});

describe('migrateToV2', () => {
  describe('already v2 data', () => {
    it('returns v2 data unchanged', () => {
      const v2Data = {
        schemaVersion: 2,
        enabled: false,
        language: "es",
        animationType: 'glow',
        enabledNicknames: { "orange-cheeto": true },
        customNicknames: [{ text: "My Custom", enabled: true }]
      };

      const result = migrateToV2(v2Data);
      expect(result).toEqual(v2Data);
    });

    it('preserves all v2 properties', () => {
      const v2Data = {
        schemaVersion: 2,
        enabled: true,
        language: "de",
        animationType: 'pulse',
        enabledNicknames: {
          "orange-cheeto": false,
          "mango-mussolini": true
        },
        customNicknames: []
      };

      const result = migrateToV2(v2Data);
      expect(result.schemaVersion).toBe(2);
      expect(result.language).toBe("de");
      expect(result.animationType).toBe('pulse');
    });
  });

  describe('v1 to v2 migration - basic', () => {
    it('creates schemaVersion 2', () => {
      const v1Data = {};
      const result = migrateToV2(v1Data);
      expect(result.schemaVersion).toBe(2);
    });

    it('preserves enabled state', () => {
      const v1Data = { enabled: false };
      const result = migrateToV2(v1Data);
      expect(result.enabled).toBe(false);
    });

    it('defaults enabled to true if missing', () => {
      const v1Data = {};
      const result = migrateToV2(v1Data);
      expect(result.enabled).toBe(true);
    });

    it('sets language to "auto"', () => {
      const v1Data = {};
      const result = migrateToV2(v1Data);
      expect(result.language).toBe("auto");
    });

    it('preserves animationType', () => {
      const v1Data = { animationType: 'glow' };
      const result = migrateToV2(v1Data);
      expect(result.animationType).toBe('glow');
    });

    it('defaults animationType to "shimmer"', () => {
      const v1Data = {};
      const result = migrateToV2(v1Data);
      expect(result.animationType).toBe('shimmer');
    });
  });

  describe('v1 to v2 migration - replacements array', () => {
    it('migrates enabled built-in nicknames correctly', () => {
      const v1Data = {
        replacements: [
          { text: "orange cheeto", enabled: true },
          { text: "mango mussolini", enabled: false }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.enabledNicknames["orange-cheeto"]).toBe(true);
      expect(result.enabledNicknames["mango-mussolini"]).toBe(false);
    });

    it('handles case-insensitive matching', () => {
      const v1Data = {
        replacements: [
          { text: "Orange Cheeto", enabled: true },
          { text: "MANGO MUSSOLINI", enabled: true }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.enabledNicknames["orange-cheeto"]).toBe(true);
      expect(result.enabledNicknames["mango-mussolini"]).toBe(true);
    });

    it('handles whitespace in text', () => {
      const v1Data = {
        replacements: [
          { text: "  orange cheeto  ", enabled: true }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.enabledNicknames["orange-cheeto"]).toBe(true);
    });

    it('preserves custom nicknames', () => {
      const v1Data = {
        replacements: [
          { text: "orange cheeto", enabled: true },
          { text: "My Custom Name", enabled: true },
          { text: "Another Custom", enabled: false }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.customNicknames.length).toBe(2);
      expect(result.customNicknames[0].text).toBe("My Custom Name");
      expect(result.customNicknames[0].enabled).toBe(true);
      expect(result.customNicknames[1].text).toBe("Another Custom");
      expect(result.customNicknames[1].enabled).toBe(false);
    });

    it('defaults enabled to true for missing enabled property', () => {
      const v1Data = {
        replacements: [
          { text: "orange cheeto" }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.enabledNicknames["orange-cheeto"]).toBe(true);
    });

    it('defaults custom nickname enabled to true if missing', () => {
      const v1Data = {
        replacements: [
          { text: "My Custom" }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.customNicknames[0].enabled).toBe(true);
    });
  });

  describe('v1 to v2 migration - edge cases', () => {
    it('handles empty replacements array', () => {
      const v1Data = {
        replacements: []
      };

      const result = migrateToV2(v1Data);
      expect(result.schemaVersion).toBe(2);
      expect(result.customNicknames).toEqual([]);
      // All built-ins should be disabled
      Object.values(result.enabledNicknames).forEach(enabled => {
        expect(enabled).toBe(false);
      });
    });

    it('handles missing replacements array', () => {
      const v1Data = { enabled: true };

      const result = migrateToV2(v1Data);
      expect(result.schemaVersion).toBe(2);
      expect(result.customNicknames).toEqual([]);
    });

    it('skips malformed items without text property', () => {
      const v1Data = {
        replacements: [
          { text: "orange cheeto", enabled: true },
          { enabled: true }, // Missing text
          null, // Null item
          { text: "mango mussolini", enabled: true }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.enabledNicknames["orange-cheeto"]).toBe(true);
      expect(result.enabledNicknames["mango-mussolini"]).toBe(true);
    });

    it('skips items with non-string text', () => {
      const v1Data = {
        replacements: [
          { text: 123, enabled: true },
          { text: null, enabled: true },
          { text: "orange cheeto", enabled: true }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.enabledNicknames["orange-cheeto"]).toBe(true);
    });

    it('handles "the tangerine tyrant" and "tangerine tyrant"', () => {
      const v1Data = {
        replacements: [
          { text: "the tangerine tyrant", enabled: true }
        ]
      };

      const result = migrateToV2(v1Data);
      expect(result.enabledNicknames["tangerine-tyrant"]).toBe(true);
    });

    it('handles all default v1 nicknames', () => {
      const v1Data = {
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

      const result = migrateToV2(v1Data);

      expect(result.enabledNicknames["orange-cheeto"]).toBe(true);
      expect(result.enabledNicknames["mango-mussolini"]).toBe(true);
      expect(result.enabledNicknames["cheeto-benito"]).toBe(true);
      expect(result.enabledNicknames["tangerine-tyrant"]).toBe(true);
      expect(result.enabledNicknames["agent-orange"]).toBe(true);
      expect(result.enabledNicknames["dorito-mussolini"]).toBe(false);
      expect(result.enabledNicknames["cheeto-jesus"]).toBe(false);
    });
  });

  describe('v1 to v2 migration - real production data example', () => {
    it('migrates example from spec correctly', () => {
      // Example from I18N_SPEC.md
      const v1Data = {
        enabled: true,
        animationType: "glow",
        replacements: [
          { text: "orange cheeto", enabled: true },
          { text: "mango mussolini", enabled: false },
          { text: "My Custom Name", enabled: true }
        ]
      };

      const result = migrateToV2(v1Data);

      expect(result.schemaVersion).toBe(2);
      expect(result.enabled).toBe(true);
      expect(result.language).toBe("auto");
      expect(result.animationType).toBe("glow");
      expect(result.enabledNicknames["orange-cheeto"]).toBe(true);
      expect(result.enabledNicknames["mango-mussolini"]).toBe(false);
      // Built-ins not in the replacements array should be false
      expect(result.enabledNicknames["cheeto-benito"]).toBe(false);
      expect(result.customNicknames.length).toBe(1);
      expect(result.customNicknames[0].text).toBe("My Custom Name");
      expect(result.customNicknames[0].enabled).toBe(true);
    });
  });
});
