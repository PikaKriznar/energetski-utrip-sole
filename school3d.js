/* Rotatable 3D school diorama. Coordinates below are plan units: x along the main wing, z along the side wing. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const H = 4.6;
const CENTER = new THREE.Vector3(11.5, 0, 8);
const DISC_R = 18;
const HOVER_OPACITY = 0.36; // rest of the building while the user hovers one room
const ROOMS = [
  { id: 'tech', x0: 0, z0: 0, x1: 5, z1: 5, wall: '#f7b801', floor: '#fff0c2', sides: 'NW', panels: false },
  { id: 'classA', x0: 5, z0: 0, x1: 9.5, z1: 5, wall: '#ff6b4a', floor: '#ffe0d6', sides: 'NS', panels: true },
  { id: 'classB', x0: 9.5, z0: 0, x1: 14, z1: 5, wall: '#ff9238', floor: '#ffe8d1', sides: 'NS', panels: true },
  { id: 'comp', x0: 14, z0: 0, x1: 18, z1: 5, wall: '#3a86ff', floor: '#d8e8ff', sides: 'NSE', panels: true },
  { id: 'kitchen', x0: 0, z0: 5, x1: 5, z1: 10, wall: '#06d6a0', floor: '#d4f8ec', sides: 'WE', panels: false },
  { id: 'gym', x0: 0, z0: 10, x1: 5, z1: 15, wall: '#8338ec', floor: '#f4c9a0', sides: 'WES', panels: true },
];
const DEVICES = {
  bake: [0.8, 6, 1.1, 1, 1.5, '#ff9f1c'], cook: [2.5, 6, 1.2, 1, 1.1, '#ef476f'],
  dish: [0.8, 8.2, 1.1, 1, 1.1, '#118ab2'], cool: [3.5, 8, 1.1, 1.3, 1.9, '#90e0ef'], wash: [2.3, 8.2, 0.9, 0.9, 1.1, '#7b5cff'],
};
const LINKS = {
  pl: { color: '#eda100', pts: [[10, H + 0.5, 3], [10, H + 0.5, 5.25], [10, 0.25, 5.25], [10, 0.25, 6.2]] },
  pb: { color: '#eda100', pts: [[16, H + 0.5, 2.2], [18.3, H + 0.5, 2.2], [18.3, 0.25, 2.2], [20, 0.25, 2.2]] },
  pe: { color: '#eda100', pts: [[16, H + 0.5, 3.2], [18.5, H + 0.5, 3.2], [18.5, 0.25, 3.2], [18.5, 0.25, 4.5], [25, 0.25, 4.5], [25, 0.25, 8]] },
  bl: { color: '#1baf7a', pts: [[22, 0.25, 3.6], [22, 0.25, 5.8], [10.6, 0.25, 5.8], [10.6, 0.25, 6.2]] },
  gl: { color: '#eb6834', pts: [[24.6, 0.25, 8], [24.6, 0.25, 6.9], [9.4, 0.25, 6.9], [9.4, 0.25, 6.2]] },
};
const FEEDS = {
  classA: [[2.5, 0.35, 2.5], [2.5, 0.35, 0.8], [7.2, 0.35, 0.8], [7.2, 0.35, 2.5]],
  classB: [[2.5, 0.35, 2.5], [2.5, 0.35, 0.8], [11.7, 0.35, 0.8], [11.7, 0.35, 2.5]],
  comp: [[2.5, 0.35, 2.5], [2.5, 0.35, 0.8], [16, 0.35, 0.8], [16, 0.35, 2.5]],
  kitchen: [[2.5, 0.35, 2.5], [0.7, 0.35, 2.5], [0.7, 0.35, 7.5], [2.5, 0.35, 7.5]],
  gym: [[2.5, 0.35, 2.5], [0.7, 0.35, 2.5], [0.7, 0.35, 12.5], [2.5, 0.35, 12.5]],
};
const FEED_COLOR = '#2a78d6';
const ROOF_Y = H + 1.4;
const TAG_POS = {
  pv: [11.75, H + 3.6, 2.5], school: [13, 2.4, 7.6], bat: [22, 3.5, 2.3], grid: [25, 10, 8],
  tech: [2.5, ROOF_Y, 2.5], classA: [7.25, ROOF_Y, 2.5], classB: [11.75, ROOF_Y, 2.5], comp: [16, ROOF_Y, 2.5], kitchen: [2.5, ROOF_Y, 7.5], gym: [2.5, ROOF_Y, 12.5],
};

export function createSchool3D(host, tagsHost, api) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.prepend(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Vrtljiv 3D model šole s sončno elektrarno, baterijo in električnim omrežjem');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 400);
  camera.position.set(44, 40, 58);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = 1.32;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  const hemi = new THREE.HemisphereLight('#ffffff', '#b7e4a0', 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4d6', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 24), new THREE.MeshBasicMaterial({ color: '#ffc21a' }));
  scene.add(sunBall);

  const root = new THREE.Group();
  root.position.set(-CENTER.x, 0, -CENTER.z);
  scene.add(root);

  // Materials are cached per part so one part can be highlighted on its own.
  const mats = new Map();
  const pickers = [];
  function mat(part, color, opts = {}) {
    const key = `${part}|${color}|${opts.key || ''}`;
    if (!mats.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.02, transparent: !!opts.fade });
      m.userData = { part, base: new THREE.Color(color), skip: !!opts.skip, wall: !!opts.fade };
      mats.set(key, m);
    }
    return mats.get(key);
  }
  function box(parent, part, x, y, z, w, h, d, color, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material || mat(part, color, opts));
    m.position.set(x + w / 2, y + h / 2, z + d / 2);
    m.castShadow = opts.shadow !== false;
    m.receiveShadow = true;
    m.userData.part = part;
    parent.add(m);
    return m;
  }

  // Ground
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(DISC_R, DISC_R, 1.4, 96), new THREE.MeshStandardMaterial({ color: '#79d957', roughness: 1 }));
  disc.position.set(CENTER.x, -0.7, CENTER.z);
  disc.receiveShadow = true;
  root.add(disc);
  disc.material.userData = { part: 'env', base: disc.material.color.clone(), labOnly: true };
  mats.set('disc', disc.material);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(DISC_R + 0.5, DISC_R - 1.5, 2.6, 96), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
  rim.position.set(CENTER.x, -1.75, CENTER.z);
  root.add(rim);
  const road = new THREE.Mesh(new THREE.RingGeometry(DISC_R - 1.9, DISC_R - 0.3, 96), new THREE.MeshStandardMaterial({ color: '#5a6178', roughness: 1 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(CENTER.x, 0.015, CENTER.z);
  road.receiveShadow = true;
  road.material.userData = { part: 'env', base: road.material.color.clone(), labOnly: true };
  mats.set('road', road.material);
  root.add(road);
  const env = new THREE.Group();
  root.add(env);
  const flat = (x, z, w, d, c, y = 0.03) => box(env, 'env', x, y - 0.02, z, w, 0.04, d, c, { shadow: false });
  flat(5, 5, 13.5, 12, '#ffe5b4');
  flat(8.5, 6, 3, 11, '#ffcad4', 0.05);
  flat(12.5, 8, 5.5, 6, '#ff7b00', 0.05);
  flat(13, 8.5, 4.5, 5, '#00b4d8', 0.08);
  flat(15.2, 8.5, 0.1, 5, '#ffffff', 0.11);
  flat(19.3, 10.6, 5.2, 4.2, '#37b24d', 0.05);
  flat(21.85, 10.6, 0.1, 4.2, '#ffffff', 0.08);
  flat(18.5, 0, 5.8, 5.5, '#d7ccc8', 0.05);
  ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#7b5cff', '#ff9f1c'].forEach((c, i) => flat(6.2, 7 + i * 1.05, 1.4, 0.95, c, 0.07));
  const trees = [[-2.5, 3, '#38b000'], [3, -2.8, '#ff8fab'], [9, -2.8, '#70e000'], [15, -2.8, '#ffd60a'], [-2.5, 10, '#ff8fab'], [6.4, 16, '#38b000'], [12, 16, '#ffd60a'], [17.3, 15.8, '#ff8fab'], [1.5, 17, '#70e000'], [19.5, 7.8, '#38b000'], [25.3, 13, '#ffd60a'], [22.5, -1.5, '#70e000']];
  for (const [x, z, c] of trees) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.5, 8), mat('env', '#8a5a33'));
    trunk.position.set(x, 0.75, z); trunk.castShadow = true; env.add(trunk);
    for (const [dx, dy, r] of [[0, 2.2, 1.15], [0.45, 1.75, 0.75], [-0.45, 1.8, 0.8]]) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat('env', c));
      s.position.set(x + dx, dy, z); s.castShadow = true; env.add(s);
    }
  }
  const bus = new THREE.Group();
  box(bus, 'env', -0.6, 0.3, -1.8, 1.2, 1.3, 3.6, '#ffc61a');
  box(bus, 'env', -0.62, 0.95, -1.5, 1.24, 0.4, 3, '#264653');
  root.add(bus);

  // Building
  const roofMats = {};
  const roofPanels = {};
  const glassDay = new THREE.Color('#2f6f94');
  const glass = new THREE.MeshStandardMaterial({ color: glassDay, emissive: '#ffd76a', emissiveIntensity: 0, roughness: 0.25 });
  glass.userData = { part: 'env', base: glassDay, skip: true };
  const panelMat = new THREE.MeshStandardMaterial({ color: '#1d4fb0', emissive: '#3aa0ff', emissiveIntensity: 0.2, roughness: 0.3, metalness: 0.3 });
  panelMat.transparent = true;
  panelMat.userData = { part: 'pv', base: new THREE.Color('#1d4fb0'), skip: true };
  const lamps = {};
  const WALL = { fade: true, key: 'wall' }, roomGlasses = [];
  for (const r of ROOMS) {
    const part = r.id, t = 0.18, g = new THREE.Group();
    root.add(g);
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    box(g, part, r.x0, 0, r.z0, w, 0.12, d, r.floor, { shadow: false });
    box(g, part, r.x0, 0, r.z0, w, H, t, r.wall, WALL);
    box(g, part, r.x0, 0, r.z1 - t, w, H, t, r.wall, WALL);
    box(g, part, r.x0, 0, r.z0, t, H, d, r.wall, WALL);
    box(g, part, r.x1 - t, 0, r.z0, t, H, d, r.wall, WALL);
    box(g, part, r.x0, 0, r.z1 - 0.06, w, 0.55, 0.12, '#ffd43b', { shadow: false, ...WALL });
    const roomGlass = glass.clone();
    roomGlass.transparent = true;
    roomGlass.userData = { part, base: glassDay, skip: true, wall: true };
    mats.set(`glass-${part}`, roomGlass); roomGlasses.push(roomGlass);
    const win = (x, y, z, wx, wz) => box(g, part, x, y, z, wx, 1.3, wz, '', { material: roomGlass, shadow: false });
    if (r.sides.includes('N')) for (let x = r.x0 + 0.5; x + 1 <= r.x1 - 0.2; x += 1.6) for (const y of [0.95, 2.85]) win(x, y, r.z0 - 0.04, 1, 0.08);
    if (r.sides.includes('S')) for (let x = r.x0 + 0.5; x + 1 <= r.x1 - 0.2; x += 1.6) for (const y of [0.95, 2.85]) win(x, y, r.z1 - 0.04, 1, 0.08);
    if (r.sides.includes('W')) for (let z = r.z0 + 0.5; z + 1 <= r.z1 - 0.2; z += 1.6) for (const y of [0.95, 2.85]) win(r.x0 - 0.04, y, z, 0.08, 1);
    if (r.sides.includes('E')) for (let z = r.z0 + 0.5; z + 1 <= r.z1 - 0.2; z += 1.6) for (const y of [0.95, 2.85]) win(r.x1 - 0.04, y, z, 0.08, 1);
    const roofM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, transparent: true });
    roofM.userData = { part, base: new THREE.Color('#ffffff'), roof: true };
    mats.set(`roof-${part}`, roofM);
    roofMats[part] = roofM;
    box(g, part, r.x0 - 0.08, H, r.z0 - 0.08, w + 0.16, 0.2, d + 0.16, '', { material: roofM });
    if (r.panels) {
      const pg = new THREE.Group(); g.add(pg); roofPanels[part] = pg;
      const wide = w >= d;
      for (let a = 0.4; a + 1.3 <= (wide ? w : d); a += 1.5) for (let b = 0.4; b + 1 <= (wide ? d : w) - 0.1; b += 1.15) {
        const x = r.x0 + (wide ? a : b), z = r.z0 + (wide ? b : a);
        const p = box(pg, 'pv', x, H + 0.3, z, wide ? 1.3 : 0.95, 0.06, wide ? 0.95 : 1.3, '', { material: panelMat });
        p.rotation.x = wide ? -0.22 : 0; p.rotation.z = wide ? 0 : -0.22;
      }
    }
  }
  for (const room of ['classA', 'classB']) {
    const r = ROOMS.find((x) => x.id === room);
    for (let x = r.x0 + 0.7; x + 0.8 < r.x1; x += 1.2) for (let z = 1.3; z < 4.4; z += 1.05) box(root, room, x, 0.12, z, 0.75, 0.55, 0.42, '#8ecae6');
  }
  for (let x = 14.7; x < 17.4; x += 1.1) for (let z = 1.3; z < 4.4; z += 1.05) {
    box(root, 'comp', x, 0.12, z, 0.8, 0.55, 0.42, '#adb5bd');
    box(root, 'comp', x + 0.2, 0.67, z, 0.42, 0.34, 0.06, '#00d9f5');
  }
  box(root, 'tech', 0.8, 0.12, 1.2, 1.2, 1.9, 1, '#ffd166');
  box(root, 'tech', 2.9, 0.12, 1.2, 1.4, 1.2, 1, '#adb5bd');
  box(root, 'gym', 0.8, 0.12, 11, 3.4, 0.03, 3.3, '#e76f51', { shadow: false });
  for (const [id, [x, z, w, d, h, c]] of Object.entries(DEVICES)) {
    box(root, 'kitchen', x, 0.12, z, w, h, d, c);
    const lamp = new THREE.MeshStandardMaterial({ color: '#667085', emissive: '#ff2d20', emissiveIntensity: 0 });
    lamp.userData = { part: 'kitchen', base: new THREE.Color('#667085'), skip: true };
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), lamp);
    s.position.set(x + w / 2, 0.32 + h, z + d / 2);
    root.add(s); lamps[id] = lamp;
  }
  box(root, 'env', 8.8, 2.1, 5, 2.4, 0.2, 2, '#ffffff');
  box(root, 'env', 8.9, 0, 6.8, 0.15, 2.1, 0.15, '#94a3b8');
  box(root, 'env', 10.95, 0, 6.8, 0.15, 2.1, 0.15, '#94a3b8');
  box(root, 'classA', 9.25, 0.1, 4.95, 0.24, 2, 0.08, '#00b4d8', { shadow: false, ...WALL });
  box(root, 'classB', 9.5, 0.1, 4.95, 1.3, 2, 0.08, '#00b4d8', { shadow: false, ...WALL });

  // Battery
  box(root, 'bat', 20, 0, 1, 4, 2.3, 2.6, '#19b07f');
  box(root, 'bat', 19.9, 2.3, 0.9, 4.2, 0.14, 2.8, '#c3f0dd');
  const socMats = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshStandardMaterial({ color: '#0d6147', emissive: '#7dffcf', emissiveIntensity: 0 });
    m.userData = { part: 'bat', base: new THREE.Color('#0d6147'), skip: true };
    socMats.push(m);
    box(root, 'bat', 20.5 + i * 0.62, 0.55, 3.58, 0.5, 1.1, 0.05, '', { material: m, shadow: false });
  }

  // Pylon
  const steel = '#3f4a5a';
  const strut = (a, b, part = 'grid', r = 0.07) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), len = from.distanceTo(to);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), part === 'link' ? mat('env', '#c9d4df') : mat(part, steel));
    m.position.copy(from).addScaledVector(to.clone().sub(from), 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    m.castShadow = part !== 'link';
    m.userData.part = part === 'link' ? 'env' : part;
    root.add(m);
  };
  const px = 25, pz = 8, top = [px, 9, pz];
  [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]].forEach(([dx, dz]) => strut([px + dx, 0, pz + dz], top, 'grid', 0.09));
  for (const [y, s] of [[2.6, 0.66], [5, 0.4]]) {
    strut([px - s, y, pz - s], [px + s, y, pz - s]); strut([px - s, y, pz + s], [px + s, y, pz + s]);
    strut([px - s, y, pz - s], [px - s, y, pz + s]); strut([px + s, y, pz - s], [px + s, y, pz + s]);
  }
  strut([px - 2, 7.2, pz], [px + 2, 7.2, pz]); strut([px - 1.4, 8.3, pz], [px + 1.4, 8.3, pz]);

  // Invisible, generous targets so every section is easy to hover and click.
  const pickMat = new THREE.MeshBasicMaterial();
  function picker(part, x0, y0, z0, x1, y1, z1, panelRoom) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), pickMat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.userData = { part, panelRoom };
    m.visible = false; root.add(m); m.updateMatrixWorld(); pickers.push(m);
  }
  for (const r of ROOMS) {
    const out = (side) => (r.sides.includes(side) ? 0.45 : 0);
    picker(r.id, r.x0 - out('W'), 0, r.z0 - out('N'), r.x1 + out('E'), H + 0.25, r.z1 + out('S'));
    if (r.panels) picker('pv', r.x0, H + 0.25, r.z0, r.x1, H + 1.1, r.z1, r.id);
  }
  picker('bat', 19.3, 0, 0.3, 24.7, 3.4, 4.3);
  picker('grid', 24, 0, 7, 26, 10.2, 9);

  // Highlight volumes
  const volumes = {};
  const volume = (id, x0, z0, x1, z1, y0, y1, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.visible = false; root.add(m); volumes[id] = m;
  };
  for (const p of api.parts) {
    const r = ROOMS.find((x) => x.id === p.id);
    if (r) volume(p.id, r.x0 - 0.2, r.z0 - 0.2, r.x1 + 0.2, r.z1 + 0.2, 0, H + 0.45, p.color);
  }
  volume('bat', 19.6, 0.6, 24.4, 3.9, 0, 2.8, api.parts.find((p) => p.id === 'bat').color);
  volume('grid', 23.4, 6.4, 26.6, 9.6, 0, 9.5, api.parts.find((p) => p.id === 'grid').color);
  volume('pv', 5, -0.1, 18.1, 5.1, H + 0.15, H + 0.7, api.parts.find((p) => p.id === 'pv').color);

  // Red frame around the biggest consumer in the current 15-minute step.
  const topFrameMat = new THREE.MeshBasicMaterial({ color: '#ff1f1f', transparent: true, depthTest: false });
  const topFillMat = new THREE.MeshBasicMaterial({ color: '#ff1f1f', transparent: true, opacity: 0.12, depthWrite: false });
  function makeFrame(parent, x0, z0, x1, z1, y0, y1) {
    const g = new THREE.Group(), r = 0.11, w = x1 - x0, d = z1 - z0, h = y1 - y0;
    const bar = (x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), topFrameMat); m.position.set(x, y, z); m.renderOrder = 8; g.add(m); };
    for (const y of [y0, y1]) { bar(x0 + w / 2, y, z0, w + r, r, r); bar(x0 + w / 2, y, z1, w + r, r, r); bar(x0, y, z0 + d / 2, r, r, d + r); bar(x1, y, z0 + d / 2, r, r, d + r); }
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) bar(x, y0 + h / 2, z, r, h, r);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), topFillMat);
    fill.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2); g.add(fill);
    g.visible = false; parent.add(g);
    return g;
  }
  const roomFrames = {};
  for (const r of ROOMS) roomFrames[r.id] = makeFrame(root, r.x0 - 0.12, r.z0 - 0.12, r.x1 + 0.12, r.z1 + 0.12, 0.05, H + 0.4);

  // Constantly moving connections. Idle lines move slowly in a pale colour.
  const flows = [];
  const PALE = new THREE.Color('#b6c4d2');
  function flowLine(id, pts, color, feed) {
    const curve = new THREE.CurvePath();
    const vec = pts.map((p) => new THREE.Vector3(...p));
    for (let i = 0; i + 1 < vec.length; i++) {
      curve.add(new THREE.LineCurve3(vec[i], vec[i + 1]));
      strut(pts[i], pts[i + 1], 'link', feed ? 0.03 : 0.055);
    }
    const n = Math.max(6, Math.round(curve.getLength() * 1.15));
    flows.push({ id, curve, n, color: new THREE.Color(color), phase: Math.random(), value: 0, feed });
    return n;
  }
  let total = 0;
  for (const [id, l] of Object.entries(LINKS)) total += flowLine(id, l.pts, l.color, false);
  for (const [id, pts] of Object.entries(FEEDS)) total += flowLine(id, pts, FEED_COLOR, true);
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' }), total);
  dots.frustumCulled = false;
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(dots);

  // Tags
  const tags = {};
  for (const id of Object.keys(TAG_POS)) {
    const p = api.parts.find((x) => x.id === id);
    const el = document.createElement('div');
    el.className = 'tag'; el.style.setProperty('--c', p.color);
    el.innerHTML = '<span></span><strong></strong>';
    if (ROOMS.some((r) => r.id === id)) el.dataset.room = id;
    el.dataset.part = id;
    const pickTag = () => { if (labOn) return; holdUser(); applySelection(id); };
    el.addEventListener('pointerenter', pickTag);
    el.addEventListener('click', pickTag);
    tagsHost.appendChild(el);
    tags[id] = { el, pos: new THREE.Vector3(...TAG_POS[id]).add(root.position), label: el.children[0], value: el.children[1] };
  }

  // Selection
  let lastInteract = performance.now(), inviteDelay = 8000;
  const invite = document.createElement('div');
  invite.className = 'invite'; invite.hidden = true;
  invite.innerHTML = '<i>👆</i><span></span>';
  tagsHost.appendChild(invite);
  let labOn = false, selected = null, mode = 'tour', tourIndex = -1, idleTimer, lastHover = null;
  const tourOrder = api.parts.map((p) => p.id);
  function applySelection(id) {
    if (selected === id) return;
    selected = id;
    for (const k in volumes) { volumes[k].visible = k === id; }
    for (const r of ROOMS) if (roofPanels[r.id]) roofPanels[r.id].visible = r.id !== id;
    for (const k in tags) tags[k].el.classList.toggle('on', k === id);
    api.onSelect(id);
  }
  function tour() {
    if (mode !== 'tour' || !active) return;
    tourIndex = (tourIndex + 1) % tourOrder.length;
    applySelection(tourOrder[tourIndex]);
  }
  function holdUser() {
    lastInteract = performance.now(); inviteDelay = 25000;
    mode = 'user'; controls.autoRotate = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (labOn) return; mode = 'tour'; controls.autoRotate = true; }, 10000);
  }
  const temp = new THREE.Vector3();
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let dragging = false, pendingEvent = null;
  controls.addEventListener('start', () => { dragging = true; holdUser(); });
  controls.addEventListener('end', () => { dragging = false; holdUser(); });
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    root.updateMatrixWorld();
    for (const hit of ray.intersectObjects(pickers, false)) {
      if (hit.object.userData.panelRoom === selected) continue;
      return hit.object.userData.part;
    }
    return null;
  }
  canvas.addEventListener('pointermove', (ev) => { pendingEvent = ev; });
  canvas.addEventListener('pointerleave', () => { pendingEvent = null; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('click', (ev) => { if (labOn) return; const p = pick(ev); if (p) { holdUser(); applySelection(p); } });

  // ---- "Dodaj in preizkusi": placed models and drop slots
  const labGroup = new THREE.Group(); labGroup.visible = false; root.add(labGroup);
  const ringGroup = new THREE.Group(); root.add(ringGroup);
  const labAnim = [], slotRings = [], placedTags = [];
  let hotSlot = null;
  const labPanel = mat('lab', '#1565ff');
  const LB = (g, x, y, z, w, h, d, c) => box(g, 'lab', x, y, z, w, h, d, c);
  const disk = (g, r, y, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 28), mat('lab', c)); m.position.y = y; g.add(m); return m; };
  const BUILD = {
    pv_roof(g) { for (let a = -1.9; a < 1.9; a += 1.5) for (let b = -2; b < 1.8; b += 1.15) { const p = box(g, 'lab', a, 0.3, b, 1.3, 0.06, 0.95, '', { material: labPanel }); p.rotation.x = -0.22; } },
    carport(g) { [[-2, -1.2], [2, -1.2], [-2, 1.2], [2, 1.2]].forEach(([x, z]) => LB(g, x - 0.08, 0, z - 0.08, 0.16, 2.2, 0.16, '#868e96')); const r = box(g, 'lab', -2.4, 2.2, -1.6, 4.8, 0.08, 3.2, '', { material: labPanel }); r.rotation.x = -0.14; LB(g, -1.3, 0.25, -0.7, 2.6, 0.6, 1.3, '#ef476f'); },
    wind(g) { LB(g, -0.12, 0, -0.12, 0.24, 7, 0.24, '#e9ecef'); const hub = new THREE.Group(); hub.position.set(0, 7, 0.25); g.add(hub); for (let i = 0; i < 3; i++) { const b = LB(hub, -0.11, 0, -0.04, 0.22, 2.3, 0.08, '#90e0ef'); const p = new THREE.Group(); p.rotation.z = (i * 2 * Math.PI) / 3; p.add(b); hub.add(p); } labAnim.push((e) => { hub.rotation.z = e * 2.2; }); },
    battery(g) { LB(g, -1.5, 0, -1, 3, 2, 2, '#19b07f'); LB(g, -1.6, 2, -1.1, 3.2, 0.12, 2.2, '#c3f0dd'); for (let i = 0; i < 4; i++) LB(g, -1.2 + i * 0.65, 0.5, 0.98, 0.45, 1, 0.05, '#7dffcf'); },
    ebus(g) { LB(g, -2.6, 0.32, -0.65, 5.2, 1.5, 1.3, '#06d6a0'); LB(g, -2.5, 1.05, -0.67, 5, 0.5, 1.34, '#264653'); LB(g, -2.6, 1.82, -0.65, 5.2, 0.14, 1.3, '#d4f8ec'); LB(g, 2.9, 0, -0.2, 0.4, 1.7, 0.4, '#3a86ff'); },
    ev(g) { LB(g, -0.2, 0, -1.3, 0.4, 1.6, 0.3, '#3a86ff'); LB(g, -0.65, 0.25, -0.8, 1.3, 0.55, 2.3, '#ef476f'); LB(g, -0.55, 0.8, -0.3, 1.1, 0.42, 1.1, '#264653'); },
    heatpump(g) { LB(g, -0.9, 0, -0.5, 1.8, 1.4, 1, '#e9ecef'); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20), mat('lab', '#495057')); f.rotation.x = Math.PI / 2; f.position.set(-0.2, 0.7, 0.52); g.add(f); },
    laptops(g) { disk(g, 0.62, 0, '#7bdff2'); LB(g, -0.45, 0.06, -0.32, 0.9, 0.07, 0.62, '#adb5bd'); const s = LB(g, -0.45, 0.1, -0.34, 0.9, 0.6, 0.04, '#00d9f5'); s.rotation.x = -0.25; },
    boards(g) { disk(g, 0.95, 0, '#ffd166'); LB(g, -0.85, 0.1, -0.08, 1.7, 1, 0.14, '#343a40'); LB(g, -0.76, 0.18, 0.05, 1.52, 0.84, 0.04, '#90e0ef'); },
    led(g) { disk(g, 0.72, 0, '#fff3b0'); const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshBasicMaterial({ color: '#ffe066' })); b.position.y = 0.55; g.add(b); },
  };
  function setPlaced(items) {
    labGroup.clear(); labAnim.length = 0;
    placedTags.forEach((t) => t.el.remove()); placedTags.length = 0;
    items.forEach((it, index) => {
      const slot = window.LAB.SLOTS[it.type][it.slot], g = new THREE.Group();
      g.position.set(slot.x, slot.y, slot.z); labGroup.add(g);
      BUILD[it.type](g);
      if (slot.y > 1) { const y = slot.y; const phase = index * 1.3; if (slot.y > H) labAnim.push((e) => { g.position.y = y + Math.sin(e * 1.6 + phase) * 0.09; }); }
      const el = document.createElement('button');
      el.className = 'tag tag-lab'; el.title = 'Odstrani';
      const usesPower = it.type === 'ebus' || it.type === 'ev';
      el.innerHTML = `<span>${window.LAB.typeById(it.type).name}</span>${usesPower ? '<em class="kw"></em>' : ''}<strong>×</strong>`;
      const frame = usesPower ? (it.type === 'ebus' ? makeFrame(g, -3, -1.05, 3.5, 1.05, 0.05, 2.5) : makeFrame(g, -1, -1.6, 1, 1.8, 0.05, 2)) : null;
      el.addEventListener('click', () => api.onRemove(it));
      tagsHost.appendChild(el);
      placedTags.push({ el, item: it, frame, valueEl: el.querySelector('.kw'), pos: new THREE.Vector3(slot.x, slot.y + (slot.y > H ? 1.6 : it.type === 'wind' ? 9.6 : 3), slot.z).add(root.position) });
    });
  }
  function beginDrag(type, used) {
    endDrag();
    window.LAB.SLOTS[type].forEach((s, key) => {
      if (used.includes(key)) return;
      const big = type === 'pv_roof' || type === 'carport' || type === 'ebus';
      const m = new THREE.Mesh(new THREE.RingGeometry(big ? 1.6 : 0.8, big ? 2.1 : 1.2, 40), new THREE.MeshBasicMaterial({ color: '#00c2ff', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(s.x, s.y + 0.15, s.z);
      m.renderOrder = 10;
      ringGroup.add(m); slotRings.push({ key, mesh: m, s });
    });
  }
  function dragOver(cx, cy) {
    const r = canvas.getBoundingClientRect();
    let best = null, bd = 130;
    for (const ring of slotRings) {
      temp.set(ring.s.x, ring.s.y, ring.s.z).add(root.position).project(camera);
      const d = Math.hypot(r.left + ((temp.x + 1) / 2) * r.width - cx, r.top + ((1 - temp.y) / 2) * r.height - cy);
      if (d < bd) { bd = d; best = ring.key; }
    }
    hotSlot = best;
    return best;
  }
  function endDrag() { ringGroup.clear(); slotRings.length = 0; hotSlot = null; }
  function setLab(on) {
    if (on === labOn) return;
    labOn = on; labGroup.visible = on;
    clearTimeout(idleTimer);
    if (on) { mode = 'lab'; controls.autoRotate = false; applySelection('school'); } else { mode = 'tour'; controls.autoRotate = true; endDrag(); }
  }

  // Layout: keep the model inside the free area between the panels.
  let freeEl = null;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    let cx = w / 2, cy = h / 2, fw = w, fh = h;
    const f = freeEl && freeEl.getBoundingClientRect();
    if (f && f.width > 0 && innerWidth > 960) {
      const hr = host.getBoundingClientRect();
      cx = f.left - hr.left + f.width / 2; cy = f.top - hr.top + f.height / 2; fw = f.width; fh = f.height;
      camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const fit = innerWidth > 960 ? Math.min(fw * 1.14, fh * 1.85) : Math.min(fw * 1.05, fh * 1.7);
    const dist = ((DISC_R + 1.5) / Math.tan(THREE.MathUtils.degToRad(13))) * (h / fit);
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.minDistance = dist * 0.55; controls.maxDistance = dist * 1.25;
  }

  // Render loop
  const clock = new THREE.Clock();
  const dummy = new THREE.Object3D(), colorTmp = new THREE.Color(), dim = new THREE.Color('#e7edf2');
  let active = true, busAngle = 0, elapsed = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame() {
    requestAnimationFrame(frame);
    if (!active) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;
    if (pendingEvent && !dragging && !labOn) {
      const p = pick(pendingEvent); pendingEvent = null;
      canvas.style.cursor = p ? 'pointer' : 'grab';
      if (p) { holdUser(); if (p !== lastHover) { lastHover = p; applySelection(p); } } else lastHover = null;
    }
    controls.update();
    let index = 0;
    for (const f of flows) {
      const on = f.value >= 0.5;
      f.phase = (f.phase + (reduce ? 0.02 : on ? 0.11 + Math.min(0.14, f.value * 0.003) : 0.04) * dt * (f.feed ? 1.4 : 1)) % 1;
      const size = (f.feed ? 0.07 : 0.11) + (on ? Math.min(0.2, f.value * 0.0035) + 0.05 : 0);
      colorTmp.copy(on ? f.color : PALE);
      for (let i = 0; i < f.n; i++) {
        f.curve.getPointAt((i / f.n + f.phase) % 1, temp);
        dummy.position.copy(temp); dummy.scale.setScalar(size); dummy.updateMatrix();
        dots.setMatrixAt(index, dummy.matrix); dots.setColorAt(index, colorTmp); index++;
      }
    }
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    busAngle += dt * 0.09;
    const br = DISC_R - 1.1;
    bus.position.set(CENTER.x + Math.cos(busAngle) * br, 0, CENTER.z + Math.sin(busAngle) * br);
    bus.rotation.y = -busAngle;
    const hoverRoom = !labOn && mode === 'user' && ROOMS.some((r) => r.id === selected);
    panelMat.opacity += ((hoverRoom ? HOVER_OPACITY : 1) - panelMat.opacity) * 0.14;
    panelMat.depthWrite = panelMat.opacity > 0.9;
    for (const m of mats.values()) {
      const u = m.userData;
      const mine = u.part === selected;
      if (u.wall) { m.opacity += ((mine ? 0.14 : hoverRoom ? HOVER_OPACITY : 1) - m.opacity) * 0.14; m.depthWrite = m.opacity > 0.9; }
      if (u.roof) { m.opacity += ((mine ? 0.1 : hoverRoom ? HOVER_OPACITY : 1) - m.opacity) * 0.14; m.depthWrite = m.opacity > 0.9; continue; }
      if (u.skip) continue;
      const fade = labOn ? (u.part === 'lab' ? 0 : 0.66) : (u.labOnly ? 0 : selected && selected !== 'school' && !mine ? 0.5 : 0);
      m.color.lerp(colorTmp.copy(u.base).lerp(dim, fade), 0.14);
    }
    for (const g of [panelMat, ...roomGlasses]) g.color.lerp(colorTmp.copy(g.userData.base).lerp(dim, labOn ? 0.62 : 0), 0.14);
    const pulse = 0.2 + 0.1 * Math.sin(elapsed * 3.2);
    if (selected && volumes[selected]) volumes[selected].material.opacity = ROOMS.some((r) => r.id === selected) ? pulse * 0.2 : pulse;
    topFrameMat.opacity = 0.75 + 0.25 * Math.sin(elapsed * 5);
    topFillMat.opacity = 0.1 + 0.07 * Math.sin(elapsed * 5);
    for (const a of labAnim) a(elapsed);
    for (const r of slotRings) r.mesh.scale.setScalar(r.key === hotSlot ? 1.35 + 0.1 * Math.sin(elapsed * 8) : 1);
    renderer.render(scene, camera);
    const w = host.clientWidth, h = host.clientHeight;
    for (const t of Object.values(tags)) {
      temp.copy(t.pos).project(camera);
      t.el.style.transform = `translate(-50%, -100%) translate(${((temp.x + 1) / 2) * w}px, ${((1 - temp.y) / 2) * h}px)`;
      t.el.style.zIndex = Math.round((1 - temp.z) * 100000) + (t.el.classList.contains('top') ? 200000 : 0);
    }
    const inviteName = !labOn && mode === 'tour' && performance.now() - lastInteract > inviteDelay && TAG_POS[selected] ? api.invites[selected] : null;
    invite.hidden = !inviteName;
    if (inviteName) {
      invite.children[1].textContent = `Dotakni se ${inviteName}`;
      temp.set(...TAG_POS[selected]).add(root.position).project(camera);
      invite.style.transform = `translate(-50%, 8px) translate(${((temp.x + 1) / 2) * w}px, ${((1 - temp.y) / 2) * h}px)`;
    }
    for (const t of placedTags) {
      temp.copy(t.pos).project(camera);
      t.el.style.transform = `translate(-50%, -100%) translate(${((temp.x + 1) / 2) * w}px, ${((1 - temp.y) / 2) * h}px)`;
    }
  }

  function update({ f, t, loads, onDevices, tagValues, top, extras }) {
    for (const id in roomFrames) { const on = top.room === id; roomFrames[id].visible = on; tags[id].el.classList.toggle('top', on); }
    for (const p of placedTags) {
      const on = top.item === p.item, ex = extras.find((e) => e.item === p.item);
      if (p.frame) p.frame.visible = on;
      p.el.classList.toggle('top', on);
      if (p.valueEl && ex) p.valueEl.textContent = ex.value;
    }
    const h = t * 0.25;
    for (const fl of flows) fl.value = fl.feed ? loads[fl.id] : f[fl.id];
    for (const id in lamps) lamps[id].emissiveIntensity = onDevices.includes(id) ? 2.4 : 0;
    socMats.forEach((m, i) => { m.emissiveIntensity = f.soc >= (i + 0.5) * 20 ? 1.2 : 0; });
    panelMat.emissiveIntensity = 0.1 + Math.min(1, f.pv / 80) * 0.75;
    const day = Math.max(0, Math.sin(Math.PI * (h - 6.25) / 13.5) * (h > 6.25 && h < 19.75 ? 1 : 0));
    const night = 1 - Math.min(1, day * 3.5);
    for (const g of roomGlasses) g.emissiveIntensity = night * 0.9;
    hemi.intensity = 0.75 + 0.85 * (1 - night);
    sun.intensity = 0.35 + 2.3 * Math.min(1, day * 1.8);
    const a = Math.PI * Math.max(0, Math.min(1, (h - 6.25) / 13.5));
    sun.position.set(-Math.cos(a) * 42, Math.sin(a) * 40 + 6, 26);
    sunBall.position.set(-Math.cos(a) * 26, Math.sin(a) * 11 + 4, -24);
    sunBall.visible = day > 0;
    document.documentElement.style.setProperty('--night', night.toFixed(3));
    for (const id in tags) { tags[id].label.textContent = tagValues[id].label; tags[id].value.textContent = tagValues[id].value; }
  }

  freeEl = api.freeArea;
  new ResizeObserver(resize).observe(host);
  addEventListener('resize', resize);
  resize();
  setInterval(tour, 6000);
  tour();
  frame();
  return {
    update, resize,
    select(id) { holdUser(); applySelection(id); },
    flash(ids) { ids.forEach((id) => { const el = tags[id].el; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 3000); }); },
    slotPoint(type, key) {
      const r = canvas.getBoundingClientRect(), s = window.LAB.SLOTS[type][key];
      temp.set(s.x, s.y, s.z).add(root.position).project(camera);
      return { x: r.left + ((temp.x + 1) / 2) * r.width, y: r.top + ((1 - temp.y) / 2) * r.height };
    },
    hold: holdUser, setPlaced, beginDrag, dragOver, endDrag, setLab,
    setFreeArea(el) { freeEl = el; },
    setActive(v) { active = v; if (v) { clock.getDelta(); resize(); } },
  };
}
