/* Local progress & personal data — one versioned localStorage key.
   When sync is switched on, this progress is also sent — encrypted —
   to the learner's own private GitHub Gist (see courses/sync/sync.js).
   Only progress and your own notes are kept — never contract text. */

const KEY = 'registry:v1';
const blank = () => ({
  learned: {}, bookmarks: {}, notes: {}, lessons: {}, answers: {}, leitner: {},
  clocks: [], settings: {}, days: [], opened: {},
});

let state = load();
const subs = new Set();

function load() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return blank(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or private mode */ }
  subs.forEach((fn) => fn(state));
}

export const BLANK = blank;

export const store = {
  get: () => state,
  update(fn) { fn(state); save(); },
  /* used by sync to bring in progress from another device */
  replace(next) { state = { ...blank(), ...next }; save(); },
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
  reset() { state = blank(); save(); },
  touchDay() {
    const d = new Date().toISOString().slice(0, 10);
    if (state.days.at(-1) !== d) { state.days.push(d); state.days = state.days.slice(-120); save(); }
  },
  streak() {
    const set = new Set(state.days);
    let n = 0;
    for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
      if (set.has(d.toISOString().slice(0, 10))) n++; else break;
    }
    return n;
  },
};
