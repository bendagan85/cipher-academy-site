// The data layer. Every interaction on both pages goes through track().
// Out of the box it only fills window.dataLayer; set CONFIG.api.events (or
// define window.cipherTrack) and the same calls reach the backend.
import { CONFIG } from './config.js';

const KEY = 'cipher.journey';

export function rid(n = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map((b) => (b % 36).toString(36)).join('');
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: the session still works */ }
}

const params = new URLSearchParams(location.search);
const state = load();
state.visitor ||= rid(12);
const campaign = Object.fromEntries([...params].filter(([k]) => k.startsWith('utm_') || k === 'fbclid' || k === 'gclid'));
if (Object.keys(campaign).length) state.utm = campaign;
if (params.get('ref')) state.ref = params.get('ref');
save(state);

export const journey = {
  visitor: state.visitor,
  session: rid(10),
  ref: state.ref || null,
  utm: state.utm || {},
};

const seen = new Set();
let interactions = 0;
const debug = location.hostname === 'localhost' || params.has('debug');

const PIXEL = {
  lead_submit: ['track', 'Lead'],
  share_sent: ['trackCustom', 'ShareSent'],
  quiz_start: ['trackCustom', 'FitCheckStart'],
  challenge_interest: ['trackCustom', 'ChallengeInterest'],
};

export function track(event, props = {}) {
  const payload = {
    event, props,
    page: location.pathname,
    ts: Date.now(),
    visitor: journey.visitor,
    session: journey.session,
    ref: journey.ref,
    utm: journey.utm,
  };
  if (event === 'section_view') seen.add(props.chapter);
  else if (event !== 'scroll_depth') interactions++;

  (window.dataLayer ||= []).push({ event: `cipher_${event}`, ...props });
  if (typeof window.cipherTrack === 'function') {
    try { window.cipherTrack(event, props, payload); } catch { /* never let analytics break the page */ }
  }
  if (CONFIG.api.events && navigator.sendBeacon) {
    try { navigator.sendBeacon(CONFIG.api.events, new Blob([JSON.stringify(payload)], { type: 'application/json' })); } catch { /* ignore */ }
  }
  if (CONFIG.metaPixel && PIXEL[event] && typeof window.fbq === 'function') {
    window.fbq(PIXEL[event][0], PIXEL[event][1], props);
  }
  if (debug) console.debug('[cipher]', event, props);
}

// What the visitor did before they converted — attached to the lead.
export function summary() {
  return { sections: [...seen], interactions };
}

// One section_view per chapter, the first time half of it is on screen,
// and a dwell time when it leaves.
export function watchChapters(selector = '[data-chapter]') {
  const since = new Map();
  // half of the chapter on screen, or half of the screen taken by it: a chapter
  // taller than two screens (the syllabus scene) can never be half on screen
  const enough = (e) => e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= innerHeight * 0.5);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const name = e.target.dataset.chapter;
      if (enough(e)) {
        if (!since.has(name)) since.set(name, performance.now());
        if (!seen.has(name)) track('section_view', { chapter: name });
      } else if (since.has(name)) {
        const ms = Math.round(performance.now() - since.get(name));
        since.delete(name);
        if (ms > 1200) track('section_dwell', { chapter: name, ms });
      }
    }
  }, { threshold: [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1] });
  document.querySelectorAll(selector).forEach((el) => io.observe(el));

  const marks = [25, 50, 75, 100];
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? (scrollY / max) * 100 : 100;
    while (marks.length && pct >= marks[0] - 0.5) track('scroll_depth', { pct: marks.shift() });
  }, { passive: true });
}
