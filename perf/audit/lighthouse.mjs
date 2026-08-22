// Corre Lighthouse sobre las paginas del alcance y reporta la mediana.
//
//   node lighthouse.mjs                    # mobile, 3 corridas, todas
//   node lighthouse.mjs desktop            # desktop
//   node lighthouse.mjs mobile 5           # 5 corridas
//   node lighthouse.mjs mobile 3 home      # solo home
//
// Guarda cada reporte JSON en out/ para poder mirar audits sueltos despues.
import fs from 'node:fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { BASE, PAGES, median } from './pages.mjs';

const FORM = process.argv[2] || 'mobile';
const RUNS = Number(process.argv[3] || 3);
const ONLY = process.argv[4];

const desktop = {
  formFactor: 'desktop',
  screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
  throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
};

fs.mkdirSync('out', { recursive: true });
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
const summary = [];

for (const [name, path] of PAGES) {
  if (ONLY && name !== ONLY) continue;
  const runs = [];
  for (let i = 1; i <= RUNS; i++) {
    try {
      const res = await lighthouse(BASE + path,
        { port: chrome.port, output: 'json', logLevel: 'error' },
        { extends: 'lighthouse:default', settings: { onlyCategories: ['performance'], ...(FORM === 'desktop' ? desktop : {}) } });
      const a = res.lhr.audits;
      runs.push({
        score: Math.round(res.lhr.categories.performance.score * 100),
        lcp: Math.round(a['largest-contentful-paint'].numericValue),
        fcp: Math.round(a['first-contentful-paint'].numericValue),
        tbt: Math.round(a['total-blocking-time'].numericValue),
        si:  Math.round(a['speed-index'].numericValue),
        cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
        kb:  Math.round(a['total-byte-weight'].numericValue / 1024),
      });
      fs.writeFileSync(`out/${name}.${FORM}.${i}.json`, res.report);
    } catch (e) {
      console.error(`  ${name} corrida ${i} fallo: ${e.message}`);
    }
  }
  if (!runs.length) continue;
  const m = (k) => median(runs.map((r) => r[k]));
  const s = { name, score: m('score'), lcp: m('lcp'), fcp: m('fcp'), tbt: m('tbt'), si: m('si'), cls: m('cls'), kb: m('kb'), runs: runs.map((r) => r.score) };
  summary.push(s);
  console.log(`${name.padEnd(20)} score=${String(s.score).padStart(3)}  LCP=${String(s.lcp).padStart(5)}  FCP=${String(s.fcp).padStart(5)}  TBT=${String(s.tbt).padStart(5)}  SI=${String(s.si).padStart(5)}  CLS=${s.cls}  ${String(s.kb).padStart(6)}KB   (corridas ${s.runs.join('/')})`);
}

await chrome.kill();
fs.writeFileSync(`out/summary.${FORM}.json`, JSON.stringify(summary, null, 1));
console.log(`\nmediana de ${RUNS} corridas por pagina · ${FORM} · reportes en out/`);
