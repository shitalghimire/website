/* =============================================================
   SEHACK — adaptive typing trainer
   Tracks per-key latency and error rate, unlocks the alphabet
   progressively, and biases every generated drill toward the
   keys you are worst at.
   ============================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     persistence
     --------------------------------------------------------- */
  var DEF_STATE = {
    keys: {}, digrams: {}, unlocked: 5,
    bestWpm: 0, totalMs: 0, sessions: 0,
    days: {}, streakDays: 0, lastDay: '', badges: []
  };
  var DEF_OPTS = { layout: 'qwerty', sound: 'soft', len: 30, goal: 10, custom: '', theme: 'plate' };

  function load(key, def) {
    try {
      var raw = localStorage.getItem('sg.hack.' + key);
      if (!raw) return JSON.parse(JSON.stringify(def));
      var v = JSON.parse(raw);
      Object.keys(def).forEach(function (k) { if (v[k] === undefined) v[k] = def[k]; });
      return v;
    } catch (e) { return JSON.parse(JSON.stringify(def)); }
  }
  function save(key, val) {
    try { localStorage.setItem('sg.hack.' + key, JSON.stringify(val)); } catch (e) {}
  }

  var S = load('state', DEF_STATE);
  var O = load('opts', DEF_OPTS);

  /* ---------------------------------------------------------
     adaptive model
     --------------------------------------------------------- */
  /* unlock order: frequent + home-row first, awkward reaches last */
  var ORDER = 'enitrlsaocdupmbghyfwkvxzjq'.split('');
  var VOWELS = 'aeiou';
  var TARGET_MS = 260;      /* a comfortable per-key latency */
  var SLOW_MS = 700;

  function keyStat(c) {
    if (!S.keys[c]) S.keys[c] = { h: 0, e: 0, t: 0, n: 0 };
    return S.keys[c];
  }
  function accuracy(c) {
    var k = keyStat(c);
    var tot = k.h + k.e;
    return tot ? k.h / tot : 0;
  }
  function meanMs(c) {
    var k = keyStat(c);
    return k.n ? k.t / k.n : SLOW_MS;
  }
  /* 0..1 — combines how often you get it right and how fast */
  function mastery(c) {
    var k = keyStat(c);
    var tot = k.h + k.e;
    if (!tot) return 0;
    var acc = k.h / tot;
    var ms = meanMs(c);
    var speed = Math.max(0, Math.min(1, (SLOW_MS - ms) / (SLOW_MS - TARGET_MS)));
    var confidence = Math.min(1, tot / 12);     /* few samples ⇒ low mastery */
    return Math.max(0, Math.min(1, acc * acc * (0.45 + 0.55 * speed) * confidence));
  }
  function unlockedLetters() { return ORDER.slice(0, Math.min(S.unlocked, ORDER.length)); }

  function maybeUnlock() {
    var set = unlockedLetters();
    if (set.length >= ORDER.length) return false;
    var enough = set.every(function (c) { return keyStat(c).h + keyStat(c).e >= 8; });
    if (!enough) return false;
    var avg = set.reduce(function (a, c) { return a + mastery(c); }, 0) / set.length;
    if (avg >= 0.72) { S.unlocked++; return true; }
    return false;
  }

  /* weight selection toward weak keys */
  function weightedPick(pool) {
    var w = pool.map(function (c) { return Math.pow(1 - mastery(c), 2) + 0.12; });
    var sum = w.reduce(function (a, b) { return a + b; }, 0);
    var r = Math.random() * sum;
    for (var i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  /* pronounceable pseudo-words from the unlocked alphabet */
  function pseudoWord() {
    var set = unlockedLetters();
    var vs = set.filter(function (c) { return VOWELS.indexOf(c) > -1; });
    var cs = set.filter(function (c) { return VOWELS.indexOf(c) < 0; });
    var len = 2 + Math.floor(Math.random() * 4);
    var out = '', wantVowel = Math.random() < 0.35;

    for (var i = 0; i < len; i++) {
      var pool;
      if (wantVowel && vs.length) pool = vs;
      else if (!wantVowel && cs.length) pool = cs;
      else pool = set;
      out += weightedPick(pool);
      wantVowel = !wantVowel;
    }
    return out;
  }

  /* ---------------------------------------------------------
     content banks
     --------------------------------------------------------- */
  var WORDS = ('the of and to in is it you that he was for on are as with his they at be this have from one had ' +
    'by word but not what all were we when your can said there use an each which she do how their if will up other ' +
    'about out many then them these so some her would make like him into time has look two more write go see number ' +
    'no way could people my than first water been call who oil its now find long down day did get come made may part ' +
    'over new sound take only little work know place year live me back give most very after thing our just name good ' +
    'sentence man think say great where help through much before line right too mean old any same tell boy follow ' +
    'came want show also around form three small set put end does another well large must big even such because turn ' +
    'here why ask went men read need land different home us move try kind hand picture again change off play spell ' +
    'air away animal house point page letter mother answer found study still learn should world').split(' ');

  var CODE = [
    'const x = arr.map((v) => v * 2);',
    'if (a !== b) { return null; }',
    'function sum(a, b) { return a + b; }',
    'for (let i = 0; i < n; i++) {}',
    'let { id, name } = props;',
    'export default class Node {}',
    'try { run(); } catch (e) { log(e); }',
    'const re = /^[a-z0-9_-]+$/gi;',
    'arr.filter(Boolean).join(", ");',
    'obj?.value ?? "fallback";',
    'async function load() { await get(); }',
    'this.state = { open: false };',
    '// TODO: handle the edge case',
    'div.style.width = `${w}px`;',
    'return items.reduce((a, b) => a + b, 0);'
  ];

  /* original prose — engineering, rivers, building */
  var PROSE = [
    'A schedule is only as honest as the person updating it, and the site always knows the truth first.',
    'The river carries more than water down the valley; it carries the argument for building here at all.',
    'Concrete forgives almost nothing, so the checking happens before the pour and never after it.',
    'Every drawing is a promise that someone, somewhere, will stand in the mud and make it real.',
    'Good planning is not optimism written down; it is arithmetic that survives contact with weather.',
    'The barrage holds the water back, the intake lets it through, and the whole valley notices.',
    'Steel arrives rusted, formwork arrives warped, and the programme has to absorb both without blinking.',
    'A critical path is a story about which delays matter and which ones you are allowed to ignore.',
    'Measure twice is not a proverb on a construction site; it is the difference between a wall and a mistake.',
    'The mountains set the durations here, not the contract, and they do not negotiate.',
    'Progress is what survives the weekly report, not what somebody hoped for on Monday morning.',
    'Grouting is quiet work that nobody photographs, and the dam stands on it anyway.'
  ];

  var SYMBOLS = '0123456789 + - * / = ( ) [ ] { } < > ; : , . ? ! @ # $ % & _'.split(' ');

  /* ---------------------------------------------------------
     drill construction
     --------------------------------------------------------- */
  var mode = 'adaptive';

  function buildDrill() {
    var n = O.len, out = [], i;
    if (mode === 'adaptive') {
      for (i = 0; i < Math.max(8, Math.round(n / 3)); i++) out.push(pseudoWord());
      return out.join(' ');
    }
    if (mode === 'words') {
      for (i = 0; i < n; i++) out.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
      return out.join(' ');
    }
    if (mode === 'code') {
      var lines = [];
      for (i = 0; i < 3; i++) lines.push(CODE[Math.floor(Math.random() * CODE.length)]);
      return lines.join(' ');
    }
    if (mode === 'prose') {
      var p = [], want = Math.max(1, Math.round(n / 18));
      for (i = 0; i < want; i++) p.push(PROSE[Math.floor(Math.random() * PROSE.length)]);
      return p.join(' ');
    }
    if (mode === 'numbers') {
      for (i = 0; i < n; i++) {
        if (Math.random() < 0.5) out.push(String(Math.floor(Math.random() * 9000) + 100));
        else out.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }
      return out.join(' ');
    }
    /* custom */
    var t = (O.custom || '').replace(/\s+/g, ' ').trim();
    return t || 'Add your own text in Settings, then this mode will use it.';
  }

  /* ---------------------------------------------------------
     session state
     --------------------------------------------------------- */
  var text = '', idx = 0, spans = [], started = 0, lastAt = 0,
      correct = 0, errors = 0, live = false, ended = false,
      sessKeys = {}, sessDig = {}, tickTimer = null;

  var streamEl = $('#stream'), surface = $('#surface'), veil = $('#startVeil');

  function renderStream() {
    /* group into words so lines break sensibly */
    var html = '', word = '';
    spans = [];
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      var safe = c === ' ' ? '&nbsp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c;
      var cls = 'ch' + (c === ' ' ? ' space' : '');
      var chunk = '<span class="' + cls + '" data-i="' + i + '">' + safe + '</span>';
      if (c === ' ') {
        html += '<span class="word">' + word + '</span>' + chunk;
        word = '';
      } else {
        word += chunk;
      }
    }
    if (word) html += '<span class="word">' + word + '</span>';
    streamEl.innerHTML = html;
    spans = $$('.ch', streamEl);
    paintCursor();
  }

  function paintCursor() {
    spans.forEach(function (s, i) {
      s.classList.toggle('now', i === idx);
    });
    var cur = spans[idx];
    if (cur && cur.scrollIntoView) {
      var r = cur.getBoundingClientRect(), sr = surface.getBoundingClientRect();
      if (r.bottom > sr.bottom - 12 || r.top < sr.top + 12) {
        cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    highlightNext();
  }

  function newDrill() {
    stopTick();
    text = buildDrill();
    idx = 0; correct = 0; errors = 0; live = false; ended = false;
    started = 0; lastAt = 0; sessKeys = {}; sessDig = {};
    renderStream();
    setMetric('mWpm', '0<small> wpm</small>');
    setMetric('mAcc', '100<small>%</small>');
    veil.hidden = false;
    $('#report').hidden = true;
  }

  function setMetric(id, html) { var e = $('#' + id); if (e) e.innerHTML = html; }

  function elapsedMin() { return started ? (performance.now() - started) / 60000 : 0; }
  function wpm() {
    var m = elapsedMin();
    return m > 0 ? Math.max(0, Math.round((correct / 5) / m)) : 0;
  }
  function accPct() {
    var tot = correct + errors;
    return tot ? Math.round((correct / tot) * 100) : 100;
  }

  function startTick() {
    stopTick();
    tickTimer = setInterval(function () {
      if (!live) return;
      setMetric('mWpm', wpm() + '<small> wpm</small>');
      setMetric('mAcc', accPct() + '<small>%</small>');
    }, 250);
  }
  function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

  /* ---------------------------------------------------------
     sound
     --------------------------------------------------------- */
  var actx = null;
  function click(bad) {
    if (O.sound === 'off') return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      if (bad) { o.type = 'sawtooth'; o.frequency.value = 130; }
      else if (O.sound === 'mech') { o.type = 'square'; o.frequency.value = 1750 + Math.random() * 260; }
      else { o.type = 'sine'; o.frequency.value = 900 + Math.random() * 120; }
      var vol = bad ? 0.05 : O.sound === 'mech' ? 0.035 : 0.022;
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (bad ? 0.16 : 0.035));
      o.start(); o.stop(actx.currentTime + (bad ? 0.18 : 0.05));
    } catch (e) {}
  }

  /* ---------------------------------------------------------
     typing
     --------------------------------------------------------- */
  function onChar(ch) {
    if (ended) return;
    var want = text[idx];
    if (want === undefined) return;

    if (!live) {
      live = true;
      started = performance.now();
      lastAt = started;
      veil.hidden = true;
      startTick();
    }

    var now = performance.now();
    var dt = Math.min(now - lastAt, 3000);
    var sp = spans[idx];

    if (ch === want) {
      sp.classList.remove('bad');
      sp.classList.add('done');
      correct++;

      var lower = want.toLowerCase();
      if (/[a-z]/.test(lower)) {
        var k = keyStat(lower);
        k.h++; k.t += dt; k.n++;
        sessKeys[lower] = sessKeys[lower] || { h: 0, e: 0, t: 0, n: 0 };
        sessKeys[lower].h++; sessKeys[lower].t += dt; sessKeys[lower].n++;

        var prev = text[idx - 1];
        if (prev && /[a-z]/i.test(prev)) {
          var dg = prev.toLowerCase() + lower;
          if (!S.digrams[dg]) S.digrams[dg] = { t: 0, n: 0 };
          S.digrams[dg].t += dt; S.digrams[dg].n++;
          sessDig[dg] = sessDig[dg] || { t: 0, n: 0 };
          sessDig[dg].t += dt; sessDig[dg].n++;
        }
      }
      flashKey(want, false);
      click(false);
      idx++;
      lastAt = now;
      paintCursor();
      if (idx >= text.length) finish();
    } else {
      /* blocked until corrected — this is a trainer, not a race */
      sp.classList.add('bad');
      errors++;
      var lw = want.toLowerCase();
      if (/[a-z]/.test(lw)) {
        keyStat(lw).e++;
        sessKeys[lw] = sessKeys[lw] || { h: 0, e: 0, t: 0, n: 0 };
        sessKeys[lw].e++;
      }
      flashKey(want, true);
      click(true);
      setMetric('mAcc', accPct() + '<small>%</small>');
    }
  }

  function finish() {
    ended = true; live = false;
    stopTick();
    var ms = performance.now() - started;
    var w = wpm(), a = accPct();

    S.sessions++;
    S.totalMs += ms;
    if (w > S.bestWpm) S.bestWpm = w;

    /* daily goal + streak */
    var today = new Date().toISOString().slice(0, 10);
    S.days[today] = (S.days[today] || 0) + ms;
    if (S.lastDay !== today) {
      var y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      S.streakDays = S.lastDay === y ? S.streakDays + 1 : 1;
      S.lastDay = today;
    }

    var unlockedNew = mode === 'adaptive' ? maybeUnlock() : false;
    save('state', S);
    report(w, a, ms, unlockedNew);
    paintHeader();
    paintKeyboard();
  }

  /* ---------------------------------------------------------
     report
     --------------------------------------------------------- */
  var RANKS = [
    [0, 'Novice'], [25, 'Draftsman'], [40, 'Operator'],
    [55, 'Technician'], [70, 'Engineer'], [90, 'Principal']
  ];
  function rankFor(w) {
    var r = RANKS[0][1];
    RANKS.forEach(function (x) { if (w >= x[0]) r = x[1]; });
    return r;
  }

  var BADGES = [
    ['first', 'First drill', function () { return S.sessions >= 1; }],
    ['w40', '40 wpm', function () { return S.bestWpm >= 40; }],
    ['w60', '60 wpm', function () { return S.bestWpm >= 60; }],
    ['w80', '80 wpm', function () { return S.bestWpm >= 80; }],
    ['half', 'Half alphabet', function () { return S.unlocked >= 13; }],
    ['full', 'Full alphabet', function () { return S.unlocked >= 26; }],
    ['s3', '3-day streak', function () { return S.streakDays >= 3; }],
    ['s7', '7-day streak', function () { return S.streakDays >= 7; }],
    ['hour', 'One hour logged', function () { return S.totalMs >= 3600000; }],
    ['x25', '25 drills', function () { return S.sessions >= 25; }]
  ];

  function report(w, a, ms, unlockedNew) {
    var rep = $('#report');
    rep.hidden = false;

    $('#repMeta').textContent = mode.toUpperCase() + ' · ' + (ms / 1000).toFixed(1) + 's · ' + text.length + ' chars';
    $('#repResult').innerHTML =
      '<strong>' + w + ' wpm</strong> at <strong>' + a + '%</strong> accuracy.<br/>' +
      errors + ' correction' + (errors === 1 ? '' : 's') + ' · best ever ' + S.bestWpm + ' wpm.';

    /* weakest keys this session, falling back to lifetime */
    var pool = Object.keys(sessKeys).length ? sessKeys : S.keys;
    var weak = Object.keys(pool).map(function (c) {
      var k = pool[c], tot = k.h + k.e;
      return { c: c, acc: tot ? k.h / tot : 0, ms: k.n ? k.t / k.n : 0, tot: tot };
    }).filter(function (x) { return x.tot >= 2; })
      .sort(function (p, q) { return (p.acc - q.acc) || (q.ms - p.ms); })
      .slice(0, 6);

    $('#repKeys').innerHTML = weak.length
      ? weak.map(function (x) {
          var good = x.acc >= 0.95;
          return '<span class="chip' + (good ? ' chip--good' : '') + '">' + x.c.toUpperCase()
            + ' <b>' + Math.round(x.acc * 100) + '%</b> · ' + Math.round(x.ms) + 'ms</span>';
        }).join('')
      : '<span class="chip">Not enough data yet</span>';

    /* slowest transitions */
    var dpool = Object.keys(sessDig).length ? sessDig : S.digrams;
    var dig = Object.keys(dpool).map(function (d) {
      return { d: d, ms: dpool[d].t / dpool[d].n, n: dpool[d].n };
    }).filter(function (x) { return x.n >= 2; })
      .sort(function (p, q) { return q.ms - p.ms; })
      .slice(0, 5);

    $('#repDigrams').innerHTML = dig.length
      ? dig.map(function (x) {
          return '<span class="chip">' + x.d[0].toUpperCase() + ' → ' + x.d[1].toUpperCase()
            + ' <b>' + Math.round(x.ms) + 'ms</b></span>';
        }).join('')
      : '<span class="chip">Not enough data yet</span>';

    /* coaching */
    var coach;
    if (a < 90) {
      coach = 'Accuracy is doing the damage, not speed. Slow down by a third — every corrected keystroke costs more than a slow one.';
    } else if (dig.length && dig[0].ms > 420) {
      coach = 'Your slowest move is <strong>' + dig[0].d[0].toUpperCase() + ' → ' + dig[0].d[1].toUpperCase()
        + '</strong> at ' + Math.round(dig[0].ms) + 'ms. Drill that pair deliberately before pushing pace.';
    } else if (weak.length && weak[0].acc < 0.9) {
      coach = '<strong>' + weak[0].c.toUpperCase() + '</strong> is your weakest key at '
        + Math.round(weak[0].acc * 100) + '%. Adaptive mode is already feeding you more of it.';
    } else if (w >= S.bestWpm) {
      coach = 'That is your best run yet. Hold this accuracy for a few more drills before you chase more speed.';
    } else {
      coach = 'Clean run. Keep accuracy above 95% and the speed follows on its own.';
    }
    $('#repCoach').innerHTML = coach;

    /* badges */
    $('#repBadges').innerHTML = BADGES.map(function (b) {
      var got = b[2]();
      if (got && S.badges.indexOf(b[0]) < 0) S.badges.push(b[0]);
      return '<span class="badge' + (got ? '' : ' dim') + '">' + (got ? '◆' : '◇') + ' ' + b[1] + '</span>';
    }).join('');
    save('state', S);

    /* next */
    var set = unlockedLetters();
    var avg = set.reduce(function (acc, c) { return acc + mastery(c); }, 0) / set.length;
    var nextLetter = ORDER[S.unlocked];
    $('#repNext').innerHTML = unlockedNew
      ? 'New key unlocked: <strong>' + ORDER[S.unlocked - 1].toUpperCase() + '</strong>. It will start appearing now.'
      : S.unlocked >= ORDER.length
        ? 'Whole alphabet unlocked. Push for speed and keep accuracy above 97%.'
        : 'Set mastery <strong>' + Math.round(avg * 100) + '%</strong> — reach 72% to unlock <strong>'
          + (nextLetter ? nextLetter.toUpperCase() : '—') + '</strong>.';
  }

  /* ---------------------------------------------------------
     header metrics
     --------------------------------------------------------- */
  function paintHeader() {
    setMetric('mStreak', S.streakDays + '<small> d</small>');
    setMetric('mRank', rankFor(S.bestWpm));
    setMetric('mKeys', Math.min(S.unlocked, 26) + '<small>/26</small>');

    var today = new Date().toISOString().slice(0, 10);
    var mins = (S.days[today] || 0) / 60000;
    var pct = Math.max(0, Math.min(1, mins / (O.goal || 10)));
    setMetric('mGoal', mins.toFixed(0) + '<small>/' + (O.goal || 10) + ' min</small>');
    var ring = $('#goalRing');
    if (ring) {
      var C = 2 * Math.PI * 16;
      ring.setAttribute('stroke-dasharray', C.toFixed(1));
      ring.setAttribute('stroke-dashoffset', (C * (1 - pct)).toFixed(1));
    }
  }

  /* ---------------------------------------------------------
     keyboard
     --------------------------------------------------------- */
  var LAYOUTS = {
    qwerty: ['qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'],
    dvorak: ["',.pyfgcrl/", 'aoeuidhtns-', ';qjkxbmwvz'],
    colemak: ['qwfpgjluy;[', "arstdhneio'", 'zxcvbkm,./']
  };

  function paintKeyboard() {
    var rows = LAYOUTS[O.layout] || LAYOUTS.qwerty;
    var set = unlockedLetters();
    var html = '';

    html += '<div class="kb__row">'
      + '<span class="key" data-w="1.5" data-k="Tab">TAB</span>'
      + rows[0].split('').map(function (c) { return keyHtml(c, set); }).join('')
      + '<span class="key" data-w="1.5" data-k="Backspace">⌫</span></div>';

    html += '<div class="kb__row">'
      + '<span class="key" data-w="1.8" data-k="Caps">CAPS</span>'
      + rows[1].split('').map(function (c) { return keyHtml(c, set); }).join('')
      + '<span class="key" data-w="2.2" data-k="Enter">↵</span></div>';

    html += '<div class="kb__row">'
      + '<span class="key" data-w="2.2" data-k="Shift">SHIFT</span>'
      + rows[2].split('').map(function (c) { return keyHtml(c, set); }).join('')
      + '<span class="key" data-w="2.2" data-k="ShiftR">SHIFT</span></div>';

    html += '<div class="kb__row"><span class="key" data-w="6" data-k=" ">SPACE</span></div>';

    $('#kb').innerHTML = html;
    highlightNext();
  }

  function keyHtml(c, set) {
    var isLetter = /[a-z]/.test(c);
    var locked = isLetter && set.indexOf(c) < 0;
    var m = isLetter ? mastery(c) : 0;
    return '<span class="key' + (locked ? ' locked' : '') + '" data-k="' + c + '" style="--m:' + m.toFixed(2) + '">'
      + c.toUpperCase() + '</span>';
  }

  function highlightNext() {
    $$('.key', $('#kb')).forEach(function (k) { k.classList.remove('next'); });
    var want = text[idx];
    if (!want) return;
    var target = want === ' ' ? ' ' : want.toLowerCase();
    var k = $('.key[data-k="' + (target === '"' ? '' : target).replace(/"/g, '') + '"]', $('#kb'));
    if (!k && target === ' ') k = $('.key[data-k=" "]', $('#kb'));
    if (k) k.classList.add('next');
  }

  function flashKey(ch, bad) {
    var target = ch === ' ' ? ' ' : ch.toLowerCase();
    var k = $('.key[data-k="' + target.replace(/"/g, '') + '"]', $('#kb'));
    if (!k) return;
    k.classList.add(bad ? 'miss' : 'hit');
    setTimeout(function () { k.classList.remove(bad ? 'miss' : 'hit'); }, bad ? 220 : 110);
  }

  /* ---------------------------------------------------------
     input wiring
     --------------------------------------------------------- */
  document.addEventListener('keydown', function (e) {
    if (!$('#settings').hidden) {
      if (e.key === 'Escape') closeSettings();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape') { e.preventDefault(); newDrill(); return; }
    if (e.key === 'Tab') { e.preventDefault(); newDrill(); return; }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (idx > 0 && !ended) {
        idx--;
        spans[idx].classList.remove('done', 'bad');
        paintCursor();
      }
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      onChar(e.key);
    }
  });

  surface.addEventListener('click', function () { surface.focus(); });

  /* ---------------------------------------------------------
     modes
     --------------------------------------------------------- */
  $$('.mode').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.mode').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      mode = b.getAttribute('data-mode');
      newDrill();
    });
  });

  /* ---------------------------------------------------------
     settings
     --------------------------------------------------------- */
  function openSettings() { $('#settings').hidden = false; }
  function closeSettings() { $('#settings').hidden = true; newDrill(); }

  $('#setBtn').addEventListener('click', openSettings);
  $('#setClose').addEventListener('click', closeSettings);

  function bindOpts(groupId, key, cast) {
    var g = $('#' + groupId);
    if (!g) return;
    $$('.hbtn', g).forEach(function (b) {
      b.setAttribute('aria-pressed', String(String(O[key]) === b.getAttribute('data-v')));
      b.addEventListener('click', function () {
        O[key] = cast ? cast(b.getAttribute('data-v')) : b.getAttribute('data-v');
        $$('.hbtn', g).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        save('opts', O);
        if (key === 'len') newDrill();
      });
    });
  }
  bindOpts('optSound', 'sound');
  bindOpts('optLen', 'len', Number);

  $('#optLayout').value = O.layout;
  $('#optLayout').addEventListener('change', function () {
    O.layout = this.value; save('opts', O); paintKeyboard();
  });

  $('#optGoal').value = O.goal;
  $('#optGoal').addEventListener('change', function () {
    O.goal = Math.max(1, Number(this.value) || 10); save('opts', O); paintHeader();
  });

  $('#optCustom').value = O.custom;
  $('#optCustom').addEventListener('input', function () {
    O.custom = this.value; save('opts', O);
  });

  $('#optReset').addEventListener('click', function () {
    if (!window.confirm('Erase all typing progress, stats and badges from this browser?')) return;
    S = JSON.parse(JSON.stringify(DEF_STATE));
    save('state', S);
    paintHeader(); paintKeyboard(); newDrill();
    closeSettings();
  });

  /* theme */
  function applyTheme() {
    document.body.classList.toggle('paper', O.theme === 'paper');
    document.querySelector('meta[name="theme-color"]')
      .setAttribute('content', O.theme === 'paper' ? '#F2F0EA' : '#14150F');
  }
  $('#themeBtn').addEventListener('click', function () {
    O.theme = O.theme === 'paper' ? 'plate' : 'paper';
    save('opts', O); applyTheme();
  });

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  applyTheme();
  paintHeader();
  paintKeyboard();
  newDrill();
  surface.focus();
})();
