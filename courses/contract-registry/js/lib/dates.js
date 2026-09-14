/* Calendar-day arithmetic. The contract counts calendar days (1.1(n)).
   All dates are handled as local midnight to avoid timezone drift. */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MON = MONTHS.map((m) => m.slice(0, 3));

export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromIso = (s) => { const [y, m, d] = String(s).split('-').map(Number); return y ? new Date(y, (m || 1) - 1, d || 1) : null; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
export const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };
export const diffDays = (a, b) => Math.round((b - a) / 86400000);
export const fmt = (d) => d ? `${d.getDate()} ${MONTHS[d.getMonth()][0].toUpperCase()}${MONTHS[d.getMonth()].slice(1)} ${d.getFullYear()}` : '—';
export const fmtShort = (d) => d ? `${d.getDate()} ${MON[d.getMonth()][0].toUpperCase()}${MON[d.getMonth()].slice(1)} ${d.getFullYear()}` : '—';
export const weekday = (d) => d.toLocaleDateString('en-GB', { weekday: 'short' });

export function add(d, n, unit) {
  if (unit === 'hours') return addDays(d, Math.ceil(n / 24));
  if (unit === 'month' || unit === 'months') return addMonths(d, n);
  if (unit === 'years') return addYears(d, n);
  return addDays(d, n);
}

/* Find dates written the way letters write them. Returns [{date, index, raw}] */
export function findDates(text) {
  const out = [];
  const push = (y, m, d, index, raw) => {
    const dt = new Date(y, m, d);
    if (dt.getFullYear() === y && dt.getMonth() === m && y > 2015 && y < 2040) out.push({ date: dt, index, raw });
  };
  const monRe = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  const mi = (s) => MON.indexOf(s.slice(0, 3).toLowerCase());
  for (const m of text.matchAll(new RegExp(`\\b(\\d{1,2})\\s*(?:st|nd|rd|th|™|")?\\s+${monRe}\\.?,?\\s+(\\d{4})\\b`, 'gi'))) push(+m[3], mi(m[2]), +m[1], m.index, m[0]);
  for (const m of text.matchAll(new RegExp(`\\b${monRe}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'))) push(+m[3], mi(m[1]), +m[2], m.index, m[0]);
  for (const m of text.matchAll(/\b(20\d\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) push(+m[1], +m[2] - 1, +m[3], m.index, m[0]);
  for (const m of text.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d\d)\b/g)) push(+m[3], +m[2] - 1, +m[1], m.index, m[0]);
  return out.sort((a, b) => a.index - b.index);
}
