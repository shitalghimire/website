/* ═══════════════════════════════════════════════════════════════
   THE EOT — how an extension of time is actually submitted.

   Built from the real EOT-01 file on TKV: the Contractor's claim of
   525 days (January 2026), the Engineer's 130-page Evaluation and
   Determination (letter 716, March 2026), and the resubmitted claim
   of 587 days and USD 7,379,383.27 (June 2026) with the Engineer's
   seven deficiencies in letter 886 of 15 July 2026.
   ═══════════════════════════════════════════════════════════════ */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { reveal, countWhenSeen } from '../lib/motion.js';
import { rich, refChip, sec } from './ui.js';

/* ── what every EOT has to prove ────────────────────────────────── */
const GATES = [
  { n: 1, t: 'The cause', q: 'What happened, exactly?', s: 'A dated, specific event. Not "monsoon disruption" — "the Jhamarsi Khola road was cut by a landslide on 28 July 2024 and reopened on 11 September 2024".', fail: 'Vague events cannot be tested, so they are rejected without anyone deciding whether they were real.' },
  { n: 2, t: 'The liability', q: 'Whose risk is it under this contract?', s: 'Point at the clause that puts the risk on the Employer — 35.4 Compensation Events, 30.3 late possession, 10.1(a) permits, PCC 67.1 Force Majeure.', fail: 'On TKV, half the events failed here. Contractor-initiated relocations and monsoon access were the Contractor\'s own risk from the day the contract was signed.' },
  { n: 3, t: 'The notice', q: 'Did you tell them in time, in the right form?', s: 'A labelled notice under 35.1 within 21 days, and under PCC 42.1 within 15. Raised in a meeting does not count. Mentioned in a progress report does not count.', fail: 'The TCA events were struck out as time-barred: "no valid contractual notice; claim treated as time-barred".' },
  { n: 4, t: 'The critical path', q: 'Did it actually push the finish out?', s: 'Show the event moving the completion date in an accepted programme. An activity with float can be delayed for weeks and change nothing.', fail: 'This is the gate that needs a baseline. Without an accepted one, the Engineer could not validate a single critical-path assertion.' },
  { n: 5, t: 'The records', q: 'Can you prove it, from papers written at the time?', s: 'Daily logs, photographs, delivery notes, payroll, plant returns, the site diary. Written on the day, not reconstructed for the claim.', fail: 'Cost failed everywhere on TKV because idle, non-redeployable resources were asserted rather than proved.' },
];

/* ── the three volumes ──────────────────────────────────────────── */
const VOLUMES = [
  { v: 'I', t: 'The application', s: 'The narrative case. What happened, when, under which clause, what you are asking for, and the notice history that keeps it alive.',
    has: ['Event-by-event chronology with dates', 'The contractual basis for each event', 'Every notice reference and its date', 'The relief sought — days and money, stated once and clearly'] },
  { v: 'II', t: 'The delay analysis', s: 'The schedule proof. This is the volume that decides whether you get days, and it is the one that is usually thin.',
    has: ['The accepted baseline programme', 'An updated programme before and after every analysis window, in PDF and native P6 .XER', 'A longest-path analysis for each, before and after', 'A fragnet for each event, showing the modelled impact', 'Out-of-sequence progress corrected or justified, with the scheduling logs', 'Concurrency and apportionment, window by window'] },
  { v: 'III', t: 'The prolongation cost', s: 'The money. Time-related cost actually incurred because of compensable delay on the critical path — not a daily rate multiplied by the days claimed.',
    has: ['Cost built event by event, not as one average', 'Payroll records for the people who stood idle', 'Equipment schedules showing what could not be redeployed', 'Site overhead accounts for the extended period', 'Invoices, allocated to each event and window', 'All of it in editable Excel, not a locked PDF'] },
];

/* ── the twelve delay events, as determined ─────────────────────── */
const EVENTS = [
  { n: 1, t: 'Land acquisition and tree-cutting works', got: '228 days', tone: 'part', why: 'Permit-related lawful-access restraint accepted in principle. Time assessed only by provisional milestone screening. No substantiated idle resources, so nil cost.', basis: ['30.1', '30.3', '35.4'] },
  { n: 2, t: 'Damage to the Adit-1 access road', got: 'Nothing', tone: 'no', why: 'Access-road maintenance risk remained with the Contractor.', basis: ['24.2'] },
  { n: 3, t: 'Road blockage — landslide at Jhamarsi Khola', got: 'Nothing', tone: 'no', why: 'Sub-Clause 63.6 puts rainy-season access problems and material shortage on the Contractor. It applies even if the event meets the Force Majeure test.', basis: ['63.6', '67.1'] },
  { n: 4, t: 'Work stoppage by Bigu Rural Municipality and local residents', got: 'Nothing', tone: 'no', why: 'Clause 35 proof requirements not met — no compliant notice trail, no critical-path evidence.', basis: ['35.1', '35.7'] },
  { n: 5, t: 'Location change of the crusher plant, BP1 to Gongar', got: 'Nothing', tone: 'no', why: 'Contractor-initiated relocation. Once you propose the move, you own its consequences.', basis: ['10.1', '53', '24.2'] },
  { n: 6, t: 'Work stoppage at the Gongar crusher, Adit-1 and the knock-on to Adit-2', got: 'Nothing', tone: 'no', why: 'Rejected, and reaffirmed twice in later letters. Proof requirements under Clause 35 not met.', basis: ['35.1'] },
  { n: 7, t: 'Relocation of the MAT and CVT portals', got: 'Nothing', tone: 'no', why: 'Design responsibility sits with the Contractor under Clause 27 on an EPC contract.', basis: ['27'] },
  { n: 8, t: 'Delay in issuing explosive procurement permits', got: 'Nothing', tone: 'no', why: 'No proven critical delay on the record before the Engineer.', basis: ['35.10'] },
  { n: 9, t: 'Supply-chain disruption — GLOF and monsoon flooding', got: 'Nothing', tone: 'no', why: 'Logistics planning is the Contractor\'s responsibility, and the Contract anticipated monsoon interruption.', basis: ['63.6'] },
  { n: 10, t: 'The Employer\'s instruction to suspend the works', got: 'Nothing', tone: 'no', why: 'Rejected on the record reviewed — the delay impact was not substantiated against a programme.', basis: ['44.1'] },
  { n: 11, t: 'Political insurrection, curfew and the explosives suspension', got: 'Nothing', tone: 'no', why: 'No substantiated delay impact. The Nepali-language orders were not certified translations.', basis: ['67.1', '3.4'] },
  { n: 12, t: 'Interface delays — Transformer Cavern and Powerhouse Cavern', got: 'Nothing', tone: 'no', why: 'Interface coordination under SCC 17.1 was the Contractor\'s to manage.', basis: ['17.1'] },
];

/* ── letter 886: why the resubmission could not be assessed ─────── */
const GAPS886 = [
  { n: 1, t: 'The updated programmes for each window are missing', want: 'The programme immediately before and immediately after every analysis window — in PDF and in native Primavera .XER, sent through document control, not as a download link.', why: 'Without them nobody can check the data dates, the logic or the forecast completion that each impacted programme was built from. The analysis is unverifiable, which is not the same as wrong — but it has the same effect.', ic: 'gantt' },
  { n: 2, t: 'No longest-path analysis', want: 'The longest path through each impacted programme, before the window opens and after it closes.', why: 'The critical path moves. If you cannot show how it moved across the window, you cannot show that your event was on it when it mattered.', ic: 'bolt' },
  { n: 3, t: 'Out-of-sequence progress left unfixed', want: 'Correct the out-of-sequence activities, or justify each one you keep — with the scheduling logs.', why: 'Out-of-sequence progress means work was recorded as done before its predecessor finished. P6 then calculates dates from logic that did not happen, and every forecast downstream is unreliable.', ic: 'refresh' },
  { n: 4, t: 'No mitigation shown', want: 'For each event: what you did or proposed to reduce the delay, and what effect it had on the programme.', why: 'You are under a continuing duty to proceed with due expedition and use all reasonable endeavours to prevent delay. An analysis that ignores mitigation overstates the impact — and the Engineer will say so.', ic: 'shield' },
  { n: 5, t: '587 days presented as one lump', want: 'Split the days between Employer-risk, Contractor-culpable and neutral events; analyse concurrency inside each window; and trace each milestone\'s slippage to the specific events that caused it.', why: 'This is the single biggest weakness. A cumulative figure asks the Engineer to accept that every one of the 587 days is compensable. Apportion it yourself and the credible part survives.', ic: 'scale' },
  { n: 6, t: 'The cut-off dates contradict each other', want: 'Reconcile the data date of the analysis (27 March 2026) with the event cut-off (8 March 2026).', why: 'Two different dates for the same submission puts the integrity of the whole Time Impact Analysis in question — over what is probably a typing error.', ic: 'clock' },
  { n: 7, t: 'The cost is an average, not a calculation', want: 'A quantum analysis for each delay event, in editable Excel, backed by payroll, equipment schedules, site overhead accounts and invoices, allocated to each event and window.', why: 'USD 7,379,383.27 divided by the claimed period is about USD 12,571 a day. A global daily rate proves no causal link between any one event and any one rupee, so none of it can be assessed.', ic: 'coin' },
];

/* ── the checklist ──────────────────────────────────────────────── */
const READY = [
  'An accepted baseline programme exists, in writing, under Clause 41.',
  'Every event has a labelled notice inside 15 days (PCC 42.1) and 21 days (35.1), with the letter number to hand.',
  'Updated programmes saved at every window boundary, kept as .XER files as well as PDFs.',
  'A fragnet built for each event, inserted into the programme current at that time.',
  'Longest path printed before and after each window.',
  'Out-of-sequence activities cleaned up, and the scheduling log kept.',
  'Concurrency examined window by window and written down, including where it goes against you.',
  'Days apportioned: Employer-risk, Contractor-culpable, neutral.',
  'Each milestone\'s slippage traced to the events that caused it.',
  'Mitigation recorded for every event — what you tried, and what it saved.',
  'Cost built event by event from payroll, plant returns, overhead accounts and invoices.',
  'One data date, one event cut-off, and they agree.',
  'Everything transmitted through document control, referenced and dated.',
];

export default function eot(view, { ctx }) {
  ctx.crumbs([{ label: 'Case files', href: '#/cases' }, { label: 'The EOT' }]);

  view.append(
    hero(),

    sec('What you are actually asking for', 'Plain words'),
    whatIsIt(),

    sec('The five things every event has to prove', 'The Engineer\'s test'),
    gates(),

    sec('How the submission is put together', 'Three volumes'),
    volumes(),

    sec('What a delay analysis actually does', 'Time Impact Analysis'),
    tiaLab(),

    sec('Two methods, and why the second one was used', 'TIA vs milestone screening'),
    methods(),

    sec('The twelve delay events', 'EOT-01 · determined March 2026'),
    eventTable(),

    sec('Round two: 587 days', 'Resubmitted 11 June 2026'),
    roundTwo(),

    sec('Seven reasons it still could not be assessed', 'Engineer\'s letter 886 · 15 July 2026'),
    gapCards(),

    sec('Before you submit', 'The checklist'),
    checklist(),
  );

  reveal(view.querySelector('.eot-gates'), { selector: '.eot-gate', stagger: 70 });
  reveal(view.querySelector('.eot-vols'), { selector: '.eot-vol', stagger: 80 });
  reveal(view.querySelector('.eot-events'), { selector: '.eot-ev', stagger: 34 });
  reveal(view.querySelector('.eot-gaps'), { selector: '.eot-gap', stagger: 60 });
}

/* ── hero ───────────────────────────────────────────────────────── */
function hero() {
  const fig = (n, label, sub, cls = '') => {
    const b = h(`b.eot-fig__n${cls}`);
    countWhenSeen(b, n);
    return h('div.eot-fig', b, h('span.eot-fig__l', label), h('small', sub));
  };
  return h('header.eot-hero',
    h('div.eot-hero__text',
      h('p.eyebrow', 'Case study · Tamakoshi V, Lot 1'),
      h('h1.eot-hero__t', 'How an extension of time', h('br'), h('em', 'is actually submitted')),
      h('p.lede', 'In January 2026 the Contractor asked for 525 days and about USD 5.5 million. The Engineer determined 228 days and nothing. In June 2026 the Contractor came back with 587 days and USD 7.38 million — and in July the Engineer replied that it still could not assess the claim at all. This page is what sits behind those numbers, and what a submission has to contain before anyone can say yes to it.'),
      h('div.eot-figs',
        fig(525, 'days claimed', 'EOT-01 · January 2026'),
        fig(228, 'days determined', 'one event only', '.is-part'),
        fig(587, 'days claimed again', 'resubmitted June 2026'),
        fig(0, 'rupees of cost', 'nothing was proved', '.is-bad')),
      h('div.row',
        h('a.btn.btn--stamp', { href: '#/baseline' }, icon('gantt'), 'Why the baseline decided it'),
        h('a.btn', { href: '#/read/35' }, icon('book'), 'Clause 35'))),
    h('div.eot-hero__art', { 'aria-hidden': 'true' }, heroArt()));
}

function heroArt() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 360 300');
  svg.innerHTML = `
    <g class="eh-stack">
      <rect x="26" y="40" width="120" height="160" rx="4" class="eh-vol eh-vol--1"/>
      <rect x="44" y="28" width="120" height="160" rx="4" class="eh-vol eh-vol--2"/>
      <rect x="62" y="16" width="120" height="160" rx="4" class="eh-vol eh-vol--3"/>
      <text x="122" y="70" text-anchor="middle" class="eh-rn">III</text>
      <text x="122" y="92" text-anchor="middle" class="eh-rt">COST</text>
    </g>
    <g class="eh-chart">
      <path d="M206 214 H344" class="eh-ax"/><path d="M206 214 V96" class="eh-ax"/>
      ${[[0, 26, 0], [1, 44, 1], [2, 70, 2], [3, 58, 3], [4, 96, 4]].map(([i, v, k]) =>
        `<rect x="${214 + i * 26}" y="${214 - v}" width="17" height="${v}" rx="2" class="eh-bar" style="--i:${k}"/>`).join('')}
      <path d="M206 118 H348" class="eh-lim"/>
      <text x="348" y="112" text-anchor="end" class="eh-lim-t">587 days</text>
    </g>
    <g class="eh-stamp"><rect x="196" y="230" width="150" height="48" rx="4"/>
      <text x="271" y="252" text-anchor="middle">NOT</text>
      <text x="271" y="270" text-anchor="middle">ASSESSABLE</text></g>`;
  return svg;
}

/* ── what it is ─────────────────────────────────────────────────── */
function whatIsIt() {
  return h('div.eot-what',
    h('div',
      h('p.bl-lead', rich('An extension of time moves your Completion Date. That is all it does — and it is worth a great deal, because liquidated damages are counted from that date. On TKV the damages run at a fixed rate for every day you are late, capped at ten per cent of the contract price. Every day of EOT you win is a day you are not paying for.')),
      h('p.bl-lead', rich('What an EOT is **not** is money. Time and money are two separate claims made in the same letter. You can win 228 days and nothing else — which is exactly what happened here. Money comes from **prolongation cost**: the time-related cost you actually incurred because a compensable delay pushed the finish out.')),
      h('div.eot-split',
        h('div.eot-half.is-time', h('span.eyebrow', 'Time'), h('h4', 'Extension of time'), h('p', rich('Proved from the programme. Answers one question: did the event move the finish? If it did not, no amount of cost evidence helps.')), h('div.chips', ['42.1', '44.1', '2.2'].map((c) => refChip(c)))),
        h('div.eot-half.is-cost', h('span.eyebrow', 'Money'), h('h4', 'Prolongation cost'), h('p', rich('Proved from records. Answers a different question: what did those extra days actually cost you, in people and plant that stood idle and could not be sent anywhere else?')), h('div.chips', ['35.7', '35.9', '63.6'].map((c) => refChip(c)))))),
    h('aside.eot-aside',
      h('div.folder', { dataset: { tab: 'The burden' } },
        h('p.eot-aside__q', '"The burden of demonstrating entitlement rests with the Contractor, who must establish, for each delay event relied upon, the cause of the delay, the liability therefor under the Contract, compliance with the applicable notice provisions, and the actual effect of the event on the critical path of the Works, all substantiated by contemporaneous records."'),
        h('cite', 'Engineer\'s letter 886, 15 July 2026'))));
}

/* ── the five gates ─────────────────────────────────────────────── */
function gates() {
  return h('div.eot-gates', GATES.map((g) => h('article.eot-gate',
    h('div.eot-gate__n', h('b', g.n), h('i')),
    h('div.eot-gate__body',
      h('h4.eot-gate__t', g.t),
      h('p.eot-gate__q', g.q),
      h('p.eot-gate__s', rich(g.s)),
      h('p.eot-gate__f', icon('alert'), h('span', h('b', 'On TKV: '), rich(g.fail)))))));
}

/* ── the three volumes ──────────────────────────────────────────── */
function volumes() {
  return h('div.eot-vols', VOLUMES.map((v) => h('article.eot-vol',
    h('div.eot-vol__spine', h('span', 'VOL'), h('b', v.v)),
    h('div.eot-vol__body',
      h('h4.eot-vol__t', v.t),
      h('p.eot-vol__s', rich(v.s)),
      h('ul.eot-vol__l', v.has.map((x) => h('li', h('span', rich(x)))))))));
}

/* ═══════════ THE TIA DEMONSTRATOR ═══════════
   Five activities in a chain. Insert an event, watch the finish move.
   The numbers are invented for the demonstration; the mechanism is
   exactly the one a real Time Impact Analysis uses. */
function tiaLab() {
  const BASE = [
    { id: 'A', name: 'Portal excavation', start: 0, dur: 8, crit: true },
    { id: 'B', name: 'Adit drive to chainage 240', start: 8, dur: 14, crit: true },
    { id: 'C', name: 'Rock support', start: 22, dur: 6, crit: true },
    { id: 'D', name: 'Survey and setting out', start: 10, dur: 4, crit: false },
    { id: 'E', name: 'Invert concrete', start: 28, dur: 9, crit: true },
  ];
  const EVENT = { id: 'X', name: 'Event: access closed, no explosives', at: 8, dur: 11 };

  let stage = 0; // 0 baseline · 1 fragnet inserted · 2 impacted
  const SPAN = 56;

  const chart = h('div.tia__chart');
  const readout = h('div.tia__read');

  function rows() {
    const shift = stage === 2 ? EVENT.dur : 0;
    const out = BASE.map((a) => {
      const moved = stage === 2 && a.crit && a.start >= EVENT.at;
      return { ...a, start: moved ? a.start + shift : a.start, moved };
    });
    if (stage >= 1) out.splice(1, 0, { id: EVENT.id, name: EVENT.name, start: EVENT.at, dur: EVENT.dur, event: true });
    return out;
  }

  function draw() {
    const list = rows();
    const finish = Math.max(...list.filter((a) => !a.event).map((a) => a.start + a.dur));
    const base = Math.max(...BASE.map((a) => a.start + a.dur));

    mount(chart,
      h('div.tia__grid', Array.from({ length: 8 }, (_, i) => h('span', { style: { left: `${(i * 7 / SPAN) * 100}%` } }, `wk ${i}`))),
      h('div.tia__rows', list.map((a, i) => h(`div.tia__row${a.event ? '.is-event' : ''}${a.moved ? '.is-moved' : ''}${a.crit ? '.is-crit' : ''}`, { style: { '--i': i } },
        h('span.tia__id', a.id),
        h('span.tia__nm', a.name),
        h('span.tia__track',
          h('i.tia__bar', { style: { left: `${(a.start / SPAN) * 100}%`, width: `${(a.dur / SPAN) * 100}%` } }, h('em', `${a.dur}d`)))))),
      h('div.tia__finish', { style: { left: `${(base / SPAN) * 100}%` } }, h('i', 'planned finish')),
      finish !== base ? h('div.tia__finish.is-new', { style: { left: `${(finish / SPAN) * 100}%` } }, h('i', 'new finish')) : null);

    mount(readout,
      h('div.tia__step',
        h('span.eyebrow', `Step ${stage + 1} of 3`),
        h('h4', ['The accepted programme', 'Build the fragnet', 'Reschedule, and read the movement'][stage]),
        h('p', [
          'Start from the programme that was accepted and current when the event happened — not from today\'s programme, and not from the baseline if three updates have gone by since. The critical path here runs A → B → C → E, and the finish is day 37. Activity D has float: it can slip four days and change nothing.',
          'A fragnet is a small piece of programme that models the event and nothing else. Here: eleven days during which the adit cannot be driven, inserted at the point in time when it actually happened, and linked into the real logic. You are not deleting work or changing durations — you are adding the event.',
          'Now reschedule. Everything downstream of the event on the critical path moves, and the completion date moves with it. The movement of the finish date is the delay caused by that event. Eleven days went in; eleven days came out, because the event landed squarely on the critical path.',
        ][stage])),
      h('div.tia__nums',
        h('div', h('b', '37'), h('small', 'planned finish, day')),
        h('div', h('b', stage === 2 ? String(finish) : '—'), h('small', 'impacted finish, day')),
        h('div', h(`b${stage === 2 ? '.is-bad' : ''}`, stage === 2 ? `+${finish - base}` : '—'), h('small', 'days of delay'))));
  }

  const steps = ['Accepted programme', 'Insert the fragnet', 'Reschedule'].map((label, i) =>
    h('button', { type: 'button', 'aria-pressed': String(i === 0), onclick: (e) => {
      stage = i;
      [...e.currentTarget.parentNode.children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      draw();
    } }, label));

  draw();

  return h('div.stack',
    h('p.bl-lead', rich('A Time Impact Analysis asks one narrow question about one event: **if this had not happened, when would the works have finished?** You answer it by taking the programme as it stood at the time, adding a small model of the event, and pressing reschedule. Whatever the completion date does is the delay. Everything else in a delay claim is argument about the inputs to that one calculation.')),
    h('section.tia',
      h('div.tia__bar', h('div.seg.tia__steps', steps), h('span.muted', 'A worked example — the numbers are made up, the method is not.')),
      h('div.tia__pane', chart, readout)),
    h('div.tia__notes',
      h('div.tia__note', h('h5', icon('bolt'), 'Float is why this matters'), h('p', rich('Activity D slips four days and nobody notices, because it was never going to decide the finish. The same delay on activity B costs you a day for a day. **"We were delayed" and "the project was delayed" are different claims** — only the second one is worth days.'))),
      h('div.tia__note', h('h5', icon('clock'), 'Windows'), h('p', rich('A two-year claim is not one calculation. You cut the period into windows — usually at each programme update — and run the analysis inside each one, because the critical path moves between windows. The Engineer asked for the programme and the longest path **before and after every window** for exactly this reason.'))),
      h('div.tia__note', h('h5', icon('scale'), 'Concurrency'), h('p', rich('If your own delay was running at the same time as theirs, in the same window, on the same path, you generally get the time but not the money. Analyse it yourself and say so. If the Engineer finds it first, everything else you wrote looks selective.'))),
      h('div.tia__note', h('h5', icon('refresh'), 'Out-of-sequence progress'), h('p', rich('Work recorded as started before its predecessor finished. P6 will still produce dates, but they come from logic that did not happen. Clean it up before you analyse anything, and keep the scheduling log that shows you did.')))));
}

/* ── the two methods ────────────────────────────────────────────── */
function methods() {
  return h('div.eot-methods',
    h('article.eot-method.is-a',
      h('span.eyebrow', 'What the Contractor used'),
      h('h4', 'Time Impact Analysis'),
      h('p', rich('A prospective, CPM-based technique: add the modelled event to an unimpacted schedule and read the movement. It is the method the AACE International Recommended Practice 52R-06 describes, and the one the SCL Delay and Disruption Protocol prefers when there is an accepted programme and good records.')),
      h('p.eot-method__catch', icon('alert'), h('span', rich('The catch: the analysis was run on the programme of **14 December 2025** — the one the Engineer had rejected five weeks earlier. A Time Impact Analysis is only as good as the programme it runs on.')))),
    h('article.eot-method.is-b',
      h('span.eyebrow', 'What the Engineer fell back on'),
      h('h4', 'Provisional milestone-based screening'),
      h('p', rich('Not a substitute for a TIA — a fallback, adopted because no accepted baseline existed and the Contract still carried binding milestones under PCC 2.2. The Engineer set it out in seven steps:')),
      h('ol.eot-method__steps',
        h('li', 'Check whether an accepted baseline and reliable updates exist for a proper critical-path analysis.'),
        h('li', 'If not, identify the binding contractual milestones under Sub-Clause 2.2.'),
        h('li', 'Map the event only to the milestones directly linked to the affected scope.'),
        h('li', 'Consider only those milestones that had actually matured by the evaluation date.'),
        h('li', 'Measure the overrun by simple calendar-day comparison between the milestone\'s contractual due date and the evaluation date.'),
        h('li', 'Treat the result as a provisional minimum — not float analysis, not concurrency, not a critical path.'),
        h('li', 'Keep it open to revision if a compliant programme and analysis ever arrive.')),
      h('p.eot-method__catch', icon('info'), h('span', rich('Milestone 1 was the only matured milestone directly linked to Delay Event #1. Its contractual due date against the evaluation date of 8 March 2026 gives **228 calendar days**. That is the whole arithmetic behind the number.')))));
}

/* ── the twelve events ──────────────────────────────────────────── */
function eventTable() {
  return h('div.stack',
    h('p.bl-lead', rich('Twelve events went in. One came back with days on it. Read down the last column and a pattern appears: almost nothing failed because the Engineer disputed that the event happened.')),
    h('div.eot-events', EVENTS.map((e) => h(`article.eot-ev.eot-ev--${e.tone}`,
      h('span.eot-ev__n', String(e.n).padStart(2, '0')),
      h('div.eot-ev__body',
        h('h4.eot-ev__t', e.t),
        h('p.eot-ev__w', rich(e.why)),
        h('div.chips', e.basis.map((b) => refChip(b)))),
      h(`span.eot-ev__got.is-${e.tone}`, e.got)))),
    h('p.muted', 'Wording condensed from the summary table of the Engineer\'s Evaluation and Determination, letter 716.'));
}

/* ── round two ──────────────────────────────────────────────────── */
function roundTwo() {
  const money = h('b');
  countWhenSeen(money, 7379383, { format: (n) => 'USD ' + n.toLocaleString() });
  const days = h('b');
  countWhenSeen(days, 587);
  return h('div.eot-r2',
    h('div.eot-r2__main',
      h('p.bl-lead', rich('On 11 June 2026 the Contractor resubmitted, under letter TKV/COM/2026/878. The new application **supersedes and replaces the earlier one in its entirety** — a clean decision, and the right one. It claims 587 calendar days, a corresponding adjustment to the Sectional Completion Milestones, and USD 7,379,383.27 in cost, in three volumes with the Time Impact Analysis in Volume II and the Prolongation Cost Claim in Volume III.')),
      h('p', rich('Five weeks later the Engineer answered. It did not reject the claim. It said something more awkward: **the submission cannot be assessed at all** in its present form, listed seven deficiencies, and gave fourteen days to remedy them. Every one of the seven is about proof rather than merit — which means every one of them is fixable.'))),
    h('div.eot-r2__score',
      h('div.eot-r2__row', days, h('span', 'calendar days claimed', h('small', 'up from 525 in January'))),
      h('div.eot-r2__row', money, h('span', 'prolongation cost', h('small', 'about USD 12,571 a day'))),
      h('div.eot-r2__row', h('b', '14'), h('span', 'days to remedy', h('small', 'from 15 July 2026')))));
}

/* ── the seven deficiencies ─────────────────────────────────────── */
function gapCards() {
  return h('div.eot-gaps', GAPS886.map((g) => h('article.eot-gap',
    h('div.eot-gap__head', h('span.eot-gap__ic', icon(g.ic)), h('span.eot-gap__n', String(g.n).padStart(2, '0')), h('h4.eot-gap__t', g.t)),
    h('div.eot-gap__b', h('h5', 'What they want'), h('p', rich(g.want))),
    h('div.eot-gap__b.eot-gap__b--why', h('h5', 'Why it matters'), h('p', rich(g.why))))));
}

/* ── the checklist ──────────────────────────────────────────────── */
function checklist() {
  const boxes = READY.map((x, i) => {
    const b = h('li.eot-ready__i', { style: { '--i': i } }, h('span.eot-ready__box'), h('span', rich(x)));
    b.addEventListener('click', () => b.classList.toggle('is-done'));
    return b;
  });
  return h('div.eot-ready',
    h('p.bl-lead', rich('None of this is exotic. It is one planner, working steadily, from the day the contract is signed. Tick them off — the list is yours to play with and nothing is saved.')),
    h('ul.eot-ready__l', boxes),
    h('div.ex-outro',
      h('div',
        h('p.eyebrow', 'The root of it'),
        h('h3.ex-outro__t', 'Every one of these needs an accepted programme'),
        h('p.muted', 'Twelve of the first twelve events, and six of the seven deficiencies, come back to the same missing document.')),
      h('a.btn.btn--stamp', { href: '#/baseline' }, icon('gantt'), 'The baseline story'),
      h('a.btn', { href: '#/exchange' }, icon('exchange'), 'How a claim travels')));
}
