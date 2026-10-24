# Cipher Security Academy — parents' page, teen's page, thank-you page

The landing funnel for the Cipher Security Academy launch: preparation for
the IDF technology units, taught by the researchers of Cipher Security Labs.
Hebrew, right-to-left, mobile first.

- `index.html` — the parents' page. The story is told by its headlines alone:
  an active cyber company opens an academy → everyone arrives with the same
  preparation → defend, attack, and research → what Nir found in HP's
  software, and what the press wrote about it → Nir teaches your kid → 30
  sessions and the CyCube labs → not everyone gets in, and the price → now
  it's their turn: the challenge → the fit check.
- `kid/` — the page a parent sends to their teen: who sent this, what's
  different about Cipher, who teaches, the program in brief, a self-check,
  the challenge itself, and a button that tells the parent "I'm in".
- `thanks/` — where the fit check sends a parent after they submit: the
  diagnosis their answers earned, who's behind the program, what happens
  next, and reminders to send the challenge to their kid if they haven't yet.

Static files only: no framework and no build step. Every URL is relative, so
the folder works at a domain root or under a path such as `/8200/`.

## Run it

```bash
node tools/serve.mjs          # http://localhost:8137 — and http://<this-mac's-ip>:8137 from a phone on the same Wi-Fi
```

## Change things

| What | Where |
|---|---|
| Copy | `index.html`, `kid/index.html`, `thanks/index.html` |
| Dates, price, seats, links, the film, data endpoints, the challenge | `assets/js/config.js` |
| Every factual claim and its source | `docs/facts.md` — check it before changing a claim |
| Wiring leads, shares, events and the challenge | `docs/integration.md` |
| The six diagnosis segments (fit-check CTA + thank-you copy) | `assets/js/diagnosis.js` |
| Colours and type | the tokens at the top of `assets/css/site.css` |

## Before launch

- **The challenge.** `CONFIG.challenge` ships empty (`target: null, hints: []`).
  Fill it in from the current site's challenge config — same target, same
  hints, same acceptance rule — or both pages keep sending teens to the live
  challenge instead. Details in `docs/integration.md`.
- **The film.** The hero's keyhole currently plays a placeholder built from
  Nir's photo (`assets/video/film-placeholder.mp4`), and the open player says
  so. Swap in the real film, point `CONFIG.film.src` at it, and set
  `placeholder: false`.
- Get written confirmation for the two CyCube claims — that its labs serve
  Technion students and train Bank of Israel cyber staff. (Already confirmed
  by email per the brother's 2026-10-24 note — details in `docs/facts.md`.)
- The `og:image`/`og:url` tags on `index.html` and `kid/` are already absolute,
  pointing at `https://ciphersecurity.co.il/8200/…` (the confirmed launch
  domain). If the real domain ends up different, update those two pages —
  WhatsApp and Facebook only show the preview card from a full URL, and
  sharing over WhatsApp is the main way these pages travel.
- Fill in the endpoints in `assets/js/config.js` (see `docs/integration.md`).
  Until then nothing leaves the browser, and a submitted lead is kept locally
  so a demo still completes.
- Add the Meta pixel snippet if you want it. The page sends `Lead` and three
  custom events to it automatically when it is present.
- Preview cards are rendered by `node tools/og.mjs` from `tools/og.html`.

## How it is built

- `assets/js/mark-layout.js` — the Cipher mark, measured digit by digit from
  the brand's own logo file (not approximated) — see the comment at its top.
- `assets/js/vortex.js` — the mark as a live canvas field of 0/1 glyphs. It
  assembles on load, moves out of the way of a finger, can scatter outward
  (`scatter(true)`) and come home, and opens a keyhole (`setOpen(0..1)`).
- `assets/js/film.js` — the film that plays inside the keyhole: a muted
  teaser on load, a full-screen player with sound on tap.
- `assets/js/challenge.js` — the challenge, shared by both pages: the mark
  guards it, a tap scatters the digits and opens the panel.
- `assets/js/layers.js` — the system taken apart: defend / attack / research.
- `assets/js/gates.js` — the four-gate admission flow animation.
- `assets/js/quiz.js` — the four-question fit check; `diagnosis.js` turns the
  answers into one of six segments, used for the quiz's own CTA and reused on
  the thank-you page.
- `assets/js/track.js`, `share.js` — the data layer and personal share links.
- `assets/js/main.js`, `kid.js`, `thanks.js` — each page's wiring;
  `motion.js` — shared motion.
- GSAP, ScrollTrigger and Lenis are vendored in `assets/vendor/`; fonts are
  Heebo, JetBrains Mono and Saira (the mark's digits only) from Google Fonts.

Respects `prefers-reduced-motion` (everything shown, nothing moves) and reads
completely with JavaScript off.

## Check it

```bash
npm install                   # playwright, for the checks only
npm test                      # every interaction + the data layer, reduced motion, no-JS, all three pages
npm run shots                 # phone screenshots chapter by chapter + page length in screens
```

Headless WebKit draws 3D transforms flat, so the defend/attack/research
chapter is only meaningful in the Chromium shots or on a real phone.
