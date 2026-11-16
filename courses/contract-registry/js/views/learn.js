/* The learning path */

import { h } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import C from '../engine/contract.js';
import { head, rich } from './ui.js';
import { WIDGETS } from './widgets.js';
import { mcq } from './practice.js';

export default function learn(view, { args, ctx, data }) {
  const P = data.path;
  if (args[0] && args[1]) return lesson(view, ctx, data, args[0], args[1]);
  const mod = args[0] && P.modules.find((m) => m.id === args[0]);
  if (mod) return location.replace(`#/learn/${mod.id}/${mod.lessons[0].id}`);
  ctx.crumbs([{ label: 'Contract course' }]);
  const first = P.modules[0];
  const st = store.get();

  view.append(
    head(h('span', 'Contract ', h('em', 'course')), 'Nine short modules, about five hours in all. They take you from "what did we sign?" to writing letters the Engineer cannot brush aside. Each lesson mixes plain explanation, the real clauses and a moment from TKV.',
      [h('a.btn.btn--stamp', { href: `#/learn/${first.id}/${first.lessons[0].id}` }, icon('play'), 'Start at the beginning')]),
    h('div.path', P.modules.map((m, i) => {
      return h(`section.mod.mod--${m.color}`, { style: { '--i': i } },
        h('div.mod__no', m.no),
        h('div.mod__body',
          h('h2.mod__t', m.title),
          h('p.mod__b', m.blurb),
          h('ol.mod__lessons', m.lessons.map((l) => h('li', h(`a${st.lessons[l.id] ? '.is-done' : ''}`, { href: `#/learn/${m.id}/${l.id}` }, st.lessons[l.id] ? icon('check') : h('span.mod__dot'), l.title))))),
        h('div.mod__meta', h('span', `${m.mins} min`), h('span', `${m.lessons.length} lessons`)));
    })));
}

function lesson(view, ctx, data, mid, lid) {
  const P = data.path;
  const m = P.modules.find((x) => x.id === mid);
  const l = m?.lessons.find((x) => x.id === lid);
  if (!l) { view.append(h('div.empty', 'Lesson not found. ', h('a', { href: '#/learn' }, 'Back to the course'))); return; }
  ctx.crumbs([{ label: 'Contract course', href: '#/learn' }, { label: `${m.no}. ${m.title}`, href: `#/learn/${m.id}` }, { label: l.title }]);
  const flat = P.modules.flatMap((mm) => mm.lessons.map((ll) => ({ mm, ll })));
  const idx = flat.findIndex((x) => x.ll.id === lid);
  const prev = flat[idx - 1];
  const next = flat[idx + 1];

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
      case 'check': return h('div.ls-checks', h('span.eyebrow', 'Quick check'), b.ids.map((id) => mcq(P.questions[id], { id })));
      default: return null;
    }
  });

  const mark = () => store.update((s) => { s.lessons[l.id] = Date.now(); });
  const doneBtn = next
    ? h('a.btn.btn--stamp', { href: `#/learn/${next.mm.id}/${next.ll.id}`, onclick: mark }, icon('check'), 'Mark as read, next lesson')
    : h('a.btn.btn--stamp', { href: '#/learn', onclick: mark }, icon('check'), 'Mark as read');

  view.append(
    h('header.ls-head', h('p.eyebrow', `Module ${m.no} · ${m.title}`), h('h1.head__title', l.title)),
    h('article.ls', blocks),
    h('nav.ls-foot',
      prev ? h('a.btn.btn--ghost', { href: `#/learn/${prev.mm.id}/${prev.ll.id}` }, icon('back'), prev.ll.title) : h('span'),
      doneBtn));
}
