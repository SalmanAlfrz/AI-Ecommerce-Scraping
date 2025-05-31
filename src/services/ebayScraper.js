import puppeteer from 'puppeteer';
import { extractFullProductData, extractDescriptionFromHtml } from '../utils/aiParser.js';
import { extractRawDescriptionHTML } from '../utils/htmlDetailExtractor.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

const ITEMS_PER_PAGE = 20;
const ITEMS_PER_BATCH_PAGE = 20; // Lebih besar, proses paralel lebih banyak
const ITEMS_PER_BATCH_DESC = 10; // Lebih besar, proses paralel lebih banyak
const MAX_PAGES = 3;

export async function scrapeEbayProducts(query) {
  if (typeof query !== 'string' || !query.trim()) throw new Error('Query must be a non-empty string');
  console.log('[START] Mulai scraping eBay dengan query:', query);
  console.time('[TIME] Lama proses scraping');
  const browser = await puppeteer.launch({ headless: true, timeout: 0 });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/113 Safari/537.36');
  const keyword = query.trim().replace(/\s+/g, '+');
  const results = [];
  let pageNum = 1;

  while (true) {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${keyword}&_pgn=${pageNum}`;
    console.log(`[SCRAPE] Membuka halaman ${pageNum}: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch {
      console.log(`[ERROR] Gagal membuka halaman ${pageNum}`);
      break;
    }
    const rawHtmlItems = await page.$$eval(
      '.s-item',
      (items, max) => items.slice(0, max).map(i => i.outerHTML),
      ITEMS_PER_PAGE
    );
    console.log(`[INFO] Ditemukan ${rawHtmlItems.length} produk pada halaman ${pageNum}`);

    // Proses ekstraksi dan filter seluruh halaman
    let extracted = [];
    for (let i = 0; i < rawHtmlItems.length; i += ITEMS_PER_BATCH_PAGE) {
      const batch = rawHtmlItems.slice(i, i + ITEMS_PER_BATCH_PAGE);
      try {
        const batchExtracted = await Promise.all(batch.map(extractFullProductData));
        extracted = extracted.concat(batchExtracted);
        if (i + ITEMS_PER_BATCH_PAGE < rawHtmlItems.length) await delay(500);
      } catch {
        console.log('[ERROR] Terjadi error saat proses batch produk');
        await delay(2000);
      }
    }
    const filtered = extracted.filter(
      x => x && x.title && x.url?.includes('/itm/') && x.title !== 'Shop on eBay' && !x.url.includes('ebay.com/itm/123456')
    );
    console.log(`[INFO] ${filtered.length} produk valid setelah filter pada halaman ${pageNum}`);

    // Proses detail deskripsi
    for (let j = 0; j < filtered.length; j += ITEMS_PER_BATCH_DESC) {
      const detailBatch = filtered.slice(j, j + ITEMS_PER_BATCH_DESC);
      const detailResults = await Promise.allSettled(
        detailBatch.map(async item => {
          const html = await extractRawDescriptionHTML(browser, item.url);
          item.description = html ? await extractDescriptionFromHtml(html) : item.description || '-';
          return item;
        })
      );
      for (const res of detailResults) if (res.status === 'fulfilled') results.push(res.value);
      if (j + ITEMS_PER_BATCH_DESC < filtered.length) await delay(500);
    }

    const nextBtn = await page.$('a.pagination__next');
    if (!nextBtn || ++pageNum > MAX_PAGES) {
      console.log('[END] Tidak ada halaman berikutnya atau sudah mencapai batas halaman.');
      break;
    }
    await delay(500); // antar halaman
  }
  await browser.close();
  console.timeEnd('[TIME] Lama proses scraping');
  console.log(`[DONE] Scraping selesai. Total produk: ${results.length}`);
  return results;
}