import puppeteer from 'puppeteer';
import { extractFullProductData, extractDescriptionFromHtml } from '../utils/aiParser.js';
import { extractRawDescriptionHTML } from '../utils/htmlDetailExtractor.js';

export async function scrapeEbayProducts(query) {
  const browser = await puppeteer.launch({
    headless: true,
    slowMo: 50,
    timeout: 0
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/113 Safari/537.36');

  if (typeof query !== 'string' || !query.trim()) {
    throw new Error('Query must be a non-empty string');
  }
  const keyword = query.trim().replace(/\s+/g, '+');

  const results = [];
  let currentPage = 1;

  while (true) {
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${keyword}&_pgn=${currentPage}`;
    console.log(`🔍 Scraping Page ${currentPage}: ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch {
      console.warn(`⚠️ Timeout membuka halaman ${currentPage}, berhenti.`);
      break;
    }

    const rawHtmlItems = await page.$$eval('.s-item', items =>
      // items.map(item => item.outerHTML)
      // set limit 20 item per halaman
      items.slice(0, 20).map(item => item.outerHTML)
    );

    const batchSize = 10; // Ukuran batch untuk pemrosesan paralel
    for (let i = 0; i < rawHtmlItems.length; i += batchSize) {
      const batch = rawHtmlItems.slice(i, i + batchSize);

      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rawHtmlItems.length / batchSize)} (${batch.length} items)...`);

      try {
        const extractedBatch = await Promise.all(
          batch.map(html => extractFullProductData(html))
        );

        const filteredItems = extractedBatch.filter(item =>
          item &&
          item.title &&
          item.url?.includes('/itm/') &&
          item.title !== 'Shop on eBay' &&
          !item.url.includes('ebay.com/itm/123456')
        );

        const detailBatchSize = 5; // Ukuran batch untuk detail extraction
        for (let j = 0; j < filteredItems.length; j += detailBatchSize) {
          const detailBatch = filteredItems.slice(j, j + detailBatchSize);

          const detailResults = await Promise.allSettled(
            detailBatch.map(async aiExtracted => {
              const rawDetailHTML = await extractRawDescriptionHTML(browser, aiExtracted.url);
              const parsedDescription = rawDetailHTML
                ? await extractDescriptionFromHtml(rawDetailHTML)
                : null;

              aiExtracted.description = parsedDescription || aiExtracted.description || '-';
              return aiExtracted;
            })
          );

          for (const res of detailResults) {
            if (res.status === 'fulfilled') {
              results.push(res.value);
            }
          }

          if (j + detailBatchSize < filteredItems.length) {
            await new Promise(res => setTimeout(res, 1000));
          }
        }

        if (i + batchSize < rawHtmlItems.length) {
          await new Promise(res => setTimeout(res, 1000));
        }

      } catch (error) {
        console.error(`❌ Batch error:`, error.message);
        await new Promise(res => setTimeout(res, 2000));
      }
    }

    const nextPageBtn = await page.$('a.pagination__next');
    if (!nextPageBtn) {
      console.log(`✅ Tidak ada halaman selanjutnya.`);
      break;
    }

    currentPage++;
    if (currentPage > 5) {
      console.log(`✅ Hanya mengambil 5 halaman pertama.`);
      break;
    }

    await new Promise(res => setTimeout(res, 1000));
  }

  await browser.close();
  return results;
}
