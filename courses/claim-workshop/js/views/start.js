/* 01 · Start here — why the document decides it */

import { h, fx, mount, countUp, reveal, still } from '../lib.js';
import { icon } from '../icons.js';
import { OPENING, REVIEWER, BALANCE, CHAPTERS, READING } from '../content.js';
import { head, sec, note, prose } from './parts.js';

export default function start(page, { chapter }) {
  page.append(
    hero(),
    sec('Write for one person', 'The reviewer'),
    reviewer(),
    sec('The balance of probabilities', 'The standard'),
    scale(),
    sec('What this course covers', 'Ten chapters'),
    map(),
    sec('Where this comes from', 'Further reading'),
    reading(),
  );

  reveal(page.querySelector('.rev'), { selector: '.rev__c', step: 70 });
  reveal(page.querySelector('.map'), { selector: '.map__c', step: 45 });
}

/* ── hero ──────────────────────────────────────────────────────── */
function hero() {
  const box = h('header.hero',
    h('div.hero__text',
      h('p.eyebrow', 'An open course · free to read'),
      h('h1.hero__t', 'A claim is a piece of', h('br'), h('em', 'persuasive writing')),
      h('p.hero__l', fx(OPENING.lede)),
      h('div.hero__p', prose(...OPENING.paras)),
      h('div.row.hero__a',
        h('a.btn.btn--go', { href: '#/cees' }, 'Start with the four elements', icon('arrow')),
        h('a.btn', { href: '#/worked' }, icon('worked'), 'See a claim built end to end'))),
    h('div.hero__art', { 'aria-hidden': 'true' }, heroArt()));
  return box;
}

function heroArt() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 400 340');
  svg.setAttribute('class', 'ha');
  /* a bound submission: cover, index tabs, ruled pages, a pen mark */
  svg.innerHTML = `
    <g class="ha-back">
      <rect x="46" y="38" width="250" height="284" rx="6"/>
      <rect x="58" y="28" width="250" height="284" rx="6"/>
    </g>
    <rect x="70" y="18" width="250" height="284" rx="6" class="ha-doc"/>
    <rect x="70" y="18" width="250" height="46" rx="6" class="ha-hd"/>
    <text x="88" y="40" class="ha-k">CLAIM NO. 02</text>
    <text x="88" y="56" class="ha-ti">Delayed access — spillway outlet</text>

    ${[0, 1, 2, 3, 4].map((i) => `
      <g class="ha-tab" style="--i:${i}">
        <rect x="312" y="${80 + i * 42}" width="46" height="32" rx="4"/>
        <text x="335" y="${101 + i * 42}" text-anchor="middle">${['C', 'E', 'E', 'S', 'A'][i]}</text>
      </g>`).join('')}

    ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `
      <rect x="90" y="${88 + i * 21}" width="${[180, 200, 150, 196, 120, 190, 172, 204, 96][i]}" height="6" rx="3"
            class="ha-line" style="--i:${i}"/>`).join('')}

    <rect x="90" y="130" width="86" height="12" rx="2" class="ha-mark"/>
    <path d="M92 244 q 34 -14 70 -2 t 58 -6" class="ha-pen"/>
    <g class="ha-seal">
      <circle cx="258" cy="266" r="28"/>
      <text x="258" y="263" text-anchor="middle">CEES</text>
      <text x="258" y="278" text-anchor="middle" class="ha-seal-s">PROVED</text>
    </g>`;
  return svg;
}

/* ── the reviewer ──────────────────────────────────────────────── */
function reviewer() {
  return h('div.rev',
    h('p.prose.rev__i', fx(REVIEWER.intro)),
    h('div.rev__g', REVIEWER.traits.map((t, i) => h('article.rev__c', { style: { '--i': i } },
      h('span.rev__n', String(i + 1).padStart(2, '0')),
      h('h3', t.t),
      h('p', fx(t.s))))));
}

/* ═══════════ THE SCALE ═══════════
   Click evidence on and off and watch the balance move. The weights
   are illustrative — the point is which way each thing pushes. */
function scale() {
  const picked = new Set(['A dated site record', 'The contract clause, quoted correctly']);

  const beamG = h('div.sc__beam');
  const readout = h('div.sc__read');
  const hangL = h('div.sc__hang.sc__hang--l', h('i'), h('div.sc__pan.sc__pan--l', h('span', 'Your case')));
  const hangR = h('div.sc__hang.sc__hang--r', h('i'), h('div.sc__pan.sc__pan--r', h('span', 'The gaps')));

  function tally() {
    let good = 0; let bad = 0;
    for (const w of BALANCE.weights) {
      if (!picked.has(w.t)) continue;
      if (w.good) good += w.w; else bad += w.w;
    }
    return { good, bad };
  }

  function draw() {
    const { good, bad } = tally();
    const total = good + bad;
    const lean = total === 0 ? 0 : ((good - bad) / total);
    const deg = Math.max(-14, Math.min(14, lean * 14));
    beamG.style.setProperty('--tilt', `${-deg}deg`);
    hangL.style.setProperty('--drop', `${deg * 1.7}px`);
    hangR.style.setProperty('--drop', `${-deg * 1.7}px`);

    const verdict = total === 0
      ? ['Nothing on the scale yet', 'Pick some evidence below.', 'flat']
      : lean > 0.28 ? ['More likely than not', 'A reviewer could find for you on this record.', 'win']
        : lean > 0 ? ['Barely tipping', 'It leans your way, but a single good point against you flips it.', 'thin']
          : lean === 0 ? ['Dead level', 'Level is a loss. The burden is yours.', 'flat']
            : ['Against you', 'On this record the claim fails, however true it is.', 'lose'];

    mount(readout,
      h(`div.sc__v.sc__v--${verdict[2]}`,
        h('span.eyebrow', 'Verdict'),
        h('b', verdict[0]),
        h('p', verdict[1])),
      h('div.sc__bars',
        h('div.sc__bar', h('span', 'For'), h('i.sc__f', { style: { '--w': `${total ? (good / total) * 100 : 50}%` } }), h('b', good)),
        h('div.sc__bar', h('span', 'Against'), h('i.sc__a', { style: { '--w': `${total ? (bad / total) * 100 : 50}%` } }), h('b', bad))));
  }

  const chips = BALANCE.weights.map((w) => {
    const b = h(`button.sc__w${w.good ? '.good' : '.bad'}`, { type: 'button', title: w.why },
      icon(w.good ? 'check' : 'x'), h('span', w.t));
    const paint = () => b.classList.toggle('on', picked.has(w.t));
    b.addEventListener('click', () => {
      if (picked.has(w.t)) picked.delete(w.t); else picked.add(w.t);
      paint(); draw();
    });
    paint();
    return b;
  });

  draw();

  return h('div.stack',
    h('p.prose', fx(BALANCE.s)),
    h('section.sc',
      h('div.sc__stage',
        h('div.sc__frame',
          h('div.sc__post'),
          h('div.sc__arm', beamG, hangL, hangR)),
        readout),
      h('div.sc__pick',
        h('p.eyebrow', 'Add or remove evidence'),
        h('div.sc__ws', chips),
        h('p.muted.sc__h', 'Hover any of them for why it weighs what it does.'))),
    note('Notice what the red ones have in common. Every one is something you control — a missing notice, a wrong clause number, an adjective doing a number\'s job. Claims are rarely lost on the facts.', 'tip'));
}

/* ── chapter map ───────────────────────────────────────────────── */
function map() {
  return h('div.map', CHAPTERS.map((c, i) => h('a.map__c', { href: `#/${c.id}`, style: { '--i': i } },
    h('span.map__ic', icon(c.icon)),
    h('span.map__n', c.no),
    h('span.map__t', c.title),
    icon('arrow'))));
}

/* ── further reading ───────────────────────────────────────────── */
function reading() {
  return h('div.stack',
    h('div.g2.grid', READING.map((r) => h('article.read',
      h('span.read__ic', icon('book')),
      h('h3', r.t),
      h('p.read__by', r.by),
      h('p', fx(r.s))))),
    note('This course teaches the craft in its own words, with its own worked examples. It points at those books; it is not a substitute for any of them — least of all the first, which is where the CEES framework comes from.', ''));
}
