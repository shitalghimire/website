/* Tools room */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { head, sec } from './ui.js';
import { WIDGETS } from './widgets.js';
import letterCheck from './lettercheck.js';
import draft from './draft.js';

/* the two letter tools lead the room — they are the ones used every week */
const LETTERS = [
  ['letter-check', 'Letter check', 'Paste a letter — theirs or yours. It finds the clauses, starts the clocks, spots the weak words and scores a claim on Cause, Effect, Entitlement and Substantiation.', 'scan',
    ['Clocks from the date you received it', 'Their mistakes, ready to use', 'Pre-flight for your own letters']],
  ['draft', 'Draft a letter', 'Pick the letter type, fill in the facts and it writes itself in the TKV house format — with the send-by date on top and a live pre-flight as you type.', 'pen',
    ['Notices, claims, replies, requests', 'Live check while you write', 'Copy, Word or print']],
];

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

export default function tools(view, opts) {
  const { args, ctx, data } = opts;
  if (args[0] === 'letter-check') return letterCheck(view, opts);
  if (args[0] === 'draft') return draft(view, { ...opts, args: args.slice(1) });

  const t = TOOLS.find((x) => x[0] === args[0]);
  if (t) {
    ctx.crumbs([{ label: 'Tools', href: '#/tools' }, { label: t[1] }]);
    view.append(head(t[1], t[2]), WIDGETS[t[0]](data));
    return;
  }

  ctx.crumbs([{ label: 'Tools' }]);
  const drafts = Object.keys(store.get().drafts || {}).length;
  view.append(
    head(h('span', 'The ', h('em', 'tools')), 'Letter tools and calculators built on the actual PCC numbers and TKV letters — not generic FIDIC defaults.'),
    h('div.tl-feature', LETTERS.map(([id, title, sub, ic, points]) => h(`a.tl-big.tl-big--${id}`, { href: `#/tools/${id}` },
      h('div.tl-big__art', { 'aria-hidden': 'true' }, art(id)),
      h('div.tl-big__body',
        h('span.tl-big__ic', icon(ic)),
        h('h2.tl-big__t', title, id === 'draft' && drafts ? h('span.tl-big__badge', `${drafts} saved`) : null),
        h('p.tl-big__w', sub),
        h('ul.tl-big__pts', points.map((p) => h('li', icon('check'), p))),
        h('span.tl-big__go', id === 'draft' ? 'Start a letter' : 'Check a letter', icon('arrow')))))),
    sec('Calculators and practice', 'Numbers'),
    h('div.grid.grid--3', TOOLS.map(([id, title, sub, ic]) => h('a.card.card--link.toolcard', { href: `#/tools/${id}` }, h('span.tplcard__icon', icon(ic)), h('h3.tplcard__t', title), h('p.tplcard__w', sub)))));
}

/* A small drawing on each card: a letter being scanned, a letter being written. */
function art(id) {
  const lines = (x, y, ws) => ws.map((w, i) => `<rect x="${x}" y="${y + i * 11}" width="${w}" height="4" rx="2" class="tl-art__ln"/>`).join('');
  const svg = id === 'letter-check'
    ? `<svg viewBox="0 0 220 140">
        <rect x="46" y="12" width="128" height="120" rx="6" class="tl-art__pg"/>
        ${lines(60, 28, [70, 96, 88, 100, 64, 92, 80, 56])}
        <rect x="58" y="47" width="46" height="8" rx="2" class="tl-art__hl tl-art__hl--a"/>
        <rect x="102" y="80" width="48" height="8" rx="2" class="tl-art__hl tl-art__hl--b"/>
        <rect x="40" y="0" width="140" height="3" rx="1.5" class="tl-art__scan"/>
      </svg>`
    : `<svg viewBox="0 0 220 140">
        <rect x="46" y="12" width="128" height="120" rx="6" class="tl-art__pg"/>
        ${lines(60, 28, [52, 96, 100, 88])}
        <rect x="60" y="72" width="0" height="4" rx="2" class="tl-art__ln tl-art__type"/>
        <path d="M150 92 l22 -22 6 6 -22 22 -9 3z" class="tl-art__pen"/>
        <text x="110" y="120" class="tl-art__stamp" text-anchor="middle">DRAFT</text>
      </svg>`;
  return h('div.tl-art', { html: svg });
}
