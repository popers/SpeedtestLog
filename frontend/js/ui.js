import { state } from './state.js';
import { translations } from './i18n.js';
import { parseISOLocally, convertValue, getUnitLabel } from './utils.js';

// --- UI Helpers ---

// Aktualizacja wyglądu przycisku języka (Flaga + Tekst w headerze)
export function updateLangButtonUI(lang) {
    const currentLangFlag = document.getElementById('currentLangFlag');
    const currentLangText = document.getElementById('currentLangText');
    
    if (currentLangFlag && currentLangText) {
        if (lang === 'pl') {
            currentLangFlag.src = 'https://flagcdn.com/w40/pl.png';
            currentLangText.textContent = 'PL';
        } else {
            currentLangFlag.src = 'https://flagcdn.com/w40/gb.png';
            currentLangText.textContent = 'EN';
        }
    }
}

// Ukrywanie/Pokazywanie przycisku Wyloguj
export function setLogoutButtonVisibility(enabled) {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = enabled ? 'flex' : 'none';
    }
}

// --- Stats Cards ---
export function updateStatsCards(results) {
    const lang = translations[state.currentLang];
    const latestDownloadValue = document.getElementById('latestDownloadValue');
    const latestUploadValue = document.getElementById('latestUploadValue');
    const latestPingValue = document.getElementById('latestPingValue');
    const latestJitterValue = document.getElementById('latestJitterValue');
    
    if (!latestDownloadValue) return; // Not on dashboard

    if (results.length === 0) {
        latestDownloadValue.textContent = "-"; 
        latestUploadValue.textContent = "-"; 
        latestPingValue.textContent = "-"; 
        latestJitterValue.textContent = "-";
        
        document.getElementById('latestDownloadCompare').textContent = lang.statsNoData;
        document.getElementById('latestUploadCompare').textContent = lang.statsNoData;
        document.getElementById('latestPingCompare').textContent = lang.statsNoData;
        document.getElementById('latestJitterCompare').textContent = lang.statsNoData;
        return;
    }
    const latest = results[0];
    const unitLabel = getUnitLabel(state.currentUnit);

    latestDownloadValue.textContent = convertValue(latest.download, state.currentUnit).toFixed(2);
    latestUploadValue.textContent = convertValue(latest.upload, state.currentUnit).toFixed(2);
    latestPingValue.textContent = latest.ping.toFixed(2);
    latestJitterValue.textContent = latest.jitter.toFixed(2);
    
    document.getElementById('latestDownloadUnit').textContent = unitLabel;
    document.getElementById('latestUploadUnit').textContent = unitLabel;
    
    if (results.length >= 2) {
        const previous = results[1];
        updateSingleStatCard(document.getElementById('latestDownloadCompare'), latest.download, previous.download, 'positive');
        updateSingleStatCard(document.getElementById('latestUploadCompare'), latest.upload, previous.upload, 'positive');
        updateSingleStatCard(document.getElementById('latestPingCompare'), latest.ping, previous.ping, 'negative'); 
        updateSingleStatCard(document.getElementById('latestJitterCompare'), latest.jitter, previous.jitter, 'negative');
    } else {
         document.getElementById('latestDownloadCompare').textContent = lang.statsFirstMeasurement;
         document.getElementById('latestUploadCompare').textContent = lang.statsFirstMeasurement;
         document.getElementById('latestPingCompare').textContent = lang.statsFirstMeasurement;
         document.getElementById('latestJitterCompare').textContent = lang.statsFirstMeasurement;
    }
}

function updateSingleStatCard(compareEl, latestVal, prevVal, positiveTrend) {
    const lang = translations[state.currentLang];
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

// --- Modal ---
export function showDetailsModal(resultId) {
    const lang = translations[state.currentLang];
    const result = state.allResults.find(r => r.id === resultId);
    const detailsModal = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('detailsContent');
    
    if (!result) return;

    const timestamp = parseISOLocally(result.timestamp).toLocaleString(state.currentLang);
    const downloadValue = convertValue(result.download, state.currentUnit).toFixed(2);
    const uploadValue = convertValue(result.upload, state.currentUnit).toFixed(2);
    const unitLabel = getUnitLabel(state.currentUnit);
    
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
        </div>
        <p style="font-weight: 600; color: var(--primary-color); margin-top: 20px;">${lang.detailsSectionServerClient}</p>
        <div style="padding-left: 15px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>${lang.detailsServer}</strong> (${result.server_id}) ${result.server_name} (${result.server_location})</p>
            ${result.client_ip ? `<p style="margin: 5px 0;"><strong>${lang.detailsClient}</strong> ${result.client_ip}</p>` : ''}
            ${result.isp ? `<p style="margin: 5px 0;"><strong>${lang.detailsISP}</strong> ${result.isp}</p>` : ''}
        </div>
        ${result.result_url ? `<p style="margin: 10px 0;"><strong>${lang.detailsURL}</strong> <a href="${result.result_url}" target="_blank" style="color: var(--primary-color);">Otwórz pełny wynik</a></p>` : ''}
    `;

    document.querySelector('#detailsModal h3').textContent = lang.detailsTitle;
    detailsContent.innerHTML = content;
    detailsModal.style.display = 'flex';
    setTimeout(() => detailsModal.classList.add('show'), 10);
}

// --- Table ---
export function updateTable(results) {
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    if (!resultsTableBody) return;

    resultsTableBody.innerHTML = '';
    const lang = translations[state.currentLang];
    const unitLabel = getUnitLabel(state.currentUnit);

    results.forEach(res => {
        const row = document.createElement('tr');
        const timestamp = parseISOLocally(res.timestamp); 
        const resultLinkHtml = res.result_url ? `<a href="${res.result_url}" target="_blank" title="Speedtest.net">🔗</a>` : '';
        
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${res.id}"></td>
            <td data-label="${lang.tableTime}">${timestamp.toLocaleString(state.currentLang)}</td>
            <td data-label="${lang.tablePing}"><strong>${res.ping}</strong> ms</td>
            <td data-label="${lang.tableJitter}"><strong>${res.jitter}</strong> ms</td>
            <td data-label="${lang.tableDownload}"><strong>${convertValue(res.download, state.currentUnit).toFixed(2)}</strong> ${unitLabel}</td>
            <td data-label="${lang.tableUpload}"><strong>${convertValue(res.upload, state.currentUnit).toFixed(2)}</strong> ${unitLabel}</td>
            <td data-label="${lang.tableServer}">(${res.server_id}) ${res.server_name} (${res.server_location})</td>
            <td data-label="${lang.tableResultLink}" class="link-cell">${resultLinkHtml}</td>
        `;
        resultsTableBody.appendChild(row);
        row.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'A') {
                 showDetailsModal(res.id);
            }
        });
    });
    
    // Update headers translation
    document.querySelectorAll('[data-sort]').forEach(th => {
        const key = th.dataset.i18nKey;
        if(key && lang[key]) {
            let text = lang[key];
            if(th.dataset.sort === 'download' || th.dataset.sort === 'upload') text += ` (${unitLabel})`;
            if(th.dataset.sort === 'ping' || th.dataset.sort === 'jitter') text += ` (ms)`;
            th.textContent = text;
        }
    });
}

// --- Export PNG ---
export async function exportToPNG() {
    // Sprawdź czy biblioteki są załadowane
    if (!window.html2canvas) {
        alert("Błąd: Biblioteka html2canvas nie załadowana.");
        return;
    }
    
    const pngBtn = document.getElementById('pngBtn');
    const lang = translations[state.currentLang];
    const originalText = pngBtn.querySelector('span').textContent;
    
    // Ustaw stan ładowania przycisku
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