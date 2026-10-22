// flow-test.mjs — drive every interaction that screenshots can't see, and
// assert the data layer recorded it. Also: reduced motion and no-JS read.
// usage: node tools/flow-test.mjs [base=http://localhost:8137]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8137';
const browser = await chromium.launch();
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };

async function phone(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...opts });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // never actually leave for WhatsApp: record what would have opened
  await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  return { ctx, page, errors };
}
const events = (page) => page.evaluate(() => (window.dataLayer || []).map((e) => e.event));

/* ── parents' page ─────────────────────────────────────────────────────── */
{
  const { ctx, page, errors } = await phone();
  await page.goto(`${BASE}/?utm_source=test&utm_campaign=flow`);
  await page.waitForTimeout(1500);

  await page.locator('.lens button[data-mode="research"]').click();
  check(await page.locator('.sys').getAttribute('data-mode') === 'research', 'lens: research mode set');

  await page.locator('.hp__tabs button[data-step="2"]').click();
  check(await page.locator('.hp__say .cves a').count() === 3, 'hp: result step shows the three CVE links');

  await page.locator('.check__grid button').nth(0).click();
  await page.locator('.check__grid button').nth(1).click();
  check((await page.locator('.check__say').textContent()).includes('2 מתוך 8'), 'prereq: live count updates');

  await page.locator('[data-open-syllabus]').click();
  check(await page.locator('#syllabus').evaluate((d) => d.open), 'syllabus: sheet opens');
  await page.locator('#syllabus [data-close]').click();

  await page.locator('.hero [data-open-share]').click();
  check(await page.locator('#share').evaluate((d) => d.open), 'share: sheet opens');
  await page.locator('#share [data-share-now="kid"]').click();
  const opened = await page.evaluate(() => window.__opened);
  check(opened.length === 1 && opened[0].startsWith('https://wa.me/?text=') && decodeURIComponent(opened[0]).includes('kid/?ref='), 'share: WhatsApp link to the kid page carries a ref');
  await page.locator('#share [data-copy-kid]').click();
  await page.waitForTimeout(200);
  check((await page.locator('#share [data-copy-note]').textContent()).includes('הועתק'), 'share: copy confirms');
  await page.locator('#share [data-close]').click();

  await page.locator('.faq details').first().locator('summary').click();

  // the fit check, start to finish
  const quiz = page.locator('[data-quiz]');
  for (const label of ['י״א', 'כתבו קוד בעצמם, בלי שאמרו להם', 'שנינו', 'כן']) {
    await quiz.getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(260);
  }
  check(await quiz.getAttribute('data-route') === 'ready', 'quiz: strong answers route to "ready"');
  await quiz.locator('[type="submit"]').click();
  check((await quiz.locator('.form__err').textContent()).length > 0, 'lead: empty form is refused');
  await quiz.locator('input[name="name"]').fill('הורה בדיקה');
  await quiz.locator('input[name="phone"]').fill('050-1234567');
  await quiz.locator('input[name="agree"]').check();
  await quiz.locator('[type="submit"]').click();
  await page.waitForTimeout(300);
  check((await quiz.textContent()).includes('קיבלנו'), 'lead: success state shown');
  const lead = await page.evaluate(() => JSON.parse(localStorage.getItem('cipher.lastLead') || 'null'));
  check(lead && lead.answers.grade === '11' && lead.utm.utm_source === 'test' && lead.journey.interactions > 5, 'lead: payload carries answers, campaign and journey');

  const ev = await events(page);
  for (const name of ['page_view', 'lens_select', 'hp_step', 'prereq_toggle', 'syllabus_open', 'share_open', 'share_created', 'share_sent', 'link_copied', 'faq_open', 'quiz_start', 'quiz_answer', 'quiz_result', 'lead_invalid', 'lead_submit']) {
    check(ev.includes(`cipher_${name}`), `data: ${name} recorded`);
  }
  check(errors.length === 0, `parents: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── a budget "no" never asks for details ─────────────────────────────── */
{
  const { ctx, page } = await phone();
  await page.goto(`${BASE}/#fit`);
  await page.waitForTimeout(1200);
  const quiz = page.locator('[data-quiz]');
  for (const label of ['י׳', 'למדו תכנות במסגרת', 'הם', 'לא כרגע']) {
    await quiz.getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(260);
  }
  check(await quiz.getAttribute('data-route') === 'budget' && await quiz.locator('form').isHidden(), 'quiz: "not now" on price hides the form');
  await ctx.close();
}

/* ── the teen's page, arriving through a shared link ───────────────────── */
{
  const { ctx, page, errors } = await phone();
  await page.goto(`${BASE}/kid/?ref=abc123xyz0`);
  await page.waitForTimeout(1500);
  check(await page.locator('[data-challenge] a[href*="cipher-challenge"]').count() === 1, 'kid: links to the live challenge while the backend is unwired');
  await page.locator('[data-tell-parent]').first().click();
  const opened = await page.evaluate(() => window.__opened);
  check(opened.length === 1 && decodeURIComponent(opened[0]).includes('ref=abc123xyz0'), 'kid: "tell my parents" message carries the same ref');
  const ev = await events(page);
  check(ev.includes('cipher_share_opened') && ev.includes('cipher_challenge_interest'), 'kid: share_opened and challenge_interest recorded');
  check(errors.length === 0, `kid: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── reduced motion and no JavaScript: everything still reads ──────────── */
for (const [label, opts] of [['reduced motion', { reducedMotion: 'reduce' }], ['no JavaScript', { javaScriptEnabled: false }]]) {
  const { ctx, page } = await phone(opts);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(1200);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('h1, h2, .lead, .say, .seats')]
    .filter((el) => { const s = getComputedStyle(el); return +s.opacity < 0.5 || s.visibility === 'hidden'; })
    .map((el) => el.textContent.trim().slice(0, 30)));
  check(hidden.length === 0, `${label}: all copy visible ${hidden.join(' | ')}`);
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\n${fails.length} failed` : '\nall passed');
process.exit(fails.length ? 1 : 0);
