/* Guilloché: the interlaced wave rosettes engraved on share certificates,
   banknotes and registry seals. Generated, never downloaded.

   Each band is a family of curves  r(θ) = R + A·sin(kθ + φ)  drawn at
   several phases φ, which is what makes the lines appear to weave. */

const TAU = Math.PI * 2;

function band({ R, A, k, m, pts = 420 }, cx, cy, S) {
  const out = [];
  for (let j = 0; j < m; j++) {
    const ph = (TAU * j) / m;
    let d = '';
    for (let i = 0; i <= pts; i++) {
      const t = (TAU * i) / pts;
      const r = (R + A * Math.sin(k * t + ph)) * S;
      d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`;
    }
    out.push(`<path d="${d}Z"/>`);
  }
  return out.join('');
}

const SETS = {
  /* the big wheel behind the gate */
  door: [
    { R: .47, A: .022, k: 36, m: 6 }, { R: .415, A: .04, k: 24, m: 8 }, { R: .32, A: .052, k: 16, m: 8 },
    { R: .215, A: .05, k: 11, m: 8 }, { R: .12, A: .04, k: 7, m: 6 },
  ],
  /* a quieter medallion for page headers */
  medal: [{ R: .46, A: .03, k: 28, m: 6 }, { R: .36, A: .055, k: 14, m: 8 }, { R: .22, A: .06, k: 9, m: 8 }],
  /* a single ring: borders and seals */
  ring: [{ R: .45, A: .035, k: 30, m: 8 }],
};

/* SVG markup for a rosette. `kind` is one of door | medal | ring. */
export function rosette(kind = 'medal', size = 600) {
  const S = size; const c = size / 2;
  return `<svg viewBox="0 0 ${S} ${S}" aria-hidden="true">${(SETS[kind] || SETS.medal).map((b) => band(b, c, c, S)).join('')}</svg>`;
}

/* Put a rosette into an element (static generated markup only). */
export function engrave(el, kind, size) {
  if (el) el.innerHTML = rosette(kind, size);
  return el;
}
