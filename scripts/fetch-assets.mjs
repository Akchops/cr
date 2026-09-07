/**
 * Downloads the verified Carriagetown Detailing photographs listed in
 * assets.manifest.json into assets-raw/.
 *
 * These images live on img1.wsimg.com. If your network blocks that host the
 * script reports each failure and exits non-zero; it never substitutes
 * placeholder or generated imagery.
 */
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'assets-raw');
const manifest = JSON.parse(await readFile(join(root, 'scripts/assets.manifest.json'), 'utf8'));

await mkdir(rawDir, { recursive: true });

const targets = [...manifest.photos, manifest.logo];
const failures = [];

for (const item of targets) {
  const dest = join(rawDir, item.file);
  try {
    if ((await stat(dest).catch(() => null))?.size > 1024) {
      console.log(`skip  ${item.file} (already present)`);
      continue;
    }
    const res = await fetch(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) throw new Error(`suspiciously small (${buf.length} bytes)`);
    if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('not a JPEG (bad magic bytes)');
    await writeFile(dest, buf);
    console.log(`ok    ${item.file}  ${(buf.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    failures.push(`${item.file}: ${err.message}`);
    console.error(`FAIL  ${item.file}  ${err.message}`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} asset(s) could not be downloaded.`);
  console.error('The photographs are required. Do not substitute stock or generated imagery.');
  process.exit(1);
}
console.log('\nAll assets downloaded. Next: npm run optimize-assets');
