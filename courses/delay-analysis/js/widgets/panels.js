/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — supporting instruments
   Matrices, procedures, checklists, records, comparisons, scenarios.
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, days, altTable } from '../dom.js';
import { md, table as mdTable, inline } from '../markup.js';
import * as store from '../store.js';
import { fig, ctlBar, tabs, readout, legend } from './kit.js';

/* ── a plain table straight from JSON ───────────────────────── */
export function staticTable(props = {}) {
  return fig(props.title, props.sub, mdTable(props), props.note);
}

/* ═══════════════════════════════════════════════════════════════
   DELAY CLASSIFICATION MATRIX
   Excusable / compensable, and the answer for each combination.
   ═══════════════════════════════════════════════════════════════ */

export function delayMatrix(props = {}) {
  const CELLS = {
    'ERE-yes': {
      t: 'Excusable and compensable',
      d: 'An employer risk event, critical, with no concurrent contractor delay. Time AND money.',
      ex: 'Late release of design information that drives the critical path.',
      tone: 'employer'
    },
    'ERE-no': {
      t: 'Excusable, non-compensable',
      d: 'Neutral events. Time, but no money — the contractor is relieved of damages and carries its own costs.',
      ex: 'Exceptionally adverse weather. Force majeure. Civil commotion.',
      tone: 'neutral'
    },
    'CRE-yes': {
      t: 'Does not exist',
      d: 'A contractor risk event cannot be compensable. If the contractor caused it, the contractor pays for it.',
      ex: '—',
      tone: 'dim'
    },
    'CRE-no': {
      t: 'Non-excusable',
      d: 'No time, no money, and liquidated damages run. The default position for anything unexplained.',
      ex: 'Under-resourcing. Rework. Sub-contractor default. Plant breakdown.',
      tone: 'contractor'
    }
  };

  let sel = 'ERE-yes';
  const detail = el('div', { style: { marginTop: 'var(--s4)' } });

  function paint() {
    const c = CELLS[sel];
    detail.replaceChildren(el('div.callout', {
      class: 'callout--' + (c.tone === 'employer' ? 'protocol' : c.tone === 'contractor' ? 'warn' : 'law')
    }, [
      el('span.callout__l', c.t),
      el('p', c.d),
      c.ex !== '—' && el('p', { style: { color: 'var(--p-300)' } }, [el('b', 'Typically: '), c.ex])
    ]));
    cells.forEach(b => b.classList.toggle('is-on', b.dataset.k === sel));
  }

  const cells = [];
  function cell(k, label, tick) {
    const b = el('div.mtx__cell', {
      role: 'button', tabindex: '0',
      onclick: () => { sel = k; paint(); },
      onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = k; paint(); } }
    }, [
      el('b', label),
      el('p', { class: 'tick' }, tick)
    ]);
    b.dataset.k = k;
    cells.push(b);
    return b;
  }

  const grid = el('div.mtx', [
    el('div.mtx__h', ''),
    el('div.mtx__h', 'Compensable'),
    el('div.mtx__h', 'Non-compensable'),
    el('div.mtx__h', 'Employer risk event'),
    cell('ERE-yes', 'Time + money', 'EOT · prolongation'),
    cell('ERE-no', 'Time only', 'EOT · no damages'),
    el('div.mtx__h', 'Contractor risk event'),
    cell('CRE-yes', 'Impossible', '—'),
    cell('CRE-no', 'Neither', 'LDs run')
  ]);

  paint();

  return fig(
    props.title || 'Four kinds of delay',
    'Click any cell',
    [grid, detail],
    props.note || 'Two independent tests, and it is the independence that trips people up. Excusable answers "does the contractor get relief from damages?" Compensable answers "does anyone pay for the time?" A delay can pass the first and fail the second, and an entitlement to time never automatically carries an entitlement to money.'
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONCURRENCY SCENARIOS
   The three figures, with what each party would argue and what the
   SCL Protocol actually advises.
   ═══════════════════════════════════════════════════════════════ */

export function concurrency(props = {}) {
  const SCN = [
    {
      n: 'Equal concurrent delay',
      sub: 'One month of employer delay, one month of contractor delay, running together',
      emp: 4, con: 4, off: 0,
      contractor: '1 month EOT and 1 month of prolongation costs.',
      employer: 'No EOT and no prolongation — the contractor would have been late anyway.',
      scl: '1 month EOT. No prolongation. But the employer still pays any cost arising DIRECTLY from its own delay event.',
      why: 'The Malmaison position: where two concurrent causes operate and one is a relevant event, the contractor gets its extension of time notwithstanding the other. Money is a separate test, and it fails here because the same cost would have been incurred anyway.'
    },
    {
      n: 'Employer delay exceeds contractor delay',
      sub: 'Two months of employer delay against one month of contractor delay',
      emp: 8, con: 4, off: 0,
      contractor: '2 months EOT and 2 months of prolongation.',
      employer: '1 month EOT and 1 month of prolongation.',
      scl: '2 months EOT. 1 month of prolongation — the month by which the employer delay exceeds the concurrent contractor delay.',
      why: 'Time and money part company. The full employer delay drives the extension of time; only the non-concurrent portion carries compensation, because for the first month the loss would have been suffered in any event.'
    },
    {
      n: 'Contractor delay exceeds employer delay',
      sub: 'One month of employer delay against two months of contractor delay',
      emp: 4, con: 8, off: 0,
      contractor: '1 month EOT and 1 month of prolongation.',
      employer: 'Neither — our delay was swallowed by yours.',
      scl: '1 month EOT. No prolongation. Costs arising directly from the employer event remain payable.',
      why: 'The contractor still gets relief for the period the relevant event operated, even though it was going to be late regardless. What it does not get is time-related money it would have spent anyway.'
    }
  ];

  let i = 0;
  const stage = el('div');

  function paint() {
    const s = SCN[i];
    const unit = 100 / 24;
    stage.replaceChildren(
      el('p', { style: { fontSize: 'var(--t-xs)', color: 'var(--p-300)', marginBottom: 'var(--s4)' } }, s.sub),
      el('div.scn', [
        row('As-planned critical path', [{ w: 12, l: 'Planned work', k: 'plan', x: 0 }], 12),
        row('Employer risk event', [{ w: s.emp, l: s.emp / 4 + ' month' + (s.emp > 4 ? 's' : ''), k: 'emp', x: 12 }], 12 + s.emp),
        row('Contractor risk event', [{ w: s.con, l: s.con / 4 + ' month' + (s.con > 4 ? 's' : ''), k: 'con', x: 12 }], 12 + s.con)
      ].map((r, ri) => { r.style.setProperty('--i', String(ri)); return r; })),
      el('div.verdicts', { style: { marginTop: 'var(--s5)' } }, [
        el('div', [el('span', 'Contractor argues'), el('p', s.contractor)]),
        el('div', [el('span', 'Employer argues'), el('p', s.employer)]),
        el('div.verdicts--scl', [el('span', { style: { color: 'var(--employer)' } }, 'SCL Protocol'), el('p', s.scl)])
      ]),
      el('div.callout.callout--law', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'Why'),
        el('p', s.why)
      ])
    );

    function row(label, bars, cdAt) {
      const track = el('div.scn__track');
      for (const b of bars) {
        track.append(el('div', {
          class: 'scn__b scn__b--' + b.k,
          style: { left: (b.x * unit) + '%', width: (b.w * unit) + '%' }
        }, el('span', b.l)));
      }
      track.append(el('div.scn__cd', {
        style: { left: (12 * unit) + '%' }, dataset: { l: 'contract date' }
      }));
      return el('div.scn__row', [el('div.scn__lbl', label), track]);
    }
  }

  const t = tabs(SCN.map((s, n) => 'Scenario ' + (n + 1)), n => { i = n; paint(); }, 0);
  paint();

  return fig(
    props.title || 'Concurrency — three scenarios, three answers',
    null,
    stage,
    props.note || 'True concurrency, where two causes start and end together, is rare. What is common is concurrent EFFECT — two events arising at different times whose consequences are felt over the same period. The Protocol treats the terms as interchangeable for this purpose, and so should you, provided you say which one you mean.',
    { before: [ctlBar([t], true)] }
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROCEDURE — a numbered method, step by step
   ═══════════════════════════════════════════════════════════════ */

export function steps(props = {}) {
  return fig(props.title, props.sub,
    el('div.steps', (props.steps || []).map((s, i) => el('div.step', [
      el('span.step__n', String(i + 1).padStart(2, '0')),
      el('div', [el('b', s.t), s.d && el('p', inline(s.d))]),
      s.m && el('span.step__m', s.m)
    ]))),
    props.note, { flush: true });
}

/* ═══════════════════════════════════════════════════════════════
   CHECKLIST — ticks persist, because these are meant to be used
   ═══════════════════════════════════════════════════════════════ */

export function checklist(props = {}) {
  const id = props.id || 'list';
  const items = props.items || [];
  const done = store.checklistFor(id);
  const foot = el('div.chk__foot');

  function count() {
    const s = store.checklistFor(id);
    foot.replaceChildren(
      el('span', 'Checked'),
      el('b', `${s.size} / ${items.length}`)
    );
  }

  const rows = items.map((t, i) => {
    const b = el('button', {
      type: 'button',
      aria: { pressed: String(done.has(i)) },
      onclick: () => {
        const set = new Set(store.toggleChecklist(id, i));
        b.setAttribute('aria-pressed', String(set.has(i)));
        count();
      }
    }, [el('i', '✓'), el('span', inline(t))]);
    return b;
  });

  count();

  return fig(props.title, props.sub,
    el('div.chk', [...rows, foot]),
    props.note, { flush: true });
}

/* ═══════════════════════════════════════════════════════════════
   RECORDS HIERARCHY
   Which document wins when two disagree.
   ═══════════════════════════════════════════════════════════════ */

export function recordsHierarchy(props = {}) {
  const ROWS = props.rows || [
    ['Daily reports and site diaries', 1, 1, 1],
    ['Date-stamped photographs', 1, 1, 2],
    ['Clerk of works records', 1, 1, 1],
    ['Labour and plant returns', 1, 1, 2],
    ['Timesheets', 1, 2, 2],
    ['Concrete test / welding certificates', 1, 1, 1],
    ['Daily inspection reports', 1, 1, 1],
    ['Requests for information', 7, 1, 2],
    ['Weekly progress reports', 7, 2, 2],
    ['Weekly sub-contractor reports', 7, 2, 2],
    ['Meeting minutes', 30, 4, 3],
    ['Monthly progress reports', 30, 3, 2],
    ['Payment applications', 30, 3, 3],
    ['Material delivery records', 30, 4, 3],
    ['Site observations recalled later', 90, 4, 3]
  ];

  let sort = 0;
  const host = el('div.recs');

  function paint() {
    const rows = [...ROWS].sort((a, b) => (sort === 0 ? 0 : a[sort] - b[sort]));
    host.replaceChildren(
      el('div.rec.rec--h', [el('span', 'Source'), el('b', 'Date'), el('b', 'Location'), el('b', 'Scope')]),
      ...rows.map(r => el('div.rec', [
        el('span', r[0]),
        el('b', { class: cls(r[1], true) }, r[1] === 1 ? '1 day' : r[1] + 'd'),
        el('b', { class: cls(r[2]) }, String(r[2])),
        el('b', { class: cls(r[3]) }, String(r[3]))
      ]))
    );
  }
  function cls(v, isDay) {
    const n = isDay ? (v <= 1 ? 1 : v <= 7 ? 2 : v <= 30 ? 3 : 4) : v;
    return 'r' + n;
  }

  const t = tabs(['As listed', 'By date accuracy', 'By location certainty', 'By scope certainty'],
    i => { sort = i; paint(); }, 0);
  paint();

  return fig(
    props.title || 'Hierarchy of records',
    'Accuracy in days · certainty of where · certainty of what',
    host,
    props.note || 'The point of a hierarchy is not to rank documents for their own sake. It is so that when a timesheet and a monthly report disagree about when something happened, the choice between them is made by a rule set in advance rather than by whichever suits the argument. Write the hierarchy down before you start looking.',
    { before: [ctlBar([el('span.ctl__lbl', 'Sort'), t], true)], flush: true }
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPARE — strengths and weaknesses side by side
   ═══════════════════════════════════════════════════════════════ */

export function compare(props = {}) {
  return fig(props.title, props.sub,
    el('div.cmp', (props.cards || []).map(c => el('div.cmp__c', [
      el('span.kicker', c.k),
      el('h4', c.t),
      el('ul', [
        ...(c.pro || []).map(p => el('li.pro', inline(p))),
        ...(c.con || []).map(p => el('li.con', inline(p)))
      ])
    ]))),
    props.note);
}

/* ═══════════════════════════════════════════════════════════════
   TAXONOMY — the RP-29R-03 tree, made walkable
   ═══════════════════════════════════════════════════════════════ */

export function taxonomy(props = {}) {
  const TREE = {
    q: 'Does the method calculate a delay, or observe one?',
    a: [
      {
        l: 'Observational — compare programmes and deduce',
        node: {
          q: 'Is the logic held still, or does it change between states?',
          a: [
            { l: 'Static — one baseline, one as-built',
              node: { q: 'Whole project, or period by period?', a: [
                { l: 'Gross', r: { n: 'MIP 3.1 — Observational / Static / Gross', c: 'As-planned versus as-built. A total time comparison.', tone: 'neutral' } },
                { l: 'Periodic', r: { n: 'MIP 3.2 — Observational / Static / Periodic', c: 'As-planned versus as-built windows analysis.', tone: 'slack' } }
              ] } },
            { l: 'Dynamic — logic changes update to update',
              node: { q: 'Use the updates as they are, or split progress from revisions?', a: [
                { l: 'As-is', r: { n: 'MIP 3.3 — Observational / Dynamic / Contemporaneous As-Is', c: 'Contemporaneous windows analysis. The authors’ preferred method when updates exist.', tone: 'slack' } },
                { l: 'Split', r: { n: 'MIP 3.4 — Observational / Dynamic / Contemporaneous Split', c: 'Month-to-month update analysis. Isolates delay caused by progress from delay caused by re-sequencing — the way acceleration is proved.', tone: 'employer' } }
              ] } }
          ]
        }
      },
      {
        l: 'Modelled — insert or remove events and recalculate',
        node: {
          q: 'Are you adding delay, or taking it away?',
          a: [
            { l: 'Additive',
              node: { q: 'One base programme, or many?', a: [
                { l: 'Single base', r: { n: 'MIP 3.6 — Modelled / Additive / Single Base', c: 'Impacted as-planned. Simplest, most theoretical, least persuasive on money.', tone: 'critical' } },
                { l: 'Multiple base', r: { n: 'MIP 3.7 — Modelled / Additive / Multiple Base', c: 'Time impact analysis. The SCL Protocol’s preferred technique for entitlement at the time.', tone: 'employer' } }
              ] } },
            { l: 'Subtractive',
              r: { n: 'MIP 3.8 — Modelled / Subtractive / Single Simulation', c: 'Collapsed as-built. “But for these events, when would it have finished?”', tone: 'contractor' } }
          ]
        }
      }
    ]
  };

  let path = [];
  const host = el('div');

  function nodeAt() {
    let n = TREE;
    for (const i of path) {
      const branch = n.a[i];
      if (branch.r) return { result: branch.r };
      n = branch.node;
    }
    return { node: n };
  }

  function paint() {
    const at = nodeAt();
    const crumbs = el('div.row', { style: { marginBottom: 'var(--s4)', gap: '6px' } }, [
      el('button.btn.btn--sm', {
        type: 'button', disabled: !path.length,
        onclick: () => { path = []; paint(); }
      }, '↺ Start'),
      ...path.map((_, i) => el('button.btn.btn--sm', {
        type: 'button', onclick: () => { path = path.slice(0, i); paint(); }
      }, '← back'))
    ]);

    if (at.result) {
      host.replaceChildren(crumbs, el('div.callout', {
        class: 'callout--' + (at.result.tone === 'critical' ? 'warn' : at.result.tone === 'employer' ? 'protocol' : 'site')
      }, [
        el('span.callout__l', 'You have arrived at'),
        el('p', { style: { fontSize: 'var(--t-md)', color: 'var(--p-100)', fontWeight: '600' } }, at.result.n),
        el('p', at.result.c)
      ]));
      return;
    }

    host.replaceChildren(crumbs,
      el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--p-100)', marginBottom: 'var(--s3)' } }, at.node.q),
      el('div', { style: { display: 'grid', gap: '6px' } },
        at.node.a.map((b, i) => el('button.opt', {
          type: 'button', onclick: () => { path = [...path, i]; paint(); }
        }, [el('span.opt__k', String(i + 1)), el('span', b.l)])))
    );
  }

  paint();

  return fig(
    props.title || 'The taxonomy, walked',
    'RP-29R-03 · four questions to a method implementation protocol',
    host,
    props.note || 'The value of this tree is not the names at the end of it. It is that two experts who each answer the four questions out loud cannot then talk past one another — they will agree on what they disagree about, which is more than most delay cases manage.'
  );
}

/* ═══════════════════════════════════════════════════════════════
   PACING TEST — four things you must show
   ═══════════════════════════════════════════════════════════════ */

export function pacingTest(props = {}) {
  const TESTS = [
    { t: 'Knowledge of the more critical delay', d: 'Contemporaneous evidence that you knew, at the time, that something else was driving the completion date.' },
    { t: 'An express decision to pace', d: 'A record showing you chose to slow down. A meeting minute, a monthly report, an internal instruction — anything dated.' },
    { t: 'Notice to the other party', d: 'You told them the work would be paced so as not to cause further delay or disruption.' },
    { t: 'The ability to restore', d: 'Evidence you could have gone back to normal output had the driving delay been removed. Without this, pacing is indistinguishable from simply being slow.' }
  ];

  let on = new Set();
  const verdict = el('div', { style: { marginTop: 'var(--s4)' } });

  function paint() {
    const n = on.size;
    verdict.replaceChildren(el('div.callout', {
      class: 'callout--' + (n === 4 ? 'site' : n >= 2 ? 'protocol' : 'warn')
    }, [
      el('span.callout__l', n === 4 ? 'Pacing is arguable' : n >= 2 ? 'Incomplete' : 'This is not pacing'),
      el('p', n === 4
        ? 'All four limbs are evidenced. The argument is available — that the late completion of this work was an elective, contemporaneous decision taken in the knowledge of a more critical delay elsewhere, and not a delay in its own right.'
        : n >= 2
          ? `${4 - n} limb${4 - n > 1 ? 's are' : ' is'} missing. Pacing asserted at the end of a project, when an as-built shows unimpacted activities running late, is treated with scepticism precisely because it is so easy to claim in hindsight.`
          : 'With none of this evidenced, what you have is a late activity. Calling it pacing after the event, unsupported by contemporaneous records, will not survive cross-examination.')
    ]));
  }

  const rows = TESTS.map((t, i) => {
    const b = el('button', {
      type: 'button', aria: { pressed: 'false' },
      onclick: () => {
        if (on.has(i)) on.delete(i); else on.add(i);
        b.setAttribute('aria-pressed', String(on.has(i)));
        paint();
      }
    }, [el('i', '✓'), el('div', [
      el('b', { style: { display: 'block', color: 'var(--p-100)', fontSize: 'var(--t-xs)' } }, t.t),
      el('span', { style: { color: 'var(--p-300)' } }, t.d)
    ])]);
    return b;
  });

  paint();

  return fig(
    props.title || 'Can you actually argue pacing?',
    'Tick what the records support',
    [el('div.chk', rows), verdict],
    props.note || 'Pacing cuts both ways. A design team that responds slowly while the works are already late will run exactly the same argument — that it responded just in time and caused no further delay. The four tests apply to whoever raises it.'
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCL PRINCIPLES — the twenty-one, browsable
   ═══════════════════════════════════════════════════════════════ */

export function sclPrinciples(props = {}) {
  const P = props.items || [];
  let open = -1;
  const host = el('div.steps');

  function paint() {
    host.replaceChildren(...P.map((p, i) => {
      const isOpen = open === i;
      return el('div.step', {
        role: 'button', tabindex: '0',
        style: { cursor: 'pointer' },
        onclick: () => { open = isOpen ? -1 : i; paint(); },
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open = isOpen ? -1 : i; paint(); } }
      }, [
        el('span.step__n', String(i + 1).padStart(2, '0')),
        el('div', [
          el('b', p.t),
          isOpen && el('p', inline(p.d))
        ]),
        el('span.step__m', isOpen ? '−' : '+')
      ]);
    }));
  }
  paint();

  return fig(
    props.title || 'The twenty-one core principles',
    'Society of Construction Law Delay and Disruption Protocol',
    host,
    props.note || 'Guidance, not law, and expressly not a statement of law. Its influence comes from being the first document to say plainly what good practice looks like — and from the fact that both parties can be held to it once a contract adopts it.',
    { flush: true }
  );
}
