// Kriacy Spoof Access Logger
// Enhanced implementation with better data capture and performance

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
    | 'media'
    | 'svg';

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
const aggregation: { [key: string]: { count: number; details?: string } } = {};

// Flags
let isProcessing = false;
let flushScheduled = false;

// Use native setTimeout reference captured before any overrides
const nativeSetTimeout = window.setTimeout.bind(window);

// Configuration
const LOG_CONFIG = {
    FLUSH_INTERVAL: 2000, // Flush every 2 seconds
    MAX_BUFFER_SIZE: 100,  // Max entries before force flush
    MAX_DETAIL_LENGTH: 200, // Truncate details to this length
};

/**
 * Generate a unique ID for log entries
 */
function generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
}

/**
 * Truncate string to max length
 */
function truncateString(str: string | undefined, maxLen: number): string | undefined {
    if (!str) return undefined;
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
}

/**
 * Log a spoof access event
 * Uses only primitive operations to avoid recursion
 * 
 * @param apiType - The type of API being spoofed
 * @param method - The method or property being accessed
 * @param details - Optional additional details about the access
 */
export function logSpoofAccess(apiType: ApiType, method: string, details?: string): void {
    // Hard recursion guard
    if (isProcessing) return;
    isProcessing = true;

    try {
        // Truncate details if too long
        const truncatedDetails = truncateString(details, LOG_CONFIG.MAX_DETAIL_LENGTH);

        // Use simple string key for aggregation
        const key = apiType + ':' + method;

        // Check if this key already exists
        if (aggregation[key] === undefined) {
            // First occurrence - add to buffer
            aggregation[key] = { count: 1, details: truncatedDetails };
            logBuffer[logBuffer.length] = {
                apiType: apiType,
                method: method,
                details: truncatedDetails,
                count: 1
            };
        } else {
            // Increment existing entry
            aggregation[key].count = aggregation[key].count + 1;
            // Update details if not set before
            if (!aggregation[key].details && truncatedDetails) {
                aggregation[key].details = truncatedDetails;
            }
        }

        // Force flush if buffer is too large
        if (logBuffer.length >= LOG_CONFIG.MAX_BUFFER_SIZE && !flushScheduled) {
            flushScheduled = true;
            nativeSetTimeout(flushLogs, 0);
        }
        // Schedule regular flush
        else if (!flushScheduled && logBuffer.length > 0) {
            flushScheduled = true;
            nativeSetTimeout(flushLogs, LOG_CONFIG.FLUSH_INTERVAL);
        }
    } finally {
        isProcessing = false;
    }
}

/**
 * Log a spoof access with formatted details
 * Convenience function for common patterns
 */
export function logSpoofWithValue(
    apiType: ApiType,
    method: string,
    originalValue: unknown,
    spoofedValue: unknown
): void {
    let details: string | undefined;

    try {
        // Format values for display
        const origStr = formatValue(originalValue);
        const spoofStr = formatValue(spoofedValue);

        if (origStr !== spoofStr) {
            details = `${origStr} → ${spoofStr}`;
        }
    } catch {
        // Ignore formatting errors
    }

    logSpoofAccess(apiType, method, details);
}

/**
 * Format a value for display in logs
 */
function formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value.substring(0, 50)}"`;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '[Object]';
    return String(value).substring(0, 50);
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
        const aggData = aggregation[key];

        entries[entries.length] = {
            id: generateId(),
            timestamp: now,
            url: capturedUrl,
            hostname: capturedHostname,
            apiType: item.apiType as ApiType,
            method: item.method,
            details: aggData?.details || item.details,
            count: aggData?.count || 1
        };
    }

    // Clear buffers
    logBuffer = [];
    for (const key in aggregation) {
        delete aggregation[key];
    }

    // Send via postMessage to content script
    // Content script will forward to service worker
    try {
        window.postMessage({
            type: 'KRIACY_LOG_ENTRIES',
            entries: entries
        }, window.location.origin);
    } catch {
        // Ignore errors - can happen if origin is null (e.g., sandboxed iframe)
    }
}

/**
 * Force flush any pending logs immediately
 * Useful before page unload
 */
export function forceFlush(): void {
    if (logBuffer.length > 0) {
        flushLogs();
    }
}

/**
 * Get current log count (for testing/debugging)
 */
export function getPendingLogCount(): number {
    return logBuffer.length;
}

/**
 * Get all stored logs (handled by service worker)
 * This is a stub - actual logs are retrieved via message passing
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

// Flush logs before page unload to not lose any data
if (typeof window !== 'undefined') {
    const beforeUnloadHandler = () => {
        forceFlush();
    };

    // Use capture phase to run early
    window.addEventListener('beforeunload', beforeUnloadHandler, { capture: true });
    window.addEventListener('pagehide', beforeUnloadHandler, { capture: true });
}
