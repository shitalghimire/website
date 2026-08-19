/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — glossary, resources, settings
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, frag, num, $$, announce, fmtDate } from '../util.js';

/* ── glossary ───────────────────────────────────────────────── */

export function glossary() {
  const g = ctx.glossary;
  const entries = Object.entries(g).sort((a, b) => a[1].en.localeCompare(b[1].en));

  const list = el('div.glist');
  const count = el('p.dim', { style: { fontSize: 'var(--t-xs)', marginTop: 'var(--s3)' } });

  const paint = q => {
    const term = q.trim().toLowerCase();
    const hits = entries.filter(([k, e]) =>
      !term || e.en.toLowerCase().includes(term) || e.def.toLowerCase().includes(term) ||
      (e.rom || '').toLowerCase().includes(term) || e.np.includes(q.trim()) || k.includes(term));
    list.replaceChildren(...hits.map(([k, e]) => el('div.gitem', [
      el('h3', e.en),
      el('div', [
        el('span.gitem__np', { lang: 'ne', class: 'np gitem__np' }, e.np),
        ' ',
        el('span.gitem__rom', e.rom || '')
      ]),
      el('p', e.def),
      e.lesson && el('a', { href: lessonHref(e.lesson) }, `Taught in ${e.lesson} →`)
    ])));
    count.textContent = `${hits.length} of ${entries.length} terms`;
  };

  const input = el('input.gsearch', {
    type: 'search',
    placeholder: 'Search the glossary — English, Nepali or Devanagari…',
    'aria-label': 'Search glossary',
    oninput: e => paint(e.target.value)
  });

  paint('');

  return frag([
    el('div.head', [
      el('span.head__kicker.kicker', 'Reference'),
      el('h1', 'Glossary'),
      el('p', `Every term the course uses, with its Nepali equivalent. ${entries.length} entries, ` +
              `each linked to the lesson that teaches it.`)
    ]),
    input,
    count,
    el('div', { style: { marginTop: 'var(--s5)' } }, list)
  ]);
}

function lessonHref(id) {
  const [m, l] = String(id).split('.');
  return `#/m/${+m}/l/${+l}`;
}

/* ── resources ──────────────────────────────────────────────── */

export function resources() {
  const R = ctx.modules.resources;
  return frag([
    el('div.head', [
      el('span.head__kicker.kicker', 'Reference'),
      el('h1', 'Where to go next'),
      el('p', 'Seven places worth your time, and what each is genuinely good for.')
    ]),

    el('div.lessons', R.map(r => el('a.lrow', {
      href: r.url, target: '_blank', rel: 'noopener noreferrer',
      style: { gridTemplateColumns: '1fr' }
    }, [
      el('div', [
        el('div', { style: { display: 'flex', gap: 'var(--s3)', alignItems: 'baseline', flexWrap: 'wrap' } }, [
          el('span', { style: { fontFamily: 'var(--f-data)', fontSize: 'var(--t-sm)', color: 'var(--paper)' } }, r.name),
          el('span.kicker', 'opens in a new tab ↗')
        ]),
        el('p', { style: { fontSize: 'var(--t-xs)', color: 'var(--paper-3)', marginTop: '4px' } }, r.good)
      ])
    ]))),

    el('div.callout.callout--warn', { style: { marginTop: 'var(--s5)' } }, [
      el('span.callout__l', 'Read this before you trust a number'),
      el('p', 'None of these are advice. Portals aggregate; they do not verify. ' +
              'When a number matters — when you are about to commit money to it — open the company\'s own ' +
              'quarterly report on its own website, and read the figure there.')
    ]),

    el('div.panel', { style: { marginTop: 'var(--s5)' } }, [
      el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'Where this course\'s numbers come from'),
      el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--paper-2)' } },
        'Every rule, fee and tax rate in this course was verified in August 2026 and carries an as-of date. ' +
        'Two things changed in 2026 that invalidate most NEPSE material still online:'),
      el('ul', { style: { marginTop: 'var(--s3)', marginLeft: 'var(--s5)' } }, [
        el('li', { style: { fontSize: 'var(--t-sm)', color: 'var(--paper-2)' } },
          '21 April 2026 — the daily price limit rose from ±10% to ±15%, and the index circuit breaker went from three tiers to two.'),
        el('li', { style: { fontSize: 'var(--t-sm)', color: 'var(--paper-2)' } },
          '17 July 2026 (1 Shrawan 2083) — short-term capital gains tax rose from 7.5% to 10%, long-term from 5% to 7.5%.'),
        el('li', { style: { fontSize: 'var(--t-sm)', color: 'var(--paper-2)' } },
          'April 2026 — NEPSE moved to a Monday–Friday week. It ran Sunday–Thursday for its entire prior history.')
      ]),
      el('p.asof', `Fee schedule as at ${ctx.fees.asOf} · Market rules as at ${ctx.rules.asOf}`)
    ])
  ]);
}

/* ── settings and progress ──────────────────────────────────── */

export function settings() {
  const s = state.load();
  const wrap = el('div');

  wrap.append(el('div.head', [
    el('span.head__kicker.kicker', 'Your course'),
    el('h1', 'Settings & progress'),
    el('p', 'Everything is stored in this browser only. There is no account and no server, ' +
            'which means clearing your browser data would erase your progress — so export it if it matters to you.')
  ]));

  /* settings */
  wrap.append(el('div.panel', [
    el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s4)' } }, 'Display'),

    toggleRow('Reduce motion', 'Turns off the entry stagger, the candle-print animation and the ticker.',
      s.settings.reduceMotion, v => state.setSetting('reduceMotion', v)),

    toggleRow('Colour-blind safe palette',
      'Up candles become blue instead of green. Shape already carries the signal — up candles are hollow, down candles filled — so this is an addition, not a substitute.',
      s.settings.colorBlindSafe, v => state.setSetting('colorBlindSafe', v)),

    toggleRow('Sound in games', 'Off by default. Feedback is always visual and textual as well.',
      s.settings.sound, v => state.setSetting('sound', v))
  ]));

  /* progress numbers */
  const prog = state.courseProgress(ctx.modules.modules);
  const rank = state.rankFor(ctx.modules.levels, s.xp);
  wrap.append(el('div.panel', { style: { marginTop: 'var(--s4)' } }, [
    el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s4)' } }, 'Progress'),
    el('div.statrow', [
      cell('XP', num(s.xp, 0)),
      cell('Rank', rank.rank),
      cell('Lessons', `${prog.done}/${prog.total}`),
      cell('Streak', `${s.streakDays}d`),
      cell('Badges', `${s.badges.filter(b => !b.startsWith('_')).length}/${ctx.modules.badges.length}`),
      cell('Sessions', num(new Set(s.equityEvents.map(e => new Date(e.t).toDateString())).size, 0))
    ]),
    s.startedAt && el('p.asof', `Started ${fmtDate(s.startedAt)}`)
  ]));

  /* export / import / reset */
  wrap.append(el('div.panel', { style: { marginTop: 'var(--s4)' } }, [
    el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s4)' } }, 'Your data'),

    el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--paper-2)', marginBottom: 'var(--s4)' } },
      'Learners who clear their browser must not silently lose four hours of work with no recourse. ' +
      'Export writes a JSON file you can keep; import reads it back.'),

    el('div.row', [
      el('button.btn', { onclick: doExport }, '↓ Export progress'),
      el('label.btn', { style: { cursor: 'pointer' } }, [
        '↑ Import progress',
        el('input', {
          type: 'file', accept: '.json,application/json',
          style: { display: 'none' },
          onchange: doImport
        })
      ])
    ]),

    el('hr.rule'),

    el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)', color: 'var(--bear)' } }, 'Reset'),
    el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--paper-2)', marginBottom: 'var(--s3)' } },
      'This erases every lesson, quiz score, game high score, badge and candle on your equity curve. ' +
      'It cannot be undone. Type RESET to confirm.'),
    resetBlock()
  ]));

  return wrap;

  function cell(l, v) {
    return el('div.stat', [el('span.stat__l', l), el('span.stat__v', v)]);
  }
}

function toggleRow(title, desc, value, onChange) {
  const btn = el('button.toggle', {
    'aria-pressed': String(!!value),
    'aria-label': title,
    onclick: e => {
      const now = e.currentTarget.getAttribute('aria-pressed') !== 'true';
      e.currentTarget.setAttribute('aria-pressed', String(now));
      onChange(now);
      announce(`${title} ${now ? 'on' : 'off'}`);
    }
  });
  return el('div.setrow', [
    el('div', [el('div.setrow__t', title), el('div.setrow__d', desc)]),
    btn
  ]);
}

function doExport() {
  const blob = new Blob([state.exportState()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `nepse-academy-progress-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('Progress exported.');
}

function doImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      state.importState(JSON.parse(fr.result));
      announce('Progress imported.');
      location.hash = '#/';
      location.reload();
    } catch (err) {
      alert('That file could not be imported.\n\n' + err.message);
    }
  };
  fr.readAsText(file);
}

function resetBlock() {
  const input = el('input', {
    type: 'text', placeholder: 'Type RESET',
    style: { maxWidth: '160px' },
    class: '', 'aria-label': 'Type RESET to confirm'
  });
  const field = el('div.field', { style: { maxWidth: '160px' } }, input);
  const btn = el('button.btn.btn--bear', {
    disabled: true,
    onclick: () => {
      state.reset();
      announce('Course reset.');
      location.hash = '#/';
      location.reload();
    }
  }, 'Reset the course');
  input.addEventListener('input', () => { btn.disabled = input.value.trim() !== 'RESET'; });
  return el('div.row', [field, btn]);
}
