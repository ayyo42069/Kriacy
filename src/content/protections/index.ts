// Barrel exports for all protection modules

export { initCanvasProtection, initClientRectsProtection, initSVGRectsProtection, modifyImageData } from './canvas';
export { initAudioProtection } from './audio';
export { initWebGLProtection } from './webgl';
export { initWebRTCProtection } from './webrtc';
export { initNavigatorSpoofing, initUserAgentDataSpoofing } from './navigator';
export { initScreenSpoofing, initWindowDimensionsSpoofing } from './screen';
export { initMediaQuerySpoofing, initPrefersMediaQuerySpoofing } from './media-query';
export { initGeolocationSpoofing } from './geolocation';
export { initTimezoneSpoofing } from './timezone';
export { initSpeechVoicesSpoofing, initMediaDevicesSpoofing, initCodecSupportSpoofing, initDRMSpoofing } from './media';
export { initBatterySpoofing, initNetworkSpoofing, initPluginsSpoofing } from './network';
export { initFontProtection } from './fonts';
export { initCSSProtection } from './css';
export { initAllMiscProtections } from './misc';
export { initAdBlockerProtection } from './adblocker';
export { initWebGLCanvasProtection } from './webgl-canvas';
export { initTextRenderingProtection } from './text-rendering';
export { initStealthProtections, finalizeWebGLStealth, makeNative, patchMethod, patchGetter } from './stealth';
