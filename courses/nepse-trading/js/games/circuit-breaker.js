/* ═══════════════════════════════════════════════════════════════
   CIRCUIT BREAKER — rapid rules quiz
   Sixty seconds. ← false, → true. Three wrong ends the run.
   Ten correct in a row triggers a CIRCUIT BREAKER: the screen halts
   for 1.5 seconds — a knowing joke that also teaches the real rule.
   ═══════════════════════════════════════════════════════════════ */

import { el, shuffle, num, announce, prefersReducedMotion } from '../util.js';
import { statements as loadStatements } from '../data.js';

const DURATION = 60;
const LIVES = 3;
const STREAK_FOR_HALT = 10;

let cleanup = null;

export default {
  id: 'circuit-breaker',
  title: 'Circuit Breaker',
  blurb: 'Sixty seconds. True or false. Three wrong and you are out.',
  unlockedByModule: 2,
  modes: ['timed'],

  mount(container, ctx) {
    let pool = [];
    let idx = 0, score = 0, streak = 0, best = 0, lives = LIVES;
    let answered = 0, correct = 0;
    let timeLeft = DURATION, running = false, halted = false;
    let multiplier = 1;
    let raf = null, last = 0;
    const wrongOnes = [];

    const hud = el('div.hud');
    const rail = el('div.timerail', el('i'));
    const stmtBox = el('div.cb__stmt');
    const explainBox = el('div');
    const wrapRel = el('div.cb__wrap');

    const btnFalse = el('button.btn.btn--bear', { onclick: () => answer(false) },
      ['✗ FALSE ', el('span.kbd', '←')]);
    const btnTrue = el('button.btn.btn--bull', { onclick: () => answer(true) },
      ['✓ TRUE ', el('span.kbd', '→')]);
    const tf = el('div.cb__tf', [btnFalse, btnTrue]);

    const startBtn = el('button.btn.btn--primary', { onclick: start, disabled: true, style: { width: '100%' } },
      'Start — 60 seconds');

    const body = el('div.cb', [hud, rail, wrapRel, tf, explainBox,
      el('div.keys', [
        el('span', [el('b', 'Keys: '), el('span.kbd', '←'), ' false · ', el('span.kbd', '→'), ' true · ',
          el('span.kbd', 'Esc'), ' exit'])
      ])
    ]);
    wrapRel.append(stmtBox);

    container.replaceChildren(
      el('div.callout.callout--info', { style: { marginBottom: 'var(--s5)' } }, [
        el('span.callout__l', 'How it works'),
        el('p', 'Statements about NEPSE rules fly past. Three wrong ends the run. Ten right in a row halts the ' +
                'market for fifteen minutes and doubles your multiplier — which is a joke, and also the actual rule.')
      ]),
      body, startBtn);

    paintHud();
    stmtBox.append(el('p.dim', 'Press start. The pool is weighted toward the things people get wrong.'));
    tf.style.display = 'none';

    /* ── flow ─────────────────────────────────────────────── */

    let POOL = [];
    loadStatements()
      .then(d => {
        POOL = d.statements;
        startBtn.disabled = false;
        stmtBox.replaceChildren(el('p.dim', `${POOL.length} statements loaded. Press start.`));
      })
      .catch(() => stmtBox.replaceChildren(el('p.dim', 'The statement pool could not load.')));

    function start() {
      if (!POOL.length) return;
      pool = shuffle(POOL);
      idx = 0; score = 0; streak = 0; best = 0; lives = LIVES;
      answered = 0; correct = 0; timeLeft = DURATION; multiplier = 1;
      wrongOnes.length = 0;
      running = true; halted = false;
      startBtn.style.display = 'none';
      tf.style.display = '';
      explainBox.replaceChildren();
      next();
      last = performance.now();
      raf = requestAnimationFrame(tick);
      announce('Started. Sixty seconds.');
    }

    function tick(now) {
      if (!running) return;
      const dt = (now - last) / 1000;
      last = now;
      if (!halted) {
        timeLeft = Math.max(0, timeLeft - dt);
        const pctLeft = timeLeft / DURATION;
        rail.firstChild.style.width = (pctLeft * 100) + '%';
        rail.classList.toggle('low', timeLeft <= 10);
        paintHud();
        if (timeLeft <= 0) return end('Time');
      }
      raf = requestAnimationFrame(tick);
    }

    function next() {
      if (idx >= pool.length) pool = shuffle(pool), idx = 0;
      const s = pool[idx];
      stmtBox.replaceChildren(el('p', s.s));
      btnTrue.disabled = btnFalse.disabled = false;
    }

    function answer(said) {
      if (!running || halted) return;
      const s = pool[idx];
      const ok = said === s.a;
      answered++;
      btnTrue.disabled = btnFalse.disabled = true;

      if (ok) {
        correct++; streak++; best = Math.max(best, streak);
        score += Math.round(100 * multiplier);
        explainBox.replaceChildren(el('div.explain.explain--ok', [
          el('span.explain__l', '✓ Correct'),
          el('div', s.why)
        ]));
        if (streak > 0 && streak % STREAK_FOR_HALT === 0) return halt();
      } else {
        lives--; streak = 0;
        wrongOnes.push(s);
        explainBox.replaceChildren(el('div.explain.explain--no', [
          el('span.explain__l', `✗ Incorrect — the answer is ${s.a ? 'TRUE' : 'FALSE'}`),
          el('div', s.why)
        ]));
        announce(`Incorrect. ${s.why}`);
        if (lives <= 0) { idx++; paintHud(); return end('Three wrong'); }
      }
      idx++;
      paintHud();
      setTimeout(() => { if (running && !halted) next(); }, ok ? 420 : 1500);
    }

    /** The knowing joke that also teaches the rule. */
    function halt() {
      halted = true;
      multiplier *= 2;
      const overlay = el('div.cb__halt', [
        el('b', 'TRADING HALTED — 15 MIN'),
        el('span', `Ten in a row. On the real exchange, a 5% index move within the first two hours halts NEPSE ` +
                   `for exactly this long. Your multiplier is now ×${multiplier}.`)
      ]);
      wrapRel.append(overlay);
      announce(`Ten in a row. Trading halted. Multiplier now ${multiplier} times.`);
      const wait = prefersReducedMotion() ? 900 : 1500;
      setTimeout(() => {
        overlay.remove();
        halted = false;
        idx++;
        paintHud();
        if (running) next();
      }, wait);
    }

    function paintHud() {
      hud.replaceChildren(
        cell('Score', num(score, 0)),
        cell('Streak', String(streak)),
        cell('Multiplier', '×' + multiplier),
        cell('Time', Math.ceil(timeLeft) + 's'),
        el('div.hud__cell', [
          el('span.hud__l', 'Lives'),
          el('div.cb__lives', { role: 'img', 'aria-label': `${lives} of ${LIVES} lives remaining` },
            Array.from({ length: LIVES }, (_, i) => el('i', { class: i < lives ? '' : 'gone' })))
        ])
      );
    }

    function cell(l, v) {
      return el('div.hud__cell', [el('span.hud__l', l), el('span.hud__v', v)]);
    }

    function end(reason) {
      running = false;
      cancelAnimationFrame(raf);
      tf.style.display = 'none';
      const accuracy = answered ? correct / answered : 0;
      const rec = ctx.onEnd({ score, accuracy, meta: { bestStreak: best, answered } });

      // the two things they got wrong most, by tag
      const tally = {};
      for (const w of wrongOnes) for (const t of (w.tags || [])) tally[t] = (tally[t] || 0) + 1;
      const weak = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 2);

      const card = el('div.result', [
        el('div.result__score', num(score, 0)),
        el('div.result__l',
          reason === 'Time' ? 'Time — run complete'
          : reason === 'Exited' ? 'Exited — progress saved'
          : 'Three wrong — run over'),
        el('div.result__grid', [
          rcell('Answered', num(answered, 0)),
          rcell('Correct', num(correct, 0)),
          rcell('Accuracy', Math.round(accuracy * 100) + '%'),
          rcell('Best streak', num(best, 0)),
          rcell('Personal best', num(rec.best, 0))
        ]),
        rec.isFirst ? el('div.result__pb', '+100 XP — first play')
          : rec.beat ? el('div.result__pb', '★ New personal best · +75 XP')
          : el('div.result__pb', '+25 XP — replay')
      ]);

      if (weak.length) {
        card.append(el('div.result__weak', [
          el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'You missed most often on'),
          el('div', { style: { display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' } },
            weak.map(([t, n]) => el('span.pill.pill--bear', `${t.replace(/-/g, ' ')} · ${n}`)))
        ]));
      }

      if (wrongOnes.length) {
        card.append(el('div', { style: { marginTop: 'var(--s5)', textAlign: 'left' } }, [
          el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'Worth rereading'),
          ...wrongOnes.slice(0, 5).map(w => el('div.explain.explain--no', { style: { marginTop: 'var(--s2)' } }, [
            el('span.explain__l', w.s),
            el('div', `${w.a ? 'TRUE' : 'FALSE'} — ${w.why}`)
          ]))
        ]));
      }

      card.append(el('div.row', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
        el('button.btn.btn--primary', { onclick: () => { explainBox.replaceChildren(); container.querySelector('.result')?.remove(); startBtn.style.display = ''; start(); } }, 'Play again'),
        el('a.btn', { href: '#/games' }, 'All games')
      ]));

      explainBox.replaceChildren();
      body.after(card);
      stmtBox.replaceChildren(el('p.dim', 'Run complete.'));
      announce(`Run over. Score ${score}. ${correct} of ${answered} correct.`);
    }

    function rcell(l, v) {
      return el('div.result__cell', [el('span.hud__l', l), el('span.hud__v', v)]);
    }

    /* ── keyboard ─────────────────────────────────────────── */
    const onKey = e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); answer(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); answer(true); }
      else if (e.key === 'Escape') { if (running) end('Exited'); }
      else if ((e.key === ' ' || e.key === 'Enter') && !running) { e.preventDefault(); start(); }
    };
    window.addEventListener('keydown', onKey);

    cleanup = () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  },

  unmount() { cleanup?.(); cleanup = null; }
};
