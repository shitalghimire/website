/* The drafting desk */

import { h, mount, copy, download, debounce } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import * as D from '../lib/dates.js';
import C from '../engine/contract.js';
import { compose, toText, toDoc } from '../engine/compose.js';
import { head, rich, refChip, stamp, sec } from './ui.js';

const KINDS = [['notice', 'Notices', 'Start or protect a right'], ['claim', 'Claims', 'Particulars and updates'], ['reply', 'Replies', 'Answer what they sent'], ['request', 'Requests', 'Ask for what you need'], ['submission', 'Submissions', 'Send documents the right way']];

export default function write(view, { args, ctx, data }) {
  const W = data.writing;
  const tpl = W.templates.find((t) => t.id === args[0]);
  if (!tpl) return chooser(view, ctx, data);
  ctx.crumbs([{ label: 'Draft', href: '#/write' }, { label: tpl.title }]);

  const hand = JSON.parse(sessionStorage.getItem('registry:handoff') || 'null');
  sessionStorage.removeItem('registry:handoff');
  const saved = store.get().drafts[tpl.id] || {};
  const settings = store.get().settings;
  const values = { ...(saved.values || {}) };
  const header = { date: D.iso(D.today()), refNo: '', yourRefs: '', ourRefs: '', subject: '', signName: settings.signName || '', signTitle: settings.signTitle || '', attn: settings.attn || '', attnTitle: settings.attnTitle || '', cc: '', ...(saved.header || {}) };

  if (hand && hand.template === tpl.id) {
    if (hand.theirRef) header.yourRefs = `${hand.theirRef}${hand.theirDate ? ' dated ' + D.fmt(D.fromIso(hand.theirDate)) : ''}` + (hand.refs?.length ? '\n' + hand.refs.filter((r) => /LOT/i.test(r)).join('\n') : '');
    const ourRefs = (hand.refs || []).filter((r) => /TKV/i.test(r));
    if (ourRefs.length) header.ourRefs = ourRefs.join('\n');
    const map = { detRef: hand.theirRef, erRef: hand.theirRef, detDate: hand.theirDate, received: hand.received, matter: hand.subject, claim: hand.subject };
    for (const f of tpl.fields) if (map[f.key] && !values[f.key]) values[f.key] = map[f.key];
  }

  const preview = h('div.paper');
  const checklist = h('ul.checklist');
  const checkOut = h('div.draftcheck');
  const persist = debounce(() => store.update((s) => {
    s.drafts[tpl.id] = { values, header, at: Date.now() };
    for (const k of ['signName', 'signTitle', 'attn', 'attnTitle']) if (header[k]) s.settings[k] = header[k];
  }), 300);

  const redraw = () => { drawPreview(); persist(); };

  /* form */
  const field = (f) => {
    const val = values[f.key] ?? '';
    const on = (e) => { values[f.key] = f.type === 'check' ? e.target.checked : e.target.value; redraw(); };
    let input;
    if (f.type === 'area') input = h('textarea.area', { rows: 4, placeholder: f.ph || '', value: val, oninput: on });
    else if (f.type === 'check') return h('label.check.form__check', h('input', { type: 'checkbox', checked: !!val, onchange: on }), f.label);
    else if (f.type === 'select') input = h('select.select', { onchange: on }, h('option', { value: '' }, 'Choose…'), f.options.map((o) => h('option', { value: o, selected: o === val }, o)));
    else input = h('input.input', { type: f.type === 'date' ? 'date' : 'text', placeholder: f.ph || '', value: val, oninput: on });
    return h('label.field', h('span', f.label), input);
  };
  const hField = (key, label, type = 'text', ph = '') => h('label.field', h('span', label),
    type === 'area' ? h('textarea.area', { rows: 2, placeholder: ph, value: header[key], oninput: (e) => { header[key] = e.target.value; redraw(); } })
      : h('input.input', { type, placeholder: ph, value: header[key], oninput: (e) => { header[key] = e.target.value; redraw(); } }));

  const dl = tpl.deadline;
  const dlBanner = dl && dl.n ? h('div.w-deadline', icon('clock'), h('div', h('b', `${dl.n} ${dl.unit}`), ' from ', dl.from, hand?.received ? [h('br'), h('span', `Received ${D.fmt(D.fromIso(hand.received))} → send by `), h('b', D.fmt(D.add(D.fromIso(hand.received), dl.n, dl.unit)))] : null)) : null;

  const form = h('div.w-form',
    h('div.w-tpl', h('span.eyebrow', 'Letter type'), h('h2.w-tpl__t', tpl.title), h('p', rich(tpl.when)), h('div.chips', tpl.clauses.map((c) => refChip(c)))),
    dlBanner,
    h('fieldset.w-set', h('legend', '1 · The facts'), tpl.fields.map(field)),
    h('fieldset.w-set', h('legend', '2 · Letter header'),
      h('div.w-grid', hField('refNo', 'Our ref. no.', 'text', '9xx'), hField('date', 'Date', 'date')),
      hField('yourRefs', 'Their letters (one per line)', 'area', 'LOT-01/SINOHYDRO-KSNS-JV/716 dated 9 March 2026'),
      hField('ourRefs', 'Our earlier letters (one per line)', 'area', 'TKV/COM/2026/696 dated 24 January 2026'),
      hField('subject', 'Subject (leave empty to use the suggested one)')),
    h('details.w-set.w-more', h('summary', '3 · Signatory and addressee'),
      h('div.w-grid', hField('signName', 'Signed by', 'text', W.house.signName), hField('signTitle', 'Title', 'text', W.house.signTitle)),
      h('div.w-grid', hField('attn', 'Attn.', 'text', W.house.attn), hField('attnTitle', 'Attn. title', 'text', W.house.attnTitle)),
      hField('cc', 'CC', 'text', W.house.cc)),
    h('section.w-set', h('h3.plain__h', icon('check'), 'Before you send'), checklist),
    phraseBank(W, (txt) => { navigator.clipboard?.writeText(txt); }),
  );

  const actions = h('div.w-actions',
    h('button.btn.btn--stamp', { type: 'button', onclick: () => copy(toText(current())) }, icon('copy'), 'Copy letter'),
    h('button.btn', { type: 'button', onclick: () => download(`${tpl.id}-${header.date}.doc`, toDoc(current()), 'application/msword') }, icon('download'), 'Word (.doc)'),
    h('button.btn', { type: 'button', onclick: () => download(`${tpl.id}-${header.date}.txt`, toText(current())) }, icon('doc'), '.txt'),
    h('button.btn.btn--ghost', { type: 'button', onclick: () => print() }, icon('print'), 'Print'),
    h('button.btn.btn--ghost', { type: 'button', onclick: checkDraft }, icon('scan'), 'Check clauses'),
    h('button.btn.btn--ghost', { type: 'button', onclick: () => { if (confirm('Clear this draft?')) { store.update((s) => { delete s.drafts[tpl.id]; }); location.reload(); } } }, icon('refresh'), 'Reset'));

  view.append(
    head(h('span', 'Draft: ', h('em', tpl.title.toLowerCase())), 'Fill in the facts on the left. The letter writes itself on the right in the TKV house format — every clause already checked against the contract. Your draft is saved on this device as you type.'),
    h('div.w-layout', form, h('div.w-side', actions, checkOut, preview)));

  function current() { return compose(tpl, values, header, W.house); }

  function drawPreview() {
    const L = current();
    const hh = W.house;
    const para = (s) => {
      const parts = s.split(/(⟦[^⟧]*⟧)/g);
      return h('p.paper__p', parts.map((x) => (/^⟦.*⟧$/.test(x) ? h('span.paper__blank', x.slice(1, -1)) : rich(x))));
    };
    mount(preview,
      h('div.paper__head', h('div.paper__co', hh.company), h('div.paper__proj', hh.project), h('div.paper__lot', hh.lot)),
      h('div.paper__refline', h('span', 'Our ref.: ', h('b', L.ourRef)), h('span', 'Date: ', L.date)),
      h('div.paper__to', 'To', h('br'), hh.to.map((x) => [x, h('br')]), `Attn. ${header.attn || hh.attn}`, h('br'), header.attnTitle || hh.attnTitle),
      h('p.paper__meta', `Contract No.: ${hh.contractNo}`),
      L.refList.map((g) => h('div.paper__refs', h('span', g.h), g.items.map((x) => h('span.paper__ref', x)))),
      h('p.paper__subj', 'Subject: ', [...para(L.subject).childNodes]),
      h('p.paper__p', 'Dear Sir,'),
      L.body.map(para),
      h('p.paper__p', 'Yours sincerely,'),
      h('div.paper__sign', h('b', header.signName || hh.signName), h('br'), header.signTitle || hh.signTitle),
      h('p.paper__cc', `CC: ${header.cc || hh.cc}`),
      h('div.paper__stamp', { 'aria-hidden': 'true' }, 'DRAFT'));
    const blanks = L.body.join(' ').match(/⟦[^⟧]*⟧/g)?.length || 0;
    mount(checklist,
      h(`li${blanks ? '.is-open' : '.is-done'}`, blanks ? `${blanks} blank${blanks > 1 ? 's' : ''} still to fill` : 'All facts filled in'),
      h(`li${header.refNo ? '.is-done' : '.is-open'}`, header.refNo ? `Reference ${L.ourRef}` : 'Add our reference number'),
      tpl.checklist.map((c) => h('li.is-q', rich(c))));
  }

  function checkDraft() {
    const text = toText(current());
    const refs = C.findRefs(text);
    const seen = new Map();
    for (const r of refs) { const key = r.ref + (r.item ? `(${r.item})` : ''); if (!seen.has(key)) seen.set(key, r); }
    const rows = [...seen.entries()].map(([key]) => {
      const ok = C.resolve(key);
      const fidic = data.reader.fidic.find((f) => f.from === key.replace(/\(.*$/, ''));
      return h(`li.${ok ? 'is-done' : 'is-bad'}`, h('b.mono', key), ' ', ok ? C.titleOf(key) : h('span', 'Not in TKV', fidic ? ` — ${fidic.note}` : ''));
    });
    const wrong = [];
    if (/sub-?clause\s+34\b/i.test(text) && /notice of (claim|intention)/i.test(text)) wrong.push('A notice of claim cites 34 — the Contractor\'s claims clause is 35.');
    if (/10\.1\s*\(\s*b\s*\)/i.test(text) && /employer/i.test(text)) wrong.push('10.1(b) is the Contractor\'s permit duty; the Employer\'s is 10.1(a).');
    mount(checkOut, h('div.draftcheck__box', h('h3.plain__h', icon('scan'), 'Clauses in this draft'), h('ul.checklist', rows), wrong.map((w) => h('p.an-alert', icon('alert'), w)),
      h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: () => { sessionStorage.setItem('registry:analyse', text); location.hash = '/analyse'; } }, 'Full analysis of the draft', icon('arrow'))));
  }

  drawPreview();
}

function chooser(view, ctx, data) {
  ctx.crumbs([{ label: 'Draft' }]);
  const W = data.writing;
  const drafts = store.get().drafts;
  view.append(
    head(h('span', 'The drafting ', h('em', 'desk')), 'Choose what you need to send. Each letter type knows its clause, its deadline and what the Engineer will check — built from what worked and what failed on TKV.',
      [h('button.btn', { type: 'button', onclick: () => { sessionStorage.setItem('registry:analyse', ''); location.hash = '/analyse'; } }, icon('scan'), 'Check a draft I wrote')]),
    Object.keys(drafts).length ? h('section.w-drafts', h('span.eyebrow', 'Continue a draft'), h('div.chips', Object.entries(drafts).sort((a, b) => b[1].at - a[1].at).map(([id, d]) => {
      const t = W.templates.find((x) => x.id === id);
      return t ? h('a.chip.chip--plain', { href: `#/write/${id}` }, icon('pen'), t.title, h('small.muted', ` · ${D.fmtShort(new Date(d.at))}`)) : null;
    }))) : null,
    ...KINDS.map(([kind, title, sub]) => {
      const list = W.templates.filter((t) => t.kind === kind);
      return h('section.sec', h('h2.sec__title', h('span.eyebrow', sub), title),
        h('div.grid.grid--3', list.map((t) => h('a.card.card--link.tplcard', { href: `#/write/${t.id}` },
          h('div.tplcard__top', h('span.tplcard__icon', icon('pen')), t.deadline?.n ? h('span.tplcard__dl', `${t.deadline.n} ${t.deadline.unit}`) : null),
          h('h3.tplcard__t', t.title),
          h('p.tplcard__w', t.when),
          h('div.chips', t.clauses.slice(0, 4).map((c) => h('span.chip', c)))))));
    }),
    sec('How a TKV letter is built', 'Anatomy'),
    h('div.anatomy', W.anatomy.map((a, i) => h('div.anatomy__row', h('span.anatomy__n', String(i + 1).padStart(2, '0')), h('div', h('b', a.part), h('code.anatomy__eg', a.eg), h('p', rich(a.why)))))));
}

function phraseBank(W) {
  return h('details.w-set.w-more', h('summary', 'Phrase bank — tap to copy'),
    W.phrases.map((g) => h('div.phr', h('span.eyebrow', g.group), h('ul', g.items.map((p) => h('li', h('button.phr__b', { type: 'button', onclick: () => copy(p) }, p)))))));
}
