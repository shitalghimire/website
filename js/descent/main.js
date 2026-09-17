/* ═══════════════════════════════════════════════════════════════
   DESCENT — main.

   State machine: title -> playing -> (paused) -> dying -> dead ->
   title. The loop runs continuously in every state so the shaft
   keeps drifting behind the menus; only `playing` steps the
   simulation.

   Nothing except an explicit pause ever stops a run. Perks used to
   open a modal at every zone break and it wrecked the pacing, so
   they are picked up in the shaft now — see offerPerks.

   Music intensity is derived, not scripted: speed, combo and depth
   each push it up, so the track thickens because of how you are
   playing rather than where you are. It is the cheapest way to
   make a procedural score feel authored.
   ═══════════════════════════════════════════════════════════════ */

import { TILE, COLS, WALL, VIEW_W, Screen, Input, Loop, clamp, lerp, damp, rng } from './core.js';
import { World, ZONES, ZONE_ROWS, EMPTY, zoneAt, zoneIndex } from './world.js';
import { Player, P_H } from './player.js';
import { Actors } from './actors.js';
import { Fx } from './fx.js';
import { Audio } from './audio.js';
import { PerkState } from './perks.js';
import { SURVEYOR, SURVEYOR_SMALL } from './portrait.js';
import { draw } from './render.js';
import {
  Hud, Overlay, store, icon,
  titleScreen, pauseScreen, deathScreen,
} from './hud.js';

const BASE_PALETTE = {
  plate: '#14150F',
  paper: '#F2F0EA',
  vis: '#C9E82A',
  signal: '#D4402A',
  accent: '#4FB3D9',
};

class Game {
  constructor() {
    this.screen = new Screen(document.getElementById('cv'));
    this.input = new Input();
    this.audio = new Audio();
    this.fx = new Fx();
    this.actors = new Actors(this.fx, this.audio);
    this.player = new Player(this.fx, this.audio);
    this.perks = new PerkState();
    this.hud = new Hud(document.getElementById('hud'));
    this.overlay = new Overlay(document.getElementById('ov'));

    this.palette = { ...BASE_PALETTE };
    this.state = 'title';
    this.rand = rng(Date.now() & 0x7fffffff);
    this.world = new World(this.rand.int(1e9));

    this.camY = 0;
    this.depth = 0;
    this.maxDepth = 0;
    this.score = 0;
    this.gems = 0;
    this.kills = 0;
    this.gemStreak = 0;
    this.deathT = 0;
    this.zone = ZONES[0];
    this.zoneNo = 1;
    this.zoneStartRow = 0;
    this.pendingZone = 0;
    this.timeScale = 1;
    this.muted = store.get('muted', 0) === 1;
    this.musicOn = store.get('music', 1) === 1;

    this.loop = new Loop((dt) => this.update(dt), () => this.render());
    this._wire();
    this.showTitle();
    this.loop.start();
  }

  /* ---------- setup ---------- */
  _wire() {
    const fit = () => {
      this.screen.fit();
      this.grad = null;          /* vignette is cached per height */
    };
    fit();
    addEventListener('resize', fit);
    addEventListener('orientationchange', () => setTimeout(fit, 120));

    /* the first gesture anywhere unlocks audio */
    const unlock = () => {
      this.audio.unlock();
      this.audio.setMuted(this.muted);
      this.audio.setMusicEnabled(this.musicOn);
    };
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });

    /* touch pads */
    this.input.bindTouch(
      document.getElementById('padL'),
      document.getElementById('padR'),
      document.getElementById('padF'),
    );

    /* overlay buttons are delegated — the markup is re-rendered
       on every screen, so binding per-render would leak handlers */
    this.overlay.el.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      /* ignore anything that arrives before the screen is armed —
         see Overlay.armed */
      if (!this.overlay.armed) { e.preventDefault(); return; }
      this.audio.unlock();
      if (t.id === 'ovStart' || t.id === 'ovAgain') { this.audio.ui(); this.startRun(); }
      else if (t.id === 'ovResume') { this.audio.ui(); this.resume(); }
      else if (t.id === 'ovQuit' || t.id === 'ovMenu') { this.audio.ui(); this.showTitle(); }
    });

    /* sound + music toggles live in the top bar */
    const sBtn = document.getElementById('sndBtn');
    const mBtn = document.getElementById('musBtn');
    /* the label is wrapped so narrow screens can drop it and leave
       the icon, rather than wrapping the bar onto two lines */
    const paint = () => {
      sBtn.innerHTML = icon(this.muted ? 'off' : 'on')
        + `<span>${this.muted ? 'Sound off' : 'Sound on'}</span>`;
      sBtn.setAttribute('aria-pressed', String(!this.muted));
      sBtn.setAttribute('aria-label', this.muted ? 'Sound off' : 'Sound on');
      mBtn.innerHTML = icon(this.musicOn ? 'on' : 'off')
        + `<span>${this.musicOn ? 'Music on' : 'Music off'}</span>`;
      mBtn.setAttribute('aria-pressed', String(this.musicOn));
      mBtn.setAttribute('aria-label', this.musicOn ? 'Music on' : 'Music off');
    };
    sBtn.addEventListener('click', () => {
      this.muted = !this.muted;
      store.set('muted', this.muted ? 1 : 0);
      this.audio.unlock();
      this.audio.setMuted(this.muted);
      paint();
    });
    mBtn.addEventListener('click', () => {
      this.musicOn = !this.musicOn;
      store.set('music', this.musicOn ? 1 : 0);
      this.audio.unlock();
      this.audio.setMusicEnabled(this.musicOn);
      paint();
    });
    paint();

    /* portrait can load in the background; it is not needed until
       the first zone break */
    SURVEYOR.load();
    SURVEYOR_SMALL.load();
  }

  /* ---------- screens ---------- */
  showTitle() {
    this.state = 'title';
    this.audio.stopMusic();
    this.overlay.show(
      titleScreen(store.get('bestDepth'), store.get('bestScore'), store.get('runs')),
      'ov--title',
    );
    document.body.classList.remove('is-playing');
    /* a slow idle drift behind the menu */
    this.world = new World(this.rand.int(1e9));
    this.world.ensureTo(60);
    this.camY = 0;
    this.actors.reset();
    this.fx.reset();
    this.player.dead = true;
  }

  startRun() {
    this.overlay.hide();
    document.body.classList.add('is-playing');

    this.world = new World(this.rand.int(1e9));
    this.world.ensureTo(40);
    this.actors.reset();
    this.fx.reset();
    this.perks.reset();
    this.player.reset(TILE * 3);

    this.camY = 0;
    this.depth = 0;
    this.maxDepth = 0;
    this.score = 0;
    this.gems = 0;
    this.kills = 0;
    this.gemStreak = 0;
    this.deathT = 0;
    this.timeScale = 1;
    this.zoneNo = 1;
    this.zone = ZONES[0];
    this.zoneStartRow = 0;
    this.pendingZone = 0;

    store.bump('runs');
    this.hud.setBest(store.get('bestDepth'));
    this.state = 'playing';
    this.audio.setIntensity(0.1);
    this.audio.startMusic();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.releaseAll();
    this.audio.setIntensity(0.05);
    this.overlay.show(pauseScreen(this), 'ov--pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.overlay.hide();
    this.state = 'playing';
  }

  /* ---------- zone break ----------
     This used to stop the game and open a modal to pick a perk.
     It was the wrong call: the appeal of this game is unbroken
     downward momentum, and freezing it every 96m to read three
     cards fought that every single time.

     So the offer goes into the shaft instead. Three badges fan
     across the width and you steer into the one you want while
     still falling — the choice costs you positioning rather than
     your flow, and nothing waits for a click. */
  offerPerks() {
    const offers = this.perks.offer(this.rand, 3);
    if (!offers.length) return;

    const p = this.player;
    /* far enough below to be seen and reacted to at speed, and
       clear of the boundary row itself */
    const y = p.feet + this.screen.h * 0.62;
    const row = Math.floor(y / TILE);

    /* spread across the interior, then nudge each one out of any
       rock it happens to land in */
    const inL = WALL + 1, inR = COLS - WALL - 2;
    const span = inR - inL;
    const xs = offers.map((_, i) => {
      let col = Math.round(inL + (span * (i + 0.5)) / offers.length);
      for (let k = 0; k < 6; k++) {
        if (!this.world.isSolid(col, row)) break;
        col += (i === 0 ? 1 : -1);
        col = clamp(col, inL, inR);
      }
      return col * TILE + TILE / 2;
    });

    /* clear the badges' row so an offer is never buried in a ledge */
    this.world.ensureTo(row + 2);
    for (const bx of xs) {
      const c = Math.floor(bx / TILE);
      for (let r = row - 1; r <= row + 1; r++) {
        for (let d = -1; d <= 1; d++) {
          if (this.world.tile(c + d, r) !== EMPTY) this.world.setTile(c + d, r, EMPTY);
        }
      }
    }

    this.perkGroup = (this.perkGroup || 0) + 1;
    this.actors.perkOffer(offers, xs, y, this.perkGroup);

    this.audio.zone();
    this.fx.addFlash(0.28, this.palette.accent);
    this.transmit(`ZONE ${this.zoneNo} — ${this.zone.name}`, 'Shaft gets meaner. Grab one on the way down.');
  }

  collectPerk(pickup) {
    const perk = pickup.perk;
    this.perks.take(perk, this.player);
    this.audio.perk();
    this.fx.addFlash(0.26, this.palette.vis);
    this.fx.burst(pickup.x, pickup.y, this.palette.vis, 18, 200);
    this.fx.ring(pickup.x, pickup.y, this.palette.vis, 0.45, 8);
    this.fx.addShake(2.5);
    this.fx.popup(pickup.x, pickup.y - 14, perk.name.toUpperCase(), this.palette.vis, 1.4);
  }

  /* A line from the surveyor, slid in at the edge of the screen.
     Purely presentational — it never touches game state and takes
     no input, so it cannot interrupt a run. */
  transmit(who, line) {
    const el = document.getElementById('tx');
    if (!el) return;
    el.querySelector('#txWho').textContent = who;
    el.querySelector('#txLine').textContent = line;

    /* the small re-dithered pass, not a scaled-down big one */
    const host = el.querySelector('#txPort');
    if (host && !host.childElementCount) {
      SURVEYOR_SMALL.load().then(() => {
        if (SURVEYOR_SMALL.loaded && !host.childElementCount) {
          host.appendChild(SURVEYOR_SMALL.toCanvas(1, this.palette.vis, 'transparent'));
        }
      });
    }

    el.classList.remove('is-on');
    void el.offsetWidth;            /* restart the slide */
    el.classList.add('is-on');
    clearTimeout(this._txT);
    this._txT = setTimeout(() => el.classList.remove('is-on'), 4200);
  }

  /* ---------- game events ---------- */
  spawnBullet(x, y, angleOff, pierce) {
    this.actors.bullet(x, y, angleOff, pierce, this.palette);
  }

  shockwave(x, y, r) {
    this.actors.shockwave(x, y, r, this);
    this.fx.ring(x, y, this.palette.vis, 0.34, r * 0.4);
    this.fx.addShake(3);
  }

  onKill(e) {
    const p = this.player;
    p.combo++;
    if (p.combo > p.bestCombo) p.bestCombo = p.combo;
    this.kills++;

    const mult = 1 + (p.combo - 1) * 0.35;
    const gained = Math.round(e.score * mult);
    this.score += gained;

    this.audio.kill(p.combo);
    this.fx.burst(e.x, e.y + e.h / 2, this.palette.signal, 14 + Math.min(p.combo, 10), 190 + p.combo * 8);
    this.fx.addShake(2.4);
    this.fx.hitStop(0.045 + Math.min(p.combo, 8) * 0.004);
    this.fx.addFlash(0.10, this.palette.paper);
    this.fx.popup(
      e.x, e.y - 4,
      p.combo > 1 ? `${gained}  x${p.combo}` : String(gained),
      p.combo > 1 ? this.palette.vis : this.palette.paper,
      1 + Math.min(p.combo, 12) * 0.12,
    );
  }

  bankCombo() {
    const c = this.player.combo;
    if (c <= 0) return;
    if (c >= 2) {
      const bonus = c * c * 18;
      this.score += bonus;
      this.audio.bank(c);
      this.fx.popup(this.player.cx, this.player.cy - 22, `BANKED +${bonus}`, this.palette.accent, 1.3);
      this.fx.addFlash(0.16, this.palette.accent);
      this.fx.ring(this.player.cx, this.player.feet, this.palette.accent, 0.4, 6);
    }
    this.player.combo = 0;
  }

  breakCombo() {
    this.player.combo = 0;
  }

  collectGem(p) {
    const v = Math.round(25 * this.player.stats.gemBonus);
    this.gems++;
    this.score += v;
    this.audio.gem(this.gemStreak++);
    this.fx.burst(p.x, p.y, this.palette.accent, 7, 110);
    this.fx.ring(p.x, p.y, this.palette.accent, 0.22, 3);
  }

  collectHeart(p) {
    this.player.heal(1);
    this.audio.perk();
    this.fx.burst(p.x, p.y, this.palette.signal, 10, 130);
    this.fx.popup(p.x, p.y - 8, '+1', this.palette.signal, 1.2);
  }

  killPlayer() {
    if (this.state === 'dying' || this.state === 'dead') return;
    this.state = 'dying';
    this.deathT = 0;
    this.player.dead = true;
    this.audio.death();
    this.audio.setIntensity(0);
    this.fx.addShake(12);
    this.fx.addFlash(0.85, this.palette.signal);
    this.fx.addSplit(1);
    this.fx.hitStop(0.16);
    this.fx.burst(this.player.cx, this.player.cy, this.palette.vis, 34, 320);
    this.fx.burst(this.player.cx, this.player.cy, this.palette.signal, 22, 240);
  }

  finishDeath() {
    this.state = 'dead';
    this.audio.stopMusic();
    const rec = {
      depth: store.best('bestDepth', Math.floor(this.maxDepth)),
      score: store.best('bestScore', Math.floor(this.score)),
    };
    store.bump('kills', this.kills);
    store.bump('gems', this.gems);
    this.overlay.show(deathScreen(this, rec), 'ov--dead');

    const host = document.getElementById('ovPortrait');
    if (host) {
      SURVEYOR.load().then(() => {
        if (!SURVEYOR.loaded) { host.classList.add('is-missing'); return; }
        host.innerHTML = '';
        host.appendChild(SURVEYOR.toCanvas(1, this.palette.vis, 'transparent'));
      });
    }
  }

  /* ---------- update ---------- */
  update(dt) {
    /* hit-stop runs on real time, above everything else */
    if (this.fx.tickFreeze(dt)) {
      this.fx.update(dt);
      return;
    }

    if (this.input.pressed.pause) {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }

    if (this.state === 'title') this._idle(dt);
    else if (this.state === 'playing') this._play(dt);
    else if (this.state === 'dying') this._dying(dt);
    else this.fx.update(dt);

    this.input.flush();
  }

  /* slow drift behind the title */
  _idle(dt) {
    this.camY += 26 * dt;
    this.world.ensureTo(Math.floor((this.camY + this.screen.h) / TILE) + 8);
    this.world.prune(Math.floor(this.camY / TILE) - 6);
    this._palette(dt, Math.floor(this.camY / TILE));
    this.fx.update(dt);
  }

  _play(dt) {
    const p = this.player;
    const H = this.screen.h;

    p.update(dt, this.input, this.world, this);

    /* the view is a ceiling — rising out of it is not a way out */
    const ceil = this.camY + 4;
    if (p.y < ceil) { p.y = ceil; if (p.vy < 0) p.vy = 0; }

    /* camera: lead the fall, and never travel back up */
    const lead = clamp(p.vy / 430, 0, 1) * H * 0.14;
    const target = p.cy - H * 0.40 + lead;
    this.camY = Math.max(this.camY, damp(this.camY, target, 7, dt));

    /* depth and passive score */
    this.depth = Math.max(0, p.feet / TILE);
    if (this.depth > this.maxDepth) {
      this.score += (this.depth - this.maxDepth) * 10;
      this.maxDepth = this.depth;
    }

    /* stream the shaft */
    const bottomRow = Math.floor((this.camY + H) / TILE) + 10;
    this.world.ensureTo(bottomRow);
    this.world.prune(Math.floor(this.camY / TILE) - 8);

    const spawns = this.world.takeSpawns();
    if (spawns) for (const s of spawns) this.actors.spawn(s);

    this.actors.update(dt, this.world, p, this, this.camY, this.camY + H);
    this.actors.cull(this.camY - 80);
    this.fx.update(dt);

    /* zone crossing — drops a perk offer into the shaft ahead and
       lets the run carry straight on */
    const zi = zoneIndex(Math.floor(p.feet / TILE));
    if (zi + 1 > this.zoneNo && zi < ZONES.length) {
      this.zoneNo = zi + 1;
      this.zone = ZONES[zi];
      this.zoneStartRow = zi * ZONE_ROWS;
      this.offerPerks();
    }
    this.zone = zoneAt(Math.floor(p.feet / TILE));
    this._palette(dt, Math.floor(p.feet / TILE));

    /* music follows how hard the player is pushing */
    const speed = clamp(p.vy / 430, 0, 1);
    const combo = clamp(p.combo / 9, 0, 1);
    const deep = clamp(this.depth / 620, 0, 1);
    const risk = p.hp <= 1 ? 0.18 : 0;
    this.audio.setIntensity(0.18 + speed * 0.28 + combo * 0.34 + deep * 0.22 + risk);

    this.hud.sync(this);
  }

  _dying(dt) {
    this.deathT += dt;
    /* ramp into slow motion, then hand over to the summary */
    this.timeScale = Math.max(0.12, 1 - this.deathT * 2.4);
    this.camY += 40 * dt * this.timeScale;
    this.fx.update(dt);
    if (this.deathT > 1.15) this.finishDeath();
  }

  /* crossfade the accent between zones so the shift is felt, not seen */
  _palette(dt, row) {
    const z = zoneAt(row);
    const want = z.accent;
    if (this._accentTo !== want) {
      this._accentFrom = this.palette.accent;
      this._accentTo = want;
      this._accentT = 0;
    }
    if (this._accentT < 1) {
      this._accentT = Math.min(1, this._accentT + dt * 0.9);
      this.palette.accent = mixHex(this._accentFrom, this._accentTo, this._accentT);
    }
  }

  /* ---------- render ---------- */
  render() {
    if (this.screen.fit()) this.grad = null;
    this.screen.begin(this.fx.shakeX, this.fx.shakeY);
    draw(this.screen.ctx, this);
  }
}

/* small helper — only used by the accent crossfade */
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
}

/* boot */
window.addEventListener('DOMContentLoaded', () => {
  window.DESCENT = new Game();
});
