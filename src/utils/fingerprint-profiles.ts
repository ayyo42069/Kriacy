// Fingerprint profiles - predefined browser/OS combinations
import { FingerprintProfile } from '../types';

export const FINGERPRINT_PROFILES: FingerprintProfile[] = [
    {
        id: 'windows-chrome',
        name: 'Windows 10 + Chrome',
        description: 'Common Windows 10 Chrome configuration',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 0
    },
    {
        id: 'macos-chrome',
        name: 'macOS + Chrome',
        description: 'Common macOS Chrome configuration',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)',
        screenWidth: 1440,
        screenHeight: 900,
        colorDepth: 30,
        pixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 0
    },
    {
        id: 'linux-firefox',
        name: 'Linux + Firefox',
        description: 'Common Linux Firefox configuration',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        platform: 'Linux x86_64',
        vendor: 'Mesa/AMD',
        renderer: 'AMD Radeon Graphics (renoir, LLVM 15.0.7, DRM 3.49, 6.1.0-17-amd64)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'Europe/London',
        timezoneOffset: 0,
        maxTouchPoints: 0
    },
    {
        id: 'android-chrome',
        name: 'Android + Chrome Mobile',
        description: 'Common Android Chrome Mobile configuration',
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        vendor: 'Qualcomm',
        renderer: 'Adreno (TM) 730',
        screenWidth: 412,
        screenHeight: 915,
        colorDepth: 24,
        pixelRatio: 2.625,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 5
    },
    {
        id: 'iphone-safari',
        name: 'iPhone + Safari',
        description: 'Common iPhone Safari configuration',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        vendor: 'Apple Inc.',
        renderer: 'Apple GPU',
        screenWidth: 390,
        screenHeight: 844,
        colorDepth: 32,
        pixelRatio: 3,
        hardwareConcurrency: 6,
        deviceMemory: 4,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 5
    }
];

/**
 * Get a profile by ID
 */
export function getProfileById(id: string): FingerprintProfile | undefined {
    return FINGERPRINT_PROFILES.find(p => p.id === id);
}

/**
 * Get a random profile
 */
export function getRandomProfile(): FingerprintProfile {
    const index = Math.floor(Math.random() * FINGERPRINT_PROFILES.length);
    return FINGERPRINT_PROFILES[index];
}

/**
 * Generate consistent random values based on a seed
 */
export function seededRandom(seed: number): () => number {
    return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}
