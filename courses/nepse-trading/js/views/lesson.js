/* ═══════════════════════════════════════════════════════════════
   NEPSE TRADING ACADEMY — lesson view
   Reading column on the left, module navigator on the right, and the
   finish card that prints a candle on the equity curve.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import * as data from '../data.js';
import { el, pctPlain, stagger, announce } from '../util.js';
import { icon } from '../icons.js';
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

  const lv = M.levels.find(l => l.n === mod.level);
  const mm = String(modN).padStart(2, '0');
  const wrap = el('div.lesson', { style: { '--lv': `var(--lv-${mod.level})` } });

  wrap.append(el('nav.crumbs', { 'aria-label': 'Breadcrumb' }, [
    el('a', { href: '#/' }, 'Dashboard'), icon('chevronRight'),
    el('a', { href: `#/m/${modN}` }, `Module ${mm}`), icon('chevronRight'),
    el('span', `Lesson ${meta.id}`)
  ]));

  const main = el('article.lmain');
  const aside = el('aside.laside');
  wrap.append(el('div.lwrap', [main, aside]));

  /* ── header ───────────────────────────────────────────── */
  const doneAtLoad = state.lessonDone(meta.id);
  main.append(el('header.lhead', [
    el('div.lhead__chips', [
      el('span.pill.pill--signal', `Lesson ${meta.id}`),
      el('span.pill', [icon('clock', 13), `${meta.minutes} min read`]),
      el('span.pill', [icon('zap', 13), `${meta.xp} XP`]),
      doneAtLoad && el('span.pill.pill--bull', [icon('check', 13), 'Completed'])
    ]),
    el('h1', meta.title),
    el('div.lhead__mod', [el('i'), `Level ${lv.roman} · ${mod.title}`])
  ]));

  /* ── blocks ───────────────────────────────────────────── */
  if (!content) {
    main.append(el('div.callout.callout--warn', { style: { marginTop: '32px' } }, [
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
    main.append(blocks);
    stagger(blocks);
  }

  /* ── finish card ──────────────────────────────────────── */
  const prev = mod.lessons.find(l => l.index === lessonIdx - 1);
  const next = mod.lessons.find(l => l.index === lessonIdx + 1);
  const nextMod = M.modules.find(m => m.n === modN + 1);

  const nextHref = next ? `#/m/${modN}/l/${next.index}` : `#/quiz/m${modN}`;
  const nextLabel = next ? `Next: lesson ${next.id}` : `Module ${modN} quiz`;

  const finish = el('section.lfinish');
  const paintFinish = (justDone) => {
    const done = state.lessonDone(meta.id);
    finish.classList.toggle('is-done', done);
    finish.replaceChildren(
      el('div.lfinish__txt', [
        el('span.tile.tile--lg', icon(done ? 'checkCircle' : 'target', 24)),
        el('div', done
          ? [el('b', justDone ? `+${meta.xp} XP — a green candle just printed` : 'Lesson complete'),
             el('small', next ? `Keep the momentum: ${next.title}` : 'That was the last lesson in this module. Test yourself on the quiz.')]
          : [el('b', 'Finished reading?'),
             el('small', `Mark it complete to earn ${meta.xp} XP and print a green candle on your equity curve.`)])
      ]),
      el('div.row', done
        ? [el('a.btn.btn--lime', { href: nextHref }, [nextLabel, icon('arrowRight', 17)])]
        : [
          el('button.btn.btn--lime', {
            type: 'button',
            onclick: () => {
              const secs = Math.round(performance.now() - started);
              const first = state.completeLesson(meta.id, secs, checksSeen > 0 && perfectCheck);
              announce(first
                ? `Lesson ${meta.id} complete. ${meta.xp} XP earned. A green candle just printed on your equity curve.`
                : 'Lesson already completed.');
              paintFinish(first);
              paintNav();
            }
          }, [icon('check', 17), `Mark complete · +${meta.xp} XP`]),
          el('a.btn.btn--glass', { href: nextHref }, 'Skip for now')
        ])
    );
  };
  paintFinish(false);
  main.append(finish);

  main.append(el('nav.pager', { 'aria-label': 'Lessons' }, [
    prev
      ? el('a', { href: `#/m/${modN}/l/${prev.index}` }, [el('small', [icon('arrowLeft', 14), `Lesson ${prev.id}`]), el('b', prev.title)])
      : el('a', { href: `#/m/${modN}` }, [el('small', [icon('arrowLeft', 14), 'Overview']), el('b', `Module ${mm} · ${mod.title}`)]),
    next
      ? el('a.pager__next', { href: `#/m/${modN}/l/${next.index}` }, [el('small', [icon('arrowRight', 14), `Lesson ${next.id}`]), el('b', next.title)])
      : el('a.pager__next', { href: `#/quiz/m${modN}` }, [el('small', [icon('arrowRight', 14), 'Test yourself']),
          el('b', nextMod ? `Module ${modN} quiz` : 'Final module quiz')])
  ]));

  /* ── module navigator ─────────────────────────────────── */
  const navCard = el('div.panel.lnavcard');
  aside.append(navCard);
  const paintNav = () => {
    const p = state.moduleProgress(mod);
    navCard.replaceChildren(
      el('div.lnavcard__head', [
        el('span.kicker', [el('i'), `Module ${mm}`]),
        el('b', mod.title),
        el('div.lnavcard__prog', [
          el('div.bar', el('i', { style: { width: pctPlain(p.pct, 1) } })),
          el('span.num', `${p.done}/${p.total}`)
        ])
      ]),
      el('div.lnavlist', mod.lessons.map(l => {
        const done = state.lessonDone(l.id);
        return el('a', {
          class: done ? 'is-done' : '',
          href: `#/m/${modN}/l/${l.index}`,
          'aria-current': l.id === meta.id ? 'page' : null
        }, [
          el('span.lnavlist__st.num', done ? icon('check', 12) : String(l.index)),
          el('span', l.title),
          el('span.lnavlist__m', `${l.minutes}m`)
        ]);
      })),
      el('div.lnavcard__foot', el('a.btn.btn--sm.btn--block', { href: `#/quiz/m${modN}` }, [icon('help', 15), `Module ${modN} quiz`]))
    );
  };
  paintNav();

  return wrap;
}

/** ⑥ Check — two or three inline questions with immediate feedback. */
function inlineCheck(qids, byId, onAnswer) {
  const qs = qids.map(id => byId.get(id)).filter(Boolean);
  if (!qs.length) {
    return el('div.callout.callout--info', el('p', 'No check questions are attached to this lesson yet.'));
  }
  return el('div.checks', qs.map((q, i) => el('div.panel.checkcard', [
    el('span.kicker', `Question ${i + 1} of ${qs.length}`),
    question(q, { mode: 'inline', onDone: ok => onAnswer(ok) })
  ])));
}

function notFound() {
  return el('div.msg', [
    el('h2', 'No such lesson'),
    el('p', 'That lesson number does not exist in this module.'),
    el('p', el('a.btn', { href: '#/' }, 'Back to the dashboard'))
  ]);
}
