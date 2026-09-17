/* ═══════════════════════════════════════════════════════════════
   THE CLAIM WORKSHOP — course content.

   Written for this course. The subject — how to build and present a
   construction claim — is ordinary professional ground, and the
   worked examples here come from the Tamakoshi V correspondence.

   The CEES framework (Cause, Effect, Entitlement, Substantiation) is
   named and credited to Andy Hewitt, whose book is the standard text
   on this subject and is listed under Further reading. Everything on
   these pages is explained in our own words, with our own examples;
   this course points at that book, it does not replace it.
   ═══════════════════════════════════════════════════════════════ */

export const CHAPTERS = [
  { id: 'start', no: '01', label: 'Start here', icon: 'start', title: 'Why the document decides it' },
  { id: 'cees', no: '02', label: 'CEES', icon: 'cees', title: 'The four things every claim must prove' },
  { id: 'types', no: '03', label: 'Types', icon: 'types', title: 'Which claim are you actually making?' },
  { id: 'before', no: '04', label: 'Before', icon: 'before', title: 'What to do before you write a word' },
  { id: 'binder', no: '05', label: 'The binder', icon: 'binder', title: 'How the submission is put together' },
  { id: 'style', no: '06', label: 'Writing', icon: 'style', title: 'Sentences that survive a reviewer' },
  { id: 'proof', no: '07', label: 'Proof', icon: 'proof', title: 'Substantiation and exhibits' },
  { id: 'response', no: '08', label: 'The response', icon: 'response', title: 'Answering a claim, and determining one' },
  { id: 'worked', no: '09', label: 'Worked example', icon: 'worked', title: 'One claim, built end to end' },
  { id: 'drill', no: '10', label: 'Practice', icon: 'drill', title: 'Ten drills' },
];

/* ═══════════ 01 · START HERE ═══════════ */

export const OPENING = {
  lede: 'A claim is a piece of persuasive writing. Not a form, not a demand, not a complaint. Someone will sit down with your document, read it once, and decide whether you get paid. Everything in this course is about that one reading.',
  paras: [
    'Most claims that fail are not weak claims. They are good claims, badly presented — a two-page letter with a folder of documents attached, leaving the reviewer to work out the argument for themselves. Reviewers do not do that work for you. They reject what they cannot follow.',
    'The standard you are writing to is the **balance of probabilities**. You do not have to prove your case beyond doubt. You have to make it *more likely than not* that you are right — and you have to make that easy to see.',
    'So the job has two halves. Get the substance right: cause, effect, entitlement, substantiation. Then present it so that a tired person reading it on a Thursday afternoon reaches your conclusion without having to think too hard.',
  ],
};

export const REVIEWER = {
  title: 'Write for one person',
  intro: 'Picture the reviewer. It helps enormously.',
  traits: [
    { t: 'They are busy', s: 'Your claim is one of several things on their desk. If the argument is not visible in the first two pages, it may never be found at all.' },
    { t: 'They do not know your project', s: 'They may have joined last month. They were not at the meeting. Explain everything, from the beginning, every time.' },
    { t: 'They have to justify their answer', s: 'A reviewer who agrees with you has to defend that to the Employer. Give them the words to do it — clean findings they can lift straight into their determination.' },
    { t: 'They are human', s: 'Make their life difficult and they will not stretch a point in your favour. Make it easy and they might.' },
    { t: 'They will look for the gap', s: 'Anything you leave out, they will notice. Anything weak in your case, they will find. Better that you raise it first, on your own terms.' },
  ],
};

export const BALANCE = {
  title: 'The balance of probabilities',
  s: 'The scale starts level. Every fact you prove tips it your way; every gap tips it back. You do not need certainty — you need the scale to come down on your side and stay there.',
  weights: [
    { t: 'A dated site record', w: 18, good: true, why: 'Written on the day. Almost impossible to argue with.' },
    { t: 'A photograph with a visible date', w: 14, good: true, why: 'Shows the condition, not just the assertion.' },
    { t: 'The contract clause, quoted correctly', w: 20, good: true, why: 'Turns a complaint into an entitlement.' },
    { t: 'A programme showing the delay', w: 22, good: true, why: 'The only thing that proves the finish moved.' },
    { t: 'Costs from payroll and plant logs', w: 16, good: true, why: 'Real numbers from real records.' },
    { t: '"Significant disruption was caused"', w: 14, good: false, why: 'An adjective. Nothing to weigh.' },
    { t: 'No notice, or a late one', w: 24, good: false, why: 'May end the claim before anyone reads it.' },
    { t: 'A clause quoted from the wrong edition', w: 18, good: false, why: 'One error like this colours the whole document.' },
    { t: 'Cost as a daily rate × days', w: 16, good: false, why: 'Proves no link between any event and any rupee.' },
  ],
};

/* ═══════════ 02 · CEES ═══════════ */

export const CEES = [
  {
    k: 'C', id: 'cause', name: 'Cause', one: 'What happened.',
    long: 'The event itself, stated as fact. A date, a place, a thing that occurred. Nothing about blame yet, nothing about money. Just: on this day, this happened.',
    good: 'On 28 July 2024, heavy rainfall caused a landslide that cut the Jhamarsi Khola access road. The road was impassable to all vehicles from 28 July 2024 until it reopened on 11 September 2024.',
    bad: 'Due to unprecedented monsoon conditions the Contractor has suffered severe disruption to its logistics over an extended period.',
    note: 'The good version has two dates and one fact. The bad version has three adjectives and nothing a reviewer can check.',
    tips: [
      'Give the date. If it ran over a period, give both dates.',
      'Name the place, the work front, the activity.',
      'Say who did what. "The Engineer instructed", not "it was instructed".',
      'Keep opinion out. Cause is the part that should be beyond argument.',
    ],
  },
  {
    k: 'E', id: 'effect', name: 'Effect', one: 'What it did to you.',
    long: 'The link between the event and the harm. This is where most claims are won or lost, because the reviewer has to be able to follow the chain from the thing that happened to the time or money you are asking for.',
    good: 'Delivery of cement and steel to Adit-2 stopped for 46 days. Tunnel drive A2-EXC-120 to A2-EXC-180 could not proceed. These activities were on the critical path in the accepted programme, so the delay moved the Section 2 milestone by 46 days.',
    bad: 'The road closure had a significant impact on the works and caused considerable delay to the project overall.',
    note: 'Effect has two parts and you need both: the physical effect on the work, and the contractual effect on time or money.',
    tips: [
      'Name the activities by their programme ID.',
      'Show that those activities mattered — critical path, or no float left.',
      'Separate time from money. They are two different claims in one document.',
      'If part of the delay was your own fault, say so and deal with it. The reviewer will find it anyway.',
    ],
  },
  {
    k: 'E', id: 'entitlement', name: 'Entitlement', one: 'Why the contract says you get something.',
    long: 'The clause. Without one, everything above is just a sad story. You are pointing at the words the parties signed and saying: this event, under this clause, gives me this remedy.',
    good: 'Sub-Clause 35.4(a) lists failure to give access by the Site Possession Date as a Compensation Event. The Employer was obliged to obtain the permits under Sub-Clause 10.1(a). Notice was given on 31 July 2024 under Sub-Clause 35.1, within the 21 days required.',
    bad: 'The Contractor is clearly entitled to relief for an event outside its control, and it would be unreasonable to expect it to bear this risk.',
    note: 'Fairness is not a clause. One clause that fits beats six that nearly do.',
    tips: [
      'Quote the clause as it appears in *your* contract, amendments included.',
      'Check the number. Citing a clause that does not exist damages everything else you wrote.',
      'Deal with notice here. If the contract has a time bar, show you beat it.',
      'If the other side has a clause that hurts you, raise it and answer it.',
    ],
  },
  {
    k: 'S', id: 'substantiation', name: 'Substantiation', one: 'The paper that proves it.',
    long: 'Every assertion above, backed by a document, referenced so the reviewer can find it in seconds. This is the difference between a claim and an opinion.',
    good: 'Daily Progress Reports for 28 July to 11 September 2024 (Exhibit 4). Photographs dated 28 and 29 July (Exhibit 5). District Road Office closure notice with certified English translation (Exhibit 6). Site stock register showing cement exhausted on 4 August (Exhibit 7).',
    bad: 'Please refer to the attached documents in support of this claim.',
    note: 'Number every exhibit. Cite it at the sentence it proves, not in a list at the end.',
    tips: [
      'Records written at the time beat records written for the claim.',
      'Translate anything not in the contract language, and have it certified.',
      'Do not attach 400 pages hoping something in there helps. Attach what proves the point.',
      'If a record does not exist, say so and explain what you have instead.',
    ],
  },
];

export const CEES_SCENARIOS = [
  {
    id: 'access', label: 'Access blocked by the Employer',
    cause: 'On 1 February the Employer\'s infrastructure contractor dug a trench across the only access road to six work fronts. It was backfilled on 9 February.',
    effect: 'No plant or materials could reach those six fronts for 9 days. The activities affected had no float, so completion moved by 9 days.',
    entitlement: 'The Employer is responsible for other contractors on the site. Late or restricted access is a Compensation Event, and notice was given inside the period.',
    substantiation: 'Site diary for 1–9 February; photographs of the open trench; the infrastructure contractor\'s own programme; the accepted baseline showing zero float.',
  },
  {
    id: 'variation', label: 'An instruction that changes the work',
    cause: 'On 14 March the Engineer issued Revision C of drawing SD-204, moving the transformer room and adding a reinforced slab.',
    effect: 'Work already built to Revision B had to be demolished. The new slab added 12 days to the structure sequence, which was critical.',
    entitlement: 'A change to the Employer\'s stated requirements is a Variation. It carries both a valuation for the extra work and an extension of time for the delay.',
    substantiation: 'The instruction itself; both drawing revisions side by side; the as-built record of the demolished work; measured quantities for the new slab.',
  },
  {
    id: 'weather', label: 'Exceptional weather',
    cause: 'Rainfall between 5 and 19 August was 412 mm against a 25-year August mean of 180 mm for this catchment, per Department of Hydrology and Meteorology records.',
    effect: 'River-level work at the tailrace outlet stopped for 15 days. This activity was critical from 5 August.',
    entitlement: 'Exceptionally adverse climatic conditions give time but usually not money — and only if the contract does not already allocate monsoon risk to you. Read that clause before writing anything.',
    substantiation: 'DHM rainfall data with the historic series; daily site records showing the stoppage; the monsoon calendar as applied in the accepted programme.',
  },
];

/* ═══════════ 03 · TYPES OF CLAIM ═══════════ */

export const TYPES = [
  {
    id: 'variation', name: 'Variation', tag: 'Money, and sometimes time',
    what: 'The work changed. Something was added, removed, altered, or the way you were told to build it changed.',
    prove: ['An instruction exists, or the change was directed in some other way', 'The work really is different from what the contract required', 'What the change is worth', 'Whether it also delayed you'],
    watch: 'Not every change is a Variation. Fixing your own design, or a change you proposed yourself, is usually on you. Check before you claim.',
    ic: 'tag',
  },
  {
    id: 'eot', name: 'Extension of time', tag: 'Time only',
    what: 'Something delayed the completion date, and it was not your risk. You are asking for the date to move.',
    prove: ['The event happened and was not your risk', 'Notice was given in time', 'The event delayed the critical path, not just some activity', 'How many days, measured against an accepted programme'],
    watch: 'An extension of time gives you time, not money. The money is a separate claim with its own proof. Winning one does not win the other.',
    ic: 'clock',
  },
  {
    id: 'prolongation', name: 'Prolongation cost', tag: 'Money',
    what: 'The project ran longer through no fault of yours, and you carried site costs for that extra period.',
    prove: ['You have an extension of time for that period, for a compensable reason', 'What those time-related costs actually were', 'That the resources really were idle and could not be used elsewhere'],
    watch: 'This is where most money claims die. A daily rate multiplied by the days claimed proves nothing. Build it from payroll, plant records and overhead accounts, event by event.',
    ic: 'money',
  },
  {
    id: 'acceleration', name: 'Acceleration', tag: 'Money',
    what: 'You were asked to go faster — or you were refused an extension you were entitled to and had to speed up to avoid damages.',
    prove: ['You were instructed to accelerate, or the refusal forced your hand', 'What you actually did: extra shifts, extra plant, extra crews', 'What those measures cost', 'That they were reasonable'],
    watch: 'Constructive acceleration — where nobody instructed it but the refusal left you no choice — is the hardest claim in the book. Record everything as it happens.',
    ic: 'play',
  },
  {
    id: 'disruption', name: 'Disruption', tag: 'Money',
    what: 'The work was not delayed overall, but it became less efficient. The same job took more hours than it should have.',
    prove: ['What productivity you planned, and where that figure came from', 'What productivity you actually got', 'That the difference was caused by the other side, not by you', 'The cost of the lost hours'],
    watch: 'Disruption and delay are not the same thing. You can be disrupted without being delayed, and the proof is entirely different — it is about output per hour, not about dates.',
    ic: 'types',
  },
  {
    id: 'damages', name: 'Damages at law', tag: 'Money',
    what: 'The contract does not give you a remedy, but the general law might — for breach of contract, for example.',
    prove: ['A duty existed', 'It was breached', 'The breach caused your loss', 'The loss was foreseeable'],
    watch: 'Take advice. This is the point where a claim stops being a contract-administration exercise and becomes a legal one.',
    ic: 'scale',
  },
];

export const CHOOSER = [
  {
    q: 'Did the scope of the work change?',
    yes: { next: null, type: 'variation', why: 'A change to what you were asked to build is a Variation. If it also pushed the finish out, add an extension-of-time claim alongside it.' },
    no: { next: 1 },
  },
  {
    q: 'Did the completion date move?',
    yes: { next: 2 },
    no: { next: 3 },
  },
  {
    q: 'Were you asked to make up the time, or refused the extension?',
    yes: { next: null, type: 'acceleration', why: 'Being told to go faster, or being refused time you were owed, points at an acceleration claim — plus the extension-of-time claim underneath it.' },
    no: { next: null, type: 'eot', why: 'Start with the extension of time. If you carried site costs over that extra period and the cause was compensable, add a prolongation claim as a separate section.' },
  },
  {
    q: 'Did the work simply take more hours than it should have?',
    yes: { next: null, type: 'disruption', why: 'No delay, but lost efficiency. That is disruption, and it is proved from productivity records, not from the programme.' },
    no: { next: null, type: 'damages', why: 'Nothing in the contract fits cleanly. Look at whether the general law gives a remedy — and get advice before you write.' },
  },
];

/* ═══════════ 04 · BEFORE YOU WRITE ═══════════ */

export const BEFORE = [
  {
    t: 'Read the contract. All of it.',
    s: 'Not the clause you think applies — the whole thing, including the amendments. On most projects the particular conditions have rewritten the very clauses claims turn on: notices, weather, access, determinations, payment timing.',
    do: ['Find the notice clause and write the deadline on the wall', 'Check whether the standard wording was replaced', 'Find the clause that puts this risk on *them*, and the one they will use to put it back on you'],
  },
  {
    t: 'Find out whether you gave notice',
    s: 'Before anything else. If the contract has a time bar and you missed it, the shape of the whole document changes — you now have to argue the bar first, and everything else comes second.',
    do: ['Search the letter register for anything about this event', 'An unlabelled letter that describes the event may still count — quote it', 'If the event was continuing, each phase may have started a fresh period'],
  },
  {
    t: 'Collect the records before you write',
    s: 'Write the narrative from the records, not the other way round. If you write first and look for proof afterwards, you will end up defending sentences you cannot support.',
    do: ['Daily reports, site diaries, photographs, delivery notes', 'Payroll and plant returns for the affected period', 'Minutes of meetings where it was raised', 'The programme as it stood at the time — not today\'s version'],
  },
  {
    t: 'Work out what you are actually asking for',
    s: 'Days? Money? Both? A decision? Write the answer on one line before you start. If you cannot, you are not ready to write.',
    do: ['State the relief once, clearly, in one place', 'Separate the time claim from the money claim', 'Make the number traceable to a calculation in the appendices'],
  },
  {
    t: 'Find your own weak points',
    s: 'Every claim has them. The reviewer will find yours in ten minutes. Far better that you raise them yourself and explain why they do not sink the case.',
    do: ['Was any of the delay your own?', 'Did you mitigate — and can you show it?', 'Is there a record missing, and can you explain why?'],
  },
  {
    t: 'Decide who will read it',
    s: 'The Engineer first, then possibly the Employer, then possibly a board or a tribunal. Write for the furthest of those. A document that works for a stranger works for everyone.',
    do: ['Assume no prior knowledge', 'Make the document stand alone — no "as previously discussed"', 'Spell out abbreviations the first time, every time'],
  },
];

/* ═══════════ 05 · THE BINDER ═══════════ */

export const BINDER = [
  {
    id: 'cover', tab: 'Cover', name: 'The cover',
    s: 'A title page that says exactly what this is. The project, the contract number, the parties, the claim number and title, the date, and the revision.',
    must: ['Project name and contract number', 'Claim number and a title that names the event', 'Who it is from and who it is to', 'Date and revision number'],
    tip: 'Number your claims from the start — Claim No. 1, No. 2, No. 3. When there are fourteen of them and three revisions each, you will be very glad you did.',
  },
  {
    id: 'contents', tab: 'Contents', name: 'Contents and exhibits list',
    s: 'A contents page with page numbers, and a separate numbered list of every exhibit.',
    must: ['Section headings with page numbers', 'A numbered exhibit list with a one-line description of each', 'Appendix list'],
    tip: 'The reviewer will use this page constantly. Get it right and keep it updated when you revise.',
  },
  {
    id: 'summary', tab: 'Summary', name: 'Executive summary',
    s: 'One page. What happened, what it did, which clause, what you want. Someone should be able to read only this page and know your whole case.',
    must: ['The event in two sentences', 'The effect in two sentences', 'The clause you rely on', 'The relief sought, in figures'],
    tip: 'Write this last, but put it first. It is the most-read page in the document and often the only one a senior person reads.',
  },
  {
    id: 'intro', tab: 'Intro', name: 'Introduction and the project',
    s: 'Who the parties are, what the project is, what the contract is, what the key dates are. Short, factual, and assuming the reader knows nothing.',
    must: ['The parties and their roles', 'A paragraph on the works', 'Contract date, commencement, time for completion, completion date', 'The form of contract and the fact it was amended'],
    tip: 'This is the section people skip writing because "everybody knows". Nobody knows. Write it.',
  },
  {
    id: 'facts', tab: 'The facts', name: 'The narrative of fact',
    s: 'The story, in date order, told from the records. Every paragraph pinned to a document. This is your Cause.',
    must: ['Chronological, with dates in the margin or in bold', 'An exhibit reference at every fact', 'No argument yet — argument comes later'],
    tip: 'Resist the urge to argue here. A clean, dry, well-referenced chronology is enormously persuasive on its own.',
  },
  {
    id: 'entitle', tab: 'Entitlement', name: 'The contractual case',
    s: 'The clause, quoted. Why the facts above fall inside it. Why notice was good. Why any clause the other side will raise does not help them. This is your Entitlement.',
    must: ['The clause quoted exactly, in a block', 'The facts mapped onto the words of the clause', 'The notice position, dealt with head on', 'The answer to their best point'],
    tip: 'Quote the clause in a box, then take its words one at a time and show your facts meeting each. It reads like arithmetic, which is exactly what you want.',
  },
  {
    id: 'time', tab: 'Time', name: 'The delay analysis',
    s: 'If you want days, this section has to prove them. The programme you analysed, the method you used, the windows, the impact, the result. This is your Effect, for time.',
    must: ['Which programme, and its status', 'Which method, and why that one', 'The analysis, window by window', 'A clear statement of the days claimed'],
    tip: 'Say which method you used and why, in one paragraph, in plain words. A reviewer who does not recognise your method will not accept your days.',
  },
  {
    id: 'money', tab: 'Money', name: 'The quantum',
    s: 'What it cost, built up from records. Each head of cost, each calculation, each source document. This is your Effect, for money.',
    must: ['Costs separated by head: labour, plant, overheads, finance', 'A calculation for each, referenced to the records', 'The total, stated once', 'Anything you are not claiming, and why'],
    tip: 'Show the calculation in the body and put the workings in an appendix. Never make a reviewer reverse-engineer a number.',
  },
  {
    id: 'concl', tab: 'Conclusion', name: 'Conclusion and relief',
    s: 'Restate what you have shown, in the same order, and ask for exactly what you want.',
    must: ['A short summary of the findings', 'The relief, in figures and dates', 'A request for a determination within the contractual period'],
    tip: 'The last page and the first page should agree exactly. Reviewers check.',
  },
  {
    id: 'appx', tab: 'Appendices', name: 'Appendices and exhibits',
    s: 'Everything you referred to, in the order you referred to it, tabbed and numbered so a page can be found in seconds.',
    must: ['Numbered dividers matching the exhibit list', 'Only documents actually cited in the text', 'Legible copies — not a photograph of a screen'],
    tip: 'If an exhibit is 80 pages, extract the relevant pages as the exhibit and offer the full document separately.',
  },
];

/* ═══════════ 06 · WRITING ═══════════ */

export const STYLE_RULES = [
  { t: 'Short sentences', s: 'One idea each. A sentence a reviewer has to read twice is a sentence that weakens you.' },
  { t: 'Active, not passive', s: '"The Engineer issued the instruction" tells us who did it. "The instruction was issued" hides it — and hiding who did what is exactly what you must not do.' },
  { t: 'Facts before arguments', s: 'Establish what happened, then say what it means. A reader who has accepted your facts is halfway to accepting your conclusion.' },
  { t: 'No adjectives doing the work', s: '"Severe", "significant", "unprecedented" and "considerable" carry no weight. Replace each one with a number.' },
  { t: 'Polite, always', s: '"We respectfully disagree" is stronger than "this is manifestly wrong". Accusations of bad faith almost never help and are remembered.' },
  { t: 'Consistent names', s: 'Pick one name for each party, each area, each document, and never vary it. "The Engineer" throughout — not "the ER", "the Consultant", "DOLSAR".' },
  { t: 'Numbered paragraphs', s: 'So that every later letter can say "paragraph 4.12" and everyone knows precisely what is meant.' },
  { t: 'One claim, one document', s: 'Do not bundle unrelated events. Each gets its own claim, its own number, its own determination.' },
];

export const REWRITES = [
  {
    bad: 'Due to the Employer\'s continuous failure to fulfil its obligations, the Contractor has suffered severe and ongoing disruption throughout the period in question, resulting in considerable additional costs which are claimed herein.',
    good: 'Access to the Spillway Outlet work front was not given until 14 May 2025, 228 days after the Site Possession Date of 28 September 2024. Excavation activities SP-OUT-100 to SP-OUT-160 could not start during that period.',
    why: ['Names the work front instead of "the works"', 'Gives both dates and the number of days', 'Names the activities, so the programme can be checked', 'Drops "severe", "ongoing" and "considerable" — they added nothing'],
  },
  {
    bad: 'It is clearly evident and beyond any doubt that the Contractor is fully entitled to the relief sought, and the Engineer is respectfully requested to act reasonably in this matter.',
    good: 'Sub-Clause 35.4(a) provides that failure to give access by the Site Possession Date is a Compensation Event. The facts at paragraphs 3.1 to 3.9 fall within that provision. The Contractor is therefore entitled to an extension of time under Sub-Clause 42.1.',
    why: ['Cites the clause instead of asserting entitlement', 'Points at the paragraphs that do the work', 'Names the remedy and the clause that gives it', '"Clearly evident and beyond any doubt" is a signal of a weak case, and reviewers read it that way'],
  },
  {
    bad: 'The Contractor had a large number of men and plant standing idle for a long time as a result of this event and claims the associated costs as set out in the attached.',
    good: 'From 09:00 on 9 September to 17:00 on 12 September 2025, 42 operatives and 6 items of plant (EX-201, EX-204, DT-310, DT-312, LD-104, CP-021) were idle at Adit-2 and could not be redeployed to another front. Daily returns are at Exhibit 3 and the cost build-up at Appendix C.',
    why: ['Exact times, not "a long time"', 'Counts and equipment numbers, not "a large number"', 'Says they could not be redeployed — the point the reviewer will test', 'Sends the reader to the exact exhibit'],
  },
];

/* ═══════════ 07 · PROOF ═══════════ */

export const PROOF = {
  hierarchy: [
    { rank: 1, t: 'Records made at the time', ex: 'Daily reports, site diaries, survey records, signed delivery notes, dated photographs.', s: 'Written before anyone knew there would be a claim. The strongest evidence there is.' },
    { rank: 2, t: 'Contemporaneous correspondence', ex: 'Letters, minuted meetings, instructions, notices.', s: 'Strong — especially the other side\'s letters, where they admit a fact.' },
    { rank: 3, t: 'Official third-party records', ex: 'Weather data, road authority notices, government orders, utility records.', s: 'Hard to dispute, but translate them and have the translation certified.' },
    { rank: 4, t: 'Accounts and payroll', ex: 'Timesheets, payroll runs, invoices, plant hire accounts.', s: 'Essential for money. Weak on their own — they show spend, not cause.' },
    { rank: 5, t: 'Analysis prepared for the claim', ex: 'Delay analyses, productivity studies, cost build-ups.', s: 'Necessary, but it is your argument, not evidence. It only carries weight if built on the four above.' },
    { rank: 6, t: 'Statements written afterwards', ex: 'A recollection of what happened, written now.', s: 'Weakest. Use only where a record genuinely never existed, and say why.' },
  ],
  rules: [
    'Give every exhibit a number and use it in the text, at the sentence it proves.',
    'One exhibit, one document. Do not bundle five things under "Exhibit 4".',
    'Extract the relevant pages. A 200-page report as an exhibit will not be read.',
    'Anything not in the contract language needs a certified translation attached to it.',
    'A photograph needs a date, a location and a caption saying what it shows.',
    'If a record does not exist, say so in the narrative and explain what you have instead. Silence looks like concealment.',
  ],
};

/* ═══════════ 08 · THE RESPONSE ═══════════ */

export const RESPONSE = {
  lede: 'Sooner or later you will be on the other side of the desk — answering a claim, or determining one. A bad response is worse than a bad claim, because it is the thing that turns a disagreement into a dispute.',
  steps: [
    { n: 1, t: 'Read the whole thing before writing anything', s: 'All of it, including the appendices. A response that answers a claim the claimant did not make is embarrassing and slow to undo.' },
    { n: 2, t: 'Sort their case into the four elements', s: 'Cause, effect, entitlement, substantiation. Then you can see exactly which of the four is weak — and that is what your response is about.' },
    { n: 3, t: 'Answer each point in their order, with their numbering', s: 'Use their paragraph numbers. It makes your answer checkable and it stops the argument drifting.' },
    { n: 4, t: 'Concede what is true', s: 'If the event happened, say so. Fighting facts you cannot win destroys your credibility on the points you can.' },
    { n: 5, t: 'Give reasons, not conclusions', s: '"Rejected" is not a response. "Rejected, because the notice at Exhibit 2 is dated 34 days after the event and Sub-Clause 35.1 requires 21" is.' },
    { n: 6, t: 'Deal with time and money separately', s: 'You may accept the days and reject the money, or the other way round. Say which, and why, in separate sections.' },
    { n: 7, t: 'Say what would change your mind', s: 'If the claim fails only for want of a record, say which record. A determination that shows the way forward settles matters; one that just says no creates disputes.' },
  ],
  tests: [
    { t: 'Is it their risk under this contract?', s: 'Start here. If the contract puts the risk on the claimant, nothing else matters.' },
    { t: 'Was notice given, in time, in the right form?', s: 'Check the dates against the clause. If a time bar applies, say so plainly and early.' },
    { t: 'Did the event actually happen as described?', s: 'Test the narrative against the exhibits. Facts asserted with no exhibit are not facts.' },
    { t: 'Did it affect the critical path?', s: 'Against which programme? Was that programme accepted? An analysis on an unaccepted programme proves very little.' },
    { t: 'Did they mitigate?', s: 'They are under a duty to reduce the effect. If the submission is silent on mitigation, it is overstating the impact.' },
    { t: 'Is the cost proved, and is it really caused by this?', s: 'Idle and non-redeployable are two separate things, and both need proving. An average daily rate proves neither.' },
  ],
};

/* ═══════════ 09 · WORKED EXAMPLE ═══════════ */

export const WORKED = {
  brief: 'A hydropower project in Nepal. The Employer must obtain land and tree-cutting permits for the spillway outlet area and hand the front over by the Site Possession Date. It does not. The Contractor cannot start excavation there for months, and the affected milestone is missed.',
  facts: [
    { d: '28 Sep 2024', t: 'Site Possession Date under the contract', s: 'The date the Employer had to give access to the spillway outlet area.' },
    { d: '2 Oct 2024', t: 'Contractor writes an early warning', s: 'Flags that permits are outstanding and that the milestone is at risk. Not a claim yet — a warning.' },
    { d: '14 Oct 2024', t: 'Notice of claim', s: 'Labelled in the subject line under the claims clause and the extension-of-time clause. Inside the 21-day period.' },
    { d: 'Nov 2024 – Apr 2025', t: 'Monthly interim claims', s: 'The effect is continuing, so a short update each month keeps it alive and keeps the records current.' },
    { d: '14 May 2025', t: 'Access finally given', s: '228 days after the Site Possession Date.' },
    { d: '10 Jun 2025', t: 'Fully detailed claim submitted', s: 'Within 30 days of the effect ending. Three volumes.' },
  ],
  build: [
    { k: 'Cause', s: 'The Employer did not obtain the land acquisition and tree-cutting permits, and did not give access to the spillway outlet area on the Site Possession Date of 28 September 2024. Access was given on 14 May 2025.', ex: 'Exhibit 1: the contract Site Possession Date. Exhibit 2: the handover record of 14 May 2025. Exhibit 3: correspondence chasing the permits.' },
    { k: 'Effect', s: 'Excavation of the outlet portal could not begin. Activities SP-OUT-100 to SP-OUT-160 had no float in the accepted programme. Milestone 1 was missed by 228 days.', ex: 'Exhibit 4: the accepted programme. Exhibit 5: the window analysis. Exhibit 6: daily reports showing the front idle.' },
    { k: 'Entitlement', s: 'Obtaining permits for the permanent works is the Employer\'s obligation. Failure to give access by the Site Possession Date is a listed Compensation Event. Notice was given on 14 October 2024, inside the period.', ex: 'The clauses quoted in full, plus Exhibit 7: the notice, with its receipt.' },
    { k: 'Substantiation', s: 'Every fact above is tied to a numbered exhibit, and the cost build-up is in Appendix C with the payroll and plant returns behind it.', ex: 'Exhibits 1–12, Appendices A–D.' },
  ],
  outcome: {
    won: 'The time claim succeeded. The permits were plainly the Employer\'s obligation, the notice was clean, and the correspondence trail was complete. 228 days were awarded.',
    lost: 'The money claim failed completely. The submission asserted that labour and plant stood idle, but never proved that those resources could not have been moved to another work front — and substitute land had in fact been made available. Nothing was awarded for cost.',
    lesson: 'Entitlement and quantum are two separate battles. This claim won the first and lost the second, and it lost the second for one reason: the records showed money was spent, but not that the spending was caused by this event and could not have been avoided.',
  },
};

/* ═══════════ 10 · DRILLS ═══════════ */

export const DRILLS = [
  {
    id: 'd1', q: 'A claim has to be proved to what standard?',
    opts: ['Beyond reasonable doubt', 'On the balance of probabilities', 'To absolute certainty', 'To the reviewer\'s personal satisfaction'],
    a: 1, why: 'More likely than not. You are not in a criminal court — but you do have to make your version the easier one to believe.',
  },
  {
    id: 'd2', q: 'Which of these belongs in the Cause section?',
    opts: ['The event, with dates, stated as fact', 'The clause that gives you entitlement', 'The cost you are claiming', 'The days you want'],
    a: 0, why: 'Cause is only what happened. Clauses go in Entitlement; days and money go in Effect.',
  },
  {
    id: 'd3', q: 'You win an extension of time. What does that give you?',
    opts: ['Time and the associated costs', 'Time only', 'Costs only', 'Whatever the Engineer decides'],
    a: 1, why: 'Time. The money is a separate claim — prolongation cost — with its own proof. Many claimants assume one follows the other, and it does not.',
  },
  {
    id: 'd4', q: 'Which piece of evidence is strongest?',
    opts: ['A statement written now about what happened last year', 'A delay analysis prepared for the claim', 'A dated daily report written on the day', 'A summary spreadsheet of the costs'],
    a: 2, why: 'Records made at the time, before anyone knew there would be a claim. Analysis prepared for the claim is argument, not evidence.',
  },
  {
    id: 'd5', q: 'An event delayed an activity that had 20 days of float. It ran 8 days late. What is the effect on completion?',
    opts: ['8 days', '20 days', '28 days', 'None'],
    a: 3, why: 'None. Float absorbed it. "We were delayed" and "the project was delayed" are different claims — only the second is worth days.',
  },
  {
    id: 'd6', q: 'What is the first thing to check before writing anything?',
    opts: ['How much the claim is worth', 'Whether notice was given in time', 'Who will review it', 'What the programme shows'],
    a: 1, why: 'Notice. If a time bar applies and you missed it, the whole shape of the document changes — you argue the bar first and the merits second.',
  },
  {
    id: 'd7', q: 'The reviewer does not know your project. What follows?',
    opts: ['Keep it short — they will ask if they need more', 'Refer them to the earlier correspondence', 'Make the document stand alone, explaining everything', 'Attach all the project records'],
    a: 2, why: 'Stand alone. No "as previously discussed", no assumed knowledge. Someone reading it cold must be able to follow it end to end.',
  },
  {
    id: 'd8', q: 'Which sentence would a reviewer accept?',
    opts: ['Significant idle resources were incurred over an extended period.', '42 operatives and 6 items of plant were idle at Adit-2 from 9 to 12 September 2025 (Exhibit 3).', 'The Contractor suffered considerable losses due to the delay.', 'Substantial disruption affected the works throughout.'],
    a: 1, why: 'Counts, a place, dates and an exhibit. The other three are adjectives with nothing behind them.',
  },
  {
    id: 'd9', q: 'You are responding to a claim and the event clearly did happen. What do you do?',
    opts: ['Deny everything to protect your position', 'Concede the fact and focus on entitlement or quantum', 'Say nothing about it', 'Ask for more documents'],
    a: 1, why: 'Concede it. Fighting facts you cannot win destroys your credibility on the points where you are actually right.',
  },
  {
    id: 'd10', q: 'What makes a determination more likely to settle the matter?',
    opts: ['A short, firm rejection', 'Reasons, and a statement of what would change the answer', 'Copying the claim back with comments', 'Referring it upward'],
    a: 1, why: 'Reasons plus a route forward. "Rejected" creates a dispute; "rejected because X, and here is what would satisfy me" often ends one.',
  },
];

/* ═══════════ GLOSSARY & READING ═══════════ */

export const GLOSSARY = [
  { t: 'Balance of probabilities', s: 'The standard a claim is judged by. More likely than not — not certainty.' },
  { t: 'Compensation Event', s: 'An event the contract names as giving the contractor time, money, or both.' },
  { t: 'Concurrent delay', s: 'Two delays running at the same time, one each side\'s fault. Usually gives time but not money.' },
  { t: 'Contemporaneous records', s: 'Documents made at the time of the event, not afterwards.' },
  { t: 'Critical path', s: 'The chain of activities that sets the completion date. A delay off it costs you nothing in days.' },
  { t: 'Determination', s: 'The decision the contract administrator makes on a claim after consulting both sides.' },
  { t: 'Disruption', s: 'Loss of efficiency — the work took more hours than planned, whether or not it was delayed.' },
  { t: 'Float', s: 'Spare time on an activity. An activity with float can slip without moving the finish.' },
  { t: 'Prolongation cost', s: 'Time-related cost carried because the project ran longer.' },
  { t: 'Quantum', s: 'The amount. The money half of a claim, as opposed to entitlement.' },
  { t: 'Time bar', s: 'A clause saying that if notice is late, the right is lost. Ruthless, and common.' },
  { t: 'Variation', s: 'A change to the work, instructed or directed by the other side.' },
];

export const READING = [
  {
    t: 'Construction Claims & Responses: Effective Writing & Presentation',
    by: 'Andy Hewitt · Wiley-Blackwell, 2011 (2nd ed. 2016)',
    s: 'The standard text on this subject, and the source of the CEES framework used throughout this course. It works through full example claims in a level of detail no summary can replace. If you write claims for a living, own a copy.',
  },
  {
    t: 'Delay and Disruption Protocol',
    by: 'Society of Construction Law',
    s: 'The reference work on delay analysis methods, concurrency and float. Free to download, and cited by engineers and tribunals everywhere.',
  },
  {
    t: 'Recommended Practices 29R-03 and 52R-06',
    by: 'AACE International',
    s: 'Forensic schedule analysis, and Time Impact Analysis in particular. Technical, and the vocabulary that delay experts actually use.',
  },
  {
    t: 'Your own contract',
    by: 'The one you signed',
    s: 'Read before every claim. The particular conditions on most projects have rewritten the clauses that claims turn on, and the standard wording you remember may not be in your contract at all.',
  },
];
