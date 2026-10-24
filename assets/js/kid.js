// The teen's page: who sent this, what's different, who teaches, the
// program in brief, a self-check, the challenge itself, and a way to tell
// the parent. The challenge is the shared component — same mark, same rules
// — so it reads as one brand with the parents' page.
import { track, watchChapters, journey } from './track.js';
import { whatsapp, reportOpen } from './share.js';
import { createVortex } from './vortex.js';
import { mountChallenge } from './challenge.js';
import { CONFIG } from './config.js';
import { decode, reveals, reduce } from './motion.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { gsap, ScrollTrigger } = window;
if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = a.getAttribute('href') === '#top' ? document.body : $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});
addEventListener('scroll', () => $('.top').classList.toggle('is-solid', scrollY > 40), { passive: true });

/* ── hero: the same mark, no film — this page stays light ─────────────── */
{
  const probe = $('.hero__r');
  createVortex($('.hero__field'), {
    layout: (w, h) => {
      if (w >= 900) {
        const R = Math.min(h * 0.27, w * 0.19, 290);
        return { cx: w * 0.27, cy: h * 0.5, R };
      }
      // the copy's top padding (site.css, .hero .copy) assumes this same top edge
      const R = probe.getBoundingClientRect().width || Math.min(w * 0.4, 170);
      return { cx: w / 2, cy: 132 + 1.123 * R, R };
    },
  });
  decode($('.hero .decode'), 900).then(() => {
    gsap.to('.hero .rise', { opacity: 1, y: 0, duration: reduce ? 0 : 0.8, stagger: 0.1, ease: 'power3.out' });
  });
}
reveals();

/* ── what do you already have ──────────────────────────────────────────── */
{
  const buttons = $$('.check__grid button');
  const say = $('.check__say');
  let reported = 0;
  function verdict(n) {
    if (n === 0) return 'גם אם סימנתם מעט — האתגר פתוח לכולם.';
    if (n >= 6) return `${n} מתוך ${buttons.length}. נשמע שיש לכם בסיס מוצק. בואו נראה אתכם באתגר.`;
    if (n >= 3) return `${n} מתוך ${buttons.length}. בסיס טוב להתחיל ממנו. האתגר יראה לכם בדיוק איפה אתם.`;
    return `${n} מתוך ${buttons.length}. בדיוק בשביל זה יש מסלול הכנה. אבל האתגר פתוח כבר עכשיו.`;
  }
  buttons.forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    const n = buttons.filter((x) => x.getAttribute('aria-pressed') === 'true').length;
    say.textContent = verdict(n);
    clearTimeout(reported);
    reported = setTimeout(() => track('prereq_result', { count: n, page: 'kid', items: buttons.filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.dataset.req).join(',') }), 1500);
  }));
}

/* ── the challenge ────────────────────────────────────────────────────── */
mountChallenge($('[data-lock]'), $('[data-challenge]'), {
  source: 'kid',
  onSolved(root) {
    root.innerHTML = `
      <p class="ch__mission">פתרתם. בדיוק את זה אנחנו מחפשים.</p>
      <p class="lead">ספרו להורים, ונדבר.</p>
      <button class="btn btn--solid ch__go" type="button" data-tell-parent>שולחים להורים</button>`;
  },
});

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
