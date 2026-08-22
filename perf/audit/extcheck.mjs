// The 403/401 links may just be bot-blocking. Re-check them in a real browser.
import puppeteer from 'puppeteer-core';
import { CHROME } from './pages.mjs';
const URLS = [
  'https://www.urologytimes.com/view/first-pcnl-procedures-with-focalist-handheld-robotic-system-debut-at-wcet',
  'https://sufuorg.com/meetings/upcoming-sufu.aspx',
  'https://www.massdevice.com/mendaera-first-cases-handheld-surgical-robot/',
  'https://www.fiercebiotech.com/medtech/mendaera-scores-fda-clearance-handheld-robotic-needle-delivery-system',
  'https://radiologybusiness.com/topics/artificial-intelligence/startup-aiming-bring-robotics-interventional-radiology-raises-73m',
  'https://www.wsj.com/articles/medical-robotics-startup-mendaera-raises-73-million-for-market-launch-50a5f7b3?tpl=vc&mod=hp_lead_pos2',
  'https://www.businesswire.com/news/home/20231219290743/en/Butterfly-Network-Announces-Commercial-Agreement-with-Mendaera-for-Next-Generation-Interventional-Robotic-System-Powered-by-Butterflys-Ultrasound-on-Chip-Technology',
  'https://www.atcmeeting.org',
];
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
for (const u of URLS) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  let status = null, title = null;
  try {
    const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = r?.status();
    await new Promise(x => setTimeout(x, 1500));
    title = (await p.title()).slice(0, 65);
  } catch (e) { status = 'ERR ' + e.message.slice(0, 40); }
  console.log(`${String(status).padEnd(6)} ${title === null ? '' : '"' + title + '"'}\n       ${u.slice(0, 100)}`);
  await p.close();
}
await b.close();
