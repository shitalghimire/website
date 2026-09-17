/* ═══════════════════════════════════════════════════════════════
   HUD — DOM, not canvas.

   Text in a canvas at this scale either blurs or costs a font
   atlas, and the readouts do not need to move with the camera. So
   the shaft is canvas and everything around it is ordinary HTML,
   which also means it is selectable, scalable and accessible for
   free.

   Icons are inlined SVG (see icons.js) rather than external files.
   An <img>-loaded SVG cannot inherit `currentColor` at all, and a
   url() inside a CSS custom property resolves against the
   stylesheet rather than the document — inlining sidesteps both
   and costs no requests.
   ═══════════════════════════════════════════════════════════════ */

import { icon } from './icons.js';

const KEY = 'sg.descent.';

/* re-exported so the rest of the game has one import site for it */
export { icon };

/* ---------- persistence ---------- */
export const store = {
  get(k, d = 0) {
    try {
      const v = localStorage.getItem(KEY + k);
      return v == null ? d : (isNaN(parseFloat(v)) ? v : parseFloat(v));
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(KEY + k, String(v)); } catch (e) {}
  },
  bump(k, by = 1) {
    const v = this.get(k, 0) + by;
    this.set(k, v);
    return v;
  },
  best(k, v) {
    if (v > this.get(k, 0)) { this.set(k, v); return true; }
    return false;
  },
};

export class Hud {
  constructor(root) {
    this.el = {
      depth: root.querySelector('#hDepth'),
      score: root.querySelector('#hScore'),
      gems: root.querySelector('#hGems'),
      hearts: root.querySelector('#hHearts'),
      ammo: root.querySelector('#hAmmo'),
      combo: root.querySelector('#hCombo'),
      comboN: root.querySelector('#hComboN'),
      zone: root.querySelector('#hZone'),
      best: root.querySelector('#hBest'),
      perkRow: root.querySelector('#hPerks'),
    };
    this._hp = -1;
    this._ammo = -1;
    this._maxAmmo = -1;
    this._combo = -1;
    this._depth = -1;
    this._score = -1;
    this._gems = -1;
    this._zone = '';
    this._perkSig = '';
  }

  /* only touch the DOM when a value actually changed — this runs
     every frame */
  sync(g) {
    const p = g.player;

    const depth = Math.floor(g.depth);
    if (depth !== this._depth) {
      this._depth = depth;
      this.el.depth.textContent = depth;
    }

    const score = Math.floor(g.score);
    if (score !== this._score) {
      this._score = score;
      this.el.score.textContent = score.toLocaleString('en-US');
    }

    if (g.gems !== this._gems) {
      this._gems = g.gems;
      this.el.gems.textContent = g.gems;
    }

    if (p.hp !== this._hp || p.stats.maxHp !== this._maxHp) {
      this._hp = p.hp;
      this._maxHp = p.stats.maxHp;
      let h = '';
      for (let i = 0; i < p.stats.maxHp; i++) {
        h += `<i class="pip pip--heart${i < p.hp ? ' is-on' : ''}"></i>`;
      }
      this.el.hearts.innerHTML = h;
    }

    if (p.ammo !== this._ammo || p.stats.maxAmmo !== this._maxAmmo) {
      this._ammo = p.ammo;
      this._maxAmmo = p.stats.maxAmmo;
      let a = '';
      for (let i = 0; i < p.stats.maxAmmo; i++) {
        a += `<i class="pip pip--ammo${i < p.ammo ? ' is-on' : ''}"></i>`;
      }
      this.el.ammo.innerHTML = a;
      this.el.ammo.classList.toggle('is-empty', p.ammo === 0);
    }

    if (p.combo !== this._combo) {
      this._combo = p.combo;
      this.el.comboN.textContent = p.combo;
      this.el.combo.classList.toggle('is-live', p.combo > 1);
      if (p.combo > 1) {
        this.el.combo.classList.remove('pop');
        void this.el.combo.offsetWidth;   /* restart the keyframe */
        this.el.combo.classList.add('pop');
      }
    }

    if (g.zone.name !== this._zone) {
      this._zone = g.zone.name;
      this.el.zone.textContent = g.zone.name;
    }

    const sig = JSON.stringify(g.perks.taken);
    if (sig !== this._perkSig) {
      this._perkSig = sig;
      this.el.perkRow.innerHTML = g.perks.list()
        .map((p) => `<span class="mini" title="${p.name}">${icon(p.icon)}${p.count > 1 ? `<b>${p.count}</b>` : ''}</span>`)
        .join('');
    }
  }

  setBest(v) {
    if (this.el.best) this.el.best.textContent = Math.floor(v);
  }
}

/* ═══════════════ overlays ═══════════════ */

/* How long after an overlay opens its buttons stay inert.
   Without this, a screen that appears while the player is holding
   the fire key gets dismissed by that keypress: the button takes
   focus between keydown and keyup, so the browser treats the keyup
   as an activation and the choice makes itself. */
const ARM_MS = 280;

export class Overlay {
  constructor(el) {
    this.el = el;
    this.body = el.querySelector('#ovBody');
    this.open = false;
    this.openedAt = 0;
  }

  /* opts.autofocus — pass false for screens where an accidental
     activation would cost the player something they cannot undo */
  show(html, cls = '', opts = {}) {
    this.el.className = 'ov is-open ' + cls;
    this.body.innerHTML = html;
    this.el.hidden = false;
    this.open = true;
    this.openedAt = performance.now();

    if (opts.autofocus === false) {
      /* focus the panel itself: screen readers still announce it and
         Tab reaches the buttons, but no button is pre-armed */
      this.body.setAttribute('tabindex', '-1');
      this.body.focus({ preventScroll: true });
    } else {
      const btn = this.body.querySelector('[data-focus]') || this.body.querySelector('button');
      if (btn) btn.focus({ preventScroll: true });
    }
  }

  /* false for the first few frames after opening */
  get armed() {
    return this.open && performance.now() - this.openedAt > ARM_MS;
  }

  hide() {
    this.el.hidden = true;
    this.el.className = 'ov';
    this.open = false;
    this.openedAt = 0;
    this.body.innerHTML = '';
  }
}

/* ---------- screens ---------- */

export function titleScreen(best, bestScore, runs) {
  return `
    <p class="ov__kicker">${icon('depth')} Vertical descent</p>
    <h1 class="ov__title">DESC<i>E</i>NT</h1>
    <p class="ov__lede">
      Your boots are the gun. Fire down to kill what is below you and to
      break your fall. Ammo only comes back when you <b>land</b> or
      <b>stomp</b> &mdash; and the combo only counts while your feet are off
      the ground.
    </p>

    <div class="keys keys--kbd">
      <div class="keys__g">
        <span class="key">A</span><span class="key">D</span>
        <span class="key key--wide">&larr; &rarr;</span>
        <em>move</em>
      </div>
      <div class="keys__g">
        <span class="key key--vis">SPACE</span>
        <span class="key">S</span>
        <em>shoot / hover</em>
      </div>
      <div class="keys__g">
        <span class="key">ESC</span><em>pause</em>
      </div>
    </div>

    <div class="keys keys--touch">
      <div class="keys__g">
        <span class="key key--wide">&larr; &rarr;</span><em>move</em>
      </div>
      <div class="keys__g">
        <span class="key key--vis key--wide">FIRE</span><em>shoot / hover</em>
      </div>
    </div>

    <div class="stats stats--title">
      <div><dt>${icon('depth')} Best depth</dt><dd>${Math.floor(best)}<small>m</small></dd></div>
      <div><dt>${icon('trophy')} Best score</dt><dd>${Math.floor(bestScore).toLocaleString('en-US')}</dd></div>
      <div><dt>${icon('ranking')} Runs</dt><dd>${Math.floor(runs)}</dd></div>
    </div>

    <button class="btn btn--go" id="ovStart" data-focus>Drop in <span>&darr;</span></button>
    <p class="ov__foot">On a phone? Tilt to landscape and use the pads at the bottom.</p>
  `;
}

export function pauseScreen(g) {
  return `
    <p class="ov__kicker">${icon('pause')} Paused</p>
    <h2 class="ov__h2">Holding at <b>${Math.floor(g.depth)}m</b></h2>
    <div class="stats">
      <div><dt>Score</dt><dd>${Math.floor(g.score).toLocaleString('en-US')}</dd></div>
      <div><dt>Gems</dt><dd>${g.gems}</dd></div>
      <div><dt>Zone</dt><dd>${g.zone.name}</dd></div>
    </div>
    <div class="ov__row">
      <button class="btn btn--go" id="ovResume" data-focus>Resume</button>
      <button class="btn" id="ovQuit">End run</button>
    </div>
  `;
}

/* The cameo now lives on the run summary and in the in-play
   transmission strip, both of which sit outside the run rather
   than stopping it. It used to front a modal perk picker at every
   zone break, which read well but broke the pacing. */
export function deathScreen(g, rec) {
  const perks = g.perks.list();
  return `
    <div class="signoff">
      <div class="signoff__port" id="ovPortrait"></div>
      <div>
        <p class="signoff__name">S. GHIMIRE</p>
        <p class="signoff__role">Surveyor &mdash; signed off at ${Math.floor(g.maxDepth)}m</p>
      </div>
    </div>
    <p class="ov__kicker ov__kicker--bad">${icon('skull')} Run ended</p>
    <h2 class="ov__title ov__title--sm">${Math.floor(g.depth)}<small>m</small></h2>
    ${rec.depth ? `<p class="badge">${icon('trophy')} New deepest run</p>` : ''}
    ${rec.score && !rec.depth ? `<p class="badge">${icon('trophy')} New best score</p>` : ''}

    <div class="stats">
      <div><dt>${icon('xp')} Score</dt><dd>${Math.floor(g.score).toLocaleString('en-US')}</dd></div>
      <div><dt>${icon('gem')} Gems</dt><dd>${g.gems}</dd></div>
      <div><dt>${icon('combo')} Best combo</dt><dd>&times;${g.player.bestCombo}</dd></div>
      <div><dt>${icon('skull')} Kills</dt><dd>${g.kills}</dd></div>
      <div><dt>${icon('depth')} Deepest</dt><dd>${Math.floor(store.get('bestDepth'))}<small>m</small></dd></div>
      <div><dt>${icon('level')} Zone</dt><dd>${g.zone.name}</dd></div>
    </div>

    ${perks.length ? `<p class="ov__sub">Carried</p>
      <div class="loadout">${perks.map((p) =>
        `<span class="mini mini--lg" title="${p.blurb}">${icon(p.icon)} ${p.name}${p.count > 1 ? ` &times;${p.count}` : ''}</span>`,
      ).join('')}</div>` : ''}

    <div class="ov__row">
      <button class="btn btn--go" id="ovAgain" data-focus>${icon('restart')} Again</button>
      <button class="btn" id="ovMenu">Menu</button>
    </div>
  `;
}
