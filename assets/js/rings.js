// A small ring of arcs around the mark's keyhole: one arc per thing done,
// lit counter-clockwise from the top (the way the page reads), and the
// keyhole itself lights once every arc is on. The prerequisite checklists and
// the fit check's progress both use it; site.css styles it per use.
const NS = 'http://www.w3.org/2000/svg';
const KEYHOLE = 'M -9 -5 A 11 11 0 1 1 9 -5 L 6 2 L 7 18 L -7 18 L -6 2 Z';

export function arcRing(count, className, gap = 8) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '-50 -50 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const R = 40, step = 360 / count, span = step - gap;
  const at = (a) => `${(R * Math.cos((a * Math.PI) / 180)).toFixed(2)} ${(R * Math.sin((a * Math.PI) / 180)).toFixed(2)}`;
  const arcs = Array.from({ length: count }, (_, i) => {
    // sweep flag 0: counter-clockwise on screen
    const a0 = -90 - gap / 2 - i * step, a1 = a0 - span;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M ${at(a0)} A ${R} ${R} 0 0 0 ${at(a1)}`);
    svg.append(p);
    return p;
  });
  const key = document.createElementNS(NS, 'path');
  key.setAttribute('class', 'key');
  key.setAttribute('d', KEYHOLE);
  svg.append(key);
  return {
    svg,
    // light the first n arcs; all of them unlock the keyhole
    set(n) {
      arcs.forEach((a, i) => a.classList.toggle('on', i < n));
      svg.classList.toggle('is-full', n >= count);
    },
  };
}
