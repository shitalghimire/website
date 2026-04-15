// ===== LOADER =====
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 2000);
});

// ===== NAV SCROLL =====
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== MOBILE MENU =====
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');
const closeMenu = document.getElementById('closeMenu');

navToggle.addEventListener('click', () => mobileMenu.classList.add('open'));
closeMenu.addEventListener('click', () => mobileMenu.classList.remove('open'));

document.querySelectorAll('.mob-link').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ===== HERO CANVAS =====
const canvas = document.getElementById('heroCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const particles = [];
for (let i = 0; i < 60; i++) {
  particles.push({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.0002,
    vy: (Math.random() - 0.5) * 0.0002,
    alpha: Math.random() * 0.5 + 0.1
  });
}

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Gradient bg
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#0d0f14');
  grad.addColorStop(0.5, '#131720');
  grad.addColorStop(1, '#0d1520');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(200,169,110,0.04)';
  ctx.lineWidth = 1;
  const gridSize = 80;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Particles
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = 1;
    if (p.x > 1) p.x = 0;
    if (p.y < 0) p.y = 1;
    if (p.y > 1) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,169,110,${p.alpha})`;
    ctx.fill();
  });

  // Connection lines
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = (particles[i].x - particles[j].x) * canvas.width;
      const dy = (particles[i].y - particles[j].y) * canvas.height;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x * canvas.width, particles[i].y * canvas.height);
        ctx.lineTo(particles[j].x * canvas.width, particles[j].y * canvas.height);
        ctx.strokeStyle = `rgba(200,169,110,${0.06 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(drawCanvas);
}
drawCanvas();

// ===== SCROLL REVEAL =====
const revealEls = document.querySelectorAll('.skill-card, .project-card, .edu-card, .tl-card, .about-card-inner');
revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const delay = entry.target.getAttribute('data-delay') || 0;
      setTimeout(() => entry.target.classList.add('visible'), parseInt(delay));
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

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
      const ratio = 1 + 1.5 + 3; // M20 ratio (1:1.5:3)
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
    `<label>${inp.label}</label>
     <input type="number" id="cinput_${inp.id}" placeholder="${inp.placeholder}" step="any"/>`
  ).join('');
  document.getElementById('calcResult').classList.remove('show');
  document.getElementById('calcResult').textContent = '';
}

document.getElementById('calcType').addEventListener('change', renderCalcInputs);
renderCalcInputs();

function calculate() {
  const type = document.getElementById('calcType').value;
  const def = calcDefs[type];
  const values = {};
  for (const inp of def.inputs) {
    const val = parseFloat(document.getElementById('cinput_' + inp.id).value);
    if (isNaN(val) || val <= 0) {
      alert('Please fill in all fields with valid positive numbers.');
      return;
    }
    values[inp.id] = val;
  }
  const result = def.compute(values);
  const el = document.getElementById('calcResult');
  el.style.whiteSpace = 'pre-line';
  el.textContent = result;
  el.classList.add('show');
}

// ===== UNIT CONVERTER =====
const convData = {
  length: {
    units: ['mm','cm','m','km','in','ft','yd','mi'],
    toBase: { mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344 }
  },
  area: {
    units: ['mm²','cm²','m²','km²','ft²','ac','ha'],
    toBase: { 'mm²':0.000001,'cm²':0.0001,'m²':1,'km²':1e6,'ft²':0.0929,'ac':4046.86,'ha':10000 }
  },
  volume: {
    units: ['ml','L','m³','ft³','gal','yd³'],
    toBase: { ml:0.001, L:1, 'm³':1000, 'ft³':28.3168, gal:3.78541, 'yd³':764.555 }
  },
  force: {
    units: ['N','kN','MN','kgf','lbf','tf'],
    toBase: { N:1, kN:1000, MN:1e6, kgf:9.80665, lbf:4.44822, tf:9806.65 }
  },
  pressure: {
    units: ['Pa','kPa','MPa','bar','atm','psi','kgf/cm²'],
    toBase: { Pa:1, kPa:1000, MPa:1e6, bar:1e5, atm:101325, psi:6894.76, 'kgf/cm²':98066.5 }
  }
};

function updateConvUnits() {
  const cat = document.getElementById('convCategory').value;
  const units = convData[cat].units;
  const fromSel = document.getElementById('convFrom');
  const toSel = document.getElementById('convTo');
  fromSel.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
  toSel.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
  toSel.selectedIndex = 1;
  convertUnit();
}

function convertUnit() {
  const cat = document.getElementById('convCategory').value;
  const from = document.getElementById('convFrom').value;
  const to = document.getElementById('convTo').value;
  const val = parseFloat(document.getElementById('convValue').value);
  if (isNaN(val)) { document.getElementById('convResult').textContent = '—'; return; }
  const base = val * convData[cat].toBase[from];
  const result = base / convData[cat].toBase[to];
  document.getElementById('convResult').textContent = `${result.toPrecision(6)} ${to}`;
}

updateConvUnits();

// ===== CALENDAR =====
let calDate = new Date();
let calNotes = JSON.parse(localStorage.getItem('calNotes') || '{}');
let selectedDate = null;

function renderCalendar() {
  const grid = document.getElementById('calGrid');
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  document.getElementById('calMonthYear').textContent =
    new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  let html = days.map(d => `<div class="cal-day-name">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month + 1}-${d}`;
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isSelected = selectedDate === key;
    const hasNote = !!calNotes[key];
    const cls = ['cal-day', isToday ? 'today' : '', isSelected ? 'selected' : '', hasNote ? 'has-note' : ''].filter(Boolean).join(' ');
    html += `<div class="${cls}" onclick="selectDay('${key}', ${d})">${d}</div>`;
  }
  grid.innerHTML = html;
}

function selectDay(key, d) {
  selectedDate = key;
  document.getElementById('selectedDateLabel').textContent = key;
  document.getElementById('calNote').value = calNotes[key] || '';
  renderCalendar();
}

function saveNote() {
  if (!selectedDate) return;
  const note = document.getElementById('calNote').value;
  if (note.trim()) calNotes[selectedDate] = note;
  else delete calNotes[selectedDate];
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
let gameRound = 0;
let gameTimes = [];
let gameWaiting = false;
let gameTimeout = null;
const TOTAL_ROUNDS = 5;

function startGame() {
  gameRound = 0;
  gameTimes = [];
  document.getElementById('gameBest').textContent = '—';
  document.getElementById('gameAvg').textContent = '—';
  document.getElementById('gameLast').textContent = '—';
  document.getElementById('gameRound').textContent = '0/' + TOTAL_ROUNDS;
  document.getElementById('gameStartBtn').disabled = true;
  nextRound();
}

function nextRound() {
  const target = document.getElementById('gameTarget');
  const msg = document.getElementById('gameMsg');
  target.style.display = 'none';
  msg.textContent = 'Get ready...';
  gameWaiting = false;

  const delay = 1000 + Math.random() * 2500;
  gameTimeout = setTimeout(() => {
    const area = document.getElementById('gameArea');
    const maxX = area.offsetWidth - 70;
    const maxY = area.offsetHeight - 70;
    target.style.left = Math.floor(Math.random() * maxX) + 'px';
    target.style.top = Math.floor(Math.random() * maxY) + 'px';
    target.style.display = 'block';
    msg.textContent = '';
    gameWaiting = true;
    target._startTime = performance.now();
  }, delay);
}

document.getElementById('gameTarget').addEventListener('click', function () {
  if (!gameWaiting) return;
  const elapsed = performance.now() - this._startTime;
  gameWaiting = false;
  gameTimes.push(elapsed);
  gameRound++;

  document.getElementById('gameLast').textContent = Math.round(elapsed) + ' ms';
  document.getElementById('gameRound').textContent = gameRound + '/' + TOTAL_ROUNDS;
  const best = Math.min(...gameTimes);
  document.getElementById('gameBest').textContent = Math.round(best) + ' ms';

  if (gameRound >= TOTAL_ROUNDS) {
    const avg = gameTimes.reduce((a, b) => a + b, 0) / gameTimes.length;
    document.getElementById('gameAvg').textContent = Math.round(avg) + ' ms';
    this.style.display = 'none';
    document.getElementById('gameMsg').textContent = `Done! Avg: ${Math.round(avg)} ms 🎉`;
    document.getElementById('gameStartBtn').disabled = false;
    document.getElementById('gameStartBtn').textContent = 'Play Again';
  } else {
    nextRound();
  }
});

// ===== CONTACT FORM =====
function submitForm(e) {
  e.preventDefault();
  const msg = document.getElementById('formMsg');
  msg.textContent = '✓ Message sent! I\'ll get back to you soon.';
  e.target.reset();
  setTimeout(() => msg.textContent = '', 4000);
}

// ===== ACTIVE NAV HIGHLIGHT =====
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 200) current = sec.getAttribute('id');
  });
  navLinks.forEach(link => {
    link.style.color = link.getAttribute('href') === '#' + current ? 'var(--accent)' : '';
  });
});
