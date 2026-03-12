const https = require('https');
const SHEET_ID = '1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        // Busca na página o JSON com os metadados das abas
        const match = data.match(/var\s*bootstrapData\s*=\s*(\{.*?\});/);
        if (match && match[1]) {
            try {
                const bdata = JSON.parse(match[1]);
                const sheets = bdata?.changes?.firstChunk?.sheetList || [];
                // Se nao achou nesse formato, tenta procurar padroes "name":"...", "sheetId":...
                console.log("Found bootstrap data");
            } catch(e) {}
        }
        
        // Forma mais rudimentar com regex
        const regex = /\[(\d+),".*?","(.*?)"]/g;
        let match2;
        console.log("--- ABAS ENCONTRADAS ---");
        while ((match2 = regex.exec(data)) !== null) {
            // Nem todos serão abas, mas os que tiverem nomes compridos e IDs grandes normalmente são.
            // Para melhorar, procuramos por "gid=" ou algo similiar, mas a regex acima tb acha.
            // Outro padrão no htmlview: id=\"sheet-button-([0-9]+)\".*?>(.*?)<\/a>
        }
        
        const regex3 = /id=\"sheet-button-(\d+)\".*?>(.*?)<\/a>/g;
        let match3;
        while ((match3 = regex3.exec(data)) !== null) {
            console.log(`GID: ${match3[1]} - NOME: ${match3[2]}`);
        }
    });
});
