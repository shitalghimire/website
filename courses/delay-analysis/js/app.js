/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — gate, router, boot

   One HTML file, many views. Views are replaced with
   replaceChildren rather than innerHTML, so listeners are never
   orphaned and no markup is ever parsed out of course data.
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, $, $$, frag, pct, say, prefersStill } from './dom.js';
import * as store from './store.js';
import * as vault from './vault.js';
import { setGlossary } from './markup.js';

import { dashboard } from './views/dashboard.js';
import { module as moduleView } from './views/module.js';
import { lesson } from './views/lesson.js';
import { quiz } from './views/quizview.js';
import { glossary, toolkit, settings, certificate } from './views/misc.js';
import { caseStudy } from './views/casestudy.js';

/** Shared course context, populated once the vault opens. */
export const ctx = {};

const ROUTES = [
  [/^#\/$/,                       () => dashboard()],
  [/^#\/m\/(\d+)$/,               m => moduleView(+m)],
  [/^#\/m\/(\d+)\/l\/(\d+)$/,     (m, l) => lesson(+m, +l)],
  [/^#\/quiz\/(\d+)$/,            m => quiz(+m)],
  [/^#\/case$/,                   () => caseStudy('brief')],
  [/^#\/case\/([a-z]+)$/,         k => caseStudy(k)],
  [/^#\/toolkit$/,                () => toolkit()],
  [/^#\/glossary$/,               () => glossary()],
  [/^#\/settings$/,               () => settings()],
  [/^#\/certificate$/,            () => certificate()]
];

let teardown = null;

/* ═══════════════════════════════════════════════════════════════
   THE GATE
   ═══════════════════════════════════════════════════════════════ */

function buildGate() {
  const gate = $('#gate');
  const input = $('#gateCode');
  const form = $('#gateForm');
  const msg = $('#gateMsg');
  const submit = $('#gateGo');
  const remember = $('#gateRemember');

  // a faint programme drawn behind the card, so the gate is not a blank wall
  const bg = $('#gateBg');
  if (bg && !prefersStill()) bg.append(ghostProgramme());

  async function attempt(code, silent) {
    if (!code) return;
    msg.className = 'gate__msg gate__msg--busy';
    msg.textContent = 'Deriving key…';
    submit.disabled = true;
    input.disabled = true;
    gate.classList.remove('gate--bad');

    try {
      const content = await vault.open(code);
      vault.remember(code, remember?.checked);
      msg.textContent = 'Unsealed.';
      await start(content, gate);
    } catch (err) {
      submit.disabled = false;
      input.disabled = false;
      msg.className = 'gate__msg';
      if (err.kind === 'bad-code') {
        gate.classList.add('gate--bad');
        msg.textContent = silent ? 'Saved code no longer opens this course.' : 'That code does not open this course.';
        input.value = '';
        input.focus();
      } else {
        msg.textContent = err.message;
      }
      if (silent) vault.forget();
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    attempt(input.value.trim(), false);
  });
  input.addEventListener('input', () => {
    gate.classList.remove('gate--bad');
    if (msg.textContent) msg.textContent = '';
  });

  // an already-unlocked device goes straight through
  const saved = vault.recall();
  if (saved) attempt(saved, true);
  else setTimeout(() => input.focus(), 420);
}

/** A decorative bar chart behind the gate. Pure texture — no data. */
function ghostProgramme() {
  const W = 1400, H = 800;
  const g = svg('g', { opacity: .9 });
  const rand = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
  for (let i = 0; i < 34; i++) {
    const y = 40 + i * 22;
    const x = 120 + rand() * 420;
    const w = 90 + rand() * 460;
    const crit = rand() > 0.72;
    g.append(svg('rect', {
      x, y, width: w, height: 9, rx: 2,
      fill: crit ? 'var(--critical)' : 'var(--g-600)',
      opacity: crit ? .55 : .8
    }));
    g.append(svg('rect', { x: 40, y: y + 1, width: 62, height: 6, rx: 2, fill: 'var(--g-700)' }));
  }
  for (let i = 0; i < 14; i++) {
    g.append(svg('line', {
      x1: 120 + i * 92, y1: 24, x2: 120 + i * 92, y2: H - 40,
      stroke: 'var(--g-700)', 'stroke-width': 1
    }));
  }
  return svg('svg', {
    viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid slice',
    style: { width: '100%', height: '100%' }
  }, g);
}

/* ═══════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════ */

async function start(content, gate) {
  ctx.content = content;
  ctx.course = content.course;
  ctx.glossary = content.glossary || {};
  ctx.bank = new Map((content.questions || []).map(q => [q.id, q]));
  setGlossary(ctx.glossary);

  store.applySettings();
  buildHeader();

  document.body.classList.add('is-open');
  gate.hidden = true;

  addEventListener('hashchange', route);
  await route();

  const p = store.courseProgress(ctx.course.modules);
  if (p.done) say(`Welcome back. ${p.done} of ${p.total} lessons complete.`);
}

function buildHeader() {
  const nav = $('#nav');
  const burger = $('#burger');
  burger?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  nav?.addEventListener('click', e => {
    if (e.target.closest('a')) {
      nav.classList.remove('is-open');
      burger?.setAttribute('aria-expanded', 'false');
    }
  });
  store.subscribe(paintProgress);
  paintProgress();
}

function paintProgress() {
  const p = store.courseProgress(ctx.course.modules);
  const meter = $('#meter');
  const val = $('#progVal');
  if (meter) meter.style.width = (p.pct * 100) + '%';
  if (val) val.textContent = `${p.done}/${p.total}`;
}

/* ═══════════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════════ */

async function route() {
  const hash = location.hash || '#/';
  const view = $('#view');

  for (const [re, fn] of ROUTES) {
    const m = hash.match(re);
    if (!m) continue;

    if (typeof teardown === 'function') { try { teardown(); } catch { /* ignore */ } }
    teardown = null;

    try {
      const out = await fn(...m.slice(1));
      const node = Array.isArray(out) ? frag(out) : (out?.node ?? out);
      teardown = out?.teardown ?? null;
      view.replaceChildren(node ?? frag([]));
    } catch (err) {
      console.error(err);
      view.replaceChildren(errorView(err));
    }

    markNav(hash);
    paintProgress();
    view.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    return;
  }
  location.hash = '#/';
}

function markNav(hash) {
  $$('#nav a').forEach(a => {
    const href = a.getAttribute('href');
    const on = href === hash || (href !== '#/' && hash.startsWith(href));
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function errorView(err) {
  return el('div.msg', [
    el('h2', 'Something went wrong drawing that'),
    el('p', String(err?.message || err)),
    el('a.btn', { href: '#/' }, 'Back to the programme')
  ]);
}

/* ── go ─────────────────────────────────────────────────────── */

store.applySettings();
buildGate();
