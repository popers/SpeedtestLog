import { state } from './state.js';
import { translations } from './i18n.js';

// --- Formattery ---
export function convertValue(value, targetUnit) {
    if (targetUnit === 'MBps') {
        return value / 8; 
    }
    return value; 
}

export function getUnitLabel(unit) {
    if (unit === 'MBps') return 'MB/s';
    return 'Mbps';
}

export function parseISOLocally(isoString) {
    if (!isoString) return null;
    let cleanString = isoString.replace('T', ' ').replace('Z', '').replace(/[\+\-]\d{2}:\d{2}$/, '');
    let parts = cleanString.split(/[\-\s\:]/);
    if (parts.length < 5) return new Date(isoString); 
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; 
    const day = parseInt(parts[2]);
    const hour = parseInt(parts[3]);
    const minute = parseInt(parts[4]);
    const second = parseInt(parts.length > 5 ? parts[5].split('.')[0] : 0);
    return new Date(year, month, day, hour, minute, second); 
}

// --- UX Helpers ---
export function showToast(messageKey, type = 'success', extraContent = '') { 
    const toastNotification = document.getElementById('toastNotification');
    if (!toastNotification) return;

    if (state.toastTimer) clearTimeout(state.toastTimer); 
    
    const lang = translations[state.currentLang];
    const message = (lang[messageKey] || messageKey) + extraContent; 
    
    toastNotification.textContent = message;
    toastNotification.className = 'toast'; 
    toastNotification.classList.add(type);
    toastNotification.classList.add('show');
    state.toastTimer = setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}

// ZMIANA: Funkcja zarządza klasą .light-mode
// isNight = true  -> Tryb CIEMNY (Domyślny) -> Usuń klasę .light-mode
// isNight = false -> Tryb JASNY  (Opcjonalny) -> Dodaj klasę .light-mode
export function setNightMode(isNight) {
    const themeToggle = document.getElementById('themeToggle');
    
    if (isNight) {
        document.body.classList.remove('light-mode'); 
        // Opcjonalnie usuwamy starą klasę dark-mode dla pewności, choć nie jest już używana
        document.body.classList.remove('dark-mode'); 
    } else {
        document.body.classList.add('light-mode');
    }
    
    if(themeToggle) {
        // Słońce = Przełącz na jasny (czyli jesteśmy w ciemnym)
        // Księżyc = Przełącz na ciemny (czyli jesteśmy w jasnym)
        themeToggle.textContent = isNight ? '☀️' : '🌙';
    }
    
    localStorage.setItem('theme', isNight ? 'dark' : 'light');
}

export function setLanguage(lang) {
    if (!translations[lang]) lang = 'pl';
    state.currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-i18n-lang', lang);
    
    const t = translations[lang];

    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.dataset.i18nKey;
        if (t[key]) {
            if (el.tagName === 'IMG' && el.dataset.i18nAttr === 'alt') {
                el.alt = t[key];
            } else if (el.tagName === 'INPUT' && el.dataset.i18nAttr === 'placeholder') {
                el.placeholder = t[key];
            } else {
                if (el.children.length === 0) {
                    el.textContent = t[key];
                } else {
                    const textSpan = Array.from(el.children).find(child => child.tagName === 'SPAN' && !child.classList.contains('icon') && !child.classList.contains('btn-dot-loader'));
                    
                    if (textSpan) {
                        textSpan.textContent = t[key];
                    } else {
                        const textNode = Array.from(el.childNodes).find(node => node.nodeType === 3 && node.textContent.trim().length > 0);
                        if (textNode) {
                            textNode.textContent = t[key];
                        } else {
                             const btnText = el.querySelector('.btn-text');
                             if(btnText) btnText.textContent = t[key];
                        }
                    }
                }
            }
        }
    });
}

export function getNextRunTimeText() {
    const lang = translations[state.currentLang];
    if (!state.lastTestTimestamp) return lang.nextTestAfterFirst;
    
    try {
        const now = new Date();
        const lastRunDate = parseISOLocally(state.lastTestTimestamp); 
        if (lastRunDate === null || isNaN(lastRunDate.getTime())) return lang.nextTestError;

        const scheduleIntervalMs = state.currentScheduleHours * 60 * 60 * 1000;
        const timeElapsed = now.getTime() - lastRunDate.getTime();
        
        if (timeElapsed <= 60000) { 
            const nextRunDate = new Date(lastRunDate.getTime() + scheduleIntervalMs);
            return nextRunDate.toLocaleString(state.currentLang);
        }
        let timeToNextCycle = scheduleIntervalMs - (timeElapsed % scheduleIntervalMs);
        if (timeToNextCycle <= 10000) return lang.nextTestSoon;

        const nextRunDate = new Date(now.getTime() + timeToNextCycle);
        return nextRunDate.toLocaleString(state.currentLang);
    } catch (e) { return lang.nextTestError; }
}