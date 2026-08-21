/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — dashboard

   The module list is drawn as a programme. Each module is a bar on
   a timeline scaled by its own length; completing lessons fills it.
   The course is a project, so it is shown as one.
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, stagger, pct, n0, say } from '../dom.js';
import * as store from '../store.js';
import { ctx } from '../app.js';

export function dashboard() {
  const { course } = ctx;
  const mods = course.modules;
  const p = store.courseProgress(mods);
  const next = store.firstUnfinished(mods);
  const totalMin = mods.reduce((a, m) => a + m.lessons.reduce((b, l) => b + (l.min || 0), 0), 0);
  const lessons = mods.reduce((a, m) => a + m.lessons.length, 0);

  const wrap = el('div');

  /* ── hero ─────────────────────────────────────────────────── */
  wrap.append(el('section.hero', el('div.hero__grid', [
    el('div', [
      el('span.kicker.kicker--b', 'A course in forensic programming'),
      el('h1.hero__title', [
        el('span', 'Delay'),
        el('span.l2', 'Analysis'),
        el('span', { style: { fontSize: '.42em', letterSpacing: '-.01em', marginTop: '.4em', color: 'var(--p-200)' } },
          'in Construction Contracts')
      ]),
      el('p.hero__blurb',
        'Programmes, critical paths, and the four techniques for proving who owes whom time. Built from the standard text, and every instrument in it actually runs.'),
      el('div.hero__acts', [
        next
          ? el('a.btn.btn--primary', { href: `#/m/${next.m}/l/${next.l}` },
              p.done ? `Continue · lesson ${next.id}` : 'Begin · lesson 1.1')
          : el('a.btn.btn--primary', { href: '#/certificate' }, 'View your certificate'),
        el('a.btn', { href: '#/case' }, 'The case study'),
        el('a.btn.btn--ghost', { href: '#/toolkit' }, 'Toolkit')
      ])
    ]),
    el('div.hero__facts.sheet', [
      fact(String(mods.length), 'Modules'),
      fact(String(lessons), 'Lessons'),
      fact(Math.round(totalMin / 60) + 'h', 'Reading time'),
      fact(pct(p.pct, 0), 'Complete')
    ])
  ])));

  /* ── the programme ────────────────────────────────────────── */
  wrap.append(el('section', { style: { marginBottom: 'var(--s8)' } }, [
    el('div.shead', [
      el('span.shead__n', '01'),
      el('h2', 'The programme'),
      el('span.dim', { style: { fontSize: 'var(--t-xs)' } },
        `${p.done} of ${p.total} lessons`)
    ]),
    el('div.prog.sheet', [
      el('div.prog__head', [
        el('span', 'Module'),
        el('div.prog__legend', [
          el('span', [el('i.sw', { style: { background: 'var(--ink)' } }), 'In progress']),
          el('span', [el('i.sw', { style: { background: 'var(--slack)' } }), 'Complete']),
          el('span', [el('i.sw.sw--hatch', { style: { color: 'var(--g-600)' } }), 'Remaining'])
        ])
      ]),
      ...mods.map((m, i) => moduleRow(m, i))
    ])
  ]));

  /* ── beyond the modules ───────────────────────────────────── */
  wrap.append(el('section', [
    el('div.shead', [el('span.shead__n', '02'), el('h2', 'Beyond the lessons')]),
    el('div.cards', [
      card('#/case', 'A', 'The airport case study',
        'A terminal, a control tower and a runway, all late for different reasons. Float mapping, concurrent critical paths, pacing, and what a tribunal actually awarded.'),
      card('#/toolkit', 'B', 'Toolkit',
        'The instruments on their own — a CPM calculator you can type your own network into, a float ledger, an earned-value panel and a measured-mile sheet.'),
      card('#/glossary', 'C', 'Glossary',
        'Every term this field uses against you, defined once and linked from wherever it first appears.'),
      card('#/settings', 'D', 'Progress and settings',
        'Motion, colour-vision-safe palette, and an export of everything you have done here.')
    ])
  ]));

  stagger(wrap);
  return wrap;
}

function fact(v, l) {
  return el('div.hero__fact', [el('b', v), el('span', l)]);
}

function card(href, mark, title, body) {
  return el('a.card', { href }, [
    el('span.card__mark', mark),
    el('span.kicker', ''),
    el('h3', title),
    el('p', body)
  ]);
}

function moduleRow(m, i) {
  const prog = store.moduleProgress(m);
  const done = prog.pct === 1;
  const minutes = m.lessons.reduce((a, l) => a + (l.min || 0), 0);
  const quizOk = m.quiz ? store.quizPassed('m' + m.n) : true;

  const row = el('a', {
    class: 'prow' + (done && quizOk ? ' prow--done' : ''),
    href: `#/m/${m.n}`,
    style: { '--i': String(i) }
  }, [
    el('span.prow__n', String(m.n).padStart(2, '0')),
    el('div', [
      el('span.prow__t', m.t),
      el('span.prow__s', `${m.lessons.length} lessons · ${minutes} min${m.quiz ? ' · quiz' : ''}`)
    ]),
    el('div.pbar', [
      el('div.pbar__plan'),
      el('div.pbar__fill', { style: { width: (prog.pct * 100) + '%', '--i': String(i) } }),
      el('div.pbar__lbl', prog.done ? `${prog.done}/${prog.total}` : '')
    ]),
    el('span.prow__go', done && quizOk ? '✓ done' : prog.done ? 'resume →' : 'open →')
  ]);
  return row;
}
