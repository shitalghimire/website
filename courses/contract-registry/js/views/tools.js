/* Tools room */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { head } from './ui.js';
import { WIDGETS } from './widgets.js';

const TOOLS = [
  ['ld-calc', 'Liquidated damages', 'Milestone or completion LDs, EOT offset, the 10% cap.', 'scale'],
  ['ipc-calc', 'Interim payment', 'Retention, advance recovery, VAT and the 60-day due date.', 'coin'],
  ['advance-sim', 'Advance recovery', 'When recovery starts and whether it clears before 80%.', 'shield'],
  ['milestones', 'Milestones', 'The 7 LD milestones and 41 programme milestones as dates.', 'flag'],
  ['lifecycle', 'Contract calendar', 'Commencement to latent defects, with EOT.', 'map'],
  ['risk-sort', 'Who carries the risk?', 'Sort twelve real risks — Employer, Force Majeure or you.', 'bolt'],
  ['mistakes', 'Spot the weak sentence', 'Real mistakes from TKV letters, and better wording.', 'alert'],
  ['playbooks', 'Reply playbooks', 'Step-by-step answers to the letters you receive most.', 'pen'],
];

export default function tools(view, { args, ctx, data }) {
  const t = TOOLS.find((x) => x[0] === args[0]);
  if (t) {
    ctx.crumbs([{ label: 'Tools', href: '#/tools' }, { label: t[1] }]);
    view.append(head(t[1], t[2]), WIDGETS[t[0]](data));
    return;
  }
  ctx.crumbs([{ label: 'Tools' }]);
  view.append(
    head(h('span', 'The ', h('em', 'tools')), 'Calculators and games built on the actual PCC numbers — not generic FIDIC defaults.'),
    h('div.grid.grid--3', TOOLS.map(([id, title, sub, ic]) => h('a.card.card--link.toolcard', { href: `#/tools/${id}` }, h('span.tplcard__icon', icon(ic)), h('h3.tplcard__t', title), h('p.tplcard__w', sub)))));
}
