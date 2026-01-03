// Kriacy System Logs Viewer
// Displays internal extension logs in a comprehensive interface

interface SystemLogEntry {
    id: string;
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    category: string;
    module: string;
    message: string;
    details?: string;
    context?: Record<string, unknown>;
}

// Configuration
const CONFIG = {
    REFRESH_INTERVAL: 5000,
    ITEMS_PER_PAGE: 100,
    DEBOUNCE_DELAY: 300,
};

// DOM Elements
const elements = {
    totalLogs: document.getElementById('totalLogs') as HTMLSpanElement,
    errorCount: document.getElementById('errorCount') as HTMLSpanElement,
    warnCount: document.getElementById('warnCount') as HTMLSpanElement,
    lastUpdate: document.getElementById('lastUpdate') as HTMLSpanElement,

    searchInput: document.getElementById('searchInput') as HTMLInputElement,
    searchClear: document.getElementById('searchClear') as HTMLElement,
    levelFilter: document.getElementById('levelFilter') as HTMLSelectElement,
    categoryFilter: document.getElementById('categoryFilter') as HTMLSelectElement,

    pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
    refreshBtn: document.getElementById('refreshBtn') as HTMLButtonElement,
    exportBtn: document.getElementById('exportBtn') as HTMLButtonElement,
    clearBtn: document.getElementById('clearBtn') as HTMLButtonElement,

    liveIndicator: document.getElementById('liveIndicator') as HTMLDivElement,
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
let allLogs: SystemLogEntry[] = [];
let lastLogHash = '';
let isPaused = false;
let refreshInterval: number | null = null;
let currentPage = 1;

/**
 * Generate a hash of logs to detect changes
 */
function generateLogHash(logs: SystemLogEntry[]): string {
    if (logs.length === 0) return 'empty';
    const latest = logs.length > 0 ? logs[logs.length - 1]?.timestamp || 0 : 0;
    return `${logs.length}-${latest}`;
}

/**
 * Format timestamp
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

    if (isToday) return time;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

/**
 * Format relative time
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
async function loadLogs(): Promise<SystemLogEntry[]> {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_SYSTEM_LOGS' });
        if (response?.success && response.data) {
            return response.data;
        }
        return [];
    } catch (e) {
        console.error('[Kriacy System Logs] Error loading logs:', e);
        return [];
    }
}

/**
 * Clear all logs
 */
async function clearAllLogs(): Promise<void> {
    try {
        await chrome.runtime.sendMessage({ action: 'CLEAR_SYSTEM_LOGS' });
        showToast('All system logs cleared');
    } catch (e) {
        console.error('[Kriacy System Logs] Error clearing logs:', e);
        showToast('Failed to clear logs');
    }
}

/**
 * Update statistics
 */
function updateStats(logs: SystemLogEntry[]): void {
    elements.totalLogs.textContent = logs.length.toLocaleString();

    const errorCount = logs.filter(l => l.level === 'error').length;
    const warnCount = logs.filter(l => l.level === 'warn').length;

    elements.errorCount.textContent = errorCount.toString();
    elements.warnCount.textContent = warnCount.toString();

    if (logs.length > 0) {
        const latestTimestamp = Math.max(...logs.map(l => l.timestamp));
        elements.lastUpdate.textContent = formatRelativeTime(latestTimestamp);
    } else {
        elements.lastUpdate.textContent = '-';
    }
}

/**
 * Get filtered logs
 */
function getFilteredLogs(): SystemLogEntry[] {
    const levelValue = elements.levelFilter.value;
    const categoryValue = elements.categoryFilter.value;
    const searchValue = elements.searchInput.value.toLowerCase().trim();

    return allLogs.filter(log => {
        if (levelValue !== 'all' && log.level !== levelValue) {
            return false;
        }

        if (categoryValue !== 'all' && log.category !== categoryValue) {
            return false;
        }

        if (searchValue) {
            const searchableText = [
                log.module,
                log.message,
                log.details || '',
                log.category
            ].join(' ').toLowerCase();

            if (!searchableText.includes(searchValue)) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Render logs to table
 */
function renderLogs(logs: SystemLogEntry[], force = false): void {
    const newHash = generateLogHash(logs);
    if (!force && newHash === lastLogHash) {
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
        html += `
            <tr data-log-id="${escapeHtml(log.id)}">
                <td class="time">${formatTime(log.timestamp)}</td>
                <td><span class="level-badge ${log.level}">${log.level}</span></td>
                <td><span class="category-badge ${log.category}">${log.category}</span></td>
                <td class="module">${escapeHtml(log.module)}</td>
                <td class="message" title="${escapeHtml(log.message)}">${escapeHtml(log.message)}</td>
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
        row.addEventListener('click', () => {
            const logId = row.dataset.logId;
            const log = allLogs.find(l => l.id === logId);
            if (log) openLogDetail(log);
        });
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
function openLogDetail(log: SystemLogEntry): void {
    let contextHtml = '';
    if (log.context) {
        try {
            contextHtml = `
                <div class="detail-row">
                    <span class="detail-label">Context</span>
                    <span class="detail-value mono">${escapeHtml(JSON.stringify(log.context, null, 2))}</span>
                </div>
            `;
        } catch {
            // Ignore formatting errors
        }
    }

    elements.modalBody.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Timestamp</span>
            <span class="detail-value">${new Date(log.timestamp).toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Level</span>
            <span class="detail-value"><span class="level-badge ${log.level}">${log.level}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Category</span>
            <span class="detail-value"><span class="category-badge ${log.category}">${log.category}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Module</span>
            <span class="detail-value mono">${escapeHtml(log.module)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Message</span>
            <span class="detail-value">${escapeHtml(log.message)}</span>
        </div>
        ${log.details ? `
        <div class="detail-row">
            <span class="detail-label">Details</span>
            <span class="detail-value mono">${escapeHtml(log.details)}</span>
        </div>
        ` : ''}
        ${contextHtml}
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
 * Check for new logs
 */
async function checkForUpdates(): Promise<void> {
    const newLogs = await loadLogs();
    const newHash = generateLogHash(newLogs);

    if (newHash !== lastLogHash) {
        allLogs = newLogs;
        const filtered = getFilteredLogs();
        renderLogs(filtered);
        updateStats(allLogs);
    } else {
        updateRelativeTimes();
    }
}

/**
 * Force full refresh
 */
async function forceRefresh(): Promise<void> {
    allLogs = await loadLogs();
    lastLogHash = '';
    const filtered = getFilteredLogs();
    renderLogs(filtered, true);
    updateStats(allLogs);
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
        logs: filtered
    };

    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `kriacy-system-logs-${new Date().toISOString().split('T')[0]}.json`;
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
 * Initialize
 */
async function init(): Promise<void> {
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
        if (confirm('Clear all system logs?')) {
            await clearAllLogs();
            await forceRefresh();
        }
    });

    elements.exportBtn.addEventListener('click', exportLogs);

    // Filters with debounce
    const handleFilter = debounce(() => {
        lastLogHash = '';
        const filtered = getFilteredLogs();
        renderLogs(filtered, true);
    }, CONFIG.DEBOUNCE_DELAY);

    elements.levelFilter.addEventListener('change', handleFilter);
    elements.categoryFilter.addEventListener('change', handleFilter);

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
}

// Start
document.addEventListener('DOMContentLoaded', init);

export { };
