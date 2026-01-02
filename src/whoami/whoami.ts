// Kriacy WhoAmI Page Script
// Displays current active fingerprint settings

// DOM Elements
const protectionStatusEl = document.getElementById('protectionStatus');
const refreshBtnEl = document.getElementById('refreshBtn');
const copyRawBtnEl = document.getElementById('copyRawBtn');

// Settings data - using any to avoid type conflicts with global declarations
let storedSettings: any = null;

// ============================================
// Initialize
// ============================================

async function initWhoAmI(): Promise<void> {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
        if (response?.success) {
            storedSettings = response.data;
            renderUI();
        } else {
            displayError('Failed to load settings');
        }
    } catch (error) {
        console.error('[Kriacy WhoAmI] Failed to get settings:', error);
        displayError('Failed to connect to extension');
    }
}

// ============================================
// Render UI with settings
// ============================================

function renderUI(): void {
    if (!storedSettings) return;

    // Protection status
    renderProtectionStatus();

    // Fingerprint hash
    renderFingerprintHash();

    // Browser Identity
    renderBrowserIdentity();

    // Hardware
    renderHardware();

    // Screen
    renderScreen();

    // WebGL
    renderWebGL();

    // Timezone & Location
    renderTimezoneLocation();

    // Canvas & Audio
    renderCanvasAudio();

    // WebRTC
    renderWebRTC();

    // Privacy Signals
    renderPrivacySignals();

    // Active Protections Grid
    renderProtectionsGrid();

    // Raw JSON
    renderRawJson();
}

function renderProtectionStatus(): void {
    if (!storedSettings || !protectionStatusEl) return;

    const statusIndicator = protectionStatusEl.querySelector('.status-indicator');
    const statusText = protectionStatusEl.querySelector('.status-text');

    if (storedSettings.enabled) {
        protectionStatusEl.classList.remove('disabled');
        if (statusIndicator) statusIndicator.classList.add('active');
        if (statusText) statusText.textContent = 'Protected';
    } else {
        protectionStatusEl.classList.add('disabled');
        if (statusIndicator) statusIndicator.classList.remove('active');
        if (statusText) statusText.textContent = 'Disabled';
    }
}

function renderFingerprintHash(): void {
    const hashEl = document.getElementById('fingerprintHash');
    if (!hashEl || !storedSettings) return;

    // Generate a simple hash from the fingerprint seed
    const seed = storedSettings.fingerprintSeed || 0;
    const hash = seed.toString(16).toUpperCase().padStart(8, '0');
    hashEl.textContent = `#${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
}

function renderBrowserIdentity(): void {
    if (!storedSettings) return;

    const userAgentEl = document.getElementById('userAgent');
    const platformEl = document.getElementById('platform');
    const languageEl = document.getElementById('language');
    const languagesEl = document.getElementById('languages');

    // User Agent - use real browser UA if not specifically set
    const ua = storedSettings.navigator?.userAgent || navigator.userAgent;
    if (userAgentEl) userAgentEl.textContent = ua;

    // Platform
    if (platformEl) {
        const platform = storedSettings.navigator?.platform || 'Win32';
        platformEl.textContent = storedSettings.navigator?.enabled ? platform : `${platform} (not spoofed)`;
    }

    // Language
    if (languageEl) {
        languageEl.textContent = storedSettings.navigator?.language || 'en-US';
    }

    // Languages
    if (languagesEl) {
        const langs = storedSettings.navigator?.languages || ['en-US', 'en'];
        languagesEl.textContent = langs.join(', ');
    }
}

function renderHardware(): void {
    if (!storedSettings) return;

    const cpuCoresEl = document.getElementById('cpuCores');
    const memoryEl = document.getElementById('memory');
    const touchPointsEl = document.getElementById('touchPoints');

    if (cpuCoresEl) {
        cpuCoresEl.textContent = String(storedSettings.navigator?.hardwareConcurrency || 4);
    }

    if (memoryEl) {
        memoryEl.textContent = String(storedSettings.navigator?.deviceMemory || 8);
    }

    if (touchPointsEl) {
        touchPointsEl.textContent = String(storedSettings.navigator?.maxTouchPoints ?? 0);
    }
}

function renderScreen(): void {
    if (!storedSettings) return;

    const resolutionEl = document.getElementById('resolution');
    const colorDepthEl = document.getElementById('colorDepth');
    const pixelRatioEl = document.getElementById('pixelRatio');

    if (resolutionEl) {
        const w = storedSettings.screen?.width || 1920;
        const h = storedSettings.screen?.height || 1080;
        resolutionEl.textContent = `${w} × ${h}`;
    }

    if (colorDepthEl) {
        colorDepthEl.textContent = `${storedSettings.screen?.colorDepth || 24}-bit`;
    }

    if (pixelRatioEl) {
        pixelRatioEl.textContent = `${storedSettings.screen?.pixelRatio || 1}x`;
    }
}

function renderWebGL(): void {
    if (!storedSettings) return;

    const vendorEl = document.getElementById('gpuVendor');
    const rendererEl = document.getElementById('gpuRenderer');
    const statusEl = document.getElementById('webglStatus');

    if (vendorEl) {
        vendorEl.textContent = storedSettings.webgl?.vendor || 'Google Inc. (Intel)';
    }

    if (rendererEl) {
        rendererEl.textContent = storedSettings.webgl?.renderer || 'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.6)';
    }

    if (statusEl) {
        if (storedSettings.webgl?.enabled) {
            statusEl.textContent = 'Spoofed';
            statusEl.className = 'status-badge active';
        } else {
            statusEl.textContent = 'Disabled';
            statusEl.className = 'status-badge';
        }
    }
}

function renderTimezoneLocation(): void {
    if (!storedSettings) return;

    const timezoneEl = document.getElementById('timezone');
    const offsetEl = document.getElementById('timezoneOffset');
    const geoEl = document.getElementById('geolocation');
    const statusEl = document.getElementById('locationStatus');

    if (timezoneEl) {
        timezoneEl.textContent = storedSettings.timezone?.timezone || 'UTC';
    }

    if (offsetEl) {
        const offset = storedSettings.timezone?.offset || 0;
        const hours = Math.floor(Math.abs(offset) / 60);
        const mins = Math.abs(offset) % 60;
        const sign = offset <= 0 ? '+' : '-';
        offsetEl.textContent = `UTC${sign}${hours}:${mins.toString().padStart(2, '0')}`;
    }

    if (geoEl) {
        const mode = storedSettings.geolocation?.mode || 'block';
        if (mode === 'block') {
            geoEl.textContent = '🚫 Blocked';
        } else {
            const lat = storedSettings.geolocation?.latitude?.toFixed(4) || '0';
            const lng = storedSettings.geolocation?.longitude?.toFixed(4) || '0';
            geoEl.textContent = `📍 ${lat}, ${lng}`;
        }
    }

    if (statusEl) {
        const tzEnabled = storedSettings.timezone?.enabled;
        const geoEnabled = storedSettings.geolocation?.enabled;

        if (tzEnabled && geoEnabled) {
            statusEl.textContent = 'Protected';
            statusEl.className = 'status-badge active';
        } else if (tzEnabled || geoEnabled) {
            statusEl.textContent = 'Partial';
            statusEl.className = 'status-badge warning';
        } else {
            statusEl.textContent = 'Disabled';
            statusEl.className = 'status-badge';
        }
    }
}

function renderCanvasAudio(): void {
    if (!storedSettings) return;

    const canvasEl = document.getElementById('canvasProtection');
    const noiseEl = document.getElementById('canvasNoise');
    const audioEl = document.getElementById('audioProtection');
    const statusEl = document.getElementById('canvasStatus');

    if (canvasEl) {
        canvasEl.textContent = storedSettings.canvas?.enabled ? '✓ Enabled' : '✗ Disabled';
    }

    if (noiseEl) {
        noiseEl.textContent = storedSettings.canvas?.enabled
            ? `${storedSettings.canvas?.noiseLevel || 10}%`
            : 'N/A';
    }

    if (audioEl) {
        audioEl.textContent = storedSettings.audio?.enabled ? '✓ Enabled' : '✗ Disabled';
    }

    if (statusEl) {
        if (storedSettings.canvas?.enabled && storedSettings.audio?.enabled) {
            statusEl.textContent = 'Protected';
            statusEl.className = 'status-badge active';
        } else if (storedSettings.canvas?.enabled || storedSettings.audio?.enabled) {
            statusEl.textContent = 'Partial';
            statusEl.className = 'status-badge warning';
        } else {
            statusEl.textContent = 'Disabled';
            statusEl.className = 'status-badge';
        }
    }
}

function renderWebRTC(): void {
    if (!storedSettings) return;

    const modeEl = document.getElementById('webrtcMode');
    const leakEl = document.getElementById('webrtcLeak');
    const statusEl = document.getElementById('webrtcStatus');

    const modeMap: Record<string, string> = {
        'block': 'Block All',
        'disable_non_proxied': 'Disable Non-Proxied UDP',
        'spoof': 'Spoof IP',
        'default': 'Default'
    };

    if (modeEl) {
        const mode = storedSettings.webrtc?.mode || 'block';
        modeEl.textContent = modeMap[mode] || mode;
    }

    if (leakEl) {
        leakEl.textContent = storedSettings.webrtc?.enabled ? '✓ Protected' : '✗ Not Protected';
    }

    if (statusEl) {
        if (storedSettings.webrtc?.enabled) {
            statusEl.textContent = 'Protected';
            statusEl.className = 'status-badge active';
        } else {
            statusEl.textContent = 'Disabled';
            statusEl.className = 'status-badge danger';
        }
    }
}

function renderPrivacySignals(): void {
    if (!storedSettings) return;

    const signals = [
        { id: 'dntSignal', enabled: storedSettings.misc?.dnt },
        { id: 'gpcSignal', enabled: storedSettings.misc?.gpc },
        { id: 'visibilitySignal', enabled: storedSettings.misc?.visibility },
        { id: 'windowNameSignal', enabled: storedSettings.misc?.windowName },
    ];

    signals.forEach(signal => {
        const el = document.getElementById(signal.id);
        if (el) {
            el.classList.remove('active', 'inactive');
            el.classList.add(signal.enabled ? 'active' : 'inactive');
        }
    });
}

function renderProtectionsGrid(): void {
    const grid = document.getElementById('protectionsGrid');
    if (!grid || !storedSettings) return;

    const protections = [
        { name: 'Navigator', enabled: storedSettings.navigator?.enabled, icon: '🧭' },
        { name: 'Screen', enabled: storedSettings.screen?.enabled, icon: '🖥️' },
        { name: 'WebGL', enabled: storedSettings.webgl?.enabled, icon: '🎮' },
        { name: 'Canvas', enabled: storedSettings.canvas?.enabled, icon: '🎨' },
        { name: 'Audio', enabled: storedSettings.audio?.enabled, icon: '🔊' },
        { name: 'WebRTC', enabled: storedSettings.webrtc?.enabled, icon: '📡' },
        { name: 'Timezone', enabled: storedSettings.timezone?.enabled, icon: '🕐' },
        { name: 'Geolocation', enabled: storedSettings.geolocation?.enabled, icon: '📍' },
        { name: 'Fonts', enabled: storedSettings.fonts?.enabled, icon: '🔤' },
        { name: 'Battery', enabled: storedSettings.battery, icon: '🔋' },
        { name: 'Network', enabled: storedSettings.network, icon: '📶' },
        { name: 'Plugins', enabled: storedSettings.plugins, icon: '🔌' },
        { name: 'Performance', enabled: storedSettings.misc?.performance, icon: '⚡' },
        { name: 'Math', enabled: storedSettings.misc?.math, icon: '🔢' },
        { name: 'History', enabled: storedSettings.misc?.history, icon: '📜' },
        { name: 'Bluetooth', enabled: storedSettings.misc?.bluetooth, icon: '📱' },
        { name: 'Gamepad', enabled: storedSettings.misc?.gamepad, icon: '🎮' },
        { name: 'Hardware APIs', enabled: storedSettings.misc?.hardwareApis, icon: '🔧' },
        { name: 'Sensors', enabled: storedSettings.misc?.sensors, icon: '📊' },
        { name: 'DNT', enabled: storedSettings.misc?.dnt, icon: '🚫' },
        { name: 'GPC', enabled: storedSettings.misc?.gpc, icon: '🛡️' },
        { name: 'Visibility', enabled: storedSettings.misc?.visibility, icon: '👁️' },
        { name: 'Window.name', enabled: storedSettings.misc?.windowName, icon: '🪟' },
        { name: 'Keyboard', enabled: storedSettings.misc?.keyboard, icon: '⌨️' },
        { name: 'Pointer', enabled: storedSettings.misc?.pointer, icon: '🖱️' },
        { name: 'Media Query', enabled: storedSettings.misc?.mediaQuery, icon: '📱' },
        { name: 'Clipboard', enabled: storedSettings.misc?.clipboard, icon: '📋' },
        { name: 'Credentials', enabled: storedSettings.misc?.credentials, icon: '🔑' },
        { name: 'Error Stack', enabled: storedSettings.misc?.errorStack, icon: '⚠️' },
        { name: 'Storage', enabled: storedSettings.misc?.storage, icon: '💾' },
    ];

    grid.innerHTML = protections.map(p => `
        <div class="protection-item ${p.enabled ? 'active' : 'inactive'}">
            <span class="protection-icon">${p.icon}</span>
            <span>${p.name}</span>
        </div>
    `).join('');
}

function renderRawJson(): void {
    const jsonEl = document.getElementById('rawSettingsJson');
    if (!jsonEl || !storedSettings) return;

    // Create a sanitized version for display
    const displaySettings = {
        enabled: storedSettings.enabled,
        profile: storedSettings.profile,
        fingerprintSeed: storedSettings.fingerprintSeed,
        navigator: {
            enabled: storedSettings.navigator?.enabled,
            platform: storedSettings.navigator?.platform,
            language: storedSettings.navigator?.language,
            hardwareConcurrency: storedSettings.navigator?.hardwareConcurrency,
            deviceMemory: storedSettings.navigator?.deviceMemory,
        },
        screen: storedSettings.screen,
        webgl: storedSettings.webgl,
        canvas: storedSettings.canvas,
        audio: storedSettings.audio,
        webrtc: storedSettings.webrtc,
        timezone: storedSettings.timezone,
        geolocation: {
            enabled: storedSettings.geolocation?.enabled,
            mode: storedSettings.geolocation?.mode,
        },
        fonts: storedSettings.fonts,
        battery: storedSettings.battery,
        network: storedSettings.network,
        plugins: storedSettings.plugins,
        misc: storedSettings.misc,
    };

    jsonEl.textContent = JSON.stringify(displaySettings, null, 2);
}

// ============================================
// Utility Functions
// ============================================

function displayError(message: string): void {
    // Update UI to show error state
    const elements = document.querySelectorAll('.info-value, .stat-value');
    elements.forEach(el => {
        el.textContent = 'Error';
    });
    console.error('[Kriacy WhoAmI]', message);
}

function displayToast(message: string): void {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ============================================
// Event Listeners
// ============================================

refreshBtnEl?.addEventListener('click', async () => {
    await initWhoAmI();
    displayToast('🔄 Settings refreshed!');
});

copyRawBtnEl?.addEventListener('click', () => {
    if (!storedSettings) return;

    const json = JSON.stringify(storedSettings, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        displayToast('📋 Copied to clipboard!');
    }).catch(() => {
        displayToast('❌ Failed to copy');
    });
});

// ============================================
// Initialize on load
// ============================================

document.addEventListener('DOMContentLoaded', initWhoAmI);
