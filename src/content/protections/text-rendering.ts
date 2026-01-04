import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32, hashString } from '../core/utils';
import { logSpoofAccess } from '../../utils/logger';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('TextRender');

// Store original methods
const w = window as any;
if (!w.__KRIACY_TEXT_RENDER_ORIGINALS__) {
    w.__KRIACY_TEXT_RENDER_ORIGINALS__ = {
        measureText: CanvasRenderingContext2D.prototype.measureText,
        offscreenMeasureText: typeof OffscreenCanvasRenderingContext2D !== 'undefined'
            ? OffscreenCanvasRenderingContext2D.prototype.measureText
            : null
    };
}

const originals = w.__KRIACY_TEXT_RENDER_ORIGINALS__;

/**
 * Create a noised TextMetrics proxy
 */
function createNoisedMetrics(metrics: TextMetrics, text: string, font: string): TextMetrics {
    const seed = getFingerprintSeed();
    const textHash = hashString(text + font);
    const noiseSeed = (seed ^ textHash) >>> 0;
    const noiseRandom = mulberry32(noiseSeed);

    // More aggressive noise: ±2.0 pixels base
    const baseNoise = (noiseRandom() - 0.5) * 4.0;

    // Create a proxy that returns noised values
    return new Proxy(metrics, {
        get(target, prop) {
            const value = (target as any)[prop];
            if (typeof value === 'number' && prop !== 'length') {
                // Apply consistent noise based on property name
                const propHash = hashString(String(prop));
                const propNoise = baseNoise * ((propHash % 5) + 1) / 5;
                return value + propNoise;
            }
            return value;
        }
    });
}

/**
 * Override measureText on CanvasRenderingContext2D
 */
function overrideMeasureText(): void {
    CanvasRenderingContext2D.prototype.measureText = function (text: string): TextMetrics {
        const metrics = originals.measureText.call(this, text);

        if (!settings.canvas?.enabled) {
            return metrics;
        }

        logSpoofAccess('text-render', 'measureText', text.substring(0, 20));
        return createNoisedMetrics(metrics, text, this.font);
    };
}

/**
 * Override measureText on OffscreenCanvasRenderingContext2D
 * This is crucial because many fingerprinting sites use OffscreenCanvas!
 */
function overrideOffscreenMeasureText(): void {
    if (typeof OffscreenCanvasRenderingContext2D === 'undefined') {
        log.debug('OffscreenCanvasRenderingContext2D not available, skipping');
        return;
    }

    if (!originals.offscreenMeasureText) {
        log.debug('OffscreenCanvas measureText original not captured, skipping');
        return;
    }

    OffscreenCanvasRenderingContext2D.prototype.measureText = function (text: string): TextMetrics {
        const metrics = originals.offscreenMeasureText.call(this, text);

        if (!settings.canvas?.enabled) {
            return metrics;
        }

        logSpoofAccess('text-render', 'OffscreenCanvas.measureText', text.substring(0, 20));
        return createNoisedMetrics(metrics, text, this.font);
    };
}

/**
 * Normalize 2D context text rendering settings when contexts are created
 */
function patchGetContext(): void {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    (HTMLCanvasElement.prototype as any).getContext = function (
        contextId: string,
        options?: any
    ): RenderingContext | null {
        // For 2D contexts, ensure willReadFrequently is set for performance
        if (contextId === '2d' && settings.canvas?.enabled) {
            options = { ...options, willReadFrequently: true };
        }

        const ctx = originalGetContext.call(this, contextId, options);

        if (ctx && settings.canvas?.enabled && contextId === '2d') {
            const ctx2d = ctx as CanvasRenderingContext2D;

            // Apply text rendering normalization
            try {
                (ctx2d as any).textRendering = 'geometricPrecision';
                (ctx2d as any).fontKerning = 'normal';
                ctx2d.imageSmoothingEnabled = true;
                ctx2d.imageSmoothingQuality = 'high';
            } catch (e) {
                // Properties may not exist in all browsers
            }
        }

        return ctx;
    };
}

/**
 * Patch OffscreenCanvas.getContext for text rendering normalization
 */
function patchOffscreenGetContext(): void {
    if (typeof OffscreenCanvas === 'undefined') return;

    const originalGetContext = OffscreenCanvas.prototype.getContext;

    (OffscreenCanvas.prototype as any).getContext = function (
        contextId: string,
        options?: any
    ): any {
        const ctx = (originalGetContext as any).call(this, contextId, options);

        if (ctx && settings.canvas?.enabled && contextId === '2d') {
            const ctx2d = ctx as OffscreenCanvasRenderingContext2D;

            try {
                (ctx2d as any).textRendering = 'geometricPrecision';
                (ctx2d as any).fontKerning = 'normal';
                ctx2d.imageSmoothingEnabled = true;
                ctx2d.imageSmoothingQuality = 'high';
            } catch (e) {
                // Properties may not exist in all browsers
            }
        }

        return ctx;
    };
}

/**
 * Initialize text and emoji rendering protection
 */
export function initTextRenderingProtection(): void {
    log.init('Initializing Text/Emoji rendering fingerprint protection');

    overrideMeasureText();
    overrideOffscreenMeasureText();
    patchGetContext();
    patchOffscreenGetContext();
}
