// Media query spoofing (Critical for coherence)
// SAFE VERSION - avoids any possibility of recursion

import { settings, getFingerprintSeed } from '../core/state';

// Flag to prevent recursion
let isCallingNative = false;

/**
 * Safely call the native matchMedia
 */
function safeMatchMedia(query: string): MediaQueryList | null {
    if (isCallingNative) {
        return null; // Prevent recursion
    }

    isCallingNative = true;
    try {
        // Try to get native matchMedia from Window.prototype
        const nativeFunc = Window.prototype.matchMedia;
        if (typeof nativeFunc === 'function') {
            return nativeFunc.call(window, query);
        }
        return null;
    } catch {
        return null;
    } finally {
        isCallingNative = false;
    }
}

/**
 * Create a fake MediaQueryList for when native isn't available
 */
function createFakeMediaQueryList(query: string, matches: boolean): MediaQueryList {
    return {
        matches,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => true
    } as MediaQueryList;
}

/**
 * Initialize media query spoofing
 */
export function initMediaQuerySpoofing(): void {
    // Check if Window.prototype.matchMedia exists
    if (typeof Window.prototype.matchMedia !== 'function') {
        console.log('[Kriacy] matchMedia not available, skipping');
        return;
    }

    window.matchMedia = function (query: string): MediaQueryList {
        // Get native result first
        const nativeResult = safeMatchMedia(query);

        if (!nativeResult) {
            // If native call failed, return a fake result
            return createFakeMediaQueryList(query, false);
        }

        // Screen dimension spoofing - CRITICAL for CreepJS coherence
        if (settings.screen?.enabled) {
            const spoofedWidth = settings.screen.width || 1920;
            const spoofedHeight = settings.screen.height || 1080;
            const spoofedDPR = settings.screen.pixelRatio || 1;

            // Parse device-width query: (device-width: Xpx)
            const deviceWidthMatch = query.match(/device-width:\s*(\d+)px/i);
            if (deviceWidthMatch) {
                const queryWidth = parseInt(deviceWidthMatch[1], 10);
                // Check if it's a combined query
                const deviceHeightMatch = query.match(/device-height:\s*(\d+)px/i);
                if (deviceHeightMatch) {
                    const queryHeight = parseInt(deviceHeightMatch[1], 10);
                    const matches = queryWidth === spoofedWidth && queryHeight === spoofedHeight;
                    return createFakeMediaQueryList(query, matches);
                }
                // Single device-width query
                return createFakeMediaQueryList(query, queryWidth === spoofedWidth);
            }

            // Parse device-height query: (device-height: Xpx)
            const deviceHeightOnlyMatch = query.match(/device-height:\s*(\d+)px/i);
            if (deviceHeightOnlyMatch) {
                const queryHeight = parseInt(deviceHeightOnlyMatch[1], 10);
                return createFakeMediaQueryList(query, queryHeight === spoofedHeight);
            }

            // Parse resolution/dppx query: (resolution: Xdppx) or (-webkit-device-pixel-ratio: X)
            const dppxMatch = query.match(/resolution:\s*([\d.]+)dppx/i);
            if (dppxMatch) {
                const queryDPR = parseFloat(dppxMatch[1]);
                return createFakeMediaQueryList(query, queryDPR === spoofedDPR);
            }

            const webkitDPRMatch = query.match(/-webkit-device-pixel-ratio:\s*([\d.]+)/i);
            if (webkitDPRMatch) {
                const queryDPR = parseFloat(webkitDPRMatch[1]);
                return createFakeMediaQueryList(query, queryDPR === spoofedDPR);
            }

            // Handle min/max device-width
            const minDeviceWidthMatch = query.match(/min-device-width:\s*(\d+)px/i);
            if (minDeviceWidthMatch) {
                const minWidth = parseInt(minDeviceWidthMatch[1], 10);
                return createFakeMediaQueryList(query, spoofedWidth >= minWidth);
            }

            const maxDeviceWidthMatch = query.match(/max-device-width:\s*(\d+)px/i);
            if (maxDeviceWidthMatch) {
                const maxWidth = parseInt(maxDeviceWidthMatch[1], 10);
                return createFakeMediaQueryList(query, spoofedWidth <= maxWidth);
            }
        }

        // Prefers-* spoofing
        if (settings.misc?.mediaQuery) {
            if (query.includes('prefers-color-scheme')) {
                const prefersDark = query.includes('dark');
                const prefersLight = query.includes('light');
                if (prefersDark || prefersLight) {
                    const fakePref = getFingerprintSeed() % 2 === 0 ? 'dark' : 'light';
                    const shouldMatch = (prefersDark && fakePref === 'dark') || (prefersLight && fakePref === 'light');
                    return createFakeMediaQueryList(query, shouldMatch);
                }
            }

            if (query.includes('prefers-reduced-motion')) {
                const reducedMotion = (getFingerprintSeed() % 10) > 7;
                const shouldMatch = query.includes('reduce') ? reducedMotion : !reducedMotion;
                return createFakeMediaQueryList(query, shouldMatch);
            }
        }

        return nativeResult;
    };
}

/**
 * No-op for backwards compatibility
 */
export function initPrefersMediaQuerySpoofing(): void {
    // Consolidated into initMediaQuerySpoofing
}
