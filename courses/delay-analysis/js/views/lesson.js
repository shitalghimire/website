/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — lesson view
   ═══════════════════════════════════════════════════════════════ */

import { el, stagger, say } from '../dom.js';
import { setGlossary } from '../markup.js';
import { renderBlock } from '../blocks.js';
import { inlineChecks } from '../quiz.js';
import * as store from '../store.js';
import { ctx } from '../app.js';

export function lesson(modN, idx) {
  const mods = ctx.course.modules;
  const m = mods.find(x => x.n === modN);
  if (!m) return notFound();
  const meta = m.lessons.find(l => l.i === idx);
  if (!meta) return notFound();

  setGlossary(ctx.glossary);

  const content = ctx.content.lessons[meta.id];
  const bank = ctx.bank;
  const teardowns = [];

  const wrap = el('div');
  wrap.append(el('p', { style: { marginBottom: 'var(--s5)' } },
    el('a.kicker', { href: `#/m/${modN}` },
      `← Module ${String(modN).padStart(2, '0')} · ${m.t}`)));

  const left = el('aside');
  const right = el('div');
  wrap.append(el('div.split', [left, right]));

  /* ── contents rail ────────────────────────────────────────── */
  left.append(el('div.side', el('div.side__box', [
    el('div.side__head', `Module ${String(modN).padStart(2, '0')}`),
    el('div.side__list', m.lessons.map(l => el('a', {
      href: `#/m/${modN}/l/${l.i}`,
      class: store.lessonDone(l.id) ? 'is-done' : '',
      aria: { current: l.id === meta.id ? 'page' : null }
    }, [
      el('em', l.id),
      el('span', l.t),
      el('em', store.lessonDone(l.id) ? '✓' : l.min + 'm')
    ])))
  ])));

  /* ── head ─────────────────────────────────────────────────── */
  right.append(el('div', [
    el('div.lesson__id', { aria: { hidden: 'true' } }, meta.id),
    el('h1.lesson__title', meta.t),
    el('div.lesson__meta', [
      el('span.pill', `${meta.min} min`),
      meta.src && el('span.pill', meta.src),
      store.lessonDone(meta.id) && el('span.pill.pill--slack', '✓ completed')
    ].filter(Boolean))
  ]));

  /* ── blocks ───────────────────────────────────────────────── */
  if (!content) {
    right.append(el('div.callout.callout--warn', [
      el('span.callout__l', 'Not written yet'),
      el('p', `Lesson ${meta.id} — “${meta.t}” — has a place on the programme but no content file.`)
    ]));
  } else {
    let checksSeen = 0, allRight = true;
    const deps = {
      checks: ids => inlineChecks(ids, bank, ok => { checksSeen++; if (!ok) allRight = false; }),
      onTeardown: fn => teardowns.push(fn)
    };
    const body = el('div');
    for (const b of content.blocks) {
      try { body.append(renderBlock(b, deps)); }
      catch (err) {
        console.error('block', b.type, err);
        body.append(el('div.callout.callout--warn', el('p', `A “${b.type}” block could not be rendered.`)));
      }
    }
    right.append(body);
    stagger(body, 8);
  }

  /* ── complete + navigate ──────────────────────────────────── */
  const prev = m.lessons.find(l => l.i === idx - 1);
  const next = m.lessons.find(l => l.i === idx + 1);
  const nextMod = mods.find(x => x.n === modN + 1);

  const goNext = next
    ? el('a.btn', { href: `#/m/${modN}/l/${next.i}` }, `Next · ${next.id} →`)
    : m.quiz
      ? el('a.btn', { href: `#/quiz/${modN}` }, `Module ${modN} quiz →`)
      : nextMod
        ? el('a.btn', { href: `#/m/${nextMod.n}` }, `Module ${nextMod.n} →`)
        : el('a.btn', { href: '#/' }, 'Back to the programme');

  const doneStrip = el('div.done', { style: { marginTop: 'var(--s7)' } });
  function paintDone() {
    const isDone = store.lessonDone(meta.id);
    doneStrip.replaceChildren(
      el('p', isDone
        ? 'Marked complete. Untick it any time from here if you want to come back to it.'
        : 'Mark this complete when you are happy you could explain it to somebody else.'),
      isDone
        ? el('button.btn.btn--sm', {
            type: 'button',
            onclick: () => { store.uncompleteLesson(meta.id); paintDone(); }
          }, 'Un-mark')
        : el('button.btn.btn--primary', {
            type: 'button',
            onclick: () => {
              store.completeLesson(meta.id);
              say(`Lesson ${meta.id} complete.`);
              paintDone();
              goNext.classList.add('btn--primary');
            }
          }, '✓ Mark complete')
    );
  }
  paintDone();
  right.append(doneStrip);

  right.append(el('div.lnav', [
    prev
      ? el('a.btn', { href: `#/m/${modN}/l/${prev.i}` }, `← ${prev.id}`)
      : el('a.btn', { href: `#/m/${modN}` }, '← Module'),
    el('div.lnav__r', [goNext])
  ]));

  return {
    node: wrap,
    teardown: () => teardowns.forEach(fn => { try { fn(); } catch { /* ignore */ } })
  };
}

function notFound() {
  return el('div.msg', [
    el('h2', 'No such lesson'),
    el('p', 'That lesson number does not exist in this module.'),
    el('a.btn', { href: '#/' }, 'Back to the programme')
  ]);
}
