/* ═══════════════════════════════════════════════════════════════
   WORLD — the shaft.

   Generated a band at a time as the camera descends, and pruned
   behind, so an infinite descent costs a constant amount of
   memory. Rows live in a Map keyed by absolute row index, which
   means row numbers never wrap and depth arithmetic stays simple.

   The one hard invariant: every band leaves a traversable gap. A
   band that seals the shaft is a dead run through no fault of the
   player, so `_carve` runs last on every band and punches a hole
   if generation happened to close it.
   ═══════════════════════════════════════════════════════════════ */

import { TILE, COLS, WALL, rng } from './core.js';

export const EMPTY = 0;
export const SOLID = 1;
export const CRUMBLE = 2;
export const SPIKE = 3;

const BAND = 12;                  /* rows generated at a time */
const IN_L = WALL;                /* first interior column */
const IN_R = COLS - WALL - 1;     /* last interior column */
const IN_W = IN_R - IN_L + 1;     /* interior width in tiles */

/* Zones change the feel every ~250m. Enemy mix lives here too, so
   the difficulty curve is one table to read rather than logic
   scattered across the spawner. */
export const ZONES = [
  { name: 'THE LIP', accent: '#4FB3D9', density: 0.42, spike: 0.05, crumble: 0.06, enemies: ['crawler'], rate: 0.55 },
  { name: 'DRY SHAFT', accent: '#C9E82A', density: 0.50, spike: 0.09, crumble: 0.10, enemies: ['crawler', 'hardhat'], rate: 0.70 },
  { name: 'THE WEEP', accent: '#2E5C7A', density: 0.54, spike: 0.12, crumble: 0.14, enemies: ['crawler', 'hardhat', 'floater'], rate: 0.82 },
  { name: 'DEAD AIR', accent: '#E8894A', density: 0.58, spike: 0.15, crumble: 0.16, enemies: ['hardhat', 'floater', 'turret'], rate: 0.92 },
  { name: 'THE GRIND', accent: '#D4508A', density: 0.62, spike: 0.18, crumble: 0.18, enemies: ['crawler', 'hardhat', 'floater', 'turret', 'diver'], rate: 1.0 },
  { name: 'BEDROCK', accent: '#D4402A', density: 0.66, spike: 0.22, crumble: 0.20, enemies: ['hardhat', 'floater', 'turret', 'diver'], rate: 1.12 },
];

export const ZONE_ROWS = 96;      /* rows per zone (~1536px, ~250m) */

export function zoneAt(row) {
  const i = Math.floor(Math.max(row, 0) / ZONE_ROWS);
  return ZONES[Math.min(i, ZONES.length - 1)];
}
export function zoneIndex(row) {
  return Math.min(Math.floor(Math.max(row, 0) / ZONE_ROWS), ZONES.length - 1);
}

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.rand = rng(this.seed);
    this.rows = new Map();          /* row index -> Uint8Array(COLS) */
    this.topRow = 0;                /* oldest row still kept */
    this.genRow = 0;                /* next row to generate */
    this.spawns = [];               /* queued actor spawn descriptors */
    this.openRows = 14;             /* free-fall runway at the very top */
  }

  /* ---------- queries ---------- */
  tile(col, row) {
    if (col < 0 || col >= COLS) return SOLID;
    const r = this.rows.get(row);
    if (!r) return EMPTY;
    return r[col];
  }

  isSolid(col, row) {
    const t = this.tile(col, row);
    return t === SOLID || t === CRUMBLE;
  }

  /* world-space point -> tile */
  tileAtPoint(x, y) {
    return this.tile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  /* Does this AABB overlap any solid tile? */
  rectSolid(x, y, w, h) {
    const c0 = Math.floor(x / TILE), c1 = Math.floor((x + w - 0.001) / TILE);
    const r0 = Math.floor(y / TILE), r1 = Math.floor((y + h - 0.001) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isSolid(c, r)) return true;
      }
    }
    return false;
  }

  /* Any spike touching this AABB? Returns the tile coords or null. */
  rectSpike(x, y, w, h) {
    const c0 = Math.floor(x / TILE), c1 = Math.floor((x + w - 0.001) / TILE);
    const r0 = Math.floor(y / TILE), r1 = Math.floor((y + h - 0.001) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.tile(c, r) === SPIKE) return { col: c, row: r };
      }
    }
    return null;
  }

  setTile(col, row, v) {
    const r = this.rows.get(row);
    if (r && col >= 0 && col < COLS) r[col] = v;
  }

  /* ---------- lifecycle ---------- */
  ensureTo(row) {
    while (this.genRow <= row) this._genBand();
  }

  prune(aboveRow) {
    while (this.topRow < aboveRow) {
      this.rows.delete(this.topRow);
      this.topRow++;
    }
  }

  takeSpawns() {
    if (!this.spawns.length) return null;
    const s = this.spawns;
    this.spawns = [];
    return s;
  }

  /* ---------- generation ---------- */
  _blankRow(row) {
    const r = new Uint8Array(COLS);
    for (let c = 0; c < WALL; c++) { r[c] = SOLID; r[COLS - 1 - c] = SOLID; }
    this.rows.set(row, r);
    return r;
  }

  _genBand() {
    const start = this.genRow;
    const R = this.rand;
    const z = zoneAt(start);

    for (let i = 0; i < BAND; i++) this._blankRow(start + i);

    /* the opening runway is deliberately empty — the first thing a
       player should feel is speed, not a wall */
    if (start < this.openRows) {
      this.genRow = start + BAND;
      return;
    }

    const platforms = [];
    /* how many ledges this band gets, scaled by zone density */
    const count = Math.max(1, Math.round(R.range(1.6, 3.4) * z.density * 1.6));

    for (let p = 0; p < count; p++) {
      const row = start + R.irange(1, BAND - 2);
      const len = R.irange(3, Math.max(4, Math.floor(IN_W * 0.55)));
      const col = IN_L + R.irange(0, IN_W - len);

      /* never seal the shaft: leave at least 3 clear interior tiles */
      if (len >= IN_W - 2) continue;

      const type = R.chance(z.crumble) ? CRUMBLE : SOLID;
      for (let c = col; c < col + len; c++) this.setTile(c, row, type);
      platforms.push({ row, col, len, type });
    }

    /* Spikes are a second pass on purpose. Placing them inline let a
       later overlapping CRUMBLE ledge overwrite the SOLID tile a
       spike had already been put above, leaving spikes perched on
       something that gives way. Laying every ledge down first means
       the check below sees the final tile. */
    for (const p of platforms) {
      if (p.type !== SOLID || p.len < 4) continue;
      if (!R.chance(z.spike)) continue;
      /* never across the whole ledge — there must be a footing */
      const sLen = R.irange(1, Math.max(1, p.len - 2));
      const sCol = p.col + R.irange(0, p.len - sLen);
      for (let c = sCol; c < sCol + sLen; c++) {
        if (this.tile(c, p.row) !== SOLID) continue;     /* it crumbled */
        if (!this.isSolid(c, p.row - 1)) this.setTile(c, p.row - 1, SPIKE);
      }
    }

    this._carve(start);
    this._populate(start, platforms, z, R);
    this.genRow = start + BAND;
  }

  /* Guarantee a vertical path. Walk the band row by row; if a row
     has no interior gap, punch one. */
  _carve(start) {
    for (let i = 0; i < BAND; i++) {
      const row = start + i;
      let open = 0;
      for (let c = IN_L; c <= IN_R; c++) if (!this.isSolid(c, row)) open++;
      if (open >= 3) continue;
      const at = IN_L + this.rand.irange(0, IN_W - 3);
      for (let c = at; c < at + 3; c++) {
        this.setTile(c, row, EMPTY);
        if (this.tile(c, row - 1) === SPIKE) this.setTile(c, row - 1, EMPTY);
      }
    }
  }

  /* Queue enemies and gems. Enemies stand on ledges; gems float in
     open air where reaching them costs you airtime. */
  _populate(start, platforms, z, R) {
    for (const p of platforms) {
      if (p.type !== SOLID) continue;
      if (!R.chance(0.34 * z.rate)) continue;

      /* find a tile on this ledge with headroom and no spike */
      const tries = 6;
      for (let t = 0; t < tries; t++) {
        const c = p.col + R.int(p.len);
        if (this.tile(c, p.row - 1) !== EMPTY) continue;
        if (this.tile(c, p.row - 2) !== EMPTY) continue;
        this.spawns.push({
          type: R.pick(z.enemies),
          x: c * TILE + TILE / 2,
          y: (p.row - 1) * TILE + TILE,
          row: p.row - 1,
          minCol: p.col,
          maxCol: p.col + p.len - 1,
        });
        break;
      }
    }

    /* turrets clamp to the shaft walls, so they get their own pass */
    if (z.enemies.includes('turret') && R.chance(0.35)) {
      const row = start + R.irange(2, BAND - 3);
      const left = R.chance(0.5);
      const col = left ? IN_L : IN_R;
      if (!this.isSolid(col, row) && !this.isSolid(col, row + 1)) {
        this.spawns.push({
          type: 'turret',
          x: col * TILE + TILE / 2,
          y: row * TILE + TILE / 2,
          facing: left ? 1 : -1,
        });
      }
    }

    /* gems */
    const gems = R.irange(1, 3);
    for (let g = 0; g < gems; g++) {
      for (let t = 0; t < 8; t++) {
        const row = start + R.int(BAND);
        const col = IN_L + R.int(IN_W);
        if (this.tile(col, row) !== EMPTY) continue;
        if (this.isSolid(col, row + 1)) continue;   /* not flush on a ledge */
        this.spawns.push({
          type: 'gem',
          x: col * TILE + TILE / 2,
          y: row * TILE + TILE / 2,
        });
        break;
      }
    }
  }
}
