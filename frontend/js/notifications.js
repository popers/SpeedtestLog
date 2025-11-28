import { fetchNotificationSettings, getLatestResult } from './api.js';

// Zmienne stanu dla powiadomień
let lastSeenResultId = null;
let browserNotifEnabled = false;
let resultPollingInterval = null;

// Sprawdź ustawienia i zainicjuj stan
export async function initNotificationSystem() {
    try {
        const s = await fetchNotificationSettings();
        // Sprawdzamy, czy włączony jest tryb przeglądarkowy
        // Możliwe też, że użytkownik włączył powiadomienia, ale provider jest inny (np. pushover)
        // W takim przypadku backend wysyła powiadomienie, a przeglądarka nie powinna dublować,
        // chyba że chcemy powiadomienia lokalne niezależnie od backendowych.
        // Obecna logika: włącz browserNotif tylko jak provider === 'browser'.
        if (s.enabled && s.provider === 'browser') {
            browserNotifEnabled = true;
            // Pobierz ostatni wynik, aby nie powiadamiać o starych przy odświeżeniu
            const latest = await getLatestResult();
            if(latest) lastSeenResultId = latest.id;
            
            startResultPolling();
        } else {
            browserNotifEnabled = false;
            stopResultPolling();
        }
    } catch(e) {
        console.error("Błąd inicjalizacji powiadomień:", e);
    }
}

export function showBrowserNotification(title, body, tag) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        new Notification(title, { body, tag, icon: 'logo.png' });
    }
}

function startResultPolling() {
    if (resultPollingInterval) clearInterval(resultPollingInterval);
    
    // Polling co 10 sekund w celu wykrycia nowego wyniku
    resultPollingInterval = setInterval(async () => {
        if (!browserNotifEnabled) return;
        
        try {
            const latest = await getLatestResult();
            if (latest && lastSeenResultId && latest.id !== lastSeenResultId) {
                lastSeenResultId = latest.id;
                // ZMIANA: Dodano Ping i Jitter do treści powiadomienia przeglądarkowego
                showBrowserNotification(
                    "SpeedtestLog: Nowy wynik", 
                    `Download: ${latest.download} Mbps, Upload: ${latest.upload} Mbps, Ping: ${latest.ping} ms, Jitter: ${latest.jitter} ms`,
                    "speedtest-result"
                );
                
                // Jeśli jesteśmy na dashboardzie, wyemituj zdarzenie odświeżenia
                window.dispatchEvent(new CustomEvent('speedtest-data-updated'));
            } else if (latest && !lastSeenResultId) {
                lastSeenResultId = latest.id;
            }
        } catch(e) {}
    }, 10000);
}

function stopResultPolling() {
    if (resultPollingInterval) clearInterval(resultPollingInterval);
}

export function isBrowserNotifEnabled() {
    return browserNotifEnabled;
}