const fs = require('fs');
const https = require('https');

const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const ts = Date.now();
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}&_cb=${ts}`;

https.get(SHEET_URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        fs.writeFileSync('obracsv_nocache.csv', data);
        console.log("Salvo obracsv_nocache.csv. Primeiras linhas:");
        console.log(data.split('\n').slice(0, 15).join('\n'));
    });
});
