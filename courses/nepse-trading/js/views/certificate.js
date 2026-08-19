/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — the certificate
   The one place the course leaves the dark theme. Cream paper, the
   contour texture at 4%, and the learner's own Equity Curve as the
   central graphic.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from '../app.js';
import * as state from '../state.js';
import { el, frag, num, fmtDate, toBS, announce } from '../util.js';
import { buildCandles, shareImage } from '../equity-curve.js';

export function certificate() {
  const { modules: M } = ctx;
  const s = state.load();
  const unlocked = state.certificateUnlocked(M.modules);
  const prog = state.courseProgress(M.modules);

  if (!unlocked) {
    const bosses = M.modules.filter(m => m.bossQuizAfter);
    return el('div.msg', [
      el('h2', 'The certificate is locked'),
      el('p', 'It unlocks at 100% lesson completion with all four boss quizzes passed. No shortcuts — a certificate ' +
              'you can get without finishing is not worth printing.'),
      el('div.panel', { style: { maxWidth: '420px', margin: '0 auto', textAlign: 'left' } }, [
        el('div.spread', { style: { marginBottom: 'var(--s3)' } }, [
          el('span.kicker', 'Lessons'),
          el('span.num', { style: { fontSize: 'var(--t-sm)' } }, `${prog.done} / ${prog.total}`)
        ]),
        el('div.railrow', { style: { marginBottom: 'var(--s5)' } }, [
          el('div.rail', el('div.rail__fill', { style: { width: (prog.pct * 100).toFixed(1) + '%' } })),
          el('span.pct', Math.round(prog.pct * 100) + '%')
        ]),
        el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'Boss quizzes'),
        ...bosses.map(m => {
          const lv = M.levels.find(l => l.modules.includes(m.n));
          const ok = state.quizPassed('boss' + m.n, true);
          return el('div.spread', { style: { padding: '6px 0' } }, [
            el('span', { style: { fontSize: 'var(--t-sm)', color: ok ? 'var(--paper)' : 'var(--paper-3)' } },
              `Level ${lv.roman} — ${lv.name}`),
            el('span.pill', { class: 'pill ' + (ok ? 'pill--bull' : '') }, ok ? '✓ passed' : 'not passed')
          ]);
        })
      ]),
      el('p', { style: { marginTop: 'var(--s5)' } }, el('a.btn', { href: '#/' }, 'Back to the dashboard'))
    ]);
  }

  const rank = state.rankFor(M.levels, s.xp);
  const wrap = el('div');

  /* name entry, stored locally */
  const nameInput = el('input.cert__nameinput', {
    type: 'text',
    value: s.learnerName || '',
    placeholder: 'Type your full name',
    'aria-label': 'Your name for the certificate',
    oninput: e => {
      const st = state.load();
      st.learnerName = e.target.value;
      state.save(st);
      nameEl.textContent = e.target.value || 'Your Name';
    }
  });

  wrap.append(el('div.panel.noprint', { style: { marginBottom: 'var(--s5)' } }, [
    el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'Your name on the certificate'),
    nameInput,
    el('p.widget__note', 'Stored in this browser only — it is never sent anywhere.')
  ]));

  const nameEl = el('div.cert__name', s.learnerName || 'Your Name');

  /* the curve, drawn on cream */
  const curveCanvas = el('canvas', { role: 'img', 'aria-label': 'Your equity curve across the course.' });
  const cert = el('div.cert', [
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' } }, [
      el('div', [
        el('div.cert__k', 'Certificate of completion'),
        el('div.cert__t', 'NEPSE Trading Academy')
      ]),
      el('div.cert__seal', ['NEPSE', el('br'), 'ACADEMY'])
    ]),

    nameEl,
    el('p', { style: { color: '#5C5344', fontSize: '0.95rem' } },
      'has completed all sixteen modules, seventy-eight lessons and four boss quizzes of the NEPSE Trading Academy.'),

    el('hr.cert__rule'),

    el('div.cert__chart', el('div', { style: { padding: '10px' } }, curveCanvas)),
    el('p', { style: { fontFamily: 'var(--f-data)', fontSize: '0.625rem', letterSpacing: '0.12em', color: '#7A6E5D', textTransform: 'uppercase', marginTop: '-8px' } },
      'The holder\'s own equity curve — one candle per study session'),

    el('hr.cert__rule'),

    el('div.cert__grid', [
      certStat('Rank', rank.rank),
      certStat('Total XP', num(s.xp, 0)),
      certStat('Completed', fmtDate(Date.now())),
      certStat('Bikram Sambat', toBS(Date.now()))
    ]),

    el('p.cert__disc',
      'This certificate records completion of a self-study course. It is not a licence, a qualification, or investment advice.'),

    el('p', {
      style: {
        fontFamily: 'var(--f-data)', fontSize: '0.5625rem', letterSpacing: '0.1em',
        color: '#8A7E6D', marginTop: '14px', textTransform: 'uppercase'
      }
    }, '© 2026 Shital Ghimire · NEPSE Trading Academy · All rights reserved')
  ]);

  wrap.append(cert);

  /* draw the curve on the cream ground */
  requestAnimationFrame(() => {
    const candles = buildCandles(s.equityEvents, M.levels);
    const W = curveCanvas.parentElement.clientWidth || 700, H = 200;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    curveCanvas.width = W * dpr; curveCanvas.height = H * dpr;
    curveCanvas.style.width = W + 'px'; curveCanvas.style.height = H + 'px';
    const c = curveCanvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (candles.length < 2) return;
    let lo = Infinity, hi = -Infinity;
    for (const k of candles) { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); }
    const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
    const X = i => 10 + (i / Math.max(1, candles.length - 1)) * (W - 20);
    const Y = v => 10 + (1 - (v - lo) / (hi - lo)) * (H - 20);
    const bw = Math.max(2, Math.min(12, (W - 20) / candles.length * 0.6));
    c.strokeStyle = 'rgba(26,23,18,0.12)';
    for (let i = 0; i <= 4; i++) {
      const y = Math.round(10 + (H - 20) * i / 4) + .5;
      c.beginPath(); c.moveTo(10, y); c.lineTo(W - 10, y); c.stroke();
    }
    candles.forEach((k, i) => {
      const up = k.c >= k.o;
      c.strokeStyle = c.fillStyle = up ? '#1B7A63' : '#A33146';
      c.lineWidth = 1.2;
      const x = Math.round(X(i)) + .5;
      c.beginPath(); c.moveTo(x, Y(k.h)); c.lineTo(x, Y(k.l)); c.stroke();
      const t = Y(Math.max(k.o, k.c)), b = Y(Math.min(k.o, k.c));
      if (up) c.strokeRect(x - bw / 2, t, bw, Math.max(1, b - t));
      else c.fillRect(x - bw / 2, t, bw, Math.max(1, b - t));
    });
  });

  /* actions */
  wrap.append(el('div.row.noprint', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
    el('button.btn.btn--primary', { onclick: () => window.print() }, '⎙ Print / save as PDF'),
    el('button.btn', {
      onclick: () => {
        const cv = shareImage(M.levels);
        cv.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = el('a', { href: url, download: 'my-nepse-equity-curve.png' });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          announce('Share image downloaded.');
        }, 'image/png');
      }
    }, '↓ Download share image (1200×630)'),
    el('a.btn', { href: '#/' }, 'Dashboard')
  ]));

  state.grant('full-float');

  return wrap;
}

function certStat(label, value) {
  return el('div', [el('span', label), el('b', value)]);
}
