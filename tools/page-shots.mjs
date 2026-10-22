// page-shots.mjs — walk a page on a phone chapter by chapter, record its
// length in screens, collect errors, and pack the screens into contact sheets.
// usage: node tools/page-shots.mjs [url] [outDir] [engine=chromium|webkit]
// Headless WebKit has no compositor and flattens preserve-3d; use chromium for
// the 3D chapter and webkit for everything Safari-specific.
import { webkit, chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:8137/';
const out = process.argv[3] || 'tools/out/page';
const engineName = process.argv[4] || 'chromium';
const W = +(process.env.W || 390), H = +(process.env.H || 844);
mkdirSync(out, { recursive: true });

const browser = await (engineName === 'webkit' ? webkit : chromium).launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: W < 900, isMobile: engineName === 'chromium' && W < 900, locale: 'he-IL' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure()?.errorText || '')));

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(3600);
const shots = [{ name: 'hero', b64: (await page.screenshot({ type: 'jpeg', quality: 72 })).toString('base64') }];

const chapters = await page.$$eval('[data-chapter]', (els) => els.map((e) => e.dataset.chapter));
for (const name of chapters.slice(1)) {
  const box = await page.$eval(`[data-chapter="${name}"]`, (e) => ({ top: e.getBoundingClientRect().top + scrollY, h: e.offsetHeight }));
  const stops = box.h > H * 1.05 ? [0, Math.min(box.h - H * 0.6, H * 0.85)] : [0];
  for (const [i, dy] of stops.entries()) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.max(0, box.top + dy - 64));
    await page.waitForTimeout(i ? 1200 : 2600);
    shots.push({ name: `${name}${i ? ' (2)' : ''}`, b64: (await page.screenshot({ type: 'jpeg', quality: 72 })).toString('base64') });
  }
}

const metrics = await page.evaluate((h) => {
  const total = document.documentElement.scrollHeight;
  const fit = document.querySelector('#fit');
  const overflow = document.documentElement.scrollWidth > innerWidth + 1;
  const small = [...document.querySelectorAll('a, button, input, summary')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && (r.height < 40 || r.width < 40) && !el.closest('.sys, .ly, .hp__stage, .dock:not(.is-on)');
  }).map((el) => `${el.tagName.toLowerCase()}.${el.className || ''} "${(el.textContent || '').trim().slice(0, 24)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
  return {
    totalPx: total, screens: +(total / h).toFixed(1),
    toFitScreens: fit ? +((fit.getBoundingClientRect().top + scrollY) / h).toFixed(1) : null,
    horizontalOverflow: overflow, smallTargets: small.slice(0, 12),
    sections: [...document.querySelectorAll('[data-chapter]')].map((e) => [e.dataset.chapter, +(e.offsetHeight / h).toFixed(2)]),
  };
}, H);

const PER = 5;
const sheet = await ctx.newPage();
await sheet.setViewportSize({ width: PER * (W + 12) + 12, height: H + 40 });
for (let s = 0; s * PER < shots.length; s++) {
  const group = shots.slice(s * PER, s * PER + PER);
  await sheet.setContent(`<body style="margin:0;background:#222;color:#fff;font:14px monospace;display:flex;gap:12px;padding:6px 12px">${
    group.map((g) => `<div><div style="height:26px">${g.name}</div><img style="width:${W}px;height:${H}px;display:block" src="data:image/jpeg;base64,${g.b64}"></div>`).join('')}</body>`);
  await sheet.screenshot({ path: `${out}/sheet-${String(s).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 78 });
}
writeFileSync(`${out}/report.json`, JSON.stringify({ url, engine: engineName, ...metrics, errors }, null, 2));
console.log(JSON.stringify({ engine: engineName, ...metrics, errors: errors.slice(0, 10) }, null, 1));
await browser.close();
