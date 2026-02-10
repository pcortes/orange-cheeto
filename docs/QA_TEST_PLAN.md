# Orange Cheeto i18n QA Test Plan

**Version:** 1.0
**Date:** 2026-02-10
**QA Engineer:** QA-Engineer Agent

---

## Overview

This document provides comprehensive QA testing procedures for the Orange Cheeto extension's i18n (internationalization) feature. Testing covers Chrome and Firefox browsers. Safari is out of scope for v1.

---

## Pre-Test Requirements

### Build Requirements
1. Unified architecture migration complete (Task #1)
2. Build script available at `./scripts/build.sh`
3. All i18n implementation complete (Tasks #3-#8)

### Test Environment
- Chrome (latest stable version)
- Firefox (latest stable version, 109.0 or higher for MV3 support)
- macOS (primary test platform)
- Internet connection for testing real websites

---

## Part 0: Baseline Testing (Pre-i18n)

**Purpose:** Verify current extension works before i18n changes. Run this section immediately.

### 0.1 Chrome Baseline - Load Current Extension

The current extension can be loaded directly without a build script:

**Load in Chrome:**
1. Open Chrome
2. Navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select `/Users/philipjcortes/Desktop/_catchall/orange_cheeto/extensions/chrome/`
6. Verify extension appears in list

**Pass Criteria:**
- [ ] Extension loads without errors
- [ ] Extension icon appears in toolbar
- [ ] Click icon - popup opens
- [ ] Visit news site with "trump" - replacements work
- [ ] Animation effects visible

### 0.2 Firefox Baseline - Load Current Extension

**Load in Firefox:**
1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox" in left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to `/Users/philipjcortes/Desktop/_catchall/orange_cheeto/extensions/firefox/`
6. Select `manifest.json`

**Pass Criteria:**
- [ ] Extension loads without errors
- [ ] Extension icon appears in toolbar
- [ ] Click icon - popup opens
- [ ] Visit news site with "trump" - replacements work
- [ ] Animation effects visible

**Known Issue to Document:**
- Firefox manifest is missing `strict_min_version: "109.0"` in gecko settings (per spec)

### 0.3 Baseline Feature Verification

On both browsers, verify:
- [ ] Enable/disable toggle works
- [ ] Animation selector changes (shimmer, glow, pulse, none)
- [ ] Individual nickname toggles work
- [ ] Custom nickname can be added
- [ ] Custom nickname can be removed (X button)
- [ ] Settings persist after closing popup
- [ ] Replacement count shows in stats bar

---

## Part 1: Chrome Extension Testing (Post-i18n)

### 1.1 Build and Load Extension

```bash
# Build Chrome extension (after unified architecture is complete)
cd /Users/philipjcortes/Desktop/_catchall/orange_cheeto
./scripts/build.sh chrome
```

**Expected output:**
- Build completes without errors
- Extension files generated in `extensions/chrome/`

**Load in Chrome:**
1. Open Chrome
2. Navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select `/Users/philipjcortes/Desktop/_catchall/orange_cheeto/extensions/chrome/`
6. Verify extension appears in list

**Pass Criteria:**
- [ ] Extension loads without errors
- [ ] Extension icon visible in toolbar
- [ ] No errors in `chrome://extensions` page

### 1.2 Extension Manifest Validation

1. On `chrome://extensions`, click "Details" for Orange Cheeto
2. Verify:
   - Name: "Orange Cheeto"
   - Version: matches expected version
   - Permissions: storage, activeTab
   - No warning icons

**Pass Criteria:**
- [ ] Manifest loads correctly
- [ ] All permissions granted
- [ ] No manifest errors

### 1.3 Popup UI Testing

Click extension icon to open popup.

**Basic UI Checks:**
- [ ] Popup opens without delay
- [ ] Title displays correctly
- [ ] Enable/disable toggle present and functional
- [ ] Animation selector present (shimmer, glow, pulse, none)
- [ ] **NEW:** Language dropdown present

**Language Dropdown Tests:**
- [ ] Dropdown shows options: Auto, English, Spanish, French, German
- [ ] Default selection is "Auto"
- [ ] Selecting a language updates the dropdown display
- [ ] Language names show in native format:
  - English
  - Espanol
  - Francais
  - Deutsch

**Nickname List Tests:**
- [ ] Nickname toggles display for current language
- [ ] When "Auto" selected, shows English nicknames by default
- [ ] When specific language selected, shows that language's nicknames
- [ ] Enable/disable toggles work for individual nicknames

### 1.4 Basic Replacement Testing (English)

**Test Site:** Any major news site (e.g., cnn.com, foxnews.com, nytimes.com)

1. Open a news article that mentions "Trump"
2. Verify replacement occurs

**Pass Criteria:**
- [ ] "trump" (case-insensitive) replaced with nickname
- [ ] Replacement styled (shimmer/glow animation visible)
- [ ] Multiple occurrences all replaced
- [ ] Partial matches NOT replaced (e.g., "trumpet" unchanged)

### 1.5 Language Auto-Detection Testing

#### 1.5.1 Spanish Site Test
**Test Site:** elpais.com or elmundo.es

1. Navigate to article mentioning "Trump"
2. Wait for page to fully load

**Expected Behavior (Auto mode):**
- Page language detected as Spanish (`lang="es"` attribute)
- Spanish nicknames used:
  - "El Cheeto Naranja"
  - "Don Peluca"
  - "El Emperador Bronceado"
  - "Trumpudo"
  - "El Tuitero Loco"
  - etc.

**Pass Criteria:**
- [ ] Spanish nicknames appear (not English)
- [ ] Verify at least one Spanish nickname visible
- [ ] Animation works correctly

#### 1.5.2 French Site Test
**Test Site:** lemonde.fr or lefigaro.fr

1. Navigate to article mentioning "Trump"
2. Wait for page to fully load

**Expected Behavior:**
- Page language detected as French (`lang="fr"`)
- French nicknames used:
  - "Le Clown Orange"
  - "Monsieur Toupet"
  - "Le Roi Solarium"
  - "La Carotte Presidentielle"
  - etc.

**Pass Criteria:**
- [ ] French nicknames appear
- [ ] Verify at least one French nickname visible

#### 1.5.3 German Site Test
**Test Site:** spiegel.de or zeit.de

1. Navigate to article mentioning "Trump"
2. Wait for page to fully load

**Expected Behavior:**
- Page language detected as German (`lang="de"`)
- German nicknames used:
  - "Der Orangene Gockel"
  - "Toupetchen"
  - "Der Mauerbauer"
  - "Cheetolinchen"
  - etc.

**Pass Criteria:**
- [ ] German nicknames appear
- [ ] Verify at least one German nickname visible

### 1.6 Manual Language Override Testing

1. Open Spanish news site (elpais.com)
2. Verify Spanish nicknames appear (Auto mode)
3. Open popup, change language to "English"
4. **Page should reprocess** - now showing English nicknames
5. Verify English nicknames now appear on Spanish page

**Pass Criteria:**
- [ ] Manual language selection overrides auto-detection
- [ ] Page reprocesses when language changed
- [ ] Correct nicknames display for selected language

### 1.7 Settings Persistence Testing

1. Open popup, make changes:
   - Toggle extension off, then on
   - Change animation type
   - Change language to French
   - Disable 2 nicknames
2. Close popup (click away)
3. Re-open popup
4. Verify all settings preserved

**Pass Criteria:**
- [ ] Enable/disable state persists
- [ ] Animation type persists
- [ ] Language selection persists
- [ ] Nickname enable/disable states persist

5. Close Chrome completely
6. Re-open Chrome
7. Open popup
8. Verify all settings still preserved

**Pass Criteria:**
- [ ] Settings survive browser restart

### 1.8 Animation Testing

For each animation type, verify on a page with replacements:

**Shimmer (default):**
- [ ] Subtle shimmer effect visible on replacement text
- [ ] Animation is smooth, not jarring

**Glow:**
- [ ] Glowing effect visible
- [ ] Animation is smooth

**Pulse:**
- [ ] Pulsing/breathing effect visible
- [ ] Animation is smooth

**None:**
- [ ] No animation
- [ ] Replacement text styled but static

### 1.9 Edge Cases

#### 1.9.1 Mixed Language Page
Test on a page that has multiple languages (e.g., Wikipedia article with foreign quotes)
- [ ] Extension uses primary page language
- [ ] Does not crash or behave erratically

#### 1.9.2 No Language Attribute
Test on a simple page without `lang` attribute:
- [ ] Falls back to English nicknames (or browser language)
- [ ] No errors in console

#### 1.9.3 Rapid Navigation
Navigate quickly between several pages:
- [ ] Extension processes each page
- [ ] No memory leaks (check DevTools)
- [ ] No console errors

### 1.10 Console Error Check

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Filter for errors
4. Browse several pages with replacements

**Pass Criteria:**
- [ ] No JavaScript errors from extension
- [ ] No warnings from extension
- [ ] No permission errors

---

## Part 2: Firefox Extension Testing

### 2.1 Build and Load Extension

```bash
# Build Firefox extension
cd /Users/philipjcortes/Desktop/_catchall/orange_cheeto
./scripts/build.sh firefox
```

**Load in Firefox:**
1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox" in left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to `/Users/philipjcortes/Desktop/_catchall/orange_cheeto/extensions/firefox/`
6. Select `manifest.json`

**Pass Criteria:**
- [ ] Extension loads without errors
- [ ] Extension appears in "Temporary Extensions" list
- [ ] Extension icon visible in toolbar

### 2.2 Firefox-Specific Manifest Validation

1. On `about:debugging`, click "Inspect" for Orange Cheeto
2. Check console for manifest errors
3. Verify gecko-specific settings loaded

**Firefox Manifest Requirements:**
- `browser_specific_settings.gecko.id` present
- `browser_specific_settings.gecko.strict_min_version: "109.0"`
- Background script uses `scripts: []` array format

**Pass Criteria:**
- [ ] No manifest warnings/errors
- [ ] Extension ID recognized
- [ ] All features work

### 2.3 Popup UI Testing (Firefox)

Same tests as Chrome Section 1.3:
- [ ] Popup opens correctly
- [ ] Language dropdown present and functional
- [ ] All UI elements display correctly

### 2.4 Replacement Testing (Firefox)

Same tests as Chrome Sections 1.4-1.5:
- [ ] English replacements work
- [ ] Spanish site detection works
- [ ] French site detection works
- [ ] German site detection works

### 2.5 Storage Testing (Firefox)

Firefox-specific storage considerations:

1. Make settings changes in popup
2. Close popup
3. Re-open and verify persistence

**Pass Criteria:**
- [ ] `storage.sync` works (or falls back gracefully)
- [ ] Settings persist within session

**Note:** Firefox may handle `storage.sync` differently than Chrome. Document any differences.

### 2.6 Browser Console Check

1. Open Browser Console (Ctrl+Shift+J on Windows, Cmd+Shift+J on Mac)
2. Filter for extension errors
3. Browse pages with replacements

**Pass Criteria:**
- [ ] No errors from extension
- [ ] No permission issues

---

## Part 3: Regression Testing

### 3.1 Original Functionality

Verify core functionality still works after i18n additions:

- [ ] Extension can be disabled/enabled
- [ ] Disabled extension stops all replacements
- [ ] Re-enabling extension resumes replacements
- [ ] Custom nicknames still work (if feature exists)

### 3.2 Migration Testing

For users upgrading from v1:

**Simulate v1 storage:**
1. Manually set storage to v1 format (via DevTools)
2. Reload extension
3. Verify migration runs
4. Check v2 schema applied

**Pass Criteria:**
- [ ] Old settings migrated correctly
- [ ] `animationType` preserved (not reset)
- [ ] Nickname enabled states preserved
- [ ] `schemaVersion: 2` set after migration

---

## Bug Report Template

When bugs are found, document using this format:

```
### Bug #[NUMBER]: [Short Description]

**Severity:** Critical / High / Medium / Low
**Browser:** Chrome / Firefox / Both
**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Console Errors:**
[Any relevant console output]

**Screenshots:**
[If applicable]
```

---

## Test Results Summary

### Chrome Results

| Test Category | Pass | Fail | Blocked |
|---------------|------|------|---------|
| 1.1 Build/Load | | | |
| 1.2 Manifest | | | |
| 1.3 Popup UI | | | |
| 1.4 Basic Replace | | | |
| 1.5 Language Detect | | | |
| 1.6 Manual Override | | | |
| 1.7 Persistence | | | |
| 1.8 Animations | | | |
| 1.9 Edge Cases | | | |
| 1.10 Console Check | | | |

### Firefox Results

| Test Category | Pass | Fail | Blocked |
|---------------|------|------|---------|
| 2.1 Build/Load | | | |
| 2.2 Manifest | | | |
| 2.3 Popup UI | | | |
| 2.4 Replacements | | | |
| 2.5 Storage | | | |
| 2.6 Console Check | | | |

### Regression Results

| Test Category | Pass | Fail | Blocked |
|---------------|------|------|---------|
| 3.1 Original Features | | | |
| 3.2 Migration | | | |

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Engineer | | | |
| Developer | | | |
| Project Lead | | | |

---

## Appendix: Test Sites Reference

### English
- cnn.com
- foxnews.com
- nytimes.com
- bbc.com/news
- theguardian.com

### Spanish
- elpais.com
- elmundo.es
- clarin.com (Argentina)
- eluniversal.com.mx (Mexico)

### French
- lemonde.fr
- lefigaro.fr
- liberation.fr
- lepoint.fr

### German
- spiegel.de
- zeit.de
- sueddeutsche.de
- faz.net
