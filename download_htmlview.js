const fs = require('fs');
const https = require('https');

const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview?gid=${GID}`;

https.get(SHEET_URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        fs.writeFileSync('htmlview.html', data);
        console.log("Salvo htmlview.html");
    });
});
