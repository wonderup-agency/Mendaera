// Proves whether the form can be submitted. Nothing leaves the browser: every
// non-GET request and every Webflow form endpoint is aborted at the network layer.
import puppeteer from 'puppeteer-core';
import { CHROME, BASE } from './pages.mjs';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

for (const path of ['/contact-us', '/resources', '/press-releases/focalist-access-study-world-journal-urology']) {
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1200 });
  await p.setRequestInterception(true);
  const blocked = [];
  p.on('request', (req) => {
    const isForm = req.method() !== 'GET' || /formSubmit|form-submit|webflow\.com\/api/i.test(req.url());
    if (isForm) { blocked.push(req.method() + ' ' + req.url().slice(0, 90)); return req.abort(); }
    req.continue();
  });
  const logs = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text().slice(0, 150)); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + String(e.message).slice(0, 120)));

  await p.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3500));

  await p.evaluate(() => {
    const set = (s, v) => { const e = document.querySelector(s); if (!e) return;
      e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    set('#Contact-First-Name', 'QA'); set('#Contact-Last-Name', 'Check');
    set('#Contact-Email', 'qa@example.com'); set('#Contact-Role', 'Engineer');
    set('#Contact-Message', 'pre-deploy check');
    document.querySelectorAll('[name="Contact-Organization"]').forEach(e => {
      e.value = 'QA Org'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    const cb = document.querySelector('#Contact-Checkbox'); if (cb && !cb.checked) cb.click();
    const ns = [...document.querySelectorAll('.nice-select')].find(n => n.offsetParent);
    ns?.click(); ns?.querySelector('li.option[data-value="United States"]')?.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  logs.length = 0; // only care about what the submit click produces

  const clicked = await p.evaluate(() => {
    const f = document.querySelector('form');
    const btn = f.querySelector('input[type="submit"], button[type="submit"], .w-button');
    if (!btn) return 'sin boton submit';
    btn.click();
    return 'click en: ' + (btn.value || btn.textContent || '').trim().slice(0, 30);
  });
  await new Promise(r => setTimeout(r, 2500));

  const outcome = await p.evaluate(() => {
    const f = document.querySelector('form');
    return {
      formStillVisible: !!f?.offsetParent,
      successVisible: !!document.querySelector('.w-form-done')?.offsetParent,
      failVisible: !!document.querySelector('.w-form-fail')?.offsetParent,
      valid: f?.checkValidity(),
    };
  });

  console.log(`\n===== ${path} =====`);
  console.log('  ' + clicked);
  console.log('  resultado: ' + JSON.stringify(outcome));
  console.log('  peticiones bloqueadas por el test: ' + (blocked.length ? blocked.join(' | ') : 'ninguna (no salio nada)'));
  console.log('  consola tras el click: ' + (logs.length ? logs.join('\n                        ') : '(vacia)'));
  await p.close();
}
await b.close();
