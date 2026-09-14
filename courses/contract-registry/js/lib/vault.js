/* The vault: the course payload is AES-256-GCM ciphertext. The key comes
   from the access code via PBKDF2-SHA-256. A wrong code fails the GCM tag,
   so the decrypt error itself is the "wrong code" signal. */

const KEY = 'registry:unlocked';
const SIBLING = 'delay-analysis:unlocked'; // same code as the Delay Analysis course

export class VaultError extends Error {
  constructor(message, kind) { super(message); this.kind = kind; }
}

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function open(code) {
  if (!globalThis.crypto?.subtle) {
    throw new VaultError('This browser only decrypts on https:// or http://localhost. Open the page through the website, not as a file.', 'no-crypto');
  }
  let sealed;
  try {
    const res = await fetch(new URL('../../data/registry.sealed.json', import.meta.url), { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    sealed = await res.json();
  } catch {
    throw new VaultError('The sealed file could not be loaded. Serve the site over HTTP.', 'no-file');
  }
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64(sealed.salt), iterations: sealed.iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(sealed.iv) }, key, b64(sealed.data)); }
  catch { throw new VaultError('That code does not open this file.', 'bad-code'); }
  return JSON.parse(new TextDecoder().decode(plain));
}

export function remember(code, forever) {
  try {
    sessionStorage.setItem(KEY, code);
    if (forever) localStorage.setItem(KEY, code); else localStorage.removeItem(KEY);
  } catch { /* private mode */ }
}
export function recall() {
  try {
    return sessionStorage.getItem(KEY) || localStorage.getItem(KEY)
      || sessionStorage.getItem(SIBLING) || localStorage.getItem(SIBLING) || null;
  } catch { return null; }
}
export function forget() {
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* ignore */ }
}
