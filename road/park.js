/* v74: an electric unicycle jump park in the open field beside the road at the End.
   A jump line with two kickers (the second one over a parked school bus, a nod to the
   bus jumps at EUC games), a pump track with banked berms, an entrance arch, a canopy
   and a few spectators. Riders stand on single wheels with full-face helmets and pads:
   jumpers loop the jump line doing tricks, cruisers flow round the pump track.
   Every rider is always there and keeps moving round a closed loop; the far end of the
   jump loop runs out of frame, so riders leave and come back across the edge of the view,
   never popping in or out. Everything is placed in world coordinates. */
import { THREE, mat, mesh, at, box, cyl, sph, grp, merge, bx, cy, canvasTex, roadZ, smooth, clamp, lerp } from './core.js';
import * as CORE from './core.js';

/* where the park sits, measured from the End stop: used here and by world.js to keep trees off it */
export function parkZone(fx) {
  const z0 = roadZ(fx + 60);
  return { x0: fx - 3, x1: fx + 106, z0: z0 + 11.5, z1: z0 + 74 };
}
export function inPark(fx, x, z) { const p = parkZone(fx); return x > p.x0 && x < p.x1 && z > Math.max(p.z0, roadZ(x) + 12.5) && z < p.z1; }

const PAL = {
  day: { dirt: '#CDBDA2', berm: '#BFAE92', wood: '#B79A77', bus: '#E2B647', busDark: '#4A5361', hay: '#D9C690', carA: '#7E8B9C', carB: '#C9CDD2', glass: '#3A4350', gravel: '#C4C2BC' },
  dusk: { dirt: '#3F3A33', berm: '#38332D', wood: '#4A4036', bus: '#7D6730', busDark: '#1A1F26', hay: '#4F4838', carA: '#2F3742', carB: '#4A4F56', glass: '#141A21', gravel: '#33343A' }
};

/* a cylinder from point a to point b, as plain geometry */
function seg(a, b, r0, r1 = r0, n = 7) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, n);
  g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function wheelParts(parts) {
  parts.push([new THREE.CylinderGeometry(0.3, 0.3, 0.15, 14).rotateX(Math.PI / 2).translate(0, 0.3, 0), 0.22]);
  parts.push([bx(0.42, 0.5, 0.27, 0, 0.17, 0), [0.3, 0.33, 0.4]]);
  parts.push([bx(0.3, 0.05, 0.12, 0, 0.67, 0), 0.3]);
  [-1, 1].forEach(s => parts.push([bx(0.22, 0.035, 0.12, 0.02, 0.15, s * 0.21), 0.4]));
}
/* One rider on an electric unicycle, facing +x. pose: 'ride' (arms in close), 'grab' (tucked, hand on the wheel), 'cruise' (upright, commuter). */
function riderGeo(pose, helm, KIT) {
  const TIRE = 0.22, SHELL = [0.3, 0.33, 0.4], PEDAL = 0.4, PANTS = [0.3, 0.33, 0.4], PAD = 0.2, VISOR = 0.12, SKIN = [0.95, 0.82, 0.7];
  const parts = [];
  const standing = pose.startsWith('stand');
  // the wheel: a knobby tyre with a tall shell on both sides, a handle on top and fold-out pedals
  if (!standing) wheelParts(parts);
  if (pose === 'wheel') return merge(parts);
  const legs = (knee, hip, foot = 0.19) => [-1, 1].forEach(s => {
    const f = V(0.02, foot, s * 0.2), k = V(knee[0], knee[1], s * 0.17), h = V(hip[0], hip[1], s * 0.11);
    parts.push([seg(f, k, 0.075, 0.085), PANTS]);
    parts.push([seg(k, h, 0.09, 0.1), PANTS]);
    parts.push([new THREE.BoxGeometry(0.12, 0.17, 0.13).translate(k.x + 0.05, k.y - 0.04, k.z), PAD]);   // knee pad
    parts.push([bx(0.2, 0.08, 0.11, 0.04, foot - 0.02, s * 0.2), 0.25]);                                 // shoe
  });
  const torso = (hip, sh, r = 0.17) => { parts.push([seg(V(hip[0], hip[1], 0), V(sh[0], sh[1], 0), r * 0.92, r), KIT]); parts.push([new THREE.BoxGeometry(0.26, 0.32, 0.36).translate((hip[0] + sh[0]) / 2 + 0.05, (hip[1] + sh[1]) / 2 + 0.06, 0), KIT]); };
  const arm = (sh, el, hand, s) => { const a = V(sh[0], sh[1], s * 0.2), e = V(el[0], el[1], s * el[2]), h = V(hand[0], hand[1], s * hand[2]); parts.push([seg(a, e, 0.055), KIT]); parts.push([seg(e, h, 0.05), KIT]); parts.push([new THREE.BoxGeometry(0.1, 0.12, 0.12).translate(e.x, e.y, e.z), PAD]); parts.push([new THREE.SphereGeometry(0.055, 6, 5).translate(h.x, h.y, h.z), 0.25]); };
  const fullFace = (x, y) => { parts.push([new THREE.SphereGeometry(0.17, 12, 9).translate(x, y, 0), helm]); parts.push([bx(0.1, 0.12, 0.24, x + 0.14, y - 0.17, 0), helm]); parts.push([bx(0.05, 0.08, 0.2, x + 0.155, y - 0.02, 0), VISOR]); parts.push([bx(0.12, 0.03, 0.2, x + 0.17, y + 0.1, 0), helm]); };
  if (pose === 'cruise') {
    legs([0.1, 0.6], [-0.02, 0.98]);
    torso([-0.02, 0.98], [0.02, 1.48], 0.16);
    [-1, 1].forEach(s => arm([0.02, 1.43], [0.0, 1.15, 0.28], [0.06, 0.92, 0.27], s));
    parts.push([bx(0.18, 0.36, 0.3, -0.2, 1.08, 0), 0.45]);                       // backpack
    parts.push([new THREE.SphereGeometry(0.13, 10, 7).translate(0.04, 1.66, 0), SKIN]);
    parts.push([new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0.03, 1.69, 0), helm]);
  } else if (standing) {
    legs([0.03, 0.5], [0.0, 0.94], 0.04);
    torso([0.0, 0.94], [0.0, 1.44], 0.17);
    if (pose === 'standHelm') {                                                      // helmet in hand at the hip
      arm([0.0, 1.39], [-0.02, 1.12, 0.27], [0.03, 0.88, 0.26], -1);
      arm([0.0, 1.39], [0.08, 1.12, 0.3], [0.2, 1.0, 0.34], 1);
      parts.push([new THREE.SphereGeometry(0.17, 12, 9).translate(0.24, 0.98, 0.5), helm]); parts.push([bx(0.05, 0.08, 0.2, 0.4, 0.98, 0.5), VISOR]);
      parts.push([new THREE.SphereGeometry(0.13, 10, 7).translate(0.02, 1.62, 0), SKIN]);
      parts.push([new THREE.SphereGeometry(0.14, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.45).translate(0.0, 1.65, 0), 0.25]);   // hair
    } else {                                                                          // helmet on, arms down or folded
      if (pose === 'standFold') [-1, 1].forEach(s => arm([0.0, 1.39], [0.1, 1.12, 0.24], [0.2, 1.24, -0.06 * s], s));
      else [-1, 1].forEach(s => arm([0.0, 1.39], [-0.02, 1.12, 0.26], [0.02, 0.87, 0.25], s));
      fullFace(0.04, 1.63);
    }
  } else if (pose === 'grab') {
    legs([0.26, 0.6], [-0.12, 0.74]);
    torso([-0.12, 0.74], [0.16, 1.16], 0.17);
    arm([0.16, 1.13], [0.22, 0.86, 0.14], [0.12, 0.7, 0.04], 1);                     // hand on the wheel's handle
    arm([0.16, 1.13], [0.2, 0.93, 0.27], [0.31, 0.82, 0.21], -1);                   // the other arm tucked in
    fullFace(0.24, 1.36);
  } else {
    legs([0.17, 0.58], [-0.06, 0.92]);
    torso([-0.06, 0.92], [0.08, 1.4], 0.17);
    [-1, 1].forEach(s => arm([0.08, 1.36], [0.13, 1.1, 0.25], [0.25, 0.98, 0.19], s));   // arms in close and relaxed, as real riders hold them
    fullFace(0.12, 1.6);
  }
  return merge(parts);
}

/* sample a smooth closed path through (x, z) points, by arc length */
function closedPath(pts, step = 0.25) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z)), true, 'centripetal');
  const L = curve.getLength(), n = Math.ceil(L / step), S = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    S.push({ s: u * L, x: p.x, z: p.z, tx: t.x, tz: t.z });
  }
  // signed curvature from the turn of the tangent
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

/* a dirt ribbon along a path: the top follows the profile (rollers, kickers), the outer edge banks up in turns */
function ribbon(P, hAt, prof, bankOf, width, material) {
  const pos = [], idx = [];
  P.S.forEach((q, i) => {
    const nx = -q.tz, nz = q.tx;                   // left normal
    const bank = bankOf(q), outer = q.k > 0 ? -1 : 1;  // turning left: outer edge is the right side
    const g = hAt(q.x, q.z), top = g + 0.18 + prof(q.s);
    const half = width / 2, skirt = 0.7 + prof(q.s) * 1.1 + bank * 0.8;
    const yl = top + (outer === 1 ? bank : 0), yr = top + (outer === -1 ? bank : 0);
    pos.push(q.x + nx * (half + skirt), hAt(q.x + nx * (half + skirt), q.z + nz * (half + skirt)) - 0.08, q.z + nz * (half + skirt));
    pos.push(q.x + nx * half, yl, q.z + nz * half);
    pos.push(q.x - nx * half, yr, q.z - nz * half);
    pos.push(q.x - nx * (half + skirt), hAt(q.x - nx * (half + skirt), q.z - nz * (half + skirt)) - 0.08, q.z - nz * (half + skirt));
    if (i < P.n) { const a = i * 4, b = (i + 1) * 4; for (let j = 0; j < 3; j++) idx.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1); }
  });
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo = geo.toNonIndexed(); geo.computeVertexNormals();
  const m = mesh(geo, material); m.castShadow = false;
  return m;
}

export function buildPark(ctx, fx) {
  const g = new THREE.Group();
  const hAt = (x, z) => ctx.height(x, z);
  const z0 = roadZ(fx + 60);
  const X = dx => fx + dx, Z = dz => z0 + dz;
  const mats = { dirt: new THREE.MeshLambertMaterial(), berm: new THREE.MeshLambertMaterial(), wood: new THREE.MeshLambertMaterial(), bus: new THREE.MeshLambertMaterial(), busDark: new THREE.MeshLambertMaterial(), hay: new THREE.MeshLambertMaterial(), carA: new THREE.MeshLambertMaterial(), carB: new THREE.MeshLambertMaterial(), glass: new THREE.MeshLambertMaterial(), gravel: new THREE.MeshLambertMaterial() };
  let themeNow = '';
  const signs = [];   // unlit banner materials, dimmed at dusk
  function paint() { const p = PAL[CORE.theme === 'day' ? 'day' : 'dusk']; Object.keys(mats).forEach(k => mats[k].color.set(p[k])); signs.forEach(m => m.color.set(CORE.theme === 'day' ? '#FFFFFF' : '#8C8C8C')); themeNow = CORE.theme; }
  paint();
  const bump = (s, c, w, h) => { const d = Math.abs(s - c); return d < w ? h * 0.5 * (1 + Math.cos(Math.PI * d / w)) : 0; };

  /* ---- the jump loop. The jump line runs across the view, side-on to the camera, so the airtime reads: two
     kickers, the second over a bus. It turns round a berm past the right edge of the view (riders leave and
     come back there), returns behind over rollers, and turns back under the entrance arch near the road. ---- */
  const AX = X(78), AZ = Z(17.6);                 // the jump line starts here and runs along +z
  const W = (t, n) => [AX + n, AZ + t];           // t: along the line, n: away from the road
  const loopA = closedPath([W(0, 0), W(13, 0), W(26, 0), W(30.5, 2.5), W(32.5, 8), W(30.5, 13.5), W(26, 16), W(13, 16), W(0, 16), W(-2.8, 13.5), W(-4, 8), W(-2.8, 2.5)]);
  const sAt = (t, n) => { const [px, pz] = W(t, n); let best = 0, bd = 1e9; loopA.S.forEach(q => { const d = Math.hypot(q.x - px, q.z - pz); if (d < bd) { bd = d; best = q.s; } }); return best; };
  const K1 = { up0: sAt(3.4, 0), lip: sAt(6.2, 0), h: 1.5 }, L1 = { top: sAt(8.9, 0), end: sAt(11.3, 0), h: 1.65 };
  const K2 = { up0: sAt(12.1, 0), lip: sAt(15, 0), h: 2.1 }, L2 = { top: sAt(19.6, 0), end: sAt(23.2, 0), h: 2.3 };
  const rollers = [23, 19.5, 3.5, 0].map(t => sAt(t, 16));
  const TT = { a: sAt(16, 16), b: sAt(14, 16), c: sAt(9, 16), d: sAt(6.8, 16), h: 1.15 };   // a tabletop on the way back
  function profA(s) {
    if (s >= K1.up0 && s <= K1.lip) return K1.h * Math.pow((s - K1.up0) / (K1.lip - K1.up0), 1.6);
    if (s >= L1.top - 1 && s <= L1.end) return s < L1.top ? L1.h : L1.h * (1 - smooth(L1.top, L1.end, s));
    if (s >= K2.up0 && s <= K2.lip) return K2.h * Math.pow((s - K2.up0) / (K2.lip - K2.up0), 1.6);
    if (s >= L2.top - 1.2 && s <= L2.end) return s < L2.top ? L2.h : L2.h * (1 - smooth(L2.top, L2.end, s));
    if (s >= TT.a && s <= TT.d) return s < TT.b ? TT.h * smooth(TT.a, TT.b, s) : s < TT.c ? TT.h : TT.h * (1 - smooth(TT.c, TT.d, s));
    let r = 0; rollers.forEach(c => { r += bump(s, c, 2.2, 0.6); }); return r;
  }
  const bankA = q => clamp(Math.abs(q.k) * 9, 0, 1) * 1.3;
  g.add(ribbon(loopA, hAt, profA, bankA, 3.2, mats.dirt));

  // the bus in the gap of kicker two: a plain yellow school bus, no markings, its front to the road
  { const [bxc, bzc] = W(17.15, 0), gy = hAt(bxc, bzc);
    const bus = grp(box(9, 2.1, 2.5, mats.bus, 0, 0.55, 0), box(8.2, 0.7, 2.52, mats.busDark, -0.3, 1.7, 0), box(9.02, 0.12, 2.52, mats.busDark, 0, 1.25, 0),
      box(1.4, 1.3, 2.4, mats.bus, 5.1, 0.55, 0), box(0.06, 0.6, 2.1, mats.busDark, 4.52, 1.95, 0), box(9.1, 0.25, 2.6, mats.busDark, 0, 0.45, 0), box(8.6, 0.25, 2.3, mats.bus, 0, 2.62, 0));
    [[-2.8, 1], [3.6, 1], [-2.8, -1], [3.6, -1]].forEach(([x, s]) => bus.add(at(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14).rotateX(Math.PI / 2), mats.busDark), x, 0.5, s * 1.18)));
    at(bus, bxc, gy, bzc, Math.PI); g.add(bus); }
  // hay bales beside both landings
  [[9.6, -3.4], [9.6, 3.4], [20.6, -3.5], [20.6, 3.5], [22.9, 3.5], [11.5, 19.2], [14, 19.2]].forEach(([t, n]) => { const [x, z] = W(t, n); g.add(at(box(2.2, 0.7, 1.1, mats.hay), x, hAt(x, z) - 0.05, z, Math.PI / 2)); });

  /* ---- the pump track: a bean-shaped loop of rollers and banked berms in the near field ---- */
  const pump = closedPath([[X(19), Z(15.3)], [X(25), Z(13.9)], [X(31), Z(14.9)], [X(34), Z(18.3)], [X(31), Z(22.9)], [X(25), Z(21.7)], [X(19.5), Z(24.1)], [X(16.5), Z(19.7)]]);
  const profP = s => { let r = 0; const n = Math.round(pump.L / 5.2); for (let i = 0; i < n; i++) { const c = (i + 0.5) * pump.L / n; const q = sampleAt(pump, c); if (Math.abs(q.k) < 0.12) r += bump(s, c, 1.6, 0.42); } return r; };
  const profPc = []; for (let s = 0; s <= pump.L + 0.5; s += 0.25) profPc.push(profP(s));
  const profPf = s => { const f = (((s % pump.L) + pump.L) % pump.L) / 0.25, i = Math.floor(f); return lerp(profPc[i], profPc[i + 1] ?? profPc[i], f - i); };
  const bankP = q => clamp(Math.abs(q.k) * 6, 0, 1) * 1.1;
  g.add(ribbon(pump, hAt, profPf, bankP, 2.6, mats.berm));

  /* ---- the entrance arch at the start of the jump line, facing the road ---- */
  { const [ax, az] = W(0.9, 6), y0 = hAt(ax, az), SPAN = 5.6;
    const tex = canvasTex(1024, 220, (c, Wd, H) => {
      c.fillStyle = CORE.tok('accent'); c.fillRect(0, 0, Wd, H);
      c.strokeStyle = '#1E2124'; c.lineWidth = 8; c.strokeRect(10, 10, Wd - 20, H - 20);
      c.fillStyle = '#1E2124'; c.font = '800 104px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('EUC JUMP PARK', Wd / 2, H / 2 + 4);
    });
    tex.anisotropy = 4;
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, SPAN * 220 / 1024), new THREE.MeshBasicMaterial({ map: tex })); signs.push(ban.material); paint();
    ban.rotation.y = -Math.PI / 2; ban.position.set(ax - 0.13, y0 + 4.5, az); g.add(ban);
    g.add(at(box(0.2, SPAN * 220 / 1024 + 0.2, SPAN + 0.4, mats.wood, 0, 0, 0), ax, y0 + 4.5 - (SPAN * 220 / 1024 + 0.2) / 2, az));
    [-1, 1].forEach(sd => { const pz = az + sd * (SPAN / 2 + 0.1); g.add(box(0.34, 5.6, 0.34, mats.wood, ax, hAt(ax, pz) - 0.2, pz)); });
  }

  /* ---- a canopy with a few spectators between the jump line and the return ---- */
  { const [cx, cz] = W(10.2, 8), y0 = hAt(cx, cz);
    const roof = mesh(new THREE.ConeGeometry(2.3, 0.8, 4, 1).rotateY(Math.PI / 4), mat('accent')); roof.position.set(cx, y0 + 2.75, cz); g.add(roof);
    g.add(box(3.2, 0.25, 3.2, mat('accent'), cx, y0 + 2.2, cz));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(0.05, 0.05, 2.3, 'objDark', cx + a * 1.5, y0, cz + b * 1.5, 6)));
    const fan = (key) => grp(cyl(0.22, 0.27, 1.05, key, 0, 0, 0, 8), sph(0.21, key, 0, 1.3, 0, 10));
    [[-1.2, 0.9, 'cobalt'], [-1.4, -0.6, 'objDark'], [-0.2, -1.4, 'obj'], [-0.4, 2.4, 'accent']].forEach(([a, b, k]) => { const p = fan(k); at(p, cx + a, y0, cz + b); g.add(p); });
  }

  /* ---- a gravel lot between the pump track and the jump line: two parked cars and a few riders hanging out, wheels parked beside them ---- */
  { const lx = X(48), lz = Z(24.2), gy = hAt(lx, lz);
    g.add(box(11, 0.06, 9.5, mats.gravel, lx, gy - 0.02, lz));
    const car = (m, x, z) => { const c = grp(box(4.3, 0.75, 1.85, m, 0, 0.3, 0), box(2.3, 0.62, 1.7, m, -0.25, 1.05, 0), box(2.32, 0.4, 1.72, mats.glass, -0.25, 1.15, 0),
        box(0.06, 0.32, 1.5, mats.glass, 0.93, 1.17, 0));
      [[-1.35, 1], [1.35, 1], [-1.35, -1], [1.35, -1]].forEach(([a, b]) => c.add(at(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14).rotateX(Math.PI / 2), mats.glass), a, 0.36, b * 0.86)));
      at(c, x, hAt(x, z), z, Math.PI); g.add(c); };   // noses toward the road
    car(mats.carA, X(50.5), Z(24.6)); car(mats.carB, X(50.5), Z(27.3));
  }
  /* ---- riders ---- */
  const HELM = [[1.18, 0.74, 0.32], [0.48, 0.64, 1.08], [0.42, 0.82, 0.76], [1.05, 0.46, 0.44], [1.1, 1.1, 1.1], [0.75, 0.55, 1.0]];
  const geoCache = {};
  const JERSEY = [[0.46, 0.55, 0.68], [0.78, 0.46, 0.34], [0.34, 0.62, 0.6], [0.6, 0.62, 0.36], [0.5, 0.48, 0.78], [0.72, 0.6, 0.4]];
  const geo = (pose, h) => geoCache[pose + h] || (geoCache[pose + h] = riderGeo(pose, HELM[h], JERSEY[h]));
  const rmat = mat('obj', { vertexColors: true });
  const SC = 1.3;
  function makeRider(h, cruiser) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.rotation.order = 'YZX';
    const a = mesh(cruiser ? geo('cruise', h) : geo('ride', h), rmat), b = cruiser ? null : mesh(geo('grab', h), rmat);
    body.add(a); if (b) { b.visible = false; body.add(b); }
    body.scale.setScalar(SC); g.add(root);
    return { root, body, a, b };
  }
  const RNG = CORE.rand(74);
  /* jumpers: same speed curve for all, so the gaps between them never change */
  const AIR = [{ from: K1.lip, to: L1.top + 0.6, dur: 0.82, H: 2.2 }, { from: K2.lip, to: L2.top + 0.9, dur: 1.2, H: 3.1 }];
  const vA = s => { for (const a of AIR) if (s > a.from && s < a.to) return (a.to - a.from) / a.dur; return 10.5 - 2.5 * clamp(Math.abs(sampleAt(loopA, s).k) * 6, 0, 1); };
  const jumpers = [0, 1].map(i => Object.assign(makeRider(i, false), { s: (i + 0.15) * loopA.L / 2, trick: 'clean', side: 1 }));
  const cruisers = [0, 1].map(i => Object.assign(makeRider(i + 3, true), { s: (i + 0.3) * pump.L / 2, cruiser: true }));
  const TRICKS = ['360', 'grab', 'tweak', 'clean', 'grab', '360', 'tweak'];
  const crew = [['stand', 2, X(45.8), Z(20.6), 0.9], ['standHelm', 4, X(47.6), Z(21.6), 2.6], ['standFold', 5, X(45.4), Z(22.6), -1.2], ['stand', 1, X(44.2), Z(21.2), -0.4]].map(([pose, h, x, z, yaw], i) => {
    const root = new THREE.Group(), body = mesh(geo(pose, h), rmat); body.scale.setScalar(SC); root.add(body);
    const y = hAt(x, z) + 0.04; at(root, x, y, z, yaw); g.add(root);
    const w = mesh(geo('wheel', h), rmat); w.scale.setScalar(SC); at(w, x + Math.cos(yaw + 1.2) * 0.75, y, z - Math.sin(yaw + 1.2) * 0.75, yaw + 1.57); g.add(w);
    return { root, yaw, ph: i * 1.7 };
  });
  const tmp = new THREE.Vector3();
  function placeOnPath(r, P, prof, bankOf, v, airAt) {
    const q = sampleAt(P, r.s), q2 = sampleAt(P, r.s + 0.6);
    const yaw = Math.atan2(-q.tz, q.tx);
    let y = hAt(q.x, q.z) + 0.18 + prof(r.s), pitch = Math.atan2((hAt(q2.x, q2.z) + 0.18 + prof(r.s + 0.6)) - y, 0.6);
    const bank = bankOf(q);
    let roll = Math.atan(v * v * q.k / 9.8) * 0.8 + Math.sign(q.k) * Math.atan(bank / 2.6);
    let spin = 0, grab = false;
    const air = airAt && airAt(r.s);
    if (air) {
      const u = (r.s - air.from) / (air.to - air.from);
      const y1 = hAt(sampleAt(P, air.from).x, sampleAt(P, air.from).z) + 0.18 + prof(air.from - 0.01);
      const qe = sampleAt(P, air.to), y2 = hAt(qe.x, qe.z) + 0.18 + prof(air.to);
      y = lerp(y1, y2, u) + 4 * air.H * u * (1 - u);
      pitch = lerp(0.42, -0.35, u);
      const e = smooth(0.08, 0.86, u);
      if (r.trick === '360') spin = e * Math.PI * 2 * r.side;
      else if (r.trick === 'grab') { grab = u > 0.16 && u < 0.84; pitch = lerp(0.3, -0.25, u); }
      else if (r.trick === 'tweak') roll += Math.sin(Math.PI * smooth(0.1, 0.9, u)) * 0.6 * r.side;
      roll *= 0.2;
    }
    if (!air) y += bank / 2;
    r.root.position.set(q.x, y, q.z);
    const rl = r.cruiser ? 0.42 : 0.75;
    r.body.rotation.set(clamp(roll, -rl, rl), yaw + spin, clamp(pitch, -0.5, 0.5));
    if (r.b) { r.a.visible = !grab; r.b.visible = grab; }
    return air;
  }
  const airA = s => { for (const a of AIR) if (s > a.from && s < a.to) return a; return null; };
  function update(t, dt) {
    if (CORE.theme !== themeNow) paint();
    dt = Math.min(dt || 0.016, 0.1);
    jumpers.forEach(r => {
      const prev = r.s, v = vA(r.s);
      r.s = (r.s + v * dt) % loopA.L;
      // pick the trick at each take-off
      AIR.forEach(a => { if (prev < a.from && r.s >= a.from) { r.trick = TRICKS[(RNG() * TRICKS.length) | 0]; r.side = RNG() < 0.5 ? -1 : 1; } });
      placeOnPath(r, loopA, profA, bankA, v, airA);
    });
    crew.forEach(c => { c.root.rotation.y = c.yaw + Math.sin(t * 0.5 + c.ph) * 0.12; });
    cruisers.forEach(r => { const v = 6.2 - 1.2 * clamp(Math.abs(sampleAt(pump, r.s).k) * 5, 0, 1); r.s = (r.s + v * dt) % pump.L; placeOnPath(r, pump, profPf, bankP, v, null); });
  }
  update(0, 0);
  return { group: g, update };
}
