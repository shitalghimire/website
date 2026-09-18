/* ═══════════════════════════════════════════════════════════════
   THE EXCHANGE — how a claim actually travels.

   Not a drafting desk. A map of the traffic: who writes to whom, in
   what order, under which clause, inside which clock — and what to do
   with each kind of letter that lands on you.
   ═══════════════════════════════════════════════════════════════ */

import { h, mount, copy } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { reveal, cascade, sequence, still } from '../lib/motion.js';
import C from '../engine/contract.js';
import { head, rich, refChip, sec } from './ui.js';

/* ── the route a claim takes, stage by stage ────────────────────── */
const ROUTE = [
  {
    id: 'day0', day: 'Day 0', clock: 'Same day', dir: 'site', who: 'You, on Site',
    title: 'It happens. Write it down before you write anything else.',
    what: 'Photographs with the date visible. The Daily Progress Report entry. Names of the people involved. Which work fronts stopped, which machines stood still, from what time to what time.',
    clauses: ['35.6'],
    why: 'Sub-Clause 35.6 lets the Engineer inspect your contemporary records. Records made on the day are evidence. Records reconstructed three months later are an argument.',
    miss: 'Without them your claim reaches the sixth gate — quantum — and dies there, however good the entitlement was.',
  },
  {
    id: 'ew', day: 'As soon as you can see it coming', clock: 'No fixed limit', dir: 'out', who: 'You → the Engineer',
    title: 'Early warning',
    what: 'One page: the event that is likely, why it is likely, what it may do to time, cost or quality, and what you propose to do about it.',
    clauses: ['46.1', '46.2'],
    why: 'It costs a paragraph and it protects you. On TKV the Engineer accepted a combined early warning and claim notice as preserving the right to be heard — even though the letter cited the wrong claims clause.',
    miss: 'Sub-Clause 35.5 lets the Engineer take into account how much the failure to warn made things worse.',
  },
  {
    id: 'notice', day: 'Within 15 days', clock: '15 days · 21 days at the outside', dir: 'out', who: 'You → the Engineer',
    title: 'Notice of claim — the letter that everything else hangs on',
    what: 'Subject line naming the clause: "Notice of Claim under Sub-Clause 35.1". The facts, dated. The contract trigger. The effect on time and money. A reservation of rights. cc the Employer.',
    clauses: ['35.1', '42.1', '68.1'],
    why: 'Three separate clocks start on the same event and people miss the short ones: PCC 42.1 wants an extension-of-time notice in 15 days, 68.1 wants a Force Majeure notice in 15 days, and 35.1 gives 21 days at the outside. Write one letter that satisfies all three.',
    miss: 'Time bar. On EOT-01 the Engineer treated claims raised in meetings and unlabelled correspondence as never notified at all.',
    bar: true,
  },
  {
    id: 'ack', day: 'Days later', clock: '—', dir: 'in', who: 'The Engineer → you',
    title: 'Their first answer',
    what: 'Usually one of four things: an acknowledgement, a request for particulars, a denial of entitlement in principle, or an assertion that you are out of time.',
    clauses: ['35.2'],
    why: 'Read it for what it concedes. "We acknowledge your notice of 12 March" is a dated admission that the notice existed. Quote it by letter number for the rest of the claim\'s life.',
    miss: 'Answering their tone instead of their reasons. Separate the reasons into entitlement, procedure, evidence and quantum, and answer only the ones you can move.',
  },
  {
    id: 'particulars', day: 'Within 28–30 days', clock: '28 days', dir: 'out', who: 'You → the Engineer',
    title: 'Fully detailed claim — the particulars',
    what: 'The contractual case, the narrative of fact, the delay analysis against an accepted programme, and the cost built from payroll, plant logs and invoices. Fragnet. Resource register. Annexes numbered.',
    clauses: ['35.7', '35.9'],
    why: 'This is where the Engineer\'s six gates are actually tested: trigger, procedure, facts, criticality, mitigation, quantum.',
    miss: 'On EOT-01 eleven of twelve events came back with nothing — almost all on notice, programme and proof, not because the events had not happened.',
  },
  {
    id: 'interim', day: 'Every month, while it continues', clock: 'Monthly', dir: 'out', who: 'You → the Engineer',
    title: 'Interim claims',
    what: 'A short update: the effect continues, here is this month\'s time and cost, here are this month\'s records.',
    clauses: ['35.7'],
    why: 'A continuing event is not one claim, it is a series. Each month you keep it alive and keep the records current.',
    miss: 'Repeating the same rebuttal instead of adding this month\'s facts. After the sixth identical submission the Engineer declared the claim closed.',
  },
  {
    id: 'final', day: 'Within 30 days of the effect ending', clock: '30 days', dir: 'out', who: 'You → the Engineer',
    title: 'Final claim',
    what: 'The whole claim, closed: total time, total cost, the full record set.',
    clauses: ['35.7'],
    why: 'It fixes the number the Engineer must determine.',
    miss: 'Leaving it open invites the Engineer to determine on their own figures.',
  },
  {
    id: 'determine', day: 'When they are ready', clock: '—', dir: 'in', who: 'The Engineer → you',
    title: 'The determination',
    what: 'The Engineer consults both sides and then decides: how much time, how much money.',
    clauses: ['32.1'],
    why: 'It does not have to use the word "determination" to be one. If the letter reaches a conclusion on entitlement, treat it as a determination and start the clock.',
    miss: 'Reading it as ordinary correspondence. The 15-day clock in 32.2 is already running while you draft a reply to the reasoning.',
    bar: true,
  },
  {
    id: 'dissatisfy', day: 'Within 15 days', clock: '15 days', dir: 'out', who: 'You → the Engineer',
    title: 'Notice of dissatisfaction',
    what: 'Short. "The Contractor gives notice of dissatisfaction under Sub-Clause 32.2 with the determination in your letter [1], in respect of the following." Then list what you do not accept.',
    clauses: ['32.2'],
    why: 'It keeps everything you did not accept alive for Clause 36 and Clause 37. It is the cheapest letter in the contract and the most expensive one to forget.',
    miss: 'The determination becomes final and binding. Everything not accepted is gone.',
    bar: true,
  },
  {
    id: 'amicable', day: 'After the notice', clock: '—', dir: 'out', who: 'You → the Employer and the Engineer',
    title: 'Amicable settlement, then arbitration',
    what: 'A request to settle amicably under 36.1, with a clear statement of what is in dispute and what you propose.',
    clauses: ['36.1'],
    why: 'It is a step on the road, and a well-drafted one can end the matter. What it is not is a place to repeat the claim a seventh time.',
    miss: 'Skipping it and losing the argument that you tried everything before arbitration.',
  },
];

/* ── letters that land on you, and what to do about them ────────── */
const INBOUND_ICON = { 'The ER rejects your claim': 'x', 'The ER says your claim is time-barred': 'clock', 'You receive an instruction that changes the Works': 'pen', 'You receive a notice of non-compliance or NCR': 'alert', 'Payment is late or reduced': 'coin', 'Your document is Returned for Correction': 'refresh', 'Something happens on Site that will cost time or money': 'bolt' };

const KIND = {
  notice: ['Notices', 'You start a clock', 'stamp'],
  claim: ['Claims', 'You put the case', 'ok'],
  reply: ['Replies', 'Something landed on you', 'tape'],
  request: ['Requests', 'You ask for something', 'warn'],
  submission: ['Submissions', 'You hand something in', 'ink'],
};

export default function exchange(view, { args, ctx, data }) {
  if (args[0]) return letterType(view, ctx, data, data.writing.templates.find((t) => t.id === args[0]));
  ctx.crumbs([{ label: 'The exchange' }]);

  view.append(
    head(h('span', 'The ', h('em', 'exchange')),
      'A claim is not a document. It is a conversation, in writing, under clocks — you to the Engineer, the Engineer back to you, the Employer copied on everything. This page is the map of that traffic: what you send, when, under which clause, and what to do with each kind of letter that lands on you.'),

    outro(),

    caseStrip(),

    whoIsWho(),

    sec('The route a claim takes', 'From the day it happens'),
    routeSpine(),

    sec('When a letter lands on you', 'Your move'),
    inbound(data),

    sec('A real exchange, letter by letter', 'Claim No. 2 · Jhamarsi Khola'),
    realThread(),

    sec('Every letter and its clock', `${data.writing.templates.length} kinds`),
    letterGrid(data),

    sec('Words that carry weight', 'Phrase bank'),
    phraseBank(data),

    outro(),
  );

  reveal(view.querySelector('.ex-route'), { selector: '.ex-stage', stagger: 70 });
  reveal(view.querySelector('.ex-in'), { selector: '.ex-move', stagger: 50 });
  reveal(view.querySelector('.ex-grid'), { selector: '.ltr', stagger: 34 });
}

/* ── the three case studies, each on its own ────────────────────── */
const CASE_STUDIES = [
  {
    href: '#/baseline', ic: 'gantt', kicker: 'Twenty-two months',
    t: 'The baseline that was never approved',
    s: 'Eleven reminders about one Primavera file, from the Notice to Commence to a determination that refused to use any programme at all.',
    figs: [['11', 'reminders'], ['560', 'activities'], ['0', 'approved']],
  },
  {
    href: '#/eot', ic: 'clock', kicker: 'The first EOT · January 2026',
    t: 'EOT-01, and the twelve delay events',
    s: 'What an extension of time has to prove, how the delay analysis works, and why eleven of the twelve came back with nothing.',
    figs: [['525', 'days claimed'], ['228', 'determined'], ['0', 'cost']],
  },
  {
    href: '#/eot/2', ic: 'scale', kicker: 'The second EOT · June 2026',
    t: 'The resubmission — 587 days',
    s: 'A fresh application that supersedes the first entirely, and the seven reasons the Engineer said it still could not be assessed.',
    figs: [['587', 'days claimed'], ['7.38m', 'USD'], ['7', 'gaps']],
  },
];

function caseStrip() {
  return h('section.cstrip',
    h('div.cstrip__h', h('span.eyebrow', 'The case studies'), h('span.muted', 'Built from the real TKV correspondence')),
    h('div.cstrip__g', CASE_STUDIES.map((c, i) => h('a.cstudy', { href: c.href, style: { '--i': i } },
      h('span.cstudy__ic', icon(c.ic)),
      h('p.eyebrow', c.kicker),
      h('h3.cstudy__t', c.t),
      h('p.cstudy__s', c.s),
      h('div.cstudy__f', c.figs.map(([n, l]) => h('span', h('b', n), h('small', l)))),
      h('span.cstudy__go', 'Open', icon('arrow'))))));
}

/* ── the way on to the case studies ─────────────────────────────── */
function outro() {
  return h('div.ex-outro',
    h('div',
      h('p.eyebrow', 'Next'),
      h('h3.ex-outro__t', 'See what happened when the programme was missing'),
      h('p.muted', 'Twenty months of letters about one Primavera file — and the reason eleven of twelve delay events came back with nothing.')),
    h('a.btn.btn--stamp', { href: '#/baseline' }, icon('gantt'), 'The baseline story'),
    h('a.btn', { href: '#/cases' }, icon('folder'), 'All case files'));
}

/* ── who writes to whom ─────────────────────────────────────────── */
function whoIsWho() {
  const box = h('section.ex-who');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 720 330');
  svg.setAttribute('class', 'ex-who__art');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'The Employer sits above the Engineer; the Contractor writes to the Engineer and copies the Employer.');
  svg.innerHTML = `
    <defs>
      <marker id="whA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M0 1 L9 5 L0 9 z" class="wh-head"/>
      </marker>
    </defs>

    <g class="wh-node wh-node--emp"><rect x="256" y="14" width="208" height="62" rx="9"/>
      <text x="360" y="40" text-anchor="middle" class="wh-t">The Employer</text>
      <text x="360" y="59" text-anchor="middle" class="wh-s">Tamakoshi Jalvidhyut Co. Ltd.</text></g>
    <g class="wh-node wh-node--er"><rect x="256" y="134" width="208" height="62" rx="9"/>
      <text x="360" y="160" text-anchor="middle" class="wh-t">The Engineer</text>
      <text x="360" y="179" text-anchor="middle" class="wh-s">DOLSAR · CSPDR JV</text></g>
    <g class="wh-node wh-node--you"><rect x="256" y="254" width="208" height="62" rx="9"/>
      <text x="360" y="280" text-anchor="middle" class="wh-t">You</text>
      <text x="360" y="299" text-anchor="middle" class="wh-s">Sinohydro · KSNS JV</text></g>

    <path class="wh-line wh-line--main" d="M322 252 L322 200" marker-end="url(#whA)"/>
    <path class="wh-line wh-line--main wh-line--back" d="M398 200 L398 252" marker-end="url(#whA)"/>
    <path class="wh-line wh-line--cc" d="M254 285 C 120 285, 120 45, 254 45" marker-end="url(#whA)"/>
    <path class="wh-line wh-line--rep" d="M466 165 C 610 165, 610 45, 466 45" marker-end="url(#whA)"/>

    <text x="150" y="172" text-anchor="middle" class="wh-lbl wh-lbl--cc">always cc</text>
    <text x="586" y="112" text-anchor="middle" class="wh-lbl">reports to</text>
    <text x="312" y="228" text-anchor="end" class="wh-lbl">notices · claims</text>
    <text x="408" y="228" text-anchor="start" class="wh-lbl">instructions</text>`;

  box.append(svg, h('div.ex-who__notes',
    h('p', h('b', 'You write to the Engineer.'), ' Notices, claims, submissions and replies go to the Engineer at the address in the contract, ', refChip('15.1', { label: 'PCC 15.1' }), ' — and an email counts as received 72 hours after it is sent, not when someone reads it.'),
    h('p', h('b', 'You copy the Employer on anything contractual.'), ' Every TKV letter in the register carries ', h('span.mono', 'CC: Tamakoshi Jalvidhyut Company Limited'), '. It costs nothing and it means the Employer can never say it did not know.'),
    h('p', h('b', 'The Engineer is not the Employer.'), ' The Engineer determines under ', refChip('32.1'), ' and instructs under ', refChip('33.2'), '. The Employer pays, gives possession and carries the Employer\'s risks. Addressing a claim to the wrong one loses weeks.')));
  return box;
}

/* ── the route ──────────────────────────────────────────────────── */
function routeSpine() {
  const wrap = h('div.ex-route');
  ROUTE.forEach((s, i) => {
    const body = h('div.ex-stage__more', { hidden: true },
      h('p.ex-stage__why', rich(s.why)),
      h('div.ex-stage__miss', icon('alert'), h('span', h('b', 'Get it wrong: '), rich(s.miss))));

    const btn = h('button.ex-stage__toggle', {
      type: 'button', 'aria-expanded': 'false',
      onclick: (e) => {
        const open = body.hidden;
        body.hidden = !open;
        e.currentTarget.setAttribute('aria-expanded', String(open));
        e.currentTarget.closest('.ex-stage').classList.toggle('is-open', open);
      },
    }, h('span', 'Why it matters'), icon('arrow'));

    wrap.append(h(`article.ex-stage.ex-stage--${s.dir}${s.bar ? '.ex-stage--bar' : ''}`, { style: { '--i': i } },
      h('div.ex-stage__rail', h('span.ex-stage__dot'), h('span.ex-stage__day', s.day)),
      h('div.ex-stage__card',
        h('div.ex-stage__top',
          h('span.ex-stage__dayin', s.day),
          h(`span.ex-stage__dir.ex-stage__dir--${s.dir}`, s.dir === 'in' ? '←' : s.dir === 'out' ? '→' : '•', ' ', s.who),
          s.clock !== '—' ? h(`span.ex-stage__clock${s.bar ? '.is-bar' : ''}`, icon('clock'), s.clock) : null),
        h('h3.ex-stage__t', s.title),
        h('p.ex-stage__w', rich(s.what)),
        h('div.chips', s.clauses.map((c) => refChip(c, { label: `${c} ${C.titleOf(c) || ''}`.trim() }))),
        btn, body)));
  });
  return wrap;
}

/* ── what to do when a letter lands ─────────────────────────────── */
function inbound(data) {
  const wrap = h('div.ex-in');
  data.writing.playbooks.forEach((p, i) => {
    const steps = h('ol.ex-move__steps', { hidden: true }, p.steps.map((x) => h('li', h('span', rich(x)))));
    const card = h('article.ex-move', { style: { '--i': i } },
      h('button.ex-move__head', {
        type: 'button', 'aria-expanded': 'false',
        onclick: (e) => {
          const open = steps.hidden;
          wrap.querySelectorAll('.ex-move').forEach((c) => { if (c !== card) { c.classList.remove('is-open'); c.querySelector('ol').hidden = true; c.querySelector('button').setAttribute('aria-expanded', 'false'); } });
          steps.hidden = !open;
          card.classList.toggle('is-open', open);
          e.currentTarget.setAttribute('aria-expanded', String(open));
        },
      },
        h('span.ex-move__env', icon(INBOUND_ICON[p.when] || 'mail')),
        h('span.ex-move__t', p.when),
        h('span.ex-move__n', `${p.steps.length} moves`),
        icon('arrow')),
      steps);
    wrap.append(card);
  });
  return wrap;
}

/* ── a real exchange, played back ───────────────────────────────
   Claim No. 2 on TKV: the Jhamarsi Khola road, blocked by a landslide
   on 28 July 2024. Fourteen letters over eight months. `note` is the
   line shown on the card; `deep` is what opens when it is clicked. */
const THREAD = [
  {
    dir: 'evt', no: '', date: '28 Jul 2024', subject: 'Excessive rainfall. The Jhamarsi Khola road is cut.',
    note: 'The river rises, the road is destroyed, and nothing — diesel, cement, steel — can reach the site.',
    tone: 'flat', mark: 'Day 0',
    deep: {
      means: 'The event itself. From this moment three separate clocks are running: 15 days for a Force Majeure notice under 68.1, 15 days for an extension-of-time notice under PCC 42.1, and 21 days at the outside for a notice of claim under 35.1.',
      do: ['Photograph the road with the date visible.', 'Record the exact stock of diesel, cement and steel held at site that morning — this becomes the answer to the Engineer\'s first argument.', 'Get the road authority\'s closure record and the DHM rainfall figures for the catchment.'],
    },
  },
  {
    dir: 'out', no: 'TKV/COM/2024/058', date: '31 Jul 2024', subject: 'Notice to Claim — road block due to damage by landslide',
    note: 'Three days after the event. Facts, photographs, and the intention to claim time and cost. Sending it this fast was right.',
    tone: 'ok', mark: 'In time',
    deep: {
      asks: ['States the event: excessive rainfall and rising river levels on 28 July 2024 caused substantial damage to the Jhamarsi Khola road.', 'Says the blockage has stopped vehicles carrying diesel, cement and steel.', 'Calls it a Force Majeure event under Sub-Clause 67.1.', 'States the intention to issue notice under 68.1 and reserves the right to claim time and cost under 42.1 and 35.1.'],
      quote: 'Therefore, it is the Contractor\'s intention to issue notice under the sub-clause 68.1 [Notice of Force Majeure] and also shall reserve the right without prejudice to claim for the delay and disruption for both time and cost.',
      means: 'Three days is excellent. But read that sentence again: it is a statement of *intention to give notice*. A notice says "the Contractor hereby gives notice". An intention to give one later is the kind of wording an Engineer can — and on this project did — treat as correspondence rather than a notice.',
      fix: 'Write it as the notice itself: "The Contractor hereby gives notice under Sub-Clause 68.1 [Notice of Force Majeure], Particular Conditions Sub-Clause 42.1 and Sub-Clause 35.1 [Contractor\'s Claims] of the following event." One sentence, three clocks stopped.',
    },
  },
  {
    dir: 'out', no: 'TKV/COM/2024/058', date: 'the same letter', subject: 'The definition it quoted',
    note: 'It quoted the GCC wording of Force Majeure — which the Particular Conditions had already deleted and replaced.',
    tone: 'bad', mark: 'Wrong text',
    deep: {
      quote: '"Force Majeure means an exceptional event or circumstance, natural disaster such as earthquake, fire, Excessive rainfall (atibrishti), flood and landslide…"',
      means: 'That is the General Conditions text. On TKV the PCC deleted and replaced Sub-Clause 67.1 with a different definition — an exceptional event which satisfies four tests, with a list that includes natural catastrophes. The letter built its whole case on words that are not in this contract.',
      fix: 'Before quoting any clause, open it in the Registry and check whether the PCC touched it. Force Majeure, Employer\'s Risks, determinations, payment timing and review periods were all rewritten. Quoting deleted text invites a one-line rejection.',
      ref: '67.1',
    },
  },
  {
    dir: 'in', no: 'LOT-01/…/050', date: '13 Aug 2024', subject: 'Engineer\'s response to the notice',
    note: 'The Engineer acknowledges the severity — and points at the clause that decides the whole claim.',
    tone: 'warn', mark: '',
    deep: {
      means: 'Read this letter twice. Once for what it refuses, once for what it concedes. It recognises the severity of the situation and the impact on the works — that is a dated admission of fact, and it is worth quoting for the rest of the claim\'s life. What it refuses is the entitlement.',
      do: ['Extract every sentence that admits a fact and list it, with the letter number, in a running file.', 'Separate their reasons into entitlement, procedure, evidence and quantum before writing a word back.'],
    },
  },
  {
    dir: 'out', no: '069 · 071', date: '15 & 18 Aug 2024', subject: 'Two replies in four days',
    note: 'The Contractor argues that the scale was unprecedented and that this is Force Majeure under 67.1.',
    tone: 'bad', mark: 'Adjectives',
    deep: {
      quote: 'The scale of the road blockage has been unprecedented, severely impacting our ability to manage resources and logistics as initially planned.',
      means: '"Unprecedented" and "severely" are adjectives. An Engineer testing a claim has no way to weigh them. Two letters went out in four days and neither added a single new fact to the file.',
      fix: 'Replace every adjective with a number and a source. Not "unprecedented rainfall" but the DHM figure for that catchment on 28 July against the 25-year record. Not "severely impacting logistics" but the stock held at site on the 28th, the daily consumption rate, and the date each material ran out.',
    },
  },
  {
    dir: 'in', no: 'LOT-01/…/054', date: '20 Aug 2024', subject: 'The Engineer\'s real answer: Sub-Clause 63.6',
    note: 'Rainy-season access problems are the Contractor\'s risk, and running short of stock is not grounds for an extension of time.',
    tone: 'bad', mark: 'The killer clause',
    deep: {
      asks: [
        'Sub-Clause 63.6: because of climatic and geological conditions in the rainy season, the Contractor may have problems accessing the Site — and failure to maintain sufficient stock, or material shortage, is not valid grounds for a claim for an extension of time.',
        'Sub-Clause 24.2: the Contractor is deemed to have obtained all information on risks, contingencies and circumstances affecting the Works.',
        'The events described do not meet the Force Majeure criteria in the Contract.',
        'And: 63.6 applies even if the event does meet the Force Majeure test.',
      ],
      quote: 'As long as Sub-Clause 63.6 is included in the Contract, this mechanism remains applicable, even if the event meets the criteria of the Force Majeure clause under Sub-Clause 67.1.',
      means: 'This is the letter the claim actually turns on, and it arrived on day 23. The Engineer is not disputing the landslide. It is saying the Contract already allocated that risk — monsoon access is yours, and the remedy the Contract expected was stockpiling. It even points at Upper Tamakoshi as the precedent the Contractor should have planned around.',
      fix: 'From here the winning argument is narrow and factual: show that the stock actually held on 28 July was adequate for a normal monsoon interruption, and that this event exceeded any interruption a reasonable contractor could have stocked against. That is an evidence case about stock levels and rainfall return periods — not an argument about what Force Majeure means.',
      ref: '63.6',
    },
  },
  {
    dir: 'out', no: 'TKV/COM/2024/082', date: 'Sep 2024', subject: 'Statement of Claim No. 2',
    note: 'The particulars, properly structured: background, chronology, applicable clauses, entitlement, notice, relief sought, exhibits.',
    tone: 'ok', mark: 'Particulars',
    deep: {
      asks: [
        'A. Background · B. Chronology of the event, letter by letter · C. Applicable contract clauses · D. Contractual entitlement — why the event was Force Majeure · E. Notice requirement · F. Relief sought · G. Disclaimer.',
        'Five exhibits: the notice of 31 July, and every letter each way since.',
      ],
      means: 'Structurally this is a good document, and the section headings are the right ones — it answers the six gates in the order an Engineer reads them. The weakness is inherited from the letters it is built on: it argues the Force Majeure definition rather than meeting 63.6 head on, and its exhibits are correspondence rather than records.',
      fix: 'Exhibits should be evidence, not letters. Daily logs, the site stock register for July, delivery notes, the road authority notice, DHM rainfall data, an idle-plant register with machine numbers and hours. Correspondence proves you wrote; records prove what happened.',
    },
  },
  {
    dir: 'in', no: '072 · 087 · 109 · 124', date: 'Oct 2024 – Feb 2025', subject: 'Four more responses on Statement of Claim No. 2',
    note: 'Four separate answers, each narrowing the ground. Somewhere in this run the Engineer concludes on entitlement.',
    tone: 'warn', mark: 'Clock running',
    deep: {
      means: 'This is the most dangerous stretch of the whole exchange, and it is dangerous quietly. A letter does not have to use the word "determination" to be one. Once a letter reaches a conclusion on entitlement, the fifteen-day clock in Sub-Clause 32.2 is running — whether or not anybody in the office noticed.',
      do: ['Read every response against one test: does this letter decide, or does it discuss?', 'The moment one decides, diary the 32.2 date before drafting any reply to the reasoning.', 'Give the notice of dissatisfaction even while you keep talking. It costs a page and it keeps Clause 36 and Clause 37 open.'],
      ref: '32.2',
    },
  },
  {
    dir: 'out', no: '104 · 134 · 150', date: 'Nov 2024 – Mar 2025', subject: 'Three more replies, same forum',
    note: 'The same argument, restated. The route out of this was 32.2 and then 36.1 — not a seventh reply.',
    tone: 'bad', mark: 'Escalate instead',
    deep: {
      means: 'Fourteen letters over eight months on a good claim: an exceptional event, real disruption, a notice sent within three days. It went nowhere because the exchange never changed level. Every letter answered the last one in the same forum, with the same material, to the same reader who had already decided.',
      fix: 'Answer a rejection only when you have new evidence or a new contractual argument. If you have neither, the next letter is a notice of dissatisfaction under 32.2, then a request for amicable settlement under 36.1. On TKV, repeat submissions were eventually treated as closed.',
      ref: '36.1',
    },
  },
];

function realThread() {
  const wrap = h('div.ex-thread');
  const list = h('div.ex-thread__list');
  let open = null;

  const rows = THREAD.map((l, i) => {
    const d = l.deep || {};
    const panel = h('div.ex-deep', { hidden: true },
      d.asks?.length ? h('section.ex-deep__b', h('h5.ex-deep__h', icon('list'), l.dir === 'in' ? 'What it argues' : 'What it says'), h('ul.ex-deep__l', d.asks.map((x) => h('li', h('span', rich(x)))))) : null,
      d.quote ? h('blockquote.ex-deep__q', h('p', d.quote), l.no ? h('cite', l.no) : null) : null,
      d.means ? h('section.ex-deep__b', h('h5.ex-deep__h', icon('eye'), 'What it really does'), h('p', rich(d.means))) : null,
      d.do?.length ? h('section.ex-deep__b', h('h5.ex-deep__h', icon('check'), 'What to do'), h('ul.ex-deep__l', d.do.map((x) => h('li', h('span', rich(x)))))) : null,
      d.fix ? h('p.ex-deep__fix', h('b', 'Do it this way: '), h('span', rich(d.fix))) : null,
      d.ref ? h('div.chips', refChip(d.ref, { label: `${d.ref} ${C.titleOf(d.ref) || ''}`.trim() })) : null);

    const more = h('button.ex-msg__more', { type: 'button', 'aria-expanded': 'false' }, h('span', 'Open it'), icon('arrow'));

    const row = h(`div.ex-msg.ex-msg--${l.dir}.ex-msg--${l.tone}`, { style: { '--i': i } },
      h('div.ex-msg__env',
        h('span.ex-msg__who', l.dir === 'out' ? 'Us → Engineer' : l.dir === 'in' ? 'Engineer → us' : 'On site'),
        l.no ? h('span.ex-msg__no.mono', l.no) : null,
        h('span.ex-msg__date.mono', l.date)),
      h('p.ex-msg__s', l.subject),
      h('p.ex-msg__note', rich(l.note)),
      more, panel,
      l.mark ? h(`span.ex-msg__mark.ex-msg__mark--${l.tone}`, l.mark) : null);

    more.addEventListener('click', () => {
      const opening = panel.hidden;
      if (open && open !== row) {
        open.classList.remove('is-open');
        open.querySelector('.ex-deep').hidden = true;
        const b = open.querySelector('.ex-msg__more');
        b.setAttribute('aria-expanded', 'false');
        mount(b.querySelector('span'), 'Open it');
      }
      panel.hidden = !opening;
      row.classList.toggle('is-open', opening);
      more.setAttribute('aria-expanded', String(opening));
      mount(more.querySelector('span'), opening ? 'Close' : 'Open it');
      open = opening ? row : null;
      if (opening) reveal(panel, { selector: '.ex-deep__b, .ex-deep__q, .ex-deep__fix', stagger: 45 });
    });

    return row;
  });

  const play = h('button.btn.btn--stamp', { type: 'button' }, icon('play'), 'Play the exchange');
  const skip = h('button.btn.btn--ghost.btn--sm', { type: 'button' }, 'Show all');

  let seq = null;
  const showAll = () => { seq?.stop(); rows.forEach((r) => r.classList.add('is-on')); mount(play, icon('refresh'), 'Play again'); };

  play.addEventListener('click', () => {
    if (still()) return showAll();
    seq?.stop();
    rows.forEach((r) => r.classList.remove('is-on'));
    mount(play, icon('pause2'), 'Playing…');
    seq = sequence(rows, {
      gap: 900,
      onStep: (row, i, done) => {
        if (done) { mount(play, icon('refresh'), 'Play again'); return; }
        row.classList.add('is-on');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    }).play();
  });
  skip.addEventListener('click', showAll);

  mount(list, rows);
  wrap.append(
    h('p.ex-thread__lede', 'Fourteen letters over eight months about one landslide on the Jhamarsi Khola road. It is a good claim — an exceptional event, real disruption, a notice sent three days later — and it still went nowhere. Play it through, then open any letter to see what it actually said and what it should have said.'),
    h('div.row.ex-thread__bar', play, skip, h('span.muted', 'Real letter numbers from the TKV register.')),
    list);
  return wrap;
}

/* ── the letter types ───────────────────────────────────────────── */
function letterGrid(data) {
  const wrap = h('div.ex-grid');
  const byKind = {};
  for (const t of data.writing.templates) (byKind[t.kind] ??= []).push(t);
  for (const [kind, [label, sub]] of Object.entries(KIND)) {
    const list = byKind[kind];
    if (!list) continue;
    wrap.append(h('div.ex-grid__h', h('h3', label), h('span.muted', sub)));
    wrap.append(h('div.grid.grid--3', cascade(list.map((t) => h('a.ltr.card--link', { href: `#/exchange/${t.id}` },
      h('div.ltr__top', h('span.ltr__ic', icon('mail')), t.deadline?.n ? h('span.ltr__dl', `${t.deadline.n} ${t.deadline.unit}`) : null),
      h('h4.ltr__t', t.title),
      h('p.ltr__w', t.when),
      h('div.chips', t.clauses.slice(0, 3).map((c) => h('span.chip', c))))))));
  }
  return wrap;
}

/* ── phrase bank ────────────────────────────────────────────────── */
function phraseBank(data) {
  const wrap = h('div.ex-phr');
  wrap.append(h('p.muted.ex-phr__lede', 'Openings, disagreements and reservations that have survived being read by an Engineer. Click one to copy it; the braces are yours to fill.'));
  for (const g of data.writing.phrases) {
    wrap.append(h('section.ex-phr__g',
      h('h4.ex-phr__t', g.group),
      h('ul.ex-phr__l', g.items.map((s) => h('li', h('button.ex-phr__b', { type: 'button', onclick: () => copy(s) }, h('span', s), icon('copy')))))));
  }
  return wrap;
}

/* ── one letter type ────────────────────────────────────────────── */
function letterType(view, ctx, data, t) {
  if (!t) { view.append(h('div.empty', 'No such letter type. ', h('a', { href: '#/exchange' }, 'The exchange'))); return; }
  ctx.crumbs([{ label: 'The exchange', href: '#/exchange' }, { label: t.title }]);
  const [kindLabel] = KIND[t.kind] || ['Letter'];

  const blanks = (line) => {
    /* Shows the model paragraph with its blanks visible, so you can see
       the shape of the sentence without a form filling it in for you. */
    const frag = document.createDocumentFragment();
    let last = 0;
    const re = /\{\{[#/]?(\w+)\}\}/g;
    for (const m of line.matchAll(re)) {
      if (m.index > last) frag.append(rich(line.slice(last, m.index)));
      const f = t.fields.find((x) => x.key === m[1]);
      if (m[0].startsWith('{{#') || m[0].startsWith('{{/')) frag.append(h('span.mdl__cond', m[0].startsWith('{{#') ? '⟨only if: ' + (f?.label || m[1]) + '⟩ ' : ' ⟨end⟩'));
      else frag.append(h('span.mdl__blank', f?.label || m[1]));
      last = m.index + m[0].length;
    }
    frag.append(rich(line.slice(last)));
    return frag;
  };

  view.append(
    h('header.ltr-head',
      h('div',
        h('p.eyebrow', `${kindLabel} · ${t.clauses.join(' · ')}`),
        h('h1.head__title', t.title),
        h('p.head__sub', t.when)),
      t.deadline?.n
        ? h('div.ltr-head__clock', h('b', t.deadline.n), h('small', t.deadline.unit), h('span', `from ${t.deadline.from}`))
        : h('div.ltr-head__clock.is-open', h('b', '—'), h('small', 'no fixed limit'), h('span', t.deadline?.from || ''))),

    h('div.split',
      h('div.stack',
        h('section.mdl',
          h('div.mdl__bar', h('h2.mdl__h', 'What a good one says'),
            h('span.mdl__acts',
              h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: () => copy([`Subject: ${t.subject}`, '', ...t.body].join('\n\n')) }, icon('copy'), 'Copy the shape'),
              h('a.btn.btn--sm.btn--stamp', { href: `#/tools/draft/${t.id}` }, icon('pen'), 'Draft this letter'))),
          h('p.mdl__subj', h('span.label', 'Subject'), blanks(t.subject)),
          h('div.mdl__body', t.body.map((line) => h('p.mdl__p', blanks(line)))),
          h('p.mdl__note', 'A shape, not a template to send. Every fact, date and clause number has to be checked against this contract before it leaves your office.')),

        t.checklist?.length
          ? h('section.card', h('h2.mdl__h', icon('check'), 'Before it goes out'), h('ul.checklist', t.checklist.map((x) => h('li', h('span', rich(x))))))
          : null),

      h('aside.stack',
        h('section.side-card', h('h3.side-card__h', 'The clauses behind it'),
          h('div.chips', t.clauses.map((c) => refChip(c, { label: `${c} ${C.titleOf(c) || ''}`.trim() })))),
        h('section.side-card', h('h3.side-card__h', 'Where it sits'),
          h('p.muted', 'See this letter in the route a claim takes, with the clocks around it.'),
          h('a.btn.btn--sm', { href: '#/exchange' }, icon('exchange'), 'The route')),
        h('section.side-card', h('h3.side-card__h', 'Count the clock'),
          h('p.muted', 'Work out the exact date this is due, and save it.'),
          h('a.btn.btn--sm', { href: '#/clock' }, icon('clock'), 'Deadline clocks')))),
  );

  reveal(view.querySelector('.mdl__body'), { selector: '.mdl__p', stagger: 40 });
}
