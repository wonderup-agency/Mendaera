// Waterfall real con throttling APLICADO (no el simulado de Lighthouse).
// Es la unica forma de ver la contencion de ancho de banda: cuantos bytes
// entran en la cola antes del primer pixel de contenido y quien los ocupa.
//
//   node waterfall.mjs                 # home mobile
//   node waterfall.mjs technology      # otra pagina
//   node waterfall.mjs home desktop
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { BASE, PAGES, CHROME, SLOW_4G, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const NAME = process.argv[2] || 'home';
const DEV = process.argv[3] || 'mobile';
const path = (PAGES.find(([n]) => n === NAME) || [])[1];
if (!path) { console.error(`pagina desconocida: ${NAME}. Opciones: ${PAGES.map(([n]) => n).join(', ')}`); process.exit(1); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell',
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const cdp = await page.createCDPSession();

if (DEV === 'mobile') { await page.setViewport(MOBILE_VIEWPORT); await page.setUserAgent(MOBILE_UA); }
else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', SLOW_4G);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: DEV === 'mobile' ? 4 : 1 });

const reqs = new Map();
let t0 = null;
cdp.on('Network.requestWillBeSent', (e) => {
  t0 ??= e.timestamp;
  reqs.set(e.requestId, { url: e.request.url, type: e.type, prio: e.request.initialPriority, start: (e.timestamp - t0) * 1000 });
});
cdp.on('Network.dataReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = (r.bytes || 0) + e.encodedDataLength; });
cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.end = (e.timestamp - t0) * 1000; r.total = e.encodedDataLength; } });

page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 240000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 14000));

const fcp = await page.evaluate(() => {
  const e = performance.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint');
  return e ? Math.round(e.startTime) : null;
}).catch(() => null);

const rows = [...reqs.values()].filter((r) => r.start != null).sort((a, b) => a.start - b.start);
const isVideo = (r) => /vimeo/.test(r.url);
const kb = (n) => ((n || 0) / 1024).toFixed(0);

console.log(`\n########## ${NAME} · ${DEV} · slow 4G, CPU ${DEV === 'mobile' ? '4x' : '1x'}`);
console.log(`\nFCP: ${fcp} ms`);

let pre = 0, preVideo = 0;
for (const r of rows) if (r.start < fcp) { pre += r.bytes || 0; if (isVideo(r)) preVideo += r.bytes || 0; }
console.log(`Bytes en vuelo antes del FCP: ${kb(pre)} KB  (de eso video: ${kb(preVideo)} KB)`);

console.log('\n=== TOP 15 POR BYTES ===');
for (const r of [...rows].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 15)) {
  console.log(`  ${kb(r.total).padStart(7)} KB  start=${r.start.toFixed(0).padStart(5)} end=${(r.end || 0).toFixed(0).padStart(6)} prio=${String(r.prio).padEnd(9)} ${r.type.padEnd(10)} ${r.url.replace(/^https?:\/\//, '').slice(0, 68)}`);
}

const fonts = rows.filter((r) => /\.otf|\.woff/.test(r.url));
if (fonts.length) {
  console.log('\n=== FUENTES (si terminan tarde, algo les come el ancho de banda) ===');
  for (const r of fonts) console.log(`  ${kb(r.total).padStart(6)} KB start=${r.start.toFixed(0).padStart(5)} end=${(r.end || 0).toFixed(0).padStart(6)}  ${r.url.split('_').at(-1)}`);
}

const sum = {};
for (const r of rows) { const k = isVideo(r) ? 'video' : r.type; (sum[k] ??= { n: 0, b: 0 }); sum[k].n++; sum[k].b += r.total || r.bytes || 0; }
console.log('\n=== RESUMEN POR TIPO (14 s) ===');
for (const [k, v] of Object.entries(sum).sort((a, b) => b[1].b - a[1].b)) {
  console.log(`  ${k.padEnd(12)} ${String(v.n).padStart(3)} req  ${(v.b / 1024 / 1024).toFixed(2).padStart(8)} MB`);
}

fs.mkdirSync('out', { recursive: true });
fs.writeFileSync(`out/waterfall.${NAME}.${DEV}.json`, JSON.stringify({ fcp, rows }, null, 1));
await browser.close();
