const fs = require('fs');
const https = require('https');
const xlsx = require('xlsx'); // Verificando se existe no ambiente

const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const GID = '1077098301';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx&gid=${GID}`;

https.get(SHEET_URL, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        https.get(res.headers.location, (res2) => {
            let chunks = [];
            res2.on('data', c => chunks.push(c));
            res2.on('end', () => {
                const buffer = Buffer.concat(chunks);
                fs.writeFileSync('obra.xlsx', buffer);
                try {
                    const workbook = xlsx.read(buffer, { type: 'buffer' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
                    console.log(data.slice(0, 15));
                } catch(e) {
                    console.log("Erro ao ler xlsx: ", e.message);
                }
            });
        });
    } else {
        let chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync('obra.xlsx', buffer);
            try {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
                console.log("XLSX Parsed!");
                console.log(data.map(r => r.join(' | ')).slice(0, 15).join('\n'));
            } catch(e) {
                console.log("Erro ao ler xlsx: ", e.message);
            }
        });
    }
});
