import { state } from './state.js';
import { translations } from './i18n.js';
import { parseISOLocally, convertValue, getUnitLabel } from './utils.js';

// --- UI Helpers ---

export function updateLangButtonUI(lang) {
    const currentLangText = document.getElementById('currentLangText');
    if (currentLangText) {
        if (lang === 'pl') {
            currentLangText.textContent = 'PL';
        } else {
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
        
        const ispDl = document.getElementById('latestDownloadISP');
        const ispUl = document.getElementById('latestUploadISP');
        if (ispDl) ispDl.textContent = '';
        if (ispUl) ispUl.textContent = '';
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

    updateIspIntegrity(latest.download, state.declaredSpeeds.download, 'latestDownloadISP');
    updateIspIntegrity(latest.upload, state.declaredSpeeds.upload, 'latestUploadISP');
}

function updateIspIntegrity(currentVal, declaredVal, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!declaredVal || declaredVal <= 0) {
        el.textContent = '';
        el.className = 'isp-stat';
        return;
    }
    const pct = (currentVal / declaredVal) * 100;
    const formattedPct = pct.toFixed(0);
    const langStr = translations[state.currentLang]['ispIntegrity'] || '% umowy';
    el.textContent = `${formattedPct}% ${langStr}`;
    if (pct < 80) {
        el.className = 'isp-stat warning';
    } else {
        el.className = 'isp-stat';
    }
}

function updateSingleStatCard(compareEl, latestVal, prevVal, positiveTrend) {
    const lang = translations[state.currentLang];
    const diff = latestVal - prevVal;
    let percent = 0;
    if (prevVal !== 0) percent = (diff / prevVal) * 100;
    else if (latestVal > 0) percent = 100;
    
    let trendClass = 'neutral';
    
    if (Math.abs(percent) < 0.01) {
        compareEl.innerHTML = `<span class="material-symbols-rounded">remove</span> ${lang.statsNoChange}`;
    } else {
        let isGoodChange = false;
        if (positiveTrend === 'positive') isGoodChange = (percent > 0);
        else isGoodChange = (percent < 0);
        
        const prefix = isGoodChange ? lang.statsFaster : lang.statsSlower;
        
        let iconName;
        
        if (positiveTrend === 'negative') {
            iconName = (percent > 0) ? 'arrow_downward' : 'arrow_upward';
        } else {
            iconName = (percent > 0) ? 'arrow_upward' : 'arrow_downward';
        }
        
        trendClass = isGoodChange ? 'positive' : 'negative';
        
        compareEl.innerHTML = `
            <span class="material-symbols-rounded">${iconName}</span>
            <span>${Math.abs(percent).toFixed(2)}% ${prefix}</span>
        `;
    }
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

    const formatLatency = (low, high) => {
        if (low === null && high === null) return lang.detailsNoData;
        const lowVal = low !== null ? `${low.toFixed(2)} ms` : '-';
        const highVal = high !== null ? `${high.toFixed(2)} ms` : '-';
        return `Min: ${lowVal} / Max: ${highVal}`;
    };

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
            <p style="color: var(--color-ping); margin: 5px 0;"><strong>${lang.detailsPing}</strong> ${result.ping.toFixed(2)} ms (Jitter: ${result.jitter.toFixed(2)} ms)</p>
            ${result.ping_low !== null ? `<p style="color: var(--color-ping); margin: 5px 0;"><strong>${lang.detailsLatencyLow}</strong> ${result.ping_low.toFixed(2)} ms</p>` : ''}
            
            <p style="margin: 10px 0; border-top: 1px dashed var(--border-color); padding-top: 5px;">
                <strong>${lang.detailsDownloadLatency}</strong> 
                <span style="font-size: 0.9em; display: block; margin-top: 2px;">${formatLatency(result.download_latency_low, result.download_latency_high)}</span>
            </p>

            <p style="margin: 5px 0;">
                <strong>${lang.detailsUploadLatency}</strong> 
                <span style="font-size: 0.9em; display: block; margin-top: 2px;">${formatLatency(result.upload_latency_low, result.upload_latency_high)}</span>
            </p>
        </div>
        
        <p style="font-weight: 600; color: var(--primary-color); margin-top: 20px;">${lang.detailsSectionServerClient}</p>
        <div style="padding-left: 15px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>${lang.detailsServer}</strong> (${result.server_id}) ${result.server_name} (${result.server_location})</p>
            ${result.client_ip ? `<p style="margin: 5px 0;"><strong>${lang.detailsClient}</strong> ${result.client_ip}</p>` : ''}
            ${result.isp ? `<p style="margin: 5px 0;"><strong>${lang.detailsISP}</strong> ${result.isp}</p>` : ''}
        </div>
        ${result.result_url ? `<p style="margin: 10px 0;"><strong>${lang.detailsURL}</strong> <a href="${result.result_url}" target="_blank" style="color: var(--primary-color);">${lang.detailsResultLinkText || 'Otwórz pełny wynik'}</a></p>` : ''}
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
    const selectAllMobile = document.getElementById('selectAllMobile'); // NEW
    
    if (delBtn) {
        delBtn.style.display = checkedCount > 0 ? 'flex' : 'none';
        const baseText = translations[state.currentLang].deleteSelected;
        delBtn.innerHTML = `<span class="material-symbols-rounded">delete</span> ${baseText} (${checkedCount})`;
    }
    
    if (selectAll) {
        const allCheckboxes = document.querySelectorAll('.row-checkbox');
        const allChecked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
        selectAll.checked = allChecked;
        if(selectAllMobile) selectAllMobile.checked = allChecked; // Sync mobile checkbox
    }
}

// --- Pagination ---
export function renderPagination(totalItems) {
    const paginationNav = document.getElementById('paginationNav');
    
    if (!paginationNav) return;

    if (state.itemsPerPage === 'all') {
        paginationNav.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
    
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    paginationNav.innerHTML = '';
    
    const btnPrev = document.createElement('button');
    btnPrev.className = 'page-btn';
    btnPrev.innerHTML = '<span class="material-symbols-rounded">chevron_left</span>';
    btnPrev.disabled = state.currentPage === 1;
    btnPrev.onclick = () => changePage(state.currentPage - 1);
    paginationNav.appendChild(btnPrev);

    let delta = 1; 
    let range = [];
    let rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
        if (i == 1 || i == totalPages || (i >= state.currentPage - delta && i <= state.currentPage + delta)) {
            range.push(i);
        }
    }

    for (let i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }

    rangeWithDots.forEach(page => {
        const btn = document.createElement('button');
        btn.className = 'page-btn';
        if (page === '...') {
            btn.textContent = '...';
            btn.disabled = true;
        } else {
            btn.textContent = page;
            if (page === state.currentPage) btn.classList.add('active');
            btn.onclick = () => changePage(page);
        }
        paginationNav.appendChild(btn);
    });

    const btnNext = document.createElement('button');
    btnNext.className = 'page-btn';
    btnNext.innerHTML = '<span class="material-symbols-rounded">chevron_right</span>';
    btnNext.disabled = state.currentPage === totalPages;
    btnNext.onclick = () => changePage(state.currentPage + 1);
    paginationNav.appendChild(btnNext);
}

function changePage(newPage) {
    state.currentPage = newPage;
    updateTable(state.currentFilteredResults || state.allResults);
}

// --- Table ---
export function updateTable(results) {
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    if (!resultsTableBody) return;

    let paginatedResults = results;
    if (state.itemsPerPage !== 'all') {
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const endIndex = startIndex + parseInt(state.itemsPerPage);
        paginatedResults = results.slice(startIndex, endIndex);
    }

    resultsTableBody.innerHTML = '';
    const delBtn = document.getElementById('deleteSelectedBtn');
    const selectAll = document.getElementById('selectAllCheckbox');
    const selectAllMobile = document.getElementById('selectAllMobile'); // NEW

    if (delBtn) delBtn.style.display = 'none';
    if (selectAll) selectAll.checked = false;
    if (selectAllMobile) selectAllMobile.checked = false; // Reset mobile checkbox

    // NEW: Handle mobile Select All click
    if (selectAllMobile) {
        selectAllMobile.onchange = (e) => {
            const checked = e.target.checked;
            // Sync desktop checkbox
            if(selectAll) selectAll.checked = checked;
            
            document.querySelectorAll('.row-checkbox').forEach(cb => {
                cb.checked = checked;
                const row = cb.closest('tr');
                if(checked) row.classList.add('selected-card');
                else row.classList.remove('selected-card');
            });
            handleCheckboxChange();
        };
    }

    const lang = translations[state.currentLang];
    const unitLabel = getUnitLabel(state.currentUnit);

    const declaredDl = state.declaredSpeeds.download;
    const declaredUl = state.declaredSpeeds.upload;

    paginatedResults.forEach(res => {
        const row = document.createElement('tr');
        
        // ZMIANA: Podział daty i czasu dla mobilnego widoku oraz dodanie lokalizacji
        const dateObj = parseISOLocally(res.timestamp);
        const dateStr = dateObj.toLocaleDateString(state.currentLang);
        const timeStr = dateObj.toLocaleTimeString(state.currentLang, { hour: '2-digit', minute: '2-digit' });
        
        const locationStr = res.server_location ? ` (${res.server_location})` : '';

        const resultLinkHtml = res.result_url ? 
            `<a href="${res.result_url}" target="_blank" class="result-link-icon" title="Speedtest.net">
                <span class="material-symbols-rounded">open_in_new</span>
             </a>` : '';
        
        let pingClass = '';
        if (res.ping < 20) pingClass = 'text-success';
        else if (res.ping < 100) pingClass = 'text-warning';
        else pingClass = 'text-danger';

        let jitterClass = '';
        if (res.jitter < 10) jitterClass = 'text-success';
        else if (res.jitter < 30) jitterClass = 'text-warning';
        else jitterClass = 'text-danger';

        let downloadClass = '';
        if (declaredDl > 0) {
            const pct = (res.download / declaredDl) * 100;
            if (pct >= 80) downloadClass = 'text-success';
            else if (pct >= 50) downloadClass = 'text-warning';
            else downloadClass = 'text-danger';
        }

        let uploadClass = '';
        if (declaredUl > 0) {
            const pct = (res.upload / declaredUl) * 100;
            if (pct >= 80) uploadClass = 'text-success';
            else if (pct >= 50) uploadClass = 'text-warning';
            else uploadClass = 'text-danger';
        }

        // ZMIANA: HTML z podziałem na cell-date i cell-time oraz dodaną lokalizacją serwera
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${res.id}"></td>
            <td data-label="${lang.tableTime}">
                <span class="cell-date">${dateStr}</span> <span class="cell-time">${timeStr}</span>
            </td>
            <td data-label="${lang.tableDownload}"><strong class="${downloadClass}">${convertValue(res.download, state.currentUnit).toFixed(2)}</strong> ${unitLabel}</td>
            <td data-label="${lang.tableUpload}"><strong class="${uploadClass}">${convertValue(res.upload, state.currentUnit).toFixed(2)}</strong> ${unitLabel}</td>
            <td data-label="${lang.tablePing}"><strong class="${pingClass}">${res.ping.toFixed(2)}</strong> ms</td>
            <td data-label="${lang.tableJitter}"><strong class="${jitterClass}">${res.jitter.toFixed(2)}</strong> ms</td>
            <td data-label="${lang.tableServer}">(${res.server_id}) ${res.server_name}${locationStr}</td>
            <td data-label="${lang.tableResultLink}" class="link-cell">${resultLinkHtml}</td>
        `;
        resultsTableBody.appendChild(row);
        
        row.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'A' && !e.target.parentNode.classList.contains('result-link-icon') && !e.target.classList.contains('row-checkbox')) {
                 showDetailsModal(res.id);
            }
        });

        const checkbox = row.querySelector('.row-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if(e.target.checked) row.classList.add('selected-card');
                else row.classList.remove('selected-card');
                
                handleCheckboxChange();
            });
        }
    });
    
    renderPagination(results.length);

    document.querySelectorAll('[data-sort]').forEach(th => {
        const key = th.dataset.i18nKey;
        if(key && lang[key]) {
            let text = lang[key];
            if (th.dataset.sort === state.currentSort.column) {
                text += state.currentSort.direction === 'asc' ? ' ▲' : ' ▼';
            }
            th.textContent = text;
        }
    });
}