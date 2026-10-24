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
// wait for a condition in the page; a timeout is a failed check, not a crash
const until = (page, fn, ms, arg) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const gone = (locator, ms) => locator.waitFor({ state: 'hidden', timeout: ms }).then(() => true, () => false);

/* ── parents' page ─────────────────────────────────────────────────────── */
{
  const { ctx, page, errors } = await phone();
  await page.goto(`${BASE}/?utm_source=test&utm_campaign=flow`);
  await page.waitForTimeout(1500);

  // the film: the keyhole becomes the screen, then gives the page back
  await page.locator('.hero [data-film-open="caption"]').click();
  check(await until(page, () => document.querySelector('.film__frame.is-open') !== null, 4000), 'film: a tap opens the keyhole into the full film');
  check(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), 'film: the page under it is locked while it plays');
  await page.locator('.film__x').click();
  check(await until(page, () => !document.documentElement.classList.contains('is-locked') && document.querySelector('.film').dataset.state !== 'open', 4000), 'film: closing puts the film back in the mark and unlocks the page');

  await page.locator('.lens button[data-mode="research"]').click();
  check(await page.locator('.sys').getAttribute('data-mode') === 'research', 'lens: research mode set');

  await page.locator('.hp__tabs button[data-step="2"]').click();
  check(await page.locator('.hp__say .cves a').count() === 3, 'hp: result step shows the three CVE links');

  // the press: a clipping at the back comes forward when tapped (its headline strip shows)
  const back = page.locator('.press .story:not(.is-front)').first();
  const target = await back.getAttribute('data-target');
  await back.click({ position: { x: 40, y: 18 } });
  check(await until(page, (t) => document.querySelector(`.story[data-target="${t}"]`)?.classList.contains('is-front'), 3000, target), 'press: a tapped clipping comes to the front');

  // the syllabus: a chapter opens its topics; a tier tab moves the scene a ring in.
  // The scene is sticky, so Playwright's own scroll-into-view would push it on
  // to the next tier: scroll to a tier's hold the way a reader would, then tap.
  const tap = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
  await page.evaluate(() => { const el = document.querySelector('.course__track'); scrollTo(0, el.getBoundingClientRect().top + scrollY + (0.5 / 3) * (el.offsetHeight - innerHeight)); });
  await page.waitForTimeout(700);
  check(!(await page.locator('#course-tier-1').isHidden()), 'syllabus: the first tier holds at the start of the scene');
  await tap('[data-chapter-n="3"]');
  check(await page.locator('#syllabus').evaluate((d) => d.open), 'syllabus: a chapter opens the sheet');
  check(await page.locator('#syllabus details[data-n="3"]').evaluate((d) => d.open), 'syllabus: the right chapter is expanded');
  await page.locator('#syllabus [data-close]').click();
  await tap('#course-tab-2');
  check(await until(page, () => !document.querySelector('#course-tier-2').hidden && document.querySelector('#course-tier-1').hidden, 4000), 'syllabus: a tier tab brings that tier\'s chapters up');
  await page.waitForTimeout(1200);
  check(!(await page.locator('#course-tier-2').isHidden()), 'syllabus: and the scene settles on it');
  await tap('[data-chapter-n="8"]');
  check(await page.locator('#syllabus details[data-n="8"]').evaluate((d) => d.open), 'syllabus: a chapter from the second tier opens too');
  await page.locator('#syllabus [data-close]').click();

  const check_ = page.locator('.check__grid');
  await check_.locator('button').nth(0).click();
  await check_.locator('button').nth(1).click();
  check((await page.locator('.check__say').textContent()).includes('2 מתוך 7'), 'prereq: live count updates');
  await check_.locator('[data-req="unsure"]').click();
  check(!(await page.locator('.check__send').isHidden()), 'prereq: "unsure" reveals the send-to-them button');
  // back to a clean slate: the quiz below should diagnose from its own answers alone
  await check_.locator('[data-req="unsure"]').click();
  await check_.locator('button').nth(0).click();
  await check_.locator('button').nth(1).click();

  await page.locator('.hero [data-share-now="kid"]').click();
  const opened = await page.evaluate(() => window.__opened);
  check(opened.length === 1 && opened[0].startsWith('https://wa.me/') && decodeURIComponent(opened[0]).includes('kid/?ref='), 'share: the hero button sends straight to WhatsApp with a ref');

  await page.locator('[data-copy-kid]').first().click();
  await page.waitForTimeout(200);
  check((await page.locator('[data-copy-note]').first().textContent()).includes('הועתק'), 'share: copy confirms');

  await page.locator('.faq details').first().locator('summary').click();
  await page.waitForTimeout(150);
  check(await until(page, () => { const a = document.querySelector('.faq details .faq__a'); return a && a.offsetHeight > 20; }, 2000), 'faq: an answer slides open');

  // the bookend: the mark comes together again and opens on the way to the fit check
  await page.locator('.coda').scrollIntoViewIfNeeded();
  check(await until(page, () => document.querySelector('.coda').classList.contains('is-open'), 8000), 'coda: the mark assembles and opens on its button');
  await page.locator('.coda__go').click();
  check(await until(page, () => { const r = document.querySelector('#fit').getBoundingClientRect(); return r.top < innerHeight * 0.5 && r.bottom > 0; }, 4000), 'coda: its button brings the fit check up');

  // dataLayer lives on window, which the lead-success redirect below replaces —
  // so every event up to here has to be read before that navigation happens.
  const ev1 = await events(page);
  for (const name of ['page_view', 'film_open', 'film_close', 'lens_select', 'hp_step', 'press_card', 'syllabus_open', 'syllabus_tier', 'prereq_toggle', 'share_created', 'share_sent', 'link_copied', 'faq_open', 'cta_fit']) {
    check(ev1.includes(`cipher_${name}`), `data: ${name} recorded`);
  }

  // the fit check: four questions, then the always-present (greyed until ready) CTA
  const quiz = page.locator('[data-quiz]');
  await quiz.scrollIntoViewIfNeeded();
  check(await quiz.locator('.fit__go').isDisabled(), 'quiz: the CTA starts disabled, before any question is answered');
  for (const label of ['י״א', 'כתבו קוד בעצמם, בלי שאמרו להם', 'להם', 'שיגיעו למיונים עם יתרון אמיתי']) {
    await quiz.getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(260);
  }
  check(await quiz.getAttribute('data-route') === 'ready', 'quiz: strong answers route to "ready"');
  check(!(await quiz.locator('.fit__go').isDisabled()), 'quiz: the CTA wakes up once the form shows');
  check((await quiz.locator('.fit__go').textContent()).length > 0, 'quiz: the CTA is worded for the answers');

  await quiz.locator('.fit__go').click();
  check((await quiz.locator('.form__err').textContent()).length > 0, 'lead: empty form is refused');
  await quiz.locator('input[name="name"]').fill('הורה בדיקה');
  await quiz.locator('input[name="phone"]').fill('050-1234567');
  await quiz.locator('input[name="agree"]').check();

  const ev2 = await events(page);
  for (const name of ['quiz_start', 'quiz_answer', 'quiz_result', 'lead_invalid']) {
    check(ev2.includes(`cipher_${name}`), `data: ${name} recorded`);
  }

  await quiz.locator('.fit__go').click();
  // the redirect is on a short timer; read dataLayer before it fires and replaces window
  const ev3 = await events(page);
  check(ev3.includes('cipher_lead_submit'), 'data: lead_submit recorded');
  await page.waitForURL('**/thanks/**', { timeout: 5000 });
  check(page.url().includes('/thanks/'), 'lead: success sends the parent to the thank-you page');
  const lead = await page.evaluate(() => JSON.parse(localStorage.getItem('cipher.lastLead') || 'null'));
  check(lead && lead.answers.grade === '11' && lead.utm.utm_source === 'test' && lead.journey.interactions > 5, 'lead: payload carries answers, campaign and journey');
  check(lead?.segment === 'ready', 'lead: payload carries the diagnosis segment');

  await page.waitForTimeout(800);
  check((await page.locator('[data-ack-head]').textContent()).length > 0, 'thanks: the diagnosis headline renders');
  check((await page.locator('[data-ack-hi]').textContent()).includes('הורה'), 'thanks: greets the parent by name');
  check((await events(page)).includes('cipher_thankyou_view'), 'data: thankyou_view recorded');
  check(errors.length === 0, `parents: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── the challenge: locked behind the mark, a format-checked flag ──────── */
{
  const { ctx, page, errors } = await phone();
  await page.goto(`${BASE}/#challenge`);
  await page.waitForTimeout(1200);
  check(await page.locator('[data-challenge]').isHidden(), 'challenge: stays hidden until the mark is tapped');
  await page.evaluate(() => document.querySelector('[data-lock-open]').click());
  // the rings spin home and click in, the keyhole opens, then the panel
  check(await gone(page.locator('[data-lock]'), 6000), 'challenge: the mark unlocks and gives way');
  check(await page.locator('[data-challenge] a.ch__go').count() === 1, 'challenge: links to the live challenge while target/hints are unwired');
  check(errors.length === 0, `challenge: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── the teen's page, arriving through a shared link ───────────────────── */
{
  const { ctx, page, errors } = await phone();
  await page.goto(`${BASE}/kid/?ref=abc123xyz0`);
  await page.waitForTimeout(1500);
  await page.locator('#method .lens button[data-mode="research"]').click();
  check(await page.locator('#method .sys').getAttribute('data-mode') === 'research', 'kid: the lenses take the system apart here too');
  check(await page.locator('#program .loop__dial path').count() === 30, 'kid: the dial has an arc per session');
  await page.locator('#check .check__grid button').first().click();
  check((await page.locator('#check .check__say').textContent()).length > 0, 'kid: the self-check answers with a verdict');
  check(await page.locator('#check .check__ring path.on').count() === 1, 'kid: the ring lights an arc per box ticked');
  await page.evaluate(() => document.querySelector('[data-lock-open]').click());
  await gone(page.locator('[data-lock]'), 6000);
  check(await page.locator('[data-challenge] a[href*="cipher-challenge"]').count() === 1, 'kid: links to the live challenge while the backend is unwired');
  await page.locator('[data-tell-parent]').first().click();
  const opened = await page.evaluate(() => window.__opened);
  check(opened.length === 1 && decodeURIComponent(opened[0]).includes('ref=abc123xyz0'), 'kid: "tell my parents" message carries the same ref');
  const ev = await events(page);
  check(ev.includes('cipher_share_opened') && ev.includes('cipher_challenge_interest'), 'kid: share_opened and challenge_interest recorded');
  check(errors.length === 0, `kid: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── the thank-you page, visited cold (no quiz state) ───────────────────── */
{
  const { ctx, page, errors } = await phone();
  await page.goto(`${BASE}/thanks/`);
  await page.waitForTimeout(1000);
  check((await page.locator('[data-ack-head]').getAttribute('aria-label') || '').length > 0, 'thanks (cold): still shows a diagnosis, not a blank state');
  check(await until(page, () => [...document.querySelectorAll('[data-ack-head] .w')].every((w) => w.classList.contains('is-done')), 4000), 'thanks: the headline decodes into words');
  check(await page.locator('[data-send-note]').isVisible(), 'thanks (cold): the send-to-kid reminder shows');
  await page.locator('[data-share-now="kid"]').first().click();
  const opened = await page.evaluate(() => window.__opened);
  check(opened.length === 1 && opened[0].startsWith('https://wa.me/') && decodeURIComponent(opened[0]).includes('/kid/'), 'thanks (cold): share links resolve one level up correctly');
  check(errors.length === 0, `thanks: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── reduced motion and no JavaScript: everything still reads ──────────── */
for (const [path, label] of [['/', 'parents'], ['/kid/', 'kid'], ['/thanks/', 'thanks']]) {
  for (const [motionLabel, opts] of [['reduced motion', { reducedMotion: 'reduce' }], ['no JavaScript', { javaScriptEnabled: false }]]) {
    const { ctx, page } = await phone(opts);
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1200);
    const hidden = await page.evaluate(() => [...document.querySelectorAll('h1, h2, .lead, .say, .seats, .coda__line, .coda__go, .tier button')]
      .filter((el) => { const s = getComputedStyle(el); return +s.opacity < 0.5 || s.visibility === 'hidden'; })
      .map((el) => el.textContent.trim().slice(0, 30)));
    check(hidden.length === 0, `${label}, ${motionLabel}: all copy visible ${hidden.join(' | ')}`);
    if (label === 'parents') {
      // still: the syllabus is one screen to read, not a scene to scroll through
      const still = await page.evaluate(() => ({ still: document.documentElement.classList.contains('is-still'), h: document.querySelector('.course__track').offsetHeight / innerHeight }));
      check(still.h < 1.6, `parents, ${motionLabel}: the syllabus does not hold the page (${still.h.toFixed(2)} screens)`);
    }
    await ctx.close();
  }
}

await browser.close();
console.log(fails.length ? `\n${fails.length} failed` : '\nall passed');
process.exit(fails.length ? 1 : 0);
