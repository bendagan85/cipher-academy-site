// Nir arrives the way the brand speaks: as digits. His photo is first a field
// of 0s and 1s, each as bright as the patch of photo under it, flickering
// until the figure settles out of the noise. Then a scan runs down and the
// real photo resolves above it, line by line.
//
// The figure only hides its photo once this has run (class .is-coded), so a
// page where it never runs still shows him.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '600 {px}px "JetBrains Mono", ui-monospace, Menlo, monospace';
const LEVELS = 9;
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// dark digits lean brand blue, bright ones go to white
function tone(level) {
  const k = level / (LEVELS - 1);
  const r = Math.round(31 + (226 - 31) * k), g = Math.round(109 + (242 - 109) * k), b = 255;
  return `rgba(${r}, ${g}, ${b}, ${(0.1 + 0.9 * k ** 1.25).toFixed(3)})`;
}
const TONES = Array.from({ length: LEVELS }, (_, i) => tone(i));

export function createPortrait(figure, { onDone } = {}) {
  const img = figure.querySelector('img');
  if (reduce || !img) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'nir__digits';
  canvas.setAttribute('aria-hidden', 'true');
  figure.append(canvas);
  figure.classList.add('is-coded');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, fs = 9, cw = 6, ch = 9, cols = 0, rows = 0;
  let cells = [], state = 'wait', t0 = 0;

  // where object-fit: cover + object-position put the photo inside the box
  function crop() {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    return { s, x: (W - iw * s) * (pos[0] || 0.5), y: (H - ih * s) * (pos[1] ?? 0.5) };
  }

  function sample() {
    const r = figure.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return false;
    W = r.width; H = r.height;
    DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    fs = Math.min(10, Math.max(7, W / 52));
    cw = fs * 0.64; ch = fs * 0.98;
    cols = Math.floor(W / cw); rows = Math.floor(H / ch);
    // one pixel per cell: the browser averages the patch for us
    const off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    const c = crop();
    o.drawImage(img, c.x * cols / W, c.y * rows / H, img.naturalWidth * c.s * cols / W, img.naturalHeight * c.s * rows / H);
    const px = o.getImageData(0, 0, cols, rows).data;
    cells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        // lift the contrast a little: the photo is a dim room
        const v = smooth(0.08, 0.72, lum);
        cells.push({ x: (x + 0.5) * cw, y: (y + 0.5) * ch, v, rnd: Math.random(), ph: Math.random() * 6.28, sp: 4 + Math.random() * 9 });
      }
    }
    return true;
  }

  // k: how far the figure has settled out of the noise; scan: the resolved line in px
  function draw(now, k, scan) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = FONT.replace('{px}', fs.toFixed(1));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t = now / 1000;
    const buckets = Array.from({ length: LEVELS }, () => []);
    for (const c of cells) {
      if (c.y < scan - ch) continue;
      // just below the scan the digits flare, as if being read
      const read = scan > 0 ? Math.max(0, 1 - (c.y - scan) / (ch * 3)) : 0;
      const v = Math.min(1, (c.rnd * 0.55) * (1 - k) + c.v * k + read * 0.5);
      buckets[Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1)))].push(c);
    }
    buckets.forEach((list, level) => {
      if (!list.length || level === 0) return;
      ctx.fillStyle = TONES[level];
      // a settled digit still flips now and then; in the noise, all the time
      for (const c of list) ctx.fillText(Math.sin(t * c.sp * (1.3 - k) + c.ph) > 0 ? '1' : '0', c.x, c.y);
    });
    if (scan > 0 && scan < H) {
      const g = ctx.createLinearGradient(0, scan - 26, 0, scan + 2);
      g.addColorStop(0, 'rgba(56, 182, 255, 0)');
      g.addColorStop(1, 'rgba(56, 182, 255, .35)');
      ctx.fillStyle = g;
      ctx.fillRect(0, scan - 26, W, 28);
      ctx.fillStyle = 'rgba(190, 236, 255, .95)';
      ctx.fillRect(0, scan, W, 1.5);
    }
  }

  function frame(now) {
    if (state !== 'run') return;
    const e = (now - t0) / 1000;
    const k = smooth(0.1, 1.1, e);
    const p = ease(Math.min(1, Math.max(0, (e - 1.15) / 1.5)));
    const scan = p > 0 ? p * (H + 2) : 0;
    if (p > 0) Object.assign(img.style, { opacity: 1, clipPath: `inset(0 0 ${Math.max(0, H - scan).toFixed(1)}px 0)` });
    draw(now, k, scan);
    if (p < 1) { requestAnimationFrame(frame); return; }
    state = 'done';
    figure.classList.remove('is-coded');
    Object.assign(img.style, { opacity: '', clipPath: '' });
    canvas.remove();
    onDone?.();
  }

  const ready = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
  Promise.all([ready, document.fonts?.ready]).then(() => {
    if (state !== 'wait' || !sample()) return;
    draw(performance.now(), 0.35, 0);
  });
  new ResizeObserver(() => {
    if (state === 'wait' && sample()) draw(performance.now(), 0.35, 0);
  }).observe(figure);

  // the first time he's mostly on screen
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    Promise.all([ready, document.fonts?.ready]).then(() => {
      if (!cells.length && !sample()) { figure.classList.remove('is-coded'); canvas.remove(); return; }
      state = 'run';
      t0 = performance.now();
      requestAnimationFrame(frame);
    });
  }, { threshold: 0.55 });
  io.observe(figure);
}
