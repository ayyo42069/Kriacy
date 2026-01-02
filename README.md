# 🛡️ Kriacy - Privacy Spoofing Chrome Extension

<p align="center">
  <strong>Protect your digital identity by spoofing browser fingerprinting vectors</strong>
</p>

<p align="center">
  Created by <a href="https://kristof.best">Kristof</a> (<a href="https://github.com/ayyo42069">@ayyo42069</a>)
</p>

---

## ✨ Features

Kriacy provides comprehensive protection against modern browser fingerprinting techniques:

### 🌐 IP & WebRTC Protection
- **WebRTC Leak Prevention** - Blocks or modifies WebRTC to prevent IP address leaks
- **STUN/TURN Server Blocking** - Prevents local and public IP disclosure
- **IPv6 Leak Protection** - Blocks IPv6 address exposure

### 🎨 Canvas Fingerprinting Protection
- **Noise Injection** - Adds subtle randomization to canvas operations
- **toDataURL() Modification** - Prevents unique canvas fingerprint generation
- **getImageData() Randomization** - Makes canvas data collection unreliable

### 🖼️ WebGL Protection
- **Vendor/Renderer Spoofing** - Masks your graphics card information
- **WEBGL_debug_renderer_info Blocking** - Prevents GPU fingerprinting
- **Parameter Randomization** - Varies WebGL capabilities

### 🧭 Navigator & Screen Spoofing
- **User Agent Modification** - Change browser identification
- **Platform Spoofing** - Mask your operating system
- **Hardware Concurrency** - Spoof CPU core count
- **Device Memory** - Hide actual RAM amount
- **Screen Resolution** - Report different display dimensions
- **Pixel Ratio** - Modify device pixel ratio

### 📍 Location & Timezone
- **Geolocation Blocking/Spoofing** - Control location data exposure
- **Timezone Spoofing** - Report different timezone
- **Language Preferences** - Modify reported language

### 🔧 Additional Protections
- **Battery API Spoofing** - Hide battery status
- **Network Information** - Mask connection details
- **Plugin Enumeration** - Standardize plugin reports
- **Font Fingerprinting** - Block font enumeration

---

## 🚀 Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ayyo42069/kriacy.git
   cd kriacy
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Build the extension**
   ```bash
   bun run build
   ```

4. **Load in Chrome**
   - Navigate to `chrome://extensions`
   - Enable **Developer Mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `dist` folder

---

## 🎛️ Usage

### Quick Controls (Popup)

Click the Kriacy icon in your browser toolbar to access:

- **Master Toggle** - Enable/disable all protection
- **Profile Selection** - Choose between Minimal, Balanced, or Aggressive protection
- **Quick Toggles** - Enable/disable individual protection modules
- **Test Button** - Opens browserleaks.com to verify your protection

### Detailed Settings (Options Page)

Right-click the extension icon → Options, or click Settings in the popup:

- Configure individual spoofing values
- Set custom WebGL vendor/renderer strings
- Adjust canvas noise levels
- Configure geolocation coordinates
- Set custom screen resolutions
- And more...

---

## 🧪 Testing Your Protection

After installing Kriacy, verify your protection at these sites:

- [BrowserLeaks](https://browserleaks.com/) - Comprehensive fingerprinting tests
- [AmIUnique](https://amiunique.org/) - Browser uniqueness check
- [Cover Your Tracks (EFF)](https://coveryourtracks.eff.org/) - Tracking protection test

---

## 🛠️ Technical Details

- **Manifest Version**: V3 (latest Chrome extension format)
- **Language**: TypeScript
- **Build System**: Bun
- **Injection Method**: MAIN world script injection for JavaScript API spoofing

### Architecture

```
src/
├── background/         # Service worker (extension coordination)
├── content/            # Content scripts (page injection)
│   ├── content-script.ts   # Isolated world script
│   └── main-world.ts       # MAIN world spoofing script
├── popup/              # Extension popup UI
├── options/            # Full settings page
├── types/              # TypeScript definitions
└── utils/              # Shared utilities
```

---

## ⚠️ Disclaimer

This extension is designed for **privacy protection** and **legitimate testing purposes**. 

Please be aware:
- Some websites may break if aggressive spoofing is enabled
- Using this extension may violate some websites' Terms of Service
- This tool is for educational and privacy purposes only

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

<p align="center">
  <strong>Kriacy</strong> - Reclaim your digital privacy<br>
  Check out more at <a href="https://kristof.best">kristof.best</a>
</p>
