# Delay Analysis in Construction Contracts

An interactive course in forensic programming. Ten modules, 59 lessons, 59
interactive instruments, 207 questions.

© 2026 Shital Ghimire. All rights reserved.

---

## Access

The course body is **encrypted at rest**. `data/content.enc.json` holds
AES-256-GCM ciphertext whose key is derived from the access code with
PBKDF2-SHA-256 (250,000 iterations). Without the code the lessons are not on the
page in any readable form — viewing source yields base64 and nothing else.

**Current access code: `9742556397`**

Requires a secure context — `https://` in production, or `http://localhost`
during development. Opening `index.html` straight off disk over `file://` gives
no SubtleCrypto, and the gate says so.

---

## Editing the content

All source content lives in `_src/`, in plain JSON:

```
_src/course.json          the curriculum — modules, lessons, quizzes
_src/glossary.json        69 terms, linked from lesson prose with [[key]]
_src/questions/m01…m10    207 questions, one file per module
_src/lessons/m01…m10      the lesson bodies, one file per module
```

After **any** edit, re-seal the course:

```bash
node tools/build.mjs
```

To change the access code:

```bash
node tools/build.mjs --code 1234567890
```

To validate the sources without writing anything:

```bash
node tools/build.mjs --check
```

The build validates as it goes: missing questions, dangling glossary links,
lessons with no instrument or no takeaway, out-of-range answer indices and
duplicate question ids are all caught before anything is written.

### Deploying

`_src/` is the plaintext source. If the access code is meant to be a real
barrier, **exclude `_src/` from what you deploy** — otherwise the encryption is
decorative, because the plaintext sits next to the ciphertext. GitHub Pages
skips `_`-prefixed directories by default; on any other host, exclude it
explicitly.

---

## Lesson format

Every lesson is seven blocks, in a fixed order:

| block | purpose |
|---|---|
| `hook` | why this matters, one paragraph |
| `core` | the teaching |
| `figure` | an instrument — always something you can operate |
| `note` | a callout: `law`, `protocol`, `site`, `warn`, `aacei` |
| `worked` | an example with its arithmetic shown |
| `check` | two or three questions, answered on the spot |
| `takeaway` | four points to carry out |

Lesson prose is **not HTML**. It uses a small inline syntax parsed into real DOM
nodes, so no content file can inject markup:

```
**bold**   *italic*   `code`   ==critical highlight==
[[float]]              glossary term
[[float|the float]]    glossary term, own label
{{ERE}}                risk-event chip — ERE, CRE, EDE, CDE, EOT, LD
[text](href)           link
### Subhead   #### Small subhead
- bullet      1. numbered      > quote      | a | b |  table
```

---

## Instruments

29 registered widgets in `js/widgets/`. The interesting ones:

- **`network`** — a precedence diagram that runs its own forward and backward
  pass, column by column, then derives float and the longest path. Driven by a
  real CPM engine (`js/cpm.js`) with four relationship types, leads and lags,
  six date constraints, total/free float and driving-relationship tracing.
  Verified against the worked concrete-package example in the source text —
  all 62 values, the finish date and the critical path match exactly.
- **`impacted-as-planned`**, **`time-impact`**, **`collapsed-as-built`**,
  **`activity-variance`** — the four primary methods, each steppable, each
  recalculating a real liability ledger.
- **`float-map`** — the airport case study's float map, filterable to driving
  activities only.
- **`measured-mile`** — drag the control period and watch the claim change.
  That sensitivity is the lesson.

Register a new one in `js/widgets/index.js`, then reference it from a lesson's
`figure` block by name.

---

## Architecture

No framework, no build step for the app itself, no dependencies.

```
index.html          shell + the access gate
js/app.js           gate, router, boot
js/vault.js         PBKDF2 + AES-GCM unseal
js/cpm.js           the critical path engine
js/store.js         progress, in one versioned localStorage key
js/markup.js        inline syntax → DOM (never innerHTML)
js/blocks.js        the seven lesson blocks
js/quiz.js          questions
js/views/           dashboard, module, lesson, quiz, case study, toolkit, misc
js/widgets/         the instruments
css/tokens.css      the design system — "Drawing Office"
```

Progress lives in `localStorage` under `delay-analysis:v1`. No account, no
backend, no cookie banner, nothing leaves the device.
