// Battery, network info, and plugins spoofing

import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32 } from '../core/utils';
import { logSpoofAccess } from '../../utils/logger';

/**
 * Initialize battery API spoofing
 */
export function initBatterySpoofing(): void {
    if ('getBattery' in navigator) {
        (navigator as any).getBattery = async function (): Promise<any> {
            if (settings.battery) {
                logSpoofAccess('battery', 'navigator.getBattery');
                // Generate seed-based battery values
                const batteryRandom = mulberry32(getFingerprintSeed() ^ 0xBA77E201);
                const isCharging = batteryRandom() > 0.3; // 70% chance of charging
                const level = 0.5 + batteryRandom() * 0.5; // 50-100% level

                return {
                    charging: isCharging,
                    chargingTime: isCharging ? Math.floor(batteryRandom() * 3600) : Infinity,
                    dischargingTime: isCharging ? Infinity : Math.floor(10000 + batteryRandom() * 20000),
                    level: Math.round(level * 100) / 100,
                    addEventListener: () => { },
                    removeEventListener: () => { },
                    dispatchEvent: () => true,
                    onchargingchange: null,
                    onchargingtimechange: null,
                    ondischargingtimechange: null,
                    onlevelchange: null
                };
            }
            // Fallback fake battery
            return {
                charging: true,
                chargingTime: 0,
                dischargingTime: Infinity,
                level: 1.0,
                addEventListener: () => { },
                removeEventListener: () => { },
                dispatchEvent: () => true,
                onchargingchange: null,
                onchargingtimechange: null,
                ondischargingtimechange: null,
                onlevelchange: null
            };
        };
    }
}

/**
 * Initialize network information spoofing
 */
export function initNetworkSpoofing(): void {
    try {
        Object.defineProperty(navigator, 'connection', {
            get: function () {
                if (settings.network) {
                    return {
                        effectiveType: '4g',
                        downlink: 10,
                        downlinkMax: Infinity,
                        rtt: 50,
                        saveData: false,
                        type: 'wifi',
                        addEventListener: () => { },
                        removeEventListener: () => { },
                        dispatchEvent: () => true,
                        onchange: null
                    };
                }
                return undefined;
            },
            configurable: true
        });
    } catch (e) { }
}

// List of fake plugins
const allFakePlugins = [
    { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 2 },
    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 2 },
    { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 2 },
    { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 2 },
    { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: '', length: 2 }
];

/**
 * Get seed-based subset of plugins
 */
function getSeededPlugins() {
    const pluginRandom = mulberry32(getFingerprintSeed() ^ 0xD1A610);
    const count = 2 + Math.floor(pluginRandom() * 3); // 2-4 plugins
    const shuffled = [...allFakePlugins].sort(() => pluginRandom() - 0.5);
    return shuffled.slice(0, count);
}

// Capture original plugins and mimeTypes BEFORE any overrides to prevent infinite recursion
let originalPlugins: PluginArray | null = null;
let originalMimeTypes: MimeTypeArray | null = null;
try {
    const pluginsDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'plugins');
    const mimeTypesDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'mimeTypes');
    if (pluginsDescriptor?.get) {
        originalPlugins = pluginsDescriptor.get.call(navigator);
    }
    if (mimeTypesDescriptor?.get) {
        originalMimeTypes = mimeTypesDescriptor.get.call(navigator);
    }
} catch { }

/**
 * Initialize plugins and MIME types spoofing
 */
export function initPluginsSpoofing(): void {
    try {
        Object.defineProperty(navigator, 'plugins', {
            get: function () {
                if (settings.plugins) {
                    const fakePlugins = getSeededPlugins();
                    return {
                        length: fakePlugins.length,
                        item: (i: number) => fakePlugins[i],
                        namedItem: (name: string) => fakePlugins.find(p => p.name === name),
                        refresh: () => { },
                        [Symbol.iterator]: function* () { yield* fakePlugins; },
                        ...fakePlugins.reduce((acc, p, i) => ({ ...acc, [i]: p }), {})
                    };
                }
                // Return cached original to avoid infinite recursion
                return originalPlugins;
            },
            configurable: true
        });

        Object.defineProperty(navigator, 'mimeTypes', {
            get: function () {
                if (settings.plugins) {
                    const fakePlugins = getSeededPlugins();
                    const fakeMimeTypes = [
                        { type: 'application/pdf', description: 'Portable Document Format', suffixes: 'pdf', enabledPlugin: fakePlugins[0] },
                        { type: 'text/pdf', description: 'Portable Document Format', suffixes: 'pdf', enabledPlugin: fakePlugins[0] }
                    ];
                    return {
                        length: fakeMimeTypes.length,
                        item: (i: number) => fakeMimeTypes[i],
                        namedItem: (type: string) => fakeMimeTypes.find(m => m.type === type),
                        [Symbol.iterator]: function* () { yield* fakeMimeTypes; },
                        ...fakeMimeTypes.reduce((acc, m, i) => ({ ...acc, [i]: m }), {})
                    };
                }
                // Return cached original to avoid infinite recursion
                return originalMimeTypes;
            },
            configurable: true
        });
    } catch (e) { }
}
