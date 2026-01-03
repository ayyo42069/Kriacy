// CSS/System styles fingerprint protection

import { settings, getFingerprintSeed } from '../core/state';
import { mulberry32, hashString } from '../core/utils';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('CSS');

// CSS properties commonly used for system styles fingerprinting
const fingerprintedCSSProps = new Set([
    'font-family', 'font-size', 'font-weight', 'line-height',
    'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
    'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
    'border-width', 'letter-spacing', 'word-spacing',
    '-webkit-text-size-adjust', 'text-size-adjust',
    'font-style', 'font-variant', 'text-decoration', 'vertical-align'
]);

/**
 * Helper to add seed-based variation to a CSS value
 */
function modifyCSSValue(prop: string, value: string): string {
    if (!value || !settings.navigator?.enabled) return value;

    const seed = getFingerprintSeed();
    const propHash = hashString(prop);
    const rng = mulberry32(seed ^ propHash);

    // For font-family, append a random fallback
    if (prop === 'font-family') {
        const fallbacks = ['Arial', 'Helvetica', 'sans-serif', 'system-ui'];
        const extra = fallbacks[Math.floor(rng() * fallbacks.length)];
        if (!value.toLowerCase().includes(extra.toLowerCase())) {
            return value + ', ' + extra;
        }
        return value;
    }

    // For numeric values, add small variation
    const numericMatch = value.match(/^(-?[\d.]+)(px|em|rem|pt|%)?$/);
    if (numericMatch) {
        const num = parseFloat(numericMatch[1]);
        const unit = numericMatch[2] || '';
        const variation = (rng() - 0.5) * 0.8; // -0.4 to +0.4
        const newNum = num + variation;
        return newNum.toFixed(3).replace(/\.?0+$/, '') + unit;
    }

    // For "normal" or other keywords, sometimes add variation
    if (prop === 'line-height' && value === 'normal') {
        const variations = ['normal', '1.15', '1.2', '1.25'];
        return variations[Math.floor(rng() * variations.length)];
    }

    return value;
}

/**
 * Initialize CSS system styles fingerprint protection
 */
export function initCSSProtection(): void {
    log.init('Initializing CSS system styles protection');

    // Override CSSStyleDeclaration.prototype.getPropertyValue
    const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
    CSSStyleDeclaration.prototype.getPropertyValue = function (property: string): string {
        const value = originalGetPropertyValue.call(this, property);

        if (settings.navigator?.enabled && fingerprintedCSSProps.has(property)) {
            return modifyCSSValue(property, value);
        }

        return value;
    };

    // Also override direct property access via getter
    const cssPropertyMap: Record<string, string> = {
        'fontFamily': 'font-family',
        'fontSize': 'font-size',
        'fontWeight': 'font-weight',
        'lineHeight': 'line-height',
        'marginTop': 'margin-top',
        'marginBottom': 'margin-bottom',
        'marginLeft': 'margin-left',
        'marginRight': 'margin-right',
        'paddingTop': 'padding-top',
        'paddingBottom': 'padding-bottom',
        'paddingLeft': 'padding-left',
        'paddingRight': 'padding-right',
        'letterSpacing': 'letter-spacing',
        'wordSpacing': 'word-spacing',
        'borderWidth': 'border-width',
        'fontStyle': 'font-style',
        'fontVariant': 'font-variant',
        'textDecoration': 'text-decoration',
        'verticalAlign': 'vertical-align'
    };

    // Patch CSSStyleDeclaration property getters
    Object.entries(cssPropertyMap).forEach(([jsProp, cssProp]) => {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, jsProp);
            if (descriptor && descriptor.get) {
                const originalGetter = descriptor.get;
                Object.defineProperty(CSSStyleDeclaration.prototype, jsProp, {
                    get: function () {
                        const value = originalGetter.call(this);
                        if (settings.navigator?.enabled) {
                            return modifyCSSValue(cssProp, value);
                        }
                        return value;
                    },
                    configurable: true
                });
            }
        } catch (e) {
            // Some properties may not be patchable
        }
    });
}
