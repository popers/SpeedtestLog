import { state } from './state.js';
import { translations } from './i18n.js';
import { fetchResults, fetchServers, fetchSettings, triggerTest, getLatestResult, deleteEntries, updateSettings } from './api.js';
import { parseISOLocally, getUnitLabel, showToast, getNextRunTimeText, formatCountdown } from './utils.js';
import { renderCharts } from './charts.js';
import { updateStatsCards, updateTable, showDetailsModal } from './ui.js';

let countdownInterval = null;
let pollingInterval = null;

export async function loadDashboardData() {
    try {
        const serversData = await fetchServers();
        const settingsData = await fetchSettings();
        
        // ZMIANA: Pobieramy wyniki wcześniej, aby mieć pewny timestamp ostatniego testu
        state.allResults = await fetchResults();

        state.declaredSpeeds = {
            download: settingsData.declared_download || 0,
            upload: settingsData.declared_upload || 0
        };
        
        const serverSelect = document.getElementById('serverSelect');
        if (serverSelect) {
            serverSelect.innerHTML = `<option value="null" data-i18n-key="autoSelect">${translations[state.currentLang].autoSelect}</option>`;
            serversData.servers.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `(${s.id}) ${s.name} (${s.location})`;
                serverSelect.appendChild(opt);
            });
            serverSelect.value = settingsData.selected_server_id || 'null';
            state.currentSelectedServerId = serverSelect.value;
        }

        const scheduleSelect = document.getElementById('scheduleSelect');
        if (scheduleSelect) {
            scheduleSelect.value = (settingsData.schedule_hours !== null) ? settingsData.schedule_hours : 1;
            state.currentScheduleHours = (settingsData.schedule_hours !== null) ? settingsData.schedule_hours : 1;
        }
        
        const savedFilter = localStorage.getItem('dashboardFilter') || '24h';
        const savedUnit = localStorage.getItem('displayUnit') || 'Mbps';
        if (document.getElementById('filterSelect')) document.getElementById('filterSelect').value = savedFilter;
        if (document.getElementById('unitSelect')) document.getElementById('unitSelect').value = savedUnit;

        // ZMIANA: Ustawiamy datę ostatniego testu na podstawie faktycznej listy wyników.
        if (state.allResults.length > 0) {
            state.lastTestTimestamp = state.allResults[0].timestamp;
        } else {
            state.lastTestTimestamp = settingsData.latest_test_timestamp;
        }

        const nextRunEl = document.getElementById('nextRunTime');
        if(nextRunEl) nextRunEl.textContent = getNextRunTimeText();
        
        startNextRunCountdown();

        renderData();
    } catch (e) {
        console.error("Error loading dashboard data:", e);
    }
}

export function renderData() {
    const filterSelect = document.getElementById('filterSelect');
    const unitSelect = document.getElementById('unitSelect');
    
    if(filterSelect) state.currentFilter = filterSelect.value;
    if(unitSelect) state.currentUnit = unitSelect.value;
    
    const now = new Date();
    let filtered = [];
    
    if (state.currentFilter === '24h') {
        const cutOff = new Date(now.getTime() - 24 * 3600 * 1000);
        filtered = state.allResults.filter(r => parseISOLocally(r.timestamp) > cutOff);
    } else if (state.currentFilter === '7d') {
        const cutOff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        filtered = state.allResults.filter(r => parseISOLocally(r.timestamp) > cutOff);
    } else if (state.currentFilter === '30d') {
        const cutOff = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        filtered = state.allResults.filter(r => parseISOLocally(r.timestamp) > cutOff);
    } else {
        filtered = state.allResults.slice();
    }

    if (state.searchTerm && state.searchTerm.trim() !== '') {
        const lowerTerm = state.searchTerm.toLowerCase();
        filtered = filtered.filter(res => {
            const serverName = res.server_name ? res.server_name.toLowerCase() : '';
            const serverLoc = res.server_location ? res.server_location.toLowerCase() : '';
            const isp = res.isp ? res.isp.toLowerCase() : '';
            return serverName.includes(lowerTerm) || serverLoc.includes(lowerTerm) || isp.includes(lowerTerm);
        });
    }
    
    if (state.currentSort.column) {
        filtered.sort((a, b) => {
            let valA = a[state.currentSort.column];
            let valB = b[state.currentSort.column];

            if (state.currentSort.column === 'timestamp') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }
            if (valA == null) valA = (typeof valA === 'string' ? '' : 0);
            if (valB == null) valB = (typeof valB === 'string' ? '' : 0);

            if (typeof valA === 'string' && typeof valB === 'string') {
                 return state.currentSort.direction === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            }

            if (state.currentSort.direction === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });
    } else {
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    state.currentFilteredResults = filtered;

    renderCharts(filtered);
    updateStatsCards(state.allResults); 
    updateTable(filtered);
}

export async function handleManualTest() {
    const btn = document.getElementById('triggerTestBtn');
    const serverSelect = document.getElementById('serverSelect');
    const serverId = serverSelect.value === 'null' ? null : parseInt(serverSelect.value);
    btn.disabled = true; btn.classList.add('is-loading'); 
    showToast('toastTestInProgress', 'info');
    
    const prevTimestamp = state.allResults[0]?.timestamp;
    
    try {
        await triggerTest(serverId, state.currentLang);
        let attempts = 0;
        
        if (pollingInterval) clearInterval(pollingInterval);
        
        pollingInterval = setInterval(async () => {
            attempts++;
            const latest = await getLatestResult();
            const isNew = latest && (!prevTimestamp || new Date(latest.timestamp) > new Date(prevTimestamp));
            
            if (isNew) {
                clearInterval(pollingInterval); 
                showToast('toastTestComplete', 'success');
                state.allResults = await fetchResults(); 
                
                if (state.allResults.length > 0) {
                    state.lastTestTimestamp = state.allResults[0].timestamp;
                    const nextRunEl = document.getElementById('nextRunTime');
                    if(nextRunEl) nextRunEl.textContent = getNextRunTimeText();
                    startNextRunCountdown();
                }
                
                renderData();
                btn.disabled = false; btn.classList.remove('is-loading');
            } else if (attempts > 25) {
                clearInterval(pollingInterval); 
                showToast('toastTestTimeout', 'error');
                btn.disabled = false; btn.classList.remove('is-loading');
            }
        }, 3000);
    } catch (e) { 
        showToast('toastTestError', 'error'); 
        btn.disabled = false; 
        btn.classList.remove('is-loading'); 
    }
}

export async function handleDelete() {
    const checked = document.querySelectorAll('.row-checkbox:checked');
    const ids = Array.from(checked).map(cb => cb.dataset.id);
    if (ids.length === 0) return;
    
    const modal = document.getElementById('confirmModal');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const closeBtn = document.getElementById('confirmModalCloseBtn');
    const msg = document.getElementById('confirmModalText');
    const lang = translations[state.currentLang];
    
    msg.textContent = lang.confirmDeleteText;
    confirmBtn.textContent = `${lang.modalConfirm} (${ids.length})`;
    
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('show'), 10);
    
    const userConfirmed = await new Promise((resolve) => {
        const cleanup = () => {
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onCancel);
        };
        const onConfirm = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onCancel);
    });
    
    modal.classList.remove('show'); setTimeout(() => modal.style.display = 'none', 200);
    
    if (userConfirmed) {
        try { 
            await deleteEntries(ids); 
            showToast('toastDeleteSuccess', 'success'); 
            state.allResults = await fetchResults(); 
            renderData(); 
            document.getElementById('deleteSelectedBtn').style.display = 'none'; 
            document.getElementById('selectAllCheckbox').checked = false; 
        } catch(e) { 
            showToast('toastDeleteError', 'error'); 
        }
    }
}

export async function handleQuickSettingsChange(e) {
    const serverSelect = document.getElementById('serverSelect');
    const scheduleSelect = document.getElementById('scheduleSelect');
    if (!serverSelect || !scheduleSelect) return;

    const newServerId = serverSelect.value;
    const newScheduleHours = parseInt(scheduleSelect.value);
    const sourceId = e.target.id;

    try {
        // ZMIANA: Usunięto fetchSettings().
        // Teraz wysyłamy TYLKO te pola, które są kontrolowane przez Dashboard.
        // Dzięki temu, że w backendzie domyślne wartości to None,
        // nie nadpiszemy np. Ping Target czy Kolorów.
        
        const payload = {
            server_id: newServerId === 'null' ? null : parseInt(newServerId),
            schedule_hours: newScheduleHours
            // app_language, chart_colors, etc. -> NIE SĄ WYSYŁANE, WIĘC SĄ BEZPIECZNE
        };

        await updateSettings(payload);
        
        if (sourceId === 'serverSelect') {
            const serverText = serverSelect.options[serverSelect.selectedIndex].text;
            showToast('toastServerChanged', 'success', ` ${serverText}`);
        } else if (sourceId === 'scheduleSelect') {
            state.currentScheduleHours = newScheduleHours;
            if (newScheduleHours === 0) {
                showToast('toastScheduleDisabled', 'info');
            } else {
                const intervalText = scheduleSelect.options[scheduleSelect.selectedIndex].text;
                showToast('toastScheduleChanged', 'success', ` ${intervalText}`);
            }
            
            const nextRunEl = document.getElementById('nextRunTime');
            if(nextRunEl) nextRunEl.textContent = getNextRunTimeText();
            
            startNextRunCountdown();

            if (newScheduleHours > 0) {
                setTimeout(() => {
                    showToast('toastNextRun', 'info', ` ${getNextRunTimeText()}`);
                }, 2500);
            }
        }
    } catch (e) {
        showToast('toastSettingsError', 'error');
    }
}

export function handleSort(column) {
    if (state.currentSort.column === column) {
        state.currentSort.direction = state.currentSort.direction === 'desc' ? 'asc' : 'desc';
    } else {
        state.currentSort.column = column;
        state.currentSort.direction = 'desc';
    }
    state.currentPage = 1;
    renderData();
}

function startNextRunCountdown() {
    const countdownEl = document.getElementById('nextRunCountdown');
    if (!countdownEl) return;

    if (countdownInterval) clearInterval(countdownInterval);

    if (state.currentScheduleHours === 0 || !state.lastTestTimestamp) {
        countdownEl.style.display = 'none';
        countdownEl.textContent = '';
        return;
    }

    countdownEl.style.display = 'block';
    
    const updateTimer = () => {
        try {
            const lang = translations[state.currentLang];
            const prefix = lang.countdownPrefix || 'za';

            const lastRunDate = parseISOLocally(state.lastTestTimestamp);
            if (!lastRunDate) return;

            const scheduleIntervalMs = state.currentScheduleHours * 60 * 60 * 1000;
            const now = new Date();
            
            const timeElapsed = now.getTime() - lastRunDate.getTime();
            const cyclesPassed = Math.floor(timeElapsed / scheduleIntervalMs);
            const nextTargetTime = lastRunDate.getTime() + ((cyclesPassed + 1) * scheduleIntervalMs);
            
            const nextRunDate = new Date(nextTargetTime);
            const diff = nextRunDate - now;

            if (diff <= 0) {
                countdownEl.textContent = `${prefix} 00:00:00`;
            } else {
                countdownEl.textContent = `${prefix} ${formatCountdown(diff)}`;
            }
        } catch (e) {
            console.error("Countdown error", e);
        }
    };

    updateTimer(); 
    countdownInterval = setInterval(updateTimer, 1000);
}

// Inicjalizacja event listenerĂłw specyficznych dla dashboardu
export function initDashboardListeners() {
    const triggerBtn = document.getElementById('triggerTestBtn');
    if(triggerBtn) triggerBtn.addEventListener('click', handleManualTest);

    const serverSelect = document.getElementById('serverSelect');
    const scheduleSelect = document.getElementById('scheduleSelect');
    if(serverSelect) {
        serverSelect.addEventListener('change', handleQuickSettingsChange);
        scheduleSelect.addEventListener('change', handleQuickSettingsChange);
    }

    const filterSelect = document.getElementById('filterSelect');
    const unitSelect = document.getElementById('unitSelect');
    if(filterSelect) filterSelect.addEventListener('change', () => {
        state.currentPage = 1; 
        localStorage.setItem('dashboardFilter', filterSelect.value);
        renderData();
        showToast('toastFilterChanged', 'info', ` ${filterSelect.options[filterSelect.selectedIndex].text}`);
    });
    if(unitSelect) unitSelect.addEventListener('change', () => {
        localStorage.setItem('displayUnit', unitSelect.value);
        renderData();
        showToast('toastUnitChanged', 'info', ` ${getUnitLabel(unitSelect.value)}`);
    });

    const rowsPerPage = document.getElementById('rowsPerPageSelect');
    if(rowsPerPage) rowsPerPage.addEventListener('change', () => { 
        state.itemsPerPage = rowsPerPage.value === 'all' ? 'all' : parseInt(rowsPerPage.value); 
        localStorage.setItem('itemsPerPage', rowsPerPage.value);
        state.currentPage = 1; 
        renderData(); 
    });
    const prevPage = document.getElementById('prevPageBtn'); if(prevPage) prevPage.addEventListener('click', () => { if(state.currentPage > 1) { state.currentPage--; renderData(); } });
    const nextPage = document.getElementById('nextPageBtn'); if(nextPage) nextPage.addEventListener('click', () => { state.currentPage++; renderData(); });

    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if(deleteBtn) deleteBtn.addEventListener('click', handleDelete);
    const csvBtn = document.getElementById('exportBtn');
    if(csvBtn) csvBtn.addEventListener('click', () => { window.location.href = '/api/export'; });

    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', () => {
        const m = document.getElementById('detailsModal'); if(m) { m.classList.remove('show'); setTimeout(()=>m.style.display='none',200); }
    });

    const selectAll = document.getElementById('selectAllCheckbox');
    if(selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked);
            const c = document.querySelectorAll('.row-checkbox:checked').length;
            const del = document.getElementById('deleteSelectedBtn');
            if(del) { 
                del.style.display = c > 0 ? 'flex' : 'none'; 
                del.innerHTML=`<span class="material-symbols-rounded">delete</span> ${translations[state.currentLang].deleteSelected} (${c})`; 
            }
        });
    }

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.style.cursor = 'pointer'; 
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (sortKey) handleSort(sortKey);
        });
    });

    const searchInput = document.getElementById('tableSearch');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchTerm = e.target.value;
            state.currentPage = 1;
            renderData();
        });
    }
}