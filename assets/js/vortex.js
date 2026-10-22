// The Cipher mark as a live field of 0/1 glyphs.
// Same geometry as the logo: rows of digits growing outward, white on the
// left half, blue on the right, a cyan seam at the top, and a gap at the
// bottom that turns the empty centre into a keyhole.

const SPR = 96;
let sprites = null;

function sprite(ch, color) {
  const c = document.createElement('canvas');
  c.width = c.height = SPR;
  const g = c.getContext('2d');
  g.font = `700 ${SPR * 0.8}px Heebo, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(ch, SPR / 2, SPR / 2 + SPR * 0.05);
  return c;
}

function buildSprites() {
  sprites = {};
  for (const [k, col] of [['w', '#eef1f6'], ['b', '#2b6cff'], ['c', '#62ccff']]) {
    sprites[k + '0'] = sprite('0', col);
    sprites[k + '1'] = sprite('1', col);
  }
}

const ease = (p) => 1 - Math.pow(1 - p, 3);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} o
 * @param {(w:number,h:number)=>{cx:number,cy:number,R:number}} o.layout
 * @param {number} [o.gap]   bottom opening in radians; setGap() animates it
 * @param {boolean} [o.intro] scatter → assemble on first view
 */
export function createVortex(canvas, { layout, rows = 12, gap = 1.0, intro = true } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0;
  let glyphs = [];
  let raf = 0, visible = false, t0 = 0, introDone = !intro || reduce;
  let curGap = gap, targetGap = gap;
  const pointer = { x: -1e4, y: -1e4 };

  function build() {
    glyphs = [];
    for (let k = 0; k < rows; k++) {
      const t = k / (rows - 1);
      const r = 0.42 + 0.58 * t;
      const size = 0.044 + 0.058 * t;
      // count for the default opening, so density stays put while the gap moves
      const span = Math.PI * 2 - gap;
      const n = Math.floor((span * r) / (size * 0.98));
      for (let i = 0; i < n; i++) {
        glyphs.push({
          u: (i + 0.5) / n, t, r, size, row: k,
          d: Math.random() < 0.66 ? '0' : '1',
          sx: Math.random(), sy: Math.random(),
          ox: 0, oy: 0,
          delay: 0.1 + Math.random() * 0.55 + t * 0.35,
          alpha: 0.62 + 0.38 * t,
        });
      }
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ({ cx, cy, R } = layout(W, H));
    if (!raf) draw(performance.now());
  }

  function draw(now) {
    if (!sprites || !W) return;
    const time = (now - t0) / 1000;
    curGap += (targetGap - curGap) * 0.06;
    const start = Math.PI / 2 + curGap / 2, span = Math.PI * 2 - curGap;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(cx + R * 0.35, cy, R * 0.1, cx + R * 0.2, cy, R * 1.6);
    glow.addColorStop(0, 'rgba(31, 99, 255, 0.20)');
    glow.addColorStop(1, 'rgba(31, 99, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    for (const g of glyphs) {
      // rings turn a little against each other, like the wheels of a cipher disk
      const sway = reduce ? 0 : 0.05 * Math.sin(time * 0.55 + g.row * 0.7);
      const a = start + g.u * span - 0.20 * g.t + sway;
      const hx = cx + Math.cos(a) * g.r * R;
      const hy = cy + Math.sin(a) * g.r * R;

      const p = introDone ? 1 : Math.min(1, Math.max(0, (time - g.delay) / 1.15));
      const e = ease(p);
      let x = g.sx * W + (hx - g.sx * W) * e;
      let y = g.sy * H + (hy - g.sy * H) * e;

      // a finger pushes the digits aside; they spring back
      const dx = x - pointer.x, dy = y - pointer.y, dist = Math.hypot(dx, dy);
      const reach = 78;
      const tx = dist < reach ? (dx / (dist || 1)) * (reach - dist) * 0.7 : 0;
      const ty = dist < reach ? (dy / (dist || 1)) * (reach - dist) * 0.7 : 0;
      g.ox += (tx - g.ox) * 0.14;
      g.oy += (ty - g.oy) * 0.14;
      x += g.ox; y += g.oy;

      // the cipher never sits still: a few digits flip every second
      if (!reduce && p === 1 && Math.random() < 0.0016) g.d = g.d === '0' ? '1' : '0';

      const top = Math.sin(a) < -0.55, side = Math.cos(a);
      const color = top && Math.abs(side) < 0.16 ? 'c' : side > 0 ? 'b' : 'w';
      const s = (g.size * R) / SPR;
      const rot = a + Math.PI / 2;
      const c = Math.cos(rot) * s, n = Math.sin(rot) * s;
      ctx.setTransform(c * DPR, n * DPR, -n * DPR, c * DPR, x * DPR, y * DPR);
      ctx.globalAlpha = g.alpha * (0.25 + 0.75 * e);
      ctx.drawImage(sprites[color + g.d], -SPR / 2, -SPR / 2);
    }
    ctx.globalAlpha = 1;
    if (!introDone && time > 2.4) introDone = true;
  }

  function loop(now) {
    draw(now);
    raf = visible && !reduce ? requestAnimationFrame(loop) : 0;
  }

  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  }
  function onLeave() { pointer.x = pointer.y = -1e4; }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !t0) t0 = performance.now();
    if (visible && !raf) raf = requestAnimationFrame(loop);
  });
  const ro = new ResizeObserver(resize);

  const ready = (document.fonts?.load('700 64px Heebo') ?? Promise.resolve()).catch(() => {}).then(() => {
    if (!sprites) buildSprites();
    build();
    ro.observe(canvas);
    io.observe(canvas);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerleave', onLeave);
    addEventListener('touchend', onLeave, { passive: true });
  });

  return {
    ready,
    // open (or close) the keyhole: radians of the bottom gap
    setGap(g) {
      targetGap = g;
      if (reduce) { curGap = g; draw(performance.now()); return; }
      if (!raf && visible) raf = requestAnimationFrame(loop);
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
