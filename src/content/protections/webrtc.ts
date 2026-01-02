// WebRTC protection

import { settings } from '../core/state';
import { logSpoofAccess } from '../../utils/logger';

/**
 * Initialize WebRTC protection
 * Modes:
 * - 'block': Completely block RTCPeerConnection
 * - 'disable_non_proxied': Remove ICE servers to prevent IP leak
 * - 'default': Allow WebRTC without modification
 */
export function initWebRTCProtection(): void {
    const OriginalRTCPeerConnection = window.RTCPeerConnection;

    if (OriginalRTCPeerConnection) {
        (window as any).RTCPeerConnection = function (config?: RTCConfiguration): RTCPeerConnection {
            if (settings.webrtc?.enabled && settings.webrtc.mode !== 'default') {
                if (settings.webrtc.mode === 'block') {
                    logSpoofAccess('webrtc', 'RTCPeerConnection.blocked');
                    throw new DOMException('RTCPeerConnection is blocked', 'NotAllowedError');
                }

                if (settings.webrtc.mode === 'disable_non_proxied' && config?.iceServers) {
                    logSpoofAccess('webrtc', 'RTCPeerConnection.ice_disabled');
                    config.iceServers = [];
                }
            }

            return new OriginalRTCPeerConnection(config);
        };

        (window.RTCPeerConnection as any).prototype = OriginalRTCPeerConnection.prototype;
        Object.setPrototypeOf(window.RTCPeerConnection, OriginalRTCPeerConnection);
    }
}
