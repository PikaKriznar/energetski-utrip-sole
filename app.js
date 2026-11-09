(() => {
  'use strict';
  const D = window.ENERGY_DATA;
  const $ = (s) => document.querySelector(s);
  const T = D.meta.steps;
  const COLORS = { pv: 'var(--pv)', bat: 'var(--bat)', grid: 'var(--grid)', load: 'var(--load)' };
  const LIVE = { weather: 'sunny', cap: 100, key: 'base' };

  const state = { view: 'now', t: 40, playing: true, weather: 'sunny', cap: 100, kitchen: 'milpShift', selected: 'pv' };

  // ---- Helpers ---------------------------------------------------------
  const fmt = (x, d = 0) => Number(x).toLocaleString('sl-SI', { minimumFractionDigits: d, maximumFractionDigits: d });
  const kw = (x) => `${fmt(x)} kW`;
  const clock = (t) => { const m = t * 15; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
  const svgEl = (name, attrs = {}, parent) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const scenario = (w, cap, key) => D.scenarios[w].byCap[cap][key];
  const liveSc = () => scenario(LIVE.weather, LIVE.cap, LIVE.key);
  const livePv = () => D.scenarios[LIVE.weather].pv;

  function frame(t) {
    const s = liveSc().series;
    const pv = livePv()[t];
    return { pv, load: D.base[t] + s.kit[t], pl: s.pl[t], pb: s.pb[t], pe: s.pe[t], bl: s.bl[t], gl: s.gl[t], soc: s.soc[t] };
  }
  function cumulative(t) {
    const s = liveSc().series;
    const sum = (a) => a.slice(0, t + 1).reduce((x, y) => x + y, 0) * D.meta.dt;
    const pv = sum(livePv()), load = sum(s.kit) + sum(D.base), gl = sum(s.gl), pe = sum(s.pe);
    return { pv, load, gl, pe, ss: 100 * (1 - gl / load), sc: pv > 0.05 ? 100 * (1 - pe / pv) : null };
  }

  // ---- Energy-flow diagram ---------------------------------------------
  const NODES = {
    pv: { x: 320, y: 78, name: 'Sončna elektrarna', c: COLORS.pv, labelDx: 76 },
    bat: { x: 96, y: 232, name: 'Baterija', c: COLORS.bat, labelDy: 90 },
    grid: { x: 544, y: 232, name: 'Omrežje', c: COLORS.grid, labelDy: 90 },
    school: { x: 320, y: 390, name: 'Šola', c: COLORS.load, labelDx: 76 },
  };
  const EDGES = [
    { id: 'pl', a: 'pv', b: 'school', c: COLORS.pv, topic: 'direct' },
    { id: 'pb', a: 'pv', b: 'bat', c: COLORS.pv, topic: 'bat' },
    { id: 'pe', a: 'pv', b: 'grid', c: COLORS.pv, topic: 'grid' },
    { id: 'bl', a: 'bat', b: 'school', c: COLORS.bat, topic: 'bat' },
    { id: 'gl', a: 'grid', b: 'school', c: COLORS.grid, topic: 'grid' },
  ];
  const RELATED = { pv: ['pl', 'pb', 'pe'], bat: ['pb', 'bl'], school: ['pl', 'bl', 'gl'], grid: ['pe', 'gl'], direct: ['pl'], compare: ['pl', 'pb', 'pe', 'bl', 'gl'] };
  const ICONS = {
    pv: (g, c) => { svgEl('circle', { r: 9, fill: c, cy: -18 }, g); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; svgEl('line', { x1: 13 * Math.cos(a), y1: -18 + 13 * Math.sin(a), x2: 18 * Math.cos(a), y2: -18 + 18 * Math.sin(a), stroke: c, 'stroke-width': 3, 'stroke-linecap': 'round' }, g); } },
    bat: (g, c) => { svgEl('rect', { x: -19, y: -32, width: 34, height: 22, rx: 4, fill: 'none', stroke: c, 'stroke-width': 3 }, g); svgEl('rect', { x: 17, y: -25, width: 4, height: 8, rx: 1, fill: c }, g); svgEl('rect', { x: -15, y: -28, width: 16, height: 14, rx: 1, fill: c }, g); },
    grid: (g, c) => { svgEl('path', { d: 'M-11 -8 L-3 -38 L3 -38 L11 -8 M-14 -30 H14 M-13 -21 H13 M-7 -21 L7 -9 M7 -21 L-7 -9', fill: 'none', stroke: c, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); },
    school: (g, c) => { svgEl('path', { d: 'M-22 -10 V-26 L0 -38 L22 -26 V-10 Z', fill: 'none', stroke: c, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g); svgEl('rect', { x: -5, y: -22, width: 10, height: 12, fill: c }, g); },
  };

  function createFlow(host, interactive) {
    const svg = svgEl('svg', { viewBox: '0 0 680 480', role: 'img', 'aria-label': 'Shema energijskih tokov med sončno elektrarno, baterijo, omrežjem in šolo' }, host);
    if (interactive) { svg.classList.add('interactive'); svg.removeAttribute('role'); }
    const R = 62;
    const edges = {};
    for (const e of EDGES) {
      const A = NODES[e.a], B = NODES[e.b];
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
      const x1 = A.x + dx / L * (R + 6), y1 = A.y + dy / L * (R + 6), x2 = B.x - dx / L * (R + 6), y2 = B.y - dy / L * (R + 6);
      const d = `M${x1} ${y1} L${x2} ${y2}`;
      const g = svgEl('g', { class: 'edge' }, svg);
      svgEl('path', { d, class: 'edge-track', 'stroke-width': 4 }, g);
      const flow = svgEl('path', { d, class: 'edge-flow', stroke: e.c }, g);
      const hit = svgEl('path', { d, class: 'edge-hit' }, g);
      const pill = svgEl('g', { class: 'edge-pill', transform: `translate(${(x1 + x2) / 2} ${(y1 + y2) / 2})` }, g);
      svgEl('rect', { x: -32, y: -14, width: 64, height: 28, rx: 14 }, pill);
      const text = svgEl('text', { 'text-anchor': 'middle', y: 6 }, pill);
      if (interactive) hit.addEventListener('click', () => select(e.topic));
      edges[e.id] = { g, flow, pill, text, topic: e.topic };
    }
    const nodes = {};
    for (const [id, n] of Object.entries(NODES)) {
      const g = svgEl('g', { class: 'node', transform: `translate(${n.x} ${n.y})` }, svg);
      svgEl('circle', { r: R, class: 'node-disc' }, g);
      let ring = null;
      if (id === 'bat') {
        svgEl('circle', { r: R - 3, class: 'node-ring-bg' }, g);
        ring = svgEl('circle', { r: R - 3, fill: 'none', stroke: n.c, 'stroke-width': 6, 'stroke-linecap': 'round', transform: 'rotate(-90)', 'stroke-dasharray': `0 ${2 * Math.PI * (R - 3)}` }, g);
      }
      ICONS[id](g, n.c);
      const value = svgEl('text', { 'text-anchor': 'middle', y: 28, 'font-size': 27, 'font-weight': 750 }, g);
      const label = svgEl('text', { 'font-size': 18, 'font-weight': 600, x: n.labelDx || 0, y: n.labelDy || 7, 'text-anchor': n.labelDx ? 'start' : 'middle' }, g);
      label.textContent = n.name;
      if (interactive) {
        g.setAttribute('role', 'button'); g.setAttribute('tabindex', '0'); g.setAttribute('aria-label', n.name);
        const go = () => select(id === 'school' ? 'school' : id);
        g.addEventListener('click', go);
        g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
      }
      nodes[id] = { g, value, ring, circ: 2 * Math.PI * (R - 3) };
    }
    return { edges, nodes, interactive };
  }

  function updateFlow(flow, f) {
    for (const [id, e] of Object.entries(flow.edges)) {
      const v = f[id];
      const on = v >= 0.5;
      e.flow.style.display = on ? '' : 'none';
      e.pill.style.display = on ? '' : 'none';
      e.flow.setAttribute('stroke-width', Math.max(5, 4 + v * 0.2));
      e.text.textContent = `${fmt(v)} kW`;
      if (flow.interactive) e.g.classList.toggle('dim', !RELATED[state.selected].includes(id));
    }
    const n = flow.nodes;
    n.pv.value.textContent = kw(f.pv);
    n.school.value.textContent = kw(f.load);
    n.bat.value.textContent = `${fmt(f.soc)} %`;
    n.grid.value.textContent = kw(f.gl > 0.05 ? f.gl : f.pe);
    n.bat.ring.setAttribute('stroke-dasharray', `${n.bat.circ * f.soc / 100} ${n.bat.circ}`);
    if (flow.interactive) for (const [id, node] of Object.entries(n)) node.g.classList.toggle('selected', id === state.selected);
  }

  // ---- Stacked day chart -----------------------------------------------
  const tip = $('#tip');
  function showTip(ev, html) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(innerWidth - r.width - 8, Math.max(8, ev.clientX + 14))}px`;
    tip.style.top = `${Math.max(8, ev.clientY - r.height - 12)}px`;
  }
  const tipRow = (c, n, v) => `<div><span><span style="background:${c}"></span>${n}</span><strong>${v}</strong></div>`;
  const SERIES_LEGEND = `
    <span><i class="sw" style="background:${COLORS.pv}"></i>Sonce neposredno</span>
    <span><i class="sw" style="background:${COLORS.bat}"></i>Baterija</span>
    <span><i class="sw" style="background:${COLORS.grid}"></i>Omrežje</span>
    <span><i class="sw sw-line" style="background:${COLORS.pv}"></i>Proizvodnja sonca</span>`;

  function drawDayChart(host, sc, pv, { height = 230, ymax, cursor = false }) {
    host.innerHTML = '';
    const W = Math.max(280, host.clientWidth || 600), H = height;
    const m = { l: 54, r: 10, t: 10, b: 24 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const s = sc.series;
    const top = ymax || 120;
    const X = (t) => m.l + (t / T) * iw;
    const Y = (v) => m.t + ih - (v / top) * ih;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': 'Poraba šole po virih skozi dan in proizvodnja sončne elektrarne' }, host);
    for (let v = 0; v <= top; v += top > 100 ? 40 : 20) {
      svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: v === 0 ? 'var(--axis)' : 'var(--grid-line)' }, svg);
      const t = svgEl('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, svg); t.textContent = v === top || (top > 100 && v + 40 > top) ? `${v} kW` : v;
    }
    for (let h = 0; h <= 24; h += W < 520 ? 6 : 3) {
      const t = svgEl('text', { x: X(h * 4), y: H - 6, 'text-anchor': h === 0 ? 'start' : h === 24 ? 'end' : 'middle' }, svg); t.textContent = `${h}:00`;
    }
    const layers = [[s.pl, COLORS.pv], [s.bl, COLORS.bat], [s.gl, COLORS.grid]];
    const base = new Array(T).fill(0);
    for (const [arr, c] of layers) {
      let up = '', down = '';
      for (let t = 0; t < T; t++) {
        const y1 = base[t] + arr[t];
        up += `${t ? 'L' : 'M'}${X(t + .5).toFixed(1)} ${Y(y1).toFixed(1)}`;
        down = `L${X(t + .5).toFixed(1)} ${Y(base[t]).toFixed(1)}` + down;
        base[t] = y1;
      }
      svgEl('path', { d: up + down + 'Z', fill: c, stroke: 'var(--surface)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, svg);
    }
    svgEl('path', { d: pv.map((v, t) => `${t ? 'L' : 'M'}${X(t + .5).toFixed(1)} ${Y(v).toFixed(1)}`).join(''), fill: 'none', stroke: COLORS.pv, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    const hair = svgEl('line', { y1: m.t, y2: m.t + ih, stroke: 'var(--ink-2)', 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' }, svg);
    let cur = null;
    if (cursor) cur = svgEl('line', { y1: m.t, y2: m.t + ih, stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
    const hit = svgEl('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }, svg);
    const onMove = (ev) => {
      const r = svg.getBoundingClientRect();
      const t = Math.min(T - 1, Math.max(0, Math.floor(((ev.clientX - r.left) * W / r.width - m.l) / iw * T)));
      hair.setAttribute('x1', X(t + .5)); hair.setAttribute('x2', X(t + .5)); hair.setAttribute('visibility', 'visible');
      showTip(ev, `<b>${clock(t)}</b>${tipRow(COLORS.pv, 'Proizvodnja', kw(pv[t]))}${tipRow('var(--ink)', 'Poraba', kw(D.base[t] + s.kit[t]))}${tipRow(COLORS.pv, 'Sonce → šola', kw(s.pl[t]))}${tipRow(COLORS.bat, 'Baterija → šola', kw(s.bl[t]))}${tipRow(COLORS.grid, 'Omrežje → šola', kw(s.gl[t]))}`);
    };
    hit.addEventListener('pointermove', onMove);
    hit.addEventListener('pointerdown', onMove);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; hair.setAttribute('visibility', 'hidden'); });
    return { moveCursor: (t) => { if (cur) { cur.setAttribute('x1', X(t + .5)); cur.setAttribute('x2', X(t + .5)); } } };
  }

  // ---- Live views ------------------------------------------------------
  const flowNow = createFlow($('#flow-now'), false);
  const flowExplore = createFlow($('#flow-explore'), true);
  let nowChart = null;

  function sentence(f) {
    if (f.pv < 0.5) return f.bl > 0.5 ? `Sonce ne sveti, zato šolo napaja baterija, ki da ${kw(f.bl)}.` : `Sonce ne sveti, zato šola energijo dobiva iz omrežja.`;
    if (f.pb > 0.5 && f.pe > 0.5) return `Sonca je več, kot ga šola potrebuje: presežek polni baterijo, preostanek gre v omrežje.`;
    if (f.pb > 0.5) return `Sonca je več, kot ga šola potrebuje, zato se baterija polni z močjo ${kw(f.pb)}.`;
    if (f.pe > 0.5) return `Baterija je polna, zato ${kw(f.pe)} sončne energije oddajamo v omrežje.`;
    if (f.bl > 0.5) return `Sonca je premalo, zato manjkajočih ${kw(f.bl)} dodaja baterija.`;
    return `Sonce pokriva del porabe, preostalih ${kw(f.gl)} prihaja iz omrežja.`;
  }

  const TOPICS = {
    pv: { label: 'Sončna elektrarna', html: (f) => `<h3>Sončna elektrarna</h3><p>Paneli na strehi pretvarjajo sončno svetlobo v električno energijo. Več ko je sonca, večja je proizvodnja. Ponoči je ni.</p><p>Energija gre najprej v šolo. Kar ostane, napolni baterijo, šele potem gre v omrežje.</p><p class="live">Ob ${clock(state.t)} proizvaja ${kw(f.pv)}, največ pa zmore ${D.meta.pvKwp} kW.</p>` },
    bat: { label: 'Baterija', html: (f) => `<h3>Baterijski hranilnik</h3><p>Deluje kot zalogovnik: ko je sonca preveč, se polni, ko ga je premalo, se prazni. Tako lahko dopoldansko sonce uporabimo tudi zvečer.</p><p>Da se ne obrabi prehitro, ostaja med ${fmt(D.meta.socMin)} % in ${fmt(D.meta.socMax)} % napolnjenosti. Pri polnjenju in praznjenju se del energije izgubi.</p><p class="live">Ob ${clock(state.t)} ${f.pb > 0.5 ? `se polni z močjo ${kw(f.pb)}` : f.bl > 0.5 ? `se prazni z močjo ${kw(f.bl)}` : 'miruje'} in je polna ${fmt(f.soc)} %.</p>` },
    school: { label: 'Šola', html: (f) => `<h3>Poraba šole</h3><p>Šola največ porabi med poukom: razsvetljava, računalniki, prezračevanje in kuhinja. Ponoči in med vikendi delujejo le nujne naprave.</p><p class="live">Ob ${clock(state.t)} porablja ${kw(f.load)}. Od tega kuhinja ${kw(liveSc().series.kit[state.t])}.</p>` },
    grid: { label: 'Omrežje', html: (f) => `<h3>Električno omrežje</h3><p>Omrežje je rezerva: iz njega vzamemo, kar nam manjka, vanj pa oddamo presežek, ki ga ne moremo shraniti.</p><p>Oddana energija je vredna manj kot kupljena, zato se splača porabiti čim več sonca v šoli.</p><p class="live">Ob ${clock(state.t)} ${f.gl > 0.5 ? `iz omrežja jemljemo ${kw(f.gl)}` : f.pe > 0.5 ? `v omrežje oddajamo ${kw(f.pe)}` : 'z omrežjem skoraj ne izmenjujemo energije'}.</p>` },
    direct: { label: 'Neposredna poraba', html: (f) => `<h3>Neposredna poraba</h3><p>Najboljša pot energije je najkrajša: s strehe naravnost do naprav v šoli, brez izgub v bateriji in brez nakupa iz omrežja.</p><p class="live">Ob ${clock(state.t)} gre neposredno v šolo ${kw(f.pl)}, kar je ${fmt(f.load ? 100 * f.pl / f.load : 0)} % porabe.</p>` },
    compare: { label: 'Samoporaba ali samozadostnost?', html: () => {
      const c = cumulative(state.t);
      const used = c.pv - c.pe, own = c.load - c.gl;
      return `<h3>Samoporaba ali samozadostnost?</h3><p>Oba kazalnika sta v odstotkih, a gledata z dveh strani.</p>
      ${ratio('Samoporaba: kam je šlo naše sonce?', c.sc, used, c.pe, COLORS.pv, 'porabili sami', 'oddali')}
      ${ratio('Samozadostnost: od kod je prišla naša energija?', c.ss, own, c.gl, COLORS.load, 'lastna', 'omrežje')}
      <p>Velika elektrarna lahko pokrije veliko porabe, a veliko energije tudi odda: samozadostnost je takrat visoka, samoporaba pa nižja.</p>`;
    } },
  };
  function ratio(title, pct, a, b, c, an, bn) {
    if (pct == null) return `<div class="ratio"><div class="ratio-label"><span>${title}</span></div><p>Sonce danes še ni začelo proizvajati.</p></div>`;
    const tot = a + b || 1;
    return `<div class="ratio"><div class="ratio-label"><span>${title}</span><strong>${fmt(pct)} %</strong></div>
      <div class="ratio-bar"><i style="width:${100 * a / tot}%;background:${c}"></i><i style="width:${100 * b / tot}%;background:var(--axis)"></i></div>
      <div class="ratio-label"><span>${an}: ${fmt(a)} kWh</span><span>${bn}: ${fmt(b)} kWh</span></div></div>`;
  }

  const chips = $('#chips');
  for (const [id, t] of Object.entries(TOPICS)) {
    const b = document.createElement('button'); b.textContent = t.label; b.dataset.topic = id;
    b.addEventListener('click', () => select(id)); chips.appendChild(b);
  }
  function select(id) { state.selected = id; renderLive(); }

  function renderLive() {
    const t = state.t, f = frame(t), c = cumulative(t);
    const unit = (v, u) => `${v}<small>${u}</small>`;
    $('#k-pv').innerHTML = unit(fmt(f.pv), 'kW');
    $('#k-load').innerHTML = unit(fmt(f.load), 'kW');
    $('#k-soc').innerHTML = unit(fmt(f.soc), '%');
    const exporting = f.pe > 0.5 && f.gl < 0.5;
    $('#k-grid-label').textContent = exporting ? 'V omrežje oddajamo' : 'Iz omrežja jemljemo';
    $('#k-grid').innerHTML = unit(fmt(exporting ? f.pe : f.gl), 'kW');
    $('#share').textContent = `${fmt(100 * (1 - f.gl / f.load))} %`;
    $('#sentence').textContent = sentence(f);
    $('#m-ss').textContent = `${fmt(c.ss)} %`;
    $('#b-ss').style.width = `${c.ss}%`;
    $('#m-sc').textContent = c.sc == null ? '–' : `${fmt(c.sc)} %`;
    $('#b-sc').style.width = `${c.sc ?? 0}%`;
    $('#clock').textContent = clock(t);
    $('#scrub').value = t;
    updateFlow(flowNow, f);
    updateFlow(flowExplore, f);
    if (nowChart) nowChart.moveCursor(t);
    $('#explain').innerHTML = TOPICS[state.selected].html(f);
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.topic === state.selected));
  }

  // ---- Scenario view ---------------------------------------------------
  function segmented(host, options, key) {
    host.innerHTML = '';
    for (const [value, label] of options) {
      const b = document.createElement('button'); b.textContent = label;
      b.setAttribute('aria-pressed', state[key] === value);
      b.addEventListener('click', () => { state[key] = value; segmented(host, options, key); renderBetter(); });
      host.appendChild(b);
    }
  }

  function drawGantt(optStarts, pv) {
    const host = $('#gantt'); host.innerHTML = '';
    const W = Math.max(300, host.clientWidth || 600), rowH = 50, topH = 44;
    const H = topH + D.tasks.length * rowH + 22;
    const from = 5 * 4, to = 20 * 4, X = (t) => 2 + (t - from) / (to - from) * (W - 4);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': 'Urnik kuhinjskih naprav: običajni in predlagani čas' }, host);
    const peak = Math.max(1, ...pv);
    let d = `M${X(from)} ${topH - 4}`;
    for (let t = from; t <= to; t++) d += `L${X(t).toFixed(1)} ${(topH - 4 - (pv[Math.min(t, T - 1)] / Math.max(peak, 60)) * 32).toFixed(1)}`;
    svgEl('path', { d: `${d}L${X(to)} ${topH - 4}Z`, fill: COLORS.pv, opacity: .85 }, svg);
    const label = svgEl('text', { x: 2, y: 12 }, svg); label.textContent = 'Proizvodnja sonca';
    for (let h = 6; h <= 20; h += W < 520 ? 4 : 2) {
      svgEl('line', { x1: X(h * 4), x2: X(h * 4), y1: topH, y2: H - 20, stroke: 'var(--grid-line)' }, svg);
      const t = svgEl('text', { x: X(h * 4), y: H - 5, 'text-anchor': h === 20 ? 'end' : 'middle' }, svg); t.textContent = `${h}:00`;
    }
    D.tasks.forEach((task, i) => {
      const y = topH + i * rowH;
      const name = svgEl('text', { x: 2, y: y + 15, class: 'task' }, svg); name.textContent = task.name;
      const b1 = name.getComputedTextLength ? name.getComputedTextLength() : 150;
      const dev = svgEl('text', { x: b1 + 10, y: y + 15, class: 'dev' }, svg); dev.textContent = `${task.power} kW`;
      const by = y + 22;
      svgEl('rect', { x: X(task.s_min), y: by, width: X(task.s_max + task.dur) - X(task.s_min), height: 20, rx: 4, fill: 'var(--surface-2)' }, svg);
      const opt = optStarts[i];
      const bar = svgEl('rect', { x: X(opt), y: by + 2, width: X(opt + task.dur) - X(opt), height: 16, rx: 4, fill: COLORS.load }, svg);
      svgEl('rect', { x: X(task.s_default) + 1, y: by + 1, width: X(task.s_default + task.dur) - X(task.s_default) - 2, height: 18, rx: 4, fill: 'none', stroke: 'var(--ink-2)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
      const tipHtml = `<b>${task.name}</b><div><span>Običajno</span><strong>${clock(task.s_default)}</strong></div><div><span>Predlog</span><strong>${clock(opt)}</strong></div><div><span>Trajanje</span><strong>${fmt(task.dur / 4, 2)} h</strong></div>`;
      bar.addEventListener('pointermove', (ev) => showTip(ev, tipHtml));
      bar.addEventListener('pointerleave', () => { tip.hidden = true; });
    });
  }

  function renderRecs(starts, pv) {
    const avg = (s, n) => pv.slice(s, s + n).reduce((a, b) => a + b, 0) / n;
    const moved = [], kept = [];
    D.tasks.forEach((task, i) => (starts[i] !== task.s_default ? moved : kept).push([task, starts[i]]));
    const host = $('#recs');
    if (state.kitchen !== 'milpShift') {
      host.innerHTML = '<div class="rec"><p>Izbran je običajni urnik kuhinje. Izberite <b>Prilagojen urnik</b>, da vidite predloge modela.</p></div>';
      return;
    }
    let html = moved.map(([task, s]) => {
      const a = avg(task.s_default, task.dur), b = avg(s, task.dur);
      const cmp = b > a + 0.5 ? `Sonce ob novem času v povprečju da <b>${kw(b)}</b> namesto ${kw(a)}.` : `Sonca je ob tem času sicer ${kw(b)}, premik pa bolje uskladi kuhinjo s preostalo porabo šole.`;
      return `<div class="rec"><div class="rec-time">${task.name}: ${clock(s)} <span>namesto ${clock(task.s_default)}</span></div><p>${cmp} Naprava potrebuje ${task.power} kW. ${task.why}</p></div>`;
    }).join('');
    if (!moved.length) html = '<div class="rec"><p>Pri teh pogojih premik opravil ne prinese koristi.</p></div>';
    if (kept.length) html += `<div class="rec"><p><b>Ostane ob običajnem času:</b> ${kept.map(([t]) => t.name).join(', ')}.</p></div>`;
    host.innerHTML = html;
  }

  function drawCaps() {
    const host = $('#caps'); host.innerHTML = '';
    const W = Math.max(280, host.clientWidth || 500), H = 210, m = { l: 8, r: 8, t: 24, b: 26 };
    const caps = D.meta.capacities, group = (W - m.l - m.r) / caps.length;
    const Y = (v) => m.t + (H - m.t - m.b) * (1 - v / 100);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': 'Samozadostnost pri različnih kapacitetah baterije' }, host);
    svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), stroke: 'var(--axis)' }, svg);
    caps.forEach((cap, i) => {
      const cx = m.l + group * (i + .5), bw = Math.min(46, group * .34);
      [['base', 'var(--muted)', -1, 'Osnovno'], ['milpShift', COLORS.load, 1, 'Optimizirano']].forEach(([key, fill, side, name]) => {
        const v = scenario(state.weather, cap, key).kpi.self_suff;
        const x = cx + (side < 0 ? -bw - 1 : 1);
        const r = svgEl('path', { d: `M${x} ${Y(0)}V${Y(v) + 4}q0 -4 4 -4h${bw - 8}q4 0 4 4V${Y(0)}Z`, fill }, svg);
        const lab = svgEl('text', { x: x + bw / 2, y: Y(v) - 6, 'text-anchor': 'middle' }, svg); lab.textContent = `${fmt(v)}`; lab.style.fill = 'var(--ink)';
        const hit = svgEl('rect', { x, y: m.t, width: bw, height: Y(0) - m.t, fill: 'transparent' }, svg);
        hit.addEventListener('pointermove', (ev) => showTip(ev, `<b>${cap ? `${cap} kWh` : 'Brez baterije'}</b><div><span>${name}</span><strong>${fmt(v, 1)} %</strong></div>`));
        hit.addEventListener('pointerleave', () => { tip.hidden = true; });
        r.setAttribute('data-cap', cap);
      });
      const t = svgEl('text', { x: cx, y: H - 8, 'text-anchor': 'middle' }, svg); t.textContent = cap ? `${cap} kWh` : 'Brez';
      t.style.fontWeight = cap === state.cap ? 700 : 400; if (cap === state.cap) t.style.fill = 'var(--ink)';
    });
  }

  function renderBetter() {
    const w = state.weather, cap = state.cap;
    const base = scenario(w, cap, 'base'), opt = scenario(w, cap, state.kitchen), pv = D.scenarios[w].pv;
    const b = base.kpi, o = opt.kpi;
    const dSs = o.self_suff - b.self_suff, dCost = b.cost - o.cost;
    let text;
    if (dCost < 0.05 && Math.abs(dSs) < 0.1) text = w === 'cloudy' ? 'Ob oblačnem dnevu sonca ni dovolj, da bi optimizacija kaj spremenila: vso proizvodnjo šola porabi takoj.' : 'Pri teh nastavitvah optimizacija ne prinese opazne razlike.';
    else text = `Optimizacija dvigne samozadostnost na ${fmt(o.self_suff)} % (osnovno ${fmt(b.self_suff)} %) in dnevni strošek zniža za ${fmt(dCost, 2)} €.`;
    $('#verdict').textContent = text;
    const row = (n, a, c) => `<tr><td>${n}</td><td>${a}</td><td class="opt">${c}</td></tr>`;
    $('#compare').innerHTML = `<thead><tr><th>Dnevni rezultat</th><th>Osnovno</th><th>Optimizirano</th></tr></thead><tbody>
      ${row('Samozadostnost', `${fmt(b.self_suff, 1)} %`, `${fmt(o.self_suff, 1)} %`)}
      ${row('Samoporaba', `${fmt(b.self_cons, 1)} %`, `${fmt(o.self_cons, 1)} %`)}
      ${row('Energija iz omrežja', `${fmt(b.grid)} kWh`, `${fmt(o.grid)} kWh`)}
      ${row('Oddano v omrežje', `${fmt(b.export)} kWh`, `${fmt(o.export)} kWh`)}
      ${row('Strošek dneva', `${fmt(b.cost, 2)} €`, `${fmt(o.cost, 2)} €`)}</tbody>`;
    $('#opt-sub').textContent = state.kitchen === 'milpShift' ? 'Prilagojen urnik kuhinje, baterija po modelu' : 'Običajni urnik kuhinje, baterija po modelu';
    const ymax = Math.ceil(Math.max(...Object.values(D.scenarios).flatMap((x) => x.pv), ...D.base.map((v, t) => v + 60)) / 20) * 20;
    drawDayChart($('#chart-base'), base, pv, { height: 220, ymax });
    drawDayChart($('#chart-opt'), opt, pv, { height: 220, ymax });
    drawGantt(state.kitchen === 'milpShift' ? opt.starts : D.tasks.map((t) => t.s_default), pv);
    renderRecs(opt.starts, pv);
    drawCaps();
  }

  // ---- App shell -------------------------------------------------------
  function setView(v) {
    state.view = v;
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === v));
    document.querySelectorAll('.view').forEach((s) => { s.hidden = s.id !== `view-${v}`; });
    $('#player').hidden = v === 'better';
    tip.hidden = true;
    redraw();
  }
  function redraw() {
    if (state.view === 'now') nowChart = drawDayChart($('#chart-now'), liveSc(), livePv(), { height: Math.max(170, Math.min(300, innerHeight * .17)), ymax: 100, cursor: true });
    if (state.view === 'better') renderBetter();
    renderLive();
  }
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  function setPlaying(p) {
    state.playing = p;
    $('#play').textContent = p ? '❚❚' : '▶';
    $('#play').setAttribute('aria-label', p ? 'Ustavi potek dneva' : 'Predvajaj potek dneva');
  }
  $('#play').addEventListener('click', () => setPlaying(!state.playing));
  $('#scrub').addEventListener('input', (e) => { setPlaying(false); state.t = +e.target.value; renderLive(); });
  document.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => { setPlaying(false); state.t = +b.dataset.time; renderLive(); }));
  setInterval(() => { if (state.playing && state.view !== 'better') { state.t = (state.t + 1) % T; renderLive(); } }, 1000);

  segmented($('#c-weather'), Object.entries(D.meta.weathers), 'weather');
  segmented($('#c-cap'), D.meta.capacities.map((c) => [c, c ? `${c} kWh` : 'Brez']), 'cap');
  segmented($('#c-kitchen'), [['milpFixed', 'Običajni urnik'], ['milpShift', 'Prilagojen urnik']], 'kitchen');
  $('#legend-now').innerHTML = SERIES_LEGEND;
  $('#legend-better').innerHTML = SERIES_LEGEND;
  const m = D.meta;
  $('#assumptions').textContent = `Vsi podatki so simulirani za generično šolo: ${m.pvKwp} kWp, spomladanski šolski dan, 15-minutni koraki, izkoristek baterije ${fmt(m.etaCh * 100)} % v vsako smer. Privzete cene: ${fmt(m.priceHigh, 2)} €/kWh podnevi, ${fmt(m.priceLow, 2)} €/kWh ponoči, odkup ${fmt(m.feedIn, 2)} €/kWh. Rezultati so izračunani z modelom MILP (HiGHS) vnaprej. Portal ne upravlja nobenih naprav.`;

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(redraw, 150); });

  // Public-screen mode: open with ?kiosk to return to the ambient view after 2 idle minutes.
  if (new URLSearchParams(location.search).has('kiosk')) {
    let idle;
    const reset = () => { clearTimeout(idle); idle = setTimeout(() => { setView('now'); setPlaying(true); }, 120000); };
    ['pointerdown', 'keydown'].forEach((e) => addEventListener(e, reset));
    reset();
  }

  setView('now');
})();
