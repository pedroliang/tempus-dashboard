const https = require('https');
const SHEET_URL = `https://docs.google.com/spreadsheets/d/1ERU7rfuO6WmtTdD2q3lmDEnX9WZxDAEnYF5xYqjLNvw/export?format=csv&gid=1077098301`;

https.get(SHEET_URL, (res) => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);
    if (res.statusCode >= 300) {
        https.get(res.headers.location, r2 => {
            console.log("Redirect Headers:", r2.headers);
        });
    }
});
