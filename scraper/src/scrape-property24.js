import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';

dotenv.config();

const AREAS = [
  { area: 'Pomona AH', url: 'https://www.property24.com/to-rent/pomona-ah/kempton-park/gauteng/15857' },
  { area: 'Boksburg', url: 'https://www.property24.com/to-rent/boksburg/gauteng/20' },
  { area: 'Farrarmere', url: 'https://www.property24.com/to-rent/farrarmere/benoni/gauteng/2134' },
  { area: 'Glen Marais', url: 'https://www.property24.com/to-rent/glen-marais/kempton-park/gauteng/1260' },
  { area: 'Witpoortjie AH', url: 'https://www.property24.com/to-rent/witpoortjie-ah/kempton-park/gauteng/15858' },
  { area: 'Aston Manor', url: 'https://www.property24.com/to-rent/aston-manor/kempton-park/gauteng/1253' },
  { area: 'Rynfield', url: 'https://www.property24.com/to-rent/rynfield/benoni/gauteng/2151' },
  { area: 'Kempton Park AH', url: 'https://www.property24.com/to-rent/kempton-park-ah/kempton-park/gauteng/15856' },
  { area: 'Witfontein', url: 'https://www.property24.com/to-rent/witfontein/kempton-park/gauteng/15859' }
];

const MAX_RENT = Number(process.env.MAX_RENT || 7500);
const MIN_BEDROOMS = Number(process.env.MIN_BEDROOMS || 2);

function cleanNumber(value) {
  if (!value) return null;
  const number = String(value).replace(/[^0-9.]/g, '');
  return number ? Number(number) : null;
}

async function scrape() {
  const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

  const browser = await chromium.launch({
    headless: true,
    executablePath
  });

  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'
  });

  for (const target of AREAS) {
    const { area, url } = target;

    try {
      console.log(`Scraping ${area}`);
      console.log(`URL: ${url}`);

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 90000
      });

      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);

      const listings = await page.evaluate(() => {
        const possibleCards = [
          ...document.querySelectorAll('a[href*="/to-rent/"]'),
          ...document.querySelectorAll('a[href*="/property-to-rent/"]')
        ];

        const seen = new Set();

        return possibleCards
          .map(link => {
            const href = link.href;
            if (!href || seen.has(href)) return null;
            seen.add(href);

            const card = link.closest('div')?.parentElement || link.closest('div') || link;
            const text = card.innerText || link.innerText || '';

            const priceMatch = text.match(/R\s?[0-9][0-9\s,.]*/i);
            const bedMatch = text.match(/(\d+)\s*(Bedroom|Bed|Beds|bd)/i);
            const bathMatch = text.match(/(\d+(?:\.\d+)?)\s*(Bathroom|Bath|Baths|ba)/i);
            const parkingMatch = text.match(/(\d+)\s*(Parking|Garage|Garages)/i);

            return {
              source: 'Property24',
              title: text.split('\n').find(line => line.trim().length > 5) || 'Property24 Rental Listing',
              price: priceMatch?.[0] || null,
              bedrooms: bedMatch?.[1] || null,
              bathrooms: bathMatch?.[1] || null,
              parking: parkingMatch?.[1] || null,
              listing_url: href
            };
          })
          .filter(Boolean);
      });

      console.log(`Raw listings found: ${listings.length}`);

      const filtered = listings
        .map(item => ({
          ...item,
          area,
          price: cleanNumber(item.price),
          bedrooms: cleanNumber(item.bedrooms),
          bathrooms: cleanNumber(item.bathrooms),
          parking: cleanNumber(item.parking),
          status: 'active',
          last_seen_at: new Date().toISOString()
        }))
        .filter(item => item.listing_url && item.price && item.bedrooms)
        .filter(item => item.price <= MAX_RENT && item.bedrooms >= MIN_BEDROOMS);

      console.log(`Filtered listings: ${filtered.length}`);

      for (const property of filtered) {
        const { error } = await supabase
          .from('rental_listings')
          .upsert(property, { onConflict: 'listing_url' });

        if (error) {
          console.error(`Supabase insert failed for ${property.listing_url}:`, error.message);
        }
      }

      console.log(`${filtered.length} properties saved for ${area}`);

    } catch (err) {
      console.error(`Failed ${area}`, err.message);
    }
  }

  await browser.close();
}

scrape();
