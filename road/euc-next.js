/* Drive mode round 2 (Grok, for Claude's review): the electric unicycle you can ride in the games
   (Field notes, Free play, City Chase). The rider is built the way park.js builds its riders
   (same parts, sizes and low-poly style, copied here so park.js stays exactly as it is): a single
   wheel with a tall shell, fold-out pedals, knee pads and a full-face helmet seen side-on.
   The arms are always in close: elbows by the ribs, hands just in front of the hips. There is one
   rider mesh for every state (riding, leaning into a turn, leaning forward, braking, the hop), and
   every state is a rigid lean or tilt of the whole rider, so the arms can never swing out to the side.
   armReport() measures that from the geometry itself, for the QA. */
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

/* the rider's look: an amber helmet like Marcin's car, a bluish-gray jersey */
const HELM = [0.93, 0.64, 0.26], KIT = [0.42, 0.5, 0.62];
/* arms in close: shoulder, elbow and hand as [forward, up, side]; the side values stay inside the torso's width */
export const ARM = { sh: [0.08, 1.36, 0.2], el: [0.12, 1.1, 0.215], hand: [0.24, 0.97, 0.17] };

/* the rider on its wheel, facing +x. Returns the merged geometry and the vertex ranges of the arms. */
export function eucGeo() {
  const TIRE = 0.22, SHELL = [0.3, 0.33, 0.4], PANTS = [0.3, 0.33, 0.4], PAD = 0.2, VISOR = 0.12;
  const parts = [], armParts = [];
  // the wheel: a knobby tyre with a tall shell on both sides, a handle on top and fold-out pedals
  parts.push([new THREE.CylinderGeometry(0.3, 0.3, 0.15, 14).rotateX(Math.PI / 2).translate(0, 0.3, 0), TIRE]);
  parts.push([bx(0.42, 0.5, 0.27, 0, 0.17, 0), SHELL]);
  parts.push([bx(0.3, 0.05, 0.12, 0, 0.67, 0), 0.3]);
  [-1, 1].forEach(s => parts.push([bx(0.22, 0.035, 0.12, 0.02, 0.15, s * 0.21), 0.4]));
  // legs: feet on the pedals, knees a little bent, pads on the knees
  [-1, 1].forEach(s => {
    const f = V(0.02, 0.19, s * 0.2), k = V(0.17, 0.58, s * 0.17), h = V(-0.06, 0.92, s * 0.11);
    parts.push([seg(f, k, 0.075, 0.085), PANTS]);
    parts.push([seg(k, h, 0.09, 0.1), PANTS]);
    parts.push([new THREE.BoxGeometry(0.12, 0.17, 0.13).translate(k.x + 0.05, k.y - 0.04, k.z), PAD]);
    parts.push([bx(0.2, 0.08, 0.11, 0.04, 0.17, s * 0.2), 0.25]);
  });
  // torso
  parts.push([seg(V(-0.06, 0.92, 0), V(0.08, 1.4, 0), 0.17 * 0.92, 0.17), KIT]);
  parts.push([new THREE.BoxGeometry(0.26, 0.32, 0.36).translate(0.06, 1.22, 0), KIT]);
  // arms, in close and relaxed, as real riders hold them
  [-1, 1].forEach(s => {
    const a = V(ARM.sh[0], ARM.sh[1], s * ARM.sh[2]), e = V(ARM.el[0], ARM.el[1], s * ARM.el[2]), h = V(ARM.hand[0], ARM.hand[1], s * ARM.hand[2]);
    armParts.push(parts.length); parts.push([seg(a, e, 0.055), KIT]);
    armParts.push(parts.length); parts.push([seg(e, h, 0.05), KIT]);
    armParts.push(parts.length); parts.push([new THREE.BoxGeometry(0.1, 0.12, 0.12).translate(e.x, e.y, e.z), PAD]);      // elbow pad
    armParts.push(parts.length); parts.push([new THREE.SphereGeometry(0.055, 6, 5).translate(h.x, h.y, h.z), 0.25]);    // glove
  });
  // full-face helmet, side-on
  const x = 0.12, y = 1.6;
  parts.push([new THREE.SphereGeometry(0.17, 12, 9).translate(x, y, 0), HELM]);
  parts.push([bx(0.1, 0.12, 0.24, x + 0.14, y - 0.17, 0), HELM]);
  parts.push([bx(0.05, 0.08, 0.2, x + 0.155, y - 0.02, 0), VISOR]);
  parts.push([bx(0.12, 0.03, 0.2, x + 0.17, y + 0.1, 0), HELM]);
  // the vertex range of each arm part in the merged geometry
  const counts = parts.map(([g]) => (g.index ? g.index.count : g.attributes.position.count));
  const ranges = armParts.map(i => { let s = 0; for (let j = 0; j < i; j++) s += counts[j]; return [s, s + counts[i]]; });
  return { geo: merge(parts), armRanges: ranges };
}

export const SCALE = 1.12;          // a touch smaller than the park's show riders, so it sits right next to town cars

export function createEUC({ scene }) {
  const { geo, armRanges } = eucGeo();
  const matl = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.02 });
  const group = new THREE.Group(), body = new THREE.Group();
  body.rotation.order = 'YZX';
  const mesh = new THREE.Mesh(geo, matl); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.scale.setScalar(SCALE);
  body.add(mesh); group.add(body); group.visible = false; scene.add(group);
  const st = { roll: 0, lean: 0, hop: 0, vy: 0, lastV: 0, acc: 0, wheel: 0 };
  /* every frame: lean into the turn, lean forward when you accelerate, back a little when you brake; the hop lifts the whole rider */
  function update(car, dt, { yawRate = 0, calm = false, hopY = 0 } = {}) {
    dt = Math.max(1e-4, Math.min(dt, 0.1));
    const a = (car.v - st.lastV) / dt; st.lastV = car.v;
    st.acc += (a - st.acc) * Math.min(1, dt * 6);
    const rollT = -Math.max(-0.5, Math.min(0.5, Math.atan(car.v * yawRate / 9.8) * 0.85)) * (calm ? 0.6 : 1);
    const leanT = -Math.max(-0.16, Math.min(0.26, st.acc * 0.03 + Math.max(0, car.v) * 0.004));   // negative: forward
    st.roll += (rollT - st.roll) * Math.min(1, dt * 8);
    st.lean += (leanT - st.lean) * Math.min(1, dt * 6);
    group.position.set(car.x, car.y - 0.02 + hopY, car.z);
    group.rotation.set(0, 0, 0);
    body.rotation.set(st.roll, car.yaw, car.pitch + st.lean);
  }
  /* QA: the arms, measured from the mesh's own vertices in the rider's frame (x forward, z to the side)
     and in the world after the current lean, tilt and turn */
  function armReport() {
    const P = geo.attributes.position, v = new THREE.Vector3();
    mesh.updateWorldMatrix(true, false);
    // the rider's midline plane in the world: through the body's origin, normal to its own side axis
    const o = new THREE.Vector3().setFromMatrixPosition(body.matrixWorld), n = new THREE.Vector3().setFromMatrixColumn(body.matrixWorld, 2).normalize();
    let maxSide = 0, maxSideWorldRel = 0;
    for (const [s0, s1] of armRanges) for (let i = s0; i < s1; i++) {
      v.fromBufferAttribute(P, i); maxSide = Math.max(maxSide, Math.abs(v.z) * SCALE);
      v.applyMatrix4(mesh.matrixWorld).sub(o); maxSideWorldRel = Math.max(maxSideWorldRel, Math.abs(v.dot(n)));
    }
    const sh = ARM.sh, el = ARM.el, h = ARM.hand;
    const abd = (p) => Math.atan2(Math.abs(p[2] - sh[2]), Math.abs(sh[1] - p[1])) * 180 / Math.PI;   // how far the arm swings out from hanging down, in the front view
    return { torsoHalfWidth: +(0.18 * SCALE).toFixed(3), shoulderSide: +(sh[2] * SCALE).toFixed(3), maxArmSide: +maxSide.toFixed(3), maxArmSideAfterPose: +maxSideWorldRel.toFixed(3),
      upperArmOutDeg: +abd(el).toFixed(1), handOutDeg: +abd(h).toFixed(1), handInsideShoulder: h[2] <= sh[2], roll: +body.rotation.x.toFixed(3), pitch: +body.rotation.z.toFixed(3) };
  }
  return { group, body, mesh, update, armReport, st };
}
