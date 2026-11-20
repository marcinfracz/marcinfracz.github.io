/* Drive mode, Phase 2: the chase game. A separate mode on drive.html; Free play is untouched.
   First draft by Grok, finished by Claude. drive.js loads this file only when the visitor starts a chase.
   Rules kept: the chaser is a generic cartoon archetype, nothing appears or vanishes in view,
   a catch is soft (no crash, no damage). */
export function createChase(api) {
  const {
    THREE, scene, camera, car,
    roadZ, roadDZ, CURB = 7.3, xMin = 6, xMax = 2000,
    stops = [], slow, boost, hud,
    calm = () => false, pauseStories, exit,
    groundY = () => 0
  } = api || {};
  const links = (api && api.links) || {};
  const RESUME = links.resume || 'assets/resume.pdf', CONTACT = links.contact || 'index.html';

  const ROUND = 90, TARGET = 8, HIDE_R = 222;     // fog ends at 215: past this nothing can be seen
  const LS = 'mf-chase-v1';
  let active = false, ended = false;
  let timeLeft = ROUND, collected = 0, score = 0, elapsed = 0, tossIn = 6;
  let best = 0;
  try { best = parseInt(localStorage.getItem(LS) || '0', 10) || 0; } catch (e) {}

  let chaser = null, chaserV = 0;
  let pickups = [], decks = [], arrow = null;
  let hudEl = null, endEl = null, tintEl = null;
  let shieldOn = false, arrowUntil = 0;

  const beige = '#C8B48A', suit = '#2C333D', deckWhite = '#F4F1EA';
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), tmp = new THREE.Vector3();
  const unseen = (x, y, z) => {
    tmp.set(x, y, z);
    if (tmp.distanceTo(camera.position) > HIDE_R) return true;
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    return !frustum.containsPoint(tmp);
  };
  const lam = c => new THREE.MeshLambertMaterial({ color: c });

  /* ---------- meshes ---------- */
  function makeSedan() {
    const g = new THREE.Group();
    const bodyMat = lam(beige);
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.9), bodyMat); body.position.y = 0.85; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.7), bodyMat); cabin.position.set(-0.3, 1.7, 0); g.add(cabin);
    const wheelMat = lam('#1A1F26');
    for (const [x, z] of [[-1.4, 0.85], [-1.4, -0.85], [1.4, 0.85], [1.4, -0.85]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 10), wheelMat);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.38, z); g.add(w);
    }
    // the cartoon manager, sitting up through an open roof, slide deck in hand
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), lam('#E8C4A0')); head.position.set(-0.2, 2.75, 0); g.add(head);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.7), lam(suit)); torso.position.set(-0.2, 2.2, 0); g.add(torso);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.75), lam(deckWhite)); deck.position.set(0.25, 2.35, 0.1); g.add(deck);
    const barMat = lam('#2563EB');
    [0.14, 0.26, 0.19].forEach((h, i) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.1), barMat);
      b.position.set(0.29, 2.15 + h / 2, -0.1 + i * 0.16); g.add(b);
    });
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  const PCOL = { boost: '#F2B456', clarity: '#2FA36B', track: '#2563EB' };
  function makePickup(type, special) {
    const g = new THREE.Group();
    const color = PCOL[type];
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.2, 16), lam(color)); base.position.y = 0.1; g.add(base);
    const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshLambertMaterial({ color: '#FFFFFF', emissive: color, emissiveIntensity: special ? 0.75 : 0.35 }));
    top.position.y = 1.0; g.add(top);
    if (special) {
      const glow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 28),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; g.add(glow);
    }
    g.userData.top = top;
    return g;
  }

  function makeDeck() {
    const g = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.12), lam(deckWhite)); slide.position.y = 0.75; g.add(slide);
    const barMat = lam('#4A5562');
    [0.35, 0.55, 0.42, 0.28].forEach((h, i) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.06), barMat);
      b.position.set(-0.45 + i * 0.3, 0.38 + h / 2, 0.09); g.add(b);
    });
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  function makeArrow() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#F2B456', transparent: true, opacity: 0.9, depthTest: false });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.6), mat); shaft.position.z = -0.8; g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 10), mat); head.rotation.x = -Math.PI / 2; head.position.z = -1.9; g.add(head);
    g.renderOrder = 10; g.visible = false;
    return g;
  }

  /* ---------- HUD ---------- */
  function setupHUD() {
    if (hudEl) return;
    hudEl = document.createElement('div');
    hudEl.className = 'chase-hud';
    hudEl.innerHTML = `<div class="chase-panel"><span class="chase-time">1:30</span><span class="chase-picks">AI 0 / ${TARGET}</span><span class="chase-best">Best ${best}</span><span class="chase-note" aria-live="polite"></span></div>`;
    (hud || document.body).appendChild(hudEl);
  }
  let noteT = 0;
  function note(txt) { if (!hudEl) return; const n = hudEl.querySelector('.chase-note'); n.textContent = txt; n.classList.add('on'); noteT = 2.2; }
  function updateHUD(dt) {
    if (!hudEl) return;
    const s = Math.ceil(timeLeft);
    hudEl.querySelector('.chase-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    hudEl.querySelector('.chase-time').classList.toggle('low', timeLeft < 15);
    hudEl.querySelector('.chase-picks').textContent = `AI ${collected} / ${TARGET}`;
    if (noteT > 0) { noteT -= dt; if (noteT <= 0) hudEl.querySelector('.chase-note').classList.remove('on'); }
  }

  function showEnd(won) {
    if (endEl) endEl.remove();
    endEl = document.createElement('div');
    endEl.className = 'chase-end';
    endEl.setAttribute('role', 'dialog');
    endEl.innerHTML = `
      <div class="chase-end-panel">
        <h2>${won ? 'You made it.' : (timeLeft <= 0 ? 'Time is up.' : 'Deck time.')}</h2>
        <p class="chase-score">${score}</p>
        <p class="chase-sub">Best ${best}</p>
        <p class="chase-msg">${won ? 'Less deck, more doing.' : 'The deck caught up. Try again.'}</p>
        <div class="chase-btns">
          <button type="button" class="chase-again">Play again</button>
          <button type="button" class="chase-free">Free play</button>
        </div>
        <p class="chase-links"><a href="${RESUME}" target="_blank" rel="noopener">Resume</a> · <a href="${CONTACT}">Contact</a></p>
      </div>`;
    document.body.appendChild(endEl);
    endEl.querySelector('.chase-again').onclick = () => { stop(); start(); };
    endEl.querySelector('.chase-free').onclick = () => { stop(); if (exit) exit(); };
    endEl.querySelector('.chase-again').focus();
  }

  function showTint() {
    if (calm()) return;
    if (tintEl) tintEl.remove();
    tintEl = document.createElement('div');
    tintEl.className = 'chase-tint';
    tintEl.textContent = 'Deck time!';
    document.body.appendChild(tintEl);
    setTimeout(() => { if (tintEl) { tintEl.remove(); tintEl = null; } }, 1400);
  }

  /* ---------- placing things: always where the camera cannot see them yet ---------- */
  function addPickup(x, type, special) {
    x = Math.max(xMin + 10, Math.min(xMax - 30, x));
    const z = roadZ(x) + (Math.random() - 0.5) * 5;
    const mesh = makePickup(type, special);
    mesh.position.set(x, groundY(x, z) - 1.6, z);
    mesh.visible = false;
    scene.add(mesh);
    pickups.push({ mesh, x, z, type, special, value: special ? 200 : 100, risen: 0, rising: false, got: false, gone: 0 });
  }
  function spawnPickups() {
    const dir = car.x + 900 < xMax ? 1 : -1;          // lay them out the way there is road to drive
    const specials = stops.filter(s => s.id === 'mexico' || s.id === 'shanghai');
    specials.forEach(s => addPickup(s.x + 10, 'boost', true));
    const types = ['boost', 'clarity', 'track', 'boost', 'clarity', 'track', 'boost', 'clarity'];
    const n = TARGET + 2 - specials.length;            // two spare, so the round never hangs on one hard pickup
    for (let i = 0; i < n; i++) addPickup(car.x + dir * (HIDE_R + 20 + i * 95 + Math.random() * 40), types[i % types.length], false);
  }
  function addDeck(x, z, y0) {
    const mesh = makeDeck();
    mesh.position.set(x, y0 == null ? groundY(x, z) : y0, z);
    mesh.rotation.y = -Math.atan(roadDZ(x)) + Math.PI / 2;
    scene.add(mesh);
    const d = { mesh, x, z, hit: false, sink: 0, fly: null };
    decks.push(d);
    return d;
  }
  function spawnDecks() {
    const dir = car.x + 900 < xMax ? 1 : -1;
    for (let i = 0; i < 6; i++) {
      const x = car.x + dir * (HIDE_R + 60 + i * 120);
      if (x < xMin + 10 || x > xMax - 20) continue;
      addDeck(x, roadZ(x) + (Math.random() - 0.5) * 6);
    }
  }
  // the chaser lobs a deck that lands on the road ahead of you; it flies in, it never appears
  function tossDeck() {
    if (!chaser) return;
    const fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw);
    const tx = car.x + fx * (18 + Math.abs(car.v) * 1.1), tz = roadZ(tx) + (car.z - roadZ(car.x)) * 0.6;
    const d = addDeck(chaser.position.x, chaser.position.z, chaser.position.y + 2.6);
    d.fly = { x0: chaser.position.x, z0: chaser.position.z, y0: chaser.position.y + 2.6, x1: tx, z1: tz, k: 0 };
    d.x = tx; d.z = tz;
  }

  /* ---------- round ---------- */
  function start() {
    if (active) return;
    active = true; ended = false;
    timeLeft = ROUND; collected = 0; score = 0; elapsed = 0; tossIn = 7;
    shieldOn = false; arrowUntil = 0;
    if (pauseStories) pauseStories(true);
    setupHUD();
    chaser = makeSedan();
    // the chaser starts out of sight behind you, on the side with road, and drives in
    // (behind the start line too: it must never come at you head-on)
    const back = car.x + 900 < xMax ? -1 : 1;
    const cx = car.x + back * (HIDE_R + 40);
    chaser.position.set(cx, groundY(cx, roadZ(cx)), roadZ(cx));
    chaserV = 0;
    scene.add(chaser);
    spawnPickups();
    spawnDecks();
    arrow = makeArrow(); scene.add(arrow);
    note('Collect 8 AI pickups. The Deck Demander is behind you.');
  }

  function clearScene() {
    if (chaser) { scene.remove(chaser); chaser = null; }
    pickups.forEach(p => scene.remove(p.mesh)); pickups = [];
    decks.forEach(d => scene.remove(d.mesh)); decks = [];
    if (arrow) { scene.remove(arrow); arrow = null; }
  }
  function stop() {
    active = false; ended = false;
    clearScene();
    if (hudEl) { hudEl.remove(); hudEl = null; }
    if (endEl) { endEl.remove(); endEl = null; }
    if (tintEl) { tintEl.remove(); tintEl = null; }
    if (pauseStories) pauseStories(false);
  }

  function endRound(won) {
    if (!active || ended) return;
    ended = true;
    score = pickups.filter(p => p.got).reduce((a, p) => a + p.value, 0) + (won ? Math.max(0, Math.floor(timeLeft)) * 10 : 0);
    if (score > best) { best = score; try { localStorage.setItem(LS, String(best)); } catch (e) {} }
    if (!won) showTint();
    setTimeout(() => { if (ended) showEnd(won); }, won || calm() ? 200 : 900);
  }

  /* ---------- per frame ---------- */
  function updateChaser(dt, t) {
    if (!chaser) return;
    const keen = elapsed > 40 || collected >= 4;
    const dx = car.x - chaser.position.x, dist = Math.abs(dx);
    // gentle first, keener later; it closes faster while it is far out of sight so the pressure stays on
    let target = keen ? 24 : 17;
    if (dist > 140) target = 34;
    if (elapsed < 4) target *= elapsed / 4;
    chaserV += (target - chaserV) * Math.min(1, dt * 1.5);
    chaser.position.x += Math.sign(dx) * Math.min(dist, chaserV * dt);
    // keeps to the road, drifting toward your side of it
    const off = clamp((car.z - roadZ(car.x)), -CURB + 1.5, CURB - 1.5);
    const zWant = roadZ(chaser.position.x) + off * (dist < 40 ? 1 : 0.4);
    chaser.position.z += (zWant - chaser.position.z) * Math.min(1, dt * 2);
    chaser.position.y = groundY(chaser.position.x, chaser.position.z);
    chaser.rotation.y = -Math.atan(roadDZ(chaser.position.x)) + (dx < 0 ? Math.PI : 0);
    tossIn -= dt;
    if (keen && tossIn <= 0 && dist < 70) { tossDeck(); tossIn = 5 + Math.random() * 3; }
    if (dist < 4.6 && Math.abs(car.z - chaser.position.z) < 2.8) { note('Deck time!'); endRound(false); }
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function updatePickups(dt, t) {
    pickups.forEach(p => {
      if (p.got) {
        // collected: it shrinks into the road over a third of a second
        if (p.gone < 1) { p.gone = Math.min(1, p.gone + dt * 3); p.mesh.scale.setScalar(1 - p.gone); if (p.gone >= 1) p.mesh.visible = false; }
        return;
      }
      if (!p.rising && unseen(p.x, 0.8, p.z)) { p.rising = true; p.mesh.visible = true; }
      if (p.rising && p.risen < 1) { p.risen = Math.min(1, p.risen + dt * 2); }
      const gy = groundY(p.x, p.z);
      p.mesh.position.y = gy - 1.6 + p.risen * 1.6 + (calm() ? 0 : Math.sin(t * 2 + p.x) * 0.12 * p.risen);
      p.mesh.userData.top.rotation.y += dt * 1.6;
      if (p.risen > 0.6 && Math.hypot(car.x - p.x, car.z - p.z) < 2.8) {
        p.got = true; collected++;
        applyPickup(p.type, p.special);
        if (collected >= TARGET) endRound(true);
      }
    });
  }

  function applyPickup(type, special) {
    if (type === 'boost') { if (boost) boost(1.35, 4); note(special ? 'AI Boost, double points' : 'AI Boost'); }
    else if (type === 'clarity') { shieldOn = true; note('Clarity Pulse: the next deck will not slow you'); }
    else if (type === 'track') { arrowUntil = elapsed + 6; note('Fast Track: follow the arrow'); }
  }

  function updateDecks(dt) {
    decks.forEach(d => {
      if (d.fly) {
        const f = d.fly; f.k = Math.min(1, f.k + dt / 1.1);
        const x = f.x0 + (f.x1 - f.x0) * f.k, z = f.z0 + (f.z1 - f.z0) * f.k;
        const g = groundY(x, z), y = f.y0 + (g - f.y0) * f.k + Math.sin(f.k * Math.PI) * 5;
        d.mesh.position.set(x, y, z);
        d.mesh.rotation.x = calm() ? 0 : f.k * Math.PI * 2;
        if (f.k >= 1) { d.fly = null; d.mesh.rotation.x = 0; }
        return;
      }
      if (d.hit) {
        // a deck you hit sinks into the road, it never vanishes
        if (d.sink < 1) { d.sink = Math.min(1, d.sink + dt * 1.6); d.mesh.position.y = groundY(d.x, d.z) - d.sink * 1.7; if (d.sink >= 1) d.mesh.visible = false; }
        return;
      }
      if (Math.hypot(car.x - d.x, car.z - d.z) < 2.2) {
        d.hit = true;
        if (shieldOn) { shieldOn = false; note('Clarity Pulse cleared the deck'); }
        else { if (slow) slow(0.55, 1.8); note('Another deck. Slowed down.'); }
      }
    });
  }

  function updateArrow() {
    if (!arrow) return;
    if (elapsed > arrowUntil) { arrow.visible = false; return; }
    let nearest = null, nd = 1e9;
    pickups.forEach(p => { if (p.got) return; const d = Math.hypot(car.x - p.x, car.z - p.z); if (d < nd) { nd = d; nearest = p; } });
    if (!nearest) { arrow.visible = false; return; }
    const fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw);
    const ax = car.x + fx * 7, az = car.z + fz * 7;
    arrow.position.set(ax, groundY(ax, az) + 1.25, az);
    arrow.rotation.y = -Math.atan2(nearest.z - az, nearest.x - ax) - Math.PI / 2;
    arrow.visible = true;
  }

  function update(dt, t) {
    if (!active || ended) return;
    elapsed += dt;
    timeLeft = Math.max(0, timeLeft - dt);
    updateChaser(dt, t);
    updatePickups(dt, t);
    updateDecks(dt);
    updateArrow();
    updateHUD(dt);
    if (timeLeft <= 0) endRound(false);
  }

  return { start, stop, update, get active() { return active; },
    qa: () => ({ timeLeft, collected, ended, shieldOn, pickups, decks, chaser: chaser && chaser.position }) };
}
