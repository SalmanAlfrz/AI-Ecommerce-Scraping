export async function extractRawDescriptionHTML(browser, url) {
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 ...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForSelector('.ux-layout-section-module-evo__container', { timeout: 5000 });
      const html = await page.$eval('.ux-layout-section-module-evo__container', el => el.outerHTML);
      await page.close();
      return html;
    } catch { }

    try {
      const iframeHandle = await page.$('iframe[src*="ebaydesc.com"]');
      if (iframeHandle) {
        const iframeSrc = await page.evaluate(el => el.src, iframeHandle);
        const iframePage = await browser.newPage();
        await iframePage.goto(iframeSrc, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const iframeHtml = await iframePage.evaluate(() => document.body.outerHTML);
        await iframePage.close();
        await page.close();
        return iframeHtml;
      }
    } catch { }

    await page.close();
    return null;
  } catch {
    return null;
  }
}

// test
