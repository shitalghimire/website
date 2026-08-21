/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — module overview
   ═══════════════════════════════════════════════════════════════ */

import { el, stagger, pct } from '../dom.js';
import { md } from '../markup.js';
import * as store from '../store.js';
import { ctx } from '../app.js';

export function module(n) {
  const mods = ctx.course.modules;
  const m = mods.find(x => x.n === n);
  if (!m) return notFound(n, mods.length);

  const prog = store.moduleProgress(m);
  const minutes = m.lessons.reduce((a, l) => a + (l.min || 0), 0);
  const quizKey = 'm' + m.n;
  const q = store.quizFor(quizKey);
  const passed = store.quizPassed(quizKey);

  const wrap = el('div');

  wrap.append(el('p', { style: { marginBottom: 'var(--s5)' } },
    el('a.kicker', { href: '#/' }, '← The programme')));

  wrap.append(el('header.mhead', [
    el('span.kicker.kicker--b', m.part || `Part ${romanFor(m.n)}`),
    el('div.mhead__top', [
      el('span.mhead__num', String(m.n).padStart(2, '0')),
      el('h1', m.t)
    ]),
    el('div.prose.mhead__blurb', md(m.blurb || '')),
    el('div.row', { style: { marginTop: 'var(--s5)' } }, [
      el('span.pill', `${m.lessons.length} lessons`),
      el('span.pill', `${minutes} min`),
      m.source && el('span.pill', m.source),
      prog.pct > 0 && el('span.pill.pill--ink', `${pct(prog.pct, 0)} complete`),
      passed && el('span.pill.pill--slack', '✓ quiz passed')
    ].filter(Boolean))
  ]));

  const list = el('div.lessons');
  m.lessons.forEach(l => {
    const done = store.lessonDone(l.id);
    list.append(el('a', {
      class: 'lrow' + (done ? ' lrow--done' : ''),
      href: `#/m/${m.n}/l/${l.i}`
    }, [
      el('span.lrow__n', l.id),
      el('span.lrow__t', l.t),
      el('span.lrow__m', done ? el('span.lrow__tick', '✓ done') : `${l.min} min`)
    ]));
  });
  wrap.append(list);
  stagger(list);

  if (m.quiz) {
    wrap.append(el('div', { style: { marginTop: 'var(--s6)' } }, [
      el('a', {
        class: 'btn btn--wide ' + (passed ? 'btn--ok' : 'btn--primary'),
        href: `#/quiz/${m.n}`
      }, passed
        ? `✓ Module ${m.n} quiz passed — best ${pct(q.best, 0)}`
        : `Take the Module ${m.n} quiz${q ? ` — best so far ${pct(q.best, 0)}` : ''}`),
      el('p.dim', {
        style: { fontSize: 'var(--t-xs)', marginTop: 'var(--s2)', textAlign: 'center' }
      }, 'Pass mark 70%. Retakes are unlimited and cost nothing — the point is the explanation after each answer, not the score.')
    ]));
  }

  wrap.append(el('div.lnav', [
    m.n > 1
      ? el('a.btn', { href: `#/m/${m.n - 1}` }, `← Module ${m.n - 1}`)
      : el('a.btn', { href: '#/' }, '← The programme'),
    el('div.lnav__r', [
      m.lessons.length ? el('a.btn.btn--primary', { href: `#/m/${m.n}/l/1` }, 'Start lesson ' + m.lessons[0].id + ' →') : null,
      m.n < mods.length ? el('a.btn', { href: `#/m/${m.n + 1}` }, `Module ${m.n + 1} →`) : null
    ].filter(Boolean))
  ]));

  return wrap;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function romanFor(n) { return ROMAN[n] || String(n); }

function notFound(n, max) {
  return el('div.msg', [
    el('h2', 'No such module'),
    el('p', `There is no Module ${n}. This course runs from 1 to ${max}.`),
    el('a.btn', { href: '#/' }, 'Back to the programme')
  ]);
}
