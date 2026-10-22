// The parents' page: motion, chapters, sharing, and the data layer.
import { track, watchChapters } from './track.js';
import { createShare, whatsapp, copy, reportOpen } from './share.js';
import { createVortex } from './vortex.js';
import { createSystem } from './layers.js';
import { mountQuiz } from './quiz.js';
import { decode, reveals, reduce } from './motion.js';

const fine = matchMedia('(pointer: fine)').matches;
const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── scrolling ────────────────────────────────────────────────────────────
   Lenis only for a mouse wheel; phones keep their native scroll. Anything
   that scrolls the page goes through window.__lenis when it exists. */
if (fine && !reduce && window.Lenis) {
  const lenis = new window.Lenis({ lerp: 0.11 });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.fonts?.ready?.then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = a.getAttribute('href') === '#top' ? document.body : $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  if (window.__lenis) window.__lenis.scrollTo(target === document.body ? 0 : target, { offset: -70 });
  else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});

/* ── header and dock ──────────────────────────────────────────────────── */
const top = $('.top');
const dock = $('.dock');
let pastHero = false, nearEnd = false;
function syncDock() {
  const on = pastHero && !nearEnd && !$('dialog[open]');
  dock.classList.toggle('is-on', on);
  dock.setAttribute('aria-hidden', String(!on));
  $$('a, button', dock).forEach((el) => (el.tabIndex = on ? 0 : -1));
}
addEventListener('scroll', () => top.classList.toggle('is-solid', scrollY > 40), { passive: true });
new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; syncDock(); }, { threshold: 0.15 }).observe($('.hero'));
new IntersectionObserver((es) => { nearEnd = es.some((e) => e.isIntersecting); syncDock(); }).observe($('#fit'));

/* ── hero: the mark assembles, the headline decodes ───────────────────── */
createVortex($('.hero__field'), {
  layout: (w, h) => (w >= 900
    ? { cx: w * 0.27, cy: h * 0.52, R: Math.min(h * 0.34, w * 0.22) }
    : { cx: w * 0.5, cy: Math.max(190, h * 0.315), R: Math.min(w * 0.45, h * 0.235) }),
});

decode($('.hero .decode'), 900).then(() => {
  gsap.to('.hero .rise', { opacity: 1, y: 0, duration: reduce ? 0 : 0.8, stagger: 0.12, ease: 'power3.out' });
});

/* ── reveals ───────────────────────────────────────────────────────────── */
reveals();

// run `fn` once, the first time `el` is mostly on screen
function whenSeen(el, fn, threshold = 0.45) {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { threshold });
  io.observe(el);
}
// a ticker that only runs while its element is on screen and the visitor hasn't taken over
function autoplay(el, ms, step) {
  let timer = 0, stopped = false;
  const io = new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (e.isIntersecting && !stopped && !reduce) timer = setInterval(step, ms);
  }, { threshold: 0.4 });
  io.observe(el);
  return () => { stopped = true; clearInterval(timer); io.disconnect(); };
}

/* ── same preparation: one zero becomes a one ─────────────────────────── */
{
  const zeros = $('.zeros');
  zeros.innerHTML = '<span>0</span>'.repeat(36);
  const cells = $$('span', zeros);
  const ONE = 21;
  whenSeen(zeros, () => {
    if (reduce) { cells[ONE].textContent = '1'; cells[ONE].classList.add('is-one'); return; }
    // a scan passes over everyone; it stops on exactly one
    cells.forEach((c, i) => setTimeout(() => { c.classList.add('is-scan'); setTimeout(() => c.classList.remove('is-scan'), 240); }, (11 - (i % 12)) * 60 + Math.floor(i / 12) * 30));
    setTimeout(() => { cells[ONE].textContent = '1'; cells[ONE].classList.add('is-one'); }, 1000);
  }, 0.8);
}

/* ── defend / attack / research ───────────────────────────────────────── */
{
  const sys = createSystem($('.sys'), { markSrc: 'assets/img/logo-mark.webp' });
  const say = $('.lens-say');
  const SAY = {
    defend: '<strong>מגן</strong> שומר על המערכת מבחוץ: מזהה איומים ועוצר אותם.',
    attack: '<strong>תוקף</strong> מחפש איפה ההגנה נשברת, עם כלים שכולם מכירים.',
    research: '<strong>חוקר</strong> מפרק את המערכת לשכבות ומוצא את מה שאף כלי עוד לא מכיר. את זה מלמדים אצלנו.',
  };
  const buttons = $$('.lens button');
  function set(mode, auto) {
    sys.setMode(mode);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    say.innerHTML = SAY[mode];
    if (!auto) track('lens_select', { mode });
  }
  set('defend', true);
  const order = ['defend', 'attack', 'research'];
  let i = 0;
  const stop = autoplay($('.sys'), 2200, () => {
    i++;
    set(order[i], true);
    if (i === order.length - 1) stop();
  });
  buttons.forEach((b) => b.addEventListener('click', () => { stop(); set(b.dataset.mode, false); }));
}

/* ── HP: outside, inside, the result ──────────────────────────────────── */
{
  const hp = $('.hp');
  const tabs = $$('.hp__tabs button');
  const say = $('.hp__say');
  const SAY = [
    '<strong>מבחוץ:</strong> מורידים, לוחצים "המשך", והמדפסת מותקנת. כמעט אף אחד לא חושב על זה פעמיים.',
    '<strong>מבפנים:</strong> ניר בדק לעומק מה התוכנה עושה ברגע שלוחצים על הכפתור. בדיוק את הדרך הזו מלמדים בתכנית.',
    '<strong>שלוש חולשות בדרגת חומרה גבוהה.</strong> סייפר דיווחה, HP תיקנה ופרסמה עדכון אבטחה, והקרדיט רשום על שמו של ניר.'
      + '<span class="cves mono">' + ['12554', '12555', '12556'].map((n) => `<a href="https://www.cve.org/CVERecord?id=CVE-2026-${n}" target="_blank" rel="noopener" data-track="proof_link" data-target="cve-${n}">CVE-2026-${n}</a>`).join('') + '</span>',
  ];
  function set(n, auto) {
    hp.dataset.step = n;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(+t.dataset.step === n)));
    say.innerHTML = SAY[n];
    if (!auto) track('hp_step', { step: n });
  }
  set(0, true);
  let n = 0;
  const stop = autoplay(hp, 3200, () => { n++; set(n, true); if (n === 2) stop(); });
  tabs.forEach((t) => t.addEventListener('click', () => { stop(); set(+t.dataset.step, false); }));
}

/* ── program: the loop between sessions, and the lab ──────────────────── */
{
  const nodes = $$('.loop__node');
  const say = $('.loop__say');
  const dot = $('.loop__dot');
  const loop = $('.loop');
  // nodes sit at the top, left, bottom and right of the ring: counter-clockwise, the way Hebrew reads
  const ANGLES = [-90, 180, 90, 0];
  const dotAt = { a: -90 };
  let current = 0;
  function place() {
    const r = loop.clientWidth * 0.36, c = loop.clientWidth / 2, rad = (dotAt.a * Math.PI) / 180;
    dot.style.transform = `translate(${c + r * Math.cos(rad)}px, ${c + r * Math.sin(rad)}px)`;
  }
  function set(k, auto) {
    current = k;
    nodes.forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
    say.innerHTML = nodes[k].dataset.say;
    // screen y points down, so counter-clockwise means a falling angle
    let target = ANGLES[k];
    while (target > dotAt.a + 0.01) target -= 360;
    while (dotAt.a - target >= 360) target += 360;
    gsap.to(dotAt, { a: target, duration: reduce ? 0 : 0.9, ease: 'power2.inOut', overwrite: true, onUpdate: place });
    if (!auto) track('program_node', { node: k });
  }
  place();
  new ResizeObserver(place).observe(loop);
  set(0, true);
  const stop = autoplay(loop, 2600, () => set((current + 1) % nodes.length, true));
  nodes.forEach((b, k) => b.addEventListener('click', () => { stop(); set(k, false); }));

  const LAB = ['למצוא איך השרת מזהה משתמשים.', 'שלוש השערות. שתיים נפסלות, אחת מחזיקה.', 'דוח קצר: מה מצאנו, ולמה זה עבד.'];
  const steps = $$('.lab__steps span');
  const line = $('.lab__line');
  let s = 0;
  autoplay($('.lab'), 2300, () => {
    s = (s + 1) % 3;
    steps.forEach((el, j) => el.classList.toggle('is-on', j === s));
    line.textContent = LAB[s];
  });
}

/* ── the filter: what they need to know already ───────────────────────── */
{
  const buttons = $$('.check__grid button');
  const say = $('.check__say');
  let reported = 0;
  function verdict(n) {
    if (n === 0) return 'סמנו מה כבר נכון לגביהם.';
    if (n >= 7) return `${n} מתוך 8. נשמע מוכן: בדיקת ההתאמה היא הצעד הבא.`;
    if (n >= 4) return `${n} מתוך 8. קרוב. בשיחה נבדוק מה חסר, ואם כדאי להתחיל במסלול ההכנה.`;
    return `${n} מתוך 8. מתחילים במסלול ההכנה, ומשם ממשיכים לראיון.`;
  }
  buttons.forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    const n = buttons.filter((x) => x.getAttribute('aria-pressed') === 'true').length;
    say.textContent = verdict(n);
    track('prereq_toggle', { req: b.dataset.req, on, count: n });
    clearTimeout(reported);
    reported = setTimeout(() => track('prereq_result', { count: n, items: buttons.filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.dataset.req).join(',') }), 1500);
  }));
  whenSeen($('.price'), () => track('price_view'), 0.6);
}

/* ── their turn: the mark comes back, and the keyhole opens ───────────── */
{
  const field = $('.turn__field');
  const v = createVortex(field, {
    intro: false,
    layout: (w, h) => ({ cx: w / 2, cy: h * 0.5, R: Math.min(w * 0.3, h * 0.42) }),
  });
  v.ready.then(() => {
    ScrollTrigger.create({
      trigger: field, start: 'top 85%', end: 'bottom 35%',
      onUpdate: (st) => v.setGap(1.0 + st.progress * 1.3),
    });
  });
}

/* ── sharing ──────────────────────────────────────────────────────────── */
const shareSheet = $('#share');
const syllabus = $('#syllabus');
function openSheet(d, source) {
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  syncDock();
  track(d === shareSheet ? 'share_open' : 'syllabus_open', { source });
}
$$('dialog').forEach((d) => {
  d.addEventListener('close', syncDock);
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
});

document.addEventListener('click', async (e) => {
  const opener = e.target.closest('[data-open-share]');
  if (opener) { openSheet(shareSheet, opener.dataset.openShare); return; }
  if (e.target.closest('[data-open-syllabus]')) { openSheet(syllabus, 'program'); return; }

  const now = e.target.closest('[data-share-now]');
  if (now) {
    const target = now.dataset.shareNow;
    const { text } = createShare(target, now.dataset.source || (shareSheet.open ? 'sheet' : 'page'));
    track('share_sent', { target, via: 'whatsapp' });
    window.open(whatsapp(text), '_blank', 'noopener');
    return;
  }

  const cp = e.target.closest('[data-copy-kid]');
  if (cp) {
    const { url } = createShare('kid', cp.dataset.source || 'sheet');
    const ok = await copy(url);
    track('link_copied', { target: 'kid', ok });
    const note = cp.closest('.sheet__in, .chapter')?.querySelector('[data-copy-note]');
    if (note) note.textContent = ok ? 'הקישור הועתק. אפשר להדביק אותו בכל הודעה.' : 'לא הצלחנו להעתיק. נסו לשלוח בוואטסאפ.';
    return;
  }

  const t = e.target.closest('[data-track]');
  if (t) track(t.dataset.track, { source: t.dataset.source, target: t.dataset.target });
});

$$('.faq details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) track('faq_open', { q: d.dataset.faq }); }));

/* ── the fit check ────────────────────────────────────────────────────── */
mountQuiz($('[data-quiz]'));

/* ── data ─────────────────────────────────────────────────────────────── */
reportOpen();
track('page_view', { referrer: document.referrer || null });
watchChapters();
whenSeen($('.foot'), () => track('journey_end'), 0.3);
