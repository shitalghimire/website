/* ═══════════════════════════════════════════════════════════════
   PORTRAIT — turns a photograph into a 1-bit dithered bitmap so a
   real face can sit inside a four-colour game without looking
   pasted in.

   There is no image tooling in the build (no ImageMagick, no
   Pillow), and that turned out to be the better constraint: the
   crop, the levels and the dither threshold are all code here, so
   the portrait is tunable instead of baked. The photo ships as an
   ordinary JPEG.

   Pipeline: crop -> downscale -> luminance -> levels -> gamma ->
   ordered Bayer 4x4 threshold -> packed bitmask.
   ═══════════════════════════════════════════════════════════════ */

/* ordered dither matrix — cheap, stable, and it never crawls
   between frames the way error-diffusion does */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export class Portrait {
  /**
   * @param {string} src   path to the photograph
   * @param {object} opts  crop is in 0..1 fractions of the source
   */
  constructor(src, opts = {}) {
    this.src = src;
    this.w = opts.w || 52;
    this.h = opts.h || 54;
    this.crop = opts.crop || { x: 0, y: 0, w: 1, h: 1 };
    this.black = opts.black == null ? 0.16 : opts.black;   /* levels: black point */
    this.white = opts.white == null ? 0.82 : opts.white;   /* levels: white point */
    this.gamma = opts.gamma == null ? 1.05 : opts.gamma;
    this.invert = !!opts.invert;

    this.bits = null;        /* Uint8Array, 1 byte per pixel, 0 or 1 */
    this.loaded = false;
    this.failed = false;
    this._promise = null;
  }

  load() {
    if (this._promise) return this._promise;
    this._promise = new Promise((resolve) => {
      const img = new Image();
      /* the photo is same-origin, but be explicit so a CDN move
         later does not silently taint the canvas */
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          this._process(img);
          this.loaded = true;
        } catch (e) {
          this.failed = true;
        }
        resolve(this);
      };
      img.onerror = () => { this.failed = true; resolve(this); };
      img.src = this.src;
    });
    return this._promise;
  }

  _process(img) {
    const { w, h, crop } = this;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const c = off.getContext('2d', { willReadFrequently: true });

    const sx = crop.x * img.naturalWidth;
    const sy = crop.y * img.naturalHeight;
    const sw = crop.w * img.naturalWidth;
    const sh = crop.h * img.naturalHeight;

    /* let the browser do the box-filter downscale for us */
    c.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    const px = c.getImageData(0, 0, w, h).data;

    const bits = new Uint8Array(w * h);
    const span = Math.max(this.white - this.black, 0.001);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        /* Rec.601 luma — closest to how the eye weights these */
        let l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;

        /* levels, then gamma — this is the "edit" */
        l = (l - this.black) / span;
        l = l < 0 ? 0 : l > 1 ? 1 : l;
        if (this.gamma !== 1) l = Math.pow(l, this.gamma);

        const t = (BAYER[y & 3][x & 3] + 0.5) / 16;
        let on = l < t;                 /* ink where the photo is dark */
        if (this.invert) on = !on;
        bits[y * w + x] = on ? 1 : 0;
      }
    }
    this.bits = bits;
  }

  /**
   * Draw into a 2D context as chunky pixels.
   * @param ctx    target context
   * @param x,y    top-left in target units
   * @param px     size of one portrait pixel in target units
   * @param color  fill for "on" pixels
   * @param alpha  0..1
   */
  draw(ctx, x, y, px, color, alpha = 1) {
    if (!this.loaded || !this.bits) return;
    const { w, h, bits } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    /* merge horizontal runs into single fillRects — roughly 3x
       fewer draw calls than one rect per pixel */
    for (let row = 0; row < h; row++) {
      let run = 0;
      for (let col = 0; col <= w; col++) {
        const on = col < w && bits[row * w + col];
        if (on) { run++; continue; }
        if (run) {
          ctx.fillRect(x + (col - run) * px, y + row * px, run * px, px);
          run = 0;
        }
      }
    }
    ctx.restore();
  }

  /* width/height in target units for a given pixel size */
  sizeAt(px) { return { w: this.w * px, h: this.h * px }; }

  /**
   * Render once into a standalone <canvas>, for the DOM overlays
   * (perk screen, run summary) where we are outside the game loop.
   */
  toCanvas(px, color, bg) {
    const cv = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(this.w * px * dpr);
    cv.height = Math.round(this.h * px * dpr);
    cv.style.width = this.w * px + 'px';
    cv.style.height = this.h * px + 'px';
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.imageSmoothingEnabled = false;
    if (bg) {
      c.fillStyle = bg;
      c.fillRect(0, 0, this.w * px, this.h * px);
    }
    this.draw(c, 0, 0, px, color, 1);
    return cv;
  }
}

/* The cameo, rendered as a negative: `invert` draws the bright
   pixels, so the lit side of the face becomes dither texture while
   the hair and jacket drop out to bare plate. Drawing the dark
   pixels instead was tried first and reads badly — hair and jacket
   both crush to one solid mass with a hole where the face is.

   The crop was measured off the source rather than guessed. On a
   40x40 luminance sample of this photo the head occupies columns
   17-29 and rows 9-21; the numbers below are that box with a
   little margin. Measured luminances it is balanced against:
   jacket 0.11, beard 0.14, hair 0.20-0.30, lit cheek ~0.57,
   wall 0.79. The black point sits just above the hair so it falls
   away, and the white point just under the wall so the face lands
   near half density and stays legible.

   Resolution is 210x218 at an integer 1x. Lower was tried across
   a ladder from 52 up: below ~140 the features mush together, and
   at this size the eye, nose, beard and ear all resolve while the
   dither is still visibly a dither. Keep the pixel size an integer
   — a fractional one lands runs on half-pixels and the grid goes
   uneven. On a hi-DPI screen toCanvas multiplies by devicePixelRatio
   anyway, so 1x here is still sharp.

   If the photo is swapped, re-measure and retune these numbers;
   nothing else needs to change. */
export const SURVEYOR = new Portrait('assets/images/portrait.jpg', {
  w: 210,
  h: 218,
  crop: { x: 0.395, y: 0.195, w: 0.365, h: 0.375 },
  black: 0.22,
  white: 0.70,
  gamma: 1.0,
  invert: true,
});
