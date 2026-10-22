// Share links: every link a parent sends carries its own id, so an open on
// the other side can be tied back to the parent who sent it.
import { CONFIG } from './config.js';
import { track, journey, rid } from './track.js';

const MESSAGES = {
  kid: (url) => `מצאתי משהו שנראה לי שיעניין אותך: האתגר של Cipher. שרת אחד, משימה אחת, שלושה רמזים. ${url}`,
  partner: (url) => `תסתכל/י על זה לפני שנדבר: האקדמיה של Cipher Security Labs. 15 מקומות, מתחילים בינואר. ${url}`,
};

function linkFor(target, id) {
  const base = target === 'kid' ? CONFIG.kidPage : './';
  const url = new URL(base, location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('ref', id);
  url.searchParams.set('utm_source', 'share');
  url.searchParams.set('utm_medium', target === 'kid' ? 'parent_to_kid' : 'parent_to_partner');
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
  return { id, url, text: MESSAGES[target](url) };
}

export function whatsapp(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
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
