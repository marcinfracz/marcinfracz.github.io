/* The Road: shared helpers, theme tokens and materials. */
import * as THREE from '../vendor/three.module.min.js';
export { THREE };

/* Theme tokens: Day (light, default) and Dusk (dark). Surfaces are calm
   bluish grays; amber is the hero accent; cobalt is used sparingly. */
export const TOKENS = {
  day: {
    sky: '#E9EDF2', horizon: '#F4F1EA', fog: '#EEF0F0',
    terrain: '#CBD4DE', terrainHi: '#D9E0E7', road: '#97A3B1', line: '#F4F1EA', curb: '#E2E7EC',
    obj: '#E3E8EE', objShade: '#B8C2CD', objDark: '#6E7B8A', glass: '#A9B8C8',
    accent: '#E8A33D', accentInk: '#8A520C', cobalt: '#2563EB', radar: '#22D3EE', lidar: '#7C8BA0',
    water: '#B4C3D3', tree: '#B3C2BF', glow: '#000000', sun: '#F2C77A',
    ink: '#1E2124', card: '#FAFAF7', land: '#FFFFFF', lit: '#000000',
    hemiSky: '#FFFFFF', hemiGround: '#AEB8C4', hemi: 1.35, dir: 1.55, dirColor: '#FFF6E8'
  },
  dusk: {
    sky: '#0E1114', horizon: '#161A20', fog: '#141820',
    terrain: '#232A33', terrainHi: '#2A323C', road: '#313A45', line: '#56606E', curb: '#3A4350',
    obj: '#3A4350', objShade: '#2E3640', objDark: '#1A1F26', glass: '#4B5A6E',
    accent: '#F2B456', accentInk: '#F2B456', cobalt: '#6B9BFF', radar: '#22D3EE', lidar: '#7DD3FC',
    water: '#1B2430', tree: '#2B3634', glow: '#A784F5', sun: '#E8A33D',
    ink: '#ECEEF1', card: '#161A20', land: '#737D8E', lit: '#A88A62',
    hemiSky: '#9FB0CC', hemiGround: '#1A1F26', hemi: 1.2, dir: 0.9, dirColor: '#C9D6FF'
  }
};

export let theme = 'day';
const registry = []; // {m, key, prop, scale}
const labelRegistry = [];

export function tok(key) { return TOKENS[theme][key]; }

export function reg(m, key, prop = 'color', scale = 1) {
  registry.push({ m, key, prop, scale });
  setProp(m, key, prop, scale);
  return m;
}
function setProp(m, key, prop, scale) {
  const c = new THREE.Color(tok(key));
  if (scale !== 1) c.multiplyScalar(scale);
  m[prop].copy(c);
}

export function setTheme(name) {
  theme = name;
  registry.forEach(r => setProp(r.m, r.key, r.prop, r.scale));
  labelRegistry.forEach(l => l.draw());
}

const shared = {};
/* One shared matte material per token key. */
export function mat(key, opts = {}) {
  const id = key + JSON.stringify(opts);
  if (shared[id]) return shared[id];
  const m = new THREE.MeshLambertMaterial(Object.assign({}, opts));
  reg(m, key);
  shared[id] = m;
  return m;
}
/* A material of its own (for parts that light up on their own). */
export function ownMat(key, opts = {}) {
  const m = new THREE.MeshLambertMaterial(Object.assign({}, opts));
  reg(m, key);
  return m;
}
export function glowMat(key, opacity = 0.35, extra = {}) {
  const m = new THREE.MeshBasicMaterial(Object.assign({ transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }, extra));
  reg(m, key);
  return m;
}

export function mesh(geo, material, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}
export function at(o, x = 0, y = 0, z = 0, ry = 0) { o.position.set(x, y, z); if (ry) o.rotation.y = ry; return o; }
export function box(w, h, d, key, x = 0, y = 0, z = 0) {
  return at(mesh(new THREE.BoxGeometry(w, h, d), typeof key === 'string' ? mat(key) : key), x, y + h / 2, z);
}
export function cyl(rt, rb, h, key, x = 0, y = 0, z = 0, seg = 20) {
  return at(mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof key === 'string' ? mat(key) : key), x, y + h / 2, z);
}
export function sph(r, key, x = 0, y = 0, z = 0, seg = 20) {
  return at(mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2 | 0)), typeof key === 'string' ? mat(key) : key), x, y, z);
}
export function grp(...kids) { const g = new THREE.Group(); kids.forEach(k => k && g.add(k)); return g; }

/* Merge simple geometries into one non-indexed geometry with a per-vertex
   shade, so a whole vehicle is one instanced draw. parts: [geo, shade] */
export function merge(parts) {
  const pos = [], nor = [], col = [];
  parts.forEach(([g, shade]) => {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.attributes.position.array, n = ng.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    const c = Array.isArray(shade) ? shade : [shade, shade, shade];
    for (let i = 0; i < p.length / 3; i++) col.push(c[0], c[1], c[2]);
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}
export function bx(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return g;
}
export function cy(rt, rb, h, x = 0, y = 0, z = 0, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y + h / 2, z); return g;
}

/* Small text label drawn on a canvas, redrawn on theme change. */
export function label(text, { size = 26, key = 'ink', bg = null, scale = 1, weight = 700 } = {}) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const L = {
    text,
    draw() {
      ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
      const w = Math.ceil(ctx.measureText(L.text).width) + 18, h = size + 14;
      cv.width = w * 2; cv.height = h * 2;
      ctx.scale(2, 2);
      ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
      if (bg) {
        ctx.fillStyle = tok(bg); ctx.globalAlpha = 0.92;
        const r = h / 2; ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(r, h); ctx.arc(r, r, r, Math.PI / 2, Math.PI * 1.5); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = tok(key); ctx.textBaseline = 'middle';
      ctx.fillText(L.text, 9, h / 2 + 1);
      tex.needsUpdate = true;
      sp.scale.set(w / 22 * scale, h / 22 * scale, 1);
    }
  };
  L.draw();
  labelRegistry.push(L);
  sp.userData.label = L;
  return sp;
}

/* A canvas texture that redraws itself when the theme changes. */
export function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const L = { draw(arg) { if (arg !== undefined) L.arg = arg; draw(ctx, w, h, L.arg); tex.needsUpdate = true; } };
  L.draw(); labelRegistry.push(L); tex.userData.redraw = L.draw;
  return tex;
}

export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export function rand(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

/* The road's centerline: a gentle S across the whole trip. */
export const roadZ = x => 5 * Math.sin(x * 0.018) + 2.5 * Math.sin(x * 0.047 + 1);
export const roadDZ = x => 5 * 0.018 * Math.cos(x * 0.018) + 2.5 * 0.047 * Math.cos(x * 0.047 + 1);
