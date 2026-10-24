// Thirty sessions around a dial: one arc per session, lit counter-clockwise
// from the top (the way Hebrew reads) as the dial scrolls up the screen, with
// the count in the middle (.loop__count b) keeping up. Both pages' program
// chapters use it; the parents' page hangs the help between sessions on it.
const NS = 'http://www.w3.org/2000/svg';
// the arcs' radius in the dial's 200-unit box
export const DIAL_R = 88.5;

export function createDial(loop, sessions = 30) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = loop.querySelector('.loop__count b');
  const step = 360 / sessions;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'loop__dial');
  svg.setAttribute('viewBox', '-100 -100 200 200');
  svg.setAttribute('aria-hidden', 'true');
  const pt = (a) => `${(DIAL_R * Math.cos((a * Math.PI) / 180)).toFixed(2)} ${(DIAL_R * Math.sin((a * Math.PI) / 180)).toFixed(2)}`;
  const segs = Array.from({ length: sessions }, (_, i) => {
    const a0 = -90 - i * step - step / 8, a1 = a0 - step * 0.75;
    const path = document.createElementNS(NS, 'path');
    // sweep 0: counter-clockwise on screen
    path.setAttribute('d', `M ${pt(a0)} A ${DIAL_R} ${DIAL_R} 0 0 0 ${pt(a1)}`);
    svg.append(path);
    return path;
  });
  loop.prepend(svg);

  let lit = -1;
  function light(n) {
    if (n === lit) return;
    segs.forEach((p, i) => { p.classList.toggle('on', i < n); p.classList.toggle('is-new', i === n - 1 && n < sessions); });
    if (count) count.textContent = String(n);
    if (n === sessions && lit < sessions) loop.classList.add('is-full');
    if (n < sessions) loop.classList.remove('is-full');
    lit = n;
  }
  const { gsap, ScrollTrigger } = window;
  if (reduce || !ScrollTrigger) light(sessions);
  else {
    const p = { n: 0 };
    light(0);
    gsap.to(p, {
      n: sessions, ease: 'none', onUpdate: () => light(Math.round(p.n)),
      scrollTrigger: { trigger: loop, start: 'top 82%', end: 'bottom 60%', scrub: 0.4 },
    });
  }
}
