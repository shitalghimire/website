/* 07 · Proof — substantiation and exhibits */

import { h, fx, mount, reveal, countUp } from '../lib.js';
import { icon } from '../icons.js';
import { PROOF } from '../content.js';
import { head, sec, note, ticks, versus } from './parts.js';

export default function proof(page, { chapter }) {
  page.append(
    head(chapter, 'An assertion with a document behind it is evidence. An assertion without one is an opinion, and a reviewer has no way to act on your opinion even when it happens to be right.'),

    sec('Not all proof is equal', 'The hierarchy'),
    hierarchy(),

    sec('How to reference it', 'Exhibits'),
    exhibits(),

    sec('Six rules', 'Housekeeping'),
    rules(),
  );

  reveal(page.querySelector('.hr'), { selector: '.hr__r', step: 70 });
}

/* ── the evidence hierarchy ────────────────────────────────────── */
function hierarchy() {
  return h('div.stack',
    h('p.prose', fx('Everything you attach sits somewhere on this ladder. The top four are evidence. The bottom two are your argument dressed as evidence, and reviewers know the difference.')),
    h('div.hr', PROOF.hierarchy.map((r, i) => h('article.hr__r', { style: { '--i': i, '--strength': `${100 - i * 15}%` } },
      h('span.hr__rank', r.rank),
      h('div.hr__b',
        h('h3', r.t),
        h('p.hr__ex', r.ex),
        h('p.hr__s', fx(r.s))),
      h('i.hr__bar')))),
    note('Notice where a delay analysis sits. It is rank 5 — necessary, but it is **your argument**, and it only carries weight if the four ranks above it hold it up. An analysis built on records that do not exist proves nothing at all.', 'warn'));
}

/* ═══════════ EXHIBIT REFERENCING ═══════════
   Toggle between a paragraph with no references and the same one
   properly cited, with the exhibit stack lighting up. */
function exhibits() {
  let on = true;

  const PARA = [
    { t: 'The road was cut by a landslide on 28 July 2024', ex: 1 },
    { t: ' and did not reopen until 11 September 2024', ex: 2 },
    { t: '. Deliveries of cement stopped, and site stock was exhausted on 4 August', ex: 3 },
    { t: '. Tunnel drive at Adit-2 halted from 5 August', ex: 4 },
    { t: '. Rainfall for the period was 412 mm against a 25-year mean of 180 mm', ex: 5 },
    { t: '.', ex: null },
  ];
  const EX = [
    { n: 1, t: 'Photographs of the road, dated 28 July 2024', k: 'Record made at the time' },
    { n: 2, t: 'District Road Office reopening notice, with certified translation', k: 'Third-party record' },
    { n: 3, t: 'Site stock register, July–August 2024', k: 'Record made at the time' },
    { n: 4, t: 'Daily Progress Reports, 5 August to 11 September 2024', k: 'Record made at the time' },
    { n: 5, t: 'DHM rainfall data for the catchment, with the 25-year series', k: 'Third-party record' },
  ];

  const para = h('p.ex__p');
  const stack = h('div.ex__stack');

  function draw() {
    mount(para, PARA.map((seg) => {
      const frag = [document.createTextNode(seg.t)];
      if (seg.ex && on) {
        const chip = h('a.ex__ref', { href: `#ex${seg.ex}`, onclick: (e) => { e.preventDefault(); flash(seg.ex); } }, `[Exhibit ${seg.ex}]`);
        frag.push(chip);
      }
      return frag;
    }));

    mount(stack, EX.map((e, i) => h(`article.ex__c${on ? '.on' : ''}`, { id: `ex${e.n}`, style: { '--i': i } },
      h('span.ex__n', e.n),
      h('div', h('b', e.t), h('span.pill.pill--teal', e.k)))));
  }

  function flash(n) {
    const el = stack.querySelector(`#ex${n}`);
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  const toggle = h('button.btn.btn--sm', { type: 'button' }, icon('refresh'), 'Strip the references out');
  toggle.addEventListener('click', () => {
    on = !on;
    mount(toggle, icon('refresh'), on ? 'Strip the references out' : 'Put the references back');
    draw();
  });

  draw();

  return h('div.stack',
    h('section.ex',
      h('div.ex__hd', h('span.eyebrow', 'The narrative'), toggle),
      para,
      h('p.ex__note', icon('info'), h('span', fx('Cite at the sentence the document proves, not in a list at the end. A reviewer checking your fifth sentence should not have to hunt.'))),
      h('div.ex__hd', h('span.eyebrow', 'The exhibits'), h('span.muted.mono', `${EX.length} documents`)),
      stack),
    versus(
      'Please refer to the attached documents in support of the above.',
      'Rainfall for the period was 412 mm against a 25-year mean of 180 mm (Exhibit 5).',
      'No reference', 'Referenced at the fact'));
}

/* ── housekeeping ──────────────────────────────────────────────── */
function rules() {
  return h('div.pr__rules', PROOF.rules.map((r, i) => h('article.pr__r', { style: { '--i': i } },
    h('span.pr__n', String(i + 1).padStart(2, '0')),
    h('p', fx(r)))));
}
