// The admission path as a funnel of digits. Applicants fall in at the top,
// pass the line under each stage or bounce off it, and the few who clear the
// last one take a seat: fifteen of them, then the cohort is full and the
// stream stops. An illustration of "not everyone gets in" — the odds at each
// line are not data, and nothing on the page says they are.
//
// The lines sit exactly under the stage names in the list beside the canvas,
// so a line lighting up and its stage lighting up are one event.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '500 {px}px "JetBrains Mono", ui-monospace, Menlo, monospace';
const SEATS = 15, COLS = 5;
// the chance of being stopped at the line under stage i
const STOP = [0.4, 0.3, 0.25, 0.25];
const rnd = (a, b) => a + Math.random() * (b - a);

export function createGates(canvas, steps) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, raf = 0, visible = false, last = 0, spawn = 0, fs = 11;
  let lines = [], seatBox = null, taken = 0, full = 0, stopped = false, t = 0;
  const parts = [];
  const lit = [0, 0, 0, 0];
  const seatLit = new Float32Array(SEATS);

  // the funnel's half-width at height y: wide at the top, narrow at the seats
  const half = (y) => {
    const top = W * 0.46, bottom = seatBox ? seatBox.w / 2 + 6 : W * 0.2;
    const k = Math.min(1, Math.max(0, y / (lines[lines.length - 1] || H)));
    return top + (bottom - top) * k;
  };

  function measure() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    fs = Math.max(11, Math.min(14, W / 11));
    // under each stage: the bottom edge of its row in the list
    lines = steps.map((li) => li.getBoundingClientRect().bottom - r.top);
    const cell = Math.min(13, (W * 0.56) / COLS - 3), gap = 3;
    const w = COLS * cell + (COLS - 1) * gap, h = 3 * cell + 2 * gap;
    seatBox = { x: W / 2 - w / 2, y: Math.min(H - h - 4, lines[3] + 12), w, h, cell, gap };
    if (reduce) still(); else draw(0);
  }

  function seat(i) {
    const c = i % COLS, r = Math.floor(i / COLS), { x, y, cell, gap } = seatBox;
    // seats fill from the right, the way the page reads
    return { x: x + seatBox.w - (c + 1) * cell - c * gap + cell / 2, y: y + r * (cell + gap) + cell / 2 };
  }

  function add(y = -8) {
    parts.push({ x: W / 2 + rnd(-0.85, 0.85) * half(Math.max(0, y)), y, vy: rnd(70, 100), vx: 0, d: Math.random() < 0.5 ? '0' : '1', stage: 0, out: 0, target: -1, glow: 0 });
  }

  function draw(dt) {
    t += dt;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!lines.length) return;

    // the funnel walls, faint
    ctx.strokeStyle = 'rgba(160, 196, 255, .12)';
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let y = 0; y <= lines[3]; y += 6) {
        const x = W / 2 + side * half(y);
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // the lines under each stage
    for (let i = 0; i < 4; i++) {
      lit[i] = Math.max(0, lit[i] - dt * 1.4);
      const y = lines[i], w = half(y);
      const closed = i === 3 && full > 0;
      const a = 0.25 + lit[i] * 0.65;
      const g = ctx.createLinearGradient(W / 2 - w, 0, W / 2 + w, 0);
      const col = closed ? '255, 176, 32' : i === 3 ? '56, 182, 255' : '160, 196, 255';
      g.addColorStop(0, `rgba(${col}, 0)`);
      g.addColorStop(0.5, `rgba(${col}, ${a.toFixed(3)})`);
      g.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(W / 2 - w, y - 0.75, w * 2, 1.5);
    }

    // the applicants
    ctx.font = FONT.replace('{px}', fs.toFixed(1));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      if (p.target >= 0) {
        // into its seat
        const s = seat(p.target);
        p.x += (s.x - p.x) * Math.min(1, dt * 7);
        p.y += (s.y - p.y) * Math.min(1, dt * 7);
        if (Math.hypot(s.x - p.x, s.y - p.y) < 1.2) { seatLit[p.target] = 1; parts.splice(k, 1); continue; }
      } else {
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        if (!p.out) {
          // stay inside the funnel as it narrows
          const w = half(p.y) - 4;
          p.x += Math.max(-w, Math.min(w, p.x - W / 2)) + W / 2 - p.x;
          if (p.stage < 4 && p.y >= lines[p.stage]) {
            const shut = p.stage === 3 && full > 0;
            if (shut || Math.random() < STOP[p.stage]) {
              // bounced off the line: out over the wall, and gone
              p.out = 0.001; p.vy = -rnd(10, 30); p.vx = (p.x < W / 2 ? -1 : 1) * rnd(40, 80); p.y = lines[p.stage] - 1;
            } else {
              lit[p.stage] = 1;
              p.glow = 1;
              p.stage++;
              if (p.stage === 4) {
                if (taken < SEATS) { p.target = taken++; if (taken === SEATS) full = 0.001; } else p.out = 0.001;
              }
            }
          }
        } else {
          p.out += dt;
          p.vy += 140 * dt;
        }
      }
      p.glow = Math.max(0, p.glow - dt * 1.6);
      const alpha = p.out ? Math.max(0, 0.5 - p.out * 0.7) : 0.45 + p.stage * 0.13;
      if (alpha <= 0 || p.y > H + 10) { parts.splice(k, 1); continue; }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.out ? '#9aa3b2' : p.stage >= 3 || p.glow > 0.3 ? '#9fe0ff' : '#eef1f6';
      ctx.fillText(p.d, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // the seats
    if (full) full += dt;
    const { cell } = seatBox;
    for (let i = 0; i < SEATS; i++) {
      const s = seat(i);
      const on = seatLit[i];
      const breathe = full > 0 && !reduce ? 0.12 * Math.sin(t * 2 + i * 0.4) : 0;
      ctx.fillStyle = on ? `rgba(56, 182, 255, ${(0.75 + breathe).toFixed(3)})` : 'rgba(160, 196, 255, .1)';
      ctx.fillRect(s.x - cell / 2, s.y - cell / 2, cell, cell);
      if (on) {
        ctx.strokeStyle = 'rgba(190, 236, 255, .9)';
        ctx.strokeRect(s.x - cell / 2 + 0.5, s.y - cell / 2 + 0.5, cell - 1, cell - 1);
      } else {
        ctx.strokeStyle = 'rgba(160, 196, 255, .28)';
        ctx.strokeRect(s.x - cell / 2 + 0.5, s.y - cell / 2 + 0.5, cell - 1, cell - 1);
      }
    }
    // the cohort is full: one wave of light across the seats
    if (full > 0 && full < 1.6) {
      ctx.globalAlpha = Math.sin((full / 1.6) * Math.PI) * 0.5;
      ctx.shadowColor = 'rgba(56, 182, 255, .9)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(120, 210, 255, .6)';
      ctx.fillRect(seatBox.x - 3, seatBox.y - 3, seatBox.w + 6, seatBox.h + 6);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    steps.forEach((el, i) => el.classList.toggle('is-lit', lit[i] > 0.35));
    if (full > 0 && steps[3]) steps[3].classList.add('is-full');
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!stopped) {
      spawn -= dt;
      if (spawn <= 0) { add(); spawn = rnd(0.06, 0.1); }
      // once the cohort is full, the stream thins out and stops
      if (full > 2.5) stopped = true;
    }
    draw(dt);
    const idle = stopped && !parts.length;
    raf = visible && !(idle && full > 4) ? requestAnimationFrame(loop) : 0;
    if (!raf) last = 0;
  }

  // reduced motion: the outcome, still — a full cohort under the last line
  function still() {
    parts.length = 0;
    taken = SEATS; full = 3; seatLit.fill(1);
    for (let i = 0; i < 22; i++) {
      const y = rnd(0, lines[3] - 6);
      const stage = lines.findIndex((l) => y < l);
      parts.push({ x: W / 2 + rnd(-0.85, 0.85) * half(y), y, vy: 0, vx: 0, d: Math.random() < 0.5 ? '0' : '1', stage, out: 0, target: -1, glow: 0 });
    }
    draw(0);
  }

  new ResizeObserver(measure).observe(canvas);
  document.fonts?.ready?.then(measure);
  if (reduce) return;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) {
      // start with a few already falling, not from an empty funnel
      if (!parts.length && !taken) for (let i = 0; i < 10; i++) add(rnd(-8, lines[0] || 40));
      raf = requestAnimationFrame(loop);
    }
  }, { threshold: 0.35 }).observe(canvas);
}
