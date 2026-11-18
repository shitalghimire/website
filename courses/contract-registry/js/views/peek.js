/* ═══════════════════════════════════════════════════════════════
   peek — "what falls under this?" wherever a schedule code is named.

   linkCodes(root, model) finds the codes of the Schedule of Payment
   (A.1, B.12.2, D.4 …, and "Activity D") in the text under `root`, turns
   each into a small button, and opens a pop-up with what the contract
   puts under it: the activity's own words, its lines, their weights,
   when they pay and where they stand.

   openCode(anchor, code, model) opens the same pop-up from code.

   It holds no figures of its own: names, words, weights and money all
   come from `model`, which the sealed page hands in. The styles are
   injected from here, so they always match the script that draws them.
   ═══════════════════════════════════════════════════════════════ */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';

/* model = {
     acts: [{ id, name, desc, plain, amt: [usd, nrs], pg, subs: [{ id, title, desc, stage, plain, rule, w: [usd%, nrs%], st, pg, amt, cert, claim, before }] }],
     rate, bid,                       // NRs per USD; bid price in NRs (for "share of the bid")
     ipc: { n, date } | null, verdicts: { [id]: { status, plain } },
     color(id) → css colour, bookHref(id) → '#/…', verdictHref(id) → '#/…' | null, page(pg) → opens the scan (optional)
   } */

const fmt = (n, dp = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const pc = (n, dp = 2) => `${fmt(n, dp)}%`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const STEPW = { delivery: 'as each item is delivered to Site', done: 'once, 100% on completion', equal: 'in equal instalments', prorata: 'pro rata, as items finish' };
export const stageWords = (st) => (Array.isArray(st) ? (st.length >= 20 ? 'every 5%' : st.length === 10 ? 'every 10%' : st.length === 5 && st[0] === 20 ? 'every 20%' : `at ${st.join('%, ')}%`) : STEPW[st] || String(st || ''));

/* ── the index of codes ── */
const cache = new WeakMap();
function index(model) {
  if (cache.has(model)) return cache.get(model);
  const m = new Map();
  for (const a of model.acts) { m.set(a.id, { kind: 'act', a }); for (const x of a.subs) m.set(x.id, { kind: 'line', a, x }); }
  const As = model.acts.filter((a) => a.id.startsWith('A.'));
  if (As.length) m.set('A', { kind: 'group', acts: As });
  cache.set(model, m);
  return m;
}
const usdEq = (amt, rate) => (amt?.[0] || 0) * rate + (amt?.[1] || 0);

/* ── turning codes in the text into buttons ── */
const SKIP = 'a,button,input,textarea,select,label,svg,code,pre,script,style,summary,.ak,.pk,.w3,[data-nolink]';
const RE = /\b(?:([Aa]ctivit(?:y|ies))\s+([A-J](?:\.[1-3])?)\b|([A-J](?:\.\d{1,2}){1,2})(?![\d])\b)/g;
const button = (code, text, model) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'ak'; b.dataset.ak = code; b.textContent = text;
  b.setAttribute('aria-haspopup', 'dialog'); b.title = `What falls under ${code}?`;
  const c = model.color?.(code); if (c) b.style.setProperty('--ak', c);
  return b;
};
function wrap(node, idx, model) {
  const t = node.nodeValue;
  /* a table cell that holds nothing but an activity letter ("B", "D") */
  const lone = t.trim();
  if (/^[A-J]$/.test(lone) && idx.has(lone === 'A' ? 'A' : lone) && node.parentElement?.closest('td,th') && node.parentElement.closest('td,th').textContent.trim() === lone) {
    const i = t.indexOf(lone); const frag = document.createDocumentFragment();
    if (i) frag.append(t.slice(0, i)); frag.append(button(lone, lone, model)); if (i + 1 < t.length) frag.append(t.slice(i + 1));
    node.replaceWith(frag); return;
  }
  RE.lastIndex = 0; let m, last = 0, frag = null;
  while ((m = RE.exec(t))) {
    const code = m[2] || m[3]; if (!idx.has(code)) continue;
    frag ??= document.createDocumentFragment();
    if (m.index > last) frag.append(t.slice(last, m.index));
    frag.append(button(code, m[0], model)); last = m.index + m[0].length;
  }
  if (!frag) return;
  if (last < t.length) frag.append(t.slice(last));
  node.replaceWith(frag);
}
function sweep(root, idx, model) {
  const found = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const v = n.nodeValue; if (!v || !/[A-J]/.test(v) || (v.length < 2 && !/^[A-J]$/.test(v))) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement; return !p || p.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) found.push(n);
  for (const n of found) wrap(n, idx, model);
  /* chart labels: an SVG <text> that is exactly a code opens it too */
  for (const t of root.querySelectorAll('svg text:not([data-ak])')) {
    const v = t.textContent.trim(); if (!idx.has(v) || t.closest('a,button,[data-nolink]')) continue;
    t.dataset.ak = v; t.classList.add('ak-svg'); t.setAttribute('role', 'button'); t.setAttribute('tabindex', '0'); t.setAttribute('aria-label', `What falls under ${v}?`);
  }
}
export function linkCodes(root, model) {
  style();
  const idx = index(model);
  const CFG = { childList: true, subtree: true, characterData: true };
  let queued = false;
  const mo = new MutationObserver(() => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; if (!root.isConnected) { mo.disconnect(); return; } mo.disconnect(); sweep(root, idx, model); mo.observe(root, CFG); });
  });
  sweep(root, idx, model); mo.observe(root, CFG);
  const onClick = (e) => { const b = e.target.closest?.('.ak, .ak-svg'); if (!b || !root.contains(b)) return; e.preventDefault(); e.stopPropagation(); openCode(b, b.dataset.ak, model); };
  const onKey = (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const b = e.target.closest?.('.ak-svg'); if (!b || !root.contains(b)) return; e.preventDefault(); openCode(b, b.dataset.ak, model); };
  root.addEventListener('keydown', onKey);
  root.addEventListener('click', onClick);
  return () => { mo.disconnect(); root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); };
}

/* ── the pop-up ── */
let card = null, anchor = null, unbind = null;
export function closePeek({ refocus = true } = {}) {
  if (!card) return;
  card.remove(); card = null; unbind?.(); unbind = null;
  if (refocus && anchor?.isConnected) anchor.focus({ preventScroll: true });
  anchor = null;
}
export function openCode(at, code, model, trail = []) {
  style();
  const hit = index(model).get(code); if (!hit) return;
  const keep = card && anchor === at;
  if (!keep) closePeek({ refocus: false });
  anchor = at;
  const go = (c) => openCode(at, c, model, [...trail, code]);
  const back = trail.length ? () => openCode(at, trail.at(-1), model, trail.slice(0, -1)) : null;
  const node = hit.kind === 'line' ? lineCard(hit, model, back) : hit.kind === 'act' ? actCard(hit.a, model, go, back) : groupCard(hit.acts, model, go);
  if (card) { card.replaceWith(node); card = node; }
  else {
    card = node; document.body.append(card);
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); closePeek(); } };
    const onDown = (e) => { if (card && !card.contains(e.target) && !(anchor && anchor.contains(e.target))) closePeek({ refocus: false }); };
    const onMove = () => place(true);
    document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown, true);
    addEventListener('resize', onMove); addEventListener('scroll', onMove, true);
    unbind = () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true); removeEventListener('resize', onMove); removeEventListener('scroll', onMove, true); };
  }
  place();
  card?.querySelector('.pk__t')?.focus({ preventScroll: true });
}
function place(moved = false) {
  if (!card) return;
  const vw = innerWidth, vh = innerHeight; const sheet = vw < 640;
  card.classList.toggle('pk--sheet', sheet);
  if (sheet) { card.style.left = card.style.top = card.style.width = ''; return; }
  const r = anchor?.isConnected ? anchor.getBoundingClientRect() : { left: vw / 2, right: vw / 2, top: vh / 3, bottom: vh / 3, width: 0 };
  if (moved && anchor?.isConnected && (r.bottom < 0 || r.top > vh)) { closePeek({ refocus: false }); return; }
  const w = Math.min(470, vw - 24); card.style.width = `${w}px`;
  const hh = card.offsetHeight;
  let top = r.bottom + 10; if (top + hh > vh - 12 && r.top - hh - 10 > 12) top = r.top - hh - 10;
  card.style.top = `${clamp(top, 12, Math.max(12, vh - hh - 12))}px`;
  card.style.left = `${clamp(r.left + r.width / 2 - w / 2, 12, vw - w - 12)}px`;
}

/* ── what the pop-up says ── */
function shell(code, color, kick, title, body, foot, back) {
  const id = `pk-${Math.random().toString(36).slice(2, 8)}`;
  return h('div.pk', { role: 'dialog', 'aria-labelledby': id, style: { '--c': color || 'var(--brass)' } },
    h('div.pk__bar',
      back ? h('button.pk__back', { type: 'button', 'aria-label': 'Back', onclick: back }, icon('back')) : h('span.pk__seal', code.length > 4 ? code.split('.').slice(0, 2).join('.') : code),
      h('div.pk__head', h('p.pk__kick', kick), h('h3.pk__t', { id, tabindex: -1 }, title)),
      h('button.pk__x', { type: 'button', 'aria-label': 'Close', onclick: () => closePeek() }, icon('x'))),
    h('div.pk__body', body),
    foot && foot.length ? h('div.pk__foot', foot) : null);
}
function words(label, text, clampLines = 0) {
  if (!text) return null;
  const q = h(`blockquote.pk__q${clampLines ? '.is-clamp' : ''}`, { style: clampLines ? { '--lines': clampLines } : null }, `“${text}”`);
  const more = clampLines && text.length > clampLines * 70 ? h('button.pk__more', { type: 'button', onclick: (e) => { q.classList.remove('is-clamp'); e.currentTarget.remove(); } }, 'Read all') : null;
  return h('div.pk__w', h('p.pk__lbl', label), q, more);
}
function ladder(x) {
  if (!Array.isArray(x.st)) return h('div.pk__lad.is-word', h('i', { style: { width: `${clamp(x.cert, 0, 100)}%` } }), x.claim > x.cert ? h('i.is-claim', { style: { left: `${x.cert}%`, width: `${clamp(x.claim - x.cert, 0, 100)}%` } }) : null);
  return h('div.pk__lad', { 'aria-hidden': 'true' },
    x.st.map((v, k) => { const lo = k ? x.st[k - 1] : 0; const s = x.cert >= v ? 'is-paid' : x.claim >= v ? 'is-claim' : ''; return h(`span${s ? '.' + s : ''}`, { style: { flexGrow: v - lo } }); }));
}
function lineCard({ a, x }, model, back) {
  const c = model.color?.(x.id);
  const two = x.w[1] && x.w[1] !== x.w[0];
  const v = model.verdicts?.[x.id];
  const ipc = model.ipc ? `IPC-${model.ipc.n}` : 'the last certificate';
  const state = x.cert || x.claim || x.before ? h('div.pk__w',
    h('p.pk__lbl', 'Where it stands'),
    ladder(x),
    h('div.pk__state',
      h('span.pk__chip.is-cert', `${pc(x.cert, x.cert % 1 ? 1 : 0)} certified (${ipc})`),
      x.claim !== x.cert ? h('span.pk__chip.is-claim', `${pc(x.claim, x.claim % 1 ? 1 : 0)} claimed (${model.claimName || 'last claim'})`) : null,
      x.before !== x.cert ? h('span.pk__chip', `${pc(x.before, x.before % 1 ? 1 : 0)} before (${model.ipc ? `IPC-${model.ipc.n - 1}` : 'the certificate before'})`) : null)) : h('p.pk__note', `Nothing certified yet (${ipc}).`);
  return shell(x.id, c, `Line ${x.id} · Activity ${a.id}, ${a.name}`, x.title, [
    words('Description of activity · the contract’s words', x.desc),
    words('Stage for payment · the contract’s words', x.stage, x.desc ? 4 : 6),
    x.plain ? h('p.pk__plain', x.plain) : null,
    h('dl.pk__figs',
      h('div', h('dt', 'Weight in the activity'), h('dd', pc(x.w[0]), h('small', two ? `USD part · ${pc(x.w[1])} of the NRs part` : x.w[1] ? 'of each currency' : 'of the USD part'))),
      h('div', h('dt', 'Worth'), h('dd', `USD ${fmt(x.amt?.[0])}`, x.amt?.[1] ? h('small', `+ NRs ${fmt(x.amt[1])}`) : null)),
      h('div', h('dt', 'It pays'), h('dd', stageWords(x.st), h('small', x.pg ? (model.pageLabel ? model.pageLabel(x.pg) : `page ${x.pg}`) : '')))),
    state,
    v ? h(`div.pk__v.is-${v.status}`, h('b', `${model.claimName || 'The claim'}: ${v.status === 'paid' ? 'paid in full' : v.status === 'part' ? 'part paid' : 'not paid'}`), h('span', v.plain)) : null,
    words('Payment procedure · the contract’s words', x.rule),
  ], [
    h('a.pk__go.is-main', { href: model.bookHref(x.id), onclick: () => closePeek({ refocus: false }) }, icon('ledger'), 'Open in the Price Book'),
    v && model.verdictHref ? h('a.pk__go', { href: model.verdictHref(x.id), onclick: () => closePeek({ refocus: false }) }, icon('scale'), 'The verdict') : null,
    model.page && x.pg ? h('button.pk__go', { type: 'button', onclick: () => { closePeek({ refocus: false }); model.page(x.pg); } }, icon('scan'), `Page ${model.printed ? model.printed(x.pg) : x.pg}`) : null,
  ], back);
}
function actCard(a, model, go, back) {
  const c = model.color?.(a.id);
  const total = usdEq(a.amt, model.rate);
  const certEq = a.subs.reduce((t, x) => t + usdEq(x.amt, model.rate) * (x.cert || 0) / 100, 0);
  const subEq = a.subs.reduce((t, x) => t + usdEq(x.amt, model.rate), 0) || 1;
  const share = model.bid ? (total / model.bid) * 100 : null;
  return shell(a.id, c, `Activity ${a.id}${share != null ? ` · ${pc(share, 1)} of the bid price` : ''}`, a.name, [
    words('Description of activity · the contract’s words', a.desc),
    a.plain ? h('p.pk__plain', a.plain) : null,
    h('dl.pk__figs',
      h('div', h('dt', 'Contract money'), h('dd', `USD ${fmt(a.amt?.[0])}`, a.amt?.[1] ? h('small', `+ NRs ${fmt(a.amt[1])}`) : h('small', 'USD only'))),
      h('div', h('dt', `Certified (${model.ipc ? `IPC-${model.ipc.n}` : 'to date'})`), h('dd', pc((certEq / subEq) * 100, 1), h('small', 'of this activity’s money')))),
    h('div.pk__w', h('p.pk__lbl', `What falls under ${a.id} · ${a.subs.length} lines`),
      h('ul.pk__lines', a.subs.map((x) => h('li', h('button.pk__line', { type: 'button', onclick: () => go(x.id) },
        h('b', x.id), h('span', x.title), h('em', pc(x.w[0])),
        h('i', h('i', { style: { width: `${clamp(x.cert || 0, 0, 100)}%` } }))))))),
  ], [
    h('a.pk__go.is-main', { href: model.bookHref(a.id), onclick: () => closePeek({ refocus: false }) }, icon('ledger'), 'Open in the Price Book'),
    model.page && a.pg ? h('button.pk__go', { type: 'button', onclick: () => { closePeek({ refocus: false }); model.page(a.pg); } }, icon('scan'), `Page ${model.printed ? model.printed(a.pg) : a.pg}`) : null,
  ], back);
}
function groupCard(acts, model, go) {
  return shell('A', model.color?.('A.1'), `Activity A · in ${acts.length} parts`, model.groupName || 'Activity A', [
    h('p.pk__plain', `Activity A is split into ${acts.length} parts, each with its own lines and weights.`),
    h('ul.pk__lines', acts.map((a) => h('li', h('button.pk__line', { type: 'button', onclick: () => go(a.id), style: { '--c': model.color?.(a.id) } }, h('b', a.id), h('span', a.name), h('em', `${a.subs.length} lines`))))),
  ], [h('a.pk__go.is-main', { href: model.bookHref('A.1'), onclick: () => closePeek({ refocus: false }) }, icon('ledger'), 'Open in the Price Book')]);
}

/* ── styles (shipped with the script) ── */
let styled = false;
function style() {
  if (styled || document.getElementById('peek-css')) { styled = true; return; }
  styled = true;
  const s = document.createElement('style'); s.id = 'peek-css';
  s.textContent = `
.ak { all: unset; display: inline; cursor: pointer; font: inherit; color: inherit; font-weight: 650; border-bottom: 1.5px dotted var(--ak, var(--brass)); padding: 0 .1em; margin: 0 -.1em; border-radius: 3px; transition: background-color .15s ease; }
.ak:hover { background: color-mix(in srgb, var(--ak, var(--brass)) 16%, transparent); }
.ak:focus-visible { background: color-mix(in srgb, var(--ak, var(--brass)) 16%, transparent); box-shadow: 0 0 0 2px var(--ak, var(--brass)); }
.ak-svg { cursor: pointer; text-decoration: underline dotted; text-underline-offset: 2px; }
.ak-svg:hover, .ak-svg:focus-visible { outline: none; font-weight: 700; }
.pk { position: fixed; z-index: 400; width: 470px; max-height: min(74vh, 680px); display: flex; flex-direction: column; background: var(--sheet); color: var(--ink); border: 1px solid var(--line); border-top: 4px solid var(--c); border-radius: 14px; box-shadow: 0 22px 60px rgba(18, 24, 14, .3), 0 2px 8px rgba(0, 0, 0, .12); overflow: hidden; font-family: var(--sans); animation: pk-in .18s cubic-bezier(.2, .8, .2, 1); }
@keyframes pk-in { from { opacity: 0; transform: translateY(6px) scale(.985); } }
.pk--sheet { left: 0; right: 0; bottom: 0; top: auto; width: auto; max-height: 84vh; border-radius: 18px 18px 0 0; border-left: 0; border-right: 0; border-bottom: 0; animation-name: pk-up; }
@keyframes pk-up { from { opacity: 0; transform: translateY(40px); } }
@media (prefers-reduced-motion: reduce) { .pk { animation: none; } }
.pk__bar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: .7rem; align-items: center; padding: .75rem .8rem .7rem .9rem; background: color-mix(in srgb, var(--c) 9%, var(--sheet)); border-bottom: 1px solid var(--line); }
.pk__seal { min-width: 2.5rem; height: 2.5rem; padding: 0 .35rem; box-sizing: border-box; border-radius: 999px; display: grid; place-items: center; background: var(--c); color: #fff; font: 700 .82rem/1 var(--mono); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .3); }
.pk__head { min-width: 0; }
.pk__kick { margin: 0; font: 600 .62rem/1.3 var(--mono); letter-spacing: .05em; text-transform: uppercase; color: var(--ink-3); }
.pk__t { margin: .15rem 0 0; font: 700 1.06rem/1.25 var(--display); color: var(--ink); outline: none; overflow-wrap: anywhere; }
.pk__x, .pk__back { all: unset; cursor: pointer; width: 2.1rem; height: 2.1rem; border-radius: 9px; display: grid; place-items: center; color: var(--ink-2); }
.pk__x:hover, .pk__back:hover, .pk__x:focus-visible, .pk__back:focus-visible { background: color-mix(in srgb, var(--ink) 9%, transparent); }
.pk__x svg, .pk__back svg { width: 18px; height: 18px; }
.pk__body { overflow: auto; overscroll-behavior: contain; padding: .85rem .95rem 1rem; display: grid; gap: .8rem; }
.pk__lbl { margin: 0 0 .3rem; font: 600 .62rem/1.3 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); }
.pk__q { margin: 0; padding: .05rem 0 .05rem .75rem; border-left: 3px solid var(--c); font: 400 .92rem/1.55 var(--serif); color: var(--ink); overflow-wrap: anywhere; }
.pk__q.is-clamp { display: -webkit-box; -webkit-line-clamp: var(--lines, 5); -webkit-box-orient: vertical; overflow: hidden; }
.pk__more { all: unset; cursor: pointer; margin-top: .3rem; font-size: .78rem; font-weight: 600; color: var(--link, var(--brass)); }
.pk__more:hover { text-decoration: underline; }
.pk__plain { margin: 0; font-size: .9rem; line-height: 1.55; color: var(--ink-2); }
.pk__note { margin: 0; font-size: .82rem; color: var(--ink-3); }
.pk__figs { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: .45rem; margin: 0; }
.pk__figs > div { padding: .5rem .6rem; border-radius: 10px; background: color-mix(in srgb, var(--c) 7%, var(--sheet-2)); min-width: 0; }
.pk__figs dt { font: 600 .6rem/1.3 var(--mono); letter-spacing: .04em; text-transform: uppercase; color: var(--ink-3); }
.pk__figs dd { margin: .2rem 0 0; font-size: .9rem; font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.pk__figs dd small { display: block; margin-top: .1rem; font-size: .72rem; font-weight: 500; color: var(--ink-3); }
.pk__lines { list-style: none; margin: 0; padding: 0; display: grid; gap: .15rem; }
.pk__line { all: unset; box-sizing: border-box; cursor: pointer; width: 100%; display: grid; grid-template-columns: 3.6rem minmax(0, 1fr) auto; gap: .3rem .6rem; align-items: center; padding: .45rem .55rem; border-radius: 9px; }
.pk__line:hover, .pk__line:focus-visible { background: color-mix(in srgb, var(--c) 11%, transparent); }
.pk__line > b { font: 700 .76rem/1.2 var(--mono); color: var(--c); }
.pk__line > span { font-size: .86rem; line-height: 1.3; min-width: 0; }
.pk__line > em { font: 600 .76rem/1 var(--mono); font-style: normal; color: var(--ink-2); }
.pk__line > i { grid-column: 2 / 4; display: block; height: 4px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--ink) 9%, transparent); }
.pk__line > i > i { display: block; height: 100%; background: var(--c); }
.pk__lad { display: flex; gap: 2px; height: 12px; margin: .1rem 0 .45rem; }
.pk__lad > span { border-radius: 2px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
.pk__lad > span.is-paid { background: var(--c); }
.pk__lad > span.is-claim { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--c) 55%, transparent) 0 3px, transparent 3px 6px); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 60%, transparent); }
.pk__lad.is-word { position: relative; display: block; border-radius: 4px; background: color-mix(in srgb, var(--ink) 10%, transparent); overflow: hidden; }
.pk__lad.is-word > i { position: absolute; top: 0; bottom: 0; left: 0; background: var(--c); }
.pk__lad.is-word > i.is-claim { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--c) 55%, transparent) 0 3px, transparent 3px 6px); }
.pk__state { display: flex; flex-wrap: wrap; gap: .35rem; }
.pk__chip { padding: .3rem .5rem; border-radius: 999px; font: 600 .72rem/1 var(--mono); background: color-mix(in srgb, var(--ink) 8%, transparent); color: var(--ink-2); }
.pk__chip.is-cert { background: var(--c); color: #fff; }
.pk__chip.is-claim { background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--ink); }
.pk__v { display: grid; gap: .2rem; padding: .55rem .7rem; border-radius: 10px; font-size: .84rem; line-height: 1.45; background: var(--ok-soft, rgba(60, 140, 80, .12)); }
.pk__v.is-part { background: var(--warn-soft, rgba(200, 140, 40, .14)); }
.pk__v.is-nil { background: var(--stamp-soft, rgba(190, 60, 40, .12)); }
.pk__v b { font-size: .78rem; }
.pk__foot { display: flex; flex-wrap: wrap; gap: .4rem; padding: .65rem .9rem calc(.65rem + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--line); background: var(--sheet-2); }
.pk__go { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: .35rem; padding: .45rem .7rem; border-radius: 9px; border: 1px solid var(--line-2, var(--line)); background: var(--sheet); color: var(--ink); font-size: .8rem; font-weight: 600; }
.pk__go svg { width: 15px; height: 15px; }
.pk__go:hover, .pk__go:focus-visible { border-color: var(--c); }
.pk__go.is-main { background: var(--c); border-color: var(--c); color: #fff; }
`;
  document.head.append(s);
}
