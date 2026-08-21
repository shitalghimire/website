/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — lesson markup

   Lesson JSON never contains HTML. It carries a small inline syntax
   parsed into real DOM nodes, so nothing from a content file is ever
   handed to innerHTML.

     **bold**             strong
     *italic*             em
     `code`               monospace
     ==critical==         a critical-path highlight
     [[float]]            glossary term, label from glossary.json
     [[float|the float]]  glossary term with its own label
     {{ERE}}              a risk-event tag chip (ERE/CRE/EDE/CDE)
     [text](href)         link  (http… opens in a new tab)

   Block level:
     ### Subhead
     #### Small subhead
     - bullet
     1. numbered
     > quote            a set-off quotation
     | a | b |          a table row (first row is the head)
   ═══════════════════════════════════════════════════════════════ */

import { el, frag, add } from './dom.js';

let GLOSSARY = {};
export function setGlossary(g) { GLOSSARY = g || {}; }

/* ── inline ─────────────────────────────────────────────────── */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|==[^=]+==|\[\[[^\]]+\]\]|\{\{[A-Za-z ]+\}\}|\[[^\]]+\]\([^)]+\))/g;

export function inline(text) {
  const out = [];
  let last = 0;
  const s = String(text ?? '');
  for (const m of s.matchAll(INLINE)) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(token(m[0]));
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const TAGS = {
  ERE: ['employer', 'Employer Risk Event'],
  EDE: ['employer', 'Employer Delay Event'],
  CRE: ['contractor', 'Contractor Risk Event'],
  CDE: ['contractor', 'Contractor Delay Event'],
  EOT: ['ink', 'Extension of Time'],
  LD:  ['critical', 'Liquidated Damages'],
  LDs: ['critical', 'Liquidated Damages']
};

function token(t) {
  // Emphasis recurses, so a glossary term or code span nested inside bold or
  // italic still resolves. Without this, **[[float|total float]]** renders the
  // raw brackets inside a <strong> and the popover is silently lost.
  if (t.startsWith('**')) return el('strong', inline(t.slice(2, -2)));
  if (t.startsWith('==')) return el('mark.crit', {
    style: { background: 'var(--critical-wash)', color: 'var(--critical)', padding: '0 3px', borderRadius: '2px' }
  }, inline(t.slice(2, -2)));
  if (t.startsWith('`')) return el('code', t.slice(1, -1));
  if (t.startsWith('{{')) {
    const k = t.slice(2, -2).trim();
    const [tone, title] = TAGS[k] || ['neutral', k];
    return el('abbr.pill', {
      class: 'pill--' + tone,
      title,
      style: { fontSize: '0.68em', padding: '0 6px', textDecoration: 'none', verticalAlign: 'baseline' }
    }, k);
  }
  if (t.startsWith('[[')) {
    const [key, label] = t.slice(2, -2).split('|');
    return term(key.trim(), label?.trim());
  }
  if (t.startsWith('[')) {
    const m = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return t;
    const ext = /^https?:/i.test(m[2]);
    return el('a', {
      href: m[2],
      ...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})
    }, m[1]);
  }
  if (t.startsWith('*')) return el('em', inline(t.slice(1, -1)));
  return t;
}

/* ── glossary popover ───────────────────────────────────────── */

let openPop = null;

function term(key, label) {
  const entry = GLOSSARY[key];
  const text = label || entry?.t || key;
  if (!entry) return text;                    // unknown key degrades to plain text

  const btn = el('button.term', {
    type: 'button',
    aria: { label: `${text} — show definition`, expanded: 'false' },
    onclick: e => { e.preventDefault(); e.stopPropagation(); toggle(btn, entry); }
  }, text);
  btn.addEventListener('mouseenter', () => { if (btn.dataset.pin !== '1') show(btn, entry); });
  btn.addEventListener('mouseleave', () => { if (btn.dataset.pin !== '1') hide(); });
  btn.addEventListener('focus', () => show(btn, entry));
  btn.addEventListener('blur', () => { if (btn.dataset.pin !== '1') hide(); });
  return btn;
}

function toggle(btn, entry) {
  const on = btn.dataset.pin === '1';
  btn.dataset.pin = on ? '0' : '1';
  btn.setAttribute('aria-expanded', on ? 'false' : 'true');
  if (on) hide(); else show(btn, entry);
}

function show(btn, entry) {
  hide();
  const pop = el('div.pop', { role: 'tooltip' }, [
    el('div.pop__t', entry.t),
    el('div', inline(entry.d)),
    entry.l && el('a.pop__go', { href: lessonHref(entry.l) }, `Taught in ${entry.l} →`)
  ]);
  document.body.append(pop);

  const r = btn.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = r.left + window.scrollX;
  left = Math.min(left, window.scrollX + document.documentElement.clientWidth - pw - 12);
  left = Math.max(window.scrollX + 8, left);
  let top = r.bottom + window.scrollY + 8;
  if (r.bottom + ph + 16 > window.innerHeight) top = r.top + window.scrollY - ph - 8;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  openPop = pop;
}

function lessonHref(id) {
  const [m, l] = String(id).split('.');
  return `#/m/${+m}/l/${+l}`;
}

function hide() { openPop?.remove(); openPop = null; }

document.addEventListener('click', e => {
  if (openPop && !e.target.closest('.pop') && !e.target.closest('.term')) {
    document.querySelectorAll('.term[data-pin="1"]').forEach(b => {
      b.dataset.pin = '0'; b.setAttribute('aria-expanded', 'false');
    });
    hide();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
window.addEventListener('hashchange', hide);

/* ── block level ────────────────────────────────────────────── */

export function md(text) {
  const out = frag([]);
  if (!text) return out;
  const blocks = String(text).trim().split(/\n{2,}/);

  for (const b of blocks) {
    const lines = b.split('\n').filter(l => l.trim() !== '');
    if (!lines.length) continue;

    if (lines[0].startsWith('#### ')) {
      out.append(el('h4', inline(lines[0].slice(5))));
      if (lines.length > 1) out.append(el('p', inline(lines.slice(1).join(' '))));
      continue;
    }
    if (lines[0].startsWith('### ')) {
      out.append(el('h3', inline(lines[0].slice(4))));
      if (lines.length > 1) out.append(el('p', inline(lines.slice(1).join(' '))));
      continue;
    }
    if (lines.every(l => /^\s*>\s?/.test(l))) {
      out.append(el('blockquote', {
        style: {
          borderLeft: '2px solid var(--g-500)', paddingLeft: 'var(--s4)',
          fontFamily: 'var(--f-display)', fontStyle: 'italic',
          fontSize: '1.02em', color: 'var(--p-200)', lineHeight: '1.5'
        }
      }, inline(lines.map(l => l.replace(/^\s*>\s?/, '')).join(' '))));
      continue;
    }
    if (lines.every(l => /^\s*\|/.test(l))) { out.append(pipeTable(lines)); continue; }
    if (lines.every(l => /^\s*[-•]\s+/.test(l))) {
      out.append(el('ul', lines.map(l => el('li', inline(l.replace(/^\s*[-•]\s+/, ''))))));
      continue;
    }
    if (lines.every(l => /^\s*\d+\.\s+/.test(l))) {
      out.append(el('ol', lines.map(l => el('li', inline(l.replace(/^\s*\d+\.\s+/, ''))))));
      continue;
    }
    out.append(el('p', inline(lines.join(' '))));
  }
  return out;
}

/**
 * Split a table row on its cell pipes only.
 * A glossary link is written [[key|label]], so a naive split on "|" would
 * tear it in half. Skip any pipe sitting inside a [[…]] span.
 */
function splitCells(line) {
  const out = [];
  let cell = '', depth = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '[' && line[i + 1] === '[') { depth++; cell += '[['; i++; continue; }
    if (line[i] === ']' && line[i + 1] === ']' && depth) { depth--; cell += ']]'; i++; continue; }
    if (line[i] === '|' && !depth) { out.push(cell); cell = ''; continue; }
    cell += line[i];
  }
  out.push(cell);
  return out;
}

function pipeTable(lines) {
  const rows = lines.map(l => splitCells(l.trim().replace(/^\||\|$/g, '')).map(c => c.trim()));
  const head = rows.shift();
  // a |---|---| separator row is optional and simply dropped
  if (rows.length && rows[0].every(c => /^:?-+:?$/.test(c))) rows.shift();
  const numeric = head.map((_, i) => rows.length > 0 && rows.every(r => /^[−\-+]?[\d.,%\s]*$/.test(r[i] || '')));
  return el('div.scroll-x', el('table.table', [
    el('thead', el('tr', head.map((h, i) => el('th', { scope: 'col', class: numeric[i] ? 'n' : '' }, inline(h))))),
    el('tbody', rows.map(r => el('tr', r.map((c, i) => el('td', { class: numeric[i] ? 'n' : '' }, inline(c))))))
  ]));
}

/**
 * A table straight from JSON: { head: [], rows: [[]], n: [i…], caption }
 *
 * A row whose first cell is "=" is a totals row; the marker is consumed and
 * does not occupy a column. Rows shorter than the header are padded from the
 * LEFT, so a totals row like ["=", "Totals", 9, 8] lines its figures up under
 * the right columns instead of shifting them one to the left.
 */
export function table(t) {
  const num = new Set(t.n || []);
  const head = t.head || [];
  const width = head.length;

  return el('div.scroll-x', el('table.table', [
    head.length && el('thead', el('tr', head.map((h, i) =>
      el('th', { scope: 'col', class: num.has(i) ? 'n' : '' }, inline(h))))),
    el('tbody', (t.rows || []).map(r => {
      const isTotal = r[0] === '=';
      let cells = isTotal ? r.slice(1) : r;
      if (width && cells.length < width) {
        cells = [cells[0], ...Array(width - cells.length).fill(''), ...cells.slice(1)];
      }
      return el('tr', { class: isTotal ? 'is-total' : '' },
        cells.map((c, i) => el('td', { class: num.has(i) ? 'n' : '' }, inline(String(c)))));
    })),
    t.caption && el('caption', inline(t.caption))
  ]));
}
