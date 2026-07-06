/**
 * Generates store listing assets into store/assets/:
 *  - feature-graphic.png (1024x500, Google Play)
 *  - play-*.png phone screenshots (1080x1920)
 *  - ios-*.png 6.7" screenshots (1290x2796)
 *
 * Screenshots are captured from the REAL app: run `npx expo export --platform
 * web --output-dir dist-web` first, then `node scripts/gen-store-assets.mjs`.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist-web');
const OUT = join(ROOT, 'store', 'assets');
mkdirSync(OUT, { recursive: true });

const CHROME =
  process.env.CHROME_PATH || '/root/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wav': 'audio/wav', '.png': 'image/png', '.ico': 'image/x-icon', '.map': 'application/json' };

// ---------- feature graphic (pure SVG -> sharp) ----------
const BG = '#10161d';
const GREEN = '#0b9b3d';
const RED = '#c81e1e';

const glove = (x, y, s) => `
  <g transform="translate(${x},${y}) scale(${s})">
    <rect x="34" y="64" width="34" height="20" rx="6" fill="#077a2f"/>
    <rect x="34" y="66" width="34" height="6" rx="3" fill="${RED}"/>
    <rect x="30" y="26" width="42" height="44" rx="20" fill="${GREEN}"/>
    <rect x="18" y="42" width="18" height="22" rx="9" fill="${GREEN}"/>
    <rect x="36" y="40" width="30" height="5" rx="2.5" fill="${RED}" opacity="0.85"/>
  </g>`;

const featureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${BG}"/>
  <circle cx="895" cy="70" r="220" fill="${GREEN}" opacity="0.08"/>
  <circle cx="120" cy="470" r="180" fill="${RED}" opacity="0.07"/>
  ${glove(70, 130, 2.4)}
  <text x="360" y="235" font-family="sans-serif" font-size="86" font-weight="800" fill="#ffffff">Round Timer</text>
  <text x="362" y="300" font-family="sans-serif" font-size="34" font-weight="600" fill="#9aa7b4">Boxing &amp; MMA rounds</text>
  <text x="362" y="360" font-family="sans-serif" font-size="34" font-weight="700" fill="${GREEN}">The bell always rings.</text>
</svg>`;

await sharp(Buffer.from(featureSvg)).png().toFile(join(OUT, 'feature-graphic.png'));
console.log('wrote feature-graphic.png (1024x500)');

// ---------- live app screenshots ----------
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/Prototype1')) p = p.slice('/Prototype1'.length) || '/'; // honor web baseUrl
  if (p === '/') p = '/index.html';
  let file = join(DIST, p);
  let body;
  try { body = await readFile(file); } catch { body = await readFile(join(DIST, 'index.html')); file = 'index.html'; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(body);
});
await new Promise((r) => server.listen(8099, r));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
});

// Device profiles hitting exact store pixel sizes.
const PROFILES = [
  { prefix: 'play', width: 360, height: 640, dpr: 3 },   // 1080x1920
  { prefix: 'ios', width: 430, height: 932, dpr: 3 },    // 1290x2796 (6.7")
];

const tap = (page, label) => page.evaluate((l) => {
  const els = [...document.querySelectorAll('div,span,button,[role="button"],[aria-label]')];
  const el = els.filter((e) => e.getAttribute?.('aria-label') === l || e.textContent.trim() === l).pop();
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
  for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) el.dispatchEvent(new MouseEvent(t, o));
  return true;
}, label);

for (const { prefix, width, height, dpr } of PROFILES) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  // Seed a friendly state: Boxing Amateur + one history entry for the history shot.
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('timer.lastSettings.v1', JSON.stringify({ prepSec: 10, roundSec: 180, restSec: 60, rounds: 3, warningSec: 10, soundEnabled: true }));
    localStorage.setItem('timer.history.v1', JSON.stringify([
      { id: '1', dateISO: new Date().toISOString(), presetName: '3 × 3:00 / 1:00', totalMs: 670000, plannedMs: 670000, roundsCompleted: 3, roundsPlanned: 3, completed: true },
      { id: '2', dateISO: new Date(Date.now() - 86400000).toISOString(), presetName: 'WU 5:00 · 5 × 5:00 / 1:00', totalMs: 2100000, plannedMs: 2100000, roundsCompleted: 5, roundsPlanned: 5, completed: true },
    ]));
  });
  await page.goto('http://localhost:8099/', { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: join(OUT, `${prefix}-1-idle.png`) });

  await tap(page, 'START');
  await new Promise((r) => setTimeout(r, 500));
  await tap(page, 'Skip'); // into FIGHT
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: join(OUT, `${prefix}-2-fight.png`) });

  await tap(page, 'Skip'); // into REST
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: join(OUT, `${prefix}-3-rest.png`) });

  await tap(page, 'Reset');
  await new Promise((r) => setTimeout(r, 600));
  await tap(page, 'Open settings');
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: join(OUT, `${prefix}-4-setup.png`) });

  await tap(page, 'Done');
  await new Promise((r) => setTimeout(r, 600));
  await tap(page, 'History');
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: join(OUT, `${prefix}-5-history.png`) });

  console.log(`wrote ${prefix}-1..5 (${width * dpr}x${height * dpr})`);
  await page.close();
}

await browser.close();
server.close();
console.log('store assets complete →', OUT);
