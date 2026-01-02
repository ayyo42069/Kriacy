// Kriacy Logs Viewer - Cozy Modern Theme
// Smart updates: only refresh when new logs are detected

interface SpoofLogEntry {
    id: string;
    timestamp: number;
    url: string;
    hostname: string;
    apiType: string;
    method: string;
    details?: string;
    count?: number;
}

interface ApiStats {
    [key: string]: number;
}

// Configuration
const CONFIG = {
    REFRESH_INTERVAL: 5000, // Check every 5 seconds
    ITEMS_PER_PAGE: 50,
    DEBOUNCE_DELAY: 300,
};

// API Colors for chart (warm cozy palette)
const API_COLORS: { [key: string]: string } = {
    canvas: '#d4a0a0',
    webgl: '#daa06d',
    'webgl-canvas': '#daa06d',
    audio: '#a3c9a3',
    navigator: '#a3c9d4',
    screen: '#c4b0d4',
    geolocation: '#d4a0b8',
    webrtc: '#a3c9be',
    timezone: '#d4a574',
    battery: '#c4c9a3',
    network: '#a3c9d4',
    fonts: '#c4b0d4',
    media: '#d4a0ae',
    misc: '#b0b0a0',
    svg: '#d4a0b0',
    'text-render': '#b8c9a3',
};

// DOM Elements
const elements = {
    totalBlocked: document.getElementById('totalBlocked') as HTMLSpanElement,
    uniqueSites: document.getElementById('uniqueSites') as HTMLSpanElement,
    topApi: document.getElementById('topApi') as HTMLSpanElement,
    lastUpdate: document.getElementById('lastUpdate') as HTMLSpanElement,

    searchInput: document.getElementById('searchInput') as HTMLInputElement,
    searchClear: document.getElementById('searchClear') as HTMLElement,
    apiFilter: document.getElementById('apiFilter') as HTMLSelectElement,
    pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
    refreshBtn: document.getElementById('refreshBtn') as HTMLButtonElement,
    exportBtn: document.getElementById('exportBtn') as HTMLButtonElement,
    clearBtn: document.getElementById('clearBtn') as HTMLButtonElement,

    liveIndicator: document.getElementById('liveIndicator') as HTMLDivElement,
    apiBreakdown: document.getElementById('apiBreakdown') as HTMLDivElement,
    logsTable: document.getElementById('logsTable') as HTMLTableElement,
    logsBody: document.getElementById('logsBody') as HTMLTableSectionElement,
    emptyState: document.getElementById('emptyState') as HTMLDivElement,
    displayedCount: document.getElementById('displayedCount') as HTMLSpanElement,
    loadMoreWrapper: document.getElementById('loadMoreWrapper') as HTMLDivElement,
    loadMoreBtn: document.getElementById('loadMoreBtn') as HTMLButtonElement,

    modal: document.getElementById('logDetailModal') as HTMLDivElement,
    modalBody: document.getElementById('modalBody') as HTMLDivElement,
    closeModal: document.getElementById('closeModal') as HTMLButtonElement,

    toast: document.getElementById('toast') as HTMLDivElement,
    toastMessage: document.getElementById('toastMessage') as HTMLSpanElement,
};

// State
let allLogs: SpoofLogEntry[] = [];
let lastLogHash = ''; // Track if logs changed
let isPaused = false;
let refreshInterval: number | null = null;
let currentPage = 1;

/**
 * Generate a hash of logs to detect changes
 */
function generateLogHash(logs: SpoofLogEntry[]): string {
    if (logs.length === 0) return 'empty';

    // Hash based on count of logs and sum of counts + latest timestamp
    let totalCount = 0;
    let latestTimestamp = 0;

    for (const log of logs) {
        totalCount += log.count || 1;
        if (log.timestamp > latestTimestamp) {
            latestTimestamp = log.timestamp;
        }
    }

    return `${logs.length}-${totalCount}-${latestTimestamp}`;
}

/**
 * Format timestamp to readable time string
 */
function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    if (isToday) {
        return time;
    }

    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

/**
 * Format relative time (e.g., "2m ago")
 */
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

/**
 * Load logs from service worker
 */
async function loadLogs(): Promise<SpoofLogEntry[]> {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_LOGS' });
        if (response?.success && response.data) {
            return response.data;
        }
        return [];
    } catch (e) {
        console.error('[Kriacy Logs] Error loading logs:', e);
        return [];
    }
}

/**
 * Clear all logs
 */
async function clearAllLogs(): Promise<void> {
    try {
        await chrome.runtime.sendMessage({ action: 'CLEAR_LOGS' });
        showToast('All logs cleared');
    } catch (e) {
        console.error('[Kriacy Logs] Error clearing logs:', e);
        showToast('Failed to clear logs');
    }
}

/**
 * Update statistics (without flashing)
 */
function updateStats(logs: SpoofLogEntry[]): void {
    const totalCount = logs.reduce((acc, log) => acc + (log.count || 1), 0);
    elements.totalBlocked.textContent = totalCount.toLocaleString();

    const uniqueHostnames = new Set(logs.map(l => l.hostname));
    elements.uniqueSites.textContent = uniqueHostnames.size.toString();

    if (logs.length > 0) {
        const apiCounts: ApiStats = {};
        logs.forEach(l => {
            const count = l.count || 1;
            apiCounts[l.apiType] = (apiCounts[l.apiType] || 0) + count;
        });

        const topApi = Object.entries(apiCounts)
            .sort((a, b) => b[1] - a[1])[0];

        if (topApi) {
            elements.topApi.textContent = capitalizeFirst(topApi[0]);
        }

        const latestTimestamp = Math.max(...logs.map(l => l.timestamp));
        elements.lastUpdate.textContent = formatRelativeTime(latestTimestamp);
    } else {
        elements.topApi.textContent = '-';
        elements.lastUpdate.textContent = '-';
    }
}

/**
 * Update API breakdown chart
 */
function updateApiBreakdown(logs: SpoofLogEntry[]): void {
    const apiCounts: ApiStats = {};
    let total = 0;

    logs.forEach(l => {
        const count = l.count || 1;
        apiCounts[l.apiType] = (apiCounts[l.apiType] || 0) + count;
        total += count;
    });

    const sortedApis = Object.entries(apiCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    if (sortedApis.length === 0) {
        elements.apiBreakdown.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 16px;">No data yet</div>';
        return;
    }

    const maxCount = sortedApis[0][1];

    let html = '';
    sortedApis.forEach(([api, count]) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const width = (count / maxCount) * 100;
        const color = API_COLORS[api] || API_COLORS.misc;

        html += `
            <div class="api-bar-item">
                <span class="api-bar-label">${api}</span>
                <div class="api-bar-track">
                    <div class="api-bar-fill" style="width: ${width}%; background: ${color};" data-count="${count}"></div>
                </div>
                <span class="api-bar-percentage">${percentage}%</span>
            </div>
        `;
    });

    elements.apiBreakdown.innerHTML = html;
}

/**
 * Get filtered logs
 */
function getFilteredLogs(): SpoofLogEntry[] {
    const apiValue = elements.apiFilter.value;
    const searchValue = elements.searchInput.value.toLowerCase().trim();

    return allLogs.filter(log => {
        if (apiValue !== 'all' && log.apiType !== apiValue) {
            return false;
        }

        if (searchValue) {
            const searchableText = [
                log.hostname,
                log.url,
                log.apiType,
                log.method,
                log.details || ''
            ].join(' ').toLowerCase();

            if (!searchableText.includes(searchValue)) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Render logs to table (incremental update to prevent flashing)
 */
function renderLogs(logs: SpoofLogEntry[], force = false): void {
    // Check if we need to re-render
    const newHash = generateLogHash(logs);
    if (!force && newHash === lastLogHash) {
        // Just update relative times if needed
        updateRelativeTimes();
        return;
    }
    lastLogHash = newHash;

    if (logs.length === 0) {
        elements.logsTable.classList.add('hidden');
        elements.emptyState.classList.add('visible');
        elements.displayedCount.textContent = '0';
        elements.loadMoreWrapper.style.display = 'none';
        return;
    }

    elements.logsTable.classList.remove('hidden');
    elements.emptyState.classList.remove('visible');

    // Sort by timestamp descending
    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    // Pagination
    const endIndex = currentPage * CONFIG.ITEMS_PER_PAGE;
    const pageItems = sortedLogs.slice(0, endIndex);

    // Build table rows
    let html = '';
    pageItems.forEach(log => {
        const count = log.count || 1;
        const countClass = count >= 10 ? 'high' : '';
        const countBadge = count > 1 ? `<span class="count-badge ${countClass}">${count > 999 ? '999+' : count}</span>` : '';

        html += `
            <tr data-log-id="${escapeHtml(log.id)}">
                <td class="time">${formatTime(log.timestamp)}</td>
                <td>${countBadge}</td>
                <td class="site">
                    <a href="${escapeHtml(log.url)}" target="_blank" title="${escapeHtml(log.url)}">${escapeHtml(log.hostname)}</a>
                </td>
                <td><span class="api-badge ${log.apiType}">${log.apiType}</span></td>
                <td class="method">${escapeHtml(log.method)}</td>
                <td class="details" title="${escapeHtml(log.details || '')}">${escapeHtml(log.details || '-')}</td>
            </tr>
        `;
    });

    elements.logsBody.innerHTML = html;
    elements.displayedCount.textContent = pageItems.length.toString();

    // Show/hide load more
    if (endIndex < sortedLogs.length) {
        elements.loadMoreWrapper.style.display = 'flex';
    } else {
        elements.loadMoreWrapper.style.display = 'none';
    }

    // Add click handlers for detail view
    elements.logsBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'A') return;

            const logId = row.dataset.logId;
            const log = allLogs.find(l => l.id === logId);
            if (log) openLogDetail(log);
        });
        row.style.cursor = 'pointer';
    });
}

/**
 * Update relative times without re-rendering
 */
function updateRelativeTimes(): void {
    if (allLogs.length > 0) {
        const latestTimestamp = Math.max(...allLogs.map(l => l.timestamp));
        elements.lastUpdate.textContent = formatRelativeTime(latestTimestamp);
    }
}

/**
 * Open log detail modal
 */
function openLogDetail(log: SpoofLogEntry): void {
    elements.modalBody.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Timestamp</span>
            <span class="detail-value">${new Date(log.timestamp).toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Site</span>
            <span class="detail-value"><a href="${escapeHtml(log.url)}" target="_blank">${escapeHtml(log.hostname)}</a></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Full URL</span>
            <span class="detail-value mono">${escapeHtml(log.url)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">API Type</span>
            <span class="detail-value"><span class="api-badge ${log.apiType}">${log.apiType}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Method</span>
            <span class="detail-value mono">${escapeHtml(log.method)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Count</span>
            <span class="detail-value">${(log.count || 1).toLocaleString()} times</span>
        </div>
        ${log.details ? `
        <div class="detail-row">
            <span class="detail-label">Details</span>
            <span class="detail-value mono">${escapeHtml(log.details)}</span>
        </div>
        ` : ''}
    `;

    elements.modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

/**
 * Close modal
 */
function closeLogDetail(): void {
    elements.modal.classList.remove('open');
    document.body.style.overflow = '';
}

/**
 * Show toast notification
 */
function showToast(message: string, duration = 2500): void {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

/**
 * Check for new logs and update only if changed
 */
async function checkForUpdates(): Promise<void> {
    const newLogs = await loadLogs();
    const newHash = generateLogHash(newLogs);

    // Only update if logs actually changed
    if (newHash !== lastLogHash) {
        allLogs = newLogs;
        const filtered = getFilteredLogs();
        renderLogs(filtered);
        updateStats(allLogs);
        updateApiBreakdown(allLogs);
    } else {
        // Just update relative time display
        updateRelativeTimes();
    }
}

/**
 * Force full refresh
 */
async function forceRefresh(): Promise<void> {
    allLogs = await loadLogs();
    lastLogHash = ''; // Force re-render
    const filtered = getFilteredLogs();
    renderLogs(filtered, true);
    updateStats(allLogs);
    updateApiBreakdown(allLogs);
}

/**
 * Export logs to JSON
 */
function exportLogs(): void {
    const filtered = getFilteredLogs();

    if (filtered.length === 0) {
        showToast('No logs to export');
        return;
    }

    const exportData = {
        exportedAt: new Date().toISOString(),
        totalEntries: filtered.length,
        totalBlocked: filtered.reduce((acc, l) => acc + (l.count || 1), 0),
        logs: filtered
    };

    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `kriacy-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} entries`);
}

/**
 * Toggle pause/resume
 */
function togglePause(): void {
    isPaused = !isPaused;

    if (isPaused) {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        elements.pauseBtn.classList.add('active');
        elements.pauseBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
        elements.liveIndicator.classList.add('paused');
        (elements.liveIndicator.querySelector('.live-text') as HTMLElement).textContent = 'PAUSED';
    } else {
        startAutoRefresh();
        elements.pauseBtn.classList.remove('active');
        elements.pauseBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
        `;
        elements.liveIndicator.classList.remove('paused');
        (elements.liveIndicator.querySelector('.live-text') as HTMLElement).textContent = 'LIVE';
    }
}

/**
 * Start auto-refresh
 */
function startAutoRefresh(): void {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = window.setInterval(checkForUpdates, CONFIG.REFRESH_INTERVAL);
}

/**
 * Debounce helper
 */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timeoutId: number;
    return ((...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn(...args), delay);
    }) as T;
}

/**
 * Escape HTML
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Initialize
 */
async function init(): Promise<void> {
    console.log('[Kriacy Logs] Initializing...');

    // Initial load
    await forceRefresh();

    // Start auto-refresh
    startAutoRefresh();

    // Event listeners
    elements.refreshBtn.addEventListener('click', () => {
        forceRefresh();
        showToast('Refreshed');
    });

    elements.pauseBtn.addEventListener('click', togglePause);

    elements.clearBtn.addEventListener('click', async () => {
        if (confirm('Clear all logs?')) {
            await clearAllLogs();
            await forceRefresh();
        }
    });

    elements.exportBtn.addEventListener('click', exportLogs);

    // Filters with debounce
    const handleFilter = debounce(() => {
        lastLogHash = ''; // Force re-render on filter change
        const filtered = getFilteredLogs();
        renderLogs(filtered, true);
    }, CONFIG.DEBOUNCE_DELAY);

    elements.apiFilter.addEventListener('change', handleFilter);

    elements.searchInput.addEventListener('input', () => {
        if (elements.searchInput.value) {
            elements.searchClear.classList.remove('hidden');
        } else {
            elements.searchClear.classList.add('hidden');
        }
        handleFilter();
    });

    elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.searchClear.classList.add('hidden');
        handleFilter();
    });

    // Load more
    elements.loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        const filtered = getFilteredLogs();
        renderLogs(filtered, true);
    });

    // Modal
    elements.closeModal.addEventListener('click', closeLogDetail);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeLogDetail();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.classList.contains('open')) {
            closeLogDetail();
        }
    });

    console.log('[Kriacy Logs] Initialized');
}

// Start
document.addEventListener('DOMContentLoaded', init);

export { };
