// A/B: cuanto tiempo queda la pagina en blanco, y quien la tiene en blanco.
// Mide el momento del primer pixel de contenido y el estado de la clase
// .anti-flicker en <html> cada 100 ms.
//   node about-blank.mjs [ruta] [mobile|desktop] [--block-intellimize] [--block-fonts]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { BASE, CHROME, SLOW_4G, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const route = process.argv[2]?.startsWith('/') ? process.argv[2] : '/about';
const mode = process.argv.includes('desktop') ? 'desktop' : 'mobile';
const blockIM = process.argv.includes('--block-intellimize');
const blockFonts = process.argv.includes('--block-fonts');
const tag = [route.replace(/\W+/g, '') || 'home', mode, blockIM && 'noIM', blockFonts && 'noFonts'].filter(Boolean).join('.');
const OUT = path.join('out', `blank.${tag}`);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });
const page = await browser.newPage();
if (mode === 'mobile') { await page.setViewport(MOBILE_VIEWPORT); await page.setUserAgent(MOBILE_UA); }
else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

if (blockIM || blockFonts) {
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const u = r.url();
    if (blockIM && /intellimize/.test(u)) return r.abort();
    if (blockFonts && /\.(otf|woff2?|ttf)(\?|$)/.test(u)) return r.abort();
    r.continue();
  });
}
const client = await page.target().createCDPSession();
await client.send('Network.enable');
// FAST=1 mide sin throttling, para ver el numero de una conexion real de oficina
if (!process.env.FAST) {
  await client.send('Network.emulateNetworkConditions', SLOW_4G);
  await client.send('Emulation.setCPUThrottlingRate', { rate: mode === 'mobile' ? 4 : 1 });
}

const t0 = Date.now();
const nav = page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 240000 });

const samples = [];
let firstPaint = null, antiFlickerGone = null;
const poll = setInterval(async () => {
  const t = Date.now() - t0;
  try {
    const st = await page.evaluate(() => ({
      af: document.documentElement.className.includes('anti-flicker'),
      vis: getComputedStyle(document.body).visibility,
      ready: document.readyState,
    }));
    const buf = await page.screenshot({ encoding: 'binary' });
    // Un frame de un solo color comprime a casi nada: sirve de proxy de "en blanco"
    const blank = buf.length < 12000;
    samples.push({ t, ...st, png: buf.length, blank });
    if (!blank && firstPaint == null) firstPaint = t;
    if (!st.af && antiFlickerGone == null) antiFlickerGone = t;
  } catch {}
}, process.env.FAST ? 120 : 250);

await nav.catch((e) => console.log('nav:', e.message));
await new Promise((r) => setTimeout(r, 2500));
clearInterval(poll);
const loadT = Date.now() - t0;

console.log(`\n=== ${route} · ${mode}${blockIM ? ' · SIN intellimize' : ''}${blockFonts ? ' · SIN fuentes' : ''} ===`);
samples.forEach((s) => console.log(`${String(s.t).padStart(6)} ms  ${s.blank ? 'EN BLANCO' : 'con contenido'}  anti-flicker=${s.af ? 'SI' : 'no '}  body.visibility=${s.vis}  ${s.ready}`));
console.log(`\nprimer pixel de contenido : ${firstPaint} ms`);
console.log(`.anti-flicker se cae en    : ${antiFlickerGone} ms`);
console.log(`load                       : ${loadT} ms`);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ route, mode, blockIM, blockFonts, firstPaint, antiFlickerGone, loadT, samples }, null, 2));
await browser.close();
