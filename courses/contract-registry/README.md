# The Registry

A private reading room for learning contract claims from real files: claim
dossiers read letter by letter, every clause in plain words over the signed
text, a claims school, a contract course, practice, deadline clocks, case files,
a letter register and letter tools.

© 2026 Shital Ghimire. All rights reserved.

## Access

Everything a reader sees is ciphertext in `data/` until the access code is
entered: AES-256-GCM, key derived from the code with PBKDF2-SHA-256, 250,000
iterations. The plaintext sources are **not** in this repository and must never
be added to it.

```
data/registry.sealed.json   the course, and the pages that quote real figures
data/letters.sealed.json    letter texts
data/media.sealed.json      exhibit images
data/claim-*.bin            one claim dossier each, opened on demand
data/pay.bin                the Payments study, opened on demand
data/book.bin               the Price Book (Contract Volume 2.3), opened on demand
data/p/*.bin                document pages, one file each, opened as they scroll into view
data/f/*.bin                original Word and Excel files, opened on download
```

Needs a secure context — `https://` or `http://localhost`.

## Architecture

No framework, no dependencies, no build step for the page itself.

```
index.html            gate + shell
js/boot.js            gate: unseal, then load the app
js/app.js             router, navigation, finder palette (/ or Ctrl+K)
js/lib/               DOM helpers, icons, vault, motion, guilloché art, local store, dates
js/engine/contract.js GCC + PCC model, reference parser and resolver
js/engine/search.js   local full-text index over everything
js/engine/reader.js   letter analyser (runs entirely in the browser)
js/engine/compose.js  letter composer (text, .doc, print)
js/views/             desk (home), practice, clauses, clocks, cases, letters,
                      learn, tools, words, charts
js/views/sealed.js    loader for the sealed pages: dossier, school, exchange,
                      baseline, eot, payments, book (their files here are small stubs)
js/views/world3d.js   the WebGL stage (three.js, loaded on first use); figure-free
css/registry.css      tokens + shell ("the Strongroom": ledger paper, green spine, brass, wax red)
css/pro.css           home, and the look carried into the older rooms
css/dossier.css       claim dossiers        css/practice.css   quiz, flashcards, games
css/payments.css      Payments              css/book.css       the Price Book
css/…                 one sheet per older room
```

Fonts: Besley (display), Atkinson Hyperlegible Next (text), Atkinson Hyperlegible
Mono (figures), Courier Prime (stamps), Source Serif 4 (quoted documents).

Progress, notes, drafts and clocks are stored in `localStorage` under
`registry:v1`. Optional sync (the cloud button) keeps them in step across
devices through a private GitHub Gist in the learner's own account, encrypted
with the access code — see `../sync/sync.js`. Pasted letters are never stored;
a saved analysis keeps only a summary.
