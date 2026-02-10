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

### Pending i18n Testing

Tasks #11 and #12 are blocked until implementation of:
- Task #6: Update replacer for i18n nicknames
- Task #7: Add language selector to popup UI
- Task #8: Update background service worker for migration

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
