import { state } from './state.js';
import { translations } from './i18n.js';
import { fetchSettings, updateSettings, getAuthStatus, logoutUser, loginUser } from './api.js';
import { setLanguage, setNightMode, showToast, getNextRunTimeText, hexToRgba } from './utils.js';
import { updateLangButtonUI, setLogoutButtonVisibility } from './ui.js';

import { initNotificationSystem } from './notifications.js';
import { startWatchdogPolling, stopWatchdogPolling, resetWatchdogChart, refreshWatchdogPopover } from './watchdog.js';
import { loadDashboardData, renderData, initDashboardListeners } from './dashboard.js';
import { loadSettingsToForm, loadNotificationSettingsToForm, initSettingsListeners } from './settings-page.js';
import { loadBackupPage, initBackupListeners, updateBackupStatusUI } from './backup-page.js';

let resizeTimer = null;

// Funkcja czyszcząca URL z index.html i innych artefaktów
function cleanUrl() {
    const path = window.location.pathname;
    if (path.endsWith('index.html')) {
        const newPath = path.substring(0, path.length - 'index.html'.length);
        window.history.replaceState({}, document.title, newPath + window.location.search);
    }
}

// Funkcja aktualizująca tytuł strony (<title>)
function updatePageTitle() {
    const lang = translations[state.currentLang];
    const path = window.location.pathname;
    
    let pageName = "";
    
    if (path.includes('/settings')) {
        pageName = lang.navSettings;
    } else if (path.includes('/backup')) {
        pageName = lang.navBackup;
    } else if (path.includes('/login') || document.getElementById('loginForm')) {
        pageName = lang.loginTitle;
    } else {
        // Dashboard / Strona główna
        document.title = "SpeedtestLog";
        return;
    }
    
    if (pageName) {
        document.title = `${pageName} - SpeedtestLog`;
    }
}

async function initializeApp() {
    cleanUrl();

    // 1. Sprawdź czy wracamy z logowania OIDC
    const postLoginLang = sessionStorage.getItem('post_login_lang');
    let initialLang;

    if (postLoginLang) {
        console.log("Applying post-login language preference:", postLoginLang);
        initialLang = postLoginLang;
        sessionStorage.removeItem('post_login_lang');
        localStorage.setItem('language', initialLang);
        updateSettings({ app_language: initialLang }).catch(e => console.warn("Failed to sync lang to server:", e));
    } else {
        const savedLang = localStorage.getItem('language') || navigator.language.split('-')[0];
        initialLang = translations[savedLang] ? savedLang : 'pl';
    }

    setLanguage(initialLang); 
    updateLangButtonUI(initialLang); 
    updatePageTitle(); 
    
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'dark') setNightMode(true); 
    else setNightMode(false);

    // Wykrywanie strony na podstawie ścieżki (bez rozszerzenia .html)
    const path = window.location.pathname;
    const isLoginPage = path.includes('/login') || document.getElementById('loginForm');
    const isSettingsPage = path.includes('/settings');
    const isBackupPage = path.includes('/backup');
    const isDashboard = !isLoginPage && !isSettingsPage && !isBackupPage;

    if (isLoginPage) {
        // --- LOGIKA EKRANU LOGOWANIA ---
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get('error') === 'oidc_failed') {
                showToast('toastTestError', 'error'); 
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            const authStatus = await getAuthStatus();
            
            if (authStatus.oidc_enabled) {
                const oidcContainer = document.getElementById('oidcContainer');
                const oidcBtn = document.getElementById('oidcLoginBtn');
                
                if(oidcContainer) oidcContainer.style.display = 'block';
                if(oidcBtn) {
                    oidcBtn.addEventListener('click', () => {
                        sessionStorage.setItem('post_login_lang', state.currentLang);
                        window.location.href = '/api/auth/oidc/login';
                    });
                }
            }
        } catch (e) {
            console.error("Auth check failed on login page", e);
        }
    } else {
        // --- LOGIKA DASHBOARDU (ZALOGOWANY) ---
        try {
            const authStatus = await getAuthStatus();
            setLogoutButtonVisibility(authStatus.enabled);
            initNotificationSystem();
        } catch (e) {
            setLogoutButtonVisibility(false);
        }
        
        startWatchdogPolling();
        window.addEventListener('speedtest-data-updated', () => {
            if (isDashboard) {
                loadDashboardData();
            }
        });
        
        syncGlobalSettings();
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
    
    if (isSettingsPage) {
        loadSettingsToForm();
        loadNotificationSettingsToForm();
        initSettingsListeners();
    } else if (isBackupPage) {
        loadBackupPage();
        initBackupListeners();
    } else if (isDashboard) {
        await handleDashboardNavigation();
        initDashboardListeners();
        // Nasłuchuj zmian w historii (wstecz/dalej) dla parametrów URL
        window.addEventListener('popstate', handleDashboardNavigation);
    }
}

async function syncGlobalSettings() {
    try {
        const s = await fetchSettings();
        applyColorsToCSS(s);

        if (s.app_language && s.app_language !== state.currentLang) {
             setLanguage(s.app_language);
             updateLangButtonUI(s.app_language);
             updatePageTitle(); 
             if (window.location.pathname.includes('backup')) loadBackupPage();
             if (window.location.pathname.includes('settings')) loadSettingsToForm();
        }

    } catch (e) { console.log("Could not load global settings"); }
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
    if (settings.chart_color_lat_dl_low) root.style.setProperty('--color-lat-dl-low', settings.chart_color_lat_dl_low);
    if (settings.chart_color_lat_dl_high) root.style.setProperty('--color-lat-dl-high', settings.chart_color_lat_dl_high);
    if (settings.chart_color_lat_ul_low) root.style.setProperty('--color-lat-ul-low', settings.chart_color_lat_ul_low);
    if (settings.chart_color_lat_ul_high) root.style.setProperty('--color-lat-ul-high', settings.chart_color_lat_ul_high);
    if (settings.chart_color_ping_watchdog) {
        root.style.setProperty('--color-ping-watchdog', settings.chart_color_ping_watchdog);
        root.style.setProperty('--color-ping-watchdog-bg', hexToRgba(settings.chart_color_ping_watchdog, 0.15));
    }
}

async function handleDashboardNavigation() {
    if (document.getElementById('loginForm')) return;
    if (window.location.pathname.includes('settings')) return;
    if (window.location.pathname.includes('backup')) return;

    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') || 'dashboard';

    await loadDashboardData();
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href && href.includes(`section=${section}`)) {
            link.classList.add('active');
        } else if (section === 'dashboard' && (href === '/' || href === '/?section=dashboard')) {
            link.classList.add('active');
        }
    });

    if (section && section !== 'dashboard') {
        setTimeout(() => {
            const targetElement = document.getElementById(section);
            const scrollContainer = document.querySelector('.content-scroll');
            if (targetElement && scrollContainer) targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150); 
    } else {
        const scrollContainer = document.querySelector('.content-scroll');
        if(scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
    }
}

function setupGlobalEventListeners() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    const hamburgerIcon = hamburgerBtn ? hamburgerBtn.querySelector('.material-symbols-rounded') : null;

    const updateHamburgerIcon = (isOpen) => {
        if (hamburgerIcon) hamburgerIcon.textContent = isOpen ? 'close' : 'menu';
    };

    const closeSidebar = () => { 
        if(sidebar) sidebar.classList.remove('open'); 
        if(sidebarOverlay) sidebarOverlay.classList.remove('show'); 
        updateHamburgerIcon(false);
    };

    if(hamburgerBtn) hamburgerBtn.addEventListener('click', () => { 
        if(sidebar) {
            const isOpen = sidebar.classList.toggle('open');
            updateHamburgerIcon(isOpen);
        }
        if(sidebarOverlay) sidebarOverlay.classList.toggle('show'); 
    });
    if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            if (href.includes('?section=') && !window.location.pathname.includes('settings') && !window.location.pathname.includes('backup') && !window.location.pathname.includes('login')) {
                e.preventDefault();
                const url = new URL(href, window.location.origin);
                window.history.pushState({}, '', url);
                handleDashboardNavigation();
                if (window.innerWidth <= 992) closeSidebar();
            } else {
                if (window.innerWidth <= 992) closeSidebar();
            }
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
            updatePageTitle(); 
            showToast('toastLangChanged', 'success');
            
            if (!document.getElementById('loginForm')) {
                try {
                    const payload = { app_language: newLang };
                    await updateSettings(payload);
                } catch (e) { console.error("Błąd zapisu języka:", e); }
            }
            
            if (window.location.pathname.includes('backup')) {
                updateBackupStatusUI();
                loadBackupPage();
            }
            if (window.location.pathname === '/' || (!window.location.pathname.includes('settings') && !window.location.pathname.includes('backup'))) {
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
        if (document.getElementById('downloadChart') && state.currentFilteredResults) renderData();
        resetWatchdogChart();
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const data = Object.fromEntries(new FormData(e.target));
            const lang = translations[state.currentLang];
            btn.disabled = true; btn.textContent = lang.loggingIn || 'Logowanie...';
            document.getElementById('loginError').style.display='none';
            
            try { 
                await loginUser(data.username, data.password); 
                updateSettings({ app_language: state.currentLang }).catch(err => console.error("Nie udało się zapisać języka po logowaniu", err));
                sessionStorage.setItem('pendingToast', 'login:' + data.username);
                window.location.href = '/'; 
            } catch (err) { 
                btn.disabled = false; 
                btn.textContent = lang.loginBtn || 'Zaloguj'; 
                document.getElementById('loginError').style.display='block'; 
                console.error("Błąd logowania:", err);
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
                renderData();
            }
        }, 250); 
    });
}

initializeApp();