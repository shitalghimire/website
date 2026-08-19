/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — quiz engine
   Three contexts, one engine. Rules that matter:
     · explain every answer, including correct ones
     · on an inline check, do not reveal the answer until the second wrong try
     · shuffle options on every render — position must never be the answer
     · never colour alone: every state carries a glyph and a word
   ═══════════════════════════════════════════════════════════════ */

import { el, frag, shuffle, num, announce, prefersReducedMotion } from './util.js';
import { inline } from './render.js';

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Render one question.
 * @param {object} q       question from the bank
 * @param {object} opts    { mode:'inline'|'exam', onDone(correct, q), index, total }
 */
export function question(q, opts = {}) {
  const { mode = 'exam', onDone = () => {} } = opts;
  const wrap = el('div.quiz');
  let attempts = 0;
  let finished = false;

  wrap.append(el('div.quiz__stem', inline(q.stem)));

  const feedback = el('div');
  const body = el('div');
  wrap.append(body, feedback);

  switch (q.type) {
    case 'numeric': numeric(); break;
    case 'order': ordering(); break;
    case 'multi': multi(); break;
    default: choice(); break;      // mcq, truefalse, chart
  }

  return wrap;

  /* ── single-answer choice (mcq / truefalse / chart) ────── */
  function choice() {
    const opts2 = shuffle(q.options.map((o, i) => ({ ...o, i })));
    const list = el('div.quiz__opts');
    const btns = opts2.map((o, k) => {
      const b = el('button.quiz-option', {
        type: 'button',
        onclick: () => pick(o, b)
      }, [
        el('span.quiz-option__k', KEYS[k]),
        el('span.quiz-option__v', inline(o.t)),
        el('span.quiz-option__mark')
      ]);
      return b;
    });
    list.append(...btns);
    body.append(list);

    function pick(o, btn) {
      if (finished) return;
      attempts++;
      if (o.correct) {
        finished = true;
        btns.forEach(b => b.disabled = true);
        mark(btn, true);
        // also mark the correct one if the learner had already been wrong
        explain(true);
        flash(btn, true);
        onDone(attempts === 1, q);
      } else {
        mark(btn, false);
        btn.disabled = true;
        flash(btn, false);
        if (mode === 'inline' && attempts === 1 && q.hintOnFirstWrong) {
          feedback.replaceChildren(el('div.explain.explain--hint', [
            el('span.explain__l', 'Not quite'),
            el('div', inline(q.hintOnFirstWrong))
          ]));
          announce('Not quite. ' + q.hintOnFirstWrong);
        } else {
          finished = true;
          btns.forEach(b => b.disabled = true);
          const right = btns[opts2.findIndex(x => x.correct)];
          if (right) mark(right, true);
          explain(false);
          onDone(false, q);
        }
      }
    }

    function mark(btn, ok) {
      btn.classList.add(ok ? 'is-correct' : 'is-wrong');
      btn.querySelector('.quiz-option__mark').textContent = ok ? '✓ Correct' : '✗ Incorrect';
    }
  }

  /* ── select-all-that-apply, with partial credit ────────── */
  function multi() {
    const opts2 = shuffle(q.options.map((o, i) => ({ ...o, i })));
    const chosen = new Set();
    const list = el('div.quiz__opts');
    const btns = opts2.map((o, k) => {
      const b = el('button.quiz-option', {
        type: 'button',
        onclick: () => {
          if (finished) return;
          if (chosen.has(o)) { chosen.delete(o); b.classList.remove('is-chosen'); b.querySelector('.quiz-option__mark').textContent = ''; }
          else { chosen.add(o); b.classList.add('is-chosen'); b.querySelector('.quiz-option__mark').textContent = 'selected'; }
        }
      }, [
        el('span.quiz-option__k', '☐'),
        el('span.quiz-option__v', inline(o.t)),
        el('span.quiz-option__mark')
      ]);
      return b;
    });
    list.append(...btns);

    const submit = el('button.btn.btn--primary', {
      style: { marginTop: 'var(--s4)' },
      onclick: () => {
        if (finished) return;
        finished = true;
        btns.forEach(b => b.disabled = true);
        submit.disabled = true;
        let right = 0, total = 0;
        opts2.forEach((o, k) => {
          const b = btns[k];
          const picked = chosen.has(o);
          if (o.correct) total++;
          if (o.correct && picked) { right++; b.classList.add('is-correct'); b.querySelector('.quiz-option__mark').textContent = '✓ Correct'; }
          else if (o.correct && !picked) { b.classList.add('is-correct'); b.querySelector('.quiz-option__mark').textContent = '✓ Should have been selected'; }
          else if (!o.correct && picked) { b.classList.add('is-wrong'); b.querySelector('.quiz-option__mark').textContent = '✗ Incorrect'; }
          b.querySelector('.quiz-option__k').textContent = picked ? '☑' : '☐';
        });
        const wrongPicks = [...chosen].filter(o => !o.correct).length;
        const ok = right === total && wrongPicks === 0;
        explain(ok, ok ? null : `You selected ${right} of ${total} correct options` + (wrongPicks ? ` and ${wrongPicks} incorrect one${wrongPicks === 1 ? '' : 's'}` : '') + '.');
        onDone(ok, q);
      }
    }, 'Submit answer');

    body.append(list, submit);
  }

  /* ── numeric with tolerance ────────────────────────────── */
  function numeric() {
    const input = el('input', {
      type: 'number', step: 'any',
      placeholder: q.unit || 'Your answer',
      'aria-label': 'Your numeric answer'
    });
    const submit = el('button.btn.btn--primary', {
      onclick: () => {
        if (finished) return;
        const v = parseFloat(input.value);
        if (Number.isNaN(v)) { announce('Enter a number first.'); input.focus(); return; }
        attempts++;
        const tol = q.tolerance ?? 0.01;
        const ok = Math.abs(v - q.answer) <= tol;
        if (ok || mode !== 'inline' || attempts >= 2) {
          finished = true;
          input.disabled = true; submit.disabled = true;
          explain(ok, ok ? null : `You answered ${num(v, 2)}. The answer is ${num(q.answer, 2)}${q.unit ? ' ' + q.unit : ''}.`);
          onDone(ok && attempts === 1, q);
        } else {
          feedback.replaceChildren(el('div.explain.explain--hint', [
            el('span.explain__l', 'Not quite'),
            el('div', inline(q.hintOnFirstWrong || 'Check your arithmetic and try once more.'))
          ]));
        }
      }
    }, 'Check');
    body.append(el('div.numanswer', [
      el('div.field', { style: { flex: '1 1 180px', maxWidth: '220px' } }, input),
      submit,
      q.unit && el('span.dim', { style: { fontFamily: 'var(--f-data)', fontSize: 'var(--t-cap)' } }, q.unit)
    ]));
  }

  /* ── sequencing ────────────────────────────────────────── */
  function ordering() {
    let items = shuffle(q.items.map((t, i) => ({ t, i })));
    const list = el('div.orderq');

    const paint = () => {
      list.replaceChildren(...items.map((it, k) => el('div.orderq__item', [
        el('b', String(k + 1)),
        el('span', { style: { flex: 1 } }, inline(it.t)),
        !finished && el('div.orderq__btns', [
          el('button', { 'aria-label': 'Move up', disabled: k === 0, onclick: () => { [items[k - 1], items[k]] = [items[k], items[k - 1]]; paint(); } }, '▲'),
          el('button', { 'aria-label': 'Move down', disabled: k === items.length - 1, onclick: () => { [items[k + 1], items[k]] = [items[k], items[k + 1]]; paint(); } }, '▼')
        ]),
        finished && el('span.quiz-option__mark', {
          class: 'quiz-option__mark ' + (it.i === k ? 'up' : 'down')
        }, it.i === k ? '✓' : `✗ should be ${it.i + 1}`)
      ])));
    };
    paint();

    const submit = el('button.btn.btn--primary', {
      style: { marginTop: 'var(--s4)' },
      onclick: () => {
        if (finished) return;
        finished = true;
        const ok = items.every((it, k) => it.i === k);
        submit.disabled = true;
        paint();
        explain(ok, ok ? null : 'The numbered order above shows where each step actually belongs.');
        onDone(ok, q);
      }
    }, 'Check the order');

    body.append(list, submit);
  }

  /* ── shared feedback ───────────────────────────────────── */
  function explain(ok, extra) {
    feedback.replaceChildren(el('div', { class: 'explain ' + (ok ? 'explain--ok' : 'explain--no') }, [
      el('span.explain__l', ok ? '✓ Correct' : '✗ Incorrect'),
      extra && el('p', { style: { marginBottom: 'var(--s2)', color: 'var(--paper)' } }, extra),
      el('div', inline(q.explain))
    ]));
    announce((ok ? 'Correct. ' : 'Incorrect. ') + q.explain);
  }

  function flash(node, ok) {
    if (prefersReducedMotion()) return;
    node.classList.add(ok ? 'flash-bull' : 'flash-bear');
    setTimeout(() => node.classList.remove('flash-bull', 'flash-bear'), 200);
  }
}

/**
 * A run of questions with a progress strip and a results card.
 * @param {Array}  qs
 * @param {object} opts { passMark, onFinish(score, wrongTags), title }
 */
export function runQuiz(qs, opts = {}) {
  const { passMark = 0.7, onFinish = () => {} } = opts;
  const wrap = el('div');
  const dots = el('div.quiz__dots');
  const host = el('div');
  const results = [];
  let i = 0;

  wrap.append(el('div.quiz__prog', [
    el('span.kicker', 'Question'),
    el('span.num', { style: { fontSize: 'var(--t-xs)' } }, `1 / ${qs.length}`),
    dots
  ]), host);

  paintDots();
  show();

  function paintDots() {
    dots.replaceChildren(...qs.map((_, k) => el('i', {
      class: results[k] === true ? 'ok' : results[k] === false ? 'no' : k === i ? 'now' : ''
    })));
    wrap.querySelector('.quiz__prog .num').textContent = `${Math.min(i + 1, qs.length)} / ${qs.length}`;
  }

  function show() {
    const q = qs[i];
    const node = question(q, {
      mode: 'exam',
      onDone: ok => {
        results[i] = ok;
        paintDots();
        node.append(el('button.btn.btn--primary', {
          style: { marginTop: 'var(--s5)' },
          onclick: () => { i++; paintDots(); i < qs.length ? show() : finish(); }
        }, i < qs.length - 1 ? 'Next question →' : 'See your result'));
      }
    });
    host.replaceChildren(node);
  }

  function finish() {
    const right = results.filter(Boolean).length;
    const score = right / qs.length;
    const pass = score >= passMark;

    // which tags did they get wrong most?
    const tally = {};
    qs.forEach((q, k) => {
      if (results[k]) return;
      for (const t of (q.tags || [])) tally[t] = (tally[t] || 0) + 1;
    });
    const weak = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 2);

    const card = el('div.quiz__result', [
      el('div.quiz__score', { class: 'quiz__score ' + (pass ? 'up' : 'down') }, `${right}/${qs.length}`),
      el('div.quiz__verdict', { class: 'quiz__verdict ' + (pass ? 'up' : 'down') },
        pass ? `Passed — ${Math.round(score * 100)}%` : `Not passed — ${Math.round(score * 100)}% (need ${Math.round(passMark * 100)}%)`)
    ]);

    if (weak.length) {
      card.append(el('div.weak', [
        el('span.kicker', { style: { textAlign: 'left' } }, 'Weakest areas — go back to these'),
        ...weak.map(([tag, n]) => {
          const q = qs.find(x => (x.tags || []).includes(tag) && results[qs.indexOf(x)] === false);
          const lessonId = q?.lesson;
          const href = lessonId ? (() => { const [m, l] = String(lessonId).split('.'); return `#/m/${+m}/l/${+l}`; })() : '#/';
          return el('a', { href }, [
            el('span', { style: { color: 'var(--paper)' } }, tagLabel(tag)),
            el('span', `${n} wrong${lessonId ? ` · lesson ${lessonId} →` : ''}`)
          ]);
        })
      ]));
    }

    host.replaceChildren(card);
    onFinish(score, weak.map(w => w[0]), card);
  }

  return wrap;
}

const TAG_LABELS = {
  'rules-2026': 'The 2026 rule changes',
  cgt: 'Capital gains tax',
  tax: 'Tax',
  costs: 'Trading costs',
  commission: 'Broker commission',
  orders: 'Placing orders',
  circuit: 'Circuit limits and bands',
  settlement: 'Settlement and T+2',
  edis: 'EDIS',
  candles: 'Candlestick reading',
  context: 'Pattern context',
  ipo: 'The primary market',
  allotment: 'IPO allotment',
  banks: 'Reading banks',
  pe: 'P/E ratio',
  roe: 'Return on equity',
  eps: 'EPS and bonus adjustment',
  risk: 'Risk management',
  sizing: 'Position sizing',
  psychology: 'Psychology',
  scams: 'Scams and pumps',
  liquidity: 'Liquidity',
  spread: 'Bid-ask spread',
  'market-structure': 'How NEPSE works',
  hydropower: 'Hydropower',
  wacc: 'WACC and cost basis'
};
export const tagLabel = t => TAG_LABELS[t] || t.replace(/-/g, ' ');
