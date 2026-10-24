// The thank-you page: where the diagnosis from the fit check actually shows.
// Reads what quiz.js left in sessionStorage; if a visitor lands here without
// it (a new tab, a bookmarked link), it falls back to a page that still
// reads as finished rather than broken.
import { CONFIG } from './config.js';
import { track, watchChapters } from './track.js';
import { createShare, whatsapp, reportOpen } from './share.js';
import { reveals, reduce } from './motion.js';
import { diagnose, readPrereq, DIAGNOSIS, REQ_LABELS, THANKS_KEY } from './diagnosis.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function readState() {
  try {
    const s = JSON.parse(sessionStorage.getItem(THANKS_KEY));
    if (s?.segment) return s;
  } catch { /* fine */ }
  return null;
}

const state = readState();
const segment = state?.segment || diagnose({}, readPrereq()) || 'close';
const D = DIAGNOSIS[segment] || DIAGNOSIS.close;

/* ── the diagnosis ─────────────────────────────────────────────────────── */
$('[data-ack-hi]').textContent = state?.first ? `תודה, ${state.first}.` : 'תודה.';
$('[data-ack-head]').textContent = D.head;
$('[data-ack-body]').textContent = D.body;

/* ── prerequisite recap ───────────────────────────────────────────────── */
{
  const p = state?.prereq || readPrereq();
  const box = $('[data-prereq-recap]');
  if (p && (p.unsure || p.n > 0 || p.items?.length)) {
    box.hidden = false;
    const title = $('[data-prereq-title]', box);
    const body = $('[data-prereq-body]', box);
    if (p.unsure) {
      title.textContent = 'סימנתם שעדיין לא בטוחים מה הוא יודע — וזה בסדר גמור.';
      body.textContent = 'בשיחה הקרובה נבדוק יחד את זה, ונדע אם מתחילים ישר או דרך מסלול ההכנה.';
    } else if (p.n >= p.of) {
      title.textContent = `${p.n} מתוך ${p.of}. יש להם את כל הבסיס.`;
      body.textContent = 'מוכנים לשיחה, בלי עיכובים מצידם.';
    } else if (p.n === 0) {
      title.textContent = 'סימנתם שעוד אין להם בסיס, וזה הגיוני בשלב הזה.';
      body.textContent = 'מתחילים במסלול ההכנה, ומשם חוזרים לשלבי הקבלה לתכנית המלאה.';
    } else {
      const missing = Object.keys(REQ_LABELS).filter((k) => !p.items?.includes(k)).map((k) => REQ_LABELS[k]);
      title.textContent = `${p.n} מתוך ${p.of} כבר יש להם.`;
      body.textContent = missing.length ? `מה שכדאי לחזק קודם: ${missing.slice(0, 2).join(', ')}.` : 'בסיס טוב להתחיל ממנו.';
    }
  }
}

/* ── has a kid link gone out yet? ─────────────────────────────────────── */
function sentKid() {
  try { return localStorage.getItem('cipher.sentKid') === '1'; } catch { return false; }
}
function syncSent() {
  const sent = sentKid();
  const note = $('[data-send-note]');
  note.hidden = false;
  note.textContent = sent ? 'שלחתם להם. אפשר לשלוח גם לבן או לבת הזוג.' : 'עוד לא שלחתם? זה הרגע.';
  $('[data-sent-check]')?.closest('.mid-cta')?.toggleAttribute('hidden', sent);
}
syncSent();

/* ── sharing: the same inline buttons used across the site ────────────── */
document.addEventListener('click', async (e) => {
  const now = e.target.closest('[data-share-now]');
  if (now) {
    const target = now.dataset.shareNow;
    const { text } = createShare(target, now.dataset.source || 'thanks');
    track('share_sent', { target, via: 'whatsapp' });
    window.open(whatsapp(text), '_blank', 'noopener');
    syncSent();
    return;
  }
  const t = e.target.closest('[data-track]');
  if (t) track(t.dataset.track, { source: t.dataset.source, target: t.dataset.target });
});

/* ── motion and data ──────────────────────────────────────────────────── */
reveals();
reportOpen();
track('thankyou_view', { segment });
watchChapters();
