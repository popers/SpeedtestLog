import { state } from './state.js';
import { translations } from './i18n.js';
import { fetchBackupSettings, saveBackupSettings, getGoogleAuthUrl, revokeGoogleAuth, triggerGoogleBackup } from './api.js';
import { showToast, formatCountdown } from './utils.js';

let backupCountdownInterval = null;

function getLocalizedStatus(status) {
    const lang = translations[state.currentLang];
    if (!status) return '-';
    
    if (status.includes('success')) return lang.statusSuccess || 'Sukces';
    if (status.includes('auth_error')) return lang.statusAuthError || 'Błąd autoryzacji';
    if (status.includes('error')) return lang.statusError || 'Błąd';
    
    return status;
}

export function updateBackupStatusUI() {
    const lastStatusVal = document.getElementById('lastStatusVal');
    if (lastStatusVal && state.backupRawStatus) {
        lastStatusVal.textContent = getLocalizedStatus(state.backupRawStatus);
    }
}

function calculateNextBackup(settings) {
    if (!settings.is_enabled || !settings.schedule_time) return null;

    const [h, m] = settings.schedule_time.split(':').map(Number);
    const daysInterval = settings.schedule_days || 1;
    const now = new Date();

    let nextDate;

    if (settings.last_run) {
        const lastRun = new Date(settings.last_run);
        nextDate = new Date(lastRun);
        nextDate.setDate(lastRun.getDate() + daysInterval);
        nextDate.setHours(h, m, 0, 0);

        if (nextDate <= now) {
             const candidateToday = new Date();
             candidateToday.setHours(h, m, 0, 0);
             if (candidateToday > now) {
                 nextDate = candidateToday;
             } else {
                 const candidateTomorrow = new Date();
                 candidateTomorrow.setDate(candidateTomorrow.getDate() + 1);
                 candidateTomorrow.setHours(h, m, 0, 0);
                 nextDate = candidateTomorrow;
             }
        }
    } else {
        const candidateToday = new Date();
        candidateToday.setHours(h, m, 0, 0);
        if (candidateToday > now) {
            nextDate = candidateToday;
        } else {
            const candidateTomorrow = new Date();
            candidateTomorrow.setDate(candidateTomorrow.getDate() + 1);
            candidateTomorrow.setHours(h, m, 0, 0);
            nextDate = candidateTomorrow;
        }
    }
    return nextDate;
}

function startBackupCountdown(nextDate) {
    const countdownEl = document.getElementById('backupCountdown');
    if (!countdownEl || !nextDate) return;

    if (backupCountdownInterval) clearInterval(backupCountdownInterval);

    const updateTimer = () => {
        const now = new Date();
        const diff = nextDate - now;
        const lang = translations[state.currentLang];
        const prefix = lang.countdownPrefix || 'za';

        if (diff <= 0) {
            countdownEl.textContent = "";
            if (backupCountdownInterval) clearInterval(backupCountdownInterval);
        } else {
            countdownEl.textContent = `${prefix} ${formatCountdown(diff)}`;
        }
    };

    updateTimer();
    backupCountdownInterval = setInterval(updateTimer, 1000);
}

export async function loadBackupPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    if(authStatus === 'success') {
        showToast('toastDriveSaved', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
        showToast('toastTestError', 'error'); 
        window.history.replaceState({}, document.title, window.location.pathname);
    }

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
        const gdRunBtn = document.getElementById('gdRunBtn');

        const lastRunVal = document.getElementById('lastRunVal');
        state.backupRawStatus = s.last_status;

        const nextBackupInfo = document.getElementById('nextBackupInfo');
        const nextBackupVal = document.getElementById('nextBackupVal');

        if(gdClientId) gdClientId.value = s.client_id || '';
        if(gdClientSecret) gdClientSecret.value = s.client_secret || '';
        if(gdFolderName) gdFolderName.value = s.folder_name || 'SpeedtestLog_Backup';
        if(gdRetention) gdRetention.value = s.retention_days || 30;
        if(gdScheduleDays) gdScheduleDays.value = s.schedule_days || 1;
        if(gdScheduleTime) gdScheduleTime.value = s.schedule_time || '03:00';

        if (s.has_token && s.is_enabled) {
            gdStatus.className = 'gdrive-status connected';
            gdStatus.innerHTML = `<span class="material-symbols-rounded">link</span> <span data-i18n-key="authStatusConnected">${translations[state.currentLang].authStatusConnected}</span>`;
            gdAuthBtn.style.display = 'none';
            gdRevokeBtn.style.display = 'flex';
            if(gdRunBtn) gdRunBtn.style.display = 'flex'; 
            
            gdClientId.disabled = true;
            gdClientSecret.disabled = true;

            const nextDate = calculateNextBackup(s);
            if (nextDate && nextBackupInfo) {
                nextBackupInfo.style.display = 'block';
                nextBackupVal.textContent = nextDate.toLocaleString(state.currentLang);
                startBackupCountdown(nextDate);
            } else if (nextBackupInfo) {
                nextBackupInfo.style.display = 'none';
            }

        } else {
            gdStatus.className = 'gdrive-status disconnected';
            gdStatus.innerHTML = `<span class="material-symbols-rounded">link_off</span> <span data-i18n-key="authStatusDisconnected">${translations[state.currentLang].authStatusDisconnected}</span>`;
            gdAuthBtn.style.display = 'flex';
            gdRevokeBtn.style.display = 'none';
            if(gdRunBtn) gdRunBtn.style.display = 'none'; 
            
            gdClientId.disabled = false;
            gdClientSecret.disabled = false;
            
            if (nextBackupInfo) nextBackupInfo.style.display = 'none';
        }

        if(lastRunVal) lastRunVal.textContent = s.last_run ? new Date(s.last_run).toLocaleString() : '-';
        updateBackupStatusUI();

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

        if(gdRunBtn) {
            const newRun = gdRunBtn.cloneNode(true);
            gdRunBtn.parentNode.replaceChild(newRun, gdRunBtn);
            newRun.addEventListener('click', async () => {
                newRun.disabled = true;
                newRun.classList.add('is-loading'); 
                showToast('toastBackupStarted', 'info');
                
                const initialLastRun = s.last_run; 
                
                try {
                    await triggerGoogleBackup();
                    
                    let attempts = 0;
                    const maxAttempts = 20; 
                    
                    const checkInterval = setInterval(async () => {
                        attempts++;
                        try {
                            const freshSettings = await fetchBackupSettings();
                            
                            const isNewRun = freshSettings.last_run && (!initialLastRun || new Date(freshSettings.last_run) > new Date(initialLastRun));
                            
                            if (isNewRun || attempts >= maxAttempts) {
                                clearInterval(checkInterval);
                                newRun.disabled = false;
                                newRun.classList.remove('is-loading');
                                
                                if (isNewRun) {
                                    if(lastRunVal) lastRunVal.textContent = new Date(freshSettings.last_run).toLocaleString();
                                    
                                    state.backupRawStatus = freshSettings.last_status;
                                    updateBackupStatusUI();
                                    
                                    const nextDate = calculateNextBackup(freshSettings);
                                    if (nextDate && nextBackupVal) {
                                        nextBackupVal.textContent = nextDate.toLocaleString(state.currentLang);
                                        startBackupCountdown(nextDate);
                                    }

                                    if (freshSettings.last_status === 'success') {
                                        showToast('toastBackupSuccess', 'success');
                                    } else {
                                        showToast('toastBackupFailed', 'error');
                                    }
                                } else {
                                    showToast('toastTestTimeout', 'error');
                                }
                            }
                        } catch(err) {
                            console.error("Polling error", err);
                        }
                    }, 3000); 
                    
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

export async function saveBackupConfig(wasConnected) {
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
            is_enabled: wasConnected 
        };

        await saveBackupSettings(payload);
        showToast('toastDriveSaved', 'success');
        loadBackupPage();
        return true;
    } catch(e) {
        showToast('toastSettingsError', 'error');
        return false;
    }
}

export function initBackupListeners() {
    const downBtn = document.getElementById('downloadBackupBtn');
    if(downBtn) {
        downBtn.addEventListener('click', async () => {
            showToast('backupGenerating', 'info');
            try {
                const res = await fetch('/api/backup');
                if(res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    
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
}