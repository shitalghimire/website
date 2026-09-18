/* ═══════════════════════════════════════════════════════════════
   Draft a letter — a tool.

   Pick the kind of letter, fill in the facts, and it writes itself in
   the TKV house format. What is new: the pre-flight that used to hide
   behind a "Check clauses" button now runs as you type, the send-by
   date sits at the top where it cannot be missed, and a finished draft
   hands straight across to the letter check.
   ═══════════════════════════════════════════════════════════════ */

import { h, mount, copy, download, debounce } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { reveal, still } from '../lib/motion.js';
import * as D from '../lib/dates.js';
import { compose, toText, toDoc } from '../engine/compose.js';
import { analyse } from '../engine/reader.js';
import { preflight } from '../engine/check.js';
import { head, rich, refChip, sec } from './ui.js';

const KINDS = [
  ['notice', 'Notices', 'You start a clock'],
  ['claim', 'Claims', 'You put the case'],
  ['reply', 'Replies', 'Something landed on you'],
  ['request', 'Requests', 'You ask for something'],
  ['submission', 'Submissions', 'You hand something in'],
];

/* the fact in each letter that starts its clock */
const CLOCK_FIELD = {
  'notice-claim': 'eventDate', 'fm-notice': 'start', dissatisfaction: 'received',
  'delayed-possession': 'due', 'review-expired': 'received', 'change-in-law': 'effective',
};

export default function draft(view, { args, ctx, data }) {
  const tpl = data.writing.templates.find((t) => t.id === args[0]);
  return tpl ? desk(view, ctx, data, tpl) : chooser(view, ctx, data);
}

/* ═══════════ THE CHOOSER ═══════════ */
function chooser(view, ctx, data) {
  ctx.crumbs([{ label: 'Tools', href: '#/tools' }, { label: 'Draft a letter' }]);
  const W = data.writing;
  const drafts = store.get().drafts || {};
  const open = Object.entries(drafts).sort((a, b) => b[1].at - a[1].at)
    .map(([id, d]) => ({ t: W.templates.find((x) => x.id === id), d })).filter((x) => x.t);

  view.append(
    head(h('span', 'Draft a ', h('em', 'letter')), 'Choose what you need to send. Each letter type knows its clause, its deadline and what the Engineer will test — built from what worked and what failed on TKV.',
      [h('a.btn', { href: '#/tools/letter-check?mode=mine' }, icon('scan'), 'Check a letter I wrote')]),

    open.length ? h('section.dr-open',
      h('span.eyebrow', 'Carry on where you left off'),
      h('div.dr-open__g', open.map(({ t, d }) => h('a.dr-open__c', { href: `#/tools/draft/${t.id}` },
        h('span.dr-open__ic', icon('pen')),
        h('span', h('b', t.title), h('small', `Saved ${D.fmtShort(new Date(d.at))}`)),
        icon('arrow'))))) : null,

    ...KINDS.map(([kind, title, sub]) => {
      const list = W.templates.filter((t) => t.kind === kind);
      if (!list.length) return null;
      return h('section.sec', h('h2.sec__title', h('span.eyebrow', sub), title),
        h('div.grid.grid--3.dr-grid', list.map((t) => h('a.card.card--link.ltr', { href: `#/tools/draft/${t.id}` },
          h('div.ltr__top', h('span.ltr__ic', icon('pen')), t.deadline?.n ? h('span.ltr__dl', `${t.deadline.n} ${t.deadline.unit}`) : null),
          h('h3.ltr__t', t.title),
          h('p.ltr__w', t.when),
          h('div.chips', t.clauses.slice(0, 4).map((c) => h('span.chip', c)))))));
    }),

    sec('How a TKV letter is built', 'Anatomy'),
    h('div.anatomy', W.anatomy.map((a, i) => h('div.anatomy__row',
      h('span.anatomy__n', String(i + 1).padStart(2, '0')),
      h('div', h('b', a.part), h('code.anatomy__eg', a.eg), h('p', rich(a.why)))))),
  );

  reveal(view.querySelector('.dr-open__g'), { selector: '.dr-open__c', stagger: 50 });
}

/* ═══════════ THE DESK ═══════════ */
function desk(view, ctx, data, tpl) {
  ctx.crumbs([{ label: 'Tools', href: '#/tools' }, { label: 'Draft', href: '#/tools/draft' }, { label: tpl.title }]);
  const W = data.writing;

  const hand = JSON.parse(sessionStorage.getItem('registry:handoff') || 'null');
  sessionStorage.removeItem('registry:handoff');
  const saved = (store.get().drafts || {})[tpl.id] || {};
  const settings = store.get().settings;
  const values = { ...(saved.values || {}) };
  const header = {
    date: D.iso(D.today()), refNo: '', yourRefs: '', ourRefs: '', subject: '', clockFrom: '',
    signName: settings.signName || '', signTitle: settings.signTitle || '', attn: settings.attn || '', attnTitle: settings.attnTitle || '', cc: '',
    ...(saved.header || {}),
  };

  /* arriving from the letter check with a letter already read */
  if (hand && hand.template === tpl.id) {
    const theirs = [
      hand.theirRef ? `${hand.theirRef}${hand.theirDate ? ' dated ' + D.fmt(D.fromIso(hand.theirDate)) : ''}` : null,
      ...(hand.refs || []).filter((r) => /LOT|DOLSAR/i.test(r)),
    ].filter(Boolean);
    if (theirs.length) header.yourRefs = theirs.join('\n');
    const ourRefs = (hand.refs || []).filter((r) => /TKV/i.test(r));
    if (ourRefs.length) header.ourRefs = ourRefs.join('\n');
    if (hand.received) header.clockFrom = hand.received;
    const map = { detRef: hand.theirRef, erRef: hand.theirRef, detDate: hand.theirDate, received: hand.received, matter: hand.subject, claim: hand.subject };
    for (const f of tpl.fields) if (map[f.key] && !values[f.key]) values[f.key] = map[f.key];
  }

  const preview = h('div.paper');
  const pre = h('div.dr-pre');
  const clock = h('div.dr-clock');
  const persist = debounce(() => store.update((s) => {
    s.drafts = s.drafts || {};
    s.drafts[tpl.id] = { values, header, at: Date.now() };
    for (const k of ['signName', 'signTitle', 'attn', 'attnTitle']) if (header[k]) s.settings[k] = header[k];
  }), 300);
  const checkLater = debounce(runCheck, 450);

  const redraw = () => { drawPreview(); drawClock(); persist(); checkLater(); };

  /* the clock follows the fact that starts it, until you set it yourself */
  const startKey = CLOCK_FIELD[tpl.id];
  let clockAuto = !header.clockFrom || header.clockFrom === values[startKey];
  const clockInput = h('input.input', { type: 'date', value: header.clockFrom, oninput: (e) => { header.clockFrom = e.target.value; clockAuto = !e.target.value; redraw(); } });

  /* the form */
  const field = (f) => {
    const val = values[f.key] ?? '';
    const on = (e) => {
      values[f.key] = f.type === 'check' ? e.target.checked : e.target.value;
      if (f.key === startKey && clockAuto) { header.clockFrom = e.target.value; clockInput.value = e.target.value; }
      redraw();
    };
    if (f.type === 'check') return h('label.check.form__check', h('input', { type: 'checkbox', checked: !!val, onchange: on }), f.label);
    let input;
    if (f.type === 'area') input = h('textarea.area', { rows: 4, placeholder: f.ph || '', value: val, oninput: on });
    else if (f.type === 'select') input = h('select.select', { onchange: on }, h('option', { value: '' }, 'Choose…'), f.options.map((o) => h('option', { value: o, selected: o === val }, o)));
    else input = h('input.input', { type: f.type === 'date' ? 'date' : 'text', placeholder: f.ph || '', value: val, oninput: on });
    return h('label.field', h('span', f.label), input);
  };
  const hField = (key, label, type = 'text', ph = '') => h('label.field', h('span', label),
    type === 'area'
      ? h('textarea.area', { rows: 2, placeholder: ph, value: header[key], oninput: (e) => { header[key] = e.target.value; redraw(); } })
      : h('input.input', { type, placeholder: ph, value: header[key], oninput: (e) => { header[key] = e.target.value; redraw(); } }));

  const dl = tpl.deadline;
  const form = h('div.w-form',
    h('div.w-tpl', h('span.eyebrow', 'Letter type'), h('h2.w-tpl__t', tpl.title), h('p', rich(tpl.when)),
      h('div.chips', tpl.clauses.map((c) => refChip(c)))),

    /* on a phone the letter sits below the form — one tap to it */
    h('button.btn.btn--sm.btn--ghost.dr-jump', { type: 'button', onclick: () => view.querySelector('.w-side').scrollIntoView({ behavior: still() ? 'auto' : 'smooth' }) },
      'See the letter and the pre-flight', icon('arrow')),

    dl && dl.n ? h('fieldset.w-set.dr-clockset',
      h('legend', 'The clock'),
      h('p.dr-clockset__p', `${dl.n} ${dl.unit} from ${dl.from}.`),
      h('label.field', h('span', 'The clock started on'), clockInput),
      clock) : null,

    h('fieldset.w-set', h('legend', '1 · The facts'), tpl.fields.map(field)),
    h('fieldset.w-set', h('legend', '2 · Letter header'),
      h('div.w-grid', hField('refNo', 'Our ref. no.', 'text', '9xx'), hField('date', 'Date', 'date')),
      hField('yourRefs', 'Their letters (one per line)', 'area', 'LOT-01/SINOHYDRO-KSNS-JV/716 dated 9 March 2026'),
      hField('ourRefs', 'Our earlier letters (one per line)', 'area', 'TKV/COM/2026/696 dated 24 January 2026'),
      hField('subject', 'Subject (leave empty for the suggested one)')),
    h('details.w-set.w-more', h('summary', '3 · Signatory and addressee'),
      h('div.w-grid', hField('signName', 'Signed by', 'text', W.house.signName), hField('signTitle', 'Title', 'text', W.house.signTitle)),
      h('div.w-grid', hField('attn', 'Attn.', 'text', W.house.attn), hField('attnTitle', 'Attn. title', 'text', W.house.attnTitle)),
      hField('cc', 'CC', 'text', W.house.cc)),
    h('section.w-set', h('h3.plain__h', icon('check'), 'Before it goes'), h('ul.checklist', tpl.checklist.map((c) => h('li.is-q', h('span', rich(c)))))),
    h('details.w-set.w-more', h('summary', 'Phrase bank — tap to copy'),
      W.phrases.map((g) => h('div.phr', h('span.eyebrow', g.group),
        h('ul', g.items.map((p) => h('li', h('button.phr__b', { type: 'button', onclick: () => copy(p) }, p))))))),
  );

  const actions = h('div.w-actions',
    h('button.btn.btn--stamp', { type: 'button', onclick: () => copy(toText(current())) }, icon('copy'), 'Copy letter'),
    h('button.btn', { type: 'button', onclick: () => download(`${tpl.id}-${header.date}.doc`, toDoc(current()), 'application/msword') }, icon('download'), 'Word'),
    h('button.btn', { type: 'button', onclick: () => download(`${tpl.id}-${header.date}.txt`, toText(current())) }, icon('doc'), '.txt'),
    h('button.btn.btn--ghost', { type: 'button', onclick: () => print() }, icon('print'), 'Print'),
    h('button.btn.btn--ghost', { type: 'button', onclick: () => {
      if (!confirm('Clear this draft?')) return;
      store.update((s) => { if (s.drafts) delete s.drafts[tpl.id]; });
      location.reload();
    } }, icon('refresh'), 'Reset'));

  view.append(
    head(h('span', 'Draft: ', h('em', tpl.title.toLowerCase())), 'Fill in the facts on the left. The letter writes itself on the right in the TKV house format, and the pre-flight checks it as you go. Saved on this device as you type.'),
    h('div.w-layout', form, h('div.w-side', actions, pre, preview)));

  function current() { return compose(tpl, values, header, W.house); }

  function drawClock() {
    if (!dl || !dl.n || !header.clockFrom) { mount(clock); return; }
    const start = D.fromIso(header.clockFrom);
    const due = D.add(start, dl.n, dl.unit);
    const left = D.diffDays(D.today(), due);
    mount(clock, h(`div.dr-due${left < 0 ? '.is-late' : left <= 3 ? '.is-hot' : ''}`,
      h('div.dr-due__n', h('b', left < 0 ? 'late' : left), h('small', left < 0 ? `${-left} days ago` : left === 1 ? 'day left' : 'days left')),
      h('div', h('span.eyebrow', 'Send by'), h('b.dr-due__d', D.fmt(due)), h('small', D.weekday(due))),
      h('button.btn.btn--sm', { type: 'button', onclick: (e) => {
        store.update((s) => { s.clocks.push({ id: Date.now(), label: tpl.title, ref: tpl.clauses[0], due: D.iso(due), from: header.clockFrom }); });
        e.currentTarget.disabled = true;
        mount(e.currentTarget, icon('check'), 'Saved');
      } }, icon('clock'), 'Save clock')));
  }

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
  }

  /* the pre-flight, live */
  function runCheck() {
    const L = current();
    const text = toText(L);
    const blanks = [L.subject, ...L.body].join(' ').match(/⟦[^⟧]*⟧/g)?.length || 0;
    const reading = analyse(text, data, {});
    /* timing is the clock card's job — it knows this letter's own deadline */
    const p = preflight(text, reading, { kind: tpl.kind });
    const serious = p.issues.filter((i) => i.sev === 'high');

    mount(pre,
      h('div.dr-pre__h',
        h('span.eyebrow', 'Pre-flight'),
        h(`span.dr-pre__v.dr-pre__v--${blanks ? 'warn' : p.verdict.k}`, blanks ? `${blanks} blank${blanks > 1 ? 's' : ''} to fill` : p.verdict.t)),
      p.ceesApplies
        ? h('div.dr-pre__cees', p.cees.map((c) => h(`span.dr-pip.dr-pip--${c.s >= 3 ? 'good' : c.s >= 2 ? 'ok' : c.s >= 1 ? 'thin' : c.optional ? 'opt' : 'none'}`,
          { title: `${c.name}: ${c.missing.join('; ') || 'present'}${c.optional && c.s < 3 ? ' — can follow with the detailed claim' : ''}` },
          h('b', c.k), h('small', c.name))))
        : null,
      h('ul.dr-pre__l',
        h(`li${blanks ? '.is-open' : '.is-done'}`, h('span', blanks ? `${blanks} fact${blanks > 1 ? 's' : ''} still to fill in` : 'Every fact filled in')),
        h(`li${header.refNo ? '.is-done' : '.is-open'}`, h('span', header.refNo ? `Reference ${L.ourRef}` : 'Add our reference number')),
        ...serious.slice(0, 3).map((x) => h('li.is-bad', h('span', x.t))),
        ...p.issues.filter((i) => i.sev !== 'high').slice(0, 2).map((x) => h('li.is-open', h('span', x.t))),
        p.weak.length ? h('li.is-open', h('span', `${p.weak.length} word${p.weak.length > 1 ? 's' : ''} carrying no weight — ${[...new Set(p.weak.map((w) => w.found.toLowerCase()))].slice(0, 3).join(', ')}`)) : null),
      h('button.btn.btn--sm.btn--ghost.dr-pre__go', { type: 'button', onclick: () => {
        sessionStorage.setItem('registry:check', text);
        sessionStorage.setItem('registry:check-kind', tpl.kind);
        location.hash = '/tools/letter-check?mode=mine';
      } }, 'Full check of this draft', icon('arrow')));
  }

  drawPreview();
  drawClock();
  runCheck();
}
