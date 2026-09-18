/* ═══════════════════════════════════════════════════════════════
   Finder — one index over clauses, contract text, PCC, plain words,
   glossary, cases, letter types and the letter register.
   ═══════════════════════════════════════════════════════════════ */

import C from './contract.js';

const STOP = new Set('a an the of to in on for and or by with is are be as at from that this it its any such shall under which into than not no if all other their his he'.split(' '));

/* what people type → what the contract calls it */
const SYNONYMS = {
  eot: ['extension', 'time'], 'time bar': ['35.2', 'time-bar', 'notice'], timebar: ['35.2'], 'time-bar': ['35.2'],
  ld: ['liquidated', 'damages'], lds: ['liquidated', 'damages'], 'delay damages': ['liquidated'], penalty: ['liquidated', 'damages'],
  fm: ['force', 'majeure'], 'force majeure': ['67'], bandh: ['riot', 'strike', 'force'], curfew: ['rebellion', 'riot', 'force'], protest: ['riot', 'strike', 'disorder'],
  ipc: ['interim', 'payment'], bill: ['statement', 'payment'], invoice: ['statement', 'payment'],
  ncr: ['defect', 'reject'], rfc: ['review', 'resubmit', 'contractor\'s', 'documents'], 'returned for correction': ['27.8'],
  suspension: ['suspend', 'delay', 'ordered'], stop: ['suspend'], 'stop work': ['suspend'],
  possession: ['access', 'site'], land: ['possession', 'permission'], 'tree cutting': ['permission', 'possession', '10.1'],
  vo: ['variation'], 'change order': ['variation'], change: ['variation'], extra: ['variation', 'additional'],
  guarantee: ['security', 'guarantee'], bg: ['guarantee', 'security'], 'performance bond': ['performance', 'security'],
  retention: ['retention'], advance: ['advance', 'payment'], mobilisation: ['advance'], mobilization: ['advance'],
  determination: ['determination', '32'], dispute: ['dispute', 'arbitration'], arbitration: ['37'],
  'change in law': ['legislation', '53.6'], tax: ['tax', 'duties'], vat: ['value', 'added'], customs: ['duties'], royalty: ['royalties'],
  programme: ['program'], schedule: ['program'], baseline: ['program'], tia: ['program', 'delay'],
  approval: ['review', 'approval'], drawing: ['contractor\'s', 'documents', 'design'], design: ['design'],
  dlp: ['defects', 'liability'], 'latent defect': ['49.10'], toc: ['taking-over'], handover: ['taking-over'],
  engineer: ['employer\'s', 'representative'], er: ['employer\'s', 'representative'], consultant: ['employer\'s', 'representative'],
  notice: ['notice'], 'early warning': ['46'], meeting: ['management', 'meetings'], interface: ['other', 'contractors', '17'], 'lot-2': ['17'], lot2: ['17'],
  insurance: ['insurance'], explosive: ['explosives'], blasting: ['explosives', 'blasting'], monsoon: ['stock', '63.6', 'rain'],
  interest: ['late', 'payment', '56.2'], terminate: ['termination'], subcontractor: ['subcontract'], 'key personnel': ['38.12'],
};

const stem = (w) => w.length > 4 ? w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '') : w;
export const tokens = (s) => String(s).toLowerCase().replace(/[’']/g, "'").split(/[^a-z0-9'.()-]+/).map((t) => t.replace(/^[.'()-]+|[.'()-]+$/g, '')).filter((t) => t && !STOP.has(t)).map(stem);

let docs = [];
let inv = new Map();

export function build(data) {
  docs = [];
  const add = (d) => { d.id = docs.length; docs.push(d); };
  for (const c of C.allClauses()) {
    const p = c.plain || {};
    add({ type: 'clause', no: c.no, title: c.title, href: `#/read/${c.no}`, w: 3, text: `${c.title} ${p.gist || ''} ${(p.tags || []).join(' ')}`, snippet: p.gist || '' });
    for (const s of c.subs) {
      const t = s.blocks.map((b) => (b.term ? b.term + ' ' : '') + b.text).join(' ');
      if (t) add({ type: 'text', no: s.no, title: c.title, href: `#/read/${c.no}?s=${encodeURIComponent(s.key)}`, w: 1, text: t, snippet: t });
      for (const e of s.pcc) {
        const pt = e.paras.join(' ');
        add({ type: 'pcc', no: e.target + (e.item ? `(${e.item})` : ''), title: e.title, href: `#/read/${c.no}?s=${encodeURIComponent(e.target)}`, w: 1.4, text: `${e.title} ${pt}`, snippet: pt });
      }
    }
    for (const e of c.pcc) add({ type: 'pcc', no: e.target, title: e.title, href: `#/read/${c.no}`, w: 1.4, text: `${e.title} ${e.paras.join(' ')}`, snippet: e.paras.join(' ') });
    const pl = [...(p.points || []), ...(p.use || []), ...(p.watch || [])].join(' ');
    if (pl) add({ type: 'plain', no: c.no, title: c.title, href: `#/read/${c.no}`, w: 1.2, text: pl, snippet: pl });
  }
  for (const g of data.glossary) add({ type: 'word', no: g.ref || '', title: g.term, href: `#/words?t=${encodeURIComponent(g.term)}`, w: 2.2, text: `${g.term} ${g.term} ${g.text}`, snippet: g.text });
  for (const k of data.cases) add({ type: 'case', no: k.no, title: k.title, href: `#/cases/${k.id}`, w: 1.6, text: `${k.title} ${k.claimed} ${k.result} ${k.story.join(' ')}`, snippet: k.result });
  for (const t of data.writing.templates) add({ type: 'template', no: '', title: t.title, href: `#/tools/draft/${t.id}`, w: 1.8, text: `${t.title} ${t.when} ${t.clauses.join(' ')}`, snippet: t.when });
  for (const [i, r] of data.register.entries()) add({ type: 'letter', no: r.n, title: r.s, href: `#/register?i=${i}`, w: .9, text: `${r.s} ${r.n} ${(r.t || []).join(' ')}`, snippet: `${r.d || ''} · ${dirLabel(r.c)}` });

  inv = new Map();
  docs.forEach((d) => {
    const tf = new Map();
    for (const t of tokens(d.text)) tf.set(t, (tf.get(t) || 0) + 1);
    d.len = [...tf.values()].reduce((a, b) => a + b, 0) || 1;
    for (const [t, n] of tf) { if (!inv.has(t)) inv.set(t, []); inv.get(t).push([d.id, n]); }
  });
  return docs.length;
}

export const dirLabel = (c) => ({ in: 'Engineer → us', out: 'Us → Engineer', 'er-emp': 'Engineer → Employer', emp: 'Employer', 'gov-out': 'To Government', 'gov-in': 'From Government' }[c] || c);

export function query(q, { limit = 40 } = {}) {
  const raw = q.trim();
  if (!raw) return [];
  const results = new Map();
  const bump = (d, s) => { const r = results.get(d.id) || { doc: d, score: 0 }; r.score += s; results.set(d.id, r); };

  // clause numbers: "35", "35.1", "gcc 42.1", "35.4(a)"
  const num = raw.match(/^(?:gcc|pcc|scc|sub-?clause|clause)?\s*(\d{1,3}(?:\.\d{1,2})?(?:\([a-z]{1,2}\))?)$/i);
  if (num) {
    const r = C.resolve(num[1]);
    if (r) {
      docs.filter((d) => d.type === 'clause' && d.no === r.clause.no).forEach((d) => bump(d, 1000));
      if (r.sub) docs.filter((d) => (d.type === 'text' || d.type === 'pcc') && d.no.startsWith(r.sub.no)).forEach((d) => bump(d, 800));
      docs.filter((d) => d.type === 'text' && d.no.startsWith(r.clause.no + '.')).forEach((d) => bump(d, 120));
    }
  }

  const lower = raw.toLowerCase();
  let terms = tokens(raw);
  for (const [k, v] of Object.entries(SYNONYMS)) if (lower === k || lower.includes(k)) terms = terms.concat(v.map(stem));
  terms = [...new Set(terms)];
  const N = docs.length;
  for (const t of terms) {
    const post = inv.get(t);
    if (!post) {
      // prefix match for partial words
      if (t.length >= 3) for (const [key, p] of inv) if (key.startsWith(t)) for (const [id, n] of p) bump(docs[id], .6 * docs[id].w * n / Math.sqrt(docs[id].len));
      continue;
    }
    const idf = Math.log(1 + N / post.length);
    for (const [id, n] of post) { const d = docs[id]; bump(d, idf * d.w * (1 + Math.log(n)) / Math.sqrt(Math.sqrt(d.len))); }
  }
  if (raw.length > 4) for (const r of results.values()) if (r.doc.text.toLowerCase().includes(lower)) r.score *= 2.2;
  return [...results.values()].sort((a, b) => b.score - a.score).slice(0, limit).map((r) => ({ ...r.doc, score: r.score, terms: tokens(raw).filter((t) => t.length > 2) }));
}

export function snippet(text, terms, len = 170) {
  if (!text) return '';
  const low = text.toLowerCase();
  let at = -1;
  for (const t of terms) { const i = low.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0) return text.length > len ? text.slice(0, len) + '…' : text;
  const s = Math.max(0, at - 50);
  return (s ? '…' : '') + text.slice(s, s + len) + (s + len < text.length ? '…' : '');
}
