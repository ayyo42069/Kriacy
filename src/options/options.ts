interface SpoofSettings {
    enabled: boolean;
    profile: 'minimal' | 'balanced' | 'aggressive' | 'custom';
    fingerprintSeed: number;
    skipLocalFiles: boolean;
    bypassCSP: boolean;
    webrtc: { enabled: boolean; mode: string };
    canvas: { enabled: boolean; noiseLevel: number };
    audio: { enabled: boolean };
    webgl: { enabled: boolean; vendor: string; renderer: string };
    fonts: { enabled: boolean; blockEnumeration: boolean; spoofMetrics: boolean };
    navigator: {
        enabled: boolean;
        platform: string;
        language: string;
        languages: string[];
        hardwareConcurrency: number;
        deviceMemory: number;
    };
    screen: {
        enabled: boolean;
        width: number;
        height: number;
        colorDepth: number;
        pixelRatio: number;
    };
    geolocation: {
        enabled: boolean;
        mode: string;
        latitude: number;
        longitude: number;
        accuracy: number;
    };
    timezone: { enabled: boolean; timezone: string; offset: number };
    battery: boolean;
    network: boolean;
    plugins: boolean;
    misc: {
        performance: boolean;
        math: boolean;
        history: boolean;
        bluetooth: boolean;
        gamepad: boolean;
        hardwareApis: boolean;
        sensors: boolean;
        dnt: boolean;
        gpc: boolean;
        visibility: boolean;
        windowName: boolean;
        keyboard: boolean;
        pointer: boolean;
        mediaQuery: boolean;
        clipboard: boolean;
        credentials: boolean;
        errorStack: boolean;
        storage: boolean;
        blockServiceWorkers: boolean;
        hideAdBlocker: boolean;
    };
}

// ============================================
// Security Utilities
// ============================================

function secureRandom(): number {

    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / 0xFFFFFFFF;
}

function secureRandomInt(max: number): number {
    return Math.floor(secureRandom() * max);
}

function secureRandomPick<T>(array: T[]): T {
    return array[secureRandomInt(array.length)];
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Random Data Generators
// ============================================

const GPU_PROFILES = [
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 530 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 5700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)' },
    { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)' },
    { vendor: 'Mesa/X.org', renderer: 'Mesa Intel(R) UHD Graphics 620 (KBL GT2)' },
    { vendor: 'Mesa/X.org', renderer: 'Mesa Intel(R) HD Graphics 530 (SKL GT2)' },
];

const NAVIGATOR_PROFILES = [
    { platform: 'Win32', hardwareConcurrency: 4, deviceMemory: 8, language: 'en-US' },
    { platform: 'Win32', hardwareConcurrency: 8, deviceMemory: 16, language: 'en-US' },
    { platform: 'Win32', hardwareConcurrency: 6, deviceMemory: 8, language: 'en-GB' },
    { platform: 'Win32', hardwareConcurrency: 12, deviceMemory: 32, language: 'de-DE' },
    { platform: 'MacIntel', hardwareConcurrency: 8, deviceMemory: 8, language: 'en-US' },
    { platform: 'MacIntel', hardwareConcurrency: 10, deviceMemory: 16, language: 'en-US' },
    { platform: 'Linux x86_64', hardwareConcurrency: 8, deviceMemory: 8, language: 'en-US' },
    { platform: 'Linux x86_64', hardwareConcurrency: 16, deviceMemory: 32, language: 'en-GB' },
];

const SCREEN_PROFILES = [
    { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
    { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1.25 },
    { width: 1536, height: 864, colorDepth: 24, pixelRatio: 1.25 },
    { width: 1366, height: 768, colorDepth: 24, pixelRatio: 1 },
    { width: 2560, height: 1440, colorDepth: 24, pixelRatio: 1 },
    { width: 1440, height: 900, colorDepth: 30, pixelRatio: 2 },
    { width: 1680, height: 1050, colorDepth: 24, pixelRatio: 1 },
    { width: 3840, height: 2160, colorDepth: 30, pixelRatio: 1.5 },
];

const LOCATION_PROFILES = [
    { lat: 40.7128, lng: -74.0060, timezone: 'America/New_York', offset: -300 },
    { lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles', offset: -480 },
    { lat: 51.5074, lng: -0.1278, timezone: 'Europe/London', offset: 0 },
    { lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris', offset: 60 },
    { lat: 52.5200, lng: 13.4050, timezone: 'Europe/Berlin', offset: 60 },
    { lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo', offset: 540 },
    { lat: 31.2304, lng: 121.4737, timezone: 'Asia/Shanghai', offset: 480 },
    { lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney', offset: 660 },
    { lat: 55.7558, lng: 37.6173, timezone: 'Europe/Moscow', offset: 180 },
    { lat: 37.7749, lng: -122.4194, timezone: 'America/Los_Angeles', offset: -480 },
    { lat: 41.9028, lng: 12.4964, timezone: 'Europe/Rome', offset: 60 },
    { lat: 59.3293, lng: 18.0686, timezone: 'Europe/Stockholm', offset: 60 },
];

function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomGPU() {
    return randomElement(GPU_PROFILES);
}

function randomNavigator() {
    return randomElement(NAVIGATOR_PROFILES);
}

function randomScreen() {
    return randomElement(SCREEN_PROFILES);
}

function randomLocation() {
    // Add small random offset for uniqueness
    const base = randomElement(LOCATION_PROFILES);
    return {
        ...base,
        lat: base.lat + (Math.random() - 0.5) * 0.1,
        lng: base.lng + (Math.random() - 0.5) * 0.1,
    };
}

// Timezone offset mapping
const timezoneOffsets: Record<string, number> = {
    'UTC': 0,
    'America/New_York': -300,
    'America/Chicago': -360,
    'America/Denver': -420,
    'America/Phoenix': -420,
    'America/Los_Angeles': -480,
    'America/Toronto': -300,
    'America/Vancouver': -480,
    'America/Sao_Paulo': -180,
    'America/Fortaleza': -180,
    'Europe/London': 0,
    'Europe/Paris': 60,
    'Europe/Berlin': 60,
    'Europe/Vienna': 60,
    'Europe/Zurich': 60,
    'Europe/Madrid': 60,
    'Europe/Rome': 60,
    'Europe/Amsterdam': 60,
    'Europe/Warsaw': 60,
    'Europe/Moscow': 180,
    'Europe/Kaliningrad': 120,
    'Asia/Dubai': 240,
    'Asia/Shanghai': 480,
    'Asia/Hong_Kong': 480,
    'Asia/Tokyo': 540,
    'Asia/Seoul': 540,
    'Australia/Sydney': 660,
    'Australia/Melbourne': 660,
    'Australia/Perth': 480,
};

let currentSettings: SpoofSettings | null = null;

// ============================================
// DOM Elements
// ============================================

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');

// General
const enabledToggle = document.getElementById('enabledToggle') as HTMLInputElement;
const skipLocalFilesToggle = document.getElementById('skipLocalFilesToggle') as HTMLInputElement;
const bypassCSPToggle = document.getElementById('bypassCSPToggle') as HTMLInputElement;
const profileCards = document.querySelectorAll('.profile-card');
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const randomizeAllBtn = document.getElementById('randomizeAllBtn') as HTMLButtonElement;

// Randomize buttons
const randomizeCanvas = document.getElementById('randomizeCanvas') as HTMLButtonElement;
const randomizeWebGL = document.getElementById('randomizeWebGL') as HTMLButtonElement;
const randomizeNavigator = document.getElementById('randomizeNavigator') as HTMLButtonElement;
const randomizeScreen = document.getElementById('randomizeScreen') as HTMLButtonElement;
const randomizeLocation = document.getElementById('randomizeLocation') as HTMLButtonElement;

// WebRTC
const webrtcEnabled = document.getElementById('webrtcEnabled') as HTMLInputElement;
const webrtcMode = document.getElementById('webrtcMode') as HTMLSelectElement;

// Canvas & Audio
const canvasEnabled = document.getElementById('canvasEnabled') as HTMLInputElement;
const canvasNoise = document.getElementById('canvasNoise') as HTMLInputElement;
const canvasNoiseValue = document.getElementById('canvasNoiseValue') as HTMLSpanElement;
const audioEnabled = document.getElementById('audioEnabled') as HTMLInputElement;

// WebGL
const webglEnabled = document.getElementById('webglEnabled') as HTMLInputElement;
const webglVendor = document.getElementById('webglVendor') as HTMLInputElement;
const webglRenderer = document.getElementById('webglRenderer') as HTMLInputElement;

// Navigator
const navigatorEnabled = document.getElementById('navigatorEnabled') as HTMLInputElement;
const navigatorPlatform = document.getElementById('navigatorPlatform') as HTMLSelectElement;
const hardwareConcurrency = document.getElementById('hardwareConcurrency') as HTMLSelectElement;
const deviceMemory = document.getElementById('deviceMemory') as HTMLSelectElement;
const navigatorLanguage = document.getElementById('navigatorLanguage') as HTMLSelectElement;

// Screen
const screenEnabled = document.getElementById('screenEnabled') as HTMLInputElement;
const screenResolution = document.getElementById('screenResolution') as HTMLSelectElement;
const colorDepth = document.getElementById('colorDepth') as HTMLSelectElement;
const pixelRatio = document.getElementById('pixelRatio') as HTMLSelectElement;

// Location
const geoMode = document.getElementById('geoMode') as HTMLSelectElement;
const geoCoordsContainer = document.getElementById('geoCoordsContainer') as HTMLDivElement;
const geoLatitude = document.getElementById('geoLatitude') as HTMLInputElement;
const geoLongitude = document.getElementById('geoLongitude') as HTMLInputElement;
const timezone = document.getElementById('timezone') as HTMLSelectElement;

// Misc - Basic
const batteryEnabled = document.getElementById('batteryEnabled') as HTMLInputElement;
const networkEnabled = document.getElementById('networkEnabled') as HTMLInputElement;
const pluginsEnabled = document.getElementById('pluginsEnabled') as HTMLInputElement;
const fontsEnabled = document.getElementById('fontsEnabled') as HTMLInputElement;
const clientRectsEnabled = document.getElementById('clientRectsEnabled') as HTMLInputElement;
const speechEnabled = document.getElementById('speechEnabled') as HTMLInputElement;

// Misc - Timing & Performance
const performanceEnabled = document.getElementById('performanceEnabled') as HTMLInputElement;
const mathEnabled = document.getElementById('mathEnabled') as HTMLInputElement;
const historyEnabled = document.getElementById('historyEnabled') as HTMLInputElement;

// Misc - Hardware APIs
const bluetoothEnabled = document.getElementById('bluetoothEnabled') as HTMLInputElement;
const gamepadEnabled = document.getElementById('gamepadEnabled') as HTMLInputElement;
const hardwareApisEnabled = document.getElementById('hardwareApisEnabled') as HTMLInputElement;
const sensorsEnabled = document.getElementById('sensorsEnabled') as HTMLInputElement;

// Misc - Privacy Signals
const dntEnabled = document.getElementById('dntEnabled') as HTMLInputElement;
const gpcEnabled = document.getElementById('gpcEnabled') as HTMLInputElement;
const visibilityEnabled = document.getElementById('visibilityEnabled') as HTMLInputElement;
const windowNameEnabled = document.getElementById('windowNameEnabled') as HTMLInputElement;

// Misc - Input & Display
const keyboardEnabled = document.getElementById('keyboardEnabled') as HTMLInputElement;
const pointerEnabled = document.getElementById('pointerEnabled') as HTMLInputElement;
const mediaQueryEnabled = document.getElementById('mediaQueryEnabled') as HTMLInputElement;

// Misc - Security & Access
const clipboardEnabled = document.getElementById('clipboardEnabled') as HTMLInputElement;
const credentialsEnabled = document.getElementById('credentialsEnabled') as HTMLInputElement;
const errorStackEnabled = document.getElementById('errorStackEnabled') as HTMLInputElement;
const storageEnabled = document.getElementById('storageEnabled') as HTMLInputElement;
const blockServiceWorkersEnabled = document.getElementById('blockServiceWorkersEnabled') as HTMLInputElement;
const hideAdBlockerEnabled = document.getElementById('hideAdBlockerEnabled') as HTMLInputElement;

// ============================================
// Toast Notification
// ============================================

function showToast(message: string) {
    // Remove existing toast
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
// Profile Coherence Validation
// ============================================

interface CoherenceWarning {
    id: string;
    severity: 'warning' | 'error';
    title: string;
    message: string;
    affectedFields: string[];
    suggestion?: string;
}

// DOM elements for coherence banner
const coherenceBanner = document.getElementById('coherenceBanner');
const coherenceHeader = document.getElementById('coherenceHeader');
const coherenceBubbleIcon = document.getElementById('coherenceBubbleIcon');
const coherenceBubbleImg = document.getElementById('coherenceBubbleImg') as HTMLImageElement;
const coherenceIconImg = document.getElementById('coherenceIconImg') as HTMLImageElement;
const coherenceTitle = document.getElementById('coherenceTitle');
const coherenceSubtitle = document.getElementById('coherenceSubtitle');
const coherenceBadges = document.getElementById('coherenceBadges');
const coherenceWarningsList = document.getElementById('coherenceWarningsList');
const coherenceClose = document.getElementById('coherenceClose');

// Click bubble icon to expand
coherenceBubbleIcon?.addEventListener('click', () => {
    coherenceBanner?.classList.add('expanded');
});

// Click close button to collapse
coherenceClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    coherenceBanner?.classList.remove('expanded');
});

// Click header to collapse (when expanded)
coherenceHeader?.addEventListener('click', () => {
    coherenceBanner?.classList.remove('expanded');
});

/**
 * Validate current settings for logical consistency
 */
function validateProfileCoherence(): CoherenceWarning[] {
    if (!currentSettings) return [];

    const warnings: CoherenceWarning[] = [];
    const platform = currentSettings.navigator?.platform || 'Win32';
    const gpuVendor = currentSettings.webgl?.vendor || '';
    const gpuRenderer = currentSettings.webgl?.renderer || '';
    const gpuString = `${gpuVendor} ${gpuRenderer}`;
    const pixelRatio = currentSettings.screen?.pixelRatio || 1;
    const screenWidth = currentSettings.screen?.width || 1920;
    const cores = currentSettings.navigator?.hardwareConcurrency || 4;
    const memory = currentSettings.navigator?.deviceMemory || 8;
    const timezone = currentSettings.timezone?.timezone || 'UTC';
    const language = currentSettings.navigator?.language || 'en-US';

    // Check 1: Apple GPU on non-Mac platform
    if ((gpuString.includes('Apple M') || gpuString.includes('Apple GPU') || gpuString.includes('Apple,')) && platform !== 'MacIntel') {
        warnings.push({
            id: 'gpu-platform-apple',
            severity: 'error',
            title: 'Apple GPU on Non-Mac Platform',
            message: `Apple Silicon (M1/M2/M3) GPUs are exclusive to macOS. Using this GPU with "${platform}" platform is easily detectable.`,
            affectedFields: ['webglVendor', 'webglRenderer', 'navigatorPlatform'],
            suggestion: 'Change platform to "MacIntel" or select a different GPU.',
        });
    }

    // Check 2: Mesa driver on non-Linux platform
    if ((gpuString.includes('Mesa') || gpuString.includes('Mesa/X.org')) && !platform.includes('Linux')) {
        warnings.push({
            id: 'gpu-platform-mesa',
            severity: 'error',
            title: 'Mesa Driver on Non-Linux Platform',
            message: `Mesa graphics drivers are Linux-specific. Using Mesa with "${platform}" is a clear indicator of spoofing.`,
            affectedFields: ['webglVendor', 'webglRenderer', 'navigatorPlatform'],
            suggestion: 'Change platform to a Linux variant or select a different GPU.',
        });
    }

    // Check 3: Direct3D on non-Windows platform
    if ((gpuString.includes('Direct3D') || gpuString.includes('D3D11') || gpuString.includes('D3D12')) && platform !== 'Win32') {
        warnings.push({
            id: 'gpu-platform-d3d',
            severity: 'error',
            title: 'Direct3D on Non-Windows Platform',
            message: `Direct3D is a Windows-only graphics API. Using D3D with "${platform}" is impossible in reality.`,
            affectedFields: ['webglVendor', 'webglRenderer', 'navigatorPlatform'],
            suggestion: 'Change platform to "Win32" or select a GPU that uses OpenGL.',
        });
    }

    // Check 4: Low pixel ratio on Mac (Macs have Retina displays)
    if (platform === 'MacIntel' && pixelRatio < 2) {
        warnings.push({
            id: 'screen-mac-pixelratio',
            severity: 'warning',
            title: 'Unusual Pixel Ratio for Mac',
            message: `Pixel ratio of ${pixelRatio}x is unusual for Mac. Retina displays are typically 2x or higher.`,
            affectedFields: ['pixelRatio', 'navigatorPlatform'],
            suggestion: 'Consider using 2x pixel ratio for Mac platform.',
        });
    }

    // Check 5: High-end GPU with low system specs
    const highEndGPUs = ['rtx 4090', 'rtx 4080', 'rtx 3090', 'rtx 3080', 'rx 7900', 'rx 6900'];
    const hasHighEndGPU = highEndGPUs.some(g => gpuString.toLowerCase().includes(g));
    if (hasHighEndGPU && (cores <= 4 || memory <= 4)) {
        warnings.push({
            id: 'gpu-specs-mismatch',
            severity: 'warning',
            title: 'GPU / System Specs Mismatch',
            message: `A high-end GPU is typically paired with more powerful system specs. ${cores} cores and ${memory}GB RAM is unusual for this GPU.`,
            affectedFields: ['webglRenderer', 'hardwareConcurrency', 'deviceMemory'],
            suggestion: 'Consider using higher system specs or a more modest GPU.',
        });
    }

    // Check 6: Timezone / Language mismatch
    const isObviousMismatch =
        (language.startsWith('en-US') && timezone.startsWith('Asia/')) ||
        (language.startsWith('ja-JP') && !timezone.startsWith('Asia/')) ||
        (language.startsWith('zh-CN') && !timezone.startsWith('Asia/')) ||
        (language.startsWith('de-DE') && !timezone.startsWith('Europe/')) ||
        (language.startsWith('ru-RU') && !timezone.startsWith('Europe/'));

    if (isObviousMismatch) {
        warnings.push({
            id: 'tz-language-mismatch',
            severity: 'warning',
            title: 'Timezone / Language Mismatch',
            message: `Language "${language}" with timezone "${timezone}" is an unusual combination.`,
            affectedFields: ['timezone', 'navigatorLanguage'],
            suggestion: 'Consider matching the timezone to a region where the language is commonly spoken.',
        });
    }

    // Check 7: 4K display with very low RAM
    if (screenWidth >= 3840 && memory <= 4) {
        warnings.push({
            id: 'screen-memory-mismatch',
            severity: 'warning',
            title: '4K Display with Low RAM',
            message: '4K displays are typically used on systems with more than 4GB RAM.',
            affectedFields: ['screenResolution', 'deviceMemory'],
            suggestion: 'Consider using a lower resolution or higher memory setting.',
        });
    }

    return warnings;
}

/**
 * Update the coherence banner UI based on validation results
 */
function updateCoherenceBanner(): void {
    const warnings = validateProfileCoherence();

    if (!coherenceBanner) return;

    const errorCount = warnings.filter(w => w.severity === 'error').length;
    const warningCount = warnings.filter(w => w.severity === 'warning').length;

    // Hide banner if no warnings
    if (warnings.length === 0) {
        coherenceBanner.classList.add('hidden');
        coherenceBanner.classList.remove('status-ok', 'status-warning', 'status-error', 'expanded');
        return;
    }

    // Show banner
    coherenceBanner.classList.remove('hidden');

    // Set status class and icons
    coherenceBanner.classList.remove('status-ok', 'status-warning', 'status-error');
    if (errorCount > 0) {
        coherenceBanner.classList.add('status-error');
        if (coherenceBubbleImg) coherenceBubbleImg.src = 'icons/toolbar/error.svg';
        if (coherenceIconImg) coherenceIconImg.src = 'icons/toolbar/error.svg';
        if (coherenceTitle) coherenceTitle.textContent = 'Profile Issues Detected';
    } else {
        coherenceBanner.classList.add('status-warning');
        if (coherenceBubbleImg) coherenceBubbleImg.src = 'icons/toolbar/warning.svg';
        if (coherenceIconImg) coherenceIconImg.src = 'icons/toolbar/warning.svg';
        if (coherenceTitle) coherenceTitle.textContent = 'Profile Coherence Warnings';
    }

    // Update subtitle
    if (coherenceSubtitle) {
        if (errorCount > 0) {
            coherenceSubtitle.textContent = `${errorCount} critical issue${errorCount > 1 ? 's' : ''} detected. Your fingerprint may be easily identified as fake.`;
        } else {
            coherenceSubtitle.textContent = `${warningCount} potential inconsistenc${warningCount > 1 ? 'ies' : 'y'} found. Consider reviewing your settings.`;
        }
    }

    // Update badges
    if (coherenceBadges) {
        let badgesHtml = '';
        if (errorCount > 0) {
            badgesHtml += `<span class="coherence-badge errors">${errorCount} Error${errorCount > 1 ? 's' : ''}</span>`;
        }
        if (warningCount > 0) {
            badgesHtml += `<span class="coherence-badge warnings">${warningCount} Warning${warningCount > 1 ? 's' : ''}</span>`;
        }
        coherenceBadges.innerHTML = badgesHtml;
    }

    // Update warnings list
    if (coherenceWarningsList) {
        const warningsHtml = warnings.map(w => `
            <div class="coherence-warning-item severity-${escapeHtml(w.severity)}">
                <div class="warning-header">
                    <span class="warning-severity">
                        <img src="icons/toolbar/${w.severity === 'error' ? 'error' : 'warning'}.svg" width="16" height="16" alt="">
                    </span>
                    <span class="warning-title">${escapeHtml(w.title)}</span>
                </div>
                <div class="warning-message">${escapeHtml(w.message)}</div>
                ${w.suggestion ? `<div class="warning-suggestion">${escapeHtml(w.suggestion)}</div>` : ''}
                <div class="warning-fields">
                    ${w.affectedFields.map(f => `<span class="field-tag">${escapeHtml(f)}</span>`).join('')}
                </div>
            </div>
        `).join('');
        coherenceWarningsList.innerHTML = warningsHtml;
    }
}

// ============================================
// Initialize
// ============================================

async function init(): Promise<void> {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
        if (response?.success) {
            currentSettings = response.data;
            updateUI();
        }
    } catch (error) {
        console.error('[Kriacy] Failed to get settings:', error);
    }
}

// ============================================
// Update UI from settings
// ============================================

function updateUI(): void {
    if (!currentSettings) return;

    // General
    enabledToggle.checked = currentSettings.enabled;
    if (skipLocalFilesToggle) skipLocalFilesToggle.checked = currentSettings.skipLocalFiles ?? true;
    if (bypassCSPToggle) bypassCSPToggle.checked = currentSettings.bypassCSP ?? true;

    // Profile
    profileCards.forEach(card => {
        const profile = (card as HTMLElement).dataset.profile;
        card.classList.toggle('active', profile === currentSettings?.profile);
    });

    // WebRTC
    webrtcEnabled.checked = currentSettings.webrtc?.enabled ?? true;
    webrtcMode.value = currentSettings.webrtc?.mode ?? 'block';

    // Canvas & Audio
    canvasEnabled.checked = currentSettings.canvas?.enabled ?? true;
    canvasNoise.value = String(currentSettings.canvas?.noiseLevel ?? 10);
    canvasNoiseValue.textContent = `${currentSettings.canvas?.noiseLevel ?? 10}%`;
    if (audioEnabled) audioEnabled.checked = currentSettings.audio?.enabled ?? true;

    // WebGL
    webglEnabled.checked = currentSettings.webgl?.enabled ?? true;
    webglVendor.value = currentSettings.webgl?.vendor ?? '';
    webglRenderer.value = currentSettings.webgl?.renderer ?? '';

    // Navigator
    navigatorEnabled.checked = currentSettings.navigator?.enabled ?? true;
    navigatorPlatform.value = currentSettings.navigator?.platform ?? 'Win32';
    hardwareConcurrency.value = String(currentSettings.navigator?.hardwareConcurrency ?? 4);
    deviceMemory.value = String(currentSettings.navigator?.deviceMemory ?? 8);
    navigatorLanguage.value = currentSettings.navigator?.language ?? 'en-US';

    // Screen
    screenEnabled.checked = currentSettings.screen?.enabled ?? true;
    const res = `${currentSettings.screen?.width ?? 1920}x${currentSettings.screen?.height ?? 1080}`;
    screenResolution.value = res;
    colorDepth.value = String(currentSettings.screen?.colorDepth ?? 24);
    pixelRatio.value = String(currentSettings.screen?.pixelRatio ?? 1);

    // Location
    geoMode.value = currentSettings.geolocation?.mode ?? 'block';
    geoLatitude.value = String(currentSettings.geolocation?.latitude ?? 0);
    geoLongitude.value = String(currentSettings.geolocation?.longitude ?? 0);
    timezone.value = currentSettings.timezone?.timezone ?? 'UTC';

    // Show/hide geo coords
    if (geoCoordsContainer) {
        geoCoordsContainer.style.display = geoMode.value === 'spoof' ? 'flex' : 'none';
    }

    // Misc - Basic
    batteryEnabled.checked = currentSettings.battery ?? true;
    networkEnabled.checked = currentSettings.network ?? true;
    pluginsEnabled.checked = currentSettings.plugins ?? true;
    fontsEnabled.checked = currentSettings.fonts?.enabled ?? true;
    if (clientRectsEnabled) clientRectsEnabled.checked = true;
    if (speechEnabled) speechEnabled.checked = true;

    // Misc - Timing & Performance
    if (performanceEnabled) performanceEnabled.checked = currentSettings.misc?.performance ?? true;
    if (mathEnabled) mathEnabled.checked = currentSettings.misc?.math ?? true;
    if (historyEnabled) historyEnabled.checked = currentSettings.misc?.history ?? true;

    // Misc - Hardware APIs
    if (bluetoothEnabled) bluetoothEnabled.checked = currentSettings.misc?.bluetooth ?? true;
    if (gamepadEnabled) gamepadEnabled.checked = currentSettings.misc?.gamepad ?? true;
    if (hardwareApisEnabled) hardwareApisEnabled.checked = currentSettings.misc?.hardwareApis ?? true;
    if (sensorsEnabled) sensorsEnabled.checked = currentSettings.misc?.sensors ?? true;

    // Misc - Privacy Signals
    if (dntEnabled) dntEnabled.checked = currentSettings.misc?.dnt ?? true;
    if (gpcEnabled) gpcEnabled.checked = currentSettings.misc?.gpc ?? true;
    if (visibilityEnabled) visibilityEnabled.checked = currentSettings.misc?.visibility ?? true;
    if (windowNameEnabled) windowNameEnabled.checked = currentSettings.misc?.windowName ?? true;

    // Misc - Input & Display
    if (keyboardEnabled) keyboardEnabled.checked = currentSettings.misc?.keyboard ?? true;
    if (pointerEnabled) pointerEnabled.checked = currentSettings.misc?.pointer ?? true;
    if (mediaQueryEnabled) mediaQueryEnabled.checked = currentSettings.misc?.mediaQuery ?? true;

    // Misc - Security & Access
    if (clipboardEnabled) clipboardEnabled.checked = currentSettings.misc?.clipboard ?? true;
    if (credentialsEnabled) credentialsEnabled.checked = currentSettings.misc?.credentials ?? true;
    if (errorStackEnabled) errorStackEnabled.checked = currentSettings.misc?.errorStack ?? true;
    if (storageEnabled) storageEnabled.checked = currentSettings.misc?.storage ?? true;
    if (blockServiceWorkersEnabled) blockServiceWorkersEnabled.checked = currentSettings.misc?.blockServiceWorkers ?? false;
    if (hideAdBlockerEnabled) hideAdBlockerEnabled.checked = currentSettings.misc?.hideAdBlocker ?? true;

    // Update profile coherence warnings
    updateCoherenceBanner();
}

// ============================================
// Save settings
// ============================================

async function saveSettings(): Promise<void> {
    if (!currentSettings) return;

    try {
        await chrome.runtime.sendMessage({
            action: 'SET_SETTINGS',
            payload: currentSettings
        });
        // Re-validate profile coherence after saving
        updateCoherenceBanner();
    } catch (error) {
        console.error('[Kriacy] Failed to save settings:', error);
    }
}

// ============================================
// Navigation
// ============================================

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        const targetSection = (item as HTMLElement).dataset.section;

        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        sections.forEach(section => {
            section.classList.toggle('active', section.id === targetSection);
        });
    });
});

// ============================================
// Randomize Functions
// ============================================

async function applyRandomWebGL() {
    if (!currentSettings) return;

    const gpu = randomGPU();
    currentSettings.webgl = {
        ...currentSettings.webgl,
        vendor: gpu.vendor,
        renderer: gpu.renderer
    };

    webglVendor.value = gpu.vendor;
    webglRenderer.value = gpu.renderer;

    await saveSettings();
    showToast('🎲 Random GPU applied!');
}

async function applyRandomNavigator() {
    if (!currentSettings) return;

    const nav = randomNavigator();
    currentSettings.navigator = {
        ...currentSettings.navigator,
        platform: nav.platform,
        hardwareConcurrency: nav.hardwareConcurrency,
        deviceMemory: nav.deviceMemory,
        language: nav.language,
        languages: [nav.language, nav.language.split('-')[0]]
    };

    navigatorPlatform.value = nav.platform;
    hardwareConcurrency.value = String(nav.hardwareConcurrency);
    deviceMemory.value = String(nav.deviceMemory);
    navigatorLanguage.value = nav.language;

    await saveSettings();
    showToast('🎲 Random system profile applied!');
}

async function applyRandomScreen() {
    if (!currentSettings) return;

    const scr = randomScreen();
    currentSettings.screen = {
        ...currentSettings.screen,
        width: scr.width,
        height: scr.height,
        colorDepth: scr.colorDepth,
        pixelRatio: scr.pixelRatio
    };

    screenResolution.value = `${scr.width}x${scr.height}`;
    colorDepth.value = String(scr.colorDepth);
    pixelRatio.value = String(scr.pixelRatio);

    await saveSettings();
    showToast('🎲 Random screen settings applied!');
}

async function applyRandomLocation() {
    if (!currentSettings) return;

    const loc = randomLocation();
    currentSettings.geolocation = {
        ...currentSettings.geolocation,
        mode: 'spoof',
        latitude: loc.lat,
        longitude: loc.lng
    };
    currentSettings.timezone = {
        ...currentSettings.timezone,
        timezone: loc.timezone,
        offset: loc.offset
    };

    geoMode.value = 'spoof';
    geoLatitude.value = loc.lat.toFixed(4);
    geoLongitude.value = loc.lng.toFixed(4);
    timezone.value = loc.timezone;

    if (geoCoordsContainer) {
        geoCoordsContainer.style.display = 'flex';
    }

    await saveSettings();
    showToast('🎲 Random location applied!');
}

async function applyRandomCanvas() {
    if (!currentSettings) return;

    // Randomize noise level between 5-25 for variety
    const noiseLevel = Math.floor(Math.random() * 20) + 5;
    currentSettings.canvas = {
        ...currentSettings.canvas,
        noiseLevel
    };

    canvasNoise.value = String(noiseLevel);
    canvasNoiseValue.textContent = `${noiseLevel}%`;

    await saveSettings();
    showToast('🎲 Canvas noise randomized! Fingerprint will change on next page load.');
}

async function applyRandomAll() {
    if (!currentSettings) return;

    // Import the coherent profile generator dynamically
    const { generateCoherentProfile, coherentProfileToSettings } = await import('../utils/profile-coherence');

    // Generate a new fingerprint seed - this is the key to changing fingerprints!
    const newSeed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
    currentSettings.fingerprintSeed = newSeed;

    // Generate a fully coherent profile - all values are guaranteed to be logically consistent
    // (e.g., Apple GPU only with Mac platform, proper hardware tiers, matching screen configs, etc.)
    const coherentProfile = generateCoherentProfile();

    // Convert the coherent profile to settings format
    const profileSettings = coherentProfileToSettings(coherentProfile, currentSettings);

    // Apply coherent settings
    currentSettings.webgl = { ...currentSettings.webgl, ...profileSettings.webgl };
    currentSettings.navigator = { ...currentSettings.navigator, ...profileSettings.navigator };
    currentSettings.screen = { ...currentSettings.screen, ...profileSettings.screen };
    currentSettings.timezone = { ...currentSettings.timezone, ...profileSettings.timezone };

    // Randomize canvas noise level
    const noiseLevel = Math.floor(Math.random() * 20) + 5;
    currentSettings.canvas = { ...currentSettings.canvas, noiseLevel };

    // Set geolocation to a coherent location based on timezone
    const timezoneLocations: Record<string, { lat: number; lng: number }> = {
        'America/New_York': { lat: 40.7128, lng: -74.006 },
        'America/Chicago': { lat: 41.8781, lng: -87.6298 },
        'America/Denver': { lat: 39.7392, lng: -104.9903 },
        'America/Los_Angeles': { lat: 34.0522, lng: -118.2437 },
        'America/Phoenix': { lat: 33.4484, lng: -112.074 },
        'Europe/London': { lat: 51.5074, lng: -0.1278 },
        'Europe/Berlin': { lat: 52.52, lng: 13.405 },
        'Europe/Vienna': { lat: 48.2082, lng: 16.3738 },
        'Europe/Zurich': { lat: 47.3769, lng: 8.5417 },
        'Europe/Paris': { lat: 48.8566, lng: 2.3522 },
        'Europe/Madrid': { lat: 40.4168, lng: -3.7038 },
        'Europe/Rome': { lat: 41.9028, lng: 12.4964 },
        'Europe/Amsterdam': { lat: 52.3676, lng: 4.9041 },
        'Europe/Warsaw': { lat: 52.2297, lng: 21.0122 },
        'Europe/Moscow': { lat: 55.7558, lng: 37.6173 },
        'Europe/Kaliningrad': { lat: 54.7104, lng: 20.4522 },
        'Asia/Tokyo': { lat: 35.6762, lng: 139.6503 },
        'Asia/Seoul': { lat: 37.5665, lng: 126.978 },
        'Asia/Shanghai': { lat: 31.2304, lng: 121.4737 },
        'Asia/Hong_Kong': { lat: 22.3193, lng: 114.1694 },
        'America/Sao_Paulo': { lat: -23.5505, lng: -46.6333 },
        'America/Fortaleza': { lat: -3.7172, lng: -38.5433 },
        'America/Toronto': { lat: 43.6532, lng: -79.3832 },
        'America/Vancouver': { lat: 49.2827, lng: -123.1207 },
        'Australia/Sydney': { lat: -33.8688, lng: 151.2093 },
        'Australia/Melbourne': { lat: -37.8136, lng: 144.9631 },
        'Australia/Perth': { lat: -31.9505, lng: 115.8605 },
    };

    const baseLocation = timezoneLocations[coherentProfile.timezone] || { lat: 40.7128, lng: -74.006 };
    currentSettings.geolocation = {
        ...currentSettings.geolocation,
        mode: 'spoof',
        latitude: baseLocation.lat + (secureRandom() - 0.5) * 0.1,
        longitude: baseLocation.lng + (secureRandom() - 0.5) * 0.1
    };

    updateUI();
    await saveSettings();

    // Inform user about the coherent profile
    showToast(`🎲 Coherent profile generated! Platform: ${coherentProfile.platform}`);
}

// ============================================
// Event Listeners - Randomize Buttons
// ============================================

randomizeAllBtn?.addEventListener('click', applyRandomAll);
randomizeCanvas?.addEventListener('click', applyRandomCanvas);
randomizeWebGL?.addEventListener('click', applyRandomWebGL);
randomizeNavigator?.addEventListener('click', applyRandomNavigator);
randomizeScreen?.addEventListener('click', applyRandomScreen);
randomizeLocation?.addEventListener('click', applyRandomLocation);

// ============================================
// Event Listeners - GPU Presets
// ============================================

document.querySelectorAll('.gpu-presets .chip').forEach(chip => {
    chip.addEventListener('click', async () => {
        if (!currentSettings) return;

        const vendor = (chip as HTMLElement).dataset.vendor || '';
        const renderer = (chip as HTMLElement).dataset.renderer || '';

        currentSettings.webgl = { ...currentSettings.webgl, vendor, renderer };
        webglVendor.value = vendor;
        webglRenderer.value = renderer;

        await saveSettings();
        showToast('GPU preset applied!');
    });
});

// ============================================
// Event Listeners - Location Presets
// ============================================

document.querySelectorAll('.location-presets .chip').forEach(chip => {
    chip.addEventListener('click', async () => {
        if (!currentSettings) return;

        const lat = parseFloat((chip as HTMLElement).dataset.lat || '0');
        const lng = parseFloat((chip as HTMLElement).dataset.lng || '0');
        const tz = (chip as HTMLElement).dataset.tz || 'UTC';

        currentSettings.geolocation = {
            ...currentSettings.geolocation,
            mode: 'spoof',
            latitude: lat,
            longitude: lng
        };
        currentSettings.timezone = {
            ...currentSettings.timezone,
            timezone: tz,
            offset: timezoneOffsets[tz] ?? 0
        };

        geoMode.value = 'spoof';
        geoLatitude.value = lat.toFixed(4);
        geoLongitude.value = lng.toFixed(4);
        timezone.value = tz;

        if (geoCoordsContainer) {
            geoCoordsContainer.style.display = 'flex';
        }

        await saveSettings();
        showToast('Location preset applied!');
    });
});

// ============================================
// Event Listeners - Settings Controls
// ============================================

// General
enabledToggle.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.enabled = enabledToggle.checked;
    await saveSettings();
});

skipLocalFilesToggle?.addEventListener('change', async () => {
    if (!currentSettings) return;
    (currentSettings as any).skipLocalFiles = skipLocalFilesToggle.checked;
    await saveSettings();
});

bypassCSPToggle?.addEventListener('change', async () => {
    if (!currentSettings) return;
    (currentSettings as any).bypassCSP = bypassCSPToggle.checked;
    await saveSettings();
    showToast('CSP bypass ' + (bypassCSPToggle.checked ? 'enabled' : 'disabled'));
});

// Comprehensive profile presets that match protection level descriptions
const PROFILE_PRESETS = {
    minimal: {
        // Minimal: Only essential protections, maximum website compatibility
        webrtc: { enabled: true, mode: 'disable_non_proxied' },
        canvas: { enabled: false, noiseLevel: 5 },
        audio: { enabled: false },
        webgl: { enabled: false },
        fonts: { enabled: false, blockEnumeration: false, spoofMetrics: false },
        navigator: { enabled: false },
        screen: { enabled: false },
        geolocation: { enabled: true, mode: 'block' },
        timezone: { enabled: false },
        battery: false,
        network: false,
        plugins: false,
        misc: {
            performance: false,
            math: false,
            history: false,
            bluetooth: true,
            gamepad: false,
            hardwareApis: true,
            sensors: false,
            dnt: true,
            gpc: true,
            visibility: false,
            windowName: false,
            keyboard: false,
            pointer: false,
            mediaQuery: false,
            clipboard: false,
            credentials: false,
            errorStack: false,
            storage: false,
            blockServiceWorkers: false
        }
    },
    balanced: {
        // Balanced: Recommended protection for most users
        webrtc: { enabled: true, mode: 'block' },
        canvas: { enabled: true, noiseLevel: 10 },
        audio: { enabled: true },
        webgl: { enabled: true },
        fonts: { enabled: true, blockEnumeration: true, spoofMetrics: true },
        navigator: { enabled: true },
        screen: { enabled: true },
        geolocation: { enabled: true, mode: 'block' },
        timezone: { enabled: true },
        battery: true,
        network: true,
        plugins: true,
        misc: {
            performance: true,
            math: true,
            history: true,
            bluetooth: true,
            gamepad: true,
            hardwareApis: true,
            sensors: true,
            dnt: true,
            gpc: true,
            visibility: true,
            windowName: true,
            keyboard: false,
            pointer: false,
            mediaQuery: true,
            clipboard: false,
            credentials: false,
            errorStack: true,
            storage: false,
            blockServiceWorkers: false
        }
    },
    aggressive: {
        // Aggressive: Maximum protection, may break some websites
        webrtc: { enabled: true, mode: 'block' },
        canvas: { enabled: true, noiseLevel: 25 },
        audio: { enabled: true },
        webgl: { enabled: true },
        fonts: { enabled: true, blockEnumeration: true, spoofMetrics: true },
        navigator: { enabled: true },
        screen: { enabled: true },
        geolocation: { enabled: true, mode: 'block' },
        timezone: { enabled: true },
        battery: true,
        network: true,
        plugins: true,
        misc: {
            performance: true,
            math: true,
            history: true,
            bluetooth: true,
            gamepad: true,
            hardwareApis: true,
            sensors: true,
            dnt: true,
            gpc: true,
            visibility: true,
            windowName: true,
            keyboard: true,
            pointer: true,
            mediaQuery: true,
            clipboard: true,
            credentials: true,
            errorStack: true,
            storage: true,
            blockServiceWorkers: false
        }
    }
};

// Profile cards
profileCards.forEach(card => {
    card.addEventListener('click', async () => {
        if (!currentSettings) return;
        const profile = (card as HTMLElement).dataset.profile as SpoofSettings['profile'];
        currentSettings.profile = profile;

        profileCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        // Apply comprehensive profile presets
        const preset = PROFILE_PRESETS[profile as keyof typeof PROFILE_PRESETS];
        if (preset) {
            // Apply all preset settings
            currentSettings.webrtc = { ...currentSettings.webrtc, ...preset.webrtc };
            currentSettings.canvas = { ...currentSettings.canvas, ...preset.canvas };
            currentSettings.audio = { ...currentSettings.audio, ...preset.audio };
            currentSettings.webgl = { ...currentSettings.webgl, ...preset.webgl };
            currentSettings.fonts = { ...currentSettings.fonts, ...preset.fonts };
            currentSettings.navigator = { ...currentSettings.navigator, ...preset.navigator };
            currentSettings.screen = { ...currentSettings.screen, ...preset.screen };
            currentSettings.geolocation = { ...currentSettings.geolocation, ...preset.geolocation };
            currentSettings.timezone = { ...currentSettings.timezone, ...preset.timezone };
            currentSettings.battery = preset.battery;
            currentSettings.network = preset.network;
            currentSettings.plugins = preset.plugins;
            currentSettings.misc = { ...currentSettings.misc, ...preset.misc };

            // Update the UI to reflect new settings
            updateUI();
        }

        await saveSettings();
        showToast(`${profile.charAt(0).toUpperCase() + profile.slice(1)} profile applied!`);
    });
});

// Reset button
resetBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        try {
            await chrome.runtime.sendMessage({ action: 'RESET_SETTINGS' });
            location.reload();
        } catch (error) {
            console.error('[Kriacy] Failed to reset settings:', error);
        }
    }
});

// WebRTC
webrtcEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.webrtc = { ...currentSettings.webrtc, enabled: webrtcEnabled.checked };
    await saveSettings();
});

webrtcMode.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.webrtc = { ...currentSettings.webrtc, mode: webrtcMode.value };
    await saveSettings();
});

// Canvas
canvasEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.canvas = { ...currentSettings.canvas, enabled: canvasEnabled.checked };
    await saveSettings();
});

canvasNoise.addEventListener('input', () => {
    canvasNoiseValue.textContent = `${canvasNoise.value}%`;
});

canvasNoise.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.canvas = { ...currentSettings.canvas, noiseLevel: parseInt(canvasNoise.value) };
    await saveSettings();
});

// Audio
audioEnabled?.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.audio = { enabled: audioEnabled.checked };
    await saveSettings();
});

// WebGL
webglEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.webgl = { ...currentSettings.webgl, enabled: webglEnabled.checked };
    await saveSettings();
});

webglVendor.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.webgl = { ...currentSettings.webgl, vendor: webglVendor.value };
    await saveSettings();
});

webglRenderer.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.webgl = { ...currentSettings.webgl, renderer: webglRenderer.value };
    await saveSettings();
});

// Navigator
navigatorEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.navigator = { ...currentSettings.navigator, enabled: navigatorEnabled.checked };
    await saveSettings();
});

navigatorPlatform.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.navigator = { ...currentSettings.navigator, platform: navigatorPlatform.value };
    await saveSettings();
});

hardwareConcurrency.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.navigator = {
        ...currentSettings.navigator,
        hardwareConcurrency: parseInt(hardwareConcurrency.value)
    };
    await saveSettings();
});

deviceMemory.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.navigator = {
        ...currentSettings.navigator,
        deviceMemory: parseInt(deviceMemory.value)
    };
    await saveSettings();
});

navigatorLanguage.addEventListener('change', async () => {
    if (!currentSettings) return;
    const lang = navigatorLanguage.value;
    currentSettings.navigator = {
        ...currentSettings.navigator,
        language: lang,
        languages: [lang, lang.split('-')[0]]
    };
    await saveSettings();
});

// Screen
screenEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.screen = { ...currentSettings.screen, enabled: screenEnabled.checked };
    await saveSettings();
});

screenResolution.addEventListener('change', async () => {
    if (!currentSettings) return;
    const [width, height] = screenResolution.value.split('x').map(Number);
    currentSettings.screen = { ...currentSettings.screen, width, height };
    await saveSettings();
});

colorDepth.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.screen = { ...currentSettings.screen, colorDepth: parseInt(colorDepth.value) };
    await saveSettings();
});

pixelRatio.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.screen = { ...currentSettings.screen, pixelRatio: parseFloat(pixelRatio.value) };
    await saveSettings();
});

// Location
geoMode.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.geolocation = { ...currentSettings.geolocation, mode: geoMode.value };

    if (geoCoordsContainer) {
        geoCoordsContainer.style.display = geoMode.value === 'spoof' ? 'flex' : 'none';
    }

    await saveSettings();
});

geoLatitude.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.geolocation = {
        ...currentSettings.geolocation,
        latitude: parseFloat(geoLatitude.value)
    };
    await saveSettings();
});

geoLongitude.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.geolocation = {
        ...currentSettings.geolocation,
        longitude: parseFloat(geoLongitude.value)
    };
    await saveSettings();
});

timezone.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.timezone = {
        ...currentSettings.timezone,
        timezone: timezone.value,
        offset: timezoneOffsets[timezone.value] ?? 0
    };
    await saveSettings();
});

// Misc
batteryEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.battery = batteryEnabled.checked;
    await saveSettings();
});

networkEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.network = networkEnabled.checked;
    await saveSettings();
});

pluginsEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.plugins = pluginsEnabled.checked;
    await saveSettings();
});

fontsEnabled.addEventListener('change', async () => {
    if (!currentSettings) return;
    currentSettings.fonts = { ...currentSettings.fonts, enabled: fontsEnabled.checked };
    await saveSettings();
});

// Helper to ensure misc object exists
function ensureMisc() {
    if (!currentSettings) return false;
    if (!currentSettings.misc) {
        currentSettings.misc = {
            performance: true, math: true, history: true,
            bluetooth: true, gamepad: true, hardwareApis: true, sensors: true,
            dnt: true, gpc: true, visibility: true, windowName: true,
            keyboard: true, pointer: true, mediaQuery: true,
            clipboard: true, credentials: true, errorStack: true, storage: true,
            blockServiceWorkers: false, hideAdBlocker: true
        };
    }
    return true;
}

// Misc - Timing & Performance
performanceEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.performance = performanceEnabled.checked;
    await saveSettings();
});

mathEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.math = mathEnabled.checked;
    await saveSettings();
});

historyEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.history = historyEnabled.checked;
    await saveSettings();
});

// Misc - Hardware APIs
bluetoothEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.bluetooth = bluetoothEnabled.checked;
    await saveSettings();
});

gamepadEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.gamepad = gamepadEnabled.checked;
    await saveSettings();
});

hardwareApisEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.hardwareApis = hardwareApisEnabled.checked;
    await saveSettings();
});

sensorsEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.sensors = sensorsEnabled.checked;
    await saveSettings();
});

// Misc - Privacy Signals
dntEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.dnt = dntEnabled.checked;
    await saveSettings();
});

gpcEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.gpc = gpcEnabled.checked;
    await saveSettings();
});

visibilityEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.visibility = visibilityEnabled.checked;
    await saveSettings();
});

windowNameEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.windowName = windowNameEnabled.checked;
    await saveSettings();
});

// Misc - Input & Display
keyboardEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.keyboard = keyboardEnabled.checked;
    await saveSettings();
});

pointerEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.pointer = pointerEnabled.checked;
    await saveSettings();
});

mediaQueryEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.mediaQuery = mediaQueryEnabled.checked;
    await saveSettings();
});

// Misc - Security & Access
clipboardEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.clipboard = clipboardEnabled.checked;
    await saveSettings();
});

credentialsEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.credentials = credentialsEnabled.checked;
    await saveSettings();
});

errorStackEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.errorStack = errorStackEnabled.checked;
    await saveSettings();
});

storageEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.storage = storageEnabled.checked;
    await saveSettings();
});

blockServiceWorkersEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.blockServiceWorkers = blockServiceWorkersEnabled.checked;
    await saveSettings();
});

hideAdBlockerEnabled?.addEventListener('change', async () => {
    if (!ensureMisc()) return;
    currentSettings!.misc.hideAdBlocker = hideAdBlockerEnabled.checked;
    await saveSettings();
});

// Initialize on load
init();

// Export to make this file an ES module (prevents global scope conflicts with popup.ts)
export { };
