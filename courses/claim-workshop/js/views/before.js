/* 04 · Before you write a word */

import { h, fx, mount, reveal, store } from '../lib.js';
import { icon } from '../icons.js';
import { BEFORE } from '../content.js';
import { head, sec, note } from './parts.js';

export default function before(page, { chapter }) {
  page.append(
    head(chapter, 'The worst claims are the ones written first and researched second. An hour spent here saves a fortnight of defending sentences you cannot support.'),

    steps(),

    sec('The notice question', 'Do this first'),
    noticeBox(),

    sec('Your own pre-flight list', 'Tick as you go'),
    checklist(),
  );

  reveal(page.querySelector('.bf'), { selector: '.bf__s', step: 80 });
}

/* ── the six things ────────────────────────────────────────────── */
function steps() {
  return h('div.bf', BEFORE.map((b, i) => h('article.bf__s', { style: { '--i': i } },
    h('span.bf__n', String(i + 1).padStart(2, '0')),
    h('div.bf__body',
      h('h3', b.t),
      h('p', fx(b.s)),
      h('ul.bf__do', b.do.map((d) => h('li', icon('arrow'), h('span', fx(d)))))))));
}

/* ── the notice flow ───────────────────────────────────────────── */
function noticeBox() {
  const NODES = [
    { q: 'Did you send a letter about this event?', yes: 1, no: 'none' },
    { q: 'Was it inside the period the contract allows?', yes: 'clean', no: 2 },
    { q: 'Did any earlier letter describe the event and say you intended to claim — even if it was not labelled as a notice?', yes: 'argue', no: 3 },
    { q: 'Was the event continuing, rather than a single moment?', yes: 'phases', no: 'bar' },
  ];
  const ENDS = {
    clean: { t: 'You are clean', tone: 'good', s: 'Say so early and plainly, with the letter number and the date, and show the arithmetic against the clause. Then get on with the merits.' },
    argue: { t: 'You have an argument', tone: 'warn', s: 'Quote that earlier letter in full, with its date. A letter that describes the event and reserves your position may work as a notice even without the right heading. Put this in its own section — do not bury it.' },
    phases: { t: 'Argue it in phases', tone: 'warn', s: 'A continuing event can start a fresh period each time its effect changes. Draw the timeline, mark each phase, and show a notice against each one you can support.' },
    bar: { t: 'You are time-barred', tone: 'bad', s: 'Deal with it first, not last. Explain the position honestly, argue what you can about waiver or about the other side\'s own conduct, and be realistic about the outcome with your own management before you spend a month writing.' },
    none: { t: 'Nothing was sent', tone: 'bad', s: 'Then the first thing to do is not write a claim — it is to send a notice today about anything still continuing, and take advice about what is already gone.' },
  };

  let at = 0;
  const box = h('div.nt__body');

  function draw() {
    if (typeof at === 'string') {
      const e = ENDS[at];
      mount(box, h(`div.nt__end.nt__end--${e.tone}`,
        icon(e.tone === 'good' ? 'check' : e.tone === 'warn' ? 'alert' : 'x'),
        h('div', h('h3', e.t), h('p', fx(e.s))),
        h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => { at = 0; draw(); } }, icon('refresh'), 'Again')));
      return;
    }
    const n = NODES[at];
    mount(box,
      h('div.nt__q', h('h3', fx(n.q)),
        h('div.row',
          h('button.btn.btn--go', { type: 'button', onclick: () => { at = n.yes; draw(); } }, 'Yes'),
          h('button.btn', { type: 'button', onclick: () => { at = n.no; draw(); } }, 'No'))));
  }
  draw();

  return h('div.stack',
    h('p.prose', fx('Before anything else, find out where you stand on notice. If the contract has a **time bar** and you missed it, the whole document changes shape — the bar becomes your first section and the merits come second.')),
    h('section.nt', h('div.nt__hd', icon('clock'), h('span.eyebrow', 'Where do you stand?')), box));
}

/* ── the checklist, remembered on this device ──────────────────── */
const ITEMS = [
  'I have read the whole contract, including the amendments.',
  'I know exactly which clause gives entitlement, and I have checked the number.',
  'I have checked whether the standard clause was replaced by a particular condition.',
  'I know the notice period and whether we met it, with the letter number.',
  'I have the records: daily reports, photographs, delivery notes, minutes.',
  'I have the programme as it stood at the time of the event, not today\'s.',
  'I have payroll and plant returns for the affected period.',
  'I can state the relief sought in one line — days, money, or both.',
  'I know what our weak points are and how I will deal with them.',
  'I know who will read this, and I have assumed they know nothing.',
];

function checklist() {
  const st = store.get();
  const list = h('ul.pf', ITEMS.map((t, i) => {
    const key = `pf${i}`;
    const li = h('li.pf__i', { style: { '--i': i }, tabIndex: 0, role: 'checkbox' },
      h('span.pf__b'), h('span', fx(t)));
    const paint = () => {
      const on = !!store.get().seen[key];
      li.classList.toggle('on', on);
      li.setAttribute('aria-checked', String(on));
    };
    const flip = () => {
      store.update((s) => { if (s.seen[key]) delete s.seen[key]; else s.seen[key] = 1; });
      paint(); count();
    };
    li.addEventListener('click', flip);
    li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    paint();
    return li;
  }));

  const meter = h('div.pf__m', h('i'), h('b'));
  function count() {
    const done = ITEMS.filter((_, i) => store.get().seen[`pf${i}`]).length;
    meter.querySelector('i').style.setProperty('--w', `${(done / ITEMS.length) * 100}%`);
    mount(meter.querySelector('b'), `${done} of ${ITEMS.length}`);
  }
  count();

  return h('div.stack',
    h('section.card.card--pad.pf__w', meter, list),
    note('Ticks are saved on this device only. If you cannot tick the first four, you are not ready to write — you are ready to go and read the contract.', ''));
}
