#!/bin/bash

# Orange Cheeto - Chrome Web Store Packaging Script
# Creates a ZIP file ready for upload to Chrome Web Store

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CHROME_EXT_DIR="$PROJECT_ROOT/extensions/chrome"
BUILD_DIR="$PROJECT_ROOT/build"
EXTENSION_NAME="orange-cheeto"
VERSION=$(grep -o '"version": "[^"]*"' "$CHROME_EXT_DIR/manifest.json" | cut -d'"' -f4)
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

echo -e "${YELLOW}Packaging Orange Cheeto v${VERSION}${NC}"
echo "=================================="

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo "Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR"

# Files to include in the extension
echo "Copying extension files..."

# Copy manifest
cp "$CHROME_EXT_DIR/manifest.json" "$BUILD_DIR/"

# Copy assets (excluding store screenshots - those are uploaded separately)
mkdir -p "$BUILD_DIR/assets"
cp -r "$CHROME_EXT_DIR/assets/icons" "$BUILD_DIR/assets/"

# Copy source files
cp -r "$CHROME_EXT_DIR/src" "$BUILD_DIR/"

# Create the ZIP file
echo "Creating ZIP file..."
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -x "*.DS_Store" -x "*__MACOSX*"
cd "$PROJECT_ROOT"

# Clean up build directory
rm -rf "$BUILD_DIR"

# Get file size
SIZE=$(ls -lh "$PROJECT_ROOT/$ZIP_NAME" | awk '{print $5}')

echo ""
echo -e "${GREEN}Success!${NC}"
echo "=================================="
echo "Created: $ZIP_NAME"
echo "Size: $SIZE"
echo ""
echo "Next steps:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Pay \$5 registration fee (one-time) if not already done"
echo "3. Click 'New Item'"
echo "4. Upload $ZIP_NAME"
echo "5. Fill in listing details (see docs/STORE_LISTING.md)"
echo "6. Add screenshots (minimum 1, recommended 3-5)"
echo "7. Submit for review"
echo ""
echo "Review typically takes 1-3 business days."
