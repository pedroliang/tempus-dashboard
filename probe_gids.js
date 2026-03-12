
const https = require('https');

const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function probeGid(gid) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
    try {
        const text = await fetch(url);
        const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        if (jsonStr && jsonStr[1]) {
            const data = JSON.parse(jsonStr[1]);
            const rows = data.table.rows;
            if (rows && rows.length > 0) {
                console.log(`GID: ${gid} - Found ${rows.length} rows.`);
                if (rows[0] && rows[0].c) {
                    console.log(`  First row: ${rows[0].c.map(c => c ? c.v : 'null').join(', ')}`);
                }
                if (rows[1] && rows[1].c) {
                    console.log(`  Second row: ${rows[1].c.map(c => c ? c.v : 'null').join(', ')}`);
                }
            }
        }
    } catch (e) {
        // console.error(`Error on GID ${gid}:`, e.message);
    }
}

async function run() {
    console.log("Probing GIDs...");
    for (let i = 0; i <= 30; i++) {
        await probeGid(i);
    }
    await probeGid(1077098301); // Info Obra
}

run();

