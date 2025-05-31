import puppeteer from 'puppeteer';
import { extractFullProductData, extractDescriptionFromHtml } from '../utils/aiParser.js';
import { extractRawDescriptionHTML } from '../utils/htmlDetailExtractor.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

export async function scrapeEbayProducts(query) {
  if (typeof query !== 'string' || !query.trim()) throw new Error('Query must be a non-empty string');
  const browser = await puppeteer.launch({ headless: true, slowMo: 50, timeout: 0 });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/113 Safari/537.36');
  const keyword = query.trim().replace(/\s+/g, '+');
  const results = [];
  let pageNum = 1;

  while (true) {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${keyword}&_pgn=${pageNum}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch {
      break;
    }
    const rawHtmlItems = await page.$$eval('.s-item', items => items.slice(0, 10).map(i => i.outerHTML));
    for (let i = 0; i < rawHtmlItems.length; i += 10) {
      const batch = rawHtmlItems.slice(i, i + 10);
      try {
        const extracted = await Promise.all(batch.map(extractFullProductData));
        const filtered = extracted.filter(
          x => x && x.title && x.url?.includes('/itm/') && x.title !== 'Shop on eBay' && !x.url.includes('ebay.com/itm/123456')
        );
        for (let j = 0; j < filtered.length; j += 5) {
          const detailBatch = filtered.slice(j, j + 5);
          const detailResults = await Promise.allSettled(
            detailBatch.map(async item => {
              const html = await extractRawDescriptionHTML(browser, item.url);
              item.description = html ? await extractDescriptionFromHtml(html) : item.description || '-';
              return item;
            })
          );
          for (const res of detailResults) if (res.status === 'fulfilled') results.push(res.value);
          if (j + 5 < filtered.length) await delay(1000);
        }
        if (i + 10 < rawHtmlItems.length) await delay(1000);
      } catch {
        await delay(2000);
      }
    }
    const nextBtn = await page.$('a.pagination__next');
    if (!nextBtn || ++pageNum > 2) break;
    await delay(1000);
  }
  await browser.close();
  return results;
}