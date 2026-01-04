import { createLogger } from '../../utils/system-logger';

const log = createLogger('Stealth');
const w = window as any;

if (!w.__KRIACY_STEALTH_INIT__) {
    w.__KRIACY_STEALTH_INIT__ = true;
}


const originalFunctionToString = w.__KRIACY_ORIGINAL_TOSTRING__ || Function.prototype.toString;
if (!w.__KRIACY_ORIGINAL_TOSTRING__) {
    w.__KRIACY_ORIGINAL_TOSTRING__ = originalFunctionToString;
}


const nativeFunctionMap: WeakMap<Function, string> = w.__KRIACY_NATIVE_MAP__ || new WeakMap();
if (!w.__KRIACY_NATIVE_MAP__) {
    w.__KRIACY_NATIVE_MAP__ = nativeFunctionMap;
}

function getNativeString(name: string): string {
    return `function ${name}() { [native code] }`;
}

function getNativeGetterString(propName: string): string {
    return `function get ${propName}() { [native code] }`;
}

export function validateNativeFunction(fn: Function): boolean {
    try {
        // Check descriptor keys - must be exactly 'length,name'
        const keys = Object.getOwnPropertyNames(fn).sort().toString();
        if (keys !== 'length,name') return false;

        // Check Reflect.ownKeys
        const reflectKeys = Reflect.ownKeys(fn).map(k => k.toString()).sort().toString();
        if (reflectKeys !== 'length,name') return false;

        // Check no forbidden properties
        if (fn.hasOwnProperty('prototype')) return false;
        if (fn.hasOwnProperty('arguments')) return false;
        if (fn.hasOwnProperty('caller')) return false;

        return true;
    } catch (e) {
        return false;
    }
}

export function makeNative(fn: Function, name: string): void {
    try {
        const nativeStr = getNativeString(name);
        nativeFunctionMap.set(fn, nativeStr);

        if (fn.hasOwnProperty('prototype')) {
            delete (fn as any).prototype;
        }

        try {
            Object.defineProperty(fn, 'length', {
                value: (fn as any).length || 0,
                writable: false,
                enumerable: false,
                configurable: true
            });
        } catch (e) { }

        try {
            Object.defineProperty(fn, 'name', {
                value: name,
                writable: false,
                enumerable: false,
                configurable: true
            });
        } catch (e) { }

        const ownProps = Object.getOwnPropertyNames(fn);
        for (const prop of ownProps) {
            if (prop !== 'length' && prop !== 'name') {
                try {
                    delete (fn as any)[prop];
                } catch (e) { }
            }
        }
    } catch (e) { }
}

/**
 * Make a getter function appear completely native
 * Getters have a different toString format: "function get propName() { [native code] }"
 */
export function makeNativeGetter(fn: Function, propName: string): void {
    try {
        const nativeStr = getNativeGetterString(propName);
        nativeFunctionMap.set(fn, nativeStr);

        // Delete prototype property - native getters don't have it
        if (fn.hasOwnProperty('prototype')) {
            delete (fn as any).prototype;
        }

        // Set proper name for getter (should be "get propName")
        try {
            Object.defineProperty(fn, 'name', {
                value: `get ${propName}`,
                writable: false,
                enumerable: false,
                configurable: true
            });
        } catch (e) { }

        // Ensure proper length (getters typically have 0 arguments)
        try {
            Object.defineProperty(fn, 'length', {
                value: 0,
                writable: false,
                enumerable: false,
                configurable: true
            });
        } catch (e) { }

        // Remove any extra own properties
        const ownProps = Object.getOwnPropertyNames(fn);
        for (const prop of ownProps) {
            if (prop !== 'length' && prop !== 'name') {
                try {
                    delete (fn as any)[prop];
                } catch (e) { }
            }
        }
    } catch (e) {
        // Silently fail
    }
}


/**
 * Proxy handler that forwards all operations to the original but with stealth
 */
function createStealthProxy(originalFn: Function, name: string, handler: (this: any, ...args: any[]) => any): Function {
    // We need to create a true function (not arrow) to have proper 'this' binding
    // and avoid the prototype issue
    const wrapped = function (this: any, ...args: any[]) {
        return handler.apply(this, args);
    };

    // Make it look native
    makeNative(wrapped, name);

    return wrapped;
}

/**
 * Patch Function.prototype.toString to return native-looking strings
 * This must be called FIRST before any other protections
 */
export function initToStringProtection(): void {
    // Avoid double patching
    if (w.__KRIACY_TOSTRING_PATCHED__) return;
    w.__KRIACY_TOSTRING_PATCHED__ = true;

    const patchedToString = function (this: Function): string {
        // Check our WeakMap for registered native strings
        const registered = nativeFunctionMap.get(this);
        if (registered) {
            return registered;
        }

        // Fall back to original toString
        return originalFunctionToString.call(this);
    };

    // Replace toString on prototype
    Function.prototype.toString = patchedToString;

    // Make toString itself look native
    makeNative(Function.prototype.toString, 'toString');
    log.init('toString protection initialized');

    // Also patch the toString's toString (yes, really - detection scripts check this)
    const toStringToString = function (): string {
        return getNativeString('toString');
    };
    (Function.prototype.toString as any).toString = toStringToString;
    makeNative(toStringToString, 'toString');
}

/**
 * Protect WebGL methods - make them appear as native functions
 * Called AFTER WebGL protection has patched the methods
 */
export function initWebGLStealthProtection(): void {
    // WebGL1
    if (typeof WebGLRenderingContext !== 'undefined') {
        const proto = WebGLRenderingContext.prototype;
        if (proto.getParameter) makeNative(proto.getParameter, 'getParameter');
        if (proto.getExtension) makeNative(proto.getExtension, 'getExtension');
        if (proto.getSupportedExtensions) makeNative(proto.getSupportedExtensions, 'getSupportedExtensions');
        if (proto.getShaderPrecisionFormat) makeNative(proto.getShaderPrecisionFormat, 'getShaderPrecisionFormat');
        if ((proto as any).readPixels) makeNative((proto as any).readPixels, 'readPixels');
        if ((proto as any).bufferData) makeNative((proto as any).bufferData, 'bufferData');
    }

    // WebGL2
    if (typeof WebGL2RenderingContext !== 'undefined') {
        const proto = WebGL2RenderingContext.prototype;
        if (proto.getParameter) makeNative(proto.getParameter, 'getParameter');
        if (proto.getExtension) makeNative(proto.getExtension, 'getExtension');
        if (proto.getSupportedExtensions) makeNative(proto.getSupportedExtensions, 'getSupportedExtensions');
        if (proto.getShaderPrecisionFormat) makeNative(proto.getShaderPrecisionFormat, 'getShaderPrecisionFormat');
        if ((proto as any).readPixels) makeNative((proto as any).readPixels, 'readPixels');
        if ((proto as any).bufferData) makeNative((proto as any).bufferData, 'bufferData');
    }
}

/**
 * Protect Canvas methods
 */
export function initCanvasStealthProtection(): void {
    if (typeof HTMLCanvasElement !== 'undefined') {
        const proto = HTMLCanvasElement.prototype;
        if (proto.getContext) makeNative(proto.getContext, 'getContext');
        if (proto.toDataURL) makeNative(proto.toDataURL, 'toDataURL');
        if (proto.toBlob) makeNative(proto.toBlob, 'toBlob');
    }

    if (typeof CanvasRenderingContext2D !== 'undefined') {
        const proto = CanvasRenderingContext2D.prototype;
        if (proto.getImageData) makeNative(proto.getImageData, 'getImageData');
    }

    if (typeof OffscreenCanvas !== 'undefined') {
        const proto = OffscreenCanvas.prototype;
        if (proto.getContext) makeNative(proto.getContext, 'getContext');
        if ((proto as any).convertToBlob) makeNative((proto as any).convertToBlob, 'convertToBlob');
    }
}

/**
 * Protect Navigator getters
 */
export function initNavigatorStealthProtection(): void {
    // Navigator getters are typically patched as property descriptors
    // We need to make them look native too
    const navigatorProps = [
        'userAgent', 'platform', 'language', 'languages', 'hardwareConcurrency',
        'deviceMemory', 'maxTouchPoints', 'vendor', 'appVersion', 'appName',
        'appCodeName', 'product', 'productSub', 'vendorSub', 'plugins', 'mimeTypes',
        'webdriver', 'connection', 'getBattery', 'getGamepads', 'sendBeacon'
    ];

    navigatorProps.forEach(prop => {
        try {
            const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, prop);
            if (desc && desc.get) {
                makeNativeGetter(desc.get, prop);
            }
            if (desc && typeof desc.value === 'function') {
                makeNative(desc.value, prop);
            }
        } catch (e) { }
    });
}

/**
 * Protect Screen getters
 */
export function initScreenStealthProtection(): void {
    const screenProps = [
        'width', 'height', 'availWidth', 'availHeight', 'colorDepth',
        'pixelDepth', 'availLeft', 'availTop'
    ];

    screenProps.forEach(prop => {
        try {
            const desc = Object.getOwnPropertyDescriptor(Screen.prototype, prop);
            if (desc && desc.get) {
                makeNativeGetter(desc.get, prop);
            }
        } catch (e) { }
    });
}

/**
 * Protect Date methods for timezone spoofing
 */
export function initDateStealthProtection(): void {
    const dateMethods = [
        'getTimezoneOffset', 'toString', 'toDateString', 'toTimeString',
        'toLocaleDateString', 'toLocaleString', 'toLocaleTimeString',
        'getDate', 'getDay', 'getFullYear', 'getHours', 'getMinutes',
        'getMonth', 'getSeconds', 'getMilliseconds', 'getTime', 'valueOf',
        'toJSON', 'setDate', 'setFullYear', 'setHours', 'setMilliseconds',
        'setMonth', 'setSeconds', 'setTime'
    ];

    dateMethods.forEach(method => {
        try {
            if (typeof (Date.prototype as any)[method] === 'function') {
                makeNative((Date.prototype as any)[method], method);
            }
        } catch (e) { }
    });
}

/**
 * Protect Intl methods for timezone/locale spoofing
 */
export function initIntlStealthProtection(): void {
    try {
        if (typeof Intl !== 'undefined') {
            if (Intl.DateTimeFormat && Intl.DateTimeFormat.prototype) {
                const proto = Intl.DateTimeFormat.prototype;
                if (proto.resolvedOptions) makeNative(proto.resolvedOptions, 'resolvedOptions');
                if (proto.format) makeNative(proto.format, 'format');
                if ((proto as any).formatRange) makeNative((proto as any).formatRange, 'formatRange');
                if ((proto as any).formatToParts) makeNative((proto as any).formatToParts, 'formatToParts');
            }
        }
    } catch (e) { }
}

/**
 * Chrome object stealth - prevent extension detection
 */
export function initChromeStealthProtection(): void {
    if (typeof chrome === 'undefined') return;

    try {
        // Hide extension-specific properties
        const extensionProps = ['app', 'csi', 'loadTimes'];
        extensionProps.forEach(prop => {
            if ((chrome as any)[prop]) {
                try {
                    Object.defineProperty(chrome, prop, {
                        value: (chrome as any)[prop],
                        enumerable: false,
                        configurable: true
                    });
                } catch (e) { }
            }
        });

        // Make chrome.runtime.id undefined for page context
        if (chrome.runtime && chrome.runtime.id) {
            try {
                Object.defineProperty(chrome.runtime, 'id', {
                    get: () => undefined,
                    configurable: true,
                    enumerable: true
                });
            } catch (e) { }
        }
    } catch (e) { }
}

/**
 * Iframe proxy protection
 */
export function initIframeProxyProtection(): void {
    try {
        // Ensure window/document toString are correct
        if (window.toString() !== '[object Window]') {
            Object.defineProperty(window, 'toString', {
                value: function () { return '[object Window]'; },
                enumerable: false,
                configurable: true,
                writable: true
            });
        }
    } catch (e) { }
}

/**
 * Initialize all stealth protections
 * This should be called BEFORE any other protections
 */
export function initStealthProtections(): void {
    log.init('Initializing stealth protections');

    // 1. Patch toString FIRST - this is critical
    initToStringProtection();

    // 2. Protect against iframe proxy detection
    initIframeProxyProtection();

    // 3. Protect chrome object
    initChromeStealthProtection();
}

/**
 * Protect Keyboard API methods - make them appear as native functions
 */
export function initKeyboardStealthProtection(): void {
    // navigator.keyboard methods
    if ('keyboard' in navigator) {
        const keyboard = (navigator as any).keyboard;
        if (keyboard?.getLayoutMap) makeNative(keyboard.getLayoutMap, 'getLayoutMap');
        if (keyboard?.lock) makeNative(keyboard.lock, 'lock');
        if (keyboard?.unlock) makeNative(keyboard.unlock, 'unlock');
    }

    // KeyboardEvent prototype methods and getters
    if (typeof KeyboardEvent !== 'undefined') {
        const proto = KeyboardEvent.prototype;

        // Make getModifierState look native
        if (proto.getModifierState) makeNative(proto.getModifierState, 'getModifierState');

        // Make key and code getters look native
        const keyDescriptor = Object.getOwnPropertyDescriptor(proto, 'key');
        if (keyDescriptor && keyDescriptor.get) {
            makeNativeGetter(keyDescriptor.get, 'key');
        }

        const codeDescriptor = Object.getOwnPropertyDescriptor(proto, 'code');
        if (codeDescriptor && codeDescriptor.get) {
            makeNativeGetter(codeDescriptor.get, 'code');
        }
    }
}

/**
 * Call this after all protections have been initialized
 * to make all the patched methods look native
 */
export function finalizeWebGLStealth(): void {
    log.init('Finalizing WebGL stealth protections');
    initWebGLStealthProtection();
    initCanvasStealthProtection();
    initNavigatorStealthProtection();
    initScreenStealthProtection();
    initDateStealthProtection();
    initIntlStealthProtection();
    initKeyboardStealthProtection();
}

/**
 * Utility function: Patch a method while preserving native appearance
 */
export function patchMethod(
    prototype: any,
    methodName: string,
    patchFn: (original: Function) => Function
): void {
    const original = prototype[methodName];
    if (!original) return;

    const patched = patchFn(original);
    prototype[methodName] = patched;
    makeNative(patched, methodName);
}

/**
 * Utility function: Patch a getter while preserving native appearance
 */
export function patchGetter(
    prototype: any,
    propName: string,
    patchFn: (originalGetter: () => any) => () => any
): void {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propName);
    if (!descriptor || !descriptor.get) return;

    const patchedGetter = patchFn(descriptor.get);

    Object.defineProperty(prototype, propName, {
        ...descriptor,
        get: patchedGetter
    });

    makeNative(patchedGetter, `get ${propName}`);
}

// =============================================================================
// MODULE-LEVEL EXECUTION
// This runs IMMEDIATELY when the module is imported, BEFORE any other modules
// =============================================================================

// Apply toString protection at module load time
// This is critical because other modules (like webgl.ts) also run code at module load time
if (!w.__KRIACY_TOSTRING_PATCHED__) {
    w.__KRIACY_TOSTRING_PATCHED__ = true;

    const patchedToString = function (this: Function): string {
        const registered = nativeFunctionMap.get(this);
        if (registered) {
            return registered;
        }
        return originalFunctionToString.call(this);
    };

    Function.prototype.toString = patchedToString;

    // Make toString look native
    nativeFunctionMap.set(Function.prototype.toString, getNativeString('toString'));

    // Delete prototype if it exists
    if (patchedToString.hasOwnProperty('prototype')) {
        delete (patchedToString as any).prototype;
    }
}
