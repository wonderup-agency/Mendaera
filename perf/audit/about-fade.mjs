// Verifica el fade del poster antes de publicarlo: sirve el HTML real de prod
// con el bloque de About reemplazado por el de webflow/footer-about.html y
// loguea opacidad del video, fondo del wrapper y eventos del media element.
//   node about-fade.mjs [mobile|desktop] [--baseline]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { CHROME, SLOW_4G, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const mode = process.argv.includes('desktop') ? 'desktop' : 'mobile';
const baseline = process.argv.includes('--baseline');
const url = 'https://www.mendaera.com/about';

// El JS nuevo, sacado del bloque generado
const footer = fs.readFileSync('../webflow/footer-about.html', 'utf8');
const NEW_JS = footer.slice(footer.indexOf('<script>') + 8, footer.lastIndexOf('</script>'));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
if (mode === 'mobile') { await page.setViewport(MOBILE_VIEWPORT); await page.setUserAgent(MOBILE_UA); }
else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

await page.setRequestInterception(true);
page.on('request', async (req) => {
  if (req.url() === url && req.resourceType() === 'document') {
    const html = await fetch(url).then((r) => r.text());
    if (baseline) return req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    // El <script> inline de About: el unico que menciona los dos bloques
    const re = /<script>(?:(?!<\/script>)[\s\S])*references_about(?:(?!<\/script>)[\s\S])*<\/script>/;
    const m = html.match(re);
    if (!m) throw new Error('no encontre el script de About en el HTML publicado');
    return req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: html.replace(re, '<script>' + NEW_JS + '</script>') });
  }
  req.continue();
});
const client = await page.target().createCDPSession();
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', SLOW_4G);
await client.send('Emulation.setCPUThrottlingRate', { rate: mode === 'mobile' ? 4 : 1 });

page.on('console', (m) => { if (m.text().startsWith('VID')) console.log(m.text()); });
await page.evaluateOnNewDocument(() => {
  const T0 = performance.now();
  const t = () => String(Math.round(performance.now() - T0)).padStart(6);
  addEventListener('DOMContentLoaded', () => {
    const v = document.querySelector('[data-home-video="video"]');
    if (!v) return;
    ['loadeddata', 'playing', 'waiting'].forEach((e) =>
      v.addEventListener(e, () => console.log(`VID ${t()} ${e.padEnd(10)} readyState=${v.readyState}`)));
  });
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForSelector('[data-home-video="video"]');
await page.evaluate(() => document.querySelector('[data-home-video="video"]').scrollIntoView({ block: 'center' }));

const T = Date.now();
const seen = [];
for (let i = 0; i < 70; i++) {
  const st = await page.evaluate(() => {
    const v = document.querySelector('[data-home-video="video"]');
    const w = v.closest('[data-home-video="wrapper"]');
    return {
      opacity: +(+getComputedStyle(v).opacity).toFixed(2),
      fondo: getComputedStyle(w).backgroundImage === 'none' ? 'no' : 'poster',
      readyState: v.readyState,
    };
  }).catch(() => null);
  if (st) {
    const key = `${st.opacity}|${st.fondo}|${st.readyState}`;
    if (seen[seen.length - 1]?.key !== key) {
      seen.push({ key, t: Date.now() - T, ...st });
      console.log(`${String(Date.now() - T).padStart(6)} ms  opacidad-video=${String(st.opacity).padEnd(4)} fondo-wrapper=${st.fondo.padEnd(6)} readyState=${st.readyState}`);
    }
  }
  await new Promise((r) => setTimeout(r, 250));
}
console.log(`\n=== ${mode} · ${baseline ? 'BASELINE (publicado)' : 'CON EL FADE'} ===`);
await browser.close();
