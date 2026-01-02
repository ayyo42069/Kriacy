// WebGL Canvas Fingerprint Protection
// Protects against GPU-based 3D graphics fingerprinting
// This covers hardware-accelerated rendering differences

import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32 } from '../core/utils';
import { logSpoofAccess } from '../../utils/logger';

// Store original WebGL methods to avoid re-capturing
const w = window as any;
if (!w.__KRIACY_WEBGL_CANVAS_ORIGINALS__) {
    w.__KRIACY_WEBGL_CANVAS_ORIGINALS__ = {
        // WebGL1
        wgl_readPixels: typeof WebGLRenderingContext !== 'undefined'
            ? WebGLRenderingContext.prototype.readPixels : null,
        // WebGL2
        wgl2_readPixels: typeof WebGL2RenderingContext !== 'undefined'
            ? WebGL2RenderingContext.prototype.readPixels : null,
        // Canvas getContext
        getContext: HTMLCanvasElement.prototype.getContext
    };
}

const originals = w.__KRIACY_WEBGL_CANVAS_ORIGINALS__;

// Track which WebGL contexts we've patched for draw calls
const patchedContexts = new WeakSet<WebGLRenderingContext | WebGL2RenderingContext>();

/**
 * Apply noise to pixel data from WebGL readPixels
 * This makes GPU rendering fingerprints consistent within a session but unique across sessions
 */
function applyWebGLPixelNoise(pixels: ArrayBufferView, width: number, height: number): void {
    if (!(pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray)) {
        return;
    }

    const seed = getFingerprintSeed();

    // Create unique noise seed
    const noiseSeed = (seed ^ (width * 7919 + height * 6271) ^ 0xBEEFCAFE) >>> 0;
    const noiseRandom = mulberry32(noiseSeed);

    // More aggressive session-based offsets (range -5 to +5)
    const rOffset = ((seed >> 0) & 0xFF) % 11 - 5;
    const gOffset = ((seed >> 8) & 0xFF) % 11 - 5;
    const bOffset = ((seed >> 16) & 0xFF) % 11 - 5;

    // Position-based noise factor derived from seed
    const positionFactor = ((seed >> 24) & 0xFF) / 255;

    const data = pixels as Uint8Array;
    for (let i = 0; i < data.length; i += 4) {
        // Skip fully transparent pixels
        if (data[i + 3] === 0) continue;

        // Calculate pixel position for position-based noise
        const pixelIndex = i / 4;
        const px = pixelIndex % width;
        const py = Math.floor(pixelIndex / width);

        // Random noise component (-3 to +3)
        const randomNoise = Math.floor(noiseRandom() * 7) - 3;

        // Position-based noise component
        const posNoise = Math.floor(((px ^ py ^ seed) & 0x7) * positionFactor) - 2;

        // Combined noise
        const totalNoise = randomNoise + posNoise;

        // Apply noise to RGB channels
        data[i] = Math.max(0, Math.min(255, data[i] + totalNoise + rOffset));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + totalNoise + gOffset));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + totalNoise + bOffset));
    }
}

/**
 * Patch a WebGL context to add noise to draw operations
 */
function patchWebGLContextForDrawing(ctx: WebGLRenderingContext | WebGL2RenderingContext): void {
    if (patchedContexts.has(ctx)) return;
    patchedContexts.add(ctx);

    const originalDrawArrays = ctx.drawArrays.bind(ctx);
    const originalDrawElements = ctx.drawElements.bind(ctx);
    const originalDrawArraysInstanced = (ctx as any).drawArraysInstanced?.bind(ctx);
    const originalDrawElementsInstanced = (ctx as any).drawElementsInstanced?.bind(ctx);

    let drawCallCount = 0;

    // Wrapper to track draw calls for logging
    function wrapDrawCall(originalFn: Function, name: string) {
        return function (this: any, ...args: any[]) {
            const result = originalFn.apply(this, args);
            drawCallCount++;

            // Log periodically to avoid spam
            if (drawCallCount === 1 || drawCallCount % 100 === 0) {
                logSpoofAccess('webgl', name, `draw call #${drawCallCount}`);
            }

            return result;
        };
    }

    // Note: We don't actually modify draw calls themselves since that would
    // break rendering. Instead, we ensure readPixels always returns noisy data.
    // However, we can intercept specific fingerprinting techniques.
}

/**
 * Enhanced readPixels protection for WebGL1
 */
function enhanceWebGL1ReadPixels(): void {
    if (typeof WebGLRenderingContext === 'undefined') return;

    let inReadPixels = false;
    WebGLRenderingContext.prototype.readPixels = function (
        x: number, y: number, width: number, height: number,
        format: number, type: number, pixels: ArrayBufferView | null
    ): void {
        if (inReadPixels) {
            return originals.wgl_readPixels.call(this, x, y, width, height, format, type, pixels);
        }

        inReadPixels = true;
        try {
            originals.wgl_readPixels.call(this, x, y, width, height, format, type, pixels);

            if (settings.canvas?.enabled && pixels) {
                logSpoofAccess('webgl-canvas', 'WebGL.readPixels', `${width}x${height}`);
                applyWebGLPixelNoise(pixels, width, height);
            }
        } finally {
            inReadPixels = false;
        }
    };
}

/**
 * Enhanced readPixels protection for WebGL2
 */
function enhanceWebGL2ReadPixels(): void {
    if (typeof WebGL2RenderingContext === 'undefined') return;

    let inReadPixels = false;
    (WebGL2RenderingContext.prototype as any).readPixels = function (...args: any[]): void {
        if (inReadPixels) {
            return originals.wgl2_readPixels.apply(this, args);
        }

        inReadPixels = true;
        try {
            originals.wgl2_readPixels.apply(this, args);

            // WebGL2 has multiple overloads
            // Args 2 and 3 are always width and height
            const width = args[2] as number;
            const height = args[3] as number;

            // Find the pixels buffer
            let pixels: ArrayBufferView | null = null;
            if (args.length >= 7 && ArrayBuffer.isView(args[6])) {
                pixels = args[6] as ArrayBufferView;
            }

            if (settings.canvas?.enabled && pixels) {
                logSpoofAccess('webgl-canvas', 'WebGL2.readPixels', `${width}x${height}`);
                applyWebGLPixelNoise(pixels, width, height);
            }
        } finally {
            inReadPixels = false;
        }
    };
}

/**
 * Intercept canvas getContext to patch WebGL contexts for drawing
 */
function interceptGetContext(): void {
    (HTMLCanvasElement.prototype as any).getContext = function (
        contextId: string,
        options?: any
    ): RenderingContext | null {
        const ctx = originals.getContext.call(this, contextId, options);

        if (ctx && settings.canvas?.enabled) {
            if (contextId === 'webgl' || contextId === 'experimental-webgl') {
                patchWebGLContextForDrawing(ctx as WebGLRenderingContext);
            } else if (contextId === 'webgl2') {
                patchWebGLContextForDrawing(ctx as WebGL2RenderingContext);
            }
        }

        return ctx;
    };
}

/**
 * Initialize WebGL Canvas fingerprint protection
 * This enhances the existing WebGL protection with better GPU fingerprint defense
 */
export function initWebGLCanvasProtection(): void {
    console.log('[Kriacy] Initializing WebGL Canvas (GPU) fingerprint protection');

    enhanceWebGL1ReadPixels();
    enhanceWebGL2ReadPixels();
    interceptGetContext();
}
