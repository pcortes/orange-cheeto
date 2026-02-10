# Orange Cheeto i18n Spec: Multi-Language Support

**Date:** 2026-02-10
**Status:** Draft v4 (post red-shirt review #2)
**Complexity:** MEDIUM
**Estimated Time:** 3 working days (single engineer)

> **Note:** This spec has been updated to use the unified architecture defined in
> [UNIFIED_ARCHITECTURE.md](./UNIFIED_ARCHITECTURE.md). All code changes are made once
> in `src/` and built for all platforms via `scripts/build.sh`.

---

## Overview

Add automatic language detection so the extension displays culturally appropriate satirical nicknames based on the webpage's language.

**Supported Languages:**
- English (en) - existing
- Spanish (es) - new
- French (fr) - new
- German (de) - new

**Browser Scope:**
- Chrome: IN SCOPE
- Firefox: IN SCOPE
- Safari: OUT OF SCOPE for v1 (uses Chrome extension code but Xcode wrapper complicates testing; defer to v1.1)

---

## Language Detection

### Approach: Tiered Detection with Normalization

```javascript
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
```

**Guarantees:**
- Always returns one of: `en`, `es`, `fr`, `de`
- Region variants map to base language (`es-MX` → `es`)
- Comma-separated headers parsed correctly
- Never returns null/undefined

---

## Storage Schema & Migration

### Current Production Schema (v1)

**IMPORTANT:** Production storage uses **top-level keys** (not a nested `settings` object).

```javascript
// src/shared/storage.js - actual defaults
// Keys are stored at TOP LEVEL in chrome.storage.sync
defaults: {
  enabled: true,
  animationType: 'shimmer', // NOTE: 'animationType' not 'animation'
  replacements: [
    { text: "orange cheeto", enabled: true },
    { text: "mango mussolini", enabled: true },
    { text: "cheeto benito", enabled: true },
    { text: "the tangerine tyrant", enabled: true },
    { text: "agent orange", enabled: true },
    { text: "dorito mussolini", enabled: false },
    { text: "cheeto jesus", enabled: false }
  ]
}

// Storage access pattern (top-level, not nested):
// chrome.storage.sync.get(defaults) returns { enabled, animationType, replacements }
// NOT { settings: { enabled, animationType, replacements } }
```

### New Schema (v2)

**Keys remain at top-level** in chrome.storage.sync:

```javascript
// New defaults for v2
defaults: {
  schemaVersion: 2,
  enabled: true,
  language: "auto",  // "auto" | "en" | "es" | "fr" | "de"
  animationType: 'shimmer', // Preserved from v1 (NOT 'animation')
  enabledNicknames: {
    // ID-based, language-independent
    "orange-cheeto": true,
    "mango-mussolini": true,
    "cheeto-benito": true,
    "tangerine-tyrant": true,
    "agent-orange": true,
    "dorito-mussolini": false,
    "cheeto-jesus": false
  },
  customNicknames: [
    // User-added entries (shown in ALL languages)
    { text: "User Custom", enabled: true }
  ]
}
```

### Migration Algorithm

```javascript
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
    animationType: oldData.animationType ?? 'shimmer', // Preserve existing animation
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
 * Safely load and migrate settings
 * @returns {Promise<object>} Settings (migrated if needed)
 */
async function safeLoadSettings() {
  try {
    // Read TOP-LEVEL keys (not nested in 'settings')
    const data = await chrome.storage.sync.get(OrangeCheetoStorage.defaults);
    return migrateToV2(data);
  } catch (e) {
    console.error('[Orange Cheeto] Settings load error, using defaults:', e);
    return getDefaultSettings();
  }
}
```

### Migration Example (Before/After)

**v1 Storage (current production):**
```json
{
  "enabled": true,
  "animationType": "glow",
  "replacements": [
    { "text": "orange cheeto", "enabled": true },
    { "text": "mango mussolini", "enabled": false },
    { "text": "My Custom Name", "enabled": true }
  ]
}
```

**v2 Storage (after migration):**
```json
{
  "schemaVersion": 2,
  "enabled": true,
  "language": "auto",
  "animationType": "glow",
  "enabledNicknames": {
    "orange-cheeto": true,
    "mango-mussolini": false,
    "cheeto-benito": false,
    "tangerine-tyrant": false,
    "agent-orange": false,
    "dorito-mussolini": false,
    "cheeto-jesus": false
  },
  "customNicknames": [
    { "text": "My Custom Name", "enabled": true }
  ]
}
```

**Migration Guarantees:**
- `schemaVersion` prevents double-migration
- Built-in nicknames mapped by normalized text → stable ID
- Custom nicknames preserved in `customNicknames[]`
- Unknown built-ins treated as custom (safe)
- Parse failures fall back to defaults (no data loss)

---

## Locale Files

### Location & Packaging (Unified Architecture)

```
src/
├── shared/
│   └── locales.js        # Inline locale data + getter functions
└── locales/
    ├── en.json           # English nicknames (source of truth)
    ├── es.json           # Spanish
    ├── fr.json           # French
    └── de.json           # German
```

**Unified Build:** Files live in the shared `src/` directory. Running `./scripts/build.sh all` copies them to Chrome, Firefox, and Safari output directories automatically. No duplicate files to maintain.

### Locale File Format

```json
{
  "meta": {
    "code": "es",
    "name": "Spanish",
    "nativeName": "Español"
  },
  "nicknames": [
    { "id": "orange-cheeto", "text": "El Cheeto Naranja", "defaultEnabled": true },
    { "id": "mango-mussolini", "text": "Don Peluca", "defaultEnabled": true },
    { "id": "cheeto-benito", "text": "El Emperador Bronceado", "defaultEnabled": true },
    { "id": "tangerine-tyrant", "text": "Trumpudo", "defaultEnabled": true },
    { "id": "agent-orange", "text": "El Tuitero Loco", "defaultEnabled": true },
    { "id": "dorito-mussolini", "text": "Mandarina en Jefe", "defaultEnabled": false },
    { "id": "cheeto-jesus", "text": "El Güero Gritón", "defaultEnabled": false }
  ]
}
```

### Loading Strategy & Source of Truth

**Source of truth:** `src/shared/locales.js` with inline constants.

The `src/locales/*.json` files are **optional documentation** for translators/reviewers, but the runtime code uses the inline `LOCALES` object in `locales.js`. This avoids async fetch complexity and works offline.

**Why not JSON files at runtime?**
- Requires async fetch (complexity)
- CORS issues in some contexts
- Offline support problems
- Extra packaging considerations

**Drift prevention:** When updating nicknames, update `locales.js` directly. The JSON files can be regenerated from `locales.js` if needed for translator review.

```javascript
// src/shared/locales.js - THIS IS THE SOURCE OF TRUTH
const LOCALES = {
  en: {
    meta: { code: "en", name: "English", nativeName: "English" },
    nicknames: [
      { id: "orange-cheeto", text: "Orange Cheeto", defaultEnabled: true },
      // ... all English nicknames
    ]
  },
  es: { /* Spanish nicknames */ },
  fr: { /* French nicknames */ },
  de: { /* German nicknames */ }
};

function getNicknamesForLanguage(langCode) {
  return LOCALES[langCode]?.nicknames || LOCALES.en.nicknames;
}
```

---

## Runtime Refresh Model

### When Language is Recalculated

| Event | Action |
|-------|--------|
| Page load (init) | Detect language, load nicknames, process DOM |
| Settings change (popup) | Re-detect if "auto", reload nicknames, **reprocess entire DOM** |
| SPA navigation | **No automatic re-detect** (too complex for v1) |
| Manual refresh | Full reload naturally re-detects |

### Reprocessing Behavior

When language or nickname settings change:
1. Remove all existing `.oc-replaced` span elements
2. Restore original text nodes
3. Re-run replacement with new language/settings

```javascript
// In replacer.js
function reprocessPage() {
  // Remove existing replacements (uses .oc-replaced spans, NOT <orange-cheeto> tags)
  document.querySelectorAll('.oc-replaced').forEach(el => {
    const text = document.createTextNode(el.dataset.original);
    el.replaceWith(text);
  });

  // Re-run with current settings
  processDocument();
}
```

**Note:** The current implementation uses `<span class="oc-replaced">` elements, not custom `<orange-cheeto>` tags.

**SPA Note:** For v1, users on SPAs (React, Vue) that change page language without full reload will need to manually refresh. This is acceptable for v1 scope.

---

## Files to Modify (Unified Architecture)

All changes are made **once** in the shared `src/` directory. The build script (`scripts/build.sh`) copies them to all platform output directories.

### Shared Source (`src/`)

| File | Changes |
|------|---------|
| `shared/storage.js` | New schema, migration logic, schemaVersion |
| `shared/locales.js` | **NEW** - Inline locale data + getter |
| `content/index.js` | Add `detectPageLanguage()`, pass to replacer |
| `content/replacer.js` | Accept language param, use locale nicknames, add `reprocessPage()` |
| `popup/index.html` | Add language selector dropdown |
| `popup/popup.js` | Render language UI, trigger reprocess on change |
| `background/service-worker.js` | Handle settings migration on install/update |

### Locale Data (`src/locales/`)

| File | Status |
|------|--------|
| `en.json` | **NEW** - English nicknames |
| `es.json` | **NEW** - Spanish nicknames |
| `fr.json` | **NEW** - French nicknames |
| `de.json` | **NEW** - German nicknames |

### Manifests (`manifests/`)

| File | Changes |
|------|---------|
| `chrome.json` | No changes needed |
| `firefox.json` | No changes needed |

### Build Script

| File | Changes |
|------|---------|
| `scripts/build.sh` | Already handles copying src/ to all platforms |

---

## Nicknames by Language

### English (Existing)
1. Orange Cheeto
2. Mango Mussolini
3. Cheeto Benito
4. The Tangerine Tyrant
5. Agent Orange
6. Dorito Mussolini
7. Cheeto Jesus

### Spanish
| ID | Nickname | Translation |
|----|----------|-------------|
| orange-cheeto | El Cheeto Naranja | The Orange Cheeto |
| mango-mussolini | Don Peluca | Mr. Toupee |
| cheeto-benito | El Emperador Bronceado | The Bronzed Emperor |
| tangerine-tyrant | Trumpudo | Chubby Trump |
| agent-orange | El Tuitero Loco | The Crazy Tweeter |
| dorito-mussolini | Mandarina en Jefe | Tangerine in Chief |
| cheeto-jesus | El Güero Gritón | The Shouting Blond |

### French
| ID | Nickname | Translation |
|----|----------|-------------|
| orange-cheeto | Le Clown Orange | The Orange Clown |
| mango-mussolini | Monsieur Toupet | Mr. Toupee/Audacity |
| cheeto-benito | Le Roi Solarium | The Tanning Bed King |
| tangerine-tyrant | La Carotte Présidentielle | The Presidential Carrot |
| agent-orange | Tonton Tango | Uncle Tango |
| dorito-mussolini | Le Grand Blond | The Tall Blond |
| cheeto-jesus | Sa Majesté des Tweets | His Majesty of Tweets |

### German
| ID | Nickname | Translation |
|----|----------|-------------|
| orange-cheeto | Der Orangene Gockel | The Orange Rooster |
| mango-mussolini | Toupetchen | Little Toupee |
| cheeto-benito | Der Mauerbauer | The Wall Builder |
| tangerine-tyrant | Cheetolinchen | Little Cheeto |
| agent-orange | Der Goldene Polterer | The Golden Blusterer |
| dorito-mussolini | Schwurbel-Donald | Rambling Donald |
| cheeto-jesus | Das Lachsorangen-Gespenst | The Salmon-Orange Ghost |

---

## Quality Gates

### Before Implementation
- [x] Spec reviewed by red-shirt team
- [x] P0/P1 issues addressed

### Before Release
- [ ] Native speaker review for es/fr/de nicknames
- [ ] Policy review for store-facing content risk
- [ ] Migration tested with real v1 user data samples
- [ ] Cross-browser QA (Chrome + Firefox)

---

## Revised Effort Estimate (Unified Architecture)

With the unified architecture, changes are made **once** and automatically apply to all browsers.

| Task | Time | Notes |
|------|------|-------|
| Storage + migration | 4h | Single implementation in `src/shared/` |
| Language detection | 2h | Single implementation in `src/content/` |
| Locale data files | 2h | Create JSON + locales.js |
| Replacer updates | 2h | Single implementation |
| Popup UI | 3h | Single implementation |
| Background worker | 1h | Single implementation |
| QA + edge cases | 6h | Test Chrome + Firefox (Safari deferred to v1.1) |
| Store updates | 2h | Chrome + Firefox listings only |
| **Total** | **22h** | ~3 working days |

**Savings:** 16 hours saved vs. original 38h estimate by eliminating duplicate implementations.

**Calendar time:** 3 working days (single engineer)

---

## Implementation Order (Unified Architecture)

**Prerequisites:** Complete unified architecture migration per [UNIFIED_ARCHITECTURE.md](./UNIFIED_ARCHITECTURE.md)

1. Create `src/locales/*.json` with all nickname data
2. Create `src/shared/locales.js` with inline locale data + getter
3. Update `src/shared/storage.js` with v2 schema + migration
4. Update `src/background/service-worker.js` to run migration on install/update
5. Add `detectPageLanguage()` to `src/content/index.js`
6. Update `src/content/replacer.js` to use locale nicknames + reprocess
7. Add language selector to `src/popup/` UI
8. Run `./scripts/build.sh all` to generate browser packages
9. QA: migration, language detection, cross-browser (Chrome + Firefox only; Safari deferred)
10. Native speaker review of nicknames
11. Update store listings

**Note:** Step 7 ("Duplicate changes to Firefox") is eliminated - the build script handles it automatically.

---

## Decision Log

| Finding | Resolution |
|---------|------------|
| F1: Missing background worker | Added to file list |
| F2: Migration undefined | Full algorithm with schemaVersion added |
| F3: Locale packaging ambiguous | Clarified: inside src/, no build changes |
| F4: Detection lacks normalization | Added normalizeLocale() + parseContentLanguage() |
| F5: 95% claim unvalidated | Removed claim |
| F6: Runtime refresh undefined | Added refresh model table + reprocessPage() |
| F7: Cross-browser underestimated | Updated to 22h with unified architecture |
| F8: Safari scope unclear | Explicitly OUT OF SCOPE for v1 |
| F9: Manifest changes unclear | Clarified: no changes needed |
| F10: Locale quality process | Added quality gates section |

### Review #2 Fixes (2026-02-10)

| Finding | Resolution |
|---------|------------|
| F1: Storage shape mismatch | Fixed: uses top-level keys, `animationType` not `animation` |
| F2: await in non-async function | Fixed: `safeLoadSettings` now marked `async` |
| F3: Safari path mismatch | Updated UNIFIED_ARCHITECTURE.md with actual Xcode project structure |
| F4: all target fails on missing Safari | Fixed: Safari build is optional, won't fail the build |
| F5: --zip as first arg fails | Fixed: argument parsing handles any order |
| F6: Wrong DOM marker | Fixed: uses `.oc-replaced` spans, not `<orange-cheeto>` tags |
| F7: Safari in QA despite out-of-scope | Fixed: removed Safari from v1 QA/estimates |
| F8: Dual locale source of truth | Fixed: `locales.js` is canonical, JSON files are optional docs |
| F9: Estimate mismatch in decision log | Fixed: aligned to 22h |
