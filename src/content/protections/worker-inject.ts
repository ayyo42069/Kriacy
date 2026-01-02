// Worker script injection for consistent fingerprinting across main thread and Workers
// Addresses CreepJS hasBadWebGL detection by ensuring WebGL values match in Workers

const w = window as any;

// Store original constructors IMMEDIATELY at module load time
const OriginalBlob = w.Blob;
const OriginalWorker = w.Worker;
const OriginalSharedWorker = w.SharedWorker;
const OriginalURL = w.URL || w.webkitURL;

// Prevent double initialization
if (w.__KRIACY_WORKER_INJECT_INIT__) {
    // Already initialized
} else {
    w.__KRIACY_WORKER_INJECT_INIT__ = true;
}

/**
 * Get the spoofing code to inject into worker scripts
 * This code runs at the start of every Worker to ensure consistent fingerprinting
 * IMPORTANT: This generates code dynamically each time to get the latest settings
 */
function getWorkerSpoofCode(): string {
    // Get GPU profile from stored global (set by webgl.ts or at init time)
    const gpuProfile = w.__KRIACY_GPU_PROFILE__ || {};
    const navSettings = w.__KRIACY_WORKER_NAV_SETTINGS__ || {};

    // If no GPU profile set, try to get from DOM storage or use defaults
    const vendor = gpuProfile.vendor || 'Google Inc. (Intel)';
    const renderer = gpuProfile.renderer || 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';

    return `
// ========== Kriacy Worker Protection ==========
(function() {
    'use strict';
    
    // GPU profile from main thread
    var vendor = ${JSON.stringify(vendor)};
    var renderer = ${JSON.stringify(renderer)};
    var navSettings = ${JSON.stringify(navSettings)};
    
    // ===== WebGL Spoofing (CRITICAL for hasBadWebGL bypass) =====
    // Patch WebGLRenderingContext
    if (typeof WebGLRenderingContext !== 'undefined') {
        var origGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(pname) {
            try {
                var ext = this.getExtension && this.getExtension('WEBGL_debug_renderer_info');
                if (ext) {
                    // UNMASKED_VENDOR_WEBGL = 37445 = 0x9245
                    if (pname === 37445 || pname === ext.UNMASKED_VENDOR_WEBGL) {
                        return vendor;
                    }
                    // UNMASKED_RENDERER_WEBGL = 37446 = 0x9246
                    if (pname === 37446 || pname === ext.UNMASKED_RENDERER_WEBGL) {
                        return renderer;
                    }
                }
            } catch(e) {}
            return origGetParameter.call(this, pname);
        };
    }
    
    // Patch WebGL2RenderingContext
    if (typeof WebGL2RenderingContext !== 'undefined') {
        var origGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(pname) {
            try {
                var ext = this.getExtension && this.getExtension('WEBGL_debug_renderer_info');
                if (ext) {
                    if (pname === 37445 || pname === ext.UNMASKED_VENDOR_WEBGL) {
                        return vendor;
                    }
                    if (pname === 37446 || pname === ext.UNMASKED_RENDERER_WEBGL) {
                        return renderer;
                    }
                }
            } catch(e) {}
            return origGetParameter2.call(this, pname);
        };
    }
    
    // ===== Navigator Spoofing =====
    if (typeof navigator !== 'undefined' && Object.keys(navSettings).length > 0) {
        var navOverrides = {};
        
        if (navSettings.hardwareConcurrency !== undefined) {
            navOverrides.hardwareConcurrency = { 
                get: function() { return navSettings.hardwareConcurrency; },
                configurable: true
            };
        }
        if (navSettings.deviceMemory !== undefined) {
            navOverrides.deviceMemory = { 
                get: function() { return navSettings.deviceMemory; },
                configurable: true
            };
        }
        if (navSettings.platform) {
            navOverrides.platform = { 
                get: function() { return navSettings.platform; },
                configurable: true
            };
        }
        if (navSettings.userAgent) {
            navOverrides.userAgent = { 
                get: function() { return navSettings.userAgent; },
                configurable: true
            };
        }
        if (navSettings.language) {
            navOverrides.language = { 
                get: function() { return navSettings.language; },
                configurable: true
            };
        }
        if (navSettings.languages) {
            navOverrides.languages = { 
                get: function() { return navSettings.languages; },
                configurable: true
            };
        }
        
        try {
            if (Object.keys(navOverrides).length > 0) {
                Object.defineProperties(navigator, navOverrides);
            }
        } catch(e) {}
    }
})();
// ========== End Kriacy Worker Protection ==========
`;
}

/**
 * Intercept Blob creation to inject spoofing code into JavaScript blobs
 */
export function initBlobInterception(): void {
    if (!OriginalBlob) return;

    w.Blob = function (parts?: BlobPart[], options?: BlobPropertyBag): Blob {
        // Check if this is JavaScript content
        const mimeType = options?.type?.toLowerCase() || '';
        const isJavaScript = mimeType.includes('javascript') ||
            mimeType.includes('ecmascript') ||
            mimeType === 'text/javascript' ||
            mimeType === 'application/javascript' ||
            mimeType === 'application/x-javascript';

        // Only inject into explicit JavaScript blobs
        if (isJavaScript && parts && parts.length > 0) {
            // Prepend our spoofing code
            const spoofCode = getWorkerSpoofCode();
            parts = [spoofCode, '\n', ...parts];
        }

        return new OriginalBlob(parts, options);
    };

    // Preserve Blob prototype and static properties
    w.Blob.prototype = OriginalBlob.prototype;
    Object.setPrototypeOf(w.Blob, OriginalBlob);

    // Copy static methods
    for (const key of Object.getOwnPropertyNames(OriginalBlob)) {
        if (key !== 'prototype' && key !== 'length' && key !== 'name') {
            try {
                w.Blob[key] = OriginalBlob[key];
            } catch (e) { }
        }
    }
}

/**
 * Create a wrapper script that injects our code before the original script
 * For module workers, we use dynamic import instead of importScripts
 */
function createWrapperBlobUrl(originalUrl: string, isModule: boolean = false): string {
    let wrapperScript: string;

    if (isModule) {
        // Module workers: use dynamic import instead of importScripts
        wrapperScript = `
${getWorkerSpoofCode()}
import('${originalUrl}');
`;
    } else {
        // Classic workers: use importScripts
        wrapperScript = `
${getWorkerSpoofCode()}
importScripts('${originalUrl}');
`;
    }

    const blob = new OriginalBlob([wrapperScript], { type: isModule ? 'text/javascript' : 'text/javascript' });
    return OriginalURL.createObjectURL(blob);
}

/**
 * Check if blob URLs are likely blocked by CSP for workers
 * We detect this by checking the CSP meta tags or by caching previous failures
 * NOTE: CSP headers are stripped at the network level via declarativeNetRequest rules,
 * so this is primarily a fallback for meta tag-based CSP
 */
let blobWorkersBlocked = false;

function checkCSPForBlobWorkers(): boolean {
    if (blobWorkersBlocked) return true;

    try {
        // Check for CSP meta tags that might block blob workers
        // Note: HTTP header CSP is stripped by declarativeNetRequest rules
        const cspMetas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
        for (const meta of cspMetas) {
            const content = meta.getAttribute('content') || '';
            // If there's a worker-src directive that doesn't include blob:, workers might be blocked
            if (content.includes('worker-src') && !content.includes('blob:')) {
                blobWorkersBlocked = true;
                return true;
            }
        }

        // Try to detect CSP via SecurityPolicyViolationEvent (modern browsers)
        // This won't help on first load but will for subsequent navigations
    } catch (e) {
        // Ignore errors during CSP check
    }
    return false;
}

/**
 * Intercept Worker creation to inject spoofing code
 */
export function initWorkerInterception(): void {
    if (!OriginalWorker) return;

    w.Worker = function (scriptURL: string | URL, options?: WorkerOptions): Worker {
        const url = scriptURL.toString();
        const isModuleWorker = options?.type === 'module';

        // For data: URLs we can't modify, so pass through
        if (url.startsWith('data:')) {
            return new OriginalWorker(scriptURL, options);
        }

        // If blob workers are known to be blocked by CSP, skip injection entirely
        if (blobWorkersBlocked || checkCSPForBlobWorkers()) {
            return new OriginalWorker(scriptURL, options);
        }

        // For blob: URLs, they might have been created before our Blob interception
        // So we need to inject our code as well
        if (url.startsWith('blob:')) {
            try {
                // For module workers, we can't use importScripts on blob URLs
                // We need to skip injection or use a different approach
                if (isModuleWorker) {
                    // For module workers with blob URLs, pass through as we can't safely inject
                    return new OriginalWorker(scriptURL, options);
                }

                const blobUrl = createWrapperBlobUrl(url, false);
                const worker = new OriginalWorker(blobUrl, options);

                // Clean up blob URL after worker starts
                setTimeout(() => {
                    try { OriginalURL.revokeObjectURL(blobUrl); } catch (e) { }
                }, 5000);

                return worker;
            } catch (e: any) {
                // If CSP blocks blob workers, remember this for future calls
                if (e && (e.name === 'SecurityError' || e.message?.includes('Content Security Policy'))) {
                    blobWorkersBlocked = true;
                }
                // Fallback to original if our injection fails
                return new OriginalWorker(scriptURL, options);
            }
        }

        // For regular URLs, create a wrapper blob that injects our code then imports the original
        try {
            const blobUrl = createWrapperBlobUrl(url, isModuleWorker);

            // For module workers, we need to specify type: 'module' for the wrapper too
            const workerOptions = isModuleWorker
                ? { ...options, type: 'module' as WorkerType }
                : options;

            const worker = new OriginalWorker(blobUrl, workerOptions);

            // Clean up blob URL after worker starts
            setTimeout(() => {
                try { OriginalURL.revokeObjectURL(blobUrl); } catch (e) { }
            }, 5000);

            return worker;
        } catch (e: any) {
            // If CSP blocks blob workers, remember this for future calls
            if (e && (e.name === 'SecurityError' || e.message?.includes('Content Security Policy'))) {
                blobWorkersBlocked = true;
            }
            // Fallback to original if our injection fails
            return new OriginalWorker(scriptURL, options);
        }
    };

    // Preserve Worker prototype
    w.Worker.prototype = OriginalWorker.prototype;
    Object.setPrototypeOf(w.Worker, OriginalWorker);
}

/**
 * Intercept SharedWorker creation to inject spoofing code
 * CreepJS also uses SharedWorkers
 */
export function initSharedWorkerInterception(): void {
    if (!OriginalSharedWorker) return;

    w.SharedWorker = function (scriptURL: string | URL, options?: string | WorkerOptions): SharedWorker {
        const url = scriptURL.toString();

        // SharedWorker options can be a string (name) or WorkerOptions
        const workerOptions = typeof options === 'string' ? { name: options } : options;
        const isModuleWorker = (workerOptions as WorkerOptions)?.type === 'module';

        // For data: URLs we can't modify, so pass through
        if (url.startsWith('data:')) {
            return new OriginalSharedWorker(scriptURL, options);
        }

        // If blob workers are known to be blocked by CSP, skip injection entirely
        if (blobWorkersBlocked || checkCSPForBlobWorkers()) {
            return new OriginalSharedWorker(scriptURL, options);
        }

        // For blob: URLs
        if (url.startsWith('blob:')) {
            try {
                // For module workers, we can't use importScripts on blob URLs
                if (isModuleWorker) {
                    return new OriginalSharedWorker(scriptURL, options);
                }

                const blobUrl = createWrapperBlobUrl(url, false);
                const worker = new OriginalSharedWorker(blobUrl, options);

                setTimeout(() => {
                    try { OriginalURL.revokeObjectURL(blobUrl); } catch (e) { }
                }, 5000);

                return worker;
            } catch (e: any) {
                // If CSP blocks blob workers, remember this for future calls
                if (e && (e.name === 'SecurityError' || e.message?.includes('Content Security Policy'))) {
                    blobWorkersBlocked = true;
                }
                return new OriginalSharedWorker(scriptURL, options);
            }
        }

        // For regular URLs
        try {
            const blobUrl = createWrapperBlobUrl(url, isModuleWorker);

            // For module workers, we need to specify type: 'module' for the wrapper too
            const newOptions = isModuleWorker
                ? { ...(workerOptions || {}), type: 'module' as WorkerType }
                : options;

            const worker = new OriginalSharedWorker(blobUrl, newOptions);

            setTimeout(() => {
                try { OriginalURL.revokeObjectURL(blobUrl); } catch (e) { }
            }, 5000);

            return worker;
        } catch (e: any) {
            // If CSP blocks blob workers, remember this for future calls
            if (e && (e.name === 'SecurityError' || e.message?.includes('Content Security Policy'))) {
                blobWorkersBlocked = true;
            }
            return new OriginalSharedWorker(scriptURL, options);
        }
    };

    // Preserve SharedWorker prototype
    w.SharedWorker.prototype = OriginalSharedWorker.prototype;
    Object.setPrototypeOf(w.SharedWorker, OriginalSharedWorker);
}

/**
 * Store GPU profile globally so worker injection can access it
 */
export function setGPUProfile(vendor: string, renderer: string): void {
    w.__KRIACY_GPU_PROFILE__ = {
        vendor,
        renderer
    };
}

/**
 * Store navigator settings globally so worker injection can access them
 */
export function setWorkerSettings(workerSettings: {
    navigatorProtection?: boolean;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    platform?: string;
    userAgent?: string;
    language?: string;
    languages?: string[];
}): void {
    w.__KRIACY_WORKER_NAV_SETTINGS__ = {
        ...w.__KRIACY_WORKER_NAV_SETTINGS__,
        ...workerSettings
    };
}

/**
 * Initialize all worker protection
 * MUST be called AFTER stealth but BEFORE other protections
 */
export function initWorkerProtection(): void {
    if (w.__KRIACY_WORKER_PROTECTION_ACTIVE__) return;
    w.__KRIACY_WORKER_PROTECTION_ACTIVE__ = true;

    initBlobInterception();
    initWorkerInterception();
    initSharedWorkerInterception();
}

/**
 * Set GPU profile from settings - called after settings are loaded
 */
export function updateGPUProfileFromSettings(vendor: string, renderer: string): void {
    setGPUProfile(vendor, renderer);
}
