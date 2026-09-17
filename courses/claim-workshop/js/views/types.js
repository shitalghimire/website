/* 03 · Types of claim — which one are you actually making? */

import { h, fx, mount, reveal } from '../lib.js';
import { icon } from '../icons.js';
import { TYPES, CHOOSER } from '../content.js';
import { head, sec, note, ticks } from './parts.js';

export default function types(page, { chapter }) {
  page.append(
    head(chapter, 'Six kinds, and they are proved in completely different ways. Calling a disruption claim a delay claim, or asking for money when you have only proved time, is one of the quickest ways to lose something you were owed.'),

    sec('Work it out', 'Chooser'),
    chooser(),

    sec('The six', 'In detail'),
    cards(),

    sec('The two that get confused', 'Delay and disruption'),
    confusion(),
  );

  reveal(page.querySelector('.ty-grid'), { selector: '.ty', step: 70 });
}

/* ═══════════ THE CHOOSER ═══════════ */
function chooser() {
  let step = 0;
  let path = [];
  const box = h('div.ch__body');

  function draw() {
    if (step === null) return;
    const node = CHOOSER[step];
    mount(box,
      h('div.ch__q',
        h('p.eyebrow', `Question ${path.length + 1}`),
        h('h3', fx(node.q)),
        h('div.row.ch__a',
          h('button.btn.btn--go', { type: 'button', onclick: () => pick(node.yes, 'Yes') }, 'Yes'),
          h('button.btn', { type: 'button', onclick: () => pick(node.no, 'No') }, 'No'))),
      trail());
  }

  function pick(branch, label) {
    path.push({ q: CHOOSER[step].q, a: label });
    if (branch.type) { result(branch); return; }
    step = branch.next;
    draw();
  }

  function result(branch) {
    const t = TYPES.find((x) => x.id === branch.type);
    mount(box,
      h('div.ch__r',
        h('span.ch__ic', icon(t.ic)),
        h('div',
          h('p.eyebrow', 'You are making a'),
          h('h3.ch__rt', t.name),
          h('p.prose', fx(branch.why)),
          h('div.pills', h('span.pill.pill--amber', t.tag)),
          h('div.ch__need', h('p.eyebrow', 'So you will have to prove'), ticks(t.prove, 'ticks--teal')),
          h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: restart }, icon('refresh'), 'Start again'))),
      trail());
  }

  function trail() {
    if (!path.length) return null;
    return h('div.ch__tr', path.map((p) => h('span.ch__tri', h('i', p.q), h('b', p.a))));
  }

  function restart() { step = 0; path = []; draw(); }

  draw();

  return h('section.ch',
    h('div.ch__hd', icon('types'), h('span.eyebrow', 'Answer four questions at most')),
    box);
}

/* ── the six types ─────────────────────────────────────────────── */
function cards() {
  return h('div.ty-grid', TYPES.map((t, i) => h('article.ty', { style: { '--i': i }, id: t.id },
    h('div.ty__h',
      h('span.ty__ic', icon(t.ic)),
      h('div', h('h3', t.name), h('span.pill.pill--amber', t.tag))),
    h('p.ty__w', fx(t.what)),
    h('div.ty__p', h('p.eyebrow', 'You must prove'), ticks(t.prove, 'ticks--teal')),
    h('p.ty__watch', icon('alert'), h('span', fx(t.watch))))));
}

/* ── delay vs disruption ───────────────────────────────────────── */
function confusion() {
  return h('div.stack',
    h('div.dd',
      h('article.dd__s.dd__s--a',
        h('span.eyebrow', 'Delay'),
        h('h3', 'The finish moved'),
        h('p', fx('The project ends later than it should have. You prove it from the **programme** — an event landed on the critical path and pushed the completion date out.')),
        h('div.dd__ev', h('p.eyebrow', 'Proved from'), ticks(['The accepted programme', 'Updates at each window', 'The critical path before and after', 'Activity dates and float'])),
        h('p.dd__ask', h('b', 'You ask for: '), 'days — and separately, the cost of those days.')),
      h('div.dd__mid', h('span', 'not the'), h('b', 'same'), h('span', 'thing')),
      h('article.dd__s.dd__s--b',
        h('span.eyebrow', 'Disruption'),
        h('h3', 'The work got harder'),
        h('p', fx('The job took more hours than it should have. The finish may not have moved at all. You prove it from **productivity** — planned output per hour against what you actually achieved.')),
        h('div.dd__ev', h('p.eyebrow', 'Proved from'), ticks(['Planned output rates, and where they came from', 'Actual output, from the records', 'A comparison — measured mile, or similar', 'Labour hours against work done'])),
        h('p.dd__ask', h('b', 'You ask for: '), 'money only — the cost of the hours you lost.'))),
    note('You can be disrupted without being delayed, and delayed without being disrupted. They can also happen together, in which case they are **two claims in one document**, with two sets of evidence and two calculations. Never merge them into one number.', 'warn'));
}
