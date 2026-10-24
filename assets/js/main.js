// The parents' page: motion, chapters, sharing, and the data layer.
import { track, watchChapters } from './track.js';
import { createShare, whatsapp, copy, reportOpen } from './share.js';
import { createVortex, boxLayout } from './vortex.js';
import { CONFIG } from './config.js';
import { mountFilm } from './film.js';
import { mountLenses } from './layers.js';
import { createGates } from './gates.js';
import { createWall } from './wall.js';
import { atmosphere, mood } from './atmos.js';
import { createPortrait } from './portrait.js';
import { arcRing } from './rings.js';
import { createDial, DIAL_R } from './dial.js';
import { mountChallenge } from './challenge.js';
import { mountQuiz } from './quiz.js';
import { PREREQ_KEY } from './diagnosis.js';
import { decode, reveals, reduce, countUp, remeasure } from './motion.js';

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
remeasure();

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
  const on = pastHero && !nearEnd && !$('dialog[open]') && !document.documentElement.classList.contains('is-locked');
  dock.classList.toggle('is-on', on);
  dock.setAttribute('aria-hidden', String(!on));
  $$('a, button', dock).forEach((el) => (el.tabIndex = on ? 0 : -1));
}
addEventListener('scroll', () => top.classList.toggle('is-solid', scrollY > 40), { passive: true });
new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; syncDock(); }, { threshold: 0.15 }).observe($('.hero'));
{
  const near = new Set();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? near.add(e.target) : near.delete(e.target)));
    nearEnd = near.size > 0;
    syncDock();
  });
  io.observe($('#fit'));
  io.observe($('.coda'));
}

/* ── hero: the rings click into the mark, then the keyhole opens on the film ── */
{
  const canvas = $('.hero__field');
  const box = $('.hero__mark');
  const film = Boolean(CONFIG.film?.src);
  const push = film ? (parseFloat(getComputedStyle(box).getPropertyValue('--P')) || 1) - 1 : 0;
  const mark = createVortex(canvas, { dust: innerWidth < 700 ? 220 : 380, rim: film, layout: boxLayout(box, canvas, push) });
  // the box moves when fonts land or the question rewraps; the canvas may not
  new ResizeObserver(() => mark.relayout()).observe(box);
  document.fonts?.ready?.then(() => mark.relayout());
  mountFilm($('.film'), mark);
  decode($('.hero .decode'), 900).then(() => {
    gsap.to('.hero .rise', { opacity: 1, y: 0, duration: reduce ? 0 : 0.8, stagger: 0.1, ease: 'power3.out' });
  });
}

/* ── reveals, and the light under the page ────────────────────────────── */
reveals();
atmosphere();

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

/* ── same preparation: the scan finds the one ─────────────────────────── */
createWall($('.wall'));

/* ── defend / attack / research ───────────────────────────────────────── */
mountLenses($('#method'), { markSrc: 'assets/img/logo-mark.webp', onPick: (mode) => track('lens_select', { mode }) });

/* ── HP: an x-ray of the installer, the flaws, the stamps ─────────────── */
{
  const hp = $('.hp');
  const tabs = $$('.hp__tabs button');
  const say = $('.hp__say');
  const svg = $('.hp__stage svg');
  const cut = $('.hp__cut'), beam = $('.hp__beam');
  const flaws = $$('.hp__flaws circle');
  const stamps = $$('.hp .stamp');
  const SAY = [
    '<strong>מבחוץ:</strong> מורידים, לוחצים "המשך", והמדפסת מותקנת. כמעט אף אחד לא חושב על זה פעמיים.',
    '<strong>מבפנים:</strong> ניר בדק לעומק מה התוכנה עושה ברגע שלוחצים על הכפתור. בדיוק את הדרך הזו מלמדים בתכנית.',
    '<strong>שלוש חולשות בדרגת חומרה גבוהה.</strong> Cipher דיווחה, HP תיקנה ופרסמה עדכון אבטחה, והקרדיט רשום על שמו של ניר.'
      + '<span class="cves mono">' + ['12554', '12555', '12556'].map((n) => `<a href="https://www.cve.org/CVERecord?id=CVE-2026-${n}" target="_blank" rel="noopener" data-track="proof_link" data-target="cve-${n}">CVE-2026-${n}</a>`).join('') + '</span>',
  ];
  let step = -1, seen = false, auto = true, timer = 0;
  const scan = { x: 320 };
  function draw() {
    cut.setAttribute('x', scan.x.toFixed(1));
    cut.setAttribute('width', (320 - scan.x).toFixed(1));
    beam.setAttribute('transform', `translate(${scan.x.toFixed(1)} 0)`);
    for (const f of flaws) {
      const hit = scan.x <= +f.getAttribute('cx');
      if (hit && !f.classList.contains('is-hit') && seen && step === 1) mood.set('flaw');
      f.classList.toggle('is-hit', hit);
    }
  }
  // the scan reads the window right to left, the way the page does
  function xray(on, now) {
    gsap.killTweensOf(scan);
    gsap.killTweensOf(beam);
    if (!on || now || reduce) { scan.x = on ? 18 : 320; draw(); gsap.set(beam, { opacity: 0 }); return; }
    gsap.set(beam, { opacity: 1 });
    gsap.fromTo(scan, { x: 304 }, { x: 18, duration: 1.8, ease: 'power1.inOut', onUpdate: draw });
    gsap.to(beam, { opacity: 0, duration: 0.3, delay: 1.7 });
  }
  function stamp(on) {
    gsap.killTweensOf(stamps);
    if (!on || reduce) { gsap.set(stamps, { opacity: on ? 1 : 0, scale: 1, transformOrigin: '50% 50%' }); return; }
    gsap.fromTo(stamps, { opacity: 0, scale: 1.9 }, { opacity: 1, scale: 1, transformOrigin: '50% 50%', duration: 0.3, ease: 'power4.in', stagger: 0.3, delay: 0.2 });
    // each one lands with a thud
    stamps.forEach((_, i) => gsap.fromTo(svg, { x: 0 }, { x: 2, duration: 0.05, yoyo: true, repeat: 3, delay: 0.5 + i * 0.3, ease: 'none', clearProps: 'x' }));
  }
  function set(n, user) {
    if (n === step) return;
    step = n;
    hp.dataset.step = n;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(+t.dataset.step === n)));
    say.innerHTML = SAY[n];
    xray(n > 0, n === 2);
    stamp(n === 2);
    if (n !== 1) mood.clear('flaw');
    if (user) track('hp_step', { step: n });
  }
  set(0);
  function play() {
    clearTimeout(timer);
    if (!auto || !seen || reduce) return;
    if (step === 0) timer = setTimeout(() => { set(1); play(); }, 900);
    else if (step === 1) timer = setTimeout(() => { set(2); auto = false; }, 3600);
  }
  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    if (seen) play(); else { clearTimeout(timer); mood.clear('flaw'); }
  }, { threshold: 0.45 }).observe(hp);
  tabs.forEach((t) => t.addEventListener('click', () => { auto = false; clearTimeout(timer); set(+t.dataset.step, true); }));

  // more than thirty: counted up as it comes into view
  countUp($('[data-count]'), 1.4);
}

/* ── the press: a stack of clippings, the one in front readable in full ── */
// Each clipping's place in the pile is --i (its offset down the stack, so the
// headlines behind stay readable) and --z (its layer). Bringing one forward
// lifts it out from behind the others and lays it on top.
{
  const stack = $('.press__stack');
  // the DOM lists the front clipping first, so it's read first; the pile runs back to front
  const pile = $$('.story', stack).reverse();
  const N = pile.length;
  let busy = false, seen = false, hold = false, dealt = reduce, swaps = N, timer = 0;
  const layer = (c, i) => { c.style.setProperty('--z', i); c.classList.toggle('is-front', i === N - 1); };
  pile.forEach((c, i) => { layer(c, i); gsap.set(c, { '--i': i }); });

  function forward(card) {
    const from = pile.indexOf(card);
    if (from === N - 1 || busy) return;
    busy = true;
    pile.splice(from, 1);
    pile.push(card);
    const d = reduce ? 0 : 1;
    // the ones that were in front of it close the gap
    pile.slice(from, N - 1).forEach((c, k) => {
      layer(c, from + k);
      gsap.to(c, { '--i': from + k, duration: 0.5 * d, delay: 0.2 * d, ease: 'power3.inOut', overwrite: 'auto' });
    });
    gsap.timeline({ onComplete: () => { busy = false; } })
      .to(card, { '--dy': '-58px', '--dr': '-2deg', duration: 0.3 * d, ease: 'power2.out' })
      .call(() => layer(card, N - 1))
      .to(card, { '--i': N - 1, '--dy': '0px', '--dr': '0deg', duration: 0.6 * d, ease: 'power3.out' });
  }

  stack.addEventListener('click', (e) => {
    const card = e.target.closest('.story');
    if (!card || card.classList.contains('is-front')) return;
    // a clipping at the back comes forward first; the one in front opens
    // (and only that one counts as press_open in the page-wide tracker)
    e.preventDefault();
    e.stopPropagation();
    swaps = 0;
    forward(card);
    track('press_card', { target: card.dataset.target });
  });
  // tabbing onto a clipping at the back brings it forward (a mouse or a tap goes through click)
  stack.addEventListener('focusin', (e) => {
    const card = e.target.closest('.story');
    if (card?.matches(':focus-visible') && !card.classList.contains('is-front')) { swaps = 0; forward(card); }
  });

  // on its own, it goes once around the pile and stops where it began
  const cycle = () => {
    clearTimeout(timer);
    if (dealt && seen && swaps > 0 && !reduce) {
      timer = setTimeout(() => { if (!hold && !busy) { swaps -= 1; forward(pile[0]); } cycle(); }, 4600);
    }
  };
  stack.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold = true; });
  stack.addEventListener('pointerleave', () => { hold = false; });
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; cycle(); }, { threshold: 0.6 }).observe(stack);

  // dealt onto the table, back to front
  if (!reduce) {
    gsap.set(pile, { opacity: 0, '--dy': '-40px', '--dr': (i) => (i % 2 ? '5deg' : '-5deg') });
    whenSeen(stack, () => gsap.to(pile, {
      opacity: 1, '--dy': '0px', '--dr': '0deg', duration: 0.75, stagger: 0.14, ease: 'power3.out',
      onComplete: () => { dealt = true; cycle(); },
    }), 0.35);
  }
}

/* ── Nir: the portrait in digits, the names like credits, the book ────── */
{
  createPortrait($('.nir__photo'));

  // Latin only: these are company names, read left to right
  const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const names = $$('.names li');
  const credit = (li, delay) => new Promise((done) => {
    const nm = li.firstElementChild, s = nm.lastElementChild, fin = nm.firstElementChild.textContent;
    const t0 = performance.now() + delay, len = fin.length, dur = 260 + len * 70;
    (function tick(now) {
      const p = (now - t0) / dur;
      if (p < 0) { requestAnimationFrame(tick); return; }
      if (p >= 1) { nm.classList.remove('is-coding'); nm.classList.add('is-lit'); done(); return; }
      // settled from the left, noise to the right of it
      const n = Math.floor(p * len);
      let out = fin.slice(0, n);
      for (let k = n; k < len; k++) out += fin[k] === ' ' ? ' ' : POOL[(Math.random() * POOL.length) | 0];
      s.textContent = out;
      requestAnimationFrame(tick);
    })(performance.now());
  });
  if (!reduce) {
    names.forEach((li) => {
      const fin = li.textContent;
      li.innerHTML = '';
      const nm = Object.assign(document.createElement('span'), { className: 'nm is-coding' });
      const f = Object.assign(document.createElement('span'), { className: 'nm__f', textContent: fin });
      const sc = Object.assign(document.createElement('span'), { className: 'nm__s' });
      sc.setAttribute('aria-hidden', 'true');
      nm.append(f, sc);
      li.append(nm);
    });
    whenSeen($('.names'), () => names.forEach((li, i) => credit(li, 120 + i * 300)), 0.7);
  }

  // the book turns toward the reader as the chapter passes
  const book = $('.book');
  if (!reduce) {
    gsap.fromTo(book, { '--turn': '-58deg' }, {
      '--turn': '-14deg', ease: 'none',
      scrollTrigger: { trigger: book, start: 'top bottom', end: 'bottom 30%', scrub: 0.6 },
    });
  }
}

/* ── program: thirty sessions around a dial, and the help between them ── */
{
  const nodes = $$('.loop__node');
  const say = $('.loop__say');
  const dot = $('.loop__dot');
  const loop = $('.loop');
  createDial(loop);

  // the help between sessions rides the dial from one kind to the next
  const ANGLES = [-90, 180, 90, 0];
  const dotAt = { a: -90 };
  let current = 0;
  function place() {
    const w = loop.clientWidth, r = w * (DIAL_R / 200), c = w / 2, rad = (dotAt.a * Math.PI) / 180;
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
    gsap.to(dotAt, { a: target, duration: reduce ? 0 : 1.1, ease: 'power2.inOut', overwrite: true, onUpdate: place });
    if (!auto) track('program_node', { node: k });
  }
  place();
  new ResizeObserver(place).observe(loop);
  set(0, true);
  const stop = autoplay(loop, 3000, () => set((current + 1) % nodes.length, true));
  nodes.forEach((b, k) => b.addEventListener('click', () => { stop(); set(k, false); }));

  // the lab: each stage types itself out, the lit segment slides along
  const LAB = ['למצוא איך השרת מזהה משתמשים.', 'שלוש השערות. שתיים נפסלות, אחת מחזיקה.', 'דוח קצר: מה מצאנו, ולמה זה עבד.'];
  const steps = $$('.lab__steps span');
  const stepRail = $('.lab__steps');
  const sr = $('.lab__line .sr');
  const typed = $('.lab__type');
  let s = 0, typing = 0;
  function type(text) {
    clearInterval(typing);
    sr.textContent = text;
    if (reduce) { typed.textContent = text; return; }
    let n = 0;
    typed.textContent = '';
    typing = setInterval(() => {
      n += 1;
      typed.textContent = text.slice(0, n);
      if (n >= text.length) clearInterval(typing);
    }, 34);
  }
  whenSeen($('.lab'), () => type(LAB[0]), 0.6);
  autoplay($('.lab'), 3400, () => {
    s = (s + 1) % 3;
    steps.forEach((el, j) => el.classList.toggle('is-on', j === s));
    stepRail.style.setProperty('--k', s);
    type(LAB[s]);
  });

}

/* ── the syllabus: the mark's rings are the course, outside in ─────────── */
// Basics on the two outer rings, testing on the middle two, research at the
// core around the keyhole. Scrolling the chapter moves the camera in ring by
// ring; the panel switches with it, and the chapters of the lit rings take
// turns lighting their own stretch of arc.
{
  const scene = $('.course');
  const trackEl = $('.course__track');
  const box = $('.course__mark');
  const canvas = $('.course__field');
  const tabs = $$('.course__tabs [role="tab"]');
  const rail = $('.course__tabs');
  const panels = $$('.course .tier');
  const still = reduce;
  const TIERS = [
    { rings: [4, 5], zoom: 1 },
    { rings: [2, 3], zoom: 1.42 },
    { rings: [0, 1], zoom: 2.05 },
  ];
  const mark = createVortex(canvas, { dust: still ? 0 : 140, halo: 1.2, layout: boxLayout(box, canvas) });
  new ResizeObserver(() => mark.relayout()).observe(box);
  document.fonts?.ready?.then(() => mark.relayout());

  let tier = -1, lit = -1, timer = 0, held = null, inside = false;
  const reached = new Set();
  const buttons = (t) => $$('button', panels[t]);

  // one chapter's stretch of its tier's rings
  function light(t, k) {
    lit = k;
    buttons(t).forEach((b, j) => b.classList.toggle('is-lit', j === k));
    if (k < 0) { mark.setHighlight([]); return; }
    const { rings } = TIERS[t], n = buttons(t).length, a = k / n, b = (k + 1) / n;
    mark.setHighlight([], (ring, u) => (rings.includes(ring) && u >= a && u < b ? 1 : 0));
  }
  // while nobody points at a chapter, they take turns
  function cycle() {
    clearTimeout(timer);
    if (still || held || !inside) return;
    timer = setTimeout(() => { light(tier, (lit + 1) % buttons(tier).length); cycle(); }, 1250);
  }

  function setTier(t, source) {
    if (t === tier) return;
    tier = t;
    tabs.forEach((b, i) => { b.setAttribute('aria-selected', String(i === t)); b.tabIndex = i === t ? 0 : -1; });
    panels.forEach((p, i) => { p.hidden = i !== t; });
    rail.style.setProperty('--k', t);
    // the tier's own rings at half light, so the chapter in turn stands out on them;
    // the rings outside it are huge by now and go nearly dark
    const { rings } = TIERS[t];
    mark.setLight([0, 1, 2, 3, 4, 5].map((r) => (rings.includes(r) ? 0.5 : r > rings[1] ? 0.05 : 0.2)));
    rings.forEach((r) => mark.flash(r, 0.9));
    if (inside) mood.set(`tier-${t + 1}`);
    if (!still) gsap.fromTo(buttons(t), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out', overwrite: true });
    if (still) mark.setCamera({ s: TIERS[t].zoom });
    held = null;
    light(t, 0);
    cycle();
    if (source) track('syllabus_tier', { tier: t + 1, source });
    reach();
  }
  // the first time a tier is on screen by scrolling to it
  function reach() {
    if (!inside || reached.has(tier)) return;
    reached.add(tier);
    track('syllabus_tier', { tier: tier + 1, source: 'scroll' });
  }

  // where each tier holds: the middle of its third of the track
  function holdY(t) {
    const top = trackEl.getBoundingClientRect().top + scrollY;
    return top + ((t + 0.5) / 3) * (trackEl.offsetHeight - innerHeight);
  }
  function go(t) {
    if (still) { setTier(t, 'tab'); return; }
    track('syllabus_tier', { tier: t + 1, source: 'tab' });
    reached.add(t);
    if (window.__lenis) window.__lenis.scrollTo(holdY(t), { duration: 1.2 });
    else scrollTo({ top: holdY(t), behavior: 'smooth' });
  }
  tabs.forEach((b, i) => b.addEventListener('click', () => go(i)));
  // arrow keys move between tabs; in Hebrew the next one is to the left
  rail.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: 1, ArrowRight: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const t = (tier + step + 3) % 3;
    tabs[t].focus();
    go(t);
  });

  // pointing at a chapter lights its arc and holds it there
  panels.forEach((p, t) => buttons(t).forEach((b, k) => {
    const on = () => { held = b; clearTimeout(timer); light(t, k); };
    const off = () => { if (held === b) { held = null; cycle(); } };
    b.addEventListener('pointerenter', on);
    b.addEventListener('focus', on);
    b.addEventListener('pointerleave', off);
    b.addEventListener('blur', off);
  }));

  const smooth = (a, b, v) => { const x = Math.min(1, Math.max(0, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
  if (still) {
    // no scene: the mark sits still above the tabs, every tier a tap away
    new IntersectionObserver(([e]) => {
      inside = e.isIntersecting;
      if (inside) mood.set(`tier-${tier + 1}`); else mood.clear(`tier-${tier + 1}`);
    }, { rootMargin: '-40% 0px -40% 0px' }).observe(scene);
    setTier(0);
  } else {
    setTier(0);
    ScrollTrigger.create({
      trigger: trackEl, start: 'top top', end: 'bottom bottom',
      onUpdate: (st) => {
        const p = st.progress;
        setTier(Math.min(2, Math.floor(p * 3)));
        // the camera moves in at each change of tier and holds in between
        const s = TIERS[0].zoom
          + (TIERS[1].zoom - TIERS[0].zoom) * smooth(1 / 3 - 0.1, 1 / 3 + 0.1, p)
          + (TIERS[2].zoom - TIERS[1].zoom) * smooth(2 / 3 - 0.1, 2 / 3 + 0.1, p);
        mark.setCamera({ s });
      },
      onToggle: (st) => {
        inside = st.isActive;
        if (inside) { mood.set(`tier-${tier + 1}`); reach(); cycle(); } else { mood.clear(`tier-${tier + 1}`); clearTimeout(timer); }
      },
    });

    // a mouse wheel settles on the nearest tier (?nosnap to turn it off)
    const lenis = window.__lenis;
    if (lenis && !/[?&]nosnap\b/.test(location.search)) {
      let idle = 0;
      lenis.on('scroll', () => {
        clearTimeout(idle);
        if (!inside) return;
        idle = setTimeout(() => {
          if (!inside || lenis.isScrolling === 'smooth') return;
          const ys = [0, 1, 2].map(holdY);
          const near = ys.reduce((a, y) => (Math.abs(y - scrollY) < Math.abs(a - scrollY) ? y : a), ys[0]);
          if (Math.abs(near - scrollY) > 4 && Math.abs(near - scrollY) < innerHeight * 0.45) lenis.scrollTo(near, { duration: 0.9 });
        }, 170);
      });
    }
  }
}

/* ── the filter: who gets in, and what they need to know already ──────── */
{
  createGates($('.gates__flow'), $$('.gates__steps li'));

  const buttons = $$('.check__grid button');
  const reqs = buttons.filter((b) => b.dataset.req !== 'unsure');
  const unsure = $('.check__grid [data-req="unsure"]');
  const say = $('.check__say');
  const send = $('.check__send');
  let reported = 0;
  function verdict(n, isUnsure) {
    if (isUnsure) return 'הכי מדויק שהם יסמנו בעצמם. שלחו להם את הרשימה: הם יסמנו, ויוכלו לשלוח לכם את התשובות.';
    if (n === 0) return 'כל סימון משנה את הצעד הבא שנציע לכם.';
    if (n >= 6) return `${n} מתוך ${reqs.length}. נשמע מוכן: בדיקת ההתאמה היא הצעד הבא.`;
    if (n >= 3) return `${n} מתוך ${reqs.length}. קרוב. בשיחה נבדוק מה חסר, ואם כדאי להתחיל במסלול ההכנה.`;
    return `${n} מתוך ${reqs.length}. מתחילים במסלול ההכנה, ומשם חוזרים לשלבי הקבלה.`;
  }
  function sync(changed) {
    const on = reqs.filter((x) => x.getAttribute('aria-pressed') === 'true');
    const isUnsure = unsure.getAttribute('aria-pressed') === 'true';
    say.textContent = verdict(on.length, isUnsure);
    send.hidden = !isUnsure;
    const state = { n: on.length, of: reqs.length, items: on.map((x) => x.dataset.req), unsure: isUnsure };
    try { sessionStorage.setItem(PREREQ_KEY, JSON.stringify(state)); } catch { /* fine */ }
    dispatchEvent(new Event('cipher:prereq'));
    if (changed) {
      track('prereq_toggle', { req: changed.dataset.req, on: changed.getAttribute('aria-pressed') === 'true', count: on.length });
      clearTimeout(reported);
      reported = setTimeout(() => track('prereq_result', { count: on.length, unsure: isUnsure, items: state.items.join(',') }), 1500);
    }
  }
  buttons.forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    sync(b);
    ring();
  }));

  // one arc per requirement ticked; all seven unlock the keyhole
  const req = arcRing(reqs.length, 'check__ring', 7);
  $('.check__out').prepend(req.svg);
  function ring() {
    req.set(reqs.filter((x) => x.getAttribute('aria-pressed') === 'true').length);
    req.svg.classList.toggle('is-unsure', unsure.getAttribute('aria-pressed') === 'true' && !reqs.some((x) => x.getAttribute('aria-pressed') === 'true'));
  }
  ring();

  // the price comes up out of noise, once
  const price = $('.price__n');
  const fin = price.textContent;
  whenSeen($('.price'), () => {
    track('price_view');
    if (reduce) return;
    const t0 = performance.now(), dur = 950;
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur), settled = Math.floor(p * fin.length);
      price.textContent = [...fin].map((ch, i) => (i < settled || !/\d/.test(ch) ? ch : String((Math.random() * 10) | 0))).join('');
      if (p < 1) requestAnimationFrame(tick);
      else { price.textContent = fin; price.classList.add('is-lit'); }
    })(t0);
  }, 0.6);
}

/* ── their turn: the mark guards the challenge ────────────────────────── */
mountChallenge($('.turn [data-lock]'), $('.turn [data-challenge]'), {
  source: 'parents',
  onSolved(root) {
    root.innerHTML = `
      <p class="ch__mission">פתרתם. זה בדיוק מה שאנחנו מחפשים.</p>
      <p class="lead">ספרו לנו בבדיקת ההתאמה, ונדבר.</p>
      <a class="btn btn--solid ch__go" href="#fit" data-track="cta_fit" data-source="solved">לבדיקת ההתאמה</a>`;
  },
});

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

  const chapter = e.target.closest('[data-chapter-n]');
  if (chapter) {
    const n = chapter.dataset.chapterN;
    $$('.syl details', syllabus).forEach((d) => { d.open = d.dataset.n === n; });
    openSheet(syllabus, `chapter-${n}`);
    syllabus.querySelector(`details[data-n="${n}"]`)?.scrollIntoView({ block: 'center' });
    return;
  }

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
    if (note) note.textContent = ok ? 'הקישור הועתק. את האתגר פותחים במחשב.' : 'לא הצלחנו להעתיק. נסו לשלוח בוואטסאפ.';
    return;
  }

  const t = e.target.closest('[data-track]');
  if (t) track(t.dataset.track, { source: t.dataset.source, target: t.dataset.target });
});

$$('.faq details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) track('faq_open', { q: d.dataset.faq }); }));

/* ── the questions open and close smoothly ────────────────────────────── */
// <details> snaps; the answer gets a wrapper whose height is animated, and the
// open attribute changes at the moment that keeps the summary's own semantics
$$('.faq details').forEach((d) => {
  const a = d.querySelector('p');
  const wrap = document.createElement('div');
  wrap.className = 'faq__a';
  a.replaceWith(wrap);
  wrap.append(a);
  d.querySelector('summary').addEventListener('click', (e) => {
    if (reduce) return;
    e.preventDefault();
    gsap.killTweensOf(wrap);
    const midway = d.classList.contains('is-closing');
    if (!d.open || midway) {
      // reopened while still closing: carry on from where it is
      const from = midway ? wrap.offsetHeight : 0;
      d.classList.remove('is-closing');
      d.open = true;
      gsap.fromTo(wrap, { height: from, opacity: midway ? +getComputedStyle(wrap).opacity : 0 }, { height: 'auto', opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'height,opacity' });
      gsap.fromTo(a, { y: -8 }, { y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
    } else {
      d.classList.add('is-closing');
      gsap.to(wrap, { height: 0, opacity: 0, duration: 0.38, ease: 'power2.inOut', onComplete: () => { d.open = false; d.classList.remove('is-closing'); gsap.set(wrap, { clearProps: 'height,opacity' }); } });
    }
  });
});

/* ── the bookend: the mark comes together again, and opens on the way in ── */
{
  const coda = $('.coda');
  const canvas = $('.coda__field');
  const box = $('.coda__mark');
  const mark = createVortex(canvas, { dust: reduce ? 0 : 160, layout: boxLayout(box, canvas, 0.12) });
  new ResizeObserver(() => mark.relayout()).observe(box);
  document.fonts?.ready?.then(() => mark.relayout());
  const go = $('.coda__go');
  mark.onResize(() => {
    // the button sits in the keyhole: canvas px, from the corner of the button's own box
    const g = mark.geometry(), c = canvas.getBoundingClientRect(), r = (go.offsetParent || coda).getBoundingClientRect();
    coda.style.setProperty('--cx', `${(g.cx + c.left - r.left).toFixed(1)}px`);
    coda.style.setProperty('--cy', `${(g.cy + c.top - r.top).toFixed(1)}px`);
  });
  mark.assembled.then(() => {
    // part way: wide enough for the button, the ring still reads as the mark
    mark.setOpen(0.6, reduce);
    setTimeout(() => coda.classList.add('is-open'), reduce ? 0 : 450);
  });
}

/* ── the fit check ────────────────────────────────────────────────────── */
mountQuiz($('[data-quiz]'));

/* ── data ─────────────────────────────────────────────────────────────── */
reportOpen();
track('page_view', { referrer: document.referrer || null });
watchChapters();
whenSeen($('.foot'), () => track('journey_end'), 0.3);
