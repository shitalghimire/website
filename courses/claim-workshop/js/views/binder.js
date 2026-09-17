/* 05 · The binder — how the submission is put together */

import { h, fx, mount, reveal, still } from '../lib.js';
import { icon } from '../icons.js';
import { BINDER } from '../content.js';
import { head, sec, note, ticks } from './parts.js';

export default function binder(page, { chapter }) {
  page.append(
    head(chapter, 'Ten sections, in this order, every time. The order is not decoration — it walks the reviewer from facts they cannot argue with to a conclusion they can barely avoid.'),

    book(),

    sec('Why this order works', 'The argument'),
    ladder(),

    sec('Two rules that matter more than the rest', 'Non-negotiable'),
    rules(),
  );
}

/* ═══════════ THE BINDER ═══════════
   A bound document with index tabs. Click a tab, the page turns. */
function book() {
  let at = 0;

  const tabs = h('div.bk__tabs');
  const sheet = h('div.bk__sheet');

  function draw(dir = 0) {
    const s = BINDER[at];
    mount(tabs, BINDER.map((b, i) => {
      const t = h('button.bk__tab', { type: 'button', 'aria-pressed': String(i === at), style: { '--i': i } },
        h('i', String(i + 1).padStart(2, '0')), h('span', b.tab));
      t.addEventListener('click', () => { const d = i > at ? 1 : -1; at = i; draw(d); });
      return t;
    }));

    const pageEl = h(`div.bk__pg${dir > 0 ? '.fwd' : dir < 0 ? '.bwd' : ''}`,
      h('div.bk__head',
        h('span.bk__no', String(at + 1).padStart(2, '0')),
        h('div', h('h3.bk__t', s.name), h('p.bk__s', fx(s.s)))),
      h('div.bk__grid',
        h('div', h('p.eyebrow', 'What goes in it'), ticks(s.must)),
        h('div.bk__tip', h('p.eyebrow', icon('style'), 'From experience'), h('p', fx(s.tip)))),
      h('div.bk__nav',
        h('button.btn.btn--ghost.btn--sm', { type: 'button', disabled: at === 0, onclick: () => { at -= 1; draw(-1); } }, icon('back'), 'Previous section'),
        h('span.bk__c', `${at + 1} of ${BINDER.length}`),
        h('button.btn.btn--ghost.btn--sm', { type: 'button', disabled: at === BINDER.length - 1, onclick: () => { at += 1; draw(1); } }, 'Next section', icon('arrow'))));

    mount(sheet, pageEl);
  }

  draw();

  return h('section.bk',
    h('div.bk__spine', h('span', 'CLAIM No. 02'), h('i')),
    h('div.bk__main', tabs, sheet));
}

/* ── the argument ladder ───────────────────────────────────────── */
function ladder() {
  const RUNGS = [
    { t: 'Facts nobody disputes', s: 'The narrative, pinned to exhibits. The reviewer reads it and finds nothing to disagree with. That matters more than it sounds — agreement is a habit.' },
    { t: 'A clause they have to accept', s: 'Quoted from their own contract. They cannot argue with the words; only with whether your facts fit them.' },
    { t: 'Facts mapped onto the clause', s: 'Word by word. By now the reviewer has agreed to the facts and to the clause, so this step is almost arithmetic.' },
    { t: 'A number that follows from it', s: 'Days from the programme, money from the records. Not a new argument — a consequence of everything above.' },
    { t: 'The conclusion they were going to reach anyway', s: 'If the four steps below are solid, the last page writes itself, and the determination can be lifted straight out of it.' },
  ];
  return h('div.stack',
    h('p.prose', fx('A good claim document is a staircase. Each step is small, and each one is hard to refuse once you have taken the one below it.')),
    h('div.ld', RUNGS.map((r, i) => h('article.ld__r', { style: { '--i': i } },
      h('span.ld__n', i + 1),
      h('div', h('h4', r.t), h('p', fx(r.s)))))),
    note('The mistake is to argue everywhere. Argument in the facts section makes the facts look doubtful. Keep the narrative dry and let it do its work.', 'tip'));
}

/* ── the two rules ─────────────────────────────────────────────── */
function rules() {
  return h('div.g2.grid',
    h('article.card.card--pad.rule',
      h('span.rule__ic', icon('doc')),
      h('h3', 'It stands alone'),
      h('p.prose', fx('No "as previously discussed". No "the Engineer is aware". Someone who has never heard of your project must be able to pick this up and follow it from page one to the end.')),
      h('p.prose', fx('Test it: hand it to a colleague from another project and ask them to explain your case back to you. Whatever they cannot explain is what you have to rewrite.'))),
    h('article.card.card--pad.rule',
      h('span.rule__ic', icon('link')),
      h('h3', 'Every claim, one document'),
      h('p.prose', fx('One event, one claim, one number, one determination. Bundling three events into one submission means a reviewer who rejects one of them can wave away all three.')),
      h('p.prose', fx('Number them from the first one — **Claim No. 1**, No. 2, No. 3 — and keep revision numbers on every issue. You will be referring back to them for years.'))));
}
