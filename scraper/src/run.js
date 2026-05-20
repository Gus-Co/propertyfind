import dotenv from 'dotenv';
import { ensureHeaderRow } from './sheets.js';
import './scrape-property24.js';

dotenv.config();

(async () => {
  try {
    await ensureHeaderRow();
    console.log('Google Sheet initialized');
  } catch (err) {
    console.error('Failed to initialize Google Sheet', err.message);
  }
})();
