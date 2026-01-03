// Kriacy Type Definitions

export interface SpoofSettings {
    enabled: boolean;
    profile: 'minimal' | 'balanced' | 'aggressive' | 'custom';

    // Fingerprint seed - changes this forces new fingerprint generation
    fingerprintSeed: number;

    // CSP bypass - strips Content-Security-Policy headers to allow worker injection
    bypassCSP: boolean;

    // Individual module settings
    webrtc: WebRTCSettings;
    canvas: CanvasSettings;
    audio: AudioSettings;
    webgl: WebGLSettings;
    fonts: FontSettings;
    navigator: NavigatorSettings;
    screen: ScreenSettings;
    geolocation: GeolocationSettings;
    timezone: TimezoneSettings;
    battery: boolean;
    network: boolean;
    plugins: boolean;
    misc: MiscSettings;
}

export interface AudioSettings {
    enabled: boolean;
}

export interface WebRTCSettings {
    enabled: boolean;
    mode: 'block' | 'disable_non_proxied' | 'default';
}

export interface CanvasSettings {
    enabled: boolean;
    noiseLevel: number; // 0-100
}

export interface WebGLSettings {
    enabled: boolean;
    vendor: string;
    renderer: string;
}

export interface FontSettings {
    enabled: boolean;
    blockEnumeration: boolean;
    spoofMetrics: boolean;
}

export interface NavigatorSettings {
    enabled: boolean;
    userAgent: string;
    platform: string;
    language: string;
    languages: string[];
    hardwareConcurrency: number;
    deviceMemory: number;
    maxTouchPoints: number;
}

export interface ScreenSettings {
    enabled: boolean;
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
}

export interface GeolocationSettings {
    enabled: boolean;
    mode: 'block' | 'spoof';
    latitude: number;
    longitude: number;
    accuracy: number;
}

export interface TimezoneSettings {
    enabled: boolean;
    timezone: string;
    offset: number;
}

export interface MiscSettings {
    // Timing & Performance
    performance: boolean;
    math: boolean;
    history: boolean;

    // Hardware APIs
    bluetooth: boolean;
    gamepad: boolean;
    hardwareApis: boolean;  // USB, Serial, HID
    sensors: boolean;

    // Privacy Signals
    dnt: boolean;
    gpc: boolean;
    visibility: boolean;
    windowName: boolean;

    // Input & Display
    keyboard: boolean;
    pointer: boolean;
    mediaQuery: boolean;

    // Security & Access
    clipboard: boolean;
    credentials: boolean;
    errorStack: boolean;
    storage: boolean;
}

// Fingerprint profile presets
export interface FingerprintProfile {
    id: string;
    name: string;
    description: string;
    userAgent: string;
    platform: string;
    vendor: string;
    renderer: string;
    screenWidth: number;
    screenHeight: number;
    colorDepth: number;
    pixelRatio: number;
    hardwareConcurrency: number;
    deviceMemory: number;
    language: string;
    languages: string[];
    timezone: string;
    timezoneOffset: number;
    maxTouchPoints: number;
}

// Message types for communication between scripts
export type MessageAction =
    | 'GET_SETTINGS'
    | 'SET_SETTINGS'
    | 'GET_PROFILE'
    | 'APPLY_PROFILE'
    | 'TOGGLE_ENABLED'
    | 'GET_STATUS'
    | 'LOG_SPOOF_ACCESS'
    | 'GET_LOGS'
    | 'CLEAR_LOGS'
    | 'LOG_SYSTEM_ENTRIES'
    | 'GET_SYSTEM_LOGS'
    | 'CLEAR_SYSTEM_LOGS'
    | 'RANDOMIZE_ALL'
    | 'RESET_SETTINGS';

export interface ExtensionMessage {
    action: MessageAction;
    payload?: unknown;
}

export interface ExtensionResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}

// Default settings - matches the "balanced" profile
export const DEFAULT_SETTINGS: SpoofSettings = {
    enabled: true,
    profile: 'balanced',
    fingerprintSeed: Date.now() ^ (Math.random() * 0xFFFFFFFF) >>> 0,
    bypassCSP: true, // Default to true for maximum protection

    webrtc: {
        enabled: true,
        mode: 'block'
    },

    canvas: {
        enabled: true,
        noiseLevel: 10
    },

    audio: {
        enabled: true
    },

    webgl: {
        enabled: true,
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.6)'
    },

    fonts: {
        enabled: true,
        blockEnumeration: true,
        spoofMetrics: true
    },

    navigator: {
        enabled: true,
        userAgent: '',
        platform: 'Win32',
        language: 'en-US',
        languages: ['en-US', 'en'],
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0
    },

    screen: {
        enabled: true,
        width: 1920,
        height: 1080,
        colorDepth: 24,
        pixelRatio: 1
    },

    geolocation: {
        enabled: true,
        mode: 'block',
        latitude: 0,
        longitude: 0,
        accuracy: 100
    },

    timezone: {
        enabled: true,
        timezone: 'UTC',
        offset: 0
    },

    battery: true,
    network: true,
    plugins: true,

    misc: {
        // Timing & Performance - enabled in balanced
        performance: true,
        math: true,
        history: true,

        // Hardware APIs - enabled in balanced
        bluetooth: true,
        gamepad: true,
        hardwareApis: true,
        sensors: true,

        // Privacy Signals - enabled in balanced
        dnt: true,
        gpc: true,
        visibility: true,
        windowName: true,

        // Input & Display - partially enabled in balanced
        keyboard: false,      // aggressive only
        pointer: false,       // aggressive only
        mediaQuery: true,

        // Security & Access - partially enabled in balanced
        clipboard: false,     // aggressive only
        credentials: false,   // aggressive only
        errorStack: true,
        storage: false        // aggressive only
    }
};
