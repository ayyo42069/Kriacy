<p align="center">
  <img src="icons/icon.svg" alt="Kriacy" width="80" height="80">
</p>

<h1 align="center">Kriacy</h1>

<p align="center">
  <strong>Advanced browser fingerprint protection for the privacy-conscious.</strong>
</p>

<p align="center">
  <a href="https://github.com/ayyo42069/Kriacy/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-Non--Commercial-red.svg" alt="License">
  </a>
  <img src="https://img.shields.io/badge/manifest-v3-blue.svg" alt="Manifest V3">
  <img src="https://img.shields.io/badge/built%20with-TypeScript-3178c6.svg" alt="TypeScript">
</p>

---

## What is Kriacy?

Kriacy is a Chrome extension that protects your privacy by spoofing browser fingerprinting vectors. Modern websites use dozens of techniques to create a unique "fingerprint" of your browser—Kriacy breaks that identity by injecting noise and fake data across all major fingerprinting surfaces.

Unlike basic privacy tools, Kriacy operates in the page's main execution context, ensuring that fingerprinting scripts see the spoofed values directly.

---

## Core Protections

| Category | What's Protected |
|----------|------------------|
| **Canvas** | 2D context noise injection, toDataURL/getImageData randomization |
| **WebGL** | GPU vendor/renderer spoofing, parameter fuzzing, debug info blocking |
| **Audio** | AudioContext fingerprint noise, destination tampering |
| **Navigator** | User agent, platform, CPU cores, memory, languages, plugins |
| **Screen** | Resolution, color depth, pixel ratio, orientation |
| **WebRTC** | ICE candidate filtering, STUN/TURN blocking, IP leak prevention |
| **Timezone** | Full Date/Intl API spoofing, offset consistency |
| **Geolocation** | Coordinate spoofing or complete blocking |
| **Fonts** | Font enumeration protection, rendering noise |
| **Network** | Connection type, downlink, RTT spoofing |
| **Media** | Device enumeration protection, codec masking |

---

## Advanced Features

- **Main World Injection** — Spoofing happens where fingerprinting scripts actually run
- **Worker Protection** — Covers Dedicated, Shared, and Blob-based Web Workers
- **Stealth Mode** — Patched APIs appear native to detection scripts
- **Iframe Coverage** — Dynamic injection into nested contexts
- **CSS Media Query Sync** — JavaScript values match CSS query results
- **Randomization Engine** — One-click profile randomization

---

## Quick Start

```bash
# Clone
git clone https://github.com/ayyo42069/Kriacy.git
cd Kriacy

# Install & Build
bun install
bun run build
```

**Load in Chrome:**
1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `dist` folder

---

## Usage

**Popup** — Quick toggles, master switch, profile presets, instant test link

**Options Page** — Granular control over every spoofing parameter

---

## Verify Protection

Test your setup at:
- [BrowserLeaks](https://browserleaks.com)
- [CreepJS](https://abrahamjuliot.github.io/creepjs)
- [Cover Your Tracks](https://coveryourtracks.eff.org)

---

## Project Structure

```
src/
├── background/       # Service worker
├── content/          # Injection scripts
│   ├── protections/  # Individual protection modules
│   └── core/         # Shared utilities & stealth
├── popup/            # Extension popup
├── options/          # Settings page
└── utils/            # Storage, logging
```

---

## License

**Non-Commercial Open Source** — Free for personal and educational use.  
Commercial use, resale, or monetization is strictly prohibited.  
See [LICENSE](LICENSE) for full terms.

---

## Disclaimer

This tool is for privacy protection and security research. Some websites may not function correctly with aggressive spoofing enabled. Use responsibly.

---

<p align="center">
  Built by <a href="https://kristof.best">Kristof</a> · <a href="https://github.com/ayyo42069">@ayyo42069</a>
</p>
