/* Raceway (round 7): a real race on its own page. Three laps of a figure 8 on the Detroit riverfront against five rivals.
   The track, the physics and the rival AI live in race-core-r7.js (pure logic, tested on its own). This file draws it,
   reads the controls, runs the race and keeps the records. Free play, City Chase and Field notes are not touched. */
import * as THREE from '../vendor/three.module.min.js';
import { merge, bx, cy } from './core.js';
import * as RC from './race-core-r7.js?v=1';
import { createEUC } from './euc-next.js?v=1';
import { createBike } from './bike-r6.js?v=1';

const $ = s => document.querySelector(s);
const root = document.documentElement;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const wrapA = RC.wrapA;
const isPhone = () => Math.min(innerWidth, innerHeight) < 500 || innerWidth < 768;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const fmt = (t, dec = 1) => { if (!isFinite(t)) return '-'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(dec); };

const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
if (isPhone() || !hasGL) {
  $('#dv-phone').hidden = false; root.classList.add('dv-fallback');
  document.querySelectorAll('.rw-top, #world, #rw-lines, #dv-veil').forEach(e => e.style.display = 'none');
  if (!hasGL) { const h = $('#dv-phone h1'); if (h) h.textContent = 'The Raceway needs 3D graphics.'; }
} else {
  start();
}

function start() {
  /* ---------- renderer, scene, lights ---------- */
  const canvas = $('#world');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { $('#dv-phone').hidden = false; return; }
  const lite = (navigator.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog(0xffffff, 140, 640);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 10; sc.far = 260;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  const SUN_OFF = new THREE.Vector3(-60, 110, 70);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.15, 1400);

  /* ---------- theme ---------- */
  const PAL = {
    day: { sky: '#E3EAF1', fog: '#E6EBF0', grass: '#B6C6AD', grass2: '#ADBEA4', road: '#ffffff', roadTint: '#8A95A1', edge: '#F3F4F1', kerbR: '#D24C40', kerbW: '#F4F3EF',
      tyreR: '#C9473A', tyreW: '#EEEEEA', concrete: '#C6CDD5', concreteDk: '#A2ADB9', water: '#9DB4CA', bank: '#B9C2CB', bld: '#C9D2DC', bldDk: '#A7B3C0', glass: '#9CB0C5',
      tree: '#8EA68C', trunk: '#7D6D5B', stand: '#BAC4CF', seat: '#55657B', roof: '#E1E6EB', hemiSky: '#FFFFFF', hemiGround: '#A3AEB8', hemi: 1.25, sun: '#FFF4E2', sunI: 1.6, fogNear: 150, fogFar: 660 },
    dusk: { sky: '#121820', fog: '#161D26', grass: '#27322C', grass2: '#232D28', road: '#ffffff', roadTint: '#3A434E', edge: '#A3ABB4', kerbR: '#97403A', kerbW: '#AEB3BA',
      tyreR: '#86372F', tyreW: '#A6ABB1', concrete: '#414B57', concreteDk: '#323A45', water: '#1A2532', bank: '#2C343D', bld: '#2B343F', bldDk: '#222A33', glass: '#4A5D76',
      tree: '#2F3C35', trunk: '#3A332C', stand: '#3A4350', seat: '#2C3542', roof: '#46505C', hemiSky: '#9FB0CC', hemiGround: '#1A1F26', hemi: 1.05, sun: '#C9D6FF', sunI: 0.9, fogNear: 120, fogFar: 520 }
  };
  let themeName = root.getAttribute('data-theme') === 'dusk' ? 'dusk' : 'day';
  const painters = [];      // re-color vertex-colored meshes on a theme change
  const tinted = [];        // [material, key]
  const tint = (m, key) => { tinted.push([m, key]); return m; };

  /* geometry builder with a palette key per vertex, so the theme can repaint it */
  class KB {
    constructor() { this.p = []; this.k = []; }
    tri(a, b, c, key) { this.p.push(...a, ...b, ...c); this.k.push(key, key, key); }
    quad(a, b, c, d, key) { this.tri(a, b, c, key); this.tri(a, c, d, key); }
    geo(g, key) { const ng = g.index ? g.toNonIndexed() : g; const a = ng.attributes.position.array; for (let i = 0; i < a.length; i++) this.p.push(a[i]); for (let i = 0; i < a.length / 3; i++) this.k.push(key); }
    mesh(shadow = true) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.computeVertexNormals();
      const col = new Float32Array(this.p.length); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const keys = this.k.slice();
      const paint = () => { const P = PAL[themeName], cache = {}; for (let i = 0; i < keys.length; i++) { const key = keys[i]; const c = cache[key] || (cache[key] = new THREE.Color(P[key])); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } g.attributes.color.needsUpdate = true; };
      paint(); painters.push(paint);
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      m.receiveShadow = true; m.castShadow = shadow;
      return m;
    }
  }

  /* ---------- the track ---------- */
  const T = RC.buildTrack();
  const HW = RC.HALF_W, n = T.n;
  const P = (i, d, y) => { const yaw = T.YAW[i]; return [T.X[i] - Math.sin(yaw) * d, y, T.Z[i] - Math.cos(yaw) * d]; };
  const sdist = (a, b) => Math.abs(RC.sdiff(a, b, T.L));
  const ST = 2;   // build every 1 m

  // asphalt: a soft noise texture, tinted by the theme
  const asphalt = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#e9e9e9'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2600; i++) { const v = 200 + Math.random() * 55 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1.4, 1.4); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  {
    const pos = [], uv = [], idx = [];
    for (let i = 0, k = 0; i <= n; i += ST, k++) {
      const q = i % n;
      const a = P(q, -HW, T.H[q] + 0.02), b = P(q, HW, T.H[q] + 0.02);
      pos.push(...a, ...b); uv.push(i * T.ds / 9, 0, i * T.ds / 9, 1.4);
      if (k > 0) { const o = (k - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, tint(new THREE.MeshLambertMaterial({ map: asphalt, side: THREE.DoubleSide }), 'roadTint'));
    m.receiveShadow = true; scene.add(m);
  }
  // edge lines, kerbs, shoulders, bridge walls and the barriers
  {
    const kb = new KB(), wall = new KB();
    for (let i = 0; i < n; i += ST) {
      const j = (i + ST) % n, hi = T.H[i], hj = T.H[j];
      const kerb = T.KERB[i] || T.KERB[j];
      for (const sd of [-1, 1]) {
        if (kerb) {
          const key = Math.floor(i * T.ds / 1.6) % 2 ? 'kerbR' : 'kerbW';
          kb.quad(P(i, sd * (HW - RC.KERB_W), hi + 0.04), P(j, sd * (HW - RC.KERB_W), hj + 0.04), P(j, sd * (HW + 0.25), hj + 0.04), P(i, sd * (HW + 0.25), hi + 0.04), key);
        } else {
          kb.quad(P(i, sd * (HW - 0.5), hi + 0.035), P(j, sd * (HW - 0.5), hj + 0.035), P(j, sd * (HW - 0.22), hj + 0.035), P(i, sd * (HW - 0.22), hi + 0.035), 'edge');
        }
        const Bi = T.B[i], Bj = T.B[j];
        // the shoulder on the raised part, then the bridge's side walls
        if (hi > 0.05 || hj > 0.05) {
          wall.quad(P(i, sd * HW, hi + 0.015), P(j, sd * HW, hj + 0.015), P(j, sd * Bj, hj + 0.015), P(i, sd * Bi, hi + 0.015), hi > 1 ? 'concrete' : 'grass');
          const bi = hi > 3.2 ? hi - 1.0 : -0.05, bj = hj > 3.2 ? hj - 1.0 : -0.05;
          wall.quad(P(i, sd * (Bi + 0.36), hi + 1.0), P(j, sd * (Bj + 0.36), hj + 1.0), P(j, sd * (Bj + 0.36), bj), P(i, sd * (Bi + 0.36), bi), 'concreteDk');
        }
        // the barrier: red and white tyre walls on the ground, a concrete parapet on the bridge
        const ground = hi < 0.3;
        const th = ground ? 0.7 : 0.36, ht = ground ? 0.85 : 1.0;
        const key = ground ? (Math.floor(i * T.ds / 2.4) % 2 ? 'tyreR' : 'tyreW') : 'concrete';
        const y0i = hi - 0.05, y0j = hj - 0.05;
        wall.quad(P(i, sd * Bi, y0i), P(j, sd * Bj, y0j), P(j, sd * Bj, hj + ht), P(i, sd * Bi, hi + ht), key);
        wall.quad(P(i, sd * Bi, hi + ht), P(j, sd * Bj, hj + ht), P(j, sd * (Bj + th), hj + ht), P(i, sd * (Bi + th), hi + ht), key);
        wall.quad(P(i, sd * (Bi + th), y0i), P(j, sd * (Bj + th), y0j), P(j, sd * (Bj + th), hj + ht), P(i, sd * (Bi + th), hi + ht), key);
      }
      if (hi > 3.2 && hj > 3.2) wall.quad(P(i, -T.B[i] - 0.36, hi - 1.0), P(j, -T.B[j] - 0.36, hj - 1.0), P(j, T.B[j] + 0.36, hj - 1.0), P(i, T.B[i] + 0.36, hi - 1.0), 'concreteDk');
    }
    // pillars under the bridge, kept clear of the road that runs underneath
    const lowerIdx = []; for (let i = 0; i < n; i++) if (sdist(i * T.ds, T.underS) < 70) lowerIdx.push(i);
    for (let i = 0; i < n; i += 16) {
      const h = T.H[i]; if (h < 3.4) continue;
      for (const sd of [-1, 1]) {
        const p = P(i, sd * (HW - 0.6), 0);
        let md = 1e9; for (const q of lowerIdx) md = Math.min(md, Math.hypot(T.X[q] - p[0], T.Z[q] - p[2]));
        if (md < 13.5) continue;
        const g = new THREE.CylinderGeometry(0.55, 0.65, h - 1.0, 10); g.translate(p[0], (h - 1.0) / 2, p[2]); wall.geo(g, 'concreteDk');
      }
    }
    const km = kb.mesh(false); km.castShadow = false; scene.add(km);
    scene.add(wall.mesh(true));
  }
  // start line (checkered), grid boxes
  {
    const c = document.createElement('canvas'); c.width = 128; c.height = 16; const x = c.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#1E2124' : '#F4F4F1'; x.fillRect(i * 8, j * 8, 8, 8); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
    const g = new THREE.PlaneGeometry(2 * HW, 1.4).rotateX(-Math.PI / 2).rotateY(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t })); const p = RC.sample(T, 0);
    m.position.set(p.x, p.h + 0.04, p.z); m.rotation.y = p.yaw; m.receiveShadow = true; scene.add(m);
    const kb = new KB();
    for (const sl of RC.gridSlots(T)) {
      const s = sl.s + 1.4, i = Math.floor(((s % T.L) + T.L) % T.L / T.ds) % n, j = (i + 1) % n;
      kb.quad(P(i, sl.d - 1.0, T.H[i] + 0.035), P(j, sl.d - 1.0, T.H[j] + 0.035), P(j, sl.d + 1.0, T.H[j] + 0.035), P(i, sl.d + 1.0, T.H[i] + 0.035), 'edge');
      for (const e of [-1, 1]) { const i2 = (i - 4 + n) % n; kb.quad(P(i2, sl.d + e * 1.0, T.H[i] + 0.035), P(j, sl.d + e * 1.0, T.H[j] + 0.035), P(j, sl.d + e * 0.82, T.H[j] + 0.035), P(i2, sl.d + e * 0.82, T.H[i] + 0.035), 'edge'); }
    }
    const gm = kb.mesh(false); scene.add(gm);
  }
  // boost pad: amber chevrons that run forward
  const padTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#E8A33D'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = '#FFF3D6'; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(14, 8); x.lineTo(44, 32); x.lineTo(14, 56); x.stroke();
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  for (const pd of T.pads) {
    const pos = [], uv = [], idx = [];
    const steps = Math.round(pd.len / T.ds);
    for (let k = 0; k <= steps; k++) {
      const p = RC.sample(T, pd.s + k * T.ds), yaw = p.yaw, nx = -Math.sin(yaw), nz = -Math.cos(yaw);
      for (const e of [-1, 1]) pos.push(p.x + nx * (pd.d + e * pd.w / 2), p.h + 0.05, p.z + nz * (pd.d + e * pd.w / 2));
      uv.push(k * T.ds / 2.25, 0, k * T.ds / 2.25, 2);
      if (k > 0) { const o = (k - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: padTex, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
    scene.add(m);
  }

  /* ---------- the riverfront ---------- */
  const RIVER_Z = 84, FAR_Z = 236;
  {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 900).rotateX(-Math.PI / 2), tint(new THREE.MeshLambertMaterial(), 'grass'));
    ground.position.set(40, -0.06, RIVER_Z - 450); ground.receiveShadow = true; scene.add(ground);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(1600, 700).rotateX(-Math.PI / 2), tint(new THREE.MeshLambertMaterial(), 'grass2'));
    far.position.set(40, -0.06, FAR_Z + 350); scene.add(far);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, FAR_Z - RIVER_Z + 4).rotateX(-Math.PI / 2), tint(new THREE.MeshLambertMaterial(), 'water'));
    water.position.set(40, -0.7, (RIVER_Z + FAR_Z) / 2); scene.add(water);
    const kb = new KB();
    // river walls and a promenade rail
    kb.geo(new THREE.BoxGeometry(1600, 0.8, 1.2).translate(40, -0.35, RIVER_Z), 'bank');
    kb.geo(new THREE.BoxGeometry(1600, 0.8, 1.2).translate(40, -0.35, FAR_Z), 'bank');
    kb.geo(new THREE.BoxGeometry(1600, 0.08, 0.08).translate(40, 1.0, RIVER_Z - 0.4), 'concreteDk');
    for (let x = -700; x <= 780; x += 6) kb.geo(new THREE.BoxGeometry(0.08, 1.0, 0.08).translate(x, 0.5, RIVER_Z - 0.4), 'concreteDk');
    const rnd = RC.mulberry(11);
    // the downtown skyline to the north, with a tall cluster of round glass towers
    const tower = (x, z, r, h) => kb.geo(new THREE.CylinderGeometry(r, r, h, 16).translate(x, h / 2, z), 'glass');
    tower(70, -214, 12, 142); [[-24, -16], [24, -16], [-24, 16], [24, 16]].forEach(([dx, dz]) => tower(70 + dx, -214 + dz, 8.5, 106));
    kb.geo(new THREE.BoxGeometry(98, 16, 70).translate(70, 8, -214), 'bldDk');
    for (let k = 0; k < 70; k++) {
      const x = -360 + rnd() * 820, z = -170 - rnd() * 170;
      if (Math.abs(x - 70) < 60 && Math.abs(z + 214) < 50) continue;
      const w = 16 + rnd() * 26, d = 16 + rnd() * 26, h = 18 + rnd() * rnd() * 110;
      kb.geo(new THREE.BoxGeometry(w, h, d).translate(x, h / 2, z), rnd() < 0.5 ? 'bld' : 'bldDk');
      if (h > 60 && rnd() < 0.6) kb.geo(new THREE.BoxGeometry(w * 0.6, h * 0.25, d * 0.6).translate(x, h + h * 0.125, z), 'bld');
    }
    // the far bank: low buildings across the river
    for (let k = 0; k < 46; k++) {
      const x = -520 + rnd() * 1120, z = FAR_Z + 30 + rnd() * 120, w = 14 + rnd() * 24, d = 12 + rnd() * 20, h = 6 + rnd() * 22;
      kb.geo(new THREE.BoxGeometry(w, h, d).translate(x, h / 2, z), rnd() < 0.5 ? 'bld' : 'bldDk');
    }
    const sky = kb.mesh(false); scene.add(sky);
  }
  // grandstand on the river side of the start straight, the start gantry, flags
  const lamps = [];
  let crowdMesh = null;
  {
    const kb = new KB(), crowd = [];
    const rnd = RC.mulberry(5);
    for (let s = -36; s < 40; s += 4) {
      const i = Math.floor(((s % T.L) + T.L) % T.L / T.ds) % n, j = Math.floor((((s + 4) % T.L) + T.L) % T.L / T.ds) % n;
      const B = T.B[i] + 2.2;
      for (let r = 0; r < 5; r++) {
        const d0 = -(B + r * 1.6), d1 = d0 - 1.6, y = 0.6 + r * 0.75;
        kb.quad(P(i, d0, y), P(j, d0, y), P(j, d1, y), P(i, d1, y), 'stand');
        kb.quad(P(i, d0, y - 0.75), P(j, d0, y - 0.75), P(j, d0, y), P(i, d0, y), 'seat');
        for (let c = 0; c < 4; c++) if (rnd() < 0.72) { const f = (c + 0.5) / 4, a = P(i, d0 - 0.8, y), b = P(j, d0 - 0.8, y); crowd.push([a[0] + (b[0] - a[0]) * f, y, a[2] + (b[2] - a[2]) * f]); }
      }
      const dB = -(B + 5 * 1.6);
      kb.quad(P(i, dB, -0.05), P(j, dB, -0.05), P(j, dB, 4.4), P(i, dB, 4.4), 'stand');
      kb.quad(P(i, -B + 0.4, 6.6), P(j, -B + 0.4, 6.6), P(j, dB - 0.5, 7.2), P(i, dB - 0.5, 7.2), 'roof');
      if (Math.round(s) % 12 === 0) kb.geo(new THREE.CylinderGeometry(0.12, 0.12, 7, 6).translate(...P(i, -B + 0.6, 3.5)), 'concreteDk');
    }
    scene.add(kb.mesh(true));
    const cg = new THREE.BoxGeometry(0.42, 0.62, 0.42); cg.translate(0, 0.31, 0);
    crowdMesh = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial(), crowd.length);
    const cols = ['#E8A33D', '#4C7BB8', '#C9473A', '#F2F4F6', '#2F7D5B', '#8C6BB8', '#5E6A78', '#D9DEE4'], m4 = new THREE.Matrix4(), col = new THREE.Color();
    crowd.forEach((p, k) => { m4.makeTranslation(p[0], p[1], p[2]); crowdMesh.setMatrixAt(k, m4); crowdMesh.setColorAt(k, col.set(cols[k % cols.length])); });
    scene.add(crowdMesh);
    // the gantry over the start line, with four start lights
    const g = new KB(), p0 = RC.sample(T, 0);
    for (const sd of [-1, 1]) g.geo(new THREE.BoxGeometry(0.45, 7.2, 0.45).translate(...P(Math.floor(0 / T.ds), sd * (HW + 1.3), 3.6)), 'concreteDk');
    const beam = new THREE.BoxGeometry(0.9, 1.4, 2 * HW + 3.1); beam.rotateY(p0.yaw); beam.translate(p0.x, 7.2, p0.z); g.geo(beam, 'concrete');
    scene.add(g.mesh(true));
    const lampG = new THREE.CircleGeometry(0.42, 18);
    for (let k = 0; k < 4; k++) {
      const m = new THREE.MeshBasicMaterial({ color: '#2A3038' });
      const me = new THREE.Mesh(lampG, m);
      const off = (k - 1.5) * 1.15, fx = Math.cos(p0.yaw), fz = -Math.sin(p0.yaw), nx = -Math.sin(p0.yaw), nz = -Math.cos(p0.yaw);
      me.position.set(p0.x - fx * 0.47 + nx * off, 7.2, p0.z - fz * 0.47 + nz * off);
      me.rotation.y = p0.yaw - Math.PI / 2;
      scene.add(me); lamps.push(m);
    }
    // a banner on the gantry
    const bc = document.createElement('canvas'); bc.width = 512; bc.height = 64; const bx2 = bc.getContext('2d');
    bx2.fillStyle = '#1E2124'; bx2.fillRect(0, 0, 512, 64); bx2.fillStyle = '#E8A33D'; bx2.fillRect(0, 56, 512, 8);
    bx2.fillStyle = '#F4F4F1'; bx2.font = '800 34px Inter, system-ui, sans-serif'; bx2.textAlign = 'center'; bx2.textBaseline = 'middle'; bx2.fillText('RACEWAY · DETROIT RIVERFRONT', 256, 30);
    const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW + 2.6, 0.5), new THREE.MeshBasicMaterial({ map: bt }));
    ban.position.set(p0.x - Math.cos(p0.yaw) * 0.47, 7.7, p0.z + Math.sin(p0.yaw) * 0.47); ban.rotation.y = p0.yaw - Math.PI / 2; scene.add(ban);
    // flags by the line
    const fk = new KB();
    [[-16, '#E8A33D'], [-8, '#4C7BB8'], [8, '#F2F4F6'], [16, '#E8A33D']].forEach(([s, c], k) => {
      const i = Math.floor(((s % T.L) + T.L) % T.L / T.ds) % n, base = P(i, T.B[i] + 1.4, 0);
      fk.geo(new THREE.CylinderGeometry(0.06, 0.06, 6, 6).translate(base[0], 3, base[2]), 'concreteDk');
    });
    scene.add(fk.mesh(true));
    [[-16, '#E8A33D'], [-8, '#4C7BB8'], [8, '#F2F4F6'], [16, '#E8A33D']].forEach(([s, c]) => {
      const i = Math.floor(((s % T.L) + T.L) % T.L / T.ds) % n, base = P(i, T.B[i] + 1.4, 0);
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -1.1, 0, 1.8, -0.55, 0], 3)); fg.computeVertexNormals();
      const f = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); f.position.set(base[0], 5.9, base[2]); f.rotation.y = T.YAW[i] + Math.PI; f.userData.flag = true; scene.add(f);
    });
  }
  // trees, kept off the track and out of the river
  {
    const coarse = []; for (let i = 0; i < n; i += 8) coarse.push(i);
    const rnd = RC.mulberry(3), spots = [];
    for (let k = 0; k < 2400 && spots.length < 190; k++) {
      const x = -300 + rnd() * 640, z = -150 + rnd() * (RIVER_Z - 8 + 150);
      let ok = true;
      for (const i of coarse) { const dx = T.X[i] - x, dz = T.Z[i] - z; if (dx * dx + dz * dz < (T.B[i] + 6) * (T.B[i] + 6)) { ok = false; break; } }
      if (ok && z > 40 && x > 40 && x < 160) ok = false;   // keep the grandstand view clear
      if (ok) spots.push([x, z, 0.75 + rnd() * 0.7]);
    }
    const cone = new THREE.ConeGeometry(2.2, 6.4, 7); cone.translate(0, 6.0, 0);
    const trunk = new THREE.CylinderGeometry(0.28, 0.36, 3.0, 6); trunk.translate(0, 1.5, 0);
    const tm = new THREE.InstancedMesh(cone, tint(new THREE.MeshLambertMaterial(), 'tree'), spots.length);
    const km = new THREE.InstancedMesh(trunk, tint(new THREE.MeshLambertMaterial(), 'trunk'), spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    spots.forEach(([x, z, s], k) => { m4.compose(pv.set(x, 0, z), q, sv.set(s, s, s)); tm.setMatrixAt(k, m4); km.setMatrixAt(k, m4); });
    tm.castShadow = true; km.castShadow = true; tm.receiveShadow = true;
    scene.add(tm); scene.add(km);
  }

  function applyTheme() {
    const Pp = PAL[themeName];
    scene.background.set(Pp.sky); scene.fog.color.set(Pp.fog); scene.fog.near = Pp.fogNear; scene.fog.far = Pp.fogFar;
    hemi.color.set(Pp.hemiSky); hemi.groundColor.set(Pp.hemiGround); hemi.intensity = Pp.hemi;
    sun.color.set(Pp.sun); sun.intensity = Pp.sunI;
    painters.forEach(f => f()); tinted.forEach(([m, k]) => m.color.set(Pp[k]));
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', themeName === 'dusk' ? '#0E1114' : '#E9EDF2');
    drawMapBase();
  }
  $('#b-light').addEventListener('click', () => {
    themeName = themeName === 'day' ? 'dusk' : 'day'; root.setAttribute('data-theme', themeName);
    const p = store.get('mf-site-prefs-v7', {}) || {}; p.dark = themeName === 'dusk'; store.set('mf-site-prefs-v7', p);
    applyTheme();
  });

  /* ---------- the rides ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  function seg(a, b, r0, r1 = r0, k = 7) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, L, k); g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
    return g;
  }
  function wheelGeo(r, w, hub) {
    const g1 = new THREE.CylinderGeometry(r, r, w, 16).rotateX(Math.PI / 2);
    const g2 = new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12).rotateX(Math.PI / 2);
    const g3 = new THREE.BoxGeometry(r * 1.05, r * 0.16, w + 0.04);
    return merge([[g1, lin('#22262C')], [g2, lin(hub)], [g3, lin('#22262C')]]);
  }
  const vcMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.08 });
  /* the go-kart: low open kart, the driver's hands on the wheel, arms in close (never out to the side) */
  function buildKart(sch) {
    const body = lin(sch.body), dark = lin('#2A3038'), acc = lin(sch.accent), kit = lin(sch.kit), helm = lin(sch.helmet), pants = lin('#3A4350'), metal = lin('#8C97A3'), glove = lin('#22262C');
    const parts = [];
    parts.push([bx(1.72, 0.07, 0.96, -0.02, 0.1, 0), dark]);
    [-1, 1].forEach(s => parts.push([bx(0.96, 0.21, 0.2, -0.08, 0.12, s * 0.56), body]));
    parts.push([bx(0.52, 0.19, 0.86, 0.74, 0.1, 0), body]);
    parts.push([bx(0.07, 0.3, 0.46, 1.0, 0.12, 0), acc]);
    parts.push([bx(0.08, 0.08, 1.18, 1.06, 0.15, 0), dark]);
    parts.push([bx(0.12, 0.14, 1.32, -0.98, 0.13, 0), dark]);
    parts.push([bx(0.34, 0.3, 0.3, -0.64, 0.17, -0.3), metal]);
    parts.push([bx(0.4, 0.1, 0.5, -0.34, 0.17, 0), dark]);
    parts.push([bx(0.1, 0.5, 0.5, -0.58, 0.2, 0), dark]);
    // the driver
    [-1, 1].forEach(s => {
      const hip = V(-0.28, 0.33, s * 0.11), knee = V(0.12, 0.45, s * 0.13), foot = V(0.55, 0.29, s * 0.12);
      parts.push([seg(hip, knee, 0.08, 0.075), pants]); parts.push([seg(knee, foot, 0.07, 0.06), pants]);
      parts.push([bx(0.14, 0.1, 0.1, 0.56, 0.24, s * 0.12), glove]);
    });
    parts.push([seg(V(-0.38, 0.3, 0), V(-0.3, 0.84, 0), 0.17, 0.19, 9), kit]);
    parts.push([bx(0.24, 0.13, 0.42, -0.3, 0.72, 0), kit]);
    parts.push([new THREE.SphereGeometry(0.17, 14, 10).translate(-0.26, 1.02, 0), helm]);
    parts.push([bx(0.07, 0.09, 0.25, -0.13, 0.94, 0), dark]);
    [-1, 1].forEach(s => {
      const sh = V(-0.29, 0.8, s * 0.18), el = V(-0.03, 0.6, s * 0.18), hand = V(0.22, 0.64, s * 0.14);
      parts.push([seg(sh, el, 0.058, 0.052), kit]); parts.push([seg(el, hand, 0.05, 0.045), kit]);
      parts.push([new THREE.SphereGeometry(0.055, 8, 6).translate(hand.x, hand.y, hand.z), glove]);
    });
    parts.push([seg(V(0.62, 0.22, 0), V(0.3, 0.6, 0), 0.025), dark]);
    const g = new THREE.Group(), bodyG = new THREE.Group(); bodyG.rotation.order = 'YZX'; g.add(bodyG);
    const mat = vcMat();
    const mesh = new THREE.Mesh(merge(parts), mat); mesh.castShadow = true; mesh.receiveShadow = true; bodyG.add(mesh);
    const sw = new THREE.Group(); sw.position.set(0.27, 0.64, 0); sw.rotation.z = -0.5; bodyG.add(sw);
    const swm = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 6, 16).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#22262C', roughness: 0.6 })); sw.add(swm);
    const wR = wheelGeo(0.25, 0.24, sch.hub), wF = wheelGeo(0.22, 0.2, sch.hub), wm = vcMat();
    const wheels = [], fronts = [];
    [[-0.62, 0.25, 0.64, wR, false], [-0.62, 0.25, -0.64, wR, false], [0.64, 0.22, 0.6, wF, true], [0.64, 0.22, -0.6, wF, true]].forEach(([x, y, z, geo, front]) => {
      const holder = new THREE.Group(); holder.position.set(x, y, z); bodyG.add(holder);
      const w = new THREE.Mesh(geo, wm); w.castShadow = true; holder.add(w); wheels.push({ w, r: y }); if (front) fronts.push(holder);
    });
    return { group: g, body: bodyG, mats: [mat, wm, swm.material], wheels, fronts, steerWheel: swm, kind: 'kart', tagY: 1.75 };
  }
  /* the car: a low two-door racer */
  function buildCar(sch) {
    const body = lin(sch.body), dark = lin('#262B32'), acc = lin(sch.accent), glass = lin('#3B4654'), light = lin('#F4F1E6'), red = lin('#B8322B');
    const parts = [];
    parts.push([bx(4.1, 0.5, 1.86, 0, 0.24, 0), body]);
    parts.push([bx(1.4, 0.16, 1.8, 1.2, 0.74, 0), body]);
    parts.push([bx(2.0, 0.52, 1.62, -0.35, 0.74, 0), glass]);
    parts.push([bx(1.75, 0.07, 1.56, -0.42, 1.26, 0), body]);
    parts.push([bx(1.3, 0.02, 0.42, 1.25, 0.905, 0), acc]);
    parts.push([bx(1.7, 0.02, 0.42, -0.42, 1.33, 0), acc]);
    parts.push([bx(0.06, 0.12, 0.36, 2.06, 0.56, 0.62), light]); parts.push([bx(0.06, 0.12, 0.36, 2.06, 0.56, -0.62), light]);
    parts.push([bx(0.06, 0.12, 0.4, -2.06, 0.58, 0.6), red]); parts.push([bx(0.06, 0.12, 0.4, -2.06, 0.58, -0.6), red]);
    parts.push([bx(0.36, 0.06, 1.8, -1.92, 1.02, 0), dark]);
    [-1, 1].forEach(s => parts.push([bx(0.1, 0.3, 0.06, -1.92, 0.72, s * 0.7), dark]));
    parts.push([bx(4.14, 0.14, 1.9, 0, 0.12, 0), dark]);
    const g = new THREE.Group(), bodyG = new THREE.Group(); bodyG.rotation.order = 'YZX'; g.add(bodyG);
    const mat = vcMat();
    const mesh = new THREE.Mesh(merge(parts), mat); mesh.castShadow = true; mesh.receiveShadow = true; bodyG.add(mesh);
    const wg = wheelGeo(0.36, 0.3, sch.hub), wm = vcMat(), wheels = [], fronts = [];
    [[-1.36, 0.88, false], [-1.36, -0.88, false], [1.32, 0.88, true], [1.32, -0.88, true]].forEach(([x, z, front]) => {
      const holder = new THREE.Group(); holder.position.set(x, 0.36, z); bodyG.add(holder);
      const w = new THREE.Mesh(wg, wm); w.castShadow = true; holder.add(w); wheels.push({ w, r: 0.36 }); if (front) fronts.push(holder);
    });
    return { group: g, body: bodyG, mats: [mat, wm], wheels, fronts, kind: 'car', tagY: 2.1 };
  }
  const PLAYER_SCH = { body: '#5E6E82', accent: '#E8A33D', kit: '#6B7A8E', helmet: '#E8A33D', hub: '#E8A33D' };
  const lighten = (hex, f) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), f).getHexString();
  function makeModel(cls, sch, isPlayer) {
    let m;
    if (cls === 'kart') m = buildKart(sch);
    else if (cls === 'car') m = buildCar(sch);
    else {
      const rider = cls === 'euc' ? createEUC({ scene }) : createBike({ scene });
      scene.remove(rider.group); rider.group.visible = true;
      if (!isPlayer) rider.group.traverse(o => { if (o.isMesh && o.material && o.material.vertexColors) { o.material = o.material.clone(); o.material.color.set(lighten(sch.body, 0.35)); } });
      m = { group: rider.group, rider, kind: cls, tagY: 2.35 };
    }
    m.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(m.group);
    return m;
  }
  function disposeModel(m) {
    scene.remove(m.group);
    m.group.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose && o.geometry.dispose(); } });
  }
  function ghostify(m) {
    const gm = new THREE.MeshBasicMaterial({ color: '#BFD3EA', transparent: true, opacity: 0.32, depthWrite: false });
    m.group.traverse(o => { if (o.isMesh) { o.material = gm; o.castShadow = false; o.receiveShadow = false; } });
  }
  function tagSprite(name, color) {
    const c = document.createElement('canvas'); c.width = 320; c.height = 72; const x = c.getContext('2d');
    x.font = '700 30px Inter, system-ui, sans-serif'; const w = Math.min(300, x.measureText(name).width + 66);
    x.fillStyle = 'rgba(22,26,32,.78)'; x.beginPath(); x.roundRect((320 - w) / 2, 10, w, 52, 26); x.fill();
    x.fillStyle = color; x.beginPath(); x.arc((320 - w) / 2 + 26, 36, 10, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#F4F4F1'; x.textBaseline = 'middle'; x.fillText(name, (320 - w) / 2 + 46, 37);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(3.6, 0.81, 1);
    s.visible = false; scene.add(s); return s;
  }

  /* ---------- particles: drift sparks, boost flames, grass ---------- */
  const PN = 360;
  const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pv = new Float32Array(PN * 3), pLife = new Float32Array(PN);
  for (let i = 0; i < PN; i++) pPos[i * 3 + 1] = -500;
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.34, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true }));
  points.frustumCulled = false; scene.add(points);
  let pNext = 0;
  const C_SPARK = { white: lin('#DDE3EA'), blue: lin('#4DA3FF'), orange: lin('#FF8A3D'), boost: lin('#FFC061'), grass: lin('#8FA07F') };
  function emit(x, y, z, vx, vy, vz, col, life) {
    const i = pNext; pNext = (pNext + 1) % PN;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; pv[i * 3] = vx; pv[i * 3 + 1] = vy; pv[i * 3 + 2] = vz;
    pCol[i * 3] = col[0]; pCol[i * 3 + 1] = col[1]; pCol[i * 3 + 2] = col[2]; pLife[i] = life;
  }
  function stepParticles(dt) {
    for (let i = 0; i < PN; i++) {
      if (pLife[i] <= 0) continue;
      pLife[i] -= dt;
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -500; continue; }
      pv[i * 3 + 1] -= 6 * dt;
      pPos[i * 3] += pv[i * 3] * dt; pPos[i * 3 + 1] += pv[i * 3 + 1] * dt; pPos[i * 3 + 2] += pv[i * 3 + 2] * dt;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  }

  /* ---------- sound: WebAudio only, no files ---------- */
  const audio = (() => {
    let ctx = null, master, eng1, eng2, engF, engG, windG, windF, skidG, rumbleG;
    let on = store.get('mf-race-sound-v1', true) !== false;
    root.setAttribute('data-snd', on ? 'on' : 'off');
    function init() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      master = ctx.createGain(); master.gain.value = on ? 0.55 : 0; master.connect(ctx.destination);
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; };
      engF = ctx.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 900; engG = ctx.createGain(); engG.gain.value = 0;
      eng1 = ctx.createOscillator(); eng1.type = 'sawtooth'; eng2 = ctx.createOscillator(); eng2.type = 'square';
      const g2 = ctx.createGain(); g2.gain.value = 0.35; eng1.connect(engF); eng2.connect(g2); g2.connect(engF); engF.connect(engG); engG.connect(master); eng1.start(); eng2.start();
      windF = ctx.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 600; windF.Q.value = 0.6; windG = ctx.createGain(); windG.gain.value = 0;
      noise().connect(windF); windF.connect(windG); windG.connect(master);
      const sf = ctx.createBiquadFilter(); sf.type = 'highpass'; sf.frequency.value = 2200; skidG = ctx.createGain(); skidG.gain.value = 0;
      noise().connect(sf); sf.connect(skidG); skidG.connect(master);
      const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 140; rumbleG = ctx.createGain(); rumbleG.gain.value = 0;
      noise().connect(rf); rf.connect(rumbleG); rumbleG.connect(master);
    }
    function set(R, gas, live) {
      if (!ctx) return;
      const t = ctx.currentTime, C = R.C, f = clamp(Math.abs(R.u) / C.vmax, 0, 1.3);
      let base, range, vol;
      if (R.cls === 'kart') { base = 70; range = 190; vol = 0.11; }
      else if (R.cls === 'car') { base = 52; range = 150; vol = 0.12; }
      else if (R.cls === 'euc') { base = 180; range = 620; vol = 0.035; }
      else { base = 0; range = 0; vol = 0; }
      const gear = R.cls === 'car' ? (f * 3.2) % 1 * 0.35 + f * 0.65 : f;
      eng1.frequency.setTargetAtTime(base + range * gear, t, 0.05); eng2.frequency.setTargetAtTime((base + range * gear) * 0.5, t, 0.05);
      eng1.type = R.cls === 'euc' ? 'sine' : 'sawtooth';
      engF.frequency.setTargetAtTime(400 + 1400 * gas + 600 * f, t, 0.08);
      engG.gain.setTargetAtTime(live ? vol * (0.55 + 0.45 * gas) : 0, t, 0.08);
      windG.gain.setTargetAtTime(live ? 0.16 * f * f : 0, t, 0.1); windF.frequency.setTargetAtTime(400 + 900 * f, t, 0.1);
      skidG.gain.setTargetAtTime(live && R.drifting ? 0.05 : 0, t, 0.05);
      rumbleG.gain.setTargetAtTime(live && (R.kerb || R.surface === 'grass') && Math.abs(R.u) > 3 ? 0.35 : 0, t, 0.04);
    }
    function blip(freq, dur, type = 'sine', vol = 0.18) {
      if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    }
    function whoosh() {
      if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.35); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
    }
    function toggle() { on = !on; store.set('mf-race-sound-v1', on); root.setAttribute('data-snd', on ? 'on' : 'off'); if (master) master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.05); $('#b-sound').setAttribute('aria-pressed', String(on)); $('#b-sound').title = on ? 'Sound on (M)' : 'Sound off (M)'; }
    function silence() { if (ctx && engG) { const t = ctx.currentTime; [engG, windG, skidG, rumbleG].forEach(g => g.gain.setTargetAtTime(0, t, 0.05)); } }
    $('#b-sound').setAttribute('aria-pressed', String(on)); $('#b-sound').title = on ? 'Sound on (M)' : 'Sound off (M)';
    return { init, set, blip, whoosh, toggle, silence };
  })();
  $('#b-sound').addEventListener('click', () => { audio.init(); audio.toggle(); });

  /* ---------- the race state ---------- */
  let ride = RC.RIDE_ORDER.includes(store.get('mf-race-ride-v1', 'kart')) ? store.get('mf-race-ride-v1', 'kart') : 'kart';
  let diffKey = ['rookie', 'pro', 'legend'].includes(store.get('mf-race-diff-v1', 'pro')) ? store.get('mf-race-diff-v1', 'pro') : 'pro';
  let ghostOn = store.get('mf-race-ghost-on-v1', true) !== false;
  let state = 'menu';         // menu, intro, count, race, done
  let paused = false;
  let racers = [];            // { R, m, ai, tag, name, color, isPlayer }
  let player = null, raceT = 0, introT = 0, countT = 0, gasDownAt = -1, finishShownT = -1, wrongShown = false;
  let ghostModel = null, ghostData = null, ghostRec = [], ghostRecT = 0, offT = 0, resultShown = false, lastLapToast = 0;
  const STEP = 1 / 120;
  let simAcc = 0;
  const qa = new URLSearchParams(location.search).has('qa');
  const api = window.__rw = { timeScale: 1, auto: qa && new URLSearchParams(location.search).get('qa') === 'auto' };

  function ghostStore() { return store.get('mf-race-ghost-v1', {}) || {}; }
  function setupRace() {
    racers.forEach(r => { disposeModel(r.m); if (r.tag) { scene.remove(r.tag); r.tag.material.map.dispose(); } });
    if (ghostModel) { disposeModel(ghostModel); ghostModel = null; }
    racers = [];
    const slots = RC.gridSlots(T), rng = RC.mulberry((Date.now() & 0xffff) + 17);
    const diff = RC.DIFFS[diffKey];
    // a fresh order of rivals each race; the player always starts 4th
    const riv = RC.RIVALS.slice(); for (let i = riv.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [riv[i], riv[j]] = [riv[j], riv[i]]; }
    let ri = 0;
    slots.forEach((sl, k) => {
      const isPlayer = k === 3;
      const prof = isPlayer ? null : riv[ri++];
      const R = RC.makeRacer(T, ride, sl.s, sl.d);
      const sch = isPlayer ? PLAYER_SCH : { body: prof.color, accent: '#F4F4F1', kit: lighten(prof.color, 0.2), helmet: lighten(prof.color, 0.55), hub: '#C9D1DA' };
      const m = makeModel(ride, sch, isPlayer);
      const r = { R, m, isPlayer, name: isPlayer ? 'You' : prof.name, color: isPlayer ? '#E8A33D' : prof.color, prof };
      if (!isPlayer) { r.ai = RC.makeAI(T, R, prof, diff, rng); r.tag = tagSprite(prof.name, prof.color); r.react = 0.06 + rng() * 0.28; r.startBoost = rng() < (diffKey === 'legend' ? 0.7 : diffKey === 'pro' ? 0.5 : 0.25); }
      else player = r;
      racers.push(r);
    });
    player.auto = RC.makeAI(T, player.R, { name: 'auto', pace: 0.94, brakeEarly: 1, mistakes: 0, aggro: 0, line: 0 }, RC.DIFFS.pro, rng);
    ghostData = ghostStore()[ride] || null;
    ghostModel = makeModel(ride, PLAYER_SCH, true); ghostify(ghostModel); ghostModel.group.visible = false;
    raceT = 0; simAcc = 0; offT = 0; resultShown = false; finishShownT = -1; gasDownAt = -1; ghostRec = []; ghostRecT = 0;
    drawMapBase();
    racers.forEach(r => placeModel(r, 1, 0));
  }

  /* ---------- input ---------- */
  const keys = new Set();
  const touch = { steer: 0, gas: false, brake: false, drift: false, active: false };
  const input = { gas: 0, brake: 0, steer: 0, drift: false, look: false };
  let steerVal = 0, padReset = false, padPause = false;
  const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const racing = state === 'count' || state === 'race' || state === 'intro';
    if (GAME_KEYS.has(e.code) && racing && !paused) e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Escape') { if (state === 'count' || state === 'race' || state === 'intro') togglePause(); }
    else if (e.code === 'KeyM') { audio.init(); audio.toggle(); }
    else if (e.code === 'KeyG') toggleGhost();
    else if (e.code === 'KeyR' && state === 'race' && !paused) respawn(player, true);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); if ((state === 'race' || state === 'count') && !paused) togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'race' || state === 'count') && !paused) togglePause(); });

  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse) root.classList.add('rw-coarse');
  {
    const pad = $('#rw-steer'), knob = $('#rw-steer');
    let pid = null;
    const setS = e => { const r = pad.getBoundingClientRect(); touch.steer = clamp(((e.clientX - (r.left + r.width / 2)) / 102), -1, 1); pad.style.setProperty('--s', touch.steer.toFixed(3)); };
    pad.addEventListener('pointerdown', e => { pid = e.pointerId; pad.setPointerCapture(pid); setS(e); touch.active = true; e.preventDefault(); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === pid) setS(e); });
    const end = e => { if (e.pointerId !== pid) return; pid = null; touch.steer = 0; pad.style.setProperty('--s', '0'); };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    void knob;
    document.querySelectorAll('.rw-pedals button').forEach(b => {
      const k = b.dataset.k;
      const dn = e => { e.preventDefault(); touch[k] = true; touch.active = true; b.classList.add('on'); b.setPointerCapture && b.setPointerCapture(e.pointerId); audio.init(); };
      const up = () => { touch[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
  function readInput(dt) {
    let gas = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
    let brake = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
    let st = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
    let drift = keys.has('Space');
    let look = keys.has('ShiftLeft') || keys.has('ShiftRight');
    // keys are eased into an analog value: quick to turn in, quicker to center
    const toward = st !== 0 && Math.sign(st) !== Math.sign(steerVal) && steerVal !== 0 ? 9 : st === 0 ? 8 : 5.5;
    steerVal += clamp(st - steerVal, -toward * dt, toward * dt);
    let steer = steerVal;
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pr = false, pp = false;
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.12) steer = -Math.sign(ax) * ((Math.abs(ax) - 0.12) / 0.88);
      const b = i => gp.buttons[i] ? (gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0)) : 0;
      gas = Math.max(gas, b(7), b(0) > 0.5 && false ? 1 : 0); brake = Math.max(brake, b(6));
      if (b(0) > 0.5 || b(2) > 0.5 || b(5) > 0.5) drift = true;
      if (b(1) > 0.5) look = true;
      if (b(3) > 0.5) pr = true;
      if (b(9) > 0.5) pp = true;
      break;
    }
    if (pr && !padReset && state === 'race' && !paused) respawn(player, true);
    if (pp && !padPause && (state === 'race' || state === 'count')) togglePause();
    padReset = pr; padPause = pp;
    if (touch.active) { if (touch.steer !== 0) steer = -touch.steer; gas = Math.max(gas, touch.gas ? 1 : 0); brake = Math.max(brake, touch.brake ? 1 : 0); drift = drift || touch.drift; }
    input.gas = gas; input.brake = brake; input.steer = clamp(steer, -1, 1); input.drift = drift; input.look = look;
  }

  /* ---------- HUD ---------- */
  const hud = $('#rw-hud'), msg = $('#rw-msg'), toastEl = $('#rw-toast'), lightsEl = $('#rw-lights');
  const el = { pos: $('#rw-pos'), lap: $('#rw-lap'), time: $('#rw-time'), cur: $('#rw-cur'), best: $('#rw-best'), gap: $('#rw-gap'), mph: $('#rw-mph'), meter: $('#rw-meter'), mlab: $('#rw-mlab') };
  const lastTxt = new Map();
  const setTxt = (e, t) => { if (lastTxt.get(e) !== t) { lastTxt.set(e, t); e.textContent = t; } };
  const setHTML = (e, t) => { if (lastTxt.get(e) !== t) { lastTxt.set(e, t); e.innerHTML = t; } };
  let toastTimer = 0, msgTimer = 0;
  function toast(t, ms = 1600) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms); }
  function bigMsg(t, ms = 900, cls = '') { msg.className = 'rw-msg on ' + cls; msg.textContent = t; clearTimeout(msgTimer); if (ms) msgTimer = setTimeout(() => msg.classList.remove('on'), ms); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function order() {
    return racers.slice().sort((a, b) => {
      if (a.R.finished && b.R.finished) return a.R.finishT - b.R.finishT;
      if (a.R.finished) return -1; if (b.R.finished) return 1;
      return RC.progress(T, b.R) - RC.progress(T, a.R);
    });
  }
  let hudT = 0;
  function updateHUD(dt) {
    hudT -= dt;
    const R = player.R, C = R.C;
    // the meter: drift charge (blue, then orange), or the boost left
    let m = 0, col = 'var(--accent)', lab;
    const leanWord = C.lean ? 'Lean boost' : 'Drift';
    if (R.boostT > 0) { m = clamp(R.boostT / RC.BOOST.big, 0, 1); lab = 'Boost'; }
    else if (R.drifting) {
      m = clamp(R.charge / RC.DRIFT_ORANGE, 0, 1);
      if (R.charge >= RC.DRIFT_ORANGE) { col = '#FF8A3D'; lab = 'Big boost ready'; }
      else if (R.charge >= RC.DRIFT_BLUE) { col = '#4DA3FF'; lab = 'Boost ready'; }
      else { col = 'color-mix(in srgb, var(--ink) 45%, transparent)'; lab = leanWord + ': keep holding'; }
    } else if (R.tow) { m = 1; col = '#7FB7FF'; lab = 'Slipstream'; }
    else lab = coarse ? leanWord + ': hold the button in a corner' : leanWord + ': hold Space in a corner';
    el.meter.style.setProperty('--m', m.toFixed(3)); el.meter.style.setProperty('--meter', col);
    setTxt(el.mlab, lab);
    setTxt(el.mph, String(Math.round(Math.abs(R.u) * 2.237)));
    if (hudT > 0) return;
    hudT = 0.08;
    const ord = order(), pos = ord.indexOf(player) + 1;
    setTxt(el.pos, 'P' + pos);
    setTxt(el.lap, String(clamp(R.lap + 1, 1, RC.LAPS)));
    setTxt(el.time, fmt(state === 'race' || state === 'done' ? (R.finished ? R.finishT : raceT) : 0));
    setTxt(el.cur, fmt(R.lap >= 0 && !R.finished ? raceT - R.lapStart : 0));
    setTxt(el.best, isFinite(R.bestLap) ? fmt(R.bestLap, 2) : '-');
    // gaps, in seconds at the current pace
    if (state === 'race' && !R.finished && R.lap >= 0) {
      const me = RC.progress(T, R), v = Math.max(R.u, 12);
      const ahead = ord[pos - 2], behind = ord[pos];
      let h = '';
      if (ahead && !ahead.R.finished) h += `<b>${((RC.progress(T, ahead.R) - me) / v).toFixed(1)} s</b> to ${esc(ahead.name)}<br>`;
      if (behind && !behind.R.finished) h += `${esc(behind.name)} <b>${((me - RC.progress(T, behind.R)) / v).toFixed(1)} s</b> back`;
      setHTML(el.gap, h);
    } else setHTML(el.gap, '');
    drawMap();
  }

  /* the minimap */
  const mapC = $('#rw-map'), mctx = mapC.getContext('2d');
  const mapBase = document.createElement('canvas'); mapBase.width = mapBase.height = 220;
  const MB = (() => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < n; i++) { x0 = Math.min(x0, T.X[i]); x1 = Math.max(x1, T.X[i]); z0 = Math.min(z0, T.Z[i]); z1 = Math.max(z1, T.Z[i]); }
    const sc = 188 / Math.max(x1 - x0, z1 - z0); return { sc, ox: 110 - (x0 + x1) / 2 * sc, oz: 110 - (z0 + z1) / 2 * sc }; })();
  const mx = x => MB.ox + x * MB.sc, mz = z => MB.oz + z * MB.sc;
  function drawMapBase() {
    const c = mapBase.getContext('2d'), dusk = themeName === 'dusk';
    c.clearRect(0, 0, 220, 220); c.lineCap = 'round'; c.lineJoin = 'round';
    const path = (a, b) => { c.beginPath(); for (let i = a; i <= b; i += 4) { const q = ((i % n) + n) % n; if (i === a) c.moveTo(mx(T.X[q]), mz(T.Z[q])); else c.lineTo(mx(T.X[q]), mz(T.Z[q])); } };
    c.strokeStyle = dusk ? '#56616E' : '#A9B4C0'; c.lineWidth = 9; path(0, n); c.closePath(); c.stroke();
    // the bridge on top, with a gap under it
    const bI = Math.round(T.bridgeS / T.ds), span = Math.round(26 / T.ds);
    c.strokeStyle = dusk ? 'rgba(22,26,32,.95)' : 'rgba(250,250,247,.95)'; c.lineWidth = 15; path(bI - span, bI + span); c.stroke();
    c.strokeStyle = dusk ? '#7A8695' : '#8794A2'; c.lineWidth = 9; path(bI - span - 6, bI + span + 6); c.stroke();
    // start line
    const p = RC.sample(T, 0), nx = -Math.sin(p.yaw), nz = -Math.cos(p.yaw);
    c.strokeStyle = dusk ? '#F2F4F6' : '#1E2124'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx(p.x + nx * 7), mz(p.z + nz * 7)); c.lineTo(mx(p.x - nx * 7), mz(p.z - nz * 7)); c.stroke();
    // the boost pad
    const q = RC.sample(T, T.pads[0].s + 4); c.fillStyle = '#E8A33D'; c.beginPath(); c.arc(mx(q.x), mz(q.z), 3.2, 0, 7); c.fill();
  }
  function drawMap() {
    mctx.clearRect(0, 0, 220, 220); mctx.drawImage(mapBase, 0, 0);
    const dusk = themeName === 'dusk';
    for (const r of racers) {
      if (r.isPlayer) continue;
      mctx.fillStyle = r.color; mctx.strokeStyle = dusk ? '#161A20' : '#FAFAF7'; mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(mx(r.R.x), mz(r.R.z), 5.2, 0, 7); mctx.fill(); mctx.stroke();
    }
    const R = player.R; mctx.fillStyle = '#E8A33D'; mctx.strokeStyle = dusk ? '#F2F4F6' : '#1E2124'; mctx.lineWidth = 2.5;
    mctx.beginPath(); mctx.arc(mx(R.x), mz(R.z), 7.4, 0, 7); mctx.fill(); mctx.stroke();
  }

  /* ---------- speed lines (a 2D overlay) ---------- */
  const lc = $('#rw-lines'), lctx = lc.getContext('2d');
  let linesOn = false;
  function drawLines(intensity, towing) {
    if (intensity < 0.02) { if (linesOn) { lctx.clearRect(0, 0, lc.width, lc.height); linesOn = false; } return; }
    linesOn = true;
    const w = lc.width, h = lc.height, cx = w / 2, cy0 = h * 0.46;
    lctx.clearRect(0, 0, w, h);
    const N = Math.round(18 + 26 * intensity), rMax = Math.hypot(w, h) * 0.6;
    lctx.strokeStyle = towing ? 'rgba(160,205,255,.5)' : themeName === 'dusk' ? 'rgba(235,240,245,.42)' : 'rgba(255,255,255,.62)';
    lctx.lineCap = 'round';
    for (let k = 0; k < N; k++) {
      const a = Math.random() * Math.PI * 2, r0 = rMax * (0.42 + Math.random() * 0.3), len = rMax * (0.08 + 0.16 * intensity * Math.random());
      const ca = Math.cos(a), sa = Math.sin(a);
      lctx.lineWidth = 1 + Math.random() * 2.2 * intensity;
      lctx.globalAlpha = 0.35 + 0.65 * intensity;
      lctx.beginPath(); lctx.moveTo(cx + ca * r0, cy0 + sa * r0 * 0.8); lctx.lineTo(cx + ca * (r0 + len), cy0 + sa * (r0 + len) * 0.8); lctx.stroke();
    }
    lctx.globalAlpha = 1;
  }

  /* ---------- placing the models ---------- */
  const carObj = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, v: 0, air: false };
  function slopeAt(s) { const a = RC.sample(T, s - 1), b = RC.sample(T, s + 1); return Math.atan2(b.h - a.h, 2); }
  function placeModel(r, alpha, dt) {
    const R = r.R, m = r.m;
    const x = lerp(R.px, R.x, alpha), z = lerp(R.pz, R.z, alpha), y = lerp(R.py, R.y, alpha), yaw = R.pyaw + wrapA(R.yaw - R.pyaw) * alpha;
    const pitch = slopeAt(R.s) * (R.u >= 0 ? 1 : -1);
    if (m.rider) {
      carObj.x = x; carObj.y = y; carObj.z = z; carObj.yaw = yaw; carObj.pitch = pitch; carObj.v = R.u;
      m.rider.update(carObj, Math.max(dt, 1e-3), { yawRate: R.r, calm: false, boost: R.boostT > 0 ? 1 : 0, gas: r.lastGas || 0 });
    } else {
      const bump = R.kerb && Math.abs(R.u) > 4 ? Math.sin(raceT * 90 + (r.isPlayer ? 0 : 3)) * 0.012 : 0;
      m.group.position.set(x, y + bump, z);
      const latA = R.u * R.r;
      const roll = clamp(latA / 9.8, -1.3, 1.3) * (m.kind === 'car' ? 0.045 : 0.02);
      m.body.rotation.set(roll, yaw, pitch + (m.kind === 'car' ? clamp(-(r.acc || 0) * 0.004, -0.03, 0.03) : 0));
      for (const w of m.wheels) w.w.rotation.z -= R.u * dt / w.r;
      const sa = clamp(r.lastSteer || 0, -1, 1);
      for (const f of m.fronts) f.rotation.y = sa * 0.42;
      if (m.steerWheel) m.steerWheel.rotation.x = -sa * 1.1;
    }
    if (r.tag) {
      r.tag.position.set(x, y + m.tagY, z);
      const d = camera.position.distanceTo(r.tag.position);
      r.tag.visible = state !== 'menu' && d > 3 && d < 48;
      r.tag.material.opacity = clamp((48 - d) / 14, 0, 1);
    }
  }

  /* ---------- camera ---------- */
  let camYaw = 0, camInit = false;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpV = new THREE.Vector3();
  const CAM = { kart: [4.6, 1.85, 0.9], euc: [4.4, 2.15, 1.3], bike: [4.6, 2.2, 1.3], car: [6.6, 2.5, 1.1] };
  function chaseCam(dt, alpha, snap) {
    const R = player.R, k = CAM[R.cls];
    const x = lerp(R.px, R.x, alpha), z = lerp(R.pz, R.z, alpha), y = lerp(R.py, R.y, alpha), yaw = R.pyaw + wrapA(R.yaw - R.pyaw) * alpha;
    // follow the direction of travel, a little behind the nose, so drifts read
    const sp = Math.hypot(R.vx, R.vz), vYaw = sp > 3 ? Math.atan2(-R.vz, R.vx) : yaw;
    const target = (R.u < -1 ? yaw : yaw + wrapA(vYaw - yaw) * 0.55) + (input.look ? Math.PI : 0);
    camYaw = snap || !camInit ? target : camYaw + wrapA(target - camYaw) * (1 - Math.exp(-dt * (input.look ? 30 : 7)));
    camInit = true;
    const f = clamp(Math.abs(R.u) / R.C.vmax, 0, 1.3);
    const back = k[0] * (1 - 0.1 * f), up = k[1] - 0.15 * f;
    camPos.set(x - Math.cos(camYaw) * back, y + up, z + Math.sin(camYaw) * back);
    camLook.set(x + Math.cos(camYaw) * 4, y + k[2], z - Math.sin(camYaw) * 4);
    const shake = reduce ? 0 : (R.bump * 0.14 + (R.kerb && Math.abs(R.u) > 5 ? 0.025 : 0) + (R.surface === 'grass' && Math.abs(R.u) > 4 ? 0.04 : 0));
    if (shake > 0.002) { camPos.x += (Math.random() - 0.5) * shake; camPos.y += (Math.random() - 0.5) * shake; camPos.z += (Math.random() - 0.5) * shake; }
    let fov = 70 + 12 * clamp((f - 0.25) / 0.85, 0, 1) + (R.boostT > 0 ? 4 : 0);
    if (camera.aspect < 1) fov *= 1.22;
    camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 5));
  }
  function orbitCam(t) {
    const a = t * 0.045 + 0.6, cxw = 36, czw = -6;
    camPos.set(cxw + Math.cos(a) * 250, 92, czw + Math.sin(a) * 200);
    camLook.set(cxw, 0, czw);
    camera.fov = camera.aspect < 1 ? 70 : 52;
  }

  /* ---------- screens ---------- */
  const startEl = $('#rw-start'), pauseEl = $('#rw-pause'), endEl = $('#rw-end'), veil = $('#dv-veil'), touchEl = $('#rw-touch');
  const RIDE_INFO = {
    kart: { sub: 'Drifts easiest', ic: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 15.5h17M5 15.5l1.4-3.5h5.2l1.6 2h4.6l1.7 1.5"/><circle cx="6.5" cy="17.3" r="1.9"/><circle cx="17.5" cy="17.3" r="1.9"/><circle cx="10.4" cy="9" r="1.9"/></svg>', drift: 1 },
    euc: { sub: 'Leans hard', ic: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.8 12.8V7.4a1.3 1.3 0 0 1 1.3-1.3h3.8a1.3 1.3 0 0 1 1.3 1.3V12.8z"/><path d="M8.8 9.53A5.1 5.1 0 1 0 15.2 9.53"/><path d="M10.8 6.1V5.1h2.4v1"/></svg>', drift: 0.45 },
    bike: { sub: 'Tightest line', ic: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="15" r="3.4"/><circle cx="18" cy="15" r="3.4"/><path d="M6 15l3.6-6h5.2M11.6 15l-2-6M11.6 15l3.6-6 2.8 6M6 15h5.6M14.4 7.2l.8 1.8"/></svg>', drift: 0.4 },
    car: { sub: 'Fastest, heaviest', ic: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15.5V12l2-4.5h12l2 4.5v3.5H4z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/></svg>', drift: 0.75 }
  };
  const ridesEl = $('#rw-rides');
  ridesEl.innerHTML = RC.RIDE_ORDER.map(k => {
    const C = RC.CLASSES[k], I = RIDE_INFO[k];
    const speed = C.vmax / 30, accel = clamp(1 - (1.83 * C.vmax / C.A - 1.8) / 1.6, 0.15, 1), grip = C.aLat / 16;
    const bar = (l, v) => `<span class="rw-bar">${l}<i style="--v:${v.toFixed(2)}"></i></span>`;
    return `<button type="button" class="rw-ride" role="radio" data-ride="${k}"><i class="ic">${I.ic}</i><b>${C.name}</b><span>${I.sub}, ${Math.round(C.vmax * 2.237)} mph</span>${bar('Speed', speed)}${bar('Launch', accel)}${bar('Grip', grip)}${bar(C.lean ? 'Lean' : 'Drift', I.drift)}</button>`;
  }).join('');
  function records() { return store.get('mf-race-best-v1', {}) || {}; }
  function refreshStart() {
    ridesEl.querySelectorAll('.rw-ride').forEach(b => { const on = b.dataset.ride === ride; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    document.querySelectorAll('#rw-diff button').forEach(b => { const on = b.dataset.d === diffKey; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    const rec = records()[ride + ':' + diffKey], nm = RC.CLASSES[ride].name + ' on ' + RC.DIFFS[diffKey].name;
    $('#rw-rec').innerHTML = rec ? `Your best, ${esc(nm)}: <b>${fmt(rec.total, 2)}</b> race, <b>${fmt(rec.lap, 2)}</b> lap` : `No record yet for ${esc(nm)}.`;
  }
  ridesEl.addEventListener('click', e => { const b = e.target.closest('.rw-ride'); if (!b) return; ride = b.dataset.ride; store.set('mf-race-ride-v1', ride); refreshStart(); setupRace(); });
  $('#rw-diff').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; diffKey = b.dataset.d; store.set('mf-race-diff-v1', diffKey); refreshStart(); });
  $('#rw-go').addEventListener('click', () => { audio.init(); beginRace(); });
  $('#rw-resume').addEventListener('click', () => togglePause());
  $('#rw-restart').addEventListener('click', () => { pauseEl.hidden = true; paused = false; beginRace(); });
  $('#rw-menu').addEventListener('click', () => { pauseEl.hidden = true; paused = false; toMenu(); });
  $('#b-pause').addEventListener('click', () => { if (state === 'race' || state === 'count' || state === 'intro') togglePause(); });
  $('#rw-again').addEventListener('click', () => { endEl.hidden = true; audio.init(); beginRace(); });
  $('#rw-change').addEventListener('click', () => { endEl.hidden = true; toMenu(); });
  function toggleGhost() { ghostOn = !ghostOn; store.set('mf-race-ghost-on-v1', ghostOn); $('#b-ghost').setAttribute('aria-pressed', String(ghostOn)); $('#b-ghost').classList.toggle('on', ghostOn); toast(ghostOn ? (ghostData ? 'Ghost on' : 'Ghost on: set a lap first') : 'Ghost off', 1200); }
  $('#b-ghost').addEventListener('click', toggleGhost);
  $('#b-ghost').setAttribute('aria-pressed', String(ghostOn)); $('#b-ghost').classList.toggle('on', ghostOn);

  function togglePause() {
    paused = !paused; pauseEl.hidden = !paused; keys.clear();
    if (paused) { audio.silence(); setTimeout(() => $('#rw-resume').focus(), 0); }
  }
  function toMenu() {
    state = 'menu'; paused = false; hud.hidden = true; touchEl.hidden = true; lightsEl.hidden = true; msg.classList.remove('on'); audio.silence();
    setupRace(); refreshStart(); startEl.hidden = false; endEl.hidden = true; pauseEl.hidden = true;
    lamps.forEach(m => m.color.set('#2A3038'));
    setTimeout(() => { const b = ridesEl.querySelector('.rw-ride.on'); b && b.focus(); }, 0);
  }
  function beginRace() {
    setupRace();
    startEl.hidden = true; endEl.hidden = true; pauseEl.hidden = true; paused = false;
    hud.hidden = false; touchEl.hidden = !coarse;
    state = 'intro'; introT = 0; camInit = false;
    lightsEl.hidden = true; lightsEl.querySelectorAll('i').forEach(i => i.classList.remove('on'));
    lamps.forEach(m => m.color.set('#2A3038'));
    canvas.focus && canvas.focus();
  }
  function startCountdown() { state = 'count'; countT = 0; lightsEl.hidden = false; gasDownAt = -1; }
  function goRace() {
    state = 'race'; raceT = 0;
    bigMsg('Go', 800);
    lightsEl.querySelectorAll('i').forEach((i, k) => i.classList.toggle('on', k === 3));
    lamps.forEach((m, k) => m.color.set(k === 3 ? '#3DD68C' : '#2A3038'));
    setTimeout(() => { if (state === 'race' || state === 'done') lightsEl.hidden = true; }, 1300);
    audio.blip(880, 0.5, 'square', 0.12);
    // the start: gas held from after the third light is a perfect start; held from before it is a jump start
    const R = player.R;
    if (input.gas > 0 && gasDownAt >= 0) {
      if (gasDownAt >= 2.0) { R.boostT = RC.BOOST.start; toast('Perfect start', 1300); audio.whoosh(); }
      else { R.holdT = 1.0; toast('Too early. Press gas after the last red light.', 2200); }
    }
    for (const r of racers) if (!r.isPlayer) { r.R.holdT = r.react; if (r.startBoost) r.R.boostT = RC.BOOST.start; }
  }

  /* ---------- respawn ---------- */
  function respawn(r, byKey) {
    const R = r.R, p = RC.sample(T, R.s);
    const d = clamp(p.line * 0.6, -3, 3);
    R.x = p.x - Math.sin(p.yaw) * d; R.z = p.z - Math.cos(p.yaw) * d; R.y = p.h; R.yaw = p.yaw; R.r = 0;
    const v = Math.min(Math.max(R.u, 0), 8);
    R.vx = Math.cos(p.yaw) * v; R.vz = -Math.sin(p.yaw) * v;
    R.px = R.x; R.pz = R.z; R.py = R.y; R.pyaw = R.yaw;
    R.drifting = false; R.charge = 0; R.boostT = 0; R.ghost = true; r.ghostT = 1.5; R.wrongT = 0; R.stuckT = 0;
    if (r.isPlayer) { offT = 0; camInit = false; if (byKey) toast('Back on track', 1000); }
  }

  /* ---------- the fixed-step simulation ---------- */
  const evs = [];
  function sim(dt) {
    if (state === 'count') {
      countT += dt;
      if (input.gas > 0) { if (gasDownAt < 0) gasDownAt = countT; } else gasDownAt = -1;
      return;
    }
    if (state !== 'race' && state !== 'done') return;
    raceT += dt;
    evs.length = 0;
    for (const r of racers) {
      const R = r.R;
      let inp;
      if (r.isPlayer) inp = (R.finished || api.auto) ? RC.driveAI(T, player.auto, racers.map(o => o.R), null, raceT) : input;
      else inp = RC.driveAI(T, r.ai, racers.map(o => o.R), player.R, raceT);
      const u0 = R.u;
      RC.stepRacer(T, R, inp, dt, evs);
      r.lastSteer = r.lastSteer === undefined ? inp.steer : r.lastSteer + (inp.steer - r.lastSteer) * 0.2; r.lastGas = inp.gas; r.sparks = inp.sparks;
      r.acc = (R.u - u0) / dt;
      if (r.ghostT > 0) { r.ghostT -= dt; if (r.ghostT <= 0) R.ghost = false; }
      // auto reset: off the track too long, stuck, or the wrong way for long
      if (!r.isPlayer || state === 'race') {
        const off = R.surface === 'grass' && Math.abs(R.u) < R.C.vmax * 0.5;
        r.offT = off || R.stuckT > 0.5 ? (r.offT || 0) + dt : 0;
        if (r.offT > (r.isPlayer ? 2.6 : 2.0) || (!r.isPlayer && R.wrongT > 2)) { r.offT = 0; respawn(r, false); if (r.isPlayer) toast('Back on track', 1000); }
      }
    }
    RC.collide(racers.map(r => r.R));
    RC.slipstream(T, racers.map(r => r.R), dt);
    for (const e of evs) {
      const r = racers.find(o => o.R === e.r), R = e.r;
      if (e.t === 'lap') {
        if (R.lap >= 1) { const lt = raceT - R.lapStart; R.lapTimes.push(lt); if (lt < R.bestLap) R.bestLap = lt; if (r.isPlayer) onPlayerLap(lt); }
        R.lapStart = raceT;
        if (R.lap >= RC.LAPS && !R.finished) { R.finished = true; R.finishT = raceT; if (r.isPlayer) onPlayerFinish(); }
        else if (r.isPlayer && R.lap === RC.LAPS - 1) { bigMsg('Final lap', 1200, 'small'); }
      } else if (r && r.isPlayer) {
        if (e.t === 'boost') { audio.whoosh(); }
        else if (e.t === 'pad') { audio.whoosh(); toast('Boost pad', 700); }
        else if (e.t === 'wall' && e.v > 2) audio.blip(70 + Math.random() * 20, 0.18, 'sine', clamp(e.v / 14, 0.05, 0.25));
      }
    }
    // ghost recording, 20 times a second
    const P0 = player.R;
    if (P0.lap >= 0 && !P0.finished) {
      ghostRecT += dt;
      if (ghostRecT >= 0.05) { ghostRecT -= 0.05; ghostRec.push(Math.round(P0.x * 10), Math.round(P0.z * 10), Math.round(P0.y * 10), Math.round(P0.yaw * 1000)); }
    }
  }
  function onPlayerLap(lt) {
    const R = player.R;
    const best = lt <= R.bestLap + 1e-9 && R.lapTimes.length > 1;
    if (R.lap < RC.LAPS) toast(best ? 'Best lap ' + fmt(lt, 2) : 'Lap ' + fmt(lt, 2), 1700);
    // keep the ghost of the fastest lap ever, per ride
    const gs = ghostStore(), cur = gs[ride];
    if (!cur || lt < cur.ms / 1000) { gs[ride] = { ms: Math.round(lt * 1000), f: ghostRec.slice() }; store.set('mf-race-ghost-v1', gs); ghostData = gs[ride]; }
    ghostRec = []; ghostRecT = 0;
  }
  function onPlayerFinish() {
    const R = player.R, ord = order(), pos = ord.indexOf(player) + 1;
    state = 'done'; finishShownT = 0;
    bigMsg(pos === 1 ? 'You win' : 'Finish', 1800);
    audio.blip(660, 0.25, 'triangle', 0.12); setTimeout(() => audio.blip(990, 0.4, 'triangle', 0.12), 180);
    // records
    const recs = records(), key = ride + ':' + diffKey, cur = recs[key] || { total: Infinity, lap: Infinity };
    const newTotal = R.finishT < cur.total, newLap = R.bestLap < cur.lap;
    recs[key] = { total: Math.min(cur.total, R.finishT), lap: Math.min(cur.lap, R.bestLap) };
    store.set('mf-race-best-v1', recs);
    R.result = { pos, newTotal, newLap };
    try { window.mfBoard?.submit({ game: 'raceway', ride, difficulty: diffKey, totalMs: Math.round(R.finishT * 1000), bestLapMs: Math.round(R.bestLap * 1000), position: pos }); } catch (e) {}
  }
  function showResults() {
    resultShown = true;
    const R = player.R, res = R.result, pos = res.pos;
    const medal = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';
    const md = $('#rw-medal'); md.dataset.m = medal; md.textContent = 'P' + pos;
    $('#rw-end-k').textContent = (medal ? medal[0].toUpperCase() + medal.slice(1) + ' · ' : '') + RC.CLASSES[ride].name + ' · ' + RC.DIFFS[diffKey].name;
    $('#rw-end-h').textContent = pos === 1 ? 'You won the race.' : 'You finished P' + pos + ' of 6.';
    $('#rw-stats').innerHTML = `<div><span>Race time</span><b>${fmt(R.finishT, 2)}</b>${res.newTotal ? '<em>New best</em>' : ''}</div>`
      + `<div><span>Best lap</span><b>${fmt(R.bestLap, 2)}</b>${res.newLap ? '<em>New best</em>' : ''}</div>`
      + `<div><span>Laps</span><b>${R.lapTimes.map(t => fmt(t, 1)).join(' · ')}</b></div>`;
    fillTable();
    hud.hidden = true; touchEl.hidden = true; endEl.hidden = false;
    setTimeout(() => $('#rw-again').focus(), 0);
  }
  function fillTable() {
    const ord = order();
    const html = ord.map((r, k) => `<li class="${r.isPlayer ? 'me' : ''}"><span>${k + 1}</span><i style="--c:${r.color}"></i><span>${esc(r.name)}</span><span>${r.R.finished ? fmt(r.R.finishT, 2) : 'Still racing'}</span></li>`).join('');
    setHTML($('#rw-table'), html);
  }

  /* ---------- the frame loop ---------- */
  let last = performance.now(), wall = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    lc.width = Math.round(w * 0.75); lc.height = Math.round(h * 0.75);
  }
  addEventListener('resize', resize); resize();
  applyTheme();
  setupRace(); refreshStart();

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000); last = now; wall += dt;
    if (!paused) {
      readInput(dt);
      const sdt = dt * api.timeScale;
      if (state === 'intro') { introT += dt; if (introT > 1.7) startCountdown(); }
      if (state === 'count') {
        const before = countT;
        simAcc += sdt; let k = 0; while (simAcc >= STEP && k < 40) { sim(STEP); simAcc -= STEP; k++; }
        for (let i = 0; i < 3; i++) if (before < i && countT >= i) { lightsEl.querySelectorAll('i')[i].classList.add('on'); lamps[i].color.set('#E5484D'); audio.blip(440, 0.25, 'square', 0.1); }
        if (countT >= 3.0) goRace();
      } else if (state === 'race' || state === 'done') {
        simAcc += sdt; let k = 0; const cap = 12 * Math.max(1, api.timeScale);
        while (simAcc >= STEP && k < cap) { sim(STEP); simAcc -= STEP; k++; }
        if (simAcc > STEP * 4) simAcc = 0;
        if (state === 'done') { finishShownT += dt; if (!resultShown && finishShownT > 2.6) showResults(); if (resultShown) fillTable(); }
      }
    }
    const alpha = clamp(simAcc / STEP, 0, 1);
    // the models
    for (const r of racers) { placeModel(r, (state === 'race' || state === 'done') ? alpha : 1, paused ? 0 : dt); }
    // the best-lap ghost
    if (ghostModel) {
      const R = player.R, gd = ghostData;
      let show = false;
      if (ghostOn && gd && gd.f.length > 8 && (state === 'race') && R.lap >= 0 && !R.finished) {
        const t = (raceT - R.lapStart) * 20, i = Math.floor(t), f = t - i, F = gd.f, N = F.length / 4;
        if (i < N - 1) {
          const a = i * 4, b = a + 4, yA = F[a + 3] / 1000, yB = F[b + 3] / 1000;
          const gx = lerp(F[a], F[b], f) / 10, gz = lerp(F[a + 1], F[b + 1], f) / 10, gy = lerp(F[a + 2], F[b + 2], f) / 10, gyaw = yA + wrapA(yB - yA) * f;
          const m = ghostModel;
          if (m.rider) { carObj.x = gx; carObj.y = gy; carObj.z = gz; carObj.yaw = gyaw; carObj.pitch = 0; carObj.v = 15; m.rider.update(carObj, Math.max(dt, 1e-3), { yawRate: 0, gas: 1 }); }
          else { m.group.position.set(gx, gy, gz); m.body.rotation.set(0, gyaw, 0); }
          show = Math.hypot(gx - R.x, gz - R.z) > 1.2;
        }
      }
      ghostModel.group.visible = show;
    }
    // particles
    if (!paused) {
      for (const r of racers) {
        const R = r.R; if (state !== 'race' && state !== 'done') break;
        const fx = Math.cos(R.yaw), fz = -Math.sin(R.yaw), rx = Math.sin(R.yaw), rz = Math.cos(R.yaw);
        const near = camera.position.distanceToSquared(r.m.group.position) < 70 * 70;
        if (!near) continue;
        const back = r.m.kind === 'car' ? 2.0 : r.m.kind === 'kart' ? 0.95 : 0.35, side = r.m.kind === 'car' ? 0.85 : r.m.kind === 'kart' ? 0.62 : 0;
        const rate = (R.drifting || r.sparks) ? 70 : 0;
        if (rate && Math.random() < rate * dt * 2) {
          const ch = R.drifting ? R.charge : 1.0;
          const col = ch >= RC.DRIFT_ORANGE ? C_SPARK.orange : ch >= RC.DRIFT_BLUE ? C_SPARK.blue : C_SPARK.white;
          for (const s of side ? [-1, 1] : [0]) emit(R.x - fx * back + rx * side * s, R.y + 0.12, R.z - fz * back + rz * side * s, R.vx * 0.3 - fx * 2 + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, R.vz * 0.3 - fz * 2 + (Math.random() - 0.5) * 3, col, 0.28 + Math.random() * 0.2);
        }
        if (R.boostT > 0 && Math.random() < dt * 60) emit(R.x - fx * (back + 0.2), R.y + 0.35, R.z - fz * (back + 0.2), -fx * 6 + (Math.random() - 0.5) * 2, 0.6, -fz * 6 + (Math.random() - 0.5) * 2, C_SPARK.boost, 0.22);
        if (R.surface === 'grass' && Math.abs(R.u) > 4 && Math.random() < dt * 30) emit(R.x - fx * back, R.y + 0.15, R.z - fz * back, (Math.random() - 0.5) * 2, 1.8, (Math.random() - 0.5) * 2, C_SPARK.grass, 0.45);
      }
      stepParticles(dt);
    }
    // camera
    if (state === 'menu') orbitCam(wall);
    else if (state === 'intro') {
      orbitCam(wall); const a = camPos.clone(), la = camLook.clone();
      chaseCam(dt, 1, true);
      const e = 1 - Math.pow(1 - clamp(introT / 1.6, 0, 1), 3);
      camPos.lerpVectors(a, camPos, e); camLook.lerpVectors(la, camLook, e); camera.fov = lerp(52, 70, e);
    } else chaseCam(paused ? 0 : dt, (state === 'race' || state === 'done') ? alpha : 1, false);
    camera.position.copy(camPos); camera.lookAt(camLook); camera.updateProjectionMatrix();
    // shadows follow the action
    const focus = state === 'menu' ? tmpV.set(40, 0, -5) : tmpV.set(player.R.x, player.R.y, player.R.z);
    if (state === 'menu') { sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.far = 600; }
    else { sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.far = 260; }
    sc.updateProjectionMatrix();
    sun.position.copy(focus).add(state === 'menu' ? tmpV.clone().set(-150, 260, 160).sub(focus).add(focus) : SUN_OFF); sun.target.position.copy(focus);
    if (state === 'menu') sun.position.set(focus.x - 150, 260, focus.z + 160);
    padTex.offset.x = -(wall * 1.6 % 1);
    // HUD and sound
    if (state === 'race' || state === 'done' || state === 'count') {
      updateHUD(dt);
      const R = player.R;
      if (state === 'race' && !paused) {
        if (R.wrongT > 0.8 && !R.finished) { if (!wrongShown) { wrongShown = true; bigMsg('Wrong way', 0, 'warn'); } }
        else if (wrongShown) { wrongShown = false; msg.classList.remove('on'); }
      }
      const f = clamp(Math.abs(R.u) / R.C.vmax, 0, 1.3);
      drawLines(reduce ? 0 : clamp((f - 0.8) / 0.25, 0, 1) * 0.8 + (R.boostT > 0 ? 0.35 : 0) + (R.tow ? 0.25 : 0), R.tow && R.boostT <= 0);
      if (!paused) audio.set(R, input.gas, state === 'race' || state === 'done');
    } else drawLines(0);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(t => { last = t; renderer.render(scene, camera); requestAnimationFrame(() => { veil.classList.remove('on'); startEl.hidden = false; setTimeout(() => { const b = ridesEl.querySelector('.rw-ride.on'); b && b.focus({ preventScroll: true }); }, 50); }); requestAnimationFrame(frame); });

  // QA hooks (harmless for visitors)
  Object.assign(api, {
    get state() { return state; }, T, get racers() { return racers; }, get player() { return player; }, renderer,
    info: () => ({ state, raceT: +raceT.toFixed(2), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, order: order().map(r => r.name), lap: player.R.lap, u: +player.R.u.toFixed(2) }),
    begin: () => beginRace(), menu: () => toMenu()
  });
}
