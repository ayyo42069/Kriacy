import { settings } from '../core/state';
import { logSpoofAccess } from '../../utils/logger';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('Timezone');

let isHandlingTimezone = false;

const OriginalDate = Date;
const OriginalDatePrototype = Date.prototype;
const OriginalIntlDateTimeFormat = Intl.DateTimeFormat;
const originalGetTimezoneOffset = OriginalDatePrototype.getTimezoneOffset;
const originalToString = OriginalDatePrototype.toString;
const originalToDateString = OriginalDatePrototype.toDateString;
const originalToTimeString = OriginalDatePrototype.toTimeString;
const originalToLocaleString = OriginalDatePrototype.toLocaleString;
const originalToLocaleDateString = OriginalDatePrototype.toLocaleDateString;
const originalToLocaleTimeString = OriginalDatePrototype.toLocaleTimeString;
const originalGetHours = OriginalDatePrototype.getHours;
const originalGetMinutes = OriginalDatePrototype.getMinutes;
const originalGetSeconds = OriginalDatePrototype.getSeconds;
const originalGetMilliseconds = OriginalDatePrototype.getMilliseconds;
const originalGetDate = OriginalDatePrototype.getDate;
const originalGetDay = OriginalDatePrototype.getDay;
const originalGetMonth = OriginalDatePrototype.getMonth;
const originalGetFullYear = OriginalDatePrototype.getFullYear;
const originalGetYear = (OriginalDatePrototype as any).getYear;
const originalSetHours = OriginalDatePrototype.setHours;
const originalSetMinutes = OriginalDatePrototype.setMinutes;
const originalSetSeconds = OriginalDatePrototype.setSeconds;
const originalSetMilliseconds = OriginalDatePrototype.setMilliseconds;
const originalSetDate = OriginalDatePrototype.setDate;
const originalSetMonth = OriginalDatePrototype.setMonth;
const originalSetFullYear = OriginalDatePrototype.setFullYear;

const originalFunctionToString = Function.prototype.toString;
const NATIVE_STRING_SYMBOL = Symbol.for('__kriacy_native_string__');
Function.prototype.toString = function (this: Function): string {
    // Check if this function has been marked as spoofed
    const nativeString = (this as any)[NATIVE_STRING_SYMBOL];
    if (typeof nativeString === 'string') {
        return nativeString;
    }
    return originalFunctionToString.call(this);
};

(Function.prototype.toString as any)[NATIVE_STRING_SYMBOL] = 'function toString() { [native code] }';

function makeNative(fn: Function, name: string): void {
    if (!fn) return;

    const nativeString = `function ${name}() { [native code] }`;

    // Mark the function with our native string symbol
    try {
        Object.defineProperty(fn, NATIVE_STRING_SYMBOL, {
            value: nativeString,
            writable: false,
            enumerable: false,
            configurable: false
        });
    } catch (e) {
        // Fallback for functions that don't allow defineProperty
        (fn as any)[NATIVE_STRING_SYMBOL] = nativeString;
    }

    // Set the function name
    try {
        Object.defineProperty(fn, 'name', {
            value: name,
            writable: false,
            configurable: true
        });
    } catch (e) {
        // Some functions may not allow name to be changed
    }

    // Set length to match original if it's a Date method
    if (name === 'Date') {
        try {
            Object.defineProperty(fn, 'length', {
                value: 7,
                writable: false,
                configurable: true
            });
        } catch (e) { }
    }
}




/**
 * Get the stored offset in human-readable format (positive = ahead of UTC)
 * Paris = 60 (UTC+1), New York = -300 (UTC-5)
 */
function getStoredOffset(): number {
    return settings.timezone?.offset ?? 0;
}

/**
 * Get the target offset for JavaScript's getTimezoneOffset format (negated).
 * Paris = -60, New York = +300
 */
function getTargetOffset(): number {
    return -getStoredOffset();
}

/**
 * Get the real system offset using the original method
 */
function getRealOffset(date: Date): number {
    return originalGetTimezoneOffset.call(date);
}

/**
 * Get the target timezone name (IANA timezone)
 */
function getTargetTimezone(): string {
    return settings.timezone?.timezone ?? 'UTC';
}

/**
 * Check if timezone spoofing is enabled
 */
function isEnabled(): boolean {
    return settings.timezone?.enabled ?? false;
}

/**
 * Get the offset difference between spoofed and real timezone in milliseconds
 * Used for Date constructor adjustment
 */
function getOffsetDiffMs(date: Date): number {
    if (!isEnabled()) return 0;
    const realOffset = getRealOffset(date);
    const spoofedOffset = getTargetOffset();
    return (spoofedOffset - realOffset) * 60 * 1000;
}

/**
 * Convert a date to display values in the spoofed timezone.
 * 
 * For DISPLAY purposes: we take the internal UTC time and convert to what
 * the local time would be in the spoofed timezone.
 * 
 * Formula: localTime = UTC - (offset in ms)
 * Because getTimezoneOffset returns positive for behind UTC (e.g., 480 for GMT-8),
 * we SUBTRACT the offset to get local time.
 * 
 * Example: Timestamp 1970-07-01T08:00:00Z (which is midnight GMT-8)
 * - spoofedOffset = 480 (GMT-8)
 * - adjustedTime = 08:00Z - 8h = 00:00Z (as UTC components)
 * - getUTCHours() = 0 ✓
 */
function adjustDateForSpoofedTimezone(date: Date): Date {
    if (!isEnabled()) return date;
    const spoofedOffset = getTargetOffset();
    // Convert UTC to local time in spoofed timezone
    // localTime = UTC - offset (offset is positive for behind UTC)
    return new OriginalDate(date.getTime() - spoofedOffset * 60 * 1000);
}

/**
 * Adjust a timestamp that was parsed in real local time to spoofed local time
 * This is used for Date constructor string parsing
 * 
 * Example: Real timezone GMT+1, Spoofed timezone Tokyo (UTC+9)
 * - Real midnight Jan 1 = 2025-12-31T23:00:00Z (UTC - 1 hour)
 * - Spoofed midnight Jan 1 = 2025-12-31T15:00:00Z (UTC - 9 hours)
 * - Spoofed is 8 hours EARLIER, so we SUBTRACT from the timestamp
 * 
 * Formula: spoofedTimestamp = realTimestamp + (spoofedOffset - realOffset) * 60 * 1000
 * Since spoofedOffset is more negative for timezones ahead of UTC, this subtracts correctly.
 */
function adjustParsedTimestamp(timestamp: number): number {
    if (!isEnabled()) return timestamp;
    const tempDate = new OriginalDate(timestamp);
    const realOffset = getRealOffset(tempDate);
    const spoofedOffset = getTargetOffset();
    // spoofedOffset - realOffset gives negative value when spoofed is ahead
    // which correctly moves the timestamp earlier
    const offsetDiff = (spoofedOffset - realOffset) * 60 * 1000;
    return timestamp + offsetDiff;
}

/**
 * Format a timezone offset as a string (e.g., +0100, -0500)
 */
function formatTimezoneOffset(offsetMinutes: number): string {
    // offsetMinutes is in getTimezoneOffset format: negative = ahead of UTC
    const sign = offsetMinutes <= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
    const mins = (absOffset % 60).toString().padStart(2, '0');
    return `${sign}${hours}${mins}`;
}

/**
 * Get a human-readable timezone name for the spoofed timezone
 */
function getSpoofedTimezoneName(): string {
    const tz = getTargetTimezone();
    const tzNames: Record<string, string> = {
        'UTC': 'Coordinated Universal Time',
        'America/New_York': 'Eastern Standard Time',
        'America/Los_Angeles': 'Pacific Standard Time',
        'America/Chicago': 'Central Standard Time',
        'America/Denver': 'Mountain Standard Time',
        'Europe/London': 'Greenwich Mean Time',
        'Europe/Paris': 'Central European Standard Time',
        'Europe/Berlin': 'Central European Standard Time',
        'Europe/Moscow': 'Moscow Standard Time',
        'Asia/Tokyo': 'Japan Standard Time',
        'Asia/Shanghai': 'China Standard Time',
        'Asia/Singapore': 'Singapore Time',
        'Asia/Dubai': 'Gulf Standard Time',
        'Australia/Sydney': 'Australian Eastern Standard Time',
        'Pacific/Auckland': 'New Zealand Standard Time'
    };
    return tzNames[tz] || tz;
}

/**
 * Valid Intl.DateTimeFormat options - used to filter invalid options
 * that could be passed to detect spoofing
 */
const VALID_DATE_TIME_FORMAT_OPTIONS = new Set([
    'localeMatcher', 'weekday', 'era', 'year', 'month', 'day',
    'hour', 'minute', 'second', 'timeZoneName', 'formatMatcher',
    'hour12', 'timeZone', 'dateStyle', 'timeStyle', 'calendar',
    'dayPeriod', 'numberingSystem', 'hourCycle', 'fractionalSecondDigits'
]);

/**
 * Filter options to only include valid Intl.DateTimeFormat options
 * This prevents "Invalid option" errors from fingerprinting tests
 */
function filterValidDateTimeFormatOptions(options: Intl.DateTimeFormatOptions | undefined): Intl.DateTimeFormatOptions {
    if (!options || typeof options !== 'object') return {};

    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(options)) {
        if (VALID_DATE_TIME_FORMAT_OPTIONS.has(key)) {
            filtered[key] = (options as Record<string, unknown>)[key];
        }
    }
    return filtered as Intl.DateTimeFormatOptions;
}

/**
 * Detect if a date string will be parsed as local time (not UTC)
 * ISO format without time (YYYY-MM-DD) is parsed as UTC
 * Other formats like MM/DD/YYYY are parsed as local time
 */
function isLocalTimeFormat(dateString: string): boolean {
    // ISO date-only format (YYYY-MM-DD) is parsed as UTC in ES5+
    const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDateOnly.test(dateString)) return false;

    // ISO datetime with Z or timezone offset is UTC
    if (/Z$|[+-]\d{2}:\d{2}$/.test(dateString)) return false;

    // Most other formats are parsed as local time
    return true;
}

/**
 * Initialize timezone spoofing
 */
export function initTimezoneSpoofing(): void {
    // ===================================
    // 1. Override Date Constructor
    // This is critical to prevent timezone computation attacks
    // ===================================
    try {
        const SpoofedDate = function (this: any, ...args: any[]): Date | string {
            // Handle being called as a function (without 'new')
            const isNewCall = new.target !== undefined || this instanceof SpoofedDate;

            if (args.length === 0) {
                // new Date() - current time, no adjustment needed for the timestamp
                if (isNewCall) {
                    return new OriginalDate();
                } else {
                    // Date() called without new returns a string
                    // Must use the spoofed toString to match new Date().toString()
                    const now = new OriginalDate();
                    return Date.prototype.toString.call(now);
                }
            }

            if (args.length === 1) {
                const arg = args[0];

                // If it's a string that will be parsed as local time, adjust the result
                if (typeof arg === 'string' && isEnabled() && !isHandlingTimezone) {
                    isHandlingTimezone = true;
                    try {
                        // Parse using original Date
                        const parsed = new OriginalDate(arg);

                        // Check if parsing was successful
                        if (!isNaN(parsed.getTime())) {
                            // Check if this string format is interpreted as local time
                            if (isLocalTimeFormat(arg)) {
                                // Adjust the timestamp to account for timezone difference
                                const adjustedTimestamp = adjustParsedTimestamp(parsed.getTime());
                                if (isNewCall) {
                                    return new OriginalDate(adjustedTimestamp);
                                } else {
                                    return Date.prototype.toString.call(new OriginalDate(adjustedTimestamp));
                                }
                            }
                        }
                    } finally {
                        isHandlingTimezone = false;
                    }
                }

                // For numbers, Date objects, or UTC strings, pass through
                if (isNewCall) {
                    return new OriginalDate(arg);
                } else {
                    return Date.prototype.toString.call(new OriginalDate(arg));
                }
            }

            // Multiple arguments: Date(year, month, day?, hours?, minutes?, seconds?, ms?)
            // These are always interpreted as local time
            if (isEnabled() && !isHandlingTimezone) {
                isHandlingTimezone = true;
                try {
                    // Create the date using original constructor
                    // @ts-ignore
                    const parsed = new OriginalDate(...args);
                    // Adjust for timezone difference
                    const adjustedTimestamp = adjustParsedTimestamp(parsed.getTime());
                    if (isNewCall) {
                        return new OriginalDate(adjustedTimestamp);
                    } else {
                        return Date.prototype.toString.call(new OriginalDate(adjustedTimestamp));
                    }
                } finally {
                    isHandlingTimezone = false;
                }
            }

            if (isNewCall) {
                // @ts-ignore
                return new OriginalDate(...args);
            } else {
                // @ts-ignore
                return Date.prototype.toString.call(new OriginalDate(...args));
            }
        } as any;

        // Copy static properties and methods
        SpoofedDate.prototype = OriginalDate.prototype;
        SpoofedDate.now = OriginalDate.now.bind(OriginalDate);
        SpoofedDate.parse = function (dateString: string): number {
            if (isEnabled() && !isHandlingTimezone && typeof dateString === 'string') {
                isHandlingTimezone = true;
                try {
                    const timestamp = OriginalDate.parse(dateString);
                    if (!isNaN(timestamp) && isLocalTimeFormat(dateString)) {
                        return adjustParsedTimestamp(timestamp);
                    }
                    return timestamp;
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return OriginalDate.parse(dateString);
        };
        SpoofedDate.UTC = OriginalDate.UTC.bind(OriginalDate);
        SpoofedDate.length = 7;

        // Make it look native
        Object.defineProperty(SpoofedDate, 'name', { value: 'Date', configurable: true });
        makeNative(SpoofedDate, 'Date');
        makeNative(SpoofedDate.parse, 'parse');

        // Replace global Date
        (window as any).Date = SpoofedDate;

    } catch (e) {
        log.warn('Failed to initialize Date constructor spoofing', { error: String(e) });
    }

    // ===================================
    // 2. Override Date.prototype methods
    // ===================================
    try {
        // getTimezoneOffset
        Date.prototype.getTimezoneOffset = function (this: Date): number {
            if (isHandlingTimezone) {
                return originalGetTimezoneOffset.call(this);
            }
            if (isEnabled()) {
                const offset = getTargetOffset();
                logSpoofAccess('timezone', 'getTimezoneOffset', offset.toString());
                return offset;
            }
            return originalGetTimezoneOffset.call(this);
        };

        // toString
        Date.prototype.toString = function (this: Date): string {
            if (isHandlingTimezone) {
                return originalToString.call(this);
            }
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    const adjusted = adjustDateForSpoofedTimezone(this);
                    const offset = getTargetOffset();
                    const offsetStr = formatTimezoneOffset(offset);
                    const tzName = getSpoofedTimezoneName();

                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                    const day = days[adjusted.getUTCDay()];
                    const month = months[adjusted.getUTCMonth()];
                    const date = adjusted.getUTCDate().toString().padStart(2, '0');
                    const year = adjusted.getUTCFullYear();
                    const hours = adjusted.getUTCHours().toString().padStart(2, '0');
                    const mins = adjusted.getUTCMinutes().toString().padStart(2, '0');
                    const secs = adjusted.getUTCSeconds().toString().padStart(2, '0');

                    return `${day} ${month} ${date} ${year} ${hours}:${mins}:${secs} GMT${offsetStr} (${tzName})`;
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalToString.call(this);
        };

        // toTimeString
        Date.prototype.toTimeString = function (this: Date): string {
            if (isHandlingTimezone) {
                return originalToTimeString.call(this);
            }
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    const adjusted = adjustDateForSpoofedTimezone(this);
                    const offset = getTargetOffset();
                    const offsetStr = formatTimezoneOffset(offset);
                    const tzName = getSpoofedTimezoneName();

                    const hours = adjusted.getUTCHours().toString().padStart(2, '0');
                    const mins = adjusted.getUTCMinutes().toString().padStart(2, '0');
                    const secs = adjusted.getUTCSeconds().toString().padStart(2, '0');

                    return `${hours}:${mins}:${secs} GMT${offsetStr} (${tzName})`;
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalToTimeString.call(this);
        };

        // toDateString
        Date.prototype.toDateString = function (this: Date): string {
            if (isHandlingTimezone) {
                return originalToDateString.call(this);
            }
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    const adjusted = adjustDateForSpoofedTimezone(this);
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                    return `${days[adjusted.getUTCDay()]} ${months[adjusted.getUTCMonth()]} ${adjusted.getUTCDate().toString().padStart(2, '0')} ${adjusted.getUTCFullYear()}`;
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalToDateString.call(this);
        };

        // toLocaleString
        Date.prototype.toLocaleString = function (this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions): string {
            if (isHandlingTimezone) {
                return originalToLocaleString.call(this, locales, options);
            }
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    const opts: Intl.DateTimeFormatOptions = { ...filterValidDateTimeFormatOptions(options), timeZone: getTargetTimezone() };
                    return new OriginalIntlDateTimeFormat(locales, opts).format(this);
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalToLocaleString.call(this, locales, options);
        };

        // toLocaleDateString
        Date.prototype.toLocaleDateString = function (this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions): string {
            if (isHandlingTimezone) {
                return originalToLocaleDateString.call(this, locales, options);
            }
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    const filteredOptions = filterValidDateTimeFormatOptions(options);
                    // dateStyle conflicts with individual date components (year, month, day)
                    // Only add defaults if dateStyle is not present
                    const opts: Intl.DateTimeFormatOptions = filteredOptions.dateStyle
                        ? { ...filteredOptions, timeZone: getTargetTimezone() }
                        : {
                            ...filteredOptions,
                            timeZone: getTargetTimezone(),
                            year: filteredOptions.year || 'numeric',
                            month: filteredOptions.month || 'numeric',
                            day: filteredOptions.day || 'numeric'
                        };
                    return new OriginalIntlDateTimeFormat(locales, opts).format(this);
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalToLocaleDateString.call(this, locales, options);
        };

        // toLocaleTimeString
        Date.prototype.toLocaleTimeString = function (this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions): string {
            if (isHandlingTimezone) {
                return originalToLocaleTimeString.call(this, locales, options);
            }
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    const filteredOptions = filterValidDateTimeFormatOptions(options);
                    // timeStyle conflicts with individual time components (hour, minute, second)
                    // Only add defaults if timeStyle is not present
                    const opts: Intl.DateTimeFormatOptions = filteredOptions.timeStyle
                        ? { ...filteredOptions, timeZone: getTargetTimezone() }
                        : {
                            ...filteredOptions,
                            timeZone: getTargetTimezone(),
                            hour: filteredOptions.hour || 'numeric',
                            minute: filteredOptions.minute || 'numeric',
                            second: filteredOptions.second || 'numeric'
                        };
                    return new OriginalIntlDateTimeFormat(locales, opts).format(this);
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalToLocaleTimeString.call(this, locales, options);
        };

        // getHours
        Date.prototype.getHours = function (this: Date): number {
            if (isHandlingTimezone) return originalGetHours.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCHours();
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetHours.call(this);
        };

        // getMinutes
        Date.prototype.getMinutes = function (this: Date): number {
            if (isHandlingTimezone) return originalGetMinutes.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCMinutes();
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetMinutes.call(this);
        };

        // getSeconds
        Date.prototype.getSeconds = function (this: Date): number {
            if (isHandlingTimezone) return originalGetSeconds.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCSeconds();
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetSeconds.call(this);
        };

        // getMilliseconds
        Date.prototype.getMilliseconds = function (this: Date): number {
            if (isHandlingTimezone) return originalGetMilliseconds.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCMilliseconds();
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetMilliseconds.call(this);
        };

        // getDate
        Date.prototype.getDate = function (this: Date): number {
            if (isHandlingTimezone) return originalGetDate.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCDate();
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetDate.call(this);
        };

        // getDay
        Date.prototype.getDay = function (this: Date): number {
            if (isHandlingTimezone) return originalGetDay.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCDay();
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetDay.call(this);
        };

        // getMonth
        Date.prototype.getMonth = function (this: Date): number {
            if (isHandlingTimezone) return originalGetMonth.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCMonth();
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetMonth.call(this);
        };

        // getFullYear
        Date.prototype.getFullYear = function (this: Date): number {
            if (isHandlingTimezone) return originalGetFullYear.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCFullYear();
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetFullYear.call(this);
        };

        // getYear (deprecated but still used)
        (Date.prototype as any).getYear = function (this: Date): number {
            if (isHandlingTimezone) return originalGetYear.call(this);
            if (isEnabled()) {
                isHandlingTimezone = true;
                try {
                    return adjustDateForSpoofedTimezone(this).getUTCFullYear() - 1900;
                } finally {
                    isHandlingTimezone = false;
                }
            }
            return originalGetYear.call(this);
        };

        // setHours - needs adjustment
        Date.prototype.setHours = function (this: Date, hours: number, min?: number, sec?: number, ms?: number): number {
            if (isHandlingTimezone || !isEnabled()) {
                return originalSetHours.call(this, hours, min!, sec!, ms!);
            }

            isHandlingTimezone = true;
            try {
                // Get current values in spoofed timezone
                const adjusted = adjustDateForSpoofedTimezone(this);
                const currentMin = min !== undefined ? min : adjusted.getUTCMinutes();
                const currentSec = sec !== undefined ? sec : adjusted.getUTCSeconds();
                const currentMs = ms !== undefined ? ms : adjusted.getUTCMilliseconds();

                // Set values in UTC on the adjusted date
                adjusted.setUTCHours(hours, currentMin, currentSec, currentMs);

                // Convert back from spoofed local time to UTC
                // adjustDateForSpoofedTimezone did: time - spoofedOffset
                // So to reverse: time + spoofedOffset
                const spoofedOffset = getTargetOffset();
                const newTime = adjusted.getTime() + spoofedOffset * 60 * 1000;

                return this.setTime(newTime);
            } finally {
                isHandlingTimezone = false;
            }
        };

        // setMinutes
        Date.prototype.setMinutes = function (this: Date, min: number, sec?: number, ms?: number): number {
            if (isHandlingTimezone || !isEnabled()) {
                return originalSetMinutes.call(this, min, sec!, ms!);
            }

            isHandlingTimezone = true;
            try {
                const adjusted = adjustDateForSpoofedTimezone(this);
                const currentSec = sec !== undefined ? sec : adjusted.getUTCSeconds();
                const currentMs = ms !== undefined ? ms : adjusted.getUTCMilliseconds();

                adjusted.setUTCMinutes(min, currentSec, currentMs);

                const spoofedOffset = getTargetOffset();
                return this.setTime(adjusted.getTime() + spoofedOffset * 60 * 1000);
            } finally {
                isHandlingTimezone = false;
            }
        };

        // setSeconds
        Date.prototype.setSeconds = function (this: Date, sec: number, ms?: number): number {
            if (isHandlingTimezone || !isEnabled()) {
                return originalSetSeconds.call(this, sec, ms!);
            }

            isHandlingTimezone = true;
            try {
                const adjusted = adjustDateForSpoofedTimezone(this);
                const currentMs = ms !== undefined ? ms : adjusted.getUTCMilliseconds();

                adjusted.setUTCSeconds(sec, currentMs);

                const spoofedOffset = getTargetOffset();
                return this.setTime(adjusted.getTime() + spoofedOffset * 60 * 1000);
            } finally {
                isHandlingTimezone = false;
            }
        };

        // setMilliseconds
        Date.prototype.setMilliseconds = function (this: Date, ms: number): number {
            // Milliseconds don't depend on timezone
            return originalSetMilliseconds.call(this, ms);
        };

        // setDate
        Date.prototype.setDate = function (this: Date, date: number): number {
            if (isHandlingTimezone || !isEnabled()) {
                return originalSetDate.call(this, date);
            }

            isHandlingTimezone = true;
            try {
                const adjusted = adjustDateForSpoofedTimezone(this);
                adjusted.setUTCDate(date);

                const spoofedOffset = getTargetOffset();
                return this.setTime(adjusted.getTime() + spoofedOffset * 60 * 1000);
            } finally {
                isHandlingTimezone = false;
            }
        };

        // setMonth
        Date.prototype.setMonth = function (this: Date, month: number, date?: number): number {
            if (isHandlingTimezone || !isEnabled()) {
                return originalSetMonth.call(this, month, date!);
            }

            isHandlingTimezone = true;
            try {
                const adjusted = adjustDateForSpoofedTimezone(this);
                if (date !== undefined) {
                    adjusted.setUTCMonth(month, date);
                } else {
                    adjusted.setUTCMonth(month);
                }

                const spoofedOffset = getTargetOffset();
                return this.setTime(adjusted.getTime() + spoofedOffset * 60 * 1000);
            } finally {
                isHandlingTimezone = false;
            }
        };

        // setFullYear
        Date.prototype.setFullYear = function (this: Date, year: number, month?: number, date?: number): number {
            if (isHandlingTimezone || !isEnabled()) {
                return originalSetFullYear.call(this, year, month!, date!);
            }

            isHandlingTimezone = true;
            try {
                const adjusted = adjustDateForSpoofedTimezone(this);
                if (month !== undefined && date !== undefined) {
                    adjusted.setUTCFullYear(year, month, date);
                } else if (month !== undefined) {
                    adjusted.setUTCFullYear(year, month);
                } else {
                    adjusted.setUTCFullYear(year);
                }

                const spoofedOffset = getTargetOffset();
                return this.setTime(adjusted.getTime() + spoofedOffset * 60 * 1000);
            } finally {
                isHandlingTimezone = false;
            }
        };


        // Make all overridden methods look native
        makeNative(Date.prototype.getTimezoneOffset, 'getTimezoneOffset');
        makeNative(Date.prototype.toString, 'toString');
        makeNative(Date.prototype.toTimeString, 'toTimeString');
        makeNative(Date.prototype.toDateString, 'toDateString');
        makeNative(Date.prototype.toLocaleString, 'toLocaleString');
        makeNative(Date.prototype.toLocaleDateString, 'toLocaleDateString');
        makeNative(Date.prototype.toLocaleTimeString, 'toLocaleTimeString');
        makeNative(Date.prototype.getHours, 'getHours');
        makeNative(Date.prototype.getMinutes, 'getMinutes');
        makeNative(Date.prototype.getSeconds, 'getSeconds');
        makeNative(Date.prototype.getMilliseconds, 'getMilliseconds');
        makeNative(Date.prototype.getDate, 'getDate');
        makeNative(Date.prototype.getDay, 'getDay');
        makeNative(Date.prototype.getMonth, 'getMonth');
        makeNative(Date.prototype.getFullYear, 'getFullYear');
        makeNative((Date.prototype as any).getYear, 'getYear');
        makeNative(Date.prototype.setHours, 'setHours');
        makeNative(Date.prototype.setMinutes, 'setMinutes');
        makeNative(Date.prototype.setSeconds, 'setSeconds');
        makeNative(Date.prototype.setMilliseconds, 'setMilliseconds');
        makeNative(Date.prototype.setDate, 'setDate');
        makeNative(Date.prototype.setMonth, 'setMonth');
        makeNative(Date.prototype.setFullYear, 'setFullYear');

    } catch (e) {
        log.warn('Failed to initialize Date prototype spoofing', { error: String(e) });
    }

    // ===================================
    // 3. Override Intl.DateTimeFormat
    // ===================================
    try {
        const SpoofedDateTimeFormat = function (this: any, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
            if (isHandlingTimezone || !isEnabled()) {
                return new OriginalIntlDateTimeFormat(locales, options);
            }

            // Inject the spoofed timezone with filtered options to prevent "Invalid option" errors
            const opts: Intl.DateTimeFormatOptions = {
                ...filterValidDateTimeFormatOptions(options),
                timeZone: getTargetTimezone()
            };

            logSpoofAccess('timezone', 'Intl.DateTimeFormat', getTargetTimezone());
            return new OriginalIntlDateTimeFormat(locales, opts);
        } as any;

        SpoofedDateTimeFormat.supportedLocalesOf = OriginalIntlDateTimeFormat.supportedLocalesOf.bind(OriginalIntlDateTimeFormat);
        SpoofedDateTimeFormat.prototype = OriginalIntlDateTimeFormat.prototype;

        // Override resolvedOptions to report spoofed timezone
        const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
        Intl.DateTimeFormat.prototype.resolvedOptions = function (): Intl.ResolvedDateTimeFormatOptions {
            if (isHandlingTimezone || !isEnabled()) {
                return originalResolvedOptions.call(this);
            }

            isHandlingTimezone = true;
            try {
                const options = originalResolvedOptions.call(this);
                logSpoofAccess('timezone', 'Intl.resolvedOptions', getTargetTimezone());
                return { ...options, timeZone: getTargetTimezone() };
            } finally {
                isHandlingTimezone = false;
            }
        };

        (Intl as any).DateTimeFormat = SpoofedDateTimeFormat;

        // Make Intl.DateTimeFormat look native
        makeNative(SpoofedDateTimeFormat, 'DateTimeFormat');
        makeNative(Intl.DateTimeFormat.prototype.resolvedOptions, 'resolvedOptions');

    } catch (e) {
        log.warn('Failed to initialize Intl timezone spoofing', { error: String(e) });
    }

    log.init('Timezone spoofing initialized with Date constructor interception');
}
