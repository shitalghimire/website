#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   DELAY ANALYSIS — content build

   Reads the plaintext course sources from _src/, assembles them
   into one payload, and seals it with AES-256-GCM under a key
   derived from the access code with PBKDF2-SHA-256.

   The output, data/content.enc.json, is the only course content
   that ships. Without the code it is base64 and nothing else.

     node tools/build.mjs                 # uses the default code
     node tools/build.mjs --code 1234567  # sets a different code
     node tools/build.mjs --check         # validate sources only

   Re-run this after editing anything in _src/.
   ═══════════════════════════════════════════════════════════════ */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC  = join(ROOT, '_src');
const OUT  = join(ROOT, 'data');

const ITER = 250000;
const DEFAULT_CODE = '9742556397';

const argv = process.argv.slice(2);
const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const CODE = arg('--code') || DEFAULT_CODE;
const CHECK_ONLY = argv.includes('--check');
// --draft seals what exists and downgrades missing-content errors to warnings,
// so the course can be run and tested while it is still being written
const DRAFT = argv.includes('--draft');

const c = {
  ok: s => `\x1b[32m${s}\x1b[0m`,
  no: s => `\x1b[31m${s}\x1b[0m`,
  hm: s => `\x1b[33m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`
};

const json = async p => JSON.parse(await readFile(p, 'utf8'));

/* ── assemble ───────────────────────────────────────────────── */

async function assemble() {
  const course = await json(join(SRC, 'course.json'));
  const glossary = await json(join(SRC, 'glossary.json'));

  // questions live one file per module, plus an optional single legacy file
  let questions = [];
  const qDir = join(SRC, 'questions');
  if (existsSync(qDir)) {
    for (const f of (await readdir(qDir)).filter(f => f.endsWith('.json')).sort()) {
      questions.push(...await json(join(qDir, f)));
    }
  }
  const qPath = join(SRC, 'questions.json');
  if (existsSync(qPath)) questions.push(...await json(qPath));

  const seen = new Set();
  for (const q of questions) {
    if (seen.has(q.id)) throw new Error(`duplicate question id: ${q.id}`);
    seen.add(q.id);
  }

  const lessons = {};
  const lessonDir = join(SRC, 'lessons');
  if (existsSync(lessonDir)) {
    for (const f of (await readdir(lessonDir)).filter(f => f.endsWith('.json')).sort()) {
      const file = await json(join(lessonDir, f));
      Object.assign(lessons, file.lessons || {});
    }
  }

  return { course, glossary, questions, lessons };
}

/* ── validate ───────────────────────────────────────────────── */

function validate(payload) {
  const { course, glossary, questions, lessons } = payload;
  const problems = [];
  const warn = [];

  const qIds = new Set(questions.map(q => q.id));
  const glossKeys = new Set(Object.keys(glossary));
  const lessonIds = new Set();

  for (const m of course.modules) {
    for (const l of m.lessons) {
      lessonIds.add(l.id);
      if (!lessons[l.id]) warn.push(`lesson ${l.id} "${l.t}" has no content file`);
    }
    for (const qid of (m.quiz?.q || [])) {
      if (!qIds.has(qid)) problems.push(`module ${m.n} quiz references missing question ${qid}`);
    }
  }

  // glossary lesson pointers
  for (const [k, v] of Object.entries(glossary)) {
    if (v.l && !lessonIds.has(v.l)) problems.push(`glossary "${k}" points at lesson ${v.l}, which does not exist`);
  }

  // question integrity
  for (const q of questions) {
    if (!Array.isArray(q.opts) || q.opts.length < 2) problems.push(`question ${q.id} needs at least two options`);
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= (q.opts?.length ?? 0)) {
      problems.push(`question ${q.id} has an out-of-range answer index`);
    }
    if (!q.why) warn.push(`question ${q.id} has no explanation`);
    if (q.lesson && !lessonIds.has(q.lesson)) problems.push(`question ${q.id} points at lesson ${q.lesson}, which does not exist`);
  }

  // blocks
  const TYPES = new Set(['hook', 'core', 'figure', 'note', 'worked', 'check', 'takeaway']);
  for (const [id, l] of Object.entries(lessons)) {
    if (!lessonIds.has(id)) warn.push(`content exists for lesson ${id}, which is not on the curriculum`);
    for (const b of (l.blocks || [])) {
      if (!TYPES.has(b.type)) problems.push(`lesson ${id} has an unknown block type "${b.type}"`);
      if (b.type === 'check') {
        for (const qid of (b.q || [])) {
          if (!qIds.has(qid)) problems.push(`lesson ${id} check references missing question ${qid}`);
        }
      }
      // glossary references in prose
      const text = [b.md, b.after, b.caption].filter(Boolean).join(' ');
      for (const m of text.matchAll(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g)) {
        const key = m[1].trim();
        if (!glossKeys.has(key)) warn.push(`lesson ${id} links to unknown glossary term "${key}"`);
      }
    }
    const types = (l.blocks || []).map(b => b.type);
    if (!types.includes('figure')) warn.push(`lesson ${id} has no instrument`);
    if (!types.includes('takeaway')) warn.push(`lesson ${id} has no takeaway`);
  }

  if (DRAFT) return { problems: [], warn: [...warn, ...problems] };
  return { problems, warn };
}

/** In draft mode, drop quiz references and checks that point at nothing yet. */
function prune(payload) {
  const qIds = new Set(payload.questions.map(q => q.id));
  for (const m of payload.course.modules) {
    if (m.quiz) {
      m.quiz.q = m.quiz.q.filter(id => qIds.has(id));
      if (!m.quiz.q.length) delete m.quiz;
    }
  }
  for (const l of Object.values(payload.lessons)) {
    l.blocks = (l.blocks || []).filter(b => {
      if (b.type !== 'check') return true;
      b.q = (b.q || []).filter(id => qIds.has(id));
      return b.q.length > 0;
    });
  }
  return payload;
}

/* ── seal ───────────────────────────────────────────────────── */

function seal(payload, code) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(code, salt, ITER, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(payload), 'utf8');
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: ITER,
    cipher: 'AES-256-GCM',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    // WebCrypto expects the GCM tag appended to the ciphertext
    data: Buffer.concat([body, tag]).toString('base64')
  };
}

/* ── go ─────────────────────────────────────────────────────── */

(async () => {
  const payload = await assemble();

  const mods = payload.course.modules.length;
  const lessons = payload.course.modules.reduce((a, m) => a + m.lessons.length, 0);
  const written = Object.keys(payload.lessons).length;

  console.log(c.dim('─'.repeat(58)));
  console.log(`  ${payload.course.title}`);
  console.log(c.dim('─'.repeat(58)));
  console.log(`  modules     ${mods}`);
  console.log(`  lessons     ${written} of ${lessons} written`);
  console.log(`  questions   ${payload.questions.length}`);
  console.log(`  glossary    ${Object.keys(payload.glossary).length} terms`);

  const { problems, warn } = validate(payload);

  if (warn.length) {
    console.log('');
    for (const w of warn.slice(0, 40)) console.log(`  ${c.hm('warn')}  ${w}`);
    if (warn.length > 40) console.log(c.dim(`         …and ${warn.length - 40} more`));
  }
  if (problems.length) {
    console.log('');
    for (const p of problems) console.log(`  ${c.no('FAIL')}  ${p}`);
    console.log('');
    console.log(c.no(`  ${problems.length} problem(s). Nothing written.`));
    process.exit(1);
  }

  if (CHECK_ONLY) {
    console.log('');
    console.log(c.ok('  Sources valid. Nothing written (--check).'));
    return;
  }

  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });
  const sealed = seal(DRAFT ? prune(payload) : payload, CODE);
  const out = join(OUT, 'content.enc.json');
  await writeFile(out, JSON.stringify(sealed));

  const kb = (JSON.stringify(sealed).length / 1024).toFixed(1);
  console.log('');
  console.log(c.ok(`  Sealed → data/content.enc.json  (${kb} kB)`));
  console.log(c.dim(`  AES-256-GCM · PBKDF2-SHA256 · ${ITER.toLocaleString()} iterations`));
  console.log(c.dim(`  Access code: ${CODE.replace(/./g, '•')} (${CODE.length} characters)`));
  console.log('');
})();
