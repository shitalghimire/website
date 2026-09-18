/* The TKV letter register — searchable index of the correspondence tracker,
   with the letters themselves (full text and a plain summary) where they are on file */

import { h, mount, marked, debounce, copy } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import C from '../engine/contract.js';
import { normLetterRef, registerKey } from '../engine/letters.js';
import { dirLabel } from '../engine/search.js';
import { head, refChip } from './ui.js';
import { openLetter } from './letterreader.js';

const DIRS = [['all', 'All'], ['in', 'Engineer → us'], ['out', 'Us → Engineer'], ['er-emp', 'Engineer → Employer'], ['emp', 'Employer'], ['gov', 'Government']];

export default function register(view, { ctx, data, params }) {
  ctx.crumbs([{ label: 'Letters' }]);
  const R = data.register;
  const byKey = new Map();
  R.forEach((r, i) => { const k = registerKey(r); if (k) byKey.set(k, i); });
  const years = [...new Set(R.map((r) => (r.d || '').slice(0, 4)).filter((y) => /^20\d\d$/.test(y)))].sort();
  const tags = [...new Set(R.flatMap((r) => r.t || []))].sort();
  const withText = R.filter((r) => r.x).length;

  let dir = 'all'; let year = 'all'; let tag = ''; let q = params.get('q') || ''; let limit = 80; let onlyText = false;
  let rows = [];
  const input = h('input.input', { type: 'search', placeholder: 'Search subjects: suspension, Adit-3, royalty, 53.6, IPC…', value: q });
  const count = h('span.muted');
  const list = h('div.reg-list');
  const detailBox = h('aside.reg-detail');

  const filters = h('div.reg-filters',
    h('div.seg', DIRS.map(([id, l]) => h('button', { type: 'button', 'aria-pressed': String(id === dir), onclick: (e) => { dir = id; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); limit = 80; draw(); } }, l))),
    h('select.select.reg-sel', { onchange: (e) => { year = e.target.value; draw(); } }, h('option', { value: 'all' }, 'All years'), years.map((y) => h('option', { value: y }, y))),
    h('select.select.reg-sel', { onchange: (e) => { tag = e.target.value; draw(); } }, h('option', { value: '' }, 'All tags'), tags.map((t) => h('option', { value: t }, t))),
    withText ? h('label.check.reg-only', h('input', { type: 'checkbox', onchange: (e) => { onlyText = e.target.checked; limit = 80; draw(); } }), icon('doc'), `Full text only (${withText.toLocaleString()})`) : null);

  view.append(
    head(h('span', 'The letter ', h('em', 'register')), `All ${R.length.toLocaleString()} letters from the TKV correspondence tracker — subjects, dates, references and reply chains. ${withText ? `${withText.toLocaleString()} of them can be read in full, with a plain summary. ` : ''}Search by subject, number or clause; open one to follow its thread.`),
    h('div.reg-bar', input, count), filters,
    h('div.reg-layout', list, detailBox));

  input.addEventListener('input', debounce(() => { q = input.value; limit = 80; draw(); }, 120));

  function match(r) {
    if (dir !== 'all' && !(dir === 'gov' ? /^gov/.test(r.c) : r.c === dir)) return false;
    if (year !== 'all' && !(r.d || '').startsWith(year)) return false;
    if (tag && !(r.t || []).includes(tag)) return false;
    if (onlyText && !r.x) return false;
    if (!q.trim()) return true;
    const hay = `${r.s} ${r.n} ${(r.t || []).join(' ')} ${(r.k || []).join(' ')} ${r.sm?.s || ''}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  }

  function draw() {
    rows = R.map((r, i) => ({ r, i })).filter(({ r }) => match(r)).sort((a, b) => (b.r.d || '').localeCompare(a.r.d || ''));
    count.textContent = `${rows.length.toLocaleString()} letter${rows.length === 1 ? '' : 's'}`;
    const terms = q.trim() ? q.trim().split(/\s+/) : [];
    mount(list,
      rows.slice(0, limit).map(({ r, i }) => h(`button.reg-row.reg-row--${r.c}`, { type: 'button', dataset: { i }, onclick: () => show(i) },
        h('span.reg-row__dir', r.c === 'in' ? '←' : r.c === 'out' ? '→' : '·'),
        h('span.reg-row__main', h('span.reg-row__s', marked(r.s, terms)), h('span.reg-row__m', `${r.d || '—'} · ${r.n}`, (r.t || []).length ? ` · ${r.t.join(', ')}` : '')),
        r.x ? h('span.reg-row__doc', { title: r.sm ? 'Full letter and summary on file' : 'Full letter on file' }, icon('doc')) : h('span'))),
      rows.length > limit ? h('button.btn.btn--sm.reg-more', { type: 'button', onclick: () => { limit += 200; draw(); } }, `Show more (${rows.length - limit} left)`) : null,
      !rows.length ? h('div.empty', 'No letters match.') : null);
  }

  function read(i, tab) {
    openLetter(data, i, {
      tab,
      list: rows.filter((x) => x.r.x).map((x) => x.i),   // ← / → step through the readable letters only
      onShow: (j) => show(j, { quiet: true }),
    });
  }

  function show(i, { quiet = false } = {}) {
    const r = R[i];
    list.querySelectorAll('.reg-row.is-on').forEach((b) => b.classList.remove('is-on'));
    list.querySelector(`.reg-row[data-i="${i}"]`)?.classList.add('is-on');
    const link = (raw) => {
      const n = normLetterRef(raw);
      const j = n ? byKey.get(n.key) : undefined;
      return j != null ? h('button.reg-link', { type: 'button', onclick: () => show(j) }, h('span.mono', raw), h('span', R[j].s)) : h('span.reg-link.is-off', h('span.mono', raw));
    };
    const me = registerKey(r);
    const repliedBy = me ? R.map((x, j) => ({ x, j })).filter(({ x }) => (x.r || []).some((ref) => normLetterRef(ref)?.key === me)) : [];
    const clauseRefs = C.findRefs(r.s).filter((c) => c.doc !== 'spec' && c.doc !== 'other');
    mount(detailBox, h('div.reg-card',
      h('p.eyebrow', dirLabel(r.c)),
      h('h3.reg-card__s', r.s),
      h('p.mono.reg-card__n', `${r.n} · ${r.d || 'no date'}`),
      clauseRefs.length ? h('div.chips', clauseRefs.map((c) => refChip(c.ref))) : null,
      r.t?.length || r.k?.length ? h('div.chips', [...(r.t || []), ...(r.k || [])].map((t) => h('span.chip.chip--plain', t))) : null,
      r.sm ? h('div.reg-card__sum', h('span.label', 'In short'), h('p', r.sm.s)) : null,
      r.x
        ? h('div.reg-card__read',
          h('button.btn.btn--stamp.btn--sm', { type: 'button', onclick: () => read(i, 'letter') }, icon('doc'), 'Read the letter'),
          h('button.btn.btn--sm', { type: 'button', onclick: () => read(i, 'summary') }, icon('spark'), r.sm ? 'Summary' : 'Clauses and thread'))
        : h('p.reg-card__none', icon('info'), h('span', 'Only the register entry is on file for this letter — not the letter itself.')),
      r.r?.length ? h('div.reg-card__sec', h('span.label', 'Refers to'), r.r.map(link)) : null,
      r.rp?.length ? h('div.reg-card__sec', h('span.label', 'Replied by'), r.rp.map(link)) : null,
      repliedBy.length ? h('div.reg-card__sec', h('span.label', 'Letters that cite this one'), repliedBy.slice(0, 12).map(({ x }) => link(x.n))) : null,
      h('div.row', h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: () => copy(`${r.n} dated ${r.d || '—'} — ${r.s}`) }, icon('copy'), 'Copy the reference line'))));
    detailBox.classList.add('is-on');
    if (!quiet && matchMedia('(max-width: 1000px)').matches) detailBox.scrollIntoView({ behavior: 'smooth' });
  }

  draw();
  if (params.get('i')) {
    const i = +params.get('i');
    show(i);
    if (params.get('read') && R[i]) read(i, params.get('read') === 'summary' ? 'summary' : 'letter');
  } else mount(detailBox, h('div.empty', 'Choose a letter to see its references and replies.'));
}
