/* Drive mode round 3 (Grok): the EUC jump park as something you can ride. park.js draws the park and is shared
   with The Road, so it is not changed: this file rebuilds the same shapes from the same numbers (the jump loop with
   its two kickers and landings, the pump track, the bus, the arch and canopy posts, the hay and the two parked cars)
   and turns them into a surface you ride on and a few solids. Only read, never drawn. */
import { THREE, roadZ, smooth, clamp, lerp } from './core.js';
import { parkZone, inPark } from './park.js?v=76';

function closedPath(pts, step = 0.25) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const L = curve.getLength(), n = Math.ceil(L / step), S = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    S.push({ s: u * L, x: p.x, z: p.z, tx: t.x, tz: t.z });
  }
  for (let i = 0; i <= n; i++) {
    const a = S[(i - 2 + n) % n], b = S[(i + 2) % n];
    const da = Math.atan2(b.tz, b.tx) - Math.atan2(a.tz, a.tx);
    S[i].k = Math.atan2(Math.sin(da), Math.cos(da)) / (step * 4);
  }
  return { L, S, n, step };
}
function sampleAt(P, s) {
  s = ((s % P.L) + P.L) % P.L;
  const f = s / P.step, i = Math.floor(f), w = f - i, a = P.S[i], b = P.S[Math.min(i + 1, P.n)];
  return { x: lerp(a.x, b.x, w), z: lerp(a.z, b.z, w), tx: lerp(a.tx, b.tx, w), tz: lerp(a.tz, b.tz, w), k: lerp(a.k, b.k, w) };
}
const bump = (s, c, w, h) => { const d = Math.abs(s - c); return d < w ? h * 0.5 * (1 + Math.cos(Math.PI * d / w)) : 0; };

export function createParkRide({ fx, height }) {
  const hAt = (x, z) => height(x, z);
  const zone = parkZone(fx);
  const z0 = roadZ(fx + 60);
  const X = dx => fx + dx, Z = dz => z0 + dz;

  /* the jump loop, exactly as park.js builds it */
  const AX = X(78), AZ = Z(17.6);
  const W = (t, n) => [AX + n, AZ + t];
  const loopA = closedPath([W(0, 0), W(13, 0), W(26, 0), W(30.5, 2.5), W(32.5, 8), W(30.5, 13.5), W(26, 16), W(13, 16), W(0, 16), W(-2.8, 13.5), W(-4, 8), W(-2.8, 2.5)]);
  const sAt = (t, n) => { const [px, pz] = W(t, n); let best = 0, bd = 1e9; loopA.S.forEach(q => { const d = Math.hypot(q.x - px, q.z - pz); if (d < bd) { bd = d; best = q.s; } }); return best; };
  const K1 = { up0: sAt(3.4, 0), lip: sAt(6.2, 0), h: 1.5 }, L1 = { top: sAt(8.9, 0), end: sAt(11.3, 0), h: 1.65 };
  const K2 = { up0: sAt(12.1, 0), lip: sAt(15, 0), h: 2.1 }, L2 = { top: sAt(19.6, 0), end: sAt(23.2, 0), h: 2.3 };
  const rollers = [23, 19.5, 3.5, 0].map(t => sAt(t, 16));
  const TT = { a: sAt(16, 16), b: sAt(14, 16), c: sAt(9, 16), d: sAt(6.8, 16), h: 1.15 };
  function profA(s) {
    if (s >= K1.up0 && s <= K1.lip) return K1.h * Math.pow((s - K1.up0) / (K1.lip - K1.up0), 1.6);
    if (s >= L1.top - 1 && s <= L1.end) return s < L1.top ? L1.h : L1.h * (1 - smooth(L1.top, L1.end, s));
    if (s >= K2.up0 && s <= K2.lip) return K2.h * Math.pow((s - K2.up0) / (K2.lip - K2.up0), 1.6);
    if (s >= L2.top - 1.2 && s <= L2.end) return s < L2.top ? L2.h : L2.h * (1 - smooth(L2.top, L2.end, s));
    if (s >= TT.a && s <= TT.d) return s < TT.b ? TT.h * smooth(TT.a, TT.b, s) : s < TT.c ? TT.h : TT.h * (1 - smooth(TT.c, TT.d, s));
    let r = 0; rollers.forEach(c => { r += bump(s, c, 2.2, 0.6); }); return r;
  }
  const bankA = q => clamp(Math.abs(q.k) * 9, 0, 1) * 1.3;

  /* the pump track */
  const pump = closedPath([[X(19), Z(15.3)], [X(25), Z(13.9)], [X(31), Z(14.9)], [X(34), Z(18.3)], [X(31), Z(22.9)], [X(25), Z(21.7)], [X(19.5), Z(24.1)], [X(16.5), Z(19.7)]]);
  const profP = s => { let r = 0; const n = Math.round(pump.L / 5.2); for (let i = 0; i < n; i++) { const c = (i + 0.5) * pump.L / n; const q = sampleAt(pump, c); if (Math.abs(q.k) < 0.12) r += bump(s, c, 1.6, 0.42); } return r; };
  const profPc = []; for (let s = 0; s <= pump.L + 0.5; s += 0.25) profPc.push(profP(s));
  const profPf = s => { const f = (((s % pump.L) + pump.L) % pump.L) / 0.25, i = Math.floor(f); return lerp(profPc[i], profPc[i + 1] ?? profPc[i], f - i); };
  const bankP = q => clamp(Math.abs(q.k) * 6, 0, 1) * 1.1;

  /* the ribbons as height fields: the same top, banking and skirts as park.js ribbon() */
  const ribbons = [{ id: 'loop', P: loopA, prof: profA, bank: bankA, width: 3.2 }, { id: 'pump', P: pump, prof: profPf, bank: bankP, width: 2.6 }];
  const RC = 2;
  ribbons.forEach(R => {
    R.hash = new Map();
    R.P.S.forEach((q, i) => { if (i === R.P.n) return; const k = Math.floor(q.x / RC) * 65536 + Math.floor(q.z / RC); let a = R.hash.get(k); if (!a) R.hash.set(k, a = []); a.push(i); });
  });
  function onRibbon(R, x, z) {
    const i0 = Math.floor(x / RC), j0 = Math.floor(z / RC);
    let bi = -1, bd = 1e9;
    for (let i = i0 - 3; i <= i0 + 3; i++) for (let j = j0 - 3; j <= j0 + 3; j++) { const a = R.hash.get(i * 65536 + j); if (!a) continue; for (const k of a) { const q = R.P.S[k]; const d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; bi = k; } } }
    if (bi < 0) return null;
    const q = R.P.S[bi];
    const along = (x - q.x) * q.tx + (z - q.z) * q.tz, s = q.s + along;
    const nx = -q.tz, nz = q.tx, n = (x - q.x) * nx + (z - q.z) * nz;
    const p = R.prof(((s % R.P.L) + R.P.L) % R.P.L), bank = R.bank(q), outer = q.k > 0 ? -1 : 1, half = R.width / 2;
    const skirt = 0.7 + p * 1.1 + bank * 0.8;
    if (Math.abs(n) > half + skirt) return null;
    const g = hAt(x, z), top = hAt(q.x, q.z) + 0.18 + p;
    const yl = top + (outer === 1 ? bank : 0), yr = top + (outer === -1 ? bank : 0);
    let y;
    if (Math.abs(n) <= half) y = lerp(yr, yl, (n + half) / (2 * half));
    else { const e = n > 0 ? yl : yr, f = (Math.abs(n) - half) / skirt; y = lerp(e, g - 0.08, f); }
    return { y, s: ((s % R.P.L) + R.P.L) % R.P.L, n, onTop: Math.abs(n) <= half, k: q.k, tx: q.tx, tz: q.tz, id: R.id };
  }

  /* the bus in the gap of kicker two: its front to the road (rotated half a turn), so its body runs along x */
  const [bxc, bzc] = W(17.15, 0), bgy = hAt(bxc, bzc);
  const bus = { x0: bxc - 5.8, x1: bxc + 4.55, z0: bzc - 1.3, z1: bzc + 1.3, top: bgy + 2.87, rx0: bxc - 4.3, rx1: bxc + 4.3 };
  /* solids: oriented boxes in the same shape net-next.js uses { x, z, ux, uz, hl, hw, y0, y1 } */
  const solids = [];
  const addBox = (x, z, hl, hw, y0, y1, yaw = 0, name = '') => solids.push({ x, z, ux: Math.cos(yaw), uz: -Math.sin(yaw), hl, hw, y0, y1, park: name });
  // a wall only below the kicker's flight path: the top 0.7 m is not a wall, so a rider on the way up over the near
  // edge is never stopped; coming down onto it is a landing on the roof
  addBox((bus.x0 + bus.x1) / 2, bzc, (bus.x1 - bus.x0) / 2, 1.3, bgy, bus.top - 0.7, 0, 'bus');
  { const [ax, az] = W(0.9, 6), SPAN = 5.6; [-1, 1].forEach(sd => { const pz = az + sd * (SPAN / 2 + 0.1); addBox(ax, pz, 0.17, 0.17, hAt(ax, pz) - 0.2, hAt(ax, pz) + 5.4, 0, 'arch post'); }); }
  { const [cx, cz] = W(10.2, 8), y0 = hAt(cx, cz); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => addBox(cx + a * 1.5, cz + b * 1.5, 0.08, 0.08, y0, y0 + 2.3, 0, 'canopy post')); }
  [[9.6, -3.4], [9.6, 3.4], [20.6, -3.5], [20.6, 3.5], [22.9, 3.5], [11.5, 19.2], [14, 19.2]].forEach(([t, n]) => { const [x, z] = W(t, n); addBox(x, z, 0.55, 1.1, hAt(x, z) - 0.05, hAt(x, z) + 0.65, 0, 'hay'); });
  [Z(24.6), Z(27.3)].forEach(z => { const x = X(50.5); addBox(x, z, 2.2, 0.95, hAt(x, z), hAt(x, z) + 1.6, 0, 'parked car'); });
  /* spectators under the canopy and the crew by the lot: people you brush past */
  const people = [];
  { const [cx, cz] = W(10.2, 8); [[-1.2, 0.9], [-1.4, -0.6], [-0.2, -1.4], [-0.4, 2.4]].forEach(([a, b]) => people.push({ x: cx + a, z: cz + b })); }
  [[45.8, 20.6], [47.6, 21.6], [45.4, 22.6], [44.2, 21.2]].forEach(([a, b]) => people.push({ x: X(a), z: Z(b) }));

  const has = (x, z) => inPark(fx, x, z);
  /* the surface under (x, z) for something at height yNow: the highest top you can be on (the bus roof only from above) */
  function top(x, z, yNow, rising) {
    let y = Math.max(0, hAt(x, z)) + 0.02, on = 'dirt', info = null;
    if (has(x, z) || near(x, z)) {
      for (const R of ribbons) { const r = onRibbon(R, x, z); if (r && r.y > y) { y = r.y; on = R.id; info = r; } }
      if (x > bus.rx0 && x < bus.rx1 && z > bus.z0 && z < bus.z1 && yNow != null && yNow > bus.top - 0.6 && !rising) { y = bus.top; on = 'bus'; info = null; }
    }
    return { y, on, info };
  }
  const near = (x, z) => x > zone.x0 - 4 && x < zone.x1 + 4 && z > zone.z0 - 4 && z < zone.z1 + 4;
  /* the outline for the small map: the park's own zone, with the road side following the road */
  const outline = [];
  for (let x = zone.x0; x <= zone.x1; x += 4) outline.push({ x, z: Math.max(zone.z0, roadZ(x) + 12.5) });
  outline.push({ x: zone.x1, z: zone.z1 }, { x: zone.x0, z: zone.z1 }, { x: zone.x0, z: Math.max(zone.z0, roadZ(zone.x0) + 12.5) });
  /* the arch: where you ride in from the road */
  const arch = (() => { const [ax, az] = W(0.9, 6); return { x: ax, z: az }; })();
  return { has, near, top, solids, people, bus, outline, arch, zone, K1, K2, L1, L2, loopA, pump, W, AX, AZ, onRibbon: (id, x, z) => onRibbon(ribbons.find(r => r.id === id), x, z), sampleAt };
}
