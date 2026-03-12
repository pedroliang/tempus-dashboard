const https = require('https');
const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';

const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log("DUMP CSV COMPLETO:");
        const lines = data.split('\n');
        lines.forEach((line, i) => {
            console.log(`LINE ${i}: ${line}`);
        });
    });
});
