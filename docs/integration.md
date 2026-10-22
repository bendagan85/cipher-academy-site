# Wiring the data

The pages ship with **no backend calls switched on**. Every interaction already
goes through one function, `track()` in `assets/js/track.js`, and the lead,
share and challenge calls are written and waiting for an address. Turning data
on is a matter of filling in `assets/js/config.js` — no page code changes.

## Three ways to receive events (use any or all)

| Hook | What it gets | How to turn it on |
|---|---|---|
| `window.dataLayer` | `{ event: "cipher_<name>", ...props }` for every event | Always on. Add a GTM container and build triggers on `cipher_*`. |
| `window.cipherTrack(event, props, payload)` | Every event, synchronously | Define the function before `main.js` runs. |
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

## Events

**Both pages**
- `page_view` `{ referrer }` / `{ page: "kid", preview }`
- `section_view` `{ chapter }` — once per chapter, first time half of it is on screen
- `section_dwell` `{ chapter, ms }` — time spent, when the chapter leaves the screen (> 1.2s)
- `scroll_depth` `{ pct }` — 25 / 50 / 75 / 100
- `share_opened` `{ id }` — this visit came through a shared link

**Parents' page** — chapters: `hero same method hp nir program filter turn fit faq end`
- `cta_fit` `{ source }` — any "בדיקת התאמה" button (header, hero, dock)
- `lens_select` `{ mode }` — defend / attack / research
- `hp_step` `{ step }` — 0 outside, 1 inside, 2 result
- `program_node` `{ node }`
- `prereq_toggle` `{ req, on, count }`, then `prereq_result` `{ count, items }` after 1.5s of quiet — which prerequisites parents say their child already has
- `price_view` — the price was on screen
- `syllabus_open` `{ source }`
- `proof_link` `{ target }` — book, HP paper, CVE tracker, a CVE record, CyCube, full syllabus
- `faq_open` `{ q }`
- `share_open` `{ source }` — the share sheet opened
- `share_created` `{ id, target, source }` — target is `kid` or `partner`
- `share_sent` `{ target, via: "whatsapp" }`
- `link_copied` `{ target, ok }`
- `kid_page_preview`
- `quiz_start`, `quiz_answer` `{ q, a, step }`, `quiz_result` `{ route, ...answers }`, `quiz_restart`
- `lead_form_open` `{ route }` — "leave details anyway" after a route that doesn't ask for them
- `lead_invalid` `{ fields }`, `lead_submit` `{ route, demo }`, `lead_error` `{ route }`
- `journey_end` — reached the footer

**Teen's page** — chapters: `kid-hero kid-who kid-challenge kid-in end`
- `challenge_start` `{ source }`, `hint_open` `{ n }`, `target_copied`, `flag_submit` `{ ok, hints }`, `challenge_solved` `{ hints }`
- `challenge_interest` `{ ref }` — "I'm in", which opens WhatsApp to the parent
- `parents_page`, `cta_challenge`, `cta_who` `{ source }`

## Attribution: parent → teen → parent

1. A parent taps "send to my kid". `share_created` fires with a fresh `id`, and
   the WhatsApp message carries `kid/?ref=<id>&utm_source=share&utm_medium=parent_to_kid`.
2. The teen opens it: `share_opened { id }`, and every event from that browser
   now carries `ref: <id>`.
3. The teen taps "I'm in": the message to the parent links back to the parents'
   page with the same `ref`. A lead that arrives that way carries it too.

So one `ref` joins: which parent shared → whether the teen opened → whether the
teen tried the challenge → whether the family converted.

## Leads — `CONFIG.api.leads`

`POST` JSON. Any 2xx counts as success; anything else shows "try again" and
keeps the form. Until the URL is set, the lead is kept in `localStorage`
(`cipher.lastLead`) so a demo completes.

```json
{
  "name": "…", "phone": "050-…", "email": null,
  "answers": { "grade": "11", "practice": "built", "drive": "both", "budget": "yes" },
  "route": "ready",
  "ref": "abc123xyz0", "visitor": "k3j9…", "utm": { … },
  "journey": { "sections": ["hero", "method", …], "interactions": 14 },
  "page": "https://…", "ts": "2026-10-23T…Z"
}
```

There is a honeypot field (`company`); a submission with it filled is dropped
in the browser. Validate on the server too.

### Quiz answers and routes

| Question | Values |
|---|---|
| `grade` | `9` `10` `11` `12` `other` |
| `practice` | `built` (wrote code on their own) · `class` (learned in a framework) · `curious` (hasn't written code) · `unsure` |
| `drive` | `kid` · `both` · `me` (mostly the parent) |
| `budget` | `yes` · `think` · `no` |

Routes, first match wins: `budget` (price is not relevant now — no form) ·
`young` (9th grade — form, next cohort) · `them` (mostly the parent wants it —
send the challenge first, form optional) · `talk` (unsure answers — form) ·
`prep` (no code yet — form, prep track) · `ready` (form, phone call).

## Shares — `CONFIG.api.shares`, `CONFIG.api.shareOpen`

- On create: `POST { id, target, source, from_visitor, ref }`
- On open: `POST { id, visitor }` — once per id per browser session

## The challenge — `CONFIG.challenge`, `CONFIG.api.challengeFlag`

The teen's page shows the existing challenge. Fill in from the current
challenge config:

- `challenge.target` — what the teen connects to
- `challenge.hints` — up to three strings, revealed one at a time
- `api.challengeFlag` — `POST { flag, ref, visitor, hints }` → `{ "ok": true | false }`

Until `target` and `challengeFlag` are both set, the page sends teens to
`challenge.fallbackUrl` (the challenge on the current site), so nothing is
broken in the meantime. Keep the flag check on the server; never ship the flag
or its hash in `config.js`.
