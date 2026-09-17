/* ═══════════════════════════════════════════════════════════════
   THE BASELINE — a case study.

   Twenty months, eleven reminders and two full rewrites of one
   Primavera file. Then a determination that refused to use any
   programme at all, and 228 days where twelve events had been claimed.

   Every date, letter number and figure on this page is taken from the
   TKV correspondence: the Engineer's letters 003 → 633 and the
   Contractor's 045 → 633, plus the Baseline L-3 Narrative Report
   (TKV-SINO-SCH-003) submitted under letter 575.
   ═══════════════════════════════════════════════════════════════ */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { reveal, countWhenSeen, stampWhenSeen, still } from '../lib/motion.js';
import { rich, refChip, sec, stamp } from './ui.js';

/* ── the two revisions of the published milestone table ─────────── */
const D = (s) => { const [d, m, y] = s.split('-'); return new Date(+('20' + y), MON.indexOf(m), +d); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}-${MON[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;

/* Rev 0 — submitted 20 Nov 2025 under TKV/COM/2025/575.
   Rev 1 — submitted 14 Dec 2025 under TKV/COM/2025/633.
   `wbs` groups the rows; `pair` draws a summary bar between a start
   and a finish milestone that the Contractor actually published. */
const MILESTONES = [
  { id: 'TKV-KMS-100', name: 'Letter of Acceptance', wbs: 'gen', r0: '28-Apr-24', r1: null, note: 'removed on the Engineer\'s instruction' },
  { id: 'TKV-KMS-101', name: 'Notice to Commence (NTC)', wbs: 'gen', r0: '09-Jun-24', r1: '09-Jun-24' },
  { id: 'TKV-CON-PHC-010', name: 'Powerhouse excavation & support — start', wbs: 'phc', r0: '19-Dec-24', r1: '18-Jan-25', pair: 'phc-exc' },
  { id: 'TKV-CON-PHC-090', name: 'Powerhouse excavation & support — finish', wbs: 'phc', r0: '02-Feb-26', r1: '04-Mar-26', pair: 'phc-exc', end: true },
  { id: 'TKV-CON-PHC-110', name: '1st stage powerhouse concrete — start', wbs: 'phc', r0: '23-Apr-26', r1: '12-Jun-26', pair: 'phc-c1' },
  { id: 'TKV-CON-PHC-190', name: '1st stage powerhouse concrete — finish', wbs: 'phc', r0: '13-May-27', r1: '22-Jul-27', pair: 'phc-c1', end: true },
  { id: 'TKV-CON-F3F4', name: 'HRT faces F-3 (A#2) & F-4 (A#3) holed through', wbs: 'hrt', r0: '19-Aug-26', r1: '19-Aug-26' },
  { id: 'TKV-CON-F1F2', name: 'HRT faces F-1 (Head pond) & F-2 (A#2)', wbs: 'hrt', r0: '20-Mar-27', r1: '19-Apr-27' },
  { id: 'TKV-CON-F5F6', name: 'HRT faces F-5 (A#3) & F-6 (A#4)', wbs: 'hrt', r0: '31-Mar-27', r1: '30-Apr-27' },
  { id: 'TKV-CON-U1', name: 'Unit 1 — turbine/generator concrete finish', wbs: 'unit', r0: '08-Dec-27', r1: '31-Jan-28' },
  { id: 'TKV-CON-U2', name: 'Unit 2 — turbine/generator concrete finish', wbs: 'unit', r0: '03-Mar-28', r1: '31-Jan-28' },
  { id: 'TKV-CON-U3', name: 'Unit 3 — turbine/generator concrete finish', wbs: 'unit', r0: '30-Mar-28', r1: '31-Jan-28' },
  { id: 'TKV-CON-U4', name: 'Unit 4 — turbine/generator concrete finish', wbs: 'unit', r0: '30-Mar-28', r1: '31-Jan-28' },
  { id: 'TKV-TCM-WT-010', name: 'Wet testing starts (commissioning)', wbs: 'tcm', r0: '06-Feb-28', r1: '06-Feb-28' },
  { id: 'TKV-PMS-41', name: 'Completion of all works (COD)', wbs: 'tcm', r0: '12-Apr-28', r1: '12-Apr-28', critical: true },
];

const WBS = [
  ['gen', 'PROJECT GENERAL', 'GNL · KMS · PMS'],
  ['phc', 'CONSTRUCTION — Powerhouse Cavern', 'CON-PHC'],
  ['hrt', 'CONSTRUCTION — Adit & Headrace Tunnel', 'CON-A1…A4 · F1…F7'],
  ['unit', 'CONSTRUCTION — Turbine & Generator Blocks', 'CON-PHC-U1…U4'],
  ['tcm', 'TESTING & COMMISSIONING', 'TCM-DT · WT · PC'],
];

const CONTRACT_COD = D('11-Apr-28');
const DATA_DATE = D('28-Apr-24');

/* ── the Engineer's seven review comments, letter 558 ───────────── */
const COMMENTS = [
  { n: 1, t: 'Completion milestone dates do not match the Contract', p6: 'Milestone constraints and the activity dates feeding them', fix: 'Every intermediate milestone in the programme has to land on or before the day stated in SCC 41.2, counted from NTC. Annex 1 to the letter compared all 41 of them.', ref: '41.2' },
  { n: 2, t: 'Monsoon calendar not applied — Spillway Tunnel Outlet & Terminal Structure', p6: 'Activity calendar assignment', fix: 'Re-assign the affected activities from TK-V_7 days to TK-V_Monsoon 7 days so the monsoon non-working period actually pushes the dates.', ref: '41' },
  { n: 3, t: 'Monsoon calendar not applied — Tailrace Outlet Structure', p6: 'Activity calendar assignment', fix: 'Same again at the downstream end. River-level work in Jun–Sep cannot be scheduled as if the monsoon does not exist.', ref: '41' },
  { n: 4, t: 'Tailrace Outlet sequencing is wrong', p6: 'Relationships — FS links, missing predecessors', fix: 'Excavation → first-stage concrete → installation of HM embedded parts → second-stage concrete, all Finish-to-Start. Outlet Portal and Tailbay activities had no predecessor or successor at all.', ref: '41' },
  { n: 5, t: 'No resource loading', p6: 'Resource assignments (labour and non-labour)', fix: 'Load every activity. The Engineer later refused the argument that resource loading was indicative only — see the third fight below.', ref: '41' },
  { n: 6, t: 'Wrong contractual completion date', p6: 'Project finish and the must-finish-by constraint', fix: '11 April 2028, not 12 April 2028. One day. It was rejected twice.', ref: '41.2' },
  { n: 7, t: 'A non-scheduling activity in the programme', p6: 'Activity TKV-KMS-100', fix: '"Letter of Acceptance dated 28 April 2024" is a fact, not work. Removing it makes the Original Project Duration read 1,403 calendar days, as the Contract says.', ref: '1.1' },
];

/* ── the 41 gaps the Engineer tabulated in Annex 1 ──────────────── */
const GAPS = [-27, 11, -712, -254, 224, -36, -149, -286, -783, -481, -491, -303, -646, -413, -218, -352, -286, -297, -313, -597, -274, -354, -370, -565, -264, -354, -368, -582, -302, -25, -860, -46, -424, -334, -17, -309, -3, -133, 135, -149, -1];

/* ── the correspondence, in order ─────────────────────────────────
   `s` is the one-line summary shown on the timeline; `deep` is what
   opens when the letter is clicked: what it actually asked for, a line
   from it, what it meant for the programme, and what it would take in
   Primavera to answer it. */
const STORY = [
  {
    d: '21 Feb 2024', dir: 'x', t: 'Letter of Intent',
    s: 'Before the contract exists, the programme is already on the table.',
    deep: {
      means: 'The Letter of Intent starts the clarification process. Nothing contractual about the programme is fixed yet — which is exactly why the next three weeks matter so much.',
    },
  },
  {
    d: '4, 6 & 18 Mar 2024', dir: 'm', t: 'Clarification meetings, Thapagaun', key: true,
    s: 'The Employer agrees, in signed minutes, that the intermediate milestone days can move. Twenty-two months later this one paragraph is the whole argument.',
    deep: {
      asks: [
        'Item 2 — the Bidder asks for flexibility in planning the construction schedule to its realistic execution plan, aiming to expedite the work.',
        'The Employer agrees to allow adjustments to the days associated with the intermediate milestones, subject to the project completion days in GCC 1.1(z).',
        'SCC 2.2 Sectional Completion (milestones) "shall be updated to reflect any modifications made to the intermediate completion milestones".',
      ],
      quote: 'In response, the Employer agreed to provide this flexibility, allowing adjustments to the days associated with the intermediate milestones [subject to project completion days as specified in GCC 1.1(z)] when submitting the program for approval.',
      means: 'Read on its own, this is the Contractor\'s best card. Signed by the Chief Executive Officer for the Employer and by Sinohydro\'s Country Representative, on 18 March 2024, with the Employer\'s Representative as witness. The problem is what happened next: SCC 2.2 was never actually updated, and no amendment or instruction was issued. The concession stayed a minute of a meeting.',
      p6: 'If the flexibility had been formalised, the milestone constraints in the programme could have been set to the Contractor\'s dates. Without it, every TKV-PMS milestone has to be constrained to the SCC 41.2 day count from NTC.',
      lesson: 'Get a concession issued as a written instruction under 33.2, or as an addendum to the Contract. A minute records what was said; it does not change what was signed.',
    },
  },
  {
    d: '28 Apr 2024', dir: 'x', t: 'Letter of Acceptance',
    s: 'Award. The Contractor later makes this its baseline data date — and puts it in the schedule as an activity.',
    deep: {
      means: 'The LoA date becomes the data date of the Baseline L-3 Schedule. That part is reasonable. What is not reasonable is activity TKV-KMS-100, "Letter of Acceptance dated 28 April 2024", sitting in the programme as if it were work.',
      p6: 'A dated fact belongs in the project calendar or as a notebook entry, not as an activity. Left in, it stretched the Original Project Duration past the contractual 1,403 days; removing it made the figure read correctly.',
    },
  },
  {
    d: '10 May 2024', dir: 'x', t: 'Contract Agreement signed',
    s: 'The Contract is now the only document that counts.',
    deep: {
      means: 'From this date, the clarification minutes are historic background. Anything that is going to bind the parties has to be inside the Contract or issued under it.',
    },
  },
  {
    d: '26 May 2024', dir: 'in', no: 'ER/003', rem: 1, t: 'Request for submission of a revised works schedule',
    s: 'Two weeks after signature, before commencement, the Engineer asks for the programme. The first of eleven.',
    deep: {
      asks: ['Submit a revised works schedule under Sub-Clause 41.'],
      means: 'Worth noticing how early this is: the Engineer asked before the Notice to Commence had even been issued. The clock on the baseline effectively started before the clock on the Works.',
      lesson: 'The programme is the first deliverable of the contract, not a document you produce once site work settles down.',
    },
  },
  {
    d: '9 Jun 2024', dir: 'x', t: 'Notice to Commence', key: true,
    s: '1,403 calendar days start running. Completion falls on 11 April 2028.',
    deep: {
      means: 'Everything in the programme is counted from this date. The intermediate milestones in SCC 41.2 are expressed as "days after NTC", so NTC is the zero of the whole schedule.',
      p6: 'Project start 9 June 2024, Time for Completion 1,403 calendar days, and the finish is Commencement + (1,403 − 1) = 11 April 2028. The minus-one is not a rounding preference; it is how the Contract counts, and getting it wrong cost two months of correspondence later.',
      lesson: 'Set the project finish constraint on day one and never let a revision quietly move it.',
    },
  },
  {
    d: '9 Jul 2024', dir: 'out', no: '045', t: 'Submission of Project Schedule',
    s: 'The first attempt goes in, one month after NTC.',
    deep: {
      means: 'On time in spirit. What follows shows the problem was never willingness — it was that nobody on the Contractor\'s side owned the programme as a full-time job.',
    },
  },
  {
    d: '29 Jul 2024', dir: 'in', no: 'ER/038', rem: 2, t: 'Response — not acceptable',
    s: 'Comments issued. The cycle of submit, comment, resubmit begins.',
    deep: {
      asks: ['Revise and resubmit addressing the Engineer\'s comments.'],
      means: 'A comment letter is not a rejection of the claim to have complied. It is the start of a loop, and loops only close when somebody drives them.',
      lesson: 'Answer a comment letter comment by comment, in a numbered table, and say what you changed. Fourteen months of this exchange never produced that table.',
    },
  },
  {
    d: '20 Aug 2024', dir: 'in', no: 'ER/055', rem: 3, t: 'Reminder',
    s: 'No resubmission has arrived. The Engineer writes again.',
    deep: { means: 'Eighty-five days will pass between this letter and the next reminder — the Engineer counts them out loud in the letter that follows.' },
  },
  {
    d: '12 Nov 2024', dir: 'in', no: 'ER/105', rem: 4, t: 'Second reminder', quote: true,
    s: '"85 days have elapsed since our reminder, and 157 days since the commencement of the construction phase, yet an approved project work schedule has not been maintained."',
    deep: {
      asks: [
        'Resubmit the revised work schedule by 18 November 2024.',
        'Reflect all required updates: resource allocation, completion dates and critical path activities.',
        'Comply with Volume 2C, Sub-Clauses 41 and 42, and with the comments already given in letters 038 and 055.',
      ],
      quote: 'Failure to submit the revised work schedule promptly may impact the overall project timeline and lead to further contractual implications.',
      means: 'This is the letter where the Engineer starts building the record. It counts elapsed days, lists every prior reference, and names the consequence. Everything in it will be quoted back eighteen months later.',
      p6: 'The three things it asks for are the three things the programme still lacked at the end: resources loaded, completion dates matching the Contract, and a defensible critical path.',
      lesson: 'When a letter starts counting days, it has stopped being administration and started being evidence.',
    },
  },
  {
    d: '20 Nov 2024', dir: 'out', no: '136', t: 'Submission of revised Project Work Schedule',
    s: 'Submitted two days after the deadline in the second reminder.',
    deep: { means: 'A real attempt, and the Engineer acknowledges the effort. It still is not acceptable as a baseline, and the reason is structural rather than cosmetic.' },
  },
  {
    d: '28 Nov 2024', dir: 'in', no: 'ER/108', rem: 5, t: 'Coordination meetings proposed', key: true,
    s: 'The Engineer offers to put its own Planning Engineer in the room and build the programme jointly. The most generous letter in the whole file.',
    deep: {
      asks: [
        'Develop a joint work programme in collaboration with the Engineer\'s Planning Engineer.',
        'Hold a series of coordination meetings with the Contractor\'s planning, project-management and execution staff.',
        'Use them to close the identified gaps and align the schedule with the contractual requirements.',
      ],
      quote: 'While we appreciate the effort invested in its preparation, the submission requires significant revision and further inputs to comply with the Conditions of Contract.',
      means: 'An Engineer who helps you build the programme is an Engineer who finds it very hard to reject it afterwards. This offer was the cheapest route to an accepted baseline that existed at any point in the two years.',
      lesson: 'When the reviewer offers to co-author the thing they will review, say yes the same week.',
    },
  },
  {
    d: '29 Dec 2024', dir: 'in', no: 'ER/130', rem: 6, t: 'Review and finalisation of the revised schedule',
    s: 'Another round of review comments, another request to finalise.',
    deep: { means: 'A year of the contract has gone and the measuring stick for every future claim still does not exist.' },
  },
  {
    d: '19 Jan 2025', dir: 'in', no: 'ER/147', rem: 7, t: 'Reminder — and appoint a Planning Engineer',
    s: 'The Engineer begins saying out loud that the real problem is that nobody is doing the job.',
    deep: {
      asks: ['Finalise the Project Work Schedule.', 'Fill the dedicated position of Planning Engineer.'],
      means: 'From here the Planning Engineer appears in reminder after reminder. The Engineer is telling the Contractor, in writing, where its own weakness is.',
      lesson: 'A named planner with the time and the software is cheaper than one rejected claim.',
    },
  },
  { d: '16 Feb 2025', dir: 'in', no: 'ER/178', rem: 8, t: 'Reminder', s: 'Another one. The references list keeps growing.', deep: { means: 'Each reminder recites all the reminders before it. The list itself becomes the evidence of default.' } },
  { d: '3 Mar 2025', dir: 'm', t: 'Progress Review Meeting', s: 'The baseline is raised again, and minuted again.', deep: { means: 'Minuted discussion counts as notice of the requirement. It is quoted in the tenth reminder as reference [13].' } },
  { d: '7 Mar 2025', dir: 'in', no: 'ER/187', rem: 9, t: 'Reminder', s: 'Still nothing.', deep: { means: 'Three reminders in three weeks.' } },
  { d: '28 Mar 2025', dir: 'in', no: 'ER/210', t: 'Reminder', s: 'Two days before the tenth.', deep: { means: 'The pace tightens just before the Engineer escalates.' } },
  {
    d: '30 Mar 2025', dir: 'in', no: 'ER/211', rem: 10, t: 'Tenth reminder — "final warning"', quote: true, key: true,
    s: '"Without an approved baseline, there is no agreed benchmark against which progress can be objectively measured… the project is operating without a roadmap."',
    deep: {
      asks: [
        'Submit the Baseline Schedule and Schedule Narrative Report within fifteen calendar days — by 14 April 2025. "This deadline is both reasonable and final."',
        'Engage a suitably qualified and experienced Planning Engineer immediately.',
        'Acknowledge receipt in writing and confirm you understand the gravity of the notice.',
      ],
      quote: 'Should you fail to comply… the Engineer may recommend withholding all or part of any future payment certificates until a compliant Baseline Schedule is submitted and approved.',
      means: 'Thirteen references, nine prior reminders and one Progress Review Meeting, all listed on the first page. The letter sets out why the baseline matters in terms the Contractor will meet again in the determination: without it you cannot assess percentage complete, you cannot evaluate extension-of-time claims, and you cannot identify which activities are critical. It also calls the failure "a breach of your contractual obligations under Sub-Clause 41".',
      p6: 'What was being asked for is not exotic: a Level-3 programme with the contractual milestones, a defensible logic network, durations you can justify, and a narrative explaining the basis. Roughly three weeks of work for one competent planner.',
      lesson: 'A letter that recites ten previous letters and names a remedy is the last stop before the remedy. Answer it with a dated plan, even if the programme itself is not ready.',
    },
  },
  {
    d: '17 Jun 2025', dir: 'in', no: 'ER/317', rem: 11, t: 'Eleventh and final reminder', key: true,
    s: 'Seven days, to 24 June 2025. "A material non-conformance." Withholding payment certificates and default notices are both named.',
    deep: {
      asks: [
        'Submit the complete and compliant Baseline Work Schedule and Narrative Report within seven calendar days — by 24 June 2025, "without exception".',
        'Immediately activate and mobilise the Planning Engineer.',
      ],
      quote: 'This failure has now become a material non-conformance affecting your overall project management and schedule control.',
      means: 'The fifteen days given in the tenth reminder came and went. "Material non-conformance" is deliberate language — it points at the default machinery. The remedies named are withholding Interim Payment Certificates and default notices under the Conditions.',
      lesson: 'Two and a half months of silence after a final warning is the most expensive thing on this page. Even "the programme will be with you on 9 July, here is the interim critical path" would have changed the tone of everything that followed.',
    },
  },
  {
    d: '9 Jul 2025', dir: 'out', t: 'Baseline Schedule submitted', key: true,
    s: 'Thirteen months after the Notice to Commence. The Engineer later confirms this date.',
    deep: {
      means: 'Submission is not acceptance. From here the argument stops being about whether a programme exists and starts being about whether it complies — which is a much more technical fight, and one the Contractor is better placed to win.',
    },
  },
  {
    d: '10 Aug 2025', dir: 'out', no: '442', t: 'Response to the Engineer\'s observations',
    s: 'The Contractor answers the review comments point by point.',
    deep: { means: 'The Engineer calls this response "detailed" and the cooperation "greatly appreciated" — the only warm sentence in two years of correspondence.' },
  },
  {
    d: '15 Sep 2025', dir: 'in', no: 'ER/440', t: 'Submission accepted as made',
    s: 'The Engineer confirms the submission was duly made on 9 July 2025, and thanks the Contractor for the responses.',
    deep: {
      quote: 'The Engineer remains hopeful that the Baseline Schedule will receive the required approval in a timely manner. The Engineer also stands ready to provide any support necessary to facilitate this approval process.',
      means: 'A deliberate reset. The Engineer also records that its reasons for treating the baseline as a suspended activity stand — so the record of default is preserved even while the tone softens.',
      lesson: 'When the other side offers a reset, take it in writing and move fast. There were ten clear weeks here.',
    },
  },
  {
    d: '5 Nov 2025', dir: 'out', no: '551', t: 'Updated revised schedule, progress to month 17',
    s: 'Now it carries actual progress — and a completion date past 11 April 2028, because of delays the Contractor attributes to the Employer.',
    deep: {
      means: 'This is the category error at the heart of the whole saga. A baseline is the plan. An update is the record. Putting seventeen months of actual progress and an extended finish date into the file being offered as the baseline asks the Engineer to accept, in one document, both a programme and a delay claim.',
      p6: 'Two separate P6 projects: TKV-BASELINE (no actuals, data date at NTC, finish 11 April 2028) and TKV-UPDATE-MMM-YY (actuals to the data date, forecast finish wherever the logic puts it). The update is compared against the baseline; it never replaces it.',
      lesson: 'Never ask one file to be both the plan and the argument about the plan.',
    },
  },
  {
    d: '6 Nov 2025', dir: 'm', t: 'Coordination meeting', key: true,
    s: 'Agreed: strip the actuals and the delay out, and pull the finish back onto the contract date.',
    deep: {
      means: 'The right decision, reached a year late. Everything the Engineer instructs five days later comes from this meeting.',
    },
  },
  {
    d: '11 Nov 2025', dir: 'in', no: 'ER/528', t: 'Instruction under Clause 41', quote: true,
    s: '"Even after a lapse of seventeen (17) months." Six specific instructions, and the first full description of what an acceptable baseline contains.',
    deep: {
      asks: [
        'Remove all actual progress data and delay-related information from the submitted schedule.',
        'Adjust it so the overall completion date coincides with the original contractual date of 11 April 2028.',
        'Make every activity duration realistic and justifiable from intended production rates, available resources and logical sequencing.',
        'Provide a Narrative Report setting out the basis of schedule — duration assumptions, crew sizes, working hours, a critical path description.',
        'Reference the latest approved drawings, technical documents and design data the schedule is built on.',
        'Cost- and resource-load it fully, labour and non-labour, to allow progress measurement, earned value analysis and cash-flow monitoring.',
      ],
      quote: 'The Contractor has not yet succeeded in producing an acceptable Baseline Schedule for approval even after a lapse of seventeen (17) months. Furthermore, the Contractor has not been regularly submitting updated schedules along with the Monthly Progress Reports, as required.',
      means: 'This is the most useful letter the Engineer ever sent — it is a specification. Every item is a thing that can be built and shown. Nine days later the Contractor delivers against it.',
      p6: 'In order: restore the baseline copy and clear actuals; set the must-finish-by constraint to 11 April 2028; rebuild durations from quantity ÷ production rate; write the narrative; cite the drawing revisions; then load resources and cost against every activity.',
      lesson: 'A letter that lists six concrete deliverables is a gift. Answer it item by item, in the same order, with the same numbering.',
    },
  },
  {
    d: '20 Nov 2025', dir: 'out', no: '575', t: 'Project Detailed Baseline L-3 Schedule + Narrative', key: true,
    s: 'Primavera P6 Professional 24.12. 560 activities. Two calendars. Seventeen pages of narrative, TKV-SINO-SCH-003 Rev 0.',
    deep: {
      asks: [
        'Schedule: 560 activities from pre-construction through engineering, procurement, construction and testing to project close-out.',
        'Calendars: TK-V_7 days and TK-V_Monsoon 7 days — 22 working hours a day across two shifts, seven days a week.',
        'WBS: Project General · Engineering · Procurement · Construction · Testing & Commissioning.',
        'Activity codes: GNL, KMS, PMS, ENG, PRO, PRE, CON, TCM, FCO — then A1–A4 for the adits, F1–F7 for the headrace faces, PHC, TRC, MAT, SGC, VPS, TRT, OST and the rest.',
        'Appendices: detailed WBS, the schedule itself, a critical-path schedule, a cost-based WBS summary, S-curves, and the HRT and tunnel activity calculation sheets.',
      ],
      means: 'Judged as a document this is a proper submission — the structure, the coding and the narrative are all there. What is missing is the two things the Engineer had asked for most often: milestone dates that match the Contract, and resource loading.',
      p6: 'The published key milestone table in this revision runs from the Letter of Acceptance on 28 April 2024 to a completion date of 12 April 2028. Both ends of that table are about to be rejected.',
    },
  },
  {
    d: '10 Dec 2025', dir: 'in', no: 'ER/558', t: 'Review comments — seven non-compliances', key: true,
    s: 'Milestone dates, the monsoon calendar twice, tailrace sequencing, no resource loading, the wrong completion date, and one activity that should not exist.',
    deep: {
      asks: [
        'Revise the completion milestone dates to comply with GCC/SCC 41.2 — Annex 1 compares all 41 of them.',
        'Apply the Monsoon Calendar to the Spillway Tunnel Outlet and Terminal Structure activities.',
        'Apply it to the Tailrace Outlet Structure activities too.',
        'Correct the Tailrace Outlet sequence: excavation → first-stage concrete → HM embedded parts → second-stage concrete, all Finish-to-Start; and add the missing predecessors and successors on the Outlet Portal and Tailbay.',
        'Incorporate resource loading.',
        'Correct the Project Completion Date to 11 April 2028.',
        'Delete activity TKV-KMS-100 so the Original Project Duration reads 1,403 calendar days.',
      ],
      quote: 'The approved Baseline Schedule will serve as the contractual reference for progress monitoring, performance evaluation, and assessment of any future claims or variations, in accordance with Sub-Clause 42.1.',
      means: 'Read the list again and notice what it is not: there is no complaint about the WBS, the coding, the activity count or the narrative. Six of the seven are a fortnight of work. The seventh — milestone dates — is the one that cannot be fixed by working harder, because it means admitting the programme cannot hit the contractual days.',
      p6: 'Comments 2 and 3 are one action in Primavera: select the affected activities, assign TK-V_Monsoon 7 days, reschedule. Comment 4 is relationships. Comment 5 is resource assignments. Comments 6 and 7 are a constraint and a delete.',
      lesson: 'Sort review comments into "mechanical" and "structural" the day they arrive. Do the mechanical ones immediately so the only thing left on the table is the real disagreement.',
    },
  },
  {
    d: '14 Dec 2025', dir: 'out', no: '633', t: 'Revised baseline + clarifications', key: true,
    s: 'The Contractor fixes most of it, attaches the minutes of 18 March 2024, and holds its ground on three points.',
    deep: {
      asks: [
        'Milestones: flexibility was agreed at the clarification meeting of 18 March 2024 — the signed minutes are attached.',
        'Resource loading: included, but the baseline is established on cost loading; resource loading is indicative.',
        'Completion: 12 April 2028 stands.',
        'Activity TKV-KMS-100 is removed and the milestone table now starts at the Notice to Commence.',
      ],
      means: 'Rev 1 of the narrative shows the work that was done: the Letter of Acceptance milestone is gone, six of the fourteen remaining milestone dates have moved, and the four turbine-generator concrete finishes are pulled together onto 31 January 2028. The Contractor answered the mechanical comments and argued the structural ones.',
      p6: 'Compare Rev 0 and Rev 1 in the window above. The difference is exactly what a real revision looks like — and exactly why the completion date staying at 12 April 2028 stands out.',
      lesson: 'Attaching the minutes was right. Relying on them instead of also fixing the dates was not — you can comply under protest, and keep the argument alive in the covering letter.',
    },
  },
  {
    d: '5–11 Jan 2026', dir: 'm', t: 'A week of meetings at the Engineer\'s office',
    s: 'The Contractor\'s planning team and the Engineer go through the programme together.',
    deep: {
      means: 'Thirteen months after the same offer was made in letter 108. The Engineer records afterwards that nothing said in those meetings amended anything.',
      lesson: 'Minute technical meetings yourself and issue the minutes. Whoever writes them owns what was agreed.',
    },
  },
  {
    d: '13 Jan 2026', dir: 'in', no: 'ER/633', t: 'Non-compliance — resubmit', quote: true, key: true,
    s: 'Three rulings: a meeting cannot amend the Contract, resource loading is binding, and the completion date is 11 April 2028.',
    deep: {
      asks: [
        'Reinstate the contractual Project Completion Date.',
        'Bring all sectional and intermediate milestones, activity dates, logical links and sequencing — including the monsoon period — into strict compliance with SCC 41.2.',
        'Demonstrate a coherent and realistic integration of logic, sequencing, durations, cost loading and resource loading.',
        'Resubmit. Compliance is stated as a condition precedent to any acceptance.',
      ],
      quote: 'Discussions in clarification meetings cannot amend, vary, or override the explicit provisions of the Contract unless such changes are formally affected through a written contractual amendment or instruction. No such amendment or instruction has been issued to date.',
      means: 'The Engineer also refuses the cost-loading argument outright: resource loading is "an integral part of the programme and subject to the Engineer\'s review", and the revised submission still had activities with no resource assigned at all. On the completion date it gives the arithmetic explicitly — Commencement Date + (Time for Completion − 1 calendar day).',
      p6: 'Every one of the three is a setting, not an opinion: milestone constraints, resource assignments, and a project finish constraint. None of them was ever in dispute technically.',
      lesson: 'When the same three items come back in a second review letter, they are no longer review comments. They are the grounds on which acceptance will be refused.',
    },
  },
  {
    d: 'Mar 2026', dir: 'in', no: 'ER/716', t: 'Determination on EOT-01', key: true, end: true,
    s: 'No accepted baseline, so no critical path the Engineer has to accept. Thirteen events screened against the PCC 2.2 milestones instead. 228 days on one. Nil cost.',
    deep: {
      quote: 'No baseline programme had been accepted, so the Engineer refused a normal critical-path analysis and used milestone screening instead.',
      means: 'This is the bill for everything above. A 130-page Evaluation and Determination tests twelve delay events against six gates — trigger, notice, facts, critical-path impact, mitigation, cost proof. Gate four cannot be passed by anybody when there is no agreed programme, so the Engineer measured against the PCC 2.2 milestones and awarded 228 days for the land acquisition and tree-cutting permits alone. Everything else failed. Cost failed everywhere, because idle non-redeployable resources were never proved — which is what resource loading would have shown.',
      lesson: 'The two things the Engineer asked for most often across twenty-two months — contractual milestones and resource loading — are precisely the two things whose absence killed the claim. That is not a coincidence. It is the same document doing the same job at both ends of the contract.',
    },
  },
];

/* ── lessons ────────────────────────────────────────────────────── */
const LESSONS = [
  { t: 'The baseline is a claims document', s: 'It looks like a planning chore. It is the instrument that decides every extension of time you will ever ask for. Sub-Clause 42.1 measures delay against an accepted programme; without one, the Engineer chooses the measuring stick.' },
  { t: 'Staff it before you need it', s: 'Six of the eleven reminders also asked for a Planning Engineer. The absence of one person for a year cost more than the person would have.' },
  { t: 'Take the joint-programming offer', s: 'In November 2024 the Engineer offered to build the programme together with its own planner. Doing that would have made the Engineer a co-author of the thing it later refused to accept.' },
  { t: 'A baseline holds no actuals', s: 'The month-17 update was rejected as a baseline because it carried progress and delay. Baseline first, updates after. Keep them as separate files, and say which is which in the subject line.' },
  { t: 'Calendars are contract terms', s: 'Two comments out of seven were about the monsoon calendar not being assigned. In Nepal the monsoon is not weather, it is a scheduling constraint you agreed to.' },
  { t: 'Check the arithmetic of your own completion date', s: 'Commencement + Time for Completion − 1 day. One day wrong, rejected twice, in writing, months apart.' },
  { t: 'A meeting cannot amend a contract', s: 'The Employer did agree to milestone flexibility in March 2024, in signed minutes. It was still worthless, because nobody turned it into a written amendment or an instruction. If a concession matters, get it issued under 33.2 or as an addendum.' },
  { t: 'Resource loading is not decoration', s: 'The Contractor argued cost loading was enough. The Engineer\'s answer: resource loading is how you show the plan is physically possible, and a programme that cannot be resourced is not a programme.' },
  { t: 'Every reminder is evidence', s: 'Eleven reminders, each listing the ten before it, is a ready-made record of default. It was quoted straight back in the determination.' },
];

export default function baseline(view, { ctx }) {
  ctx.crumbs([{ label: 'Case files', href: '#/cases' }, { label: 'The baseline' }]);

  view.append(
    hero(),
    sec('What a baseline actually is', 'Start here'),
    whatItIs(),
    sec('The file itself', 'TKV-SINO-SCH-003 · Rev 0 and Rev 1'),
    p6Window(),
    sec('Twenty-two months of letters', 'The correspondence'),
    timeline(),
    sec('The seven non-compliances', 'Engineer\'s letter 558 · 10 December 2025'),
    commentCards(),
    sec('Forty out of forty-one', 'Annex 1 · the milestone gaps'),
    gapChart(),
    sec('Three arguments that decided it', 'Engineer\'s letter 633 · 13 January 2026'),
    fights(),
    sec('What it cost', 'EOT-01'),
    cost(),
    sec('Nine things to take to your next project', 'For the planner'),
    lessons(),
  );

  reveal(view.querySelector('.bl-story'), { selector: '.bl-ev', stagger: 46 });
  reveal(view.querySelector('.bl-comments'), { selector: '.bl-cm', stagger: 56 });
  reveal(view.querySelector('.bl-lessons'), { selector: '.bl-lesson', stagger: 44 });
}

/* ── hero ───────────────────────────────────────────────────────── */
function hero() {
  const fig = (n, label, sub, fmtN) => {
    const b = h('b.bl-fig__n');
    countWhenSeen(b, n, fmtN ? { format: fmtN } : undefined);
    return h('div.bl-fig', b, h('span.bl-fig__l', label), h('small', sub));
  };
  return h('header.bl-hero',
    h('div.bl-hero__text',
      h('p.eyebrow', 'Case study · Tamakoshi V, Lot 1'),
      h('h1.bl-hero__t', 'The programme that', h('br'), h('em', 'never got approved')),
      h('p.lede', 'From the Notice to Commence in June 2024 to the determination in March 2026, the Engineer and the Contractor wrote to each other about one Primavera file more than thirty times. It was never accepted. When twelve delay events were finally valued, there was no agreed programme to measure them against — and eleven of them came back with nothing.'),
      h('div.bl-figs',
        fig(11, 'formal reminders', 'ER/003 → ER/317'),
        fig(22, 'months', 'and still not approved'),
        fig(560, 'activities', 'P6 Professional 24.12'),
        fig(1403, 'calendar days', 'from NTC to completion')),
      h('div.row',
        h('a.btn.btn--stamp', { href: '#/read/41' }, icon('book'), 'Read Clause 41'),
        h('a.btn', { href: '#/cases/eot-01' }, icon('folder'), 'The EOT-01 determination'))),
    h('div.bl-hero__art', { 'aria-hidden': 'true' }, heroArt()));
}

function heroArt() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 380 300');
  const bars = [[40, 30, 120], [60, 46, 180], [80, 74, 90], [100, 56, 210], [120, 96, 150], [140, 120, 170], [160, 140, 120], [180, 132, 200], [200, 176, 110], [220, 190, 140]];
  svg.innerHTML = `
    <rect x="10" y="10" width="360" height="280" rx="8" class="ha-win"/>
    <rect x="10" y="10" width="360" height="26" rx="8" class="ha-bar"/>
    <circle cx="26" cy="23" r="4" class="ha-dot"/><circle cx="40" cy="23" r="4" class="ha-dot"/><circle cx="54" cy="23" r="4" class="ha-dot"/>
    <path d="M118 36V290" class="ha-split"/>
    ${bars.map(([y, x, w], i) => `
      <rect x="24" y="${y - 5}" width="${70 - (i % 3) * 8}" height="7" rx="2" class="ha-row"/>
      <rect x="${x + 20}" y="${y - 6}" width="${w}" height="9" rx="2" class="ha-gantt${i === 4 || i === 7 ? ' ha-gantt--crit' : ''}" style="--i:${i}"/>`).join('')}
    <path d="M150 36V290" class="ha-dd"/>
    <text x="154" y="48" class="ha-lbl">data date</text>
    <g class="ha-stamp"><rect x="196" y="196" width="150" height="56" rx="4"/>
      <text x="271" y="222" text-anchor="middle">NOT</text>
      <text x="271" y="243" text-anchor="middle">APPROVED</text></g>`;
  return svg;
}

/* ── what it is ─────────────────────────────────────────────────── */
function whatItIs() {
  return h('div.bl-what',
    h('div.bl-what__main',
      h('p.bl-lead', rich('A baseline is the plan you and the Engineer both agree to be judged against. Sub-Clause 41 makes you produce one. **Everything else in the contract then leans on it.**')),
      h('ul.bl-what__list',
        h('li', h('b', 'Progress'), h('span', rich('Percentage complete only means something against a plan. Without one, "behind schedule" is an opinion.'))),
        h('li', h('b', 'Extensions of time'), h('span', rich('PCC 42.1 asks whether the event delayed the critical path. The critical path lives in the accepted programme. No programme, no critical path.'))),
        h('li', h('b', 'Money'), h('span', rich('Prolongation cost is time × resources. The time comes from the programme, and idle resources are proved against the resource loading in it.'))),
        h('li', h('b', 'Liquidated damages'), h('span', rich('LDs are counted from a completion date. Every argument about that date is an argument about the programme.')))),
      h('p.bl-note', icon('info'), h('span', rich('The Engineer put it plainly in reminder ten: *"without an approved baseline, there is no agreed benchmark against which progress can be objectively measured… the project is operating without a roadmap."*')))),
    h('aside.bl-what__side',
      h('div.folder', { dataset: { tab: 'The clauses' } },
        h('div.chips', ['41', '41.2', '42.1', '35.7', '2.2'].map((c) => refChip(c))),
        h('p.muted', 'Clause 41 is the obligation. SCC/PCC 41.2 and 2.2 hold the milestone days. 42.1 is where the programme decides whether you get time.'))));
}

/* ═══════════════ THE P6 WINDOW ═══════════════ */
function p6Window() {
  let rev = 0;
  let monsoon = false;
  let critical = true;

  const START = D('01-Jan-24');
  const END = D('01-Oct-28');
  const span = END - START;
  const x = (d) => ((d - START) / span) * 100;

  const rowsBox = h('div.p6__rows');
  const chartBox = h('div.p6__chart');
  const counter = h('span.p6__count');

  const toggle = (label, on, fn, ic) => {
    const b = h('button.p6__tg', { type: 'button', 'aria-pressed': String(on) }, icon(ic), label);
    b.addEventListener('click', () => { const next = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(next)); fn(next); });
    return b;
  };

  const revBtns = ['Rev 0 · 20 Nov 2025', 'Rev 1 · 14 Dec 2025'].map((label, i) =>
    h('button', { type: 'button', 'aria-pressed': String(i === 0), onclick: (e) => {
      rev = i;
      [...e.currentTarget.parentNode.children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      draw();
    } }, label));

  function rowsFor() {
    const out = [];
    for (const [key, label, code] of WBS) {
      const items = MILESTONES.filter((m) => m.wbs === key && (rev === 0 ? m.r0 : m.r1));
      if (!items.length) continue;
      out.push({ wbs: true, label, code, key });
      for (const m of items) out.push({ m, date: D(rev === 0 ? m.r0 : m.r1) });
    }
    return out;
  }

  function draw() {
    const rows = rowsFor();
    const list = [];
    const bars = [];
    let i = 0;

    /* summary bars: drawn between a published start and finish pair */
    const pairs = {};
    for (const r of rows) if (r.m?.pair) (pairs[r.m.pair] ??= []).push(r.date);

    for (const r of rows) {
      if (r.wbs) {
        list.push(h('div.p6__r.p6__r--wbs', h('span.p6__tri', '▾'), h('span.p6__nm', r.label), h('span.p6__id', r.code)));
        const mine = rows.filter((z) => z.m && z.m.wbs === r.key).map((z) => z.date);
        const a = new Date(Math.min(...mine));
        const b = new Date(Math.max(...mine));
        bars.push(h('div.p6__b--wbs', { style: { '--i': i, left: `${x(a)}%`, width: `${Math.max(x(b) - x(a), 0.4)}%` } }));
        i++;
        continue;
      }
      const m = r.m;
      const dur = m.pair && pairs[m.pair]?.length === 2 ? Math.round((pairs[m.pair][1] - pairs[m.pair][0]) / 86400000) : 0;
      list.push(h(`div.p6__r${m.critical ? '.is-crit' : ''}`,
        h('span.p6__id', m.id),
        h('span.p6__nm', m.name, m.note ? h('i.p6__flag', m.note) : null),
        h('span.p6__num', m.pair && !m.end ? `${dur}d` : '0d'),
        h('span.p6__dt', fmt(r.date))));

      if (m.pair && !m.end) {
        const [a, b] = pairs[m.pair];
        bars.push(h(`div.p6__b${critical && m.wbs === 'phc' ? '.p6__b--crit' : ''}`, { style: { '--i': i, left: `${x(a)}%`, width: `${Math.max(x(b) - x(a), 0.5)}%` } },
          h('i.p6__blabel', `${dur}d`)));
      } else {
        bars.push(h(`div.p6__ms${m.critical ? '.p6__ms--crit' : ''}`, { style: { '--i': i, left: `${x(r.date)}%` } }, h('i', fmt(r.date))));
      }
      i++;
    }

    mount(rowsBox, list);
    chartBox.style.setProperty('--rows', i);
    mount(chartBox,
      h('div.p6__grid', years()),
      monsoon ? h('div.p6__monsoons', monsoonBands()) : null,
      h('div.p6__now', { style: { left: `${x(DATA_DATE)}%` } }, h('i', 'data date · 28-Apr-24')),
      h('div.p6__cod', { style: { left: `${x(CONTRACT_COD)}%` } }, h('i', 'contract completion · 11-Apr-28')),
      h('div.p6__bars', bars));

    counter.textContent = rev === 0 ? '15 milestone rows · 560 activities in the full file' : '14 milestone rows · TKV-KMS-100 removed';
  }

  function years() {
    const out = [];
    for (let y = 2024; y <= 2028; y++) {
      const a = new Date(y, 0, 1);
      const b = new Date(y + 1, 0, 1);
      out.push(h('div.p6__yr', { style: { left: `${x(a)}%`, width: `${x(b) - x(a)}%` } }, h('span', y)));
      out.push(h('div.p6__yl', { style: { left: `${x(a)}%` } }));
      for (let q = 1; q < 4; q++) out.push(h('div.p6__q', { style: { left: `${x(new Date(y, q * 3, 1))}%` } }));
    }
    return out;
  }

  function monsoonBands() {
    const out = [];
    for (let y = 2024; y <= 2028; y++) {
      const a = new Date(y, 5, 1);
      const b = new Date(y, 8, 30);
      out.push(h('div.p6__mon', { style: { left: `${x(a)}%`, width: `${x(b) - x(a)}%` } }));
    }
    return out;
  }

  const win = h('section.p6',
    h('div.p6__chrome',
      h('span.p6__dots', h('i'), h('i'), h('i')),
      h('span.p6__title', 'Primavera P6 Professional 24.12 — TKV · Project Detailed Baseline L-3 Schedule'),
      h('span.p6__file.mono', 'TKV-SINO-SCH-003')),
    h('div.p6__tools',
      h('div.seg.p6__rev', revBtns),
      toggle('Monsoon calendar', false, (v) => { monsoon = v; draw(); }, 'rain'),
      toggle('Longest chain', true, (v) => { critical = v; draw(); }, 'bolt'),
      counter),
    h('div.p6__pane',
      h('div.p6__table',
        h('div.p6__head', h('span.p6__id', 'Activity ID'), h('span.p6__nm', 'Activity Name'), h('span.p6__num', 'OD'), h('span.p6__dt', 'Finish')),
        rowsBox),
      h('div.p6__gantt', chartBox)),
    h('div.p6__legend',
      h('span', h('i.lg.lg--wbs'), 'WBS summary'),
      h('span', h('i.lg.lg--bar'), 'Activity'),
      h('span', h('i.lg.lg--crit'), 'Longest published chain'),
      h('span', h('i.lg.lg--ms'), 'Milestone'),
      h('span', h('i.lg.lg--mon'), 'Monsoon (Jun–Sep)'),
      h('span.muted', 'Rows and dates come from the milestone table in the Contractor\'s own Narrative Report, Rev 0 and Rev 1. The real critical path was never published, so the highlighted run is simply the longest span between two published milestones.')));

  draw();

  return h('div.stack',
    h('p.bl-lead', rich('The file the argument was about: **560 activities** in Primavera P6 Professional 24.12, two calendars — `TK-V_7 days` and `TK-V_Monsoon 7 days`, 22 hours a day across two shifts — hung on a Work Breakdown Structure of Project General, Engineering, Procurement, Construction and Testing & Commissioning, with activity codes like `TKV-CON-PHC-000` and `TKV-PMS-41`.')),
    win,
    h('div.bl-oneday',
      h('div.bl-oneday__z',
        h('span.bl-oneday__l', h('b', '11 Apr 2028'), h('small', 'the Contract')),
        h('span.bl-oneday__gap', h('i'), h('em', '1 day')),
        h('span.bl-oneday__r', h('b', '12 Apr 2028'), h('small', 'the submission'))),
      h('div',
        h('h4', 'The one day that would not go away'),
        h('p', rich('Commencement Date + (Time for Completion − 1 calendar day). 9 June 2024 plus 1,403 days, minus one, is 11 April 2028. The programme said the 12th. The Engineer rejected it in letter 558, the Contractor kept it, and the Engineer rejected it again in letter 633 five weeks later. Two months of correspondence over a single calendar day — because a completion date is the one number in the file that liquidated damages are counted from.')))));
}

/* ── the correspondence ─────────────────────────────────────────── */
function timeline() {
  const wrap = h('div.bl-story');
  let open = null;

  STORY.forEach((e, i) => {

    const tag = e.dir === 'in' ? 'Engineer → us' : e.dir === 'out' ? 'Us → Engineer' : e.dir === 'm' ? 'Meeting' : 'Contract event';

    const deep = e.deep || {};
    const panel = h('div.bl-deep', { hidden: true },
      deep.asks?.length
        ? h('section.bl-deep__b',
          h('h5.bl-deep__h', icon('list'), e.dir === 'in' ? 'What it asks for' : 'What it says'),
          h('ul.bl-deep__asks', deep.asks.map((x) => h('li', h('span', rich(x))))))
        : null,
      deep.quote
        ? h('blockquote.bl-deep__q', h('p', deep.quote), h('cite', e.no ? `Letter ${e.no}` : e.t))
        : null,
      deep.means
        ? h('section.bl-deep__b', h('h5.bl-deep__h', icon('eye'), 'What it means'), h('p', rich(deep.means)))
        : null,
      deep.p6
        ? h('section.bl-deep__b.bl-deep__b--p6', h('h5.bl-deep__h', icon('gantt'), 'In Primavera'), h('p', rich(deep.p6)))
        : null,
      deep.lesson
        ? h('p.bl-deep__lesson', h('b', 'Take away: '), h('span', rich(deep.lesson)))
        : null);

    const hasDeep = !!(deep.asks || deep.quote || deep.means || deep.p6 || deep.lesson);

    const more = hasDeep
      ? h('button.bl-ev__more', { type: 'button', 'aria-expanded': 'false' }, h('span', 'Read the letter'), icon('arrow'))
      : null;

    const card = h(`article.bl-ev.bl-ev--${e.dir}${e.key ? '.is-key' : ''}${e.end ? '.is-end' : ''}${hasDeep ? '.has-deep' : ''}`, { style: { '--i': i } },
      h('div.bl-ev__when', h('span.bl-ev__d', e.d), e.no ? h('span.bl-ev__no.mono', e.no) : null),
      h('div.bl-ev__body',
        h('div.bl-ev__top',
          h('span.bl-ev__tag', tag),
          e.rem ? h('span.bl-ev__count', `reminder ${e.rem} of 11`) : null),
        h('h4.bl-ev__t', e.t),
        e.s ? h(`p.bl-ev__s${e.quote ? '.is-quote' : ''}`, e.s) : null,
        more, panel));

    if (more) {
      more.addEventListener('click', () => {
        const opening = panel.hidden;
        if (open && open !== card) {
          open.classList.remove('is-open');
          open.querySelector('.bl-deep').hidden = true;
          open.querySelector('.bl-ev__more').setAttribute('aria-expanded', 'false');
          mount(open.querySelector('.bl-ev__more > span'), 'Read the letter');
        }
        panel.hidden = !opening;
        card.classList.toggle('is-open', opening);
        more.setAttribute('aria-expanded', String(opening));
        mount(more.querySelector('span'), opening ? 'Close' : 'Read the letter');
        open = opening ? card : null;
        if (opening) reveal(panel, { selector: '.bl-deep__b, .bl-deep__q, .bl-deep__lesson', stagger: 50 });
      });
    }

    wrap.append(card);
  });

  return wrap;
}

/* ── the seven comments ─────────────────────────────────────────── */
function commentCards() {
  return h('div.bl-comments', COMMENTS.map((c) => h('article.bl-cm',
    h('span.bl-cm__n', String(c.n).padStart(2, '0')),
    h('div',
      h('h4.bl-cm__t', c.t),
      h('p.bl-cm__p6', icon('gantt'), h('span', h('b', 'In P6: '), c.p6)),
      h('p.bl-cm__f', rich(c.fix)),
      h('div.chips', refChip(c.ref))))));
}

/* ── the gap chart ──────────────────────────────────────────────── */
function gapChart() {
  const sorted = [...GAPS].sort((a, b) => a - b);
  const max = Math.max(...GAPS.map(Math.abs));
  const late = GAPS.filter((g) => g < 0).length;
  const box = h('div.bl-gaps');
  const bars = h('div.bl-gaps__plot', sorted.map((g, i) => h(`div.bl-gaps__b${g < 0 ? '.is-late' : '.is-early'}`, {
    style: { '--i': i, '--h': `${(Math.abs(g) / max) * 100}%` },
    title: `${g < 0 ? Math.abs(g) + ' days later than the Contract' : g + ' days earlier than the Contract'}`,
  }, h('i', Math.abs(g)))));

  const n = h('b');
  countWhenSeen(n, 40);
  box.append(
    h('p.bl-lead', rich('Annex 1 to letter 558 set every intermediate milestone in the programme against the day stated in SCC 41.2, counted from the Notice to Commence. Forty of the forty-one were marked *"to be corrected"*. The bars below are those forty-one gaps, sorted — each one a milestone the Contractor\'s own schedule said it would hit on a different day from the Contract.')),
    h('div.bl-gaps__key',
      h('span.bl-gaps__stat', n, h('small', 'of 41 milestones out')),
      h('span.bl-gaps__stat', h('b', late), h('small', 'later than the Contract')),
      h('span.bl-gaps__stat', h('b', '860'), h('small', 'days — the worst single gap')),
      h('span.bl-gaps__stat', h('b', '1'), h('small', 'marked "Ok"'))),
    h('div.bl-gaps__axis', h('span', 'behind the contractual day'), h('span', 'ahead')),
    bars,
    h('p.muted', 'Sorted smallest gap to largest; each bar is one milestone row from the Annex.'));

  if (!still()) {
    const io = new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { bars.classList.add('is-in'); o.disconnect(); } }, { threshold: 0.2 });
    io.observe(bars);
  } else bars.classList.add('is-in');
  return box;
}

/* ── the three arguments ────────────────────────────────────────── */
function fights() {
  const F = [
    {
      t: 'Does a meeting change the contract?',
      us: 'In the clarification meetings of 4, 6 and 18 March 2024, the Employer agreed to flexibility on the intermediate milestone days, subject to the overall completion day. Here are the signed minutes.',
      them: 'Discussions in clarification meetings cannot amend, vary or override the explicit provisions of the Contract unless formally effected through a written contractual amendment or instruction. No such amendment has been issued. The milestone dates under SCC 41.2 remain contractual and binding.',
      verdict: 'The Engineer wins — and the Contractor was right about the facts. A concession that is never turned into an amendment or a 33.2 instruction is worth nothing when it is needed.',
      ref: '41.2',
    },
    {
      t: 'Is resource loading binding?',
      us: 'The baseline is established on cost loading. Resource loading is indicative and does not bear on activity logic, sequencing or durations.',
      them: 'Resource loading is an integral part of the programme and subject to the Engineer\'s review. The Baseline shall only be considered for acceptance when it demonstrates a coherent and realistic integration of logic, sequencing, durations, cost loading and resource loading.',
      verdict: 'The Engineer wins. Resource loading is how you prove the plan is physically possible — and, later, how you prove which resources stood idle when somebody else caused the delay.',
      ref: '41',
    },
    {
      t: 'Which day does the contract finish on?',
      us: '12 April 2028.',
      them: 'Project Completion Date = Commencement Date + (Time for Completion − 1 calendar day). With a Time for Completion of 1,403 calendar days, the correct date is 11 April 2028. The date shown is rejected.',
      verdict: 'The Engineer wins, twice, in writing, five weeks apart. Check the arithmetic on the one date the whole contract is measured from.',
      ref: '41.2',
    },
  ];
  return h('div.bl-fights', F.map((f, i) => h('article.bl-fight', { style: { '--i': i } },
    h('h4.bl-fight__t', f.t),
    h('div.bl-fight__two',
      h('div.bl-fight__side.is-us', h('span.eyebrow', 'The Contractor'), h('p', f.us)),
      h('div.bl-fight__side.is-them', h('span.eyebrow', 'The Engineer'), h('p', f.them))),
    h('p.bl-fight__v', stampWhenSeen(stamp('Held', 'tape', -4)), h('span', rich(f.verdict))),
    h('div.chips', refChip(f.ref)))));
}

/* ── what it cost ───────────────────────────────────────────────── */
function cost() {
  const big = h('b.bl-cost__n');
  countWhenSeen(big, 228);
  return h('div.bl-cost',
    h('div.bl-cost__main',
      h('p.bl-lead', rich('In March 2026 the Engineer issued a 130-page Evaluation and Determination on the supplementary EOT-01 claim: twelve delay events, tested against six gates — trigger, notice, facts, critical-path impact, mitigation, cost proof.')),
      h('p', rich('**Because no baseline programme had been accepted, the Engineer refused to run a normal critical-path analysis at all.** It fell back on screening the events against the PCC 2.2 milestones. Against Milestone 1 it measured 228 days for the land acquisition and tree-cutting permits. Every other event failed — and cost failed everywhere, because idle, non-redeployable resources could not be proved.')),
      h('div.row',
        h('a.btn.btn--stamp', { href: '#/eot' }, icon('clock'), 'How the EOT was submitted', icon('arrow')),
        h('a.btn', { href: '#/cases/eot-01' }, icon('folder'), 'The case file'))),
    h('div.bl-cost__score',
      h('div.bl-cost__row', big, h('span', 'days of extension', h('small', 'on one event, provisional'))),
      h('div.bl-cost__row', h('b.bl-cost__n.is-bad', '11'), h('span', 'of 12 events got nothing', h('small', 'mostly on notice, programme and proof'))),
      h('div.bl-cost__row', h('b.bl-cost__n.is-bad', 'NPR 0'), h('span', 'prolongation cost', h('small', 'nothing was proved')))));
}

/* ── lessons ────────────────────────────────────────────────────── */
function lessons() {
  return h('div.bl-lessons', LESSONS.map((l, i) => h('article.bl-lesson', { style: { '--i': i } },
    h('span.bl-lesson__n', String(i + 1).padStart(2, '0')),
    h('h4', l.t),
    h('p', rich(l.s)))));
}
