/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — data access
   Everything that could change lives in data/*.json, never in code.
   Lesson files and candle series load lazily, per module and per symbol.
   ═══════════════════════════════════════════════════════════════ */

const cache = new Map();

async function get(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(new URL(`../data/${path}`, import.meta.url))
    .then(r => {
      if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
      return r.json();
    })
    .catch(err => {
      cache.delete(path);
      throw err;
    });
  cache.set(path, p);
  return p;
}

/** The core files the shell cannot render without. Loaded once, in parallel. */
export async function boot() {
  const [modules, fees, rules, index, securities, glossary, patterns] = await Promise.all([
    get('modules.json'), get('fees.json'), get('market-rules.json'),
    get('index-history.json'), get('securities.json'),
    get('glossary.json'), get('patterns.json')
  ]);
  return { modules, fees, rules, index, securities, glossary, patterns };
}

/** Loaded on demand by Circuit Breaker only. */
export const statements = () => get('statements.json');

export const lessonsFor = m => get(`lessons/m${String(m).padStart(2, '0')}.json`);
export const quizBank = () => get('quiz-bank.json');
export const candles = sym => get(`candles/${sym}.json`);

/** Resolve one lesson by its "7.3" id. */
export async function lesson(id) {
  const [m] = id.split('.');
  const file = await lessonsFor(+m);
  return file.lessons.find(l => l.id === id) || null;
}
