// Media devices, codecs, DRM, and speech voices spoofing

import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32, hashString } from '../core/utils';

/**
 * Initialize speech voices spoofing
 */
export function initSpeechVoicesSpoofing(): void {
    if ('speechSynthesis' in window) {
        const originalGetVoices = speechSynthesis.getVoices.bind(speechSynthesis);

        speechSynthesis.getVoices = function (): SpeechSynthesisVoice[] {
            const voices = originalGetVoices();
            if (settings.navigator?.enabled && voices.length > 0) {
                // Use seed to determine which voices to return
                const voiceRandom = mulberry32(getFingerprintSeed() ^ 0xF01CE5);
                const startIdx = Math.floor(voiceRandom() * Math.min(3, voices.length));
                const count = 2 + Math.floor(voiceRandom() * 3); // 2-4 voices
                const endIdx = Math.min(startIdx + count, voices.length);
                return voices.slice(startIdx, endIdx);
            }
            return voices;
        };
    }
}

/**
 * Helper to generate fake device ID from seed
 */
function generateDeviceId(seed: number, index: number): string {
    const rng = mulberry32(seed ^ index);
    let id = '';
    for (let i = 0; i < 64; i++) {
        id += Math.floor(rng() * 16).toString(16);
    }
    return id;
}

/**
 * Initialize media devices spoofing
 */
export function initMediaDevicesSpoofing(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);

        navigator.mediaDevices.enumerateDevices = async function (): Promise<MediaDeviceInfo[]> {
            if (settings.navigator?.enabled) {
                const seed = getFingerprintSeed() ^ 0xDE01CE5;
                // Return device list with seed-based IDs
                return [
                    { deviceId: generateDeviceId(seed, 1), groupId: generateDeviceId(seed, 100), kind: 'audioinput', label: '', toJSON: () => ({}) } as MediaDeviceInfo,
                    { deviceId: generateDeviceId(seed, 2), groupId: generateDeviceId(seed, 100), kind: 'audiooutput', label: '', toJSON: () => ({}) } as MediaDeviceInfo,
                    { deviceId: generateDeviceId(seed, 3), groupId: generateDeviceId(seed, 101), kind: 'videoinput', label: '', toJSON: () => ({}) } as MediaDeviceInfo,
                ];
            }
            return originalEnumerateDevices();
        };
    }
}

/**
 * Initialize codec support spoofing
 */
export function initCodecSupportSpoofing(): void {
    // Override MediaSource.isTypeSupported
    if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported) {
        const originalIsTypeSupported = MediaSource.isTypeSupported.bind(MediaSource);
        MediaSource.isTypeSupported = function (type: string): boolean {
            if (settings.navigator?.enabled) {
                const codecRandom = mulberry32(getFingerprintSeed() ^ hashString(type));
                // Return true for common codecs, random for others
                const commonCodecs = ['avc1', 'mp4a', 'vp8', 'vp9', 'opus', 'aac'];
                if (commonCodecs.some(c => type.toLowerCase().includes(c))) {
                    return true;
                }
                // Random result for less common codecs to vary fingerprint
                return codecRandom() > 0.3;
            }
            return originalIsTypeSupported(type);
        };
    }

    // Override HTMLMediaElement.canPlayType
    const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (type: string): CanPlayTypeResult {
        if (settings.navigator?.enabled) {
            const codecRandom = mulberry32(getFingerprintSeed() ^ hashString(type));
            const commonTypes = ['video/mp4', 'audio/mp4', 'video/webm', 'audio/webm', 'audio/mpeg'];
            if (commonTypes.some(c => type.toLowerCase().includes(c))) {
                return 'probably';
            }
            // Vary response for other types
            const rand = codecRandom();
            if (rand > 0.6) return 'probably';
            if (rand > 0.3) return 'maybe';
            return '';
        }
        return originalCanPlayType.call(this, type);
    };
}

/**
 * Initialize DRM (EME) spoofing
 * NOTE: We intentionally don't randomly reject Widevine DRM anymore as it breaks
 * video playback on Netflix, Disney+, etc. The fingerprint variation is still
 * achieved through other means.
 * 
 * We also ensure robustness levels are specified to prevent browser warnings
 * and provide consistent fingerprinting behavior.
 */
export function initDRMSpoofing(): void {
    if (navigator.requestMediaKeySystemAccess) {
        const originalRequestMediaKeySystemAccess = navigator.requestMediaKeySystemAccess.bind(navigator);

        navigator.requestMediaKeySystemAccess = async function (
            keySystem: string,
            supportedConfigurations: MediaKeySystemConfiguration[]
        ): Promise<MediaKeySystemAccess> {
            // Ensure robustness levels are specified to prevent browser warnings
            // and provide consistent fingerprinting behavior
            const enhancedConfigurations = supportedConfigurations.map(config => {
                const enhancedConfig: MediaKeySystemConfiguration = { ...config };

                // Determine appropriate robustness level based on key system
                // Widevine uses SW_SECURE_CRYPTO as a common baseline
                // Other systems may use empty string (but it's explicitly set)
                const robustness = keySystem.includes('widevine') ? 'SW_SECURE_CRYPTO' : '';

                // Add robustness to audio capabilities if not already specified
                if (config.audioCapabilities) {
                    enhancedConfig.audioCapabilities = config.audioCapabilities.map(cap => ({
                        ...cap,
                        robustness: cap.robustness || robustness
                    }));
                }

                // Add robustness to video capabilities if not already specified
                if (config.videoCapabilities) {
                    enhancedConfig.videoCapabilities = config.videoCapabilities.map(cap => ({
                        ...cap,
                        robustness: cap.robustness || robustness
                    }));
                }

                return enhancedConfig;
            });

            return originalRequestMediaKeySystemAccess(keySystem, enhancedConfigurations);
        };
    }
}
