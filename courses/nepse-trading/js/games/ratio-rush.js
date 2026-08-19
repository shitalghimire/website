/* ═══════════════════════════════════════════════════════════════
   RATIO RUSH — fundamentals matching
   Three game types on the real Q2 2082/83 bank table. Judge is the
   most valuable format in the course: picking the right bank for the
   wrong reason scores half, because in practice it is the reason
   that transfers.
   ═══════════════════════════════════════════════════════════════ */

import { el, num, rs, pctPlain, shuffle, sample, announce } from '../util.js';
import * as state from '../state.js';

const PAIRS = [
  ['P/E', 'Price divided by earnings per share. In Nepali banking an extreme value usually means earnings collapsed, not that growth is priced in.'],
  ['ROE', 'Net profit as a percentage of shareholders\' equity — how efficiently the business turns your capital into earnings.'],
  ['EPS', 'Net profit divided by shares outstanding. Falls mechanically after a bonus issue even when profit rises.'],
  ['P/B', 'Price divided by book value per share. Often steadier than P/E for banks, because book value moves slowly.'],
  ['NPL', 'Loans not being repaid, as a percentage of total loans. Rising values precede falling EPS by two to four quarters.'],
  ['CD ratio', 'How much of a bank\'s deposits it has lent out. A stretched system-wide figure was the upstream cause of the 2021–23 crash.'],
  ['NIM', 'The spread a bank earns between what it charges on loans and pays on deposits, as a percentage of earning assets.'],
  ['ROA', 'Net profit as a percentage of total assets. Strips out the flattering effect of leverage.'],
  ['Book value', 'Net assets divided by shares outstanding — what the accounts say each share is backed by.'],
  ['WACC', 'Your average per-share purchase cost, and the basis your capital gains tax is computed against.'],
  ['PLF', 'Actual generation divided by theoretical maximum — what a hydropower licence is really worth.'],
  ['Provisioning', 'Money set aside against loans a bank expects to lose. Reduces reported profit, which is why Q4 often disappoints.']
];

let cleanup = null;

export default {
  id: 'ratio-rush',
  title: 'Ratio Rush',
  blurb: 'Match, compute and judge real NEPSE fundamentals.',
  unlockedByModule: 12,
  modes: ['match', 'compute', 'judge'],

  mount(container, ctx) {
    const banks = ctx.data.securities.banks;
    const median = ctx.data.securities.sectorMedianPE;

    let mode = 'match';
    let score = 0, asked = 0, right = 0, streak = 0;
    let timeLeft = 0, running = false, raf = null, last = 0;

    const hud = el('div.hud');
    const rail = el('div.timerail', el('i'));
    const stage = el('div');

    const modeBar = el('div.tabs', [['match', 'Match · 12 pairs'], ['compute', 'Compute'], ['judge', 'Judge']].map(([m, label], i) =>
      el('button', {
        role: 'tab', 'aria-selected': String(i === 0),
        onclick: e => {
          mode = m;
          [...modeBar.children].forEach(b => b.setAttribute('aria-selected', 'false'));
          e.currentTarget.setAttribute('aria-selected', 'true');
          startBtn.textContent = 'Start ' + label.split(' ·')[0];
        }
      }, label)));

    const startBtn = el('button.btn.btn--primary', { style: { width: '100%' }, onclick: start }, 'Start Match');

    container.replaceChildren(
      el('div.callout.callout--info', { style: { marginBottom: 'var(--s5)' } }, [
        el('span.callout__l', 'Real companies, real numbers'),
        el('p', 'Every figure comes from the Q2 FY 2082/83 commercial bank table — nineteen banks you can look up ' +
                'tonight. In Judge, picking the right bank for the wrong reason scores half, because the reason ' +
                'is the part that transfers to the next decision.')
      ]),
      el('div', { style: { display: 'grid', gap: 'var(--s4)' } }, [modeBar, hud, rail, stage]),
      startBtn);

    paintHud();
    stage.append(el('p.dim', { style: { textAlign: 'center', padding: 'var(--s6) 0' } }, 'Pick a mode and press start.'));

    /* ── control ──────────────────────────────────────────── */

    function start() {
      score = 0; asked = 0; right = 0; streak = 0;
      container.querySelector('.result')?.remove();
      startBtn.style.display = 'none';
      running = true;
      timeLeft = mode === 'match' ? 90 : 75;
      last = performance.now();
      raf = requestAnimationFrame(tick);
      nextRound();
      announce(mode + ' started');
    }

    function tick(now) {
      if (!running) return;
      timeLeft = Math.max(0, timeLeft - (now - last) / 1000);
      last = now;
      rail.firstChild.style.width = (timeLeft / (mode === 'match' ? 90 : 75) * 100) + '%';
      rail.classList.toggle('low', timeLeft <= 10);
      paintHud();
      if (timeLeft <= 0) return end('Time');
      raf = requestAnimationFrame(tick);
    }

    function nextRound() {
      if (mode === 'match') return roundMatch();
      if (mode === 'compute') return roundCompute();
      return roundJudge();
    }

    /* ── match ────────────────────────────────────────────── */

    function roundMatch() {
      const set = shuffle(PAIRS).slice(0, 6);
      const terms = shuffle(set.map(p => p[0]));
      const defs = shuffle(set.map(p => p[1]));
      let selected = null;
      let matched = 0;

      const termCol = el('div.rr__col');
      const defCol = el('div.rr__col');

      const termBtns = terms.map(t => el('button.rr__chip.rr__chip--term', {
        onclick: () => { selected = { kind: 'term', v: t, node: termBtns.find(b => b.dataset.v === t) }; paintSel(); },
        dataset: { v: t }
      }, t));
      const defBtns = defs.map(d => el('button.rr__chip.rr__chip--def', {
        onclick: () => {
          if (!selected) return;
          const pair = set.find(p => p[0] === selected.v);
          asked++;
          if (pair && pair[1] === d) {
            right++; streak++; score += Math.round(80 * mult());
            selected.node.classList.add('done'); selected.node.disabled = true;
            defBtns.find(b => b.dataset.v === d).classList.add('done');
            defBtns.find(b => b.dataset.v === d).disabled = true;
            matched++;
            if (matched === set.length) setTimeout(() => { if (running) roundMatch(); }, 500);
          } else {
            streak = 0;
            const n = defBtns.find(b => b.dataset.v === d);
            n.classList.add('no');
            setTimeout(() => n.classList.remove('no'), 500);
          }
          selected.node.classList.remove('sel');
          selected = null;
          paintHud();
        },
        dataset: { v: d }
      }, d));

      const paintSel = () => {
        termBtns.forEach(b => b.classList.toggle('sel', selected && b.dataset.v === selected.v));
      };

      termCol.append(...termBtns);
      defCol.append(...defBtns);
      stage.replaceChildren(
        el('p.widget__note', 'Tap a metric, then tap its definition.'),
        el('div.rr__match', [termCol, defCol])
      );
    }

    /* ── compute ──────────────────────────────────────────── */

    function roundCompute() {
      const b = sample(banks.filter(x => x.eps > 0));
      const kinds = [
        { k: 'pe', q: `${b.n} (${b.s}) trades at Rs. ${num(b.ltp)} with EPS of Rs. ${num(b.eps)}. What is its P/E?`, a: b.ltp / b.eps, tol: 0.06, unit: '×',
          work: () => `P/E = price ÷ EPS = ${num(b.ltp)} ÷ ${num(b.eps)} = ${num(b.ltp / b.eps)}×. Sector median is ${median}×.` },
        { k: 'earn', q: `For every Rs. 1,000 invested in ${b.s} at Rs. ${num(b.ltp)} with EPS Rs. ${num(b.eps)}, how much annual earnings do you buy?`, a: (1000 / b.ltp) * b.eps, tol: 0.6, unit: 'Rs.',
          work: () => `Rs. 1,000 ÷ Rs. ${num(b.ltp)} = ${num(1000 / b.ltp)} shares × Rs. ${num(b.eps)} EPS = Rs. ${num((1000 / b.ltp) * b.eps)}. This is the P/E question turned the useful way round.` },
        { k: 'roe', q: `${b.s} has an ROE of ${pctPlain(b.roe, 2)}. Express that as a number of paisa earned per Rs. 100 of shareholder equity.`, a: b.roe * 100, tol: 0.06, unit: 'Rs.',
          work: () => `ROE ${pctPlain(b.roe, 2)} means Rs. ${num(b.roe * 100)} of profit per Rs. 100 of equity. Read it beside P/E: ${b.s} is on ${num(b.pe)}×.` }
      ];
      const q = sample(kinds);

      const input = el('input', { type: 'text', inputMode: 'decimal', placeholder: '0.00', style: { textAlign: 'right', fontSize: '1.15rem' },
        onkeydown: e => { if (e.key === 'Enter') go(); } });

      const go = () => {
        if (!running) return;
        const v = parseFloat(input.value);
        if (Number.isNaN(v)) return;
        asked++;
        const ok = Math.abs(v - q.a) <= q.tol;
        if (ok) { right++; streak++; score += Math.round(120 * mult()); }
        else streak = 0;
        paintHud();
        stage.append(el('div', { class: 'explain ' + (ok ? 'explain--ok' : 'explain--no'), style: { marginTop: 'var(--s4)' } }, [
          el('span.explain__l', ok ? '✓ Correct' : `✗ The answer was ${num(q.a)}${q.unit === '×' ? '×' : ''}`),
          el('div', q.work())
        ]));
        input.disabled = true;
        setTimeout(() => { if (running) roundCompute(); }, ok ? 900 : 2400);
      };

      stage.replaceChildren(
        el('div.bc__prompt', [
          el('div.bc__round', 'Compute'),
          el('p.bc__q', { style: { fontSize: 'var(--t-md)', color: 'var(--paper)' } }, q.q)
        ]),
        el('div.bc__entry', { style: { marginTop: 'var(--s4)' } }, [
          el('div.field', { style: { flex: '1 1 180px', maxWidth: '220px' } }, input),
          el('button.btn.btn--primary', { onclick: go }, 'Submit')
        ])
      );
      input.focus();
    }

    /* ── judge — the format that matters ──────────────────── */

    function roundJudge() {
      const usable = banks.filter(b => b.eps > 0);
      let a = sample(usable), b = sample(usable);
      let guard = 0;
      while ((b.s === a.s || Math.abs(a.pe - b.pe) < 3) && guard++ < 40) b = sample(usable);

      // "better value" = lower P/E with comparable-or-better ROE
      const scoreOf = x => (x.roe * 100) / Math.max(1, x.pe);
      const better = scoreOf(a) >= scoreOf(b) ? a : b;
      const worse = better === a ? b : a;

      const reasons = shuffle([
        { t: `${better.s} buys more earnings per rupee and uses its capital more efficiently`, correct: true },
        { t: `${better.s} has the lower share price`, correct: false },
        { t: `${worse.s} has the higher P/E, which means the market expects it to grow faster`, correct: false },
        { t: `${better.s} trades closer to its Rs. 100 face value`, correct: false }
      ]);

      let pickedBank = null;
      const bankBtns = shuffle([a, b]).map(x => el('button.rr__bank', {
        onclick: () => {
          if (pickedBank) return;
          pickedBank = x;
          bankBtns.forEach(btn => {
            btn.disabled = true;
            btn.classList.add(btn.dataset.s === better.s ? 'ok' : (btn.dataset.s === x.s ? 'no' : ''));
          });
          reasonBox.style.display = '';
        },
        dataset: { s: x.s }
      }, [
        el('h4', x.s),
        el('div.n', x.n),
        el('dl', [
          el('dt', 'LTP'), el('dd', 'Rs. ' + num(x.ltp)),
          el('dt', 'EPS'), el('dd', 'Rs. ' + num(x.eps)),
          el('dt', 'P/E'), el('dd', num(x.pe) + '×'),
          el('dt', 'ROE'), el('dd', pctPlain(x.roe, 2)),
          el('dt', 'Per Rs. 1,000'), el('dd', 'Rs. ' + num((1000 / x.ltp) * x.eps) + ' earnings')
        ])
      ]));

      const reasonBox = el('div', { style: { display: 'none', marginTop: 'var(--s5)' } }, [
        el('p.widget__note', 'Now the half that matters — why?'),
        el('div.gopts', reasons.map((r, i) => el('button.gopt', {
          onclick: e => {
            asked++;
            const bankRight = pickedBank.s === better.s;
            const reasonRight = r.correct;
            let pts = 0;
            if (bankRight && reasonRight) { pts = 200; right++; streak++; }
            else if (bankRight) { pts = 100; streak = 0; }
            else { pts = 0; streak = 0; }
            score += Math.round(pts * mult());
            paintHud();

            [...e.currentTarget.parentElement.children].forEach((btn, k) => {
              btn.disabled = true;
              if (reasons[k].correct) btn.classList.add('ok');
              else if (k === i) btn.classList.add('no');
            });

            stage.append(el('div', {
              class: 'explain ' + (pts === 200 ? 'explain--ok' : pts ? 'explain--hint' : 'explain--no'),
              style: { marginTop: 'var(--s4)' }
            }, [
              el('span.explain__l', pts === 200 ? '✓ Right bank, right reason — full marks'
                : pts ? '½ Right bank, wrong reason — half marks'
                : '✗ Wrong bank'),
              el('div', `${better.s} is the better value: P/E ${num(better.pe)}× against ${num(worse.pe)}×, ` +
                `ROE ${pctPlain(better.roe, 2)} against ${pctPlain(worse.roe, 2)}. Per Rs. 1,000 invested you buy ` +
                `Rs. ${num((1000 / better.ltp) * better.eps)} of annual earnings versus Rs. ${num((1000 / worse.ltp) * worse.eps)}. ` +
                `Share price alone tells you nothing — and a high P/E in Nepali banking almost never means priced-in growth. ` +
                `It means the E collapsed.`)
            ]));
            setTimeout(() => { if (running) roundJudge(); }, 3000);
          }
        }, [el('span.gopt__k', String(i + 1)), el('span', r.t)])))
      ]);

      stage.replaceChildren(
        el('p.widget__note', 'Which is better value? Pick the bank, then pick the reason.'),
        el('div.rr__pair', bankBtns),
        reasonBox
      );
    }

    /* ── shared ───────────────────────────────────────────── */

    function mult() { return Math.min(1 + Math.floor(streak / 3) * 0.25, 4); }

    function paintHud() {
      hud.replaceChildren(
        cell('Score', num(score, 0)),
        cell('Mode', mode),
        cell('Correct', `${right}/${asked}`),
        cell('Streak', String(streak)),
        cell('Time', running ? Math.ceil(timeLeft) + 's' : '—')
      );
    }
    const cell = (l, v) => el('div.hud__cell', [el('span.hud__l', l), el('span.hud__v', v)]);

    function end(reason) {
      running = false;
      cancelAnimationFrame(raf);
      const accuracy = asked ? right / asked : 0;
      const rec = ctx.onEnd({ score, accuracy, meta: { mode } });

      stage.replaceChildren(el('div.result', [
        el('div.result__score', num(score, 0)),
        el('div.result__l', `${reason} — ${mode}`),
        el('div.result__grid', [
          el('div.result__cell', [el('span.hud__l', 'Answered'), el('span.hud__v', num(asked, 0))]),
          el('div.result__cell', [el('span.hud__l', 'Correct'), el('span.hud__v', num(right, 0))]),
          el('div.result__cell', [el('span.hud__l', 'Accuracy'), el('span.hud__v', Math.round(accuracy * 100) + '%')]),
          el('div.result__cell', [el('span.hud__l', 'Personal best'), el('span.hud__v', num(rec.best, 0))])
        ]),
        rec.isFirst ? el('div.result__pb', '+100 XP — first play')
          : rec.beat ? el('div.result__pb', '★ New personal best · +75 XP')
          : el('div.result__pb', '+25 XP — replay'),
        el('p.widget__note', { style: { marginTop: 'var(--s4)' } },
          `Fundamentals as at ${ctx.data.securities.asOf}. Prices are illustrative — check NepseAlpha, Merolagani or Sharesansar for live data.`),
        el('div.row', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
          el('button.btn.btn--primary', { onclick: () => { startBtn.style.display = ''; start(); } }, 'Play again'),
          el('a.btn', { href: '#/m/13/l/1' }, 'Reread Lesson 13.1'),
          el('a.btn', { href: '#/games' }, 'All games')
        ])
      ]));
      announce(`Run over. Score ${score}.`);
    }

    const onKey = e => {
      if (!running) return;
      if (e.key === 'Escape') return end('Exited');
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) stage.querySelectorAll('.gopt')[n - 1]?.click();
    };
    window.addEventListener('keydown', onKey);
    cleanup = () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  },

  unmount() { cleanup?.(); cleanup = null; }
};
