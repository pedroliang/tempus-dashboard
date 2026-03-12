const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID_INFO = '1077098301';
const GID_GRAF = '130998217'; // DASH DADOS

// Gviz supports CORS naturally and does not require third party proxy services
const INFO_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_INFO}`;
const GRAF_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_GRAF}&tq=select%20*`;

let sheetData = [];
let dashGrafData = [];
let currentView = 'info-obra';

// Referências Globais do Chart.js
let donutChart = null;
let chartPrincipal = null;
let chartSecundario = null;
let fullGraficosDados = {}; // Armazena todos os dados originais
let filteredGraficosDados = {}; // Armazena os dados filtrados para exibicao

async function fetchData() {
    try {
        const [resInfo, resGraf] = await Promise.all([
            fetch(INFO_URL),
            fetch(GRAF_URL)
        ]);
        const textInfo = await resInfo.text();
        const textGraf = await resGraf.text();
        
        sheetData = parseCSV(textInfo);
        dashGrafData = parseCSV(textGraf);
        
        renderDashboard(sheetData);
        processarDadosGraficos(dashGrafData);
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

    const findVal = (label) => {
        const target = label.toLowerCase().replace(/\s/g, '');
        for (const row of rows) {
            for (let c = 0; c < row.length - 1; c++) {
                if (row[c] && row[c].toLowerCase().replace(/\s/g, '').includes(target)) {
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

    const termVal = findTermometro();
    document.getElementById('termometro-container').innerHTML = `
        <div class="thermometer-value" style="color: ${termVal.includes('-') ? '#f43f5e' : '#10b981'};">
            ${termVal}
        </div>
    `;

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

function px(valStr) {
    if (valStr === undefined || valStr === null) return null;
    let s = valStr.toString().trim();
    if (s === '' || s === '--' || s === '0,00%' || s === 'R$ 0,00') return null;
    s = s.replace('R$', '').replace('%', '').replace(/\s/g, '');
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    const n = parseFloat(s);
    return (isNaN(n) || n === 0 && valStr.length === 0) ? null : n;
}

function processarDadosGraficos(rows) {
    fullGraficosDados = {
        labels: [],
        fis_mes: [], fis_acum: [],
        med_mes: [], med_acum: [],
        desvio_prog: [],
        fin_mes: [], fin_acum: [],
        des_mes: [], des_acum: [],
        saldo_mes: [], saldo_acum: [],
        custo_unit: [], custo_unit_acum: []
    };

    for(let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const label = row[8];
        const hasLabel = label && (label.includes('/') || label.includes('.'));
        const hasData = row[9] || row[15] || row[21];

        if (hasLabel && hasData) {
            fullGraficosDados.labels.push(label);
            fullGraficosDados.fis_mes.push(px(row[9]));
            fullGraficosDados.fis_acum.push(px(row[10]));
            fullGraficosDados.med_mes.push(px(row[11]));
            fullGraficosDados.med_acum.push(px(row[12]));
            fullGraficosDados.desvio_prog.push(px(row[14]));
            fullGraficosDados.fin_mes.push(px(row[15]));
            fullGraficosDados.fin_acum.push(px(row[16]));
            fullGraficosDados.des_mes.push(px(row[17]));
            fullGraficosDados.des_acum.push(px(row[18]));
            fullGraficosDados.saldo_mes.push(px(row[19]));
            fullGraficosDados.saldo_acum.push(px(row[20]));
            fullGraficosDados.custo_unit.push(px(row[21]));
            fullGraficosDados.custo_unit_acum.push(px(row[22]));
        }
    }
    popularFiltrosDatas();
    aplciarFiltroDatas();
}

function popularFiltrosDatas() {
    const selInicio = document.getElementById('select-data-inicio');
    const selFim = document.getElementById('select-data-fim');
    if (selInicio.options.length > 0) return;
    fullGraficosDados.labels.forEach((label, idx) => {
        selInicio.add(new Option(label, idx));
        selFim.add(new Option(label, idx));
    });
    selInicio.value = 0;
    selFim.value = fullGraficosDados.labels.length - 1;
}

function aplciarFiltroDatas() {
    const idxInicio = parseInt(document.getElementById('select-data-inicio').value);
    const idxFim = parseInt(document.getElementById('select-data-fim').value);
    if (idxInicio > idxFim) {
        alert("A data de início não pode ser posterior à data de fim.");
        document.getElementById('select-data-inicio').value = 0;
        aplciarFiltroDatas();
        return;
    }
    filteredGraficosDados = { labels: [] };
    Object.keys(fullGraficosDados).forEach(key => {
        filteredGraficosDados[key] = fullGraficosDados[key].slice(idxInicio, idxFim + 1);
    });
    renderDashGraf();
}

function renderDashGraf() {
    if (!filteredGraficosDados.labels || filteredGraficosDados.labels.length === 0) return;
    renderChartGeneric('chartPrincipal', 'select-graf-principal');
    renderChartGeneric('chartSecundario', 'select-graf-secundario');
}

function renderChartGeneric(canvasId, selectId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const tipo = document.getElementById(selectId).value;
    
    let chartRef = (canvasId === 'chartPrincipal') ? chartPrincipal : chartSecundario;
    if (chartRef) chartRef.destroy();

    let config = { 
        type: 'line', 
        data: { labels: filteredGraficosDados.labels, datasets: [] }, 
        options: getChartOptions(tipo) 
    };

    const commonLine = { tension: 0.4, spanGaps: false };

    switch(tipo) {
        case 'curva-s-fisica':
            config.data.datasets = [
                { label: 'FIS Acumulado (%)', data: filteredGraficosDados.fis_acum, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, ...commonLine },
                { label: 'MED Acumulado (%)', data: filteredGraficosDados.med_acum, borderColor: '#10b981', borderDash: [5, 5], ...commonLine }
            ];
            break;
        case 'histograma-fisico':
            config.type = 'bar';
            config.data.datasets = [
                { label: 'FIS Mensal (%)', data: filteredGraficosDados.fis_mes, backgroundColor: '#3b82f6' },
                { label: 'MED Mensal (%)', data: filteredGraficosDados.med_mes, backgroundColor: '#10b981' }
            ];
            break;
        case 'curva-s-financeira':
            config.data.datasets = [
                { label: 'FIN Acumulado (R$)', data: filteredGraficosDados.fin_acum, borderColor: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.1)', fill: true, ...commonLine },
                { label: 'DES Acumulado (R$)', data: filteredGraficosDados.des_acum, borderColor: '#f59e0b', borderDash: [5, 5], ...commonLine }
            ];
            break;
        case 'histograma-financeiro':
            config.type = 'bar';
            config.data.datasets = [
                { label: 'FIN Mensal (R$)', data: filteredGraficosDados.fin_mes, backgroundColor: '#f43f5e' },
                { label: 'DES Mensal (R$)', data: filteredGraficosDados.des_mes, backgroundColor: '#f59e0b' }
            ];
            break;
        case 'saldo-mensal':
            config.type = 'bar';
            config.data.datasets = [{ label: 'Saldo Mensal (R$)', data: filteredGraficosDados.saldo_mes, backgroundColor: '#10b981' }];
            break;
        case 'saldo-acumulado':
            config.data.datasets = [{ label: 'Saldo Acumulado (R$)', data: filteredGraficosDados.saldo_acum, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, ...commonLine }];
            break;
        case 'desvio-progresso':
            config.data.datasets = [{ label: 'Desvio Acumulado (%)', data: filteredGraficosDados.desvio_prog, borderColor: '#f43f5e', ...commonLine }];
            break;
        case 'custo-unitario':
            config.type = 'bar';
            config.data.datasets = [{ label: 'Custo Unitário (R$/m²)', data: filteredGraficosDados.custo_unit, backgroundColor: '#8b5cf6' }];
            break;
        case 'custo-unitario-acum':
            config.data.datasets = [{ label: 'Custo Unit. Acum. (R$/m²)', data: filteredGraficosDados.custo_unit_acum, borderColor: '#8b5cf6', ...commonLine }];
            break;
    }

    const newChart = new Chart(ctx, config);
    if (canvasId === 'chartPrincipal') chartPrincipal = newChart;
    else chartSecundario = newChart;
}

function getChartOptions(tipo) {
    const isCurrency = tipo.includes('financeiro') || tipo.includes('saldo') || tipo.includes('custo');
    const isPercent = tipo.includes('fisica') || tipo.includes('fisico') || tipo.includes('progresso');

    return {
        responsive: true,
        maintainAspectRatio: false,
        elements: { point: { radius: 3, hoverRadius: 6 } },
        scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { 
                ticks: { 
                    color: '#94a3b8',
                    callback: function(value) {
                        if (isCurrency) return 'R$ ' + value.toLocaleString('pt-BR');
                        if (isPercent) return value + '%';
                        return value;
                    }
                }, 
                grid: { color: 'rgba(255, 255, 255, 0.05)' } 
            }
        },
        plugins: { 
            legend: { labels: { color: '#f8fafc', font: { family: 'Inter', size: 12 } } },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (isCurrency) label += 'R$ ' + context.parsed.y.toLocaleString('pt-BR');
                        else if (isPercent) label += context.parsed.y + '%';
                        else label += context.parsed.y;
                        return label;
                    }
                }
            }
        }
    };
}

// Eventos de Dropdown
document.getElementById('select-graf-principal').addEventListener('change', () => renderChartGeneric('chartPrincipal', 'select-graf-principal'));
document.getElementById('select-graf-secundario').addEventListener('change', () => renderChartGeneric('chartSecundario', 'select-graf-secundario'));

// Eventos de Filtro de Data
document.getElementById('select-data-inicio').addEventListener('change', aplciarFiltroDatas);
document.getElementById('select-data-fim').addEventListener('change', aplciarFiltroDatas);
document.getElementById('btn-reset-filter').addEventListener('click', () => {
    document.getElementById('select-data-inicio').value = 0;
    document.getElementById('select-data-fim').value = fullGraficosDados.labels.length - 1;
    aplciarFiltroDatas();
});

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
        if (fullGraficosDados.labels && fullGraficosDados.labels.length > 0) renderDashGraf(); 
    }
}

document.getElementById('link-info-obra').addEventListener('click', () => switchView('info-obra'));
document.getElementById('link-dash-graf').addEventListener('click', () => switchView('dash-graf'));

fetchData();
setInterval(fetchData, 60000);
