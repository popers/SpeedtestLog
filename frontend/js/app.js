import { state } from './state.js';
import { translations } from './i18n.js';
// ZMIANA: Import triggerGoogleBackup 
import { fetchResults, fetchServers, fetchSettings, updateSettings, triggerTest, deleteEntries, getLatestResult, getAuthStatus, logoutUser, loginUser, fetchBackupSettings, saveBackupSettings, getGoogleAuthUrl, revokeGoogleAuth, triggerGoogleBackup } from './api.js';
import { setLanguage, setNightMode, showToast, parseISOLocally, getNextRunTimeText, getUnitLabel, convertValue, formatCountdown } from './utils.js';
import { renderCharts } from './charts.js';
import { updateStatsCards, updateTable, showDetailsModal, updateLangButtonUI, setLogoutButtonVisibility } from './ui.js';

// --- ZMIENNE WATCHDOGA ---
let watchdogInterval = null;
let wdChart = null;
let resizeTimer = null;
let countdownInterval = null; // Zmienna dla interwału licznika

// --- Main Logic & Event Listeners ---

async function initializeApp() {
    const savedLang = localStorage.getItem('language') || navigator.language.split('-')[0];
    const initialLang = translations[savedLang] ? savedLang : 'pl';
    setLanguage(initialLang); 
    updateLangButtonUI(initialLang); 
    
    const savedTheme = localStorage.getItem('theme');
    
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
    
    // Ładowanie zapisanej ilości wierszy
    const savedPerPage = localStorage.getItem('itemsPerPage');
    if(savedPerPage) {
        state.itemsPerPage = savedPerPage === 'all' ? 'all' : parseInt(savedPerPage);
        const select = document.getElementById('rowsPerPageSelect');
        if(select) select.value = savedPerPage;
    }

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
    } else if (page === 'backup.html') {
        loadBackupPage();
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
    
    // Clear existing countdown when navigating away or refreshing dashboard
    if (countdownInterval) clearInterval(countdownInterval);
    
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

        // Ładowanie stanu checkboxa testu startowego
        const startupInput = document.getElementById('startupTestInput');
        if(startupInput) {
            // API zwraca startup_test_enabled, domyślnie true jeśli undefined
            startupInput.checked = (s.startup_test_enabled !== false); 
            
            // Add immediate listener for feedback
            startupInput.addEventListener('change', () => {
                if (startupInput.checked) {
                    showToast('toastStartupTestOn', 'success');
                } else {
                    showToast('toastStartupTestOff', 'info');
                }
            });
        }
        
    } catch (e) {
        console.error("Error loading settings:", e);
    }
}

// Funkcja pomocnicza do tłumaczenia statusów
function getLocalizedStatus(status) {
    const lang = translations[state.currentLang];
    if (!status) return '-';
    
    if (status.includes('success')) return lang.statusSuccess || 'Sukces';
    if (status.includes('auth_error')) return lang.statusAuthError || 'Błąd autoryzacji';
    if (status.includes('error')) return lang.statusError || 'Błąd';
    
    return status;
}

// --- NOWE: Obsługa strony backup.html ---
async function loadBackupPage() {
    // Sprawdź czy wracamy z autoryzacji
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    if(authStatus === 'success') {
        showToast('toastDriveSaved', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
        showToast('toastTestError', 'error'); // Generic error
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Wyświetl redirect URI
    const redirectSpan = document.getElementById('redirectUrlDisplay');
    if(redirectSpan) {
        redirectSpan.textContent = window.location.origin + '/api/backup/google/callback';
    }

    try {
        const s = await fetchBackupSettings();
        
        const gdClientId = document.getElementById('gdClientId');
        const gdClientSecret = document.getElementById('gdClientSecret');
        const gdFolderName = document.getElementById('gdFolderName');
        const gdRetention = document.getElementById('gdRetention');
        const gdScheduleDays = document.getElementById('gdScheduleDays');
        const gdScheduleTime = document.getElementById('gdScheduleTime');
        
        const gdStatus = document.getElementById('gDriveStatus');
        const gdAuthBtn = document.getElementById('gdAuthBtn');
        const gdRevokeBtn = document.getElementById('gdRevokeBtn');
        const gdSaveBtn = document.getElementById('gdSaveBtn');
        // NOWE: Przycisk ręcznego uruchamiania
        const gdRunBtn = document.getElementById('gdRunBtn');

        const lastRunVal = document.getElementById('lastRunVal');
        const lastStatusVal = document.getElementById('lastStatusVal');

        if(gdClientId) gdClientId.value = s.client_id || '';
        if(gdClientSecret) gdClientSecret.value = s.client_secret || '';
        if(gdFolderName) gdFolderName.value = s.folder_name || 'SpeedtestLog_Backup';
        if(gdRetention) gdRetention.value = s.retention_days || 30;
        if(gdScheduleDays) gdScheduleDays.value = s.schedule_days || 1;
        if(gdScheduleTime) gdScheduleTime.value = s.schedule_time || '03:00';

        // Status i przyciski
        if (s.has_token && s.is_enabled) {
            gdStatus.className = 'gdrive-status connected';
            gdStatus.innerHTML = `<span class="material-symbols-rounded">link</span> <span data-i18n-key="authStatusConnected">${translations[state.currentLang].authStatusConnected}</span>`;
            gdAuthBtn.style.display = 'none';
            gdRevokeBtn.style.display = 'flex';
            if(gdRunBtn) gdRunBtn.style.display = 'flex'; // Pokaż przycisk uruchamiania
            
            // Blokujemy edycję ID/Secret gdy połączono
            gdClientId.disabled = true;
            gdClientSecret.disabled = true;
        } else {
            gdStatus.className = 'gdrive-status disconnected';
            gdStatus.innerHTML = `<span class="material-symbols-rounded">link_off</span> <span data-i18n-key="authStatusDisconnected">${translations[state.currentLang].authStatusDisconnected}</span>`;
            gdAuthBtn.style.display = 'flex';
            gdRevokeBtn.style.display = 'none';
            if(gdRunBtn) gdRunBtn.style.display = 'none'; // Ukryj przycisk uruchamiania
            
            gdClientId.disabled = false;
            gdClientSecret.disabled = false;
        }

        // Ostatnie uruchomienie - tłumaczenie statusu
        if(lastRunVal) lastRunVal.textContent = s.last_run ? new Date(s.last_run).toLocaleString() : '-';
        if(lastStatusVal) lastStatusVal.textContent = getLocalizedStatus(s.last_status);

        // Obsługa przycisków
        if(gdSaveBtn) {
            const newBtn = gdSaveBtn.cloneNode(true);
            gdSaveBtn.parentNode.replaceChild(newBtn, gdSaveBtn);
            newBtn.addEventListener('click', async () => {
                await saveBackupConfig(s.has_token); 
            });
        }

        if(gdAuthBtn) {
            const newAuth = gdAuthBtn.cloneNode(true);
            gdAuthBtn.parentNode.replaceChild(newAuth, gdAuthBtn);
            newAuth.addEventListener('click', async () => {
                const ok = await saveBackupConfig(s.has_token); 
                if(ok) {
                    try {
                        const url = await getGoogleAuthUrl();
                        window.location.href = url; 
                    } catch(e) { showToast('toastTestError', 'error'); }
                }
            });
        }

        if(gdRevokeBtn) {
            const newRevoke = gdRevokeBtn.cloneNode(true);
            gdRevokeBtn.parentNode.replaceChild(newRevoke, gdRevokeBtn);
            newRevoke.addEventListener('click', async () => {
                try {
                    await revokeGoogleAuth();
                    showToast('toastAuthRevoked', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } catch(e) { showToast('toastTestError', 'error'); }
            });
        }

        // NOWE: Listener dla przycisku ręcznego uruchamiania backupu
        if(gdRunBtn) {
            const newRun = gdRunBtn.cloneNode(true);
            gdRunBtn.parentNode.replaceChild(newRun, gdRunBtn);
            newRun.addEventListener('click', async () => {
                newRun.disabled = true;
                newRun.classList.add('is-loading'); // Dodaj klasę animacji
                showToast('toastBackupStarted', 'info');
                
                const initialLastRun = s.last_run; // Zapamiętaj czas ostatniego backupu
                
                try {
                    await triggerGoogleBackup();
                    
                    // Rozpocznij polling (odpytywanie) o status backupu
                    let attempts = 0;
                    const maxAttempts = 20; // np. 20 * 3s = 60s timeout
                    
                    const checkInterval = setInterval(async () => {
                        attempts++;
                        try {
                            const freshSettings = await fetchBackupSettings();
                            
                            // Sprawdź czy data ostatniego uruchomienia się zmieniła
                            const isNewRun = freshSettings.last_run && (!initialLastRun || new Date(freshSettings.last_run) > new Date(initialLastRun));
                            
                            if (isNewRun || attempts >= maxAttempts) {
                                clearInterval(checkInterval);
                                newRun.disabled = false;
                                newRun.classList.remove('is-loading');
                                
                                if (isNewRun) {
                                    // Zaktualizuj UI
                                    if(lastRunVal) lastRunVal.textContent = new Date(freshSettings.last_run).toLocaleString();
                                    if(lastStatusVal) lastStatusVal.textContent = getLocalizedStatus(freshSettings.last_status);
                                    
                                    if (freshSettings.last_status === 'success') {
                                        showToast('toastBackupSuccess', 'success');
                                    } else {
                                        showToast('toastBackupFailed', 'error');
                                    }
                                } else {
                                    // Timeout
                                    showToast('toastTestTimeout', 'error');
                                }
                            }
                        } catch(err) {
                            console.error("Polling error", err);
                        }
                    }, 3000); // Sprawdzaj co 3 sekundy
                    
                } catch(e) {
                    showToast('toastTestError', 'error');
                    newRun.disabled = false;
                    newRun.classList.remove('is-loading');
                }
            });
        }

    } catch(e) {
        console.error(e);
    }
}

async function saveBackupConfig(wasConnected) {
    try {
        const gdClientId = document.getElementById('gdClientId').value;
        const gdClientSecret = document.getElementById('gdClientSecret').value;
        const gdFolderName = document.getElementById('gdFolderName').value;
        const gdRetention = parseInt(document.getElementById('gdRetention').value);
        const gdScheduleDays = parseInt(document.getElementById('gdScheduleDays').value);
        const gdScheduleTime = document.getElementById('gdScheduleTime').value;

        const payload = {
            client_id: gdClientId,
            client_secret: gdClientSecret,
            folder_name: gdFolderName,
            schedule_days: gdScheduleDays,
            schedule_time: gdScheduleTime,
            retention_days: gdRetention,
            is_enabled: wasConnected // Zachowaj status włączenia jeśli był włączony
        };

        await saveBackupSettings(payload);
        showToast('toastDriveSaved', 'success');
        return true;
    } catch(e) {
        showToast('toastSettingsError', 'error');
        return false;
    }
}

async function saveSettingsFromPage() {
    try {
        const currentSettings = await fetchSettings();
        
        const target = document.getElementById('pingTargetInput').value;
        const interval = parseInt(document.getElementById('pingIntervalInput').value);
        const dl = parseInt(document.getElementById('declaredDownloadInput').value) || 0;
        const ul = parseInt(document.getElementById('declaredUploadInput').value) || 0;
        
        // Odczyt checkboxa
        const startupInput = document.getElementById('startupTestInput');
        const startupEnabled = startupInput ? startupInput.checked : true;

        await updateSettings({
            server_id: currentSettings.selected_server_id, 
            schedule_hours: currentSettings.schedule_hours, 
            ping_target: target,
            ping_interval: interval,
            declared_download: dl,
            declared_upload: ul,
            startup_test_enabled: startupEnabled
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
            declared_upload: currentSettings.declared_upload,
            startup_test_enabled: currentSettings.startup_test_enabled
        });
        
        if (sourceId === 'serverSelect') {
            const serverText = serverSelect.options[serverSelect.selectedIndex].text;
            showToast('toastServerChanged', 'success', ` ${serverText}`);
        } else if (sourceId === 'scheduleSelect') {
            state.currentScheduleHours = newScheduleHours;
            // Powiadomienie o wyłączeniu
            if (newScheduleHours === 0) {
                showToast('toastScheduleDisabled', 'info');
            } else {
                const intervalText = scheduleSelect.options[scheduleSelect.selectedIndex].text;
                showToast('toastScheduleChanged', 'success', ` ${intervalText}`);
            }
            
            const nextRunEl = document.getElementById('nextRunTime');
            if(nextRunEl) nextRunEl.textContent = getNextRunTimeText();
            
            // Restartuj licznik po zmianie harmonogramu
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

function startWatchdogPolling() {
    if (watchdogInterval) clearInterval(watchdogInterval);
    updateWatchdogUI(); 
    watchdogInterval = setInterval(updateWatchdogUI, 5000); 
}

function stopWatchdogPolling() {
    if (watchdogInterval) clearInterval(watchdogInterval);
}

// Funkcja uruchamiająca licznik (ZMIANA: Dynamiczne tłumaczenie)
function startNextRunCountdown() {
    const countdownEl = document.getElementById('nextRunCountdown');
    if (!countdownEl) return;

    // Wyczyść poprzedni interwał
    if (countdownInterval) clearInterval(countdownInterval);

    // Jeśli harmonogram wyłączony lub brak danych o ostatnim teście, ukryj licznik
    if (state.currentScheduleHours === 0 || !state.lastTestTimestamp) {
        countdownEl.style.display = 'none';
        countdownEl.textContent = '';
        return;
    }

    countdownEl.style.display = 'block';
    
    // ZMIANA: Usunięto pobieranie stałego 'prefix' tutaj.
    
    const updateTimer = () => {
        try {
            // ZMIANA: Pobierz aktualny język i prefiks wewnątrz pętli
            const lang = translations[state.currentLang];
            const prefix = lang.countdownPrefix || 'za';

            const lastRunDate = parseISOLocally(state.lastTestTimestamp);
            if (!lastRunDate) return;

            const scheduleIntervalMs = state.currentScheduleHours * 60 * 60 * 1000;
            const nextRunDate = new Date(lastRunDate.getTime() + scheduleIntervalMs);
            const now = new Date();
            const diff = nextRunDate - now;

            if (diff <= 0) {
                // Czas minął, teoretycznie test powinien biec lub zaraz pobiegnie
                countdownEl.textContent = ""; 
            } else {
                countdownEl.textContent = `${prefix} ${formatCountdown(diff)}`;
            }
        } catch (e) {
            console.error("Countdown error", e);
        }
    };

    updateTimer(); // Wywołaj raz natychmiast
    countdownInterval = setInterval(updateTimer, 1000);
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
    
    // Pobieramy kolory z CSS, aby siatka pasowała do motywu
    const style = getComputedStyle(document.body);
    // Kolor siatki: delikatny biały w ciemnym trybie, delikatny czarny w jasnym
    const isDark = !document.body.classList.contains('light-mode');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const tickColor = isDark ? '#888' : '#666';

    if (wdChart) {
        wdChart.data.labels = labels;
        wdChart.data.datasets[0].data = dataPoints;
        // Aktualizacja kolorów siatki przy zmianie motywu (jeśli wykres już istnieje)
        wdChart.options.scales.x.grid.color = gridColor;
        wdChart.options.scales.y.grid.color = gridColor;
        wdChart.options.scales.x.ticks.color = tickColor;
        wdChart.options.scales.y.ticks.color = tickColor;
        
        wdChart.update('none');
    } else {
        wdChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: dataPoints,
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)', // Lekkie wypełnienie pod wykresem
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, 
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { 
                        enabled: true, // Włączamy tooltipy, żeby siatka miała sens przy najeżdżaniu
                        mode: 'index',
                        intersect: false
                    } 
                },
                scales: { 
                    x: { 
                        display: true, // Pokaż oś X
                        grid: {
                            color: gridColor,
                            drawBorder: false,
                            display: false // Ukrywamy pionowe linie siatki dla czystości (częste w sparkline'ach)
                        },
                        ticks: {
                            display: false // Ukrywamy etykiety czasu, bo mało miejsca
                        }
                    }, 
                    y: { 
                        display: true, // Pokaż oś Y
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: tickColor,
                            font: {
                                size: 9 // Mała czcionka
                            },
                            stepSize: 0.5 // ZMIANA: Krok siatki co 0.5
                        },
                        suggestedMin: 0
                    } 
                }
            }
        });
    }
}

function handleSort(column) {
    if (state.currentSort.column === column) {
        state.currentSort.direction = state.currentSort.direction === 'desc' ? 'asc' : 'desc';
    } else {
        state.currentSort.column = column;
        state.currentSort.direction = 'desc';
    }
    
    state.currentPage = 1;
    renderData();
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

    const themeToggle = document.getElementById('themeToggle');
    if(themeToggle) themeToggle.addEventListener('click', () => {
        const isCurrentlyLight = document.body.classList.contains('light-mode');
        setNightMode(isCurrentlyLight); 
        
        if (isCurrentlyLight) showToast('toastThemeDark', 'info');
        else showToast('toastThemeLight', 'info');
        
        // Odśwież wykresy (Chart.js), aby pobrały nowe kolory
        if (document.getElementById('downloadChart') && state.currentFilteredResults) {
            renderCharts(state.currentFilteredResults);
        }
        // Odśwież wykres watchdoga jeśli jest widoczny
        if (wdChart) {
            wdChart.destroy();
            wdChart = null;
            updateWatchdogUI();
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
            if(del) { 
                del.style.display = c > 0 ? 'flex' : 'none'; 
                // ZMIANA: Użycie ikony Material Symbols zamiast emoji
                del.innerHTML=`<span class="material-symbols-rounded">delete</span> ${translations[state.currentLang].deleteSelected} (${c})`; 
            }
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
                    
                    // ZMIANA: Generowanie nazwy pliku z datą i godziną po stronie klienta
                    const date = new Date();
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    
                    const filename = `backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.sql`;
                    
                    const a = document.createElement('a'); a.href = url; 
                    a.download = filename;
                    
                    document.body.appendChild(a); a.click(); a.remove();
                    showToast('backupCreatedSuccess', 'success');
                } else throw new Error();
            } catch(e) { showToast('backupCreatedError', 'error'); }
        });
    }
    const restoreForm = document.getElementById('restoreForm');
    if(restoreForm) {
        const fileInput = document.getElementById('backupFile');
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        if (fileInput && fileNameDisplay) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    fileNameDisplay.textContent = fileInput.files[0].name;
                } else {
                    const key = fileNameDisplay.getAttribute('data-i18n-key');
                    if (key && translations[state.currentLang][key]) {
                        fileNameDisplay.textContent = translations[state.currentLang][key];
                    } else {
                        fileNameDisplay.textContent = 'Brak wybranego pliku';
                    }
                }
            });
        }

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

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (state.currentFilteredResults && state.currentFilteredResults.length > 0 && document.getElementById('downloadChart')) {
                renderCharts(state.currentFilteredResults);
            }
        }, 250); 
    });
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
            // Jeśli 0, to wyłączony, jeśli 1..24 to godziny
            scheduleSelect.value = (settingsData.schedule_hours !== null) ? settingsData.schedule_hours : 1;
            state.currentScheduleHours = (settingsData.schedule_hours !== null) ? settingsData.schedule_hours : 1;
        }
        
        const savedFilter = localStorage.getItem('dashboardFilter') || '24h';
        const savedUnit = localStorage.getItem('displayUnit') || 'Mbps';
        if (document.getElementById('filterSelect')) document.getElementById('filterSelect').value = savedFilter;
        if (document.getElementById('unitSelect')) document.getElementById('unitSelect').value = savedUnit;

        state.lastTestTimestamp = settingsData.latest_test_timestamp;
        const nextRunEl = document.getElementById('nextRunTime');
        if(nextRunEl) nextRunEl.textContent = getNextRunTimeText();
        
        // Uruchom licznik
        startNextRunCountdown();

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
                state.allResults = await fetchResults(); 
                
                // ZMIANA: Aktualizacja timestampa ostatniego testu po udanym teście
                if (state.allResults.length > 0) {
                    state.lastTestTimestamp = state.allResults[0].timestamp;
                    const nextRunEl = document.getElementById('nextRunTime');
                    if(nextRunEl) nextRunEl.textContent = getNextRunTimeText();
                    
                    // Restartuj licznik po nowym teście
                    startNextRunCountdown();
                }
                
                renderData();
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