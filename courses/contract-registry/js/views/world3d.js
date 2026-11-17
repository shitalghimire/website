/* ═══════════════════════════════════════════════════════════════
   world3d — a small WebGL stage for the Registry.

   Draws what it is given: a ground mesh, tunnels as tubes, shafts,
   caverns as boxes, a river, labels, and a second "towers" scene.
   It knows nothing about any project; the figures arrive sealed and
   are handed in by the page that uses it.

   createWorld(host, spec, opts) → api | null (null = no WebGL)
   ═══════════════════════════════════════════════════════════════ */

/* three.js is loaded on first use, so pages that never show 3D never fetch it */
let THREE = null;
const loadThree = async () => (THREE ??= await import('../vendor/three.module.min.js'));

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - Math.pow(1 - t, 3);

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
  return new THREE.TubeGeometry(path, Math.max(8, Math.min(600, Math.round(len / (r * 1.5)))), r, 14, false);
}

export async function createWorld(host, spec, opts = {}) {
  if (!webglOK()) return null;
  await loadThree();
  if (!host.isConnected) return null;
  const pal = { bg: '#e9e3d1', fog: '#e9e3d1', ink: '#14221c', ghost: '#8d968d', ground: ['#b7ab83', '#efe6c9'], water: '#5b8fa0', pick: '#d7b45c', ...(opts.palette || {}) };
  const still = reduce();

  /* ── stage ── */
  const wrap = document.createElement('div');
  wrap.className = 'w3';
  const canvas = document.createElement('canvas');
  canvas.className = 'w3__canvas';
  canvas.setAttribute('aria-label', opts.label || 'Interactive 3D model');
  canvas.tabIndex = 0;
  const layer = document.createElement('div');
  layer.className = 'w3__labels';
  wrap.append(canvas, layer);
  host.append(wrap);

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch { wrap.remove(); return null; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(pal.bg);
  scene.fog = new THREE.Fog(pal.fog, spec.radius * 3, spec.radius * 8);
  const camera = new THREE.PerspectiveCamera(42, 1, 5, spec.radius * 12);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35); sun.position.set(-0.6, 1, 0.45).multiplyScalar(spec.radius); scene.add(sun);

  const geo = new THREE.Group(); scene.add(geo);
  const towers = new THREE.Group(); towers.visible = false; scene.add(towers);
  const pickable = [];
  const byId = new Map(); // id → { meshes: [], center, size, kind }
  const reg = (id, mesh, kind = 'part') => {
    mesh.userData.id = id;
    if (!byId.has(id)) byId.set(id, { meshes: [], kind });
    byId.get(id).meshes.push(mesh);
    pickable.push(mesh);
  };
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.08, ...o });
  const ghostMat = (color = pal.ghost) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.9 });

  /* ── ground ── */
  let ground = null;
  if (spec.terrain) {
    const t = spec.terrain;
    const g = new THREE.PlaneGeometry((t.nx - 1) * t.dx, (t.nz - 1) * t.dz, t.nx - 1, t.nz - 1);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const lo = new THREE.Color(pal.ground[0]), hi = new THREE.Color(pal.ground[1]), c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const y = t.h[k];
      pos.setY(k, y);
      c.copy(lo).lerp(hi, clamp((y - t.min) / (t.max - t.min), 0, 1));
      cols.set([c.r, c.g, c.b], k * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.translate(t.x0 + ((t.nx - 1) * t.dx) / 2, 0, t.z0 + ((t.nz - 1) * t.dz) / 2);
    g.computeVertexNormals();
    ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.34, depthWrite: false, roughness: 1, side: THREE.DoubleSide }));
    ground.renderOrder = 5;
    geo.add(ground);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color: pal.ink, transparent: true, opacity: 0.05 }));
    wire.renderOrder = 6; geo.add(wire); ground.userData.wire = wire;
  }
  /* ── river ── */
  if (spec.river) {
    const pts = spec.river.pts.map((p) => new THREE.Vector3(...p));
    const g = tubeGeo(pts, spec.river.width / 2);
    if (g) { g.scale(1, 0.12, 1); const m = new THREE.Mesh(g, mat(pal.water, { roughness: 0.25, metalness: 0.2 })); geo.add(m); }
  }

  /* ── tunnels: a ghost of the whole length, solid bands where done ── */
  const tubes = new Map();
  for (const t of spec.tubes || []) {
    const pts = t.pts.map((p) => new THREE.Vector3(...p));
    const ghost = new THREE.Mesh(tubeGeo(pts, t.r), ghostMat(t.ghost || t.color));
    geo.add(ghost); reg(t.id, ghost);
    const grp = new THREE.Group(); geo.add(grp);
    tubes.set(t.id, { pts, r: t.r, color: t.color, grp, ghost });
    setBands(t.id, t.bands || []);
  }
  function setBands(id, bands) {
    const T = tubes.get(id); if (!T) return;
    for (const m of [...T.grp.children]) { T.grp.remove(m); m.geometry.dispose(); }
    for (const b of bands) {
      if (b.b - b.a < 0.0005) continue;
      const g = tubeGeo(cut(T.pts, b.a, b.b), T.r * (b.scale || 1.06));
      if (!g) continue;
      const m = new THREE.Mesh(g, mat(b.color || T.color, b.glow ? { emissive: new THREE.Color(b.color || T.color), emissiveIntensity: 0.35 } : {}));
      m.userData.id = id; T.grp.add(m); pickable.push(m);
    }
  }

  /* ── shafts and caverns: a ghost, and a solid part filled from the bottom ── */
  const fills = new Map();
  function solid(id, kind, c, s, rot, color, fill) {
    const make = (h) => (kind === 'shaft' ? new THREE.CylinderGeometry(s[0], s[0], h, 28) : new THREE.BoxGeometry(s[0], h, s[2]));
    const ghost = new THREE.Mesh(make(s[1]), ghostMat(color));
    ghost.position.set(c[0], c[1] + s[1] / 2, c[2]); ghost.rotation.y = rot || 0;
    geo.add(ghost); reg(id, ghost);
    const body = new THREE.Mesh(make(1), mat(color));
    body.rotation.y = rot || 0; geo.add(body); body.userData.id = id; pickable.push(body);
    const F = { body, c, h: s[1] };
    fills.set(id, [...(fills.get(id) || []), F]); setF(F, fill);
  }
  function setF(F, f) {
    const h = Math.max(0.001, F.h * clamp(f, 0, 1));
    F.body.scale.y = h; F.body.position.set(F.c[0], F.c[1] + h / 2, F.c[2]); F.body.visible = f > 0.001;
  }
  function setFill(id, f) { for (const F of fills.get(id) || []) setF(F, f); }
  for (const b of spec.boxes || []) solid(b.id, 'box', b.c, b.s, b.rot, b.color, b.fill || 0);
  for (const b of spec.shafts || []) solid(b.id, 'shaft', b.c, [b.r, b.h, b.r], 0, b.color, b.fill || 0);

  /* ── markers: little upright pins (portals, buildings) ── */
  for (const p of spec.pins || []) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(p.r || 18, p.h || 60, 4), mat(p.color));
    m.position.set(p.at[0], p.at[1] + (p.h || 60) / 2, p.at[2]); m.rotation.y = Math.PI / 4;
    geo.add(m); if (p.id) reg(p.id, m);
  }

  /* centres for labels and focus */
  for (const [id, o] of byId) {
    const box = new THREE.Box3();
    o.meshes.forEach((m) => box.expandByObject(m));
    o.center = box.getCenter(new THREE.Vector3()); o.size = box.getSize(new THREE.Vector3()).length();
  }

  /* ── towers: the same parts, as money ── */
  const towerMeshes = [];
  function buildTowers(list) {
    for (const m of [...towers.children]) { towers.remove(m); m.geometry?.dispose(); }
    towerMeshes.length = 0;
    for (const t of list || []) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(t.w, 1, t.w), ghostMat(t.color)); base.position.set(t.at[0], 0, t.at[1]); base.userData = { id: t.id, h: t.h, kind: 'ghost' };
      const full = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.9, 1, t.w * 0.9), mat(t.color)); full.position.set(t.at[0], 0, t.at[1]); full.userData = { id: t.id, h: t.h * clamp(t.fill, 0, 1), kind: 'fill' };
      towers.add(base, full); towerMeshes.push(base, full); pickable.push(base, full);
      if (!byId.has(t.id)) byId.set(t.id, { meshes: [], kind: 'tower' });
      byId.get(t.id).tower = new THREE.Vector3(t.at[0], t.h / 2, t.at[1]);
    }
  }
  buildTowers(spec.towers);

  /* ── labels ── */
  const labels = [];
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
  const C = spec.center ? new THREE.Vector3(...spec.center) : new THREE.Vector3();
  const view = { target: C.clone(), r: spec.radius * 1.5, th: spec.theta ?? 0.9, ph: spec.phi ?? 0.95 };
  const goal = { target: C.clone(), r: view.r, th: view.th, ph: view.ph };
  const home = { target: C.clone(), r: view.r, th: view.th, ph: view.ph };
  let auto = !still && opts.autoRotate !== false;
  function place() {
    const s = Math.sin(view.ph);
    camera.position.set(view.target.x + view.r * s * Math.sin(view.th), view.target.y + view.r * Math.cos(view.ph), view.target.z + view.r * s * Math.cos(view.th));
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
      if (drag.pinch) goal.r = clamp(goal.r * (drag.pinch / d), spec.radius * 0.04, spec.radius * 4);
      drag.pinch = d;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y; moved += Math.abs(dx) + Math.abs(dy);
    if (drag.pan || pointers.size === 2) {
      const k = goal.r / rect.height * 1.1;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const fwd = new THREE.Vector3(Math.sin(goal.th), 0, Math.cos(goal.th));
      goal.target.addScaledVector(right, -dx * k).addScaledVector(fwd, -dy * k);
    } else { goal.th -= dx * 0.006; goal.ph = clamp(goal.ph - dy * 0.006, 0.08, 1.52); }
  });
  const up = (e) => { pointers.delete(e.pointerId); if (!pointers.size) { if (drag && moved < 6) click(); drag = null; } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); auto = false; goal.r = clamp(goal.r * Math.exp(e.deltaY * 0.0012), spec.radius * 0.04, spec.radius * 4); }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
    if (step) { e.preventDefault(); auto = false; goal.th += step[0]; goal.ph = clamp(goal.ph + step[1], 0.08, 1.52); }
    if (e.key === '+' || e.key === '=') goal.r *= 0.85;
    if (e.key === '-') goal.r /= 0.85;
  });

  /* ── picking ── */
  const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2(9, 9);
  let hoverDirty = false, hovered = null, selected = null;
  function pick() {
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(pickable.filter((m) => m.visible && (towers.visible ? m.parent === towers : m.parent !== towers)), false);
    return hits.length ? hits[0].object.userData.id : null;
  }
  function paintPick() {
    for (const m of pickable) {
      const on = m.userData.id && (m.userData.id === selected || m.userData.id === hovered);
      if (m.material.emissive) { m.material.emissive.set(on ? pal.pick : 0x000000); m.material.emissiveIntensity = on ? (m.userData.id === selected ? 0.55 : 0.3) : 0; }
    }
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    for (const l of labels) l.el.classList.toggle('is-on', l.id === selected);
  }
  function click() { const id = pick(); select(id); opts.onPick?.(id); }
  function select(id, { fly = false } = {}) {
    selected = id; paintPick();
    if (fly && id) focus(id);
  }
  function focus(id) {
    const o = byId.get(id); if (!o) return;
    const p = towers.visible && o.tower ? o.tower : o.center; if (!p) return;
    goal.target.copy(p); goal.r = clamp((o.size || spec.radius * 0.2) * 2.4, spec.radius * (towers.visible ? 0.25 : 0.3), spec.radius * 1.2); auto = false;
  }

  /* ── modes ── */
  let mode = 'geo', fade = 1, fadeGoal = 1, grow = 0, growGoal = 0;
  function setMode(m) {
    mode = m; auto = false;
    if (m === 'towers') { towers.visible = true; fadeGoal = 0; growGoal = 1; Object.assign(goal, { target: new THREE.Vector3(...(spec.towerCenter || [0, 0, 0])), r: spec.towerRadius || spec.radius, th: 0.55, ph: 1.08 }); }
    else { geo.visible = true; fadeGoal = 1; growGoal = 0; Object.assign(goal, { target: home.target.clone(), r: home.r, th: home.th, ph: home.ph }); }
    if (still) { fade = fadeGoal; grow = growGoal; }
  }
  function setGround(level) { if (!ground) return; ground.visible = level !== 'off'; ground.userData.wire.visible = level !== 'off'; ground.material.opacity = level === 'solid' ? 0.9 : 0.42; ground.material.depthWrite = level === 'solid'; }
  function reset() { Object.assign(goal, { target: (mode === 'towers' ? new THREE.Vector3(...(spec.towerCenter || [0, 0, 0])) : home.target.clone()), r: mode === 'towers' ? (spec.towerRadius || spec.radius) : home.r, th: home.th, ph: home.ph }); }
  let showLabels = true;

  /* ── loop ── */
  const size = () => { const w = wrap.clientWidth || 600, h = wrap.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(size); ro.observe(wrap); size();
  let raf = 0, last = performance.now(), alive = true;
  const tmp = new THREE.Vector3();
  function frame(now) {
    if (!alive) return;
    if (!wrap.isConnected) { dispose(); return; }
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (auto) goal.th += dt * 0.05;
    const k = still ? 1 : 1 - Math.pow(0.0009, dt);
    view.target.lerp(goal.target, k); view.r = lerp(view.r, goal.r, k); view.th = lerp(view.th, goal.th, k); view.ph = lerp(view.ph, goal.ph, k);
    place();
    /* the fade between the land and the towers */
    fade = still ? fadeGoal : lerp(fade, fadeGoal, 1 - Math.pow(0.02, dt));
    grow = still ? growGoal : lerp(grow, growGoal, 1 - Math.pow(0.05, dt));
    geo.visible = fade > 0.02; geo.scale.setScalar(0.85 + 0.15 * fade); geo.position.y = (1 - fade) * -spec.radius * 0.15;
    towers.visible = grow > 0.01;
    towerMeshes.forEach((m, i) => { const g = clamp(grow * 1.6 - (i / towerMeshes.length) * 0.6, 0, 1); const h = Math.max(0.01, m.userData.h * ease(g)); m.scale.y = h; m.position.y = h / 2; });
    if (hoverDirty && !drag) { hoverDirty = false; const id = pick(); if (id !== hovered) { hovered = id; paintPick(); opts.onHover?.(id); } }
    renderer.render(scene, camera);
    /* labels follow their points */
    const rect = { w: canvas.clientWidth, h: canvas.clientHeight };
    /* place labels by priority and hide any that would cover one already placed */
    const cand = [];
    for (const l of labels) {
      const show = showLabels && (l.mode === 'towers' ? grow > 0.6 : fade > 0.6);
      if (!show) { l.el.hidden = true; continue; }
      tmp.copy(l.v); if (l.mode !== 'towers') tmp.multiplyScalar(geo.scale.x).add(geo.position);
      tmp.project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) { l.el.hidden = true; continue; }
      cand.push({ l, x: ((tmp.x + 1) / 2) * rect.w, y: ((1 - tmp.y) / 2) * rect.h, p: (l.id && l.id === selected ? 0 : 1) + (l.kind === 'small' ? 1 : 0), z: tmp.z });
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
    alive = false; cancelAnimationFrame(raf); ro.disconnect();
    scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => m.dispose?.()); });
    renderer.dispose();
  }

  return {
    el: wrap, setMode, setBands, setFill, select: (id, o) => select(id, o), focus, reset, setGround,
    setLabels(on) { showLabels = on; }, setTowers(list) { buildTowers(list); }, get mode() { return mode; }, dispose,
  };
}
