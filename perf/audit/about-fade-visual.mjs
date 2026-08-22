// Compara pixel a pixel el poster pintado por el <video> (atributo, object-fit
// cover) contra el mismo poster pintado como background del wrapper. Si el
// encuadre no coincide, el fade se nota como un salto.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { CHROME, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const OUT = 'out/fade-visual';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const url = 'https://www.mendaera.com/about';
const footer = fs.readFileSync('../webflow/footer-about.html', 'utf8');
const NEW_JS = footer.slice(footer.indexOf('<script>') + 8, footer.lastIndexOf('</script>'));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });

async function shot(name, patch, mode) {
  const page = await browser.newPage();
  if (mode === 'mobile') { await page.setViewport(MOBILE_VIEWPORT); await page.setUserAgent(MOBILE_UA); }
  else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    if (req.url() === url && req.resourceType() === 'document') {
      let html = await fetch(url).then((r) => r.text());
      if (patch) {
        const re = /<script>(?:(?!<\/script>)[\s\S])*references_about(?:(?!<\/script>)[\s\S])*<\/script>/;
        html = html.replace(re, '<script>' + NEW_JS + '</script>');
      }
      return req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }
    // Sin video: asi el <video> se queda en el poster y se puede comparar
    if (/vimeo/.test(req.url())) return req.abort();
    req.continue();
  });
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.evaluate(() => document.querySelector('[data-home-video="wrapper"]').scrollIntoView({ block: 'center' }));
  await new Promise((r) => setTimeout(r, 2500));
  const el = await page.$('[data-home-video="wrapper"]');
  const file = `${OUT}/${name}.png`;
  await el.screenshot({ path: file });
  await page.close();
  return file;
}

for (const mode of ['mobile', 'desktop']) {
  const a = await shot(`${mode}-baseline-poster-del-video`, false, mode);
  const b = await shot(`${mode}-con-fade-poster-de-fondo`, true, mode);
  const [ba, bb] = [fs.readFileSync(a), fs.readFileSync(b)];
  console.log(`${mode}: ${ba.length} vs ${bb.length} bytes  ${ba.equals(bb) ? 'IDENTICOS' : 'distintos — comparar a ojo en ' + OUT}`);
}
await browser.close();
