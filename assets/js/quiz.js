// The fit check: four questions, then the contact details. A button sits under
// it from the first question, greyed, so it is clear there is somewhere this
// leads; once only the details are left it wakes up, worded for these answers.
// The diagnosis itself waits for the thank-you page.
import { CONFIG } from './config.js';
import { track, journey, summary } from './track.js';
import { diagnose, readPrereq, CTA, THANKS_KEY } from './diagnosis.js';
import { decode } from './motion.js';
import { arcRing } from './rings.js';

const QUESTIONS = [
  { key: 'grade', q: 'באיזו כיתה הם?', opts: [['9', 'ט׳'], ['10', 'י׳'], ['11', 'י״א'], ['12', 'י״ב'], ['other', 'אחר']] },
  { key: 'practice', q: 'מה הם כבר עשו בעצמם?', opts: [['built', 'כתבו קוד בעצמם, בלי שאמרו להם'], ['class', 'למדו תכנות במסגרת'], ['curious', 'סקרנים, עוד לא כתבו קוד'], ['unsure', 'לא בטוחים']] },
  { key: 'drive', q: 'למי יותר חשוב להגיע ליחידות הטכנולוגיות?', opts: [['kid', 'להם'], ['me', 'בעיקר לי'], ['both', 'לשנינו']] },
  { key: 'why', q: 'למה אתם מחפשים עבורם הכנה?', opts: [['edge', 'שיגיעו למיונים עם יתרון אמיתי'], ['elite', 'שיכוונו ליחידות המובחרות ב־8200'], ['extra', 'בשביל ידע משלים, נוסף ללימודים'], ['checking', 'רק בודקים בינתיים']] },
];
const WAITING = 'בסוף 4 השאלות: הצעד הבא שלכם';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// every word its own span, so the question can decode in (motion.js)
const words = (s) => s.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
const LOCK = '<svg class="fit__lock" viewBox="0 0 24 24" aria-hidden="true"><path class="fit__shackle" d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="11" width="14" height="10" fill="currentColor"/></svg>';

export function mountQuiz(root) {
  const answers = {};
  let step = 0, started = false, leadSent = false;
  root.innerHTML = `
    <div class="fit__stage"></div>
    <button class="btn btn--solid fit__go" type="submit" form="fit-form" disabled aria-disabled="true">${LOCK}<span class="fit__go-t">${WAITING}</span></button>`;
  const stage = root.querySelector('.fit__stage');
  const go = root.querySelector('.fit__go');
  const goText = go.querySelector('.fit__go-t');
  const { svg: ring, set: progress } = arcRing(QUESTIONS.length, 'fit__ring', 10);

  function wake(on) {
    const was = !go.disabled;
    go.disabled = !on;
    go.setAttribute('aria-disabled', String(!on));
    goText.textContent = on ? CTA[diagnose(answers, readPrereq())] : WAITING;
    go.classList.toggle('is-open', on);
    // the lock springs open once, as the last answer lands
    if (on && !was && !reduce) {
      go.classList.remove('is-waking');
      void go.offsetWidth;
      go.classList.add('is-waking');
    }
  }

  function renderQuestion() {
    const { key, q, opts } = QUESTIONS[step];
    // short answers (a grade, a word) sit side by side; sentences stack
    const row = opts.every(([, label]) => label.length <= 8);
    wake(false);
    stage.innerHTML = `
      <div class="fit__top"><p class="fit__count">שאלה ${step + 1} מתוך ${QUESTIONS.length}</p></div>
      <h3 class="fit__q decode" tabindex="-1" aria-label="${esc(q)}">${words(q)}</h3>
      <div class="fit__opts${row ? ' fit__opts--row' : ''}" role="group" aria-label="${esc(q)}"${row ? ` style="--n:${opts.length}"` : ''}>
        ${opts.map(([v, label]) => `<button type="button" data-v="${v}" aria-pressed="${answers[key] === v}">${esc(label)}</button>`).join('')}
      </div>
      <div class="fit__nav">${step ? '<button class="fit__back" type="button" data-back>חזרה</button>' : '<span></span>'}</div>`;
    stage.querySelector('.fit__top').append(ring);
    progress(step);
    decode(stage.querySelector('.fit__q'), 60);
    if (!reduce) window.gsap?.fromTo(stage.querySelectorAll('.fit__opts button'), { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.06, delay: 0.12, ease: 'power3.out' });
  }

  function renderForm() {
    const segment = diagnose(answers, readPrereq());
    root.dataset.route = segment;
    track('quiz_result', { route: segment, ...answers });
    stage.innerHTML = `
      <div class="fit__top"></div>
      <h3 class="fit__q" tabindex="-1">נשאר רק לומר לנו איך לחזור אליכם.</h3>
      <form class="form" id="fit-form" novalidate>
        <label>שם ההורה<input type="text" name="name" autocomplete="name" required maxlength="80"></label>
        <label>טלפון<input type="tel" name="phone" autocomplete="tel" inputmode="tel" required maxlength="20" dir="ltr"></label>
        <label>אימייל (לא חובה)<input type="email" name="email" autocomplete="email" maxlength="120" dir="ltr"></label>
        <label class="hp-field" aria-hidden="true">Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label>
        <label class="agree"><input type="checkbox" name="agree" required> <span>מאשרים שנחזור אליכם לגבי התכנית.</span></label>
        <p class="form__err" aria-live="assertive"></p>
      </form>
      <div class="fit__nav"><button class="fit__back" type="button" data-restart>לענות מחדש</button><span></span></div>`;
    stage.querySelector('.fit__top').append(ring);
    progress(QUESTIONS.length);
    wake(true);
    track('lead_form_view', { route: segment });
  }

  function focusTop() {
    const h = stage.querySelector('h3');
    h?.focus({ preventScroll: true });
    const top = root.getBoundingClientRect().top;
    if (top < 60 || top > innerHeight * 0.6) {
      const y = scrollY + top - 90;
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 0.6 }); else scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  async function submit(form) {
    const err = form.querySelector('.form__err');
    const data = Object.fromEntries(new FormData(form));
    const phoneDigits = (data.phone || '').replace(/\D/g, '');
    const bad = [];
    if (!data.name?.trim()) bad.push('name');
    if (phoneDigits.length < 9 || phoneDigits.length > 12) bad.push('phone');
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) bad.push('email');
    if (!data.agree) bad.push('agree');
    form.querySelectorAll('input').forEach((i) => i.setAttribute('aria-invalid', String(bad.includes(i.name))));
    if (bad.length) {
      err.textContent = bad.includes('phone') ? 'נראה שחסרה ספרה בטלפון.' : bad.includes('agree') ? 'צריך לאשר שנחזור אליכם.' : 'חסר פרט אחד.';
      track('lead_invalid', { fields: bad.join(',') });
      return;
    }
    if (data.company) return; // honeypot: bots fill every field
    if (leadSent) return;
    leadSent = true;

    const prereq = readPrereq();
    const segment = diagnose(answers, prereq);
    const lead = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: (data.email || '').trim() || null,
      answers: { ...answers },
      prereq,
      segment,
      ref: journey.ref,
      visitor: journey.visitor,
      utm: journey.utm,
      journey: summary(),
      page: location.href,
      ts: new Date().toISOString(),
    };
    go.disabled = true;
    goText.textContent = 'שולחים…';
    let ok = true;
    if (CONFIG.api.leads) {
      try {
        const res = await fetch(CONFIG.api.leads, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lead) });
        ok = res.ok;
      } catch { ok = false; }
    } else {
      // no backend wired yet: keep the lead in this browser so a demo still completes
      try { localStorage.setItem('cipher.lastLead', JSON.stringify(lead)); } catch { /* fine */ }
    }
    if (!ok) {
      leadSent = false;
      wake(true);
      err.textContent = 'משהו לא עבר. נסו שוב בעוד רגע.';
      track('lead_error', { route: segment });
      return;
    }
    track('lead_submit', { route: segment, demo: !CONFIG.api.leads });
    // the thank-you page reads this to say what the answers mean
    try {
      sessionStorage.setItem(THANKS_KEY, JSON.stringify({ first: lead.name.split(/\s+/)[0], answers: lead.answers, prereq, segment, ts: lead.ts }));
    } catch { /* the page falls back to its general version */ }
    document.documentElement.classList.add('is-leaving');
    setTimeout(() => { location.href = new URL(CONFIG.thanksPage, location.href).href; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380);
  }

  root.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-v]');
    if (opt) {
      const { key } = QUESTIONS[step];
      answers[key] = opt.dataset.v;
      if (!started) { started = true; track('quiz_start'); }
      track('quiz_answer', { q: key, a: opt.dataset.v, step: step + 1 });
      opt.setAttribute('aria-pressed', 'true');
      progress(step + 1);
      setTimeout(() => {
        step++;
        if (step < QUESTIONS.length) renderQuestion(); else renderForm();
        focusTop();
      }, 180);
      return;
    }
    if (e.target.closest('[data-back]')) { step = Math.max(0, step - 1); renderQuestion(); focusTop(); return; }
    if (e.target.closest('[data-restart]')) { step = 0; renderQuestion(); focusTop(); track('quiz_restart'); }
  });
  root.addEventListener('submit', (e) => { e.preventDefault(); submit(e.target); });
  // the prerequisite ticks can change after the form shows: keep the button's words current
  addEventListener('cipher:prereq', () => { if (!go.disabled && !leadSent) goText.textContent = CTA[diagnose(answers, readPrereq())]; });

  renderQuestion();
}
