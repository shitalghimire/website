// ===== LOADER =====
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 1800);
});

// ===== NAV SCROLL =====
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
  highlightNav();
});

// ===== MOBILE MENU =====
document.getElementById('navToggle').addEventListener('click', () =>
  document.getElementById('mobileMenu').classList.add('open'));
document.getElementById('closeMenu').addEventListener('click', () =>
  document.getElementById('mobileMenu').classList.remove('open'));
document.querySelectorAll('.mob-link').forEach(l =>
  l.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open')));

// ===== HERO CANVAS =====
const canvas = document.getElementById('heroCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const particles = Array.from({ length: 70 }, () => ({
  x: Math.random(), y: Math.random(),
  r: Math.random() * 1.8 + 0.3,
  vx: (Math.random() - 0.5) * 0.00015,
  vy: (Math.random() - 0.5) * 0.00015,
  alpha: Math.random() * 0.4 + 0.08
}));

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, '#0a0b0f');
  g.addColorStop(0.5, '#0f1118');
  g.addColorStop(1, '#0a0e1a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(200,169,110,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 90) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 90) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
    if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,169,110,${p.alpha})`;
    ctx.fill();
  });

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = (particles[i].x - particles[j].x) * canvas.width;
      const dy = (particles[i].y - particles[j].y) * canvas.height;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x * canvas.width, particles[i].y * canvas.height);
        ctx.lineTo(particles[j].x * canvas.width, particles[j].y * canvas.height);
        ctx.strokeStyle = `rgba(200,169,110,${0.05 * (1 - dist / 130)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(drawCanvas);
}
drawCanvas();

// ===== DRAGGABLE PHOTO =====
const photoWrap = document.getElementById('photoWrap');
if (photoWrap) {
  let dragging = false, startX, startY, origX, origY;
  photoWrap.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = photoWrap.getBoundingClientRect();
    origX = rect.left; origY = rect.top;
    photoWrap.style.position = 'fixed';
    photoWrap.style.left = origX + 'px'; photoWrap.style.top = origY + 'px';
    photoWrap.style.right = 'auto'; photoWrap.style.transform = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    photoWrap.style.left = (origX + dx) + 'px';
    photoWrap.style.top = (origY + dy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  // Touch support
  photoWrap.addEventListener('touchstart', e => {
    const t = e.touches[0];
    dragging = true;
    startX = t.clientX; startY = t.clientY;
    const rect = photoWrap.getBoundingClientRect();
    origX = rect.left; origY = rect.top;
    photoWrap.style.position = 'fixed';
    photoWrap.style.left = origX + 'px'; photoWrap.style.top = origY + 'px';
    photoWrap.style.right = 'auto'; photoWrap.style.transform = 'none';
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - startX, dy = t.clientY - startY;
    photoWrap.style.left = (origX + dx) + 'px';
    photoWrap.style.top = (origY + dy) + 'px';
  }, { passive: true });
  document.addEventListener('touchend', () => { dragging = false; });
}

// ===== SCROLL REVEAL =====
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.getAttribute('data-delay') || 0);
      setTimeout(() => entry.target.classList.add('visible'), delay);
    }
  });
}, { threshold: 0.1 });
revealEls.forEach(el => observer.observe(el));

// ===== TABS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'calendar') renderCalendar();
    if (tab === 'converter') updateConvUnits();
    if (tab === 'calculator') renderCalcInputs();
  });
});

// ===== CIVIL ENGINEERING CALCULATOR =====
const calcDefs = {
  concrete: {
    label: 'Concrete Mix Volume',
    inputs: [
      { id: 'len', label: 'Length (m)', placeholder: 'e.g. 5' },
      { id: 'wid', label: 'Width (m)', placeholder: 'e.g. 3' },
      { id: 'dep', label: 'Depth / Thickness (m)', placeholder: 'e.g. 0.15' },
    ],
    compute(v) {
      const vol = v.len * v.wid * v.dep;
      const dryVol = vol * 1.54;
      const ratio = 1 + 1.5 + 3;
      const cement = (dryVol / ratio) * 1440;
      const sand = (dryVol * 1.5 / ratio) * 1600;
      const agg = (dryVol * 3 / ratio) * 1500;
      return `Volume: ${vol.toFixed(3)} m³\nDry Volume: ${dryVol.toFixed(3)} m³\nCement (M20): ${cement.toFixed(1)} kg\nSand: ${sand.toFixed(1)} kg\nAggregate: ${agg.toFixed(1)} kg`;
    }
  },
  beam: {
    label: 'Simple Beam Bending Stress',
    inputs: [
      { id: 'M', label: 'Bending Moment M (kN·m)', placeholder: 'e.g. 50' },
      { id: 'I', label: 'Moment of Inertia I (m⁴)', placeholder: 'e.g. 0.001' },
      { id: 'y', label: 'Distance from NA y (m)', placeholder: 'e.g. 0.15' },
    ],
    compute(v) {
      const sigma = (v.M * 1000 * v.y) / v.I;
      return `Bending Stress σ = M·y / I\nσ = ${sigma.toFixed(2)} kPa\nσ = ${(sigma / 1000).toFixed(4)} MPa`;
    }
  },
  unit_weight: {
    label: 'Unit Weight of Concrete',
    inputs: [
      { id: 'mass', label: 'Mass (kg)', placeholder: 'e.g. 2400' },
      { id: 'vol', label: 'Volume (m³)', placeholder: 'e.g. 1' },
    ],
    compute(v) {
      const uw = v.mass / v.vol;
      return `Unit Weight γ = ${uw.toFixed(2)} kg/m³\n= ${(uw / 1000).toFixed(4)} t/m³\n(Normal concrete ≈ 2400 kg/m³)`;
    }
  },
  discharge: {
    label: 'Discharge Q = A × V',
    inputs: [
      { id: 'area', label: 'Cross-sectional Area A (m²)', placeholder: 'e.g. 2.5' },
      { id: 'vel', label: 'Flow Velocity V (m/s)', placeholder: 'e.g. 1.5' },
    ],
    compute(v) {
      const Q = v.area * v.vel;
      return `Discharge Q = A × V\nQ = ${v.area} × ${v.vel}\nQ = ${Q.toFixed(4)} m³/s\n= ${(Q * 1000).toFixed(2)} L/s`;
    }
  }
};

function renderCalcInputs() {
  const type = document.getElementById('calcType').value;
  const def = calcDefs[type];
  const container = document.getElementById('calcInputs');
  container.innerHTML = def.inputs.map(inp =>
    `<div><label>${inp.label}</label><input type="number" id="cinput_${inp.id}" placeholder="${inp.placeholder}" step="any"/></div>`
  ).join('');
  const res = document.getElementById('calcResult');
  res.classList.remove('show');
  res.textContent = '';
}
document.getElementById('calcType').addEventListener('change', renderCalcInputs);
renderCalcInputs();

function calculate() {
  const type = document.getElementById('calcType').value;
  const def = calcDefs[type];
  const values = {};
  for (const inp of def.inputs) {
    const val = parseFloat(document.getElementById('cinput_' + inp.id).value);
    if (isNaN(val) || val <= 0) { alert('Please fill in all fields with valid positive numbers.'); return; }
    values[inp.id] = val;
  }
  const el = document.getElementById('calcResult');
  el.style.whiteSpace = 'pre-line';
  el.textContent = def.compute(values);
  el.classList.add('show');
}

// ===== UNIT CONVERTER =====
const convData = {
  length: { units: ['mm','cm','m','km','in','ft','yd','mi'], toBase: { mm:0.001,cm:0.01,m:1,km:1000,in:0.0254,ft:0.3048,yd:0.9144,mi:1609.344 } },
  area: { units: ['mm²','cm²','m²','km²','ft²','ac','ha'], toBase: { 'mm²':0.000001,'cm²':0.0001,'m²':1,'km²':1e6,'ft²':0.0929,'ac':4046.86,'ha':10000 } },
  volume: { units: ['ml','L','m³','ft³','gal','yd³'], toBase: { ml:0.001,L:1,'m³':1000,'ft³':28.3168,gal:3.78541,'yd³':764.555 } },
  force: { units: ['N','kN','MN','kgf','lbf','tf'], toBase: { N:1,kN:1000,MN:1e6,kgf:9.80665,lbf:4.44822,tf:9806.65 } },
  pressure: { units: ['Pa','kPa','MPa','bar','atm','psi','kgf/cm²'], toBase: { Pa:1,kPa:1000,MPa:1e6,bar:1e5,atm:101325,psi:6894.76,'kgf/cm²':98066.5 } }
};
function updateConvUnits() {
  const units = convData[document.getElementById('convCategory').value].units;
  const fromSel = document.getElementById('convFrom'), toSel = document.getElementById('convTo');
  fromSel.innerHTML = toSel.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
  toSel.selectedIndex = 1;
  convertUnit();
}
function convertUnit() {
  const cat = document.getElementById('convCategory').value;
  const from = document.getElementById('convFrom').value, to = document.getElementById('convTo').value;
  const val = parseFloat(document.getElementById('convValue').value);
  if (isNaN(val)) { document.getElementById('convResult').textContent = '—'; return; }
  const result = (val * convData[cat].toBase[from]) / convData[cat].toBase[to];
  document.getElementById('convResult').textContent = `${result.toPrecision(6)} ${to}`;
}
updateConvUnits();

// ===== CALENDAR =====
let calDate = new Date(), calNotes = JSON.parse(localStorage.getItem('calNotes') || '{}'), selectedDate = null;
function renderCalendar() {
  const grid = document.getElementById('calGrid');
  const year = calDate.getFullYear(), month = calDate.getMonth();
  document.getElementById('calMonthYear').textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  let html = days.map(d => `<div class="cal-day-name">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month+1}-${d}`;
    const cls = ['cal-day',
      d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear()?'today':'',
      selectedDate===key?'selected':'', calNotes[key]?'has-note':''
    ].filter(Boolean).join(' ');
    html += `<div class="${cls}" onclick="selectDay('${key}')">${d}</div>`;
  }
  grid.innerHTML = html;
}
function selectDay(key) {
  selectedDate = key;
  document.getElementById('selectedDateLabel').textContent = key;
  document.getElementById('calNote').value = calNotes[key] || '';
  renderCalendar();
}
function saveNote() {
  if (!selectedDate) return;
  const note = document.getElementById('calNote').value;
  if (note.trim()) calNotes[selectedDate] = note; else delete calNotes[selectedDate];
  localStorage.setItem('calNotes', JSON.stringify(calNotes));
  renderCalendar();
}
function changeMonth(dir) {
  calDate.setMonth(calDate.getMonth() + dir);
  selectedDate = null;
  document.getElementById('selectedDateLabel').textContent = '—';
  document.getElementById('calNote').value = '';
  renderCalendar();
}

// ===== REACTION GAME =====
let gameRound = 0, gameTimes = [], gameWaiting = false, gameTimeout = null;
const TOTAL_ROUNDS = 5;
function startGame() {
  gameRound = 0; gameTimes = [];
  ['gameBest','gameAvg','gameLast'].forEach(id => document.getElementById(id).textContent = '—');
  document.getElementById('gameRound').textContent = '0/' + TOTAL_ROUNDS;
  document.getElementById('gameStartBtn').disabled = true;
  nextRound();
}
function nextRound() {
  const target = document.getElementById('gameTarget'), msg = document.getElementById('gameMsg');
  target.style.display = 'none'; msg.textContent = 'Get ready...'; gameWaiting = false;
  gameTimeout = setTimeout(() => {
    const area = document.getElementById('gameArea');
    target.style.left = Math.floor(Math.random() * (area.offsetWidth - 70)) + 'px';
    target.style.top = Math.floor(Math.random() * (area.offsetHeight - 70)) + 'px';
    target.style.display = 'block'; msg.textContent = ''; gameWaiting = true;
    target._startTime = performance.now();
  }, 1000 + Math.random() * 2500);
}
document.getElementById('gameTarget').addEventListener('click', function () {
  if (!gameWaiting) return;
  const elapsed = performance.now() - this._startTime;
  gameWaiting = false; gameTimes.push(elapsed); gameRound++;
  document.getElementById('gameLast').textContent = Math.round(elapsed) + ' ms';
  document.getElementById('gameRound').textContent = gameRound + '/' + TOTAL_ROUNDS;
  document.getElementById('gameBest').textContent = Math.round(Math.min(...gameTimes)) + ' ms';
  if (gameRound >= TOTAL_ROUNDS) {
    const avg = gameTimes.reduce((a, b) => a + b, 0) / gameTimes.length;
    document.getElementById('gameAvg').textContent = Math.round(avg) + ' ms';
    this.style.display = 'none';
    document.getElementById('gameMsg').textContent = `Done! Avg: ${Math.round(avg)} ms 🎉`;
    const btn = document.getElementById('gameStartBtn');
    btn.disabled = false; btn.textContent = 'Play Again';
  } else { nextRound(); }
});

// ===== CONTACT FORM =====
function submitForm(e) {
  e.preventDefault();
  const msg = document.getElementById('formMsg');
  msg.textContent = '✓ Message sent! I\'ll get back to you soon.';
  e.target.reset();
  setTimeout(() => msg.textContent = '', 4000);
}

// ===== ACTIVE NAV =====
function highlightNav() {
  const sections = document.querySelectorAll('section');
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 200) current = sec.getAttribute('id');
  });
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.style.color = link.getAttribute('href') === '#' + current ? 'var(--accent)' : '';
  });
}
