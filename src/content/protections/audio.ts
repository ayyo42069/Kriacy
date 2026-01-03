// Audio fingerprint protection

import { settings, getFingerprintSeed, AUDIO_NOISE } from '../core/state';
import { mulberry32 } from '../core/utils';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('Audio');

/**
 * Initialize audio fingerprint protection
 */
export function initAudioProtection(): void {
    const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const OriginalOfflineAudioContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

    if (OriginalAudioContext) {
        log.init('Initializing audio fingerprint protection');
        const originalCreateAnalyser = OriginalAudioContext.prototype.createAnalyser;
        const originalCreateOscillator = OriginalAudioContext.prototype.createOscillator;
        const originalCreateDynamicsCompressor = OriginalAudioContext.prototype.createDynamicsCompressor;

        // Override getFloatFrequencyData
        const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
        AnalyserNode.prototype.getFloatFrequencyData = function (array: Float32Array<ArrayBuffer>): void {
            originalGetFloatFrequencyData.call(this, array);
            if (settings.audio?.enabled) {
                const noiseRandom = mulberry32(getFingerprintSeed());
                for (let i = 0; i < array.length; i++) {
                    array[i] += (noiseRandom() - 0.5) * 0.1 + AUDIO_NOISE;
                }
            }
        };

        // Override getByteFrequencyData
        const originalGetByteFrequencyData = AnalyserNode.prototype.getByteFrequencyData;
        AnalyserNode.prototype.getByteFrequencyData = function (array: Uint8Array<ArrayBuffer>): void {
            originalGetByteFrequencyData.call(this, array);
            if (settings.audio?.enabled) {
                const noiseRandom = mulberry32(getFingerprintSeed());
                for (let i = 0; i < array.length; i++) {
                    const noise = Math.floor((noiseRandom() - 0.5) * 2);
                    array[i] = Math.max(0, Math.min(255, array[i] + noise));
                }
            }
        };

        // Override getFloatTimeDomainData
        const originalGetFloatTimeDomainData = AnalyserNode.prototype.getFloatTimeDomainData;
        AnalyserNode.prototype.getFloatTimeDomainData = function (array: Float32Array<ArrayBuffer>): void {
            originalGetFloatTimeDomainData.call(this, array);
            if (settings.audio?.enabled) {
                const noiseRandom = mulberry32(getFingerprintSeed());
                for (let i = 0; i < array.length; i++) {
                    array[i] += (noiseRandom() - 0.5) * 0.0001 + AUDIO_NOISE;
                }
            }
        };

        // Override getByteTimeDomainData
        const originalGetByteTimeDomainData = AnalyserNode.prototype.getByteTimeDomainData;
        AnalyserNode.prototype.getByteTimeDomainData = function (array: Uint8Array<ArrayBuffer>): void {
            originalGetByteTimeDomainData.call(this, array);
            if (settings.audio?.enabled) {
                const noiseRandom = mulberry32(getFingerprintSeed());
                for (let i = 0; i < array.length; i++) {
                    const noise = Math.floor((noiseRandom() - 0.5) * 2);
                    array[i] = Math.max(0, Math.min(255, array[i] + noise));
                }
            }
        };

        // Override copyFromChannel for OfflineAudioContext fingerprinting
        const originalCopyFromChannel = AudioBuffer.prototype.copyFromChannel;
        AudioBuffer.prototype.copyFromChannel = function (
            destination: Float32Array<ArrayBuffer>,
            channelNumber: number,
            startInChannel?: number
        ): void {
            originalCopyFromChannel.call(this, destination, channelNumber, startInChannel);
            if (settings.audio?.enabled) {
                const noiseRandom = mulberry32(getFingerprintSeed() ^ channelNumber);
                for (let i = 0; i < destination.length; i++) {
                    destination[i] += (noiseRandom() - 0.5) * 0.0001;
                }
            }
        };

        // Override getChannelData
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        (AudioBuffer.prototype as any).getChannelData = function (channel: number): Float32Array {
            const data = originalGetChannelData.call(this, channel);

            // Only modify on read, and only for fingerprinting-sized buffers
            // IMPORTANT: Create a copy to avoid mutating the original buffer and stacking noise
            if (settings.audio?.enabled && data.length < 50000) {
                const noisedData = new Float32Array(data);
                const noiseRandom = mulberry32(getFingerprintSeed() ^ channel);
                for (let i = 0; i < noisedData.length; i++) {
                    noisedData[i] += (noiseRandom() - 0.5) * 0.0001;
                }
                return noisedData;
            }

            return data;
        };
    }
}
