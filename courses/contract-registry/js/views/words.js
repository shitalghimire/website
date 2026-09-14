/* Words — the plain glossary, plus the contract's own definitions */

import { h, mount, marked } from '../lib/h.js';
import C from '../engine/contract.js';
import { head, rich, refChip } from './ui.js';

export default function words(view, { ctx, data, params }) {
  ctx.crumbs([{ label: 'Words' }]);
  const defs = C.getSub('1.1').blocks.filter((b) => b.t === 'def');
  const pccDefs = C.getSub('1.1').pcc;
  const input = h('input.input', { type: 'search', placeholder: 'Filter words…', value: params.get('t') || '' });
  const list = h('div.words');
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const g = data.glossary.filter((x) => !q || (x.term + ' ' + x.text).toLowerCase().includes(q));
    const d = defs.filter((x) => !q || x.text.toLowerCase().includes(q));
    mount(list,
      h('section', h('h2.sec__title', h('span.eyebrow', 'In plain words'), 'Glossary'),
        h('dl.gloss', g.map((x) => [h('dt', marked(x.term, q ? [q] : []), x.ref ? refChip(x.ref) : null), h('dd', rich(x.text))]))),
      h('section', h('h2.sec__title', h('span.eyebrow', 'Exactly as defined'), 'GCC 1.1 definitions'),
        h('dl.gloss.gloss--defs', d.map((x) => [h('dt', h('span.mono', `(${x.mark}) `), x.term || ''), h('dd.serif', x.text)])),
        h('p.muted', 'The PCC changes (f), (m), (t), (u), (z), (ii), (qq) and adds new ones — see ', h('a', { href: '#/read/1' }, 'Clause 1'), ` (${pccDefs.length} PCC entries).`)));
  };
  input.addEventListener('input', draw);
  view.append(head(h('span', 'The ', h('em', 'words')), 'Contract language, translated. Defined terms keep their capital letters in the contract — and their exact meaning.'), h('div.reg-bar', input), list);
  draw();
}
