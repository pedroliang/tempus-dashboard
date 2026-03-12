const fetch = require('node-fetch') || require('https').get;

const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const RAW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const SHEET_URL = `https://api.allorigins.win/get?url=${encodeURIComponent(RAW_URL)}`;

const https = require('https');
https.get(SHEET_URL, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const csv = json.contents;
            console.log("CSV retornado pelo proxy AllOrigins:");
            console.log(csv.split('\n').slice(0, 15).join('\n'));
        } catch(e) {
             console.log("Falha ao parsear proxy response", e.message);
        }
    });
});
