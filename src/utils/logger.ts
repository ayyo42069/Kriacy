// Kriacy Spoof Access Logger
// Safe implementation using only primitives and postMessage

export type ApiType =
    | 'canvas'
    | 'webgl'
    | 'webgl-canvas'
    | 'text-render'
    | 'audio'
    | 'navigator'
    | 'screen'
    | 'geolocation'
    | 'webrtc'
    | 'timezone'
    | 'battery'
    | 'network'
    | 'fonts'
    | 'misc'
    | 'media';

export interface SpoofLogEntry {
    id: string;
    timestamp: number;
    url: string;
    hostname: string;
    apiType: ApiType;
    method: string;
    details?: string;
    count: number;
}

// Capture URL info ONCE at module load using native methods
// This prevents recursion from location getters
const capturedUrl = String(window.location.href);
const capturedHostname = String(window.location.hostname);

// Simple array buffer - no Map to avoid prototype issues
let logBuffer: Array<{ apiType: string; method: string; details?: string; count: number }> = [];

// Aggregation map using simple object
const aggregation: { [key: string]: number } = {};

// Flags
let isProcessing = false;
let flushScheduled = false;

// Use native setTimeout reference captured before any overrides
const nativeSetTimeout = window.setTimeout.bind(window);

/**
 * Log a spoof access event
 * Uses only primitive operations to avoid recursion
 */
export function logSpoofAccess(apiType: ApiType, method: string, details?: string): void {
    // Hard recursion guard
    if (isProcessing) return;
    isProcessing = true;

    // Use simple string key
    const key = apiType + ':' + method;

    // Simple increment using object property
    if (aggregation[key] === undefined) {
        aggregation[key] = 1;
        // Only add to buffer on first occurrence
        logBuffer[logBuffer.length] = {
            apiType: apiType,
            method: method,
            details: details,
            count: 1
        };
    } else {
        aggregation[key] = aggregation[key] + 1;
    }

    // Schedule flush using captured native setTimeout
    if (!flushScheduled && logBuffer.length > 0) {
        flushScheduled = true;
        nativeSetTimeout(flushLogs, 3000);
    }

    isProcessing = false;
}

/**
 * Flush logs to content script using postMessage
 */
function flushLogs(): void {
    flushScheduled = false;

    if (logBuffer.length === 0) return;

    // Build entries with final counts
    const now = Date.now();
    const entries: SpoofLogEntry[] = [];

    for (let i = 0; i < logBuffer.length; i++) {
        const item = logBuffer[i];
        const key = item.apiType + ':' + item.method;
        entries[entries.length] = {
            id: now + '-' + i,
            timestamp: now,
            url: capturedUrl,
            hostname: capturedHostname,
            apiType: item.apiType as ApiType,
            method: item.method,
            details: item.details,
            count: aggregation[key] || 1
        };
    }

    // Clear buffers
    logBuffer = [];
    for (const key in aggregation) {
        delete aggregation[key];
    }

    // Send via postMessage to content script
    // Content script will forward to service worker
    // Use window.location.origin for security (not '*')
    try {
        window.postMessage({
            type: 'KRIACY_LOG_ENTRIES',
            entries: entries
        }, window.location.origin);
    } catch {
        // Ignore errors
    }
}

/**
 * Get all stored logs (handled by service worker)
 */
export function getLogs(): SpoofLogEntry[] {
    return [];
}

/**
 * Clear all stored logs
 */
export function clearLogs(): void {
    logBuffer = [];
    for (const key in aggregation) {
        delete aggregation[key];
    }
}
