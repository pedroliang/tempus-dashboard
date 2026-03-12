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
let graficosDados = {}; // Armazena as séries cronogramadas

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
        renderDashGraf();
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

function px(valStr) {
    if(!valStr) return 0;
    let s = valStr.replace('R$', '').replace('%','').trim();
    // Se for negativo e.g "-R$ " 
    if(valStr.includes('-R$')) s = '-' + valStr.replace('-R$', '').replace('%','').trim();
    s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function processarDadosGraficos(rows) {
    graficosDados = {
        labels: [],
        fis_mes: [], fis_acum: [],
        med_mes: [], med_acum: [],
        fin_mes: [], fin_acum: [],
        des_mes: [], des_acum: []
    };

    for(let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // As linhas de dados contem o Mes e a Data na col 7 e 8
        if (row[7] && row[8] && row[7].includes('/202')) {
            graficosDados.labels.push(row[8]); // ex: 'abr./25'
            graficosDados.fis_mes.push(px(row[9]));
            graficosDados.fis_acum.push(px(row[10]));
            graficosDados.med_mes.push(px(row[11]));
            graficosDados.med_acum.push(px(row[12]));
            graficosDados.fin_mes.push(px(row[15]));
            graficosDados.fin_acum.push(px(row[16]));
            graficosDados.des_mes.push(px(row[17]));
            graficosDados.des_acum.push(px(row[18]));
        }
    }
}

function renderDashGraf() {
    renderChartPrincipal();
    renderChartSecundario();
}

function renderChartPrincipal() {
    const ctx = document.getElementById('chartPrincipal').getContext('2d');
    const tipo = document.getElementById('select-graf-principal').value;
    if (chartPrincipal) chartPrincipal.destroy();

    let config = { type: 'line', data: { labels: graficosDados.labels, datasets: [] }, options: getChartOptions() };

    if (tipo === 'curva-s') {
        config.data.datasets = [
            { label: 'FIS Acumulado (%)', data: graficosDados.fis_acum, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 },
            { label: 'MED Acumulado (%)', data: graficosDados.med_acum, borderColor: '#10b981', borderDash: [5, 5], tension: 0.4 }
        ];
    } else if (tipo === 'curva-s-dia') {
        config.type = 'bar';
        config.data.datasets = [
            { label: 'FIS Mensal (%)', data: graficosDados.fis_mes, backgroundColor: '#8b5cf6' }
        ];
    } else if (tipo === 'comparativo-mensal') {
        config.type = 'bar';
        config.data.datasets = [
            { label: 'FIN Mensal (R$)', data: graficosDados.fin_mes, backgroundColor: '#f43f5e' },
            { label: 'DES Mensal (R$)', data: graficosDados.des_mes, backgroundColor: '#f59e0b' }
        ];
    }

    chartPrincipal = new Chart(ctx, config);
}

function renderChartSecundario() {
    const ctx = document.getElementById('chartSecundario').getContext('2d');
    const tipo = document.getElementById('select-graf-secundario').value;
    if (chartSecundario) chartSecundario.destroy();

    let config = { type: 'bar', data: { labels: graficosDados.labels, datasets: [] }, options: getChartOptions() };

    if (tipo === 'histograma') {
        config.data.datasets = [
            { label: 'MED Mensal (%)', data: graficosDados.med_mes, backgroundColor: '#10b981' }
        ];
    } else if (tipo === 'histograma-acumulado') {
        config.type = 'line';
        config.data.datasets = [
            { label: 'MED Acum (%)', data: graficosDados.med_acum, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.2)', fill: true, tension: 0.4 }
        ];
    } else if (tipo === 'receita-saldo') {
        config.data.datasets = [
            { label: 'FIN Acum (R$)', data: graficosDados.fin_acum, backgroundColor: '#f43f5e' }
        ];
    } else if (tipo === 'distribuicao-recursos') {
        config.data.datasets = [
            { label: 'DES Mensal (R$)', data: graficosDados.des_mes, backgroundColor: '#f59e0b' }
        ];
    }

    chartSecundario = new Chart(ctx, config);
}

function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        elements: { point: { radius: 3, hoverRadius: 6 } },
        scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        plugins: { legend: { labels: { color: '#f8fafc', font: { family: 'Inter', size: 12 } } } }
    };
}

// Eventos de Dropdown
document.getElementById('select-graf-principal').addEventListener('change', renderChartPrincipal);
document.getElementById('select-graf-secundario').addEventListener('change', renderChartSecundario);

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
        if (dashGrafData.length > 0) renderDashGraf(); // Renderiza caso a aba seja aberta
    }
}

document.getElementById('link-info-obra').addEventListener('click', () => switchView('info-obra'));
document.getElementById('link-dash-graf').addEventListener('click', () => switchView('dash-graf'));

fetchData();
setInterval(fetchData, 60000);
