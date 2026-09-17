/* Icons drawn on a 24 grid — plain line work, no stock-kit rounding.
   Static markup, shipped with the page. */

import { h } from './lib.js';

const S = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const icons = {
  start: S('<path d="M4 5.5h16v13H4z"/><path d="M4 9.5h16"/><path d="M7.2 7.5h.01M9.6 7.5h.01"/><path d="M7.5 13h6M7.5 16h9"/>'),
  cees: S('<path d="M4 4.5h6v6H4zM14 4.5h6v6h-6zM4 13.5h6v6H4zM14 13.5h6v6h-6z"/>'),
  types: S('<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/><circle cx="8" cy="6.5" r="2.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="10.5" cy="17.5" r="2.1" fill="currentColor" stroke="none"/>'),
  before: S('<path d="M6 3.5h9.5L19 7v13.5H6z"/><path d="M15 3.6V7h3.6"/><path d="M8.8 12.4l1.9 1.9 4-4.3"/><path d="M8.8 17h6"/>'),
  binder: S('<path d="M5 4.5h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5z"/><path d="M5 4.5a1.6 1.6 0 0 0 0 15"/><path d="M19 8h2M19 12h2M19 16h2"/>'),
  style: S('<path d="M14.8 4.4 19.6 9.2 9 19.8l-4.8 1 1-4.8z"/><path d="m13 6.2 4.8 4.8"/><path d="M4 21.5h9"/>'),
  proof: S('<path d="M12 3.2 20 6v5.6c0 4.2-3.1 7.5-8 9.2-4.9-1.7-8-5-8-9.2V6z"/><path d="m8.6 11.8 2.3 2.3 4.5-4.8"/>'),
  response: S('<path d="M20.5 15.5H8.2L4 19V5.5a1 1 0 0 1 1-1h14.5a1 1 0 0 1 1 1z"/><path d="M8 9h9M8 12h6"/>'),
  worked: S('<path d="M4 19.5h16"/><path d="M6.5 19.5V9M11 19.5V5M15.5 19.5v-7M20 19.5v-4"/>'),
  drill: S('<path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.9 9.4 9z"/>'),
  scale: S('<path d="M12 4v16M6.5 20h11"/><path d="M4 8.5h16"/><path d="M4 8.5 1.8 14h4.4zM20 8.5 17.8 14h4.4z"/>'),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5"/>'),
  moon: S('<path d="M19.6 14.8A8 8 0 0 1 9.2 4.4 8 8 0 1 0 19.6 14.8z"/>'),
  arrow: S('<path d="M4.5 12h15M13.5 6l6 6-6 6"/>'),
  back: S('<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>'),
  check: S('<path d="m4.5 12.5 5 5 10-11"/>'),
  x: S('<path d="m6 6 12 12M18 6 6 18"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  alert: S('<path d="M12 3.4 21.2 19.6H2.8z"/><path d="M12 9.6v4.6M12 16.9v.3" stroke-width="2"/>'),
  info: S('<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5.4M12 7.8v.3" stroke-width="2"/>'),
  copy: S('<path d="M8.5 8.5h10v11h-10z"/><path d="M15.5 8.5v-4h-10v11h3"/>'),
  clock: S('<circle cx="12" cy="12.4" r="7.6"/><path d="M12 8.4v4.2l2.7 1.8"/>'),
  money: S('<circle cx="12" cy="12" r="8.4"/><path d="M12 7v10M14.6 9.4c-.6-.8-1.5-1.2-2.6-1.2-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2 2.8.7 2.8 2.1-1.2 2.1-2.8 2.1c-1.2 0-2.2-.5-2.8-1.3"/>'),
  doc: S('<path d="M6.5 3.5h8L18.5 7v13.5h-12z"/><path d="M14.4 3.6V7H18"/><path d="M9 11.5h6M9 14.5h6M9 17.5h3.5"/>'),
  search: S('<circle cx="10.8" cy="10.8" r="6"/><path d="m15.2 15.2 5 5"/>'),
  menu: S('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  play: S('<path d="M8 5.5v13l10-6.5z"/>'),
  refresh: S('<path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2"/><path d="M19.4 4.6v4.2h-4.2"/>'),
  book: S('<path d="M4 5c2.6-.9 5.3-.7 8 1v13c-2.7-1.6-5.4-1.9-8-1z"/><path d="M20 5c-2.6-.9-5.3-.7-8 1v13c2.7-1.6 5.4-1.9 8-1z"/>'),
  link: S('<path d="M10.3 13.7a3.8 3.8 0 0 0 5.4 0l2.6-2.6a3.8 3.8 0 0 0-5.4-5.4l-1.4 1.4"/><path d="M13.7 10.3a3.8 3.8 0 0 0-5.4 0l-2.6 2.6a3.8 3.8 0 0 0 5.4 5.4l1.4-1.4"/>'),
  tag: S('<path d="M11.4 3.6H20v8.6l-8.3 8.3a1.2 1.2 0 0 1-1.7 0l-6.9-6.9a1.2 1.2 0 0 1 0-1.7z"/><circle cx="16.4" cy="7.6" r="1.4"/>'),
};

export const icon = (name, cls = '') => h(`span.ic${cls ? '.' + cls : ''}`, { svg: icons[name] || icons.doc, 'aria-hidden': 'true' });
