import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32, hashString } from '../core/utils';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('Misc');

export function initPerformanceProtection(): void {
    const originalPerformanceNow = performance.now.bind(performance);
    performance.now = function (): number {
        if (settings.misc?.performance) {
            // Reduce precision to prevent timing attacks (round to 100µs)
            const now = originalPerformanceNow();
            return Math.round(now * 10) / 10;
        }
        return originalPerformanceNow();
    };

    // Override performance.timeOrigin with slight noise
    try {
        const originalTimeOrigin = performance.timeOrigin;
        Object.defineProperty(performance, 'timeOrigin', {
            get: function () {
                if (settings.misc?.performance) {
                    const noise = (getFingerprintSeed() % 1000) - 500; // ±500ms
                    return originalTimeOrigin + noise;
                }
                return originalTimeOrigin;
            },
            configurable: true
        });
    } catch (e) { }

    // Override performance.getEntries to hide some fingerprinting entries
    if (performance.getEntries) {
        const originalGetEntries = performance.getEntries.bind(performance);
        performance.getEntries = function (): PerformanceEntryList {
            if (settings.misc?.performance) {
                const entries = originalGetEntries();
                // Filter out resource timing entries that could leak info
                return entries.filter(e =>
                    e.entryType !== 'resource' ||
                    !e.name.includes('chrome-extension')
                );
            }
            return originalGetEntries();
        };
    }
}

export function initBluetoothBlocking(): void {
    if ('bluetooth' in navigator) {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'bluetooth');
            const originalGetter = descriptor?.get;
            // Capture original value BEFORE we override, to avoid recursion
            const originalBluetooth = originalGetter ? originalGetter.call(navigator) : undefined;

            Object.defineProperty(navigator, 'bluetooth', {
                get: function () {
                    if (settings.misc?.bluetooth) {
                        return {
                            getAvailability: async () => false,
                            requestDevice: async () => {
                                throw new DOMException('User cancelled the requestDevice() chooser.', 'NotFoundError');
                            },
                            getDevices: async () => [],
                            addEventListener: () => { },
                            removeEventListener: () => { },
                            dispatchEvent: () => true
                        };
                    }
                    return originalBluetooth;
                },
                configurable: true
            });
        } catch (e) { }
    }
}

export function initGamepadSpoofing(): void {
    if ('getGamepads' in navigator) {
        const originalGetGamepads = navigator.getGamepads.bind(navigator);
        navigator.getGamepads = function (): (Gamepad | null)[] {
            if (settings.misc?.gamepad) {
                // Return empty to hide gamepad fingerprint
                return [null, null, null, null];
            }
            return originalGetGamepads();
        };
    }
}

const US_QWERTY_LAYOUT: Record<string, { normal: string; shift?: string; altGr?: string }> = {
    // Letter keys
    'KeyA': { normal: 'a', shift: 'A' },
    'KeyB': { normal: 'b', shift: 'B' },
    'KeyC': { normal: 'c', shift: 'C' },
    'KeyD': { normal: 'd', shift: 'D' },
    'KeyE': { normal: 'e', shift: 'E' },
    'KeyF': { normal: 'f', shift: 'F' },
    'KeyG': { normal: 'g', shift: 'G' },
    'KeyH': { normal: 'h', shift: 'H' },
    'KeyI': { normal: 'i', shift: 'I' },
    'KeyJ': { normal: 'j', shift: 'J' },
    'KeyK': { normal: 'k', shift: 'K' },
    'KeyL': { normal: 'l', shift: 'L' },
    'KeyM': { normal: 'm', shift: 'M' },
    'KeyN': { normal: 'n', shift: 'N' },
    'KeyO': { normal: 'o', shift: 'O' },
    'KeyP': { normal: 'p', shift: 'P' },
    'KeyQ': { normal: 'q', shift: 'Q' },
    'KeyR': { normal: 'r', shift: 'R' },
    'KeyS': { normal: 's', shift: 'S' },
    'KeyT': { normal: 't', shift: 'T' },
    'KeyU': { normal: 'u', shift: 'U' },
    'KeyV': { normal: 'v', shift: 'V' },
    'KeyW': { normal: 'w', shift: 'W' },
    'KeyX': { normal: 'x', shift: 'X' },
    'KeyY': { normal: 'y', shift: 'Y' },
    'KeyZ': { normal: 'z', shift: 'Z' },
    // Digit keys
    'Digit0': { normal: '0', shift: ')' },
    'Digit1': { normal: '1', shift: '!' },
    'Digit2': { normal: '2', shift: '@' },
    'Digit3': { normal: '3', shift: '#' },
    'Digit4': { normal: '4', shift: '$' },
    'Digit5': { normal: '5', shift: '%' },
    'Digit6': { normal: '6', shift: '^' },
    'Digit7': { normal: '7', shift: '&' },
    'Digit8': { normal: '8', shift: '*' },
    'Digit9': { normal: '9', shift: '(' },
    // Symbol keys
    'Backquote': { normal: '`', shift: '~' },
    'Minus': { normal: '-', shift: '_' },
    'Equal': { normal: '=', shift: '+' },
    'BracketLeft': { normal: '[', shift: '{' },
    'BracketRight': { normal: ']', shift: '}' },
    'Backslash': { normal: '\\', shift: '|' },
    'Semicolon': { normal: ';', shift: ':' },
    'Quote': { normal: "'", shift: '"' },
    'Comma': { normal: ',', shift: '<' },
    'Period': { normal: '.', shift: '>' },
    'Slash': { normal: '/', shift: '?' },
    // Special keys
    'Space': { normal: ' ' },
    'Enter': { normal: 'Enter' },
    'Tab': { normal: 'Tab' },
    'Backspace': { normal: 'Backspace' },
    'Escape': { normal: 'Escape' },
    'Delete': { normal: 'Delete' },
    'ArrowUp': { normal: 'ArrowUp' },
    'ArrowDown': { normal: 'ArrowDown' },
    'ArrowLeft': { normal: 'ArrowLeft' },
    'ArrowRight': { normal: 'ArrowRight' },
    'Home': { normal: 'Home' },
    'End': { normal: 'End' },
    'PageUp': { normal: 'PageUp' },
    'PageDown': { normal: 'PageDown' },
    'Insert': { normal: 'Insert' },
    // Function keys
    'F1': { normal: 'F1' }, 'F2': { normal: 'F2' }, 'F3': { normal: 'F3' },
    'F4': { normal: 'F4' }, 'F5': { normal: 'F5' }, 'F6': { normal: 'F6' },
    'F7': { normal: 'F7' }, 'F8': { normal: 'F8' }, 'F9': { normal: 'F9' },
    'F10': { normal: 'F10' }, 'F11': { normal: 'F11' }, 'F12': { normal: 'F12' },
    // Modifier keys (key value = key name)
    'ShiftLeft': { normal: 'Shift' }, 'ShiftRight': { normal: 'Shift' },
    'ControlLeft': { normal: 'Control' }, 'ControlRight': { normal: 'Control' },
    'AltLeft': { normal: 'Alt' }, 'AltRight': { normal: 'Alt' },
    'MetaLeft': { normal: 'Meta' }, 'MetaRight': { normal: 'Meta' },
    'CapsLock': { normal: 'CapsLock' },
    // Numpad
    'Numpad0': { normal: '0' }, 'Numpad1': { normal: '1' }, 'Numpad2': { normal: '2' },
    'Numpad3': { normal: '3' }, 'Numpad4': { normal: '4' }, 'Numpad5': { normal: '5' },
    'Numpad6': { normal: '6' }, 'Numpad7': { normal: '7' }, 'Numpad8': { normal: '8' },
    'Numpad9': { normal: '9' },
    'NumpadAdd': { normal: '+' }, 'NumpadSubtract': { normal: '-' },
    'NumpadMultiply': { normal: '*' }, 'NumpadDivide': { normal: '/' },
    'NumpadDecimal': { normal: '.' }, 'NumpadEnter': { normal: 'Enter' },
};

function getExpectedKeyForCode(code: string, shiftKey: boolean, altKey: boolean): string | null {
    const mapping = US_QWERTY_LAYOUT[code];
    if (!mapping) return null;

    if (shiftKey && mapping.shift) {
        return mapping.shift;
    }
    if (altKey && mapping.altGr) {
        return mapping.altGr;
    }
    return mapping.normal;
}

export function initKeyboardSpoofing(): void {
    // ========================================
    // 1. Spoof navigator.keyboard.getLayoutMap()
    // ========================================
    if ('keyboard' in navigator && (navigator as any).keyboard?.getLayoutMap) {
        const originalGetLayoutMap = (navigator as any).keyboard.getLayoutMap.bind((navigator as any).keyboard);

        (navigator as any).keyboard.getLayoutMap = async function (): Promise<any> {
            if (settings.misc?.keyboard) {
                log.protection('Spoofed keyboard.getLayoutMap() to US QWERTY');

                // Build standard layout map from our definition
                const layoutEntries: [string, string][] = [];
                for (const [code, mapping] of Object.entries(US_QWERTY_LAYOUT)) {
                    // Only include printable characters
                    if (mapping.normal.length === 1 || code.startsWith('Key') || code.startsWith('Digit')) {
                        layoutEntries.push([code, mapping.normal]);
                    }
                }

                const standardLayout = new Map(layoutEntries);

                // Create a KeyboardLayoutMap-like object that passes typical checks
                // Real KeyboardLayoutMap is not constructable, so we create a compatible interface
                const layoutMapProxy = {
                    entries: function* () { yield* standardLayout.entries(); },
                    keys: function* () { yield* standardLayout.keys(); },
                    values: function* () { yield* standardLayout.values(); },
                    get: (key: string) => standardLayout.get(key),
                    has: (key: string) => standardLayout.has(key),
                    forEach: (callback: (value: string, key: string, map: Map<string, string>) => void) =>
                        standardLayout.forEach(callback),
                    get size() { return standardLayout.size; },
                    [Symbol.iterator]: function* () { yield* standardLayout[Symbol.iterator](); },
                    [Symbol.toStringTag]: 'KeyboardLayoutMap'
                };

                // Make toString return proper format
                Object.defineProperty(layoutMapProxy, 'toString', {
                    value: function () { return '[object KeyboardLayoutMap]'; },
                    enumerable: false,
                    configurable: true
                });

                return layoutMapProxy;
            }
            return originalGetLayoutMap();
        };

        // Also spoof lock() and unlock() for consistency
        if ((navigator as any).keyboard.lock) {
            const originalLock = (navigator as any).keyboard.lock.bind((navigator as any).keyboard);
            (navigator as any).keyboard.lock = async function (keyCodes?: string[]): Promise<void> {
                if (settings.misc?.keyboard) {
                    log.protection('Spoofed keyboard.lock()');
                    // Pretend it succeeded
                    return Promise.resolve();
                }
                return originalLock(keyCodes);
            };
        }

        if ((navigator as any).keyboard.unlock) {
            const originalUnlock = (navigator as any).keyboard.unlock.bind((navigator as any).keyboard);
            (navigator as any).keyboard.unlock = function (): void {
                if (settings.misc?.keyboard) {
                    log.protection('Spoofed keyboard.unlock()');
                    return;
                }
                return originalUnlock();
            };
        }
    }

    // ========================================
    // 2. Spoof KeyboardEvent properties during typing
    // This is crucial for preventing code/key mismatch detection
    // Note: We always install the patch but check settings at runtime
    // ========================================
    try {
        const originalKeyDescriptor = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, 'key');
        const originalCodeDescriptor = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, 'code');

        if (originalKeyDescriptor && originalKeyDescriptor.get) {
            const originalKeyGetter = originalKeyDescriptor.get;
            const originalCodeGetter = originalCodeDescriptor?.get;

            Object.defineProperty(KeyboardEvent.prototype, 'key', {
                get: function (this: KeyboardEvent) {
                    const originalKey = originalKeyGetter.call(this);

                    // Get the physical key code
                    let code = '';
                    if (originalCodeGetter) {
                        code = originalCodeGetter.call(this);
                    } else {
                        // Fallback: access code directly (may trigger our getter if we patched it)
                        code = this.code;
                    }

                    // If keyboard spoofing is enabled, normalize the key to US QWERTY
                    if (settings.misc?.keyboard && code) {
                        const expectedKey = getExpectedKeyForCode(code, this.shiftKey, this.altKey);
                        if (expectedKey && expectedKey !== originalKey) {
                            // Only spoof if the original key differs from expected
                            // This prevents detection of non-US keyboards
                            log.protection('Keyboard spoofed', { code, originalKey, spoofedKey: expectedKey });
                            return expectedKey;
                        }
                    }

                    return originalKey;
                },
                configurable: true,
                enumerable: true
            });

            log.init('KeyboardEvent.key getter patched');
        } else {
            log.warn('Could not patch KeyboardEvent.key - descriptor not found');
        }
    } catch (e) {
        log.warn('Failed to patch KeyboardEvent.key', { error: String(e) });
    }

    // Note: We don't typically need to spoof 'code' since it's already
    // hardware-based and consistent. However, we can normalize it for consistency.
    // Some detection scripts check if code matches key patterns.

    // ========================================
    // 3. Spoof getModifierState for consistency
    // ========================================
    try {
        const originalGetModifierState = KeyboardEvent.prototype.getModifierState;

        KeyboardEvent.prototype.getModifierState = function (keyArg: string): boolean {
            // Pass through most modifier states, but we can normalize if needed
            // For now, just use the original behavior
            return originalGetModifierState.call(this, keyArg);
        };
    } catch (e) {
        log.warn('Failed to patch getModifierState', { error: String(e) });
    }

    // ========================================
    // 4. Intercept keyboard events at addEventListener level
    // This wraps addEventListener to modify keyboard events before handlers receive them
    // ========================================
    if (settings.misc?.keyboard) {
        try {
            // Store a WeakMap to track spoofed key values for events
            const eventSpoofedKeys = new WeakMap<KeyboardEvent, string>();

            // Wrap addEventListener to intercept keyboard events
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function (
                type: string,
                listener: EventListenerOrEventListenerObject | null,
                options?: boolean | AddEventListenerOptions
            ) {
                // Only intercept keyboard events
                if (listener && (type === 'keydown' || type === 'keyup' || type === 'keypress')) {
                    const wrappedListener = function (this: EventTarget, event: Event) {
                        if (event instanceof KeyboardEvent && settings.misc?.keyboard) {
                            // Calculate the spoofed key value
                            const code = event.code;
                            const expectedKey = getExpectedKeyForCode(code, event.shiftKey, event.altKey);

                            if (expectedKey) {
                                // Store the spoofed key for this event
                                eventSpoofedKeys.set(event, expectedKey);
                            }
                        }

                        // Call the original listener
                        if (typeof listener === 'function') {
                            listener.call(this, event);
                        } else if (listener && 'handleEvent' in listener) {
                            listener.handleEvent(event);
                        }
                    };

                    // Call original addEventListener with wrapped listener
                    return originalAddEventListener.call(this, type, wrappedListener, options);
                }

                // For non-keyboard events, use original
                return originalAddEventListener.call(this, type, listener, options);
            };

            log.init('Keyboard event interception via addEventListener enabled');
        } catch (e) {
            log.warn('Failed to setup keyboard event interception', { error: String(e) });
        }
    }
}

/**
 * Initialize storage estimation spoofing
 */
export function initStorageSpoofing(): void {
    if (navigator.storage && navigator.storage.estimate) {
        const originalEstimate = navigator.storage.estimate.bind(navigator.storage);
        navigator.storage.estimate = async function (): Promise<StorageEstimate> {
            if (settings.misc?.storage) {
                const storageRandom = mulberry32(getFingerprintSeed() ^ 0x5704A6E);
                // Return realistic but randomized storage estimates
                const quota = Math.floor((100 + storageRandom() * 400) * 1024 * 1024 * 1024); // 100-500 GB
                const usage = Math.floor(storageRandom() * 2 * 1024 * 1024 * 1024); // 0-2 GB
                return { quota, usage };
            }
            return originalEstimate();
        };
    }
}

/**
 * Initialize history length spoofing
 */
export function initHistorySpoofing(): void {
    try {
        const descriptor = Object.getOwnPropertyDescriptor(History.prototype, 'length');
        const originalGetter = descriptor?.get;

        Object.defineProperty(history, 'length', {
            get: function () {
                if (settings.misc?.history) {
                    // Return a common value between 1-5
                    return ((getFingerprintSeed() % 5) + 1);
                }
                return originalGetter ? originalGetter.call(this) : history.length;
            },
            configurable: true
        });
    } catch (e) { }
}

/**
 * Initialize math fingerprinting protection
 */
export function initMathProtection(): void {
    const mathFunctionsToSpoof = ['sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'expm1', 'log1p'] as const;

    mathFunctionsToSpoof.forEach(funcName => {
        const originalFunc = Math[funcName] as (x: number) => number;
        if (originalFunc) {
            (Math as any)[funcName] = function (x: number): number {
                const result = originalFunc(x);
                if (settings.misc?.math && isFinite(result)) {
                    // Add imperceptible noise at the 15th decimal place
                    const noiseRandom = mulberry32(getFingerprintSeed() ^ hashString(funcName) ^ Math.floor(x * 1000));
                    const noise = (noiseRandom() - 0.5) * 1e-14;
                    return result + noise;
                }
                return result;
            };
        }
    });
}

/**
 * Initialize error stack trace sanitization
 */
export function initErrorStackProtection(): void {
    const originalErrorPrepareStackTrace = (Error as any).prepareStackTrace;
    (Error as any).prepareStackTrace = function (error: Error, stack: any[]): string {
        if (settings.misc?.errorStack) {
            // Limit stack depth and sanitize paths
            const sanitizedStack = stack.slice(0, 5).map((frame: any) => {
                try {
                    const fileName = frame.getFileName?.() || '';
                    const lineNumber = frame.getLineNumber?.() || 0;
                    const functionName = frame.getFunctionName?.() || 'anonymous';
                    // Remove full paths, just keep filename
                    const shortName = fileName.split('/').pop()?.split('\\').pop() || 'script';
                    return `    at ${functionName} (${shortName}:${lineNumber})`;
                } catch {
                    return '    at <anonymous>';
                }
            });
            return `${error.name}: ${error.message}\n${sanitizedStack.join('\n')}`;
        }
        if (originalErrorPrepareStackTrace) {
            return originalErrorPrepareStackTrace(error, stack);
        }
        return error.stack || '';
    };
}

/**
 * Initialize sendBeacon protection
 */
export function initSendBeaconProtection(): void {
    if (navigator.sendBeacon) {
        const originalSendBeacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = function (url: string, data?: BodyInit | null): boolean {
            // Just pass through but log for debugging
            if (settings.navigator?.enabled) {
                log.debug('sendBeacon intercepted', { url });
            }
            return originalSendBeacon(url, data);
        };
    }
}

/**
 * Initialize window.name fingerprinting protection
 */
export function initWindowNameProtection(): void {
    try {
        if (settings.misc?.windowName && window.name && window.name !== '') {
            // Clear window.name on new page loads to prevent tracking
            const originalWindowName = window.name;
            // Only clear if it looks like a tracking ID (long random strings)
            if (originalWindowName.length > 20 || /^[a-f0-9-]+$/i.test(originalWindowName)) {
                window.name = '';
            }
        }
    } catch (e) { }
}

/**
 * Initialize document visibility spoofing
 */
export function initVisibilitySpoofing(): void {
    try {
        const hiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
        const originalHiddenGetter = hiddenDescriptor?.get;

        Object.defineProperty(document, 'hidden', {
            get: function () {
                if (settings.misc?.visibility) {
                    return false; // Always report as visible
                }
                return originalHiddenGetter ? originalHiddenGetter.call(this) : false;
            },
            configurable: true
        });

        const visibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
        const originalVisibilityStateGetter = visibilityStateDescriptor?.get;

        Object.defineProperty(document, 'visibilityState', {
            get: function () {
                if (settings.misc?.visibility) {
                    return 'visible';
                }
                return originalVisibilityStateGetter ? originalVisibilityStateGetter.call(this) : 'visible';
            },
            configurable: true
        });
    } catch (e) { }
}

/**
 * Initialize pointer/touch event spoofing
 */
export function initPointerSpoofing(): void {
    const originalPointerEventProps = ['pressure', 'tangentialPressure', 'tiltX', 'tiltY', 'twist'];
    try {
        originalPointerEventProps.forEach(prop => {
            const descriptor = Object.getOwnPropertyDescriptor(PointerEvent.prototype, prop);
            if (descriptor && descriptor.get) {
                const originalGetter = descriptor.get;
                Object.defineProperty(PointerEvent.prototype, prop, {
                    get: function () {
                        if (settings.misc?.pointer) {
                            // Return normalized values
                            if (prop === 'pressure') return this.buttons > 0 ? 0.5 : 0;
                            return 0;
                        }
                        return originalGetter.call(this);
                    },
                    configurable: true
                });
            }
        });
    } catch (e) { }
}

/**
 * Initialize Do Not Track signal
 */
export function initDNTProtection(): void {
    try {
        const dntDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'doNotTrack');
        const originalDNTGetter = dntDescriptor?.get;

        Object.defineProperty(navigator, 'doNotTrack', {
            get: function () {
                if (settings.misc?.dnt) {
                    return '1'; // Always enable DNT
                }
                return originalDNTGetter ? originalDNTGetter.call(this) : null;
            },
            configurable: true
        });

        // Also spoof globalPrivacyControl
        // This might not be on the prototype in all browsers/extensions, so we check instance too if needed
        // But to avoid recursion, we should try to get it from prototype or just return undefined if not found
        const gpcDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'globalPrivacyControl') ||
            Object.getOwnPropertyDescriptor(navigator, 'globalPrivacyControl');
        const originalGPCGetter = gpcDescriptor?.get;
        const originalGPCValue = gpcDescriptor?.value;

        Object.defineProperty(navigator, 'globalPrivacyControl', {
            get: function () {
                if (settings.misc?.gpc) {
                    return true; // Enable GPC
                }
                if (originalGPCGetter) return originalGPCGetter.call(this);
                return originalGPCValue;
            },
            configurable: true
        });
    } catch (e) { }
}

/**
 * Initialize service worker protection
 * When blockServiceWorkers is enabled, Service Worker registration is blocked to prevent fingerprinting.
 * Note: Service Workers cannot be spoofed from a content script due to browser security restrictions.
 */
export function initServiceWorkerProtection(): void {
    if (!('serviceWorker' in navigator)) return;

    const originalServiceWorkerRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);

    navigator.serviceWorker.register = function (scriptURL: string | URL, options?: RegistrationOptions): Promise<ServiceWorkerRegistration> {
        const url = typeof scriptURL === 'string' ? scriptURL : scriptURL.toString();

        // Check if blocking is enabled
        if (settings.misc?.blockServiceWorkers) {
            log.protection('Service Worker registration BLOCKED', { url });
            // Return a rejected promise that mimics SecurityError
            return Promise.reject(new DOMException(
                'Service Worker registration blocked by privacy settings.',
                'SecurityError'
            ));
        }

        log.debug('Service Worker registration', { url });
        return originalServiceWorkerRegister(scriptURL, options);
    };
}
/**
 * Initialize Worker WebGL spoofing
 * This patches both the Blob constructor and Worker constructor to ensure
 * WebGL returns spoofed GPU values in Workers (fixes hasBadWebGL detection)
 */
export function initWorkerWebGLSpoofing(): void {
    if (!settings.webgl?.enabled) return;

    const vendor = settings.webgl?.vendor || 'Google Inc. (Intel)';
    const renderer = settings.webgl?.renderer || 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';

    // Generate the spoofing code to inject into Workers
    // This must patch WebGL in the Worker context
    const getWorkerSpoofCode = (): string => {
        return `
;(function(){
    // Spoof WebGL in Worker context (for OffscreenCanvas)
    if(typeof WebGLRenderingContext !== 'undefined') {
        var v = ${JSON.stringify(vendor)};
        var r = ${JSON.stringify(renderer)};
        var origGet = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(p) {
            if(p === 37445) return v;
            if(p === 37446) return r;
            return origGet.call(this, p);
        };
    }
    if(typeof WebGL2RenderingContext !== 'undefined') {
        var v2 = ${JSON.stringify(vendor)};
        var r2 = ${JSON.stringify(renderer)};
        var origGet2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(p) {
            if(p === 37445) return v2;
            if(p === 37446) return r2;
            return origGet2.call(this, p);
        };
    }
})();
`;
    };

    const spoofCode = getWorkerSpoofCode();

    // ========================================
    // 1. Patch Blob constructor (for inline Workers)
    // ========================================
    const originalBlob = window.Blob;

    (window as any).Blob = function (blobParts?: BlobPart[], options?: BlobPropertyBag) {
        const isJavaScript = options?.type === 'application/javascript' ||
            options?.type === 'text/javascript' ||
            options?.type?.includes('javascript');

        if (isJavaScript && blobParts && blobParts.length > 0) {
            try {
                const modifiedParts = [spoofCode, ...blobParts];
                return new originalBlob(modifiedParts, options);
            } catch (e) { }
        }

        return new originalBlob(blobParts, options);
    };

    (window as any).Blob.prototype = originalBlob.prototype;
    Object.setPrototypeOf((window as any).Blob, originalBlob);

    // ========================================
    // 2. Patch Worker constructor (for URL-based Workers)
    // ========================================
    const OriginalWorker = window.Worker;

    (window as any).Worker = function (scriptURL: string | URL, options?: WorkerOptions) {
        const url = typeof scriptURL === 'string' ? scriptURL : scriptURL.toString();

        // For data: URLs, we can't easily inject
        // For blob: URLs, they're already handled by our Blob patch
        // For http/https URLs, we need to fetch, inject, and create new blob
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
            try {
                // Fetch the worker script synchronously is not possible, so we
                // create a wrapper Worker that fetches and injects
                const wrapperCode = `
                    (async function() {
                        // Inject our spoofing code first
                        ${spoofCode}
                        
                        // Now import the original worker script
                        try {
                            importScripts('${url}');
                        } catch(e) {
                            console.error('[Kriacy Worker] Failed to import:', e);
                        }
                    })();
                `;

                const wrapperBlob = new originalBlob([wrapperCode], { type: 'application/javascript' });
                const wrapperUrl = URL.createObjectURL(wrapperBlob);

                // Create worker with wrapper
                const worker = new OriginalWorker(wrapperUrl, options);

                // Clean up blob URL after a delay
                setTimeout(() => URL.revokeObjectURL(wrapperUrl), 60000);

                return worker;
            } catch (e) {
                // Fall back to original if our interception fails
                log.warn('Worker interception failed', { error: String(e) });
                return new OriginalWorker(scriptURL, options);
            }
        }

        // For blob: or data: URLs, use original (blob is already patched)
        return new OriginalWorker(scriptURL, options);
    };

    // Copy static properties
    (window as any).Worker.prototype = OriginalWorker.prototype;
    Object.setPrototypeOf((window as any).Worker, OriginalWorker);
}

/**
 * Initialize clipboard API protection
 */
export function initClipboardProtection(): void {
    if (navigator.clipboard && navigator.clipboard.readText) {
        const originalClipboardRead = navigator.clipboard.read?.bind(navigator.clipboard);
        const originalClipboardReadText = navigator.clipboard.readText.bind(navigator.clipboard);

        if (originalClipboardRead) {
            navigator.clipboard.read = async function (): Promise<ClipboardItems> {
                if (settings.misc?.clipboard) {
                    // Require explicit user gesture
                    throw new DOMException('Document is not focused.', 'NotAllowedError');
                }
                return originalClipboardRead();
            };
        }

        navigator.clipboard.readText = async function (): Promise<string> {
            if (settings.misc?.clipboard) {
                throw new DOMException('Document is not focused.', 'NotAllowedError');
            }
            return originalClipboardReadText();
        };
    }
}

/**
 * Initialize hardware APIs blocking (Serial/USB/HID)
 */
export function initHardwareAPIBlocking(): void {
    const hardwareAPIs = ['serial', 'usb', 'hid'] as const;
    hardwareAPIs.forEach(api => {
        if (api in navigator) {
            try {
                const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, api);
                const originalGetter = descriptor?.get;
                // Capture original value BEFORE we override, to avoid recursion
                const originalValue = originalGetter ? originalGetter.call(navigator) : undefined;

                Object.defineProperty(navigator, api, {
                    get: function () {
                        if (settings.misc?.hardwareApis) {
                            return {
                                getPorts: async () => [],
                                getDevices: async () => [],
                                requestPort: async () => {
                                    throw new DOMException('No port selected by the user.', 'NotFoundError');
                                },
                                requestDevice: async () => {
                                    throw new DOMException('No device selected by the user.', 'NotFoundError');
                                },
                                addEventListener: () => { },
                                removeEventListener: () => { },
                                dispatchEvent: () => true,
                                onconnect: null,
                                ondisconnect: null
                            };
                        }
                        return originalValue;
                    },
                    configurable: true
                });
            } catch (e) { }
        }
    });
}

/**
 * Initialize presentation API blocking
 */
export function initPresentationBlocking(): void {
    if ('presentation' in navigator) {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'presentation');
            const originalGetter = descriptor?.get;
            // Capture original value BEFORE we override, to avoid recursion
            const originalPresentation = originalGetter ? originalGetter.call(navigator) : undefined;

            Object.defineProperty(navigator, 'presentation', {
                get: function () {
                    if (settings.navigator?.enabled) {
                        return {
                            defaultRequest: null,
                            receiver: null
                        };
                    }
                    return originalPresentation;
                },
                configurable: true
            });
        } catch (e) { }
    }
}

/**
 * Initialize credentials API protection
 */
export function initCredentialsProtection(): void {
    if ('credentials' in navigator && (navigator as any).credentials.get) {
        const originalCredentialsGet = (navigator as any).credentials.get.bind((navigator as any).credentials);
        (navigator as any).credentials.get = async function (options?: CredentialRequestOptions): Promise<Credential | null> {
            if (settings.misc?.credentials) {
                log.protection('Credential request intercepted');
                // Allow password credentials but block PublicKey for fingerprinting protection
                if (options?.publicKey) {
                    throw new DOMException('The operation was aborted.', 'AbortError');
                }
            }
            return originalCredentialsGet(options);
        };
    }
}

/**
 * Initialize device orientation/motion protection
 */
export function initDeviceSensorsProtection(): void {
    // Check if sensors are allowed by permissions policy
    const isFeatureAllowed = (feature: string) => {
        if ('permissionsPolicy' in document && (document as any).permissionsPolicy) {
            return (document as any).permissionsPolicy.allowsFeature(feature);
        }
        if ('featurePolicy' in document && (document as any).featurePolicy) {
            return (document as any).featurePolicy.allowsFeature(feature);
        }
        return true;
    };

    // Accelerometer and gyroscope are usually required for these events
    if (!isFeatureAllowed('accelerometer') || !isFeatureAllowed('gyroscope')) {
        return;
    }

    try {
        window.addEventListener('deviceorientation', function (e) {
            if (settings.misc?.sensors) {
                try {
                    Object.defineProperty(e, 'alpha', { value: 0, writable: false });
                    Object.defineProperty(e, 'beta', { value: 0, writable: false });
                    Object.defineProperty(e, 'gamma', { value: 0, writable: false });
                } catch { }
            }
        }, true);
    } catch (e) { }

    try {
        window.addEventListener('devicemotion', function (e) {
            if (settings.misc?.sensors) {
                try {
                    Object.defineProperty(e, 'acceleration', { value: null, writable: false });
                    Object.defineProperty(e, 'accelerationIncludingGravity', { value: null, writable: false });
                    Object.defineProperty(e, 'rotationRate', { value: null, writable: false });
                } catch { }
            }
        }, true);
    } catch (e) { }
}

/**
 * Initialize all miscellaneous protections
 */
export function initAllMiscProtections(): void {
    initPerformanceProtection();
    initBluetoothBlocking();
    initGamepadSpoofing();
    initKeyboardSpoofing();
    initStorageSpoofing();
    initHistorySpoofing();
    initMathProtection();
    initErrorStackProtection();
    initSendBeaconProtection();
    initWindowNameProtection();
    initVisibilitySpoofing();
    initPointerSpoofing();
    initDNTProtection();
    initServiceWorkerProtection();
    initWorkerWebGLSpoofing();
    initClipboardProtection();
    initHardwareAPIBlocking();
    initPresentationBlocking();
    initCredentialsProtection();
    initDeviceSensorsProtection();
}
