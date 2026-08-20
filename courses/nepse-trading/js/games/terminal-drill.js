/* ═══════════════════════════════════════════════════════════════
   TERMINAL DRILL — TMS · depository · C-ASBA · EDIS simulator
   A deliberately generic mock, watermarked SIMULATION throughout.
   It reproduces no real broker's branding and could not be mistaken
   for a genuine login page. Mission 4 makes you fail EDIS once, in a
   place where failing is free.
   ═══════════════════════════════════════════════════════════════ */

import { el, num, rs, announce, clamp } from '../util.js';
import * as money from '../money.js';
import * as state from '../state.js';

const TARGET_SECS = 240;   // all six missions under this earns Terminal Native

let cleanup = null;

export default {
  id: 'terminal-drill',
  title: 'Terminal Drill',
  blurb: 'Six missions through a simulated TMS and depository portal.',
  unlockedByModule: 3,
  modes: ['drill'],

  mount(container, ctx) {
    const fees = ctx.data.fees;
    const rules = ctx.data.rules;

    const MISSIONS = [
      { n: 1, t: 'Fund your account', teaches: 'Trying to buy before funds clear' },
      { n: 2, t: 'Place a buy order', teaches: 'Orders outside the ±3% band; market-order muscle memory' },
      { n: 3, t: 'Read your order book', teaches: 'Confusing the order book with the trade book' },
      { n: 4, t: 'Sell and authorise EDIS', teaches: 'Forgetting EDIS — the flagship lesson' },
      { n: 5, t: 'Apply for an IPO', teaches: 'Applying twice; wrong bank; insufficient balance' },
      { n: 6, t: 'Check allotment and read your WACC', teaches: 'Misreading WACC as market price' }
    ];

    let done = new Set();
    let active = null;
    let startedAt = null;
    let elapsed = 0, timer = null;
    let ghostTimer = null;
    let edisFailedOnce = false;

    // simulated account
    const acct = { cash: 0, shares: 0, wacc: 0, pendingSell: null, ipoApplied: false, allotted: 0 };

    const missionList = el('div.td__missions');
    const stage = el('div');
    const toast = el('div');
    const hud = el('div.hud');

    container.replaceChildren(
      el('div.td__warn', { style: { marginBottom: 'var(--s4)' } },
        'PRACTICE ENVIRONMENT. Never enter a real password anywhere that looks like this. ' +
        'Real platforms live only at your broker\'s own domain and meroshare.cdsc.com.np — ' +
        'check the address bar every single time.'),
      hud,
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--s4)' } },
        [missionList, toast, stage])
    );

    paintHud();
    paintMissions();
    stage.append(el('div.callout.callout--info', [
      el('span.callout__l', 'Six missions'),
      el('p', 'Each is a guided click-path through a generic simulation of the systems you will actually use. ' +
              'Wrong clicks produce the realistic error the real system would produce, not a generic buzz. ' +
              `Finish all six under ${TARGET_SECS / 60} minutes for the Terminal Native badge.`)
    ]));

    /* ── mission list ─────────────────────────────────────── */

    function paintMissions() {
      missionList.replaceChildren(...MISSIONS.map(m => {
        const isDone = done.has(m.n);
        const locked = m.n > 1 && !done.has(m.n - 1);
        return el('button.td__mission', {
          class: 'td__mission' + (isDone ? ' done' : ''),
          disabled: locked,
          style: locked ? { opacity: .45 } : {},
          onclick: () => openMission(m.n)
        }, [
          el('b', isDone ? '✓' : String(m.n).padStart(2, '0')),
          el('div', [
            el('span', m.t),
            el('div', { style: { fontSize: '0.625rem', color: 'var(--paper-4)', marginTop: '2px' } },
              'Teaches: ' + m.teaches)
          ]),
          el('span.pill', isDone ? 'done' : locked ? 'locked' : 'open')
        ]);
      }));
    }

    function paintHud() {
      hud.replaceChildren(
        cell('Missions', `${done.size}/6`),
        cell('Time', startedAt ? fmt(elapsed) : '—'),
        cell('Sim cash', rs(acct.cash, 0)),
        cell('Sim shares', num(acct.shares, 0)),
        cell('WACC', acct.wacc ? rs(acct.wacc) : '—')
      );
    }
    // function declarations, not const arrows — paintHud() runs before this line
    function cell(l, v) { return el('div.hud__cell', [el('span.hud__l', l), el('span.hud__v', v)]); }
    function fmt(s) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

    function startClock() {
      if (startedAt) return;
      startedAt = Date.now();
      timer = setInterval(() => { elapsed = (Date.now() - startedAt) / 1000; paintHud(); }, 500);
    }

    function say(msg, ok = false) {
      toast.replaceChildren(el('div', { class: 'td__toast' + (ok ? ' td__toast--ok' : '') }, msg));
      announce(msg);
    }

    /** A ghost hint appears only after 12 seconds of inactivity. */
    function armGhost(selector) {
      clearTimeout(ghostTimer);
      document.querySelectorAll('.td__ghost').forEach(n => n.classList.remove('td__ghost'));
      ghostTimer = setTimeout(() => {
        stage.querySelector(selector)?.classList.add('td__ghost');
      }, 12000);
    }

    function complete(n, msg) {
      done.add(n);
      clearTimeout(ghostTimer);
      say(msg, true);
      paintMissions();
      paintHud();
      if (done.size === 6) {
        clearInterval(timer);
        if (elapsed <= TARGET_SECS) state.grant('terminal-native');
        finish();
      }
    }

    /* ── the simulated windows ────────────────────────────── */

    function win(title, kind, bodyNodes) {
      return el('div.td__win', [
        el('div.td__bar', [
          el('b', kind === 'tms' ? 'TMS — SIMULATION' : kind === 'depo' ? 'DEPOSITORY PORTAL — SIMULATION' : 'BROKER PORTAL — SIMULATION'),
          el('span', { style: { color: 'var(--paper-4)' } }, title),
          el('div.td__dots', [el('i'), el('i'), el('i')])
        ]),
        el('div.td__body', bodyNodes)
      ]);
    }

    function menu(items, activeKey) {
      return el('div.td__menu', items.map(([k, label]) =>
        el('button', { class: k === activeKey ? 'on' : '', onclick: () => openTab(k) }, label)));
    }
    let openTab = () => {};

    /* ── missions ─────────────────────────────────────────── */

    function openMission(n) {
      active = n;
      startClock();
      toast.replaceChildren();
      ({ 1: m1, 2: m2, 3: m3, 4: m4, 5: m5, 6: m6 })[n]();
    }

    /* 1 — fund the account */
    function m1() {
      const amount = el('input', { type: 'number', value: '100000', min: '1000', step: '1000' });
      stage.replaceChildren(win('Deposit', 'broker', [
        el('p.dim', { style: { fontSize: 'var(--t-xs)', marginBottom: 'var(--s4)' } },
          'Mission 1 — fund your trading account. On NEPSE you cannot buy against money that has not cleared.'),
        el('div.td__grid', [
          el('div.td__field', [el('label', 'Amount (Rs.)'), amount]),
          el('div.td__field', [el('label', 'Method'), el('select', [el('option', 'ConnectIPS'), el('option', 'Bank transfer')])]),
          el('div.td__field', [el('label', 'Client code'), el('input', { type: 'text', value: 'SIM-04821', readOnly: true })])
        ]),
        el('div.row', { style: { marginTop: 'var(--s4)' } }, [
          el('button.btn.btn--sm.btn--primary', {
            id: 'tdFund',
            onclick: () => {
              const v = Math.max(0, +amount.value || 0);
              if (v < 1000) return say('Deposit rejected — minimum transfer is Rs. 1,000.');
              acct.cash += v;
              paintHud();
              complete(1, `Rs. ${num(v, 0)} credited to your simulated collection account. In the real system funds must clear before you can place a buy order — deciding to buy and then starting a transfer is how people miss the price they wanted.`);
            }
          }, 'Confirm deposit'),
          el('button.btn.btn--sm', {
            onclick: () => say('You cannot reach Market Watch before funding. That is the mission: NEPSE gives you no margin and no credit, so nothing happens until money has cleared.')
          }, 'Skip to Market Watch')
        ])
      ]));
      armGhost('#tdFund');
    }

    /* 2 — place a buy order, with real band validation */
    function m2() {
      const LTP = 236.00, PREV = 230.00;
      const qty = el('input', { type: 'number', value: '200', min: '10', step: '10' });
      const rate = el('input', { type: 'number', value: '210', step: '0.1' });
      const type = el('select', [el('option', { value: 'limit' }, 'Limit'), el('option', { value: 'market' }, 'Market')]);

      stage.replaceChildren(win('Order entry — UPPER', 'tms', [
        el('div.legend', { style: { marginBottom: 'var(--s4)' } }, [
          el('span', `LTP Rs. ${num(LTP)}`),
          el('span', `Prev close Rs. ${num(PREV)}`),
          el('span', `Circuit Rs. ${num(PREV * 0.85)}–${num(PREV * 1.15)}`),
          el('span', `Band Rs. ${num(LTP * 0.97)}–${num(LTP * 1.03)}`)
        ]),
        el('div.td__grid', [
          el('div.td__field', [el('label', 'Symbol'), el('input', { type: 'text', value: 'UPPER', readOnly: true })]),
          el('div.td__field', [el('label', 'Side'), el('select', [el('option', 'BUY'), el('option', 'SELL')])]),
          el('div.td__field', [el('label', 'Quantity'), qty]),
          el('div.td__field', [el('label', 'Rate'), rate]),
          el('div.td__field', [el('label', 'Order type'), type])
        ]),
        el('p.dim', { style: { fontSize: '0.625rem', marginTop: 'var(--s3)' } },
          'The rate box is pre-filled with Rs. 210 and the type dropdown offers Market. Both are traps — find them.'),
        el('div.row', { style: { marginTop: 'var(--s4)' } }, [
          el('button.btn.btn--sm.btn--primary', { id: 'tdBuy', onclick: submit }, 'Submit order')
        ])
      ]));
      armGhost('#tdBuy');

      function submit() {
        if (type.value === 'market') {
          return say('Order rejected — NEPSE has no market orders. Every order is a limit order and you must name a price. This dropdown exists here only because the muscle memory from other markets is real; the real TMS does not offer the option at all.');
        }
        const q = +qty.value, r = +rate.value;
        if (q < 10 || q % 10 !== 0) return say('Order rejected — the usual minimum lot is 10 kitta, in multiples of 10. Odd lots trade in a separate market.');
        const v = money.validateOrder({ price: r, prevClose: PREV, ltp: LTP, rules });
        if (!v.ok) return say(v.msg);
        const cost = money.tradeCost({ qty: q, price: r, side: 'buy', fees });
        if (cost.total > acct.cash) return say(`Order rejected — insufficient funds. This order costs ${rs(cost.total)} including commission, SEBON fee and DP charge; your cleared balance is ${rs(acct.cash)}.`);
        acct.cash -= cost.total;
        acct.shares += q;
        acct.wacc = cost.wacc;
        paintHud();
        complete(2, `Order accepted: BUY ${num(q, 0)} UPPER @ Rs. ${num(r)}. Total cost ${rs(cost.total)} — commission ${rs(cost.commission)}, SEBON ${rs(cost.sebon)}, DP ${rs(cost.dp)}. Your WACC is ${rs(cost.wacc)}.`);
      }
    }

    /* 3 — order book vs trade book */
    function m3() {
      openTab = k => {
        const isOrder = k === 'order';
        stage.replaceChildren(win(isOrder ? 'Order book' : 'Trade book', 'tms', [
          menu([['order', 'Order book'], ['trade', 'Trade book'], ['port', 'Portfolio']], k),
          el('div.scroll-x', { style: { marginTop: 'var(--s4)' } }, el('table.table', [
            el('thead', el('tr', (isOrder
              ? ['Symbol', 'Side', 'Qty', 'Rate', 'Filled', 'Status']
              : ['Symbol', 'Side', 'Qty', 'Rate', 'Value', 'Time']
            ).map(h => el('th', { scope: 'col' }, h)))),
            el('tbody', isOrder ? [
              el('tr', [el('td', 'UPPER'), el('td', 'BUY'), el('td.n', '200'), el('td.n', '234.00'), el('td.n', '180'), el('td', el('span.pill.pill--signal', 'Partially executed'))]),
              el('tr', [el('td', 'NABIL'), el('td', 'BUY'), el('td.n', '100'), el('td.n', '480.00'), el('td.n', '0'), el('td', el('span.pill', 'Open'))]),
              el('tr', [el('td', 'API'), el('td', 'BUY'), el('td.n', '50'), el('td.n', '300.00'), el('td.n', '0'), el('td', el('span.pill', 'Cancelled'))])
            ] : [
              el('tr', [el('td', 'UPPER'), el('td', 'BUY'), el('td.n', '180'), el('td.n', '234.00'), el('td.n', '42,120.00'), el('td', '13:20:14')])
            ])
          ])),
          el('p.dim', { style: { fontSize: '0.625rem', marginTop: 'var(--s3)' } },
            isOrder ? 'Three orders here. How many actually bought you shares?' : 'One row. This is what you own.'),
          el('div.row', { style: { marginTop: 'var(--s4)' } }, [
            el('button.btn.btn--sm', { onclick: () => answer(200) }, '200 kitta'),
            el('button.btn.btn--sm', { id: 'tdRight', onclick: () => answer(180) }, '180 kitta'),
            el('button.btn.btn--sm', { onclick: () => answer(350) }, '350 kitta')
          ])
        ]));
      };
      openTab('order');
      armGhost('#tdRight');

      function answer(v) {
        if (v === 180) {
          complete(3, 'Correct — 180 kitta. The order book showed a 200-kitta order, but only 180 filled; the remaining 20 stayed live and expire at the close. Only the trade book means shares. And note the cost: if those 20 fill tomorrow instead, you settle on a second date and pay the Rs. 25 DP charge twice.');
        } else if (v === 200) {
          say('No — 200 is what you ordered, not what you own. The order book shows submissions; the trade book shows executions. This is the most common TMS mistake and it leads people to miscount their position.');
        } else {
          say('No — you are adding the open NABIL order, which has filled nothing at all. An order sitting at your price may never fill, and that is not a failure. It is you refusing to overpay.');
        }
      }
    }

    /* 4 — sell, then EDIS. The flagship. */
    function m4() {
      let day = 'T';
      acct.pendingSell = acct.pendingSell || null;

      const render = () => {
        if (day === 'T') {
          stage.replaceChildren(win('Order entry — sell', 'tms', [
            el('p.dim', { style: { fontSize: 'var(--t-xs)', marginBottom: 'var(--s4)' } },
              `Mission 4 — sell ${num(acct.shares, 0)} kitta, then do the step almost everybody misses.`),
            el('div.td__grid', [
              el('div.td__field', [el('label', 'Symbol'), el('input', { value: 'UPPER', readOnly: true })]),
              el('div.td__field', [el('label', 'Side'), el('input', { value: 'SELL', readOnly: true })]),
              el('div.td__field', [el('label', 'Quantity'), el('input', { type: 'number', value: String(acct.shares), readOnly: true })]),
              el('div.td__field', [el('label', 'Rate'), el('input', { type: 'number', value: '241.00', readOnly: true })])
            ]),
            el('div.row', { style: { marginTop: 'var(--s4)' } },
              el('button.btn.btn--sm.btn--primary', {
                id: 'tdSell',
                onclick: () => {
                  acct.pendingSell = { qty: acct.shares, rate: 241.00, authorised: false };
                  day = 'T+1';
                  say('Sale executed and visible in your trade book. The clock advances to T+1.');
                  render();
                }
              }, 'Submit sell order'))
          ]));
          armGhost('#tdSell');
          return;
        }

        // T+1 — the trap
        const authorised = acct.pendingSell?.authorised;
        stage.replaceChildren(
          !authorised && el('div.td__toast', { style: { marginBottom: 'var(--s3)' } },
            'Your sale is unauthorised. You have until the end of the day to submit EDIS, or the trade fails to auction settlement.'),
          win('My EDIS', 'depo', [
            menu([['edis', 'My EDIS'], ['port', 'My Portfolio'], ['asba', 'My ASBA']], 'edis'),
            el('div.scroll-x', { style: { marginTop: 'var(--s4)' } }, el('table.table', [
              el('thead', el('tr', ['Symbol', 'Qty', 'Rate', 'Settlement', 'Status'].map(h => el('th', { scope: 'col' }, h)))),
              el('tbody', el('tr', [
                el('td', 'UPPER'), el('td.n', num(acct.pendingSell.qty, 0)), el('td.n', '241.00'), el('td', 'T+2'),
                el('td', authorised ? el('span.pill.pill--bull', '✓ Authorised') : el('span.pill.pill--bear', 'Awaiting EDIS'))
              ]))
            ])),
            !authorised && el('div.td__grid', { style: { marginTop: 'var(--s4)' } }, [
              el('div.td__field', [el('label', 'Demat transaction PIN'),
                el('input', { type: 'password', value: '', placeholder: 'Practice PIN — type anything', id: 'tdPin' })])
            ]),
            el('div.row', { style: { marginTop: 'var(--s4)' } }, [
              !authorised && el('button.btn.btn--sm.btn--primary', {
                id: 'tdEdis',
                onclick: () => {
                  const pin = stage.querySelector('#tdPin')?.value || '';
                  if (!pin) return say('EDIS rejected — the transaction PIN is required. This is a different PIN from your login password, and it exists precisely because nobody, including the exchange, can move shares out of your Demat without you.');
                  acct.pendingSell.authorised = true;
                  const c = money.tradeCost({ qty: acct.pendingSell.qty, price: 241.00, side: 'sell', fees });
                  const tax = money.cgt({ netBeforeTax: c.netBeforeTax, costBasis: acct.wacc * acct.pendingSell.qty, holdingDays: 40, fees });
                  acct.cash += c.netBeforeTax - tax.tax;
                  acct.shares = 0;
                  paintHud();
                  if (edisFailedOnce) state.grant('the-edis-lesson');
                  complete(4, `EDIS authorised. Shares blocked for delivery, settling T+2. Net ${rs(c.netBeforeTax)} less CGT ${rs(tax.tax)} (${tax.band}) → ${rs(c.netBeforeTax - tax.tax)} to your bank. This step is the bridge between NEPSE and CDSC, and you are the only one who can walk across it.`);
                  render();
                }
              }, 'Submit EDIS'),
              !authorised && el('button.btn.btn--sm', {
                onclick: () => {
                  edisFailedOnce = true;
                  state.load().stats.tdEdisFailed = true;
                  say('You navigated away with the sale unauthorised. End of day passed. The trade has gone to AUCTION SETTLEMENT: NEPSE buys the shares in the market to deliver to your buyer, and charges you the price difference plus a penalty. Your broker may also restrict your account. Nothing teaches EDIS like failing it once, in a place where failing is free — now go back and do it properly.');
                }
              }, 'Navigate away')
            ])
          ]));
        armGhost('#tdEdis');
      };
      render();
    }

    /* 5 — C-ASBA */
    function m5() {
      const units = el('input', { type: 'number', value: '10', min: '10', step: '10' });
      const bank = el('select', [el('option', { value: '' }, '— select bank —'), el('option', 'Everest Bank'), el('option', 'Nabil Bank')]);
      const boid = el('input', { type: 'text', value: '', placeholder: '16-digit BOID' });

      stage.replaceChildren(win('My ASBA — apply', 'depo', [
        menu([['asba', 'My ASBA'], ['reports', 'Application report'], ['port', 'My Portfolio']], 'asba'),
        el('div', { style: { marginTop: 'var(--s4)' } }, [
          el('p.dim', { style: { fontSize: 'var(--t-xs)' } },
            'Issue: illustrative 10 MW hydropower IPO · Rs. 100 face value · minimum 10 units · closes Friday.')
        ]),
        el('div.td__grid', { style: { marginTop: 'var(--s3)' } }, [
          el('div.td__field', [el('label', 'Units'), units]),
          el('div.td__field', [el('label', 'Bank for blocking'), bank]),
          el('div.td__field', [el('label', 'Verify DMAT (BOID)'), boid])
        ]),
        el('div.row', { style: { marginTop: 'var(--s4)' } }, [
          el('button.btn.btn--sm.btn--primary', { id: 'tdAsba', onclick: apply }, 'Submit application'),
          el('button.btn.btn--sm', {
            onclick: () => {
              if (!acct.ipoApplied) return say('You have not applied yet.');
              say('Rejected — duplicate application. Only one application per person per issue is permitted, and submitting a second can void both. People do this thinking it doubles their odds; it does the opposite.');
            }
          }, 'Apply a second time')
        ])
      ]));
      armGhost('#tdAsba');

      function apply() {
        const u = +units.value;
        if (u < fees.ipo.fixedPriceMinUnits || u % 10 !== 0)
          return say(`Rejected — the minimum for a fixed-price issue is ${fees.ipo.fixedPriceMinUnits} units, in multiples of 10.`);
        if (!bank.value) return say('Rejected — you must choose the bank where the amount will be blocked. C-ASBA blocks funds in your own account; it does not debit them.');
        if (!/^\d{16}$/.test(boid.value)) return say('Rejected — the BOID must be exactly 16 digits. This is the verify-DMAT step, and it is what links the application to the account the shares would be credited to. Try 1301234500001234.');
        const amount = u * fees.ipo.fixedPriceFaceValue;
        acct.ipoApplied = true;
        complete(5, `Application submitted for ${u} units — ${rs(amount)} BLOCKED in your ${bank.value} account, not debited. If you are not allotted, the block is simply released and you keep any interest. That is the part of the Nepali system that genuinely works well.`);
      }
    }

    /* 6 — allotment and WACC */
    function m6() {
      acct.allotted = 10;
      stage.replaceChildren(win('My Portfolio', 'depo', [
        menu([['port', 'My Portfolio'], ['reports', 'Application report'], ['asba', 'My ASBA']], 'port'),
        el('div.scroll-x', { style: { marginTop: 'var(--s4)' } }, el('table.table', [
          el('thead', el('tr', ['Symbol', 'Balance', 'WACC', 'LTP', 'Value'].map(h => el('th', { scope: 'col' }, h)))),
          el('tbody', [
            el('tr', [el('td', 'HYDRO-SIM'), el('td.n', '10'), el('td.n', '100.00'), el('td.n', '318.00'), el('td.n', '3,180.00')]),
            el('tr', [el('td', 'NABIL'), el('td.n', '200'), el('td.n', '498.02'), el('td.n', '496.10'), el('td.n', '99,220.00')])
          ])
        ])),
        el('p.dim', { style: { fontSize: '0.625rem', marginTop: 'var(--s3)' } },
          'Allotted: 10 units. Read the table, then answer: what does the WACC column tell you about NABIL?'),
        el('div.row', { style: { marginTop: 'var(--s4)' } }, [
          el('button.btn.btn--sm', { onclick: () => wrong('market') }, 'What NABIL is worth today'),
          el('button.btn.btn--sm', { id: 'tdWacc', onclick: right }, 'What you paid on average, per share'),
          el('button.btn.btn--sm', { onclick: () => wrong('target') }, 'The price you should sell at')
        ])
      ]));
      armGhost('#tdWacc');

      function right() {
        complete(6, 'Correct. WACC is your average cost per share — and it is the official basis your capital gains tax is computed against. Here NABIL cost you Rs. 498.02 and trades at Rs. 496.10, so you are marginally down, not up. Read those two columns together, always.');
      }
      function wrong(kind) {
        say(kind === 'market'
          ? 'No — that is the LTP column. WACC is what you paid, on average. People read the WACC column as market value and reach exactly the wrong conclusion about whether they are up or down.'
          : 'No — nothing in MeroShare suggests a selling price, and your entry price is irrelevant to what a company is worth today. That is the anchoring trap in Lesson 15.3.');
      }
    }

    /* ── finish ───────────────────────────────────────────── */

    function finish() {
      const score = Math.max(100, Math.round(3000 - elapsed * 4));
      const rec = ctx.onEnd({ score, accuracy: 1, meta: { seconds: Math.round(elapsed) } });
      const fast = elapsed <= TARGET_SECS;

      stage.replaceChildren(el('div.result', [
        el('div.result__score', num(score, 0)),
        el('div.result__l', 'All six missions complete'),
        el('div.result__grid', [
          rc('Time', fmt(elapsed)),
          rc('Target', fmt(TARGET_SECS)),
          rc('Badge', fast ? 'Terminal Native ✓' : 'not this run'),
          rc('Personal best', num(rec.best, 0))
        ]),
        rec.isFirst ? el('div.result__pb', '+100 XP — first play')
          : rec.beat ? el('div.result__pb', '★ New personal best · +75 XP')
          : el('div.result__pb', '+25 XP — replay'),
        el('div.callout.callout--warn', { style: { marginTop: 'var(--s5)', textAlign: 'left' } }, [
          el('span.callout__l', 'The one that matters'),
          el('p', 'Mission 4. Nothing in this course will cost you more real money than forgetting EDIS on a T+1 ' +
                  'afternoon. If you failed it here first, that was Rs. 0 and a lesson. Failing it for real is auction ' +
                  'settlement, a penalty, and an annoyed broker.')
        ]),
        el('div.row', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
          el('button.btn.btn--primary', { onclick: () => location.reload() }, 'Run it again'),
          el('a.btn', { href: '#/games' }, 'All games')
        ])
      ]));
      announce(`All six missions complete in ${fmt(elapsed)}.`);
    }
    const rc = (l, v) => el('div.result__cell', [el('span.hud__l', l), el('span.hud__v', v)]);

    cleanup = () => { clearInterval(timer); clearTimeout(ghostTimer); };
  },

  unmount() { cleanup?.(); cleanup = null; }
};
