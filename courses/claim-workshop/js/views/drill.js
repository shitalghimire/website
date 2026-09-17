/* 10 · Practice — ten drills */

import { h, fx, mount, store, reveal } from '../lib.js';
import { icon } from '../icons.js';
import { DRILLS, GLOSSARY, CHAPTERS } from '../content.js';
import { head, sec, note, question } from './parts.js';

export default function drill(page, { chapter }) {
  page.append(
    head(chapter, 'Ten questions on everything above. Answers are kept on this device, and you can reset them whenever you like.'),

    quiz(),

    sec('The words', 'Glossary'),
    glossary(),

    sec('You have reached the end', 'What now'),
    ending(),
  );

  reveal(page.querySelector('.gl'), { selector: '.gl__t', step: 35 });
}

/* ── the quiz ──────────────────────────────────────────────────── */
function quiz() {
  const score = h('div.qz__score');
  const bar = h('i.qz__fill');

  function paint() {
    const st = store.get().answers;
    const done = DRILLS.filter((d) => st[d.id] !== undefined).length;
    const right = DRILLS.filter((d) => st[d.id] === true).length;
    bar.style.setProperty('--w', `${(done / DRILLS.length) * 100}%`);
    mount(score,
      h('b', `${right} / ${DRILLS.length}`),
      h('span', done === 0 ? 'not started'
        : done < DRILLS.length ? `${done} answered`
          : right === DRILLS.length ? 'every one — you have got this'
            : right >= 8 ? 'strong'
              : right >= 6 ? 'nearly there'
                : 'worth another read'));
  }

  const qs = DRILLS.map((d, i) => {
    const prev = store.get().answers[d.id];
    const q = question(d, (right) => {
      store.update((s) => { s.answers[d.id] = right; });
      paint();
    });
    q.prepend(h('span.q__n', String(i + 1).padStart(2, '0')));
    if (prev !== undefined) {
      /* already answered on this device — show the outcome without replaying it */
      q.classList.add('answered', prev ? 'was-right' : 'was-wrong');
      const opts = [...q.querySelectorAll('.q__o')];
      opts[d.a]?.classList.add('right');
      const why = q.querySelector('.q__why');
      mount(why.querySelector('b'), prev ? 'You had this right.' : 'You missed this one.');
      why.classList.toggle('is-right', prev);
      why.hidden = false;
    }
    return q;
  });

  const reset = h('button.btn.btn--ghost.btn--sm', { type: 'button' }, icon('refresh'), 'Clear answers');
  reset.addEventListener('click', () => {
    store.update((s) => { for (const d of DRILLS) delete s.answers[d.id]; });
    location.reload();
  });

  paint();

  return h('section.qz',
    h('div.qz__hd', score, h('div.qz__bar', bar), reset),
    h('div.qz__l', qs));
}

/* ── glossary ──────────────────────────────────────────────────── */
function glossary() {
  return h('div.gl', GLOSSARY.map((g, i) => h('article.gl__t', { style: { '--i': i } },
    h('b', g.t), h('span', fx(g.s)))));
}

/* ── the end ───────────────────────────────────────────────────── */
function ending() {
  const done = CHAPTERS.filter((c) => store.isDone(c.id)).length;
  return h('div.stack',
    h('section.end',
      h('div.end__b',
        h('p.eyebrow', `${done} of ${CHAPTERS.length} chapters marked done`),
        h('h3', 'Go and write one'),
        h('p.prose', fx('Take a real event from your own project and build it in four blocks on one sheet of paper. Cause, effect, entitlement, substantiation. If any block is thin, you have found what to go and look for — and you have found it before you spent a month writing.')),
        h('div.row',
          h('a.btn.btn--go', { href: '#/cees' }, icon('cees'), 'Back to the four elements'),
          h('a.btn', { href: '#/binder' }, icon('binder'), 'The section list'))),
      h('div.end__art', { 'aria-hidden': 'true' }, endArt())),
    note('This course is open and always will be. There is no code, no sign-up, and nothing you do here leaves your browser.', ''));
}

function endArt() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 240 180');
  svg.innerHTML = `
    <rect x="30" y="20" width="150" height="140" rx="5" class="ea-p"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="182" y="${34 + i * 30}" width="34" height="22" rx="3" class="ea-t" style="--i:${i}"/>`).join('')}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="48" y="${44 + i * 18}" width="${[110, 92, 116, 78, 104, 60][i]}" height="5" rx="2.5" class="ea-l" style="--i:${i}"/>`).join('')}
    <path d="M52 140 l 14 14 l 30 -34" class="ea-ck"/>`;
  return svg;
}
