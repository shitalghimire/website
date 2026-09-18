/* ═══════════════════════════════════════════════════════════════
   Pre-flight — will a letter we are about to send survive the Engineer?

   The reader (reader.js) answers "what is this letter doing?". This
   answers a different question about OUR letters, built from the ways
   TKV letters actually failed:

   · CEES     — Cause, Effect, Entitlement, Substantiation. A claim that
                is missing one of the four does not stand up.
   · notice   — "it is our intention to issue notice" is not a notice.
                Letter TKV/COM/2024/058 said exactly that.
   · subject  — an unlabelled letter was treated as correspondence, not
                a notice, in the EOT-01 determination.
   · traps    — 63.6 (monsoon access), 34 vs 35.1, deleted GCC text.
   · red pen  — adjectives standing where a number should be.
   · timing   — days from the event against the 15- and 21-day bars.
   ═══════════════════════════════════════════════════════════════ */

import * as D from '../lib/dates.js';

/* ── words that carry no weight ───────────────────────────────── */
export const WEAK = [
  { w: 'significant', fix: 'How significant? Put the number in.' },
  { w: 'significantly', fix: 'By how much? Measure it.' },
  { w: 'considerable', fix: 'Measure it instead.' },
  { w: 'substantial', fix: 'Give the figure.' },
  { w: 'severe', fix: 'A judgement, not a fact. Show the effect.' },
  { w: 'severely', fix: 'Show what happened instead.' },
  { w: 'unprecedented', fix: 'Against what record? Cite the data, or drop it.' },
  { w: 'extensive', fix: 'Quantify it.' },
  { w: 'numerous', fix: 'Count them.' },
  { w: 'various', fix: 'List them.' },
  { w: 'several', fix: 'How many?' },
  { w: 'huge', fix: 'Give the figure.' },
  { w: 'massive', fix: 'Give the figure.' },
  { w: 'clearly', fix: 'If it were clear, you would not need to say so.' },
  { w: 'obviously', fix: 'Reads as impatience. Cut it.' },
  { w: 'manifestly', fix: 'Heat, not light — it makes the letter look rattled.' },
  { w: 'it is submitted that', fix: 'Four words that say nothing. Just say it.' },
  { w: 'as you are aware', fix: 'They may not be, and the next reader certainly is not.' },
  { w: 'in due course', fix: 'Give the date.' },
  { w: 'as soon as possible', fix: 'Give the date.' },
  { w: 'for a long time', fix: 'From when to when?' },
  { w: 'a large number of', fix: 'How many?' },
];

/* ── the four CEES elements, each scored 0–3 ───────────────────── */
const EVENT_VERBS = /\b(occurred|happened|was (cut|blocked|closed|stopped|damaged|instructed|suspended|delayed|refused|issued)|were (idle|stopped|unable)|stopped work|halted|landslide|flood(ed)?|blockade|curfew|protest|instructed|suspended|failed to (give|provide|hand)|did not (give|provide|hand|obtain))\b/i;
const EFFECT_WORDS = /\b(delay(ed)?|critical path|float|milestone|extension of time|prolong|idle|standby|could not (proceed|start|continue)|disrupt(ion|ed)?|additional (cost|payment)|loss of productivity)\b/i;
const ACTIVITY_ID = /\b[A-Z]{1,4}\d?-[A-Z]{2,5}-\d{2,4}\b/;
const MONEY = /\b(NPR|NRs\.?|Rs\.?|USD|US\$)\s?[\d,]+/i;
const EXHIBIT = /\b(exhibit|annex(ure)?|appendix|attachment|enclosure|enclosed|attached)\b/i;
const RECORDS = /\b(daily (progress )?reports?|site diary|photographs?|delivery notes?|payroll|plant (returns|logs?)|timesheets?|minutes of|rainfall data|DHM|survey records?|stock register)\b/i;

function scoreCause(text, dates) {
  const bodyDates = dates.filter((d) => d.index > 250).length;
  const verb = EVENT_VERBS.test(text);
  const place = /\b(adit|portal|tunnel|powerhouse|cavern|spillway|tailrace|headpond|intake|road|chainage|surge|shaft|crusher|camp|site)\b/i.test(text);
  const s = (bodyDates >= 1 ? 1 : 0) + (verb ? 1 : 0) + (place ? 1 : 0);
  const missing = [];
  if (!bodyDates) missing.push('no date for the event itself');
  if (!verb) missing.push('no plain statement of what happened');
  if (!place) missing.push('no location or work front');
  return { s, missing };
}

function scoreEffect(text) {
  const words = EFFECT_WORDS.test(text);
  const nums = /\b\d{1,4}\s*(calendar\s+)?days?\b/i.test(text) || MONEY.test(text);
  const ids = ACTIVITY_ID.test(text) || /\bactivit(y|ies)\b/i.test(text);
  const s = (words ? 1 : 0) + (nums ? 1 : 0) + (ids ? 1 : 0);
  const missing = [];
  if (!words) missing.push('no statement of what it did to the works');
  if (!nums) missing.push('no number of days or amount');
  if (!ids) missing.push('no programme activities named');
  return { s, missing };
}

function scoreEntitlement(citations, text) {
  const valid = citations.filter((c) => c.status === 'ok');
  const broken = citations.filter((c) => ['wrong', 'missing', 'fidic', 'title'].includes(c.status));
  const ce = /\bcompensation event\b/i.test(text) || /\bentitle[ds]?\b/i.test(text);
  let s = Math.min(2, valid.length) + (ce ? 1 : 0);
  if (broken.length) s = Math.max(0, s - 1);
  const missing = [];
  if (!valid.length) missing.push('no clause that checks out against this contract');
  if (broken.length) missing.push(`${broken.length} clause reference${broken.length > 1 ? 's' : ''} that do${broken.length > 1 ? '' : 'es'} not check out`);
  if (!ce) missing.push('does not say why the contract gives you something');
  return { s: Math.min(3, s), missing };
}

function scoreSubstantiation(text) {
  const exh = (text.match(new RegExp(EXHIBIT.source, 'gi')) || []).length;
  const rec = RECORDS.test(text);
  const numbered = /\b(exhibit|annex(ure)?|appendix)\s*[\dA-Z]\b/i.test(text);
  const s = (exh ? 1 : 0) + (rec ? 1 : 0) + (numbered ? 1 : 0);
  const missing = [];
  if (!exh) missing.push('nothing attached or referred to');
  if (!rec) missing.push('no contemporary records named');
  if (!numbered) missing.push('exhibits are not numbered');
  return { s, missing };
}

/* ── the check itself ─────────────────────────────────────────── */
export function preflight(text, reading, { eventDate = null, kind = null } = {}) {
  const t = String(text || '');
  const low = t.toLowerCase();
  const out = { weak: [], issues: [], good: [] };

  /* CEES */
  const dates = reading.meta?.dates || D.findDates(t);
  out.cees = [
    { k: 'C', name: 'Cause', ...scoreCause(t, dates) },
    { k: 'E', name: 'Effect', ...scoreEffect(t) },
    { k: 'E', name: 'Entitlement', ...scoreEntitlement(reading.citations || [], t) },
    { k: 'S', name: 'Substantiation', ...scoreSubstantiation(t) },
  ];
  out.ceesTotal = out.cees.reduce((a, x) => a + x.s, 0);

  /* what kind of letter is this? The tests differ:
     claim  — CEES, notice wording and a labelled subject all matter
     notice — a formal notice that is not a claim (dissatisfaction, FM ceased,
              suspension): the notice wording and the subject matter, CEES does not
     letter — everything else: only the general checks */
  const subj = reading.meta?.subject || '';
  const body = subj ? t.slice(t.indexOf(subj) + subj.length) : t;
  const NOTICE_ONLY = /\b(notice of dissatisfaction|dissatisfaction under|no longer affect\w*|force majeure (has )?ceased|suspension of (the )?work)/i;
  const CLAIMISH = /\b(notice of claim|claim under|extension of time|compensation event|force majeure|fully detailed claim|interim claim|statement of claim|variation under|prolongation|delayed possession)\b/i;
  const NOTICE_SUBJ = /\b(notice (of|under)\b|early warning)/i;
  /* a detailed claim says so in its subject, or hands the claim over now —
     "will submit a fully detailed claim" is still a notice */
  const DETAILED = (s, b) => /\b(fully detailed claim|interim claim|statement of claim)\b/i.test(s)
    || /\b(hereby |herewith )?submits? (herewith )?(the |its |our )?(enclosed |attached )(fully detailed |interim )?(claim|statement of claim)\b/i.test(b);
  let type = 'letter';
  if (kind === 'claim') type = 'claim';
  else if (NOTICE_ONLY.test(subj)) type = 'notice';
  else if (CLAIMISH.test(subj)) type = 'claim';
  else if (NOTICE_SUBJ.test(subj)) type = 'notice';
  else if (/\b(notice (of claim|under)|give notice|issue notice|right to claim)\b/i.test(body) && CLAIMISH.test(body)) type = 'claim';
  const stage = type === 'claim' && (kind === 'claim' || DETAILED(subj, body)) ? 'detailed' : type === 'claim' ? 'notice' : null;
  out.type = type;
  out.stage = stage;
  out.isNotice = type !== 'letter';
  out.ceesApplies = type === 'claim';
  /* at notice stage the records can follow with the detailed claim */
  if (stage === 'notice') out.cees[3].optional = true;

  /* notice wording — the Jhamarsi mistake */
  const intentOnly = t.match(/\b(it is (the contractor'?s|our) intention to (issue|give|serve|submit)|intend(s)? to (issue|give|serve|submit)|(shall|will) (issue|give|serve|submit) (a |the )?(formal )?notice|reserves? (its|the|our) right to (issue|give) (a )?notice)[^.]{0,60}/i);
  /* present tense counts ("the Contractor gives notice of its dissatisfaction");
     a promise ("will give notice", "intends to give notice") does not */
  const firm = /\b(hereby (gives?|serves?|submits?) (an |formal )*(notice|early warning)|notice is hereby given|this letter (constitutes|is|serves as) (a |the |an )?(formal )?(notice|early warning)|(gives|serves) (an |formal )*(notice|early warning) (under|of|that|pursuant|in accordance)|we (hereby )?give (formal )?notice|(hereby )?warns the (employer|engineer))\b/i.test(t);
  if (intentOnly && !firm) out.issues.push({ sev: 'high', k: 'notice', t: 'This is an intention to give notice — not a notice.',
    s: `The letter says "${intentOnly[0].trim()}". Promising to give notice later is the wording an Engineer can treat as correspondence. TKV/COM/2024/058 used exactly this. Write "The Contractor hereby gives notice under Sub-Clause …" instead.`, quote: intentOnly[0] });
  else if (firm && type !== 'letter') out.good.push('Gives notice in so many words, not as an intention.');
  else if (!firm && (type === 'notice' || stage === 'notice')) out.issues.push({ sev: 'medium', k: 'notice', t: 'It never actually says it is giving notice.',
    s: 'Say it outright: "The Contractor hereby gives notice under Sub-Clause 35.1 and Particular Conditions Sub-Clause 42.1 of the following event." One sentence, and the clock question is settled.' });

  /* subject line */
  const subjClause = /\b(sub-?clause|clause|gcc|pcc)\s*\d/i.test(subj);
  const subjKind = /\b(notice|claim|dissatisfaction|early warning|variation|extension of time|force majeure|determination|amicable)\b/i.test(subj);
  if (!subj) out.issues.push({ sev: 'medium', k: 'subject', t: 'No subject line found.', s: 'Every letter needs a subject. A notice needs one that names the clause and the kind of letter.' });
  else if (type !== 'letter' && stage !== 'detailed' && !(subjClause && subjKind)) out.issues.push({ sev: 'medium', k: 'subject', t: 'The subject does not label the letter.',
    s: `"${subj}" — put the kind of letter and the clause in it, e.g. "Notice of Claim under Sub-Clause 35.1 — …". On EOT-01 the Engineer treated unlabelled letters as never notified.` });
  else if (subjClause && subjKind) out.good.push('Subject names both the kind of letter and the clause.');

  /* known traps */
  const cites = (ref) => (reading.citations || []).some((c) => c.ref === ref || c.ref.startsWith(ref + '.') || c.key === ref);
  if (/\b(monsoon|rain(fall|y)?|landslide|flood|road (block|damage|closure|cut)|access road|glof)\b/i.test(t) && /\b(extension of time|delay|additional cost|claim)\b/i.test(t) && !cites('63.6')) {
    out.issues.push({ sev: 'high', k: '63.6', t: 'Expect the Engineer to answer this with Sub-Clause 63.6.',
      s: 'Rainy-season access problems and running short of stock are the Contractor\'s risk under 63.6, and it applies even when the event meets the Force Majeure test — that is how the Jhamarsi claim was rejected. Meet it in the letter: the stock actually held on the day, the daily consumption, and rainfall against the long-term record.' });
  }
  if (reading.deletedText) out.issues.push({ sev: 'high', k: 'deleted', t: 'Quotes contract wording that no longer exists.', s: reading.deletedText });
  if (reading.riskNote) out.issues.push({ sev: 'medium', k: 'risk', t: 'Relies on the wrong risk clause.', s: reading.riskNote });
  for (const c of (reading.citations || []).filter((x) => ['wrong', 'missing', 'fidic'].includes(x.status))) {
    out.issues.push({ sev: 'high', k: 'cite', t: `${c.raws[0]} does not check out.`, s: c.note });
  }
  if (/\breserve[sd]? (its|our|the) rights?\b/i.test(t)) out.good.push('Reserves its rights.');

  /* red pen */
  for (const b of WEAK) {
    const re = new RegExp(`\\b${b.w.replace(/ /g, '\\s+')}\\b`, 'gi');
    let m;
    while ((m = re.exec(t))) out.weak.push({ ...b, at: m.index, len: m[0].length, found: m[0] });
  }
  out.weak.sort((a, b) => a.at - b.at);

  /* timing against the bars */
  if (eventDate) {
    const sent = reading.meta?.date || D.today();
    const days = D.diffDays(eventDate, sent);
    out.timing = {
      days, sent,
      bars: [
        { n: 15, label: 'Extension-of-time notice', ref: '42.1', ok: days <= 15 },
        { n: 15, label: 'Force Majeure notice', ref: '68.1', ok: days <= 15 },
        { n: 21, label: 'Notice of claim — the outside limit', ref: '35.1', ok: days <= 21 },
      ],
    };
    if (days > 21) out.issues.unshift({ sev: 'high', k: 'late', t: `Sent ${days} days after the event — past the 21-day bar.`,
      s: 'Sub-Clause 35.2 can end the claim here. Before sending, find any earlier letter that described the event and your intention to claim, and quote it; if the event was continuing, argue each phase separately.' });
    else if (days > 15) out.issues.unshift({ sev: 'medium', k: 'late', t: `${days} days after the event — past the 15-day extension-of-time notice.`,
      s: 'PCC 42.1 wanted notice within 15 days. You are still inside 35.1, so send today, and deal with the 42.1 point head-on.' });
  }

  out.issues.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.sev] - { high: 0, medium: 1, low: 2 }[b.sev]));

  /* the verdict */
  const highs = out.issues.filter((i) => i.sev === 'high').length;
  const zeroes = out.ceesApplies ? out.cees.filter((x) => x.s === 0 && !x.optional).length : 0;
  const notNotice = out.issues.some((i) => i.k === 'notice' && i.sev === 'high');
  out.verdict = notNotice ? { k: 'bad', t: 'Not a notice yet', s: 'As written, this promises a notice rather than giving one.' }
    : highs || zeroes >= 2 ? { k: 'bad', t: 'Fix before sending', s: `${highs ? `${highs} serious problem${highs > 1 ? 's' : ''}` : ''}${highs && zeroes ? ' and ' : ''}${zeroes ? `${zeroes} of the CEES elements missing` : ''}.` }
      : out.issues.length || zeroes || out.weak.length > 3 ? { k: 'warn', t: 'Nearly there', s: 'Nothing fatal. Tighten what is flagged below and it is ready.' }
        : { k: 'ok', t: 'Ready to send', s: out.ceesApplies ? 'Every element of the claim is there and nothing is flagged. Read it once more as the Engineer would.' : 'Nothing flagged. Read it once more as the Engineer would.' };

  return out;
}
