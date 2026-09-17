/* One clause: plain words, deadlines, the exact text with PCC slips, TKV usage */

import { h, mount, copy, debounce } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import C, { SECTIONS } from '../engine/contract.js';
import { rich, refChip, blocks, slip, deadlineChip, question, levelBadge, stamp } from './ui.js';

export default function clause(view, { args, params, ctx, data }) {
  const r = C.resolve(args[0]);
  if (!r) { view.append(h('div.empty', `There is no clause ${args[0]} in this contract. `, h('a', { href: '#/read' }, 'All clauses'))); return; }
  const c = r.clause;
  const p = c.plain || {};
  const st = store.get();
  ctx.crumbs([{ label: 'Clauses', href: '#/read' }, { label: `${c.no} ${c.title}` }]);
  store.update((s) => { s.opened[c.no] = Date.now(); });

  const list = C.allClauses();
  const idx = list.indexOf(c);
  const prev = list[idx - 1];
  const next = list[idx + 1];
  const amended = c.pcc.length || c.subs.some((s) => s.pcc.length);

  const learnBtn = h('button.btn.btn--sm', { type: 'button', onclick: () => { store.update((s) => { if (s.learned[c.no]) delete s.learned[c.no]; else s.learned[c.no] = Date.now(); }); paintBtns(); } });
  const saveBtn = h('button.btn.btn--sm', { type: 'button', onclick: () => { store.update((s) => { if (s.bookmarks[c.no]) delete s.bookmarks[c.no]; else s.bookmarks[c.no] = Date.now(); }); paintBtns(); } });
  const paintBtns = () => {
    const s = store.get();
    mount(learnBtn, icon('check'), s.learned[c.no] ? 'Learned' : 'Mark learned');
    learnBtn.classList.toggle('btn--ink', !!s.learned[c.no]);
    mount(saveBtn, icon('star'), s.bookmarks[c.no] ? 'Saved' : 'Save');
    saveBtn.classList.toggle('is-on', !!s.bookmarks[c.no]);
  };
  paintBtns();

  /* ── header ── */
  view.append(h('header.cl-head',
    h('div.cl-head__no', { 'aria-hidden': 'true' }, c.no),
    h('div.cl-head__text',
      h('p.eyebrow', c.section === 'P' ? 'New clause in the Particular Conditions' : `GCC · ${c.section}. ${SECTIONS[c.section]}`),
      h('h1.cl-head__title', h('span.sr', `Clause ${c.no} `), c.title),
      h('div.row.cl-head__tags', levelBadge(p.level), amended ? h('span.chip.chip--pcc', icon('tape'), 'Changed by the PCC') : null, ...(p.tags || []).slice(0, 4).map((t) => h('span.chip.chip--plain', t)))),
    h('div.cl-head__actions', learnBtn, saveBtn,
      h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: () => copy(`Clause ${c.no} [${c.title}]`) }, icon('copy'), 'Copy ref'))));

  /* ── main + side ── */
  const main = h('div.cl-main');
  const side = h('aside.cl-side');
  view.append(h('div.cl-layout', main, side));

  // plain words
  if (p.gist) {
    main.append(h('section.plain',
      h('p.plain__gist', rich(p.gist)),
      p.points?.length ? h('div.plain__block', h('h3.plain__h', 'What it says'), h('ul.plain__list', p.points.map((x) => h('li', rich(x))))) : null,
      h('div.plain__two',
        p.use?.length ? h('div.plain__use', h('h3.plain__h', icon('shield'), 'Use it — your side'), h('ul', p.use.map((x) => h('li', rich(x))))) : null,
        p.watch?.length ? h('div.plain__watch', h('h3.plain__h', icon('alert'), 'Watch out'), h('ul', p.watch.map((x) => h('li', rich(x))))) : null)));
  }
  if (p.d?.length) main.append(h('section.cl-deadlines', h('h3.plain__h', icon('clock'), 'Clocks in this clause'), h('div.dls', p.d.map(deadlineChip)), h('a.btn.btn--sm', { href: `#/clock?c=${c.no}` }, 'Count a date', icon('arrow'))));

  // the exact text
  const modeKey = 'textMode';
  let mode = st.settings[modeKey] || 'amended';
  const seg = h('div.seg', { role: 'group', 'aria-label': 'Text view' }, [['amended', 'As amended'], ['gcc', 'GCC only'], ['pcc', 'PCC only']].map(([id, label]) => h('button', { type: 'button', 'aria-pressed': String(mode === id), onclick: () => { mode = id; store.update((s) => { s.settings[modeKey] = id; }); seg.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(['amended', 'gcc', 'pcc'][i] === mode))); drawText(); } }, label)));
  const textBox = h('div.ct');
  main.append(h('section.cl-text',
    h('div.cl-text__bar', h('h2.cl-text__h', 'The contract text'), seg),
    c.gap ? h('p.gapnote', icon('info'), c.gap) : null,
    textBox,
    h('p.ct__note', 'Text from the signed GCC and PCC (Word copies of the scanned contract). Obvious scanning errors are corrected. Before quoting in a formal letter, check the wording against the signed PDF.')));

  function drawText() {
    const nodes = [];
    for (const e of c.pcc) if (mode !== 'gcc') nodes.push(slip(e, data.contract.pcc.tables));
    for (const s of c.subs) {
      const hasGcc = s.blocks.length > 0;
      const replaced = s.pcc.some((e) => e.action === 'replace' && !e.item && !/corrected|cut from|claim route|cost relief/i.test(e.title));
      const slips = s.pcc.map((e) => slip(e, data.contract.pcc.tables));
      if (mode === 'pcc' && !s.pcc.length) continue;
      if (mode === 'gcc' && !hasGcc) continue;
      const art = h(`article.sc${s.pcc.length ? '.sc--pcc' : ''}${s.src === 'pcc' ? '.sc--new' : ''}`, { id: 'sc-' + s.key.replace('.', '_') },
        h('div.sc__no', h('a', { href: `#/read/${c.no}?s=${encodeURIComponent(s.key)}` }, s.no), s.dupe ? h('small', 'numbered twice') : null, s.src === 'pdf' ? h('small', 'from signed PDF') : null),
        h('div.sc__body',
          hasGcc && mode !== 'pcc' ? h(`div.sc__gcc${replaced && mode === 'amended' ? '.is-replaced' : ''}`, replaced && mode === 'amended' ? h('span.sc__struck', 'GCC text — replaced by the PCC below') : null, blocks(s.blocks)) : null,
          !hasGcc && mode !== 'gcc' && s.src === 'pcc' ? h('p.sc__newnote', 'This sub-clause exists only in the PCC.') : null,
          mode !== 'gcc' ? slips : null));
      nodes.push(art);
    }
    mount(textBox, nodes.length ? nodes : h('div.empty', mode === 'pcc' ? 'The PCC does not change this clause.' : 'No GCC text for this clause.'));
    const target = params.get('s');
    if (target) {
      const el = textBox.querySelector('#sc-' + target.replace('.', '_'));
      if (el) { el.classList.add('is-target'); setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
    }
  }
  drawText();

  /* ── side ── */
  const usage = data.usage;
  const cites = [...new Set([c.no, ...c.subs.map((s) => s.no)])].map((k) => ({ k, us: usage.contractor[k] || 0, er: usage.er[k] || 0 })).filter((x) => x.us || x.er);
  if (cites.length) {
    const max = Math.max(...cites.map((x) => Math.max(x.us, x.er)));
    side.append(h('section.side-card', h('h3.side-card__h', 'Cited on TKV'),
      h('div.mini-usage', cites.sort((a, b) => b.us + b.er - a.us - a.er).slice(0, 6).map((x) => h('div.mini-usage__row',
        h('span.mono', x.k),
        h('span.mini-usage__bars', h('span.usage__bar.usage__bar--us', { style: { width: `${x.us / max * 100}%` } }), h('span.usage__bar.usage__bar--er', { style: { width: `${x.er / max * 100}%` } })),
        h('span.mini-usage__n', `${x.us} / ${x.er}`)))),
      h('p.side-card__foot', 'Letters citing it: ours / the Engineer\'s')));
  }
  const relCases = data.cases.filter((k) => [...k.ours, ...k.theirs].some((x) => x.split(/[.(]/)[0] === c.no));
  if (relCases.length) side.append(h('section.side-card', h('h3.side-card__h', 'In the case files'), h('ul.side-links', relCases.map((k) => h('li', h('a', { href: `#/cases/${k.id}` }, h('b', k.no), ' ', k.title))))));
  if (p.related?.length) side.append(h('section.side-card', h('h3.side-card__h', 'Read with'), h('div.chips', p.related.map((x) => refChip(x, { label: `${x} ${C.titleOf(x) || ''}`.trim() })))));
  const tpls = data.writing.templates.filter((t) => t.clauses.some((x) => x.split(/[.(]/)[0] === c.no));
  if (tpls.length) side.append(h('section.side-card', h('h3.side-card__h', 'Letters that use it'), h('ul.side-links', tpls.map((t) => h('li', h('a', { href: `#/exchange/${t.id}` }, icon('mail'), t.title))))));

  const qs = Object.entries(data.path.questions).filter(([, q]) => q.ref && q.ref.split(/[.(]/)[0] === c.no).slice(0, 2);
  if (qs.length) side.append(h('section.side-card', h('h3.side-card__h', 'Check yourself'), qs.map(([id, q]) => question(id, q))));

  const note = h('textarea.area.notes', { placeholder: 'Your notes on this clause — kept on this device only.', value: st.notes[c.no] || '', oninput: debounce((e) => store.update((s) => { if (e.target.value.trim()) s.notes[c.no] = e.target.value; else delete s.notes[c.no]; }), 400) });
  side.append(h('section.side-card', h('h3.side-card__h', 'My notes'), note));

  view.append(h('nav.pager',
    prev ? h('a.pager__a', { href: `#/read/${prev.no}` }, icon('back'), h('span', h('small', 'Previous'), `${prev.no} ${prev.title}`)) : h('span'),
    next ? h('a.pager__a.pager__a--next', { href: `#/read/${next.no}` }, h('span', h('small', 'Next'), `${next.no} ${next.title}`), icon('arrow')) : h('span')));
}
