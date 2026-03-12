const fs = require('fs');
const https = require('https');

const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

https.get(SHEET_URL, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => {
            let data = '';
            res2.on('data', c => data += c);
            res2.on('end', () => {
                fs.writeFileSync('obra_export.csv', data);
                console.log(data.split('\n').slice(0, 15).join('\n'));
            });
        });
    } else {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            fs.writeFileSync('obra_export.csv', data);
            console.log(data.split('\n').slice(0, 15).join('\n'));
        });
    }
});
