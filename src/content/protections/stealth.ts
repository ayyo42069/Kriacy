// Stealth protection - Makes spoofed APIs undetectable
// Handles: hasIframeProxy, hasHighChromeIndex, hasBadChromeRuntime, hasToStringProxy, hasBadWebGL
// 
// CreepJS Detection Methods (from lies/index.ts):
// - 'failed toString': Function.prototype.toString must return native format
// - 'failed descriptor': No 'arguments', 'caller', 'prototype', 'toString' descriptors
// - 'failed own property': hasOwnProperty for above must be false
// - 'failed descriptor keys': Object.keys(descriptors) must equal ['length','name']
// - 'failed own property names': Object.getOwnPropertyNames must equal ['length','name']
// - 'failed own keys names': Reflect.ownKeys must equal ['length','name']

const w = window as any;

// Prevent double initialization
if (w.__KRIACY_STEALTH_INIT__) {
    // Already initialized - just export functions
} else {
    w.__KRIACY_STEALTH_INIT__ = true;
}

/**
 * Store original Function.prototype.toString before any modifications
 */
const originalFunctionToString = w.__KRIACY_ORIGINAL_TOSTRING__ || Function.prototype.toString;
if (!w.__KRIACY_ORIGINAL_TOSTRING__) {
    w.__KRIACY_ORIGINAL_TOSTRING__ = originalFunctionToString;
}

/**
 * WeakMap to store native string representations for spoofed functions
 */
const nativeFunctionMap: WeakMap<Function, string> = w.__KRIACY_NATIVE_MAP__ || new WeakMap();
if (!w.__KRIACY_NATIVE_MAP__) {
    w.__KRIACY_NATIVE_MAP__ = nativeFunctionMap;
}

/**
 * Get the native string representation for a function name
 * Supports both regular functions and getter functions
 */
function getNativeString(name: string): string {
    return `function ${name}() { [native code] }`;
}

/**
 * Get the native string representation for a getter function
 * CreepJS checks that getters return "function get propName() { [native code] }"
 */
function getNativeGetterString(propName: string): string {
    return `function get ${propName}() { [native code] }`;
}

/**
 * Validate that a function appears native (no Proxy detection)
 * Used for testing/debugging
 */
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

/**
 * Make a function appear completely native:
 * 1. Patch toString to return native code
 * 2. Remove prototype property
 * 3. Ensure only 'length' and 'name' as own properties
 */
export function makeNative(fn: Function, name: string): void {
    try {
        const nativeStr = getNativeString(name);
        nativeFunctionMap.set(fn, nativeStr);

        // Delete prototype property - native methods don't have it
        if (fn.hasOwnProperty('prototype')) {
            delete (fn as any).prototype;
        }

        // Ensure proper length and name (non-configurable for real native look)
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

        // Remove any extra own properties that would reveal tampering
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
    // 1. Patch toString FIRST - this is critical
    initToStringProtection();

    // 2. Protect against iframe proxy detection
    initIframeProxyProtection();

    // 3. Protect chrome object
    initChromeStealthProtection();
}

/**
 * Call this after all protections have been initialized
 * to make all the patched methods look native
 */
export function finalizeWebGLStealth(): void {
    initWebGLStealthProtection();
    initCanvasStealthProtection();
    initNavigatorStealthProtection();
    initScreenStealthProtection();
    initDateStealthProtection();
    initIntlStealthProtection();
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
