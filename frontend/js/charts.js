import { state } from './state.js';
import { translations } from './i18n.js';
import { parseISOLocally, convertValue, getUnitLabel } from './utils.js';

let downloadChart, uploadChart, pingChart, jitterChart;

export function renderCharts(results) {
    const downloadCtx = document.getElementById('downloadChart').getContext('2d');
    const uploadCtx = document.getElementById('uploadChart').getContext('2d');
    const pingCtx = document.getElementById('pingChart').getContext('2d');
    const jitterCtx = document.getElementById('jitterChart').getContext('2d');

    const chartResults = results.slice().reverse();
    const labels = chartResults.map(res => parseISOLocally(res.timestamp).toLocaleString(state.currentLang)); 
    const downloadData = chartResults.map(res => convertValue(res.download, state.currentUnit));
    const uploadData = chartResults.map(res => convertValue(res.upload, state.currentUnit));
    const pingData = chartResults.map(res => res.ping);
    const jitterData = chartResults.map(res => res.jitter);

    const unitLabel = getUnitLabel(state.currentUnit);
    
    const isDark = !document.body.classList.contains('light-mode');
    
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const labelColor = isDark ? '#999' : '#666';
    const style = getComputedStyle(document.body);
    const lang = translations[state.currentLang];
    
    document.querySelector('#downloadChart').closest('.chart-block').querySelector('h3').textContent = `${lang.downloadChartTitle.split('(')[0].trim()} (${unitLabel})`;
    document.querySelector('#uploadChart').closest('.chart-block').querySelector('h3').textContent = `${lang.uploadChartTitle.split('(')[0].trim()} (${unitLabel})`;
    document.querySelector('#pingChart').closest('.chart-block').querySelector('h3').textContent = `${lang.pingChartTitle.split('(')[0].trim()} (${lang.chartUnitMs})`;
    document.querySelector('#jitterChart').closest('.chart-block').querySelector('h3').textContent = `${lang.jitterChartTitle.split('(')[0].trim()} (${lang.chartUnitMs})`;

    createAreaChart(downloadCtx, downloadChart, (chart) => { downloadChart = chart; }, labels, downloadData, chartResults, lang.chartLabelDownload, unitLabel, style.getPropertyValue('--color-download'), style.getPropertyValue('--color-download-bg'), gridColor, labelColor);
    createAreaChart(uploadCtx, uploadChart, (chart) => { uploadChart = chart; }, labels, uploadData, chartResults, lang.chartLabelUpload, unitLabel, style.getPropertyValue('--color-upload'), style.getPropertyValue('--color-upload-bg'), gridColor, labelColor);
    createAreaChart(pingCtx, pingChart, (chart) => { pingChart = chart; }, labels, pingData, chartResults, lang.chartLabelPing, lang.chartUnitMs, style.getPropertyValue('--color-ping'), style.getPropertyValue('--color-ping-bg'), gridColor, labelColor);
    createAreaChart(jitterCtx, jitterChart, (chart) => { jitterChart = chart; }, labels, jitterData, chartResults, lang.chartLabelJitter, lang.chartUnitMs, style.getPropertyValue('--color-jitter'), style.getPropertyValue('--color-jitter-bg'), gridColor, labelColor);
}

function createAreaChart(ctx, chartInstance, setChartInstance, labels, data, serverData, label, unit, color, bgColor, gridColor, labelColor) {
    if (chartInstance) chartInstance.destroy(); 
    
    // FIX: Resetowanie canvasa w sposób bezpieczny dla flexboxa
    ctx.canvas.removeAttribute('style');
    ctx.canvas.removeAttribute('width');
    ctx.canvas.removeAttribute('height');
    
    // Styl nadawany przez CSS components.css (width: 100%, height: 100%)

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
                cubicInterpolationMode: 'monotone', 
                pointRadius: 3, 
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                spanGaps: true,
                normalized: true
            }]
        },
        options: {
            responsive: true, 
            // ZMIANA: Ważne - maintainAspectRatio: false pozwala na dopasowanie do kontenera (który ma max-height)
            maintainAspectRatio: false, 
            animation: {}, 
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
                            lbl = lbl.replace(/\s*\(.*?\)/, ''); 
                            
                            if (lbl) lbl += ': ';
                            if (context.parsed.y !== null) lbl += `${context.parsed.y.toFixed(2)} ${unit}`; 
                            return lbl;
                        },
                        footer: (tooltipItems) => {
                            const dataIndex = tooltipItems[0].dataIndex;
                            const result = serverData[dataIndex];
                            if (result && result.server_name) {
                                const serverLabel = translations[state.currentLang].tooltipServer || 'Serwer';
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