/* The Desk — home */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { countWhenSeen, reveal, cascade } from '../lib/motion.js';
import * as D from '../lib/dates.js';
import C from '../engine/contract.js';
import { rich, sec } from './ui.js';

export default function desk(view, { data }) {
  const st = store.get();
  const all = C.allClauses();
  const learned = Object.keys(st.learned).length;
  const lessonsDone = Object.keys(st.lessons).length;
  const totalLessons = data.path.modules.reduce((a, m) => a + m.lessons.length, 0);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // clause of the day: a core clause, rotating by date
  const core = all.filter((c) => c.plain?.level === 'core');
  const dayIdx = Math.floor(D.today() / 86400000) % core.length;
  const cod = core[dayIdx];

  const parts = [
    h('section.hero',
      h('div.hero__text',
        h('p.eyebrow', `${hello} · ${D.fmt(D.today())}`),
        h('h1.hero__title', 'The whole contract,', h('br'), h('em', 'in plain words')),
        h('p.lede', 'Ninety-eight General Conditions with the Particular Conditions laid over them, every deadline in one place, and the real TKV correspondence that shows what each clause does when somebody actually uses it.'),
        h('div.hero__actions',
          h('a.btn.btn--stamp', { href: '#/read' }, icon('book'), 'Read the clauses'),
          h('a.btn', { href: '#/exchange' }, icon('exchange'), 'How a claim travels'),
          h('button.btn.btn--ghost', { type: 'button', onclick: () => document.getElementById('finderBtn').click() }, icon('search'), 'Look something up'))),
      h('div.hero__art', { 'aria-hidden': 'true' }, heroArt())),

    h('section.stats',
      stat(learned, `of ${all.length}`, 'clauses marked learned', '#/read'),
      stat(lessonsDone, `of ${totalLessons}`, 'lessons done', '#/learn'),
      stat(store.streak(), store.streak() === 1 ? 'day' : 'days', 'reading streak', '#/drill'),
      stat(st.clocks.filter((k) => D.fromIso(k.due) >= D.today()).length, 'running', 'deadline clocks', '#/clock')),

    continueCard(st, all),

    h('section.desk-grid',
      h('div.folder.cod', { dataset: { tab: 'Clause of the day' } },
        h('div.cod__no', cod.no),
        h('h3.cod__title', cod.title),
        h('p.cod__gist', rich(cod.plain.gist)),
        cod.plain.use?.[0] ? h('p.cod__use', h('span.eyebrow', 'Use it'), h('span', rich(cod.plain.use[0]))) : null,
        h('a.btn.btn--sm', { href: `#/read/${cod.no}` }, 'Read clause ', cod.no, icon('arrow'))),
      clocksCard(st),
      rulesCard(data)),

    sec('The clauses that decide most letters', 'Start here'),
    h('div.core-strip', cascade(['35', '32', '42', '53', '30', '67', '44', '55', '56', '61', '27', '4'].map((n) => {
      const c = C.getClause(n);
      return h('a.core', { href: `#/read/${n}` }, h('span.core__no', n), h('span.core__t', c.title), learnedDot(n, st));
    }))),

    sec('On TKV, who cites what', 'From 757 letters'),
    usageChart(data.usage),

    sec('Real disputes, explained', 'Case files'),
    h('div.grid.grid--3', data.cases.slice(0, 6).map((k) => h('a.card.card--link.casecard', { href: `#/cases/${k.id}` },
      h('div.row', h('span.chip', k.no), h(`span.tone.tone--${k.tone}`, k.status)),
      h('h3.casecard__t', k.title),
      h('p.casecard__r', k.result)))),
  ];
  view.append(...parts.filter(Boolean));

  reveal(view.querySelector('.core-strip'), { selector: '.core', stagger: 26 });
  reveal(view.querySelector('.usage__rows'), { selector: '.usage__row', stagger: 22 });
}

function stat(n, of, label, href) {
  const num = h('span.stat__n');
  countWhenSeen(num, n);
  return h('a.stat', { href }, num, h('span.stat__of', of), h('span.stat__l', label));
}

function learnedDot(n, st) { return st.learned[n] ? h('span.core__done', { title: 'Learned' }, icon('check')) : null; }

/* Where you left off — the last few clauses you opened. */
function continueCard(st, all) {
  const recent = Object.entries(st.opened || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([no]) => all.find((c) => c.no === no)).filter(Boolean);
  if (!recent.length) return null;
  return h('section.resume',
    h('span.eyebrow', 'Where you left off'),
    h('div.resume__row', recent.map((c) => h('a.resume__c', { href: `#/read/${c.no}` },
      h('span.resume__no', c.no), h('span.resume__t', c.title)))));
}

function clocksCard(st) {
  const list = st.clocks.map((k) => ({ ...k, dueD: D.fromIso(k.due) })).filter((k) => k.dueD >= D.addDays(D.today(), -3)).sort((a, b) => a.dueD - b.dueD).slice(0, 4);
  return h('div.folder.clocks', { dataset: { tab: 'Clocks running' } },
    list.length
      ? h('ul.clocklist', list.map((k) => {
        const left = D.diffDays(D.today(), k.dueD);
        return h('li', h(`span.clocklist__d${left <= 3 ? '.is-hot' : ''}`, left < 0 ? 'late' : left === 0 ? 'today' : `${left}d`), h('span', h('b', k.label), h('small', `${k.ref} · due ${D.fmtShort(k.dueD)}`)));
      }))
      : h('p.muted', 'No deadlines saved yet. When a letter or event starts a notice clock, save it here so it cannot slip.'),
    h('a.btn.btn--sm', { href: '#/clock' }, icon('clock'), 'Start a clock'));
}

function rulesCard(data) {
  const rules = data.writing.rules.slice(0, 4);
  return h('div.folder.rulescard', { dataset: { tab: 'Four habits' } },
    h('ol.rules', rules.map((r) => h('li', h('b', r.title), h('span', rich(r.text))))),
    h('a.btn.btn--sm', { href: '#/learn/m9/m9l2' }, 'All ten rules', icon('arrow')));
}

function usageChart(u) {
  const keys = [...new Set([...Object.keys(u.contractor).slice(0, 14), ...Object.keys(u.er).slice(0, 14)])]
    .map((k) => ({ k, top: k.split('.')[0], us: u.contractor[k] || 0, er: u.er[k] || 0 }))
    .filter((x) => C.resolve(x.k))
    .sort((a, b) => (b.us + b.er) - (a.us + a.er)).slice(0, 16);
  const max = Math.max(...keys.map((x) => Math.max(x.us, x.er)));
  return h('div.usage',
    h('div.usage__legend', h('span.usage__sw.usage__sw--us'), 'Our letters', h('span.usage__sw.usage__sw--er'), 'Engineer\'s letters', h('span.muted', ' · letters citing each clause at least once')),
    h('div.usage__rows', keys.map((x, i) => h('a.usage__row', { href: C.hrefOf(x.k), title: C.titleOf(x.k), style: { '--i': i } },
      h('span.usage__k', x.k),
      h('span.usage__t', C.titleOf(x.k)),
      h('span.usage__bars',
        h('span.usage__bar.usage__bar--us', { style: { width: `${(x.us / max) * 100}%` } }, h('i', x.us || '')),
        h('span.usage__bar.usage__bar--er', { style: { width: `${(x.er / max) * 100}%` } }, h('i', x.er || '')))))));
}

function heroArt() {
  // a stack of letters with a stamp, drawn in SVG
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 360 300');
  svg.innerHTML = `
    <g class="art-sheet" transform="rotate(-8 180 150)"><rect x="70" y="40" width="200" height="240" rx="3"/></g>
    <g class="art-sheet art-sheet--2" transform="rotate(5 180 150)"><rect x="84" y="30" width="200" height="240" rx="3"/></g>
    <g class="art-letter" transform="rotate(-1.5 180 150)">
      <rect x="76" y="22" width="206" height="250" rx="3"/>
      <text x="92" y="48" class="art-mono">Our ref.: TKV/COM/…</text>
      <text x="92" y="64" class="art-mono">To: The Engineer</text>
      <rect x="92" y="80" width="150" height="7" rx="2" class="art-line art-line--b"/>
      <rect x="92" y="100" width="174" height="5" rx="2" class="art-line"/>
      <rect x="92" y="112" width="160" height="5" rx="2" class="art-line"/>
      <rect x="92" y="124" width="170" height="5" rx="2" class="art-line"/>
      <rect x="92" y="136" width="60" height="7" rx="2" class="art-hl"/><text x="95" y="142" class="art-mono art-mono--ref">35.1</text>
      <rect x="92" y="152" width="174" height="5" rx="2" class="art-line"/>
      <rect x="92" y="164" width="120" height="5" rx="2" class="art-line"/>
      <rect x="92" y="184" width="174" height="5" rx="2" class="art-line"/>
      <rect x="92" y="196" width="140" height="5" rx="2" class="art-line"/>
      <text x="92" y="236" class="art-mono">Yours sincerely,</text>
    </g>
    <g class="art-stamp" transform="rotate(-14 250 210)"><rect x="196" y="186" width="118" height="44" rx="5"/><text x="255" y="214" text-anchor="middle">21 DAYS</text></g>
    <path class="art-tape" d="M300 0 L326 0 L326 300 L300 300 Z"/>`;
  return svg;
}
