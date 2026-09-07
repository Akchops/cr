/* Renders the built page and inspects the ACTUAL rendered result. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import handler from 'serve-handler';

// QA owns its own server so a run never depends on one already being up.
const PORT = Number(process.env.QA_PORT || 4178);
const server = http.createServer((req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return handler(req, res, { public: 'public', cleanUrls: true });
});
await new Promise((res, rej) => { server.once('error', rej); server.listen(PORT, res); });

const BASE = process.env.QA_URL || `http://localhost:${PORT}/`;
const OUT = 'qa/screenshots';
await mkdir(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900,  mobile: false },
  { name: 'tablet-768',   width: 768,  height: 1024, mobile: true  },
  { name: 'phone-390',    width: 390,  height: 844,  mobile: true  },
  { name: 'phone-360',    width: 360,  height: 780,  mobile: true  },
];

const findings = [];
const note = (level, vp, msg) => { findings.push({ level, vp, msg }); };

const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  /* --- horizontal overflow --- */
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    const bad = [];
    if (de.scrollWidth > de.clientWidth + 1) {
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
          bad.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} right=${Math.round(r.right)} left=${Math.round(r.left)}`);
        }
      });
    }
    return { doc: de.scrollWidth, client: de.clientWidth, bad: bad.slice(0, 8) };
  });
  if (overflow.doc > overflow.client + 1) {
    note('P0', vp.name, `Horizontal overflow ${overflow.doc}>${overflow.client}: ${overflow.bad.join(' | ')}`);
  }

  /* --- links, numbers, anchors --- */
  const links = await page.evaluate(() => {
    const out = { tel: [], sms: [], anchors: [], external: [] };
    document.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (h.startsWith('tel:')) out.tel.push(h);
      else if (h.startsWith('sms:')) out.sms.push(h);
      else if (h.startsWith('#')) out.anchors.push(h);
      else out.external.push(h);
    });
    return out;
  });
  const telSet = [...new Set(links.tel)];
  const smsSet = [...new Set(links.sms)];
  if (!(telSet.length === 1 && telSet[0] === 'tel:+19785726344')) note('P0', vp.name, `tel: hrefs wrong -> ${telSet.join(',')}`);
  if (!(smsSet.length === 1 && smsSet[0] === 'sms:+19784904139')) note('P0', vp.name, `sms: hrefs wrong -> ${smsSet.join(',')}`);

  const badAnchors = await page.evaluate(anchors =>
    anchors.filter(h => h !== '#top' && !document.querySelector(h)), [...new Set(links.anchors)]);
  if (badAnchors.length) note('P0', vp.name, `Anchor targets missing: ${badAnchors.join(',')}`);

  /* Scroll the full page so lazy images actually attempt to load, then audit. */
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  // Force every lazy image to fetch so each slot is genuinely audited, then
  // wait for them all to settle (loaded or failed).
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll('img')].every(i => i.complete),
    null, { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(500);

  /* --- images: broken vs pending --- */
  const imgs = await page.evaluate(() => {
    const r = { total: 0, loaded: 0, pending: 0, brokenVisible: [] };
    document.querySelectorAll('img').forEach(i => {
      r.total++;
      if (i.complete && i.naturalWidth > 0) r.loaded++;
      else {
        const shot = i.closest('[data-shot]');
        if (shot && shot.classList.contains('is-pending')) r.pending++;
        else r.brokenVisible.push(i.getAttribute('src'));
      }
    });
    return r;
  });
  if (imgs.brokenVisible.length) note('P0', vp.name, `Broken images with no pending panel: ${imgs.brokenVisible.join(', ')}`);

  /* --- fonts --- */
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const h1 = getComputedStyle(document.querySelector('h1')).fontFamily;
    const body = getComputedStyle(document.body).fontFamily;
    const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight);
    return { h1, body, loaded };
  });
  if (!/Barlow Condensed/.test(fonts.h1)) note('P1', vp.name, `H1 not using display face: ${fonts.h1}`);
  if (!fonts.loaded.some(f => /Barlow/.test(f))) note('P1', vp.name, 'Barlow Condensed did not load');
  if (!fonts.loaded.some(f => /Inter/.test(f))) note('P1', vp.name, 'Inter did not load');

  /* --- tap targets --- */
  const smallTargets = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('a[href], button').forEach(el => {
      if (el.classList.contains('skip-link')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return;
      if (r.height < 44) bad.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} h=${r.height.toFixed(0)} "${(el.textContent||'').trim().slice(0,28)}"`);
    });
    return bad;
  });
  if (smallTargets.length) note('P1', vp.name, `Tap targets under 44px: ${smallTargets.join(' | ')}`);

  /* --- headings + landmarks --- */
  const struct = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    order: [...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName),
    main: document.querySelectorAll('main').length,
    nav: document.querySelectorAll('nav').length,
    footer: document.querySelectorAll('footer').length,
    robots: document.querySelector('meta[name="robots"]')?.content || '',
    title: document.title,
    disclaimer: document.querySelector('.disclaimer')?.textContent.trim() || '',
    ld: document.querySelectorAll('script[type="application/ld+json"]').length,
  }));
  if (struct.h1 !== 1) note('P0', vp.name, `Expected exactly one H1, found ${struct.h1}`);
  if (!/noindex/.test(struct.robots) || !/nofollow/.test(struct.robots) || !/noarchive/.test(struct.robots)) note('P0', vp.name, `robots meta wrong: "${struct.robots}"`);
  if (struct.ld > 0) note('P0', vp.name, 'Structured data present — must not ship LocalBusiness schema');
  const REQUIRED = 'Unofficial website concept created independently for presentation purposes. Not commissioned or approved by Carriagetown Detailing LLC.';
  if (struct.disclaimer !== REQUIRED) note('P0', vp.name, `Disclaimer text mismatch: "${struct.disclaimer}"`);

  /* --- disclaimer actually visible --- */
  const discVisible = await page.evaluate(() => {
    const d = document.querySelector('.disclaimer');
    if (!d) return false;
    const s = getComputedStyle(d);
    const r = d.getBoundingClientRect();
    return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0.5 && r.height > 0 && parseFloat(s.fontSize) >= 12;
  });
  if (!discVisible) note('P0', vp.name, 'Disclaimer not legibly rendered');

  /* --- call bar must not cover content --- */
  const barCheck = await page.evaluate(() => {
    const bar = document.querySelector('.callbar');
    const s = getComputedStyle(bar);
    if (s.display === 'none') return { shown: false };
    const barH = bar.getBoundingClientRect().height;
    const padB = parseFloat(getComputedStyle(document.body).paddingBottom);
    return { shown: true, barH, padB, ok: padB >= barH - 2 };
  });
  if (barCheck.shown && !barCheck.ok) {
    note('P1', vp.name, `Call bar (${barCheck.barH}px) exceeds reserved body padding (${barCheck.padB}px)`);
  }

  /* --- mobile menu behaviour --- */
  if (vp.width < 900) {
    const toggle = page.locator('.nav-toggle');
    await toggle.click();
    const openState = await page.evaluate(() => ({
      expanded: document.querySelector('.nav-toggle').getAttribute('aria-expanded'),
      visible: getComputedStyle(document.getElementById('site-nav')).display !== 'none',
    }));
    if (openState.expanded !== 'true' || !openState.visible) note('P0', vp.name, 'Mobile menu did not open');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const closed = await page.evaluate(() => ({
      expanded: document.querySelector('.nav-toggle').getAttribute('aria-expanded'),
      focused: document.activeElement?.classList.contains('nav-toggle'),
    }));
    if (closed.expanded !== 'false') note('P0', vp.name, 'Escape did not close mobile menu');
    if (!closed.focused) note('P1', vp.name, 'Focus not returned to menu button after Escape');
    await page.evaluate(() => document.activeElement?.blur());
  }

  /* --- screenshots --- */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${vp.name}-01-hero.png` });

  for (const [i, sel] of [['02-work', '#work'], ['03-services', '#services'], ['04-about', '#about'], ['05-contact', '#contact']]) {
    await page.evaluate(s => document.querySelector(s)?.scrollIntoView({ block: 'start', behavior: 'instant' }), sel);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${vp.name}-${i}.png` });
  }
  if (vp.width >= 960) {
    for (const [tag, frac] of [['02b-stage-mid', 0.45], ['02c-stage-end', 0.85]]) {
      await page.evaluate(f => {
        const st = document.querySelector('[data-stage]');
        const r = st.getBoundingClientRect();
        const top = r.top + window.scrollY;
        window.scrollTo(0, top + (st.offsetHeight - window.innerHeight) * f);
      }, frac);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/${vp.name}-${tag}.png` });
    }
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);

  // The sticky header must still be pinned to the top at the very bottom of
  // the page (overflow-x:hidden on body silently breaks this).
  const hdrAtBottom = await page.evaluate(() => {
    const h = document.querySelector('.site-header');
    return Math.round(h.getBoundingClientRect().top);
  });
  if (Math.abs(hdrAtBottom) > 2) {
    note('P0', vp.name, `Sticky header detached at page bottom (top=${hdrAtBottom}px)`);
  }

  await page.screenshot({ path: `${OUT}/${vp.name}-06-footer.png` });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });

  const photo404 = consoleErrors.filter(e => /404/.test(e));
  const realErrors = consoleErrors.filter(e => !/404/.test(e));
  if (realErrors.length) note('P1', vp.name, `Console errors: ${realErrors.slice(0, 4).join(' | ')}`);
  if (photo404.length) note('INFO', vp.name, `${photo404.length} x 404 — the blocked business photographs (expected until assets are fetched)`);

  await ctx.close();
}

/* ---------------------- reduced motion: nothing hidden --------------------- */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const hidden = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('main *').forEach(el => {
      const s = getComputedStyle(el);
      if (el.getBoundingClientRect().height === 0) return;
      if (parseFloat(s.opacity) < 0.15 && el.getAttribute('aria-hidden') !== 'true' && !el.classList.contains('hero__ghost')) {
        bad.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]}`);
      }
      if (s.clipPath && s.clipPath.includes('100%')) bad.push(`clipped: ${el.className}`);
    });
    return [...new Set(bad)];
  });
  if (hidden.length) note('P0', 'reduced-motion', `Content hidden under reduced motion: ${hidden.join(', ')}`);

  const pinned = await page.evaluate(() => {
    const st = document.querySelector('[data-stage]');
    const vpEl = st?.querySelector('.stage__viewport');
    return { isPinned: st?.classList.contains('is-pinned'), pos: vpEl ? getComputedStyle(vpEl).position : 'n/a' };
  });
  if (pinned.pos === 'sticky') note('P0', 'reduced-motion', 'Stage still pinned under reduced motion');

  await page.screenshot({ path: `${OUT}/reduced-motion-full.png`, fullPage: true });
  await ctx.close();
}

/* ------------------------- no-JS: content must survive -------------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const vis = await page.evaluate(() => 0).catch(() => null); // JS disabled: use DOM via locator instead
  const h1 = await page.locator('h1').isVisible();
  const contact = await page.locator('#contact').isVisible();
  const disc = await page.locator('.disclaimer').isVisible();
  if (!h1 || !contact || !disc) note('P0', 'no-js', `Content missing without JS (h1=${h1} contact=${contact} disclaimer=${disc})`);
  await page.screenshot({ path: `${OUT}/no-js-full.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
server.close();

const p0 = findings.filter(f => f.level === 'P0');
const p1 = findings.filter(f => f.level === 'P1');
const info = findings.filter(f => f.level === 'INFO');
const lines = [
  `QA run ${new Date().toISOString()}`,
  `P0: ${p0.length}   P1: ${p1.length}   INFO: ${info.length}`,
  '',
  ...findings.map(f => `[${f.level}] ${f.vp}: ${f.msg}`),
];
await writeFile('qa/qa-report.txt', lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nScreenshots in ${OUT}/`);
