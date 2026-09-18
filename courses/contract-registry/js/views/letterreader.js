/* ═══════════════════════════════════════════════════════════════
   The letter reader — one TKV letter, two ways to read it.

   · SUMMARY      what it says in plain words, what it asks for, the
                  clauses it leans on (each one checked), its thread
   · FULL LETTER  the letter as written, set on a sheet, with clause
                  references marked and letter numbers you can follow

   The texts sit in their own sealed file (data/letters.sealed.json),
   opened the first time a letter is read. Summaries travel with the
   register itself.
   ═══════════════════════════════════════════════════════════════ */

import { h, mount, copy, toast } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { openExtra } from '../lib/vault.js';
import { still } from '../lib/motion.js';
import C from '../engine/contract.js';
import { analyse } from '../engine/reader.js';
import { normLetterRef, findLetterRef, registerKey } from '../engine/letters.js';
import { dirLabel } from '../engine/search.js';
import { refChip, stamp } from './ui.js';

const STATUS = {
  ok: ['Checks out', 'ok'], amended: ['PCC changed', 'tape'], title: ['Title differs', 'warn'], fidic: ['Not TKV wording', 'tape'],
  missing: ['Not in TKV', 'tape'], wrong: ['Wrong clause', 'tape'], spec: ['Specification', 'ink'], other: ['Other document', 'ink'],
};
/* who "they" are depends on which way the letter went */
const ASK = { in: 'What it asks of us', out: 'What we asked for', 'er-emp': 'What the Engineer tells the Employer', emp: 'What the Employer says', 'gov-out': 'What we asked for', 'gov-in': 'What it says' };

let texts = null;
export const lettersReady = () => texts;
export async function loadLetters() {
  if (!texts) texts = (await openExtra('letters')).letters;
  return texts;
}

let host = null;      // the open overlay, if any
let lastFocus = null;

/* open(i, { tab, list }) — list is the order to step through with ← / → */
export function openLetter(data, i, { tab = 'summary', list = null, onShow = null } = {}) {
  const R = data.register;
  const byKey = new Map();
  R.forEach((r, j) => { const k = registerKey(r); if (k) byKey.set(k, j); });
  const trail = [];   // letters opened by following a reference, for "Back"
  let cur = i;
  let mode = tab;

  if (!host) {
    lastFocus = document.activeElement;
    host = h('div.lr', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Letter', onclick: (e) => { if (e.target === host) close(); } });
    document.body.append(host);
    document.body.classList.add('has-lr');
    addEventListener('keydown', onKey);
  }

  function close() {
    if (!host) return;
    removeEventListener('keydown', onKey);
    host.classList.add('is-closing');
    const el = host;
    host = null;
    setTimeout(() => el.remove(), still() ? 0 : 160);
    document.body.classList.remove('has-lr');
    lastFocus?.focus?.({ preventScroll: true });
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowRight' && list) { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' && list) { e.preventDefault(); step(-1); }
  }
  function step(d) {
    const k = list.indexOf(cur);
    const n = list[k + d];
    if (n == null) return;
    trail.length = 0;
    go(n);
  }
  function go(j, { follow = false } = {}) {
    if (follow) trail.push(cur);
    cur = j;
    onShow?.(j);
    draw();
  }

  async function draw() {
    const r = R[cur];
    const pos = list ? list.indexOf(cur) : -1;
    const sheet = h('div.lr__sheet', { tabindex: '-1' });
    const body = h('div.lr__body');
    const tabs = h('div.lr__tabs', { role: 'tablist' },
      tabBtn('summary', 'Summary', 'spark'),
      tabBtn('letter', 'Full letter', 'doc', !r.x));
    function tabBtn(id, label, ic, off) {
      return h('button.lr__tab', { type: 'button', role: 'tab', 'aria-selected': String(mode === id), disabled: off || null, title: off ? 'The letter itself is not on file' : null,
        onclick: () => { mode = id; draw(); } }, icon(ic), label);
    }
    mount(sheet,
      h('header.lr__head',
        h('div.lr__title',
          h('p.eyebrow', dirLabel(r.c), r.t?.length ? ` · ${r.t.join(', ')}` : ''),
          h('h2.lr__s', r.s),
          h('p.lr__meta', h('span.mono', r.n), h('span', r.d || 'no date'))),
        h('div.lr__tools',
          trail.length ? h('button.btn.btn--sm', { type: 'button', onclick: () => { const b = trail.pop(); cur = b; onShow?.(b); draw(); } }, icon('back'), 'Back') : null,
          list ? h('div.lr__step',
            h('button.btn.btn--ghost.btn--sm', { type: 'button', disabled: pos <= 0 || null, onclick: () => step(-1), title: 'Previous letter (←)', 'aria-label': 'Previous letter' }, h('span.lr__chev', '‹')),
            h('span.lr__pos', `${pos + 1} / ${list.length}`),
            h('button.btn.btn--ghost.btn--sm', { type: 'button', disabled: pos >= list.length - 1 || null, onclick: () => step(1), title: 'Next letter (→)', 'aria-label': 'Next letter' }, h('span.lr__chev', '›'))) : null,
          h('button.btn.btn--ghost.btn--sm.lr__x', { type: 'button', onclick: close, title: 'Close (Esc)', 'aria-label': 'Close' }, icon('x')))),
      tabs, body);
    mount(host, sheet);
    sheet.focus({ preventScroll: true });

    if (r.x && !texts) mount(body, h('div.lr__loading', h('span.lr__spin'), 'Opening the sealed letter file…'));
    let t = null;
    if (r.x) {
      try { t = (await loadLetters())[cur]; } catch (e) {
        mount(body, h('div.empty', 'The letter file could not be opened. ', e.message || ''));
        return;
      }
      if (R[cur] !== r || !host) return;   // moved on while loading
    }
    const reading = t ? analyse(t.body.join('\n\n'), data) : null;
    mount(body, mode === 'letter' && t ? letterView(r, t, reading) : summaryView(r, t, reading));
    body.scrollTop = 0;
  }

  /* ── summary ─────────────────────────────────────────────────── */
  function summaryView(r, t, reading) {
    const sm = r.sm;
    const cites = reading ? reading.citations : [];
    const main = h('div.lr-sum__main',
      sm ? h('section.lr-sum__lead', h('p.eyebrow', 'In short'), h('p.lr-sum__s', sm.s)) : null,
      sm?.a ? h('section.lr-sum__ask', h('p.eyebrow', ASK[r.c] || 'What it asks'), h('p', sm.a)) : null,
      sm?.k?.length ? h('section.lr-sum__pts', h('p.eyebrow', 'Key points'), h('ul', sm.k.map((x) => h('li', x)))) : null,
      !sm && t ? h('section.lr-sum__lead.is-none', h('p.eyebrow', 'No summary yet'), h('p.lr-sum__s', firstSentences(t.body)), h('p.muted', 'This is how the letter opens. Read the full letter for the rest.')) : null,
      !t ? h('section.lr-sum__lead.is-none', h('p.eyebrow', 'Register entry only'),
        h('p', 'The letter itself is not on file here yet, so there is no summary. The register still shows its number, date, subject and thread.')) : null,
      t ? h('button.btn.btn--stamp.lr-sum__read', { type: 'button', onclick: () => { mode = 'letter'; draw(); } }, icon('doc'), 'Read the full letter') : null);

    const side = h('aside.lr-sum__side',
      cites.length ? h('section.lr-card',
        h('h3.lr-card__h', 'Clauses in this letter'),
        h('p.lr-card__sub', 'Only numbers the letter uses as clauses. Each one checked against the TKV contract.'),
        h('ul.lr-cites', cites.map(citeItem))) : t ? h('section.lr-card', h('h3.lr-card__h', 'Clauses in this letter'), h('p.muted', 'This letter does not cite a contract clause.')) : null,
      thread(r));
    return h('div.lr-sum', main, side);
  }

  function citeItem(c) {
    const st = c.status === 'ok' && c.amended ? 'amended' : c.status;
    const [label, kind] = STATUS[st] || STATUS.ok;
    const linkable = C.resolve(c.key) && !['spec', 'other', 'missing'].includes(st);
    return h(`li.lr-cite.lr-cite--${st}`,
      h('div.lr-cite__top',
        linkable ? h('a.lr-cite__no.mono', { href: C.hrefOf(c.key), title: 'Open this clause' }, c.key) : h('span.lr-cite__no.mono', c.key),
        h('span.lr-cite__t', linkable ? C.titleOf(c.key) : c.raws[0]),
        stamp(label, kind)),
      c.note ? h('p.lr-cite__note', c.note) : null);
  }

  function thread(r) {
    const link = (raw) => {
      const n = normLetterRef(raw);
      const j = n ? byKey.get(n.key) : undefined;
      return j != null
        ? h('button.lr-link', { type: 'button', onclick: () => go(j, { follow: true }) }, h('span.mono', raw), h('span', R[j].s), R[j].x ? h('i.lr-link__doc', { title: 'Full letter on file' }, icon('doc')) : null)
        : h('span.lr-link.is-off', h('span.mono', raw));
    };
    const me = registerKey(r);
    const citing = me ? R.map((x, j) => ({ x, j })).filter(({ x }) => (x.r || []).some((ref) => normLetterRef(ref)?.key === me)) : [];
    if (!r.r?.length && !r.rp?.length && !citing.length) return null;
    return h('section.lr-card',
      h('h3.lr-card__h', 'The thread'),
      r.r?.length ? h('div.lr-card__sec', h('span.label', 'Refers to'), r.r.map(link)) : null,
      r.rp?.length ? h('div.lr-card__sec', h('span.label', 'Replied by'), r.rp.map(link)) : null,
      citing.length ? h('div.lr-card__sec', h('span.label', 'Letters that cite this one'), citing.slice(0, 12).map(({ x }) => link(x.n))) : null);
  }

  /* ── the full letter ─────────────────────────────────────────── */
  function letterView(r, t, reading) {
    const text = reading.text;
    const starts = [];
    let at = 0;
    for (const p of t.body) { starts.push(at); at += p.length + 2; }
    const rough = new Set(t.rough || []);
    const refFor = (n) => t.refs?.[n - 1] || null;

    const paper = h('article.lr-paper',
      h('div.lr-paper__top',
        h('span.mono', r.n),
        h('span', r.d ? fmtDate(r.d) : '')),
      t.attn ? h('p.lr-paper__to', h('span.lr-paper__k', 'Attn'), t.attn) : null,
      h('p.lr-paper__subj', h('span.lr-paper__k', 'Subject'), r.s),
      t.refs?.length ? h('div.lr-paper__refs', h('span.lr-paper__k', 'References'),
        h('ol', t.refs.map((x, k) => h('li', { id: `lr-ref-${k + 1}` }, refLine(x))))) : null,
      t.dear ? h('p.lr-paper__dear', t.dear) : null,
      t.body.map((p, k) => {
        const bullet = /^•\s/.test(p);
        const nodes = marks(p.replace(/^•\s/, ''), starts[k] + (bullet ? 2 : 0), text, reading, refFor);
        return h(`p.lr-paper__p${bullet ? '.is-item' : ''}${rough.has(k) ? '.is-rough' : ''}`,
          rough.has(k) ? { title: 'The scan is hard to read here — some words may be wrong' } : null, nodes);
      }),
      t.close?.length ? h('div.lr-paper__close', t.close.map((x) => h('p', x))) : null,
      t.cc?.length ? h('div.lr-paper__cc', t.cc.map((x) => h('p', x))) : null);

    return h('div.lr-letter',
      h('div.lr-letter__bar',
        h('div.lr-legend',
          h('span', h('i.mk.mk--cite.mk--ok', '35.1'), 'Clause checks out'),
          h('span', h('i.mk.mk--cite.mk--amended', '67.1'), 'Changed by the PCC'),
          h('span', h('i.mk.mk--cite.mk--missing', '34'), 'Does not check out'),
          h('span', h('i.mk.mk--cite.mk--spec', '5.4'), 'Specification, not the contract'),
          h('span', h('i.mk.mk--letter', 'TKV/COM/…'), 'Another letter')),
        h('div.lr-letter__acts',
          h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => { copy(plainText(r, t)); toast('Letter copied'); } }, icon('copy'), 'Copy text'))),
      t.scan || rough.size ? h('p.lr-note', icon('info'), h('span', t.scan
        ? 'Read from a scanned copy. Most of it is clean, but a few words may be misread — check the signed PDF before you quote it.'
        : 'Parts of this copy were hard to read. Faded paragraphs are marked; check the signed PDF before you quote them.')) : null,
      paper);
  }

  function refLine(x) {
    const f = findLetterRef(x);
    const j = f ? byKey.get(f.key) : undefined;
    if (j == null) return x;
    const end = f.index + f.length;
    return [x.slice(0, f.index), h('button.lr-inref', { type: 'button', title: R[j].s, onclick: () => go(j, { follow: true }) }, x.slice(f.index, end)), x.slice(end)];
  }

  /* one paragraph with its marks: clauses (checked), specs, other letters, [n] references */
  function marks(p, off, text, reading, refFor) {
    const end = off + p.length;
    const list = reading.marks
      .filter((m) => m.start >= off && m.end <= end && ['cite', 'spec', 'letter'].includes(m.kind))
      .map((m) => ({ ...m, start: m.start - off, end: m.end - off }));
    for (const m of p.matchAll(/\[(\d{1,2})\]/g)) if (refFor(+m[1])) list.push({ start: m.index, end: m.index + m[0].length, kind: 'ref', n: +m[1] });
    list.sort((a, b) => a.start - b.start || b.end - a.end);
    const out = [];
    let pos = 0;
    for (const mk of list) {
      if (mk.start < pos) continue;
      if (mk.start > pos) out.push(p.slice(pos, mk.start));
      const s = p.slice(mk.start, mk.end);
      if (mk.kind === 'cite') {
        const c = reading.citations.find((x) => x.id === mk.id);
        const st = c ? (c.status === 'ok' && c.amended ? 'amended' : c.status) : 'ok';
        const tip = c?.note || C.titleOf(mk.key) || '';
        out.push(C.resolve(mk.key) && !['spec', 'other', 'missing'].includes(st)
          ? h(`a.mk.mk--cite.mk--${st}`, { href: C.hrefOf(mk.key), title: tip }, s)
          : h(`span.mk.mk--cite.mk--${st}`, { title: tip }, s));
      } else if (mk.kind === 'letter') {
        const n = normLetterRef(s);
        const j = n ? byKey.get(n.key) : undefined;
        out.push(j != null
          ? h('button.mk.mk--letter.lr-inref', { type: 'button', title: R[j].s, onclick: () => go(j, { follow: true }) }, s)
          : h('span.mk.mk--letter', { title: 'Not in the register' }, s));
      } else if (mk.kind === 'ref') {
        out.push(h('a.lr-refno', { href: `#lr-ref-${mk.n}`, title: refFor(mk.n), onclick: (e) => { e.preventDefault(); host?.querySelector(`#lr-ref-${mk.n}`)?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }); } }, s));
      } else out.push(h('span.mk.mk--spec', { title: 'A clause of the technical specification' }, s));
      pos = mk.end;
    }
    out.push(p.slice(pos));
    return out;
  }

  draw();
  return { close };
}

function firstSentences(body) {
  const p = body.find((x) => x.length > 60) || body[0] || '';
  const s = p.match(/^(.{60,420}?[.!?])(\s|$)/);
  return s ? s[1] : p.slice(0, 420);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m || +m[1] < 2000) return iso;   // Nepali dates stay as written
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}

function plainText(r, t) {
  return [
    `${r.n}    ${r.d || ''}`,
    t.attn ? `Attn: ${t.attn}` : null,
    `Subject: ${r.s}`,
    t.refs?.length ? `References:\n${t.refs.map((x, k) => `${k + 1}. ${x}`).join('\n')}` : null,
    t.dear || null,
    t.body.join('\n\n'),
    t.close?.join('\n') || null,
    t.cc?.join('\n') || null,
  ].filter(Boolean).join('\n\n');
}
