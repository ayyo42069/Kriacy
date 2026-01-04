export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory =
    | 'init'
    | 'settings'
    | 'injection'
    | 'protection'
    | 'network'
    | 'storage'
    | 'ui'
    | 'worker'
    | 'general';

export interface SystemLogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    category: LogCategory;
    module: string;
    message: string;
    details?: string;
    context?: Record<string, unknown>;
}

const LOG_CONFIG = {
    FLUSH_INTERVAL: 3000,
    MAX_BUFFER_SIZE: 50,
    MAX_DETAIL_LENGTH: 500,
    ENABLED_LEVELS: ['debug', 'info', 'warn', 'error'] as LogLevel[],
    CONSOLE_MIRROR: false,
};

// Buffer for batch processing
let logBuffer: SystemLogEntry[] = [];
let flushScheduled = false;
let isProcessing = false;

const nativeSetTimeout = typeof window !== 'undefined'
    ? window.setTimeout.bind(window)
    : globalThis.setTimeout?.bind(globalThis);

function generateId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `sys-${ts}-${rand}`;
}

function truncate(str: string | undefined, maxLen: number): string | undefined {
    if (!str) return undefined;
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
}


function formatContext(context: Record<string, unknown> | undefined): string | undefined {
    if (!context) return undefined;
    try {
        const formatted = Object.entries(context)
            .map(([key, value]) => {
                if (typeof value === 'string') {
                    return `${key}: "${value.substring(0, 50)}"`;
                }
                if (typeof value === 'number' || typeof value === 'boolean') {
                    return `${key}: ${value}`;
                }
                if (value === null) return `${key}: null`;
                if (value === undefined) return `${key}: undefined`;
                if (Array.isArray(value)) return `${key}: [${value.length} items]`;
                return `${key}: [Object]`;
            })
            .join(', ');
        return `{ ${formatted} }`;
    } catch {
        return '[Error formatting context]';
    }
}


function log(
    level: LogLevel,
    category: LogCategory,
    module: string,
    message: string,
    context?: Record<string, unknown>
): void {
    if (!LOG_CONFIG.ENABLED_LEVELS.includes(level)) return;

    if (isProcessing) return;
    isProcessing = true;

    try {
        const entry: SystemLogEntry = {
            id: generateId(),
            timestamp: Date.now(),
            level,
            category,
            module,
            message: truncate(message, LOG_CONFIG.MAX_DETAIL_LENGTH) || '',
            details: formatContext(context),
            context,
        };

        logBuffer.push(entry);

        // Mirror to console if enabled (for debugging the logger itself)
        if (LOG_CONFIG.CONSOLE_MIRROR) {
            const prefix = `[Kriacy ${level.toUpperCase()}] [${module}]`;
            const consoleMethod = level === 'error' ? console.error
                : level === 'warn' ? console.warn
                    : level === 'debug' ? console.debug
                        : console.log;
            consoleMethod(prefix, message, context ? context : '');
        }

        // Force flush if buffer is full
        if (logBuffer.length >= LOG_CONFIG.MAX_BUFFER_SIZE && !flushScheduled) {
            flushScheduled = true;
            if (nativeSetTimeout) {
                nativeSetTimeout(flushLogs, 0);
            }
        }
        // Schedule regular flush
        else if (!flushScheduled && logBuffer.length > 0 && nativeSetTimeout) {
            flushScheduled = true;
            nativeSetTimeout(flushLogs, LOG_CONFIG.FLUSH_INTERVAL);
        }
    } finally {
        isProcessing = false;
    }
}

/**
 * Flush logs to storage via message passing
 */
function flushLogs(): void {
    flushScheduled = false;

    if (logBuffer.length === 0) return;

    const entries = [...logBuffer];
    logBuffer = [];

    // Send via postMessage for content scripts or direct chrome.runtime for other contexts
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            // Extension context (popup, options, service worker)
            chrome.runtime.sendMessage({
                action: 'LOG_SYSTEM_ENTRIES',
                payload: entries
            }).catch(() => {
                // Ignore errors - service worker might not be ready
            });
        } else if (typeof window !== 'undefined' && window.postMessage) {
            // Content script context - send to content script which forwards to service worker
            window.postMessage({
                type: 'KRIACY_SYSTEM_LOG_ENTRIES',
                entries: entries
            }, window.location.origin);
        }
    } catch {
        // Silently fail if messaging isn't available
    }
}

/**
 * Force flush any pending logs immediately
 */
export function forceFlush(): void {
    if (logBuffer.length > 0) {
        flushLogs();
    }
}

// === Public Logging API ===

/**
 * Log a debug message (verbose, for development)
 */
export function debug(module: string, message: string, context?: Record<string, unknown>): void {
    log('debug', 'general', module, message, context);
}

/**
 * Log an info message (normal operation)
 */
export function info(module: string, message: string, context?: Record<string, unknown>): void {
    log('info', 'general', module, message, context);
}

/**
 * Log a warning message
 */
export function warn(module: string, message: string, context?: Record<string, unknown>): void {
    log('warn', 'general', module, message, context);
}

/**
 * Log an error message
 */
export function error(module: string, message: string, context?: Record<string, unknown>): void {
    log('error', 'general', module, message, context);
}

// === Categorized Logging ===

/**
 * Log an initialization event
 */
export function logInit(module: string, message: string, context?: Record<string, unknown>): void {
    log('info', 'init', module, message, context);
}

/**
 * Log a settings change
 */
export function logSettings(module: string, message: string, context?: Record<string, unknown>): void {
    log('info', 'settings', module, message, context);
}

/**
 * Log script injection event
 */
export function logInjection(module: string, message: string, context?: Record<string, unknown>): void {
    log('debug', 'injection', module, message, context);
}

/**
 * Log protection module activity
 */
export function logProtection(module: string, message: string, context?: Record<string, unknown>): void {
    log('debug', 'protection', module, message, context);
}

/**
 * Log network interception
 */
export function logNetwork(module: string, message: string, context?: Record<string, unknown>): void {
    log('debug', 'network', module, message, context);
}

/**
 * Log storage operations
 */
export function logStorage(module: string, message: string, context?: Record<string, unknown>): void {
    log('debug', 'storage', module, message, context);
}

/**
 * Log UI activity
 */
export function logUI(module: string, message: string, context?: Record<string, unknown>): void {
    log('debug', 'ui', module, message, context);
}

/**
 * Log worker activity
 */
export function logWorker(module: string, message: string, context?: Record<string, unknown>): void {
    log('debug', 'worker', module, message, context);
}

// === Named Logger Factory ===

/**
 * Create a logger instance for a specific module
 * This provides a cleaner API: const log = createLogger('MyModule'); log.info('message');
 */
export function createLogger(module: string) {
    return {
        debug: (message: string, context?: Record<string, unknown>) => log('debug', 'general', module, message, context),
        info: (message: string, context?: Record<string, unknown>) => log('info', 'general', module, message, context),
        warn: (message: string, context?: Record<string, unknown>) => log('warn', 'general', module, message, context),
        error: (message: string, context?: Record<string, unknown>) => log('error', 'general', module, message, context),
        init: (message: string, context?: Record<string, unknown>) => log('info', 'init', module, message, context),
        protection: (message: string, context?: Record<string, unknown>) => log('debug', 'protection', module, message, context),
        settings: (message: string, context?: Record<string, unknown>) => log('info', 'settings', module, message, context),
    };
}

// Flush logs before page unload
if (typeof window !== 'undefined') {
    const beforeUnloadHandler = () => {
        forceFlush();
    };
    window.addEventListener('beforeunload', beforeUnloadHandler, { capture: true });
    window.addEventListener('pagehide', beforeUnloadHandler, { capture: true });
}
