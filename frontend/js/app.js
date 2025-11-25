import { state } from './state.js';
import { translations } from './i18n.js';
import { fetchSettings, updateSettings, getAuthStatus, logoutUser, loginUser } from './api.js';
import { setLanguage, setNightMode, showToast, getNextRunTimeText, hexToRgba } from './utils.js';
import { updateLangButtonUI, setLogoutButtonVisibility } from './ui.js';

// Importy nowych modułów
import { initNotificationSystem } from './notifications.js';
import { startWatchdogPolling, stopWatchdogPolling, resetWatchdogChart, refreshWatchdogPopover } from './watchdog.js';
import { loadDashboardData, renderData, initDashboardListeners } from './dashboard.js';
import { loadSettingsToForm, loadNotificationSettingsToForm, initSettingsListeners } from './settings-page.js';
import { loadBackupPage, initBackupListeners, updateBackupStatusUI } from './backup-page.js';

let resizeTimer = null;

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
            
            // Załaduj wstępne ustawienia powiadomień
            initNotificationSystem();
            
        } catch (e) {
            setLogoutButtonVisibility(false);
        }
    }
    
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
    
    setupGlobalEventListeners();
    
    // Synchronizacja ustawień (kolory + język) z bazy
    if (!document.getElementById('loginForm')) {
        syncGlobalSettings();
    }

    const page = window.location.pathname.split("/").pop();
    
    if (page === 'settings.html') {
        loadSettingsToForm();
        loadNotificationSettingsToForm();
        initSettingsListeners();
    } else if (page === 'backup.html') {
        loadBackupPage();
        initBackupListeners();
    } else if (page === 'index.html' || page === '' || page === '/') {
        handleDashboardNavigation();
        initDashboardListeners();
        window.addEventListener('hashchange', handleDashboardNavigation);
    }

    if (!document.getElementById('loginForm')) {
        startWatchdogPolling();
        
        // Nasłuchiwanie na event z notifications.js, aby odświeżyć dashboard
        window.addEventListener('speedtest-data-updated', () => {
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                loadDashboardData();
            }
        });
    }
}

async function syncGlobalSettings() {
    try {
        const s = await fetchSettings();
        applyColorsToCSS(s);
        
        // Zastosuj język z bazy danych, jeśli jest inny niż obecny
        if (s.app_language && s.app_language !== state.currentLang) {
            setLanguage(s.app_language);
            updateLangButtonUI(s.app_language);
            // Odśwież interfejs, jeśli jesteśmy na stronie backupu lub ustawień
            if (window.location.pathname.includes('backup.html')) loadBackupPage();
            if (window.location.pathname.includes('settings.html')) loadSettingsToForm();
        }
    } catch (e) {
        console.log("Could not load global settings");
    }
}

function applyColorsToCSS(settings) {
    const root = document.body;
    if (settings.chart_color_download) {
        root.style.setProperty('--color-download', settings.chart_color_download);
        root.style.setProperty('--color-download-bg', hexToRgba(settings.chart_color_download, 0.15));
    }
    if (settings.chart_color_upload) {
        root.style.setProperty('--color-upload', settings.chart_color_upload);
        root.style.setProperty('--color-upload-bg', hexToRgba(settings.chart_color_upload, 0.15));
    }
    if (settings.chart_color_ping) {
        root.style.setProperty('--color-ping', settings.chart_color_ping);
        root.style.setProperty('--color-ping-bg', hexToRgba(settings.chart_color_ping, 0.15));
    }
    if (settings.chart_color_jitter) {
        root.style.setProperty('--color-jitter', settings.chart_color_jitter);
        root.style.setProperty('--color-jitter-bg', hexToRgba(settings.chart_color_jitter, 0.15));
    }
    // Kolory Latency
    if (settings.chart_color_lat_dl_low) root.style.setProperty('--color-lat-dl-low', settings.chart_color_lat_dl_low);
    if (settings.chart_color_lat_dl_high) root.style.setProperty('--color-lat-dl-high', settings.chart_color_lat_dl_high);
    if (settings.chart_color_lat_ul_low) root.style.setProperty('--color-lat-ul-low', settings.chart_color_lat_ul_low);
    if (settings.chart_color_lat_ul_high) root.style.setProperty('--color-lat-ul-high', settings.chart_color_lat_ul_high);
    
    // NOWE: Kolor Watchdog
    if (settings.chart_color_ping_watchdog) {
        root.style.setProperty('--color-ping-watchdog', settings.chart_color_ping_watchdog);
        root.style.setProperty('--color-ping-watchdog-bg', hexToRgba(settings.chart_color_ping_watchdog, 0.15));
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

function setupGlobalEventListeners() {
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
    window.addEventListener('click', (e) => {
        if (langMenu) langMenu.classList.remove('show');
    });
    
    document.querySelectorAll('.lang-menu li').forEach(li => {
        li.addEventListener('click', async () => {
            const newLang = li.dataset.lang;
            setLanguage(newLang);            
            updateLangButtonUI(newLang);     
            showToast('toastLangChanged', 'success');
            
            if (!document.getElementById('loginForm')) {
                try {
                    // ZMIANA: Uproszczona aktualizacja języka. 
                    // Wysyłamy TYLKO app_language, aby uniknąć nadpisania innych ustawień 
                    // (np. harmonogramu) starymi/domyślnymi wartościami.
                    // Backend (schemas.py) musi mieć ustawione domyślne wartości na None dla innych pól.
                    
                    const payload = {
                        app_language: newLang
                    };
                    await updateSettings(payload);
                    
                    // Jeśli jesteśmy na dashboardzie, upewniamy się, że stan harmonogramu jest zsynchronizowany
                    // Chociaż przy zmianie języka nie powinien się zmienić, warto odświeżyć UI
                    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                         // Opcjonalnie można przeładować ustawienia, aby upewnić się, że UI jest spójne
                         // const freshSettings = await fetchSettings();
                         // state.currentScheduleHours = freshSettings.schedule_hours;
                    }

                } catch (e) { console.error("Błąd zapisu języka:", e); }
            }
            
            if (window.location.pathname.includes('backup.html')) {
                updateBackupStatusUI();
                loadBackupPage();
            }
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                if (state.allResults.length > 0) renderData();
                const nextRun = document.getElementById('nextRunTime');
                if(nextRun) nextRun.textContent = getNextRunTimeText();
            }
        });
    });

    const themeToggle = document.getElementById('themeToggle');
    if(themeToggle) themeToggle.addEventListener('click', () => {
        const isCurrentlyLight = document.body.classList.contains('light-mode');
        setNightMode(isCurrentlyLight); 
        
        if (isCurrentlyLight) showToast('toastThemeDark', 'info');
        else showToast('toastThemeLight', 'info');
        
        if (document.getElementById('downloadChart') && state.currentFilteredResults) {
            renderData();
        }
        
        // Reset Watchdoga
        resetWatchdogChart();
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

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            sessionStorage.setItem('pendingToast', 'logout');
            await logoutUser();
        });
    }

    const wdIcon = document.getElementById('watchdogIcon');
    const wdPopover = document.getElementById('watchdogPopover');
    if(wdIcon) {
        wdIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            wdPopover.classList.toggle('show');
            refreshWatchdogPopover();
        });
    }
    window.addEventListener('click', (e) => {
        if(wdPopover && !wdPopover.contains(e.target) && e.target !== wdIcon) {
            wdPopover.classList.remove('show');
        }
    });

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (state.currentFilteredResults && state.currentFilteredResults.length > 0 && document.getElementById('downloadChart')) {
                renderData(); // renderData calls renderCharts
            }
        }, 250); 
    });
}

initializeApp();