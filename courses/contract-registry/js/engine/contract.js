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
   Returns [{index, end, raw, ref, prefix, title, hasPrefix}] */
const REF_RE = /\b(?:(sub[-\s]?clauses?|clauses?|gcc|pcc|scc|sc)\s*(?:no\.?\s*)?)?(\d{1,3})\s*\.\s*(\d{1,2})(?!\s*\.\s*\d)(?:\s*\(\s*([a-z]{1,2}|[ivx]{1,4})\s*\))?|\b(sub[-\s]?clauses?|clauses?|gcc|pcc|scc)\s*(?:no\.?\s*)?(\d{1,3})\b(?!\s*\.\s*\d)(?:\s*\(\s*([a-z]{1,2})\s*\))?/gi;
const UNIT_AFTER = /^\s*(%|percent|m\b|mm|km|kn|kv|mw|kw|l\b|m3|m²|m2|days?|years?|months?|crore|lakh|million|x\b|°)/i;

export function findRefs(text) {
  const out = [];
  for (const m of text.matchAll(REF_RE)) {
    const prefix = (m[1] || m[5] || '').toLowerCase();
    const clause = m[2] || m[6];
    const subN = m[3];
    const item = (m[4] || m[7] || '').toLowerCase() || null;
    if (+clause === 0 || +clause > 120) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 8);
    const before = text.slice(Math.max(0, m.index - 12), m.index);
    if (!prefix && (UNIT_AFTER.test(after) || /(rs\.?|npr|usd|\$|€|no\.|v|version|rev\.?)\s*$/i.test(before) || /\d[.,]$/.test(before))) continue;
    if (!prefix && subN && /^0\d/.test(subN) && subN.length > 1) continue;
    // a title in [brackets] or (parentheses) right after the number
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 90);
    const tm = tail.match(/^\s*[[(]\s*([A-Z][^\])]{2,70})[\])]/);
    const ref = subN ? `${clause}.${subN}` : clause;
    out.push({
      index: m.index, end: m.index + m[0].length, raw: m[0], ref, clause, sub: subN ? ref : null, item,
      prefix, hasPrefix: !!prefix, quotedTitle: tm ? tm[1].trim() : null,
      spec: isSpecContext(text, m.index),
    });
  }
  return out;
}

function isSpecContext(text, i) {
  const win = text.slice(Math.max(0, i - 90), i + 40).toLowerCase();
  const cue = DATA?.reader?.specs?.cue;
  return cue ? new RegExp(cue, 'i').test(win) : false;
}

/* ── all deadlines from the plain layer ───────────────────────── */
export function deadlines() {
  const out = [];
  for (const c of allClauses()) for (const d of c.plain?.d || []) out.push({ ...d, clause: c.no, title: c.title });
  return out;
}

const api = { init, allClauses, getClause, getSub, resolve, titleOf, findRefs, hrefOf, isAmended, deadlines, firstLine, parseRef };
export default api;
