// Geolocation spoofing

import { settings } from '../core/state';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('Geolocation');

const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
const originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);
const originalClearWatch = navigator.geolocation.clearWatch.bind(navigator.geolocation);

// Track our fake watch IDs
const fakeWatchIds = new Set<number>();

/**
 * Create a fake geolocation position
 */
function createFakePosition(): GeolocationPosition {
    return {
        coords: {
            latitude: settings.geolocation?.latitude || 0,
            longitude: settings.geolocation?.longitude || 0,
            accuracy: settings.geolocation?.accuracy || 100,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: function () { return this; }
        } as GeolocationCoordinates,
        timestamp: Date.now(),
        toJSON: function () { return { coords: this.coords, timestamp: this.timestamp }; }
    } as GeolocationPosition;
}

/**
 * Initialize geolocation spoofing
 */
export function initGeolocationSpoofing(): void {
    log.init('Initializing geolocation spoofing', { mode: settings.geolocation?.mode });

    navigator.geolocation.getCurrentPosition = function (
        successCallback: PositionCallback,
        errorCallback?: PositionErrorCallback | null,
        options?: PositionOptions
    ): void {
        if (!settings.geolocation?.enabled) {
            return originalGetCurrentPosition(successCallback, errorCallback, options);
        }

        if (settings.geolocation.mode === 'block') {
            if (errorCallback) {
                const error = {
                    code: 1,
                    message: 'User denied Geolocation',
                    PERMISSION_DENIED: 1,
                    POSITION_UNAVAILABLE: 2,
                    TIMEOUT: 3
                } as GeolocationPositionError;
                errorCallback(error);
            }
            return;
        }

        // Spoof mode
        setTimeout(() => {
            successCallback(createFakePosition());
        }, 100);
    };

    navigator.geolocation.watchPosition = function (
        successCallback: PositionCallback,
        errorCallback?: PositionErrorCallback | null,
        options?: PositionOptions
    ): number {
        if (!settings.geolocation?.enabled) {
            return originalWatchPosition(successCallback, errorCallback, options);
        }

        if (settings.geolocation.mode === 'block') {
            if (errorCallback) {
                const error = {
                    code: 1,
                    message: 'User denied Geolocation',
                    PERMISSION_DENIED: 1,
                    POSITION_UNAVAILABLE: 2,
                    TIMEOUT: 3
                } as GeolocationPositionError;
                errorCallback(error);
            }
            return 0;
        }

        // Spoof mode
        setTimeout(() => {
            successCallback(createFakePosition());
        }, 100);

        const fakeWatchId = Math.floor(Math.random() * 10000);
        fakeWatchIds.add(fakeWatchId);
        return fakeWatchId;
    };

    // Override clearWatch to handle our fake watch IDs
    navigator.geolocation.clearWatch = function (watchId: number): void {
        if (!settings.geolocation?.enabled) {
            return originalClearWatch(watchId);
        }

        // If it's one of our fake watch IDs, just remove it from our set
        if (fakeWatchIds.has(watchId)) {
            fakeWatchIds.delete(watchId);
            return;
        }

        // Otherwise, pass through to original
        return originalClearWatch(watchId);
    };
}
