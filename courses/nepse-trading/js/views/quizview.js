/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — module quiz and boss quiz
   Boss quizzes draw from a pool ~2.5× their length, so a retry is a
   genuinely different exam.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import * as data from '../data.js';
import { el, frag, shuffle, num, pctPlain, announce } from '../util.js';
import { runQuiz } from '../quiz.js';

const COOLDOWN = { module: 60 * 1000, boss: 5 * 60 * 1000 };

export async function quiz(modN, isBoss) {
  const { modules: M } = ctx;
  const mod = M.modules.find(m => m.n === modN);
  if (!mod) return el('div.msg', el('h2', 'No such quiz'));

  const level = M.levels.find(l => l.modules.includes(modN));
  const key = isBoss ? 'boss' + modN : 'm' + modN;
  const passMark = isBoss ? 0.8 : 0.7;

  const bank = await data.quizBank().catch(() => ({ questions: [] }));
  const all = bank.questions || [];

  // module quiz: this module only. boss quiz: every module in the level.
  const scope = isBoss ? level.modules : [modN];
  const pool = all.filter(q => scope.includes(q.module));

  if (pool.length < 4) {
    return el('div.msg', [
      el('h2', 'Not enough questions yet'),
      el('p', `The question bank has ${pool.length} question${pool.length === 1 ? '' : 's'} for this scope. ` +
              `A quiz needs at least four.`),
      el('p', el('a.btn', { href: `#/m/${modN}` }, 'Back to the module'))
    ]);
  }

  const length = isBoss
    ? Math.min(pool.length, 22)
    : Math.min(pool.length, Math.max(8, Math.min(12, Math.round(pool.length * 0.7))));

  const prev = state.load().quizScores[key];
  const wait = prev?.lastAt ? (isBoss ? COOLDOWN.boss : COOLDOWN.module) - (Date.now() - prev.lastAt) : 0;

  const wrap = el('div');

  wrap.append(el('div.head', [
    el('span.head__kicker.kicker', isBoss ? `Boss quiz · Level ${level.roman}` : `Module ${String(modN).padStart(2, '0')} quiz`),
    el('h1', isBoss ? `Boss Quiz ${level.roman} — ${level.name}` : `${mod.title}`),
    el('p', isBoss
      ? `${length} questions drawn from a pool of ${pool.length}, covering Modules ${level.modules[0]}–${level.modules[level.modules.length - 1]}. ` +
        `Pass at ${Math.round(passMark * 100)}% to unlock the rank of ${level.rank}. A retry is a different draw.`
      : `${length} questions from Module ${modN}. Pass at ${Math.round(passMark * 100)}%. ` +
        `Every answer is explained, including the ones you get right.`)
  ]));

  if (prev) {
    wrap.append(el('div.row', { style: { marginBottom: 'var(--s5)' } }, [
      el('span.pill', `Best ${pctPlain(prev.best)}`),
      el('span.pill', `${prev.attempts} attempt${prev.attempts === 1 ? '' : 's'}`),
      prev.best >= passMark && el('span.pill.pill--bull', '✓ passed')
    ]));
  }

  if (wait > 0) {
    const secs = Math.ceil(wait / 1000);
    wrap.append(el('div.callout.callout--warn', [
      el('span.callout__l', 'Cooldown'),
      el('p', `You can retry in ${secs > 60 ? Math.ceil(secs / 60) + ' minutes' : secs + ' seconds'}. ` +
              `The wait is deliberate — going straight back in without rereading is how you memorise the options ` +
              `instead of the material.`),
      el('p', { style: { marginTop: 'var(--s3)' } },
        el('a.btn', { href: `#/m/${modN}` }, `Reread Module ${modN}`))
    ]));
    return wrap;
  }

  const picked = shuffle(pool).slice(0, length);
  const host = el('div');
  wrap.append(host);

  host.append(runQuiz(picked, {
    passMark,
    onFinish: (score, weakTags, card) => {
      const { pass, firstPass } = state.recordQuiz(key, score, isBoss);
      announce(pass ? `Passed with ${Math.round(score * 100)} percent.` : `Not passed. ${Math.round(score * 100)} percent.`);

      if (pass && isBoss) {
        card.append(el('div.callout.callout--info', {
          style: { marginTop: 'var(--s5)', textAlign: 'left', borderLeftColor: 'var(--signal)' }
        }, [
          el('span.callout__l', { style: { color: 'var(--signal)' } }, `Rank unlocked — ${level.rank}`),
          el('p', 'Look at your equity curve on the dashboard. The next candle opens above the previous close — ' +
                  'a gap up. That is what a boss quiz does to your chart, and by Module 10 you will know why real ' +
                  'charts gap too.')
        ]));
      }

      card.append(el('div.row', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
        el('a.btn', { href: `#/m/${modN}` }, `← Module ${modN}`),
        el('a.btn', { href: '#/' }, 'Dashboard'),
        !pass && el('button.btn.btn--primary', {
          onclick: () => { location.hash = '#/'; setTimeout(() => location.hash = isBoss ? `#/boss/${modN}` : `#/quiz/m${modN}`, 30); }
        }, 'Try again')
      ]));

      if (!pass) {
        card.append(el('p.widget__note', { style: { marginTop: 'var(--s4)' } },
          'A failed quiz costs XP and prints a red candle on your equity curve. That is deliberate — ' +
          'the chart should tell you the truth about your own progress, or it teaches you nothing.'));
      }
    }
  }));

  return wrap;
}
