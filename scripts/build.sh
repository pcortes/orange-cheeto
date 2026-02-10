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
