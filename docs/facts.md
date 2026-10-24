# Claims and their sources

Every factual claim on the page must trace to a line here. Checked
2026-10-22, updated 2026-10-24 with the brother's second round of feedback.

## Safe to state (publicly verifiable)
- **HP Easy Start (macOS):** three CVEs found by Nir Yehoshua — CVE-2026-12554, -12555, -12556 (CVSS 4.0: 8.5 / 7.7 / 7.7). Reported 2 Apr 2026, fixed in 2.16.7.260722, HP bulletin HPSBPI04124 (24 Aug 2026). HP's CVE record names Nir as finder.
  https://ciphersecuritylabs.com/papers/rooted-in-trust-breaking-hp-easy-starts-macos-privilege-boundaries/ · https://www.cve.org/CVERecord?id=CVE-2026-12554
- **Vendors that officially credit Nir / Cipher in 2026:** HP, Dell, Ericsson, Fujitsu Research, PFU (JVN), SteelSeries, Cudy.
  https://www.cve.org/CVERecord?id=CVE-2026-71168 · https://jvn.jp/en/vu/JVNVU96968110/ · https://github.com/FujitsuResearch/OneCompression/blob/main/SECURITY.md
- **CVE count:** the tracker lists 42; ~36 are attributable to Cipher, 32 of them credited in official CVE records. **Use "30+" — "40+" is not supported.**
  https://ciphersecuritylabs.com/CVE-Tracker
- **Press coverage (16 articles, 4 findings), from Cipher's own "In the News" page:**
  - HP Easy Start (6): Cyber Security News, GBHackers, CyberPress, HackersRadar, CyberWebSpider, SecurityBrief
  - Cudy WR3000 (6): HackRead, SecurityBrief (×2), SecNews, BugsToday, Brinztech
  - macOS textutil / KeePassXC (3): Cyber Security News, GBHackers, VPNCentral
  - PFU Image Scanner driver, Japan (1): ScanNetSecurity
  https://ciphersecuritylabs.com/in-the-news
- **Book:** *Antivirus Bypass Techniques*, Packt, July 2021, Nir Yehoshua & Uriel Kosayev. https://www.amazon.com/dp/1801079749
- **Uriel Kosayev:** co-founder, Defensive & Malware Research Lead at Cipher Security Labs. Founder of TrainSec Academy; co-author of the book above and of *MAoS — Malware Analysis on Steroids*. Per the brother (2026-10-24): useful mainly as an internal/SEO layer, not a headline fact for parents or teens.
  https://ciphersecuritylabs.com/about
- **Nir's experience:** "over a decade" (company bio). IDF: "alumnus of an elite security research and incident response team" — **no unit named; never write 8200 about Nir.**
  https://ciphersecuritylabs.com/about · https://helion.pl/autorzy/nir-yehoshua

## Confirmed by the business
- **CyCube (Technion students, Bank of Israel cyber staff):** approved by CyCube in writing by email (brother, 2026-10-24). Safe to state as given.
- **Prep track:** 873 ILS, one-time, self-paced, starts immediately on purchase. Includes 3 months free in Cipher's Discord community. Ends in a final test; passing it still returns the teen to the admission stages for the full program (phone call → interview → exam) — the business follows up after results.
- **9th grade:** can be accepted by exception (not the default cohort, which is grades 10–12). Recommended for them: buy the prep course now.
- **Direct WhatsApp line:** 054-990-8200 (+972 54-990-8200). Shown on the thank-you page only, not the main funnel.
- **Launch domain:** `https://ciphersecurity.co.il/8200` — confirmed, but not live yet; the brother will point it there after this build is approved. Keep relative URLs until then.
- **The challenge's content** (server target, the three hints, the FLAG format check) is taken from the current live site at the domain above. It is deliberately **not** copied into this repo or its docs — `config.js` ships with `challenge.target/hints/flagPattern` empty, and the developer fills them in directly from the live site's own config at wiring time. Keep it that way: no exploit mechanics in committed files.

## Do not state
- "The most expensive prep in the market" — unverifiable (most vendors hide prices; bootcamps run 16–20K). Show the price with its reasons instead.
- "40+ vulnerabilities in the last year" — see CVE count.
- Success percentages, acceptance guarantees, or any 8200 affiliation (for Nir, the company, or graduates).
- Company age: Cipher Security Labs says "established 2026". Years of experience belong to Nir, not the company.
- Anything about post-service career outcomes beyond the motivational, unspecific line already on the kid page ("הידע הזה לא נשאר ברקע לעולם") — no claims of jobs, salaries or specific placements.

## Program facts (from the client brief and the current site)
- Cohort: up to 15. Starts 1.1.2027 (confirmed by Ben 2026-10-22; the old site's FAQ said 1.11.2026).
- Price: 9,900 ILS, shown openly as a filter.
- 30 sessions, twice a week, 2 hours, from home. WhatsApp support between sessions, weekly open practice with a researcher, Discord community for a year, sorting simulation + final CTF; certificate only for those who pass. Reverse Engineering continuation track for top students, by selection.
- Admission: fit check → phone call → interview with the teen → exam. Entry routes: the Cipher challenge, existing knowledge, or the prep track.
- Prerequisites: grades 10–12; Windows + basic Linux; basic Python (variables, conditions, loops, functions); IP, TCP/IP, DNS, HTTP; processes, file system, CLI; technical English; self-learning and problem solving; commitment beyond class hours; a PC that runs VMs + stable internet.
