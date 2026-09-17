/* ═══════════════════════════════════════════════════════════════
   PLAYER — gunboots.

   The whole game hangs off one idea: firing downward both kills
   what is below you and arrests your fall. So ammo is really
   airtime, and airtime is really score, because the combo only
   banks while your feet are off the ground. Ammo refills when you
   land or when you stomp something — which means the safe move
   (land) and the greedy move (stomp) refill the same resource, and
   the player chooses which risk to take. Everything else is trim.
   ═══════════════════════════════════════════════════════════════ */

import { TILE, clamp, sign } from './core.js';
import { SPIKE, CRUMBLE, EMPTY } from './world.js';

export const P_W = 8;
export const P_H = 10;

/* Tuning lives in one block so feel can be dialled without hunting
   through the physics. These numbers are in logical px/second. */
const GRAV = 900;
const TERMINAL = 430;
const RUN_MAX = 132;
const RUN_ACCEL = 980;
const FRICTION_GROUND = 1250;
const FRICTION_AIR = 420;
/* Recoil has to beat what gravity adds between shots or firing
   does nothing: at FIRE_GAP the fall gains GRAV * 0.1 ~= 90, so
   92 per shot merely cancelled out and the hover felt dead. 124
   leaves a clear net lift while the cap still stops you climbing
   the shaft for free. */
const RECOIL = 124;           /* per shot */
const RECOIL_CAP = -165;      /* fastest you can rise by shooting */
const FIRE_GAP = 0.10;        /* seconds between shots */
const STOMP_BOUNCE = -244;
const HURT_BOUNCE = -180;
const INVULN = 1.15;

export class Player {
  constructor(fx, audio) {
    this.fx = fx;
    this.audio = audio;
    this.trail = [];
    this.reset(0);
  }

  reset(startY) {
    this.x = (TILE * 10) - P_W / 2;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.face = 1;
    this.onGround = false;
    this.wasGround = false;

    /* upgradable stats — perks mutate these */
    this.stats = {
      maxAmmo: 8,
      maxHp: 4,
      fireGap: FIRE_GAP,
      recoil: RECOIL,
      pierce: 0,          /* extra enemies a bullet passes through */
      spread: 1,          /* bullets per shot */
      bounceWalls: false,
      magnet: 0,          /* gem attraction radius */
      shield: 0,          /* free hits absorbed */
      stompRadius: 0,     /* shockwave on landing a stomp */
      gemBonus: 1,
    };

    this.ammo = this.stats.maxAmmo;
    this.hp = this.stats.maxHp;
    this.fireCd = 0;
    this.invuln = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.dead = false;

    /* presentation */
    this.squash = 1;
    this.flashT = 0;
    this.trail.length = 0;
  }

  get cx() { return this.x + P_W / 2; }
  get cy() { return this.y + P_H / 2; }
  get feet() { return this.y + P_H; }

  /* ---------- movement ---------- */
  update(dt, input, world, game) {
    if (this.dead) return;

    if (this.invuln > 0) this.invuln -= dt;
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.flashT > 0) this.flashT -= dt;

    /* --- horizontal --- */
    const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
    if (dir !== 0) {
      this.vx += dir * RUN_ACCEL * dt;
      this.vx = clamp(this.vx, -RUN_MAX, RUN_MAX);
      this.face = dir;
    } else {
      const f = (this.onGround ? FRICTION_GROUND : FRICTION_AIR) * dt;
      if (Math.abs(this.vx) <= f) this.vx = 0;
      else this.vx -= sign(this.vx) * f;
    }

    /* --- gravity --- */
    this.vy += GRAV * dt;
    if (this.vy > TERMINAL) this.vy = TERMINAL;

    /* --- shooting --- */
    if (input.held.shoot && this.fireCd <= 0) {
      if (this.ammo > 0) this.fire(game);
      else if (input.pressed.shoot) this.audio.dryFire();
    }

    this.wasGround = this.onGround;
    this._move(dt, world, game);

    /* landing: refill, bank the combo, kick up dust */
    if (this.onGround && !this.wasGround) this._land(game);

    /* trail — only while moving fast enough to be worth drawing */
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 150) {
      this.trail.push({ x: this.cx, y: this.cy, t: 0.22 });
      if (this.trail.length > 14) this.trail.shift();
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].t -= dt;
      if (this.trail[i].t <= 0) this.trail.splice(i, 1);
    }

    /* squash and stretch from vertical speed — stretches falling,
       squashes on impact (set in _land) */
    const target = 1 + clamp(this.vy / TERMINAL, -0.35, 0.42) * 0.22;
    this.squash += (target - this.squash) * Math.min(1, dt * 9);
  }

  /* Push an embedded box back out along one axis.
     `prefer` is the direction to try first; if the box is wedged it
     falls back to the opposite direction, and gives up after a
     bounded number of steps rather than spinning. A zero velocity
     used to make this loop forever and freeze the tab — never
     derive the push direction from sign(v) alone. */
  _depenetrate(world, axis, prefer) {
    const test = () => world.rectSolid(this.x, this.y, P_W, P_H);
    if (!test()) return true;
    const dir = prefer || 1;
    const LIMIT = 80;                 /* 40px — wider than any tile */
    const x0 = this.x, y0 = this.y;

    for (let i = 0; i < LIMIT; i++) {
      if (axis === 'x') this.x += dir * 0.5; else this.y += dir * 0.5;
      if (!test()) return true;
    }
    /* wedged that way — put it back and try the other */
    this.x = x0; this.y = y0;
    for (let i = 0; i < LIMIT; i++) {
      if (axis === 'x') this.x -= dir * 0.5; else this.y -= dir * 0.5;
      if (!test()) return true;
    }
    /* fully buried (shouldn't happen): restore and let the next
       frame try again rather than leaving the box somewhere odd */
    this.x = x0; this.y = y0;
    return false;
  }

  /* axis-separated so a corner never wedges the player */
  _move(dt, world, game) {
    /* X */
    this.x += this.vx * dt;
    if (world.rectSolid(this.x, this.y, P_W, P_H)) {
      this._depenetrate(world, 'x', this.vx !== 0 ? -sign(this.vx) : 1);
      if (this.stats.bounceWalls && Math.abs(this.vx) > 40) {
        this.vx = -this.vx * 0.72;
        this.face = sign(this.vx) || this.face;
        this.fx.addShake(1.2);
        this.fx.dust(this.cx, this.cy, game.palette.paper, 0.5);
      } else {
        this.vx = 0;
      }
    }

    /* Y */
    this.onGround = false;
    const fell = this.vy;
    this.y += this.vy * dt;
    if (world.rectSolid(this.x, this.y, P_W, P_H)) {
      /* prefer pushing back the way we came; a stationary box
         embedded by a clamp or a spike shove gets pushed up */
      this._depenetrate(world, 'y', fell !== 0 ? -sign(fell) : -1);
      if (this.vy > 0) {
        this.onGround = true;
        this.impact = Math.min(this.vy / TERMINAL, 1);
        /* a crumbling ledge gives way under the landing */
        const r = Math.floor((this.feet + 1) / TILE);
        for (let c = Math.floor(this.x / TILE); c <= Math.floor((this.x + P_W - 0.01) / TILE); c++) {
          if (world.tile(c, r) === CRUMBLE) {
            world.setTile(c, r, EMPTY);
            this.fx.burst(c * TILE + TILE / 2, r * TILE + TILE / 2, game.palette.paper, 8, 120);
            this.fx.addShake(2);
          }
        }
      }
      this.vy = 0;
    }

    /* spikes */
    const sp = world.rectSpike(this.x, this.y, P_W, P_H);
    if (sp) this.hurt(game, 'spike');
  }

  _land(game) {
    const force = this.impact || 0.4;
    this.ammo = this.stats.maxAmmo;
    this.squash = 0.72;
    this.audio.land(force);
    this.fx.dust(this.cx, this.feet, game.palette.paper, 0.5 + force);
    this.fx.addShake(1.2 + force * 2.6);
    if (this.combo > 0) game.bankCombo();
  }

  /* ---------- gunboots ---------- */
  fire(game) {
    this.ammo--;
    this.fireCd = this.stats.fireGap;
    this.vy = Math.max(this.vy - this.stats.recoil, RECOIL_CAP);
    this.onGround = false;

    const n = this.stats.spread;
    for (let i = 0; i < n; i++) {
      /* spread fans outward, centred straight down */
      const off = n === 1 ? 0 : (i - (n - 1) / 2) * 0.30;
      game.spawnBullet(this.cx, this.feet - 1, off, this.stats.pierce);
    }

    this.audio.shot();
    this.fx.muzzle(this.cx, this.feet, game.palette.vis);
    this.fx.addShake(0.9);
    this.squash = 1.20;
  }

  /* ---------- damage ---------- */
  hurt(game, cause) {
    if (this.invuln > 0 || this.dead) return false;

    if (this.stats.shield > 0) {
      this.stats.shield--;
      this.invuln = INVULN * 0.8;
      this.audio.shield();
      this.fx.ring(this.cx, this.cy, game.palette.accent, 0.35, 8);
      this.fx.addFlash(0.28, game.palette.accent);
      this.fx.addShake(3);
      this.fx.hitStop(0.05);
      this.fx.popup(this.cx, this.cy - 14, 'BLOCKED', game.palette.accent, 1);
      return false;
    }

    this.hp--;
    this.invuln = INVULN;
    this.flashT = 0.4;
    this.vy = Math.min(this.vy, HURT_BOUNCE);
    this.audio.hurt();
    this.fx.addShake(7);
    this.fx.addFlash(0.55, game.palette.signal);
    this.fx.addSplit(0.8);
    this.fx.hitStop(0.085);
    this.fx.burst(this.cx, this.cy, game.palette.signal, 16, 220);
    game.breakCombo();

    if (cause === 'spike') {
      /* shove clear of the spike so it cannot tick twice */
      this.y -= 6;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      game.killPlayer();
    }
    return true;
  }

  stomp(game, enemy) {
    this.vy = STOMP_BOUNCE;
    this.ammo = this.stats.maxAmmo;
    this.squash = 1.28;
    this.audio.stomp();
    this.fx.addShake(4.5);
    this.fx.hitStop(0.07);
    this.fx.ring(enemy.x, enemy.y, game.palette.vis, 0.26, 5);
    if (this.stats.stompRadius > 0) {
      game.shockwave(enemy.x, enemy.y, this.stats.stompRadius);
    }
  }

  heal(n) {
    this.hp = Math.min(this.hp + n, this.stats.maxHp);
  }
}
