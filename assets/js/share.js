// Share links: every link a parent sends carries its own id, so an open on
// the other side can be tied back to the parent who sent it.
import { CONFIG } from './config.js';
import { track, journey, rid } from './track.js';

// What lands in WhatsApp. The kid's message is the first thing the teen reads
// from us, so it carries who we are, why it is worth their time, and how to
// take the challenge: on a computer, three hints, no AI.
const MESSAGES = {
  kid: (url) => [
    'מצאתי משהו שנראה לי בדיוק בשבילך.',
    'החוקרים של Cipher Security Labs מוצאים חולשות בתוכנות של HP, Dell ו־Ericsson. בינואר הם פותחים מחזור של 15 תלמידים בלבד, ובנו אתגר כדי לראות איך מועמדים חושבים. מי שפותר מקבל יתרון משמעותי בקבלה.',
    'חשוב: פותחים את האתגר במחשב, לא בטלפון. יש שלושה רמזים, ואסור להשתמש ב־AI.',
    url,
  ].join('\n\n'),
  'kid-check': (url) => [
    'רציתי לשאול אותך משהו לפני שאני מדבר/ת עם Cipher Security Labs.',
    'תסמן/י לי מה מהרשימה הזאת כבר יש לך. זה לוקח חצי דקה, ומשם אפשר גם לנסות את האתגר שלהם.',
    url,
  ].join('\n\n'),
  partner: (url) => [
    'תסתכל/י על זה לפני שנדבר: האקדמיה של Cipher Security Labs.',
    'ההכנה העמוקה ביותר ליחידות הטכנולוגיות, בהובלת חוקרי סייבר פעילים. 15 מקומות בלבד, מתחילים ב־1.1.2027.',
    url,
  ].join('\n\n'),
};

// Every page but the site root lives one folder down (kid/, thanks/), so the
// same share links work from any of them.
const ROOT = /\/(?:kid|thanks)\/(?:index\.html)?$/.test(location.pathname) ? '../' : './';
const LANDING = { kid: `${ROOT}kid/`, 'kid-check': `${ROOT}kid/`, partner: ROOT };
const HASH = { 'kid-check': '#check' };

function linkFor(target, id) {
  const url = new URL(LANDING[target], location.href);
  url.search = '';
  url.hash = HASH[target] || '';
  url.searchParams.set('ref', id);
  url.searchParams.set('utm_source', 'share');
  url.searchParams.set('utm_medium', target === 'partner' ? 'parent_to_partner' : 'parent_to_kid');
  if (target === 'kid-check') url.searchParams.set('utm_content', 'prereq_check');
  return url.href;
}

export function createShare(target, source) {
  const id = rid(10);
  const url = linkFor(target, id);
  track('share_created', { id, target, source });
  if (CONFIG.api.shares) {
    fetch(CONFIG.api.shares, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, target, source, from_visitor: journey.visitor, ref: journey.ref }),
      keepalive: true,
    }).catch(() => {});
  }
  // the thank-you page asks "did you send it to them yet?" from this
  if (target !== 'partner') { try { localStorage.setItem('cipher.sentKid', '1'); } catch { /* fine */ } }
  return { id, url, text: MESSAGES[target](url) };
}

export function whatsapp(text, number = '') {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
    ta.style.cssText = 'position:fixed;inset-inline-start:-9999px';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

// On arrival through a shared link: report the open once per id.
export function reportOpen() {
  const ref = new URLSearchParams(location.search).get('ref');
  if (!ref) return null;
  const key = `cipher.opened.${ref}`;
  try { if (sessionStorage.getItem(key)) return ref; sessionStorage.setItem(key, '1'); } catch { /* fine */ }
  track('share_opened', { id: ref });
  if (CONFIG.api.shareOpen) {
    fetch(CONFIG.api.shareOpen, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: ref, visitor: journey.visitor }),
      keepalive: true,
    }).catch(() => {});
  }
  return ref;
}
