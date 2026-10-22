// The fit check: four questions, an honest answer, then the lead form.
// The answers route the conversation; they are never a score or an admission.
import { CONFIG } from './config.js';
import { track, journey, summary } from './track.js';

const QUESTIONS = [
  { key: 'grade', q: 'באיזו כיתה הם?', opts: [['9', 'ט׳'], ['10', 'י׳'], ['11', 'י״א'], ['12', 'י״ב'], ['other', 'אחר']] },
  { key: 'practice', q: 'מה הם כבר עשו בעצמם?', opts: [['built', 'כתבו קוד בעצמם, בלי שאמרו להם'], ['class', 'למדו תכנות במסגרת'], ['curious', 'סקרנים, עוד לא כתבו קוד'], ['unsure', 'לא בטוחים']] },
  { key: 'drive', q: 'מי רוצה את זה יותר?', opts: [['kid', 'הם'], ['both', 'שנינו'], ['me', 'בעיקר אני']] },
  { key: 'budget', q: `התכנית עולה ${CONFIG.cohort.price}. זה רלוונטי עבורכם?`, opts: [['yes', 'כן'], ['think', 'צריך לחשוב על זה'], ['no', 'לא כרגע']] },
];

// One honest next step per situation. `form: false` means we don't ask for details.
const ROUTES = {
  ready: { title: 'יש בסיס להמשך.', text: 'נשמע שהם עשו דרך משלהם, ושהרצון מגיע מהם. נחזור אליכם לשיחת טלפון קצרה, ומשם לראיון.', form: true },
  prep: { title: 'מתחילים במסלול ההכנה.', text: 'בונים את הבסיס שחסר, ומי שעובר את המבחן בסופו ממשיך ישר לראיון. נחזור אליכם עם הפרטים.', form: true },
  talk: { title: 'נשלים את התמונה בשיחה.', text: 'לא צריך לדעת הכול כדי להתקדם. נחזור אליכם לשיחה קצרה ונבדוק יחד מה הצעד הנכון.', form: true },
  them: { title: 'קודם, תנו להם לנסות.', text: 'הרצון שלהם חשוב לנו לא פחות מהידע. שלחו להם את האתגר. אם זה תופס אותם, הם יגיעו אליכם.', form: false, share: true },
  young: { title: 'עוד מוקדם, וזה טוב.', text: 'המחזור מיועד לכיתות י׳–י״ב. השאירו פרטים ונחזור אליכם לקראת המחזור הבא.', form: true },
  budget: { title: 'תודה על הכנות.', text: 'אנחנו מעדיפים לומר את המחיר מראש. אם זה ישתנה, נשמח לשמוע מכם.', form: false },
};

function route(a) {
  if (a.budget === 'no') return 'budget';
  if (a.grade === '9') return 'young';
  if (a.drive === 'me') return 'them';
  if (a.grade === 'other' || a.practice === 'unsure' || a.budget === 'think') return 'talk';
  if (a.practice === 'curious') return 'prep';
  return 'ready';
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function mountQuiz(root) {
  const answers = {};
  let step = 0, started = false, leadSent = false;

  function renderQuestion() {
    const { key, q, opts } = QUESTIONS[step];
    root.innerHTML = `
      <p class="fit__count">שאלה ${step + 1} מתוך ${QUESTIONS.length}</p>
      <h3 class="fit__q" tabindex="-1">${esc(q)}</h3>
      <div class="fit__opts" role="group" aria-label="${esc(q)}">
        ${opts.map(([v, label]) => `<button type="button" data-v="${v}" aria-pressed="${answers[key] === v}">${esc(label)}</button>`).join('')}
      </div>
      <div class="fit__nav">${step ? '<button class="fit__back" type="button" data-back>חזרה</button>' : '<span></span>'}</div>`;
  }

  function renderResult() {
    const r = route(answers);
    const R = ROUTES[r];
    track('quiz_result', { route: r, ...answers });
    root.innerHTML = `
      <div class="fit__result">
        <h3 tabindex="-1">${esc(R.title)}</h3>
        <p>${esc(R.text)}</p>
        ${R.share ? '<div class="pair" style="margin-block-start:18px"><button class="btn btn--solid" type="button" data-share-now="kid" data-source="quiz">שלחו להם את האתגר</button><button class="btn btn--line" type="button" data-show-form>להשאיר פרטים בכל זאת</button></div>' : ''}
        ${!R.form && !R.share ? '<div class="fit__nav"><button class="fit__back" type="button" data-show-form>להשאיר פרטים בכל זאת</button></div>' : ''}
        <form class="form" novalidate ${R.form ? '' : 'hidden'}>
          <label>שם ההורה<input type="text" name="name" autocomplete="name" required maxlength="80"></label>
          <label>טלפון<input type="tel" name="phone" autocomplete="tel" inputmode="tel" required maxlength="20" dir="ltr"></label>
          <label>אימייל (לא חובה)<input type="email" name="email" autocomplete="email" maxlength="120" dir="ltr"></label>
          <label class="hp-field" aria-hidden="true">Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label>
          <label class="agree"><input type="checkbox" name="agree" required> <span>מאשרים שנחזור אליכם לגבי התכנית.</span></label>
          <p class="form__err" aria-live="assertive"></p>
          <button class="btn btn--solid" type="submit">לשיחה עם צוות סייפר</button>
          <button class="fit__back" type="button" data-restart>לענות מחדש</button>
        </form>
      </div>`;
    root.dataset.route = r;
  }

  function focusTop() {
    const h = root.querySelector('h3');
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

    const lead = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: (data.email || '').trim() || null,
      answers: { ...answers },
      route: root.dataset.route,
      ref: journey.ref,
      visitor: journey.visitor,
      utm: journey.utm,
      journey: summary(),
      page: location.href,
      ts: new Date().toISOString(),
    };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'שולחים…';
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
      button.disabled = false;
      button.textContent = 'לשיחה עם צוות סייפר';
      err.textContent = 'משהו לא עבר. נסו שוב בעוד רגע.';
      track('lead_error', { route: lead.route });
      return;
    }
    track('lead_submit', { route: lead.route, demo: !CONFIG.api.leads });
    root.innerHTML = `
      <div class="fit__result">
        <h3 tabindex="-1">קיבלנו. נחזור אליכם בימים הקרובים.</h3>
        <p>אם עוד לא שלחתם להם את האתגר, זה הזמן. מי שפותר מגיע לראיון עם יתרון.</p>
        <div class="pair" style="margin-block-start:18px">
          <button class="btn btn--solid" type="button" data-share-now="kid" data-source="success">שלחו להם את האתגר</button>
          <button class="btn btn--line" type="button" data-share-now="partner" data-source="success">שלחו לבן/בת הזוג</button>
        </div>
      </div>`;
    focusTop();
  }

  root.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-v]');
    if (opt) {
      const { key } = QUESTIONS[step];
      answers[key] = opt.dataset.v;
      if (!started) { started = true; track('quiz_start'); }
      track('quiz_answer', { q: key, a: opt.dataset.v, step: step + 1 });
      opt.setAttribute('aria-pressed', 'true');
      setTimeout(() => {
        step++;
        if (step < QUESTIONS.length) renderQuestion(); else renderResult();
        focusTop();
      }, 180);
      return;
    }
    if (e.target.closest('[data-back]')) { step = Math.max(0, step - 1); renderQuestion(); focusTop(); return; }
    if (e.target.closest('[data-restart]')) { step = 0; renderQuestion(); focusTop(); track('quiz_restart'); return; }
    if (e.target.closest('[data-show-form]')) {
      const form = root.querySelector('form');
      form.hidden = false;
      e.target.closest('[data-show-form]').parentElement.hidden = true;
      track('lead_form_open', { route: root.dataset.route });
      form.querySelector('input')?.focus();
      return;
    }
    // [data-share-now] buttons are handled by the page-wide share handler in main.js
  });
  root.addEventListener('submit', (e) => { e.preventDefault(); submit(e.target); });

  renderQuestion();
}
