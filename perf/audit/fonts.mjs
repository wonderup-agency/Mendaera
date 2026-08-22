// Compara cada .woff2 convertido contra su .otf original renderizando los dos
// en Chrome: measureText + bitmap del canvas, pixel a pixel.
//
// Verificar que un archivo comprime no dice nada sobre si renderiza igual. Esto sí.
//
//   node fonts.mjs <dir-otf> <dir-woff2>
//   node fonts.mjs ~/Downloads/otf ../assets/fonts-woff2
//
// Empareja por nombre de archivo: Foo.otf <-> Foo.woff2
import fs from 'node:fs';
import http from 'node:http';
import puppeteer from 'puppeteer-core';
import { CHROME } from './pages.mjs';

const OTF_DIR = process.argv[2];
const W2_DIR = process.argv[3];
if (!OTF_DIR || !W2_DIR) {
  console.error('uso: node fonts.mjs <dir-otf> <dir-woff2>');
  process.exit(1);
}

const PORT = 8210;
const srv = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end('<!doctype html><meta charset="utf-8"><title>font test</title><body>');
  }
  const [which, ...rest] = decodeURIComponent(req.url.slice(1)).split('/');
  if ((which !== 'otf' && which !== 'w2') || !rest.length) { res.writeHead(404); return res.end(); }
  const file = (which === 'otf' ? OTF_DIR : W2_DIR) + '/' + rest.join('/');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': which === 'otf' ? 'font/otf' : 'font/woff2' });
  res.end(fs.readFileSync(file));
}).listen(PORT);

const pairs = fs.readdirSync(OTF_DIR).filter((f) => f.endsWith('.otf')).sort()
  .map((f) => ({ name: f.replace('.otf', ''), otf: 'otf/' + f, w2: 'w2/' + f.replace('.otf', '.woff2') }))
  .filter((p) => fs.existsSync(W2_DIR + '/' + p.w2.slice(3)));

if (!pairs.length) { console.error('no se encontro ningun par .otf/.woff2'); srv.close(); process.exit(1); }

// Textos elegidos para tocar kerning, ligaduras, acentos y puntuacion tipografica
const SAMPLES = [
  'Elevating procedural medicine.',
  'Skill that scales. Care that works.',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789 ¿?¡!@#$%&*()[]{}',
  'áéíóúñÁÉÍÓÚÑ üÜ çÇ – — “ ” ‘ ’ €',
  'AV Ta To Wa fi fl ffi ffl',
  'Mendaera Focalist™ System',
];
const SIZES = [16, 48, 120];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 400, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });

const results = await page.evaluate(async (pairs, SAMPLES, SIZES) => {
  const cv = document.createElement('canvas');
  cv.width = 2400; cv.height = 200;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const out = [];

  const load = async (fam, url) => {
    const ff = new FontFace(fam, `url(/${url})`);
    await ff.load();
    document.fonts.add(ff);
  };
  const render = (fam, text, size) => {
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    cx.fillStyle = '#000'; cx.font = `${size}px "${fam}"`; cx.textBaseline = 'alphabetic';
    cx.fillText(text, 10, 140);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    let h = 2166136261, ink = 0;
    for (let i = 0; i < d.length; i += 4) { const v = d[i]; if (v < 250) ink++; h = ((h ^ v) * 16777619) >>> 0; }
    return { h, ink };
  };
  const metrics = (fam, text, size) => {
    cx.font = `${size}px "${fam}"`;
    const m = cx.measureText(text);
    return [m.width, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent,
      m.fontBoundingBoxAscent, m.fontBoundingBoxDescent].map((n) => Math.round(n * 1000) / 1000);
  };

  for (const p of pairs) {
    const A = 'A_' + p.name.replace(/\W/g, ''), B = 'B_' + p.name.replace(/\W/g, '');
    try { await load(A, p.otf); await load(B, p.w2); }
    catch (e) { out.push({ name: p.name, loaded: false, err: String(e) }); continue; }
    const diffs = [];
    for (const s of SAMPLES) for (const size of SIZES) {
      const ma = metrics(A, s, size), mb = metrics(B, s, size);
      const ra = render(A, s, size), rb = render(B, s, size);
      const metricSame = ma.every((v, i) => Math.abs(v - mb[i]) < 0.01);
      const pixelSame = ra.h === rb.h && ra.ink === rb.ink;
      if (!metricSame || !pixelSame) diffs.push({ s: s.slice(0, 24), size, ma, mb, inkA: ra.ink, inkB: rb.ink, metricSame, pixelSame });
    }
    out.push({ name: p.name, loaded: true, diffs, ink: render(B, SAMPLES[0], 48).ink });
  }
  return out;
}, pairs, SAMPLES, SIZES);

const combos = SAMPLES.length * SIZES.length;
console.log(`\n${'fuente'.padEnd(30)} ${'carga'.padEnd(7)} ${'tinta'.padEnd(8)} resultado`);
console.log('-'.repeat(80));
let bad = 0;
for (const r of results) {
  if (!r.loaded) { console.log(`${r.name.padEnd(30)} FALLA   ${(r.err || '').slice(0, 40)}`); bad++; continue; }
  const ok = !r.diffs.length;
  if (!ok) bad++;
  console.log(`${r.name.padEnd(30)} ${'OK'.padEnd(7)} ${String(r.ink).padEnd(8)} ${ok ? `idéntica al OTF en ${combos} combinaciones` : `${r.diffs.length} DIFERENCIAS`}`);
  for (const d of r.diffs.slice(0, 3)) {
    console.log(`     "${d.s}" @${d.size}px  métricas=${d.metricSame ? 'igual' : 'DISTINTAS ' + JSON.stringify(d.ma) + ' vs ' + JSON.stringify(d.mb)}  pixeles=${d.pixelSame ? 'igual' : `DISTINTOS ${d.inkA} vs ${d.inkB}`}`);
  }
}
console.log('-'.repeat(80));
console.log(bad ? `${bad} de ${results.length} con problemas` : `Las ${results.length} cargan y renderizan pixel a pixel igual que el OTF (${results.length * combos} comparaciones)`);
await browser.close();
srv.close();
