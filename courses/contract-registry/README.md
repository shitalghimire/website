# The Registry

A private reading room for administering a construction contract: every clause in
plain words over the signed text, a letter analyser, a drafting desk, deadline
clocks, case files, a letter register, a learning path and practice.

© 2026 Shital Ghimire. All rights reserved.

## Access

All course content lives in `data/registry.sealed.json` as AES-256-GCM ciphertext
(key derived from the access code with PBKDF2-SHA-256, 250,000 iterations). The
plaintext sources are **not** in this repository and must never be added to it.

Needs a secure context — `https://` or `http://localhost`.

## Architecture

No framework, no dependencies, no build step for the page itself.

```
index.html            gate + shell
js/boot.js            gate: unseal, then load the app
js/app.js             router, navigation, finder palette (/ or Ctrl+K)
js/lib/               DOM helpers, icons, vault, local store, dates
js/engine/contract.js GCC + PCC model, reference parser and resolver
js/engine/search.js   local full-text index over everything
js/engine/reader.js   letter analyser (runs entirely in the browser)
js/engine/compose.js  letter composer (text, .doc, print)
js/views/             desk, clauses, analyse, draft, clocks, cases, letters,
                      learn, practice, tools, words
css/                  registry (tokens + shell), views, desks, draft, rooms
```

Progress, notes, drafts and clocks are stored in `localStorage` under
`registry:v1`. Optional sync (the cloud button) keeps them in step across
devices through a private GitHub Gist in the learner's own account, encrypted
with the access code — see `../sync/sync.js`. Pasted letters are never stored;
a saved analysis keeps only a summary.
