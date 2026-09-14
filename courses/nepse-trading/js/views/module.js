/* ═══════════════════════════════════════════════════════════════
   NEPSE TRADING ACADEMY — module overview
   Header card with progress ring, lesson list, quiz and game cards.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, num, pctPlain, stagger } from '../util.js';
import { icon, ring } from '../icons.js';
import { gameTone } from './gamesview.js';

export function module(n) {
  const { modules: M } = ctx;
  const mod = M.modules.find(m => m.n === n);
  if (!mod) return notFound(n);

  const p = state.moduleProgress(mod);
  const lv = M.levels.find(l => l.n === mod.level);
  const nextL = mod.lessons.find(l => !state.lessonDone(l.id));
  const xp = mod.lessons.reduce((a, l) => a + l.xp, 0);
  const wrap = el('div', { style: { '--lv': `var(--lv-${mod.level})` } });

  wrap.append(el('nav.crumbs', { 'aria-label': 'Breadcrumb' }, [
    el('a', { href: '#/' }, 'Dashboard'), icon('chevronRight'),
    el('a', { href: `#/m/${lv.modules[0]}` }, `Level ${lv.roman} · ${lv.name}`), icon('chevronRight'),
    el('span', `Module ${String(mod.n).padStart(2, '0')}`)
  ]));

  /* ── header card ──────────────────────────────────────── */
  const cta = nextL
    ? el('a.btn.btn--primary', { href: `#/m/${mod.n}/l/${nextL.index}` },
        [p.done ? `Continue with ${nextL.id}` : 'Start module', icon('arrowRight', 17)])
    : el('a.btn', { href: `#/m/${mod.n}/l/1` }, [icon('reset', 16), 'Review from 1']);

  wrap.append(el('section.mhero', [
    el('div.mhero__num.num', String(mod.n).padStart(2, '0')),
    el('div.mhero__body', [
      el('span.kicker', `Level ${lv.roman} · ${lv.name}`),
      el('h1', mod.title),
      el('p', mod.blurb),
      el('div.row', [
        el('span.pill', [icon('book', 13), `${mod.lessons.length} lessons`]),
        el('span.pill', [icon('clock', 13), `${mod.minutes} min`]),
        el('span.pill', [icon('zap', 13), `${num(xp, 0)} XP`]),
        p.pct === 1 && el('span.pill.pill--bull', [icon('check', 13), 'Completed'])
      ])
    ]),
    el('div.mhero__side', [
      el('div.mhero__ring', [ring(p.pct, 104, 9), el('b.num', pctPlain(p.pct))]),
      cta
    ])
  ]));

  /* ── lessons + side cards ─────────────────────────────── */
  const list = el('div.panel.llist', [
    el('div.cardhead', [
      el('h3', 'Lessons'),
      el('small', `${p.done} of ${p.total} complete`)
    ])
  ]);
  const rows = el('div');
  mod.lessons.forEach(l => {
    const done = state.lessonDone(l.id);
    const isNext = nextL && l.id === nextL.id;
    rows.append(el('a', {
      class: 'litem' + (done ? ' is-done' : '') + (isNext ? ' is-next' : ''),
      href: `#/m/${mod.n}/l/${l.index}`
    }, [
      el('span.litem__st.num', done ? icon('check', 16) : l.id),
      el('span.litem__t', [
        el('b', l.title),
        el('small', done ? 'Completed' : isNext ? (p.done ? 'Up next' : 'Start here') : `Lesson ${l.id}`)
      ]),
      el('span.litem__meta', [
        el('span', [icon('clock'), `${l.minutes} min`]),
        el('span', [icon('zap'), `${l.xp} XP`])
      ]),
      icon('chevronRight', 18)
    ]));
  });
  list.append(rows);
  stagger(rows);

  const side = el('div.mside');

  const q = state.load().quizScores['m' + mod.n];
  const passed = state.quizPassed('m' + mod.n);
  side.append(el('div.panel.acard', [
    el('div.acard__top', [
      el('span.tile', { style: { '--tone': passed ? 'var(--bull)' : 'var(--accent)' } }, icon(passed ? 'checkCircle' : 'help', 20)),
      el('div', [
        el('b', `Module ${mod.n} quiz`),
        el('small', passed ? `Passed · best ${pctPlain(q.best)}` : q ? `Best so far ${pctPlain(q.best)} · pass mark 70%` : 'Pass mark 70%')
      ])
    ]),
    el('p', passed
      ? 'You can retake it any time. Replays still write to your equity curve.'
      : 'A failed attempt costs XP and prints a red candle — that is the point.'),
    el('a', { class: 'btn btn--block ' + (passed ? '' : 'btn--primary'), href: `#/quiz/m${mod.n}` },
      [passed ? 'Retake quiz' : 'Take the quiz', icon('arrowRight', 17)])
  ]));

  if (mod.unlocksGame) {
    const g = M.games.find(x => x.id === mod.unlocksGame);
    if (g) {
      side.append(el('a.panel.acard.rcard', { href: `#/game/${g.id}` }, [
        el('div.acard__top', [
          el('span.tile', { style: { '--tone': gameTone(g.id).tone } }, icon(gameTone(g.id).icon, 20)),
          el('div', [el('b', g.title), el('small', 'Suggested after this module')])
        ]),
        el('p', g.blurb),
        el('span.btn.btn--block', ['Play', icon('play', 15)])
      ]));
    }
  }

  wrap.append(el('div.mgrid2', [list, side]));

  /* ── prev / next ──────────────────────────────────────── */
  const prev = M.modules.find(m => m.n === mod.n - 1);
  const next = M.modules.find(m => m.n === mod.n + 1);
  wrap.append(el('nav.pager', { 'aria-label': 'Modules' }, [
    prev && el('a', { href: `#/m/${prev.n}` }, [
      el('small', [icon('arrowLeft', 14), `Module ${String(prev.n).padStart(2, '0')}`]), el('b', prev.title)
    ]),
    next && el('a.pager__next', { href: `#/m/${next.n}` }, [
      el('small', [icon('arrowRight', 14), `Module ${String(next.n).padStart(2, '0')}`]), el('b', next.title)
    ])
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
