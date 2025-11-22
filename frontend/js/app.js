import { state } from './state.js';
import { translations } from './i18n.js';
import { fetchResults, fetchServers, fetchSettings, updateSettings, triggerTest, deleteEntries, getLatestResult, getAuthStatus, logoutUser, loginUser } from './api.js';
// ZMIANA: Dodano import getUnitLabel
import { setLanguage, setNightMode, showToast, parseISOLocally, getNextRunTimeText, getUnitLabel } from './utils.js';
import { renderCharts } from './charts.js';
import { updateStatsCards, updateTable, showDetailsModal, updateLangButtonUI, setLogoutButtonVisibility } from './ui.js';

// --- ZMIENNE WATCHDOGA ---
let watchdogInterval = null;
let wdChart = null;

// --- Main Logic & Event Listeners ---

async function initializeApp() {
    const savedLang = localStorage.getItem('language') || navigator.language.split('-')[0];
    const initialLang = translations[savedLang] ? savedLang : 'pl';
    setLanguage(initialLang); 
    updateLangButtonUI(initialLang); 
    
    const savedTheme = localStorage.getItem('theme');
    
    // ZMIANA: Domyślnie ustawiamy tryb ciemny (jeśli brak zapisu lub 'dark')
    // setNightMode(true) = Ciemny (usuwa .light-mode)
    // setNightMode(false) = Jasny (dodaje .light-mode)
    if (!savedTheme || savedTheme === 'dark') {
        setNightMode(true); 
    } else {
        setNightMode(false);
    }

    if (!document.getElementById('loginForm')) {
        try {
            const authStatus = await getAuthStatus();
            setLogoutButtonVisibility(authStatus.enabled);
        } catch (e) {
            setLogoutButtonVisibility(false);
        }
    }
    
    // --- OBSŁUGA POWIADOMIEŃ PO PRZEŁADOWANIU STRONY (Login/Logout) ---
    const pendingToast = sessionStorage.getItem('pendingToast');
    if (pendingToast) {
        sessionStorage.removeItem('pendingToast');
        setTimeout(() => {
            if (pendingToast.startsWith('login:')) {
                const user = pendingToast.split(':')[1];
                showToast('toastLoginSuccess', 'success', user);
            } else if (pendingToast === 'logout') {
                showToast('toastLogoutSuccess', 'success');
            }
        }, 500); 
    }
    
    setupEventListeners();
    
    const page = window.location.pathname.split("/").pop();
    
    if (page === 'settings.html') {
        loadSettingsToForm();
    } else if (page === 'index.html' || page === '' || page === '/') {
        handleDashboardNavigation();
        window.addEventListener('hashchange', handleDashboardNavigation);
    }

    if (!document.getElementById('loginForm')) {
        startWatchdogPolling();
    }
}

function handleDashboardNavigation() {
    if (document.getElementById('loginForm')) return;
    if (window.location.pathname.includes('settings.html')) return;
    if (window.location.pathname.includes('backup.html')) return;

    const hash = window.location.hash || '#dashboard';
    loadDashboardData();
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    let activeLink = document.querySelector(`.nav-link[href="index.html${hash}"]`);
    if(!activeLink && hash === '#dashboard') {
         activeLink = document.querySelector(`.nav-link[href="index.html#dashboard"]`);
    }
    if(activeLink) activeLink.classList.add('active');
}

async function loadSettingsToForm() {
    try {
        const s = await fetchSettings();
        
        const targetInput = document.getElementById('pingTargetInput');
        if(targetInput) targetInput.value = s.ping_target || '8.8.8.8';
        
        const intervalInput = document.getElementById('pingIntervalInput');
        if(intervalInput) intervalInput.value = s.ping_interval || 30;

        const dlInput = document.getElementById('declaredDownloadInput');
        if(dlInput) dlInput.value = s.declared_download || '';

        const ulInput = document.getElementById('declaredUploadInput');
        if(ulInput) ulInput.value = s.declared_upload || '';
        
    } catch (e) {
        console.error("Error loading settings:", e);
    }
}

async function saveSettingsFromPage() {
    try {
        const currentSettings = await fetchSettings();
        
        const target = document.getElementById('pingTargetInput').value;
        const interval = parseInt(document.getElementById('pingIntervalInput').value);
        const dl = parseInt(document.getElementById('declaredDownloadInput').value) || 0;
        const ul = parseInt(document.getElementById('declaredUploadInput').value) || 0;

        await updateSettings({
            server_id: currentSettings.selected_server_id, 
            schedule_hours: currentSettings.schedule_hours, 
            ping_target: target,
            ping_interval: interval,
            declared_download: dl,
            declared_upload: ul
        });
        
        showToast('toastSettingsSaved', 'success');
        stopWatchdogPolling();
        startWatchdogPolling();
    } catch (e) {
        showToast('toastSettingsError', 'error');
    }
}

async function handleQuickSettingsChange(e) {
    const serverSelect = document.getElementById('serverSelect');
    const scheduleSelect = document.getElementById('scheduleSelect');
    if (!serverSelect || !scheduleSelect) return;

    const newServerId = serverSelect.value;
    const newScheduleHours = parseInt(scheduleSelect.value);
    const sourceId = e.target.id;

    try {
        const currentSettings = await fetchSettings();
        await updateSettings({
            server_id: newServerId === 'null' ? null : parseInt(newServerId),
            schedule_hours: newScheduleHours,
            ping_target: currentSettings.ping_target,
            ping_interval: currentSettings.ping_interval,
            declared_download: currentSettings.declared_download, 
            declared_upload: currentSettings.declared_upload 
        });
        
        if (sourceId === 'serverSelect') {
            const serverText = serverSelect.options[serverSelect.selectedIndex].text;
            showToast('toastServerChanged', 'success', ` ${serverText}`);
        } else if (sourceId === 'scheduleSelect') {
            const intervalText = scheduleSelect.options[scheduleSelect.selectedIndex].text;
            showToast('toastScheduleChanged', 'success', ` ${intervalText}`);
            
            state.currentScheduleHours = newScheduleHours;
            const nextRunEl = document.getElementById('nextRunTime');
            if(nextRunEl) nextRunEl.textContent = getNextRunTimeText();
            setTimeout(() => {
                showToast('toastNextRun', 'info', ` ${getNextRunTimeText()}`);
            }, 2500);
        }
    } catch (e) {
        showToast('toastSettingsError', 'error');
    }
}

function startWatchdogPolling() {
    if (watchdogInterval) clearInterval(watchdogInterval);
    updateWatchdogUI(); 
    watchdogInterval = setInterval(updateWatchdogUI, 5000); 
}

function stopWatchdogPolling() {
    if (watchdogInterval) clearInterval(watchdogInterval);
}

async function updateWatchdogUI() {
    try {
        const icon = document.getElementById('watchdogIcon');
        if(!icon) return; 

        const res = await fetch('/api/watchdog/status');
        if(!res.ok) return;
        const data = await res.json();
        const current = data.current;
        
        if (current.online) {
            icon.className = 'watchdog-indicator online';
        } else {
            icon.className = 'watchdog-indicator offline';
        }

        const popover = document.getElementById('watchdogPopover');
        if (popover && popover.classList.contains('show')) {
            const statusText = document.getElementById('wdStatus');
            const targetText = document.getElementById('wdTarget');
            const pingText = document.getElementById('wdLatency');
            const lossText = document.getElementById('wdLoss');
            
            if(statusText) {
                statusText.textContent = current.online ? 
                    (translations[state.currentLang].wdStatusOnline || "ONLINE") : 
                    (translations[state.currentLang].wdStatusOffline || "OFFLINE");
                statusText.style.color = current.online ? "#28a745" : "#dc3545";
            }
            if(targetText) targetText.textContent = current.target;
            if(pingText) pingText.textContent = current.latency ? `${current.latency} ms` : '-';
            if(lossText) lossText.textContent = `${current.loss}%`;
            
            renderSparkline(data.history);
        }
    } catch (e) { }
}

function renderSparkline(history) {
    const canvas = document.getElementById('wdChart');
    if(!canvas || canvas.offsetParent === null) return;

    const ctx = canvas.getContext('2d');
    const labels = history.map(h => h.time);
    const dataPoints = history.map(h => h.latency || 0);
    
    if (wdChart) {
        wdChart.data.labels = labels;
        wdChart.data.datasets[0].data = dataPoints;
        wdChart.update('none');
    } else {
        wdChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: dataPoints,
                    borderColor: '#17a2b8',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, 
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }
}

function setupEventListeners() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    const closeSidebar = () => { 
        if(sidebar) sidebar.classList.remove('open'); 
        if(sidebarOverlay) sidebarOverlay.classList.remove('show'); 
    };

    if(hamburgerBtn) hamburgerBtn.addEventListener('click', () => { 
        if(sidebar) sidebar.classList.add('open'); 
        if(sidebarOverlay) sidebarOverlay.classList.add('show'); 
    });
    if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) closeSidebar();
        });
    });

    const langBtn = document.getElementById('langBtn');
    const langMenu = document.getElementById('langMenu');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('show');
        });
    }
    window.addEventListener('click', () => {
        if (langMenu) langMenu.classList.remove('show');
    });
    document.querySelectorAll('.lang-menu li').forEach(li => {
        li.addEventListener('click', () => {
            setLanguage(li.dataset.lang);            
            updateLangButtonUI(li.dataset.lang);     
            showToast('toastLangChanged', 'success');
            if (state.allResults.length > 0) renderData();
            const nextRun = document.getElementById('nextRunTime');
            if(nextRun) nextRun.textContent = getNextRunTimeText();
        });
    });

    // ZMIANA: Logika przełącznika motywu
    const themeToggle = document.getElementById('themeToggle');
    if(themeToggle) themeToggle.addEventListener('click', () => {
        const isCurrentlyLight = document.body.classList.contains('light-mode');
        setNightMode(isCurrentlyLight); 
        
        if (isCurrentlyLight) showToast('toastThemeDark', 'info');
        else showToast('toastThemeLight', 'info');
        
        if (document.getElementById('downloadChart') && state.currentFilteredResults) {
            renderCharts(state.currentFilteredResults);
        }
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const data = Object.fromEntries(new FormData(e.target));
            const lang = translations[state.currentLang];
            btn.disabled = true; btn.textContent = lang.loggingIn || '...';
            try { 
                await loginUser(data.username, data.password); 
                sessionStorage.setItem('pendingToast', 'login:' + data.username);
                window.location.reload(); 
            } catch (err) { 
                btn.disabled = false; 
                btn.textContent = lang.loginBtn || 'Zaloguj'; 
                document.getElementById('loginError').style.display='block'; 
            }
        });
    }

    const triggerBtn = document.getElementById('triggerTestBtn');
    if(triggerBtn) triggerBtn.addEventListener('click', handleManualTest);

    const serverSelect = document.getElementById('serverSelect');
    const scheduleSelect = document.getElementById('scheduleSelect');
    if(serverSelect && !document.getElementById('saveSettingsBtn')) {
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
        // ZMIANA: Użycie getUnitLabel do poprawnego wyświetlania jednostki w powiadomieniu (np. MB/s)
        showToast('toastUnitChanged', 'info', ` ${getUnitLabel(unitSelect.value)}`);
    });

    const rowsPerPage = document.getElementById('rowsPerPageSelect');
    if(rowsPerPage) rowsPerPage.addEventListener('change', () => { state.itemsPerPage = rowsPerPage.value === 'all' ? 'all' : parseInt(rowsPerPage.value); state.currentPage = 1; renderData(); });
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
    
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            sessionStorage.setItem('pendingToast', 'logout');
            await logoutUser();
        });
    }

    const selectAll = document.getElementById('selectAllCheckbox');
    if(selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked);
            const c = document.querySelectorAll('.row-checkbox:checked').length;
            const del = document.getElementById('deleteSelectedBtn');
            if(del) { del.style.display = c > 0 ? 'flex' : 'none'; del.innerHTML=`🗑️ ${translations[state.currentLang].deleteSelected} (${c})`; }
        });
    }

    const wdIcon = document.getElementById('watchdogIcon');
    const wdPopover = document.getElementById('watchdogPopover');
    if(wdIcon) {
        wdIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            wdPopover.classList.toggle('show');
            if(wdPopover.classList.contains('show')) updateWatchdogUI();
        });
    }
    window.addEventListener('click', (e) => {
        if(wdPopover && !wdPopover.contains(e.target) && e.target !== wdIcon) {
            wdPopover.classList.remove('show');
        }
    });

    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettingsFromPage);

    const downBtn = document.getElementById('downloadBackupBtn');
    if(downBtn) {
        downBtn.addEventListener('click', async () => {
            showToast('backupGenerating', 'info');
            try {
                const res = await fetch('/api/backup');
                if(res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'backup.sql';
                    document.body.appendChild(a); a.click(); a.remove();
                    showToast('backupCreatedSuccess', 'success');
                } else throw new Error();
            } catch(e) { showToast('backupCreatedError', 'error'); }
        });
    }
    const restoreForm = document.getElementById('restoreForm');
    if(restoreForm) {
        restoreForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('restoreBackupBtn');
            btn.disabled = true; showToast('restoring', 'info');
            try {
                const res = await fetch('/api/restore', { method:'POST', body: new FormData(restoreForm) });
                if(res.ok) { showToast('restoreSuccess', 'success'); setTimeout(() => window.location.reload(), 2000); }
                else throw new Error();
            } catch(e) { showToast('restoreError', 'error'); btn.disabled = false; }
        });
    }
}

async function loadDashboardData() {
    try {
        const serversData = await fetchServers();
        const settingsData = await fetchSettings();
        
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
            scheduleSelect.value = settingsData.schedule_hours || 1;
            state.currentScheduleHours = settingsData.schedule_hours || 1;
        }
        
        const savedFilter = localStorage.getItem('dashboardFilter') || '24h';
        const savedUnit = localStorage.getItem('displayUnit') || 'Mbps';
        if (document.getElementById('filterSelect')) document.getElementById('filterSelect').value = savedFilter;
        if (document.getElementById('unitSelect')) document.getElementById('unitSelect').value = savedUnit;

        state.lastTestTimestamp = settingsData.latest_test_timestamp;
        const nextRunEl = document.getElementById('nextRunTime');
        if(nextRunEl) nextRunEl.textContent = getNextRunTimeText();

        state.allResults = await fetchResults();
        renderData();
    } catch (e) {
        console.error("Error loading dashboard data:", e);
    }
}

function renderData() {
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
    
    state.currentFilteredResults = filtered;

    renderCharts(filtered);
    updateStatsCards(state.allResults); 
    updateTable(filtered);
}

async function handleManualTest() {
    const btn = document.getElementById('triggerTestBtn');
    const serverSelect = document.getElementById('serverSelect');
    const serverId = serverSelect.value === 'null' ? null : parseInt(serverSelect.value);
    btn.disabled = true; btn.classList.add('is-loading'); showToast('toastTestInProgress', 'info');
    const prevTimestamp = state.allResults[0]?.timestamp;
    try {
        await triggerTest(serverId);
        let attempts = 0;
        state.pollingInterval = setInterval(async () => {
            attempts++;
            const latest = await getLatestResult();
            const isNew = latest && (!prevTimestamp || new Date(latest.timestamp) > new Date(prevTimestamp));
            if (isNew) {
                clearInterval(state.pollingInterval); showToast('toastTestComplete', 'success');
                state.allResults = await fetchResults(); renderData();
                btn.disabled = false; btn.classList.remove('is-loading');
            } else if (attempts > 25) {
                clearInterval(state.pollingInterval); showToast('toastTestTimeout', 'error');
                btn.disabled = false; btn.classList.remove('is-loading');
            }
        }, 3000);
    } catch (e) { showToast('toastTestError', 'error'); btn.disabled = false; btn.classList.remove('is-loading'); }
}

async function handleDelete() {
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
        try { await deleteEntries(ids); showToast('toastDeleteSuccess', 'success'); state.allResults = await fetchResults(); renderData(); document.getElementById('deleteSelectedBtn').style.display = 'none'; document.getElementById('selectAllCheckbox').checked = false; } catch(e) { showToast('toastDeleteError', 'error'); }
    }
}

initializeApp();