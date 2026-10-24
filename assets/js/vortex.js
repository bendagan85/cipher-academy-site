// The Cipher mark as a live field of 0/1 glyphs, every digit where the logo
// has it (mark-layout.js). It assembles on first view, sways a little, makes
// way for a finger, and can scatter and come back together. The empty middle
// is a keyhole: the hero plays its film there, and the challenge chapter turns
// it into the start button.
import { MARK, KEYHOLE, EXTENT } from './mark-layout.js';

const SPR = 192;
const FONT = `700 ${SPR * 0.62}px Saira, Heebo, system-ui, sans-serif`;
let sprites = null;
let unit = 1; // sprite pixels per glyph height (the visible height of "0")

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
  for (const [k, col] of [['w', '#f4f6fa'], ['b', '#0a6cff']]) {
    sprites[k + '0'] = sprite('0', col);
    sprites[k + '1'] = sprite('1', col);
  }
}

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} o
 * @param {(w:number,h:number)=>{cx:number,cy:number,R:number}} o.layout  centre and outer radius, CSS px
 * @param {boolean} [o.intro]  fly in from scattered on first view
 */
export function createVortex(canvas, { layout, intro = true } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0;
  let raf = 0, visible = false, t0 = 0, introDone = !intro || reduce;
  let open = 0, openTarget = 0;
  const scat = { v: 0, from: 0, to: 0, t: 0, ms: 900, done: null };
  const glow = { r: 31, g: 99, b: 255, a: 0.2, tr: 31, tg: 99, tb: 255, ta: 0.2 };
  const pointer = { x: -1e4, y: -1e4 };
  let resolveAssembled;
  const assembled = new Promise((r) => { resolveAssembled = r; });
  if (introDone) resolveAssembled();

  const glyphs = MARK.map(([x, y, s, rot, d, c]) => {
    const dist = Math.hypot(x, y);
    return {
      x, y, s, rot, d, c: c ? 'b' : 'w', dist,
      ux: x / (dist || 1), uy: y / (dist || 1),
      sx: Math.random(), sy: Math.random(),
      kick: 0.55 + Math.random() * 0.9,
      delay: 0.08 + Math.random() * 0.5 + dist * 0.38,
      ox: 0, oy: 0, flipUntil: 0,
    };
  });
  const introEnd = Math.max(...glyphs.map((g) => g.delay)) + 1.1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ({ cx, cy, R } = layout(W, H));
    for (const fn of resized) fn();
    if (!raf) draw(performance.now());
  }
  const resized = new Set();

  function draw(now) {
    if (!sprites || !W) return false;
    const time = t0 ? (now - t0) / 1000 : 0;
    let busy = false;

    open += (openTarget - open) * 0.08;
    if (Math.abs(openTarget - open) > 0.002) busy = true;
    if (scat.v !== scat.to) {
      const p = scat.ms ? clamp01((now - scat.t) / scat.ms) : 1;
      scat.v = scat.from + (scat.to - scat.from) * easeInOut(p);
      if (p >= 1) { scat.v = scat.to; scat.done?.(); scat.done = null; } else busy = true;
    }
    for (const k of ['r', 'g', 'b', 'a']) glow[k] += (glow['t' + k] - glow[k]) * 0.06;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const halo = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.65);
    halo.addColorStop(0, `rgba(${glow.r | 0}, ${glow.g | 0}, ${glow.b | 0}, ${glow.a})`);
    halo.addColorStop(1, `rgba(${glow.r | 0}, ${glow.g | 0}, ${glow.b | 0}, 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    const sc = easeInOut(scat.v);
    for (const g of glyphs) {
      // the rings breathe against each other like the wheels of a cipher disk
      const sway = reduce ? 0 : 0.012 * Math.sin(time * 0.6 + g.dist * 5.2);
      const cs = Math.cos(sway), sn = Math.sin(sway);
      let hx = g.x * cs - g.y * sn, hy = g.x * sn + g.y * cs;
      // the keyhole opens: the lower half steps aside
      if (open > 0.001 && g.y > 0) { const k = open * g.y; hx += Math.sign(g.x) * k * 0.2; hy += k * 0.05; }
      // scatter: out along the spoke, further for the outer digits
      if (sc > 0) { hx += g.ux * sc * g.kick * 1.35; hy += g.uy * sc * g.kick * 1.35; }
      const homeX = cx + hx * R, homeY = cy + hy * R;

      const p = introDone ? 1 : clamp01((time - g.delay) / 1.1);
      const e = easeOut(p);
      let x = g.sx * W + (homeX - g.sx * W) * e;
      let y = g.sy * H + (homeY - g.sy * H) * e;

      // a finger pushes the digits aside; they spring back
      const dx = x - pointer.x, dy = y - pointer.y, dist = Math.hypot(dx, dy);
      const reach = Math.max(60, R * 0.42);
      const tx = dist < reach ? (dx / (dist || 1)) * (reach - dist) * 0.6 : 0;
      const ty = dist < reach ? (dy / (dist || 1)) * (reach - dist) * 0.6 : 0;
      g.ox += (tx - g.ox) * 0.14;
      g.oy += (ty - g.oy) * 0.14;
      if (Math.abs(g.ox) + Math.abs(g.oy) > 0.3) busy = true;
      x += g.ox; y += g.oy;

      // a digit flips now and then, and flips back: alive, but always the logo at rest
      if (!reduce && p === 1 && !g.flipUntil && Math.random() < 0.0009) g.flipUntil = now + 700 + Math.random() * 900;
      if (g.flipUntil && now > g.flipUntil) g.flipUntil = 0;
      const digit = g.flipUntil ? 1 - g.d : g.d;

      const s = (g.s * R) / unit;
      const rot = g.rot + sway;
      const c = Math.cos(rot) * s, n = Math.sin(rot) * s;
      ctx.setTransform(c * DPR, n * DPR, -n * DPR, c * DPR, x * DPR, y * DPR);
      ctx.globalAlpha = (0.2 + 0.8 * e) * (1 - sc * 0.9);
      ctx.drawImage(sprites[g.c + digit], -SPR / 2, -SPR / 2);
    }
    ctx.globalAlpha = 1;
    if (!introDone) {
      busy = true;
      if (time > introEnd) { introDone = true; resolveAssembled(); }
    }
    return busy;
  }

  function loop(now) {
    const busy = draw(now);
    raf = (visible && !reduce) || busy ? requestAnimationFrame(loop) : 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  }
  function onLeave() { pointer.x = pointer.y = -1e4; }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !t0) t0 = performance.now();
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
    // resolves once every digit has landed
    assembled,
    // the keyhole and the mark's box, in px from the canvas's top-left
    geometry() {
      return {
        cx, cy, R,
        r: KEYHOLE.r * R, slot: KEYHOLE.slot * R, bottom: KEYHOLE.bottom * R,
        top: cy + EXTENT.top * R, base: cy + EXTENT.bottom * R, half: EXTENT.half * R,
      };
    },
    onResize(fn) { resized.add(fn); if (W) fn(); return () => resized.delete(fn); },
    // 0..1: the lower half steps aside and the slot widens
    setOpen(v) { openTarget = clamp01(v); if (reduce) { open = openTarget; draw(performance.now()); } else kick(); },
    // the digits fly out along their spokes (true) or come home (false)
    scatter(on, ms = 900) {
      const to = on ? 1 : 0;
      if (scat.to === to && scat.v === to) return Promise.resolve();
      scat.done?.();
      return new Promise((done) => {
        Object.assign(scat, { from: scat.v, to, t: performance.now(), ms: reduce ? 0 : ms, done });
        if (reduce) draw(performance.now());
        kick();
      });
    },
    // the light behind the mark; the hero tints it with the film's own colour
    setGlow(rgb, alpha = 0.2) {
      [glow.tr, glow.tg, glow.tb] = rgb || [31, 99, 255];
      glow.ta = alpha;
      kick();
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerleave', onLeave);
      removeEventListener('touchend', onLeave);
    },
  };
}
