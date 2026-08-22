// Checks every unique link collected by qa.mjs and reports its HTTP status.
import { readFileSync, writeFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(new URL('./out/qa.json', import.meta.url), 'utf8'));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const hit = async (url, method) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 20000);
  try {
    const r = await fetch(url, { method, redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA, Accept: '*/*' } });
    return { status: r.status, final: r.url };
  } finally { clearTimeout(t); }
};

const out = [];
const links = d.links.filter((l) => /^https?:/i.test(l.href));
let i = 0;
const worker = async () => {
  while (i < links.length) {
    const l = links[i++];
    let res;
    try {
      res = await hit(l.href, 'HEAD');
      if (res.status >= 400 || res.status === 405) res = await hit(l.href, 'GET');
    } catch (e) {
      try { res = await hit(l.href, 'GET'); }
      catch (e2) { res = { status: 'ERR', err: String(e2.message).slice(0, 80) }; }
    }
    out.push({ ...l, ...res });
    if (res.status === 'ERR' || res.status >= 400) {
      console.log(`  ${res.status} ${l.href}  (texto: "${l.text}")`);
    }
  }
};
console.log(`Chequeando ${links.length} links...\n--- problemas ---`);
await Promise.all(Array.from({ length: 8 }, worker));
writeFileSync(new URL('./out/links.json', import.meta.url), JSON.stringify(out, null, 2));
const bad = out.filter((o) => o.status === 'ERR' || o.status >= 400);
const redir = out.filter((o) => typeof o.status === 'number' && o.status < 400 && o.final && o.final.replace(/\/$/, '') !== o.href.replace(/\/$/, ''));
console.log(`\n${out.length} chequeados, ${bad.length} con problema, ${redir.length} con redirect.`);
console.log('--- redirects ---');
for (const r of redir) console.log(`  ${r.href}  ->  ${r.final}`);
