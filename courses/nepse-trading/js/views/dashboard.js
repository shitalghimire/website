/* ═══════════════════════════════════════════════════════════════
   NEPSE TRADING ACADEMY — course dashboard
   Up-next hero, four KPI cards, then the curriculum beside the
   equity curve and badges.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, num, pctPlain, stagger, mulberry32 } from '../util.js';
import { icon, ring } from '../icons.js';
import { equityCurve } from '../equity-curve.js';

export function dashboard() {
  const { modules: M, index } = ctx;
  const s = state.load();
  const prog = state.courseProgress(M.modules);
  const rank = state.rankFor(M.levels, s.xp);
  const started = prog.done > 0;

  const wrap = el('div.dash');

  wrap.append(hero(M, prog, started));

  /* ── KPI cards ────────────────────────────────────────── */
  const week = state.streakWeek();
  wrap.append(el('div.kpis', [
    kpi('Lessons done', 'book', 'var(--accent)',
      [num(prog.done, 0), el('small', `/ ${prog.total}`)],
      [el('div.bar', el('i', { style: { width: pctPlain(prog.pct, 1) } })), el('span.num', pctPlain(prog.pct))]),
    kpi('Experience', 'zap', 'var(--lv-2)',
      [num(s.xp, 0), el('small', 'XP')],
      rank.next ? `${num(rank.toNext, 0)} XP to ${rank.next.rank}` : `${rank.rank} — highest rank`),
    kpi('Study streak', 'flame', '#F2661B',
      [String(s.streakDays), el('small', s.streakDays === 1 ? 'day' : 'days')],
      [el('div.week', {
        role: 'img', 'aria-label': `Study activity for the last seven days: ${week.filter(Boolean).length} active days.`
      }, week.map(on => el('i', { class: on ? 'on' : '' })))]),
    kpi('NEPSE index', 'trendingUp', 'var(--lv-3)',
      [num(index.current.index, 2)],
      `As at ${index.current.asOf}`)
  ]));

  /* ── curriculum + rail ────────────────────────────────── */
  const curr = el('section.curr', { 'aria-labelledby': 'currTitle' });
  const rail = el('aside.dash__rail');
  wrap.append(el('div.dash__grid', [curr, rail]));

  const levelNodes = M.levels.map(lv => levelBlock(lv, M));
  const filter = el('div.seg', { role: 'group', 'aria-label': 'Filter by level' });
  const setFilter = n => {
    filter.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lv === n)));
    levelNodes.forEach((node, i) => { node.hidden = n !== 0 && M.levels[i].n !== n; });
  };
  filter.append(
    el('button', { type: 'button', dataset: { lv: '0' }, 'aria-pressed': 'true', onclick: () => setFilter(0) }, 'All'),
    ...M.levels.map(lv => el('button', {
      type: 'button', dataset: { lv: String(lv.n) }, 'aria-pressed': 'false', onclick: () => setFilter(lv.n)
    }, `${lv.roman} · ${lv.name}`))
  );

  curr.append(
    el('div.sechead', [
      el('div', [
        el('h2', { id: 'currTitle' }, 'Curriculum'),
        el('p', `${M.modules.length} modules in four levels. Every module is open — the order is a suggestion, not a gate.`)
      ]),
      filter
    ]),
    ...levelNodes
  );

  /* equity curve */
  const eq = equityCurve({ height: 260, levels: M.levels });
  rail.append(el('div.chart', [
    el('div.chart__head', [
      el('div', [
        el('span.chart__t', 'Your equity curve'),
        el('span.chart__sub', { style: { display: 'block' } }, 'One candle per study session')
      ]),
      el('span', { class: 'pill ' + (started ? 'pill--signal' : '') }, started ? `${num(s.xp, 0)} XP` : 'Not started')
    ]),
    eq.node
  ]));

  /* rank */
  const lvNow = M.levels.find(l => l.n === rank.level);
  const toNextPct = rank.next ? (s.xp - lvNow.rankXp) / (rank.next.rankXp - lvNow.rankXp) : 1;
  rail.append(el('div.panel.railcard', [
    el('div.cardhead', [el('h3', 'Rank'), el('small', `Level ${lvNow.roman}`)]),
    el('div.acard__top', [
      el('span.tile.tile--lg', { style: { '--tone': `var(--lv-${rank.level})` } }, icon('shield', 24)),
      el('div', [
        el('b', { style: { fontSize: '1.125rem' } }, rank.rank),
        el('small', rank.next ? `Next: ${rank.next.rank} at ${num(rank.next.rankXp, 0)} XP` : 'Highest rank reached')
      ])
    ]),
    el('div.kpi__foot', { style: { marginTop: '16px' } }, [
      el('div.bar', { style: { '--tone': `var(--lv-${rank.level})` } }, el('i', { style: { width: pctPlain(Math.max(0, Math.min(1, toNextPct)), 1) } })),
      el('span.num', pctPlain(Math.max(0, Math.min(1, toNextPct))))
    ])
  ]));

  /* badges */
  const earned = M.badges.filter(b => s.badges.includes(b.id)).length;
  rail.append(el('div.panel.railcard', [
    el('div.cardhead', [el('h3', 'Badges'), el('small', `${earned} of ${M.badges.length}`)]),
    el('div.badges', M.badges.map(b => {
      const got = s.badges.includes(b.id);
      return el('div', { class: 'badge ' + (got ? 'badge--got' : 'badge--locked'), title: b.criterion }, [
        el('span.badge__ic', icon(got ? 'award' : 'lock', got ? 20 : 16)),
        el('span.badge__n', b.name)
      ]);
    }))
  ]));

  stagger(curr);
  return wrap;
}

/* ── hero ───────────────────────────────────────────────────── */

function hero(M, prog, started) {
  const next = state.nextLesson(M.modules);
  const node = el('section.hero');
  node.append(el('div.hero__art', candleArt()));

  const ringBox = el('div.hero__ring', [
    ring(prog.pct, 176, 12),
    el('div.hero__ringtxt', [
      el('b.num', pctPlain(prog.pct)),
      el('small', `${prog.done} of ${prog.total} lessons`)
    ])
  ]);

  let body;
  if (!next) {
    body = el('div', [
      el('span.hero__eyebrow', [el('i', 'Done'), 'All 78 lessons complete']),
      el('h1', 'You have finished the course.'),
      el('p', 'Pass all four boss quizzes to unlock the certificate — it carries your own equity curve.'),
      el('div.hero__actions', [
        el('a.btn.btn--lime.btn--lg', { href: '#/certificate' }, ['View certificate', icon('arrowRight', 18)]),
        el('a.btn.btn--glass.btn--lg', { href: '#/games' }, 'Play the games')
      ])
    ]);
  } else if (!started) {
    const hours = Math.floor(ctx.minutes / 60), mins = ctx.minutes % 60;
    body = el('div', [
      el('span.hero__eyebrow', [el('i', 'New'), 'Rules, fees and tax verified for 2026']),
      el('h1', ['Learn to trade the ', el('span.mark', 'Nepal Stock Exchange'), ' — properly.']),
      el('p', 'By the last lesson you will place a correctly-priced limit order, calculate your exact break-even ' +
              'including capital gains tax, read a candlestick chart of a real hydropower counter, and know why ' +
              'you should not trust the Viber group.'),
      el('div.hero__meta', [
        el('span', [icon('layers', 16), `${M.modules.length} modules`]),
        el('span', [icon('book', 16), `${ctx.lessonCount} lessons`]),
        el('span', [icon('games', 16), `${M.games.length} games`]),
        el('span', [icon('clock', 16), `${hours}h ${mins}m`])
      ]),
      el('div.hero__actions', [
        el('a.btn.btn--lime.btn--lg', { href: `#/m/${next.mod.n}/l/${next.lesson.index}` }, ['Start lesson 1.1', icon('arrowRight', 18)]),
        el('a.btn.btn--glass.btn--lg', { href: `#/m/${next.mod.n}` }, 'See Module 1')
      ])
    ]);
  } else {
    const mp = state.moduleProgress(next.mod);
    body = el('div', [
      el('span.hero__eyebrow', [el('i', 'Up next'), `Module ${String(next.mod.n).padStart(2, '0')} · ${next.mod.title}`]),
      el('h2', next.lesson.title),
      el('p', next.mod.blurb),
      el('div.hero__meta', [
        el('span', [icon('book', 16), `Lesson ${next.lesson.id}`]),
        el('span', [icon('clock', 16), `${next.lesson.minutes} min`]),
        el('span', [icon('zap', 16), `+${next.lesson.xp} XP`]),
        el('span', [icon('target', 16), `${mp.done} of ${mp.total} done in this module`])
      ]),
      el('div.hero__actions', [
        el('a.btn.btn--lime.btn--lg', { href: `#/m/${next.mod.n}/l/${next.lesson.index}` }, ['Resume lesson', icon('arrowRight', 18)]),
        el('a.btn.btn--glass.btn--lg', { href: `#/m/${next.mod.n}` }, 'Module overview')
      ])
    ]);
  }

  node.append(body, ringBox);
  return node;
}

/** Decorative candles behind the hero copy. Seeded, so it never shifts. */
function candleArt() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 200');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  const rnd = mulberry32(2083);
  let p = 120;
  for (let i = 0; i < 22; i++) {
    const o = p;
    const c = o + (rnd() - 0.42) * 26;
    const h = Math.max(o, c) + rnd() * 12;
    const l = Math.min(o, c) - rnd() * 12;
    p = c;
    const x = 12 + i * 18;
    const y = v => 200 - v * 0.85;
    const up = c <= o;               // svg y runs downward; a falling value draws upward
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', up ? 'up' : 'down');
    const wick = document.createElementNS(NS, 'line');
    wick.setAttribute('x1', x); wick.setAttribute('x2', x);
    wick.setAttribute('y1', y(h)); wick.setAttribute('y2', y(l));
    wick.setAttribute('stroke-width', '1.4');
    const body = document.createElementNS(NS, 'rect');
    body.setAttribute('x', x - 5); body.setAttribute('width', 10);
    body.setAttribute('y', Math.min(y(o), y(c)));
    body.setAttribute('height', Math.max(2, Math.abs(y(o) - y(c))));
    body.setAttribute('rx', 1.5);
    body.setAttribute('stroke-width', '1.4');
    g.append(wick, body);
    svg.append(g);
  }
  return svg;
}

/* ── KPI card ───────────────────────────────────────────────── */

function kpi(label, ic, tone, value, foot) {
  return el('div.kpi', { style: { '--tone': tone } }, [
    el('div.kpi__top', [
      el('span.kpi__label', label),
      el('span.tile', icon(ic, 19))
    ]),
    el('div.kpi__val.num', value),
    el('div.kpi__foot', foot)
  ]);
}

/* ── one level of the curriculum ────────────────────────────── */

function levelBlock(lv, M) {
  const mods = lv.modules.map(n => M.modules.find(m => m.n === n)).filter(Boolean);
  const total = mods.reduce((a, m) => a + m.lessons.length, 0);
  const done = mods.reduce((a, m) => a + state.moduleProgress(m).done, 0);

  const node = el('section.lvl', { style: { '--lv': `var(--lv-${lv.n})` } }, [
    el('div.lvl__head', [
      el('span.lvl__badge', lv.roman),
      el('div.lvl__title', [
        el('h3', [lv.name, el('span.pill', [icon('shield', 13), lv.rank])]),
        el('p', lv.focus)
      ]),
      el('div.lvl__prog', [
        el('div.bar', el('i', { style: { width: pctPlain(total ? done / total : 0, 1) } })),
        el('span.num', `${done}/${total}`)
      ])
    ]),
    el('div.mgrid', mods.map(m => moduleCard(m, M)))
  ]);

  const lastMod = mods[mods.length - 1];
  if (lastMod?.bossQuizAfter) {
    const passed = state.quizPassed('boss' + lastMod.n, true);
    node.append(el('div', { class: 'boss' + (passed ? ' boss--passed' : '') }, [
      el('span.tile', icon('trophy', 20)),
      el('div.boss__txt', [
        el('b', `Boss Quiz ${lv.roman} — ${lv.name}`),
        el('small', passed
          ? `Passed. You hold the rank of ${lv.rank}.`
          : `Covers Modules ${lv.modules[0]}–${lv.modules[lv.modules.length - 1]}. Pass at 80% to earn the rank of ${lv.rank}.`)
      ]),
      passed
        ? el('span.pill.pill--bull', [icon('check', 13), 'Passed'])
        : el('a.btn.btn--sm', { href: `#/boss/${lastMod.n}` }, ['Take the quiz', icon('arrowRight', 15)])
    ]));
  }
  return node;
}

function moduleCard(mod, M) {
  const p = state.moduleProgress(mod);
  const done = p.pct === 1;
  const current = !done && p.done > 0;
  const game = mod.unlocksGame ? M.games.find(x => x.id === mod.unlocksGame) : null;

  return el('a', {
    class: 'mcard' + (done ? ' mcard--done' : current ? ' mcard--current' : ''),
    href: `#/m/${mod.n}`
  }, [
    el('div.mcard__top', [
      el('span.mcard__n.num', `Module ${String(mod.n).padStart(2, '0')}`),
      done
        ? el('span.pill.pill--bull', [icon('check', 13), 'Completed'])
        : current
          ? el('span.pill.pill--signal', 'In progress')
          : el('span.mcard__go', icon('arrowRight', 16))
    ]),
    el('h4', mod.title),
    el('p', mod.blurb),
    p.done > 0 && el('div.mcard__prog', [
      el('div.bar', el('i', { style: { width: pctPlain(p.pct, 1) } })),
      el('span.num', `${p.done}/${p.total}`)
    ]),
    el('div.mcard__foot', [
      el('span', [icon('book', 14), `${mod.lessons.length} lessons`]),
      el('span', [icon('clock', 14), `${mod.minutes} min`]),
      game && el('span.mcard__game', [icon('games', 14), game.title])
    ])
  ]);
}
