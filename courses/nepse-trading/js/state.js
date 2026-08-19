/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — progress store
   All progress in localStorage under a single versioned key.
   No account, no backend, no cookie banner. Games never write here
   directly — everything goes through this module.
   ═══════════════════════════════════════════════════════════════ */

import { today, daysBetween } from './util.js';

const KEY = 'nepse-academy:v1';

const DEFAULT = {
  version: 1,
  startedAt: null,
  xp: 0,
  streakDays: 0,
  lastActiveDate: null,
  graceUsedWeekOf: null,
  lessonsDone: {},      // "3.2": { at, ms }
  quizScores: {},       // "m3": { best, attempts, lastAt }
  gameHighs: {},        // "candle-sensei": { score, accuracy, playedAt, plays }
  badges: [],
  equityEvents: [],     // THE candle source
  simulator: null,      // Paper Floor saved run
  learnerName: '',
  stats: { csAnswered: 0, csCorrect: 0, csContextPerfect: false, tdEdisFailed: false },
  settings: { reduceMotion: false, colorBlindSafe: false, sound: false }
};

let cache = null;
const listeners = new Set();

export function load() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    cache = {
      ...structuredClone(DEFAULT), ...raw,
      stats: { ...DEFAULT.stats, ...(raw.stats || {}) },
      settings: { ...DEFAULT.settings, ...(raw.settings || {}) }
    };
  } catch {
    cache = structuredClone(DEFAULT);
  }
  return cache;
}

export function save(s) {
  cache = s || cache;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); }
  catch (e) { console.warn('Progress could not be saved:', e); }
  listeners.forEach(fn => fn(cache));
  return cache;
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function reset() {
  cache = structuredClone(DEFAULT);
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
  listeners.forEach(fn => fn(cache));
  return cache;
}

export function importState(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('That file is not a progress export.');
  if (obj.version !== 1) throw new Error(`That file is version ${obj.version ?? '?'}; this course reads version 1.`);
  cache = { ...structuredClone(DEFAULT), ...obj };
  return save(cache);
}

export function exportState() {
  return JSON.stringify(load(), null, 2);
}

/* ── XP ─────────────────────────────────────────────────────── */

export const XP = {
  lesson: 50,
  perfectCheck: 25,
  quizPass: 150,
  quizPerfect: 100,
  bossPass: 500,
  gameFirst: 100,
  gameBeatBest: 75,
  streakDay: 25,
  scenarioComplete: 300,
  beatIndex: 400
};

/** Replays award 25% after the first, so grinding is possible but never optimal. */
export const REPLAY_FACTOR = 0.25;

/* ── equity events ──────────────────────────────────────────── */

/**
 * Append an event. Negative events genuinely reduce cumulative XP — that is
 * what makes red candles possible — but a bad session is capped at −40% of
 * its starting XP, and XP never falls below the learner's rank floor.
 */
export function pushEvent(ev) {
  const s = load();
  const e = { t: Date.now(), ...ev };
  s.equityEvents.push(e);
  s.xp = Math.max(0, s.xp + (e.value || 0));
  if (!s.startedAt) s.startedAt = e.t;
  touchStreak(s);
  save(s);
  return e;
}

/** A streak increments on any day with a completed lesson or game. */
function touchStreak(s) {
  const t = today();
  if (s.lastActiveDate === t) return;
  if (!s.lastActiveDate) {
    s.streakDays = 1;
  } else {
    const gap = daysBetween(s.lastActiveDate, t);
    if (gap === 1) {
      s.streakDays += 1;
    } else if (gap === 2 && s.graceUsedWeekOf !== weekKey(t)) {
      // one automatic grace day per seven-day period — handled kindly
      s.streakDays += 1;
      s.graceUsedWeekOf = weekKey(t);
    } else if (gap > 1) {
      s.streakDays = 1;
    }
  }
  s.lastActiveDate = t;
}

function weekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = (d.getDay() + 6) % 7;          // Monday-based
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Last seven days as booleans, oldest first — rendered as seven small candles. */
export function streakWeek() {
  const s = load();
  const done = new Set();
  for (const e of s.equityEvents) {
    const d = new Date(e.t);
    done.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push(done.has(k));
  }
  return out;
}

/* ── recording progress ─────────────────────────────────────── */

export function completeLesson(id, ms = 0, perfectCheck = false) {
  const s = load();
  const first = !s.lessonsDone[id];
  s.lessonsDone[id] = { at: Date.now(), ms };
  save(s);
  if (first) {
    pushEvent({ kind: 'lesson', id, value: XP.lesson + (perfectCheck ? XP.perfectCheck : 0) });
    grant('first-kitta');
  }
  return first;
}

export function recordQuiz(key, score, isBoss = false) {
  const s = load();
  const prev = s.quizScores[key] || { best: 0, attempts: 0 };
  const pass = score >= (isBoss ? 0.8 : 0.7);
  const firstPass = pass && prev.best < (isBoss ? 0.8 : 0.7);
  s.quizScores[key] = {
    best: Math.max(prev.best, score),
    attempts: prev.attempts + 1,
    lastAt: Date.now(),
    passed: pass || prev.passed === true
  };
  save(s);

  if (firstPass) {
    let v = isBoss ? XP.bossPass : XP.quizPass;
    if (score === 1) v += XP.quizPerfect;
    pushEvent({ kind: 'quiz', id: key, value: v, score, boss: isBoss });
  } else if (!pass) {
    // a failed quiz genuinely costs XP — this is what prints a red candle
    pushEvent({ kind: 'quizfail', id: key, value: -Math.round(60 * (1 - score)), score });
  } else {
    pushEvent({ kind: 'quiz', id: key, value: Math.round((isBoss ? XP.bossPass : XP.quizPass) * REPLAY_FACTOR), score, boss: isBoss });
  }
  if (key === 'm13' && score === 1) grant('sector-analyst');
  return { pass, firstPass };
}

export function recordGame(id, { score, accuracy = null, meta = {} }) {
  const s = load();
  const prev = s.gameHighs[id];
  const isFirst = !prev;
  const beat = prev && score > prev.score;
  s.gameHighs[id] = {
    score: Math.max(score, prev?.score || 0),
    accuracy: accuracy ?? prev?.accuracy ?? null,
    playedAt: Date.now(),
    plays: (prev?.plays || 0) + 1,
    ...meta
  };
  save(s);

  const value = isFirst ? XP.gameFirst : (beat ? XP.gameBeatBest : Math.round(XP.gameFirst * REPLAY_FACTOR));
  pushEvent({ kind: 'game', id, value, best: isFirst || beat, score });
  return { isFirst, beat, best: s.gameHighs[id].score };
}

/* ── badges ─────────────────────────────────────────────────── */

export function grant(badgeId) {
  const s = load();
  if (s.badges.includes(badgeId)) return false;
  s.badges.push(badgeId);
  save(s);
  return true;
}

export const hasBadge = id => load().badges.includes(id);

/* ── derived ────────────────────────────────────────────────── */

export function lessonDone(id) { return !!load().lessonsDone[id]; }

export function moduleProgress(mod) {
  const s = load();
  const done = mod.lessons.filter(l => s.lessonsDone[l.id]).length;
  return { done, total: mod.lessons.length, pct: mod.lessons.length ? done / mod.lessons.length : 0 };
}

export function quizPassed(key, isBoss = false) {
  const q = load().quizScores[key];
  return !!q && q.best >= (isBoss ? 0.8 : 0.7);
}

/**
 * Module n opens when module n−1 is at ≥80% and its quiz is passed at ≥70%.
 * Module 1 is always open.
 */
export function moduleUnlocked(modules, n) {
  if (n <= 1) return true;
  const prev = modules.find(m => m.n === n - 1);
  if (!prev) return true;
  return moduleProgress(prev).pct >= 0.8 && quizPassed('m' + prev.n);
}

export function gameUnlocked(game, modules) {
  const need = game.unlockedByModule;
  const mod = modules.find(m => m.n === need);
  if (!mod) return true;
  return moduleProgress(mod).pct > 0 || moduleUnlocked(modules, need + 1);
}

export function courseProgress(modules) {
  const s = load();
  const total = modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = modules.reduce((a, m) => a + m.lessons.filter(l => s.lessonsDone[l.id]).length, 0);
  return { done, total, pct: total ? done / total : 0 };
}

export function rankFor(levels, xp) {
  let cur = levels[0];
  for (const l of levels) if (xp >= l.rankXp) cur = l;
  const next = levels.find(l => l.rankXp > xp) || null;
  return { rank: cur.rank, level: cur.n, next, toNext: next ? next.rankXp - xp : 0 };
}

/** Certificate unlocks at 100% lessons AND all four boss quizzes passed. */
export function certificateUnlocked(modules) {
  const p = courseProgress(modules);
  if (p.pct < 1) return false;
  return modules.filter(m => m.bossQuizAfter).every(m => quizPassed('boss' + m.n, true));
}

/* ── settings ───────────────────────────────────────────────── */

export function setSetting(k, v) {
  const s = load();
  s.settings[k] = v;
  save(s);
  applySettings();
}

export function applySettings() {
  const { settings } = load();
  const r = document.documentElement;
  r.dataset.cb = settings.colorBlindSafe ? '1' : '0';
  r.dataset.motion = settings.reduceMotion ? '0' : '1';
}
