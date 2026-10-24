// The Cipher mark as a live field of 0/1 glyphs. Every digit sits where the
// brand's own logo has it (mark-layout.js): 31 spokes, six rings, and a slot
// at the bottom that makes the empty middle a keyhole.
//
// The rings turn like the wheels of a combination lock. On first view a storm
// of digits lands on them while they spin; they click into place one by one,
// outside in, until their gaps line up into the keyhole — the exact logo.
// Extra digits from the storm stay behind as a faint drift.
//
// One component, four places: the hero (the film plays in the opened
// keyhole), the syllabus (its rings are the three tiers), the challenge
// (scrambled until someone unlocks it) and the footer.
import { MARK, KEYHOLE, EXTENT } from './mark-layout.js';

const SPR = 160;
const FONT = `700 ${SPR * 0.62}px Saira, Heebo, system-ui, sans-serif`;
const INKS = { w: '#f4f6fa', b: '#1f6dff', c: '#a6e4ff' };
const EDGES = [0.52, 0.6, 0.7, 0.8, 0.95];          // ring bands, inside out
const GAP = [65.5, 114.8];                           // the slot, in degrees (y points down)
const ARC = 360 - (GAP[1] - GAP[0]);                 // what the 31 spokes span
const STEP = ((ARC / 31) * Math.PI) / 180;           // one spoke, in radians
const OUT = 1.07;                                    // the ring's outer edge
const SQUEEZE = 0.43;                                // how far the aperture thins the ring
const INNER = 0.458;                                 // the inner ring, at rest
const GEAR = [2.3, -1.9, 1.6, -1.35, 1.15, -1];      // how each ring follows a dragging finger

let sprites = null;
let unit = 1; // sprite px per glyph height: the visible height of "0"

function sprite(ch, color) {
  const c = document.createElement('canvas');
  c.width = c.height = SPR;
  const g = c.getContext('2d');
  g.font = FONT;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const m = g.measureText(ch);
  g.fillStyle = color;
  // the digit's visual centre on the sprite's centre
  g.fillText(ch, SPR / 2, SPR / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  if (ch === '0') unit = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  return c;
}

function buildSprites() {
  sprites = {};
  for (const [k, col] of Object.entries(INKS)) {
    sprites[k + '0'] = sprite('0', col);
    sprites[k + '1'] = sprite('1', col);
  }
}

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// A ring's lock: spin down from A to a notch just short of home, then snap into it.
function program(t0, L, A) {
  return { t0, L, A, d: (A < 0 ? -1 : 1) * 0.075, clicked: false };
}
function programAngle(p, t) {
  if (t <= p.t0) return p.A;
  if (t < p.L) return p.d + (p.A - p.d) * Math.pow(1 - (t - p.t0) / (p.L - p.t0), 3);
  const tau = t - p.L;
  return tau > 0.5 ? 0 : p.d * Math.exp(-tau * 20) * Math.cos(tau * 46);
}

// A layout for a mark whose box the page's CSS already sized: the box is the
// mark's full height (once open, when the camera moves in by `push`), and
// its horizontal centre is the mark's centre line.
export function boxLayout(box, canvas, push = 0) {
  return () => {
    const b = box.getBoundingClientRect(), c = canvas.getBoundingClientRect();
    const P = 1 + push, R = b.height / ((EXTENT.bottom - EXTENT.top) * P);
    return { cx: b.left - c.left + b.width / 2, cy: b.top - c.top - EXTENT.top * R * P, R, push };
  };
}

// the inner ring's radius once the aperture is open by v (0..1), in R units
const innerAt = (v) => OUT - (OUT - INNER) * (1 - SQUEEZE * v);

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} o
 * @param {(w:number,h:number)=>{cx:number,cy:number,R:number,push?:number}} o.layout
 *        centre and outer radius in CSS px; `push` is how far the camera moves in
 *        when the keyhole opens (0.2 = 20% closer)
 * @param {'storm'|'none'|'scrambled'} [o.intro]  storm in on first view, sit still, or start locked
 * @param {number} [o.dust]   extra digits that stay behind as a faint drift
 * @param {number} [o.halo]   strength of the blue light behind the mark
 * @param {boolean} [o.rim]   a thin line of light around the keyhole once it opens
 */
export function createVortex(canvas, { layout, intro = 'storm', dust = 0, halo = 1, rim = false } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0, push = 0;
  let raf = 0, visible = false, last = 0, clock = 0, started = false;
  let open = 0, openTo = 0, scrambled = intro === 'scrambled', wander = scrambled ? 1 : 0;
  const stormy = intro === 'storm' && !reduce;
  let introEnd = 0, introDone = !stormy, swayIn = introDone && !reduce ? 1 : 0;
  let pulse = 0, fadeAll = 1;
  const cam = { s: 1, x: 0, y: 0 };
  const scat = { v: 0, from: 0, to: 0, t: 0, ms: 900, done: null };
  const glow = { r: 31, g: 99, b: 255, a: 0.2 * halo, tr: 31, tg: 99, tb: 255, ta: 0.2 * halo };
  const pointer = { x: -1e4, y: -1e4 };
  const resized = new Set();
  let resolveAssembled, resolveUnlock = null, unlockEnd = 0;
  const assembled = new Promise((r) => { resolveAssembled = r; });
  if (introDone) resolveAssembled();

  const rings = Array.from({ length: 6 }, (_, k) => ({
    k, dir: k % 2 ? 1 : -1, prog: null, base: 0, user: 0, flash: 0,
    light: 1, lightTo: 1, hi: 0, hiTo: 0, tick: 0, angle: 0,
  }));
  if (scrambled) rings.forEach((r) => { r.base = r.dir * rnd(0.7, 2.4); });

  const glyphs = MARK.map(([x, y, s, rot, d, c]) => {
    const dist = Math.hypot(x, y);
    const ang = Math.atan2(y, x);
    const deg = ((ang * 180) / Math.PI + 360) % 360;
    const k = EDGES.findIndex((e) => dist < e);
    const ring = k < 0 ? 5 : k;
    return {
      ring, dist, ang, s, rot, d, c: c ? 'b' : 'w',
      // where along its ring the digit sits: 0 at the slot's right edge, then
      // counter-clockwise, the way Hebrew reads, to 1 at its left edge
      u: ((GAP[0] - deg + 360) % 360) / ARC,
      arrive: 0.1 + Math.random() * 0.35 + (5 - ring) * 0.06,
      dur: rnd(0.85, 1.15),
      r0: rnd(1.3, 2.6),
      swirl: (ring % 2 ? 1 : -1) * rnd(1.5, 3.6),
      kick: rnd(0.55, 1.45),
      ox: 0, oy: 0, flipUntil: 0, hi: 0, hiTo: 0,
    };
  });

  const drift = Array.from({ length: reduce ? Math.round(dust * 0.6) : dust }, () => {
    const r = rnd(1.18, 2.9);
    return {
      r, ang: rnd(0, Math.PI * 2), s: rnd(0.034, 0.085), rot: rnd(-0.6, 0.6),
      d: Math.random() < 0.5 ? 1 : 0, c: Math.random() < 0.55 ? 'b' : 'w',
      a: rnd(0.05, 0.17), w: rnd(0.02, 0.07) * (Math.random() < 0.5 ? -1 : 1) / r,
      arrive: rnd(0, 1.2), dur: rnd(0.9, 1.6), r0: r + rnd(0.4, 1.6), swirl: rnd(-3, 3),
      bob: rnd(0, 6), ox: 0, oy: 0,
    };
  });

  function startIntro() {
    if (intro !== 'storm' || introDone) return;
    for (const r of rings) r.prog = program(0, 1.6 + (5 - r.k) * 0.15, r.dir * rnd(2.4, 3.8));
    introEnd = 1.6 + 5 * 0.15 + 0.35;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    W = rect.width; H = rect.height;
    // a big canvas on a dense screen costs more than it shows: cap the backing store
    DPR = Math.min(devicePixelRatio || 1, 2, Math.sqrt(3.6e6 / (W * H)));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ({ cx, cy, R, push = 0 } = layout(W, H));
    for (const fn of resized) fn();
    if (!raf) draw(0);
  }

  // the keyhole when the aperture is open by v, in CSS px
  function hole(v = open) {
    const P = (1 + push * v) * cam.s;
    return {
      r: (innerAt(v) - 0.045) * R * P,
      slot: (KEYHOLE.slot + 0.1 * v) * R * P,
      bottom: KEYHOLE.bottom * R * P,
    };
  }

  function ringAngle(r, t) {
    let a = r.user + (r.prog ? programAngle(r.prog, t) : r.base);
    if (wander > 0.001) a += wander * 0.16 * Math.sin(t * 0.33 + r.k * 1.7);
    if (swayIn > 0.001) a += swayIn * 0.035 * Math.sin(t * 0.55 + r.k * 1.1);
    // the aperture turns as it opens, like the blades of a lens, and settles aligned
    a += r.dir * 0.32 * Math.sin(Math.PI * open);
    return a;
  }

  function draw(dt) {
    if (!sprites || !W) return false;
    const t = clock;
    let busy = false;

    if (Math.abs(openTo - open) > 0.0015) { open += (openTo - open) * Math.min(1, dt * 5); busy = true; } else open = openTo;
    if (scat.v !== scat.to) {
      const p = scat.ms ? clamp01((performance.now() - scat.t) / scat.ms) : 1;
      scat.v = scat.from + (scat.to - scat.from) * easeInOut(p);
      if (p >= 1) { scat.v = scat.to; scat.done?.(); scat.done = null; } else busy = true;
    }
    const k = Math.min(1, dt * 4);
    for (const c of ['r', 'g', 'b', 'a']) glow[c] += (glow['t' + c] - glow[c]) * (dt ? k : 1);
    if (!scrambled && wander > 0) wander = Math.max(0, wander - dt * 2);
    if (introDone && swayIn < 1) swayIn = reduce ? 0 : Math.min(1, swayIn + dt * 0.8);
    pulse *= Math.exp(-dt * 3);

    for (const r of rings) {
      if (r.prog) {
        if (!r.prog.clicked && t >= r.prog.L) { r.prog.clicked = true; r.flash = 1; pulse = Math.min(1, pulse + 0.45); }
        if (t > r.prog.L + 0.5) { r.prog = null; r.base = 0; }
      }
      r.angle = ringAngle(r, t);
      r.flash *= Math.exp(-dt * 4.5);
      r.light += (r.lightTo - r.light) * (dt ? Math.min(1, dt * 5) : 1);
      r.hi += (r.hiTo - r.hi) * (dt ? Math.min(1, dt * 6) : 1);
      if (r.flash > 0.01 || Math.abs(r.light - r.lightTo) > 0.01) busy = true;
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const P = (1 + push * open) * cam.s;
    const ox = cx + cam.x * R, oy = cy + cam.y * R;
    const sc = easeInOut(scat.v);

    // the light behind the mark: off-centre, toward its blue half
    if (halo) {
      const a = glow.a * (1 + pulse * 0.9) * (1 - sc * 0.6) * fadeAll;
      const g = ctx.createRadialGradient(ox + R * 0.35 * P, oy, R * 0.1, ox + R * 0.2 * P, oy, R * 1.7 * P);
      g.addColorStop(0, `rgba(${glow.r | 0}, ${glow.g | 0}, ${glow.b | 0}, ${a.toFixed(3)})`);
      g.addColorStop(1, `rgba(${glow.r | 0}, ${glow.g | 0}, ${glow.b | 0}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    const reach = Math.max(60, R * 0.42);
    const repel = (g, x, y) => {
      const dx = x - pointer.x, dy = y - pointer.y, d = Math.hypot(dx, dy);
      const tx = d < reach ? (dx / (d || 1)) * (reach - d) * 0.6 : 0;
      const ty = d < reach ? (dy / (d || 1)) * (reach - d) * 0.6 : 0;
      g.ox += (tx - g.ox) * 0.14;
      g.oy += (ty - g.oy) * 0.14;
      if (Math.abs(g.ox) + Math.abs(g.oy) > 0.3) busy = true;
    };
    const put = (img, x, y, size, rot, alpha) => {
      const s = size / unit, c = Math.cos(rot) * s, n = Math.sin(rot) * s;
      ctx.setTransform(c * DPR, n * DPR, -n * DPR, c * DPR, x * DPR, y * DPR);
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, -SPR / 2, -SPR / 2);
    };

    // the drift: storm leftovers, slowly orbiting behind the mark
    for (const g of drift) {
      if (!reduce) g.ang += g.w * dt;
      const p = stormy ? clamp01((t - g.arrive) / g.dur) : 1;
      const e = easeOut(p);
      const rr = g.r0 + (g.r - g.r0) * e + (reduce ? 0 : 0.03 * Math.sin(t * 0.4 + g.bob));
      const a = g.ang + g.swirl * (1 - e);
      let x = ox + Math.cos(a) * rr * R * P, y = oy + Math.sin(a) * rr * R * P;
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      repel(g, x, y);
      x += g.ox; y += g.oy;
      if (!reduce && Math.random() < 0.0006) g.d = 1 - g.d;
      const settle = stormy ? clamp01((t - g.arrive - g.dur) / 1.4) : 1;
      const alpha = (0.25 + 0.4 * e) * (1 - settle) + g.a * settle;
      put(sprites[g.c + g.d], x, y, g.s * R * P, g.rot + a * 0.3, alpha * (1 - sc * 0.7) * fadeAll);
    }

    // the mark
    const v = open, squeeze = 1 - SQUEEZE * v;
    const breathe = reduce ? 1 : 1 + 0.008 * v * Math.sin(t * 1.1);
    for (const g of glyphs) {
      const r = rings[g.ring];
      // the aperture: the band thins toward its outer edge, and every digit
      // shrinks with it — rings that close up with full-size digits overlap
      // into chains of 8s
      const dist = (OUT - (OUT - g.dist) * squeeze) * breathe;
      const size = g.s * (1 - SQUEEZE * 0.85 * v);
      const a = g.ang + r.angle;
      let hx = Math.cos(a) * dist, hy = Math.sin(a) * dist;
      // scatter: out along the spoke, further for the outer digits
      if (sc > 0) { hx += Math.cos(a) * sc * g.kick * 1.35; hy += Math.sin(a) * sc * g.kick * 1.35; }

      let x, y, rot = g.rot + r.angle, alpha = 1, sz = size;
      const p = introDone ? 1 : clamp01((t - g.arrive) / g.dur);
      if (p < 1) {
        // storming in: a spiral from far out onto the turning ring
        const e = easeOut(p);
        const rr = g.r0 + (dist - g.r0) * e, aa = a + g.swirl * (1 - e);
        hx = Math.cos(aa) * rr; hy = Math.sin(aa) * rr;
        rot += g.swirl * (1 - e) * 0.6;
        sz *= 1 + 0.5 * (1 - e);
        alpha = 0.3 + 0.7 * e;
        busy = true;
      }
      x = ox + hx * R * P; y = oy + hy * R * P;
      repel(g, x, y);
      x += g.ox; y += g.oy;

      // a digit flips now and then, and flips back: alive, but always the logo at rest
      if (!reduce && p === 1 && !g.flipUntil && Math.random() < 0.0008) g.flipUntil = performance.now() + rnd(700, 1600);
      if (g.flipUntil && performance.now() > g.flipUntil) g.flipUntil = 0;
      const digit = g.flipUntil ? 1 - g.d : g.d;

      // a highlighted digit is lit even on a dimmed ring, and stands a little larger
      g.hi += (g.hiTo - g.hi) * (dt ? Math.min(1, dt * 7) : 1);
      if (Math.abs(g.hiTo - g.hi) > 0.01) busy = true;
      const bump = 1 + 0.2 * g.hi;
      alpha *= (0.16 + 0.84 * Math.max(r.light, g.hi)) * (1 - sc * 0.9) * fadeAll;
      put(sprites[g.c + digit], x, y, sz * bump * R * P, rot, alpha);
      const lit = Math.max(r.flash, r.hi, g.hi);
      if (lit > 0.02) put(sprites['c' + digit], x, y, sz * bump * R * P, rot, Math.min(1, lit) * alpha * 0.95);
    }
    ctx.globalAlpha = 1;

    // the lens rim: the keyhole's outline, lit, fading down the slot
    if (rim && v > 0.02) {
      const h = hole(v), r0 = h.r + 3, s0 = Math.min(h.slot, h.r * 0.95) + 3, sh = Math.sqrt(r0 * r0 - s0 * s0);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const fade = ctx.createLinearGradient(0, oy - r0, 0, oy + h.bottom);
      const a = (0.6 * v * fadeAll * (1 - sc)).toFixed(3);
      fade.addColorStop(0, `rgba(120, 205, 255, ${a})`);
      fade.addColorStop(0.55, `rgba(120, 205, 255, ${a})`);
      fade.addColorStop(1, 'rgba(120, 205, 255, 0)');
      ctx.strokeStyle = fade;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = 'rgba(56, 182, 255, .9)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(ox - s0, oy + h.bottom);
      ctx.lineTo(ox - s0, oy + sh);
      ctx.arc(ox, oy, r0, Math.PI / 2 + Math.asin(s0 / r0), Math.PI / 2 - Math.asin(s0 / r0) + Math.PI * 2);
      ctx.lineTo(ox + s0, oy + h.bottom);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (!introDone) {
      busy = true;
      if (t > introEnd) { introDone = true; resolveAssembled(); }
    }
    if (resolveUnlock && t > unlockEnd) { resolveUnlock(); resolveUnlock = null; }
    return busy || rings.some((r) => r.prog);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (started) clock += dt;
    const busy = draw(dt);
    raf = (visible && !reduce) || (busy && !reduce) ? requestAnimationFrame(loop) : 0;
    if (!raf) last = 0;
  }
  const kick = () => {
    if (reduce) { draw(0); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  };

  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  }
  function onLeave() { pointer.x = pointer.y = -1e4; }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started) { started = true; if (reduce) clock = 99; startIntro(); }
    if (visible) kick();
  });
  const ro = new ResizeObserver(resize);

  const ready = (document.fonts?.load(FONT, '01') ?? Promise.resolve()).catch(() => {}).then(() => {
    if (!sprites) buildSprites();
    ro.observe(canvas);
    io.observe(canvas);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerleave', onLeave);
    addEventListener('touchend', onLeave, { passive: true });
  });

  return {
    ready,
    // resolves once every digit has landed and the last ring has clicked in
    assembled,
    rings: 6,
    // the mark and its keyhole right now, in px from the canvas's top-left
    geometry() {
      const P = (1 + push * open) * cam.s;
      return {
        cx: cx + cam.x * R, cy: cy + cam.y * R, R, P, push, ...hole(open),
        top: cy + EXTENT.top * R * P, base: cy + EXTENT.bottom * R * P, half: EXTENT.half * R * P,
      };
    },
    // the keyhole at any opening (0..1), for whoever frames a picture in it
    hole,
    onResize(fn) { resized.add(fn); if (W) fn(); return () => resized.delete(fn); },
    // the layout box moved without the canvas changing size (fonts, wrapping)
    relayout: resize,
    // 0..1: the ring thins outward and the camera moves in — an aperture opening
    setOpen(v, now = false) {
      openTo = clamp01(v);
      if (now || reduce) open = openTo;
      kick();
    },
    // the digits fly out along their spokes (true) or come home (false)
    scatter(on, ms = 900) {
      const to = on ? 1 : 0;
      if (scat.to === to && scat.v === to) return Promise.resolve();
      scat.done?.();
      return new Promise((done) => {
        Object.assign(scat, { from: scat.v, to, t: performance.now(), ms: reduce ? 0 : ms, done });
        kick();
      });
    },
    setGlow(rgb, alpha = 0.2) {
      [glow.tr, glow.tg, glow.tb] = rgb || [31, 99, 255];
      glow.ta = alpha * halo;
      kick();
    },
    // zoom about the mark's centre; x/y shift it, in R units
    setCamera({ s = cam.s, x = cam.x, y = cam.y } = {}) {
      Object.assign(cam, { s, x, y });
      for (const fn of resized) fn();
      kick();
    },
    // how bright each ring is (0 dim … 1 full), inside out
    setLight(levels) { rings.forEach((r, i) => { r.lightTo = levels[i] ?? 1; if (reduce) r.light = r.lightTo; }); kick(); },
    // a light-blue overlay: whole rings, and/or single digits by (ring, u)
    setHighlight(ringLevels = [], fn = null) {
      rings.forEach((r, i) => { r.hiTo = ringLevels[i] || 0; if (reduce) r.hi = r.hiTo; });
      for (const g of glyphs) { g.hiTo = fn ? fn(g.ring, g.u) : 0; if (reduce) g.hi = g.hiTo; }
      kick();
    },
    flash(ring, amount = 1) { if (rings[ring]) rings[ring].flash = Math.max(rings[ring].flash, amount); kick(); },
    // a finger turns the rings, each at its own gear; a tick as each passes a spoke
    nudge(rad) {
      if (!scrambled) return;
      for (const r of rings) {
        r.user += rad * GEAR[r.k];
        const step = Math.floor(r.user / STEP);
        if (step !== r.tick) { r.tick = step; r.flash = Math.max(r.flash, 0.4); }
      }
      kick();
    },
    get locked() { return scrambled; },
    // the rings spin home and click in one by one, outside in
    unlock() {
      if (!scrambled) return Promise.resolve();
      // unlocked before it was ever on screen (a script, a keyboard jump): start the clock
      if (!started) { started = true; if (reduce) clock = 99; }
      const t = clock;
      for (const r of rings) {
        const cur = r.angle - (swayIn * 0.035 * Math.sin(t * 0.55 + r.k * 1.1)) - r.dir * 0.32 * Math.sin(Math.PI * open);
        r.user = 0; r.base = 0;
        // one extra full turn on the way home: the same picture, so nothing jumps
        r.prog = program(t, t + 0.5 + (5 - r.k) * 0.12, cur + r.dir * Math.PI * 2);
      }
      scrambled = false;
      wander = 0;
      unlockEnd = t + 0.5 + 5 * 0.12 + 0.3;
      if (reduce) { rings.forEach((r) => { r.prog = null; }); draw(0); return Promise.resolve(); }
      kick();
      return new Promise((res) => { resolveUnlock = res; });
    },
    fade(v) { fadeAll = clamp01(v); kick(); },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerleave', onLeave);
      removeEventListener('touchend', onLeave);
    },
  };
}
