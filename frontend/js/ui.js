import { state } from './state.js';
import { translations } from './i18n.js';
import { parseISOLocally, convertValue, getUnitLabel } from './utils.js';

// --- UI Helpers ---

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
    
    if (!latestDownloadValue) return; 

    if (results.length === 0) {
        latestDownloadValue.textContent = "-"; 
        document.getElementById('latestUploadValue').textContent = "-";
        document.getElementById('latestPingValue').textContent = "-";
        document.getElementById('latestJitterValue').textContent = "-";
        
        document.getElementById('latestDownloadCompare').textContent = lang.statsNoData;
        document.getElementById('latestUploadCompare').textContent = lang.statsNoData;
        document.getElementById('latestPingCompare').textContent = lang.statsNoData;
        document.getElementById('latestJitterCompare').textContent = lang.statsNoData;
        return;
    }
    const latest = results[0];
    const unitLabel = getUnitLabel(state.currentUnit);

    latestDownloadValue.textContent = convertValue(latest.download, state.currentUnit).toFixed(2);
    document.getElementById('latestUploadValue').textContent = convertValue(latest.upload, state.currentUnit).toFixed(2);
    document.getElementById('latestPingValue').textContent = latest.ping.toFixed(2);
    document.getElementById('latestJitterValue').textContent = latest.jitter.toFixed(2);
    
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

function handleCheckboxChange() {
    const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
    const delBtn = document.getElementById('deleteSelectedBtn');
    const selectAll = document.getElementById('selectAllCheckbox');
    
    if (delBtn) {
        delBtn.style.display = checkedCount > 0 ? 'flex' : 'none';
        const baseText = translations[state.currentLang].deleteSelected;
        delBtn.innerHTML = `🗑️ ${baseText} (${checkedCount})`;
    }
    
    if (selectAll) {
        const allCheckboxes = document.querySelectorAll('.row-checkbox');
        selectAll.checked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
    }
}

// --- NOWE: Funkcja renderująca paginację ---
export function renderPagination(totalItems) {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if(!pageInfo || !prevBtn || !nextBtn) return;

    if (state.itemsPerPage === 'all') {
        pageInfo.textContent = `${translations[state.currentLang].filterAll} (${totalItems})`;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    pageInfo.textContent = `${state.currentPage} ${translations[state.currentLang].pageOf} ${totalPages}`;
    
    prevBtn.disabled = state.currentPage === 1;
    nextBtn.disabled = state.currentPage === totalPages;
}

// --- Table ---
export function updateTable(results) {
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    if (!resultsTableBody) return;

    // ZMIANA: Logika paginacji
    let paginatedResults = results;
    if (state.itemsPerPage !== 'all') {
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const endIndex = startIndex + parseInt(state.itemsPerPage);
        paginatedResults = results.slice(startIndex, endIndex);
    }

    resultsTableBody.innerHTML = '';
    const delBtn = document.getElementById('deleteSelectedBtn');
    const selectAll = document.getElementById('selectAllCheckbox');
    if (delBtn) delBtn.style.display = 'none';
    if (selectAll) selectAll.checked = false;

    const lang = translations[state.currentLang];
    const unitLabel = getUnitLabel(state.currentUnit);

    paginatedResults.forEach(res => {
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
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'A' && !e.target.classList.contains('row-checkbox')) {
                 showDetailsModal(res.id);
            }
        });

        const checkbox = row.querySelector('.row-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                handleCheckboxChange();
            });
        }
    });
    
    // Render controls
    renderPagination(results.length);

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