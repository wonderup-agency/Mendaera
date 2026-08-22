// Pregunta a la propia API de Intellimize si hay experimentos corriendo.
import puppeteer from 'puppeteer-core';
import { BASE, CHROME } from './pages.mjs';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });
for (const route of ['/', '/about', '/technology', '/news-and-events', '/careers']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 4000));
  const r = await page.evaluate(() => {
    const im = window.intellimize;
    const call = (fn) => { try { return im[fn](); } catch (e) { return 'err: ' + e.message; } };
    return {
      activities: call('getActivities'),
      variationIds: call('getSelectedVariationIds'),
      variationNames: call('getSelectedVariationNames'),
    };
  });
  console.log(`${route.padEnd(18)} activities=${JSON.stringify(r.activities)} variations=${JSON.stringify(r.variationIds)} ${JSON.stringify(r.variationNames)}`);
  await page.close();
}
await browser.close();
