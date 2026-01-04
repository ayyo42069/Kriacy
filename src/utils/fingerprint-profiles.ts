import { FingerprintProfile, SpoofSettings } from '../types';

const WINDOWS_PROFILES: FingerprintProfile[] = [
    // Windows 10 + Chrome variants
    {
        id: 'windows10-chrome-intel-uhd620',
        name: 'Windows 10 + Chrome (Intel UHD 620)',
        description: 'Common Windows 10 laptop with Intel integrated graphics',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-intel-uhd630',
        name: 'Windows 10 + Chrome (Intel UHD 630)',
        description: 'Windows 10 desktop with Intel UHD 630',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1.25,
        hardwareConcurrency: 6,
        deviceMemory: 16,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Chicago',
        timezoneOffset: -360,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-intel-iris',
        name: 'Windows 10 + Chrome (Intel Iris Plus)',
        description: 'Premium Windows laptop with Iris Plus graphics',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) Iris Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1536,
        screenHeight: 864,
        colorDepth: 24,
        pixelRatio: 1.25,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'en-GB',
        languages: ['en-GB', 'en'],
        timezone: 'Europe/London',
        timezoneOffset: 0,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-nvidia-gtx1060',
        name: 'Windows 10 + Chrome (GTX 1060)',
        description: 'Gaming PC with NVIDIA GTX 1060',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Denver',
        timezoneOffset: -420,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-nvidia-gtx1070',
        name: 'Windows 10 + Chrome (GTX 1070)',
        description: 'Gaming PC with NVIDIA GTX 1070',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 2560,
        screenHeight: 1440,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'de-DE',
        languages: ['de-DE', 'de', 'en'],
        timezone: 'Europe/Berlin',
        timezoneOffset: 60,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-nvidia-rtx2060',
        name: 'Windows 10 + Chrome (RTX 2060)',
        description: 'RTX gaming PC configuration',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 12,
        deviceMemory: 32,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-nvidia-rtx3060',
        name: 'Windows 10 + Chrome (RTX 3060)',
        description: 'Modern gaming PC with RTX 3060',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 2560,
        screenHeight: 1440,
        colorDepth: 30,
        pixelRatio: 1,
        hardwareConcurrency: 16,
        deviceMemory: 32,
        language: 'fr-FR',
        languages: ['fr-FR', 'fr', 'en'],
        timezone: 'Europe/Paris',
        timezoneOffset: 60,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-nvidia-rtx4070',
        name: 'Windows 10 + Chrome (RTX 4070)',
        description: 'High-end gaming PC with RTX 4070',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 3840,
        screenHeight: 2160,
        colorDepth: 30,
        pixelRatio: 1.5,
        hardwareConcurrency: 16,
        deviceMemory: 32,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-amd-rx580',
        name: 'Windows 10 + Chrome (RX 580)',
        description: 'AMD gaming PC configuration',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (AMD)',
        renderer: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'pt-BR',
        languages: ['pt-BR', 'pt', 'en'],
        timezone: 'America/Sao_Paulo',
        timezoneOffset: -180,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-amd-rx5700',
        name: 'Windows 10 + Chrome (RX 5700 XT)',
        description: 'AMD RX 5700 XT gaming setup',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (AMD)',
        renderer: 'ANGLE (AMD, AMD Radeon RX 5700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 2560,
        screenHeight: 1440,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 12,
        deviceMemory: 32,
        language: 'es-ES',
        languages: ['es-ES', 'es', 'en'],
        timezone: 'Europe/Madrid',
        timezoneOffset: 60,
        maxTouchPoints: 0
    },
    {
        id: 'windows10-chrome-amd-rx6700',
        name: 'Windows 10 + Chrome (RX 6700 XT)',
        description: 'Modern AMD gaming configuration',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (AMD)',
        renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 16,
        deviceMemory: 32,
        language: 'ru-RU',
        languages: ['ru-RU', 'ru', 'en'],
        timezone: 'Europe/Moscow',
        timezoneOffset: 180,
        maxTouchPoints: 0
    },
    // Windows 11 variants
    {
        id: 'windows11-chrome-intel',
        name: 'Windows 11 + Chrome (Intel)',
        description: 'Windows 11 with Intel integrated graphics',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1.25,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 0
    },
    // Windows + Firefox
    {
        id: 'windows10-firefox',
        name: 'Windows 10 + Firefox',
        description: 'Windows 10 with Firefox browser',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        platform: 'Win32',
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 0
    },
    // Windows + Edge
    {
        id: 'windows10-edge',
        name: 'Windows 10 + Edge',
        description: 'Windows 10 with Microsoft Edge',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        platform: 'Win32',
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        screenWidth: 1366,
        screenHeight: 768,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 4,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Chicago',
        timezoneOffset: -360,
        maxTouchPoints: 0
    },
];

const MACOS_PROFILES: FingerprintProfile[] = [
    {
        id: 'macos-chrome-m1',
        name: 'macOS + Chrome (M1)',
        description: 'Apple Silicon M1 Mac with Chrome',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)',
        screenWidth: 1440,
        screenHeight: 900,
        colorDepth: 30,
        pixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 0
    },
    {
        id: 'macos-chrome-m2',
        name: 'macOS + Chrome (M2)',
        description: 'Apple Silicon M2 Mac with Chrome',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)',
        screenWidth: 1512,
        screenHeight: 982,
        colorDepth: 30,
        pixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 0
    },
    {
        id: 'macos-chrome-m3',
        name: 'macOS + Chrome (M3)',
        description: 'Apple Silicon M3 Mac with Chrome',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M3, OpenGL 4.1)',
        screenWidth: 1728,
        screenHeight: 1117,
        colorDepth: 30,
        pixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 24,
        language: 'en-GB',
        languages: ['en-GB', 'en'],
        timezone: 'Europe/London',
        timezoneOffset: 0,
        maxTouchPoints: 0
    },
    {
        id: 'macos-safari-m1',
        name: 'macOS + Safari (M1)',
        description: 'Apple Silicon M1 with Safari',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        platform: 'MacIntel',
        vendor: 'Apple Inc.',
        renderer: 'Apple M1',
        screenWidth: 1440,
        screenHeight: 900,
        colorDepth: 30,
        pixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 0
    },
    {
        id: 'macos-safari-m2',
        name: 'macOS + Safari (M2)',
        description: 'Apple Silicon M2 with Safari',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
        platform: 'MacIntel',
        vendor: 'Apple Inc.',
        renderer: 'Apple M2',
        screenWidth: 1512,
        screenHeight: 982,
        colorDepth: 30,
        pixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'ja-JP',
        languages: ['ja-JP', 'ja', 'en'],
        timezone: 'Asia/Tokyo',
        timezoneOffset: 540,
        maxTouchPoints: 0
    },
    {
        id: 'macos-firefox',
        name: 'macOS + Firefox',
        description: 'macOS with Firefox browser',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
        platform: 'MacIntel',
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)',
        screenWidth: 1440,
        screenHeight: 900,
        colorDepth: 30,
        pixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 0
    },
];

const LINUX_PROFILES: FingerprintProfile[] = [
    {
        id: 'linux-chrome-intel',
        name: 'Linux + Chrome (Intel Mesa)',
        description: 'Ubuntu/Fedora with Intel integrated graphics',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        vendor: 'Mesa/X.org',
        renderer: 'Mesa Intel(R) UHD Graphics 620 (KBL GT2)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'Europe/Berlin',
        timezoneOffset: 60,
        maxTouchPoints: 0
    },
    {
        id: 'linux-chrome-amd',
        name: 'Linux + Chrome (AMD Mesa)',
        description: 'Linux with AMD Radeon graphics',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        vendor: 'Mesa/AMD',
        renderer: 'AMD Radeon Graphics (renoir, LLVM 15.0.7, DRM 3.49, 6.1.0-17-amd64)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 16,
        deviceMemory: 16,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'Europe/London',
        timezoneOffset: 0,
        maxTouchPoints: 0
    },
    {
        id: 'linux-firefox-intel',
        name: 'Linux + Firefox (Intel)',
        description: 'Common Linux Firefox with Intel graphics',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        platform: 'Linux x86_64',
        vendor: 'Mesa/X.org',
        renderer: 'Mesa Intel(R) HD Graphics 530 (SKL GT2)',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'de-DE',
        languages: ['de-DE', 'de', 'en'],
        timezone: 'Europe/Berlin',
        timezoneOffset: 60,
        maxTouchPoints: 0
    },
    {
        id: 'linux-firefox-nvidia',
        name: 'Linux + Firefox (NVIDIA)',
        description: 'Linux with NVIDIA proprietary drivers',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
        platform: 'Linux x86_64',
        vendor: 'NVIDIA Corporation',
        renderer: 'NVIDIA GeForce GTX 1080/PCIe/SSE2',
        screenWidth: 2560,
        screenHeight: 1440,
        colorDepth: 24,
        pixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 0
    },
];

const ANDROID_PROFILES: FingerprintProfile[] = [
    {
        id: 'android-chrome-pixel7',
        name: 'Android Chrome (Pixel 7)',
        description: 'Google Pixel 7 with Chrome',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        vendor: 'Qualcomm',
        renderer: 'Adreno (TM) 730',
        screenWidth: 412,
        screenHeight: 915,
        colorDepth: 24,
        pixelRatio: 2.625,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 5
    },
    {
        id: 'android-chrome-pixel8',
        name: 'Android Chrome (Pixel 8)',
        description: 'Google Pixel 8 with Chrome',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        vendor: 'Google',
        renderer: 'Mali-G715',
        screenWidth: 412,
        screenHeight: 932,
        colorDepth: 24,
        pixelRatio: 2.625,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 5
    },
    {
        id: 'android-chrome-samsung-s23',
        name: 'Android Chrome (Samsung S23)',
        description: 'Samsung Galaxy S23 with Chrome',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        vendor: 'Qualcomm',
        renderer: 'Adreno (TM) 740',
        screenWidth: 360,
        screenHeight: 780,
        colorDepth: 24,
        pixelRatio: 3,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'Europe/London',
        timezoneOffset: 0,
        maxTouchPoints: 10
    },
    {
        id: 'android-chrome-samsung-s24',
        name: 'Android Chrome (Samsung S24)',
        description: 'Samsung Galaxy S24 Ultra with Chrome',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        vendor: 'Qualcomm',
        renderer: 'Adreno (TM) 750',
        screenWidth: 384,
        screenHeight: 854,
        colorDepth: 24,
        pixelRatio: 3.75,
        hardwareConcurrency: 8,
        deviceMemory: 12,
        language: 'ko-KR',
        languages: ['ko-KR', 'ko', 'en'],
        timezone: 'Asia/Seoul',
        timezoneOffset: 540,
        maxTouchPoints: 10
    },
    {
        id: 'android-chrome-oneplus',
        name: 'Android Chrome (OnePlus 11)',
        description: 'OnePlus 11 with Chrome',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        vendor: 'Qualcomm',
        renderer: 'Adreno (TM) 730',
        screenWidth: 412,
        screenHeight: 919,
        colorDepth: 24,
        pixelRatio: 3.5,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: 'zh-CN',
        languages: ['zh-CN', 'en'],
        timezone: 'Asia/Shanghai',
        timezoneOffset: 480,
        maxTouchPoints: 10
    },
    {
        id: 'android-firefox',
        name: 'Android Firefox',
        description: 'Android with Firefox mobile',
        userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:122.0) Gecko/122.0 Firefox/122.0',
        platform: 'Linux armv8l',
        vendor: 'Qualcomm',
        renderer: 'Adreno (TM) 660',
        screenWidth: 360,
        screenHeight: 800,
        colorDepth: 24,
        pixelRatio: 3,
        hardwareConcurrency: 8,
        deviceMemory: 6,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Chicago',
        timezoneOffset: -360,
        maxTouchPoints: 5
    },
];

const IOS_PROFILES: FingerprintProfile[] = [
    {
        id: 'iphone-safari-15pro',
        name: 'iPhone 15 Pro + Safari',
        description: 'iPhone 15 Pro with Safari',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        vendor: 'Apple Inc.',
        renderer: 'Apple GPU',
        screenWidth: 393,
        screenHeight: 852,
        colorDepth: 32,
        pixelRatio: 3,
        hardwareConcurrency: 6,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        timezoneOffset: -480,
        maxTouchPoints: 5
    },
    {
        id: 'iphone-safari-15promax',
        name: 'iPhone 15 Pro Max + Safari',
        description: 'iPhone 15 Pro Max with Safari',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        vendor: 'Apple Inc.',
        renderer: 'Apple GPU',
        screenWidth: 430,
        screenHeight: 932,
        colorDepth: 32,
        pixelRatio: 3,
        hardwareConcurrency: 6,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/New_York',
        timezoneOffset: -300,
        maxTouchPoints: 5
    },
    {
        id: 'iphone-safari-14pro',
        name: 'iPhone 14 Pro + Safari',
        description: 'iPhone 14 Pro with Safari',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        vendor: 'Apple Inc.',
        renderer: 'Apple GPU',
        screenWidth: 393,
        screenHeight: 852,
        colorDepth: 32,
        pixelRatio: 3,
        hardwareConcurrency: 6,
        deviceMemory: 6,
        language: 'ja-JP',
        languages: ['ja-JP', 'ja', 'en'],
        timezone: 'Asia/Tokyo',
        timezoneOffset: 540,
        maxTouchPoints: 5
    },
    {
        id: 'iphone-chrome',
        name: 'iPhone + Chrome',
        description: 'iPhone with Chrome browser',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        vendor: 'Apple Inc.',
        renderer: 'Apple GPU',
        screenWidth: 390,
        screenHeight: 844,
        colorDepth: 32,
        pixelRatio: 3,
        hardwareConcurrency: 6,
        deviceMemory: 4,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'America/Chicago',
        timezoneOffset: -360,
        maxTouchPoints: 5
    },
    {
        id: 'ipad-safari',
        name: 'iPad Pro + Safari',
        description: 'iPad Pro with Safari',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        vendor: 'Apple Inc.',
        renderer: 'Apple GPU',
        screenWidth: 1024,
        screenHeight: 1366,
        colorDepth: 32,
        pixelRatio: 2,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: 'en-US',
        languages: ['en-US', 'en'],
        timezone: 'Europe/London',
        timezoneOffset: 0,
        maxTouchPoints: 10
    },
];

export const FINGERPRINT_PROFILES: FingerprintProfile[] = [
    ...WINDOWS_PROFILES,
    ...MACOS_PROFILES,
    ...LINUX_PROFILES,
    ...ANDROID_PROFILES,
    ...IOS_PROFILES,
];

export const getWindowsProfiles = () => WINDOWS_PROFILES;
export const getMacOSProfiles = () => MACOS_PROFILES;
export const getLinuxProfiles = () => LINUX_PROFILES;
export const getAndroidProfiles = () => ANDROID_PROFILES;
export const getIOSProfiles = () => IOS_PROFILES;

export const getDesktopProfiles = () => [...WINDOWS_PROFILES, ...MACOS_PROFILES, ...LINUX_PROFILES];
export const getMobileProfiles = () => [...ANDROID_PROFILES, ...IOS_PROFILES];

export function getProfileById(id: string): FingerprintProfile | undefined {
    return FINGERPRINT_PROFILES.find(p => p.id === id);
}

export function getRandomProfile(): FingerprintProfile {
    const index = Math.floor(Math.random() * FINGERPRINT_PROFILES.length);
    return FINGERPRINT_PROFILES[index];
}

export function getRandomProfileFromCategory(category: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'desktop' | 'mobile'): FingerprintProfile {
    let profiles: FingerprintProfile[];

    switch (category) {
        case 'windows': profiles = WINDOWS_PROFILES; break;
        case 'macos': profiles = MACOS_PROFILES; break;
        case 'linux': profiles = LINUX_PROFILES; break;
        case 'android': profiles = ANDROID_PROFILES; break;
        case 'ios': profiles = IOS_PROFILES; break;
        case 'desktop': profiles = getDesktopProfiles(); break;
        case 'mobile': profiles = getMobileProfiles(); break;
        default: profiles = FINGERPRINT_PROFILES;
    }

    const index = Math.floor(Math.random() * profiles.length);
    return profiles[index];
}

export function getProfileWithUserDefaults(settings?: SpoofSettings | null, baseProfile?: FingerprintProfile): FingerprintProfile {
    // Start with base profile or the first Windows profile as default
    const base = baseProfile || FINGERPRINT_PROFILES[0];

    // If no settings provided, just return the base profile
    if (!settings) {
        return base;
    }

    // Build profile using user settings where configured, fallback to base profile
    return {
        id: base.id,
        name: base.name,
        description: base.description,

        // User Agent - use default if not specifically configured
        userAgent: settings.navigator?.userAgent || base.userAgent,

        // Platform from navigator settings
        platform: settings.navigator?.platform || base.platform,

        // GPU settings from WebGL
        vendor: settings.webgl?.vendor || base.vendor,
        renderer: settings.webgl?.renderer || base.renderer,

        // Screen settings
        screenWidth: settings.screen?.width || base.screenWidth,
        screenHeight: settings.screen?.height || base.screenHeight,
        colorDepth: settings.screen?.colorDepth || base.colorDepth,
        pixelRatio: settings.screen?.pixelRatio || base.pixelRatio,

        // Hardware settings from navigator
        hardwareConcurrency: settings.navigator?.hardwareConcurrency || base.hardwareConcurrency,
        deviceMemory: settings.navigator?.deviceMemory || base.deviceMemory,
        maxTouchPoints: settings.navigator?.maxTouchPoints ?? base.maxTouchPoints,

        // Language settings
        language: settings.navigator?.language || base.language,
        languages: settings.navigator?.languages?.length ? settings.navigator.languages : base.languages,

        // Timezone settings
        timezone: settings.timezone?.timezone || base.timezone,
        timezoneOffset: settings.timezone?.offset ?? base.timezoneOffset,
    };
}

/**
 * Get a random profile with user settings applied as defaults
 * 
 * Picks a random profile but applies the user's existing settings as overrides.
 * This is useful for "randomize" functionality while preserving user preferences.
 * 
 * @param settings - Current user settings from storage  
 * @param category - Optional category to limit random selection
 */
export function getRandomProfileWithUserDefaults(
    settings?: SpoofSettings | null,
    category?: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'desktop' | 'mobile'
): FingerprintProfile {
    const randomBase = category
        ? getRandomProfileFromCategory(category)
        : getRandomProfile();

    return getProfileWithUserDefaults(settings, randomBase);
}

/**
 * Create settings from a fingerprint profile
 * 
 * Converts a fingerprint profile into the format used by SpoofSettings.
 * Useful when applying a profile to save as user settings.
 * 
 * @param profile - The fingerprint profile to convert
 * @param existingSettings - Optional existing settings to merge with
 */
export function createSettingsFromProfile(profile: FingerprintProfile, existingSettings?: Partial<SpoofSettings>): Partial<SpoofSettings> {
    return {
        ...existingSettings,
        webgl: {
            enabled: existingSettings?.webgl?.enabled ?? true,
            vendor: profile.vendor,
            renderer: profile.renderer,
        },
        navigator: {
            enabled: existingSettings?.navigator?.enabled ?? true,
            userAgent: profile.userAgent,
            platform: profile.platform,
            language: profile.language,
            languages: profile.languages,
            hardwareConcurrency: profile.hardwareConcurrency,
            deviceMemory: profile.deviceMemory,
            maxTouchPoints: profile.maxTouchPoints,
        },
        screen: {
            enabled: existingSettings?.screen?.enabled ?? true,
            width: profile.screenWidth,
            height: profile.screenHeight,
            colorDepth: profile.colorDepth,
            pixelRatio: profile.pixelRatio,
        },
        timezone: {
            enabled: existingSettings?.timezone?.enabled ?? true,
            timezone: profile.timezone,
            offset: profile.timezoneOffset,
        },
    };
}

/**
 * Generate consistent random values based on a seed
 */
export function seededRandom(seed: number): () => number {
    return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

/**
 * Get a seeded random profile (consistent for the same seed)
 */
export function getSeededProfile(seed: number): FingerprintProfile {
    const random = seededRandom(seed);
    const index = Math.floor(random() * FINGERPRINT_PROFILES.length);
    return FINGERPRINT_PROFILES[index];
}
