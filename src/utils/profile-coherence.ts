// Profile Coherence Validation & Coherent Profile Generation
// Detects and warns users about logically inconsistent fingerprint combinations
// and provides a randomization engine that ALWAYS generates coherent profiles

export interface CoherenceWarning {
    id: string;
    severity: 'warning' | 'error';
    title: string;
    message: string;
    affectedFields: string[];
    suggestion?: string;
}

interface ProfileData {
    platform?: string;
    gpuVendor?: string;
    gpuRenderer?: string;
    userAgent?: string;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    screenWidth?: number;
    screenHeight?: number;
    pixelRatio?: number;
    timezone?: string;
    language?: string;
    maxTouchPoints?: number;
}

// ============================================
// Coherent Profile Generation Engine
// ============================================

export interface CoherentProfile {
    // Platform identity
    platform: string;
    userAgent: string;

    // GPU (must match platform)
    gpuVendor: string;
    gpuRenderer: string;

    // Hardware (must be realistic for platform/GPU combo)
    hardwareConcurrency: number;
    deviceMemory: number;
    maxTouchPoints: number;

    // Screen (must match platform conventions)
    screenWidth: number;
    screenHeight: number;
    colorDepth: number;
    pixelRatio: number;

    // Locale (timezone and language should be geographically coherent)
    timezone: string;
    timezoneOffset: number;
    language: string;
    languages: string[];
}

// ============================================
// Platform-Specific Configuration Data
// ============================================

interface PlatformConfig {
    platform: string;
    userAgentTemplates: string[];
    gpuProfiles: Array<{ vendor: string; renderer: string; tier: 'integrated' | 'mid' | 'high' }>;
    hardwareSpecs: Array<{ cores: number; memory: number }>;
    screenConfigs: Array<{ width: number; height: number; pixelRatio: number; colorDepth: number }>;
    maxTouchPoints: number[];
}

interface LocaleConfig {
    language: string;
    languages: string[];
    timezones: Array<{ timezone: string; offset: number }>;
}

// Windows Platform Configuration
const WINDOWS_CONFIG: PlatformConfig = {
    platform: 'Win32',
    userAgentTemplates: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    ],
    gpuProfiles: [
        // Integrated GPUs (low-mid tier systems)
        { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'integrated' },
        { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'integrated' },
        { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'integrated' },
        { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'integrated' },
        { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'integrated' },
        // Mid-tier dedicated GPUs
        { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'mid' },
        { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'mid' },
        { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'mid' },
        { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'mid' },
        { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'mid' },
        { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 5600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'mid' },
        // High-end dedicated GPUs
        { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'high' },
        { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'high' },
        { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'high' },
        { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'high' },
        { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'high' },
        { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', tier: 'high' },
    ],
    hardwareSpecs: [
        // Low tier (integrated GPU compatible)
        { cores: 4, memory: 8 },
        { cores: 4, memory: 16 },
        { cores: 6, memory: 8 },
        { cores: 6, memory: 16 },
        // Mid tier
        { cores: 8, memory: 16 },
        { cores: 8, memory: 32 },
        // High tier
        { cores: 12, memory: 32 },
        { cores: 16, memory: 32 },
        { cores: 16, memory: 64 },
    ],
    screenConfigs: [
        { width: 1366, height: 768, pixelRatio: 1, colorDepth: 24 },
        { width: 1536, height: 864, pixelRatio: 1.25, colorDepth: 24 },
        { width: 1920, height: 1080, pixelRatio: 1, colorDepth: 24 },
        { width: 1920, height: 1080, pixelRatio: 1.25, colorDepth: 24 },
        { width: 1920, height: 1080, pixelRatio: 1.5, colorDepth: 24 },
        { width: 2560, height: 1440, pixelRatio: 1, colorDepth: 24 },
        { width: 2560, height: 1440, pixelRatio: 1.25, colorDepth: 24 },
        { width: 3840, height: 2160, pixelRatio: 1, colorDepth: 30 },
        { width: 3840, height: 2160, pixelRatio: 1.5, colorDepth: 30 },
    ],
    maxTouchPoints: [0, 0, 0, 0, 5, 10], // Most Windows desktops have no touch
};

// macOS Platform Configuration
const MACOS_CONFIG: PlatformConfig = {
    platform: 'MacIntel',
    userAgentTemplates: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
    ],
    gpuProfiles: [
        // Apple Silicon (all same tier - M-series chips)
        { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)', tier: 'mid' },
        { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)', tier: 'mid' },
        { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M3, OpenGL 4.1)', tier: 'high' },
        { vendor: 'Apple Inc.', renderer: 'Apple M1', tier: 'mid' },
        { vendor: 'Apple Inc.', renderer: 'Apple M2', tier: 'mid' },
        { vendor: 'Apple Inc.', renderer: 'Apple M3', tier: 'high' },
        // Intel Macs (older)
        { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris Plus Graphics 640, OpenGL 4.1)', tier: 'integrated' },
        { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)', tier: 'integrated' },
    ],
    hardwareSpecs: [
        // M1/M2 base configs
        { cores: 8, memory: 8 },
        { cores: 8, memory: 16 },
        // M1/M2/M3 Pro configs
        { cores: 10, memory: 16 },
        { cores: 10, memory: 32 },
        { cores: 12, memory: 32 },
        // M2/M3 Max configs
        { cores: 12, memory: 64 },
        { cores: 14, memory: 64 },
        { cores: 16, memory: 64 },
    ],
    screenConfigs: [
        // All Macs have Retina displays (2x or 3x pixel ratio)
        { width: 1440, height: 900, pixelRatio: 2, colorDepth: 30 },
        { width: 1512, height: 982, pixelRatio: 2, colorDepth: 30 },
        { width: 1680, height: 1050, pixelRatio: 2, colorDepth: 30 },
        { width: 1728, height: 1117, pixelRatio: 2, colorDepth: 30 },
        { width: 2560, height: 1600, pixelRatio: 2, colorDepth: 30 },
        { width: 2880, height: 1800, pixelRatio: 2, colorDepth: 30 },
        { width: 3024, height: 1964, pixelRatio: 2, colorDepth: 30 },
    ],
    maxTouchPoints: [0], // Macs NEVER have touchscreens
};

// Linux Platform Configuration
const LINUX_CONFIG: PlatformConfig = {
    platform: 'Linux x86_64',
    userAgentTemplates: [
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
    ],
    gpuProfiles: [
        // Mesa drivers (Linux-specific)
        { vendor: 'Mesa/X.org', renderer: 'Mesa Intel(R) UHD Graphics 620 (KBL GT2)', tier: 'integrated' },
        { vendor: 'Mesa/X.org', renderer: 'Mesa Intel(R) HD Graphics 530 (SKL GT2)', tier: 'integrated' },
        { vendor: 'Mesa/X.org', renderer: 'Mesa Intel(R) Iris Xe Graphics (TGL GT2)', tier: 'integrated' },
        { vendor: 'Mesa/AMD', renderer: 'AMD Radeon Graphics (renoir, LLVM 15.0.7, DRM 3.49, 6.1.0-17-amd64)', tier: 'mid' },
        { vendor: 'Mesa/AMD', renderer: 'AMD Radeon RX 580 Series (polaris10, LLVM 15.0.7, DRM 3.49, 6.1.0)', tier: 'mid' },
        // NVIDIA proprietary
        { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1060/PCIe/SSE2', tier: 'mid' },
        { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1080/PCIe/SSE2', tier: 'mid' },
        { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2070/PCIe/SSE2', tier: 'high' },
        { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3070/PCIe/SSE2', tier: 'high' },
    ],
    hardwareSpecs: [
        { cores: 4, memory: 8 },
        { cores: 6, memory: 8 },
        { cores: 8, memory: 8 },
        { cores: 8, memory: 16 },
        { cores: 12, memory: 16 },
        { cores: 16, memory: 32 },
        { cores: 24, memory: 64 },
    ],
    screenConfigs: [
        { width: 1366, height: 768, pixelRatio: 1, colorDepth: 24 },
        { width: 1920, height: 1080, pixelRatio: 1, colorDepth: 24 },
        { width: 1920, height: 1080, pixelRatio: 1.25, colorDepth: 24 },
        { width: 2560, height: 1440, pixelRatio: 1, colorDepth: 24 },
        { width: 3840, height: 2160, pixelRatio: 1, colorDepth: 24 },
        { width: 3840, height: 2160, pixelRatio: 2, colorDepth: 24 },
    ],
    maxTouchPoints: [0, 0, 0, 0, 5, 10],
};

// Locale configurations (geographically coherent timezone + language pairs)
const LOCALE_CONFIGS: LocaleConfig[] = [
    // North America - English
    {
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezones: [
            { timezone: 'America/New_York', offset: -300 },
            { timezone: 'America/Chicago', offset: -360 },
            { timezone: 'America/Denver', offset: -420 },
            { timezone: 'America/Los_Angeles', offset: -480 },
            { timezone: 'America/Phoenix', offset: -420 },
        ],
    },
    // UK - English
    {
        language: 'en-GB',
        languages: ['en-GB', 'en'],
        timezones: [
            { timezone: 'Europe/London', offset: 0 },
        ],
    },
    // Germany - German
    {
        language: 'de-DE',
        languages: ['de-DE', 'de', 'en'],
        timezones: [
            { timezone: 'Europe/Berlin', offset: 60 },
            { timezone: 'Europe/Vienna', offset: 60 },
            { timezone: 'Europe/Zurich', offset: 60 },
        ],
    },
    // France - French
    {
        language: 'fr-FR',
        languages: ['fr-FR', 'fr', 'en'],
        timezones: [
            { timezone: 'Europe/Paris', offset: 60 },
        ],
    },
    // Spain - Spanish
    {
        language: 'es-ES',
        languages: ['es-ES', 'es', 'en'],
        timezones: [
            { timezone: 'Europe/Madrid', offset: 60 },
        ],
    },
    // Brazil - Portuguese
    {
        language: 'pt-BR',
        languages: ['pt-BR', 'pt', 'en'],
        timezones: [
            { timezone: 'America/Sao_Paulo', offset: -180 },
            { timezone: 'America/Fortaleza', offset: -180 },
        ],
    },
    // Japan - Japanese
    {
        language: 'ja-JP',
        languages: ['ja-JP', 'ja', 'en'],
        timezones: [
            { timezone: 'Asia/Tokyo', offset: 540 },
        ],
    },
    // South Korea - Korean
    {
        language: 'ko-KR',
        languages: ['ko-KR', 'ko', 'en'],
        timezones: [
            { timezone: 'Asia/Seoul', offset: 540 },
        ],
    },
    // China - Chinese
    {
        language: 'zh-CN',
        languages: ['zh-CN', 'en'],
        timezones: [
            { timezone: 'Asia/Shanghai', offset: 480 },
            { timezone: 'Asia/Hong_Kong', offset: 480 },
        ],
    },
    // Russia - Russian
    {
        language: 'ru-RU',
        languages: ['ru-RU', 'ru', 'en'],
        timezones: [
            { timezone: 'Europe/Moscow', offset: 180 },
            { timezone: 'Europe/Kaliningrad', offset: 120 },
        ],
    },
    // Netherlands - Dutch
    {
        language: 'nl-NL',
        languages: ['nl-NL', 'nl', 'en'],
        timezones: [
            { timezone: 'Europe/Amsterdam', offset: 60 },
        ],
    },
    // Italy - Italian
    {
        language: 'it-IT',
        languages: ['it-IT', 'it', 'en'],
        timezones: [
            { timezone: 'Europe/Rome', offset: 60 },
        ],
    },
    // Poland - Polish
    {
        language: 'pl-PL',
        languages: ['pl-PL', 'pl', 'en'],
        timezones: [
            { timezone: 'Europe/Warsaw', offset: 60 },
        ],
    },
    // Australia - English
    {
        language: 'en-AU',
        languages: ['en-AU', 'en'],
        timezones: [
            { timezone: 'Australia/Sydney', offset: 660 },
            { timezone: 'Australia/Melbourne', offset: 660 },
            { timezone: 'Australia/Perth', offset: 480 },
        ],
    },
    // Canada - English
    {
        language: 'en-CA',
        languages: ['en-CA', 'en', 'fr'],
        timezones: [
            { timezone: 'America/Toronto', offset: -300 },
            { timezone: 'America/Vancouver', offset: -480 },
        ],
    },
];

// ============================================
// Coherent Randomization Engine
// ============================================

/**
 * Helper to pick random item from array
 */
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper to pick random item from array with seeded random
 */
function pickRandomSeeded<T>(arr: T[], random: () => number): T {
    return arr[Math.floor(random() * arr.length)];
}

/**
 * Get hardware specs appropriate for GPU tier
 */
function getCompatibleHardware(config: PlatformConfig, gpuTier: 'integrated' | 'mid' | 'high'): { cores: number; memory: number } {
    const specs = config.hardwareSpecs;

    switch (gpuTier) {
        case 'integrated':
            // Low-mid tier hardware (first 40% of specs)
            return pickRandom(specs.slice(0, Math.ceil(specs.length * 0.4)));
        case 'mid':
            // Mid-tier hardware (middle 60%)
            return pickRandom(specs.slice(Math.floor(specs.length * 0.3)));
        case 'high':
            // High-end hardware (last 50%)
            return pickRandom(specs.slice(Math.floor(specs.length * 0.5)));
    }
}

/**
 * Get screen config appropriate for GPU tier  
 */
function getCompatibleScreen(config: PlatformConfig, gpuTier: 'integrated' | 'mid' | 'high'): { width: number; height: number; pixelRatio: number; colorDepth: number } {
    const screens = config.screenConfigs;

    switch (gpuTier) {
        case 'integrated':
            // Lower resolutions for integrated GPUs (first 50%)
            return pickRandom(screens.slice(0, Math.ceil(screens.length * 0.5)));
        case 'mid':
            // Any resolution for mid-tier
            return pickRandom(screens);
        case 'high':
            // Prefer higher resolutions for high-end (last 60%)
            return pickRandom(screens.slice(Math.floor(screens.length * 0.4)));
    }
}

/**
 * Generate a completely coherent fingerprint profile
 * All values are guaranteed to be logically consistent
 */
export function generateCoherentProfile(platformType?: 'windows' | 'macos' | 'linux'): CoherentProfile {
    // Step 1: Choose platform
    const platformConfigs: Record<string, PlatformConfig> = {
        windows: WINDOWS_CONFIG,
        macos: MACOS_CONFIG,
        linux: LINUX_CONFIG,
    };

    const platforms = Object.keys(platformConfigs) as Array<'windows' | 'macos' | 'linux'>;
    const selectedPlatformType = platformType || pickRandom(platforms);
    const config = platformConfigs[selectedPlatformType];

    // Step 2: Choose GPU (determines hardware tier)
    const gpu = pickRandom(config.gpuProfiles);

    // Step 3: Get hardware specs compatible with GPU tier
    const hardware = getCompatibleHardware(config, gpu.tier);

    // Step 4: Get screen config compatible with GPU tier
    const screen = getCompatibleScreen(config, gpu.tier);

    // Step 5: Get random locale (timezone + language that match each other)
    const locale = pickRandom(LOCALE_CONFIGS);
    const tzConfig = pickRandom(locale.timezones);

    // Step 6: Get user agent
    const userAgent = pickRandom(config.userAgentTemplates);

    // Step 7: Get touch points (platform-appropriate)
    const maxTouchPoints = pickRandom(config.maxTouchPoints);

    return {
        platform: config.platform,
        userAgent,
        gpuVendor: gpu.vendor,
        gpuRenderer: gpu.renderer,
        hardwareConcurrency: hardware.cores,
        deviceMemory: hardware.memory,
        maxTouchPoints,
        screenWidth: screen.width,
        screenHeight: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: screen.pixelRatio,
        timezone: tzConfig.timezone,
        timezoneOffset: tzConfig.offset,
        language: locale.language,
        languages: locale.languages,
    };
}

/**
 * Generate a coherent profile using a seed for reproducibility
 */
export function generateSeededCoherentProfile(seed: number, platformType?: 'windows' | 'macos' | 'linux'): CoherentProfile {
    // Create seeded random function
    const seededRandom = ((): () => number => {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    })();

    // Platform selection
    const platformConfigs: Record<string, PlatformConfig> = {
        windows: WINDOWS_CONFIG,
        macos: MACOS_CONFIG,
        linux: LINUX_CONFIG,
    };

    const platforms = Object.keys(platformConfigs) as Array<'windows' | 'macos' | 'linux'>;
    const selectedPlatformType = platformType || pickRandomSeeded(platforms, seededRandom);
    const config = platformConfigs[selectedPlatformType];

    // GPU selection
    const gpu = pickRandomSeeded(config.gpuProfiles, seededRandom);

    // Hardware compatible with GPU tier
    const getCompatibleHardwareSeeded = (tier: 'integrated' | 'mid' | 'high') => {
        const specs = config.hardwareSpecs;
        switch (tier) {
            case 'integrated':
                return pickRandomSeeded(specs.slice(0, Math.ceil(specs.length * 0.4)), seededRandom);
            case 'mid':
                return pickRandomSeeded(specs.slice(Math.floor(specs.length * 0.3)), seededRandom);
            case 'high':
                return pickRandomSeeded(specs.slice(Math.floor(specs.length * 0.5)), seededRandom);
        }
    };

    // Screen compatible with GPU tier
    const getCompatibleScreenSeeded = (tier: 'integrated' | 'mid' | 'high') => {
        const screens = config.screenConfigs;
        switch (tier) {
            case 'integrated':
                return pickRandomSeeded(screens.slice(0, Math.ceil(screens.length * 0.5)), seededRandom);
            case 'mid':
                return pickRandomSeeded(screens, seededRandom);
            case 'high':
                return pickRandomSeeded(screens.slice(Math.floor(screens.length * 0.4)), seededRandom);
        }
    };

    const hardware = getCompatibleHardwareSeeded(gpu.tier);
    const screen = getCompatibleScreenSeeded(gpu.tier);
    const locale = pickRandomSeeded(LOCALE_CONFIGS, seededRandom);
    const tzConfig = pickRandomSeeded(locale.timezones, seededRandom);
    const userAgent = pickRandomSeeded(config.userAgentTemplates, seededRandom);
    const maxTouchPoints = pickRandomSeeded(config.maxTouchPoints, seededRandom);

    return {
        platform: config.platform,
        userAgent,
        gpuVendor: gpu.vendor,
        gpuRenderer: gpu.renderer,
        hardwareConcurrency: hardware.cores,
        deviceMemory: hardware.memory,
        maxTouchPoints,
        screenWidth: screen.width,
        screenHeight: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: screen.pixelRatio,
        timezone: tzConfig.timezone,
        timezoneOffset: tzConfig.offset,
        language: locale.language,
        languages: locale.languages,
    };
}

/**
 * Convert CoherentProfile to settings format used by the extension
 */
export function coherentProfileToSettings(profile: CoherentProfile, existingSettings?: any): any {
    return {
        ...existingSettings,
        webgl: {
            enabled: existingSettings?.webgl?.enabled ?? true,
            vendor: profile.gpuVendor,
            renderer: profile.gpuRenderer,
        },
        navigator: {
            enabled: existingSettings?.navigator?.enabled ?? true,
            userAgent: profile.userAgent,
            platform: profile.platform,
            language: profile.language,
            languages: profile.languages,
            hardwareConcurrency: profile.hardwareConcurrency,
            deviceMemory: profile.deviceMemory,
            maxTouchPoints: profile.maxTouchPoints,
        },
        screen: {
            enabled: existingSettings?.screen?.enabled ?? true,
            width: profile.screenWidth,
            height: profile.screenHeight,
            colorDepth: profile.colorDepth,
            pixelRatio: profile.pixelRatio,
        },
        timezone: {
            enabled: existingSettings?.timezone?.enabled ?? true,
            timezone: profile.timezone,
            offset: profile.timezoneOffset,
        },
    };
}

// ============================================
// GPU Platform Mapping (for validation)
// ============================================

const GPU_PLATFORM_MAPPING: Record<string, string[]> = {
    // Apple GPUs are macOS only
    'Apple M1': ['MacIntel'],
    'Apple M2': ['MacIntel'],
    'Apple M3': ['MacIntel'],
    'Apple GPU': ['MacIntel'],
    'Apple': ['MacIntel'],

    // Mesa drivers are Linux only
    'Mesa': ['Linux x86_64', 'Linux armv7l', 'Linux aarch64'],
    'Mesa/X.org': ['Linux x86_64', 'Linux armv7l', 'Linux aarch64'],
    'Mesa DRI': ['Linux x86_64', 'Linux armv7l', 'Linux aarch64'],

    // Intel/NVIDIA/AMD work on Windows and Linux (and sometimes Mac for older Intel)
    'Intel': ['Win32', 'Linux x86_64', 'MacIntel'],
    'NVIDIA': ['Win32', 'Linux x86_64'],
    'AMD': ['Win32', 'Linux x86_64'],
    'Radeon': ['Win32', 'Linux x86_64'],
    'GeForce': ['Win32', 'Linux x86_64'],

    // ANGLE is typically Windows/ChromeOS
    'ANGLE': ['Win32', 'Linux x86_64', 'MacIntel'],

    // Direct3D is Windows only
    'Direct3D': ['Win32'],
    'D3D11': ['Win32'],
    'D3D12': ['Win32'],
};

// ============================================
// Platform User Agent Patterns
// ============================================

const PLATFORM_UA_PATTERNS: Record<string, RegExp[]> = {
    'Win32': [
        /Windows NT/i,
        /Win64/i,
        /WOW64/i,
    ],
    'MacIntel': [
        /Macintosh/i,
        /Mac OS X/i,
        /Intel Mac/i,
    ],
    'Linux x86_64': [
        /Linux/i,
        /X11/i,
        /Ubuntu/i,
        /Fedora/i,
    ],
};

// ============================================
// Hardware Specifications by Platform
// ============================================

const TYPICAL_HARDWARE: Record<string, { cores: number[]; memory: number[] }> = {
    // Desktop Windows typically has 4-16 cores, 8-32 GB RAM
    'Win32': { cores: [4, 6, 8, 12, 16], memory: [4, 8, 16, 32] },

    // Mac typically has fewer reported cores, various RAM
    'MacIntel': { cores: [4, 6, 8, 10, 12, 14, 16], memory: [8, 16, 32, 64] },

    // Linux can vary widely
    'Linux x86_64': { cores: [2, 4, 6, 8, 12, 16, 24, 32], memory: [2, 4, 8, 16, 32, 64] },
};

// ============================================
// Screen Settings by Platform
// ============================================

const TYPICAL_SCREENS: Record<string, { pixelRatios: number[]; commonRes: string[] }> = {
    'Win32': {
        pixelRatios: [1, 1.25, 1.5, 2],
        commonRes: ['1920x1080', '2560x1440', '1366x768', '1536x864', '3840x2160'],
    },
    'MacIntel': {
        pixelRatios: [2, 3], // Retina displays typically 2x or higher
        commonRes: ['2560x1600', '2880x1800', '3024x1964', '1440x900', '1680x1050'],
    },
    'Linux x86_64': {
        pixelRatios: [1, 1.25, 2],
        commonRes: ['1920x1080', '2560x1440', '1366x768', '3840x2160'],
    },
};

// ============================================
// Touch Points by Device Type
// ============================================

const PLATFORM_TOUCH: Record<string, number[]> = {
    'Win32': [0, 5, 10], // Desktops: 0, touchscreens: 5-10
    'MacIntel': [0], // Macs don't have touchscreens
    'Linux x86_64': [0, 5, 10],
};

// ============================================
// Validation Functions
// ============================================

/**
 * Check if GPU is compatible with the selected platform
 */
function validateGPUPlatform(profile: ProfileData): CoherenceWarning | null {
    if (!profile.platform || (!profile.gpuVendor && !profile.gpuRenderer)) {
        return null;
    }

    const gpuString = `${profile.gpuVendor || ''} ${profile.gpuRenderer || ''}`;

    // Check for Apple GPU on non-Mac platform
    if ((gpuString.includes('Apple M') || gpuString.includes('Apple GPU')) && profile.platform !== 'MacIntel') {
        return {
            id: 'gpu-platform-apple',
            severity: 'error',
            title: 'Apple GPU on Non-Mac Platform',
            message: `Apple Silicon (M1/M2/M3) GPUs are exclusive to macOS. Using this GPU with "${profile.platform}" platform is easily detectable.`,
            affectedFields: ['webglVendor', 'webglRenderer', 'navigatorPlatform'],
            suggestion: 'Change platform to "MacIntel" or select a different GPU.',
        };
    }

    // Check for Mesa driver on non-Linux platform
    if ((gpuString.includes('Mesa') || gpuString.includes('Mesa/X.org')) && !profile.platform?.includes('Linux')) {
        return {
            id: 'gpu-platform-mesa',
            severity: 'error',
            title: 'Mesa Driver on Non-Linux Platform',
            message: `Mesa graphics drivers are Linux-specific. Using Mesa with "${profile.platform}" is a clear indicator of spoofing.`,
            affectedFields: ['webglVendor', 'webglRenderer', 'navigatorPlatform'],
            suggestion: 'Change platform to a Linux variant or select a different GPU.',
        };
    }

    // Check for Direct3D on non-Windows platform
    if ((gpuString.includes('Direct3D') || gpuString.includes('D3D11') || gpuString.includes('D3D12')) && profile.platform !== 'Win32') {
        return {
            id: 'gpu-platform-d3d',
            severity: 'error',
            title: 'Direct3D on Non-Windows Platform',
            message: `Direct3D is a Windows-only graphics API. Using D3D with "${profile.platform}" is impossible in reality.`,
            affectedFields: ['webglVendor', 'webglRenderer', 'navigatorPlatform'],
            suggestion: 'Change platform to "Win32" or select a GPU that uses OpenGL.',
        };
    }

    return null;
}

/**
 * Check if User Agent matches the platform
 */
function validateUAPlatform(profile: ProfileData): CoherenceWarning | null {
    if (!profile.platform || !profile.userAgent) {
        return null;
    }

    const platform = profile.platform;
    const ua = profile.userAgent;

    // Check if UA matches platform
    const patterns = PLATFORM_UA_PATTERNS[platform];
    if (patterns && patterns.length > 0) {
        const matchesAny = patterns.some(pattern => pattern.test(ua));
        if (!matchesAny) {
            // Determine what platform the UA suggests
            let suggestedPlatform = 'unknown';
            for (const [plat, pats] of Object.entries(PLATFORM_UA_PATTERNS)) {
                if (pats.some(p => p.test(ua))) {
                    suggestedPlatform = plat;
                    break;
                }
            }

            return {
                id: 'ua-platform-mismatch',
                severity: 'error',
                title: 'User Agent / Platform Mismatch',
                message: `Your User Agent suggests "${suggestedPlatform}" but platform is set to "${platform}". This mismatch is easily detected.`,
                affectedFields: ['navigatorPlatform', 'userAgent'],
                suggestion: `Either update the User Agent to match ${platform} or change the platform.`,
            };
        }
    }

    return null;
}

/**
 * Check if hardware specs are plausible for the platform
 */
function validateHardwareSpecs(profile: ProfileData): CoherenceWarning | null {
    if (!profile.platform) {
        return null;
    }

    const specs = TYPICAL_HARDWARE[profile.platform];
    if (!specs) {
        return null;
    }

    const warnings: string[] = [];

    // Check core count
    if (profile.hardwareConcurrency && !specs.cores.includes(profile.hardwareConcurrency)) {
        // Only warn for truly unusual values
        if (profile.hardwareConcurrency > 24 || profile.hardwareConcurrency < 2) {
            warnings.push(`${profile.hardwareConcurrency} CPU cores is unusual`);
        }
    }

    // Check memory for Mac specifically (Macs don't typically report 2GB)
    if (profile.platform === 'MacIntel' && profile.deviceMemory === 2) {
        warnings.push('2GB RAM is unrealistic for macOS devices');
    }

    // High-end specs with low-end GPU (or vice versa)
    if (profile.hardwareConcurrency && profile.hardwareConcurrency >= 12 && profile.deviceMemory && profile.deviceMemory <= 4) {
        warnings.push('High core count with very low RAM is unusual');
    }

    if (warnings.length > 0) {
        return {
            id: 'hardware-unusual',
            severity: 'warning',
            title: 'Unusual Hardware Configuration',
            message: warnings.join('. ') + '.',
            affectedFields: ['hardwareConcurrency', 'deviceMemory'],
            suggestion: 'Consider using more common hardware specifications for your platform.',
        };
    }

    return null;
}

/**
 * Check if screen settings are plausible
 */
function validateScreenSettings(profile: ProfileData): CoherenceWarning | null {
    if (!profile.platform) {
        return null;
    }

    const screenConfig = TYPICAL_SCREENS[profile.platform];
    if (!screenConfig) {
        return null;
    }

    const warnings: string[] = [];

    // Mac-specific: Low pixel ratio on Mac is suspicious
    if (profile.platform === 'MacIntel' && profile.pixelRatio && profile.pixelRatio < 2) {
        warnings.push(`Pixel ratio of ${profile.pixelRatio}x is unusual for Mac (Retina displays are typically 2x+)`);
    }

    // 4K resolution with 1x pixel ratio is rare on Mac
    if (profile.platform === 'MacIntel' && profile.screenWidth && profile.screenWidth >= 3840 && profile.pixelRatio && profile.pixelRatio === 1) {
        warnings.push('4K resolution with 1x pixel ratio is uncommon on Mac');
    }

    // Very high resolution with low-end specs
    if (profile.screenWidth && profile.screenWidth >= 3840 && profile.deviceMemory && profile.deviceMemory <= 4) {
        warnings.push('4K display with only 4GB RAM is an unusual combination');
    }

    if (warnings.length > 0) {
        return {
            id: 'screen-unusual',
            severity: 'warning',
            title: 'Unusual Screen Configuration',
            message: warnings.join('. ') + '.',
            affectedFields: ['screenResolution', 'pixelRatio'],
            suggestion: 'Consider using screen settings typical for your selected platform.',
        };
    }

    return null;
}

/**
 * Check if touch points make sense for the platform
 */
function validateTouchPoints(profile: ProfileData): CoherenceWarning | null {
    if (!profile.platform || profile.maxTouchPoints === undefined) {
        return null;
    }

    // Mac should never have touch points (no touchscreen Macs exist)
    if (profile.platform === 'MacIntel' && profile.maxTouchPoints > 0) {
        return {
            id: 'touch-mac',
            severity: 'warning',
            title: 'Touch Points on Mac',
            message: `macOS devices don't have touchscreens. Reporting ${profile.maxTouchPoints} touch points on MacIntel is suspicious.`,
            affectedFields: ['maxTouchPoints', 'navigatorPlatform'],
            suggestion: 'Set touch points to 0 for Mac platform.',
        };
    }

    return null;
}

/**
 * Cross-check GPU power with hardware specs
 */
function validateGPUHardwareMatch(profile: ProfileData): CoherenceWarning | null {
    if (!profile.gpuRenderer || !profile.hardwareConcurrency) {
        return null;
    }

    const gpu = profile.gpuRenderer.toLowerCase();
    const cores = profile.hardwareConcurrency;
    const memory = profile.deviceMemory;

    // High-end GPU with very low system specs
    const highEndGPUs = ['rtx 4090', 'rtx 4080', 'rtx 3090', 'rtx 3080', 'rx 7900', 'rx 6900'];
    const isHighEndGPU = highEndGPUs.some(g => gpu.includes(g));

    if (isHighEndGPU && (cores <= 4 || (memory && memory <= 4))) {
        return {
            id: 'gpu-specs-mismatch',
            severity: 'warning',
            title: 'GPU / System Specs Mismatch',
            message: `A high-end GPU like this is typically paired with more powerful system specs. ${cores} cores and ${memory}GB RAM is unusual.`,
            affectedFields: ['webglRenderer', 'hardwareConcurrency', 'deviceMemory'],
            suggestion: 'Consider using higher system specs or a more modest GPU.',
        };
    }

    // Integrated GPU with high-end specs
    const integratedGPUs = ['uhd graphics', 'hd graphics', 'iris', 'vega 8', 'vega 6'];
    const isIntegratedGPU = integratedGPUs.some(g => gpu.includes(g));

    if (isIntegratedGPU && cores >= 16 && memory && memory >= 32) {
        return {
            id: 'gpu-specs-mismatch-2',
            severity: 'warning',
            title: 'Integrated GPU with High-End Specs',
            message: 'Systems with 16+ cores and 32GB+ RAM typically have dedicated GPUs, not integrated graphics.',
            affectedFields: ['webglRenderer', 'hardwareConcurrency', 'deviceMemory'],
            suggestion: 'Consider using a dedicated GPU or lower system specs.',
        };
    }

    return null;
}

/**
 * Validate timezone and language consistency
 */
function validateTimezoneLanguage(profile: ProfileData): CoherenceWarning | null {
    if (!profile.timezone || !profile.language) {
        return null;
    }

    // Map languages to typical timezones
    const languageTimezones: Record<string, string[]> = {
        'en-US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'],
        'en-GB': ['Europe/London'],
        'de-DE': ['Europe/Berlin', 'Europe/Vienna', 'Europe/Zurich'],
        'fr-FR': ['Europe/Paris'],
        'es-ES': ['Europe/Madrid'],
        'ja-JP': ['Asia/Tokyo'],
        'zh-CN': ['Asia/Shanghai', 'Asia/Hong_Kong'],
        'ko-KR': ['Asia/Seoul'],
        'pt-BR': ['America/Sao_Paulo', 'America/Fortaleza'],
        'ru-RU': ['Europe/Moscow', 'Europe/Kaliningrad'],
    };

    const expectedTimezones = languageTimezones[profile.language];

    if (expectedTimezones && !expectedTimezones.includes(profile.timezone)) {
        // Only warn for obvious mismatches
        const isObviousMismatch =
            (profile.language.startsWith('en-US') && profile.timezone.startsWith('Asia/')) ||
            (profile.language.startsWith('ja-JP') && !profile.timezone.startsWith('Asia/')) ||
            (profile.language.startsWith('zh-CN') && !profile.timezone.startsWith('Asia/')) ||
            (profile.language.startsWith('de-DE') && !profile.timezone.startsWith('Europe/')) ||
            (profile.language.startsWith('ru-RU') && !profile.timezone.startsWith('Europe/'));

        if (isObviousMismatch) {
            return {
                id: 'tz-language-mismatch',
                severity: 'warning',
                title: 'Timezone / Language Mismatch',
                message: `Language "${profile.language}" with timezone "${profile.timezone}" is an unusual combination.`,
                affectedFields: ['timezone', 'navigatorLanguage'],
                suggestion: 'Consider matching the timezone to a region where the language is commonly spoken.',
            };
        }
    }

    return null;
}

// ============================================
// Main Validation Function
// ============================================

/**
 * Validate profile coherence and return all warnings
 */
export function validateProfileCoherence(profile: ProfileData): CoherenceWarning[] {
    const warnings: CoherenceWarning[] = [];

    // Run all validation checks
    const validators = [
        validateGPUPlatform,
        validateUAPlatform,
        validateHardwareSpecs,
        validateScreenSettings,
        validateTouchPoints,
        validateGPUHardwareMatch,
        validateTimezoneLanguage,
    ];

    for (const validator of validators) {
        const warning = validator(profile);
        if (warning) {
            warnings.push(warning);
        }
    }

    return warnings;
}

/**
 * Extract profile data from settings for validation
 */
export function extractProfileFromSettings(settings: any): ProfileData {
    return {
        platform: settings.navigator?.platform,
        gpuVendor: settings.webgl?.vendor,
        gpuRenderer: settings.webgl?.renderer,
        userAgent: settings.navigator?.userAgent,
        hardwareConcurrency: settings.navigator?.hardwareConcurrency,
        deviceMemory: settings.navigator?.deviceMemory,
        screenWidth: settings.screen?.width,
        screenHeight: settings.screen?.height,
        pixelRatio: settings.screen?.pixelRatio,
        timezone: settings.timezone?.timezone,
        language: settings.navigator?.language,
        maxTouchPoints: settings.navigator?.maxTouchPoints,
    };
}

/**
 * Get a summary of coherence status
 */
export function getCoherenceSummary(warnings: CoherenceWarning[]): {
    status: 'ok' | 'warning' | 'error';
    errorCount: number;
    warningCount: number;
    message: string;
} {
    const errorCount = warnings.filter(w => w.severity === 'error').length;
    const warningCount = warnings.filter(w => w.severity === 'warning').length;

    if (errorCount > 0) {
        return {
            status: 'error',
            errorCount,
            warningCount,
            message: `${errorCount} critical issue${errorCount > 1 ? 's' : ''} detected. Your fingerprint may be easily identified as fake.`,
        };
    }

    if (warningCount > 0) {
        return {
            status: 'warning',
            errorCount,
            warningCount,
            message: `${warningCount} potential inconsistenc${warningCount > 1 ? 'ies' : 'y'} found. Consider reviewing your settings.`,
        };
    }

    return {
        status: 'ok',
        errorCount: 0,
        warningCount: 0,
        message: 'Your fingerprint profile appears coherent and realistic.',
    };
}
