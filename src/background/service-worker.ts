// Kriacy Background Service Worker
import { getSettings, saveSettings } from '../utils/storage';
import { SpoofSettings, ExtensionMessage, ExtensionResponse, DEFAULT_SETTINGS } from '../types';

console.log('[Kriacy] Service worker initialized');

// Log storage constants
const LOGS_STORAGE_KEY = '__kriacy_spoof_logs__';
const MAX_LOGS = 500; // Reduced for better performance

// Generate unique settings key per session to prevent page scripts from easily discovering settings
// This adds security by making the localStorage key unpredictable
const SESSION_KEY_SUFFIX = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
const SETTINGS_KEY = `__kriacy_${SESSION_KEY_SUFFIX}__`;
const SETTINGS_KEY_POINTER = '__KRIACY_KEY__'; // Points to the actual key

// Log storage functions with deduplication - optimized for O(n) performance
async function appendLogs(entries: any[]): Promise<void> {
    try {
        const result = await chrome.storage.local.get(LOGS_STORAGE_KEY);
        let logs: any[] = result[LOGS_STORAGE_KEY] || [];

        // Build lookup map for O(1) access instead of O(n) findIndex
        const logMap = new Map<string, { index: number; log: any }>();
        logs.forEach((log, index) => {
            const key = `${log.hostname}:${log.apiType}:${log.method}`;
            logMap.set(key, { index, log });
        });

        // Deduplicate: merge entries with same hostname + apiType + method
        for (const entry of entries) {
            const key = `${entry.hostname}:${entry.apiType}:${entry.method}`;
            const existing = logMap.get(key);

            if (existing) {
                // Update existing entry: increment count and update timestamp
                existing.log.count = (existing.log.count || 1) + (entry.count || 1);
                existing.log.timestamp = entry.timestamp;
            } else {
                // Add new entry
                logs.push(entry);
                logMap.set(key, { index: logs.length - 1, log: entry });
            }
        }

        // Trim to max size (keep most recent by sorting)
        if (logs.length > MAX_LOGS) {
            logs = logs
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, MAX_LOGS);
        }

        await chrome.storage.local.set({ [LOGS_STORAGE_KEY]: logs });
        console.log('[Kriacy] Stored', entries.length, 'log entries, total:', logs.length);
    } catch (e) {
        console.error('[Kriacy] Error appending logs:', e);
    }
}

async function getLogs(): Promise<any[]> {
    try {
        const result = await chrome.storage.local.get(LOGS_STORAGE_KEY);
        return result[LOGS_STORAGE_KEY] || [];
    } catch (e) {
        console.error('[Kriacy] Error getting logs:', e);
        return [];
    }
}

async function clearLogs(): Promise<void> {
    try {
        await chrome.storage.local.remove(LOGS_STORAGE_KEY);
    } catch (e) {
        console.error('[Kriacy] Error clearing logs:', e);
    }
}

/**
 * Validate and sanitize settings to prevent crashes or bypasses from malformed input
 * @param input The untrusted settings input
 * @returns Validated SpoofSettings object with safe defaults for missing/invalid fields
 */
function validateSettings(input: unknown): SpoofSettings {
    if (!input || typeof input !== 'object') {
        return { ...DEFAULT_SETTINGS };
    }

    const raw = input as Partial<SpoofSettings>;

    // Start with defaults and merge in valid fields
    const validated: SpoofSettings = {
        ...DEFAULT_SETTINGS,
        // Boolean fields with type checking
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_SETTINGS.enabled,
        battery: typeof raw.battery === 'boolean' ? raw.battery : DEFAULT_SETTINGS.battery,
        network: typeof raw.network === 'boolean' ? raw.network : DEFAULT_SETTINGS.network,
        plugins: typeof raw.plugins === 'boolean' ? raw.plugins : DEFAULT_SETTINGS.plugins,
        // Number fields with validation
        fingerprintSeed: typeof raw.fingerprintSeed === 'number' && isFinite(raw.fingerprintSeed)
            ? raw.fingerprintSeed >>> 0 // Ensure unsigned 32-bit
            : DEFAULT_SETTINGS.fingerprintSeed,
        // String enum field
        profile: ['minimal', 'balanced', 'aggressive', 'custom'].includes(raw.profile as string)
            ? (raw.profile as SpoofSettings['profile'])
            : DEFAULT_SETTINGS.profile,
    };

    // Validate nested objects
    if (raw.webrtc && typeof raw.webrtc === 'object') {
        validated.webrtc = { ...DEFAULT_SETTINGS.webrtc, ...raw.webrtc };
    }
    if (raw.canvas && typeof raw.canvas === 'object') {
        validated.canvas = {
            ...DEFAULT_SETTINGS.canvas,
            ...raw.canvas,
            noiseLevel: typeof raw.canvas.noiseLevel === 'number'
                ? Math.max(0, Math.min(100, raw.canvas.noiseLevel))
                : DEFAULT_SETTINGS.canvas.noiseLevel
        };
    }
    if (raw.audio && typeof raw.audio === 'object') {
        validated.audio = { ...DEFAULT_SETTINGS.audio, ...raw.audio };
    }
    if (raw.webgl && typeof raw.webgl === 'object') {
        validated.webgl = { ...DEFAULT_SETTINGS.webgl, ...raw.webgl };
    }
    if (raw.fonts && typeof raw.fonts === 'object') {
        validated.fonts = { ...DEFAULT_SETTINGS.fonts, ...raw.fonts };
    }
    if (raw.navigator && typeof raw.navigator === 'object') {
        validated.navigator = { ...DEFAULT_SETTINGS.navigator, ...raw.navigator };
    }
    if (raw.screen && typeof raw.screen === 'object') {
        validated.screen = { ...DEFAULT_SETTINGS.screen, ...raw.screen };
    }
    if (raw.geolocation && typeof raw.geolocation === 'object') {
        validated.geolocation = { ...DEFAULT_SETTINGS.geolocation, ...raw.geolocation };
    }
    if (raw.timezone && typeof raw.timezone === 'object') {
        validated.timezone = { ...DEFAULT_SETTINGS.timezone, ...raw.timezone };
    }
    if (raw.misc && typeof raw.misc === 'object') {
        validated.misc = { ...DEFAULT_SETTINGS.misc, ...raw.misc };
    }

    return validated;
}

// Dynamic rule IDs for SEC-CH headers (use high ID to avoid conflicts with static rules)
const DYNAMIC_RULE_ID = 9999;

// Update SEC-CH header rules based on settings
async function updateSecChRules(settings: SpoofSettings): Promise<void> {
    try {
        // Only add rules if enabled
        if (!settings.enabled || !settings.screen?.enabled) {
            // Remove any existing dynamic rules
            try {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [DYNAMIC_RULE_ID]
                });
            } catch {
                // Rule might not exist, that's fine
            }
            console.log('[Kriacy] SEC-CH rules disabled');
            return;
        }

        const dpr = settings.screen?.pixelRatio?.toString() || '1';
        const viewportWidth = settings.screen?.width?.toString() || '1920';
        const viewportHeight = settings.screen?.height?.toString() || '1080';
        const deviceMemory = settings.navigator?.deviceMemory?.toString() || '8';

        const rule: chrome.declarativeNetRequest.Rule = {
            id: DYNAMIC_RULE_ID,
            priority: 2, // Higher priority than static rules
            action: {
                type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                requestHeaders: [
                    {
                        header: 'Sec-CH-DPR',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: dpr
                    },
                    {
                        header: 'Sec-CH-Viewport-Width',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: viewportWidth
                    },
                    {
                        header: 'Sec-CH-Viewport-Height',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: viewportHeight
                    },
                    {
                        header: 'Sec-CH-Device-Memory',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: deviceMemory
                    },
                    // Remove identifying headers
                    {
                        header: 'Sec-CH-UA-Platform-Version',
                        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
                    },
                    {
                        header: 'Sec-CH-UA-Full-Version-List',
                        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
                    },
                    {
                        header: 'Sec-CH-UA-Arch',
                        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
                    },
                    {
                        header: 'Sec-CH-UA-Bitness',
                        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
                    },
                    {
                        header: 'Sec-CH-UA-Model',
                        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
                    }
                ]
            },
            condition: {
                urlFilter: '*',
                resourceTypes: [
                    chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
                    chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
                    chrome.declarativeNetRequest.ResourceType.SCRIPT,
                    chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                    chrome.declarativeNetRequest.ResourceType.OTHER
                ]
            }
        };

        // Use atomic operation: remove old and add new in single call
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [DYNAMIC_RULE_ID],
            addRules: [rule]
        });

        console.log('[Kriacy] SEC-CH rules updated: DPR=' + dpr);
    } catch (error) {
        console.error('[Kriacy] Error updating SEC-CH rules:', error);
    }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Kriacy] Extension installed:', details.reason);

    if (details.reason === 'install') {
        // First time installation - initialize default settings
        const settings = await getSettings();
        await saveSettings(settings);
        console.log('[Kriacy] Default settings initialized');
    }

    // Update badge and SEC-CH rules on install
    const settings = await getSettings();
    await updateBadge(settings.enabled);
    await updateSecChRules(settings);
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse: (response: ExtensionResponse) => void) => {
        handleMessage(message, sender).then(sendResponse);
        return true; // Keep channel open for async response
    }
);

async function handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender
): Promise<ExtensionResponse> {
    try {
        switch (message.action) {
            case 'GET_SETTINGS': {
                const settings = await getSettings();
                return { success: true, data: settings };
            }

            case 'SET_SETTINGS': {
                // Validate settings to prevent crashes or bypasses from malformed input
                const settings = validateSettings(message.payload);
                await saveSettings(settings);
                // Notify all tabs about the settings change
                await notifyAllTabs(settings);
                // Update badge and SEC-CH rules
                await updateBadge(settings.enabled);
                await updateSecChRules(settings);
                return { success: true, data: settings };
            }

            case 'TOGGLE_ENABLED': {
                const settings = await getSettings();
                settings.enabled = !settings.enabled;
                await saveSettings(settings);
                await notifyAllTabs(settings);
                await updateBadge(settings.enabled);
                await updateSecChRules(settings);
                return { success: true, data: settings };
            }

            case 'GET_STATUS': {
                const settings = await getSettings();
                return {
                    success: true,
                    data: {
                        enabled: settings.enabled,
                        profile: settings.profile
                    }
                };
            }

            case 'LOG_SPOOF_ACCESS': {
                const entries = message.payload as any[];
                console.log('[Kriacy] Service worker received logs:', entries?.length);
                if (entries && entries.length > 0) {
                    await appendLogs(entries);
                }
                return { success: true };
            }

            case 'GET_LOGS': {
                const logs = await getLogs();
                return { success: true, data: logs };
            }

            case 'CLEAR_LOGS': {
                await clearLogs();
                return { success: true };
            }

            case 'RANDOMIZE_ALL': {
                const settings = await getSettings();

                // Generate new fingerprint seed
                settings.fingerprintSeed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;

                // Random GPU profiles
                const gpuProfiles = [
                    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)' },
                    { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)' },
                ];

                // Random navigator profiles
                const navProfiles = [
                    { platform: 'Win32', hardwareConcurrency: 4, deviceMemory: 8, language: 'en-US' },
                    { platform: 'Win32', hardwareConcurrency: 8, deviceMemory: 16, language: 'en-US' },
                    { platform: 'Win32', hardwareConcurrency: 6, deviceMemory: 8, language: 'en-GB' },
                    { platform: 'MacIntel', hardwareConcurrency: 8, deviceMemory: 8, language: 'en-US' },
                    { platform: 'Linux x86_64', hardwareConcurrency: 8, deviceMemory: 8, language: 'en-US' },
                ];

                // Random screen profiles
                const screenProfiles = [
                    { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
                    { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1.25 },
                    { width: 1536, height: 864, colorDepth: 24, pixelRatio: 1.25 },
                    { width: 2560, height: 1440, colorDepth: 24, pixelRatio: 1 },
                    { width: 1366, height: 768, colorDepth: 24, pixelRatio: 1 },
                ];

                // Random location profiles
                const locProfiles = [
                    { lat: 40.7128, lng: -74.0060, timezone: 'America/New_York', offset: -300 },
                    { lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles', offset: -480 },
                    { lat: 51.5074, lng: -0.1278, timezone: 'Europe/London', offset: 0 },
                    { lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris', offset: 60 },
                    { lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo', offset: 540 },
                ];

                const gpu = gpuProfiles[Math.floor(Math.random() * gpuProfiles.length)];
                const nav = navProfiles[Math.floor(Math.random() * navProfiles.length)];
                const scr = screenProfiles[Math.floor(Math.random() * screenProfiles.length)];
                const loc = locProfiles[Math.floor(Math.random() * locProfiles.length)];
                const noiseLevel = Math.floor(Math.random() * 20) + 5;

                // Apply random settings
                settings.webgl = { ...settings.webgl, vendor: gpu.vendor, renderer: gpu.renderer };
                settings.navigator = {
                    ...settings.navigator,
                    platform: nav.platform,
                    hardwareConcurrency: nav.hardwareConcurrency,
                    deviceMemory: nav.deviceMemory,
                    language: nav.language,
                    languages: [nav.language, nav.language.split('-')[0]]
                };
                settings.screen = {
                    ...settings.screen,
                    width: scr.width,
                    height: scr.height,
                    colorDepth: scr.colorDepth,
                    pixelRatio: scr.pixelRatio
                };
                settings.geolocation = {
                    ...settings.geolocation,
                    mode: 'spoof',
                    latitude: loc.lat + (Math.random() - 0.5) * 0.1,
                    longitude: loc.lng + (Math.random() - 0.5) * 0.1
                };
                settings.timezone = { ...settings.timezone, timezone: loc.timezone, offset: loc.offset };
                settings.canvas = { ...settings.canvas, noiseLevel };

                await saveSettings(settings);
                await notifyAllTabs(settings);
                await updateSecChRules(settings);

                console.log('[Kriacy] All settings randomized with new seed:', settings.fingerprintSeed);
                return { success: true, data: settings };
            }

            case 'RESET_SETTINGS': {
                const defaultSettings = { ...DEFAULT_SETTINGS };
                // Generate a fresh fingerprint seed for the reset
                defaultSettings.fingerprintSeed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
                await saveSettings(defaultSettings);
                await notifyAllTabs(defaultSettings);
                await updateBadge(defaultSettings.enabled);
                await updateSecChRules(defaultSettings);
                console.log('[Kriacy] Settings reset to defaults');
                return { success: true, data: defaultSettings };
            }

            default:
                return { success: false, error: 'Unknown action' };
        }
    } catch (error) {
        console.error('[Kriacy] Message handling error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Notify all tabs about settings changes
async function notifyAllTabs(settings: SpoofSettings): Promise<void> {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'SETTINGS_UPDATED',
                        payload: settings
                    });
                } catch {
                    // Tab might not have content script loaded
                }
            }
        }
    } catch (error) {
        console.error('[Kriacy] Error notifying tabs:', error);
    }
}

// Update extension badge to show status
async function updateBadge(enabled: boolean): Promise<void> {
    try {
        if (enabled) {
            await chrome.action.setBadgeText({ text: 'ON' });
            await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
        } else {
            await chrome.action.setBadgeText({ text: 'OFF' });
            await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        }
    } catch (error) {
        console.error('[Kriacy] Error updating badge:', error);
    }
}

// Initialize badge and SEC-CH rules on startup
getSettings().then(async settings => {
    await updateBadge(settings.enabled);
    await updateSecChRules(settings);
}).catch(console.error);

// Listen for tab updates to inject scripts into MAIN world
// Use chrome.tabs.onUpdated instead of webNavigation for better compatibility
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only inject when the page starts loading
    if (changeInfo.status === 'loading' && tab.url) {
        // Skip chrome:// and other restricted URLs
        if (tab.url.startsWith('chrome://') ||
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('about:') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('brave://')) {
            return;
        }

        try {
            const settings = await getSettings();
            if (settings.enabled) {
                // Inject settings as a global variable so main-world.js can access them immediately
                // Note: main-world.js is already injected via manifest content_scripts at document_start
                // We just need to inject settings before it runs
                // SECURITY: Use unique session key to prevent page scripts from easily discovering settings
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    world: 'MAIN',
                    injectImmediately: true,
                    func: (settingsJson: string, settingsKey: string, keyPointer: string) => {
                        // Only inject if not already initialized (prevent duplicates)
                        if ((window as any).__KRIACY_SETTINGS__) return;

                        // Store settings globally for main-world.js to read
                        (window as any).__KRIACY_SETTINGS__ = JSON.parse(settingsJson);
                        // Store the key pointer so main-world.js knows where to find backup settings
                        (window as any)[keyPointer] = settingsKey;
                        // Also persist to localStorage for backup with unique session key
                        try {
                            localStorage.setItem(settingsKey, settingsJson);
                            localStorage.setItem('__kriacy_fp_seed__', (window as any).__KRIACY_SETTINGS__.fingerprintSeed?.toString() || '');
                        } catch (e) { /* Storage may not be available */ }
                    },
                    args: [JSON.stringify(settings), SETTINGS_KEY, SETTINGS_KEY_POINTER]
                });
                // main-world.js is injected via manifest, no need to inject again here
            }
        } catch (error) {
            // Ignore errors for restricted pages
        }
    }
});
