// Screen and window dimension spoofing

import { settings } from '../core/state';

// Capture original screen values BEFORE any overrides
// Use Object.getOwnPropertyDescriptor to get the native getters from the prototype
const originalScreenValues: Record<string, number> = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24
};

// Safely get original screen values at load time
try {
    const screenProps = ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'];
    for (const prop of screenProps) {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(Screen.prototype, prop);
            if (descriptor && descriptor.get) {
                const value = descriptor.get.call(screen);
                if (typeof value === 'number') {
                    originalScreenValues[prop] = value;
                }
            }
        } catch {
            // Keep default value for this property
        }
    }
} catch {
    // Use defaults already set
}

// Capture original devicePixelRatio using the property descriptor
let originalDevicePixelRatio = 1;
try {
    const dprDescriptor = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio') ||
        Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio');
    if (dprDescriptor && dprDescriptor.get) {
        const value = dprDescriptor.get.call(window);
        if (typeof value === 'number') {
            originalDevicePixelRatio = value;
        }
    } else if (typeof window.devicePixelRatio === 'number') {
        originalDevicePixelRatio = window.devicePixelRatio;
    }
} catch {
    originalDevicePixelRatio = 1;
}

// Capture original window dimension values using property descriptors to avoid triggering overrides
const originalWindowValues: Record<string, number> = {
    innerWidth: 1366,
    innerHeight: 768,
    outerWidth: 1366,
    outerHeight: 768,
};

try {
    const windowProps = ['innerWidth', 'innerHeight', 'outerWidth', 'outerHeight'];
    for (const prop of windowProps) {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(window, prop) ||
                Object.getOwnPropertyDescriptor(Window.prototype, prop);
            if (descriptor && descriptor.get) {
                const value = descriptor.get.call(window);
                if (typeof value === 'number') {
                    originalWindowValues[prop] = value;
                }
            } else {
                const directValue = (window as any)[prop];
                if (typeof directValue === 'number') {
                    originalWindowValues[prop] = directValue;
                }
            }
        } catch {
            // Keep default value for this property
        }
    }
} catch {
    // Use defaults already set
}

/**
 * Initialize screen spoofing
 */
export function initScreenSpoofing(): void {
    const screenPropsToSpoof: Record<string, () => number> = {
        width: () => settings.screen?.width || 1920,
        height: () => settings.screen?.height || 1080,
        availWidth: () => settings.screen?.width || 1920,
        availHeight: () => (settings.screen?.height || 1080) - 40,
        colorDepth: () => settings.screen?.colorDepth || 24,
        pixelDepth: () => settings.screen?.colorDepth || 24,
    };

    for (const [prop, getValue] of Object.entries(screenPropsToSpoof)) {
        try {
            Object.defineProperty(screen, prop, {
                get: function () {
                    if (settings.screen?.enabled) {
                        return getValue();
                    }
                    // Return the original captured value
                    return originalScreenValues[prop] ?? getValue();
                },
                configurable: true
            });
        } catch {
            // Property may not be configurable
        }
    }

    // devicePixelRatio
    try {
        Object.defineProperty(window, 'devicePixelRatio', {
            get: function () {
                if (settings.screen?.enabled) {
                    return settings.screen?.pixelRatio || 1;
                }
                return originalDevicePixelRatio;
            },
            configurable: true
        });
    } catch { }
}

// Approximate height of browser chrome (toolbar, tabs, etc.)
const BROWSER_CHROME_HEIGHT = 80;

/**
 * Initialize window dimensions spoofing (Critical for SEC-CH coherence)
 */
export function initWindowDimensionsSpoofing(): void {
    const windowPropsToSpoof: Record<string, () => number> = {
        innerWidth: () => settings.screen?.width || 1366,
        // innerHeight should be less than screen.height to be realistic
        innerHeight: () => (settings.screen?.height || 768) - BROWSER_CHROME_HEIGHT,
        outerWidth: () => settings.screen?.width || 1366,
        outerHeight: () => settings.screen?.height || 768,
    };

    for (const [prop, getValue] of Object.entries(windowPropsToSpoof)) {
        try {
            Object.defineProperty(window, prop, {
                get: function () {
                    if (settings.screen?.enabled) {
                        return getValue();
                    }
                    // Return original captured value
                    return originalWindowValues[prop] ?? getValue();
                },
                configurable: true
            });
        } catch { }
    }
}
