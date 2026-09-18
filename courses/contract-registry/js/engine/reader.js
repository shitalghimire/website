/* ═══════════════════════════════════════════════════════════════
   The letter reader — runs entirely in the browser.

   1. Who wrote it, its references, date and subject
   2. Every clause cited → verified against the TKV text (title check,
      FIDIC look-alikes, specification references, PCC amendments)
   3. What the letter is DOING (determination, rejection, instruction…)
   4. What it is ABOUT (topics) → clauses you can use, clauses to expect
   5. Clocks started by the letter, a reply plan, a suggested letter type,
      related TKV case files
   ═══════════════════════════════════════════════════════════════ */

import C from './contract.js';
import * as D from '../lib/dates.js';
import { normLetterRef } from './letters.js';

export { normLetterRef };

const SIG = new Set(['the', 'of', 'and', 'to', 'for', 'in', 'a', 'by', 'on', 'or', 'with', 'its', 'it\'s', 'sub', 'clause']);
const words = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]+/g, ' ').split(' ').filter((w) => w.length > 2 && !SIG.has(w)).map((w) => w.replace(/s$/, ''));

function overlap(a, b) {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w) || [...B].some((x) => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))) n++;
  return n / Math.min(A.size, B.size);
}

let REG = null;
function registerIndex(register) {
  if (REG) return REG;
  REG = new Map();
  register.forEach((r, i) => {
    const n = normLetterRef(r.n);
    if (n && (r.c === 'in' || r.c === 'out')) REG.set(n.key, { ...r, i });
  });
  return REG;
}

const LETTER_REF_RE = /\b(?:LOT-?0?1\s*\/\s*SINOHYDRO\s*-?\s*KSNS\s*-?\s*JV\s*\/\s*\d{1,4}|TKV\s*[/-]\s*I?COM\s*[/-]\s*20\d\d\s*[/-]\s*\d{1,4}|TKVCOM20\d\d\d{1,4})\b/gi;

export function analyse(text, data, { received, viaEmail = true } = {}) {
  const t = String(text || '').replace(/\r/g, '');
  const low = t.toLowerCase();
  const out = { text: t, marks: [] };
  const R = data.reader;

  /* ── 1. sender, refs, date, subject ── */
  const score = (list) => list.reduce((a, re) => a + (new RegExp(re, 'im').test(t.slice(0, 2500)) ? 1 : 0), 0);
  const sScores = { er: score(R.senders.er), contractor: score(R.senders.contractor), employer: score(R.senders.employer) };
  let sender = Object.entries(sScores).sort((a, b) => b[1] - a[1])[0];
  sender = sender[1] ? sender[0] : 'unknown';
  if (/\bthe contractor (is|shall|has been) (hereby )?(instructed|required|reminded)|we refer to (your|the contractor's) letter/i.test(t) && sender === 'unknown') sender = 'er';

  const reg = registerIndex(data.register);
  const letterRefs = [];
  const seenRef = new Set();
  for (const m of t.matchAll(LETTER_REF_RE)) {
    const n = normLetterRef(m[0]);
    if (!n || seenRef.has(n.key)) continue;
    seenRef.add(n.key);
    letterRefs.push({ raw: m[0].replace(/\s+/g, ''), ...n, letter: reg.get(n.key) || null, index: m.index });
    out.marks.push({ start: m.index, end: m.index + m[0].length, kind: 'letter' });
  }
  const dates = D.findDates(t);
  /* the letter's own date: a "Date:" label settles it; otherwise skip dates that
     belong to a cited letter ("… ref. X dated 9 March 2026") */
  const labelled = (d) => /\bdate\s*[:.]\s*$/i.test(t.slice(Math.max(0, d.index - 12), d.index));
  const refDate = (d) => letterRefs.some((r) => r.index < d.index && d.index - r.index < 90 && /\bdated\b|\bof\s*$/i.test(t.slice(r.index, d.index)))
    || letterRefs.some((r) => r.index > d.index && r.index - d.index < 40);
  const headDate = dates.find((d) => d.index < 900 && labelled(d)) || dates.find((d) => d.index < 900 && !refDate(d)) || dates[0] || null;
  const subjM = t.match(/\bSub(?:ject)?\s*[:.]\s*([^\n]{6,220}(?:\n(?![A-Z][a-z]+\s*[:,]|Dear|Ref)[^\n]{3,160})?)/i);
  const subject = subjM ? subjM[1].replace(/\s+/g, ' ').trim() : null;
  // their own ref = the first letter ref in the top block
  const topEnd = Math.min(...[t.search(/\bSub(?:ject)?\s*[:.]/i), t.search(/\bReferences?\b/i), t.search(/\bYour (Letter )?ref/i), 400].filter((x) => x >= 0));
  const own = letterRefs.find((r) => r.index < topEnd && ((sender === 'er' && r.kind === 'er') || (sender === 'contractor' && r.kind === 'ours'))) || null;
  out.meta = { sender, own, refs: letterRefs.filter((r) => r !== own), date: headDate?.date || null, subject, dates };

  /* ── 2. citations ── */
  const cites = new Map();
  for (const f of C.findRefs(t)) {
    const key = f.ref + (f.item ? `(${f.item})` : '');
    let e = cites.get(key);
    if (!e) {
      e = { key, ref: f.ref, item: f.item, raws: [], quotedTitles: new Set(), hits: 0, spec: false, prefixed: false };
      cites.set(key, e);
    }
    e.hits++; e.raws.push(f.raw.trim());
    if (f.quotedTitle) e.quotedTitles.add(f.quotedTitle);
    if (f.spec) e.spec = true;
    if (f.hasPrefix) e.prefixed = true;
    out.marks.push({ start: f.index, end: f.end, kind: 'cite', key });
  }
  // multi-level spec numbers like "Clause 2.7.5 of the GTS"
  const specHits = [];
  for (const m of t.matchAll(/\b(?:(?:sub[-\s]?)?clauses?\s*)?(\d{1,2}\.\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\b/gi)) {
    const win = t.slice(Math.max(0, m.index - 120), m.index + 80);
    if (new RegExp(R.specs.cue, 'i').test(win) || /clause/i.test(m[0])) {
      const known = R.specs.known.find((k) => k.ref.endsWith(m[1]) || k.ref.includes(' ' + m[1]));
      specHits.push({ raw: m[0], num: m[1], title: known?.title || null, source: known?.ref.split(' ')[0] || (/(gts|general technical)/i.test(win) ? 'GTS' : /(pts|particular technical)/i.test(win) ? 'PTS' : 'Specification') });
      out.marks.push({ start: m.index, end: m.index + m[0].length, kind: 'spec' });
    }
  }

  const citations = [];
  for (const e of cites.values()) {
    const r = C.resolve(e.key) || C.resolve(e.ref);
    const fidic = R.fidic.find((f) => f.from === e.ref);
    const quoted = [...e.quotedTitles];
    const c = { ...e, quotedTitles: quoted, status: 'ok', note: null, tkvTitle: null, fidic: null, amended: false };
    if (e.spec && !e.prefixed) { c.status = 'spec'; c.note = 'Looks like a technical-specification reference (GTS / PTS / Employer\'s Requirements), not a GCC clause.'; citations.push(c); continue; }
    if (!r && e.spec) {
      const known = R.specs.known.find((k) => new RegExp(`(^|\\s)${e.ref.replace('.', '\\.')}(\\b|$)`).test(k.ref));
      c.status = 'spec';
      c.note = known ? `Technical specification — ${known.ref}: ${known.title}. Not a GCC/PCC clause.` : 'Not a GCC/PCC number — a technical-specification reference (check Volume 4 GTS/PTS).';
      citations.push(c); continue;
    }
    if (!r) {
      c.status = 'missing';
      c.note = e.spec ? 'Not a GCC/PCC number — probably a technical-specification reference. Check Volume 4.' : 'This number does not exist in the TKV GCC or PCC.';
      if (fidic) { c.fidic = fidic; c.note += ` ${fidic.note}`; }
      citations.push(c); continue;
    }
    c.tkvTitle = C.titleOf(e.key) || r.clause.title;
    c.clauseTitle = r.clause.title;
    c.amended = C.isAmended(e.key);
    if (quoted.length) {
      const best = Math.max(...quoted.map((q) => Math.max(overlap(q, r.clause.title), overlap(q, c.tkvTitle), r.sub ? Math.max(0, ...r.sub.pcc.map((p) => overlap(q, p.title))) : 0)));
      if (best < 0.34) {
        c.status = 'title';
        c.note = `The letter calls it "${quoted[0]}", but in TKV ${e.key} sits under [${r.clause.title}].`;
        const f2 = R.fidic.find((f) => f.from === e.ref && overlap(quoted[0], f.title) >= 0.34) || fidic;
        if (f2 && overlap(quoted[0], f2.title) >= 0.34) { c.status = 'fidic'; c.fidic = f2; c.note += ` That title is FIDIC ${f2.from} [${f2.title}] — in TKV use ${f2.to.includes('.') ? f2.to : 'Clause ' + f2.to}.`; }
      }
    }
    // known confusions without titles
    if (c.status === 'ok' && fidic && /does not exist|not in tkv|no .* in tkv|typo/i.test(fidic.note)) { c.status = 'fidic'; c.fidic = fidic; c.note = fidic.note; }
    if (c.status === 'ok' && c.amended) c.note = 'Changed by the PCC — quote the PCC wording, not the GCC.';
    citations.push(c);
  }
  // special known mix-ups by context
  const near = (re, ref) => { const i = low.search(re); return i >= 0 && citations.some((c) => c.ref === ref); };
  if (sender === 'contractor' && near(/notice of (intention to )?claim|intention to claim/, '34')) {
    const c = citations.find((x) => x.ref === '34' || x.ref.startsWith('34.'));
    if (c) { c.status = 'wrong'; c.note = 'Clause 34 is the EMPLOYER\'s claims clause. A Contractor\'s notice of claim is under 35.1.'; }
  }
  const c101b = citations.find((x) => x.key === '10.1(b)');
  if (c101b && /employer'?s?\s+(failure|inability|obligation|responsib)/i.test(low)) { c101b.status = 'wrong'; c101b.note = '10.1(b) is the CONTRACTOR\'s permit obligation. The Employer\'s duty to obtain permissions for the Permanent Works is 10.1(a).'; }
  if (/force majeure means an exceptional event or circumstance,? natural disaster/i.test(t)) out.deletedText = 'The letter quotes the old GCC 67.1 wording, which the PCC deleted and replaced. Quote PCC 67.1 instead.';
  if (/employer'?s risks?/i.test(low) && /(excessive rain|landslide|flood|earthquake)/i.test(low) && citations.some((c) => c.ref === '21.1')) out.riskNote = 'Natural disasters are no longer Employer\'s Risks — the PCC replaced 21.1. They fall under Force Majeure (PCC 67.1(f)), which gives time but not cost (PCC 70.1(b)).';
  out.citations = citations.sort((a, b) => ['wrong', 'missing', 'fidic', 'title', 'spec', 'ok'].indexOf(a.status) - ['wrong', 'missing', 'fidic', 'title', 'spec', 'ok'].indexOf(b.status) || parseFloat(a.ref) - parseFloat(b.ref));
  out.specs = specHits;

  /* ── 3. intents ── */
  out.intents = [];
  for (const it of R.intents) {
    const hits = [];
    for (const w of it.words) for (const m of t.matchAll(new RegExp(w, 'gi'))) { hits.push(m[0]); out.marks.push({ start: m.index, end: m.index + m[0].length, kind: 'intent', id: it.id }); if (hits.length > 6) break; }
    if (hits.length) out.intents.push({ ...it, hits: [...new Set(hits.map((x) => x.toLowerCase()))], strength: hits.length });
  }
  if (sender === 'contractor') out.intents = out.intents.filter((i) => !['instruction', 'non-compliance', 'deduction', 'determination'].includes(i.id) || i.strength > 2);
  const urg = { high: 0, medium: 1, low: 2 };
  out.intents.sort((a, b) => urg[a.urgency] - urg[b.urgency] || b.strength - a.strength);

  /* ── 4. topics ── */
  out.topics = R.topics.map((tp) => {
    let s = 0; const hits = new Set();
    for (const w of tp.words) { const m = t.match(new RegExp(w, 'gi')); if (m) { s += Math.min(m.length, 5); m.slice(0, 3).forEach((x) => hits.add(x.toLowerCase())); } }
    for (const c of citations) if (tp.clauses.some((k) => c.ref === k || c.ref.startsWith(k + '.') || c.key === k)) s += 3;
    return { ...tp, score: s, hits: [...hits] };
  }).filter((x) => x.score >= 3).sort((a, b) => b.score - a.score).slice(0, 5);

  const cited = new Set(citations.map((c) => c.ref));
  const citedTop = new Set(citations.map((c) => c.ref.split('.')[0]));
  const shields = new Map();
  const watch = new Map();
  for (const tp of out.topics.slice(0, 4)) {
    for (const s of tp.shields) if (!shields.has(s.ref)) shields.set(s.ref, { ...s, topic: tp.label, cited: cited.has(s.ref.replace(/\(.*$/, '')) });
    for (const s of tp.watch) if (!watch.has(s.ref)) watch.set(s.ref, { ...s, topic: tp.label, cited: cited.has(s.ref.replace(/\(.*$/, '')) });
  }
  out.shields = [...shields.values()];
  out.watch = [...watch.values()];
  out.unmentioned = [...new Set(out.topics.slice(0, 3).flatMap((tp) => tp.clauses))].filter((k) => !citedTop.has(k.split('.')[0]) && C.resolve(k)).slice(0, 6);

  /* ── 5. clocks ── */
  const base = received || (headDate?.date ? (viaEmail ? D.addDays(headDate.date, 3) : headDate.date) : null);
  out.received = base;
  out.clocks = [];
  const addClock = (label, n, unit, ref, why) => { if (base) out.clocks.push({ label, ref, due: D.add(base, n, unit), n, unit, why }); };
  for (const it of out.intents) if (it.deadline) addClock(it.deadline.act, it.deadline.n, it.deadline.unit, it.deadline.ref, it.advice);
  if (out.intents.some((i) => i.id === 'instruction') || out.topics.some((tp) => tp.id === 'variation')) addClock('Notice of claim if this instruction costs time or money', 21, 'days', '35.1', 'Count from when you became aware — at the latest, receipt of this letter.');
  if (out.topics.some((tp) => tp.id === 'force-majeure')) addClock('Force Majeure notice (if an FM event affects you)', 15, 'days', '68.1', 'From when you became aware of the event.');
  if (out.topics.some((tp) => tp.id === 'time-eot') && sender !== 'contractor') addClock('EOT notice for any new delaying event', 15, 'days', '42.1', 'PCC 42.1 — 15 days from the event first arising.');
  const within = [...t.matchAll(/within\s+(\d{1,3})\s*(?:\(\w+\)\s*)?(calendar\s+)?days?/gi)].slice(0, 4);
  for (const m of within) addClock(`"${m[0]}" (asked in the letter)`, +m[1], 'days', '—', 'A period stated in the letter itself — check if it has a contract basis.');
  const seen = new Set();
  out.clocks = out.clocks.filter((c) => { const k = c.label + c.n; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.due - b.due);

  /* ── 6. money & numbers ── */
  out.amounts = [...t.matchAll(/\b(?:NPR|NRs\.?|Rs\.?|USD|US\$|\$)\s?[\d,]+(?:\.\d{1,2})?/gi)].map((m) => m[0]).slice(0, 8);
  out.days = [...t.matchAll(/\b(\d{1,4})\s*(?:\(\w+\)\s*)?(calendar\s+)?days\b/gi)].map((m) => m[0]).slice(0, 8);

  /* ── 7. plan, template, cases ── */
  const plan = [];
  for (const it of out.intents.slice(0, 3)) plan.push({ kind: it.urgency, text: it.advice, from: it.label });
  for (const c of out.citations.filter((x) => ['wrong', 'missing', 'fidic', 'title'].includes(x.status)).slice(0, 3)) plan.push({ kind: 'check', text: `${c.raws[0]}: ${c.note}`, from: 'Clause check' });
  if (out.deletedText) plan.push({ kind: 'check', text: out.deletedText, from: 'Clause check' });
  if (out.riskNote) plan.push({ kind: 'check', text: out.riskNote, from: 'Risk check' });
  for (const tp of out.topics.slice(0, 2)) for (const m of tp.moves.slice(0, 2)) plan.push({ kind: 'move', text: m, from: tp.label });
  out.plan = plan;

  const has = (id) => out.intents.some((i) => i.id === id);
  const topic = (id) => out.topics[0]?.id === id || out.topics.slice(0, 2).some((tp) => tp.id === id);
  out.template = has('determination') ? 'dissatisfaction' : has('time-bar') ? 'time-bar-response' : has('deduction') ? (topic('ld') ? 'ld-challenge' : 'deduction-objection')
    : has('non-compliance') ? 'ncr-response' : has('review-comments') ? 'variation-notice' : has('instruction') ? (topic('variation') || topic('design') ? 'variation-notice' : 'confirm-instruction')
      : has('rejection') ? 'rejection-response' : topic('force-majeure') ? 'fm-notice' : topic('payment') ? 'late-payment' : topic('change-in-law') ? 'change-in-law' : topic('claim-notice') ? 'notice-claim' : 'rejection-response';

  const refSet = new Set(citations.map((c) => c.ref.split('.')[0]));
  const keywords = new Set(words(t).filter((w) => w.length > 4));
  out.cases = data.cases.map((k) => {
    let s = 0;
    for (const x of [...k.ours, ...k.theirs]) if (refSet.has(x.split(/[.(]/)[0])) s += 1;
    for (const w of words(k.title + ' ' + k.claimed)) if (keywords.has(w)) s += 1.5;
    for (const l of k.letters) if (letterRefs.some((r) => String(l.no).endsWith(String(r.no)) && ((r.kind === 'er' && l.dir === 'in') || (r.kind === 'ours' && l.dir === 'out')))) s += 6;
    return { k, s };
  }).filter((x) => x.s >= 4).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.k);

  out.marks.sort((a, b) => a.start - b.start || b.end - a.end);
  return out;
}
