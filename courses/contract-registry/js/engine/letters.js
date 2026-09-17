/* Letter reference numbers → keys the register can be looked up by.

   Three families of number appear on TKV:
     LOT-01/SINOHYDRO-KSNS JV/0123   the Engineer writing to us
     TKV/COM/2024/0456               us writing to the Engineer
     DOLSAR-CSPDR JV/LOT1_0123       the Engineer's own house format         */

export function normLetterRef(raw) {
  const s = String(raw || '').toUpperCase().replace(/\s+/g, '');
  let m = s.match(/LOT-?0?1\/?SINOHYDRO-?KSNS-?JV\/?(\d{1,4})/);
  if (m) return { key: 'in:' + +m[1], kind: 'er', no: +m[1] };
  m = s.match(/TKV[/-]?I?COM[/-]?(20\d\d)[/-]?(\d{1,4})/);
  if (m) return { key: 'out:' + +m[2], kind: 'ours', no: +m[2], year: +m[1] };
  m = s.match(/DOLSAR[-_]?CSPDR[-_ ]?(?:JV)?[/_ ]?(?:LOT1_)?(\d{1,4})/);
  if (m) return { key: 'in:' + +m[1], kind: 'er', no: +m[1] };
  return null;
}
