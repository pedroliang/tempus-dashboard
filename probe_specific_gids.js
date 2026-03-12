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
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
    try {
        const text = await fetch(url);
        const lines = text.split('\n');
        console.log(`\n=== GID: ${gid} ===`);
        for (let i = 0; i < Math.min(3, lines.length); i++) {
            console.log(lines[i].substring(0, 100)); // mostra inicio das linhas
        }
    } catch (e) {
         console.log(`Erro no GID ${gid}`);
    }
}
async function run() {
    const gids = ['1077098301', '1227487264', '129403019', '2090482851', '397648978', '424137450', '488407797'];
    for(const gid of gids) {
        await probeGid(gid);
    }
}
run();
