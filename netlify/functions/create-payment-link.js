// netlify/functions/create-payment-link.js
 
const SHEET_ENDPOINT_URL =
'https://script.google.com/macros/s/AKfycbzYk78Gwkj9UCmZ1rRD2fW8aPEyolSkd6pamSPk52PggKZtBCho6Ildb5sGgWZMOt3t/exec';
 
const CORS_HEADERS = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'Content-Type'
};
 
exports.handler = async (event) => {
if (event.httpMethod === 'OPTIONS') {
return {
statusCode: 204,
headers: {
...CORS_HEADERS,
'Access-Control-Allow-Methods': 'POST,OPTIONS'
},
body: ''
};
}
 
if (event.httpMethod !== 'POST') {
return {
statusCode: 405,
headers: CORS_HEADERS,
body: JSON.stringify({
error: 'Method not allowed'
})
};
}
 
try {
const payload = JSON.parse(event.body || '{}');
 
const sheetResponse = await fetch(SHEET_ENDPOINT_URL, {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify(payload)
});
 
const sheetText = await sheetResponse.text();
 
if (!sheetResponse.ok) {
return {
statusCode: 500,
headers: CORS_HEADERS,
body: JSON.stringify({
error: 'Google Sheet error',
detail: sheetText
})
};
}
 
return {
statusCode: 200,
headers: CORS_HEADERS,
body: JSON.stringify({
success: true
})
};
} catch (err) {
return {
statusCode: 500,
headers: CORS_HEADERS,
body: JSON.stringify({
error: err.message
})
};
}
};
