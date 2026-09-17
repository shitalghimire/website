/* Case files — real TKV disputes, explained */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { head, rich, refChip, stamp, sec } from './ui.js';

const TONE = { lost: ['Lost so far', 'tape'], partial: ['Partly won', 'warn'], open: ['Still open', ''], won: ['Won', 'ok'] };

export default function cases(view, { args, ctx, data }) {
  if (args[0]) return detail(view, ctx, data, data.cases.find((k) => k.id === args[0]));
  ctx.crumbs([{ label: 'Case files' }]);
  view.append(
    head(h('span', 'Case ', h('em', 'files')), 'The real claims and disputes on TKV, from the letters in the Letter Recording and Claims & Variation folders. For each: what happened, which clauses each side used, the result, what worked, what did not — and how to write the next letter.'),

    h('div.case-doors',
      h('a.door.door--ex', { href: '#/exchange' },
        h('span.door__ic', icon('exchange')),
        h('span.door__body',
          h('span.eyebrow', 'Learn the moves'),
          h('h3.door__t', 'How a claim travels'),
          h('p.door__s', 'The whole route, letter by letter: what you send to the Engineer and the Employer, inside which clock — and what to do with every kind of letter that lands back on you.')),
        icon('arrow')),
      h('a.door.door--bl', { href: '#/baseline' },
        h('span.door__ic', icon('gantt')),
        h('span.door__body',
          h('span.eyebrow', 'Case study'),
          h('h3.door__t', 'The baseline that was never approved'),
          h('p.door__s', 'Twenty-two months, eleven reminders and one Primavera file — and the reason eleven of twelve delay events came back with nothing.')),
        icon('arrow')),
      h('a.door.door--eot', { href: '#/eot' },
        h('span.door__ic', icon('clock')),
        h('span.door__body',
          h('span.eyebrow', 'Case study · the first EOT'),
          h('h3.door__t', 'EOT-01, and the twelve delay events'),
          h('p.door__s', '525 days claimed in January 2026, 228 determined on one event and nothing in money — with the delay analysis that decides these things.')),
        icon('arrow')),
      h('a.door.door--eot2', { href: '#/eot/2' },
        h('span.door__ic', icon('scale')),
        h('span.door__body',
          h('span.eyebrow', 'Case study · the second EOT'),
          h('h3.door__t', 'The resubmission — 587 days'),
          h('p.door__s', 'Back in five months later at USD 7.38 million, superseding the first entirely, and the seven reasons it still could not be assessed.')),
        icon('arrow'))),

    h('div.cases', data.cases.map((k, i) => h('a.casefile', { href: `#/cases/${k.id}`, style: { '--i': i } },
      h('span.casefile__tab', k.no),
      h('div.casefile__body',
        h('div.row', h('span.muted.mono', k.period), stamp(TONE[k.tone][0], TONE[k.tone][1], i % 2 ? 3 : -3)),
        h('h3.casefile__t', k.title),
        h('p.casefile__c', k.claimed),
        h('p.casefile__r', h('b', 'Result: '), k.result),
        h('div.chips', [...new Set(k.ours)].slice(0, 5).map((x) => h('span.chip', x))))))));
}

function detail(view, ctx, data, k) {
  if (!k) { view.append(h('div.empty', 'No such case. ', h('a', { href: '#/cases' }, 'All cases'))); return; }
  ctx.crumbs([{ label: 'Case files', href: '#/cases' }, { label: k.no }]);
  const [tl, tk] = TONE[k.tone];
  view.append(
    h('header.cs-head',
      h('div', h('p.eyebrow', `${k.no} · ${k.period}`), h('h1.head__title', k.title), h('p.head__sub', k.claimed)),
      h('div.cs-head__res', stamp(tl, tk, -6), h('p', k.result))),
    h('div.cs-layout',
      h('div.cs-main',
        h('section.cs-story', h('h2.cs-h', 'What happened'), h('ol', k.story.map((s) => h('li', rich(s))))),
        h('div.plain__two',
          h('div.plain__use', h('h3.plain__h', icon('check'), 'What worked'), h('ul', k.worked.map((x) => h('li', rich(x))))),
          h('div.plain__watch', h('h3.plain__h', icon('alert'), 'What went wrong'), h('ul', k.failed.map((x) => h('li', rich(x)))))),
        h('section.cs-next', h('h2.cs-h', icon('pen'), 'If you write the next letter'), h('ol', k.next.map((x) => h('li', rich(x))))),
        h('section.cs-thread', h('h2.cs-h', 'The correspondence'),
          h('div.thread', k.letters.map((l) => h(`div.thread__l.thread__l--${l.dir}`,
            h('span.thread__who', l.dir === 'in' ? 'Engineer' : 'Us'),
            h('div.thread__card', h('span.thread__no.mono', l.dir === 'in' && /^\d/.test(l.no) ? `LOT-01/…/${l.no}` : l.no), h('span.thread__date.mono', l.date), h('p', l.subject))))))),
      h('aside.cs-side',
        h('section.side-card', h('h3.side-card__h', 'Clauses we used'), h('div.chips', [...new Set(k.ours)].map((x) => refChip(x)))),
        h('section.side-card', h('h3.side-card__h', 'Clauses the Engineer used'), h('div.chips', [...new Set(k.theirs)].map((x) => refChip(x)))),
        h('section.side-card', h('h3.side-card__h', 'Learn the moves'), h('a.btn.btn--sm', { href: '#/exchange' }, icon('exchange'), 'How the exchange works'), h('a.btn.btn--sm.btn--ghost', { href: '#/baseline' }, icon('chart'), 'The baseline story')),
        h('p.muted.cs-note', 'Summaries are paraphrased from the project letters; letter numbers let you find the originals in Nutstore.'))));
}
