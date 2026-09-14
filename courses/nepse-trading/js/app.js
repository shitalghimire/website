/* ═══════════════════════════════════════════════════════════════
   NEPSE TRADING ACADEMY — router, app chrome and boot
   One HTML file, many views. replaceChildren rather than innerHTML,
   so listeners are never orphaned and no HTML is parsed from data.
   ═══════════════════════════════════════════════════════════════ */

import { boot } from './data.js';
import * as state from './state.js';
import { el, frag, num, pct, pctPlain, $, announce } from './util.js';
import { icon, brandMark } from './icons.js';
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

async function route({ keepScroll = false } = {}) {
  const hash = location.hash || '#/';
  const view = $('#view');
  const scrollY = window.scrollY;

  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (!m) continue;

    if (typeof currentTeardown === 'function') { try { currentTeardown(); } catch { /* ignore */ } }
    currentTeardown = null;

    if (!keepScroll) view.replaceChildren(el('div.msg', el('p.dim', 'Loading…')));
    try {
      const out = await fn(...m.slice(1));
      const node = Array.isArray(out) ? frag(out) : (out?.node ?? out);
      currentTeardown = out?.teardown ?? null;
      view.replaceChildren(node ?? frag([]));
    } catch (err) {
      console.error(err);
      view.replaceChildren(errorView(err));
    }

    closeSide();
    paintChrome(hash);
    if (keepScroll) {
      window.scrollTo({ top: scrollY, behavior: 'instant' in window ? 'instant' : 'auto' });
    } else {
      // focus the view for keyboard users, without yanking the scroll
      view.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    }
    return;
  }
  location.hash = '#/';
}

/** Navigate, re-rendering even when the hash is already current. */
export function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
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

/* ── chrome: everything outside the view ────────────────────── */

function paintChrome(hash = location.hash || '#/') {
  markNav(hash);
  paintXp();
  paintLevels(hash);
  paintSideCard();
  paintTheme();
}

function markNav(hash) {
  document.querySelectorAll('#cnav a').forEach(a => {
    const href = a.getAttribute('href');
    const on = href === hash ||
      (href === '#/' && (/^#\/m\//.test(hash) || /^#\/(quiz|boss)\//.test(hash))) ||
      (href === '#/games' && hash.startsWith('#/game/'));
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

export function paintXp() {
  const s = state.load();
  const r = state.rankFor(ctx.modules.levels, s.xp);
  const chip = $('#xpChip');
  $('#xpVal').textContent = num(s.xp, 0);
  $('#rankVal').textContent = r.rank;
  $('#rankInitial').textContent = r.rank.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  chip.title = `${r.rank} — ${num(s.xp, 0)} XP` + (r.next ? `. ${num(r.toNext, 0)} XP to ${r.next.rank}.` : '. Highest rank reached.');

  const streak = $('#streakChip');
  streak.replaceChildren(icon('flame', 16), el('b.num', String(s.streakDays)));
  streak.classList.toggle('is-on', s.streakDays > 0);
  streak.title = `${s.streakDays} day study streak`;
}

function paintLevels(hash) {
  const { levels, modules } = ctx.modules;
  const s = state.load();
  const activeMod = +(hash.match(/^#\/m\/(\d+)/)?.[1] || 0);

  $('#sideLevels').replaceChildren(...levels.map(lv => {
    const mods = modules.filter(m => lv.modules.includes(m.n));
    const total = mods.reduce((a, m) => a + m.lessons.length, 0);
    const done = mods.reduce((a, m) => a + m.lessons.filter(l => s.lessonsDone[l.id]).length, 0);
    const on = lv.modules.includes(activeMod);
    return el('li', el('a', {
      class: 'side__lv' + (on ? ' is-on' : ''),
      href: `#/m/${lv.modules[0]}`,
      style: { '--lv': `var(--lv-${lv.n})` }
    }, [
      el('span.side__dot'),
      el('span.side__lvname', [el('span.side__roman', lv.roman), lv.name]),
      el('span.side__lvpct.num', done ? pctPlain(done / total) : `${total}`)
    ]));
  }));
}

function paintSideCard() {
  const next = state.nextLesson(ctx.modules.modules);
  const card = $('#sideCard');
  const started = Object.keys(state.load().lessonsDone).length > 0;

  if (!next) {
    card.replaceChildren(
      el('span.side__cardic', icon('trophy', 18)),
      el('b', 'Every lesson done'),
      el('p', 'Pass the four boss quizzes to unlock your certificate.'),
      el('a.btn.btn--sm.btn--block', { href: '#/certificate' }, 'Certificate')
    );
    return;
  }
  card.replaceChildren(
    el('span.side__cardic', icon(started ? 'play' : 'sparkles', 18)),
    el('b', started ? 'Pick up where you left off' : 'Start with lesson 1.1'),
    el('p', `${next.lesson.id} · ${next.lesson.title}`),
    el('a.btn.btn--sm.btn--block.btn--dark', { href: `#/m/${next.mod.n}/l/${next.lesson.index}` },
      [started ? 'Resume' : 'Begin', icon('arrowRight', 15)])
  );
}

function paintTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const btn = $('#themeBtn');
  btn.replaceChildren(icon(dark ? 'sun' : 'moon', 18));
  btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  btn.title = dark ? 'Light mode' : 'Dark mode';
}

/* ── mobile sidebar ─────────────────────────────────────────── */

function openSide() {
  $('#app').classList.add('is-open');
  $('#scrim').hidden = false;
  $('#menuBtn').setAttribute('aria-expanded', 'true');
}
function closeSide() {
  $('#app').classList.remove('is-open');
  $('#scrim').hidden = true;
  $('#menuBtn').setAttribute('aria-expanded', 'false');
}

/* ── search: lessons and glossary terms ─────────────────────── */

function buildSearch() {
  const input = $('#searchIn');
  const list = $('#searchList');
  const { modules, glossary } = ctx;

  const lessons = modules.modules.flatMap(m => m.lessons.map(l => ({
    kind: 'lesson', key: `${l.id} ${l.title} ${m.title}`.toLowerCase(),
    title: l.title, sub: `Lesson ${l.id} · ${m.title}`, href: `#/m/${m.n}/l/${l.index}`
  })));
  const terms = Object.entries(glossary).map(([k, e]) => ({
    kind: 'term', key: `${e.en} ${e.rom || ''} ${k}`.toLowerCase(), np: e.np,
    title: e.en, sub: e.np, q: e.en
  }));

  let hits = [];
  let cursor = 0;

  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const open = item => {
    close();
    input.value = '';
    input.blur();
    if (item.kind === 'term') { ctx.glossaryQuery = item.q; go('#/glossary'); }
    else go(item.href);
  };

  const paint = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { close(); return; }
    const L = lessons.filter(x => x.key.includes(q)).slice(0, 6);
    const T = terms.filter(x => x.key.includes(q) || x.np.includes(input.value.trim())).slice(0, 5);
    hits = [...L, ...T];
    cursor = 0;

    const item = (h, i) => el('button.search__item', {
      type: 'button', role: 'option', 'aria-selected': String(i === cursor),
      onmousedown: e => { e.preventDefault(); open(h); },
      onmouseenter: () => { cursor = i; mark(); }
    }, [
      el('span.search__tile', icon(h.kind === 'lesson' ? 'book' : 'glossary', 16)),
      el('span.search__txt', [
        el('b', h.title),
        el('small', { class: h.kind === 'term' ? 'np' : '' }, h.sub)
      ]),
      icon('chevronRight', 16)
    ]);

    const nodes = [];
    if (L.length) nodes.push(el('span.search__group', 'Lessons'), ...L.map((h, i) => item(h, i)));
    if (T.length) nodes.push(el('span.search__group', 'Glossary'), ...T.map((h, i) => item(h, i + L.length)));
    if (!hits.length) nodes.push(el('p.search__empty', `Nothing matches “${input.value.trim()}”.`));
    list.replaceChildren(...nodes);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const mark = () => list.querySelectorAll('.search__item').forEach((b, i) => {
    b.setAttribute('aria-selected', String(i === cursor));
    if (i === cursor) b.scrollIntoView({ block: 'nearest' });
  });

  input.addEventListener('input', paint);
  input.addEventListener('focus', () => { if (input.value.trim()) paint(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); cursor = (cursor + 1) % hits.length; mark(); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); cursor = (cursor - 1 + hits.length) % hits.length; mark(); }
    else if (e.key === 'Enter' && hits[cursor]) { e.preventDefault(); open(hits[cursor]); }
    else if (e.key === 'Escape') { close(); input.blur(); }
  });

  addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    input.focus();
  });
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
    el('span.num', num(it.price, 2)),
    it.chg != null
      ? el('span', { class: 'tk__chg ' + (it.chg >= 0 ? 'up' : 'down') }, [it.chg >= 0 ? '▲ ' : '▼ ', pct(it.chg)])
      : el('span.tk__note', it.note)
  ]));

  // duplicated once so the -50% keyframe loops seamlessly
  run.replaceChildren(...make(), ...make());
}

/* ── boot ───────────────────────────────────────────────────── */

function mountChromeIcons() {
  $('#brandMark').replaceChildren(brandMark(34));
  $('#sideClose').replaceChildren(icon('x', 18));
  $('#menuBtn').replaceChildren(icon('menu', 20));
  $('#searchIc').replaceChildren(icon('search', 17));
  $('#sideSite').prepend(icon('arrowLeft', 15));
  document.querySelectorAll('#cnav a').forEach(a => {
    a.prepend(icon(a.dataset.icon, 19));
  });

  $('#menuBtn').addEventListener('click', openSide);
  $('#sideClose').addEventListener('click', closeSide);
  $('#scrim').addEventListener('click', closeSide);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSide(); });

  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    state.setSetting('theme', dark ? 'light' : 'dark');
    announce(dark ? 'Light mode' : 'Dark mode');
  });
}

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
  mountChromeIcons();
  buildTicker();
  buildSearch();

  $('#footAsOf').textContent =
    `Rules and fees verified ${ctx.rules.asOf}. Re-check after any Nepali budget or NRB monetary policy.`;

  state.subscribe(() => paintChrome());

  // Charts read colours when they draw. CandleChart and some widgets redraw
  // on resize; lesson widgets draw once, so a lesson is re-rendered in place.
  addEventListener('themechange', () => {
    paintTheme();
    dispatchEvent(new Event('resize'));
    if (/^#\/m\/\d+\/l\/\d+$/.test(location.hash)) {
      const view = $('#view');
      view.classList.add('view--still');
      route({ keepScroll: true }).then(() => setTimeout(() => view.classList.remove('view--still'), 60));
    }
  });

  addEventListener('hashchange', () => route());
  await route();

  // a returning learner is greeted with where they are, and nothing else
  const s = state.load();
  if (s.lastActiveDate && Object.keys(s.lessonsDone).length) {
    announce(`Welcome back. ${num(s.xp, 0)} XP, ${s.streakDays} day streak.`);
  }
})();
