/* Shared view components */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import C, { ACTION_LABEL } from '../engine/contract.js';

/* A clause reference chip — links to the clause, shows the title on hover */
export function refChip(raw, opts = {}) {
  const r = C.resolve(raw);
  const label = opts.label || (opts.prefix === false ? raw : raw);
  if (!r) return h('span.chip.chip--warn', { title: 'Not a clause in this contract' }, label);
  const amended = C.isAmended(raw);
  return h(`a.chip${amended ? '.chip--pcc' : ''}`, { href: C.hrefOf(raw), title: `${C.titleOf(raw)}${amended ? ' — changed by the PCC' : ''}` }, label);
}

/* Plain text with clause refs turned into links. Safe: builds nodes only. */
const INLINE = /(\*\*[^*]+\*\*)|((?:PCC|GCC|SCC)\s+\d{1,3}(?:\.\d{1,2})?(?:\([a-z]{1,2}\))?|\b\d{1,3}\.\d{1,2}(?:\([a-z]{1,2}\))?(?![\d%])|\bClause\s+\d{1,3}\b|\b(?:Clauses?|Sub-Clauses?)\s+\d{1,3}(?:\.\d{1,2})?)/g;
export function rich(text) {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of String(text).matchAll(INLINE)) {
    const before = text.slice(Math.max(0, m.index - 6), m.index);
    if (m[2] && /(NPR|NRs|Rs\.?|USD|\d[.,])\s*$/i.test(before)) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 4);
    if (m[2] && /^\s*(m\b|mm|MW|kN|%|km|L\b)/.test(after)) continue;
    if (m.index > last) frag.append(text.slice(last, m.index));
    if (m[1]) frag.append(h('strong', m[1].slice(2, -2)));
    else {
      const num = m[2].replace(/^(PCC|GCC|SCC|Clauses?|Sub-Clauses?)\s+/i, '');
      const r = C.resolve(num);
      frag.append(r ? h(`a.ref${C.isAmended(num) ? '.ref--pcc' : ''}`, { href: C.hrefOf(num), title: C.titleOf(num) }, m[2]) : m[2]);
    }
    last = m.index + m[0].length;
  }
  frag.append(text.slice(last));
  return frag;
}

export const stamp = (text, kind = '', rot) => h(`span.stamp${kind ? '.stamp--' + kind : ''}`, { style: rot != null ? { '--rot': rot + 'deg' } : null }, text);

export function head(title, sub, actions) {
  return h('header.head', h('div', h('h1.head__title', title), sub ? h('p.head__sub', sub) : null), actions ? h('div.head__actions', actions) : null);
}

export const sec = (title, eyebrow) => h('h2.sec__title', eyebrow ? h('span.eyebrow', eyebrow) : null, title);

/* one block of verbatim contract text */
export function blocks(list, { mark } = {}) {
  let li = 0;
  const out = [];
  let prevDepth = 0;
  for (const b of list) {
    if (b.t === 'def') out.push(h('p.ct__def', h('span.ct__mk', `(${b.mark})`), h('span', b.term ? [h('b', b.term), b.text.slice(b.term.length)] : b.text)));
    else if (b.t === 'li') {
      if (b.d !== prevDepth) li = 0;
      const mk = b.d >= 2 ? roman(++li) : letter(++li);
      out.push(h(`p.ct__li.ct__li--${b.d}`, h('span.ct__mk', `(${mk})`), h('span', b.text)));
      prevDepth = b.d;
    } else { out.push(h('p.ct__p', b.text)); li = 0; prevDepth = 0; }
  }
  return out;
}
const letter = (n) => n <= 26 ? String.fromCharCode(96 + n) : 'a' + String.fromCharCode(96 + n - 26);
const roman = (n) => ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'][n - 1] || n;

/* A PCC slip pasted onto the page */
export function slip(e, tables) {
  const paras = [];
  let listMode = false;
  for (const p of e.paras) {
    if (p === '[[TABLE:ms41]]') { paras.push(msTable(tables.ms41)); continue; }
    const isItem = listMode && p.length < 260 && !/^[A-Z][a-z]+ [a-z]+ (shall|will|is|are)\b/.test(p) && !/^(The|In|If|Where|Any|No|Such|For|Following|Unless|Notwithstanding|Consequently|Management|Design|Storage)\b/.test(p);
    paras.push(h(isItem ? 'p.slip__li' : 'p.slip__p', p));
    listMode = /:$/.test(p) || (isItem && !/\.$/.test(p));
  }
  if (e.table === 'ms7') paras.push(msTable(tables.ms7));
  if (e.table === 'adv') paras.push(h('ol.slip__ol', tables.adv.map((r) => h('li', h('b', `${r.pct}% — `), r.text))));
  return h(`section.slip.slip--${e.action}`, { id: 'pcc-' + e.id.replace(/[^\w-]/g, '_') },
    h('header.slip__head', h('span.slip__tag', 'PCC ' + e.target + (e.item ? `(${e.item})` : '')), h('span.slip__act', ACTION_LABEL[e.action] || 'PCC'), h('span.slip__title', e.title)),
    h('div.slip__body', paras));
}

export function msTable(rows) {
  let g = '';
  return h('div.scroll-x', h('table.ms', h('thead', h('tr', h('th', 'No.'), h('th', 'Milestone'), h('th.num', 'Day'))),
    h('tbody', rows.flatMap((r) => {
      const out = [];
      if (r.group && r.group !== g) { g = r.group; out.push(h('tr.ms__g', h('td', { colspan: 3 }, g))); }
      out.push(h('tr', h('td.num', r.no), h('td', r.text), h('td.num', h('b', r.days))));
      return out;
    }))));
}

export const deadlineChip = (d) => h('span.dl', { title: `${d.act} — ${d.ref}` }, h('b', `${d.n} ${d.unit}`), h('span', d.act), d.bar ? h('i.dl__bar', 'time bar') : null);

/* multiple-choice question with instant feedback */
export function question(id, q, { onAnswer } = {}) {
  const prev = store.get().answers[id];
  const box = h('div.q', { dataset: { id } });
  const opts = q.options.map((o, i) => h('button.q__opt', {
    type: 'button',
    onclick: () => {
      if (box.classList.contains('is-done')) return;
      box.classList.add('is-done');
      opts.forEach((b, j) => { b.classList.toggle('is-right', j === q.a); b.classList.toggle('is-wrong', j === i && i !== q.a); });
      why.hidden = false;
      store.update((s) => { s.answers[id] = { ok: i === q.a, at: Date.now() }; });
      onAnswer?.(i === q.a);
    },
  }, h('span.q__k', 'ABCD'[i]), h('span', o)));
  const why = h('div.q__why', { hidden: true }, h('span.q__verdict'), rich(q.why));
  box.append(h('p.q__q', q.q), h('div.q__opts', opts), why);
  if (prev) { box.classList.add('was-' + (prev.ok ? 'right' : 'wrong')); }
  return box;
}

export function levelBadge(level) {
  return h(`span.lvl.lvl--${level || 'rare'}`, { title: { core: 'Core — use weekly', useful: 'Useful — know it', rare: 'Rare — know it exists' }[level] || '' }, level === 'core' ? 'Core' : level === 'useful' ? 'Useful' : 'Rare');
}

export const iconBtn = (name, label, onclick, cls = '') => h(`button.btn.btn--ghost.btn--sm${cls}`, { type: 'button', onclick, title: label, 'aria-label': label }, icon(name), h('span.sr', label));
