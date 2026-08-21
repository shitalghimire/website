/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — the four primary methods, made operable

   Impacted as-planned, time impact analysis, collapsed as-built and
   as-planned versus as-built are usually taught as four names. Here
   they are four buttons that move real numbers, so the difference
   between "additive" and "subtractive" stops being vocabulary.
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, d2, days, dayDiff, addDays, altTable, say } from '../dom.js';
import { run, insert, extract } from '../cpm.js';
import { fig, ctlBar, tabs, readout, setReadout, legend } from './kit.js';

/* ═══════════════════════════════════════════════════════════════
   1 · IMPACTED AS-PLANNED
   Insert events into the baseline, one at a time, chronologically,
   and bank the movement to each party. The delay it reports is the
   delay that WOULD have happened had nothing else gone wrong.
   ═══════════════════════════════════════════════════════════════ */

export function impactedAsPlanned(props = {}) {
  const base = props.net || DEMO_NET;
  const start = props.start || '2008-06-01';
  const events = props.events || DEMO_EVENTS;

  let inserted = 0;           // how many events are in
  let combined = true;        // combined chronological, or employer-only

  const baseRes = run(base, { start });
  const baseFinish = baseRes.finishDate;

  const tbody = el('tbody');
  const ro = readout([
    ['Baseline finish', d2(baseFinish)],
    ['Impacted finish', d2(baseFinish), 'ink'],
    ['Employer delay', '0d', 'emp'],
    ['Contractor delay', '0d', 'con'],
    ['Total', '0d']
  ]);

  function compute() {
    const use = events.slice(0, inserted).filter(e => combined || e.owner === 'ERE');
    let net = base;
    const rows = [];
    let prev = baseRes.finishDay;
    let ere = 0, cre = 0;

    rows.push({ base: true, label: 'Contract baseline', date: baseFinish, move: null });

    for (const ev of use) {
      net = insert(net, ev);
      const r = run(net, { start });
      const move = r.finishDay - prev;
      prev = r.finishDay;
      if (ev.owner === 'ERE') ere += Math.max(0, move); else cre += Math.max(0, move);
      rows.push({
        id: ev.id, label: ev.desc, owner: ev.owner,
        dur: ev.dur, date: r.finishDate, move
      });
    }
    return { rows, ere, cre, finish: rows[rows.length - 1].date, finishDay: prev };
  }

  function paint(flashLast = false) {
    const { rows, ere, cre, finish, finishDay } = compute();
    tbody.replaceChildren(...rows.map((r, i) => {
      if (r.base) {
        return el('tr.base', [
          el('td', '—'), el('td', r.label), el('td', ''), el('td.n', ''),
          el('td.n', d2(r.date)), el('td.n', ''), el('td.n', ''), el('td.n', '')
        ]);
      }
      const lit = flashLast && i === rows.length - 1;
      return el('tr', { class: lit ? 'is-lit' : '' }, [
        el('td', { style: { fontFamily: 'var(--f-data)' } }, r.id),
        el('td', r.label),
        el('td', el('span', { class: 'tag tag--' + (r.owner === 'ERE' ? 'emp' : 'con') }, r.owner)),
        el('td.n', r.dur + 'd'),
        el('td.n', d2(r.date)),
        el('td.n', { class: 'n ' + (r.move > 0 ? 'crit' : '') }, r.move ? days(r.move, { sign: true }) : '—'),
        el('td.n', { class: 'n emp' }, r.owner === 'ERE' && r.move > 0 ? days(r.move) : ''),
        el('td.n', { class: 'n con' }, r.owner === 'CRE' && r.move > 0 ? days(r.move) : '')
      ]);
    }));
    if (rows.length > 1) {
      tbody.append(el('tr.sum', [
        el('td', ''), el('td', 'Totals'), el('td', ''), el('td.n', ''),
        el('td.n', d2(finish)),
        el('td.n', days(finishDay - baseRes.finishDay)),
        el('td.n', { class: 'n emp' }, days(ere)),
        el('td.n', { class: 'n con' }, days(cre))
      ]));
    }

    setReadout(ro, 1, d2(finish), 'ink');
    setReadout(ro, 2, days(ere), 'emp');
    setReadout(ro, 3, days(cre), 'con');
    setReadout(ro, 4, days(finishDay - baseRes.finishDay));

    stepBtn.disabled = inserted >= events.length;
    stepBtn.textContent = inserted >= events.length
      ? 'All events inserted'
      : `▶ Insert event ${events[inserted].id} (${events[inserted].owner})`;
    backBtn.disabled = inserted === 0;
  }

  const stepBtn = el('button.btn.btn--sm.btn--primary', {
    type: 'button',
    onclick: () => {
      if (inserted >= events.length) return;
      const ev = events[inserted];
      inserted++;
      paint(true);
      say(`${ev.id} inserted. ${ev.owner === 'ERE' ? 'Employer' : 'Contractor'} risk event.`);
    }
  }, '▶ Insert next event');

  const backBtn = el('button.btn.btn--sm', {
    type: 'button', onclick: () => { if (inserted > 0) { inserted--; paint(); } }
  }, '← Undo');

  const allBtn = el('button.btn.btn--sm', {
    type: 'button', onclick: () => { inserted = events.length; paint(); }
  }, 'Insert all');

  const modeTabs = tabs(['Combined (EDE + CDE)', 'Employer events only'],
    i => { combined = i === 0; paint(); }, 0);

  const table = el('table.liab', [
    el('thead', el('tr', [
      el('th', 'Event'), el('th', 'Description'), el('th', 'Risk'),
      el('th.n', 'Duration'), el('th.n', 'Impacted completion'),
      el('th.n', 'Movement'), el('th.n', 'EDE'), el('th.n', 'CDE')
    ])),
    tbody
  ]);

  paint();

  return fig(
    props.title || 'Impacted as-planned',
    'Additive · single base · the baseline never moves',
    el('div.scroll-x', table),
    props.note || 'Notice what this method cannot see. The baseline durations and logic are frozen, so every day of the answer assumes the contractor would otherwise have built exactly to plan. It cannot show true concurrency, because there is no as-built here at all — only an approximate concurrency read off the difference between the combined run and the employer-only run.',
    {
      before: [
        ctlBar([el('span.ctl__lbl', 'Model'), modeTabs], true),
        ctlBar([stepBtn, backBtn, allBtn])
      ],
      extras: [ro],
      flush: true
    }
  );
}

/* ═══════════════════════════════════════════════════════════════
   2 · TIME IMPACT ANALYSIS
   Multiple bases. Progress is entered up to the day before each
   event, the fragnet goes into THAT programme, and the gains and
   losses between updates accrue to whoever earned them.
   ═══════════════════════════════════════════════════════════════ */

export function timeImpact(props = {}) {
  const data = props.data || TIA_DEMO;
  let upto = 0;

  const tbody = el('tbody');
  const ro = readout([
    ['Total delay', '0d'],
    ['Employer (EDE)', '0d', 'emp'],
    ['Contractor (CDE)', '0d', 'con'],
    ['Concurrent', '0d', 'neu'],
    ['EOT due', '0d', 'ink']
  ]);

  function paint() {
    const rows = data.rows.slice(0, upto || data.rows.length);
    let ede = 0, cde = 0, con = 0;

    tbody.replaceChildren(...rows.map((r, i) => {
      if (r.type === 'EDE') ede += r.move;
      else if (r.type === 'CDE') cde += r.move;
      else if (r.type === 'CONC') con += r.move;
      else if (r.type === 'UPD') { if (r.move < 0) cde += r.move; else cde += r.move; }

      const cls = r.type === 'BASE' ? 'base' : (r.type === 'UPD' ? 'upd' : '');
      const lit = upto && i === rows.length - 1;
      return el('tr', { class: cls + (lit ? ' is-lit' : '') }, [
        el('td', { style: { fontFamily: 'var(--f-data)' } }, r.ref || ''),
        el('td', r.desc),
        el('td', r.type === 'EDE' ? el('span.tag.tag--emp', 'EDE')
          : r.type === 'CDE' ? el('span.tag.tag--con', 'CDE')
          : r.type === 'CONC' ? el('span.tag.tag--neu', 'CONC') : ''),
        el('td.n', r.dd ? d2(r.dd) : ''),
        el('td.n', d2(r.proj)),
        el('td.n', { class: 'n ' + (r.move > 0 ? 'crit' : r.move < 0 ? 'slk' : '') },
          r.move === 0 ? '—' : days(r.move, { sign: true })),
        el('td.n', { class: 'n emp' }, r.type === 'EDE' ? days(r.move) : ''),
        el('td.n', { class: 'n con' }, r.type === 'CDE' || (r.type === 'UPD' && r.move !== 0) ? days(r.move, { sign: r.move < 0 }) : ''),
        el('td.n', { class: 'n neu' }, r.type === 'CONC' ? days(r.move) : '')
      ]);
    }));

    const total = ede + cde + con;
    tbody.append(el('tr.sum', [
      el('td', ''), el('td', 'Totals'), el('td', ''), el('td.n', ''), el('td.n', ''),
      el('td.n', days(total)),
      el('td.n', { class: 'n emp' }, days(ede)),
      el('td.n', { class: 'n con' }, days(cde, { sign: cde < 0 })),
      el('td.n', { class: 'n neu' }, days(con))
    ]));

    setReadout(ro, 0, days(total));
    setReadout(ro, 1, days(ede), 'emp');
    setReadout(ro, 2, days(cde, { sign: cde < 0 }), 'con');
    setReadout(ro, 3, days(con), 'neu');
    setReadout(ro, 4, days(ede + con), 'ink');

    step.disabled = upto >= data.rows.length;
  }

  const step = el('button.btn.btn--sm.btn--primary', {
    type: 'button',
    onclick: () => { upto = Math.min(data.rows.length, (upto || 0) + 1); paint(); }
  }, '▶ Step through the windows');
  const all = el('button.btn.btn--sm', {
    type: 'button', onclick: () => { upto = data.rows.length; paint(); }
  }, 'Show all');
  const rst = el('button.btn.btn--sm', {
    type: 'button', onclick: () => { upto = 1; paint(); }
  }, '↺ Reset');

  upto = 1;
  paint();

  const table = el('table.liab', [
    el('thead', el('tr', [
      el('th', 'Ref'), el('th', 'Event / update'), el('th', 'Risk'),
      el('th.n', 'Data date'), el('th.n', 'Projected completion'),
      el('th.n', 'Loss / gain'), el('th.n', 'EDE'), el('th.n', 'CDE'), el('th.n', 'Conc.')
    ])),
    tbody
  ]);

  return fig(
    props.title || 'Time impact analysis',
    'Additive · multiple base · each window resets the clock',
    el('div.scroll-x', table),
    props.note || 'The grey rows are progress updates, not delay events. They matter: a gain between two updates belongs to the contractor, and a loss nobody can attribute to an employer risk event is, by definition, a contractor risk event. That is what makes this method cumulative and forward-looking rather than a single theoretical impact.',
    { before: [ctlBar([step, all, rst], true)], extras: [ro], flush: true }
  );
}

/* ═══════════════════════════════════════════════════════════════
   3 · COLLAPSED AS-BUILT
   The same ledger with the sign reversed. Start from what happened
   and pull events back out, in reverse chronological order.
   ═══════════════════════════════════════════════════════════════ */

export function collapsedAsBuilt(props = {}) {
  const data = props.data || CAB_DEMO;
  let pulled = 0;

  const tbody = el('tbody');
  const ro = readout([
    ['As-built completion', d2(data.asBuilt)],
    ['Collapsed to', d2(data.asBuilt), 'ink'],
    ['Employer events out', '0d', 'emp'],
    ['Contractor events out', '0d', 'con'],
    ['Residual', '—']
  ]);

  function paint() {
    const rows = data.rows.slice(0, pulled);
    let ede = 0, cde = 0;
    let current = data.asBuilt;

    tbody.replaceChildren(
      el('tr.base', [
        el('td', '—'), el('td', 'As-built programme, all events present'),
        el('td', ''), el('td.n', ''), el('td.n', d2(data.asBuilt)), el('td.n', ''), el('td.n', ''), el('td.n', '')
      ]),
      ...rows.map((r, i) => {
        if (r.type === 'EDE') ede += r.move; else if (r.type === 'CDE') cde += r.move;
        current = r.proj;
        return el('tr', { class: i === rows.length - 1 ? 'is-lit' : '' }, [
          el('td', { style: { fontFamily: 'var(--f-data)' } }, r.ref),
          el('td', r.desc),
          el('td', r.type === 'EDE' ? el('span.tag.tag--emp', 'EDE') : el('span.tag.tag--con', 'CDE')),
          el('td.n', r.dur + 'd'),
          el('td.n', d2(r.proj)),
          el('td.n', { class: 'n ' + (r.move > 0 ? 'slk' : 'dim') },
            r.move === 0 ? 'no movement' : '−' + r.move + 'd'),
          el('td.n', { class: 'n emp' }, r.type === 'EDE' && r.move ? days(r.move) : ''),
          el('td.n', { class: 'n con' }, r.type === 'CDE' && r.move ? days(r.move) : '')
        ]);
      })
    );

    if (pulled >= data.rows.length) {
      const residual = dayDiff(data.contract, current);
      tbody.append(el('tr.sum', [
        el('td', ''), el('td', 'Collapsed completion, all known events removed'),
        el('td', ''), el('td.n', ''), el('td.n', d2(current)),
        el('td.n', ''), el('td.n', { class: 'n emp' }, days(ede)), el('td.n', { class: 'n con' }, days(cde))
      ]));
      setReadout(ro, 4, residual === 0 ? 'nil' : days(residual) + ' unexplained', residual > 0 ? 'crit' : 'slack');
      resid.hidden = residual <= 0;
    } else {
      setReadout(ro, 4, '—');
      resid.hidden = true;
    }

    setReadout(ro, 1, d2(current), 'ink');
    setReadout(ro, 2, days(ede), 'emp');
    setReadout(ro, 3, days(cde), 'con');
    step.disabled = pulled >= data.rows.length;
    step.textContent = pulled >= data.rows.length
      ? 'All events extracted'
      : `▶ Extract ${data.rows[pulled].ref} (${data.rows[pulled].type})`;
  }

  const resid = el('div.callout.callout--warn', { hidden: true, style: { marginTop: 'var(--s4)' } }, [
    el('span.callout__l', 'Residual delay'),
    el('p', 'Every known event has been pulled out and the programme still finishes after the contract date. That remainder is not employer delay — nobody has identified a cause for it. By definition it falls to the contractor, which is why an analyst running this method has every incentive to identify as many events as possible before collapsing anything.')
  ]);

  const step = el('button.btn.btn--sm.btn--primary', {
    type: 'button', onclick: () => { pulled = Math.min(data.rows.length, pulled + 1); paint(); }
  }, '▶ Extract');
  const all = el('button.btn.btn--sm', {
    type: 'button', onclick: () => { pulled = data.rows.length; paint(); }
  }, 'Extract all');
  const rst = el('button.btn.btn--sm', {
    type: 'button', onclick: () => { pulled = 0; paint(); }
  }, '↺ Reset');

  paint();

  const table = el('table.liab', [
    el('thead', el('tr', [
      el('th', 'Ref'), el('th', 'Event extracted'), el('th', 'Risk'),
      el('th.n', 'Duration'), el('th.n', 'Collapsed completion'),
      el('th.n', 'Movement'), el('th.n', 'EDE'), el('th.n', 'CDE')
    ])),
    tbody
  ]);

  return fig(
    props.title || 'Collapsed as-built',
    'Subtractive · single base · “but for these events…”',
    [el('div.scroll-x', table), resid],
    props.note || 'Extraction order matters, and so does the method: dissolving an activity keeps the work flow intact, whereas deleting it leaves hanging chains that collapse further than they should. The events are pulled in reverse chronological order and contractor events first, so the contractor gets the benefit of any concurrency.',
    { before: [ctlBar([step, all, rst], true)], extras: [ro], flush: true }
  );
}

/* ═══════════════════════════════════════════════════════════════
   4 · ACTIVITY LEVEL VARIANCE
   As-planned versus as-built, done properly. The trap this widget
   exists to spring: a project 120 days late can contain 142 days of
   delay and 22 days of recovery, and only the activity-level view
   ever shows you that.
   ═══════════════════════════════════════════════════════════════ */

export function activityVariance(props = {}) {
  const rows = props.rows || ALV_DEMO;
  let mode = 'alv';

  const tbody = el('tbody');
  const ro = readout([
    ['Project level variance', '—'],
    ['Critical delay found', '—', 'crit'],
    ['Recovery achieved', '—', 'slack'],
    ['Net', '—', 'ink']
  ]);

  function compute() {
    let cum = 0, lost = 0, gained = 0;
    const out = [];
    for (const r of rows) {
      const isNew = r.ps === null;
      const sv = isNew ? null : dayDiff(r.ps, r.as) - cum;
      const fv = isNew ? r.dur : dayDiff(r.pf, r.af) - cum;
      const alv = isNew ? r.dur : (sv + (fv - sv));
      cum += alv;
      if (alv > 0) lost += alv; else gained += -alv;
      out.push({ ...r, sv, fv, alv, cum });
    }
    return { out, lost, gained, cum };
  }

  function paint() {
    const { out, lost, gained, cum } = compute();
    tbody.replaceChildren(...out.map(r => el('tr', [
      el('td', { style: { fontFamily: 'var(--f-data)' } }, r.id),
      el('td', r.desc),
      el('td.n', r.ps ? d2(r.ps) : '—'),
      el('td.n', r.pf ? d2(r.pf) : '—'),
      el('td.n', d2(r.as)),
      el('td.n', d2(r.af)),
      mode === 'alv' && el('td.n', { class: 'n dim' }, r.sv === null ? 'new' : days(r.sv, { sign: true })),
      el('td.n', { class: 'n ' + (r.alv > 0 ? 'crit' : r.alv < 0 ? 'slk' : 'dim') },
        days(r.alv, { sign: true })),
      el('td.n', { style: { fontWeight: '600' } }, days(r.cum))
    ].filter(Boolean))));

    setReadout(ro, 0, days(cum));
    setReadout(ro, 1, days(lost), 'crit');
    setReadout(ro, 2, days(gained), 'slack');
    setReadout(ro, 3, days(cum), 'ink');
  }

  const t = tabs(['Full working', 'Summary'], i => { mode = i === 0 ? 'alv' : 'sum'; build(); }, 0);

  const table = el('table.liab');
  function build() {
    table.replaceChildren(
      el('thead', el('tr', [
        el('th', 'Act'), el('th', 'Description'),
        el('th.n', 'Planned start'), el('th.n', 'Planned finish'),
        el('th.n', 'Actual start'), el('th.n', 'Actual finish'),
        mode === 'alv' && el('th.n', 'Start var.'),
        el('th.n', 'ALV'), el('th.n', 'Cumulative')
      ].filter(Boolean))),
      tbody
    );
    paint();
  }
  build();

  return fig(
    props.title || 'Activity level variance',
    'Analytical · as-planned versus as-built along the as-built critical path',
    el('div.scroll-x', table),
    props.note || 'Read the last two columns together. Each variance is measured NET of everything that came before it, which is the only way to separate a genuinely late activity from one that merely inherited someone else\'s lateness. A project-level comparison would report the final number and nothing else — and would miss both the delay and the recovery entirely.',
    { before: [ctlBar([el('span.ctl__lbl', 'View'), t], true)], extras: [ro], flush: true }
  );
}

/* ═══════════════════════════════════════════════════════════════
   5 · METHOD SELECTOR
   Answer four questions about the project, get the technique the
   SCL Protocol and RP-29R-03 would actually point you at.
   ═══════════════════════════════════════════════════════════════ */

export function methodChooser(props = {}) {
  const Q = [
    { k: 'when', q: 'When are you doing this?',
      a: [['live', 'During the works, prospectively'], ['after', 'After completion, forensically']] },
    { k: 'updates', q: 'Do you have regular, reliable CPM progress updates?',
      a: [['yes', 'Yes — monthly or better'], ['some', 'A few, with gaps'], ['no', 'None worth relying on']] },
    { k: 'asbuilt', q: 'Is there a detailed as-built programme, or records to build one?',
      a: [['yes', 'Yes, activity by activity'], ['no', 'No, or only summary records']] },
    { k: 'question', q: 'What does the contract make you prove?',
      a: [['likely', 'The LIKELY delay at the time of the event'], ['actual', 'The delay that ACTUALLY happened']] }
  ];

  const state = {};
  const result = el('div');

  function decide() {
    if (Object.keys(state).length < Q.length) {
      result.replaceChildren(el('p.dim', { style: { fontSize: 'var(--t-xs)' } },
        `Answer all four — ${Q.length - Object.keys(state).length} to go.`));
      return;
    }
    const { when, updates, asbuilt, question } = state;
    let pick, why, second;

    if (when === 'live') {
      if (updates === 'no') {
        pick = 'Impacted as-planned';
        why = 'With no updates to base an impact on, the contract baseline is all you have. Keep the results in their place: they show what would have happened, not what did, and they will not price prolongation.';
        second = 'Get a progress-update regime running immediately. Every month without one narrows your options later.';
      } else {
        pick = 'Time impact analysis';
        why = 'This is exactly the case the SCL Protocol names it for — an employer risk event has occurred, and someone must decide the extension of time due at the time. Impact the most recent accepted programme, not the original baseline.';
        second = 'Keep the fragnets short. A fragnet longer than one update cycle overrides a month of real progress and drifts from reality.';
      }
    } else if (updates === 'yes') {
      pick = 'Contemporaneous windows analysis';
      why = 'Reliable monthly updates are the strongest evidence there is. Track float month to month, find the driving activities in each window, and attribute the movement. It is observational, so nothing is impacted or collapsed — the numbers stay grounded in what the parties actually reported at the time.';
      second = question === 'likely'
        ? 'Add a month-to-month update analysis to show what the delay WOULD have been without the contractor’s re-sequencing. That is how acceleration gets demonstrated.'
        : 'Add a time impact analysis if entitlement at the time is also in issue — a tribunal is helped by a range of opinion.';
    } else if (asbuilt === 'yes') {
      pick = question === 'likely' ? 'Collapsed as-built' : 'As-planned versus as-built (activity level variance)';
      why = question === 'likely'
        ? 'A detailed as-built and no usable updates leaves the “but for” question. Be honest about the weakness: you will be inventing as-built logic, and that reconstruction is the single most subjective step in any method.'
        : 'Deduce the as-built critical path from the records, then measure each activity’s variance net of what came before. Intuitive, correctable, and readily supported by the documents.';
      second = 'Confine the collapsed as-built to linear work — tunnels, roads, pipelines. On a building with a thousand activities the as-built logic becomes a house of cards.';
    } else {
      pick = 'Total time assessment — and be careful';
      why = 'Without updates and without an as-built you are left comparing planned duration to actual duration, which is a global claim in programme form. It can succeed, but the bar is high: a reasonable baseline, efficient performance, no contractor contribution, and no other way to demonstrate cause and effect.';
      second = 'Before accepting this, look again for records. Site diaries, payment applications and photographs will usually build a better as-built than you expect.';
    }

    result.replaceChildren(
      el('div.callout.callout--law', [
        el('span.callout__l', 'Indicated technique'),
        el('p', { style: { fontSize: 'var(--t-md)', color: 'var(--p-100)', fontWeight: '600' } }, pick),
        el('p', why)
      ]),
      el('div.callout.callout--protocol', { style: { marginTop: 'var(--s3)' } }, [
        el('span.callout__l', 'Also do this'),
        el('p', second)
      ]),
      el('p.dim', { style: { fontSize: 'var(--t-xs)', marginTop: 'var(--s3)' } },
        'Neither guide is prescriptive. Both list the same factors: the contract, the records, the size of the dispute, the time and budget available, and the skill of the analyst. A departure from the indicated method is fine when it is a conscious, explained choice — and fatal when it is not.')
    );
  }

  const form = el('div', { style: { display: 'grid', gap: 'var(--s4)' } }, Q.map(q => {
    const btns = q.a.map(([v, label]) => el('button.opt', {
      type: 'button',
      onclick: () => {
        state[q.k] = v;
        btns.forEach(b => b.classList.remove('opt--right'));
        btns[q.a.findIndex(x => x[0] === v)].classList.add('opt--right');
        decide();
      }
    }, [el('span.opt__k', '·'), el('span', label)]));
    return el('div', [
      el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--p-100)', marginBottom: 'var(--s2)' } }, q.q),
      el('div', { style: { display: 'grid', gap: '6px' } }, btns)
    ]);
  }));

  decide();

  return fig(
    props.title || 'Which technique fits this project?',
    'Four questions',
    [form, el('div', { style: { marginTop: 'var(--s5)' } }, result)],
    props.note
  );
}

/* ═══════════════════════════════════════════════════════════════
   DEMO DATA — small, linear, and checkable by hand
   ═══════════════════════════════════════════════════════════════ */

const DEMO_NET = [
  { id: 'A100', desc: 'Site clearance', dur: 14, pred: [] },
  { id: 'A200', desc: 'Piling', dur: 30, pred: ['A100'] },
  { id: 'A300', desc: 'Pile caps and ground beams', dur: 25, pred: ['A200'] },
  { id: 'A400', desc: 'Frame erection', dur: 45, pred: ['A300'] },
  { id: 'A450', desc: 'Drainage', dur: 20, pred: ['A200'] },
  { id: 'A500', desc: 'Envelope', dur: 40, pred: ['A400'] },
  { id: 'A600', desc: 'M&E first fix', dur: 35, pred: ['A400'] },
  { id: 'A700', desc: 'Finishes', dur: 40, pred: ['A500', 'A600'] },
  { id: 'A800', desc: 'Commissioning', dur: 21, pred: ['A700'] },
  { id: 'A900', desc: 'Practical completion', dur: 0, milestone: true, pred: ['A800'] }
];

const DEMO_EVENTS = [
  { id: 'E01', desc: 'Unforeseen ground conditions at piling', dur: 15, owner: 'ERE', pred: ['A200'], succ: ['A300'] },
  { id: 'C01', desc: 'Piling rig breakdown', dur: 8, owner: 'CRE', pred: ['A200'], succ: ['A300'] },
  { id: 'E02', desc: 'Late structural steel information', dur: 20, owner: 'ERE', pred: ['A300'], succ: ['A400'] },
  { id: 'C02', desc: 'Rework to out-of-tolerance frame', dur: 10, owner: 'CRE', pred: ['A400'], succ: ['A500'] },
  { id: 'E03', desc: 'Instructed change to cladding', dur: 18, owner: 'ERE', pred: ['A500'], succ: ['A700'] }
];

const TIA_DEMO = {
  rows: [
    { ref: 'Baseline', desc: 'Contract baseline programme', type: 'BASE', dd: '2008-06-01', proj: '2009-01-01', move: 0 },
    { ref: '001', desc: 'Late possession of the east compound', type: 'EDE', dd: '2008-06-01', proj: '2009-01-02', move: 1 },
    { ref: '002', desc: 'Instructed additional services below slab', type: 'EDE', dd: '2008-06-01', proj: '2009-01-05', move: 3 },
    { ref: 'UD01', desc: 'Progress update — June', type: 'UPD', dd: '2008-06-30', proj: '2009-01-05', move: 0 },
    { ref: '003', desc: 'Sub-contractor labour shortage', type: 'CDE', dd: '2008-06-30', proj: '2009-01-08', move: 3 },
    { ref: '004', desc: 'Revised column details issued late', type: 'EDE', dd: '2008-06-30', proj: '2009-01-10', move: 2 },
    { ref: 'UD02', desc: 'Progress update — July (re-sequencing gain)', type: 'UPD', dd: '2008-07-31', proj: '2009-01-06', move: -4 },
    { ref: 'UD02A', desc: 'Intermediate update — 14 August', type: 'UPD', dd: '2008-08-14', proj: '2009-01-08', move: 2 },
    { ref: '005', desc: 'Defective blockwork requiring rebuild', type: 'CDE', dd: '2008-08-14', proj: '2009-01-15', move: 7 },
    { ref: 'UD03', desc: 'Progress update — August', type: 'UPD', dd: '2008-08-31', proj: '2009-01-14', move: -1 },
    { ref: '006', desc: 'Plant breakdown', type: 'CONC', dd: '2008-08-31', proj: '2009-01-15', move: 1 },
    { ref: '007', desc: 'Late acoustic ceiling instruction', type: 'EDE', dd: '2008-08-31', proj: '2009-01-18', move: 3 }
  ]
};

const CAB_DEMO = {
  asBuilt: '2009-01-18',
  contract: '2009-01-01',
  rows: [
    { ref: '007', desc: 'Late acoustic ceiling instruction', type: 'EDE', dur: 4, proj: '2009-01-18', move: 0 },
    { ref: '006', desc: 'Plant breakdown', type: 'CDE', dur: 1, proj: '2009-01-15', move: 3 },
    { ref: '005', desc: 'Defective blockwork requiring rebuild', type: 'CDE', dur: 9, proj: '2009-01-09', move: 6 },
    { ref: '004', desc: 'Revised column details issued late', type: 'EDE', dur: 5, proj: '2009-01-04', move: 5 },
    { ref: '003', desc: 'Sub-contractor labour shortage', type: 'CDE', dur: 3, proj: '2009-01-04', move: 0 },
    { ref: '002', desc: 'Instructed additional services below slab', type: 'EDE', dur: 3, proj: '2009-01-02', move: 2 },
    { ref: '001', desc: 'Late possession of the east compound', type: 'EDE', dur: 3, proj: '2009-01-02', move: 0 }
  ]
};

const ALV_DEMO = [
  { id: 'A-001', desc: 'Mobilise', ps: '2006-01-01', pf: '2006-01-02', as: '2006-01-06', af: '2006-01-10', dur: 0 },
  { id: 'A-002', desc: 'Advanced works / site clearing', ps: '2006-01-02', pf: '2006-01-07', as: '2006-01-07', af: '2006-01-11', dur: 0 },
  { id: 'A-003', desc: 'Install pipe 00010–10200', ps: '2006-01-07', pf: '2006-02-07', as: '2006-01-12', af: '2006-02-12', dur: 0 },
  { id: 'X-012', desc: 'Pipe repair — instructed', ps: null, pf: null, as: '2006-02-13', af: '2006-05-24', dur: 100 },
  { id: 'A-006', desc: 'Test pipe', ps: '2006-02-07', pf: '2006-02-12', as: '2006-05-25', af: '2006-05-30', dur: 0 },
  { id: 'X-042', desc: 'Repair leak', ps: null, pf: null, as: '2006-05-31', af: '2006-06-02', dur: 2 },
  { id: 'A-020', desc: 'East end connection', ps: '2006-02-12', pf: '2006-02-17', as: '2006-06-03', af: '2006-06-08', dur: 0 },
  { id: 'X-045', desc: 'Install additional manhole', ps: null, pf: null, as: '2006-06-09', af: '2006-06-15', dur: 15 },
  { id: 'A-024', desc: 'Back-fill pipe', ps: '2006-02-17', pf: '2006-02-28', as: '2006-06-09', af: '2006-06-16', dur: 0 },
  { id: 'X-050', desc: 'Instructed additional backfill', ps: null, pf: null, as: '2006-06-17', af: '2006-06-27', dur: 10 },
  { id: 'A-030', desc: 'Final acceptance / handover', ps: '2006-02-28', pf: '2006-02-28', as: '2006-06-28', af: '2006-06-28', dur: 0 }
];

export { DEMO_NET, DEMO_EVENTS };
