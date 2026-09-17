/* Shared pieces every chapter uses. */

import { h, fx, mount } from '../lib.js';
import { icon } from '../icons.js';

export const head = (chapter, sub) => h('header.head',
  h('p.head__no', `Chapter ${chapter.no}`),
  h('h1.head__t', chapter.title),
  sub ? h('p.head__s', fx(sub)) : null);

export const sec = (title, eyebrow) => h('div.sec',
  h('h2', title),
  eyebrow ? h('span.eyebrow', eyebrow) : null);

export const note = (text, kind = '') => h(`div.note${kind ? '.note--' + kind : ''}`,
  icon(kind === 'warn' ? 'alert' : kind === 'tip' ? 'style' : 'info'),
  h('span', fx(text)));

export const prose = (...texts) => texts.map((t) => h('p.prose', fx(t)));

export const ticks = (items, cls = '') => h(`ul.ticks${cls ? '.' + cls : ''}`,
  items.map((x) => h('li', h('span', fx(x)))));

export const steps = (items) => h('ol.steps', items.map((x) => h('li', h('span', fx(x)))));

/* the good-versus-bad pair used in nearly every chapter */
export const versus = (bad, good, badLabel = 'Weak', goodLabel = 'Strong') => h('div.vs',
  h('div.vs__side.vs__bad', h('span.eyebrow', icon('x'), badLabel), h('p.vs__q', fx(bad))),
  h('div.vs__side.vs__good', h('span.eyebrow', icon('check'), goodLabel), h('p.vs__q', fx(good))));

/* a small expandable block */
export function fold(label, body, { open = false } = {}) {
  const panel = h('div.fold__b', { hidden: !open }, body);
  const btn = h('button.fold__h', { type: 'button', 'aria-expanded': String(open) },
    h('span', label), icon('arrow'));
  const box = h(`div.fold${open ? '.open' : ''}`, btn, panel);
  btn.addEventListener('click', () => {
    const now = panel.hidden;
    panel.hidden = !now;
    box.classList.toggle('open', now);
    btn.setAttribute('aria-expanded', String(now));
  });
  return box;
}

/* a multiple-choice question that answers itself once */
export function question(q, onAnswer) {
  const box = h('div.q', { dataset: { id: q.id } });
  const why = h('div.q__why', { hidden: true }, h('b'), h('span', fx(q.why)));
  const opts = q.opts.map((text, i) => h('button.q__o', {
    type: 'button',
    onclick: () => {
      if (box.classList.contains('answered')) return;
      box.classList.add('answered');
      const right = i === q.a;
      opts.forEach((b, j) => {
        b.classList.toggle('right', j === q.a);
        b.classList.toggle('wrong', j === i && !right);
      });
      mount(why.querySelector('b'), right ? 'Correct.' : 'Not quite.');
      why.classList.toggle('is-right', right);
      why.hidden = false;
      onAnswer?.(right);
    },
  }, h('span.q__k', 'ABCD'[i]), h('span', text)));
  box.append(h('p.q__q', fx(q.q)), h('div.q__os', opts), why);
  return box;
}
