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
};

const present = new Set(await readdir(rawDir).catch(() => []));
let made = 0;

for (const photo of manifest.photos) {
  if (!present.has(photo.file)) { console.log(`skip  ${photo.id} (raw file absent)`); continue; }
  const plan = PLAN[photo.id];
  const src = join(rawDir, photo.file);

  for (const w of plan.widths) {
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
  console.log(`ok    ${photo.id}  ${plan.widths.join('/')}`);
}

// logo: native size only, never upscaled
if (present.has(manifest.logo.file)) {
  await sharp(join(rawDir, manifest.logo.file))
    .webp({ quality: 92 })
    .toFile(join(outDir, 'logo-carriage.webp'));
  console.log('ok    logo-carriage (native 119x67, not upscaled)');
}

console.log(`\n${made} derivative(s) written to public/assets/photos/`);
