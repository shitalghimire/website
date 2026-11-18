/* ═══════════════════════════════════════════════════════════════
   world3d — a small WebGL stage for the Registry.

   Draws what it is given: a block of ground with its painted texture and
   cut sides, a river, tunnels (true size up close, thicker from far away
   so they can always be seen), arched caverns, shafts, portals, buildings,
   houses, pylons with their wires, labels, and a second "towers" scene.
   Underground works show through the ground in the x-ray view.

   It knows nothing about any project: every figure arrives sealed and is
   handed in by the page that uses it.

   createWorld(host, spec, opts) → api | null (null = no WebGL)
   ═══════════════════════════════════════════════════════════════ */

/* three.js is loaded on first use, so pages that never show 3D never fetch it */
let THREE = null;
const loadThree = async () => (THREE ??= await import('../vendor/three.module.min.js'));

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const rnd = (i) => { let h = (i * 374761393) ^ 0x5bf03635; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const d2r = Math.PI / 180;

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch { return false; }
}

/* split a polyline at fractions of its length: returns the points of [a, b] */
function cut(pts, a, b) {
  const seg = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); seg.push(d); L += d; }
  const at = (f) => {
    let s = clamp(f, 0, 1) * L;
    for (let i = 0; i < seg.length; i++) { if (s <= seg[i] || i === seg.length - 1) return { i, p: pts[i].clone().lerp(pts[i + 1], seg[i] ? clamp(s / seg[i], 0, 1) : 0) }; s -= seg[i]; }
    return { i: pts.length - 2, p: pts.at(-1).clone() };
  };
  const A = at(a), B = at(b);
  return [A.p, ...pts.slice(A.i + 1, B.i + 1), B.p].filter((p, k, arr) => k === 0 || p.distanceTo(arr[k - 1]) > 0.01);
}
function tubeGeo(pts, r) {
  if (pts.length < 2) return null;
  const path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  const len = path.getLength();
  return new THREE.TubeGeometry(path, Math.max(4, Math.min(900, Math.round(len / Math.max(1.5, r * 1.6)) + pts.length)), r, 12, false);
}
/* join indexed geometries with the same attributes into one */
function merge(list) {
  list = list.filter(Boolean);
  if (!list.length) return null;
  const names = Object.keys(list[0].attributes).filter((n) => list.every((g) => g.attributes[n]));
  const out = new THREE.BufferGeometry(); let vCount = 0, iCount = 0;
  for (const g of list) { vCount += g.attributes.position.count; iCount += g.index ? g.index.count : g.attributes.position.count; }
  for (const n of names) { const s = list[0].attributes[n].itemSize; const arr = new Float32Array(vCount * s); let o = 0; for (const g of list) { arr.set(g.attributes[n].array, o); o += g.attributes[n].count * s; } out.setAttribute(n, new THREE.BufferAttribute(arr, s)); }
  const idx = new (vCount > 65535 ? Uint32Array : Uint16Array)(iCount); let io = 0, vo = 0;
  for (const g of list) { const n = g.attributes.position.count; if (g.index) for (let k = 0; k < g.index.count; k++) idx[io++] = g.index.array[k] + vo; else for (let k = 0; k < n; k++) idx[io++] = k + vo; vo += n; }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  list.forEach((g) => g.dispose());
  return out;
}
const paint = (g, color) => { const c = new THREE.Color(color); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const beam = (a, b, t) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const L = A.distanceTo(B); const g = new THREE.BoxGeometry(t, L, t); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.applyQuaternion(q); g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2); g.deleteAttribute('uv'); return g; };
const box = (w, h, d, x = 0, y = 0, z = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); g.deleteAttribute('uv'); return g; };

/* small canvas textures, made here so nothing is fetched */
function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function waterNormals() {
  const N = 128, hgt = new Float32Array(N * N);
  for (let o = 0; o < 4; o++) { const f = 4 * 2 ** o; const v = (i, j) => rnd(((i % f) + f) % f + (((j % f) + f) % f) * 977 + o * 131071); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const fx = (x / N) * f, fy = (y / N) * f * 0.6, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j, s = (t) => t * t * (3 - 2 * t); hgt[y * N + x] += (v(i, j) * (1 - s(u)) * (1 - s(w)) + v(i + 1, j) * s(u) * (1 - s(w)) + v(i, j + 1) * (1 - s(u)) * s(w) + v(i + 1, j + 1) * s(u) * s(w)) / (o + 1); } }
  return canvasTex(N, N, (g) => { const im = g.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x + N - 1) % N)], dy = hgt[((y + 1) % N) * N + x] - hgt[((y + N - 1) % N) * N + x]; const l = Math.hypot(dx, dy, 0.35); const k = (y * N + x) * 4; im.data[k] = (-dx / l * 0.5 + 0.5) * 255; im.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255; im.data[k + 2] = (0.35 / l * 0.5 + 0.5) * 255; im.data[k + 3] = 255; } g.putImageData(im, 0, 0); }, { repeat: true, srgb: false });
}

/* the shared size rule: a tube is never drawn thinner than uMinR (metres) */
const U = { minR: { value: 0 } };
function grows(mat, r, k = 1, horiz = false) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uMinR = U.minR; sh.uniforms.uR = { value: r }; sh.uniforms.uK = { value: k };
    sh.vertexShader = 'uniform float uMinR;\nuniform float uR;\nuniform float uK;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      horiz ? '#include <begin_vertex>\ntransformed.xz += normal.xz * max(uMinR * uK - uR, 0.0);' : '#include <begin_vertex>\ntransformed += normal * max(uMinR * uK - uR, 0.0);');
  };
  mat.customProgramCacheKey = () => 'grow' + (horiz ? 'h' : 'r');
  return mat;
}

export async function createWorld(host, spec, opts = {}) {
  if (!webglOK()) return null;
  await loadThree();
  if (!host.isConnected) return null;
  const pal = { bg: '#e9e3d1', sky: null, fog: null, ink: '#14221c', ghost: '#8d968d', water: '#5d8c8e', pick: '#d7b45c', dark: false, ...(opts.palette || {}) };
  const sky = pal.sky || [pal.bg, pal.bg];
  const still = reduce();
  const coarse = matchMedia('(pointer: coarse)').matches;

  /* ── stage ── */
  const wrap = document.createElement('div'); wrap.className = 'w3';
  const canvas = document.createElement('canvas'); canvas.className = 'w3__canvas';
  canvas.setAttribute('aria-label', opts.label || 'Interactive 3D model'); canvas.tabIndex = 0;
  const layer = document.createElement('div'); layer.className = 'w3__labels';
  const hud = document.createElement('div'); hud.className = 'w3__hud';
  hud.innerHTML = '<div class="w3__compass" aria-hidden="true"><i></i><b>N</b></div><div class="w3__scale" aria-hidden="true"><i></i><span></span></div>';
  wrap.append(canvas, layer, hud);
  let creditEl = null; if (spec.credit) { creditEl = document.createElement('p'); creditEl.className = 'w3__credit'; creditEl.textContent = spec.credit; creditEl.title = spec.credit; wrap.append(creditEl); }
  host.append(wrap);
  const needle = hud.querySelector('.w3__compass'), scaleBox = hud.querySelector('.w3__scale'), scaleBar = hud.querySelector('.w3__scale i'), scaleTxt = hud.querySelector('.w3__scale span');

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch { wrap.remove(); return null; }
  renderer.setPixelRatio(Math.min(coarse ? 1.5 : 1.75, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  scene.background = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const R0 = spec.radius || 3000;
  scene.fog = new THREE.Fog(pal.fog || sky[1], R0 * 1.4, R0 * 5.5);
  const camera = new THREE.PerspectiveCamera(40, 1, 2, R0 * 14);
  scene.add(new THREE.HemisphereLight(pal.dark ? 0x9fb4c8 : 0xfff6e8, pal.dark ? 0x1d2a24 : 0x5b5240, pal.dark ? 0.75 : 1.15));
  const sun = new THREE.DirectionalLight(pal.dark ? 0xc9d6ff : 0xfff1dc, pal.dark ? 1.25 : 2.3);
  const sunAz = (spec.sun?.az ?? 215) * d2r, sunAlt = (spec.sun?.alt ?? 36) * d2r;
  const C = spec.center ? new THREE.Vector3(...spec.center) : new THREE.Vector3();
  sun.position.set(C.x + Math.sin(sunAz) * Math.cos(sunAlt) * R0 * 3, C.y + Math.sin(sunAlt) * R0 * 3, C.z - Math.cos(sunAz) * Math.cos(sunAlt) * R0 * 3);
  sun.target.position.copy(C); scene.add(sun, sun.target);
  sun.castShadow = true; const sm = coarse ? 2048 : 4096; sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera; sc.left = -R0 * 1.25; sc.right = R0 * 1.25; sc.top = R0 * 1.25; sc.bottom = -R0 * 1.25; sc.near = R0 * 0.5; sc.far = R0 * 6;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 1.5;

  const geo = new THREE.Group(); scene.add(geo);
  const towers = new THREE.Group(); towers.visible = false; scene.add(towers);
  const byId = new Map();            // id → { meshes, pts, center, size }
  const meshPick = [];               // raycast targets in the land scene
  const tubePick = [];               // { id, pts (local), r, horiz }
  const xray = [];                   // see-through twins
  let mode = 'geo', fade = 1, fadeGoal = 1, grow = 0, growGoal = 0, groundMode = 'xray';
  let hoverDirty = false, hovered = null, selected = null, built = false;
  const labels = []; const fills = new Map(); const towerMeshes = []; const towerPick = [];
  const reg = (id, mesh) => { if (!id) return; mesh.userData.id = id; if (!byId.has(id)) byId.set(id, { meshes: [], pts: [] }); byId.get(id).meshes.push(mesh); };
  const regPts = (id, pts) => { if (!id) return; if (!byId.has(id)) byId.set(id, { meshes: [], pts: [] }); byId.get(id).pts.push(...pts); };
  const solidMat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.06, ...o });
  const ghostMat = (color) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.9 });
  const xrayMat = (color, opacity, vc = false) => new THREE.MeshBasicMaterial({ color: vc ? 0xffffff : color, vertexColors: vc, transparent: true, opacity, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false });
  const twin = (mesh, mat, id) => { const m = new THREE.Mesh(mesh.geometry, mat); m.position.copy(mesh.position); m.rotation.copy(mesh.rotation); m.scale.copy(mesh.scale); m.renderOrder = 20; m.userData = { id, base: mat.opacity }; mesh.parent.add(m); xray.push(m); return m; };

  /* ── the ground block ── */
  let ground = null; const landBits = [];
  let groundTex = null; const landTex = [];
  const T = spec.terrain;
  if (T) {
    const { nx, nz, x0, z0, dx, dz, h } = T;
    let lo = Infinity, hi = -Infinity; for (let k = 0; k < h.length; k++) { if (h[k] < lo) lo = h[k]; if (h[k] > hi) hi = h[k]; }
    const base = T.base ?? lo - Math.max(80, (hi - lo) * 0.08);
    const pos = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
    const G = spec.ground || { x0, z0, w: (nx - 1) * dx, d: (nz - 1) * dz };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = x0 + i * dx, z = z0 + j * dz;
      pos[k * 3] = x; pos[k * 3 + 1] = h[k]; pos[k * 3 + 2] = z;
      const hx = (h[j * nx + Math.min(nx - 1, i + 1)] - h[j * nx + Math.max(0, i - 1)]) / (2 * dx), hz = (h[Math.min(nz - 1, j + 1) * nx + i] - h[Math.max(0, j - 1) * nx + i]) / (2 * dz);
      const l = Math.hypot(hx, 1, hz); nor[k * 3] = -hx / l; nor[k * 3 + 1] = 1 / l; nor[k * 3 + 2] = -hz / l;
      uv[k * 2] = (x - G.x0) / G.w; uv[k * 2 + 1] = 1 - (z - G.z0) / G.d;
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let o = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.set([a, c, b, b, c, d], o); o += 6; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere();
    const gm = new THREE.MeshStandardMaterial({ color: pal.dark ? 0x52664f : 0x8f9568, roughness: 0.96, metalness: 0 });
    /* contour lines in the shader (WebGL2 only): thin every 50 m, stronger every 250 m */
    const grain = canvasTex(128, 128, (c, w, hh) => { const im = c.createImageData(w, hh); for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { let v = 0; for (let o = 0; o < 3; o++) { const f = 8 * 2 ** o; const q = (i, j) => rnd((((i % f) + f) % f) + (((j % f) + f) % f) * 613 + o * 7919); const fx = (x / w) * f, fy = (y / hh) * f, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, t = fy - j; v += (q(i, j) * (1 - u) * (1 - t) + q(i + 1, j) * u * (1 - t) + q(i, j + 1) * (1 - u) * t + q(i + 1, j + 1) * u * t) / 3; } const k = (y * w + x) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = v * 255; im.data[k + 3] = 255; } c.putImageData(im, 0, 0); }, { repeat: true, srgb: false });
    const CU = { on: { value: 0 }, zero: { value: T.zero ?? 0 }, ink: { value: new THREE.Color(pal.dark ? '#e8dcc0' : '#3a3122') }, grain: { value: grain } };
    /* up to two sharp insets: finer ground texture where the detail sheets give it */
    const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); blank.needsUpdate = true;
    const IN = [0, 1].map(() => ({ t: { value: blank }, r: { value: new THREE.Vector4(0, 0, 1, 1) } })); const inOn = { value: new THREE.Vector2(0, 0) };
    (spec.insets || []).slice(0, 2).forEach((s, k) => { IN[k].r.value.set(s.x0, s.z0, s.w, s.d); new THREE.TextureLoader().load(s.url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); IN[k].t.value = t; inOn.value.setComponent(k, 1); landTex.push(t); }); });
    if (renderer.capabilities.isWebGL2) gm.onBeforeCompile = (sh) => {
      sh.uniforms.uCon = CU.on; sh.uniforms.uZero = CU.zero; sh.uniforms.uInk = CU.ink; sh.uniforms.uGrain = CU.grain;
      sh.uniforms.uIn0 = IN[0].t; sh.uniforms.uIn1 = IN[1].t; sh.uniforms.uInR0 = IN[0].r; sh.uniforms.uInR1 = IN[1].r; sh.uniforms.uInOn = inOn;
      sh.vertexShader = 'varying float vEl;\nvarying vec2 vXZ;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEl = position.y; vXZ = position.xz;');
      sh.fragmentShader = 'uniform float uCon;\nuniform float uZero;\nuniform vec3 uInk;\nuniform sampler2D uGrain;\nuniform sampler2D uIn0;\nuniform sampler2D uIn1;\nuniform vec4 uInR0;\nuniform vec4 uInR1;\nuniform vec2 uInOn;\nvarying float vEl;\nvarying vec2 vXZ;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { vec2 q = (vXZ - uInR0.xy) / uInR0.zw; if (uInOn.x > 0.5 && q.x > 0.0 && q.y > 0.0 && q.x < 1.0 && q.y < 1.0) { float e = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y)); diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uIn0, vec2(q.x, 1.0 - q.y)).rgb, smoothstep(0.0, 0.08, e)); } }
        { vec2 q = (vXZ - uInR1.xy) / uInR1.zw; if (uInOn.y > 0.5 && q.x > 0.0 && q.y > 0.0 && q.x < 1.0 && q.y < 1.0) { float e = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y)); diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uIn1, vec2(q.x, 1.0 - q.y)).rgb, smoothstep(0.0, 0.08, e)); } }
        diffuseColor.rgb *= 0.84 + 0.32 * (texture2D(uGrain, vXZ / 37.0).r * 0.6 + texture2D(uGrain, vXZ / 9.0).r * 0.4);
        if (uCon > 0.5) { float e = vEl + uZero; float a = e / 50.0; float w = fwidth(a); float l = 1.0 - smoothstep(0.0, w * 1.2, abs(fract(a - 0.5) - 0.5));
          float b = e / 250.0; float wb = fwidth(b); float lb = 1.0 - smoothstep(0.0, wb * 1.6, abs(fract(b - 0.5) - 0.5));
          diffuseColor.rgb = mix(diffuseColor.rgb, uInk, clamp(l * 0.28 + lb * 0.42, 0.0, 0.6)); }`);
    };
    ground = new THREE.Mesh(g, gm); ground.receiveShadow = true; ground.castShadow = true; geo.add(ground);
    if (spec.ground?.url) new THREE.TextureLoader().load(spec.ground.url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); groundTex = t; gm.map = t; gm.color.set(0xffffff); gm.needsUpdate = true; renderer.shadowMap.needsUpdate = true; });
    ground.userData.CU = CU;
    /* the cut sides: layered rock, darker with depth */
    const strata = canvasTex(8, 256, (c, w, hh) => { for (let y = 0; y < hh; y++) { const t = y / hh; const n = rnd(Math.floor(y / 3)) * 0.12 + rnd(Math.floor(y / 17) + 99) * 0.18; const v = pal.dark ? 40 + 40 * (1 - t) + n * 60 : 120 + 70 * (1 - t) + n * 70; c.fillStyle = `rgb(${v * 1.02 | 0},${v * 0.93 | 0},${v * 0.8 | 0})`; c.fillRect(0, y, w, 1); } }, { repeat: true });
    const side = (pts) => {   // pts: [[x, y, z]] along an edge, outward on the left
      const n = pts.length, P = new Float32Array(n * 2 * 3), V = new Float32Array(n * 2 * 2); let s = 0;
      pts.forEach((p, k) => { if (k) s += Math.hypot(p[0] - pts[k - 1][0], p[2] - pts[k - 1][2]); P.set([p[0], p[1], p[2], p[0], base, p[2]], k * 6); V.set([s / 600, (p[1] - base) / 900, s / 600, 0], k * 4); });
      const I = []; for (let k = 0; k < n - 1; k++) { const a = k * 2, b = a + 1, c = a + 2, d = a + 3; I.push(a, b, c, c, b, d); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(P, 3)); sg.setAttribute('uv', new THREE.BufferAttribute(V, 2)); sg.setIndex(I); sg.computeVertexNormals();
      return sg;
    };
    const P = (i, j) => [x0 + i * dx, h[j * nx + i], z0 + j * dz];
    const edges = [Array.from({ length: nx }, (_, i) => P(nx - 1 - i, 0)), Array.from({ length: nz }, (_, j) => P(0, j)), Array.from({ length: nx }, (_, i) => P(i, nz - 1)), Array.from({ length: nz }, (_, j) => P(nx - 1, nz - 1 - j))];
    const sides = new THREE.Mesh(merge(edges.map(side)), new THREE.MeshStandardMaterial({ map: strata, roughness: 1, side: THREE.DoubleSide }));
    sides.receiveShadow = true; geo.add(sides); landBits.push(sides);
    const W = (nx - 1) * dx, D = (nz - 1) * dz;
    const foot = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.7, D * 1.45), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, map: canvasTex(256, 256, (c, w, hh) => { const gr = c.createRadialGradient(w / 2, hh / 2, w * 0.18, w / 2, hh / 2, w / 2); gr.addColorStop(0, pal.dark ? 'rgba(0,0,0,0.55)' : 'rgba(40,30,10,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, hh); }) }));
    foot.rotation.x = -Math.PI / 2; foot.position.set(x0 + W / 2, base - 2, z0 + D / 2); geo.add(foot); landBits.push(foot);
    T.lo = lo; T.hi = hi; T.base = base;
  }
  /* ground height under a local point (bilinear), for picking and placing */
  const heightAt = (x, z) => {
    if (!T) return 0; const fx = (x - T.x0) / T.dx, fz = (z - T.z0) / T.dz;
    const i = clamp(Math.floor(fx), 0, T.nx - 2), j = clamp(Math.floor(fz), 0, T.nz - 2), u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1), h = T.h, n = T.nx;
    return h[j * n + i] * (1 - u) * (1 - v) + h[j * n + i + 1] * u * (1 - v) + h[(j + 1) * n + i] * (1 - u) * v + h[(j + 1) * n + i + 1] * u * v;
  };

  /* ── the river ── */
  let water = null;
  if (spec.water?.length > 1) {
    const S = spec.water, n = S.length; const P = new Float32Array(n * 2 * 3), V = new Float32Array(n * 2 * 2); let s = 0;
    for (let k = 0; k < n; k++) {
      const [x, z, y, hw] = S[k]; const a = S[Math.max(0, k - 1)], b = S[Math.min(n - 1, k + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      if (k) s += Math.hypot(x - S[k - 1][0], z - S[k - 1][1]);
      const w = hw + 4;
      P.set([x - tz * w, y, z + tx * w, x + tz * w, y, z - tx * w], k * 6); V.set([0, s / 150, 1, s / 150], k * 4);
    }
    const I = []; for (let k = 0; k < n - 1; k++) { const a = k * 2, b = a + 1, c = a + 2, d = a + 3; I.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(V, 2)); g.setIndex(I);
    /* a river falls half a metre in a hundred: shade it as level, or each 20 m step shows as a facet */
    const up = new Float32Array(P.length); for (let k = 1; k < up.length; k += 3) up[k] = 1; g.setAttribute('normal', new THREE.BufferAttribute(up, 3));
    const nm = waterNormals(); nm.repeat.set(1, 1);
    const edge = canvasTex(64, 4, (c, w, hh) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#000'); gr.addColorStop(0.16, '#fff'); gr.addColorStop(0.84, '#fff'); gr.addColorStop(1, '#000'); c.fillStyle = gr; c.fillRect(0, 0, w, hh); }, { srgb: false });
    water = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: pal.water, roughness: 0.16, metalness: 0.05, normalMap: nm, normalScale: new THREE.Vector2(0.32, 0.32), transparent: true, opacity: 0.94, alphaMap: edge, depthWrite: false }));
    water.receiveShadow = true; water.renderOrder = 2; geo.add(water); landBits.push(water);
  }

  /* ── tunnels: a ghost of the whole length, solid bands where done ── */
  const tubes = new Map();
  for (const t of spec.tubes || []) {
    const pts = t.pts.map((p) => new THREE.Vector3(...p));
    const gg = tubeGeo(pts, t.r); if (!gg) continue;
    const ghost = new THREE.Mesh(gg, grows(ghostMat(t.ghost || t.color), t.r, 1));
    ghost.renderOrder = 10; geo.add(ghost); reg(t.id, ghost); regPts(t.id, pts);
    const gx = twin(ghost, grows(xrayMat(t.ghost || t.color, 0.3), t.r, 1), t.id);
    const T2 = { id: t.id, pts, r: t.r, color: t.color, ghost, gx, solid: null, sx: null };
    tubes.set(t.id + '#' + tubes.size, T2);
    tubePick.push({ id: t.id, pts, r: t.r });
    setBandsOne(T2, t.bands || []);
  }
  function setBandsOne(T2, bands) {
    for (const m of [T2.solid, T2.sx]) if (m) { m.parent?.remove(m); const k = xray.indexOf(m); if (k >= 0) xray.splice(k, 1); }
    T2.solid?.geometry.dispose(); T2.solid = T2.sx = null;
    const parts = [];
    for (const b of bands) {
      if (b.b - b.a < 0.0005) continue;
      const g = tubeGeo(cut(T2.pts, b.a, b.b), T2.r * 1.06); if (!g) continue;
      const c = new THREE.Color(b.color || T2.color); if (b.glow) c.offsetHSL(0, 0.05, 0.08);
      parts.push(paint(g, c));
    }
    const mg = merge(parts); if (!mg) return;
    T2.solid = new THREE.Mesh(mg, grows(solidMat(0xffffff, { vertexColors: true }), T2.r * 1.06, 1.06));
    T2.solid.renderOrder = 11; geo.add(T2.solid); T2.solid.userData.id = T2.id;
    T2.sx = twin(T2.solid, grows(xrayMat(0xffffff, 0.9, true), T2.r * 1.06, 1.06), T2.id);
    T2.sx.visible = groundMode === 'xray';
    if (built) paintPick();
  }
  function setBands(id, bands) { for (const T2 of tubes.values()) if (T2.id === id) setBandsOne(T2, bands); }

  /* ── caverns, shafts: a ghost, and a solid part filled from the bottom ── */
  const plane = (y) => new THREE.Plane(new THREE.Vector3(0, -1, 0), y);
  function solid(id, geom, at, rot, H, color, fill, { grow = null, surface = false } = {}) {
    /* a structure that stands in the open is concrete, not a ghost; its paid share still shows in colour */
    const ghost = new THREE.Mesh(geom, surface ? solidMat(pal.dark ? 0x9a9a92 : 0xc9c4b6, { roughness: 0.85 }) : grow ? grows(ghostMat(color), grow, 1, true) : ghostMat(color));
    ghost.position.set(...at); ghost.rotation.y = rot; ghost.renderOrder = 10; geo.add(ghost); reg(id, ghost); meshPick.push(ghost);
    if (surface) { ghost.castShadow = ghost.receiveShadow = true; } else twin(ghost, grow ? grows(xrayMat(color, 0.14), grow, 1, true) : xrayMat(color, 0.14), id);
    const cp = plane(at[1]);
    const body = new THREE.Mesh(geom, grow ? grows(solidMat(color, { clippingPlanes: [cp] }), grow, 1.04, true) : solidMat(color, { clippingPlanes: [cp] }));
    body.position.set(...at); body.rotation.y = rot; body.renderOrder = 11; geo.add(body); body.userData.id = id; if (surface) body.scale.set(1.012, 1, 1.012);
    const bx = twin(body, grow ? grows(xrayMat(color, 0.72), grow, 1.04, true) : xrayMat(color, 0.72), id); bx.material.clippingPlanes = [cp];
    const F = { body, bx, y0: at[1], H, plane: cp, f: 0 };
    fills.set(id, [...(fills.get(id) || []), F]); setF(F, fill || 0);
  }
  function setF(F, f) { F.f = clamp(f, 0, 1); F.body.visible = F.f > 0.001; F.bx.visible = F.body.visible && groundMode === 'xray'; placePlane(F); }
  function placePlane(F) { const s = geo.scale.y || 1; F.plane.constant = geo.position.y + s * (F.y0 + F.H * F.f + 0.01); }
  function setFill(id, f) { for (const F of fills.get(id) || []) setF(F, f); }
  /* an arched room: walls, then a segmental vault. Local x = width, y = up, z = length */
  function roomGeo(L, W, H) {
    const rise = Math.min(W * 0.3, H * 0.45), wall = H - rise, Rr = (W * W / 4 + rise * rise) / (2 * rise), cy = wall + rise - Rr, a0 = Math.atan2(wall - cy, W / 2);
    const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, wall); s.absarc(0, cy, Rr, a0, Math.PI - a0, false); s.lineTo(-W / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -L / 2); g.deleteAttribute('uv');
    return g;
  }
  for (const r of spec.rooms || []) solid(r.id, r.arch === false ? box(r.W, r.H, r.L) : roomGeo(r.L, r.W, r.H), r.c, Math.PI - (r.az || 0) * d2r, r.H, r.color, r.fill, { surface: r.surface });
  for (const s of spec.shafts || []) { const g = new THREE.CylinderGeometry(s.r, s.r, s.h, 28); g.translate(0, s.h / 2, 0); g.deleteAttribute('uv'); solid(s.id, g, s.c, 0, s.h, s.color, s.fill, { grow: s.r }); tubePick.push({ id: s.id, pts: [new THREE.Vector3(...s.c), new THREE.Vector3(s.c[0], s.c[1] + s.h, s.c[2])], r: s.r }); }

  /* ── on the surface: portals, buildings, yards, houses, bridges, pylons ── */
  const concrete = pal.dark ? 0x9a9a92 : 0xc9c4b6;
  const surf = (g, color, id, o = {}) => { const m = new THREE.Mesh(g, solidMat(color, o)); m.castShadow = true; m.receiveShadow = true; geo.add(m); if (id) { reg(id, m); meshPick.push(m); } return m; };
  for (const p of spec.portals || []) {
    const w = p.w || 7, hh = p.h || 7.5; const grp = [];
    grp.push(box(w + 7, hh + 5, 1.6, 0, 0, 0.8), box(w + 9, 0.6, 9, 0, 0, 5.4));
    const arch = new THREE.Shape(); arch.moveTo(-w / 2, 0); arch.lineTo(w / 2, 0); arch.lineTo(w / 2, hh - w / 2); arch.absarc(0, hh - w / 2, w / 2, 0, Math.PI, false); arch.lineTo(-w / 2, 0);
    const hole = new THREE.Mesh(new THREE.ShapeGeometry(arch, 10), new THREE.MeshBasicMaterial({ color: pal.dark ? 0x05070a : 0x16130f }));
    const m = surf(merge(grp), concrete, p.id);
    m.position.set(...p.at); m.rotation.y = Math.PI - (p.az || 0) * d2r;
    hole.position.set(0, 0.05, 1.65); m.add(hole);
  }
  for (const b of spec.buildings || []) {
    const H = b.H || 8, parts = [box(b.W, H, b.L)];
    const roof = b.roof === 'gable' ? (() => { const s = new THREE.Shape(); s.moveTo(-b.W / 2 - 0.6, 0); s.lineTo(b.W / 2 + 0.6, 0); s.lineTo(0, b.W * 0.22); s.lineTo(-b.W / 2 - 0.6, 0); const g = new THREE.ExtrudeGeometry(s, { depth: b.L + 1.2, bevelEnabled: false }); g.translate(0, H, -(b.L + 1.2) / 2); g.deleteAttribute('uv'); return g; })() : box(b.W + 0.8, 0.8, b.L + 0.8, 0, H, 0);
    const walls = surf(merge(parts), b.color || (pal.dark ? 0xb8b0a0 : 0xe2dccd), b.id);
    walls.position.set(...b.c); walls.rotation.y = Math.PI - (b.az || 0) * d2r;
    const rm = new THREE.Mesh(roof, solidMat(b.roofColor || 0x6f7c80)); rm.castShadow = true; walls.add(rm);
  }
  for (const y of spec.yards || []) {
    const parts = [box(y.W, 0.5, y.L)];
    for (let k = -1; k <= 1; k++) { const z = k * y.L * 0.32; parts.push(box(0.5, 13, 0.5, -y.W * 0.42, 0, z), box(0.5, 13, 0.5, y.W * 0.42, 0, z), box(y.W * 0.9, 0.6, 0.5, 0, 12.4, z)); }
    for (let k = 0; k < 3; k++) parts.push(box(3.2, 3.6, 4.4, (k - 1) * y.W * 0.28, 0.5, y.L * 0.16));
    const m = surf(merge(parts), concrete, y.id); m.position.set(...y.c); m.rotation.y = Math.PI - (y.az || 0) * d2r;
  }
  const inst = (geom, list, place, colors) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geom, solidMat(0xffffff, { roughness: 0.8 }), list.length);
    const o = new THREE.Object3D(); const col = new THREE.Color();
    list.forEach((it, k) => { place(o, it, k); o.updateMatrix(); m.setMatrixAt(k, o.matrix); if (colors) m.setColorAt(k, col.set(colors(k))); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = true; m.receiveShadow = true; geo.add(m); landBits.push(m); return m;
  };
  if (spec.houses?.length) {
    const wallsG = box(1, 1, 1); const roofG = (() => { const s = new THREE.Shape(); s.moveTo(-0.58, 0); s.lineTo(0.58, 0); s.lineTo(0, 0.42); s.lineTo(-0.58, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 1.08, bevelEnabled: false }); g.translate(0, 0, -0.54); g.deleteAttribute('uv'); return g; })();
    const WALL = pal.dark ? ['#a89c86', '#b9ae98', '#8f8574'] : ['#e8dfcc', '#d9c7a4', '#cdb38c', '#efe9dc'];
    const ROOF = ['#5d7f97', '#a5543e', '#7b8486', '#4f6f5d', '#9a8f7c'];
    const H = spec.houses;
    inst(wallsG, H, (o, [x, z, y, L, W, az], k) => { const hh = 4.5 + rnd(k) * 2.5; o.position.set(x, y - 0.5, z); o.rotation.set(0, Math.PI - az * d2r, 0); o.scale.set(Math.max(4, W), hh, Math.max(5, L)); }, (k) => WALL[Math.floor(rnd(k + 11) * WALL.length)]);
    inst(roofG, H, (o, [x, z, y, L, W, az], k) => { const hh = 4.5 + rnd(k) * 2.5; o.position.set(x, y - 0.5 + hh, z); o.rotation.set(0, Math.PI - az * d2r, 0); o.scale.set(Math.max(4, W), Math.max(4, W), Math.max(5, L)); }, (k) => ROOF[Math.floor(rnd(k + 37) * ROOF.length)]);
  }
  if (spec.bridges?.length) inst(box(1, 1, 1), spec.bridges, (o, [x, z, y, L, W, az]) => { o.position.set(x, y - 1.2, z); o.rotation.set(0, Math.PI - az * d2r, 0); o.scale.set(W, 1.4, L); }, () => (pal.dark ? '#8e8c84' : '#b9b3a4'));
  if (spec.pylons?.towers?.length) {
    const Hp = spec.pylons.h || 40, tw = spec.pylons.towers, lines = spec.pylons.lines || [];
    const parts = []; const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [a, b] of legs) parts.push(beam([a * 3.4, 0, b * 3.4], [a * 0.9, Hp * 0.8, b * 0.9], 0.35));
    for (const f of [0.18, 0.38, 0.58]) { const y = Hp * f; const s1 = 3.4 + (0.9 - 3.4) * (y / (Hp * 0.8)); for (let k = 0; k < 4; k++) { const [a1, b1] = legs[k], [a2, b2] = legs[(k + 1) % 4]; parts.push(beam([a1 * s1, y, b1 * s1], [a2 * s1, y, b2 * s1], 0.22)); } }
    parts.push(beam([0, Hp * 0.8, 0], [0, Hp, 0], 0.4));
    const arms = [[Hp * 0.66, 6.2], [Hp * 0.8, 5.0]];
    for (const [y, a] of arms) parts.push(beam([-a, y, 0], [a, y, 0], 0.3), beam([-a, y, 0], [0, y + 2.2, 0], 0.18), beam([a, y, 0], [0, y + 2.2, 0], 0.18));
    const tg = merge(parts);
    const dirOf = (k) => { const L = lines.find((l) => l.includes(k)); if (!L) return [1, 0]; const i = L.indexOf(k); const a = tw[L[Math.max(0, i - 1)]], b = tw[L[Math.min(L.length - 1, i + 1)]]; const dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    const rotOf = (k) => { const [dx, dz] = dirOf(k); const px = -dz, pz = dx; return Math.atan2(-pz, px); };
    inst(tg, tw, (o, [x, z, y], k) => { o.position.set(x, y - 0.5, z); o.rotation.set(0, rotOf(k), 0); o.scale.setScalar(1); }, () => (pal.dark ? '#9aa4a8' : '#6d7376'));
    /* the wires: four conductors and an earth wire, sagging between towers */
    const attach = [[-6.2, Hp * 0.66], [6.2, Hp * 0.66], [-5, Hp * 0.8], [5, Hp * 0.8], [0, Hp]];
    const at = (k, [ax, ay]) => { const [x, z, y] = tw[k]; const r = rotOf(k); return [x + Math.cos(r) * ax, y - 0.5 + ay, z - Math.sin(r) * ax]; };
    const segs = [];
    for (const L of lines) for (let i = 1; i < L.length; i++) for (const a of attach) {
      const A = at(L[i - 1], a), B = at(L[i], a); const span = Math.hypot(B[0] - A[0], B[2] - A[2]); const sag = Math.max(2, span * 0.035);
      let prev = A; for (let s = 1; s <= 16; s++) { const t = s / 16; const p = [lerp(A[0], B[0], t), lerp(A[1], B[1], t) - 4 * sag * t * (1 - t), lerp(A[2], B[2], t)]; segs.push(...prev, ...p); prev = p; }
    }
    if (segs.length) { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3)); const wires = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: pal.dark ? 0x7d898d : 0x2f3436, transparent: true, opacity: pal.dark ? 0.32 : 0.5 })); geo.add(wires); landBits.push(wires); }
  }

  /* ── markers: little upright pins ── */
  for (const p of spec.pins || []) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(p.r || 14, p.h || 46, 4), solidMat(p.color));
    m.position.set(p.at[0], p.at[1] + (p.h || 46) / 2, p.at[2]); m.rotation.y = Math.PI / 4; m.castShadow = true;
    geo.add(m); if (p.id) { reg(p.id, m); meshPick.push(m); }
  }

  /* centres for labels and focus */
  for (const [, o] of byId) {
    const b = new THREE.Box3();
    o.meshes.forEach((m) => { m.geometry.computeBoundingBox(); m.updateMatrix(); b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix)); });
    o.pts.forEach((p) => b.expandByPoint(p));
    o.center = b.getCenter(new THREE.Vector3()); o.size = b.getSize(new THREE.Vector3()).length();
  }

  /* ── towers: the same parts, as money ── */
  function buildTowers(list) {
    for (const m of [...towers.children]) { towers.remove(m); m.geometry?.dispose(); m.material?.dispose?.(); }
    towerMeshes.length = 0; towerPick.length = 0;
    for (const t of list || []) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(t.w, 1, t.w), ghostMat(t.color)); base.position.set(t.at[0], 0, t.at[1]); base.userData = { id: t.id, h: t.h, kind: 'ghost' };
      const full = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.9, 1, t.w * 0.9), solidMat(t.color)); full.position.set(t.at[0], 0, t.at[1]); full.userData = { id: t.id, h: t.h * clamp(t.fill, 0, 1), kind: 'fill' };
      towers.add(base, full); towerMeshes.push(base, full); towerPick.push(base, full);
      if (!byId.has(t.id)) byId.set(t.id, { meshes: [], pts: [] });
      byId.get(t.id).tower = new THREE.Vector3(t.at[0], t.h / 2, t.at[1]);
    }
    if (built) paintPick();
  }

  /* ── labels ── */
  for (const l of spec.labels || []) {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'w3__label' + (l.kind ? ' w3__label--' + l.kind : '');
    el.innerHTML = `<b></b>${l.sub ? '<i></i>' : ''}`;
    el.querySelector('b').textContent = l.text; if (l.sub) el.querySelector('i').textContent = l.sub;
    el.addEventListener('click', (e) => { e.stopPropagation(); if (l.id) { select(l.id); opts.onPick?.(l.id); } });
    layer.append(el);
    labels.push({ ...l, el, v: new THREE.Vector3(...l.at), mode: l.mode || 'geo' });
  }

  /* ── camera: a hand-made orbit ── */
  const view = { target: C.clone(), r: spec.dist ?? R0 * 1.5, th: spec.theta ?? 0.9, ph: spec.phi ?? 0.95 };
  const goal = { target: C.clone(), r: view.r, th: view.th, ph: view.ph };
  const home = { target: C.clone(), r: view.r, th: view.th, ph: view.ph };
  const minR = spec.minR || 60, maxR = R0 * 4;
  let auto = !still && opts.autoRotate !== false;
  function place() {
    const s = Math.sin(view.ph);
    camera.position.set(view.target.x + view.r * s * Math.sin(view.th), view.target.y + view.r * Math.cos(view.ph), view.target.z + view.r * s * Math.cos(view.th));
    /* never below the ground */
    const g = (T ? heightAt(camera.position.x / geo.scale.x, camera.position.z / geo.scale.z) : -1e9) * geo.scale.y + geo.position.y + 12;
    if (fade > 0.5 && groundMode !== 'off' && camera.position.y < g) camera.position.y = g;
    camera.lookAt(view.target);
  }
  const pointers = new Map(); let drag = null; let moved = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey || pointers.size === 2 }; moved = 0; auto = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); hoverDirty = true;
    if (!drag || !pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag.pinch) goal.r = clamp(goal.r * (drag.pinch / d), minR, maxR);
      drag.pinch = d;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y; moved += Math.abs(dx) + Math.abs(dy);
    if (drag.pan || pointers.size === 2) {
      const k = (goal.r / rect.height) * 1.1;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const fwd = new THREE.Vector3(Math.sin(goal.th), 0, Math.cos(goal.th));
      goal.target.addScaledVector(right, -dx * k).addScaledVector(fwd, -dy * k);
      keepIn(goal.target);
    } else { goal.th -= dx * 0.006; goal.ph = clamp(goal.ph - dy * 0.006, 0.08, 1.5); }
  });
  const keepIn = (v) => { if (!spec.bounds) return; const [a, b, c, d] = spec.bounds; v.x = clamp(v.x, a, b); v.z = clamp(v.z, c, d); if (T && fade > 0.5) v.y = lerp(v.y, heightAt(v.x, v.z) - 40, 0.15); };
  const up = (e) => { pointers.delete(e.pointerId); if (!pointers.size) { if (drag && moved < 6) click(); drag = null; } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); auto = false; goal.r = clamp(goal.r * Math.exp(e.deltaY * 0.0012), minR, maxR); }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
    if (step) { e.preventDefault(); auto = false; goal.th += step[0]; goal.ph = clamp(goal.ph + step[1], 0.08, 1.5); }
    if (e.key === '+' || e.key === '=') goal.r = clamp(goal.r * 0.85, minR, maxR);
    if (e.key === '-') goal.r = clamp(goal.r / 0.85, minR, maxR);
  });

  /* ── picking: meshes by ray, tubes and shafts by their drawn radius ── */
  const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2(9, 9);
  const inv = new THREE.Matrix4(), lray = new THREE.Ray(), onRay = new THREE.Vector3(), onSeg = new THREE.Vector3();
  function groundHit(r) {   // distance along a local ray to the ground, or Infinity
    if (!T || groundMode !== 'solid') return Infinity;
    const p = new THREE.Vector3(); let prevAbove = true;
    for (let t = 0; t < R0 * 8; t += 15) { p.copy(r.origin).addScaledVector(r.direction, t); if (p.x < T.x0 || p.z < T.z0 || p.x > T.x0 + (T.nx - 1) * T.dx || p.z > T.z0 + (T.nz - 1) * T.dz) { if (t > R0 * 3) break; continue; } const above = p.y > heightAt(p.x, p.z); if (!above && prevAbove) return t; prevAbove = above; }
    return Infinity;
  }
  function pick() {
    ray.setFromCamera(mouse, camera);
    if (towers.visible && grow > 0.5) { const hits = ray.intersectObjects(towerPick, false); return hits.length ? hits[0].object.userData.id : null; }
    geo.updateMatrixWorld(); inv.copy(geo.matrixWorld).invert(); lray.copy(ray.ray).applyMatrix4(inv);
    let best = Infinity, id = null;
    const hits = ray.intersectObjects(meshPick.filter((m) => m.visible), false);
    if (hits.length) { best = hits[0].point.clone().applyMatrix4(inv).distanceTo(lray.origin); id = hits[0].object.userData.id; }
    for (const tp of tubePick) {
      const Rr = Math.max(tp.r, U.minR.value) * 1.25 + 1;
      for (let i = 1; i < tp.pts.length; i++) { const d2 = lray.distanceSqToSegment(tp.pts[i - 1], tp.pts[i], onRay, onSeg); if (d2 < Rr * Rr) { const t = onRay.distanceTo(lray.origin); if (t < best) { best = t; id = tp.id; } } }
    }
    if (id && best > groundHit(lray)) return null;
    return id;
  }
  function paintPick() {
    const lit = (m, on, strong) => { const mats = [].concat(m.material); for (const mt of mats) if (mt.emissive) { mt.emissive.set(on ? pal.pick : 0x000000); mt.emissiveIntensity = on ? (strong ? 0.5 : 0.28) : 0; } };
    for (const [id, o] of byId) for (const m of o.meshes) lit(m, id === selected || id === hovered, id === selected);
    for (const T2 of tubes.values()) if (T2.solid) lit(T2.solid, T2.id === selected || T2.id === hovered, T2.id === selected);
    for (const F of [...fills.values()].flat()) lit(F.body, F.body.userData.id === selected || F.body.userData.id === hovered, F.body.userData.id === selected);
    for (const m of xray) m.material.opacity = m.userData.base * (m.userData.id && m.userData.id === selected ? 1.8 : 1);
    for (const m of towerMeshes) lit(m, m.userData.id === selected || m.userData.id === hovered, m.userData.id === selected);
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    for (const l of labels) l.el.classList.toggle('is-on', l.id === selected);
  }
  function click() { const id = pick(); select(id); opts.onPick?.(id); }
  function select(id, { fly = false } = {}) { selected = id; paintPick(); if (fly && id) focus(id); }
  function focus(id) {
    const o = byId.get(id); if (!o) return;
    const p = towers.visible && o.tower ? o.tower : o.center; if (!p) return;
    goal.target.copy(p); goal.r = clamp((o.size || R0 * 0.2) * 2.6, towers.visible ? R0 * 0.25 : 380, R0 * 1.2); auto = false;
  }

  /* ── modes ── */
  function setMode(m) {
    mode = m; auto = false;
    if (m === 'towers') { towers.visible = true; fadeGoal = 0; growGoal = 1; Object.assign(goal, { target: new THREE.Vector3(...(spec.towerCenter || [0, 0, 0])), r: spec.towerRadius || R0, th: 0.55, ph: 1.08 }); }
    else { geo.visible = true; fadeGoal = 1; growGoal = 0; Object.assign(goal, { target: home.target.clone(), r: home.r, th: home.th, ph: home.ph }); }
    if (still) { fade = fadeGoal; grow = growGoal; }
  }
  function setGround(level) {
    groundMode = level;
    if (ground) ground.visible = level !== 'off';
    for (const m of landBits) m.visible = level !== 'off';
    for (const m of xray) m.visible = level === 'xray';
    for (const F of [...fills.values()].flat()) F.bx.visible = F.body.visible && level === 'xray';
    renderer.shadowMap.needsUpdate = true;
  }
  function reset() { Object.assign(goal, { target: (mode === 'towers' ? new THREE.Vector3(...(spec.towerCenter || [0, 0, 0])) : home.target.clone()), r: mode === 'towers' ? (spec.towerRadius || R0) : home.r, th: home.th, ph: home.ph }); }
  let showLabels = true;

  /* ── loop ── */
  const size = () => { const w = wrap.clientWidth || 600, h = wrap.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(size); ro.observe(wrap); size();
  let onScreen = true; const io = new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); }); io.observe(wrap);
  let raf = 0, last = performance.now(), alive = true; let scaleKey = '';
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  renderer.shadowMap.needsUpdate = true;
  function frame(now) {
    if (!alive) return;
    if (!wrap.isConnected) { dispose(); return; }
    raf = requestAnimationFrame(frame);
    if (document.hidden || !onScreen) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (auto) goal.th += dt * 0.04;
    const k = still ? 1 : 1 - Math.pow(0.0009, dt);
    view.target.lerp(goal.target, k); view.r = lerp(view.r, goal.r, k); view.th = lerp(view.th, goal.th, k); view.ph = lerp(view.ph, goal.ph, k);
    /* the fade between the land and the towers */
    fade = still ? fadeGoal : lerp(fade, fadeGoal, 1 - Math.pow(0.02, dt));
    grow = still ? growGoal : lerp(grow, growGoal, 1 - Math.pow(0.05, dt));
    geo.visible = fade > 0.02; geo.scale.setScalar(0.85 + 0.15 * fade); geo.position.y = (1 - fade) * -R0 * 0.15;
    towers.visible = grow > 0.01;
    towerMeshes.forEach((m, i) => { const g = clamp(grow * 1.6 - (i / towerMeshes.length) * 0.6, 0, 1); const h = Math.max(0.01, m.userData.h * ease(g)); m.scale.y = h; m.position.y = h / 2; });
    place();
    /* tubes are drawn at least ~2 px wide */
    const hpx = canvas.clientHeight || 400; const mpp = (2 * view.r * Math.tan((camera.fov * d2r) / 2)) / hpx;
    U.minR.value = mpp * 3;
    for (const F of [...fills.values()].flat()) placePlane(F);
    if (water && !still) water.material.normalMap.offset.y -= dt * 0.12;
    if (hoverDirty && !drag) { hoverDirty = false; const id = pick(); if (id !== hovered) { hovered = id; paintPick(); opts.onHover?.(id); } }
    renderer.render(scene, camera);
    /* compass and scale */
    tmp.copy(view.target).project(camera); tmp2.copy(view.target).add(new THREE.Vector3(0, 0, -100)).project(camera);
    const ang = Math.atan2(tmp2.x - tmp.x, (tmp2.y - tmp.y) * (canvas.clientHeight / (canvas.clientWidth || 1)));
    needle.style.transform = `rotate(${ang}rad)`; needle.hidden = fade < 0.5;
    const want = mpp * 110; const nice = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((v) => v >= want * 0.6) || 5000;
    const key = `${nice}|${(nice / mpp) | 0}`; if (key !== scaleKey) { scaleKey = key; scaleBar.style.width = `${Math.round(nice / mpp)}px`; scaleTxt.textContent = nice >= 1000 ? `${nice / 1000} km` : `${nice} m`; }
    scaleBox.hidden = fade < 0.5; if (creditEl) creditEl.hidden = fade < 0.5;
    /* labels follow their points; hide any that would cover one already placed */
    const rect = { w: canvas.clientWidth, h: canvas.clientHeight };
    const cand = [];
    for (const l of labels) {
      const show = showLabels && (l.mode === 'towers' ? grow > 0.6 : fade > 0.6) && (!l.near || view.r < l.near);
      if (!show) { l.el.hidden = true; continue; }
      tmp.copy(l.v); if (l.mode !== 'towers') tmp.multiplyScalar(geo.scale.x).add(geo.position);
      tmp.project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) { l.el.hidden = true; continue; }
      cand.push({ l, x: ((tmp.x + 1) / 2) * rect.w, y: ((1 - tmp.y) / 2) * rect.h, p: (l.id && l.id === selected ? 0 : 1) + (l.kind === 'small' ? 1 : 0) + (l.kind === 'place' ? 2 : 0), z: tmp.z });
    }
    cand.sort((a, b) => a.p - b.p || a.z - b.z);
    const placed = [];
    for (const c of cand) {
      if (!c.l.w) { c.l.el.hidden = false; c.l.w = c.l.el.offsetWidth || 90; c.l.h = c.l.el.offsetHeight || 30; }
      const r = [c.x - c.l.w / 2 - 3, c.y - c.l.h - 3, c.x + c.l.w / 2 + 3, c.y + 3];
      if (placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) { c.l.el.hidden = true; continue; }
      placed.push(r); c.l.el.hidden = false;
      c.l.el.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%, -100%)`;
    }
  }
  raf = requestAnimationFrame(frame);

  function dispose() {
    alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose?.(); m.normalMap?.dispose?.(); m.alphaMap?.dispose?.(); m.dispose?.(); }); });
    scene.background?.dispose?.(); groundTex?.dispose?.(); landTex.forEach((t) => t.dispose());
    renderer.dispose();
  }

  built = true;
  buildTowers(spec.towers);
  setGround('xray'); paintPick();
  return {
    el: wrap, setMode, setBands, setFill, select: (id, o) => select(id, o), focus, reset, setGround,
    setContours(on) { if (ground && renderer.capabilities.isWebGL2) ground.userData.CU.on.value = on ? 1 : 0; },
    setLabels(on) { showLabels = on; }, setTowers(list) { buildTowers(list); }, get mode() { return mode; }, dispose,
  };
}
