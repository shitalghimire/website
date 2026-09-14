/* Interactive instruments used by Tools and Lessons */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import * as D from '../lib/dates.js';
import C from '../engine/contract.js';
import { rich, refChip, msTable } from './ui.js';

const npr = (n) => 'NPR ' + Math.round(n).toLocaleString('en-IN');
const num = (el) => parseFloat(String(el.value).replace(/,/g, '')) || 0;
const inp = (label, value, attrs = {}) => { const i = h('input.input', { type: 'number', value, step: 'any', ...attrs }); return [h('label.field', h('span', label), i), i]; };

/* ── Liquidated damages ── */
export function ldCalc() {
  const [fPrice, price] = inp('Final Contract Price (NPR)', 13000000000);
  const [fAct, act] = inp('Price of the milestone activity (NPR) — PCC 61.1', 1800000000);
  const [fDays, days] = inp('Days late', 60, { min: 0 });
  const [fEot, eot] = inp('EOT granted for this date (days)', 0, { min: 0 });
  const mode = h('div.seg', h('button', { type: 'button', 'aria-pressed': 'true', onclick: (e) => setMode('ms', e) }, 'Milestone 1–6'), h('button', { type: 'button', 'aria-pressed': 'false', onclick: (e) => setMode('whole', e) }, 'Whole Works (MS 7)'));
  let m = 'ms';
  const out = h('div.wg-out');
  const setMode = (x, e) => { m = x; mode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); fAct.hidden = x !== 'ms'; calc(); };
  const calc = () => {
    const late = Math.max(0, num(days) - num(eot));
    const base = m === 'ms' ? num(act) : num(price);
    const daily = base * 0.0005;
    const cap = num(price) * 0.10;
    const raw = daily * late;
    const ld = Math.min(raw, cap);
    const capDays = Math.ceil(cap / (num(price) * 0.0005));
    mount(out,
      h('div.wg-big', h('small', 'Liquidated damages'), h('b', npr(ld)), raw > cap ? h('span.chip.chip--pcc', 'capped at 10%') : null),
      h('dl.wg-dl',
        h('dt', 'Days counted'), h('dd', `${late} (late ${num(days)} − EOT ${num(eot)})`),
        h('dt', 'Rate'), h('dd', `0.05% × ${npr(base)} = ${npr(daily)} per day`),
        h('dt', 'Cap (PCC 61.3)'), h('dd', `${npr(cap)} — reached after ${capDays} days on the whole-Works rate`),
        m === 'ms' ? [h('dt', 'Refund'), h('dd', 'Repaid if the whole Works finish by the Intended Completion Date (61.1).')] : null),
      h('p.wg-note', rich('Every EOT moves the date LDs run from (42.1). Deductions must go through 34 and a determination under 32 — answer within 15 days (32.2). 200 days = the cap = termination ground 79.2(l).')));
  };
  [price, act, days, eot].forEach((i) => i.addEventListener('input', calc));
  calc();
  return h('div.wg', h('div.wg-in', mode, fPrice, fAct, h('div.w-grid', fDays, fEot)), out);
}

/* ── Interim payment ── */
export function ipcCalc() {
  const [fGross, gross] = inp('Value of work this Statement (NPR)', 250000000);
  const [fCum, cum] = inp('Cumulative value certified before this (NPR)', 3500000000);
  const [fPrice, price] = inp('Initial Contract Price (NPR)', 13000000000);
  const [fAdv, adv] = inp('Advance still to recover (NPR)', 900000000);
  const [fSent, sent] = [h('label.field', h('span', 'Employer received the Statement on'), h('input.input', { type: 'date', value: D.iso(D.addDays(D.today(), -40)) }))]; const sentI = fSent.querySelector('input');
  const out = h('div.wg-out');
  const calc = () => {
    const g = num(gross); const cumBefore = num(cum); const P = num(price);
    const ret = g * 0.05;
    const after = cumBefore + g;
    const recovering = after > P * 0.30;
    let rec = recovering ? Math.min(g * 0.15, num(adv)) : 0;
    const mustClearBy = P * 0.80;
    const remainingBefore80 = Math.max(0, mustClearBy - after);
    const vat = g * 0.13;
    const net = g - ret - rec + vat;
    const due = D.addDays(D.fromIso(sentI.value), 60);
    const left = D.diffDays(D.today(), due);
    mount(out,
      h('table.wg-table', h('tbody',
        row('Value of work (55.2(a))', g),
        row('Retention 5% (PCC 60.1)', -ret),
        row(recovering ? 'Advance recovery 15% (PCC 63.4)' : 'Advance recovery — not yet (below 30%)', -rec),
        row('VAT 13% (PCC 91.1)', vat),
        h('tr.wg-total', h('td', 'Net this certificate'), h('td.num', npr(net))))),
      h('dl.wg-dl',
        h('dt', 'Payment due (PCC 56.1)'), h('dd', `${D.fmt(due)} — ${left >= 0 ? left + ' days left' : -left + ' days late → interest 5% p.a. on NPR (56.2)'}`),
        h('dt', 'Progress after this'), h('dd', `${((after / P) * 100).toFixed(1)}% of the Initial Contract Price`),
        num(adv) > 0 ? [h('dt', 'Advance deadline'), h('dd', `Advance must be fully repaid before 80% (NPR ${Math.round(remainingBefore80).toLocaleString('en-IN')} more of work).`)] : null),
      h('p.wg-note', rich('Only defective or notified unperformed work may be withheld (55.6). Deductions for claims need 34 and a determination. Statement copies: 6 hard + 1 soft (PCC 55.1). Simplified illustration — foreign-currency portions and other adjustments are not modelled.')));
  };
  const row = (l, v) => h('tr', h('td', l), h('td.num', v < 0 ? '− ' + npr(-v) : npr(v)));
  [gross, cum, price, adv, sentI].forEach((i) => i.addEventListener('input', calc));
  calc();
  return h('div.wg', h('div.wg-in', h('div.w-grid', fGross, fCum), h('div.w-grid', fPrice, fAdv), fSent), out);
}

/* ── Advance recovery ── */
export function advanceSim() {
  const [fP, P] = inp('Initial Contract Price (NPR, excl. provisional sums & VAT)', 13000000000);
  const [fM, M] = inp('Average monthly certified work (NPR)', 320000000);
  const out = h('div.wg-out');
  const calc = () => {
    const price = num(P); const monthly = Math.max(1, num(M));
    const advance = price * 0.10;
    let cum = 0; let owed = advance; const pts = []; let startM = null; let endM = null;
    for (let m = 1; m <= 60 && (owed > 0 || cum < price * 0.3); m++) {
      cum += monthly;
      if (cum > price * 0.30 && owed > 0) { if (startM == null) startM = m; owed = Math.max(0, owed - monthly * 0.15); if (owed === 0) endM = m; }
      pts.push({ m, cum, owed });
      if (cum > price) break;
    }
    const at80 = Math.ceil((price * 0.8) / monthly);
    const w = 560; const hgt = 180;
    const maxM = pts.length;
    const x = (m) => 30 + (m / maxM) * (w - 40);
    const y = (v) => hgt - 20 - (v / advance) * (hgt - 40);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)},${y(p.owed).toFixed(1)}`).join(' ');
    const svg = `<svg viewBox="0 0 ${w} ${hgt}" class="wg-svg"><line x1="30" y1="${hgt - 20}" x2="${w - 10}" y2="${hgt - 20}" class="ax"/><path d="M30,${y(advance)} L${x(startM || maxM)},${y(advance)} ${path.replace(/^M[^L]*/, '')}" class="ln"/>
      ${startM ? `<line x1="${x(startM)}" y1="10" x2="${x(startM)}" y2="${hgt - 20}" class="mk"/><text x="${x(startM) + 4}" y="22" class="tx">30% reached · month ${startM}</text>` : ''}
      ${at80 <= maxM ? `<line x1="${x(at80)}" y1="10" x2="${x(at80)}" y2="${hgt - 20}" class="mk mk--red"/><text x="${x(at80) - 4}" y="40" text-anchor="end" class="tx tx--red">80% · month ${at80}</text>` : ''}
      <text x="30" y="${hgt - 4}" class="tx">month 1</text><text x="${w - 10}" y="${hgt - 4}" text-anchor="end" class="tx">month ${maxM}</text></svg>`;
    mount(out, h('div', { html: svg }),
      h('dl.wg-dl',
        h('dt', 'Advance (PCC 63.1)'), h('dd', `${npr(advance)} in two 5% instalments`),
        h('dt', 'Recovery starts'), h('dd', startM ? `Month ${startM} (cumulative > 30%)` : 'Not within the period'),
        h('dt', 'Fully recovered'), h('dd', endM ? `Month ${endM}` : '—', endM && endM > at80 ? h('span.chip.chip--pcc', ' after 80% — PCC requires repayment before 80%') : null)),
      h('p.wg-note', rich('Recovery is 15% of each IPC once cumulative work exceeds 30% (PCC 63.4). Keep the guarantee valid — extend 30 days before expiry, evidence 7 days before (PCC 63.3).')));
  };
  [P, M].forEach((i) => i.addEventListener('input', calc));
  calc();
  return h('div.wg', h('div.wg-in', fP, fM), out);
}

/* ── Risk sorter ── */
const RISKS = [
  ['Riot in Nepal by people who are not your staff', 'E', 'PCC 21.1(c) — Employer\'s Risk.'],
  ['Excessive rainfall and landslide', 'F', 'Not an Employer\'s Risk any more (PCC 21.1). Force Majeure 67.1(f): time, no cost (PCC 70.1(b)).'],
  ['Rock quality worse than your design assumed', 'C', '22.5, 4.10 and 24 — Contractor.'],
  ['Cement price rises with inflation', 'C', '22.4 and 59.1 — Contractor, within the contract period.'],
  ['New excise duty introduced after the Base Date', 'E', '53.6 change in legislation — price adjusts (disputed on TKV against 57.1).'],
  ['Land for the permanent spillway outlet not acquired', 'E', '10.1(a), 30.3, 35.4(a) — Employer.'],
  ['Exchange rate moves against you', 'C', '22.3 — Contractor.'],
  ['War or invasion', 'E', 'PCC 21.1(a).'],
  ['Your access road washed out by normal monsoon', 'C', '31.2 and 35.5 — Contractor.'],
  ['Government pandemic order stops work', 'F', 'PCC 67.1(e) — Force Majeure, time and cost in Nepal.'],
  ['Explosive permit for your blasting is slow', 'C', '10.1(b), 95 — Contractor (unless the Employer failed to assist, 10.2).'],
  ['Lot-2 contractor late with interface data', 'E', '35.4(f) — but PCC 17.1 needs proof of your liaison effort.'],
];
export function riskSort() {
  let i = 0; let score = 0;
  const box = h('div.risk');
  const draw = () => {
    if (i >= RISKS.length) {
      mount(box, h('div.risk__end', h('div.wg-big', h('small', 'Your score'), h('b', `${score} / ${RISKS.length}`)), h('button.btn', { type: 'button', onclick: () => { i = 0; score = 0; draw(); } }, icon('refresh'), 'Again')));
      return;
    }
    const [txt, ans, why] = RISKS[i];
    const res = h('div.risk__res');
    const choose = (k) => {
      box.querySelectorAll('.risk__btn').forEach((b) => { b.disabled = true; b.classList.toggle('is-right', b.dataset.k === ans); b.classList.toggle('is-wrong', b.dataset.k === k && k !== ans); });
      if (k === ans) score++;
      mount(res, h('p', rich(why)), h('button.btn.btn--sm.btn--ink', { type: 'button', onclick: () => { i++; draw(); } }, 'Next', icon('arrow')));
    };
    mount(box,
      h('div.risk__count', `${i + 1} / ${RISKS.length}`),
      h('div.risk__card', txt),
      h('div.risk__btns', [['E', 'Employer carries it'], ['F', 'Force Majeure'], ['C', 'Contractor carries it']].map(([k, l]) => h('button.btn.risk__btn', { type: 'button', dataset: { k }, onclick: () => choose(k) }, l))),
      res);
  };
  draw();
  return box;
}

/* ── Lifecycle ── */
export function lifecycle() {
  const [fA, A] = [h('label.field', h('span', 'Contract Agreement date'), h('input.input', { type: 'date', value: '2024-05-10' }))]; const aI = fA.querySelector('input');
  const [fE, E] = inp('EOT granted so far (days)', 228, { min: 0 });
  const [fT] = [h('label.field', h('span', 'Taking-Over date (if known)'), h('input.input', { type: 'date' }))]; const tI = fT.querySelector('input');
  const out = h('div.wg-out');
  const calc = () => {
    const agr = D.fromIso(aI.value);
    if (!agr) return;
    const comm = D.addDays(agr, 30);
    const poss = D.addDays(agr, 10);
    const icd = D.addDays(comm, 1403 + num(E));
    const toc = tI.value ? D.fromIso(tI.value) : icd;
    const dlp = D.addDays(toc, 730);
    const pc = D.addDays(dlp, 30);
    const ldlp = D.addYears(dlp, 5);
    const events = [
      ['Site possession', poss, '30.1'], ['Commencement', comm, '1.1'], ['Intended Completion (+EOT)', icd, '42.1'],
      [tI.value ? 'Taking-Over' : 'Taking-Over (if on time)', toc, '76.3'], ['DLP ends', dlp, '49.1'], ['Performance Certificate due', pc, '77.1'], ['Latent defects period ends', ldlp, '49.10'],
    ];
    const t0 = +agr; const t1 = +ldlp; const span = t1 - t0;
    const now = D.today();
    mount(out,
      h('div.life', events.map(([l, d, ref], k) => h('div.life__ev', { style: { left: `${((d - t0) / span) * 100}%`, '--i': k } }, h('span.life__dot'), h('span.life__lbl', h('b', l), h('small', D.fmtShort(d)), ' ', refChip(ref)))),
        now > agr && now < ldlp ? h('div.life__now', { style: { left: `${((now - t0) / span) * 100}%` } }, h('span', 'today')) : null),
      h('p.wg-note', rich('Commencement = 30th day after the agreement (PCC 1.1(m)); possession = 10th day (PCC 30.1); 1403 days to complete (PCC 1.1(z)); DLP 730 days (PCC 49.1); Performance Certificate 30 days after the DLP (77.1); latent defects 5 years (PCC 49.10).')));
  };
  [aI, E, tI].forEach((i) => i.addEventListener('input', calc));
  calc();
  return h('div.wg.wg--wide', h('div.wg-in.wg-in--row', fA, fE, fT), out);
}

/* ── Milestones ── */
export function milestones(data) {
  const [fA] = [h('label.field', h('span', 'Commencement Date'), h('input.input', { type: 'date', value: '2024-06-09' }))]; const cI = fA.querySelector('input');
  const [fE, E] = inp('Add EOT (days)', 0, { min: 0 });
  const out = h('div.wg-out');
  const tables = data.contract.pcc.tables;
  const seg = h('div.seg', h('button', { type: 'button', 'aria-pressed': 'true', onclick: (e) => set(7, e) }, '7 LD milestones (PCC 2.2)'), h('button', { type: 'button', 'aria-pressed': 'false', onclick: (e) => set(41, e) }, '41 programme milestones (PCC 41.2)'));
  let which = 7;
  const set = (n, e) => { which = n; seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); calc(); };
  const calc = () => {
    const c = D.fromIso(cI.value); const eot = num(E);
    const rows = which === 7 ? tables.ms7 : tables.ms41;
    const max = 1403 + eot;
    const now = c ? D.diffDays(c, D.today()) : 0;
    mount(out, h('div.gantt',
      h('div.gantt__now', { style: { left: `calc(12rem + (100% - 12rem) * ${Math.min(1, Math.max(0, now / max))})` } }, h('span', `today · day ${now}`)),
      rows.map((r) => {
        const day = r.days + eot;
        const date = c ? D.addDays(c, day) : null;
        const past = now > day;
        return h(`div.gantt__row${past ? '.is-past' : ''}`, { title: r.text },
          h('span.gantt__lbl', h('b', r.no), ' ', r.text),
          h('span.gantt__track', h('span.gantt__bar', { style: { width: `${(day / max) * 100}%` } }), h('span.gantt__day', `day ${day}${date ? ' · ' + D.fmtShort(date) : ''}`)));
      })),
    h('p.wg-note', rich(which === 7 ? 'Milestones 1–6 carry LDs of 0.05% of the activity price per day; Milestone 7 carries 0.05% of the final Contract Price (PCC 61.1–61.2). Enter EOT days to shift the dates.' : 'The programme must show all 41 milestones completed on time (PCC 41.2).')));
  };
  [cI, E].forEach((i) => i.addEventListener('input', calc));
  calc();
  return h('div.wg.wg--wide', h('div.wg-in.wg-in--row', fA, fE, seg), out);
}

/* ── Writing widgets for lessons ── */
export const anatomy = (data) => h('div.anatomy', data.writing.anatomy.map((a, i) => h('div.anatomy__row', h('span.anatomy__n', String(i + 1).padStart(2, '0')), h('div', h('b', a.part), h('code.anatomy__eg', a.eg), h('p', rich(a.why))))));
export const rules = (data) => h('ol.rules.rules--big', data.writing.rules.map((r) => h('li', h('b', r.title), h('span', rich(r.text)))));
export const mistakes = (data) => h('div.mistakes', data.writing.mistakes.map((m) => h('div.mistake',
  h('p.mistake__bad', h('span.stamp.stamp--tape', { style: { '--rot': '-4deg' } }, 'Weak'), h('span', m.bad)),
  h('p.mistake__good', h('span.stamp.stamp--ok', { style: { '--rot': '3deg' } }, 'Better'), h('span', m.good)),
  h('p.mistake__why', rich(m.why)))));
export const playbooks = (data) => h('div.grid.grid--2', data.writing.playbooks.map((p) => h('section.card', h('h3.pb__t', p.when), h('ol.pb__steps', p.steps.map((s) => h('li', rich(s)))))));

export const WIDGETS = { 'ld-calc': ldCalc, 'ipc-calc': ipcCalc, 'advance-sim': advanceSim, 'risk-sort': riskSort, lifecycle, milestones, anatomy, rules, mistakes, playbooks };
