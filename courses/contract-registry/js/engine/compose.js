/* Letter composer — fills templates in the TKV house format. */

import * as D from '../lib/dates.js';

export function fill(str, values, fields, { preview = false } = {}) {
  const label = (k) => fields.find((f) => f.key === k)?.label || k;
  let s = str.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, inner) => (values[k] ? inner : ''));
  s = s.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    let v = values[k];
    const f = fields.find((x) => x.key === k);
    if (v && f?.type === 'date') v = D.fmt(D.fromIso(v));
    if (v) return String(v).trim().replace(/[.\s]+$/, (m) => (m.includes('.') ? '.' : ''));
    return `⟦${label(k)}⟧`;
  });
  return s.replace(/\s+([.,;:])/g, '$1').replace(/\.\./g, '.').trim();
}

export function compose(tpl, values, header, house) {
  const subject = fill(header.subject || tpl.subject, values, tpl.fields);
  const body = tpl.body.map((p) => fill(p, values, tpl.fields)).filter(Boolean);
  const year = (header.date ? D.fromIso(header.date) : D.today()).getFullYear();
  const ourRef = `${house.refPrefix.replace('{{year}}', year)}${header.refNo || '___'}`;
  const date = header.date ? D.fmt(D.fromIso(header.date)) : D.fmt(D.today());
  const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const yours = lines(header.yourRefs);
  const ours = lines(header.ourRefs);
  let n = 0;
  const refList = [
    ...(yours.length ? [{ h: 'Your Letter ref.:', items: yours.map((x) => `${x} [${++n}]`) }] : []),
    ...(ours.length ? [{ h: 'Contractor\'s Letter ref.:', items: ours.map((x) => `${x} [${++n}]`) }] : []),
  ];
  return { ourRef, date, subject, body, refList, header, house };
}

const unb = (s) => String(s).replace(/⟦([^⟧]*)⟧/g, '[$1]');

export function toText(L) {
  const hh = L.house;
  const out = [
    hh.company, hh.project, hh.lot, '',
    `Our ref.: ${L.ourRef}        Date: ${L.date}`, '',
    'To', ...hh.to, `Attn. ${L.header.attn || hh.attn}`, L.header.attnTitle || hh.attnTitle, '',
    `Contract No.: ${hh.contractNo}`,
    ...L.refList.flatMap((g) => [g.h, ...g.items]), '',
    `Subject: ${L.subject}`, '',
    'Dear Sir,', '',
    ...L.body.flatMap((p) => [p, '']),
    'Yours sincerely,', '', '',
    L.header.signName || hh.signName, L.header.signTitle || hh.signTitle, '',
    `CC: ${L.header.cc || hh.cc}`,
  ];
  return unb(out.join('\n'));
}

const esc = (s) => unb(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toDoc(L) {
  const hh = L.house;
  const p = (s, style = '') => `<p style="margin:0 0 8pt;${style}">${esc(s)}</p>`;
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(L.subject)}</title>
<style>body{font-family:'Times New Roman',serif;font-size:11.5pt;line-height:1.35} .hd{text-align:center;font-weight:bold} .mono{font-family:'Courier New',monospace;font-size:10pt}</style></head><body>
${p(hh.company, 'text-align:center;font-weight:bold;font-size:14pt;margin:0')}${p(hh.project, 'text-align:center;font-weight:bold;margin:0')}${p(hh.lot, 'text-align:center;margin:0 0 12pt')}
<table style="width:100%;font-size:10.5pt;border-collapse:collapse"><tr><td>Our ref.: <b>${esc(L.ourRef)}</b></td><td style="text-align:center">T. Pages: 1 of __</td><td style="text-align:right">Date: ${esc(L.date)}</td></tr></table><br>
${p('To', 'margin:0')}${hh.to.map((x) => p(x, 'margin:0')).join('')}${p('Attn. ' + (L.header.attn || hh.attn), 'margin:0')}${p(L.header.attnTitle || hh.attnTitle, 'margin:0 0 8pt')}
${p('Contract No.: ' + hh.contractNo)}
${L.refList.map((g) => p(g.h, 'margin:0') + g.items.map((x) => p(x, 'margin:0 0 0 18pt')).join('')).join('')}<br>
${p('Subject: ' + L.subject, 'font-weight:bold;text-decoration:underline')}
${p('Dear Sir,')}
${L.body.map((x) => p(x, 'text-align:justify')).join('')}
${p('Yours sincerely,')}<br><br>
${p(L.header.signName || hh.signName, 'margin:0;font-weight:bold')}${p(L.header.signTitle || hh.signTitle)}
${p('CC: ' + (L.header.cc || hh.cc))}
</body></html>`;
}
