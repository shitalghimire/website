/* The TKV letter register — searchable index of the correspondence tracker */

import { h, mount, marked, debounce, copy } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import C from '../engine/contract.js';
import { normLetterRef } from '../engine/letters.js';
import { dirLabel, tokens } from '../engine/search.js';
import { head, refChip } from './ui.js';

const DIRS = [['all', 'All'], ['in', 'Engineer → us'], ['out', 'Us → Engineer'], ['er-emp', 'Engineer → Employer'], ['emp', 'Employer'], ['gov', 'Government']];

export default function register(view, { ctx, data, params }) {
  ctx.crumbs([{ label: 'Letters' }]);
  const R = data.register;
  const byKey = new Map();
  R.forEach((r, i) => { const n = normLetterRef(r.n); if (n && (r.c === 'in' || r.c === 'out')) byKey.set(n.key, i); });
  const years = [...new Set(R.map((r) => (r.d || '').slice(0, 4)).filter((y) => /^20\d\d$/.test(y)))].sort();
  const tags = [...new Set(R.flatMap((r) => r.t || []))].sort();

  let dir = 'all'; let year = 'all'; let tag = ''; let q = params.get('q') || ''; let limit = 80;
  const input = h('input.input', { type: 'search', placeholder: 'Search subjects: suspension, Adit-3, royalty, 53.6, IPC…', value: q });
  const count = h('span.muted');
  const list = h('div.reg-list');
  const detailBox = h('aside.reg-detail');

  const filters = h('div.reg-filters',
    h('div.seg', DIRS.map(([id, l]) => h('button', { type: 'button', 'aria-pressed': String(id === dir), onclick: (e) => { dir = id; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); limit = 80; draw(); } }, l))),
    h('select.select.reg-sel', { onchange: (e) => { year = e.target.value; draw(); } }, h('option', { value: 'all' }, 'All years'), years.map((y) => h('option', { value: y }, y))),
    h('select.select.reg-sel', { onchange: (e) => { tag = e.target.value; draw(); } }, h('option', { value: '' }, 'All tags'), tags.map((t) => h('option', { value: t }, t))));

  view.append(
    head(h('span', 'The letter ', h('em', 'register')), `All ${R.length.toLocaleString()} letters from the TKV correspondence tracker — subjects, dates, references and reply chains. Search by subject, number or clause; open one to follow its thread.`),
    h('div.reg-bar', input, count), filters,
    h('div.reg-layout', list, detailBox));

  input.addEventListener('input', debounce(() => { q = input.value; limit = 80; draw(); }, 120));

  function match(r) {
    if (dir !== 'all' && !(dir === 'gov' ? /^gov/.test(r.c) : r.c === dir)) return false;
    if (year !== 'all' && !(r.d || '').startsWith(year)) return false;
    if (tag && !(r.t || []).includes(tag)) return false;
    if (!q.trim()) return true;
    const hay = `${r.s} ${r.n} ${(r.t || []).join(' ')} ${(r.k || []).join(' ')}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  }

  function draw() {
    const rows = R.map((r, i) => ({ r, i })).filter(({ r }) => match(r)).sort((a, b) => (b.r.d || '').localeCompare(a.r.d || ''));
    count.textContent = `${rows.length.toLocaleString()} letter${rows.length === 1 ? '' : 's'}`;
    const terms = q.trim() ? q.trim().split(/\s+/) : [];
    mount(list,
      rows.slice(0, limit).map(({ r, i }) => h(`button.reg-row.reg-row--${r.c}`, { type: 'button', onclick: () => show(i) },
        h('span.reg-row__dir', r.c === 'in' ? '←' : r.c === 'out' ? '→' : '·'),
        h('span.reg-row__main', h('span.reg-row__s', marked(r.s, terms)), h('span.reg-row__m', `${r.d || '—'} · ${r.n}`, (r.t || []).length ? ` · ${r.t.join(', ')}` : ''))),
      ),
      rows.length > limit ? h('button.btn.btn--sm.reg-more', { type: 'button', onclick: () => { limit += 200; draw(); } }, `Show more (${rows.length - limit} left)`) : null,
      !rows.length ? h('div.empty', 'No letters match.') : null);
  }

  function show(i) {
    const r = R[i];
    const link = (raw) => {
      const n = normLetterRef(raw);
      const j = n ? byKey.get(n.key) : undefined;
      return j != null ? h('button.reg-link', { type: 'button', onclick: () => show(j) }, h('span.mono', raw), h('span', R[j].s)) : h('span.reg-link.is-off', h('span.mono', raw));
    };
    const repliedBy = R.map((x, j) => ({ x, j })).filter(({ x }) => (x.r || []).some((ref) => { const n = normLetterRef(ref); const me = normLetterRef(r.n); return n && me && n.key === me.key; }));
    const clauseRefs = C.findRefs(r.s);
    mount(detailBox, h('div.reg-card',
      h('p.eyebrow', dirLabel(r.c)),
      h('h3.reg-card__s', r.s),
      h('p.mono.reg-card__n', `${r.n} · ${r.d || 'no date'}`),
      clauseRefs.length ? h('div.chips', clauseRefs.map((c) => refChip(c.ref))) : null,
      r.t?.length || r.k?.length ? h('div.chips', [...(r.t || []), ...(r.k || [])].map((t) => h('span.chip.chip--plain', t))) : null,
      r.r?.length ? h('div.reg-card__sec', h('span.label', 'Refers to'), r.r.map(link)) : null,
      r.rp?.length ? h('div.reg-card__sec', h('span.label', 'Replied by'), r.rp.map(link)) : null,
      repliedBy.length ? h('div.reg-card__sec', h('span.label', 'Letters that cite this one'), repliedBy.slice(0, 12).map(({ x }) => link(x.n))) : null,
      h('div.row', h('button.btn.btn--sm', { type: 'button', onclick: () => copy(`${r.n} dated ${r.d || '—'} — ${r.s}`) }, icon('copy'), 'Copy the reference line'))));
    detailBox.classList.add('is-on');
    if (matchMedia('(max-width: 1000px)').matches) detailBox.scrollIntoView({ behavior: 'smooth' });
  }

  draw();
  if (params.get('i')) show(+params.get('i'));
  else mount(detailBox, h('div.empty', 'Choose a letter to see its references and replies.'));
}
