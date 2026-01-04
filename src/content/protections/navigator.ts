import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32 } from '../core/utils';
import { logSpoofAccess } from '../../utils/logger';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('Navigator');
const originalNavigatorValues: Record<string, any> = {};
try {
    const navProps = ['hardwareConcurrency', 'deviceMemory', 'platform', 'language', 'languages', 'maxTouchPoints'];
    navProps.forEach(prop => {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, prop);
            if (descriptor && descriptor.get) {
                originalNavigatorValues[prop] = descriptor.get.call(navigator);
            } else {
                originalNavigatorValues[prop] = (navigator as any)[prop];
            }
        } catch {
            // Use defaults
        }
    });
} catch {
    // Use defaults
}

const navigatorDefaults: Record<string, any> = {
    hardwareConcurrency: 4,
    deviceMemory: 8,
    platform: 'Win32',
    language: 'en-US',
    languages: ['en-US', 'en'],
    maxTouchPoints: 0,
};


export function initNavigatorSpoofing(): void {
    log.init('Initializing navigator spoofing');
    const navigatorPropsToSpoof = {
        hardwareConcurrency: () => settings.navigator?.hardwareConcurrency || 4,
        deviceMemory: () => settings.navigator?.deviceMemory || 8,
        platform: () => settings.navigator?.platform || 'Win32',
        language: () => settings.navigator?.language || 'en-US',
        languages: () => Object.freeze(settings.navigator?.languages || ['en-US', 'en']),
        maxTouchPoints: () => settings.navigator?.maxTouchPoints ?? 0,
    };

    Object.entries(navigatorPropsToSpoof).forEach(([prop, getValue]) => {
        try {
            Object.defineProperty(navigator, prop, {
                get: function () {
                    if (settings.navigator?.enabled) {
                        logSpoofAccess('navigator', prop);
                        return getValue();
                    }
                    return originalNavigatorValues[prop] ?? navigatorDefaults[prop];
                },
                configurable: true
            });
        } catch (e) {
        }
    });
}

let originalUserAgentData: any = null;
try {
    if ('userAgentData' in navigator) {
        const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgentData');
        if (descriptor && descriptor.get) {
            originalUserAgentData = descriptor.get.call(navigator);
        }
    }
} catch { }


export function initUserAgentDataSpoofing(): void {
    log.init('Initializing UserAgentData spoofing');
    if ('userAgentData' in navigator) {
        const uaRandom = mulberry32(getFingerprintSeed() ^ 0xABCDEF);
        const majorVersion = 120 + Math.floor(uaRandom() * 10); // 120-129
        const minorVersion = Math.floor(uaRandom() * 100);

        const fakeUserAgentData = {
            brands: [
                { brand: 'Chromium', version: majorVersion.toString() },
                { brand: 'Google Chrome', version: majorVersion.toString() },
                { brand: 'Not_A Brand', version: '24' }
            ],
            mobile: false,
            platform: settings.navigator?.platform === 'MacIntel' ? 'macOS' :
                settings.navigator?.platform?.includes('Linux') ? 'Linux' : 'Windows',
            getHighEntropyValues: async (hints: string[]) => {
                const result: any = {};
                if (hints.includes('architecture')) result.architecture = 'x86';
                if (hints.includes('bitness')) result.bitness = '64';
                if (hints.includes('brands')) result.brands = fakeUserAgentData.brands;
                if (hints.includes('mobile')) result.mobile = false;
                if (hints.includes('model')) result.model = '';
                if (hints.includes('platform')) result.platform = fakeUserAgentData.platform;
                if (hints.includes('platformVersion')) result.platformVersion = `${10 + Math.floor(uaRandom() * 5)}.0.0`;
                if (hints.includes('uaFullVersion')) result.uaFullVersion = `${majorVersion}.0.${minorVersion}.0`;
                if (hints.includes('fullVersionList')) {
                    result.fullVersionList = [
                        { brand: 'Chromium', version: `${majorVersion}.0.${minorVersion}.0` },
                        { brand: 'Google Chrome', version: `${majorVersion}.0.${minorVersion}.0` },
                        { brand: 'Not_A Brand', version: '24.0.0.0' }
                    ];
                }
                return result;
            },
            toJSON: () => ({
                brands: fakeUserAgentData.brands,
                mobile: fakeUserAgentData.mobile,
                platform: fakeUserAgentData.platform
            })
        };

        try {
            Object.defineProperty(navigator, 'userAgentData', {
                get: () => settings.navigator?.enabled ? fakeUserAgentData : originalUserAgentData,
                configurable: true
            });
        } catch (e) { }
    }
}
