// netlify/functions/create-payment-link.js

const SHEET_ENDPOINT_URL =
  'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

let nodeCrypto = globalThis.crypto;

try {
  if (!nodeCrypto) {
    nodeCrypto = require('crypto');
  }
} catch (e) {
  nodeCrypto = null;
}

const handler = async (event) => {

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

    const {
      firstName,
      lastName,
      email,
      dob,
      address1,
      address2,
      city,
      region,
      zip,
      country,
      phoneMobile,
      phoneHome,
      profession,
      howLearned,
      ukAffiliation,
      spousePartner,
      yearsMember,
      committees,
      interestGroups,
      total
    } = JSON.parse(event.body || '{}');

    if (!firstName || !lastName || !email || !total) {
      console.error('Missing required fields', {
        firstName, lastName, email, total
      });

      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Missing required fields'
        })
      };
    }

    const numericTotal = Number(total);

    if (!Number.isFinite(numericTotal) || numericTotal <= 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Invalid total'
        })
      };
    }

    const sheetPayload = {
      firstName,
      lastName,
      email,
      dob: dob || '',
      address1: address1 || '',
      address2: address2 || '',
      city: city || '',
      region: region || '',
      zip: zip || '',
      country: country || '',
      phoneMobile: phoneMobile || '',
      phoneHome: phoneHome || '',
      profession: profession || '',
      howLearned: howLearned || '',
      ukAffiliation: ukAffiliation || '',
      spousePartner: spousePartner || '',
      yearsMember: yearsMember || '',
      committees: committees || [],
      interestGroups: interestGroups || [],
      total: numericTotal
    };

    console.log('Saving membership submission to Google Sheet');
    console.log('Sheet payload:', JSON.stringify(sheetPayload));

    const sheetRes = await fetch(
      SHEET_ENDPOINT_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(sheetPayload),
        redirect: 'follow'
      }
    );

    const sheetText = await sheetRes.text();

    console.log('Sheet status:', sheetRes.status);
    console.log('Sheet response:', sheetText);

    if (!sheetRes.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Google Sheet request failed',
          detail: sheetText
        })
      };
    }

    let sheetResult;

    try {
      sheetResult = JSON.parse(sheetText);
    } catch {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Google Sheet returned invalid JSON',
          detail: sheetText
        })
      };
    }

    if (!sheetResult.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error:
            sheetResult.error ||
            'Google Sheet did not confirm registration',
          detail: sheetResult
        })
      };
    }

    const amountCents = Math.round(numericTotal * 100);
    const fullName = firstName + ' ' + lastName;

    const redirectUrl =
      process.env.REDIRECT_URL
        ? process.env.REDIRECT_URL +
          '?name=' +
          encodeURIComponent(fullName) +
          '&total=' +
          encodeURIComponent(numericTotal.toFixed(2))
        : undefined;

    let idempotencyKey =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    try {
      if (nodeCrypto?.randomUUID) {
        idempotencyKey = nodeCrypto.randomUUID();
      } else if (nodeCrypto?.randomBytes) {
        idempotencyKey =
          nodeCrypto.randomBytes(16).toString('hex');
      }
    } catch (e) {
      // fallback already set
    }

    const squarePayload = {
      idempotency_key: idempotencyKey,

      quick_pay: {
        name: 'UKWC Membership — ' + fullName,

        price_money: {
          amount: amountCents,
          currency: 'USD'
        },

        location_id:
          process.env.SQUARE_LOCATION_ID
      },

      checkout_options: {
        redirect_url: redirectUrl,
        ask_for_shipping_address: false
      },

      pre_populated_data: {
        buyer_email: email
      }
    };

    console.log('Creating Square payment link');

    const squareRes = await fetch(
      'https://connect.squareup.com/v2/online-checkout/payment-links',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',

          Authorization:
            'Bearer ' +
            process.env.SQUARE_ACCESS_TOKEN,

          'Square-Version': '2024-01-18'
        },

        body: JSON.stringify(squarePayload)
      }
    );

    const result = await squareRes.json();

    console.log('Square status:', squareRes.status);
    console.log('Square response:', JSON.stringify(result, null, 2));

    if (!squareRes.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Square API error',
          detail: result
        })
      };
    }

    if (!result.payment_link?.url) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Square did not return a payment URL',
          detail: result
        })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        paymentUrl: result.payment_link.url
      })
    };

  } catch (err) {

    console.error('FUNCTION ERROR:', err);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error:
          err?.message ||
          'Internal error'
      })
    };
  }
};

module.exports.handler = handler;
exports.handler = handler;
