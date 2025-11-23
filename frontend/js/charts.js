import { state } from './state.js';
import { translations } from './i18n.js';
import { parseISOLocally, convertValue, getUnitLabel, hexToRgba } from './utils.js';

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
    
    // Subtelniejsza siatka
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#888' : '#777';
    
    const style = getComputedStyle(document.body);
    const lang = translations[state.currentLang];
    
    // Helper do pobierania koloru (fallback do HEX jeśli CSS var nie zadziała)
    const getColor = (varName, fallback) => style.getPropertyValue(varName).trim() || fallback;

    // Kolory podstawowe
    const cDl = getColor('--color-download', '#4fc3f7');
    const cUl = getColor('--color-upload', '#e57373');
    const cPi = getColor('--color-ping', '#ffd54f');
    const cJi = getColor('--color-jitter', '#81c784');

    // Aktualizacja nagłówków
    document.querySelector('#downloadChart').closest('.chart-block').querySelector('h3').textContent = `${lang.downloadChartTitle.split('(')[0].trim()} (${unitLabel})`;
    document.querySelector('#uploadChart').closest('.chart-block').querySelector('h3').textContent = `${lang.uploadChartTitle.split('(')[0].trim()} (${unitLabel})`;
    document.querySelector('#pingChart').closest('.chart-block').querySelector('h3').textContent = `${lang.pingChartTitle.split('(')[0].trim()} (${lang.chartUnitMs})`;
    document.querySelector('#jitterChart').closest('.chart-block').querySelector('h3').textContent = `${lang.jitterChartTitle.split('(')[0].trim()} (${lang.chartUnitMs})`;

    // Tworzenie wykresów z użyciem nowej funkcji wspierającej gradienty
    createAreaChart(downloadCtx, downloadChart, (chart) => { downloadChart = chart; }, labels, downloadData, chartResults, lang.chartLabelDownload, unitLabel, cDl, gridColor, labelColor);
    createAreaChart(uploadCtx, uploadChart, (chart) => { uploadChart = chart; }, labels, uploadData, chartResults, lang.chartLabelUpload, unitLabel, cUl, gridColor, labelColor);
    createAreaChart(pingCtx, pingChart, (chart) => { pingChart = chart; }, labels, pingData, chartResults, lang.chartLabelPing, lang.chartUnitMs, cPi, gridColor, labelColor);
    createAreaChart(jitterCtx, jitterChart, (chart) => { jitterChart = chart; }, labels, jitterData, chartResults, lang.chartLabelJitter, lang.chartUnitMs, cJi, gridColor, labelColor);
}

function createAreaChart(ctx, chartInstance, setChartInstance, labels, data, serverData, label, unit, color, gridColor, labelColor) {
    if (chartInstance) chartInstance.destroy(); 
    
    ctx.canvas.removeAttribute('style');
    ctx.canvas.removeAttribute('width');
    ctx.canvas.removeAttribute('height');
    
    // ZMIANA: Tworzenie gradientu dla tła wykresu (efekt speedtest-tracker)
    // Gradient idzie od góry (większe krycie) do dołu (prawie przezroczysty)
    const gradient = ctx.createLinearGradient(0, 0, 0, 350); // 350px to orientacyjna wysokość
    gradient.addColorStop(0, hexToRgba(color, 0.4));  // Góra: 40% krycia
    gradient.addColorStop(0.5, hexToRgba(color, 0.1)); // Środek: 10% krycia
    gradient.addColorStop(1, hexToRgba(color, 0.0));   // Dół: 0% krycia

    const newChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: labels,
            datasets: [{
                label: `${label} (${unit})`, 
                data: data,
                borderColor: color,
                borderWidth: 2,
                backgroundColor: gradient, // Użycie gradientu zamiast jednolitego koloru
                fill: 'start',
                
                // ZMIANA: Wrócono do domyślnej interpolacji, ale ze zmniejszonym tension (0.35).
                // 0.4 potrafi robić pętle przy dużych spadkach. 0.35 jest bezpieczniejsze a wciąż gładkie.
                tension: 0.35, 
                cubicInterpolationMode: 'default',
                
                borderJoinStyle: 'round',
                borderCapStyle: 'round',
                
                pointRadius: 0, 
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                
                spanGaps: true
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { duration: 0 }, 
            layout: {
                padding: { top: 10, left: 0, right: 0, bottom: 0 } // Lekki odstęp od góry, żeby nie ucinało tooltipów/punktów
            },
            interaction: { 
                // ZMIANA: 'nearest' z osią 'x' jest bardziej intuicyjne dla wykresów czasowych
                mode: 'nearest', 
                axis: 'x',
                intersect: false,
            },
            scales: {
                y: { 
                    type: 'linear', 
                    position: 'left', 
                    beginAtZero: true,
                    title: { display: false }, 
                    ticks: { 
                        color: labelColor,
                        font: { size: 11 },
                        maxTicksLimit: 6,
                        callback: function(value) {
                            // Ładne formatowanie dużych liczb
                            if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
                            return value;
                        }
                    }, 
                    grid: { 
                        color: gridColor,
                        borderDash: [3, 3], 
                        drawBorder: false
                    } 
                },
                x: { 
                    ticks: { 
                        color: labelColor,
                        maxRotation: 0,
                        maxTicksLimit: 8,
                        autoSkip: true,
                        font: { size: 11 }
                    }, 
                    grid: { 
                        display: false, 
                        drawBorder: false
                    } 
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    mode: 'index', 
                    intersect: false,
                    backgroundColor: 'rgba(28, 28, 30, 0.95)',
                    titleColor: '#ffffff', 
                    bodyColor: '#e0e0e0', 
                    footerColor: '#a0a0a0',
                    borderColor: 'rgba(255, 255, 255, 0.1)', 
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: true,
                    boxPadding: 4,
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
                                return `${serverLabel}: (${result.server_id}) ${result.server_name}\n${result.server_location}`;
                            }
                            return null;
                        },
                    }
                }
            }
        }
    });
    setChartInstance(newChart); 
}