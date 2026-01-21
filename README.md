# Orange Cheeto

**Make the news bearable again.**

A Chrome extension that automatically replaces "Trump" with delightful nicknames like "Orange Cheeto," "Mango Mussolini," and "Cheeto Benito" across the entire web. Political satire meets browser extension.

## Features

- **Automatic text replacement** on all websites
- **7 built-in nicknames** (enable/disable individually)
- **Add custom nicknames** - unlimited creativity
- **4 animation styles** - shimmer, glow, pulse, or none
- **Case preservation** - TRUMP becomes ORANGE CHEETO
- **Hover tooltips** - see the original word
- **Badge counter** - track replacements per page
- **Dark mode support**
- **Zero tracking** - your data stays on your device

## Built-in Nicknames

| Nickname | Default |
|----------|---------|
| Orange Cheeto | Enabled |
| Mango Mussolini | Enabled |
| Cheeto Benito | Enabled |
| The Tangerine Tyrant | Enabled |
| Agent Orange | Enabled |
| Dorito Mussolini | Opt-in |
| Cheeto Jesus | Opt-in |

## Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store listing](#) <!-- Replace with actual link -->
2. Click "Add to Chrome"
3. Enjoy your improved news experience

### Manual Installation (Developer Mode)
1. Clone this repository:
   ```bash
   git clone https://github.com/pcortes/orange-cheeto.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the cloned `orange-cheeto` folder
6. Visit any news site and watch the magic happen

## Usage

1. **Browse normally** - the extension works automatically
2. **Click the extension icon** to open settings
3. **Toggle nicknames** on/off as desired
4. **Add custom nicknames** using the input field
5. **Choose an animation style** that suits your vibe
6. **Hover over replacements** to see original text

## Project Structure

```
orange-cheeto/
├── manifest.json           # Extension configuration
├── assets/
│   └── icons/              # Extension icons (16, 32, 48, 128px)
└── src/
    ├── background/
    │   └── service-worker.js   # Badge updates, lifecycle
    ├── content/
    │   ├── index.js            # Content script entry
    │   ├── replacer.js         # Text replacement engine
    │   ├── text-walker.js      # Safe DOM traversal
    │   └── styles.css          # Replacement styling
    ├── popup/
    │   ├── index.html          # Settings UI
    │   ├── popup.js            # Popup logic
    │   └── styles.css          # Popup styling
    └── shared/
        └── storage.js          # Chrome storage wrapper
```

## Privacy

This extension:
- **Collects zero data** about you
- **Makes zero network requests**
- **Contains zero tracking or analytics**
- Stores only your settings locally in Chrome

See our full [Privacy Policy](PRIVACY_POLICY.md).

## Contributing

Contributions welcome! Feel free to:
- Report bugs via GitHub Issues
- Submit pull requests
- Suggest new default nicknames
- Improve documentation

## Support

Love this extension?

- Star this repo
- Share with friends
- [Fund my covfefe](https://ko-fi.com/yourusername) <!-- Replace with actual link -->

## License

MIT License - see [LICENSE](LICENSE) for details.

## Disclaimer

This is a satirical browser extension created for entertainment purposes. It is not affiliated with any political organization or campaign. Use responsibly and remember to laugh.

---

*Made with orange-tinted glasses and a sense of humor.*
