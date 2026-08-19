/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — the single source of truth every game and widget calls.
   Nothing here hardcodes a rate. Every number arrives from fees.json,
   so a Nepali rule change is a one-file edit.
   ═══════════════════════════════════════════════════════════════ */

/** The commission slab that applies to a gross transaction value. */
export function slabFor(gross, fees) {
  return fees.commissionSlabs.find(s => s.max !== null && gross <= s.max)
      ?? fees.commissionSlabs[fees.commissionSlabs.length - 1];
}

/**
 * Cost of one leg of a trade.
 * Slabs apply to the WHOLE amount, not marginally — crossing a boundary
 * can therefore lower your total commission.
 */
export function tradeCost({ qty, price, side, fees }) {
  const gross = qty * price;
  const slab = slabFor(gross, fees);
  const commission = round2(gross * slab.rate);
  const sebon = round2(gross * fees.sebonEquity);
  const dp = fees.dpCharge;

  if (side === 'buy') {
    const total = round2(gross + commission + sebon + dp);
    return { gross, slab, commission, sebon, dp, total, wacc: +(total / qty).toFixed(4) };
  }
  const netBeforeTax = round2(gross - commission - sebon - dp);
  return { gross, slab, commission, sebon, dp, netBeforeTax };
}

/**
 * Capital gains tax. Withheld at source, computed on profit over cost basis.
 * 365 days exactly is SHORT term — the threshold is "more than 365".
 */
export function cgt({ netBeforeTax, costBasis, holdingDays, investorType = 'individual', fees }) {
  const gain = round2(netBeforeTax - costBasis);
  if (gain <= 0) return { gain, rate: 0, tax: 0, band: 'no gain' };
  const rate = investorType === 'institution'
    ? fees.cgt.institution
    : (holdingDays > fees.cgt.longTermThresholdDays ? fees.cgt.individualLong : fees.cgt.individualShort);
  const band = investorType === 'institution' ? 'institutional'
    : (holdingDays > fees.cgt.longTermThresholdDays ? 'long-term' : 'short-term');
  return { gain, rate, tax: round2(gain * rate), band };
}

/** What the old (pre-17 July 2026) regime would have charged. For the comparison widget. */
export function cgtPrevious({ gain, holdingDays, investorType = 'individual', fees }) {
  if (gain <= 0) return { rate: 0, tax: 0 };
  const p = fees.cgt.previous;
  const rate = investorType === 'institution'
    ? fees.cgt.institution
    : (holdingDays > fees.cgt.longTermThresholdDays ? p.individualLong : p.individualShort);
  return { rate, tax: round2(gain * rate) };
}

/**
 * The price you must reach just to be level.
 *   S = [ Q·P·(1 + c + sebon) + 2·DP ] / [ Q · (1 − c − sebon) ]
 * Below break-even there is no gain, so there is no CGT — the one mercy.
 */
export function breakEven({ qty, price, fees }) {
  const buy = tradeCost({ qty, price, side: 'buy', fees });
  const sebon = fees.sebonEquity;
  // The sell-side slab depends on the sell value, which depends on the answer.
  // Solve with the buy-side slab, then re-solve once with the implied sell slab.
  let s = solve(slabFor(qty * price, fees).rate);
  s = solve(slabFor(qty * s, fees).rate);

  function solve(sellRate) {
    const numerator = buy.total + fees.dpCharge;
    const denominator = qty * (1 - sellRate - sebon);
    return numerator / denominator;
  }
  const bePrice = round2(s);
  return {
    buy,
    price: bePrice,
    movePct: (bePrice - price) / price,
    wacc: buy.wacc
  };
}

/** Full round trip: buy, hold, sell — every rupee accounted for. */
export function roundTrip({ qty, buyPrice, sellPrice, holdingDays = 100, investorType = 'individual', fees }) {
  const buy = tradeCost({ qty, price: buyPrice, side: 'buy', fees });
  const sell = tradeCost({ qty, price: sellPrice, side: 'sell', fees });
  const tax = cgt({ netBeforeTax: sell.netBeforeTax, costBasis: buy.total, holdingDays, investorType, fees });
  const net = round2(sell.netBeforeTax - tax.tax);
  const profit = round2(net - buy.total);
  return {
    buy, sell, tax, net, profit,
    returnPct: profit / buy.total,
    priceMovePct: (sellPrice - buyPrice) / buyPrice,
    totalCosts: round2(buy.commission + buy.sebon + buy.dp + sell.commission + sell.sebon + sell.dp + tax.tax),
    frictionPct: (sellPrice - buyPrice) / buyPrice - profit / buy.total
  };
}

/** WACC across lots, the way MeroShare computes your tax cost basis. */
export function wacc(lots) {
  const q = lots.reduce((s, l) => s + l.qty, 0);
  if (!q) return 0;
  const c = lots.reduce((s, l) => s + l.qty * l.cost, 0);
  return +(c / q).toFixed(4);
}

/** Position size is derived from the stop — never chosen first. */
export function positionSize({ account, riskPct, entry, stop }) {
  const rupeeRisk = account * riskPct;
  const perShare = entry - stop;
  if (perShare <= 0) return { rupeeRisk, perShare, qty: 0, cost: 0, exposurePct: 0 };
  const qty = Math.floor(rupeeRisk / perShare);
  const cost = qty * entry;
  return { rupeeRisk, perShare, qty, cost, exposurePct: cost / account };
}

/** Recovery arithmetic: G = L / (1 − L). Vertical past 25%. */
export const recoveryFor = loss => loss >= 1 ? Infinity : loss / (1 - loss);

/* ── market rules ───────────────────────────────────────────── */

/** The ±15% daily circuit, measured from the PREVIOUS CLOSE. */
export function circuitRange(prevClose, rules) {
  const l = rules.dailyCircuit.limit;
  return { lo: round2(prevClose * (1 - l)), hi: round2(prevClose * (1 + l)), limit: l };
}

/** The ±3% order band, measured from the LAST TRADED PRICE. Different limit. */
export function bandRange(ltp, rules) {
  const b = rules.orderPriceBand.band;
  return { lo: round2(ltp * (1 - b)), hi: round2(ltp * (1 + b)), band: b };
}

/**
 * Validate an order against BOTH limits. Every rejection names its rule —
 * a rejection message is a teaching moment, so the copy matters.
 */
export function validateOrder({ price, prevClose, ltp, rules }) {
  const c = circuitRange(prevClose, rules);
  const b = bandRange(ltp, rules);
  if (price < c.lo || price > c.hi) {
    return {
      ok: false, rule: 'circuit',
      msg: `Rejected — outside the daily circuit. A stock may move at most ±${(c.limit * 100).toFixed(0)}% from its previous close of Rs. ${prevClose.toFixed(2)}, so today's permitted range is Rs. ${c.lo.toFixed(2)} to Rs. ${c.hi.toFixed(2)}.`
    };
  }
  if (price < b.lo || price > b.hi) {
    return {
      ok: false, rule: 'band',
      msg: `Rejected — outside the order price band. Orders must sit within ±${(b.band * 100).toFixed(0)}% of the last traded price of Rs. ${ltp.toFixed(2)}, which is Rs. ${b.lo.toFixed(2)} to Rs. ${b.hi.toFixed(2)}. The daily circuit is wider, but both limits apply at once.`
    };
  }
  return { ok: true };
}

/** Trading days only — Monday to Friday since April 2026. */
export function isTradingDay(date, rules) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return rules.tradingDays.includes(names[new Date(date).getDay()]);
}

/** Settlement counts TRADING days. A Thursday sale settles on Monday. */
export function addTradingDays(date, n, rules) {
  const d = new Date(date);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (isTradingDay(d, rules)) left--;
  }
  return d;
}

export function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
