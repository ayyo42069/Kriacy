// Miscellaneous fingerprint protections

import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32, hashString } from '../core/utils';

/**
 * Initialize performance API timing protection
 */
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

/**
 * Initialize Bluetooth API blocking
 */
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

/**
 * Initialize gamepad API spoofing
 */
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

/**
 * Initialize keyboard layout fingerprinting protection
 */
export function initKeyboardSpoofing(): void {
    if ('keyboard' in navigator && (navigator as any).keyboard?.getLayoutMap) {
        const originalGetLayoutMap = (navigator as any).keyboard.getLayoutMap.bind((navigator as any).keyboard);
        (navigator as any).keyboard.getLayoutMap = async function (): Promise<any> {
            if (settings.misc?.keyboard) {
                // Return a standard US QWERTY layout
                const standardLayout = new Map([
                    ['KeyA', 'a'], ['KeyB', 'b'], ['KeyC', 'c'], ['KeyD', 'd'],
                    ['KeyE', 'e'], ['KeyF', 'f'], ['KeyG', 'g'], ['KeyH', 'h'],
                    ['KeyI', 'i'], ['KeyJ', 'j'], ['KeyK', 'k'], ['KeyL', 'l'],
                    ['KeyM', 'm'], ['KeyN', 'n'], ['KeyO', 'o'], ['KeyP', 'p'],
                    ['KeyQ', 'q'], ['KeyR', 'r'], ['KeyS', 's'], ['KeyT', 't'],
                    ['KeyU', 'u'], ['KeyV', 'v'], ['KeyW', 'w'], ['KeyX', 'x'],
                    ['KeyY', 'y'], ['KeyZ', 'z'],
                    ['Digit0', '0'], ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'],
                    ['Digit4', '4'], ['Digit5', '5'], ['Digit6', '6'], ['Digit7', '7'],
                    ['Digit8', '8'], ['Digit9', '9'],
                    ['Space', ' '], ['Enter', '\r'], ['Tab', '\t']
                ]);
                return {
                    entries: () => standardLayout.entries(),
                    keys: () => standardLayout.keys(),
                    values: () => standardLayout.values(),
                    get: (key: string) => standardLayout.get(key),
                    has: (key: string) => standardLayout.has(key),
                    forEach: (callback: Function) => standardLayout.forEach((v, k) => callback(v, k)),
                    size: standardLayout.size,
                    [Symbol.iterator]: () => standardLayout[Symbol.iterator]()
                };
            }
            return originalGetLayoutMap();
        };
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
                console.log('[Kriacy] sendBeacon intercepted:', url);
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
            console.log('[Kriacy] Service Worker registration BLOCKED:', url);
            // Return a rejected promise that mimics SecurityError
            return Promise.reject(new DOMException(
                'Service Worker registration blocked by privacy settings.',
                'SecurityError'
            ));
        }

        console.log('[Kriacy] Service Worker registration:', url);
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
                console.warn('[Kriacy] Worker interception failed:', e);
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
                console.log('[Kriacy] Credential request intercepted');
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
