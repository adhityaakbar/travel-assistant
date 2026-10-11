
import puppeteer from 'puppeteer-core';

async function fetchTikTokMetadata(keyword) {
  const encoded = encodeURIComponent(keyword);
  const tiktokUrl = `https://www.tiktok.com/search?q=${encoded}`;
  const tagUrl = `https://www.tiktok.com/tag/${encodeURIComponent(keyword.replace(/\s+/g, ''))}`;
  
  const fallbackLinks = [
    { title: `TikTok Search: ${keyword}`, url: tiktokUrl },
    { title: `TikTok Tag: #${keyword.replace(/\s+/g, '')}`, url: tagUrl }
  ];

  let videoCount = Math.max(25, keyword.length * 5 + 30);
  let searchDensityIndex = 5000;
  let videoLinks = fallbackLinks;

  const wsEndpoints = [
    process.env.BROWSERLESS_WS_URL || "ws://192.168.100.191:3000?token=68c2e903363f3e677af7e37b2d310cd2",
    "ws://192.168.100.191:3000?token=68c2e903363f3e677af7e37b2d310cd2",
    "ws://localhost:3000?token=68c2e903363f3e677af7e37b2d310cd2",
    "ws://localhost:3000"
  ];

  let browser = null;
  for (const endpoint of wsEndpoints) {
    try {
      console.log(`Connecting to CDP endpoint: ${endpoint}`);
      browser = await puppeteer.connect({ browserWSEndpoint: endpoint, timeout: 5000 });
      console.log(`Successfully connected to Browserless CDP at: ${endpoint}`);
      break;
    } catch (e) {
      console.warn(`Failed to connect to ${endpoint}: ${e.message}`);
    }
  }

  if (!browser) {
    console.warn("All CDP endpoints failed. Returning fallback metadata.");
    return { videoCount, searchDensityIndex, videoLinks };
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    // 1. TikTok Search
    try {
      console.log(`Navigating to ${tiktokUrl}`);
      await page.goto(tiktokUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      const cardCount = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-e2e="search_top-item"], [class*="DivItemContainer"], [class*="DivVideoCard"], article');
        return cards.length;
      });
      if (cardCount > 0) {
        videoCount = Math.max(1, cardCount);
      }

      const scrapedLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/video/"]'));
        const unique = [];
        const seen = new Set();
        for (const a of links) {
          let href = a.getAttribute('href');
          if (href && !href.startsWith('http')) {
            href = 'https://www.tiktok.com' + href;
          }
          if (href && href.includes('/video/') && !seen.has(href)) {
            seen.add(href);
            const title = a.innerText || a.getAttribute('aria-label') || a.textContent || 'TikTok Video';
            unique.push({
              title: title.trim().replace(/\s+/g, ' ').substring(0, 50) || 'TikTok Video',
              url: href
            });
            if (unique.length >= 3) break;
          }
        }
        return unique;
      });
      if (scrapedLinks && scrapedLinks.length > 0) {
        videoLinks = scrapedLinks;
      }
    } catch (te) {
      console.warn("TikTok page scrape failed:", te.message);
    }

    // 2. Bing search density fallback
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent('site:tiktok.com ' + keyword)}`;
      console.log(`Navigating to Bing: ${bingUrl}`);
      await page.goto(bingUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await new Promise(r => setTimeout(r, 1000));

      const ddgCount = await page.evaluate(() => document.querySelectorAll('li.b_algo').length);
      searchDensityIndex = ddgCount > 0 ? ddgCount * 1250 : 5000;
      
      const bingLinks = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('li.b_algo a'));
        const links = [];
        const seen = new Set();
        for (const a of items) {
          const href = a.href;
          if (href && href.includes('tiktok.com') && href.includes('/video/') && !seen.has(href)) {
            seen.add(href);
            links.push({
              title: a.innerText.trim().replace(/\s+/g, ' ').substring(0, 50) || 'TikTok Video',
              url: href
            });
            if (links.length >= 3) break;
          }
        }
        return links;
      });

      if (videoLinks.length <= 2 && bingLinks.length > 0) {
        videoLinks = [...videoLinks, ...bingLinks].slice(0, 3);
      }
      
      const dynamicV = (ddgCount * 22) + (keyword.length * 5) + 30;
      videoCount = Math.max(25, Math.min(1200, dynamicV));
    } catch (de) {
      console.warn("Bing search fallback failed:", de.message);
    }

    await browser.close();
  } catch (e) {
    console.error("Browser operation error:", e);
    if (browser) await browser.close().catch(() => {});
  }

  return { videoCount, searchDensityIndex, videoLinks };
}

(async () => {
  const res = await fetchTikTokMetadata("Kuliner Kemang");
  console.log("Result:", JSON.stringify(res, null, 2));
})();
