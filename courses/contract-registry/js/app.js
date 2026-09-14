/* ═══════════════════════════════════════════════════════════════
   Shell: navigation, router, finder palette, theme, lock.
   ═══════════════════════════════════════════════════════════════ */

import { h, $, mount, marked, debounce, toast } from './lib/h.js';
import { icons, icon } from './lib/icons.js';
import { store, BLANK } from './lib/store.js';
import { createSync } from '../../sync/sync.js';
import { syncBadge, openSync } from './views/syncpanel.js';
import { forget } from './lib/vault.js';
import C from './engine/contract.js';
import * as S from './engine/search.js';

import desk from './views/desk.js';
import library from './views/library.js';
import clause from './views/clause.js';
import analyse from './views/analyse.js';
import write from './views/write.js';
import clock from './views/clock.js';
import cases from './views/cases.js';
import register from './views/register.js';
import learn from './views/learn.js';
import drill from './views/drill.js';
import tools from './views/tools.js';
import words from './views/words.js';

export const TABS = [
  { id: 'desk', label: 'Desk', icon: 'desk', href: '#/' },
  { id: 'read', label: 'Clauses', icon: 'book', href: '#/read' },
  { id: 'analyse', label: 'Analyse', icon: 'scan', href: '#/analyse' },
  { id: 'write', label: 'Draft', icon: 'pen', href: '#/write' },
  { id: 'clock', label: 'Clocks', icon: 'clock', href: '#/clock' },
  { id: 'cases', label: 'Cases', icon: 'folder', href: '#/cases' },
  { id: 'register', label: 'Letters', icon: 'list', href: '#/register' },
  { id: 'learn', label: 'Learn', icon: 'cap', href: '#/learn' },
  { id: 'drill', label: 'Practice', icon: 'cards', href: '#/drill' },
  { id: 'tools', label: 'Tools', icon: 'tools', href: '#/tools' },
  { id: 'words', label: 'Words', icon: 'words', href: '#/words' },
];

const ROUTES = [
  [/^\/?$/, desk, 'desk'],
  [/^\/read\/?$/, library, 'read'],
  [/^\/read\/([\w.]+)$/, clause, 'read'],
  [/^\/analyse\/?$/, analyse, 'analyse'],
  [/^\/write(?:\/([\w-]+))?\/?$/, write, 'write'],
  [/^\/clock\/?$/, clock, 'clock'],
  [/^\/cases(?:\/([\w-]+))?\/?$/, cases, 'cases'],
  [/^\/register\/?$/, register, 'register'],
  [/^\/learn(?:\/(\w+)(?:\/(\w+))?)?\/?$/, learn, 'learn'],
  [/^\/drill(?:\/([\w-]+))?\/?$/, drill, 'drill'],
  [/^\/tools(?:\/([\w-]+))?\/?$/, tools, 'tools'],
  [/^\/words\/?$/, words, 'words'],
];

let DATA;
export const ctx = { data: null, go: (href) => { location.hash = href.replace(/^#/, ''); }, crumbs: setCrumbs };

export let sync = null;

export function startApp(data, code) {
  DATA = data;
  ctx.data = data;
  C.init(data);
  S.build(data);

  sync = createSync({
    course: 'registry', file: 'registry.sync.json', template: BLANK(),
    spec: { ids: { clocks: 'id', analyses: 'at' }, local: ['opened'] },
    read: store.get, write: store.replace, subscribe: store.on,
    normalize: (s) => { s.days = [...new Set(s.days || [])].sort(); s.analyses = (s.analyses || []).sort((a, b) => b.at - a.at).slice(0, 30); return s; },
  });
  ctx.sync = sync;
  sync.on((st) => {
    if (st.state !== 'synced' || !st.remoteApplied) return;
    theme(store.get().settings.theme);
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    const path = location.hash.replace(/^#/, '').split('?')[0];
    if (!typing && /^\/?(read|clock|learn|drill|cases|tools)?\/?$/.test(path) && document.getElementById('palette').hidden) route();
    toast('Progress updated from your other device');
  });
  sync.unlock(code);
  store.touchDay();

  buildNav();
  theme(store.get().settings.theme);
  $('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.update((s) => { s.settings.theme = next; });
    theme(next);
  });
  $('#lockBtn').addEventListener('click', () => { forget(); location.reload(); });
  $('#lockBtn').before(syncBadge(sync));
  document.querySelector('.rail__sync').addEventListener('click', () => openSync(sync));
  $('#finderBtn').addEventListener('click', () => openPalette());
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); openPalette(); }
  });
  addEventListener('scroll', () => $('#topbar').classList.toggle('is-stuck', scrollY > 6), { passive: true });
  addEventListener('hashchange', route);
  route();
}

function theme(t) {
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  mount($('#themeBtn'), h('span', { html: dark ? icons.sun : icons.moon }));
  $('#themeBtn').title = dark ? 'Light pages' : 'Dark pages';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#12141B' : '#EFE8D8';
}

function buildNav() {
  mount($('#railTabs'), TABS.map((t) => h('a.rail__tab', { href: t.href, dataset: { tab: t.id } }, icon(t.icon), t.label)));
  mount($('#lockBtn'), h('span', { html: icons.lock }));
  $('#lockBtn').title = 'Lock the file';
  const dock = ['desk', 'read', 'analyse', 'write'].map((id) => TABS.find((t) => t.id === id));
  mount($('#dock'), dock.map((t) => h('a', { href: t.href, dataset: { tab: t.id } }, icon(t.icon), t.label)),
    h('button', { type: 'button', onclick: () => openMenu() }, icon('menu'), 'More'));
}

function route() {
  const [path, qs] = location.hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(qs || '');
  const view = $('#view');
  for (const [re, fn, tab] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    document.querySelectorAll('[data-tab]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.tab === tab) || a.removeAttribute('aria-current'));
    document.querySelectorAll(`[data-tab="${tab}"]`).forEach((a) => a.setAttribute('aria-current', 'page'));
    setCrumbs([]);
    mount(view);
    try { fn(view, { params, args: m.slice(1), ctx, data: DATA }); }
    catch (err) { console.error(err); mount(view, h('div.empty', 'Something went wrong drawing this page. ', h('a', { href: '#/' }, 'Back to the desk'))); }
    if (!params.has('s')) scrollTo({ top: 0 });
    view.focus({ preventScroll: true });
    closePalette();
    return;
  }
  location.hash = '/';
}

function setCrumbs(list) {
  const parts = [h('a', { href: '#/' }, 'Registry')];
  for (const c of list) { parts.push(h('i', '/')); parts.push(c.href ? h('a', { href: c.href }, c.label) : h('span', c.label)); }
  mount($('#crumbs'), parts);
}

/* ── finder palette ───────────────────────────────────────────── */
const GROUP = { clause: 'Clauses', text: 'Contract text', pcc: 'PCC changes', plain: 'Plain words', word: 'Words', case: 'Case files', template: 'Letter types', letter: 'TKV letters' };
const ORDER = ['clause', 'pcc', 'text', 'plain', 'word', 'template', 'case', 'letter'];

export function openPalette(initial = '') {
  const pal = $('#palette');
  const input = h('input', { type: 'search', placeholder: 'Try 35.1, time bar, LD, suspension, Adit-3…', 'aria-label': 'Search', value: initial, autocomplete: 'off', spellcheck: 'false' });
  const list = h('div.palette__list', { role: 'listbox' });
  let items = [];
  let sel = 0;

  const tips = () => h('div', h('div.palette__group', 'Try'), h('div.palette__tips', ['35.1', 'time bar', 'force majeure', 'liquidated damages', 'suspension', 'determination', 'variation', 'Adit-3', 'advance payment', 'change in law'].map((t) => h('button.chip.chip--plain', { type: 'button', onclick: () => { input.value = t; run(); input.focus(); } }, t))));

  const run = debounce(() => {
    const q = input.value;
    if (!q.trim()) { mount(list, tips()); items = []; return; }
    const res = S.query(q, { limit: 60 });
    if (!res.length) { mount(list, h('div.palette__empty', 'Nothing found. Try a clause number or a simpler word.')); items = []; return; }
    const byType = {};
    for (const r of res) (byType[r.type] ??= []).push(r);
    const nodes = [];
    items = [];
    for (const t of ORDER) {
      const g = (byType[t] || []).slice(0, t === 'letter' ? 5 : t === 'text' ? 6 : 5);
      if (!g.length) continue;
      nodes.push(h('div.palette__group', GROUP[t]));
      for (const r of g) {
        const a = h('a.palette__item', { href: r.href, role: 'option', 'aria-selected': 'false', onmousemove: () => select(items.indexOf(a)) },
          h('span.palette__no', t === 'letter' ? '✉' : t === 'template' ? '✎' : t === 'case' ? r.no : r.no || '·'),
          h('span', h('span.palette__t', r.title), h('span.palette__s', marked(S.snippet(r.snippet, r.terms), r.terms))));
        items.push(a); nodes.push(a);
      }
    }
    mount(list, nodes);
    select(0);
  }, 70);

  const select = (i) => {
    if (!items.length) return;
    sel = (i + items.length) % items.length;
    items.forEach((el, j) => el.setAttribute('aria-selected', j === sel ? 'true' : 'false'));
    items[sel].scrollIntoView({ block: 'nearest' });
  };

  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
    else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); location.hash = items[sel].getAttribute('href').slice(1); closePalette(); }
    else if (e.key === 'Escape') closePalette();
  });

  mount(pal, h('div.palette__box', { role: 'dialog', 'aria-label': 'Find' },
    h('div.palette__in', h('span', { html: icons.search }), input, h('kbd', 'Esc')),
    list,
    h('div.palette__foot', h('span', '↑↓ move'), h('span', '↵ open'), h('span', 'Searches everything locally'))));
  pal.hidden = false;
  pal.onclick = (e) => { if (e.target === pal) closePalette(); };
  run();
  requestAnimationFrame(() => input.focus());
}

function openMenu() {
  const pal = $('#palette');
  mount(pal, h('div.palette__box', { role: 'dialog', 'aria-label': 'Menu' },
    h('div.palette__group', 'Go to'),
    h('div.palette__list', TABS.map((t) => h('a.palette__item', { href: t.href, onclick: closePalette }, h('span.palette__no', icon(t.icon)), h('span.palette__t', t.label))),
      h('button.palette__item.palette__item--btn', { type: 'button', onclick: () => openSync(sync) }, h('span.palette__no', icon('cloud')), h('span.palette__t', 'Sync across devices')))));
  pal.hidden = false;
  pal.onclick = (e) => { if (e.target === pal) closePalette(); };
}

export function closePalette() { const p = $('#palette'); if (!p.hidden) { p.hidden = true; mount(p); } }
