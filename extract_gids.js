const fs = require('fs');

const data = fs.readFileSync('sheet_html.txt', 'utf8');

const regex = /\[(\d+),"(.*?)"\]/g;
let match;
console.log("=== GIDs Encontrados ===");
let found = false;
while ((match = regex.exec(data)) !== null) {
    if (match[1].length > 5) { // GIDs normalmente sao grandes, exceto o 0
         console.log(`GID: ${match[1]} - Nome: ${match[2]}`);
         found = true;
    }
}
if (!found) {
    // Busca alternativa
    const regex2 = /"\\"\d+\\""/g;
    console.log("Buscando qualquer sequencia de digitos entre aspas", data.match(regex2));
}
