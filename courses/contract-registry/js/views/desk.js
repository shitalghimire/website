/* Home — the front desk of the Registry */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { reveal, cascade, still } from '../lib/motion.js';
import { openBin } from '../lib/vault.js';
import { engrave } from '../lib/guilloche.js';
import * as D from '../lib/dates.js';
import C from '../engine/contract.js';
import { rich, sec } from './ui.js';

const TONE = { lost: 'tape', partial: 'warn', open: '', won: 'ok' };

export default function desk(view, { data }) {
  const st = store.get();
  const all = C.allClauses();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const claims = data.claims?.list || [];
  const school = data.school?.lessons || [];
  const nQ = Object.keys(data.path.questions).length + claims.reduce((a, c) => a + (c.quiz || []).length, 0);

  /* clause of the day: a core clause, rotating by date */
  const core = all.filter((c) => c.plain?.level === 'core');
  const cod = core[Math.floor(D.today() / 86400000) % core.length];

  view.classList.add('view--home');
  const art = h('div.hm-hero__art', { 'aria-hidden': 'true' });
  const parts = [
    h('section.hm-hero',
      art,
      h('div.hm-hero__text',
        h('p.hm-hero__date', `${hello} · ${D.fmt(D.today())}`),
        h('h1.hm-hero__t', 'Three real claims,', h('br'), h('em', 'letter by letter'), '.'),
        h('p.hm-hero__s', claims.length
          ? `${claims.reduce((a, c) => a + c.letters, 0)} letters, ${claims.reduce((a, c) => a + c.pagesN, 0).toLocaleString()} pages of statements, exhibits and cost sheets. Watch each claim travel between Contractor and Engineer, read every page, and see what won and what lost.`
          : 'Rebuild the course file to add the claim dossiers.'),
        h('div.hm-hero__actions',
          h('a.btn.btn--brass', { href: '#/dossier' }, icon('folder'), 'Open the dossiers'),
          h('button.btn.hm-hero__find', { type: 'button', onclick: () => document.getElementById('finderBtn').click() }, icon('search'), 'Search everything'))),
      h('div.hm-files', claims.map((c, i) => miniFolder(c, i, data.claims.vault)))),

    h('section.hm-doors',
      door('#/drill', 'target', 'tape', 'Practice', `${nQ} questions, flashcards that turn over, and four quick games.`, 'Ten minutes a day'),
      door('#/school', 'cap', 'warn', 'Claims School', `${school.length} short topics: the notice, the records, the Statement of Claim, the reply.`, 'The basics, in any order'),
      door('#/learn', 'map', 'stamp', 'Contract course', 'Nine modules on how this Contract works, with a quick check in each lesson.', 'About five hours'),
      door('#/read', 'book', 'teal', 'Clauses', `All ${all.length} clauses in plain words, with the Particular Conditions laid over them.`, 'Look anything up')),

    continueCard(st, all),

    h('section.hm-grid',
      h('div.folder.hm-cod', { dataset: { tab: 'Clause of the day' } },
        h('div.hm-cod__head', h('span.hm-cod__no', cod.no), h('h3', cod.title)),
        h('p.hm-cod__gist', h('span', rich(cod.plain.gist))),
        cod.plain.use?.[0] ? h('p.hm-cod__use', h('b', 'Use it: '), h('span', rich(cod.plain.use[0]))) : null,
        h('div.row', h('a.btn.btn--sm.btn--stamp', { href: `#/read/${cod.no}` }, 'Read clause ', cod.no, icon('arrow')), h('a.btn.btn--sm', { href: '#/drill/cards/clauses' }, icon('layers'), 'Flashcards'))),
      clocksCard(st),
      rulesCard(data)),

    sec('The clauses that decide most letters', 'Start here'),
    h('div.core-strip', cascade(['35', '32', '42', '53', '30', '67', '44', '55', '56', '61', '27', '4'].map((n) => {
      const c = C.getClause(n);
      return h('a.core', { href: `#/read/${n}` }, h('span.core__no', n), h('span.core__t', c.title), st.learned[n] ? h('span.core__done', { title: 'Learned' }, icon('check')) : null);
    }))),

    sec('Who cites which clause', 'From 757 project letters'),
    usageChart(data.usage),

    sec('More disputes, in short', 'Case files'),
    h('div.grid.grid--3', data.cases.slice(0, 6).map((k) => h('a.card.card--link.casecard', { href: `#/cases/${k.id}` },
      h('div.row', h('span.chip', k.no), h(`span.stamp${TONE[k.tone] ? '.stamp--' + TONE[k.tone] : ''}`, k.status)),
      h('h3.casecard__t', k.title),
      h('p.casecard__r', k.result)))),
  ];
  view.append(...parts.filter(Boolean));
  engrave(art, 'door', 900);

  reveal(view.querySelector('.hm-doors'), { selector: '.hm-door', stagger: 60 });
  reveal(view.querySelector('.core-strip'), { selector: '.core', stagger: 26 });
  reveal(view.querySelector('.usage__rows'), { selector: '.usage__row', stagger: 22 });
}

/* a claim folder, small: it leans towards the pointer and lets a page slip out */
function miniFolder(c, i, vault) {
  const page = h('span.mf__page');
  if (c.cover) {
    const img = h('img', { alt: '' });
    openBin(`p/${c.cover[0]}.bin`, 'image/jpeg', vault).then((u) => { img.src = u; }).catch(() => {});
    page.append(img);
  }
  const box = h('span.mf__box', h('span.mf__tab', `No. ${c.no}`), h('span.mf__back'), page,
    h('span.mf__front', h('span.mf__kicker', c.kicker), h('b.mf__t', c.short), h('span.mf__m', `${c.letters} letters · ${c.pagesN.toLocaleString()} pages`)));
  const a = h(`a.mf.mf--${i + 1}`, { href: `#/dossier/${c.id}`, title: c.title, style: { '--i': i } }, box);
  if (!still()) {
    a.addEventListener('pointermove', (e) => { const r = a.getBoundingClientRect(); box.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width) - .5) * 22}deg`); box.style.setProperty('--rx', `${-(((e.clientY - r.top) / r.height) - .5) * 18}deg`); });
    a.addEventListener('pointerleave', () => { box.style.setProperty('--ry', '0deg'); box.style.setProperty('--rx', '0deg'); });
  }
  return a;
}

function door(href, ic, tone, title, sub, meta) {
  return h(`a.hm-door.hm-door--${tone}`, { href }, h('span.hm-door__ic', icon(ic)), h('h3', title), h('p', sub), h('span.hm-door__m', meta, icon('arrow')));
}

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
  return h('div.folder', { dataset: { tab: 'Deadlines running' } },
    list.length
      ? h('ul.clocklist', list.map((k) => {
        const left = D.diffDays(D.today(), k.dueD);
        return h('li', h(`span.clocklist__d${left <= 3 ? '.is-hot' : ''}`, left < 0 ? 'late' : left === 0 ? 'today' : `${left}d`), h('span', h('b', k.label), h('small', `${k.ref} · due ${D.fmtShort(k.dueD)}`)));
      }))
      : h('p.muted', 'No deadlines saved yet. When a letter or an event starts a notice clock, save it here so it cannot slip.'),
    h('a.btn.btn--sm', { href: '#/clock' }, icon('clock'), 'Start a clock'));
}

function rulesCard(data) {
  const rules = data.writing.rules.slice(0, 4);
  return h('div.folder', { dataset: { tab: 'Four habits for every letter' } },
    h('ol.rules', rules.map((r) => h('li', h('b', r.title), h('span', rich(String(r.text).split(/(?<=\.)\s/)[0]))))),
    h('a.btn.btn--sm', { href: '#/learn/m9/m9l2' }, 'All ten rules', icon('arrow')));
}

function usageChart(u) {
  const keys = [...new Set([...Object.keys(u.contractor).slice(0, 14), ...Object.keys(u.er).slice(0, 14)])]
    .map((k) => ({ k, us: u.contractor[k] || 0, er: u.er[k] || 0 }))
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
