/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — progress store

   All progress lives in one versioned localStorage key. No account,
   no backend, no cookie banner — so nothing here needs consent and
   nothing leaves the device.
   ═══════════════════════════════════════════════════════════════ */

import { today } from './dom.js';

const KEY = 'delay-analysis:v1';

const BLANK = {
  version: 1,
  startedAt: null,
  lessons: {},        // "3.2": { at }
  quizzes: {},        // "m3":  { best, tries, at, passed }
  checks: {},         // "q-3-2-a": true|false  (first answer only)
  tools: {},          // scratch values saved out of the toolkit
  checklists: {},     // "baseline-validation": [0,3,7]
  caseNotes: {},      // learner's own findings in the case study
  name: '',
  settings: { motion: true, cvd: false, denseTables: false }
};

let cache = null;
const subs = new Set();

export function load() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    cache = {
      ...structuredClone(BLANK), ...raw,
      settings: { ...BLANK.settings, ...(raw.settings || {}) }
    };
  } catch {
    cache = structuredClone(BLANK);
  }
  return cache;
}

export function save(next) {
  cache = next || cache;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); }
  catch (e) { console.warn('Progress could not be saved:', e); }
  subs.forEach(fn => fn(cache));
  return cache;
}

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

export function reset() {
  cache = structuredClone(BLANK);
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
  subs.forEach(fn => fn(cache));
  return cache;
}

export function exportJSON() { return JSON.stringify(load(), null, 2); }

export function importJSON(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('That file is not a progress export.');
  if (obj.version !== 1) throw new Error(`That file is version ${obj.version ?? '?'}; this course reads version 1.`);
  cache = { ...structuredClone(BLANK), ...obj, settings: { ...BLANK.settings, ...(obj.settings || {}) } };
  return save(cache);
}

/* ── lessons ────────────────────────────────────────────────── */

export function lessonDone(id) { return !!load().lessons[id]; }

export function completeLesson(id) {
  const s = load();
  const first = !s.lessons[id];
  s.lessons[id] = { at: Date.now(), on: today() };
  if (!s.startedAt) s.startedAt = Date.now();
  save(s);
  return first;
}

export function uncompleteLesson(id) {
  const s = load();
  delete s.lessons[id];
  save(s);
}

/* ── inline checks ──────────────────────────────────────────── */

/** Records the FIRST answer only — retrying is for learning, not for score. */
export function recordCheck(qid, correct) {
  const s = load();
  if (qid in s.checks) return false;
  s.checks[qid] = !!correct;
  save(s);
  return true;
}

export const checkAnswered = qid => qid in load().checks;

/* ── quizzes ────────────────────────────────────────────────── */

export const PASS_MARK = 0.7;

export function recordQuiz(key, score) {
  const s = load();
  const prev = s.quizzes[key] || { best: 0, tries: 0 };
  const passed = score >= PASS_MARK;
  s.quizzes[key] = {
    best: Math.max(prev.best, score),
    tries: prev.tries + 1,
    at: Date.now(),
    passed: passed || prev.passed === true
  };
  save(s);
  return { passed, first: passed && !prev.passed };
}

export function quizPassed(key) {
  const q = load().quizzes[key];
  return !!q && q.passed === true;
}

export const quizFor = key => load().quizzes[key] || null;

/* ── checklists & tool scratch ──────────────────────────────── */

export function toggleChecklist(listId, idx) {
  const s = load();
  const arr = new Set(s.checklists[listId] || []);
  if (arr.has(idx)) arr.delete(idx); else arr.add(idx);
  s.checklists[listId] = [...arr].sort((a, b) => a - b);
  save(s);
  return s.checklists[listId];
}
export const checklistFor = id => new Set(load().checklists[id] || []);

export function setTool(id, value) {
  const s = load();
  s.tools[id] = value;
  save(s);
}
export const toolFor = id => load().tools[id];

export function setNote(id, text) {
  const s = load();
  if (text) s.caseNotes[id] = text; else delete s.caseNotes[id];
  save(s);
}
export const noteFor = id => load().caseNotes[id] || '';

/* ── derived ────────────────────────────────────────────────── */

export function moduleProgress(mod) {
  const s = load();
  const done = mod.lessons.filter(l => s.lessons[l.id]).length;
  return { done, total: mod.lessons.length, pct: mod.lessons.length ? done / mod.lessons.length : 0 };
}

export function courseProgress(modules) {
  const s = load();
  const total = modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = modules.reduce((a, m) => a + m.lessons.filter(l => s.lessons[l.id]).length, 0);
  return { done, total, pct: total ? done / total : 0 };
}

/**
 * Nothing is locked. Someone who already runs Primavera every day
 * should be able to go straight to concurrency without grinding
 * through the forward pass first. The suggested order still shows
 * on the programme; it is offered, not enforced.
 */
export function firstUnfinished(modules) {
  const s = load();
  for (const m of modules) {
    for (const l of m.lessons) if (!s.lessons[l.id]) return { m: m.n, l: l.i, id: l.id };
  }
  return null;
}

/** Every lesson done AND every module quiz passed. */
export function certificateEarned(modules) {
  const p = courseProgress(modules);
  if (p.pct < 1) return false;
  return modules.every(m => !m.quiz || quizPassed('m' + m.n));
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
  r.dataset.motion = settings.motion ? '1' : '0';
  r.dataset.cvd = settings.cvd ? '1' : '0';
  r.dataset.dense = settings.denseTables ? '1' : '0';
}

export function setName(name) {
  const s = load();
  s.name = String(name || '').slice(0, 64);
  save(s);
}
