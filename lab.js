/* "Dodaj in preizkusi": catalogue of models, their slots on the school, and the what-if simulation. */
window.LAB = (() => {
  'use strict';
  const T = 96, DT = 0.25, H = 4.6, FLOAT = H + 1.7;
  const between = (a, b) => Array.from({ length: T }, (_, t) => ((t + 0.5) * DT >= a && (t + 0.5) * DT < b ? 1 : 0));
  const TYPES = [
    { id: 'pv_roof', name: 'Sončni paneli', effect: '+15 kWp', icon: 'panel' },
    { id: 'carport', name: 'Solarni nadstrešek', effect: '+25 kWp', icon: 'carport' },
    { id: 'wind', name: 'Mala vetrnica', effect: 'do 6 kW', icon: 'wind' },
    { id: 'battery', name: 'Dodatna baterija', effect: '+50 kWh', icon: 'battery' },
    { id: 'ebus', name: 'Električni avtobus', effect: '75 kWh na dan', icon: 'bus' },
    { id: 'ev', name: 'Polnilnica za avte', effect: '33 kWh na dan', icon: 'ev' },
    { id: 'heatpump', name: 'Toplotna črpalka', effect: 'do 12 kW', icon: 'heatpump' },
    { id: 'laptops', name: '30 prenosnikov', effect: '+1,4 kW med poukom', icon: 'laptop' },
    { id: 'boards', name: 'Interaktivne table', effect: '+1,5 kW med poukom', icon: 'board' },
    { id: 'led', name: 'LED razsvetljava', effect: '−55 % luči v prostoru', icon: 'led' },
  ];
  const SLOTS = {
    pv_roof: [{ x: 2.5, y: H, z: 7.5 }, { x: 2.5, y: H, z: 2.5 }],
    carport: [{ x: 22, y: 0, z: 12.7 }, { x: 14.8, y: 0, z: 15.3 }],
    wind: [{ x: -2, y: 0, z: 14.5 }, { x: 25.5, y: 0, z: 2.5 }],
    battery: [{ x: -2.6, y: 0, z: 6.5 }, { x: 12.5, y: 0, z: -2.3 }],
    ebus: [{ x: 21, y: 0, z: 16.2 }, { x: 21, y: 0, z: 17.9 }],
    ev: [{ x: 9, y: 0, z: 17.4 }, { x: 14.5, y: 0, z: 17.8 }],
    heatpump: [{ x: 5.9, y: 0, z: 14.5 }, { x: 16.5, y: 0, z: -1.3 }],
    laptops: [{ x: 15, y: FLOAT, z: 2.5 }, { x: 16.2, y: FLOAT, z: 2.5 }, { x: 17.3, y: FLOAT, z: 2.5 }],
    boards: [{ x: 7.25, y: FLOAT, z: 1.5, room: 'classA' }, { x: 11.75, y: FLOAT, z: 1.5, room: 'classB' }],
    led: [{ x: 7.25, y: FLOAT, z: 3.6, room: 'classA' }, { x: 11.75, y: FLOAT, z: 3.6, room: 'classB' }, { x: 2.5, y: FLOAT, z: 12.5, room: 'gym' }, { x: 15.2, y: FLOAT, z: 4.2, room: 'comp' }],
  };
  const typeById = (id) => TYPES.find((t) => t.id === id);

  function lessons() {
    const out = new Array(T).fill(0);
    [[8.25, 1], [9.25, 1], [10.25, 1], [11.25, 1], [12.25, 0.9], [13.25, 0.7], [14.25, 0.4]].forEach(([a, s]) => between(a, a + 0.75).forEach((v, t) => { out[t] += v * s; }));
    return out;
  }

  function simulate(D, weather, items) {
    const base = D.scenarios[weather].byCap[100].base;
    const pv = D.scenarios[weather].pv.slice();
    const load = D.base.map((v, t) => v + base.series.kit[t]);
    let cap = 100;
    const L = lessons();
    const add = (arr, f = 1) => arr.forEach((v, t) => { load[t] += v * f; });
    const roomAdd = {}, extras = [];
    const bump = (room, arr, f = 1) => { roomAdd[room] = roomAdd[room] || new Array(T).fill(0); arr.forEach((v, t) => { roomAdd[room][t] += v * f; }); };
    const windF = { sunny: 0.2, partly: 0.4, cloudy: 0.55 }[weather];
    for (const it of items) {
      const slot = SLOTS[it.type][it.slot];
      if (it.type === 'pv_roof') D.scenarios[weather].pv.forEach((v, t) => { pv[t] += v * 0.15; });
      if (it.type === 'carport') D.scenarios[weather].pv.forEach((v, t) => { pv[t] += v * 0.25; });
      if (it.type === 'wind') for (let t = 0; t < T; t++) pv[t] += 6 * windF * (1 + 0.4 * Math.sin(t / 7 + it.slot));
      if (it.type === 'battery') cap += 50;
      if (it.type === 'ebus') { const a = between(9.5 + it.slot * 1.75, 11 + it.slot * 1.75).map((v) => v * 50); add(a); extras.push({ item: it, arr: a }); }
      if (it.type === 'ev') { const a = between(8 + it.slot, 11 + it.slot).map((v) => v * 11); add(a); extras.push({ item: it, arr: a }); }
      if (it.type === 'heatpump') { const a = Array.from({ length: T }, (_, t) => { const h = (t + 0.5) * DT; return h >= 6 && h < 9 ? 12 : h >= 9 && h < 16 ? 6 : 1.5; }); add(a); bump('tech', a); }
      if (it.type === 'laptops') { add(L, 1.4); bump('comp', L, 1.4); }
      if (it.type === 'boards') { add(L, 1.5); bump(slot.room, L, 1.5); }
      if (it.type === 'led') {
        const lamp = D.rooms[slot.room].find((d) => d.name === 'Razsvetljava');
        lamp.arr.forEach((v, t) => { load[t] -= v * 0.55; });
        bump(slot.room, lamp.arr, -0.55);
      }
    }
    return { ...run(D, pv, load, cap), roomAdd, extras };
  }

  function run(D, pv, load, cap) {
    const m = D.meta, rate = m.cRate * cap, sMin = (m.socMin / 100) * cap, sMax = (m.socMax / 100) * cap;
    let e = 0.5 * cap, r;
    for (let k = 0; k < 30; k++) {
      const start = e;
      r = { pl: [], pb: [], pe: [], bl: [], gl: [], soc: [] };
      for (let t = 0; t < T; t++) {
        const direct = Math.min(pv[t], load[t]), surplus = pv[t] - direct, deficit = load[t] - direct;
        const ch = Math.min(surplus, rate, Math.max(0, (sMax - e) / (m.etaCh * DT)));
        const dis = Math.min(deficit, rate, Math.max(0, (e - sMin) * m.etaDis / DT));
        e += ch * m.etaCh * DT - dis * DT / m.etaDis;
        r.pl.push(direct); r.pb.push(ch); r.pe.push(surplus - ch); r.bl.push(dis); r.gl.push(deficit - dis); r.soc.push(100 * e / cap);
      }
      if (Math.abs(e - start) < 1e-3) break;
    }
    const sum = (a) => a.reduce((x, y) => x + y, 0) * DT;
    const grid = sum(r.gl), used = sum(load), prod = sum(pv), exp = sum(r.pe);
    const cost = r.gl.reduce((x, v, t) => x + v * (t >= 24 && t < 88 ? m.priceHigh : m.priceLow) * DT, 0) - exp * m.feedIn;
    return { ...r, pv, load, cap, kpi: { selfSuff: 100 * (1 - grid / used), selfCons: prod ? 100 * (1 - exp / prod) : 0, grid, exp, cost, used, peak: Math.max(...r.gl) } };
  }
  return { TYPES, SLOTS, typeById, simulate };
})();
