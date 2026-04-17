// ===== SEHACK TYPING ENGINE =====

// Loader
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('t-loader').classList.add('hidden'), 1600);
});

// ===== STATE =====
const state = {
  mode: 'adaptive',
  duration: 30,
  theme: 'hacker',
  sound: 'off',
  started: false,
  finished: false,
  timeLeft: 30,
  timer: null,
  text: '',
  typedIndex: 0,
  errors: 0,
  totalKeystrokes: 0,
  correctKeystrokes: 0,
  streak: 0,
  maxStreak: 0,
  xp: 0,
  comboCount: 0,
  xpMultiplier: 1,
  bestWPM: parseInt(localStorage.getItem('sh_bestWPM') || '0'),
  // Per-letter stats (latency + accuracy)
  letterStats: JSON.parse(localStorage.getItem('sh_letterStats') || '{}'),
  // Unlocked letters for adaptive mode
  unlockedLetters: JSON.parse(localStorage.getItem('sh_unlockedLetters') || '["e","n","i","t","r","l"]'),
  // God mode: manual letter overrides
  godModeLetters: null,
  lastKeyTime: null,
  charTimings: {},
};

// ===== KEYBOARD LAYOUT =====
const KB_ROWS = [
  ['`','1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],
  ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
  ['Caps','a','s','d','f','g','h','j','k','l',';',"'",'Enter'],
  ['Shift','z','x','c','v','b','n','m',',','.','/','-Shift'],
  ['Space'],
];
const WIDE_KEYS = { Backspace:'wide-2', Tab:'wide-1', Caps:'wide-2', Enter:'wide-2', Shift:'wide-2', '-Shift':'wide-2', Space:'spacebar' };

// ===== WORD BANKS =====
const WORD_BANKS = {
  words: ['the','of','and','a','to','in','is','you','that','it','he','was','for','on','are','with','as','his','they','at','be','this','from','or','had','by','not','but','what','all','were','when','we','there','can','an','your','which','their','said','if','do','into','has','more','her','two','like','him','see','time','could','no','make','than','first','been','its','who','now','people','my','made','over','did','down','only','way','find','use','may','water','long','little','very','after','words','called','just','where','most','tell','much','before'],
  code: ['const','let','var','function','return','if','else','for','while','class','import','export','async','await','true','false','null','undefined','break','continue','try','catch','throw','new','this','typeof','instanceof','switch','case','default','void','delete','in','of','yield','static','extends','super','from','as'],
};

const PHONETIC_PATTERNS = ['th','he','in','er','an','re','on','at','en','nd','ti','es','or','te','of','ed','is','it','al','ar','st','to','nt','ng','se','ha','as','ou','io','le'];

// ===== GENERATE TEXT =====
function generateText() {
  const mode = state.mode;
  if (mode === 'quote') {
    const quotes = [
      "The only way to do great work is to love what you do.",
      "In the middle of every difficulty lies opportunity.",
      "It does not matter how slowly you go as long as you do not stop.",
      "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      "The best time to plant a tree was twenty years ago. The second best time is now.",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
  if (mode === 'code') {
    return Array.from({ length: 30 }, () => {
      const bank = WORD_BANKS.code;
      return bank[Math.floor(Math.random() * bank.length)];
    }).join(' ');
  }
  if (mode === 'words') {
    return Array.from({ length: 40 }, () => {
      const bank = WORD_BANKS.words;
      return bank[Math.floor(Math.random() * bank.length)];
    }).join(' ');
  }
  // Adaptive mode: generate pseudo-words from unlocked letters
  return generateAdaptiveText();
}

function generateAdaptiveText() {
  const letters = state.godModeLetters || state.unlockedLetters;
  if (!letters || letters.length === 0) return 'please unlock some letters in settings';

  // Weight letters by weakness (more errors = higher frequency)
  const weights = {};
  letters.forEach(l => {
    const stats = state.letterStats[l];
    if (stats && stats.attempts > 5) {
      const errRate = stats.errors / stats.attempts;
      weights[l] = 1 + errRate * 4;
    } else {
      weights[l] = 1;
    }
  });

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  function weightedRandom() {
    let r = Math.random() * totalWeight, acc = 0;
    for (const [l, w] of Object.entries(weights)) {
      acc += w;
      if (r <= acc) return l;
    }
    return letters[0];
  }

  const words = [];
  const wordCount = 35;
  for (let w = 0; w < wordCount; w++) {
    const len = 2 + Math.floor(Math.random() * 4);
    let word = '';
    for (let i = 0; i < len; i++) {
      if (i === 0 || Math.random() < 0.6) {
        word += weightedRandom();
      } else {
        // Try phonetic patterns
        const pattern = PHONETIC_PATTERNS[Math.floor(Math.random() * PHONETIC_PATTERNS.length)];
        const validPattern = pattern.split('').every(c => letters.includes(c));
        if (validPattern) { word += pattern; i++; }
        else word += weightedRandom();
      }
    }
    words.push(word);
  }
  return words.join(' ');
}

// ===== RENDER TEXT =====
let charSpans = [];
function renderText() {
  const container = document.getElementById('tzWords');
  container.innerHTML = '';
  charSpans = [];
  for (let i = 0; i < state.text.length; i++) {
    const span = document.createElement('span');
    span.className = 'tw-char pending';
    span.textContent = state.text[i] === ' ' ? '\u00A0' : state.text[i];
    if (state.text[i] === ' ') span.classList.add('tw-space');
    container.appendChild(span);
    charSpans.push(span);
  }
  updateCursorPos();
}

// ===== CURSOR POSITION =====
function updateCursorPos() {
  const cursor = document.getElementById('tzCursor');
  const zone = document.getElementById('tzWords');
  if (state.typedIndex < charSpans.length) {
    const span = charSpans[state.typedIndex];
    const zoneRect = document.getElementById('typingZone').getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();
    cursor.style.left = (spanRect.left - zoneRect.left + 40) + 'px';
    cursor.style.top = (spanRect.top - zoneRect.top + 36) + 'px';
    cursor.style.display = 'block';
  } else {
    cursor.style.display = 'none';
  }
}

// ===== START SESSION =====
function startSession() {
  if (state.started) return;
  state.started = true;
  state.finished = false;
  state.timeLeft = state.duration;
  state.typedIndex = 0;
  state.errors = 0;
  state.totalKeystrokes = 0;
  state.correctKeystrokes = 0;
  state.streak = 0;
  state.xp = 0;
  state.comboCount = 0;
  state.xpMultiplier = 1;
  state.lastKeyTime = null;
  state.charTimings = {};

  document.getElementById('startOverlay').classList.add('hidden');
  document.getElementById('resultOverlay').classList.add('hidden');
  document.getElementById('statTime').textContent = state.timeLeft;
  document.getElementById('hiddenInput').focus();

  state.text = generateText();
  renderText();
  updateLetterProgress();

  state.timer = setInterval(tick, 1000);
}

function tick() {
  state.timeLeft--;
  document.getElementById('statTime').textContent = state.timeLeft;
  updateWPM();
  if (state.timeLeft <= 0) endSession();
}

// ===== END SESSION =====
function endSession() {
  clearInterval(state.timer);
  state.finished = true;
  state.started = false;

  const wpm = calcWPM();
  const acc = calcAccuracy();
  const xp = state.xp;
  if (wpm > state.bestWPM) {
    state.bestWPM = wpm;
    localStorage.setItem('sh_bestWPM', wpm);
  }
  localStorage.setItem('sh_letterStats', JSON.stringify(state.letterStats));
  checkUnlocks();
  localStorage.setItem('sh_unlockedLetters', JSON.stringify(state.unlockedLetters));

  document.getElementById('roWPM').textContent = wpm;
  document.getElementById('roAcc').textContent = acc + '%';
  document.getElementById('roXP').textContent = '+' + xp;
  document.getElementById('roBest').textContent = state.bestWPM;
  renderResultHeatmap();
  document.getElementById('resultOverlay').classList.remove('hidden');
  document.getElementById('hiddenInput').blur();
}

function restartSession() {
  document.getElementById('resultOverlay').classList.add('hidden');
  document.getElementById('startOverlay').classList.remove('hidden');
  charSpans.forEach(s => s.className = 'tw-char pending');
  document.getElementById('tzCursor').style.display = 'block';
  state.started = false; state.finished = false;
  state.typedIndex = 0; state.errors = 0;
  state.totalKeystrokes = 0; state.correctKeystrokes = 0;
  state.streak = 0; state.xp = 0; state.comboCount = 0;
  state.xpMultiplier = 1;
  updateStatsUI();
  document.getElementById('comboFill').style.width = '0%';
}

// ===== TYPING HANDLER =====
const hiddenInput = document.getElementById('hiddenInput');
document.getElementById('typingZone').addEventListener('click', () => {
  if (!state.started && !state.finished) startSession();
  hiddenInput.focus();
});
document.addEventListener('keydown', (e) => {
  if (!state.started && !state.finished) {
    if (e.key.length === 1 || e.key === 'Backspace') startSession();
    return;
  }
  if (state.finished) return;
  handleKey(e.key, e);
});

function handleKey(key, e) {
  if (key === 'Tab') { if(e) e.preventDefault(); return; }

  flashKbKey(key);

  if (key === 'Backspace') {
    if (state.typedIndex > 0) {
      state.typedIndex--;
      charSpans[state.typedIndex].className = 'tw-char pending';
      updateCursorPos();
      state.streak = 0;
      updateStatsUI();
    }
    return;
  }

  if (key.length !== 1) return;

  const expected = state.text[state.typedIndex];
  const now = performance.now();
  const latency = state.lastKeyTime ? now - state.lastKeyTime : 100;
  state.lastKeyTime = now;
  state.totalKeystrokes++;

  if (!state.charTimings[expected]) state.charTimings[expected] = [];
  if (!state.letterStats[expected]) state.letterStats[expected] = { attempts: 0, errors: 0, latencySum: 0 };

  if (key === expected) {
    charSpans[state.typedIndex].className = 'tw-char correct';
    state.correctKeystrokes++;
    state.streak++;
    state.comboCount++;
    state.letterStats[expected].attempts++;
    state.letterStats[expected].latencySum += latency;
    state.charTimings[expected].push(latency);
    playSound('correct');

    // XP
    const base = 1;
    if (state.comboCount >= 20) state.xpMultiplier = 3;
    else if (state.comboCount >= 10) state.xpMultiplier = 2;
    else state.xpMultiplier = 1;
    state.xp += base * state.xpMultiplier;
  } else {
    charSpans[state.typedIndex].className = 'tw-char error';
    state.errors++;
    state.streak = 0;
    state.comboCount = 0;
    state.xpMultiplier = 1;
    state.letterStats[expected] = state.letterStats[expected] || { attempts: 0, errors: 0, latencySum: 0 };
    state.letterStats[expected].attempts++;
    state.letterStats[expected].errors++;
    playSound('error');
    flashError();
  }

  state.typedIndex++;

  // Auto extend if near end
  if (state.typedIndex >= state.text.length - 10) {
    state.text += ' ' + generateText();
    for (let i = charSpans.length; i < state.text.length; i++) {
      const span = document.createElement('span');
      span.className = 'tw-char pending';
      span.textContent = state.text[i] === ' ' ? '\u00A0' : state.text[i];
      if (state.text[i] === ' ') span.classList.add('tw-space');
      document.getElementById('tzWords').appendChild(span);
      charSpans.push(span);
    }
  }

  updateCursorPos();
  scrollToCurrentChar();
  updateStatsUI();
  updateComboBar();
  updateActiveKbKey(state.text[state.typedIndex] || '');
}

function scrollToCurrentChar() {
  if (state.typedIndex < charSpans.length) {
    charSpans[state.typedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ===== STATS ===== 
function calcWPM() {
  const minutes = (state.duration - state.timeLeft) / 60 || 0.01;
  return Math.round(state.correctKeystrokes / 5 / minutes);
}
function calcAccuracy() {
  if (state.totalKeystrokes === 0) return 100;
  return Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100);
}
function updateWPM() {
  document.getElementById('statWPM').textContent = calcWPM();
}
function updateStatsUI() {
  document.getElementById('statWPM').textContent = calcWPM();
  document.getElementById('statAcc').textContent = calcAccuracy() + '%';
  document.getElementById('statStreak').textContent = state.streak;
  document.getElementById('statXP').textContent = state.xp;
}

function updateComboBar() {
  const pct = Math.min((state.comboCount / 30) * 100, 100);
  document.getElementById('comboFill').style.width = pct + '%';
  const label = document.getElementById('comboLabel');
  if (state.xpMultiplier > 1) {
    label.textContent = `${state.xpMultiplier}x XP COMBO!`;
    label.style.opacity = 1;
  } else {
    label.style.opacity = 0;
  }
  if (pct > 0) document.getElementById('comboBar').style.opacity = 1;
}

function flashError() {
  const zone = document.getElementById('typingZone');
  zone.style.boxShadow = '0 0 30px rgba(255,64,85,0.5)';
  setTimeout(() => { zone.style.boxShadow = ''; }, 200);
}

// ===== KEYBOARD HIGHLIGHT =====
const kbKeyEls = {};
function buildKeyboard() {
  const kb = document.getElementById('keyboard');
  KB_ROWS.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'kb-row';
    row.forEach(key => {
      const el = document.createElement('div');
      const displayKey = key === '-Shift' ? 'Shift' : key;
      el.className = 'kb-key ' + (WIDE_KEYS[key] || '');
      el.textContent = displayKey.length > 1 ? displayKey : displayKey;
      rowDiv.appendChild(el);
      const k = key.toLowerCase();
      if (k.length === 1) kbKeyEls[k] = el;
      else kbKeyEls[key] = el;
    });
    kb.appendChild(rowDiv);
  });
}
buildKeyboard();

function flashKbKey(key) {
  const k = key.toLowerCase();
  const el = kbKeyEls[k] || kbKeyEls[key];
  if (el) {
    el.classList.add('kb-flash');
    setTimeout(() => el.classList.remove('kb-flash'), 150);
  }
}

function updateActiveKbKey(nextChar) {
  Object.values(kbKeyEls).forEach(el => el.classList.remove('kb-active'));
  if (nextChar) {
    const el = kbKeyEls[nextChar.toLowerCase()] || kbKeyEls[nextChar];
    if (el) el.classList.add('kb-active');
  }
  // Color by performance
  Object.entries(state.letterStats).forEach(([letter, stats]) => {
    const el = kbKeyEls[letter];
    if (!el) return;
    if (stats.attempts < 3) return;
    const errRate = stats.errors / stats.attempts;
    el.classList.remove('kb-correct', 'kb-error');
    if (errRate > 0.2) el.classList.add('kb-error');
    else if (errRate < 0.05 && stats.attempts > 10) el.classList.add('kb-correct');
  });
}

// ===== UNLOCK SYSTEM =====
const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const UNLOCK_WPM_THRESHOLD = 20;
const UNLOCK_ACC_THRESHOLD = 90;

function checkUnlocks() {
  const wpm = calcWPM(), acc = calcAccuracy();
  if (wpm >= UNLOCK_WPM_THRESHOLD && acc >= UNLOCK_ACC_THRESHOLD) {
    // Unlock next letter not yet unlocked
    const nextLetter = ALL_LETTERS.find(l => !state.unlockedLetters.includes(l));
    if (nextLetter && !state.unlockedLetters.includes(nextLetter)) {
      state.unlockedLetters.push(nextLetter);
    }
  }
}

// ===== LETTER PROGRESS UI =====
function updateLetterProgress() {
  const grid = document.getElementById('letterProgress');
  grid.innerHTML = '';
  ALL_LETTERS.forEach(letter => {
    const stats = state.letterStats[letter];
    const unlocked = state.unlockedLetters.includes(letter);
    const acc = stats && stats.attempts > 0
      ? Math.round(((stats.attempts - stats.errors) / stats.attempts) * 100)
      : 0;
    const div = document.createElement('div');
    div.className = 'lp-key ' + (unlocked ? 'unlocked' : 'locked');
    div.innerHTML = `
      <div class="lp-letter">${letter}</div>
      <div class="lp-bar-bg"><div class="lp-bar-fill" style="width:${acc}%"></div></div>
      <div class="lp-pct">${stats && stats.attempts > 0 ? acc + '%' : '—'}</div>
    `;
    grid.appendChild(div);
  });
}

// ===== RESULT HEATMAP =====
function renderResultHeatmap() {
  const grid = document.getElementById('roHeatmap');
  grid.innerHTML = '';
  ALL_LETTERS.forEach(letter => {
    const stats = state.letterStats[letter];
    if (!stats || stats.attempts === 0) return;
    const errRate = stats.errors / stats.attempts;
    const r = Math.round(errRate * 255);
    const g = Math.round((1 - errRate) * 200);
    const b = 50;
    const div = document.createElement('div');
    div.className = 'roh-key';
    div.style.background = `rgba(${r},${g},${b},0.3)`;
    div.style.borderColor = `rgba(${r},${g},${b},0.6)`;
    div.style.color = errRate > 0.3 ? '#ff4055' : errRate < 0.1 ? '#00cc37' : '#aaa';
    div.textContent = letter;
    div.title = `${letter}: ${stats.attempts} attempts, ${stats.errors} errors`;
    grid.appendChild(div);
  });
}

// ===== SOUND =====
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playSound(type) {
  if (state.sound === 'off') return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'correct') {
      osc.frequency.value = state.sound === 'soft' ? 600 : 800;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.type = 'sine';
    } else {
      osc.frequency.value = 200;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.type = 'sawtooth';
    }
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch(e) {}
}

// ===== SETTINGS =====
document.getElementById('settingsToggle').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.toggle('open');
});

document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const theme = btn.getAttribute('data-theme');
    state.theme = theme;
    document.body.className = 'theme-' + theme;
    if (theme === 'hacker') document.body.className = '';
  });
});
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.getAttribute('data-mode');
  });
});
document.querySelectorAll('.dur-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.duration = parseInt(btn.getAttribute('data-dur'));
    state.timeLeft = state.duration;
    document.getElementById('statTime').textContent = state.duration;
  });
});
document.querySelectorAll('.sound-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sound = btn.getAttribute('data-sound');
  });
});

// God mode letter toggles
function buildLetterToggles() {
  const grid = document.getElementById('letterToggleGrid');
  grid.innerHTML = '';
  ALL_LETTERS.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'lg-key ' + (state.unlockedLetters.includes(l) ? 'active' : '');
    btn.textContent = l;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const active = [...document.querySelectorAll('.lg-key.active')].map(b => b.textContent);
      state.godModeLetters = active.length > 0 ? active : null;
    });
    grid.appendChild(btn);
  });
}
buildLetterToggles();

document.getElementById('resetBtn').addEventListener('click', () => {
  if (state.started) { clearInterval(state.timer); }
  restartSession();
});

// ===== INIT =====
state.text = generateText();
renderText();
updateLetterProgress();
updateActiveKbKey(state.text[0] || '');
document.getElementById('statTime').textContent = state.duration;
