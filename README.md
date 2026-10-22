# Cipher Security Academy — parents' page and teen's page

The landing page for the Cipher Security Academy launch: preparation for the
IDF technology units, taught by the researchers of Cipher Security Labs.
Hebrew, right-to-left, mobile first.

- `index.html` — the parents' page. The story is told by its headlines alone:
  an active cyber company opens an academy → everyone arrives with the same
  preparation → defend, attack, and research → what Nir found in HP's software
  → Nir teaches your kid → 30 sessions, never alone → not everyone gets in, and
  the price → now it's their turn → the fit check.
- `kid/` — the page a parent sends to their teen: who teaches, the challenge,
  and a button that tells the parent "I'm in".

Static files only: no framework and no build step. Every URL is relative, so
the folder works at a domain root or under a path such as `/8200/`.

## Run it

```bash
node tools/serve.mjs          # http://localhost:8137 — and http://<this-mac's-ip>:8137 from a phone on the same Wi-Fi
```

## Change things

| What | Where |
|---|---|
| Copy | `index.html`, `kid/index.html` |
| Dates, price, seats, links, data endpoints | `assets/js/config.js` |
| Every factual claim and its source | `docs/facts.md` — check it before changing a claim |
| Wiring leads, shares, events and the challenge | `docs/integration.md` |
| Colours and type | the tokens at the top of `assets/css/site.css` |

## Before launch

- Get written confirmation for the two CyCube claims — that its labs serve
  Technion students and train Bank of Israel cyber staff. Details in `docs/facts.md`.
- Make the `og:image` URLs in both pages absolute (`https://your-domain/…`).
  WhatsApp and Facebook only show the preview card from a full URL, and
  sharing over WhatsApp is the main way this page travels.
- Fill in the endpoints in `assets/js/config.js` (see `docs/integration.md`).
  Until then nothing leaves the browser, and a submitted lead is kept locally
  so a demo still completes.
- Add the Meta pixel snippet if you want it. The page sends `Lead` and three
  custom events to it automatically when it is present.
- Preview cards are rendered by `node tools/og.mjs` from `tools/og.html`.

## How it is built

- `assets/js/vortex.js` — the logo's ring of 0/1 digits as a live canvas
  field. It assembles on load, moves out of the way of a finger, and comes back
  at the end of the page with its keyhole opening.
- `assets/js/layers.js` — the system taken apart: defend / attack / research.
- `assets/js/quiz.js` — the four-question fit check and the lead form.
- `assets/js/track.js`, `share.js` — the data layer and personal share links.
- `assets/js/main.js`, `kid.js` — each page's wiring; `motion.js` — shared motion.
- GSAP, ScrollTrigger and Lenis are vendored in `assets/vendor/`; fonts are
  Heebo and JetBrains Mono from Google Fonts.

Respects `prefers-reduced-motion` (everything shown, nothing moves) and reads
completely with JavaScript off.

## Check it

```bash
npm install                   # playwright, for the checks only
npm test                      # every interaction + the data layer, reduced motion, no-JS
npm run shots                 # phone screenshots chapter by chapter + page length in screens
```

Headless WebKit draws 3D transforms flat, so the defend/attack/research
chapter is only meaningful in the Chromium shots or on a real phone.
