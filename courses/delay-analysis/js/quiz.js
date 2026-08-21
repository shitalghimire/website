/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — questions

   Every question carries a "why", shown whichever way it is
   answered. Getting it right and not knowing why is the failure
   mode this course exists to prevent.
   ═══════════════════════════════════════════════════════════════ */

import { el, shuffle, rng, say } from './dom.js';
import { inline, md } from './markup.js';
import * as store from './store.js';

const KEYS = 'ABCDEF';

/**
 * @param {Object} q  { id, stem, opts: [], answer: index, why, whyWrong: {} }
 * @param {Object} o  { mode: 'inline'|'quiz', onDone(correct), index, total }
 */
export function question(q, o = {}) {
  const host = el('div.q');
  let done = false;

  // options are shuffled per question but deterministically, so a learner
  // returning to a lesson sees the same layout rather than a reshuffle
  const seed = [...String(q.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const order = shuffle(q.opts.map((t, i) => ({ t, i })), rng(seed));
  const answerAt = order.findIndex(x => x.i === q.answer);

  if (o.index) {
    host.append(el('span.q__n', `Question ${o.index}${o.total ? ' of ' + o.total : ''}`));
  } else if (o.mode === 'inline') {
    host.append(el('span.q__n', o.label || 'Check'));
  }

  host.append(el('div.q__stem', inline(q.stem)));

  const why = el('div.q__why', { hidden: true });
  const btns = order.map((opt, k) => el('button.opt', {
    type: 'button',
    onclick: () => pick(k)
  }, [el('span.opt__k', KEYS[k]), el('span', inline(opt.t))]));

  host.append(el('div.q__opts', btns), why);

  function pick(k) {
    if (done) return;
    done = true;
    const right = k === answerAt;

    btns.forEach((b, i) => {
      b.disabled = true;
      if (i === answerAt) b.classList.add('opt--right');
      else if (i === k) b.classList.add('opt--wrong');
      else b.classList.add('opt--muted');
    });

    const chosen = order[k];
    const extra = !right && q.whyWrong && q.whyWrong[chosen.i];

    why.hidden = false;
    why.replaceChildren(
      el('span', { class: 'q__verdict ' + (right ? 'q__verdict--ok' : 'q__verdict--no') },
        right ? '✓ Correct' : '✗ Not quite'),
      extra ? el('p', { style: { marginBottom: 'var(--s3)' } }, inline(extra)) : null,
      el('div', md(q.why))
    );

    if (o.mode === 'inline') store.recordCheck(q.id, right);
    say(right ? 'Correct.' : 'Not quite.');
    o.onDone?.(right, q);
  }

  return host;
}

/** The ⑥ block: two or three questions inline in a lesson. */
export function inlineChecks(ids, bank, onAnswer) {
  const qs = ids.map(id => bank.get(id)).filter(Boolean);
  if (!qs.length) {
    return el('div.callout', el('p', 'No check questions are attached to this lesson yet.'));
  }
  const host = el('div', { style: { display: 'grid', gap: 'var(--s4)' } });
  qs.forEach((q, i) => {
    host.append(question(q, {
      mode: 'inline',
      label: `Check ${i + 1} of ${qs.length}`,
      onDone: ok => onAnswer?.(ok)
    }));
  });
  return host;
}
