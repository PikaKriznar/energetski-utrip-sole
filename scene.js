/* Isometric school illustration with a "CT" lens that reveals the rooms under the roof. */
window.SchoolScene = (() => {
  'use strict';
  const U = 25, K = 0.866 * U, OX = 578, OY = 140, H = 4.5, ZF = H - 0.9;
  const W = 1200, VH = 800, LENS_R = 125;
  const sx = (x, y) => OX + (x - y) * K;
  const sy = (x, y, z = 0) => OY + (x + y) * 0.5 * U - z * U;
  const pt = (x, y, z = 0) => `${sx(x, y).toFixed(1)},${sy(x, y, z).toFixed(1)}`;
  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const poly = (g, pts, fill, extra = {}) => el('polygon', { points: pts.map((p) => pt(...p)).join(' '), fill, ...extra }, g);
  const planQuad = (x0, y0, x1, y1, z = 0) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
  function box(g, x0, y0, z0, x1, y1, z1, top, right, left) {
    poly(g, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], right);
    poly(g, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], left);
    poly(g, planQuad(x0, y0, x1, y1, z1), top);
  }
  const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${pt(...p).replace(',', ' ')}`).join('');

  const ROOMS = [
    { id: 'tech', name: 'Tehnična soba', x0: 0, y0: 0, x1: 5, y1: 5, floor: '#c8b6ff', text: 'Razsmernik pretvarja sončno energijo za šolo in baterijo. Tu so tudi prezračevanje in skupne naprave.' },
    { id: 'classA', name: 'Učilnice – zahod', x0: 5, y0: 0, x1: 9.5, y1: 5, floor: '#ffd166', text: 'Razsvetljava, projektorji in prezračevanje med poukom.' },
    { id: 'classB', name: 'Učilnice – vzhod', x0: 9.5, y0: 0, x1: 14, y1: 5, floor: '#ffb3c6', text: 'Razsvetljava, projektorji in prezračevanje med poukom.' },
    { id: 'comp', name: 'Računalnica', x0: 14, y0: 0, x1: 18, y1: 5, floor: '#9bf6ff', text: 'Računalniki se prižgejo ob začetku pouka in porabijo stalno moč.' },
    { id: 'kitchen', name: 'Kuhinja', x0: 0, y0: 5, x1: 5, y1: 10, floor: '#caffbf', text: 'Največji porabnik, ki ga lahko časovno prilagajamo.' },
    { id: 'gym', name: 'Telovadnica', x0: 0, y0: 10, x1: 5, y1: 15, floor: '#ffc078', text: 'Razsvetljava in prezračevanje, zvečer tudi športne dejavnosti.' },
  ];
  const center = (r) => { const x = (r.x0 + r.x1) / 2, y = (r.y0 + r.y1) / 2; return { x: sx(x, y), y: sy(x, y, H) }; };
  const DEVICES = {
    bake: { x0: 0.8, y0: 6, x1: 1.9, y1: 7, h: 1.3, c: ['#ff9f1c', '#d97706', '#f4b942'] },
    cook: { x0: 2.3, y0: 6, x1: 3.5, y1: 7, h: 0.9, c: ['#ef476f', '#b5294e', '#d63a60'] },
    dish: { x0: 0.8, y0: 8.2, x1: 1.9, y1: 9.2, h: 0.9, c: ['#118ab2', '#0b6583', '#0f7a9e'] },
    cool: { x0: 3.5, y0: 8, x1: 4.6, y1: 9.3, h: 1.5, c: ['#90e0ef', '#48a9c5', '#6cc6dc'] },
    wash: { x0: 2.3, y0: 8.2, x1: 3.2, y1: 9.1, h: 0.9, c: ['#7b5cff', '#5438c9', '#6a4cec'] },
  };

  /* Per-room split of the simulated school load: an estimate, not a measurement. */
  function roomShares(h) {
    const school = h >= 7.5 && h < 15.5, evening = h >= 17 && h < 21;
    return school ? { tech: 0.26, classA: 0.21, classB: 0.21, comp: 0.18, gym: 0.14 }
      : evening ? { tech: 0.45, classA: 0.05, classB: 0.05, comp: 0.05, gym: 0.4 }
        : { tech: 0.76, classA: 0.07, classB: 0.07, comp: 0.05, gym: 0.05 };
  }

  function tree(g, x, y, s, c1, c2) {
    box(g, x - 0.12, y - 0.12, 0, x + 0.12, y + 0.12, 1.3 * s, '#8a5a33', '#6d4526', '#7a4f2c');
    const cx = sx(x, y), cy = sy(x, y, 2.2 * s);
    el('circle', { cx, cy, r: 26 * s, fill: c2 }, g);
    el('circle', { cx: cx - 5 * s, cy: cy - 6 * s, r: 19 * s, fill: c1 }, g);
  }
  function kid(g, x, y, c) {
    const cx = sx(x, y), cy = sy(x, y);
    el('rect', { x: cx - 3.5, y: cy - 15, width: 7, height: 13, rx: 3.5, fill: c }, g);
    el('circle', { cx, cy: cy - 19, r: 4, fill: '#ffd8b1' }, g);
  }

  function create(host, card, chips, api) {
    const { D, fmt, kw, getSc } = api;
    const svg = el('svg', { viewBox: `0 0 ${W} ${VH}`, class: 'scene-svg', role: 'img', 'aria-label': 'Ilustracija šole s sončno elektrarno, baterijo in omrežjem. CT pogled razkrije prostore in njihovo porabo.' }, host);
    const defs = el('defs', {}, svg);
    const mask = el('mask', { id: 'ct-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: VH }, defs);
    el('rect', { width: W, height: VH, fill: '#fff' }, mask);
    const hole = el('circle', { fill: '#000', r: LENS_R, cx: -500, cy: -500 }, mask);
    const roofOutline = [[0, 0, H], [18, 0, H], [18, 5, H], [5, 5, H], [5, 15, H], [0, 15, H]];
    const clip = el('clipPath', { id: 'roof-clip' }, defs);
    poly(clip, roofOutline, '#000');

    // Ground
    const ground = el('g', {}, svg);
    el('rect', { width: W, height: VH, fill: '#7ed957' }, ground);
    poly(ground, planQuad(19, 11, 31, 17), '#4cbb4c');
    poly(ground, planQuad(19.4, 11.4, 30.6, 16.6), 'none', { stroke: '#fff', 'stroke-width': 2.5 });
    el('path', { d: line([[25, 11.4], [25, 16.6]]), stroke: '#fff', 'stroke-width': 2.5 }, ground);
    poly(ground, planQuad(-60, 18, 80, 22), '#4a4e69');
    for (let x = -58; x < 78; x += 3) poly(ground, planQuad(x, 19.9, x + 1.6, 20.1), '#ffe066');
    poly(ground, planQuad(-60, 17.2, 80, 18), '#f8edeb');
    poly(ground, planQuad(5, 5, 18.5, 17.2), '#ffe5b4');
    poly(ground, planQuad(8.5, 5, 11.5, 17.2), '#ffcad4');
    poly(ground, planQuad(12.5, 8, 18, 14), '#ff7b00');
    poly(ground, planQuad(13, 8.5, 17.5, 13.5), '#00b4d8');
    el('path', { d: line([[15.25, 8.5], [15.25, 13.5]]), stroke: '#fff', 'stroke-width': 2.5 }, ground);
    ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#7b5cff', '#ff9f1c'].forEach((c, i) => {
      poly(ground, planQuad(6.2, 7 + i * 1.05, 7.6, 7.95 + i * 1.05), c);
    });
    poly(ground, planQuad(18.5, 0, 25, 5.6), '#c9ada7');

    // Behind-building trees, facades
    const back = el('g', {}, svg);
    [[-3, 3, '#38b000', '#008000'], [3, -3, '#ff8fab', '#fb6f92'], [9, -3, '#70e000', '#38b000'], [15, -3, '#ffd60a', '#ffb703'], [-3, 10, '#ff8fab', '#fb6f92']]
      .forEach(([x, y, a, b]) => tree(back, x, y, 1.1, a, b));

    const fac = el('g', {}, svg);
    const glowList = [];
    const shutters = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#ff9f1c', '#7b5cff'];
    function faceY(x0, x1, y, wall, band) {
      poly(fac, [[x0, y, 0], [x1, y, 0], [x1, y, H], [x0, y, H]], wall);
      poly(fac, [[x0, y, 0], [x1, y, 0], [x1, y, 0.8], [x0, y, 0.8]], band);
      let i = 0;
      for (let x = x0 + 0.5; x + 1 <= x1; x += 1.7) for (const z of [1.1, 2.9]) {
        const q = [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1.15], [x, y, z + 1.15]];
        poly(fac, q, '#264653'); glowList.push(q);
        poly(fac, [[x + 1, y, z], [x + 1.25, y, z], [x + 1.25, y, z + 1.15], [x + 1, y, z + 1.15]], shutters[i++ % 6]);
      }
    }
    function faceX(y0, y1, x, wall, band) {
      poly(fac, [[x, y0, 0], [x, y1, 0], [x, y1, H], [x, y0, H]], wall);
      poly(fac, [[x, y0, 0], [x, y1, 0], [x, y1, 0.8], [x, y0, 0.8]], band);
      let i = 2;
      for (let y = y0 + 0.5; y + 1 <= y1; y += 1.7) for (const z of [1.1, 2.9]) {
        const q = [[x, y, z], [x, y + 1, z], [x, y + 1, z + 1.15], [x, y, z + 1.15]];
        poly(fac, q, '#264653'); glowList.push(q);
        poly(fac, [[x, y + 1, z], [x, y + 1.25, z], [x, y + 1.25, z + 1.15], [x, y + 1, z + 1.15]], shutters[i++ % 6]);
      }
    }
    faceX(0, 5, 18, '#d94a32', '#e6a800');
    faceY(5, 18, 5, '#ff6b4a', '#ffc61a');
    faceX(5, 15, 5, '#6244e0', '#e6a800');
    faceY(0, 5, 15, '#7b5cff', '#ffc61a');
    poly(fac, [[9.2, 5, 0], [10.8, 5, 0], [10.8, 5, 2], [9.2, 5, 2]], '#00b4d8');

    // Interior, visible only through the lifted roof
    const interior = el('g', { 'clip-path': 'url(#roof-clip)' }, svg);
    poly(interior, planQuad(0, 0, 18, 5, ZF), '#333');
    poly(interior, planQuad(0, 5, 5, 15, ZF), '#333');
    const roomOutline = {};
    [...ROOMS].sort((a, b) => a.x0 + a.y0 - b.x0 - b.y0).forEach((r) => {
      poly(interior, planQuad(r.x0, r.y0, r.x1, r.y1, ZF), r.floor);
      poly(interior, [[r.x0, r.y0, ZF], [r.x1, r.y0, ZF], [r.x1, r.y0, H], [r.x0, r.y0, H]], '#fff8e7');
      poly(interior, [[r.x0, r.y0, ZF], [r.x0, r.y1, ZF], [r.x0, r.y1, H], [r.x0, r.y0, H]], '#efe3c8');
      roomOutline[r.id] = poly(interior, planQuad(r.x0, r.y0, r.x1, r.y1, ZF), 'none', { stroke: '#fff', 'stroke-width': 3, visibility: 'hidden' });
    });
    for (const [x0, x1] of [[5, 9.5], [9.5, 14]]) for (let x = x0 + 0.8; x + 0.7 < x1; x += 1.2) for (let y = 1.4; y < 4.6; y += 1.1) box(interior, x, y, ZF, x + 0.7, y + 0.4, ZF + 0.35, '#8ecae6', '#219ebc', '#4aa8c8');
    for (let x = 14.8; x < 17.5; x += 1.15) for (let y = 1.4; y < 4.6; y += 1.1) {
      box(interior, x, y, ZF, x + 0.8, y + 0.4, ZF + 0.3, '#adb5bd', '#6c757d', '#868e96');
      box(interior, x + 0.2, y, ZF + 0.3, x + 0.6, y + 0.08, ZF + 0.65, '#212529', '#212529', '#00e5ff');
    }
    box(interior, 0.8, 1.2, ZF, 2, 2.2, ZF + 1.2, '#ffd166', '#c99a2e', '#e8b64a');
    box(interior, 2.8, 1.2, ZF, 4.2, 2.2, ZF + 0.8, '#adb5bd', '#6c757d', '#868e96');
    poly(interior, planQuad(0.7, 11, 4.3, 14.3, ZF), '#e76f51', { stroke: '#fff', 'stroke-width': 2 });
    el('path', { d: line([[0.7, 12.65, ZF], [4.3, 12.65, ZF]]), stroke: '#fff', 'stroke-width': 2 }, interior);
    const lamps = {};
    for (const [id, d] of Object.entries(DEVICES)) {
      box(interior, d.x0, d.y0, ZF, d.x1, d.y1, ZF + d.h, ...d.c);
      lamps[id] = el('circle', { cx: sx((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2), cy: sy((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, ZF + d.h), r: 6, fill: '#495057', stroke: '#fff', 'stroke-width': 1.5 }, interior);
    }
    // Internal power lines from the technical room to each room
    const feeds = {};
    const hub = [2.5, 2.5, ZF + 0.02];
    const route = {
      classA: [[7.2, 0.6, ZF + 0.02]], classB: [[11.8, 0.6, ZF + 0.02]], comp: [[16, 0.6, ZF + 0.02]],
      kitchen: [[0.5, 7, ZF + 0.02]], gym: [[0.5, 12.5, ZF + 0.02]],
    };
    for (const [id, pts] of Object.entries(route)) {
      const first = id === 'kitchen' || id === 'gym' ? [hub, [0.5, 2.5, ZF + 0.02]] : [hub, [2.5, 0.6, ZF + 0.02]];
      feeds[id] = el('path', { d: line([...first, ...pts]), class: 'scene-flow', stroke: '#00e5ff', fill: 'none' }, interior);
    }

    // Roof and solar panels (the lens cuts a hole here)
    const roofs = el('g', { mask: 'url(#ct-mask)' }, svg);
    poly(roofs, roofOutline, '#f5f1e6', { stroke: '#ffc61a', 'stroke-width': 4, 'stroke-linejoin': 'round' });
    const panels = [];
    for (let x = 1; x + 1.5 < 18; x += 1.75) for (let y = 0.8; y + 1.1 < 4.6; y += 1.45) panels.push([x, y]);
    for (let y = 5.4; y + 1.5 < 15; y += 1.75) for (let x = 0.8; x + 1.1 < 4.6; x += 1.45) panels.push([x, y, true]);
    const pvGlow = el('g', {}, null);
    panels.forEach(([x, y, v]) => {
      const q = planQuad(x, y, x + (v ? 1.2 : 1.55), y + (v ? 1.55 : 1.2), H);
      poly(roofs, q, '#1d3f94', { stroke: '#9bc1ff', 'stroke-width': 1 });
      poly(pvGlow, q, '#5ab0ff');
    });
    roofs.appendChild(pvGlow);

    // Front objects
    const front = el('g', {}, svg);
    box(front, 8.8, 5, 2, 11.2, 7, 2.3, '#fff', '#cbd5e1', '#e2e8f0');
    box(front, 8.9, 6.8, 0, 9.1, 7, 2, '#94a3b8', '#64748b', '#94a3b8');
    box(front, 10.9, 6.8, 0, 11.1, 7, 2, '#94a3b8', '#64748b', '#94a3b8');
    box(front, 20, 1, 0, 24, 3.6, 2.2, '#c3f0dd', '#0f8a62', '#19b07f');
    const socBars = [];
    for (let i = 0; i < 5; i++) socBars.push(poly(front, [[20.5 + i * 0.62, 3.6, 0.6], [21 + i * 0.62, 3.6, 0.6], [21 + i * 0.62, 3.6, 1.6], [20.5 + i * 0.62, 3.6, 1.6]], '#0b5c42'));
    const px = 27, py = 7;
    const pylon = [[[px - 0.8, py], [px, py, 8]], [[px + 0.8, py], [px, py, 8]], [[px, py - 0.8], [px, py, 8]], [[px, py + 0.8], [px, py, 8]]];
    pylon.forEach(([a, b]) => el('path', { d: line([a, b]), stroke: '#343a40', 'stroke-width': 3 }, front));
    [[5.5, 1.7], [7, 1.1]].forEach(([z, l]) => el('path', { d: line([[px - l, py, z], [px + l, py, z]]), stroke: '#343a40', 'stroke-width': 3 }, front));
    el('path', { d: `M${pt(px + 1.1, py, 7).replace(',', ' ')}L1200 150`, stroke: '#343a40', 'stroke-width': 1.5, fill: 'none' }, front);
    [[6.4, 16, '#38b000', '#008000'], [12, 16.2, '#ffd60a', '#ffb703'], [17.3, 16.2, '#ff8fab', '#fb6f92'], [1.5, 16.6, '#70e000', '#38b000'], [19.5, 7.5, '#38b000', '#008000'], [32, 7, '#ffd60a', '#ffb703'], [33, 15, '#70e000', '#38b000'], [-8, 24, '#ff8fab', '#fb6f92'], [0, 25, '#70e000', '#38b000'], [8, 26, '#ffd60a', '#ffb703']]
      .forEach(([x, y, a, b]) => tree(front, x, y, 1, a, b));
    const kids = el('g', {}, front);
    [[9, 9, '#ef476f'], [10.5, 11, '#118ab2'], [7.8, 13.5, '#7b5cff'], [14, 10, '#ffd166'], [16.2, 12, '#06d6a0'], [11.2, 14.8, '#ff9f1c'], [22, 13, '#ef476f'], [27, 15, '#ffd166']]
      .forEach(([x, y, c]) => kid(kids, x, y, c));
    const bus = el('g', { class: 'scene-bus' }, front);
    box(bus, 6, 18.6, 0.3, 11, 19.8, 2, '#ffc61a', '#e09f00', '#ffd43b');
    for (let x = 6.5; x < 10.6; x += 1) poly(bus, [[x, 19.8, 1.1], [x + 0.7, 19.8, 1.1], [x + 0.7, 19.8, 1.75], [x, 19.8, 1.75]], '#264653');

    const nightLayer = el('rect', { width: W, height: VH, fill: '#14213d', opacity: 0, 'pointer-events': 'none' }, svg);
    const glow = el('g', { 'pointer-events': 'none', opacity: 0 }, svg);
    glowList.forEach((q) => poly(glow, q, '#ffe066'));

    // Energy connections
    const conn = el('g', { 'pointer-events': 'none' }, svg);
    const entrance = [10, 5.9, 0.05];
    const yard = 5.9;
    const paths = {
      pl: { c: '#ffb703', pts: [[10, 3, H + 0.05], [10, 5, H + 0.05], [10, 5, 2.4], entrance] },
      pb: { c: '#ffb703', pts: [[16, 2.3, H + 0.05], [18, 2.3, H + 0.05], [18, 2.3, 0.05], [20, 2.3, 0.05]] },
      pe: { c: '#ffb703', pts: [[16, 3.2, H + 0.05], [18, 3.2, H + 0.05], [18, 3.2, 0.05], [19.3, 3.2, 0.05], [19.3, 4.8, 0.05], [27, 4.8, 0.05], [27, 7, 0.05]] },
      bl: { c: '#17e0a0', pts: [[21.5, 3.6, 0.05], [21.5, yard, 0.05], [11, yard, 0.05]] },
      gl: { c: '#ff6b35', pts: [[27, 7, 0.05], [27, 6.7, 0.05], [12.5, 6.7, 0.05], [10.5, 6.7, 0.05], [10.5, 6, 0.05]] },
    };
    const links = {};
    for (const [id, p] of Object.entries(paths)) {
      const d = line(p.pts);
      const track = el('path', { d, stroke: '#1f2937', 'stroke-opacity': .55, 'stroke-width': 9, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, conn);
      links[id] = { track, flow: el('path', { d, class: 'scene-flow', stroke: p.c, fill: 'none' }, conn) };
    }

    // Hit areas for roof and facades
    const hits = el('g', {}, svg);
    const hit = (pts, id, part) => poly(hits, pts, 'transparent', { 'data-room': id, 'data-part': part, class: 'scene-hit' });
    ROOMS.forEach((r) => hit(planQuad(r.x0, r.y0, r.x1, r.y1, H), r.id, 'roof'));
    const fq = (x0, y0, x1, y1) => [[x0, y0, 0], [x1, y1, 0], [x1, y1, H], [x0, y0, H]];
    hit(fq(5, 5, 9.5, 5), 'classA', 'face'); hit(fq(9.5, 5, 14, 5), 'classB', 'face'); hit(fq(14, 5, 18, 5), 'comp', 'face');
    hit(fq(18, 0, 18, 5), 'comp', 'face'); hit(fq(5, 5, 5, 10), 'kitchen', 'face'); hit(fq(5, 10, 5, 15), 'gym', 'face'); hit(fq(0, 15, 5, 15), 'gym', 'face');

    // Lens ring
    const ring = el('g', { 'pointer-events': 'none', visibility: 'hidden' }, svg);
    el('circle', { r: LENS_R, fill: 'none', stroke: '#00e5ff', 'stroke-width': 5 }, ring);
    el('circle', { r: LENS_R + 7, fill: 'none', stroke: '#fff', 'stroke-width': 1.5, 'stroke-dasharray': '4 9' }, ring);
    el('line', { class: 'scene-scan', x1: -LENS_R + 8, x2: LENS_R - 8, stroke: '#00e5ff', 'stroke-width': 2.5 }, ring);
    const ctT = el('text', { y: -LENS_R - 14, 'text-anchor': 'middle', fill: '#fff', 'font-size': 20, 'font-weight': 800, stroke: '#0b2545', 'stroke-width': 4, 'paint-order': 'stroke' }, ring);
    ctT.textContent = 'CT';

    // Live labels
    const pinsG = el('g', { 'pointer-events': 'none' }, svg);
    function pin(x, y, c, label) {
      const g = el('g', { transform: `translate(${x} ${y})` }, pinsG);
      el('rect', { x: -66, y: -33, width: 132, height: 62, rx: 14, fill: '#fff', stroke: c, 'stroke-width': 4 }, g);
      const a = el('text', { y: -13, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#475569' }, g); a.textContent = label;
      const v = el('text', { y: 18, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 800, fill: '#0f172a' }, g);
      return { v, a };
    }
    const pins = {
      pv: pin(sx(13, 1), sy(13, 1, H) - 62, '#ffb703', 'Sonce'),
      school: pin(sx(10, 7) + 2, sy(10, 7) + 44, '#3987e5', 'Poraba šole'),
      bat: pin(sx(22, 2) + 62, sy(22, 2, 2.2) - 42, '#17e0a0', 'Baterija'),
      grid: pin(1122, sy(27, 7) - 70, '#ff6b35', 'Omrežje'),
    };

    // Sun dial
    const dial = el('g', { transform: 'translate(1040 72)', 'pointer-events': 'none' }, svg);
    el('path', { d: 'M-100 40A100 100 0 0 1 100 40', fill: '#caf0f8', stroke: '#fff', 'stroke-width': 3 }, dial);
    el('line', { x1: -112, x2: 112, y1: 40, y2: 40, stroke: '#fff', 'stroke-width': 3 }, dial);
    const sun = el('circle', { r: 16, fill: '#ffb703', stroke: '#fff', 'stroke-width': 3 }, dial);

    // Interaction
    let active = null, mode = 'tour', whole = false, tourI = 4, idleTimer;
    const lens = { x: -500, y: -500 };
    const setLens = (x, y) => { lens.x = x; lens.y = y; hole.setAttribute('cx', x); hole.setAttribute('cy', y); ring.setAttribute('transform', `translate(${x} ${y})`); };
    function roomAt(cx, cy) {
      const a = (cx - OX) / K, b = (cy - OY + H * U) / (0.5 * U);
      const x = (a + b) / 2, y = (b - a) / 2;
      return ROOMS.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) || null;
    }
    function setActive(r) { active = r; for (const k in roomOutline) roomOutline[k].setAttribute('visibility', r && k === r.id ? 'visible' : 'hidden'); paintChips(); paintCard(); }
    function tour() {
      if (mode !== 'tour' || whole) return;
      const r = ROOMS[tourI = (tourI + 1) % ROOMS.length];
      const c = center(r); setLens(c.x, c.y); ring.setAttribute('visibility', 'visible'); setActive(r);
    }
    function startTourLater() { clearTimeout(idleTimer); idleTimer = setTimeout(() => { mode = 'tour'; tour(); }, 6000); }
    function toPoint(ev) { const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM().inverse()); return p; }
    function onPointer(ev) {
      if (whole) return;
      const t = ev.target;
      if (t.dataset && t.dataset.room) {
        mode = 'user'; clearTimeout(idleTimer);
        const r = ROOMS.find((x) => x.id === t.dataset.room);
        if (t.dataset.part === 'roof') { const p = toPoint(ev); setLens(p.x, p.y); setActive(roomAt(p.x, p.y) || r); }
        else { const c = center(r); setLens(c.x, c.y); setActive(r); }
        ring.setAttribute('visibility', 'visible');
      } else if (mode === 'user') startTourLater();
    }
    svg.addEventListener('pointermove', onPointer);
    svg.addEventListener('pointerdown', onPointer);
    svg.addEventListener('pointerleave', () => { if (mode === 'user') startTourLater(); });

    function setWhole(v) {
      whole = v;
      hole.setAttribute('r', v ? 1400 : LENS_R);
      if (v) { hole.setAttribute('cx', 600); hole.setAttribute('cy', 400); ring.setAttribute('visibility', 'hidden'); }
      else setLens(lens.x, lens.y);
      paintChips();
    }
    const chipBtns = [];
    const addChip = (label, fn, isOn) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', fn); chips.appendChild(b); chipBtns.push([b, isOn]); };
    ROOMS.forEach((r) => addChip(r.name, () => {
      setWhole(false); mode = 'user'; clearTimeout(idleTimer); const c = center(r); setLens(c.x, c.y); ring.setAttribute('visibility', 'visible'); setActive(r); startTourLater();
    }, () => !whole && active === r));
    addChip('Odpri celo šolo', () => { const next = !whole; setWhole(next); if (!next) { mode = 'tour'; tour(); } }, () => whole);
    function paintChips() { chipBtns.forEach(([b, on]) => b.setAttribute('aria-pressed', on())); }

    let cur = { t: 0, f: null, loads: {} };
    function paintCard() {
      const r = active; const { f, t, loads } = cur;
      if (!r || !f) { card.hidden = true; return; }
      card.hidden = false;
      let extra = '';
      if (r.id === 'kitchen') {
        const sc = getSc();
        const on = D.tasks.filter((d, i) => t >= sc.starts[i] && t < sc.starts[i] + d.dur);
        const fixed = t >= 30 && t < 38 ? 'Priprava malice · 8 kW' : t >= 46 && t < 56 ? 'Ohranjanje toplote · 6 kW' : '';
        const items = [...on.map((d) => `${d.device} · ${d.power} kW`), ...(fixed ? [fixed] : [])];
        extra = `<ul>${items.length ? items.map((x) => `<li>${x}</li>`).join('') : '<li>Trenutno ne deluje nobena večja naprava.</li>'}</ul>`;
      }
      card.innerHTML = `<span class="ct-tag">CT pogled</span><h3>${r.name}</h3><p class="ct-kw">${kw(loads[r.id])}<small>${fmt(f.load ? 100 * loads[r.id] / f.load : 0)} % porabe šole</small></p><p>${r.text}</p>${extra}<p class="ct-note">Razdelitev po prostorih je ocena.</p>`;
    }

    function update(t, f) {
      const h = t * 0.25;
      const shares = roomShares(h), loads = { kitchen: getSc().series.kit[t] };
      for (const k in shares) loads[k] = D.base[t] * shares[k];
      cur = { t, f, loads };
      for (const [id, k] of Object.entries(feeds)) { const v = loads[id]; k.style.display = v >= 0.5 ? '' : 'none'; k.setAttribute('stroke-width', Math.min(11, 3 + v * 0.22)); }
      const sc = getSc();
      D.tasks.forEach((d, i) => lamps[d.id].setAttribute('fill', t >= sc.starts[i] && t < sc.starts[i] + d.dur ? '#ff3b30' : '#495057'));
      for (const [id, l] of Object.entries(links)) {
        const v = f[id], on = v >= 0.5;
        l.flow.style.display = on ? '' : 'none';
        l.track.style.display = on ? '' : 'none';
        l.flow.setAttribute('stroke-width', Math.min(13, 4 + v * 0.14));
      }
      pins.pv.v.textContent = kw(f.pv);
      pins.school.v.textContent = kw(f.load);
      pins.bat.v.textContent = `${fmt(f.soc)} %`;
      const exporting = f.pe > 0.5 && f.gl < 0.5;
      pins.grid.a.textContent = exporting ? 'V omrežje' : 'Iz omrežja';
      pins.grid.v.textContent = kw(exporting ? f.pe : f.gl);
      socBars.forEach((b, i) => b.setAttribute('fill', f.soc >= (i + 0.5) * 20 ? '#7dffcf' : '#0b5c42'));
      pvGlow.style.opacity = Math.min(.8, f.pv / 100);
      const night = Math.min(1, Math.max(0, (Math.abs(h - 13) - 6.2) / 1.3));
      nightLayer.setAttribute('opacity', night * 0.55);
      svg.style.background = `color-mix(in srgb, #14213d ${Math.round(night * 55)}%, #7ed957)`;
      glow.setAttribute('opacity', night * (h > 16 || h < 7 ? 0.55 : 0.9));
      kids.style.display = h >= 7.5 && h < 16 ? '' : 'none';
      const a = Math.PI * Math.max(0, Math.min(1, (h - 6.25) / 13.5));
      sun.setAttribute('cx', -100 * Math.cos(a)); sun.setAttribute('cy', 40 - 100 * Math.sin(a));
      sun.setAttribute('fill', h < 6.25 || h > 19.75 ? '#adb5bd' : '#ffb703');
      paintCard();
    }

    setInterval(tour, 5000);
    tour();
    return { update };
  }
  return { create };
})();
