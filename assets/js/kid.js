// The teen's page: who teaches, the challenge, and a way to tell the parent.
import { CONFIG } from './config.js';
import { track, watchChapters, journey } from './track.js';
import { whatsapp, copy, reportOpen } from './share.js';
import { createVortex } from './vortex.js';
import { decode, reveals, reduce } from './motion.js';

const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = a.getAttribute('href') === '#top' ? document.body : $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});
addEventListener('scroll', () => $('.top').classList.toggle('is-solid', scrollY > 40), { passive: true });

createVortex($('.hero__field'), {
  layout: (w, h) => (w >= 900
    ? { cx: w * 0.27, cy: h * 0.52, R: Math.min(h * 0.34, w * 0.22) }
    : { cx: w * 0.5, cy: Math.max(190, h * 0.33), R: Math.min(w * 0.45, h * 0.25) }),
});
decode($('.hero .decode'), 900).then(() => {
  gsap.to('.hero .rise', { opacity: 1, y: 0, duration: reduce ? 0 : 0.8, stagger: 0.12, ease: 'power3.out' });
});
reveals();

/* ── the challenge ───────────────────────────────────────────────────────
   The live challenge belongs to the existing backend. Until its target and
   flag check are configured, the page sends the teen to it instead. */
function mountChallenge(root) {
  const { target, hints, fallbackUrl } = CONFIG.challenge;
  const live = Boolean(target && CONFIG.api.challengeFlag);

  if (!live) {
    root.innerHTML = `
      <p class="ch__lead">האתגר פתוח עכשיו.</p>
      <a class="btn btn--solid ch__go" href="${esc(fallbackUrl)}" target="_blank" rel="noopener" data-track="challenge_start" data-source="live-page">להתחלת האתגר ↗</a>
      <p class="ch__note">נפתח בעמוד האתגר של Cipher.</p>`;
    return;
  }

  root.innerHTML = '<button class="btn btn--solid ch__go" type="button" data-start>התחלת האתגר</button>';
  let opened = 0;

  function panel() {
    root.innerHTML = `
      <p class="ch__lead">כתובת השרת</p>
      <div class="ch__row"><span class="mono">${esc(target)}</span><button class="link" type="button" data-copy-target>העתקה</button></div>
      <div class="ch__hints">
        ${hints.map((h, i) => `<details data-hint="${i + 1}" ${i ? 'hidden' : ''}><summary>רמז ${i + 1}</summary><p>${esc(h)}</p></details>`).join('')}
      </div>
      <form class="form ch__form" novalidate>
        <label>ה־FLAG שמצאתם<input type="text" name="flag" dir="ltr" autocomplete="off" spellcheck="false" required maxlength="200"></label>
        <p class="form__err" aria-live="assertive"></p>
        <button class="btn btn--solid" type="submit">בדיקה</button>
      </form>`;
    root.querySelectorAll('details[data-hint]').forEach((d) => d.addEventListener('toggle', () => {
      if (!d.open) return;
      const n = +d.dataset.hint;
      if (n > opened) { opened = n; track('hint_open', { n }); }
      const next = root.querySelector(`details[data-hint="${n + 1}"]`);
      if (next) next.hidden = false;
    }));
  }

  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-start]')) { track('challenge_start', { source: 'kid-page' }); panel(); return; }
    if (e.target.closest('[data-copy-target]')) {
      const ok = await copy(target);
      e.target.textContent = ok ? 'הועתק' : 'לא הועתק';
      track('target_copied', { ok });
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
    let ok = false;
    try {
      const res = await fetch(CONFIG.api.challengeFlag, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ flag, ref: journey.ref, visitor: journey.visitor, hints: opened }),
      });
      ok = res.ok && (await res.json()).ok === true;
    } catch { ok = false; }
    button.disabled = false;
    track('flag_submit', { ok, hints: opened });
    if (!ok) { err.textContent = 'לא זה. נסו שוב.'; return; }
    track('challenge_solved', { hints: opened });
    root.innerHTML = `
      <p class="ch__lead">פתרתם.</p>
      <p class="lead">זה בדיוק מה שחיפשנו. ספרו להורים, ונדבר.</p>
      <button class="btn btn--solid ch__go" type="button" data-tell-parent>שולחים להורים</button>`;
  });
}
mountChallenge($('[data-challenge]'));

/* ── telling the parent ───────────────────────────────────────────────── */
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-tell-parent]')) return;
  const url = new URL(CONFIG.parentsPage, location.href);
  url.search = '';
  if (journey.ref) url.searchParams.set('ref', journey.ref);
  url.searchParams.set('utm_source', 'share');
  url.searchParams.set('utm_medium', 'kid_to_parent');
  track('challenge_interest', { ref: journey.ref });
  window.open(whatsapp(`ראיתי את האקדמיה של Cipher, ואני רוצה לנסות להתקבל. ${url.href}`), '_blank', 'noopener');
});

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-track]');
  if (t) track(t.dataset.track, { source: t.dataset.source });
});

reportOpen();
track('page_view', { page: 'kid', preview: new URLSearchParams(location.search).has('preview') });
watchChapters();
