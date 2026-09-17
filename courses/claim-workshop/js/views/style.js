/* 06 · Writing — sentences that survive a reviewer */

import { h, fx, mount, reveal, copy } from '../lib.js';
import { icon } from '../icons.js';
import { STYLE_RULES, REWRITES } from '../content.js';
import { head, sec, note, ticks } from './parts.js';

export default function style(page, { chapter }) {
  page.append(
    head(chapter, 'Nobody is grading your prose. But a sentence a reviewer has to read twice is a sentence that costs you, and there are perhaps eight habits that account for nearly all of it.'),

    sec('Eight habits', 'The rules'),
    rules(),

    sec('Three rewrites', 'Before and after'),
    rewrites(),

    sec('Words that weaken you', 'The red pen'),
    redpen(),
  );

  reveal(page.querySelector('.rl'), { selector: '.rl__c', step: 55 });
  reveal(page.querySelector('.rw'), { selector: '.rw__c', step: 90 });
}

/* ── the eight rules ───────────────────────────────────────────── */
function rules() {
  return h('div.rl', STYLE_RULES.map((r, i) => h('article.rl__c', { style: { '--i': i } },
    h('span.rl__n', String(i + 1).padStart(2, '0')),
    h('h3', r.t),
    h('p', fx(r.s)))));
}

/* ═══════════ THE REWRITER ═══════════
   Drag the handle and the weak sentence becomes the strong one. */
function rewrites() {
  return h('div.rw', REWRITES.map((r, i) => rewrite(r, i)));
}

function rewrite(r, i) {
  let on = false;
  const badP = h('p.rw__txt.rw__txt--bad', fx(r.bad));
  const goodP = h('p.rw__txt.rw__txt--good', fx(r.good));
  const stage = h('div.rw__stage', badP, goodP);
  const why = h('ul.rw__why', { hidden: true }, r.why.map((w) => h('li', icon('check'), h('span', fx(w)))));

  const flip = h('button.rw__flip', { type: 'button', 'aria-pressed': 'false' },
    h('span.rw__lbl', 'Weak'), h('i.rw__track', h('b')), h('span.rw__lbl', 'Strong'));

  const paint = () => {
    stage.classList.toggle('on', on);
    flip.setAttribute('aria-pressed', String(on));
    why.hidden = !on;
  };
  flip.addEventListener('click', () => { on = !on; paint(); });
  paint();

  return h('article.rw__c', { style: { '--i': i } },
    h('div.rw__hd', h('span.rw__n', String(i + 1).padStart(2, '0')), flip),
    stage,
    why,
    h('button.btn.btn--ghost.btn--sm.rw__cp', { type: 'button', onclick: () => copy(r.good) }, icon('copy'), 'Copy the strong version'));
}

/* ── the red pen ───────────────────────────────────────────────── */
const BAD_WORDS = [
  { w: 'significant', f: 'How significant? Put the number in.' },
  { w: 'considerable', f: 'Same problem. Measure it.' },
  { w: 'severe', f: 'A judgement, not a fact. Show the effect instead.' },
  { w: 'unprecedented', f: 'Against what record? Cite the data or drop the word.' },
  { w: 'clearly', f: 'If it were clear you would not need to say so.' },
  { w: 'obviously', f: 'Reads as impatience. Cut it.' },
  { w: 'it is submitted that', f: 'Four words that say nothing. Just say the thing.' },
  { w: 'as you are aware', f: 'They may not be, and the next reader certainly is not.' },
  { w: 'various', f: 'List them.' },
  { w: 'numerous', f: 'Count them.' },
  { w: 'in due course', f: 'Give the date.' },
  { w: 'reasonable', f: 'Fine in a clause, empty in your own sentence.' },
  { w: 'manifestly', f: 'Heat, not light. It makes you look rattled.' },
  { w: 'without prejudice', f: 'Has a specific legal meaning. Do not sprinkle it.' },
];

function redpen() {
  const area = h('textarea.pen__in', {
    rows: 5, spellcheck: 'false',
    placeholder: 'Paste a paragraph from a claim and see what the red pen finds…',
  });
  area.value = 'It is submitted that, as you are aware, the Contractor has clearly suffered significant and considerable disruption on numerous occasions due to various severe and unprecedented events, and the associated costs will be submitted in due course.';

  const out = h('div.pen__out');

  function scan() {
    const text = area.value;
    const hits = [];
    for (const b of BAD_WORDS) {
      const re = new RegExp(`\\b${b.w.replace(/ /g, '\\s+')}\\b`, 'gi');
      let m;
      while ((m = re.exec(text))) hits.push({ ...b, at: m.index, len: m[0].length, found: m[0] });
    }
    hits.sort((a, b) => a.at - b.at);

    /* the text, with every hit struck through */
    const marked = h('p.pen__txt');
    let last = 0;
    for (const hit of hits) {
      if (hit.at < last) continue;
      if (hit.at > last) marked.append(text.slice(last, hit.at));
      marked.append(h('u.pen__hit', { title: hit.f }, hit.found));
      last = hit.at + hit.len;
    }
    marked.append(text.slice(last));

    const list = hits.length
      ? h('ul.pen__l', hits.map((x) => h('li',
        h('b', x.found),
        h('span', fx(x.f)))))
      : h('p.pen__ok', icon('check'), h('span', 'Nothing flagged. That does not make it a good paragraph — but it is not padded.'));

    mount(out,
      h('div.pen__score',
        h('b', hits.length),
        h('span', hits.length === 1 ? 'phrase carrying no weight' : 'phrases carrying no weight')),
      marked,
      list);
  }

  area.addEventListener('input', scan);
  scan();

  return h('div.stack',
    h('p.prose', fx('These are the words that appear in claims which fail. Not because the words are wrong, but because each one is a place where a fact should have been. Paste your own paragraph in and see.')),
    h('section.pen', h('div.pen__hd', icon('style'), h('span.eyebrow', 'Paste and check')), area, out),
    note('The test for every adjective: **can I replace this with a number?** If yes, do it. If there is no number, ask whether you actually know the thing you are asserting.', 'tip'));
}
