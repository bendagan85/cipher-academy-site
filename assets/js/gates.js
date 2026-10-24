// The admission path, drawn as four gates that applicants flow through, right
// to left the way the page reads. Many start; fewer pass each gate; the few
// that clear the last one turn blue. An illustration of "not everyone gets
// in" — no numbers are implied.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// how far each applicant gets: 1 = stops at the first gate … 4 = accepted
const FATES = [[1, 0.4], [2, 0.26], [3, 0.19], [4, 0.15]];
function fate() {
  let r = Math.random();
  for (const [n, p] of FATES) { if ((r -= p) <= 0) return n; }
  return 4;
}

export function createGates(canvas, steps) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, raf = 0, visible = false, last = 0, spawn = 0;
  const parts = [];
  const lit = [0, 0, 0, 0];

  // gate i sits at the left edge of station i (stations run right to left)
  const gx = (i) => W - (W / 4) * (i + 1) + 6;

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    if (reduce) still();
  }

  function add(x) {
    const f = fate();
    parts.push({ x, y: H / 2 + (Math.random() - 0.5) * H * 0.62, f, gate: 0, v: W / (4.2 + Math.random() * 1.6), dying: 0, lane: (Math.random() - 0.5) });
  }

  function draw(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // the gates
    for (let i = 0; i < 4; i++) {
      lit[i] = Math.max(0, lit[i] - dt * 1.6);
      const x = gx(i);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      const a = 0.18 + lit[i] * 0.6;
      g.addColorStop(0, `rgba(160, 196, 255, 0)`);
      g.addColorStop(0.5, i === 3 ? `rgba(56, 182, 255, ${a + 0.15})` : `rgba(160, 196, 255, ${a})`);
      g.addColorStop(1, `rgba(160, 196, 255, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - 0.75, 0, 1.5, H);
    }
    // the applicants
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      p.x -= p.v * dt;
      // the field narrows after every gate: fewer, closer together
      const spread = H * 0.62 * Math.pow(0.62, p.gate);
      p.y += ((H / 2 + p.lane * spread) - p.y) * Math.min(1, dt * 2.2);
      if (!p.dying && p.gate < 4 && p.x <= gx(p.gate)) {
        if (p.f === p.gate + 1 && p.f < 4) p.dying = 0.001;
        else { lit[p.gate] = 1; p.gate++; }
      }
      if (p.dying) { p.dying += dt; p.v *= 0.9; p.y += dt * 22; }
      const alpha = p.dying ? Math.max(0, 0.75 - p.dying * 1.4) : 0.75;
      if (alpha <= 0 || p.x < -6) { parts.splice(k, 1); continue; }
      const done = p.gate >= 4;
      ctx.globalAlpha = done ? 1 : alpha;
      ctx.fillStyle = done ? '#38b6ff' : '#eef1f6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, done ? 2.6 : 1.8, 0, Math.PI * 2);
      ctx.fill();
      if (done) {
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    steps?.forEach((el, i) => el.classList.toggle('is-lit', lit[i] > 0.35));
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    spawn -= dt;
    if (spawn <= 0) { add(W + 4); spawn = 0.16 + Math.random() * 0.12; }
    draw(dt);
    raf = visible ? requestAnimationFrame(loop) : 0;
    if (!raf) last = 0;
  }

  // reduced motion: one frozen frame of the same idea
  function still() {
    parts.length = 0;
    for (let i = 0; i < 46; i++) {
      const x = W - Math.random() * W;
      const p = { x, y: 0, f: fate(), gate: 0, v: 0, dying: 0, lane: Math.random() - 0.5 };
      while (p.gate < 4 && x <= gx(p.gate) && p.f > p.gate + 1) p.gate++;
      if (p.gate < 4 && x <= gx(p.gate)) continue;
      p.y = H / 2 + p.lane * H * 0.62 * Math.pow(0.62, p.gate);
      parts.push(p);
    }
    draw(0);
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !reduce && !raf) {
      // start mid-stream, not from an empty pipe
      if (!parts.length) for (let i = 0; i < 24; i++) add(W - Math.random() * W * 0.5);
      raf = requestAnimationFrame(loop);
    }
  }).observe(canvas);
}
