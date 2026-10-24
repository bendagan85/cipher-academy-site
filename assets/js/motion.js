// Motion shared by both pages: the decoding headline, titles that rise word
// by word, and fade-ups. Hidden states live in CSS under .js, so a page with
// scripts off still reads.

export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Hebrew letters only: a digit inside an RTL word starts an LTR run and the scramble jumps
const POOL = 'אבגדהוזחטיכלמנסעפצקרשת';

export function decode(el, delay) {
  const words = [...el.querySelectorAll('.w')];
  for (const w of words) {
    const fin = w.textContent;
    w.textContent = '';
    const f = Object.assign(document.createElement('span'), { className: 'w__f', textContent: fin });
    const s = Object.assign(document.createElement('span'), { className: 'w__s' });
    s.setAttribute('aria-hidden', 'true');
    w.append(f, s);
    w.dataset.len = fin.length;
  }
  if (reduce) { words.forEach((w) => w.classList.add('is-done')); return Promise.resolve(); }
  return new Promise((resolve) => {
    const t = performance.now() + delay;
    (function tick(now) {
      let open = 0;
      words.forEach((w, i) => {
        if (w.classList.contains('is-done')) return;
        open++;
        const begin = t + i * 110, end = begin + 520, s = w.lastElementChild;
        if (now < begin) { s.textContent = ''; return; }
        if (now >= end) { w.classList.add('is-done'); return; }
        let out = '';
        for (let k = 0; k < +w.dataset.len; k++) out += POOL[(Math.random() * POOL.length) | 0];
        s.textContent = out;
      });
      if (open) requestAnimationFrame(tick); else resolve();
    })(performance.now());
  });
}

// wrap every word of a title (inside <em> too) so it can rise out of its own mask
export function splitWords(el) {
  const word = (text) => {
    const outer = document.createElement('span');
    outer.className = 'wd';
    const inner = document.createElement('span');
    inner.textContent = text;
    outer.append(inner);
    return outer;
  };
  for (const child of [...el.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      // ordinary spaces only: a no-break space keeps "4 שאלות" together as one word
      for (const part of child.textContent.split(/([ \t\n\r]+)/)) {
        if (!part) continue;
        frag.append(/^[ \t\n\r]+$/.test(part) ? document.createTextNode(part) : word(part));
      }
      child.replaceWith(frag);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      splitWords(child);
    }
  }
}

function onView(el, fn, threshold = 0.12, rootMargin = '0px 0px -10% 0px') {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { threshold, rootMargin });
  io.observe(el);
}

// titles rise word by word; anything marked .rise fades up — each once, on first view
export function reveals(scope = document) {
  const { gsap } = window;
  scope.querySelectorAll('.split-words').forEach((el) => {
    splitWords(el);
    if (reduce) return;
    // gsap reads the CSS translateY(110%) as px: zero y at both ends or the words stay down
    onView(el, () => gsap.fromTo(el.querySelectorAll('.wd > span'), { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 0.9, stagger: 0.045, ease: 'power3.out' }));
  });
  scope.querySelectorAll('.chapter .rise').forEach((el) => {
    if (reduce) { gsap.set(el, { opacity: 1, y: 0 }); return; }
    onView(el, () => gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', overwrite: true }));
  });
}

// a number ([data-count]) counted up from zero once it is fully in view; the
// real figure stays in the text for screen readers, the counting one is only seen
export function countUp(el, duration = 1.5) {
  if (!el || reduce) return;
  const to = +el.dataset.count;
  el.insertAdjacentHTML('beforebegin', `<span class="sr">${to}</span>`);
  el.setAttribute('aria-hidden', 'true');
  el.textContent = '0';
  onView(el, () => {
    const c = { n: 0 };
    window.gsap.to(c, { n: to, duration, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(c.n); } });
  }, 0.9, '0px');
}

// Content that grows or shrinks after load (a tab's longer answer, an opened
// question, the challenge panel) moves everything under it, and the scroll
// scenes below would fire early or late by that much: once the page's height
// settles, ScrollTrigger measures them again.
export function remeasure() {
  const { ScrollTrigger } = window;
  if (!ScrollTrigger) return;
  let h = document.body.offsetHeight, t = 0;
  new ResizeObserver(() => {
    const now = document.body.offsetHeight;
    if (Math.abs(now - h) < 2) return;
    h = now;
    clearTimeout(t);
    t = setTimeout(() => ScrollTrigger.refresh(), 180);
  }).observe(document.body);
}
