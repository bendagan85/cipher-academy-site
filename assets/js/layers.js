// One system, three ways to look at it.
//   defend   — the layers sit closed under a shield that pulses with every hit
//   attack   — the shield is down; probes strike the outside edges, looking for a gap
//   research — the system comes apart into its layers, an amber scan sinks
//              through them, and one cell deep inside lights the button
//              everyone clicks on top
// As the chapter scrolls by, the camera rises over the system.
//
// Physical left/top inside the stack on purpose: the layers must line up with
// each other in 3D, and RTL logical offsets would mirror one of them.

import { mood } from './atmos.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OPEN = { chip: -150, circuit: -75, mem: 0, code: 75, ui: 150 };
const SHUT = { chip: -16, circuit: -8, mem: 0, code: 8, ui: 16 };

const CODE_ROWS = [[80, 78, 0], [50, 108, 1], [64, 94, 0], [34, 124, 0], [94, 64, 1], [48, 110, 0], [76, 82, 0], [26, 132, 1], [60, 98, 0], [86, 72, 0]];

function markup(markSrc) {
  const rows = CODE_ROWS.map(([l, w, k], i) => `<span class="row${k ? ' k' : ''}" style="left:${l}px;top:${14 + i * 14.5}px;width:${w}px"></span>`).join('');
  const cells = Array.from({ length: 64 }, (_, i) => `<i${i === 21 ? ' class="hot"' : ''}></i>`).join('');
  return `
  <div class="sys__tilt"><div class="sys__stack">
    <div class="ly ly--chip"><img src="${markSrc}" alt="" width="90" height="90"></div>
    <div class="ly ly--circuit">
      <svg viewBox="0 0 200 200" fill="none" stroke="rgba(130,170,255,.5)" stroke-width="1.2">
        <path d="M20 40h50l20 20h40M20 100h30l20-20h60l20 20h30M40 160h40l20-20h80M100 20v30M150 180v-40"/>
        <g fill="rgba(130,170,255,.7)" stroke="none"><circle cx="70" cy="40" r="3"/><circle cx="130" cy="60" r="3"/><circle cx="150" cy="80" r="3"/><circle cx="80" cy="160" r="3"/><circle cx="100" cy="50" r="3"/><circle cx="150" cy="140" r="3"/></g>
      </svg>
    </div>
    <div class="ly ly--mem"><div class="cells">${cells}</div></div>
    <div class="ly ly--code">${rows}</div>
    <div class="ly ly--ui">
      <span class="bar"></span>
      <span class="dot" style="left:9px"></span><span class="dot" style="left:19px"></span><span class="dot" style="left:29px"></span>
      <span class="t" style="left:80px;top:25px;width:78px"></span>
      <span class="t" style="left:108px;top:33px;width:50px;opacity:.7"></span>
      <span class="key"></span>
      <span class="t" style="left:12px;top:100px;width:146px"></span>
      <span class="t" style="left:52px;top:111px;width:106px"></span>
      <span class="t" style="left:82px;top:122px;width:76px"></span>
      <span class="shield"></span><span class="ripple"></span><span class="ripple"></span>
      <span class="probe p1"></span><span class="probe p2"></span><span class="probe p3"></span>
      <span class="spark s1"></span><span class="spark s2"></span><span class="spark s3"></span>
    </div>
    <span class="scan"></span>
    <span class="beam"></span>
  </div></div>`;
}

export function createSystem(root, { markSrc, onMode } = {}) {
  root.insertAdjacentHTML('beforeend', markup(markSrc));
  const layers = Object.fromEntries(Object.keys(OPEN).map((k) => [k, root.querySelector('.ly--' + k)]));
  const beam = root.querySelector('.beam');
  const scan = root.querySelector('.scan');
  const stack = root.querySelector('.sys__stack');
  const { gsap, ScrollTrigger } = window;
  let mode = null;

  gsap.set(beam, { rotationX: 90, transformOrigin: '50% 0%', scaleY: 0 });
  gsap.set(scan, { z: OPEN.ui + 30, opacity: 0 });
  for (const [k, el] of Object.entries(layers)) gsap.set(el, { z: SHUT[k] });

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    root.dataset.mode = next;
    onMode?.(next);
    const research = next === 'research';
    const z = research ? OPEN : SHUT;
    const d = reduce ? 0 : 1;
    Object.entries(layers).forEach(([k, el], i) => {
      gsap.to(el, { z: z[k], duration: 1.3 * d, delay: research ? (4 - i) * 0.05 * d : 0, ease: research ? 'expo.out' : 'power3.inOut', overwrite: true });
    });
    gsap.killTweensOf(scan);
    if (research && !reduce) {
      // the scan sinks through the layers and stops where the flaw is
      gsap.fromTo(scan, { z: OPEN.ui + 30, opacity: 0 }, { z: OPEN.mem, opacity: 1, duration: 1.4, delay: 0.45, ease: 'power2.inOut' });
      gsap.to(scan, { opacity: 0, duration: 0.6, delay: 2.1 });
    } else gsap.set(scan, { opacity: 0 });
    gsap.to(beam, { scaleY: research ? 1 : 0, duration: (research ? 0.7 : 0.25) * d, delay: research ? 1.5 * d : 0, ease: 'power2.inOut', overwrite: true });
  }

  // the camera rises over the system as the chapter scrolls by
  if (!reduce && ScrollTrigger) {
    gsap.fromTo(stack, { '--spin': '-64deg', '--tip': '70deg' }, {
      '--spin': '-28deg', '--tip': '55deg', ease: 'none',
      scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  }

  // lean toward the cursor, only while the scene is on screen
  let near = false;
  new IntersectionObserver(([e]) => { near = e.isIntersecting; }).observe(root);
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    const tilt = root.querySelector('.sys__tilt');
    addEventListener('pointermove', (e) => {
      if (!near) return;
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      gsap.to(tilt, { rotationX: -ny * 8, rotationY: nx * 10, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
    }, { passive: true });
  }

  return { setMode, get mode() { return mode; } };
}

const SAY = {
  defend: '<strong>מגן</strong> שומר על המערכת מבחוץ: מזהה איומים ועוצר אותם.',
  attack: '<strong>תוקף</strong> מחפש איפה ההגנה נשברת, עם כלים שכולם מכירים.',
  research: '<strong>חוקר</strong> מפרק את המערכת לשכבות ומוצא את מה שאף כלי עוד לא מכיר. את זה מלמדים אצלנו.',
};
const TOUR = ['defend', 'attack', 'research'];
const HOLD = { defend: 2600, attack: 2600, research: 4400 };

// The system with its three lenses under it (.sys, .lens buttons and
// .lens-say inside scope): a line for each, and a slow tour round them while
// the system is on screen. Research holds the longest and turns the page's
// light amber; a tap ends the tour. Both pages use it.
export function mountLenses(scope, { markSrc, onPick } = {}) {
  const root = scope.querySelector('.sys');
  const say = scope.querySelector('.lens-say');
  const buttons = [...scope.querySelectorAll('.lens button')];
  let seen = false;
  const sys = createSystem(root, {
    markSrc,
    onMode: (m) => { if (m === 'research' && seen) mood.set('flaw'); else mood.clear('flaw'); },
  });
  function set(mode, picked) {
    sys.setMode(mode);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    say.innerHTML = SAY[mode];
    if (picked) onPick?.(mode);
  }
  set('defend', false);
  let i = 0, timer = 0, stopped = false;
  const next = () => {
    clearTimeout(timer);
    if (stopped || !seen || reduce) return;
    timer = setTimeout(() => { i = (i + 1) % TOUR.length; set(TOUR[i], false); next(); }, HOLD[TOUR[i]]);
  };
  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    if (seen && sys.mode === 'research') mood.set('flaw'); else mood.clear('flaw');
    if (seen) next(); else clearTimeout(timer);
  }, { threshold: 0.35 }).observe(root);
  buttons.forEach((b) => b.addEventListener('click', () => { stopped = true; clearTimeout(timer); set(b.dataset.mode, true); }));
}
