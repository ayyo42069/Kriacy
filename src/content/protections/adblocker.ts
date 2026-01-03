// Ad Blocker Detection Countermeasures
// Prevents websites from detecting ad blockers (uBlock Origin, AdBlock, etc.)

import { settings } from '../core/state';
import { createLogger } from '../../utils/system-logger';

const log = createLogger('AdBlock');

// =============================================================================
// Runs at module load time (before initAdBlockerProtection)
// This prevents race conditions where detection scripts run before init
// =============================================================================

// Store originals before any page scripts can interfere
const OriginalImage = window.Image;
const originalAddEventListener = EventTarget.prototype.addEventListener;

// Quick check patterns for blocked URLs
const BLOCKED_URL_QUICK_CHECK = /s_a_f_e|0verflow|proxy-\d\.gif\?|liccdn\.com|t\.co\/|\.example\.com/i;

// Helper to check if protection is enabled (checked at runtime, not module load)
const isAdBlockProtectionEnabled = () => settings.misc?.hideAdBlocker === true;

// Patch Image constructor IMMEDIATELY
(function patchImageImmediately() {
    const spoofedImages = new WeakSet<HTMLImageElement>();

    (window as any).Image = function (width?: number, height?: number) {
        const img = new OriginalImage(width, height);

        const originalSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        let _src = '';

        Object.defineProperty(img, 'src', {
            get: () => _src,
            set: (value: string) => {
                _src = value;
                // Only spoof if protection is enabled
                if (isAdBlockProtectionEnabled() && BLOCKED_URL_QUICK_CHECK.test(value)) {
                    spoofedImages.add(img);
                    // Set up error->load conversion (but let image try to load)
                    originalAddEventListener.call(img, 'error', () => {
                        try {
                            Object.defineProperty(img, 'naturalWidth', { value: 1, configurable: true });
                            Object.defineProperty(img, 'naturalHeight', { value: 1, configurable: true });
                            Object.defineProperty(img, 'complete', { value: true, configurable: true });
                        } catch (e) { }
                        // Fire fake load event when error occurs
                        img.dispatchEvent(new Event('load', { bubbles: false }));
                    }, { once: true });
                    // DON'T return - let the image actually try to load
                }
                // Always set the src to let the image load normally
                originalSrcDesc?.set?.call(img, value);
            },
            configurable: true,
            enumerable: true
        });

        return img;
    };
    (window as any).Image.prototype = OriginalImage.prototype;
    Object.setPrototypeOf((window as any).Image, OriginalImage);

    // Also patch addEventListener to redirect error->load for blocked images
    EventTarget.prototype.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
    ) {
        // Only redirect if protection is enabled
        if (isAdBlockProtectionEnabled() && this instanceof HTMLImageElement && type === 'error') {
            const src = this.src || '';
            if (BLOCKED_URL_QUICK_CHECK.test(src)) {
                // Redirect error listeners to load
                return originalAddEventListener.call(this, 'load', listener, options);
            }
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // Capture error events at document level (for images added via innerHTML)
    if (typeof document !== 'undefined') {
        document.addEventListener('error', (e) => {
            // Only intercept if protection is enabled
            if (!isAdBlockProtectionEnabled()) return;

            if (e.target instanceof HTMLImageElement) {
                const img = e.target;
                const src = img.src || '';
                if (BLOCKED_URL_QUICK_CHECK.test(src)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    // Spoof properties before firing load
                    try {
                        Object.defineProperty(img, 'naturalWidth', { value: 1, configurable: true });
                        Object.defineProperty(img, 'naturalHeight', { value: 1, configurable: true });
                        Object.defineProperty(img, 'complete', { value: true, configurable: true });
                    } catch (ex) { }
                    img.dispatchEvent(new Event('load', { bubbles: false }));
                }
            }
        }, true);
    }
})();

/**
 * Common class names and IDs that ad detection scripts use as "bait"
 * These are checked by fingerprinting sites to detect ad blockers
 * Includes patterns from EasyList, uBlock, AdGuard, and other filter lists
 */
const AD_BAIT_PATTERNS = [
    // Class patterns
    'ad', 'ads', 'adsbox', 'ad-banner', 'ad-container', 'ad-wrapper',
    'advert', 'advertisement', 'advertising', 'adblock', 'adbanner',
    'adsbygoogle', 'adunit', 'ad-unit', 'ad-slot', 'ad_slot',
    'banner-ad', 'banner_ad', 'banner-advertisement', 'text-ad',
    'textad', 'text_ad', 'text-ads', 'textads', 'sponsored',
    'sponsor-ad', 'dfp-ad', 'pub_300x250', 'pub_300x250m',
    'pub_728x90', 'pub_468x60', 'google-ad', 'google_ad',
    'adsense', 'ad-block-test', 'adblock-test', 'detect-ad',

    // ID patterns (often same as classes)
    'AdBlock', 'AdContent', 'AdDiv', 'AdContainer', 'AdWrapper',
    'BannerAd', 'GoogleAd', 'GoogleAds', 'TopAd', 'BottomAd',
    'SideAd', 'RightAd', 'LeftAd', 'HeaderAd', 'FooterAd',

    // Specific patterns from detection scripts
    'adyes', 'is-mpu', 'sklid', 'kaufDA', 'cokbar', 'lgdp',
    'aI_sns', 'sns-group', 'zerg-target', 'SmBnLink', 'hs-sosyal',
    'trd-exitintentbox', 'plugin-rss', 'adblock-whitelist-messaging',
    'videojs-hero-overlay', 'mgid_iframe', 'cxense-recs-in-article',
    'buttonautocl', 'ez-sidebar-wall', 'm-chat-toggler',
    'noti_wrap', 'uutiskije-nosto', 'qrcode', 'contPubb',
    'im_panel', 'admaru', 'reklamos_tarpas', 'gesponsord_blokje',
    'skille', 'nsix_balloon', 'h_24x4', 'annons_head', 'mainous',
    'bg_pub', 'agores300', 'googledolje', 'cenmg', 'tupiklan',
    'taboola-', 'outbrain', 'qoo-counter', 'adv_container',

    // Patterns for specific filter lists
    'i3lan', 'wrap-bnr', 'rk-300', 'jw-cue', 'pub_mrec',
    'rekl_srod_top', 'c_ligatus_nxn', 'wpcnt', 'TD_htmlbox',
    'AdGraph', 'quangcaochan', 'yektanet-', 'aiklanatas2',
    'ggPar', 'tblgh', 'eww', 'f-soc', 'w2b7', 'zxc',

    // More aggressive patterns
    'spon-', 'promo-', 'commercial', 'monetiz', 'native-ad',
    'partner-', 'affiliate', 'paid-content', 'promoted'
];

/**
 * URL patterns in images/iframes that indicate ad blocker detection
 * These patterns are used by detection scripts to check if requests are blocked
 */
const AD_URL_PATTERNS = [
    // Local detection images with ad-related query params (from proxy.js)
    /proxy-2\.gif\?/i,
    /proxy-4\.gif\?/i,

    // DNS-based detection domains (s_a_f_e..0verflow.*.domain format)
    /s_a_f_e/i,
    /0verflow/i,
    /\.example\.com\//i,

    // Specific blocked domains used by detection script
    /liccdn\.com/i,            // LinkedIn CDN
    /t\.co\//i,                // Twitter short URLs
    /2s11\.com/i,              // Steven Black's hosts
    /riosaladohp\.com/i,       // Dan Pollock's hosts
    /pastebin\.com\/raw/i,     // Malicious URL blocklist
    /hi\.link/i,               // LAN intrusion block
    /aterm\.me/i,              // LAN intrusion block
    /pdfjs\.robwu\.nl/i,       // Brave unbreak
    /clikueo\.com/i,           // Web annoyances
    /roar\.eu/i,               // Global filters
    /newbie\.com/i,            // Malvertising
    /cardcodes\.net/i,         // Spam404
    /hadriandpaywall\.com/i,   // Paywall bypass
    /worldsguide\.net/i,       // PUP domains

    // Common ad network patterns
    /pagead/i,
    /doubleclick/i,
    /googlesyndication/i,
    /googleadservices/i,
    /adservice/i,
    /adsense/i,
    /\/download\d+\.png/i,
    /\/cachingjsjs\/settings\.js/i,
    /\/p13n\/batch\/action\//i,
    /\/direct\.hd\?n=/i,
    /\/filejoker\./i,
    /\/tr\.gif\?/i,
    /\/btn_sns_/i,
    /\/common\/sns_/i,
    /\/reklam/i,
    /\/banner/i,
    /\/advt-/i,
    /\/pub_/i,

    // EasyList/uBlock filter patterns
    /usqp=/i,                  // AdGuard URL tracking
    /wtrid=/i,                 // ClearURLs
    /tpcc=/i,                  // Actually Legitimate URL Shortener
];

/**
 * Check if an element looks like an ad bait/detection test element
 * More aggressive: catches filter list detection that uses patterns not in our list
 */
function isAdBaitElement(element: Element): boolean {
    if (!element) return false;

    const id = element.id?.toLowerCase() || '';
    const className = typeof element.className === 'string'
        ? element.className.toLowerCase()
        : '';

    // Check explicit patterns first
    for (const pattern of AD_BAIT_PATTERNS) {
        const lowerPattern = pattern.toLowerCase();
        if (id.includes(lowerPattern) || className.includes(lowerPattern)) {
            return true;
        }
    }

    // Also check data attributes commonly used for ad detection
    const dataAd = element.getAttribute('data-ad');
    const dataAdSlot = element.getAttribute('data-ad-slot');
    if (dataAd !== null || dataAdSlot !== null) {
        return true;
    }

    // Aggressive detection: check if element looks like a filter detection test
    // These are typically: small/empty divs with specific class names
    // that are only used for detection, not real content
    if (element instanceof HTMLDivElement || element instanceof HTMLSpanElement) {
        // Check for common filter list detection patterns
        const filterPatterns = [
            'abp', 'adblock', 'adguard', 'easylist', 'fanboy', 'list',
            'filter', 'blocker', 'privacy', 'annoyance', 'social',
            'tracking', 'malware', 'phishing', 'cookie', 'notification',
            'newsletter', 'overlay', 'popup', 'modal', 'survey',
            '-ad', '_ad', 'ad-', 'ad_', 'ads-', 'ads_', '-ads', '_ads'
        ];

        for (const fp of filterPatterns) {
            if (id.includes(fp) || className.includes(fp)) {
                return true;
            }
        }

        // Check if it's a dynamically created empty element (detection test)
        if (!element.textContent?.trim() &&
            element.children.length === 0 &&
            (className || id)) {
            // Empty element with class/id - likely a detection test
            const style = window.getComputedStyle(element);
            if (style.display === 'none' ||
                style.visibility === 'hidden' ||
                (element as HTMLElement).offsetHeight === 0) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Initialize getComputedStyle spoofing for ad bait elements
 * This makes hidden ad elements appear visible to detection scripts
 */
export function initAdBaitProtection(): void {
    if (!settings.misc?.hideAdBlocker) return;

    const originalGetComputedStyle = window.getComputedStyle;

    window.getComputedStyle = function (
        element: Element,
        pseudoElt?: string | null
    ): CSSStyleDeclaration {
        const style = originalGetComputedStyle.call(this, element, pseudoElt);

        // If this is an ad bait element, ensure it appears visible
        if (settings.misc?.hideAdBlocker && isAdBaitElement(element)) {
            // Create a Proxy to intercept property access
            return new Proxy(style, {
                get(target, prop: string) {
                    const value = Reflect.get(target, prop);

                    // If asking about visibility/display, return visible values
                    if (prop === 'display') {
                        const actualValue = typeof value === 'function'
                            ? value.call(target)
                            : value;
                        if (actualValue === 'none') {
                            log.protection('Spoofed ad bait display', { element: element.tagName });
                            return 'block';
                        }
                    }

                    if (prop === 'visibility') {
                        const actualValue = typeof value === 'function'
                            ? value.call(target)
                            : value;
                        if (actualValue === 'hidden' || actualValue === 'collapse') {
                            log.protection('Spoofed ad bait visibility', { element: element.tagName });
                            return 'visible';
                        }
                    }

                    if (prop === 'opacity') {
                        const actualValue = typeof value === 'function'
                            ? value.call(target)
                            : value;
                        if (parseFloat(actualValue) === 0) {
                            log.protection('Spoofed ad bait opacity', { element: element.tagName });
                            return '1';
                        }
                    }

                    if (prop === 'height' || prop === 'width') {
                        const actualValue = typeof value === 'function'
                            ? value.call(target)
                            : value;
                        if (actualValue === '0px' || actualValue === '0') {
                            log.protection('Spoofed ad bait dimension', { prop, element: element.tagName });
                            return prop === 'height' ? '250px' : '300px';
                        }
                    }

                    if (typeof value === 'function') {
                        return value.bind(target);
                    }

                    return value;
                }
            });
        }

        return style;
    };

    log.init('getComputedStyle ad bait protection initialized');
}

/**
 * Initialize getBoundingClientRect spoofing for ad bait elements
 * This ensures hidden elements report non-zero dimensions
 */
export function initBoundingRectProtection(): void {
    if (!settings.misc?.hideAdBlocker) return;

    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

    Element.prototype.getBoundingClientRect = function (): DOMRect {
        const rect = originalGetBoundingClientRect.call(this);

        if (settings.misc?.hideAdBlocker && isAdBaitElement(this)) {
            // If element has zero dimensions (hidden by ad blocker), fake visible dimensions
            if (rect.width === 0 || rect.height === 0) {
                log.protection('Spoofed ad bait getBoundingClientRect', { element: this.tagName });

                // Return a fake DOMRect with typical ad dimensions
                return new DOMRect(
                    rect.x || 0,
                    rect.y || 0,
                    rect.width || 300,  // Standard ad width
                    rect.height || 250  // Standard ad height
                );
            }
        }

        return rect;
    };

    log.init('getBoundingClientRect ad bait protection initialized');
}

/**
 * Initialize offsetWidth/offsetHeight spoofing for ad bait elements
 * Many detection scripts check these properties
 */
export function initOffsetDimensionProtection(): void {
    if (!settings.misc?.hideAdBlocker) return;

    // Store original getters
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype, 'offsetWidth'
    );
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype, 'offsetHeight'
    );
    const originalClientWidth = Object.getOwnPropertyDescriptor(
        Element.prototype, 'clientWidth'
    );
    const originalClientHeight = Object.getOwnPropertyDescriptor(
        Element.prototype, 'clientHeight'
    );

    if (originalOffsetWidth?.get) {
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            get: function () {
                const width = originalOffsetWidth.get!.call(this);
                if (settings.misc?.hideAdBlocker && width === 0 && isAdBaitElement(this)) {
                    log.protection('Spoofed ad bait offsetWidth');
                    return 300;
                }
                return width;
            },
            configurable: true
        });
    }

    if (originalOffsetHeight?.get) {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            get: function () {
                const height = originalOffsetHeight.get!.call(this);
                if (settings.misc?.hideAdBlocker && height === 0 && isAdBaitElement(this)) {
                    log.protection('Spoofed ad bait offsetHeight');
                    return 250;
                }
                return height;
            },
            configurable: true
        });
    }

    if (originalClientWidth?.get) {
        Object.defineProperty(Element.prototype, 'clientWidth', {
            get: function () {
                const width = originalClientWidth.get!.call(this);
                if (settings.misc?.hideAdBlocker && width === 0 && isAdBaitElement(this)) {
                    log.protection('Spoofed ad bait clientWidth');
                    return 300;
                }
                return width;
            },
            configurable: true
        });
    }

    if (originalClientHeight?.get) {
        Object.defineProperty(Element.prototype, 'clientHeight', {
            get: function () {
                const height = originalClientHeight.get!.call(this);
                // Detection scripts check for both 0 AND 1 (see proxy.js: "1 == e.clientHeight")
                if (settings.misc?.hideAdBlocker && (height === 0 || height === 1) && isAdBaitElement(this)) {
                    log.protection('Spoofed ad bait clientHeight', { original: height });
                    return 250;
                }
                return height;
            },
            configurable: true
        });
    }

    log.init('Offset/client dimension ad bait protection initialized');
}

/**
 * Initialize fetch/XHR spoofing for ad-related requests
 * This makes blocked ad requests appear successful
 */
export function initAdRequestSpoofing(): void {
    if (!settings.misc?.hideAdBlocker) return;

    // Common ad-related URL patterns
    const adUrlPatterns = [
        /pagead/i,
        /doubleclick/i,
        /googlesyndication/i,
        /googleadservices/i,
        /adservice/i,
        /ad-score/i,
        /adsense/i,
        /adwords/i,
        /analytics.*ads/i,
        /ads\..*\.com/i,
        /track.*ad/i,
        /pixel.*ad/i,
        /beacon.*ad/i
    ];

    const isAdUrl = (url: string): boolean => {
        return adUrlPatterns.some(pattern => pattern.test(url));
    };

    // Spoof fetch for ad requests
    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : input.url;

        if (settings.misc?.hideAdBlocker && isAdUrl(url)) {
            try {
                const response = await originalFetch.call(this, input, init);
                return response;
            } catch (error) {
                // If ad request was blocked, return a fake successful response
                log.protection('Spoofed blocked ad fetch', { url: url.substring(0, 50) });
                return new Response('', {
                    status: 200,
                    statusText: 'OK',
                    headers: new Headers({
                        'content-type': 'text/javascript'
                    })
                });
            }
        }

        return originalFetch.call(this, input, init);
    };

    // Spoof XMLHttpRequest for ad requests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    // Track ad requests per XHR instance
    const adRequestMap = new WeakMap<XMLHttpRequest, boolean>();

    XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        async: boolean = true,
        username?: string | null,
        password?: string | null
    ) {
        const urlString = typeof url === 'string' ? url : url.toString();
        if (settings.misc?.hideAdBlocker && isAdUrl(urlString)) {
            adRequestMap.set(this, true);
        }
        return originalXHROpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        if (settings.misc?.hideAdBlocker && adRequestMap.get(this)) {
            // Set up fake success handlers
            const xhr = this;

            // Override error to appear as success
            setTimeout(() => {
                try {
                    Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
                    Object.defineProperty(xhr, 'status', { value: 200, writable: false });
                    Object.defineProperty(xhr, 'statusText', { value: 'OK', writable: false });
                    Object.defineProperty(xhr, 'responseText', { value: '', writable: false });
                    Object.defineProperty(xhr, 'response', { value: '', writable: false });

                    log.protection('Spoofed blocked ad XHR');

                    // Dispatch load event
                    xhr.dispatchEvent(new Event('load'));
                    xhr.dispatchEvent(new Event('loadend'));
                } catch (e) {
                    // If we can't fake it, just let the original error through
                    return originalXHRSend.call(xhr, body);
                }
            }, 50);

            return;
        }

        return originalXHRSend.call(this, body);
    };

    log.init('Ad request spoofing initialized');
}

/**
 * Prevent detection via checking if ad scripts loaded
 * Sites create script elements pointing to ad URLs and check if they loaded
 */
export function initAdScriptProtection(): void {
    if (!settings.misc?.hideAdBlocker) return;

    const adScriptPatterns = [
        /ads\.js/i,
        /advert/i,
        /pagead/i,
        /doubleclick/i,
        /googlesyndication/i,
        /show_ads/i,
        /googleads/i,
        /adsbygoogle/i
    ];

    const isAdScript = (src: string): boolean => {
        return adScriptPatterns.some(pattern => pattern.test(src));
    };

    // Intercept script element creation
    const originalCreateElement = document.createElement.bind(document);

    document.createElement = function <K extends keyof HTMLElementTagNameMap>(
        tagName: K,
        options?: ElementCreationOptions
    ): HTMLElementTagNameMap[K] {
        const element = originalCreateElement(tagName, options);

        if (settings.misc?.hideAdBlocker && tagName.toLowerCase() === 'script') {
            const script = element as HTMLScriptElement;

            // Watch for src changes
            const originalSrcDescriptor = Object.getOwnPropertyDescriptor(
                HTMLScriptElement.prototype, 'src'
            );

            if (originalSrcDescriptor) {
                let currentSrc = '';

                Object.defineProperty(script, 'src', {
                    get: function () {
                        return currentSrc;
                    },
                    set: function (value: string) {
                        currentSrc = value;

                        if (isAdScript(value)) {
                            // Set up fake onload for blocked ad scripts
                            setTimeout(() => {
                                log.protection('Spoofed ad script load', { src: value.substring(0, 50) });

                                // Dispatch load event to make it appear successful
                                script.dispatchEvent(new Event('load'));
                            }, 100);

                            return;
                        }

                        // Set the real src for non-ad scripts
                        originalSrcDescriptor.set?.call(this, value);
                    },
                    configurable: true,
                    enumerable: true
                });
            }
        }

        return element;
    };

    log.init('Ad script protection initialized');
}

/**
 * Spoof image loading for blocked ad-related images
 * Detection scripts create images via innerHTML pointing to blocked URLs
 * This uses MutationObserver to catch ALL images and spoof their properties
 */
export function initImageLoadSpoofing(): void {
    if (!settings.misc?.hideAdBlocker) return;

    const isBlockedAdUrl = (src: string): boolean => {
        if (!src) return false;
        return AD_URL_PATTERNS.some(pattern => pattern.test(src));
    };

    // Track all spoofed images
    const spoofedImages = new WeakSet<HTMLImageElement>();

    // Function to spoof an image element
    const spoofImage = (img: HTMLImageElement) => {
        const src = img.src || img.getAttribute('src') || '';

        if (!src || !isBlockedAdUrl(src) || spoofedImages.has(img)) {
            return;
        }

        spoofedImages.add(img);

        // Override properties on this specific instance
        try {
            Object.defineProperty(img, 'naturalWidth', {
                value: 1,
                writable: false,
                configurable: true
            });
            Object.defineProperty(img, 'naturalHeight', {
                value: 1,
                writable: false,
                configurable: true
            });
            Object.defineProperty(img, 'complete', {
                value: true,
                writable: false,
                configurable: true
            });

            // Dispatch fake load event
            setTimeout(() => {
                log.protection('Spoofed blocked ad image', { src: src.substring(0, 60) });
                img.dispatchEvent(new Event('load', { bubbles: false }));
            }, 10);
        } catch (e) {
            // Property already defined
        }
    };

    // Watch for new images added to DOM via ANY method (including innerHTML)
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // Check added nodes
            for (const node of Array.from(mutation.addedNodes)) {
                if (node instanceof HTMLImageElement) {
                    spoofImage(node);
                } else if (node instanceof Element) {
                    // Check for images inside added elements
                    const images = node.querySelectorAll('img');
                    images.forEach(img => spoofImage(img));
                }
            }

            // Check attribute changes on images (src change)
            if (mutation.type === 'attributes' &&
                mutation.target instanceof HTMLImageElement &&
                mutation.attributeName === 'src') {
                spoofImage(mutation.target);
            }
        }
    });

    // Start observing as early as possible
    // Observe documentElement (html) which exists before body
    const startObserving = (root: Element) => {
        observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src']
        });
    };

    // Observe documentElement immediately if available
    if (document.documentElement) {
        startObserving(document.documentElement);
    }

    // Also observe body when it becomes available (for completeness)
    if (document.body) {
        startObserving(document.body);
    } else {
        // Use multiple events to catch body as early as possible
        const observeBody = () => {
            if (document.body) {
                startObserving(document.body);
            }
        };
        document.addEventListener('DOMContentLoaded', observeBody);
        // Also check on readystatechange for even earlier access
        document.addEventListener('readystatechange', observeBody);
    }

    // Intercept error events at capture phase to stop them for blocked images
    document.addEventListener('error', (e) => {
        if (e.target instanceof HTMLImageElement && spoofedImages.has(e.target)) {
            e.stopImmediatePropagation();
            e.preventDefault();
            // Dispatch load instead
            e.target.dispatchEvent(new Event('load', { bubbles: false }));
            log.protection('Converted image error to load');
        }
    }, true); // capture phase

    // Also intercept addEventListener to redirect error handlers to our fake load
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
    ) {
        // If adding error listener to a spoofed image, make it also listen for load
        if (this instanceof HTMLImageElement &&
            type === 'error' &&
            spoofedImages.has(this)) {
            // Add to load instead
            return originalAddEventListener.call(this, 'load', listener, options);
        }

        return originalAddEventListener.call(this, type, listener, options);
    };

    // Spoof the Image constructor
    const OriginalImage = window.Image;
    (window as any).Image = function (width?: number, height?: number) {
        const img = new OriginalImage(width, height);

        // Watch for src being set
        const originalSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        let _src = '';

        Object.defineProperty(img, 'src', {
            get: () => _src,
            set: (value: string) => {
                _src = value;
                if (isBlockedAdUrl(value)) {
                    spoofImage(img);
                    return; // Don't actually set the src
                }
                originalSrcDesc?.set?.call(img, value);
            },
            configurable: true,
            enumerable: true
        });

        return img;
    };
    (window as any).Image.prototype = OriginalImage.prototype;
    Object.setPrototypeOf((window as any).Image, OriginalImage);

    log.init('Image load spoofing initialized (with MutationObserver)');
}

/**
 * Block MutationObserver from detecting ad element removal
 * Some detection scripts watch for DOM changes that indicate an ad blocker
 */
export function initMutationObserverProtection(): void {
    if (!settings.misc?.hideAdBlocker) return;

    const OriginalMutationObserver = window.MutationObserver;

    window.MutationObserver = class extends OriginalMutationObserver {
        constructor(callback: MutationCallback) {
            // Wrap the callback to filter out ad-related mutations
            const wrappedCallback: MutationCallback = (mutations, observer) => {
                if (!settings.misc?.hideAdBlocker) {
                    return callback(mutations, observer);
                }

                // Filter out mutations that look like ad blocker activity
                const filteredMutations = mutations.filter(mutation => {
                    // Filter removed nodes that look like ad elements
                    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                        for (const node of Array.from(mutation.removedNodes)) {
                            if (node instanceof Element && isAdBaitElement(node)) {
                                log.protection('Filtered ad element removal from MutationObserver');
                                return false;
                            }
                        }
                    }

                    // Filter attribute changes on ad elements (like hiding)
                    if (mutation.type === 'attributes') {
                        const target = mutation.target;
                        if (target instanceof Element && isAdBaitElement(target)) {
                            if (mutation.attributeName === 'style' ||
                                mutation.attributeName === 'class') {
                                log.protection('Filtered ad element style change from MutationObserver');
                                return false;
                            }
                        }
                    }

                    return true;
                });

                // Only call original callback if there are remaining mutations
                if (filteredMutations.length > 0) {
                    callback(filteredMutations, observer);
                }
            };

            super(wrappedCallback);
        }
    };

    // Copy static properties
    Object.setPrototypeOf(window.MutationObserver, OriginalMutationObserver);

    log.init('MutationObserver ad protection initialized');
}

/**
 * Spoof window properties that reveal ad blockers
 * Some extensions add global variables that can be detected
 */
export function initAdBlockerVariableProtection(): void {
    if (!settings.misc?.hideAdBlocker) return;

    // Common ad blocker variables/functions that might be present
    const blockerIndicators = [
        'adblock', 'AdBlock', 'adBlock',
        'uBlock', 'ublock', 'µBlock',
        'Adblock', 'AdBlocker', 'adblocker',
        'blockAdBlock', 'fuckAdBlock', 'FuckAdBlock',
        'sniffAdBlock', 'checkAdBlock', 'detectAdBlock',
        'adblockDetector', 'adBlockDetector'
    ];

    for (const indicator of blockerIndicators) {
        try {
            // Delete if exists
            if (indicator in window) {
                delete (window as any)[indicator];
            }

            // Prevent setting
            Object.defineProperty(window, indicator, {
                get: function () { return undefined; },
                set: function () { }, // Silently ignore
                configurable: true,
                enumerable: false
            });
        } catch (e) {
            // Some properties might be non-configurable
        }
    }

    log.init('Ad blocker variable protection initialized');
}

/**
 * Initialize all ad blocker detection countermeasures
 */
export function initAdBlockerProtection(): void {
    if (!settings.misc?.hideAdBlocker) {
        log.debug('Ad blocker protection disabled');
        return;
    }

    log.init('Initializing ad blocker detection countermeasures...');

    initAdBaitProtection();
    initBoundingRectProtection();
    initOffsetDimensionProtection();
    initAdRequestSpoofing();
    initAdScriptProtection();
    initImageLoadSpoofing();
    initMutationObserverProtection();
    initAdBlockerVariableProtection();

    log.init('Ad blocker protection fully initialized');
}
