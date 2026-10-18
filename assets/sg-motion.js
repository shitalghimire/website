/* ==========================================================================
   SHITAL GHIMIRE — 3D OBJECTS, MOTION GRAPHICS & ICON INJECTOR
   Attaches non-destructively to existing DOM elements on shitalghimire.com.np
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const ACCENT = '#84cc16'; // Matches existing lime/chartreuse engineering highlight
  const INK = 'rgba(20, 20, 19, 0.20)';

  // 1. HERO 3D WIREFRAME FRANCIS TURBINE RUNNER
  const heroSection = document.querySelector('section, main > *:first-child') || document.body;
  if (heroSection && !document.getElementById('sg-hero-3d-canvas')) {
    if (getComputedStyle(heroSection).position === 'static') {
      heroSection.style.position = 'relative';
    }
    const canvas = document.createElement('canvas');
    canvas.id = 'sg-hero-3d-canvas';
    heroSection.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;

    const resize = () => {
      const rect = heroSection.getBoundingClientRect();
      width = canvas.width = rect.width || window.innerWidth;
      height = canvas.height = rect.height || 640;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.55;
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.55;
    });

    const nodes = [], edges = [], segs = 18;
    const rings = [{ r: 52, z: -30 }, { r: 108, z: 0 }, { r: 84, z: 34 }];
    rings.forEach((ring, rIdx) => {
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2 + rIdx * 0.24;
        nodes.push({ x: Math.cos(a) * ring.r, y: Math.sin(a) * ring.r, z: ring.z });
        const curr = rIdx * segs + i, next = rIdx * segs + ((i + 1) % segs);
        edges.push([curr, next]);
        if (rIdx > 0) {
          edges.push([curr, (rIdx - 1) * segs + i]);
          edges.push([curr, (rIdx - 1) * segs + ((i + 1) % segs)]);
        }
      }
    });

    let angleZ = 0;
    const renderTurbine = () => {
      ctx.clearRect(0, 0, width, height);
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;
      angleZ += 0.004;

      const cx = width * 0.68, cy = height * 0.46;
      const rx = 0.68 + mouseY, ry = -0.32 + mouseX;

      const projected = nodes.map(p => {
        const x1 = p.x * Math.cos(angleZ) - p.y * Math.sin(angleZ);
        const y1 = p.x * Math.sin(angleZ) + p.y * Math.cos(angleZ);
        const y2 = y1 * Math.cos(rx) - p.z * Math.sin(rx);
        const z2 = y1 * Math.sin(rx) + p.z * Math.cos(rx);
        const x3 = x1 * Math.cos(ry) + z2 * Math.sin(ry);
        const z3 = -x1 * Math.sin(ry) + z2 * Math.cos(ry);
        const fov = 360 / (360 + z3);
        return { x: cx + x3 * fov * 1.4, y: cy + y2 * fov * 1.4 };
      });

      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      edges.forEach(([i, j]) => {
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[j].x, projected[j].y);
      });
      ctx.stroke();

      ctx.fillStyle = ACCENT;
      projected.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.1, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(renderTurbine);
    };
    renderTurbine();
  }

  // 2. 3D PERSPECTIVE TILT ON EXISTING PORTRAIT & SITE PHOTOS
  document.querySelectorAll('img').forEach(img => {
    const card = img.parentElement || img;
    card.classList.add('sg-tilt-card');
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(850px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateZ(4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(850px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
    });
  });

  // 3. SHT 02 CAPABILITY CARDS (2.01 - 2.07) — CORNER MOTION GRAPHICS
  const capabilitySVGs = {
    '2.01': `<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="8" width="14" height="6" rx="1"/><rect x="16" y="19" width="16" height="6" rx="1" stroke="${ACCENT}"/><rect x="24" y="30" width="16" height="6" rx="1"/><path class="sg-anim-flow" d="M18 11 H24 V19 M32 22 H36 V30" stroke="${ACCENT}"/></svg>`,
    '2.02': `<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="6" y1="36" x2="38" y2="36" opacity="0.35"/><line x1="6" y1="8" x2="6" y2="36" opacity="0.35"/><path d="M6 34 C16 34, 24 12, 38 10" stroke-dasharray="3 3" opacity="0.5"/><path class="sg-anim-flow" d="M6 34 C14 30, 22 16, 38 8" stroke="${ACCENT}" stroke-width="2.2"/></svg>`,
    '2.03': `<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.3"><g class="sg-anim-spin"><circle cx="22" cy="22" r="14" stroke-dasharray="6 4"/><line x1="22" y1="4" x2="22" y2="12"/><line x1="22" y1="32" x2="22" y2="40"/><line x1="4" y1="22" x2="12" y2="22"/><line x1="32" y1="22" x2="40" y2="22"/></g><circle cx="22" cy="22" r="3" fill="${ACCENT}" stroke="none"/></svg>`,
    '2.04': `<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="8,12 18,12 24,36 8,36" opacity="0.45"/><path class="sg-anim-flow" d="M4 10 H18 C24 10, 26 32, 38 34" stroke="${ACCENT}" stroke-width="2.2"/></svg>`,
    '2.05': `<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M8 12 H36 M8 22 H36 M8 32 H36 M14 8 V36 M24 8 V36 M34 8 V36" opacity="0.3"/><line class="sg-anim-scan" x1="6" y1="10" x2="38" y2="10" stroke="${ACCENT}" stroke-width="2.2"/></svg>`,
    '2.06': `<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="13" y="15" width="18" height="18" rx="1"/><path class="sg-anim-scan" d="M22 4 V13 M18 10 L22 14 L26 10" stroke="${ACCENT}"/><line x1="9" y1="36" x2="35" y2="36"/></svg>`,
    '2.07': `<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4"><polygon points="22,7 38,15 22,23 6,15" stroke="${ACCENT}"/><polyline points="6,22 22,30 38,22" opacity="0.7"/><polyline points="6,29 22,37 38,29" opacity="0.4"/></svg>`
  };

  document.querySelectorAll('*').forEach(el => {
    const txt = (el.textContent || '').trim();
    if (capabilitySVGs[txt] && el.children.length === 0) {
      const card = el.closest('article, div, li');
      if (card && !card.querySelector('.sg-corner-motion')) {
        card.classList.add('sg-cap-card-host');
        const wrap = document.createElement('div');
        wrap.className = 'sg-corner-motion';
        wrap.innerHTML = capabilitySVGs[txt];
        card.appendChild(wrap);
      }
    }
    if (txt === 'IN PROGRESS' && el.children.length === 0) {
      el.classList.add('sg-live-pulse');
    }
  });

  // 4. PRECISION ENGINEERING VECTOR ICONS FOR 6.01 - 6.11
  const toolIconMap = {
    '6.01': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><path d="M12 3L3 8l9 5 9-5-9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    '6.02': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16M8 3v18M16 3v18"/></svg>',
    '6.03': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><path d="M3 7h18M5 7l-2 5h4L5 7zm14 0l-2 5h4l-2-5z"/><path d="M3 14c6 6 12 6 18 0"/></svg>',
    '6.04': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m0 6v6M3 12h6m6 0h6"/></svg>',
    '6.05': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><path d="M16 3l4 4-4 4M20 7H4m4 14l-4-4 4-4m-4 4h16"/></svg>',
    '6.06': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/></svg>',
    '6.07': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><path d="M3 6h10M9 12h12M6 18h9"/></svg>',
    '6.08': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    '6.09': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><path d="M17.5 19H7a4 4 0 0 1 0-8 5 5 0 0 1 9.7-1.5A3.5 3.5 0 1 1 17.5 19z"/></svg>',
    '6.10': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    '6.11': '<svg class="sg-inline-icon" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>'
  };

  document.querySelectorAll('button, a, [role="tab"]').forEach(btn => {
    const t = (btn.textContent || '').trim();
    Object.keys(toolIconMap).forEach(code => {
      if (t.includes(code) && !btn.querySelector('.sg-inline-icon')) {
        btn.insertAdjacentHTML('afterbegin', toolIconMap[code]);
      }
    });
  });

  // 5. LIVE 3D CONCRETE BLOCK & BEAM BMD VISUALIZERS IN SHT 06
  document.querySelectorAll('h3, h4, div').forEach(heading => {
    const text = (heading.textContent || '').trim();
    if (text === 'Concrete Volume & Mix' && !heading.parentElement.querySelector('.sg-calc-visualizer')) {
      const box = document.createElement('div');
      box.className = 'sg-calc-visualizer';
      box.innerHTML = `<div class="sg-calc-visualizer-label">LIVE 3D ISOMETRIC ELEMENT PREVIEW</div><canvas id="sg-concrete-3d" width="260" height="110"></canvas>`;
      heading.parentElement.appendChild(box);
      const cCanvas = box.querySelector('#sg-concrete-3d');
      const cCtx = cCanvas.getContext('2d');
      let rot = 0.5;
      const drawBlock = () => {
        cCtx.clearRect(0, 0, 260, 110);
        rot += 0.007;
        const panel = heading.closest('.bay__panel') || heading.parentElement;
        const inputs = panel.querySelectorAll('input[type="number"]');
        const L = Math.min(55, Math.max(18, (parseFloat(inputs[0]?.value) || parseFloat(inputs[0]?.placeholder) || 4) * 8));
        const W = Math.min(45, Math.max(15, (parseFloat(inputs[1]?.value) || parseFloat(inputs[1]?.placeholder) || 3) * 8));
        const D = Math.min(35, Math.max(10, (parseFloat(inputs[2]?.value) || parseFloat(inputs[2]?.placeholder) || 1.2) * 12));
        const pts = [[-L,-D,-W],[L,-D,-W],[L,-D,W],[-L,-D,W],[-L,D,-W],[L,D,-W],[L,D,W],[-L,D,W]].map(([x,y,z]) => {
          const rx = x * Math.cos(rot) - z * Math.sin(rot);
          const rz = x * Math.sin(rot) + z * Math.cos(rot);
          return [130 + rx, 55 + y * 0.8 + rz * 0.35];
        });
        const links = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        cCtx.strokeStyle = '#141413';
        cCtx.lineWidth = 1.3;
        cCtx.beginPath();
        links.forEach(([a,b]) => { cCtx.moveTo(pts[a][0], pts[a][1]); cCtx.lineTo(pts[b][0], pts[b][1]); });
        cCtx.stroke();
        requestAnimationFrame(drawBlock);
      };
      drawBlock();
    }

    if (text === 'Simply Supported Beam' && !heading.parentElement.querySelector('.sg-calc-visualizer')) {
      const box = document.createElement('div');
      box.className = 'sg-calc-visualizer';
      box.innerHTML = `
        <div class="sg-calc-visualizer-label">LIVE DEFLECTION & BENDING MOMENT CURVE</div>
        <svg viewBox="0 0 260 84" width="260" height="84" fill="none">
          <line x1="18" y1="20" x2="242" y2="20" stroke="#141413" stroke-width="2.2"/>
          <polygon points="18,22 12,32 24,32" fill="#84cc16"/>
          <polygon points="242,22 236,32 248,32" fill="#84cc16"/>
          <path class="sg-anim-flow" d="M 18 20 Q 130 78 242 20" stroke="#141413" stroke-width="1.8" fill="rgba(132, 204, 22, 0.18)"/>
        </svg>
      `;
      heading.parentElement.appendChild(box);
    }
  });

  // 6. SMOOTH SCROLL REVEAL
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('sg-reveal-visible');
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('section, article').forEach(sec => {
    sec.classList.add('sg-reveal-ready');
    observer.observe(sec);
  });
});
