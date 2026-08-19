/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — SMA, EMA, RSI, MACD, and swing structure
   Every function returns an array the same length as the input,
   with null where there is not yet enough history to compute.
   ═══════════════════════════════════════════════════════════════ */

export function sma(values, n) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

export function ema(values, n) {
  const out = new Array(values.length).fill(null);
  if (values.length < n) return out;
  const k = 2 / (n + 1);
  let prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. 0–100. Overbought is not a sell signal. */
export function rsi(values, n = 14) {
  const out = new Array(values.length).fill(null);
  if (values.length <= n) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= n; loss /= n;
  out[n] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = n + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (n - 1) + (d > 0 ? d : 0)) / n;
    loss = (loss * (n - 1) + (d < 0 ? -d : 0)) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/** MACD line, signal, and the histogram — momentum of momentum. */
export function macd(values, fast = 12, slow = 26, signalN = 9) {
  const ef = ema(values, fast), es = ema(values, slow);
  const line = values.map((_, i) => (ef[i] == null || es[i] == null) ? null : ef[i] - es[i]);
  const valid = line.filter(v => v != null);
  const sigRaw = ema(valid, signalN);
  const firstIdx = line.findIndex(v => v != null);
  const signal = new Array(values.length).fill(null);
  for (let i = 0; i < sigRaw.length; i++) if (sigRaw[i] != null) signal[firstIdx + i] = sigRaw[i];
  const hist = line.map((v, i) => (v == null || signal[i] == null) ? null : v - signal[i]);
  return { line, signal, hist };
}

/**
 * Trend at index i, by comparing the close 10 bars back against a 10-period SMA.
 * This is what makes a pattern's "requires: downtrend" enforceable rather than
 * hand-waved, so it is worth being explicit about.
 */
export function trendAt(candles, i, look = 10) {
  if (i < look + 1) return 'none';
  const closes = candles.slice(i - look, i).map(c => c.c);
  const avg = closes.reduce((a, b) => a + b, 0) / closes.length;
  const ref = candles[i - look].c;
  const now = candles[i].c;
  const slope = (now - ref) / ref;
  if (slope < -0.02 && now < avg) return 'down';
  if (slope > 0.02 && now > avg) return 'up';
  return 'side';
}

/** Swing highs and lows — the raw material for support and resistance. */
export function swings(candles, k = 3) {
  const highs = [], lows = [];
  for (let i = k; i < candles.length - k; i++) {
    let isH = true, isL = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (candles[j].h >= candles[i].h) isH = false;
      if (candles[j].l <= candles[i].l) isL = false;
    }
    if (isH) highs.push(i);
    if (isL) lows.push(i);
  }
  return { highs, lows };
}

/** Average daily turnover in rupees — the liquidity check before any pattern. */
export function avgTurnover(candles, n = 20) {
  const s = candles.slice(-n);
  if (!s.length) return 0;
  return s.reduce((a, c) => a + c.c * (c.v || 0), 0) / s.length;
}

export function maxDrawdown(series) {
  let peak = -Infinity, mdd = 0, peakAt = 0, troughAt = 0, curPeak = 0;
  series.forEach((v, i) => {
    if (v > peak) { peak = v; curPeak = i; }
    const dd = (peak - v) / peak;
    if (dd > mdd) { mdd = dd; peakAt = curPeak; troughAt = i; }
  });
  return { mdd, peakAt, troughAt };
}
