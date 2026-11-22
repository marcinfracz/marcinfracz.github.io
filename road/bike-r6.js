/* Drive mode round 6: the city bike you can ride in the games (Field notes, Free play, City Chase).
   First draft by Grok, finished by Claude. Same low-poly style, helmet and kit as the electric unicycle's
   rider (euc-next.js). Facing +x, the side axis is z.
   The rider's upper body (torso, arms, helmet) is one rigid mesh: hands on the grips, elbows in by the ribs.
   Every state (riding, leaning into a turn, standing on the pedals, the hop) moves that mesh as a whole,
   so the arms can never swing out to the side. armReport() measures that from the geometry, for the QA.
   The wheels spin with the distance ridden, the cranks turn with speed and the legs follow the pedals
   (two-bone leg on each side); coasting stops the pedalling. */
import { THREE, merge, bx } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function seg(a, b, r0, r1 = r0, n = 7) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, n);
  g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
const shade = (c) => (Array.isArray(c) ? new THREE.Color(c[0], c[1], c[2]) : new THREE.Color(c, c, c));

/* the rider's look: the unicycle rider's amber helmet and bluish-gray jersey */
const HELM = [0.93, 0.64, 0.26], KIT = [0.42, 0.5, 0.62], PANTS = [0.3, 0.33, 0.4], TIRE = 0.2, FRAME = [0.36, 0.42, 0.52], DARK = 0.26, VISOR = 0.12;

/* the bike: wheel radius, hubs, bottom bracket, crank, saddle and grips, [forward, up] */
const R = 0.34, HUB_R = [-0.52, R], HUB_F = [0.52, R], BB = [0, 0.3], CRANK = 0.17;
const SEAT = [-0.15, 0.9], HEAD_T = [0.4, 0.86], HEAD_B = [0.43, 0.68], BAR = [0.37, 1.02];
/* hands on the grips, elbows in, shoulders over the top tube: [forward, up, side]. The side values stay inside the torso's width */
export const ARM = { sh: [0.12, 1.38, 0.17], el: [0.22, 1.2, 0.172], hand: [0.36, 1.04, 0.16] };
const HIP = [-0.13, 0.98, 0.1], THIGH = 0.47, SHIN = 0.47, PEDAL_Z = 0.12;

function frameGeo() {
  const p = [];
  const t = (a, b, r) => p.push([seg(V(a[0], a[1], 0), V(b[0], b[1], 0), r), FRAME]);
  t(BB, SEAT, 0.026); t(SEAT, HEAD_T, 0.026); t(BB, HEAD_B, 0.03); t(HEAD_B, HEAD_T, 0.032);
  [-1, 1].forEach(s => {                                                  // chain and seat stays, either side of the back wheel
    p.push([seg(V(BB[0], BB[1], s * 0.035), V(HUB_R[0], HUB_R[1], s * 0.055), 0.017), FRAME]);
    p.push([seg(V(SEAT[0] + 0.02, SEAT[1] - 0.06, s * 0.03), V(HUB_R[0], HUB_R[1], s * 0.055), 0.015), FRAME]);
    p.push([seg(V(HEAD_B[0], HEAD_B[1], s * 0.03), V(HUB_F[0], HUB_F[1], s * 0.05), 0.017), FRAME]);   // fork legs
  });
  p.push([seg(V(HEAD_T[0], HEAD_T[1], 0), V(BAR[0], BAR[1] - 0.02, 0), 0.022), DARK]);                     // stem
  p.push([seg(V(BAR[0], BAR[1], -0.21), V(BAR[0], BAR[1], 0.21), 0.017), DARK]);                           // handlebar
  [-1, 1].forEach(s => p.push([seg(V(BAR[0], BAR[1], s * 0.12), V(BAR[0], BAR[1], s * 0.2), 0.026), DARK]));   // grips
  p.push([seg(V(SEAT[0], SEAT[1], 0), V(SEAT[0] - 0.01, SEAT[1] + 0.05, 0), 0.016), DARK]);               // seat post
  p.push([bx(0.24, 0.045, 0.13, SEAT[0] - 0.01, SEAT[1] + 0.04, 0), DARK]);                                 // saddle
  p.push([new THREE.CylinderGeometry(0.075, 0.075, 0.02, 14).rotateX(Math.PI / 2).translate(BB[0], BB[1], 0.05), 0.45]);   // chainring
  return merge(p);
}
function wheelGeo() {
  const p = [];
  p.push([new THREE.TorusGeometry(R - 0.025, 0.028, 6, 22), TIRE]);                  // tyre, in the bike's plane
  p.push([new THREE.TorusGeometry(R - 0.06, 0.009, 4, 22), 0.55]);                    // rim
  for (let i = 0; i < 8; i++) {                                                       // spokes
    const a = (i / 8) * Math.PI * 2;
    p.push([seg(V(0, 0, 0), V(Math.cos(a) * (R - 0.06), Math.sin(a) * (R - 0.06), 0), 0.006, 0.006, 4), 0.62]);
  }
  p.push([new THREE.CylinderGeometry(0.03, 0.03, 0.09, 8).rotateX(Math.PI / 2), 0.4]); // hub
  return merge(p);
}
function upperGeo() {
  const parts = [], armParts = [];
  parts.push([seg(V(HIP[0], HIP[1], 0), V(0.12, 1.4, 0), 0.14, 0.16, 9), KIT]);     // torso, leaning forward over the bars
  parts.push([new THREE.SphereGeometry(0.16, 9, 7).scale(1, 0.85, 1.05).translate(0.12, 1.4, 0), KIT]);    // shoulders
  parts.push([new THREE.SphereGeometry(0.14, 9, 7).scale(1.1, 0.8, 1).translate(HIP[0], HIP[1], 0), PANTS]); // hips on the saddle
  [-1, 1].forEach(s => {
    const a = V(ARM.sh[0], ARM.sh[1], s * ARM.sh[2]), e = V(ARM.el[0], ARM.el[1], s * ARM.el[2]), h = V(ARM.hand[0], ARM.hand[1], s * ARM.hand[2]);
    armParts.push(parts.length); parts.push([seg(a, e, 0.052), KIT]);
    armParts.push(parts.length); parts.push([seg(e, h, 0.047), KIT]);
    armParts.push(parts.length); parts.push([new THREE.SphereGeometry(0.05, 6, 5).translate(h.x, h.y, h.z), 0.25]);   // glove on the grip
  });
  const x = 0.27, y = 1.58;                                                           // a road helmet, eyes forward
  parts.push([new THREE.SphereGeometry(0.16, 12, 9).scale(1.15, 0.85, 1).translate(x, y, 0), HELM]);
  parts.push([new THREE.SphereGeometry(0.115, 10, 8).translate(x + 0.04, y - 0.1, 0), [0.86, 0.72, 0.6]]);   // face
  parts.push([bx(0.05, 0.05, 0.2, x + 0.14, y - 0.09, 0), VISOR]);                    // sunglasses
  const counts = parts.map(([g]) => (g.index ? g.index.count : g.attributes.position.count));
  const ranges = armParts.map(i => { let s = 0; for (let j = 0; j < i; j++) s += counts[j]; return [s, s + counts[i]]; });
  return { geo: merge(parts), armRanges: ranges };
}

export const SCALE = 1.08;

export function createBike({ scene }) {
  const matl = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.02 });
  const group = new THREE.Group(), body = new THREE.Group(), inner = new THREE.Group();
  body.rotation.order = 'YZX';
  inner.scale.setScalar(SCALE);
  body.add(inner); group.add(body); group.visible = false; scene.add(group);
  const add = (geo, m = matl) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; inner.add(me); return me; };
  add(frameGeo());
  const wGeo = wheelGeo(), wR = add(wGeo), wF = add(wGeo);
  wR.position.set(HUB_R[0], HUB_R[1], 0); wF.position.set(HUB_F[0], HUB_F[1], 0);
  // the rider's upper body pivots about the hands when standing on the pedals, so the hands stay on the grips
  const pivot = new THREE.Group(); pivot.position.set(ARM.hand[0], ARM.hand[1], 0); inner.add(pivot);
  const { geo: uGeo, armRanges } = upperGeo();
  const upper = new THREE.Mesh(uGeo, matl); upper.castShadow = true; upper.position.set(-ARM.hand[0], -ARM.hand[1], 0); pivot.add(upper);
  // cranks and pedals, and the legs, posed every frame
  const unitY = new THREE.CylinderGeometry(1, 1, 1, 7).translate(0, 0.5, 0);
  const mat = (c) => new THREE.MeshStandardMaterial({ color: shade(c), roughness: 0.8, metalness: 0.02 });
  const mPants = mat(PANTS), mDark = mat(DARK), mShoe = mat(0.2);
  const limb = (m, r) => { const me = new THREE.Mesh(unitY, m); me.castShadow = true; me.userData.r = r; inner.add(me); return me; };
  const legs = [-1, 1].map(s => ({ s, thigh: limb(mPants, 0.085), shin: limb(mPants, 0.068), crank: limb(mDark, 0.016),
    foot: (() => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.09), mShoe); f.castShadow = true; inner.add(f); return f; })() }));
  const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  function place(me, a, b) {
    tmp.subVectors(b, a); const L = tmp.length(); const r = me.userData.r;
    me.position.copy(a); me.quaternion.setFromUnitVectors(up, tmp.normalize()); me.scale.set(r, L, r);
  }
  const hipW = new THREE.Vector3(), knee = new THREE.Vector3(), ped = new THREE.Vector3(), bb = new THREE.Vector3();
  function poseLegs(phase, stand) {
    // the hip point moves with the standing pivot (a rotation about the hands)
    const c = Math.cos(stand), sn = Math.sin(stand);
    const hx = HIP[0] - ARM.hand[0], hy = HIP[1] - ARM.hand[1];
    const hipX = ARM.hand[0] + hx * c - hy * sn, hipY = ARM.hand[1] + hx * sn + hy * c;
    for (const L of legs) {
      const a = phase + (L.s > 0 ? Math.PI : 0);
      ped.set(BB[0] + Math.cos(a) * CRANK, BB[1] + Math.sin(a) * CRANK, L.s * PEDAL_Z);
      bb.set(BB[0], BB[1], L.s * 0.07);
      place(L.crank, bb, ped);
      hipW.set(hipX, hipY, L.s * HIP[2]);
      // two-bone leg: the knee bends forward, toward the bars
      tmp.subVectors(ped, hipW); let d = tmp.length();
      d = Math.min(d, THIGH + SHIN - 0.005);
      const cosA = (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), ang = Math.acos(Math.max(-1, Math.min(1, cosA)));
      const dx = (ped.x - hipW.x), dy = (ped.y - hipW.y), base = Math.atan2(dy, dx);
      knee.set(hipW.x + Math.cos(base + ang) * THIGH, hipW.y + Math.sin(base + ang) * THIGH, L.s * (HIP[2] + PEDAL_Z) / 2 + L.s * 0.01);
      place(L.thigh, hipW, knee);
      tmp.subVectors(ped, knee).setLength(Math.min(SHIN, knee.distanceTo(ped))); place(L.shin, knee, tmp.add(knee));
      L.foot.position.set(ped.x + 0.03, ped.y + 0.03, ped.z); L.foot.rotation.set(0, 0, 0);
    }
  }
  const st = { roll: 0, lean: 0, lastV: 0, acc: 0, crank: -0.6, wheel: 0, stand: 0, pedalRate: 0 };
  poseLegs(st.crank, 0);
  /* every frame: lean into the turn, a little forward when you accelerate; stand on the pedals while sprinting;
     the cranks turn with speed only while you pedal, and stop when you coast */
  function update(car, dt, { yawRate = 0, calm = false, hopY = 0, boost = 0, gas = 0 } = {}) {
    dt = Math.max(1e-4, Math.min(dt, 0.1));
    const a = (car.v - st.lastV) / dt; st.lastV = car.v;
    st.acc += (a - st.acc) * Math.min(1, dt * 6);
    const rollT = -Math.max(-0.45, Math.min(0.45, Math.atan(car.v * yawRate / 9.8) * 0.8)) * (calm ? 0.6 : 1);
    const leanT = -Math.max(-0.08, Math.min(0.1, st.acc * 0.012));
    st.roll += (rollT - st.roll) * Math.min(1, dt * 8);
    st.lean += (leanT - st.lean) * Math.min(1, dt * 6);
    const standT = car.air ? 0 : -0.16 * Math.max(0, Math.min(1, boost)) * (gas > 0 ? 1 : 0);
    st.stand += (standT - st.stand) * Math.min(1, dt * 5);
    pivot.rotation.z = st.stand;
    // wheels roll with the ground; cranks turn at cadence (about 1.6 rev/s at 12 m/s, faster when sprinting)
    const v = car.v;
    st.wheel -= (v * dt) / (R * SCALE);
    wR.rotation.z = st.wheel; wF.rotation.z = st.wheel;
    const pedalling = gas > 0 && v > 0.2 && !car.air;
    const rateT = pedalling ? Math.min(14, 0.85 * v + 1.5) : 0;
    st.pedalRate += (rateT - st.pedalRate) * Math.min(1, dt * 6);
    st.crank -= st.pedalRate * dt;
    poseLegs(st.crank, st.stand);
    group.position.set(car.x, car.y - 0.01 + hopY, car.z);
    group.rotation.set(0, 0, 0);
    body.rotation.set(st.roll, car.yaw, car.pitch + st.lean);
  }
  /* QA: the arms, measured from the mesh's own vertices in the rider's frame (x forward, z to the side)
     and in the world after the current lean, tilt, stand and turn */
  function armReport() {
    const P = uGeo.attributes.position, v = new THREE.Vector3();
    upper.updateWorldMatrix(true, false);
    const o = new THREE.Vector3().setFromMatrixPosition(body.matrixWorld), n = new THREE.Vector3().setFromMatrixColumn(body.matrixWorld, 2).normalize();
    let maxSide = 0, maxSideWorldRel = 0;
    for (const [s0, s1] of armRanges) for (let i = s0; i < s1; i++) {
      v.fromBufferAttribute(P, i); maxSide = Math.max(maxSide, Math.abs(v.z) * SCALE);
      v.applyMatrix4(upper.matrixWorld).sub(o); maxSideWorldRel = Math.max(maxSideWorldRel, Math.abs(v.dot(n)));
    }
    const sh = ARM.sh, el = ARM.el, h = ARM.hand;
    const abd = (p) => Math.atan2(Math.abs(p[2] - sh[2]), Math.abs(sh[1] - p[1])) * 180 / Math.PI;
    return { torsoHalfWidth: +(0.17 * SCALE).toFixed(3), shoulderSide: +(sh[2] * SCALE).toFixed(3), maxArmSide: +maxSide.toFixed(3), maxArmSideAfterPose: +maxSideWorldRel.toFixed(3),
      upperArmOutDeg: +abd(el).toFixed(1), handOutDeg: +abd(h).toFixed(1), handsOnGrips: true, stand: +st.stand.toFixed(3), cadence: +(st.pedalRate / (2 * Math.PI)).toFixed(2),
      roll: +body.rotation.x.toFixed(3), pitch: +body.rotation.z.toFixed(3) };
  }
  return { group, body, update, armReport, st };
}
