# Orange Cheeto Unified Architecture

**Date:** 2026-02-10
**Status:** Approved
**Author:** Cross-Browser Research Team

---

## Executive Summary

This document defines the unified architecture for Orange Cheeto, consolidating Chrome, Firefox, and Safari extensions into a single shared codebase. Based on team research findings:

- **98% of code is identical** between Chrome and Firefox - only manifests differ
- Safari already shares code via Xcode project referencing
- All APIs used are cross-browser compatible (`chrome.*` namespace works everywhere)
- Simple vanilla JS project does not need WXT/Plasmo framework overhead
- `webextension-polyfill` optional but unnecessary for current API usage

---

## Current vs. Unified Structure

### Current Structure (Duplicated)

```
orange_cheeto/
├── extensions/
│   ├── chrome/
│   │   ├── manifest.json
│   │   ├── assets/icons/
│   │   ├── assets/store/
│   │   └── src/
│   │       ├── background/service-worker.js
│   │       ├── content/{index,replacer,text-walker,styles}.js
│   │       ├── popup/{index.html,popup.js,styles.css}
│   │       └── shared/storage.js
│   ├── firefox/
│   │   ├── manifest.json          # Only real difference
│   │   ├── assets/icons/          # Duplicate of Chrome
│   │   ├── assets/store/          # Duplicate
│   │   └── src/                   # 100% duplicate of Chrome
│   └── safari/
│       └── Orange Cheeto/         # Xcode project (copies Chrome files)
```

**Problems:**
- Changes require manual sync across 3 directories
- Easy to have Chrome/Firefox drift out of sync
- Firefox src/ is exact copy of Chrome src/
- Assets duplicated 3x

### Unified Structure (Proposed)

```
orange_cheeto/
├── src/                           # SINGLE source of truth
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── index.js
│   │   ├── replacer.js
│   │   ├── text-walker.js
│   │   └── styles.css
│   ├── popup/
│   │   ├── index.html
│   │   ├── popup.js
│   │   └── styles.css
│   ├── shared/
│   │   ├── storage.js
│   │   └── locales.js             # NEW: i18n nickname data
│   └── locales/                   # NEW: locale JSON files
│       ├── en.json
│       ├── es.json
│       ├── fr.json
│       └── de.json
├── manifests/                     # Browser-specific manifests
│   ├── chrome.json
│   ├── firefox.json
│   └── safari.json                # Reference only (Xcode uses its own)
├── assets/
│   ├── icons/                     # Shared icons
│   │   ├── icon-16.png
│   │   ├── icon-32.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── store/                     # Store screenshots (not packaged)
│       └── *.png
├── extensions/                    # BUILD OUTPUT (generated, gitignored)
│   ├── chrome/                    # Ready for Chrome Web Store
│   ├── firefox/                   # Ready for Firefox Add-ons
│   └── safari/                    # Xcode project (special handling)
│       └── Orange Cheeto/
├── scripts/
│   ├── build.sh                   # NEW: Unified build script
│   └── package.sh                 # Legacy (deprecated)
├── docs/
├── site/
└── shared/                        # Legacy (can be removed)
```

---

## Build Script Design

### scripts/build.sh

```bash
#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"
ASSETS_DIR="$PROJECT_ROOT/assets"
MANIFESTS_DIR="$PROJECT_ROOT/manifests"
OUTPUT_DIR="$PROJECT_ROOT/extensions"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
    echo "Usage: $0 [chrome|firefox|safari|all] [--zip] [--skip-safari]"
    echo ""
    echo "Targets:"
    echo "  chrome        Build Chrome extension"
    echo "  firefox       Build Firefox extension"
    echo "  safari        Prepare Safari resources (Xcode handles final build)"
    echo "  all           Build all platforms (default)"
    echo ""
    echo "Options:"
    echo "  --zip         Create ZIP packages after build"
    echo "  --skip-safari Skip Safari in 'all' target (useful for CI without Xcode)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build all platforms"
    echo "  $0 --zip              # Build all + create ZIPs"
    echo "  $0 chrome --zip       # Build Chrome only + ZIP"
    echo "  $0 all --skip-safari  # Build Chrome + Firefox only"
    exit 1
}

build_chrome() {
    echo -e "${YELLOW}Building Chrome extension...${NC}"

    local BUILD_DIR="$OUTPUT_DIR/chrome"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    # Copy manifest
    cp "$MANIFESTS_DIR/chrome.json" "$BUILD_DIR/manifest.json"

    # Copy source (preserving structure)
    cp -r "$SRC_DIR" "$BUILD_DIR/"

    # Copy assets
    mkdir -p "$BUILD_DIR/assets"
    cp -r "$ASSETS_DIR/icons" "$BUILD_DIR/assets/"

    # Remove store assets (not needed in extension)
    rm -rf "$BUILD_DIR/assets/store" 2>/dev/null || true

    echo -e "${GREEN}Chrome build complete: $BUILD_DIR${NC}"
}

build_firefox() {
    echo -e "${YELLOW}Building Firefox extension...${NC}"

    local BUILD_DIR="$OUTPUT_DIR/firefox"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    # Copy manifest (Firefox-specific with gecko settings)
    cp "$MANIFESTS_DIR/firefox.json" "$BUILD_DIR/manifest.json"

    # Copy source (identical to Chrome)
    cp -r "$SRC_DIR" "$BUILD_DIR/"

    # Copy assets
    mkdir -p "$BUILD_DIR/assets"
    cp -r "$ASSETS_DIR/icons" "$BUILD_DIR/assets/"

    echo -e "${GREEN}Firefox build complete: $BUILD_DIR${NC}"
}

build_safari() {
    echo -e "${YELLOW}Preparing Safari resources...${NC}"

    local SAFARI_PROJECT="$OUTPUT_DIR/safari/Orange Cheeto"

    # Check if Xcode project exists
    if [ ! -d "$SAFARI_PROJECT" ]; then
        echo -e "${YELLOW}Safari Xcode project not found. Skipping Safari build.${NC}"
        echo "To set up Safari, run: xcrun safari-web-extension-converter"
        return 0  # Don't fail - Safari is optional
    fi

    # IMPORTANT: Current Xcode project references 'src' and 'assets' as folder references
    # pointing to the original Chrome extension location. The project.pbxproj contains
    # file references like: /* src in Resources */ and /* assets in Resources */
    #
    # Rather than copying files, we update the Xcode project to reference our unified src/.
    # For now, we just verify the project exists and remind the developer to update refs.

    echo -e "${GREEN}Safari Xcode project found.${NC}"
    echo ""
    echo "NOTE: The Xcode project uses folder references to 'src' and 'assets'."
    echo "After migration, update Xcode file references to point to the unified src/ and assets/ directories."
    echo "Or re-run: xcrun safari-web-extension-converter $OUTPUT_DIR/chrome --project-location $OUTPUT_DIR/safari --force"
    echo ""
    echo "Open project: $SAFARI_PROJECT/Orange Cheeto.xcodeproj"
}

create_zip() {
    local BROWSER=$1
    local BUILD_DIR="$OUTPUT_DIR/$BROWSER"
    local VERSION=$(grep -o '"version": "[^"]*"' "$BUILD_DIR/manifest.json" | cut -d'"' -f4)
    local ZIP_NAME="orange-cheeto-${BROWSER}-v${VERSION}.zip"

    echo "Creating $ZIP_NAME..."
    cd "$BUILD_DIR"
    zip -r "$PROJECT_ROOT/$ZIP_NAME" . -x "*.DS_Store" -x "*__MACOSX*"
    cd "$PROJECT_ROOT"

    local SIZE=$(ls -lh "$PROJECT_ROOT/$ZIP_NAME" | awk '{print $5}')
    echo -e "${GREEN}Created: $ZIP_NAME ($SIZE)${NC}"
}

# Parse arguments - handle both "./build.sh chrome --zip" and "./build.sh --zip"
TARGET="all"
ZIP_FLAG=""
SKIP_SAFARI=""

for arg in "$@"; do
    case "$arg" in
        --zip)
            ZIP_FLAG="true"
            ;;
        --skip-safari)
            SKIP_SAFARI="true"
            ;;
        chrome|firefox|safari|all)
            TARGET="$arg"
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown argument: $arg"
            usage
            ;;
    esac
done

case $TARGET in
    chrome)
        build_chrome
        [ "$ZIP_FLAG" ] && create_zip "chrome"
        ;;
    firefox)
        build_firefox
        [ "$ZIP_FLAG" ] && create_zip "firefox"
        ;;
    safari)
        build_safari
        ;;
    all)
        build_chrome
        build_firefox
        # Safari is optional - skip if --skip-safari or if not on macOS
        if [ -z "$SKIP_SAFARI" ]; then
            build_safari || echo -e "${YELLOW}Safari build skipped (optional)${NC}"
        fi
        if [ "$ZIP_FLAG" ]; then
            create_zip "chrome"
            create_zip "firefox"
        fi
        ;;
esac

echo ""
echo -e "${GREEN}Build complete!${NC}"
```

### Key Design Decisions

1. **No bundler/transpiler** - Vanilla JS works in all browsers, no build complexity
2. **Simple file copying** - Just copy src/ to each output directory
3. **Manifest swapping** - Only difference is which manifest.json gets copied
4. **Safari special case** - Xcode project has its own build system; we just update Resources
5. **Optional ZIP** - `--zip` flag for store submissions

---

## Safari Xcode Integration

Safari Web Extensions require an Xcode wrapper app. The architecture handles this:

### Current Project Structure

The existing Xcode project uses **folder references** that point to external directories:

```
extensions/safari/Orange Cheeto/
├── Orange Cheeto.xcodeproj/          # Xcode project file
│   └── project.pbxproj               # Contains file references to src/ and assets/
├── Shared (App)/                     # macOS/iOS app wrapper
│   ├── ViewController.swift
│   ├── Assets.xcassets/
│   └── Resources/                    # App-specific resources (Main.html, etc.)
├── Shared (Extension)/
│   └── SafariWebExtensionHandler.swift
├── macOS (App)/, macOS (Extension)/
└── iOS (App)/, iOS (Extension)/
```

**IMPORTANT:** The current `project.pbxproj` contains folder references like:
- `/* src in Resources */` - References the `src/` folder
- `/* assets in Resources */` - References the `assets/` folder
- `/* manifest.json in Resources */` - References the manifest

These are NOT in a `Resources/` subdirectory - they're direct folder references that Xcode copies into the bundle at build time.

### Migration Path for Unified Architecture

After restructuring to the unified `src/` directory:

**Option A: Re-run converter** (Recommended)
```bash
# After building Chrome output
./scripts/build.sh chrome

# Re-convert to Safari
xcrun safari-web-extension-converter extensions/chrome \
    --project-location extensions/safari \
    --app-name "Orange Cheeto" \
    --bundle-identifier com.thedudeabode.OrangeCheeto \
    --force
```

**Option B: Update Xcode file references manually**
1. Open `Orange Cheeto.xcodeproj` in Xcode
2. Remove old `src` and `assets` folder references
3. Add new references pointing to `../../src` and `../../assets`
4. Verify Build Phases > Copy Bundle Resources includes the new references

### Safari Build Workflow

1. Run `./scripts/build.sh safari` to update Resources
2. Open `Orange Cheeto.xcodeproj` in Xcode
3. Select target (macOS or iOS)
4. Product > Archive for App Store submission
5. Or Product > Run for local testing

### Safari-Specific Considerations

- Safari uses `browser.*` namespace but also supports `chrome.*`
- `activeTab` permission works the same
- `storage.sync` falls back to `storage.local` on Safari (no cross-device sync)
- Must sign with Apple Developer certificate for distribution

---

## i18n Integration

The unified architecture places i18n at the core:

### Locale File Location

```
src/
├── shared/
│   └── locales.js        # Runtime locale loader
└── locales/
    ├── en.json           # English nicknames
    ├── es.json           # Spanish
    ├── fr.json           # French
    └── de.json           # German
```

### Locale File Format

```json
{
  "meta": {
    "code": "es",
    "name": "Spanish",
    "nativeName": "Espanol"
  },
  "nicknames": [
    { "id": "orange-cheeto", "text": "El Cheeto Naranja", "defaultEnabled": true },
    { "id": "mango-mussolini", "text": "Don Peluca", "defaultEnabled": true }
  ]
}
```

### Loading Strategy

For simplicity and offline support, locale data is inlined in `locales.js`:

```javascript
// src/shared/locales.js
export const LOCALES = {
  en: {
    meta: { code: "en", name: "English" },
    nicknames: [
      { id: "orange-cheeto", text: "Orange Cheeto", defaultEnabled: true },
      // ...
    ]
  },
  es: { /* ... */ },
  fr: { /* ... */ },
  de: { /* ... */ }
};

export function getNicknamesForLanguage(langCode) {
  return LOCALES[langCode]?.nicknames || LOCALES.en.nicknames;
}
```

### Why Inline vs. Fetch?

| Approach | Pros | Cons |
|----------|------|------|
| Inline in JS | Works offline, no async, simple | Larger bundle (~5KB) |
| Fetch JSON | Smaller initial load | Async complexity, CORS, offline issues |

**Decision:** Inline. The 4-language nickname data is ~5KB - negligible for a browser extension.

---

## Migration Plan

### Phase 1: Restructure Directories (1-2 hours)

```bash
# From project root
mkdir -p src manifests

# Move Chrome source to unified location
mv extensions/chrome/src/* src/

# Create manifest directory
mv extensions/chrome/manifest.json manifests/chrome.json
mv extensions/firefox/manifest.json manifests/firefox.json

# Move assets to root
mv extensions/chrome/assets ./

# Remove old source directories (keep output dirs for build)
rm -rf extensions/chrome/src
rm -rf extensions/firefox/src
rm -rf extensions/chrome/assets extensions/firefox/assets
```

### Phase 2: Update Build Script (30 min)

1. Create `scripts/build.sh` with content above
2. Make executable: `chmod +x scripts/build.sh`
3. Test: `./scripts/build.sh all --zip`
4. Verify outputs match original structure

### Phase 3: Update Safari Xcode Project (30 min)

1. Open Xcode project
2. Update file references to point to new `src/` location
3. Or run `build.sh safari` to copy files to Resources
4. Test build in Xcode

### Phase 4: Update .gitignore (5 min)

```gitignore
# Build outputs (generated from src/)
extensions/chrome/
extensions/firefox/
# Keep Safari Xcode project structure but ignore build artifacts
extensions/safari/*/build/
extensions/safari/*/*.xcarchive

# Keep manifests tracked
!manifests/

# Build zips
*.zip
```

### Phase 5: Validate & Clean (30 min)

1. `./scripts/build.sh all --zip`
2. Test Chrome extension locally
3. Test Firefox extension locally
4. Build Safari in Xcode
5. Verify all functionality works
6. Delete legacy `scripts/package.sh` or mark deprecated

---

## Effort Estimates

### Unified Architecture Migration

| Task | Time | Notes |
|------|------|-------|
| Directory restructure | 1h | Manual file moves |
| Build script | 1h | Shell script creation |
| Safari Xcode update | 30m | File reference updates |
| Testing all platforms | 1h | Load unpacked, verify |
| Documentation update | 30m | Update READMEs |
| **Total Migration** | **4h** | Single engineer |

### i18n Feature (Post-Migration)

| Task | Time | Notes |
|------|------|-------|
| Locale files + locales.js | 2h | Create data structures |
| Storage schema v2 + migration | 4h | ID-based, language field |
| Language detection | 2h | Tiered detection function |
| Replacer updates | 2h | Use locale nicknames |
| Popup UI (language selector) | 3h | Dropdown + settings |
| Background worker migration | 1h | Run migration on update |
| Testing | 4h | All browsers, migration paths |
| Native speaker review | 2h | Verify translations |
| Store listing updates | 2h | Update descriptions |
| **Total i18n** | **22h** | ~3 days single engineer |

### Combined Total

- **Architecture migration:** 4 hours
- **i18n feature:** 22 hours
- **Grand total:** ~26 hours (3-4 working days)

This is a significant reduction from the original 38-hour estimate because:
1. Single shared codebase = changes made once
2. No duplicate work across Chrome/Firefox
3. Build script handles platform differences

---

## API Compatibility Notes

All current APIs work across Chrome, Firefox, and Safari:

| API | Chrome | Firefox | Safari | Notes |
|-----|--------|---------|--------|-------|
| `chrome.storage.sync` | Yes | Yes | Fallback to local | Safari doesn't sync |
| `chrome.storage.local` | Yes | Yes | Yes | Recommended for Safari |
| `chrome.runtime.*` | Yes | Yes | Yes | Full support |
| `document.documentElement.lang` | Yes | Yes | Yes | Standard DOM |
| `MutationObserver` | Yes | Yes | Yes | Standard DOM |
| `chrome.*` namespace | Native | Alias | Alias | No polyfill needed |

### Recommendation

Use `chrome.*` namespace everywhere. Both Firefox and Safari support it natively (Firefox aliases it to `browser.*` internally).

Do NOT add `webextension-polyfill` unless you need:
- Promise-based APIs (our code already uses async/await with callbacks)
- APIs not currently used

---

## File Ownership

After migration:

| Path | Purpose | Tracked in Git |
|------|---------|----------------|
| `src/` | Source code | Yes |
| `manifests/` | Browser-specific manifests | Yes |
| `assets/icons/` | Extension icons | Yes |
| `assets/store/` | Store screenshots | Yes |
| `scripts/build.sh` | Build script | Yes |
| `extensions/chrome/` | Build output | No |
| `extensions/firefox/` | Build output | No |
| `extensions/safari/` | Xcode project | Partial* |

*Safari Xcode project files are tracked, but build artifacts are not.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Plain shell script over WXT/Plasmo | Project is simple vanilla JS; frameworks add complexity without benefit |
| Inline locales vs. JSON fetch | Offline support, simpler code, negligible size increase |
| chrome.* namespace everywhere | All browsers support it; no polyfill overhead |
| Single src/ directory | Eliminates drift, single source of truth |
| Build outputs in extensions/ | Maintains compatibility with existing store submission workflows |
| Safari Xcode stays special | Apple requires native wrapper; can't fully automate |

---

## Next Steps

1. **Approve this architecture** - Team lead review
2. **Execute migration** - Follow Phase 1-5 above
3. **Implement i18n** - Per I18N_SPEC.md (updated to reference unified architecture)
4. **Update store listings** - Add new language support to descriptions

---

## Appendix: Manifest Differences

### manifests/chrome.json
```json
{
  "manifest_version": 3,
  "name": "Orange Cheeto",
  "version": "1.0.0",
  "description": "Auto-replaces 'trump' with delightful nicknames",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background/service-worker.js"
  },
  "content_scripts": [...],
  "action": {...},
  "icons": {...}
}
```

### manifests/firefox.json
```json
{
  "manifest_version": 3,
  "name": "Orange Cheeto",
  "version": "1.0.0",
  "browser_specific_settings": {
    "gecko": {
      "id": "orange-cheeto@thedudeabode",
      "strict_min_version": "109.0"
    }
  },
  "description": "Auto-replaces 'trump' with delightful nicknames",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "scripts": ["src/background/service-worker.js"]
  },
  "content_scripts": [...],
  "action": {...},
  "icons": {...}
}
```

Key differences:
1. Firefox requires `browser_specific_settings.gecko.id`
2. Firefox background uses `scripts: []` array, Chrome uses `service_worker: ""`
3. Everything else is identical
