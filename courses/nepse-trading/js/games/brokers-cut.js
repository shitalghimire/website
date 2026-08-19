/* ═══════════════════════════════════════════════════════════════
   BROKER'S CUT — the cost and tax game
   Four rounds plus a bonus. Every problem is generated from fees.json,
   so a rate change means editing one file. After each round the full
   working is shown — the game must teach, not just test.
   ═══════════════════════════════════════════════════════════════ */

import { el, num, rs, pctPlain, num as N, announce, mulberry32, shuffle, sample } from '../util.js';
import * as money from '../money.js';
import * as state from '../state.js';

const ROUNDS = [
  { id: 1, name: 'Slab Sniper', secs: 30, blurb: 'Tap the correct commission rate.' },
  { id: 2, name: 'Total Damage', secs: 60, blurb: 'Enter the total cost, to the paisa.' },
  { id: 3, name: 'Tax Man', secs: 60, blurb: 'Compute the capital gains tax owed.' },
  { id: 4, name: 'Break-Even Blitz', secs: 45, blurb: 'Name the break-even price.' }
];

let cleanup = null;

export default {
  id: 'brokers-cut',
  title: "Broker's Cut",
  blurb: 'Four rounds of cost and tax arithmetic against the clock.',
  unlockedByModule: 7,
  modes: ['timed'],

  mount(container, ctx) {
    const fees = ctx.data.fees;
    const rnd = mulberry32(Date.now() & 0xffff);

    let roundIdx = 0, score = 0, streak = 0;
    let timeLeft = 0, running = false, raf = null, last = 0;
    let q = null;
    let roundStats = [];
    let asked = 0, right = 0;
    let round3Perfect = true, round3Asked = 0;
    let bonusDone = false, bonusFirstTry = true;

    const hud = el('div.hud');
    const rail = el('div.timerail', el('i'));
    const prompt = el('div.bc__prompt');
    const answerArea = el('div');
    const working = el('div');

    const body = el('div', { style: { display: 'grid', gap: 'var(--s4)' } },
      [hud, rail, prompt, answerArea, working]);

    const startBtn = el('button.btn.btn--primary', { style: { width: '100%' }, onclick: startRound }, 'Start Round 1 — Slab Sniper');

    container.replaceChildren(
      el('div.callout.callout--info', { style: { marginBottom: 'var(--s5)' } }, [
        el('span.callout__l', 'Four rounds, then one bonus question'),
        el('p', 'Every problem is generated from the live fee schedule. Amounts cluster near the slab boundaries ' +
                'deliberately, because that is where understanding and memorisation come apart.')
      ]),
      body, startBtn);

    prompt.append(el('p.dim', 'Press start.'));
    paintHud();

    /* ── round control ────────────────────────────────────── */

    function startRound() {
      const r = ROUNDS[roundIdx];
      if (!r) return startBonus();
      timeLeft = r.secs;
      running = true;
      asked = 0; right = 0;
      startBtn.style.display = 'none';
      working.replaceChildren();
      nextQuestion();
      last = performance.now();
      raf = requestAnimationFrame(tick);
      announce(`Round ${r.id}: ${r.name}. ${r.secs} seconds.`);
    }

    function tick(now) {
      if (!running) return;
      timeLeft = Math.max(0, timeLeft - (now - last) / 1000);
      last = now;
      const r = ROUNDS[roundIdx];
      rail.firstChild.style.width = (timeLeft / r.secs * 100) + '%';
      rail.classList.toggle('low', timeLeft <= 8);
      paintHud();
      if (timeLeft <= 0) return endRound();
      raf = requestAnimationFrame(tick);
    }

    function endRound() {
      running = false;
      cancelAnimationFrame(raf);
      const r = ROUNDS[roundIdx];
      roundStats.push({ name: r.name, asked, right });
      if (r.id === 3 && round3Asked > 0 && round3Perfect) state.grant('tax-collector');

      answerArea.replaceChildren();
      prompt.replaceChildren(
        el('div.bc__round', `Round ${r.id} complete`),
        el('div.bc__amount', num(score, 0)),
        el('p.bc__q', `${right} of ${asked} correct in ${r.name}.`)
      );

      roundIdx++;
      startBtn.style.display = '';
      startBtn.textContent = ROUNDS[roundIdx]
        ? `Start Round ${ROUNDS[roundIdx].id} — ${ROUNDS[roundIdx].name}`
        : 'The bonus question — 500 points';
      startBtn.onclick = ROUNDS[roundIdx] ? startRound : startBonus;
    }

    /* ── question generation, all from fees.json ──────────── */

    function nextQuestion() {
      const r = ROUNDS[roundIdx];
      working.replaceChildren();
      if (r.id === 1) return qSlab();
      if (r.id === 2) return qTotal();
      if (r.id === 3) return qTax();
      if (r.id === 4) return qBreakEven();
    }

    /** Round 1 — amounts cluster near boundaries so memorising the table is not enough. */
    function qSlab() {
      const bounds = fees.commissionSlabs.filter(s => s.max !== null).map(s => s.max);
      const near = sample(bounds, rnd);
      const offset = Math.round((rnd() - 0.5) * near * 0.02);
      const amount = Math.max(1000, near + (rnd() < 0.7 ? offset : Math.round((rnd() - 0.5) * near)));
      const slab = money.slabFor(amount, fees);
      q = { kind: 'slab', amount, answer: slab.rate };

      prompt.replaceChildren(
        el('div.bc__round', 'Round 1 · Slab Sniper'),
        el('div.bc__amount', rs(amount, 0)),
        el('p.bc__q', 'Which commission rate applies to this transaction?')
      );

      answerArea.replaceChildren(el('div.bc__slabs',
        fees.commissionSlabs.map((s, i) => el('button.gopt', {
          onclick: e => judgeSlab(s, e.currentTarget)
        }, [
          el('span.gopt__k', String(i + 1)),
          el('div', [
            el('div', { style: { fontFamily: 'var(--f-data)', color: 'var(--paper)' } }, pctPlain(s.rate, 2)),
            el('div', { style: { fontSize: '0.625rem', color: 'var(--paper-4)' } }, s.label)
          ])
        ]))
      ));
    }

    function judgeSlab(picked, node) {
      if (!running) return;
      asked++;
      const ok = picked.rate === q.answer;
      node.classList.add(ok ? 'ok' : 'no');
      if (ok) { right++; streak++; score += Math.round(50 * mult()); }
      else { streak = 0; showWorking([`Rs. ${num(q.amount, 0)} falls in "${money.slabFor(q.amount, fees).label}", so the rate is ${pctPlain(q.answer, 2)}.`,
        'Slabs apply to the whole amount, not marginally — cross a boundary and the entire trade is charged at the lower rate.']); }
      paintHud();
      setTimeout(() => { if (running) nextQuestion(); }, ok ? 320 : 1600);
    }

    /** Round 2 — full trade, enter the total cost to the paisa. */
    function qTotal() {
      const side = rnd() < 0.5 ? 'buy' : 'sell';
      const price = Math.round((80 + rnd() * 620) * 10) / 10;
      const qty = [10, 20, 50, 100, 150, 200, 300, 500, 1000][Math.floor(rnd() * 9)];
      const c = money.tradeCost({ qty, price, side, fees });
      const answer = side === 'buy' ? c.total : c.netBeforeTax;
      q = { kind: 'total', qty, price, side, c, answer };

      prompt.replaceChildren(
        el('div.bc__round', 'Round 2 · Total Damage'),
        el('div.bc__amount', `${side.toUpperCase()} ${num(qty, 0)} @ ${num(price)}`),
        el('p.bc__q', side === 'buy'
          ? 'What is the total cost to buy, including commission, SEBON fee and DP charge?'
          : 'What are the net proceeds before tax, after commission, SEBON fee and DP charge?')
      );
      numericEntry(answer, 1, 10, [200, 80]);
    }

    /** Round 3 — CGT, deliberately mixing short, long, exactly-365 and institutional. */
    function qTax() {
      const buy = Math.round((100 + rnd() * 500) * 10) / 10;
      const gainPct = 0.05 + rnd() * 0.45;
      const sell = Math.round(buy * (1 + gainPct) * 10) / 10;
      const qty = [50, 100, 200, 300, 500][Math.floor(rnd() * 5)];
      // deliberately include 365 exactly, and institutional cases
      const days = [180, 300, 365, 366, 400, 730][Math.floor(rnd() * 6)];
      const investorType = rnd() < 0.25 ? 'institution' : 'individual';

      const buyC = money.tradeCost({ qty, price: buy, side: 'buy', fees });
      const sellC = money.tradeCost({ qty, price: sell, side: 'sell', fees });
      const tax = money.cgt({ netBeforeTax: sellC.netBeforeTax, costBasis: buyC.total, holdingDays: days, investorType, fees });
      q = { kind: 'tax', qty, buy, sell, days, investorType, buyC, sellC, tax, answer: tax.tax };
      round3Asked++;

      prompt.replaceChildren(
        el('div.bc__round', 'Round 3 · Tax Man'),
        el('div.bc__amount', `${num(qty, 0)} @ ${num(buy)} → ${num(sell)}`),
        el('p.bc__q', `Held ${num(days, 0)} days · ${investorType === 'institution' ? 'institutional investor' : 'individual investor'}. ` +
                      `Cost basis is the full buy cost including fees; proceeds are net of sell-side fees. What CGT is withheld?`)
      );
      numericEntry(tax.tax, 1, 10, [200, 80], () => { round3Perfect = false; });
    }

    /** Round 4 — the hardest round, worth the most. */
    function qBreakEven() {
      const price = Math.round((80 + rnd() * 520) * 10) / 10;
      const qty = [10, 25, 50, 100, 200, 500, 1000][Math.floor(rnd() * 7)];
      const be = money.breakEven({ qty, price, fees });
      q = { kind: 'be', qty, price, be, answer: be.price };

      prompt.replaceChildren(
        el('div.bc__round', 'Round 4 · Break-Even Blitz'),
        el('div.bc__amount', `BUY ${num(qty, 0)} @ ${num(price)}`),
        el('p.bc__q', 'At what price must you sell simply to be level, after round-trip commission, SEBON fee and two DP charges?')
      );
      numericEntry(be.price, 0.05, 0.5, [300, 120]);
    }

    /* ── numeric entry with an on-screen pad for mobile ───── */

    function numericEntry(answer, tightTol, looseTol, [tightPts, loosePts], onWrong) {
      const input = el('input', {
        type: 'text', inputMode: 'decimal', placeholder: '0.00',
        'aria-label': 'Your answer in rupees',
        style: { textAlign: 'right', fontSize: '1.2rem' },
        onkeydown: e => { if (e.key === 'Enter') submit(); }
      });

      const submit = () => {
        if (!running) return;
        const v = parseFloat(String(input.value).replace(/,/g, ''));
        if (Number.isNaN(v)) return;
        asked++;
        const diff = Math.abs(v - answer);
        let pts = 0;
        if (diff <= tightTol) pts = tightPts;
        else if (diff <= looseTol) pts = loosePts;

        if (pts) { right++; streak++; score += Math.round(pts * mult()); }
        else { streak = 0; onWrong?.(); }
        paintHud();
        showWorking(workingFor(), pts > 0);
        input.disabled = true;
        setTimeout(() => { if (running) nextQuestion(); }, pts ? 900 : 2600);
      };

      const pad = el('div.bc__pad', [...'789456123', '.', '0', '←'].map(k => el('button', {
        type: 'button',
        onclick: () => {
          if (k === '←') input.value = input.value.slice(0, -1);
          else input.value += k;
          input.focus();
        }
      }, k)));

      answerArea.replaceChildren(
        el('div.bc__entry', [
          el('div.field', { style: { flex: '1 1 200px', maxWidth: '240px' } }, input),
          el('button.btn.btn--primary', { onclick: submit }, 'Submit')
        ]),
        pad
      );
      input.focus();
    }

    /** Show the full working, line by line. The game must teach. */
    function workingFor() {
      if (q.kind === 'total') {
        const c = q.c;
        return [
          `Gross = ${num(q.qty, 0)} × Rs. ${num(q.price)} = ${rs(c.gross)}`,
          `Slab: ${c.slab.label} → ${pctPlain(c.slab.rate, 2)}`,
          `Commission = ${rs(c.gross)} × ${pctPlain(c.slab.rate, 2)} = ${rs(c.commission)}`,
          `SEBON fee = ${rs(c.gross)} × ${pctPlain(fees.sebonEquity, 3)} = ${rs(c.sebon)}`,
          `DP charge = ${rs(c.dp)}`,
          q.side === 'buy'
            ? `Total to buy = gross + commission + SEBON + DP = ${rs(c.total)}`
            : `Net proceeds = gross − commission − SEBON − DP = ${rs(c.netBeforeTax)}`
        ];
      }
      if (q.kind === 'tax') {
        const lines = [
          `Cost basis (buy, all-in) = ${rs(q.buyC.total)}`,
          `Net proceeds before tax = ${rs(q.sellC.netBeforeTax)}`,
          `Gain = ${rs(q.sellC.netBeforeTax)} − ${rs(q.buyC.total)} = ${rs(q.tax.gain)}`
        ];
        if (q.tax.gain <= 0) lines.push('No gain, so no capital gains tax. The one mercy in the arithmetic.');
        else if (q.investorType === 'institution') lines.push(`Institutional rate is ${pctPlain(fees.cgt.institution, 1)} regardless of holding period → ${rs(q.tax.tax)}`);
        else lines.push(
          `${num(q.days, 0)} days is ${q.days > 365 ? 'MORE than 365 → long-term' : '365 or fewer → short-term'}` +
          (q.days === 365 ? ' (exactly 365 is short-term — the threshold is "more than 365")' : ''),
          `Rate since 17 July 2026: ${pctPlain(q.tax.rate, 1)} → tax = ${rs(q.tax.tax)}`);
        return lines;
      }
      if (q.kind === 'be') {
        const b = q.be;
        return [
          `Total cost to buy = ${rs(b.buy.total)} (incl. commission ${rs(b.buy.commission)}, SEBON ${rs(b.buy.sebon)}, DP ${rs(b.buy.dp)})`,
          `You must also pay the sell-side commission, SEBON fee and a second DP charge.`,
          `Break-even = [ buy cost + DP ] ÷ [ qty × (1 − sell rate − SEBON) ]`,
          `= ${rs(b.price)} — a move of ${pctPlain(b.movePct, 2)}`,
          b.movePct > 0.02
            ? `That flat Rs. ${fees.dpCharge} DP charge is why a small trade needs such a large move.`
            : `At this size the flat charges barely register.`
        ];
      }
      return [];
    }

    function showWorking(lines, ok = false) {
      working.replaceChildren(el('div', { class: 'explain ' + (ok ? 'explain--ok' : 'explain--no') }, [
        el('span.explain__l', ok ? '✓ Correct — the working' : `✗ The answer was ${rs(q.answer)}`),
        el('div.bc__work', lines.map(l => el('div', { style: { padding: '2px 0' } }, l)))
      ]));
      if (!ok) announce(`Incorrect. The answer was ${rs(q.answer)}.`);
    }

    /* ── the bonus question ───────────────────────────────── */

    function startBonus() {
      startBtn.style.display = 'none';
      rail.firstChild.style.width = '100%';
      const be = money.breakEven({ qty: 10, price: 100, fees });

      prompt.replaceChildren(
        el('div.bc__round', 'Bonus · The Trap'),
        el('div.bc__amount', 'BUY 10 @ Rs. 100'),
        el('p.bc__q', 'A Rs. 1,000 trade. What percentage move do you need just to break even? Answer to two decimals.')
      );

      const input = el('input', {
        type: 'text', inputMode: 'decimal', placeholder: '0.00',
        'aria-label': 'Percentage move needed',
        style: { textAlign: 'right', fontSize: '1.2rem' }
      });
      const go = () => {
        const v = parseFloat(input.value);
        const target = be.movePct * 100;
        const ok = Math.abs(v - target) <= 0.1;
        if (ok) {
          score += 500;
          if (bonusFirstTry) state.grant('rs-1000-trap');
          showWorking([
            `Total cost to buy = ${rs(be.buy.total)} — of which the flat DP charge is ${rs(fees.dpCharge)}`,
            `On a Rs. 1,000 trade the DP charge alone is ${pctPlain(fees.dpCharge / 1000, 1)}`,
            `Break-even price = ${rs(be.price)}`,
            `Required move = ${target.toFixed(2)}%`,
            `A Rs. 2,30,000 trade needs about 0.7%. Same market, same fees, eight times the hurdle — entirely because of one flat Rs. 25 charge.`
          ], true);
          finish();
        } else {
          bonusFirstTry = false;
          showWorking([
            `Not quite. Work it from the flat charges: on Rs. 1,000, the Rs. ${fees.dpCharge} DP charge alone is ${pctPlain(fees.dpCharge / 1000, 1)}, and you pay it twice.`,
            'Try once more.'
          ]);
          input.value = '';
          input.focus();
        }
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });

      answerArea.replaceChildren(el('div.bc__entry', [
        el('div.field', { style: { flex: '1 1 160px', maxWidth: '180px' } }, input),
        el('span.dim', { style: { fontFamily: 'var(--f-data)' } }, '%'),
        el('button.btn.btn--primary', { onclick: go }, 'Answer'),
        el('button.btn', { onclick: () => { showWorking([`The answer is ${(be.movePct * 100).toFixed(2)}%. Getting this wrong is the point — the reveal is the lesson.`]); finish(); } }, 'Give up')
      ]));
      input.focus();
    }

    /* ── finish ───────────────────────────────────────────── */

    function finish() {
      running = false;
      cancelAnimationFrame(raf);
      answerArea.replaceChildren();
      const totalAsked = roundStats.reduce((a, r) => a + r.asked, 0);
      const totalRight = roundStats.reduce((a, r) => a + r.right, 0);
      const accuracy = totalAsked ? totalRight / totalAsked : 0;
      const rec = ctx.onEnd({ score, accuracy, meta: { rounds: roundStats } });

      const weakest = [...roundStats].sort((a, b) =>
        (a.asked ? a.right / a.asked : 1) - (b.asked ? b.right / b.asked : 1))[0];

      const card = el('div.result', [
        el('div.result__score', num(score, 0)),
        el('div.result__l', 'All four rounds complete'),
        el('div.result__grid', roundStats.map(r =>
          el('div.result__cell', [
            el('span.hud__l', r.name),
            el('span.hud__v', `${r.right}/${r.asked}`)
          ]))),
        rec.isFirst ? el('div.result__pb', '+100 XP — first play')
          : rec.beat ? el('div.result__pb', '★ New personal best · +75 XP')
          : el('div.result__pb', '+25 XP — replay'),
        weakest && weakest.asked > 0 && weakest.right < weakest.asked && el('div.result__weak', [
          el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s2)' } }, 'Weakest round'),
          el('div.weak', el('a', { href: lessonForRound(weakest.name) }, [
            el('span', { style: { color: 'var(--paper)' } }, weakest.name),
            el('span', `${weakest.right}/${weakest.asked} — reread the lesson →`)
          ]))
        ]),
        el('div.row', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
          el('button.btn.btn--primary', { onclick: () => location.reload() }, 'Play again'),
          el('a.btn', { href: '#/games' }, 'All games')
        ])
      ]);
      prompt.replaceChildren(el('p.dim', 'Run complete.'));
      body.after(card);
      announce(`Run complete. Score ${score}.`);
    }

    const lessonForRound = name => ({
      'Slab Sniper': '#/m/7/l/1',
      'Total Damage': '#/m/7/l/2',
      'Tax Man': '#/m/7/l/3',
      'Break-Even Blitz': '#/m/7/l/4'
    }[name] || '#/m/7');

    function mult() { return Math.min(1 + Math.floor(streak / 3) * 0.25, 5); }

    function paintHud() {
      const r = ROUNDS[roundIdx];
      hud.replaceChildren(
        cell('Score', num(score, 0)),
        cell('Round', r ? `${r.id}/4` : 'Bonus'),
        cell('Streak', String(streak)),
        cell('Multiplier', '×' + mult().toFixed(2).replace(/\.00$/, '')),
        cell('Time', running ? Math.ceil(timeLeft) + 's' : '—')
      );
    }
    function cell(l, v) { return el('div.hud__cell', [el('span.hud__l', l), el('span.hud__v', v)]); }

    const onKey = e => { if (e.key === 'Escape' && running) { running = false; cancelAnimationFrame(raf); finish(); } };
    window.addEventListener('keydown', onKey);
    cleanup = () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  },

  unmount() { cleanup?.(); cleanup = null; }
};
