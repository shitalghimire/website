/* Letter reference numbers → keys the register can be looked up by.

   Three families of number appear on TKV:
     LOT-01/SINOHYDRO-KSNS JV/0123   the Engineer writing to us            → in:123
     TKV/COM/2024/0456               us writing to the Engineer            → out:456
     DOLSAR-CSPDR JV/0123            the Engineer writing to the Employer  → er-emp:123

   The tracker is typed by hand and parts of it are OCR, so each pattern also takes
   the usual slips: LOT-O1, SINOHYDYO, KSNS.JV, a lost "LOT-01/", COI\{ for COM,
   "COM12026" for "COM/2026", Q73 for 073, spaces around the slashes, odd dashes.
   The Interface series (…KSNS-JV/Interface/842) is a different numbering and is left out. */

const D = String.raw`[-‐-―−]`;   // any dash

const SERIES = [
  {
    kind: 'er',
    re: new RegExp(String.raw`(?:L?\s*OT\s*${D}?\s*[0O]?\s*[1I]\s*\/?\s*)?S\s*[I1T]\s*N\s*[O0]\S{1,3}?D\s*[RY]\s*[O0](?:\s*${D})*\s*KSNS(?:\s*[.]|\s*${D})*\s*(?:JV)?(?:\s*[.]|\s*${D})*\s*\/?\s*[Q0O]?(\d{1,4})(?![\dA-Z])`, 'i'),
    ref: (m) => ({ key: 'in:' + +m[1], no: +m[1] }),
  },
  {
    kind: 'ours',
    re: new RegExp(String.raw`TKV\s*[\/-]?\s*I?\s*C\s*[O0]\S{0,3}?\s*[\/-]?\s*(20\d\d|0[12]\d\d)\s*[\/-]?\s*(\d{1,4})(?![\dA-Z])`, 'i'),
    ref: (m) => ({ key: 'out:' + +m[2], no: +m[2], ...(/^20/.test(m[1]) ? { year: +m[1] } : {}) }),
  },
  {
    kind: 'er-emp',
    re: new RegExp(String.raw`DOLSAR(?:\s|${D}|[_\/])*[CG]?S?P?D?R?(?:\s|${D}|_)*(?:J\s*[VC])?\s*(?:${D}|[_\/])+\s*[Q0O]?(\d{1,4})(?![\dA-Z])`, 'i'),
    ref: (m) => ({ key: 'er-emp:' + +m[1], no: +m[1] }),
  },
];

/* the first letter number in a piece of text, with where it sits */
export function findLetterRef(text) {
  const s = String(text || '');
  let best = null;
  for (const x of SERIES) {
    const m = s.match(x.re);
    if (m && (!best || m.index < best.m.index)) best = { x, m };
  }
  return best ? { ...best.x.ref(best.m), kind: best.x.kind, index: best.m.index, length: best.m[0].length } : null;
}

export function normLetterRef(raw) {
  const f = findLetterRef(raw);
  if (!f) return null;
  const { index, length, ...n } = f;
  return n;
}

/* the key a register row is filed under. The Engineer's letters to the Employer are
   often typed as a bare number ("055"), so their row number is read directly. */
export function registerKey(r) {
  if (r.c === 'in' || r.c === 'out') {
    const n = normLetterRef(r.n);
    return n && n.key.startsWith(r.c + ':') ? n.key : null;
  }
  if (r.c === 'er-emp') {
    const bare = String(r.n || '').trim().match(/^0*(\d{1,4})$/);
    if (bare) return 'er-emp:' + +bare[1];
    const n = normLetterRef(r.n);
    return n?.kind === 'er-emp' ? n.key : null;
  }
  return null;
}
