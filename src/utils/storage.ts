// Storage utility for Kriacy extension
import { SpoofSettings, DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = 'kriacy_settings';

/**
 * Get current settings from Chrome storage
 */
export async function getSettings(): Promise<SpoofSettings> {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            if (result[STORAGE_KEY]) {
                // Merge with defaults to handle any missing properties
                resolve({ ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] });
            } else {
                resolve(DEFAULT_SETTINGS);
            }
        });
    });
}

/**
 * Save settings to Chrome storage
 */
export async function saveSettings(settings: SpoofSettings): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Update partial settings
 */
export async function updateSettings(partial: Partial<SpoofSettings>): Promise<SpoofSettings> {
    const current = await getSettings();
    const updated = { ...current, ...partial };
    await saveSettings(updated);
    return updated;
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<SpoofSettings> {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
}

/**
 * Listen for settings changes
 */
export function onSettingsChange(callback: (settings: SpoofSettings) => void): void {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[STORAGE_KEY]) {
            callback(changes[STORAGE_KEY].newValue);
        }
    });
}
