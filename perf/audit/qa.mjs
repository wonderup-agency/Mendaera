// Pre-deploy QA crawl: JS errors, failed requests, empty/broken links, media and
// markup issues. Usage: node qa.mjs [base-url]
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { CHROME, BASE as DEFAULT_BASE } from './pages.mjs';

const BASE = (process.argv[2] || process.env.BASE || DEFAULT_BASE).replace(/\/$/, '');
const MAX_PAGES = Number(process.env.MAX_PAGES || 40);
const origin = new URL(BASE).origin;

const SEEDS = ['/', '/technology', '/about', '/news-and-events', '/careers',
  '/resources', '/contact-us'];

const norm = (u) => {
  try {
    const x = new URL(u, BASE);
    x.hash = '';
    if (x.pathname.length > 1) x.pathname = x.pathname.replace(/\/$/, '');
    return x.href;
  } catch { return null; }
};

const queue = [...new Set(SEEDS.map((p) => norm(p)))];
const seen = new Set(queue);
const results = [];
const allLinks = new Map(); // href -> Set of pages where it appears

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (let i = 0; i < queue.length && i < MAX_PAGES; i++) {
  const url = queue[i];
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const rec = {
    url, status: null, consoleErrors: [], pageErrors: [], failedRequests: [],
    badResponses: [],
  };

  page.on('pageerror', (e) => rec.pageErrors.push(String(e.message || e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') rec.consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText || '';
    if (err === 'net::ERR_ABORTED') return; // media range aborts, noisy and harmless
    rec.failedRequests.push({ url: r.url().slice(0, 200), err, type: r.resourceType() });
  });
  page.on('response', (r) => {
    if (r.status() >= 400) {
      rec.badResponses.push({ url: r.url().slice(0, 200), status: r.status(), type: r.request().resourceType() });
    }
  });

  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    rec.status = resp?.status() ?? null;
  } catch (e) {
    rec.navError = String(e.message).slice(0, 200);
  }

  // Let deferred JS / animations settle so late errors surface too.
  await new Promise((r) => setTimeout(r, 3000));
  try { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); } catch {}
  await new Promise((r) => setTimeout(r, 2500));

  let dom = {};
  try {
    dom = await page.evaluate(() => {
      const out = {
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content || null,
        canonical: document.querySelector('link[rel="canonical"]')?.href || null,
        h1s: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()).filter(Boolean),
        links: [], emptyLinks: [], hashLinks: [], jsLinks: [], noTextLinks: [],
        deadAnchors: [], images: [], videos: [], dupIds: [], emptyText: [],
        forms: [], newTabNoRel: [], mixedContent: [],
      };
      const ids = {};
      document.querySelectorAll('[id]').forEach((el) => {
        ids[el.id] = (ids[el.id] || 0) + 1;
      });
      out.dupIds = Object.entries(ids).filter(([, n]) => n > 1).map(([id, n]) => `${id} (x${n})`);

      const label = (a) => (a.textContent.trim()
        || a.getAttribute('aria-label')
        || a.querySelector('img')?.alt
        || a.querySelector('svg')?.getAttribute('aria-label')
        || '').replace(/\s+/g, ' ').slice(0, 60);

      document.querySelectorAll('a').forEach((a) => {
        const raw = a.getAttribute('href');
        const txt = label(a);
        const where = a.closest('nav,footer,header')?.tagName?.toLowerCase()
          || a.closest('[class*="footer"]') ? 'footer/nav' : 'body';
        const entry = { href: raw, text: txt, where, cls: a.className.slice(0, 80) };
        if (raw === null) { out.emptyLinks.push({ ...entry, why: 'sin atributo href' }); return; }
        const t = raw.trim();
        if (t === '') { out.emptyLinks.push({ ...entry, why: 'href vacio' }); return; }
        if (t === '#') { out.hashLinks.push(entry); return; }
        if (/^javascript:/i.test(t)) { out.jsLinks.push(entry); return; }
        if (t.startsWith('#')) {
          if (!document.querySelector(`[id="${CSS.escape(t.slice(1))}"]`)
              && !document.querySelector(`a[name="${CSS.escape(t.slice(1))}"]`)) {
            out.deadAnchors.push(entry);
          }
          return;
        }
        if (/^https?:\/\//i.test(a.href)) {
          if (!txt) out.noTextLinks.push(entry);
          if (a.target === '_blank' && !/noopener/.test(a.rel || '')) out.newTabNoRel.push(entry);
          if (/^http:\/\//i.test(a.href)) out.mixedContent.push({ ...entry, kind: 'a' });
          out.links.push({ href: a.href, text: txt });
        }
      });

      document.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src');
        const rec = {
          src: (src || '').slice(0, 160), alt: img.getAttribute('alt'),
          broken: img.complete && img.naturalWidth === 0,
          missingSrc: !src || !src.trim(),
        };
        if (rec.broken || rec.missingSrc || rec.alt === null) out.images.push(rec);
        if (/^http:\/\//i.test(img.currentSrc || '')) out.mixedContent.push({ kind: 'img', href: img.currentSrc });
      });

      document.querySelectorAll('video').forEach((v) => {
        const src = v.getAttribute('src') || v.querySelector('source')?.getAttribute('src')
          || v.dataset.src || v.getAttribute('data-src') || '';
        out.videos.push({
          id: v.id || null, src: src.slice(0, 120), poster: v.getAttribute('poster') || null,
          empty: !src.trim(), error: v.error ? v.error.code : null,
        });
      });

      document.querySelectorAll('form').forEach((f) => {
        out.forms.push({ action: f.getAttribute('action'), name: f.getAttribute('name') || f.id || null });
      });

      // Visible elements whose text still looks like a placeholder.
      const ph = /lorem ipsum|placeholder|coming soon|tbd|xxx+|test test/i;
      document.querySelectorAll('h1,h2,h3,h4,p,a,li,span').forEach((el) => {
        const t = el.textContent.trim();
        if (t && t.length < 200 && ph.test(t) && el.offsetParent !== null) out.emptyText.push(t.slice(0, 90));
      });
      out.emptyText = [...new Set(out.emptyText)];
      return out;
    });
  } catch (e) {
    dom.evalError = String(e.message).slice(0, 200);
  }

  Object.assign(rec, dom);
  results.push(rec);
  process.stderr.write(`[${i + 1}] ${rec.status} ${url}  errs:${rec.pageErrors.length + rec.consoleErrors.length} 4xx:${rec.badResponses.length}\n`);

  for (const l of dom.links || []) {
    if (!allLinks.has(l.href)) allLinks.set(l.href, { text: l.text, pages: new Set() });
    allLinks.get(l.href).pages.add(url);
    const n = norm(l.href);
    if (n && n.startsWith(origin) && !seen.has(n) && !/\.(pdf|jpg|png|zip|mp4|svg|webp|avif)$/i.test(n)) {
      seen.add(n); queue.push(n);
    }
  }
  await page.close();
}

await browser.close();

mkdirSync(new URL('./out', import.meta.url), { recursive: true });
const payload = {
  base: BASE,
  pagesCrawled: results.length,
  results,
  links: [...allLinks].map(([href, v]) => ({ href, text: v.text, pages: [...v.pages] })),
};
writeFileSync(new URL('./out/qa.json', import.meta.url), JSON.stringify(payload, null, 2));
console.log(`\nOK. ${results.length} paginas, ${allLinks.size} links unicos -> out/qa.json`);
