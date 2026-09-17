/* ═══════════════════════════════════════════════════════════════
   CORE — the layer every other module stands on.

   Logical space is 320px wide, always. Height is derived from the
   container so the shaft uses whatever screen it is given, clamped
   so a phone and an ultrawide both get a fair view. World
   generation only ever depends on the width, so a taller viewport
   shows more shaft rather than a different shaft.
   ═══════════════════════════════════════════════════════════════ */

export const TILE = 16;
export const COLS = 20;
export const VIEW_W = COLS * TILE;        /* 320 — fixed */
export const WALL = 2;                    /* solid columns each side */
export const MIN_H = 440, MAX_H = 640;

/* ---------- maths ---------- */
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
/* frame-rate independent approach: t is per-second, dt in seconds */
export const damp = (a, b, t, dt) => lerp(a, b, 1 - Math.exp(-t * dt));

/* ---------- seeded RNG (mulberry32) ---------- */
export function rng(seed) {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = (n) => Math.floor(f() * n);
  f.range = (a, b) => a + f() * (b - a);
  f.irange = (a, b) => a + Math.floor(f() * (b - a + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  return f;
}

/* ---------- canvas ---------- */
export class Screen {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.w = VIEW_W;
    this.h = MIN_H;
    this.scale = 1;
    this.dpr = 1;
  }

  /* Size to the parent box. Returns true when the logical height changed. */
  fit() {
    const host = this.cv.parentElement;
    const availW = host.clientWidth;
    const availH = host.clientHeight;
    if (!availW || !availH) return false;

    /* pick the logical height that best uses the box at width 320 */
    const wanted = clamp(Math.round((availH / availW) * VIEW_W), MIN_H, MAX_H);
    const changed = wanted !== this.h;
    this.h = wanted;

    /* fit the 320 x h box inside the available area, preserving aspect */
    const s = Math.min(availW / VIEW_W, availH / this.h);
    const cssW = Math.floor(VIEW_W * s);
    const cssH = Math.floor(this.h * s);

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.style.width = cssW + 'px';
    this.cv.style.height = cssH + 'px';
    this.cv.width = Math.round(cssW * this.dpr);
    this.cv.height = Math.round(cssH * this.dpr);
    this.scale = (cssW / VIEW_W) * this.dpr;
    this.ctx.imageSmoothingEnabled = false;
    return changed;
  }

  /* reset the transform each frame — fx layers push their own offsets */
  begin(shakeX = 0, shakeY = 0) {
    const c = this.ctx;
    c.setTransform(this.scale, 0, 0, this.scale, shakeX * this.scale, shakeY * this.scale);
  }
}

/* ---------- input ---------- */
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'shoot', Space: 'shoot', KeyS: 'shoot', KeyJ: 'shoot',
  Escape: 'pause', KeyP: 'pause',
};

export class Input {
  constructor() {
    this.held = { left: false, right: false, shoot: false };
    this.pressed = { shoot: false, pause: false };
    this._onPause = null;
    this._dead = false;

    addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      /* keep the page from scrolling under the game */
      if (a !== 'pause') e.preventDefault();
      if (a === 'pause') { if (!e.repeat) this.pressed.pause = true; return; }
      if (!e.repeat && a === 'shoot') this.pressed.shoot = true;
      this.held[a] = true;
    }, { passive: false });

    addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a && a !== 'pause') this.held[a] = false;
    });

    /* a tab-out should never leave a key stuck down */
    addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
  }

  releaseAll() {
    this.held.left = this.held.right = this.held.shoot = false;
  }

  /* touch: bind three zones supplied by the HUD */
  bindTouch(leftEl, rightEl, shootEl) {
    const wire = (el, action) => {
      if (!el) return;
      const on = (e) => {
        e.preventDefault();
        if (action === 'shoot' && !this.held.shoot) this.pressed.shoot = true;
        this.held[action] = true;
      };
      const off = (e) => { e.preventDefault(); this.held[action] = false; };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    wire(leftEl, 'left');
    wire(rightEl, 'right');
    wire(shootEl, 'shoot');
  }

  /* call once at the end of every tick */
  flush() {
    this.pressed.shoot = false;
    this.pressed.pause = false;
  }
}

/* ---------- fixed-step loop ---------- */
export class Loop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.step = 1 / 120;          /* small step keeps collision honest */
    this.maxCatchUp = 8;
    this.acc = 0;
    this.last = 0;
    this.raf = 0;
    this.running = false;
    this._tick = this._tick.bind(this);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this._tick);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  _tick(now) {
    if (!this.running) return;
    /* a long pause (tab hidden) must not fast-forward the sim */
    let frame = (now - this.last) / 1000;
    this.last = now;
    if (frame > 0.25) frame = this.step;
    this.acc += frame;

    let n = 0;
    while (this.acc >= this.step && n < this.maxCatchUp) {
      this.update(this.step);
      this.acc -= this.step;
      n++;
    }
    if (n === this.maxCatchUp) this.acc = 0;   /* bail out, don't spiral */

    this.render(this.acc / this.step);
    this.raf = requestAnimationFrame(this._tick);
  }
}
