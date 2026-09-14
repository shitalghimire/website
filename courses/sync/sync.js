/* ═══════════════════════════════════════════════════════════════
   COURSE SYNC — progress across one person's devices

   Storage: a private GitHub Gist in the learner's own account, reached
   with a personal access token that has only the `gist` scope. There is
   no server of ours in the middle.

   Privacy: progress is encrypted (AES-256-GCM, key from the course access
   code via PBKDF2-SHA-256) before it leaves the browser. The gist only
   ever holds ciphertext. The token is stored on the device encrypted with
   the same code.

   Merging: every piece of progress is a "unit" (one lesson, one quiz,
   one note, one saved clock…). Each unit carries the time it last
   changed on any device. Merges take the newer side unit by unit, and
   deletions travel as timestamps too. Progress that existed before sync
   was switched on has no timestamp; when two devices both have such old
   progress, both are kept (best score, union of answers). Nothing is
   ever lost just because one device is behind.
   ═══════════════════════════════════════════════════════════════ */

const API = 'https://api.github.com';
const GIST_DESC = 'Course progress (encrypted) · shitalghimire.com.np';
const CONFIG_KEY = 'courses-sync:v1';
const ITER = 250000;
const enc = new TextEncoder();
const dec = new TextDecoder();

/* ── small utilities ─────────────────────────────────────────── */

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (isObj(v)) return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}

const keyCache = new Map();
async function deriveKey(code, saltB64) {
  const id = code + '|' + saltB64;
  if (keyCache.has(id)) return keyCache.get(id);
  const p = (async () => {
    const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: ITER, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  })();
  keyCache.set(id, p);
  return p;
}
const newSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));

async function seal(obj, code, salt) {
  const key = await deriveKey(code, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { v: 1, salt, iv: b64(iv), data: b64(data) };
}
async function unseal(env, code) {
  const key = await deriveKey(code, env.salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, key, unb64(env.data));
  return JSON.parse(dec.decode(plain));
}

/* ── units: flatten a progress object into mergeable pieces ─── */

export function toUnits(state, spec = {}) {
  const out = {};
  const skip = new Set(spec.local || []);
  for (const [k, v] of Object.entries(state || {})) {
    if (skip.has(k) || v === undefined) continue;
    if (Array.isArray(v)) {
      for (const e of v) {
        const idField = spec.ids?.[k];
        const id = isObj(e) ? String(e[idField] ?? e.id ?? e.at ?? stable(e)) : stable(e);
        out[JSON.stringify([k, 'a', id])] = e;
      }
    } else if (isObj(v)) {
      for (const [sub, sv] of Object.entries(v)) if (sv !== undefined) out[JSON.stringify([k, 'o', sub])] = sv;
    } else {
      out[JSON.stringify([k, 's', ''])] = v;
    }
  }
  return out;
}

export function fromUnits(units, template = {}) {
  const out = {};
  for (const [k, v] of Object.entries(template)) out[k] = Array.isArray(v) ? [] : isObj(v) ? {} : v;
  for (const [u, v] of Object.entries(units)) {
    const [k, kind, id] = JSON.parse(u);
    if (kind === 'a') (Array.isArray(out[k]) ? out[k] : (out[k] = [])).push(v);
    else if (kind === 'o') (isObj(out[k]) ? out[k] : (out[k] = {}))[id] = v;
    else out[k] = v;
  }
  return out;
}

/* when both sides hold old, un-timestamped progress: keep the best of both */
export function tie(a, b) {
  if (stable(a) === stable(b)) return a;
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  if (typeof a === 'boolean' && typeof b === 'boolean') return a || b;
  if (typeof a === 'string' && typeof b === 'string') return b.length > a.length ? b : a;
  if (Array.isArray(a) && Array.isArray(b)) {
    const seen = new Map();
    for (const x of [...a, ...b]) seen.set(stable(x), x);
    const all = [...seen.values()];
    return all.every((x) => typeof x === 'number') ? all.sort((p, q) => p - q) : all;
  }
  if (isObj(a) && isObj(b)) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? tie(a[k], b[k]) : (k in a ? a[k] : b[k]);
    return o;
  }
  return a ?? b;
}

/* unit-by-unit merge; returns { units, stamps } */
export function merge(L, R) {
  const units = {};
  const stamps = {};
  const keys = new Set([...Object.keys(L.units), ...Object.keys(L.stamps), ...Object.keys(R.units), ...Object.keys(R.stamps)]);
  for (const u of keys) {
    const lHas = u in L.units;
    const rHas = u in R.units;
    const lt = L.stamps[u] ?? (lHas ? 0 : -1);
    const rt = R.stamps[u] ?? (rHas ? 0 : -1);
    let has; let val;
    if (lt > rt) { has = lHas; val = L.units[u]; }
    else if (rt > lt) { has = rHas; val = R.units[u]; }
    else if (lHas && rHas) { has = true; val = tie(L.units[u], R.units[u]); }
    else { has = lHas || rHas; val = lHas ? L.units[u] : R.units[u]; }
    if (has) units[u] = val;
    const t = Math.max(lt, rt);
    if (t > 0) stamps[u] = t;
  }
  return { units, stamps };
}

/* stamp every unit that differs between two snapshots */
export function stampChanges(prev, next, stamps, now = Date.now()) {
  let changed = false;
  for (const u of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    const a = u in prev ? stable(prev[u]) : undefined;
    const b = u in next ? stable(next[u]) : undefined;
    if (a !== b) { stamps[u] = now; changed = true; }
  }
  return changed;
}

const sameDoc = (a, b) => stable(a.units) === stable(b.units) && stable(a.stamps) === stable(b.stamps);

/* ── shared device config (both courses use one token) ─────── */

function readConfig() { try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch { return null; } }
function writeConfig(c) { try { if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); else localStorage.removeItem(CONFIG_KEY); } catch { /* ignore */ } }

/* ── GitHub gist backend ─────────────────────────────────────── */

class SyncError extends Error { constructor(msg, kind) { super(msg); this.kind = kind; } }

async function gh(token, path, { method = 'GET', body, keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method, keepalive, cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new SyncError('No connection — progress is saved on this device and will sync when you are back online.', 'offline');
  }
  if (res.status === 401) throw new SyncError('GitHub did not accept the token. It may have expired or been revoked — connect again with a new one.', 'auth');
  if (res.status === 403 && res.headers.get('X-RateLimit-Remaining') === '0') throw new SyncError('GitHub rate limit reached — sync will retry later.', 'offline');
  if (res.status === 403 || res.status === 404) {
    const scopes = res.headers.get('X-OAuth-Scopes');
    if (scopes != null && !/\bgist\b/.test(scopes)) throw new SyncError('This token does not have the "gist" permission. Create one with the gist scope ticked.', 'auth');
    throw new SyncError(res.status === 404 ? 'not-found' : 'GitHub refused the request.', res.status === 404 ? 'not-found' : 'server');
  }
  if (!res.ok) throw new SyncError(`GitHub answered ${res.status}. Sync will retry.`, 'server');
  return res.status === 204 ? null : res.json();
}

async function findOrCreateGist(token) {
  for (let page = 1; page <= 10; page++) {
    const list = await gh(token, `/gists?per_page=100&page=${page}`);
    const hit = list.find((g) => g.description === GIST_DESC);
    if (hit) return hit.id;
    if (list.length < 100) break;
  }
  const made = await gh(token, '/gists', {
    method: 'POST',
    body: { description: GIST_DESC, public: false, files: { 'README.md': { content: 'Encrypted course progress, synced between my devices. The files here are ciphertext — they can only be read with the course access code.\n' } } },
  });
  return made.id;
}

/* ═══════════════════════════════════════════════════════════════
   createSync — one per course
   ═══════════════════════════════════════════════════════════════ */

export function createSync({ course, file, template, spec = {}, read, write, subscribe, normalize = (s) => s }) {
  const META_KEY = `${course}:sync-meta`;
  const listeners = new Set();
  let code = null;
  let token = null;
  let status = { state: 'off', at: null, message: '', login: null };
  let busy = null;
  let again = false;
  let pushTimer = null;
  let pollTimer = null;
  let lastPull = 0;
  let envSalt = null;

  const loadMeta = () => { try { return JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch { return null; } };
  const saveMeta = (m) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* storage full */ } };
  let meta = loadMeta();

  const setStatus = (patch) => { status = { ...status, ...patch }; listeners.forEach((fn) => fn(status)); };

  /* keep timestamps current for every local change — even while sync is off,
     so the first sync of this device carries correct history */
  function track() {
    const now = toUnits(read(), spec);
    if (!meta) { meta = { snap: now, stamps: {} }; saveMeta(meta); return false; }
    const changed = stampChanges(meta.snap, now, meta.stamps);
    if (changed) { meta.snap = now; saveMeta(meta); }
    return changed;
  }
  track();
  subscribe(() => { if (track() && token) schedulePush(); });

  function schedulePush(ms = 3500) { clearTimeout(pushTimer); pushTimer = setTimeout(() => syncNow(), ms); }

  function apply(doc) {
    const local = read();
    const kept = {};
    for (const k of spec.local || []) if (k in local) kept[k] = local[k];
    const next = normalize({ ...fromUnits(doc.units, template), ...kept });
    meta = { snap: toUnits(next, spec), stamps: doc.stamps };
    saveMeta(meta);
    write(next);
  }

  async function syncNow({ quiet = false } = {}) {
    if (!token || !code) return status;
    if (busy) { again = true; return busy; }
    busy = (async () => {
      if (!quiet) setStatus({ state: 'syncing', message: '' });
      try {
        track();
        const cfg = readConfig();
        if (!cfg?.gistId) throw new SyncError('not-found', 'not-found');
        let gist;
        try { gist = await gh(token, `/gists/${cfg.gistId}`); }
        catch (e) {
          if (e.kind !== 'not-found') throw e;
          const id = await findOrCreateGist(token);
          writeConfig({ ...readConfig(), gistId: id });
          gist = await gh(token, `/gists/${id}`);
        }
        const f = gist.files?.[file];
        let remote = { units: {}, stamps: {} };
        if (f) {
          let content = f.content;
          if (f.truncated && f.raw_url) content = await (await fetch(f.raw_url, { cache: 'no-store' })).text();
          const env = JSON.parse(content);
          envSalt = env.salt;
          try { remote = await unseal(env, code); }
          catch { throw new SyncError('The synced progress was saved with a different access code. Use the same code on every device.', 'code'); }
        }
        const local = { units: meta.snap, stamps: meta.stamps };
        const merged = merge(local, remote);
        const localChanged = !sameDoc(merged, local);
        if (localChanged) apply(merged);
        if (!f || !sameDoc(merged, remote)) {
          const env = await seal({ ...merged, at: Date.now() }, code, envSalt || (envSalt = newSalt()));
          await gh(token, `/gists/${readConfig().gistId}`, { method: 'PATCH', body: { files: { [file]: { content: JSON.stringify(env) } } } });
        }
        lastPull = Date.now();
        setStatus({ state: 'synced', at: Date.now(), message: '', remoteApplied: localChanged });
      } catch (e) {
        if (e.kind === 'auth') { token = null; setStatus({ state: 'auth', message: e.message }); }
        else if (e.kind === 'code') setStatus({ state: 'error', message: e.message });
        else setStatus({ state: e.kind === 'offline' ? 'offline' : 'error', message: e.message === 'not-found' ? 'Could not reach the sync gist.' : e.message });
      } finally {
        const rerun = again;
        busy = null; again = false;
        if (rerun && token) schedulePush(400);
      }
      return status;
    })();
    return busy;
  }

  function startTimers() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - lastPull > 80000) syncNow({ quiet: true }); }, 30000);
  }
  document.addEventListener('visibilitychange', () => {
    if (!token) return;
    if (document.visibilityState === 'visible' && Date.now() - lastPull > 15000) syncNow({ quiet: true });
    if (document.visibilityState === 'hidden' && pushTimer) { clearTimeout(pushTimer); pushTimer = null; syncNow({ quiet: true }); }
  });
  addEventListener('online', () => { if (token) syncNow({ quiet: true }); });

  const api = {
    get status() { return status; },
    on(fn) { listeners.add(fn); fn(status); return () => listeners.delete(fn); },
    isConnected: () => !!token,

    /* call once the course is unsealed */
    async unlock(accessCode) {
      code = accessCode;
      const cfg = readConfig();
      if (!cfg?.token) { setStatus({ state: 'off' }); return; }
      try {
        token = await unseal(cfg.token, code);
        setStatus({ state: 'syncing', login: cfg.login || null });
        startTimers();
        await syncNow();
      } catch {
        token = null;
        setStatus({ state: 'auth', message: 'This device was connected with a different access code. Connect again.' });
      }
    },

    async connect(rawToken) {
      const t = String(rawToken || '').trim();
      if (!t) throw new SyncError('Paste the token first.', 'input');
      if (!code) throw new SyncError('Open the course first.', 'input');
      setStatus({ state: 'syncing', message: 'Checking the token…' });
      try {
        const user = await gh(t, '/user');
        const gistId = await findOrCreateGist(t);
        const salt = newSalt();
        writeConfig({ token: await seal(t, code, salt), gistId, login: user.login, at: Date.now() });
        token = t;
        setStatus({ login: user.login });
        startTimers();
        return await syncNow();
      } catch (e) {
        setStatus({ state: e.kind === 'auth' ? 'auth' : 'error', message: e.message });
        throw e;
      }
    },

    disconnect() {
      token = null;
      clearInterval(pollTimer);
      writeConfig(null);
      setStatus({ state: 'off', message: '', login: null, at: null });
    },

    syncNow: () => syncNow(),
  };
  return api;
}

export const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Course%20progress%20sync';

export function describe(st) {
  const ago = (t) => {
    if (!t) return '';
    const s = Math.round((Date.now() - t) / 1000);
    return s < 10 ? 'just now' : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString();
  };
  switch (st.state) {
    case 'synced': return `Synced ${ago(st.at)}${st.login ? ` · @${st.login}` : ''}`;
    case 'syncing': return st.message || 'Syncing…';
    case 'offline': return st.message || 'Offline — will sync later';
    case 'auth': return st.message || 'Reconnect needed';
    case 'error': return st.message || 'Sync problem';
    default: return 'Not synced — progress is on this device only';
  }
}
