/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — module quiz
   ═══════════════════════════════════════════════════════════════ */

import { el, pct, shuffle, rng, say } from '../dom.js';
import { setGlossary } from '../markup.js';
import { question } from '../quiz.js';
import * as store from '../store.js';
import { ctx } from '../app.js';

export function quiz(modN) {
  const m = ctx.course.modules.find(x => x.n === modN);
  if (!m || !m.quiz) return missing(modN);

  setGlossary(ctx.glossary);

  const ids = m.quiz.q || [];
  const qs = ids.map(id => ctx.bank.get(id)).filter(Boolean);
  if (!qs.length) return missing(modN);

  const key = 'm' + modN;
  const prev = store.quizFor(key);

  let i = 0, right = 0;
  const answered = new Array(qs.length).fill(null);

  const wrap = el('div.wrap--n');
  wrap.append(el('p', { style: { marginBottom: 'var(--s5)' } },
    el('a.kicker', { href: `#/m/${modN}` }, `← Module ${String(modN).padStart(2, '0')} · ${m.t}`)));

  wrap.append(el('header', { style: { marginBottom: 'var(--s6)' } }, [
    el('span.kicker.kicker--b', `Module ${modN} quiz`),
    el('h1', m.t),
    el('p.dim', {
      style: { marginTop: 'var(--s3)', fontSize: 'var(--t-sm)' }
    }, `${qs.length} questions. Pass mark 70%.${prev ? ` Your best so far is ${pct(prev.best, 0)} across ${prev.tries} attempt${prev.tries > 1 ? 's' : ''}.` : ''}`)
  ]));

  const dots = el('div.quiz__dots', qs.map(() => el('span.quiz__dot')));
  const bar = el('div.quiz__bar', [
    el('span.kicker', 'Progress'), dots,
    el('span.ctl__sp'),
    el('span.kicker', { id: 'qcount' }, `1 / ${qs.length}`)
  ]);
  wrap.append(bar);

  const stage = el('div');
  wrap.append(stage);

  function paintDots() {
    [...dots.children].forEach((d, k) => {
      d.className = 'quiz__dot' +
        (answered[k] === true ? ' quiz__dot--ok' : answered[k] === false ? ' quiz__dot--no' : '') +
        (k === i && answered[k] === null ? ' quiz__dot--now' : '');
    });
    wrap.querySelector('#qcount').textContent = `${Math.min(i + 1, qs.length)} / ${qs.length}`;
  }

  function ask() {
    paintDots();
    const q = qs[i];
    const card = question(q, {
      index: i + 1, total: qs.length,
      onDone: ok => {
        answered[i] = ok;
        if (ok) right++;
        paintDots();
        card.append(el('div', { style: { marginTop: 'var(--s4)' } },
          el('button.btn.btn--primary', {
            type: 'button',
            onclick: () => { i++; i < qs.length ? ask() : finish(); }
          }, i + 1 < qs.length ? 'Next question →' : 'See your result →')));
      }
    });
    stage.replaceChildren(card);
  }

  function finish() {
    const score = right / qs.length;
    const { passed } = store.recordQuiz(key, score);
    say(`${right} of ${qs.length} correct. ${passed ? 'Passed.' : 'Not passed.'}`);

    const wrong = qs.filter((_, k) => answered[k] === false);

    stage.replaceChildren(
      el('div', { class: 'score ' + (passed ? 'score--pass' : 'score--fail') }, [
        el('div', [el('b', pct(score, 0)), el('span', 'Score')]),
        el('div', [el('b', `${right}/${qs.length}`), el('span', 'Correct')]),
        el('div', [el('b', passed ? 'Pass' : 'Retake'), el('span', 'Result')])
      ]),
      el('div.callout', { class: passed ? 'callout--site' : 'callout--warn' }, [
        el('span.callout__l', passed ? 'Module cleared' : 'Not yet'),
        el('p', passed
          ? 'Good. The explanations under each answer are worth a second read even when you got them right — most of them contain the part that gets argued about in practice.'
          : `You need 70% to clear this module. Nothing is locked, so you can retake it straight away — but the questions you missed point at ${wrong.length === 1 ? 'a lesson' : 'lessons'} worth re-reading first.`)
      ]),
      wrong.length ? el('div', { style: { marginTop: 'var(--s5)' } }, [
        el('span.kicker.kicker--b', 'Worth revisiting'),
        el('div.lessons', wrong.map(q => {
          const l = q.lesson ? m.lessons.find(x => x.id === q.lesson) : null;
          return el('a.lrow', { href: l ? `#/m/${modN}/l/${l.i}` : `#/m/${modN}` }, [
            el('span.lrow__n', q.lesson || '—'),
            el('span.lrow__t', l ? l.t : q.stem.slice(0, 80)),
            el('span.lrow__m', 'open →')
          ]);
        }))
      ]) : null,
      el('div.lnav', [
        el('a.btn', { href: `#/m/${modN}` }, '← Module'),
        el('div.lnav__r', [
          el('button.btn', {
            type: 'button',
            onclick: () => { i = 0; right = 0; answered.fill(null); ask(); }
          }, '↺ Retake'),
          nextTarget(modN)
        ])
      ])
    );
  }

  ask();
  return wrap;
}

function nextTarget(modN) {
  const mods = ctx.course.modules;
  const nm = mods.find(x => x.n === modN + 1);
  if (nm) return el('a.btn.btn--primary', { href: `#/m/${nm.n}` }, `Module ${nm.n} →`);
  return el('a.btn.btn--primary', { href: '#/certificate' }, 'Certificate →');
}

function missing(n) {
  return el('div.msg', [
    el('h2', 'No quiz here'),
    el('p', `Module ${n} does not have a quiz attached.`),
    el('a.btn', { href: '#/' }, 'Back to the programme')
  ]);
}
