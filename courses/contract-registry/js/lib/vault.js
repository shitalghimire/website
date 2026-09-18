/* The vault: the course payload is AES-256-GCM ciphertext. The key comes
   from the access code via PBKDF2-SHA-256. A wrong code fails the GCM tag,
   so the decrypt error itself is the "wrong code" signal. */

const KEY = 'registry:unlocked';
const SIBLING = 'delay-analysis:unlocked'; // same code as the Delay Analysis course

export class VaultError extends Error {
  constructor(message, kind) { super(message); this.kind = kind; }
}

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/* the unlocked session: the code and the keys derived from it, one per salt,
   so a second sealed file from the same build opens without another PBKDF2 */
let session = null;

async function keyFor(code, salt, iter) {
  const id = `${salt}:${iter}`;
  if (session?.code === code && session.keys.has(id)) return session.keys.get(id);
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64(salt), iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  if (session?.code !== code) session = { code, keys: new Map() };
  session.keys.set(id, key);
  return key;
}

async function fetchSealed(name) {
  const res = await fetch(new URL(`../../data/${name}.sealed.json`, import.meta.url), { cache: 'no-cache' });
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function unseal(sealed, code) {
  const key = await keyFor(code, sealed.salt, sealed.iter);
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(sealed.iv) }, key, b64(sealed.data)); }
  catch { throw new VaultError('That code does not open this file.', 'bad-code'); }
  /* large payloads are gzipped before sealing */
  if (sealed.z === 'gzip') {
    if (!globalThis.DecompressionStream) throw new VaultError('This browser is too old to open the letter file.', 'no-gzip');
    plain = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function open(code) {
  if (!globalThis.crypto?.subtle) {
    throw new VaultError('This browser only decrypts on https:// or http://localhost. Open the page through the website, not as a file.', 'no-crypto');
  }
  let sealed;
  try { sealed = await fetchSealed('registry'); } catch {
    throw new VaultError('The sealed file could not be loaded. Serve the site over HTTP.', 'no-file');
  }
  return unseal(sealed, code);
}

/* A second sealed file (the letter texts), opened on first use with the code
   that opened the course. Loaded once and kept for the rest of the visit. */
const extras = new Map();
export function openExtra(name) {
  if (!extras.has(name)) {
    const p = (async () => {
      const code = session?.code || recall();
      if (!code) throw new VaultError('The course is locked.', 'locked');
      let sealed;
      try { sealed = await fetchSealed(name); } catch { throw new VaultError('The letter file could not be loaded.', 'no-file'); }
      return unseal(sealed, code);
    })();
    p.catch(() => extras.delete(name));   // a failed load can be tried again
    extras.set(name, p);
  }
  return extras.get(name);
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
