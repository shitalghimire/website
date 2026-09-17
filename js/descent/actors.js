/* ═══════════════════════════════════════════════════════════════
   ACTORS — enemies, bullets, pickups.

   The enemy roster is built around one question the player must
   ask every time they fall: can I land on that? Crawlers say yes.
   Hardhats say no, shoot it. Divers say not any more. Getting that
   read wrong is the main way a run ends, which is why every enemy
   has a silhouette that answers the question from a distance —
   spikes on top means do not touch.
   ═══════════════════════════════════════════════════════════════ */

import { TILE, clamp, sign, dist2 } from './core.js';
import { P_W, P_H } from './player.js';

/* ---------- enemy definitions ---------- */
export const ENEMY_DEF = {
  crawler: { w: 11, h: 9, hp: 1, stompable: true, speed: 42, score: 100 },
  hardhat: { w: 12, h: 11, hp: 2, stompable: false, speed: 30, score: 180 },
  floater: { w: 11, h: 11, hp: 2, stompable: true, speed: 34, score: 150 },
  turret:  { w: 10, h: 12, hp: 2, stompable: true, speed: 0, score: 200 },
  diver:   { w: 10, h: 12, hp: 1, stompable: true, speed: 0, score: 160 },
};

export function makeEnemy(spec) {
  const d = ENEMY_DEF[spec.type];
  const e = {
    type: spec.type,
    x: spec.x,
    y: spec.y - d.h / 2,
    w: d.w,
    h: d.h,
    vx: d.speed ? (Math.random() < 0.5 ? -d.speed : d.speed) : 0,
    vy: 0,
    hp: d.hp,
    stompable: d.stompable,
    score: d.score,
    dead: false,
    hitFlash: 0,
    t: Math.random() * 6.28,
    /* patrol bounds, in tile columns */
    minCol: spec.minCol,
    maxCol: spec.maxCol,
    row: spec.row,
    facing: spec.facing || 1,
    cd: 1.2 + Math.random(),
    state: 'idle',
    anchorY: spec.y - d.h / 2,
  };
  return e;
}

export class Actors {
  constructor(fx, audio) {
    this.fx = fx;
    this.audio = audio;
    this.enemies = [];
    this.bullets = [];
    this.hostiles = [];      /* enemy projectiles */
    this.pickups = [];
  }

  reset() {
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.hostiles.length = 0;
    this.pickups.length = 0;
  }

  spawn(spec) {
    if (spec.type === 'gem') {
      this.pickups.push({ kind: 'gem', x: spec.x, y: spec.y, w: 7, h: 7, t: Math.random() * 6.28, vx: 0, vy: 0, dead: false });
    } else if (spec.type === 'heart') {
      this.pickups.push({ kind: 'heart', x: spec.x, y: spec.y, w: 9, h: 9, t: 0, vx: 0, vy: 0, dead: false });
    } else {
      this.enemies.push(makeEnemy(spec));
    }
  }

  /* A zone's perk offer, as three things in the shaft rather than a
     menu. They share a `group` so taking one clears the rest. The
     box is generous because this is a choice, not a test of
     pixel-accurate steering at terminal velocity. */
  perkOffer(perks, xs, y, group) {
    perks.forEach((perk, i) => {
      this.pickups.push({
        kind: 'perk', perk, group,
        x: xs[i], y,
        w: 22, h: 22,
        t: i * 0.7, vx: 0, vy: 0, dead: false,
      });
    });
  }

  clearPerkGroup(group, exceptOne) {
    for (const p of this.pickups) {
      if (p.kind === 'perk' && p.group === group && p !== exceptOne) p.dead = true;
    }
  }

  bullet(x, y, angleOff, pierce, palette) {
    const speed = 520;
    this.bullets.push({
      x, y,
      vx: Math.sin(angleOff) * speed,
      vy: Math.cos(angleOff) * speed,
      r: 2.2,
      pierce,
      hits: 0,
      dead: false,
      trail: 0,
    });
  }

  hostile(x, y, vx, vy) {
    this.hostiles.push({ x, y, vx, vy, r: 2.6, dead: false, t: 0 });
  }

  /* drop everything that has scrolled well above the view */
  cull(topY) {
    const keep = (a) => !a.dead && a.y > topY;
    this.enemies = this.enemies.filter(keep);
    this.pickups = this.pickups.filter(keep);
    this.bullets = this.bullets.filter((b) => !b.dead && b.y > topY);
    this.hostiles = this.hostiles.filter((h) => !h.dead && h.y > topY);
  }

  /* ---------- update ---------- */
  update(dt, world, player, game, viewTop, viewBottom) {
    this._enemies(dt, world, player, game, viewTop, viewBottom);
    this._bullets(dt, world, game);
    this._hostiles(dt, world, player, game);
    this._pickups(dt, world, player, game);
  }

  _enemies(dt, world, player, game, viewTop, viewBottom) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      /* asleep until roughly on screen — keeps far-below enemies
         from patrolling off their ledges before you arrive */
      const awake = e.y > viewTop - 40 && e.y < viewBottom + 120;

      if (awake) {
        switch (e.type) {
          case 'crawler':
          case 'hardhat': this._walker(dt, e, world); break;
          case 'floater': this._floater(dt, e, world, player); break;
          case 'turret': this._turret(dt, e, player, game); break;
          case 'diver': this._diver(dt, e, world, player); break;
        }
      }

      this._touch(e, player, game);
    }
  }

  _walker(dt, e, world) {
    e.x += e.vx * dt;
    /* turn round at the ends of the ledge, or at a drop */
    const half = e.w / 2;
    const aheadCol = Math.floor((e.x + sign(e.vx) * half) / TILE);
    const footRow = Math.floor((e.y + e.h + 2) / TILE);
    const wallAhead = world.isSolid(aheadCol, Math.floor(e.y + e.h / 2) / TILE | 0);
    const floorAhead = world.isSolid(aheadCol, footRow);
    const pastBound = e.minCol != null &&
      (aheadCol < e.minCol || aheadCol > e.maxCol);

    if (wallAhead || !floorAhead || pastBound) {
      e.vx = -e.vx;
      e.x += e.vx * dt * 2;
    }
    /* keep it sitting on its row even if the ledge crumbled */
    e.y += clamp(((e.row * TILE + TILE) - e.h - e.y), -60 * dt, 60 * dt);
  }

  _floater(dt, e, world, player) {
    /* drifts sideways, bobs, and leans toward the player's column */
    const pull = sign(player.cx - e.x) * 14;
    e.vx = clamp(e.vx + pull * dt, -46, 46);
    e.x += e.vx * dt;
    if (world.rectSolid(e.x - e.w / 2, e.y, e.w, e.h)) {
      e.x -= e.vx * dt;
      e.vx = -e.vx;
    }
    e.y = e.anchorY + Math.sin(e.t * 2.1) * 7;
  }

  _turret(dt, e, player, game) {
    e.cd -= dt;
    /* only fire when the player is roughly level and in front */
    const dy = Math.abs(player.cy - e.y);
    if (e.cd <= 0 && dy < 70) {
      e.cd = 1.5;
      this.hostile(e.x + e.facing * 7, e.y, e.facing * 150, 0);
      this.fx.muzzle(e.x + e.facing * 7, e.y, game.palette.signal);
      this.audio.dryFire();
    }
  }

  _diver(dt, e, world, player) {
    if (e.state === 'idle') {
      /* trigger once the player is above and roughly in column */
      if (player.cy < e.y - 8 && Math.abs(player.cx - e.x) < 26) {
        e.state = 'wind';
        e.cd = 0.22;
      }
      e.y = e.anchorY + Math.sin(e.t * 3) * 1.5;
    } else if (e.state === 'wind') {
      e.cd -= dt;
      e.x += (Math.random() - 0.5) * 1.6;      /* shudder before the drop */
      if (e.cd <= 0) e.state = 'drop';
    } else {
      e.vy = Math.min(e.vy + 1100 * dt, 400);
      e.y += e.vy * dt;
      if (world.rectSolid(e.x - e.w / 2, e.y, e.w, e.h)) {
        e.dead = true;
        this.fx.burst(e.x, e.y, '#9B9C92', 10, 150);
        this.fx.addShake(2.5);
      }
    }
  }

  /* player <-> enemy contact: stomp, or take the hit */
  _touch(e, player, game) {
    if (e.dead || player.dead) return;
    if (player.x + P_W < e.x - e.w / 2 || player.x > e.x + e.w / 2) return;
    if (player.y + P_H < e.y || player.y > e.y + e.h) return;

    /* a stomp needs downward speed and the feet in the enemy's top third */
    const falling = player.vy > 30;
    const onTop = player.feet <= e.y + e.h * 0.55;

    if (falling && onTop && e.stompable) {
      player.stomp(game, e);
      this.damage(e, 99, game);
      return;
    }
    /* landing on a hardhat's spikes is the punishment for not looking */
    player.hurt(game, e.type);
  }

  _bullets(dt, world, game) {
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      /* Enemies are tested BEFORE terrain: an enemy standing flush
         on a ledge overlaps both in the same step, and swallowing
         the round into the ledge instead of the target is not what
         the player saw themselves aim at.
         One bullet can hit several enemies if it pierces. */
      let hit = false;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (b.x < e.x - e.w / 2 || b.x > e.x + e.w / 2) continue;
        if (b.y < e.y || b.y > e.y + e.h) continue;
        this.damage(e, 1, game);
        b.hits++;
        hit = true;
        if (b.hits > b.pierce) b.dead = true;
        break;
      }
      if (hit) continue;

      if (world.rectSolid(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2)) {
        b.dead = true;
        this.fx.burst(b.x, b.y, game.palette.paper, 5, 90);
        continue;
      }
    }
  }

  _hostiles(dt, world, player, game) {
    for (const h of this.hostiles) {
      if (h.dead) continue;
      h.t += dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (world.rectSolid(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2)) {
        h.dead = true;
        this.fx.burst(h.x, h.y, game.palette.signal, 4, 70);
        continue;
      }
      if (!player.dead &&
          h.x > player.x && h.x < player.x + P_W &&
          h.y > player.y && h.y < player.y + P_H) {
        h.dead = true;
        player.hurt(game, 'shot');
      }
    }
  }

  _pickups(dt, world, player, game) {
    const mag = player.stats.magnet;
    for (const p of this.pickups) {
      if (p.dead) continue;
      p.t += dt;

      /* perk badges hold station and are never dragged by the
         magnet — their position is the choice being offered */
      if (p.kind === 'perk') {
        if (player.dead) continue;
        if (p.x + p.w / 2 < player.x || p.x - p.w / 2 > player.x + P_W) continue;
        if (p.y + p.h / 2 < player.y || p.y - p.h / 2 > player.y + P_H) continue;
        p.dead = true;
        this.clearPerkGroup(p.group, p);
        game.collectPerk(p);
        continue;
      }

      if (mag > 0 && !player.dead) {
        const d2 = dist2(p.x, p.y, player.cx, player.cy);
        if (d2 < mag * mag) {
          const d = Math.sqrt(d2) || 1;
          const pull = 260 * (1 - d / mag);
          p.vx += ((player.cx - p.x) / d) * pull * dt;
          p.vy += ((player.cy - p.y) / d) * pull * dt;
        }
      }
      p.vx *= 1 - 1.6 * dt;
      p.vy *= 1 - 1.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (player.dead) continue;
      if (p.x + p.w / 2 < player.x || p.x - p.w / 2 > player.x + P_W) continue;
      if (p.y + p.h / 2 < player.y || p.y - p.h / 2 > player.y + P_H) continue;

      p.dead = true;
      if (p.kind === 'gem') game.collectGem(p);
      else game.collectHeart(p);
    }
  }

  /* ---------- damage ---------- */
  damage(e, amount, game) {
    if (e.dead) return;
    e.hp -= amount;
    e.hitFlash = 0.09;
    if (e.hp > 0) {
      this.fx.burst(e.x, e.y + e.h / 2, game.palette.paper, 4, 70);
      this.fx.addShake(0.8);
      this.fx.hitStop(0.02);
      return;
    }
    e.dead = true;
    game.onKill(e);
  }

  /* everything within r of (x,y) takes a hit — stomp shockwave */
  shockwave(x, y, r, game) {
    const r2 = r * r;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2(x, y, e.x, e.y + e.h / 2) < r2) this.damage(e, 1, game);
    }
  }
}
