# Orange Cheeto QA Findings

**Last Updated:** 2026-02-10
**QA Engineer:** qa-engineer

---

## Active Issues

*No active issues at this time.*

---

## Resolved Issues

### Issue #1: Firefox manifest missing strict_min_version (RESOLVED)

**Severity:** Medium
**Browser:** Firefox
**Status:** RESOLVED
**Found:** 2026-02-10
**Resolved:** 2026-02-10

**Description:**
The Firefox manifest was missing the `strict_min_version` field in the gecko settings.

**Resolution:**
Fixed in Task #2 (Create unified build script). The `manifests/firefox.json` now includes `strict_min_version: "109.0"`. Verified by automated QA validation.

---

### Issue #2: locales.js missing from content scripts (RESOLVED)

**Severity:** Critical
**Browser:** Chrome / Firefox
**Status:** RESOLVED
**Found:** 2026-02-10
**Resolved:** 2026-02-10

**Description:**
The manifest `content_scripts` array was missing `src/shared/locales.js`. This caused `OrangeCheetoLocales` to be undefined in the content script context, which would cause `storage.js::getEnabledReplacements()` to return an empty array and no replacements would occur.

**Steps to Reproduce:**
1. Load extension
2. Navigate to a page with "trump" text
3. No replacements would happen

**Impact:**
Extension would be completely non-functional - zero replacements would occur.

**Resolution:**
Added `src/shared/locales.js` as the first entry in the content_scripts js array in both `manifests/chrome.json` and `manifests/firefox.json`. Locales must load before storage.js since storage.js depends on `OrangeCheetoLocales`.

---

## Migration Testing Checklist

When testing the v1 -> v2 storage migration, verify these scenarios:

### Scenario 1: Fresh Install
- [ ] New user gets v2 schema with `schemaVersion: 2`
- [ ] Default language is "auto"
- [ ] All default nicknames enabled per locale defaults

### Scenario 2: Upgrade from v1 (Default Settings)
**v1 state:**
```json
{
  "enabled": true,
  "animationType": "shimmer",
  "replacements": [
    { "text": "orange cheeto", "enabled": true },
    { "text": "mango mussolini", "enabled": true },
    ...
  ]
}
```

**Expected v2 state:**
- [ ] `schemaVersion: 2` added
- [ ] `language: "auto"` added
- [ ] `animationType` preserved as "shimmer"
- [ ] `enabledNicknames` object created with ID mappings
- [ ] No `customNicknames` (none existed)

### Scenario 3: Upgrade from v1 (Modified Settings)
**v1 state with user changes:**
```json
{
  "enabled": false,
  "animationType": "glow",
  "replacements": [
    { "text": "orange cheeto", "enabled": false },
    { "text": "mango mussolini", "enabled": true },
    { "text": "My Custom Name", "enabled": true, "isCustom": true }
  ]
}
```

**Expected v2 state:**
- [ ] `enabled: false` preserved
- [ ] `animationType: "glow"` preserved
- [ ] `enabledNicknames["orange-cheeto"]: false` (was disabled)
- [ ] `enabledNicknames["mango-mussolini"]: true` (was enabled)
- [ ] `customNicknames` contains "My Custom Name"

### Scenario 4: Double Migration Prevention
- [ ] Running migration on v2 data does NOT modify it
- [ ] `schemaVersion: 2` check prevents re-migration

---

## Testing Notes

### Baseline Testing Status

The current extensions (pre-i18n) are ready for manual baseline testing:

**Chrome:**
- Location: `/Users/philipjcortes/Desktop/_catchall/orange_cheeto/extensions/chrome/`
- Load via: `chrome://extensions` > Developer mode > Load unpacked

**Firefox:**
- Location: `/Users/philipjcortes/Desktop/_catchall/orange_cheeto/extensions/firefox/`
- Load via: `about:debugging` > This Firefox > Load Temporary Add-on > select manifest.json

### Chrome Automated QA Validation (PASSED)

**Date:** 2026-02-10

Ran `./scripts/qa-validate.sh chrome` with 27/27 tests passed:
- All directory structure checks passed
- manifest.json valid with manifest_version: 3
- All required JS files present and syntactically valid
- All icon sizes present (16, 32, 48, 128)
- locales.js exists with all 4 languages (en, es, fr, de)
- Language detection function present in content script

### Chrome Manual Testing Checklist

The following items require manual browser testing:

**Extension Loading:**
- [ ] Extension loads without errors in Chrome
- [ ] No console errors on popup open

**Popup UI:**
- [ ] Master toggle works (enable/disable)
- [ ] Language selector shows all 5 options (Auto, English, Espanol, Francais, Deutsch)
- [ ] Language note shows detected language when on "Auto"
- [ ] Nickname list renders correctly for each language
- [ ] Nickname toggles work (enable/disable individual)
- [ ] Custom nickname input works (add/remove)
- [ ] Animation selector works (shimmer/glow/pulse/none)
- [ ] Ko-fi donate link works
- [ ] Privacy and Terms links work

**Replacement Functionality:**
- [ ] Replacements happen on news sites with "trump" content
- [ ] Case preservation works (trump -> orange cheeto, Trump -> Orange Cheeto, TRUMP -> ORANGE CHEETO)
- [ ] Animation effects display correctly
- [ ] Badge count updates accurately
- [ ] Disabling extension reverts all replacements

**i18n Language Detection:**
- [ ] English site (cnn.com) detects "en"
- [ ] Spanish site (elpais.com) detects "es"
- [ ] French site (lemonde.fr) detects "fr"
- [ ] German site (spiegel.de) detects "de"
- [ ] Nicknames change to match detected language

**Settings Persistence:**
- [ ] Settings persist after browser restart
- [ ] Settings sync across devices (if signed in)

### Firefox Automated QA Validation (PASSED)

**Date:** 2026-02-10

Ran `./scripts/qa-validate.sh firefox` with 14/14 tests passed:
- All directory structure checks passed
- manifest.json valid with manifest_version: 3
- Firefox gecko.id present
- Firefox strict_min_version present (109.0)
- Firefox background uses 'scripts' array format (not service_worker)
- All required files present

### Firefox Manual Testing Checklist

The following items require manual browser testing:

**Extension Loading:**
- [ ] Extension loads without errors in Firefox
- [ ] No console errors on popup open

**Popup UI:**
- [ ] Master toggle works (enable/disable)
- [ ] Language selector shows all 5 options (Auto, English, Espanol, Francais, Deutsch)
- [ ] Nickname toggles work
- [ ] Custom nickname input works
- [ ] Animation selector works

**Replacement Functionality:**
- [ ] Replacements happen on pages with "trump" content
- [ ] Case preservation works
- [ ] Animation effects display correctly
- [ ] Disabling extension reverts all replacements

**i18n Language Detection:**
- [ ] Auto-detection works correctly
- [ ] Manual language selection works

**Settings Persistence:**
- [ ] Settings persist after browser restart

---

## Issue Template

```markdown
### Issue #[NUMBER]: [Title]

**Severity:** Critical / High / Medium / Low
**Browser:** Chrome / Firefox / Both
**Status:** New / In Progress / Resolved
**Found:** [Date]

**Description:**
[What is the issue]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Impact:**
[Who/what is affected]

**Resolution:**
[How was it fixed, or how should it be fixed]
```
