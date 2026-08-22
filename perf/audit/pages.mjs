// Paginas del alcance de la auditoria. Editar aca y lo toman los tres scripts.
export const BASE = process.env.BASE || 'https://mendaera-wup.webflow.io';

export const PAGES = [
  ['home',               '/'],
  ['technology',         '/technology'],
  ['about',              '/about'],
  ['news-and-events',    '/news-and-events'],
  ['press-release-tmpl', '/press-releases/focalist-access-study-world-journal-urology'],
  ['careers',            '/careers'],
  ['resources',          '/resources'],
  ['contact-us',         '/contact-us'],
];

// Chrome del sistema. Override con CHROME=/ruta/al/binario
export const CHROME = process.env.CHROME
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Slow 4G, los mismos valores que usa Lighthouse para mobile
export const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: 1638400 / 8,
  uploadThroughput: (750 * 1024) / 8,
};

export const MOBILE_VIEWPORT = {
  width: 412, height: 823, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
};
export const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

export const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
