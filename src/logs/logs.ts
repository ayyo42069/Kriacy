// Kriacy Logs Viewer

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

// DOM Elements
const apiFilter = document.getElementById('apiFilter') as HTMLSelectElement;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const logsBody = document.getElementById('logsBody') as HTMLTableSectionElement;
const emptyState = document.getElementById('emptyState') as HTMLDivElement;
const logsTable = document.querySelector('.logs-table') as HTMLTableElement;

// Stats elements
const totalLogsEl = document.getElementById('totalLogs') as HTMLSpanElement;
const uniqueSitesEl = document.getElementById('uniqueSites') as HTMLSpanElement;
const topApiEl = document.getElementById('topApi') as HTMLSpanElement;

let allLogs: SpoofLogEntry[] = [];

/**
 * Format timestamp to readable string
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
 * Load logs from service worker via chrome.runtime.sendMessage
 */
async function loadLogs(): Promise<SpoofLogEntry[]> {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_LOGS' });
        if (response?.success && response.data) {
            return response.data;
        }
        return [];
    } catch (e) {
        console.error('Error loading logs:', e);
        return [];
    }
}

/**
 * Clear all logs via service worker
 */
async function clearAllLogs(): Promise<void> {
    try {
        await chrome.runtime.sendMessage({ action: 'CLEAR_LOGS' });
    } catch (e) {
        console.error('Error clearing logs:', e);
    }
}

/**
 * Update statistics display
 */
function updateStats(logs: SpoofLogEntry[]): void {
    // Calculate total logs including aggregated counts
    const totalCount = logs.reduce((acc, log) => acc + (log.count || 1), 0);
    totalLogsEl.textContent = totalCount.toString();

    // Unique sites
    const uniqueHostnames = new Set(logs.map(l => l.hostname));
    uniqueSitesEl.textContent = uniqueHostnames.size.toString();

    // Most accessed API
    if (logs.length > 0) {
        const apiCounts: Record<string, number> = {};
        logs.forEach(l => {
            const count = l.count || 1;
            apiCounts[l.apiType] = (apiCounts[l.apiType] || 0) + count;
        });

        const topApi = Object.entries(apiCounts)
            .sort((a, b) => b[1] - a[1])[0];

        topApiEl.textContent = topApi ? topApi[0].charAt(0).toUpperCase() + topApi[0].slice(1) : '-';
    } else {
        topApiEl.textContent = '-';
    }
}

/**
 * Render logs to table
 */
function renderLogs(logs: SpoofLogEntry[]): void {
    logsBody.innerHTML = '';

    if (logs.length === 0) {
        logsTable.classList.add('hidden');
        emptyState.classList.add('visible');
        return;
    }

    logsTable.classList.remove('hidden');
    emptyState.classList.remove('visible');

    // Sort by timestamp descending (newest first)
    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    sortedLogs.forEach(log => {
        const row = document.createElement('tr');
        const countBadge = log.count && log.count > 1
            ? `<span class="count-badge">${log.count}</span>`
            : '';

        row.innerHTML = `
            <td class="time">${formatTime(log.timestamp)}</td>
            <td class="count">${countBadge}</td>
            <td class="site">
                <a href="${log.url}" target="_blank" title="${log.url}">${log.hostname}</a>
            </td>
            <td><span class="api-badge ${log.apiType}">${log.apiType}</span></td>
            <td class="method">${log.method}</td>
            <td class="details" title="${log.details || ''}">${log.details || '-'}</td>
        `;
        logsBody.appendChild(row);
    });
}

/**
 * Filter logs based on current filters
 */
function getFilteredLogs(): SpoofLogEntry[] {
    const apiValue = apiFilter.value;
    const searchValue = searchInput.value.toLowerCase();

    return allLogs.filter(log => {
        const matchesApi = apiValue === 'all' || log.apiType === apiValue;
        const matchesSearch = !searchValue ||
            log.url.toLowerCase().includes(searchValue) ||
            log.hostname.toLowerCase().includes(searchValue);

        return matchesApi && matchesSearch;
    });
}

/**
 * Refresh logs display
 */
async function refreshLogs(): Promise<void> {
    allLogs = await loadLogs();
    const filtered = getFilteredLogs();
    renderLogs(filtered);
    updateStats(allLogs);
}

/**
 * Export logs to JSON file
 */
function exportLogs(): void {
    const filtered = getFilteredLogs();
    const data = JSON.stringify(filtered, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `kriacy-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

/**
 * Initialize the logs viewer
 */
async function init(): Promise<void> {
    // Load initial logs
    await refreshLogs();

    // Set up event listeners
    refreshBtn.addEventListener('click', refreshLogs);

    clearBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all logs?')) {
            await clearAllLogs();
            await refreshLogs();
        }
    });

    exportBtn.addEventListener('click', exportLogs);

    apiFilter.addEventListener('change', () => {
        const filtered = getFilteredLogs();
        renderLogs(filtered);
    });

    let searchTimeout: number;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
            const filtered = getFilteredLogs();
            renderLogs(filtered);
        }, 300);
    });

    // Auto-refresh every 5 seconds
    setInterval(refreshLogs, 5000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

export { };
