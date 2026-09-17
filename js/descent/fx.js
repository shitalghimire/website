/* ═══════════════════════════════════════════════════════════════
   FX — the difference between "it works" and "it feels good".

   Everything here is pooled. A big combo can spawn a few hundred
   particles in two frames and the allocator must not be the thing
   that drops the framerate.

   Hit-stop deserves a note: on every kill the whole simulation
   freezes for 50-90ms while rendering continues. It reads as
   impact. The game loop asks `fx.frozen` before stepping the sim,
   so freezing costs nothing anywhere else.
   ═══════════════════════════════════════════════════════════════ */

import { clamp, lerp } from './core.js';

const MAX_PARTS = 900;
const MAX_POPS = 40;

export class Fx {
  constructor() {
    /* --- particle pool: struct-of-arrays, no per-particle objects --- */
    this.n = 0;
    this.px = new Float32Array(MAX_PARTS);
    this.py = new Float32Array(MAX_PARTS);
    this.vx = new Float32Array(MAX_PARTS);
    this.vy = new Float32Array(MAX_PARTS);
    this.life = new Float32Array(MAX_PARTS);
    this.max = new Float32Array(MAX_PARTS);
    this.size = new Float32Array(MAX_PARTS);
    this.drag = new Float32Array(MAX_PARTS);
    this.grav = new Float32Array(MAX_PARTS);
    this.col = new Array(MAX_PARTS);
    this.kind = new Uint8Array(MAX_PARTS);   /* 0 rect, 1 spark, 2 ring */

    /* --- screen shake --- */
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeSeed = Math.random() * 1000;

    /* --- hit-stop --- */
    this.freeze = 0;

    /* --- full-screen flash --- */
    this.flash = 0;
    this.flashCol = '#F2F0EA';

    /* --- chromatic split, used on damage --- */
    this.split = 0;

    /* --- floating score popups --- */
    this.pops = [];
    for (let i = 0; i < MAX_POPS; i++) {
      this.pops.push({ live: false, x: 0, y: 0, vy: 0, t: 0, max: 1, text: '', col: '', scale: 1 });
    }
  }

  get frozen() { return this.freeze > 0; }

  reset() {
    this.n = 0;
    this.shake = this.shakeX = this.shakeY = 0;
    this.freeze = this.flash = this.split = 0;
    for (const p of this.pops) p.live = false;
  }

  /* ---------- emitters ---------- */
  particle(x, y, vx, vy, life, size, col, opts = {}) {
    let i;
    if (this.n < MAX_PARTS) {
      i = this.n++;
    } else {
      /* pool is full — overwrite whichever has least life left */
      i = 0;
      let worst = Infinity;
      for (let k = 0; k < MAX_PARTS; k += 7) {   /* sampled, not exhaustive */
        if (this.life[k] < worst) { worst = this.life[k]; i = k; }
      }
    }
    this.px[i] = x; this.py[i] = y;
    this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = life; this.max[i] = life;
    this.size[i] = size;
    this.col[i] = col;
    this.drag[i] = opts.drag == null ? 2.2 : opts.drag;
    this.grav[i] = opts.grav == null ? 260 : opts.grav;
    this.kind[i] = opts.kind || 0;
  }

  /* an enemy dying: a hard radial burst plus a few slow embers */
  burst(x, y, col, count = 14, power = 200) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const s = power * (0.45 + Math.random() * 0.75);
      this.particle(
        x, y, Math.cos(a) * s, Math.sin(a) * s,
        0.22 + Math.random() * 0.30,
        1.6 + Math.random() * 2.4, col,
        { drag: 3.0, grav: 180, kind: 1 },
      );
    }
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particle(
        x, y, Math.cos(a) * 40, Math.sin(a) * 40 - 30,
        0.5 + Math.random() * 0.5, 1.2, col,
        { drag: 1.0, grav: 60 },
      );
    }
  }

  /* muzzle flash under the player's boots */
  muzzle(x, y, col) {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const s = 110 + Math.random() * 130;
      this.particle(
        x, y, Math.cos(a) * s, Math.sin(a) * s,
        0.10 + Math.random() * 0.10, 1.4, col,
        { drag: 5, grav: 40, kind: 1 },
      );
    }
  }

  /* dust when landing — spreads sideways along the ground */
  dust(x, y, col, force = 1) {
    const n = 4 + Math.round(force * 6);
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const s = (40 + Math.random() * 110) * force;
      this.particle(
        x + dir * Math.random() * 5, y,
        dir * s, -Math.random() * 45 * force,
        0.20 + Math.random() * 0.30,
        1.3 + Math.random() * 1.8, col,
        { drag: 4.5, grav: 150 },
      );
    }
  }

  /* an expanding ring — used for shockwaves and pickups */
  ring(x, y, col, life = 0.30, size = 4) {
    this.particle(x, y, 0, 0, life, size, col, { drag: 0, grav: 0, kind: 2 });
  }

  trail(x, y, col) {
    this.particle(x, y, (Math.random() - 0.5) * 12, -8, 0.22, 1.5, col, { drag: 3, grav: -30 });
  }

  /* ---------- camera / screen ---------- */
  addShake(mag) {
    this.shake = Math.min(this.shake + mag, 16);
  }

  hitStop(sec) {
    this.freeze = Math.max(this.freeze, sec);
  }

  addFlash(amount, col) {
    this.flash = Math.min(Math.max(this.flash, amount), 1);
    if (col) this.flashCol = col;
  }

  addSplit(amount) {
    this.split = Math.min(this.split + amount, 1);
  }

  popup(x, y, text, col, scale = 1) {
    const p = this.pops.find((q) => !q.live);
    if (!p) return;
    p.live = true;
    p.x = x; p.y = y;
    p.vy = -46;
    p.t = 0;
    p.max = 0.75 + scale * 0.16;
    p.text = text;
    p.col = col;
    p.scale = scale;
  }

  /* ---------- per-frame ---------- */

  /* hit-stop is burned down in real time, never by the frozen sim */
  tickFreeze(dt) {
    if (this.freeze > 0) {
      this.freeze -= dt;
      if (this.freeze < 0) this.freeze = 0;
      return true;
    }
    return false;
  }

  update(dt) {
    /* particles */
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        /* swap-remove keeps the live set dense */
        const last = --this.n;
        if (i !== last) {
          this.px[i] = this.px[last]; this.py[i] = this.py[last];
          this.vx[i] = this.vx[last]; this.vy[i] = this.vy[last];
          this.life[i] = this.life[last]; this.max[i] = this.max[last];
          this.size[i] = this.size[last]; this.drag[i] = this.drag[last];
          this.grav[i] = this.grav[last]; this.col[i] = this.col[last];
          this.kind[i] = this.kind[last];
        }
        continue;
      }
      const d = 1 - this.drag[i] * dt;
      this.vx[i] *= d > 0 ? d : 0;
      this.vy[i] *= d > 0 ? d : 0;
      this.vy[i] += this.grav[i] * dt;
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      i++;
    }

    /* popups */
    for (const p of this.pops) {
      if (!p.live) continue;
      p.t += dt;
      p.y += p.vy * dt;
      p.vy += 70 * dt;
      if (p.t >= p.max) p.live = false;
    }

    /* shake — decays fast, offset is smooth noise not pure random,
       so it reads as a knock rather than static */
    if (this.shake > 0.01) {
      this.shake = Math.max(0, this.shake - this.shake * 9 * dt - 1.2 * dt);
      const t = (performance.now() / 1000 + this.shakeSeed) * 46;
      this.shakeX = Math.sin(t * 1.7) * this.shake;
      this.shakeY = Math.cos(t * 2.3) * this.shake * 0.8;
    } else {
      this.shake = this.shakeX = this.shakeY = 0;
    }

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4.2);
    if (this.split > 0) this.split = Math.max(0, this.split - dt * 2.6);
  }

  /* ---------- draw ---------- */
  drawParticles(ctx) {
    for (let i = 0; i < this.n; i++) {
      const t = this.life[i] / this.max[i];
      ctx.globalAlpha = t < 0.5 ? t * 2 : 1;
      ctx.fillStyle = this.col[i];

      if (this.kind[i] === 2) {
        /* ring: grows as it dies */
        const r = this.size[i] + (1 - t) * 22;
        ctx.globalAlpha *= 0.8;
        ctx.strokeStyle = this.col[i];
        ctx.lineWidth = 1 + t * 1.6;
        ctx.beginPath();
        ctx.arc(this.px[i], this.py[i], r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.kind[i] === 1) {
        /* spark: a short streak along its own velocity */
        const s = this.size[i] * (0.4 + t * 0.8);
        const vl = Math.hypot(this.vx[i], this.vy[i]) || 1;
        const ux = this.vx[i] / vl, uy = this.vy[i] / vl;
        const len = Math.min(vl * 0.022, 7) + s;
        ctx.beginPath();
        ctx.lineWidth = s;
        ctx.strokeStyle = this.col[i];
        ctx.lineCap = 'butt';
        ctx.moveTo(this.px[i], this.py[i]);
        ctx.lineTo(this.px[i] - ux * len, this.py[i] - uy * len);
        ctx.stroke();
      } else {
        const s = this.size[i] * (0.35 + t * 0.9);
        ctx.fillRect(this.px[i] - s / 2, this.py[i] - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawPopups(ctx) {
    for (const p of this.pops) {
      if (!p.live) continue;
      const t = p.t / p.max;
      /* overshoot then settle — a tiny bit of bounce on arrival */
      const grow = t < 0.18 ? lerp(0.5, 1.18, t / 0.18) : lerp(1.18, 1, clamp((t - 0.18) / 0.22, 0, 1));
      const size = (8 + p.scale * 3.2) * grow;
      ctx.globalAlpha = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
      ctx.font = `700 ${size.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,21,15,0.85)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.col;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }
}
