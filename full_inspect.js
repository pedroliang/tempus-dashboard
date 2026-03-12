const https = require('https');
const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const jsonData = JSON.parse(data.substring(47, data.length - 2));
        const rows = jsonData.table.rows;
        rows.forEach((row, i) => {
            const values = row.c.map((c, j) => {
                if (!c) return `[${j}]:(null)`;
                return `[${j}]:(v=${c.v}, f=${c.f || 'null'})`;
            }).join(' | ');
            console.log(`R${i}: ${values}`);
        });
    });
});
