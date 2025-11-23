import { state } from './state.js';
import { translations } from './i18n.js';
import { showBrowserNotification, isBrowserNotifEnabled } from './notifications.js';

let watchdogInterval = null;
let wdChart = null;
let lastWatchdogStatus = null; // true/false

export function startWatchdogPolling() {
    if (watchdogInterval) clearInterval(watchdogInterval);
    updateWatchdogUI(); 
    watchdogInterval = setInterval(updateWatchdogUI, 5000); 
}

export function stopWatchdogPolling() {
    if (watchdogInterval) clearInterval(watchdogInterval);
}

// Wywoływane z app.js przy zmianie motywu, aby przerysować wykres
export function resetWatchdogChart() {
    if (wdChart) {
        wdChart.destroy();
        wdChart = null;
        updateWatchdogUI();
    }
}

async function updateWatchdogUI() {
    try {
        const icon = document.getElementById('watchdogIcon');
        if(!icon) return; 

        const res = await fetch('/api/watchdog/status');
        if(!res.ok) return;
        const data = await res.json();
        const current = data.current;
        
        if (current.online) {
            icon.className = 'watchdog-indicator online';
        } else {
            icon.className = 'watchdog-indicator offline';
        }

        // Obsługa powiadomień przeglądarkowych dla watchdoga
        if (isBrowserNotifEnabled() && lastWatchdogStatus !== null && current.online !== lastWatchdogStatus) {
            const statusStr = current.online ? "ONLINE" : "OFFLINE";
            showBrowserNotification(
                "Ping Watchdog",
                `Cel ${current.target} jest teraz ${statusStr}.`,
                "watchdog-status"
            );
        }
        lastWatchdogStatus = current.online;

        const popover = document.getElementById('watchdogPopover');
        if (popover && popover.classList.contains('show')) {
            const statusText = document.getElementById('wdStatus');
            const targetText = document.getElementById('wdTarget');
            const pingText = document.getElementById('wdLatency');
            const lossText = document.getElementById('wdLoss');
            const lang = translations[state.currentLang];
            
            if(statusText) {
                statusText.textContent = current.online ? 
                    (lang.wdStatusOnline || "ONLINE") : 
                    (lang.wdStatusOffline || "OFFLINE");
                statusText.style.color = current.online ? "#28a745" : "#dc3545";
            }
            if(targetText) targetText.textContent = current.target;
            if(pingText) pingText.textContent = current.latency ? `${current.latency} ms` : '-';
            if(lossText) lossText.textContent = `${current.loss}%`;
            
            renderSparkline(data.history);
        }
    } catch (e) { }
}

function renderSparkline(history) {
    const canvas = document.getElementById('wdChart');
    if(!canvas || canvas.offsetParent === null) return;

    const ctx = canvas.getContext('2d');
    const labels = history.map(h => h.time);
    const dataPoints = history.map(h => h.latency || 0);
    
    const isDark = !document.body.classList.contains('light-mode');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const tickColor = isDark ? '#888' : '#666';

    if (wdChart) {
        wdChart.data.labels = labels;
        wdChart.data.datasets[0].data = dataPoints;
        wdChart.options.scales.x.grid.color = gridColor;
        wdChart.options.scales.y.grid.color = gridColor;
        wdChart.options.scales.x.ticks.color = tickColor;
        wdChart.options.scales.y.ticks.color = tickColor;
        
        wdChart.update('none');
    } else {
        wdChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: dataPoints,
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)', 
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, 
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { 
                        enabled: true, 
                        mode: 'index',
                        intersect: false
                    } 
                },
                scales: { 
                    x: { 
                        display: true, 
                        grid: {
                            color: gridColor,
                            drawBorder: false,
                            display: false 
                        },
                        ticks: {
                            display: false 
                        }
                    }, 
                    y: { 
                        display: true, 
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: tickColor,
                            font: { size: 9 },
                            stepSize: 0.5 
                        },
                        suggestedMin: 0
                    } 
                }
            }
        });
    }
}