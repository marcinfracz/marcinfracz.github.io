/* The Road: mini cities around the key stops. Stylized low-poly landmarks,
   placed roughly as they sit in the real world, plus organic streets on both
   sides of the road, rivers and bridges, overpasses, buildings that face
   their streets, traffic, buses, people, parks and flags. Only the cities near the camera draw.
   Flint (Kettering), Ann Arbor (Michigan Ross), Detroit (riverfront) and
   Shanghai (Lujiazui and the Bund). */
import { THREE, mat, reg, mesh, merge, bx, cy, label, canvasTex, tok, roadZ, roadDZ, rand, smooth, clamp, lerp } from './core.js';
import { vehicleGeo } from './world.js';

/* ---------------- shared materials and a small geometry kit ---------------- */
const C3 = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
let LAND = null, LIT = null;
function mats() {
  if (LAND) return;
  LAND = mat('land', { vertexColors: true });
  LIT = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  reg(LIT, 'lit');
}
export const MAIZE = '#FFCB05', BLUE = '#00274C';

function kit() {
  const P = [], L = [];
  const add = (g, c, lit) => { (lit ? L : P).push([g, Array.isArray(c) ? c : C3(c)]); return k; };
  const k = {
    add,
    box(w, h, d, x, y, z, c, ry = 0) { const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0); if (ry) g.rotateY(ry); return add(g.translate(x, y, z), c); },
    cyl(rt, rb, h, x, y, z, c, seg = 16, ry = 0) { const g = new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0); if (ry) g.rotateY(ry); return add(g.translate(x, y, z), c); },
    sph(r, x, y, z, c, seg = 14, sy = 1) { return add(new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2 | 0)).scale(1, sy, 1).translate(x, y, z), c); },
    cone(r, h, x, y, z, c, seg = 4, ry = Math.PI / 4) { const g = new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0); if (ry) g.rotateY(ry); return add(g.translate(x, y, z), c); },
    /* window bands on a box: dark in the day, warm light at dusk */
    bands(w, d, x, y0, y1, z, step, c = '#3E4650', ry = 0, on = 0.8) {
      for (let y = y0 + step * 0.3; y < y1 - step * 0.25; y += step) {
        const g = new THREE.BoxGeometry(w + 0.08, step * 0.4, d + 0.08).translate(0, y, 0); if (ry) g.rotateY(ry); g.translate(x, 0, z);
        add(g, c);
        const gl = new THREE.BoxGeometry(w + 0.14, step * 0.4, d + 0.14).translate(0, y, 0); if (ry) gl.rotateY(ry); gl.translate(x, 0, z);
        const v = Math.random() < on ? 0.9 + Math.random() * 0.1 : 0.15; add(gl, [v, v * 0.92, v * 0.8], true);
      }
      return k;
    },
    cbands(r, x, y0, y1, z, step, c = '#3E4650', seg = 20, on = 0.85) {
      for (let y = y0 + step * 0.3; y < y1 - step * 0.25; y += step) {
        add(new THREE.CylinderGeometry(r + 0.05, r + 0.05, step * 0.4, seg).translate(x, y, z), c);
        const v = Math.random() < on ? 0.95 : 0.15;
        add(new THREE.CylinderGeometry(r + 0.1, r + 0.1, step * 0.4, seg).translate(x, y, z), [v, v * 0.92, v * 0.8], true);
      }
      return k;
    },
    build() {
      mats();
      const g = new THREE.Group();
      if (P.length) { const m = mesh(merge(P), LAND); g.add(m); }
      if (L.length) { const m = new THREE.Mesh(merge(L), LIT); m.renderOrder = 1; g.add(m); }
      return g;
    }
  };
  return k;
}
const shapeGeo = (pts, depth) => {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
};
/* the block M, one unit wide, 0.72 tall */
const M_PTS = [[0, 0], [0.34, 0], [0.34, 0.1], [0.27, 0.1], [0.27, 0.38], [0.5, 0.12], [0.73, 0.38], [0.73, 0.1], [0.66, 0.1], [0.66, 0], [1, 0], [1, 0.1], [0.93, 0.1], [0.93, 0.62], [1, 0.62], [1, 0.72], [0.71, 0.72], [0.5, 0.47], [0.29, 0.72], [0, 0.72], [0, 0.62], [0.07, 0.62], [0.07, 0.1], [0, 0.1]];
function drawM(ctx, x, y, w, fill) { ctx.fillStyle = fill; ctx.beginPath(); M_PTS.forEach(([a, b], i) => { const px = x + a * w, py = y + (0.72 - b) * w; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.fill(); }
export function blockMGeo(w = 1, depth = 0.3) { const g = shapeGeo(M_PTS.map(([x, y]) => [(x - 0.5) * w, y * w]), depth); g.translate(0, 0, -depth / 2); return g; }

function texOf(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); cv.__tex = t; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function texMat(tex, opts = {}) { const m = new THREE.MeshLambertMaterial(Object.assign({ map: tex }, opts)); reg(m, 'land'); return m; }

/* a waving flag with a canvas face */
const flagTex = {};
function flagFace(kind) {
  if (flagTex[kind]) return flagTex[kind];
  return (flagTex[kind] = texOf(192, 112, (c, W, H) => {
    if (kind === 'm') { c.fillStyle = BLUE; c.fillRect(0, 0, W, H); drawM(c, W / 2 - 42, 22, 84, MAIZE); }
    else if (kind === 'maize') { c.fillStyle = MAIZE; c.fillRect(0, 0, W, H); drawM(c, W / 2 - 40, 24, 80, BLUE); }
    else if (kind === 'ket') { c.fillStyle = '#123D7A'; c.fillRect(0, 0, W, H); c.fillStyle = '#F2B632'; c.font = '900 70px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KU', W / 2, H / 2 + 4); }
    else if (kind === 'ketdog') { c.fillStyle = '#123D7A'; c.fillRect(0, 0, W, H); goldDog(c, W / 2 - 46, 10, 92, 92); }
    else { c.fillStyle = kind; c.fillRect(0, 0, W, H); }
  }));
}
/* round 27: the Kettering bulldog in gold, drawn once its picture loads (campus flags and poster) */
let dogImg = null; const dogWait = [];
function goldDog(c, x, y, w, h) {
  const draw = () => {
    const ar = dogImg.naturalWidth / dogImg.naturalHeight; let dw = w, dh = w / ar; if (dh > h) { dh = h; dw = h * ar; }
    const t = document.createElement('canvas'); t.width = dogImg.naturalWidth; t.height = dogImg.naturalHeight;
    const x2 = t.getContext('2d'); x2.drawImage(dogImg, 0, 0); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = '#F2B632'; x2.fillRect(0, 0, t.width, t.height);
    c.drawImage(t, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    if (c.canvas.__tex) c.canvas.__tex.needsUpdate = true;
  };
  if (dogImg && dogImg.complete && dogImg.naturalWidth) { draw(); return; }
  dogWait.push(draw);
  if (!dogImg) { dogImg = new Image(); dogImg.onload = () => dogWait.splice(0).forEach(f => f()); dogImg.src = 'assets/road/logos/kettering.png'; }
}
/* a campus poster: the bulldog over KETTERING BULLDOGS, on navy */
export function bulldogPoster(w = 3.2, h = 4.4) {
  const t = texOf(320, 440, (c, W, H) => {
    c.fillStyle = '#123D7A'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#F2B632'; c.lineWidth = 8; c.strokeRect(12, 12, W - 24, H - 24);
    c.fillStyle = '#F2B632'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 40px Inter, Arial, sans-serif'; c.fillText('KETTERING', W / 2, H - 92);
    c.font = '800 30px Inter, Arial, sans-serif'; c.fillText('BULLDOGS', W / 2, H - 52);
    goldDog(c, 40, 40, W - 80, H - 170);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), texMat(t));
}
export function wavingFlag(kind, h = 6, w = 2.4) {
  const pole = mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 6).translate(0, h / 2, 0), mat('objDark'));
  const geo = new THREE.PlaneGeometry(w, w * 0.58, 8, 1).translate(w / 2 + 0.05, h - w * 0.32, 0);
  const cloth = new THREE.Mesh(geo, texMat(flagFace(kind), { side: THREE.DoubleSide }));
  const g = new THREE.Group(); g.add(pole, cloth);
  g.userData.wave = { a: geo.attributes.position, b: geo.attributes.position.array.slice(), w, ph: Math.random() * 6 };
  return g;
}
export function wave(f, t) {
  const q = f.userData.wave; if (!q) return;
  for (let i = 0; i < q.a.count; i++) { const x = q.b[i * 3] / q.w; q.a.setZ(i, Math.sin(x * 5 - t * 4 + q.ph) * 0.22 * x); }
  q.a.needsUpdate = true;
}

/* a flat sign face: colored panel with one line of text */
export function signPanel(text, w, h, bg = '#2F6B4F', fg = '#FFFFFF') {
  const t = texOf(512, Math.round(512 * h / w), (c, W, H) => { c.fillStyle = bg; c.fillRect(0, 0, W, H); c.strokeStyle = fg; c.lineWidth = 6; c.strokeRect(8, 8, W - 16, H - 16); c.fillStyle = fg; let fs = Math.round(H * 0.42); c.font = `800 ${fs}px Inter, Arial, sans-serif`; while (fs > 10 && c.measureText(text).width > W - 56) { fs -= 2; c.font = `800 ${fs}px Inter, Arial, sans-serif`; } c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 2); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), texMat(t)); return m;
}

/* ---------------- landmarks ---------------- */
/* Kettering's Academic Building: the long brick former GM Institute building. */
export function ketteringAB() {
  const k = kit(), BR = '#9E4B36', TR = '#E8E0D2';
  k.box(24, 6.2, 6.5, 0, 0, 0, BR).box(24.4, 0.5, 6.9, 0, 6.2, 0, TR).box(24, 0.35, 6.6, 0, 1.4, 0, TR);
  k.bands(24, 6.5, 0, 1.8, 6.1, 0, 1.45, '#3A3330');
  [-10.5, 10.5].forEach(x => { k.box(4.4, 6.8, 7.6, x, 0, 0, BR).box(4.7, 0.5, 7.9, x, 6.8, 0, TR); });
  // the main entrance: limestone portal with columns and a pediment
  k.box(6.6, 5.2, 1.0, 0, 0, 3.6, TR);
  for (let i = 0; i < 4; i++) k.cyl(0.24, 0.28, 4.4, -2.1 + i * 1.4, 0, 4.25, '#F1EBDF', 10);
  k.box(6.8, 0.6, 1.4, 0, 4.4, 4.2, TR);
  k.add(shapeGeo([[-3.6, 0], [3.6, 0], [0, 1.4]], 1.2).translate(0, 5.0, 3.5), TR);
  k.box(3.2, 1.3, 3, 0, 6.7, 0, TR).cone(2.1, 1.2, 0, 8, 0, '#6E7B8A');
  return k.build();
}
/* The Kettering bulldog on its plinth */
export function bulldog() {
  const k = kit(), BZ = '#7A5B3E', ST = '#C9C2B6';
  k.box(3, 1.3, 2, 0, 0, 0, ST).box(3.2, 0.2, 2.2, 0, 1.3, 0, '#B3AB9E');
  const y = 1.5;
  k.add(new THREE.SphereGeometry(0.9, 14, 8).scale(1.3, 0.85, 0.9).translate(0, y + 1.05, 0), BZ);       // body
  k.add(new THREE.SphereGeometry(0.62, 14, 8).scale(1, 0.9, 1.05).translate(1.15, y + 1.55, 0), BZ);      // head
  k.add(new THREE.BoxGeometry(0.42, 0.34, 0.62).translate(1.68, y + 1.38, 0), BZ);                       // snout
  [[-0.5, -0.45], [-0.5, 0.45], [0.6, -0.45], [0.6, 0.45]].forEach(([x, z]) => k.cyl(0.18, 0.2, 0.9, x, y, z, BZ, 8));
  [-0.32, 0.32].forEach(z => k.add(new THREE.ConeGeometry(0.16, 0.3, 5).translate(0.98, y + 2.12, z), BZ));
  return k.build();
}
/* Michigan Ross: the warm orange building with its glass winter garden */
export function rossBuilding() {
  const k = kit(), OR = '#D86A2E', ORD = '#8E3E17', GL = '#9FBBD0', CAP = '#E9E2D6';
  k.box(17, 8.2, 6.2, 0, 0, 0, OR).box(17.3, 0.4, 6.5, 0, 8.2, 0, CAP);
  k.bands(17, 6.2, 0, 0.8, 8, 0, 1.45, ORD);
  k.box(6.4, 9.4, 13, 6, 0, -8, OR).box(6.7, 0.4, 13.3, 6, 9.4, -8, CAP);
  k.bands(6.4, 13, 6, 0.8, 9.2, -8, 1.45, ORD);
  // orange fins on the street face
  for (let i = 0; i < 9; i++) k.box(0.35, 7.6, 0.5, -7.4 + i * 1.75, 0.3, 3.3, '#E37A3C');
  // the curved glass winter garden on the corner
  const wg = new THREE.CylinderGeometry(4.2, 4.2, 9.6, 24, 1, false, Math.PI, Math.PI).translate(0, 4.8, 0);
  k.add(wg.translate(-8.5, 0, -0.2), GL);
  k.add(new THREE.SphereGeometry(4.2, 24, 8, -Math.PI * 0.5, Math.PI, 0, Math.PI / 2).scale(1, 0.35, 1).translate(-8.5, 9.6, -0.2), '#B7CCDB');
  for (let i = 0; i < 7; i++) { const a = Math.PI * (1 + i / 6); k.box(0.12, 9.6, 0.12, -8.5 + Math.sin(a) * 4.22, 0, -0.2 + Math.cos(a) * 4.22, '#E9E2D6'); }
  k.box(3, 3.2, 0.2, -8.5, 0, 4.05, '#6E8EA8', 0);
  return k.build();
}
/* The bur oak that was moved to make room for the Ross expansion */
export function burOak(s = 1) {
  const k = kit(), BK = '#5A4636';
  k.cyl(0.55 * s, 0.85 * s, 4.2 * s, 0, 0, 0, BK, 10);
  [[-1.6, 3.6, 0.4, 0.4], [1.7, 3.8, -0.3, -0.5], [0.3, 4.4, 1.2, 0.2]].forEach(([x, y, z, r]) => k.add(new THREE.CylinderGeometry(0.22 * s, 0.38 * s, 3.2 * s, 7).rotateZ(-x * 0.45).rotateX(z * 0.3).translate(x * 0.7 * s, y * s, z * 0.5 * s), BK));
  const greens = ['#5F7F4C', '#6C8C55', '#577545', '#76955E'];
  [[0, 7.4, 0, 3.6], [-3.4, 6.6, 0.6, 2.9], [3.3, 6.8, -0.5, 3], [-1.2, 8.6, -1.4, 2.6], [1.6, 8.8, 1.2, 2.5], [-2.6, 5.6, -1.8, 2.2], [2.8, 5.8, 1.9, 2.3], [0.2, 9.8, 0.2, 2]].forEach(([x, y, z, r], i) =>
    k.add(new THREE.IcosahedronGeometry(r * s, 1).scale(1, 0.78, 1).translate(x * s, y * s, z * s), greens[i % greens.length]));
  k.add(new THREE.CylinderGeometry(5.6 * s, 5.8 * s, 0.25, 28).translate(0, 0.12, 0), '#8FA36F');
  return k.build();
}
/* a big block M sign: maize on a blue base */
export function blockMSign(w = 5) {
  const k = kit();
  k.box(w * 1.2, 0.6, 1.4, 0, 0, 0, BLUE);
  k.add(blockMGeo(w * 1.08, 0.5).translate(0, 0.6, -0.05), BLUE);
  k.add(blockMGeo(w, 0.62).translate(0, 0.6 + w * 0.03, 0.02), MAIZE);
  return k.build();
}
/* Michigan Stadium, the Big House: a low bowl dug into the ground */
function bigHouse() {
  const g = new THREE.Group(), k = kit();
  const prof = [[0.58, 0.02], [0.6, 0.06], [0.98, 0.9], [1.03, 0.95], [1.05, 0.7], [1.05, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = new THREE.LatheGeometry(prof, 56).scale(17, 6.2, 12.5);
  k.add(bowl, '#8C97A6');
  k.add(new THREE.LatheGeometry([[0.985, 0.9], [1.035, 0.96], [1.04, 0.95], [0.99, 0.89]].map(([r, y]) => new THREE.Vector2(r, y)), 56).scale(17.05, 6.2, 12.55).translate(0, 0.08, 0), MAIZE);
  for (let i = 1; i < 6; i++) { const r = 0.62 + i * 0.065; k.add(new THREE.TorusGeometry(1, 0.006, 3, 56).rotateX(Math.PI / 2).scale(17 * r, 1, 12.5 * r).translate(0, 6.2 * ((r - 0.6) / 0.38) * 0.9 + 0.12, 0), '#6E7987'); }
  // press box on the far side and the two end scoreboards
  k.box(15, 4.2, 2.6, 0, 5.4, -13.2, '#D9DDE2').box(15.2, 0.3, 2.8, 0, 9.6, -13.2, '#B8C2CD').bands(15, 2.6, 0, 6, 9.4, -13.2, 1.1, '#4A5C70');
  [-1, 1].forEach(s => { k.box(0.4, 5, 0.4, s * 18.2, 0, -1.2, '#6E7B8A').box(0.4, 5, 0.4, s * 18.2, 0, 1.2, '#6E7B8A').box(0.8, 2.8, 5.4, s * 18.2, 5, 0, BLUE); });
  g.add(k.build());
  // the field: green, yard lines, a maize block M at midfield, blue end zones
  const field = texOf(512, 256, (c, W, H) => {
    c.fillStyle = '#4F8A45'; c.fillRect(0, 0, W, H);
    c.fillStyle = BLUE; c.fillRect(0, 0, W * 0.09, H); c.fillRect(W * 0.91, 0, W * 0.09, H);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; for (let i = 0; i <= 10; i++) { const x = W * (0.09 + 0.082 * i); c.beginPath(); c.moveTo(x, 6); c.lineTo(x, H - 6); c.stroke(); }
    drawM(c, W / 2 - 38, H / 2 - 28, 76, MAIZE);
    c.save(); c.fillStyle = MAIZE; c.font = '900 22px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.translate(W * 0.045, H / 2); c.rotate(-Math.PI / 2); c.fillText('MICHIGAN', 0, 0); c.restore();
    c.save(); c.fillStyle = MAIZE; c.font = '900 22px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.translate(W * 0.955, H / 2); c.rotate(Math.PI / 2); c.fillText('MICHIGAN', 0, 0); c.restore();
  });
  const fm = new THREE.Mesh(new THREE.PlaneGeometry(17, 8.5).rotateX(-Math.PI / 2), texMat(field)); fm.position.y = 0.16; fm.receiveShadow = true; g.add(fm);
  const grass = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2).scale(9.9, 1, 7.3), texMat(texOf(4, 4, (c) => { c.fillStyle = '#5A9450'; c.fillRect(0, 0, 4, 4); }))); grass.position.y = 0.1; g.add(grass);
  const sb = texOf(256, 128, (c, W, H) => { c.fillStyle = BLUE; c.fillRect(0, 0, W, H); drawM(c, 18, 26, 96, MAIZE); c.fillStyle = MAIZE; c.font = '900 30px Inter, Arial, sans-serif'; c.textBaseline = 'middle'; c.fillText('GO BLUE', 124, H / 2 + 2); });
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 2.7), texMat(sb)); p.position.set(s * 18.2 + 0.42 * -s * 0 , 6.4, 0); p.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; p.position.x += s > 0 ? -0.42 : 0.42; g.add(p); });
  const pb = texOf(512, 64, (c, W, H) => { c.fillStyle = BLUE; c.fillRect(0, 0, W, H); c.fillStyle = MAIZE; c.font = '900 34px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MICHIGAN STADIUM', W / 2, H / 2 + 2); });
  const pbm = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.6), texMat(pb)); pbm.position.set(0, 10.6, -11.85); g.add(pbm);
  return g;
}
/* Burton Memorial Tower, the campus bell tower */
function burtonTower() {
  const k = kit(), LS = '#D9CFBC';
  k.box(4, 15, 4, 0, 0, 0, LS).box(4.3, 0.4, 4.3, 0, 15, 0, '#C4B9A4');
  for (let i = 0; i < 4; i++) k.box(0.5, 15.4, 0.5, (i % 2 ? 1 : -1) * 1.85, 0, (i < 2 ? 1 : -1) * 1.85, '#CFC4AF');
  k.box(3.4, 3.6, 3.4, 0, 15.4, 0, LS);
  [[0, 1.72], [0, -1.72], [1.72, 0], [-1.72, 0]].forEach(([x, z]) => k.box(z ? 1.6 : 0.1, 2.6, z ? 0.1 : 1.6, x, 15.8, z, '#4A4F55'));
  k.box(3.8, 0.4, 3.8, 0, 19, 0, '#C4B9A4').cone(2.3, 1.4, 0, 19.4, 0, '#7F8B8F');
  k.add(new THREE.CircleGeometry(0.75, 20).translate(0, 13.2, 2.03), '#F3EFE6');
  k.bands(4, 4, 0, 1, 12.5, 0, 1.6, '#5C5A57', 0, 0.4);
  return k.build();
}
function gothic(w, d, h, c = '#CDBFA6', tower = 0) {
  const k = kit();
  k.box(w, h, d, 0, 0, 0, c).box(w + 0.3, 0.35, d + 0.3, 0, h, 0, '#B9AB92');
  k.bands(w, d, 0, 0.8, h, 0, 1.5, '#55524E', 0, 0.6);
  for (let i = 0; i < Math.floor(w / 2.4); i++) k.cone(0.35, 1.1, -w / 2 + 1.2 + i * 2.4, h + 0.35, d / 2, '#B9AB92', 4);
  if (tower) { k.box(3, h + tower, 3, 0, 0, d / 2 - 1.2, c).bands(3, 3, 0, h, h + tower, d / 2 - 1.2, 1.5, '#55524E'); [-1, 1].forEach(a => [-1, 1].forEach(b => k.cone(0.3, 1.4, a * 1.3, h + tower, d / 2 - 1.2 + b * 1.3, '#B9AB92'))); }
  return k.build();
}
/* Detroit: the Renaissance Center on the riverfront */
function renCen() {
  const k = kit(), GL = '#506579', CAP = '#3C4A58', POD = '#6F7C8A';
  k.box(16, 3.2, 16, 0, 0, 0, POD).bands(16, 16, 0, 0.2, 3.2, 0, 1.4, '#3E4A56');
  k.cyl(3.4, 3.4, 29, 0, 0, 0, GL, 28).cbands(3.4, 0, 3.2, 28.5, 0, 0.95, '#33414F', 28);
  k.cyl(3.6, 3.6, 1.2, 0, 27.6, 0, '#7D8C9B', 28).cyl(2.4, 3.2, 1.2, 0, 28.8, 0, CAP, 28);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
    k.cyl(2.3, 2.3, 19, a * 5.1, 0, b * 5.1, GL, 8, Math.PI / 8).cbands(2.3, a * 5.1, 3.2, 18.6, b * 5.1, 0.95, '#33414F', 8);
    k.cyl(2.35, 2.35, 0.6, a * 5.1, 19, b * 5.1, CAP, 8, Math.PI / 8);
  });
  // the shorter pair of towers to the east
  [[10.8, -2.4], [10.8, 3.4]].forEach(([x, z]) => k.box(4, 11, 4, x, 0, z, GL).bands(4, 4, x, 3.2, 11, z, 0.95, '#33414F').box(4.1, 0.4, 4.1, x, 11, z, CAP));
  return k.build();
}
function guardian() {
  const k = kit(), OR = '#C66A3C', ORD = '#6E3A22', TR = '#E2B07E';
  k.box(8, 10, 6, 0, 0, 0, OR).bands(8, 6, 0, 1, 10, 0, 1.1, ORD);
  k.box(6.4, 4.5, 4.6, -0.4, 10, 0, OR).bands(6.4, 4.6, -0.4, 10, 14.5, 0, 1.1, ORD);
  k.cyl(1.3, 1.3, 3.2, -2.3, 14.5, 0, OR, 8).cyl(1.0, 1.3, 1.5, -2.3, 17.7, 0, TR, 8);
  k.cyl(1.1, 1.1, 2.2, 1.9, 14.5, 0, OR, 8).cyl(0.8, 1.1, 1.1, 1.9, 16.7, 0, TR, 8);
  k.box(8.2, 0.3, 6.2, 0, 10, 0, TR);
  return k.build();
}
function penobscot() {
  const k = kit(), LS = '#D2C7B4';
  k.box(6.5, 14, 5.5, 0, 0, 0, LS).bands(6.5, 5.5, 0, 1, 14, 0, 0.9, '#4C4F55');
  k.box(4.8, 4.2, 4, 0, 14, 0, LS).bands(4.8, 4, 0, 14, 18.2, 0, 0.9, '#4C4F55');
  k.box(3.2, 2.6, 2.8, 0, 18.2, 0, LS).box(2, 1.6, 1.8, 0, 20.8, 0, LS).cyl(0.15, 0.15, 1.6, 0, 22.4, 0, '#6E7B8A', 6);
  return k.build();
}
function oneDetroitCenter() {
  const k = kit(), GR = '#BCA88C', GD = '#3C4652';
  k.box(7.6, 19, 6.4, 0, 0, 0, GR).bands(7.6, 6.4, 0, 1, 19, 0, 0.85, GD);
  [-2.6, 0, 2.6].forEach(x => [-1.9, 1.9].forEach(z => k.cone(1.25, 3.2 + (x === 0 ? 1.4 : 0), x, 19, z, GR, 4)));
  k.box(7.7, 0.3, 6.5, 0, 19, 0, '#A69276');
  return k.build();
}
function bookTower() {
  const k = kit(), ST = '#CDB894';
  k.box(5, 12.5, 5, 0, 0, 0, ST).bands(5, 5, 0, 1, 12.5, 0, 0.95, '#4B4A48', 0, 0.5);
  k.cone(3.6, 3.4, 0, 12.5, 0, '#6E9F8C', 4).cyl(0.08, 0.08, 1.4, 0, 15.9, 0, '#6E9F8C', 6);
  return k.build();
}
function joeLouisFist() {
  const k = kit(), BZ = '#6D5338';
  const H = 5.4;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const g = new THREE.CylinderGeometry(0.08, 0.1, Math.hypot(H, 2.8), 6); g.translate(0, Math.hypot(H, 2.8) / 2, 0); g.rotateZ(-a * Math.atan2(2, H) * 0.7); g.rotateX(b * Math.atan2(2, H) * 0.7); g.translate(a * 1.9, 0, b * 1.9); k.add(g, '#55606C'); });
  k.add(new THREE.CylinderGeometry(0.42, 0.5, 4.2, 10).rotateZ(Math.PI / 2).translate(-0.6, 3.4, 0), BZ);
  k.add(new THREE.BoxGeometry(1.4, 1.2, 1.2).translate(1.9, 3.4, 0), BZ);
  k.box(4.6, 0.3, 4.6, 0, 0, 0, '#9AA4B0');
  return k.build();
}
function comerica() {
  const g = new THREE.Group(), k = kit();
  for (let i = 0; i < 10; i++) { const a = -Math.PI * 0.75 + i * (Math.PI * 0.5 / 9); k.box(5.4, 3.2 + (i % 3 === 0 ? 0.8 : 0), 2.4, Math.cos(a + Math.PI / 2) * 15, 0, Math.sin(a + Math.PI / 2) * -15 + 12, '#9BA6B3', -(a + Math.PI / 2) + Math.PI / 2); }
  [[-11, -1], [11, -1], [-6, -10], [6, -10]].forEach(([x, z]) => k.cyl(0.18, 0.22, 10, x, 0, z + 12, '#7E8A97', 6).box(2.2, 1, 0.5, x, 10, z + 12, '#E9EDF2'));
  k.box(7, 3.2, 0.6, 0, 3.4, -2.6, '#2B3440').box(0.4, 3.4, 0.4, -2.8, 0, -2.6, '#6E7B8A').box(0.4, 3.4, 0.4, 2.8, 0, -2.6, '#6E7B8A');
  g.add(k.build());
  const fld = texOf(256, 256, (c, W, H) => { c.fillStyle = '#5A9450'; c.fillRect(0, 0, W, H); c.fillStyle = '#B08560'; c.beginPath(); c.moveTo(W / 2, H - 8); c.arc(W / 2, H - 8, H * 0.62, -Math.PI * 0.75, -Math.PI * 0.25); c.closePath(); c.fill(); c.fillStyle = '#5A9450'; c.save(); c.translate(W / 2, H - 50); c.rotate(Math.PI / 4); c.fillRect(-34, -34, 68, 68); c.restore(); c.fillStyle = '#F3EFE6'; [[0, -12], [-48, -60], [48, -60], [0, -108]].forEach(([x, y]) => c.fillRect(W / 2 + x - 3, H + y - 3, 6, 6)); });
  const f = new THREE.Mesh(new THREE.CircleGeometry(16, 20, Math.PI * 0.25, Math.PI * 0.5).rotateX(-Math.PI / 2), texMat(fld)); f.position.set(0, 0.12, 12);
  const uv = f.geometry.attributes.uv, pp = f.geometry.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + pp.getX(i) / 32, (pp.getZ(i) + 16) / 16 * 0.5 + 0.0);
  g.add(f);
  return g;
}
function fordField() {
  const k = kit();
  k.box(22, 6.5, 14, 0, 0, 0, '#B5BCC4').bands(22, 14, 0, 0.5, 6.4, 0, 1.6, '#55606C', 0, 0.6);
  k.box(22.3, 0.6, 14.3, 0, 6.5, 0, '#0076B6').box(18, 1.4, 11, 0, 7.1, 0, '#D9DDE2');
  return k.build();
}
function foxSign() {
  const g = new THREE.Group(), k = kit();
  k.box(7, 6, 5, 0, 0, 0, '#B79A72').bands(7, 5, 0, 1, 6, 0, 1.2, '#4B4A48', 0, 0.5).box(0.6, 6.5, 1.6, 0, 2.5, 2.9, '#2C3440');
  g.add(k.build());
  const t = texOf(64, 192, (c, W, H) => { c.fillStyle = '#2C3440'; c.fillRect(0, 0, W, H); c.fillStyle = '#F4C34A'; c.font = '900 50px Inter, Arial, sans-serif'; c.textAlign = 'center'; ['F', 'O', 'X'].forEach((ch, i) => c.fillText(ch, W / 2, 56 + i * 58)); });
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 4.6), new THREE.MeshBasicMaterial({ map: t })); p.position.set(s * 0.32, 5.2, 2.9); p.rotation.y = s * Math.PI / 2; g.add(p); });
  return g;
}
function freighter() {
  const k = kit();
  k.box(24, 2, 2.8, 0, -0.4, 0, '#7A2E2A').box(24, 0.25, 2.85, 0, 1.4, 0, '#2B2F35').box(20, 0.5, 2.4, -0.6, 1.6, 0, '#8D3832');
  for (let i = 0; i < 9; i++) k.box(1.6, 0.2, 2, -8.4 + i * 1.9, 2.1, 0, '#3F4650');
  k.box(3.4, 2.6, 2.6, -10, 1.6, 0, '#EEF0F2').bands(3.4, 2.6, -10, 2.2, 4.1, 0, 0.9, '#2E3A48').cyl(0.4, 0.45, 1.6, -11, 4.2, 0, '#2B2F35', 8);
  k.box(1.8, 1.6, 2.4, 10.8, 1.6, 0, '#EEF0F2');
  return k.build();
}
/* Shanghai */
function pearlTower() {
  const k = kit(), PK = '#C2507F', PKD = '#9C3762', CL = '#D9DEE4';
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; k.cyl(0.55, 0.62, 30, Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5, CL, 10); }
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI / 3, L = Math.hypot(6.4, 9.5); const g = new THREE.CylinderGeometry(0.42, 0.5, L, 8).translate(0, L / 2, 0); g.rotateZ(-Math.atan2(5.2, 9.5)); g.rotateY(-a); g.translate(Math.cos(a) * 6.6, 0, Math.sin(a) * 6.6); k.add(g, CL); }
  k.sph(2.7, 0, 9.6, 0, PK, 24);
  k.sph(2.25, 0, 27.4, 0, PK, 24).sph(0.85, 0, 36.4, 0, PK, 16);
  k.cyl(0.9, 1.0, 1.4, 0, 18.6, 0, PKD, 12).cyl(0.8, 0.9, 6, 0, 29.4, 0, CL, 12).cyl(0.45, 0.7, 2, 0, 35.2, 0, CL, 10);
  k.cyl(0.14, 0.36, 9.5, 0, 37.2, 0, CL, 8);
  [[9.6, 2.7], [27.4, 2.25], [36.4, 0.85]].forEach(([y, r]) => { k.add(new THREE.SphereGeometry(r + 0.06, 24, 12).translate(0, y, 0), [0.95, 0.4, 0.7], true); });
  return k.build();
}
function jinMao() {
  const k = kit(), SV = '#A5AFBA', SD = '#56616E';
  let y = 0, w = 5.6;
  for (let i = 0; i < 13; i++) {
    const h = i < 4 ? 5 : (i < 8 ? 3.2 : 2.2);
    k.box(w, h, w, 0, y, 0, SV).bands(w, w, 0, y, y + h, 0, 0.8, SD, Math.PI / 4 * 0);
    k.box(w + 0.6, 0.25, w + 0.6, 0, y + h - 0.1, 0, '#C7CED6');
    y += h; w *= i < 4 ? 0.95 : 0.9;
  }
  k.cyl(0.25, w * 0.55, 3.2, 0, y, 0, SV, 8).cyl(0.06, 0.2, 3.4, 0, y + 3.2, 0, SV, 6);
  return k.build();
}
function swfc() {
  const k = kit(), H = 49, GL = '#93A9BE';
  const s = new THREE.Shape(); s.moveTo(-3.2, 0); s.lineTo(3.2, 0); s.lineTo(1.9, H); s.lineTo(-1.9, H); s.closePath();
  const hole = new THREE.Path(); hole.moveTo(-1.45, H - 5.8); hole.lineTo(1.45, H - 5.8); hole.lineTo(1.2, H - 1.4); hole.lineTo(-1.2, H - 1.4); hole.closePath(); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -3);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const f = 1 - 0.82 * (p.getY(i) / H); p.setZ(i, p.getZ(i) * f); }
  g.computeVertexNormals(); k.add(g, GL);
  for (let y = 1.5; y < H - 7; y += 1.1) { const f = 1 - 0.82 * (y / H), hw = 3.2 - 1.3 * (y / H); const b = new THREE.BoxGeometry(hw * 2 + 0.06, 0.35, 6 * f + 0.06).translate(0, y, 0); k.add(b, '#5D7186'); const v = Math.random() < 0.8 ? 0.95 : 0.15; k.add(new THREE.BoxGeometry(hw * 2 + 0.12, 0.35, 6 * f + 0.12).translate(0, y, 0), [v, v, v * 0.95], true); }
  return k.build();
}
function shanghaiTower() {
  const k = kit(), GL = '#A8C0D0', H = 63, N = 22;
  const tri = new THREE.Shape(); const R = 4.4;
  for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2; const r = R * (1 - 0.13 * Math.cos(3 * a)) - (i === 36 ? 0 : 0); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? tri.lineTo(x, y) : tri.moveTo(x, y); }
  const seg = new THREE.ExtrudeGeometry(tri, { depth: H / N, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2);
  for (let i = 0; i < N; i++) {
    const f = 1 - 0.45 * (i / N) - 0.08 * Math.pow(i / N, 3);
    const g = seg.clone().scale(f, 1, f).rotateY(i * (Math.PI * 0.6 / N)).translate(0, i * H / N, 0);
    k.add(g, GL);
    if (i % 1 === 0) { const b = seg.clone().scale(f * 1.012, 0.14, f * 1.012).rotateY(i * (Math.PI * 0.6 / N)).translate(0, i * H / N + H / N * 0.55, 0); k.add(b, '#6D8496'); const v = Math.random() < 0.85 ? 0.95 : 0.2; k.add(seg.clone().scale(f * 1.03, 0.14, f * 1.03).rotateY(i * (Math.PI * 0.6 / N)).translate(0, i * H / N + H / N * 0.55, 0), [v * 0.85, v * 0.95, v], true); }
  }
  k.add(new THREE.ConeGeometry(R * 0.5, 3.2, 10).translate(0, H + 1.6, 0), '#C8D6E0');
  return k.build();
}
function bund(w, d, h, opt = {}) {
  const k = kit(), ST = opt.c || '#CDBFA7', BS = '#A99B84';
  k.box(w, 1.6, d, 0, 0, 0, BS).box(w, h - 1.6, d, 0, 1.6, 0, ST).box(w + 0.4, 0.35, d + 0.4, 0, h, 0, '#E3D8C4');
  k.bands(w, d, 0, 1.6, h, 0, 1.25, '#3F4247', 0, 0.85);
  for (let i = 0; i < Math.floor(w / 1.3); i++) k.cyl(0.16, 0.18, h - 2.4, -w / 2 + 0.7 + i * 1.3, 1.8, d / 2 + 0.25, '#E8DFCF', 8);
  if (opt.pyr) k.box(w * 0.42, 2, d * 0.5, 0, h, 0, ST).cone(w * 0.32, 3, 0, h + 2, 0, '#3E7B66', 4);
  if (opt.dome) k.cyl(w * 0.16, w * 0.17, 1.4, 0, h, 0, ST, 16).sph(w * 0.16, 0, h + 1.4, 0, '#8D9BA3', 16, 0.9);
  if (opt.clock) { k.box(3, 7, 3, opt.clock, h, 0, ST).bands(3, 3, opt.clock, h, h + 7, 0, 1.4, '#3F4247', 0, 0.5).box(3.3, 0.3, 3.3, opt.clock, h + 7, 0, '#E3D8C4').box(2.2, 2, 2.2, opt.clock, h + 7.3, 0, ST).cone(1.4, 1.6, opt.clock, h + 9.3, 0, '#7F8B8F', 4); k.add(new THREE.CircleGeometry(0.9, 20).translate(opt.clock, h + 5.2, 1.53), '#F3EFE6'); }
  if (opt.hip) k.cone(w * 0.62, 2.6, 0, h, 0, '#4E8A79', 4);
  return k.build();
}
function ringWalk() {
  const k = kit();
  k.add(new THREE.TorusGeometry(5, 0.45, 6, 40).rotateX(Math.PI / 2).translate(0, 3.6, 0), '#D9DEE4');
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.cyl(0.25, 0.25, 3.4, Math.cos(a) * 5, 0, Math.sin(a) * 5, '#B8C2CD', 8); }
  return k.build();
}
function vehicleArch(span = 12) {
  const k = kit(), ST = '#3E4650';
  k.add(new THREE.TorusGeometry(span, 0.2, 6, 40, Math.PI).scale(1, 0.62, 1).rotateY(Math.PI / 2), ST);
  k.add(new THREE.TorusGeometry(span, 0.08, 4, 40, Math.PI).scale(1, 0.62, 1).translate(0, -0.7, 0).rotateY(Math.PI / 2), ST);
  for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI; k.add(new THREE.SphereGeometry(0.16, 6, 4).translate(0, Math.sin(a) * span * 0.62, Math.cos(a) * span), [1, 0.9, 0.6], true); k.sph(0.13, 0, Math.sin(a) * span * 0.62, Math.cos(a) * span, '#F4E6C3', 6); }
  [-1, 1].forEach(s => k.cyl(0.32, 0.4, 0.8, 0, 0, s * span, ST, 8));
  return k.build();
}

/* ---------------- shared instanced shapes ---------------- */
function blockGeo(floors) {
  const parts = [[bx(1, 1, 1), 1], [bx(1.04, 0.025, 1.04, 0, 0.975, 0), 0.72]];
  for (let i = 0; i < floors; i++) parts.push([bx(1.012, 0.42 / floors, 1.012, 0, (i + 0.32) / floors, 0), 0.46]);
  return merge(parts);
}
function litGeo(floors) {
  const parts = []; for (let i = 0; i < floors; i++) parts.push([bx(1.02, 0.42 / floors, 1.02, 0, (i + 0.32) / floors, 0), 1]);
  return merge(parts);
}
function octGeo(floors) {
  const parts = [[cy(0.5, 0.5, 1, 0, 0, 0, 8), 1], [cy(0.52, 0.52, 0.025, 0, 0.975, 0, 8), 0.72]];
  for (let i = 0; i < floors; i++) parts.push([cy(0.506, 0.506, 0.42 / floors, 0, (i + 0.32) / floors, 0, 8), 0.46]);
  return merge(parts);
}
function octLitGeo(floors) {
  const parts = []; for (let i = 0; i < floors; i++) parts.push([cy(0.512, 0.512, 0.42 / floors, 0, (i + 0.32) / floors, 0, 8), 1]);
  return merge(parts);
}
const houseGeo = () => merge([[bx(1, 0.62, 0.84), 1], [new THREE.CylinderGeometry(0.01, 0.74, 0.42, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.82).translate(0, 0.83, 0), 0.62]]);
/* a gable roof house: box plus a triangular prism along x */
function gableGeo() {
  const r = new THREE.BufferGeometry(), h = 0.5, w = 0.56, d = 0.48, y0 = 0.62;
  const v = [
    -w, y0, -d, w, y0, -d, w, y0 + h, 0, -w, y0, -d, w, y0 + h, 0, -w, y0 + h, 0,
    -w, y0, d, -w, y0 + h, 0, w, y0 + h, 0, -w, y0, d, w, y0 + h, 0, w, y0, d,
    -w, y0, -d, -w, y0 + h, 0, -w, y0, d, w, y0, -d, w, y0, d, w, y0 + h, 0
  ];
  r.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); r.computeVertexNormals();
  return merge([[bx(1, 0.62, 0.84), 1], [r, 0.58], [bx(0.16, 0.5, 0.16, 0.26, 0.7, -0.2), 0.7]]);
}
const treeGeo = () => merge([[cy(0.12, 0.16, 1.1, 0, 0, 0, 6), [0.36, 0.28, 0.22]], [new THREE.IcosahedronGeometry(1, 0).scale(1, 0.9, 1).translate(0, 1.7, 0), 1]]);
const personGeo = () => merge([[cy(0.2, 0.24, 1.05, 0, 0, 0, 6), 1], [new THREE.SphereGeometry(0.2, 8, 6).translate(0, 1.27, 0), [0.92, 0.8, 0.7]]]);
const tentGeo = () => merge([[bx(0.08, 1.9, 0.08, -1.2, 0, -1.2), 0.5], [bx(0.08, 1.9, 0.08, 1.2, 0, -1.2), 0.5], [bx(0.08, 1.9, 0.08, -1.2, 0, 1.2), 0.5], [bx(0.08, 1.9, 0.08, 1.2, 0, 1.2), 0.5], [new THREE.ConeGeometry(1.8, 0.9, 4).rotateY(Math.PI / 4).translate(0, 2.3, 0), 1], [bx(2.5, 0.25, 2.5, 0, 1.75, 0), 1]]);
const POLE = [0.3, 0.33, 0.37];
const lampGeo = () => merge([[cy(0.06, 0.08, 3.4, 0, 0, 0, 6), POLE], [bx(0.16, 0.1, 0.9, 0, 3.32, 0.35), POLE]]);
const lampLitGeo = () => merge([[new THREE.SphereGeometry(0.28, 8, 6).translate(0, 3.2, 0.7), 1]]);
/* a signal pole on a corner with its arm reaching over the road (+z) */
const signalGeo = () => merge([[cy(0.09, 0.11, 4.6, 0, 0, 0, 6), POLE], [bx(0.14, 0.14, 5.2, 0, 4.4, 2.6), POLE], [bx(0.42, 1.0, 0.34, 0, 3.55, 4.6), [0.22, 0.24, 0.28]], [bx(0.44, 0.24, 0.36, 0, 4.25, 4.6), [0.95, 0.35, 0.3]], [bx(0.44, 0.24, 0.36, 0, 3.95, 4.6), [0.98, 0.78, 0.3]], [bx(0.44, 0.24, 0.36, 0, 3.65, 4.6), [0.35, 0.8, 0.5]]]);
const pierGeo = () => merge([[bx(1, 1, 1), 0.86]]);
const cableGeo = () => merge([[cy(0.05, 0.05, 1, 0, 0, 0, 4), 0.9]]);
const benchGeo = () => merge([[bx(1.4, 0.12, 0.45, 0, 0.4, 0), [0.62, 0.5, 0.4]], [bx(0.1, 0.4, 0.4, -0.6, 0, 0), POLE], [bx(0.1, 0.4, 0.4, 0.6, 0, 0), POLE]]);

function instanced(geo, list, material, shadow = true) {
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(geo, material, list.length), o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((q, i) => { o.position.set(q.x, q.y || 0, q.z); o.rotation.set(q.rx || 0, q.ry || 0, q.rz || 0); o.scale.set(q.sx || q.s || 1, q.sy || q.s || 1, q.sz || q.s || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); const t = q.c ? (Array.isArray(q.c) ? q.c : C3(q.c)) : [1, 1, 1]; im.setColorAt(i, c.setRGB(t[0] * (q.k || 1), t[1] * (q.k || 1), t[2] * (q.k || 1))); });
  if (shadow) { im.castShadow = true; im.receiveShadow = true; }
  return im;
}

/* ---------------- polylines ---------------- */
function chaikin(p, n) {
  for (let k = 0; k < n; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; q.push(a.map((v, j) => v * 0.75 + b[j] * 0.25), a.map((v, j) => v * 0.25 + b[j] * 0.75)); }
    q.push(p[p.length - 1]); p = q;
  }
  return p;
}
function resample(p, step) {
  const out = [p[0].slice()]; let need = step;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let t = need;
    while (t <= L + 1e-9) { const f = L ? t / L : 0; out.push(a.map((v, j) => v + (b[j] - v) * f)); t += step; }
    need = t - L;
  }
  const last = p[p.length - 1], pl = out[out.length - 1];
  if (Math.hypot(last[0] - pl[0], last[1] - pl[1]) > step * 0.3) out.push(last.slice());
  return out;
}
function segDist(px, pz, ax, az, bx2, bz) {
  const vx = bx2 - ax, vz = bz - az, L = vx * vx + vz * vz;
  const t = L ? clamp(((px - ax) * vx + (pz - az) * vz) / L, 0, 1) : 0;
  return Math.hypot(px - ax - vx * t, pz - az - vz * t);
}

/* ---------------- planning: which cities, where ----------------
   Every city is laid out in the road's own frame: dx along the road from
   the stop, u away from it (u > 0 behind the road, u < 0 toward the camera).
   Streets: p = [[dx, u]] (elevated: [[dx, u, height]]), w = width,
   k = ave | st | ped | path. Streets that reach the road get a crossing. */
const SPEC = {
  kettering: { id: 'flint', x0: -72, x1: 84, uN: -46, uF: 150 },
  ross: { id: 'annarbor', x0: -66, x1: 72, uN: -46, uF: 150 },
  /* round 16: GM starts at the leadership program, so Detroit and the RenCen start there too (the HQ side of downtown) */
  /* round 28: the first GM stop is Warren and the Tech Center, so downtown Detroit now starts past it */
  'customer-experience': { id: 'detroit', plan: 'detroithq', hq: true, x0: -30, x1: 46, uN: -15, uF: 158, river: [16, 50] },
  equinox: { id: 'detroit', x0: -56, x1: 132, uN: -15, uF: 158, river: [16, 50], to: 'trailblazer-encore' },
  shanghai: { id: 'shanghai', x0: -66, x1: 68, uN: -46, uF: 128, gap: [38, 70] }
};
const PLANS = {
  flint: {
    waters: [{ p: [[-96, 90], [-50, 85], [-10, 90], [30, 84], [60, 88], [96, 85]], w: 9, name: 'Flint River', at: [-34, 87] }],
    streets: [
      { p: [[-72, 47], [-30, 46], [0, 45.5], [40, 47], [84, 50]], w: 3.4, k: 'ave', name: 'University Ave', cars: 4, peds: 8 },
      { p: [[36, 8], [36, 40], [34, 80], [30, 120], [28, 150]], w: 3.6, k: 'ave', name: 'Saginaw St', cars: 4, bus: 1, peds: 10 },
      { p: [[-55, 8], [-53, 40], [-60, 75], [-70, 112], [-72, 130]], w: 3.2, k: 'ave', name: 'Chevrolet Ave', cars: 3 },
      { p: [[-50, 106], [0, 110], [70, 104], [84, 104]], w: 2.8, k: 'st', cars: 2 },
      { p: [[-40, 128], [10, 130], [70, 122], [84, 121]], w: 2.8, k: 'st', cars: 2 },
      { p: [[8, 95], [7, 150]], w: 2.8, k: 'st', cars: 1 },
      { p: [[-18, 96], [-24, 150]], w: 2.8, k: 'st', cars: 1 },
      { p: [[-72, -24], [-30, -22], [10, -25], [50, -21], [84, -24]], w: 3, k: 'st', name: 'Court St', cars: 3, peds: 4 },
      { p: [[-38, -8], [-37, -24], [-43, -46]], w: 2.8, k: 'st', cars: 1 },
      { p: [[10, -8], [11, -25], [5, -46]], w: 2.8, k: 'st', cars: 1 },
      { p: [[54, -8], [52, -21], [60, -46]], w: 2.8, k: 'st', cars: 1 },
      { p: [[-24, -23], [-17, -33], [0, -39], [24, -37], [32, -23]], w: 2.6, k: 'st' },
      { p: [[-66, -46, 5], [-66, -24, 5.6], [-66, 0, 5.8], [-66, 40, 5.6], [-66, 80, 6.2], [-66, 150, 5.4]], w: 6.5, elev: true, curve: false, name: 'I-475', cars: 6, shield: '475' },
      { p: [[-112, 12.2, 0.05], [-92, 13, 1.2], [-79, 17, 3.4], [-71, 25, 5.1], [-67.5, 33, 5.6]], w: 3.4, elev: true, ramp: true, cars: 1 },
      { p: [[-67.5, -33, 5.6], [-71, -25, 5.1], [-79, -17, 3.4], [-92, -13, 1.2], [-112, -12.2, 0.05]], w: 3.4, elev: true, ramp: true, cars: 1 }
    ],
    parks: [{ c: [-30, 97], r: [26, 4.5], name: 'Riverbank Park' }, { c: [-58, -34], r: [8, 6] }, { c: [-4, 62], r: [8, 6] }],
    zone(dx, u) { if (u < 0) return 'res'; if (u < 44) return 'mix'; if (u < 82) return 'campus'; return dx > -34 ? 'dt' : 'res'; },
    pal: { dt: ['#9E4B36', '#A85A40', '#B87B5C', '#C9B79C', '#8E5B4A', '#D3C6B0'], res: ['#D9CBB4', '#C9B79C', '#B9C3CC', '#E4DCCB', '#A9B6A0', '#C98F6E'], mix: ['#A85A40', '#C9B79C', '#B87B5C', '#D3C6B0'], campus: ['#9E4B36', '#A35A43', '#C9B79C'] },
    tall(dx, u) { return u > 82 && dx > -34 ? 1 : 0.4; }
  },
  annarbor: {
    waters: [{ p: [[-96, -30], [-40, -27], [0, -33], [40, -28], [96, -32]], w: 8, name: 'Huron River', at: [-48, -29] }],
    streets: [
      { p: [[-66, 51], [-40, 50], [-8, 52.5], [22, 54], [46, 56], [72, 58]], w: 3.4, k: 'ave', name: 'Stadium Blvd', cars: 4, peds: 30, fans: true },
      { p: [[-60, 8], [-58, 40], [-57, 80], [-60, 120], [-58, 150]], w: 3.4, k: 'ave', name: 'State St', cars: 4, bus: 1, peds: 12 },
      { p: [[56, 8], [56, 40], [54, 80], [58, 120], [60, 150]], w: 3.4, k: 'ave', name: 'Main St', cars: 4, peds: 8 },
      { p: [[33, 8], [39, 30], [50, 52]], w: 2.8, k: 'st', name: 'Packard St', cars: 2 },
      { p: [[-66, 113], [-30, 114], [0, 111], [30, 104], [50, 98], [58, 97]], w: 3, k: 'st', name: 'N University Ave', cars: 3, peds: 8 },
      { p: [[-66, 140], [0, 142], [72, 138]], w: 2.8, k: 'st', cars: 2 },
      { p: [[-50, 57], [-26, 68], [-6, 82]], w: 1.6, k: 'path', curve: false, peds: 10 },
      { p: [[-50, 84], [-26, 68], [-6, 57]], w: 1.6, k: 'path', curve: false, peds: 10 },
      { p: [[-26, 68], [-27, 97]], w: 1.6, k: 'path', curve: false, peds: 6 },
      { p: [[-66, -17], [-20, -18], [30, -16], [72, -18]], w: 3, k: 'st', name: 'Geddes Ave', cars: 3, peds: 4 },
      { p: [[-30, -8], [-30, -46]], w: 3, k: 'st', cars: 2 },
      { p: [[40, -8], [42, -46]], w: 3, k: 'st', cars: 2 },
      { p: [[2, -19], [3, -44]], w: 1.8, k: 'path', curve: false, peds: 5 },
      { p: [[-66, -42], [-20, -44], [20, -41], [72, -43]], w: 2.8, k: 'st', name: 'Gallup Park Dr', cars: 2 }
    ],
    parks: [{ c: [-29, 80], r: [21, 25], name: 'Central Campus' }, { c: [6, -38], r: [24, 5.5], name: 'Gallup Park' }, { c: [-50, -38], r: [10, 4] }],
    zone(dx, u) { if (u < 0) return 'res'; if (u < 47) return 'mix'; if (dx < -6 && u < 112) return 'campus'; if (u > 100) return 'res'; return 'mix'; },
    pal: { mix: ['#A0533D', '#B5654A', '#C9B79C', '#D8CDB9', '#8E5B4A', '#B9A88F'], res: ['#E4DCCB', '#D9CBB4', '#B9C3CC', '#C98F6E', '#A9B6A0', '#F0E9DA'], campus: ['#B0644A', '#CDBFA6', '#A0533D'], dt: ['#A0533D', '#C9B79C'] },
    tall() { return 0.35; }
  },
  detroit: {
    streets: [
      { p: [[-56, 44], [0, 44], [70, 44.5], [132, 44]], w: 3.2, k: 'st', name: 'Congress St', cars: 3, peds: 6 },
      { ring: [-8, 82, 7.2], w: 3, k: 'st', cars: 2 },
      { p: [[-8, 44], [-8, 74.6]], w: 3.6, k: 'ave', curve: false, cars: 2, bus: 1 },
      { p: [[-8, 89.4], [-6, 120], [-2, 158]], w: 3.6, k: 'ave', name: 'Woodward Ave', cars: 4, bus: 1, peds: 12 },
      { p: [[-14.2, 85.6], [-40, 100], [-60, 114]], w: 3.4, k: 'ave', name: 'Michigan Ave', cars: 3, peds: 6 },
      { p: [[-11.8, 88.2], [-26, 112], [-40, 140], [-50, 158]], w: 3.4, k: 'ave', name: 'Grand River Ave', cars: 3, peds: 6 },
      { p: [[-2.2, 86.6], [16, 104], [44, 130], [64, 158]], w: 3.4, k: 'ave', name: 'Gratiot Ave', cars: 3, bus: 1, peds: 6 },
      { p: [[30, 8], [30, 44], [32, 90], [36, 158]], w: 3, k: 'st', name: 'Brush St', cars: 3, peds: 4 },
      { p: [[62, 8], [62, 158]], w: 3, k: 'st', cars: 3, peds: 4 },
      { p: [[-52, 8], [-52, 44], [-53, 70], [-48, 104]], w: 3, k: 'st', name: 'Washington Blvd', cars: 2 },
      { p: [[-56, 146], [0, 147], [60, 148], [132, 150]], w: 3, k: 'st', cars: 2 },
      { p: [[66, 70], [132, 72]], w: 2.8, k: 'st', cars: 2 },
      { p: [[-50, -11, 0.1], [-50, -17, 3.4], [-50, -22, 6.2], [-50, -48, 6.2], [-50, -54, 3.6], [-50, -64, 0.6]], w: 5, elev: true, curve: false, bridge: 'suspension', name: 'Ambassador Bridge', cars: 4 }
    ],
    parks: [{ c: [-8, 82], r: [4.6, 4.6], name: 'Campus Martius' }, { c: [-4, 132], r: [11, 6], name: 'Grand Circus Park' }, { c: [-40, 27], r: [9, 7], plaza: true, name: 'Hart Plaza' }],
    zone(dx, u) { if (u < 0) return 'none'; return u > 140 ? 'res' : 'dt'; },
    pal: { dt: ['#C9B79C', '#B7A58A', '#8E9AA7', '#6F7C8A', '#A35A43', '#D3C6B0', '#5F7084'], mix: ['#C9B79C', '#A35A43', '#B7A58A'], res: ['#A35A43', '#C9B79C', '#D9CBB4'] },
    tall(dx, u) { const d = Math.hypot(dx + 4, (u - 86) * 0.9); return clamp(1.05 - d / 70, 0.25, 0.95); }
  },
  /* filled in below from the Detroit plan: same downtown streets, no bridge, a little more to the west */
  detroithq: null,
  shanghai: {
    streets: [
      { p: [[-66, 36.5], [66, 36.5]], w: 2.6, k: 'ped', curve: false, peds: 16 },
      { p: [[-40, 8], [-40, 36]], w: 3, k: 'st', curve: false, cars: 2, peds: 4 },
      { p: [[34, 8], [34, 36]], w: 3, k: 'st', curve: false, cars: 2, peds: 4 },
      { p: [[56, 8], [56, 36]], w: 3, k: 'st', curve: false, cars: 2 },
      { p: [[-33.5, -8], [-33.5, -46]], w: 3.4, k: 'ped', curve: false, name: 'Nanjing Rd', peds: 46 },
      { p: [[-66, -26.5], [0, -27.5], [68, -26.5]], w: 3, k: 'st', cars: 4, peds: 8 },
      { p: [[-10, -27], [-12, -46]], w: 2.8, k: 'st', cars: 1 },
      { p: [[30, -27], [32, -46]], w: 2.8, k: 'st', cars: 1 },
      { p: [[-66, -40], [0, -41], [68, -42]], w: 2.8, k: 'st', cars: 2 },
      { p: [[12, 71.5], [68, 71.5]], w: 2.4, k: 'ped', curve: false, peds: 10 },
      { p: [[-66, 71.5], [-24, 71.5]], w: 2.4, k: 'ped', curve: false, peds: 6 },
      { p: [[4, 74], [36, 83.5], [68, 92]], w: 4, k: 'ave', name: 'Century Ave', cars: 5, bus: 1, peds: 6 },
      { p: [[-24, 84], [-20, 100], [-4, 113], [20, 117], [42, 110], [52, 96], [54, 86]], w: 3.2, k: 'st', cars: 3, peds: 4 },
      { p: [[-40, 74], [-40, 128]], w: 3, k: 'st', curve: false, cars: 2 },
      { p: [[-58, 101], [-56, 128]], w: 3.4, k: 'ave', cars: 2 },
      { p: [[-66, 122], [68, 124]], w: 3, k: 'st', cars: 2 },
      { p: [[-58, -46, 4.6], [-58, -30, 6], [-58, -8, 6.6], [-58, 20, 6.6], [-58, 34, 7.6], [-58, 41, 8.6], [-58, 67, 8.6], [-58, 76, 7.4], [-58, 88, 3.6], [-58, 100, 0.1]], w: 6, elev: true, bridge: 'stayed', name: "Yan'an Elevated Rd", cars: 8, bus: 1 },
      { p: [[-95, -12.2, 0.05], [-80, -13, 1.4], [-68, -17, 3.8], [-61.5, -25, 5.8], [-59.5, -33, 6]], w: 3.4, elev: true, ramp: true, cars: 1 },
      { p: [[-59.5, 30, 7.2], [-61.5, 22, 6.2], [-68, 15, 3.8], [-80, 12.8, 1.4], [-95, 12.2, 0.05]], w: 3.4, elev: true, ramp: true, cars: 1 }
    ],
    parks: [{ c: [2, 100], r: [8, 7], name: 'Lujiazui Central Green' }, { c: [40, 28], r: [5, 4] }],
    zone(dx, u) { if (u > 68) return 'cbd'; return 'dt'; },
    pal: { dt: ['#D9D2C4', '#C9BDA8', '#B7C4D1', '#E3DED5', '#A9B8C8', '#CFC6B6'], cbd: ['#C9D3DD', '#A9B8C8', '#8FA2B6', '#D9DEE4', '#B7C4D1', '#7F93A8'] },
    tall(dx, u) { if (u > 68) return clamp(1.4 - Math.abs(dx - 10) / 60, 0.45, 1.4); return 0.42; }
  }
};
/* round 28: clipped to start 30 past the Warren stop, so the Tech Center has its own ground */
const HQ_X0 = -30;
function clipW(p) { const q = p.filter(v => v[0] >= HQ_X0); if (q.length && q[0][0] > HQ_X0 && p[0][0] < HQ_X0) q.unshift([HQ_X0].concat(q[0].slice(1))); return q; }
PLANS.detroithq = Object.assign({}, PLANS.detroit, {
  streets: PLANS.detroit.streets.filter(st => !st.bridge).map(st => st.p ? Object.assign({}, st, { p: clipW(st.p) }) : st).filter(st => !st.p || st.p.length > 1),
  parks: PLANS.detroit.parks.map(pk => pk.name === 'Hart Plaza' ? Object.assign({}, pk, { c: [-19, 27], r: [8, 7] }) : pk)
});

export function planCities(stops) {
  const out = [];
  stops.forEach(s => {
    const sp = SPEC[s.id] || (s.scene === 'shanghai' ? SPEC.shanghai : null);
    if (!sp) return;
    const c = Object.assign({ stop: s, cx: s.x }, sp);
    c.X0 = s.x + sp.x0; c.X1 = s.x + sp.x1;
    c.plan = PLANS[sp.plan || sp.id];
    c.waters = (c.plan.waters || []).map(wt => {
      const pts = resample(chaikin(wt.p, 3), 2).map(([dx, u]) => { const x = s.x + dx; return [x, roadZ(x) - u]; });
      const hw = wt.w / 2; let a = Infinity, b = -Infinity, e = Infinity, f = -Infinity;
      pts.forEach(([x, z]) => { a = Math.min(a, x); b = Math.max(b, x); e = Math.min(e, z); f = Math.max(f, z); });
      return { pts, hw, bb: [a - hw - 3, b + hw + 3, e - hw - 3, f + hw + 3] };
    });
    let rx0 = sp.x0, rx1 = sp.x1; (c.plan.streets || []).forEach(st => st.elev && st.p.forEach(q => { rx0 = Math.min(rx0, q[0]); rx1 = Math.max(rx1, q[0]); }));
    c.R0 = s.x + rx0; c.R1 = s.x + rx1;
    let zmin = Infinity; for (let x = c.X0; x <= c.X1; x += 2) zmin = Math.min(zmin, roadZ(x));
    c.zN = zmin - 46; c.zF = roadZ(s.x) - sp.uF;
    out.push(c);
  });
  const tr = stops.find(s => s.id === 'traverse'); if (tr) GMTC.x = tr.x;
  return out;
}
/* For the terrain: 0..1 weight of a flat city floor at (x, z), both sides of the road */
export function cityFlat(cities, x, z) {
  let f = 0;
  for (const c of cities) {
    if (x < c.X0 - 14 || x > c.X1 + 14) continue;
    const wx = smooth(c.X0 - 14, c.X0, x) * (1 - smooth(c.X1, c.X1 + 14, x));
    const u = roadZ(x) - z;
    let wu = smooth(c.uN - 10, c.uN, u) * (1 - smooth(c.uF, c.uF + 14, u));
    if (c.gap) wu *= 1 - smooth(c.gap[0] - 1, c.gap[0] + 3, u) * (1 - smooth(c.gap[1] - 3, c.gap[1] + 1, u));
    f = Math.max(f, wx * wu);
  }
  return Math.max(f, 1 - smooth(CTC.r - 8, CTC.r + 6, ctcDist(x, z)), gmtcFlat(x, z));
}
export function cityRiver(cities, x, dz) {
  for (const c of cities) {
    if (!c.river || x < c.X0 - 10 || x > c.X1 + 10) continue;
    const wx = smooth(c.X0 - 10, c.X0 + 2, x) * (1 - smooth(c.X1 - 2, c.X1 + 10, x));
    return wx * smooth(c.river[0] - 2, c.river[0] + 3, dz) * (1 - smooth(c.river[1] - 3, c.river[1] + 2, dz));
  }
  return 0;
}
/* rivers that wind through a city (Flint River, Huron River): 0..1 depth weight */
export function cityWater(cities, x, z) {
  let w = 0;
  for (const c of cities) {
    if (!c.waters || !c.waters.length || x < c.X0 - 40 || x > c.X1 + 40) continue;
    for (const r of c.waters) {
      if (x < r.bb[0] || x > r.bb[1] || z < r.bb[2] || z > r.bb[3]) continue;
      let d = Infinity; const P = r.pts;
      for (let i = 0; i < P.length - 1; i++) { if (Math.abs(P[i][0] - x) > r.hw + 6) continue; d = Math.min(d, segDist(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1])); }
      w = Math.max(w, 1 - smooth(r.hw - 1.6, r.hw + 1.2, d));
    }
  }
  return w;
}
/* keep the world's own scattered props out of the cities, on both sides */
export function cityKeepOut(cities, x, z) {
  if (ctcDist(x, z) < CTC.r) return true;
  if (gmtcFlat(x, z) > 0.5) return true;
  for (const c of cities) {
    if ((x >= c.R0 - 4 && x < c.X0 - 4) || (x > c.X1 + 4 && x <= c.R1 + 4)) { if (Math.abs(roadZ(x) - z) < 22) return true; continue; }
    if (x < c.X0 - 4 || x > c.X1 + 4) continue;
    const u = roadZ(x) - z;
    if (u > c.uN - 4 && u < c.uF + 4) return true;
    if (c.river) { const dz = -u; if (dz > c.river[0] - 3 && dz < c.river[1] + 4) return true; }
  }
  return false;
}
export function cityFootprints() {}

/* ---------------- building the cities ---------------- */
const SH = { asphalt: [0.62, 0.66, 0.71], walk: [0.88, 0.88, 0.87], dash: [0.98, 0.96, 0.86], brick: [0.83, 0.72, 0.62], path: [0.88, 0.85, 0.77], green: [0.7, 0.8, 0.64], plaza: [0.9, 0.88, 0.84], lot: [0.72, 0.75, 0.78], zebra: [0.98, 0.98, 0.96], rail: [0.8, 0.83, 0.86], girder: [0.66, 0.7, 0.75] };
const CURB = 10.4;
const TOWN_DEBUG = typeof location !== 'undefined' && /townDebug/.test(location.search);
const CARS = {
  flint: ['sedan', 'pickup', 'suv', 'sedan'],
  annarbor: ['sedan', 'compact', 'suv', 'sedan'],
  detroit: ['sedan', 'suv', 'pickup', 'sedan'],
  shanghai: ['robotaxi', 'taxi', 'compact', 'robotaxi']
};
const CAR_COLORS = ['#E3E8EE', '#8C97A6', '#4A5563', '#B8C2CD', '#D9DDE2', '#2E3A48', '#9E4B36', '#123D7A'];
const PEOPLE = ['#E3E8EE', '#4A5563', '#C9693C', '#2563EB', '#8C97A6', '#D9B46A', '#5E7D5A'];


/* ---------------- Chrysler Technology Center, Auburn Hills ----------------
   The HQ tower that drivers see from I-75, with the Pentastar on its crown,
   on its low engineering wings, plus an I-75 shield by the road. */
export const CTC = { x: 458, u: 58, r: 36, sign: 449 };
/* round 28: flat ground behind the Warren stop for the GM Global Technical Center and,
   behind it, the Milford Proving Ground (stage x from -13 to 42, depth 28 to 96) */
export const GMTC = { x: null, a: -13, b: 42, u0: 28, u1: 96 };
function gmtcFlat(x, z) {
  if (GMTC.x == null) return 0;
  const dx = x - GMTC.x, u = roadZ(x) - z;
  if (dx < GMTC.a - 6 || dx > GMTC.b + 6 || u < GMTC.u0 - 8 || u > GMTC.u1 + 8) return 0;
  return smooth(GMTC.a - 6, GMTC.a, dx) * (1 - smooth(GMTC.b, GMTC.b + 6, dx)) * smooth(GMTC.u0 - 8, GMTC.u0, u) * (1 - smooth(GMTC.u1, GMTC.u1 + 8, u));
}
function ctcDist(x, z) { const u = roadZ(x) - z; return Math.hypot(x - CTC.x, u - CTC.u); }
/* round 26: the lit blue banner on the CTC tower, with the Pentastar at its top:
   a white pentagon split by a star into five blue triangles, like the real sign */
function pentastarBannerTex() {
  return texOf(160, 512, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2F7FE6'); g.addColorStop(0.5, '#2268CC'); g.addColorStop(1, '#1A4F9E');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.10)'; for (let x = 10; x < W; x += 22) c.fillRect(x, 0, 2, H);
    const R = W * 0.4, cx = W / 2, cy = W * 0.5, ri = R * Math.cos(Math.PI * 2 / 5) / Math.cos(Math.PI / 5);
    const P = i => [cx + R * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / 5), cy + R * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / 5)];
    const I = i => [cx + ri * Math.cos(-Math.PI / 2 + Math.PI / 5 + i * 2 * Math.PI / 5), cy + ri * Math.sin(-Math.PI / 2 + Math.PI / 5 + i * 2 * Math.PI / 5)];
    c.beginPath(); for (let i = 0; i < 5; i++) c[i ? 'lineTo' : 'moveTo'](...P(i)); c.closePath();
    c.fillStyle = '#FFFFFF'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#FFFFFF'; c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = P(i), b = P((i + 1) % 5), m = I(i);
      const sh = (q, k) => [m[0] + (q[0] - m[0]) * k, m[1] + (q[1] - m[1]) * k];
      c.beginPath(); c.moveTo(...sh(a, 0.9)); c.lineTo(...sh(b, 0.9)); c.lineTo(...m); c.closePath();
      c.fillStyle = '#123F8F'; c.fill();
    }
  });
}
function shieldTex(num) {
  return texOf(200, 216, (c, W, H) => {
    const path = (k) => { const s = (x, y) => [W / 2 + (x - W / 2) * k, 8 + (y - 8) * k]; c.beginPath(); c.moveTo(...s(8, 16)); c.quadraticCurveTo(...s(52, 2), ...s(100, 18)); c.quadraticCurveTo(...s(148, 2), ...s(192, 16)); c.lineTo(...s(192, 92)); c.bezierCurveTo(...s(192, 162), ...s(130, 192), ...s(100, 208)); c.bezierCurveTo(...s(70, 192), ...s(8, 162), ...s(8, 92)); c.closePath(); };
    path(1); c.fillStyle = '#FFFFFF'; c.fill();
    c.save(); path(0.9); c.clip(); c.fillStyle = '#1F4E9C'; c.fillRect(0, 0, W, H); c.fillStyle = '#C8102E'; c.fillRect(0, 0, W, 66); c.fillStyle = '#FFFFFF'; c.fillRect(0, 64, W, 5); c.restore();
    c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '800 21px Inter, Arial, sans-serif'; c.fillText('INTERSTATE', W / 2, 45);
    c.font = '800 88px Inter, Arial, sans-serif'; c.fillText(num, W / 2, 128);
  });
}
function chryslerTower() {
  const k = kit(), GL = '#34465C', GLB = '#26354A', FR = '#9AA6B4', CN = '#CDD3DA', CN2 = '#B5BDC7';
  // site pad and the front parking lot
  k.box(64, 0.12, 50, -10, 0, -2, '#D7DBE0');
  k.box(30, 0.14, 13, -14, 0, 15.5, '#AEB5BE');
  for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) if ((i * 7 + r * 3) % 5) {
    const col = ['#E3E8EE', '#4A5563', '#8C97A6', '#B9C3CC', '#6E7B8A', '#A0533D'][(i + r * 2) % 6];
    k.box(1.6, 0.9, 0.85, -24 + i * 3.2, 0.14, 11.5 + r * 3.6, col).box(1.0, 0.5, 0.8, -24 + i * 3.2, 1.04, 11.5 + r * 3.6, col);
  }
  // the low engineering wings and the glass atrium
  k.box(52, 8.6, 10, -14, 0, -13, CN).box(52.4, 0.5, 10.4, -14, 8.6, -13, CN2).bands(52, 10, -14, 0.8, 8.4, -13, 2.1, '#4E5A68');
  k.box(10, 8.6, 30, -34, 0, -2, CN).box(10.4, 0.5, 30.4, -34, 8.6, -2, CN2).bands(10, 30, -34, 0.8, 8.4, -2, 2.1, '#4E5A68');
  k.box(12, 11, 12, -22, 0, -4, '#9FBBD0').box(12.3, 0.4, 12.3, -22, 11, -4, FR);
  for (let i = -2; i <= 2; i++) k.box(0.18, 11, 12.1, -22 + i * 2.4, 0, -4, FR);
  // the test track behind the wings
  k.add(new THREE.RingGeometry(10, 12.4, 44).rotateX(-Math.PI / 2).scale(2.0, 1, 1).translate(-12, 0.18, -30), '#9AA3AE');
  // the HQ tower: dark glass, light corner fins, window bands and a stepped crown
  const tx = 8, tz = 6, TW = 10, TH = 16;
  k.box(16, 3.2, 15, tx, 0, tz, CN).box(16.4, 0.4, 15.4, tx, 3.2, tz, FR);
  k.box(TW, TH, TW, tx, 0, tz, GL).bands(TW, TW, tx, 3.6, TH - 0.4, tz, 1.4, GLB, 0, 0.7);
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => k.box(0.9, TH + 0.6, 0.9, tx + a * (TW / 2 - 0.2), 0, tz + b * (TW / 2 - 0.2), FR));
  [-1, 1].forEach(a => { k.box(0.5, TH, 0.3, tx + a * 2.2, 3.2, tz + TW / 2 + 0.05, FR); k.box(0.3, TH, 0.5, tx + TW / 2 + 0.05, 3.2, tz + a * 2.2, FR); });
  // the crown: a cornice and a dark glass pyramid roof, like the real CTC tower
  k.box(TW + 0.4, 0.5, TW + 0.4, tx, TH, tz, FR);
  k.cone((TW - 0.2) / Math.SQRT2, 4.6, tx, TH + 0.5, tz, GLB).cyl(0.07, 0.1, 1.8, tx, TH + 5.0, tz, '#6E7B8A', 6);
  const g = k.build();
  // round 26: like the real tower, a tall lit blue banner down the face, with the Pentastar
  // at its top just under the crown, on the faces toward I-75 and the road
  const bm = new THREE.MeshBasicMaterial({ map: pentastarBannerTex(), side: THREE.DoubleSide });
  const bw = 3.6, bh = bw * 512 / 160, by = TH - 0.25 - bh / 2;
  const b1 = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), bm); b1.position.set(tx, by, tz + TW / 2 + 0.12); g.add(b1);
  const b2 = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), bm); b2.rotation.y = Math.PI / 2; b2.position.set(tx + TW / 2 + 0.12, by, tz); g.add(b2);
  // a flag at the entrance
  const fk = kit(); fk.cyl(0.07, 0.09, 7, tx - 9.5, 0, tz + 5.5, '#C9CED6', 6); g.add(fk.build());
  return g;
}
function i75Sign() {
  const g = new THREE.Group(), k = kit();
  k.cyl(0.12, 0.14, 6.2, -1.4, 0, 0, '#7D8794', 8).cyl(0.12, 0.14, 6.2, 1.4, 0, 0, '#7D8794', 8);
  g.add(k.build());
  const sm = texMat(shieldTex('75'), { transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.7), sm); sh.position.set(0, 6.6, 0.18); g.add(sh);
  const gs = signPanel('Auburn Hills', 4.6, 1.3, '#1F6B45', '#FFFFFF'); gs.position.set(0, 4.6, 0.18); g.add(gs);
  return g;
}

export function buildCities(scene, cities, { height, lite, stops, stageBoxes = [] }) {
  mats();
  const R = rand(31);
  const built = [];
  const yAt = (x, z) => Math.max(0, height(x, z)) + 0.02;
  const SURF = mat('land', { vertexColors: true, side: THREE.DoubleSide });

  cities.forEach(c => {
    const g = new THREE.Group(); g.name = 'city-' + c.id;
    const near = new THREE.Group(); g.add(near); // details that hide in the wide view
    const anim = { flags: [], people: [], cars: [], movers: [], labels: [] };
    const S = c.stop.x, P = c.plan;
    const blocks = { low: [], mid: [], tall: [] }, octs = { mid: [], tall: [] }, houses = [], gables = [], trees = [], tents = [], lamps = [], signals = [], piers = [], cables = [], benches = [], lots = [];

    /* ---------- the occupancy grid, in the road's frame ---------- */
    const GX0 = c.x0, GU0 = c.uN, NC = Math.ceil(c.x1 - c.x0), NR = Math.ceil(c.uF - c.uN);
    const FREE = 0, ROAD = 1, STREET = 2, WALK = 3, BLOCK = 4, WATER = 5, BLDG = 6, PARK = 7, DECK = 8;
    const grid = new Uint8Array(NC * NR), sid = new Int16Array(NC * NR).fill(-1), ang = new Float32Array(NC * NR).fill(NaN);
    const cell = (dx, u) => { const i = Math.floor(dx - GX0), j = Math.floor(u - GU0); return (i < 0 || j < 0 || i >= NC || j >= NR) ? -1 : j * NC + i; };
    const get = (dx, u) => { const k = cell(dx, u); return k < 0 ? 255 : grid[k]; };
    const W = (dx, u) => { const x = S + dx; return [x, roadZ(x) - u]; };
    const yL = (dx, u) => { const [x, z] = W(dx, u); return yAt(x, z); };
    const rotY = (dx, tx, tu) => { const wx = tx, wz = roadDZ(S + dx) * tx - tu; return Math.atan2(-wz, wx); };
    // visit points covering a rotated rectangle (a: along, b: across); ra = local angle of the "along" axis
    function rect(dx, u, w, d, ra, fn) {
      const ca = Math.cos(ra), sa = Math.sin(ra), na = Math.max(1, Math.ceil(w / 0.7)), nb = Math.max(1, Math.ceil(d / 0.7));
      for (let i = 0; i <= na; i++) for (let j = 0; j <= nb; j++) { const a = -w / 2 + w * i / na, b = -d / 2 + d * j / nb; if (fn(dx + a * ca - b * sa, u + a * sa + b * ca) === false) return false; }
      return true;
    }
    const isFree = (dx, u, w, d, ra = 0) => rect(dx, u, w, d, ra, (a, b) => get(a, b) === FREE);
    const mark = (dx, u, w, d, ra, v) => rect(dx, u, w, d, ra, (a, b) => { const k = cell(a, b); if (k >= 0) grid[k] = v; });
    for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) {
      const dx = GX0 + i + 0.5, u = GU0 + j + 0.5, k = j * NC + i;
      if (Math.abs(u) < CURB + 0.4) { grid[k] = ROAD; ang[k] = 0; continue; }
      const [x, z] = W(dx, u);
      if (height(x, z) < -0.35) grid[k] = WATER;
      if (Math.abs(u) < 24) ang[k] = 0;
    }
    // stage objects: never build over them
    // stage objects and the open ground between them and the road: keep it clear
    stageBoxes.forEach(b => {
      if (b.isEmpty() || b.max.x < S + GX0 - 2 || b.min.x > S + c.x1 + 2) return;
      for (let x = Math.max(b.min.x - 3, S + GX0); x <= Math.min(b.max.x + 3, S + c.x1); x += 0.7) {
        const rz = roadZ(x), uA = CURB, uB = Math.min(rz - (b.min.z - 2), 48);
        for (let u = uA; u <= uB; u += 0.7) { const k = cell(x - S, u); if (k >= 0 && grid[k] !== ROAD) grid[k] = BLOCK; }
      }
    });

    /* ---------- streets ---------- */
    const streets = [];
    function addStreet(spec) {
      let p;
      if (spec.ring) { const [cx, cu, r] = spec.ring; p = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; p.push([cx + Math.cos(a) * r, cu + Math.sin(a) * r]); } }
      else { p = spec.p.map(q => q.slice()); if (spec.curve !== false && p.length > 2) p = chaikin(p, 3); }
      const pts = resample(p, 1);
      const st = Object.assign({}, spec, { pts, id: streets.length, w: spec.w || 3.2 });
      st.t = pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; });
      st.walk = (st.k === 'ped' || st.k === 'path' || st.elev) ? 0 : 1.2;
      streets.push(st);
      const hw = st.w / 2;
      pts.forEach((q, i) => {
        const [tx, tu] = st.t[i], A = Math.atan2(tu, tx);
        for (let o = -(hw + st.walk + 12); o <= hw + st.walk + 12; o += 0.5) {
          const px = q[0] - tu * o, pu = q[1] + tx * o, k = cell(px, pu);
          if (k < 0) continue;
          const ao = Math.abs(o);
          if (ao > hw + st.walk) { if (isNaN(ang[k]) && !st.elev && st.k !== 'path') ang[k] = A; continue; }
          const v = grid[k];
          if (st.elev) { if ((q[2] || 0) > 0.6 && (v === FREE || v === PARK || v === WALK)) grid[k] = DECK; else if (v === FREE || v === PARK || v === WALK) { grid[k] = STREET; sid[k] = st.id; } continue; }
          if (ao <= hw) { if (v === FREE || v === WALK || v === PARK || v === BLDG) { grid[k] = STREET; sid[k] = st.id; } else if (v === STREET && sid[k] !== st.id) sid[k] = -2; }
          else if (v === FREE || v === PARK) grid[k] = WALK;
        }
      });
      return st;
    }
    (P.streets || []).forEach(addStreet);
    // parks and plazas
    const parkList = (P.parks || []).map(pk => {
      const [px, pu] = pk.c, [rx, ru] = pk.r;
      for (let a = -rx; a <= rx; a += 0.5) for (let b = -ru; b <= ru; b += 0.5) { if ((a * a) / (rx * rx) + (b * b) / (ru * ru) > 1) continue; const k = cell(px + a, pu + b); if (k >= 0 && grid[k] === FREE) grid[k] = PARK; }
      return pk;
    });

    /* ---------- landmarks claim their ground ---------- */
    const placeAt = (obj, x, u, ry = 0, parent = g) => { const z = roadZ(x) - u; obj.position.set(x, yAt(x, z), z); obj.rotation.y = ry; parent.add(obj); return obj; };
    const placeZ = (obj, x, z, ry = 0, parent = g) => { obj.position.set(x, yAt(x, z), z); obj.rotation.y = ry; parent.add(obj); return obj; };
    const take = (x, z, w, d) => {
      const dx = x - S, u = roadZ(x) - z; let hit = 0;
      rect(dx, u, w + 2, d + 2, 0, (a, b) => { const k = cell(a, b); if (k < 0) return; if (grid[k] === STREET) hit++; if (grid[k] !== ROAD) grid[k] = BLOCK; });
      if (hit > 4 && TOWN_DEBUG) console.warn('[town] landmark over a street', c.id, Math.round(dx), Math.round(u), hit);
    };
    const free = (x, z, w, d) => isFree(x - S, roadZ(x) - z, w, d);
    const tag = (text, obj, y) => { const l = label(text, { size: 18, key: 'ink', bg: 'card', scale: 0.62, weight: 700 }); l.position.set(obj.position.x, obj.position.y + y, obj.position.z); l.material.opacity = 0; near.add(l); anim.labels.push({ l, x: obj.position.x }); return l; };
    const tagAt = (text, x, y, z, small) => { const l = label(text, { size: small ? 15 : 18, key: 'ink', bg: 'card', scale: small ? 0.5 : 0.62, weight: small ? 600 : 700 }); l.position.set(x, y, z); l.material.opacity = 0; near.add(l); anim.labels.push({ l, x, k: small ? 0.85 : 1 }); return l; };
    const lm = (obj, x, u, w, d, ry = 0, name, ty) => { placeAt(obj, x, u, ry); take(x, roadZ(x) - u, w, d); if (name) tag(name, obj, ty); return obj; };

    /* ---------- city by city: the landmarks ---------- */
    if (c.id === 'flint') {
      const mott = kit(); mott.box(6.5, 17, 6, 0, 0, 0, '#D6CCBA').bands(6.5, 6, 0, 1.2, 17, 0, 1.05, '#4D4B48').box(5, 2.4, 4.6, 0, 17, 0, '#D6CCBA').box(5.3, 0.3, 4.9, 0, 19.4, 0, '#C2B6A0');
      lm(mott.build(), S + 20, 118, 7, 6.5, 0, 'Mott Foundation Building', 22);
      const cit = kit(); cit.box(7, 12, 7, 0, 0, 0, '#8C5A46').bands(7, 7, 0, 1, 12, 0, 1.05, '#3A3330').box(7.3, 0.3, 7.3, 0, 12, 0, '#C9B79C');
      lm(cit.build(), S + 46, 115, 7.5, 7.5);
      const at = kit(); for (let i = 0; i < 14; i++) { const a = Math.PI * (0.1 + 0.8 * i / 13); at.box(3.4, 2.6, 2, Math.cos(a) * 11, 0, -Math.sin(a) * 8, '#9E4B36', Math.PI / 2 - a); }
      const atg = at.build(); const fld = new THREE.Mesh(new THREE.PlaneGeometry(16, 9).rotateX(-Math.PI / 2), texMat(texOf(8, 4, (q) => { q.fillStyle = '#5A9450'; q.fillRect(0, 0, 8, 4); }))); fld.position.set(0, 0.1, -3.5); atg.add(fld);
      lm(atg, S + 58, 68, 24, 18, 0, 'Atwood Stadium', 5);
      const mc = kit(); mc.box(12, 5.4, 7, 0, 0, 0, '#A35A43').box(6, 5.8, 0.3, -2, 0, 3.6, '#9FBBD0').bands(12, 7, 0, 0.6, 5.4, 0, 1.3, '#3A3330').box(12.3, 0.3, 7.3, 0, 5.4, 0, '#E8E0D2');
      lm(mc.build(), S + 14, 56, 12, 7, 0);
      const cc = kit(); cc.box(10, 4.4, 8, 0, 0, 0, '#9E4B36').bands(10, 8, 0, 0.6, 4.4, 0, 1.3, '#3A3330').box(10.3, 0.3, 8.3, 0, 4.4, 0, '#E8E0D2');
      lm(cc.build(), S - 18, 62, 10, 8, 0);
      // the Vehicle City arches over the road, as on Saginaw Street
      [26, 46, 58, 70].forEach((dx, i) => { const a = vehicleArch(11.6); placeZ(a, S + dx, roadZ(S + dx), 0); if (i === 1 || i === 3) { const l = label('VEHICLE CITY', { size: 22, key: 'ink', bg: 'card', scale: 0.66, weight: 800 }); l.position.set(S + dx, 8.4, roadZ(S + dx)); g.add(l); } });
      for (let i = 0; i < 6; i++) { const f = wavingFlag(i % 2 ? 'ketdog' : 'ket', 5.2, 1.6); placeAt(f, S - 28 + i * 9.5, 49.8); near.add(f); anim.flags.push(f); }
      for (let i = 0; i < (lite ? 20 : 40); i++) anim.people.push({ x0: S - 30 + R() * 60, z: roadZ(S) - 50 - R() * 14, dx: (R() - 0.5) * 18, sp: 0.04 + R() * 0.05, ph: R(), c: R() < 0.3 ? '#123D7A' : (R() < 0.5 ? '#F2B632' : '#E3E8EE') });
      // a student parking lot
      lots.push([S - 38, 56, 18, 9]); mark(-38, 56, 18, 9, 0, BLDG);
    }
    if (c.id === 'annarbor') {
      lm(bigHouse(), S + 16, 76, 38, 30, 0, 'Michigan Stadium: the Big House', 12);
      lm(burtonTower(), S - 10, 65, 4.5, 4.5, 0, 'Burton Memorial Tower', 22.5);
      lm(gothic(12, 8, 7, '#CDBFA6', 4), S - 46, 71, 12, 8, 0, 'Michigan Union', 13);
      lm(gothic(16, 7, 6.4, '#B3AA9A', 5), S - 32, 103, 16, 7, 0, 'Law Quad', 13);
      const hill = kit(); hill.box(10, 6.8, 9, 0, 0, 0, '#B0644A').bands(10, 9, 0, 1, 6.8, 0, 1.5, '#3A3330', 0, 0.5); for (let i = 0; i < 4; i++) hill.cyl(0.3, 0.32, 5, -2.4 + i * 1.6, 0, 4.8, '#E8E0D2', 10); hill.box(7, 0.7, 1.6, 0, 5, 4.6, '#E8E0D2');
      lm(hill.build(), S - 12, 90, 10, 10, 0, 'Hill Auditorium', 9);
      const diag = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32).rotateX(-Math.PI / 2), texMat(texOf(128, 128, (q, Wq, Hq) => { q.fillStyle = '#D7CFC0'; q.fillRect(0, 0, Wq, Hq); q.strokeStyle = '#B9AE9B'; q.lineWidth = 6; q.beginPath(); q.arc(64, 64, 50, 0, 7); q.stroke(); drawM(q, 34, 43, 60, '#B8913A'); })));
      placeAt(diag, S - 26, 68); diag.position.y += 0.14; mark(-26, 68, 8.6, 8.6, 0, BLDG); tag('The Diag and the block M', diag, 3);
      const BX = S + 16, BZ = roadZ(S + 16) - 76;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const f = wavingFlag(i % 2 ? 'm' : 'maize', 7.5, 2.8); placeZ(f, BX + Math.cos(a) * 21, BZ + Math.sin(a) * 16.5); near.add(f); anim.flags.push(f); }
      [-34, -22, 30, 42, 54].forEach((dx, i) => { const f = wavingFlag(i % 2 ? 'maize' : 'm', 6, 2.2); placeZ(f, S + dx, roadZ(S + dx) - 11.4); near.add(f); anim.flags.push(f); });
      c.tailgate = [BX, BZ];
    }
    if (c.id === 'detroit' && c.hq) {
      lm(renCen(), S - 14, 62, 22, 18, 0, 'Renaissance Center · GM headquarters', 32);
      lm(guardian(), S + 8, 86, 8.5, 6.5, 0, 'Guardian Building', 20);
      const pen = lm(penobscot(), S - 22, 112, 7, 6, 0, 'Penobscot Building', 25);
      const bea = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshBasicMaterial({ color: '#E5484D' })); bea.position.set(pen.position.x, pen.position.y + 24.2, pen.position.z); g.add(bea); anim.movers.push({ beacon: bea });
      lm(oneDetroitCenter(), S + 30, 100, 8, 7, 0, 'One Detroit Center', 26);
      lm(bookTower(), S - 20, 120, 5.5, 5.5, 0, 'Book Tower', 19);
      const cobo = kit(); cobo.box(26, 4.6, 12, 0, 0, 0, '#B8C2CD').bands(26, 12, 0, 0.4, 4.6, 0, 1.4, '#55606C', 0, 0.6).box(26.3, 0.3, 12.3, 0, 4.6, 0, '#D9DDE2');
      lm(cobo.build(), S + 28, 56, 26, 12, 0, 'Huntington Place', 7);
      const pm = kit(), lp = [[-20, 72], [26, 72], [26, 116], [-20, 116]];
      const PM = lp.map(([dx, u]) => [S + dx, roadZ(S) - u]);
      for (let e = 0; e < 4; e++) { const [ax, az] = PM[e], [bx2, bz] = PM[(e + 1) % 4]; const L = Math.hypot(bx2 - ax, bz - az); pm.add(new THREE.BoxGeometry(L, 0.5, 1).translate(0, 5, 0).rotateY(-Math.atan2(bz - az, bx2 - ax)).translate((ax + bx2) / 2, 0, (az + bz) / 2), '#C3CAD2'); for (let q = 0; q < L; q += 8) { const f = q / L; pm.cyl(0.25, 0.3, 5, lerp(ax, bx2, f), 0, lerp(az, bz, f), '#9AA4B0', 6); } }
      g.add(pm.build());
      const train = kit(); train.box(5, 1.5, 1.2, 0, 0, 0, '#E9EDF2').box(5.05, 0.3, 1.25, 0, 0.6, 0, '#2563EB').bands(5, 1.2, 0, 0, 1.4, 0, 1.4, '#3E4A56');
      const tr = train.build(); g.add(tr); anim.movers.push({ loop: PM, obj: tr, s: 0.5, y: 5.5 });
      const fr = freighter(); g.add(fr); anim.movers.push({ ship: fr, x0: c.X0 - 10, x1: c.X1 + 10, dz: 33, s: 0.6, v: 0.012 });
      for (let x = c.X0 + 2; x < c.X1; x += 7) { const lmp = kit(); lmp.cyl(0.07, 0.09, 3.2, 0, 0, 0, '#3E4650', 6).sph(0.22, 0, 3.3, 0, '#F4E6C3', 8); lmp.add(new THREE.SphereGeometry(0.3, 8, 6).translate(0, 3.3, 0), [1, 0.85, 0.55], true); placeZ(lmp.build(), x, roadZ(x) + 12.6, 0, near); if ((x | 0) % 2) trees.push({ x: x + 3.5, z: roadZ(x) + 13.4, s: 0.9, c: '#6F8E62' }); }
      for (let i = 0; i < (lite ? 20 : 40); i++) { const x = c.X0 + R() * (c.X1 - c.X0); anim.people.push({ x0: x, z: roadZ(x) + 11.6 + R() * 2.4, dx: (R() < 0.5 ? -1 : 1) * 30, sp: 0.01 + R() * 0.02, ph: R(), c: PEOPLE[(R() * PEOPLE.length) | 0], road: true }); }
    }
    if (c.id === 'detroit' && !c.hq) {
      lm(renCen(), S + 10, 60, 22, 18, 0, 'Renaissance Center', 32);
      lm(guardian(), S - 28, 80, 8.5, 6.5, 0, 'Guardian Building', 20);
      const pen = lm(penobscot(), S - 36, 108, 7, 6, 0, 'Penobscot Building', 25);
      const bea = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshBasicMaterial({ color: '#E5484D' })); bea.position.set(pen.position.x, pen.position.y + 24.2, pen.position.z); g.add(bea); anim.movers.push({ beacon: bea });
      lm(oneDetroitCenter(), S + 20, 92, 8, 7, 0, 'One Detroit Center', 26);
      lm(bookTower(), S - 20, 120, 5.5, 5.5, 0);
      lm(comerica(), S + 92, 112, 32, 24, 0, 'Comerica Park', 12);
      lm(fordField(), S + 120, 129, 23, 15, 0, 'Ford Field', 11);
      lm(foxSign(), S + 72, 88, 8, 6, 0, 'Fox Theatre', 10);
      const fist = joeLouisFist(); placeZ(fist, S + 46, roadZ(S + 46) + 12.4, 0.3); near.add(fist); tag('Monument to Joe Louis', fist, 7);
      const cobo = kit(); cobo.box(26, 4.6, 12, 0, 0, 0, '#B8C2CD').bands(26, 12, 0, 0.4, 4.6, 0, 1.4, '#55606C', 0, 0.6).box(26.3, 0.3, 12.3, 0, 4.6, 0, '#D9DDE2');
      lm(cobo.build(), S - 34, 56, 26, 12, 0, 'Huntington Place', 7);
      // the People Mover loop above downtown
      const pm = kit(), lp = [[-20, 72], [26, 72], [26, 116], [-20, 116]];
      const PM = lp.map(([dx, u]) => [S + dx, roadZ(S) - u]);
      for (let e = 0; e < 4; e++) { const [ax, az] = PM[e], [bx2, bz] = PM[(e + 1) % 4]; const L = Math.hypot(bx2 - ax, bz - az); pm.add(new THREE.BoxGeometry(L, 0.5, 1).translate(0, 5, 0).rotateY(-Math.atan2(bz - az, bx2 - ax)).translate((ax + bx2) / 2, 0, (az + bz) / 2), '#C3CAD2'); for (let q = 0; q < L; q += 8) { const f = q / L; pm.cyl(0.25, 0.3, 5, lerp(ax, bx2, f), 0, lerp(az, bz, f), '#9AA4B0', 6); } }
      g.add(pm.build());
      const train = kit(); train.box(5, 1.5, 1.2, 0, 0, 0, '#E9EDF2').box(5.05, 0.3, 1.25, 0, 0.6, 0, '#2563EB').bands(5, 1.2, 0, 0, 1.4, 0, 1.4, '#3E4A56');
      const tr = train.build(); g.add(tr); anim.movers.push({ loop: PM, obj: tr, s: 0, y: 5.5 });
      const fr = freighter(); g.add(fr); anim.movers.push({ ship: fr, x0: c.X0 - 10, x1: c.X1 + 10, dz: 33, s: 0.3, v: 0.012 });
      const fr2 = freighter(); fr2.scale.setScalar(0.7); g.add(fr2); anim.movers.push({ ship: fr2, x0: c.X0 - 10, x1: c.X1 + 10, dz: 42, s: 0.8, v: -0.018 });
      // the Riverwalk: lamps, trees and people
      for (let x = c.X0 + 2; x < c.X1; x += 7) { if (Math.abs(x - (S - 50)) < 5) continue; const lmp = kit(); lmp.cyl(0.07, 0.09, 3.2, 0, 0, 0, '#3E4650', 6).sph(0.22, 0, 3.3, 0, '#F4E6C3', 8); lmp.add(new THREE.SphereGeometry(0.3, 8, 6).translate(0, 3.3, 0), [1, 0.85, 0.55], true); placeZ(lmp.build(), x, roadZ(x) + 12.6, 0, near); if ((x | 0) % 2) trees.push({ x: x + 3.5, z: roadZ(x) + 13.4, s: 0.9, c: '#6F8E62' }); }
      for (let i = 0; i < (lite ? 30 : 60); i++) { const x = c.X0 + R() * (c.X1 - c.X0); anim.people.push({ x0: x, z: roadZ(x) + 11.6 + R() * 2.4, dx: (R() < 0.5 ? -1 : 1) * 30, sp: 0.01 + R() * 0.02, ph: R(), c: PEOPLE[(R() * PEOPLE.length) | 0], road: true }); }
    }
    if (c.id === 'shanghai') {
      lm(pearlTower(), S - 12, 74, 14, 14, 0, 'Oriental Pearl Tower', 48);
      lm(jinMao(), S + 8, 90, 7, 7, 0, 'Jin Mao Tower', 46);
      lm(swfc(), S + 20, 104, 7, 7, 0, 'Shanghai World Financial Center', 51);
      lm(shanghaiTower(), S + 32, 98, 10, 10, 0, 'Shanghai Tower', 67);
      lm(ringWalk(), S - 2, 77, 11, 11, 0);
      // the Bund on the near bank, between the road and the camera
      const B = [[-43, 13, { pyr: 1 }, 'Peace Hotel'], [-27, 9, {}], [-17, 9, { c: '#D4C8B4' }], [-7, 9, {}], [3, 10, { c: '#D4C8B4' }], [14, 9, {}], [25, 12, { clock: 3.4 }, 'Custom House'], [38, 13, { dome: 1 }, 'HSBC Building'], [51, 10, {}], [62, 11, { c: '#D4C8B4' }]];
      B.forEach(([dx, w, opt, name]) => { const b = bund(w - 0.8, 6, opt.clock ? 6 : (opt.pyr ? 6.2 : 5.6), opt); placeZ(b, S + dx, roadZ(S + dx) + 18.5, 0, near); take(S + dx, roadZ(S + dx) + 18.5, w - 2.6, 4.6); if (name) tag(name, b, opt.clock ? 17 : 11); });
      for (let i = 0; i < 4; i++) { const bt = kit(); bt.box(8, 1.2, 2.2, 0, -0.3, 0, i % 2 ? '#E9EDF2' : '#C2507F').box(5, 1.4, 1.8, -0.4, 0.9, 0, '#E9EDF2').bands(5, 1.8, -0.4, 0.9, 2.3, 0, 0.7, '#3E4A56'); const b = bt.build(); g.add(b); anim.movers.push({ ship: b, x0: c.X0 - 20, x1: c.X1 + 20, dz: -(48 + (i % 2) * 8), s: i / 4, v: (i % 2 ? 1 : -1) * (0.008 + i * 0.002) }); }
    }

    /* ---------- surfaces: streets, sidewalks, bridges, decks, parks ---------- */
    const SP = [], SC = [];
    const quad = (a, b, d, e, col) => { SP.push(...a, ...b, ...d, ...a, ...d, ...e); for (let i = 0; i < 6; i++) SC.push(col[0], col[1], col[2]); };
    const wp = (dx, u, y) => { const [x, z] = W(dx, u); return [x, y, z]; };
    const paths = []; // for traffic and walkers: {P: [[x,y,z]], cum, L}
    const mkPath = pts => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2])); return { P: pts, cum, L: cum[cum.length - 1] }; };
    const crossings = [];

    // parks and plazas: a soft patch of green (or paving), trees and benches
    parkList.forEach(pk => {
      const [px, pu] = pk.c, [rx, ru] = pk.r, col = pk.plaza ? SH.plaza : SH.green, N = 28;
      for (let i = 0; i < N; i++) {
        const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
        const c0 = wp(px, pu, yL(px, pu) + 0.07), p0 = wp(px + Math.cos(a0) * rx, pu + Math.sin(a0) * ru, 0), p1 = wp(px + Math.cos(a1) * rx, pu + Math.sin(a1) * ru, 0);
        p0[1] = Math.max(0.02, yL(px + Math.cos(a0) * rx, pu + Math.sin(a0) * ru)) + 0.07; p1[1] = Math.max(0.02, yL(px + Math.cos(a1) * rx, pu + Math.sin(a1) * ru)) + 0.07;
        if (get(px + Math.cos((a0 + a1) / 2) * rx * 0.7, pu + Math.sin((a0 + a1) / 2) * ru * 0.7) === WATER) continue;
        SP.push(...c0, ...p0, ...p1); for (let k = 0; k < 3; k++) SC.push(col[0], col[1], col[2]);
      }
      const nT = Math.round(rx * ru * (pk.plaza ? 0.04 : 0.14));
      for (let i = 0; i < nT; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.9; const tx = px + Math.cos(a) * rx * r, tu = pu + Math.sin(a) * ru * r; if (get(tx, tu) !== PARK) continue; const [x, z] = W(tx, tu); trees.push({ x, z, s: 0.75 + R() * 0.5, c: R() < 0.3 ? '#7E9B6A' : '#6F8E62' }); grid[cell(tx, tu)] = BLDG; }
      for (let i = 0; i < Math.round(rx * ru * 0.03); i++) { const a = R() * Math.PI * 2, r = 0.5 + R() * 0.4; const tx = px + Math.cos(a) * rx * r, tu = pu + Math.sin(a) * ru * r; if (get(tx, tu) !== PARK) continue; const [x, z] = W(tx, tu); benches.push({ x, z, ry: -a }); }
      for (let i = 0; i < (lite ? 3 : 7) * (pk.plaza ? 2 : 1); i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.8; const tx = px + Math.cos(a) * rx * r, tu = pu + Math.sin(a) * ru * r; const [x, z] = W(tx, tu); anim.people.push({ x0: x, z, dx: (R() - 0.5) * 3, sp: 0.02 + R() * 0.02, ph: R(), c: PEOPLE[(R() * PEOPLE.length) | 0] }); }
      if (pk.name) { const [x, z] = W(px, pu); tagAt(pk.name, x, yL(px, pu) + 3.2, z, true); }
    });

    streets.forEach(st => {
      const n = st.pts.length, hw = st.w / 2, T = st.t;
      const at = (i, o) => [st.pts[i][0] - T[i][1] * o, st.pts[i][1] + T[i][0] * o];
      if (st.elev) {
        // an elevated road: deck, girders, parapets, piers, and its bridge if it has one
        const ys = st.pts.map(q => Math.max(yL(q[0], q[1]) + 0.12, q[2] || 0));
        const deckCol = SH.asphalt, sideCol = SH.girder, rail = SH.rail;
        for (let i = 0; i < n - 1; i++) {
          const a = at(i, -hw), b = at(i, hw), d = at(i + 1, hw), e = at(i + 1, -hw), y0 = ys[i], y1 = ys[i + 1];
          quad(wp(a[0], a[1], y0), wp(b[0], b[1], y0), wp(d[0], d[1], y1), wp(e[0], e[1], y1), deckCol);
          if (i % 3 === 0 && !st.ramp) { const m0 = at(i, 0), m1 = at(i + 1, 0); const l0 = [m0[0] - T[i][1] * 0.07, m0[1] + T[i][0] * 0.07], r0 = [m0[0] + T[i][1] * 0.07, m0[1] - T[i][0] * 0.07], l1 = [m1[0] - T[i][1] * 0.07, m1[1] + T[i][0] * 0.07], r1 = [m1[0] + T[i][1] * 0.07, m1[1] - T[i][0] * 0.07]; quad(wp(l0[0], l0[1], y0 + 0.02), wp(r0[0], r0[1], y0 + 0.02), wp(r1[0], r1[1], y1 + 0.02), wp(l1[0], l1[1], y1 + 0.02), SH.dash); }
          const lift = Math.min(y0, y1) - Math.max(yL(a[0], a[1]), 0);
          if (lift > 0.35) [[a, e], [b, d]].forEach(([p0, p1]) => {
            quad(wp(p0[0], p0[1], y0), wp(p1[0], p1[1], y1), wp(p1[0], p1[1], y1 - 0.75), wp(p0[0], p0[1], y0 - 0.75), sideCol);
            quad(wp(p0[0], p0[1], y0), wp(p1[0], p1[1], y1), wp(p1[0], p1[1], y1 + 0.5), wp(p0[0], p0[1], y0 + 0.5), rail);
          });
        }
        for (let i = 4; i < n - 2; i += 9) {
          const q = st.pts[i], gy = yL(q[0], q[1]), [qx, qz] = W(q[0], q[1]), wet = height(qx, qz) < -0.3, base = wet ? -1.3 : gy, top = ys[i] - 0.75;
          if (top - base < 1.4 || Math.abs(q[1]) < CURB + 0.8) continue;
          if (get(q[0], q[1]) === BLOCK) continue;
          const [x, z] = W(q[0], q[1]);
          piers.push({ x, y: base, z, sx: 1, sy: top - base, sz: st.w * 0.55, ry: rotY(q[0], T[i][0], T[i][1]) });
        }
        if (st.bridge) buildBridge(st, ys);
        if (st.shield) { const q = st.pts[(n * 0.38) | 0]; const [x, z] = W(q[0], q[1]); const s = signPanel('I-' + st.shield, 3.2, 1.6, '#1F4E9C', '#FFFFFF'); s.position.set(x + 4.2, ys[(n * 0.38) | 0] + 2.2, z); near.add(s); }
        if (st.name) { const i = (n * (st.bridge ? 0.55 : 0.3)) | 0, q = st.pts[i]; const [x, z] = W(q[0], q[1]); tagAt(st.name, x, ys[i] + (st.bridge === 'stayed' ? 4 : 2.6), z, true); }
        st.path = [mkPath(st.pts.map((q, i) => { const [x, z] = W(q[0], q[1]); return [x, ys[i] + 0.02, z]; }))];
        return;
      }
      // ground streets: split into runs that stay off the road, the stages and the landmarks
      const okPt = q => { const v = get(q[0], q[1]); if (Math.abs(q[1]) < CURB - 1.2) return false; return v !== BLOCK && v !== 255; };
      const wet = st.pts.map(q => get(q[0], q[1]) === WATER ? 1 : 0);
      const lift = new Float32Array(n);
      for (let i = 0; i < n; i++) if (wet[i]) for (let j = Math.max(0, i - 5); j <= Math.min(n - 1, i + 5); j++) lift[j] = Math.max(lift[j], 1 - Math.abs(i - j) / 6);
      const bridgeY = st.k === 'path' ? 0.7 : 1.0;
      const ys = st.pts.map((q, i) => Math.max(yL(q[0], q[1]), lift[i] > 0 ? bridgeY * lift[i] + (wet[i] ? 0 : 0.02) : 0) + 0.07);
      const col = st.k === 'ped' ? SH.brick : st.k === 'path' ? SH.path : SH.asphalt;
      const runs = []; let cur = null;
      for (let i = 0; i < n; i++) { if (okPt(st.pts[i])) { if (!cur) { cur = []; runs.push(cur); } cur.push(i); } else cur = null; }
      st.path = [];
      runs.forEach(run => {
        if (run.length < 3) return;
        for (let r = 0; r < run.length - 1; r++) {
          const i = run[r], j = i + 1;
          const a = at(i, -hw), b = at(i, hw), d = at(j, hw), e = at(j, -hw);
          quad(wp(a[0], a[1], ys[i]), wp(b[0], b[1], ys[i]), wp(d[0], d[1], ys[j]), wp(e[0], e[1], ys[j]), col);
          // center line on avenues, skipped through intersections
          if (st.k === 'ave' && i % 3 === 0) { const k = cell(st.pts[i][0], st.pts[i][1]); if (k >= 0 && sid[k] !== -2) { const l0 = at(i, -0.07), r0 = at(i, 0.07), l1 = at(j, -0.07), r1 = at(j, 0.07); quad(wp(l0[0], l0[1], ys[i] + 0.015), wp(r0[0], r0[1], ys[i] + 0.015), wp(r1[0], r1[1], ys[j] + 0.015), wp(l1[0], l1[1], ys[j] + 0.015), SH.dash); } }
          // sidewalks
          if (st.walk) [-1, 1].forEach(sd => {
            const pr = at(i, sd * (hw + st.walk * 0.5)), v = get(pr[0], pr[1]), k = cell(pr[0], pr[1]);
            const bridge = lift[i] > 0.3;
            if (v === ROAD || v === BLOCK || v === 255 || (v === WATER && !bridge) || (v === STREET && k >= 0 && sid[k] !== st.id)) return;
            const a2 = at(i, sd * hw), b2 = at(i, sd * (hw + st.walk)), d2 = at(j, sd * (hw + st.walk)), e2 = at(j, sd * hw);
            quad(wp(a2[0], a2[1], ys[i] + 0.04), wp(b2[0], b2[1], ys[i] + 0.04), wp(d2[0], d2[1], ys[j] + 0.04), wp(e2[0], e2[1], ys[j] + 0.04), SH.walk);
          });
          // bridge girders and railings over water
          if (lift[i] > 0.25 && lift[j] > 0.25) [-1, 1].forEach(sd => {
            const o = sd * (hw + st.walk), p0 = at(i, o), p1 = at(j, o);
            quad(wp(p0[0], p0[1], ys[i] + 0.04), wp(p1[0], p1[1], ys[j] + 0.04), wp(p1[0], p1[1], ys[j] - 0.7), wp(p0[0], p0[1], ys[i] - 0.7), SH.girder);
            quad(wp(p0[0], p0[1], ys[i] + 0.04), wp(p1[0], p1[1], ys[j] + 0.04), wp(p1[0], p1[1], ys[j] + 0.55), wp(p0[0], p0[1], ys[i] + 0.55), SH.rail);
          });
        }
        st.path.push(mkPath(run.map(i => { const [x, z] = W(st.pts[i][0], st.pts[i][1]); return [x, ys[i], z]; })));
        // where the street meets the road: a zebra crossing and a signal
        [run[0], run[run.length - 1]].forEach(i => { const q = st.pts[i]; if (Math.abs(q[1]) < CURB + 1.4) crossings.push({ dx: q[0], side: Math.sign(q[1]), w: st.w, walk: st.walk }); });
      });
      if (st.name) { const run = runs.filter(r => r.length > 8).sort((a, b) => b.length - a.length)[0]; if (run) { const i = run[(run.length * 0.45) | 0], q = st.pts[i]; const [x, z] = W(q[0], q[1]); tagAt(st.name, x, ys[i] + 2.4, z, true); } }
    });
    // zebra crossings over the main road, and the signals that guard them
    crossings.forEach(cr => {
      const dxz = cr.dx - cr.side * 0, off = cr.w / 2 + 1.6;
      [-off].forEach(o => {
        const cx = dxz + o;
        for (let u = -7.2; u <= 7.21; u += 1.2) { const a = wp(cx - 0.9, u - 0.3, 0.06), b = wp(cx + 0.9, u - 0.3, 0.06), d = wp(cx + 0.9, u + 0.3, 0.06), e = wp(cx - 0.9, u + 0.3, 0.06); quad(a, b, d, e, SH.zebra); }
      });
      const sx = cr.dx + cr.w / 2 + 1.1, su = cr.side * (CURB + 0.5);
      if (get(sx, su + cr.side) !== BLOCK) { const [x, z] = W(sx, su); signals.push({ x, z, ry: cr.side > 0 ? 0 : Math.PI }); }
    });
    // lamps along the road through town, both sides
    for (let dx = c.x0 + 4; dx < c.x1 - 2; dx += 11) [-1, 1].forEach(sd => {
      const u = sd * (CURB + 0.9), v = get(dx, u + sd * 0.8);
      if (v === BLOCK || v === STREET || v === WATER || v === 255) return;
      if (c.id === 'detroit' && sd < 0) return;
      const [x, z] = W(dx, u); lamps.push({ x, z, ry: sd > 0 ? 0 : Math.PI });
    });

    /* ---------- the big bridges ---------- */
    function buildBridge(st, ys) {
      const k = kit(), n = st.pts.length, wetIdx = [];
      st.pts.forEach((q, i) => { if (get(q[0], q[1]) === WATER || (c.river && -q[1] > c.river[0] && -q[1] < c.river[1])) wetIdx.push(i); });
      if (wetIdx.length < 4) return;
      const i0 = wetIdx[0] + 2, i1 = wetIdx[wetIdx.length - 1] - 2;
      const T0 = st.t[i0], ry = rotY(st.pts[i0][0], T0[0], T0[1]);
      const hw = st.w / 2 + 0.6;
      const towerAt = (i, H, col) => {
        const q = st.pts[i], [x, z] = W(q[0], q[1]), base = -1.3, top = ys[i] + H;
        const tg = kit();
        [-1, 1].forEach(sd => tg.box(0.9, top - base, 0.9, 0, base, sd * hw, col));
        tg.box(0.9, 0.7, hw * 2 + 0.9, 0, top - 1.2, 0, col).box(0.9, 0.7, hw * 2 + 0.9, 0, ys[i] - 0.8, 0, col);
        if (st.bridge === 'stayed') tg.box(0.9, 0.7, hw * 2 + 0.9, 0, top - 5, 0, col);
        const o = tg.build(); o.position.set(x, 0, z); o.rotation.y = ry; g.add(o);
        return [x, top, z];
      };
      const col = st.bridge === 'suspension' ? '#7C93A6' : '#E4E8EC';
      const H = st.bridge === 'suspension' ? 9.5 : 15;
      const A = towerAt(i0, H, col), B = towerAt(i1, H, col);
      const cab = (p, q2) => { const dx = q2[0] - p[0], dy = q2[1] - p[1], dz = q2[2] - p[2], L = Math.hypot(dx, dy, dz); const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); o.lookAt(q2[0], q2[1], q2[2]); o.rotateX(Math.PI / 2); cables.push({ x: p[0], y: p[1], z: p[2], rx: o.rotation.x, ry: o.rotation.y, rz: o.rotation.z, sy: L, s: 1 }); };
      const side = (i, sd) => { const q = st.pts[i], o = sd * (st.w / 2 + 0.6); const [x, z] = W(q[0] - st.t[i][1] * o, q[1] + st.t[i][0] * o); return [x, z]; };
      [-1, 1].forEach(sd => {
        const [ax, az] = side(i0, sd), [bx2, bz] = side(i1, sd);
        if (st.bridge === 'suspension') {
          // main cable sagging between the towers, suspenders down to the deck, back stays to the shores
          let prev = null;
          for (let i = i0; i <= i1; i++) {
            const f = (i - i0) / (i1 - i0), [x, z] = side(i, sd), y = ys[i] + 1.2 + (H - 1.2) * Math.pow(2 * f - 1, 2);
            const pt = [x, y, z]; if (prev) cab(prev, pt); prev = pt;
            if ((i - i0) % 2 === 0 && f > 0.03 && f < 0.97) cab([x, ys[i], z], pt);
          }
          const back = (iT, iE) => { const [tx, tz] = side(iT, sd), [ex, ez] = side(iE, sd); cab([tx, ys[iT] + H, tz], [ex, ys[iE] + 0.2, ez]); };
          back(i0, Math.max(0, i0 - 7)); back(i1, Math.min(n - 1, i1 + 7));
        } else {
          // cable-stayed: fans from each pylon to the deck
          [[i0, 1], [i1, -1]].forEach(([iT, dir]) => {
            const [tx, tz] = side(iT, sd), top = ys[iT] + H - 0.6;
            for (let m = 1; m <= 7; m++) [dir, -dir].forEach(dd => { const j = clamp(iT + dd * m * 2, 0, n - 1); const [x, z] = side(j, sd); cab([tx, top - m * 0.55, tz], [x, ys[j] + 0.3, z]); });
          });
        }
      });
    }

    /* ---------- buildings that face their streets ---------- */
    const pal = z => (P.pal[z] || P.pal.dt || P.pal.mix);
    const nearCap = (u, r) => { if (u > 0) { const e = u - r; return clamp(0.75 * (e - 11) + 3.2, 3.2, 99); } const e = -u - r; return e < 11 ? 0 : clamp(0.5 * (e - 11) + 2.2, 2.2, 12); };
    function putBuilding(dx, u, w, d, h, ra, zone, forceHouse) {
      const [x, z] = W(dx, u), y = yAt(x, z), ry = rotY(dx, Math.cos(ra), Math.sin(ra));
      const cl = pal(zone)[(R() * pal(zone).length) | 0];
      if (forceHouse || zone === 'res' && h < 4.2) {
        const lst = R() < 0.55 ? gables : houses;
        lst.push({ x, y, z, sx: w, sy: Math.min(h, 2.6), sz: d, ry, c: cl });
        if (R() < 0.6) { const tu = u + Math.sin(ra + Math.PI / 2) * (d / 2 + 1.4) * (R() < 0.5 ? 1 : -1), tdx = dx + Math.cos(ra + Math.PI / 2) * (d / 2 + 1.4); if (get(tdx, tu) === FREE) { const [tx, tz] = W(tdx, tu); trees.push({ x: tx, z: tz, s: 0.6 + R() * 0.4, c: '#6F8E62' }); } }
        return;
      }
      const tallish = h > 13 && (c.id === 'detroit' || c.id === 'shanghai');
      if (tallish && R() < 0.22 && Math.abs(w - d) < 3) { (h > 14 ? octs.tall : octs.mid).push({ x, y, z, sx: Math.min(w, d), sy: h, sz: Math.min(w, d), ry, c: cl }); return; }
      if (tallish && R() < 0.45) {
        const h1 = h * (0.45 + R() * 0.2);
        blocks[h1 > 14 ? 'tall' : h1 > 6.5 ? 'mid' : 'low'].push({ x, y, z, sx: w, sy: h1, sz: d, ry, c: cl });
        const h2 = h - h1; blocks[h2 > 14 ? 'tall' : h2 > 6.5 ? 'mid' : 'low'].push({ x, y: y + h1, z, sx: w * 0.68, sy: h2, sz: d * 0.68, ry, c: cl, k: 1.04 });
        return;
      }
      blocks[h > 14 ? 'tall' : h > 6.5 ? 'mid' : 'low'].push({ x, y, z, sx: w, sy: h, sz: d, ry, c: cl });
    }
    function sizeFor(zone, dx, u) {
      const tl = P.tall(dx, u);
      if (zone === 'res') return { w: 3.4 + R() * 1.4, d: 3 + R() * 0.8, h: 2.2 + R() * 0.8, set: 1.2 + R() * 0.8, gap: 1.8 + R() * 1.6 };
      if (zone === 'campus') return { w: 7 + R() * 5, d: 6 + R() * 3, h: 3.6 + R() * 3, set: 1.6, gap: 3 + R() * 3 };
      if (zone === 'mix') return { w: 4.5 + R() * 4, d: 5 + R() * 3, h: 2.6 + R() * 4 * (0.6 + tl), set: 0.5, gap: 0.6 + R() * 1.2 };
      if (zone === 'cbd') return { w: 6 + R() * 4, d: 6 + R() * 4, h: (8 + R() * 22) * tl, set: 2.5 + R() * 2, gap: 4 + R() * 4 };
      return { w: 5 + R() * 5, d: 5.5 + R() * 4, h: (3 + R() * 7) * (0.5 + tl * (R() < 0.35 ? 2.6 : 1.2)), set: 0.6, gap: 0.5 + R() * 1.2 };
    }
    function frontage(pts, T, hw, walk, sides, skipRoad) {
      sides.forEach(sd => {
        let i = (R() * 3) | 0;
        while (i < pts.length) {
          const q = pts[i], [tx, tu] = T[i], zone = P.zone(q[0] - tu * sd * 6, q[1] + tx * sd * 6);
          if (zone === 'none') { i += 3; continue; }
          const s = sizeFor(zone, q[0], q[1]);
          const off = hw + walk + s.set + s.d / 2;
          const cx = q[0] - tu * off * sd, cu = q[1] + tx * off * sd, ra = Math.atan2(tu, tx);
          const cap = nearCap(cu, Math.max(s.w, s.d) / 2);
          if (cap < 1.5) { i += 2; continue; }
          if (Math.abs(cu) < CURB + 1 + s.d / 2 && !skipRoad) { i += 2; continue; }
          if (isFree(cx, cu, s.w + 0.6, s.d + 0.6, ra)) {
            putBuilding(cx, cu, s.w, s.d, Math.min(s.h, cap), ra, zone);
            mark(cx, cu, s.w + 0.6, s.d + 0.6, ra, BLDG);
            i += Math.max(2, Math.round(s.w + s.gap));
          } else i += 2;
        }
      });
    }
    // the road itself is the first street in town: shops and houses on both sides
    const roadPts = []; for (let dx = c.x0; dx <= c.x1; dx += 1) roadPts.push([dx, 0]);
    const roadT = roadPts.map(() => [1, 0]);
    frontage(roadPts, roadT, CURB, 0.6, [-1, 1], true);
    streets.forEach(st => { if (st.elev || st.k === 'path') return; frontage(st.pts, st.t, st.w / 2, st.walk, [-1, 1]); });
    // fill what's left between the streets
    const lotsDraw = [];
    for (let u = c.uN + 2; u < c.uF - 2; u += 4.5) for (let dx = c.x0 + 2; dx < c.x1 - 2; dx += 4.5) {
      const jx = dx + (R() - 0.5) * 2.5, ju = u + (R() - 0.5) * 2.5;
      const k = cell(jx, ju); if (k < 0 || grid[k] !== FREE) continue;
      const zone = P.zone(jx, ju), ra = isNaN(ang[k]) ? 0 : ang[k];
      if (zone === 'none') continue;
      if (zone === 'campus') { if (R() < 0.35) { const [x, z] = W(jx, ju); trees.push({ x, z, s: 0.8 + R() * 0.5, c: '#6F8E62' }); grid[k] = BLDG; } continue; }
      if ((zone === 'dt' || zone === 'mix') && R() < 0.06 && isFree(jx, ju, 10, 7, ra)) { lotsDraw.push([jx, ju, 10, 7, ra]); mark(jx, ju, 10, 7, ra, BLDG); continue; }
      const s = sizeFor(zone, jx, ju), cap = nearCap(ju, Math.max(s.w, s.d) / 2);
      if (cap < 1.5) { if (R() < 0.5) { const [x, z] = W(jx, ju); trees.push({ x, z, s: 0.7 + R() * 0.5, c: '#6F8E62' }); } continue; }
      for (let tries = 0; tries < 3; tries++) {
        const f = 1 - tries * 0.25;
        if (isFree(jx, ju, s.w * f + 0.6, s.d * f + 0.6, ra)) { putBuilding(jx, ju, s.w * f, s.d * f, Math.min(s.h, cap), ra, zone); mark(jx, ju, s.w * f + 0.6, s.d * f + 0.6, ra, BLDG); break; }
      }
      if (get(jx, ju) === FREE && R() < (zone === 'res' ? 0.8 : 0.3)) { const [x, z] = W(jx, ju); trees.push({ x, z, s: 0.7 + R() * 0.5, c: R() < 0.3 ? '#7E9B6A' : '#6F8E62' }); grid[k] = BLDG; }
    }
    // parking lots with cars in their stalls
    lots.forEach(([x, u, w, d]) => lotsDraw.push([x - S, u, w, d, 0]));
    lotsDraw.forEach(([dx, u, w, d, ra]) => {
      const ca = Math.cos(ra), sa = Math.sin(ra), L = (a, b) => [dx + a * ca - b * sa, u + a * sa + b * ca];
      const c0 = L(-w / 2, -d / 2), c1 = L(w / 2, -d / 2), c2 = L(w / 2, d / 2), c3 = L(-w / 2, d / 2), y = yL(dx, u) + 0.07;
      quad(wp(c0[0], c0[1], y), wp(c1[0], c1[1], y), wp(c2[0], c2[1], y), wp(c3[0], c3[1], y), SH.lot);
      const ry = rotY(dx, ca, sa) + Math.PI / 2, types = CARS[c.id];
      for (let a = -w / 2 + 1.4; a < w / 2 - 1; a += 2.6) [-1, 1].forEach(b => { if (R() < 0.35) return; const p = L(a, b * d * 0.26); const [x, z] = W(p[0], p[1]); anim.cars.push({ park: true, x, z, ry, t: types[(R() * types.length) | 0], c: CAR_COLORS[(R() * CAR_COLORS.length) | 0] }); });
    });
    const surf = new THREE.BufferGeometry();
    surf.setAttribute('position', new THREE.Float32BufferAttribute(SP, 3)); surf.setAttribute('color', new THREE.Float32BufferAttribute(SC, 3)); surf.computeVertexNormals();
    const sm = new THREE.Mesh(surf, SURF); sm.receiveShadow = true; g.add(sm);

    /* ---------- Ann Arbor game day ---------- */
    if (c.tailgate) {
      const [BX, BZ] = c.tailgate;
      for (let i = 0; i < (lite ? 30 : 56); i++) {
        const a = R() * Math.PI * 2, r = 1.32 + R() * 0.5; const x = BX + Math.cos(a) * 19 * r, z = BZ + Math.sin(a) * 15 * r;
        if (!free(x, z, 3, 3)) continue;
        mark(x - S, roadZ(x) - z, 3, 3, 0, BLDG);
        tents.push({ x, z, y: yAt(x, z), ry: R() * 0.4, c: i % 2 ? MAIZE : BLUE });
        for (let p = 0; p < 4; p++) anim.people.push({ x0: x + (R() - 0.5) * 4, z: z + (R() - 0.5) * 4, dx: 0, sp: 0, ph: R(), c: R() < 0.5 ? MAIZE : BLUE, bob: true });
        if (R() < 0.7) anim.cars.push({ park: true, x: x + 3.4, z: z + (R() - 0.5) * 2, ry: R() * 3, t: 'suv', c: ['#E3E8EE', '#8C97A6', '#4A5563', '#00274C', '#B8C2CD'][(R() * 5) | 0] });
      }
    }

    /* ---------- traffic, buses and walkers on the street network ---------- */
    const types = CARS[c.id];
    const lite2 = lite ? 0.5 : 1;
    streets.forEach(st => {
      const pl = (st.path || []).filter(p => p.L > 12); if (!pl.length) return;
      const pick = () => pl[(R() * pl.length) | 0];
      const nC = Math.round((st.cars || 0) * lite2 + (st.cars && R() < 0.5 ? 1 : 0));
      for (let i = 0; i < nC; i++) { const p = pick(), dir = R() < 0.5 ? 1 : -1; anim.cars.push({ path: p, s: R() * p.L, v: dir * (3.2 + R() * 2.4), lane: dir * (st.elev ? st.w * 0.22 : 0.8), t: types[(R() * types.length) | 0], c: CAR_COLORS[(R() * 6) | 0] }); }
      for (let i = 0; i < (st.bus || 0); i++) { const p = pick(), dir = R() < 0.5 ? 1 : -1; anim.cars.push({ path: p, s: R() * p.L, v: dir * 2.6, lane: dir * (st.elev ? st.w * 0.22 : 0.85), t: 'bus', c: c.id === 'shanghai' ? '#5DA9E9' : c.id === 'annarbor' ? '#2F5D9E' : '#3F8F5A' }); }
      const nP = Math.round((st.peds || 0) * lite2);
      for (let i = 0; i < nP; i++) {
        const p = pick(), dir = R() < 0.5 ? 1 : -1, sd = R() < 0.5 ? 1 : -1;
        const off = st.walk ? sd * (st.w / 2 + st.walk * 0.55) : (R() - 0.5) * st.w * 0.8;
        const colr = st.fans ? (R() < 0.55 ? MAIZE : BLUE) : PEOPLE[(R() * PEOPLE.length) | 0];
        anim.people.push({ path: p, s: R() * p.L, v: dir * (0.5 + R() * 0.5), lane: off, c: colr, ph: R() });
      }
    });

    /* ---------- draw the instanced sets ---------- */
    const FL = { low: 3, mid: 7, tall: 16 };
    Object.entries(blocks).forEach(([k, l]) => {
      const im = instanced(blockGeo(FL[k]), l, LAND); if (im) g.add(im);
      const lit = instanced(litGeo(FL[k]), l.map(q => Object.assign({}, q, { c: R() < 0.8 ? '#FFFFFF' : '#333333', k: 1 })), LIT, false); if (lit) { lit.renderOrder = 1; g.add(lit); }
    });
    Object.entries(octs).forEach(([k, l]) => {
      const im = instanced(octGeo(FL[k]), l, LAND); if (im) g.add(im);
      const lit = instanced(octLitGeo(FL[k]), l.map(q => Object.assign({}, q, { c: '#FFFFFF', k: 1 })), LIT, false); if (lit) { lit.renderOrder = 1; g.add(lit); }
    });
    [[houseGeo(), houses, g], [gableGeo(), gables, g], [treeGeo(), trees, near], [tentGeo(), tents, near], [pierGeo(), piers, g], [benchGeo(), benches, near], [cableGeo(), cables, g]].forEach(([geo, l, parent]) => {
      l.forEach(q => { if (q.y === undefined) q.y = yAt(q.x, q.z); });
      const im = instanced(geo, l, LAND, l !== cables); if (im) parent.add(im);
    });
    lamps.forEach(q => q.y = yAt(q.x, q.z)); signals.forEach(q => q.y = yAt(q.x, q.z));
    const lm1 = instanced(lampGeo(), lamps, LAND, false); if (lm1) near.add(lm1);
    const lm2 = instanced(lampLitGeo(), lamps.map(q => Object.assign({}, q, { c: [1, 0.86, 0.6] })), LIT, false); if (lm2) near.add(lm2);
    const sg = instanced(signalGeo(), signals, LAND, false); if (sg) near.add(sg);

    // vehicles: one instanced set per kind
    const vMeshes = {};
    anim.cars.forEach(q => { (vMeshes[q.t] = vMeshes[q.t] || []).push(q); });
    const col = new THREE.Color();
    const vSets = Object.entries(vMeshes).map(([t, list]) => {
      const im = new THREE.InstancedMesh(vehicleGeo(t), mat('obj', { vertexColors: true }), list.length);
      im.castShadow = true; im.frustumCulled = false; near.add(im);
      list.forEach((q, i) => { const tt = C3(q.c); im.setColorAt(i, col.setRGB(tt[0] * 1.15, tt[1] * 1.15, tt[2] * 1.15)); });
      return { im, list };
    });
    const pIM = new THREE.InstancedMesh(personGeo(), LAND, Math.max(1, anim.people.length));
    pIM.castShadow = true; pIM.frustumCulled = false; near.add(pIM);
    anim.people.forEach((q, i) => { const t = C3(q.c); pIM.setColorAt(i, col.setRGB(t[0], t[1], t[2])); });
    // the river names
    (P.waters || []).forEach(wt => { if (!wt.name) return; const [x, z] = W(wt.at[0], wt.at[1]); tagAt(wt.name, x, 1.6, z, true); });

    scene.add(g);
    if (TOWN_DEBUG) console.log('[town]', c.id, 'blocks', Object.values(blocks).reduce((a, l) => a + l.length, 0), 'houses', houses.length + gables.length, 'trees', trees.length, 'cars', anim.cars.length, 'people', anim.people.length, 'tris', SP.length / 9);
    built.push({ c, g, near, anim, vSets, pIM, x0: c.X0, x1: c.X1 });
  });

  /* the Chrysler Technology Center and the I-75 shield */
  {
    const g = new THREE.Group(); g.name = 'ctc'; const near = new THREE.Group(); g.add(near);
    const x = CTC.x, z = roadZ(x) - CTC.u;
    const t = chryslerTower(); t.position.set(x, yAt(x, z) - 0.02, z); t.rotation.y = -Math.atan(roadDZ(x)); g.add(t);
    const sx = CTC.sign, sz = roadZ(sx) + 12.6; const sg = i75Sign(); sg.position.set(sx, yAt(sx, sz) - 0.02, sz); sg.rotation.y = -Math.atan(roadDZ(sx)); g.add(sg);
    const l = label('Chrysler Technology Center, Auburn Hills', { size: 18, key: 'ink', bg: 'card', scale: 0.62, weight: 700 }); l.position.set(x + 8, yAt(x, z) + 21, z + 13); l.material.opacity = 0; g.add(l);
    scene.add(g);
    built.push({ c: { id: 'ctc' }, g, near, anim: { flags: [], people: [], cars: [], movers: [], labels: [{ l, x: x + 12 }] }, vSets: [], pIM: null, x0: x - 40, x1: x + 40 });
  }

  const o = new THREE.Object3D();
  function onPath(p, s, lane, out) {
    const P = p.P, cum = p.cum; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = P[lo], b = P[hi], seg = cum[hi] - cum[lo] || 1, f = clamp((s - cum[lo]) / seg, 0, 1);
    const tx = b[0] - a[0], tz = b[2] - a[2], L = Math.hypot(tx, tz) || 1;
    out[0] = lerp(a[0], b[0], f) - tz / L * lane; out[1] = lerp(a[1], b[1], f); out[2] = lerp(a[2], b[2], f) + tx / L * lane; out[3] = Math.atan2(-tz, tx);
    return out;
  }
  const tmp4 = [0, 0, 0, 0];
  function update(t, dt, pos, zoomOut, still) {
    built.forEach(b => {
      const d = pos < b.x0 ? b.x0 - pos : pos > b.x1 ? pos - b.x1 : 0;
      const vis = d < 120 + zoomOut * 900;
      b.g.visible = vis; if (!vis) return;
      const close = d < 70;
      b.near.visible = close || zoomOut < 0.15;
      const A = b.anim;
      A.labels.forEach(q => { const k = clamp(1 - Math.abs(q.x - pos) / 60, 0, 1) * clamp(1 - zoomOut * 8, 0, 1) * (q.k || 1); q.l.material.opacity = k; q.l.visible = k > 0.02; });
      if (!b.near.visible) return;
      if (!still) A.flags.forEach(f => wave(f, t));
      b.vSets.forEach(({ im, list }) => {
        list.forEach((q, i) => {
          if (q.park) { o.position.set(q.x, yAtLocal(q.x, q.z), q.z); o.rotation.set(0, q.ry, 0); }
          else {
            if (!still) { q.s += q.v * dt; if (q.s > q.path.L) q.s -= q.path.L; if (q.s < 0) q.s += q.path.L; }
            onPath(q.path, q.s, q.lane, tmp4); o.position.set(tmp4[0], tmp4[1] + 0.02, tmp4[2]); o.rotation.set(0, tmp4[3] + (q.v < 0 ? Math.PI : 0), 0);
          }
          o.scale.setScalar(0.85); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
      });
      if (b.pIM) A.people.forEach((q, i) => {
        let x = q.x0, y, z = q.z;
        if (q.path) {
          if (!still) { q.s += q.v * dt; if (q.s > q.path.L) q.s -= q.path.L; if (q.s < 0) q.s += q.path.L; }
          onPath(q.path, q.s, q.lane, tmp4); x = tmp4[0]; z = tmp4[2]; y = tmp4[1] + 0.05;
        } else if (q.sp) { const f = (t * q.sp + q.ph) % 1; x = q.x0 + (f - 0.5) * q.dx; if (q.road) z = roadZ(x) + (q.z - roadZ(q.x0)); }
        const bob = q.bob ? Math.abs(Math.sin(t * 3 + q.ph * 9)) * 0.25 : Math.abs(Math.sin(t * 7 + q.ph * 9)) * 0.06;
        o.position.set(x, (y === undefined ? yAtLocal(x, z) : y) + bob, z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); b.pIM.setMatrixAt(i, o.matrix);
      });
      if (b.pIM) b.pIM.instanceMatrix.needsUpdate = true;
      A.movers.forEach(m => {
        if (m.ship) { if (!still) m.s = (m.s + m.v * dt * 0.25 + 1) % 1; const x = lerp(m.x0, m.x1, m.s); m.ship.position.set(x, -1.2, roadZ(x) + m.dz); m.ship.rotation.y = m.v > 0 ? 0 : Math.PI; }
        if (m.loop) { if (!still) m.s = (m.s + dt * 0.035) % 1; const P = m.loop, f = m.s * 4, e = Math.floor(f) % 4, r = f - Math.floor(f); const [ax, az] = P[e], [bx2, bz] = P[(e + 1) % 4]; m.obj.position.set(lerp(ax, bx2, r), m.y, lerp(az, bz, r)); m.obj.rotation.y = -Math.atan2(bz - az, bx2 - ax); }
        if (m.beacon) m.beacon.visible = (t % 1.6) < 0.9;
      });
    });
  }
  function yAtLocal(x, z) { return Math.max(0, height(x, z)) + 0.02; }
  return { update, cities: built };
}
