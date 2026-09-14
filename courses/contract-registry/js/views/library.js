/* The clause library — sections as folders */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import C, { SECTIONS } from '../engine/contract.js';
import { head, levelBadge } from './ui.js';

const FILTERS = [
  ['all', 'All'], ['core', 'Core'], ['pcc', 'Changed by PCC'], ['clock', 'Has a deadline'], ['learned', 'Learned'], ['saved', 'Saved'],
];

export default function library(view, { params, ctx }) {
  ctx.crumbs([{ label: 'Clauses' }]);
  let filter = params.get('f') || 'all';
  const st = store.get();
  const all = C.allClauses();
  const amended = (c) => c.pcc.length || c.subs.some((s) => s.pcc.length);

  const seg = h('div.seg', { role: 'group', 'aria-label': 'Filter' }, FILTERS.map(([id, label]) => h('button', { type: 'button', 'aria-pressed': String(id === filter), onclick: () => { filter = id; draw(); seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === label))); } }, label)));
  const body = h('div.lib');

  view.append(
    head('The Clauses', 'All 98 General Conditions and the Particular Conditions laid over them. Red tape marks every clause the PCC changes. Open any clause for plain words, the exact text, deadlines and how it was used on TKV.',
      [h('a.btn', { href: '#/learn' }, icon('cap'), 'Guided path')]),
    h('div.lib__bar', seg, h('span.muted.lib__count')),
    body);

  function draw() {
    const pass = (c) => filter === 'all' || (filter === 'core' && c.plain?.level === 'core') || (filter === 'pcc' && amended(c))
      || (filter === 'clock' && c.plain?.d?.length) || (filter === 'learned' && st.learned[c.no]) || (filter === 'saved' && st.bookmarks[c.no]);
    const shown = all.filter(pass);
    view.querySelector('.lib__count').textContent = `${shown.length} clause${shown.length === 1 ? '' : 's'}`;
    const bySec = {};
    for (const c of shown) (bySec[c.section] ??= []).push(c);
    mount(body, Object.keys(SECTIONS).filter((k) => bySec[k]).map((k) => h('section.folder.lib__sec', { dataset: { tab: `${k === 'P' ? 'PCC' : k}. ${SECTIONS[k]}` } },
      h('div.lib__list', bySec[k].map((c) => h(`a.lib__row${amended(c) ? '.tape' : ''}`, { href: `#/read/${c.no}` },
        h('span.lib__no', c.no),
        h('span.lib__main', h('span.lib__t', c.title), h('span.lib__g', c.plain?.gist || '')),
        h('span.lib__meta',
          c.plain?.d?.length ? h('span.lib__clock', { title: 'Has deadlines' }, icon('clock')) : null,
          levelBadge(c.plain?.level),
          st.learned[c.no] ? h('span.lib__done', { title: 'Learned' }, icon('check')) : null)))))));
    if (!shown.length) mount(body, h('div.empty', 'Nothing here yet.'));
  }
  draw();
}
