import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';

dotenv.config();

const AREAS = [
  'Pomona AH',
  'Boksburg',
  'Farrarmere',
  'Glen Marais',
  'Witpoortjie AH',
  'Aston Manor',
  'Rynfield',
  'Kempton Park AH',
  'Witfontein'
];

const MAX_RENT = 7500;
const MIN_BEDROOMS = 2;

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const area of AREAS) {
    const url = `https://www.property24.com/to-rent/${encodeURIComponent(area.toLowerCase())}`;

    try {
      console.log(`Scraping ${area}`);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      const listings = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*=propertyCard]');

        return Array.from(cards).map(card => {
          const text = card.innerText || '';

          return {
            title: text.split('\n')[0] || '',
            price: text.match(/R\s?([\d\s]+)/)?.[1]?.replace(/\s/g, '') || null,
            bedrooms: parseInt(text.match(/(\d+)\s+Bedroom/i)?.[1] || 0),
            listing_url: card.querySelector('a')?.href || '',
            source: 'Property24'
          };
        });
      });

      const filtered = listings.filter(item => {
        const rent = Number(item.price || 0);
        return rent <= MAX_RENT && item.bedrooms >= MIN_BEDROOMS;
      });

      for (const property of filtered) {
        await supabase
          .from('rental_listings')
          .upsert({
            ...property,
            area,
            price: Number(property.price),
            status: 'active',
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'listing_url'
          });
      }

      console.log(`${filtered.length} properties saved for ${area}`);

    } catch (err) {
      console.error(`Failed ${area}`, err.message);
    }
  }

  await browser.close();
}

scrape();
