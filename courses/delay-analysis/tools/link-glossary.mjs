#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   Links the first plain-text occurrence of key glossary terms in
   each lesson's `core` blocks.

   Conservative by design: longest phrases first, at most one link
   per term per lesson, and never inside existing markup — an
   existing [[link]], a `code` span, a {{tag}}, a [text](href), or
   a heading line.

     node tools/link-glossary.mjs            # apply
     node tools/link-glossary.mjs --dry      # report only

   Safe to re-run: terms already linked are skipped.
   ═══════════════════════════════════════════════════════════════ */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '_src');
const DRY = process.argv.includes('--dry');

/* phrase → glossary key. Order matters: longest phrases first, so
   "total float" wins over "float" and "as-built critical path" wins
   over "critical path". */
const TERMS = [
  ['as-built critical path', 'abcp'],
  ['work breakdown structure', 'wbs'],
  ['constructive acceleration', 'constructive'],
  ['contractor risk event', 'cre'],
  ['employer risk event', 'ere'],
  ['time impact analysis', 'tia'],
  ['impacted as-planned', 'iap'],
  ['collapsed as-built', 'cab'],
  ['liquidated damages', 'ld'],
  ['as-planned programme', 'asplanned'],
  ['as-built programme', 'asbuilt'],
  ['extension of time', 'eot'],
  ['driving relationship', 'driving'],
  ['concurrent delay', 'concurrency'],
  ['compensable delay', 'compensable'],
  ['watershed analysis', 'watershed'],
  ['windows analysis', 'windows'],
  ['progress override', 'override'],
  ['retained logic', 'retained'],
  ['measured mile', 'measuredmile'],
  ['terminal float', 'terminal'],
  ['negative float', 'negfloat'],
  ['critical path', 'critical'],
  ['longest path', 'longest'],
  ['total float', 'totalfloat'],
  ['free float', 'efloat'],
  ['neutral event', 'neutral'],
  ['global claim', 'global'],
  ['Gantt chart', 'gantt'],
  ['SCL Protocol', 'scl'],
  ['data date', 'datadate'],
  ['prolongation', 'prolongation'],
  ['acceleration', 'acceleration'],
  ['mitigation', 'mitigation'],
  ['disruption', 'disruption'],
  ['excusable', 'excusable'],
  ['milestone', 'milestone'],
  ['fragnet', 'fragnet'],
  ['baseline', 'baseline'],
  ['pacing', 'pacing'],
  ['PERT', 'pert'],
  ['float', 'float']
];

const ESCAPE = /[.*+?^${}()|[\]\\]/g;
const esc = s => s.replace(ESCAPE, '\\$&');

/**
 * Split markdown into segments that may be linked and segments that may not.
 * Protected: existing [[links]], `code`, {{tags}}, [text](href), headings,
 * blockquotes, and pipe-table rows — a term button inside a dense table cell
 * reads badly, and the cell would have to be split around it.
 */
function protect(md) {
  const re = /(\[\[[^\]]+\]\]|`[^`]+`|\{\{[^}]+\}\}|\[[^\]]+\]\([^)]+\)|^#{1,4} .*$|^\s*\|.*$|^\s*>.*$)/gm;
  const out = [];
  let last = 0;
  for (const m of md.matchAll(re)) {
    if (m.index > last) out.push({ t: md.slice(last, m.index), safe: true });
    out.push({ t: m[0], safe: false });
    last = m.index + m[0].length;
  }
  if (last < md.length) out.push({ t: md.slice(last), safe: true });
  return out;
}

const glossary = JSON.parse(await readFile(join(SRC, 'glossary.json'), 'utf8'));
for (const [, key] of TERMS) {
  if (!glossary[key]) console.warn(`  warn  no glossary entry for "${key}"`);
}

let linked = 0, files = 0;
const perLesson = [];

for (const f of (await readdir(join(SRC, 'lessons'))).filter(n => n.endsWith('.json')).sort()) {
  const path = join(SRC, 'lessons', f);
  const doc = JSON.parse(await readFile(path, 'utf8'));

  for (const [id, lesson] of Object.entries(doc.lessons)) {
    const used = new Set();
    let count = 0;

    // count what a human already linked, anywhere in the lesson, so we never double up
    for (const b of lesson.blocks) {
      for (const m of String(b.md || '').matchAll(/\[\[([^\]|]+)/g)) used.add(m[1].trim());
    }

    for (const b of lesson.blocks) {
      if (b.type !== 'core' || !b.md) continue;

      for (const [phrase, key] of TERMS) {
        if (used.has(key) || !glossary[key]) continue;

        const rx = new RegExp('\\b(' + esc(phrase) + ')\\b', 'i');
        const parts = protect(b.md);
        let hit = false;

        for (const p of parts) {
          if (!p.safe || hit) continue;
          const m = p.t.match(rx);
          if (!m) continue;
          p.t = p.t.replace(rx, '[[' + key + '|' + m[1] + ']]');
          hit = true;
        }

        if (hit) {
          b.md = parts.map(p => p.t).join('');
          used.add(key);
          linked++; count++;
        }
      }
    }
    perLesson.push({ id, count });
  }

  if (!DRY) await writeFile(path, JSON.stringify(doc, null, 2) + '\n');
  files++;
}

const avg = (perLesson.reduce((a, l) => a + l.count, 0) / perLesson.length).toFixed(1);
const bare = perLesson.filter(l => l.count === 0).map(l => l.id);

console.log(`${DRY ? '[dry run] ' : ''}linked ${linked} glossary references across ${files} files`);
console.log(`  ${avg} per lesson on average`);
if (bare.length) console.log(`  lessons with none: ${bare.join(', ')}`);
