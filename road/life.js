/* The Road, v43: ambient life. Random flyers (birds, geese, gulls, delivery
   drones), animals in the water and on land, pets, and a few quiet easter
   eggs, each placed where it fits the chapter: geese on the Flint River, the
   Diag squirrels in Ann Arbor, deer at the proving ground, monarchs in
   Mexico, a drone show over the Huangpu, a whale off the export port.
   Everything is small, slow and occasional, and hides when zoomed out or when
   the visitor prefers reduced motion. */
import { THREE, smooth, clamp, lerp, roadZ } from './core.js';

const rnd = Math.random;
const pickOf = a => a[(rnd() * a.length) | 0];

export function buildLife(scene, { stops, height, regionAt, lite, xMin, xMax, keepOut }) {
  const root = new THREE.Group(); root.name = 'life'; scene.add(root);
  const S = id => stops.find(s => s.id === id);
  const Z = (x, u) => roadZ(x) - u;
  const ground = (x, u) => Math.max(0, height(x, Z(x, u)));
  const isWater = (x, u) => height(x, Z(x, u)) < -1.7;
  const WATER_Y = -1.2;

  /* ---------- materials that follow the theme ---------- */
  const mats = [];
  const cm = (day, dusk, basic) => { const m = basic ? new THREE.MeshBasicMaterial({ color: day }) : new THREE.MeshLambertMaterial({ color: day }); m.userData.c = [day, dusk || null]; mats.push(m); return m; };
  const M = {
    bird: cm('#5A6573', '#A9B4C2'), gull: cm('#F4F6F8', '#C3CBD5'), gullTip: cm('#3A4350', '#2A3038'),
    goose: cm('#8A8073', '#6A6258'), gooseNeck: cm('#2A2A2A', '#1A1A1A'), white: cm('#F2F2EE', '#AEB5BE'),
    duck: cm('#8F7D63', '#5F5444'), mallard: cm('#2F6B4F', '#2A4D3C'), beak: cm('#E0A43A', '#9C7430'),
    deer: cm('#A07D5C', '#5E4C3D'), deerTail: cm('#F2EDE4', '#9A958C'), dark: cm('#2E2A27', '#1C1A18'),
    dogGold: cm('#C9A26B', '#7E6646'), dogBlack: cm('#33302D', '#24221F'), bulldog: cm('#DCCBB0', '#8E8372'), dogBrown: cm('#8A5A3B', '#5A3D2A'),
    cat: cm('#E39B4F', '#8E6436'), catGray: cm('#7D838C', '#4C5158'),
    squirrel: cm('#8C7E70', '#5D544B'), rabbit: cm('#B5A48F', '#6F6558'),
    monarch: cm('#E8892B', '#B8691F'), whale: cm('#4E5E70', '#33404E'), dolphin: cm('#8395A9', '#56657A'),
    eagle: cm('#4A3B2E', '#2E251D'), eagleHead: cm('#F4F2EC', '#B5B2AA'),
    drone: cm('#2E3640', '#1E242B'), droneArm: cm('#6E7B8A', '#3E4752'), parcel: cm('#C79A5B', '#7A5F3A'), prop: cm('#B8C2CD', '#4B5563'),
    leash: cm('#4A5563', '#9AA3AE'), splash: cm('#FFFFFF', '#9AA8B8')
  };
  const ledRed = new THREE.MeshBasicMaterial({ color: '#FF4D4F' }), ledGreen = new THREE.MeshBasicMaterial({ color: '#3FB27F' });
  const PEOPLE = ['#4A5563', '#C9693C', '#2563EB', '#8C97A6', '#D9B46A', '#5E7D5A', '#123D7A'];
  const pplMats = PEOPLE.map(c => cm(c));
  let duskNow = null;
  function applyTheme(dusk) {
    if (dusk === duskNow) return; duskNow = dusk;
    mats.forEach(m => { const [d, n] = m.userData.c; m.color.set(dusk ? (n || d) : d); if (dusk && !n) m.color.multiplyScalar(0.6); });
  }

  /* ---------- tiny model kit ---------- */
  const B = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
  const Sp = (r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; };
  const Co = (r, h, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), m); o.position.set(x, y, z); return o; };
  const G = (...k) => { const g = new THREE.Group(); k.forEach(o => o && g.add(o)); return g; };
  const shadows = g => { g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; };

  // a bird facing +x with two wings that flap about the body
  function bird(body, wingM, span = 1, tip) {
    const g = new THREE.Group();
    g.add(Sp(0.16, body, 0, 0, 0, 2.2, 0.8, 0.9));
    g.add(Sp(0.1, body, 0.34, 0.04, 0));
    const wing = sd => { const geo = new THREE.BufferGeometry(); const v = [0.18, 0, 0, -0.2, 0, 0, -0.05, 0, sd * 0.62 * span, -0.05, 0, sd * 0.62 * span, -0.2, 0, 0, 0.18, 0, 0]; geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, wingM); m.material.side = THREE.DoubleSide; const p = new THREE.Group(); p.add(m); if (tip) { const t = B(0.12, 0.012, 0.16, tip, -0.05, 0.004, sd * 0.56 * span); p.add(t); } return p; };
    const L = wing(1), R = wing(-1); g.add(L, R); g.userData.w = [L, R];
    return g;
  }
  const flap = (b, t, amp = 0.7, rate = 9, ph = 0) => { const a = Math.sin(t * rate + ph) * amp; b.userData.w[0].rotation.x = -a; b.userData.w[1].rotation.x = a; };

  function goose() {
    const g = new THREE.Group();
    g.add(Sp(0.2, M.goose, 0, 0, 0, 2.3, 0.85, 1));
    g.add(B(0.36, 0.07, 0.07, M.gooseNeck, 0.5, 0.06, 0));
    g.add(Sp(0.08, M.gooseNeck, 0.7, 0.08, 0)); g.add(B(0.06, 0.06, 0.13, M.white, 0.69, 0.07, 0));
    const wing = sd => { const p = new THREE.Group(); p.add(B(0.34, 0.02, 0.85, M.goose, 0, 0, sd * 0.43)); return p; };
    const L = wing(1), R = wing(-1); g.add(L, R); g.userData.w = [L, R];
    return g;
  }
  function drone() {
    const g = new THREE.Group();
    g.add(B(0.5, 0.14, 0.5, M.drone));
    const props = [];
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
      const arm = B(0.62, 0.05, 0.06, M.droneArm, a * 0.22, 0.04, b * 0.22); arm.rotation.y = a * b > 0 ? -Math.PI / 4 : Math.PI / 4; g.add(arm);
      const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 14), M.prop); pr.position.set(a * 0.42, 0.11, b * 0.42); g.add(pr); props.push(pr);
    });
    const parcel = B(0.32, 0.26, 0.32, M.parcel, 0, -0.25, 0); g.add(parcel);
    const l1 = Sp(0.045, ledRed, 0.28, 0.02, 0.2), l2 = Sp(0.045, ledGreen, 0.28, 0.02, -0.2); g.add(l1, l2);
    g.userData = { props, parcel, leds: [l1, l2] };
    g.scale.setScalar(1.0);
    return shadows(g);
  }
  function quadruped(bodyM, s, { neck = 0.25, legs = 0.5, len = 1, tail = 0.25, ears = 0, head = 0.16, antlers = false, tailM } = {}) {
    const g = new THREE.Group(), legsArr = [];
    const body = Sp(0.22, bodyM, 0, legs + 0.14, 0, 1.9 * len, 0.95, 0.85); g.add(body);
    const hd = new THREE.Group(); hd.position.set(0.42 * len, legs + 0.22 + neck * 0.6, 0);
    hd.add(B(0.08, neck, 0.09, bodyM, -0.03, -neck / 2, 0)); hd.add(Sp(head, bodyM, 0.06, 0.04, 0, 1.4, 0.95, 0.95));
    if (ears) { hd.add(Co(0.05, ears, bodyM, 0.0, 0.16, 0.07)); hd.add(Co(0.05, ears, bodyM, 0.0, 0.16, -0.07)); }
    if (antlers) { [-1, 1].forEach(sd => { const a = B(0.03, 0.3, 0.03, M.dark, -0.02, 0.25, sd * 0.07); a.rotation.x = sd * 0.4; hd.add(a); const b2 = B(0.16, 0.03, 0.03, M.dark, 0.02, 0.33, sd * 0.11); hd.add(b2); }); }
    g.add(hd);
    [[0.3, 0.1], [0.3, -0.1], [-0.3, 0.1], [-0.3, -0.1]].forEach(([x, z]) => { const p = new THREE.Group(); p.position.set(x * len, legs, z); p.add(B(0.06, legs, 0.06, bodyM, 0, -legs / 2, 0)); g.add(p); legsArr.push(p); });
    let tl = null; if (tail) { tl = new THREE.Group(); tl.position.set(-0.4 * len, legs + 0.22, 0); tl.add(B(tail, 0.05, 0.05, tailM || bodyM, -tail / 2, 0, 0)); tl.rotation.z = 0.5; g.add(tl); }
    g.userData = { hd, legs: legsArr, tail: tl, body };
    g.scale.setScalar(s);
    return shadows(g);
  }
  const walkCycle = (q, t, rate = 8, amp = 0.5) => q.userData.legs.forEach((l, i) => { l.rotation.z = Math.sin(t * rate + (i === 0 || i === 3 ? 0 : Math.PI)) * amp; });
  const standStill = q => q.userData.legs.forEach(l => { l.rotation.z = 0; });
  function personMesh(m) { return shadows(G(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.15, 8).translate(0, 0.58, 0), m), Sp(0.24, m, 0, 1.42, 0))); }
  function duck(body, headM) { return shadows(G(Sp(0.16, body, 0, 0.06, 0, 1.8, 0.8, 1.05), Sp(0.09, headM || body, 0.25, 0.22, 0), B(0.1, 0.03, 0.05, M.beak, 0.36, 0.2, 0))); }
  function cat(m) { const g = G(Sp(0.15, m, 0, 0.17, 0, 1, 1.3, 0.85), Sp(0.1, m, 0.04, 0.42, 0), Co(0.04, 0.08, m, 0.04, 0.53, 0.05), Co(0.04, 0.08, m, 0.04, 0.53, -0.05)); const tl = new THREE.Group(); tl.position.set(-0.12, 0.05, 0); tl.add(B(0.05, 0.3, 0.05, m, 0, 0.15, 0)); g.add(tl); g.userData.tail = tl; return shadows(g); }
  function squirrel() { const g = G(Sp(0.08, M.squirrel, 0, 0.1, 0, 1.4, 1, 0.9), Sp(0.055, M.squirrel, 0.11, 0.16, 0)); const tl = Sp(0.07, M.squirrel, -0.12, 0.2, 0, 0.8, 1.9, 0.8); tl.rotation.z = 0.4; g.add(tl); g.scale.setScalar(1.6); return shadows(g); }
  function rabbit() { return shadows(G(Sp(0.12, M.rabbit, 0, 0.13, 0, 1.4, 1, 1), Sp(0.08, M.rabbit, 0.14, 0.22, 0), B(0.03, 0.16, 0.04, M.rabbit, 0.12, 0.36, 0.03), B(0.03, 0.16, 0.04, M.rabbit, 0.12, 0.36, -0.03), Sp(0.04, M.white, -0.17, 0.15, 0))); }
  function butterfly() {
    const g = new THREE.Group(); g.add(B(0.14, 0.02, 0.02, M.dark));
    const wing = sd => { const p = new THREE.Group(); const w = new THREE.Mesh(new THREE.CircleGeometry(0.11, 6), M.monarch); w.material.side = THREE.DoubleSide; w.rotation.x = -Math.PI / 2; w.position.z = sd * 0.1; p.add(w); return p; };
    const L = wing(1), R = wing(-1); g.add(L, R); g.userData.w = [L, R]; g.scale.setScalar(1.6); return g;
  }
  function whale() {
    const g = new THREE.Group();
    g.add(Sp(1, M.whale, 0, 0, 0, 3.6, 1, 1.1));
    g.add(Sp(0.8, M.white, 0.6, -0.35, 0, 2.6, 0.5, 0.9));
    const fl = new THREE.Group(); fl.position.set(-3.6, 0, 0); fl.add(B(1.2, 0.12, 2.6, M.whale, -0.4, 0, 0)); g.add(fl); g.userData.fluke = fl;
    [-1, 1].forEach(sd => { const f = B(1.2, 0.1, 0.5, M.whale, 0.8, -0.4, sd * 1.1); f.rotation.y = sd * 0.5; g.add(f); });
    return shadows(g);
  }
  function dolphin() { const g = G(Sp(0.35, M.dolphin, 0, 0, 0, 3, 0.9, 0.9), Co(0.12, 0.4, M.dolphin, 0, 0.38, 0), B(0.3, 0.06, 0.6, M.dolphin, -1, 0, 0), Co(0.08, 0.35, M.dolphin, 1.1, -0.02, 0)); g.children[3].rotation.z = -Math.PI / 2; return shadows(g); }
  function splash() { const g = new THREE.Group(); const m = M.splash; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.add(Sp(0.18, m, Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9)); } g.add(Sp(0.3, m, 0, 0.4, 0)); g.visible = false; return g; }

  const add = o => { root.add(o); return o; };
  const near = (x, heroX, r = 110) => Math.abs(x - heroX) < r;
  let zoom = 0;

  /* ======================= the flyers ======================= */
  const FLOCK_N = lite ? 6 : 9;
  const flock = { birds: [], geese: [], gulls: [], ev: null, next: 4 + rnd() * 6 };
  for (let i = 0; i < FLOCK_N; i++) { flock.birds.push(add(bird(M.bird, M.bird, 1.1))); flock.geese.push(add(goose())); flock.gulls.push(add(bird(M.gull, M.gull, 1.25, M.gullTip))); }
  [...flock.birds, ...flock.geese, ...flock.gulls].forEach(b => { b.visible = false; b.scale.setScalar(1.5); });
  function flockStart(t, heroX) {
    const rg = regionAt(heroX), kind = rg === 'port' ? 'gulls' : rg === 'us' && rnd() < 0.6 ? 'geese' : 'birds';
    const n = kind === 'geese' ? 5 + ((rnd() * (FLOCK_N - 4)) | 0) : 3 + ((rnd() * (FLOCK_N - 2)) | 0);
    const th = (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 1.4, dx = Math.cos(th), du = Math.sin(th);
    const mx = heroX + (rnd() - 0.35) * 70, mu = 5 + rnd() * 50, Lf = 85 + rnd() * 30;
    flock.ev = { kind, n, t0: t, x0: mx - dx * Lf, u0: mu - du * Lf, dx, du, L: 2 * Lf, v: kind === 'geese' ? 7.5 : 8.5 + rnd() * 3, y: 11 + rnd() * 9, vee: kind === 'geese' || rnd() < 0.4 };
  }
  function flockUpdate(t, heroX, hide) {
    const all = flock;
    ['birds', 'geese', 'gulls'].forEach(k => all[k].forEach(b => { b.visible = false; }));
    if (hide) { all.ev = null; return; }
    if (!all.ev) { if (t > all.next) flockStart(t, heroX); return; }
    const e = all.ev, d = (t - e.t0) * e.v;
    if (d > e.L) { all.ev = null; all.next = t + 10 + rnd() * 22; return; }
    const list = all[e.kind], yaw = Math.atan2(e.du, e.dx);
    for (let i = 0; i < e.n; i++) {
      const b = list[i], k = Math.ceil(i / 2), sd = i % 2 ? 1 : -1;
      const back = e.vee ? k * 1.9 : (i * 0.37 % 1) * 6, side = e.vee ? sd * k * 1.5 : ((i * 0.61) % 1 - 0.5) * 8;
      const along = d - back;
      const x = e.x0 + e.dx * along - e.du * side, u = e.u0 + e.du * along + e.dx * side;
      b.visible = true; b.position.set(x, e.y + Math.sin(t * 0.9 + i) * 0.4 + (e.vee ? 0 : (i % 3) * 0.8), Z(x, u));
      b.rotation.set(0, yaw, 0);
      if (e.kind === 'gulls') flap(b, t, 0.18 + (Math.sin(t * 0.7 + i) > 0.6 ? 0.45 : 0), 6, i); else flap(b, t, e.kind === 'geese' ? 0.55 : 0.75, e.kind === 'geese' ? 6 : 10, i * 0.9);
    }
  }

  /* gulls that circle over the water by the river cities and the export port */
  const gullRings = [];
  [['customer-experience', 0, -32], ['equinox', 10, -34], ['onstar', 0, 70]].forEach(([id, dx, u]) => { const s = S(id); if (!s) return; for (let i = 0; i < (lite ? 2 : 3); i++) { const b = add(bird(M.gull, M.gull, 1.25, M.gullTip)); b.scale.setScalar(1.4); b.visible = false; gullRings.push({ b, cx: s.x + dx, cu: u, r: 9 + rnd() * 9, y: 9 + rnd() * 6, ph: rnd() * 6, w: (rnd() < 0.5 ? 1 : -1) * (0.18 + rnd() * 0.08) }); } });
  // a bald eagle soaring over the lookout at the end of the road
  const fin = stops[stops.length - 1];
  const eagle = add(bird(M.eagle, M.eagle, 1.7, M.eagle)); eagle.add(Sp(0.1, M.eagleHead, 0.36, 0.05, 0)); eagle.scale.setScalar(1.8); eagle.visible = false;

  /* delivery drones: a hop across the view now and then, more often in the cities of Asia */
  const DR = lite ? 2 : 3, drones = [];
  /* v63: less is more. One small drone crosses once, near the start, and then it is gone */
  for (let i = 0; i < DR; i++) { const d = add(drone()); d.visible = false; drones.push({ g: d, ev: null, next: i === 0 ? 2.5 : Infinity }); }
  function droneStart(dr, t, heroX) {
    const th = (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 1.2, dx = Math.cos(th), du = Math.sin(th);
    const mx = heroX + (rnd() - 0.3) * 60, mu = 14 + rnd() * 50, Ld = 60 + rnd() * 20;
    dr.ev = { t0: t, x0: mx - dx * Ld, u0: mu - du * Ld, dx, du, L: 2 * Ld, v: 6 + rnd() * 3, y: 9 + rnd() * 6, drop: rnd() < 0.35 };
  }
  function droneUpdate(t, heroX, hide) {
    const rg = regionAt(heroX), rate = rg === 'asia' ? 1 : rg === 'port' ? 0.4 : 0.6;
    drones.forEach((dr, i) => {
      const g = dr.g; g.visible = false;
      if (hide) { dr.ev = null; return; }
      if (!dr.ev) { if (t > dr.next) droneStart(dr, t, heroX); return; }
      const e = dr.ev, d = (t - e.t0) * e.v;
      if (d > e.L) { dr.ev = null; dr.next = Infinity; return; }
      const q = d / e.L, x = e.x0 + e.dx * d, u = e.u0 + e.du * d;
      let y = e.y + Math.sin(t * 1.3 + i) * 0.25;
      if (e.drop) y = lerp(y, ground(x, u) + 3, smooth(0.38, 0.5, q) * (1 - smooth(0.5, 0.62, q)));
      g.visible = true; g.position.set(x, y, Z(x, u)); g.rotation.set(0, Math.atan2(e.du, e.dx), 0); g.rotateZ(-0.12);
      g.userData.props.forEach(p => { p.rotation.y = t * 40; });
      g.userData.parcel.visible = !e.drop || q < 0.5;
      g.userData.leds.forEach((l, j) => { l.visible = ((t * 2 + j * 0.5) % 1) < 0.5; });
    });
  }

  /* ======================= in the water ======================= */
  // duck and goose families on the rivers: Flint, Huron, Detroit; and swans
  const families = [];
  const waterSpots = [];
  const scanX = ['kettering', 'ross', 'customer-experience', 'equinox', 'onstar'].map(S).filter(Boolean).map(s => [s.x - 64, s.x + 64]);
  for (const [xa, xb] of scanX) for (let x = xa; x < xb; x += 2) for (let u = -48; u < 120; u += 2) { if (isWater(x, u) && isWater(x + 2.5, u) && isWater(x - 2.5, u) && isWater(x, u + 2.5) && isWater(x, u - 2.5)) waterSpots.push([x, u]); }
  const pickWater = (x0, x1, uMax = 120) => { const c = waterSpots.filter(([x, u]) => x > x0 && x < x1 && u < uMax); return c.length ? c[(rnd() * c.length) | 0] : null; };
  const famAt = (id, n, kind) => { const s = S(id); if (!s) return; for (let k = 0; k < n; k++) { const w = pickWater(s.x - 60, s.x + 60, 95); if (!w) return; const list = []; const mom = add(kind === 'goose' ? goose() : kind === 'swan' ? duck(M.white, M.white) : duck(M.duck, M.mallard)); if (kind === 'swan') mom.scale.setScalar(2.2); else if (kind === 'goose') mom.scale.setScalar(1.5); else mom.scale.setScalar(1.9); list.push(mom); const kids = kind === 'swan' ? 0 : 3 + ((rnd() * 3) | 0); for (let i = 0; i < kids; i++) { const ch = add(kind === 'goose' ? duck(M.goose, M.goose) : duck(M.duck)); ch.scale.setScalar(1.1); list.push(ch); } families.push({ list, cx: w[0], cu: w[1], r: 2 + rnd() * 2, ph: rnd() * 6, w: (rnd() < 0.5 ? 1 : -1) * 0.08, kind }); } };
  famAt('kettering', 2, 'goose');
  famAt('ross', 2, 'duck');
  famAt('customer-experience', 1, 'swan');
  famAt('equinox', 1, 'duck');
  // the whale and dolphins off the export port
  const ons = S('onstar');
  const W1 = add(whale()), spl = add(splash()); W1.visible = false;
  const dolphins = [add(dolphin()), add(dolphin())]; dolphins.forEach(d => d.visible = false);
  const portW = ons ? waterSpots.filter(([x, u]) => Math.abs(x - ons.x) < 60 && u > 45 && u < 110) : [];
  let whaleEv = null, whaleNext = 6, dolEv = null, dolNext = 3;
  // a fish now and then at the duck ponds
  const fish = add(Sp(0.18, M.dolphin, 0, 0, 0, 2.2, 0.8, 0.8)); fish.visible = false; let fishEv = null, fishNext = 5;

  /* ======================= on land ======================= */
  // deer: at the edge of the woods by the early stops, and on the Milford proving ground
  const herds = [];
  const landOK = (x, u) => !isWater(x, u) && !keepOut(x, Z(x, u)) && Math.abs(u) > 12 && !(u > 8 && u < 46 && stops.some(s => Math.abs(s.x - x) < 26));
  const herdAt = (x, u, n) => { if (!landOK(x, u)) { for (let k = 0; k < 12; k++) { const nx = x + (rnd() - 0.5) * 30, nu = u + (rnd() - 0.5) * 20; if (landOK(nx, nu)) { x = nx; u = nu; break; } } if (!landOK(x, u)) return; } const list = []; for (let i = 0; i < n; i++) { const d = add(quadruped(M.deer, 1.25, { neck: 0.35, legs: 0.62, len: 1, tail: 0.12, ears: 0.12, head: 0.13, antlers: i === 0 && rnd() < 0.6, tailM: M.deerTail })); list.push({ g: d, ox: (rnd() - 0.5) * 6, ou: (rnd() - 0.5) * 4, ry: rnd() * 6, ph: rnd() * 10 }); } herds.push({ x, u, list }); };
  ['federal-mogul', 'chrysler', 'johnson-controls'].forEach((id, i) => { const s = S(id); if (s) herdAt(s.x + (i % 2 ? -34 : 30), i % 2 ? -26 : 58, 2 + (i % 2)); });
  { const s = S('traverse'); if (s) herdAt(s.x + 30, 78, 3); }
  { const s = S('start'); if (s) herdAt(s.x + 40, -28, 2); }
  // rabbits on the verges of the open road
  const rabbits = [];
  stops.forEach(s => { if (s.region !== 'us' || ['kettering', 'ross', 'customer-experience', 'equinox'].includes(s.id)) return; const x = s.x + 32 + rnd() * 20, u = -(13 + rnd() * 6); if (!landOK(x, u)) return; rabbits.push({ g: add(rabbit()), x, u, ph: rnd() * 10, dir: 1 }); });
  rabbits.forEach(r => r.g.scale.setScalar(1.8));

  // dog walkers on the near sidewalk in the college towns and Detroit; Kettering's is a bulldog
  const walkers = [];
  const walkerAt = (id, dogM, opts, span = 26) => { const s = S(id); if (!s) return; const p = add(personMesh(pickOf(pplMats))); const d = add(quadruped(dogM, opts.s || 1, opts)); const leash = add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), M.leash)); walkers.push({ s, p, d, leash, x: s.x + (rnd() - 0.5) * span, dir: rnd() < 0.5 ? 1 : -1, span, u: -9.4, v: 0.75 + rnd() * 0.2, pause: 0 }); };
  walkerAt('kettering', M.bulldog, { s: 0.85, neck: 0.12, legs: 0.32, len: 1.05, tail: 0.06, head: 0.2, ears: 0.06 });
  walkerAt('ross', M.dogGold, { s: 0.9, neck: 0.22, legs: 0.42, len: 1.1, tail: 0.3, head: 0.15, ears: 0.08 });
  walkerAt('equinox', M.dogBlack, { s: 0.9, neck: 0.25, legs: 0.48, len: 1.05, tail: 0.28, head: 0.14, ears: 0.1 });
  walkerAt('customer-experience', M.dogBrown, { s: 0.75, neck: 0.18, legs: 0.3, len: 1.25, tail: 0.25, head: 0.13, ears: 0.06 });
  // fetch in Gallup Park, below the Ross stop
  let fetch = null;
  { const s = S('ross'); if (s) { const x = s.x + 2, u = -36; if (!isWater(x, u)) { const p = add(personMesh(pplMats[2])); const d = add(quadruped(M.dogGold, 0.95, { neck: 0.22, legs: 0.42, len: 1.1, tail: 0.3, head: 0.15, ears: 0.08 })); const ball = add(Sp(0.1, M.beak)); fetch = { x, u, p, d, ball, ph: rnd() * 5 }; } } }
  // the Diag squirrels on Central Campus
  const squirrels = [];
  { const s = S('ross'); if (s) for (let i = 0; i < (lite ? 4 : 7); i++) { const a = rnd() * 6.28, r = 5.5 + rnd() * 6; squirrels.push({ g: add(squirrel()), cx: s.x - 26 + Math.cos(a) * r, cu: 68 + Math.sin(a) * r * 0.8, ph: rnd() * 10, hx: 0, hu: 0 }); } }
  // cats: a street cat by the Mexico stop, and one on the steps in Shanghai
  const cats = [];
  [['mexico', -6, -10.4, M.cat], ['shanghai', 22, -10.6, M.catGray], ['connected', -12, -10.4, M.cat]].forEach(([id, dx, u, m]) => { const s = S(id); if (!s) return; const c = add(cat(m)); c.scale.setScalar(1.7); const x = s.x + dx; c.position.set(x, ground(x, u) + 0.08, Z(x, u)); c.rotation.y = 1.2 + rnd(); cats.push({ g: c, x, ph: rnd() * 6 }); });
  // a street dog asleep in the shade of the vendor cart in Mexico
  const mxs = S('mexico'); let siesta = null;
  if (mxs) { const d = add(quadruped(M.dogBrown, 0.9, { neck: 0.2, legs: 0.38, len: 1.1, tail: 0.28, head: 0.14, ears: 0.1 })); d.userData.legs.forEach(l => { l.rotation.z = 1.35; }); d.userData.body.position.y = 0.22; d.userData.hd.position.y = 0.3; const x = mxs.x + 20.5, u = -10.6; d.position.set(x, ground(x, u) + 0.02, Z(x, u)); d.rotation.y = 0.3; siesta = d; }
  // monarch butterflies in Mexico (they winter in Michoacan)
  const monarchs = [];
  if (mxs) for (let i = 0; i < (lite ? 6 : 12); i++) monarchs.push({ g: add(butterfly()), cx: mxs.x + (rnd() - 0.5) * 40, cu: 2 + rnd() * 30, r: 2 + rnd() * 4, y: 1.8 + rnd() * 3.5, ph: rnd() * 10, w: 0.25 + rnd() * 0.3 });

  /* ======================= the Shanghai drone show ======================= */
  const shs = S('shanghai');
  const SHOW_N = lite ? 72 : 120;
  let show = null;
  if (shs) {
    const shapes = buildShapes(SHOW_N);
    const led = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 6, 4), led, SHOW_N); im.frustumCulled = false; im.visible = false; add(im);
    const home = []; for (let i = 0; i < SHOW_N; i++) home.push([(i % 12 - 5.5) * 1.6, ((i / 12) | 0) * 1.6 - 7]);
    show = { im, shapes, home, cx: shs.x + 36, u: 64, base: -0.6, next: 8, t0: -1, dur: 26, cols: ['#F2B456', '#5DC8F0', '#FF5A4E', '#FF6FA8'] };
    for (let i = 0; i < SHOW_N; i++) im.setColorAt(i, new THREE.Color('#FFFFFF'));
  }
  const tmp = new THREE.Object3D(), col = new THREE.Color(), colB = new THREE.Color();
  function showUpdate(t, heroX, hide) {
    if (!show) return;
    const S0 = show, inRange = Math.abs(heroX - shs.x) < 95;
    if (hide || (!inRange && S0.t0 < 0)) { S0.im.visible = false; if (!inRange) S0.next = Math.max(S0.next, t + 5); return; }
    if (S0.t0 < 0) { if (t > S0.next) S0.t0 = t; else { S0.im.visible = false; return; } }
    const e = t - S0.t0;
    if (e > S0.dur) { S0.t0 = -1; S0.next = t + 40 + rnd() * 25; S0.im.visible = false; return; }
    S0.im.visible = true;
    // timeline: rise 3s, then shapes for 5s each (1.2s morph), then land 3s
    const n = S0.shapes.length, hold = (S0.dur - 6) / n;
    const W2 = 30, H2 = 11, y0 = 5;
    const z0 = Z(S0.cx, S0.u);
    for (let i = 0; i < SHOW_N; i++) {
      const hm = S0.home[i];
      let px, py, ci, cj, f = 0;
      const hx = S0.cx + hm[0], hy = S0.base;
      if (e < 3) { const q = smooth(0, 3, e); const sp = S0.shapes[0][i]; px = lerp(hx, S0.cx + sp[0] * W2 / 2, q); py = lerp(hy, y0 + sp[1] * H2, q); ci = cj = 0; }
      else if (e > S0.dur - 3) { const q = smooth(S0.dur - 3, S0.dur, e); const sp = S0.shapes[n - 1][i]; px = lerp(S0.cx + sp[0] * W2 / 2, hx, q); py = lerp(y0 + sp[1] * H2, hy, q); ci = cj = n - 1; }
      else {
        const k = Math.min(n - 1, Math.floor((e - 3) / hold)), le = (e - 3) - k * hold, k2 = Math.min(n - 1, k + 1);
        f = k === k2 ? 0 : smooth(hold - 1.2, hold, le);
        const a = S0.shapes[k][i], b = S0.shapes[k2][i];
        px = S0.cx + lerp(a[0], b[0], f) * W2 / 2; py = y0 + lerp(a[1], b[1], f) * H2 + Math.sin(f * Math.PI) * 2.5 * ((i % 5) / 5 - 0.4); ci = k; cj = k2;
      }
      tmp.position.set(px, py + Math.sin(t * 2 + i) * 0.05, z0 + ((i * 7) % 5 - 2) * 0.15); tmp.updateMatrix(); S0.im.setMatrixAt(i, tmp.matrix);
      col.set(S0.cols[ci % S0.cols.length]); colB.set(S0.cols[cj % S0.cols.length]); col.lerp(colB, f);
      if (!duskNow) col.multiplyScalar(0.85);
      S0.im.setColorAt(i, col);
    }
    S0.im.instanceMatrix.needsUpdate = true; S0.im.instanceColor.needsUpdate = true;
  }

  /* ======================= per frame ======================= */
  let lastT = 0;
  function update(dt, t, heroX, still, dusk) {
    applyTheme(dusk);
    const hide = still || zoom > 0.55;
    const small = hide || zoom > 0.25;
    flockUpdate(t, heroX, hide);
    droneUpdate(t, heroX, hide);
    showUpdate(t, heroX, still || zoom > 0.8);
    // gull rings
    gullRings.forEach((r, i) => { const b = r.b; if (hide || !near(r.cx, heroX, 120)) { b.visible = false; return; } const a = t * r.w + r.ph; const x = r.cx + Math.cos(a) * r.r, u = r.cu + Math.sin(a) * r.r * 0.7; b.visible = true; b.position.set(x, r.y + Math.sin(t * 0.6 + i) * 0.6, Z(x, u)); b.rotation.set(0, Math.atan2(Math.cos(a) * r.w * 0.7, -Math.sin(a) * r.w), 0); b.rotateX(r.w > 0 ? 0.25 : -0.25); flap(b, t, Math.sin(t * 0.4 + i) > 0.7 ? 0.5 : 0.12, 6, i); });
    // the eagle
    if (fin && !hide && near(fin.x, heroX, 130)) { const a = t * 0.12, x = fin.x + Math.cos(a) * 26, u = 30 + Math.sin(a) * 14; eagle.visible = true; eagle.position.set(x, 17 + Math.sin(t * 0.3) * 1.5, Z(x, u)); eagle.rotation.set(0, Math.atan2(Math.cos(a) * 0.7, -Math.sin(a)) , 0); eagle.rotateX(0.18); flap(eagle, t, Math.sin(t * 0.25) > 0.85 ? 0.35 : 0.05, 4); } else eagle.visible = false;
    // families on the water
    families.forEach(fm => { const on = !small && near(fm.cx, heroX, 120); fm.list.forEach((d, i) => { d.visible = on; if (!on) return; const a = t * fm.w + fm.ph - i * 0.22, x = fm.cx + Math.cos(a) * fm.r, u = fm.cu + Math.sin(a) * fm.r * 0.7; d.position.set(x, WATER_Y + Math.sin(t * 2 + i) * 0.03, Z(x, u)); d.rotation.y = Math.atan2(Math.cos(a) * fm.w * 0.7, -Math.sin(a) * fm.w); }); });
    // a fish jumping at a pond near the camera
    if (!small && families.length) {
      if (!fishEv && t > fishNext) { const fm = families.find(f2 => near(f2.cx, heroX, 70)); if (fm) fishEv = { t0: t, x: fm.cx + (rnd() - 0.5) * 6, u: fm.cu + (rnd() - 0.5) * 4, dir: rnd() < 0.5 ? 1 : -1 }; else fishNext = t + 4; }
      if (fishEv) { const q = (t - fishEv.t0) / 0.9; if (q > 1) { fishEv = null; fish.visible = false; fishNext = t + 9 + rnd() * 14; } else { const x = fishEv.x + fishEv.dir * q * 1.6; fish.visible = true; fish.position.set(x, WATER_Y + Math.sin(q * Math.PI) * 1.3, Z(x, fishEv.u)); fish.rotation.set(0, fishEv.dir > 0 ? 0 : Math.PI, fishEv.dir * (0.9 - q * 1.8)); } }
    } else fish.visible = false;
    // whale and dolphins at the port
    if (ons && portW.length && !small && near(ons.x, heroX, 110)) {
      if (!whaleEv && t > whaleNext) { const w = pickOf(portW); whaleEv = { t0: t, x: w[0], u: w[1], dir: rnd() < 0.5 ? 1 : -1 }; }
      if (whaleEv) {
        const q = (t - whaleEv.t0) / 4.2;
        if (q > 1) { whaleEv = null; whaleNext = t + 30 + rnd() * 25; W1.visible = false; spl.visible = false; }
        else { const x = whaleEv.x + whaleEv.dir * q * 6, y = WATER_Y - 3 + Math.sin(q * Math.PI) * 7.5; W1.visible = true; W1.scale.setScalar(1.4); W1.position.set(x, y, Z(x, whaleEv.u)); W1.rotation.set(0, whaleEv.dir > 0 ? 0 : Math.PI, whaleEv.dir * (1.1 - q * 2.4)); W1.userData.fluke.rotation.z = Math.sin(t * 4) * 0.2; const sq = Math.max(0, 1 - Math.abs(q - 0.78) / 0.12); spl.visible = sq > 0; spl.position.set(whaleEv.x + whaleEv.dir * 4.5, WATER_Y, Z(x, whaleEv.u)); spl.scale.setScalar(1 + sq * 1.8); }
      }
      if (!dolEv && t > dolNext) { const w = pickOf(portW); dolEv = { t0: t, x: w[0], u: w[1], dir: rnd() < 0.5 ? 1 : -1 }; }
      if (dolEv) { const e = t - dolEv.t0; if (e > 6) { dolEv = null; dolNext = t + 10 + rnd() * 12; dolphins.forEach(d => d.visible = false); } else dolphins.forEach((d, i) => { const ph = ((e * 0.9 + i * 0.35) % 1.5) / 1.1; const x = dolEv.x + dolEv.dir * (e * 4 + i * 2.2), u = dolEv.u + i * 1.4; d.visible = ph < 1; d.position.set(x, WATER_Y - 0.6 + Math.sin(ph * Math.PI) * 1.9, Z(x, u)); d.rotation.set(0, dolEv.dir > 0 ? 0 : Math.PI, dolEv.dir * (0.9 - ph * 1.8)); }); }
    } else { W1.visible = false; spl.visible = false; dolphins.forEach(d => d.visible = false); }
    // deer: graze, look up now and then, step a little
    herds.forEach(h => { const on = !small && near(h.x, heroX, 120); h.list.forEach((d, i) => { d.g.visible = on; if (!on) return; const x = h.x + d.ox + Math.sin(t * 0.05 + d.ph) * 1.2, u = h.u + d.ou; d.g.position.set(x, ground(x, u), Z(x, u)); d.g.rotation.y = d.ry + Math.sin(t * 0.05 + d.ph) * 0.3; const look = Math.sin(t * 0.3 + d.ph) > 0.6; d.g.userData.hd.rotation.z = look ? 0 : -1.05; d.g.userData.tail.rotation.z = 0.5 + (look ? Math.sin(t * 9) * 0.2 : 0); }); });
    // rabbits hop, then sit
    rabbits.forEach(r => { const on = !small && near(r.x, heroX, 90); r.g.visible = on; if (!on) return; const c = (t + r.ph) % 6; let hop = 0; if (c < 1.2) { hop = Math.abs(Math.sin(c * Math.PI * 2.5)) * 0.35; r.x += r.dir * dt * 1.6; } if (c > 5.9 && rnd() < 0.05) r.dir *= -1; r.g.position.set(r.x, ground(r.x, r.u) + hop, Z(r.x, r.u)); r.g.rotation.y = r.dir > 0 ? 0 : Math.PI; });
    // dog walkers: stroll the block, pause at a lamp post, turn around
    walkers.forEach(w => {
      const on = !small && near(w.s.x, heroX, 110); [w.p, w.d, w.leash].forEach(o => o.visible = on); if (!on) return;
      if (w.pause > 0) w.pause -= dt; else { w.x += w.dir * w.v * dt; if (Math.abs(w.x - w.s.x) > w.span) { w.dir = -Math.sign(w.x - w.s.x); w.x = w.s.x + Math.sign(w.x - w.s.x) * w.span; } if (rnd() < dt * 0.06) w.pause = 2 + rnd() * 3; }
      const px = w.x, dx = w.x + w.dir * 1.7, u = w.u, dog = w.d;
      w.p.position.set(px, ground(px, u) + 0.08, Z(px, u)); w.p.rotation.y = w.dir > 0 ? 0 : Math.PI;
      dog.position.set(dx, ground(dx, u + 0.3) + 0.08, Z(dx, u + 0.3)); dog.rotation.y = w.dir > 0 ? 0 : Math.PI;
      if (w.pause > 0) { standStill(dog); dog.userData.hd.rotation.z = -0.6; } else { walkCycle(dog, t, 11, 0.55); dog.userData.hd.rotation.z = 0; }
      if (dog.userData.tail) dog.userData.tail.rotation.y = Math.sin(t * 10) * 0.6;
      const a = new THREE.Vector3(px + w.dir * 0.25, w.p.position.y + 0.85, Z(px, u)), b = new THREE.Vector3(dx - w.dir * 0.3, dog.position.y + 0.45, dog.position.z), mid = a.clone().add(b).multiplyScalar(0.5);
      w.leash.position.copy(mid); w.leash.scale.set(1, a.distanceTo(b), 1); w.leash.lookAt(b); w.leash.rotateX(Math.PI / 2);
    });
    // fetch: the throw, the run, the return
    if (fetch) {
      const on = !small && near(fetch.x, heroX, 100); [fetch.p, fetch.d, fetch.ball].forEach(o => o.visible = on);
      if (on) {
        const c = (t + fetch.ph) % 7, F = fetch, far = 9, y0 = ground(F.x, F.u);
        F.p.position.set(F.x, y0 + 0.08, Z(F.x, F.u)); F.p.rotation.y = 0;
        let bx2, by, dx2;
        if (c < 1) { bx2 = F.x + far * c; by = y0 + 0.3 + Math.sin(c * Math.PI) * 4; dx2 = F.x + 0.8 + far * 0.4 * c; }
        else if (c < 3.5) { const q = (c - 1) / 2.5; bx2 = F.x + far; by = y0 + 0.1; dx2 = lerp(F.x + 0.8 + far * 0.4, F.x + far, smooth(0, 1, q)); }
        else if (c < 6) { const q = (c - 3.5) / 2.5; dx2 = lerp(F.x + far, F.x + 0.9, smooth(0, 1, q)); bx2 = dx2 + 0.45; by = y0 + 0.5; }
        else { dx2 = F.x + 0.9; bx2 = F.x + 0.3; by = y0 + 1.1; }
        F.d.position.set(dx2, y0 + 0.08, Z(dx2, F.u)); F.d.rotation.y = c >= 3.5 && c < 6 ? Math.PI : 0;
        if (c < 6) walkCycle(F.d, t, 14, 0.7); else standStill(F.d);
        F.d.userData.tail.rotation.y = Math.sin(t * 14) * 0.7;
        F.ball.position.set(bx2, by, Z(bx2, F.u));
      }
    }
    // squirrels: dash, stop, sit up
    squirrels.forEach((q, i) => { const on = !small && near(q.cx, heroX, 100); q.g.visible = on; if (!on) return; const c = (t * 0.5 + q.ph) % 4; if (c < 0.6) { const a = q.ph * 3 + Math.floor((t * 0.5 + q.ph) / 4) * 2.1; q.hx += Math.cos(a) * dt * 3; q.hu += Math.sin(a) * dt * 2; q.hx = clamp(q.hx, -4, 4); q.hu = clamp(q.hu, -3, 3); q.g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)); } const x = q.cx + q.hx, u = q.cu + q.hu; q.g.position.set(x, ground(x, u) + (c < 0.6 ? Math.abs(Math.sin(c * 16)) * 0.15 : 0), Z(x, u)); q.g.rotation.z = c > 2 && c < 3 ? 0.6 : 0; });
    // cats swish their tails
    cats.forEach(c => { const on = !small && near(c.x, heroX, 90); c.g.visible = on; if (on) c.g.userData.tail.rotation.x = Math.sin(t * 2.2 + c.ph) * 0.5; });
    if (siesta) { const on = !small && near(siesta.position.x, heroX, 90); siesta.visible = on; if (on && siesta.userData.tail) siesta.userData.tail.rotation.y = Math.sin(t * 1.5) > 0.8 ? Math.sin(t * 12) * 0.5 : 0; }
    // monarchs flutter
    monarchs.forEach((m, i) => { const on = !small && near(m.cx, heroX, 80); m.g.visible = on; if (!on) return; const a = t * m.w + m.ph, x = m.cx + Math.cos(a) * m.r + Math.sin(t * 1.3 + i) * 0.6, u = m.cu + Math.sin(a * 1.3) * m.r * 0.6; m.g.position.set(x, m.y + Math.sin(t * 2.1 + m.ph) * 0.5, Z(x, u)); m.g.rotation.y = a + Math.PI / 2; const f = Math.sin(t * 22 + i) * 0.9; m.g.userData.w[0].rotation.x = -f; m.g.userData.w[1].rotation.x = f; });
    lastT = t;
  }
  function setZoom(z) { zoom = z; }
  if (/[?&]qa\b/.test(location.search)) window.__life = () => ({ show, zoom });
  return { update, setZoom };
}

/* Points for the drone show, sampled from shapes drawn on a canvas: a car,
   an over-the-air update, Shanghai in characters (when the device has the
   font) and a heart. Each point is [x in -1..1, y in 0..1]. */
function buildShapes(n) {
  const Wc = 200, Hc = 100;
  const cjk = (() => { try { const c = document.createElement('canvas'); c.width = c.height = 40; const q = c.getContext('2d'); const img = ch => { q.clearRect(0, 0, 40, 40); q.font = '32px sans-serif'; q.fillStyle = '#000'; q.fillText(ch, 2, 32); return q.getImageData(0, 0, 40, 40).data.join(','); }; return img('上') !== img('海') && img('上') !== img('￿'); } catch (e) { return false; } })();
  const draws = [
    q => { // a car in profile
      q.lineWidth = 6; q.lineJoin = 'round'; q.beginPath(); q.moveTo(22, 70); q.lineTo(22, 56); q.quadraticCurveTo(26, 48, 46, 46); q.lineTo(70, 30); q.quadraticCurveTo(100, 22, 128, 30); q.lineTo(150, 46); q.quadraticCurveTo(176, 48, 180, 58); q.lineTo(180, 70); q.closePath(); q.stroke();
      q.beginPath(); q.arc(62, 72, 12, 0, 7); q.stroke(); q.beginPath(); q.arc(142, 72, 12, 0, 7); q.stroke();
    },
    q => { // an over-the-air update: a cloud and an arrow down into it
      q.lineWidth = 6; q.beginPath(); q.arc(70, 46, 18, Math.PI * 0.8, Math.PI * 1.9); q.arc(100, 34, 24, Math.PI * 1.1, Math.PI * 1.95); q.arc(132, 48, 18, Math.PI * 1.3, Math.PI * 0.3); q.lineTo(72, 66); q.closePath(); q.stroke();
      q.beginPath(); q.moveTo(100, 48); q.lineTo(100, 90); q.stroke(); q.beginPath(); q.moveTo(86, 76); q.lineTo(100, 92); q.lineTo(114, 76); q.stroke();
    },
    cjk ? (q => { q.font = '900 64px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('上海', 100, 54); }) : (q => { q.font = '900 46px Inter, Arial, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('SHANGHAI', 100, 52); }),
    q => { // a heart
      q.beginPath(); q.moveTo(100, 88); q.bezierCurveTo(40, 52, 58, 10, 100, 34); q.bezierCurveTo(142, 10, 160, 52, 100, 88); q.fill();
    }
  ];
  return draws.map(d => {
    const c = document.createElement('canvas'); c.width = Wc; c.height = Hc; const q = c.getContext('2d');
    q.fillStyle = q.strokeStyle = '#fff'; d(q);
    const px = q.getImageData(0, 0, Wc, Hc).data, cand = [];
    for (let y = 0; y < Hc; y += 2) for (let x = 0; x < Wc; x += 2) if (px[(y * Wc + x) * 4 + 3] > 100) cand.push([x, y]);
    if (!cand.length) cand.push([100, 50]);
    // spread the points out evenly: greedy picks with a shrinking spacing
    let pts = [], dmin = 14;
    const order = cand.map((p, i) => [p, (i * 2654435761) % 1000003]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
    while (pts.length < n && dmin > 0.5) { for (const p of order) { if (pts.length >= n) break; if (pts.every(o => (o[0] - p[0]) ** 2 + (o[1] - p[1]) ** 2 >= dmin * dmin)) pts.push(p); } dmin *= 0.8; }
    while (pts.length < n) pts.push(cand[pts.length % cand.length]);
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return pts.map(([x, y]) => [(x - Wc / 2) / (Wc / 2), 1 - y / Hc]);
  });
}
