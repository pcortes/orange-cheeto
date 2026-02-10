#!/bin/bash
# QA Validation Script for Orange Cheeto Extension
# Runs automated checks on build outputs
# Usage: ./scripts/qa-validate.sh [chrome|firefox|all]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    WARN_COUNT=$((WARN_COUNT + 1))
}

check_file_exists() {
    local file="$1"
    local desc="$2"
    if [ -f "$file" ]; then
        pass "$desc exists"
        return 0
    else
        fail "$desc missing: $file"
        return 1
    fi
}

check_dir_exists() {
    local dir="$1"
    local desc="$2"
    if [ -d "$dir" ]; then
        pass "$desc exists"
        return 0
    else
        fail "$desc missing: $dir"
        return 1
    fi
}

check_json_valid() {
    local file="$1"
    local desc="$2"
    if python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
        pass "$desc is valid JSON"
        return 0
    else
        fail "$desc is invalid JSON"
        return 1
    fi
}

check_json_field() {
    local file="$1"
    local field="$2"
    local expected="$3"
    local desc="$4"

    local actual=$(python3 -c "import json; print(json.load(open('$file')).get('$field', ''))" 2>/dev/null)

    if [ "$actual" == "$expected" ]; then
        pass "$desc: $field = $expected"
        return 0
    else
        fail "$desc: $field expected '$expected', got '$actual'"
        return 1
    fi
}

check_json_nested_field() {
    local file="$1"
    local path="$2"
    local expected="$3"
    local desc="$4"

    local actual=$(python3 -c "
import json
data = json.load(open('$file'))
keys = '$path'.split('.')
for k in keys:
    data = data.get(k, {})
print(data if data else '')
" 2>/dev/null)

    if [ "$actual" == "$expected" ]; then
        pass "$desc"
        return 0
    else
        fail "$desc: expected '$expected', got '$actual'"
        return 1
    fi
}

validate_chrome() {
    echo ""
    echo "================================"
    echo "Validating Chrome Extension"
    echo "================================"

    local CHROME_DIR="$PROJECT_ROOT/extensions/chrome"
    local MANIFEST="$CHROME_DIR/manifest.json"

    # Check directory structure
    check_dir_exists "$CHROME_DIR" "Chrome build directory"
    check_file_exists "$MANIFEST" "Chrome manifest.json"

    if [ ! -f "$MANIFEST" ]; then
        fail "Cannot continue Chrome validation without manifest"
        return 1
    fi

    # Validate manifest JSON
    check_json_valid "$MANIFEST" "Chrome manifest"

    # Check manifest fields
    check_json_field "$MANIFEST" "manifest_version" "3" "Chrome manifest_version"
    check_json_field "$MANIFEST" "name" "Orange Cheeto" "Chrome extension name"

    # Check required files referenced in manifest
    check_file_exists "$CHROME_DIR/src/background/service-worker.js" "Background service worker"
    check_file_exists "$CHROME_DIR/src/popup/index.html" "Popup HTML"
    check_file_exists "$CHROME_DIR/src/popup/popup.js" "Popup JS"
    check_file_exists "$CHROME_DIR/src/content/index.js" "Content script index"
    check_file_exists "$CHROME_DIR/src/content/replacer.js" "Replacer module"
    check_file_exists "$CHROME_DIR/src/shared/storage.js" "Storage module"

    # Check icons
    check_file_exists "$CHROME_DIR/assets/icons/icon-16.png" "Icon 16px"
    check_file_exists "$CHROME_DIR/assets/icons/icon-32.png" "Icon 32px"
    check_file_exists "$CHROME_DIR/assets/icons/icon-48.png" "Icon 48px"
    check_file_exists "$CHROME_DIR/assets/icons/icon-128.png" "Icon 128px"

    # JavaScript syntax validation
    if command -v node &> /dev/null; then
        for js_file in "$CHROME_DIR/src/shared/storage.js" \
                       "$CHROME_DIR/src/content/replacer.js" \
                       "$CHROME_DIR/src/content/index.js" \
                       "$CHROME_DIR/src/popup/popup.js" \
                       "$CHROME_DIR/src/background/service-worker.js"; do
            if [ -f "$js_file" ]; then
                local basename=$(basename "$js_file")
                if node --check "$js_file" 2>/dev/null; then
                    pass "JS syntax valid: $basename"
                else
                    fail "JS syntax error: $basename"
                fi
            fi
        done
    else
        warn "Node.js not available - skipping JS syntax checks"
    fi

    # Check for i18n files (post-migration)
    if [ -f "$CHROME_DIR/src/shared/locales.js" ]; then
        pass "Locales.js exists (i18n ready)"
        # Validate locales.js syntax too
        if node --check "$CHROME_DIR/src/shared/locales.js" 2>/dev/null; then
            pass "JS syntax valid: locales.js"
        else
            fail "JS syntax error: locales.js"
        fi
        # Verify all required languages are present
        for lang in en es fr de; do
            if grep -qE "^[[:space:]]*${lang}:" "$CHROME_DIR/src/shared/locales.js" 2>/dev/null; then
                pass "Locale present: $lang"
            else
                fail "Locale missing: $lang"
            fi
        done
    else
        warn "Locales.js not found (i18n not yet implemented)"
    fi

    # Check for language detection (post-migration)
    if grep -q "detectPageLanguage" "$CHROME_DIR/src/content/index.js" 2>/dev/null; then
        pass "Language detection function present"
    else
        warn "Language detection not found (i18n not yet implemented)"
    fi
}

validate_firefox() {
    echo ""
    echo "================================"
    echo "Validating Firefox Extension"
    echo "================================"

    local FIREFOX_DIR="$PROJECT_ROOT/extensions/firefox"
    local MANIFEST="$FIREFOX_DIR/manifest.json"

    # Check directory structure
    check_dir_exists "$FIREFOX_DIR" "Firefox build directory"
    check_file_exists "$MANIFEST" "Firefox manifest.json"

    if [ ! -f "$MANIFEST" ]; then
        fail "Cannot continue Firefox validation without manifest"
        return 1
    fi

    # Validate manifest JSON
    check_json_valid "$MANIFEST" "Firefox manifest"

    # Check manifest fields
    check_json_field "$MANIFEST" "manifest_version" "3" "Firefox manifest_version"
    check_json_field "$MANIFEST" "name" "Orange Cheeto" "Firefox extension name"

    # Check Firefox-specific settings
    if python3 -c "
import json
data = json.load(open('$MANIFEST'))
gecko = data.get('browser_specific_settings', {}).get('gecko', {})
print('ok' if gecko.get('id') else '')
" 2>/dev/null | grep -q "ok"; then
        pass "Firefox gecko.id present"
    else
        fail "Firefox gecko.id missing"
    fi

    # Check strict_min_version (required per spec)
    if python3 -c "
import json
data = json.load(open('$MANIFEST'))
gecko = data.get('browser_specific_settings', {}).get('gecko', {})
print(gecko.get('strict_min_version', ''))
" 2>/dev/null | grep -q "109"; then
        pass "Firefox strict_min_version present"
    else
        warn "Firefox strict_min_version missing (should be 109.0)"
    fi

    # Check background scripts format (Firefox uses array, not service_worker string)
    if python3 -c "
import json
data = json.load(open('$MANIFEST'))
bg = data.get('background', {})
print('ok' if 'scripts' in bg else '')
" 2>/dev/null | grep -q "ok"; then
        pass "Firefox background uses 'scripts' array format"
    else
        fail "Firefox background should use 'scripts' array, not 'service_worker'"
    fi

    # Check required files
    check_file_exists "$FIREFOX_DIR/src/background/service-worker.js" "Background script"
    check_file_exists "$FIREFOX_DIR/src/popup/index.html" "Popup HTML"
    check_file_exists "$FIREFOX_DIR/src/content/index.js" "Content script"
    check_file_exists "$FIREFOX_DIR/src/shared/storage.js" "Storage module"

    # Check icons
    check_file_exists "$FIREFOX_DIR/assets/icons/icon-48.png" "Icon 48px"
    check_file_exists "$FIREFOX_DIR/assets/icons/icon-128.png" "Icon 128px"
}

validate_unified_structure() {
    echo ""
    echo "================================"
    echo "Validating Unified Architecture"
    echo "================================"

    # Check if unified src/ directory exists (post-migration)
    if [ -d "$PROJECT_ROOT/src" ]; then
        pass "Unified src/ directory exists"
        check_dir_exists "$PROJECT_ROOT/src/background" "Unified src/background"
        check_dir_exists "$PROJECT_ROOT/src/content" "Unified src/content"
        check_dir_exists "$PROJECT_ROOT/src/popup" "Unified src/popup"
        check_dir_exists "$PROJECT_ROOT/src/shared" "Unified src/shared"
    else
        warn "Unified src/ directory not found (architecture migration not complete)"
    fi

    # Check if build script exists
    if [ -f "$PROJECT_ROOT/scripts/build.sh" ]; then
        pass "Build script exists"
        if [ -x "$PROJECT_ROOT/scripts/build.sh" ]; then
            pass "Build script is executable"
        else
            fail "Build script is not executable"
        fi
    else
        warn "Build script not found (architecture migration not complete)"
    fi

    # Check manifests directory
    if [ -d "$PROJECT_ROOT/manifests" ]; then
        pass "Manifests directory exists"
        check_file_exists "$PROJECT_ROOT/manifests/chrome.json" "Chrome manifest template"
        check_file_exists "$PROJECT_ROOT/manifests/firefox.json" "Firefox manifest template"
    else
        warn "Manifests directory not found (architecture migration not complete)"
    fi
}

print_summary() {
    echo ""
    echo "================================"
    echo "Validation Summary"
    echo "================================"
    echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
    echo -e "${RED}Failed: $FAIL_COUNT${NC}"
    echo -e "${YELLOW}Warnings: $WARN_COUNT${NC}"
    echo ""

    if [ $FAIL_COUNT -gt 0 ]; then
        echo -e "${RED}VALIDATION FAILED${NC}"
        return 1
    elif [ $WARN_COUNT -gt 0 ]; then
        echo -e "${YELLOW}VALIDATION PASSED WITH WARNINGS${NC}"
        return 0
    else
        echo -e "${GREEN}VALIDATION PASSED${NC}"
        return 0
    fi
}

# Main
TARGET="${1:-all}"

echo "Orange Cheeto QA Validation"
echo "=========================="
echo "Target: $TARGET"
echo "Project: $PROJECT_ROOT"

case $TARGET in
    chrome)
        validate_chrome
        ;;
    firefox)
        validate_firefox
        ;;
    unified)
        validate_unified_structure
        ;;
    all)
        validate_unified_structure
        validate_chrome
        validate_firefox
        ;;
    *)
        echo "Usage: $0 [chrome|firefox|unified|all]"
        exit 1
        ;;
esac

print_summary
