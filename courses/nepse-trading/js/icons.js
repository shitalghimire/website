/* ═══════════════════════════════════════════════════════════════
   NEPSE TRADING ACADEMY — icon set
   One stroke weight, one 24-unit grid, drawn with createElementNS so
   no markup string is ever parsed. Shapes follow the Lucide geometry.
   ═══════════════════════════════════════════════════════════════ */

const NS = 'http://www.w3.org/2000/svg';

/* [tag, attrs] pairs. A bare string is shorthand for a path `d`. */
const I = {
  dashboard: [['rect', { x: 3, y: 3, width: 7, height: 9, rx: 1.5 }], ['rect', { x: 14, y: 3, width: 7, height: 5, rx: 1.5 }], ['rect', { x: 14, y: 12, width: 7, height: 9, rx: 1.5 }], ['rect', { x: 3, y: 16, width: 7, height: 5, rx: 1.5 }]],
  games: ['M6 11h4', 'M8 9v4', 'M15 12h.01', 'M18 10h.01', 'M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z'],
  book: ['M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z', 'M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z'],
  glossary: ['M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20', 'M9 7h6', 'M9 11h4'],
  compass: [['circle', { cx: 12, cy: 12, r: 10 }], 'm16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z'],
  settings: ['M21 4h-7', 'M10 4H3', 'M21 12h-9', 'M8 12H3', 'M21 20h-5', 'M12 20H3', 'M14 2v4', 'M8 10v4', 'M16 18v4'],
  award: [['circle', { cx: 12, cy: 8, r: 6 }], 'M15.477 12.89 17 22l-5-3-5 3 1.523-9.11'],
  search: [['circle', { cx: 11, cy: 11, r: 7.5 }], 'm21 21-4.3-4.3'],
  sun: [['circle', { cx: 12, cy: 12, r: 4 }], 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  monitor: [['rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }], 'M8 21h8', 'M12 17v4'],
  flame: ['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  clock: [['circle', { cx: 12, cy: 12, r: 10 }], 'M12 6v6l4 2'],
  check: ['M20 6 9 17l-5-5'],
  checkCircle: [['circle', { cx: 12, cy: 12, r: 10 }], 'm9 12 2 2 4-4'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronLeft: ['m15 18-6-6 6-6'],
  arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
  arrowLeft: ['M19 12H5', 'm12 19-7-7 7-7'],
  arrowUpRight: ['M7 7h10v10', 'M7 17 17 7'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  trophy: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'],
  target: [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 12, r: 6 }], ['circle', { cx: 12, cy: 12, r: 2 }]],
  trendingUp: ['m22 7-8.5 8.5-5-5L2 17', 'M16 7h6v6'],
  candles: ['M9 5v4', ['rect', { x: 7, y: 9, width: 4, height: 6, rx: 1 }], 'M9 15v2', 'M17 3v2', ['rect', { x: 15, y: 5, width: 4, height: 8, rx: 1 }], 'M17 13v3', 'M3 3v18h18'],
  layers: ['M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'],
  sparkles: ['M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z', 'M20 3v4', 'M22 5h-4'],
  chart: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  mountain: ['m8 3 4 8 5-5 5 15H2L8 3z'],
  calculator: [['rect', { x: 4, y: 2, width: 16, height: 20, rx: 2 }], 'M8 6h8', 'M16 14v4', 'M16 10h.01', 'M12 10h.01', 'M8 10h.01', 'M12 14h.01', 'M8 14h.01', 'M12 18h.01', 'M8 18h.01'],
  help: [['circle', { cx: 12, cy: 12, r: 10 }], 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  listChecks: ['m3 17 2 2 4-4', 'm3 7 2 2 4-4', 'M13 6h8', 'M13 12h8', 'M13 18h8'],
  lock: [['rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }], 'M7 11V7a5 5 0 0 1 10 0v4'],
  play: ['M6 3.5v17a.5.5 0 0 0 .76.43l14-8.5a.5.5 0 0 0 0-.86l-14-8.5A.5.5 0 0 0 6 3.5z'],
  terminal: ['m4 17 6-6-6-6', 'M12 19h8'],
  receipt: ['M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z', 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8', 'M12 17.5v-11'],
  briefcase: ['M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', ['rect', { x: 2, y: 6, width: 20, height: 14, rx: 2 }]],
  percent: ['M19 5 5 19', ['circle', { cx: 6.5, cy: 6.5, r: 2.5 }], ['circle', { cx: 17.5, cy: 17.5, r: 2.5 }]],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  reset: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  info: [['circle', { cx: 12, cy: 12, r: 10 }], 'M12 16v-4', 'M12 8h.01'],
  alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  cap: ['M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z', 'M22 10v6', 'M6 12.5V16a6 3 0 0 0 12 0v-3.5'],
  circle: [['circle', { cx: 12, cy: 12, r: 9 }]],
  printer: ['M6 9V3h12v6', ['rect', { x: 6, y: 14, width: 12, height: 8, rx: 1 }], 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'],
  globe: [['circle', { cx: 12, cy: 12, r: 10 }], 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z']
};

/**
 * icon('clock', 18) → <svg class="ic">…</svg>
 * Decorative by default; pass a label to expose it to assistive tech.
 */
export function icon(name, size = 18, label = null) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', 'ic');
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  else svg.setAttribute('aria-hidden', 'true');

  for (const part of I[name] || I.circle) {
    const [tag, attrs] = typeof part === 'string' ? ['path', { d: part }] : part;
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    svg.append(n);
  }
  return svg;
}

/** The academy mark: three candles in a rounded tile. */
export function brandMark(size = 32) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'brandmark');
  const parts = [
    ['rect', { x: 0, y: 0, width: 32, height: 32, rx: 9, class: 'brandmark__tile' }],
    ['path', { d: 'M9.5 8v4M9.5 20v4M16 5v3M16 19v4M22.5 10v3M22.5 20v3', class: 'brandmark__wick' }],
    ['rect', { x: 7, y: 12, width: 5, height: 8, rx: 1.4, class: 'brandmark__c1' }],
    ['rect', { x: 13.5, y: 8, width: 5, height: 11, rx: 1.4, class: 'brandmark__c2' }],
    ['rect', { x: 20, y: 13, width: 5, height: 7, rx: 1.4, class: 'brandmark__c3' }]
  ];
  for (const [tag, attrs] of parts) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    svg.append(n);
  }
  return svg;
}

/** Progress ring. `value` is 0..1. */
export function ring(value, size = 64, stroke = 6) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('class', 'ring');
  svg.setAttribute('aria-hidden', 'true');
  const mk = (cls, extra = {}) => {
    const n = document.createElementNS(NS, 'circle');
    const a = { cx: size / 2, cy: size / 2, r, fill: 'none', 'stroke-width': stroke, class: cls, ...extra };
    for (const [k, v] of Object.entries(a)) n.setAttribute(k, v);
    return n;
  };
  svg.append(
    mk('ring__track'),
    mk('ring__fill', {
      'stroke-dasharray': c.toFixed(2),
      'stroke-dashoffset': (c * (1 - Math.max(0, Math.min(1, value)))).toFixed(2),
      'stroke-linecap': 'round',
      transform: `rotate(-90 ${size / 2} ${size / 2})`
    })
  );
  return svg;
}
