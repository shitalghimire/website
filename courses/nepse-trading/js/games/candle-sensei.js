/* ═══════════════════════════════════════════════════════════════
   CANDLE SENSEI — candlestick pattern trainer
   Patterns are FOUND in the shipped series by the real detectors,
   not hand-tagged. After every answer the chart continues for ten
   more candles so the learner sees what actually happened — that
   reveal is the most satisfying moment in the game, so it gets room.
   ═══════════════════════════════════════════════════════════════ */

import { el, num, shuffle, sample, announce, clamp, prefersReducedMotion } from '../util.js';
import { CandleChart } from '../chart/candles.js';
import { scan } from '../chart/patterns.js';
import { candles as loadCandles } from '../data.js';
import * as state from '../state.js';

const SYMBOLS = ['NABIL', 'NMB', 'SANIMA', 'UPPER', 'API', 'NHPC', 'CBBL', 'THIN'];
const DRILL_N = 20;
const TIMED_SECS = 90;
const PER_Q = 8;

let cleanup = null;

export default {
  id: 'candle-sensei',
  title: 'Candle Sensei',
  blurb: 'Read the candle. Beat the clock.',
  unlockedByModule: 9,
  modes: ['drill', 'timed', 'survival'],

  mount(container, ctx) {
    const patterns = ctx.data.patterns;
    let series = {};      // symbol → candles
    let found = [];       // every detected pattern across every symbol
    let mode = 'drill';

    let queue = [], qIdx = 0, score = 0, streak = 0, bestStreak = 0;
    let lives = 3, round = 0;
    let asked = 0, correct = 0;
    let timeLeft = 0, qTime = PER_Q, running = false, raf = null, last = 0;
    let current = null, answered = false;
    const missed = {};          // pattern key → count wrong
    let ctxTypeAsked = 0, ctxTypeRight = 0;

    const hud = el('div.hud');
    const rail = el('div.timerail', el('i'));
    const chartHost = el('div.cs__chart');
    const qText = el('div.cs__q');
    const optsHost = el('div');
    const reveal = el('div');
    let chart = null;

    const modeBar = el('div.tabs', ['drill', 'timed', 'survival'].map((m, i) =>
      el('button', {
        role: 'tab', 'aria-selected': String(i === 0),
        onclick: e => {
          mode = m;
          [...modeBar.children].forEach(b => b.setAttribute('aria-selected', 'false'));
          e.currentTarget.setAttribute('aria-selected', 'true');
          startBtn.textContent = startLabel();
        }
      }, m === 'drill' ? 'Drill · 20 Q' : m === 'timed' ? 'Timed · 90s' : 'Survival · 3 lives')));

    const startBtn = el('button.btn.btn--primary', { style: { width: '100%' }, disabled: true, onclick: start }, 'Loading charts…');

    const body = el('div', { style: { display: 'grid', gap: 'var(--s4)' } },
      [modeBar, hud, rail, el('div.chart', chartHost), qText, optsHost, reveal,
        el('div.keys', [el('span', [el('b', 'Keys: '), el('span.kbd', '1'), '–', el('span.kbd', '4'), ' answer · ',
          el('span.kbd', 'Enter'), ' next · ', el('span.kbd', 'Esc'), ' exit'])])]);

    container.replaceChildren(body, startBtn);
    paintHud();

    /* ── load and index every pattern in every series ─────── */
    Promise.all(SYMBOLS.map(s => loadCandles(s).then(d => [s, d]).catch(() => null)))
      .then(res => {
        for (const r of res) { if (r) series[r[0]] = r[1]; }
        for (const [sym, d] of Object.entries(series)) {
          for (const f of scan(d.candles, patterns, { minIndex: 16 })) {
            // leave room for the ten-candle continuation
            if (f.to > d.candles.length - 12) continue;
            found.push({ ...f, sym });
          }
        }
        startBtn.disabled = false;
        startBtn.textContent = startLabel();
        qText.textContent = `${found.length} patterns detected across ${Object.keys(series).length} real series.`;
      })
      .catch(() => { qText.textContent = 'Chart data could not load.'; });

    const startLabel = () => mode === 'drill' ? 'Start drill — 20 questions'
      : mode === 'timed' ? 'Start timed — 90 seconds' : 'Start survival — 3 lives';

    /* ── run control ──────────────────────────────────────── */

    function start() {
      score = 0; streak = 0; bestStreak = 0; asked = 0; correct = 0;
      lives = 3; round = 0; qIdx = 0;
      ctxTypeAsked = 0; ctxTypeRight = 0;
      for (const k of Object.keys(missed)) delete missed[k];
      container.querySelector('.result')?.remove();
      startBtn.style.display = 'none';
      running = true;

      queue = mode === 'drill' ? shuffle(found).slice(0, DRILL_N) : shuffle(found);
      timeLeft = mode === 'timed' ? TIMED_SECS : 0;
      qTime = PER_Q;
      nextQuestion();
      if (mode === 'timed') { last = performance.now(); raf = requestAnimationFrame(tick); }
      announce(`${mode} started.`);
    }

    function tick(now) {
      if (!running) return;
      const dt = (now - last) / 1000; last = now;
      timeLeft = Math.max(0, timeLeft - dt);
      if (!answered) qTime = Math.max(0, qTime - dt);
      rail.firstChild.style.width = ((mode === 'timed' ? qTime / PER_Q : 1) * 100) + '%';
      rail.classList.toggle('low', qTime <= 3);
      paintHud();
      if (timeLeft <= 0) return end('Time');
      if (qTime <= 0 && !answered) { judge(null); }
      raf = requestAnimationFrame(tick);
    }

    /* ── question types, weighted ─────────────────────────── */

    function pickType() {
      const r = Math.random();
      if (mode === 'survival' && round < 5) return 'name';
      if (r < 0.40) return 'name';
      if (r < 0.65) return 'bias';
      if (r < 0.85) return 'next';
      return 'valid';
    }

    function poolForRound() {
      if (mode !== 'survival') return queue;
      const maxCandles = round < 5 ? 1 : round < 12 ? 2 : 3;
      const pool = found.filter(f => patterns[f.key].candles <= maxCandles);
      return pool.length ? pool : found;
    }

    function nextQuestion() {
      answered = false;
      reveal.replaceChildren();
      qTime = PER_Q;

      const pool = poolForRound();
      const item = mode === 'drill' ? queue[qIdx] : sample(pool);
      if (!item) return end('Complete');
      current = { ...item, type: pickType() };

      const d = series[current.sym].candles;
      const start = Math.max(0, current.to - 39);
      const view = d.slice(start, current.to + 1);
      const hlFrom = current.from - start, hlTo = current.to - start;

      chartHost.replaceChildren();
      chart = new CandleChart(chartHost, {
        data: view, height: 300, volume: true, crosshair: false,
        highlight: { from: hlFrom, to: hlTo, label: current.type === 'name' ? '?' : '' }
      });
      chart.setData(view);

      const p = patterns[current.key];
      switch (current.type) {
        case 'name': return askName(p);
        case 'bias': return askBias(p);
        case 'next': return askNext(p);
        case 'valid': return askValid(p);
      }
    }

    function askName(p) {
      qText.textContent = 'Which pattern is highlighted?';
      const wrong = shuffle(Object.entries(patterns)
        .filter(([k, x]) => k !== current.key && x.candles === p.candles))
        .slice(0, 3).map(([k, x]) => ({ k, label: x.name }));
      // if not enough same-size patterns, widen
      while (wrong.length < 3) {
        const extra = sample(Object.entries(patterns).filter(([k]) => k !== current.key && !wrong.find(w => w.k === k)));
        if (!extra) break;
        wrong.push({ k: extra[0], label: extra[1].name });
      }
      renderOptions(shuffle([{ k: current.key, label: p.name }, ...wrong]), o => o.k === current.key);
    }

    function askBias(p) {
      qText.textContent = 'Is this pattern bullish, bearish, or indecision?';
      const truth = p.bias === 'reversal' ? (current.trend === 'down' ? 'bullish' : 'bearish') : p.bias;
      renderOptions(shuffle([
        { k: 'bullish', label: 'Bullish' },
        { k: 'bearish', label: 'Bearish' },
        { k: 'indecision', label: 'Indecision' }
      ]), o => o.k === truth, truth);
    }

    function askNext(p) {
      qText.textContent = 'This pattern points which way? Pick the candle most consistent with it.';
      const truth = p.bias === 'reversal' ? (current.trend === 'down' ? 'up' : 'down') : p.bias;
      const shapes = [
        { k: 'bullish', label: 'A strong up candle', draw: 'up' },
        { k: 'bearish', label: 'A strong down candle', draw: 'down' },
        { k: 'indecision', label: 'A small-bodied candle', draw: 'flat' }
      ];
      const host = el('div.cs__shapes');
      const btns = shuffle(shapes).map(s => {
        const cv = el('canvas', { width: 60, height: 90, 'aria-hidden': 'true' });
        const b = el('button.cs__shape', {
          'aria-label': s.label,
          onclick: () => judge(s.k === truth, { picked: s.label, truth })
        }, el('div', { style: { textAlign: 'center' } }, [
          cv, el('div', { style: { fontSize: '0.625rem', color: 'var(--paper-3)', marginTop: '6px' } }, s.label)
        ]));
        requestAnimationFrame(() => drawMini(cv, s.draw));
        return b;
      });
      host.append(...btns);
      optsHost.replaceChildren(host);
    }

    function askValid(p) {
      ctxTypeAsked++;
      // a pattern is "valid here" when the trend it requires matches what preceded it
      const need = p.requires;
      const ok = need === 'any' || need === current.trend;
      qText.textContent = `This is a ${p.name}. Its rule requires a ${need === 'any' ? 'any' : need + 'trend'}. ` +
        `Given what came before it on this chart, is it a valid signal here?`;
      renderOptions(shuffle([
        { k: true, label: 'Yes — the context supports it' },
        { k: false, label: 'No — the context is wrong for this pattern' }
      ]), o => o.k === ok, ok, true);
    }

    function renderOptions(opts, isRight, truthVal, isCtx = false) {
      const host = el('div', { class: 'gopts gopts--' + (opts.length > 2 ? '4' : '2') });
      const btns = opts.map((o, i) => el('button.gopt', {
        onclick: () => {
          const right = isRight(o);
          if (isCtx) { if (right) ctxTypeRight++; }
          btns.forEach((b, k) => {
            b.disabled = true;
            if (isRight(opts[k])) b.classList.add('ok');
            else if (k === i) b.classList.add('no');
          });
          judge(right, { picked: o.label, truth: truthVal });
        }
      }, [el('span.gopt__k', String(i + 1)), el('span', o.label)]));
      host.append(...btns);
      optsHost.replaceChildren(host);
      optsHost._btns = btns;
    }

    /* ── scoring and the continuation reveal ──────────────── */

    function judge(right, info = {}) {
      if (answered) return;
      answered = true;
      asked++;
      const p = patterns[current.key];

      if (right) {
        correct++; streak++; bestStreak = Math.max(bestStreak, streak);
        const speed = mode === 'timed' ? 1 + (qTime / PER_Q) * 0.5 : 1;
        const streakMult = Math.min(1 + Math.floor(streak / 3) * 0.25, 5);
        const diff = { 1: 1.0, 2: 1.3, 3: 1.6 }[p.candles] || 1;
        score += Math.round(100 * speed * streakMult * diff);
        if (mode === 'timed') timeLeft = Math.min(TIMED_SECS, timeLeft + 2);
      } else {
        streak = 0;
        missed[current.key] = (missed[current.key] || 0) + 1;
        if (mode === 'timed') score = Math.max(0, score - 50);
        if (mode === 'survival') lives--;
        if (mode === 'drill') queue.push(current);      // spaced repetition
      }

      paintHud();
      showDefinition(p, right);
      revealContinuation();

      round++;
      if (mode === 'survival' && lives <= 0) { setTimeout(() => end('Out of lives'), 900); return; }
      if (mode === 'drill') {
        qIdx++;
        if (qIdx >= queue.length) { setTimeout(() => end('Complete'), 900); return; }
      }
    }

    /** The chart continues for ten more candles so you see what happened. */
    function revealContinuation() {
      const d = series[current.sym].candles;
      const start = Math.max(0, current.to - 39);
      const full = d.slice(start, Math.min(d.length, current.to + 11));
      const hlFrom = current.from - start, hlTo = current.to - start;
      const after = d.slice(current.to + 1, current.to + 11);
      const move = after.length ? (after[after.length - 1].c - d[current.to].c) / d[current.to].c : 0;

      if (prefersReducedMotion()) {
        chart.o.highlight = { from: hlFrom, to: hlTo, label: patterns[current.key].name };
        chart.setData(full, { keepView: true });
        appendOutcome(move, after.length);
        return;
      }

      // animate the continuation in, candle by candle, at 60ms
      let n = current.to - start + 1;
      const step = () => {
        n++;
        const slice = full.slice(0, n);
        chart.o.highlight = { from: hlFrom, to: hlTo, label: patterns[current.key].name };
        chart.setData(slice, { keepView: true });
        if (n < full.length) setTimeout(step, 60);
        else appendOutcome(move, after.length);
      };
      setTimeout(step, 220);
    }

    function appendOutcome(move, n) {
      if (!n) return;
      const up = move >= 0;
      reveal.append(el('div', {
        class: 'callout ' + (up ? 'callout--info' : 'callout--danger'),
        style: { marginTop: 'var(--s3)', borderLeftColor: up ? 'var(--bull)' : 'var(--bear)' }
      }, [
        el('span.callout__l', { style: { color: up ? 'var(--bull)' : 'var(--bear)' } }, 'What actually happened next'),
        el('p', `Over the following ${n} sessions this counter moved ${up ? '+' : ''}${(move * 100).toFixed(2)}%. ` +
                (Math.abs(move) < 0.02
                  ? 'Barely anything — which is the honest outcome for most patterns most of the time.'
                  : up ? 'The signal was followed through on this occasion.'
                       : 'The signal did not follow through here. One instance proves nothing either way.'))
      ]));

      if (running && (mode !== 'survival' || lives > 0)) {
        reveal.append(el('button.btn.btn--primary', {
          style: { marginTop: 'var(--s3)' },
          onclick: nextQuestion
        }, 'Next →'));
      }
    }

    function showDefinition(p, right) {
      reveal.replaceChildren(el('div.cs__def', {
        style: { borderLeftColor: right ? 'var(--bull)' : 'var(--bear)' }
      }, [
        el('h4', [right ? '✓ ' : '✗ ', p.name, ' ', el('span.np', { lang: 'ne', style: { color: 'var(--signal)', fontSize: '0.9em' } }, p.np)]),
        el('div.row', [
          el('span.pill', { class: 'pill pill--' + (p.bias === 'bullish' ? 'bull' : p.bias === 'bearish' ? 'bear' : 'signal') }, p.bias),
          el('span.pill', `${p.candles} candle${p.candles > 1 ? 's' : ''}`),
          el('span.pill', `requires: ${p.requires}`),
          el('span.cs__rel', { role: 'img', 'aria-label': `Reliability ${p.reliability} of 5` },
            [1, 2, 3, 4, 5].map(i => el('i', { class: i <= p.reliability ? 'on' : '' })))
        ]),
        el('dl', [
          el('dt', 'Rule'), el('dd', p.rule),
          el('dt', 'Means'), el('dd', p.means),
          el('dt', 'Trap'), el('dd', p.trap)
        ])
      ]));
      if (!right) announce(`Incorrect. It was a ${p.name}. ${p.trap}`);
    }

    function paintHud() {
      hud.replaceChildren(
        cell('Score', num(score, 0)),
        cell('Streak', String(streak)),
        cell(mode === 'drill' ? 'Question' : mode === 'timed' ? 'Time' : 'Round',
          mode === 'drill' ? `${Math.min(qIdx + 1, queue.length || DRILL_N)}/${queue.length || DRILL_N}`
            : mode === 'timed' ? Math.ceil(timeLeft) + 's' : String(round + 1)),
        cell('Accuracy', asked ? Math.round(correct / asked * 100) + '%' : '—'),
        mode === 'survival'
          ? el('div.hud__cell', [el('span.hud__l', 'Lives'),
            el('div.cb__lives', { role: 'img', 'aria-label': `${lives} lives left` },
              [0, 1, 2].map(i => el('i', { class: i < lives ? '' : 'gone' })))])
          : cell('Best streak', String(bestStreak))
      );
    }
    function cell(l, v) { return el('div.hud__cell', [el('span.hud__l', l), el('span.hud__v', v)]); }

    function end(reason) {
      running = false;
      cancelAnimationFrame(raf);
      optsHost.replaceChildren();
      reveal.replaceChildren();

      const accuracy = asked ? correct / asked : 0;
      const rec = ctx.onEnd({ score, accuracy, meta: { mode, bestStreak, asked } });

      // badges
      const s = state.load();
      const totalAnswered = (s.stats?.csAnswered || 0) + asked;
      const totalCorrect = (s.stats?.csCorrect || 0) + correct;
      s.stats = { ...s.stats, csAnswered: totalAnswered, csCorrect: totalCorrect };
      state.save(s);
      if (totalAnswered >= 50 && totalCorrect / totalAnswered >= 0.9) state.grant('pattern-recognition');
      if (ctxTypeAsked >= 3 && ctxTypeRight === ctxTypeAsked) state.grant('context-matters');

      const worst = Object.entries(missed).sort((a, b) => b[1] - a[1]).slice(0, 2);

      const card = el('div.result', [
        el('div.result__score', num(score, 0)),
        el('div.result__l', reason),
        el('div.result__grid', [
          rcell('Answered', num(asked, 0)),
          rcell('Correct', num(correct, 0)),
          rcell('Accuracy', Math.round(accuracy * 100) + '%'),
          rcell('Best streak', num(bestStreak, 0)),
          rcell('Personal best', num(rec.best, 0))
        ]),
        rec.isFirst ? el('div.result__pb', '+100 XP — first play')
          : rec.beat ? el('div.result__pb', '★ New personal best · +75 XP')
          : el('div.result__pb', '+25 XP — replay')
      ]);

      if (worst.length) {
        card.append(el('div.result__weak', [
          el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'You missed these most'),
          el('div.weak', worst.map(([k, n]) => {
            const p = patterns[k];
            const lesson = p.candles === 1 ? '#/m/9/l/2' : p.candles === 2 ? '#/m/9/l/3' : '#/m/9/l/4';
            return el('a', { href: lesson }, [
              el('span', { style: { color: 'var(--paper)' } }, p.name),
              el('span', `${n} wrong · lesson →`)
            ]);
          }))
        ]));
      }

      card.append(el('div.row', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
        el('button.btn.btn--primary', { onclick: () => { card.remove(); startBtn.style.display = ''; start(); } }, 'Play again'),
        el('a.btn', { href: '#/games' }, 'All games')
      ]));

      qText.textContent = 'Run complete.';
      chartHost.replaceChildren();
      body.after(card);
      announce(`Run over. Score ${score}, accuracy ${Math.round(accuracy * 100)} percent.`);
    }
    function rcell(l, v) { return el('div.result__cell', [el('span.hud__l', l), el('span.hud__v', v)]); }

    const onKey = e => {
      if (!running) return;
      if (e.key === 'Escape') return end('Exited');
      if (e.key === 'Enter' && answered) { const b = reveal.querySelector('.btn--primary'); b?.click(); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        const btns = optsHost.querySelectorAll('.gopt, .cs__shape');
        btns[n - 1]?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    cleanup = () => { running = false; cancelAnimationFrame(raf); chart?.destroy(); window.removeEventListener('keydown', onKey); };
  },

  unmount() { cleanup?.(); cleanup = null; }
};

/** Tiny candle glyphs for the "predict the next candle" buttons. */
function drawMini(cv, kind) {
  const c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  const cx = W / 2;
  const style = getComputedStyle(document.documentElement);
  const bull = style.getPropertyValue('--bull').trim();
  const bear = style.getPropertyValue('--bear').trim();

  if (kind === 'up') {
    c.strokeStyle = bull; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, 8); c.lineTo(cx, 82); c.stroke();
    c.strokeRect(cx - 11, 18, 22, 52);
  } else if (kind === 'down') {
    c.strokeStyle = c.fillStyle = bear; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, 8); c.lineTo(cx, 82); c.stroke();
    c.fillRect(cx - 11, 18, 22, 52);
  } else {
    c.strokeStyle = style.getPropertyValue('--paper-3').trim(); c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, 8); c.lineTo(cx, 82); c.stroke();
    c.strokeRect(cx - 11, 40, 22, 10);
  }
}
