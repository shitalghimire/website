/* ═══════════════════════════════════════════════════════════════
   RENDER — four colours and a grid.

   The palette is deliberately tiny: ink ground, bone terrain,
   hi-vis player, signal-red threat, plus one accent that shifts
   per zone. At the speed this game runs, colour is the only thing
   the eye can read reliably, so colour carries meaning and nothing
   else does. Bone = you can stand on it. Red = it will hurt you.
   Hi-vis = it is yours.

   The shaft walls are ruled like a survey staff, with depth ticks
   every ten rows. It is the drawing-set language of the rest of
   the site, and it doubles as a speed cue.
   ═══════════════════════════════════════════════════════════════ */

import { TILE, COLS, WALL, VIEW_W, clamp } from './core.js';
import { EMPTY, SOLID, CRUMBLE, SPIKE } from './world.js';
import { P_W, P_H } from './player.js';

export function draw(ctx, g) {
  const { screen, world, player, actors, fx, palette: pal } = g;
  const H = screen.h;
  const camY = g.camY;
  const top = camY;
  const bottom = camY + H;

  /* ---------- ground ---------- */
  ctx.fillStyle = pal.plate;
  ctx.fillRect(0, 0, VIEW_W, H);

  ctx.save();
  ctx.translate(0, -camY);

  drawBackdrop(ctx, g, top, bottom);
  drawTiles(ctx, g, top, bottom);
  drawPickups(ctx, g);
  drawEnemies(ctx, g);
  drawProjectiles(ctx, g);
  if (!player.dead || g.deathT < 0.5) drawPlayer(ctx, g);
  fx.drawParticles(ctx);
  fx.drawPopups(ctx);

  ctx.restore();

  drawWallRule(ctx, g, top, bottom);
  drawOverlays(ctx, g);
}

/* ---------- backdrop: grid + depth ticks ---------- */
function drawBackdrop(ctx, g, top, bottom) {
  const pal = g.palette;
  const r0 = Math.floor(top / TILE) - 1;
  const r1 = Math.ceil(bottom / TILE) + 1;

  ctx.strokeStyle = 'rgba(242,240,234,0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c += 2) {
    ctx.moveTo(c * TILE, r0 * TILE);
    ctx.lineTo(c * TILE, r1 * TILE);
  }
  for (let r = r0; r <= r1; r += 2) {
    ctx.moveTo(0, r * TILE);
    ctx.lineTo(VIEW_W, r * TILE);
  }
  ctx.stroke();

  /* a faint horizon band per zone, so crossing one is visible in
     the world and not only in the HUD */
  const zr = g.zoneStartRow;
  const y = zr * TILE;
  if (y > top - 40 && y < bottom + 40) {
    ctx.strokeStyle = pal.accent;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(WALL * TILE, y);
    ctx.lineTo(VIEW_W - WALL * TILE, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

/* ---------- terrain ---------- */
function drawTiles(ctx, g, top, bottom) {
  const { world, palette: pal } = g;
  const r0 = Math.floor(top / TILE) - 1;
  const r1 = Math.ceil(bottom / TILE) + 1;

  for (let r = r0; r <= r1; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = world.tile(c, r);
      if (t === EMPTY) continue;
      const x = c * TILE, y = r * TILE;

      if (t === SPIKE) {
        ctx.fillStyle = pal.signal;
        ctx.beginPath();
        /* three teeth, so it reads as spikes even at one tile wide */
        for (let i = 0; i < 3; i++) {
          const sx = x + (i * TILE) / 3;
          ctx.moveTo(sx, y + TILE);
          ctx.lineTo(sx + TILE / 6, y + TILE * 0.30);
          ctx.lineTo(sx + TILE / 3, y + TILE);
        }
        ctx.fill();
        continue;
      }

      if (t === CRUMBLE) {
        /* hatched, to warn that it will not hold */
        ctx.fillStyle = 'rgba(242,240,234,0.20)';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = pal.paper;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        for (let i = -TILE; i < TILE; i += 4) {
          ctx.moveTo(x + i, y + TILE);
          ctx.lineTo(x + i + TILE, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = pal.paper;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        continue;
      }

      /* solid */
      ctx.fillStyle = pal.paper;
      ctx.fillRect(x, y, TILE, TILE);

      /* a hi-vis lip on any exposed top face: "you can land here" */
      if (!world.isSolid(c, r - 1) && world.tile(c, r - 1) !== SPIKE) {
        ctx.fillStyle = pal.vis;
        ctx.fillRect(x, y, TILE, 2);
      }
      /* shade the underside so ledges have depth */
      if (!world.isSolid(c, r + 1)) {
        ctx.fillStyle = 'rgba(20,21,15,0.22)';
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
      }
    }
  }
}

/* ---------- pickups ---------- */
function drawPickups(ctx, g) {
  const pal = g.palette;
  for (const p of g.actors.pickups) {
    if (p.dead) continue;
    const bob = Math.sin(p.t * 3) * 1.6;
    ctx.save();
    ctx.translate(p.x, p.y + bob);

    if (p.kind === 'gem') {
      ctx.rotate(p.t * 1.6);
      ctx.fillStyle = pal.accent;
      const s = 3.6;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = pal.paper;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else {
      ctx.fillStyle = pal.signal;
      ctx.beginPath();
      ctx.arc(-2.2, -1, 2.6, 0, Math.PI * 2);
      ctx.arc(2.2, -1, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4.6, 0.2); ctx.lineTo(0, 5.4); ctx.lineTo(4.6, 0.2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- enemies ---------- */
function drawEnemies(ctx, g) {
  const pal = g.palette;
  for (const e of g.actors.enemies) {
    if (e.dead) continue;
    const flash = e.hitFlash > 0;
    const body = flash ? pal.paper : pal.signal;
    const x = e.x, y = e.y, w = e.w, h = e.h;

    ctx.save();
    switch (e.type) {
      case 'crawler': {
        const wob = Math.sin(e.t * 9) * 1.1;
        ctx.fillStyle = body;
        ctx.fillRect(x - w / 2, y + wob * 0.2, w, h);
        /* legs */
        ctx.fillRect(x - w / 2 + 1, y + h, 2, 2 + wob);
        ctx.fillRect(x + w / 2 - 3, y + h, 2, 2 - wob);
        /* eye looks the way it walks */
        ctx.fillStyle = pal.plate;
        ctx.fillRect(x + (e.vx > 0 ? 1.5 : -3.5), y + 2.5, 2, 2.6);
        break;
      }
      case 'hardhat': {
        ctx.fillStyle = body;
        ctx.fillRect(x - w / 2, y + 4, w, h - 4);
        /* the spiked crown — the silhouette that says DO NOT STOMP */
        ctx.fillStyle = flash ? pal.paper : pal.signal;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const sx = x - w / 2 + (i * w) / 4;
          ctx.moveTo(sx, y + 5);
          ctx.lineTo(sx + w / 8, y - 1);
          ctx.lineTo(sx + w / 4, y + 5);
        }
        ctx.fill();
        ctx.fillStyle = pal.plate;
        ctx.fillRect(x - 3, y + 7, 6, 2);
        break;
      }
      case 'floater': {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(x, y + h / 2, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = pal.plate;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x, y + h / 2, w / 2 - 2.6, 0, Math.PI * 2);
        ctx.stroke();
        /* tendrils */
        ctx.strokeStyle = body;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(x + i * 3, y + h - 1);
          ctx.lineTo(x + i * 3 + Math.sin(e.t * 5 + i) * 1.6, y + h + 3.5);
        }
        ctx.stroke();
        break;
      }
      case 'turret': {
        ctx.fillStyle = body;
        ctx.fillRect(x - w / 2, y, w, h);
        ctx.fillStyle = pal.plate;
        /* barrel points where it will shoot */
        ctx.fillRect(x + (e.facing > 0 ? 1 : -w / 2 - 1), y + h / 2 - 1.4, w / 2 + 1, 2.8);
        ctx.fillStyle = e.cd < 0.35 ? pal.paper : pal.plate;
        ctx.fillRect(x - 2, y + 2, 4, 3);
        break;
      }
      case 'diver': {
        const shudder = e.state === 'wind' ? (Math.random() - 0.5) * 2 : 0;
        ctx.translate(shudder, 0);
        ctx.fillStyle = e.state === 'idle' ? '#9B9C92' : body;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
        if (e.state !== 'idle') {
          ctx.fillStyle = pal.paper;
          ctx.fillRect(x - 1.2, y + 2, 2.4, 4);
        }
        break;
      }
    }
    ctx.restore();
  }
}

/* ---------- bullets ---------- */
function drawProjectiles(ctx, g) {
  const pal = g.palette;

  ctx.fillStyle = pal.vis;
  for (const b of g.actors.bullets) {
    if (b.dead) continue;
    /* stretched along travel so fast rounds read as streaks */
    const len = 7;
    const vl = Math.hypot(b.vx, b.vy) || 1;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillRect(-len, -b.r / 2, len + b.r, b.r);
    ctx.restore();
  }

  ctx.fillStyle = pal.signal;
  for (const h of g.actors.hostiles) {
    if (h.dead) continue;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r + Math.sin(h.t * 22) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- player ---------- */
function drawPlayer(ctx, g) {
  const { player: p, palette: pal } = g;

  /* trail */
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    ctx.globalAlpha = (t.t / 0.22) * 0.30 * (i / p.trail.length);
    ctx.fillStyle = pal.vis;
    ctx.fillRect(t.x - P_W / 2, t.y - P_H / 2, P_W, P_H);
  }
  ctx.globalAlpha = 1;

  /* blink while invulnerable, but never go fully invisible */
  if (p.invuln > 0 && Math.floor(p.invuln * 18) % 2 === 0) ctx.globalAlpha = 0.45;

  const sy = p.squash;
  const sx = 1 / Math.max(sy, 0.2);
  const cx = p.cx, cy = p.cy;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);

  /* body */
  ctx.fillStyle = p.flashT > 0 ? pal.paper : pal.vis;
  ctx.fillRect(-P_W / 2, -P_H / 2, P_W, P_H);

  /* visor, facing the direction of travel */
  ctx.fillStyle = pal.plate;
  ctx.fillRect(-P_W / 2 + (p.face > 0 ? 3 : 1), -P_H / 2 + 2, 4, 2.4);

  /* boots glow while there is ammo to burn */
  if (p.ammo > 0) {
    ctx.fillStyle = pal.paper;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-P_W / 2 + 1, P_H / 2 - 1.6, P_W - 2, 1.6);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  /* shield ring */
  if (p.stats.shield > 0) {
    ctx.strokeStyle = pal.accent;
    ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 160) * 0.2;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 9.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* magnet field, so the perk is legible in play */
  if (p.stats.magnet > 0) {
    ctx.strokeStyle = pal.accent;
    ctx.globalAlpha = 0.10;
    ctx.beginPath();
    ctx.arc(cx, cy, p.stats.magnet, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 1;
}

/* ---------- survey staff on the shaft walls ---------- */
function drawWallRule(ctx, g, top, bottom) {
  const pal = g.palette;
  const r0 = Math.floor(top / TILE);
  const r1 = Math.ceil(bottom / TILE);
  const H = g.screen.h;

  ctx.save();
  ctx.font = '500 7px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'middle';

  for (let r = r0; r <= r1; r++) {
    if (r % 5 !== 0) continue;
    const y = r * TILE - top;
    if (y < -8 || y > H + 8) continue;
    const major = r % 20 === 0;

    ctx.strokeStyle = major ? pal.vis : 'rgba(242,240,234,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WALL * TILE - (major ? 9 : 5), y);
    ctx.lineTo(WALL * TILE, y);
    ctx.moveTo(VIEW_W - WALL * TILE, y);
    ctx.lineTo(VIEW_W - WALL * TILE + (major ? 9 : 5), y);
    ctx.stroke();

    if (major) {
      ctx.fillStyle = 'rgba(242,240,234,0.55)';
      ctx.textAlign = 'left';
      ctx.fillText(String(Math.round((r * TILE) / 16)), 3, y);
    }
  }
  ctx.restore();
}

/* ---------- screen-space overlays ---------- */
function drawOverlays(ctx, g) {
  const { fx, palette: pal, screen } = g;
  const H = screen.h;

  /* vignette — cheap, and it pins the eye to the middle */
  if (!g.grad || g.gradH !== H) {
    const grd = ctx.createRadialGradient(VIEW_W / 2, H / 2, H * 0.28, VIEW_W / 2, H / 2, H * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.42)');
    g.grad = grd;
    g.gradH = H;
  }
  ctx.fillStyle = g.grad;
  ctx.fillRect(0, 0, VIEW_W, H);

  /* danger vignette when health is low */
  if (g.player.hp === 1 && !g.player.dead) {
    const pulse = 0.14 + Math.sin(performance.now() / 220) * 0.07;
    ctx.save();
    ctx.globalAlpha = clamp(pulse, 0, 1);
    ctx.strokeStyle = pal.signal;
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, VIEW_W, H);
    ctx.restore();
  }

  /* chromatic split on damage */
  if (fx.split > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = fx.split * 0.22;
    ctx.fillStyle = pal.signal;
    ctx.fillRect(-fx.split * 5, 0, VIEW_W, H);
    ctx.fillStyle = '#2E5C7A';
    ctx.fillRect(fx.split * 5, 0, VIEW_W, H);
    ctx.restore();
  }

  /* flash */
  if (fx.flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = fx.flash * 0.7;
    ctx.fillStyle = fx.flashCol;
    ctx.fillRect(0, 0, VIEW_W, H);
    ctx.restore();
  }

  /* speed lines at terminal velocity — pure cosmetics, big payoff */
  const sp = g.player.vy / 430;
  if (sp > 0.82 && !g.player.dead) {
    ctx.save();
    ctx.globalAlpha = (sp - 0.82) * 1.6;
    ctx.strokeStyle = 'rgba(242,240,234,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const x = ((i * 97 + Math.floor(g.camY * 0.6)) % VIEW_W);
      const len = 16 + ((i * 31) % 26);
      const y = (Math.floor(g.camY * 2.4) + i * 71) % H;
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
    }
    ctx.stroke();
    ctx.restore();
  }
}
