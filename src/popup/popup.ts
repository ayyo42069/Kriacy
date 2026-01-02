// Kriacy Popup Script

interface SpoofSettings {
    enabled: boolean;
    profile: 'minimal' | 'balanced' | 'aggressive' | 'custom';
    fingerprintSeed?: number;
    webrtc: { enabled: boolean };
    canvas: { enabled: boolean; noiseLevel?: number };
    webgl: { enabled: boolean; vendor?: string; renderer?: string };
    fonts: { enabled: boolean };
    screen: { enabled: boolean; width?: number; height?: number };
    geolocation: { enabled: boolean };
    audio?: { enabled: boolean };
    navigator?: { enabled: boolean; platform?: string; hardwareConcurrency?: number };
}

// DOM Elements
const masterToggle = document.getElementById('masterToggle') as HTMLInputElement;
const statusBar = document.getElementById('statusBar') as HTMLDivElement;
const statusText = document.getElementById('statusText') as HTMLSpanElement;
const profileBtns = document.querySelectorAll('.profile-btn');
const optionsBtn = document.getElementById('optionsBtn') as HTMLButtonElement;
const logsBtn = document.getElementById('logsBtn') as HTMLButtonElement;
const randomizeBtn = document.getElementById('randomizeBtn') as HTMLButtonElement;

let currentSettings: SpoofSettings | null = null;

// Initialize popup
async function init(): Promise<void> {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
        if (response?.success) {
            currentSettings = response.data;
            updateUI();
        }
    } catch (error) {
        console.error('[Kriacy] Failed to get settings:', error);
    }
}

// Update UI based on settings
function updateUI(): void {
    if (!currentSettings) return;

    // Master toggle
    if (masterToggle) {
        masterToggle.checked = currentSettings.enabled;
    }

    // Status bar
    if (statusBar && statusText) {
        if (currentSettings.enabled) {
            statusBar.classList.remove('disabled');
            statusText.textContent = 'Protection Active';
        } else {
            statusBar.classList.add('disabled');
            statusText.textContent = 'Protection Disabled';
        }
    }

    // Profile buttons
    profileBtns.forEach(btn => {
        const profile = (btn as HTMLButtonElement).dataset.profile;
        btn.classList.toggle('active', profile === currentSettings?.profile);
    });
}

// Save settings
async function saveSettings(): Promise<void> {
    if (!currentSettings) return;

    try {
        await chrome.runtime.sendMessage({
            action: 'SET_SETTINGS',
            payload: currentSettings
        });
    } catch (error) {
        console.error('[Kriacy] Failed to save settings:', error);
    }
}

// Randomize all fingerprint values
async function randomizeAll(): Promise<void> {
    console.log('[Kriacy Popup] Randomize button clicked');

    try {
        const response = await chrome.runtime.sendMessage({ action: 'RANDOMIZE_ALL' });
        console.log('[Kriacy Popup] Randomize response:', response);

        if (response?.success) {
            // Update local settings with new randomized values
            currentSettings = response.data;

            // Visual feedback - success
            if (randomizeBtn) {
                const originalText = randomizeBtn.innerHTML;
                randomizeBtn.innerHTML = '<span>✓</span><span>Randomized!</span>';
                randomizeBtn.style.background = 'linear-gradient(135deg, #8fbc8f, #6b9b6b)';

                setTimeout(() => {
                    randomizeBtn.innerHTML = originalText;
                    randomizeBtn.style.background = '';
                }, 1500);
            }
        } else {
            console.error('[Kriacy Popup] Randomize failed:', response?.error);
            // Visual feedback - error
            if (randomizeBtn) {
                const originalText = randomizeBtn.innerHTML;
                randomizeBtn.innerHTML = '<span>✗</span><span>Failed</span>';
                randomizeBtn.style.background = 'linear-gradient(135deg, #cd8b8b, #b57070)';

                setTimeout(() => {
                    randomizeBtn.innerHTML = originalText;
                    randomizeBtn.style.background = '';
                }, 1500);
            }
        }
    } catch (error) {
        console.error('[Kriacy Popup] Failed to randomize:', error);
    }
}

// Event Listeners

// Master toggle
if (masterToggle) {
    masterToggle.addEventListener('change', async () => {
        if (!currentSettings) return;
        currentSettings.enabled = masterToggle.checked;
        updateUI();
        await saveSettings();
    });
}

// Profile buttons
profileBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        if (!currentSettings) return;
        const profile = (btn as HTMLButtonElement).dataset.profile as SpoofSettings['profile'];
        currentSettings.profile = profile;

        // Apply profile presets
        switch (profile) {
            case 'minimal':
                currentSettings.webrtc = { enabled: true };
                currentSettings.canvas = { enabled: false };
                currentSettings.webgl = { enabled: false };
                currentSettings.fonts = { enabled: false };
                currentSettings.screen = { enabled: false };
                currentSettings.geolocation = { enabled: true };
                break;

            case 'balanced':
                currentSettings.webrtc = { enabled: true };
                currentSettings.canvas = { enabled: true };
                currentSettings.webgl = { enabled: true };
                currentSettings.fonts = { enabled: true };
                currentSettings.screen = { enabled: true };
                currentSettings.geolocation = { enabled: true };
                break;

            case 'aggressive':
                currentSettings.webrtc = { enabled: true };
                currentSettings.canvas = { enabled: true };
                currentSettings.webgl = { enabled: true };
                currentSettings.fonts = { enabled: true };
                currentSettings.screen = { enabled: true };
                currentSettings.geolocation = { enabled: true };
                break;
        }

        updateUI();
        await saveSettings();
    });
});

// Randomize button
if (randomizeBtn) {
    randomizeBtn.addEventListener('click', randomizeAll);
}

// Options button
if (optionsBtn) {
    optionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

// Logs button
if (logsBtn) {
    logsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('logs.html') });
    });
}

// Initialize
init();
