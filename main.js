const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const RAW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const SHEET_URL = `https://api.allorigins.win/get?url=${encodeURIComponent(RAW_URL)}`;

let charts = {};
let donutChart = null;
let sheetData = [];
let currentView = 'info-obra';

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const json = await response.json();
        sheetData = parseCSV(json.contents);
        renderDashboard(sheetData);
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
    }
}

function parseCSV(text) {
    const rows = [];
    let curRow = [];
    let curField = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i+1] === '"') { curField += '"'; i++; }
            else if (c === '"') inQuotes = false;
            else curField += c;
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ',') { curRow.push(curField.trim()); curField = ''; }
            else if (c === '\n' || c === '\r') {
                if (curField || curRow.length) {
                    curRow.push(curField.trim());
                    rows.push(curRow);
                    curRow = [];
                    curField = '';
                    if (c === '\r' && text[i+1] === '\n') i++;
                }
            } else curField += c;
        }
    }
    if (curField || curRow.length) { curRow.push(curField.trim()); rows.push(curRow); }
    return rows;
}

function renderDashboard(rows) {
    if (!rows || rows.length === 0) return;

    // Busca hiper-dinâmica com limite de coluna
    const findVal = (label) => {
        const target = label.toLowerCase().replace(/\s/g, '');
        for (const row of rows) {
            for (let c = 0; c < row.length - 1; c++) {
                if (row[c] && row[c].toLowerCase().replace(/\s/g, '').includes(target)) {
                    // Para Padrão, Zoneamento, Tipologia (coluna 1 original)
                    // Pega estritamente a próxima coluna válida (não mais que 2 de distância para evitar pegar a direita)
                    if (row[c+1] && row[c+1].trim() !== '') return row[c+1].trim();
                    if (row[c+2] && row[c+2].trim() !== '' && c+2 < 4) return row[c+2].trim();
                    if (row[c+3] && row[c+3].trim() !== '' && c+3 < 4) return row[c+3].trim();
                }
            }
        }
        return '--';
    };

    const findTermometro = () => {
        for (const row of rows) {
            for (let c = 0; c < row.length; c++) {
                if (row[c] && row[c].includes('Unidades')) {
                    for (let j = row.length - 1; j > c; j--) {
                        if (row[j] && row[j].includes('R$')) return row[j].trim();
                    }
                }
            }
        }
        return '--';
    };

    // --- TABELA PRINCIPAL (ESQUERDA) ---
    const tableEl = document.getElementById('info-obra-table');
    const tableData = [
        { label: 'Custo Total da Obra (CTO)', val: findVal('Custo Total da Obra'), class: 'row-cost' },
        { label: 'Custo Total da Área Privativa (CTAP)', val: findVal('Total da Área Privativa'), class: 'row-cost' },
        { label: 'Custo Total da Área Não Privativa (CTANP)', val: findVal('Total da Área Não Privativa'), class: 'row-cost' },
        { label: 'Padrão', val: findVal('Padrão'), class: 'row-metric' },
        { label: 'Zoneamento', val: findVal('Zoneamento'), class: 'row-metric' },
        { label: 'Tipologia', val: findVal('Tipologia'), class: 'row-metric' },
        { label: 'Número de Pavimentos Tipo', val: findVal('Pavimentos Tipo'), class: 'row-metric' },
        { label: 'Outros Pavimentos', val: findVal('Outros Pavimentos'), class: 'row-metric' },
        { label: 'Unidades', val: findVal('Unidades'), class: 'row-metric' },
        { label: 'Área do Terreno (m²)', val: findVal('Área do Terreno'), class: 'row-area' },
        { label: 'Área construída total (ACT) (m²)', val: findVal('ACT'), class: 'row-area' },
        { label: 'Área Privativa Total (APT) (m²)', val: findVal('Privativa Total (APT)'), class: 'row-area' },
        { label: 'Área Não Privativa Total (ANPT) (m²)', val: findVal('Não Privativa Total (ANPT)'), class: 'row-area' },
        { label: 'Taxa de APT/ACT', val: findVal('Taxa de APT'), class: 'row-area' },
        { label: 'CTO / ACT ( /m²)', val: findVal('CTO / ACT'), class: 'row-metric' },
        { label: 'CTO / APT ( /m²)', val: findVal('CTO / APT'), class: 'row-metric' },
        { label: 'CTAP / APT ( /m²)', val: findVal('CTAP / APT'), class: 'row-metric' },
    ];
    tableEl.innerHTML = tableData.map(row => `
        <tr class="${row.class}">
            <td>${row.label}</td>
            <td>${row.val}</td>
        </tr>
    `).join('');

    // --- PRAZOS (DIREITA) ---
    const prazosContainer = document.getElementById('prazos-container');
    const prazos = [
        { label: 'Início', val: findVal('Início'), class: '' },
        { label: 'Fim', val: findVal('Fim'), class: '' },
        { label: 'Fim Plan', val: findVal('Fim Plan'), class: '' },
        { label: 'Atraso', val: findVal('Atraso'), class: 'danger' },
        { label: 'Previsão', val: findVal('Previsão'), class: 'info' },
    ];
    prazosContainer.innerHTML = prazos.map(p => `
        <div class="schedule-card ${p.class}">
            <span class="schedule-label">${p.label}</span>
            <span class="schedule-value">${p.val}</span>
        </div>
    `).join('');

    // --- TERMÔMETRO ---
    const termVal = findTermometro();
    document.getElementById('termometro-container').innerHTML = `
        <div class="thermometer-value" style="color: ${termVal.includes('-') ? '#f43f5e' : '#10b981'};">
            ${termVal}
        </div>
    `;

    // --- SERVIÇOS (DONUT) ---
    const getStatusServicos = () => {
        let foundSection = false;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cell4 = row[4] ? row[4].toLowerCase().replace(/\s/g, '') : '';
            if (cell4.includes('serviçosdeobra')) foundSection = true;
            if (foundSection && cell4 === 'status') return [row[5] || '--', rows[i+1]?.[5] || '--'];
        }
        return ['--', '--'];
    };
    const [statusServ, pendServ] = getStatusServicos();
    const statusVal = parseFloat(statusServ.replace('%','').replace(',','.'));
    renderDonutChart(isNaN(statusVal) ? 0 : statusVal);
    document.getElementById('servicos-legend').innerHTML = `
        <div class="legend-item"><span class="legend-label">Status Concluído</span><span class="legend-value highlight">${statusServ}</span></div>
        <div class="legend-item"><span class="legend-label">Pendente</span><span class="legend-value">${pendServ}</span></div>
    `;

    // --- CAMINHO CRÍTICO ---
    const getStatusCritico = () => {
        let foundSection = false;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cell4 = row[4] ? row[4].toLowerCase().replace(/\s/g, '') : '';
            if (cell4.includes('caminhocrítico')) foundSection = true;
            if (foundSection && cell4 === 'status') return [row[5] || '--', rows[i+1]?.[5] || '--'];
        }
        return ['--', '--'];
    };
    const [criticoProg, criticoPend] = getStatusCritico();
    const progVal = parseFloat(criticoProg.replace('%','').replace(',','.'));
    document.getElementById('caminho-critico-container').innerHTML = `
        <div class="progress-item">
            <div class="progress-header">
                <span class="progress-label">PROGRESSO ATUAL</span>
                <span class="progress-value highlight">${criticoProg}</span>
            </div>
            <div class="progress-track"><div class="progress-fill highlight-fill" style="width: ${isNaN(progVal) ? 0 : progVal}%"></div></div>
        </div>
        <div class="legend-item" style="margin-top:1rem;">
            <span class="legend-label">ATIVIDADES PENDENTES</span>
            <span class="legend-value">${criticoPend}</span>
        </div>
    `;
}

function renderDonutChart(percent) {
    const ctx = document.getElementById('donut-servicos').getContext('2d');
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [percent, 100 - percent],
                backgroundColor: ['#f59e0b', 'rgba(255, 255, 255, 0.05)'],
                borderWidth: 0
            }]
        },
        options: { cutout: '75%', responsive: true, maintainAspectRatio: false, plugins: { tooltip: { enabled: false }, legend: { display: false } } }
    });
}

function switchView(viewId) {
    currentView = viewId;
    document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    if (viewId === 'info-obra') {
        document.getElementById('view-info-obra').style.display = 'block';
        document.getElementById('link-info-obra').classList.add('active');
    } else {
        document.getElementById('view-dash-graf').style.display = 'block';
        document.getElementById('link-dash-graf').classList.add('active');
        updateComparisonCharts();
    }
}

function updateComparisonCharts() {
    renderComparison('chart-canvas-1', document.getElementById('chart-select-1').value, 1);
    renderComparison('chart-canvas-2', document.getElementById('chart-select-2').value, 2);
}

function renderComparison(canvasId, type, slot) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (charts[slot]) charts[slot].destroy();
    charts[slot] = new Chart(ctx, {
        type: type === 'curva-s' ? 'line' : 'bar',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: type === 'curva-s' ? 'Progresso' : 'Recursos',
                data: [10, 30, 50, 45, 70, 90],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } } }
    });
}

document.getElementById('link-info-obra').addEventListener('click', () => switchView('info-obra'));
document.getElementById('link-dash-graf').addEventListener('click', () => switchView('dash-graf'));
fetchData();
setInterval(fetchData, 60000);
