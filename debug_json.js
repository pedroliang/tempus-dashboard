const https = require('https');

const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

https.get(SHEET_URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        const jsonStr = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        if (jsonStr && jsonStr[1]) {
            const parsed = JSON.parse(jsonStr[1]);
            const rows = parsed.table.rows;
            // Let's print rows 3 to 6
            for (let i = 3; i <= 6; i++) {
                if(rows[i] && rows[i].c) {
                    console.log(`JSON Row ${i}: ` + rows[i].c.map(c => c ? (c.f || c.v) : 'null').join(' | '));
                }
            }
        }
    });
});
