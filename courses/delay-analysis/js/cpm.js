/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — a real critical path engine

   Not a mock-up. Forward pass, backward pass, four relationship
   types with leads and lags, date constraints, total and free
   float, driving relationships, and the longest path.

   CONVENTION — "Option 1" in Keane & Caletka §2.3.3: an activity
   occupies whole days, starting at 00:00 of its start date and
   ending at 23:59 of its finish date. So:

       EF = ES + D − 1
       successor ES = predecessor EF + 1        (finish-to-start)

   A one-day task therefore starts and finishes on the same date.
   Zero-duration milestones fall out of the same formula with
   EF = ES − 1, which is why a milestone is drawn on the date its
   last predecessor finished rather than the day after.

   Days are integers counted from the project start; dates are
   applied only at the edge, so nothing here depends on timezone.
   The engine is verified against the worked concrete-package
   example in the source text — every ES/EF/LS/LF/TF/FF matches.
   ═══════════════════════════════════════════════════════════════ */

import { addDays, dayDiff } from './dom.js';

/**
 * @typedef {Object} Act
 * @property {string} id
 * @property {string} desc
 * @property {number} dur         original duration, calendar days
 * @property {Array}  [pred]      [{ id, type='FS', lag=0 }] or ["105"] shorthand
 * @property {string} [cons]      'SNET'|'SNLT'|'FNET'|'FNLT'|'MSO'|'MFO'
 * @property {number} [consDay]   day index the constraint bites on
 * @property {boolean}[milestone]
 * @property {string} [area]      grouping key, used by the case study
 */

const TYPES = new Set(['FS', 'SS', 'FF', 'SF']);

/** Normalise the shorthand a content file is allowed to use. */
function normalise(acts) {
  return acts.map(a => ({
    lag: 0,
    ...a,
    dur: a.milestone ? 0 : (a.dur ?? 0),
    pred: (a.pred || []).map(p => {
      if (typeof p === 'string') {
        // "110" | "110FS" | "110SS+3" | "110FF-2"
        const m = p.match(/^([\w.-]+?)(FS|SS|FF|SF)?([+-]\d+)?$/);
        if (!m) return { id: p, type: 'FS', lag: 0 };
        return { id: m[1], type: TYPES.has(m[2]) ? m[2] : 'FS', lag: m[3] ? +m[3] : 0 };
      }
      return { id: p.id, type: TYPES.has(p.type) ? p.type : 'FS', lag: p.lag || 0 };
    })
  }));
}

/** Kahn topological order. Throws on a cycle, which is a real logic bug. */
function topo(acts, byId) {
  const indeg = new Map(acts.map(a => [a.id, 0]));
  const succ = new Map(acts.map(a => [a.id, []]));
  for (const a of acts) {
    for (const p of a.pred) {
      if (!byId.has(p.id)) continue;      // dangling link — ignored, reported by validate()
      indeg.set(a.id, indeg.get(a.id) + 1);
      succ.get(p.id).push({ id: a.id, type: p.type, lag: p.lag });
    }
  }
  const q = acts.filter(a => indeg.get(a.id) === 0).map(a => a.id);
  const order = [];
  while (q.length) {
    const id = q.shift();
    order.push(id);
    for (const s of succ.get(id)) {
      indeg.set(s.id, indeg.get(s.id) - 1);
      if (indeg.get(s.id) === 0) q.push(s.id);
    }
  }
  if (order.length !== acts.length) {
    const stuck = acts.filter(a => !order.includes(a.id)).map(a => a.id);
    throw new Error('Circular logic through: ' + stuck.join(' → '));
  }
  return { order, succ };
}

/**
 * Run the network.
 * @param {Act[]} activities
 * @param {Object} opts
 * @param {string} [opts.start]        ISO project start date
 * @param {number} [opts.mustFinish]   day index of a project deadline; drives
 *                                     negative float when the plan overruns it
 * @returns {{ acts, byId, order, succ, finishDay, finishDate, minFloat, criticalIds, longest }}
 */
export function run(activities, opts = {}) {
  const acts = normalise(activities).map(a => ({ ...a }));
  const byId = new Map(acts.map(a => [a.id, a]));
  const { order, succ } = topo(acts, byId);

  /* ── forward pass ─────────────────────────────────────────── */
  for (const id of order) {
    const a = byId.get(id);

    // what each predecessor requires of this activity's early start
    const demands = a.pred
      .map(p => {
        const P = byId.get(p.id);
        if (!P) return null;
        switch (p.type) {
          case 'SS': return { id: p.id, need: P.es + p.lag };
          case 'FF': return { id: p.id, need: P.ef + p.lag - a.dur + 1 };
          case 'SF': return { id: p.id, need: P.es + p.lag - a.dur + 1 };
          default:   return { id: p.id, need: P.ef + 1 + p.lag };   // FS
        }
      })
      .filter(Boolean);

    let es = demands.length ? Math.max(...demands.map(d => d.need)) : 0;
    es = Math.max(0, es);

    // date constraints act on the forward pass only when they push right
    if (a.cons === 'SNET' || a.cons === 'MSO') es = Math.max(es, a.consDay ?? es);
    if (a.cons === 'FNET') es = Math.max(es, (a.consDay ?? 0) - a.dur + 1);

    // every predecessor that lands exactly on the chosen date is driving;
    // ties matter, because a critical activity can have two driving feeds
    a.drivers = demands.filter(d => d.need === es).map(d => d.id);
    a.driver = a.drivers[0] ?? null;

    a.es = es;
    a.ef = es + a.dur - 1;
  }

  /* ── project finish ───────────────────────────────────────── */
  const calcFinish = Math.max(...acts.map(a => a.ef));
  const finishDay = calcFinish;
  const deadline = Number.isFinite(opts.mustFinish) ? opts.mustFinish : calcFinish;

  /* ── backward pass ────────────────────────────────────────── */
  for (const id of [...order].reverse()) {
    const a = byId.get(id);
    const outs = succ.get(id) || [];
    let lf = outs.length ? Infinity : deadline;

    for (const s of outs) {
      const S = byId.get(s.id);
      let allow;
      switch (s.type) {
        case 'SS': allow = S.ls - s.lag + a.dur - 1; break;
        case 'FF': allow = S.lf - s.lag; break;
        case 'SF': allow = S.lf - s.lag + a.dur - 1; break;
        default:   allow = S.ls - 1 - s.lag;         // FS
      }
      lf = Math.min(lf, allow);
    }

    if (a.cons === 'SNLT') lf = Math.min(lf, (a.consDay ?? lf) + a.dur - 1);
    if (a.cons === 'FNLT' || a.cons === 'MFO') lf = Math.min(lf, a.consDay ?? lf);
    if (a.cons === 'MSO') { lf = a.es + a.dur - 1; }

    a.lf = lf;
    a.ls = lf - a.dur + 1;
    a.tf = a.lf - a.ef;
  }

  /* ── free float and driving links ─────────────────────────── */
  for (const a of acts) {
    const outs = succ.get(a.id) || [];
    if (!outs.length) { a.ff = a.tf; continue; }
    let ff = Infinity;
    for (const s of outs) {
      const S = byId.get(s.id);
      let slack;
      switch (s.type) {
        case 'SS': slack = S.es - a.es - s.lag; break;
        case 'FF': slack = S.ef - a.ef - s.lag; break;
        case 'SF': slack = S.ef - a.es - s.lag; break;
        default:   slack = S.es - a.ef - 1 - s.lag;
      }
      ff = Math.min(ff, slack);
    }
    a.ff = Math.max(0, ff);
  }

  /* ── criticality ──────────────────────────────────────────────
     "Critical" is the LEAST float in the network, not literally
     zero. On a project running late every path can carry negative
     float; the critical path is the most negative of them.        */
  const minFloat = Math.min(...acts.map(a => a.tf));
  for (const a of acts) a.critical = a.tf === minFloat;
  const criticalIds = new Set(acts.filter(a => a.critical).map(a => a.id));

  /* ── the longest path: walk back through driving links only ─── */
  const longest = tracebackLongest(acts, byId, succ, minFloat);

  /* ── dates at the edge ────────────────────────────────────── */
  if (opts.start) {
    for (const a of acts) {
      a.esD = addDays(opts.start, a.es);
      a.efD = addDays(opts.start, a.ef);
      a.lsD = addDays(opts.start, a.ls);
      a.lfD = addDays(opts.start, a.lf);
    }
  }

  return {
    acts, byId, order, succ,
    finishDay,
    finishDate: opts.start ? addDays(opts.start, finishDay) : null,
    deadline,
    overrun: finishDay - deadline,
    minFloat, criticalIds, longest
  };
}

/**
 * The longest path is not simply "everything with least float" — a
 * task can carry least float and still not drive anything. Walk back
 * from the finishing activity through driving relationships only.
 */
function tracebackLongest(acts, byId, succ, minFloat) {
  const ends = acts.filter(a => !(succ.get(a.id) || []).length && a.tf === minFloat);
  const seed = ends.length ? ends : acts.filter(a => a.tf === minFloat);
  const path = new Set();
  const stack = seed.map(a => a.id);
  while (stack.length) {
    const id = stack.pop();
    if (path.has(id)) continue;
    path.add(id);
    const a = byId.get(id);
    for (const d of (a.drivers || [])) {
      const D = byId.get(d);
      if (D && D.tf === minFloat && !path.has(d)) stack.push(d);
    }
  }
  return path;
}

/** Is this pred→succ link the one that set the successor's early start? */
export function isDriving(succAct, predId) {
  return (succAct.drivers || []).includes(predId);
}

/* ═══════════════════════════════════════════════════════════════
   VALIDATION — the checks §3.1.2 asks an analyst to make before
   relying on any programme. Run over any network the course draws.
   ═══════════════════════════════════════════════════════════════ */

export function validate(activities) {
  const acts = normalise(activities);
  const byId = new Map(acts.map(a => [a.id, a]));
  const hasSucc = new Set();
  const issues = [];

  for (const a of acts) {
    for (const p of a.pred) {
      if (!byId.has(p.id)) {
        issues.push({ level: 'error', id: a.id, msg: `Predecessor ${p.id} does not exist — a dangling link.` });
      } else hasSucc.add(p.id);
    }
  }
  for (const a of acts) {
    if (!a.pred.length && !a.cons) {
      issues.push({ level: 'warn', id: a.id, msg: 'No predecessor and no constraint — an open start. It will float to day zero.' });
    }
    if (!hasSucc.has(a.id) && !a.milestone) {
      issues.push({ level: 'warn', id: a.id, msg: 'No successor — an open end. Its float is meaningless until something depends on it.' });
    }
    for (const p of a.pred) {
      if (p.lag < 0) {
        issues.push({ level: 'warn', id: a.id, msg: `Negative lag (${p.lag}d) on the link from ${p.id}. Rarely defensible in a forward-looking programme.` });
      }
      if (p.type === 'FS' && p.lag !== 0 && byId.get(p.id) &&
          Math.abs(p.lag) >= 0.5 * byId.get(p.id).dur && byId.get(p.id).dur > 0) {
        issues.push({ level: 'note', id: a.id, msg: `Lag of ${p.lag}d from ${p.id} is half that activity's duration or more. AACE RP-29R-03 says model it as a real activity instead.` });
      }
    }
    if (a.cons === 'MSO' || a.cons === 'MFO') {
      issues.push({ level: 'warn', id: a.id, msg: 'A mandatory constraint overrides the network. It will hide float and can break the critical path.' });
    }
  }
  return issues;
}

/* ═══════════════════════════════════════════════════════════════
   IMPACTING — inserting and extracting delay events

   The additive family (impacted as-planned, time impact analysis)
   INSERTS a fragnet and re-runs. The subtractive family (collapsed
   as-built) EXTRACTS one and re-runs. Both are the same operation
   with the sign flipped, which is the thing the named methods tend
   to obscure.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Insert a delay fragnet into a copy of the network.
 * @param {Act[]} base
 * @param {{id,desc,dur,pred,succ,owner}} ev  owner: 'ERE' | 'CRE'
 */
export function insert(base, ev) {
  const acts = base.map(a => ({ ...a, pred: (a.pred || []).map(p => (typeof p === 'string' ? p : { ...p })) }));
  const node = {
    id: ev.id, desc: ev.desc, dur: ev.dur,
    pred: ev.pred || [], owner: ev.owner, isEvent: true
  };
  acts.push(node);
  for (const sid of (ev.succ || [])) {
    const S = acts.find(a => a.id === sid);
    if (S) S.pred = [...(S.pred || []), ev.id];
  }
  return acts;
}

/**
 * Extract an activity, welding its predecessors to its successors so
 * the network does not fall apart. This is the "dissolve" the source
 * text prefers over a plain delete, which would leave hanging chains.
 */
export function extract(base, id) {
  const acts = base
    .map(a => ({ ...a, pred: (a.pred || []).map(p => (typeof p === 'string' ? p : { ...p })) }));
  const gone = acts.find(a => a.id === id);
  if (!gone) return acts;
  const inherited = (gone.pred || []).map(p => (typeof p === 'string' ? p : p.id));
  const rest = acts.filter(a => a.id !== id);
  for (const a of rest) {
    const links = (a.pred || []).map(p => (typeof p === 'string' ? p : p.id));
    if (links.includes(id)) {
      a.pred = [
        ...(a.pred || []).filter(p => (typeof p === 'string' ? p : p.id) !== id),
        ...inherited
      ];
    }
  }
  return rest;
}

/** Reduce an activity's duration to zero without removing it from the network. */
export function zero(base, id) {
  return base.map(a => (a.id === id ? { ...a, dur: 0 } : { ...a }));
}
