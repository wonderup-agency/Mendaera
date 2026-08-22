// Sweeps every URL in the sitemap on staging: JS errors, 4xx, placeholder links, external hrefs.
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
import { CHROME } from './pages.mjs';
const BASE = 'https://mendaera-wup.webflow.io';

const xml = await (await fetch(BASE + '/sitemap.xml')).text();
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(/^https?:\/\/[^/]+/, '') || '/');
console.log(`${paths.length} URLs en el sitemap\n`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const all = [];
const PLACEHOLDER = /test\.com|example\.com|lorem|localhost|127\.0\.0\.1|yoursite|placeholder|#TODO|webflow\.io/i;

const visit = async (path) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errs = [], bad = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 130)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 130)); });
  page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(0, 110)); });
  let status = null;
  try { status = (await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 }))?.status(); }
  catch (e) { errs.push('NAV: ' + e.message.slice(0, 80)); }
  await new Promise((r) => setTimeout(r, 2500));
  const dom = await page.evaluate(() => {
    const out = { sospechosos: [], vacios: [], title: document.title, h1: document.querySelector('h1')?.textContent.trim().slice(0, 60) };
    document.querySelectorAll('a').forEach((a) => {
      const h = a.getAttribute('href');
      const t = (a.textContent.trim() || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 40);
      if (h === null || h.trim() === '') out.vacios.push(t || '(sin texto)');
      else out.sospechosos.push({ h, t });
    });
    return out;
  }).catch(() => ({ sospechosos: [], vacios: [] }));
  const susp = dom.sospechosos.filter((l) => PLACEHOLDER.test(l.h));
  await page.close();
  return { path, status, errs: [...new Set(errs)], bad: [...new Set(bad)], vacios: dom.vacios, susp, title: dom.title, h1: dom.h1 };
};

let i = 0;
const worker = async () => {
  while (i < paths.length) {
    const p = paths[i++];
    const r = await visit(p);
    all.push(r);
    const flags = [];
    if (r.status !== 200) flags.push('HTTP ' + r.status);
    if (r.errs.length) flags.push('JS: ' + r.errs.join(' ; '));
    if (r.bad.length) flags.push('4xx: ' + r.bad.join(' ; '));
    if (r.vacios.length) flags.push('links vacios: ' + r.vacios.join(', '));
    if (r.susp.length) flags.push('links sospechosos: ' + r.susp.map((s) => `"${s.t}" -> ${s.h}`).join(', '));
    if (flags.length) console.log(`${r.path}\n   ${flags.join('\n   ')}`);
  }
};
await Promise.all([worker(), worker(), worker()]);
await browser.close();
writeFileSync(new URL('./out/sweep.json', import.meta.url), JSON.stringify(all, null, 2));
console.log(`\n--- ${all.length} paginas barridas. Sin hallazgos en ${all.filter(r => r.status === 200 && !r.errs.length && !r.bad.length && !r.vacios.length && !r.susp.length).length}.`);
