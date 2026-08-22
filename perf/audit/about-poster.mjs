// La transicion poster -> primer frame del video de About: donde aparece el
// blanco. Loguea los eventos del <video>, readyState y el tamano de la caja.
//   node about-poster.mjs [mobile|desktop] [--prod]
import puppeteer from 'puppeteer-core';
import { BASE, CHROME, SLOW_4G, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const mode = process.argv.includes('desktop') ? 'desktop' : 'mobile';
const base = process.argv.includes('--prod') ? 'https://www.mendaera.com' : BASE;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
if (mode === 'mobile') { await page.setViewport(MOBILE_VIEWPORT); await page.setUserAgent(MOBILE_UA); }
else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const client = await page.target().createCDPSession();
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', SLOW_4G);
await client.send('Emulation.setCPUThrottlingRate', { rate: mode === 'mobile' ? 4 : 1 });

page.on('console', (m) => { if (m.text().startsWith('VID')) console.log(m.text()); });

await page.evaluateOnNewDocument(() => {
  const T0 = performance.now();
  const t = () => String(Math.round(performance.now() - T0)).padStart(6);
  const seen = new WeakSet();
  const EVENTS = ['loadstart', 'emptied', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'waiting', 'stalled', 'suspend', 'error'];
  function box(v) {
    const r = v.getBoundingClientRect();
    return `caja=${Math.round(r.width)}x${Math.round(r.height)} intrinseco=${v.videoWidth}x${v.videoHeight}`;
  }
  function watch(v, i) {
    if (seen.has(v)) return;
    seen.add(v);
    const posterImg = new Image();
    posterImg.onload = () => console.log(`VID ${t()} v${i} poster cargado ${posterImg.naturalWidth}x${posterImg.naturalHeight}`);
    posterImg.src = v.getAttribute('poster') || '';
    EVENTS.forEach((e) => v.addEventListener(e, () => console.log(`VID ${t()} v${i} ${e.padEnd(15)} readyState=${v.readyState} ${box(v)}`)));
    // requestVideoFrameCallback avisa cuando hay un frame realmente pintado
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => console.log(`VID ${t()} v${i} PRIMER FRAME PINTADO  ${box(v)}`));
  }
  addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('video[data-home-video="video"]').forEach(watch);
  });
});

await page.goto(`${base}/about`, { waitUntil: 'domcontentloaded', timeout: 240000 });
// Deja el primer video en el centro del viewport y espera
await page.waitForSelector('[data-home-video="video"]');
await page.evaluate(() => document.querySelector('[data-home-video="video"]').scrollIntoView({ block: 'center' }));
await new Promise((r) => setTimeout(r, 20000));
await browser.close();
