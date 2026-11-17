/* The Road: one living diorama per stop. Each builder returns
   { group, anchors: {name: Object3D}, update(t, k, dt) } where k is 1 when the
   camera has landed on that stop and 0 when it is far away. */
import { THREE, reg, mat, ownMat, glowMat, mesh, at, box, cyl, sph, grp, label, canvasTex, tok, smooth, clamp, lerp, roadZ } from './core.js';
import * as CORE from './core.js';
import { vehicleGeo } from './world.js?v=56';
import { drawFlag, drawMark, onLogo } from './marks.js?v=28';
import { ketteringAB, bulldog, bulldogPoster, rossBuilding, burOak, blockMSign, wavingFlag, wave, signPanel, MAIZE, BLUE } from './landmarks.js?v=56';

const pin = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
const vmesh = (type, s = 1, key = 'obj') => { const m = mesh(vehicleGeo(type), mat(key, { vertexColors: true })); m.scale.setScalar(s); return m; };
function plinth(r, x = 0, z = 0) {
  const g = grp(cyl(r, r + 0.3, 0.5, 'objShade', 0, 0, 0, 48));
  const ring = mesh(new THREE.TorusGeometry(r + 0.05, 0.07, 6, 64), mat('accent'), false); ring.rotation.x = Math.PI / 2; ring.position.y = 0.52; g.add(ring);
  return at(g, x, 0, z);
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
function hole(x, y, r) { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; }
function ringShape(w, h, r, iw, ih, ir) { const s = roundedRect(w, h, r); const inner = roundedRect(iw, ih, ir); s.holes.push(new THREE.Path(inner.getPoints(24).reverse())); return s; }
const extrude = (shape, d) => new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 24 });
const flagMats = {};
function flagMat(code) {
  if (flagMats[code]) return flagMats[code];
  const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
  drawFlag(cv.getContext('2d'), code, 192, 108);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (flagMats[code] = new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
}
function flag(h = 7, key = 'accent', code = null) {
  const pole = cyl(0.08, 0.1, h, 'objDark');
  const cloth = mesh(new THREE.PlaneGeometry(2, 1.1, 8, 1), code ? flagMat(code) : mat(key, { side: THREE.DoubleSide }), false);
  cloth.position.set(1.05, h - 0.7, 0);
  const g = grp(pole, cloth); g.userData.cloth = cloth; g.userData.base = cloth.geometry.attributes.position.array.slice();
  return g;
}
function waveFlag(f, t) {
  const c = f.userData.cloth, a = c.geometry.attributes.position, b = f.userData.base;
  for (let i = 0; i < a.count; i++) { const x = b[i * 3] + 1; a.setZ(i, Math.sin(x * 2.4 - t * 4) * 0.18 * x); }
  a.needsUpdate = true;
}
/* A flat gray name mark on a panel: plain type, not the company's artwork. */
function mark(spec, w = 7, h = 1.9) {
  const tex = canvasTex(704, 192, (ctx, W, H) => drawMark(ctx, W, H, spec, { bg: tok('card'), fg: tok('ink') }));
  if (spec.logo) onLogo(() => tex.userData.redraw());
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.renderOrder = 2;
  return m;
}
/* A mark on two posts, for a site with no building to hang it on. */
function billboard(spec, w = 7, h = 1.9, y = 3) {
  const g = grp(cyl(0.12, 0.14, y, 'objDark', -w * 0.35, 0, -0.05), cyl(0.12, 0.14, y, 'objDark', w * 0.35, 0, -0.05), box(w + 0.3, h + 0.3, 0.12, 'objShade', 0, y - 0.15, -0.12));
  const m = mark(spec, w, h); m.position.set(0, y + h / 2 - 0.15, 0); g.add(m);
  return g;
}
function person(key = 'obj', s = 1) { const g = grp(cyl(0.28, 0.34, 1.2, key, 0, 0, 0, 8), sph(0.27, key, 0, 1.5, 0, 10)); g.scale.setScalar(s); return g; }
function robot() {
  const g = grp(cyl(0.55, 0.65, 1.3, 'obj', 0, 0.2, 0, 14), sph(0.5, 'obj', 0, 1.95, 0, 14), sph(0.14, 'accent', 0, 2.0, 0.45, 8), cyl(0.04, 0.04, 0.5, 'objDark', 0, 2.4, 0, 6), sph(0.1, 'cobalt', 0, 2.95, 0, 8));
  [-1, 1].forEach(s => g.add(cyl(0.18, 0.18, 0.25, 'objDark', s * 0.45, 0, 0, 10)));
  return g;
}
function plane(s = 1, key = 'obj') {
  const g = new THREE.Group();
  const f = mesh(new THREE.CapsuleGeometry(0.5, 4.2, 6, 12).rotateZ(Math.PI / 2), mat(key)); g.add(f);
  g.add(at(mesh(new THREE.BoxGeometry(1.2, 0.12, 6), mat(key)), 0.2, 0, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.7, 0.1, 2.2), mat(key)), -2.2, 0.15, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.7, 1.2, 0.1), mat(key)), -2.3, 0.6, 0));
  g.scale.setScalar(s); return g;
}

/* ---------------- builders ---------------- */
const B = {};

B.start = () => {
  const g = new THREE.Group();
  const span = 22; // the road center is at local z = +22
  /* v55: the opening view looks down the road from behind the start line, so the gantry,
     flags, stands and pit lane line both sides of the road ahead */
  [-11, 11].forEach(dz => g.add(box(1.4, 9, 1.4, 'obj', 0, 0, span + dz)));
  g.add(box(1.6, 1.2, 24, 'obj', 0, 9, span));
  g.add(box(1.62, 0.3, 24.02, 'accent', 0, 9.5, span));
  const ban = signPanel('START', 8, 1.9, '#2B3A4A', '#F2F4F7'); ban.rotation.y = -Math.PI / 2; ban.position.set(-0.14, 11.3, span); g.add(ban);
  g.add(box(0.12, 2.1, 8.2, 'objDark', 0, 10.25, span));
  const flags = [];
  // every country the work has taken him to, flying along both sides of the road
  [['US', 3, 35.6], ['MX', 10, 35.6], ['EC', 17, 35.6], ['CA', 24, 35.6], ['CN', 6, 7.4], ['KR', 14, 7.4]].forEach(([c, x, z], i) => { const f = at(flag(6 + (i % 2), 'accent', c), x, 0, z, -Math.PI / 2); g.add(f); flags.push(f); });
  for (let i = 0; i < 6; i++) { g.add(cyl(0.05, 0.45, 1, 'accent', 2 + i * 3.4, 0, 10.9)); g.add(cyl(0.05, 0.45, 1, 'accent', 2 + i * 3.4, 0, 33.1)); }
  /* v41: a proper three-lamp signal, red over yellow over green, one lit at a time */
  const tree = grp(cyl(0.16, 0.2, 5.4, 'objDark', 0, 0, 0, 8), box(1.1, 3.3, 0.6, 'objDark', 0, 3.3, 0));
  const lamps = ['#E5484D', '#F2B632', '#2FA36B'].map((c, i) => { const m = new THREE.MeshLambertMaterial({ color: '#55606C', emissive: '#000000' }); const y = 5.95 - i * 1.0; const l = sph(0.34, m, 0, y, 0.3, 14); tree.add(l); tree.add(box(0.9, 0.08, 0.42, 'objDark', 0, y + 0.38, 0.5)); return { l, c }; });
  at(tree, 1.6, 0, 31.6, -Math.PI / 2); g.add(tree);
  // two stands of people, one each side, rows rising away from the road
  const crowd = [];
  const tones = ['accent', 'cobalt', 'obj', 'objDark', 'accent', 'obj', 'cobalt', 'objDark', 'obj', 'accent', 'cobalt', 'obj'];
  const stand = (x, z, ry, n) => {
    const s = grp(box(11, 0.6, 1.6, 'objShade', 0, 0, 0), box(11, 1.2, 1.6, 'objShade', 0, 0, -1.6), box(11, 1.8, 1.6, 'objShade', 0, 0, -3.2), box(11.2, 0.15, 5, 'objDark', 0, 0.02, -1.6));
    tones.slice(0, n).forEach((k, i) => { const row = i % 3, p = person(k, 0.9); at(p, -4.5 + Math.floor(i / 3) * 3 + row * 0.7, 0.6 + row * 0.6, -row * 1.6); s.add(p); crowd.push({ p, y: p.position.y, ph: i * 0.7 }); });
    at(s, x, 0, z, ry); g.add(s);
  };
  stand(36, 39.5, Math.PI, 12);
  stand(30, 4.4, 0, 9);
  // the pit garage and its crew, further down on the right
  const garage = grp(box(9, 4, 7, 'obj', 0, 0, 0), box(9.2, 0.4, 7.2, 'objShade', 0, 4, 0), box(5, 3, 0.1, 'objDark', 0, 0, 3.52));
  at(garage, 56, 0, 43, Math.PI); g.add(garage);
  const crew = []; [[52.5, 37.6, 'accent'], [55, 37.2, 'objDark'], [59.6, 37.8, 'cobalt']].forEach(([x, z, k], i) => { const p = person(k, 1); at(p, x, 0, z); g.add(p); crew.push({ p, x, ph: i }); });
  const cart = grp(box(1.6, 0.9, 1, 'accent', 0, 0.3, 0), box(1.6, 0.1, 1, 'objDark', 0, 1.2, 0)); at(cart, 50, 0, 37.4); g.add(cart);
  const vanS = vmesh('van', 0.9); at(vanS, 63, 0, 38.6, 0.15); g.add(vanS);
  const lit = new THREE.Color(); let lampOn = -1;
  return { group: g, anchors: {}, update(t) {
    flags.forEach(f => waveFlag(f, t));
    const ph = t % 8.7, cur = ph < 4 ? 2 : ph < 5.2 ? 1 : 0;
    if (cur !== lampOn) { lampOn = cur; lamps.forEach(({ l, c }, i) => { const on = i === cur; l.material.color.set(on ? c : '#55606C'); l.material.emissive.copy(lit.set(c)).multiplyScalar(on ? 0.75 : 0); }); }
    crowd.forEach(c => { c.p.position.y = c.y + Math.max(0, Math.sin(t * 3.2 + c.ph)) * 0.32; });
    crew.forEach(c => { c.p.position.x = c.x + Math.sin(t * 0.7 + c.ph) * 0.8; });
  } };
};

B.fm = () => {
  const g = new THREE.Group();
  g.add(plinth(7.6));
  // Pentastar MLS head gaskets: three layers each, left and right bank
  function pentastar() {
    const s = roundedRect(7.2, 2.8, 0.5);
    [-2.35, 0, 2.35].forEach(x => s.holes.push(hole(x, 0, 0.98)));
    [[-3.3, 1.12], [-1.17, 1.12], [1.17, 1.12], [3.3, 1.12], [-3.3, -1.12], [-1.17, -1.12], [1.17, -1.12], [3.3, -1.12]].forEach(([x, y]) => s.holes.push(hole(x, y, 0.17)));
    [[-2.35, 1.2], [2.35, -1.2]].forEach(([x, y]) => s.holes.push(hole(x, y, 0.1)));
    const geo = extrude(s, 0.09);
    const layers = ['obj', 'accent', 'obj'].map((k, i) => { const m = mesh(geo, mat(k)); m.position.z = i * 0.1; return m; });
    const gg = grp(...layers); gg.userData.layers = layers;
    return gg;
  }
  const lh = pentastar(), rh = pentastar();
  [lh, rh].forEach((p, i) => { p.scale.setScalar(0.88); p.position.set(i ? 3.4 : -3.4, 3.2, 0); p.rotation.set(-1.05, 0, i ? 0.32 : -0.32); g.add(p); });
  // press-in-place oil pan gasket with a live stress heat map
  const opGeo = extrude(ringShape(5.4, 3.3, 0.9, 4.7, 2.6, 0.6), 0.35); opGeo.center();
  const n = opGeo.attributes.position.count; opGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  const opMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const oilpan = mesh(opGeo, opMat); oilpan.rotation.x = -1.1; at(oilpan, 12.5, 2.1, 2.5); g.add(oilpan);
  g.add(cyl(0.12, 0.18, 1.6, 'objDark', 12.5, 0, 2.5));
  // thermal pulsator test cell with a cycle counter
  const rig = new THREE.Group();
  [[-2, -1.6], [2, -1.6], [-2, 1.6], [2, 1.6]].forEach(([x, z]) => rig.add(box(0.3, 5, 0.3, 'objDark', x, 0, z)));
  rig.add(box(4.6, 0.4, 3.6, 'objShade', 0, 5, 0)); rig.add(box(2.4, 1.6, 2, 'obj', 0, 1.2, 0)); rig.add(box(2.6, 0.12, 2.1, 'accent', 0, 2.8, 0));
  const lamp = sph(0.28, new THREE.MeshBasicMaterial({ color: '#E5484D' }), 0, 5.6, 0, 10);
  rig.add(lamp);
  const counter = label('CYCLES 0', { size: 20, key: 'ink', bg: 'card', scale: 0.55 }); counter.position.set(0, 7, 0); rig.add(counter);
  at(rig, 13.5, 0, -10); g.add(rig);
  // the plant behind, with its water tower
  const plant = grp(box(15, 5, 7, 'obj', 0, 0, 0));
  for (let i = 0; i < 4; i++) { const p = mesh(new THREE.CylinderGeometry(0.01, 1.9, 1.8, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), mat('objShade')); at(p, -5.6 + i * 3.7, 5.6, 0); p.scale.set(1, 1, 3.7); plant.add(p); }
  at(plant, -4, 0, -15); g.add(plant);
  const fmMark = mark({ name: 'Federal-Mogul', sub: 'Powertrain sealing · Southfield', mono: 'FM', logo: 'fm' }, 8.4, 2.3); at(fmMark, -4, 6.2 + 1.2, -11.4); g.add(fmMark);
  // the walk-in offer: a new hire walks through the gate each cycle
  const hire = person('accent', 1); g.add(hire);
  const gate = grp(box(0.3, 3.2, 0.3, 'objDark', -1.6, 0, 0), box(0.3, 3.2, 0.3, 'objDark', 1.6, 0, 0), box(3.5, 0.3, 0.3, 'objShade', 0, 3.2, 0)); at(gate, -4, 0, -8.6); g.add(gate);
  const tower = grp(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => cyl(0.15, 0.15, 8, 'objDark', x, 0, z)), sph(2.2, 'obj', 0, 9.6, 0), cyl(0.05, 0.05, 1.5, 'objDark', 0, 11.6, 0));
  at(tower, 10, 0, -19); g.add(tower);
  const heat = new THREE.Color(), cool = new THREE.Color(), hot = new THREE.Color(), mid = new THREE.Color();
  let cyc = 0, lastC = 0;
  return {
    group: g,
    anchors: { pentastar: pin(lh, 0, 0, 0.2), oilpan: pin(oilpan, 0, 0, 0.3), rig: pin(rig, 0, 5.4, 0), plant: pin(gate, 0, 3.8, 0) },
    update(t, k, dt) {
      const e = k * (0.55 + 0.45 * Math.sin(t * 1.1));
      [lh, rh].forEach(p => p.userData.layers.forEach((l, i) => { l.position.z = (i - 1) * (0.1 + e * 0.7); }));
      const hq = (t * 0.09) % 1; hire.position.set(-4 + Math.sin(hq * 7) * 0.3, 0, lerp(-2, -12, hq)); hire.visible = hq < 0.85;
      // heat map sweeping across the oil pan gasket
      cool.set(tok('obj')); hot.set(tok('accent')); mid.set(tok('radar'));
      const sweep = Math.sin(t * 0.9) * 3.2, pos = opGeo.attributes.position, colr = opGeo.attributes.color;
      for (let i = 0; i < pos.count; i++) {
        const d = Math.abs(pos.getX(i) - sweep), q = Math.exp(-d * d / 1.4);
        heat.copy(cool).lerp(mid, clamp(q * 1.6, 0, 1) * 0.6).lerp(hot, q > 0.6 ? (q - 0.6) * 2.5 : 0);
        colr.setXYZ(i, heat.r, heat.g, heat.b);
      }
      colr.needsUpdate = true;
      lamp.visible = (t * 2.5 % 1) < 0.5;
      cyc += dt * 380; if (t - lastC > 0.35) { lastC = t; counter.userData.label.text = 'CYCLES ' + Math.floor(cyc).toLocaleString('en-US'); counter.userData.label.draw(); }
    }
  };
};

B.chrysler = () => {
  const g = new THREE.Group();
  g.add(plinth(7.4));
  const eng = new THREE.Group();
  const parts = [];
  const P = (geo, key, x, y, z, rx = 0, name) => { const m = mesh(geo, ownMat(key)); at(m, x, y, z); m.rotation.x = rx; eng.add(m); parts.push(m); if (name) m.name = name; return m; };
  P(new THREE.BoxGeometry(4.4, 2.1, 2.6), 'obj', 0, 2.05, 0, 0, 'block');
  P(new THREE.BoxGeometry(3.9, 0.7, 2.2), 'objShade', 0, 0.65, 0, 0, 'pan');
  [-1, 1].forEach(s => {
    P(new THREE.BoxGeometry(4.2, 0.1, 1.55), 'accent', 0, 3.2, s * 0.85, s * 0.55, 'gasket');
    P(new THREE.BoxGeometry(4.2, 0.9, 1.5), 'obj', 0, 3.6, s * 1.08, s * 0.55, 'head');
    P(new THREE.BoxGeometry(3.9, 0.45, 1.05), 'objShade', 0, 4.15, s * 1.38, s * 0.55, 'cover');
  });
  P(new THREE.BoxGeometry(3.2, 0.7, 0.9), 'obj', 0, 4.2, 0, 0, 'plenum');
  P(new THREE.BoxGeometry(0.35, 2.6, 2.5), 'objShade', 2.4, 2.0, 0, 0, 'front');
  const rms = mesh(new THREE.TorusGeometry(0.75, 0.14, 10, 28), ownMat('accent')); rms.rotation.y = Math.PI / 2; at(rms, -2.36, 1.6, 0); eng.add(rms); parts.push(rms);
  eng.scale.setScalar(1.35); eng.position.y = 0.5; g.add(eng);
  // dealer service bay with a car on the lift
  const bay = new THREE.Group();
  bay.add(box(10, 0.3, 8, 'objShade', 0, 0, 0)); bay.add(box(10, 6, 0.4, 'obj', 0, 0, -4)); bay.add(box(0.4, 6, 8, 'obj', -5, 0, 0)); bay.add(box(0.4, 6, 8, 'obj', 5, 0, 0));
  bay.add(box(10.4, 0.4, 8.4, 'objShade', 0, 6, 0));
  [-1.6, 1.6].forEach(z => bay.add(box(0.3, 5, 0.3, 'objDark', 0, 0, z)));
  const lifted = vmesh('sedan', 0.95); bay.add(lifted);
  at(bay, 14, 0, -6); g.add(bay);
  const cMark = mark({ name: 'Chrysler Group', sub: 'Powertrain sealing · Auburn Hills', mono: 'C', logo: 'chrysler-group' }, 7.8, 2.1); at(cMark, 11.2, 7.6, -1.7); g.add(cMark);
  const sign = grp(cyl(0.1, 0.1, 5, 'objDark'), box(3, 1.2, 0.2, 'accent', 0, 5, 0)); at(sign, 8, 0, 4); g.add(sign);
  const hl = new THREE.Color();
  return {
    group: g, anchors: { engine: pin(eng, 0, 4.6, 0), rms: pin(rms, 0, 0, 0), bay: pin(bay, 3.8, 8.6, -2) },
    update(t, k) {
      eng.rotation.y = 0.5 + Math.sin(t * 0.25) * 0.9;
      const lit = Math.floor(t / 0.9) % parts.length;
      parts.forEach((p, i) => { p.material.emissive.copy(hl.set(tok('accent'))).multiplyScalar(i === lit ? 0.55 * k : 0); });
      lifted.position.y = 0.4 + 1.9 * (0.5 + 0.5 * Math.sin(t * 0.5));
    }
  };
};

B.jci = () => {
  const g = new THREE.Group();
  g.add(plinth(7));
  const seat = new THREE.Group();
  const frame = grp(box(0.2, 0.2, 2.4, 'objDark', -0.9, 0.6, 0), box(0.2, 0.2, 2.4, 'objDark', 0.9, 0.6, 0), box(2, 0.2, 0.2, 'objDark', 0, 0.6, 1.1), box(2, 0.2, 0.2, 'objDark', 0, 0.6, -1.1),
    box(0.2, 3, 0.2, 'objDark', -0.9, 0.8, -1.1), box(0.2, 3, 0.2, 'objDark', 0.9, 0.8, -1.1), box(2, 0.2, 0.2, 'objDark', 0, 3.7, -1.1), box(0.4, 0.6, 1.6, 'objDark', -1.2, 0.3, 0));
  const foam = grp(box(2.1, 0.55, 2.2, 'obj', 0, 0.85, 0.1), box(2.1, 2.7, 0.5, 'obj', 0, 1.35, -1.25), box(1.2, 0.75, 0.4, 'obj', 0, 4.25, -1.25));
  const trim = grp(box(2.3, 0.18, 2.35, 'accent', 0, 1.42, 0.1), box(2.3, 2.8, 0.14, 'objShade', 0, 1.3, -0.95), box(1.3, 0.8, 0.12, 'objShade', 0, 4.2, -1.0));
  [frame, foam, trim].forEach(p => seat.add(p));
  seat.scale.setScalar(1.45); seat.position.y = 0.5; seat.rotation.y = 0.5; g.add(seat);
  // conveyor feeding seats into a full-size pickup
  g.add(box(22, 1.1, 2.2, 'objShade', -6, 0, -11));
  g.add(box(14, 4.4, 5, 'obj', -8, 0, -17)); g.add(box(14.3, 0.3, 5.3, 'objShade', -8, 4.4, -17));
  const jMark = mark({ name: 'Johnson Controls', sub: 'Automotive seating · Plymouth', mono: 'JC', logo: 'jci' }, 8, 2.1); at(jMark, -8, 2.4, -14.44); g.add(jMark);
  const truck = vmesh('pickup', 1.7); at(truck, 12, 0, -11, Math.PI); g.add(truck);
  const mini = []; for (let i = 0; i < 6; i++) { const s = grp(box(1.3, 0.4, 1.3, 'obj', 0, 0, 0), box(1.3, 1.5, 0.3, 'obj', 0, 0.3, -0.55)); g.add(s); mini.push(s); }
  const fork = grp(box(2.6, 1.6, 1.8, 'accent', 0, 0.3, 0), box(1.6, 1.4, 1.6, 'obj', -0.3, 1.9, 0), box(0.2, 3.6, 1.4, 'objDark', 1.5, 0.2, 0), box(1.6, 0.15, 1.2, 'objDark', 2.3, 0.6, 0), box(1.4, 1.4, 1.2, 'objShade', 2.3, 0.75, 0));
  g.add(fork);
  /* round 27: the plant complex around the line: halls, a stack, a water tower, staff parking, people and yard traffic */
  const hall = new THREE.Group(); hall.add(box(20, 6, 8, 'obj', 0, 0, 0));
  for (let i = 0; i < 5; i++) { const r = mesh(new THREE.CylinderGeometry(0.01, 1.6, 1.4, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), mat('objShade')); at(r, -8 + i * 4, 6.7, 0); r.scale.set(1, 1, 2.6); hall.add(r); }
  for (let i = 0; i < 4; i++) hall.add(box(2.2, 2.6, 0.1, 'objDark', -7 + i * 4.6, 0, 4.03));
  at(hall, 13, 0, -21); g.add(hall);
  const hall2 = grp(box(12, 8.5, 9, 'objShade', 0, 0, 0), box(12.3, 0.4, 9.3, 'obj', 0, 8.5, 0)); for (let r = 0; r < 3; r++) hall2.add(box(11, 0.5, 0.1, 'objDark', 0, 2 + r * 2.2, 4.53)); at(hall2, -18, 0, -24); g.add(hall2);
  const stack = grp(cyl(0.7, 0.95, 15, 'objShade', 0, 0, 0, 16), cyl(0.75, 0.75, 0.5, 'accent', 0, 13.2, 0, 16)); at(stack, 23, 0, -25); g.add(stack);
  const puffs = []; for (let i = 0; i < 5; i++) { const m = new THREE.MeshLambertMaterial({ color: '#E3E8EE', transparent: true, opacity: 0.6 }); const p = sph(0.9, m, 23, 15, -25, 10); g.add(p); puffs.push(p); }
  const wt = grp(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => cyl(0.1, 0.12, 8, 'objDark', x * 1.1, 0, z * 1.1, 6)), sph(2, 'obj', 0, 9.4, 0, 18), cyl(0.15, 0.15, 1, 'objDark', 0, 11.2, 0, 6));
  at(wt, -2, 0, -29); g.add(wt);
  g.add(box(13, 0.06, 7, 'road', 15.5, 0, 5));
  for (let i = 0; i < 6; i++) g.add(box(0.12, 0.08, 2.4, 'obj', 9.6 + i * 2.3, 0.02, 3.3));
  const lot = ['compact', 'suv', 'compact', 'pickup', 'compact', 'suv', 'compact', 'compact'];
  lot.forEach((v, i) => { const c = vmesh(v, 0.62); at(c, 10.7 + (i % 4) * 2.3 + (i < 4 ? 0 : 1.15), 0, i < 4 ? 3.3 : 6.9, i < 4 ? Math.PI / 2 : -Math.PI / 2); g.add(c); });
  const walkers = []; for (let i = 0; i < 7; i++) { const p = person(['accent', 'cobalt', 'obj', 'objDark'][i % 4], 0.85); g.add(p); walkers.push({ p, ph: i / 7 }); }
  g.add(box(46, 0.06, 2.6, 'road', 0, 0, -31.5));
  const semis = [0, 0.5].map(o => { const v = vmesh('semi', 0.75); g.add(v); return { v, o }; });
  const tug = vmesh('van', 0.7); g.add(tug);
  return {
    group: g, anchors: { seat: pin(foam, 0, 3, 0), truck: pin(truck, 0, 2.6, 0) },
    update(t, k) {
      puffs.forEach((p, i) => { const q = (t * 0.12 + i / 5) % 1; p.position.set(23 + q * 3, 15 + q * 6, -25 - q * 1.5); p.scale.setScalar(0.6 + q * 1.6); p.material.opacity = 0.55 * (1 - q); });
      walkers.forEach((w, i) => { const q = (t * 0.05 + w.ph) % 1, f = q < 0.5 ? q * 2 : 2 - q * 2; w.p.position.set(lerp(8.5 + (i % 3) * 0.6, 6 + (i % 3), f), 0, lerp(5.5, -16.6, f)); w.p.rotation.y = q < 0.5 ? Math.PI : 0; });
      semis.forEach(({ v, o }) => { const q = (t * 0.03 + o) % 1; at(v, o ? lerp(26, -26, q) : lerp(-26, 26, q), 0, -31.5 + (o ? 0.6 : -0.6), o ? Math.PI : 0); });
      { const q = (t * 0.07) % 1, f = q < 0.5 ? q * 2 : 2 - q * 2; at(tug, lerp(-12, 4, smooth(0, 1, f)), 0, -14.6, q < 0.5 ? 0 : Math.PI); }
      const e = k * smooth(0.15, 0.85, 0.5 + 0.5 * Math.sin(t * 0.8));
      foam.position.set(0, e * 1.3, e * 0.9); trim.position.set(0, e * 2.7, e * 2.1);
      mini.forEach((s, i) => { const f = (t * 0.06 + i / 6) % 1; at(s, -16 + f * 24, 1.1, -11); s.scale.setScalar(f > 0.92 ? (1 - f) * 12 : 1); });
      fork.position.set(-13 + Math.sin(t * 0.4) * 4, 0, 4.5);
    }
  };
};

/* Kettering: campus on the left, the plant on the right, the road between. */
B.kettering = () => {
  const g = new THREE.Group();
  const ket = ketteringAB(); at(ket, -3, 0, -15); g.add(ket);
  const kMark = billboard({ name: 'Kettering University', sub: 'Mechanical Engineering · Flint, Michigan', mono: 'K', logo: 'kettering-seal' }, 7.6, 2, 1.4); at(kMark, 6, 0, -5.2, -0.12); g.add(kMark);
  const dog = bulldog(); at(dog, -6, 0, -6.2, 0.5); g.add(dog);
  const dl = label('The Bulldog', { size: 18, key: 'ink', bg: 'card', scale: 0.7 }); dl.position.set(-6, 5.6, -6.2); g.add(dl);
  /* round 27: the bulldog lives on a campus poster and on the flags; the flags read KU */
  const poster = bulldogPoster(3, 4.1); poster.position.set(-13.5, 3.6, -11.1); g.add(poster);
  const kflags = [[-8.2, 'ket'], [2.2, 'ketdog'], [-16.8, 'ketdog']].map(([x, k]) => { const f = wavingFlag(k, 6.2, 2.2); at(f, x, 0, -9.4); g.add(f); return f; });
  // the plant he went to between terms
  const plant = grp(box(10, 4.2, 6, 'obj', 0, 0, 0));
  for (let i = 0; i < 3; i++) { const p = mesh(new THREE.CylinderGeometry(0.01, 1.9, 1.6, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), mat('objShade')); at(p, -3.2 + i * 3.2, 4.8, 0); p.scale.set(1, 1, 3.1); plant.add(p); }
  plant.add(cyl(0.5, 0.6, 7, 'objShade', 4, 0, -1.5, 12));
  at(plant, 13, 0, -10); g.add(plant);
  const fMark = mark({ name: 'Federal-Mogul', sub: 'Engineering co-op', mono: 'FM', logo: 'fm' }, 7, 1.9); at(fMark, 13, 2.2, -6.94); g.add(fMark);
  // the road between them, and the shuttle
  g.add(box(28, 0.08, 2.8, 'road', 1, 0, 1.5));
  const bus = vmesh('bus', 0.6); g.add(bus);
  const caps = []; for (let i = 0; i < 4; i++) { const c = grp(box(1, 0.08, 1, 'objDark'), cyl(0.3, 0.3, 0.3, 'objDark', 0, -0.3, 0, 8)); g.add(c); caps.push(c); }
  return {
    group: g, anchors: { kettering: pin(ket, 0, 7.4, 4.6), bus: pin(bus, 0, 3, 0), plant: pin(plant, -2, 5.4, 3) },
    update(t) {
      const ph = (t * 0.11) % 2, leg = ph < 1 ? ph : 2 - ph;
      const m = smooth(0.25, 0.75, leg);
      at(bus, lerp(-9, 11, m), 0, 1.5, ph < 1 ? 0 : Math.PI);
      caps.forEach((c, i) => { const q = (t * 0.4 + i / 4) % 1; c.position.set(-5.5 + i * 1.2, 10 + q * 6, -10); c.rotation.set(t + i, t * 2 + i, 0); c.visible = q < 0.9; });
      kflags.forEach(f => wave(f, t));
    }
  };
};

/* Federal-Mogul as a co-op: HEMI gaskets and a test rack of OEM seals. */
B.fmcoop = () => {
  const g = new THREE.Group();
  g.add(plinth(5.4, -2, 0));
  const hemi = mesh(extrude(ringShape(6, 1.7, 0.6, 5.2, 0.95, 0.35), 0.28), mat('obj'));
  hemi.geometry.center();
  const hemiG = grp(cyl(0.15, 0.2, 2.2, 'objDark'), at(hemi, 0, 3.1, 0));
  at(hemiG, -2, 0.5, 0); g.add(hemiG);
  const riser = mesh(new THREE.TorusGeometry(0.7, 0.18, 8, 20), mat('accent')); at(riser, 1.2, 1.4, 2.2); riser.rotation.x = Math.PI / 2; g.add(riser);
  const rack = grp(box(5, 0.3, 2, 'objShade', 0, 1.6, 0), box(0.3, 1.6, 0.3, 'objDark', -2.2, 0, 0), box(0.3, 1.6, 0.3, 'objDark', 2.2, 0, 0));
  const seals = []; for (let i = 0; i < 5; i++) { const s = mesh(new THREE.TorusGeometry(0.4, 0.13, 8, 18), mat(i % 2 ? 'accent' : 'obj')); s.rotation.x = Math.PI / 2; rack.add(s); seals.push(s); }
  at(rack, 12, 0, -2); g.add(rack);
  const plant = grp(box(13, 4.6, 6, 'obj', 0, 0, 0));
  for (let i = 0; i < 4; i++) { const p = mesh(new THREE.CylinderGeometry(0.01, 1.7, 1.6, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), mat('objShade')); at(p, -4.8 + i * 3.2, 5.2, 0); p.scale.set(1, 1, 3.1); plant.add(p); }
  at(plant, -12, 0, -12); g.add(plant);
  const pMark = mark({ name: 'Federal-Mogul', sub: 'Engineering co-op', mono: 'FM', logo: 'fm' }, 7.6, 2.1); at(pMark, -12, 2.6, -8.94); g.add(pMark);
  return {
    group: g,
    anchors: { hemi: pin(hemiG, 0, 4.2, 0), rack: pin(rack, 0, 2.6, 0) },
    update(t) {
      hemiG.children[1].rotation.y = t * 0.5;
      riser.rotation.z = t * 0.8;
      seals.forEach((s, i) => { const f = (t * 0.25 + i / 5) % 1; s.position.set(-2 + f * 4, 2.1 + Math.sin(f * Math.PI) * 0.6, 0); s.rotation.z = t * 2; });
    }
  };
};

/* Michigan Ross: evenings and weekends after days at Johnson Controls,
   then recruiting on campus. */
B.ross = () => {
  const g = new THREE.Group();
  // the Ross building, its winter garden on the corner, and the bur oak in front
  const ross = rossBuilding(); at(ross, 9, 0, -10); g.add(ross);
  const rMark = mark({ name: 'Michigan Ross', sub: 'Ross School of Business · MBA', mono: 'M', logo: 'michigan' }, 7.6, 2.05); at(rMark, 11.5, 9.9, -6.6); g.add(rMark);
  const oak = burOak(1); at(oak, -11, 0, -6); g.add(oak);
  const ol = label('The bur oak, moved to make room for Ross', { size: 18, key: 'ink', bg: 'card', scale: 0.8 }); ol.position.set(-11, 12.6, -6); g.add(ol);
  // a big block M by the road, and maize and blue flags
  const bm = blockMSign(4.6); at(bm, -2, 0, 6.5, 0.08); g.add(bm);
  const flags = [];
  [-20, -14, 14, 22].forEach((x, i) => { const f = wavingFlag(i % 2 ? 'maize' : 'm', 6.2, 2.4); at(f, x, 0, 9.8); g.add(f); flags.push(f); });
  // the campus walk, with students and an evening commute car
  g.add(box(34, 0.08, 2.6, 'curb', -1, 0, 1.4));
  const car = vmesh('compact', 0.8); g.add(car);
  const lamp = mesh(new THREE.ConeGeometry(1.4, 4, 16, 1, true).rotateZ(Math.PI / 2), glowMat('sun', 0.18), false); car.add(lamp); lamp.position.set(3.2, 0.9, 0);
  const crowd = []; for (let i = 0; i < 12; i++) { const p = person(i % 3 === 0 ? 'accent' : 'obj', 0.8); g.add(p); crowd.push(p); }
  // the next exit: General Motors
  const sign = grp(cyl(0.14, 0.16, 4.6, 'objDark', -2.8, 0, 0), cyl(0.14, 0.16, 4.6, 'objDark', 2.8, 0, 0));
  const sp = signPanel('Next: General Motors  →', 8.4, 1.9); sp.position.set(0, 5.35, 0.1); sign.add(sp);
  sign.add(box(8.6, 2.1, 0.1, 'objDark', 0, 4.3, -0.02));
  at(sign, 7.6, 0, 6.2, -0.12); g.add(sign);
  const caps = []; for (let i = 0; i < 4; i++) { const c = grp(box(1, 0.08, 1, 'objDark'), cyl(0.3, 0.3, 0.3, 'objDark', 0, -0.3, 0, 8)); g.add(c); caps.push(c); }
  // v36: Ross MAP, fall 2012: a week on site in Victoria, British Columbia.
  // The BC Parliament Buildings on the Inner Harbour, a floatplane and Canadian flags.
  const vic = new THREE.Group();
  const parl = grp(box(15, 3.6, 3.4, 'obj', 0, 0, 0), box(15.4, 0.3, 3.8, 'objShade', 0, 3.6, 0),
    box(4.4, 5.2, 4, 'obj', 0, 0, 0.3), cyl(1.8, 1.9, 2.2, 'obj', 0, 5.2, 0.3, 20));
  const pDome = mesh(new THREE.SphereGeometry(2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('tree')); pDome.position.set(0, 7.4, 0.3); parl.add(pDome);
  parl.add(cyl(0.12, 0.12, 1.6, 'objDark', 0, 9.3, 0.3, 8));
  [-6.6, 6.6].forEach(x => { parl.add(box(1.9, 4.8, 2.2, 'obj', x, 0, 0.4)); const d = mesh(new THREE.SphereGeometry(0.95, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('tree')); d.position.set(x, 4.8, 0.4); parl.add(d); });
  for (let i = 0; i < 6; i++) parl.add(box(0.9, 1.4, 0.08, 'glass', -5.3 + i * 2.1 + (i > 2 ? 0.2 : -0.2), 1.3, 1.74));
  at(parl, 27, 0, -13); vic.add(parl);
  const harbour = mesh(new THREE.PlaneGeometry(30, 7), mat('water'), false); harbour.rotation.x = -Math.PI / 2; harbour.position.set(27, 0.06, -6); vic.add(harbour);
  const fplane = plane(0.34, 'obj'); [-0.7, 0.7].forEach(z => fplane.add(at(mesh(new THREE.CapsuleGeometry(0.22, 2.6, 4, 8).rotateZ(Math.PI / 2), mat('objDark')), 0.2, -1.1, z * 1.6))); vic.add(fplane);
  const caFlags = [18.6, 35.4].map(x => { const f = at(flag(6.4, 'accent', 'CA'), x, 0, -10.5); vic.add(f); return f; });
  g.add(vic);
  const lVic = label('CANADA · Victoria, British Columbia', { size: 20, key: 'ink', bg: 'card', scale: 0.56, weight: 800 }); lVic.position.set(19, 6.6, 1); g.add(lVic);
  return {
    group: g, anchors: { ross: pin(ross, -5.5, 7.6, 3.6), next: pin(sign, 0, 7.4, 0), victoria: pin(parl, 0, 10, 0.3) },
    update(t) {
      caFlags.forEach(f => waveFlag(f, t));
      { const q = (t * 0.05) % 1, x = lerp(14, 40, q); fplane.position.set(x, 0.55 + Math.sin(t * 1.6) * 0.06 + (q > 0.8 ? (q - 0.8) * 30 : 0), -6); fplane.rotation.set(0, 0, q > 0.8 ? 0.18 : 0); }
      flags.forEach(f => wave(f, t));
      const ph = (t * 0.08) % 2, leg = ph < 1 ? ph : 2 - ph, m = smooth(0.15, 0.85, leg);
      at(car, lerp(-15, 13, m), 0, 1.4, ph < 1 ? 0 : Math.PI);
      crowd.forEach((p, i) => { const q = (t * 0.035 + i / 12) % 1; p.position.set(lerp(-18, 18, q) * (i % 2 ? 1 : -1), 0, 3.6 + (i % 3) * 0.9); });
      caps.forEach((c, i) => { const q = (t * 0.35 + i / 4) % 1; c.position.set(4 + i * 1.5, 11 + q * 6, -8); c.rotation.set(t + i, t * 2 + i, 0); c.visible = q < 0.9; });
    }
  };
};

B.traverse = () => {
  const g = new THREE.Group();
  const tt = plinth(7.2); g.add(tt);
  const car = vmesh('suv', 1.5); car.position.y = 0.5; tt.add(car);
  const tags = []; const tm = glowMat('accent', 0.95);
  for (let i = 0; i < 12; i++) { const p = mesh(new THREE.PlaneGeometry(1.3, 0.55), tm, false); g.add(p); tags.push(p); }
  const mon = grp(box(0.4, 1.8, 0.4, 'objDark', 0, 0, 0), box(5.2, 3.4, 0.25, 'objDark', 0, 1.8, 0), box(4.8, 3, 0.05, 'card', 0, 2, 0.14));
  const bars = []; for (let i = 0; i < 7; i++) { const b = box(0.45, 1, 0.08, i < 2 ? 'accent' : 'objShade', -1.8 + i * 0.6, 0, 0.2); b.position.y = 2.2; mon.add(b); bars.push(b); }
  at(mon, 13, 0, -6, -0.35); g.add(mon);
  const gmB = billboard({ name: 'Chevrolet', sub: 'Product Marketing · General Motors', mono: 'GM', logo: 'chevrolet' }, 8, 2.1, 2.6); at(gmB, -13, 0, -9, 0.25); g.add(gmB);
  const lbl = label('COMBOS −10%', { size: 18, key: 'ink', bg: 'card', scale: 0.55 }); lbl.position.set(13, 6.6, -6); g.add(lbl);

  /* round 28: Warren, Michigan. The GM Global Technical Center (Eero Saarinen, 1956; a National
     Historic Landmark since 2014): low glass-walled buildings with glazed brick end walls in
     strong colours, ringed round a rectangular reflecting lake with willow islands, the
     stainless steel water tower standing in the lake, the Calder fountain at the same end, and
     the low aluminium dome of the design studios. Behind it, the Milford Proving Ground. */
  const tc = new THREE.Group(); g.add(tc);
  const BRICK = ['#C8382E', '#2D5AA8', '#E8C23A', '#E07A2E', '#5A9BD5', '#2A2A2A'].map(c => new THREE.MeshLambertMaterial({ color: c }));
  function saarinen(len, dep, h, ends, x, z, ry = 0) {
    const b = grp(box(len, h, dep, 'obj', 0, 0, 0), box(len + 0.3, 0.22, dep + 0.3, 'objShade', 0, h, 0));
    [0.25, 0.62].forEach(f => { b.add(box(len - 0.2, h * 0.24, 0.06, 'glass', 0, h * f, dep / 2 + 0.02)); b.add(box(len - 0.2, h * 0.24, 0.06, 'glass', 0, h * f, -dep / 2 - 0.02)); });
    for (let i = 1; i < len / 1.6; i++) b.add(box(0.06, h * 0.9, 0.08, 'objShade', -len / 2 + i * 1.6, 0, dep / 2 + 0.04));
    [-1, 1].forEach((sd, k) => b.add(at(mesh(new THREE.BoxGeometry(0.16, h + 0.05, dep + 0.05), BRICK[ends[k]]), sd * len / 2, h / 2, 0)));
    return at(b, x, 0, z, ry);
  }
  // the reflecting lake, edged in a pale walk
  const LX = 9, LZ = -21.5, LW = 30, LD = 11;
  tc.add(box(LW + 1.6, 0.06, LD + 1.6, 'curb', LX, 0, LZ));
  const lake = mesh(new THREE.PlaneGeometry(LW, LD), mat('water'), false); lake.rotation.x = -Math.PI / 2; lake.position.set(LX, 0.09, LZ); tc.add(lake);
  const sheen = mesh(new THREE.PlaneGeometry(LW, LD), glowMat('cobalt', 0.2), false); sheen.rotation.x = -Math.PI / 2; sheen.position.set(LX, 0.11, LZ); tc.add(sheen);
  // willow islands
  [[3.5, -19.6, 1.5], [11.5, -24, 1.15], [-1, -23.6, 0.9]].forEach(([x, z, r]) => {
    tc.add(cyl(r, r + 0.15, 0.2, 'terrainHi', x, 0, z, 16));
    const wl = grp(cyl(0.12, 0.16, 1.2, 'objDark', 0, 0, 0, 6), mesh(new THREE.ConeGeometry(r * 0.9, 2.2, 10), mat('tree')));
    wl.children[1].position.y = 1.9; at(wl, x, 0.2, z); tc.add(wl);
  });
  // the stainless steel water tower, standing in the lake on three legs
  const tower = new THREE.Group();
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; const leg = cyl(0.13, 0.16, 11, 'objShade', Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1, 8); tower.add(leg); }
  tower.add(cyl(0.35, 0.35, 11, 'objShade', 0, 0, 0, 10));
  const tank = sph(2.6, 'obj', 0, 13, 0, 28); tank.scale.y = 0.72; tower.add(tank);
  at(tower, 20, 0, LZ); tc.add(tower);
  // the Calder fountain at the same end: a row of jets that rise and fall
  const jets = []; for (let i = 0; i < 9; i++) { const j = mesh(new THREE.CylinderGeometry(0.07, 0.16, 1, 6), glowMat('water', 0.85), false); j.position.set(23.2, 0, LZ - 4 + i); tc.add(j); jets.push(j); }
  // the styling dome: a low aluminium dome on a ring wall
  const dome = grp(cyl(6.6, 6.6, 1.4, 'obj', 0, 0, 0, 40));
  const cap = mesh(new THREE.SphereGeometry(9.4, 40, 10, 0, Math.PI * 2, 0, 0.78), mat('glass')); cap.position.y = 1.4 - 9.4 * Math.cos(0.78); dome.add(cap);
  at(dome, -6, 0, -37); tc.add(dome);
  // low glass buildings round the lake, each with coloured brick end walls
  tc.add(saarinen(30, 4.4, 3.2, [0, 1], 16, -32));
  tc.add(saarinen(24, 4, 2.6, [2, 3], 22, -40.5));
  tc.add(saarinen(14, 4, 3.0, [3, 5], 33.5, -21.5, Math.PI / 2));
  tc.add(saarinen(11, 3.6, 2.4, [4, 0], -10, -22, Math.PI / 2));
  tc.add(saarinen(9, 4, 4.6, [1, 2], 5, -45));
  // rows of trees along the drives
  for (let i = 0; i < 9; i++) { const tr = grp(cyl(0.12, 0.15, 0.9, 'objDark', 0, 0, 0, 6), sph(1.05, 'tree', 0, 1.6, 0, 10)); at(tr, -4 + i * 4.2, 0, -14.2); tc.add(tr); }
  for (let i = 0; i < 5; i++) { const tr = grp(cyl(0.12, 0.15, 0.9, 'objDark', 0, 0, 0, 6), sph(0.95, 'tree', 0, 1.5, 0, 10)); at(tr, 37.5, 0, -15 - i * 4.4); tc.add(tr); }
  // staff walking the lakeside path
  const walkers = []; for (let i = 0; i < 8; i++) { const p = person(i % 3 === 0 ? 'objDark' : 'obj', 0.62); tc.add(p); walkers.push(p); }
  const lTc = label('GM GLOBAL TECHNICAL CENTER · WARREN, MI', { size: 22, key: 'ink', bg: 'card', scale: 1.05, weight: 800 }); lTc.position.set(LX - 4, 14.5, LZ - 6); tc.add(lTc);
  const lTc2 = label('Eero Saarinen, 1956 · National Historic Landmark', { size: 19, key: 'ink', bg: 'card', scale: 0.85 }); lTc2.position.set(LX - 4, 12.3, LZ - 6); tc.add(lTc2);

  // the Milford Proving Ground: the road course loop, the Black Lake pad and test cars
  const mpg = new THREE.Group(); g.add(mpg);
  const MX = 15, MZ = -62, MW = 50, MD = 20;
  const loop = mesh(extrude(ringShape(MW, MD, 8, MW - 3.4, MD - 3.4, 6.4), 0.08), mat('road'), false);
  loop.rotation.x = -Math.PI / 2; loop.position.set(MX, 0.05, MZ); mpg.add(loop);
  const pad = box(16, 0.06, 7.5, 'objDark', MX + 6, 0, MZ); mpg.add(pad);
  [[-14, -2.5], [-9, 3], [-18, 4]].forEach(([x, z]) => { const h = mesh(new THREE.SphereGeometry(2.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('tree')); h.scale.y = 0.55; h.position.set(MX + x, 0, MZ + z); mpg.add(h); });
  const path = roundedRect(MW - 1.7, MD - 1.7, 7.2).getSpacedPoints(240);
  const testCars = ['sedan', 'suv', 'pickup', 'compact'].map((ty, i) => { const c = vmesh(ty, 0.8, i % 2 ? 'objDark' : 'obj'); mpg.add(c); return c; });
  const drift = vmesh('sedan', 0.75); mpg.add(drift);
  const lMpg = label('MILFORD PROVING GROUND · GM test track since 1924', { size: 22, key: 'ink', bg: 'card', scale: 1.05, weight: 800 }); lMpg.position.set(MX - 8, 8, MZ + 2); mpg.add(lMpg);
  return {
    group: g, anchors: { car: pin(car, 0, 2.6, 0), tool: pin(mon, 0, 5.2, 0) },
    update(t, k) {
      jets.forEach((j, i) => { const h = 1.2 + 1.6 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.7)); j.scale.y = h; j.position.y = h / 2; });
      walkers.forEach((p, i) => { const q = (t * 0.03 + i / 8) % 1, x = LX - LW / 2 - 0.3 + q * (LW + 0.6); p.position.set(i % 2 ? x : LX * 2 - x, 0, i % 2 ? LZ + LD / 2 + 1.3 : LZ - LD / 2 - 1.3); p.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2; });
      testCars.forEach((c, i) => { const n = path.length, f = ((t * 0.045 + i / 4) % 1) * n, a = path[Math.floor(f) % n], b = path[(Math.floor(f) + 2) % n];
        c.position.set(MX + a.x, 0.12, MZ - a.y); c.rotation.y = -Math.atan2(-(b.y - a.y), b.x - a.x); });
      { const a = t * 1.1; drift.position.set(MX + 6 + Math.cos(a) * 4.5, 0.12, MZ + Math.sin(a) * 2.2); drift.rotation.y = -a - Math.PI / 2 + 0.5; }
      tt.rotation.y = t * 0.3;
      tags.forEach((p, i) => { const f = (t * 0.22 + i / 12) % 1, a = i * 2.1; p.position.set(Math.cos(a) * 5, 8 - f * 7.5, Math.sin(a) * 4); p.rotation.set(t + i, t * 0.7 + i, 0); p.visible = k > 0.2 && f < 0.95; });
      const cut = 0.5 + 0.5 * Math.sin(t * 0.6);
      bars.forEach((b, i) => { const h = 0.4 + (1 - i / 7) * 2.2 * (1 - 0.1 * cut * (i > 1 ? 1 : 0)); b.scale.y = h; });
    }
  };
};

B.cx = () => {
  const g = new THREE.Group();
  const op = grp(box(13, 4.2, 8, 'obj', 0, 0, 0), box(10, 2.6, 6.6, 'obj', 0, 4.2, 0), box(13.4, 0.35, 8.4, 'objShade', 0, 4.2, 0), box(2.4, 3, 0.1, 'objDark', 0, 0, 4.02));
  const dome = mesh(new THREE.SphereGeometry(3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('objShade')); at(dome, 0, 6.8, 0); op.add(dome);
  for (let i = 0; i < 6; i++) op.add(cyl(0.25, 0.25, 4.2, 'obj', -5 + i * 2, 0, 4.6, 10));
  for (let i = 0; i < 4; i++) op.add(box(1, 1.8, 0.08, 'glass', -4.5 + i * 3, 4.6, 3.32));
  at(op, -2, 0, -7); g.add(op);
  const people = []; for (let i = 0; i < 26; i++) { const p = person('obj', 0.85); g.add(p); people.push(p); }
  const dealer = grp(box(7, 3.4, 5, 'glass', 0, 0, 0), box(7.4, 0.4, 5.4, 'obj', 0, 3.4, 0), vmesh('suv', 0.8));
  at(dealer, 14, 0, -4); g.add(dealer);
  const lift = dealer.children[2];
  const watchers = []; for (let i = 0; i < 4; i++) { const p = person(i === 1 ? 'accent' : 'obj', 0.8); at(p, 11.6 + i * 1.5, 0, 0.1); p.rotation.y = Math.PI; g.add(p); watchers.push(p); }
  const f = at(flag(7, 'accent', 'EC'), 18.6, 0, -1); g.add(f);
  const f2 = at(flag(5.6, 'accent', 'EC'), 10.4, 0, -1.4); g.add(f2);
  // round 16: Ecuador gets its own corner, with Cotopaxi behind the dealer
  const volc = grp(mesh(new THREE.ConeGeometry(7.5, 9, 7), mat('objShade')), mesh(new THREE.ConeGeometry(2.6, 3.1, 7), mat('card')));
  volc.children[0].position.y = 4.5; volc.children[1].position.y = 7.6; at(volc, 25, 0, -17); g.add(volc);
  const lEc = label('ECUADOR · Quito · Guayaquil', { size: 20, key: 'ink', bg: 'card', scale: 0.56, weight: 800 }); lEc.position.set(18.6, 9, -1); g.add(lEc);
  const lOp = label('Detroit Opera House · HQ workshops', { size: 18, key: 'ink', bg: 'card', scale: 0.5 }); lOp.position.set(-2, 12.6, -7); g.add(lOp);
  // round 16: the Disney Institute work in Orlando: the castle, Epcot's ball and the ears
  const park = new THREE.Group();
  const cas = grp(box(9, 3.2, 5, 'obj', 0, 0, 0), box(4.2, 4.2, 3.2, 'obj', 0, 3.2, 0), box(2, 3, 2, 'obj', 0, 7.4, 0));
  [[-4.2, 2.1, 4.6, 1.0], [4.2, 2.1, 4.6, 1.0], [-1.9, 1.4, 6.6, 0.75], [1.9, 1.4, 6.6, 0.75], [0, 0, 10.4, 0.9], [-4.2, -2.1, 4.2, 0.8], [4.2, -2.1, 4.2, 0.8]].forEach(([x, z, h, r]) => {
    cas.add(cyl(r * 0.8, r * 0.8, h, 'obj', x, 0, z, 12));
    const cone = mesh(new THREE.ConeGeometry(r, r * 2.6, 12), mat('cobalt')); cone.position.set(x, h + r * 1.3, z); cas.add(cone);
  });
  cas.add(box(1.6, 2, 0.1, 'objDark', 0, 0, 2.55));
  at(cas, -17, 0, -21); park.add(cas);
  const ball = mesh(new THREE.IcosahedronGeometry(3.4, 2), mat('glass', { flatShading: true })); ball.position.set(10, 5.6, -21); park.add(ball);
  [[-1.6, -1], [1.6, -1], [0, 1.8]].forEach(([x, z]) => park.add(cyl(0.22, 0.28, 2.6, 'objDark', 10 + x, 0, -21 + z, 8)));
  const ears = grp(sph(1.1, 'objDark', 0, 1.1, 0, 16), sph(0.7, 'objDark', -1.05, 2.15, 0, 14), sph(0.7, 'objDark', 1.05, 2.15, 0, 14));
  at(ears, -13, 0, -12.5); park.add(ears);
  g.add(park);
  const lDw = label('ORLANDO · Walt Disney World', { size: 20, key: 'ink', bg: 'card', scale: 0.56, weight: 800 }); lDw.position.set(-17, 14.2, -21); g.add(lDw);
  const bursts = []; for (let i = 0; i < 3; i++) { const b = mesh(new THREE.TorusGeometry(1, 0.06, 6, 28), glowMat(i === 1 ? 'cobalt' : 'accent', 0.7), false); g.add(b); bursts.push(b); }
  // the trips: a plane from Detroit to Ecuador and Orlando and back
  const jet = plane(0.42, 'objDark'); g.add(jet);
  const choir = []; for (let i = 0; i < 5; i++) { const s = mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 20), glowMat('accent', 0.7), false); s.position.set(-2, 9.5, -7); g.add(s); choir.push(s); }
  return {
    group: g, anchors: { opera: pin(op, 0, 9.5, 0), dealer: pin(dealer, 0, 4.2, 0), window: pin(watchers[1], 0, 2, 0), park: pin(cas, 3.2, 8.6, 2) },
    update(t) {
      waveFlag(f2, t);
      bursts.forEach((b, i) => { const q = (t * 0.35 + i / 3) % 1; b.position.set(-17 + (i - 1) * 5.5, 10.5 + q * 3, -23); b.scale.setScalar(0.3 + q * 1.8); b.material.opacity = 0.7 * (1 - q) * (q > 0.08 ? 1 : 0); });
      { const q = (t * 0.06) % 1, a = q * Math.PI * 2; jet.position.set(-2 + Math.cos(a) * 22, 18 + Math.sin(a * 2) * 1.2, -12 + Math.sin(a) * 8); jet.rotation.set(0, -a - Math.PI / 2, Math.sin(a) * 0.25); }
      lift.position.y = 0.6 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.6)); lift.rotation.y = Math.sin(t * 0.3) * 0.4;
      people.forEach((p, i) => { const q = (t * 0.07 + i / 26) % 1; const x = lerp(-16, -2, q), z = lerp(7, -2.6, q * q); p.position.set(x + Math.sin(i) * 0.6, 0, z); p.visible = q < 0.97; });
      waveFlag(f, t);
      choir.forEach((s, i) => { const q = (t * 0.3 + i / 5) % 1; s.position.y = 9.5 + q * 5; s.scale.setScalar(0.6 + q * 2); s.material.opacity = 0.7 * (1 - q); });
    }
  };
};

B.mexico = () => {
  // round 43: a real GM dealer strip, the kind the BDC rollout visited 350+ times:
  // Buick GMC and Chevrolet showrooms with inventory lots and banderines,
  // brand pylons, a Servicio Express oil-change bay and a body and paint shop.
  const g = new THREE.Group();
  const lots = [-13, 2, 16];
  const flags = [];
  const LAND = ownMat('land', { vertexColors: true });
  const cars = {};
  const car = (t, c, x, y, z, ry = Math.PI / 2, sc = 0.8) => (cars[t] = cars[t] || []).push({ c, x, y, z, ry, sc });
  const sign = (text, w, h, bg, fg, x, y, z) => { const m = signPanel(text, w, h, bg, fg); m.position.set(x, y, z); m.rotation.x = -0.6; g.add(m); return m; };
  // paving, stall lines and the drive the training van uses
  g.add(box(46, 0.06, 2.6, 'road', 4, 0, -2.4));
  g.add(box(30, 0.04, 8.6, 'objShade', -5.5, 0, -7.6));
  for (let x = -19.4; x <= 8.6; x += 2.4) g.add(box(0.08, 0.05, 2.6, 'obj', x, 0, -9.2), box(0.08, 0.05, 2.6, 'obj', x, 0, -6));
  // Buick GMC showroom
  g.add(box(9.4, 3.6, 6, 'obj', -13, 0, -15), box(8.4, 2.4, 0.1, 'glass', -13, 0.2, -11.96), box(9.8, 0.9, 0.3, 'objDark', -13, 2.75, -11.9));
  sign('BUICK · GMC', 7.6, 1.1, '#1E2630', '#FFFFFF', -13, 3.2, -11.72);
  // Chevrolet showroom with a tall entry portal and the gold bowtie
  g.add(box(13, 4.2, 6.4, 'obj', 2, 0, -15.2), box(11.6, 2.8, 0.1, 'glass', 2, 0.2, -11.96), box(3.4, 6, 0.6, 'objDark', 2, 0, -11.9));
  sign('CHEVROLET', 7.4, 1.25, '#F5F5F2', '#1E2630', 7.6, 3.9, -11.6);
  const bow = grp(box(2.1, 0.55, 0.12, 'accent', 0, 0, 0), box(0.7, 1.15, 0.12, 'accent', 0, -0.3, 0));
  bow.rotation.z = -0.06; at(bow, 2, 4.4, -11.55); g.add(bow);
  sign('AGENCIA', 2.6, 0.5, '#1E2630', '#FFFFFF', 2, 3.55, -11.55);
  // Servicio Express: three bays, one car up on a lift
  g.add(box(9.6, 3.8, 6, 'obj', 16, 0, -15));
  [-3, 0, 3].forEach(dx => g.add(box(2.4, 2.8, 0.2, 'objDark', 16 + dx, 0, -11.95)));
  sign('SERVICIO EXPRESS', 8.6, 1.1, '#2F6B4F', '#FFFFFF', 16, 3.25, -11.88);
  g.add(cyl(0.12, 0.12, 2.6, 'accent', 14.6, 0, -11.2), cyl(0.12, 0.12, 2.6, 'accent', 17.4, 0, -11.2), box(2.6, 0.12, 0.5, 'objDark', 16, 1.42, -11.2));
  const lifted = vmesh('compact', 0.72, 'objShade'); at(lifted, 16, 1.55, -11.2, 0); g.add(lifted);
  car('suv', '#C9CED4', 13, 0, -9.6); car('pickup', '#1E1E1E', 19, 0, -9.6);
  const oilPost = grp(cyl(0.07, 0.07, 2.4, 'objDark', 0, 0, 0)); { const sp = signPanel('CAMBIO DE ACEITE', 3, 0.7, '#E8A33D', '#1E2630'); sp.rotation.x = -0.45; oilPost.add(at(sp, 0, 2.7, 0.05)); } at(oilPost, 21.2, 0, -8.4); g.add(oilPost);
  [[-0.5, 0], [0.5, 0], [0, 0.8]].forEach(([dx, dz]) => g.add(cyl(0.38, 0.38, 1, 'objDark', 11.4 + dx, 0, -11.2 + dz, 12)));
  // Hojalatería y Pintura: body shop with a paint booth and a car in primer
  g.add(box(8, 4, 6, 'obj', 26.4, 0, -15), box(4.2, 3.2, 4.4, 'objShade', 26.4, 0, -10.6), box(2.6, 2.4, 0.1, 'objDark', 26.4, 0.1, -8.36));
  g.add(cyl(0.3, 0.3, 1.8, 'objDark', 25.2, 4, -14), cyl(0.3, 0.3, 1.8, 'objDark', 27.6, 4, -14));
  sign('HOJALATERÍA Y PINTURA', 7.8, 1.1, '#8A3B2E', '#FFFFFF', 26.4, 3.35, -11.88);
  const fumes = [0, 1].map(i => { const f = mesh(new THREE.SphereGeometry(0.5, 8, 6), glowMat('obj', 0.4), false); g.add(f); return f; });
  car('suv', '#1F4E8C', 22.4, 0, -6.8, 0.35); const primer = box(1.3, 0.75, 1.9, 'objShade', 22.6, 0.34, -6.4); primer.rotation.y = 0.35; g.add(primer);
  // inventory on the lots, nose out to the street
  const CH = ['#C8102E', '#F2F2F0', '#1E1E1E', '#9AA3AD', '#1F4E8C', '#F2F2F0', '#5C6670'], BG = ['#F2F2F0', '#1E1E1E', '#7A1F2B', '#9AA3AD'];
  let k = 0;
  for (let x = -4.2; x <= 8; x += 2.4) [-9.2, -6].forEach(z => { car(k % 3 === 2 ? 'pickup' : k % 3 ? 'suv' : 'compact', CH[(k * 5) % CH.length], x, 0, z); k++; });
  for (let x = -18.2; x <= -7; x += 2.4) [-9.2, -6].forEach(z => { car(k % 2 ? 'suv' : 'pickup', BG[(k * 3) % BG.length], x, 0, z); k++; });
  Object.entries(cars).forEach(([t, list]) => {
    const im = new THREE.InstancedMesh(vehicleGeo(t), LAND, list.length), o = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((v, i) => { o.position.set(v.x, v.y, v.z); o.rotation.set(0, v.ry, 0); o.scale.setScalar(v.sc); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.set(v.c)); });
    im.castShadow = true; g.add(im);
  });
  // banderines strung over the lots
  const TRI = ['#C8102E', '#F2F2F0', '#1F8A4C', '#F2B456', '#2563EB'];
  const flagG = new THREE.CircleGeometry(0.3, 3); flagG.rotateZ(-Math.PI / 2);
  const bn = []; const runs = [[-19.6, 9, -4.4], [-19.6, 9, -11]];
  runs.forEach(([x0, x1]) => { const n = Math.round((x1 - x0) / 0.85); for (let i = 0; i <= n; i++) bn.push({ x: x0 + (x1 - x0) * i / n, f: i / n, run: bn.length }); });
  const bMat = ownMat('land', { side: THREE.DoubleSide }); const bIm = new THREE.InstancedMesh(flagG, bMat, bn.length); g.add(bIm);
  bn.forEach((b, i) => { b.z = i < bn.length / 2 ? runs[0][2] : runs[1][2]; bIm.setColorAt(i, new THREE.Color(TRI[i % TRI.length])); });
  { const o = new THREE.Object3D(); bn.forEach((b, i) => { o.position.set(b.x, 4.45 - Math.sin(b.f * Math.PI) * 0.9, b.z); o.updateMatrix(); bIm.setMatrixAt(i, o.matrix); }); }  // v55: strung from the start, never stacked at the lot's corner
  runs.forEach(([x0, x1, z]) => [x0, x1].forEach(x => g.add(cyl(0.08, 0.08, 4.6, 'objDark', x, 0, z))));
  // brand pylons at the street
  const pylon = (text, bg, fg, x) => { const p = grp(box(0.5, 5.4, 0.5, 'objDark', 0, 0, 0)); { const sp = signPanel(text, 3.8, 1.2, bg, fg); sp.rotation.x = -0.35; p.add(at(sp, 0, 5.9, 0.28)); } at(p, x, 0, -3.9); g.add(p); return p; };
  pylon('CHEVROLET', '#D9A43A', '#1E2630', 9.6);
  pylon('BUICK · GMC', '#1E2630', '#FFFFFF', -19.2);
  [-4.9, 8.9].forEach(x => { const f = at(flag(6.8, 'accent', 'MX'), x, 0, -11.4); g.add(f); flags.push(f); });
  // shoppers with a salesperson on the Chevrolet lot
  [[-2.9, -7.6, 'cobalt'], [-2.1, -7.4, 'obj'], [-1.2, -7.8, 'accent']].forEach(([x, z, key]) => g.add(at(person(key, 0.75), x, 0, z)));
  const mMark = mark({ name: 'GM de México', sub: 'Dealer business development', mono: 'GM', logo: 'generalmotors' }, 5.6, 1.55); at(mMark, -13, 5.7, -14.6); g.add(mMark);
  const van = vmesh('van', 0.9); g.add(van);
  const counter = label('VISITS 0', { size: 20, key: 'ink', bg: 'card', scale: 0.55 }); g.add(counter);
  // the BDC desk: phones ring, every lead gets a call back
  const desk = grp(box(6, 1.3, 2.2, 'obj', 0, 0, 0), box(1.4, 1, 0.12, 'objDark', -1.8, 1.5, -0.6), box(1.4, 1, 0.12, 'objDark', 0, 1.5, -0.6), box(1.4, 1, 0.12, 'objDark', 1.8, 1.5, -0.6));
  const phones = [-1.8, 0, 1.8].map(x => { const p = box(0.6, 0.25, 0.4, 'accent', x, 1.3, 0.5); desk.add(p); return p; });
  const rings = phones.map(() => { const r = mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 20), glowMat('accent', 0.7), false); r.rotation.x = Math.PI / 2; desk.add(r); return r; });
  [-2, 0, 2].forEach(x => desk.add(at(person('obj', 0.8), x, 0, -1.5)));
  at(desk, -9, 0, 4); g.add(desk);
  // the dealer video series on a big screen
  const scr = grp(box(0.3, 3, 0.3, 'objDark', -2, 0, 0), box(0.3, 3, 0.3, 'objDark', 2, 0, 0), box(6, 3.4, 0.3, 'objDark', 0, 3, 0), box(5.6, 3, 0.05, 'card', 0, 3.2, 0.17));
  const play = mesh(new THREE.CircleGeometry(0.7, 3), mat('accent'), false); play.position.set(0, 4.7, 0.22); scr.add(play);
  const strips = []; for (let i = 0; i < 3; i++) { const s = box(1.4, 0.35, 0.05, 'objShade', 0, 0, 0.21); scr.add(s); strips.push(s); }
  at(scr, 11, 0, 4, -0.2); g.add(scr);
  // street vendors
  [[-18, 7], [18, 6.5]].forEach(([x, z]) => { const c = grp(box(1.8, 1, 1.2, 'obj', 0, 0.3, 0), cyl(0.05, 0.05, 2.2, 'objDark', 0, 1.3, 0), mesh(new THREE.ConeGeometry(1.5, 0.6, 8), mat('accent'))); c.children[2].position.y = 3.6; at(c, x, 0, z); g.add(c); });
  // round 16: Mexico City's Angel of Independence, and the three cities of the rollout
  const angel = grp(box(4.2, 1.6, 4.2, 'objShade', 0, 0, 0), box(2.6, 2.2, 2.6, 'obj', 0, 1.6, 0), cyl(0.55, 0.7, 11, 'obj', 0, 3.8, 0, 16), cyl(0.9, 0.9, 0.6, 'objShade', 0, 14.8, 0, 16), cyl(0.15, 0.45, 1.6, 'accent', 0, 15.4, 0, 10), sph(0.3, 'accent', 0, 17.2, 0, 10));
  const wing = mesh(new THREE.ConeGeometry(0.5, 1.8, 4), mat('accent')); wing.rotation.z = 1.1; wing.position.set(0.7, 16.6, 0); angel.add(wing);
  const wing2 = wing.clone(); wing2.rotation.z = -1.1; wing2.position.x = -0.7; angel.add(wing2);
  at(angel, -24, 0, -16); g.add(angel);
  const lMx = label('MÉXICO · CDMX · Guadalajara · Monterrey', { size: 20, key: 'ink', bg: 'card', scale: 0.56, weight: 800 }); lMx.position.set(2, 9.6, -14); g.add(lMx);
  const jet = plane(0.42, 'objDark'); g.add(jet);
  let visits = 0, last = 0;
  return {
    group: g, anchors: { van: pin(van, 0, 3, 0), desk: pin(desk, 0, 2.6, 0), screen: pin(scr, 0, 5, 0) },
    update(t, k, dt) {
      { const q = (t * 0.05) % 1, x = lerp(-34, 34, q); jet.position.set(x, 15 + Math.sin(q * Math.PI) * 3, -20 + Math.sin(q * Math.PI * 2) * 2); jet.rotation.set(0, 0, Math.cos(q * Math.PI) * -0.12); jet.visible = q > 0.02 && q < 0.98; }
      flags.forEach(f => waveFlag(f, t));
      { const o = new THREE.Object3D(); bn.forEach((b, i) => { const sag = Math.sin(b.f * Math.PI) * 0.9; o.position.set(b.x, 4.45 - sag, b.z); o.rotation.set(Math.sin(t * 2.2 + i * 0.7) * 0.35, 0, 0); o.updateMatrix(); bIm.setMatrixAt(i, o.matrix); }); bIm.instanceMatrix.needsUpdate = true; }
      fumes.forEach((f, i) => { const q = ((t * 0.25 + i * 0.5) % 1); f.position.set(i ? 27.6 : 25.2, 5.9 + q * 2.2, -14); f.scale.setScalar(0.6 + q * 1.4); f.material.opacity = 0.35 * (1 - q); });
      // the training van drives dealer to dealer and stops at each lot
      const seg = (t * 0.12) % 3, i = Math.floor(seg), f = seg - i;
      const xA = lots[i], xB = lots[(i + 1) % 3];
      const move = smooth(0.35, 1, f);
      const x = i === 2 ? lerp(xA, xA + 9, move) : lerp(xA, xB, move);
      at(van, i === 2 && move > 0.99 ? lots[0] : x, 0, -2.4, 0);
      van.visible = !(i === 2 && move > 0.6);
      if (f < 0.35 && t - last > 0.15) { visits = (visits + 1) % 360; last = t; counter.userData.label.text = 'VISITS ' + visits; counter.userData.label.draw(); }
      counter.position.set(van.position.x, 4.4, -2.4); counter.visible = van.visible;
      phones.forEach((p, j) => { const ring = ((t + j * 0.7) % 2.2) < 0.7; p.position.y = 1.3 + (ring ? Math.abs(Math.sin(t * 30)) * 0.1 : 0); const r = rings[j]; const q = ((t + j * 0.7) % 2.2) / 0.7; r.visible = ring; r.position.set(p.position.x, 1.6, 0.5); r.scale.setScalar(0.5 + q * 1.4); r.material.opacity = 0.8 * (1 - q); });
      strips.forEach((s, j) => { s.position.set(-1.8 + ((t * 0.8 + j * 1.2) % 3.6), 2.2 + j * 0.45, 0.21); });
    }
  };
};

B.equinox = () => {
  const g = new THREE.Group();
  g.add(plinth(7.2));
  const car = vmesh('suv', 1.55); car.position.y = 0.5; car.rotation.y = 0.5; g.add(car);
  const beams = [];
  [[-8, 4], [8, 4]].forEach(([x, z]) => {
    g.add(cyl(0.15, 0.2, 11, 'objDark', x, 0, z));
    const cone = mesh(new THREE.ConeGeometry(4, 10, 24, 1, true), glowMat('sun', 0.12), false);
    cone.position.set(x * 0.55, 5.5, z * 0.4); cone.rotation.z = x > 0 ? -0.35 : 0.35; g.add(cone); beams.push(cone);
  });
  for (let i = 0; i < 3; i++) {
    const b = grp(box(4, 2.8, 0.2, 'obj', 0, 1.8, 0), box(0.15, 1.8, 0.15, 'objDark', 0, 0, 0));
    for (let j = 0; j < 4; j++) b.add(box(0.5, 0.4 + ((i * 4 + j) * 7 % 5) * 0.35, 0.05, j === i ? 'accent' : 'objShade', -1.2 + j * 0.8, 2.1, 0.13));
    at(b, -15 + i * 4.5, 0, -9, 0.2); g.add(b);
  }
  const flags = [];
  ['US', 'CA', 'CN', 'KR'].forEach((c, i) => { const f = at(flag(7.5, 'accent', c), 9.5 + i * 3, 0, -9); g.add(f); flags.push(f); });
  const gmB = billboard({ name: 'General Motors', sub: 'Global Product Marketing', mono: 'GM', logo: 'generalmotors' }, 7.4, 2, 2.4); at(gmB, -10.5, 0, -14, 0.2); g.add(gmB);
  return {
    group: g, anchors: { car: pin(car, 0, 2.8, 0), flags: pin(flags[0], 0, 7, 0) },
    update(t) { flags.forEach(f => waveFlag(f, t)); beams.forEach((b, i) => b.material.opacity = 0.08 + 0.05 * Math.sin(t * 2 + i)); car.rotation.y = 0.5 + Math.sin(t * 0.3) * 0.4; }
  };
};

/* A 2020 Buick Encore GX: small crossover, black roof and pillars, Buick wing grille and tri-shield. Nose toward +x. */
const BLACK = new THREE.MeshLambertMaterial({ color: '#202428' });
const CHROME = new THREE.MeshLambertMaterial({ color: '#C9D0D8' });
const TINT = new THREE.MeshLambertMaterial({ color: '#46535F' });
const PAINT = ['#B8322E', '#E9EAEC', '#2E4D73', '#8A9099', '#E9EAEC', '#B8322E'].map(c => new THREE.MeshLambertMaterial({ color: c }));
function encoreGX(bodyKey = 'obj', s = 1) {
  const g = new THREE.Group();
  g.add(box(4.3, 0.62, 1.84, bodyKey, 0, 0.42, 0));                 // lower body
  g.add(box(4.36, 0.26, 1.9, 'objDark', 0, 0.3, 0));                 // dark cladding
  const hood = box(1.25, 0.2, 1.78, bodyKey, 1.45, 0.95, 0); hood.rotation.z = -0.1; g.add(hood);
  g.add(box(2.6, 0.58, 1.68, TINT, -0.4, 1.04, 0));                 // tinted greenhouse
  [-0.84, 0.84].forEach(z => g.add(box(2.62, 0.5, 0.06, BLACK, -0.4, 1.08, z)));   // black pillars / beltline
  const roof = box(2.5, 0.12, 1.66, BLACK, -0.45, 1.62, 0); g.add(roof);           // the black roof
  [-0.6, 0.6].forEach(z => g.add(box(2.1, 0.07, 0.07, 'objDark', -0.5, 1.74, z)));  // roof rails
  g.add(box(0.08, 0.34, 1.12, BLACK, 2.16, 0.58, 0));                // grille
  g.add(box(0.1, 0.06, 1.3, CHROME, 2.19, 0.78, 0));                 // chrome wing
  const shield = cyl(0.13, 0.13, 0.05, CHROME, 0, 0, 0, 16); shield.rotation.z = Math.PI / 2; shield.position.set(2.23, 0.78, 0); g.add(shield);
  [-0.68, 0.68].forEach(z => g.add(box(0.06, 0.1, 0.42, 'sun', 2.16, 0.92, z)));    // slim headlamps
  [[1.35, 0.92], [1.35, -0.92], [-1.4, 0.92], [-1.4, -0.92]].forEach(([x, z]) => { const w = cyl(0.36, 0.36, 0.26, 'objDark', 0, 0, 0, 14); w.rotation.x = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w); });
  g.scale.setScalar(s); g.userData.roof = roof;
  return g;
}

B.launch = (ctx = {}) => {
  const g = new THREE.Group();
  /* ---- story 2: the Encore GX assembly line, where the black roof package goes on ---- */
  g.add(box(34, 0.5, 8, 'objShade', 0, 0, -1));
  g.add(box(31, 0.35, 2.8, 'objDark', 0, 0.5, -1));                                          // conveyor
  for (let i = 0; i < 16; i++) g.add(box(0.08, 0.04, 2.9, 'objShade', -15 + i * 2, 0.85, -1)); // rollers
  [-16, 16].forEach(x => g.add(grp(box(4, 3.6, 4.6, 'obj', x, 0.5, -1), box(4.3, 0.3, 4.9, 'objShade', x, 4.1, -1), box(0.1, 2.4, 3, 'objDark', x + (x < 0 ? 2.02 : -2.02), 0.6, -1))));
  [-9, -4.5, 6.5, 11].forEach(x => { [-1, 1].forEach(s => g.add(box(0.25, 4, 0.25, 'objDark', x, 0.5, -1 + s * 2.1))); g.add(box(0.3, 0.3, 4.5, 'objDark', x, 4.5, -1)); });
  // the black roof station: a frame, two robots and the sign
  const SX = 1;
  [-1, 1].forEach(s => g.add(box(0.5, 5.2, 0.5, 'obj', SX, 0.5, -1 + s * 2.6)));
  g.add(box(2.4, 0.6, 5.7, 'obj', SX, 5.7, -1));
  g.add(box(2.42, 0.18, 5.72, 'accent', SX, 5.6, -1));
  const arms = [-1, 1].map(s => {
    const base = cyl(0.35, 0.45, 1.6, 'objDark', SX - 1.6, 0.5, -1 + s * 2.4, 12); g.add(base);
    const arm = new THREE.Group(); arm.position.set(SX - 1.6, 2.1, -1 + s * 2.4);
    arm.add(at(box(0.3, 0.3, 2.2, 'accent', 0, 0, 0), 0, 0, -s * 1.0)); g.add(arm); arm.userData.s = s; return arm;
  });
  const sign = label('Black roof package', { size: 20, key: 'ink', bg: 'card', scale: 0.62 }); sign.position.set(SX, 8.7, -1); g.add(sign);
  const kr = at(flag(6, 'accent', 'KR'), -19.5, 0, -6); g.add(kr);
  const lKr = label('Built in Korea', { size: 18, key: 'ink', bg: 'card', scale: 0.5 }); lKr.position.set(-18.5, 6.9, -6); g.add(lKr);
  const line = []; for (let i = 0; i < 6; i++) { const c = encoreGX(PAINT[i], 0.86); g.add(c); line.push(c); }
  /* ---- story 1: harness kits matched to builds ---- */
  const shed = grp(box(6, 3.4, 4.5, 'obj', 0, 0, 0), box(6.4, 0.3, 4.9, 'objShade', 0, 3.4, 0), box(2.4, 2.4, 0.1, 'objDark', 1.2, 0, 2.26)); at(shed, -11, 0, -11); g.add(shed);
  const lSh = label('Harness supply', { size: 18, key: 'ink', bg: 'card', scale: 0.5 }); lSh.position.set(-11, 5.0, -11); g.add(lSh);
  const spools = []; for (let i = 0; i < 4; i++) { const s = cyl(0.8, 0.8, 0.9, i % 2 ? 'accent' : 'objShade', -17 + i * 1.9, 0, -13.5); s.rotation.x = Math.PI / 2; s.position.y = 0.8; g.add(s); spools.push(s); }
  g.add(box(14, 0.5, 1.4, 'objDark', -2, 0, -7.6));                                        // kit feeder to the line
  const kits = []; for (let i = 0; i < 4; i++) { const k = box(0.9, 0.6, 0.9, 'accent', 0, 0, 0); g.add(k); kits.push(k); }
  const SLOTS = 6;
  const boardTex = canvasTex(640, 360, (c, W, H, n = 0) => {
    c.clearRect(0, 0, W, H); c.fillStyle = tok('card'); c.fillRect(0, 0, W, H);
    c.strokeStyle = tok('objDark'); c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);
    c.fillStyle = tok('ink'); c.font = '800 34px Inter, Arial, sans-serif'; c.textBaseline = 'middle';
    c.fillText('Harness kits matched to builds', 28, 52);
    ['Trailblazer', 'Encore GX'].forEach((nm, r) => {
      const y = 140 + r * 110;
      c.fillStyle = tok('ink'); c.font = '700 34px Inter, Arial, sans-serif'; c.fillText(nm, 28, y);
      for (let j = 0; j < SLOTS; j++) {
        const x = 250 + j * 62, on = j * 2 + r < n;
        c.fillStyle = on ? tok('accent') : 'rgba(0,0,0,0)'; c.strokeStyle = on ? tok('accent') : tok('objDark'); c.lineWidth = 4;
        c.beginPath(); c.roundRect(x, y - 24, 48, 48, 8); if (on) c.fill(); c.stroke();
        if (on) { c.strokeStyle = '#FFFFFF'; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 12, y); c.lineTo(x + 21, y + 10); c.lineTo(x + 37, y - 10); c.stroke(); }
      }
    });
  });
  const board = grp(box(0.3, 4.4, 0.3, 'objDark', -3.6, 0, 0), box(0.3, 4.4, 0.3, 'objDark', 3.6, 0, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.3), new THREE.MeshBasicMaterial({ map: boardTex })); face.position.set(0, 6.2, 0.2); board.add(face);
  board.add(box(7.9, 4.6, 0.25, 'objDark', 0, 4.05, 0));
  at(board, 9.5, 0, -10.5); g.add(board);
  /* ---- off-line paint for the show cars ---- */
  const booth = grp(box(7, 5, 0.3, 'obj', 0, 0, -3), box(0.3, 5, 6, 'obj', -3.5, 0, 0), box(0.3, 5, 6, 'obj', 3.5, 0, 0), box(7.4, 0.3, 6.4, 'objShade', 0, 5, 0), vmesh('compact', 0.9));
  booth.children[4].position.set(0, 0.2, 0);
  const mist = []; for (let i = 0; i < 8; i++) { const m = sph(0.6, glowMat('obj', 0.5), 0, 0, 0, 10); m.castShadow = false; booth.add(m); mist.push(m); }
  at(booth, 21.5, 0, -8); g.add(booth);
  /* ---- the airlifted show cars land at an airport outside the city ---- */
  const apt = new THREE.Group(); g.add(apt);
  const base = ctx.base || new THREE.Vector3(), hgt = ctx.height || (() => 0);
  const AX = 95, AU = 50;                                     // along the road from the stop, and back from the road
  const zAt = dx => roadZ(base.x + dx) - AU - base.z;
  const ang = Math.atan2(zAt(AX + 40) - zAt(AX - 40), 80);
  let hMax = 0, hMin = 0;
  for (let dx = -48; dx <= 48; dx += 6) for (let dz = -26; dz <= 8; dz += 4) { const wx = base.x + AX + dx, h = hgt(wx, roadZ(wx) - AU + dz); hMax = Math.max(hMax, h); hMin = Math.min(hMin, h); }
  apt.position.set(AX, hMax, zAt(AX)); apt.rotation.y = -ang;
  apt.add(box(94, hMax - hMin + 1.2, 32, 'terrainHi', 0, -(hMax - hMin) - 1.1, -9));        // graded airfield
  apt.add(box(84, 0.14, 7, 'road', 0, 0, 0));                                                // runway
  for (let i = 0; i < 12; i++) apt.add(box(3, 0.02, 0.35, 'line', -34 + i * 6.2, 0.14, 0));  // centerline
  [-40, 40].forEach(x => { for (let j = -3; j <= 3; j++) apt.add(box(1.6, 0.02, 0.4, 'line', x, 0.14, j * 0.9)); });
  apt.add(box(4, 0.12, 6, 'road', 28, 0, -5.5));                                             // taxiway
  apt.add(box(24, 0.12, 8, 'road', 28, 0, -11));                                             // apron
  apt.add(grp(box(18, 3.6, 6, 'obj', 28, 0, -20), box(18.2, 1.2, 6.2, 'glass', 28, 1.4, -20), box(18.6, 0.4, 6.6, 'objShade', 28, 3.6, -20)));  // terminal
  apt.add(grp(cyl(0.9, 1.1, 9, 'obj', 10, 0, -19, 12), cyl(1.8, 1.4, 1.8, 'glass', 10, 9, -19, 12), cyl(1.9, 1.9, 0.3, 'objShade', 10, 10.8, -19, 12)));  // control tower
  const lA = label('Airport', { size: 18, key: 'ink', bg: 'card', scale: 0.55 }); lA.position.set(28, 6.4, -20); apt.add(lA);
  const cp = plane(2.2); const cpw = new THREE.Group(); cpw.add(cp); apt.add(cpw);         // nose toward +x
  const air = [encoreGX(PAINT[0], 0.8), vmesh('suv', 1.1)]; air.forEach(c => apt.add(c));
  return {
    group: g, anchors: { harness: pin(board, 0, 8.6, 0), roof: pin(g, SX, 6.6, -1) },
    update(t) {
      waveFlag(kr, t);
      // the line moves; roofs turn black at the station
      line.forEach((c, i) => {
        const x = -16 + ((t * 1.1 + i * 32 / 6) % 32);
        c.position.set(x, 0.85, -1); c.visible = x > -14.2 && x < 14.2;
        c.userData.roof.material = x > SX ? BLACK : PAINT[i];
      });
      arms.forEach(a => { a.rotation.y = 0.25 * Math.sin(t * 2.2 + a.userData.s); a.rotation.x = 0.12 * Math.sin(t * 3 + a.userData.s); });
      // kits roll from the harness supply to the line, and each one fills the next build slot
      const P = 1.4, n = Math.floor(t / P) % 16;
      kits.forEach((k, i) => { const q = ((t / P + i) % 4) / 4; k.position.set(-8.5 + q * 13, 0.8, -7.6); k.visible = q < 0.96; });
      if (boardTex.userData.n !== n) { boardTex.userData.n = n; boardTex.userData.redraw(Math.min(n, 12)); }
      spools.forEach((s, i) => { s.rotation.y = t * 0.5 + i; });
      mist.forEach((m, i) => { const q = (t * 0.4 + i / 8) % 1; m.position.set(Math.sin(i * 3) * 1.5, 0.8 + q * 4.5, Math.cos(i * 2) * 1.5); m.scale.setScalar(0.4 + q); m.material.opacity = 0.45 * (1 - q); });
      // the plane comes in over the city, lands outside it, taxis to the terminal and the cars roll off
      const f = (t * 0.045) % 1;
      let px, py = 1.3, pz = 0, yaw = 0, pitch = 0;
      if (f < 0.4) { const q = f / 0.4; px = lerp(-150, -34, q); py = lerp(22, 1.3, smooth(0, 1, q)); pitch = 0.06; }
      else if (f < 0.55) { px = lerp(-34, 24, smooth(0.4, 0.55, f)); }
      else { const q = smooth(0.55, 0.64, f); px = lerp(24, 28, q); pz = lerp(0, -10, q); yaw = q * Math.PI / 2; }
      cpw.position.set(px, py, pz); cpw.rotation.y = yaw; cp.rotation.z = pitch; cpw.visible = f < 0.97;
      air.forEach((c, i) => {
        const q = smooth(0.66 + i * 0.06, 0.8 + i * 0.06, f);
        c.visible = f > 0.65 && f < 0.97;
        c.position.set(28 + (i ? -2 : 2), 0.12, -12 - q * 3.5); c.rotation.y = Math.PI / 2;
      });
    }
  };
};

B.ota = () => {
  const g = new THREE.Group();
  g.add(plinth(6.6));
  const car = vmesh('sedan', 1.5); car.position.y = 0.5; car.rotation.y = 0.4; g.add(car);
  const screen = grp(box(2.4, 0.9, 0.08, 'objDark', 0, 0, 0)); const bar = box(2.1, 0.22, 0.1, 'accent', 0, 0.34, 0.02); screen.add(bar);
  at(screen, 0, 4.4, 0); g.add(screen);
  const tower = grp(cyl(0.25, 0.6, 16, 'objShade', 0, 0, 0, 8));
  for (let i = 1; i < 6; i++) tower.add(at(mesh(new THREE.TorusGeometry(0.7 - i * 0.07, 0.06, 6, 14), mat('objDark')), 0, i * 2.6, 0));
  tower.children.slice(1).forEach(c => c.rotation.x = Math.PI / 2);
  tower.add(sph(0.35, 'accent', 0, 16.4, 0, 10));
  at(tower, -12, 0, -9); g.add(tower);
  const waves = []; for (let i = 0; i < 2; i++) { const r = mesh(new THREE.TorusGeometry(1, 0.05, 6, 32), glowMat('cobalt', 0.4), false); g.add(r); waves.push(r); }
  const items = [];
  const fob = grp(box(0.8, 0.3, 1.4, 'objDark', 0, 0, 0), mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 14), mat('accent')));
  fob.children[1].position.set(0, 0.15, -0.95); fob.children[1].rotation.x = Math.PI / 2;
  const cam = grp(box(1, 0.8, 0.8, 'objDark', 0, 0, 0), cyl(0.3, 0.3, 0.4, 'accent', 0, 0.2, 0.55));
  cam.children[1].rotation.x = Math.PI / 2;
  const wheel = grp(mesh(new THREE.TorusGeometry(0.85, 0.13, 8, 24), mat('objDark')), box(1.7, 0.12, 0.12, 'objDark', 0, -0.06, 0), box(0.12, 0.85, 0.12, 'objDark', 0, -0.85, 0));
  const gauge = grp(cyl(0.8, 0.8, 0.2, 'obj', 0, 0, 0)); gauge.children[0].rotation.x = Math.PI / 2; const needle = box(0.08, 0.7, 0.05, 'accent', 0, 0, 0.13); gauge.add(needle);
  const prs = grp(sph(0.35, 'obj', 0, 1.0, 0, 12), cyl(0.3, 0.5, 0.8, 'obj', 0, 0, 0, 12), sph(0.12, 'accent', 0.45, 0.9, 0, 8));
  [fob, cam, wheel, gauge, prs].forEach((o, i) => { const ped = cyl(0.7, 0.8, 1, 'objShade', 0, 0, 0, 16); const h = grp(ped, at(o, 0, 2, 0)); at(h, -8 + i * 4, 0, 7.4); g.add(h); items.push(o); });
  const team = []; for (let i = 0; i < 7; i++) { const p = person(i < 2 ? 'accent' : 'obj', 0.9); at(p, 11 + (i % 4) * 1.4, 0, -6 - Math.floor(i / 4) * 1.6); g.add(p); team.push(p); }
  return {
    group: g, anchors: { car: pin(screen, 0, 0.6, 0), wheel: pin(wheel, 0, 1, 0), team: pin(team[1], 0, 2.4, 0) },
    update(t) {
      const p = (t * 0.18) % 1; bar.scale.x = Math.max(0.02, p); bar.position.x = -1.05 * (1 - p);
      const A = new THREE.Vector3(-12, 16.4, -9), Bv = new THREE.Vector3(0, 4.6, 0);
      waves.forEach((w, i) => { const f = (t * 0.12 + i / 2) % 1; w.position.lerpVectors(A, Bv, f); w.position.y += Math.sin(f * Math.PI) * 4; w.scale.setScalar(0.4 + f * 1.4); w.material.opacity = 0.32 * Math.sin(f * Math.PI); w.lookAt(Bv); });
      items.forEach((o, i) => { o.position.y = 2 + Math.sin(t * 0.7 + i) * 0.18; o.rotation.y = t * 0.25 + i; });
      needle.rotation.z = Math.sin(t * 0.6) * 1.0;
      const grown = 2 + Math.floor(((t * 0.25) % 1) * 6);
      team.forEach((m, i) => { m.visible = i < grown; });
    }
  };
};

B.shanghai = () => {
  const g = new THREE.Group();
  g.add(plinth(7));
  const car = vmesh('robotaxi', 1.45); car.position.y = 0.5; g.add(car);
  const sensor = new THREE.Group(); sensor.position.y = 0.9; g.add(sensor);
  const fan = (r, a, rot, key, op) => { const geo = new THREE.CircleGeometry(r, 28, -a / 2, a); geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, glowMat(key, op)); m.rotation.y = rot; return m; };
  const longF = fan(14, 0.28, 0, 'radar', 0.22); longF.position.x = 3.2; sensor.add(longF);
  [[3, 1.3, 0.7], [3, -1.3, -0.7], [-3, 1.3, 2.4], [-3, -1.3, -2.4]].forEach(([x, z, r]) => { const f = fan(5, 1.4, r, 'cobalt', 0.14); f.position.set(x, 0, z); sensor.add(f); });
  const frus = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(3.2, 9, 4, 1, true).rotateZ(Math.PI / 2).translate(6.2, 1.2, 0)), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8 }));
  reg(frus.material, 'cobalt');
  sensor.add(frus);
  const scan = mesh(new THREE.RingGeometry(2.5, 2.62, 48).rotateX(-Math.PI / 2), glowMat('lidar', 0.7), false); sensor.add(scan);
  // intelligent cockpit with a voice waveform
  const ck = grp(box(0.4, 2, 0.4, 'objDark', 0, 0, 0));
  const dash = mesh(new THREE.CylinderGeometry(4, 4, 1.6, 24, 1, true, -0.55, 1.1), mat('objDark', { side: THREE.DoubleSide })); dash.position.y = 2.8; dash.rotation.y = Math.PI; ck.add(dash);
  const sw = mesh(new THREE.TorusGeometry(0.75, 0.12, 8, 24), mat('objShade')); sw.position.set(0, 2.2, 2.6); sw.rotation.x = -0.5; ck.add(sw);
  const wave = []; for (let i = 0; i < 11; i++) { const b = box(0.22, 1, 0.22, i % 3 ? 'cobalt' : 'accent', -1.6 + i * 0.32, 0, 1.6); b.position.y = 4.4; ck.add(b); wave.push(b); }
  at(ck, -13, 0, -2, 0.25); g.add(ck);
  // multi-city research: clipboard over a map
  const cb = grp(box(0.25, 2.4, 0.25, 'objDark', 0, 0, 0), box(3.2, 4.2, 0.2, 'objShade', 0, 2.4, 0), box(2.6, 3.4, 0.05, 'card', 0, 2.7, 0.13));
  for (let i = 0; i < 5; i++) cb.add(box(1.8 - (i % 2) * 0.6, 0.12, 0.05, i === 0 ? 'accent' : 'objShade', -0.2, 5.2 - i * 0.6, 0.17));
  at(cb, 12, 0, -9, -0.3); g.add(cb);
  const map = grp(box(8, 0.12, 6, 'objShade', 0, 0, 0));
  const cities = [[-2.6, -1.4], [1.8, -1.9], [0.4, 1.1], [-1.2, 2.0], [2.8, 1.6]];
  const pins = cities.map(([x, z]) => { const p = grp(mesh(new THREE.ConeGeometry(0.3, 0.9, 10).rotateX(Math.PI), mat('accent')), sph(0.3, 'accent', 0, 0.55, 0, 10)); p.children[0].position.y = 0.45; at(p, x, 0.12, z); map.add(p); return p; });
  at(map, 12, 8.6, -9); map.rotation.x = 0.35; g.add(map);
  // re-imagined luxury
  const lux = new THREE.Group();
  lux.add(at(mesh(new THREE.BoxGeometry(5.6, 0.75, 2.1), mat('objDark')), 0, 0.75, 0));
  lux.add(at(mesh(new THREE.BoxGeometry(2.6, 0.6, 1.85), mat('glass')), -0.6, 1.4, 0));
  lux.add(at(mesh(new THREE.BoxGeometry(5.62, 0.08, 2.12), mat('accent')), 0, 0.98, 0));
  lux.add(cyl(2.2, 2.4, 0.4, 'objShade', 0, 0, 0, 32));
  at(lux, 11.5, 0, 5); g.add(lux);
  // Lujiazui landmarks beyond the river
  const sky = new THREE.Group();
  const pearl = grp(cyl(0.5, 0.9, 30, 'obj', 0, 0, 0, 10), sph(2.6, 'accent', 0, 9, 0, 18), sph(1.8, 'accent', 0, 22, 0, 16), sph(0.8, 'obj', 0, 27.5, 0, 12), cyl(0.15, 0.15, 6, 'obj', 0, 30, 0, 6));
  [0, 2.1, 4.2].forEach(a => { const leg = cyl(0.35, 0.5, 11, 'obj', Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4, 8); leg.rotation.z = Math.cos(a) * 0.2; leg.rotation.x = -Math.sin(a) * 0.2; pearl.add(leg); });
  at(pearl, -20, 0.4, -58); sky.add(pearl);
  const jm = new THREE.Group(); for (let i = 0; i < 9; i++) jm.add(box(5 - i * 0.42, 3.6, 5 - i * 0.42, 'obj', 0, i * 3.6, 0)); jm.add(cyl(0.05, 0.6, 5, 'obj', 0, 32.4, 0, 8)); at(jm, -6, 0.4, -62); sky.add(jm);
  const swfc = grp(box(5.2, 40, 4.2, 'obj', 0, 0, 0)); const hole2 = box(2.6, 2.6, 4.3, 'objDark', 0, 35.5, 0); swfc.add(hole2); at(swfc, 4, 0.4, -64); sky.add(swfc);
  const tw = new THREE.Group(); for (let i = 0; i < 14; i++) { const m = cyl(3.2 - i * 0.14, 3.3 - i * 0.14, 3.4, 'glass', 0, i * 3.4, 0, 3); m.rotation.y = i * 0.12; tw.add(m); } tw.add(cyl(0.6, 1.2, 2, 'obj', 0, 47.6, 0, 8)); at(tw, 13, 0.4, -61); sky.add(tw);
  g.add(sky);
  const cn = at(flag(7, 'accent', 'CN'), -19, 0, -10); g.add(cn);
  const sMark = billboard({ name: 'SAIC-GM', sub: "GM's joint venture · Shanghai", mono: 'SGM', logo: 'sgm' }, 7.4, 2, 2.4); at(sMark, -10.5, 0, -13, 0.15); g.add(sMark);
  return {
    group: g, anchors: { org: pin(sMark, 0, 5, 0), cockpit: pin(ck, 0, 5.4, 0), clipboard: pin(map, 0, 0.8, 0), luxury: pin(lux, 0, 2, 0) },
    update(t, k) {
      waveFlag(cn, t);
      longF.material.opacity = 0.14 + 0.04 * Math.sin(t * 1.2);
      const f = (t * 0.22) % 1; scan.scale.setScalar(0.6 + f * 2.6); scan.material.opacity = 0.35 * (1 - f);
      wave.forEach((b, i) => { b.scale.y = 0.3 + Math.abs(Math.sin(t * 2.2 + i * 0.7)) * (1.0 + Math.sin(t * 0.8 + i) * 0.4); });
      pins.forEach((p, i) => { p.position.y = 0.12 + Math.abs(Math.sin(t * 2.4 + i * 1.3)) * 0.8; });
      lux.rotation.y = t * 0.35;
    }
  };
};

B.onstar = () => {
  const g = new THREE.Group();
  g.add(box(46, 1, 12, 'objShade', 0, -0.6, -4));
  g.add(box(46, 0.25, 0.4, 'accent', 0, 0.4, -9.8));
  const cranes = [-11, 3].map((x, i) => {
    const c = new THREE.Group();
    [[-2.2, 0], [2.2, 0], [-2.2, -5], [2.2, -5]].forEach(([dx, dz]) => c.add(box(0.5, 12, 0.5, 'accent', dx, 0, dz)));
    c.add(box(5, 0.8, 0.8, 'accent', 0, 12, 0)); c.add(box(5, 0.8, 0.8, 'accent', 0, 12, -5));
    c.add(box(1.4, 0.8, 22, 'accent', 0, 12.8, -10));
    const trolley = box(1.8, 0.8, 1.8, 'objDark', 0, 11.2, -10); c.add(trolley);
    const cable = box(0.08, 6, 0.08, 'objDark', 0, 6, -10); c.add(cable);
    const cnt = box(2.4, 2.2, 5.4, i ? 'cobalt' : 'obj', 0, 4.2, -10); c.add(cnt);
    at(c, x, 0, -4); g.add(c);
  return { c, trolley, cable, cnt, ph: i * 2.3 };
  });
  const oMark = billboard({ name: 'OnStar', sub: 'International markets · Warren', mono: 'O', logo: 'onstar' }, 6.6, 1.8, 2.2); at(oMark, -19.5, 0, -9, 0.15); g.add(oMark);
  const ship = new THREE.Group();
  ship.add(box(26, 3, 6.4, 'objDark', 0, -1.2, 0)); ship.add(box(22, 6, 6.2, 'obj', -1, 1.8, 0)); ship.add(box(3, 2.2, 6.2, 'objShade', 9.6, 7.8, 0));
  for (let i = 0; i < 5; i++) ship.add(box(22.1, 0.12, 6.3, 'objShade', -1, 2.6 + i * 1.1, 0));
  /* v50: the ship stays moored at the quay, in the harbour water, under the crane booms.
     It never sails: the old route ran it over the land behind the port. */
  const SHIP_X = -3, SHIP_Z = -15.5, SHIP_Y = -0.9, STACK = 7.8 + SHIP_Y;
  ship.position.set(SHIP_X, SHIP_Y, SHIP_Z);
  g.add(ship);
  const beacons = []; const regions = ['Mexico', 'S. America', 'ME & Africa', 'Asia Pacific', 'Korea', 'Israel', 'Aus & NZ', 'Central Asia'];
  regions.forEach((r, i) => {
    const x = -84 + i * 24, z = -118 - (i % 2) * 14;
    const b = mesh(new THREE.CylinderGeometry(0.9, 0.9, 30, 16, 1, true), glowMat('accent', 0.25), false); b.position.set(x, 14, z); g.add(b);
    const base = sph(1.6, glowMat('accent', 0.8), x, 0, z, 12); base.castShadow = false; g.add(base);
    const l = label(r, { size: 26, key: 'ink', bg: 'card', scale: 0.9 }); l.position.set(x, 31.5, z); g.add(l);
    beacons.push(b);
  });
  const dock = []; ['compact', 'suv', 'compact', 'sedan', 'suv', 'compact'].forEach((t, i) => { const c = vmesh(t, 0.95); at(c, -18 + i * 3, 0, 1.5, Math.PI / 2); g.add(c); dock.push(c); });
  const tex = canvasTex(256, 170, (ctx, w, h) => {
    ctx.fillStyle = tok('card'); ctx.fillRect(0, 0, w, h);
    const cols = [tok('accent'), tok('cobalt'), tok('objShade'), tok('radar')];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { ctx.fillStyle = cols[(r * 3 + c * 5 + r * c) % 4]; ctx.globalAlpha = 0.35 + ((r + c) % 3) * 0.25; ctx.fillRect(14 + c * 26, 16 + r * 24, 22, 18); }
    ctx.globalAlpha = 1;
  });
  const tablet = grp(box(0.3, 2.6, 0.3, 'objDark', 0, 0, 0), box(5.2, 3.6, 0.25, 'objDark', 0, 2.4, 0));
  const scr = mesh(new THREE.PlaneGeometry(4.8, 3.2), new THREE.MeshBasicMaterial({ map: tex }), false); scr.position.set(0, 4.2, 0.14); tablet.add(scr);
  at(tablet, 13, 0, 2, -0.35); tablet.rotation.x = -0.15; g.add(tablet);
  /* round 27: Portfolio Made Visible, part of this role. AI agents carry blocks from a pile of decks
     to a portfolio wall that fills in, tile by tile; a world-clock post stands for the everyday kit. */
  const pm = new THREE.Group();
  pm.add(box(15, 0.3, 9, 'objShade', 0, 0, 0));
  const wall = new THREE.Group(); wall.add(box(10.4, 5.6, 0.4, 'objDark', 0, 0.3, 0));
  const tiles = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const m = ownMat('obj'); const t2 = mesh(new THREE.BoxGeometry(2.2, 1.4, 0.2), m); t2.position.set(-3.6 + c * 2.4, 1.2 + r * 1.65, 0.3); wall.add(t2); tiles.push(t2); }
  at(wall, 0, 0, -3.6); pm.add(wall);
  const pile = []; for (let i = 0; i < 6; i++) pile.push(box(1, 0.7, 0.7, i % 2 ? 'cobalt' : 'accent', -5.6 + (i % 3) * 1.1, Math.floor(i / 3) * 0.7 + 0.3, 3));
  pile.forEach(q => pm.add(q));
  const bots = []; for (let i = 0; i < 3; i++) { const r = robot(); r.scale.setScalar(0.8); const blk = box(0.9, 0.6, 0.6, i % 2 ? 'cobalt' : 'accent', 0, 1.3, 0.7); r.add(blk); pm.add(r); bots.push({ r, blk, ph: i / 3 }); }
  const clock = grp(cyl(0.12, 0.14, 4.6, 'objDark', 0, 0, 0, 8), cyl(1.05, 1.05, 0.25, 'card', 0, 5.4, 0, 28), cyl(1.18, 1.18, 0.18, 'objDark', 0, 5.4, -0.12, 28));
  clock.children[1].rotation.x = Math.PI / 2; clock.children[2].rotation.x = Math.PI / 2;
  const hand = box(0.09, 0.8, 0.08, 'accent', 0, 5.4, 0.16); hand.geometry.translate(0, 0.4, 0); clock.add(hand);
  at(clock, 6.4, 0, 2.6); pm.add(clock);
  at(pm, 23, 0, -6, -0.3); g.add(pm);
  const hlC = new THREE.Color();
  return {
    group: g, anchors: { ship: pin(ship, 6, 9, 0), dock: pin(dock[2], 0, 2.6, 0), tablet: pin(tablet, 0, 6.2, 0), pmv: pin(wall, -2.4, 7, 0.4), pmvDemo: pin(wall, 3.6, 7.4, 0.4), kit: pin(clock, 0, 7.4, 0), exportDemo: pin(dock[4], 0, 3.4, 0) },
    update(t) {
      const built = Math.floor(((t * 0.11) % 1) * 13);
      tiles.forEach((m, i) => { const on = i < built; m.material.color.set(tok(on ? (i % 3 === 0 ? 'accent' : i % 3 === 1 ? 'cobalt' : 'objShade') : 'obj')); m.material.emissive.copy(hlC.set(tok('accent'))).multiplyScalar(on && i === built - 1 ? 0.35 : 0); });
      bots.forEach((b, i) => {
        const f = (t * 0.16 + b.ph) % 1; const go = f < 0.5; const q = smooth(0, 1, go ? f * 2 : (f - 0.5) * 2);
        const tile = tiles[(i * 5 + 3) % tiles.length];
        const tx = tile.position.x, tz = -2;
        const x = go ? lerp(-4.5, tx, q) : lerp(tx, -4.5, q), z = go ? lerp(2, tz, q) : lerp(tz, 2, q);
        b.r.position.set(x, 0.3 + Math.abs(Math.sin(t * 8 + i)) * 0.08, z);
        b.r.rotation.y = go ? Math.atan2(tx + 4.5, tz - 2) : Math.atan2(-4.5 - tx, 2 - tz);
        b.blk.visible = go;
      });
      hand.rotation.z = -t * 0.6;
      /* v50: the ship rides gently at its moorings; it never moves off the quay */
      const bob = Math.sin(t * 0.7) * 0.07;
      ship.position.y = SHIP_Y + bob; ship.rotation.x = Math.sin(t * 0.55) * 0.006;
      /* each crane loads one container: down onto the quay, up, across, down onto the ship's stack, and back.
         The container clears the crane legs and the hull, and never passes through the ship. */
      const QZ = -2.5, SZ = SHIP_Z - (-4), HI = 8.8, QY = 0.4, SY = STACK + bob - 0.02;
      cranes.forEach(c => {
        const s = ((t / 18) + c.ph * 0.37) % 1;
        let z = QZ, y = HI;
        if (s < 0.1) y = lerp(HI, QY, smooth(0, 0.1, s));
        else if (s < 0.2) y = lerp(QY, HI, smooth(0.1, 0.2, s));
        else if (s < 0.45) z = lerp(QZ, SZ, smooth(0.2, 0.45, s));
        else if (s < 0.55) { z = SZ; y = lerp(HI, SY, smooth(0.45, 0.55, s)); }
        else if (s < 0.65) { z = SZ; y = lerp(SY, HI, smooth(0.55, 0.65, s)); }
        else if (s < 0.9) z = lerp(SZ, QZ, smooth(0.65, 0.9, s));
        c.trolley.position.z = z; c.cable.position.z = z; c.cnt.position.z = z;
        /* y is the container's underside; meshes are centred */
        c.cnt.position.y = y + 1.1; const top = y + 2.2;
        c.cable.scale.y = Math.max(0.02, (11.2 - top) / 6); c.cable.position.y = (top + 11.2) / 2;
      });
      beacons.forEach((b, i) => b.material.opacity = 0.16 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2 + i)));
    }
  };
};

B.now = () => {
  const g = new THREE.Group();
  g.add(box(22, 0.3, 13, 'objShade', 0, 0, -2));
  [[-10, 4], [10, 4], [-10, -8], [10, -8]].forEach(([x, z]) => g.add(box(0.3, 7, 0.3, 'objDark', x, 0, z)));
  for (let i = 0; i < 6; i++) g.add(box(0.25, 0.25, 13, 'objDark', -10 + i * 4, 7, -2));
  const wall = new THREE.Group(); wall.add(box(13, 6.4, 0.4, 'objDark', 0, 0.3, 0));
  const tiles = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const m = ownMat('obj'); const t2 = mesh(new THREE.BoxGeometry(2.8, 1.7, 0.2), m); t2.position.set(-4.65 + c * 3.1, 1.4 + r * 1.95, 0.3); wall.add(t2); tiles.push(t2); }
  at(wall, -1, 0, -7); g.add(wall);
  const pile = []; for (let i = 0; i < 6; i++) pile.push(box(1.2, 0.8, 0.8, i % 2 ? 'cobalt' : 'accent', -8 + (i % 3) * 1.3, Math.floor(i / 3) * 0.8 + 0.3, 3));
  pile.forEach(p => g.add(p));
  const bots = []; for (let i = 0; i < 5; i++) { const r = robot(); const blk = box(1, 0.7, 0.7, i % 2 ? 'cobalt' : 'accent', 0, 1.3, 0.7); r.add(blk); g.add(r); bots.push({ r, blk, ph: i / 5 }); }
  const loop = new THREE.Group();
  loop.add(cyl(4.4, 4.6, 0.4, 'objShade', 0, 0, 0, 48));
  const ring = mesh(new THREE.TorusGeometry(3.4, 0.08, 6, 64), mat('objDark')); ring.rotation.x = Math.PI / 2; ring.position.y = 1.3; loop.add(ring);
  const nodes = []; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const n = sph(0.42, ownMat('obj'), Math.cos(a) * 3.4, 1.3, Math.sin(a) * 3.4, 14); loop.add(n); nodes.push(n); }
  const pulse = sph(0.3, 'accent', 0, 1.3, 0, 10); loop.add(pulse);
  at(loop, 13, 0, 4.5); g.add(loop);
  const hl = new THREE.Color();
  return {
    group: g, anchors: { robots: pin(bots[0].r, 0, 3.2, 0), loop: pin(loop, 0, 2.2, 0) },
    update(t) {
      const built = Math.floor(((t * 0.11) % 1) * 13);
      tiles.forEach((m, i) => { const on = i < built; m.material.color.set(tok(on ? (i % 3 === 0 ? 'accent' : i % 3 === 1 ? 'cobalt' : 'objShade') : 'obj')); m.material.emissive.copy(hl.set(tok('accent'))).multiplyScalar(on && i === built - 1 ? 0.35 : 0); });
      bots.forEach((b, i) => {
        const f = (t * 0.16 + b.ph) % 1; const go = f < 0.5; const q = smooth(0, 1, go ? f * 2 : (f - 0.5) * 2);
        const tile = tiles[(i * 5 + 3) % tiles.length];
        const tx = tile.position.x - 1, tz = -5;
        const x = go ? lerp(-7, tx, q) : lerp(tx, -7, q), z = go ? lerp(2.2, tz, q) : lerp(tz, 2.2, q);
        b.r.position.set(x, 0.3 + Math.abs(Math.sin(t * 8 + i)) * 0.08, z);
        b.r.rotation.y = go ? Math.atan2(tx + 7, tz - 2.2) : Math.atan2(-7 - tx, 2.2 - tz);
        b.blk.visible = go;
      });
      const a = (t * 0.9) % (Math.PI * 2); pulse.position.set(Math.cos(a) * 3.4, 1.3, Math.sin(a) * 3.4);
      const cur = Math.floor(a / (Math.PI * 2) * 7 + 0.5) % 7;
      nodes.forEach((n, i) => n.material.color.set(tok(i === cur ? 'accent' : 'obj')));
      loop.rotation.y = -0.4;
    }
  };
};

B.finale = (ctx) => {
  /* round 27: the destination. A quiet plaza on the hill, a column with one band per chapter,
     and a skyline of the places the road ran through. */
  const g = new THREE.Group();
  const y = ctx.lookoutY;
  const hAt = (x, z) => ctx.height(ctx.base.x + x, ctx.base.z + z) - ctx.base.y;
  g.add(cyl(7.2, 7.8, 3.2, 'objShade', 2, y - 2.9, -4, 48));
  g.add(cyl(5.4, 5.4, 0.08, 'obj', 2, y + 0.3, -4, 48));
  const ERA_C = ['#B14F94', '#C8693A', '#D9A21B', '#2E9C8F', '#7357D8', '#D64545', '#1F8FD1'];
  const col = new THREE.Group(); col.add(cyl(0.9, 1.1, 0.5, 'objDark', 0, 0, 0, 24));
  const bands = ERA_C.map((c, i) => { const b = mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.8, 24), new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0 })); b.position.y = 0.9 + i * 0.86; col.add(b); return b; });
  col.add(sph(0.5, 'accent', 0, 7.2, 0, 16));
  at(col, 2, y + 0.3, -4); g.add(col);
  [[-1.8, -6.6, 0.5], [5.8, -6.6, -0.5]].forEach(([x, z, r]) => { const b = grp(box(2.6, 0.18, 0.7, 'obj', 0, 0.55, 0), box(0.2, 0.55, 0.6, 'objDark', -1.1, 0, 0), box(0.2, 0.55, 0.6, 'objDark', 1.1, 0, 0)); at(b, x, y + 0.3, z, r); g.add(b); });
  [[-0.6, -1.4, 'cobalt'], [0.4, -1.8, 'objDark'], [4.6, -1.2, 'accent']].forEach(([x, z, k]) => { const p = person(k, 0.95); at(p, x, y + 0.3, z, Math.PI); g.add(p); });
  function place(o, x, z, name, top, r = 0) { at(o, x, hAt(x, z) - 0.25, z, r); g.add(o); const l = label(name, { size: 22, key: 'ink', bg: 'card', scale: 1.05 }); l.position.set(x, o.position.y + top, z); g.add(l); }
  const kab = ketteringAB(); kab.scale.setScalar(0.3); place(kab, -19, -17, 'Flint', 4.4, 0.35);
  const rb = rossBuilding(); rb.scale.setScalar(0.3); place(rb, -11, -21, 'Ann Arbor', 4.4, 0.18);
  const ren = grp(cyl(1.5, 1.5, 15, 'obj', 0, 0, 0, 24), cyl(1.52, 1.52, 0.6, 'objDark', 0, 13.6, 0, 24), ...[[-2.6, -1.4], [2.6, -1.4], [-2.6, 1.6], [2.6, 1.6]].map(([x, z]) => cyl(0.95, 0.95, 10.5, 'objShade', x, 0, z, 18)), box(9, 2.2, 6, 'objShade', 0, 0, 0));
  place(ren, -2, -24, 'Detroit', 16.6);
  const wtw = grp(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => cyl(0.12, 0.14, 7, 'objDark', x * 1.2, 0, z * 1.2, 6)), cyl(0.25, 0.25, 7, 'objDark', 0, 0, 0, 8)); const tank = sph(2.1, 'obj', 0, 8.6, 0, 20); tank.scale.set(1, 0.72, 1); wtw.add(tank);
  place(wtw, 6.5, -23, 'Warren', 11.6);
  const angel = grp(box(3.2, 1.4, 3.2, 'objShade', 0, 0, 0), cyl(0.5, 0.62, 10, 'obj', 0, 1.4, 0, 16), cyl(0.7, 0.7, 0.5, 'objShade', 0, 11.4, 0, 16), sph(0.55, new THREE.MeshLambertMaterial({ color: '#E2B23C' }), 0, 12.5, 0, 12));
  place(angel, 13.5, -21, 'Mexico City', 14.2);
  const pearl = grp(cyl(0.22, 0.32, 15, 'objDark', 0, 0, 0, 8), ...[[-1.2, 0], [1.2, 0], [0, 1.2]].map(([x, z]) => { const l = cyl(0.25, 0.32, 5.5, 'obj', x, 0, z, 8); l.rotation.z = -x * 0.08; return l; }), sph(1.8, new THREE.MeshLambertMaterial({ color: '#C9708A' }), 0, 5.2, 0, 18), sph(1.1, new THREE.MeshLambertMaterial({ color: '#C9708A' }), 0, 11, 0, 16), cyl(0.05, 0.12, 3.5, 'objDark', 0, 13.5, 0, 6));
  place(pearl, 20.5, -16, 'Shanghai', 12.2);
  /* v55: the end view looks down the open road: a sign gantry with what comes next, and the sun rising over the road ahead */
  const zr = dx => roadZ(ctx.base.x + dx) - ctx.base.z;
  { const gx = 40, zc = zr(gx), yaw = (roadZ(ctx.base.x + gx + 1) - roadZ(ctx.base.x + gx - 1)) / 2;
    const gan = new THREE.Group();
    [-12, 12].forEach(dz => gan.add(box(1.4, 9.4, 1.4, 'obj', 0, 0, dz)));
    gan.add(box(1.6, 1.2, 25.4, 'obj', 0, 9.4, 0)); gan.add(box(1.62, 0.3, 25.42, 'accent', 0, 9.9, 0));
    [['STRATEGY', -7.6], ['PRODUCT', 0], ['AI', 7.6]].forEach(([t, z]) => {
      const p = signPanel(t, 7, 2.1, '#2F6B4F', '#FFFFFF'); p.rotation.y = -Math.PI / 2; p.position.set(-0.86, 8.2, z); gan.add(p);
      gan.add(box(0.1, 2.3, 7.2, 'objDark', -0.78, 7.05, z));
    });
    at(gan, gx, 0, zc, -Math.atan(yaw)); g.add(gan); }
  const sun = sph(15, new THREE.MeshBasicMaterial({ color: '#F2C77A', fog: false }), 380, 0, zr(380) + 34, 32); sun.castShadow = false;
  reg(sun.material, 'sun');
  g.add(sun);
  /* v59: at dusk a waxing crescent moon, lit on the right, rises where the sun does */
  const moonCv = document.createElement('canvas'); moonCv.width = moonCv.height = 256;
  { const c = moonCv.getContext('2d'), R = 74, cx = 128, cy = 128;
    const glow = c.createRadialGradient(cx, cy, R * .7, cx, cy, 126); glow.addColorStop(0, 'rgba(225,232,245,.28)'); glow.addColorStop(1, 'rgba(225,232,245,0)');
    c.fillStyle = glow; c.fillRect(0, 0, 256, 256);
    c.fillStyle = 'rgba(64,76,98,.5)'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#EEF1F7'; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2); c.ellipse(cx, cy, R * .45, R, 0, Math.PI / 2, -Math.PI / 2, true); c.closePath(); c.fill(); }
  const moonTex = new THREE.CanvasTexture(moonCv); if (THREE.SRGBColorSpace) moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false }));
  moon.scale.set(52, 52, 1); moon.position.copy(sun.position); moon.visible = false;
  g.add(moon);
  return { group: g, anchors: { plaza: pin(col, 0, 8.4, 0) }, update(t, k) {
    sun.position.y = -12 + 64 * smooth(0, 1, k);
    const dusk = CORE.theme !== 'day'; sun.visible = !dusk; moon.visible = dusk; moon.position.set(sun.position.x, sun.position.y + 4, sun.position.z);
    const lit = Math.min(7, Math.floor(k * 9));
    bands.forEach((b, i) => { b.material.emissiveIntensity = i < lit ? 0.18 + 0.12 * Math.max(0, Math.sin(t * 1.6 - i * 0.6)) : 0; });
  } };
};

export function buildStage(scene, kind, base, ctx) {
  const b = (B[kind] || B.start)(ctx);
  b.group.position.copy(base);
  scene.add(b.group);
  return b;
}
