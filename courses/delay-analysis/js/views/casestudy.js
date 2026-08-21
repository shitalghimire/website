/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — the airport terminal case study

   A joint venture, three areas of work, one contract completion
   date, and three different reasons for being late. Walked through
   the way the tribunal-appointed expert actually walked it: float
   deterioration first, then a float map, then the driving
   activities, then — and only then — the events.
   ═══════════════════════════════════════════════════════════════ */

import { el, stagger, d2, dLong, days, dayDiff, say } from '../dom.js';
import { md, inline, setGlossary } from '../markup.js';
import * as store from '../store.js';
import { ctx } from '../app.js';
import { WIDGETS } from '../widgets/index.js';
import { fig, readout, legend } from '../widgets/kit.js';
import { gantt } from '../widgets/gantt.js';

const STAGES = [
  { k: 'brief',   n: 'The brief' },
  { k: 'claims',  n: 'Two experts, two answers' },
  { k: 'float',   n: 'Float deterioration' },
  { k: 'runway',  n: 'Is the runway relevant?' },
  { k: 'map',     n: 'The float map' },
  { k: 'paths',   n: 'Two critical paths' },
  { k: 'events',  n: 'Mapping the events' },
  { k: 'accel',   n: 'Acceleration' },
  { k: 'award',   n: 'What the tribunal did' }
];

export function caseStudy(stageKey) {
  setGlossary(ctx.glossary);
  const idx = Math.max(0, STAGES.findIndex(s => s.k === (stageKey || 'brief')));
  const stage = STAGES[idx];

  const wrap = el('div');
  wrap.append(el('p', { style: { marginBottom: 'var(--s5)' } },
    el('a.kicker', { href: '#/' }, '← The programme')));

  wrap.append(el('header', { style: { marginBottom: 'var(--s6)' } }, [
    el('span.kicker.kicker--b', 'Case study'),
    el('h1', 'Airport terminal expansion'),
    el('p.dim', { style: { marginTop: 'var(--s3)', maxWidth: '64ch' } },
      'Commencement 1 October 2006. Completion 1 August 2007. The works actually finished on 28 January 2008, and the parties went to arbitration with two irreconcilable analyses.')
  ]));

  /* stage rail */
  const rail = el('div.tabs', {
    role: 'tablist',
    style: { marginBottom: 'var(--s6)' }
  }, STAGES.map((s, i) => el('a', {
    role: 'tab',
    href: `#/case/${s.k}`,
    aria: { selected: String(i === idx) },
    class: 'tabs-a'
  }, `${String(i + 1).padStart(2, '0')} · ${s.n}`)));
  // style anchors like the tab buttons
  [...rail.children].forEach(a => {
    a.style.cssText = 'padding:var(--s2) var(--s3);font-family:var(--f-data);font-size:var(--t-mm);' +
      'text-transform:uppercase;letter-spacing:.1em;border:1px solid var(--g-700);' +
      'border-radius:var(--radius);background:var(--g-850);white-space:nowrap;';
    if (a.getAttribute('aria-selected') === 'true') {
      a.style.color = 'var(--ink)'; a.style.borderColor = 'var(--ink-dim)';
      a.style.background = 'var(--ink-wash)';
    } else a.style.color = 'var(--p-300)';
  });
  wrap.append(rail);

  const body = el('div');
  body.append(...(RENDER[stage.k] || (() => []))());
  wrap.append(body);
  stagger(body, 6);

  /* prev / next */
  wrap.append(el('div.lnav', [
    idx > 0
      ? el('a.btn', { href: `#/case/${STAGES[idx - 1].k}` }, `← ${STAGES[idx - 1].n}`)
      : el('a.btn', { href: '#/' }, '← The programme'),
    el('div.lnav__r', [
      idx < STAGES.length - 1
        ? el('a.btn.btn--primary', { href: `#/case/${STAGES[idx + 1].k}` }, `${STAGES[idx + 1].n} →`)
        : el('a.btn.btn--primary', { href: '#/' }, 'Back to the programme')
    ])
  ]));

  return wrap;
}

/* ═══════════════════════════════════════════════════════════════
   STAGES
   ═══════════════════════════════════════════════════════════════ */

const RENDER = {

  brief: () => [
    el('div.prose', md(`
### Three areas, one date

A joint venture was contracted to renovate an existing terminal building, modernise the control tower, and extend a runway. All three had to be finished by **1 August 2007**. All three finished late, independently of each other, and for different reasons.

- **Runway Extension** — complete 15 September 2007, 45 days late
- **Terminal Building** — complete 12 December 2007, 133 days late
- **Control Tower** — complete 15 January 2008, 167 days late

The project was already reporting delay in its very first update. The October 2006 programme, dated one month after commencement, showed −28 days of float. It never recovered.
`)),

    gantt({
      title: 'What actually happened',
      sub: 'Contract period against actual performance',
      start: '2006-09-01', end: '2008-03-01', unit: 'month',
      rows: [
        { label: 'Contract period', sub: '1 Oct 06 → 1 Aug 07',
          bars: [{ s: '2006-10-01', f: '2007-08-01', kind: 'plan', label: '10 months' }] },
        { label: 'Runway Extension', sub: '45 days late',
          bars: [{ s: '2006-10-01', f: '2007-09-15', kind: 'slack' }] },
        { label: 'Terminal Building', sub: '133 days late',
          bars: [{ s: '2006-10-01', f: '2007-12-12', kind: 'emp' }] },
        { label: 'Control Tower', sub: '167 days late',
          bars: [{ s: '2006-10-01', f: '2008-01-15', kind: 'con' }] }
      ],
      markers: [{ at: '2007-08-01', label: 'contract completion', kind: 'cd' }],
      legend: false,
      note: 'Three bars, three end dates, and no obvious answer to the only question that matters: which of these was actually driving the completion of the project, and when?'
    }),

    el('div.callout.callout--law', [
      el('span.callout__l', 'What was available'),
      md(`
- the submitted and approved baseline programme
- sixteen contemporaneously updated CPM programmes, monthly
- a contemporaneously prepared as-built programme
- thirteen employer risk events, **agreed between the experts**

That last point is unusual and important. Liability for the events was not in dispute. What was in dispute was whether any of them mattered.
`)
    ])
  ],

  claims: () => [
    el('div.prose', md(`
### The claimant's case

The joint venture's expert ran a **[[tia|time impact analysis]]**. Thirteen fragnets, each impacted into an updated version of the programme current at the time, each producing a discrete delay. Added together, they justified a full extension of time to the actual completion date.

The arithmetic was competent. The problem was that it did not describe a project.
`)),

    WIDGETS['table']({
      title: 'The claimant’s time impact analysis',
      sub: 'Thirteen agreed employer risk events',
      head: ['Ref', 'Event', 'Delay (days)', 'Window'],
      n: [2],
      rows: [
        ['A', 'Additional services below slab', '15', '1106'],
        ['B', 'Additional protection works to underground utilities', '20', '1206'],
        ['C', 'Shop drawing approval', '4', '0307'],
        ['D', 'Revised columns to Control Tower', '33', '0607'],
        ['E', 'Revised blockwork to Terminal Building', '12', '0607'],
        ['F', 'Revised curtain walling to Terminal Building', '10', '0707'],
        ['G', 'M&E revisions — 1st fix, 2nd level Terminal', '46', '0707'],
        ['H', 'M&E revisions — 1st fix, 1st level Terminal', '20', '0707'],
        ['I', 'M&E revisions — 1st fix, ground level Terminal', '15', '0807'],
        ['J', 'Terrazzo floor changes — Terminal', '20', '0807'],
        ['K', 'Revised curtain walling to Control Tower', '14', '1207'],
        ['L', 'Acoustic ceiling revision — Control Tower', '7', '1207'],
        ['M', 'Revised retail layout — Terminal', '24', '0108'],
        ['=', 'Total claimed', '240', '']
      ],
      note: 'Every one of these was agreed to be an employer risk event. None of that tells you whether it delayed the project.'
    }),

    el('div.callout.callout--warn', [
      el('span.callout__l', 'Why it did not land'),
      md(`
The critical path in the analysis jumped from the Terminal Building to the Runway and back again. There was **no linked chain of events from commencement to completion** — no single story you could lay against the as-built programme and the money actually spent.

A tribunal asked to award prolongation needs to know *when* the cost was being incurred. A method that produces thirteen theoretical impacts, each measured against a different base, cannot answer that.
`)
    ]),

    el('div.prose', md(`
### The respondent's case

The employer's expert produced no positive analysis at all. It advanced two propositions:

1. the joint venture failed to act on instructions to accelerate, so was entitled to nothing for its mitigation costs; and
2. the works would have finished late anyway because of the Runway Extension, which the employer had neither varied nor delayed.

A further hearing was directed and a **tribunal-appointed expert** was agreed by all parties, on one condition: work only from the evidence already before the tribunal. No new analysis from first principles.
`)),

    el('div.callout.callout--aacei', {
      class: 'callout callout--protocol'
    }, [
      el('span.callout__l', 'RP-29R-03 on additive methods'),
      el('p', inline('*An additive-modelled schedule by itself does not account for concurrent delays and is therefore unsuitable for determining compensability.*')),
      el('span.callout__cite', 'AACE International, Recommended Practice 29R-03, Forensic Schedule Analysis')
    ])
  ],

  float: () => [
    el('div.prose', md(`
### Start with what the parties reported at the time

Before touching a single event, the tribunal expert plotted the total float on each of the three areas, update by update, straight out of the sixteen contemporaneous programmes. No impacting. No collapsing. Just what the programmes said, when they said it.
`)),

    WIDGETS['float-deterioration']({
      title: 'Float deterioration by area',
      sub: 'Sixteen monthly updates, October 2006 → January 2008'
    }),

    el('div.prose', md(`
Read it and the case changes shape.

The Terminal Building is the most critical work in October and November 2006. In December it is overtaken by the Control Tower, which holds the position through January and February 2007. From March the two trade places repeatedly and neither ever pulls clear.

The Runway Extension never comes close to either.
`)),

    el('div.callout.callout--site', [
      el('span.callout__l', 'What this drawing is telling you'),
      md(`
Two lines competing for the bottom of the chart, month after month, is the signature of **concurrent critical paths** — not concurrent delay in the entitlement sense, but two genuinely independent chains of work either of which could determine when the project finishes.

It also raises the two questions the rest of the analysis has to answer:

1. Are delays to the Runway Extension relevant at all?
2. Are delays to the Terminal Building relevant, when the last thing finished was the Control Tower?
`)
    ])
  ],

  runway: () => [
    el('div.prose', md(`
### The employer's strongest point, tested

The employer said the Runway Extension would have made the project late regardless. It finished 45 days after the contract date and the employer had done nothing to delay it.

So the expert went to the contemporaneous record, and found something specific: from March 2007 the joint venture's own monthly reports stated that it was **altering the timing and sequence of the runway work** to coincide with more favourable weather — while ensuring it would still be complete well in advance of the Control Tower.

That is not delay. That is [[pacing]].
`)),

    WIDGETS['pacing-test']({
      title: 'The four limbs, applied to the runway',
      sub: 'Tick what the contemporaneous record supports'
    }),

    el('div.callout.callout--law', [
      el('span.callout__l', 'The finding'),
      md(`
All four limbs were evidenced from documents created at the time, not reconstructed afterwards. The tribunal accepted that the late completion of the Runway Extension was **elective re-sequencing**, and in any event found that it was never on the critical path.

The employer's second proposition fell away entirely.
`)
    ]),

    el('div.callout.callout--warn', [
      el('span.callout__l', 'The other way this usually goes'),
      el('p', 'Pacing asserted at the end of a project — when an as-built shows unimpacted activities running late and somebody needs an explanation — is treated with scepticism, and rightly. The difference here was four sets of dated documents. Pacing is won in the monthly report, not in the expert report.')
    ])
  ],

  map: () => [
    el('div.prose', md(`
### Extracting the float, activity by activity

The float deterioration chart works at the level of an *area*. To find out **which activities** were actually driving each area, month by month, the expert built a float map: every activity in every programme, with its total float value in a cell.

The raw table is enormous and largely useless. It becomes useful once you filter it by two tests applied together.
`)),

    WIDGETS['steps']({
      title: 'Identifying a driving activity',
      sub: 'Both tests must be satisfied — either alone will mislead you',
      steps: [
        { t: 'The activity is on the longest path to completion', d: 'Not merely the *lowest float* — those are different things once constraints are in the programme.', m: 'test 1' },
        { t: 'The activity is in progress, or due to start, inside the update window', d: 'An activity with terrible float that is not scheduled to start for six months is not driving anything today.', m: 'test 2' },
        { t: 'Discount anomalous float paths', d: 'In April 2007 three activities showed worse float than the driving path. All three were held there by a *finish no later than* constraint on an intermediate milestone. Constraint artefacts, not criticality.', m: 'then' },
        { t: 'Group what remains by area and code', d: 'Related driving activities in adjacent months form a chain. Unrelated chains running side by side are your concurrent critical paths.', m: 'then' }
      ]
    }),

    WIDGETS['float-map']({
      title: 'The float map',
      sub: 'Outlined cells satisfy both tests'
    }),

    el('div.callout.callout--warn', [
      el('span.callout__l', 'Float is a relative measure, not an absolute one'),
      md(`
A float value can be manufactured. Calendar assignments, date constraints, zero-total-float constraints and the choice between retained logic and progress override all change it, and none of them appear on a printout.

The number of calendar days the completion date moved between two updates is an **absolute** measurement. The float value of any single activity is a **relative** one. Never let the second contradict the first without explaining why.
`)
    ])
  ],

  paths: () => [
    el('div.prose', md(`
### Two chains, running side by side

Grouping the driving activities by area produced two chains that ran in parallel for the whole project.
`)),

    gantt({
      title: 'Concurrent as-built critical paths',
      sub: 'Deduced from the driving activities in each monthly window',
      start: '2006-09-15', end: '2008-02-15', unit: 'month',
      rows: [
        { group: 'Concurrent critical path 1 — Terminal Building', tone: 'employer' },
        { label: 'Protection works, fuel line', bars: [{ s: '2006-10-01', f: '2006-11-20', kind: 'emp' }] },
        { label: 'Ground beams, grade level', bars: [{ s: '2006-11-21', f: '2007-01-15', kind: 'emp' }] },
        { label: 'E&M 1st fix, 2nd level', bars: [{ s: '2007-03-01', f: '2007-06-10', kind: 'emp' }] },
        { label: 'Blockwork / plaster, 2nd level', bars: [{ s: '2007-04-05', f: '2007-07-20', kind: 'emp' }] },
        { label: 'E&M 1st fix, 1st level', bars: [{ s: '2007-06-11', f: '2007-10-05', kind: 'emp' }] },
        { label: 'Lath & plaster ceiling, 1st level', bars: [{ s: '2007-08-01', f: '2007-11-10', kind: 'emp' }] },
        { label: 'Final decoration, 1st level', bars: [{ s: '2007-10-06', f: '2007-12-12', kind: 'emp' }] },
        { label: 'Terminal complete', bars: [{ s: '2007-12-12', f: '2007-12-12', kind: 'emp', milestone: true }] },
        { group: 'Concurrent critical path 2 — Control Tower', tone: 'contractor' },
        { label: 'Shop drawings, submit & approve', bars: [{ s: '2006-10-01', f: '2007-01-10', kind: 'con' }] },
        { label: 'Manufacture & deliver curtain wall', bars: [{ s: '2007-01-11', f: '2007-05-20', kind: 'con' }] },
        { label: 'Columns, 4th–5th level', bars: [{ s: '2007-02-01', f: '2007-05-30', kind: 'con' }] },
        { label: 'Fix curtain wall, VCR level', bars: [{ s: '2007-06-01', f: '2007-10-20', kind: 'con' }] },
        { label: 'E&M 1st fix to tower', bars: [{ s: '2007-08-01', f: '2007-11-25', kind: 'con' }] },
        { label: 'Install, test & commission', bars: [{ s: '2007-11-01', f: '2008-01-15', kind: 'con' }] },
        { label: 'Tower operational', bars: [{ s: '2008-01-15', f: '2008-01-15', kind: 'con', milestone: true }] }
      ],
      markers: [
        { at: '2007-08-01', label: 'contract completion', kind: 'cd' },
        { at: '2007-12-12', label: 'terminal', kind: 'dd' }
      ],
      legend: false,
      note: 'Two chains, largely independent, sharing only management attention and site access. Either could have determined the completion of the project.'
    }),

    el('div.prose', md(`
### The "but for" test that settles it

The Control Tower finished last, on 15 January 2008. On a strict [[dominant|dominant delay]] approach, only the Tower matters and the 133 days on the Terminal are irrelevant.

Apply the simplest possible test instead:

> **But for the delays to the Control Tower, when would the project have completed?**

No earlier than 12 December 2007 — because that is when the Terminal Building was finished. The Terminal delays are therefore real, relevant, and cannot be waved away as concurrent.
`)),

    el('div.callout.callout--site', [
      el('span.callout__l', 'Near critical is not the same as irrelevant'),
      el('p', 'In January and February 2007 the Terminal Building was not the most critical path — the Control Tower was. Analysed in isolation those two months would show the Terminal as merely near-critical. But it overtook again in March. A path that is near-critical this month is the path that becomes critical the moment anything touches it, which is exactly why both had to be carried through the whole analysis.')
    ])
  ],

  events: () => [
    el('div.prose', md(`
### Only now do the events go on

With two as-built critical paths deduced from contemporaneous programmes, each agreed employer risk event could be placed against the path and the window it actually affected — and against the float actually lost in that window.
`)),

    WIDGETS['table']({
      title: 'Employer risk events, mapped to a critical path',
      sub: 'CP1 = Terminal Building · CP2 = Control Tower',
      head: ['Ref', 'Event', 'Path', 'Delay (d)'],
      n: [3],
      rows: [
        ['A', 'Additional services below slab', 'CP1', '15'],
        ['B', 'Additional protection works, underground utilities', 'CP1', '20'],
        ['C', 'Shop drawing approval', 'CP2', '4'],
        ['D', 'Revised columns to Control Tower', 'CP2', '33'],
        ['E', 'Revised blockwork to Terminal Building', 'CP1', '12'],
        ['F', 'Revised curtain walling to Terminal Building', '— not critical', '0'],
        ['G', 'M&E revisions — 1st fix, 2nd level Terminal', 'CP1', '46'],
        ['H', 'M&E revisions — 1st fix, 1st level Terminal', 'CP1', '20'],
        ['I', 'M&E revisions — 1st fix, ground level Terminal', '— superseded by J', '0'],
        ['J', 'Terrazzo floor changes — Terminal', '— concurrent with H', '0'],
        ['K', 'Revised curtain walling to Control Tower', 'CP2', '14'],
        ['L', 'Acoustic ceiling revision — Control Tower', '— concurrent with K', '0'],
        ['M', 'Revised retail layout — Terminal', '— not critical', '0'],
        ['=', 'Terminal Building critical path (CP1)', '', '113'],
        ['=', 'Control Tower critical path (CP2)', '', '51']
      ],
      note: 'Where two employer events landed in the same window on the same path, the larger was carried and the smaller treated as concurrent. Had one been an employer event and the other a contractor event, the concurrency arguments in Module 8 would have been engaged instead.'
    }),

    el('div.prose', md(`
Four of the thirteen agreed employer risk events contributed nothing. Not because they did not happen, and not because liability was in doubt — it was agreed — but because they landed on work that had float, or in a window where something else was already driving.

That is the whole difference between an event and a **delay**.
`)),

    el('div.callout.callout--protocol', [
      el('span.callout__l', 'Claimed against found'),
      md(`
| | Claimed | Found |
|---|---|---|
| Employer risk events relied on | 13 | 9 |
| Critical delay, Terminal path | — | 113 days |
| Critical delay, Control Tower path | — | 51 days |
| Extension of time sought | 167 days | — |
`)
    ])
  ],

  accel: () => [
    el('div.prose', md(`
### Did the joint venture accelerate, or not?

The employer said the JV ignored instructions to accelerate. The JV said it had accelerated from February 2007 onwards, through additional resources and re-sequencing.

Both are assertions about a counterfactual, and there is a clean way to test them. Take the January 2007 programme — the last one in use *before* any acceleration was attempted — and import each subsequent month's actual progress into it, leaving the original logic untouched. Recalculate.

That gives you the delay that would have been reported had nothing been re-sequenced.
`)),

    WIDGETS['acceleration']({
      title: 'Month-to-month update analysis',
      sub: 'Original logic with real progress, against what was reported at the time'
    }),

    el('div.prose', md(`
The gap between the pairs is time the joint venture recovered by changing **how** it built, not by building faster. Acceleration was achieved in eight consecutive months, February to September 2007.

The corroboration came from the out-of-sequence reports, which showed activity after activity starting before its predecessor had finished — the signature of a contractor advancing work ahead of its natural sequence.
`)),

    el('div.callout.callout--site', [
      el('span.callout__l', 'Why this method and not another'),
      el('p', 'A prospective method answers "what was the likely delay at the time". A forensic method answers "what delay actually happened". Acceleration lives in the gap between the two — and the only way to show it is to run both and measure the difference. This is the single strongest argument for applying more than one technique to the same facts.')
    ]),

    el('div.callout.callout--warn', [
      el('span.callout__l', 'The trap in this technique'),
      el('p', 'Any activity created after the base programme did not exist in it, and will skew the recalculated completion date. The results must be checked by hand, activity by activity, and the additions accounted for. An automated run of this analysis is worth very little.')
    ])
  ],

  award: () => [
    el('div.prose', md(`
### Three positions, one award
`)),

    gantt({
      title: 'The competing positions',
      sub: 'Extension of time sought, conceded and found',
      start: '2006-09-01', end: '2008-12-01', unit: 'month',
      rows: [
        { label: 'Original contract period', bars: [{ s: '2006-10-01', f: '2007-08-01', kind: 'plan' }] },
        { label: 'Actual performance', bars: [{ s: '2006-10-01', f: '2008-01-15', kind: 'built' }] },
        { label: 'Claimant’s position', sub: '167 days — full EOT',
          bars: [{ s: '2007-08-01', f: '2008-01-15', kind: 'emp', label: '167d' }] },
        { label: 'Respondent’s position', sub: '0 days',
          bars: [{ s: '2007-08-01', f: '2007-08-02', kind: 'con', label: '0d' }] },
        { label: 'Tribunal expert', sub: '113 days on the Terminal path',
          bars: [{ s: '2007-08-01', f: '2007-11-22', kind: 'slack', label: '113d' }] },
        { label: 'Tribunal award', sub: '100 days',
          bars: [{ s: '2007-08-01', f: '2007-11-09', kind: 'crit', label: '100d' }] }
      ],
      markers: [{ at: '2007-08-01', label: 'contract completion', kind: 'cd' }],
      legend: false
    }),

    el('div.prose', md(`
The tribunal expert concluded the contractor was entitled to **either** 113 days of excusable, compensable delay along the Terminal Building path, **or** 51 days along the Control Tower path. Two figures, presented as a range, because two genuinely independent critical paths produce two genuinely defensible answers.

The tribunal awarded **100 calendar days**. It relied on the as-built critical path, and reduced some individual events on the underlying facts and evidence.
`)),

    el('div.callout.callout--law', [
      el('span.callout__l', 'What the tribunal said about the method'),
      el('p', inline('The approach was cited as helpful because it was *based on, and in accordance with the facts of the case, and helpful in understanding the timeline of events, with a contemporaneous perspective*.')),
      el('span.callout__cite', 'Not "because it was the correct methodology" — because it described what happened.')
    ]),

    WIDGETS['compare']({
      title: 'Why the contemporaneous windows analysis prevailed',
      cards: [
        { k: 'Claimant', t: 'Time impact analysis',
          pro: ['Established entitlement at the time each event arose', 'Competently executed arithmetic'],
          con: ['Purely prospective — theoretical by nature', 'No linked chain from commencement to completion', 'Could not locate WHEN the cost was incurred', 'Critical path jumped between unrelated areas'] },
        { k: 'Respondent', t: 'No positive analysis',
          pro: ['Correctly identified that the claimant had not proved causation'],
          con: ['Advanced no alternative', 'Runway argument collapsed on the contemporaneous record', 'Left the tribunal nothing to prefer'] },
        { k: 'Tribunal expert', t: 'Contemporaneous windows analysis',
          pro: ['Uses evidence both parties already relied on', 'Recognises the dynamic critical path', 'Identifies multiple critical paths', 'Shows losses AND gains between updates', 'Locates delay in the period cost was actually being spent', 'Nothing impacted, nothing collapsed — so nothing theoretical'],
          con: ['Requires properly updated programmes to exist', 'Constraint artefacts need rationalising by hand', 'Demands real planning expertise'] }
      ]
    }),

    el('div.callout.callout--protocol', [
      el('span.callout__l', 'The lesson worth carrying'),
      md(`
The claimant lost 67 days not because its method was wrong — a time impact analysis is the SCL Protocol's preferred technique — but because it was applied **without ever deducing an as-built critical path** to test the results against.

Every technique in this course produces a number. The number is only worth what the factual matrix behind it is worth.
`)
    ]),

    el('div', { style: { marginTop: 'var(--s6)' } }, [
      el('span.kicker.kicker--b', 'Your notes'),
      notes('case-award', 'What would you have argued for the employer? Anything you would have run differently?')
    ])
  ]
};

function notes(id, placeholder) {
  const ta = el('textarea', {
    placeholder,
    rows: '5',
    value: store.noteFor(id),
    style: {
      width: '100%', padding: 'var(--s4)', background: 'var(--g-850)',
      border: '1px solid var(--g-600)', borderRadius: 'var(--radius)',
      fontFamily: 'var(--f-ui)', fontSize: 'var(--t-sm)', color: 'var(--p-100)',
      lineHeight: '1.6', resize: 'vertical'
    },
    oninput: e => store.setNote(id, e.target.value)
  });
  return el('div', [
    ta,
    el('p.dim', { style: { fontSize: 'var(--t-xs)', marginTop: 'var(--s2)' } },
      'Saved on this device as you type.')
  ]);
}
