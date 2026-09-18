/* Sealed pages.

   The case studies built from real TKV correspondence (the baseline, the
   EOT submissions, the exchange) are not shipped as readable scripts. Their
   source travels inside the encrypted course file and is loaded here, from
   memory, once the file is opened. Until then there is nothing to read.

   Each sealed page is an ordinary view module. Its relative imports are
   pointed at this folder's real URLs, so it shares h.js, ui.js and the rest
   with the app — the same module instances, not copies. */

const BASE = new URL('./', import.meta.url);
const mods = new Map(); // name → { fn, ready }

function load(name, src) {
  const code = src.replace(/(\bfrom\s*|\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
    (m, pre, q, spec) => pre + q + new URL(spec, BASE).href + q) + `\n//# sourceURL=sealed/${name}.js\n`;
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  return import(url).then((m) => m.default).finally(() => URL.revokeObjectURL(url));
}

function entry(name, data) {
  let m = mods.get(name);
  if (!m) {
    const src = data?.views?.[name];
    if (!src) return null;
    m = { fn: null };
    m.ready = load(name, src).then((fn) => (m.fn = fn));
    mods.set(name, m);
  }
  return m;
}

/* called as the app starts, so every sealed page draws at once */
export const preloadSealed = (data) => Promise.all(Object.keys(data?.views || {}).map((n) => entry(n, data).ready));

/* a route handler that draws the sealed page */
export function sealedView(name) {
  return function page(view, opts) {
    const m = entry(name, opts.data || opts.ctx?.data);
    if (!m) throw new Error(`The ${name} page is not in this course file.`);
    if (m.fn) return m.fn(view, opts);
    /* not loaded yet — only when an older cached app skipped the preload */
    const wait = document.createElement('p');
    wait.className = 'empty';
    wait.textContent = 'Opening the file…';
    view.append(wait);
    m.ready.then((fn) => { if (wait.isConnected) { wait.remove(); fn(view, opts); } })
      .catch((e) => { wait.textContent = 'This page could not be opened. Reload to try again.'; console.error(e); });
  };
}
