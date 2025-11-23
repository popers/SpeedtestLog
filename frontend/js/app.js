import { state } from './state.js';
import { translations } from './i18n.js';
import { fetchSettings, updateSettings, getAuthStatus, logoutUser, loginUser } from './api.js';
import { setLanguage, setNightMode, showToast, getNextRunTimeText, hexToRgba } from './utils.js';
import { updateLangButtonUI, setLogoutButtonVisibility } from './ui.js';

// Importy nowych modułów
import { initNotificationSystem } from './notifications.js';
import { startWatchdogPolling, stopWatchdogPolling, resetWatchdogChart } from './watchdog.js';
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
    window.addEventListener('click', () => {
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
                    const currentSettings = await fetchSettings();
                    const payload = {
                        server_id: currentSettings.selected_server_id,
                        schedule_hours: currentSettings.schedule_hours,
                        ping_target: currentSettings.ping_target,
                        ping_interval: currentSettings.ping_interval,
                        declared_download: currentSettings.declared_download,
                        declared_upload: currentSettings.declared_upload,
                        startup_test_enabled: currentSettings.startup_test_enabled,
                        chart_color_download: currentSettings.chart_color_download,
                        chart_color_upload: currentSettings.chart_color_upload,
                        chart_color_ping: currentSettings.chart_color_ping,
                        chart_color_jitter: currentSettings.chart_color_jitter,
                        app_language: newLang
                    };
                    await updateSettings(payload);
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
            // Zaimportowane z charts.js
            const { renderCharts } = require('./charts.js'); // Dynamiczny import, lub przeładowanie widoku
            // W tym setupie lepiej po prostu wywołać renderData, które jest zaimportowane
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
            // Update wywołuje się z interwału, ale można wymusić
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