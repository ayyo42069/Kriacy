import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32 } from '../core/utils';
import { setGPUProfile } from './worker-inject';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('WebGL');
const w = window as any;

if (!w.__KRIACY_WEBGL_ORIGINALS__) {
    w.__KRIACY_WEBGL_ORIGINALS__ = {
        getParameter: WebGLRenderingContext.prototype.getParameter,
        getExtension: WebGLRenderingContext.prototype.getExtension,
        getSupportedExtensions: WebGLRenderingContext.prototype.getSupportedExtensions,
        getShaderPrecisionFormat: WebGLRenderingContext.prototype.getShaderPrecisionFormat,
        getError: WebGLRenderingContext.prototype.getError,
        getParameter2: typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype.getParameter : null,
        getExtension2: typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype.getExtension : null,
        getSupportedExtensions2: typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype.getSupportedExtensions : null,
        getShaderPrecisionFormat2: typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype.getShaderPrecisionFormat : null,
        getError2: typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype.getError : null,
    };
}

const originals = w.__KRIACY_WEBGL_ORIGINALS__;
const NOISEABLE_PARAMS = [3379, 34076, 34024, 35661, 35660, 34930, 3386, 36347, 36348];


function getWebGLParamOffset(param: number): number | undefined {
    const paramIndex = NOISEABLE_PARAMS.indexOf(param);
    if (paramIndex === -1) return undefined;

    const seed = getFingerprintSeed();
    const paramRandom = mulberry32(seed ^ (0xDEADBEEF + param));
    return Math.floor(paramRandom() * 4) - 2;
}

function patchWebGLContext(prototype: any, contextName: string) {
    const originalGetParameter = prototype.getParameter;
    const originalGetExtension = prototype.getExtension;
    const originalGetSupportedExtensions = prototype.getSupportedExtensions;
    const originalGetShaderPrecisionFormat = prototype.getShaderPrecisionFormat;
    const originalGetError = prototype.getError;

    if (prototype.__KRIACY_PATCHED__) return;
    prototype.__KRIACY_PATCHED__ = true;

    const extensionDependentParams: { [key: number]: string } = {
        0x9245: 'WEBGL_debug_renderer_info', // UNMASKED_VENDOR_WEBGL
        0x9246: 'WEBGL_debug_renderer_info', // UNMASKED_RENDERER_WEBGL

        // WEBGL_draw_buffers
        0x8824: 'WEBGL_draw_buffers', // MAX_COLOR_ATTACHMENTS_WEBGL
        0x8825: 'WEBGL_draw_buffers', // MAX_DRAW_BUFFERS_WEBGL
        0x8CE0: 'WEBGL_draw_buffers', // COLOR_ATTACHMENT0_WEBGL

        // EXT_texture_filter_anisotropic
        0x84FE: 'EXT_texture_filter_anisotropic', // TEXTURE_MAX_ANISOTROPY_EXT
        0x84FF: 'EXT_texture_filter_anisotropic', // MAX_TEXTURE_MAX_ANISOTROPY_EXT

        // EXT_disjoint_timer_query / EXT_disjoint_timer_query_webgl2
        0x8866: 'EXT_disjoint_timer_query', // QUERY_COUNTER_BITS_EXT
        0x8867: 'EXT_disjoint_timer_query', // CURRENT_QUERY_EXT
        0x8868: 'EXT_disjoint_timer_query', // QUERY_RESULT_EXT
        0x8869: 'EXT_disjoint_timer_query', // QUERY_RESULT_AVAILABLE_EXT
        0x88BF: 'EXT_disjoint_timer_query', // TIME_ELAPSED_EXT
        0x8FBB: 'EXT_disjoint_timer_query', // GPU_DISJOINT_EXT

        // OES_standard_derivatives
        0x8B8C: 'OES_standard_derivatives', // FRAGMENT_SHADER_DERIVATIVE_HINT_OES

        // ANGLE_instanced_arrays
        0x88FE: 'ANGLE_instanced_arrays', // VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE

        // OES_vertex_array_object
        0x85B5: 'OES_vertex_array_object', // VERTEX_ARRAY_BINDING_OES

        // EXT_blend_minmax
        0x8007: 'EXT_blend_minmax', // MIN_EXT
        0x8008: 'EXT_blend_minmax', // MAX_EXT

        // EXT_frag_depth - no getParameter constants

        // EXT_shader_texture_lod - no getParameter constants

        // EXT_sRGB
        0x8C40: 'EXT_sRGB', // SRGB_EXT
        0x8C41: 'EXT_sRGB', // SRGB_ALPHA_EXT
        0x8C42: 'EXT_sRGB', // SRGB8_ALPHA8_EXT
        0x8C43: 'EXT_sRGB', // FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT

        // WEBGL_depth_texture - no getParameter constants

        // OES_texture_float - no getParameter constants

        // OES_texture_half_float
        0x8D61: 'OES_texture_half_float', // HALF_FLOAT_OES

        // WEBGL_lose_context - no getParameter constants

        // OES_element_index_uint - no getParameter constants

        // EXT_color_buffer_half_float
        0x881A: 'EXT_color_buffer_half_float', // RGBA16F_EXT
        0x881B: 'EXT_color_buffer_half_float', // RGB16F_EXT
        0x8C3A: 'EXT_color_buffer_half_float', // FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT
        0x8227: 'EXT_color_buffer_half_float', // UNSIGNED_NORMALIZED_EXT

        // WEBGL_color_buffer_float
        0x8814: 'WEBGL_color_buffer_float', // RGBA32F_EXT

        // EXT_color_buffer_float (WebGL2)
        // Uses same constants as above

        // WEBGL_compressed_texture_s3tc
        0x83F0: 'WEBGL_compressed_texture_s3tc', // COMPRESSED_RGB_S3TC_DXT1_EXT
        0x83F1: 'WEBGL_compressed_texture_s3tc', // COMPRESSED_RGBA_S3TC_DXT1_EXT
        0x83F2: 'WEBGL_compressed_texture_s3tc', // COMPRESSED_RGBA_S3TC_DXT3_EXT
        0x83F3: 'WEBGL_compressed_texture_s3tc', // COMPRESSED_RGBA_S3TC_DXT5_EXT

        // WEBGL_compressed_texture_s3tc_srgb
        0x8C4C: 'WEBGL_compressed_texture_s3tc_srgb', // COMPRESSED_SRGB_S3TC_DXT1_EXT
        0x8C4D: 'WEBGL_compressed_texture_s3tc_srgb', // COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT
        0x8C4E: 'WEBGL_compressed_texture_s3tc_srgb', // COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT
        0x8C4F: 'WEBGL_compressed_texture_s3tc_srgb', // COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT

        // WEBGL_compressed_texture_etc
        0x9274: 'WEBGL_compressed_texture_etc', // COMPRESSED_R11_EAC
        0x9275: 'WEBGL_compressed_texture_etc', // COMPRESSED_SIGNED_R11_EAC

        // WEBGL_compressed_texture_pvrtc
        0x8C00: 'WEBGL_compressed_texture_pvrtc', // COMPRESSED_RGB_PVRTC_4BPPV1_IMG
        0x8C01: 'WEBGL_compressed_texture_pvrtc', // COMPRESSED_RGB_PVRTC_2BPPV1_IMG
        0x8C02: 'WEBGL_compressed_texture_pvrtc', // COMPRESSED_RGBA_PVRTC_4BPPV1_IMG
        0x8C03: 'WEBGL_compressed_texture_pvrtc', // COMPRESSED_RGBA_PVRTC_2BPPV1_IMG

        // WEBGL_compressed_texture_astc
        0x93B0: 'WEBGL_compressed_texture_astc', // COMPRESSED_RGBA_ASTC_4x4_KHR

        // EXT_texture_compression_bptc
        0x8E8C: 'EXT_texture_compression_bptc', // COMPRESSED_RGBA_BPTC_UNORM_EXT
        0x8E8D: 'EXT_texture_compression_bptc', // COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT
        0x8E8E: 'EXT_texture_compression_bptc', // COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT
        0x8E8F: 'EXT_texture_compression_bptc', // COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT

        // EXT_texture_compression_rgtc
        0x8DBB: 'EXT_texture_compression_rgtc', // COMPRESSED_RED_RGTC1_EXT
        0x8DBC: 'EXT_texture_compression_rgtc', // COMPRESSED_SIGNED_RED_RGTC1_EXT
        0x8DBD: 'EXT_texture_compression_rgtc', // COMPRESSED_RED_GREEN_RGTC2_EXT
        0x8DBE: 'EXT_texture_compression_rgtc', // COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT

        // WEBGL_multi_draw - no getParameter constants

        // OVR_multiview2
        0x9630: 'OVR_multiview2', // FRAMEBUFFER_ATTACHMENT_TEXTURE_NUM_VIEWS_OVR
        0x9631: 'OVR_multiview2', // FRAMEBUFFER_ATTACHMENT_TEXTURE_BASE_VIEW_INDEX_OVR
        0x9632: 'OVR_multiview2', // MAX_VIEWS_OVR
    };

    // Override getParameter with error silencing
    prototype.getParameter = function (param: number): any {
        // Handle UNMASKED_VENDOR_WEBGL specially - spoof to configured value
        if (param === 37445) {
            if (settings.webgl?.enabled) {
                // Return the configured vendor without any obvious modification markers
                const vendor = settings.webgl.vendor || 'Google Inc. (Intel)';
                const renderer = settings.webgl.renderer || 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';
                // Store for Worker consistency
                try { setGPUProfile(vendor, renderer); } catch (e) { }
                return vendor;
            }
            // Protection disabled - check if extension available
            const ext = originalGetExtension.call(this, 'WEBGL_debug_renderer_info');
            if (!ext) return null;
            // Extension exists, return original value
            return originalGetParameter.call(this, param);
        }

        // Handle UNMASKED_RENDERER_WEBGL specially - spoof to configured value
        if (param === 37446) {
            if (settings.webgl?.enabled) {
                // Return the configured renderer without any obvious modification markers
                const vendor = settings.webgl.vendor || 'Google Inc. (Intel)';
                const renderer = settings.webgl.renderer || 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';
                // Store for Worker consistency
                try { setGPUProfile(vendor, renderer); } catch (e) { }
                return renderer;
            }
            // Protection disabled - check if extension available
            const ext = originalGetExtension.call(this, 'WEBGL_debug_renderer_info');
            if (!ext) return null;
            // Extension exists, return original value
            return originalGetParameter.call(this, param);
        }

        // Check if this parameter requires an extension we know about
        const requiredExt = extensionDependentParams[param];
        if (requiredExt) {
            const ext = originalGetExtension.call(this, requiredExt);
            if (!ext) {
                // Extension not available, return null to avoid WebGL error
                return null;
            }
        }

        // Clear any pending errors before our call
        while (originalGetError.call(this) !== 0) { /* clear error queue */ }

        // Call original getParameter
        const result = originalGetParameter.call(this, param);

        // Check if an error was generated (INVALID_ENUM = 0x0500)
        const error = originalGetError.call(this);
        if (error === 0x0500) {
            // INVALID_ENUM - parameter not supported, return null silently
            return null;
        }

        // Apply noise to numeric parameters if enabled
        if (settings.webgl?.enabled) {
            const offset = getWebGLParamOffset(param);
            if (typeof result === 'number' && offset !== undefined) {
                return Math.max(1, result + offset);
            }
        }

        return result;
    };

    // Don't block debug extension - let it through so we can spoof the values
    // When getParameter is called with UNMASKED_VENDOR/RENDERER, we return spoofed values
    prototype.getExtension = function (name: string): any {
        // Let all extensions through - we spoof the getParameter values instead
        return originalGetExtension.call(this, name);
    };

    // Shuffle extensions based on seed to make fingerprint hash change
    prototype.getSupportedExtensions = function (): string[] | null {
        const extensions = originalGetSupportedExtensions.call(this);
        if (!extensions || !settings.webgl?.enabled) {
            return extensions;
        }

        // Shuffle the extensions array based on seed
        const seed = getFingerprintSeed();
        const shuffleRandom = mulberry32(seed ^ 0xE5E5E5);

        // Create a copy and shuffle using Fisher-Yates algorithm
        const shuffled = [...extensions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(shuffleRandom() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    };

    // Normalize shader precision with seed-dependent variation
    prototype.getShaderPrecisionFormat = function (shaderType: number, precisionType: number): WebGLShaderPrecisionFormat | null {
        if (settings.webgl?.enabled) {
            const seed = getFingerprintSeed();
            const precisionRandom = mulberry32(seed ^ 0x92EC15 ^ shaderType ^ precisionType);

            // Return consistent values with slight seed-dependent variation
            const rangeVariation = Math.floor(precisionRandom() * 3); // 0, 1, or 2
            const precisionVariation = Math.floor(precisionRandom() * 2); // 0 or 1

            return {
                rangeMin: 127 - rangeVariation,
                rangeMax: 127 - rangeVariation,
                precision: 23 - precisionVariation
            } as WebGLShaderPrecisionFormat;
        }
        return originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);
    };
}

/**
 * Initialize WebGL draw buffer protection (readPixels)
 */
function initWebGLReadPixelsProtection(): void {
    if (typeof WebGLRenderingContext !== 'undefined') {
        const originalReadPixels = WebGLRenderingContext.prototype.readPixels;
        WebGLRenderingContext.prototype.readPixels = function (
            x: number, y: number, width: number, height: number,
            format: number, type: number, pixels: ArrayBufferView | null
        ): void {
            originalReadPixels.call(this, x, y, width, height, format, type, pixels);
            if (settings.canvas?.enabled && pixels instanceof Uint8Array) {
                // Apply noise to WebGL readPixels
                const seed = getFingerprintSeed() ^ (width * 1000 + height);
                const noiseRandom = mulberry32(seed);
                for (let i = 0; i < pixels.length; i += 4) {
                    if (pixels[i + 3] !== 0) { // Skip transparent
                        const noise = Math.floor(noiseRandom() * 3) - 1;
                        pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
                        pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + noise));
                        pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + noise));
                    }
                }
            }
        };
    }

    if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalReadPixels2 = WebGL2RenderingContext.prototype.readPixels;
        (WebGL2RenderingContext.prototype as any).readPixels = function (
            ...args: any[]
        ): void {
            originalReadPixels2.apply(this, args as any);

            // WebGL2 readPixels has multiple overloads:
            // 1. readPixels(x, y, w, h, format, type, pixels) - 7 args
            // 2. readPixels(x, y, w, h, format, type, offset) - 7 args with number offset
            // 3. readPixels(x, y, w, h, format, type, pixels, dstOffset) - 8 args
            // We need to handle all cases by finding the pixels buffer

            let width: number;
            let height: number;
            let pixels: ArrayBufferView | null = null;

            // Width/height are always at positions 2 and 3
            width = args[2] as number;
            height = args[3] as number;

            // Find the pixels buffer - it's an ArrayBufferView, not a number
            // In overload 1: pixels is at index 6
            // In overload 2: offset is at index 6 (number)
            // In overload 3: pixels is at index 6, dstOffset is at index 7
            if (args.length >= 7) {
                const arg6 = args[6];
                if (arg6 instanceof ArrayBuffer || ArrayBuffer.isView(arg6)) {
                    pixels = arg6 as ArrayBufferView;
                }
            }

            if (settings.canvas?.enabled && pixels instanceof Uint8Array) {
                const seed = getFingerprintSeed() ^ (width * 1000 + height);
                const noiseRandom = mulberry32(seed);
                for (let i = 0; i < pixels.length; i += 4) {
                    if (pixels[i + 3] !== 0) {
                        const noise = Math.floor(noiseRandom() * 3) - 1;
                        pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
                        pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + noise));
                        pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + noise));
                    }
                }
            }
        };
    }
}

/**
 * Patch WebGL in an iframe's contentWindow
 * This is called when an iframe's contentWindow is accessed
 */
function patchIframeWebGL(iframeWindow: Window): void {
    if (!iframeWindow) return;

    try {
        // Check if already patched (inside try-catch for cross-origin safety)
        if ((iframeWindow as any).__KRIACY_IFRAME_PATCHED__) return;
        (iframeWindow as any).__KRIACY_IFRAME_PATCHED__ = true;

        // Get the iframe's WebGL prototypes
        const iframeWebGL = (iframeWindow as any).WebGLRenderingContext;
        const iframeWebGL2 = (iframeWindow as any).WebGL2RenderingContext;

        if (iframeWebGL && iframeWebGL.prototype) {
            patchWebGLContext(iframeWebGL.prototype, 'WebGL-iframe');
        }

        if (iframeWebGL2 && iframeWebGL2.prototype) {
            patchWebGLContext(iframeWebGL2.prototype, 'WebGL2-iframe');
        }
    } catch (e) {
        // Cross-origin iframes will throw - that's expected and safe to ignore
    }
}

/**
 * Initialize iframe WebGL protection
 * This patches contentWindow access to ensure iframes also have spoofed WebGL
 */
function initIframeProtection(): void {
    // Patch HTMLIFrameElement.prototype.contentWindow getter
    const iframeProto = HTMLIFrameElement.prototype;
    const contentWindowDescriptor = Object.getOwnPropertyDescriptor(iframeProto, 'contentWindow');

    if (contentWindowDescriptor && contentWindowDescriptor.get) {
        const originalContentWindowGetter = contentWindowDescriptor.get;

        Object.defineProperty(iframeProto, 'contentWindow', {
            get: function () {
                const contentWindow = originalContentWindowGetter.call(this);
                if (contentWindow && settings.webgl?.enabled) {
                    patchIframeWebGL(contentWindow);
                }
                return contentWindow;
            },
            configurable: true,
            enumerable: true
        });
    }

    // Also patch contentDocument which can be used to access the window
    const contentDocDescriptor = Object.getOwnPropertyDescriptor(iframeProto, 'contentDocument');

    if (contentDocDescriptor && contentDocDescriptor.get) {
        const originalContentDocGetter = contentDocDescriptor.get;

        Object.defineProperty(iframeProto, 'contentDocument', {
            get: function () {
                const contentDoc = originalContentDocGetter.call(this);
                if (contentDoc && contentDoc.defaultView && settings.webgl?.enabled) {
                    patchIframeWebGL(contentDoc.defaultView);
                }
                return contentDoc;
            },
            configurable: true,
            enumerable: true
        });
    }

    // Use MutationObserver to catch iframes as they load
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLIFrameElement) {
                        // Patch when iframe loads
                        node.addEventListener('load', () => {
                            try {
                                if (node.contentWindow && settings.webgl?.enabled) {
                                    patchIframeWebGL(node.contentWindow);
                                }
                            } catch (e) { /* Cross-origin */ }
                        });

                        // Also try immediately in case it's already loaded
                        try {
                            if (node.contentWindow && settings.webgl?.enabled) {
                                patchIframeWebGL(node.contentWindow);
                            }
                        } catch (e) { /* Cross-origin */ }
                    }
                }
            }
        });

        // Start observing once DOM is ready
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            });
        }
    }
}

// Apply patches IMMEDIATELY at module load time (not in init function)
// This ensures patches are in place BEFORE any page scripts run
if (!w.__KRIACY_WEBGL_PATCHED__) {
    w.__KRIACY_WEBGL_PATCHED__ = true;
    log.init('Initializing WebGL fingerprint protection');
    patchWebGLContext(WebGLRenderingContext.prototype, 'WebGL');
    if (typeof WebGL2RenderingContext !== 'undefined') {
        patchWebGLContext(WebGL2RenderingContext.prototype, 'WebGL2');
    }
    initWebGLReadPixelsProtection();
    initIframeProtection();
}

/**
 * Initialize WebGL fingerprint protection
 * Note: Patches are now applied at module load time, this is kept for backwards compatibility
 */
export function initWebGLProtection(): void {
    // Patches already applied at module load time
    // This function is now a no-op but kept for API compatibility
}
