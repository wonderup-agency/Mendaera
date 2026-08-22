// Capturas cada ~450 ms durante la carga, con throttling aplicado.
// Es lo que muestra el problema de verdad: en el baseline la home estaba en
// blanco hasta los 4,5 s y ningun numero de Lighthouse lo dice.
//
//   node filmstrip.mjs                    # home mobile
//   node filmstrip.mjs home desktop
//   node filmstrip.mjs technology mobile
//
// Sale a out/shots/<pagina>.<device>/
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { BASE, PAGES, CHROME, SLOW_4G, MOBILE_VIEWPORT, MOBILE_UA } from './pages.mjs';

const NAME = process.argv[2] || 'home';
const DEV = process.argv[3] || 'mobile';
const FRAMES = Number(process.argv[4] || 20);
const path = (PAGES.find(([n]) => n === NAME) || [])[1];
if (!path) { console.error(`pagina desconocida: ${NAME}. Opciones: ${PAGES.map(([n]) => n).join(', ')}`); process.exit(1); }

const dir = `out/shots/${NAME}.${DEV}`;
fs.mkdirSync(dir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell',
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const cdp = await page.createCDPSession();

if (DEV === 'mobile') { await page.setViewport(MOBILE_VIEWPORT); await page.setUserAgent(MOBILE_UA); }
else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', SLOW_4G);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: DEV === 'mobile' ? 4 : 1 });

const t0 = Date.now();
page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 240000 }).catch(() => {});

for (let i = 0; i < FRAMES; i++) {
  const at = Date.now() - t0;
  try { await page.screenshot({ path: `${dir}/f${String(i).padStart(2, '0')}_${at}ms.jpg`, type: 'jpeg', quality: 72 }); } catch {}
  await new Promise((r) => setTimeout(r, 400));
}

const paint = await page.evaluate(() => performance.getEntriesByType('paint')
  .map((e) => ({ n: e.name, t: Math.round(e.startTime) }))).catch(() => []);

console.log(`\n${NAME} · ${DEV}`);
for (const p of paint) console.log(`  ${p.n.padEnd(24)} ${p.t} ms`);
console.log(`\n${FRAMES} capturas en ${dir}/`);
console.log('El frame donde aparece contenido por primera vez es el numero que importa.');

await browser.close();
