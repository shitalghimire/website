/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — router and boot
   One HTML file, many views. replaceChildren rather than innerHTML,
   so listeners are never orphaned and no HTML is parsed from data.
   ═══════════════════════════════════════════════════════════════ */

import { boot } from './data.js';
import * as state from './state.js';
import { el, frag, num, pct, $, announce } from './util.js';
import * as views from './views/index.js';

export const ctx = {};        // shared course context: data + helpers

const routes = [
  [/^#\/$/,                          () => views.dashboard()],
  [/^#\/m\/(\d+)$/,                  m => views.module(+m)],
  [/^#\/m\/(\d+)\/l\/(\d+)$/,        (m, l) => views.lesson(+m, +l)],
  [/^#\/quiz\/m(\d+)$/,              m => views.quiz(+m, false)],
  [/^#\/boss\/(\d+)$/,               m => views.quiz(+m, true)],
  [/^#\/games$/,                     () => views.games()],
  [/^#\/game\/([a-z-]+)$/,           g => views.game(g)],
  [/^#\/glossary$/,                  () => views.glossary()],
  [/^#\/resources$/,                 () => views.resources()],
  [/^#\/settings$/,                  () => views.settings()],
  [/^#\/certificate$/,               () => views.certificate()]
];

let currentTeardown = null;

async function route() {
  const hash = location.hash || '#/';
  const view = $('#view');

  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (!m) continue;

    if (typeof currentTeardown === 'function') { try { currentTeardown(); } catch { /* ignore */ } }
    currentTeardown = null;

    view.replaceChildren(el('div.msg', el('p.dim', 'Loading…')));
    try {
      const out = await fn(...m.slice(1));
      const node = Array.isArray(out) ? frag(out) : (out?.node ?? out);
      currentTeardown = out?.teardown ?? null;
      view.replaceChildren(node ?? frag([]));
    } catch (err) {
      console.error(err);
      view.replaceChildren(errorView(err));
    }

    markNav(hash);
    paintXp();
    // focus the view for keyboard users, without yanking the scroll on
    // in-page anchor use
    view.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    return;
  }
  location.hash = '#/';
}

function markNav(hash) {
  document.querySelectorAll('#cnav a').forEach(a => {
    const on = a.getAttribute('href') === hash ||
      (a.getAttribute('href') === '#/' && hash === '#/');
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function errorView(err) {
  const isFetch = /fetch|HTTP|Failed|NetworkError/i.test(String(err?.message || err));
  return el('div.msg', [
    el('h2', isFetch ? 'The course data could not load' : 'Something went wrong'),
    isFetch
      ? frag([
        el('p', 'This course reads its curriculum, fees and market rules from JSON files, which browsers refuse to load from a plain file:// path.'),
        el('p', ['Serve the folder over HTTP and it will work. From the ', el('code', 'website'), ' folder:']),
        el('p', el('code', 'npx serve .')),
        el('p.dim', 'Any static server will do — it is deployed over HTTP, so this only affects opening the file directly from disk.')
      ])
      : el('p', String(err?.message || err)),
    el('p', el('a.btn', { href: '#/' }, 'Back to the dashboard'))
  ]);
}

export function paintXp() {
  const s = state.load();
  const r = state.rankFor(ctx.modules.levels, s.xp);
  const chip = $('#xpChip');
  $('#xpVal').textContent = num(s.xp, 0);
  chip.title = `${r.rank} — ${num(s.xp, 0)} XP` + (r.next ? `. ${num(r.toNext, 0)} XP to ${r.next.rank}.` : '. Highest rank reached.');
}

/* ── ticker ─────────────────────────────────────────────────── */

function buildTicker() {
  const run = $('#tickerRun');
  const { securities, index } = ctx;
  const items = [];

  items.push({ sym: 'NEPSE', price: index.current.index, chg: null, note: 'as at ' + index.current.asOf });

  // deterministic illustrative changes, seeded from the symbol so the tape is
  // stable across reloads — this is a texture, not a live quote
  const seeded = s => {
    let h = 0;
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return ((h % 900) / 10000) - 0.045;
  };
  for (const b of securities.banks) items.push({ sym: b.s, price: b.ltp, chg: seeded(b.s) });
  for (const h of securities.hydropower) items.push({ sym: h.s, price: h.ltp, chg: seeded(h.s) });

  const make = () => items.map(it => el('span.tk', [
    el('b', it.sym),
    el('span', num(it.price, 2)),
    it.chg != null
      ? el('span', { class: it.chg >= 0 ? 'up' : 'down' }, pct(it.chg))
      : el('span.dim', it.note)
  ]));

  // duplicated once so the -50% keyframe loops seamlessly
  run.replaceChildren(...make(), ...make());
}

/* ── boot ───────────────────────────────────────────────────── */

(async function start() {
  try {
    Object.assign(ctx, await boot());
  } catch (err) {
    console.error(err);
    $('#view').replaceChildren(errorView(err));
    return;
  }

  ctx.lessonCount = ctx.modules.modules.reduce((a, m) => a + m.lessons.length, 0);
  ctx.minutes = ctx.modules.modules.reduce((a, m) => a + m.minutes, 0);

  state.applySettings();
  buildTicker();

  $('#footAsOf').textContent =
    `Rules and fees verified ${ctx.rules.asOf}. Re-check after any Nepali budget or NRB monetary policy.`;

  state.subscribe(() => paintXp());

  addEventListener('hashchange', route);
  await route();

  // a returning learner is greeted with where they are, and nothing else
  const s = state.load();
  if (s.lastActiveDate && Object.keys(s.lessonsDone).length) {
    announce(`Welcome back. ${num(s.xp, 0)} XP, ${s.streakDays} day streak.`);
  }
})();
