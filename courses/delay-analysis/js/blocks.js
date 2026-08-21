/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — lesson block renderer

   Seven kinds of block, in a fixed order, so every lesson has the
   same shape and a returning learner always knows where to look:

     ① hook      why this matters, in one paragraph
     ② core      the teaching
     ③ figure    an instrument — always something you can operate
     ④ note      a callout: law, protocol, site practice, or warning
     ⑤ worked    an example with its arithmetic shown
     ⑥ check     two or three questions, answered on the spot
     ⑦ takeaway  what to carry out of the room
   ═══════════════════════════════════════════════════════════════ */

import { el, frag } from './dom.js';
import { md, inline, table } from './markup.js';
import { WIDGETS } from './widgets/index.js';

const TAGS = {
  hook:     ['1', 'Why this matters'],
  core:     ['2', 'The teaching'],
  figure:   ['3', 'Instrument'],
  note:     ['4', 'Note'],
  worked:   ['5', 'Worked example'],
  check:    ['6', 'Check yourself'],
  takeaway: ['7', 'Takeaway']
};

const NOTE_KIND = {
  law: 'Case law', protocol: 'Protocol', site: 'On site',
  warn: 'Watch out', aacei: 'RP-29R-03'
};

export function renderBlock(b, deps) {
  const [n, label] = TAGS[b.type] || ['·', b.type];
  const wrap = el('section', { class: 'block block--' + b.type });
  wrap.append(el('div.block__tag', [el('i', n), b.label || label]));

  switch (b.type) {
    case 'hook':
    case 'core':
      wrap.append(el('div.prose', md(b.md)));
      break;

    case 'figure': {
      const fn = WIDGETS[b.widget];
      if (!fn) {
        wrap.append(el('div.callout.callout--warn',
          el('p', `Instrument "${b.widget}" is not registered.`)));
        break;
      }
      let node;
      try { node = fn(b.props || {}); }
      catch (err) {
        console.error('widget', b.widget, err);
        node = el('div.callout.callout--warn', el('p', 'This drawing could not be produced.'));
      }
      wrap.append(el('div.bleed', node));
      if (node?._teardown) deps.onTeardown?.(node._teardown);
      if (b.caption) wrap.append(el('p.fig__note', { style: { border: 0, paddingLeft: 0 } }, inline(b.caption)));
      break;
    }

    case 'note': {
      const kind = b.kind || 'site';
      wrap.append(el('div.callout', { class: 'callout--' + kind }, [
        el('span.callout__l', b.title || NOTE_KIND[kind] || 'Note'),
        md(b.md),
        b.cite && el('span.callout__cite', b.cite)
      ]));
      break;
    }

    case 'worked': {
      if (b.md) wrap.append(el('div.prose', md(b.md)));
      if (b.calc?.length) {
        wrap.append(el('div.bleed', { style: { marginTop: 'var(--s4)' } },
          el('div.calc', b.calc.map(r => el('div', {
            class: 'calc__row' +
              (r.total ? ' calc__row--total' : '') +
              (r.sub ? ' calc__row--sub' : '') +
              (r.tone ? ' calc__row--' + r.tone : '')
          }, [el('span', inline(r.l)), el('b', r.v)])))));
      }
      if (b.table) wrap.append(el('div.bleed', { style: { marginTop: 'var(--s4)' } }, table(b.table)));
      if (b.after) wrap.append(el('div.prose', { style: { marginTop: 'var(--s4)' } }, md(b.after)));
      break;
    }

    case 'check':
      wrap.append(deps.checks(b.q || []));
      break;

    case 'takeaway':
      wrap.append(el('ul.take', (b.points || []).map(p => el('li', inline(p)))));
      break;

    default:
      wrap.append(el('div.prose', md(b.md || '')));
  }
  return wrap;
}
