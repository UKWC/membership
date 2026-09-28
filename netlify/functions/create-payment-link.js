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
 
if (!sheetResponse.ok) {
const text = await sheetResponse.text();
 
return {
statusCode: 500,
headers: CORS_HEADERS,
body: JSON.stringify({
error: 'Google Sheet error',
detail: text
})
};
}
 
const amountCents = Math.round(
Number(payload.total || 42) * 100
);
 
const squareResponse = await fetch(
'https://connect.squareup.com/v2/online-checkout/payment-links',
{
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization:
`Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
'Square-Version': '2024-01-18'
},
body: JSON.stringify({
idempotency_key:
`${Date.now()}-${Math.random()}`,
 
quick_pay: {
name:
`UKWC Membership - ${payload.firstName} ${payload.lastName}`,
price_money: {
amount: amountCents,
currency: 'USD'
},
location_id:
process.env.SQUARE_LOCATION_ID
},
 
checkout_options: {
redirect_url:
process.env.REDIRECT_URL
},
 
pre_populated_data: {
buyer_email: payload.email
}
})
}
);
 
const squareResult =
await squareResponse.json();
 
if (!squareResponse.ok) {
return {
statusCode: 500,
headers: CORS_HEADERS,
body: JSON.stringify({
error: 'Square API error',
detail: squareResult
})
};
}
 
return {
statusCode: 200,
headers: CORS_HEADERS,
body: JSON.stringify({
paymentUrl:
squareResult.payment_link.url
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
