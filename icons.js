/* Small isometric machine icons, drawn to match the 3D school. */
window.machineIcon = (() => {
  'use strict';
  const DY = 13;
  const p = (x, y, z) => [(x - y) * 0.866, (x + y) * 0.5 - z + DY];
  const pts = (list) => list.map(([x, y, z]) => p(x, y, z).map((n) => n.toFixed(1)).join(',')).join(' ');
  const shade = (hex, f) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
  const poly = (list, fill) => `<polygon points="${pts(list)}" fill="${fill}"/>`;
  const box = (x, y, z, w, d, h, c) => poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], shade(c, 0.68))
    + poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], shade(c, 0.86))
    + poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c);
  // Details on the front-left face (plane y = Y) and front-right face (plane x = X).
  const left = (Y, x0, z0, x1, z1, c) => poly([[x0, Y, z0], [x1, Y, z0], [x1, Y, z1], [x0, Y, z1]], c);
  const right = (X, y0, z0, y1, z1, c) => poly([[X, y0, z0], [X, y1, z0], [X, y1, z1], [X, y0, z1]], c);
  const discLeft = (Y, cx, cz, r, c) => poly(Array.from({ length: 20 }, (_, i) => [cx + r * Math.cos(i * Math.PI / 10), Y, cz + r * Math.sin(i * Math.PI / 10)]), c);
  const discTop = (cx, cy, z, r, c) => poly(Array.from({ length: 20 }, (_, i) => [cx + r * Math.cos(i * Math.PI / 10), cy + r * Math.sin(i * Math.PI / 10), z]), c);
  const line = (a, b, c, w = 2.4) => { const A = p(...a), B = p(...b); return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; };

  const DRAW = {
    oven: () => box(-12, -12, 0, 24, 24, 34, '#ff9f1c') + left(12, -9, 5, 9, 25, '#3b2a1a') + left(12, -6, 8, 6, 22, '#ffb703')
      + left(12, -9, 28, -6, 31, '#fff') + left(12, -2, 28, 1, 31, '#fff') + left(12, 5, 28, 8, 31, '#fff'),
    kettle: () => box(-13, -13, 0, 26, 26, 5, '#7b8794') + discTop(0, 0, 5, 13, '#b5294e') + box(-11, -11, 5, 22, 22, 20, '#ef476f')
      + discTop(0, 0, 25, 13, '#ff6b8a') + discTop(0, 0, 26, 7, '#b5294e') + line([0, 0, 31], [0, 0, 39], '#fff') + line([6, -3, 31], [6, -3, 37], '#fff'),
    dishwasher: () => box(-12, -12, 0, 24, 24, 26, '#118ab2') + left(12, -10, 3, 10, 20, '#0b6583') + left(12, -8, 21.5, 8, 23.5, '#e8f4f8') + line([-7, 12, 7], [7, 12, 7], '#9ee3f7') + line([-7, 12, 12], [7, 12, 12], '#9ee3f7'),
    fridge: () => box(-11, -11, 0, 22, 22, 42, '#90e0ef') + left(11, -9, 2, 9, 27, '#c9f2fa') + left(11, -9, 29, 9, 40, '#c9f2fa') + line([6, 11, 12], [6, 11, 22], '#48a9c5') + line([6, 11, 31], [6, 11, 37], '#48a9c5'),
    washer: () => box(-12, -12, 0, 24, 24, 28, '#7b5cff') + discLeft(12, 0, 12, 8.5, '#d9d2ff') + discLeft(12, 0, 12, 6, '#2f3e73') + left(12, -9, 24, -2, 26, '#fff') + left(12, 5, 24, 8, 26, '#ffd166'),
    warmer: () => box(-15, -11, 0, 30, 22, 14, '#adb5bd') + box(-13, -8, 14, 7.5, 16, 3, '#ff7b00') + box(-3.7, -8, 14, 7.5, 16, 3, '#ff7b00') + box(5.6, -8, 14, 7.5, 16, 3, '#ff7b00'),
    projector: () => poly([[0, 13, 13], [-13, 30, -8], [13, 30, -8]], '#fff2a8') + box(-11, -11, 10, 22, 22, 10, '#e9ecef') + discLeft(11, 0, 15, 4.2, '#264653') + box(-2, -2, 20, 4, 4, 13, '#868e96'),
    lamp: () => poly([[-14, -4, 18], [14, -4, 18], [20, 10, -6], [-20, 10, -6]], '#fff2a8') + box(-15, -6, 18, 30, 12, 4, '#ffd166') + line([0, 0, 22], [0, 0, 36], '#868e96'),
    vent: () => box(-13, -12, 0, 26, 24, 30, '#06d6a0') + discLeft(12, 0, 15, 11, '#0b8f6d') + line([-8, 12, 15], [8, 12, 15], '#d4f8ec', 3.2) + line([0, 12, 7], [0, 12, 23], '#d4f8ec', 3.2) + discLeft(12, 0, 15, 2.5, '#fff'),
    pc: () => box(-13, -11, 0, 26, 18, 2, '#adb5bd') + box(-2.5, -6, 2, 5, 5, 8, '#6c757d') + box(-15, -3, 10, 30, 3, 22, '#343a40') + left(0, -13, 12, 13, 30, '#00d9f5') + box(-12, 10, 0, 24, 8, 2, '#dee2e6'),
    server: () => box(-11, -11, 0, 22, 22, 42, '#343a40') + [5, 14, 23, 32].map((z) => left(11, -8, z, 8, z + 5, '#495057') + left(11, 4, z + 1.5, 6.5, z + 3.5, '#06d6a0')).join(''),
    speaker: () => box(-11, -9, 0, 22, 18, 38, '#8338ec') + discLeft(9, 0, 12, 7.5, '#2d1457') + discLeft(9, 0, 12, 3, '#c9a7ff') + discLeft(9, 0, 29, 4.5, '#2d1457'),
    inverter: () => box(-12, -6, 2, 24, 12, 36, '#ffd166') + left(6, -9, 6, 9, 34, '#c99a2e') + poly([[2, 6, 31], [-5, 6, 19], [0, 6, 19], [-2, 6, 9], [5, 6, 22], [0, 6, 22]], '#fff'),
    panel: () => { const q = [[-15, -12, 22], [15, -12, 22], [15, 12, 6], [-15, 12, 6]]; let g = box(-2, -2, 0, 4, 4, 13, '#868e96') + poly(q, '#1d4fb0');
      for (let i = 1; i < 4; i++) g += line([-15 + i * 7.5, -12, 22], [-15 + i * 7.5, 12, 6], '#9bc1ff', 1.1);
      for (let i = 1; i < 3; i++) g += line([-15, -12 + i * 8, 22 - i * 5.33], [15, -12 + i * 8, 22 - i * 5.33], '#9bc1ff', 1.1); return g; },
    battery: () => box(-13, -11, 0, 26, 22, 30, '#19b07f') + box(-6, -3, 30, 5, 6, 3, '#c3f0dd') + box(3, -3, 30, 5, 6, 3, '#c3f0dd') + [-10, -3, 4].map((x) => left(11, x, 7, x + 5.5, 23, '#7dffcf')).join(''),
    pylon: () => [[-10, -10], [10, -10], [10, 10], [-10, 10]].map(([x, y]) => line([x, y, 0], [0, 0, 42], '#3f4a5a', 2.6)).join('') + line([-15, 0, 32], [15, 0, 32], '#eb6834', 3) + line([-10, 0, 39], [10, 0, 39], '#eb6834', 3) + line([-6, 6, 14], [6, -6, 14], '#3f4a5a', 2) + line([-6, -6, 14], [6, 6, 14], '#3f4a5a', 2),
    ball: () => `<circle cx="0" cy="-6" r="19" fill="#ff7b00"/><path d="M-19-6H19M0-25V13M-13-20Q-4-6-13 8M13-20Q4-6 13 8" fill="none" stroke="#7a3b00" stroke-width="2"/>`,
    school: () => box(-16, -10, 0, 32, 20, 22, '#ff6b4a') + box(-17, -11, 22, 34, 22, 2.5, '#ffffff') + [-12, -3, 6].map((x) => left(10, x, 6, x + 6, 16, '#2f6f94')).join('') + box(-11, -8, 24.5, 22, 15, 1.5, '#1d4fb0'),
  };
  return (kind) => `<svg viewBox="-30 -36 60 66" aria-hidden="true">${(DRAW[kind] || DRAW.school)()}</svg>`;
})();
