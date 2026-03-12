const fs = require('fs');
const https = require('https');

const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

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

https.get(SHEET_URL, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        const rows = parseCSV(data);
        const findVal = (label) => {
            const target = label.toLowerCase().replace(/\s/g, '');
            for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                for (let c = 0; c < row.length - 1; c++) {
                    if (row[c] && row[c].toLowerCase().replace(/\s/g, '').includes(target)) {
                        console.log(`Matched '${label}' in row ${r}, col ${c}: "${row[c]}"`);
                        console.log(`row data:`, row.slice(c, c+5));
                        if (row[c+1] && row[c+1].trim() !== '') return row[c+1].trim();
                        if (row[c+2] && row[c+2].trim() !== '') return row[c+2].trim();
                        if (row[c+3] && row[c+3].trim() !== '') return row[c+3].trim();
                    }
                }
            }
            return '--';
        };
        console.log("Padrão:", findVal('Padrão'));
        console.log("Zoneamento:", findVal('Zoneamento'));
        console.log("Tipologia:", findVal('Tipologia'));
    });
});
