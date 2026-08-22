// Cuando aparece la seccion Vision de About, y cuanto cambia con el poster de
// PASO-B. Scrollea hasta el video y mide cuando el <img>/poster tiene pixeles.
//   node about-vision.mjs [mobile|desktop] [--fix-poster] [--fix-poster --cap]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { BASE, CHROME, SLOW_4G, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const mode = process.argv.includes('desktop') ? 'desktop' : 'mobile';
const fixPoster = process.argv.includes('--fix-poster');
const cap = process.argv.includes('--cap');

const POSTER_OLD = '6a32e444ae0392e2fbaabdfa_thumb%20(17).jpg';
const POSTER_NEW = 'https://cdn.prod.website-files.com/682e3019357b268eba902b84/6a32e444ae0392e2fbaabdfa_thumb%20(17)-p-1080.avif';
const built = fs.readFileSync('../webflow/head-sitewide.html', 'utf8');
const PATCH = built.match(/<script>\s*;\(function \(\) \{\s*\/\/ Webflow's Optimize[\s\S]*?\}\)\(\)\s*<\/script>/)[0];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
if (mode === 'mobile') { await page.setViewport(MOBILE_VIEWPORT); await page.setUserAgent(MOBILE_UA); }
else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const url = `${BASE}/about`;
const newPosterBytes = fixPoster ? Buffer.from(await fetch(POSTER_NEW).then((r) => r.arrayBuffer())) : null;
await page.setRequestInterception(true);
page.on('request', async (req) => {
  if (cap && req.url() === url && req.resourceType() === 'document') {
    const html = await fetch(url).then((r) => r.text());
    const i = html.indexOf('<!-- ============================================================');
    return req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: html.slice(0, i) + PATCH + '\n' + html.slice(i) });
  }
  if (fixPoster && req.url().includes(POSTER_OLD)) {
    return req.respond({ status: 200, contentType: 'image/avif', body: newPosterBytes });
  }
  req.continue();
});
const client = await page.target().createCDPSession();
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', SLOW_4G);
await client.send('Emulation.setCPUThrottlingRate', { rate: mode === 'mobile' ? 4 : 1 });

const t0 = Date.now();
let posterDone = null, mediaBytes = 0;
client.on('Network.loadingFinished', () => {});
client.on('Network.responseReceived', (e) => {
  if (e.response.url.includes(POSTER_OLD.slice(0, 24)) && posterDone == null) posterDone = Date.now() - t0;
});
client.on('Network.dataReceived', (e) => { mediaBytes += e.encodedDataLength || e.dataLength; });

const nav = page.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 });
await nav.catch(() => {});
// Scroll a la seccion Vision, como haria el usuario
let visionReady = null, visionVisible = null;
const deadline = Date.now() + 25000;
while (Date.now() < deadline) {
  const st = await page.evaluate(() => {
    const v = document.querySelector('[data-component="home-video"] [data-home-video="video"]');
    if (!v) return null;
    const r = v.getBoundingClientRect();
    if (r.top > innerHeight * 0.4 || r.bottom < innerHeight * 0.4) v.scrollIntoView({ block: 'center' });
    const img = new Image();
    img.src = v.getAttribute('poster');
    return {
      posterComplete: img.complete && img.naturalWidth > 0,
      afterCurtain: !document.documentElement.className.includes('anti-flicker'),
      readyState: v.readyState,
      inView: v.getBoundingClientRect().top < innerHeight && v.getBoundingClientRect().bottom > 0,
    };
  }).catch(() => null);
  const t = Date.now() - t0;
  if (st?.posterComplete && posterReady(st) && visionReady == null) visionReady = t;
  if (st?.readyState >= 2 && visionVisible == null) visionVisible = t;
  if (visionReady && visionVisible) break;
  await new Promise((r) => setTimeout(r, 200));
}
function posterReady(st) { return st.afterCurtain && st.inView; }

const label = `${mode}${cap ? ' + cap anti-flicker' : ''}${fixPoster ? ' + poster -p-1080.avif' : ''}`;
console.log(`\n=== Vision · ${label} ===`);
console.log(`poster descargado          : ${posterDone} ms`);
console.log(`seccion visible con imagen : ${visionReady} ms`);
console.log(`video con primer frame     : ${visionVisible ?? 'no llego en 25 s'}`);
console.log(`bytes totales en 25 s      : ${(mediaBytes / 1048576).toFixed(1)} MB`);
await browser.close();
