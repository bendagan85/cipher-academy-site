// The challenge sits behind the mark, and the mark is a combination lock: its
// rings start out of line, a finger (or a mouse) drags them round, each at its
// own gear, ticking past every spoke. Turn them far enough, or just tap the
// keyhole, and they spin home and click in one by one; the keyhole opens, the
// digits scatter, and the challenge opens in their place. Its content (address, hints, the
// FLAG check) comes from CONFIG.challenge; until the developer fills it, the
// panel sends the visitor to the live challenge. Both pages use this module
// and decide for themselves what a solve leads to.
import { CONFIG } from './config.js';
import { track, journey } from './track.js';
import { copy } from './share.js';
import { createVortex } from './vortex.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const M = 40;
export const onPhone = () => matchMedia('(pointer: coarse)').matches && innerWidth < 900;

const RULES = `
  <dl class="ch__rules">
    <div><dt>על מחשב</dt><dd>את האתגר פותרים במחשב, לא בטלפון.</dd></div>
    <div><dt>בלי <span class="ltr">AI</span></dt><dd>שימוש ב־<span class="ltr">AI</span> פוסל את האתגר.</dd></div>
    <div><dt>שלושה רמזים</dt><dd>נתקעתם? פותחים רמז. תקיעה היא לא פסילה.</dd></div>
  </dl>`;

function live({ target, hints }) {
  return `
    <p class="ch__mission">המשימה: להגיע לשרת, להשיג גישה ולמצוא את ה־<span class="ltr">FLAG</span>.</p>
    ${RULES}
    <div class="ch__target">
      <span class="ch__label ltr">TARGET</span>
      <button class="ch__addr mono" type="button" data-copy-target>${esc(target)}</button>
      <span class="ch__copied" aria-live="polite"></span>
    </div>
    <div class="ch__hints">
      ${hints.map((h, i) => `
        <button class="ch__hint" type="button" data-hint="${i + 1}" ${i ? 'hidden' : ''} aria-expanded="false">רמז ${i + 1}</button>
        <p class="ch__hint-text" data-hint-text="${i + 1}" hidden>${esc(h)}</p>`).join('')}
    </div>
    <form class="form ch__form" novalidate>
      <label>ה־<span class="ltr">FLAG</span> שמצאתם<input type="text" name="flag" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="120"></label>
      <p class="form__err" aria-live="assertive"></p>
      <button class="btn btn--solid" type="submit">בדיקת <span class="ltr">FLAG</span></button>
    </form>
    <p class="ch__fine">האתגר בודק איך חושבים מול שרת ייעודי. הוא אינו הבטחת קבלה לתכנית או ליחידות.</p>`;
}

function fallback(url) {
  return `
    <p class="ch__mission">המשימה: להגיע לשרת, להשיג גישה ולמצוא את ה־<span class="ltr">FLAG</span>.</p>
    ${RULES}
    <a class="btn btn--solid ch__go" href="${esc(url)}" target="_blank" rel="noopener" data-track="challenge_live" data-source="fallback">לאתגר, בעמוד האתגר של Cipher ↗</a>
    <p class="ch__fine">האתגר בודק איך חושבים מול שרת ייעודי. הוא אינו הבטחת קבלה לתכנית או ליחידות.</p>`;
}

/**
 * @param {HTMLElement} lock   the mark that guards the challenge (.lock)
 * @param {HTMLElement} root   where the challenge opens ([data-challenge])
 * @param {object} o
 * @param {string} o.source            for the data layer: which page
 * @param {(root:HTMLElement)=>void} o.onSolved   what a solve leads to
 */
export function mountChallenge(lock, root, { source, onSolved }) {
  const { gsap, ScrollTrigger } = window;
  const cfg = CONFIG.challenge;
  const ready = Boolean(cfg.target && cfg.hints?.length && (cfg.flagPattern || CONFIG.api.challengeFlag));
  const canvas = lock.querySelector('canvas');
  const key = lock.querySelector('[data-lock-open]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mark = createVortex(canvas, {
    intro: reduce ? 'none' : 'scrambled',
    dust: reduce ? 0 : 90,
    // the canvas overhangs the box by M on every side (site.css)
    layout: (w, h) => {
      const R = Math.min((w - 2 * M) * 0.36, (h - 2 * M) * 0.43);
      return { cx: w / 2, cy: h * 0.5 - R * 0.05, R };
    },
  });
  mark.onResize(() => {
    const g = mark.geometry();
    for (const [k, v] of Object.entries({ cx: g.cx - M, cy: g.cy - M, r: g.r })) lock.style.setProperty(`--${k}`, `${v.toFixed(1)}px`);
  });
  let opened = 0, attempts = 0, busy = false;
  async function start(via = 'tap') {
    if (lock.dataset.state === 'open' || busy) return;
    busy = true;
    // the combination: the rings spin home and click in, outside in
    if (mark.locked) { lock.dataset.state = 'unlocking'; await mark.unlock(); }
    // then the keyhole opens
    mark.setOpen(1);
    await new Promise((r) => setTimeout(r, reduce ? 0 : 520));
    lock.dataset.state = 'open';
    track('challenge_start', { source, ready, via });
    root.innerHTML = ready ? live(cfg) : fallback(cfg.fallbackUrl);
    if (onPhone()) {
      root.insertAdjacentHTML('afterbegin', '<p class="ch__phone">אתם בטלפון: את האתגר פותרים במחשב. אפשר להסתכל עכשיו, ולשלוח את הקישור למחשב.</p>');
    }
    await mark.scatter(true, reduce ? 0 : 750);
    const h = lock.offsetHeight;
    lock.hidden = true;
    root.hidden = false;
    if (!reduce) {
      gsap.fromTo(root, { height: h, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.7, ease: 'power3.out', clearProps: 'height' });
      gsap.fromTo(root.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, delay: 0.15, ease: 'power3.out' });
    }
    root.querySelector('.ch__mission')?.setAttribute('tabindex', '-1');
    root.querySelector('.ch__mission')?.focus({ preventScroll: true });
    ScrollTrigger?.refresh();
  }
  key.addEventListener('click', (e) => {
    // the end of a drag that started on the keyhole is not a tap
    if (dragged) { e.preventDefault(); dragged = false; return; }
    start('tap');
  });

  // turning the rings: sideways drags only, so the page still scrolls under a finger
  let down = null, dragged = false, turned = 0;
  lock.addEventListener('pointerdown', (e) => {
    if (!mark.locked || busy) return;
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, live: false };
  });
  lock.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.live) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      down.live = true;
      dragged = true;
      lock.setPointerCapture?.(e.pointerId);
      lock.dataset.state = 'turning';
    }
    const g = mark.geometry();
    // a drag across the mark turns it about half a turn
    const rad = (e.clientX - down.x) / Math.max(80, g.R) * 1.4;
    down.x = e.clientX;
    mark.nudge(rad);
    turned += Math.abs(rad);
    if (turned > 3.2) { down = null; start('turn'); }
  });
  const up = () => {
    if (down?.live) setTimeout(() => { dragged = false; }, 0);
    down = null;
    if (lock.dataset.state === 'turning') lock.dataset.state = '';
  };
  lock.addEventListener('pointerup', up);
  lock.addEventListener('pointercancel', up);

  root.addEventListener('click', async (e) => {
    const hint = e.target.closest('[data-hint]');
    if (hint) {
      const n = +hint.dataset.hint;
      const text = root.querySelector(`[data-hint-text="${n}"]`);
      const open = text.hidden;
      text.hidden = !open;
      hint.setAttribute('aria-expanded', String(open));
      if (open && n > opened) { opened = n; track('hint_open', { n, source }); }
      const next = root.querySelector(`[data-hint="${n + 1}"]`);
      if (open && next) next.hidden = false;
      return;
    }
    const t = e.target.closest('[data-copy-target]');
    if (t) {
      const ok = await copy(cfg.target);
      root.querySelector('.ch__copied').textContent = ok ? 'הועתק' : 'לא הועתק';
      track('target_copied', { ok, source });
    }
  });

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = form.querySelector('.form__err');
    const flag = form.flag.value.trim();
    if (!flag) { err.textContent = 'קודם צריך למצוא אותו.'; return; }
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    attempts++;
    let ok = false;
    if (CONFIG.api.challengeFlag) {
      try {
        const res = await fetch(CONFIG.api.challengeFlag, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ flag, ref: journey.ref, visitor: journey.visitor, hints: opened, source }),
        });
        ok = res.ok && (await res.json()).ok === true;
      } catch { ok = false; }
    } else {
      ok = new RegExp(cfg.flagPattern).test(flag);
    }
    button.disabled = false;
    track('flag_submit', { ok, attempt: attempts, hints: opened, source });
    if (!ok) { err.textContent = 'ה־FLAG שהוגש אינו נכון. נסו שוב.'; form.flag.select(); return; }
    track('challenge_solved', { hints: opened, attempts, source });
    try { sessionStorage.setItem('cipher.solved', '1'); } catch { /* fine */ }
    onSolved(root);
  });

  return { start, mark };
}
