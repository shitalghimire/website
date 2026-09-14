/* Practice: quiz, flashcards (Leitner boxes), deadline sprint */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import C from '../engine/contract.js';
import { head, rich, question, refChip } from './ui.js';

const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

export default function drill(view, { args, ctx, data }) {
  const mode = args[0];
  if (mode === 'quiz') return quiz(view, ctx, data);
  if (mode === 'cards') return cards(view, ctx, data);
  if (mode === 'clocks') return sprint(view, ctx, data);
  ctx.crumbs([{ label: 'Practice' }]);
  const st = store.get();
  const answered = Object.values(st.answers);
  const acc = answered.length ? Math.round(answered.filter((a) => a.ok).length / answered.length * 100) : null;
  const boxes = [0, 0, 0, 0, 0];
  for (const v of Object.values(st.leitner)) boxes[Math.min(4, v.box)]++;
  view.append(
    head(h('span', 'Practice ', h('em', 'room')), 'Ten minutes a day is enough. Questions come from real TKV situations; flashcards use spaced repetition, so the clauses you miss come back more often.'),
    h('div.grid.grid--3.drill-modes',
      mode_('quiz', 'Scenario quiz', `${Object.keys(data.path.questions).length} questions from TKV situations`, acc != null ? `${acc}% right so far` : 'Not started', 'cards'),
      mode_('cards', 'Clause flashcards', 'Number on the front, plain words on the back. Leitner boxes.', `${boxes.slice(3).reduce((a, b) => a + b, 0)} cards mastered`, 'book'),
      mode_('clocks', 'Deadline sprint', 'How many days? Twelve quick rounds on the time limits that bite.', 'Beat your best', 'clock')),
    h('section.leitner', h('span.eyebrow', 'Your flashcard boxes'), h('div.leitner__boxes', boxes.map((n, i) => h('div.leitner__box', h('b', n), h('small', ['New / missed', 'Box 2', 'Box 3', 'Box 4', 'Mastered'][i]))))));
}

const mode_ = (id, t, s, stat, ic) => h('a.card.card--link.drill-mode', { href: `#/drill/${id}` }, h('span.drill-mode__ic', icon(ic)), h('h3', t), h('p', s), h('span.chip.chip--plain', stat));

function quiz(view, ctx, data) {
  ctx.crumbs([{ label: 'Practice', href: '#/drill' }, { label: 'Quiz' }]);
  const Q = data.path.questions;
  const st = store.get();
  // prefer unanswered and wrong ones
  const ids = shuffle(Object.keys(Q)).sort((a, b) => (st.answers[a]?.ok ? 1 : 0) - (st.answers[b]?.ok ? 1 : 0)).slice(0, 10);
  let i = 0; let score = 0;
  const stage = h('div.quiz');
  const draw = () => {
    if (i >= ids.length) {
      mount(stage, h('div.quiz__end', h('span.stamp.is-thunk' + (score >= 8 ? '.stamp--ok' : score >= 5 ? '.stamp--warn' : '.stamp--tape'), { style: { '--rot': '-6deg' } }, `${score} / ${ids.length}`), h('p', score >= 8 ? 'Excellent — you could brief the team.' : score >= 5 ? 'Good. Re-read the clauses you missed.' : 'Worth another round — the explanations are where the learning is.'), h('div.row', h('button.btn.btn--stamp', { type: 'button', onclick: () => quiz(mount(view), ctx, data) }, icon('refresh'), 'New round'), h('a.btn', { href: '#/drill' }, 'Practice room'))));
      return;
    }
    const id = ids[i];
    const next = h('button.btn.btn--ink', { type: 'button', hidden: true, onclick: () => { i++; draw(); } }, i === ids.length - 1 ? 'See score' : 'Next', icon('arrow'));
    mount(stage, h('div.quiz__top', h('span.mono', `${i + 1} / ${ids.length}`), h('div.quiz__bar', h('span', { style: { width: `${(i / ids.length) * 100}%` } }))),
      question(id, Q[id], { onAnswer: (ok) => { if (ok) score++; next.hidden = false; } }), h('div.quiz__nav', Q[id].ref ? refChip(Q[id].ref, { label: `Read ${Q[id].ref}` }) : null, next));
  };
  view.append(head('Scenario quiz', 'Pick an answer; the explanation tells you why.'), stage);
  draw();
}

function cards(view, ctx, data) {
  ctx.crumbs([{ label: 'Practice', href: '#/drill' }, { label: 'Flashcards' }]);
  const all = C.allClauses().filter((c) => c.plain?.gist && c.plain.level !== 'rare');
  const st = store.get();
  const due = (c) => { const e = st.leitner[c.no]; if (!e) return 0; return e.next <= Date.now() ? e.box : 99; };
  let deck = all.filter((c) => due(c) < 99).sort((a, b) => due(a) - due(b));
  if (!deck.length) deck = shuffle(all);
  deck = deck.slice(0, 20);
  let i = 0;
  const stage = h('div.fc');
  const rate = (c, ok) => {
    store.update((s) => {
      const e = s.leitner[c.no] || { box: 0 };
      e.box = ok ? Math.min(4, e.box + 1) : 0;
      e.next = Date.now() + [0, 1, 3, 7, 21][e.box] * 86400000;
      s.leitner[c.no] = e;
    });
    i++; draw();
  };
  const draw = () => {
    if (i >= deck.length) { mount(stage, h('div.quiz__end', h('p', 'Deck done. Cards you knew come back later; the others return tomorrow.'), h('a.btn', { href: '#/drill' }, 'Practice room'))); return; }
    const c = deck[i];
    const card = h('button.fc__card', { type: 'button', onclick: () => card.classList.toggle('is-flipped') },
      h('span.fc__face.fc__front', h('span.fc__no', c.no), h('span.fc__hint', 'What does this clause do? Tap to turn.')),
      h('span.fc__face.fc__back', h('span.fc__t', `${c.no} · ${c.title}`), h('span.fc__g', c.plain.gist), c.plain.d?.[0] ? h('span.fc__d', `${c.plain.d[0].n} ${c.plain.d[0].unit} — ${c.plain.d[0].act}`) : null));
    mount(stage, h('div.quiz__top', h('span.mono', `${i + 1} / ${deck.length}`), h('div.quiz__bar', h('span', { style: { width: `${(i / deck.length) * 100}%` } }))), card,
      h('div.fc__rate', h('button.btn', { type: 'button', onclick: () => rate(c, false) }, icon('x'), 'Not yet'), h('button.btn.btn--stamp', { type: 'button', onclick: () => rate(c, true) }, icon('check'), 'I knew it')));
  };
  view.append(head('Clause flashcards', 'Say the gist out loud before you turn the card.'), stage);
  draw();
}

function sprint(view, ctx, data) {
  ctx.crumbs([{ label: 'Practice', href: '#/drill' }, { label: 'Deadline sprint' }]);
  const pool = C.deadlines().filter((d) => d.unit === 'days' && d.n > 1 && d.n < 800);
  const rounds = shuffle(pool).slice(0, 12);
  let i = 0; let score = 0; let t0 = Date.now();
  const stage = h('div.sprint');
  const draw = () => {
    if (i >= rounds.length) {
      const secs = Math.round((Date.now() - t0) / 1000);
      const best = store.get().settings.sprintBest;
      if (!best || score > best.score || (score === best.score && secs < best.secs)) store.update((s) => { s.settings.sprintBest = { score, secs }; });
      mount(stage, h('div.quiz__end', h('span.stamp.is-thunk.stamp--ok', `${score} / ${rounds.length} · ${secs}s`), h('div.row', h('button.btn.btn--stamp', { type: 'button', onclick: () => sprint(mount(view), ctx, data) }, icon('refresh'), 'Again'), h('a.btn', { href: '#/clock' }, 'All clocks'))));
      return;
    }
    const d = rounds[i];
    const opts = shuffle([...new Set([d.n, ...shuffle([7, 14, 15, 21, 28, 30, 35, 42, 45, 56, 60, 84, 90, 730].filter((x) => x !== d.n)).slice(0, 3)])]);
    const res = h('div.sprint__res');
    mount(stage,
      h('div.quiz__top', h('span.mono', `${i + 1} / ${rounds.length}`), h('div.quiz__bar', h('span', { style: { width: `${(i / rounds.length) * 100}%` } }))),
      h('div.sprint__q', h('span.eyebrow', d.ref), h('p', h('b', d.act)), h('p.muted', `How many ${d.unit} from ${d.from}?`)),
      h('div.sprint__opts', opts.map((o) => h('button.sprint__o', { type: 'button', onclick: (e) => {
        stage.querySelectorAll('.sprint__o').forEach((b) => { b.disabled = true; b.classList.toggle('is-right', +b.textContent === d.n); });
        if (o === d.n) score++; else e.currentTarget.classList.add('is-wrong');
        mount(res, refChip(d.ref.split(' ')[0], { label: `${d.ref} — read it` }), h('button.btn.btn--ink.btn--sm', { type: 'button', onclick: () => { i++; draw(); } }, 'Next', icon('arrow')));
      } }, o))),
      res);
  };
  view.append(head('Deadline sprint', 'Twelve rounds. Speed counts — but accuracy counts more.'), stage);
  t0 = Date.now();
  draw();
}
