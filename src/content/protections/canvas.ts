// Canvas fingerprint protection

import { settings, getFingerprintSeed, RECT_NOISE } from '../core/state';
import { mulberry32 } from '../core/utils';
import { logSpoofAccess } from '../../utils/logger';

// Use window to persist originals across script re-evaluations
const w = window as any;
if (!w.__KRIACY_CANVAS_ORIGINALS__) {
    w.__KRIACY_CANVAS_ORIGINALS__ = {
        toDataURL: HTMLCanvasElement.prototype.toDataURL,
        toBlob: HTMLCanvasElement.prototype.toBlob,
        getImageData: CanvasRenderingContext2D.prototype.getImageData
    };
}

const originalToDataURL = w.__KRIACY_CANVAS_ORIGINALS__.toDataURL;
const originalToBlob = w.__KRIACY_CANVAS_ORIGINALS__.toBlob;
const originalGetImageData = w.__KRIACY_CANVAS_ORIGINALS__.getImageData;

// Simple boolean flags for recursion prevention
let inToDataURL = false;
let inToBlob = false;
let inGetImageData = false;

/**
 * Modify pixel data in a deterministic way based on session seed
 */
export function modifyImageData(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const seed = getFingerprintSeed();
    const noiseSeed = (seed ^ (width * 7919 + height * 6271)) >>> 0;
    const noiseRandom = mulberry32(noiseSeed);

    const rOffset = ((seed >> 0) & 0xFF) % 11 - 5;
    const gOffset = ((seed >> 8) & 0xFF) % 11 - 5;
    const bOffset = ((seed >> 16) & 0xFF) % 11 - 5;
    const positionFactor = ((seed >> 24) & 0xFF) / 255;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;

        const pixelIndex = i / 4;
        const px = pixelIndex % width;
        const py = Math.floor(pixelIndex / width);

        const randomNoise = Math.floor(noiseRandom() * 7) - 3;
        const posNoise = Math.floor(((px ^ py ^ seed) & 0x7) * positionFactor) - 2;
        const totalNoise = randomNoise + posNoise;

        data[i] = Math.max(0, Math.min(255, data[i] + totalNoise + rOffset));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + totalNoise + gOffset));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + totalNoise + bOffset));
    }

    return imageData;
}

/**
 * Apply noise directly to a dataURL string by modifying base64 data
 * This is more reliable than trying to use a temp canvas
 */
function modifyDataURL(dataURL: string): string {
    const seed = getFingerprintSeed();

    // Find the base64 data part after the comma
    const commaIndex = dataURL.indexOf(',');
    if (commaIndex === -1) return dataURL;

    const header = dataURL.substring(0, commaIndex + 1);
    const base64Data = dataURL.substring(commaIndex + 1);

    // Decode, modify, re-encode
    try {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Modify some bytes based on seed (skip PNG header - first 8 bytes)
        const noiseRandom = mulberry32(seed);
        for (let i = 100; i < Math.min(bytes.length, 500); i++) {
            const noise = Math.floor(noiseRandom() * 3) - 1;
            bytes[i] = Math.max(0, Math.min(255, bytes[i] + noise));
        }

        // Re-encode to base64
        let newBinaryString = '';
        for (let i = 0; i < bytes.length; i++) {
            newBinaryString += String.fromCharCode(bytes[i]);
        }

        return header + btoa(newBinaryString);
    } catch (e) {
        // If anything fails, return original
        return dataURL;
    }
}

/**
 * Get 2D context safely
 */
function getSafe2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    try {
        return canvas.getContext('2d', { willReadFrequently: true });
    } catch {
        return null;
    }
}

/**
 * Initialize canvas protection
 */
export function initCanvasProtection(): void {
    // Override toDataURL
    HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: any): string {
        if (inToDataURL) {
            return originalToDataURL.call(this, type, quality);
        }

        inToDataURL = true;
        try {
            if (!settings.canvas?.enabled) {
                return originalToDataURL.call(this, type, quality);
            }

            if (this.width <= 0 || this.height <= 0) {
                return originalToDataURL.call(this, type, quality);
            }

            // Get the original result
            const originalResult = originalToDataURL.call(this, type, quality);

            // Apply noise by modifying the base64 data directly
            logSpoofAccess('canvas', 'toDataURL', `${this.width}x${this.height}`);
            const modifiedResult = modifyDataURL(originalResult);

            console.log('[Kriacy DEBUG] Canvas toDataURL - seed:', getFingerprintSeed().toString(16));
            console.log('[Kriacy DEBUG] Original vs Modified different?', originalResult !== modifiedResult);

            return modifiedResult;
        } finally {
            inToDataURL = false;
        }
    };

    // Override toBlob
    HTMLCanvasElement.prototype.toBlob = function (
        callback: BlobCallback,
        type?: string,
        quality?: any
    ): void {
        if (inToBlob) {
            return originalToBlob.call(this, callback, type, quality);
        }

        inToBlob = true;
        try {
            if (!settings.canvas?.enabled) {
                return originalToBlob.call(this, callback, type, quality);
            }

            if (this.width <= 0 || this.height <= 0) {
                return originalToBlob.call(this, callback, type, quality);
            }

            // Get dataURL, modify it, convert to blob
            const dataURL = originalToDataURL.call(this, type, quality);
            const modifiedDataURL = modifyDataURL(dataURL);

            logSpoofAccess('canvas', 'toBlob', `${this.width}x${this.height}`);

            // Convert modified dataURL to blob
            fetch(modifiedDataURL)
                .then(res => res.blob())
                .then(blob => callback(blob))
                .catch(() => {
                    // Fallback to original
                    originalToBlob.call(this, callback, type, quality);
                });
        } finally {
            inToBlob = false;
        }
    };

    // Override getImageData
    CanvasRenderingContext2D.prototype.getImageData = function (
        sx: number, sy: number, sw: number, sh: number,
        settings2?: ImageDataSettings
    ): ImageData {
        if (inGetImageData) {
            return originalGetImageData.call(this, sx, sy, sw, sh, settings2 as any);
        }

        if (!settings.canvas?.enabled) {
            return originalGetImageData.call(this, sx, sy, sw, sh, settings2 as any);
        }

        inGetImageData = true;
        try {
            const imageData = originalGetImageData.call(this, sx, sy, sw, sh, settings2 as any);
            logSpoofAccess('canvas', 'getImageData', `${sw}x${sh}`);
            return modifyImageData(imageData);
        } finally {
            inGetImageData = false;
        }
    };

    // OffscreenCanvas spoofing
    if (typeof OffscreenCanvas !== 'undefined') {
        const originalOffscreenToBlob = OffscreenCanvas.prototype.convertToBlob;
        let inOffscreenToBlob = false;

        OffscreenCanvas.prototype.convertToBlob = async function (options?: ImageEncodeOptions): Promise<Blob> {
            if (inOffscreenToBlob || !settings.canvas?.enabled) {
                return originalOffscreenToBlob.call(this, options);
            }

            inOffscreenToBlob = true;
            try {
                const ctx = this.getContext('2d') as OffscreenCanvasRenderingContext2D;
                if (ctx && this.width > 0 && this.height > 0) {
                    const imageData = ctx.getImageData(0, 0, this.width, this.height);
                    modifyImageData(imageData);
                    ctx.putImageData(imageData, 0, 0);
                }
            } catch (e) {
                // Fall through
            } finally {
                inOffscreenToBlob = false;
            }

            return originalOffscreenToBlob.call(this, options);
        };

        // OffscreenCanvasRenderingContext2D.getImageData
        try {
            if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
                const originalOffscreenGetImageData = OffscreenCanvasRenderingContext2D.prototype.getImageData;
                let inOffscreenGetImageData = false;

                OffscreenCanvasRenderingContext2D.prototype.getImageData = function (
                    sx: number, sy: number, sw: number, sh: number
                ): ImageData {
                    if (inOffscreenGetImageData || !settings.canvas?.enabled) {
                        return originalOffscreenGetImageData.call(this, sx, sy, sw, sh);
                    }

                    inOffscreenGetImageData = true;
                    try {
                        const imageData = originalOffscreenGetImageData.call(this, sx, sy, sw, sh);
                        return modifyImageData(imageData);
                    } finally {
                        inOffscreenGetImageData = false;
                    }
                };
            }
        } catch (e) {
            // OffscreenCanvasRenderingContext2D not available
        }
    }
}

/**
 * Initialize client rects protection
 */
export function initClientRectsProtection(): void {
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    const originalGetClientRects = Element.prototype.getClientRects;

    Element.prototype.getBoundingClientRect = function (): DOMRect {
        const rect = originalGetBoundingClientRect.call(this);

        if (!settings.canvas?.enabled) return rect;

        const noise = RECT_NOISE;
        return new DOMRect(
            rect.x + noise,
            rect.y + noise,
            rect.width + noise,
            rect.height + noise
        );
    };

    Element.prototype.getClientRects = function (): DOMRectList {
        const rects = originalGetClientRects.call(this);

        if (!settings.canvas?.enabled) return rects;

        const noise = RECT_NOISE;
        const modifiedRects: DOMRect[] = [];

        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            modifiedRects.push(new DOMRect(
                rect.x + noise,
                rect.y + noise,
                rect.width + noise,
                rect.height + noise
            ));
        }

        return modifiedRects as unknown as DOMRectList;
    };
}
