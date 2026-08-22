// Que hace Intellimize en el sitio: compara el DOM final con y sin el snippet.
// Si el DOM es identico, los 4 s de anti-flicker no estan tapando nada.
import puppeteer from 'puppeteer-core';
import { BASE, CHROME } from './pages.mjs';

const routes = process.argv.slice(2).filter((a) => a.startsWith('/'));
const ROUTES = routes.length ? routes : ['/', '/about', '/technology'];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });

async function snapshot(route, block) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  if (block) {
    await page.setRequestInterception(true);
    page.on('request', (r) => (/intellimize/.test(r.url()) ? r.abort() : r.continue()));
  }
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 3500));
  const out = await page.evaluate(() => {
    const clean = document.body.cloneNode(true);
    // Ruido que cambia entre corridas y no tiene que ver con el experimento
    clean.querySelectorAll('script,iframe,style').forEach((n) => n.remove());
    clean.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((a) => {
        if (/^(style|data-gsap|data-md|class)$/.test(a.name) || /^(aria-|data-w-id)/.test(a.name)) return;
      });
    });
    return {
      html: clean.innerHTML.replace(/\s+/g, ' ').trim(),
      text: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
      nodes: document.body.querySelectorAll('*').length,
      hiddenVariations: document.querySelectorAll('[data-wf-hidden-variation]').length,
      imActive: !!(window.intellimize && window.intellimize.activeExperiments),
      imKeys: window.intellimize ? Object.keys(window.intellimize).slice(0, 25) : null,
    };
  });
  await page.close();
  return out;
}

for (const route of ROUTES) {
  const [on, off] = [await snapshot(route, false), await snapshot(route, true)];
  const sameText = on.text === off.text;
  const sameHtml = on.html === off.html;
  console.log(`\n=== ${route} ===`);
  console.log(`nodos            con=${on.nodes}  sin=${off.nodes}`);
  console.log(`texto visible    ${sameText ? 'IDENTICO' : 'DISTINTO'}`);
  console.log(`markup           ${sameHtml ? 'IDENTICO' : 'DISTINTO'}`);
  console.log(`[data-wf-hidden-variation]  con=${on.hiddenVariations}  sin=${off.hiddenVariations}`);
  console.log(`window.intellimize keys: ${JSON.stringify(on.imKeys)}`);
  if (!sameText) {
    const a = on.text.split(' '), b = off.text.split(' ');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) { console.log(`  primera diferencia de texto en la palabra ${i}:\n   con: …${a.slice(Math.max(0, i - 8), i + 12).join(' ')}…\n   sin: …${b.slice(Math.max(0, i - 8), i + 12).join(' ')}…`); break; }
    }
  }
}
await browser.close();
