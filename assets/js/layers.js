// One system, three ways to look at it.
//   defend   — the layers sit closed; a perimeter lights up around the screen
//   attack   — still closed; probes hit the outside edges, looking for a gap
//   research — the system comes apart into its layers, and one amber cell deep
//              inside lights the button everyone clicks on top
//
// Physical left/top inside the stack on purpose: the layers must line up with
// each other in 3D, and RTL logical offsets would mirror one of them.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OPEN = { chip: -128, circuit: -64, mem: 0, code: 64, ui: 128 };
const SHUT = { chip: -16, circuit: -8, mem: 0, code: 8, ui: 16 };

const CODE_ROWS = [[80, 78, 0], [50, 108, 1], [64, 94, 0], [34, 124, 0], [94, 64, 1], [48, 110, 0], [76, 82, 0], [26, 132, 1], [60, 98, 0], [86, 72, 0]];

function markup(markSrc) {
  const rows = CODE_ROWS.map(([l, w, k], i) => `<span class="row${k ? ' k' : ''}" style="left:${l}px;top:${14 + i * 14.5}px;width:${w}px"></span>`).join('');
  const cells = Array.from({ length: 64 }, (_, i) => `<i${i === 21 ? ' class="hot"' : ''}></i>`).join('');
  return `
  <div class="sys__tilt"><div class="sys__stack">
    <div class="ly ly--chip"><img src="${markSrc}" alt="" width="90" height="90"></div>
    <div class="ly ly--circuit">
      <svg viewBox="0 0 200 200" fill="none" stroke="rgba(130,170,255,.5)" stroke-width="1.2">
        <path d="M20 40h50l20 20h40M20 100h30l20-20h60l20 20h30M40 160h40l20-20h80M100 20v30M150 180v-40"/>
        <g fill="rgba(130,170,255,.7)" stroke="none"><circle cx="70" cy="40" r="3"/><circle cx="130" cy="60" r="3"/><circle cx="150" cy="80" r="3"/><circle cx="80" cy="160" r="3"/><circle cx="100" cy="50" r="3"/><circle cx="150" cy="140" r="3"/></g>
      </svg>
    </div>
    <div class="ly ly--mem"><div class="cells">${cells}</div></div>
    <div class="ly ly--code">${rows}</div>
    <div class="ly ly--ui">
      <span class="bar"></span>
      <span class="dot" style="left:9px"></span><span class="dot" style="left:19px"></span><span class="dot" style="left:29px"></span>
      <span class="t" style="left:80px;top:25px;width:78px"></span>
      <span class="t" style="left:108px;top:33px;width:50px;opacity:.7"></span>
      <span class="key"></span>
      <span class="t" style="left:12px;top:100px;width:146px"></span>
      <span class="t" style="left:52px;top:111px;width:106px"></span>
      <span class="t" style="left:82px;top:122px;width:76px"></span>
      <span class="guard"></span>
      <span class="probe p1"></span><span class="probe p2"></span><span class="probe p3"></span>
    </div>
    <span class="beam"></span>
  </div></div>`;
}

export function createSystem(root, { markSrc }) {
  root.insertAdjacentHTML('beforeend', markup(markSrc));
  const layers = Object.fromEntries(Object.keys(OPEN).map((k) => [k, root.querySelector('.ly--' + k)]));
  const beam = root.querySelector('.beam');
  const gsap = window.gsap;
  let mode = null;

  gsap.set(beam, { rotationX: 90, transformOrigin: '50% 0%', scaleY: 0 });
  for (const [k, el] of Object.entries(layers)) gsap.set(el, { z: SHUT[k] });

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    root.dataset.mode = next;
    const z = next === 'research' ? OPEN : SHUT;
    const d = reduce ? 0 : 1;
    for (const [k, el] of Object.entries(layers)) {
      gsap.to(el, { z: z[k], duration: 1.2 * d, ease: next === 'research' ? 'expo.out' : 'power3.inOut', overwrite: true });
    }
    gsap.to(beam, { scaleY: next === 'research' ? 1 : 0, duration: (next === 'research' ? 0.7 : 0.25) * d, delay: next === 'research' ? 0.9 * d : 0, ease: 'power2.inOut', overwrite: true });
  }

  // lean toward the finger or the cursor, only while the scene is on screen
  let near = false;
  new IntersectionObserver(([e]) => { near = e.isIntersecting; }).observe(root);
  if (!reduce) {
    gsap.to(root.querySelector('.sys__stack'), { '--spin': '-37deg', duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    addEventListener('pointermove', (e) => {
      if (!near) return;
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      gsap.to(root.querySelector('.sys__tilt'), { rotationX: -ny * 8, rotationY: nx * 10, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
    }, { passive: true });
  }

  return { setMode, get mode() { return mode; } };
}
