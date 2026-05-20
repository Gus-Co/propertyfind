import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const sheetName = process.env.GOOGLE_SHEET_NAME || 'Listings';

function getPrivateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

export async function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: getPrivateKey(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

export async function ensureHeaderRow() {
  if (!spreadsheetId) {
    console.warn('GOOGLE_SHEET_ID not set. Skipping Google Sheets sync.');
    return;
  }

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1:N1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        'Found At',
        'Source',
        'Area',
        'Suburb',
        'Property Type',
        'Title',
        'Price',
        'Bedrooms',
        'Bathrooms',
        'Parking',
        'Address',
        'Agency',
        'Status',
        'Listing URL'
      ]]
    }
  });
}

export async function appendListingsToSheet(listings) {
  if (!spreadsheetId) {
    console.warn('GOOGLE_SHEET_ID not set. Skipping Google Sheets sync.');
    return;
  }

  if (!listings.length) return;

  const sheets = await getSheetsClient();

  const values = listings.map(item => [
    new Date().toISOString(),
    item.source || '',
    item.area || '',
    item.suburb || '',
    item.property_type || '',
    item.title || '',
    item.price || '',
    item.bedrooms || '',
    item.bathrooms || '',
    item.parking || '',
    item.address || '',
    item.agency || '',
    item.status || 'active',
    item.listing_url || ''
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:N`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });
}
