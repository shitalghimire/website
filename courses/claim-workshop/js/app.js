/* ═══════════════════════════════════════════════════════════════
   THE CLAIM WORKSHOP — shell and router.
   ═══════════════════════════════════════════════════════════════ */

import { h, $, $$, mount, swap, reveal, store, still } from './lib.js';
import { icon } from './icons.js';
import { CHAPTERS } from './content.js';

import start from './views/start.js';
import cees from './views/cees.js';
import types from './views/types.js';
import before from './views/before.js';
import binder from './views/binder.js';
import style from './views/style.js';
import proof from './views/proof.js';
import response from './views/response.js';
import worked from './views/worked.js';
import drill from './views/drill.js';

const VIEWS = { start, cees, types, before, binder, style, proof, response, worked, drill };

/* ── theme ─────────────────────────────────────────────────────── */
function paintTheme(mode) {
  const dark = mode ? mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const btn = $('#themeBtn');
  mount(btn, icon(dark ? 'sun' : 'moon'));
  btn.title = dark ? 'Switch to day' : 'Switch to night';
  btn.setAttribute('aria-label', btn.title);
  $('meta[name="theme-color"]').content = dark ? '#0C131B' : '#EDF0F5';
}

/* ── navigation furniture ──────────────────────────────────────── */
function buildNav() {
  mount($('#tabs'), CHAPTERS.map((c) => h('a.tab', { href: `#/${c.id}`, dataset: { ch: c.id }, title: c.label },
    icon(c.icon), h('span.tab__l', `${c.no} ${c.label}`))));

  mount($('#chapbar'), CHAPTERS.map((c) => h('a', { href: `#/${c.id}`, dataset: { ch: c.id } },
    icon(c.icon), `${c.no} ${c.label}`)));

  $('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.update((s) => { s.theme = next; });
    swap(() => paintTheme(next), 'theme');
  });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Clear your progress and answers on this device?')) return;
    store.reset();
    paintProgress();
    route();
  });
}

/* the ring in the bar, and the ticks on the tabs */
function paintProgress() {
  const done = CHAPTERS.filter((c) => store.isDone(c.id)).length;
  const pct = Math.round((done / CHAPTERS.length) * 100);
  const ring = $('#ring');
  ring.style.setProperty('--pct', pct);
  mount($('#ringN'), String(done));
  ring.title = `${done} of ${CHAPTERS.length} chapters done`;
  $$('[data-ch]').forEach((a) => a.classList.toggle('done', store.isDone(a.dataset.ch)));
}

/* ── router ────────────────────────────────────────────────────── */
let current = null;

function route() {
  const id = (location.hash.replace(/^#\/?/, '').split('?')[0] || 'start');
  const chapter = CHAPTERS.find((c) => c.id === id);
  if (!chapter) { location.hash = '/start'; return; }

  $$('[data-ch]').forEach((a) => {
    if (a.dataset.ch === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  const page = $('#page');
  swap(() => {
    mount(page);
    try {
      VIEWS[id](page, { chapter, go: (to) => { location.hash = to; } });
      page.append(pager(chapter), doneBox(chapter));
    } catch (err) {
      console.error(err);
      mount(page, h('div.card.card--pad',
        h('h2.head__t', 'This page did not draw'),
        h('p.prose', 'Something went wrong. Reload, or go back to the start.'),
        h('a.btn.btn--go', { href: '#/start' }, 'Back to the start')));
    }
    reveal(page);
  });

  if (current !== id) scrollTo({ top: 0, behavior: still() ? 'auto' : 'smooth' });
  current = id;
  page.focus({ preventScroll: true });
  paintProgress();
}

function pager(chapter) {
  const i = CHAPTERS.indexOf(chapter);
  const prev = CHAPTERS[i - 1];
  const next = CHAPTERS[i + 1];
  return h('nav.pager', { 'aria-label': 'Chapters' },
    prev ? h('a', { href: `#/${prev.id}` }, h('small', '← Previous'), h('b', prev.title)) : h('span'),
    next ? h('a', { href: `#/${next.id}` }, h('small', 'Next →'), h('b', next.title)) : h('span'));
}

function doneBox(chapter) {
  const btn = h('button.donebtn', { type: 'button' });
  const paint = () => {
    const on = store.isDone(chapter.id);
    mount(btn, icon(on ? 'check' : 'plus'), on ? 'Done' : 'Mark this chapter done');
    btn.classList.toggle('on', on);
  };
  btn.addEventListener('click', () => { store.toggleDone(chapter.id); paint(); paintProgress(); });
  paint();
  return h('div.donebox',
    h('p', 'Progress is kept on this device only. Nothing is uploaded, and there is no account.'),
    btn);
}

/* ── start ─────────────────────────────────────────────────────── */
buildNav();
paintTheme(store.get().theme);
paintProgress();

addEventListener('hashchange', route);
addEventListener('scroll', () => {
  $('#bar').classList.toggle('stuck', scrollY > 4);
  const max = document.documentElement.scrollHeight - innerHeight;
  $('#scrollbar').style.setProperty('--sp', `${max > 0 ? (scrollY / max) * 100 : 0}%`);
}, { passive: true });

/* ← and → move between chapters when you are not typing */
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (typing) return;
  const i = CHAPTERS.findIndex((c) => c.id === current);
  if (e.key === 'ArrowRight' && CHAPTERS[i + 1]) location.hash = `/${CHAPTERS[i + 1].id}`;
  if (e.key === 'ArrowLeft' && CHAPTERS[i - 1]) location.hash = `/${CHAPTERS[i - 1].id}`;
});

route();
