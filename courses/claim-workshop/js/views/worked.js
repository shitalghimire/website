/* 09 · Worked example — one claim, built end to end */

import { h, fx, mount, reveal, sequence, still, countUp } from '../lib.js';
import { icon } from '../icons.js';
import { WORKED } from '../content.js';
import { head, sec, note, versus } from './parts.js';

export default function worked(page, { chapter }) {
  page.append(
    head(chapter, 'A real shape of claim, followed from the event to the determination — including the half of it that failed, which is the more useful half to study.'),

    brief(),

    sec('What happened, and when', 'The trail'),
    timeline(),

    sec('The four blocks', 'How it was built'),
    build(),

    sec('What came back', 'The determination'),
    outcome(),

    sec('The one lesson', 'Take this away'),
    lesson(),
  );

  reveal(page.querySelector('.tl'), { selector: '.tl__e', step: 60 });
  reveal(page.querySelector('.wbd'), { selector: '.wbd__b', step: 80 });
}

function brief() {
  return h('section.brf',
    h('div.brf__t', h('span.eyebrow', 'The situation'), h('p.lede', fx(WORKED.brief))),
    h('div.brf__f',
      fig(228, 'days claimed', 'and awarded'),
      fig(0, 'money awarded', 'nothing proved'),
      fig(1, 'of 2 claims won', 'time yes, cost no')));
}

function fig(n, l, s) {
  const b = h('b');
  countUp(b, n);
  return h('div.brf__fi', b, h('span', l), h('small', s));
}

/* ── the trail, playable ───────────────────────────────────────── */
function timeline() {
  const rows = WORKED.facts.map((f, i) => h('article.tl__e', { style: { '--i': i } },
    h('div.tl__d', h('b', f.d)),
    h('div.tl__c', h('h4', f.t), h('p', fx(f.s)))));

  const play = h('button.btn.btn--sm', { type: 'button' }, icon('play'), 'Play it through');
  let seq = null;
  play.addEventListener('click', () => {
    seq?.stop();
    if (still()) { rows.forEach((r) => r.classList.add('lit')); return; }
    rows.forEach((r) => r.classList.remove('lit'));
    mount(play, icon('play'), 'Playing…');
    seq = sequence(rows, {
      gap: 750,
      onStep: (row, i, done) => {
        if (done) { mount(play, icon('refresh'), 'Again'); return; }
        row.classList.add('lit');
      },
    }).play();
  });

  return h('div.stack',
    h('div.row', play, h('span.muted', 'Notice how much of this happened before anyone wrote a claim.')),
    h('div.tl', rows),
    note('Six entries, and four of them are letters sent **while the event was still running**. That trail is what made the time claim unarguable. It was built month by month, not assembled afterwards.', 'tip'));
}

/* ── the four blocks ───────────────────────────────────────────── */
function build() {
  return h('div.wbd', WORKED.build.map((b, i) => h('article.wbd__b', { style: { '--i': i } },
    h('span.wbd__k', b.k[0]),
    h('div.wbd__body',
      h('p.eyebrow', b.k),
      h('p.wbd__s', fx(b.s)),
      h('p.wbd__e', icon('proof'), h('span', fx(b.ex)))))));
}

/* ── the split result ──────────────────────────────────────────── */
function outcome() {
  return h('div.out',
    h('article.out__s.out__s--won',
      h('div.out__h', icon('check'), h('span.eyebrow', 'The time claim'), h('span.pill.pill--teal', '228 days')),
      h('p', fx(WORKED.outcome.won))),
    h('article.out__s.out__s--lost',
      h('div.out__h', icon('x'), h('span.eyebrow', 'The money claim'), h('span.pill.pill--red', 'Nothing')),
      h('p', fx(WORKED.outcome.lost))));
}

/* ── the lesson ────────────────────────────────────────────────── */
function lesson() {
  return h('div.stack',
    h('section.lsn',
      h('span.lsn__q', '“'),
      h('p.lsn__t', fx(WORKED.outcome.lesson))),
    versus(
      'Labour and plant stood idle throughout the period of delay and the associated costs are claimed.',
      'Between 2 October 2024 and 14 May 2025 the tunnel crew (18 operatives, listed at Appendix C) remained assigned to the spillway outlet front. The substitute land offered on 12 May 2024 could not accept this crew because it had no portal face. Daily allocation sheets at Exhibit 9 show no alternative front available in that period.',
      'What was written', 'What would have won it'),
    note('The second version answers the question the reviewer actually asked — **could these people have been sent somewhere else?** The first version never noticed the question was there.', 'warn'));
}
