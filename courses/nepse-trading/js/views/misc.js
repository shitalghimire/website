/* ═══════════════════════════════════════════════════════════════
   NEPSE TRADING ACADEMY — glossary, resources, settings
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, frag, num, announce, fmtDate, stagger } from '../util.js';
import { icon } from '../icons.js';

/* ── glossary ───────────────────────────────────────────────── */

export function glossary() {
  const g = ctx.glossary;
  const entries = Object.entries(g).sort((a, b) => a[1].en.localeCompare(b[1].en));

  const list = el('div.glist');
  const count = el('p.gcount');

  const paint = q => {
    const term = q.trim().toLowerCase();
    const hits = entries.filter(([k, e]) =>
      !term || e.en.toLowerCase().includes(term) || e.def.toLowerCase().includes(term) ||
      (e.rom || '').toLowerCase().includes(term) || e.np.includes(q.trim()) || k.includes(term));
    list.replaceChildren(...hits.map(([, e]) => el('div.gitem', [
      el('h3', e.en),
      el('div', [
        el('span', { lang: 'ne', class: 'np gitem__np' }, e.np),
        e.rom && el('span.gitem__rom', ` · ${e.rom}`)
      ]),
      el('p', e.def),
      e.lesson && el('a', { href: lessonHref(e.lesson) }, [`Taught in lesson ${e.lesson}`, icon('arrowRight', 14)])
    ])));
    if (!hits.length) list.replaceChildren(el('div.callout', el('p', `No term matches “${q.trim()}”. Try the English word, the romanised Nepali, or Devanagari.`)));
    count.textContent = term ? `${hits.length} of ${entries.length} terms match` : `${entries.length} terms`;
  };

  const initial = ctx.glossaryQuery || '';
  ctx.glossaryQuery = '';

  const input = el('input.gsearch', {
    type: 'search',
    value: initial,
    placeholder: 'Search in English, romanised Nepali or Devanagari…',
    'aria-label': 'Search glossary',
    oninput: e => paint(e.target.value)
  });

  paint(initial);
  if (initial) requestAnimationFrame(() => input.focus());

  return frag([
    el('div.head', [
      el('span.head__kicker', [icon('glossary', 13), 'Reference']),
      el('h1', 'Glossary'),
      el('p', `Every term the course uses, with its Nepali equivalent — each linked to the lesson that teaches it.`)
    ]),
    el('div.gsearchbox', [icon('search', 20), input]),
    count,
    list
  ]);
}

function lessonHref(id) {
  const [m, l] = String(id).split('.');
  return `#/m/${+m}/l/${+l}`;
}

/* ── resources ──────────────────────────────────────────────── */

export function resources() {
  const R = ctx.modules.resources;
  const grid = el('div.rgrid', R.map(r => el('a.rcard', {
    href: r.url, target: '_blank', rel: 'noopener noreferrer'
  }, [
    el('div.rcard__top', [
      el('span.tile', icon('globe', 19)),
      icon('arrowUpRight', 18)
    ]),
    el('div', [
      el('b', r.name),
      el('span.sr-only', ' (opens in a new tab)')
    ]),
    el('p', r.good)
  ])));
  stagger(grid);

  return frag([
    el('div.head', [
      el('span.head__kicker', [icon('compass', 13), 'Reference']),
      el('h1', 'Where to go next'),
      el('p', `${R.length} places worth your time, and what each is genuinely good for.`)
    ]),

    grid,

    el('div.rgrid2', [
      el('div.panel', [
        el('div.secthead', [
          el('span.tile', icon('shield', 19)),
          el('div', [
            el('h3', 'Where this course’s numbers come from'),
            el('p', 'Every rule, fee and tax rate was verified in August 2026 and carries an as-of date. Three changes in 2026 invalidate most NEPSE material still online:')
          ])
        ]),
        el('ul.timeline', [
          el('li', [el('b', '21 April 2026'), 'The daily price limit rose from ±10% to ±15%, and the index circuit breaker went from three tiers to two.']),
          el('li', [el('b', 'April 2026'), 'NEPSE moved to a Monday–Friday week. It ran Sunday–Thursday for its entire prior history.']),
          el('li', [el('b', '17 July 2026 (1 Shrawan 2083)'), 'Short-term capital gains tax rose from 7.5% to 10%, long-term from 5% to 7.5%.'])
        ]),
        el('p.asof', [icon('clock', 13), `Fee schedule as at ${ctx.fees.asOf} · Market rules as at ${ctx.rules.asOf}`])
      ]),
      el('div.callout.callout--warn', [
        el('span.callout__l', 'Read this before you trust a number'),
        el('p', 'None of these are advice. Portals aggregate; they do not verify. ' +
                'When a number matters — when you are about to commit money to it — open the company\'s own ' +
                'quarterly report on its own website, and read the figure there.')
      ])
    ])
  ]);
}

/* ── settings and progress ──────────────────────────────────── */

export function settings() {
  const s = state.load();
  const wrap = el('div');

  wrap.append(el('div.head', [
    el('span.head__kicker', [icon('settings', 13), 'Your course']),
    el('h1', 'Settings & progress'),
    el('p', 'Everything is stored in this browser only. There is no account and no server, ' +
            'so clearing your browser data would erase your progress — export it if it matters to you.')
  ]));

  const grid = el('div.sgrid');
  wrap.append(grid);

  /* appearance */
  const picks = el('div.themepick', { role: 'group', 'aria-label': 'Theme' });
  const paintPicks = () => {
    const cur = state.load().settings.theme || 'system';
    picks.querySelectorAll('.tp').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === cur)));
  };
  for (const [t, label, ic] of [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'monitor']]) {
    picks.append(el('button', {
      type: 'button', class: `tp tp--${t}`, dataset: { t },
      onclick: () => { state.setSetting('theme', t); paintPicks(); announce(`${label} theme`); }
    }, [el('span.tp__prev'), el('span.tp__lbl', [icon(ic, 15), label])]));
  }
  paintPicks();

  grid.append(el('section.panel', [
    el('div.secthead', [
      el('span.tile', icon('sun', 19)),
      el('div', [el('h3', 'Appearance'), el('p', 'Choose a theme, or follow your device.')])
    ]),
    picks,
    toggleRow('Reduce motion', 'Turns off the entry animations, the candle-print animation and the ticker.',
      s.settings.reduceMotion, v => state.setSetting('reduceMotion', v)),
    toggleRow('Colour-blind safe palette',
      'Up candles become blue instead of green. Shape already carries the signal — up candles are hollow, down candles filled.',
      s.settings.colorBlindSafe, v => state.setSetting('colorBlindSafe', v)),
    toggleRow('Sound in games', 'Off by default. Feedback is always visual and textual as well.',
      s.settings.sound, v => state.setSetting('sound', v))
  ]));

  /* progress numbers */
  const prog = state.courseProgress(ctx.modules.modules);
  const rank = state.rankFor(ctx.modules.levels, s.xp);
  grid.append(el('section.panel', [
    el('div.secthead', [
      el('span.tile', { style: { '--tone': 'var(--lv-2)' } }, icon('chart', 19)),
      el('div', [el('h3', 'Progress'), el('p', s.startedAt ? `Started ${fmtDate(s.startedAt)}.` : 'Nothing recorded yet.')])
    ]),
    el('div.statrow', [
      cell('XP', num(s.xp, 0)),
      cell('Rank', rank.rank),
      cell('Lessons', `${prog.done}/${prog.total}`),
      cell('Streak', `${s.streakDays} days`),
      cell('Badges', `${s.badges.filter(b => !b.startsWith('_')).length}/${ctx.modules.badges.length}`),
      cell('Sessions', num(new Set(s.equityEvents.map(e => new Date(e.t).toDateString())).size, 0))
    ])
  ]));

  /* export / import */
  grid.append(el('section.panel', [
    el('div.secthead', [
      el('span.tile', { style: { '--tone': 'var(--lv-3)' } }, icon('download', 19)),
      el('div', [el('h3', 'Your data'), el('p', 'Export writes a JSON file you can keep; import reads it back on any browser.')])
    ]),
    el('div.row', [
      el('button.btn', { type: 'button', onclick: doExport }, [icon('download', 16), 'Export progress']),
      el('label.btn', { style: { cursor: 'pointer' } }, [
        icon('upload', 16), 'Import progress',
        el('input', {
          type: 'file', accept: '.json,application/json',
          style: { display: 'none' },
          onchange: doImport
        })
      ])
    ])
  ]));

  /* reset */
  grid.append(el('section.panel', [
    el('div.secthead', [
      el('span.tile', { style: { '--tone': 'var(--bear)' } }, icon('reset', 19)),
      el('div', [
        el('h3', 'Reset the course'),
        el('p', 'Erases every lesson, quiz score, game high score, badge and candle. It cannot be undone. Type RESET to confirm.')
      ])
    ]),
    resetBlock()
  ]));

  return wrap;

  function cell(l, v) {
    return el('div.stat', [el('span.stat__l', l), el('span.stat__v', v)]);
  }
}

function toggleRow(title, desc, value, onChange) {
  const btn = el('button.toggle', {
    type: 'button',
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
    'aria-label': 'Type RESET to confirm'
  });
  const field = el('div.field', { style: { width: '170px' } }, input);
  const btn = el('button.btn.btn--bear', {
    type: 'button',
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
