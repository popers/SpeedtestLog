import { state } from './state.js';
import { translations } from './i18n.js';
import { fetchResults, fetchServers, fetchSettings, updateSettings, triggerTest, deleteEntries, getLatestResult, getAuthStatus, logoutUser } from './api.js';
import { setLanguage, setNightMode, showToast, parseISOLocally, getNextRunTimeText } from './utils.js';
import { renderCharts } from './charts.js';
import { updateStatsCards, updateTable, showDetailsModal, updateLangButtonUI, setLogoutButtonVisibility, exportToPNG } from './ui.js';

// --- Main Logic & Event Listeners ---

async function initializeApp() {
    // 1. Inicjalizacja Języka
    const savedLang = localStorage.getItem('language') || navigator.language.split('-')[0];
    const initialLang = translations[savedLang] ? savedLang : 'pl';
    setLanguage(initialLang); 
    updateLangButtonUI(initialLang); 
    
    // 2. Inicjalizacja Motywu
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setNightMode(true);
    else setNightMode(false);

    // 3. Sprawdzenie Auth (Ukrywanie Logout)
    try {
        const authStatus = await getAuthStatus();
        setLogoutButtonVisibility(authStatus.enabled);
    } catch (e) {
        console.warn("Could not check auth status, assuming disabled UI for safety");
        setLogoutButtonVisibility(false);
    }
    
    // 4. Listenery
    setupEventListeners();
    
    // 5. Pobranie danych (tylko jeśli jesteśmy na dashboardzie)
    if (document.getElementById('dashboard')) {
        await loadDashboardData();
    }
    
    // 6. Listenery backupu (tylko jeśli jesteśmy na podstronie backup)
    if (document.getElementById('downloadBackupBtn')) {
        setupBackupListeners();
    }
}

function setupEventListeners() {
    // Sidebar
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if(hamburgerBtn) hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
    });
    
    if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    });

    if(sidebarOverlay) sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    });

    // Język - Dropdown
    const langBtn = document.getElementById('langBtn');
    const langMenu = document.getElementById('langMenu');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('show');
        });
    }
    window.addEventListener('click', () => {
        if (langMenu && langMenu.classList.contains('show')) {
            langMenu.classList.remove('show');
        }
    });

    document.querySelectorAll('.lang-menu li').forEach(li => {
        li.addEventListener('click', () => {
            const lang = li.dataset.lang;
            setLanguage(lang);            
            updateLangButtonUI(lang);     
            langMenu.classList.remove('show'); 
            showToast('toastLangChanged', 'success');
            
            // --- NAPRAWA: Aktualizacja czasu następnego testu po zmianie języka ---
            const nextRunEl = document.getElementById('nextRunTime');
            if (nextRunEl) {
                nextRunEl.textContent = getNextRunTimeText();
            }
            
            // Odświeżenie wykresów i tabeli (tłumaczenie etykiet)
            if (state.allResults.length > 0) {
                renderData(); 
            }
        });
    });

    // Motyw
    const themeToggle = document.getElementById('themeToggle');
    if(themeToggle) themeToggle.addEventListener('click', () => {
        setNightMode(!document.body.classList.contains('dark-mode'));
    });

    // Test Trigger
    const triggerBtn = document.getElementById('triggerTestBtn');
    if(triggerBtn) triggerBtn.addEventListener('click', handleManualTest);

    // Settings
    const serverSelect = document.getElementById('serverSelect');
    const scheduleSelect = document.getElementById('scheduleSelect');
    
    if(serverSelect) serverSelect.addEventListener('change', handleSettingsChange);
    if(scheduleSelect) scheduleSelect.addEventListener('change', handleSettingsChange);

    // Filter & Unit
    const filterSelect = document.getElementById('filterSelect');
    const unitSelect = document.getElementById('unitSelect');
    
    if(filterSelect) filterSelect.addEventListener('change', renderData);
    if(unitSelect) unitSelect.addEventListener('change', renderData);

    // Delete
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if(deleteBtn) deleteBtn.addEventListener('click', handleDelete);
    
    // Modal Close
    const modalClose = document.getElementById('modalCloseBtn');
    if(modalClose) modalClose.addEventListener('click', () => {
        document.getElementById('detailsModal').classList.remove('show');
        setTimeout(() => document.getElementById('detailsModal').style.display = 'none', 200);
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
         logoutBtn.addEventListener('click', logoutUser);
    }

    // Checkbox Select All
    const selectAll = document.getElementById('selectAllCheckbox');
    if(selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked);
            const delBtn = document.getElementById('deleteSelectedBtn');
            if(delBtn) delBtn.style.display = e.target.checked ? 'flex' : 'none';
        });
    }
    
    // PNG Export
    const pngBtn = document.getElementById('pngBtn');
    if(pngBtn) {
        pngBtn.addEventListener('click', exportToPNG);
    }
    
    // CSV Export
    const csvBtn = document.getElementById('exportBtn');
    if(csvBtn) {
        csvBtn.addEventListener('click', () => { window.location.href = '/api/export'; });
    }
}

async function loadDashboardData() {
    try {
        const serversData = await fetchServers();
        const settingsData = await fetchSettings();
        
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
    
    state.currentFilter = filterSelect ? filterSelect.value : '24h';
    state.currentUnit = unitSelect ? unitSelect.value : 'Mbps';
    
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
    
    btn.disabled = true;
    btn.classList.add('is-loading');
    showToast('toastTestInProgress', 'info');
    
    const prevTimestamp = state.allResults[0]?.timestamp;

    try {
        await triggerTest(serverId);
        let attempts = 0;
        state.pollingInterval = setInterval(async () => {
            attempts++;
            const latest = await getLatestResult();
            const isNew = latest && (!prevTimestamp || new Date(latest.timestamp) > new Date(prevTimestamp));
            
            if (isNew) {
                clearInterval(state.pollingInterval);
                showToast('toastTestComplete', 'success');
                state.allResults = await fetchResults();
                renderData();
                btn.disabled = false;
                btn.classList.remove('is-loading');
            } else if (attempts > 25) {
                clearInterval(state.pollingInterval);
                showToast('toastTestTimeout', 'error');
                btn.disabled = false;
                btn.classList.remove('is-loading');
            }
        }, 3000);
    } catch (e) {
        showToast('toastTestError', 'error');
        btn.disabled = false;
        btn.classList.remove('is-loading');
    }
}

async function handleSettingsChange() {
    const serverId = document.getElementById('serverSelect').value;
    const hours = parseInt(document.getElementById('scheduleSelect').value);
    
    try {
        await updateSettings({
            server_id: serverId === 'null' ? null : parseInt(serverId),
            schedule_hours: hours
        });
        showToast('toastSettingsSaved', 'success');
        state.currentScheduleHours = hours;
        document.getElementById('nextRunTime').textContent = getNextRunTimeText();
    } catch (e) {
        showToast('toastSettingsError', 'error');
    }
}

async function handleDelete() {
    const checked = document.querySelectorAll('.row-checkbox:checked');
    const ids = Array.from(checked).map(cb => cb.dataset.id);
    if (ids.length === 0) return;
    
    if (confirm(translations[state.currentLang].confirmDeleteText || "Are you sure?")) {
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

function setupBackupListeners() {
    const downBtn = document.getElementById('downloadBackupBtn');
    if (downBtn) {
        downBtn.addEventListener('click', async () => {
            showToast('backupGenerating', 'info');
            try {
                const res = await fetch('/api/backup');
                if(res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const header = res.headers.get('Content-Disposition');
                    const parts = header ? header.split('filename=') : [];
                    const filename = parts.length > 1 ? parts[1].replace(/"/g, '') : 'backup.sql';
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    showToast('backupCreatedSuccess', 'success');
                } else {
                     throw new Error();
                }
            } catch(e) {
                showToast('backupCreatedError', 'error');
            }
        });
    }
    
    const restoreForm = document.getElementById('restoreForm');
    if(restoreForm) {
        restoreForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(restoreForm);
            const btn = document.getElementById('restoreBackupBtn');
            btn.disabled = true;
            showToast('restoring', 'info');
            
            try {
                const res = await fetch('/api/restore', { method:'POST', body: formData });
                if(res.ok) {
                    showToast('restoreSuccess', 'success');
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    throw new Error();
                }
            } catch(e) {
                showToast('restoreError', 'error');
                btn.disabled = false;
            }
        });
    }
}

// Start
initializeApp();