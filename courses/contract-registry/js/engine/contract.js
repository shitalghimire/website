/* ═══════════════════════════════════════════════════════════════
   The contract model — GCC + PCC + plain-English layer in one tree.
   ═══════════════════════════════════════════════════════════════ */

export const SECTIONS = {
  A: 'General', B: 'Staff and Labour', C: 'Time Control', D: 'Quality Control',
  E: 'Cost Control', F: 'Force Majeure', G: 'Finishing the Contract', P: 'New Clauses in the PCC',
};

export const ACTION_LABEL = {
  replace: 'Replaced by the PCC', append: 'Added to by the PCC', insert: 'Inserted by the PCC',
  fill: 'Filled in by the PCC', new: 'New clause in the PCC',
};

let DATA = null;
const clauses = new Map();   // "35" → clause
const subs = new Map();      // "35.1" → sub (first) ; "56.3b" duplicates

export function init(data) {
  DATA = data;
  clauses.clear(); subs.clear();
  const { gcc, pcc } = data.contract;

  for (const c of gcc) {
    const clause = { no: String(c.no), n: c.no, title: c.title, section: c.section, gap: c.gap || null, subs: [], pcc: [], plain: data.plain[c.no] || null };
    for (const s of c.subs) {
      const sub = { no: s.no, key: s.key || s.no, clause, blocks: s.blocks, pcc: [], src: s.src || 'gcc', dupe: !!s.dupe };
      clause.subs.push(sub);
      if (!subs.has(sub.no)) subs.set(sub.no, sub);
      subs.set(sub.key, sub);
    }
    clauses.set(clause.no, clause);
  }

  for (const e of pcc.entries) {
    let clause = clauses.get(String(e.clause));
    if (!clause) {
      clause = { no: String(e.clause), n: e.clause, title: e.title, section: 'P', gap: null, subs: [], pcc: [], plain: data.plain[e.clause] || null, pccOnly: true };
      clauses.set(clause.no, clause);
    }
    e.tables = pcc.tables;
    if (!e.target.includes('.')) { clause.pcc.push(e); continue; }
    let sub = subs.get(e.target);
    if (!sub) {
      sub = { no: e.target, key: e.target, clause, blocks: [], pcc: [], src: 'pcc' };
      insertSub(clause, sub);
      subs.set(sub.no, sub);
    }
    sub.pcc.push(e);
  }

  // PCC 27.1 replaces 27.1 with three sub-clauses 27.1–27.3
  const r271 = subs.get('27.1')?.pcc.find((e) => e.action === 'replace');
  if (r271 && r271.paras.length >= 3) {
    const c27 = clauses.get('27');
    const [p1, p2, ...p3] = r271.paras;
    r271.paras = [p1];
    [['27.2', [p2]], ['27.3', p3]].forEach(([no, paras]) => {
      const sub = { no, key: no, clause: c27, blocks: [], src: 'pcc', pcc: [{ ...r271, id: `${no}-split`, ref: `PCC ${no}`, target: no, title: no === '27.3' ? 'The Employer is not responsible for errors in its Requirements' : 'Qualified designers', paras }] };
      insertSub(c27, sub); subs.set(no, sub);
    });
  }
  return api;
}

function insertSub(clause, sub) {
  const k = (no) => no.split('.').map(Number);
  const [, b] = k(sub.no);
  const i = clause.subs.findIndex((s) => k(s.no)[1] > b);
  if (i < 0) clause.subs.push(sub); else clause.subs.splice(i, 0, sub);
}

export const allClauses = () => [...clauses.values()].sort((a, b) => a.n - b.n);
export const getClause = (no) => clauses.get(String(no));
export const getSub = (no) => subs.get(String(no));
export const data = () => DATA;

/* ── references ───────────────────────────────────────────────── */
export function parseRef(raw) {
  const m = String(raw).replace(/\s+/g, '').match(/^(?:gcc|pcc|scc|sub-?clause|clause)?(\d{1,3})(?:\.(\d{1,2}))?(?:\(([a-z]{1,2}|[ivx]{1,4})\))?$/i);
  if (!m) return null;
  return { clause: m[1], sub: m[2] ? `${m[1]}.${m[2]}` : null, item: m[3] ? m[3].toLowerCase() : null };
}

export function resolve(raw) {
  const p = typeof raw === 'string' ? parseRef(raw) : raw;
  if (!p) return null;
  const clause = clauses.get(p.clause);
  if (!clause) return null;
  const sub = p.sub ? subs.get(p.sub) : null;
  if (p.sub && !sub) return null;
  return { clause, sub, item: p.item, label: labelOf(p) };
}

export const labelOf = (p) => (p.sub || p.clause) + (p.item ? `(${p.item})` : '');

export function titleOf(raw) {
  const r = resolve(raw);
  if (!r) return null;
  const pccTitle = r.sub?.pcc.find((e) => ['insert', 'new', 'replace'].includes(e.action) && e.title)?.title;
  if (r.sub?.src === 'pcc' && pccTitle) return pccTitle;
  return r.clause.title;
}

export const isAmended = (raw) => {
  const r = resolve(raw);
  if (!r) return false;
  return !!(r.sub ? r.sub.pcc.length : r.clause.pcc.length || r.clause.subs.some((s) => s.pcc.length));
};

export const hrefOf = (raw) => {
  const r = resolve(raw);
  if (!r) return '#/read';
  return `#/read/${r.clause.no}` + (r.sub ? `?s=${encodeURIComponent(r.sub.no)}` : '');
};

/* Plain text of a sub-clause (with PCC effect summarised) — for search and previews */
export function subText(sub) {
  return sub.blocks.map((b) => b.text).join(' ');
}

export function firstLine(raw) {
  const r = resolve(raw);
  if (!r) return '';
  if (r.sub) {
    const rep = r.sub.pcc.find((e) => ['replace', 'insert', 'new'].includes(e.action));
    const t = rep ? rep.paras.join(' ') : subText(r.sub) || r.sub.pcc.map((e) => e.paras.join(' ')).join(' ');
    return t.replace(/^(Delete|Replace|Insert|Add)[^:]*:\s*/i, '');
  }
  return r.clause.plain?.gist || '';
}

/* Find clause references in free text.
   Returns [{index, end, raw, ref, prefix, hasPrefix, quotedTitle, doc, spec}]

   A number only counts as a clause when the words around it say so.
   "Sub-Clause 53.6", "GCC 35.1", "Clauses 42.1 and 35.1", "53.6 [Variations]"
   and "under 20.1 of the GCC" are clauses. "2.1 MPa", "a safety factor of
   2.0", "1.5 times" and "1.54 m and 1.0 m" are not — a bare decimal is just
   a number unless something marks it as a clause.

   doc says which document the clause belongs to, when the letter says so:
     'contract'  … of the GCC / PCC / Conditions of Contract
     'spec'      … of the PTS / GTS / Technical Specifications / Section VI
     'other'     … of the ITB, a standard, a report, an Act, the BOQ …
     null        not stated */
/* "Sub-Clause", "Sub Clause", "Sub - clause", "GCC.", and the scan misreadings "Sub-Glause", "Sub{lause" */
const PREFIX = String.raw`sub\s*[-–{]?\s*(?:[cg][l1i])?auses?|sub\s*[-–{]?\s*[cg]?lauses?|[cg][l1i]auses?|gcc|pcc|scc|sc`;
const REF_RE = new RegExp(String.raw`\b(?:(${PREFIX})\s*[.:]?\s*\[?\s*(?:no\.?\s*)?)?(\d{1,3})\s*\.\s*(\d{1,2})(?!\s*\.\s*\d)(?!\d)(?:\s*\(\s*([a-z]{1,2}|[ivx]{1,4})\s*\))?|\b(${PREFIX})\s*[.:]?\s*\[?\s*(?:no\.?\s*)?(\d{1,3})\b(?!\s*\.\s*\d)(?:\s*\(\s*([a-z]{1,2})\s*\))?`, 'gi');
const UNIT_AFTER = /^\s*-?\s*(%|percent|m\b|meters?|metres?|m\/s|m³|m3|m²|m2|mm|cm|km|kn|kv|kva|mw|kw|mpa|kpa|gpa|n\/mm|kg|t\b|tons?|tonnes?|l\b|lit|days?|hrs?|hours?|years?|months?|weeks?|crore|lakh|million|times\b|x\b|°|degrees?|sec|seconds?|minutes?|mins?|nos?\.?\b|bags?|pcs|sets?|units?)/i;
const TITLE_AFTER = /^\]?\s*\[\s*([A-Za-z][^\]\n]{2,80}?)(?:\]|J(?=[\s,.;]|$))|^\s*\(\s*(?:["“‘']\s*([A-Za-z][^)\n]{2,78}?)["”’']|([A-Z][a-z][^)\n]{2,78}))\s*\)/;
const DOC_CONTRACT = String.raw`GCC|PCC|SCC|General Conditions|Particular Conditions|Special Conditions|Conditions of (?:the )?Contract|Contract Agreement|Contract(?!or)\b`;
const DOC_SPEC = String.raw`GTS|PTS|TS\b|(?:General |Particular )?Technical Specifications?|Specifications?|Employer'?s Requirements?|Section\s+V?I+\b|Volume\s*[1-4]`;
const DOC_OTHER = String.raw`ITB|Instructions? to Bidders|BDS|Bid Data Sheet|IS\b|BS\b|EN\b|ASTM|AASHTO|ACI|Eurocode|IEC|ISO|IEEE|NBC|(?:relevant )?(?:code|standard)s?\b|(?:design |inspection |geological |test )?reports?\b|manual|method statement|BOQ|Bills? of Quantities|(?:JV |joint venture )?agreement|MoU|minutes|Act\b|Regulations?\b|Rules\b|Polic(?:y|ies)\b|Guidelines?\b|Circulars?\b|Directives?\b|DCN|Design Basis|Bank Guarantee`;
const OF = String.raw`^\s*,?\s*(of|in|under)\s+(?:the\s+)?(?:said\s+)?`;
const DOC_AFTER = [
  ['contract', new RegExp(OF + `(?:${DOC_CONTRACT})`, 'i')],
  ['contract', /^\s*(of)?\s*(?:the\s+)?(?:particular|general|special)\s+conditions?\b/i],
  ['spec', new RegExp(OF + `(?:${DOC_SPEC})`, 'i')],
  ['other', new RegExp(String.raw`^\s*,?\s*(of)\s+(?:the\s+)?(?:${DOC_OTHER})`, 'i')],
];
const DOC_BEFORE = [
  ['contract', /\b(?:GCC|PCC|SCC|General Conditions?|Particular Conditions?|Conditions? of (?:the )?Contract)\s*[-–,]?\s*(?:item|article)?\s*$/i],
  ['spec', /\b(?:GTS|PTS|TS|Technical Specifications?|Specifications?)\s*[-–,]?\s*$/i],
  ['other', /\b(?:ITB|BDS|IS|BS|EN|ASTM|ACI|IEC|ISO|Eurocode|Act|Regulations?|Code)\s*[-–,]?\s*$/i],
];
const LEADS_IN = /\b(?:under|pursuant to|in accordance with|in line with|as per|per|in terms of|according to|vide|invok(?:e|es|ed|ing)|refer(?:ring)? to|provisions? of|stipulated in|specified in|set out in|required by|governed by|notwithstanding|(?:provided|stated|contained|described|defined|envisaged|foreseen)(?:\s+for)?\s+(?:in|under)|(?:conditions|provisions|requirements|terms|scope|wording|meaning|operation|application) of)\s*$/i;
/* between two clauses of one list: "35.1, 35.2 and 42.1", "Sub-Clauses 4.5, 27.8, 32, 46.1" */
const JOINER = /^\]?(?:\s*(?:,|;|&|\/|~|and\/or|and|or|to|through|till|until|–|-)?\s*\d{1,3}(?:\.\d{1,2})?(?:\s*\([a-z]{1,2}\))?)*\s*(?:,|;|&|\/|~|and\/or|and|or|to|through|till|until|–|-)?\s*(?:,|and|or)?\s*$/i;
/* "the clauses discussed above (including 10.1, 95.2, 96.1)": the word clause opens a list */
const LIST_OPEN = /\b(?:sub\s*[-–]?\s*)?clauses?\b((?:[^.;:\n]|\.(?=\d)){0,60})$/i;
const LIST_FILLER = /\b(?:and|or|including|includes?|like|along with|as well as|together with|e\.g|i\.e|namely|such as|viz|discussed|mentioned|cited|listed|above|below|the|these|those|under|of|in|gcc|pcc|conditions?|contract)\b|\d{1,3}(?:\.\d{1,2})?(?:\s*\([a-z]{1,2}\))?|\[[^\]]{2,80}\]|[\s,()–-]/gi;

export function findRefs(text) {
  const out = [];
  let prev = null;
  for (const m of text.matchAll(REF_RE)) {
    const prefix = (m[1] || m[5] || '').toLowerCase().replace(/\s+/g, '');
    const clause = m[2] || m[6];
    const subN = m[3];
    const item = (m[4] || m[7] || '').toLowerCase() || null;
    if (+clause === 0 || +clause > 120) continue;
    const start = m.index;
    const end = m.index + m[0].length;
    const tail = text.slice(end, end + 140);
    const before = text.slice(Math.max(0, start - 40), start);
    /* never part of a longer number: 5.5.5, 1,234.50, B.12.1, Rev.2.1 */
    if (!prefix && /(?:\d[.,]|[A-Za-z]\.)$/.test(text.slice(Math.max(0, start - 2), start))) continue;
    /* "PCC 1:3:6", "PCC 100 mm" — plain cement concrete, not the Particular Conditions */
    if (/^(pcc|sc|scc)$/.test(prefix) && (UNIT_AFTER.test(tail) || /^\s*[:x]\s*\d/i.test(tail) || /^\s*(?:grade|m\d)/i.test(tail))) continue;
    if (!prefix && UNIT_AFTER.test(tail)) continue;
    if (!prefix && subN && /^0\d/.test(subN)) continue;

    const tm = tail.match(TITLE_AFTER);
    const title = tm ? (tm[1] || tm[2] || tm[3]).trim() : null;
    const afterTitle = tm ? tail.slice(tm[0].length) : tail;
    let doc = null;
    let docOf = false;   // "… of the GCC" / "PTS 5.4": the letter names the document outright
    for (const [d, re] of DOC_AFTER) { const dm = afterTitle.match(re); if (dm) { doc = d; docOf = !dm[1] || dm[1].toLowerCase() === 'of'; break; } }
    if (!doc) for (const [d, re] of DOC_BEFORE) if (re.test(before)) { doc = d; docOf = true; break; }
    /* "Table 5.3", "Section 4.2", "item 3.1" are not clauses — unless the letter says "of the Conditions of Contract" */
    if (!prefix && !(doc === 'contract' && docOf) && /(rs\.?|npr|usd|inr|\$|€|no\.|v|ver\.?|version|rev\.?|ch\.?|chainage|el\.?|elevation|table|fig\.?|figure|item|page|section|chapter|annex|appendix|para(?:graph)?|volume|vol\.?|stage|activity|phase)\s*$/i.test(before)) continue;

    /* a bare number has to earn its place */
    if (!prefix) {
      const exists = !!resolve(subN ? `${clause}.${subN}` : clause);
      let continues = false;
      if (prev && start - prev.end < 120) {
        const gap = text.slice(prev.end, start)
          .replace(/^\]/, '').replace(/^\s*\[[^\]\n]{2,80}?(?:\]|J(?=[\s,.;]|$))/, '').replace(/^\s*\([^)\n]{2,80}\)/, '')
          .replace(new RegExp(OF + `(?:${DOC_CONTRACT}|${DOC_SPEC})`, 'i'), '');
        continues = JOINER.test(gap);
      }
      const lo = text.slice(Math.max(0, start - 90), start).match(LIST_OPEN);
      const listed = exists && !!lo && !lo[1].replace(LIST_FILLER, '').trim();
      const leads = exists && LEADS_IN.test(before);
      const bracketed = !!(tm && tm[1]);
      const titled = !!(tm && (tm[2] || (tm[3] && title.split(/\s+/).length >= 2)));
      const lettered = !!item && exists;   // 23.2(b), 67.1(f)
      if (!(continues || listed || bracketed || titled || lettered || (doc && docOf) || leads)) continue;
      if (continues && !doc) doc = prev.doc;
    }
    const ref = subN ? `${clause}.${subN}` : clause;
    const f = {
      index: start, end, raw: m[0], ref, clause, sub: subN ? ref : null, item,
      prefix, hasPrefix: !!prefix, quotedTitle: title, doc,
      spec: doc === 'spec' || (!doc && isSpecContext(text, start, end)),
    };
    out.push(f);
    prev = f;
  }
  return out;
}

/* the same sentence talks about the specification */
function isSpecContext(text, i, j = i) {
  const cue = DATA?.reader?.specs?.cue;
  if (!cue) return false;
  const a = Math.max(text.lastIndexOf('. ', i), text.lastIndexOf('\n', i), i - 160);
  const bRaw = text.slice(j, j + 120).search(/\.\s|\n/);
  const b = bRaw < 0 ? j + 120 : j + bRaw;
  return new RegExp(cue, 'i').test(text.slice(a, b));
}

/* the paragraph around a reference talks about the specification */
export function specParagraph(text, i) {
  const cue = DATA?.reader?.specs?.cue;
  if (!cue) return false;
  const a = Math.max(0, text.lastIndexOf('\n\n', i), i - 700);
  let b = text.indexOf('\n\n', i);
  if (b < 0 || b - i > 500) b = i + 500;
  const para = text.slice(a, b);
  return new RegExp(cue, 'i').test(para) || /\b\d{1,2}\.\d{1,2}\.\d{1,2}\b/.test(para);
}

/* ── all deadlines from the plain layer ───────────────────────── */
export function deadlines() {
  const out = [];
  for (const c of allClauses()) for (const d of c.plain?.d || []) out.push({ ...d, clause: c.no, title: c.title });
  return out;
}

const api = { init, allClauses, getClause, getSub, resolve, titleOf, findRefs, specParagraph, hrefOf, isAmended, deadlines, firstLine, parseRef };
export default api;
