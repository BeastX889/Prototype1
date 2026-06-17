/**
 * Generates the app icon, adaptive foreground/monochrome, splash mark, and favicon
 * as PNGs from an inline SVG (a boxing glove on the app's dark palette). No external
 * art. Run with: node scripts/gen-icons.mjs   (regenerates files in assets/images/)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');

const BG = '#10161d';
const GREEN = '#0b9b3d';
const GREEN_DK = '#077a2f';
const RED = '#c81e1e';

// Boxing-glove mark drawn in a 100x100 viewBox, centered. `fill` overrides for mono.
function glove({ mono = false } = {}) {
  const main = mono ? '#ffffff' : GREEN;
  const dark = mono ? '#ffffff' : GREEN_DK;
  const accent = mono ? '#ffffff' : RED;
  return `
    <g>
      <!-- cuff -->
      <rect x="34" y="64" width="34" height="20" rx="6" fill="${dark}"/>
      <!-- wrist strap -->
      <rect x="34" y="66" width="34" height="6" rx="3" fill="${accent}" opacity="${mono ? 0.0 : 1}"/>
      <!-- main mitt -->
      <rect x="30" y="26" width="42" height="44" rx="20" fill="${main}"/>
      <!-- thumb -->
      <rect x="18" y="42" width="18" height="22" rx="9" fill="${main}"/>
      <!-- knuckle crease -->
      <rect x="36" y="40" width="30" height="5" rx="2.5" fill="${accent}" opacity="${mono ? 0.0 : 0.85}"/>
    </g>`;
}

// Wrap glove art with an optional background and a scale (for adaptive safe-zone padding).
function svg({ size, bg = null, mono = false, scale = 1 }) {
  const t = (1 - scale) * 50; // translate to keep scaled art centered
  const bgRect = bg ? `<rect width="100" height="100" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    ${bgRect}
    <g transform="translate(${t},${t}) scale(${scale})">${glove({ mono })}</g>
  </svg>`;
}

async function write(name, markup) {
  await sharp(Buffer.from(markup)).png().toFile(join(OUT, name));
  console.log('wrote', name);
}

// Full app icon (full-bleed dark bg + glove).
await write('icon.png', svg({ size: 1024, bg: BG, scale: 0.92 }));
// Android adaptive foreground: transparent, art within ~62% safe zone.
await write('android-icon-foreground.png', svg({ size: 1024, bg: null, scale: 0.62 }));
// Android monochrome (themed icons): white silhouette, transparent, safe-zone.
await write('android-icon-monochrome.png', svg({ size: 1024, bg: null, mono: true, scale: 0.62 }));
// Splash mark (shown small, ~120px wide): glove on transparent.
await write('splash-icon.png', svg({ size: 512, bg: null, scale: 0.9 }));
// Favicon.
await write('favicon.png', svg({ size: 64, bg: BG, scale: 0.92 }));
