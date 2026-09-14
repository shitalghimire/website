/* Sync across devices — the panel */

import { h, mount, toast } from '../lib/h.js';
import { icon } from '../lib/icons.js';
import { describe, TOKEN_URL } from '../../../sync/sync.js';

export function syncBadge(sync) {
  const dot = h('span.sync-dot');
  const btn = h('button.rail__btn.rail__sync', { type: 'button', 'aria-label': 'Sync across devices' }, icon('cloud'), dot);
  sync.on((st) => { dot.dataset.state = st.state; btn.title = describe(st); });
  return btn;
}

export function openSync(sync) {
  const pal = document.getElementById('palette');
  const body = h('div.syncp__body');
  const input = h('input.input', { type: 'password', placeholder: 'ghp_…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'GitHub token' });
  const msg = h('p.syncp__msg', { role: 'status' });

  const draw = (st) => {
    const connected = sync.isConnected();
    mount(body,
      h(`div.syncp__status.syncp__status--${st.state}`, h('span.sync-dot', { dataset: { state: st.state } }), h('b', describe(st))),
      connected
        ? h('div.syncp__on',
          h('p', 'Your progress, notes, drafts, clocks and quiz history are kept in step on every device where you have connected. Changes sync a few seconds after you make them, and when you come back to the tab.'),
          h('div.row',
            h('button.btn.btn--stamp', { type: 'button', onclick: async () => { const s = await sync.syncNow(); if (s.state === 'synced') toast('Synced'); } }, icon('refresh'), 'Sync now'),
            h('button.btn.btn--ghost', { type: 'button', onclick: () => { if (confirm('Stop syncing on this device? Progress stays here and in your gist.')) sync.disconnect(); } }, 'Disconnect this device')),
          h('p.muted.syncp__small', 'The same connection is used by the Delay Analysis course on this device.'))
        : h('div.syncp__off',
          h('p', 'Sync keeps your progress the same on your laptop, phone and any other device you use. It is stored in a private Gist in your own GitHub account, encrypted with your access code — nobody else can read it.'),
          h('ol.syncp__steps',
            h('li', 'On a device where you are signed in to GitHub, open ', h('a', { href: TOKEN_URL, target: '_blank', rel: 'noopener' }, 'New personal access token (classic)'), '.'),
            h('li', 'Note: ', h('b', 'Course progress sync'), '. Expiration: choose ', h('b', 'No expiration'), ' (or a long one). Scopes: tick only ', h('b', 'gist'), '.'),
            h('li', 'Press ', h('b', 'Generate token'), ', copy it (it starts with ', h('code', 'ghp_'), ') and paste it below. Keep a copy in your password manager — you paste the same token once on each device.')),
          h('form.syncp__form', { onsubmit: async (e) => {
            e.preventDefault();
            msg.textContent = 'Connecting…';
            try { await sync.connect(input.value); input.value = ''; msg.textContent = ''; toast('Sync is on'); }
            catch (err) { msg.textContent = err.message; }
          } }, input, h('button.btn.btn--stamp', { type: 'submit' }, icon('cloud'), 'Connect')),
          msg,
          h('p.muted.syncp__small', 'Progress already on this device is kept and combined with what is already synced. The token is stored on this device only, encrypted with your access code.')));
  };

  const off = sync.on(draw);
  mount(pal, h('div.palette__box.syncp', { role: 'dialog', 'aria-label': 'Sync across devices' },
    h('div.syncp__head', h('span.syncp__icon', icon('cloud')), h('h2', 'Sync across devices'), h('button.btn.btn--ghost.btn--sm', { type: 'button', 'aria-label': 'Close', onclick: close }, icon('x'))),
    body));
  pal.hidden = false;
  pal.onclick = (e) => { if (e.target === pal) close(); };
  function close() { off(); pal.hidden = true; mount(pal); }
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
}
