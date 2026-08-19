/* =============================================================
   THE ARCADE — three original games on one canvas
   Reflex Rig · Circuit · Stack
   ============================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var INK = '#14150F', VIS = '#C9E82A', PAPER = '#F2F0EA',
      RED = '#D4402A', BLUE = '#4FB3D9', ORANGE = '#E8894A', PINK = '#D4508A';
  var LW = 900, LH = 540;                       /* logical canvas space */

  var cv = $('#cv'), ctx = cv.getContext('2d');
  var menu = $('#menu'), stage = $('#stage'), veil = $('#veil'),
      pads = $('#pads'), hud = $('#hud'), scoresEl = $('#scores');

  /* ---------------- storage ---------------- */
  function best(k, v) {
    try {
      if (v === undefined) return parseFloat(localStorage.getItem('sg.arcade.' + k) || '0') || 0;
      localStorage.setItem('sg.arcade.' + k, String(v));
    } catch (e) {}
    return 0;
  }

  /* ---------------- audio ---------------- */
  var soundOn = true, actx = null;
  function tone(freq, dur, type, gain) {
    if (!soundOn) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, actx.currentTime);
      g.gain.setValueAtTime(gain || 0.07, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.15));
      o.start(); o.stop(actx.currentTime + (dur || 0.15) + 0.02);
    } catch (e) {}
  }
  var soundBtn = $('#soundBtn');
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '♪ Sound on' : '♪ Sound off';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  });

  /* ---------------- canvas fitting ---------------- */
  var scale = 1;
  function fit() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cssW = cv.clientWidth || LW;
    var cssH = cssW * (LH / LW);
    cv.style.height = cssH + 'px';
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    scale = (cssW / LW) * dpr;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  function pointer(e) {
    var r = cv.getBoundingClientRect();
    var cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    var cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx * (LW / r.width), y: cy * (LH / r.height) };
  }

  /* ---------------- HUD ---------------- */
  var hudKeys = [];
  function setHud(defs) {
    hudKeys = defs;
    hud.innerHTML = defs.map(function (d) {
      return '<div><dt>' + d[1] + '</dt><dd id="hud-' + d[0] + '">' + d[2] + '</dd></div>';
    }).join('');
  }
  function hset(k, v, pop) {
    var e = $('#hud-' + k);
    if (!e) return;
    e.textContent = v;
    if (pop) { e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
  }
  function setScores(rows) {
    scoresEl.innerHTML = rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('');
  }

  /* ---------------- veil ---------------- */
  function showVeil(title, body, btn) {
    $('#veilTitle').innerHTML = title;
    $('#veilBody').innerHTML = body;
    $('#veilBtn').textContent = btn || 'Start';
    veil.hidden = false;
  }
  function hideVeil() { veil.hidden = true; }

  /* ---------------- shared draw helpers ---------------- */
  function bg() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, LW, LH);
    ctx.strokeStyle = 'rgba(242,240,234,0.05)';
    ctx.lineWidth = 1;
    var s = 45, i;
    ctx.beginPath();
    for (i = s; i < LW; i += s) { ctx.moveTo(i, 0); ctx.lineTo(i, LH); }
    for (i = s; i < LH; i += s) { ctx.moveTo(0, i); ctx.lineTo(LW, i); }
    ctx.stroke();
  }
  function label(txt, x, y, size, color, align) {
    ctx.font = '500 ' + (size || 12) + 'px "JetBrains Mono", monospace';
    ctx.fillStyle = color || 'rgba(242,240,234,0.5)';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(txt, x, y);
  }

  /* =============================================================
     GAME 01 — REFLEX RIG
     ============================================================= */
  var Reflex = (function () {
    var targets, sparks, score, hits, lives, times, spawnAt, t0, running, raf, elapsed;

    function reset() {
      targets = []; sparks = []; score = 0; hits = 0; lives = 3; times = [];
      spawnAt = 0; elapsed = 0; t0 = performance.now();
      hset('score', 0); hset('hits', 0); hset('avg', '—'); hset('lives', '♦♦♦');
    }

    function spawn() {
      var life = Math.max(900, 2100 - elapsed * 0.05);   /* ms, tightens over time */
      var r = 34 + Math.random() * 14;
      targets.push({
        x: r + 20 + Math.random() * (LW - 2 * r - 40),
        y: r + 20 + Math.random() * (LH - 2 * r - 40),
        r: r, r0: r,
        vx: (Math.random() - 0.5) * (0.05 + elapsed * 0.000012),
        vy: (Math.random() - 0.5) * (0.05 + elapsed * 0.000012),
        born: performance.now(), life: life
      });
    }

    function burst(x, y, color) {
      for (var i = 0; i < 14; i++) {
        var a = (Math.PI * 2 * i) / 14 + Math.random();
        var sp = 0.12 + Math.random() * 0.28;
        sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 480, c: color });
      }
    }

    function hit(p) {
      for (var i = targets.length - 1; i >= 0; i--) {
        var t = targets[i];
        var d = Math.hypot(p.x - t.x, p.y - t.y);
        if (d <= t.r) {
          var age = performance.now() - t.born;
          var tight = 1 - t.r / t.r0;                    /* smaller when hit = better */
          var pts = Math.round(10 + tight * 90);
          score += pts; hits++; times.push(age);
          burst(t.x, t.y, VIS);
          tone(520 + tight * 500, 0.09, 'triangle', 0.06);
          targets.splice(i, 1);
          hset('score', score, true);
          hset('hits', hits);
          hset('avg', Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) + 'ms');
          return true;
        }
      }
      /* clean miss — costs a little */
      score = Math.max(0, score - 5);
      hset('score', score);
      tone(150, 0.08, 'sawtooth', 0.04);
      return false;
    }

    function loseLife(t) {
      lives--;
      burst(t.x, t.y, RED);
      tone(120, 0.25, 'sawtooth', 0.06);
      hset('lives', lives > 0 ? new Array(lives + 1).join('♦') : '—', true);
      if (lives <= 0) end();
    }

    function end() {
      running = false;
      cancelAnimationFrame(raf);
      var avg = times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : 0;
      var b = best('reflex');
      if (score > b) { best('reflex', score); b = score; }
      setScores([
        ['Final score', '<b>' + score + '</b>'],
        ['Targets hit', hits],
        ['Average reaction', avg ? avg + ' ms' : '—'],
        ['Personal best', '<b>' + b + '</b>']
      ]);
      showVeil('Rig <i>down</i>.',
        'You scored <b style="color:' + VIS + '">' + score + '</b> with ' + hits +
        ' hits at ' + (avg || '—') + ' ms average.', 'Run again');
    }

    function frame(now) {
      var dt = Math.min(now - (frame.last || now), 50);
      frame.last = now;
      elapsed = now - t0;

      bg();

      /* reticle guides */
      ctx.strokeStyle = 'rgba(242,240,234,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(LW / 2, 0); ctx.lineTo(LW / 2, LH);
      ctx.moveTo(0, LH / 2); ctx.lineTo(LW, LH / 2);
      ctx.stroke();

      /* spawn cadence quickens */
      var gap = Math.max(430, 1150 - elapsed * 0.045);
      if (now - spawnAt > gap) { spawn(); spawnAt = now; }

      /* targets */
      for (var i = targets.length - 1; i >= 0; i--) {
        var t = targets[i];
        var age = now - t.born;
        var k = age / t.life;
        if (k >= 1) { targets.splice(i, 1); loseLife(t); continue; }

        t.x += t.vx * dt; t.y += t.vy * dt;
        if (t.x < t.r0 || t.x > LW - t.r0) t.vx *= -1;
        if (t.y < t.r0 || t.y > LH - t.r0) t.vy *= -1;
        t.r = t.r0 * (1 - k * 0.72);

        var urgent = k > 0.7;
        ctx.strokeStyle = urgent ? RED : VIS;
        ctx.lineWidth = 2;

        /* outer decay ring */
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(242,240,234,0.13)';
        ctx.stroke();

        /* live ring */
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.strokeStyle = urgent ? RED : VIS;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = urgent ? 'rgba(212,64,42,0.14)' : 'rgba(201,232,42,0.12)';
        ctx.fill();

        /* crosshair */
        ctx.beginPath();
        ctx.moveTo(t.x - t.r * 0.42, t.y); ctx.lineTo(t.x + t.r * 0.42, t.y);
        ctx.moveTo(t.x, t.y - t.r * 0.42); ctx.lineTo(t.x, t.y + t.r * 0.42);
        ctx.strokeStyle = urgent ? RED : VIS;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* sparks */
      for (var j = sparks.length - 1; j >= 0; j--) {
        var s = sparks[j];
        s.t += dt;
        if (s.t > s.life) { sparks.splice(j, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 0.0004 * dt;
        var a = 1 - s.t / s.life;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
        ctx.globalAlpha = 1;
      }

      label('ELAPSED ' + (elapsed / 1000).toFixed(1) + 'S', 16, LH - 14, 11);
      label('RIG 01', LW - 16, LH - 14, 11, 'rgba(242,240,234,0.3)', 'right');

      if (running) raf = requestAnimationFrame(frame);
    }

    return {
      title: 'Reflex Rig', sub: 'Game 01 · Reaction',
      hint: 'Click or tap the rings before they close',
      hud: [['score', 'Score', '0'], ['hits', 'Hits', '0'], ['avg', 'Avg', '—'], ['lives', 'Lives', '♦♦♦']],
      intro: ['Reflex <i>Rig</i>', 'Rings open, drift, and close. Hit each one before it shrinks away — the tighter the ring when you strike, the more it scores. Three escapes and the run ends.'],
      start: function () {
        reset(); running = true; frame.last = 0;
        setScores([['Personal best', '<b>' + (best('reflex') || '—') + '</b>']]);
        raf = requestAnimationFrame(frame);
      },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      down: function (e) { if (running) hit(pointer(e)); }
    };
  })();

  /* =============================================================
     GAME 02 — CIRCUIT
     ============================================================= */
  var Circuit = (function () {
    var seq = [], step = 0, round = 0, playing = false, accepting = false, timers = [];
    var padEls = $$('.pad', pads);
    var FREQ = [392, 523, 659, 784];

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function light(k, ms) {
      var p = padEls[k];
      p.classList.add('lit');
      tone(FREQ[k], (ms || 320) / 1000, 'sine', 0.08);
      timers.push(setTimeout(function () { p.classList.remove('lit'); }, ms || 320));
    }

    function playSeq() {
      accepting = false;
      pads.classList.add('locked');
      var gap = Math.max(220, 620 - round * 26);
      seq.forEach(function (k, i) {
        timers.push(setTimeout(function () { light(k, gap * 0.55); }, i * gap + 380));
      });
      timers.push(setTimeout(function () {
        accepting = true; step = 0;
        pads.classList.remove('locked');
        hset('turn', 'YOU');
      }, seq.length * gap + 460));
      hset('turn', 'WATCH');
    }

    function nextRound() {
      round++;
      seq.push(Math.floor(Math.random() * 4));
      hset('round', round, true);
      hset('len', seq.length);
      playSeq();
    }

    function end() {
      playing = false; accepting = false;
      clearTimers();
      pads.classList.add('locked');
      var b = best('circuit');
      var reached = round - 1;
      if (reached > b) { best('circuit', reached); b = reached; }
      setScores([
        ['Rounds cleared', '<b>' + reached + '</b>'],
        ['Sequence length', seq.length - 1],
        ['Personal best', '<b>' + b + '</b>']
      ]);
      showVeil('Circuit <i>broken</i>.',
        'You cleared <b style="color:' + VIS + '">' + reached + '</b> round' + (reached === 1 ? '' : 's') + '.',
        'Try again');
    }

    function press(k) {
      if (!accepting || !playing) return;
      light(k, 200);
      if (seq[step] === k) {
        step++;
        if (step >= seq.length) {
          accepting = false;
          pads.classList.add('locked');
          timers.push(setTimeout(nextRound, 700));
        }
      } else {
        padEls[k].classList.add('bad');
        tone(110, 0.4, 'sawtooth', 0.07);
        setTimeout(function () { padEls[k].classList.remove('bad'); }, 500);
        end();
      }
    }

    padEls.forEach(function (p, i) {
      p.addEventListener('click', function () { press(i); });
    });

    return {
      title: 'Circuit', sub: 'Game 02 · Memory',
      hint: 'Click the pads, or use Q / W / A / S',
      usesPads: true,
      hud: [['round', 'Round', '0'], ['len', 'Steps', '0'], ['turn', 'Phase', '—']],
      intro: ['<i>Circuit</i>', 'Watch the circuit fire, then repeat it exactly. Each round adds one more step and the sequence runs faster. One wrong pad ends it.'],
      start: function () {
        seq = []; step = 0; round = 0; playing = true; timers = [];
        hset('round', 0); hset('len', 0); hset('turn', '—');
        setScores([['Personal best', '<b>' + (best('circuit') || '—') + '</b>']]);
        bg();
        timers.push(setTimeout(nextRound, 400));
      },
      stop: function () { playing = false; accepting = false; clearTimers(); },
      key: function (e) {
        var map = { q: 0, w: 1, a: 2, s: 3 };
        var k = map[e.key.toLowerCase()];
        if (k !== undefined) { e.preventDefault(); press(k); }
      }
    };
  })();

  /* =============================================================
     GAME 03 — STACK
     ============================================================= */
  var Stack = (function () {
    var slabs, live, score, height, streak, running, raf, cam, camTo, debris, over;
    var BH = 34;                                   /* slab height */

    function reset() {
      slabs = [{ x: LW / 2 - 150, w: 300, y: LH - 90 }];
      debris = []; score = 0; height = 0; streak = 0; cam = 0; camTo = 0; over = false;
      spawn();
      hset('height', 0); hset('score', 0); hset('streak', 0);
    }

    function spawn() {
      var top = slabs[slabs.length - 1];
      var dir = slabs.length % 2 === 0 ? 1 : -1;
      var speed = Math.min(0.88, 0.40 + slabs.length * 0.015);
      live = {
        x: dir > 0 ? -top.w : LW, w: top.w,
        y: top.y - BH, dir: dir, speed: speed
      };
    }

    function drop() {
      if (!running || over || !live) return;
      var top = slabs[slabs.length - 1];
      var left = Math.max(live.x, top.x);
      var right = Math.min(live.x + live.w, top.x + top.w);
      var overlap = right - left;

      if (overlap <= 0) {
        debris.push({ x: live.x, y: live.y, w: live.w, vy: 0, vx: live.dir * 0.15, rot: 0 });
        tone(90, 0.45, 'sawtooth', 0.07);
        end();
        return;
      }

      var offset = Math.abs(live.x - top.x);
      var perfect = offset < 5;

      if (perfect) {
        streak++;
        score += 10 + streak * 5;
        /* reward precision: give a little width back */
        left = top.x; overlap = Math.min(top.w + 6, live.w + 6);
        tone(880 + streak * 40, 0.14, 'triangle', 0.08);
      } else {
        streak = 0;
        score += 10;
        tone(330, 0.1, 'square', 0.05);
        /* the overhang is sliced off and falls */
        if (live.x < left) debris.push({ x: live.x, y: live.y, w: left - live.x, vy: 0, vx: -0.12, rot: 0 });
        var rEdge = live.x + live.w;
        if (rEdge > right) debris.push({ x: right, y: live.y, w: rEdge - right, vy: 0, vx: 0.12, rot: 0 });
      }

      slabs.push({ x: left, w: overlap, y: live.y });
      height++;
      hset('height', height, true);
      hset('score', score);
      hset('streak', streak);

      if (overlap < 10) { end(); return; }

      /* pan the camera once the tower climbs past mid-screen */
      if (live.y - cam < LH * 0.42) camTo += BH;

      spawn();
    }

    function end() {
      over = true;
      var b = best('stack');
      if (score > b) { best('stack', score); b = score; }
      setScores([
        ['Slabs placed', '<b>' + height + '</b>'],
        ['Score', '<b>' + score + '</b>'],
        ['Personal best', '<b>' + b + '</b>']
      ]);
      setTimeout(function () {
        running = false;
        cancelAnimationFrame(raf);
        showVeil('Tower <i>down</i>.',
          'You stacked <b style="color:' + VIS + '">' + height + '</b> slabs for ' + score + ' points.',
          'Build again');
      }, 700);
    }

    function frame(now) {
      var dt = Math.min(now - (frame.last || now), 50);
      frame.last = now;

      bg();
      cam += (camTo - cam) * 0.09;

      ctx.save();
      ctx.translate(0, cam);

      /* ground datum */
      ctx.strokeStyle = 'rgba(242,240,234,0.2)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, LH - 56); ctx.lineTo(LW, LH - 56);
      ctx.stroke();
      ctx.setLineDash([]);

      /* placed slabs */
      slabs.forEach(function (s, i) {
        var t = i / Math.max(slabs.length, 1);
        ctx.fillStyle = i === slabs.length - 1 ? VIS : 'rgba(242,240,234,' + (0.90 - t * 0.55) + ')';
        ctx.fillRect(s.x, s.y, s.w, BH - 3);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x, s.y, s.w, BH - 3);
        if (s.w > 54) {
          label(String(i + 1).padStart(2, '0'), s.x + 7, s.y + BH - 13, 10, 'rgba(20,21,15,0.55)');
        }
      });

      /* the moving slab */
      if (live && !over) {
        live.x += live.dir * live.speed * dt;
        if (live.dir > 0 && live.x > LW) live.dir = -1;
        if (live.dir < 0 && live.x + live.w < 0) live.dir = 1;

        ctx.fillStyle = VIS;
        ctx.fillRect(live.x, live.y, live.w, BH - 3);
        ctx.strokeStyle = INK;
        ctx.strokeRect(live.x, live.y, live.w, BH - 3);

        /* drop guide */
        var top = slabs[slabs.length - 1];
        ctx.strokeStyle = 'rgba(201,232,42,0.28)';
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(top.x, live.y); ctx.lineTo(top.x, top.y);
        ctx.moveTo(top.x + top.w, live.y); ctx.lineTo(top.x + top.w, top.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      /* falling offcuts */
      for (var i = debris.length - 1; i >= 0; i--) {
        var d = debris[i];
        d.vy += 0.0016 * dt;
        d.y += d.vy * dt; d.x += d.vx * dt; d.rot += 0.002 * dt;
        if (d.y > LH + 200 - cam) { debris.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(d.x + d.w / 2, d.y + BH / 2);
        ctx.rotate(d.rot);
        ctx.fillStyle = 'rgba(212,64,42,0.85)';
        ctx.fillRect(-d.w / 2, -BH / 2, d.w, BH - 3);
        ctx.restore();
      }

      ctx.restore();

      label('HEIGHT ' + height, 16, LH - 14, 11);
      if (streak > 1) label('PERFECT ×' + streak, LW - 16, LH - 14, 11, VIS, 'right');

      if (running) raf = requestAnimationFrame(frame);
    }

    return {
      title: 'Stack', sub: 'Game 03 · Precision',
      hint: 'Click, tap or press Space to drop',
      hud: [['height', 'Slabs', '0'], ['score', 'Score', '0'], ['streak', 'Perfect', '0']],
      intro: ['<i>Stack</i>', 'A slab slides above the tower. Drop it square on the one below — anything that hangs over gets cut away and falls. Land it dead centre and you keep your width.'],
      start: function () {
        reset(); running = true; frame.last = 0;
        setScores([['Personal best', '<b>' + (best('stack') || '—') + '</b>']]);
        raf = requestAnimationFrame(frame);
      },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      down: function () { drop(); },
      key: function (e) {
        if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); drop(); }
      }
    };
  })();

  /* =============================================================
     ROUTER
     ============================================================= */
  var GAMES = { reflex: Reflex, circuit: Circuit, stack: Stack };
  var active = null;

  function open(name) {
    active = GAMES[name];
    if (!active) return;

    menu.hidden = true;
    stage.hidden = false;
    $('#stageTitle').textContent = active.title;
    $('#stageSub').textContent = active.sub;
    $('#hint').textContent = active.hint;
    setHud(active.hud);
    setScores([]);

    pads.hidden = !active.usesPads;
    cv.style.display = active.usesPads ? 'none' : 'block';
    if (!active.usesPads) fit();

    showVeil(active.intro[0], active.intro[1], 'Start');
    location.hash = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function close() {
    if (active && active.stop) active.stop();
    active = null;
    stage.hidden = true;
    menu.hidden = false;
    hideVeil();
    if (location.hash) history.replaceState(null, '', location.pathname);
    paintCards();
  }

  $$('.acard').forEach(function (c) {
    c.addEventListener('click', function () { open(c.getAttribute('data-game')); });
  });
  $('#backBtn').addEventListener('click', close);
  $('#restartBtn').addEventListener('click', function () {
    if (!active) return;
    active.stop(); hideVeil(); active.start();
  });
  $('#veilBtn').addEventListener('click', function () {
    if (!active) return;
    hideVeil(); active.stop(); active.start();
  });

  cv.addEventListener('pointerdown', function (e) {
    if (active && active.down && veil.hidden) { e.preventDefault(); active.down(e); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && active) { close(); return; }
    if (!active || !veil.hidden) return;
    if (active.key) active.key(e);
  });
  window.addEventListener('resize', function () { if (active && !active.usesPads) fit(); });

  /* =============================================================
     MENU CARD ART — tiny animated previews
     ============================================================= */
  function paintCards() {
    $$('[data-best]').forEach(function (b) {
      var v = best(b.getAttribute('data-best'));
      b.textContent = v ? v : '—';
    });
  }

  function cardArt() {
    $$('[data-art]').forEach(function (c) {
      var g = c.getContext('2d'), kind = c.getAttribute('data-art');
      var W = c.width, H = c.height, t = 0;

      (function loop() {
        t += 0.016;
        g.fillStyle = INK; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(242,240,234,0.06)'; g.lineWidth = 1;
        g.beginPath();
        for (var i = 20; i < W; i += 20) { g.moveTo(i, 0); g.lineTo(i, H); }
        for (var j = 20; j < H; j += 20) { g.moveTo(0, j); g.lineTo(W, j); }
        g.stroke();

        if (kind === 'reflex') {
          for (var k = 0; k < 3; k++) {
            var ph = (t * 0.5 + k * 0.33) % 1;
            var x = W * (0.25 + 0.25 * k) + Math.sin(t + k) * 12;
            var y = H * 0.5 + Math.cos(t * 0.8 + k * 2) * 26;
            var r = 26 * (1 - ph * 0.7);
            g.beginPath(); g.arc(x, y, 26, 0, 6.284);
            g.strokeStyle = 'rgba(242,240,234,0.12)'; g.lineWidth = 1; g.stroke();
            g.beginPath(); g.arc(x, y, r, 0, 6.284);
            g.strokeStyle = ph > 0.72 ? RED : VIS; g.lineWidth = 2; g.stroke();
          }
        } else if (kind === 'circuit') {
          var lit = Math.floor(t * 1.6) % 4;
          var cols = [VIS, BLUE, ORANGE, PINK];
          for (var p = 0; p < 4; p++) {
            var px = 40 + (p % 2) * 122, py = 26 + Math.floor(p / 2) * 76;
            g.fillStyle = p === lit ? cols[p] : 'rgba(242,240,234,0.09)';
            g.fillRect(px, py, 112, 66);
            g.strokeStyle = 'rgba(242,240,234,0.16)'; g.lineWidth = 1;
            g.strokeRect(px, py, 112, 66);
          }
        } else {
          var n = 7;
          for (var s = 0; s < n; s++) {
            var w = 150 - s * 14;
            var off = Math.sin(t * 0.9 + s * 0.5) * (s === n - 1 ? 42 : 5);
            var sx = W / 2 - w / 2 + off, sy = H - 26 - s * 22;
            g.fillStyle = s === n - 1 ? VIS : 'rgba(242,240,234,' + (0.8 - s * 0.09) + ')';
            g.fillRect(sx, sy, w, 19);
            g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(sx, sy, w, 19);
          }
        }
        requestAnimationFrame(loop);
      })();
    });
  }

  paintCards();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) cardArt();

  /* deep link: games.html#stack */
  var h = location.hash.replace('#', '');
  if (GAMES[h]) open(h);
})();
