// Everyone arrives with the same preparation: a wall of identical zeros. As
// the chapter scrolls by, a scan line reads every one of them — all the same —
// until it reaches the one that reads 1. That one lights up and sinks below
// the others: the one who went deeper.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '500 {px}px "JetBrains Mono", ui-monospace, Menlo, monospace';
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createWall(canvas, { onOne } = {}) {
  const { ScrollTrigger } = window;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, cols = 18, rows = 8, cw = 0, ch = 0, sink = 0, fs = 14;
  let p = reduce ? 1 : 0, lit = false, raf = 0, visible = false;
  let one = { c: 0, r: 0 };
  const flick = new Float32Array(400);

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    W = r.width; H = r.height;
    DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    cols = W < 600 ? 18 : 36;
    rows = 8;
    cw = W / cols;
    sink = Math.min(90, H * 0.26);
    ch = (H - sink) / rows;
    fs = Math.min(cw * 0.82, ch * 0.78);
    // the one sits right of centre, low in the wall — where a reader's eye lands late
    one = { c: Math.round(cols * 0.36), r: 5 };
    draw(performance.now());
  }

  function draw(now) {
    if (!W) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = FONT.replace('{px}', fs.toFixed(1));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // the scan runs top to bottom over the first 60% of the chapter's passage
    const scan = smooth(0.05, 0.6, p) * (rows + 1.5) - 0.5;
    const after = smooth(0.42, 0.5, p);            // once the one is found, the rest go quiet
    const down = smooth(0.55, 0.95, p);            // and the one sinks
    if (!lit && scan >= one.r) { lit = true; onOne?.(); }
    if (lit && scan < one.r - 0.5 && !reduce) lit = false;

    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * ch;
      const near = Math.max(0, 1 - Math.abs(r - scan) / 1.2);
      for (let c = 0; c < cols; c++) {
        if (r === one.r && c === one.c && lit) continue;
        const i = r * cols + c;
        // a faint shimmer so the wall is alive even between scans
        const shimmer = reduce ? 0 : 0.05 * Math.max(0, Math.sin(now / 900 + flick[i]));
        const a = 0.16 + shimmer + near * 0.62 - after * 0.05;
        ctx.fillStyle = near > 0.5 ? `rgba(200, 230, 255, ${a.toFixed(3)})` : `rgba(238, 241, 246, ${a.toFixed(3)})`;
        ctx.fillText('0', W - (c + 0.5) * cw, y);
      }
    }

    // the scan line itself
    if (scan > -0.5 && scan < rows + 0.5 && !reduce) {
      const y = (scan + 0.5) * ch;
      const g = ctx.createLinearGradient(0, y - ch * 1.2, 0, y + ch * 0.3);
      g.addColorStop(0, 'rgba(56, 182, 255, 0)');
      g.addColorStop(0.8, 'rgba(56, 182, 255, .16)');
      g.addColorStop(1, 'rgba(120, 210, 255, .0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - ch * 1.2, W, ch * 1.5);
      ctx.fillStyle = 'rgba(140, 215, 255, .85)';
      ctx.fillRect(0, y, W, 1);
    }

    // the one
    if (lit) {
      const x = W - (one.c + 0.5) * cw;
      const y0 = (one.r + 0.5) * ch;
      const y = y0 + down * (sink + ch * (rows - one.r - 1));
      const pulse = reduce ? 1 : 0.85 + 0.15 * Math.sin(now / 420);
      if (down > 0.01) {
        const t = ctx.createLinearGradient(0, y0, 0, y);
        t.addColorStop(0, 'rgba(56, 182, 255, 0)');
        t.addColorStop(1, 'rgba(56, 182, 255, .55)');
        ctx.fillStyle = t;
        ctx.fillRect(x - 1, y0, 2, y - y0);
      }
      ctx.save();
      ctx.font = FONT.replace('{px}', (fs * (1.25 + 0.25 * down)).toFixed(1)).replace('500', '700');
      ctx.shadowColor = 'rgba(56, 182, 255, .95)';
      ctx.shadowBlur = 18 * pulse;
      ctx.fillStyle = '#9fe0ff';
      ctx.fillText('1', x, y);
      ctx.shadowBlur = 36 * pulse;
      ctx.globalAlpha = 0.6;
      ctx.fillText('1', x, y);
      ctx.restore();
    }
  }

  function loop(now) {
    draw(now);
    raf = visible ? requestAnimationFrame(loop) : 0;
  }

  for (let i = 0; i < flick.length; i++) flick[i] = Math.random() * 40;
  new ResizeObserver(resize).observe(canvas);
  document.fonts?.ready?.then(resize);
  if (reduce) { lit = true; return; }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }).observe(canvas);
  ScrollTrigger.create({
    trigger: canvas, start: 'top 92%', end: 'bottom 30%', scrub: 0.5,
    onUpdate: (st) => { p = st.progress; },
  });
}
