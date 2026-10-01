// Repro / regresion: en Technology el scroll se trababa en touch a 992 px o mas.
//   node tech-tablet-scroll.mjs          # como esta en vivo
//   PATCH=1 node tech-tablet-scroll.mjs  # con el fix del pane wrapper inyectado
// Hace swipes tactiles reales por CDP y reporta en que scrollY se queda cada uno.
import puppeteer from 'puppeteer-core';
import { BASE, CHROME } from './pages.mjs';

const URL_ = process.env.URL || BASE + '/technology';
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// 820x1180 is the control: under the 992 px breakpoint the product modal is
// display:none, so neither trap arms there.
const VIEWPORTS = [[820, 1180], [1024, 1366], [1180, 820], [1366, 1024]];
const SWIPES = 25;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'shell',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

for (const [w, h] of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setUserAgent(IPAD_UA);
  // Counts the touchmove preventDefault calls that kill the scroll outright,
  // and names the frame they come from.
  await page.evaluateOnNewDocument(() => {
    window.__pd = [];
    const orig = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function () {
      if (this.type === 'touchmove') window.__pd.push(((new Error().stack || '').split('\n')[2] || '?').trim());
      return orig.call(this);
    };
  });
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 25000 }).catch(() => {});
  if (process.env.PATCH) {
    await page.addStyleTag({ content: '.product_modal-tabs-pane-wrapper{overflow:visible!important;overscroll-behavior:auto!important}' });
  }

  const client = await page.target().createCDPSession();
  const x = Math.round(w / 2), y0 = Math.round(h * 0.7);
  const track = [];
  let stalls = 0;
  for (let s = 0; s < SWIPES; s++) {
    const before = await page.evaluate(() => Math.round(window.scrollY));
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= 10; i++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 - 45 * i }] });
      await new Promise((r) => setTimeout(r, 16));
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await new Promise((r) => setTimeout(r, 350));
    const after = await page.evaluate(() => ({
      y: Math.round(window.scrollY), max: document.documentElement.scrollHeight - innerHeight,
    }));
    track.push(after.y);
    // At the bottom there is nothing left to move, so only a mid-page stall counts.
    if (after.y === before && after.y < after.max - 5) stalls++;
  }
  const end = await page.evaluate(() => ({
    y: Math.round(window.scrollY), max: document.documentElement.scrollHeight - innerHeight,
    pd: window.__pd.length, pdFrom: (window.__pd[0] || '').slice(0, 80),
  }));
  console.log(`${String(w).padStart(4)}x${String(h).padEnd(4)} ${SWIPES} swipes -> ${end.y}/${end.max} `
    + `${stalls ? 'TRABAS: ' + stalls : 'sin trabas'}`
    + (end.pd ? ` | touchmove.preventDefault=${end.pd} <- ${end.pdFrom}` : '')
    + `\n            ${track.join(' ')}`);
  await page.close();
}
await browser.close();
