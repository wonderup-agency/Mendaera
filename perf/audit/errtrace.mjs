// Reproduces the JS errors with full stack traces so the failing call site is visible.
import puppeteer from 'puppeteer-core';
import { CHROME, BASE } from './pages.mjs';

const TARGETS = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

for (const t of TARGETS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  console.log(`\n########## ${t} ##########`);
  page.on('pageerror', (e) => console.log('PAGEERROR:\n' + (e.stack || e.message)));
  page.on('console', async (m) => {
    if (m.type() !== 'error') return;
    console.log('CONSOLE ERROR: ' + m.text());
    const loc = m.location();
    if (loc?.url) console.log('   at ' + loc.url + ':' + loc.lineNumber);
  });
  await page.goto(BASE + t, { waitUntil: 'networkidle2', timeout: 60000 }).catch((e) => console.log('NAV: ' + e.message));
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));
  await page.close();
}
await browser.close();
