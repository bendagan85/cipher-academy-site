// Everything the business may change without touching layout code.
// Facts here must match docs/facts.md — every claim on the page traces to it.

export const CONFIG = {
  cohort: {
    seats: 15,
    start: '1.1.2027',
    price: '9,900 ₪',
    sessions: 30,
  },

  links: {
    labs: 'https://ciphersecuritylabs.com/',
    research: 'https://ciphersecuritylabs.com/research',
    cveTracker: 'https://ciphersecuritylabs.com/CVE-Tracker',
    hpPaper: 'https://ciphersecuritylabs.com/papers/rooted-in-trust-breaking-hp-easy-starts-macos-privilege-boundaries/',
    book: 'https://www.amazon.com/dp/1801079749',
    cycube: 'https://www.cycube.io/en/',
    syllabus: 'https://ciphersecurity.co.il/8200/syllabus',
  },

  // Relative to the parents' page. The kid page reads ?ref= to attribute the share.
  kidPage: 'kid/',
  parentsPage: '../',

  // Nothing leaves the browser until an endpoint is set. Payloads: docs/integration.md
  api: {
    events: null,        // every track() call, sent with navigator.sendBeacon
    leads: null,         // POST JSON when a parent submits the fit check
    shares: null,        // POST when a share link is created
    shareOpen: null,     // POST when a shared link is opened
    challengeFlag: null, // POST { flag, ref } → { ok: boolean } — the existing challenge's check
  },

  // The existing challenge's target and hints, copied from its current config by
  // the developer who wires the backend.
  challenge: {
    target: null,
    hints: [],
    // until the two fields above are filled, the kid page sends teens to the live challenge
    fallbackUrl: 'https://ciphersecurity.co.il/8200#cipher-challenge',
  },

  // Forward lead / share events to the Meta pixel when it is on the page.
  metaPixel: true,
};
