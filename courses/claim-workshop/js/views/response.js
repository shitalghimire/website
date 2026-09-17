/* 08 · The response — answering a claim, and determining one */

import { h, fx, mount, reveal } from '../lib.js';
import { icon } from '../icons.js';
import { RESPONSE } from '../content.js';
import { head, sec, note, versus, ticks } from './parts.js';

export default function response(page, { chapter }) {
  page.append(
    head(chapter, RESPONSE.lede),

    sec('Seven steps', 'Writing the response'),
    steps(),

    sec('What a reviewer actually tests', 'Run these six'),
    tests(),

    sec('The difference one sentence makes', 'Rejections'),
    rejections(),

    sec('If you are determining, not just responding', 'The extra duty'),
    determining(),
  );

  reveal(page.querySelector('.rs'), { selector: '.rs__s', step: 70 });
  reveal(page.querySelector('.ts'), { selector: '.ts__c', step: 60 });
}

function steps() {
  return h('div.rs', RESPONSE.steps.map((s, i) => h('article.rs__s', { style: { '--i': i } },
    h('span.rs__n', String(s.n).padStart(2, '0')),
    h('div', h('h3', s.t), h('p', fx(s.s))))));
}

function tests() {
  return h('div.ts', RESPONSE.tests.map((t, i) => h('article.ts__c', { style: { '--i': i } },
    h('span.ts__i', icon('check')),
    h('h4', t.t),
    h('p', fx(t.s)))));
}

/* ── the difference a reason makes ─────────────────────────────── */
function rejections() {
  const CASES = [
    {
      bad: 'The claim is rejected.',
      good: 'The claim is rejected. The notice at Exhibit 2 is dated 34 days after the event. Sub-Clause 35.1 requires notice within 21 days, and the Contract makes that a condition of entitlement.',
      note: 'The first creates a dispute. The second may end one — the claimant can check the arithmetic and see the answer for themselves.',
    },
    {
      bad: 'The Contractor has not substantiated its costs.',
      good: 'The cost claim is not accepted. The submission asserts that 42 operatives were idle but does not show that they could not have been moved to another front. Payroll records alone show spend, not causation. Daily allocation sheets for the period would allow this to be reassessed.',
      note: 'The second one says what would change the answer. That single sentence turns a rejection into a route forward.',
    },
    {
      bad: 'The delay analysis is not accepted as it is not in accordance with the Contract.',
      good: 'The delay analysis is not accepted. It is run on the programme of 14 December 2025, which was returned for correction on 13 January 2026 and has not been accepted under Clause 41. Once an accepted programme exists, the same analysis can be re-run against it and will be reviewed on its merits.',
      note: 'Name the document and the date. A reviewer who cannot be checked will not be believed.',
    },
  ];
  return h('div.stack',
    h('p.prose', fx('A rejection without a reason is not a response — it is a refusal, and refusals go to disputes. Every one of these pairs says the same thing. Only one of each pair is any use.')),
    CASES.map((c, i) => h('article.rj', { style: { '--i': i } },
      versus(c.bad, c.good, 'A refusal', 'A response'),
      h('p.rj__n', icon('info'), h('span', fx(c.note))))));
}

/* ── determining ───────────────────────────────────────────────── */
function determining() {
  return h('div.dt',
    h('div.dt__main',
      h('p.prose', fx('Responding is arguing your side. **Determining is different.** If the contract makes you the one who decides, you are not a party to the argument any more — you are deciding it, and you owe both sides a fair answer.')),
      h('p.prose', fx('That means consulting both of them before you decide, giving reasons either side can check, and being just as willing to find against the party who pays you as for them. A determination that reads like an advocate\'s letter will not survive the next stage, and everyone in the room knows it.'))),
    h('div.dt__list',
      h('p.eyebrow', 'A determination should'),
      ticks([
        'Say what was claimed, in the claimant\'s own terms',
        'Say what is accepted, and what is not',
        'Give a reason for every part not accepted',
        'Deal with time and money separately',
        'State the figures and dates plainly, once',
        'Say what further information would change the answer',
        'Be issued inside the period the contract allows',
      ], 'ticks--teal')));
}
