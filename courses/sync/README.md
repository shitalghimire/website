# Course sync

Keeps course progress in step across one person's devices, for the code-gated
courses (Delay Analysis, The Registry).

- **Where:** a private Gist in the learner's own GitHub account, found by its
  description. Files: `delay-analysis.sync.json`, `registry.sync.json`.
- **Access:** a personal access token (classic) with only the `gist` scope,
  pasted once per device. It is stored in `localStorage` (`courses-sync:v1`)
  encrypted with the course access code. Both courses share it.
- **Privacy:** gist contents are AES-256-GCM ciphertext; the key comes from the
  access code (PBKDF2-SHA-256, 250,000 iterations).
- **Merging:** progress is split into units (a lesson, a quiz, a note, a clock).
  Each unit carries the time it last changed; the newer side wins, deletions
  travel as timestamps, and progress from before sync existed is combined
  (union, best score) rather than overwritten.
- **When:** on unlock, a few seconds after each change, when the tab becomes
  visible again, every ~90 s while visible, and when the browser comes online.

Tests (not deployed): `node _private/tools/sync.test.mjs`.
