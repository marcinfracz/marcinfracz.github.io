/* Raceway (round 7): the track, the driving physics and the rival AI. Pure logic, no drawing, so it runs the same in
   the page and in a test harness. Units: metres, seconds, radians. Heading convention matches Drive mode:
   yaw 0 faces +x, forward = (cos yaw, -sin yaw) in (x, z), a positive yaw rate is a left turn. */

/* ---------- the ride classes (Raceway only; the city games keep their own tuning) ----------
   vmax: top speed m/s. A: launch push in m/s^2, so 0 to 95% of top takes 1.83 * vmax / A seconds.
   aLat: the grip limit in a corner (m/s^2). Rmin: tightest turn at walking pace. grip: how fast a slide straightens (1/s).
   drift*: the drift (kart and car) or the lean boost (EUC and bike). rad: collision radius. */
export const CLASSES = {
  kart: { name: 'Kart', vmax: 26, A: 19.8, brake: 21, aLat: 16, Rmin: 4.2, grip: 11, driftGrip: 3.4, driftLat: 1.32, driftMin: 0.6, mass: 1, rad: 1.0, rev: 6, lean: false },
  euc:  { name: 'EUC',  vmax: 22, A: 15.5, brake: 16, aLat: 13.5, Rmin: 3.2, grip: 14, driftGrip: 6.5, driftLat: 1.2, driftMin: 0.65, mass: 0.75, rad: 0.6, rev: 3, lean: true },
  bike: { name: 'Bike', vmax: 18, A: 15.0, brake: 18, aLat: 14.5, Rmin: 3.0, grip: 14, driftGrip: 6.5, driftLat: 1.2, driftMin: 0.65, mass: 0.75, rad: 0.65, rev: 3, lean: true },
  car:  { name: 'Car',  vmax: 30, A: 18.3, brake: 20, aLat: 12.5, Rmin: 5.8, grip: 9.5, driftGrip: 3.8, driftLat: 1.25, driftMin: 0.6, mass: 1.6, rad: 1.35, rev: 7, lean: false }
};
export const RIDE_ORDER = ['kart', 'euc', 'bike', 'car'];

export const BOOST = { small: 0.6, big: 1.0, pad: 0.8, gain: 1.2, tow: 1.08, start: 0.9 };
export const DRIFT_BLUE = 0.7, DRIFT_ORANGE = 1.6;
export const LAPS = 3;

/* ---------- the track: Detroit riverfront figure 8 (about 0.9 km) ----------
   Start and finish straight, a tight left hairpin, the back straight, the bridge over the crossing, a long right-hand
   drift sweeper, a chicane, the crossing underneath, and a boost pad on the exit back onto the straight. */
const RAW = [
  [0, 0], [35, 35], [75, 57], [130, 62], [190, 62], [238, 58], [266, 44], [278, 20], [268, -4], [242, -16],
  [195, -14], [150, -24], [108, -44], [72, -58], [42, -44], [20, -20], [0, 0], [-22, 22], [-48, 44], [-82, 62],
  [-124, 66], [-164, 50], [-186, 18], [-186, -18], [-168, -50], [-136, -70], [-106, -78], [-88, -79], [-74, -74],
  [-62, -68], [-48, -62], [-31, -42], [-15, -15]
];
const SCALE = 0.8;
export const HALF_W = 6.2, RUNOFF = 5.4, BRIDGE_H = 6.6, KERB_W = 1.1;

function catmull(pts, n) {
  // centripetal Catmull-Rom through a closed list; returns a dense polyline
  const out = [], N = pts.length;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
    const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-3;
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    for (let k = 0; k < n; k++) {
      const t = t1 + (t2 - t1) * k / n;
      const L = (a, b, ta, tb) => [(tb - t) / (tb - ta) * a[0] + (t - ta) / (tb - ta) * b[0], (tb - t) / (tb - ta) * a[1] + (t - ta) / (tb - ta) * b[1]];
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  return out;
}

const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export { wrapA, clamp };

export function buildTrack(ds = 0.5) {
  const dense = catmull(RAW.map(p => [p[0] * SCALE, p[1] * SCALE]), 60);
  // arc-length resample
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) { const a = dense[i - 1], b = dense[i % dense.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = cum[cum.length - 1];
  const n = Math.round(total / ds), step = total / n;
  const X = new Float64Array(n), Z = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = i * step;
    while (cum[j + 1] < s) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length], f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    X[i] = a[0] + (b[0] - a[0]) * f; Z[i] = a[1] + (b[1] - a[1]) * f;
  }
  // put s = 0 on the start line: the middle of the start straight, heading east
  let best = 0, bd = 1e9;
  for (let i = 0; i < n; i++) { const d = Math.hypot(X[i] - 118 * SCALE, Z[i] - 62 * SCALE); if (d < bd) { bd = d; best = i; } }
  const rot = a => { const o = new Float64Array(n); for (let i = 0; i < n; i++) o[i] = a[(i + best) % n]; return o; };
  const T = { n, ds: step, L: total, X: rot(X), Z: rot(Z) };
  T.YAW = new Float64Array(n); T.K = new Float64Array(n); T.H = new Float64Array(n); T.B = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    T.YAW[i] = Math.atan2(-(T.Z[b] - T.Z[a]), T.X[b] - T.X[a]);
  }
  for (let i = 0; i < n; i++) {
    const a = (i - 2 + n) % n, b = (i + 2) % n;
    T.K[i] = wrapA(T.YAW[b] - T.YAW[a]) / (4 * step);
  }
  smoothArr(T.K, 6);
  // the bridge: the pass through the crossing that heads south-west is lifted over the other one
  let bi = -1, bdist = 1e9;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(T.X[i], T.Z[i]);
    const fx = Math.cos(T.YAW[i]), fz = -Math.sin(T.YAW[i]);
    if (fx < 0 && fz > 0 && d < bdist) { bdist = d; bi = i; }
  }
  let gi = -1, gd = 1e9;
  for (let i = 0; i < n; i++) { const d = Math.hypot(T.X[i], T.Z[i]); const fx = Math.cos(T.YAW[i]), fz = -Math.sin(T.YAW[i]); if (fx > 0 && fz > 0 && d < gd) { gd = d; gi = i; } }
  T.bridgeS = bi * step; T.underS = gi * step;
  for (let i = 0; i < n; i++) {
    const dsb = Math.abs(sdiff(i * step, T.bridgeS, total));
    let h = 0;
    if (dsb < 16) h = BRIDGE_H; else if (dsb < 72) h = BRIDGE_H * 0.5 * (1 + Math.cos(Math.PI * (dsb - 16) / 56));
    T.H[i] = h;
    T.B[i] = HALF_W + RUNOFF + (HALF_W + 0.7 - (HALF_W + RUNOFF)) * clamp(h / 1.2, 0, 1);   // the barrier: run-off on the ground, a parapet on the bridge
  }
  // kerbs on the apexes and exits of every real corner
  T.KERB = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (Math.abs(T.K[i]) > 1 / 70 && T.H[i] < 0.2) T.KERB[i] = 1;
  // features (by distance along the lap)
  T.features = findFeatures(T);
  T.pads = [{ s: 196, len: 9, d: 0, w: 4.2 }];
  T.line = racingLine(T);
  return T;
}

export function sdiff(a, b, L) { let d = a - b; d -= Math.round(d / L) * L; return d; }
function smoothArr(a, r) {
  const n = a.length, c = Float64Array.from(a);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = -r; k <= r; k++) s += c[(i + k + n) % n]; a[i] = s / (2 * r + 1); }
}

function findFeatures(T) {
  // named corners from the curvature, for the HUD and the AI's mistake rolls
  const out = [], n = T.n;
  let i = 0;
  // start scanning from a straight bit
  while (Math.abs(T.K[i]) > 1 / 120) i++;
  const start = i;
  let k = 0;
  do {
    const j = (start + k) % n;
    if (Math.abs(T.K[j]) > 1 / 90) {
      let e = k, turn = 0, peak = 0;
      while (e < n && Math.abs(T.K[(start + e) % n]) > 1 / 140) { const q = (start + e) % n; turn += T.K[q] * T.ds; peak = Math.max(peak, Math.abs(T.K[q])); e++; }
      if (Math.abs(turn) > 0.25) out.push({ s0: ((start + k) % n) * T.ds, s1: ((start + e) % n) * T.ds, turn, peak, dir: Math.sign(turn) });
      k = e;
    } else k++;
  } while (k < n);
  out.sort((a, b) => a.s0 - b.s0);
  return out;
}

/* the racing line: an elastic band pulled tight inside the kerbs, so it goes outside, apex, outside on its own */
function racingLine(T) {
  const step = 4, m = Math.floor(T.n / step), lim = HALF_W - 1.3;
  const off = new Float64Array(m), px = new Float64Array(m), pz = new Float64Array(m);
  const nx = new Float64Array(m), nz = new Float64Array(m), cx = new Float64Array(m), cz = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const q = i * step, y = T.YAW[q];
    cx[i] = T.X[q]; cz[i] = T.Z[q]; nx[i] = -Math.sin(y); nz[i] = -Math.cos(y);   // left normal
  }
  for (let it = 0; it < 900; it++) {
    for (let i = 0; i < m; i++) { px[i] = cx[i] + nx[i] * off[i]; pz[i] = cz[i] + nz[i] * off[i]; }
    for (let i = 0; i < m; i++) {
      const a = (i - 1 + m) % m, b = (i + 1) % m;
      const mx = (px[a] + px[b]) / 2 - px[i], mz = (pz[a] + pz[b]) / 2 - pz[i];
      off[i] = clamp(off[i] + 0.5 * (mx * nx[i] + mz * nz[i]), -lim, lim);
    }
  }
  // back to full resolution, with the line's own curvature for the speed plan
  const full = new Float64Array(T.n);
  for (let i = 0; i < T.n; i++) { const f = i / step, a = Math.floor(f) % m, b = (a + 1) % m, t = f - Math.floor(f); full[i] = off[a] + (off[b] - off[a]) * t; }
  smoothArr(full, 4);
  const LX = new Float64Array(T.n), LZ = new Float64Array(T.n);
  for (let i = 0; i < T.n; i++) { const y = T.YAW[i]; LX[i] = T.X[i] - Math.sin(y) * full[i]; LZ[i] = T.Z[i] - Math.cos(y) * full[i]; }
  const LK = new Float64Array(T.n);
  for (let i = 0; i < T.n; i++) {
    const a = (i - 6 + T.n) % T.n, c = (i + 6) % T.n;
    const y1 = Math.atan2(-(LZ[i] - LZ[a]), LX[i] - LX[a]), y2 = Math.atan2(-(LZ[c] - LZ[i]), LX[c] - LX[i]);
    const d = Math.hypot(LX[c] - LX[a], LZ[c] - LZ[a]) / 2 || 1;
    LK[i] = wrapA(y2 - y1) / d;
  }
  smoothArr(LK, 5);
  return { off: full, K: LK };
}

/* where is a point on the track: hill-climb from the last known sample (the two passes at the crossing never mix,
   because a racer only ever walks to a neighbouring sample) */
export function locate(T, x, z, hint) {
  const n = T.n;
  let i = ((Math.round(hint / T.ds) % n) + n) % n;
  const d2 = k => { const dx = T.X[k] - x, dz = T.Z[k] - z; return dx * dx + dz * dz; };
  let cur = d2(i);
  for (let g = 0; g < 400; g++) {
    const a = (i + 1) % n, b = (i - 1 + n) % n, da = d2(a), db = d2(b);
    if (da < cur && da <= db) { i = a; cur = da; } else if (db < cur) { i = b; cur = db; } else break;
  }
  // project onto the segment for a fractional s
  const y = T.YAW[i], fx = Math.cos(y), fz = -Math.sin(y);
  const dx = x - T.X[i], dz = z - T.Z[i];
  const along = dx * fx + dz * fz;
  const lat = dx * (-Math.sin(y)) + dz * (-Math.cos(y));   // + is left of the track direction
  let s = i * T.ds + along; s = ((s % T.L) + T.L) % T.L;
  return { i, s, d: lat };
}

export function sample(T, s) {
  const n = T.n, f = (((s % T.L) + T.L) % T.L) / T.ds, a = Math.floor(f) % n, b = (a + 1) % n, t = f - Math.floor(f);
  const yaw = T.YAW[a] + wrapA(T.YAW[b] - T.YAW[a]) * t;
  return { x: T.X[a] + (T.X[b] - T.X[a]) * t, z: T.Z[a] + (T.Z[b] - T.Z[a]) * t, h: T.H[a] + (T.H[b] - T.H[a]) * t, yaw,
    k: T.K[a] + (T.K[b] - T.K[a]) * t, B: T.B[a], line: T.line.off[a] + (T.line.off[b] - T.line.off[a]) * t, i: a };
}

/* ---------- a racer ---------- */
export function makeRacer(T, cls, s, d, extra = {}) {
  const p = sample(T, s);
  const r = Object.assign({
    cls, C: CLASSES[cls], x: p.x - Math.sin(p.yaw) * d, z: p.z - Math.cos(p.yaw) * d, y: p.h, yaw: p.yaw, vx: 0, vz: 0, r: 0,
    s, d, lap: -1, half: true, steer: 0, u: 0, w: 0,
    drifting: false, driftDir: 0, charge: 0, boostT: 0, boostGain: 1, towT: 0, tow: false, padT: 0,
    surface: 'road', kerb: false, bump: 0, wrongT: 0, stuckT: 0, finished: false, finishT: 0, lapStart: 0, lapTimes: [], bestLap: Infinity,
    holdT: 0, ghost: false
  }, extra);
  r.px = r.x; r.pz = r.z; r.py = r.y; r.pyaw = r.yaw;
  return r;
}

/* one fixed step of the physics. input: { gas 0..1, brake 0..1, steer -1..1 (+ left), drift bool } */
export function stepRacer(T, R, inp, dt, ev) {
  const C = R.C;
  R.px = R.x; R.pz = R.z; R.py = R.y; R.pyaw = R.yaw;
  if (R.holdT > 0) { R.holdT -= dt; inp = { gas: 0, brake: 1, steer: inp.steer, drift: false }; }
  let fx = Math.cos(R.yaw), fz = -Math.sin(R.yaw);
  let u = R.vx * fx + R.vz * fz;
  // surface
  const loc = locate(T, R.x, R.z, R.s);
  const B = T.B[loc.i], ad = Math.abs(loc.d);
  const onGrass = ad > HALF_W + 0.35 && T.H[loc.i] < 0.3;
  R.kerb = !onGrass && ad > HALF_W - KERB_W && T.KERB[loc.i] === 1;
  R.surface = onGrass ? 'grass' : 'road';
  // boost bookkeeping
  if (R.boostT > 0) R.boostT -= dt;
  const boosting = R.boostT > 0;
  let vmaxE = C.vmax * (boosting ? BOOST.gain : 1) * (R.tow ? BOOST.tow : 1);
  let grip = C.grip, aLat = C.aLat, drag = inp.gas > 0 ? 0.08 + 0.0003 * u * u : 0.45 + 0.0018 * u * u;
  if (onGrass) { vmaxE *= 0.58; grip *= 0.55; aLat *= 0.7; drag += 3.2; }
  // drift or lean boost
  const st = inp.steer;
  if (inp.drift && !R.drifting && Math.abs(st) > 0.3 && u > 9 && !onGrass) { R.drifting = true; R.driftDir = Math.sign(st); R.charge = 0; }
  if (R.drifting) {
    if (!inp.drift || u < 6 || onGrass) {
      if (R.charge >= DRIFT_ORANGE) { R.boostT = BOOST.big; if (ev) ev.push({ t: 'boost', r: R, big: true }); }
      else if (R.charge >= DRIFT_BLUE) { R.boostT = BOOST.small; if (ev) ev.push({ t: 'boost', r: R, big: false }); }
      R.drifting = false; R.charge = 0;
    } else R.charge += dt * (0.75 + 0.35 * Math.max(0, st * R.driftDir));
  }
  // yaw: the target rate is limited by the tightest turn at low speed and by grip at speed
  const sp = Math.max(Math.abs(u), 0.01);
  let rmax = Math.min(sp / C.Rmin, aLat / sp);
  let rT;
  if (R.drifting) {
    const k = C.driftMin + (1 - C.driftMin) * clamp((st * R.driftDir + 1) / 2, 0, 1) * 1.0;
    rT = R.driftDir * k * Math.min(sp / C.Rmin, aLat * C.driftLat / sp);
    grip = C.driftGrip;
  } else rT = st * rmax * Math.sign(u || 1);
  R.r += (rT - R.r) * Math.min(1, dt * 14);
  R.yaw += R.r * dt;
  fx = Math.cos(R.yaw); fz = -Math.sin(R.yaw);
  const rx = Math.sin(R.yaw), rz = Math.cos(R.yaw);
  u = R.vx * fx + R.vz * fz;
  let w = R.vx * rx + R.vz * rz;
  w *= Math.exp(-grip * dt);
  // engine, brakes, drag
  let a = 0;
  if (inp.gas > 0 && u > -0.5) a += inp.gas * C.A * Math.max(-0.6, 1 - (u / vmaxE) * (u / vmaxE));
  if (inp.brake > 0) {
    if (u > 0.4) a -= inp.brake * C.brake;
    else a -= inp.brake * C.A * 0.35 * (u > -C.rev ? 1 : 0);
  }
  if (u > 0) a -= drag; else if (u < 0) a += drag;
  if (u > vmaxE) a -= (u - vmaxE) * (onGrass ? 3 : 1.2);   // over the limit (after a boost or off the grass) bleeds off smoothly
  const u0 = u;
  u += a * dt;
  if (inp.gas === 0 && inp.brake === 0 && Math.abs(u) < 0.3) u = 0;
  if (u0 > 0 && u < 0 && inp.brake > 0 && u0 > 0.4) u = 0;   // stop, then reverse on a fresh press
  R.vx = fx * u + rx * w; R.vz = fz * u + rz * w;
  R.x += R.vx * dt; R.z += R.vz * dt;
  // walls: glance off, never a dead stop
  const L2 = locate(T, R.x, R.z, loc.s);
  const Bw = T.B[L2.i] - C.rad;
  if (Math.abs(L2.d) > Bw) {
    const y = T.YAW[L2.i], nlx = -Math.sin(y), nlz = -Math.cos(y);
    const sg = Math.sign(L2.d), push = Math.abs(L2.d) - Bw;
    R.x -= nlx * sg * push; R.z -= nlz * sg * push;
    const ox = nlx * sg, oz = nlz * sg;                 // outward
    const vn = R.vx * ox + R.vz * oz;
    if (vn > 0) {
      const tx = R.vx - ox * vn, tz = R.vz - oz * vn, vt = Math.hypot(tx, tz);
      const ang = Math.atan2(vn, vt);
      const keep = ang > 1.05 ? 0.42 : 0.95;
      R.vx = tx * keep - ox * vn * 0.25; R.vz = tz * keep - oz * vn * 0.25;
      // turn the nose along the wall a little
      const ty = Math.atan2(-tz, tx);
      R.yaw += wrapA(ty - R.yaw) * (ang > 1.05 ? 0.15 : 0.35);
      R.r *= 0.5;
      if (R.drifting) { R.drifting = false; R.charge = 0; }
      R.bump = Math.max(R.bump, clamp(vn / 10, 0.15, 1));
      if (ev) ev.push({ t: 'wall', r: R, v: vn });
    }
  }
  const L3 = locate(T, R.x, R.z, L2.s);
  // progress, laps and the halfway check (no shortcuts)
  const prev = R.s;
  R.s = L3.s; R.d = L3.d;
  const ii = L3.i, ni = (ii + 1) % T.n;
  const t = (L3.s / T.ds) - Math.floor(L3.s / T.ds);
  R.y = T.H[ii] + (T.H[ni] - T.H[ii]) * t;
  const jump = R.s - prev;
  if (jump < -T.L / 2) { if (R.half) { R.lap++; R.half = false; if (ev) ev.push({ t: 'lap', r: R }); } else R.lap++; }
  else if (jump > T.L / 2) R.lap--;
  if (Math.abs(sdiff(R.s, T.L * 0.5, T.L)) < 40) R.half = true;
  R.u = R.vx * fx + R.vz * fz; R.w = R.vx * rx + R.vz * rz;
  // wrong way
  const ty = T.YAW[ii], along = R.vx * Math.cos(ty) - R.vz * Math.sin(ty);
  R.wrongT = along < -2 ? R.wrongT + dt : Math.max(0, R.wrongT - dt * 2);
  R.stuckT = Math.abs(R.u) < 1.2 && inp.gas > 0 ? R.stuckT + dt : 0;
  // boost pads
  for (const pd of T.pads || []) {
    const ds = sdiff(R.s, pd.s, T.L);
    if (ds > 0 && ds < pd.len && Math.abs(R.d - pd.d) < pd.w / 2 + 0.3 && R.padT <= 0) { R.boostT = Math.max(R.boostT, BOOST.pad); R.padT = 0.5; if (ev) ev.push({ t: 'pad', r: R }); }
  }
  if (R.padT > 0) R.padT -= dt;
  R.bump *= Math.exp(-dt * 6);
}

export function progress(T, R) { return R.lap * T.L + R.s; }

/* bumps between racers: soft, no spins, mass matters; the bridge and the road under it never touch */
export function collide(rs) {
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i], b = rs[j];
    if (a.ghost || b.ghost || Math.abs(a.y - b.y) > 2) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.C.rad + b.C.rad;
    if (d >= m || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, ov = m - d, ma = a.C.mass, mb = b.C.mass;
    a.x -= nx * ov * mb / (ma + mb); a.z -= nz * ov * mb / (ma + mb);
    b.x += nx * ov * ma / (ma + mb); b.z += nz * ov * ma / (ma + mb);
    const vr = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (vr < 0) {
      const J = -(1.3) * vr / (1 / ma + 1 / mb);
      a.vx -= J / ma * nx; a.vz -= J / ma * nz; b.vx += J / mb * nx; b.vz += J / mb * nz;
      a.bump = Math.max(a.bump, 0.3); b.bump = Math.max(b.bump, 0.3);
    }
  }
}

/* slipstream: within 9 m behind another racer, close to its line, for a moment */
export function slipstream(T, rs, dt) {
  for (const a of rs) {
    let behind = false;
    if (a.u > 10) for (const b of rs) {
      if (a === b || b.ghost || Math.abs(a.y - b.y) > 2) continue;
      const gap = sdiff(b.s, a.s, T.L);
      if (gap > 1.5 && gap < 9 && Math.abs(b.d - a.d) < 1.7) { behind = true; break; }
    }
    a.towT = behind ? Math.min(a.towT + dt, 2) : Math.max(0, a.towT - dt * 3);
    const was = a.tow;
    a.tow = a.towT > 0.6;
    a.towNew = a.tow && !was;
  }
}

/* ---------- the rivals ---------- */
export const RIVALS = [
  { name: 'Spec Sheet', note: 'Perfect line, brakes early', color: '#4C7BB8', pace: 1.0, brakeEarly: 0.92, mistakes: 0.03, aggro: 0.2, line: 0 },
  { name: 'Torque Steer', note: 'Late braker, makes mistakes', color: '#C9473A', pace: 0.985, brakeEarly: 1.12, mistakes: 0.16, aggro: 0.5, line: 0.4 },
  { name: 'Lean Six', note: 'Never wastes a corner', color: '#2F7D5B', pace: 0.975, brakeEarly: 1.0, mistakes: 0.04, aggro: 0.25, line: -0.3 },
  { name: 'The Intern', note: 'Slow, but never gives up', color: '#8C6BB8', pace: 0.9, brakeEarly: 0.9, mistakes: 0.08, aggro: 0.1, line: 0.8 },
  { name: 'The Deck Demander', note: 'Blocks on the straights', color: '#B8923A', pace: 0.955, brakeEarly: 1.0, mistakes: 0.06, aggro: 0.9, line: -0.6 }
];
export const DIFFS = {
  rookie: { name: 'Rookie', grip: 0.8, engine: 0.89, band: true },
  pro: { name: 'Pro', grip: 0.9, engine: 0.96, band: false },
  legend: { name: 'Legend', grip: 1.0, engine: 1.015, band: false }
};

/* the speed plan along the racing line for one driver: corner speeds from grip, then braking zones walked backwards */
export function speedPlan(T, C, gripF, brakeF) {
  const n = T.n, v = new Float64Array(n), K = T.line.K;
  for (let i = 0; i < n; i++) v[i] = Math.min(C.vmax * 1.3, Math.sqrt(C.aLat * gripF / Math.max(Math.abs(K[i]), 1e-5)));
  const dec = C.brake * 0.8 * brakeF;
  for (let pass = 0; pass < 2; pass++) for (let k = 2 * n - 1; k >= 0; k--) {
    const i = k % n, j = (i + 1) % n;
    v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * dec * T.ds));
  }
  return v;
}

export function makeAI(T, R, prof, diff, rng) {
  const C = R.C;
  const pace = prof.pace * diff.engine;
  const ai = {
    prof, diff, R, rng,
    plan: speedPlan(T, C, diff.grip * (0.97 + 0.03 * prof.pace), prof.brakeEarly),
    planMistake: speedPlan(T, C, diff.grip * 1.16, prof.brakeEarly * 1.2),
    pace, react: 0.08 + rng() * 0.22, avoid: 0, avoidT: 0, mistakeUntil: -1, lastFeature: -1, turbo: 0, wob: rng() * 10
  };
  return ai;
}

/* one AI decision, same inputs as a player: no extra grip, no extra power (Rookie aside, which eases off when far ahead) */
export function driveAI(T, ai, all, player, time) {
  const R = ai.R, C = R.C;
  const u = Math.max(R.u, 0);
  // the corner ahead: roll for a mistake once per corner
  const fi = T.features.findIndex(f => { const d = sdiff(f.s0, R.s, T.L); return d > 0 && d < 45; });
  if (fi >= 0 && fi !== ai.lastFeature) { ai.lastFeature = fi; ai.mistakeUntil = ai.rng() < ai.prof.mistakes * (ai.diff === DIFFS.rookie ? 1.6 : ai.diff === DIFFS.legend ? 0.5 : 1) ? R.s + 70 : -1; }
  const mistake = ai.mistakeUntil >= 0 && sdiff(ai.mistakeUntil, R.s, T.L) > 0;
  // avoid or pass whoever is right ahead; block whoever is right behind on a straight
  ai.avoidT -= 1 / 120;
  let want = 0;
  for (const o of all) {
    if (o === R || o.ghost || Math.abs(o.y - R.y) > 2) continue;
    const gap = sdiff(o.s, R.s, T.L);
    if (gap > 0 && gap < 14 && Math.abs(o.d - R.d) < 2.4 && u > o.u - 0.5) {
      const room = (side) => side > 0 ? HALF_W - 1 - o.d : o.d + HALF_W - 1;
      const side = room(1) > room(-1) ? 1 : -1;
      want = o.d + side * 2.9 - (T.line.off[Math.floor(R.s / T.ds) % T.n] + ai.prof.line);
      ai.avoidT = 0.6;
    }
    if (o === player && gap < 0 && gap > -12 && ai.prof.aggro > 0.5 && Math.abs(T.K[Math.floor(R.s / T.ds) % T.n]) < 1 / 200) {
      want = (o.d - (T.line.off[Math.floor(R.s / T.ds) % T.n] + ai.prof.line)) * 0.6 * ai.prof.aggro;
      ai.avoidT = 0.4;
    }
  }
  if (ai.avoidT <= 0) want = 0;
  ai.avoid += (want - ai.avoid) * 0.04;
  // aim at a point on the line ahead
  const look = 5 + u * 0.42;
  const sa = R.s + look, p = sample(T, sa);
  const off = clamp(p.line + ai.prof.line + ai.avoid + Math.sin(time * 0.3 + ai.wob) * 0.25, -HALF_W + 1, HALF_W - 1);
  const tx = p.x - Math.sin(p.yaw) * off, tz = p.z - Math.cos(p.yaw) * off;
  const ang = Math.atan2(-(tz - R.z), tx - R.x);
  const err = wrapA(ang - R.yaw);
  const sp = Math.max(u, 2), rmax = Math.min(sp / C.Rmin, C.aLat / sp);
  const rWant = 2 * u * Math.sin(err) / Math.max(look, 1);   // pure pursuit
  let steer = clamp(rWant / rmax + (rWant - R.r) * 0.04, -1, 1);
  if (R.u < 0) steer = -steer;
  // speed: the plan a little ahead, scaled by this driver's pace
  const plan = mistake ? ai.planMistake : ai.plan;
  const i0 = Math.floor(R.s / T.ds) % T.n;
  let vt = Infinity;
  for (let k = 0; k <= 8; k++) vt = Math.min(vt, plan[(i0 + k * 2) % T.n]);
  vt *= ai.pace;
  if (R.finished) vt = Math.min(vt, C.vmax * 0.55);   // a cool-down lap after the flag
  vt = Math.min(vt, C.vmax * ai.pace * (R.boostT > 0 ? BOOST.gain : 1) * (R.tow ? BOOST.tow : 1) + 0.5);
  // Rookie only: ease off when far ahead of the player
  if (ai.diff.band && player && progress(T, R) - progress(T, player) > 60) vt *= 0.94;
  let gas = 0, brake = 0;
  if (u < vt - 0.3) gas = 1; else if (u > vt + 0.8) brake = clamp((u - vt) / 4, 0.2, 1); else gas = 0.35;
  // a mini-turbo out of long corners, as often as this driver's pace earns it
  const kNow = Math.abs(T.line.K[i0]);
  if (kNow > 1 / 45 && u > 11) ai.turbo += 1 / 120; else {
    if (ai.turbo > 0.9 && R.C === ai.R.C && ai.rng() < 0.35 + 0.5 * ai.prof.pace * ai.diff.engine - (ai.diff === DIFFS.rookie ? 0.3 : 0)) { R.boostT = ai.turbo > 1.8 ? BOOST.big : BOOST.small; }
    ai.turbo = 0;
  }
  // stuck against something: back up and try again
  if (R.stuckT > 1.5) { ai.backT = 0.9; R.stuckT = 0; }
  if (ai.backT > 0) { ai.backT -= 1 / 120; return { gas: 0, brake: 1, steer: -steer, drift: false }; }
  return { gas, brake, steer, drift: false, sparks: kNow > 1 / 45 && u > 11 };
}

/* the grid: the player starts 4th of 6, two by two, staggered */
export function gridSlots(T, count = 6) {
  const out = [];
  for (let k = 0; k < count; k++) out.push({ s: T.L - 9 - k * 6.5, d: (k % 2 ? -2.6 : 2.6) });
  return out;
}

export function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
