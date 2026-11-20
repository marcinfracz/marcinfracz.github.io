/* Drive mode v3, Phase C: the City Chase, rebuilt on the open-world network. A Just play game.
   Same contract as the v1 chase (createChase(api) returns start, stop, update, active), plus api.net
   (and api.routes / api.map when drive-next.js has them). The Deck Demander is a generic cartoon
   manager in a beige sedan; he drives the streets, ramps, decks and bridges by A* and never cuts through
   a building, a pier or water. Pickups wait across the network. Nothing appears or vanishes in view:
   everything is placed where the camera cannot see it, and a catch is soft. Pure play: no career content. */
import { createRoutes } from './route-next.js?v=2';

/* pickup spots: off the main road on side streets, decks, ramps and both ends of the bridges (NPC-free,
   checked against the town's moving cars and people), plus a few in the hero lane of the main road */
const ANCHORS = [[148,0.1,-15],[143.2,0.1,-63.3],[152,0.1,-101.6],[187.8,0.1,-108.2],[217.7,0.1,-113.2],[248,0.1,-111.3],[278,0.1,-106.5],
  [166,0.1,-125.8],[198,0.1,-133.4],[246,0.1,-130.4],[276,0.1,-124.3],[209.8,0.1,-128.4],[183,0.1,-101],[179.8,0.1,-131],[160.8,0.1,41.4],
  [209,0.1,32],[259.4,0.1,34.4],[191,0.1,32],[220,0.1,31],[136,5.8,36],[136,5.8,-2],[136,5.8,-40],[136,6,-80],[136,5.8,-115],[136,5.5,-140],
  [116.8,2.4,-10.3],[116,2.2,19.6],[704,0.1,-24],[710.5,0.1,-40],[624,0.1,-148],[690,0.1,-139],[708,0.1,-138],[600,0.1,35],[648,0.1,40],[726,0.1,44],
  [808,0.1,-37],[838,0.1,-40],[898,0.1,-48],[916,0.1,-48],[885,7,-146],[862,0.1,-24],[894,0,-24],[894,1,-60],[894,9.8,-102],[894,15.2,-138],
  [850,0.1,-146],[898,17.1,-152],[922,6.6,-152],[904,2.5,-74],[934,0.1,-74],[958,0.1,-75],[1066,0.1,-41],[1096,0.1,-38],[1019.5,0.1,-163],
  [932,0.1,-23],[931,0.1,-65],[1065,0.1,-145],[1095,0.1,-144],[1061,0.1,-68],[1079,0.1,-66],[933.5,4.5,16.5],[933.5,1.6,57.5],
  [1359,0.1,-109],[1261,0.1,-130],[1257,0.1,-126],[1259,6.2,19.7],[1259,6.6,-2.3],[1259,8.6,-60],[1259,6.7,-82.3],[1236,1.5,13.4],[1235.4,1.4,-12.6]];
const LANE_B = 5.7;
const MAIN_X = [40, 110, 300, 370, 440, 510, 580, 1140, 1190, 1420, 1490, 1560, 1630, 1700];

export function createChase(api) {
  const {
    THREE, scene, camera, car, roadZ, net,
    xMin = 6, xMax = 1850, stops = [], slow, boost, hud,
    calm = () => false, pauseStories, exit, theme = () => 'day', TOKENS = {}
  } = api || {};
  const map = api.map || null;
  const routes = api.routes || createRoutes({ net, roadZ, xLo: xMin, xHi: xMax });
  const links = api.links || {};
  const RESUME = links.resume || 'assets/resume.pdf', CONTACT = links.contact || 'index.html#contact';
  const ROUND = 90, TARGET = 6, SPARE = 3, HIDE_R = 222, LS = 'mf-chase-v1';
  let active = false, ended = false, won = false;
  const skillsOn = !!api.skills, SKILLS = (api.skillLabels || []).slice(); let skillAt = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let qaNoChase = false;   // QA only: the pickup course without the chaser
  let avgV = 12, lastCar = null, timeLeft = ROUND, collected = 0, score = 0, elapsed = 0, tossIn = 7;
  let best = 0; try { best = parseInt(localStorage.getItem(LS) || '0', 10) || 0; } catch (e) {}
  let chaser = null, pickups = [], decks = [], arrow = null, hudEl = null, endEl = null, tintEl = null;
  let shieldOn = false, arrowUntil = 0;
  const log = { spawns: [], minSolid: 99, wet: 0, kinds: new Set(), ratios: [], replans: 0, caught: false, picks: [] };

  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), tmp = new THREE.Vector3();
  function viewOf(x, y, z) {
    tmp.set(x, y, z); const d = tmp.distanceTo(camera.position);
    camera.updateMatrixWorld(); pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    return { d, inView: frustum.containsPoint(tmp) };
  }
  const unseen = (x, y, z) => { const v = viewOf(x, y, z); return v.d > HIDE_R || !v.inView; };
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const surfY = (x, z, y) => { const s = net.surface(x, z, y); return s ? s.y : net.ground(x, z); };

  /* ---------- meshes: procedural, generic ---------- */
  function makeSedan() {
    const g = new THREE.Group(), bodyMat = lam('#C8B48A');
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.9), bodyMat); body.position.y = 0.85; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.7), bodyMat); cabin.position.set(-0.3, 1.7, 0); g.add(cabin);
    const wm = lam('#1A1F26');
    for (const [x, z] of [[-1.4, 0.85], [-1.4, -0.85], [1.4, 0.85], [1.4, -0.85]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 10), wm); w.rotation.x = Math.PI / 2; w.position.set(x, 0.38, z); g.add(w); }
    // a cartoon manager through the open roof, holding a generic slide (white card, three bars); arms at his sides
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), lam('#E8C4A0')); head.position.set(-0.2, 2.75, 0); g.add(head);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.7), lam('#2C333D')); torso.position.set(-0.2, 2.2, 0); g.add(torso);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.75), lam('#F4F1EA')); deck.position.set(0.25, 2.35, 0.1); g.add(deck);
    const bm = lam('#4A5562'); [0.14, 0.26, 0.19].forEach((h, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.1), bm); b.position.set(0.29, 2.15 + h / 2, -0.1 + i * 0.16); g.add(b); });
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }
  const PCOL = { boost: '#F2B456', clarity: '#2FA36B', track: '#2563EB' };
  function makePickup(type, special) {
    const g = new THREE.Group(), color = PCOL[type];
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.2, 16), lam(color)); base.position.y = 0.1; g.add(base);
    const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshLambertMaterial({ color: '#FFFFFF', emissive: color, emissiveIntensity: special ? 0.75 : 0.35 }));
    top.position.y = 1.0; g.add(top);
    if (special) { const glow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; g.add(glow); }
    g.userData.top = top; return g;
  }
  function makeDeck() {
    const g = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.12), lam('#F4F1EA')); slide.position.y = 0.75; g.add(slide);
    const bm = lam('#4A5562'); [0.35, 0.55, 0.42, 0.28].forEach((h, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.06), bm); b.position.set(-0.45 + i * 0.3, 0.38 + h / 2, 0.09); g.add(b); });
    g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
  }
  function makeArrow() {
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: '#F2B456', transparent: true, opacity: 0, depthTest: false });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.6), mat); shaft.position.z = -0.8; g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 10), mat); head.rotation.x = -Math.PI / 2; head.position.z = -1.9; g.add(head);
    g.renderOrder = 10; g.userData.mat = mat; return g;
  }

  /* ---------- HUD and end screen ---------- */
  function setupHUD() {
    if (hudEl) return;
    hudEl = document.createElement('div'); hudEl.className = 'chase-hud cn-hud';
    hudEl.innerHTML = `<div class="chase-panel"><span class="cn-mode">City Chase</span><span class="chase-time">1:30</span><span class="chase-picks">AI 0 / ${TARGET}</span><span class="chase-best">Best ${best}</span><span class="chase-note" aria-live="polite"></span></div>`;
    (hud || document.body).appendChild(hudEl);
  }
  let noteT = 0;
  function note(txt) { if (!hudEl) return; const n = hudEl.querySelector('.chase-note'); n.textContent = txt; n.classList.add('on'); noteT = 2.4; }
  function updateHUD(dt) {
    if (!hudEl) return;
    const s = Math.ceil(timeLeft), te = hudEl.querySelector('.chase-time');
    te.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; te.classList.toggle('low', timeLeft < 15);
    hudEl.querySelector('.chase-picks').textContent = `AI ${collected} / ${TARGET}`;
    if (noteT > 0) { noteT -= dt; if (noteT <= 0) hudEl.querySelector('.chase-note').classList.remove('on'); }
  }
  function showEnd() {
    if (endEl) endEl.remove();
    endEl = document.createElement('div'); endEl.className = 'chase-end cn-end'; endEl.setAttribute('role', 'dialog'); endEl.setAttribute('aria-label', 'Chase result');
    const got = pickups.filter(p => p.got && p.skill).map(p => p.skill);
    const routeLine = log.kinds.has('bridge') || log.kinds.has('elev') || log.kinds.has('ramp') ? 'The Deck Demander followed you up onto the decks.' : 'The Deck Demander kept to the streets.';
    endEl.innerHTML = `<div class="chase-end-panel">
        <p class="cn-kick">City Chase</p>
        <h2>${won ? 'You made it.' : (timeLeft <= 0 ? 'Time is up.' : 'Deck time.')}</h2>
        <p class="chase-score">${score}</p>
        <p class="chase-sub">${collected} of ${TARGET} pickups · Best ${best}</p>
        <p class="chase-msg">${won ? 'Less deck, more doing.' : 'The deck caught up. Try again.'}</p>
        <p class="cn-route">${routeLine}</p>${skillsOn && got.length ? `<p class="cn-kick">What you picked up</p><p class="cn-chips">${got.map(k => `<span>${esc(k)}</span>`).join('')}</p>` : ''}
        <div class="chase-btns"><button type="button" class="chase-again">Play again</button><button type="button" class="chase-free">Free play</button></div>
        <p class="chase-links"><a href="${RESUME}" target="_blank" rel="noopener">Resume</a> · <a href="${CONTACT}">Contact</a></p>
      </div>`;
    document.body.appendChild(endEl);
    endEl.querySelector('.chase-again').onclick = () => { if (api.again) api.again(); else { stop(); start(); } };
    endEl.querySelector('.chase-free').onclick = () => { if (api.free) api.free(); else { stop(); if (exit) exit(); } };
    endEl.querySelector('.chase-again').focus();
  }
  function showTint() {
    if (calm()) return;
    if (tintEl) tintEl.remove();
    tintEl = document.createElement('div'); tintEl.className = 'chase-tint'; tintEl.textContent = 'Deck time!'; document.body.appendChild(tintEl);
    setTimeout(() => { if (tintEl) { tintEl.remove(); tintEl = null; } }, 1400);
  }

  /* ---------- placing things where the camera cannot see them ---------- */
  function spotY(a) { const s = net.surfaces(a[0], a[2]); let y = s[0].y, bd = Math.abs(s[0].y - a[1]); s.forEach(q => { if (Math.abs(q.y - a[1]) < bd) { bd = Math.abs(q.y - a[1]); y = q.y; } }); return y; }
  function addPickup(x, y, z, type, special, why) {
    const mesh = makePickup(type, special); mesh.position.set(x, y, z); scene.add(mesh);
    const v = viewOf(x, y + 1, z); log.spawns.push({ what: 'pickup', d: +v.d.toFixed(1), inView: v.inView && v.d <= HIDE_R, why });
    // skill labels are off by default (City Chase is pure play); api.skills = true restores the handover's skill chips
    const skill = skillsOn && SKILLS.length ? SKILLS[(skillAt++) % SKILLS.length] : null;
    pickups.push({ mesh, x, y, z, type, special, skill, value: special ? 200 : 100, got: false, gone: 0 });
  }
  function spawnPickups() {
    const here = { x: car.x, z: car.z, y: car.y };
    const pool = ANCHORS.map(a => ({ x: a[0], y: spotY(a), z: a[2], main: false }))
      .concat(MAIN_X.map(x => ({ x, y: net.ground(x, roadZ(x) + LANE_B), z: roadZ(x) + LANE_B, main: true })));
    // reachable, not too close, not in view; ranked by the drive there
    const cand = [], ahead = car.x + 900 < xMax ? 1 : -1;   // the chaser comes from behind: pickups lie ahead and to the sides
    pool.forEach(p => {
      if (p.x < xMin + 10 || p.x > xMax - 20) return;
      if ((p.x - car.x) * ahead < -25) return;
      if (Math.hypot(p.x - car.x, p.z - car.z) < 45 || !unseen(p.x, p.y + 1, p.z)) return;
      if (api.laneDist && api.laneDist(p.x, p.z, p.y) < 3.5) return;   // clear of the town's cars and walkers
      const nd = routes.nearest(p.x, p.z, p.y); if (!nd || Math.hypot(nd.x - p.x, nd.z - p.z) > 4 || Math.abs(nd.y - p.y) > 1) return;   // on the drivable network
      const r = routes.route(here, nd); if (!r || r.len > 1100) return;
      cand.push(Object.assign(p, { len: r.len }));
    });
    cand.sort((a, b) => a.len - b.len);
    // a trail: the first is the nearest drive, each next one the closest spot to the last, at least 45 m apart, at most 4 on the main road
    const pick = []; let mains = 0, cur = cand[0];
    if (cur) { pick.push(cur); if (cur.main) mains++; }
    while (cur && pick.length < TARGET + SPARE) {
      let nx = null, nd = 1e9;
      for (const c of cand) {
        if (pick.includes(c) || (c.main && mains >= 4)) continue;
        if (pick.some(q => Math.hypot(q.x - c.x, q.z - c.z) < 45)) continue;
        const d = Math.hypot(c.x - cur.x, c.z - cur.z) + Math.abs(c.y - cur.y) * 8;
        if (d < nd) { nd = d; nx = c; }
      }
      if (!nx) break;
      pick.push(nx); if (nx.main) mains++; cur = nx;
    }
    const types = ['boost', 'clarity', 'track', 'boost', 'clarity', 'track', 'boost', 'track', 'clarity', 'boost'];
    // the double-value pickup: near Mexico or Shanghai when one is in range
    const sp = stops.filter(s => s.id === 'mexico' || s.id === 'shanghai').map(s => s.x);
    let specialAt = -1, sd = 1e9; pick.forEach((p, i) => sp.forEach(x => { const d = Math.abs(p.x - x); if (d < 90 && d < sd) { sd = d; specialAt = i; } }));
    pick.forEach((p, i) => addPickup(p.x, p.y, p.z, types[i % types.length], i === specialAt, p.main ? 'main' : 'net'));
    log.picks = pick.map(p => ({ x: p.x, z: p.z, y: +p.y.toFixed(2), len: Math.round(p.len), main: p.main }));
  }
  function addDeck(x, y, z, yaw) {
    const mesh = makeDeck(); mesh.position.set(x, y, z); mesh.rotation.y = yaw || 0; scene.add(mesh);
    const d = { mesh, x, y, z, hit: false, fall: 0, fly: null }; decks.push(d); return d;
  }
  function spawnDecks() {
    // a few generic slide decks on the way, on the network between the pickups, never in view
    let n = 0;
    for (let i = 0; i < pickups.length - 1 && n < 6; i += 2) {
      const a = pickups[i], b = pickups[i + 1];
      const r = routes.route({ x: a.x, z: a.z, y: a.y }, { x: b.x, z: b.z, y: b.y }); if (!r || r.pts.length < 6) continue;
      const q = r.pts[r.pts.length >> 1], q2 = r.pts[(r.pts.length >> 1) + 1] || q;
      if (!unseen(q.x, q.y + 1, q.z) || viewOf(q.x, q.y + 1, q.z).d < 60) continue;
      addDeck(q.x, q.y, q.z, Math.atan2(q2.x - q.x, q2.z - q.z)); n++;
      log.spawns.push({ what: 'deck', d: +viewOf(q.x, q.y + 1, q.z).d.toFixed(1), inView: false });
    }
  }
  // the chaser tosses a deck that lands ahead of you; it flies from his hands, it never appears
  function tossDeck() {
    const fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw), ahead = 16 + Math.abs(car.v) * 1.0;
    const tx = car.x + fx * ahead, tz = car.z + fz * ahead;
    const s = net.surface(tx, tz, car.y, car.surf && car.surf.edge); if (!s || s.kind === 'water') return;
    if (routes.solidGap(tx, tz, s.y) < 1) return;
    const p = chaser.g.position;
    const d = addDeck(p.x, p.y + 2.6, p.z, car.yaw);
    d.fly = { x0: p.x, z0: p.z, y0: p.y + 2.6, x1: tx, z1: tz, y1: s.y, k: 0 }; d.x = tx; d.z = tz; d.y = s.y;
  }

  /* ---------- the chaser: A* on the network, then straight in when the way is clear ---------- */
  function spawnChaser() {
    const back = car.x + 900 < xMax ? -1 : 1;
    let node = null;
    for (let off = HIDE_R + 40; off < HIDE_R + 400 && !node; off += 30) {
      const x = car.x + back * off; if (x < xMin + 2 || x > xMax - 2) continue;
      const m = routes.mainAt(x); if (unseen(m.x, m.y + 1.5, m.z)) node = m;
    }
    if (!node) { const x = car.x + back * (HIDE_R + 40); node = routes.mainAt(Math.max(xMin + 2, Math.min(xMax - 2, x))); }   // always behind you
    const g = makeSedan(); g.position.set(node.x, node.y, node.z); scene.add(g);
    const v = viewOf(node.x, node.y + 1.5, node.z); log.spawns.push({ what: 'chaser', d: +v.d.toFixed(1), inView: v.inView && v.d <= HIDE_R });
    chaser = { g, x: node.x, y: node.y, z: node.z, yaw: 0, v: 0, path: null, k: 0, plan: 0, direct: false, node, lastLevel: 0 };
  }
  const levelOf = (y, x, z) => (y > net.ground(x, z) + 1.5 ? 1 : 0);
  function replan() {
    const c = chaser, from = routes.nearest(c.x, c.z, c.y), to = routes.nearest(car.x, car.z, car.y);
    const r = routes.route(from, to); log.replans++;
    if (!r) return;
    c.path = r.pts; c.k = 0;
    if (c.path.length > 1 && Math.hypot(c.path[1].x - c.x, c.path[1].z - c.z) < Math.hypot(c.path[1].x - c.path[0].x, c.path[1].z - c.path[0].z)) c.k = 1;   // never back up to a node already passed
    const sl = Math.hypot(to.x - from.x, to.z - from.z);
    if (sl > 30) log.ratios.push(r.len / sl);
  }
  function updateChaser(dt) {
    const c = chaser; if (!c || qaNoChase) return;
    const keen = elapsed > 40 || collected >= 4;
    const dist = Math.hypot(car.x - c.x, car.z - c.z), dy = Math.abs(car.y - c.y);
    if (lastCar) { const rv = Math.hypot(car.x - lastCar.x, car.z - lastCar.z) / Math.max(dt, 1e-3); avgV += (Math.min(rv, 35) - avgV) * Math.min(1, dt / 4); }
    lastCar = { x: car.x, z: car.z };
    // he plans by the network; if you change level (a ramp, a deck) far from him, he loses track for a while
    c.plan -= dt;
    const lost = levelOf(car.y, car.x, car.z) !== levelOf(c.y, c.x, c.z) && dist > 45;
    if (c.plan <= 0) { replan(); c.plan = lost ? 4.5 : 1.4; }
    // he drives like a careful sedan: quick on the main road, slower in town and on the ramps, slower still in turns
    const here = c.path && c.path[Math.min(c.k, c.path.length - 1)], kind = here ? here.kind : 'main';
    let target = kind === 'main' ? (keen ? 21 : 16) : kind === 'street' ? (keen ? 12.5 : 10) : (keen ? 13 : 10.5);
    if (c.path && c.k + 3 < c.path.length) {
      const a = c.path[c.k], b = c.path[c.k + 1], d2 = c.path[c.k + 3];
      const t1 = Math.atan2(b.z - a.z, b.x - a.x), t2 = Math.atan2(d2.z - b.z, d2.x - b.x);
      let tu = Math.abs(t2 - t1); if (tu > Math.PI) tu = 2 * Math.PI - tu;
      if (tu > 0.5) target *= 0.65;
    }
    // he matches your pace a little under it: keep moving and you stay ahead, stall and he closes in
    const pace = Math.max(8, avgV * (keen ? 0.94 : 0.8));
    target = Math.min(target, pace);
    if (dist > 190) target = Math.max(target, 24);     // far out of sight he closes in, so the pressure stays on
    if (lost) target *= 0.75;
    if (elapsed < 8) target *= Math.max(0, elapsed - 3) / 5;   // a short head start
    c.v += (target - c.v) * Math.min(1, dt * 1.5);
    let step = c.v * dt;
    // the last stretch: straight at you, only when nothing solid, no water and no level change is in the way
    c.directT = (c.directT || 0) - dt;
    if (c.directT <= 0) { c.direct = dist < 22 && dy < 1.2 && routes.clearLine({ x: c.x, y: c.y, z: c.z }, { x: car.x, y: car.y, z: car.z }, 0.8); c.directT = 0.25; }
    let tx, tz, ty;
    if (c.direct) { tx = car.x; tz = car.z; ty = car.y; }
    else if (c.path && c.path.length) {
      while (c.k < c.path.length - 1 && Math.hypot(c.path[c.k].x - c.x, c.path[c.k].z - c.z) < Math.max(1.2, step * 1.5)) c.k++;
      const q = c.path[c.k]; tx = q.x; tz = q.z; ty = q.y;
      if (q.kind !== 'main' && q.kind !== 'street') log.kinds.add(q.kind);
    } else return;
    const dx = tx - c.x, dz = tz - c.z, L = Math.hypot(dx, dz);
    if (L > 1e-3) {
      const s = Math.min(L, step);
      c.x += dx / L * s; c.z += dz / L * s;
      const want = Math.atan2(-dz, dx); let d = want - c.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      c.yaw += d * Math.min(1, dt * 6);
    }
    // height: the path's own height (decks and ramps), eased
    const yWant = c.direct ? surfY(c.x, c.z, c.y) : ty;
    c.y += (yWant - c.y) * Math.min(1, dt * 8);
    c.g.position.set(c.x, c.y, c.z); c.g.rotation.set(0, c.yaw, 0);
    // safety log: how close he ever gets to a solid, and whether he is ever over open water at ground level
    const gap = routes.solidGap(c.x, c.z, c.y); if (gap < log.minSolid) log.minSolid = gap;
    if (routes.wet(c.x, c.z, c.y)) log.wet++;
    tossIn -= dt;
    if (keen && tossIn <= 0 && dist < 70 && dist > 10) { tossDeck(); tossIn = 5 + Math.random() * 3; }
    if (dist < 4.4 && dy < 1.6) { note('Deck time!'); log.caught = true; endRound(false); }
  }

  /* ---------- round ---------- */
  function start() {
    if (active) return;
    active = true; ended = false; won = false;
    skillAt = Math.floor(Math.random() * Math.max(1, SKILLS.length)); avgV = 12; lastCar = null; timeLeft = ROUND; collected = 0; score = 0; elapsed = 0; tossIn = 7; shieldOn = false; arrowUntil = 0;
    log.spawns = []; log.minSolid = 99; log.wet = 0; log.kinds = new Set(); log.ratios = []; log.replans = 0; log.caught = false;
    if (pauseStories) pauseStories(true);
    camera.updateMatrixWorld();
    setupHUD();
    spawnChaser(); spawnPickups(); spawnDecks();
    arrow = makeArrow(); arrow.visible = false; scene.add(arrow);
    note(`Collect ${TARGET} AI pickups. The Deck Demander is behind you.`);
    syncMap();
  }
  function clearScene() {
    if (chaser) { scene.remove(chaser.g); chaser = null; }
    pickups.forEach(p => scene.remove(p.mesh)); pickups = [];
    decks.forEach(d => scene.remove(d.mesh)); decks = [];
    if (arrow) { scene.remove(arrow); arrow = null; }
    if (map && map.setMarks) { map.setMarks('chase', null); map.setPath('chase', null); }
  }
  function stop() {
    active = false; ended = false; clearScene();
    if (hudEl) { hudEl.remove(); hudEl = null; }
    if (endEl) { endEl.remove(); endEl = null; }
    if (tintEl) { tintEl.remove(); tintEl = null; }
    if (pauseStories) pauseStories(false);
  }
  function endRound(w) {
    if (!active || ended) return;
    ended = true; won = !!w;
    score = pickups.filter(p => p.got).reduce((a, p) => a + p.value, 0) + (won ? Math.max(0, Math.floor(timeLeft)) * 10 : 0);
    if (score > best) { best = score; try { localStorage.setItem(LS, String(best)); } catch (e) {} }
    if (!won) showTint();
    setTimeout(() => { if (ended && active) showEnd(); }, won || calm() ? 200 : 900);
  }

  /* ---------- per frame ---------- */
  function updatePickups(dt, t) {
    pickups.forEach(p => {
      if (p.got) {
        // collected: it flies into the car and shrinks over a third of a second
        if (p.gone < 1) { p.gone = Math.min(1, p.gone + dt * 3); const m = p.mesh.position; m.x += (car.x - m.x) * Math.min(1, dt * 10); m.z += (car.z - m.z) * Math.min(1, dt * 10); p.mesh.scale.setScalar(Math.max(0.001, 1 - p.gone)); if (p.gone >= 1) scene.remove(p.mesh); }
        return;
      }
      p.mesh.position.y = p.y + (calm() ? 0 : Math.sin(t * 2 + p.x) * 0.12);
      p.mesh.userData.top.rotation.y += dt * 1.6;
      if (Math.hypot(car.x - p.x, car.z - p.z) < 2.9 && Math.abs(car.y - p.y) < 1.8) {
        p.got = true; collected++; applyPickup(p.type, p.special, p.skill);
        if (collected >= TARGET) endRound(true);
      }
    });
  }
  function applyPickup(type, special, skill) {
    const tail = skill ? ` · ${skill}` : '';
    if (type === 'boost') { if (boost) boost(1.35, 4); note((special ? 'AI Boost, double points' : 'AI Boost') + tail); }
    else if (type === 'clarity') { shieldOn = true; note('Clarity Pulse: the next deck will not slow you' + tail); }
    else { arrowUntil = elapsed + 7; note('Fast Track: follow the arrow and the map' + tail); }
  }
  function updateDecks(dt) {
    decks.forEach(d => {
      if (d.fly) {
        const f = d.fly; f.k = Math.min(1, f.k + dt / 1.1);
        const x = f.x0 + (f.x1 - f.x0) * f.k, z = f.z0 + (f.z1 - f.z0) * f.k, y = f.y0 + (f.y1 - f.y0) * f.k + Math.sin(f.k * Math.PI) * 5;
        d.mesh.position.set(x, y, z); d.mesh.rotation.x = calm() ? 0 : f.k * Math.PI * 2;
        if (f.k >= 1) { d.fly = null; d.mesh.rotation.x = 0; }
        return;
      }
      if (d.hit) { if (d.fall < 1) { d.fall = Math.min(1, d.fall + dt * 3); d.mesh.rotation.x = -d.fall * Math.PI / 2 * 0.96; } return; }   // it tips flat and stays
      if (Math.hypot(car.x - d.x, car.z - d.z) < 2.2 && Math.abs(car.y - d.y) < 1.6) {
        d.hit = true;
        if (shieldOn) { shieldOn = false; note('Clarity Pulse cleared the deck'); }
        else { if (slow) slow(0.55, 1.8); note('Another deck. Slowed down.'); }
      }
    });
  }
  let trackPath = null, trackT = 0;
  function updateArrow(dt) {
    if (!arrow) return;
    const on = elapsed < arrowUntil;
    const m = arrow.userData.mat; m.opacity += ((on ? 0.9 : 0) - m.opacity) * Math.min(1, dt * 6);
    arrow.visible = m.opacity > 0.02;
    if (!on) { trackPath = null; if (map && map.setPath) map.setPath('chase', null); if (!arrow.visible) return; }
    // Fast Track follows the network: the drive to the nearest pickup, not a straight line
    trackT -= dt;
    if (on && trackT <= 0) {
      trackT = 0.5; let bestR = null;
      pickups.forEach(p => { if (p.got) return; const r = routes.route({ x: car.x, z: car.z, y: car.y }, { x: p.x, z: p.z, y: p.y }); if (r && (!bestR || r.len < bestR.len)) bestR = r; });
      trackPath = bestR ? bestR.pts : null;
      if (map && map.setPath) map.setPath('chase', trackPath, (TOKENS[theme()] || {}).accent);
    }
    let aim = null;
    if (trackPath) { for (const q of trackPath) { if (Math.hypot(q.x - car.x, q.z - car.z) > 12) { aim = q; break; } } if (!aim) aim = trackPath[trackPath.length - 1]; }
    const fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw), ax = car.x + fx * 7, az = car.z + fz * 7;
    arrow.position.set(ax, car.y + 1.25, az);
    if (aim) arrow.rotation.y = -Math.atan2(aim.z - az, aim.x - ax) - Math.PI / 2;
  }
  let mapT = 0;
  function syncMap() {
    if (!map || !map.setMarks) return;
    const T = TOKENS[theme()] || {};
    const list = pickups.filter(p => !p.got).map(p => ({ x: p.x, z: p.z, color: p.special ? (T.accent || '#E8A33D') : PCOL[p.type], r: p.special ? 4.5 : 3.5 }));
    if (chaser) list.push({ x: chaser.x, z: chaser.z, color: '#8A7A58', r: 4, shape: 'square' });
    map.setMarks('chase', list);
  }
  function update(dt, t) {
    if (!active || ended) return;
    elapsed += dt; timeLeft = Math.max(0, timeLeft - dt);
    updateChaser(dt); updatePickups(dt, t); updateDecks(dt); updateArrow(dt); updateHUD(dt);
    mapT -= dt; if (mapT <= 0) { syncMap(); mapT = 0.15; }
    if (timeLeft <= 0) endRound(false);
  }

  return {
    start, stop, update, get active() { return active; },
    qaNoChase: v => { qaNoChase = !!v; },
    qaPlace: (x, y, z, yaw) => { if (!chaser) return; Object.assign(chaser, { x, y, z, path: null, plan: 0 }); if (yaw != null) chaser.yaw = yaw; chaser.g.position.set(x, y, z); },   // QA only: screenshots
    spots: () => (active && !ended ? pickups.filter(p => !p.got).map(p => ({ x: p.x, y: p.y, z: p.z })) : []),
    qa: () => ({ timeLeft, collected, ended, won, score, elapsed, shieldOn, log, routes,
      pickups: pickups.map(p => ({ x: p.x, y: p.y, z: p.z, got: p.got, type: p.type, special: p.special })),
      decks: decks.length, chaser: chaser && { x: chaser.x, y: chaser.y, z: chaser.z, v: chaser.v, direct: chaser.direct } })
  };
}
