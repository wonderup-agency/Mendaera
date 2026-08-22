// Repro: About — "queda en blanco ni bien scrolleo y luego carga".
// Scrollea desde el primer momento (sin esperar el load, que es lo que hace el
// usuario real) y saca captura + estado de video/imagenes en cada paso.
//   node about-scroll.mjs mobile|desktop [--wait-load]
// Salida: out/about-scroll.<mode>/
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { BASE, CHROME, SLOW_4G, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const mode = (process.argv[2] || 'mobile').replace(/^--.*/, 'mobile');
const waitLoad = process.argv.includes('--wait-load');
const OUT = path.join('out', `about-scroll.${mode}${waitLoad ? '.afterload' : ''}`);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
if (mode === 'mobile') {
  await page.setViewport(MOBILE_VIEWPORT);
  await page.setUserAgent(MOBILE_UA);
} else {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
}
const client = await page.target().createCDPSession();
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', SLOW_4G);
await client.send('Emulation.setCPUThrottlingRate', { rate: mode === 'mobile' ? 4 : 1 });

let t0 = Date.now();
const reqs = new Map();
client.on('Network.requestWillBeSent', (e) => {
  reqs.set(e.requestId, { url: e.request.url, start: Date.now() - t0, bytes: 0, type: e.type });
});
client.on('Network.dataReceived', (e) => {
  const r = reqs.get(e.requestId);
  if (r) { r.bytes += e.encodedDataLength || e.dataLength; r.last = Date.now() - t0; }
});
client.on('Network.loadingFinished', (e) => {
  const r = reqs.get(e.requestId);
  if (r) { r.end = Date.now() - t0; r.enc = e.encodedDataLength; }
});

const steps = [];
async function probe(label) {
  const t = Date.now() - t0;
  const name = `${String(steps.length).padStart(2, '0')}-${label}.png`;
  await page.screenshot({ path: path.join(OUT, name) }).catch(() => {});
  const info = await page.evaluate(() => {
    const vp = { w: innerWidth, h: innerHeight };
    const vids = [...document.querySelectorAll('video')].map((v) => {
      const r = v.getBoundingClientRect();
      const visible = Math.max(0, Math.min(r.bottom, vp.h) - Math.max(r.top, 0));
      return {
        inView: visible > 0,
        coversViewport: +(visible / vp.h).toFixed(2),
        armed: !!(v.currentSrc || v.getAttribute('src') || v.querySelector('source[src]')),
        readyState: v.readyState,
        paused: v.paused,
        buffered: v.buffered.length ? +v.buffered.end(0).toFixed(1) : 0,
        posterLoaded: null,
        poster: (v.poster || (v.getAttribute('poster') || '')).split('/').pop().slice(0, 34),
      };
    });
    const lazyPending = [...document.querySelectorAll('img[loading="lazy"]')].filter((img) => {
      const r = img.getBoundingClientRect();
      return r.top < vp.h && r.bottom > 0 && !img.complete;
    }).length;
    const hiddenByJs = [...document.querySelectorAll('.team_item, [data-counter]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < vp.h && r.bottom > 0 && parseFloat(getComputedStyle(el).opacity) < 0.5;
    }).length;
    return { scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight, vids, lazyPending, hiddenByJs, ready: document.readyState };
  }).catch(() => null);
  if (!info) return;
  steps.push({ t, label, ...info });
  const pinned = info.vids.find((v) => v.coversViewport > 0.85);
  console.log(`${name}  t=${String(t).padStart(6)}ms  y=${String(info.scrollY).padStart(5)}  ${info.ready}  imgs-pend=${info.lazyPending} ocultos=${info.hiddenByJs}${pinned ? '  << VIDEO OCUPA EL VIEWPORT' : ''}`);
  info.vids.forEach((v, i) => {
    if (!v.inView) return;
    console.log(`    video${i}  viewport=${(v.coversViewport * 100).toFixed(0)}%  armed=${v.armed} readyState=${v.readyState} buf=${v.buffered}s poster=${v.poster}`);
  });
}

// Scroll desde el arranque, sin esperar el load
const nav = page.goto(`${BASE}/about`, { waitUntil: 'load', timeout: 240000 });
t0 = Date.now();
let y = 0;
const scrollLoop = (async () => {
  if (waitLoad) return;
  await new Promise((r) => setTimeout(r, 900));
  for (let i = 0; i < 14; i++) {
    y += 500;
    await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y).catch(() => {});
    await probe(`scroll-${y}`);
    await new Promise((r) => setTimeout(r, 900));
  }
})();
await nav.catch((e) => console.log('nav:', e.message));
const loadT = Date.now() - t0;
console.log(`\n>>> load a los ${loadT} ms  (y=${y})\n`);
await scrollLoop;

for (let i = 0; i < 8; i++) {
  y += 700;
  await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y).catch(() => {});
  await probe(`post-${y}`);
  await new Promise((r) => setTimeout(r, 1100));
}

const all = [...reqs.values()].map((r) => ({
  kb: Math.round((r.enc || r.bytes) / 1024),
  start: r.start, end: r.end ?? r.last ?? null, type: r.type, url: r.url,
}));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ loadT, steps, net: all }, null, 2));
console.log('--- media / imagenes / fuentes, por bytes ---');
all.filter((r) => r.kb >= 20).sort((a, b) => b.kb - a.kb).slice(0, 20)
  .forEach((r) => console.log(`${String(r.kb).padStart(6)} KB  ${String(r.start).padStart(6)}→${String(r.end).padStart(6)} ms  ${String(r.type).padEnd(11)} ${r.url.split('/').slice(-2).join('/').slice(0, 70)}`));
const media = all.filter((r) => /vimeo|\.mp4/.test(r.url));
console.log(`\n--- video: ${media.length} requests, ${Math.round(media.reduce((a, b) => a + b.kb, 0) / 1024 * 10) / 10} MB ---`);
media.forEach((r) => console.log(`${String(r.kb).padStart(6)} KB  ${String(r.start).padStart(6)}→${String(r.end).padStart(6)} ms  ${r.url.match(/rendition\/[0-9pk]+/)?.[0] || r.url.slice(0, 60)}`));
await browser.close();
