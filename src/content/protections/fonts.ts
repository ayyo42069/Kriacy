// Font fingerprint protection

import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32, hashString } from '../core/utils';
import { logSpoofAccess } from '../../utils/logger';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('Fonts');

// Common fonts that should appear as installed
const COMMON_FONTS = [
    'arial', 'helvetica', 'times', 'times new roman', 'georgia',
    'verdana', 'courier', 'courier new', 'serif', 'sans-serif',
    'monospace', 'cursive', 'fantasy', 'system-ui', 'roboto',
    'segoe ui', 'tahoma', 'trebuchet ms', 'lucida'
];

/**
 * Check if a font name is in the common fonts list
 */
function isCommonFont(fontName: string): boolean {
    const fontLower = fontName.toLowerCase();
    return COMMON_FONTS.some(f => fontLower.includes(f));
}

/**
 * Initialize font fingerprint protection
 * Covers: document.fonts.check, document.fonts.ready, document.fonts.load, 
 * FontFace.load, and measureText
 */
export function initFontProtection(): void {
    log.init('Initializing font fingerprint protection');

    // Override FontFace check
    if (document.fonts) {
        const originalCheck = document.fonts.check.bind(document.fonts);
        const originalLoad = document.fonts.load.bind(document.fonts);

        // Override document.fonts.check
        Object.defineProperty(document.fonts, 'check', {
            value: function (font: string, text?: string): boolean {
                if (settings.fonts?.enabled) {
                    logSpoofAccess('fonts', 'document.fonts.check', font);

                    if (!isCommonFont(font)) {
                        // Return random result based on seed for consistency
                        const fontHash = hashString(font);
                        return (fontHash ^ getFingerprintSeed()) % 4 === 0;
                    }
                }
                return originalCheck(font, text);
            },
            configurable: true,
            writable: true
        });

        // Override document.fonts.load to prevent font detection through async loading
        Object.defineProperty(document.fonts, 'load', {
            value: async function (font: string, text?: string): Promise<FontFace[]> {
                if (settings.fonts?.enabled) {
                    logSpoofAccess('fonts', 'document.fonts.load', font);

                    if (!isCommonFont(font)) {
                        // Return empty array for uncommon fonts to prevent detection
                        return [];
                    }
                }
                return originalLoad(font, text);
            },
            configurable: true,
            writable: true
        });

        // Override document.fonts.ready - return immediately to prevent timing attacks
        try {
            const originalReady = Object.getOwnPropertyDescriptor(document.fonts, 'ready');
            if (originalReady) {
                Object.defineProperty(document.fonts, 'ready', {
                    get: function (): Promise<FontFaceSet> {
                        if (settings.fonts?.enabled) {
                            logSpoofAccess('fonts', 'document.fonts.ready');
                            // Return an immediately resolved promise
                            return Promise.resolve(document.fonts);
                        }
                        return originalReady.get?.call(document.fonts) || Promise.resolve(document.fonts);
                    },
                    configurable: true
                });
            }
        } catch (e) {
            // Property may not be configurable in some browsers
        }
    }

    // Override FontFace.prototype.load if available
    if (typeof FontFace !== 'undefined') {
        try {
            const originalFontFaceLoad = FontFace.prototype.load;
            FontFace.prototype.load = async function (): Promise<FontFace> {
                if (settings.fonts?.enabled) {
                    logSpoofAccess('fonts', 'FontFace.load', this.family);

                    if (!isCommonFont(this.family)) {
                        // For uncommon fonts, simulate a failed load
                        throw new DOMException('Font loading blocked', 'NetworkError');
                    }
                }
                return originalFontFaceLoad.call(this);
            };
        } catch (e) {
            // FontFace may not be modifiable
        }
    }

    // Override measureText for font detection
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function (text: string): TextMetrics {
        const metrics = originalMeasureText.call(this, text);

        if (settings.fonts?.enabled) {
            // Add tiny noise to width measurements
            const noiseRandom = mulberry32(getFingerprintSeed() ^ hashString(text + this.font));
            const noise = (noiseRandom() - 0.5) * 0.5;

            // Return modified metrics
            return {
                width: metrics.width + noise,
                actualBoundingBoxAscent: metrics.actualBoundingBoxAscent + noise * 0.1,
                actualBoundingBoxDescent: metrics.actualBoundingBoxDescent + noise * 0.1,
                actualBoundingBoxLeft: metrics.actualBoundingBoxLeft + noise * 0.1,
                actualBoundingBoxRight: metrics.actualBoundingBoxRight + noise * 0.1,
                fontBoundingBoxAscent: metrics.fontBoundingBoxAscent + noise * 0.1,
                fontBoundingBoxDescent: metrics.fontBoundingBoxDescent + noise * 0.1,
                emHeightAscent: metrics.emHeightAscent,
                emHeightDescent: metrics.emHeightDescent,
                hangingBaseline: metrics.hangingBaseline,
                alphabeticBaseline: metrics.alphabeticBaseline,
                ideographicBaseline: metrics.ideographicBaseline
            } as TextMetrics;
        }

        return metrics;
    };
}
