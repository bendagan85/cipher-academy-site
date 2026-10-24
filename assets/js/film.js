// The film lives in the mark's keyhole. Once the digits have landed, a muted
// teaser loops inside it (browsers only start a video on their own without
// sound). A tap grows it into a player with sound while the digits fly out;
// closing brings everything home. The light behind the mark takes the film's
// colour, as if it shone from inside.
import { CONFIG } from './config.js';
import { track } from './track.js';
import { reduce } from './motion.js';

// the circle and the slot under it, in the frame's own px
function keyhole({ r, slot, bottom }) {
  const y = (r + Math.sqrt(r * r - slot * slot)).toFixed(1), h = (r + bottom).toFixed(1);
  return `path("M ${(r - slot).toFixed(1)} ${h} L ${(r - slot).toFixed(1)} ${y} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 1 ${(r + slot).toFixed(1)} ${y} L ${(r + slot).toFixed(1)} ${h} Z")`;
}

export function mountFilm(root, vortex) {
  const { gsap } = window;
  const cfg = CONFIG.film || {};
  const frame = root.querySelector('.film__frame');
  const video = root.querySelector('.film__video');
  const veil = root.querySelector('.film__veil');
  const shut = root.querySelector('.film__x');
  const note = root.querySelector('.film__note');
  const [from, to] = cfg.teaser || [0, 8];
  let state = 'idle', geo = null, sampler = 0, onScreen = true, opener = null;

  vortex.onResize(() => {
    geo = vortex.geometry();
    const vars = { cx: geo.cx, cy: geo.cy, r: geo.r, slot: geo.slot, bottom: geo.bottom, top: geo.top, base: geo.base, half: geo.half };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(`--${k}`, `${v.toFixed(1)}px`);
    if (state !== 'open') frame.style.clipPath = keyhole(geo);
  });

  /* ── the light: sample the picture a few times a second ─────────────── */
  const probe = Object.assign(document.createElement('canvas'), { width: 6, height: 4 });
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  function sample() {
    const src = video.readyState >= 2 && !video.paused ? video : frame.querySelector('.film__still');
    if (!src) return;
    try {
      pctx.drawImage(src, 0, 0, 6, 4);
      const d = pctx.getImageData(0, 0, 6, 4).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      // lift the colour so a dark frame still glows, and keep it from washing out
      const k = 255 / Math.max(r / n, g / n, b / n, 60);
      vortex.setGlow([Math.min(255, (r / n) * k), Math.min(255, (g / n) * k), Math.min(255, (b / n) * k)], 0.26);
    } catch { /* a cross-origin film without CORS: keep the blue */ }
  }
  function light(on) {
    clearInterval(sampler);
    if (on && !reduce) { sample(); sampler = setInterval(sample, 280); }
    if (!on) vortex.setGlow(null);
  }

  /* ── the teaser ─────────────────────────────────────────────────────── */
  function loopTeaser() {
    if (state === 'teaser' && video.currentTime >= to) video.currentTime = from;
  }
  async function teaser() {
    state = 'teaser';
    root.dataset.state = 'teaser';
    if (!cfg.src || reduce) { light(true); return; }
    if (!video.src) video.src = cfg.src;
    video.muted = true;
    video.controls = false;
    try {
      if (video.currentTime < from || video.currentTime > to) video.currentTime = from;
      await video.play();
      root.dataset.playing = '';
    } catch { /* autoplay refused (low power, data saver): the still stays */ }
    light(true);
  }

  root.dataset.film = cfg.src ? 'on' : 'off';

  // iris in, once the last digit lands
  vortex.assembled.then(() => {
    if (reduce) { gsap.set(root.querySelectorAll('.film__frame, .film__q, .film__cta'), { opacity: 1, scale: 1 }); teaser(); return; }
    gsap.fromTo(frame, { opacity: 0, scale: 0.35 }, {
      opacity: 1, scale: 1, duration: 1.2, ease: 'expo.out',
      transformOrigin: () => `${geo.r}px ${geo.r}px`,
    });
    gsap.fromTo(root.querySelectorAll('.film__q, .film__cta'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.15, delay: 0.35, ease: 'power3.out' });
    teaser();
  });

  // no film running while nobody can see it
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (state !== 'teaser') return;
    if (onScreen) { if (cfg.src && !reduce) video.play().catch(() => {}); light(true); } else { video.pause(); light(false); }
  }, { threshold: 0.15 }).observe(frame);

  /* ── open: the keyhole becomes the screen ───────────────────────────── */
  function target() {
    const ar = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
    const vw = innerWidth, vh = innerHeight;
    let w = Math.min(vw < 700 ? vw : vw * 0.84, 1180), h = w / ar;
    if (h > vh * 0.82) { h = vh * 0.82; w = h * ar; }
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  }

  async function open(source) {
    if (state === 'open' || !geo) return;
    if (!cfg.src) return;
    opener = document.activeElement;
    state = 'open';
    root.dataset.state = 'open';
    track('film_open', { source });
    window.__lenis?.stop();
    document.documentElement.classList.add('is-locked');

    const start = frame.getBoundingClientRect();
    const end = target();
    const iris = { r: geo.r, x: geo.r, y: geo.r };
    gsap.killTweensOf(frame);
    gsap.set(frame, { position: 'fixed', left: start.left, top: start.top, width: start.width, height: start.height, scale: 1, opacity: 1, zIndex: 61, margin: 0 });
    frame.style.clipPath = `circle(${iris.r}px at ${iris.x}px ${iris.y}px)`;
    veil.hidden = false;
    shut.hidden = false;
    if (note) note.hidden = !cfg.placeholder;

    video.pause();
    video.currentTime = 0;
    video.muted = false;
    video.controls = true;
    video.play().catch(() => {});
    light(true);

    const d = reduce ? 0 : 1;
    vortex.scatter(true, 900 * d);
    gsap.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.5 * d });
    gsap.to(frame, { ...end, duration: 0.95 * d, ease: 'expo.inOut' });
    await gsap.to(iris, {
      r: Math.hypot(end.width, end.height) / 2 + 4, x: end.width / 2, y: end.height / 2,
      duration: 0.95 * d, ease: 'expo.inOut',
      onUpdate: () => { frame.style.clipPath = `circle(${iris.r}px at ${iris.x}px ${iris.y}px)`; },
    });
    frame.style.clipPath = 'none';
    frame.classList.add('is-open');
    gsap.fromTo(shut, { opacity: 0 }, { opacity: 1, duration: 0.3 * d });
    shut.focus({ preventScroll: true });
  }

  async function close() {
    if (state !== 'open') return;
    state = 'closing';
    track('film_close', { at: Math.round(video.currentTime) });
    const d = reduce ? 0 : 1;
    video.pause();
    video.controls = false;
    video.muted = true;
    frame.classList.remove('is-open');
    const box = frame.getBoundingClientRect();
    const iris = { r: Math.hypot(box.width, box.height) / 2 + 4, x: box.width / 2, y: box.height / 2 };
    // where the keyhole is now, in the viewport
    const home = root.getBoundingClientRect();
    const back = { left: home.left + geo.cx - geo.r, top: home.top + geo.cy - geo.r, width: geo.r * 2, height: geo.r + geo.bottom };
    gsap.to(shut, { opacity: 0, duration: 0.2 * d });
    gsap.to(veil, { opacity: 0, duration: 0.6 * d, delay: 0.3 * d });
    vortex.scatter(false, 1000 * d);
    gsap.to(frame, { ...back, duration: 0.85 * d, ease: 'expo.inOut' });
    await gsap.to(iris, {
      r: geo.r, x: geo.r, y: geo.r, duration: 0.85 * d, ease: 'expo.inOut',
      onUpdate: () => { frame.style.clipPath = `circle(${iris.r}px at ${iris.x}px ${iris.y}px)`; },
    });
    gsap.set(frame, { clearProps: 'position,left,top,width,height,zIndex,margin' });
    frame.style.clipPath = keyhole(geo);
    veil.hidden = true;
    shut.hidden = true;
    document.documentElement.classList.remove('is-locked');
    window.__lenis?.start();
    opener?.focus?.({ preventScroll: true });
    teaser();
  }

  root.addEventListener('click', (e) => {
    const o = e.target.closest('[data-film-open]');
    if (o) { open(o.dataset.filmOpen || 'mark'); return; }
    if (e.target.closest('.film__x') || e.target === veil) close();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  video.addEventListener('timeupdate', loopTeaser);
  video.addEventListener('ended', () => { if (state === 'open') track('film_complete'); });
  video.addEventListener('play', () => { if (state === 'open') track('film_play'); });

  return { open, close, get state() { return state; } };
}
