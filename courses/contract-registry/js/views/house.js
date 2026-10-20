/* ═══════════════════════════════════════════════════════════════
   THE REGISTRY — 3D Interactive Contract Learning House View
   Bridges decrypted contract data into the 3D House engine
   ═══════════════════════════════════════════════════════════════ */

import { h, mount } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';

export default function house(view, { ctx, data }) {
  ctx.crumbs([{ label: '3D House' }]);

  // Save decrypted data globally so house.html can read it
  if (data) {
    window.__REGISTRY_DATA__ = data;
  }

  const backLink = h('a.house-back-btn', { href: '#/', title: 'Return to 2D Contract Administrator Desk' },
    icon('back'), h('span', '← Back to 2D Desk (#/)')
  );

  const standaloneBtn = h('a.btn.btn--sm.btn--ghost.house-standalone-btn', {
    href: 'house.html',
    target: '_blank',
    rel: 'noopener noreferrer',
    title: 'Open 3D House in full standalone window'
  }, 'Open Standalone ↗');

  const titleGroup = h('div.house-stage__title-grp',
    h('span.stamp.stamp--sm.stamp--good', '3D HOUSE'),
    h('span.house-stage__title-text', 'The Contract Registry Learning House'),
    h('span.house-stage__sub', '7 Rooms · Daraz Almirah · Combination Vault · 102 Clauses')
  );

  const topBar = h('div.house-stage__bar',
    backLink,
    titleGroup,
    standaloneBtn
  );

  const iframe = h('iframe.house-stage__frame', {
    src: 'house.html',
    title: 'The Registry 3D Interactive Contract Learning House',
    allow: 'autoplay; fullscreen',
    frameborder: '0'
  });

  const stage = h('div.house-stage',
    topBar,
    h('div.house-stage__canvas-wrap', iframe)
  );

  view.classList.add('view--house');
  view.append(stage);

  // Bridge decrypted payload into 3D house when iframe loads
  const pushDataToFrame = () => {
    try {
      const win = iframe.contentWindow;
      if (win) {
        win.__REGISTRY_DATA__ = data;
        if (typeof win.mountRegistryHouse === 'function') {
          win.mountRegistryHouse(data);
        }
      }
    } catch (e) {
      console.warn('3D house data bridge notice:', e);
    }
  };

  iframe.addEventListener('load', () => {
    pushDataToFrame();
  });

  // Global bridge hook
  window.mountRegistryHouse = (d) => {
    if (d) window.__REGISTRY_DATA__ = d;
    pushDataToFrame();
  };

  // Two-way synchronization: update 2D Desk store when 3D House changes
  const handleMessage = (e) => {
    if (e.data && e.data.type === 'registry:sync' && e.data.data) {
      store.replace(e.data.data);
    }
  };
  window.addEventListener('message', handleMessage);

  // Also sync when local storage updates
  const handleStorage = (e) => {
    if (e.key === 'registry:v1' || e.key === 'registry:3d:v1') {
      try {
        const raw = localStorage.getItem('registry:v1');
        if (raw) store.replace(JSON.parse(raw));
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorage);
}
