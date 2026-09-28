/**
 * UKWC Membership Form — Sheet logging only.
 * (Square payment link creation lives in Netlify:
 *  netlify/functions/create-payment-link.js — keeps the Square token
 *  out of Google entirely.)
 *
 * SETUP:
 * 1. In your Sheet: Extensions > Apps Script. Paste this whole file
 *    in as Code.gs, then replace SHEET_ID below with this Sheet's ID
 *    (from its URL: docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit).
 * 2. Pick setupSheet from the function dropdown and click Run to
 *    write the header row (approve the authorization prompt).
 * 3. Deploy > New deployment > Web app (Execute as: Me, Who has
 *    access: Anyone). Copy the Web app URL into SHEET_ENDPOINT_URL
 *    in netlify/functions/create-payment-link.js.
 */

const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';

function setupSheet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  sheet.getRange(1, 1, 1, 19).setValues([[
    'Timestamp', 'First Name', 'Last Name', 'Email', 'Date of Birth',
    'Address 1', 'Address 2', 'City', 'Region', 'Zip', 'Country',
    'Phone Mobile', 'Phone Home', 'Profession', 'How Learned',
    'UK Affiliation', 'Spouse/Partner', 'Committees', 'Interest Groups'
  ]]);
  sheet.setFrozenRows(1);
}

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data = JSON.parse(e.postData.contents);
    const { firstName, lastName, email } = data;

    if (!firstName || !lastName || !email) {
      throw new Error('Missing required fields');
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    sheet.appendRow([
      new Date(),
      firstName,
      lastName,
      email,
      data.dob || '',
      data.address1 || '',
      data.address2 || '',
      data.city || '',
      data.region || '',
      data.zip || '',
      data.country || '',
      data.phoneMobile || '',
      data.phoneHome || '',
      data.profession || '',
      data.howLearned || '',
      data.ukAffiliation || '',
      data.spousePartner || '',
      Array.isArray(data.committees) ? data.committees.join(', ') : (data.committees || ''),
      Array.isArray(data.interestGroups) ? data.interestGroups.join(', ') : (data.interestGroups || '')
    ]);

    output.setContent(JSON.stringify({ ok: true }));
    return output;

  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
    return output;
  }
}
