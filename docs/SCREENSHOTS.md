# Screenshot Guide for Chrome Web Store

## Required Screenshots

Chrome Web Store requires at least 1 screenshot, but recommends 3-5 for better conversion.

### Dimensions
- **Primary**: 1280x800 pixels (preferred)
- **Alternative**: 640x400 pixels
- **Format**: PNG or JPEG

---

## Recommended Screenshots

### Screenshot 1: Before/After Headline (REQUIRED)
**Goal**: Show the core value proposition immediately

**Content**:
- Split screen or side-by-side comparison
- Left: Original news headline ("Trump announces...")
- Right: Transformed headline ("Orange Cheeto announces...")
- Use a recognizable news source layout (NYT, CNN, etc.)

**Caption**: "Make the news bearable again"

### Screenshot 2: Extension Popup
**Goal**: Show the settings interface

**Content**:
- Popup fully visible against a news website background
- Show the nickname list with toggles
- Show the animation options
- Visible "Orange Cheeto" branding

**Caption**: "Customize your nicknames and animations"

### Screenshot 3: Multiple Replacements on Page
**Goal**: Show the extension working across a full article

**Content**:
- Full news article with multiple highlighted replacements
- Different nicknames visible (variety)
- Show the shimmer animation if possible (use GIF for socials)

**Caption**: "Works everywhere you browse"

### Screenshot 4: Hover Tooltip
**Goal**: Show the "was: trump" feature

**Content**:
- Close-up of a replacement with tooltip visible
- Cursor hovering over the replacement
- Clear "was: trump" text visible

**Caption**: "Hover to see the original"

### Screenshot 5: Badge Counter
**Goal**: Show the live tracking feature

**Content**:
- Extension icon in toolbar with badge number visible
- News page in background with visible replacements
- Maybe show "47" or a notable number

**Caption**: "Track replacements in real-time"

---

## How to Take Screenshots

### Method 1: Chrome DevTools (Recommended)

1. Load your extension in Chrome (developer mode)
2. Visit a news site (CNN, NYT, WaPo, Politico)
3. Open DevTools: `Cmd+Option+I` (Mac) or `F12` (Windows)
4. Toggle device toolbar: `Cmd+Shift+M` or click the device icon
5. Set dimensions:
   - Width: 1280
   - Height: 800
   - Device: "Responsive"
   - DPR: 1
6. Press `Cmd+Shift+P` and type "Capture full size screenshot" or "Capture screenshot"
7. Save the PNG

### Method 2: macOS Screenshot Tool

1. Resize browser to approximately 1280x800
2. Use `Cmd+Shift+4` for selection tool
3. Select the browser window content
4. Edit in Preview to get exact dimensions

### Method 3: Browser Extension

1. Install "Window Resizer" extension temporarily
2. Set custom size: 1280x800
3. Take screenshot with macOS tools
4. Uninstall Window Resizer after

---

## Tips for Great Screenshots

### Do:
- Use real news sites (they're fair use for screenshots)
- Pick headlines that are immediately recognizable
- Show variety of nicknames in action
- Make the replacements visually obvious (the orange highlighting helps)
- Keep UI clean and uncluttered
- Use current/recent headlines when possible

### Don't:
- Include personal bookmarks bar
- Show other extension icons
- Include any personal information
- Use outdated news (feels stale)
- Overcrowd the image

---

## Promotional Tiles (Optional but Recommended)

### Small Promo Tile: 440x280
- Extension icon/logo prominently displayed
- "Orange Cheeto" text
- Simple tagline: "Make the news bearable"
- Orange/cream color scheme

### Large Promo Tile: 920x680
- Before/after comparison
- Extension name and tagline
- Feature highlights (icons)
- Call to action feel

### Marquee Tile: 1400x560
- Widescreen banner format
- Multiple replacement examples
- Extension branding
- Used in featured sections

---

## Animated GIF (For Social Media)

Chrome Web Store doesn't support video/GIF, but for social media marketing:

1. Screen record the extension in action (3-5 seconds)
2. Show scrolling through news with replacements appearing
3. Convert to GIF using:
   - macOS: `ffmpeg -i video.mov -r 10 -s 640x400 output.gif`
   - Or use Gifski app (App Store, free)
4. Keep under 5MB for Twitter/Reddit compatibility

---

## Sample Headlines to Screenshot

Find recent articles with these headline patterns:
- "Trump announces..." → "Orange Cheeto announces..."
- "President Trump..." → "President Mango Mussolini..."
- "Former President Trump..." → "Former President Cheeto Benito..."
- "Trump says..." → "The Tangerine Tyrant says..."
- "Trump administration..." → "Agent Orange administration..."

---

## File Naming Convention

```
screenshot-1-before-after.png
screenshot-2-popup-settings.png
screenshot-3-article-view.png
screenshot-4-hover-tooltip.png
screenshot-5-badge-counter.png
promo-small-440x280.png
promo-large-920x680.png
promo-marquee-1400x560.png
```

Store these in: `/assets/store/`

---

## Quick Checklist

Before uploading to Chrome Web Store:

- [ ] Screenshot 1: Before/after (1280x800)
- [ ] Screenshot 2: Popup UI (1280x800)
- [ ] Screenshot 3: Full article (1280x800)
- [ ] Screenshot 4: Hover tooltip (1280x800) - optional
- [ ] Screenshot 5: Badge counter (1280x800) - optional
- [ ] All images are crisp (not blurry)
- [ ] No personal information visible
- [ ] Extension branding visible
- [ ] Current/recent headlines used
