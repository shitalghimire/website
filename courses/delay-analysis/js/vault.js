/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — the vault

   The course body is not merely hidden behind a UI gate; it is
   encrypted at rest. `data/content.enc.json` holds AES-GCM
   ciphertext whose key is derived from the access code with
   PBKDF2-SHA-256. Without the code the lessons are not on the page
   in any readable form — viewing source yields base64 and nothing
   else.

   AES-GCM is authenticated, so a wrong key fails the integrity tag
   and throws. Decryption failure IS the wrong-code signal; there is
   no separate check blob to leak anything.

   Requires a secure context (https:, or localhost during
   development). Opening the file straight off disk over file://
   gives no SubtleCrypto, and the gate says so plainly rather than
   failing silently.
   ═══════════════════════════════════════════════════════════════ */

const ITER_DEFAULT = 250000;
const SESSION_KEY = 'delay-analysis:unlocked';

export class VaultError extends Error {
  constructor(message, kind) { super(message); this.kind = kind; }
}

function b64ToBytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function hasCrypto() {
  return typeof crypto !== 'undefined' &&
    !!crypto.subtle &&
    typeof crypto.subtle.importKey === 'function';
}

async function deriveKey(code, salt, iterations) {
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

/**
 * Fetch the sealed payload, derive the key from `code`, and return the
 * decrypted course content object.
 * Throws VaultError('bad-code') when the code is wrong.
 */
export async function open(code, { signal } = {}) {
  if (!hasCrypto()) {
    throw new VaultError(
      'This browser will not provide encryption in an insecure context. ' +
      'Open the course over http://localhost or https:// rather than from a file:// path.',
      'no-crypto'
    );
  }

  let sealed;
  try {
    const res = await fetch(new URL('../data/content.enc.json', import.meta.url), { signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    sealed = await res.json();
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new VaultError(
      'The sealed course file could not be loaded. Serve this folder over HTTP — ' +
      'browsers refuse to fetch JSON from a file:// path.',
      'no-file'
    );
  }

  if (sealed.v !== 1) {
    throw new VaultError(`This build reads vault version 1; the file says ${sealed.v ?? '?'}.`, 'version');
  }

  const salt = b64ToBytes(sealed.salt);
  const iv   = b64ToBytes(sealed.iv);
  const data = b64ToBytes(sealed.data);
  const key  = await deriveKey(code, salt, sealed.iter || ITER_DEFAULT);

  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  } catch {
    throw new VaultError('That access code does not open this course.', 'bad-code');
  }

  try {
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new VaultError('The course file decrypted but is not readable JSON.', 'corrupt');
  }
}

/* ── remembering the code for the session ───────────────────────
   Held in sessionStorage, not localStorage: closing the tab ends
   access, which is the behaviour someone sharing a machine expects.
   A "remember on this device" option promotes it to localStorage.  */

export function remember(code, forever) {
  try {
    sessionStorage.setItem(SESSION_KEY, code);
    if (forever) localStorage.setItem(SESSION_KEY, code);
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* private mode — the learner simply retypes it */ }
}

export function recall() {
  try {
    return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || null;
  } catch { return null; }
}

export function forget() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}
