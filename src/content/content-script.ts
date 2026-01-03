// Content script - runs in ISOLATED world
// Responsible for injecting the main-world script BEFORE any page scripts

(function () {
    'use strict';

    // Helper to check if extension context is still valid
    function isExtensionContextValid(): boolean {
        try {
            // chrome.runtime.id is undefined when context is invalidated
            return !!(chrome.runtime && chrome.runtime.id);
        } catch {
            return false;
        }
    }

    // Safe wrapper for chrome.runtime.sendMessage
    function safeSendMessage(
        message: any,
        callback?: (response: any) => void
    ): void {
        if (!isExtensionContextValid()) {
            // Context invalidation is expected when extension is reloaded/updated
            // Don't log warning as it's normal behavior, just silently handle it
            if (callback) callback(undefined);
            return;
        }

        try {
            if (callback) {
                chrome.runtime.sendMessage(message, (response) => {
                    // Check for lastError to prevent uncaught errors
                    if (chrome.runtime.lastError) {
                        console.warn('[Kriacy] Message failed:', chrome.runtime.lastError.message);
                        callback(undefined);
                        return;
                    }
                    callback(response);
                });
            } else {
                chrome.runtime.sendMessage(message).catch((err) => {
                    console.warn('[Kriacy] Message failed:', err.message);
                });
            }
        } catch (e) {
            console.warn('[Kriacy] Failed to send message:', e);
            if (callback) callback(undefined);
        }
    }

    // NOTE: main-world.js is now injected directly via manifest using "world": "MAIN"
    // This is faster and more reliable than script element injection
    // The content-script now only handles message passing with the background script

    // Listen for settings updates from background
    // Only add listener if context is valid
    if (isExtensionContextValid()) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'SETTINGS_UPDATED') {
                const payload = message.payload;

                // Update localStorage with ALL settings so future page loads use them immediately
                // This is CRITICAL for making settings persist across browser restarts!
                try {
                    if (payload) {
                        // ALWAYS store with FIXED key for persistence across browser restarts
                        localStorage.setItem('__kriacy_settings__', JSON.stringify(payload));

                        // Also store seed separately for quick access (fingerprint consistency is priority)
                        if (payload.fingerprintSeed) {
                            localStorage.setItem('__kriacy_fp_seed__', payload.fingerprintSeed.toString());
                        }
                    }
                    // Clear sessionStorage to force refresh
                    sessionStorage.removeItem('__kriacy_seed__');
                } catch (e) {
                    // Storage may not be accessible
                }

                // Forward to main world via custom event
                window.dispatchEvent(new CustomEvent('kriacy-settings-update', {
                    detail: payload
                }));
            }
            sendResponse({ success: true });
            return true;
        });
    }

    // Listen for log entries from main world via postMessage and forward to service worker
    // SECURITY: Only accept messages from same origin and same window
    window.addEventListener('message', (e: MessageEvent) => {
        // Origin check - reject messages from different origins
        if (e.origin !== window.location.origin) return;
        // Source check - reject messages from iframes
        if (e.source !== window) return;

        // Handle spoof log entries
        if (e.data && e.data.type === 'KRIACY_LOG_ENTRIES') {
            const entries = e.data.entries;
            if (entries && entries.length > 0) {
                safeSendMessage({
                    action: 'LOG_SPOOF_ACCESS',
                    payload: entries
                });
            }
        }

        // Handle system log entries
        if (e.data && e.data.type === 'KRIACY_SYSTEM_LOG_ENTRIES') {
            const entries = e.data.entries;
            if (entries && entries.length > 0) {
                safeSendMessage({
                    action: 'LOG_SYSTEM_ENTRIES',
                    payload: entries
                });
            }
        }
    });

    // Request initial settings and forward to main world
    setTimeout(() => {
        safeSendMessage({ action: 'GET_SETTINGS' }, (response) => {
            if (response?.success && response.data) {
                // Store full settings in localStorage for future page loads
                // SECURITY: Use dynamic key if available
                try {
                    let settingsKey = (window as any).__KRIACY_KEY__;
                    if (!settingsKey) {
                        const suffix = Math.random().toString(36).substring(2);
                        settingsKey = `__kriacy_${suffix}__`;
                        (window as any).__KRIACY_KEY__ = settingsKey;
                    }
                    localStorage.setItem(settingsKey, JSON.stringify(response.data));
                    if (response.data.fingerprintSeed) {
                        localStorage.setItem('__kriacy_fp_seed__', response.data.fingerprintSeed.toString());
                    }
                } catch (e) { /* Storage may not be available */ }

                window.dispatchEvent(new CustomEvent('kriacy-init', {
                    detail: response.data
                }));
            }
        });
    }, 100);
})();
