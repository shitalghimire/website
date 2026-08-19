/* =============================================================
   DRAWING SET — instrument bay
   Eleven self-contained tools. No network calls on page load;
   no permission prompts unless a tool is explicitly used.
   ============================================================= */
(function () {
  'use strict';

  var tabsHost = document.getElementById('bayTabs');
  var panelHost = document.getElementById('bayPanels');
  if (!tabsHost || !panelHost) return;

  /* ---------- helpers ---------- */
  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : (fallback === undefined ? NaN : fallback);
  }
  function fmt(n, dp) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('en-US', {
      minimumFractionDigits: dp === undefined ? 2 : dp,
      maximumFractionDigits: dp === undefined ? 2 : dp
    });
  }
  function readout(title, rows, note) {
    var body = rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + (r[2] ? '<b>' + r[1] + '</b>' : r[1]) + '</dd></div>';
    }).join('');
    return '<div class="readout">'
      + '<div class="readout__hd"><span>' + title + '</span><span>Computed</span></div>'
      + '<div class="readout__bd"><dl>' + body + '</dl></div>'
      + (note ? '<p class="readout__note">' + note + '</p>' : '')
      + '</div>';
  }
  function empty(msg) {
    return '<div class="readout readout--empty"><div class="readout__bd">' + msg + '</div></div>';
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem('sg.' + key) || 'null');
      localStorage.setItem('sg.' + key, JSON.stringify(val));
    } catch (e) { /* private mode — degrade quietly */ }
    return null;
  }
  function head(title, sub) {
    return '<div class="instr__head"><h3>' + title + '</h3><p>' + sub + '</p></div>';
  }
  function fieldNum(id, label, ph, step) {
    return '<label class="field"><span>' + label + '</span>'
      + '<input type="number" id="' + id + '" placeholder="' + (ph || '') + '" step="' + (step || 'any') + '"/></label>';
  }

  /* =========================================================
     01 — CONCRETE
     ========================================================= */
  var MIXES = {
    'M10':  { r: [1, 3, 6],   note: 'Lean concrete, blinding' },
    'M15':  { r: [1, 2, 4],   note: 'Plain concrete, flooring' },
    'M20':  { r: [1, 1.5, 3], note: 'Standard RCC slabs, beams' },
    'M25':  { r: [1, 1, 2],   note: 'RCC columns, higher load' }
  };

  var concrete = {
    code: '6.01', name: 'Concrete mix',
    render: function () {
      return head('Concrete Volume &amp; Mix', 'Element → dry volume → materials')
        + '<div class="grid-3">'
        + fieldNum('cL', 'Length (m)', '5')
        + fieldNum('cW', 'Width (m)', '3')
        + fieldNum('cD', 'Depth (m)', '0.15')
        + '</div>'
        + '<div class="grid-2 mt">'
        + '<label class="field"><span>Grade</span><select id="cGrade">'
        + Object.keys(MIXES).map(function (k) {
            return '<option value="' + k + '"' + (k === 'M20' ? ' selected' : '') + '>' + k + ' — ' + MIXES[k].r.join(' : ') + '</option>';
          }).join('')
        + '</select></label>'
        + fieldNum('cWaste', 'Wastage (%)', '5')
        + '</div>'
        + '<div class="row mt"><button class="btn btn--sm" id="cGo">Calculate</button></div>'
        + '<div id="cOut">' + empty('Enter dimensions to compute quantities.') + '</div>';
    },
    mount: function (root) {
      var go = function () {
        var L = num(root.querySelector('#cL').value),
            W = num(root.querySelector('#cW').value),
            D = num(root.querySelector('#cD').value),
            waste = num(root.querySelector('#cWaste').value, 0),
            g = root.querySelector('#cGrade').value;

        if (!(L > 0 && W > 0 && D > 0)) {
          root.querySelector('#cOut').innerHTML = empty('Enter positive length, width and depth.');
          return;
        }
        var wet = L * W * D;
        var dry = wet * 1.54 * (1 + waste / 100);
        var r = MIXES[g].r, sum = r[0] + r[1] + r[2];
        var cementV = dry * r[0] / sum;
        var cementKg = cementV * 1440;
        var sandKg = (dry * r[1] / sum) * 1600;
        var aggKg  = (dry * r[2] / sum) * 1500;
        var bags = cementKg / 50;
        var water = cementKg * 0.5;

        root.querySelector('#cOut').innerHTML = readout('Grade ' + g + ' · ' + r.join(':'), [
          ['Wet volume', fmt(wet, 3) + ' m³'],
          ['Dry volume (×1.54' + (waste ? ' + ' + waste + '% waste' : '') + ')', fmt(dry, 3) + ' m³'],
          ['Cement', fmt(cementKg, 1) + ' kg', true],
          ['Cement bags (50 kg)', fmt(bags, 1) + ' bags', true],
          ['Fine aggregate (sand)', fmt(sandKg, 1) + ' kg'],
          ['Coarse aggregate', fmt(aggKg, 1) + ' kg'],
          ['Water (w/c ≈ 0.50)', fmt(water, 1) + ' litres']
        ], MIXES[g].note + '. Nominal mix by volume; densities taken as cement 1440, sand 1600, aggregate 1500 kg/m³. Confirm against the approved mix design.');
      };
      root.querySelector('#cGo').addEventListener('click', go);
      root.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    }
  };

  /* =========================================================
     02 — REBAR
     ========================================================= */
  var rebar = {
    code: '6.02', name: 'Rebar schedule',
    render: function () {
      return head('Reinforcement Weight', 'Bar bending schedule — d²/162')
        + '<div class="grid-3">'
        + '<label class="field"><span>Bar dia (mm)</span><select id="rD">'
        + [6, 8, 10, 12, 16, 20, 25, 28, 32].map(function (d) {
            return '<option' + (d === 12 ? ' selected' : '') + '>' + d + '</option>';
          }).join('')
        + '</select></label>'
        + fieldNum('rLen', 'Length each (m)', '12')
        + fieldNum('rQty', 'Number of bars', '40')
        + '</div>'
        + '<div class="row mt">'
        + '<button class="btn btn--sm" id="rAdd">+ Add to schedule</button>'
        + '<button class="btn btn--sm btn--ghost" id="rClear">Clear</button>'
        + '</div>'
        + '<div id="rOut"></div>';
    },
    mount: function (root) {
      var rows = store('rebar') || [];
      var out = root.querySelector('#rOut');

      function draw() {
        if (!rows.length) { out.innerHTML = empty('Add bar marks to build a schedule.'); return; }
        var total = 0;
        var body = rows.map(function (r, i) {
          var perM = (r.d * r.d) / 162;
          var wt = perM * r.len * r.qty;
          total += wt;
          return '<tr><td>Ø' + r.d + '</td><td>' + fmt(r.len, 2) + '</td><td>' + r.qty
            + '</td><td>' + fmt(r.len * r.qty, 2) + '</td><td>' + fmt(perM, 3)
            + '</td><td>' + fmt(wt, 2) + '</td>'
            + '<td><button class="plan__del" data-i="' + i + '" aria-label="Remove">✕</button></td></tr>';
        }).join('');

        out.innerHTML = '<div class="tbl__scroll"><table class="tbl">'
          + '<thead><tr><th>Bar</th><th>Len (m)</th><th>No.</th><th>Total m</th><th>kg/m</th><th>Weight kg</th><th></th></tr></thead>'
          + '<tbody>' + body + '</tbody>'
          + '<tfoot><tr><td colspan="5">Total steel</td><td>' + fmt(total, 2) + ' kg</td><td></td></tr>'
          + '<tr><td colspan="5">≈ tonnes</td><td>' + fmt(total / 1000, 3) + ' t</td><td></td></tr></tfoot>'
          + '</table></div>';

        Array.prototype.forEach.call(out.querySelectorAll('.plan__del'), function (b) {
          b.addEventListener('click', function () {
            rows.splice(parseInt(b.getAttribute('data-i'), 10), 1);
            store('rebar', rows); draw();
          });
        });
      }

      root.querySelector('#rAdd').addEventListener('click', function () {
        var d = num(root.querySelector('#rD').value),
            len = num(root.querySelector('#rLen').value),
            qty = num(root.querySelector('#rQty').value);
        if (!(len > 0 && qty > 0)) return;
        rows.push({ d: d, len: len, qty: Math.round(qty) });
        store('rebar', rows); draw();
      });
      root.querySelector('#rClear').addEventListener('click', function () {
        rows = []; store('rebar', rows); draw();
      });
      draw();
    }
  };

  /* =========================================================
     03 — BEAM
     ========================================================= */
  var beam = {
    code: '6.03', name: 'Beam stress',
    render: function () {
      return head('Simply Supported Beam', 'Bending moment, stress and deflection')
        + '<div class="grid-3">'
        + fieldNum('bW', 'UDL w (kN/m)', '12')
        + fieldNum('bL', 'Span L (m)', '6')
        + '<label class="field"><span>Section</span><select id="bSec">'
        + '<option value="rect">Rectangular</option><option value="I">Custom I (enter I &amp; y)</option>'
        + '</select></label>'
        + '</div>'
        + '<div class="grid-3 mt" id="bRect">'
        + fieldNum('bB', 'Width b (mm)', '300')
        + fieldNum('bH', 'Depth h (mm)', '500')
        + fieldNum('bE', 'E (GPa)', '25')
        + '</div>'
        + '<div class="grid-3 mt" id="bCustom" hidden>'
        + fieldNum('bI', 'I (mm⁴)', '3.125e9')
        + fieldNum('bY', 'y from NA (mm)', '250')
        + fieldNum('bE2', 'E (GPa)', '25')
        + '</div>'
        + '<div class="row mt"><button class="btn btn--sm" id="bGo">Calculate</button></div>'
        + '<div id="bOut">' + empty('Enter loading and section to analyse.') + '</div>';
    },
    mount: function (root) {
      var sel = root.querySelector('#bSec');
      sel.addEventListener('change', function () {
        var custom = sel.value === 'I';
        root.querySelector('#bRect').hidden = custom;
        root.querySelector('#bCustom').hidden = !custom;
      });

      root.querySelector('#bGo').addEventListener('click', function () {
        var w = num(root.querySelector('#bW').value),
            L = num(root.querySelector('#bL').value),
            custom = sel.value === 'I', I, y, E;

        if (custom) {
          I = num(root.querySelector('#bI').value);
          y = num(root.querySelector('#bY').value);
          E = num(root.querySelector('#bE2').value);
        } else {
          var b = num(root.querySelector('#bB').value),
              h = num(root.querySelector('#bH').value);
          E = num(root.querySelector('#bE').value);
          I = (b * Math.pow(h, 3)) / 12;
          y = h / 2;
        }

        if (!(w > 0 && L > 0 && I > 0 && y > 0 && E > 0)) {
          root.querySelector('#bOut').innerHTML = empty('All values must be positive numbers.');
          return;
        }

        var M = (w * L * L) / 8;                    // kN·m
        var V = (w * L) / 2;                        // kN
        var sigma = (M * 1e6 * y) / I;              // N/mm² = MPa
        var Emm = E * 1000;                         // GPa → N/mm²
        // 1 kN/m is numerically 1 N/mm, so w carries straight into the formula
        var defl = (5 * w * Math.pow(L * 1000, 4)) / (384 * Emm * I); // mm
        var ratio = (L * 1000) / defl;

        root.querySelector('#bOut').innerHTML = readout('Simply supported · UDL', [
          ['Max bending moment M = wL²/8', fmt(M, 2) + ' kN·m', true],
          ['Max shear V = wL/2', fmt(V, 2) + ' kN'],
          ['Second moment of area I', fmt(I, 0) + ' mm⁴'],
          ['Extreme fibre distance y', fmt(y, 1) + ' mm'],
          ['Bending stress σ = My/I', fmt(sigma, 2) + ' MPa', true],
          ['Max deflection δ = 5wL⁴/384EI', fmt(defl, 2) + ' mm'],
          ['Span / deflection', 'L/' + fmt(ratio, 0)]
        ], 'Elastic analysis for a simply supported span under uniform load. Serviceability limits are commonly L/250 to L/350 — check against your governing code.');
      });
    }
  };

  /* =========================================================
     04 — HYDROPOWER
     ========================================================= */
  var flow = {
    code: '6.04', name: 'Hydropower',
    render: function () {
      return head('Discharge &amp; Power', 'Q = A·V and P = ρgQHη')
        + '<div class="grid-3">'
        + fieldNum('fA', 'Flow area A (m²)', '12')
        + fieldNum('fV', 'Velocity V (m/s)', '2.5')
        + fieldNum('fH', 'Net head H (m)', '90')
        + '</div>'
        + '<div class="grid-3 mt">'
        + fieldNum('fEt', 'Turbine η (%)', '90')
        + fieldNum('fEg', 'Generator η (%)', '96')
        + fieldNum('fPlf', 'Plant factor (%)', '60')
        + '</div>'
        + '<div class="row mt"><button class="btn btn--sm" id="fGo">Calculate</button></div>'
        + '<div id="fOut">' + empty('Enter flow and head to size the output.') + '</div>';
    },
    mount: function (root) {
      root.querySelector('#fGo').addEventListener('click', function () {
        var A = num(root.querySelector('#fA').value),
            V = num(root.querySelector('#fV').value),
            H = num(root.querySelector('#fH').value),
            et = num(root.querySelector('#fEt').value, 90) / 100,
            eg = num(root.querySelector('#fEg').value, 96) / 100,
            plf = num(root.querySelector('#fPlf').value, 60) / 100;

        if (!(A > 0 && V > 0 && H > 0)) {
          root.querySelector('#fOut').innerHTML = empty('Area, velocity and head must be positive.');
          return;
        }
        var Q = A * V;
        var eta = et * eg;
        var kW = 9.81 * Q * H * eta;
        var MW = kW / 1000;
        var gwh = (MW * 8760 * plf) / 1000;

        root.querySelector('#fOut').innerHTML = readout('Run-of-river output', [
          ['Discharge Q = A·V', fmt(Q, 3) + ' m³/s', true],
          ['Discharge', fmt(Q * 1000, 0) + ' L/s'],
          ['Combined efficiency η', fmt(eta * 100, 1) + ' %'],
          ['Power P = 9.81·Q·H·η', fmt(kW, 1) + ' kW'],
          ['Installed capacity', fmt(MW, 3) + ' MW', true],
          ['Annual energy @ ' + fmt(plf * 100, 0) + '% plant factor', fmt(gwh, 2) + ' GWh/yr']
        ], 'Gross estimate using ρ = 1000 kg/m³ and g = 9.81 m/s². Net head should already exclude penstock and intake losses.');
      });
    }
  };

  /* =========================================================
     05 — CONVERTER (incl. Nepali land units)
     ========================================================= */
  var UNITS = {
    Length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, foot: 0.3048, yard: 0.9144, mile: 1609.344 },
    Area: {
      'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1, 'km²': 1e6, 'ft²': 0.09290304,
      'hectare': 10000, 'acre': 4046.8564224,
      'ropani': 508.72, 'aana': 31.795, 'paisa': 7.949, 'daam': 1.987,
      'bigha': 6772.63, 'kattha': 338.63, 'dhur': 16.93
    },
    Volume: { ml: 1e-6, litre: 0.001, 'm³': 1, 'ft³': 0.0283168466, 'yd³': 0.764554858, 'gallon (US)': 0.00378541 },
    Force: { N: 1, kN: 1000, MN: 1e6, kgf: 9.80665, lbf: 4.4482216, 'tonne-f': 9806.65 },
    Pressure: { Pa: 1, kPa: 1000, MPa: 1e6, bar: 1e5, atm: 101325, psi: 6894.757, 'kgf/cm²': 98066.5 },
    Mass: { g: 0.001, kg: 1, tonne: 1000, lb: 0.45359237, 'ton (US)': 907.18474 }
  };

  var convert = {
    code: '6.05', name: 'Unit converter',
    render: function () {
      return head('Unit Converter', 'SI, imperial and Nepali land measure')
        + '<label class="field"><span>Category</span><select id="uCat">'
        + Object.keys(UNITS).map(function (k) { return '<option>' + k + '</option>'; }).join('')
        + '</select></label>'
        + '<div class="conv__io">'
        + '<div style="display:grid;gap:.6rem">'
        + '  <label class="field"><span>From</span><select id="uFrom"></select></label>'
        + '  <input type="number" id="uVal" placeholder="Enter value" step="any"/>'
        + '</div>'
        + '<button class="conv__swap" id="uSwap" aria-label="Swap units" title="Swap">⇄</button>'
        + '<div style="display:grid;gap:.6rem">'
        + '  <label class="field"><span>To</span><select id="uTo"></select></label>'
        + '  <output class="conv__out" id="uOut">—</output>'
        + '</div>'
        + '</div>'
        + '<p class="form__note mt">Nepali land units use the standard conversions: 1 ropani = 16 aana = 508.72 m²; 1 bigha = 20 kattha = 6772.63 m².</p>';
    },
    mount: function (root) {
      var cat = root.querySelector('#uCat'),
          from = root.querySelector('#uFrom'),
          to = root.querySelector('#uTo'),
          val = root.querySelector('#uVal'),
          out = root.querySelector('#uOut');

      function fill() {
        var keys = Object.keys(UNITS[cat.value]);
        var opts = keys.map(function (k) { return '<option>' + k + '</option>'; }).join('');
        from.innerHTML = opts; to.innerHTML = opts;
        from.selectedIndex = 0;
        to.selectedIndex = Math.min(2, keys.length - 1);
        calc();
      }
      function calc() {
        var v = num(val.value);
        if (!isFinite(v)) { out.textContent = '—'; return; }
        var table = UNITS[cat.value];
        var r = (v * table[from.value]) / table[to.value];
        var abs = Math.abs(r);
        var dp = abs === 0 ? 0 : abs < 0.001 ? 8 : abs < 1 ? 6 : abs < 1000 ? 4 : 2;
        out.textContent = r.toLocaleString('en-US', { maximumFractionDigits: dp }) + ' ' + to.value;
      }
      cat.addEventListener('change', fill);
      [from, to].forEach(function (s) { s.addEventListener('change', calc); });
      val.addEventListener('input', calc);
      root.querySelector('#uSwap').addEventListener('click', function () {
        var a = from.selectedIndex; from.selectedIndex = to.selectedIndex; to.selectedIndex = a;
        calc();
      });
      fill();
    }
  };

  /* =========================================================
     06 — COST ESTIMATOR
     ========================================================= */
  var estimate = {
    code: '6.06', name: 'Cost estimate',
    render: function () {
      return head('Quick Estimate', 'Bill of quantities — rate × quantity')
        + '<div class="grid-3">'
        + '<label class="field"><span>Item</span><input type="text" id="eItem" placeholder="e.g. M20 concrete"/></label>'
        + fieldNum('eQty', 'Quantity', '120')
        + '<label class="field"><span>Unit</span><select id="eUnit">'
        + ['m³', 'm²', 'm', 'kg', 'tonne', 'no.', 'day', 'L.S.'].map(function (u) { return '<option>' + u + '</option>'; }).join('')
        + '</select></label>'
        + '</div>'
        + '<div class="grid-2 mt">'
        + fieldNum('eRate', 'Rate (NPR / unit)', '12500')
        + fieldNum('eOh', 'Overhead + contingency (%)', '15')
        + '</div>'
        + '<div class="row mt">'
        + '<button class="btn btn--sm" id="eAdd">+ Add item</button>'
        + '<button class="btn btn--sm btn--ghost" id="eClear">Clear</button>'
        + '</div>'
        + '<div id="eOut"></div>';
    },
    mount: function (root) {
      var rows = store('boq') || [];
      var out = root.querySelector('#eOut');

      function draw() {
        if (!rows.length) { out.innerHTML = empty('Add line items to build an estimate.'); return; }
        var sub = 0;
        var body = rows.map(function (r, i) {
          var amt = r.qty * r.rate; sub += amt;
          return '<tr><td>' + r.item + '</td><td>' + fmt(r.qty, 2) + '</td><td>' + r.unit
            + '</td><td>' + fmt(r.rate, 2) + '</td><td>' + fmt(amt, 2) + '</td>'
            + '<td><button class="plan__del" data-i="' + i + '" aria-label="Remove">✕</button></td></tr>';
        }).join('');

        var oh = num(root.querySelector('#eOh').value, 0);
        var ohAmt = sub * oh / 100;

        out.innerHTML = '<div class="tbl__scroll"><table class="tbl">'
          + '<thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th><th></th></tr></thead>'
          + '<tbody>' + body + '</tbody>'
          + '<tfoot>'
          + '<tr><td colspan="4">Subtotal</td><td>' + fmt(sub, 2) + '</td><td></td></tr>'
          + '<tr><td colspan="4">Overhead &amp; contingency (' + fmt(oh, 0) + '%)</td><td>' + fmt(ohAmt, 2) + '</td><td></td></tr>'
          + '<tr><td colspan="4">Total (NPR)</td><td>' + fmt(sub + ohAmt, 2) + '</td><td></td></tr>'
          + '</tfoot></table></div>';

        Array.prototype.forEach.call(out.querySelectorAll('.plan__del'), function (b) {
          b.addEventListener('click', function () {
            rows.splice(parseInt(b.getAttribute('data-i'), 10), 1);
            store('boq', rows); draw();
          });
        });
      }

      root.querySelector('#eAdd').addEventListener('click', function () {
        var item = root.querySelector('#eItem').value.trim() || 'Item ' + (rows.length + 1),
            qty = num(root.querySelector('#eQty').value),
            rate = num(root.querySelector('#eRate').value),
            unit = root.querySelector('#eUnit').value;
        if (!(qty > 0 && rate >= 0)) return;
        rows.push({ item: item, qty: qty, rate: rate, unit: unit });
        store('boq', rows);
        root.querySelector('#eItem').value = '';
        draw();
      });
      root.querySelector('#eClear').addEventListener('click', function () {
        rows = []; store('boq', rows); draw();
      });
      root.querySelector('#eOh').addEventListener('input', draw);
      draw();
    }
  };

  /* =========================================================
     07 — SCHEDULE PLANNER (mini Gantt)
     ========================================================= */
  var schedule = {
    code: '6.07', name: 'Schedule planner',
    render: function () {
      return head('Mini Programme', 'Bar chart planner with critical path flag')
        + '<div class="grid-3">'
        + '<label class="field"><span>Activity</span><input type="text" id="pName" placeholder="e.g. Excavation"/></label>'
        + fieldNum('pStart', 'Start (day)', '0')
        + fieldNum('pDur', 'Duration (days)', '14')
        + '</div>'
        + '<div class="row mt">'
        + '<label class="row" style="gap:.45rem;font-family:var(--mono);font-size:.7rem">'
        + '<input type="checkbox" id="pCrit" style="width:auto"/> Critical path</label>'
        + '<button class="btn btn--sm" id="pAdd">+ Add activity</button>'
        + '<button class="btn btn--sm btn--ghost" id="pClear">Clear</button>'
        + '</div>'
        + '<div class="plan__chart" id="pChart"></div>'
        + '<div id="pOut"></div>';
    },
    mount: function (root) {
      var tasks = store('plan') || [];
      var chart = root.querySelector('#pChart'), out = root.querySelector('#pOut');

      function draw() {
        if (!tasks.length) {
          chart.innerHTML = '<p class="plan__empty">No activities yet — add one to build a programme.</p>';
          out.innerHTML = '';
          return;
        }
        var end = tasks.reduce(function (m, t) { return Math.max(m, t.start + t.dur); }, 0) || 1;
        chart.innerHTML = tasks.map(function (t, i) {
          var left = (t.start / end) * 100;
          var w = Math.max((t.dur / end) * 100, 1.5);
          return '<div class="plan__task">'
            + '<span title="' + t.name + '">' + t.name + '</span>'
            + '<div class="plan__lane"><div class="plan__bar' + (t.crit ? ' is-crit' : '')
            + '" style="left:' + left + '%;width:' + w + '%"></div></div>'
            + '<button class="plan__del" data-i="' + i + '" aria-label="Remove">✕</button>'
            + '</div>';
        }).join('');

        var critDays = tasks.filter(function (t) { return t.crit; })
                            .reduce(function (m, t) { return Math.max(m, t.start + t.dur); }, 0);

        out.innerHTML = readout('Programme summary', [
          ['Activities', String(tasks.length)],
          ['Project duration', end + ' days', true],
          ['≈ calendar weeks', fmt(end / 7, 1) + ' weeks'],
          ['Critical path finish', critDays ? critDays + ' days' : 'not flagged'],
          ['Float against project end', critDays ? (end - critDays) + ' days' : '—']
        ], 'A planning sketch, not a CPM engine — durations are independent and there is no logic linking. For real network analysis use Primavera P6.');

        Array.prototype.forEach.call(chart.querySelectorAll('.plan__del'), function (b) {
          b.addEventListener('click', function () {
            tasks.splice(parseInt(b.getAttribute('data-i'), 10), 1);
            store('plan', tasks); draw();
          });
        });
      }

      root.querySelector('#pAdd').addEventListener('click', function () {
        var name = root.querySelector('#pName').value.trim() || 'Activity ' + (tasks.length + 1),
            s = num(root.querySelector('#pStart').value, 0),
            d = num(root.querySelector('#pDur').value);
        if (!(d > 0) || s < 0) return;
        tasks.push({ name: name, start: Math.round(s), dur: Math.round(d), crit: root.querySelector('#pCrit').checked });
        store('plan', tasks);
        root.querySelector('#pName').value = '';
        draw();
      });
      root.querySelector('#pClear').addEventListener('click', function () {
        tasks = []; store('plan', tasks); draw();
      });
      draw();
    }
  };

  /* =========================================================
     08 — SITE MAP  (geolocation ONLY on explicit click)
     ========================================================= */
  var PLACES = [
    { id: 'tk5',  name: 'Tamakoshi V — 99.8 MW', sub: 'Sinohydro · current post', lat: 27.6810, lon: 86.1300 },
    { id: 'trs',  name: 'Super Trishuli — 100 MW', sub: 'Blue Energy · internship', lat: 27.9500, lon: 85.1500 },
    { id: 'ku',   name: 'Kathmandu University', sub: 'Dhulikhel · B.E. Civil', lat: 27.6193, lon: 85.5385 },
    { id: 'home', name: 'Ratnanagar-15, Chitwan', sub: 'Hometown', lat: 27.6300, lon: 84.5000 }
  ];

  var map = {
    code: '6.08', name: 'Site map',
    render: function () {
      return head('Project Locations', 'Sites, campus and home — OpenStreetMap')
        + '<div class="map__frame"><iframe id="mFrame" title="Map of project locations" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>'
        + '<div class="map__pins" id="mPins">'
        + PLACES.map(function (p, i) {
            return '<button class="map__pin" data-id="' + p.id + '"' + (i === 0 ? ' aria-current="true"' : '') + '>'
              + '<i></i><span>' + p.name + '<br/><em>' + p.sub + '</em></span>'
              + '<em>' + p.lat.toFixed(3) + '° ' + p.lon.toFixed(3) + '°</em></button>';
          }).join('')
        + '</div>'
        + '<div class="row mt"><button class="btn btn--sm btn--ghost" id="mLocate">◎ How far am I?</button></div>'
        + '<p class="form__note">Your location is never requested until you press that button, and it is used only to compute a distance in your browser — nothing is sent anywhere or stored.</p>'
        + '<div id="mOut"></div>';
    },
    mount: function (root) {
      var frame = root.querySelector('#mFrame');
      var current = PLACES[0];

      function show(p) {
        current = p;
        var d = 0.055;
        var bbox = [p.lon - d, p.lat - d * 0.62, p.lon + d, p.lat + d * 0.62].join(',');
        frame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox
          + '&layer=mapnik&marker=' + p.lat + ',' + p.lon;
        Array.prototype.forEach.call(root.querySelectorAll('.map__pin'), function (b) {
          if (b.getAttribute('data-id') === p.id) b.setAttribute('aria-current', 'true');
          else b.removeAttribute('aria-current');
        });
      }

      Array.prototype.forEach.call(root.querySelectorAll('.map__pin'), function (b) {
        b.addEventListener('click', function () {
          var p = PLACES.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
          if (p) show(p);
        });
      });

      root.querySelector('#mLocate').addEventListener('click', function () {
        var out = root.querySelector('#mOut');
        if (!navigator.geolocation) {
          out.innerHTML = empty('Your browser does not offer location services.');
          return;
        }
        out.innerHTML = empty('Waiting for your permission…');
        navigator.geolocation.getCurrentPosition(function (pos) {
          var la = pos.coords.latitude, lo = pos.coords.longitude;
          var R = 6371;
          var rows = PLACES.map(function (p) {
            var dLat = (p.lat - la) * Math.PI / 180, dLon = (p.lon - lo) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                  + Math.cos(la * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180)
                  * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return [p.name, fmt(km, 1) + ' km', p.id === 'tk5'];
          });
          rows.unshift(['Your position', la.toFixed(4) + '°, ' + lo.toFixed(4) + '°']);
          out.innerHTML = readout('Great-circle distance', rows,
            'Straight-line distance only — Himalayan road distance is considerably longer.');
        }, function (err) {
          out.innerHTML = empty(err.code === 1
            ? 'Location permission declined — no problem, nothing else needs it.'
            : 'Could not determine your location.');
        }, { timeout: 10000, maximumAge: 60000 });
      });

      show(PLACES[0]);
    }
  };

  /* =========================================================
     09 — SITE WEATHER (fetched only when opened)
     ========================================================= */
  var WX_CODES = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
    75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm'
  };

  var weather = {
    code: '6.09', name: 'Site weather',
    render: function () {
      return head('Site Weather', 'Live conditions — concreting &amp; access')
        + '<label class="field"><span>Location</span><select id="wPlace">'
        + PLACES.map(function (p) { return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('')
        + '</select></label>'
        + '<div class="row mt"><button class="btn btn--sm" id="wGo">Fetch conditions</button></div>'
        + '<div id="wOut">' + empty('Press fetch — nothing is requested until you do.') + '</div>';
    },
    mount: function (root) {
      root.querySelector('#wGo').addEventListener('click', function () {
        var id = root.querySelector('#wPlace').value;
        var p = PLACES.filter(function (x) { return x.id === id; })[0];
        var out = root.querySelector('#wOut');
        out.innerHTML = empty('Fetching…');

        var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat
          + '&longitude=' + p.lon
          + '&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code'
          + '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum'
          + '&forecast_days=1&timezone=Asia%2FKathmandu';

        fetch(url).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (d) {
          var c = d.current, day = d.daily;
          var desc = WX_CODES[c.weather_code] || 'Conditions ' + c.weather_code;
          var t = c.temperature_2m;
          var advice = t < 5 ? 'Below 5 °C — cold-weather concreting precautions apply.'
                     : t > 35 ? 'Above 35 °C — hot-weather concreting; watch mix temperature and curing.'
                     : c.precipitation > 0 ? 'Precipitation recorded — protect fresh concrete and check access.'
                     : 'Conditions within normal working range.';

          out.innerHTML =
            '<div class="wx"><div class="wx__t">' + Math.round(t) + '<sup>°C</sup></div>'
            + '<div class="wx__rows">'
            + '<div><span>' + desc + '</span><span>' + p.name.split('—')[0].trim() + '</span></div>'
            + '<div><span>Humidity</span><span>' + c.relative_humidity_2m + ' %</span></div>'
            + '<div><span>Wind</span><span>' + fmt(c.wind_speed_10m, 1) + ' km/h</span></div>'
            + '<div><span>Precipitation</span><span>' + fmt(c.precipitation, 1) + ' mm</span></div>'
            + '<div><span>Today range</span><span>' + Math.round(day.temperature_2m_min[0]) + '° / '
            + Math.round(day.temperature_2m_max[0]) + '°</span></div>'
            + '</div></div>'
            + '<p class="form__note mt">' + advice + ' &nbsp;·&nbsp; Source: Open-Meteo, no account or tracking.</p>';
        }).catch(function () {
          out.innerHTML = empty('Could not reach the weather service. Check your connection and try again.');
        });
      });
    }
  };

  /* =========================================================
     10 — CALENDAR & NOTES
     ========================================================= */
  var calendar = {
    code: '6.10', name: 'Site diary',
    render: function () {
      return head('Site Diary', 'Calendar with local notes')
        + '<div class="cal__bar">'
        + '<button class="cal__nav" id="calPrev" aria-label="Previous month">‹</button>'
        + '<b id="calTitle"></b>'
        + '<button class="cal__nav" id="calNext" aria-label="Next month">›</button>'
        + '</div>'
        + '<div class="cal__grid" id="calGrid"></div>'
        + '<label class="field mt"><span>Note for <b id="calPick">—</b></span>'
        + '<textarea id="calNote" rows="4" placeholder="Select a date, then write…"></textarea></label>'
        + '<p class="form__note">Notes are saved in this browser only.</p>';
    },
    mount: function (root) {
      var view = new Date();
      var notes = store('diary') || {};
      var picked = null;
      var grid = root.querySelector('#calGrid'),
          title = root.querySelector('#calTitle'),
          note = root.querySelector('#calNote'),
          pick = root.querySelector('#calPick');

      function key(y, m, d) { return y + '-' + (m + 1) + '-' + d; }

      function draw() {
        var y = view.getFullYear(), m = view.getMonth();
        title.textContent = view.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        var first = new Date(y, m, 1).getDay();
        var days = new Date(y, m + 1, 0).getDate();
        var today = new Date();
        var html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (d) {
          return '<div class="cal__dow">' + d + '</div>';
        }).join('');
        var i;
        for (i = 0; i < first; i++) html += '<div class="cal__day is-void"></div>';
        for (i = 1; i <= days; i++) {
          var k = key(y, m, i);
          var cls = 'cal__day';
          if (i === today.getDate() && m === today.getMonth() && y === today.getFullYear()) cls += ' is-today';
          if (picked === k) cls += ' is-pick';
          if (notes[k]) cls += ' has-note';
          html += '<button class="' + cls + '" data-k="' + k + '">' + i + '</button>';
        }
        grid.innerHTML = html;

        Array.prototype.forEach.call(grid.querySelectorAll('.cal__day[data-k]'), function (b) {
          b.addEventListener('click', function () {
            picked = b.getAttribute('data-k');
            pick.textContent = picked;
            note.value = notes[picked] || '';
            draw();
            note.focus();
          });
        });
      }

      note.addEventListener('input', function () {
        if (!picked) return;
        if (note.value.trim()) notes[picked] = note.value;
        else delete notes[picked];
        store('diary', notes);
        draw();
      });
      root.querySelector('#calPrev').addEventListener('click', function () {
        view.setMonth(view.getMonth() - 1); draw();
      });
      root.querySelector('#calNext').addEventListener('click', function () {
        view.setMonth(view.getMonth() + 1); draw();
      });
      draw();
    }
  };

  /* =========================================================
     11 — FOCUS TIMER
     ========================================================= */
  var timer = {
    code: '6.11', name: 'Focus timer',
    render: function () {
      return head('Focus Timer', 'Work / rest cycles for deep work')
        + '<div class="grid-3">'
        + fieldNum('tWork', 'Work (min)', '25')
        + fieldNum('tRest', 'Break (min)', '5')
        + fieldNum('tCycles', 'Cycles', '4')
        + '</div>'
        + '<p class="timer__mode mt" id="tMode">Ready</p>'
        + '<div class="timer__face" id="tFace">25:00</div>'
        + '<div class="timer__track"><div class="timer__fill" id="tFill"></div></div>'
        + '<div class="timer__pips" id="tPips"></div>'
        + '<div class="row mt" style="justify-content:center">'
        + '<button class="btn btn--sm" id="tStart">Start</button>'
        + '<button class="btn btn--sm btn--ghost" id="tReset">Reset</button>'
        + '</div>';
    },
    mount: function (root) {
      var face = root.querySelector('#tFace'), fill = root.querySelector('#tFill'),
          mode = root.querySelector('#tMode'), pips = root.querySelector('#tPips'),
          startBtn = root.querySelector('#tStart');
      var tick = null, left = 0, span = 0, resting = false, done = 0, running = false;

      function cfg() {
        return {
          work: Math.max(1, num(root.querySelector('#tWork').value, 25)) * 60,
          rest: Math.max(1, num(root.querySelector('#tRest').value, 5)) * 60,
          cycles: Math.max(1, Math.round(num(root.querySelector('#tCycles').value, 4)))
        };
      }
      function paintPips() {
        var c = cfg(), h = '';
        for (var i = 0; i < c.cycles; i++) h += '<i class="' + (i < done ? 'on' : '') + '"></i>';
        pips.innerHTML = h;
      }
      function paint() {
        var m = Math.floor(left / 60), s = left % 60;
        face.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        fill.style.width = span ? ((span - left) / span * 100) + '%' : '0%';
        face.classList.toggle('is-rest', resting);
        face.classList.toggle('is-run', running && !resting);
      }
      function beep() {
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          var ac = new AC(), o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.type = 'square'; o.frequency.value = resting ? 660 : 440;
          g.gain.setValueAtTime(0.06, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.35);
          o.start(); o.stop(ac.currentTime + 0.36);
        } catch (e) { /* audio blocked — silent is fine */ }
      }
      function phase(isRest) {
        var c = cfg();
        resting = isRest;
        span = left = isRest ? c.rest : c.work;
        mode.textContent = isRest ? 'Break' : 'Focus · cycle ' + (done + 1) + ' of ' + c.cycles;
        paint();
      }
      function stop() {
        clearInterval(tick); tick = null; running = false;
        startBtn.textContent = 'Start';
      }
      function run() {
        var c = cfg();
        running = true; startBtn.textContent = 'Pause';
        tick = setInterval(function () {
          left--;
          if (left <= 0) {
            beep();
            if (!resting) {
              done++;
              paintPips();
              if (done >= c.cycles) { stop(); mode.textContent = 'Complete — ' + c.cycles + ' cycles done'; face.textContent = '00:00'; fill.style.width = '100%'; return; }
              phase(true);
            } else {
              phase(false);
            }
          }
          paint();
        }, 1000);
      }

      startBtn.addEventListener('click', function () {
        if (running) { stop(); paint(); return; }
        if (!left) phase(false);
        run();
      });
      root.querySelector('#tReset').addEventListener('click', function () {
        stop(); done = 0; resting = false; phase(false); paintPips(); mode.textContent = 'Ready';
      });
      ['#tWork', '#tRest', '#tCycles'].forEach(function (s) {
        root.querySelector(s).addEventListener('change', function () {
          if (!running) { done = 0; phase(false); paintPips(); }
        });
      });

      phase(false); paintPips();
    }
  };

  /* =========================================================
     BAY ASSEMBLY
     ========================================================= */
  var INSTRUMENTS = [concrete, rebar, beam, flow, convert, estimate, schedule, map, weather, calendar, timer];

  INSTRUMENTS.forEach(function (ins, i) {
    var id = 'ins-' + i;

    var tab = el('<button class="bay__tab" role="tab" id="tab-' + i + '" aria-controls="' + id + '"'
      + ' aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '">'
      + '<i>' + ins.code + '</i>' + ins.name + '</button>');

    var panel = el('<div class="bay__panel" role="tabpanel" id="' + id + '" aria-labelledby="tab-' + i + '"'
      + (i === 0 ? '' : ' hidden') + '></div>');
    panel.innerHTML = ins.render();

    tabsHost.appendChild(tab);
    panelHost.appendChild(panel);

    ins._tab = tab; ins._panel = panel; ins._mounted = false;

    tab.addEventListener('click', function () { select(i); });
    tab.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1
            : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select((i + d + INSTRUMENTS.length) % INSTRUMENTS.length, true);
    });
  });

  function select(i, focus) {
    INSTRUMENTS.forEach(function (ins, j) {
      var on = i === j;
      ins._tab.setAttribute('aria-selected', String(on));
      ins._tab.tabIndex = on ? 0 : -1;
      ins._panel.hidden = !on;
      if (on && !ins._mounted) { ins.mount(ins._panel); ins._mounted = true; }
    });
    if (focus) INSTRUMENTS[i]._tab.focus();
  }

  /* mount the first instrument straight away; the rest lazily */
  INSTRUMENTS[0].mount(INSTRUMENTS[0]._panel);
  INSTRUMENTS[0]._mounted = true;
})();
