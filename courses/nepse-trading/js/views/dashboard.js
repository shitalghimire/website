/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — course dashboard
   38/62 split: module tree on the left, Equity Curve on the right.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, frag, num, pctPlain, deva2, stagger, rsScale } from '../util.js';
import { equityCurve } from '../equity-curve.js';

export function dashboard() {
  const { modules: M, index } = ctx;
  const s = state.load();
  const prog = state.courseProgress(M.modules);
  const rank = state.rankFor(M.levels, s.xp);
  const started = prog.done > 0;

  const wrap = el('div');

  /* ── hero ─────────────────────────────────────────────── */
  wrap.append(el('div.dash__hero', [
    el('span.kicker', `${deva2(1)} / NEPSE TRADING ACADEMY`),
    el('h1.dash__title', [
      'Learn to trade the',
      el('em', 'Nepal Stock Exchange.')
    ]),
    el('p', { class: 'prose', style: { color: 'var(--paper-2)' } },
      'Four hours, end to end. By the last lesson you will place a correctly-priced limit order, ' +
      'calculate your exact break-even including capital gains tax, read a candlestick chart of a real ' +
      'NEPSE hydropower counter, and know why you should not trust the Viber group.')
  ]));

  /* ── stat strip ───────────────────────────────────────── */
  wrap.append(el('div.statrow', { style: { marginBottom: 'var(--s7)' } }, [
    statCell('Modules', num(M.modules.length, 0)),
    statCell('Lessons', num(ctx.lessonCount, 0)),
    statCell('Games', num(M.games.length, 0)),
    statCell('Runtime', `${Math.floor(ctx.minutes / 60)}h ${ctx.minutes % 60}m`),
    statCell('NEPSE', num(index.current.index, 2), `as at ${index.current.asOf}`)
  ]));

  /* ── the split ────────────────────────────────────────── */
  const left = el('div');
  const right = el('div');
  wrap.append(el('div.split', [left, right]));

  /* right column — the Equity Curve comes first, it is the signature */
  const eq = equityCurve({ height: 300, levels: M.levels });
  right.append(el('div.chart', [
    el('div.chart__head', [
      el('span.chart__t', 'Your Equity Curve'),
      el('span.chart__sub', started ? `${num(s.xp, 0)} XP` : 'not started')
    ]),
    eq.node
  ]));

  /* rank + progress */
  right.append(el('div.panel', { style: { marginTop: 'var(--s4)' } }, [
    el('div.rank', [
      el('span.kicker', 'Rank'),
      el('span.rank__name', rank.rank)
    ]),
    rank.next
      ? el('p.dim', { style: { fontSize: 'var(--t-xs)', marginTop: '6px' } },
          `${num(rank.toNext, 0)} XP to ${rank.next.rank}`)
      : el('p.dim', { style: { fontSize: 'var(--t-xs)', marginTop: '6px' } }, 'Highest rank reached.'),

    el('div', { style: { marginTop: 'var(--s5)' } }, [
      el('div.spread', { style: { marginBottom: '6px' } }, [
        el('span.kicker', 'Course progress'),
        el('span.num', { style: { fontSize: 'var(--t-xs)' } }, `${prog.done} / ${prog.total}`)
      ]),
      el('div.railrow', [
        el('div.rail', el('div.rail__fill', { style: { width: pctPlain(prog.pct, 1) } })),
        el('span.pct', pctPlain(prog.pct))
      ])
    ]),

    streakRow(),

    el('div', { style: { marginTop: 'var(--s5)' } }, continueButton())
  ]));

  /* badges */
  right.append(el('div.panel', { style: { marginTop: 'var(--s4)' } }, [
    el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s4)' } }, 'Badges'),
    el('div.badges', M.badges.map(b => {
      const got = s.badges.includes(b.id);
      return el('div', { class: 'badge ' + (got ? 'badge--got' : 'badge--locked') }, [
        el('div.badge__hex', got ? '◆' : '◇'),
        el('div.badge__n', [b.name, el('span.badge__c', b.criterion)])
      ]);
    }))
  ]));

  /* left column — the module tree */
  M.levels.forEach(lv => {
    const lvNode = el('section.level', [
      el('div.level__head', [
        el('span.level__roman', lv.roman),
        el('span.level__name', lv.name),
        el('span.pill', lv.rank),
        el('span.level__focus', lv.focus)
      ])
    ]);

    const mods = el('div.mods');
    lv.modules.forEach(n => {
      const mod = M.modules.find(m => m.n === n);
      if (!mod) return;
      mods.append(moduleRow(mod, M));
    });
    lvNode.append(mods);

    // the boss quiz that closes the level
    const lastMod = M.modules.find(m => m.n === lv.modules[lv.modules.length - 1]);
    if (lastMod?.bossQuizAfter) {
      const ready = state.moduleProgress(lastMod).pct >= 0.8;
      const passed = state.quizPassed('boss' + lastMod.n, true);
      lvNode.append(el('a', {
        class: 'btn ' + (passed ? 'btn--bull' : ready ? 'btn--primary' : ''),
        href: ready ? `#/boss/${lastMod.n}` : null,
        style: { marginTop: 'var(--s3)', width: '100%' },
        'aria-disabled': ready ? null : 'true',
        onclick: ready ? null : (e => e.preventDefault())
      }, passed
        ? `✓ Boss Quiz ${lv.roman} passed — Rank: ${lv.rank}`
        : ready ? `Boss Quiz ${lv.roman} → Rank: ${lv.rank}`
        : `Boss Quiz ${lv.roman} — finish Module ${lastMod.n} to unlock`));
    }

    left.append(lvNode);
  });

  stagger(left);
  return wrap;
}

function statCell(label, value, sub) {
  return el('div.stat', [
    el('span.stat__l', label),
    el('span.stat__v', value),
    sub && el('span.stat__s', sub)
  ]);
}

function streakRow() {
  const s = state.load();
  const week = state.streakWeek();
  return el('div', { style: { marginTop: 'var(--s5)' } }, [
    el('div.spread', { style: { marginBottom: '6px' } }, [
      el('span.kicker', 'Streak'),
      el('span.num', { style: { fontSize: 'var(--t-xs)' } },
        `${s.streakDays} day${s.streakDays === 1 ? '' : 's'}`)
    ]),
    el('div.streak', { role: 'img', 'aria-label': `Study activity for the last seven days: ${week.filter(Boolean).length} active days.` },
      week.map((on, i) => el('i', {
        class: on ? 'on' : '',
        style: { height: (on ? 12 + i * 2 : 8) + 'px' }
      })))
  ]);
}

/** "Continue" resolves to the first incomplete lesson in the first open module. */
function continueButton() {
  const { modules: M } = ctx;
  for (const mod of M.modules) {
    if (!state.moduleUnlocked(M.modules, mod.n)) break;
    const next = mod.lessons.find(l => !state.lessonDone(l.id));
    if (next) {
      const started = Object.keys(state.load().lessonsDone).length > 0;
      return el('a.btn.btn--primary', {
        href: `#/m/${mod.n}/l/${next.index}`,
        style: { width: '100%' }
      }, started ? `Continue — ${next.id} ${short(next.title)}` : 'Start the course');
    }
  }
  return state.certificateUnlocked(M.modules)
    ? el('a.btn.btn--primary', { href: '#/certificate', style: { width: '100%' } }, 'View your certificate')
    : el('a.btn', { href: '#/games', style: { width: '100%' } }, 'All lessons done — play the games');
}

const short = t => t.length > 34 ? t.slice(0, 33).trimEnd() + '…' : t;

function moduleRow(mod, M) {
  const unlocked = state.moduleUnlocked(M.modules, mod.n);
  const p = state.moduleProgress(mod);
  const done = p.pct === 1;
  const current = !done && p.done > 0;

  const cls = ['mod'];
  if (!unlocked) cls.push('mod--locked');
  if (done) cls.push('mod--done');
  else if (current) cls.push('mod--current');

  const meta = [
    el('span', `${mod.lessons.length} lessons`),
    el('span', `${mod.minutes} min`)
  ];
  if (mod.unlocksGame) {
    const g = M.games.find(x => x.id === mod.unlocksGame);
    if (g) meta.push(el('span.hi', `▸ ${g.title}`));
  }

  const node = el(unlocked ? 'a' : 'div', {
    class: cls.join(' '),
    href: unlocked ? `#/m/${mod.n}` : null,
    'aria-disabled': unlocked ? null : 'true',
    title: unlocked ? null : `Opens when Module ${mod.n - 1} is 80% complete and its quiz is passed`
  }, [
    el('span.mod__n.num', String(mod.n).padStart(2, '0')),
    el('div.mod__body', [
      el('h3', mod.title),
      el('div.mod__meta', meta),
      el('p.mod__blurb', mod.blurb)
    ]),
    el('div.mod__right', unlocked ? [
      el('span.mod__pct.num', pctPlain(p.pct)),
      el('div.rail.mod__rail', el('div.rail__fill', {
        style: { width: pctPlain(p.pct, 1) }
      }))
    ] : [el('span.pill', 'Locked')])
  ]);
  return node;
}
