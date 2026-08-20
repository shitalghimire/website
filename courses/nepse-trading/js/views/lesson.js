/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — lesson view
   Seven blocks, a sticky nav, and the candle that prints when you finish.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import * as data from '../data.js';
import { el, frag, num, deva2, stagger, announce } from '../util.js';
import { renderBlock, setGlossary } from '../render.js';
import { WIDGETS } from '../widgets.js';
import { question } from '../quiz.js';

export async function lesson(modN, lessonIdx) {
  const { modules: M } = ctx;
  const mod = M.modules.find(m => m.n === modN);
  if (!mod) return notFound();

  const meta = mod.lessons.find(l => l.index === lessonIdx);
  if (!meta) return notFound();

  setGlossary(ctx.glossary);

  let content = null;
  try {
    const file = await data.lessonsFor(modN);
    content = file.lessons.find(l => l.id === meta.id) || null;
  } catch (err) {
    console.warn('lesson file missing for module', modN, err);
  }

  const bank = await data.quizBank().catch(() => ({ questions: [] }));
  const byId = new Map((bank.questions || []).map(q => [q.id, q]));

  const started = performance.now();
  let perfectCheck = true;
  let checksSeen = 0;

  const wrap = el('div.lesson');

  wrap.append(el('div.row', { style: { marginBottom: 'var(--s5)' } }, [
    el('a.kicker', { href: `#/m/${modN}` }, `← Module ${String(modN).padStart(2, '0')} · ${mod.title}`)
  ]));

  const left = el('div');
  const right = el('div');
  wrap.append(el('div.split', [left, right]));

  /* ── left: sticky lesson nav ──────────────────────────── */
  const nav = el('div.lesson__nav', [
    el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'This module'),
    el('div.lessons', mod.lessons.map(l => el('a', {
      class: 'lrow' + (state.lessonDone(l.id) ? ' lrow--done' : ''),
      href: `#/m/${modN}/l/${l.index}`,
      style: l.id === meta.id ? { background: 'var(--ink-750)', borderLeft: '2px solid var(--signal)' } : {},
      'aria-current': l.id === meta.id ? 'page' : null
    }, [
      el('span.lrow__n', l.id),
      el('span.lrow__t', l.title),
      state.lessonDone(l.id) ? el('span.lrow__tick', '✓') : el('span.lrow__m', `${l.minutes}m`)
    ])))
  ]);
  left.append(nav);

  /* ── right: the lesson itself ─────────────────────────── */
  right.append(el('div', [
    el('div.lesson__num.num', { 'aria-hidden': 'true' }, meta.id),
    el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, [
      el('span.deva', { lang: 'ne' }, deva2(mod.n)), ' / LESSON ', meta.id
    ]),
    el('h1.lesson__title', meta.title),
    el('div.lesson__meta', [
      el('span.pill', `${meta.minutes} min`),
      el('span.pill.pill--signal', `${meta.xp} XP`),
      state.lessonDone(meta.id) && el('span.pill.pill--bull', '✓ completed')
    ])
  ]));

  if (!content) {
    right.append(el('div.callout.callout--warn', [
      el('span.callout__l', 'This lesson is not written yet'),
      el('p', `Lesson ${meta.id} — "${meta.title}" — has a place in the curriculum but no content file yet.`)
    ]));
  } else {
    const deps = {
      widgets: WIDGETS,
      fees: ctx.fees,
      rules: ctx.rules,
      quizInline: qids => inlineCheck(qids, byId, ok => { checksSeen++; if (!ok) perfectCheck = false; })
    };
    const blocks = el('div');
    for (const b of content.blocks) {
      try { blocks.append(renderBlock(b, deps)); }
      catch (err) {
        console.error('block', b.type, err);
        blocks.append(el('div.callout.callout--danger', el('p', `A "${b.type}" block could not be rendered.`)));
      }
    }
    right.append(blocks);
    stagger(blocks);
  }

  /* ── complete + navigate ──────────────────────────────── */
  const prev = mod.lessons.find(l => l.index === lessonIdx - 1);
  const next = mod.lessons.find(l => l.index === lessonIdx + 1);
  const nextMod = M.modules.find(m => m.n === modN + 1);

  const doneBtn = el('button.btn.btn--primary', {
    onclick: () => {
      const secs = Math.round(performance.now() - started);
      const first = state.completeLesson(meta.id, secs, checksSeen > 0 && perfectCheck);
      announce(first
        ? `Lesson ${meta.id} complete. ${meta.xp} XP earned. A green candle just printed on your equity curve.`
        : 'Lesson already completed.');
      doneBtn.replaceWith(el('span.pill.pill--bull', { style: { padding: 'var(--s3) var(--s5)' } },
        first ? `✓ +${meta.xp} XP — candle printed` : '✓ Completed'));
      goNext.classList.add('btn--primary');
    }
  }, state.lessonDone(meta.id) ? '✓ Completed' : `Mark complete · +${meta.xp} XP`);

  const goNext = next
    ? el('a.btn', { href: `#/m/${modN}/l/${next.index}` }, `Next: ${next.id} →`)
    : nextMod
      ? el('a.btn', { href: `#/quiz/m${modN}` }, `Module ${modN} quiz →`)
      : el('a.btn', { href: `#/m/${modN}` }, 'Back to module');

  right.append(el('div.lnav', [
    prev ? el('a.btn', { href: `#/m/${modN}/l/${prev.index}` }, `← ${prev.id}`) : el('a.btn', { href: `#/m/${modN}` }, '← Module'),
    el('div.row', [state.lessonDone(meta.id) ? el('span.pill.pill--bull', { style: { padding: 'var(--s3) var(--s5)' } }, '✓ Completed') : doneBtn, goNext])
  ]));

  return wrap;
}

/** ⑥ Check — two or three inline questions with immediate feedback. */
function inlineCheck(qids, byId, onAnswer) {
  const qs = qids.map(id => byId.get(id)).filter(Boolean);
  if (!qs.length) {
    return el('div.callout.callout--info', el('p', 'No check questions are attached to this lesson yet.'));
  }
  const host = el('div', { style: { display: 'grid', gap: 'var(--s5)' } });
  qs.forEach((q, i) => {
    host.append(el('div.panel', { style: { background: 'var(--ink-850)' } }, [
      el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, `Check ${i + 1} of ${qs.length}`),
      question(q, { mode: 'inline', onDone: ok => onAnswer(ok) })
    ]));
  });
  return host;
}

function notFound() {
  return el('div.msg', [
    el('h2', 'No such lesson'),
    el('p', 'That lesson number does not exist in this module.'),
    el('p', el('a.btn', { href: '#/' }, 'Back to the dashboard'))
  ]);
}
