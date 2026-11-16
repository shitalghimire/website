/* ═══════════════════════════════════════════════════════════════
   PRACTICE — the room where it sticks.

   Six ways to work the contract into memory:
     quiz      scenario questions, with the reason and the clause
     cards     flashcards that turn over in 3D, on a Leitner schedule
     which     read the plain words, name the clause
     sprint    how many days? against the clock
     changed   General Conditions, or changed by the Particular ones?
     pairs     join the number to the title

   The building blocks (mcq, quizDeck, flashDeck) are exported: lessons,
   clause pages and the claim dossiers use the same ones.
   ═══════════════════════════════════════════════════════════════ */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { reveal } from '../lib/motion.js';
import C from '../engine/contract.js';
import { head, rich, refChip } from './ui.js';

export const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const pick = (a, n) => shuffle(a).slice(0, n);
const DAY = 86400000;
const GAP = [0, 1, 3, 7, 21];

/* ── one multiple-choice question ─────────────────────────────── */
export function mcq(q, { id, onAnswer, kicker } = {}) {
  const box = h('div.pq');
  const why = h('div.pq__why', { hidden: true });
  const opts = q.options.map((o, i) => h('button.pq__opt', { type: 'button', onclick: () => answer(i) }, h('span.pq__k', 'ABCD'[i]), h('span.pq__o', o)));
  function answer(i) {
    if (box.classList.contains('is-done')) return;
    const ok = i === q.a;
    box.classList.add('is-done', ok ? 'is-right' : 'is-wrong');
    opts.forEach((b, j) => { b.disabled = true; b.classList.toggle('is-right', j === q.a); b.classList.toggle('is-wrong', j === i && !ok); });
    mount(why,
      h(`span.stamp.is-thunk${ok ? '.stamp--ok' : '.stamp--tape'}`, { style: { '--rot': ok ? '-4deg' : '3deg' } }, ok ? 'Correct' : 'Not quite'),
      h('p', h('span', rich(q.why))),
      q.ref ? h('div.pq__ref', refChip(q.ref, { label: `Read ${q.ref}` })) : null);
    why.hidden = false;
    if (id) store.update((s) => { s.answers[id] = { ok, at: Date.now() }; });
    onAnswer?.(ok, i);
  }
  box.append(kicker ? h('span.pq__kicker', kicker) : null, h('p.pq__q', q.q), h('div.pq__opts', opts), why);
  box.pick = answer;
  return box;
}

/* ── a round of questions ─────────────────────────────────────── */
export function quizDeck(questions, { size = 10, again, back = '#/drill', backLabel = 'Practice room' } = {}) {
  const st = store.get();
  /* unseen and missed questions come first */
  const round = shuffle(questions).sort((a, b) => (st.answers[a.id]?.ok ? 1 : 0) - (st.answers[b.id]?.ok ? 1 : 0)).slice(0, size);
  const results = [];
  let i = 0;
  const stage = h('div.quiz');
  const strip = h('div.quiz__strip');
  const paintStrip = () => mount(strip, round.map((_, j) => h(`i${j === i ? '.is-now' : ''}${results[j] === true ? '.is-ok' : results[j] === false ? '.is-no' : ''}`)));
  const draw = () => {
    paintStrip();
    if (i >= round.length) return end();
    const q = round[i];
    const next = h('button.btn.btn--stamp', { type: 'button', hidden: true, onclick: () => { i++; draw(); } }, i === round.length - 1 ? 'See the result' : 'Next question', icon('arrow'));
    const card = mcq(q, { id: q.id, kicker: q.topic || `Question ${i + 1} of ${round.length}`, onAnswer: (ok) => { results[i] = ok; paintStrip(); next.hidden = false; next.focus({ preventScroll: true }); } });
    mount(stage, strip, h('div.quiz__card', card), h('div.quiz__nav', h('span.muted', `${i + 1} of ${round.length}`), next));
  };
  const end = () => {
    const score = results.filter(Boolean).length;
    const pct = score / round.length;
    const r = 54; const c = 2 * Math.PI * r;
    const dial = h('div.quiz__dial', { html: `<svg viewBox="0 0 128 128"><circle cx="64" cy="64" r="${r}" class="quiz__dialbg"/><circle cx="64" cy="64" r="${r}" class="quiz__dialfg" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 64 64)"/></svg>` });
    dial.append(h('b', `${score}/${round.length}`));
    requestAnimationFrame(() => requestAnimationFrame(() => dial.querySelector('.quiz__dialfg').setAttribute('stroke-dashoffset', c * (1 - pct))));
    const missed = round.filter((_, j) => results[j] === false);
    mount(stage, strip, h('div.quiz__end',
      dial,
      h('h2', pct >= .8 ? 'Strong round.' : pct >= .5 ? 'Good. A few to look at again.' : 'Worth another round.'),
      h('p.muted', pct >= .8 ? 'You could brief the team on these.' : 'The explanations are where the learning is. The ones you missed will come back first next time.'),
      h('div.row', again ? h('button.btn.btn--stamp', { type: 'button', onclick: again }, icon('refresh'), 'Another round') : null, h('a.btn', { href: back }, backLabel)),
      missed.length ? h('div.quiz__missed', h('span.eyebrow', 'Look at these again'), missed.map((q) => h('div.quiz__miss', h('p.quiz__missq', q.q), h('p.quiz__missa', icon('check'), h('span', q.options[q.a])), h('p.quiz__missw', h('span', rich(q.why))), q.ref ? refChip(q.ref, { label: `Read ${q.ref}` }) : null))) : null));
  };
  draw();
  const onKey = (e) => {
    if (!stage.isConnected) { document.removeEventListener('keydown', onKey); return; }
    const k = e.key.toLowerCase();
    const card = stage.querySelector('.pq');
    if (card && !card.classList.contains('is-done') && 'abcd'.includes(k) && k.length === 1) card.pick('abcd'.indexOf(k));
  };
  document.addEventListener('keydown', onKey);
  return stage;
}

/* ── flashcards: a real deck, cards that turn over ─────────────── */
export function flashDeck(cards, { size = 16, back = '#/drill', backLabel = 'Practice room', again } = {}) {
  const st = store.get();
  const due = (c) => { const e = st.leitner[c.id]; if (!e) return 0; return e.next <= Date.now() ? e.box : 99; };
  let deck = cards.filter((c) => due(c) < 99).sort((a, b) => due(a) - due(b));
  if (!deck.length) deck = shuffle(cards);
  deck = deck.slice(0, size);
  let i = 0; let known = 0;
  const stage = h('div.fc');
  const rate = (c, ok) => {
    store.update((s) => { const e = s.leitner[c.id] || { box: 0 }; e.box = ok ? Math.min(4, e.box + 1) : 0; e.next = Date.now() + GAP[e.box] * DAY; s.leitner[c.id] = e; });
    if (ok) known++;
    const card = stage.querySelector('.fc__card');
    card?.classList.add(ok ? 'is-out-r' : 'is-out-l');
    setTimeout(() => { i++; draw(); }, 260);
  };
  const draw = () => {
    if (i >= deck.length) {
      mount(stage, h('div.quiz__end', h('span.stamp.is-thunk.stamp--ok', { style: { '--rot': '-5deg' } }, `${known} of ${deck.length} known`), h('h2', 'Deck done.'), h('p.muted', 'Cards you knew come back in a few days. The others come back tomorrow.'),
        h('div.row', again ? h('button.btn.btn--stamp', { type: 'button', onclick: again }, icon('refresh'), 'Another deck') : null, h('a.btn', { href: back }, backLabel))));
      return;
    }
    const c = deck[i];
    const rateRow = h('div.fc__rate', { hidden: true },
      h('button.btn', { type: 'button', onclick: () => rate(c, false) }, icon('refresh'), 'Again tomorrow'),
      h('button.btn.btn--stamp', { type: 'button', onclick: () => rate(c, true) }, icon('check'), 'I knew it'));
    const card = h('button.fc__card', { type: 'button', 'aria-label': 'Turn the card', onclick: () => { card.classList.toggle('is-flipped'); rateRow.hidden = false; } },
      h('span.fc__face.fc__front', c.kicker ? h('span.fc__kicker', c.kicker) : null, h(`span.fc__big${String(c.front).length > 28 ? '.is-long' : ''}`, c.front), h('span.fc__hint', icon('refresh'), c.hint || 'Say it out loud, then turn the card')),
      h('span.fc__face.fc__back', c.title ? h('span.fc__t', c.title) : null, h('span.fc__g', h('span', rich(c.back))), c.note ? h('span.fc__d', c.note) : null));
    mount(stage,
      h('div.quiz__strip', deck.map((_, j) => h(`i${j === i ? '.is-now' : j < i ? '.is-ok' : ''}`))),
      h('div.fc__table', h('span.fc__under.fc__under--2'), h('span.fc__under'), card),
      rateRow,
      h('p.fc__keys.muted', h('kbd', 'Space'), ' turn  ', h('kbd', '←'), ' again  ', h('kbd', '→'), ' knew it'));
  };
  draw();
  const onKey = (e) => {
    if (!stage.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    const card = stage.querySelector('.fc__card'); if (!card || i >= deck.length) return;
    if (e.key === ' ') { e.preventDefault(); card.click(); }
    else if (card.classList.contains('is-flipped') && e.key === 'ArrowRight') rate(deck[i], true);
    else if (card.classList.contains('is-flipped') && e.key === 'ArrowLeft') rate(deck[i], false);
  };
  document.addEventListener('keydown', onKey);
  return stage;
}

/* ── what there is to practise ────────────────────────────────── */
function bank(data) {
  const Q = data.path.questions;
  const byMod = {};
  for (const m of data.path.modules) byMod[m.id] = [...new Set(m.lessons.flatMap((l) => l.blocks.filter((b) => b.t === 'check').flatMap((b) => b.ids)))];
  const contract = Object.entries(Q).map(([id, q]) => ({ id, ...q }));
  const claims = (data.claims?.list || []).flatMap((c) => (c.quiz || []).map((q, i) => ({ id: `claim:${c.id}:${i}`, topic: `Claim No. ${c.no}`, claim: c.id, ...q })));
  return { Q, byMod, contract, claims };
}
function decks(data) {
  const clauses = C.allClauses().filter((c) => c.plain?.gist && c.plain.level !== 'rare').map((c) => ({ id: c.no, kicker: 'Clause', front: c.no, hint: 'What does this clause do?', title: `${c.no} · ${c.title}`, back: c.plain.gist, note: c.plain.d?.[0] ? `${c.plain.d[0].n} ${c.plain.d[0].unit}: ${c.plain.d[0].act}` : '' }));
  const clocks = C.deadlines().map((d, i) => ({ id: `d:${d.ref}:${i}`, kicker: `Deadline · ${d.ref}`, front: d.act[0].toUpperCase() + d.act.slice(1), hint: 'How long, and from when?', title: `${d.n} ${d.unit}`, back: `From ${d.from}.`, note: d.bar ? 'Miss it and the right is lost.' : '' }));
  const claims = (data.claims?.list || []).flatMap((c) => (c.cards || []).map((k, i) => ({ id: `k:${c.id}:${i}`, kicker: `Claim No. ${c.no}`, front: k.f, back: k.b })));
  const words = (data.glossary || []).map((g) => ({ id: `w:${g.term}`, kicker: 'Word', front: g.term, hint: 'What does it mean?', back: g.text, note: g.ref ? `See ${g.ref}` : '' }));
  return { clauses, clocks, claims, words };
}

/* ═══════════════ THE ROOM ═══════════════ */
export default function practice(view, { args, params, ctx, data }) {
  view.classList.add('view--practice');
  const [mode, topic] = args;
  const B = bank(data); const DK = decks(data);
  const redo = () => { mount(view); view.className = 'view'; practice(view, { args, params, ctx, data }); };

  if (mode === 'quiz') {
    const cl = params.get('c');
    let pool; let title;
    if (cl) { pool = B.contract.filter((q) => q.ref && String(q.ref).split('.')[0] === cl); title = `Questions on Clause ${cl}`; }
    else if (topic === 'claims') { pool = B.claims; title = 'Claims: the three dossiers'; }
    else if (/^c\d+$/.test(topic || '')) { pool = B.claims.filter((q) => q.claim === topic); title = `Claim No. ${topic.slice(1)}`; }
    else if (B.byMod[topic]) { const m = data.path.modules.find((x) => x.id === topic); pool = B.byMod[topic].map((id) => ({ id, ...B.Q[id] })); title = m.title; }
    else if (topic === 'contract') { pool = B.contract; title = 'The contract'; }
    else { pool = [...B.contract, ...B.claims]; title = 'Everything, mixed'; }
    ctx.crumbs([{ label: 'Practice', href: '#/drill' }, { label: 'Quiz' }]);
    view.append(head(h('span', 'Quiz: ', h('em', title)), 'Pick an answer. You get the reason straight away, and the clause to read. Keys A to D work too.'));
    if (!pool.length) { view.append(h('div.empty', 'No questions on this yet. ', h('a', { href: '#/drill' }, 'Back to Practice'))); return; }
    view.append(quizDeck(pool, { again: redo }));
    return;
  }
  if (mode === 'cards') {
    const d = DK[topic] ? topic : 'clauses';
    const names = { clauses: 'Clauses', clocks: 'Deadlines', claims: 'The three claims', words: 'Words' };
    ctx.crumbs([{ label: 'Practice', href: '#/drill' }, { label: 'Flashcards' }]);
    view.append(head(h('span', 'Flashcards: ', h('em', names[d])), 'Say the answer out loud first. Then turn the card and be honest with yourself.'),
      h('div.seg.pr-decks', Object.keys(names).map((k) => h('button', { type: 'button', 'aria-pressed': String(k === d), onclick: () => { location.hash = `/drill/cards/${k}`; } }, names[k], h('small', ` ${DK[k].length}`)))),
      flashDeck(DK[d], { again: redo }));
    return;
  }
  if (mode === 'which') return which(view, ctx, redo);
  if (mode === 'sprint') return sprint(view, ctx, redo);
  if (mode === 'changed') return changed(view, ctx, redo);
  if (mode === 'pairs') return pairs(view, ctx, redo);

  /* ── landing ── */
  ctx.crumbs([{ label: 'Practice' }]);
  const st = store.get();
  const boxes = [0, 0, 0, 0, 0];
  for (const v of Object.values(st.leitner)) boxes[Math.min(4, v.box)]++;
  const best = st.settings.sprintBest;
  const MODES = [
    ['quiz', 'cards', 'Scenario quiz', `${B.contract.length + B.claims.length} questions from real TKV situations. Each answer comes with the reason and the clause.`, 'Ten questions'],
    ['cards/clauses', 'layers', 'Flashcards', `${DK.clauses.length + DK.clocks.length + DK.claims.length + DK.words.length} cards in four decks. They turn over, and the ones you miss come back sooner.`, 'Four decks'],
    ['which', 'search', 'Which clause?', 'Read the plain words. Name the clause they come from.', 'Ten rounds'],
    ['sprint', 'clock', 'Deadline sprint', 'How many days? Twelve quick rounds on the time limits that bite.', best ? `Best: ${best.score}/12 in ${best.secs}s` : 'Twelve rounds'],
    ['changed', 'tape', 'Changed or not?', 'General Conditions as printed, or changed by the Particular Conditions? Fifteen quick calls.', 'Fifteen rounds'],
    ['pairs', 'link', 'Pairs', 'Join six clause numbers to their titles. Fewest mistakes wins.', 'Six pairs'],
  ];
  view.append(
    h('section.pr-hero',
      h('div', h('span.pr-hero__k', icon('target'), 'Practice'), h('h1.pr-hero__t', 'Read it once.', h('br'), h('em', 'Use it'), ' until it stays.'),
        h('p.pr-hero__s', 'Ten minutes is enough. Every question and card here comes from this Contract and from what really happened on the project.')),
      h('div.pr-hero__art', { 'aria-hidden': 'true' }, h('span.pr-hero__card.pr-hero__card--3', '21'), h('span.pr-hero__card.pr-hero__card--2', '35.1'), h('span.pr-hero__card.pr-hero__card--1', h('small', 'Notice of claim'), h('b', '21 days')))),
    h('div.pr-modes', MODES.map(([id, ic, t, s, meta], i) => h('a.pr-mode', { href: `#/drill/${id}`, style: { '--i': i } },
      h('span.pr-mode__ic', icon(ic)), h('h3', t), h('p', s), h('span.pr-mode__meta', meta, icon('arrow'))))),

    h('h2.sec__title', h('span.eyebrow', 'Choose what to be asked about'), 'Quiz by topic'),
    h('div.pr-topics',
      h('a.pr-topic.pr-topic--all', { href: '#/drill/quiz/all' }, h('b', 'Everything, mixed'), h('small', `${B.contract.length + B.claims.length} questions`)),
      (data.claims?.list || []).map((c) => h('a.pr-topic.pr-topic--claim', { href: `#/drill/quiz/${c.id}` }, h('b', `Claim No. ${c.no}`), h('small', `${c.short} · ${(c.quiz || []).length} questions`))),
      data.path.modules.map((m) => h('a.pr-topic', { href: `#/drill/quiz/${m.id}` }, h('b', m.title), h('small', `${B.byMod[m.id].length} questions`)))),

    h('h2.sec__title', h('span.eyebrow', 'Spaced repetition'), 'Your flashcard boxes'),
    h('div.pr-boxes', boxes.map((n, i) => h('div.pr-box', { style: { '--i': i } }, h('b', n), h('span', ['New or missed', 'Box 2', 'Box 3', 'Box 4', 'Known well'][i]), h('small', ['comes back at once', 'in 1 day', 'in 3 days', 'in 7 days', 'in 21 days'][i])))));
  reveal(view.querySelector('.pr-modes'), { selector: '.pr-mode', stagger: 55 });
}

/* a small frame shared by the quick games */
function game(view, ctx, { name, title, sub, rounds, draw, redo, onEnd }) {
  ctx.crumbs([{ label: 'Practice', href: '#/drill' }, { label: name }]);
  const stage = h('div.quiz');
  const res = [];
  let i = 0;
  const t0 = Date.now();
  const strip = () => h('div.quiz__strip', rounds.map((_, j) => h(`i${j === i ? '.is-now' : ''}${res[j] === true ? '.is-ok' : res[j] === false ? '.is-no' : ''}`)));
  const step = () => {
    if (i >= rounds.length) {
      const score = res.filter(Boolean).length; const secs = Math.round((Date.now() - t0) / 1000);
      onEnd?.(score, secs);
      mount(stage, strip(), h('div.quiz__end', h(`span.stamp.is-thunk${score >= rounds.length * .8 ? '.stamp--ok' : score >= rounds.length * .5 ? '.stamp--warn' : '.stamp--tape'}`, { style: { '--rot': '-5deg' } }, `${score} / ${rounds.length} · ${secs}s`),
        h('h2', score >= rounds.length * .8 ? 'Sharp.' : 'Once more, and it will stick.'),
        h('div.row', h('button.btn.btn--stamp', { type: 'button', onclick: redo }, icon('refresh'), 'Again'), h('a.btn', { href: '#/drill' }, 'Practice room'))));
      return;
    }
    const next = h('button.btn.btn--stamp.btn--sm', { type: 'button', onclick: () => { i++; step(); } }, i === rounds.length - 1 ? 'Result' : 'Next', icon('arrow'));
    const done = (ok, extra) => { res[i] = ok; stage.querySelector('.quiz__strip')?.replaceWith(strip()); mount(foot, extra || null, next); next.focus({ preventScroll: true }); };
    const foot = h('div.quiz__nav');
    mount(stage, strip(), h('div.quiz__card', draw(rounds[i], done, i)), foot);
  };
  view.append(head(h('span', title), sub), stage);
  step();
}

function which(view, ctx, redo) {
  const all = C.allClauses().filter((c) => c.plain?.gist && c.plain.level !== 'rare');
  const rounds = pick(all, 10);
  game(view, ctx, { name: 'Which clause?', title: h('span', 'Which ', h('em', 'clause'), '?'), sub: 'These are the plain words of one clause. Which one?', rounds, redo,
    draw: (c, done) => {
      const others = pick(all.filter((x) => x.no !== c.no && x.section === c.section), 3);
      while (others.length < 3) others.push(...pick(all.filter((x) => x.no !== c.no && !others.includes(x)), 3 - others.length));
      const opts = shuffle([c, ...others.slice(0, 3)]);
      const gist = c.plain.gist.replace(new RegExp(`\\b${c.no}(\\.\\d+)?\\b`, 'g'), '…');
      const btns = opts.map((o) => h('button.pq__opt', { type: 'button', onclick: () => {
        btns.forEach((b, j) => { b.disabled = true; b.classList.toggle('is-right', opts[j] === c); });
        if (o !== c) btns[opts.indexOf(o)].classList.add('is-wrong');
        done(o === c, refChip(c.no, { label: `Read ${c.no} ${c.title}` }));
      } }, h('span.pq__k', o.no), h('span.pq__o', o.title)));
      return h('div.pq', h('span.pq__kicker', 'In plain words'), h('p.pq__q.pq__q--gist', gist), h('div.pq__opts', btns));
    } });
}

function sprint(view, ctx, redo) {
  const pool = C.deadlines().filter((d) => d.unit === 'days' && d.n > 1 && d.n < 800);
  const rounds = pick(pool, 12);
  game(view, ctx, { name: 'Deadline sprint', title: h('span', 'Deadline ', h('em', 'sprint')), sub: 'Twelve rounds. Speed counts, but accuracy counts more.', rounds, redo,
    onEnd: (score, secs) => { const b = store.get().settings.sprintBest; if (!b || score > b.score || (score === b.score && secs < b.secs)) store.update((s) => { s.settings.sprintBest = { score, secs }; }); },
    draw: (d, done) => {
      const opts = shuffle([...new Set([d.n, ...pick([7, 14, 15, 21, 28, 30, 35, 42, 45, 56, 60, 84, 90, 730].filter((x) => x !== d.n), 3)])]);
      const btns = opts.map((o) => h('button.sprint__o', { type: 'button', onclick: () => {
        btns.forEach((b, j) => { b.disabled = true; b.classList.toggle('is-right', opts[j] === d.n); });
        if (o !== d.n) btns[opts.indexOf(o)].classList.add('is-wrong');
        done(o === d.n, refChip(String(d.ref).split(' ')[0], { label: `Read ${d.ref}` }));
      } }, h('b', o), h('small', 'days')));
      return h('div.pq', h('span.pq__kicker', `Clause ${d.ref}`), h('p.pq__q', d.act[0].toUpperCase() + d.act.slice(1)), h('p.muted', `How many days from ${d.from}?`), h('div.sprint__opts', btns));
    } });
}

function changed(view, ctx, redo) {
  const all = C.allClauses().filter((c) => c.section !== 'P' && c.plain?.gist);
  const yes = all.filter((c) => C.isAmended(c.no)); const no = all.filter((c) => !C.isAmended(c.no));
  const rounds = shuffle([...pick(yes, 8), ...pick(no, 7)]);
  game(view, ctx, { name: 'Changed or not?', title: h('span', 'Changed ', h('em', 'or not'), '?'), sub: 'Is this clause as printed in the General Conditions, or did the Particular Conditions change it? Quote the wrong one and the letter is weak.', rounds, redo,
    draw: (c, done) => {
      const am = C.isAmended(c.no);
      const mk = (label, val, ic) => h('button.pq__opt.pq__opt--big', { type: 'button', onclick: (e) => {
        row.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        row.children[am ? 0 : 1].classList.add('is-right');
        if (val !== am) e.currentTarget.classList.add('is-wrong');
        done(val === am, h('span.pq__after', am ? 'Changed. Read the red PCC slip before you quote it. ' : 'As printed in the General Conditions. ', refChip(c.no, { label: `Open ${c.no}` })));
      } }, h('span.pq__k', icon(ic)), h('span.pq__o', label));
      const row = h('div.pq__opts.pq__opts--two', mk('Changed by the Particular Conditions', true, 'tape'), mk('As printed in the General Conditions', false, 'book'));
      return h('div.pq', h('span.pq__kicker', `Clause ${c.no}`), h('p.pq__q', c.title), h('p.muted', c.plain.gist.length > 170 ? c.plain.gist.slice(0, 168) + '…' : c.plain.gist), row);
    } });
}

function pairs(view, ctx, redo) {
  ctx.crumbs([{ label: 'Practice', href: '#/drill' }, { label: 'Pairs' }]);
  const set = pick(C.allClauses().filter((c) => c.plain?.level === 'core' || c.plain?.level === 'useful'), 6);
  const left = shuffle(set); const right = shuffle(set);
  let sel = null; let miss = 0; let found = 0;
  const t0 = Date.now();
  const status = h('p.pairs__status.muted', 'Pick a number, then its title.');
  const L = left.map((c) => h('button.pairs__c.pairs__c--no', { type: 'button', onclick: () => { if (L[left.indexOf(c)].classList.contains('is-done')) return; L.forEach((b) => b.classList.remove('is-sel')); sel = c; L[left.indexOf(c)].classList.add('is-sel'); } }, c.no));
  const R = right.map((c) => h('button.pairs__c', { type: 'button', onclick: (e) => {
    const b = e.currentTarget; if (!sel || b.classList.contains('is-done')) return;
    if (sel === c) { b.classList.add('is-done'); const lb = L[left.indexOf(c)]; lb.classList.remove('is-sel'); lb.classList.add('is-done'); sel = null; found++; }
    else { miss++; b.classList.add('is-no'); setTimeout(() => b.classList.remove('is-no'), 420); }
    status.textContent = found === 6 ? '' : `${found} of 6 joined · ${miss} mistake${miss === 1 ? '' : 's'}`;
    if (found === 6) mount(end, h(`span.stamp.is-thunk${miss ? '.stamp--warn' : '.stamp--ok'}`, { style: { '--rot': '-4deg' } }, miss ? `${miss} mistake${miss === 1 ? '' : 's'} · ${Math.round((Date.now() - t0) / 1000)}s` : `Clean · ${Math.round((Date.now() - t0) / 1000)}s`),
      h('div.row', h('button.btn.btn--stamp', { type: 'button', onclick: redo }, icon('refresh'), 'New set'), h('a.btn', { href: '#/drill' }, 'Practice room')));
  } }, c.title));
  const end = h('div.pairs__end');
  view.append(head(h('span', 'Pairs'), 'Join each clause number to its title.'), h('div.pairs', h('div.pairs__col', L), h('div.pairs__col', R)), status, end);
}
