const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID_INFO = '1077098301';
// DASH DADOS
const GID_GRAF = '130998217';
// Cron MED (dados do Gantt)
const GID_CRON_MED = '1684801435';
// Cron DIN (dados do Gantt Dinâmico)
const GID_CRON_DIN = '1594302258';

// Gviz supports CORS naturally and does not require third party proxy services
const INFO_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_INFO}`;
const GRAF_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_GRAF}&tq=select%20*`;
const CRON_MED_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_CRON_MED}&tq=select%20*`;
const CRON_DIN_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_CRON_DIN}&tq=select%20*`;
// Aba MED
const GID_MED = '2090482851';
// Usa ranges exatos para MED 1 (C8:ND33) e MED 2 (C38:ND64)
const MED1_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_MED}&range=C8:ND34`;
const MED2_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_MED}&range=C38:ND65`;

let sheetData = [];
let dashGrafData = [];
let cronMedData = [];
let cronDinData = [];
let ganttRendered = false;
let ganttDinRendered = false;
let med1Data = [];
let med2Data = [];
let medCurrentTab = 1;
let currentView = 'info-obra';
let medSearchCode = null; // Armazena o código sendo buscado no MED

// Referências Globais do Chart.js
let chartPrincipal = null;
let chartSecundario = null;
let fullGraficosDados = {}; // Armazena todos os dados originais
let filteredGraficosDados = {}; // Armazena os dados filtrados para exibicao

async function fetchData() {
    console.log("Iniciando fetchData...");
    try {
        console.log("Buscando dados das URLs...");
        const [resInfo, resGraf, resCronMed, resCronDin, resMed1, resMed2] = await Promise.all([
            fetch(INFO_URL),
            fetch(GRAF_URL),
            fetch(CRON_MED_URL),
            fetch(CRON_DIN_URL),
            fetch(MED1_URL),
            fetch(MED2_URL)
        ]);
        const textInfo = await resInfo.text();
        const textGraf = await resGraf.text();
        const textCronMed = await resCronMed.text();
        const textCronDin = await resCronDin.text();
        const textMed1 = await resMed1.text();
        const textMed2 = await resMed2.text();
        
        sheetData = parseCSV(textInfo);
        dashGrafData = parseCSV(textGraf);
        cronMedData = parseCSV(textCronMed);
        cronDinData = parseCSV(textCronDin);
        med1Data = parseCSV(textMed1);
        med2Data = parseCSV(textMed2);
        
        renderDashboard(sheetData);
        processarDadosGraficos(dashGrafData);
        // Renderiza os Gantts se os dados foram carregados
        if (cronMedData.length > 0) renderGanttChart(cronMedData, 'gantt-chart-container');
        if (cronDinData.length > 0) renderGanttChart(cronDinData, 'gantt-din-chart-container');
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
    document.getElementById('servicos-obra-container').innerHTML = `
        <div class="progress-item">
            <div class="progress-header">
                <span class="progress-label">PROGRESSO ATUAL</span>
                <span class="progress-value highlight">${statusServ}</span>
            </div>
            <div class="progress-track"><div class="progress-fill highlight-fill" style="width: ${isNaN(statusVal) ? 0 : statusVal}%"></div></div>
        </div>
        <div class="legend-item" style="margin-top:1rem;">
            <span class="legend-label">ATIVIDADES PENDENTES</span>
            <span class="legend-value danger">${pendServ}</span>
        </div>
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
            <span class="legend-value danger">${criticoPend}</span>
        </div>
    `;
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
    aplicarFiltroDatas();
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

function aplicarFiltroDatas() {
    const idxInicio = parseInt(document.getElementById('select-data-inicio').value);
    const idxFim = parseInt(document.getElementById('select-data-fim').value);
    if (idxInicio > idxFim) {
        alert("A data de início não pode ser posterior à data de fim.");
        document.getElementById('select-data-inicio').value = 0;
        aplicarFiltroDatas();
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
document.getElementById('select-data-inicio').addEventListener('change', aplicarFiltroDatas);
document.getElementById('select-data-fim').addEventListener('change', aplicarFiltroDatas);
document.getElementById('btn-reset-filter').addEventListener('click', () => {
    document.getElementById('select-data-inicio').value = 0;
    document.getElementById('select-data-fim').value = fullGraficosDados.labels.length - 1;
    aplicarFiltroDatas();
});

function switchView(viewId, title) {
    console.log("Chamando switchView:", viewId, title);
    currentView = viewId;
    // Atualiza o título central com o nome do menu clicado
    const headerEl = document.querySelector('.dashboard-header h1');
    if (headerEl && title) {
        headerEl.textContent = title;
    }
    document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    if (viewId === 'info-obra') {
        document.getElementById('view-info-obra').style.display = 'block';
        document.getElementById('link-info-obra').classList.add('active');
    } else if (viewId === 'dash-graf') {
        document.getElementById('view-dash-graf').style.display = 'block';
        document.getElementById('link-dash-graf').classList.add('active');
        if (fullGraficosDados.labels && fullGraficosDados.labels.length > 0) renderDashGraf(); 
    } else if (viewId === 'gantt-cron-med') {
        document.getElementById('view-gantt-cron-med').style.display = 'block';
        if (cronMedData.length > 0 && !ganttRendered) renderGanttChart(cronMedData, 'gantt-chart-container');
    } else if (viewId === 'gantt-cron-din') {
        document.getElementById('view-gantt-cron-din').style.display = 'block';
        if (cronDinData.length > 0 && !ganttDinRendered) renderGanttChart(cronDinData, 'gantt-din-chart-container');
    } else if (viewId === 'med') {
        document.getElementById('view-med').style.display = 'block';
        const data = (medCurrentTab === 1) ? med1Data : med2Data;
        if (data.length > 0) renderMedTable(data);
    }
}

// Adiciona event listeners a TODOS os links do menu
console.log("Anexando event listeners aos nav-links...");
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        console.log("Clique detectado em:", link.textContent.trim());
        e.preventDefault();
        const title = link.textContent.trim();
        // Marca todos como inativos e ativa o clicado
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        if (link.id === 'link-info-obra') {
            switchView('info-obra', title);
        } else if (link.id === 'link-dash-graf') {
            switchView('dash-graf', title);
        } else if (title === 'GANTT CRON MED') {
            switchView('gantt-cron-med', title);
        } else if (title === 'GANTT CRON DIN') {
            switchView('gantt-cron-din', title);
        } else if (title === 'MED') {
            switchView('med', title);
        } else {
            // Para os outros menus, atualiza o título e esconde as views existentes
            document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
            const headerEl = document.querySelector('.dashboard-header h1');
            if (headerEl) headerEl.textContent = title;
        }
    });
});

// ========== GANTT CHART ==========
function parseDate(dateStr) {
    // Formato DD/MM/YY ou DD/MM/YYYY
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    let day = parseInt(parts[0]);
    let month = parseInt(parts[1]) - 1;
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
}

function renderGanttChart(rows, containerId) {
    containerId = containerId || 'gantt-chart-container';
    // Parseia atividades do CSV: col 4 = Serviço, col 6 = Data Início, col 7 = Data Fim
    const atividades = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const nome = row[4] ? row[4].trim() : '';
        const dataInicioStr = row[6] ? row[6].trim() : '';
        const dataFimStr = row[7] ? row[7].trim() : '';
        const duracao = row[8] ? row[8].trim() : '';
        
        if (!nome || !dataInicioStr || !dataFimStr) continue;
        
        const dataInicio = parseDate(dataInicioStr);
        const dataFim = parseDate(dataFimStr);
        
        if (!dataInicio || !dataFim) continue;
        
        atividades.push({
            nome: nome,
            inicio: dataInicio,
            fim: dataFim,
            inicioStr: dataInicioStr,
            fimStr: dataFimStr,
            duracao: duracao
        });
    }
    
    if (atividades.length === 0) {
        document.getElementById(containerId).innerHTML = '<div class="gantt-loading">Nenhuma atividade encontrada.</div>';
        return;
    }
    
    // Ordena por data de início
    atividades.sort((a, b) => a.inicio - b.inicio);
    
    // Encontra range total de datas
    let minDate = new Date(atividades[0].inicio);
    let maxDate = new Date(atividades[0].fim);
    atividades.forEach(a => {
        if (a.inicio < minDate) minDate = new Date(a.inicio);
        if (a.fim > maxDate) maxDate = new Date(a.fim);
    });
    
    // Expande para meses completos
    minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
    
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Gera lista de meses
    const meses = [];
    let cur = new Date(minDate);
    while (cur <= maxDate) {
        const mesInicio = new Date(cur);
        const mesFim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
        const diasNoMes = mesFim.getDate();
        const mesesNomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        meses.push({
            label: `${mesesNomes[cur.getMonth()]}/${String(cur.getFullYear()).slice(2)}`,
            dias: diasNoMes,
            widthPercent: (diasNoMes / totalDays) * 100
        });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    
    // Constrói HTML do Gantt
    const container = document.getElementById(containerId);
    
    // ID único do tooltip para cada container
    const tooltipId = 'tooltip-' + containerId;
    let html = '<div class="gantt-wrapper">';
    
    // Cabeçalho
    html += '<div class="gantt-label-header">Serviços</div>';
    html += '<div class="gantt-timeline-header">';
    meses.forEach(m => {
        html += `<div class="gantt-month-label" style="width:${m.widthPercent}%">${m.label}</div>`;
    });
    html += '</div>';
    
    // Linhas de atividades
    atividades.forEach((a, idx) => {
        const startOffset = (a.inicio - minDate) / (1000 * 60 * 60 * 24);
        const duration = Math.max(1, (a.fim - a.inicio) / (1000 * 60 * 60 * 24) + 1);
        const leftPercent = (startOffset / totalDays) * 100;
        const widthPercent = (duration / totalDays) * 100;
        
        html += '<div class="gantt-row">';
        html += `<div class="gantt-label" title="${a.nome}">${a.nome}</div>`;
        html += `<div class="gantt-bar-container">`;
        html += `<div class="gantt-bar" style="left:${leftPercent}%;width:${widthPercent}%" 
            data-nome="${a.nome.replace(/"/g, '&quot;')}" 
            data-inicio="${a.inicioStr}" 
            data-fim="${a.fimStr}" 
            data-duracao="${a.duracao} dias"></div>`;
        html += '</div>';
        html += '</div>';
    });
    
    html += '</div>';
    
    // Tooltip global
    html += `<div class="gantt-tooltip" id="${tooltipId}"></div>`;
    
    container.innerHTML = html;
    // Marca como renderizado
    if (containerId === 'gantt-chart-container') ganttRendered = true;
    if (containerId === 'gantt-din-chart-container') ganttDinRendered = true;
    
    // Configura tooltips apenas para as barras deste container
    const tooltip = document.getElementById(tooltipId);
    container.querySelectorAll('.gantt-bar').forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
            const nome = bar.dataset.nome;
            const inicio = bar.dataset.inicio;
            const fim = bar.dataset.fim;
            const duracao = bar.dataset.duracao;
            tooltip.innerHTML = `
                <div class="tt-title">${nome}</div>
                <div class="tt-detail">Início: ${inicio}</div>
                <div class="tt-detail">Fim: ${fim}</div>
                <div class="tt-detail">Duração: ${duracao}</div>
            `;
            tooltip.style.display = 'block';
        });
        bar.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY - 10) + 'px';
        });
        bar.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}

// ========== MED TABLE ==========
// Mapa de cores NEON por nome de serviço - tema escuro moderno
// bgSolid = cor opaca (blend de bg rgba com fundo #0f172a) para coluna sticky
const MED_ROW_COLORS = {
    'telhado': { bg: 'rgba(56, 189, 248, 0.18)', bgSolid: '#16354f', text: '#38bdf8', dataText: '#7dd3fc' },
    'telhado técnico': { bg: 'rgba(56, 189, 248, 0.18)', bgSolid: '#16354f', text: '#38bdf8', dataText: '#7dd3fc' },
    'pavto 4 cobertura comum': { bg: 'rgba(167, 139, 250, 0.18)', bgSolid: '#231e54', text: '#a78bfa', dataText: '#c4b5fd' },
    'pavto 4 cobertura privativo': { bg: 'rgba(167, 139, 250, 0.18)', bgSolid: '#231e54', text: '#a78bfa', dataText: '#c4b5fd' },
    'pavto 3 cobertura comum': { bg: 'rgba(148, 163, 184, 0.15)', bgSolid: '#1e2840', text: '#94a3b8', dataText: '#cbd5e1' },
    'pavto 3 cobertura privativo': { bg: 'rgba(148, 163, 184, 0.15)', bgSolid: '#1e2840', text: '#94a3b8', dataText: '#cbd5e1' },
    'pavto 2 comum': { bg: 'rgba(250, 204, 21, 0.15)', bgSolid: '#2c2e2d', text: '#facc15', dataText: '#fde68a' },
    'pavto 2 privativo': { bg: 'rgba(250, 204, 21, 0.15)', bgSolid: '#2c2e2d', text: '#facc15', dataText: '#fde68a' },
    'pavto 1/térreo comum': { bg: 'rgba(74, 222, 128, 0.15)', bgSolid: '#152e35', text: '#4ade80', dataText: '#86efac' },
    'pavto 1/térreo privativo': { bg: 'rgba(74, 222, 128, 0.15)', bgSolid: '#152e35', text: '#4ade80', dataText: '#86efac' },
    'puc': { bg: 'rgba(251, 146, 60, 0.18)', bgSolid: '#321f2d', text: '#fb923c', dataText: '#fdba74' },
    'garagem': { bg: 'rgba(96, 165, 250, 0.15)', bgSolid: '#162a4e', text: '#60a5fa', dataText: '#93c5fd' },
    'garagem vagas': { bg: 'rgba(96, 165, 250, 0.15)', bgSolid: '#162a4e', text: '#60a5fa', dataText: '#93c5fd' },
    'térreo comum': { bg: 'rgba(129, 140, 248, 0.15)', bgSolid: '#1c2050', text: '#818cf8', dataText: '#a5b4fc' },
    'térreo vagas': { bg: 'rgba(129, 140, 248, 0.15)', bgSolid: '#1c2050', text: '#818cf8', dataText: '#a5b4fc' },
    'total': { bg: 'rgba(99, 102, 241, 0.3)', bgSolid: '#222460', text: '#c7d2fe', dataText: '#e0e7ff' },
};

function getMedRowColor(cellValue) {
    if (!cellValue) return null;
    const key = cellValue.trim().toLowerCase();
    // Busca correspondência exata primeiro
    if (MED_ROW_COLORS[key]) return MED_ROW_COLORS[key];
    // Busca parcial
    for (const [k, v] of Object.entries(MED_ROW_COLORS)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
}

// Coluna ND em 0-indexed = 367 (N=14, D=4 => (14-1)*26 + 4 - 1 = 367)

function renderMedTable(tableRows) {

    if (!tableRows || tableRows.length === 0) return '<p style="color:white;padding:20px">Nenhum dado disponível.</p>';

    let maxCol = 0;
    tableRows.forEach(row => { if (row.length > maxCol) maxCol = row.length - 1; });

    const cleanMedText = (s) => {
        if (!s) return '';
        let str = s.toString().replace(/Datar/gi, '').trim();
        let numMatch = str.match(/\d+/);
        if (numMatch && (str.toLowerCase().includes('código') || str === numMatch[0])) {
            return `Código ${numMatch[0]}`;
        }
        return str;
    };

    let headerRowIndices = { metas: -1, servico: -1, relacao: -1, veloc: -1 };
    tableRows.forEach((row, idx) => {
        const first = (row[0] || '').toString().toLowerCase();
        if (first.includes('metas ini')) headerRowIndices.metas = idx;
        if (first.includes('serviço')) headerRowIndices.servico = idx;
        if (first.includes('relação')) headerRowIndices.relacao = idx;
        if (first.includes('veloc.')) headerRowIndices.veloc = idx;
    });

    // Lógica de Filtragem de Colunas
    let visibleCols = [0, 1]; // Colunas C e D são sempre fixas (índices 0 e 1 no CSV extraído)
    
    if (medSearchCode) {
        let targetBlockIdx = -1;
        // Percorre os blocos de colunas (cada bloco tem 2 colunas, começando no índice 2)
        for (let c = 2; c <= maxCol; c += 2) {
            let colCode = '';
            // Tenta achar o código na linha de Metas ou Relação
            const rowMetas = tableRows[headerRowIndices.metas] || tableRows[0];
            const valMetas = (rowMetas?.[c] || '').toString().toLowerCase();
            const numMetas = valMetas.match(/\d+/);
            
            const rowRel = tableRows[headerRowIndices.relacao];
            const valRel = (rowRel?.[c] || '').toString().toLowerCase();
            const numRel = valRel.match(/\d+/);
            
            if (numRel) colCode = numRel[0];
            else if (numMetas) colCode = numMetas[0];

            if (colCode === medSearchCode.toString()) {
                targetBlockIdx = c;
                break;
            }
        }

        if (targetBlockIdx !== -1) {
            // Se achou, adiciona: Bloco Anterior, Bloco Atual, Bloco Posterior
            if (targetBlockIdx > 2) visibleCols.push(targetBlockIdx - 2, targetBlockIdx - 1);
            visibleCols.push(targetBlockIdx, targetBlockIdx + 1);
            if (targetBlockIdx + 2 <= maxCol) visibleCols.push(targetBlockIdx + 2, targetBlockIdx + 3);
        } else {
            // Se não achou o código específico, exibe tudo para não dar tela vazia
            for (let c = 2; c <= maxCol; c++) visibleCols.push(c);
        }
    } else {
        // Se sem busca, exibe tudo
        for (let c = 2; c <= maxCol; c++) visibleCols.push(c);
    }

    let html = '<table class="med-table">';
    tableRows.forEach((row, rowIdx) => {
        const firstCellVal = (row[0] || '').toString().trim();
        const rowColor = getMedRowColor(firstCellVal);
        const isHeaderLine = Object.values(headerRowIndices).includes(rowIdx) || rowIdx <= 4;

        html += '<tr>';
        visibleCols.forEach(c => {
            if (c > maxCol) return;
            let val = (row[c] || '').toString().trim();
            const isFirstCol = (c === 0);
            
            let style = '';
            if (rowColor) {
                const bgColor = isFirstCol ? rowColor.bgSolid : rowColor.bg;
                const textColor = isFirstCol ? rowColor.text : rowColor.dataText;
                style = `style="background-color:${bgColor};color:${textColor};font-weight:${isFirstCol ? '700' : '500'}"`;
            } else {
                const bgColor = isFirstCol ? '#1e293b' : 'rgba(255, 255, 255, 0.03)';
                style = `style="background-color:${bgColor};color:#f8fafc;font-weight:${isFirstCol ? '700' : '500'}"`;
            }

            if (c >= 2) {
                // Como as colunas de dados são pares (Ini/Fim), agrupamos no render
                // Mas apenas se ambas as colunas do bloco forem visíveis
                if (visibleCols.includes(c) && visibleCols.includes(c+1) && c % 2 === 0) {
                    let content = val;
                    if (isHeaderLine) {
                        if (rowIdx === 0 || rowIdx === headerRowIndices.metas) {
                            let relVal = '';
                            if (headerRowIndices.relacao !== -1) {
                                const rRow = tableRows[headerRowIndices.relacao];
                                relVal = (rRow[c] || '').toString().trim();
                                if (!relVal) relVal = (rRow[c+1] || '').toString().trim();
                            }
                            const numFromRel = relVal.replace(/[^\d]/g, '').trim();
                            content = numFromRel ? `Código ${numFromRel}` : cleanMedText(val);
                        } else {
                            content = cleanMedText(val);
                        }
                        html += `<td colspan="2" ${style}>${content}</td>`;
                    } else {
                        html += `<td colspan="2" ${style}>${val}</td>`;
                    }
                } else if (c % 2 !== 0) {
                    // Coluna ímpar é pulada porque o colspan do 'c' já a cobre
                } else {
                    // Caso caia aqui por algum desalinhamento de visibleCols
                    html += `<td ${style}>${val}</td>`;
                }
            } else {
                html += `<td ${style}>${val}</td>`;
            }
        });
        html += '</tr>';
    });
    html += '</table>';
    document.getElementById('med-table-container').innerHTML = html;
}

// Event listeners dos botões MED 1 e MED 2
document.getElementById('btn-med-1').addEventListener('click', () => {
    medCurrentTab = 1;
    document.getElementById('btn-med-1').classList.add('active');
    document.getElementById('btn-med-2').classList.remove('active');
    renderMedTable(med1Data);
});
document.getElementById('btn-med-2').addEventListener('click', () => {
    medCurrentTab = 2;
    document.getElementById('btn-med-2').classList.add('active');
    document.getElementById('btn-med-1').classList.remove('active');
    renderMedTable(med2Data);
});

// Eventos de Busca no MED
document.getElementById('btn-med-search').addEventListener('click', () => {
    const val = document.getElementById('input-med-search').value.trim();
    if (val) {
        medSearchCode = val;
        const data = (medCurrentTab === 1) ? med1Data : med2Data;
        renderMedTable(data);
    }
});
document.getElementById('btn-med-clear').addEventListener('click', () => {
    medSearchCode = null;
    document.getElementById('input-med-search').value = '';
    const data = (medCurrentTab === 1) ? med1Data : med2Data;
    renderMedTable(data);
});
document.getElementById('input-med-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-med-search').click();
});

fetchData();
setInterval(fetchData, 60000);
