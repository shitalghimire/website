/* Analyse a letter — the paste-and-understand desk */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import * as D from '../lib/dates.js';
import C from '../engine/contract.js';
import { analyse } from '../engine/reader.js';
import { dirLabel } from '../engine/search.js';
import { head, rich, refChip, stamp, sec } from './ui.js';

const SAMPLES = [
  {
    label: 'A determination with a time bar',
    text: `LOT-01/SINOHYDRO-KSNS-JV/9xx                                   12 August 2026
Attn: Project Manager, SINOHYDRO-KSNS JV

Subject: Engineer's Determination on Contractor's Claim for Delay at Spillway Outlet Access

References:
1. Contractor's Letter Ref. TKV/COM/2026/9xx dated 21 July 2026
2. Engineer's Letter Ref. LOT-01/SINOHYDRO-KSNS-JV/716 dated 9 March 2026

Dear Sir,

We refer to your letter Ref. [1] claiming an extension of time of 64 days and additional payment of NPR 12,450,000.00 for delayed access to the Spillway Outlet area.

The Contractor became aware of the restriction on 2 June 2026 but gave notice only on 21 July 2026. Under Sub-Clause 35.1 notice must be given not later than 21 days after awareness, and Sub-Clause 35.2 applies. The claim is therefore time-barred and the Employer is discharged from liability.

Without prejudice, the Engineer also notes that no Time Impact Analysis was provided under Sub-Clause 41.2, and no contemporary records under Sub-Clause 35.6. Access routes remain the Contractor's responsibility under Sub-Clause 31.2 and Sub-Clause 4.12 [Unforeseeable Physical Conditions].

Accordingly, pursuant to Sub-Clause 32.1 and Sub-Clause 32.3, the Engineer hereby determines: Extension of Time — nil; additional payment — NPR 0.00.

Best Regards
Team Leader/Project Manager
CC: Tamakoshi Jalvidhyut Company Limited`,
  },
  {
    label: 'Review comments that change the design',
    text: `LOT-01/SINOHYDRO-KSNS-JV/9xx                                   3 September 2026

Subject: Review of Headpond Spillway Chute Structural Design — Returned for Correction (RFC)

Reference: Contractor's Letter Ref. TKV/COM/2026/9xx dated 14 August 2026

Dear Sir,

The Engineer has reviewed the submitted design report and drawings. The submission is classified as "Returned for Correction (RFC)".

The Contractor is instructed to increase the chute wall thickness from 400 mm to 600 mm and to adopt a design flood of 1:1000 years instead of the 1:200 years used in the report, and to resubmit within 14 days.

Please note that any delay arising from resubmission shall be at the Contractor's risk under Sub-Clause 27.8, and in accordance with Sub-Clause 8.3 [Advance Warning] the Contractor should have foreseen these requirements. Works on the chute shall not commence until approval.

We are available for any clarification you may require.

Best Regards
Team Leader/Project Manager`,
  },
  {
    label: 'Non-compliance and withheld payment',
    text: `LOT-01/SINOHYDRO-KSNS-JV/9xx                                   9 September 2026

Subject: Notice of Non-Compliance — Batching Plant Calibration and Withholding of Payment

Dear Sir,

During the inspection of 5 September 2026 the Engineer observed that the batching plant at Adit-2 has not been calibrated as required by Technical Specification Sub-Clause 11.15. This is a breach of the Contract.

You are hereby instructed to stop all structural concrete placement at Adit-2 immediately and to submit the calibration certificates within 7 days.

Further, an amount of NPR 2,000,000.00 will be deducted from Interim Payment Certificate No. 15 until compliance is demonstrated, and the Employer reserves the right to claim liquidated damages under Sub-Clause 61.2.

Best Regards
Team Leader/Project Manager
CC: Tamakoshi Jalvidhyut Company Limited`,
  },
];

const STATUS = {
  ok: ['Verified', 'ok'], amended: ['PCC changed', 'tape'], title: ['Check title', 'warn'], fidic: ['Not TKV wording', 'tape'],
  missing: ['Not in TKV', 'tape'], wrong: ['Wrong clause', 'tape'], spec: ['Spec ref', 'ink'],
};
const SENDER = { er: 'From the Engineer', contractor: 'From us', employer: 'From the Employer', unknown: 'Sender unclear' };

export default function analyseView(view, { ctx, data, params }) {
  ctx.crumbs([{ label: 'Analyse a letter' }]);
  const hand = sessionStorage.getItem('registry:analyse');
  const ta = h('textarea.clip__area', { placeholder: 'Paste the whole letter here — from the reference line to "CC". Scanned PDFs: copy the text or use your OCR text.', spellcheck: 'false', value: hand || '' });
  sessionStorage.removeItem('registry:analyse');
  const recv = h('input.input', { type: 'date', title: 'Date you received it (optional)' });
  const email = h('input', { type: 'checkbox', checked: true });
  const results = h('div.an-results');

  const run = () => {
    const text = ta.value.trim();
    if (text.length < 40) { mount(results, h('div.empty', 'Paste a letter first — at least a few lines.')); return; }
    const res = analyse(text, data, { received: recv.value ? D.fromIso(recv.value) : null, viaEmail: email.checked });
    draw(res);
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  view.append(
    head(h('span', 'Analyse a ', h('em', 'letter')), 'Paste any letter — from the Engineer, the Employer, or your own draft. The Registry checks every clause against the real TKV text, spots what the letter is doing to you, starts the clocks, and plans the reply. It all runs in this browser; nothing is uploaded.'),
    h('section.clip',
      h('div.clip__board',
        h('div.clip__clamp', { 'aria-hidden': 'true' }),
        ta),
      h('div.clip__controls',
        h('button.btn.btn--stamp', { type: 'button', onclick: run }, icon('scan'), 'Analyse'),
        h('label.field.clip__date', h('span', 'Received on'), recv),
        h('label.check', email, 'Came by email (+72 h, PCC 15.1)'),
        h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => { ta.value = ''; mount(results); ta.focus(); } }, icon('x'), 'Clear')),
      h('div.clip__samples', h('span.eyebrow', 'Or try a practice letter'), SAMPLES.map((s) => h('button.chip.chip--plain', { type: 'button', onclick: () => { ta.value = s.text; run(); } }, s.label)))),
    results);

  ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); });

  function draw(r) {
    const m = r.meta;
    const blocks = [];

    /* summary */
    blocks.push(h('section.an-sum',
      h('div.an-sum__stamps',
        stamp(SENDER[m.sender], m.sender === 'er' ? '' : m.sender === 'contractor' ? 'ok' : 'ink', -4),
        ...r.intents.slice(0, 3).map((it, i) => h(`span.stamp.is-thunk${it.urgency === 'high' ? '.stamp--tape' : it.urgency === 'medium' ? '.stamp--warn' : '.stamp--ink'}`, { style: { '--rot': `${[3, -2, 5][i]}deg`, animationDelay: `${.15 + i * .18}s` } }, it.label))),
      h('dl.an-sum__meta',
        m.own ? [h('dt', 'Ref.'), h('dd.mono', m.own.raw)] : null,
        m.date ? [h('dt', 'Dated'), h('dd', D.fmt(m.date))] : null,
        r.received ? [h('dt', 'Treated as received'), h('dd', D.fmt(r.received))] : null,
        m.subject ? [h('dt', 'Subject'), h('dd.an-sum__subj', m.subject)] : null)));

    /* clocks */
    if (r.clocks.length) {
      blocks.push(sec('Clocks this letter starts', 'Do not miss'));
      blocks.push(h('div.an-clocks', r.clocks.map((k) => {
        const left = D.diffDays(D.today(), k.due);
        return h(`div.an-clock${left <= 3 ? '.is-hot' : ''}`,
          h('div.an-clock__ring', h('b', left < 0 ? 'late' : left), h('small', left < 0 ? `${-left}d ago` : 'days left')),
          h('div.an-clock__body', h('b', k.label[0].toUpperCase() + k.label.slice(1)), h('span', `${k.n} ${k.unit} → ${D.fmt(k.due)}`, k.ref !== '—' ? [' · ', refChip(k.ref)] : null), h('small', k.why)),
          h('button.btn.btn--sm', { type: 'button', onclick: (e) => { store.update((s) => { s.clocks.push({ id: Date.now(), label: k.label, ref: k.ref, due: D.iso(k.due), from: m.subject || m.own?.raw || 'Analysed letter' }); }); e.currentTarget.disabled = true; e.currentTarget.textContent = 'Saved'; } }, icon('clock'), 'Save'));
      })));
    }

    /* clause check */
    blocks.push(sec('Every clause in the letter, checked', `${r.citations.length} found`));
    if (!r.citations.length) blocks.push(h('div.empty', 'No clause numbers found in this letter.'));
    else blocks.push(h('div.an-cites', r.citations.map((c) => citeRow(c))));
    if (r.deletedText) blocks.push(h('p.an-alert', icon('alert'), r.deletedText));
    if (r.riskNote) blocks.push(h('p.an-alert', icon('alert'), r.riskNote));
    if (r.specs.length) blocks.push(h('div.an-specs', h('span.eyebrow', 'Technical specification references'), h('ul', r.specs.map((s) => h('li', h('b.mono', s.raw), ' — ', s.title ? `${s.source}: ${s.title}` : `${s.source} (check Volume 4)`)))));

    /* letters referenced */
    if (m.refs.length) {
      blocks.push(sec('Letters it refers to', 'From the TKV register'));
      blocks.push(h('ul.an-refs', m.refs.map((x) => h('li',
        h('span.mono.an-refs__no', x.raw),
        x.letter ? h('a', { href: `#/register?i=${x.letter.i}` }, h('b', x.letter.s), h('small', `${x.letter.d || ''} · ${dirLabel(x.letter.c)}`)) : h('span.muted', 'Not in the register (may be newer than the last export)')))));
    }

    /* topics + shields/watch */
    if (r.topics.length) {
      blocks.push(sec('What it is about', 'Topics'));
      blocks.push(h('div.chips.an-topics', r.topics.map((tp, i) => h(`span.chip.chip--plain${i === 0 ? '.chip--stamp' : ''}`, icon(tp.icon), tp.label))));
      blocks.push(h('div.an-two',
        h('div.an-col.an-col--use', h('h3.plain__h', icon('shield'), 'Clauses you can use'), h('ul', r.shields.map((s) => h('li', refChip(s.ref), h('span', rich(s.why)), s.cited ? h('small.muted', ' (in the letter)') : null)))),
        h('div.an-col.an-col--watch', h('h3.plain__h', icon('alert'), 'What they can rely on'), h('ul', r.watch.map((s) => h('li', refChip(s.ref), h('span', rich(s.why)), s.cited ? h('small.muted', ' (cited)') : null))))));
      if (r.unmentioned.length) blocks.push(h('p.an-unm', h('span.eyebrow', 'Relevant but not mentioned'), h('span.chips', r.unmentioned.map((k) => refChip(k, { label: `${k} ${C.titleOf(k)}` })))));
    }

    /* plan */
    blocks.push(sec('How to answer', 'Reply plan'));
    blocks.push(h('ol.an-plan', r.plan.map((p) => h(`li.an-plan__${p.kind}`, h('span.an-plan__from', p.from), h('span', rich(p.text))))));
    const tpl = data.writing.templates.find((t) => t.id === r.template);
    blocks.push(h('div.an-cta',
      h('div', h('span.eyebrow', 'Suggested letter'), h('h3.an-cta__t', tpl.title), h('p.muted', tpl.when)),
      h('button.btn.btn--stamp', { type: 'button', onclick: () => handoff(r, tpl.id) }, icon('pen'), 'Draft this reply'),
      h('a.btn', { href: '#/write' }, 'Choose another type')));

    if (r.cases.length) {
      blocks.push(sec('Like this on TKV', 'Case files'));
      blocks.push(h('div.grid.grid--3', r.cases.map((k) => h('a.card.card--link.casecard', { href: `#/cases/${k.id}` }, h('div.row', h('span.chip', k.no), h(`span.tone.tone--${k.tone}`, k.status)), h('h3.casecard__t', k.title), h('p.casecard__r', k.result)))));
    }

    /* annotated letter */
    blocks.push(sec('The letter, marked up', 'Read it again'));
    blocks.push(h('div.an-letter', annotate(r)));
    blocks.push(h('div.row.an-save',
      h('button.btn.btn--sm', { type: 'button', onclick: (e) => { store.update((s) => { s.analyses.unshift({ at: Date.now(), subject: m.subject, ref: m.own?.raw, date: m.date ? D.iso(m.date) : null, intents: r.intents.map((i) => i.label), topics: r.topics.map((t) => t.label) }); s.analyses = s.analyses.slice(0, 30); }); e.currentTarget.disabled = true; e.currentTarget.textContent = 'Saved to history'; } }, icon('star'), 'Save summary (without the letter text)')));

    mount(results, blocks);
  }

  function citeRow(c) {
    const st = c.status === 'ok' && c.amended ? 'amended' : c.status;
    const [label, kind] = STATUS[st];
    const r = C.resolve(c.key) || C.resolve(c.ref);
    const det = h('details.an-cite__more',
      h('summary', 'What TKV actually says'),
      r ? h('div', r.clause.plain?.gist ? h('p.an-cite__gist', rich(r.clause.plain.gist)) : null, h('p.an-cite__text', C.firstLine(c.key).slice(0, 520) + (C.firstLine(c.key).length > 520 ? '…' : '')), h('a.btn.btn--sm', { href: C.hrefOf(c.key) }, 'Open ', c.key, icon('arrow'))) : h('p.muted', 'No such clause.'));
    return h(`div.an-cite.an-cite--${st}`,
      h('div.an-cite__head',
        h('span.an-cite__raw.mono', c.raws[0]),
        c.hits > 1 ? h('small.muted', `×${c.hits}`) : null,
        h('span.an-cite__title', c.tkvTitle ? [h('b', c.key), ' ', c.tkvTitle] : h('b', c.key)),
        stamp(label, kind, -2)),
      c.note ? h('p.an-cite__note', rich(c.note)) : null,
      c.quotedTitles.length ? h('p.an-cite__quoted', 'Letter calls it: ', c.quotedTitles.map((q) => h('q', q))) : null,
      st !== 'spec' && st !== 'missing' ? det : null);
  }

  function annotate(r) {
    const t = r.text;
    const nodes = [];
    let pos = 0;
    for (const mk of r.marks) {
      if (mk.start < pos) continue;
      if (mk.start > pos) nodes.push(t.slice(pos, mk.start));
      const s = t.slice(mk.start, mk.end);
      if (mk.kind === 'cite') {
        const c = r.citations.find((x) => x.key === mk.key);
        const st = c ? (c.status === 'ok' && c.amended ? 'amended' : c.status) : 'ok';
        nodes.push(C.resolve(mk.key) ? h(`a.mk.mk--cite.mk--${st}`, { href: C.hrefOf(mk.key), title: c?.note || C.titleOf(mk.key) }, s) : h(`span.mk.mk--cite.mk--${st}`, { title: c?.note || '' }, s));
      } else if (mk.kind === 'intent') nodes.push(h('mark.mk.mk--intent', s));
      else if (mk.kind === 'letter') nodes.push(h('span.mk.mk--letter', s));
      else nodes.push(h('span.mk.mk--spec', s));
      pos = mk.end;
    }
    nodes.push(t.slice(pos));
    return nodes;
  }

  function handoff(r, tplId) {
    const m = r.meta;
    sessionStorage.setItem('registry:handoff', JSON.stringify({
      template: tplId,
      theirRef: m.own?.raw || '', theirDate: m.date ? D.iso(m.date) : '', subject: m.subject || '',
      refs: m.refs.map((x) => x.raw), received: r.received ? D.iso(r.received) : '',
      cited: r.citations.filter((c) => c.status === 'ok').map((c) => c.key),
    }));
    location.hash = `/write/${tplId}`;
  }

  if (hand) run();
  if (params.get('sample')) { ta.value = SAMPLES[+params.get('sample')]?.text || ''; run(); }
}
