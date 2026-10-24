# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repo. Start with
`README.md` for the full picture; this file is the condensed, repo-specific
version — conventions and gotchas that aren't obvious from reading the code.

## What this is

The landing funnel for Cipher Security Academy: a parents' page
(`index.html`), a teen's page (`kid/`), and a thank-you page (`thanks/`)
shown after the fit-check form. Static HTML/CSS/JS, no framework, no build
step — every URL is relative so the folder works at a domain root or under a
path. Hebrew, right-to-left, mobile-first.

Three docs, read in this order before changing anything:
1. `README.md` — architecture, how to run and test it, before-launch checklist.
2. `docs/facts.md` — every factual claim on the pages and its source.
3. `docs/integration.md` — the data layer: events, the lead/share/challenge
   payloads, and the six-segment diagnosis the fit check produces.

## Hard rules

- **Never add a claim that isn't in `docs/facts.md`.** If a change needs a
  new fact (a number, a vendor name, a price), find a source and add it to
  `facts.md` first — don't invent or round up.
- **Never put the real challenge target, hints, or FLAG pattern in this
  repo.** `assets/js/config.js`'s `challenge` block ships empty on purpose
  (`target: null, hints: [], flagPattern: null`) — the business's developer
  fills it in directly from the live site's own config when they wire it up.
  Keep it that way in any future commit; it's a deliberate boundary, not an
  oversight. The same goes for anything that reads as exploit code or a
  working PoC — keep vulnerability/CTF content high-level in copy and code
  comments alike.
- **Code, comments, commit messages and docs are in English. UI copy is in
  Hebrew** (the buyer's language) — don't "fix" that.
- **No AI-slop UI**: no eyebrow/kicker labels, no decorative bars, no pill
  badges, no "01–05" numbering, no stat-tile rows. Say it at readable size in
  a sentence, or don't say it.

## Architecture notes an agent would otherwise rediscover the hard way

- **The mark is the brand.** `assets/js/mark-layout.js` holds every digit of
  the logo's 0/1 ring, measured from the brand's own 1254px file (position,
  size, rotation, colour) — not procedurally generated. `vortex.js` renders
  it and owns the only state that matters: assemble on first view, sway,
  scatter outward and return (`scatter(true/false)`), open a keyhole like an
  aperture (`setOpen(0..1)`), and — for the syllabus, where each ring is a
  tier — a camera and per-ring light (`setCamera`, `setLight`, `flash`). Six
  call sites reuse the same canvas component: the parents' hero, the
  syllabus, the challenge lock (`challenge.js`), the closing coda, the kid
  page hero and the thank-you page. Don't fork it — extend the shared
  module.
- **The challenge is one component, `assets/js/challenge.js`, used on both
  pages.** It renders live content only once `CONFIG.challenge` is filled
  in; otherwise it falls back to a link to the challenge on the current
  live site. Test both states.
- **The film plays inside the mark's keyhole** (`assets/js/film.js`): a
  muted teaser loop on load (autoplay-with-sound is blocked by every
  browser), full-screen with sound on tap. `CONFIG.film.src` is a
  placeholder built from a still photo until the business supplies real
  footage — `CONFIG.film.placeholder` gates a small on-screen note that says
  so. The keyhole only opens once the rings have assembled; a tap that lands
  during that intro must still open the player, and `film.js` guards for it
  (a regression here left the page veiled and scroll-locked).
- **The fit check never shows a score.** `assets/js/diagnosis.js` turns the
  four answers plus the prerequisite checklist into one of six segments
  (`ready / close / prep / check / parent / young`); the quiz's own CTA and
  the thank-you page's headline both read from the same table. Don't add a
  branch that skips the lead form for a "weak" segment — every segment
  collects details now, just worded differently (this was an explicit
  client correction from the first round).
- **`window.dataLayer` is reset by navigation.** The lead form redirects to
  `thanks/` on success; any test or script that reads events after that
  redirect is reading a different `window` and will see nothing before the
  redirect. Read events before triggering navigation, not after
  (`tools/flow-test.mjs` does this correctly — copy its pattern).
- **Headless WebKit flattens `transform-style: preserve-3d`.** The
  defend/attack/research exploded-layers chapter only renders in Chromium
  or on a real device; `tools/page-shots.mjs` defaults to Chromium for this
  reason.
- **RTL + `margin-inline-start: auto` is a trap.** It pushes an element
  toward the *visual left* (inline-end in RTL), not the right — this broke
  the desktop hero layout once already (the headline landed on top of the
  mark instead of beside it). Think in logical directions, verify with a
  screenshot, not just a read of the CSS.
- **`node tools/serve.mjs`, never `python -m http.server`** for local
  preview — Python's server resets connections on this project's ES module
  imports.
- **Scroll triggers go stale when content above them changes height** (the
  HP chapter's result tab, an opened FAQ answer, late fonts). Each page calls
  `remeasure()` from `motion.js`, which refreshes ScrollTrigger whenever the
  body's height changes; a new page needs the same call.
- **The global `img, svg, canvas { max-inline-size: 100% }` caps canvases
  that are meant to overhang** their box (the lock's field, the thank-you
  field). Give those `max-inline-size: none`, or the mark draws off-centre.
- **The hero is its own stacking context** (`isolation: isolate`), so the
  film's veil and close button can't rise above the header by z-index alone;
  `html.is-locked .hero { z-index: 40 }` lifts the whole hero while the film
  is open.
- **The syllabus is a tall track with a sticky stage**, and Playwright's own
  scroll-into-view overshoots inside it into the next tier. Scroll to the
  tier's hold and click through the DOM, as `tools/flow-test.mjs` does.
- **Check 320px.** No-wrap spans (`.nb`) and four-across rows that fit at
  360px overflow on the narrowest phones; the `max-width: 359px` rules exist
  for that reason.

## Before touching copy or facts

Re-read `docs/facts.md`'s "Do not state" section. It exists because specific
claims were explicitly rejected in review (unverifiable superlatives,
success percentages, any 8200 unit affiliation, career-outcome promises).
These aren't style preferences — treat them as hard constraints.

## Checking your work

```bash
npm install        # playwright, once
npm test            # tools/flow-test.mjs — every interaction, all 3 pages, data layer, reduced motion, no-JS
npm run shots        # tools/page-shots.mjs — phone screenshots + page length in screens, for the parents' page
```

For the other two pages: `node tools/page-shots.mjs http://localhost:8137/kid/ tools/out/kid chromium` /
`.../thanks/ tools/out/thanks chromium` (swap the URL and output dir).

A change isn't done until `npm test` passes and you've actually looked at
the resulting screenshots — several real bugs in this project (the RTL
margin trap above, a 3D stack that rendered flat, an invisible absolutely-
positioned element) were invisible in a code read and only caught by
screenshotting.

## Shipping

A push to `main` is a production deploy: `.github/workflows/deploy.yml` runs
the Vercel CLI against the business's Vercel project with the repository
secret `VERCEL_TOKEN`. Gate every push on `npm test`, never write the token
into a file, and keep `.vercelignore` in step when you add tooling or notes —
anything not listed there is served on the live site.

- **A private repo can't deploy.** The Vercel team is on Hobby, which
  blocks a private repository's commits from anyone but the team's owner:
  the deployment shows `BLOCKED` (`TEAM_ACCESS_REQUIRED`) and the workflow
  hangs waiting on it. The repo's owner keeps it private and makes it public
  only for the length of a deploy. README's "Deploy" section has the steps;
  don't change the repo's visibility without being asked to deploy.
- **Don't get around the check** by stripping the git metadata from the
  upload (deleting `.git` before `vercel deploy`, say). That evades Vercel's
  plan rule rather than meeting it.
- **Docs-only commits go out with `[skip ci]`** in the message: the docs
  aren't served, so there's nothing to deploy.
- **After a deploy, check the live site**: compare it with the local files,
  and confirm the paths `.vercelignore` lists return 404.
  `node tools/flow-test.mjs https://cipher-academy-site.vercel.app` runs the
  full suite against it, but only while `CONFIG.api` is empty. Once the
  endpoints are wired, it would post a test lead to the real backend.
