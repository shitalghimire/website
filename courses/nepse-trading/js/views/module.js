/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — module overview
   Enormous ghosted numeral, lesson list, module quiz.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, num, pctPlain, deva2, stagger } from '../util.js';

export function module(n) {
  const { modules: M } = ctx;
  const mod = M.modules.find(m => m.n === n);
  if (!mod) return notFound(n);

  const p = state.moduleProgress(mod);
  const lv = M.levels.find(l => l.n === mod.level);
  const wrap = el('div');

  wrap.append(el('p', { style: { marginBottom: 'var(--s5)' } },
    el('a.kicker', { href: '#/' }, '← Dashboard')));

  /* head: the mega numeral sits behind the title */
  wrap.append(el('div.head', [
    el('span.head__kicker.kicker', [
      el('span.deva', { lang: 'ne' }, deva2(mod.n)),
      ' / LEVEL ' + (lv?.roman || '') + ' · ' + (lv?.name || '')
    ]),
    el('div', { style: { display: 'flex', alignItems: 'baseline', gap: 'var(--s4)', flexWrap: 'wrap' } }, [
      el('span.lesson__num.num', { style: { marginBottom: 0, fontSize: 'clamp(3rem,9vw,6rem)' }, 'aria-hidden': 'true' },
        String(mod.n).padStart(2, '0')),
      el('h1', { style: { flex: '1 1 320px' } }, mod.title)
    ]),
    el('p', mod.blurb),
    el('div.row', { style: { marginTop: 'var(--s4)' } }, [
      el('span.pill', `${mod.lessons.length} lessons`),
      el('span.pill', `${mod.minutes} min`),
      el('span.pill', `${num(mod.lessons.reduce((a, l) => a + l.xp, 0), 0)} XP`),
      p.pct > 0 && el('span.pill.pill--signal', `${pctPlain(p.pct)} complete`)
    ])
  ]));

  /* lessons */
  const list = el('div.lessons');
  mod.lessons.forEach(l => {
    const done = state.lessonDone(l.id);
    list.append(el('a', {
      class: 'lrow' + (done ? ' lrow--done' : ''),
      href: `#/m/${mod.n}/l/${l.index}`
    }, [
      el('span.lrow__n', l.id),
      el('span.lrow__t', l.title),
      el('span.lrow__m', done ? el('span.lrow__tick', '✓ done') : `${l.minutes} min`)
    ]));
  });
  wrap.append(list);
  stagger(list);

  /* module quiz */
  const q = state.load().quizScores['m' + mod.n];
  const passed = state.quizPassed('m' + mod.n);
  wrap.append(el('div', { style: { marginTop: 'var(--s6)' } }, [
    el('a', {
      class: 'btn ' + (passed ? 'btn--bull' : 'btn--primary'),
      href: `#/quiz/m${mod.n}`,
      style: { width: '100%' }
    }, passed
      ? `✓ Module ${mod.n} quiz passed — best ${pctPlain(q.best)}`
      : `Take the Module ${mod.n} quiz` + (q ? ` — best so far ${pctPlain(q.best)}` : '')),
    !passed && el('p.dim', { style: { fontSize: 'var(--t-xs)', marginTop: 'var(--s2)', textAlign: 'center' } },
      'Pass mark 70%. A failed attempt costs XP and prints a red candle — that is the point.')
  ]));

  /* game unlocked here */
  if (mod.unlocksGame) {
    const g = M.games.find(x => x.id === mod.unlocksGame);
    if (g) {
      wrap.append(el('a.gcard', {
        href: `#/game/${g.id}`,
        style: { marginTop: 'var(--s4)', display: 'block' }
      }, [
        el("span.kicker", "Suggested after this module"),
        el('h3', { style: { marginTop: '6px' } }, g.title),
        el('p', g.blurb)
      ]));
    }
  }

  /* prev / next */
  wrap.append(el('div.lnav', [
    mod.n > 1
      ? el('a.btn', { href: `#/m/${mod.n - 1}` }, `← Module ${mod.n - 1}`)
      : el('a.btn', { href: '#/' }, '← Dashboard'),
    mod.n < M.modules.length
      ? el('a.btn', { href: `#/m/${mod.n + 1}` }, `Module ${mod.n + 1} →`)
      : el('span')
  ]));

  return wrap;
}

function notFound(n) {
  return el('div.msg', [
    el('h2', 'No such module'),
    el('p', `There is no Module ${n}. The course runs from 1 to 16.`),
    el('p', el('a.btn', { href: '#/' }, 'Back to the dashboard'))
  ]);
}
