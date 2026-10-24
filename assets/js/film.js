// The film lives inside the mark. Once the rings have clicked into place the
// keyhole opens like a lens aperture — the digits step outward, the camera
// moves in — and a muted loop plays in the window, framed by the breathing
// ring. A tap sends the digits flying, and the window grows into a player
// with sound; closing brings everything home.
//
// Browsers only start a video on their own without sound, and not at all in
// low-power or data-saver modes: then the window shows the poster and a play
// button instead, and nothing is downloaded until someone asks for it.
import { CONFIG } from './config.js';
import { track } from './track.js';
import { reduce } from './motion.js';

// a keyhole: a circle of radius r around (x, y), and a slot of half-width s down to y = b
function keyhole(x, y, r, s, b) {
  s = Math.min(s, r * 0.95);
  const shoulder = y + Math.sqrt(r * r - s * s);
  const f = (n) => n.toFixed(1);
  const end = f(Math.max(b, shoulder));
  return `path("M ${f(x - s)} ${end} L ${f(x - s)} ${f(shoulder)} A ${f(r)} ${f(r)} 0 1 1 ${f(x + s)} ${f(shoulder)} L ${f(x + s)} ${end} Z")`;
}

const conn = navigator.connection;
const lean = Boolean(conn?.saveData) || /(^|-)2g$/.test(conn?.effectiveType || '');

export function mountFilm(root, vortex) {
  const { gsap } = window;
  const cfg = CONFIG.film || {};
  const frame = root.querySelector('.film__frame');
  const video = root.querySelector('.film__video');
  const still = root.querySelector('.film__still');
  const sound = root.querySelector('.film__sound');
  const veil = root.querySelector('.film__veil');
  const shut = root.querySelector('.film__x');
  const note = root.querySelector('.film__note');
  const fades = [...document.querySelectorAll('[data-film-fade]')];

  // no film yet: the mark stays a closed mark, and nothing talks about a film
  document.documentElement.dataset.film = cfg.src ? 'on' : 'off';
  if (!cfg.src) return { open() {}, close() {}, state: 'off' };

  // the muted loop: its own small file, or a stretch of the film itself
  const teaserSrc = typeof cfg.teaser === 'string' ? cfg.teaser : cfg.src;
  const [from, to] = Array.isArray(cfg.teaser) ? cfg.teaser : [0, Infinity];
  const autoplay = !reduce && !lean;

  let state = 'idle', onScreen = true, opener = null, box = null;
  const ap = { v: 0 };

  /* ── the window: sized for the open keyhole, clipped to the current one ── */
  function place() {
    const g = vortex.geometry();
    const full = vortex.hole(1);
    box = { left: g.cx - full.r, top: g.cy - full.r, width: full.r * 2, height: full.r + full.bottom, r: full.r };
    if (state === 'open' || state === 'closing' || state === 'opening-full') return;
    Object.assign(frame.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    root.style.setProperty('--r1', `${full.r.toFixed(1)}px`);
    root.style.setProperty('--cx', `${g.cx.toFixed(1)}px`);
    root.style.setProperty('--cy', `${g.cy.toFixed(1)}px`);
    clip();
  }
  function clip() {
    const h = vortex.hole(ap.v);
    frame.style.clipPath = keyhole(box.r, box.r, h.r, h.slot, box.r + h.bottom);
    root.style.setProperty('--r', `${h.r.toFixed(1)}px`);
  }
  vortex.onResize(place);

  /* ── the loop inside the mark ─────────────────────────────────────────── */
  function playing(on) {
    if (on) root.dataset.playing = ''; else delete root.dataset.playing;
    sound.dataset.icon = on || autoplay ? 'sound' : 'play';
  }
  video.addEventListener('playing', () => { if (state !== 'idle') playing(true); });
  video.addEventListener('pause', () => { if (state === 'teaser') playing(false); });

  async function teaser() {
    state = 'teaser';
    root.dataset.state = 'teaser';
    if (!autoplay || !onScreen || document.hidden) { playing(false); return; }
    if (video.getAttribute('src') !== teaserSrc) video.src = teaserSrc;
    video.muted = true;
    video.controls = false;
    video.loop = !Array.isArray(cfg.teaser);
    try {
      if (video.currentTime < from || video.currentTime > to) video.currentTime = from;
      await video.play();
    } catch { playing(false); /* refused (low power): the poster and a play button stay */ }
  }
  video.addEventListener('timeupdate', () => {
    if (state === 'teaser' && video.currentTime >= to) video.currentTime = from;
  });

  // once the last ring clicks in, the keyhole opens and the film starts in it
  sound.dataset.icon = autoplay ? 'sound' : 'play';
  vortex.assembled.then(() => {
    // opened full screen before the intro ended: the keyhole is open already,
    // and close() hands the film back to the loop
    if (state !== 'idle') { gsap.set(fades, { opacity: 1, y: 0 }); return; }
    if (reduce) {
      ap.v = 1; vortex.setOpen(1, true); clip();
      gsap.set([frame, ...fades], { opacity: 1 });
      teaser();
      return;
    }
    // start loading now, so the first frames are there when the window is wide enough to see them
    if (autoplay) { video.src = teaserSrc; video.muted = true; video.load(); }
    state = 'opening';
    root.dataset.state = 'opening';
    gsap.to(frame, { opacity: 1, duration: 0.6, delay: 0.25, ease: 'power2.out' });
    gsap.to(ap, {
      v: 1, duration: 1.6, delay: 0.2, ease: 'power3.inOut',
      onUpdate: () => { vortex.setOpen(ap.v, true); clip(); },
      onComplete: () => { if (state === 'opening') teaser(); },
    });
    if (autoplay) setTimeout(() => { if (state === 'opening') { video.play().catch(() => {}); } }, 900);
    gsap.fromTo(fades, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, delay: 1.1, ease: 'power3.out' });
  });

  // nothing plays while nobody can see it
  function wake() {
    if (state !== 'teaser') return;
    if (onScreen && !document.hidden) teaser(); else video.pause();
  }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; wake(); }, { threshold: 0.15 }).observe(frame);
  document.addEventListener('visibilitychange', () => {
    if (state === 'open' && document.hidden) video.pause();
    wake();
  });

  /* ── open: the keyhole becomes the screen ─────────────────────────────── */
  function target() {
    const ar = cfg.aspect || (video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9);
    const vw = innerWidth, vh = innerHeight;
    let w = Math.min(vw < 700 ? vw : vw * 0.84, 1180), h = w / ar;
    if (h > vh * (vw < 700 ? 0.9 : 0.82)) { h = vh * (vw < 700 ? 0.9 : 0.82); w = h * ar; }
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  }

  async function open(source) {
    if (!['idle', 'teaser', 'opening'].includes(state) || !box) return;
    // tapped before the keyhole finished opening: finish it at once
    gsap.killTweensOf(ap);
    if (ap.v < 1) { ap.v = 1; vortex.setOpen(1, true); clip(); }
    opener = document.activeElement;
    state = 'opening-full';
    root.dataset.state = 'open';
    track('film_open', { source });
    window.__lenis?.stop();
    document.documentElement.classList.add('is-locked');

    const start = frame.getBoundingClientRect();
    const h = vortex.hole(1);
    const k = { x: box.r, y: box.r, r: h.r, s: h.slot, b: box.r + h.bottom };
    gsap.killTweensOf(frame);
    gsap.set(frame, { position: 'fixed', left: start.left, top: start.top, width: start.width, height: start.height, opacity: 1, zIndex: 61, margin: 0 });
    veil.hidden = false;
    shut.hidden = false;
    if (note) note.hidden = !cfg.placeholder;

    // the whole film, from the start, with sound
    if (video.getAttribute('src') !== cfg.src) video.src = cfg.src;
    video.loop = false;
    video.muted = false;
    try { video.currentTime = 0; } catch { /* not loaded yet: it starts at 0 anyway */ }
    video.play().catch(() => { video.controls = true; });

    const end = target();
    const d = reduce ? 0 : 1;
    vortex.scatter(true, 900 * d);
    gsap.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.5 * d });
    gsap.to(frame, { ...end, duration: 0.95 * d, ease: 'expo.inOut' });
    await gsap.to(k, {
      x: end.width / 2, y: end.height / 2, r: Math.hypot(end.width, end.height) / 2 + 4, s: 0, b: end.height,
      duration: 0.95 * d, ease: 'expo.inOut',
      onUpdate: () => { frame.style.clipPath = keyhole(k.x, k.y, k.r, k.s, k.b); },
    });
    frame.style.clipPath = 'none';
    frame.classList.add('is-open');
    video.controls = true;
    state = 'open';
    gsap.fromTo(shut, { opacity: 0 }, { opacity: 1, duration: 0.3 * d });
    shut.focus({ preventScroll: true });
  }

  async function close() {
    if (state !== 'open') return;
    state = 'closing';
    track('film_close', { at: Math.round(video.currentTime || 0) });
    const d = reduce ? 0 : 1;
    video.pause();
    video.controls = false;
    video.muted = true;
    frame.classList.remove('is-open');
    const now = frame.getBoundingClientRect();
    const k = { x: now.width / 2, y: now.height / 2, r: Math.hypot(now.width, now.height) / 2 + 4, s: 0, b: now.height };
    const home = root.getBoundingClientRect();
    const h = vortex.hole(1);
    gsap.to(shut, { opacity: 0, duration: 0.2 * d });
    gsap.to(veil, { opacity: 0, duration: 0.6 * d, delay: 0.3 * d });
    vortex.scatter(false, 1000 * d);
    gsap.to(frame, { left: home.left + box.left, top: home.top + box.top, width: box.width, height: box.height, duration: 0.85 * d, ease: 'expo.inOut' });
    await gsap.to(k, {
      x: box.r, y: box.r, r: h.r, s: h.slot, b: box.r + h.bottom, duration: 0.85 * d, ease: 'expo.inOut',
      onUpdate: () => { frame.style.clipPath = keyhole(k.x, k.y, k.r, k.s, k.b); },
    });
    gsap.set(frame, { clearProps: 'position,zIndex,margin' });
    state = 'teaser';
    place();
    veil.hidden = true;
    shut.hidden = true;
    document.documentElement.classList.remove('is-locked');
    window.__lenis?.start();
    opener?.focus?.({ preventScroll: true });
    // back to the loop, from where it was
    if (teaserSrc !== cfg.src) video.src = teaserSrc;
    teaser();
  }

  root.addEventListener('click', (e) => {
    const o = e.target.closest('[data-film-open]');
    if (o) { open(o.dataset.filmOpen || 'mark'); return; }
    if (e.target.closest('.film__x') || e.target === veil) close();
  });
  document.querySelectorAll('[data-film-open]').forEach((el) => {
    if (!root.contains(el)) el.addEventListener('click', () => open(el.dataset.filmOpen));
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  video.addEventListener('ended', () => { if (state === 'open') track('film_complete'); });
  video.addEventListener('play', () => { if (state === 'open' || state === 'opening-full') track('film_play'); });

  return { open, close, get state() { return state; } };
}
