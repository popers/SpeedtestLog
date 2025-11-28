import { state } from './state.js';
import { fetchSettings, updateSettings, fetchNotificationSettings, saveNotificationSettings, testNotification } from './api.js';
import { showToast, hexToRgba } from './utils.js';
import { initNotificationSystem } from './notifications.js';
import { stopWatchdogPolling, startWatchdogPolling } from './watchdog.js';

async function fetchOIDCSettings() {
    try {
        const response = await fetch('/api/settings/oidc');
        if (!response.ok) throw new Error("Failed to fetch OIDC");
        return await response.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

async function saveOIDCSettings(payload) {
    const response = await fetch('/api/settings/oidc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Failed to save OIDC");
    return await response.json();
}

export async function loadSettingsToForm() {
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

        const startupInput = document.getElementById('startupTestInput');
        if(startupInput) {
            startupInput.checked = (s.startup_test_enabled !== false); 
            startupInput.addEventListener('change', () => {
                if (startupInput.checked) {
                    showToast('toastStartupTestOn', 'success');
                } else {
                    showToast('toastStartupTestOff', 'info');
                }
            });
        }

        const cDl = document.getElementById('colorDownloadInput');
        const cUl = document.getElementById('colorUploadInput');
        const cPi = document.getElementById('colorPingInput');
        const cJi = document.getElementById('colorJitterInput');
        const cWd = document.getElementById('colorPingWatchdogInput');

        const style = getComputedStyle(document.body);
        if(cDl) cDl.value = s.chart_color_download || style.getPropertyValue('--color-download').trim() || '#4fc3f7';
        if(cUl) cUl.value = s.chart_color_upload || style.getPropertyValue('--color-upload').trim() || '#e57373';
        if(cPi) cPi.value = s.chart_color_ping || style.getPropertyValue('--color-ping').trim() || '#ffd54f';
        if(cJi) cJi.value = s.chart_color_jitter || style.getPropertyValue('--color-jitter').trim() || '#81c784';
        if(cWd) cWd.value = s.chart_color_ping_watchdog || style.getPropertyValue('--color-ping-watchdog').trim() || '#17a2b8';
        
        const cLatDlLow = document.getElementById('colorLatDlLowInput');
        const cLatDlHigh = document.getElementById('colorLatDlHighInput');
        const cLatUlLow = document.getElementById('colorLatUlLowInput');
        const cLatUlHigh = document.getElementById('colorLatUlHighInput');

        if(cLatDlLow) cLatDlLow.value = s.chart_color_lat_dl_low || style.getPropertyValue('--color-lat-dl-low').trim() || '#29b6f6';
        if(cLatDlHigh) cLatDlHigh.value = s.chart_color_lat_dl_high || style.getPropertyValue('--color-lat-dl-high').trim() || '#01579b';
        if(cLatUlLow) cLatUlLow.value = s.chart_color_lat_ul_low || style.getPropertyValue('--color-lat-ul-low').trim() || '#ef5350';
        if(cLatUlHigh) cLatUlHigh.value = s.chart_color_lat_ul_high || style.getPropertyValue('--color-lat-ul-high').trim() || '#b71c1c';

        const oidc = await fetchOIDCSettings();
        if (oidc) {
            const oidcEnabled = document.getElementById('oidcEnabled');
            const oidcClientId = document.getElementById('oidcClientId');
            const oidcClientSecret = document.getElementById('oidcClientSecret');
            const oidcDiscovery = document.getElementById('oidcDiscoveryUrl');
            const oidcRedirect = document.getElementById('oidcRedirectUri');

            if(oidcEnabled) oidcEnabled.checked = oidc.enabled;
            if(oidcClientId) oidcClientId.value = oidc.client_id || '';
            if(oidcClientSecret) oidcClientSecret.value = oidc.client_secret || ''; 
            if(oidcDiscovery) oidcDiscovery.value = oidc.discovery_url || '';
            
            if(oidcRedirect) oidcRedirect.textContent = window.location.origin + '/api/auth/oidc/callback';
        }

    } catch (e) {
        console.error("Error loading settings:", e);
    }
}

export async function loadNotificationSettingsToForm() {
    try {
        const ns = await fetchNotificationSettings();
        const enableCheck = document.getElementById('notifEnabled');
        const providerSelect = document.getElementById('notifProvider');
        
        const urlInput = document.getElementById('notifWebhookUrl');
        const topicInput = document.getElementById('notifNtfyTopic');
        const serverInput = document.getElementById('notifNtfyServer');
        
        const pushoverUser = document.getElementById('notifPushoverUser');
        const pushoverToken = document.getElementById('notifPushoverToken');
        
        const registerBtn = document.getElementById('notifRegisterBtn');

        if(enableCheck) enableCheck.checked = ns.enabled;
        if(providerSelect) providerSelect.value = ns.provider || 'browser';
        
        if(urlInput) urlInput.value = ns.webhook_url || '';
        if(topicInput) topicInput.value = ns.ntfy_topic || '';
        if(serverInput) serverInput.value = ns.ntfy_server || 'https://ntfy.sh';
        if(pushoverUser) pushoverUser.value = ns.pushover_user_key || '';
        if(pushoverToken) pushoverToken.value = ns.pushover_api_token || '';

        const updateVisibility = () => {
            const val = providerSelect.value;
            document.getElementById('fieldWebhook').style.display = val === 'webhook' ? 'block' : 'none';
            document.getElementById('fieldNtfy').style.display = val === 'ntfy' ? 'block' : 'none';
            document.getElementById('fieldPushover').style.display = val === 'pushover' ? 'block' : 'none';
            
            if (val === 'browser') registerBtn.style.display = 'flex';
            else registerBtn.style.display = 'none';
        };
        providerSelect.addEventListener('change', updateVisibility);
        updateVisibility();
    } catch(e) { console.error(e); }
}

export async function saveSettingsFromPage() {
    try {
        const target = document.getElementById('pingTargetInput').value;
        const interval = parseInt(document.getElementById('pingIntervalInput').value);
        const dl = parseInt(document.getElementById('declaredDownloadInput').value) || 0;
        const ul = parseInt(document.getElementById('declaredUploadInput').value) || 0;
        const startupInput = document.getElementById('startupTestInput');
        const startupEnabled = startupInput ? startupInput.checked : true;

        const cDl = document.getElementById('colorDownloadInput').value;
        const cUl = document.getElementById('colorUploadInput').value;
        const cPi = document.getElementById('colorPingInput').value;
        const cJi = document.getElementById('colorJitterInput').value;
        const cWd = document.getElementById('colorPingWatchdogInput').value;
        const cLatDlLow = document.getElementById('colorLatDlLowInput').value;
        const cLatDlHigh = document.getElementById('colorLatDlHighInput').value;
        const cLatUlLow = document.getElementById('colorLatUlLowInput').value;
        const cLatUlHigh = document.getElementById('colorLatUlHighInput').value;

        const payload = {
            ping_target: target,
            ping_interval: interval,
            declared_download: dl,
            declared_upload: ul,
            startup_test_enabled: startupEnabled,
            chart_color_download: cDl,
            chart_color_upload: cUl,
            chart_color_ping: cPi,
            chart_color_jitter: cJi,
            chart_color_lat_dl_low: cLatDlLow,
            chart_color_lat_dl_high: cLatDlHigh,
            chart_color_lat_ul_low: cLatUlLow,
            chart_color_lat_ul_high: cLatUlHigh,
            chart_color_ping_watchdog: cWd,
        };

        await updateSettings(payload);
        
        const root = document.body;
        root.style.setProperty('--color-download', cDl);
        root.style.setProperty('--color-download-bg', hexToRgba(cDl, 0.15));
        root.style.setProperty('--color-upload', cUl);
        root.style.setProperty('--color-upload-bg', hexToRgba(cUl, 0.15));
        root.style.setProperty('--color-ping', cPi);
        root.style.setProperty('--color-ping-bg', hexToRgba(cPi, 0.15));
        root.style.setProperty('--color-jitter', cJi);
        root.style.setProperty('--color-jitter-bg', hexToRgba(cJi, 0.15));
        root.style.setProperty('--color-lat-dl-low', cLatDlLow);
        root.style.setProperty('--color-lat-dl-high', cLatDlHigh);
        root.style.setProperty('--color-lat-ul-low', cLatUlLow);
        root.style.setProperty('--color-lat-ul-high', cLatUlHigh);
        root.style.setProperty('--color-ping-watchdog', cWd);
        root.style.setProperty('--color-ping-watchdog-bg', hexToRgba(cWd, 0.15));

        const notifEnabled = document.getElementById('notifEnabled').checked;
        const notifProvider = document.getElementById('notifProvider').value;
        const webhookUrl = document.getElementById('notifWebhookUrl').value;
        const ntfyTopic = document.getElementById('notifNtfyTopic').value;
        const ntfyServer = document.getElementById('notifNtfyServer').value;
        const pushoverUser = document.getElementById('notifPushoverUser').value;
        const pushoverToken = document.getElementById('notifPushoverToken').value;

        const notifPayload = {
            enabled: notifEnabled,
            provider: notifProvider,
            webhook_url: webhookUrl,
            ntfy_topic: ntfyTopic,
            ntfy_server: ntfyServer,
            pushover_user_key: pushoverUser,
            pushover_api_token: pushoverToken
        };
        await saveNotificationSettings(notifPayload);
        
        const oidcEnabled = document.getElementById('oidcEnabled').checked;
        const oidcClientId = document.getElementById('oidcClientId').value;
        const oidcClientSecret = document.getElementById('oidcClientSecret').value;
        const oidcDiscovery = document.getElementById('oidcDiscoveryUrl').value;

        const oidcPayload = {
            enabled: oidcEnabled,
            client_id: oidcClientId,
            client_secret: oidcClientSecret.length > 0 ? oidcClientSecret : undefined,
            discovery_url: oidcDiscovery
        };
        await saveOIDCSettings(oidcPayload);

        initNotificationSystem();
        showToast('toastSettingsSaved', 'success');
        
        stopWatchdogPolling();
        startWatchdogPolling();
        
    } catch (e) {
        console.error(e);
        showToast('toastSettingsError', 'error');
    }
}

export function initSettingsListeners() {
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettingsFromPage);

    const toggleSecretBtn = document.getElementById('toggleSecretBtn');
    const secretInput = document.getElementById('oidcClientSecret');
    if (toggleSecretBtn && secretInput) {
        toggleSecretBtn.addEventListener('click', () => {
            if (secretInput.type === 'password') {
                secretInput.type = 'text';
                toggleSecretBtn.textContent = 'visibility_off'; 
            } else {
                secretInput.type = 'password';
                toggleSecretBtn.textContent = 'visibility'; 
            }
        });
    }

    const togglePushBtn = document.getElementById('togglePushoverTokenBtn');
    const pushInput = document.getElementById('notifPushoverToken');
    if (togglePushBtn && pushInput) {
        togglePushBtn.addEventListener('click', () => {
            if (pushInput.type === 'password') {
                pushInput.type = 'text';
                togglePushBtn.textContent = 'visibility_off'; 
            } else {
                pushInput.type = 'password';
                togglePushBtn.textContent = 'visibility'; 
            }
        });
    }

    const testNotifBtn = document.getElementById('notifTestBtn');
    if(testNotifBtn) {
        testNotifBtn.addEventListener('click', async () => {
            const provider = document.getElementById('notifProvider').value;
            const url = document.getElementById('notifWebhookUrl').value;
            const topic = document.getElementById('notifNtfyTopic').value;
            const server = document.getElementById('notifNtfyServer').value;
            const pushUser = document.getElementById('notifPushoverUser').value;
            const pushToken = document.getElementById('notifPushoverToken').value;
            
            try {
                await testNotification({ 
                    provider, 
                    webhook_url: url, 
                    ntfy_topic: topic, 
                    ntfy_server: server, 
                    pushover_user_key: pushUser,
                    pushover_api_token: pushToken,
                    language: state.currentLang 
                });
                showToast('toastNotifSent', 'success');
            } catch (e) { showToast('toastNotifError', 'error'); }
        });
    }

    const regBrowserBtn = document.getElementById('notifRegisterBtn');
    if(regBrowserBtn) {
        regBrowserBtn.addEventListener('click', () => {
            if (!("Notification" in window)) {
                alert("Ta przeglądarka nie obsługuje powiadomień.");
                return;
            }
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    showToast('toastBrowserReg', 'success');
                    new Notification("SpeedtestLog", { body: "Powiadomienia aktywne!", icon: 'logo.png' });
                } else {
                    showToast('toastBrowserDenied', 'error');
                }
            });
        });
    }
}