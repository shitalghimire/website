/* The learning path */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import C from '../engine/contract.js';
import { head, rich, refChip, question, sec } from './ui.js';
import { WIDGETS } from './widgets.js';

export default function learn(view, { args, ctx, data }) {
  const P = data.path;
  if (args[0] && args[1]) return lesson(view, ctx, data, args[0], args[1]);
  const mod = args[0] && P.modules.find((m) => m.id === args[0]);
  if (mod) return location.replace(`#/learn/${mod.id}/${mod.lessons[0].id}`);
  ctx.crumbs([{ label: 'Learn' }]);
  const st = store.get();
  const total = P.modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = P.modules.reduce((a, m) => a + m.lessons.filter((l) => st.lessons[l.id]).length, 0);
  const next = P.modules.flatMap((m) => m.lessons.map((l) => ({ m, l }))).find(({ l }) => !st.lessons[l.id]);

  view.append(
    head(h('span', 'The ', h('em', 'path')), 'Nine short modules — about five hours in all — that take you from "what did we sign?" to writing letters the Engineer cannot brush aside. Each lesson mixes plain explanation, the real clauses, a moment from TKV and a quick check.',
      next ? [h('a.btn.btn--stamp', { href: `#/learn/${next.m.id}/${next.l.id}` }, icon('play'), done ? 'Continue' : 'Start')] : null),
    h('div.path-progress', h('div.path-progress__bar', { style: { width: `${(done / total) * 100}%` } }), h('span', `${done} of ${total} lessons`)),
    h('div.path', P.modules.map((m, i) => {
      const md = m.lessons.filter((l) => st.lessons[l.id]).length;
      return h(`section.mod.mod--${m.color}`, { style: { '--i': i } },
        h('div.mod__no', m.no),
        h('div.mod__body',
          h('h2.mod__t', m.title),
          h('p.mod__b', m.blurb),
          h('ol.mod__lessons', m.lessons.map((l) => h('li', h(`a${st.lessons[l.id] ? '.is-done' : ''}`, { href: `#/learn/${m.id}/${l.id}` }, st.lessons[l.id] ? icon('check') : h('span.mod__dot'), l.title))))),
        h('div.mod__meta', h('span', `${m.mins} min`), h('span', `${md}/${m.lessons.length}`)));
    })));
}

function lesson(view, ctx, data, mid, lid) {
  const P = data.path;
  const m = P.modules.find((x) => x.id === mid);
  const l = m?.lessons.find((x) => x.id === lid);
  if (!l) { view.append(h('div.empty', 'Lesson not found. ', h('a', { href: '#/learn' }, 'Back to the path'))); return; }
  ctx.crumbs([{ label: 'Learn', href: '#/learn' }, { label: `${m.no}. ${m.title}`, href: `#/learn/${m.id}` }, { label: l.title }]);
  const flat = P.modules.flatMap((mm) => mm.lessons.map((ll) => ({ mm, ll })));
  const idx = flat.findIndex((x) => x.ll.id === lid);
  const prev = flat[idx - 1];
  const next = flat[idx + 1];
  let checks = 0; let right = 0;

  const blocks = l.blocks.map((b) => {
    switch (b.t) {
      case 'p': return h('p.ls-p', rich(b.text));
      case 'key': return h('p.ls-key', h('span.ls-key__mark', 'Remember'), rich(b.text));
      case 'tkv': return h('aside.ls-tkv', h('span.ls-tkv__tag', 'On TKV'), h('p', rich(b.text)));
      case 'steps': return h('ol.ls-steps', b.items.map((s) => h('li', rich(s))));
      case 'compare': return h('div.ls-compare', [b.left, b.right].map((c, i) => h(`div.ls-compare__col.ls-compare__col--${i ? 'r' : 'l'}`, h('h3.plain__h', c.title), h('ul', c.items.map((x) => h('li', rich(x)))))));
      case 'clauses': return h('div.ls-clauses', b.refs.map((r) => {
        const res = C.resolve(r);
        return h('a.ls-clause', { href: C.hrefOf(r) }, h('span.ls-clause__no', r), h('span.ls-clause__t', C.titleOf(r)), h('span.ls-clause__g', rich(C.firstLine(r).slice(0, 220) + (C.firstLine(r).length > 220 ? '…' : ''))), res && C.isAmended(r) ? h('span.chip.chip--pcc', 'PCC') : null);
      }));
      case 'widget': return h('div.ls-widget', WIDGETS[b.name] ? WIDGETS[b.name](data) : null);
      case 'check': return h('div.ls-checks', h('span.eyebrow', 'Quick check'), b.ids.map((id) => { checks++; return question(id, P.questions[id], { onAnswer: (ok) => { if (ok) right++; } }); }));
      default: return null;
    }
  });

  const doneBtn = h('button.btn.btn--stamp', { type: 'button', onclick: () => { store.update((s) => { s.lessons[l.id] = Date.now(); }); if (next) location.hash = `/learn/${next.mm.id}/${next.ll.id}`; else location.hash = '/learn'; } }, icon('check'), next ? 'Done — next lesson' : 'Finish the path');

  view.append(
    h('header.ls-head', h('p.eyebrow', `Module ${m.no} · ${m.title} · Lesson ${m.lessons.indexOf(l) + 1} of ${m.lessons.length}`), h('h1.head__title', l.title)),
    h('article.ls', blocks),
    h('nav.ls-foot',
      prev ? h('a.btn.btn--ghost', { href: `#/learn/${prev.mm.id}/${prev.ll.id}` }, icon('back'), prev.ll.title) : h('span'),
      doneBtn));
}
