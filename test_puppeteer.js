
import puppeteer from 'puppeteer-core';

(async () => {
  try {
    console.log('Connecting to browserless...');
    const browser = await puppeteer.connect({
      browserWSEndpoint: 'ws://192.168.100.191:3000?token=68c2e903363f3e677af7e37b2d310cd2'
    });
    console.log('Connected! Creating page...');
    const page = await browser.newPage();
    await page.goto('https://www.tiktok.com/search?q=Kuliner%20Kemang', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    console.log('Page title:', title);
    const cards = await page.$$eval('[data-e2e="search_top-item"], [class*="DivItemContainer"], [class*="DivVideoCard"], article', els => els.length);
    console.log('Cards count:', cards);
    await browser.close();
  } catch (e) {
    console.error('Error:', e);
  }
})();
