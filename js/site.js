/* =============================================================
   DRAWING SET — site behaviour
   ============================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- year ---------- */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- marquee ---------- */
  var strip = $('#strip');
  if (strip) {
    var words = [
      'Primavera P6', 'Project Controls', 'Tamakoshi V · 99.8 MW', 'Baseline & Variance',
      'Hydropower Delivery', 'CPM Scheduling', 'Site Coordination', 'Dolakha, Nepal',
      'Progress Reporting', 'Civil Engineering'
    ];
    var run = words.concat(words).map(function (w) { return '<span>' + w + '</span>'; }).join('');
    strip.innerHTML = run;
  }

  /* ---------- top bar state ---------- */
  var topbar = $('#topbar');
  var onScrollBar = function () {
    if (topbar) topbar.classList.toggle('is-stuck', window.scrollY > 40);
  };
  onScrollBar();

  /* ---------- mobile drawer ---------- */
  var burger = $('#burger');
  var drawer = $('#drawer');
  if (burger && drawer) {
    var setDrawer = function (open) {
      drawer.classList.toggle('is-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setDrawer(!drawer.classList.contains('is-open'));
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { setDrawer(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) setDrawer(false);
    });
  }

  /* ---------- sheet rail + active section ---------- */
  var sections = $$('main section[id]');
  var railTicks = $('#railTicks');
  var navLinks = $$('#nav a[href^="#"]');

  if (railTicks) {
    railTicks.innerHTML = sections.map(function (s, i) {
      var n = String(i).padStart(2, '0');
      return '<a class="rail__tick" href="#' + s.id + '" data-for="' + s.id + '" title="' + s.id + '">' + n + '</a>';
    }).join('');
  }
  var ticks = $$('.rail__tick');

  var syncActive = function () {
    var mid = window.scrollY + window.innerHeight * 0.32;
    var current = sections[0] ? sections[0].id : '';
    sections.forEach(function (s) {
      if (s.offsetTop <= mid) current = s.id;
    });
    ticks.forEach(function (t) {
      t.classList.toggle('is-here', t.getAttribute('data-for') === current);
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('is-here', a.getAttribute('href') === '#' + current);
    });
  };

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScrollBar();
      syncActive();
      ticking = false;
    });
  }, { passive: true });
  syncActive();

  /* ---------- reveal on scroll ---------- */
  var revealTargets = $$('.rise');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* hero marks light up immediately */
  $$('.hero .mark').forEach(function (m) {
    setTimeout(function () { m.classList.add('is-lit'); }, 900);
  });

  /* ---------- Gantt rows ---------- */
  $$('.gantt__row').forEach(function (row) {
    var toggle = function () {
      var open = row.classList.toggle('is-open');
      row.setAttribute('aria-expanded', String(open));
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  /* ---------- contact form → mail client ---------- */
  var form = $('#contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      var msg = $('#formMsg');

      if (!f.name.value.trim() || !f.email.value.trim() || !f.message.value.trim()) {
        msg.textContent = '⚠ Fill in your name, email and message first.';
        return;
      }
      var subject = f.subject.value.trim() || 'Portfolio enquiry';
      var body = 'Name: ' + f.name.value.trim() +
                 '\nEmail: ' + f.email.value.trim() +
                 '\n\n' + f.message.value.trim();
      window.location.href = 'mailto:shitalghimire817@gmail.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
      msg.textContent = '✓ Opening your email client…';
      setTimeout(function () { msg.textContent = ''; }, 6000);
    });
  }

  /* =============================================================
     HERO — topographic contour field
     A smooth value-noise surface traced with marching squares, so
     the background reads as a real contour survey rather than
     decorative blobs. Drifts slowly; static under reduced-motion.
     ============================================================= */
  var canvas = $('#topo');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  /* --- deterministic value noise --- */
  var PERM = (function () {
    var p = new Uint8Array(512), i;
    var seed = 1337;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var base = [];
    for (i = 0; i < 256; i++) base[i] = i;
    for (i = 255; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = base[i]; base[i] = base[j]; base[j] = t;
    }
    for (i = 0; i < 512; i++) p[i] = base[i & 255];
    return p;
  })();

  var fade = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var grad = function (h, x, y) {
    switch (h & 3) {
      case 0: return  x + y;
      case 1: return -x + y;
      case 2: return  x - y;
      default: return -x - y;
    }
  };
  var noise2 = function (x, y) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    var u = fade(x), v = fade(y);
    var A = PERM[X] + Y, B = PERM[X + 1] + Y;
    return lerp(
      lerp(grad(PERM[A], x, y),     grad(PERM[B], x - 1, y), u),
      lerp(grad(PERM[A + 1], x, y - 1), grad(PERM[B + 1], x - 1, y - 1), u),
      v
    );
  };
  var fbm = function (x, y, z) {
    var v = 0, amp = 1, freq = 1, i;
    for (i = 0; i < 4; i++) {
      v += amp * noise2(x * freq + z, y * freq - z * 0.6);
      amp *= 0.5; freq *= 2.05;
    }
    return v;
  };

  var COLS = 46, ROWS = 30;
  var field = new Float32Array((COLS + 1) * (ROWS + 1));
  var W = 0, H = 0, cw = 0, ch = 0, dpr = 1;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cw = W / COLS;
    ch = H / ROWS;
  }

  function sample(z) {
    for (var j = 0; j <= ROWS; j++) {
      for (var i = 0; i <= COLS; i++) {
        field[j * (COLS + 1) + i] = fbm(i / 9.5, j / 9.5, z);
      }
    }
  }

  /* marching squares: trace one iso-level across the grid */
  function traceLevel(level) {
    ctx.beginPath();
    for (var j = 0; j < ROWS; j++) {
      for (var i = 0; i < COLS; i++) {
        var a = field[j * (COLS + 1) + i];
        var b = field[j * (COLS + 1) + i + 1];
        var c = field[(j + 1) * (COLS + 1) + i + 1];
        var d = field[(j + 1) * (COLS + 1) + i];

        var idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) |
                  (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;

        var x0 = i * cw, y0 = j * ch, x1 = x0 + cw, y1 = y0 + ch;
        var t;
        /* interpolated midpoints on each edge */
        t = (level - a) / (b - a); var top    = [x0 + cw * t, y0];
        t = (level - b) / (c - b); var right  = [x1, y0 + ch * t];
        t = (level - d) / (c - d); var bottom = [x0 + cw * t, y1];
        t = (level - a) / (d - a); var left   = [x0, y0 + ch * t];

        var seg = function (p, q) {
          ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
        };
        switch (idx) {
          case 1: case 14: seg(left, bottom); break;
          case 2: case 13: seg(bottom, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 5:          seg(left, top); seg(bottom, right); break;
          case 6: case 9:  seg(top, bottom); break;
          case 7: case 8:  seg(left, top); break;
          case 10:         seg(left, bottom); seg(top, right); break;
        }
      }
    }
    ctx.stroke();
  }

  var LEVELS = [-1.15, -0.85, -0.55, -0.28, 0, 0.28, 0.55, 0.85, 1.15];

  function paint(z) {
    ctx.clearRect(0, 0, W, H);
    sample(z);
    for (var k = 0; k < LEVELS.length; k++) {
      var lv = LEVELS[k];
      /* index contours (every 3rd) drawn heavier, like a real survey */
      var isIndex = k % 3 === 0;
      ctx.lineWidth = isIndex ? 1.15 : 0.6;
      ctx.strokeStyle = isIndex
        ? 'rgba(22,23,15,0.30)'
        : 'rgba(22,23,15,0.15)';
      traceLevel(lv);
    }
    /* one hi-vis contour — the design's signature line */
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(166,197,17,0.55)';
    traceLevel(0.28);
  }

  var z = 0, raf = null;
  function frame() {
    z += 0.0016;
    paint(z);
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    size();
    if (reduceMotion) { paint(0); return; }
    if (raf) window.cancelAnimationFrame(raf);
    frame();
  }

  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(start, 180);
  });

  /* pause the field when the hero scrolls away — saves battery */
  if ('IntersectionObserver' in window && !reduceMotion) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (!raf) frame();
        } else if (raf) {
          window.cancelAnimationFrame(raf); raf = null;
        }
      });
    }, { threshold: 0.02 }).observe(canvas);
  }

  start();
})();
