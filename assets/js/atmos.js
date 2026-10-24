// The light under the page. Three slow pools of colour sit fixed behind
// everything (.atmo in the markup, styled in site.css); this module only
// decides which key they are in, by setting html[data-mood].
//
// The mood is the chapter crossing the middle of the screen, unless something
// inside it asks for its own — an element with data-mood (the CyCube lab is
// green), or a script for a moment (the flaw Nir found is amber).

const root = document.documentElement;
const live = new Set();
let moment = null;

function apply() {
  // the innermost thing in the middle band wins: a [data-mood] block over its chapter
  let pick = null;
  for (const el of live) {
    if (!pick || (el.dataset.mood && !pick.dataset.mood) || pick.contains(el)) pick = el;
  }
  const next = moment || pick?.dataset.mood || pick?.dataset.chapter;
  if (next && root.dataset.mood !== next) root.dataset.mood = next;
}

export function atmosphere() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) live.add(e.target); else live.delete(e.target);
    }
    apply();
  }, { rootMargin: '-46% 0px -46% 0px' });
  document.querySelectorAll('[data-chapter], [data-mood]').forEach((el) => io.observe(el));
}

// a moment inside a chapter takes the light for itself, then gives it back
export const mood = {
  set(name) { moment = name; apply(); },
  clear(name) { if (!name || moment === name) { moment = null; apply(); } },
};
