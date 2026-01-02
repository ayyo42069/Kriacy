// Main World Script - Runs in the page's JavaScript context
// CRITICAL: This MUST run before any page scripts to effectively spoof fingerprints
// This file imports all modular protections and initializes them

// IMPORTANT: Stealth must be imported and initialized FIRST to patch Function.prototype.toString
// before any other protections are applied
import { initStealthProtections, finalizeWebGLStealth } from './protections/stealth';

// Worker injection must be imported early to intercept Blob/Worker before page scripts run
import { initWorkerProtection, setGPUProfile, setWorkerSettings } from './protections/worker-inject';

import { initSettingsListeners, getFingerprintSeed, settings } from './core/state';
import { initCanvasProtection, initClientRectsProtection } from './protections/canvas';
import { initAudioProtection } from './protections/audio';
import { initWebGLProtection } from './protections/webgl';
import { initWebRTCProtection } from './protections/webrtc';
import { initNavigatorSpoofing, initUserAgentDataSpoofing } from './protections/navigator';
import { initScreenSpoofing, initWindowDimensionsSpoofing } from './protections/screen';
import { initMediaQuerySpoofing, initPrefersMediaQuerySpoofing } from './protections/media-query';
import { initGeolocationSpoofing } from './protections/geolocation';
import { initTimezoneSpoofing } from './protections/timezone';
import { initSpeechVoicesSpoofing, initMediaDevicesSpoofing, initCodecSupportSpoofing, initDRMSpoofing } from './protections/media';
import { initBatterySpoofing, initNetworkSpoofing, initPluginsSpoofing } from './protections/network';
import { initFontProtection } from './protections/fonts';
import { initCSSProtection } from './protections/css';
import { initAllMiscProtections } from './protections/misc';
import { initWebGLCanvasProtection } from './protections/webgl-canvas';
import { initTextRenderingProtection } from './protections/text-rendering';

(function () {
    'use strict';

    // Prevent re-initialization
    if ((window as any).__KRIACY_INITIALIZED__) return;
    (window as any).__KRIACY_INITIALIZED__ = true;

    // ============================================
    // Initialize Stealth Protections FIRST
    // This patches Function.prototype.toString before any other modifications
    // ============================================
    initStealthProtections();

    // ============================================
    // Initialize Worker Protection SECOND
    // This intercepts Blob/Worker creation to inject consistent fingerprinting
    // Must be done before any page scripts can create Workers
    // ============================================
    initWorkerProtection();

    // ============================================
    // CRITICAL: Set GPU profile IMMEDIATELY after worker protection
    // This ensures workers created by page scripts will have the correct values
    // ============================================
    if (settings.webgl?.enabled) {
        const vendor = settings.webgl.vendor || 'Google Inc. (Intel)';
        const renderer = settings.webgl.renderer || 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        setGPUProfile(vendor, renderer);
        console.log('[Kriacy] GPU profile set for workers:', { vendor, renderer });
    }

    // Also set navigator settings for workers
    if (settings.navigator?.enabled) {
        setWorkerSettings({
            hardwareConcurrency: settings.navigator.hardwareConcurrency,
            deviceMemory: settings.navigator.deviceMemory,
            platform: settings.navigator.platform,
            userAgent: settings.navigator.userAgent,
            language: settings.navigator.language,
            languages: settings.navigator.languages,
        });
    }

    // ============================================
    // Initialize All Protections
    // ============================================

    // Initialize settings listeners first
    initSettingsListeners();

    // Canvas and Client Rects
    initCanvasProtection();
    initClientRectsProtection();

    // Audio
    initAudioProtection();

    // WebGL
    initWebGLProtection();
    // Finalize WebGL stealth AFTER WebGL protection patches the methods
    finalizeWebGLStealth();

    // WebRTC
    initWebRTCProtection();

    // Navigator and UserAgentData
    initNavigatorSpoofing();
    initUserAgentDataSpoofing();

    // Screen and Window Dimensions
    initScreenSpoofing();
    initWindowDimensionsSpoofing();

    // Media Query Spoofing (safe version with recursion guard)
    initMediaQuerySpoofing();
    initPrefersMediaQuerySpoofing();

    // Geolocation
    initGeolocationSpoofing();

    // Timezone (safe version - only getTimezoneOffset)
    initTimezoneSpoofing();

    // Media (Speech, Devices, Codecs, DRM)
    initSpeechVoicesSpoofing();
    initMediaDevicesSpoofing();
    initCodecSupportSpoofing();
    initDRMSpoofing();

    // Network (Battery, Network Info, Plugins)
    initBatterySpoofing();
    initNetworkSpoofing();
    initPluginsSpoofing();

    // Fonts
    initFontProtection();

    // CSS/System Styles
    initCSSProtection();

    // Miscellaneous Protections
    initAllMiscProtections();

    // WebGL Canvas (GPU) Fingerprint Protection
    initWebGLCanvasProtection();

    // Text/Emoji Rendering Protection
    initTextRenderingProtection();

    // ============================================
    // Initialization Complete
    // ============================================

    console.log('[Kriacy] All protections active! Session:', getFingerprintSeed().toString(16));
    console.log('[Kriacy] Modules loaded: Stealth, Canvas, Audio, WebGL, WebGL-Canvas, WebRTC, Navigator, Screen, MediaQuery, Geolocation, Timezone, Media, Network, Fonts, CSS, Misc, TextRender');

})();
