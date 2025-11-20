// --- Tłumaczenia ---
const translations = {
    'pl': {
        'title': 'SpeedtestLog Logo',
        'navDashboard': 'Panel Główny',
        'navCharts': 'Wykresy',
        'navHistory': 'Historia',
        'navSettings': 'Ustawienia',
        'navBackup': 'Kopia Zapasowa',
        'manualTest': 'Test ręczny',
        'runTest': 'Uruchom Test',
        'selectServer': 'Serwer:',
        'autoSelect': 'Wybór automatyczny',
        'runEvery': 'Interwał:',
        'hour1': '1 godzina',
        'hour3': '3 godziny',
        'hour6': '6 godzin',
        'hour12': '12 godzin',
        'hour24': '24 godziny',
        'nextTest': 'Następny test:',
        'calculating': 'Obliczanie...',
        'latestDownload': 'Ostatnie Pobieranie',
        'latestUpload': 'Ostatnie Wysyłanie',
        'latestPing': 'Ostatni Ping',
        'latestJitter': 'Ostatni Jitter',
        'historyCharts': 'Wykresy Historii',
        'filter24h': 'Ostatnie 24h',
        'filter7d': 'Ostatnie 7 dni',
        'filter30d': 'Ostatnie 30 dni',
        'filterAll': 'Wszystko',
        'downloadChartTitle': 'Pobieranie (Mbps)',
        'uploadChartTitle': 'Wysyłanie (Mbps)',
        'pingChartTitle': 'Ping (ms)',
        'jitterChartTitle': 'Jitter (ms)',
        'historyTable': 'Historia Pomiarów',
        'tableTime': 'Data i Godzina',
        'tablePing': 'Ping',
        'tableJitter': 'Jitter',
        'tableDownload': 'Pobieranie',
        'tableUpload': 'Wysyłanie',
        'tableServer': 'Serwer (Lokalizacja)',
        'tableResultLink': 'Link', 
        'tableShow': 'Pokaż:', 
        'detailsTitle': 'Szczegóły Pomiaru',
        'modalClose': 'Zamknij',
        'detailsTime': 'Czas Pomiaru: ',
        'detailsServer': 'Serwer: ',
        'detailsDownload': 'Pobieranie: ',
        'detailsUpload': 'Wysyłanie: ',
        'detailsPing': 'Ping: ',
        'detailsJitter': 'Jitter: ',
        'detailsURL': 'Link do wyniku: ',
        'detailsClient': 'Klient IP: ',
        'detailsISP': 'Dostawca (ISP): ',
        'detailsLatencyLow': 'Min. opóźnienie (Low): ',
        'detailsLatencyHigh': 'Maks. opóźnienie (High): ',
        'detailsSectionPerformance': 'Wydajność Transferu',
        'detailsSectionLatency': 'Parametry Opóźnień',
        'detailsSectionServerClient': 'Lokalizacja i ISP',
        'detailsNoData': 'Brak szczegółowych danych.',
        'deleteSelected': 'Usuń zaznaczone',
        'confirmDeleteTitle': 'Potwierdź usunięcie',
        'confirmDeleteText': 'Czy na pewno chcesz usunąć zaznaczone wpisy? Tej operacji nie można cofnąć.',
        'modalCancel': 'Anuluj',
        'modalConfirm': 'Usuń',
        'toastDeleteSuccess': 'Pomyślnie usunięto', 
        'toastDeleteError': 'Błąd podczas usuwania wpisów.',
        'toastTestInProgress': 'Test w toku...',
        'toastTestError': 'Wystąpił błąd podczas uruchamiania testu.',
        'toastTestTimeout': 'Błąd: Test przekroczył limit czasu.',
        'toastTestComplete': 'Test zakończony!',
        'toastSettingsSaved': 'Zapisano ustawienia!',
        'toastSettingsError': 'Błąd zapisu!',
        'toastSettingsInvalid': 'Błąd: Godziny muszą być > 0',
        'toastLangChanged': 'Zmieniono język!',
        'toastThemeLight': 'Tryb Jasny',
        'toastThemeDark': 'Tryb Ciemny',
        'toastServerChanged': 'Serwer zmieniony na:',
        'toastScheduleChanged': 'Test uruchomi się co',
        'toastNextRun': 'Następny test:',
        'statsNoData': 'Brak danych',
        'statsFirstMeasurement': 'Pierwszy pomiar',
        'statsFaster': 'szybciej',
        'statsSlower': 'wolniej',
        'statsNoChange': 'Bez zmian',
        'nextTestAfterFirst': 'Po pierwszym teście',
        'nextTestSoon': 'Wkrótce (max 1 min)',
        'nextTestError': 'Błąd obliczeń',
        'chartLabelDownload': 'Pobieranie',
        'chartLabelUpload': 'Wysyłanie',
        'chartLabelPing': 'Ping',
        'chartLabelJitter': 'Jitter',
        'chartUnitMbps': 'Mbps',
        'chartUnitMs': 'ms',
        'tooltipServer': 'Serwer',
        'toastFilterChanged': 'Zmieniono filtr na',
        'toastUnitChanged': 'Zmieniono jednostkę na',
        'toastLimitChanged': 'Pokaż:',
        'logout': 'Wyloguj',
        'exportCSV': 'Eksport CSV',
        'exportPNG': 'Zapisz PNG', 
        'generatingPNG': 'Generowanie PNG...',
        // BACKUP TRANSLATIONS
        'backupTitle': 'Zarządzanie Kopią Zapasową',
        'backupDesc': 'Możesz pobrać pełną kopię bazy danych lub przywrócić dane z wcześniej zapisanego pliku SQL.',
        'backupDownloadTitle': 'Pobierz Kopię (Backup)',
        'backupDownloadText': 'Pobierz plik SQL zawierający całą historię pomiarów oraz ustawienia.',
        'backupDownloadBtn': 'Pobierz .SQL',
        'backupRestoreTitle': 'Przywróć Kopię (Restore)',
        'backupRestoreText': 'UWAGA: Przywrócenie kopii nadpisze wszystkie obecne dane!',
        'backupRestoreBtn': 'Przywróć z pliku',
        'restoreSuccess': 'Baza danych została pomyślnie przywrócona!',
        'restoreError': 'Błąd podczas przywracania bazy.',
        'restoring': 'Przywracanie...',
        // NOWE TŁUMACZENIA POWIADOMIEŃ BACKUPU
        'backupGenerating': 'Generowanie kopii zapasowej...',
        'backupCreatedSuccess': 'Kopia zapasowa została utworzona i pobrana.',
        'backupCreatedError': 'Wystąpił błąd podczas tworzenia kopii.'
    },
    'en': {
        'title': 'SpeedtestLog Logo',
        'navDashboard': 'Dashboard',
        'navCharts': 'Charts',
        'navHistory': 'History',
        'navSettings': 'Settings',
        'navBackup': 'Backup & Restore',
        'manualTest': 'Manual Test',
        'runTest': 'Run Test',
        'selectServer': 'Server:',
        'autoSelect': 'Automatic Selection',
        'runEvery': 'Interval:',
        'hour1': '1 hour',
        'hour3': '3 hours',
        'hour6': '6 hours',
        'hour12': '12 hours',
        'hour24': '24 hours',
        'nextTest': 'Next Test:',
        'calculating': 'Calculating...',
        'latestDownload': 'Latest Download',
        'latestUpload': 'Latest Upload',
        'latestPing': 'Latest Ping',
        'latestJitter': 'Latest Jitter',
        'historyCharts': 'History Charts',
        'filter24h': 'Last 24h',
        'filter7d': 'Last 7 days',
        'filter30d': 'Last 30 days',
        'filterAll': 'All',
        'downloadChartTitle': 'Download (Mbps)',
        'uploadChartTitle': 'Upload (Mbps)',
        'pingChartTitle': 'Ping (ms)',
        'jitterChartTitle': 'Jitter (ms)',
        'historyTable': 'Measurement History',
        'tableTime': 'Date & Time',
        'tablePing': 'Ping',
        'tableJitter': 'Jitter',
        'tableDownload': 'Download',
        'tableUpload': 'Upload',
        'tableServer': 'Server (Location)',
        'tableResultLink': 'Link', 
        'tableShow': 'Show:', 
        'detailsTitle': 'Measurement Details',
        'modalClose': 'Close',
        'detailsTime': 'Measurement Time: ',
        'detailsServer': 'Server: ',
        'detailsDownload': 'Download: ',
        'detailsUpload': 'Upload: ',
        'detailsPing': 'Ping: ',
        'detailsJitter': 'Jitter: ',
        'detailsURL': 'Result Link: ',
        'detailsClient': 'Client IP: ',
        'detailsISP': 'ISP: ',
        'detailsLatencyLow': 'Min Latency (Low): ',
        'detailsLatencyHigh': 'Max Latency (High): ',
        'detailsSectionPerformance': 'Transfer Performance',
        'detailsSectionLatency': 'Latency Parameters',
        'detailsSectionServerClient': 'Location & ISP',
        'detailsNoData': 'No detailed data available.',
        'deleteSelected': 'Delete Selected',
        'confirmDeleteTitle': 'Confirm Deletion',
        'confirmDeleteText': 'Are you sure you want to delete the selected entries? This action cannot be undone.',
        'modalCancel': 'Cancel',
        'modalConfirm': 'Delete',
        'toastDeleteSuccess': 'Successfully deleted',
        'toastDeleteError': 'Error while deleting entries.',
        'toastTestInProgress': 'Test in progress...',
        'toastTestError': 'An error occurred while starting the test.',
        'toastTestTimeout': 'Error: Test timed out.',
        'toastTestComplete': 'Test complete!', 
        'toastSettingsSaved': 'Settings saved!',
        'toastSettingsError': 'Error saving!',
        'toastSettingsInvalid': 'Error: Hours must be > 0',
        'toastLangChanged': 'Language changed!',
        'toastThemeLight': 'Light Mode',
        'toastThemeDark': 'Dark Mode',
        'toastServerChanged': 'Server changed to:',
        'toastScheduleChanged': 'Test will run every',
        'toastNextRun': 'Next test:',
        'statsNoData': 'No data',
        'statsFirstMeasurement': 'First measurement',
        'statsFaster': 'faster',
        'statsSlower': 'slower',
        'statsNoChange': 'No change',
        'nextTestAfterFirst': 'After first test',
        'nextTestSoon': 'Soon (max 1 min)',
        'nextTestError': 'Calc. error',
        'chartLabelDownload': 'Download',
        'chartLabelUpload': 'Upload',
        'chartLabelPing': 'Ping',
        'chartLabelJitter': 'Jitter',
        'chartUnitMbps': 'Mbps',
        'chartUnitMs': 'ms',
        'tooltipServer': 'Server',
        'toastFilterChanged': 'Filter changed to',
        'toastUnitChanged': 'Unit changed to',
        'toastLimitChanged': 'Show:', 
        'logout': 'Logout',
        'exportCSV': 'Export CSV',
        'exportPNG': 'Save as PNG', 
        'generatingPNG': 'Generating PNG...', 
        // BACKUP
        'backupTitle': 'Backup Management',
        'backupDesc': 'Download a full database backup or restore data from a saved SQL file.',
        'backupDownloadTitle': 'Download Backup',
        'backupDownloadText': 'Download a SQL file containing the entire measurement history and settings.',
        'backupDownloadBtn': 'Download .SQL',
        'backupRestoreTitle': 'Restore Backup',
        'backupRestoreText': 'WARNING: Restoring a backup will overwrite all current data!',
        'backupRestoreBtn': 'Restore from file',
        'restoreSuccess': 'Database restored successfully!',
        'restoreError': 'Error restoring database.',
        'restoring': 'Restoring...',
        // NEW NOTIFICATIONS
        'backupGenerating': 'Generating backup...',
        'backupCreatedSuccess': 'Backup created and downloaded successfully.',
        'backupCreatedError': 'Error creating backup.'
    }
};

// --- Referencje do elementów DOM ---
const triggerTestBtn = document.getElementById('triggerTestBtn');
const serverSelect = document.getElementById('serverSelect');
const scheduleSelect = document.getElementById('scheduleSelect'); 
const toastNotification = document.getElementById('toastNotification');
const nextRunTime = document.getElementById('nextRunTime');
const themeToggle = document.getElementById('themeToggle');
const resultsTableBody = document.querySelector('#resultsTable tbody');
const filterSelect = document.getElementById('filterSelect');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const confirmModal = document.getElementById('confirmModal');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const confirmModalText = document.getElementById('confirmModalText');
const unitSelect = document.getElementById('unitSelect');
const detailsModal = document.getElementById('detailsModal'); 
const detailsContent = document.getElementById('detailsContent');
const limitSelect = document.getElementById('limitSelect'); 
const logoutBtn = document.getElementById('logoutBtn');
const exportBtn = document.getElementById('exportBtn');
const pngBtn = document.getElementById('pngBtn'); 
// BACKUP ELEMENTS
const downloadBackupBtn = document.getElementById('downloadBackupBtn');
const restoreForm = document.getElementById('restoreForm');
const restoreStatus = document.getElementById('restoreStatus');
const restoreBackupBtn = document.getElementById('restoreBackupBtn'); // Poprawka: dodano referencję

const latestDownloadValue = document.getElementById('latestDownloadValue');
const latestDownloadCompare = document.getElementById('latestDownloadCompare');
const latestDownloadUnit = document.getElementById('latestDownloadUnit');
const latestUploadValue = document.getElementById('latestUploadValue');
const latestUploadCompare = document.getElementById('latestUploadCompare');
const latestUploadUnit = document.getElementById('latestUploadUnit');
const latestPingValue = document.getElementById('latestPingValue');
const latestPingCompare = document.getElementById('latestPingCompare');
const latestPingUnit = document.getElementById('latestPingUnit');
const latestJitterValue = document.getElementById('latestJitterValue');
const latestJitterCompare = document.getElementById('latestJitterCompare');
const latestJitterUnit = document.getElementById('latestJitterUnit');

const downloadCtx = document.getElementById('downloadChart') ? document.getElementById('downloadChart').getContext('2d') : null;
const uploadCtx = document.getElementById('uploadChart') ? document.getElementById('uploadChart').getContext('2d') : null;
const pingCtx = document.getElementById('pingChart') ? document.getElementById('pingChart').getContext('2d') : null;
const jitterCtx = document.getElementById('jitterChart') ? document.getElementById('jitterChart').getContext('2d') : null;

let downloadChart, uploadChart, pingChart, jitterChart;
let allResults = [];
let currentFilter = '24h'; 
let pollingInterval = null;
let toastTimer = null;
let currentScheduleHours = 1;
let lastTestTimestamp = null;
let currentLang = 'pl';
let currentUnit = 'Mbps'; 
let previousFilter = '24h';
let previousUnit = 'Mbps';
let currentSort = { column: null, direction: 'none' }; 
let currentFilteredResults = [];
let currentSelectedServerId = 'null';
let currentLimit = '25'; 


// --- FUNKCJE POMOCNICZE ---
function convertValue(value, targetUnit) {
    if (targetUnit === 'MBps') {
        return value / 8; 
    }
    return value; 
}

function getUnitLabel(unit) {
    if (unit === 'MBps') return 'MB/s';
    return 'Mbps';
}

function parseISOLocally(isoString) {
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

// --- MODAL SZCZEGÓŁÓW ---
function showDetailsModal(resultId) {
    const lang = translations[currentLang];
    const result = allResults.find(r => r.id === resultId);
    
    if (!result) {
        detailsContent.innerHTML = `<p style="color: var(--danger-text);">${lang.detailsNoData}</p>`;
        document.querySelector('#detailsModal h3').textContent = lang.detailsTitle;
        detailsModal.style.display = 'flex';
        setTimeout(() => detailsModal.classList.add('show'), 10);
        return;
    }

    const timestamp = parseISOLocally(result.timestamp).toLocaleString(currentLang);
    const downloadValue = convertValue(result.download, currentUnit).toFixed(2);
    const uploadValue = convertValue(result.upload, currentUnit).toFixed(2);
    const unitLabel = getUnitLabel(currentUnit);
    
    const content = `
        <p style="text-align: center;"><strong>${lang.detailsTime}</strong> ${timestamp}</p>
        <hr style="border-color: var(--border-color); margin: 10px 0;">
        
        <p style="font-weight: 600; color: var(--primary-color); margin-top: 20px;">${lang.detailsSectionPerformance}</p>
        <div style="padding-left: 15px; margin-bottom: 15px;">
            <p style="color: var(--color-download); margin: 5px 0;"><strong>${lang.detailsDownload}</strong> ${downloadValue} ${unitLabel}</p>
            <p style="color: var(--color-upload); margin: 5px 0;"><strong>${lang.detailsUpload}</strong> ${uploadValue} ${unitLabel}</p>
        </div>
        
        <p style="font-weight: 600; color: var(--primary-color); margin-top: 20px;">${lang.detailsSectionLatency}</p>
        <div style="padding-left: 15px; margin-bottom: 15px;">
            <p style="color: var(--color-ping); margin: 5px 0;"><strong>${lang.detailsPing}</strong> ${result.ping} ms (Jitter: ${result.jitter} ms)</p>
            ${result.ping_low ? `<p style="margin: 5px 0;"><strong>${lang.detailsLatencyLow} (Ping):</strong> ${result.ping_low} ms</p>` : ''}
            ${result.download_latency_low ? `<p style="margin: 5px 0;"><strong>${lang.detailsLatencyLow} (DL):</strong> ${result.download_latency_low} ms</p>` : ''}
            ${result.download_latency_high ? `<p style="margin: 5px 0;"><strong>${lang.detailsLatencyHigh} (DL):</strong> ${result.download_latency_high} ms</p>` : ''}
            ${result.upload_latency_low ? `<p style="margin: 5px 0;"><strong>${lang.detailsLatencyLow} (UL):</strong> ${result.upload_latency_low} ms</p>` : ''}
            ${result.upload_latency_high ? `<p style="margin: 5px 0;"><strong>${lang.detailsLatencyHigh} (UL):</strong> ${result.upload_latency_high} ms</p>` : ''}
        </div>

        <p style="font-weight: 600; color: var(--primary-color); margin-top: 20px;">${lang.detailsSectionServerClient}</p>
        <div style="padding-left: 15px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>${lang.detailsServer}</strong> (${result.server_id}) ${result.server_name} (${result.server_location})</p>
            ${result.client_ip ? `<p style="margin: 5px 0;"><strong>${lang.detailsClient}</strong> ${result.client_ip}</p>` : ''}
            ${result.isp ? `<p style="margin: 5px 0;"><strong>${lang.detailsISP}</strong> ${result.isp}</p>` : ''}
        </div>

        ${result.result_url 
            ? `<p style="margin: 10px 0;"><strong>${lang.detailsURL}</strong> <a href="${result.result_url}" target="_blank" style="color: var(--primary-color); word-break: break-all; text-decoration: underline;">Otwórz pełny wynik</a></p>`
            : ''}
    `;

    document.querySelector('#detailsModal h3').textContent = lang.detailsTitle;
    detailsContent.innerHTML = content;
    detailsModal.style.display = 'flex';
    setTimeout(() => detailsModal.classList.add('show'), 10);
}

function closeDetailsModal() {
    detailsModal.classList.remove('show');
    setTimeout(() => detailsModal.style.display = 'none', 200);
}

if (document.getElementById('modalCloseBtn')) {
    document.getElementById('modalCloseBtn').addEventListener('click', closeDetailsModal);
}

// --- MOTYW CIEMNY/JASNY ---
function setNightMode(isNight) {
    document.body.classList.toggle('dark-mode', isNight);
    themeToggle.textContent = isNight ? '☀️' : '🌙';
    localStorage.setItem('theme', isNight ? 'dark' : 'light');
    
    if (isNight) {
        showToast('toastThemeDark', 'info');
    } else {
        showToast('toastThemeLight', 'info');
    }
    
    if (typeof renderData === "function" && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
         renderData();
    }
}
themeToggle.addEventListener('click', () => {
    setNightMode(!document.body.classList.contains('dark-mode'));
});

// --- JĘZYK ---
function setLanguage(lang) {
    if (!translations[lang]) lang = 'pl';
    currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-i18n-lang', lang);
    
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.dataset.i18nKey;
        if (translations[lang][key]) {
            if (el.tagName === 'IMG' && el.dataset.i18nAttr === 'alt') {
                el.alt = translations[lang][key];
            } else {
                if (el.parentElement.classList.contains('nav-link')) {
                   const textNode = Array.from(el.childNodes).find(node => node.nodeType === 3);
                   if(textNode) textNode.textContent = translations[lang][key];
                   else el.textContent = translations[lang][key];
                } else if (el.parentElement.tagName === 'BUTTON') {
                     const textNode = Array.from(el.parentElement.childNodes).find(n => n.nodeType === 3 || n.tagName === 'SPAN');
                     if(textNode && textNode.tagName === 'SPAN') textNode.textContent = translations[lang][key];
                     else el.textContent = translations[lang][key];
                } else {
                    const textEl = el.querySelector('span') || el;
                    textEl.textContent = translations[lang][key];
                }
            }
        }
    });
    
    if (document.getElementById('nextRunTime')) updateNextRunTimeDisplay();
    if (allResults.length > 0 && document.getElementById('latestDownloadValue')) updateStatsCards(allResults);
    if (typeof renderData === "function" && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) renderData();
}


// --- FETCH DATA ---
async function fetchResults() {
    try {
        const response = await fetch('/api/results');
        if (response.status === 401) window.location.reload(); 
        allResults = await response.json(); 
        if (allResults.length > 0) {
            lastTestTimestamp = allResults[0].timestamp;
        }
        updateNextRunTimeDisplay();
        updateStatsCards(allResults);
        renderData();
    } catch (error) { console.error('Błąd pobierania wyników:', error); }
}

async function fetchServers() {
    try {
        const response = await fetch('/api/servers');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        data.servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.id;
            option.textContent = `(${server.id}) ${server.name} (${server.location})`;
            serverSelect.appendChild(option);
        });
    } catch (error) { console.error('Błąd pobierania listy serwerów:', error); }
}

async function fetchSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        serverSelect.value = settings.selected_server_id || 'null';
        scheduleSelect.value = settings.schedule_hours || 1;
        currentSelectedServerId = serverSelect.value;
        currentScheduleHours = settings.schedule_hours || 1;
        lastTestTimestamp = settings.latest_test_timestamp;
        
        currentUnit = localStorage.getItem('displayUnit') || 'Mbps';
        if (unitSelect) unitSelect.value = currentUnit;
        
        updateNextRunTimeDisplay();
    } catch (error) { console.error('Błąd pobierania ustawień:', error); }
}

// --- TOASTY ---
function showToast(messageKey, type = 'success', extraContent = '') { 
    if (toastTimer) clearTimeout(toastTimer); 
    const message = (translations[currentLang][messageKey] || messageKey) + extraContent; 
    toastNotification.textContent = message;
    toastNotification.className = 'toast'; 
    toastNotification.classList.add(type);
    toastNotification.classList.add('show');
    toastTimer = setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}

// --- ZAPIS USTAWIEŃ ---
async function saveSettings() {
    const newServerId = serverSelect.value;
    const newScheduleHours = parseInt(scheduleSelect.value);

    if (isNaN(newScheduleHours) || newScheduleHours < 1) {
        showToast('toastSettingsInvalid', 'error');
        return;
    }
    const serverIdForApi = newServerId === 'null' ? null : parseInt(newServerId);

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ server_id: serverIdForApi, schedule_hours: newScheduleHours })
        });
        if (!response.ok) throw new Error('Odpowiedź serwera nie była OK');
        
        const data = await response.json();
        const lang = translations[currentLang];

        if (newServerId !== currentSelectedServerId) {
            let serverName = "";
            if (newServerId === 'null') {
                serverName = lang.autoSelect;
            } else {
                const selectedOption = serverSelect.querySelector(`option[value="${newServerId}"]`);
                serverName = selectedOption ? selectedOption.textContent : `ID: ${newServerId}`;
            }
            showToast('toastServerChanged', 'success', ` ${serverName}`);
            currentSelectedServerId = newServerId;
        }
        
        if (newScheduleHours !== currentScheduleHours) {
            currentScheduleHours = data.schedule_hours;
            const selectedOption = scheduleSelect.querySelector(`option[value="${newScheduleHours}"]`);
            const scheduleText = selectedOption ? selectedOption.textContent : `${newScheduleHours} hours`;
            showToast('toastScheduleChanged', 'success', ` ${scheduleText}`);
            updateNextRunTimeDisplay();
            const nextRunText = getNextRunTimeText();
            setTimeout(() => {
                showToast('toastNextRun', 'info', ` ${nextRunText}`);
            }, 3500);
        }
    } catch (error) {
        console.error('Błąd aktualizacji ustawień:', error);
        showToast('toastSettingsError', 'error');
        serverSelect.value = currentSelectedServerId;
        scheduleSelect.value = currentScheduleHours;
    }
}

// --- RĘCZNY TEST ---
async function triggerManualTest() {
    triggerTestBtn.disabled = true;
    triggerTestBtn.classList.add('is-loading');
    showToast('toastTestInProgress', 'info');
    
    const selectedServerId = serverSelect.value === 'null' ? null : parseInt(serverSelect.value);
    const lastTestTimestampBeforeRun = lastTestTimestamp; 

    try {
        const response = await fetch('/api/trigger-test', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ server_id: selectedServerId })
        });
        if (!response.ok) throw new Error('Błąd serwera przy uruchamianiu');
        startPollingForNewResult(lastTestTimestampBeforeRun);
    } catch (error) {
        console.error('Błąd uruchamiania testu:', error);
        showToast('toastTestError', 'error');
         setTimeout(() => {
            triggerTestBtn.disabled = false;
            triggerTestBtn.classList.remove('is-loading');
        }, 5000); 
    }
}

function startPollingForNewResult(previousLatestTimestamp) {
    if (pollingInterval) clearInterval(pollingInterval);

    let pollAttempts = 0;
    const maxPollAttempts = 25; 
    
    pollingInterval = setInterval(async () => {
        pollAttempts++;
        try {
            const response = await fetch('/api/results/latest');
            if (!response.ok) return; 
            const latestResult = await response.json();
            
            if (latestResult && latestResult.timestamp !== previousLatestTimestamp) {
                clearInterval(pollingInterval);
                showToast('toastTestComplete', 'success');
                lastTestTimestamp = latestResult.timestamp;
                await fetchResults(); 
                setTimeout(() => {
                    triggerTestBtn.disabled = false;
                    triggerTestBtn.classList.remove('is-loading');
                }, 2000);
            } else if (pollAttempts > maxPollAttempts) {
                clearInterval(pollingInterval);
                showToast('toastTestTimeout', 'error');
                triggerTestBtn.disabled = false;
                triggerTestBtn.classList.remove('is-loading');
            }
        } catch (error) { console.error("Błąd podczas pollingu:", error); }
    }, 3000);
}

// --- USUWANIE ---
async function deleteResults(ids) {
    const lang = translations[currentLang];
    const count = ids.length;
    const entryWord = count === 1 ? (currentLang === 'pl' ? 'wpis' : 'entry') : (currentLang === 'pl' ? 'wpisów' : 'entries');
    const confirmText = `${lang.confirmDeleteText}\n(${count} ${entryWord})`;

    confirmModalText.textContent = confirmText;
    confirmModal.style.display = 'flex';
    setTimeout(() => confirmModal.classList.add('show'), 10);

    const userDecision = new Promise((resolve) => {
        const onConfirm = () => { resolve(true); };
        const onCancel = () => { resolve(false); };
        modalConfirmBtn.addEventListener('click', onConfirm, { once: true });
        modalCancelBtn.addEventListener('click', onCancel, { once: true });
    });
    
    const confirmed = await userDecision;
    confirmModal.classList.remove('show');
    setTimeout(() => confirmModal.style.display = 'none', 200);

    if (!confirmed) return;
    
    try {
        const response = await fetch('/api/results', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: ids })
        });
        if (!response.ok) throw new Error('Błąd serwera');
        const data = await response.json();
        showToast('toastDeleteSuccess', 'success', ` ${data.deleted_count} ${data.deleted_count === 1 ? (currentLang === 'pl' ? 'wpis' : 'entry') : (currentLang === 'pl' ? 'wpisów' : 'entries')}`);
        await fetchResults();
    } catch (error) {
        showToast('toastDeleteError', 'error');
    } finally {
        deleteSelectedBtn.style.display = 'none';
        selectAllCheckbox.checked = false;
    }
}

// --- GUI Helpers (Statystyki, Czas, Tabele, Wykresy) ---

function updateStatsCards(results) {
    const lang = translations[currentLang];
    if (results.length === 0) {
        latestDownloadValue.textContent = "-"; latestUploadValue.textContent = "-";
        latestPingValue.textContent = "-"; latestJitterValue.textContent = "-";
        latestDownloadUnit.textContent = lang.chartUnitMbps; latestUploadUnit.textContent = lang.chartUnitMbps;
        latestPingUnit.textContent = lang.chartUnitMs; latestJitterUnit.textContent = lang.chartUnitMs;
        latestDownloadCompare.textContent = lang.statsNoData; latestUploadCompare.textContent = lang.statsNoData;
        latestPingCompare.textContent = lang.statsNoData; latestJitterCompare.textContent = lang.statsNoData;
        return;
    }
    const latest = results[0];
    const unitLabel = getUnitLabel(currentUnit);

    latestDownloadValue.textContent = convertValue(latest.download, currentUnit).toFixed(2);
    latestUploadValue.textContent = convertValue(latest.upload, currentUnit).toFixed(2);
    latestPingValue.textContent = latest.ping.toFixed(2);
    latestJitterValue.textContent = latest.jitter.toFixed(2);
    
    latestDownloadUnit.textContent = unitLabel;
    latestUploadUnit.textContent = unitLabel;
    latestPingUnit.textContent = lang.chartUnitMs;
    latestJitterUnit.textContent = lang.chartUnitMs;
    
    if (results.length < 2) {
        latestDownloadCompare.textContent = lang.statsFirstMeasurement;
        latestUploadCompare.textContent = lang.statsFirstMeasurement;
        latestPingCompare.textContent = lang.statsFirstMeasurement;
        latestJitterCompare.textContent = lang.statsFirstMeasurement;
        return;
    }
    const previous = results[1];
    updateSingleStatCard(latestDownloadCompare, latest.download, previous.download, 'positive');
    updateSingleStatCard(latestUploadCompare, latest.upload, previous.upload, 'positive');
    updateSingleStatCard(latestPingCompare, latest.ping, previous.ping, 'negative'); 
    updateSingleStatCard(latestJitterCompare, latest.jitter, previous.jitter, 'negative');
}

function updateSingleStatCard(compareEl, latestVal, prevVal, positiveTrend) {
    const lang = translations[currentLang];
    const diff = latestVal - prevVal;
    let percent = 0;
    if (prevVal !== 0) percent = (diff / prevVal) * 100;
    else if (latestVal > 0) percent = 100;
    
    let text = '';
    let trendClass = 'neutral';
    
    if (Math.abs(percent) < 0.01) {
        text = `${lang.statsNoChange} ➖`;
    } else {
        let isGoodChange = false;
        if (positiveTrend === 'positive') isGoodChange = (percent > 0);
        else isGoodChange = (percent < 0);
        
        const prefix = isGoodChange ? lang.statsFaster : lang.statsSlower;
        const icon = isGoodChange ? '↑' : '↓';
        trendClass = isGoodChange ? 'positive' : 'negative';
        text = `${Math.abs(percent).toFixed(2)}% ${prefix} ${icon}`;
    }
    compareEl.textContent = text;
    compareEl.className = `comparison ${trendClass}`;
}

function getNextRunTimeText() {
    const lang = translations[currentLang];
    if (!lastTestTimestamp) return lang.nextTestAfterFirst;
    
    try {
        const now = new Date();
        const lastRunDate = parseISOLocally(lastTestTimestamp); 
        if (lastRunDate === null || isNaN(lastRunDate.getTime())) return lang.nextTestError;

        const scheduleIntervalMs = currentScheduleHours * 60 * 60 * 1000;
        const timeElapsed = now.getTime() - lastRunDate.getTime();
        
        if (timeElapsed <= 60000) { 
            const nextRunDate = new Date(lastRunDate.getTime() + scheduleIntervalMs);
            return nextRunDate.toLocaleString(currentLang);
        }
        let timeToNextCycle = scheduleIntervalMs - (timeElapsed % scheduleIntervalMs);
        if (timeToNextCycle <= 10000) return lang.nextTestSoon;

        const nextRunDate = new Date(now.getTime() + timeToNextCycle);
        return nextRunDate.toLocaleString(currentLang);
    } catch (e) { return lang.nextTestError; }
}

function updateNextRunTimeDisplay() {
    nextRunTime.textContent = getNextRunTimeText();
}

function renderData() {
    const now = new Date();
    previousFilter = currentFilter;
    previousUnit = currentUnit;
    currentFilter = filterSelect.value; 
    
    if (unitSelect) {
        currentUnit = unitSelect.value;
        localStorage.setItem('displayUnit', currentUnit);
    }
    
    if (currentFilter === '24h') {
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        currentFilteredResults = allResults.filter(r => parseISOLocally(r.timestamp) > dayAgo);
    } else if (currentFilter === '7d') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        currentFilteredResults = allResults.filter(r => parseISOLocally(r.timestamp) > weekAgo);
    } else if (currentFilter === '30d') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        currentFilteredResults = allResults.filter(r => parseISOLocally(r.timestamp) > monthAgo);
    } else {
        currentFilteredResults = allResults.slice();
    }
    
    if (previousFilter !== currentFilter) {
        const selectedOptionText = filterSelect.options[filterSelect.selectedIndex].textContent;
        showToast('toastFilterChanged', 'info', ` ${selectedOptionText}`);
    }
    if (previousUnit !== currentUnit) {
        const unitLabel = getUnitLabel(currentUnit);
        showToast('toastUnitChanged', 'info', ` ${unitLabel}`);
    }

    renderCharts();
    updateStatsCards(allResults); 
    renderTable(); 
}

function renderCharts() {
    const chartResults = currentFilteredResults.slice().reverse();
    const labels = chartResults.map(res => parseISOLocally(res.timestamp).toLocaleString(currentLang)); 
    const downloadData = chartResults.map(res => convertValue(res.download, currentUnit));
    const uploadData = chartResults.map(res => convertValue(res.upload, currentUnit));
    const pingData = chartResults.map(res => res.ping);
    const jitterData = chartResults.map(res => res.jitter);

    const unitLabel = getUnitLabel(currentUnit);
    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const labelColor = isDark ? '#999' : '#666';
    const style = getComputedStyle(document.body);
    const lang = translations[currentLang];
    
    document.querySelector('#downloadChart').closest('.chart-block').querySelector('h3').textContent = `${lang.downloadChartTitle.split('(')[0].trim()} (${unitLabel})`;
    document.querySelector('#uploadChart').closest('.chart-block').querySelector('h3').textContent = `${lang.uploadChartTitle.split('(')[0].trim()} (${unitLabel})`;
    document.querySelector('#pingChart').closest('.chart-block').querySelector('h3').textContent = `${lang.pingChartTitle.split('(')[0].trim()} (${lang.chartUnitMs})`;
    document.querySelector('#jitterChart').closest('.chart-block').querySelector('h3').textContent = `${lang.jitterChartTitle.split('(')[0].trim()} (${lang.chartUnitMs})`;

    createAreaChart(downloadCtx, downloadChart, (chart) => { downloadChart = chart; }, labels, downloadData, chartResults, lang.chartLabelDownload, unitLabel, style.getPropertyValue('--color-download'), style.getPropertyValue('--color-download-bg'), gridColor, labelColor);
    createAreaChart(uploadCtx, uploadChart, (chart) => { uploadChart = chart; }, labels, uploadData, chartResults, lang.chartLabelUpload, unitLabel, style.getPropertyValue('--color-upload'), style.getPropertyValue('--color-upload-bg'), gridColor, labelColor);
    createAreaChart(pingCtx, pingChart, (chart) => { pingChart = chart; }, labels, pingData, chartResults, lang.chartLabelPing, lang.chartUnitMs, style.getPropertyValue('--color-ping'), style.getPropertyValue('--color-ping-bg'), gridColor, labelColor);
    createAreaChart(jitterCtx, jitterChart, (chart) => { jitterChart = chart; }, labels, jitterData, chartResults, lang.chartLabelJitter, lang.chartUnitMs, style.getPropertyValue('--color-jitter'), style.getPropertyValue('--color-jitter-bg'), gridColor, labelColor);
}

function renderTable() {
    let tableResults = currentFilteredResults.slice(); 
    if (currentSort.column && currentSort.direction !== 'none') {
        tableResults.sort((a, b) => {
            let valA, valB;
            if (['ping', 'jitter', 'download', 'upload'].includes(currentSort.column)) {
                 valA = parseFloat(a[currentSort.column]);
                 valB = parseFloat(b[currentSort.column]);
            } else {
                 valA = a[currentSort.column];
                 valB = b[currentSort.column];
            }
            if (currentSort.direction === 'asc') return valA > valB ? 1 : (valA < valB ? -1 : 0);
            else return valA < valB ? 1 : (valA > valB ? -1 : 0);
        });
    }
    let finalTableResults;
    if (currentLimit !== 'all') {
        finalTableResults = tableResults.slice(0, parseInt(currentLimit, 10));
    } else {
        finalTableResults = tableResults; 
    }
    updateTable(finalTableResults);
    attachCheckboxListeners();
}

function updateTable(results) {
    resultsTableBody.innerHTML = '';
    const labels = {
        time: translations[currentLang]['tableTime'] || 'Data',
        ping: translations[currentLang]['tablePing'] || 'Ping',
        jitter: translations[currentLang]['tableJitter'] || 'Jitter',
        download: translations[currentLang]['tableDownload'] || 'Pobieranie',
        upload: translations[currentLang]['tableUpload'] || 'Wysyłanie',
        server: translations[currentLang]['tableServer'] || 'Serwer',
        resultLink: translations[currentLang]['tableResultLink'] || 'Link' 
    };
    const unitLabel = getUnitLabel(currentUnit);

    results.forEach(res => {
        const row = document.createElement('tr');
        const timestamp = parseISOLocally(res.timestamp); 
        const resultLinkHtml = res.result_url ? `<a href="${res.result_url}" target="_blank" title="Otwórz wynik na speedtest.net">🔗</a>` : '';
        
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${res.id}"></td>
            <td data-label="${labels.time}">${timestamp.toLocaleString(currentLang)}</td>
            <td data-label="${labels.ping}"><strong>${res.ping}</strong> ms</td>
            <td data-label="${labels.jitter}"><strong>${res.jitter}</strong> ms</td>
            <td data-label="${labels.download}"><strong>${convertValue(res.download, currentUnit).toFixed(2)}</strong> ${unitLabel}</td>
            <td data-label="${labels.upload}"><strong>${convertValue(res.upload, currentUnit).toFixed(2)}</strong> ${unitLabel}</td>
            <td data-label="${labels.server}">(${res.server_id}) ${res.server_name} (${res.server_location})</td>
            <td data-label="${labels.resultLink}" class="link-cell">${resultLinkHtml}</td>
        `;
        resultsTableBody.appendChild(row);
        const rowData = res;
        row.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'A' && (!e.target.closest('td') || e.target.closest('td').firstElementChild.tagName !== 'INPUT')) {
                 showDetailsModal(rowData.id);
            }
        });
    });
    selectAllCheckbox.checked = false;
    
    document.querySelector('th[data-sort="download"]').textContent = `${labels.download} (${unitLabel})`;
    document.querySelector('th[data-sort="upload"]').textContent = `${labels.upload} (${unitLabel})`;
    document.querySelector('th[data-sort="ping"]').textContent = `${labels.ping} (ms)`;
    document.querySelector('th[data-sort="jitter"]').textContent = `${labels.jitter} (ms)`;
    document.querySelector('th[data-i18n-key="tableResultLink"]').textContent = `${labels.resultLink}`;
}

function createAreaChart(ctx, chartInstance, setChartInstance, labels, data, serverData, label, unit, color, bgColor, gridColor, labelColor) {
    if (chartInstance) chartInstance.destroy(); 
    const newChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: labels,
            datasets: [{
                label: `${label} (${unit})`, 
                data: data,
                borderColor: color,
                borderWidth: 2,
                backgroundColor: bgColor,
                fill: true,
                tension: 0.4,
                pointRadius: 3, 
                pointHoverRadius: 6,
                pointBackgroundColor: color
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: {}, 
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { type: 'linear', position: 'left', title: { display: true, text: unit, color: labelColor }, ticks: { color: labelColor }, grid: { color: gridColor } },
                x: { ticks: { color: labelColor }, grid: { color: gridColor } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index', intersect: false,
                    callbacks: {
                        title: (tooltipItems) => tooltipItems[0].label,
                        label: (context) => {
                            let lbl = context.dataset.label || '';
                            if (lbl) lbl += ': ';
                            if (context.parsed.y !== null) lbl += `${context.parsed.y.toFixed(2)} ${unit}`; 
                            return lbl;
                        },
                        footer: (tooltipItems) => {
                            const dataIndex = tooltipItems[0].dataIndex;
                            const result = serverData[dataIndex];
                            if (result && result.server_name) {
                                const serverLabel = translations[currentLang].tooltipServer || 'Serwer';
                                return `\n${serverLabel}: (${result.server_id}) ${result.server_name} (${result.server_location})`;
                            }
                            return null;
                        },
                    },
                    backgroundColor: 'rgba(30, 30, 30, 0.9)', titleColor: '#fff', bodyColor: '#fff', footerColor: '#fff',
                    footerSpacing: 10, padding: 10, borderColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 1, displayColors: true
                }
            }
        }
    });
    setChartInstance(newChart); 
}

function handleCheckboxChange() {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
    const delBtn = document.getElementById('deleteSelectedBtn');
    
    if (checkedCount > 0) {
        delBtn.style.display = 'flex'; // Używamy flex dla przycisku
    } else {
        delBtn.style.display = 'none';
    }
    
    if (rowCheckboxes.length > 0 && checkedCount === rowCheckboxes.length) selectAllCheckbox.checked = true;
    else selectAllCheckbox.checked = false;
}
function attachCheckboxListeners() {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

// --- NOWA FUNKCJA EKSPORTU PNG (Z FORSOWANIEM DESKTOPU I PEŁNEJ TABELI) ---
async function exportToPNG() {
    // Sprawdź czy biblioteki są załadowane
    if (!window.html2canvas) {
        alert("Błąd: Biblioteka html2canvas nie załadowana.");
        return;
    }
    
    const lang = translations[currentLang];
    const originalText = pngBtn.querySelector('span').textContent;
    pngBtn.querySelector('span').textContent = lang.generatingPNG;
    pngBtn.disabled = true;

    // Element do przechwycenia
    const elementToCapture = document.querySelector('#contentToCapture');
    
    try {
        const canvas = await html2canvas(elementToCapture, {
            scale: 3, // Wysoka jakość
            useCORS: true,
            windowWidth: 1400, // Wymuś renderowanie w trybie desktop
            scrollY: -window.scrollY, 
            onclone: (clonedDoc) => {
                const clone = clonedDoc.querySelector('#contentToCapture');

                // 1. Reset stylów kontenera
                clone.style.width = '1400px'; 
                clone.style.height = 'auto'; 
                clone.style.overflow = 'visible'; 
                clone.style.position = 'static'; 
                clone.style.maxHeight = 'none'; 

                // 2. ODKRĘCENIE 75% SZEROKOŚCI (DLA PNG CHCEMY 100%)
                const sections = clonedDoc.querySelectorAll('.content-scroll > section, .content-scroll > footer');
                sections.forEach(section => {
                    section.style.width = '100%'; // Wymuś pełną szerokość w PNG
                    section.style.maxWidth = 'none';
                });

                // 3. Wymuszenie wysokości wykresów dla PNG
                const charts = clonedDoc.querySelectorAll('.chart-block canvas');
                charts.forEach(canvas => {
                    canvas.style.width = '100%';
                    canvas.style.height = '400px'; // Większa wysokość dla czytelności
                });

                // 4. Ukrywanie zbędnych elementów
                const controls = clonedDoc.querySelector('.controls-dashboard');
                if(controls) controls.style.display = 'none';
                const stats = clonedDoc.querySelector('.stats-container');
                if(stats) stats.style.display = 'none';
                const actions = clonedDoc.querySelector('.table-actions');
                if(actions) actions.style.display = 'none';
                const footerControls = clonedDoc.querySelector('.table-footer-controls');
                if(footerControls) footerControls.style.display = 'none';
                const footer = clonedDoc.querySelector('footer');
                if(footer) footer.style.display = 'none';
                
                // 5. Nagłówek raportu
                const headerDiv = clonedDoc.createElement('div');
                headerDiv.style.display = 'flex';
                headerDiv.style.alignItems = 'center';
                headerDiv.style.marginBottom = '20px';
                headerDiv.style.paddingBottom = '10px';
                headerDiv.style.borderBottom = '2px solid #ddd';
                
                const logoImg = clonedDoc.createElement('img');
                logoImg.src = 'logo.png';
                logoImg.style.height = '40px';
                logoImg.style.marginRight = '15px';
                
                const title = clonedDoc.createElement('h1');
                title.textContent = 'SpeedtestLog Report';
                title.style.fontSize = '1.5rem';
                title.style.color = '#333';
                title.style.margin = '0';
                
                headerDiv.appendChild(logoImg);
                headerDiv.appendChild(title);
                
                clone.insertBefore(headerDiv, clone.firstChild);
                
                // 6. Tło
                clone.style.backgroundColor = '#ffffff';
                if (document.body.classList.contains('dark-mode')) {
                    clone.style.backgroundColor = '#1e1e1e';
                    title.style.color = '#fff';
                }
                clone.style.padding = '20px';
            }
        });

        const imgData = canvas.toDataURL('image/png');
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        
        const filename = `speedtest_report_${year}-${month}-${day}_${hour}-${minute}.png`;
        
        const link = document.createElement('a');
        link.href = imgData;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("PNG Generation Error:", error);
        alert("Błąd generowania PNG: " + error.message);
    } finally {
        pngBtn.querySelector('span').textContent = originalText;
        pngBtn.disabled = false;
    }
}


// --- LISTENERS PRZYCISKÓW ---

// Wylogowanie
if (logoutBtn) {
    fetch('/api/auth-status').then(r=>r.json()).then(d => {
        if(!d.enabled) logoutBtn.style.display = 'none';
    });
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.reload();
        } catch (e) { console.error(e); }
    });
}

// Eksport CSV
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        window.location.href = '/api/export';
    });
}

// Eksport PNG
if (pngBtn) {
    pngBtn.addEventListener('click', exportToPNG);
}

// BACKUP DOWNLOAD
if (downloadBackupBtn) {
    downloadBackupBtn.addEventListener('click', async () => {
        try {
            showToast('backupGenerating', 'info');
            const response = await fetch('/api/backup');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const header = response.headers.get('Content-Disposition');
                const parts = header ? header.split('filename=') : [];
                const filename = parts.length > 1 ? parts[1].replace(/"/g, '') : 'backup.sql';
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showToast('backupCreatedSuccess', 'success');
            } else {
                throw new Error('Backup failed');
            }
        } catch (e) {
            showToast('backupCreatedError', 'error');
        }
    });
}

// BACKUP RESTORE
if (restoreForm) {
    restoreForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(restoreForm);
        const statusEl = document.getElementById('restoreStatus');
        const btn = document.getElementById('restoreBackupBtn');
        const lang = translations[currentLang];
        
        btn.disabled = true;
        btn.textContent = lang.restoring;
        statusEl.textContent = '';
        statusEl.style.color = 'var(--text-color)';
        
        try {
            const response = await fetch('/api/restore', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                statusEl.textContent = lang.restoreSuccess;
                statusEl.style.color = 'var(--success-text)';
                showToast('restoreSuccess', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                throw new Error('Restore failed');
            }
        } catch (error) {
            statusEl.textContent = lang.restoreError;
            statusEl.style.color = 'var(--danger-text)';
            showToast('restoreError', 'error');
            btn.disabled = false;
            btn.textContent = lang.backupRestoreBtn;
        }
    });
}

// Główne Listenery
if (triggerTestBtn) triggerTestBtn.addEventListener('click', triggerManualTest);
if (serverSelect) serverSelect.addEventListener('change', saveSettings);
if (scheduleSelect) scheduleSelect.addEventListener('change', saveSettings);
if (filterSelect) filterSelect.addEventListener('change', () => { renderData(); });

if (unitSelect) {
    unitSelect.addEventListener('change', () => { renderData(); });
}

if (limitSelect) {
    limitSelect.addEventListener('change', () => {
        const newLimit = limitSelect.value;
        if (newLimit === currentLimit) return; 
        currentLimit = newLimit;
        localStorage.setItem('tableLimit', newLimit);
        renderTable(); 
        const selectedOptionText = limitSelect.options[limitSelect.selectedIndex].textContent;
        showToast('toastLimitChanged', 'info', ` ${selectedOptionText}`);
    });
}

if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
        const isChecked = selectAllCheckbox.checked;
        document.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        handleCheckboxChange();
    });
}

if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => {
        const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
        const idsToDelete = Array.from(checkedBoxes).map(box => box.dataset.id);
        if (idsToDelete.length > 0) deleteResults(idsToDelete);
    });
}

if (document.querySelector('#resultsTable th[data-sort]')) {
    document.querySelectorAll('#resultsTable th[data-sort]').forEach(header => {
        header.classList.add('sortable');
        header.addEventListener('click', () => {
            const sortColumn = header.dataset.sort;
            document.querySelectorAll('#resultsTable th[data-sort]').forEach(th => {
                if (th !== header) th.classList.remove('sort-asc', 'sort-desc');
            });
            if (currentSort.column === sortColumn) {
                if (currentSort.direction === 'desc') {
                    currentSort.direction = 'asc'; header.classList.remove('sort-desc'); header.classList.add('sort-asc');
                } else {
                    currentSort.direction = 'desc'; header.classList.remove('sort-asc'); header.classList.add('sort-desc');
                }
            } else {
                currentSort.column = sortColumn; currentSort.direction = 'desc';
                header.classList.remove('sort-asc'); header.classList.add('sort-desc');
            }
            renderTable(); 
        });
    });
}


// --- INICJALIZACJA APLIKACJI ---
async function initializeApp() {
    // 1. Język
    const savedLang = localStorage.getItem('language') || navigator.language.split('-')[0];
    currentLang = (translations[savedLang]) ? savedLang : 'pl';
    
    // 2. Motyw
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.toggle('dark-mode', true);
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.toggle('dark-mode', false);
        themeToggle.textContent = '🌙';
    }
    
    // 3. Filtry
    if(filterSelect) filterSelect.value = currentFilter;
    const savedLimit = localStorage.getItem('tableLimit') || '25';
    currentLimit = savedLimit;
    if(limitSelect) limitSelect.value = currentLimit; 
    
    setLanguage(currentLang); 
    
    // 4. Obsługa Custom Dropdown Języka (Flagi)
    const langBtn = document.getElementById('langBtn');
    const langMenu = document.getElementById('langMenu');
    const currentLangFlag = document.getElementById('currentLangFlag');
    const currentLangText = document.getElementById('currentLangText');
    const langOptions = document.querySelectorAll('.lang-menu li');

    function updateLangButtonUI(lang) {
        if (lang === 'pl') {
            currentLangFlag.src = 'https://flagcdn.com/w40/pl.png';
            currentLangText.textContent = 'PL';
        } else {
            currentLangFlag.src = 'https://flagcdn.com/w40/gb.png';
            currentLangText.textContent = 'EN';
        }
    }

    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('show');
        });
    }

    langOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedLang = option.dataset.lang;
            setLanguage(selectedLang);
            updateLangButtonUI(selectedLang);
            langMenu.classList.remove('show');
            showToast('toastLangChanged', 'success');
        });
    });

    window.addEventListener('click', () => {
        if (langMenu && langMenu.classList.contains('show')) {
            langMenu.classList.remove('show');
        }
    });
    updateLangButtonUI(currentLang);

    // 5. Pobranie danych (tylko na stronie głównej)
    if (document.getElementById('downloadChart')) {
        await fetchServers();
        await fetchSettings(); 
        await fetchResults(); 
    }

    // 6. Obsługa Sidebara
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const navLinks = document.querySelectorAll('.sidebar-nav a');

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) closeSidebar();
            // Usuwamy klasę active ze wszystkich linków, ale to jest trochę tricky przy nawigacji między plikami
            // Zostawiamy to przeglądarce, bo przeładowanie strony i tak zresetuje stan JS
        });
    });
}

// Start
initializeApp();