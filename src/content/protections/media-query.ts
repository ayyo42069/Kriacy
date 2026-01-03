// Media query spoofing (Critical for coherence)
// COMPREHENSIVE VERSION - handles both matchMedia and CSS-based detection

import { settings, getFingerprintSeed } from '../core/state';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('MediaQuery');

// Will be captured during initialization
let originalMatchMedia: typeof window.matchMedia | null = null;

// Flag to prevent recursion
let isCallingNative = false;

/**
 * Safely call the native matchMedia using the captured original function
 */
function safeMatchMedia(query: string): MediaQueryList | null {
    if (isCallingNative || !originalMatchMedia) {
        return null; // Prevent recursion or if not initialized
    }

    isCallingNative = true;
    try {
        return originalMatchMedia.call(window, query);
    } catch {
        return null;
    } finally {
        isCallingNative = false;
    }
}

/**
 * Create a fake MediaQueryList that properly supports event listeners
 */
function createFakeMediaQueryList(query: string, matches: boolean): MediaQueryList {
    // Use Function type to avoid complex type issues with deprecated addListener/removeListener
    const listeners: Set<Function> = new Set();

    const fakeResult = {
        matches,
        media: query,
        onchange: null as ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null,
        addListener: function (callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) {
            if (callback) listeners.add(callback);
        },
        removeListener: function (callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) {
            if (callback) listeners.delete(callback);
        },
        addEventListener: function (_type: string, callback: EventListenerOrEventListenerObject | null) {
            if (callback) listeners.add(callback as Function);
        },
        removeEventListener: function (_type: string, callback: EventListenerOrEventListenerObject | null) {
            if (callback) listeners.delete(callback as Function);
        },
        dispatchEvent: function (_event: Event): boolean {
            return true;
        }
    };

    return fakeResult as MediaQueryList;
}

/**
 * Evaluate a media query string against spoofed values
 * Returns: { matches: boolean, handled: true } if we handled it, 
 *          { handled: false } if not a spoofable query
 */
function evaluateMediaQuery(query: string): { matches: boolean; handled: true } | { handled: false } {
    if (!settings.screen?.enabled) {
        return { handled: false };
    }

    const spoofedWidth = settings.screen.width || 1920;
    const spoofedHeight = settings.screen.height || 1080;
    const spoofedDPR = settings.screen.pixelRatio || 1;

    // Normalize the query for easier matching
    const normalizedQuery = query.toLowerCase();

    // Check for device-width (exact, min, or max)
    if (normalizedQuery.includes('device-width')) {
        // Exact match: (device-width: 1920px)
        const exactMatch = query.match(/\(\s*device-width\s*:\s*(\d+)px\s*\)/i);
        if (exactMatch) {
            const queryWidth = parseInt(exactMatch[1], 10);
            // Also check for device-height in combined query
            const heightMatch = query.match(/\(\s*device-height\s*:\s*(\d+)px\s*\)/i);
            if (heightMatch) {
                const queryHeight = parseInt(heightMatch[1], 10);
                const matches = queryWidth === spoofedWidth && queryHeight === spoofedHeight;
                log.debug('Combined query', { query, matches });
                return { matches, handled: true };
            }
            const matches = queryWidth === spoofedWidth;
            log.debug('device-width query', { query, expected: spoofedWidth, got: queryWidth, matches });
            return { matches, handled: true };
        }

        // Min: (min-device-width: 1920px)
        const minMatch = query.match(/\(\s*min-device-width\s*:\s*(\d+)px\s*\)/i);
        if (minMatch) {
            return { matches: spoofedWidth >= parseInt(minMatch[1], 10), handled: true };
        }

        // Max: (max-device-width: 1920px)
        const maxMatch = query.match(/\(\s*max-device-width\s*:\s*(\d+)px\s*\)/i);
        if (maxMatch) {
            return { matches: spoofedWidth <= parseInt(maxMatch[1], 10), handled: true };
        }
    }

    // Check for device-height (exact, min, or max)
    if (normalizedQuery.includes('device-height')) {
        // Exact match
        const exactMatch = query.match(/\(\s*device-height\s*:\s*(\d+)px\s*\)/i);
        if (exactMatch) {
            const matches = parseInt(exactMatch[1], 10) === spoofedHeight;
            log.debug('device-height query', { query, expected: spoofedHeight, matches });
            return { matches, handled: true };
        }

        // Min
        const minMatch = query.match(/\(\s*min-device-height\s*:\s*(\d+)px\s*\)/i);
        if (minMatch) {
            return { matches: spoofedHeight >= parseInt(minMatch[1], 10), handled: true };
        }

        // Max
        const maxMatch = query.match(/\(\s*max-device-height\s*:\s*(\d+)px\s*\)/i);
        if (maxMatch) {
            return { matches: spoofedHeight <= parseInt(maxMatch[1], 10), handled: true };
        }
    }

    // Check for resolution in dppx
    if (normalizedQuery.includes('resolution') && normalizedQuery.includes('dppx')) {
        // Exact match: (resolution: 2dppx)
        const exactMatch = query.match(/\(\s*resolution\s*:\s*([\d.]+)dppx\s*\)/i);
        if (exactMatch) {
            const matches = parseFloat(exactMatch[1]) === spoofedDPR;
            log.debug('resolution query', { query, expected: spoofedDPR, matches });
            return { matches, handled: true };
        }

        // Min
        const minMatch = query.match(/\(\s*min-resolution\s*:\s*([\d.]+)dppx\s*\)/i);
        if (minMatch) {
            return { matches: spoofedDPR >= parseFloat(minMatch[1]), handled: true };
        }

        // Max
        const maxMatch = query.match(/\(\s*max-resolution\s*:\s*([\d.]+)dppx\s*\)/i);
        if (maxMatch) {
            return { matches: spoofedDPR <= parseFloat(maxMatch[1]), handled: true };
        }
    }

    // Check for -webkit-device-pixel-ratio
    if (normalizedQuery.includes('-webkit-device-pixel-ratio')) {
        // Exact match
        const exactMatch = query.match(/\(\s*-webkit-device-pixel-ratio\s*:\s*([\d.]+)\s*\)/i);
        if (exactMatch) {
            return { matches: parseFloat(exactMatch[1]) === spoofedDPR, handled: true };
        }

        // Min
        const minMatch = query.match(/\(\s*-webkit-min-device-pixel-ratio\s*:\s*([\d.]+)\s*\)/i) ||
            query.match(/\(\s*min--webkit-device-pixel-ratio\s*:\s*([\d.]+)\s*\)/i);
        if (minMatch) {
            return { matches: spoofedDPR >= parseFloat(minMatch[1]), handled: true };
        }

        // Max
        const maxMatch = query.match(/\(\s*-webkit-max-device-pixel-ratio\s*:\s*([\d.]+)\s*\)/i) ||
            query.match(/\(\s*max--webkit-device-pixel-ratio\s*:\s*([\d.]+)\s*\)/i);
        if (maxMatch) {
            return { matches: spoofedDPR <= parseFloat(maxMatch[1]), handled: true };
        }
    }

    return { handled: false };
}

/**
 * Initialize media query spoofing
 */
export function initMediaQuerySpoofing(): void {
    // Capture the original matchMedia NOW, at initialization time
    // Try multiple ways to get it
    if (typeof Window !== 'undefined' && Window.prototype && typeof Window.prototype.matchMedia === 'function') {
        originalMatchMedia = Window.prototype.matchMedia;
        log.debug('Captured from Window.prototype.matchMedia');
    } else if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        originalMatchMedia = window.matchMedia.bind(window);
        log.debug('Captured from window.matchMedia');
    }

    if (!originalMatchMedia) {
        log.warn('matchMedia not available, skipping');
        return;
    }

    log.init('Initializing with screen settings', {
        enabled: settings.screen?.enabled,
        width: settings.screen?.width,
        height: settings.screen?.height,
        pixelRatio: settings.screen?.pixelRatio
    });

    // Create the spoofed matchMedia function
    const spoofedMatchMedia = function (this: Window, query: string): MediaQueryList {
        // First, check if this is a query we should spoof
        const evaluation = evaluateMediaQuery(query);

        if (evaluation.handled) {
            // We know how to handle this query - return our spoofed result
            return createFakeMediaQueryList(query, evaluation.matches);
        }

        // For queries we don't handle, get the native result
        const nativeResult = safeMatchMedia(query);
        if (!nativeResult) {
            return createFakeMediaQueryList(query, false);
        }

        // Handle orientation media query to match screen.orientation
        if (query.includes('orientation')) {
            // Get the spoofed orientation from screen dimensions
            const spoofedWidth = settings.screen?.width || screen.width;
            const spoofedHeight = settings.screen?.height || screen.height;
            const isLandscape = spoofedWidth > spoofedHeight;

            if (query.includes('landscape')) {
                const matches = isLandscape;
                log.debug('orientation query (landscape)', { query, isLandscape, matches });
                return createFakeMediaQueryList(query, matches);
            }
            if (query.includes('portrait')) {
                const matches = !isLandscape;
                log.debug('orientation query (portrait)', { query, isLandscape, matches });
                return createFakeMediaQueryList(query, matches);
            }
        }

        // NOTE: We do NOT spoof prefers-color-scheme because SEC-CH-Prefers-Color-Scheme
        // is sent by the browser and we can't easily override it. Spoofing just the media query
        // would create a mismatch. Let it pass through to native.

        // Only spoof prefers-reduced-motion if enabled
        if (settings.misc?.mediaQuery) {
            if (query.includes('prefers-reduced-motion')) {
                const reducedMotion = (getFingerprintSeed() % 10) > 7;
                const shouldMatch = query.includes('reduce') ? reducedMotion : !reducedMotion;
                return createFakeMediaQueryList(query, shouldMatch);
            }
        }

        return nativeResult;
    };

    // Override BOTH window.matchMedia AND Window.prototype.matchMedia
    // This prevents fingerprinters from bypassing by calling the prototype directly
    try {
        Object.defineProperty(window, 'matchMedia', {
            value: spoofedMatchMedia,
            writable: true,
            configurable: true,
            enumerable: true
        });
        log.debug('Overrode window.matchMedia');
    } catch (e) {
        log.error('Failed to override window.matchMedia', { error: String(e) });
    }

    try {
        Object.defineProperty(Window.prototype, 'matchMedia', {
            value: spoofedMatchMedia,
            writable: true,
            configurable: true
        });
        log.debug('Overrode Window.prototype.matchMedia');
    } catch (e) {
        log.error('Failed to override Window.prototype.matchMedia', { error: String(e) });
    }

    // Also intercept MediaQueryList.prototype.matches getter
    try {
        if (typeof MediaQueryList !== 'undefined' && MediaQueryList.prototype) {
            const originalMatches = Object.getOwnPropertyDescriptor(MediaQueryList.prototype, 'matches');
            if (originalMatches && originalMatches.get) {
                const originalMatchesGetter = originalMatches.get;
                Object.defineProperty(MediaQueryList.prototype, 'matches', {
                    get: function (): boolean {
                        // Get the media query string
                        const query = this.media;

                        // Check if we should spoof this
                        const evaluation = evaluateMediaQuery(query);
                        if (evaluation.handled) {
                            return evaluation.matches;
                        }

                        // Otherwise return native result
                        return originalMatchesGetter.call(this);
                    },
                    configurable: true
                });
                log.debug('Overrode MediaQueryList.prototype.matches');
            }
        }
    } catch (e) {
        log.error('Failed to override MediaQueryList.prototype.matches', { error: String(e) });
    }

    log.init('Initialization complete');
}

/**
 * No-op for backwards compatibility
 */
export function initPrefersMediaQuerySpoofing(): void {
    // Consolidated into initMediaQuerySpoofing
}
