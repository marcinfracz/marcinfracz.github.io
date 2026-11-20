/* Drive mode, open world (preview). Turns the streets, ramps and bridges The Road already draws into
   surfaces you can drive on. Network idea and first draft by Grok, rebuilt by Claude so the drivable
   lines sit exactly on the drawn ones (same smoothing as landmarks.js). It only reads the shared
   modules and the meshes they built: no Road file is changed. */
import { THREE, roadZ } from './core.js';

const MAIN_HALF = 8.3;          // the main road, curb to curb
const CELL = 6;                 // spatial hash cell size

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
  if (Math.hypot(last[0] - pl[0], last[1] - pl[1]) > 0.05) out.push(last.slice());
  return out;
}

export function createNet({ cities, height, town, stages = [] }) {
  const ground = (x, z) => Math.max(0, height(x, z)) + 0.02;
  const edges = [];          // { id, name, kind, elev, ramp, hw, pts: [[x, y, z]] }
  const hash = new Map();    // cell -> [ [edge, i] ]
  const key = (i, j) => i * 100003 + j;
  const put = (x, z, v) => { const k = key(Math.floor(x / CELL), Math.floor(z / CELL)); let a = hash.get(k); if (!a) hash.set(k, a = []); a.push(v); };
  const rails = [], rhash = new Map();
  const rput = (x, z, v) => { const k = key(Math.floor(x / CELL), Math.floor(z / CELL)); let a = rhash.get(k); if (!a) rhash.set(k, a = []); a.push(v); };

  cities.forEach(c => {
    const P = c.plan; if (!P || !P.streets) return;
    const S = c.stop.x;
    P.streets.forEach(spec => {
      let p;
      if (spec.ring) { const [cx, cu, r] = spec.ring; p = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; p.push([cx + Math.cos(a) * r, cu + Math.sin(a) * r]); } }
      else { if (!spec.p || spec.p.length < 2) return; p = spec.p.map(q => q.slice()); if (spec.curve !== false && p.length > 2) p = chaikin(p, 3); }
      if (spec.hsr) {                                          // the rail viaduct is for trains: kept only to place its piers
        const rp = resample(p, 1).map(q => { const x = S + q[0]; return [x, q[2] || 9, roadZ(x) - q[1]]; });
        const r = { id: -1, rail: true, elev: true, hw: (spec.w || 3) / 2, pts: rp }; rails.push(r); rp.forEach((q, i) => rput(q[0], q[2], [r, i])); return;
      }
      const pts = resample(p, 1).map(q => {
        const x = S + q[0], z = roadZ(x) - q[1];
        const y = spec.elev ? Math.max(ground(x, z) + 0.12, q[2] || 0) + 0.02 : ground(x, z);
        return [x, y, z];
      });
      const kind = spec.elev ? (spec.ramp ? 'ramp' : (spec.bridge ? 'bridge' : 'elev')) : (spec.k === 'ped' || spec.k === 'path' ? 'walk' : 'street');
      const e = { id: edges.length, city: c.id, name: spec.name || '', kind, elev: !!spec.elev, hw: (spec.w || 3.2) / 2, pts };
      edges.push(e);
      pts.forEach((q, i) => put(q[0], q[2], [e, i]));
    });
  });

  /* ---------- solid things: buildings, landmarks, piers, stage props ---------- */
  const solids = [];          // oriented boxes { x, z, ux, uz, hl, hw, y0, y1 }
  const shash = new Map();
  const sput = (s) => {
    const r = Math.hypot(s.hl, s.hw) + 1.6;
    for (let i = Math.floor((s.x - r) / CELL); i <= Math.floor((s.x + r) / CELL); i++)
      for (let j = Math.floor((s.z - r) / CELL); j <= Math.floor((s.z + r) / CELL); j++) { const k = key(i, j); let a = shash.get(k); if (!a) shash.set(k, a = []); a.push(s); }
  };
  const skipIM = new Set();
  (town ? town.cities : []).forEach(b => {
    (b.vSets || []).forEach(v => skipIM.add(v.im));
    if (b.pIM) skipIM.add(b.pIM);
  });
  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), ex = new THREE.Vector3();
  const box = new THREE.Box3();
  let SRC = null;
  function addSolid(x, z, yaw, hl, hw, y0, y1) {
    if (y1 - y0 < 1.1 || y1 < 1.3) return;                         // curbs, lots, low walls: drive over them
    if (Math.min(hl, hw) < 0.32) return;                           // poles and posts: never a wall
    if (hl * hw * 4 > 2400) return;                                // ground sheets and decks are surfaces, not walls
    if (Math.abs(z - roadZ(x)) < MAIN_HALF + 0.3) return;          // gates and gantries over the main road: drive under them
    const s = { x, z, ux: Math.cos(yaw), uz: -Math.sin(yaw), hl, hw, y0, y1, src: SRC };
    solids.push(s); sput(s);
  }
  function scanGroup(g) {
    g.updateMatrixWorld(true);
    g.traverse(o => {
      if (!o.isMesh || skipIM.has(o)) return;
      if (o.material && (o.material.transparent && o.material.opacity < 0.5)) return;
      const geo = o.geometry; if (!geo) return;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const bb = geo.boundingBox; if (!bb || bb.isEmpty()) return;
      if (o.isInstancedMesh) {
        const c = bb.getCenter(new THREE.Vector3()), h = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld); m4.decompose(pos, quat, scl);
          if (scl.x === 0 && scl.y === 0) continue;
          const yaw = new THREE.Euler().setFromQuaternion(quat, 'YXZ').y;
          ex.copy(c).multiply(scl).applyQuaternion(quat).add(pos);
          SRC = { im: o, i };
          addSolid(ex.x, ex.z, yaw, h.x * Math.abs(scl.x), h.z * Math.abs(scl.z), ex.y - h.y * Math.abs(scl.y), ex.y + h.y * Math.abs(scl.y));
        }
      } else {
        box.copy(bb).applyMatrix4(o.matrixWorld);
        if ((box.max.x - box.min.x) * (box.max.z - box.min.z) > 2400) { rasterMesh(o); return; }   // a whole block merged into one mesh
        SRC = { mesh: o };
        addSolid((box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2, 0, (box.max.x - box.min.x) / 2, (box.max.z - box.min.z) / 2, box.min.y, box.max.y);
      }
    });
  }
  // a merged mesh: find its buildings from their flat roofs, cell by cell (1 m), and wall in the outline
  function overDeck(x, z, y) {
    let on = false;
    near(x, z, ([e, k]) => { if (on || !e.elev) return; const q = e.pts[k]; if (Math.hypot(x - q[0], z - q[2]) < e.hw + 1.2 && Math.abs(y - q[1]) < 2.2) on = true; });
    if (!on) { const i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL); for (let i = i0 - 1; i <= i0 + 1 && !on; i++) for (let j = j0 - 1; j <= j0 + 1 && !on; j++) (rhash.get(key(i, j)) || []).forEach(([e, k]) => { const q = e.pts[k]; if (Math.hypot(x - q[0], z - q[2]) < e.hw + 1.5) on = true; }); }
    return on;
  }
  function rasterMesh(o) {
    const geo = o.geometry, P = geo.attributes.position, I = geo.index, n = I ? I.count : P.count;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const top = new Map(), under = new Map();
    for (let t = 0; t < n; t += 3) {
      const ia = I ? I.getX(t) : t, ib = I ? I.getX(t + 1) : t + 1, ic = I ? I.getX(t + 2) : t + 2;
      A.fromBufferAttribute(P, ia).applyMatrix4(o.matrixWorld); B.fromBufferAttribute(P, ib).applyMatrix4(o.matrixWorld); C.fromBufferAttribute(P, ic).applyMatrix4(o.matrixWorld);
      N.crossVectors(e1.subVectors(B, A), e2.subVectors(C, A)); const L = N.length(); if (L < 1e-6) continue; N.multiplyScalar(1 / L);
      if (Math.abs(N.y) < 0.9 || Math.max(A.y, B.y, C.y) - Math.min(A.y, B.y, C.y) > 0.4) continue;   // only flat roofs and undersides
      const y = (A.y + B.y + C.y) / 3, map = N.y > 0 ? top : under;
      const x0 = Math.floor(Math.min(A.x, B.x, C.x)), x1 = Math.floor(Math.max(A.x, B.x, C.x)), z0 = Math.floor(Math.min(A.z, B.z, C.z)), z1 = Math.floor(Math.max(A.z, B.z, C.z));
      const d = (B.z - C.z) * (A.x - C.x) + (C.x - B.x) * (A.z - C.z); if (Math.abs(d) < 1e-9) continue;
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
        const px = i + 0.5, pz = j + 0.5;
        const w1 = ((B.z - C.z) * (px - C.x) + (C.x - B.x) * (pz - C.z)) / d, w2 = ((C.z - A.z) * (px - C.x) + (A.x - C.x) * (pz - C.z)) / d;
        if (w1 < -0.02 || w2 < -0.02 || w1 + w2 > 1.02) continue;
        const k = i + ',' + j;
        if (map === top) top.set(k, Math.max(top.get(k) || -9, y)); else under.set(k, Math.min(under.has(k) ? under.get(k) : 99, y));
      }
    }
    const wall = new Map();
    top.forEach((y, k) => {
      const [i, j] = k.split(',').map(Number), x = i + 0.5, z = j + 0.5, gy = ground(x, z);
      if (y - gy < 1.3) return;                                    // curbs, plazas, low walls
      if (under.has(k) && under.get(k) - gy > 2) return;            // something you drive under: a canopy, a gantry, a deck
      if (Math.abs(z - roadZ(x)) < MAIN_HALF + 0.3) return;
      if (overDeck(x, z, y)) return;
      wall.set(k, y);
    });
    wall.forEach((y, k) => {                                       // only the outline: you never get inside
      const [i, j] = k.split(',').map(Number);
      if (wall.has((i + 1) + ',' + j) && wall.has((i - 1) + ',' + j) && wall.has(i + ',' + (j + 1)) && wall.has(i + ',' + (j - 1))) return;
      const s = { x: i + 0.5, z: j + 0.5, ux: 1, uz: 0, hl: 0.5, hw: 0.5, y0: 0, y1: y, src: null, cell: true };
      solids.push(s); sput(s);
    });
  }
  (town ? town.cities : []).forEach(b => scanGroup(b.g));
  // anything centred on a ramp or deck is part of it (anchors, deck boxes, sign gantries), never a wall across it
  for (let i = solids.length - 1; i >= 0; i--) {
    const s = solids[i]; let onDeck = false;
    near(s.x, s.z, ([e, k]) => { if (onDeck || !e.elev) return; const q = e.pts[k]; if (Math.hypot(s.x - q[0], s.z - q[2]) < e.hw + 0.4 && s.y1 > q[1] - 0.3 && s.y0 < q[1] + 3) onDeck = true; });
    if (onDeck) { solids.splice(i, 1); s.dead = true; }
  }
  stages.forEach(st => scanGroup(st.group));

  // a pillar of an elevated road standing in a cross street moves along the deck to the kerb, as real viaducts do
  const streetHit = (x, z, r) => { let hit = null; near(x, z, ([e, k]) => { if (hit || e.elev || e.kind === 'walk') return; const q = e.pts[k]; if (Math.hypot(x - q[0], z - q[2]) < e.hw + r) hit = e; }); return hit; };
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3();
  solids.slice().forEach(s => {
    if (s.dead || !s.src || s.y0 > 1 || Math.max(s.hl, s.hw) > 2.2) return;
    const r = Math.max(s.hl, s.hw) + 0.6;
    if (!streetHit(s.x, s.z, r)) return;
    let deck = null;                                               // the elevated edge overhead, and its direction here
    near(s.x, s.z, ([e, k]) => { if (deck || !e.elev) return; const q = e.pts[k]; if (Math.hypot(s.x - q[0], s.z - q[2]) < e.hw + 2.5 && q[1] > s.y1 - 1.5) deck = [e, k]; });
    if (!deck) { const i0 = Math.floor(s.x / CELL), j0 = Math.floor(s.z / CELL); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) (rhash.get(key(i, j)) || []).forEach(([e, k]) => { if (deck) return; const q = e.pts[k]; if (Math.hypot(s.x - q[0], s.z - q[2]) < e.hw + 2.5) deck = [e, k]; }); }
    if (!deck) return;
    const [e, k] = deck, a = e.pts[Math.max(0, k - 2)], b = e.pts[Math.min(e.pts.length - 1, k + 2)];
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1, dx = (b[0] - a[0]) / L, dz = (b[2] - a[2]) / L, slope = (b[1] - a[1]) / L;
    let shift = 0, ax = dx, az = dz, sl = slope;
    for (let d = 0.5; d <= 9 && !shift; d += 0.5) for (const sg of [1, -1]) { if (!streetHit(s.x + sg * d * dx, s.z + sg * d * dz, r)) { shift = sg * d; break; } }
    if (!shift) {                                                  // a street running under the deck: the piers stand at its kerb, still under the deck
      ax = -dz; az = dx; sl = 0;
      for (let d = 0.5; d <= e.hw + 0.6 && !shift; d += 0.25) for (const sg of [1, -1]) { if (!streetHit(s.x + sg * d * ax, s.z + sg * d * az, r - 0.3)) { shift = sg * d; break; } }
    }
    if (!shift) return;
    const mx = shift * ax, mz = shift * az, my = shift * sl;
    if (s.src.im) { s.src.im.getMatrixAt(s.src.i, tmpM); tmpM.elements[12] += mx; tmpM.elements[14] += mz; if (my > 0) { tmpM.elements[5] *= 1 + my / Math.max(1, s.y1 - s.y0); } s.src.im.setMatrixAt(s.src.i, tmpM); s.src.im.instanceMatrix.needsUpdate = true; }
    else { const o = s.src.mesh; tmpV.set(mx, 0, mz); if (o.parent) { const inv = new THREE.Matrix4().copy(o.parent.matrixWorld).invert(); tmpV.transformDirection(inv).multiplyScalar(Math.hypot(mx, mz)); } o.position.add(tmpV); o.updateMatrixWorld(true); }
    s.x += mx; s.z += mz; s.moved = shift;
    for (const [kk, arr] of shash) { const i = arr.indexOf(s); if (i >= 0) arr.splice(i, 1); }
    sput(s);
  });

  // where a landmark stands on a street's line, the town never drew that stretch: it is not a street there
  const inside = (b, x, z, m) => { const dx = x - b.x, dz = z - b.z, al = dx * b.ux + dz * b.uz, sd = -dx * b.uz + dz * b.ux; return Math.abs(al) < b.hl + m && Math.abs(sd) < b.hw + m; };
  edges.forEach(e => {
    if (e.elev) return;
    e.off = e.pts.map(q => { let hit = false; const a = shash.get(key(Math.floor(q[0] / CELL), Math.floor(q[2] / CELL))); if (a) for (const b of a) if (!b.dead && b.y0 < 1 && inside(b, q[0], q[2], -0.2)) { hit = true; break; } return hit; });
  });

  /* ---------- queries ---------- */
  function near(x, z, f) {
    const i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL);
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) { const a = hash.get(key(i, j)); if (a) for (const v of a) f(v); }
  }
  // every surface under (x, z): the ground plus any street, ramp or deck that covers this spot
  function surfaces(x, z) {
    const out = [];
    const dz = z - roadZ(x);
    const gy = ground(x, z), wet = height(x, z) < -0.35;
    out.push({ y: gy, kind: Math.abs(dz) <= MAIN_HALF ? 'main' : wet ? 'water' : 'ground', elev: false, name: '' });
    const best = new Map();
    near(x, z, ([e, i]) => {
      if (e.off && e.off[i]) return;
      const q = e.pts[i], d = Math.hypot(x - q[0], z - q[2]);
      const n = e.pts.length, tol = e.hw + 0.25 + (e.elev && (i < 6 || i > n - 7) ? 1.1 : 0);   // a little extra where a ramp meets its deck
      if (d > tol) return;
      const b = best.get(e); if (!b || d < b.d) best.set(e, { d, i });
    });
    best.forEach(({ i }, e) => {
      // height between the two nearest samples
      const a = e.pts[i], n = e.pts[Math.min(e.pts.length - 1, i + 1)], p = e.pts[Math.max(0, i - 1)];
      const o = Math.hypot(x - n[0], z - n[2]) < Math.hypot(x - p[0], z - p[2]) ? n : p;
      const L = Math.hypot(o[0] - a[0], o[2] - a[2]) || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * (o[0] - a[0]) + (z - a[2]) * (o[2] - a[2])) / (L * L)));
      const y = a[1] + (o[1] - a[1]) * t;
      if (!e.elev) { if (out[0].kind !== 'main') { out[0].kind = e.kind; out[0].name = e.name; } return; }
      out.push({ y, kind: e.kind, elev: true, name: e.name, edge: e, end: i < 2 || i > e.pts.length - 3 });
    });
    return out;
  }
  // the surface the car is on: the one closest to where it already is, never a jump up or down
  function surface(x, z, yPrev, prevEdge) {
    const all = surfaces(x, z).filter(s => { const d = s.y - yPrev; return d <= 0.75 && d >= -0.9; });   // never climb a wall or drop off a deck
    if (!all.length) return null;                       // the side of a deck, its end: nothing you can reach from here
    if (prevEdge) { const same = all.find(s => s.edge === prevEdge); if (same) return same; }   // stay on the ramp or deck you are on
    let best = null, bd = 1e9;
    all.forEach(s => { if (s.elev && Math.abs(s.y - yPrev) < bd) { bd = Math.abs(s.y - yPrev); best = s; } });   // a ramp's foot: drive onto it
    return best || all[0];
  }
  function solidsNear(x, z, f) {
    const a = shash.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (a) for (const s of a) if (!s.dead) f(s);
  }
  return { edges, solids, surface, surfaces, solidsNear, ground };
}

/* A small map of where you are: north is always the way the road runs */
export function createMinimap({ net, car, stops, roadZ: rz, parent }) {
  const W = 188, H = 188, R = 120;                 // R: metres from the car to the map's edge
  const cv = document.createElement('canvas'); cv.className = 'dv-map';
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr;
  (parent || document.body).appendChild(cv);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  let on = true;
  const toggle = () => { on = !on; cv.hidden = !on; };
  function draw(css) {
    if (!on) return;
    const sc = (W / 2) / R;
    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2); g.clip();
    g.fillStyle = css.bg; g.fillRect(0, 0, W, H);
    // map frame: car at the centre, heading up
    const ca = Math.cos(car.yaw - Math.PI / 2), sa = Math.sin(car.yaw - Math.PI / 2);
    const P = (x, z) => { const dx = x - car.x, dz = z - car.z; const rx = dx * ca - dz * sa, ry = dx * sa + dz * ca; return [W / 2 + rx * sc, H / 2 + ry * sc]; };
    g.lineCap = 'round'; g.lineJoin = 'round';
    // main road
    g.strokeStyle = css.road; g.lineWidth = Math.max(3, 16.6 * sc);
    g.beginPath();
    for (let x = car.x - R * 1.5; x <= car.x + R * 1.5; x += 4) { const [px, py] = P(x, rz(x)); x === car.x - R * 1.5 ? g.moveTo(px, py) : g.lineTo(px, py); }
    g.stroke();
    // streets, then ramps and decks on top
    ['walk', 'street', 'ramp', 'elev', 'bridge'].forEach(kind => {
      g.strokeStyle = kind === 'walk' ? css.walk : (kind === 'street' ? css.street : css.deck);
      net.edges.forEach(e => {
        if (e.kind !== kind) return;
        const a = e.pts[0], b = e.pts[e.pts.length - 1];
        if (Math.min(Math.abs(a[0] - car.x), Math.abs(b[0] - car.x)) > R * 2 && (a[0] - car.x) * (b[0] - car.x) > 0) return;
        g.lineWidth = Math.max(kind === 'walk' ? 1.5 : 2.2, e.hw * 2 * sc);
        g.beginPath();
        let pen = false;
        e.pts.forEach((q, i) => { if (e.off && e.off[i]) { pen = false; return; } const [px, py] = P(q[0], q[2]); pen ? g.lineTo(px, py) : g.moveTo(px, py); pen = true; });
        g.stroke();
      });
    });
    // stops
    stops.forEach(s => {
      if (Math.abs(s.x - car.x) > R * 1.6) return;
      const [px, py] = P(s.x, rz(s.x) - 22);
      g.fillStyle = s.hl ? css.accent : css.stop; g.beginPath(); g.arc(px, py, s.hl ? 4.5 : 3.5, 0, Math.PI * 2); g.fill();
    });
    g.restore();
    // the car
    g.fillStyle = css.accent; g.strokeStyle = css.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(W / 2, H / 2 - 8); g.lineTo(W / 2 + 6, H / 2 + 6); g.lineTo(W / 2, H / 2 + 3); g.lineTo(W / 2 - 6, H / 2 + 6); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = css.ring; g.lineWidth = 1; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2); g.stroke();
  }
  return { draw, toggle, canvas: cv };
}
