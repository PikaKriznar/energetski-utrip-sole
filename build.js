/* "Dodaj in preizkusi" page: draggable school upgrades and the day simulation behind them.
   Every upgrade value below is an assumption for this demo, not a measurement. */
(() => {
  'use strict';
  const between = (t, from, to) => { const h = t * 0.25; return h >= from && h < to; };

  const MODULES = {
    panels: { name: 'Sončni paneli', icon: 'panel', effect: '+20 kWp', kwp: 20 },
    carport: { name: 'Sončna nadstrešnica', icon: 'carport', effect: '+30 kWp', kwp: 30 },
    wind: { name: 'Vetrnica', icon: 'wind', effect: '+10 kW vetra', wind: 10 },
    battery: { name: 'Baterija', icon: 'battery', effect: '+50 kWh', kwh: 50 },
    bus: { name: 'Električni avtobus', icon: 'ebus', effect: '24 kW, 9–12 h', load: (t) => (between(t, 9, 12) ? 24 : 0) },
    evcars: { name: 'Polnilnice za avte', icon: 'evcar', effect: '22 kW, 8.30–12.30', load: (t) => (between(t, 8.5, 12.5) ? 22 : 0) },
    laptops: { name: '30 prenosnikov', icon: 'laptop', effect: '+1,8 kW med poukom', load: (t) => (between(t, 8, 15) ? 1.8 : 0) },
    heatpump: { name: 'Toplotna črpalka', icon: 'heatpump', effect: '10 kW, 6–16 h', load: (t) => (between(t, 6, 16) ? 10 : 0) },
    led: { name: 'LED razsvetljava', icon: 'lamp', effect: '−50 % razsvetljave', roomLoad: true },
    smart: { name: 'Pametna kuhinja', icon: 'clock', effect: 'opravila ob soncu', smart: true },
  };

  // box: [x0, y0, z0, x1, y1, z1] in the school's plan units.
  const ROOF = 4.7, TOKEN = 6.5;
  const BLUE = '#2a78d6', AMBER = '#eda100', GREEN = '#1baf7a';
  const ZONES = {
    'roof-tech': { module: 'panels', name: 'Streha tehnične sobe', box: [0, ROOF, 0, 5, 5.6, 5] },
    'roof-kitchen': { module: 'panels', name: 'Streha kuhinje', box: [0, ROOF, 5, 5, 5.6, 10] },
    carport: { module: 'carport', name: 'Parkirišče', box: [13, 0, 18, 17.2, 3.4, 22], link: { color: AMBER, pts: [[15, 0.25, 18], [15, 0.25, 15], [10, 0.25, 15], [10, 0.25, 6.2]] } },
    wind: { module: 'wind', name: 'Igrišče', box: [21.2, 0, 12, 22.6, 9, 13.4], link: { color: AMBER, pts: [[21.9, 0.25, 12.7], [18.9, 0.25, 12.7], [18.9, 0.25, 15.3], [10.4, 0.25, 15.3], [10.4, 0.25, 6.2]] } },
    'bat-1': { module: 'battery', name: 'Ob bateriji', box: [20.8, 0, 7.4, 23.2, 2, 8.8], link: { color: GREEN, pts: [[23, 0.25, 3.6], [23, 0.25, 7.4]] } },
    'bat-2': { module: 'battery', name: 'Ob bateriji', box: [20.8, 0, 8.95, 23.2, 2, 10.35], link: { color: GREEN, pts: [[23.35, 0.25, 3.6], [23.35, 0.25, 9.6], [23.2, 0.25, 9.6]] } },
    'bus-1': { module: 'bus', name: 'Parkirišče za avtobus', box: [6, 0, 18, 9, 2.4, 22], link: { color: BLUE, pts: [[9.6, 0.25, 6.2], [9.6, 0.25, 17.7], [7.5, 0.25, 17.7], [7.5, 0.25, 18.2]] } },
    'bus-2': { module: 'bus', name: 'Parkirišče za avtobus', box: [9.4, 0, 18, 12.4, 2.4, 22], link: { color: BLUE, pts: [[10.2, 0.25, 6.2], [10.2, 0.25, 17.7], [10.9, 0.25, 17.7], [10.9, 0.25, 18.2]] } },
    ev: { module: 'evcars', name: 'Polnilno mesto', box: [19.5, 0, 15.2, 24.3, 1.8, 17.3], link: { color: BLUE, pts: [[10.6, 0.25, 6.2], [10.6, 0.25, 14.7], [19, 0.25, 14.7], [19, 0.25, 16.2], [19.6, 0.25, 16.2]] } },
    'comp-1': { module: 'laptops', name: 'Računalnica', room: 'comp', box: [14.3, TOKEN, 0.5, 15.5, 7.4, 1.7], float: true },
    'comp-2': { module: 'laptops', name: 'Računalnica', room: 'comp', box: [15.6, TOKEN, 0.5, 16.8, 7.4, 1.7], float: true },
    'comp-3': { module: 'laptops', name: 'Računalnica', room: 'comp', box: [16.9, TOKEN, 0.5, 18.1, 7.4, 1.7], float: true },
    hp: { module: 'heatpump', name: 'Ob kuhinji', room: 'tech', box: [5.2, 0, 5.3, 6.8, 1.9, 6.9], link: { color: BLUE, pts: [[9.1, 0.25, 6.2], [6.8, 0.25, 6.2]] } },
    'led-A': { module: 'led', name: 'Učilnice – zahod', room: 'classA', box: [6.6, TOKEN, 0.6, 7.9, 7.4, 1.6], float: true },
    'led-B': { module: 'led', name: 'Učilnice – vzhod', room: 'classB', box: [11.1, TOKEN, 0.6, 12.4, 7.4, 1.6], float: true },
    smart: { module: 'smart', name: 'Kuhinja', room: 'kitchen', box: [1.9, TOKEN, 5.4, 3.1, 7.6, 6.6], float: true },
  };
  window.BuildData = { MODULES, ZONES };

  window.createBuilder = (deps) => {
    const { D, $, fmt, kw, clock, svgEl, showTip, tip, liveSc, livePv, liveKit, roomShares, drawDayChart, getScene, state, baseCap } = deps;
    const T = D.meta.steps;
    const range = (f) => Array.from({ length: T }, (_, t) => f(t));
    const WIND = range((t) => Math.max(0.3, 10 * (0.2 + 0.12 * Math.sin(t / 7) + 0.08 * Math.sin(t / 2.3 + 1))));
    const PRICE = range((t) => (t >= 24 && t < 88 ? D.meta.priceHigh : D.meta.priceLow));

    // Same charge-on-surplus rule as simulate_rule() in model/optimize.py, so an empty school matches data.js.
    function simulate(pv, load, cap) {
      const { cRate, socMin, socMax, etaCh, etaDis, dt } = D.meta;
      const lo = socMin / 100 * cap, hi = socMax / 100 * cap, pmax = cRate * cap;
      let e = 0.5 * cap, r;
      for (let day = 0; day < 30; day++) {
        const start = e;
        r = { pl: [], pb: [], pe: [], bl: [], gl: [], soc: [] };
        for (let t = 0; t < T; t++) {
          const direct = Math.min(pv[t], load[t]), surplus = pv[t] - direct, deficit = load[t] - direct;
          const charge = cap ? Math.min(surplus, pmax, Math.max(0, (hi - e) / (etaCh * dt))) : 0;
          const dis = cap ? Math.min(deficit, pmax, Math.max(0, (e - lo) * etaDis / dt)) : 0;
          e += charge * etaCh * dt - dis * dt / etaDis;
          r.pl.push(direct); r.pb.push(charge); r.pe.push(surplus - charge); r.bl.push(dis); r.gl.push(deficit - dis);
          r.soc.push(cap ? 100 * e / cap : 0);
        }
        if (Math.abs(e - start) < 1e-3) break;
      }
      return r;
    }

    function compute(list) {
      const mods = list.map((p) => ({ ...p, m: MODULES[p.module], z: ZONES[p.zone] }));
      const kitchen = mods.some((x) => x.m.smart) ? liveKit('smart') : liveKit('base');
      const pvBase = livePv();
      const kwp = mods.reduce((a, x) => a + (x.m.kwp || 0), 0), winds = mods.filter((x) => x.m.wind).length;
      const pv = pvBase.map((v, t) => v * (1 + kwp / D.meta.pvKwp) + winds * WIND[t]);
      const cap = baseCap + mods.reduce((a, x) => a + (x.m.kwh || 0), 0);
      mods.forEach((x) => {
        x.arr = x.m.roomLoad ? range((t) => -0.45 * 0.5 * D.base[t] * roomShares(t * 0.25)[x.z.room]) : x.m.load ? range(x.m.load) : null;
      });
      const load = range((t) => D.base[t] + kitchen.series[t] + mods.reduce((a, x) => a + (x.arr ? x.arr[t] : 0), 0));
      const r = simulate(pv, load, cap);
      const sum = (a) => a.reduce((x, y) => x + y, 0) * D.meta.dt;
      const used = sum(load), made = sum(pv), grid = sum(r.gl), exported = sum(r.pe);
      const kpi = {
        ss: 100 * (1 - grid / used), sc: made ? 100 * (1 - exported / made) : 0, grid,
        cost: range((t) => r.gl[t] * PRICE[t]).reduce((a, b) => a + b, 0) * D.meta.dt - exported * D.meta.feedIn,
      };
      return { mods, pv, load, cap, kitchen, series: { ...r, load, kit: kitchen.series }, kpi };
    }

    let placed = [], current = compute([]);
    const baseline = current;

    const freeZones = (id) => Object.keys(ZONES).filter((z) => ZONES[z].module === id && !placed.some((p) => p.zone === z));
    const limit = (id) => Object.values(ZONES).filter((z) => z.module === id).length;

    // ---- Modules list ------------------------------------------------------
    const host = $('#mods');
    const cards = {};
    Object.entries(MODULES).forEach(([id, m]) => {
      const c = document.createElement('div');
      c.className = 'mod'; c.tabIndex = 0; c.setAttribute('role', 'button'); c.dataset.mod = id;
      c.setAttribute('aria-label', `Dodaj: ${m.name}, ${m.effect}`);
      c.innerHTML = `${window.machineIcon(m.icon)}<b>${m.name}</b><span>${m.effect}</span><em></em><button class="mod-rm" aria-label="Odstrani: ${m.name}">−</button>`;
      host.appendChild(c);
      cards[id] = c;
      let down = null, moved = false;
      c.addEventListener('pointerdown', (ev) => {
        if (ev.target.closest('.mod-rm')) return;
        down = { x: ev.clientX, y: ev.clientY }; moved = false;
        const onMove = (e) => {
          if (!moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 && freeZones(id).length) { moved = true; off(); beginDrag(id, e, null); }
        };
        const off = () => { removeEventListener('pointermove', onMove); removeEventListener('pointerup', off); removeEventListener('pointercancel', off); };
        addEventListener('pointermove', onMove); addEventListener('pointerup', off); addEventListener('pointercancel', off);
      });
      const quickAdd = () => { const z = freeZones(id)[0]; if (z) { placed = [...placed, { module: id, zone: z }]; commit(); } };
      c.addEventListener('click', (ev) => { if (ev.target.closest('.mod-rm')) return; if (!moved) quickAdd(); moved = false; });
      c.addEventListener('keydown', (ev) => { if (ev.target === c && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); quickAdd(); } });
      c.querySelector('.mod-rm').addEventListener('click', () => {
        const i = placed.map((p) => p.module).lastIndexOf(id);
        if (i >= 0) { placed = placed.filter((_, j) => j !== i); commit(); }
      });
    });
    $('#build-reset').addEventListener('click', () => { placed = []; commit(); });

    // ---- Drag and drop -----------------------------------------------------
    const ghost = $('#drag-ghost');
    let drag = null;
    function overStage(x, y) {
      const area = (innerWidth > 960 ? $('#build-free') : $('#stage3d')).getBoundingClientRect();
      return x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
    }
    function moveGhost(e) {
      ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -60%)`;
      drag.zone = overStage(e.clientX, e.clientY) ? getScene().dragMove(e.clientX, e.clientY) : getScene().dragMove(-9999, -9999);
      ghost.classList.toggle('ok', !!drag.zone);
      ghost.querySelector('span').textContent = drag.zone ? ZONES[drag.zone].name : drag.fromZone ? 'Spustite ob strani za odstranitev' : MODULES[drag.moduleId].name;
    }
    function beginDrag(moduleId, e, fromZone) {
      drag = { moduleId, fromZone, zone: null };
      if (fromZone) { placed = placed.filter((p) => p.zone !== fromZone); getScene().setPlaced(placed); }
      ghost.innerHTML = `${window.machineIcon(MODULES[moduleId].icon)}<span></span>`;
      ghost.hidden = false;
      document.body.classList.add('dragging');
      getScene().startDrag(moduleId, freeZones(moduleId));
      moveGhost(e);
      addEventListener('pointermove', moveGhost);
      addEventListener('pointerup', endDrag);
      addEventListener('pointercancel', cancelDrag);
    }
    function finish() {
      removeEventListener('pointermove', moveGhost);
      removeEventListener('pointerup', endDrag);
      removeEventListener('pointercancel', cancelDrag);
      ghost.hidden = true;
      document.body.classList.remove('dragging');
      getScene().endDrag();
      drag = null;
      commit();
    }
    function endDrag() { if (drag.zone) placed = [...placed, { module: drag.moduleId, zone: drag.zone }]; finish(); }
    function cancelDrag() { if (drag.fromZone) placed = [...placed, { module: drag.moduleId, zone: drag.fromZone }]; finish(); }
    function grab(zone, ev) { const p = placed.find((x) => x.zone === zone); if (p) beginDrag(p.module, ev, zone); }

    function commit() {
      current = compute(placed);
      getScene().setPlaced(placed);
      paintCards();
      if (state.view === 'build') { draw(); tick(state.t); }
    }
    function paintCards() {
      Object.entries(cards).forEach(([id, c]) => {
        const n = placed.filter((p) => p.module === id).length, max = limit(id);
        c.querySelector('em').textContent = `${n}/${max}`;
        c.classList.toggle('placed', n > 0);
        c.classList.toggle('full', n >= max);
      });
      $('#build-empty').hidden = placed.length > 0;
      $('#build-reset').hidden = placed.length === 0;
    }

    // ---- Graphs ------------------------------------------------------------
    let cursors = [];
    function compareChart(el, before, after, color, label, height) {
      el.innerHTML = '';
      const W = Math.max(190, el.clientWidth || 320), H = height, m = { l: 30, r: 6, t: 8, b: 18 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const top = Math.max(20, Math.ceil(Math.max(...before, ...after) / 20) * 20);
      const X = (t) => m.l + (t / (T - 1)) * iw, Y = (v) => m.t + ih - (Math.max(0, v) / top) * ih;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': label }, el);
      [0, top / 2, top].forEach((v) => {
        svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: v ? 'var(--grid-line)' : 'var(--axis)' }, svg);
        svgEl('text', { x: m.l - 5, y: Y(v) + 4, 'text-anchor': 'end' }, svg).textContent = fmt(v);
      });
      [0, 6, 12, 18].forEach((h) => { svgEl('text', { x: X(h * 4), y: H - 4, 'text-anchor': h ? 'middle' : 'start' }, svg).textContent = `${h}:00`; });
      const line = (a) => a.map((v, t) => `${t ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
      svgEl('path', { d: `${line(after)}L${X(T - 1)} ${Y(0)}L${X(0)} ${Y(0)}Z`, fill: color, opacity: .16 }, svg);
      svgEl('path', { d: line(before), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, svg);
      svgEl('path', { d: line(after), fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
      const cur = svgEl('line', { y1: m.t, y2: m.t + ih, stroke: 'var(--ink)', 'stroke-width': 1.5 }, svg);
      const hit = svgEl('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }, svg);
      const move = (ev) => {
        const r = svg.getBoundingClientRect();
        const t = Math.max(0, Math.min(T - 1, Math.round(((ev.clientX - r.left) * W / r.width - m.l) / iw * (T - 1))));
        showTip(ev, `<b>${clock(t)}</b><div><span>Zdaj</span><strong>${kw(before[t])}</strong></div><div><span>Z dodatki</span><strong>${kw(after[t])}</strong></div>`);
      };
      hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
      hit.addEventListener('pointerleave', () => { tip.hidden = true; });
      return (t) => { cur.setAttribute('x1', X(t)); cur.setAttribute('x2', X(t)); };
    }
    function kpiCard(id, now, was) {
      $(`#b-${id}`).textContent = now;
      $(`#b-${id}-was`).textContent = placed.length ? `prej ${was}` : ' ';
    }
    function draw() {
      const h = Math.max(84, Math.min(150, Math.round((innerHeight - 400) / 3)));
      cursors = [
        compareChart($('#b-chart-load'), baseline.load, current.load, '#2a78d6', 'Poraba šole skozi dan, zdaj in z dodatki', h),
        compareChart($('#b-chart-pv'), baseline.pv, current.pv, '#eda100', 'Proizvodnja skozi dan, zdaj in z dodatki', h),
      ];
      const top = Math.max(100, Math.ceil(Math.max(...current.load, ...current.pv) / 20) * 20);
      const stack = drawDayChart($('#b-chart-src'), { series: current.series }, current.pv, { height: h, ymax: top, cursor: true });
      cursors.push(stack.moveCursor);
      const a = current.kpi, b = baseline.kpi;
      kpiCard('ss', `${fmt(a.ss)} %`, `${fmt(b.ss)} %`);
      kpiCard('grid', `${fmt(a.grid)} kWh`, `${fmt(b.grid)} kWh`);
      kpiCard('cost', `${fmt(a.cost, 2)} €`, `${fmt(b.cost, 2)} €`);
    }
    function tick(t) { cursors.forEach((c) => c(t)); }

    // ---- Data for the 3D scene ---------------------------------------------
    function sceneData(t) {
      const s = current.series, f = { pv: current.pv[t], load: current.load[t], pl: s.pl[t], pb: s.pb[t], pe: s.pe[t], bl: s.bl[t], gl: s.gl[t], soc: s.soc[t] };
      const shares = roomShares(t * 0.25), loads = { kitchen: s.kit[t] };
      for (const k in shares) loads[k] = D.base[t] * shares[k];
      const zoneFlows = {};
      current.mods.forEach((x) => {
        if (x.arr && x.z.room) loads[x.z.room] = Math.max(0, loads[x.z.room] + x.arr[t]);
        if (x.arr) zoneFlows[x.zone] = Math.abs(x.arr[t]);
        else if (x.m.kwp) zoneFlows[x.zone] = livePv()[t] * x.m.kwp / D.meta.pvKwp;
        else if (x.m.wind) zoneFlows[x.zone] = WIND[t];
        else if (x.m.kwh) zoneFlows[x.zone] = (s.pb[t] + s.bl[t]) * x.m.kwh / current.cap;
      });
      const exporting = f.pe > 0.5 && f.gl < 0.5;
      const names = { kitchen: 'Kuhinja', classA: 'Učilnice 1', classB: 'Učilnice 2', comp: 'Računalnica', gym: 'Telovadnica', tech: 'Tehnika' };
      const tagValues = {
        pv: { label: 'Sonce', value: kw(f.pv) }, school: { label: 'Poraba', value: kw(f.load) },
        bat: { label: 'Baterija', value: `${fmt(f.soc)} %` }, grid: { label: exporting ? 'V omrežje' : 'Iz omrežja', value: kw(exporting ? f.pe : f.gl) },
      };
      for (const k in names) tagValues[k] = { label: names[k], value: kw(loads[k]) };
      return { t, f, loads, zoneFlows, tagValues, onDevices: current.kitchen.active(t) };
    }

    paintCards();
    return { draw, tick, sceneData, grab, syncScene: () => getScene().setPlaced(placed), testCompute: compute };
  };
})();
