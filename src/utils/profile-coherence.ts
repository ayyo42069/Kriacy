// Profile Coherence Validation
// Detects and warns users about logically inconsistent fingerprint combinations
// that could make their spoofed identity easily detectable

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
// GPU Platform Mapping
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
