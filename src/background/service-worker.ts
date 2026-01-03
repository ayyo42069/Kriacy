// Kriacy Background Service Worker
import { getSettings, saveSettings } from '../utils/storage';
import { SpoofSettings, ExtensionMessage, ExtensionResponse, DEFAULT_SETTINGS } from '../types';

// Service worker initialization is logged after swLog is defined

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
        swLog('debug', 'Stored log entries', { count: entries.length, total: logs.length });
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

// System logs storage constants (internal extension logs)
const SYSTEM_LOGS_STORAGE_KEY = '__kriacy_system_logs__';
const MAX_SYSTEM_LOGS = 1000; // Keep more system logs for debugging

// System log storage functions
async function appendSystemLogs(entries: any[]): Promise<void> {
    try {
        const result = await chrome.storage.local.get(SYSTEM_LOGS_STORAGE_KEY);
        let logs: any[] = result[SYSTEM_LOGS_STORAGE_KEY] || [];

        // Add new entries
        logs.push(...entries);

        // Trim to max size (keep most recent)
        if (logs.length > MAX_SYSTEM_LOGS) {
            logs = logs
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, MAX_SYSTEM_LOGS);
        }

        await chrome.storage.local.set({ [SYSTEM_LOGS_STORAGE_KEY]: logs });
    } catch (e) {
        console.error('[Kriacy] Error appending system logs:', e);
    }
}

async function getSystemLogs(): Promise<any[]> {
    try {
        const result = await chrome.storage.local.get(SYSTEM_LOGS_STORAGE_KEY);
        return result[SYSTEM_LOGS_STORAGE_KEY] || [];
    } catch (e) {
        console.error('[Kriacy] Error getting system logs:', e);
        return [];
    }
}

async function clearSystemLogs(): Promise<void> {
    try {
        await chrome.storage.local.remove(SYSTEM_LOGS_STORAGE_KEY);
    } catch (e) {
        console.error('[Kriacy] Error clearing system logs:', e);
    }
}

// Service worker logger - logs directly to storage since SW can't use message passing to itself
type SwLogLevel = 'debug' | 'info' | 'warn' | 'error';
function swLog(level: SwLogLevel, message: string, context?: Record<string, unknown>): void {
    const entry = {
        id: `sw-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        timestamp: Date.now(),
        level,
        category: 'worker',
        module: 'ServiceWorker',
        message,
        details: context ? JSON.stringify(context) : undefined,
        context
    };

    // Fire and forget - don't await to avoid blocking
    appendSystemLogs([entry]).catch(() => { });
}

// Log service worker initialization
swLog('info', 'Service worker initialized');

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

// CSP bypass ruleset ID (from manifest - static rules)
const CSP_BYPASS_RULESET_ID = 'csp_bypass_rules';

// Update CSP bypass rules based on settings
async function updateCSPBypassRules(settings: SpoofSettings): Promise<void> {
    try {
        // Get current enabled rulesets
        const enabledRulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
        const isCurrentlyEnabled = enabledRulesets.includes(CSP_BYPASS_RULESET_ID);
        const shouldBeEnabled = settings.enabled && settings.bypassCSP;

        if (shouldBeEnabled && !isCurrentlyEnabled) {
            // Enable CSP bypass
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                enableRulesetIds: [CSP_BYPASS_RULESET_ID]
            });
            swLog('info', 'CSP bypass enabled');
        } else if (!shouldBeEnabled && isCurrentlyEnabled) {
            // Disable CSP bypass  
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                disableRulesetIds: [CSP_BYPASS_RULESET_ID]
            });
            swLog('info', 'CSP bypass disabled');
        }
    } catch (error) {
        console.error('[Kriacy] Error updating CSP bypass rules:', error);
    }
}

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
            swLog('debug', 'SEC-CH rules disabled');
            return;
        }

        const dpr = settings.screen?.pixelRatio?.toString() || '1';
        const viewportWidth = settings.screen?.width?.toString() || '1920';
        // SEC-CH-Viewport-Height should match window.innerHeight, which is screen height minus browser chrome
        const BROWSER_CHROME_HEIGHT = 80;
        const screenHeight = settings.screen?.height || 1080;
        const viewportHeight = (screenHeight - BROWSER_CHROME_HEIGHT).toString();
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

        swLog('debug', 'SEC-CH rules updated', { dpr });
    } catch (error) {
        console.error('[Kriacy] Error updating SEC-CH rules:', error);
    }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
    swLog('info', 'Extension installed', { reason: details.reason });

    if (details.reason === 'install') {
        // First time installation - initialize default settings
        const settings = await getSettings();
        await saveSettings(settings);
        swLog('info', 'Default settings initialized');
    }

    // Update badge and SEC-CH rules on install
    const settings = await getSettings();
    await updateBadge(settings.enabled);
    await updateSecChRules(settings);
    await updateCSPBypassRules(settings);
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
                await updateCSPBypassRules(settings);
                return { success: true, data: settings };
            }

            case 'TOGGLE_ENABLED': {
                const settings = await getSettings();
                settings.enabled = !settings.enabled;
                await saveSettings(settings);
                await notifyAllTabs(settings);
                await updateBadge(settings.enabled);
                await updateSecChRules(settings);
                await updateCSPBypassRules(settings);
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
                swLog('debug', 'Received spoof logs', { count: entries?.length });
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

            case 'LOG_SYSTEM_ENTRIES': {
                const entries = message.payload as any[];
                if (entries && entries.length > 0) {
                    await appendSystemLogs(entries);
                }
                return { success: true };
            }

            case 'GET_SYSTEM_LOGS': {
                const logs = await getSystemLogs();
                return { success: true, data: logs };
            }

            case 'CLEAR_SYSTEM_LOGS': {
                await clearSystemLogs();
                return { success: true };
            }

            case 'RANDOMIZE_ALL': {
                // Import the coherent profile generator
                const { generateCoherentProfile, coherentProfileToSettings } = await import('../utils/profile-coherence');

                const settings = await getSettings();

                // Generate new fingerprint seed using crypto for security
                const seedArray = new Uint32Array(1);
                crypto.getRandomValues(seedArray);
                settings.fingerprintSeed = (Date.now() ^ seedArray[0]) >>> 0;

                // Generate a fully coherent profile - all values are guaranteed to be logically consistent
                // (e.g., Apple GPU only with Mac platform, proper hardware tiers, matching screen configs, etc.)
                const coherentProfile = generateCoherentProfile();

                // Convert the coherent profile to settings format
                const profileSettings = coherentProfileToSettings(coherentProfile, settings);

                // Apply coherent settings
                settings.webgl = { ...settings.webgl, ...profileSettings.webgl };
                settings.navigator = { ...settings.navigator, ...profileSettings.navigator };
                settings.screen = { ...settings.screen, ...profileSettings.screen };
                settings.timezone = { ...settings.timezone, ...profileSettings.timezone };

                // Randomize canvas noise level using crypto
                const noiseArray = new Uint32Array(1);
                crypto.getRandomValues(noiseArray);
                settings.canvas = { ...settings.canvas, noiseLevel: (noiseArray[0] % 20) + 5 };

                // Set geolocation to a coherent location based on timezone
                const timezoneLocations: Record<string, { lat: number; lng: number }> = {
                    'America/New_York': { lat: 40.7128, lng: -74.006 },
                    'America/Chicago': { lat: 41.8781, lng: -87.6298 },
                    'America/Denver': { lat: 39.7392, lng: -104.9903 },
                    'America/Los_Angeles': { lat: 34.0522, lng: -118.2437 },
                    'America/Phoenix': { lat: 33.4484, lng: -112.074 },
                    'Europe/London': { lat: 51.5074, lng: -0.1278 },
                    'Europe/Berlin': { lat: 52.52, lng: 13.405 },
                    'Europe/Vienna': { lat: 48.2082, lng: 16.3738 },
                    'Europe/Zurich': { lat: 47.3769, lng: 8.5417 },
                    'Europe/Paris': { lat: 48.8566, lng: 2.3522 },
                    'Europe/Madrid': { lat: 40.4168, lng: -3.7038 },
                    'Europe/Rome': { lat: 41.9028, lng: 12.4964 },
                    'Europe/Amsterdam': { lat: 52.3676, lng: 4.9041 },
                    'Europe/Warsaw': { lat: 52.2297, lng: 21.0122 },
                    'Europe/Moscow': { lat: 55.7558, lng: 37.6173 },
                    'Europe/Kaliningrad': { lat: 54.7104, lng: 20.4522 },
                    'Asia/Tokyo': { lat: 35.6762, lng: 139.6503 },
                    'Asia/Seoul': { lat: 37.5665, lng: 126.978 },
                    'Asia/Shanghai': { lat: 31.2304, lng: 121.4737 },
                    'Asia/Hong_Kong': { lat: 22.3193, lng: 114.1694 },
                    'America/Sao_Paulo': { lat: -23.5505, lng: -46.6333 },
                    'America/Fortaleza': { lat: -3.7172, lng: -38.5433 },
                    'America/Toronto': { lat: 43.6532, lng: -79.3832 },
                    'America/Vancouver': { lat: 49.2827, lng: -123.1207 },
                    'Australia/Sydney': { lat: -33.8688, lng: 151.2093 },
                    'Australia/Melbourne': { lat: -37.8136, lng: 144.9631 },
                    'Australia/Perth': { lat: -31.9505, lng: 115.8605 },
                };

                const baseLocation = timezoneLocations[coherentProfile.timezone] || { lat: 40.7128, lng: -74.006 };
                // Use crypto for secure random offsets
                const geoOffset = new Uint32Array(2);
                crypto.getRandomValues(geoOffset);
                settings.geolocation = {
                    ...settings.geolocation,
                    mode: 'spoof',
                    latitude: baseLocation.lat + ((geoOffset[0] / 0xFFFFFFFF) - 0.5) * 0.1,
                    longitude: baseLocation.lng + ((geoOffset[1] / 0xFFFFFFFF) - 0.5) * 0.1
                };

                await saveSettings(settings);
                await notifyAllTabs(settings);
                await updateSecChRules(settings);
                await updateCSPBypassRules(settings);

                swLog('info', 'All settings randomized with coherent profile', {
                    platform: coherentProfile.platform,
                    gpu: coherentProfile.gpuRenderer.substring(0, 50) + '...',
                    timezone: coherentProfile.timezone,
                    language: coherentProfile.language,
                    seed: settings.fingerprintSeed
                });
                return { success: true, data: settings };
            }

            case 'RESET_SETTINGS': {
                const defaultSettings = { ...DEFAULT_SETTINGS };
                // Generate a fresh fingerprint seed for the reset using crypto
                const resetSeedArray = new Uint32Array(1);
                crypto.getRandomValues(resetSeedArray);
                defaultSettings.fingerprintSeed = (Date.now() ^ resetSeedArray[0]) >>> 0;
                await saveSettings(defaultSettings);
                await notifyAllTabs(defaultSettings);
                await updateBadge(defaultSettings.enabled);
                await updateSecChRules(defaultSettings);
                await updateCSPBypassRules(defaultSettings);
                swLog('info', 'Settings reset to defaults');
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
    await updateCSPBypassRules(settings);
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
