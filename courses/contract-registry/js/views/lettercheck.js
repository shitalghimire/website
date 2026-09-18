/* ═══════════════════════════════════════════════════════════════
   Letter check — a tool.

   Two different jobs, kept apart:
   · THEY SENT IT  — what is this letter doing to me? The clocks it
                     starts, what it relies on, and how to answer.
   · I'M SENDING IT — will it survive the Engineer? CEES, the notice
                     wording, the subject line, the known traps, the
                     red pen, and the days since the event.

   Everything runs in this browser. Nothing is uploaded or stored.
   ═══════════════════════════════════════════════════════════════ */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { reveal, still } from '../lib/motion.js';
import * as D from '../lib/dates.js';
import C from '../engine/contract.js';
import { analyse } from '../engine/reader.js';
import { preflight } from '../engine/check.js';
import { dirLabel } from '../engine/search.js';
import { head, rich, refChip, stamp, sec } from './ui.js';

/* ── practice letters ─────────────────────────────────────────── */
const THEIRS = [
  {
    label: 'A determination with a time bar',
    text: `LOT-01/SINOHYDRO-KSNS-JV/9001                                   12 August 2026
Attn: Project Manager, SINOHYDRO-KSNS JV

Subject: Engineer's Determination on Contractor's Claim for Delay at Spillway Outlet Access

References:
1. Contractor's Letter Ref. TKV/COM/2026/9001 dated 21 July 2026
2. Engineer's Letter Ref. LOT-01/SINOHYDRO-KSNS-JV/9000 dated 9 March 2026

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
    text: `LOT-01/SINOHYDRO-KSNS-JV/9002                                   3 September 2026

Subject: Review of Headpond Spillway Chute Structural Design — Returned for Correction (RFC)

Reference: Contractor's Letter Ref. TKV/COM/2026/9002 dated 14 August 2026

Dear Sir,

The Engineer has reviewed the submitted design report and drawings. The submission is classified as "Returned for Correction (RFC)".

The Contractor is instructed to increase the chute wall thickness from 400 mm to 600 mm and to adopt a design flood of 1:1000 years instead of the 1:200 years used in the report, and to resubmit within 14 days.

Please note that any delay arising from resubmission shall be at the Contractor's risk under Sub-Clause 27.8, and in accordance with Sub-Clause 8.3 [Advance Warning] the Contractor should have foreseen these requirements. Works on the chute shall not commence until approval.

Best Regards
Team Leader/Project Manager`,
  },
  {
    label: 'Non-compliance and withheld payment',
    text: `LOT-01/SINOHYDRO-KSNS-JV/9003                                   9 September 2026

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

const MINE = [
  {
    label: 'A weak notice — spot everything wrong',
    event: '2026-07-28',
    text: `Our ref.: TKV/COM/2026/9003                                   Date: 24 August 2026

To The Engineer, DOLSAR CSPDR JV

Subject: Regarding the Road Problem

Dear Sir,

As you are aware, due to unprecedented monsoon conditions the access road has suffered severe and extensive damage, and the Contractor has faced significant disruption to its logistics for a long time.

The Contractor believes this is a Force Majeure event, as "Force Majeure means an exceptional event or circumstance, natural disaster such as earthquake, fire, excessive rainfall, flood and landslide".

It is the Contractor's intention to issue notice under Sub-Clause 68.1 and the Contractor reserves the right to claim for considerable additional costs in due course under Sub-Clause 34.

Yours sincerely,
Project Manager`,
  },
  {
    label: 'A strong notice — what good looks like',
    event: '2026-07-28',
    text: `Our ref.: TKV/COM/2026/9004                                   Date: 4 August 2026

To The Engineer, DOLSAR CSPDR JV

Subject: Notice of Claim under Sub-Clause 35.1, Extension of Time under Sub-Clause 42.1 and Notice of Force Majeure under Sub-Clause 68.1 — Jhamarsi Khola Access Road Cut by Landslide

Dear Sir,

The Contractor hereby gives notice under Sub-Clause 35.1, Particular Conditions Sub-Clause 42.1 and Sub-Clause 68.1 of the following event.

On 28 July 2026, rainfall of 412 mm in 72 hours caused a landslide that cut the Jhamarsi Khola access road at chainage 4+300. The road has been impassable to all vehicles since that date (Exhibit 1: photographs dated 28 and 29 July 2026; Exhibit 2: District Road Office closure notice with certified translation).

Cement stock at site was 1,840 bags on 28 July against consumption of 310 bags per day, and was exhausted on 3 August (Exhibit 3: site stock register). Tunnel drive activities A2-EXC-120 to A2-EXC-180 stopped on 4 August. These activities have no float in the accepted programme, so Milestone 2 is affected day for day.

The Contractor considers this an exceptional event under Particular Conditions Sub-Clause 67.1(f) and is entitled to an extension of time. The Contractor has considered Sub-Clause 63.6: the stock held exceeded the six days of consumption the Contract anticipates for rainy-season interruption, and this closure has exceeded that period (Exhibit 4: DHM rainfall data with the 25-year series).

The effect is continuing. The Contractor will submit a fully detailed claim under Sub-Clause 35.7, with interim claims at monthly intervals, and reserves its rights to an extension of time and additional Cost.

Yours sincerely,
Project Manager
CC: Tamakoshi Jalvidhyut Company Limited`,
  },
];

const STATUS = {
  ok: ['Verified', 'ok'], amended: ['PCC changed', 'tape'], title: ['Check title', 'warn'], fidic: ['Not TKV wording', 'tape'],
  missing: ['Not in TKV', 'tape'], wrong: ['Wrong clause', 'tape'], spec: ['Spec ref', 'ink'], other: ['Other document', 'ink'],
};
const SENDER = { er: 'From the Engineer', contractor: 'From us', employer: 'From the Employer', unknown: 'Sender unclear' };

export default function letterCheck(view, { ctx, data, params }) {
  ctx.crumbs([{ label: 'Tools', href: '#/tools' }, { label: 'Letter check' }]);

  const hand = sessionStorage.getItem('registry:check');
  const handKind = sessionStorage.getItem('registry:check-kind');
  sessionStorage.removeItem('registry:check');
  sessionStorage.removeItem('registry:check-kind');
  let mode = params.get('mode') === 'mine' || hand ? 'mine' : 'theirs';

  const ta = h('textarea.clip__area', { spellcheck: 'false', value: hand || '' });
  const recv = h('input.input', { type: 'date' });
  const email = h('input', { type: 'checkbox', checked: true });
  const eventD = h('input.input', { type: 'date' });
  const results = h('div.lc-results');
  const controls = h('div.clip__controls');
  const samples = h('div.clip__samples');
  const lede = h('p.lc-lede');

  const tabs = h('div.lc-mode', { role: 'tablist' },
    tab('theirs', 'They sent it', 'What is this doing to me?', 'mail'),
    tab('mine', 'I\'m sending it', 'Will it survive the Engineer?', 'shield'));

  function tab(id, label, sub, ic) {
    return h('button.lc-tab', { type: 'button', role: 'tab', dataset: { m: id },
      onclick: () => { mode = id; paintMode(); mount(results); } },
    h('span.lc-tab__ic', icon(ic)), h('span', h('b', label), h('small', sub)));
  }

  function paintMode() {
    tabs.querySelectorAll('.lc-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.m === mode)));
    ta.placeholder = mode === 'theirs'
      ? 'Paste the letter the Engineer or the Employer sent you — from the reference line to "CC".'
      : 'Paste your draft — the notice, claim or reply you are about to send.';
    mount(lede, mode === 'theirs'
      ? 'Read an incoming letter the way it should be read: what it decides, what it relies on, which clocks it has just started, and how to answer.'
      : 'Check your own letter before it goes. The four things a claim must prove, whether it actually gives notice, whether the subject labels it, the traps TKV letters fell into, and the words carrying no weight.');
    mount(controls,
      h('button.btn.btn--stamp', { type: 'button', onclick: run }, icon('scan'), mode === 'theirs' ? 'Read it' : 'Check it'),
      mode === 'theirs'
        ? [h('label.field.clip__date', h('span', 'Received on'), recv), h('label.check', email, 'Came by email (+72 h, PCC 15.1)')]
        : h('label.field.clip__date', h('span', 'The event happened on'), eventD),
      h('span.clip__hint', h('kbd', 'Ctrl'), '+', h('kbd', 'Enter')),
      h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => { ta.value = ''; mount(results); ta.focus(); } }, icon('x'), 'Clear'));
    const list = mode === 'theirs' ? THEIRS : MINE;
    mount(samples, h('span.eyebrow', 'Practice letters'), list.map((s) => h('button.chip.chip--plain', { type: 'button', onclick: () => {
      ta.value = s.text;
      if (s.event) eventD.value = s.event;
      run();
    } }, s.label)));
  }

  function run() {
    const text = ta.value.trim();
    if (text.length < 40) { mount(results, h('div.empty', 'Paste a letter first — at least a few lines.')); return; }
    const reading = analyse(text, data, { received: recv.value ? D.fromIso(recv.value) : null, viaEmail: email.checked });
    /* a draft sent over from the desk keeps its letter type while it is unchanged */
    const kind = hand && text === hand.trim() ? handKind : null;
    if (mode === 'theirs') drawTheirs(reading);
    else drawMine(reading, preflight(text, reading, { eventDate: eventD.value ? D.fromIso(eventD.value) : null, kind }));
    reveal(results, { selector: ':scope > *', stagger: 55 });
    results.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'start' });
  }

  ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); });

  view.append(
    head(h('span', 'Letter ', h('em', 'check')), 'Two jobs, kept apart. Pick which way the letter is going.'),
    tabs,
    lede,
    h('section.clip',
      h('div.clip__board', h('div.clip__clamp', { 'aria-hidden': 'true' }), ta),
      controls,
      samples),
    results);

  paintMode();
  if (hand) run();

  /* ═══════════ THEY SENT IT ═══════════ */
  function drawTheirs(r) {
    const m = r.meta;
    const blocks = [];

    blocks.push(h('section.an-sum',
      h('div.an-sum__stamps',
        stamp(SENDER[m.sender], m.sender === 'er' ? '' : m.sender === 'contractor' ? 'ok' : 'ink', -4),
        ...r.intents.slice(0, 3).map((it, i) => h(`span.stamp.is-thunk${it.urgency === 'high' ? '.stamp--tape' : it.urgency === 'medium' ? '.stamp--warn' : '.stamp--ink'}`,
          { style: { '--rot': `${[3, -2, 5][i]}deg`, animationDelay: `${0.15 + i * 0.18}s` } }, it.label))),
      h('dl.an-sum__meta',
        m.own ? [h('dt', 'Ref.'), h('dd.mono', m.own.raw)] : null,
        m.date ? [h('dt', 'Dated'), h('dd', D.fmt(m.date))] : null,
        r.received ? [h('dt', 'Treated as received'), h('dd', D.fmt(r.received))] : null,
        m.subject ? [h('dt', 'Subject'), h('dd.an-sum__subj', m.subject)] : null)));

    if (r.clocks.length) {
      blocks.push(sec('Clocks this letter starts', 'Do not miss'));
      blocks.push(h('div.an-clocks', r.clocks.map((k) => clockCard(k, m))));
    } else if (!r.received) {
      blocks.push(h('p.lc-tip', icon('info'), h('span', 'Add the date you received it and the clocks this letter starts will be counted for you.')));
    }

    /* their mistakes are your ammunition */
    const theirWrong = r.citations.filter((c) => ['wrong', 'missing', 'fidic', 'title'].includes(c.status));
    if (theirWrong.length) {
      blocks.push(h('section.lc-ammo',
        h('div.lc-ammo__h', icon('target'), h('div', h('span.eyebrow', 'Their mistakes'), h('h3', `${theirWrong.length} reference${theirWrong.length > 1 ? 's' : ''} in this letter do${theirWrong.length > 1 ? '' : 'es'} not hold up`))),
        h('p', 'Every clause the Engineer relies on has to exist in this contract, with this wording. Where it does not, say so in the reply — it weakens the whole letter, not just that sentence.'),
        h('ul.lc-ammo__l', theirWrong.map((c) => h('li', h('b.mono', c.raws[0]), h('span', rich(c.note)))))));
    }

    blocks.push(sec('Every clause in the letter, checked', `${r.citations.length} found`));
    if (!r.citations.length) blocks.push(h('div.empty', 'No clause numbers found in this letter.'));
    else blocks.push(h('div.an-cites', r.citations.map(citeRow)));
    if (r.deletedText) blocks.push(h('p.an-alert', icon('alert'), r.deletedText));
    if (r.riskNote) blocks.push(h('p.an-alert', icon('alert'), r.riskNote));
    if (r.specs.length) blocks.push(h('div.an-specs', h('span.eyebrow', 'Technical specification references'),
      h('ul', r.specs.map((s) => h('li', h('b.mono', s.raw), ' — ', s.title ? `${s.source}: ${s.title}` : `${s.source} (check Volume 4)`)))));

    if (m.refs.length) {
      blocks.push(sec('Letters it refers to', 'From the TKV register'));
      blocks.push(h('ul.an-refs', m.refs.map((x) => h('li',
        h('span.mono.an-refs__no', x.raw),
        x.letter ? h('a', { href: `#/register?i=${x.letter.i}${x.letter.x ? '&read=letter' : ''}` }, h('b', x.letter.s), h('small', `${x.letter.d || ''} · ${dirLabel(x.letter.c)}${x.letter.x ? ' · full letter on file' : ''}`))
          : h('span.muted', 'Not in the register — may be newer than the last export')))));
    }

    if (r.topics.length) {
      blocks.push(sec('What it is about', 'Topics'));
      blocks.push(h('div.chips.an-topics', r.topics.map((tp, i) => h(`span.chip.chip--plain${i === 0 ? '.chip--stamp' : ''}`, icon(tp.icon), tp.label))));
      blocks.push(h('div.an-two',
        h('div.an-col.an-col--use', h('h3.plain__h', icon('shield'), 'Clauses you can use'),
          h('ul', r.shields.map((s) => h('li', refChip(s.ref), h('span', rich(s.why), s.cited ? h('small.muted', ' (in the letter)') : null))))),
        h('div.an-col.an-col--watch', h('h3.plain__h', icon('alert'), 'What they can rely on'),
          h('ul', r.watch.map((s) => h('li', refChip(s.ref), h('span', rich(s.why), s.cited ? h('small.muted', ' (cited)') : null)))))));
      if (r.unmentioned.length) blocks.push(h('p.an-unm', h('span.eyebrow', 'Relevant but not mentioned'),
        h('span.chips', r.unmentioned.map((k) => refChip(k, { label: `${k} ${C.titleOf(k)}` })))));
    }

    blocks.push(sec('How to answer', 'Reply plan'));
    blocks.push(h('ol.an-plan', r.plan.map((p) => h(`li.an-plan__${p.kind}`, h('span.an-plan__from', p.from), h('span', rich(p.text))))));

    const tpl = data.writing.templates.find((t) => t.id === r.template);
    if (tpl) blocks.push(h('div.an-cta',
      h('div', h('span.eyebrow', 'Suggested reply'), h('h3.an-cta__t', tpl.title), h('p.muted', tpl.when)),
      h('button.btn.btn--stamp', { type: 'button', onclick: () => handoff(r, tpl.id) }, icon('pen'), 'Draft this reply'),
      h('a.btn', { href: '#/tools/draft' }, 'Choose another type')));

    if (r.cases.length) {
      blocks.push(sec('Like this on TKV', 'Case files'));
      blocks.push(h('div.grid.grid--3', r.cases.map((k) => h('a.card.card--link.casecard', { href: `#/cases/${k.id}` },
        h('div.row', h('span.chip', k.no), h(`span.tone.tone--${k.tone}`, k.status)),
        h('h3.casecard__t', k.title), h('p.casecard__r', k.result)))));
    }

    blocks.push(sec('The letter, marked up', 'Read it again'));
    blocks.push(legend(false));
    blocks.push(h('div.an-letter', annotate(r, [])));
    mount(results, blocks);
  }

  /* ═══════════ I'M SENDING IT ═══════════ */
  function drawMine(r, p) {
    const blocks = [];

    /* the verdict */
    blocks.push(h(`section.lc-verdict.lc-verdict--${p.verdict.k}`,
      h('div.lc-verdict__stamp', stamp(p.verdict.t, p.verdict.k === 'ok' ? 'ok' : p.verdict.k === 'warn' ? 'warn' : 'tape', -4)),
      h('div',
        h('p.eyebrow', p.type === 'claim' ? (p.stage === 'detailed' ? 'A detailed claim' : 'A notice of claim') : p.type === 'notice' ? 'A formal notice' : 'A letter'),
        h('h2.lc-verdict__t', p.verdict.t),
        h('p', p.verdict.s)),
      h('div.lc-verdict__n',
        h('span', h('b', p.issues.filter((i) => i.sev === 'high').length), h('small', 'serious')),
        h('span', h('b', p.issues.filter((i) => i.sev !== 'high').length), h('small', 'to tighten')),
        h('span', h('b', p.weak.length), h('small', 'weak words')))));

    /* timing */
    if (p.timing) {
      blocks.push(sec('Was it in time?', `${p.timing.days} days after the event`));
      blocks.push(h('div.lc-bars', p.timing.bars.map((b) => h(`div.lc-bar${b.ok ? '.is-ok' : '.is-late'}`,
        h('div.lc-bar__track', { style: { '--w': `${Math.min(100, (p.timing.days / Math.max(b.n, p.timing.days)) * 100)}%`, '--mark': `${(b.n / Math.max(b.n, p.timing.days)) * 100}%` } }, h('i')),
        h('div.lc-bar__t', h('b', b.label), h('span', `${b.n} days · `, refChip(b.ref))),
        h('span.lc-bar__v', b.ok ? icon('check') : icon('x'), b.ok ? 'In time' : `${p.timing.days - b.n} days late`)))));
    } else {
      blocks.push(h('p.lc-tip', icon('clock'), h('span', 'Add the date the event happened and this will check the letter against the 15- and 21-day bars.')));
    }

    /* CEES — only a claim has to prove all four */
    if (p.ceesApplies) {
      blocks.push(sec('The four things a claim must prove', `CEES · ${p.ceesTotal} of 12`));
      blocks.push(h('div.lc-cees', p.cees.map((c, i) => h(`article.lc-c.lc-c--${c.s >= 3 ? 'good' : c.s >= 2 ? 'ok' : c.s >= 1 ? 'thin' : c.optional ? 'opt' : 'none'}`, { style: { '--i': i } },
        h('div.lc-c__top', h('span.lc-c__k', c.k), h('b', c.name), h('span.lc-c__pips', [0, 1, 2].map((n) => h(`i${n < c.s ? '.on' : ''}`)))),
        c.missing.length
          ? h('ul.lc-c__miss', c.missing.map((x) => h('li', h('span', x))))
          : h('p.lc-c__ok', icon('check'), h('span', 'Present')),
        c.optional && c.s < 3 ? h('p.lc-c__opt', 'At notice stage the records can follow with the detailed claim — but name what you hold now.') : null,
      ))));
      blocks.push(h('p.lc-note', 'A heuristic, not a verdict on the merits — it reads for the signs of each element. For what each one means, see ', h('a', { href: '#/exchange' }, 'the exchange'), '.'));
    } else {
      blocks.push(h('p.lc-tip', icon('info'), h('span', p.type === 'notice'
        ? 'This reads as a formal notice, not a claim, so it is not scored on Cause, Effect, Entitlement and Substantiation. What matters here is that it gives notice in so many words, under the right clause, in time.'
        : 'This reads as ordinary correspondence, not a notice or a claim, so the claim tests are not applied. If it is meant to protect a right, label it as a notice in the subject and say "hereby gives notice".')));
    }

    /* issues */
    if (p.issues.length) {
      blocks.push(sec('What to fix', `${p.issues.length} found`));
      blocks.push(h('div.lc-issues', p.issues.map((x) => h(`article.lc-is.lc-is--${x.sev}`,
        h('span.lc-is__ic', icon(x.sev === 'high' ? 'alert' : 'info')),
        h('div', h('h4', x.t), h('p', rich(x.s)))))));
    }
    if (p.good.length) {
      blocks.push(h('div.lc-good', h('span.eyebrow', 'Already right'), h('ul', p.good.map((g) => h('li', icon('check'), h('span', g))))));
    }

    /* clauses */
    if (r.citations.length) {
      blocks.push(sec('Every clause you cite, checked', `${r.citations.length} found`));
      blocks.push(h('div.an-cites', r.citations.map(citeRow)));
    }

    /* red pen */
    if (p.weak.length) {
      blocks.push(sec('The red pen', `${p.weak.length} word${p.weak.length > 1 ? 's' : ''} carrying no weight`));
      const uniq = [];
      for (const w of p.weak) if (!uniq.some((u) => u.w === w.w)) uniq.push(w);
      blocks.push(h('ul.lc-pen', uniq.map((w) => h('li', h('b', w.found), h('span', w.fix)))));
    }

    blocks.push(sec('Your letter, marked up', 'Read it as they will'));
    blocks.push(legend(true));
    blocks.push(h('div.an-letter', annotate(r, p.weak)));
    mount(results, blocks);
  }

  /* ── shared pieces ── */
  function clockCard(k, m) {
    const left = D.diffDays(D.today(), k.due);
    return h(`div.an-clock${left <= 3 ? '.is-hot' : ''}`,
      h('div.an-clock__ring', h('b', left < 0 ? 'late' : left), h('small', left < 0 ? `${-left}d ago` : 'days left')),
      h('div.an-clock__body',
        h('b', k.label[0].toUpperCase() + k.label.slice(1)),
        h('span', `${k.n} ${k.unit} → ${D.fmt(k.due)}`, k.ref !== '—' ? [' · ', refChip(k.ref)] : null),
        h('small', k.why)),
      h('button.btn.btn--sm', { type: 'button', onclick: (e) => {
        store.update((s) => { s.clocks.push({ id: Date.now(), label: k.label, ref: k.ref, due: D.iso(k.due), from: m.subject || m.own?.raw || 'Checked letter' }); });
        e.currentTarget.disabled = true;
        mount(e.currentTarget, icon('check'), 'Saved');
      } }, icon('clock'), 'Save'));
  }

  function citeRow(c) {
    const st = c.status === 'ok' && c.amended ? 'amended' : c.status;
    const [label, kind] = STATUS[st];
    const res = C.resolve(c.key) || C.resolve(c.ref);
    const line = res ? C.firstLine(c.key) : '';
    return h(`div.an-cite.an-cite--${st}`,
      h('div.an-cite__head',
        h('span.an-cite__raw.mono', c.raws[0]),
        c.hits > 1 ? h('small.muted', `×${c.hits}`) : null,
        h('span.an-cite__title', c.tkvTitle ? [h('b', c.key), ' ', c.tkvTitle] : h('b', c.key)),
        stamp(label, kind, -2)),
      c.note ? h('p.an-cite__note', rich(c.note)) : null,
      c.quotedTitles.length ? h('p.an-cite__quoted', 'The letter calls it: ', c.quotedTitles.map((q) => h('q', q))) : null,
      res && st !== 'spec' && st !== 'other' && st !== 'missing' ? h('details.an-cite__more',
        h('summary', 'What this contract actually says'),
        h('div',
          res.clause.plain?.gist ? h('p.an-cite__gist', rich(res.clause.plain.gist)) : null,
          h('p.an-cite__text', line.slice(0, 520) + (line.length > 520 ? '…' : '')),
          h('a.btn.btn--sm', { href: C.hrefOf(c.key) }, 'Open ', c.key, icon('arrow')))) : null);
  }

  function legend(withPen) {
    return h('div.lc-legend',
      h('span', h('i.mk.mk--cite.mk--ok', '35.1'), 'Clause checks out'),
      h('span', h('i.mk.mk--cite.mk--amended', '67.1'), 'Changed by the PCC'),
      h('span', h('i.mk.mk--cite.mk--wrong', '34'), 'Does not check out'),
      h('span', h('i.mk.mk--cite.mk--spec', '5.4'), 'Specification, not the contract'),
      h('span', h('i.mk.mk--intent', 'hereby'), 'What the letter is doing'),
      withPen ? h('span', h('i.mk.mk--weak', 'severe'), 'Carries no weight') : null);
  }

  /* marks from the reader, plus the red pen when checking our own letter */
  function annotate(r, weak) {
    const t = r.text;
    const marks = [...r.marks, ...weak.map((w) => ({ start: w.at, end: w.at + w.len, kind: 'weak', fix: w.fix }))]
      .sort((a, b) => a.start - b.start || b.end - a.end);
    const nodes = [];
    let pos = 0;
    for (const mk of marks) {
      if (mk.start < pos) continue;
      if (mk.start > pos) nodes.push(t.slice(pos, mk.start));
      const s = t.slice(mk.start, mk.end);
      if (mk.kind === 'cite') {
        const c = r.citations.find((x) => x.id === mk.id);
        const st = c ? (c.status === 'ok' && c.amended ? 'amended' : c.status) : 'ok';
        nodes.push(C.resolve(mk.key) && st !== 'spec' && st !== 'other'
          ? h(`a.mk.mk--cite.mk--${st}`, { href: C.hrefOf(mk.key), title: c?.note || C.titleOf(mk.key) }, s)
          : h(`span.mk.mk--cite.mk--${st}`, { title: c?.note || '' }, s));
      } else if (mk.kind === 'intent') nodes.push(h('mark.mk.mk--intent', s));
      else if (mk.kind === 'letter') nodes.push(h('span.mk.mk--letter', s));
      else if (mk.kind === 'weak') nodes.push(h('span.mk.mk--weak', { title: mk.fix }, s));
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
    }));
    location.hash = `/tools/draft/${tplId}`;
  }
}
