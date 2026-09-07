/**
 * Optimizes assets-raw/*.jpg into responsive AVIF + WebP in public/assets/photos/.
 * Crops are art-directed per image role. Only crop / mild tone adjustment is
 * applied - nothing that would alter the apparent service result.
 */
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'assets-raw');
const outDir = join(root, 'public/assets/photos');
const manifest = JSON.parse(await readFile(join(root, 'scripts/assets.manifest.json'), 'utf8'));

await mkdir(outDir, { recursive: true });

// widths per role; hero gets an extra small step for mobile budget
const PLAN = {
  'hero-black-tesla': { widths: [640, 1024, 1600, 2048], ratio: 4 / 3,  position: 'attention' },
  'tesla-interior':   { widths: [480, 800, 1200],        ratio: 3 / 4,  position: 'attention' },
  'cargo-area':       { widths: [480, 800, 1400],        ratio: 4 / 3,  position: 'centre' },
  'black-suv':        { widths: [480, 800, 1400, 1900],  ratio: 4 / 3,  position: 'attention' },
  'rv-exterior':      { widths: [480, 800, 1400],        ratio: 4 / 3,  position: 'centre' },
  'rear-seating':     { widths: [480, 800, 1200],        ratio: 3 / 4,  position: 'attention' },
  'gmc-interior':     { widths: [480, 800, 1400],        ratio: 4 / 3,  position: 'centre' },
  'pale-interior':    { widths: [480, 800, 1200],        ratio: 3 / 4,  position: 'attention' },
  'ford-interior':    { widths: [480, 800, 1400],        ratio: 4 / 3,  position: 'centre' },
  'jeep-interior':    { widths: [480, 800, 1200],        ratio: 3 / 4,  position: 'attention' },
  'corvette':         { widths: [480, 800, 1400],        ratio: 4 / 3,  position: 'centre' },
  'rear-seating-before': { widths: [480, 800, 1200],     ratio: 3 / 4,  position: 'attention' },
  'bentley':          { widths: [480, 800, 1400],        ratio: 4 / 3,  position: 'centre' },
};

const present = new Set(await readdir(rawDir).catch(() => []));
const missingPlan = [];
let made = 0;

for (const photo of manifest.photos) {
  if (!present.has(photo.file)) { console.log(`skip  ${photo.id} (raw file absent)`); continue; }
  if (photo.used === false) { console.log(`skip  ${photo.id} (recovered but not placed)`); continue; }
  const plan = PLAN[photo.id];
  if (!plan) { console.error(`FAIL  ${photo.id} is used on the page but has no crop plan`); missingPlan.push(photo.id); continue; }
  const src = join(rawDir, photo.file);

  // Never upscale: a screenshot-recovered source must not be inflated to a
  // width it does not have. Clamp the ladder to the real source width.
  const meta = await sharp(src).metadata();
  const srcW = meta.width || 0;
  let widths = plan.widths.filter(w => w <= srcW);
  if (!widths.length) widths = [srcW];
  else if (widths[widths.length - 1] < srcW && srcW - widths[widths.length - 1] > 80) widths.push(srcW);
  if (widths.length < plan.widths.length) {
    console.log(`      ${photo.id}: source is ${srcW}px — ladder clamped, no upscaling`);
  }

  for (const w of widths) {
    const h = Math.round(w / plan.ratio);
    const base = sharp(src).rotate()
      .resize(w, h, { fit: 'cover', position: plan.position })
      .modulate({ brightness: 1.01 })      // restrained only
      .linear(1.03, -3);                    // gentle contrast, no result alteration

    await base.clone().avif({ quality: 58, effort: 6 })
      .toFile(join(outDir, `${photo.id}-${w}.avif`));
    await base.clone().webp({ quality: 76 })
      .toFile(join(outDir, `${photo.id}-${w}.webp`));
    made += 2;
  }
  console.log(`ok    ${photo.id}  ${widths.join('/')}`);
}

// logo: native size only, never upscaled
if (present.has(manifest.logo.file)) {
  await sharp(join(rawDir, manifest.logo.file))
    .webp({ quality: 92 })
    .toFile(join(outDir, 'logo-carriage.webp'));
  console.log('ok    logo-carriage (native 119x67, not upscaled)');
}

console.log(`\n${made} derivative(s) written to public/assets/photos/`);
if (missingPlan.length) {
  console.error(`\nMissing crop plans for: ${missingPlan.join(', ')}`);
  process.exit(1);
}
