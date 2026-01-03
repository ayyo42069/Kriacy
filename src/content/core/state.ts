// Shared state management for Kriacy fingerprint protection

import { KriacySettings } from './types';
import { hashString, mulberry32 } from './utils';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('State');

// Domain seed for per-domain uniqueness
const DOMAIN_SEED = hashString(window.location.hostname);

// Generate a fallback seed (used if settings haven't loaded yet)
let fallbackSeed = (Date.now() ^ (Math.random() * 0xFFFFFFFF) ^ DOMAIN_SEED) >>> 0;

// Try to get cached seed from localStorage FIRST (persists across sessions)
try {
    const storedSeed = localStorage.getItem('__kriacy_fp_seed__');
    if (storedSeed) {
        fallbackSeed = parseInt(storedSeed, 10);
        log.settings('Using stored seed from localStorage', { seed: fallbackSeed.toString(16) });
    } else {
        // Fallback to sessionStorage for backwards compatibility
        const sessionSeed = sessionStorage.getItem('__kriacy_seed__');
        if (sessionSeed) {
            fallbackSeed = parseInt(sessionSeed, 10);
        }
    }
} catch (e) {
    // Storage not available
}

// Default settings structure
const DEFAULT_SETTINGS: KriacySettings = {
    enabled: true,
    fingerprintSeed: fallbackSeed,
    skipLocalFiles: true, // Skip protections for local files (file://, PDFs) by default
    webrtc: { enabled: true, mode: 'block' },
    canvas: { enabled: true, noiseLevel: 10 },
    audio: { enabled: true },
    webgl: { enabled: true, vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    fonts: { enabled: true },
    navigator: {
        enabled: true,
        platform: 'Win32',
        language: 'en-US',
        languages: ['en-US', 'en'],
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0
    },
    screen: { enabled: true, width: 1366, height: 768, colorDepth: 24, pixelRatio: 1 },
    geolocation: { enabled: true, mode: 'block', latitude: 0, longitude: 0, accuracy: 100 },
    timezone: { enabled: true, timezone: 'UTC', offset: 0 },
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
        blockServiceWorkers: false, // Off by default to avoid breaking sites
        hideAdBlocker: true         // On by default to hide ad blockers
    }
};

/**
 * Load settings - priority: __KRIACY_SETTINGS__ > localStorage (with dynamic key) > localStorage (seed only) > defaults
 */
function loadInitialSettings(): KriacySettings {
    // First, check if service worker injected settings (most reliable for persistence)
    const injectedSettings = (window as any).__KRIACY_SETTINGS__;
    if (injectedSettings) {
        log.settings('Using injected settings from service worker');
        return { ...DEFAULT_SETTINGS, ...injectedSettings };
    }

    // Second, try localStorage with FIXED key
    try {
        const storedSettings = localStorage.getItem('__kriacy_settings__');
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            log.settings('Using settings from localStorage');
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (e) {
        // Storage not available or parse error
    }

    // Third, try to at least get the fingerprint seed from localStorage
    // This ensures consistent fingerprints even when settings haven't fully loaded
    try {
        const storedSeed = localStorage.getItem('__kriacy_fp_seed__');
        if (storedSeed) {
            const seed = parseInt(storedSeed, 10);
            if (!isNaN(seed)) {
                log.settings('Using default settings with stored seed', { seed: seed.toString(16) });
                return { ...DEFAULT_SETTINGS, fingerprintSeed: seed };
            }
        }
    } catch (e) {
        // Storage not available
    }

    // Finally, use defaults
    log.settings('Using default settings');
    return DEFAULT_SETTINGS;
}

// Settings loaded from storage or injected by service worker
export let settings: KriacySettings = loadInitialSettings();

/**
 * Get the fingerprint seed combined with domain for uniqueness
 */
export function getFingerprintSeed(): number {
    return (settings.fingerprintSeed ^ DOMAIN_SEED) >>> 0;
}

// Create session random generator
export let sessionRandom = mulberry32(getFingerprintSeed());

// Pre-compute noise values
export let CANVAS_NOISE_R = Math.floor(sessionRandom() * 10) - 5;
export let CANVAS_NOISE_G = Math.floor(sessionRandom() * 10) - 5;
export let CANVAS_NOISE_B = Math.floor(sessionRandom() * 10) - 5;
export let AUDIO_NOISE = (sessionRandom() - 0.5) * 0.0001;
export let RECT_NOISE = (sessionRandom() - 0.5) * 0.5;

/**
 * Recalculate noise values when settings change
 */
export function recalculateNoiseValues(): void {
    const seed = getFingerprintSeed();
    sessionRandom = mulberry32(seed);
    CANVAS_NOISE_R = Math.floor(sessionRandom() * 10) - 5;
    CANVAS_NOISE_G = Math.floor(sessionRandom() * 10) - 5;
    CANVAS_NOISE_B = Math.floor(sessionRandom() * 10) - 5;
    AUDIO_NOISE = (sessionRandom() - 0.5) * 0.0001;
    RECT_NOISE = (sessionRandom() - 0.5) * 0.5;

    // Store in BOTH localStorage (persistent) and sessionStorage (for compatibility)
    try {
        localStorage.setItem('__kriacy_fp_seed__', seed.toString());
        sessionStorage.setItem('__kriacy_seed__', seed.toString());
    } catch (e) { }

    log.settings('Fingerprint seed updated', { seed: seed.toString(16) });
}

/**
 * Update settings with new values
 */
export function updateSettings(newSettings: Partial<KriacySettings>): void {
    const oldSeed = settings.fingerprintSeed;
    settings = { ...settings, ...newSettings };
    if (newSettings.fingerprintSeed && newSettings.fingerprintSeed !== oldSeed) {
        recalculateNoiseValues();
    }
}

/**
 * Initialize settings listeners
 */
export function initSettingsListeners(): void {
    log.init('Initializing settings listeners', { seed: getFingerprintSeed().toString(16) });

    // Listen for settings updates
    window.addEventListener('kriacy-init', (e: any) => {
        if (e.detail) {
            updateSettings(e.detail);
            log.settings('Settings loaded', { seed: getFingerprintSeed().toString(16) });
        }
    });

    window.addEventListener('kriacy-settings-update', (e: any) => {
        if (e.detail) {
            const oldSeed = settings.fingerprintSeed;
            updateSettings(e.detail);
            if (e.detail.fingerprintSeed && e.detail.fingerprintSeed !== oldSeed) {
                log.warn('Fingerprint seed changed - reload page for full effect');
            }
            log.settings('Settings updated');
        }
    });
}
