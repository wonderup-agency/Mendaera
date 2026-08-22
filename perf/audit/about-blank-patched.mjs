// Verifica el cap de anti-flicker antes de publicarlo: sirve el HTML real con
// el bloque nuevo inyectado en la misma posicion del head que ocupa hoy el
// snippet de perf (despues del script de Intellimize) y mide el primer pixel.
//   node about-blank-patched.mjs [/ruta] [mobile|desktop] [--baseline]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { BASE, CHROME, SLOW_4G, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const route = process.argv.slice(2).find((a) => a.startsWith('/')) || '/about';
const mode = process.argv.includes('desktop') ? 'desktop' : 'mobile';
const baseline = process.argv.includes('--baseline');

// El mismo bloque que quedo en head-perf.html, extraido del archivo generado
const built = fs.readFileSync('../webflow/head-sitewide.html', 'utf8');
const m = built.match(/<script>\s*;\(function \(\) \{\s*\/\/ Webflow's Optimize[\s\S]*?\}\)\(\)\s*<\/script>/);
if (!m) throw new Error('no encontre el bloque de anti-flicker en head-sitewide.html');
const PATCH = m[0];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });
const page = await browser.newPage();
if (mode === 'mobile') { await page.setViewport(MOBILE_VIEWPORT); await page.setUserAgent(MOBILE_UA); }
else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const url = `${BASE}${route}`;
await page.setRequestInterception(true);
page.on('request', async (req) => {
  if (!baseline && req.url() === url && req.resourceType() === 'document') {
    const html = await fetch(url).then((r) => r.text());
    // Justo antes del snippet de perf que ya esta publicado
    const anchor = '<!-- ============================================================';
    const i = html.indexOf(anchor);
    if (i < 0) throw new Error('no encontre el snippet de perf en el HTML publicado');
    const patched = html.slice(0, i) + PATCH + '\n' + html.slice(i);
    return req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: patched });
  }
  req.continue();
});

const client = await page.target().createCDPSession();
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', SLOW_4G);
await client.send('Emulation.setCPUThrottlingRate', { rate: mode === 'mobile' ? 4 : 1 });

const t0 = Date.now();
const nav = page.goto(url, { waitUntil: 'load', timeout: 240000 });
let firstPaint = null, afGone = null;
const poll = setInterval(async () => {
  const t = Date.now() - t0;
  try {
    const st = await page.evaluate(() => ({
      af: document.documentElement.className.includes('anti-flicker'),
      vis: getComputedStyle(document.body).visibility,
    }));
    const buf = await page.screenshot({ encoding: 'binary' });
    const blank = buf.length < 12000;
    if (!blank && firstPaint == null) firstPaint = t;
    if (!st.af && afGone == null) afGone = t;
    console.log(`${String(t).padStart(6)} ms  ${blank ? 'EN BLANCO    ' : 'con contenido'}  anti-flicker=${st.af ? 'SI' : 'no '}  visibility=${st.vis}`);
  } catch {}
}, 150);
await nav.catch((e) => console.log('nav:', e.message));
clearInterval(poll);
console.log(`\n=== ${route} · ${mode} · ${baseline ? 'BASELINE (como esta publicado)' : 'CON EL CAP'} ===`);
console.log(`primer pixel de contenido : ${firstPaint} ms`);
console.log(`.anti-flicker se cae en   : ${afGone} ms`);
await browser.close();
