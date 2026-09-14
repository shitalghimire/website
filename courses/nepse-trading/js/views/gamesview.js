/* ═══════════════════════════════════════════════════════════════
   NEPSE TRADING ACADEMY — game list and game host
   Game modules are imported lazily on first navigation to #/game/*,
   so nothing a learner has not opened costs them a byte.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, frag, num, pctPlain, announce, stagger } from '../util.js';
import { icon } from '../icons.js';

const LOADERS = {
  'circuit-breaker': () => import('../games/circuit-breaker.js'),
  'brokers-cut':     () => import('../games/brokers-cut.js'),
  'candle-sensei':   () => import('../games/candle-sensei.js'),
  'terminal-drill':  () => import('../games/terminal-drill.js'),
  'ratio-rush':      () => import('../games/ratio-rush.js'),
  'paper-floor':     () => import('../games/paper-floor.js')
};

const TONES = {
  'circuit-breaker': { icon: 'zap',       tone: 'var(--lv-2)', kind: 'True or false' },
  'terminal-drill':  { icon: 'terminal',  tone: 'var(--accent)', kind: 'Simulation' },
  'paper-floor':     { icon: 'briefcase', tone: 'var(--lv-3)', kind: 'Paper trading' },
  'brokers-cut':     { icon: 'receipt',   tone: 'var(--lv-4)', kind: 'Arithmetic' },
  'candle-sensei':   { icon: 'candles',   tone: 'var(--accent)', kind: 'Pattern reading' },
  'ratio-rush':      { icon: 'percent',   tone: 'var(--lv-2)', kind: 'Ratios' }
};
export const gameTone = id => TONES[id] || { icon: 'games', tone: 'var(--accent)', kind: 'Game' };

export function games() {
  const { modules: M } = ctx;
  const s = state.load();

  const grid = el('div.ggrid');
  for (const g of M.games) {
    const high = s.gameHighs[g.id];
    const t = gameTone(g.id);
    grid.append(el('a.gcard', { href: `#/game/${g.id}`, style: { '--tone': t.tone } }, [
      el('div.gcard__art', [el('span', t.kind), icon(t.icon, 48)]),
      el('div.gcard__body', [el('h3', g.title), el('p', g.blurb)]),
      el('div.gcard__foot', [
        high
          ? el('span', ['Best ', el('b.num', num(high.score, 0)),
              high.accuracy != null ? ` · ${pctPlain(high.accuracy)} accuracy` : '',
              ` · ${high.plays} play${high.plays === 1 ? '' : 's'}`])
          : el('span', `Pairs with Module ${g.unlockedByModule}`),
        el('span.gcard__play', icon('play', 15))
      ])
    ]));
  }
  stagger(grid);

  const played = M.games.filter(g => s.gameHighs[g.id]).length;

  return frag([
    el('div.phead', [
      el('div.phead__txt', [
        el('span.eyebrow', [icon('games', 13), 'Practice']),
        el('h1', 'The games'),
        el('p', 'Six games. Every one is keyboard-playable on a desktop and thumb-playable on a phone, and every one ' +
                'writes to your equity curve. Replays award a quarter of the XP, so grinding is possible but never optimal.')
      ]),
      el('span.pill', { style: { padding: '6px 14px', fontSize: '0.8125rem' } }, `${played} of ${M.games.length} played`)
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
  const t = gameTone(id);

  wrap.append(el('nav.crumbs', { 'aria-label': 'Breadcrumb', style: { marginBottom: 0 } }, [
    el('a', { href: '#/' }, 'Dashboard'), icon('chevronRight'),
    el('a', { href: '#/games' }, 'Games'), icon('chevronRight'),
    el('span', def.title)
  ]));

  wrap.append(el('div.game__head', { style: { '--tone': t.tone } }, [
    el('div.game__id', [
      el('span.tile.tile--lg', icon(t.icon, 26)),
      el('div', [
        el('h1.game__title', def.title),
        el('p.game__blurb', def.blurb)
      ])
    ]),
    high && el('div.game__best', [
      el('small', 'Personal best'),
      el('b.num', num(high.score, 0))
    ])
  ]));

  const container = el('div.game__stage');
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
