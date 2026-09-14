/* Deadline clocks */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import * as D from '../lib/dates.js';
import C from '../engine/contract.js';
import { head, rich, refChip, sec } from './ui.js';
import { lifecycle } from './widgets.js';

const GROUPS = [
  ['Claims & notices', ['35', '46', '42', '68', '69', '20']],
  ['Determinations & disputes', ['32', '36']],
  ['Design & review', ['27', '8']],
  ['Money', ['56', '63', '64', '55', '80', '81']],
  ['Time, programme & reports', ['41', '17', '30', '61', '79']],
  ['People & site', ['38', '16', '23', '24', '31', '89', '93']],
  ['Tests, completion & defects', ['48', '49', '74', '75', '76', '77', '78']],
];

export default function clock(view, { ctx, params, data }) {
  ctx.crumbs([{ label: 'Clocks' }]);
  const all = C.deadlines();
  const pre = params.get('c');

  const sel = h('select.select', { 'aria-label': 'Deadline' },
    GROUPS.map(([g, nos]) => h('optgroup', { label: g }, all.filter((d) => nos.includes(d.clause)).sort((a, b) => nos.indexOf(a.clause) - nos.indexOf(b.clause)).map((d) => h('option', { value: all.indexOf(d), selected: all.filter((x) => x.clause === (pre || '35'))[0] === d }, `${d.ref} — ${d.act} (${d.n} ${d.unit})`)))),
    h('optgroup', { label: 'Other clauses' }, all.filter((d) => !GROUPS.some(([, nos]) => nos.includes(d.clause))).map((d) => h('option', { value: all.indexOf(d) }, `${d.ref} — ${d.act} (${d.n} ${d.unit})`))));
  const from = h('input.input', { type: 'date', value: D.iso(D.today()) });
  const email = h('input', { type: 'checkbox' });
  const label = h('input.input', { type: 'text', placeholder: 'What is this for? e.g. Spillway outlet access — notice of claim' });
  const result = h('div.clk-result');

  const calc = () => {
    const d = all[+sel.value];
    if (!d || !from.value) return;
    const base = email.checked ? D.addDays(D.fromIso(from.value), 3) : D.fromIso(from.value);
    const beforeish = /before/i.test(d.from);
    const due = beforeish ? D.add(base, -d.n, d.unit) : D.add(base, d.n, d.unit);
    const left = D.diffDays(D.today(), due);
    const pct = Math.max(0, Math.min(1, 1 - left / Math.max(1, D.diffDays(base, due) || 1)));
    mount(result,
      h(`div.clk-dial${left <= 3 ? '.is-hot' : ''}`, { style: { '--p': pct } },
        h('div.clk-dial__in', h('b', left < 0 ? 'late' : left), h('small', left < 0 ? `${-left} days ago` : left === 1 ? 'day left' : 'days left'))),
      h('div.clk-info',
        h('p.eyebrow', `${d.ref} · ${C.titleOf(d.ref.split(' ')[0]) || d.title}`),
        h('h3.clk-due', D.fmt(due), h('small', ` (${D.weekday(due)})`)),
        h('p', h('b', d.act), ' — ', `${d.n} ${d.unit} ${beforeish ? '' : 'from '}${d.from}`, email.checked ? ' · counted from receipt (+72 h email rule)' : ''),
        d.bar ? h('p.clk-bar', icon('alert'), 'Time bar — miss it and the right can be lost.') : null,
        h('div.row',
          h('button.btn.btn--stamp', { type: 'button', onclick: () => { store.update((s) => { s.clocks.push({ id: Date.now(), label: label.value || d.act, ref: d.ref, due: D.iso(due), from: D.iso(base) }); }); drawSaved(); } }, icon('clock'), 'Save this clock'),
          refChip(d.ref.split(' ')[0], { label: 'Read the clause' }))));
  };
  [sel, from, email].forEach((el) => el.addEventListener('input', calc));

  const saved = h('div.clk-saved');
  const drawSaved = () => {
    const list = store.get().clocks.map((k) => ({ ...k, d: D.fromIso(k.due) })).sort((a, b) => a.d - b.d);
    if (!list.length) { mount(saved, h('div.empty', 'No clocks saved. Count one above or save one from an analysed letter.')); return; }
    mount(saved, h('ul.clk-list', list.map((k) => {
      const left = D.diffDays(D.today(), k.d);
      return h(`li${left < 0 ? '.is-late' : left <= 3 ? '.is-hot' : ''}`,
        h('span.clk-list__d', left < 0 ? 'late' : left === 0 ? 'today' : `${left}d`),
        h('span.clk-list__b', h('b', k.label), h('small', `${k.ref} · due ${D.fmt(k.d)}${k.from ? ' · from ' + k.from : ''}`)),
        h('button.btn.btn--sm.btn--ghost', { type: 'button', title: 'Remove', onclick: () => { store.update((s) => { s.clocks = s.clocks.filter((x) => x.id !== k.id); }); drawSaved(); } }, icon('x')));
    })));
  };

  view.append(
    head(h('span', 'Deadline ', h('em', 'clocks')), 'Every time limit in the GCC and PCC in one place. Pick the clock, enter the start date, and save it. Remember: calendar days, and an email counts as received 72 hours after sending (PCC 15.1).'),
    h('section.clk',
      h('div.clk-form',
        h('label.field', h('span', 'Which clock?'), sel),
        h('div.w-grid', h('label.field', h('span', 'Start date (event / receipt)'), from), h('label.field', h('span', 'Label'), label)),
        h('label.check', email, 'Start date is when an email was sent — add 72 hours')),
      result),
    sec('Your clocks', 'Saved on this device'), saved,
    sec('The contract calendar', 'Key dates'), lifecycle(),
    sec('Every time limit at a glance', `${all.length} clocks`),
    h('div.clk-table.scroll-x', h('table.ms', h('thead', h('tr', h('th', 'Clause'), h('th', 'What'), h('th.num', 'Limit'), h('th', 'Counted from'))),
      h('tbody', all.map((d) => h('tr', h('td', refChip(d.ref.split(' ')[0], { label: d.ref })), h('td', d.act, d.bar ? h('span.dl__bar', ' time bar') : null), h('td.num', h('b', `${d.n} ${d.unit}`)), h('td.muted', d.from)))))));
  calc(); drawSaved();
}
