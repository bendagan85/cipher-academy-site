# Wiring the data

The pages ship with **no backend calls switched on**. Every interaction
already goes through one function, `track()` in `assets/js/track.js`, and the
lead, share and challenge calls are written and waiting for an address.
Turning data on is a matter of filling in `assets/js/config.js` — no page
code changes.

## Three ways to receive events (use any or all)

| Hook | What it gets | How to turn it on |
|---|---|---|
| `window.dataLayer` | `{ event: "cipher_<name>", ...props }` for every event | Always on. Add a GTM container and build triggers on `cipher_*`. |
| `window.cipherTrack(event, props, payload)` | Every event, synchronously | Define the function before `main.js` / `kid.js` / `thanks.js` runs. |
| `CONFIG.api.events` | The full payload below, via `navigator.sendBeacon` | Set the URL in `config.js`. |

The Meta pixel, if it is on the page, also receives `Lead` (on `lead_submit`)
and three custom events: `ShareSent`, `FitCheckStart`, `ChallengeInterest`.

### Event payload (sendBeacon / cipherTrack)

```json
{
  "event": "quiz_answer",
  "props": { "q": "grade", "a": "11", "step": 1 },
  "page": "/",
  "ts": 1792700000000,
  "visitor": "k3j9…",         // stable per browser (localStorage)
  "session": "p0x2…",          // per page load
  "ref": "abc123xyz0",         // the share id this visitor arrived through, if any
  "utm": { "utm_source": "facebook", "fbclid": "…" }
}
```

No name, phone number or email ever appears in an event. They exist only in
the lead POST.

## Pages and chapters

- **Parents' page** (`index.html`) — `hero same method hp nir program
  syllabus filter turn fit faq coda end`
- **Teen's page** (`kid/`) — `kid-hero kid-who kid-method kid-nir kid-program
  kid-check kid-challenge kid-in end`
- **Thank-you page** (`thanks/`) — `ack labs next-steps end footer`. Only
  reachable by submitting the fit check (or directly, which renders a generic
  fallback — see "The diagnosis" below).

## Events

**Every page**
- `page_view` `{ referrer }` (parents) / `{ page: "kid", preview }` (kid) / none extra (thanks)
- `section_view` `{ chapter }` — once per chapter, first time half of it is on screen
- `section_dwell` `{ chapter, ms }` — time spent, when the chapter leaves the screen (> 1.2s)
- `scroll_depth` `{ pct }` — 25 / 50 / 75 / 100
- `share_opened` `{ id }` — this visit came through a shared link
- `proof_link` `{ target }` — book, HP paper, CVE tracker, a CVE record, CyCube, full syllabus
- `press_open` `{ target }` — a press card's article was opened (parents page only: `hp cudy macos pfu`)
- `press_card` `{ target }` — a card at the back of the press stack was tapped and came to the front; that tap doesn't open the article, so it isn't a `press_open`
- `whatsapp_direct` `{ source }` — the direct WhatsApp number (thanks page header/footer)
- `parents_page` `{ source }` — a link back to the parents' page

**The challenge** (shared component, `assets/js/challenge.js`, both pages) — every event carries `source: "parents" | "kid"`
- `challenge_start` `{ source, ready, via }` — the lock opened; `via` is `tap` (the keyhole) or `turn` (its rings dragged round far enough); `ready` is whether `CONFIG.challenge` is filled in
- `challenge_live` `{ source: "fallback" }` — the "open the live challenge" link, shown while `ready` is false
- `hint_open` `{ n, source }`, `target_copied` `{ ok, source }`
- `flag_submit` `{ ok, attempt, hints, source }`, `challenge_solved` `{ hints, attempts, source }`

**Parents' page**
- `cta_fit` `{ source }` — any "בדיקת התאמה" button: `header hero coda dock solved` (the last is the solved challenge)
- `lens_select` `{ mode }` — defend / attack / research
- `hp_step` `{ step }` — 0 outside, 1 inside, 2 result
- `program_node` `{ node }` — a stop on the program dial was tapped
- `syllabus_tier` `{ tier, source }` — a syllabus tier (1–3) came up on the mark: `source` is `tab` (its tab was tapped) or `scroll` (scrolled to; once per tier)
- `prereq_toggle` `{ req, on, count }`, then `prereq_result` `{ count, unsure, items }` after 1.5s of quiet
- `price_view` — the price was on screen
- `syllabus_open` `{ source }` — opened from a syllabus-chapter tile (`source: "chapter-<n>"`)
- `faq_open` `{ q }`
- `share_open` `{ source }` — the share sheet opened
- `share_created` `{ id, target, source }` — `target` is `kid`, `kid-check` or `partner`
- `share_sent` `{ target, via: "whatsapp" }`, `link_copied` `{ target, ok }`
- `kid_page_preview` — "see the page they'll get"
- `quiz_start`, `quiz_answer` `{ q, a, step }`, `quiz_result` `{ route, ...answers }`, `quiz_restart`
- `lead_form_view` `{ route }` — the contact-details form is now showing
- `lead_invalid` `{ fields }`, `lead_submit` `{ route, demo }`, `lead_error` `{ route }`
- `journey_end` — reached the footer

**Teen's page**
- `cta_challenge` `{ source }`, `cta_who` `{ source }` — `source` is the chapter the link sat in (`hero who method nir program header`)
- `challenge_interest` `{ ref }` — "I'm in", which opens WhatsApp to the parent
- `lens_select` `{ mode }` — defend / attack / research, as on the parents' page
- `prereq_result` `{ count, page: "kid", items }` — the self-check, after 1.5s of quiet

**Thank-you page**
- `thankyou_view` `{ segment }` — the diagnosis shown (see below)
- `share_sent` `{ target, via: "whatsapp" }` — same as the parents' page, fired from three CTAs (top, mid-page, and the share sheet isn't used here — these are direct buttons)

## The film — `CONFIG.film`

The hero's keyhole plays a muted teaser loop on load and the full file, with
sound, when tapped. `src`, `teaser: [startSec, endSec]`, and `placeholder`
(true shows a small "סרטון זמני" note on open — set to `false` once it's
Nir's real film). `film_open` `{ source }` (`source` is `"mark"` or `"caption"`),
`film_play`, `film_complete`, `film_close` `{ at }`. With Save-Data on, on
2G, or when the browser refuses autoplay (iOS low-power mode), the keyhole
shows the poster (`assets/img/film-poster.webp`) and a play button instead
of the loop.

## Attribution: parent → teen → parent

1. A parent taps a "send to my kid" button. `share_created` fires with a
   fresh `id`, and the WhatsApp message carries
   `kid/?ref=<id>&utm_source=share&utm_medium=parent_to_kid` (or
   `parent_to_partner` for the co-parent link).
2. The teen opens it: `share_opened { id }`, and every event from that
   browser now carries `ref: <id>`.
3. The teen taps "I'm in": the message to the parent links back to the
   parents' page with the same `ref`. A lead that arrives that way carries
   it too.

So one `ref` joins: which parent shared → whether the teen opened → whether
the teen tried the challenge → whether the family converted.

## The diagnosis — `assets/js/diagnosis.js`

The fit check never shows a score. It computes one of six **segments** from
the four answers plus whatever the parent ticked in the "what do they already
know" chapter (read from `sessionStorage` under `cipher.prereq`, written live
as checkboxes toggle):

| Segment | When | The CTA under the quiz | The thank-you headline says |
|---|---|---|---|
| `ready` | solid practice answer, no weak prerequisites | "שמרו לנו שיחת התאמה" | there's a real base here |
| `close` | mixed signals | "לשיחת ההתאמה עם צוות Cipher" | good direction, the call will sort it out |
| `prep` | curious/no code yet, or ≤2 prerequisites | "לצעד הראשון שלהם עם Cipher" | start from the prep track |
| `check` | "unsure" on practice/grade/prerequisites | "לצעד הבא, יחד איתם" | let's get to know them first |
| `parent` | drive = "mostly me" | "לצעד הבא שלכם עם Cipher" | enthusiasm isn't enough — the challenge is |
| `young` | 9th grade | "שמרו להם מקום מוקדם" | early, and that's an advantage |

`diagnose(answers, prereq)` is pure and exported, so the same logic can run
server-side if the business ever wants it off the client.

## Leads — `CONFIG.api.leads`

`POST` JSON on submit. Any 2xx with the shape below counts as success;
anything else shows "try again" and keeps the form. Until the URL is set, the
lead is kept in `localStorage` (`cipher.lastLead`) so a demo still completes,
and the parent is still sent to `thanks/` (reading from `sessionStorage`
instead, under `cipher.thanks`).

```json
{
  "name": "…", "phone": "050-…", "email": null,
  "answers": { "grade": "11", "practice": "built", "drive": "kid", "why": "edge" },
  "prereq": { "n": 5, "of": 7, "items": ["python", "networks", "…"], "unsure": false },
  "segment": "ready",
  "ref": "abc123xyz0", "visitor": "k3j9…", "utm": { … },
  "journey": { "sections": ["hero", "method", …], "interactions": 14 },
  "page": "https://…", "ts": "2026-10-24T…Z"
}
```

There is a honeypot field (`company`); a submission with it filled is dropped
in the browser. Validate on the server too.

### Quiz questions

| `key` | Values |
|---|---|
| `grade` | `9` `10` `11` `12` `other` |
| `practice` | `built` (wrote code on their own) · `class` (learned in a framework) · `curious` (hasn't written code) · `unsure` |
| `drive` | `kid` · `me` (mostly the parent) · `both` |
| `why` | `edge` (an edge at admissions) · `elite` (the elite 8200 units) · `extra` (supplementary knowledge) · `checking` (just looking) |

`why` doesn't affect the diagnosis today — it's there for the business to
read in the lead, and `diagnose()` is the one place that would change if it
should.

## Shares — `CONFIG.api.shares`, `CONFIG.api.shareOpen`

- On create: `POST { id, target, source, from_visitor, ref }` — `target` is
  `kid`, `kid-check` (the "mark it yourself" link from the prerequisite
  chapter — lands on the kid page with `#check` in view) or `partner`
- On open: `POST { id, visitor }` — once per id per browser session

## The challenge — `CONFIG.challenge`, `CONFIG.api.challengeFlag`

Both pages show the same challenge, behind the mark (tap it to scatter the
digits and open the panel). Fill in from the current site's challenge config
(`ciphersecurity.co.il/8200`, the same numbers it already runs):

- `challenge.target` — the server address shown to the teen
- `challenge.hints` — up to three strings, revealed one at a time
- `challenge.flagPattern` — a regex string; a FLAG matching it is accepted
  client-side, the same acceptance rule the current site uses (format, not a
  server round-trip)
- `api.challengeFlag` — optional stricter server check instead:
  `POST { flag, ref, visitor, hints, source }` → `{ "ok": true | false }`

Until `challenge.target`, `challenge.hints` and either `flagPattern` or
`api.challengeFlag` are set, the mark opens straight to
`challenge.fallbackUrl` (the challenge on the current site), so nothing is
broken in the meantime. If the business wants real server-side validation
rather than a format check, keep that check server-side; never ship a secret
flag value or its hash in `config.js`.
