/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — game list and game host
   Game modules are imported lazily on first navigation to #/game/*,
   so nothing a learner has not opened costs them a byte.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, frag, num, pctPlain, announce, stagger } from '../util.js';

const LOADERS = {
  'circuit-breaker': () => import('../games/circuit-breaker.js'),
  'brokers-cut':     () => import('../games/brokers-cut.js'),
  'candle-sensei':   () => import('../games/candle-sensei.js'),
  'terminal-drill':  () => import('../games/terminal-drill.js'),
  'ratio-rush':      () => import('../games/ratio-rush.js'),
  'paper-floor':     () => import('../games/paper-floor.js')
};

export function games() {
  const { modules: M } = ctx;
  const s = state.load();

  const grid = el('div.gamegrid');
  for (const g of M.games) {
    const unlocked = state.gameUnlocked(g, M.modules);
    const high = s.gameHighs[g.id];
    const node = el(unlocked ? 'a' : 'div', {
      class: 'gcard' + (unlocked ? '' : ' gcard--locked'),
      href: unlocked ? `#/game/${g.id}` : null,
      'aria-disabled': unlocked ? null : 'true'
    }, [
      el('h3', g.title),
      el('p', g.blurb),
      unlocked
        ? (high
          ? el('div.gcard__best', `Best ${num(high.score, 0)}${high.accuracy != null ? ` · ${pctPlain(high.accuracy)} accuracy` : ''} · ${high.plays} play${high.plays === 1 ? '' : 's'}`)
          : el('div.gcard__best', 'Not played yet'))
        : el('div', { style: { marginTop: 'var(--s3)' } }, el('span.pill', `Unlocks in Module ${g.unlockedByModule}`))
    ]);
    grid.append(node);
  }
  stagger(grid);

  return frag([
    el('div.head', [
      el('span.head__kicker.kicker', 'Practice'),
      el('h1', 'The games'),
      el('p', 'Six games. Every one is keyboard-playable on a desktop and thumb-playable on a phone, and every one ' +
              'writes to your equity curve. Replays award a quarter of the XP, so grinding is possible but never optimal.')
    ]),
    grid,
    el('div.callout.callout--info', { style: { marginTop: 'var(--s6)' } }, [
      el('span.callout__l', 'Why the games matter more than they look'),
      el('p', 'Broker\'s Cut is the only way most people ever learn to read their own contract note. Terminal Drill ' +
              'makes you fail EDIS once, in a place where failing is free. Paper Floor charges you real commission, ' +
              'real SEBON fee, real DP charge and real capital gains tax on every fill. None of that is decoration.')
    ])
  ]);
}

export async function game(id) {
  const { modules: M } = ctx;
  const meta = M.games.find(g => g.id === id);
  if (!meta) return el('div.msg', [el('h2', 'No such game'), el('p', el('a.btn', { href: '#/games' }, 'All games'))]);

  if (!state.gameUnlocked(meta, M.modules)) {
    return el('div.msg', [
      el('h2', `${meta.title} is locked`),
      el('p', `It unlocks when you start Module ${meta.unlockedByModule}. The game assumes what that module teaches — ` +
              `playing it earlier would just be guessing.`),
      el('p', el('a.btn', { href: `#/m/${meta.unlockedByModule}` }, `Go to Module ${meta.unlockedByModule}`))
    ]);
  }

  const load = LOADERS[id];
  if (!load) return el('div.msg', el('h2', 'That game is not available.'));

  let mod;
  try { mod = await load(); }
  catch (err) {
    console.error(err);
    return el('div.msg', [el('h2', 'That game could not load'), el('p', String(err.message || err))]);
  }

  const def = mod.default;
  const wrap = el('div.game');
  const s = state.load();
  const high = s.gameHighs[id];

  wrap.append(el('div.row', { style: { marginBottom: 'var(--s3)' } },
    el('a.kicker', { href: '#/games' }, '← All games')));

  wrap.append(el('div.game__head', [
    el('div', [
      el('h1.game__title', def.title),
      el('p.game__blurb', def.blurb)
    ]),
    high && el('div', { style: { textAlign: 'right' } }, [
      el('span.kicker', { style: { display: 'block' } }, 'Personal best'),
      el('span.num', { style: { fontSize: 'var(--t-lg)', color: 'var(--signal)' } }, num(high.score, 0))
    ])
  ]));

  const container = el('div');
  wrap.append(container);

  const gctx = {
    state,
    data: ctx,
    prefersReducedMotion: document.documentElement.dataset.motion === '0' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    onScore: () => {},
    onEnd: result => {
      const rec = state.recordGame(id, {
        score: result.score || 0,
        accuracy: result.accuracy ?? null,
        meta: result.meta || {}
      });
      announce(`Run finished. Score ${num(result.score || 0, 0)}.` +
        (rec.beat ? ' New personal best.' : ''));
      return rec;
    }
  };

  try { def.mount(container, gctx); }
  catch (err) {
    console.error(err);
    container.replaceChildren(el('div.msg', [el('h2', 'This game hit an error'), el('p', String(err.message || err))]));
  }

  return { node: wrap, teardown: () => { try { def.unmount?.(); } catch { /* ignore */ } } };
}
