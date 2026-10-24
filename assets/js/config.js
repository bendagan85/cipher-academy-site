// Everything the business may change without touching layout code.
// Facts here must match docs/facts.md — every claim on the page traces to it.

export const CONFIG = {
  cohort: {
    seats: 15,
    start: '1.1.2027',
    price: '9,900 ₪',
    sessions: 30,
  },

  // the prep track, for teens who are missing the basics
  prep: {
    price: '873 ₪',
    community: '3 חודשים בקהילת הדיסקורד',
  },

  // direct line, shown on the thank-you page
  whatsapp: { display: '054-990-8200', number: '972549908200' },

  links: {
    labs: 'https://ciphersecuritylabs.com/',
    research: 'https://ciphersecuritylabs.com/research',
    cveTracker: 'https://ciphersecuritylabs.com/CVE-Tracker',
    hpPaper: 'https://ciphersecuritylabs.com/papers/rooted-in-trust-breaking-hp-easy-starts-macos-privilege-boundaries/',
    book: 'https://www.amazon.com/dp/1801079749',
    cycube: 'https://www.cycube.io/en/',
    syllabus: 'https://ciphersecurity.co.il/8200/syllabus',
    news: 'https://ciphersecuritylabs.com/in-the-news',
  },

  // Each used from the one page that knows its own depth (kid.js from kid/,
  // quiz.js from the root). share.js figures out kid/partner links on its
  // own, since it runs from both the root and thanks/. The kid page reads
  // ?ref= to attribute the share either way.
  parentsPage: '../',
  thanksPage: 'thanks/',

  // The film in the hero's keyhole. `teaser` is the muted loop (seconds) that
  // plays inside the mark; a tap plays the whole file with sound.
  // Until Nir's film exists this is a placeholder made from his photo, and the
  // open player says so. Replace `src`, set `placeholder: false`.
  film: {
    src: 'assets/video/film-placeholder.mp4',
    teaser: [0, 8],
    placeholder: true,
  },

  // Nothing leaves the browser until an endpoint is set. Payloads: docs/integration.md
  api: {
    events: null,        // every track() call, sent with navigator.sendBeacon
    leads: null,         // POST JSON when a parent submits the fit check
    shares: null,        // POST when a share link is created
    shareOpen: null,     // POST when a shared link is opened
    challengeFlag: null, // optional server check: POST { flag, ref } → { ok }. Without it the format check below decides, as on the current site
  },

  // The Cipher challenge. Its server address, hints and FLAG check stay with
  // the business: the developer copies them from the current site's challenge
  // config into the three fields below. Until they are filled, both pages send
  // teens to the live challenge instead (README: before launch).
  challenge: {
    target: null,
    hints: [],
    flagPattern: null,
    fallbackUrl: 'https://ciphersecurity.co.il/8200#cipher-challenge',
  },

  // Forward lead / share / challenge events to the Meta pixel when it is on the page.
  metaPixel: true,
};
