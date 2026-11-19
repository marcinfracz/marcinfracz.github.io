/* The Road: terrain, road network, region-aware traffic, NPCs and the
   perception layer (radar, LiDAR, vision boxes, V2X). */
import { cityFlat, cityRiver, cityKeepOut, cityWater } from './landmarks.js?v=76';
import { buildLife } from './life.js?v=50';
import { inPark } from './park.js?v=76';
import { THREE, mat, ownMat, glowMat, reg, mesh, at, box, cyl, sph, grp, merge, bx, cy, label,
  smooth, clamp, lerp, rand, roadZ, roadDZ, tok } from './core.js';

const HALF = 8;            // road half width
const LANES = { A: 1.9, B: 5.7, C: -1.9, D: -5.7 }; // B is the hero's lane

export function buildWorld(scene, opts) {
  const { stops, xMin, xMax, lite } = opts;
  const cities = opts.cities || [];
  const eras = opts.eras || [];
  const R = rand(7);
  const L = xMax - xMin;

  /* ---------- districts: one calm tint per career chapter ---------- */
  const eraMul = eras.map(e => { const c = new THREE.Color(e.color); const m = Math.max(c.r, c.g, c.b) || 1; return [c.r / m, c.g / m, c.b / m]; });
  function eraTint(x, s) {
    let r = 1, g = 1, b = 1;
    eras.forEach((e, k) => {
      const wgt = smooth(e.x0 - 10, e.x0 + 10, x) * (1 - smooth(e.x1 - 10, e.x1 + 10, x));
      if (wgt <= 0) return;
      const m = eraMul[k], a = s * wgt;
      r *= 1 + (m[0] - 1) * a; g *= 1 + (m[1] - 1) * a; b *= 1 + (m[2] - 1) * a;
    });
    return [r, g, b];
  }

  /* ---------- regions ---------- */
  const bounds = []; // {x, a, b}
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].region !== stops[i - 1].region) bounds.push({ x: (stops[i].x + stops[i - 1].x) / 2, a: stops[i - 1].region, b: stops[i].region });
  }
  function regionAt(x) {
    let r = stops[0].region;
    for (const b of bounds) if (x >= b.x) r = b.b;
    return r;
  }
  function rangeOf(region) {
    let lo = Infinity, hi = -Infinity;
    stops.forEach((s, i) => {
      if (s.region !== region) return;
      const a = i > 0 ? (s.x + stops[i - 1].x) / 2 : xMin;
      const b = i < stops.length - 1 ? (s.x + stops[i + 1].x) / 2 : xMax;
      lo = Math.min(lo, a); hi = Math.max(hi, b);
    });
    return [lo, hi];
  }
  const RNG = { asia: rangeOf('asia'), port: rangeOf('port'), mexico: rangeOf('mexico'), now: rangeOf('now') };
  const w = (rg, x, e = 10) => smooth(rg[0] - e, rg[0] + e, x) * (1 - smooth(rg[1] - e, rg[1] + e, x));
  function nearBoundary(x) { let d = 1e9; for (const b of bounds) d = Math.min(d, Math.abs(x - b.x)); return d; }

  const finale = stops[stops.length - 1];
  const stageZones = stops.map(s => ({ x: s.x }));
  // the airfield behind the Crossovers stop, past the edge of the city
  const airfields = stops.filter(s => s.scene === 'launch').map(s => ({ x0: s.x + 46, x1: s.x + 144 }));
  function inStage(x, u) {
    for (const s of stageZones) if (Math.abs(x - s.x) < 24 && u > 9 && u < 44) return true;
    for (const a of airfields) if (x > a.x0 && x < a.x1 && u > 40 && u < 78) return true;
    return false;
  }

  /* ---------- terrain ---------- */
  function height(x, z) {
    const dz = z - roadZ(x), u = -dz;
    let h = 0;
    if (u > 42) {
      const d = u - 42;
      h = smooth(0, 50, d) * (5 + 4 * Math.sin(x * 0.031) + 2.5 * Math.sin(x * 0.071 + z * 0.05))
        + smooth(50, 120, d) * 16 * (0.65 + 0.35 * Math.sin(x * 0.013 + 1.3));
    } else if (dz > 13) {
      h = smooth(13, 45, dz) * (0.7 + 0.5 * Math.sin(x * 0.05 + z * 0.11));
    }
    const wa = w(RNG.asia, x, 12);
    if (wa > 0) {
      const river = smooth(41, 46, u) * (1 - smooth(62, 67, u));
      const flat = smooth(62, 70, u) * (1 - smooth(118, 135, u));
      h = lerp(h, -3.2, wa * river);
      h = lerp(h, 0.4, wa * flat);
    }
    const wp = w(RNG.port, x, 14);
    if (wp > 0) h = lerp(h, -4.5, wp * smooth(29, 33, u) * (1 - smooth(150, 170, u) * 0));
    // mini cities: a flat floor behind the road, and the Detroit River in front
    const cf = cities.length ? cityFlat(cities, x, z) : 0;
    if (cf > 0) h = lerp(h, 0.05, cf);
    const cwr = cities.length ? cityWater(cities, x, z) : 0;
    if (cwr > 0) h = lerp(h, -3.2, cwr);
    const cr = cities.length && dz > 10 ? cityRiver(cities, x, dz) : 0;
    if (cr > 0) h = lerp(h, -3.4, cr);
    // the lookout hill at the finale
    const fx = x - (finale.x + 2), fu = u - 26;
    h += 6.5 * Math.exp(-(fx * fx) / 180 - (fu * fu) / 110);
    return h;
  }
  const lookoutY = height(finale.x + 2, roadZ(finale.x + 2) - 26);

  const segX = lite ? 220 : 340, segZ = lite ? 60 : 96;
  const zMin = -175, zMax = 85;
  const tg = new THREE.PlaneGeometry(L + 120, zMax - zMin, segX, segZ);
  tg.rotateX(-Math.PI / 2);
  tg.translate(xMin + L / 2, 0, (zMin + zMax) / 2);
  const tp = tg.attributes.position, tc = [], tcStrong = [];
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i);
    const h = height(x, z);
    tp.setY(i, h);
    const m = h < -1 ? 0.86 : 0.95 + 0.1 * clamp(h / 18, 0, 1);
    const et = eraTint(x, h < -1 ? 0.04 : 0.13), es = eraTint(x, h < -1 ? 0.08 : 0.38);
    tc.push(m * et[0], m * et[1], m * et[2]);
    tcStrong.push(m * es[0], m * es[1], m * es[2]);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
  tg.computeVertexNormals();
  const tcBase = Float32Array.from(tc), tcHi = Float32Array.from(tcStrong);
  let tintZ = 0, tintTheme = '';
  let life = null;
  function setZoomTint(z, th) {
    if (life) life.setZoom(z);
    const gv = z < 0.05; if (gates.length && gates[0].visible !== gv) gates.forEach(g => { g.visible = gv; });
    const k = smooth(0.15, 0.85, z);
    if (th === tintTheme && Math.abs(k - tintZ) < 0.01 && !(k === 0 && tintZ !== 0) && !(k === 1 && tintZ !== 1)) return;
    tintZ = k; tintTheme = th;
    const dusk = th === 'dusk';
    carpetM.opacity = dusk ? 0.24 * k : 0; carpet.visible = dusk && k > 0.01;
    const arr = tg.attributes.color.array;
    const kk = dusk ? 0 : k;
    for (let i = 0; i < arr.length; i++) arr[i] = tcBase[i] + (tcHi[i] - tcBase[i]) * kk;
    tg.attributes.color.needsUpdate = true;
  }
  // an unlit district carpet for the dark theme's whole-career view
  const cg = tg.clone(), cc = [];
  const cp = cg.attributes.position;
  const eraCol = eras.map(e => new THREE.Color(e.color));
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), z = cp.getZ(i);
    cp.setY(i, cp.getY(i) + 0.35);
    let r = 0, g = 0, b = 0, wsum = 0;
    eras.forEach((e, k) => { const wgt = smooth(e.x0 - 8, e.x0 + 8, x) * (1 - smooth(e.x1 - 8, e.x1 + 8, x)); if (wgt > 0) { r += eraCol[k].r * wgt; g += eraCol[k].g * wgt; b += eraCol[k].b * wgt; wsum += wgt; } });
    const off = smooth(10, 14, Math.abs(z - roadZ(x)));
    cc.push(wsum ? r / wsum : 0, wsum ? g / wsum : 0, wsum ? b / wsum : 0, Math.min(1, wsum) * off);
  }
  cg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 4));
  const carpetM = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
  const carpet = new THREE.Mesh(cg, carpetM); carpet.visible = false; carpet.renderOrder = 1;
  scene.add(carpet);
  const terrain = mesh(tg, mat('terrain', { vertexColors: true }), false);
  terrain.receiveShadow = true;
  scene.add(terrain);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(L + 118, zMax - zMin - 2), mat('water'));
  water.rotation.x = -Math.PI / 2; water.position.set(xMin + L / 2, -1.25, (zMin + zMax) / 2);
  water.receiveShadow = true;
  scene.add(water);

  /* ---------- road ---------- */
  function ribbon(x0, x1, o0, o1, y, material, step = 2, yfn = null) {
    const pos = [], idx = [];
    let n = 0;
    for (let x = x0; x <= x1 + 1e-6; x += step) {
      const z = roadZ(x), yy = yfn ? yfn(x) : y;
      pos.push(x, yy, z + o0, x, yy, z + o1);
      if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      n++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    // keep normals up for flat ribbons
    const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
    const m = new THREE.Mesh(g, material); m.receiveShadow = true;
    return m;
  }
  /* v41: layered road surfaces get a depth bias each, so they never fight at a distance */
  const layer = (m, n) => { m.polygonOffset = true; m.polygonOffsetFactor = -n; m.polygonOffsetUnits = -n * 2; return m; };
  scene.add(ribbon(xMin - 40, xMax + 40, -HALF, HALF, 0.03, layer(mat('road'), 1)));
  scene.add(ribbon(xMin - 40, xMax + 40, HALF, HALF + 2.4, 0.08, mat('curb')));
  scene.add(ribbon(xMin - 40, xMax + 40, -HALF - 2.4, -HALF, 0.08, mat('curb')));
  const lineM = layer(mat('line'), 2);
  [-7.4, 7.4, -0.22, 0.22].forEach(o => scene.add(ribbon(xMin - 40, xMax + 40, o - 0.1, o + 0.1, 0.06, lineM)));
  // dashed lane lines
  {
    const dg = new THREE.BoxGeometry(2.6, 0.04, 0.18);
    const xs = []; for (let x = xMin - 40; x < xMax + 40; x += 6.5) xs.push(x);
    const dm = new THREE.InstancedMesh(dg, mat('line'), xs.length * 2);
    const o = new THREE.Object3D(); let k = 0;
    xs.forEach(x => [3.8, -3.8].forEach(off => {
      o.position.set(x, 0.06, roadZ(x) + off); o.rotation.y = -Math.atan(roadDZ(x)); o.updateMatrix(); dm.setMatrixAt(k++, o.matrix);
    }));
    dm.receiveShadow = true; scene.add(dm);
  }

  /* ---------- signals, crosswalks, topes ---------- */
  const signals = []; // {x, crosswalk, offset}
  const ax = stops.find(s => s.region === 'asia');
  if (ax) { signals.push({ x: ax.x - 22, cw: true, off: 0 }, { x: ax.x + 26, cw: true, off: 5 }); }
  stops.forEach((s, i) => { if (i > 0 && i < stops.length - 1 && i % 3 === 1 && s.region === 'us') signals.push({ x: s.x + 34, cw: false, off: i * 1.7 }); });
  const mx = stops.find(s => s.region === 'mexico');
  if (mx) signals.push({ x: mx.x - 30, cw: true, off: 2 });
  const topes = mx ? [mx.x - 14, mx.x + 18] : [];
  /* v50: a longer red so the people on the crosswalk always finish before the cars go again */
  const CYCLE = 15, GREEN = 7;
  const CW0 = -5.15, CW1 = -0.1;                 // the crosswalk, along the road, from the signal's x
  const PED_WAIT = HALF + 2.2, PED_ROW = 0.7, PED_V = 4.5;
  const sigGreen = (s, t) => ((t + s.off) % CYCLE) < GREEN;

  /* v41: three-lamp heads, red over yellow over green, with a yellow phase */
  const YELLOW = 1.6;
  const sigPhase = (s, t) => { const p = (t + s.off) % CYCLE; return p < GREEN ? 2 : p < GREEN + YELLOW ? 1 : 0; };
  const lampOn = ['#E5484D', '#F2B632', '#3FB27F'].map(c => new THREE.MeshBasicMaterial({ color: c }));
  const lampOff = new THREE.MeshBasicMaterial({ color: '#3A434D' });
  signals.forEach(s => {
    const z = roadZ(s.x);
    /* v50: the pole stands back off the sidewalk, so riders and walkers never pass through it */
    const pole = grp(cyl(0.12, 0.12, 6, 'objDark'), box(0.12, 0.12, 8.9, 'objDark', 0, 5.9, 4.4), box(0.6, 1.75, 0.5, 'objDark', 0, 4.6, 8.4));
    at(pole, s.x + 1.2, 0, z - HALF - 3.6);
    s.lamps = [5.98, 5.45, 4.92].map(y => { const l = sph(0.2, lampOff, 0, y, 8.67, 10); l.castShadow = false; pole.add(l); return l; });
    s.ph = -1;
    scene.add(pole);
    s.rsu = new THREE.Vector3(s.x + 1.2, 6.2, z - HALF - 3.6);
    s.peds = []; s.occ = [];
    if (s.cw) {
      const n = 9, sg = new THREE.InstancedMesh(new THREE.BoxGeometry(CW1 - CW0, 0.05, 0.9), mat('line'), n);
      const o = new THREE.Object3D();
      for (let i = 0; i < n; i++) { o.position.set(s.x + (CW0 + CW1) / 2, 0.07, z - HALF + 1 + i * 1.75); o.updateMatrix(); sg.setMatrixAt(i, o.matrix); }
      scene.add(sg);
    }
  });
  topes.forEach(x => scene.add(at(mesh(new THREE.BoxGeometry(0.9, 0.18, HALF * 2), mat('accent'), false), x, 0.09, roadZ(x))));

  /* ---------- v43: China's road markings through the Shanghai chapter ---------- */
  const decalMats = [];
  if (ax) {
    const [A0, A1] = RNG.asia;
    const cjk = (() => { try { const c = document.createElement('canvas'); c.width = c.height = 40; const q = c.getContext('2d'); const img = ch => { q.clearRect(0, 0, 40, 40); q.font = '32px sans-serif'; q.fillStyle = '#000'; q.fillText(ch, 2, 32); return q.getImageData(0, 0, 40, 40).data.join(','); }; return img('\u6162') !== img('\u516c') && img('\u6162') !== img('\uFFFF'); } catch (e) { return false; } })();
    const decalTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const dMat = tex => { const m = layer(new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false }), 3); decalMats.push(m); return m; };
    // a decal lying in a lane: along = length on the road, across = width; dir +1 reads for traffic going +x
    const decal = (m, along, across, x, off, dir) => { const g = new THREE.PlaneGeometry(across, along); g.rotateX(-Math.PI / 2); g.rotateY(dir > 0 ? -Math.PI / 2 : Math.PI / 2); const me = new THREE.Mesh(g, m); me.position.set(x, 0.075, roadZ(x) + off); me.rotation.y = -Math.atan(roadDZ(x)); me.receiveShadow = true; me.renderOrder = 2; scene.add(me); return me; };
    const W = '#F4F1EA', Y = '#E8B83A';
    const txt = (str, col, fs) => dMat(decalTex(128, 384, (q, w, h) => { q.fillStyle = col; q.textAlign = 'center'; q.textBaseline = 'middle'; const n = str.length; q.font = `900 ${fs}px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif`; [...str].forEach((ch, i) => { q.save(); q.translate(w / 2, h * (n - i - 0.5) / n); q.scale(1, 2.6 / Math.max(1, n * 0.9)); q.fillText(ch, 0, 4); q.restore(); }); }));
    const slowM = cjk ? txt('\u6162', W, 104) : null;           // man: slow
    const busM = cjk ? txt('\u516c\u4ea4\u4e13\u7528', Y, 92) : null; // gongjiao zhuanyong: buses only
    const sixtyM = dMat(decalTex(128, 384, (q, w, h) => { q.fillStyle = W; q.textAlign = 'center'; q.textBaseline = 'middle'; q.font = '900 110px Inter, Arial, sans-serif'; q.save(); q.translate(w / 2, h / 2); q.scale(1, 2.4); q.fillText('60', 0, 4); q.restore(); }));
    const diamondM = dMat(decalTex(128, 384, (q, w, h) => { q.strokeStyle = W; q.lineWidth = 12; q.beginPath(); q.moveTo(w / 2, 14); q.lineTo(w - 16, h / 2); q.lineTo(w / 2, h - 14); q.lineTo(16, h / 2); q.closePath(); q.stroke(); }));
    const arrowM = dMat(decalTex(128, 384, (q, w, h) => { q.fillStyle = W; // straight-and-left arrow, pointing up the texture
      q.fillRect(w / 2 - 9, 120, 18, h - 130); q.beginPath(); q.moveTo(w / 2, 12); q.lineTo(w / 2 + 34, 120); q.lineTo(w / 2 - 34, 120); q.fill();
      q.lineWidth = 16; q.strokeStyle = W; q.beginPath(); q.moveTo(w / 2, 300); q.quadraticCurveTo(w / 2, 220, 30, 220); q.stroke(); q.beginPath(); q.moveTo(8, 220); q.lineTo(40, 190); q.lineTo(40, 250); q.fill(); }));
    const fishM = dMat(decalTex(128, 512, (q, w, h) => { q.strokeStyle = W; q.lineWidth = 9; for (let y = 30; y < h - 10; y += 46) { [[8, 1], [w - 8, -1]].forEach(([x0, sd]) => { q.beginPath(); q.moveTo(x0, y + 26); q.lineTo(x0 + sd * 34, y); q.stroke(); }); } q.lineWidth = 7; q.beginPath(); q.moveTo(6, 0); q.lineTo(6, h); q.moveTo(w - 6, 0); q.lineTo(w - 6, h); q.stroke(); }));
    // approaching each crosswalk: fishbone lines, the diamond, "slow" and the lane arrows
    signals.filter(sg => sg.cw && sg.x > A0 && sg.x < A1).forEach(sg => {
      const X = sg.x - 2.5;
      [[LANES.A, 1], [LANES.B, 1], [LANES.C, -1], [LANES.D, -1]].forEach(([off, dir]) => {
        const at2 = d => X - dir * d;
        decal(fishM, 16, 3.5, at2(32), off, dir);
        decal(diamondM, 4.4, 2.2, at2(18), off, dir);
        if (slowM) decal(slowM, 4.6, 2.4, at2(11.5), off, dir);
        decal(arrowM, 5, 2.4, at2(5.5), off, dir);
      });
    });
    // painted speed limits as the district begins, both ways
    decal(sixtyM, 4.8, 2.4, A0 + 14, LANES.A, 1); decal(sixtyM, 4.8, 2.4, A0 + 14, LANES.B, 1);
    decal(sixtyM, 4.8, 2.4, A1 - 14, LANES.C, -1); decal(sixtyM, 4.8, 2.4, A1 - 14, LANES.D, -1);
    // the Bund side: a bus-only lane, and a yellow box junction where the side street meets the road
    const sh = stops.find(sq => sq.id === 'shanghai' || sq.scene === 'shanghai');
    const yM = layer(new THREE.MeshLambertMaterial({ color: Y }), 3); decalMats.push(yM); yM.userData.yellow = true;
    const yCenter = layer(new THREE.MeshLambertMaterial({ color: Y }), 3); decalMats.push(yCenter); yCenter.userData.yellow = true;
    [-0.22, 0.22].forEach(o => scene.add(ribbon(A0 + 4, A1 - 4, o - 0.1, o + 0.1, 0.07, yCenter)));
    if (sh) {
      const B0 = sh.x - 58, B1 = sh.x + 50;
      const dg = new THREE.BoxGeometry(2.7, 0.04, 0.22), xs = []; for (let x = xMin - 40; x < xMax + 40; x += 6.5) if (x > B0 && x < B1) xs.push(x);
      const ym = new THREE.InstancedMesh(dg, yM, xs.length * 2), o = new THREE.Object3D(); let k = 0;
      xs.forEach(x => [-3.8, -7.4].forEach(off => { o.position.set(x, 0.075, roadZ(x) + off); o.rotation.y = -Math.atan(roadDZ(x)); o.updateMatrix(); ym.setMatrixAt(k++, o.matrix); }));
      scene.add(ym);
      if (busM) for (let x = B0 + 10; x < B1 - 6; x += 32) { if (Math.abs(x - (sh.x + 34)) < 9) continue; decal(busM, 7.5, 2.6, x, LANES.D, -1); }
      const gx = sh.x + 34;
      const boxM = dMat(decalTex(256, 512, (q, w, h) => { q.strokeStyle = Y; q.lineWidth = 10; q.strokeRect(8, 8, w - 16, h - 16); q.lineWidth = 6; q.save(); q.beginPath(); q.rect(8, 8, w - 16, h - 16); q.clip(); for (let d = -h; d < w + h; d += 46) { q.beginPath(); q.moveTo(d, 0); q.lineTo(d + h, h); q.moveTo(d + h, 0); q.lineTo(d, h); q.stroke(); } q.restore(); }));
      decal(boxM, 9, 15, gx, 0, 1);
    }
  }

  /* ---------- scattered props (instanced) ---------- */
  const props = {
    tree: { geo: merge([[cy(0.25, 0.3, 1.4), 0.55], [new THREE.ConeGeometry(1.5, 3.6, 9).translate(0, 3.0, 0), 1]]), key: 'tree', list: [] },
    house: { geo: merge([[bx(5, 2.8, 4.2), 1], [new THREE.CylinderGeometry(0.01, 3.6, 2, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.82).translate(0, 3.8, 0), 0.82]]), key: 'obj', list: [] },
    low: { geo: merge([[bx(6, 3.4, 5), 1], [bx(6.2, 0.3, 5.2, 0, 3.4, 0), 0.8]]), key: 'obj', list: [] },
    tower: { geo: merge([[bx(5, 1, 5), 1], [bx(5.3, 0.04, 5.3, 0, 0.97, 0), 0.75]]), key: 'obj', list: [] },
    container: { geo: merge([[bx(6, 2.5, 2.4), 1], [bx(6.02, 0.12, 2.42, 0, 2.38, 0), 0.8]]), key: 'obj', list: [] }
  };
  const tints = {
    us: [[1, 1, 1], [0.93, 0.95, 0.98], [0.86, 0.89, 0.93]],
    mexico: [[1.04, 0.97, 0.9], [0.98, 0.93, 0.95], [0.92, 0.97, 1.0], [1.02, 1.0, 0.92]],
    asia: [[0.95, 0.97, 1.02], [0.88, 0.92, 0.98], [1, 1, 1]],
    port: [[0.9, 0.95, 1.05], [1.05, 0.92, 0.85], [0.9, 1.0, 0.95], [1.0, 0.98, 0.9], [0.8, 0.86, 0.95]],
    now: [[1, 1, 1], [0.95, 0.97, 1]]
  };
  function put(kind, x, z, s = 1, ry = 0, sy = 1, tint = [1, 1, 1]) {
    if (cities.length && cityKeepOut(cities, x, z)) return;
    if (inPark(finale.x, x, z)) return;   // v74: the EUC jump park keeps its field clear
    const et = eraTint(x, kind === 'tree' ? 0.08 : 0.14);
    props[kind].list.push({ x, y: height(x, z), z, s, ry, sy, tint: [tint[0] * et[0], tint[1] * et[1], tint[2] * et[2]] });
  }
  for (let x = xMin - 30; x < xMax + 30; x += 3) {
    const rg = regionAt(x), rz = roadZ(x);
    const tl = tints[rg] || tints.us;
    const pick = () => tl[(R() * tl.length) | 0];
    // front side (toward camera)
    if (R() < (rg === 'asia' ? 0.5 : 0.35)) {
      const dz = 15 + R() * 32, z = rz + dz;
      if (rg === 'us' || rg === 'now') { if (R() < 0.55) put('tree', x, z, 0.8 + R() * 0.6); else if (rg === 'us') put('house', x, z, 0.8 + R() * 0.3, (R() - 0.5) * 0.4, 1, pick()); }
      else if (rg === 'mexico') { if (R() < 0.75) put('low', x, z, 0.75 + R() * 0.4, (R() - 0.5) * 0.2, 0.7 + R() * 0.6, pick()); else put('tree', x, z, 0.7); }
      else if (rg === 'asia') { put('tower', x, z, 0.8 + R() * 0.4, 0, 1.6 + R() * 2.4, pick()); }
      else if (rg === 'port') { if (dz < 30) put('container', x, z, 1, 0, 1 + ((R() * 3) | 0), pick()); }
    }
    // back side
    if (R() < 0.6) {
      const u = 12 + R() * 70, z = rz - u;
      if (inStage(x, u)) continue;
      const h = height(x, z);
      if (h < -0.6) continue;
      if (rg === 'us') { if (u > 42 || R() < 0.5) put('tree', x, z, 0.8 + R() * 0.8); else put('house', x, z, 0.9, R() * 0.5, 1, pick()); }
      else if (rg === 'mexico') put(R() < 0.7 ? 'low' : 'tree', x, z, 0.8 + R() * 0.4, 0, 0.7 + R() * 0.8, pick());
      else if (rg === 'asia') { if (u > 66) put('tower', x, z, 1 + R() * 0.8, 0, 10 + R() * 28, pick()); else if (u < 30) put('tower', x, z, 0.9, 0, 4 + R() * 8, pick()); }
      else if (rg === 'port') { if (u < 28) put('container', x, z, 1, Math.PI / 2 * ((R() * 2) | 0), 1 + ((R() * 4) | 0), pick()); }
      else put('tree', x, z, 0.9 + R() * 0.6);
    }
  }
  // the Lujiazui skyline beyond the river, plus a dense far field
  if (ax) {
    for (let i = 0; i < 90; i++) {
      const x = ax.x - 50 + R() * 100, z = roadZ(x) - 72 - R() * 55;
      put('tower', x, z, 1 + R(), 0, 8 + R() * 30 * (1 - Math.abs(x - ax.x) / 60), tints.asia[(R() * 3) | 0]);
    }
  }
  // the far field, so the whole career reads as one full world from above
  for (let x = xMin - 50; x < xMax + 50; x += lite ? 7 : 4) {
    const rg = regionAt(x), rz = roadZ(x), tl = tints[rg] || tints.us;
    const pick = () => tl[(R() * tl.length) | 0];
    for (let n = 0; n < 2; n++) {
      const u = 84 + R() * 84, z = rz - u, h = height(x, z);
      if (h < -0.6 || z < -172) continue;
      if (rg === 'asia') { if (R() < 0.7) put('tower', x, z, 1 + R() * 0.8, 0, 6 + R() * 20, pick()); }
      else if (rg === 'port') { if (R() < 0.5) put('tree', x, z, 1 + R() * 0.7); }
      else if (rg === 'mexico') put(R() < 0.6 ? 'low' : 'tree', x, z, 0.9 + R() * 0.5, R() * 3, 0.8 + R() * 0.8, pick());
      else if (rg === 'now') { if (R() < 0.5) put('tree', x, z, 1 + R() * 0.8); else put('tower', x, z, 0.9 + R() * 0.4, 0, 2 + R() * 5, pick()); }
      else put(R() < 0.75 ? 'tree' : 'house', x, z, 0.9 + R() * 0.8, R() * 3, 1, pick());
    }
    if (R() < 0.7) {
      const dz = 48 + R() * 34, z = rz + dz;
      if (z > 82) continue;
      if (rg === 'asia') put('tower', x, z, 0.9 + R() * 0.4, 0, 1.4 + R() * 2, pick());
      else if (rg === 'mexico') put('low', x, z, 0.8 + R() * 0.4, R() * 3, 0.7 + R() * 0.5, pick());
      else if (rg === 'port') put('container', x, z, 1, Math.PI / 2 * ((R() * 2) | 0), 1 + ((R() * 3) | 0), pick());
      else put(R() < 0.7 ? 'tree' : 'house', x, z, 0.8 + R() * 0.6, R() * 3, 1, pick());
    }
  }
  const o3 = new THREE.Object3D(), col = new THREE.Color();
  Object.values(props).forEach(p => {
    if (!p.list.length) return;
    const im = new THREE.InstancedMesh(p.geo, mat(p.key, { vertexColors: true }), p.list.length);
    p.list.forEach((q, i) => {
      o3.position.set(q.x, q.y, q.z); o3.rotation.set(0, q.ry, 0); o3.scale.set(q.s, q.s * q.sy, q.s); o3.updateMatrix();
      im.setMatrixAt(i, o3.matrix); im.setColorAt(i, col.setRGB(q.tint[0], q.tint[1], q.tint[2]));
    });
    im.castShadow = true; im.receiveShadow = true;
    scene.add(im);
  });

  /* ---------- gateways: a colored arch and sign where each chapter starts ---------- */
  const gates = []; // hidden in the overview, where the side panel names the chapters
  eras.forEach(e => {
    const x = e.x0 + 3, z = roadZ(x), yaw = -Math.atan(roadDZ(x));
    const span = HALF + 3.4, cm = new THREE.MeshLambertMaterial({ color: e.color });
    const gate = grp(
      cyl(0.32, 0.38, 8.4, 'objDark', 0, 0, -span), cyl(0.32, 0.38, 8.4, 'objDark', 0, 0, span),
      box(0.9, 0.9, span * 2 + 1.4, cm, 0, 7.7, 0), box(0.5, 0.18, span * 2 + 1.6, 'line', 0, 8.25, 0)
    );
    const sign = label(`${e.n} · ${e.name.toUpperCase()}  ${e.years}`, { size: 22, key: 'ink', bg: 'card', scale: 0.62 });
    sign.position.set(0, 10.6, -span + 3); gate.add(sign);
    at(gate, x, 0, z, yaw);
    gate.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(gate); gates.push(gate);
  });

  /* ---------- Shanghai: elevated highway with arches ---------- */
  const elevated = [];
  let underGlow = null;
  if (ax) {
    const x0 = ax.x - 40, x1 = ax.x + 40, U = 34;
    const ey = x => 7 * smooth(x0, x0 + 16, x) * (1 - smooth(x1 - 16, x1, x));
    const deck = new THREE.Group();
    const dk = ribbon(x0, x1, -U - 3.4, -U + 3.4, 0, mat('road'), 1, ey); deck.add(dk);
    const sideA = ribbon(x0, x1, -U + 3.4, -U + 3.8, 0, mat('curb'), 1, x => ey(x) + 0.5); deck.add(sideA);
    const sideB = ribbon(x0, x1, -U - 3.8, -U - 3.4, 0, mat('curb'), 1, x => ey(x) + 0.5); deck.add(sideB);
    const under = ribbon(x0, x1, -U - 3.4, -U + 3.4, 0, mat('objShade', { side: THREE.DoubleSide }), 1, x => ey(x) - 0.6); deck.add(under);
    const glowM = glowMat('glow', 0.0);
    for (let x = x0 + 18; x < x1 - 18; x += 8) {
      const z = roadZ(x) - U, y = ey(x);
      deck.add(cyl(0.7, 0.9, y - 0.6, 'obj', x, 0, z));
      const arch = mesh(new THREE.TorusGeometry(3.6, 0.35, 8, 20, Math.PI), mat('obj'));
      at(arch, x + 4, y - 4.3, z); deck.add(arch);
      const g = mesh(new THREE.TorusGeometry(3.6, 0.12, 6, 20, Math.PI), glowM, false); at(g, x + 4, y - 4.35, z + 0.4); deck.add(g);
    }
    underGlow = glowM;
    /* v69: a short covered tunnel mouth at each end of the elevated road, so its cars drive down out of sight
       below ground and come back up from there, instead of shrinking away at the ends */
    [[x0, 1], [x1, -1]].forEach(([xe, sd]) => {
      const pm = grp(box(7, 3.4, 0.5, 'obj', 0, 0, 3.9), box(7, 3.4, 0.5, 'obj', 0, 0, -3.9), box(7.2, 0.5, 8.3, 'obj', 0, 3.2, 0), box(0.4, 3.2, 7.3, 'objDark', -sd * 3.3, 0, 0));
      pm.traverse(o => { if (o.isMesh) o.castShadow = true; });
      at(pm, xe, 0, roadZ(xe) - U, -Math.atan(roadDZ(xe))); deck.add(pm);
    });
    scene.add(deck);
    // elevated traffic
    const eg = vehicleGeo('sedan');
    const em = new THREE.InstancedMesh(eg, mat('obj', { vertexColors: true }), 26);
    em.castShadow = true;
    /* v50: one steady speed per carriageway and even spacing, so no car drives through another */
    for (let i = 0; i < 26; i++) { const lane = i % 2 ? 1.6 : -1.6, j = i >> 1; elevated.push({ s: (j + 0.5 + (R() - 0.5) * 0.3) / 13, lane, v: (lane > 0 ? 0.062 : 0.056) * 68 / 92, tint: [0.9 + R() * 0.2, 0.92 + R() * 0.15, 1] }); }
    scene.add(em);
    elevated.mesh = em; elevated.x0 = x0; elevated.x1 = x1; elevated.U = U; elevated.ey = ey;
  }

  /* ---------- billboards (Shanghai) ---------- */
  const boards = [];
  /* simple LED ad screens: a gradient, a car shape and a few lines of 'copy' */
  const adTex = [['#0E3A8A', '#22D3EE', '新能源'], ['#7A1F2B', '#E8A33D', '智能驾驶'], ['#12343B', '#3FB27F', '上海'], ['#2B1E5C', '#C77DFF', '欢迎']].map(([a, b, word]) => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 132; const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 256, 132); gr.addColorStop(0, a); gr.addColorStop(1, b); c.fillStyle = gr; c.fillRect(0, 0, 256, 132);
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.moveTo(118, 96); c.lineTo(130, 74); c.lineTo(170, 66); c.lineTo(206, 70); c.lineTo(232, 84); c.lineTo(236, 96); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.55)'; [140, 214].forEach(x => { c.beginPath(); c.arc(x, 98, 8, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = '#fff'; c.font = '800 30px "Noto Sans SC", "PingFang SC", sans-serif'; c.textBaseline = 'top'; c.fillText(word, 16, 16);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(16, 60, 84, 6); c.fillRect(16, 74, 60, 6);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  if (ax) {
    [[-36, -13, 8], [31, -12, 9], [46, -50, 14], [-42, -52, 12]].forEach(([dx, dz, h], i) => {
      const x = ax.x + dx, z = roadZ(x) + dz;
      const g = grp(cyl(0.3, 0.3, h, 'objDark'));
      const face = new THREE.MeshBasicMaterial({ color: '#fff', map: adTex[i % adTex.length] });
      const scr = mesh(new THREE.BoxGeometry(7, 3.6, 0.3), face, false);
      at(scr, 0, h + 1.8, 0); g.add(scr);
      const frame = mesh(new THREE.BoxGeometry(7.5, 4.1, 0.2), mat('objDark'), false); at(frame, 0, h + 1.8, -0.12); g.add(frame);
      at(g, x, height(x, z), z, dz > 0 ? 0 : 0);
      scene.add(g); boards.push({ face, ph: i * 1.3, i });
    });
  }

  /* ---------- traffic ---------- */
  const TYPES = ['sedan', 'suv', 'pickup', 'compact', 'taxi', 'robotaxi', 'bus', 'semi', 'van', 'police', 'ambulance', 'fire'];
  const LEN = { sedan: 4.6, suv: 4.9, pickup: 5.8, compact: 3.8, taxi: 3.8, robotaxi: 4.6, bus: 10, semi: 12.5, van: 5.2, police: 4.8, ambulance: 6, fire: 8.6 };
  /* v41: police cars, ambulances and fire trucks join every region's cast */
  const CAST = {
    us: [['pickup', 30], ['suv', 30], ['sedan', 18], ['semi', 9], ['bus', 5], ['compact', 8], ['police', 3], ['ambulance', 1.6], ['fire', 1.3]],
    mexico: [['compact', 38], ['taxi', 22], ['sedan', 14], ['pickup', 10], ['van', 10], ['bus', 6], ['police', 3], ['ambulance', 1.5], ['fire', 1]],
    asia: [['robotaxi', 26], ['sedan', 30], ['compact', 20], ['van', 10], ['bus', 8], ['taxi', 6], ['police', 2.5], ['ambulance', 1.5], ['fire', 1]],
    port: [['semi', 26], ['van', 16], ['suv', 20], ['compact', 18], ['sedan', 20], ['fire', 2], ['police', 2]],
    now: [['sedan', 50], ['robotaxi', 50]]
  };
  const EMERG = {
    police: [[-0.25, 2.12, 0.42], [-0.25, 2.12, -0.42]],
    ambulance: [[0.95, 2.72, 0.7], [0.95, 2.72, -0.7]],
    fire: [[3.55, 2.62, 0.75], [3.55, 2.62, -0.75]]
  };
  const DENS = { us: 0.5, mexico: 0.75, asia: 0.95, port: 0.55, now: 0.18 };
  const PAL = {
    us: [[1, 1, 1], [0.82, 0.85, 0.9], [0.6, 0.64, 0.7], [0.98, 0.94, 0.86], [0.82, 0.88, 0.98], [0.45, 0.48, 0.55]],
    mexico: [[1, 1, 1], [0.9, 0.92, 0.95], [1.02, 0.95, 0.85], [0.75, 0.8, 0.88]],
    asia: [[1.08, 1.08, 1.1], [0.9, 0.93, 0.98], [0.78, 0.84, 0.95], [0.6, 0.64, 0.7]],
    port: [[1, 1, 1], [0.82, 0.86, 0.92], [0.95, 0.9, 0.82]],
    now: [[1.08, 1.08, 1.1], [0.9, 0.93, 0.98]]
  };
  // busier roads through the mini cities
  function busy(x) { let b = 0; for (const c of cities) if (x > c.X0 - 10 && x < c.X1 + 10) b = Math.max(b, 0.4 * smooth(c.X0 - 10, c.X0 + 5, x) * (1 - smooth(c.X1 - 5, c.X1 + 10, x))); return b; }
  function pickType(seed, rg) {
    const c = CAST[rg] || CAST.us; let tot = 0; c.forEach(e => tot += e[1]);
    let r = seed * tot; for (const [t, wgt] of c) { if ((r -= wgt) <= 0) return t; } return c[0][0];
  }
  const N = lite ? 140 : 300;
  const cars = [];
  /* v50: cars start spread out along each lane, never on top of each other */
  const perLane = Math.ceil(N / 3), laneN = { A: 0, C: 0, D: 0 };
  for (let i = 0; i < N; i++) {
    const lane = ['A', 'C', 'D'][i % 3], j = laneN[lane]++;
    cars.push({ x: xMin + (j + 0.5 + (R() - 0.5) * 0.3) * L / perLane, lane, z: LANES[lane], v: 0, vmax: 7 + R() * 5, s1: R(), s2: R(), s3: R(), type: 'sedan', show: false, pend: false });
  }
  // the longest body each car can take on in any region keeps the spacing safe through every gate
  cars.forEach(c => { c.ml = Math.max(...Object.keys(CAST).map(rg => LEN[pickType(c.s1, rg)])); const rg = regionAt(c.x); c.rg = rg; c.type = pickType(c.s1, rg); c.show = c.s2 < (DENS[rg] || 0.5); });
  ['A', 'C', 'D'].forEach(k => { let last = null; cars.filter(c => c.lane === k && c.show).sort((a, b) => a.x - b.x).forEach(c => { if (last && c.x - last.x < (c.ml + last.ml) / 2 + 6) c.show = false; else last = c; }); });
  const vmeshes = {};
  TYPES.forEach(t => {
    const im = new THREE.InstancedMesh(vehicleGeo(t), mat('obj', { vertexColors: true }), N);
    im.castShadow = true; im.receiveShadow = false; im.count = 0;
    im.frustumCulled = false;
    vmeshes[t] = im; scene.add(im);
  });
  // headlights at dusk: tiny glow quads instanced
  // v41: flashing beacons on emergency vehicles, two per vehicle, swapping
  const beacons = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 60);
  beacons.frustumCulled = false; beacons.setColorAt(0, new THREE.Color('#ffffff')); beacons.count = 0; scene.add(beacons);
  const BEAM = { police: ['#FF3B3B', '#3D7BFF'], ambulance: ['#FF3B3B', '#FFFFFF'], fire: ['#FF3B3B', '#FFB020'] };
  const beamC = {}; for (const k in BEAM) beamC[k] = BEAM[k].map(c => new THREE.Color(c));
  const headG = new THREE.PlaneGeometry(1.6, 0.5);
  const headM = glowMat('sun', 0.0);
  const heads = new THREE.InstancedMesh(headG, headM, N); heads.frustumCulled = false; scene.add(heads);

  /* scooters and pedestrians (Shanghai) */
  const scooters = [], peds = [];
  const SCOOT_Z = HALF - 0.62;
  const pedDX = p => (p.side > 0 ? -4.8 : -2.25) + p.col * 0.6;   // walking away from the camera keeps left, toward it right
  let scootMesh = null, pedMesh = null;
  if (ax) {
    const sg = merge([[bx(1.5, 0.25, 0.35, 0, 0.35, 0), 0.5], [cy(0.18, 0.2, 0.9, 0, 0.6, 0, 6), 1], [new THREE.SphereGeometry(0.22, 8, 6).translate(0, 1.7, 0), 0.9]]);
    scootMesh = new THREE.InstancedMesh(sg, mat('obj', { vertexColors: true }), 70); scootMesh.castShadow = true; scootMesh.frustumCulled = false;
    /* v50: the scooters ride the near edge of the road with the traffic, in single file, and stop for red */
    const [sa0, sa1] = RNG.asia, sLen = sa1 - sa0 - 8;
    for (let i = 0; i < 40; i++) scooters.push({ x: sa0 + 4 + (i + 0.5 + (R() - 0.5) * 0.3) * sLen / 40, v: 0, vmax: 3.6 + R() * 1.8, wob: R() * 6, tint: [[1, 1, 1], [1.05, 0.9, 0.6], [0.7, 0.8, 1]][(R() * 3) | 0] });
    scootMesh.count = scooters.length;   /* v55: only the scooters in use render, nothing parked at the origin */
    scene.add(scootMesh);
    const pg = merge([[cy(0.25, 0.3, 1.2, 0, 0, 0, 6), 1], [new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.45, 0), 0.92]]);
    pedMesh = new THREE.InstancedMesh(pg, mat('obj', { vertexColors: true }), 60); pedMesh.castShadow = true; pedMesh.frustumCulled = false;
    const cws = signals.filter(s => s.cw && Math.abs(s.x - ax.x) < 40);
    /* v50: each crosswalk has two groups of 15 that swap curbs on each red: four files, queued four deep,
       keeping to their own half of the crossing, so nobody walks through anybody */
    cws.forEach(s => { s.grp = { 1: { n: 0, walk: false, cyc: -1 }, '-1': { n: 0, walk: false, cyc: -1 } }; });
    for (let i = 0; i < 60; i++) {
      const s = cws[i % cws.length], k = (i / cws.length) | 0, g = k < 15 ? 1 : -1, slot = k % 15;
      const p = { sig: s, g, side: g, col: slot % 4, r: (slot / 4) | 0, d: 0, walk: false, off: 0, tint: [0.7 + R() * 0.4, 0.7 + R() * 0.35, 0.75 + R() * 0.3] };
      p.dx = p.dxT = pedDX(p); peds.push(p); s.peds.push(p);
    }
    scene.add(pedMesh);
  }

  /* ---------- v41: riders all along the drive ----------
     motorcycles and mopeds ride the far road edge with the traffic; e-scooters,
     kick scooters and e-unicycles use the paths on both curbs. */
  const RR = rand(41);
  const RIDE = ['motorcycle', 'moped', 'escooter', 'kick', 'unicycle'];
  const RCAST = {
    us: { road: [['motorcycle', 6], ['moped', 2]], path: [['escooter', 5], ['kick', 3], ['unicycle', 2]] },
    mexico: { road: [['moped', 6], ['motorcycle', 5]], path: [['escooter', 3], ['kick', 3], ['unicycle', 1]] },
    asia: { road: [['moped', 8], ['motorcycle', 2]], path: [['escooter', 6], ['unicycle', 3], ['kick', 2]] },
    port: { road: [['motorcycle', 3], ['moped', 2]], path: [['escooter', 2], ['kick', 1]] },
    now: { road: [['motorcycle', 1]], path: [['escooter', 2], ['unicycle', 2]] }
  };
  const RDENS = { us: 0.55, mexico: 0.8, asia: 0.9, port: 0.35, now: 0.4 };
  const pickRide = (seed, list) => { let tot = 0; list.forEach(e => tot += e[1]); let r = seed * tot; for (const [k, wg] of list) if ((r -= wg) <= 0) return k; return list[0][0]; };
  const NR = lite ? 26 : 56, NP = lite ? 30 : 64;
  const riders = [];
  /* v50: motorbikes ride single file in the strip beyond the far lane; on the sidewalks each direction keeps
     its own half (in on the road side, out on the far side), so riders never pass through one another */
  for (let i = 0; i < NR; i++) riders.push({ path: false, band: 'road', x: xMin + (i + 0.5 + (RR() - 0.5) * 0.3) * L / NR, dir: -1, z: -7.35, v: 0, vmax: 6 + RR() * 5, s1: RR(), s2: RR(), tint: 0.85 + RR() * 0.3, ph: RR() * 6 });
  for (let i = 0; i < NP; i++) {
    const side = i % 2 === 0 ? 1 : -1, dir = (i >> 1) % 2 ? 1 : -1, band = side + '|' + dir, j = i >> 2;
    riders.push({ path: true, band, x: xMin + (j + 0.5 + (RR() - 0.5) * 0.3) * L / Math.ceil(NP / 4), dir, z: side * (dir === side ? HALF + 0.7 : HALF + 1.45), v: 0, vmax: 2.4 + RR() * 2.2, s1: RR(), s2: RR(), tint: 0.85 + RR() * 0.3, ph: RR() * 6 });
  }
  const stopXs0 = stops.map(s => s.x);
  const nearStop = x => { let d = 1e9; for (const sx of stopXs0) d = Math.min(d, Math.abs(sx - x)); return d; };
  riders.forEach(r => { const rg = regionAt(r.x), cast = RCAST[rg] || RCAST.us; r.rg = rg; r.type = pickRide(r.s1, r.path ? cast.path : cast.road); r.want = r.s2 < (RDENS[rg] || 0.5); r.show = r.want && !(r.path && nearStop(r.x) < 18); });
  const rideMesh = {};
  RIDE.forEach(k => { const im = new THREE.InstancedMesh(riderGeo(k), mat('obj', { vertexColors: true }), NR + NP); im.castShadow = !lite; im.frustumCulled = false; im.count = 0; rideMesh[k] = im; scene.add(im); });
  const stopXs = stops.map(s => s.x);

  /* ---------- v41: a high-speed train on the viaduct at Shanghai's east edge (built with the city) ---------- */
  let hsr = null;
  if (ax) {
    const HX = ax.x + 42, DY = 9.62, U0 = -46, U1 = 128;
    const tz = u => roadZ(HX) - u, o = new THREE.Object3D();
    // the train: a lead car, six middle cars and a tail car, white with a red line
    const WIN = [0.24, 0.29, 0.37], LINE = [0.86, 0.22, 0.24], BOG = 0.25;
    const carBody = len => [[bx(len, 2.5, 2.6, 0, 0.55, 0), 1.05], [bx(len - 0.4, 0.55, 2.62, 0, 1.75, 0), WIN], [bx(len + 0.02, 0.16, 2.64, 0, 1.2, 0), LINE], [bx(len - 0.6, 0.22, 2.0, 0, 3.05, 0), 0.86], [bx(2.2, 0.5, 2.2, len / 2 - 1.8, 0.05, 0), BOG], [bx(2.2, 0.5, 2.2, -len / 2 + 1.8, 0.05, 0), BOG]];
    const nose = (() => { const g = new THREE.BoxGeometry(4.2, 2.5, 2.6, 4, 1, 1); const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i) + 2.1, y = pa.getY(i), f = x / 4.2; if (y > 0) pa.setY(i, y - 2.2 * f * f); pa.setZ(i, pa.getZ(i) * (1 - 0.35 * f * f)); } g.translate(0, 1.8, 0); g.translate(3.4 + 2.1 - 2.1, 0, 0); g.computeVertexNormals(); return g; })();
    const endGeo = merge([...carBody(7.2).map(([g2, c]) => [g2.translate(-0.6, 0, 0), c]), [nose, 1.05], [bx(0.7, 0.4, 1.9, 2.5, 2.5, 0), WIN]]);
    const midGeo = merge(carBody(10));
    const trM = new THREE.MeshLambertMaterial({ color: '#F1F3F6', vertexColors: true });
    const ends = new THREE.InstancedMesh(endGeo, trM, 2), mids = new THREE.InstancedMesh(midGeo, trM, 6);
    ends.castShadow = mids.castShadow = true; ends.frustumCulled = mids.frustumCulled = false;
    scene.add(ends, mids);
    /* v69: a station hall over the far end of the viaduct; the train pulls into it instead of vanishing at the end of the track */
    const hall = grp(box(7.6, 6.4, 21, 'obj', 0, DY - 1.1, 0), box(8.2, 0.5, 21.6, 'objShade', 0, DY + 5.3, 0), box(4.6, 4.4, 0.2, 'objDark', 0, DY - 0.4, 10.52));
    hall.traverse(m => { if (m.isMesh) m.castShadow = true; });
    at(hall, HX, 0, tz(U1 - 1.5)); scene.add(hall);
    hsr = { ends, mids, HX, DY, U0, U1, tz, o };
  }
  function updateTrain(t) {
    if (!hsr) return;
    const { ends, mids, HX, DY, U0, U1, tz, o } = hsr;
    /* v69: each run starts and ends with the whole train hidden (the tail clears the station hall), so no car is dropped in view */
    const TAIL = 7 * 10.3 + 5, h0 = dir0 => dir0 > 0 ? U0 - 2 : U1 - 8, h1 = dir0 => dir0 > 0 ? U1 + TAIL + 3 : U0 - TAIL - 3;
    const V = 30, run = (U1 - U0 + TAIL + 1) / V, CYC = run + 6;
    const k = Math.floor(t / CYC), tt = t % CYC, f = tt / run;
    const dir = k % 2 ? -1 : 1; // +1 runs away from the camera
    const head = h0(dir) + (h1(dir) - h0(dir)) * Math.min(f, 1);
    let mi = 0;
    for (let i = 0; i < 8; i++) {
      const cu = head - dir * (i * 10.3 + 5);
      const inside = f <= 1 && cu > U0 + 4 && cu < U1 - 4;
      if (QA) { const q = (hsr.q = hsr.q || [])[i] || (hsr.q[i] = {}); if (cu < U1 - 12) qaPop('train', q, inside ? 1 : 0, HX, DY, tz(cu)); else q._qv = inside; }
      const yaw = (dir > 0 ? Math.PI / 2 : -Math.PI / 2) + (i === 7 ? Math.PI : 0);
      o.position.set(HX, DY, tz(cu)); o.rotation.set(0, yaw, 0); o.scale.setScalar(inside ? 1 : 0); o.updateMatrix();
      if (i === 0) ends.setMatrixAt(0, o.matrix); else if (i === 7) ends.setMatrixAt(1, o.matrix); else mids.setMatrixAt(mi++, o.matrix);
    }
    o.scale.setScalar(1);
    ends.instanceMatrix.needsUpdate = mids.instanceMatrix.needsUpdate = true;
  }

  /* ---------- v43: an air-ambulance helicopter on its own random routes, never following the drive ---------- */
  const heli = (() => {
    const g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(1.25, 14, 10), mat('obj')); body.scale.set(1.9, 1, 1); body.position.y = 0; g.add(body);
    const glass = mesh(new THREE.SphereGeometry(1.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('objDark')); glass.rotation.z = -Math.PI / 2; glass.scale.set(1, 1.2, 0.95); glass.position.set(1.5, 0.15, 0); g.add(glass);
    g.add(box(2.6, 0.32, 2.56, 'accent', -0.2, -0.35, 0));
    g.add(at(mesh(new THREE.CylinderGeometry(0.22, 0.38, 4.6, 8).rotateZ(Math.PI / 2), mat('obj')), -4.2, 0.35, 0));
    g.add(box(1.0, 1.6, 0.14, 'accent', -6.4, 0.2, 0));
    [-0.85, 0.85].forEach(z => { g.add(box(3.4, 0.1, 0.12, 'objDark', 0, -1.55, z)); g.add(box(0.1, 0.5, 0.1, 'objDark', 0.6, -1.5, z)); g.add(box(0.1, 0.5, 0.1, 'objDark', -0.8, -1.5, z)); });
    g.add(cyl(0.15, 0.15, 0.6, 'objDark', 0, 1.1, 0, 8));
    const rotor = grp(box(10, 0.06, 0.38, 'objDark', 0, 0, 0), box(0.38, 0.06, 10, 'objDark', 0, 0, 0)); rotor.position.y = 1.72; g.add(rotor);
    const tail = grp(box(0.06, 1.8, 0.24, 'objDark', 0, -0.9, 0), box(0.06, 0.24, 1.8, 'objDark', 0, -0.12, 0)); tail.position.set(-6.4, 0.9, 0.2); g.add(tail);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#E5484D' })); beacon.position.set(-6.4, 1.15, 0); g.add(beacon);
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    g.scale.setScalar(1.05); g.visible = false;
    scene.add(g);
    return { g, rotor, tail, beacon, f: null, wait: 2 + Math.random() * 6, yaw: 0 };
  })();
  function heliPlan(t, heroX) {
    const rnd = Math.random, cu = u => clamp(u, -40, 150);
    const mx = heroX + (rnd() - 0.4) * 100, mu = 5 + rnd() * 55;
    const th = (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 1.8; // any slant, mostly across the view
    const dx = Math.cos(th), du = Math.sin(th), Lh = 120 + rnd() * 70, bend = (rnd() - 0.5) * 80;
    const P = [[mx - dx * Lh, cu(mu - du * Lh)], [mx - du * bend, cu(mu + dx * bend)], [mx + dx * Lh, cu(mu + du * Lh)]];
    const v = 11 + rnd() * 6;
    return { t0: t, P, y0: 14 + rnd() * 8, y1: 14 + rnd() * 8, dur: 2 * Lh / v, hover: rnd() < 0.3 ? 3 + rnd() * 4 : 0, yaw0: th };
  }
  function updateHeli(t, heroX, still) {
    const H = heli, { g, rotor, tail } = H;
    const hdt = clamp(t - (H.lt === undefined ? t : H.lt), 0, 0.1); H.lt = t;
    if (still) { g.visible = false; return; }
    if (!H.f) {
      if (H.last === undefined) H.last = t;
      if (t - H.last < H.wait) { g.visible = false; return; }
      /* v69: it sets off only from somewhere out of sight */
      let f0 = null;
      for (let k = 0; k < 12 && !f0; k++) { const c = heliPlan(t, heroX), x = c.P[0][0], u = c.P[0][1]; if (!seen(x, c.y0, roadZ(x) - u, 8)) f0 = c; }
      if (!f0) { H.last = t; H.wait = 3; g.visible = false; return; }
      H.f = f0; H.yaw = null; H.out = null;
    }
    const f = H.f, e = t - f.t0, half = f.dur / 2;
    if (e > f.dur + f.hover) {
      /* v69: at the end of its route it keeps flying straight until it is out of sight, then lands */
      if (g.visible && (!H.out || e < f.dur + f.hover + 40) && seen(g.position.x, g.position.y, g.position.z, 8)) {
        if (!H.out) { const P = f.P[2], Q = f.P[1], dx = P[0] - Q[0], du = P[1] - Q[1], n = Math.hypot(dx, du) || 1, v = 2 * Math.hypot(P[0] - Q[0], P[1] - Q[1]) / f.dur || 12; H.out = { dx: dx / n * v, dz: -du / n * v }; }
        g.position.x += H.out.dx * hdt; g.position.z += H.out.dz * hdt;
        rotor.rotation.y = t * 21; tail.rotation.z = t * 30; H.beacon.visible = (t % 1.2) < 0.15;
        return;
      }
      H.f = null; H.out = null; H.last = t; H.wait = 10 + Math.random() * 30; g.visible = false; return;
    }
    const s = e < half ? e / f.dur : e < half + f.hover ? 0.5 : (e - f.hover) / f.dur;
    const B = (k, q) => (1 - q) * (1 - q) * f.P[0][k] + 2 * (1 - q) * q * f.P[1][k] + q * q * f.P[2][k];
    const x = B(0, s), u = B(1, s), z = roadZ(x) - u;
    const x2 = B(0, Math.min(1, s + 0.01)), u2 = B(1, Math.min(1, s + 0.01)), z2 = roadZ(x2) - u2;
    const want = Math.atan2(-(z2 - z), x2 - x);
    if (H.yaw === null) H.yaw = want;
    let d = want - H.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); H.yaw += d * 0.08;
    const y = lerp(f.y0, f.y1, s) + Math.sin(t * 0.5) * 0.8;
    g.visible = true; g.position.set(x, y, z);
    g.rotation.set(0, H.yaw, 0); g.rotateX(-clamp(d * 3, -0.25, 0.25)); g.rotateZ(e > half && e < half + f.hover ? -0.02 : -0.1);
    rotor.rotation.y = t * 21; tail.rotation.z = t * 30;
    H.beacon.visible = (t % 1.2) < 0.15;
  }

  life = buildLife(scene, { stops, height, regionAt, lite, xMin, xMax, cities, keepOut: (x, z) => cities.length ? cityKeepOut(cities, x, z) : false });

  /* ---------- perception layer ---------- */
  const sens = new THREE.Group(); scene.add(sens);
  const radarM = glowMat('radar', 0.22, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
  const fanGeo = (r, a) => { const g = new THREE.CircleGeometry(r, 32, -a / 2, a); g.rotateX(-Math.PI / 2); return g; };
  const radarFront = new THREE.Mesh(fanGeo(26, 0.42), radarM); radarFront.position.y = 0.25;
  const fanSoft = glowMat('radar', 0.12, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const radarWide = new THREE.Mesh(fanGeo(11, 1.6), fanSoft); radarWide.position.y = 0.22;
  const radarRear = new THREE.Mesh(fanGeo(9, 1.1), fanSoft); radarRear.rotation.y = Math.PI; radarRear.position.y = 0.22;
  radarWide.renderOrder = 3; radarRear.renderOrder = 3; radarFront.renderOrder = 4;
  let lockS = 0; const accC = new THREE.Color();
  const radar = grp(radarFront, radarWide, radarRear);
  const lidarRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), glowMat('lidar', 0.5, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
  lidarRing.position.y = 0.3;
  const lidar = grp(lidarRing);
  const hero = buildHero();
  scene.add(hero.group);
  sens.add(radar, lidar);

  // LiDAR point cloud: lights up as the scan ring passes
  const pts = [];
  for (let x = xMin - 20; x < xMax + 20; x += 0.7) {
    const z = roadZ(x);
    pts.push(x, 0.25, z + HALF + 0.3, x, 0.25, z - HALF - 0.3);
    if (R() < 0.5) pts.push(x, 0.8 + R() * 3, z + HALF + 3 + R() * 6, x, 0.8 + R() * 3, z - HALF - 3 - R() * 6);
  }
  Object.values(props).forEach(p => p.list.forEach(q => {
    if (p === props.container) return;
    for (let k = 0; k < 4; k++) pts.push(q.x + (R() - 0.5) * 4 * q.s, q.y + R() * 3 * q.s * Math.min(q.sy, 4), q.z + (R() - 0.5) * 4 * q.s);
  }));
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const pmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uHero: { value: new THREE.Vector3() }, uR: { value: 0 }, uColor: { value: new THREE.Color() }, uSize: { value: 3.2 } },
    vertexShader: `uniform vec3 uHero; uniform float uR; uniform float uSize; varying float vA;
      void main(){ float d = distance(position.xz, uHero.xz);
        float ring = exp(-pow((d-uR)/1.6,2.0)); float trail = (d<uR) ? 0.35*exp(-(uR-d)/6.0) : 0.0;
        vA = 0.5 * (ring + trail) * step(d, 34.0);
        vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = uSize*(60.0/-mv.z)*(0.6+vA); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ vec2 c = gl_PointCoord-0.5; if(dot(c,c)>0.25) discard; if(vA<0.02) discard; gl_FragColor = vec4(uColor, vA); }`
  });
  reg(pmat.uniforms.uColor, 'lidar', 'value');
  const cloud = new THREE.Points(pgeo, pmat); cloud.frustumCulled = false;
  scene.add(cloud);

  // vision boxes with tags
  const boxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const visMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
  reg(visMat, 'cobalt');
  const tagWords = ['VEH 98%', 'VEH 95%', 'VEH 99%', 'VEH 92%', 'PED 96%', '2W 93%', 'VEH 97%', 'TRK 94%'];
  const vis = [];
  for (let i = 0; i < 14; i++) {
    const bxl = new THREE.LineSegments(boxEdges, visMat); bxl.frustumCulled = false;
    const tg2 = label(tagWords[i % tagWords.length], { size: 22, key: 'cobalt', bg: 'card', scale: 0.5 });
    scene.add(bxl, tg2); vis.push({ box: bxl, tag: tg2 });
  }
  // radar fans on nearby robotaxis (Shanghai)
  const miniFan = new THREE.InstancedMesh(fanGeo(9, 0.5), glowMat('radar', 0.16, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }), 10); miniFan.frustumCulled = false; scene.add(miniFan);

  // V2X pulses and packets
  const v2x = [];
  const pulseM = glowMat('cobalt', 0.5);
  signals.forEach(s => {
    const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 32), pulseM.clone()); reg(r.material, 'cobalt'); r.position.copy(s.rsu); r.rotation.x = Math.PI / 2; scene.add(r); return r; });
    const pk = sph(0.22, glowMat('cobalt', 0.55), 0, 0, 0, 10); pk.castShadow = false; scene.add(pk);
    v2x.push({ s, rings, pk });
  });

  let mode = 'all';
  function setMode(m) { mode = m; }
  /* v55: in the down-the-road views only cars ahead of the hero get vision boxes */
  let aheadOnly = false, aheadW = 0;
  function setAhead(w) { aheadW = +w || 0; aheadOnly = aheadW > 0.3; }
  /* v69: nothing that drives appears, vanishes, shrinks or changes body while the camera can see it.
     road.js hands over the camera's view each frame; seen() says whether a spot is on screen and not lost in the haze. */
  let viewF = null, viewP = null, viewFar = 1e9;
  const viewS = new THREE.Sphere();
  function setView(f, p, far) { viewF = f; viewP = p; viewFar = far || 1e9; }
  function seen(x, y, z, r) {
    if (!viewF) return true;
    viewS.center.set(x, y, z); viewS.radius = r + 1.5;
    if (viewP && viewP.distanceTo(viewS.center) - viewS.radius > viewFar) return false;
    return viewF.intersectsSphere(viewS);
  }
  const QA = /[?&]qa\b/.test(location.search) ? { pops: {}, log: [] } : null;
  function qaPop(kind, o, sc, x, y, z) {
    if (!QA) return;
    const vis = sc > 0.9, was = o._qv === undefined ? vis : o._qv, ty = o.type;
    if ((vis !== was || (vis && o._qt !== undefined && o._qt !== ty)) && seen(x, y, z, 0)) { QA.pops[kind] = (QA.pops[kind] || 0) + 1; if (QA.log.length < 60) QA.log.push([kind, Math.round(x), Math.round(z), vis, ty]); }
    o._qv = vis; o._qt = ty;
  }
  const on = k => mode === 'all' || mode === k;

  /* ---------- per-frame ---------- */
  const tmpO = new THREE.Object3D(), tmpC = new THREE.Color();
  const byLane = { A: [], C: [], D: [] };
  let lidarT = 0;
  function laneDir(l) { return l === 'A' || l === 'B' ? 1 : -1; }
  function wrap(x) { return x < xMin ? x + L : x > xMax ? x - L : x; }

  /* v50: shared rules for everything that drives or rides along the road */
  const RLEN = 1.9;
  // how fast a mover may go so it stops before a red light or a crosswalk with people on it, at its own lateral spot
  function stopFor(x, d, len, zOff, half, vmax, t, red, cwOnly, lead, leadLen) {
    let cap = vmax;
    for (const s of signals) {
      if (cwOnly && !s.cw) continue;
      const line = d > 0 ? s.x + CW0 - 0.8 : s.x + CW1 + 0.8;
      const ahead = d * (line - x) - len / 2;
      if (red && !sigGreen(s, t) && ahead > 0.3 && ahead < 18) cap = Math.min(cap, vmax * clamp((ahead - 0.3) / 10, 0, 1));
      // keep the crosswalk clear: only cross the line if there is room for the whole vehicle beyond it
      if (s.cw && lead && ahead > 0.3 && ahead < 18) {
        const far = d > 0 ? s.x + CW1 : s.x + CW0, room = d * (lead.x - d * leadLen / 2 - far);
        if (room > -30 && room + (lead.v || 0) * 1.2 < len + 1.5) cap = Math.min(cap, vmax * clamp((ahead - 0.3) / 10, 0, 1));
      }
      // never drive into a person: anyone in your path on the crosswalk, ahead of your front, stops you
      if (s.cw) for (const o of s.occ) {
        // before the stop line, someone crossing toward your lane counts too; once committed, only someone in your lane
        if (Math.abs(o.z - zOff) >= half + (o.w && ahead > -0.2 ? 1.2 : 0.3)) continue;
        const dist = d * (o.x - (x + d * len / 2));
        if (dist > -0.4 && dist < 18) cap = Math.min(cap, vmax * clamp((dist - 1.2) / 8, 0, 1));
      }
    }
    for (const tx of topes) { const a = Math.abs(tx - x); if (a < 7) cap = Math.min(cap, vmax * (0.3 + a / 10)); }
    return cap;
  }
  // single file: each mover keeps a safe gap to the one ahead, brakes hard, and can never pass through it
  function runBand(arr, d, lenOf, cap, dt, ring, wrapF, g0, gs) {
    if (!arr.length) return;
    arr.sort((a, b) => d * (a.x - b.x));
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i]; if (c.ghost) continue;
      let lead = null;
      for (let j = 1; j < arr.length; j++) { const o = arr[(i + j) % arr.length]; if (o.ref !== c) { lead = o; break; } }
      let gap = Infinity, vd = c.vmax;
      if (lead) { gap = d * (lead.x - c.x); if (gap <= 0) gap += ring; gap -= (lenOf(lead) + lenOf(c)) / 2; vd = c.vmax * clamp((gap - g0) / gs, 0, 1); }
      c.gap = gap;
      vd = Math.min(vd, cap(c, lead));
      c.v += (vd - c.v) * Math.min(1, dt * (vd < c.v ? 12 : 2.2));
      let step = c.v * dt;
      if (lead && step > gap - 0.6) { step = Math.max(0, gap - 0.6); c.v = Math.min(c.v, lead.v || 0); }
      c.x = wrapF(c.x + d * step);
    }
  }
  const inBandB = o => o > LANES.B - 1.8 && o < LANES.B + 1.8;
  // what is inside a crosswalk right now, across the road: {z, half}
  // every vehicle near a crosswalk: lateral spot, half width, body span along the road, heading and speed
  function zoneUsers(s, heroX, heroV) {
    const a = s.x + CW0 - 24, b = s.x + CW1 + 24, out = [];
    const add = (x, l, z, h, d, v) => { if (x + l / 2 > a && x - l / 2 < b) out.push({ z, h, x0: x - l / 2, x1: x + l / 2, d, v: Math.abs(v) }); };
    cars.forEach(c => { if (c.show) add(c.x, LEN[c.type], c.z, 1.15, laneDir(c.lane), c.v); });
    riders.forEach(r => { if (r.show) add(r.x, RLEN, r.z, 0.4, r.dir, r.v); });
    scooters.forEach(q => add(q.x, 1.6, SCOOT_Z, 0.35, 1, q.v));
    add(heroX, 4.8, LANES.B, 1.15, heroV < 0 ? -1 : 1, heroV);
    return out;
  }
  // may a person step from lateral spot now to next, at x? not into a vehicle, nor in front of one that is coming
  function clearToStep(users, x, now, next) {
    for (const u of users) {
      const pad = u.h + 0.35;
      if (Math.abs(next - u.z) >= pad || Math.abs(now - u.z) < pad) continue;
      if (x > u.x0 - 0.5 && x < u.x1 + 0.5) { return false; }
      const front = u.d > 0 ? u.x1 : u.x0, dist = u.d * (x - front);
      if (dist > 0 && dist < u.v * 1.4 + (u.v > 0.5 ? 2 : 0.6)) { return false; }
    }
    return true;
  }
  function updatePeds(dt, t, heroX, heroV, still) {
    const D = 2 * PED_WAIT + 3 * PED_ROW;
    signals.forEach(s => {
      if (!s.grp) return;
      if (!still) {
        const cyc = (t + s.off) % CYCLE, cid = Math.floor((t + s.off) / CYCLE);
        const G1 = s.grp[1], G2 = s.grp[-1];
        // both groups set off together on the red, once the cars have had time to clear
        if (!G1.walk && !G2.walk && G1.cyc !== cid && cyc >= GREEN + 1.5 && cyc <= CYCLE - 6.4 && s.peds.every(p => Math.abs(p.dx - p.dxT) < 0.05)) {
          [G1, G2].forEach(G => { G.walk = true; G.cyc = cid; G.t0 = t; }); s.peds.forEach(p => { p.walk = true; p.d = 0; });
        }
        const heroNear = heroX > s.x + CW0 - 16 && heroX < s.x + CW1 + 6;
        const users = zoneUsers(s, heroX, heroV);
        [1, -1].forEach(g => {
          const G = s.grp[g]; if (!G.walk) return;
          const mem = s.peds.filter(p => p.g === g), qOf = p => G.n % 2 === 0 ? p.r : 3 - p.r;
          for (let col = 0; col < 4; col++) {
            const file = mem.filter(p => p.col === col).sort((a, b) => qOf(a) - qOf(b));
            file.forEach((p, k) => {
              if (!p.walk) return;
              const q = qOf(p);
              let step = t - G.t0 < q * 0.25 ? 0 : PED_V * dt;
              if (k > 0) step = Math.min(step, Math.max(0, file[k - 1].d + PED_ROW - 0.65 - p.d));
              const now = p.side * (PED_WAIT + q * PED_ROW) - p.side * p.d, next = now - p.side * step;
              if (heroNear && !inBandB(now) && inBandB(next)) step = 0;              // wait for the car you drive
              if (step > 0 && !clearToStep(users, s.x + p.dx, now, next)) step = 0;   // never step into or in front of a vehicle
              p.d = Math.min(D, p.d + step);
              if (p.d >= D) p.walk = false;
            });
          }
          if (mem.every(p => !p.walk)) { G.walk = false; G.n++; mem.forEach(p => { p.side = -p.side; p.d = 0; p.dxT = pedDX(p); }); }
        });
        // step sideways into the next half only once both groups have reached their curbs
        if (!s.grp[1].walk && !s.grp[-1].walk) s.peds.forEach(p => { p.dx = Math.abs(p.dxT - p.dx) < 0.05 ? p.dxT : p.dx + clamp(p.dxT - p.dx, -1.2 * dt, 1.2 * dt); });
      }
      s.occ.length = 0;
      s.peds.forEach(p => {
        const G = s.grp[p.g], q = G.n % 2 === 0 ? p.r : 3 - p.r;
        p.off = p.side * (PED_WAIT + q * PED_ROW) - p.side * p.d;
        if (Math.abs(p.off) < PED_WAIT - 0.1) s.occ.push({ z: p.off, x: s.x + p.dx, w: p.walk });
      });
    });
  }

  if (/[?&]qa\b/.test(location.search)) window.__wq = { cars, riders, scooters, peds, LEN, RLEN, SCOOT_Z, LANES, roadZ, nearBoundary, QA, seen };
  let decalDusk = null;
  function update(dt, t, heroX, heroV, still) {
    if (pedMesh) updatePeds(dt, t, heroX, heroV, still);
    const asiaW = w(RNG.asia, heroX, 20);
    /* traffic sim */
    if (!still) {
      /* v50: a car changes body, appears or disappears only at a region gate, where it is scaled down to nothing,
         and it appears only with room around it. Hidden cars keep driving so the lanes never freeze. */
      /* v69: a car takes on its new region's body, or leaves or joins the traffic, only once it is out of sight;
         a car the camera can see keeps the body it has until it drives out of the frame */
      cars.forEach(c => {
        const rg = regionAt(c.x);
        if (rg !== c.rg) {
          if (!c.show || !seen(c.x, 1.5, roadZ(c.x) + c.z, c.ml / 2)) {
            c.rg = rg; c.type = pickType(c.s1, rg);
            const want = c.s2 < (DENS[rg] || 0.5); if (!want) c.show = false; c.pend = want && !c.show;
          }
        }
        if (c.chg > 0) c.chg -= dt;
      });
      for (const k in byLane) byLane[k].length = 0;
      cars.forEach(c => { if (!c.show) return; byLane[c.lane].push(c); if (c.chg > 0 && c.from) byLane[c.from].push({ ghost: true, ref: c, x: c.x, v: c.v, ml: c.ml }); });
      cars.forEach(c => {
        if (!c.pend) return;
        if (c.rg !== regionAt(c.x)) { c.pend = false; return; }
        if (seen(c.x, 1.5, roadZ(c.x) + c.z, c.ml / 2)) return;
        if (byLane[c.lane].every(o => Math.abs(o.x - c.x) > (o.ml + c.ml) / 2 + 10)) { c.show = true; c.pend = false; c.v = c.vmax * 0.5; byLane[c.lane].push(c); }
      });
      cars.forEach(c => { if (!c.show) { c.x = wrap(c.x + laneDir(c.lane) * c.vmax * dt); c.v = c.vmax; } });
      for (const k in byLane) {
        const d = laneDir(k);
        runBand(byLane[k], d, o => o.ml, (c, ld) => stopFor(c.x, d, LEN[c.type], c.z, 1.15, c.vmax, t, true, false, ld, ld ? (ld.ml || LEN[ld.type]) : 0), dt, L, wrap, 2.5, 14);
      }
      // a slow car may change between the two far lanes, only into a clear gap, and it holds both lanes while it moves over
      ['C', 'D'].forEach(k => byLane[k].forEach(c => {
        if (c.ghost || c.chg > 0 || !(c.gap < 7) || c.v >= c.vmax * 0.5 || R() >= 0.01) return;
        const other = k === 'C' ? 'D' : 'C';
        if (byLane[other].every(o => Math.abs(o.x - c.x) > (o.ml + c.ml) / 2 + 6)) { c.from = k; c.lane = other; c.chg = 1.6; }
      }));
      cars.forEach(c => { c.z += (LANES[c.lane] - c.z) * Math.min(1, dt * 1.5); });
    }
    /* write instances */
    const counts = {}; TYPES.forEach(tp => counts[tp] = 0);
    let hc = 0, bc = 0;
    const dusk = tok('glow') !== '#000000';
    if (dusk !== decalDusk) { decalDusk = dusk; decalMats.forEach(m => m.color.set(m.userData.yellow ? (dusk ? '#9C7F3A' : '#E8B83A') : (dusk ? '#7F8894' : '#FFFFFF'))); }
    cars.forEach(c => {
      /* v69: every car drives at full size; it never shrinks at a gate or in front of the camera */
      if (QA) qaPop('car', c, c.show ? 1 : 0, c.x, 1.5, roadZ(c.x) + c.z);
      if (!c.show) return;
      const sc = 1;
      const d = laneDir(c.lane);
      const z = roadZ(c.x) + c.z;
      const yaw = -Math.atan(roadDZ(c.x)) + (d < 0 ? Math.PI : 0);
      tmpO.position.set(c.x, 0, z); tmpO.rotation.set(0, yaw, 0); tmpO.scale.setScalar(sc); tmpO.updateMatrix();
      const im = vmeshes[c.type], i = counts[c.type]++;
      im.setMatrixAt(i, tmpO.matrix);
      const crg = c.rg || regionAt(c.x);   // v69: the paint goes with the body, so it changes only out of sight
      const pal = PAL[crg] || PAL.us; const p = pal[(c.s3 * pal.length) | 0];
      let tint = p;
      if (c.type === 'bus' && crg === 'us') tint = [1.06, 0.86, 0.5];
      if (c.type === 'taxi') tint = crg === 'mexico' ? [1.04, 0.84, 0.9] : [0.75, 0.9, 1.0];
      if (EMERG[c.type]) {
        tint = [1, 1, 1];
        const cs = Math.cos(yaw), sn = Math.sin(yaw), on = Math.floor(t * 5 + c.s2 * 7) % 2;
        EMERG[c.type].forEach(([lx, ly, lz], j) => {
          if (bc >= 60) return;
          tmpO.position.set(c.x + (lx * cs + lz * sn) * sc, ly * sc, z + (-lx * sn + lz * cs) * sc); tmpO.rotation.set(0, yaw, 0); tmpO.scale.setScalar(sc); tmpO.updateMatrix();
          beacons.setMatrixAt(bc, tmpO.matrix);
          beacons.setColorAt(bc++, tmpC.copy(beamC[c.type][j]).multiplyScalar(j === on ? 1 : 0.28));
        });
        tmpO.scale.setScalar(1);
      }
      im.setColorAt(i, tmpC.setRGB(tint[0], tint[1], tint[2]));
      if (dusk && hc < N) {
        tmpO.position.set(c.x + Math.cos(yaw) * (LEN[c.type] / 2 + 0.05), 0.75, z - Math.sin(yaw) * (LEN[c.type] / 2 + 0.05));
        tmpO.rotation.set(0, yaw + Math.PI / 2, 0); tmpO.updateMatrix(); heads.setMatrixAt(hc++, tmpO.matrix);
      }
    });
    TYPES.forEach(tp => { const im = vmeshes[tp]; im.count = counts[tp]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
    heads.count = hc; heads.instanceMatrix.needsUpdate = true; headM.opacity = dusk ? 0.85 : 0;
    beacons.count = bc; beacons.instanceMatrix.needsUpdate = true; if (beacons.instanceColor) beacons.instanceColor.needsUpdate = true;

    /* elevated */
    if (elevated.mesh) {
      const { x0, x1, U, ey } = elevated;
      elevated.forEach((e, i) => {
        if (!still) e.s = (e.s + e.v * dt * (e.lane > 0 ? 1 : -1) + 1) % 1;
        /* v69: the loop runs on past both deck ends, down into the tunnel mouths and under the ground, at full size */
        const x = x0 - 6 + e.s * (x1 - x0 + 12), y = x < x0 ? -0.8 * (x0 - x) : x > x1 ? -0.8 * (x - x1) : ey(x);
        const sc = y > -2 ? 1 : 0;
        if (QA && y > -1.5) qaPop('elev', e, sc, x, y, roadZ(x) - U + e.lane);
        tmpO.position.set(x, y, roadZ(x) - U + e.lane); tmpO.rotation.set(0, e.lane > 0 ? 0 : Math.PI, 0); tmpO.scale.setScalar(sc * 0.9); tmpO.updateMatrix();
        elevated.mesh.setMatrixAt(i, tmpO.matrix); elevated.mesh.setColorAt(i, tmpC.setRGB(...e.tint));
      });
      elevated.mesh.instanceMatrix.needsUpdate = true; elevated.mesh.instanceColor.needsUpdate = true;
    }
    if (underGlow) underGlow.opacity = dusk ? 0.75 : 0;
    boards.forEach(b => { const k = 0.5 + 0.5 * Math.sin(t * 0.9 + b.ph); b.face.map = adTex[(b.i + ((t * 0.12 + b.ph) | 0)) % adTex.length]; b.face.color.setScalar(dusk ? 1.15 : 0.9 + 0.1 * k); });

    /* scooters + pedestrians */
    if (scootMesh) {
      const a0 = RNG.asia[0] + 4, a1 = RNG.asia[1] - 4, sl = a1 - a0;
      const wrapS = x => x > a1 ? x - sl : x < a0 ? x + sl : x;
      if (!still) runBand(scooters, 1, () => 1.6, (q, ld) => stopFor(q.x, 1, 1.6, SCOOT_Z, 0.35, q.vmax, t, true, false, ld, 1.6), dt, sl, wrapS, 0.9, 5);
      scooters.forEach((s, i) => {
        const x = s.x;
        const sc = clamp(Math.min(x - a0, a1 - x) / 6, 0, 1);
        if (QA) qaPop('scoot', s, sc, x, 1, roadZ(x) + SCOOT_Z);
        tmpO.position.set(x, 0.1, roadZ(x) + SCOOT_Z + Math.sin(t * 2 + s.wob) * 0.05);
        tmpO.rotation.set(0, -Math.atan(roadDZ(x)), 0); tmpO.scale.setScalar(sc); tmpO.updateMatrix();
        scootMesh.setMatrixAt(i, tmpO.matrix); scootMesh.setColorAt(i, tmpC.setRGB(...s.tint));
      });
      scootMesh.instanceMatrix.needsUpdate = true; scootMesh.instanceColor.needsUpdate = true;
      peds.forEach((p, i) => {
        const s = p.sig;
        tmpO.position.set(s.x + p.dx, 0.1, roadZ(s.x) + p.off); tmpO.rotation.set(0, 0, 0); tmpO.scale.setScalar(1); tmpO.updateMatrix();
        pedMesh.setMatrixAt(i, tmpO.matrix); pedMesh.setColorAt(i, tmpC.setRGB(...p.tint));
      });
      pedMesh.instanceMatrix.needsUpdate = true; pedMesh.instanceColor.needsUpdate = true;
    }
    signals.forEach(s => { const ph = sigPhase(s, t); if (ph !== s.ph) { s.ph = ph; s.lamps.forEach((l, i) => { l.material = i === ph ? lampOn[i] : lampOff; }); } });

    updateTrain(t); updateHeli(t, heroX, still);
    if (QA) qaPop('heli', heli, heli.g.visible ? 1 : 0, heli.g.position.x, heli.g.position.y, heli.g.position.z);
    if (life) life.update(dt, t, heroX, still, dusk);

    /* v41 riders */
    const rc = {}; RIDE.forEach(k => rc[k] = 0);
    if (!still) {
      const bands = {};
      /* v69: riders change, leave or join only out of sight. Sidewalk riders still keep off the stops' sidewalks,
         but one already in view rides on through at full size and leaves the frame like anyone else. */
      riders.forEach(r => {
        r.pend = false;
        const zz = roadZ(r.x) + r.z;
        if (r.show && seen(r.x, 1, zz, 1.2)) { (bands[r.band] = bands[r.band] || []).push(r); return; }
        const rg = regionAt(r.x);
        if (rg !== r.rg || !r.type) { const cast = RCAST[rg] || RCAST.us; r.rg = rg; r.type = pickRide(r.s1, r.path ? cast.path : cast.road); r.want = r.s2 < (RDENS[rg] || 0.5); }
        const blocked = r.path && nearStop(r.x) < 18;
        if (r.show && (!r.want || blocked)) r.show = false;
        r.pend = r.want && !blocked && !r.show && !seen(r.x, 1, zz, 1.2);
        if (r.show) (bands[r.band] = bands[r.band] || []).push(r); else { r.x = wrap(r.x + r.dir * r.vmax * dt); r.v = r.vmax; }
      });
      riders.forEach(r => { if (!r.pend) return; const b = bands[r.band] = bands[r.band] || []; if (b.every(o => Math.abs(o.x - r.x) > 7)) { r.show = true; r.v = r.vmax * 0.5; b.push(r); } });
      for (const k in bands) { const d = bands[k][0].dir; runBand(bands[k], d, () => RLEN, (r, ld) => stopFor(r.x, d, RLEN, r.z, 0.4, r.vmax, t, true, r.path, ld, RLEN), dt, L, wrap, 1.2, 6); }
    }
    for (const r of riders) {
      if (!r.show || !r.type) { if (QA) qaPop(r.path ? 'path' : 'moto', r, 0, r.x, 1, roadZ(r.x) + r.z); continue; }
      const k = 1;   // v69: full size always; see the rules above for when a rider may leave or join
      if (QA) qaPop(r.path ? 'path' : 'moto', r, k, r.x, 1, roadZ(r.x) + r.z);
      if (k <= 0.02) continue;
      const zz = roadZ(r.x) + r.z + (r.path ? Math.sin(t * 0.7 + r.ph) * 0.06 : 0);
      const yaw = -Math.atan(roadDZ(r.x)) + (r.dir < 0 ? Math.PI : 0);
      const lean = r.type === 'unicycle' ? Math.sin(t * 2.4 + r.ph) * 0.05 : 0;
      tmpO.position.set(r.x, r.path ? 0.08 : 0.03, zz); tmpO.rotation.set(lean, yaw, 0); tmpO.scale.setScalar(k * 1.2); tmpO.updateMatrix();
      const im = rideMesh[r.type], i = rc[r.type]++;
      im.setMatrixAt(i, tmpO.matrix); im.setColorAt(i, tmpC.setScalar(r.tint));
    }
    RIDE.forEach(k => { const im = rideMesh[k]; im.count = rc[k]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });

    /* hero */
    const hz = roadZ(heroX) + LANES.B, hyaw = -Math.atan(roadDZ(heroX));
    hero.group.position.set(heroX, 0, hz); hero.group.rotation.y = hyaw;
    hero.body.position.y = Math.sin(t * 9) * 0.02 * clamp(Math.abs(heroV) / 8, 0, 1);
    hero.brake.material.opacity = heroV < -1 ? 0.95 : 0.25;
    sens.position.set(heroX + Math.cos(hyaw) * 2.2, 0, hz - Math.sin(hyaw) * 2.2); sens.rotation.y = hyaw;

    /* radar: lock on the nearest lead in lane A */
    let lead = null, best = 30;
    cars.forEach(c => { if (!c.show || c.lane !== 'A') return; const d = c.x - heroX; if (d > 2 && d < best) { best = d; lead = c; } });
    radar.visible = on('radar');
    const lockT = lead ? clamp((30 - best) / 12, 0, 1) : 0;
    lockS += (lockT - lockS) * Math.min(1, dt * 3);
    radarM.color.set(tok('radar')).lerp(accC.set(tok('accent')), lockS);
    radarM.opacity = 0.13 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.1));
    /* lidar */
    lidar.visible = cloud.visible = on('lidar');
    if (!still) lidarT = (lidarT + dt / 5.5) % 1;
    const r = 2 + lidarT * 30;
    lidarRing.scale.setScalar(r); lidarRing.material.opacity = 0.22 * (1 - lidarT);
    pmat.uniforms.uHero.value.set(heroX, 0, hz); pmat.uniforms.uR.value = r;
    /* vision boxes */
    const visOn = on('vision');
    const rg = regionAt(heroX);
    const maxBoxes = { us: 3, mexico: 4, asia: 14, port: 4, now: 2 }[rg] || 3;
    const cands = [];
    if (visOn) {
      cars.forEach(c => { if (!c.show || (aheadOnly && c.x < heroX - 3)) return; const d = Math.abs(c.x - heroX); if (d < 40) cands.push({ d, x: c.x, z: roadZ(c.x) + c.z, l: LEN[c.type], h: c.type === 'bus' || c.type === 'semi' || c.type === 'fire' || c.type === 'ambulance' ? 3.2 : 2.1, w: 2.3, yaw: -Math.atan(roadDZ(c.x)) }); });
      if (asiaW > 0.5) {
        peds.forEach(p => { const x = p.sig.x + p.dx; if (Math.abs(x - heroX) < 34) cands.push({ d: Math.abs(x - heroX) + 3, x, z: null, ped: p, l: 0.9, h: 1.9, w: 0.9, yaw: 0 }); });
      }
      cands.sort((a, b) => a.d - b.d);
    }
    vis.forEach((v, i) => {
      const c = cands[i];
      const show = visOn && c && i < maxBoxes;
      v.box.visible = v.tag.visible = !!show;
      if (!show) return;
      let z = c.z;
      if (c.ped) { pedMesh.getMatrixAt(peds.indexOf(c.ped), tmpO.matrix); z = new THREE.Vector3().setFromMatrixPosition(tmpO.matrix).z; }
      v.box.position.set(c.x, c.h / 2 + 0.05, z); v.box.scale.set(c.l + 0.4, c.h + 0.2, c.w); v.box.rotation.y = c.yaw;
      v.tag.position.set(c.x, c.h + 1.1, z);
      if (c.ped) v.tag.userData.label.text !== 'PED 96%' && (v.tag.userData.label.text = 'PED 96%', v.tag.userData.label.draw());
    });
    /* mini radar on robotaxis in Shanghai */
    let mf = 0;
    if (on('radar') && asiaW > 0.3) {
      cars.forEach(c => {
        if (mf >= 10 || !c.show || c.type !== 'robotaxi' || Math.abs(c.x - heroX) > 45) return;
        const d = laneDir(c.lane), yaw = -Math.atan(roadDZ(c.x)) + (d < 0 ? Math.PI : 0);
        tmpO.position.set(c.x + Math.cos(yaw) * 2.3, 0.2, roadZ(c.x) + c.z - Math.sin(yaw) * 2.3); tmpO.rotation.set(0, yaw, 0); tmpO.scale.setScalar(1); tmpO.updateMatrix();
        miniFan.setMatrixAt(mf++, tmpO.matrix);
      });
    }
    miniFan.count = mf; miniFan.instanceMatrix.needsUpdate = true;
    /* V2X */
    const vOn = on('v2x');
    v2x.forEach(v => {
      const near = Math.abs(v.s.x - heroX) < 60;
      v.rings.forEach((r2, k) => {
        r2.visible = vOn && near;
        const f = ((t * 0.18 + k / 2) % 1);
        r2.visible = r2.visible && k < 2;
        r2.scale.setScalar(0.6 + f * 5); r2.material.opacity = 0.22 * (1 - f) * (1 - f);
      });
      const dd = Math.abs(v.s.x - heroX);
      v.pk.visible = vOn && dd < 34;
      if (v.pk.visible) {
        const f = (t * 0.22) % 1, a = v.s.rsu, b = new THREE.Vector3(heroX, 1.4, hz);
        const mid = a.clone().lerp(b, 0.5); mid.y += 6;
        const p1 = a.clone().lerp(mid, f), p2 = mid.clone().lerp(b, f);
        v.pk.position.copy(p1.lerp(p2, f));
      }
    });
  }

  return { update, setMode, setAhead, setView, setZoomTint, regionAt, height, lookoutY, hero };
}

/* ---------- vehicles ---------- */
const GLASS = [0.52, 0.6, 0.7], TIRE = 0.22, WHITE = 1.12, NAVY = [0.22, 0.27, 0.42], RED = [1.3, 0.3, 0.3], STEEL = [0.82, 0.84, 0.88];
export function vehicleGeo(t) {
  const wheels = (l, w) => [[bx(0.9, 0.7, 0.35, l / 2 - 1.0, 0, w / 2), TIRE], [bx(0.9, 0.7, 0.35, -l / 2 + 1.0, 0, w / 2), TIRE], [bx(0.9, 0.7, 0.35, l / 2 - 1.0, 0, -w / 2), TIRE], [bx(0.9, 0.7, 0.35, -l / 2 + 1.0, 0, -w / 2), TIRE]];
  switch (t) {
    case 'suv': return merge([[bx(4.9, 1.2, 2.1, 0, 0.35, 0), 1], [bx(3.3, 0.85, 1.9, -0.4, 1.55, 0), GLASS], [bx(3.2, 0.1, 1.95, -0.4, 2.4, 0), 1], ...wheels(4.9, 2.1)]);
    case 'pickup': return merge([[bx(5.8, 1.15, 2.2, 0, 0.4, 0), 1], [bx(2.2, 0.9, 2.0, 0.9, 1.55, 0), GLASS], [bx(2.2, 0.1, 2.05, 0.9, 2.45, 0), 1], [bx(2.6, 0.5, 0.15, -1.5, 1.55, 1.02), 0.9], [bx(2.6, 0.5, 0.15, -1.5, 1.55, -1.02), 0.9], ...wheels(5.8, 2.2)]);
    case 'compact': return merge([[bx(3.8, 0.85, 1.75, 0, 0.32, 0), 1], [bx(2.1, 0.7, 1.6, -0.2, 1.17, 0), GLASS], ...wheels(3.8, 1.75)]);
    case 'taxi': return merge([[bx(3.8, 0.85, 1.75, 0, 0.32, 0), 1], [bx(2.1, 0.7, 1.6, -0.2, 1.17, 0), GLASS], [bx(0.6, 0.3, 0.9, -0.2, 1.87, 0), 1.1], ...wheels(3.8, 1.75)]);
    case 'robotaxi': return merge([[bx(4.6, 0.9, 1.95, 0, 0.32, 0), 1], [bx(2.7, 0.75, 1.8, -0.2, 1.22, 0), GLASS], [cy(0.35, 0.35, 0.35, -0.1, 1.97, 0, 10), 0.4], ...wheels(4.6, 1.95)]);
    case 'bus': return merge([[bx(10, 2.4, 2.5, 0, 0.4, 0), 1], [bx(8.6, 0.8, 2.52, -0.3, 1.8, 0), GLASS], [bx(10, 0.15, 2.5, 0, 2.8, 0), 0.9], ...wheels(10, 2.5)]);
    case 'semi': return merge([[bx(2.6, 2.4, 2.4, 5.0, 0.45, 0), 1.0], [bx(0.4, 1.0, 2.2, 6.35, 1.6, 0), GLASS], [bx(9.4, 2.8, 2.55, -1.3, 0.75, 0), 0.92], [bx(9.4, 0.6, 0.6, -1.3, 0.2, 0), TIRE], ...wheels(12.5, 2.4)]);
    case 'van': return merge([[bx(5.2, 2.0, 2.1, 0, 0.35, 0), 1], [bx(1.0, 0.8, 1.95, 2.1, 1.35, 0), GLASS], ...wheels(5.2, 2.1)]);
    case 'police': return merge([[bx(4.8, 0.85, 1.95, 0, 0.32, 0), WHITE], [bx(4.82, 0.42, 1.99, 0, 0.36, 0), NAVY], [bx(2.5, 0.72, 1.8, -0.25, 1.17, 0), GLASS], [bx(2.4, 0.08, 1.85, -0.25, 1.89, 0), WHITE], [bx(0.5, 0.12, 1.5, -0.25, 1.97, 0), 0.3], [bx(0.2, 0.5, 2.0, 2.35, 0.32, 0), 0.3], ...wheels(4.8, 1.95)]);
    case 'ambulance': return merge([[bx(3.9, 2.3, 2.2, -0.95, 0.35, 0), WHITE], [bx(3.92, 0.32, 2.24, -0.95, 1.2, 0), RED], [bx(2.0, 1.3, 2.05, 1.95, 0.35, 0), WHITE], [bx(0.9, 0.6, 1.9, 2.15, 1.65, 0), GLASS], [bx(0.5, 0.5, 0.06, -1.6, 1.85, 1.11), RED], [bx(0.5, 0.5, 0.06, -1.6, 1.85, -1.11), RED], ...wheels(6, 2.2)]);
    case 'fire': return merge([[bx(8.6, 2.0, 2.4, 0, 0.45, 0), RED], [bx(8.62, 0.18, 2.44, 0, 1.05, 0), WHITE], [bx(1.9, 0.75, 2.3, 3.3, 1.7, 0), GLASS], [bx(1.9, 0.12, 2.36, 3.3, 2.45, 0), RED], [bx(5.6, 0.18, 0.9, -1.2, 2.55, 0), STEEL], [bx(5.6, 0.32, 0.08, -1.2, 2.55, 0.45), STEEL], [bx(5.6, 0.32, 0.08, -1.2, 2.55, -0.45), STEEL], [bx(1.4, 0.6, 2.42, -3.5, 0.9, 0), 0.6], ...wheels(8.6, 2.4), [bx(0.9, 0.7, 0.35, 1.0, 0, 1.2), TIRE], [bx(0.9, 0.7, 0.35, 1.0, 0, -1.2), TIRE]]);
    default: return merge([[bx(4.6, 0.85, 1.95, 0, 0.32, 0), 1], [bx(2.5, 0.72, 1.8, -0.25, 1.17, 0), GLASS], ...wheels(4.6, 1.95)]);
  }
}

/* v41: low-poly two-wheelers and personal movers, each with its rider, facing +x */
function riderGeo(t) {
  const wheel = (x, r, wd) => [new THREE.CylinderGeometry(r, r, wd, 10).rotateX(Math.PI / 2).translate(x, r, 0), TIRE];
  const JACKET = [0.42, 0.47, 0.56], SKIN = [0.95, 0.82, 0.7], HELM = 1.12, PANTS = 0.38;
  const seated = (x, y) => [[bx(0.55, 0.22, 0.42, x - 0.05, y, 0), PANTS], [cy(0.2, 0.24, 0.62, x - 0.1, y + 0.2, 0, 8), JACKET], [bx(0.5, 0.12, 0.12, x + 0.18, y + 0.62, 0.14), JACKET], [bx(0.5, 0.12, 0.12, x + 0.18, y + 0.62, -0.14), JACKET], [new THREE.SphereGeometry(0.21, 10, 8).translate(x - 0.08, y + 1.02, 0), HELM]];
  const standing = (x, y) => [[cy(0.09, 0.1, 0.78, x, y, 0.1, 6), PANTS], [cy(0.09, 0.1, 0.78, x, y, -0.1, 6), PANTS], [cy(0.17, 0.2, 0.62, x, y + 0.76, 0, 8), JACKET], [bx(0.42, 0.1, 0.1, x + 0.2, y + 1.15, 0.14), JACKET], [bx(0.42, 0.1, 0.1, x + 0.2, y + 1.15, -0.14), JACKET], [new THREE.SphereGeometry(0.17, 10, 8).translate(x, y + 1.6, 0), SKIN]];
  switch (t) {
    case 'motorcycle': return merge([wheel(0.75, 0.34, 0.16), wheel(-0.72, 0.34, 0.2), [bx(1.25, 0.32, 0.32, 0, 0.42, 0), 1], [bx(0.6, 0.26, 0.36, 0.2, 0.74, 0), 1], [bx(0.62, 0.12, 0.3, -0.38, 0.74, 0), 0.3], [bx(0.08, 0.08, 0.7, 0.62, 1.12, 0), 0.3], [cy(0.04, 0.04, 0.55, 0.68, 0.58, 0, 6), 0.4], ...seated(-0.25, 0.86)]);
    case 'moped': return merge([wheel(0.62, 0.26, 0.14), wheel(-0.58, 0.26, 0.16), [bx(1.15, 0.2, 0.36, 0, 0.32, 0), 1], [bx(0.16, 0.72, 0.44, 0.55, 0.32, 0), 1], [bx(0.6, 0.3, 0.42, -0.35, 0.52, 0), 1], [bx(0.5, 0.1, 0.32, -0.32, 0.82, 0), 0.3], [bx(0.06, 0.06, 0.62, 0.6, 1.08, 0), 0.3], ...seated(-0.3, 0.92)]);
    case 'escooter': return merge([wheel(0.48, 0.13, 0.1), wheel(-0.46, 0.13, 0.1), [bx(0.95, 0.07, 0.22, 0, 0.16, 0), 0.32], [cy(0.035, 0.035, 0.98, 0.52, 0.2, 0, 6), 0.32], [bx(0.06, 0.06, 0.5, 0.52, 1.18, 0), 0.32], ...standing(-0.05, 0.23)]);
    case 'kick': return merge([wheel(0.4, 0.1, 0.08), wheel(-0.4, 0.1, 0.08), [bx(0.82, 0.05, 0.16, 0, 0.12, 0), 1], [cy(0.03, 0.03, 0.95, 0.44, 0.15, 0, 6), 0.8], [bx(0.05, 0.05, 0.44, 0.44, 1.1, 0), 0.3], ...standing(-0.08, 0.17)]);
    default: return merge([wheel(0, 0.32, 0.18), [bx(0.5, 0.5, 0.3, 0, 0.18, 0), 0.3], [bx(0.2, 0.05, 0.16, 0, 0.3, 0.2), 0.3], [bx(0.2, 0.05, 0.16, 0, 0.3, -0.2), 0.3], [cy(0.09, 0.1, 0.8, 0, 0.35, 0.2, 6), PANTS], [cy(0.09, 0.1, 0.8, 0, 0.35, -0.2, 6), PANTS], [cy(0.17, 0.2, 0.62, 0, 1.13, 0, 8), JACKET], [new THREE.SphereGeometry(0.17, 10, 8).translate(0, 1.97, 0), SKIN]]);
  }
}

/* The hero car: Marcin's, amber, drives with the camera the whole way. */
function buildHero() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const paint = ownMat('accent');
  const dark = mat('objDark');
  const glass = ownMat('glass');
  body.add(at(mesh(new THREE.BoxGeometry(4.8, 0.9, 2.05), paint), 0, 0.77, 0));
  body.add(at(mesh(new THREE.BoxGeometry(2.6, 0.72, 1.85), glass), -0.3, 1.55, 0));
  body.add(at(mesh(new THREE.BoxGeometry(2.4, 0.08, 1.9), paint), -0.3, 1.95, 0));
  [[1.5, 1], [-1.5, 1], [1.5, -1], [-1.5, -1]].forEach(([x, s]) => body.add(at(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16).rotateX(Math.PI / 2), dark), x, 0.42, s * 1.02)));
  const brake = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.22), new THREE.MeshBasicMaterial({ color: '#E5484D', transparent: true, opacity: 0.3 }));
  brake.position.set(-2.41, 1.0, 0); brake.rotation.y = -Math.PI / 2; body.add(brake);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.05, 48).rotateX(-Math.PI / 2), glowMat('accent', 0.55));
  ring.position.y = 0.06; ring.scale.set(1.25, 1, 0.85); g.add(ring);
  g.add(body);
  return { group: g, body, brake };
}
