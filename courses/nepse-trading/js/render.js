/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — lesson renderer
   Lesson JSON never contains HTML. It carries a small inline syntax
   which is parsed into real DOM nodes, so nothing from data is ever
   handed to innerHTML.

     **bold**            strong
     *italic*            em
     `code`              monospace
     [[wacc]]            glossary term, label from glossary.json
     [[wacc|your WACC]]  glossary term with its own label
     {ne:धितोपत्र}        Devanagari span, lang="ne"
     [text](url)         link
     ### subhead
     - bullet
     1. numbered
   ═══════════════════════════════════════════════════════════════ */

import { el, frag, append } from './util.js';

let GLOSSARY = {};
export function setGlossary(g) { GLOSSARY = g || {}; }

/* ── inline ─────────────────────────────────────────────────── */

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\[[^\]]+\]\]|\{ne:[^}]+\}|\[[^\]]+\]\([^)]+\))/g;

export function inline(text) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(token(m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function token(t) {
  if (t.startsWith('**')) return el('strong', t.slice(2, -2));
  if (t.startsWith('`')) return el('code', { style: { fontFamily: 'var(--f-data)', fontSize: '0.9em' } }, t.slice(1, -1));
  if (t.startsWith('{ne:')) return el('span.np', { lang: 'ne' }, t.slice(4, -1));
  if (t.startsWith('[[')) {
    const body = t.slice(2, -2);
    const [key, label] = body.split('|');
    return termNode(key.trim(), label?.trim());
  }
  if (t.startsWith('[')) {
    const m = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return t;
    const ext = /^https?:/.test(m[2]);
    return el('a', {
      href: m[2],
      ...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})
    }, m[1]);
  }
  if (t.startsWith('*')) return el('em', t.slice(1, -1));
  return t;
}

/* ── glossary term with a popover ───────────────────────────── */

let openPop = null;

function termNode(key, label) {
  const entry = GLOSSARY[key];
  const text = label || entry?.en || key;
  if (!entry) return text;                 // unknown key degrades to plain text

  const btn = el('button.term', {
    type: 'button',
    'aria-label': `${text} — show definition`,
    'aria-expanded': 'false',
    onclick: e => { e.preventDefault(); e.stopPropagation(); toggle(btn, entry); }
  }, text);
  btn.addEventListener('mouseenter', () => show(btn, entry));
  btn.addEventListener('mouseleave', () => { if (btn.dataset.pinned !== '1') hide(); });
  return btn;
}

function toggle(btn, entry) {
  if (btn.dataset.pinned === '1') { btn.dataset.pinned = '0'; hide(); }
  else { btn.dataset.pinned = '1'; show(btn, entry); }
  btn.setAttribute('aria-expanded', btn.dataset.pinned === '1' ? 'true' : 'false');
}

function show(btn, entry) {
  hide();
  const lessonHref = entry.lesson ? (() => {
    const [m, l] = String(entry.lesson).split('.');
    return `#/m/${+m}/l/${+l}`;
  })() : null;

  const pop = el('div.pop', { role: 'tooltip' }, [
    el('div.pop__t', entry.en),
    el('div.pop__np', [
      el('span.np', { lang: 'ne' }, entry.np),
      entry.rom ? el('em', { style: { color: 'var(--paper-4)', marginLeft: '8px', fontSize: '0.85em' } }, entry.rom) : null
    ]),
    el('div', entry.def),
    lessonHref && el('a.pop__lesson', { href: lessonHref }, `Taught in ${entry.lesson} →`)
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

function hide() { openPop?.remove(); openPop = null; }
document.addEventListener('click', e => {
  if (openPop && !e.target.closest('.pop') && !e.target.closest('.term')) {
    document.querySelectorAll('.term[data-pinned="1"]').forEach(b => {
      b.dataset.pinned = '0'; b.setAttribute('aria-expanded', 'false');
    });
    hide();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });

/* ── block markdown ─────────────────────────────────────────── */

export function md(text) {
  const out = frag([]);
  if (!text) return out;
  const blocks = String(text).trim().split(/\n{2,}/);

  for (const b of blocks) {
    const lines = b.split('\n');

    if (lines[0].startsWith('### ')) {
      out.append(el('h3', inline(lines[0].slice(4))));
      if (lines.length > 1) out.append(el('p', inline(lines.slice(1).join(' '))));
      continue;
    }
    if (lines.every(l => /^\s*-\s+/.test(l))) {
      out.append(el('ul', lines.map(l => el('li', inline(l.replace(/^\s*-\s+/, ''))))));
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

/* ── the seven lesson blocks ────────────────────────────────── */

const LABELS = {
  hook: ['①', 'Hook'],
  core: ['②', 'Core'],
  visual: ['③', 'Visual'],
  nepse: ['④', 'Nepal note'],
  example: ['⑤', 'Worked example'],
  check: ['⑥', 'Check yourself'],
  takeaway: ['⑦', 'Takeaway']
};

export function blockLabel(type) {
  const [gl, name] = LABELS[type] || ['•', type];
  return el('div.block__label', [el('i', gl), name]);
}

/**
 * Render one lesson block.
 * `deps` supplies { widgets, quizInline, fees, rules } so this module stays
 * free of view-layer knowledge.
 */
export function renderBlock(block, deps) {
  const wrap = el('section', { class: 'block block--' + block.type });
  wrap.append(blockLabel(block.type));

  switch (block.type) {
    case 'hook':
      wrap.append(el('div.prose', md(block.md)));
      break;

    case 'core':
      wrap.append(el('div.prose', md(block.md)));
      break;

    case 'visual': {
      const fn = deps.widgets[block.widget];
      if (!fn) {
        wrap.append(el('div.callout.callout--info', el('p',
          `Visual "${block.widget}" is not registered.`)));
        break;
      }
      let node;
      try { node = fn(block.props || {}, deps); }
      catch (err) {
        console.error('widget', block.widget, err);
        node = el('div.callout.callout--info', el('p', 'This visual could not be drawn.'));
      }
      wrap.append(el('div.bleed', node));
      if (block.caption) wrap.append(el('p.widget__note', block.caption));
      break;
    }

    case 'nepse':
      wrap.append(el('div.callout.callout--nepse', [
        el('span.callout__l', 'Nepal note'),
        md(block.md),
        block.asOf && el('span.asof', `As at ${block.asOf}`)
      ]));
      break;

    case 'example': {
      const box = el('div.prose', md(block.md));
      wrap.append(box);
      if (block.calc?.length) {
        wrap.append(el('div.bleed', { style: { marginTop: 'var(--s4)' } },
          el('div.calc', block.calc.map(r =>
            el('div', { class: 'calc__row' + (r.total ? ' calc__row--total' : '') }, [
              el('span', r.l),
              el('b', r.v)
            ])
          ))));
      }
      if (block.table) wrap.append(el('div.bleed', { style: { marginTop: 'var(--s4)' } }, table(block.table)));
      if (block.after) wrap.append(el('div.prose', { style: { marginTop: 'var(--s4)' } }, md(block.after)));
      break;
    }

    case 'check':
      wrap.append(deps.quizInline(block.qids || []));
      break;

    case 'takeaway':
      wrap.append(el('ul.takeaway', (block.bullets || []).map(b => el('li', inline(b)))));
      break;

    default:
      wrap.append(el('div.prose', md(block.md || '')));
  }
  return wrap;
}

/** A table from lesson JSON: { head:[], rows:[[]], numeric:[i…], caption } */
export function table(t) {
  const numeric = new Set(t.numeric || []);
  return el('div.scroll-x', el('table.table', [
    el('thead', el('tr', t.head.map((h, i) =>
      el('th', { scope: 'col', class: numeric.has(i) ? 'n' : '' }, h)))),
    el('tbody', t.rows.map(r => el('tr', r.map((c, i) => {
      const cls = [];
      if (numeric.has(i)) cls.push('n');
      if (typeof c === 'string' && /^[+−-]/.test(c)) cls.push(c.startsWith('+') ? 'up' : 'down');
      return el('td', { class: cls.join(' ') }, inline(String(c)));
    })))),
    t.caption && el('caption', t.caption)
  ]));
}
