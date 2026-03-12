const https = require('https');
const fs = require('fs');
const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('sheet_html.txt', data);
        console.log("Salvo em sheet_html.txt");
    });
});
