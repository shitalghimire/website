/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — glossary, toolkit, settings, certificate
   ═══════════════════════════════════════════════════════════════ */

import { el, stagger, pct, dLong, say, n0 } from '../dom.js';
import { setGlossary, inline, md } from '../markup.js';
import * as store from '../store.js';
import { ctx } from '../app.js';
import { WIDGETS } from '../widgets/index.js';
import * as vault from '../vault.js';

/* ═══════════════════════════════════════════════════════════════
   GLOSSARY
   ═══════════════════════════════════════════════════════════════ */

export function glossary() {
  setGlossary(ctx.glossary);
  const entries = Object.entries(ctx.glossary)
    .map(([k, v]) => ({ k, ...v }))
    .sort((a, b) => a.t.localeCompare(b.t));

  const list = el('div.glist');
  const count = el('span.kicker');

  function paint(q = '') {
    const s = q.trim().toLowerCase();
    const hits = s
      ? entries.filter(e =>
          e.t.toLowerCase().includes(s) ||
          e.d.toLowerCase().includes(s) ||
          e.k.toLowerCase().includes(s))
      : entries;
    count.textContent = `${hits.length} of ${entries.length} terms`;
    list.replaceChildren(...hits.map(e => el('dl.gterm', {
      style: e.tone ? { borderLeftColor: `var(--${e.tone})` } : {}
    }, [
      el('dt', [e.t, e.abbr && el('em', e.abbr)]),
      el('dd', inline(e.d)),
      e.l && el('dd', el('a', { href: lessonHref(e.l) }, `Taught in ${e.l} →`))
    ])));
    if (!hits.length) {
      list.replaceChildren(el('div.msg', [
        el('h2', 'Nothing matches'),
        el('p', `No term contains “${q}”. Try a shorter word — most of this vocabulary is two words long and one of them is usually “float”.`)
      ]));
    }
  }

  const input = el('input', {
    type: 'search', placeholder: 'Search terms and definitions…',
    'aria-label': 'Search the glossary',
    oninput: e => paint(e.target.value)
  });

  paint();

  return el('div.wrap--n', [
    el('p', { style: { marginBottom: 'var(--s5)' } }, el('a.kicker', { href: '#/' }, '← The programme')),
    el('header', { style: { marginBottom: 'var(--s6)' } }, [
      el('span.kicker.kicker--b', 'Reference'),
      el('h1', 'Glossary'),
      el('p.dim', { style: { marginTop: 'var(--s3)', maxWidth: '58ch' } },
        'Delay analysis has a vocabulary of its own, and most of the arguments in it are really arguments about definitions. These are the ones worth being precise about.')
    ]),
    el('div.gsearch', [input, count]),
    list
  ]);
}

function lessonHref(id) {
  const [m, l] = String(id).split('.');
  const mod = ctx.course.modules.find(x => x.n === +m);
  const les = mod?.lessons.find(x => x.id === id);
  return les ? `#/m/${+m}/l/${les.i}` : '#/';
}

/* ═══════════════════════════════════════════════════════════════
   TOOLKIT — the instruments on their own
   ═══════════════════════════════════════════════════════════════ */

export function toolkit() {
  const TOOLS = [
    { id: 'network', label: 'CPM calculator',
      note: 'A worked network you can step through. The forward pass, the backward pass, and where float comes from.',
      props: { net: DEMO, start: '2008-06-01', phase: 'idle', autoplay: false,
        title: 'Concrete package — precedence network',
        note: 'Run the passes. Every figure here is calculated live by the same engine the lessons use.' } },
    { id: 'float-anatomy', label: 'Float ledger', props: {} },
    { id: 'earned-value', label: 'Earned value', props: {} },
    { id: 'measured-mile', label: 'Measured mile', props: {} },
    { id: 'disruption-calc', label: 'Disruption', props: {} },
    { id: 'method-chooser', label: 'Which technique?', props: {} },
    { id: 'records', label: 'Records hierarchy', props: {} },
    { id: 'checklist', label: 'Baseline validation', props: {
        id: 'baseline-validation',
        title: 'Validating a baseline before you rely on it',
        sub: 'Sixteen checks. Work down them before any method of analysis.',
        items: [
          'One hundred per cent of the contract work scope is represented.',
          'There is at least one continuous chain of activities from start to completion.',
          'Every activity has at least one predecessor and one successor.',
          'Start and finish activities carry appropriate constraints so float paths generate.',
          'Durations along the critical and near-critical paths are reasonable.',
          'Logic along the critical and near-critical paths is feasible on the information available at tender.',
          'No delays or changes are built in that could not have been known at tender or contract award.',
          'All milestones, constraints and sectional completion dates are represented accurately.',
          'No weather-sensitive work is scheduled out of season without a stated temporary measure.',
          'Regional and national holidays are allowed for.',
          'Working calendars are assigned correctly — 5, 6 and 7 day.',
          'Local trade working rules are modelled in the calendars.',
          'Third-party interfaces appear, with notification periods for statutory undertakers, easements and rights of way.',
          'Employer review and approval periods are adequate and contractually compliant.',
          'Constraint use is proportionate — dates are held by logic, not by constraints.',
          'A “what-if” test moves the completion date the way intuition says it should.'
        ],
        note: 'These ticks are saved on this device. A programme that fails several of these is not necessarily useless — but you must say so, in writing, before you build an analysis on it.'
      } }
  ];

  let cur = 0;
  const stage = el('div');

  function paint() {
    const t = TOOLS[cur];
    const fn = WIDGETS[t.id];
    stage.replaceChildren(fn ? fn(t.props || {}) : el('p.dim', 'Not available.'));
    btns.forEach((b, i) => b.setAttribute('aria-selected', String(i === cur)));
  }

  const btns = TOOLS.map((t, i) => el('button', {
    type: 'button', role: 'tab', aria: { selected: String(i === cur) },
    onclick: () => { cur = i; paint(); }
  }, t.label));

  paint();

  return el('div', [
    el('p', { style: { marginBottom: 'var(--s5)' } }, el('a.kicker', { href: '#/' }, '← The programme')),
    el('header', { style: { marginBottom: 'var(--s6)' } }, [
      el('span.kicker.kicker--b', 'Instruments'),
      el('h1', 'Toolkit'),
      el('p.dim', { style: { marginTop: 'var(--s3)', maxWidth: '62ch' } },
        'The same instruments the lessons use, lifted out of them. Nothing here is a mock-up — the network runs a real forward and backward pass, and the sheets recalculate as you type.')
    ]),
    el('div.tabs', { role: 'tablist', style: { marginBottom: 'var(--s5)' } }, btns),
    stage
  ]);
}

const DEMO = [
  { id: '105', desc: 'Excavate Perimeter Footings', dur: 7, pred: [] },
  { id: '110', desc: 'Perimeter Footings — Formwork', dur: 5, pred: ['105'] },
  { id: '120', desc: 'Perimeter Footings — Reinforcement', dur: 4, pred: ['105'] },
  { id: '130', desc: 'Excavate Grade Beams', dur: 7, pred: ['105'] },
  { id: '140', desc: 'Place Concrete — Perimeter Footings', dur: 1, pred: ['110', '120'] },
  { id: '170', desc: 'Perimeter Footings — Strip Formwork', dur: 3, pred: ['140'] },
  { id: '150', desc: 'Grade Beam Reinforcement', dur: 4, pred: ['130'] },
  { id: '160', desc: 'Form Grade Beams', dur: 5, pred: ['130'] },
  { id: '180', desc: 'Place Concrete — Grade Beams', dur: 1, pred: ['160', '150'] },
  { id: '210', desc: 'Strip Formwork — Grade Beams', dur: 3, pred: ['180'] },
  { id: '240', desc: 'Concrete Package Complete', dur: 0, milestone: true, pred: ['170', '210'] }
];

/* ═══════════════════════════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════════════════════════ */

export function settings() {
  const s = store.load();
  const p = store.courseProgress(ctx.course.modules);
  const msg = el('p.dim', { style: { fontSize: 'var(--t-xs)', minHeight: '1.4em' } });

  function toggle(key, label, note) {
    const btn = el('button.toggle', {
      type: 'button',
      aria: { pressed: String(!!store.load().settings[key]), label },
      onclick: () => {
        const v = !store.load().settings[key];
        store.setSetting(key, v);
        btn.setAttribute('aria-pressed', String(v));
      }
    });
    return el('div.setrow', [
      el('div', [el('h4', label), el('p', note)]),
      btn
    ]);
  }

  const nameInput = el('input', {
    type: 'text', value: s.name, maxlength: '64',
    placeholder: 'Your name, for the certificate',
    style: {
      padding: 'var(--s2) var(--s3)', background: 'var(--g-900)',
      border: '1px solid var(--g-600)', borderRadius: 'var(--radius)',
      fontSize: 'var(--t-sm)', minWidth: '220px'
    },
    oninput: e => store.setName(e.target.value)
  });

  return el('div.wrap--n', [
    el('p', { style: { marginBottom: 'var(--s5)' } }, el('a.kicker', { href: '#/' }, '← The programme')),
    el('header', { style: { marginBottom: 'var(--s6)' } }, [
      el('span.kicker.kicker--b', 'This device'),
      el('h1', 'Progress and settings')
    ]),

    el('div.panel', { style: { marginBottom: 'var(--s5)' } }, [
      el('span.kicker.kicker--b', 'Where you are'),
      el('div.stats', [
        el('div', [el('b', pct(p.pct, 0)), el('span', 'Complete')]),
        el('div', [el('b', `${p.done}/${p.total}`), el('span', 'Lessons')]),
        el('div', [el('b', String(Object.values(s.quizzes).filter(q => q.passed).length)), el('span', 'Quizzes passed')]),
        el('div', [el('b', String(Object.keys(s.checks).length)), el('span', 'Checks answered')])
      ])
    ]),

    el('div.panel', { style: { marginBottom: 'var(--s5)' } }, [
      el('span.kicker.kicker--b', 'Display'),
      toggle('motion', 'Animation',
        'The passes sweep, the bars grow, the lines draw themselves. Turn it off and everything appears at once. Your system’s reduced-motion setting is respected regardless.'),
      toggle('cvd', 'Colour-vision-safe palette',
        'Moves float and contractor-risk colours further apart in hue. Shape and label always carry the meaning as well, so this is an improvement rather than a rescue.'),
      el('div.setrow', [
        el('div', [el('h4', 'Name on the certificate'), el('p', 'Stored on this device only. Leave it blank if you would rather not.')]),
        nameInput
      ])
    ]),

    el('div.panel', { style: { marginBottom: 'var(--s5)' } }, [
      el('span.kicker.kicker--b', 'Your progress'),
      el('p.dim', { style: { fontSize: 'var(--t-xs)', marginBottom: 'var(--s4)' } },
        'Everything is kept in this browser. There is no account and nothing is sent anywhere — which also means clearing site data will clear it. Export a copy if that matters to you.'),
      el('div.row', [
        el('button.btn.btn--sm', {
          type: 'button',
          onclick: () => {
            const blob = new Blob([store.exportJSON()], { type: 'application/json' });
            const a = el('a', { href: URL.createObjectURL(blob), download: 'delay-analysis-progress.json' });
            document.body.append(a); a.click(); a.remove();
            msg.textContent = 'Exported.';
          }
        }, '↓ Export progress'),
        el('label.btn.btn--sm', { style: { cursor: 'pointer' } }, [
          '↑ Import progress',
          el('input', {
            type: 'file', accept: 'application/json', style: { display: 'none' },
            onchange: async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                store.importJSON(JSON.parse(await f.text()));
                msg.textContent = 'Imported. Reloading…';
                setTimeout(() => location.reload(), 600);
              } catch (err) { msg.textContent = err.message; }
            }
          })
        ]),
        el('button.btn.btn--sm', {
          type: 'button',
          onclick: () => {
            if (!confirm('Erase all progress on this device? This cannot be undone.')) return;
            store.reset(); msg.textContent = 'Cleared. Reloading…';
            setTimeout(() => location.reload(), 500);
          }
        }, 'Erase progress')
      ]),
      msg
    ]),

    el('div.panel.panel--deep', [
      el('span.kicker.kicker--b', 'Access'),
      el('p.dim', { style: { fontSize: 'var(--t-xs)', marginBottom: 'var(--s4)' } },
        'The course body is encrypted at rest and unsealed with your access code. Signing out forgets the code on this device; your progress is untouched.'),
      el('button.btn.btn--sm', {
        type: 'button',
        onclick: () => { vault.forget(); location.reload(); }
      }, 'Sign out')
    ])
  ]);
}

/* ═══════════════════════════════════════════════════════════════
   CERTIFICATE
   ═══════════════════════════════════════════════════════════════ */

export function certificate() {
  const mods = ctx.course.modules;
  const earned = store.certificateEarned(mods);
  const p = store.courseProgress(mods);
  const s = store.load();

  if (!earned) {
    const quizzesLeft = mods.filter(m => m.quiz && !store.quizPassed('m' + m.n));
    return el('div.wrap--n', [
      el('p', { style: { marginBottom: 'var(--s5)' } }, el('a.kicker', { href: '#/' }, '← The programme')),
      el('div.msg', [
        el('h2', 'Not yet'),
        el('p', `The certificate unlocks at every lesson complete and every module quiz passed. You are at ${pct(p.pct, 0)} of the lessons${quizzesLeft.length ? `, with ${quizzesLeft.length} quiz${quizzesLeft.length > 1 ? 'zes' : ''} outstanding` : ''}.`),
        el('a.btn.btn--primary', { href: '#/' }, 'Back to the programme')
      ]),
      quizzesLeft.length ? el('div', { style: { marginTop: 'var(--s5)' } }, [
        el('span.kicker.kicker--b', 'Outstanding quizzes'),
        el('div.lessons', quizzesLeft.map(m => el('a.lrow', { href: `#/quiz/${m.n}` }, [
          el('span.lrow__n', String(m.n).padStart(2, '0')),
          el('span.lrow__t', m.t),
          el('span.lrow__m', 'take it →')
        ])))
      ]) : null
    ]);
  }

  const when = Object.values(s.lessons).reduce((a, l) => Math.max(a, l.at || 0), Date.now());
  const scores = mods.filter(m => m.quiz).map(m => store.quizFor('m' + m.n)?.best || 0);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return el('div.wrap--n', [
    el('p', { style: { marginBottom: 'var(--s5)' } }, el('a.kicker', { href: '#/' }, '← The programme')),
    el('div.cert.sheet', [
      el('span.cert__kicker', 'Certificate of completion'),
      el('h1.cert__name', s.name || 'Delay Analysis'),
      el('p.cert__for',
        s.name
          ? 'has completed every lesson and passed every module assessment in'
          : 'Completed in full — every lesson, every module assessment.'),
      el('p', {
        style: {
          fontFamily: 'var(--f-display)', fontStyle: 'italic',
          fontSize: 'var(--t-lg)', color: 'var(--p-100)', marginTop: 'var(--s3)'
        }
      }, 'Delay Analysis in Construction Contracts'),
      el('div.cert__block', [
        el('div', [el('span', 'Modules'), el('b', String(mods.length))]),
        el('div', [el('span', 'Lessons'), el('b', String(p.total))]),
        el('div', [el('span', 'Mean quiz score'), el('b', pct(avg, 0))]),
        el('div', [el('span', 'Issued'), el('b', dLong(new Date(when).toISOString().slice(0, 10)))])
      ])
    ]),
    el('div.row', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
      el('button.btn', { type: 'button', onclick: () => window.print() }, '⎙ Print'),
      el('a.btn.btn--ghost', { href: '#/settings' }, 'Change the name')
    ]),
    el('p.dim', {
      style: { fontSize: 'var(--t-xs)', textAlign: 'center', marginTop: 'var(--s5)', maxWidth: '56ch', marginInline: 'auto' }
    }, 'This is a record of study, not a professional qualification. Delay analysis is a field where competence is demonstrated by work, cross-examination and experience — not by a certificate.')
  ]);
}
