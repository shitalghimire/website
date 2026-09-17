/* 02 · CEES — the four things every claim must prove */

import { h, fx, mount, reveal, sequence, still } from '../lib.js';
import { icon } from '../icons.js';
import { CEES, CEES_SCENARIOS } from '../content.js';
import { head, sec, note, prose, versus, ticks } from './parts.js';

export default function cees(page, { chapter }) {
  page.append(
    head(chapter, 'Four blocks. Get all four and the claim stands up. Miss one and it falls over, however true the story is — and the one people miss is almost never the first.'),

    letters(),

    sec('Take them one at a time', 'In detail'),
    detail(),

    sec('Build one yourself', 'Workbench'),
    bench(),

    sec('The order matters', 'Why this sequence'),
    order(),
  );

  reveal(page.querySelector('.cee-cards'), { selector: '.cee', step: 90 });
  reveal(page.querySelector('.cee-detail'), { selector: '.ceed', step: 70 });
}

/* ── the four letters, animated in ─────────────────────────────── */
function letters() {
  return h('div.cee-cards', CEES.map((c, i) => h('article.cee', { style: { '--i': i }, dataset: { k: c.id } },
    h('span.cee__k', c.k),
    h('div',
      h('h3.cee__n', c.name),
      h('p.cee__o', c.one),
      h('p.cee__l', fx(c.long))))));
}

/* ── each element in full ──────────────────────────────────────── */
function detail() {
  return h('div.cee-detail', CEES.map((c) => h('article.ceed', { id: c.id },
    h('div.ceed__h',
      h('span.ceed__k', c.k),
      h('div', h('h3', c.name), h('p.muted', c.one))),
    versus(c.bad, c.good),
    h('p.ceed__note', icon('info'), h('span', fx(c.note))),
    h('div.ceed__t', h('p.eyebrow', 'How to write it'), ticks(c.tips)))));
}

/* ═══════════ THE WORKBENCH ═══════════
   Pick a scenario, then reveal the four blocks one at a time. The
   point of the animation is the order: nothing means anything until
   the block before it is on the table. */
function bench() {
  let scen = CEES_SCENARIOS[0];
  let shown = 0;
  let seq = null;

  const slots = h('div.wb__slots');
  const status = h('p.wb__st');

  function draw() {
    const blocks = CEES.map((c, i) => {
      const on = i < shown;
      return h(`article.wb__b${on ? '.on' : ''}`, { style: { '--i': i } },
        h('span.wb__k', c.k),
        h('div.wb__body',
          h('p.eyebrow', c.name),
          h('p.wb__txt', on ? fx(scen[c.id]) : h('span.wb__ghost', c.one))));
    });
    mount(slots, blocks);
    const labels = [
      'Nothing on the table yet. Press build.',
      'A fact, with dates. Nobody can argue with it — but on its own it is just news.',
      'Now it has done something to you. Still not worth anything: plenty of things happen on a site.',
      'Now it is worth something, because the contract says so. This is the sentence that turns a story into a claim.',
      'And now it is proved. All four blocks on the table — this is a claim a reviewer can actually determine.',
    ];
    mount(status, fx(labels[shown]));
  }

  const build = h('button.btn.btn--go', { type: 'button' }, icon('play'), 'Build it');
  const resetB = h('button.btn.btn--ghost.btn--sm', { type: 'button' }, icon('refresh'), 'Reset');

  build.addEventListener('click', () => {
    seq?.stop();
    shown = 0; draw();
    if (still()) { shown = 4; draw(); return; }
    mount(build, icon('play'), 'Building…');
    build.disabled = true;
    seq = sequence([1, 2, 3, 4], {
      gap: 1100,
      onStep: (n, i, done) => {
        if (done) { mount(build, icon('refresh'), 'Build it again'); build.disabled = false; return; }
        shown = n; draw();
      },
    }).play();
  });
  resetB.addEventListener('click', () => { seq?.stop(); shown = 0; draw(); mount(build, icon('play'), 'Build it'); build.disabled = false; });

  const picker = h('div.seg', CEES_SCENARIOS.map((s, i) => h('button', {
    type: 'button', 'aria-pressed': String(i === 0),
    onclick: (e) => {
      scen = s; seq?.stop(); shown = 0;
      [...e.currentTarget.parentNode.children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      draw(); mount(build, icon('play'), 'Build it'); build.disabled = false;
    },
  }, s.label)));

  draw();

  return h('section.wb',
    h('div.wb__bar', picker, h('div.row', build, resetB)),
    slots,
    h('div.wb__foot', icon('info'), status));
}

/* ── why this order ────────────────────────────────────────────── */
function order() {
  const rows = [
    { miss: 'Cause', s: 'No dates, no places, no facts. The reviewer cannot test anything, so nothing else you write can be tested either.', out: 'Rejected as unparticularised.' },
    { miss: 'Effect', s: 'The event is proved but nobody has shown what it did. Things happen on sites all the time without costing anyone a day.', out: 'Accepted as a fact, rejected as a claim.' },
    { miss: 'Entitlement', s: 'A moving story with no clause behind it. This is the most common failure, and it is often a claim that deserved to win.', out: 'Sympathy, and nothing else.' },
    { miss: 'Substantiation', s: 'Everything asserted, nothing proved. The reviewer has to take your word for it, and their job is not to take your word for it.', out: 'Sent back for particulars — or refused outright.' },
  ];
  return h('div.stack',
    h('p.prose', fx('Each block only works if the one before it is there. That is why a claim that reads beautifully can still fail: the writing was fine, but one of the four was missing.')),
    h('div.ord', rows.map((r, i) => h('article.ord__r', { style: { '--i': i } },
      h('span.ord__m', h('span.eyebrow', 'Missing'), h('b', r.miss)),
      h('p.ord__s', fx(r.s)),
      h('span.pill.pill--red', r.out)))),
    note('If you only remember one thing from this chapter: **entitlement is a clause, not an argument that you were treated unfairly**. Fairness is not in the contract. The clause is.', 'tip'));
}
