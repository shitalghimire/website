/* ═══════════════════════════════════════════════════════════════
   Verify every worked-example figure in the lessons against the
   money engine. Run after any change to data/fees.json.

     node tools/check-figures.mjs

   © 2026 Shital Ghimire. All rights reserved.
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fees = JSON.parse(readFileSync(join(ROOT, 'data/fees.json'), 'utf8'));
const m = await import(pathToFileURL(join(ROOT, 'js/money.js')).href);

let fail = 0, pass = 0;
const chk = (label, got, want, tol = 0.02) => {
  const ok = Math.abs(got - want) <= tol;
  ok ? pass++ : fail++;
  if (!ok) console.log(`FAIL ${label.padEnd(46)} got ${got.toFixed(2).padStart(12)}  want ${want.toFixed(2)}`);
};

/* ── 7.1 · commission slabs are not marginal ────────────────── */
chk('7.1 Rs 4,90,000 commission', m.tradeCost({ qty: 1, price: 490000, side: 'buy', fees }).commission, 1617);
chk('7.1 Rs 5,10,000 commission', m.tradeCost({ qty: 1, price: 510000, side: 'buy', fees }).commission, 1581);
chk('7.1 Rs 5,00,000 commission', m.tradeCost({ qty: 1, price: 500000, side: 'buy', fees }).commission, 1650);

/* ── 7.2 · the fee table ────────────────────────────────────── */
for (const [v, comm, tot] of [[1000, 3.60, 28.75], [50000, 180, 212.50], [500000, 1650, 1750]]) {
  const c = m.tradeCost({ qty: 1, price: v, side: 'buy', fees });
  chk(`7.2 Rs ${v} commission`, c.commission, comm);
  chk(`7.2 Rs ${v} one-way cost`, c.commission + c.sebon + c.dp, tot);
}

/* ── 7.3 · NABIL 200 @ 496.10 → 560 ─────────────────────────── */
const b73 = m.tradeCost({ qty: 200, price: 496.10, side: 'buy', fees });
const s73 = m.tradeCost({ qty: 200, price: 560, side: 'sell', fees });
chk('7.3 cost basis', b73.total, 99587.31);
chk('7.3 WACC', b73.wacc, 497.94, 0.005);
chk('7.3 net before tax', s73.netBeforeTax, 111588.60);
chk('7.3 taxable gain', s73.netBeforeTax - b73.total, 12001.29);
for (const [d, tax, net, prof, ret] of [[243, 1200.13, 110388.47, 10801.16, 10.85], [426, 900.10, 110688.50, 11101.19, 11.15]]) {
  const t = m.cgt({ netBeforeTax: s73.netBeforeTax, costBasis: b73.total, holdingDays: d, fees });
  chk(`7.3 ${d}d tax`, t.tax, tax);
  chk(`7.3 ${d}d profit`, s73.netBeforeTax - t.tax - b73.total, prof);
  chk(`7.3 ${d}d return %`, (s73.netBeforeTax - t.tax - b73.total) / b73.total * 100, ret, 0.01);
}

/* ── 7.4 · the break-even table. These three are the spec's
       acceptance criteria, with UPPER corrected to its true slab. ── */
for (const [q, p, comm, tot, wacc, be, mv] of [
  [10, 100, 3.60, 1028.75, 102.88, 105.77, 5.77],
  [200, 496.10, 327.43, 99587.31, 497.94, 499.79, 0.74],
  [1000, 230, 759.00, 230818.50, 230.82, 231.64, 0.71]]) {
  const c = m.tradeCost({ qty: q, price: p, side: 'buy', fees });
  chk(`7.4 ${q}@${p} commission`, c.commission, comm);
  chk(`7.4 ${q}@${p} total cost`, c.total, tot);
  chk(`7.4 ${q}@${p} WACC`, c.wacc, wacc, 0.01);
  const e = m.breakEven({ qty: q, price: p, fees });
  chk(`7.4 ${q}@${p} break-even`, e.price, be);
  chk(`7.4 ${q}@${p} move %`, e.movePct * 100, mv, 0.01);
}

/* ── 7.5 · SANIMA round trip, both directions ───────────────── */
const b75 = m.tradeCost({ qty: 300, price: 330, side: 'buy', fees });
const s75 = m.tradeCost({ qty: 300, price: 368, side: 'sell', fees });
const t75 = m.cgt({ netBeforeTax: s75.netBeforeTax, costBasis: b75.total, holdingDays: 426, fees });
chk('7.5 buy total', b75.total, 99366.55);
chk('7.5 WACC', b75.wacc, 331.22, 0.01);
chk('7.5 sell fees', s75.commission + s75.sebon + s75.dp, 405.88);
chk('7.5 net before tax', s75.netBeforeTax, 109994.12);
chk('7.5 gain', t75.gain, 10627.57);
chk('7.5 CGT 7.5%', t75.tax, 797.07);
chk('7.5 profit', s75.netBeforeTax - t75.tax - b75.total, 9830.50);
chk('7.5 return %', (s75.netBeforeTax - t75.tax - b75.total) / b75.total * 100, 9.89, 0.01);
const l75 = m.tradeCost({ qty: 300, price: 300, side: 'sell', fees });
chk('7.5 loss case net', l75.netBeforeTax, 89664.50);
chk('7.5 loss case loss', l75.netBeforeTax - b75.total, -9702.05);

/* ── 5.2 / 5.4 · split fills cost two DP charges ────────────── */
const one = m.tradeCost({ qty: 500, price: 234, side: 'buy', fees });
const d1 = m.tradeCost({ qty: 180, price: 234, side: 'buy', fees });
const d2 = m.tradeCost({ qty: 320, price: 238, side: 'buy', fees });
chk('5.2 500@234 single fill', one.total, 117428.65);
chk('5.4 180@234 day one', d1.total, 42302.95);
chk('5.4 320@238 day two', d2.total, 76447.75);
chk('5.4 combined', d1.total + d2.total, 118750.70);
chk('5.4 difference', d1.total + d2.total - one.total, 1322.05);

/* ── 5.5 · patience versus chasing ──────────────────────────── */
for (const [p, want] of [[239.60, 120238.31], [240.50, 120689.87], [243.00, 121944.17]]) {
  chk(`5.5 500 @ ${p}`, m.tradeCost({ qty: 500, price: p, side: 'buy', fees }).total, want);
}
chk('5.5 patience saved',
  m.tradeCost({ qty: 500, price: 243, side: 'buy', fees }).total -
  m.tradeCost({ qty: 500, price: 239.60, side: 'buy', fees }).total, 1705.86);

/* ── 6.3 · friction halves wins and amplifies losses ────────── */
const up = m.roundTrip({ qty: 500, buyPrice: 234, sellPrice: 238, holdingDays: 2, fees });
const dn = m.roundTrip({ qty: 500, buyPrice: 234, sellPrice: 230, holdingDays: 2, fees });
chk('6.3 gain on +1.71%', up.profit, 1022.22, 0.5);
chk('6.3 loss on −1.71%', dn.profit, -2850.40, 0.5);

/* ── rules ──────────────────────────────────────────────────── */
const rules = JSON.parse(readFileSync(join(ROOT, 'data/market-rules.json'), 'utf8'));
const band = m.bandRange(236, rules), circ = m.circuitRange(230, rules);
chk('5.1 band low', band.lo, 228.92);
chk('5.1 band high', band.hi, 243.08);
chk('5.1 circuit low', circ.lo, 195.50);
chk('5.1 circuit high', circ.hi, 264.50);

/* ── CGT boundary: 365 is short, 366 is long ────────────────── */
const bandOf = d => m.cgt({ netBeforeTax: 100000, costBasis: 60000, holdingDays: d, fees }).band;
if (bandOf(365) !== 'short-term') { console.log('FAIL 365 days must be short-term'); fail++; } else pass++;
if (bandOf(366) !== 'long-term') { console.log('FAIL 366 days must be long-term'); fail++; } else pass++;

console.log(fail
  ? `\n${fail} MISMATCH${fail === 1 ? '' : 'ES'} — ${pass} passed`
  : `all ${pass} lesson figures verified against data/fees.json`);
process.exit(fail ? 1 : 0);
