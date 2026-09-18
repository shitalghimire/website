/* Boot: the gate. Unseal, then hand the payload to the app. */

import { open, remember, recall, forget, VaultError } from './lib/vault.js';

/* A remembered code that no longer opens the file is an earlier one. Keep it
   aside so sync can move synced progress across to the new code (see
   courses/sync/sync.js, which reads this key). Written here rather than
   imported, so a gate script fresher than the cached modules still loads. */
const retireCode = (c) => {
  try {
    const k = 'courses-sync:old-codes';
    const list = JSON.parse(localStorage.getItem(k) || '[]');
    if (c && !list.includes(c)) localStorage.setItem(k, JSON.stringify([c, ...list].slice(0, 3)));
  } catch { /* storage unavailable */ }
};

const $ = (s) => document.querySelector(s);
const gate = $('#gate');
const form = $('#gateForm');
const input = $('#gateCode');
const msg = $('#gateMsg');
const go = $('#gateGo');

async function unseal(code, { silent = false } = {}) {
  msg.className = 'gate__msg is-busy';
  msg.textContent = 'Checking the seal…';
  go.disabled = true;
  try {
    const data = await open(code);
    remember(code, $('#gateRemember').checked || !!localStorage.getItem('registry:unlocked'));
    msg.textContent = '';
    gate.classList.add('is-open');
    const { startApp } = await import('./app.js');
    setTimeout(() => {
      gate.hidden = true;
      $('#app').hidden = false;
      startApp(data, code);
    }, silent ? 0 : 820);
  } catch (err) {
    go.disabled = false;
    if (silent) { msg.textContent = ''; msg.className = 'gate__msg'; if (err.kind === 'bad-code') { retireCode(code); forget(); } input.focus(); return; }
    msg.className = 'gate__msg';
    msg.textContent = err instanceof VaultError ? err.message : 'Something went wrong while opening the file.';
    if (err.kind === 'bad-code') {
      gate.classList.remove('is-bad'); void gate.offsetWidth; gate.classList.add('is-bad');
      input.select();
    }
    if (!(err instanceof VaultError)) console.error(err);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = input.value.replace(/\s+/g, '');
  if (!code) { msg.textContent = 'Enter the access code.'; input.focus(); return; }
  unseal(code);
});
input.addEventListener('input', () => { msg.textContent = ''; gate.classList.remove('is-bad'); });

const known = recall();
if (known) unseal(known, { silent: true }); else input.focus();
