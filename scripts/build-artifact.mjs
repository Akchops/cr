/**
 * Bundles the site into ONE self-contained HTML file for the private preview.
 *
 * The Artifact host blocks external images, stylesheets and fonts, so every
 * asset is inlined: fonts and photographs as base64 data URIs, CSS and JS as
 * inline blocks. GSAP is inlined too, so the page has zero network
 * dependencies and behaves identically offline.
 *
 * Output keeps no <!doctype>/<html>/<head>/<body> - the host supplies those.
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const b64 = async (p) => (await readFile(p)).toString('base64');

let html = await readFile(join(pub, 'index.html'), 'utf8');
let css  = await readFile(join(pub, 'assets/css/site.css'), 'utf8');
const js = await readFile(join(pub, 'assets/js/site.js'), 'utf8');
const gsap = await readFile(join(pub, 'assets/js/gsap.min.js'), 'utf8');
const st   = await readFile(join(pub, 'assets/js/ScrollTrigger.min.js'), 'utf8');

/* ---- fonts into the stylesheet ---- */
for (const f of await readdir(join(pub, 'assets/fonts'))) {
  const data = await b64(join(pub, 'assets/fonts', f));
  css = css.replaceAll(`url('../fonts/${f}')`, `url('data:font/woff2;base64,${data}')`);
}

/* ---- one image per slot, largest available derivative ---- */
const files = await readdir(join(pub, 'assets/photos'));
const widest = new Map();
for (const f of files) {
  if (!f.endsWith('.webp')) continue;
  const [, id, w] = f.match(/^(.*)-(\d+)\.webp$/) || [];
  if (!id) continue;
  if (!widest.has(id) || Number(w) > widest.get(id).w) widest.set(id, { w: Number(w), f });
}
const dataUri = new Map();
for (const [id, { f }] of widest) {
  dataUri.set(id, `data:image/webp;base64,${await b64(join(pub, 'assets/photos', f))}`);
}

// Collapse each <picture> to a single <img> carrying the inlined data URI.
let swapped = 0, missed = [];
html = html.replace(/<picture>[\s\S]*?<\/picture>/g, (block) => {
  const m = block.match(/<img\s+src="assets\/photos\/(.*?)-\d+\.webp"([\s\S]*?)>/);
  if (!m) { missed.push(block.slice(0, 80)); return block; }
  const [, id, rest] = m;
  const uri = dataUri.get(id);
  if (!uri) { missed.push(id); return block; }
  swapped++;
  return `<img src="${uri}"${rest.replace(/\s+sizes="[^"]*"/g, '')}>`;
});

/* ---- split the document and reassemble without html/head/body ---- */
const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
if (!headMatch || !bodyMatch) throw new Error('could not split document');

const head = headMatch[1]
  .replace(/<meta charset[^>]*>/g, '')
  .replace(/<meta name="viewport"[^>]*>/g, '')
  .replace(/<link rel="preload"[^>]*>/g, '')            // everything is inline now
  .replace(/<link rel="stylesheet"[^>]*>/g, '')
  .replace(/<link rel="icon"\s+href="[^"]*"\s*\/?>/g, '');   // href holds an
  // inline SVG full of ">" characters, so the match must run to the closing
  // quote, not to the first ">" it meets.

const body = bodyMatch[1]
  .replace(/<script src="assets\/js\/[^"]*"[^>]*><\/script>/g, '');

const out = `${head.trim()}
<style>
${css}
</style>

${body.trim()}

<script>${gsap}</script>
<script>${st}</script>
<script>
${js}
</script>
`;

await mkdir(join(root, 'artifact'), { recursive: true });
const dest = join(root, 'artifact', 'carriagetown-concept.html');
await writeFile(dest, out);

const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`inlined ${dataUri.size} photographs, ${swapped} <picture> blocks swapped`);
if (missed.length) { console.error('UNRESOLVED:', missed); process.exit(1); }
console.log(`wrote artifact/carriagetown-concept.html  ${kb} KB`);
if (Buffer.byteLength(out) > 15.5 * 1024 * 1024) { console.error('over the 16MB artifact limit'); process.exit(1); }
