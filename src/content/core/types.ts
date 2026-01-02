// Core types and interfaces for Kriacy fingerprint protection

export interface WebRTCSettings {
    enabled: boolean;
    mode: 'block' | 'disable_non_proxied' | 'default';
}

export interface CanvasSettings {
    enabled: boolean;
    noiseLevel: number;
}

export interface AudioSettings {
    enabled: boolean;
}

export interface WebGLSettings {
    enabled: boolean;
    vendor: string;
    renderer: string;
}

export interface FontsSettings {
    enabled: boolean;
}

export interface NavigatorSettings {
    enabled: boolean;
    platform: string;
    language: string;
    languages: string[];
    hardwareConcurrency: number;
    deviceMemory: number;
    maxTouchPoints: number;
    userAgent?: string; // Optional: for worker consistency
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
    mode: 'block' | 'spoof' | 'default';
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
}

export interface KriacySettings {
    enabled: boolean;
    fingerprintSeed: number;
    webrtc: WebRTCSettings;
    canvas: CanvasSettings;
    audio: AudioSettings;
    webgl: WebGLSettings;
    fonts: FontsSettings;
    navigator: NavigatorSettings;
    screen: ScreenSettings;
    geolocation: GeolocationSettings;
    timezone: TimezoneSettings;
    battery: boolean;
    network: boolean;
    plugins: boolean;
    misc: MiscSettings;
}
