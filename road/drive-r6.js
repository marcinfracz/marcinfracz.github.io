/* Drive mode, open-world PREVIEW (v3 Phase A). Same as drive.js, plus: leave the main road, turn into the
   cities, take the ramps up onto the elevated roads and bridges, with a small map. Network by Grok and Claude.
   First draft by Grok, finished by Claude. It only reads the shared modules and content:
   road.js, tour.js and every other Road file stay exactly as they are.
   v3 Phase B and C (Grok, for Claude's review): a mode selector (The Road, then Games: Learn and Just play),
   Field notes and the Glovebox (fieldnotes-next.js), the City Chase on the network (chase-next.js), a route
   graph (route-next.js), softer and smoother car contact with walls, curbs and decks, and NPC limits.
   Round 2 (Grok, for Claude's review): a Home link in the top bar (drive-next.html), Shift as a real boost with a
   short ramp-in and a boost bar, speed-sensitive steering that stays strong at speed (turning circle under 20 m
   at full boost), quicker keyboard steering with a centring return, a little drift in hard turns, Space as a
   handbrake, a Boost pedal on touch, and an electric unicycle you can ride in the games (euc-next.js).
   Round 3 (Grok, for Claude's review; a copy of drive-r2.js, loaded only by drive-next.html): R to respawn on the
   nearest straight stretch of the main road (a small confirm panel, the move under the veil, a stuck hint, a touch
   Respawn button), an on-screen key panel in the games (phantom keys that light up, and caps you can hold with the
   mouse; K or Hide keys), a rideable EUC jump park with real jumps (park-r3.js, net-r3.js), and eight easter eggs
   (eggs-r3.js). Changed copies: net-r3.js, chase-r3.js, fieldnotes-r3.js. Styles: drive-r3.css. */
import { THREE, TOKENS, setTheme, roadZ, roadDZ, smooth, clamp, lerp } from './core.js';
import { buildWorld, vehicleGeo } from './world.js?v=76';
import { buildStage } from './stages.js?v=76';
import { planCities, cityFootprints, buildCities, tPose } from './landmarks.js?v=76';
import { createNet, createMinimap } from './net-r3.js?v=1';
import { createRoutes } from './route-next.js?v=2';
import { createFieldNotes, NOTES } from './fieldnotes-r3.js?v=1';
import { createParkRide } from './park-r3.js?v=1';
import { createEggs } from './eggs-r3.js?v=1';
import { createEUC } from './euc-next.js?v=1';
import { createBike } from './bike-r6.js?v=1';

const C = window.ROAD_CONTENT;
const $ = s => document.querySelector(s);
const root = document.documentElement;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const sysReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => Math.min(innerWidth, innerHeight) < 500 || innerWidth < 768;
const QA = /[?&]qa\b/.test(location.search);

/* ---------- stop positions: the same math as road.js, so every stop sits where The Road puts it ---------- */
const ERA_COLORS = { engineering: '#C8693A', chevrolet: '#D9A21B', launch: '#2E9C8F', connected: '#7357D8', shanghai: '#D64545', onstar: '#1F8FD1', now: '#2FA36B' };
const MIN_SP = 72, PER_YEAR = 58;
const startYr = C.eras.map(e => parseInt(e.years, 10));
const ERAS = [];
{
  let X = 86;
  C.eras.forEach((e, k) => {
    const dur = k < C.eras.length - 1 ? Math.max(0.5, startYr[k + 1] - startYr[k]) : 0.9;
    const n = C.stops.filter(s => s.era === e.id).length;
    const len = Math.max(n * MIN_SP, dur * PER_YEAR);
    ERAS.push({ id: e.id, k, n: e.n, name: e.short || e.label, label: e.label, years: e.years, dur, count: n, x0: X, x1: X + len, color: e.color || ERA_COLORS[e.id] || '#E8A33D' });
    X += len;
  });
}
const ERA_END = ERAS.length ? ERAS[ERAS.length - 1].x1 : 86;
const seen = {};
const STOPS = C.stops.map((s, i) => {
  let x;
  const e = s.era && ERAS.find(q => q.id === s.era);
  if (e) { const j = seen[e.id] = (seen[e.id] || 0) + 1; x = e.x0 + (e.x1 - e.x0) * (j - 0.5) / e.count; }
  else x = i === 0 ? 40 : ERA_END + 46;
  return Object.assign({}, s, { i, x, region: s.region || (i === 0 ? 'us' : 'now') });
});
const XMIN = 0, XMAX = STOPS[STOPS.length - 1].x + 80;
const ERA = Object.fromEntries(C.eras.map(e => [e.id, e]));
const ERAX = Object.fromEntries(ERAS.map(e => [e.id, e]));
const LAST = STOPS.length - 1;
const HIGHLIGHT = new Set(['mexico', 'shanghai']);   // Marcin's pick for Drive mode

/* ---------- drive tuning ---------- */
const LANE_B = 5.7;                 // the hero's own lane: no traffic is ever spawned in it
const CURB = 7.3, WALL = 8.3;       // soft curb, then the hardest the car can go
const X_LO = XMIN + 6, X_HI = XMAX + 250;
const FOG = { near: 34, far: 215 }; // close fog: far things fade in, they never pop in
const SHOW_R = 232;                 // scenes and towns are drawn out to just past the fog
const TOWN_Z = 0.12;                // asks the towns to keep their near details on at this range
const STOP_R = 30;                  // the story card opens this close to a stop
/* round 2: how each vehicle drives. vmax and vboost in m/s. Full-lock yaw rate at speed v is min(1, v / sLo) * (w0 + wk * v) rad/s:
   it fades to nothing as you crawl, so it is never twitchy at low speed, and it keeps growing a little with speed, so
   steering still bites at boost (car at 38 m/s: 1.2 + 0.021 * 38 = 2.0 rad/s, a turning radius of 19 m; it was 0.8 rad/s and 39 m at 31 m/s).
   pad: how far the body reaches past its centre for walls and buildings; npcL/npcW/person/trafL/trafW: the same for town cars,
   walkers and traffic. walk/ground: speed on sidewalks and plazas, and on grass. */
const VEH = {
  car: { vmax: 22, vboost: 38, acc: 9.5, accBoost: 7, brake: 24, rev: 10, vrev: -9, sLo: 5, w0: 1.2, wk: 0.021, walk: 0.4, ground: 0.55,
    pad: 1.15, npcL: 2.1, npcW: 1.0, person: 1.9, trafL: 2.3, trafW: 1.0, drift: true },
  euc: { vmax: 18, vboost: 22, acc: 8.5, accBoost: 4, brake: 15, rev: 4, vrev: -3, sLo: 2.5, w0: 2.6, wk: 0.03, walk: 1, ground: 0.8,
    pad: 0.5, npcL: 0.7, npcW: 0.45, person: 0.9, trafL: 0.7, trafW: 0.45, drift: false },
  // round 6: the city bike, a little slower than the unicycle, quick to pick up speed, tight turns, good brakes
  bike: { vmax: 12, vboost: 15, acc: 10, accBoost: 5, brake: 18, rev: 3, vrev: -2, sLo: 2, w0: 2.2, wk: 0.04, walk: 1, ground: 0.75,
    pad: 0.55, npcL: 0.9, npcW: 0.45, person: 0.9, trafL: 0.9, trafW: 0.45, drift: false }
};
const GAME_MODES = new Set(['notes', 'free', 'chase']);

/* ---------- prefs ---------- */
const PKEY = 'mf-drive-v1';
const prefs = (() => { try { return JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch (e) { return {}; } })();
const savePrefs = () => { try { localStorage.setItem(PKEY, JSON.stringify(prefs)); } catch (e) {} };
let calm = typeof prefs.calm === 'boolean' ? prefs.calm : sysReduced;
let chase = prefs.cam === 'chase';
let voiceOn = false;
/* the vehicle for the games: the car or the electric unicycle (The Road is always driven in the car) */
const VKEY = 'mf-drive-vehicle-v1';
let vehPref = (() => { try { const v = localStorage.getItem(VKEY); return v === 'euc' || v === 'bike' ? v : 'car'; } catch (e) { return 'car'; } })();
const saveVeh = () => { try { localStorage.setItem(VKEY, vehPref); } catch (e) {} };

/* ---------- narration: the audio tour's own captions and clips, read from tour.js so nothing is copied ---------- */
const Tour = { caps: {}, src: null };
async function loadTour() {
  try {
    const txt = await fetch('road/tour.js', { cache: 'no-cache' }).then(r => r.text());
    const grab = (re) => { const m = txt.match(re); return m ? m[1] : null; };
    const caps = grab(/const CAPS = (\{[\s\S]*?\n\});/);
    if (caps) Tour.caps = JSON.parse(caps.replace(/,\s*\}$/, '}'));
    const v5 = grab(/const V5 = new Set\((\[[^\]]*\])\)/);
    const fix = grab(/const FIX = (\{[^}]*\})/);
    const V5 = new Set(v5 ? JSON.parse(v5) : []);
    const FIX = fix ? JSON.parse(fix.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"')) : {};
    const base = (txt.match(/voice:\s*'([^']+)'/) || [])[1] || 'assets/audio/';
    Tour.src = id => FIX[id] ? `${base}${FIX[id]}.mp3` : `${base}${V5.has(id) ? 'tour5' : 'tour3'}-${id}.mp3`;
  } catch (e) { Tour.src = null; }
}
const pad2 = n => String(n).padStart(2, '0');
const capId = i => (i === 0 ? 't00' : i === LAST ? 't99' : 's' + pad2(i));
const voice = new Audio(); voice.preload = 'auto';
window.__dvVoice = voice;   // round 4: the radio listens for the narration so it can drop under it
let voiceFor = -1;
function playVoice(i) {
  if (!voiceOn || !Tour.src || voiceFor === i || i === 0) return;   // the opening clip talks about the tour's own buttons
  voiceFor = i;
  voice.src = Tour.src(capId(i));
  voice.volume = 0.95;
  voice.play().catch(() => {});
}
function stopVoice() { voice.pause(); voiceFor = -1; }

/* ---------- page setup ---------- */
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
if (isPhone() || !hasGL) {
  $('#dv-phone').hidden = false; $('#dv-intro').hidden = true; root.classList.add('dv-fallback');
  if (!hasGL) { const h = $('#dv-phone h1'); if (h) h.textContent = 'Drive mode needs 3D graphics.'; }
} else {
  loadTour();
  start();
}

function start() {
  const canvas = $('#world');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { $('#dv-phone').hidden = false; $('#dv-intro').hidden = true; return; }
  const lite = (navigator.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, FOG.near, FOG.far);
  scene.background = new THREE.Color();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 280;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  const sunOff = new THREE.Vector3(-40, 90, 75), sunC = new THREE.Vector3();
  const sunR = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), sunOff.clone().normalize()).normalize();
  const sunU = new THREE.Vector3().crossVectors(sunOff.clone().normalize(), sunR).normalize();
  const sunTex = (sc.right - sc.left) / sun.shadow.mapSize.x, sunTexV = (sc.top - sc.bottom) / sun.shadow.mapSize.y;

  const camera = new THREE.PerspectiveCamera(58, 1, 0.15, 900);

  /* ---------- the same world, scenes and towns as The Road ---------- */
  const cities = planCities(STOPS); cityFootprints(cities);
  const world = buildWorld(scene, { stops: STOPS, xMin: XMIN, xMax: XMAX + 300, lite, eras: ERAS, cities });
  const stages = STOPS.map(s => {
    const base = new THREE.Vector3(s.x, 0, roadZ(s.x) - 22);
    const st = buildStage(scene, s.scene, base, { lookoutY: world.lookoutY, height: world.height, base });
    st.k = 0;
    return st;
  });
  const stageBoxes = [];
  stages.forEach(st => { st.group.updateMatrixWorld(true); const u = new THREE.Box3(); st.group.traverse(o => { if (!o.isMesh || !o.visible) return; const b = new THREE.Box3().setFromObject(o); if (b.isEmpty() || (b.max.x - b.min.x) * (b.max.z - b.min.z) > 2500 || b.max.y < 0.15 || b.max.z < -58) return; u.union(b); }); stageBoxes.push(u); });
  const town = buildCities(scene, cities, { height: world.height, lite, stops: STOPS, stageBoxes });
  world.setMode('off');
  /* the open world: every street, ramp and deck the towns draw, and the buildings you can't drive through */
  /* round 3: the EUC jump park. park.js builds it inside the End stop's scene; its meshes no longer become walls,
     park-r3.js gives the real surfaces and a few solids instead */
  const PARK_FX = STOPS[LAST].x, parkBase = new THREE.Vector3(PARK_FX, 0, roadZ(PARK_FX) - 22);
  const parkGroup = stages[LAST].group.children.find(c => c.isGroup && Math.abs(c.position.x + parkBase.x) < 1e-3 && Math.abs(c.position.z + parkBase.z) < 1e-3) || null;
  const inParkGroup = o => { for (let q = o; q; q = q.parent) if (q === parkGroup) return true; return false; };
  const parkRide = createParkRide({ fx: PARK_FX, height: world.height });
  const net = createNet({ cities, height: world.height, town, stages, skipMesh: parkGroup ? inParkGroup : null, extraSolids: parkRide.solids });
  /* the park's own riders and spectators: you brush past them softly; they never pop */
  const parkPeople = [];
  if (parkGroup) { const seenR = new Set(); parkGroup.traverse(o => { if (!o.isMesh || !o.material || !o.material.vertexColors) return; let r = o; while (r.parent && r.parent !== parkGroup) r = r.parent; if (!seenR.has(r)) { seenR.add(r); parkPeople.push(r); } }); }   // the sensor overlays belong to the side view; from the seat they only clutter
  const routes = createRoutes({ net, roadZ, xLo: X_LO, xHi: X_HI, mainOff: LANE_B });

  /* the town's lanes and sidewalks, sampled every 1.5 m: pickups are placed clear of them */
  const laneGrid = new Map(), LG = 6;
  town.cities.forEach(b => { const T = b.anim && b.anim.traffic; if (!T || !T.rings) return;
    T.rings.forEach(R => { for (let u = 0; u < R.Lr; u += 1.5) { const f = { R, u }; tPose(f); const k = Math.floor(f.x / LG) * 4096 + Math.floor(f.z / LG); if (!laneGrid.has(k)) laneGrid.set(k, []); laneGrid.get(k).push([f.x, f.y, f.z]); } }); });
  function laneDist(x, z, y, r = 8) {
    let best = 99; const i0 = Math.floor((x - r) / LG), i1 = Math.floor((x + r) / LG), j0 = Math.floor((z - r) / LG), j1 = Math.floor((z + r) / LG);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const L = laneGrid.get(i * 4096 + j); if (!L) continue;
      for (const q of L) { if (y != null && Math.abs(q[1] - y) > 1.6) continue; const d = Math.hypot(q[0] - x, q[2] - z); if (d < best) best = d; } }
    return best;
  }
  /* yielding: a town car or walker about to step into the strip ahead of you waits at the edge, one already in it carries on clear */
  const yieldStats = { holds: 0, spotHolds: 0 };
  function townYield() {
    // live Field notes and pickups in sight: town cars and walkers stop short of them rather than drive through
    const spots = [].concat(notes ? notes.spots() : [], game && game.active && game.spots ? game.spots() : []).filter(q => Math.abs(q.x - camera.position.x) < 230);
    const nearSpot = (x, z, y) => spots.some(q => Math.abs(q.y - y) < 1.6 && (q.x - x) ** 2 + (q.z - z) ** 2 < 2.8 * 2.8);
    const sp = Math.max(0, car.v), fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw), reach = 6 + sp * 1.3;
    const inStrip = (x, z, y) => { const dx = x - car.x, dz = z - car.z, a = dx * fx + dz * fz, l = Math.abs(-dx * fz + dz * fx); return a > -2 && a < reach && l < 2.8 && Math.abs(y - car.y) < 1.6; };
    town.cities.forEach(b => { const T = b.anim && b.anim.traffic; if (!T || !T.movers || car.x < b.x0 - 30 || car.x > b.x1 + 30) return;
      T.movers.forEach(m => {
        if (m.vmax0 == null) m.vmax0 = m.vmax;
        const near = Math.abs(m.x - car.x) < reach + 6 && Math.abs(m.z - car.z) < reach + 6;
        let hold = false;
        const la = Math.max(m.v, 1.5) * 1.2, ax = m.x + m.hx * la, az = m.z + m.hz * la;
        if (near && started && !jumping) hold = !inStrip(m.x, m.z, m.y) && inStrip(ax, az, m.y);
        if (hold && m.vmax) yieldStats.holds++;
        if (!hold && spots.length && !nearSpot(m.x, m.z, m.y) && nearSpot(ax, az, m.y)) { hold = true; if (m.vmax) yieldStats.spotHolds++; }
        m.vmax = hold ? 0 : m.vmax0;
      }); });
  }

  /* NPC limits: at most TOWN_CARS moving cars per town. This runs once, before the first frame is drawn
     (the mode selector is up), so nothing ever vanishes in view. Hidden ones are skipped by every collision. */
  const TOWN_CARS = lite ? 8 : 14;
  const npcStats = { townCars: 0, townCarsHidden: 0, people: 0 };
  town.cities.forEach(b => {
    let moving = 0;
    (b.vSets || []).forEach(({ list }) => list.forEach(q => {
      if (q.park || !q.m) return;
      npcStats.townCars++;
      if (++moving > TOWN_CARS) { q.sc = 0.0001; if (q.sx) q.sx = 0.0001; q.npcOff = true; npcStats.townCarsHidden++; }
    }));
    npcStats.people += (b.anim.people || []).length;
  });

  /* the traffic, for soft bumps: the instanced vehicle meshes the world made */
  const N = lite ? 140 : 300;
  const traffic = [];
  scene.children.forEach(o => {
    if (!o.isInstancedMesh || o.instanceMatrix.count !== N) return;
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox;
    if (bb.max.x - bb.min.x < 3.2) return;
    traffic.push({ m: o, hl: (bb.max.x - bb.min.x) / 2, hw: (bb.max.z - bb.min.z) / 2 });
  });
  /* review fix: Drive mode shows no police cars (the no-police rule). The police mesh and the roof beacons are
     hidden before the first frame, so nothing pops and nothing flashes red and blue. The Road is unchanged. */
  { const pg = vehicleGeo('police'); pg.computeBoundingBox(); const pl = pg.boundingBox.max.x - pg.boundingBox.min.x, pn = pg.attributes.position.count;
    for (let i = traffic.length - 1; i >= 0; i--) { const g = traffic[i].m.geometry;
      if (g.attributes.position.count === pn && Math.abs(traffic[i].hl * 2 - pl) < 0.01) { traffic[i].m.visible = false; traffic.splice(i, 1); } }
    pg.dispose();
    scene.children.forEach(o => { if (o.isInstancedMesh && o.instanceMatrix.count === 60 && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 0.42) o.visible = false; }); }

  /* Mexico and Shanghai: a soft amber light that fades upward, visible from down the road */
  const fade = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const beacons = [];
  STOPS.forEach(s => {
    if (!HIGHLIGHT.has(s.id)) return;
    const h = 38;
    const geo = new THREE.CylinderGeometry(0.55, 1.5, h, 20, 1, true); geo.translate(0, h / 2, 0);
    const m = new THREE.MeshBasicMaterial({ color: '#F2B456', alphaMap: fade, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const col = new THREE.Mesh(geo, m);
    const bx = s.x + 6, bz = roadZ(bx) - 13;
    col.position.set(bx, Math.max(0, world.height(bx, bz)), bz);
    const disc = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.5, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#F2B456', transparent: true, opacity: 0.55, depthWrite: false }));
    disc.position.copy(col.position); disc.position.y += 0.08;
    scene.add(col); scene.add(disc);
    beacons.push({ col, disc, m, dm: disc.material, s });
  });

  /* ---------- the car: Marcin's amber car from The Road, now under your control ---------- */
  const hero = world.hero;
  const ring = hero.group.children.find(c => c.geometry && c.geometry.type === 'RingGeometry');
  /* from the seat you see the front of the amber car, low in the frame; the full car shows in the chase view */
  const hoodM = new THREE.MeshStandardMaterial({ color: '#E8A33D', roughness: 0.55, metalness: 0.05 });
  const hoodG = new THREE.BoxGeometry(1.86, 0.16, 1.5, 1, 1, 1);
  { const p = hoodG.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); if (y > 0) p.setY(i, y - (z < 0 ? 0.08 : 0)); const x = p.getX(i); if (z < 0) p.setX(i, x * 0.94); } hoodG.computeVertexNormals(); }
  const hood = new THREE.Mesh(hoodG, hoodM);
  hood.position.set(0, -0.56, -0.62);
  scene.add(camera); camera.add(hood);
  const car = { x: STOPS[0].x - 18, z: 0, y: 0, yaw: 0, v: 0, steer: 0, pitch: 0, surf: null, slip: 0, boost: 0, hop: 0, vy: 0, yawRate: 0, air: false, vyA: 0, gvy: 0, airH: 1 };
  /* the electric unicycle: hidden until you pick it for a game */
  const euc = createEUC({ scene });
  const bike = createBike({ scene });
  let veh = 'car';                    // the vehicle in use now: the unicycle only in the games, and only after a switch under the veil
  car.z = roadZ(car.x) + LANE_B; car.yaw = -Math.atan(roadDZ(car.x)); car.y = net.ground(car.x, car.z);
  const map = createMinimap({ net, car, stops: STOPS.map(s => ({ x: s.x, hl: HIGHLIGHT.has(s.id) })), roadZ });
  if (map.setOutline) map.setOutline('park', parkRide.outline);      // round 3: the park on the small map
  /* round 3: the easter eggs, and their count in the Glovebox */
  const eggs = createEggs({ car, parkRide, STOPS, roadZ, calm: () => calm, onFound: () => { if (notes && notes.refreshBox) notes.refreshBox(); } });
  const notes = createFieldNotes({ THREE, scene, camera, car, net, routes, map, content: C, calm: () => calm, theme: () => themeName, TOKENS, ctl: document.querySelector('.dv-ctl'), extraHTML: () => eggs.countHTML() });
  /* the parking bay for the bay egg: a painted outline on the ground by the start line, only shown in Field notes and Free play (switched under the veil) */
  const bayMesh = (() => {
    const B = eggs.BAY, g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: '#F2F4F6', transparent: true, opacity: 0.85, depthWrite: false });
    const strip = (w, d, x, z) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m); q.position.set(x, 0, z); g.add(q); };
    strip(B.L + 0.24, 0.12, 0, B.W / 2); strip(B.L + 0.24, 0.12, 0, -B.W / 2); strip(0.12, B.W, B.L / 2, 0); strip(0.12, B.W, -B.L / 2, 0);
    g.position.set(B.x, Math.max(0, world.height(B.x, B.z)) + 0.05, B.z); g.rotation.y = B.yaw; g.visible = false; scene.add(g);
    return g;
  })();
  const mapCss = () => { const T = TOKENS[themeName] || {}; const dusk = themeName === 'dusk';
    return { bg: dusk ? 'rgba(24,28,34,.82)' : 'rgba(250,250,247,.86)', road: dusk ? '#5B6673' : '#AEB8C4', street: dusk ? '#46515D' : '#C9D1DA', walk: dusk ? '#3A434D' : '#DDE3E8', deck: dusk ? '#8A97A6' : '#7F8C9B', stop: dusk ? '#9AA6B4' : '#6F7C8A', accent: T.accent || '#E8A33D', ink: dusk ? '#F2F4F6' : '#1E2124', ring: dusk ? 'rgba(255,255,255,.18)' : 'rgba(30,33,36,.14)' }; };

  /* ---------- theme ---------- */
  let themeName = root.getAttribute('data-theme') === 'dusk' ? 'dusk' : 'day';
  function applyTheme() {
    setTheme(themeName);
    const T = TOKENS[themeName];
    scene.background.set(T.sky);
    scene.fog.color.set(T.fog);
    hemi.color.set(T.hemiSky); hemi.groundColor.set(T.hemiGround); hemi.intensity = T.hemi;
    sun.color.set(T.dirColor); sun.intensity = T.dir;
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', T.sky);
    beacons.forEach(b => { b.m.color.set(T.accent); b.dm.color.set(T.accent); }); hoodM.color.set(T.accent);
  }
  applyTheme();
  $('#b-light').addEventListener('click', () => {
    themeName = themeName === 'day' ? 'dusk' : 'day'; root.setAttribute('data-theme', themeName);
    try { const p = JSON.parse(localStorage.getItem('mf-site-prefs-v7') || '{}'); p.dark = themeName === 'dusk'; localStorage.setItem('mf-site-prefs-v7', JSON.stringify(p)); } catch (e) {}
    applyTheme();
  });

  /* ---------- HUD ---------- */
  const line = $('#dv-line'), carDot = $('#dv-car'), cardEl = $('#dv-card'), capEl = $('#dv-cap');
  const LX0 = STOPS[0].x - 20, LX1 = STOPS[LAST].x + 20;
  const lineAt = x => clamp((x - LX0) / (LX1 - LX0), 0, 1) * 100;
  STOPS.forEach((s, i) => {
    const e = s.era && ERAX[s.era];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dv-tick' + (HIGHLIGHT.has(s.id) ? ' hl' : '') + (i === 0 || i === LAST ? ' end' : '');
    b.style.left = lineAt(s.x) + '%';
    b.style.setProperty('--c', e ? e.color : 'var(--accent)');
    const name = i === 0 ? 'Start' : i === LAST ? 'Finish' : s.title;
    b.dataset.tip = name; b.setAttribute('aria-label', `Jump to ${name}`);
    b.addEventListener('click', () => jumpTo(i));
    line.appendChild(b);
  });

  function setBtn(id, on, title) { const b = $(id); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); if (title) b.title = title; }
  function syncBtns() {
    setBtn('#b-cam', chase, chase ? 'Camera: behind the car (C)' : 'Camera: driver seat (C)');
    setBtn('#b-voice', voiceOn, voiceOn ? 'Narration on (V)' : 'Narration off (V)');
    setBtn('#b-calm', calm, calm ? 'Calm motion on: slower, gentler steering' : 'Calm motion off');
  }
  syncBtns();
  function toggleCam() { chase = !chase; prefs.cam = chase ? 'chase' : 'seat'; savePrefs(); syncBtns(); }
  function toggleVoice() { voiceOn = !voiceOn; syncBtns(); if (!voiceOn) stopVoice(); else if (near >= 0) { voiceFor = -1; playVoice(near); } }
  $('#b-cam').addEventListener('click', toggleCam);
  $('#b-voice').addEventListener('click', () => { if (mode && mode !== 'road') { choose('road', !voiceOn); return; } toggleVoice(); syncModeUI(); });
  $('#b-calm').addEventListener('click', () => { calm = !calm; prefs.calm = calm; savePrefs(); syncBtns(); });
  $('#b-help').addEventListener('click', () => openIntro(true));   // the selector also lists the controls

  /* intro */
  const intro = $('#dv-intro');
  let started = false;
  /* ---------- modes: The Road (drive it, with or without narration), then Games: Learn (Field notes) and
     Just play (Free play, City Chase). Every switch happens under the veil, so nothing pops in view. ---------- */
  const MODES = { road: 'Drive The Road', notes: 'Field notes', free: 'Free play', chase: 'City Chase' };
  let mode = null;
  const modeEl0 = $('#dv-mode');
  function syncModeUI() {
    if (modeEl0) modeEl0.textContent = mode ? MODES[mode] + (mode === 'road' && voiceOn ? ', narrated' : '') : 'Choose a mode';
    document.querySelectorAll('.dv-opt[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === mode && (!!b.dataset.voice) === (mode === 'road' && voiceOn)));
    root.setAttribute('data-drive-mode', mode || '');
    const tag = document.querySelector('#b-modes .dv-mode-tag'); if (tag) tag.textContent = mode ? MODES[mode] : '';   // narrow screens: the mode rides on the Modes button
  }
  function openIntro(again) {
    intro.hidden = false; intro.classList.toggle('again', !!again);
    const on = document.querySelector('.dv-opt.on') || $('#dv-start'); on.focus();
  }
  function begin(withVoice) { choose('road', !!withVoice); }    // kept for the QA hook and older callers
  function applyMode(m, withVoice) {
    if (mode === 'chase' && m !== 'chase') endGame();
    mode = m;
    if (wantVeh() !== veh) applyVehicle(wantVeh());              // under the veil or the selector, never in view
    storiesPaused = m !== 'road';                                 // story cards belong to The Road, not to the games
    if (m === 'road' ? (!!withVoice !== voiceOn) : voiceOn) toggleVoice();
    notes.setActive(m === 'notes');
    bayMesh.visible = m === 'notes' || m === 'free';            // round 3: the bay for the parking egg, switched here under the veil
    eggs.reset(); if (!(m === 'notes' || m === 'free')) eggs.hideToast();
    syncModeUI();
  }
  function choose(m, withVoice, now) {
    intro.hidden = true; started = true;
    canvas.focus && canvas.focus();
    if (m === mode && m !== 'chase' && (m !== 'road' || !!withVoice === voiceOn)) return;
    const go = () => { applyMode(m, withVoice); if (m === 'chase') startGame(); };
    if (now || mode === null) { go(); return; }                     // the first pick: the selector itself was covering the view
    cover(() => { go(); snapCam = true; unveil(200); });
  }
  document.querySelectorAll('.dv-opt[data-mode]').forEach(b => b.addEventListener('click', () => choose(b.dataset.mode, !!b.dataset.voice)));
  $('#b-modes').addEventListener('click', () => openIntro(true));
  $('#dv-start').focus();

  /* touch pedals, for tablets */
  const coarse = matchMedia('(pointer: coarse)').matches;
  const touch = { left: false, right: false, gas: false, brake: false, boost: false };
  if (coarse) {
    const pad = $('#dv-touch'); pad.hidden = false; root.classList.add('dv-coarse');
    pad.querySelectorAll('button').forEach(b => {
      const k = b.dataset.k;
      const on = e => { e.preventDefault(); touch[k] = true; b.classList.add('on'); if (!started) choose('road', false); };
      const off = e => { e.preventDefault(); touch[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
    $('#dv-keys').hidden = true;
  }

  /* keyboard */
  const keys = {};
  const DRIVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ']);
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    held[k] = true; syncCaps();   // round 3: the phantom keys light up
    // round 3: the respawn panel takes the keys while it is open: Enter or R again confirms, Esc cancels, nothing drives
    if (resp.open) {
      if (k === 'escape') { e.preventDefault(); e.stopPropagation(); closeRespawn(); }
      else if ((k === 'enter' && document.activeElement !== respNo) || (k === 'r' && !e.repeat)) { e.preventDefault(); confirmRespawn(); }
      else if (k === 'enter' && document.activeElement === respNo) { e.preventDefault(); closeRespawn(); }
      else if (DRIVE_KEYS.has(k)) e.preventDefault();
      return;
    }
    if (!intro.hidden) {
      if (k === 'escape') { e.preventDefault(); if (started) { intro.hidden = true; canvas.focus && canvas.focus(); } return; }
      if (['w', 'arrowup'].includes(k) && !started) choose('road', false);
      return;
    }
    if (k === 'c' && !e.repeat) toggleCam();
    if (k === 'v' && !e.repeat && mode === 'road') { toggleVoice(); syncModeUI(); }   // narration belongs to The Road
    if (k === 'm' && !e.repeat) map.toggle();
    if (k === 'u' && !e.repeat) toggleVeh();
    if (k === 'b' && !e.repeat && mode === 'notes') notes.toggleBox();
    if (k === 'r' && !e.repeat && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openRespawn(); return; }   // round 3: respawn
    if (k === 'k' && !e.repeat && !e.ctrlKey && !e.metaKey && finePointer && GAME_MODES.has(mode)) setKeysPref(!keysPref);   // round 3: show or hide the key panel
    if (k === 'escape') { openIntro(true); return; }
    if (DRIVE_KEYS.has(k)) { keys[k] = true; if (k.startsWith('arrow') || k === ' ') e.preventDefault(); }
  });
  addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (!mouseHeld[k]) keys[k] = false; held[k] = false; syncCaps(); });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const k in held) held[k] = false; syncCaps(); });

  /* gamepad */
  let padCamWas = false;
  function readPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const ax = Math.abs(p.axes[0]) > 0.12 ? p.axes[0] : 0;
      const rt = p.buttons[7] ? p.buttons[7].value : 0, lt = p.buttons[6] ? p.buttons[6].value : 0;
      const a = p.buttons[0] && p.buttons[0].pressed ? 1 : 0, b = p.buttons[1] && p.buttons[1].pressed ? 1 : 0;
      const y = p.buttons[3] && p.buttons[3].pressed;
      if (y && !padCamWas) toggleCam(); padCamWas = !!y;
      if ((rt > 0.05 || a) && !started) choose('road', false);
      const boost = !!(p.buttons[5] && p.buttons[5].pressed), hand = !!(p.buttons[2] && p.buttons[2].pressed);   // right bumper boosts, X is the handbrake or the hop
      return { steer: -ax, gas: Math.max(rt, a), brake: Math.max(lt, b), boost, hand };
    }
    return null;
  }

  /* ---------- jumping to a stop from the line: a quick fade, then you are parked at its curb ---------- */
  const veil = $('#dv-veil');
  let jumping = false;
  /* round 2: the veil lifts only after two frames have been drawn with the change, then a short hold, so on a slow
     device too the new view (or vehicle) is already in place under the veil and nothing pops in view */
  let drawnN = 0, veilGen = 0;
  /* the veil comes up, and the change waits until it is fully opaque (at least the usual 0.12 or 0.28 s) */
  function cover(f) {
    const g = ++veilGen;
    veil.classList.add('on');
    const t0 = performance.now(), min = calm ? 120 : 280;
    const wait = () => { if (g !== veilGen) return; const dtm = performance.now() - t0; if ((dtm >= min && parseFloat(getComputedStyle(veil).opacity) >= 0.99) || dtm > 1500) f(); else requestAnimationFrame(wait); };
    setTimeout(() => requestAnimationFrame(wait), Math.max(0, min - 20));
  }
  function unveil(hold, then) {
    const g = veilGen, n0 = drawnN, t0 = performance.now();
    const wait = () => {
      if (g !== veilGen) { if (then) then(); return; }
      if (drawnN >= n0 + 2 || performance.now() - t0 > 2000) setTimeout(() => { if (g === veilGen) veil.classList.remove('on'); if (then) then(); }, hold);
      else requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
  }
  function jumpTo(i) {
    if (jumping || (game && game.active)) return;
    if (!started) choose('road', false, true);
    jumping = true; jumpsTo++;
    cover(() => {
      const x = Math.max(X_LO + 2, STOPS[i].x - 26);
      car.x = x; car.z = roadZ(x) + LANE_B; car.yaw = -Math.atan(roadDZ(x)); car.v = 0; car.steer = 0; car.y = net.ground(car.x, car.z); car.pitch = 0;
      car.air = false; car.vyA = 0; car.gvy = 0; car.airH = 1; jumpNow = null; car.surf = null;
      snapCam = true;
      unveil(260, () => { jumping = false; });
    });
  }

  /* ---------- the vehicle: car or electric unicycle (games only), always switched under the veil ---------- */
  function underVeil(f) { cover(() => { f(); snapCam = true; unveil(200); }); }
  function wantVeh() { return GAME_MODES.has(mode) ? vehPref : 'car'; }
  let vehSwitches = 0, jumpsTo = 0;
  function applyVehicle(w) {
    if (veh !== w) vehSwitches++;
    veh = w; car.air = false; car.vyA = 0; car.gvy = 0; car.airH = 1; jumpNow = null;
    car.slip = 0; car.boost = 0; car.hop = 0; car.vy = 0; car.yawRate = 0;
    car.v = clamp(car.v, VEH[w].vrev, VEH[w].vmax);
    hero.group.visible = false; euc.group.visible = false; bike.group.visible = false; hood.visible = false;   // the next frame shows the right one, still under the veil
    snapCam = true; syncVehUI();
  }
  let vehBusy = false;
  function setVehPref(w) {
    if (vehBusy) return;
    vehPref = (w === 'euc' || w === 'bike') ? w : 'car'; saveVeh(); syncVehUI();
    if (wantVeh() === veh) return;
    if (!started || mode === null) { applyVehicle(wantVeh()); return; }
    vehBusy = true; cover(() => { applyVehicle(wantVeh()); snapCam = true; unveil(200, () => { vehBusy = false; }); });
  }
  function toggleVeh() { if (GAME_MODES.has(mode)) { const next = vehPref === 'car' ? 'euc' : vehPref === 'euc' ? 'bike' : 'car'; setVehPref(next); } }
  function syncVehUI() {
    root.setAttribute('data-vehicle', veh);
    root.setAttribute('data-veh-pref', vehPref);
    const b = $('#b-veh');
    if (b) {
      const titles = { car: 'Driving the car. Switch to the electric unicycle (U)', euc: 'Riding the electric unicycle. Switch to the bike (U)', bike: 'Riding the bike. Switch to the car (U)' };
      b.setAttribute('aria-pressed', String(vehPref !== 'car')); b.classList.toggle('on', vehPref !== 'car'); b.title = titles[vehPref] || titles.car;
    }
    document.querySelectorAll('.dv-veh[data-veh]').forEach(x => { const on = x.dataset.veh === vehPref; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  }
  document.querySelectorAll('.dv-veh[data-veh]').forEach(x => x.addEventListener('click', () => setVehPref(x.dataset.veh)));
  { const b = $('#b-veh'); if (b) b.addEventListener('click', toggleVeh); }
  syncVehUI();

  /* ---------- round 3: R to respawn on the nearest straight stretch of the main road ---------- */
  const resp = { open: false, busy: false, log: [], count: 0, lastFocus: null };
  const respEl = document.createElement('div'); respEl.className = 'r3-resp'; respEl.hidden = true;
  respEl.innerHTML = `<div class="r3-resp-in" role="dialog" aria-modal="true" aria-labelledby="r3-resp-h" aria-describedby="r3-resp-p">
    <h2 id="r3-resp-h">Back to the road?</h2>
    <p id="r3-resp-p">You'll be placed on the nearest straight stretch of the main road.</p>
    <div class="r3-resp-go"><button type="button" class="primary" data-r="go">Respawn</button><button type="button" data-r="no">Cancel</button></div>
  </div>`;
  document.body.appendChild(respEl);
  const respGo = respEl.querySelector('[data-r="go"]'), respNo = respEl.querySelector('[data-r="no"]');
  respGo.addEventListener('click', () => confirmRespawn());
  respNo.addEventListener('click', () => closeRespawn());
  respEl.addEventListener('pointerdown', e => { if (e.target === respEl) { e.preventDefault(); closeRespawn(); } });   // a click outside the panel cancels
  respEl.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === respGo ? respNo : respGo).focus(); } });
  function canRespawn() { return started && intro.hidden && mode !== null && !jumping && !resp.busy && !vehBusy && !document.querySelector('.chase-end'); }
  function openRespawn() {
    if (resp.open || !canRespawn()) return false;
    if (notes.boxOpen) notes.closeBox();
    resp.open = true; resp.lastFocus = document.activeElement;
    for (const k in keys) keys[k] = false;
    respEl.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => respEl.classList.add('on')));
    respGo.focus();
    return true;
  }
  function closeRespawn(then) {
    if (!resp.open) return;
    resp.open = false; respEl.classList.remove('on');
    setTimeout(() => { if (!resp.open) respEl.hidden = true; }, calm ? 0 : 220);
    const f = resp.lastFocus; resp.lastFocus = null;
    if (f && f !== document.body && document.contains(f) && f.focus && !respEl.contains(f)) f.focus(); else if (document.activeElement && respEl.contains(document.activeElement)) document.activeElement.blur();
    if (then) then();
  }
  function confirmRespawn() { if (!resp.open || resp.busy) return; closeRespawn(); doRespawn(); }
  /* where: the nearest point on the main road, then along the road to the nearest straight, flat stretch that is
     clear of ramps, decks, bridge approaches and gantries, and 25 m clear of town cars and walkers */
  const keepRamp = [], keepOver = [];
  net.edges.forEach(e => { if (!e.elev) return; e.pts.forEach(q => { if (Math.abs(q[2] - roadZ(q[0])) < 24) keepRamp.push(q[0]); }); });   // ramp feet, decks and bridge approaches near the road
  (net.overRoad || []).forEach(x => keepOver.push(x));                                                                         // gates and gantries over the road
  keepRamp.sort((a, b) => a - b); keepOver.sort((a, b) => a - b);
  const nearIn = (L, x, r) => { let lo = 0, hi = L.length; while (lo < hi) { const m = (lo + hi) >> 1; if (L[m] < x - r) lo = m + 1; else hi = m; } return lo < L.length && L[lo] <= x + r; };
  const nearKeep = x => nearIn(keepRamp, x, 25) || nearIn(keepOver, x, 12);
  const curv = x => { const h = 1, d1 = (roadZ(x + h) - roadZ(x - h)) / (2 * h), d2 = (roadZ(x + h) - 2 * roadZ(x) + roadZ(x - h)) / (h * h); return Math.abs(d2) / Math.pow(1 + d1 * d1, 1.5); };
  function npcClear(x, z) {
    let d = 1e9;
    town.cities.forEach(b => {
      if (x < b.x0 - 60 || x > b.x1 + 60) return;
      (b.vSets || []).forEach(({ list }) => list.forEach(q => { if (q.npcOff) return; const m = q.m, qx = m ? m.x : q.x, qz = m ? m.z : q.z; if (qx == null) return; d = Math.min(d, Math.hypot(qx - x, qz - z)); }));
      (b.anim.people || []).forEach(q => { const qx = q.m ? q.m.x : q.x0, qz = q.m ? q.m.z : q.z; if (qx == null) return; d = Math.min(d, Math.hypot(qx - x, qz - z)); });
    });
    return d;
  }
  function trafficClear(x, z) {
    let d = 1e9;
    traffic.forEach(T => { const a = T.m.instanceMatrix.array; for (let i = 0; i < T.m.count; i++) { const o = i * 16, tx = a[o + 12]; if (Math.abs(tx - x) > 80) continue; d = Math.min(d, Math.hypot(tx - x, a[o + 14] - z)); } });
    return d;
  }
  const K_STRAIGHT = 0.0055;          // "straight": a turning radius of 180 m or more over 24 m of road (the road always bends a little)
  function spotOK(x) {
    if (x < X_LO + 30 || x > X_HI - 30) return null;
    const k = Math.max(curv(x - 12), curv(x), curv(x + 12));
    if (k > K_STRAIGHT) return null;
    const z = roadZ(x) + LANE_B, y0 = net.ground(x, z);
    if (Math.abs(net.ground(x + 8, roadZ(x + 8) + LANE_B) - y0) > 0.3 || Math.abs(net.ground(x - 8, roadZ(x - 8) + LANE_B) - y0) > 0.3) return null;   // flat
    if (nearKeep(x)) return null;                                                 // ramps, decks, bridge approaches, gantries
    const s = net.surfaces(x, z); if (s.some(q => q.elev && Math.abs(q.y - y0) < 6)) return null;
    let blocked = false; net.solidsNear(x, z, b => { if (b.y0 < y0 + 5) { const dx = x - b.x, dz = z - b.z; if (Math.abs(dx * b.ux + dz * b.uz) < b.hl + 3 && Math.abs(-dx * b.uz + dz * b.ux) < b.hw + 3) blocked = true; } });
    if (blocked) return null;
    const npc = npcClear(x, z); if (npc < 25) return null;
    return { x, z, y: y0, k, npc };
  }
  function findRespawn(cx, cz) {
    // the nearest point on the main road's centre line
    let x0 = clamp(cx, X_LO, X_HI), bd = 1e18;
    for (let x = cx - 60; x <= cx + 60; x += 0.5) { const d = (x - cx) ** 2 + (roadZ(x) - cz) ** 2; if (d < bd && x >= X_LO && x <= X_HI) { bd = d; x0 = x; } }
    // Claude: first look within 80 m for a spot that is also 25 m clear of road traffic, so a car is not right on you
    for (let k = 0; k <= 40; k++) for (const sg of k ? [1, -1] : [1]) { const q = spotOK(x0 + sg * k * 2); if (q && trafficClear(q.x, q.z) >= 25) return Object.assign(q, { from: { x: +x0.toFixed(1), d: +Math.sqrt(bd).toFixed(1) }, along: k * 2 * sg }); }
    for (let k = 0; k <= 600; k++) for (const sg of k ? [1, -1] : [1]) { const q = spotOK(x0 + sg * k * 2); if (q) return Object.assign(q, { from: { x: +x0.toFixed(1), d: +Math.sqrt(bd).toFixed(1) }, along: k * 2 * sg }); }
    const x = clamp(x0, X_LO + 40, X_HI - 40); return { x, z: roadZ(x) + LANE_B, y: net.ground(x, roadZ(x) + LANE_B), k: curv(x), npc: npcClear(x, roadZ(x) + LANE_B), from: { x: x0, d: Math.sqrt(bd) }, along: 0, fallback: true };
  }
  function doRespawn() {
    if (resp.busy) return;
    resp.busy = true;
    const from = { x: +car.x.toFixed(1), z: +car.z.toFixed(1), y: +car.y.toFixed(1), surf: car.surf && car.surf.kind };
    cover(() => {
      const q = findRespawn(car.x, car.z);
      const back = q.x > STOPS[LAST].x + 10;                 // past the End stop there is no next stop: face back toward it
      const op = parseFloat(getComputedStyle(veil).opacity);
      car.x = q.x; car.z = q.z; car.y = q.y; car.yaw = -Math.atan(roadDZ(q.x)) + (back ? Math.PI : 0);
      car.v = 0; car.steer = 0; car.boost = 0; car.slip = 0; car.hop = 0; car.vy = 0; car.yawRate = 0; car.pitch = 0;
      car.air = false; car.vyA = 0; car.gvy = 0; car.airH = 1; car.surf = null; jumpNow = null;
      phys.stuckT = 0; phys.blockT = 0; stuckHint.anchor = null; showHint(false);
      snapCam = true; placeCamera(1); camera.updateMatrixWorld();
      const ch = game && game.active && game.respawned ? game.respawned() : null;
      resp.count++;
      const rec = { from, to: { x: +q.x.toFixed(1), z: +q.z.toFixed(1) }, dCenter: +Math.abs(q.z - roadZ(q.x)).toFixed(2), curvature: +q.k.toFixed(5), npcClear: +Math.min(q.npc, 999).toFixed(1), trafficClear: +Math.min(trafficClear(q.x, q.z), 999).toFixed(1),
        heading: +car.yaw.toFixed(3), roadHeading: +(-Math.atan(roadDZ(q.x))).toFixed(3), back, veilOpacity: op, along: q.along, fallback: !!q.fallback, veh, mode, chaser: ch };
      if (resp.log.length < 100) resp.log.push(rec);
      unveil(260, () => { resp.busy = false; });
    });
  }
  /* the stuck hint: gas held for 6 s without getting anywhere */
  const hintEl = document.createElement('p'); hintEl.className = 'r3-hint'; hintEl.setAttribute('aria-live', 'polite'); hintEl.hidden = true; document.body.appendChild(hintEl);
  const stuckHint = { anchor: null, on: false, shown: 0 };
  function showHint(on) {
    if (on === stuckHint.on) return;
    stuckHint.on = on;
    if (on) { stuckHint.shown++; hintEl.textContent = coarse ? 'Stuck? Tap Respawn' : 'Stuck? Press R to get back on the road'; hintEl.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => hintEl.classList.add('on'))); }
    else { hintEl.classList.remove('on'); setTimeout(() => { if (!stuckHint.on) hintEl.hidden = true; }, 400); }
  }
  function updateStuck() {
    const playing = started && intro.hidden && !resp.open && !resp.busy && !jumping;
    if (!playing) { stuckHint.anchor = null; if (resp.open || !intro.hidden) showHint(false); return; }
    const A = stuckHint.anchor;
    if (A && Math.hypot(car.x - A.x, car.z - A.z) > 4) { stuckHint.anchor = null; showHint(false); }
    if (drvIn.gas > 0) { if (!stuckHint.anchor) stuckHint.anchor = { x: car.x, z: car.z, t }; else if (t - stuckHint.anchor.t > 6) showHint(true); }
    else if (stuckHint.anchor && !stuckHint.on) stuckHint.anchor = null;
  }
  /* touch tablets: a small Respawn button next to the steering arrows */
  if (coarse) {
    const st = document.querySelector('#dv-touch .dv-steer');
    if (st) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'r3-respawn'; b.setAttribute('aria-label', 'Respawn'); b.title = 'Respawn';
      b.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4.5h-4.5"/></svg>`;
      b.addEventListener('click', e => { e.preventDefault(); openRespawn(); });
      st.appendChild(b);
    }
  }

  /* ---------- round 3: the on-screen keys, for the games on a laptop or desktop ---------- */
  const KKEY = 'mf-drive-keys-v1';
  let keysPref = (() => { try { return localStorage.getItem(KKEY) !== 'off'; } catch (e) { return true; } })();
  const saveKeys = () => { try { localStorage.setItem(KKEY, keysPref ? 'on' : 'off'); } catch (e) {} };
  const finePointer = matchMedia('(pointer: fine)').matches && !coarse;
  const held = {};                      // every key held on the real keyboard, for the phantom keys
  const mouseHeld = {};
  const ARROW = { arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd' };
  const kp = document.createElement('div'); kp.className = 'r3-keys'; kp.setAttribute('role', 'group'); kp.setAttribute('aria-label', 'On-screen keys'); kp.hidden = true;
  const cap = (k, label, sub, cls = '') => `<button type="button" tabindex="-1" class="r3-cap ${cls}" data-key="${k}" aria-label="${sub ? label + ' ' + sub : label}"><kbd>${label}</kbd>${sub ? `<span>${sub}</span>` : ''}</button>`;
  kp.innerHTML = `<div class="r3-pad">
      <div class="r3-t">${cap('arrowup', '↑', '', 'r3-arrow')}</div>
      <div class="r3-t">${cap('arrowleft', '←', '', 'r3-arrow')}${cap('arrowdown', '↓', '', 'r3-arrow')}${cap('arrowright', '→', '', 'r3-arrow')}</div>
      <p class="r3-lab">Arrows or WASD</p>
    </div>
    <div class="r3-more">
      ${cap('shift', 'Shift', 'Boost', 'r3-wide')}${cap(' ', 'Space', 'Handbrake', 'r3-wide r3-space')}
      ${cap('u', 'U', 'Switch ride')}${cap('r', 'R', 'Respawn')}${cap('c', 'C', 'Camera')}${cap('m', 'M', 'Map')}${cap('b', 'B', 'Glovebox', 'r3-notes')}${cap('escape', 'Esc', 'Modes')}
    </div>
    <button type="button" tabindex="-1" class="r3-hide" data-hide="1">Hide keys <kbd>K</kbd></button>`;
  document.body.appendChild(kp);
  const capEls = [...kp.querySelectorAll('.r3-cap')];
  const spaceSub = kp.querySelector('.r3-space span');
  function capLit(k) {
    if (k in ARROW) return !!(held[k] || held[ARROW[k]] || mouseHeld[k]);
    return !!(held[k] || mouseHeld[k]);
  }
  function syncCaps() { capEls.forEach(b => { const on = capLit(b.dataset.key); if (b.classList.contains('lit') !== on) b.classList.toggle('lit', on); }); }
  /* the action keys, the same as on the keyboard */
  function keyAction(k) {
    if (k === 'c') toggleCam();
    else if (k === 'm') map.toggle();
    else if (k === 'u') toggleVeh();
    else if (k === 'b' && mode === 'notes') notes.toggleBox();
    else if (k === 'r') openRespawn();
    else if (k === 'escape') openIntro(true);
  }
  const HOLD = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ']);
  capEls.forEach(b => {
    const k = b.dataset.key;
    const down = e => {
      e.preventDefault();                 // a click never takes the keyboard focus from the game
      if (e.button != null && e.button !== 0) return;
      mouseHeld[k] = true; syncCaps();
      if (HOLD.has(k)) keys[k] = true; else keyAction(k);
    };
    const up = () => { if (!mouseHeld[k]) return; mouseHeld[k] = false; syncCaps(); if (HOLD.has(k) && !held[k]) keys[k] = false; };
    b.addEventListener('pointerdown', down); b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  });
  kp.querySelector('.r3-hide').addEventListener('pointerdown', e => { e.preventDefault(); setKeysPref(false); });
  kp.querySelector('.r3-hide').addEventListener('mousedown', e => e.preventDefault());
  function setKeysPref(on) { keysPref = !!on; saveKeys(); syncKeysUI(); }
  let kpOn = false, kpSpace = '';
  function keysWanted() {
    return finePointer && !isPhone() && keysPref && GAME_MODES.has(mode) && started && intro.hidden && !resp.open && !notes.boxOpen && !document.querySelector('.chase-end');
  }
  function syncKeysUI() {
    const on = keysWanted();
    const sp = veh === 'car' ? 'Handbrake' : 'Hop';
    if (sp !== kpSpace) { kpSpace = sp; spaceSub.textContent = sp; kp.querySelector('.r3-space').setAttribute('aria-label', 'Space ' + sp); }
    kp.classList.toggle('r3-in-notes', mode === 'notes');
    root.classList.toggle('r3-calm', !!calm);
    if (on === kpOn) return;
    kpOn = on;
    if (on) { kp.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => { if (kpOn) kp.classList.add('on'); })); }
    else { kp.classList.remove('on'); for (const k in mouseHeld) if (mouseHeld[k]) { mouseHeld[k] = false; if (HOLD.has(k) && !held[k]) keys[k] = false; } syncCaps(); setTimeout(() => { if (!kpOn) kp.hidden = true; }, calm ? 0 : 260); }
  }

  /* ---------- story card ---------- */
  let near = -1, shown = -1, lastCap = '';
  function winsHTML(s) {
    const w = (s.wins || []).filter(x => x && (x.big || x.text)).slice(0, 3);
    return w.length ? `<ul class="dv-wins">${w.map(x => `<li><b>${esc(x.big || '')}</b><span>${md(x.text || '')}</span></li>`).join('')}</ul>` : '';
  }
  function cardHTML(s) {
    const i = s.i, e = s.era && ERA[s.era];
    const tag = i === 0 ? (s.kicker || 'The Road') : i === LAST ? (s.kicker || 'Open to new roles') : e ? `${e.n}. ${e.short || e.label}` : '';
    const meta = [s.place, s.span].filter(Boolean).map(esc).join(' · ');
    const color = e && ERAX[s.era] ? ERAX[s.era].color : 'var(--accent)';
    const star = HIGHLIGHT.has(s.id) ? '<span class="dv-star">Highlight</span>' : '';
    let links;
    if (i === LAST) links = `<a href="assets/resume.pdf" target="_blank" rel="noopener" class="primary">Resume</a><a href="index.html#contact">Contact</a><a href="road.html#${esc(s.id)}">Back to The Road</a>`;
    else if (i === 0) links = `<span class="dv-hint">Drive on: the first stop is just ahead.</span>`;
    else links = `<a href="road.html#${esc(s.id)}" target="_blank" rel="noopener">Full story on The Road</a>`;
    const body = (i === 0 || i === LAST) ? `<p class="dv-what">${md(s.what || '')}</p>` : '';
    return `<p class="dv-tag" style="--c:${color}">${esc(tag)}${star}</p>
      <h2>${md(i === 0 ? (s.tag || s.title) : s.title)}</h2>
      ${i > 0 && i < LAST ? `<p class="dv-role">${md(s.role || '')}</p>${meta ? `<p class="dv-meta">${meta}</p>` : ''}` : `<p class="dv-role">${md(s.role || '')}</p>`}
      ${body}${winsHTML(s)}
      <p class="dv-links">${links}</p>`;
  }
  // the tour's caption, minus any line about the tour's own buttons
  function capText(i) {
    const c = Tour.caps[capId(i)] || '';
    return (c.match(/[^.!?]+[.!?]+/g) || [c]).filter(x => !/\b(tour|tap|click)\b/i.test(x)).join('').trim();
  }
  function updateCard() {
    let best = -1, bd = 1e9;
    STOPS.forEach((s, i) => { const d = Math.abs(car.x - s.x) + Math.max(0, Math.abs(car.z - roadZ(s.x)) - 10); if (d < bd) { bd = d; best = i; } });
    const r = best === LAST ? STOP_R + 14 : STOP_R;
    let nn = bd < r ? best : (near >= 0 && bd < r + 10 && best === near ? near : -1);   // a little hysteresis so the card never flickers
    if (storiesPaused) nn = -1;   // the chase game keeps the road clear of story cards
    if (nn !== near) {
      near = nn;
      if (near >= 0) {
        if (shown !== near) { cardEl.innerHTML = cardHTML(STOPS[near]); shown = near; }
        cardEl.hidden = false; requestAnimationFrame(() => cardEl.classList.add('on'));
        playVoice(near);
      } else {
        cardEl.classList.remove('on');
        setTimeout(() => { if (near < 0) cardEl.hidden = true; }, 320);
        if (voiceFor >= 0 && Math.abs(car.x - STOPS[voiceFor].x) > 70) stopVoice();
      }
    }
    if (voiceFor >= 0 && near < 0 && Math.abs(car.x - STOPS[voiceFor].x) > 70) stopVoice();
    /* the narration line: the audio tour's caption for the stop you are at */
    const cap = near >= 0 ? capText(near) : '';
    if (cap !== lastCap) { lastCap = cap; capEl.textContent = cap; capEl.classList.toggle('on', !!cap); }
  }

  /* ---------- sizing ---------- */
  let W = 0, H = 0, fovNow = 58;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; fovNow = W < H ? 72 : 58; hood.position.y = W < H ? -0.66 : -0.56;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  /* ---------- the chase game (Phase 2): loaded only when asked for ---------- */
  let game = null, storiesPaused = false;
  const fx = [];                      // { f, until } speed effects from the game
  const speedMul = () => { let m = 1; for (let i = fx.length - 1; i >= 0; i--) { if (fx[i].until <= t) fx.splice(i, 1); else m *= fx[i].f; } return Math.min(m, 1.4); };   // boosts never stack past 1.4x
  const gameBtn = $('#b-game');
  function syncGame() {
    const on = !!(game && game.active);
    gameBtn.textContent = on ? 'End chase' : 'Chase game';
    gameBtn.classList.toggle('on', on);
    syncModeUI();
  }
  function endGame() { if (game && game.active) game.stop(); fx.length = 0; syncGame(); }
  async function startGame() {
    if (!started) { started = true; intro.hidden = true; }
    if (mode !== 'chase') applyMode('chase');
    if (!game) {
      if (!document.querySelector('link[href*="chase.css"]')) {
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'road/chase.css?v=1'; document.head.appendChild(l);
      }
      if (!document.querySelector('link[href*="chase-next.css"]')) {
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'road/chase-next.css?v=2'; document.head.appendChild(l);
      }
      const hudBox = document.createElement('div'); hudBox.className = 'dv-chase'; document.body.appendChild(hudBox);
      const { createChase } = await import('./chase-r3.js?v=1');
      // the end screen's buttons: a new round or Free play, each under the veil so the old round never vanishes in view
      const underVeil = f => cover(() => { f(); snapCam = true; unveil(200); });
      game = createChase({
        THREE, scene, camera, car, roadZ, roadDZ, CURB, xMin: X_LO, xMax: X_HI, net, routes, map,
        stops: STOPS.map(s => ({ id: s.id, x: s.x, title: s.title })),
        slow: (f, sec) => fx.push({ f, until: t + sec }),
        boost: (f, sec) => fx.push({ f, until: t + sec }),
        hud: hudBox, theme: () => themeName, TOKENS, calm: () => calm,
        pauseStories: () => {},
        exit: () => { fx.length = 0; syncGame(); },
        again: () => underVeil(() => { game.stop(); fx.length = 0; game.start(); syncGame(); }),
        free: () => underVeil(() => { game.stop(); fx.length = 0; applyMode('free'); syncGame(); }),
        links: { resume: 'assets/resume.pdf', contact: 'index.html#contact' },
        laneDist,   // pickups keep clear of the town's lanes and sidewalks
        skills: true, skillLabels: [...new Set(NOTES.map(n => n.skill))],   // Marcin picked skill labels back (Nov 20): each pickup names a skill, the end screen lists them
        groundY: (x, z) => Math.max(0, world.height(x, z))
      });
    }
    if (game.active) game.stop();
    fx.length = 0;
    // the chaser must start out of sight behind you: near the start line there is no road behind, so the round
    // begins a little further on (this runs under the veil or the selector, never in view)
    if (car.x < X_LO + 300 || car.x > X_HI - 300) { const x = car.x < X_LO + 300 ? X_LO + 320 : X_HI - 320; car.x = x; car.z = roadZ(x) + LANE_B; car.yaw = -Math.atan(roadDZ(x)); car.v = 0; car.steer = 0; car.y = net.ground(car.x, car.z); car.pitch = 0; car.surf = null; snapCam = true; placeCamera(1); camera.updateMatrixWorld(); }
    game.start(); syncGame();
  }
  gameBtn.addEventListener('click', () => { if (game && game.active) choose('free'); else choose('chase'); });

  /* ---------- physics: arcade, forgiving, no damage ---------- */
  const fwd = new THREE.Vector3();
  /* contact helpers (v3): lose speed only for the part of the hit that is head-on, and ease the nose along
     the wall, deck edge or car you touched, so you slide clear instead of sticking or juddering */
  const phys = { stuckT: 0, stuck: 0, stuckLog: [], ghost: 0, npcHits: 0, npcBlocks: 0, npcContact: false, wallHits: 0, blockT: 0, hitLog: [], parkHits: [], jumps: [] };
  function turnToward(a, dt, rate) {
    let d = a - car.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) > Math.PI / 2) { d += d > 0 ? -Math.PI : Math.PI; }        // whichever way along it is closer
    car.yaw += clamp(d, -rate * dt, rate * dt);
  }
  function contact(nx, nz, dt, loss) {
    const fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw), into = -(fx * nx + fz * nz) * Math.sign(car.v || 1);
    if (into > 0) car.v *= 1 - Math.min(0.6, dt * loss * into);
    // the nose eases along the tangent, (nz, -nx) as a heading, only when you are rolling and not steering yourself
    if (into > 0 && into < 0.9 && Math.abs(car.v) > 3 && Math.abs(car.steer) < 0.3) turnToward(Math.atan2(nx, nz), dt, 2.2);
  }
  function alignToEdge(e, dt) {
    let bi = 0, bd = 1e9; const P = e.pts;
    for (let i = 0; i < P.length; i += 2) { const d = (P[i][0] - car.x) ** 2 + (P[i][2] - car.z) ** 2; if (d < bd) { bd = d; bi = i; } }
    const a = P[Math.max(0, bi - 2)], b = P[Math.min(P.length - 1, bi + 2)];
    turnToward(Math.atan2(-(b[2] - a[2]), b[0] - a[0]), dt, 2.6);
  }
  const mv = new THREE.Vector3();
  function nudgeIn(e, dt) {
    let bd = 1e9, q = null;
    for (const P of e.pts) { const d = (P[0] - car.x) ** 2 + (P[2] - car.z) ** 2; if (d < bd) { bd = d; q = P; } }
    const d = Math.sqrt(bd); if (!q || d < 0.3) return;
    const k = Math.min(d - 0.2, 1.5 * dt), nx = car.x + (q[0] - car.x) / d * k, nz = car.z + (q[2] - car.z) / d * k;
    const s2 = net.surface(nx, nz, car.y, e); if (s2 && s2.kind !== 'water') { car.x = nx; car.z = nz; }
  }
  /* round 3: the park's ground. You follow the dirt, the kickers and the berms; where the ground falls away faster
     than a jump would (a kicker's lip, the back of a roller) you leave it on an arcade arc: gravity 14 m/s^2 like the
     hop, the kicker turns part of your speed into lift, and you land smoothly. A heavy landing scrubs speed, nothing more. */
  const G_AIR = 14;
  let jumpNow = null;
  function parkHeight(dt) {
    const pk = parkRide.top(car.x, car.z, car.y, car.air && car.vyA > 0), h = pk.y;
    if (car.air) {
      car.vyA -= G_AIR * dt; car.y += car.vyA * dt; jumpNow.t += dt;
      const gy = Math.max(0, world.height(car.x, car.z));
      jumpNow.maxH = Math.max(jumpNow.maxH, car.y - gy);
      const B = parkRide.bus;
      if (car.x > B.x0 && car.x < B.x1 && car.z > B.z0 && car.z < B.z1) { jumpNow.overBus = true; if (car.vyA <= 0) jumpNow.busClear = Math.min(jumpNow.busClear, car.y - B.top); }   // clearance on the way down
      if (car.y <= h) land(pk);
      return;
    }
    const gv = (h - car.y) / Math.max(dt, 1e-4);
    const lv = car.gvy;
    if (lv > 0.6 && Math.abs(car.v) > 2 && h < car.y + lv * dt - 0.5 * G_AIR * dt * dt - 0.004) { launch(lv); return; }
    car.y = h; car.gvy = clamp(gv, -30, 30);
  }
  function launch(lv) {
    const sp = Math.abs(car.v), a = Math.min(Math.atan2(lv, sp), 0.8);
    // a kicker sends you up on a steep, slow arc (the park's own riders fly the same way); a roller only lifts you a little.
    // tuned so the second kicker clears the bus from about 20 m/s: the unicycle's boost, not its plain top speed
    const f = smooth(0.15, 0.7, a);
    car.air = true; car.vyA = lerp(1, 0.38, f) * sp * Math.sin(a); car.airH = lerp(1, 0.3, f);
    let kicker = '';
    const r = parkRide.onRibbon('loop', car.x, car.z);
    if (r) { if (Math.abs(r.s - parkRide.K1.lip) < 1.5) kicker = 'K1'; else if (Math.abs(r.s - parkRide.K2.lip) < 1.5) kicker = 'K2'; }
    jumpNow = { veh, kicker, launchV: +sp.toFixed(1), angle: +(a * 180 / Math.PI).toFixed(0), vy: +car.vyA.toFixed(2), x0: car.x, z0: car.z, y0: car.y, t: 0, maxH: 0, overBus: false, busClear: 99, arms: [] };
    if (veh === 'euc') jumpNow.arms.push(['air', euc.armReport()]);
    else if (veh === 'bike') jumpNow.arms.push(['air', bike.armReport()]);
  }
  function land(pk) {
    const vy = car.vyA;
    car.y = pk.y; car.air = false; car.airH = 1; car.gvy = 0; car.vyA = 0;
    // a landing on a downslope going your way, or a soft one, keeps most of your speed; a heavy flat one scrubs more
    const f = parkRide.top(car.x + Math.cos(car.yaw) * 1.2, car.z - Math.sin(car.yaw) * 1.2, car.y + 0.3).y - pk.y;
    const down = f < -0.15, hard = -vy;
    const good = pk.on !== 'bus' && (down || hard < 8);
    car.v *= good ? 0.94 : clamp(1 - (hard - 6) * 0.06, 0.5, 0.85);
    const j = Object.assign(jumpNow || {}, { airT: +((jumpNow && jumpNow.t) || 0).toFixed(2), maxH: +((jumpNow && jumpNow.maxH) || 0).toFixed(2), landV: +Math.abs(car.v).toFixed(1), impact: +hard.toFixed(1), good, landOn: pk.on, onBus: pk.on === 'bus', dist: jumpNow ? +Math.hypot(car.x - jumpNow.x0, car.z - jumpNow.z0).toFixed(1) : 0, busClear: jumpNow && jumpNow.overBus ? +jumpNow.busClear.toFixed(2) : null });
    if (phys.jumps.length < 300) phys.jumps.push(j);
    eggs.landed(j, { mode, veh, t });
    landPending = veh !== 'car' ? j : null;     // the arms are measured on the next drawn pose too
    jumpNow = null;
  }
  let landPending = null;
  const drvIn = { gas: 0 };
  function drive(dt) {
    const pad = readPad();
    const VS = VEH[veh];
    let gas = 0, brake = 0, steerIn = 0, hand = 0, boostIn = false;
    if (keys.w || keys.arrowup || touch.gas) gas = 1;
    if (keys.s || keys.arrowdown || touch.brake) brake = 1;
    if (keys[' ']) hand = 1;                                          // Space: handbrake in the car, a hop on the unicycle
    if (keys.a || keys.arrowleft || touch.left) steerIn += 1;
    if (keys.d || keys.arrowright || touch.right) steerIn -= 1;
    if (keys.shift || touch.boost) boostIn = true;
    if (pad) { gas = Math.max(gas, pad.gas); brake = Math.max(brake, pad.brake); if (pad.steer) steerIn = pad.steer; if (pad.boost) boostIn = true; if (pad.hand) hand = 1; }
    if (!started || jumping || resp.open || resp.busy) { gas = 0; brake = car.v > 0 ? 0.6 : 0; steerIn = 0; hand = 0; boostIn = false; }   // round 3: and while the respawn panel is open: you coast to a stop
    drvIn.gas = gas;
    if (veh === 'euc' || veh === 'bike') { if (hand && !car.handWas && car.hop <= 0.001 && car.vy === 0 && !car.air) car.vy = calm ? 2.4 : 3.3; car.handWas = !!hand; hand = 0; }
    const sk = car.surf ? car.surf.kind : 'main';
    const surfMul = sk === 'ground' ? VS.ground : sk === 'walk' ? VS.walk : 1;   // grass and plazas: slow going in the car; the unicycle rides them freely (the park's dirt too)
    // boost: a short ramp-in (about 0.35 s) and a softer ramp-out, only rolling forward
    const bT = boostIn && car.v > -0.5 ? 1 : 0;
    car.boost = bT ? Math.min(1, car.boost + dt / 0.35) : Math.max(0, car.boost - dt / 0.6);
    const bz = car.boost * car.boost * (3 - 2 * car.boost);
    let vmax = (VS.vmax + (VS.vboost - VS.vmax) * bz) * (calm ? 0.72 : 1) * speedMul() * surfMul;
    if (sk === 'park' && veh === 'car') vmax = Math.min(vmax, 8);   // round 3: the car may enter the park, at about 8 m/s
    // steering: keyboard reaches full lock in about 0.1 s and centres in about 0.12 s when let go; a stick is used as it is
    if (pad && pad.steer) car.steer = steerIn;
    else {
      const rate = (calm ? 5 : (steerIn === 0 ? 8.5 : Math.sign(steerIn) !== Math.sign(car.steer) && Math.abs(car.steer) > 0.05 ? 14 : 10)) * dt;
      car.steer += clamp(steerIn - car.steer, -rate, rate);
    }
    const r = clamp(car.v / Math.max(1, vmax), 0, 1);
    if (gas > 0) { if (car.v < 0) car.v += gas * VS.brake * dt; else if (car.v < vmax) car.v = Math.min(vmax, car.v + gas * (VS.acc * (1 - 0.5 * r) + VS.accBoost * bz * (1 - 0.6 * r)) * dt); }
    if (brake > 0) car.v -= brake * (car.v > 0.4 ? VS.brake : VS.rev) * dt;
    if (hand) car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 9 * dt);
    if (!gas && !brake && !hand) car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), (1.4 + Math.abs(car.v) * 0.12) * dt);
    if (car.v > vmax && !car.air) car.v += (vmax - car.v) * Math.min(1, dt * (gas > 0 ? 3 : 1.5));      // over the limit (boost let go, grass): ease down, no jolt
    car.v = clamp(car.v, VS.vrev, VS.vboost * 1.4 + 2);
    // turn rate: fades out as you crawl, so it is never twitchy, and still bites at boost speed
    const sp = Math.abs(car.v), spT = phys.blockT > 0 ? Math.max(sp, 3.5) : sp;
    const turn = car.steer * Math.min(1, spT / VS.sLo) * (VS.w0 + VS.wk * spT) * (calm ? 0.75 : 1) * (hand && sp > 6 ? 1.35 : 1) * (car.air ? 0.35 : 1);   // round 3: a little air control
    car.yaw += turn * Math.sign(car.v || 1) * dt;
    car.yawRate = turn * Math.sign(car.v || 1);
    // grip: the car carries a little slide in a hard turn at speed (more with the handbrake), then gathers itself; never a spin
    if (VS.drift && !calm) {
      car.slip += turn * Math.sign(car.v || 1) * dt;
      const hard = sp > 16 && Math.abs(car.steer) > 0.6;
      const grip = hand && sp > 6 ? 2.6 : hard ? 10 : 16, lim = hand ? 0.6 : 0.34;
      car.slip *= Math.exp(-grip * dt); car.slip = clamp(car.slip, -lim, lim);
      car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), Math.abs(car.slip) * 1.2 * dt);   // a slide scrubs a little speed
    } else car.slip *= Math.exp(-20 * dt);
    // the unicycle's hop: a short, solid bounce that only lifts the rider and wheel
    if (car.vy !== 0 || car.hop > 0) { car.vy -= 14 * dt; car.hop += car.vy * dt; if (car.hop <= 0) { car.hop = 0; car.vy = 0; } }
    fwd.set(Math.cos(car.yaw), 0, -Math.sin(car.yaw));
    const mh = car.yaw - car.slip; mv.set(Math.cos(mh), 0, -Math.sin(mh));
    const px = car.x, pz = car.z;
    const hk = car.air ? car.airH : 1;                               // round 3: in the air over the park, the jump carries you on at its own pace
    car.x += mv.x * car.v * dt * hk; car.z += mv.z * car.v * dt * hk;

    // the open world: follow whatever you are driving on; the side of a deck, its end and the water stop you softly
    // round 3: in the EUC jump park the park's own surface is used (kickers, landings, the pump track, the bus roof)
    const pe = car.surf && car.surf.edge, ok = (x, z) => {
      if (parkRide.near(x, z) && !(car.surf && car.surf.elev)) return { y: Math.max(0, world.height(x, z)) + 0.02, kind: 'park', elev: false, name: 'EUC jump park' };
      const q = net.surface(x, z, car.y, pe); return q && q.kind !== 'water' ? q : null; };
    let sf = ok(car.x, car.z);
    if (!sf) {
      const sa = ok(car.x, pz), sb = ok(px, car.z);
      let slid = true;
      if (sa) { car.z = pz; sf = sa; } else if (sb) { car.x = px; sf = sb; } else { car.x = px; car.z = pz; sf = ok(px, pz); slid = false; }
      car.v *= 1 - Math.min(0.85, dt * (slid ? 2.4 : 6));        // a glancing touch keeps most of your speed
      if (!slid) { car.v = Math.sign(car.v) * Math.min(Math.abs(car.v), 0.6); phys.blockT = 0.6; }   // nose in: you stop, and can steer out at walking pace
      if (pe) alignToEdge(pe, dt);                                  // on a ramp or deck: the nose eases back along it
      if (pe && !slid) nudgeIn(pe, dt);                             // round 2: and the car eases in off the very edge, so it is never pinned there
      phys.wallHits++;
    }
    if (sf && sf.kind === 'park' || car.air) { if (sf) car.surf = sf; parkHeight(dt); }
    else if (sf) { car.surf = sf; car.y += (sf.y - car.y) * Math.min(1, dt * 14); }
    // the edge of the map: far out in the fields, a gentle push back toward the road
    const far = Math.abs(car.z - roadZ(car.x)) - 175;
    if (far > 0) { car.z -= Math.sign(car.z - roadZ(car.x)) * far * Math.min(1, dt * 5); car.v *= 1 - Math.min(0.5, dt * 2); }
    // buildings, landmarks and piers: a soft stop that slides you along them, never a crash
    let npcTouchPark = false;
    net.solidsNear(car.x, car.z, b => {
      if (car.y + 1.4 < b.y0 || car.y > b.y1 - 0.25) return;      // under a deck, or driving over it
      const ddx = car.x - b.x, ddz = car.z - b.z;
      const along = ddx * b.ux + ddz * b.uz, side = -ddx * b.uz + ddz * b.ux;
      const hl = b.hl + VS.pad, hw = b.hw + VS.pad;
      if (Math.abs(along) >= hl || Math.abs(side) >= hw) return;
      const pa = hl - Math.abs(along), ps = hw - Math.abs(side);
      if (ps < pa) { const k = Math.sign(side || 1) * ps; car.x += -b.uz * k; car.z += b.ux * k; contact(-b.uz * Math.sign(k), b.ux * Math.sign(k), dt, 6); }
      else { const k = Math.sign(along || 1) * pa; car.x += b.ux * k; car.z += b.uz * k; contact(b.ux * Math.sign(k), b.uz * Math.sign(k), dt, 6); }
      phys.wallHits++;
      if (b.park && phys.parkHits.length < 200) phys.parkHits.push([b.park, +car.x.toFixed(1), +car.z.toFixed(1), +car.y.toFixed(2), car.air]);
    });
    // round 3: the park's riders, spectators and crew: you brush past them like walkers on a sidewalk
    if (parkPeople.length && parkRide.near(car.x, car.z) && stages[LAST].group.visible) parkPeople.forEach(r => {
      const p = r.position, ddx = car.x - p.x, ddz = car.z - p.z, d = Math.hypot(ddx, ddz), R = VS.person * 0.8;
      if (d > R || d < 1e-3 || Math.abs(p.y - car.y) > 1.6) return;
      car.x += ddx / d * (R - d); car.z += ddz / d * (R - d);
      car.v *= 1 - Math.min(0.9, dt * 4);
      npcTouchPark = true;
    });
    let npcTouch = npcTouchPark ? 'park rider' : false; npcTouchPark = false;
    const ghost = phys.ghost > 0;                                   // stuck against a car or a person: you ease through
    // the town's own cars and people: you ease off and slide clear, they carry on
    if (!ghost) town.cities.forEach(b => {
      if (!b.g.visible || !b.near.visible || car.x < b.x0 - 20 || car.x > b.x1 + 20) return;
      (b.vSets || []).forEach(({ im, list }) => {
        if (!im.geometry.boundingBox) im.geometry.computeBoundingBox();
        const bb = im.geometry.boundingBox, gl = (bb.max.x - bb.min.x) / 2, gw = (bb.max.z - bb.min.z) / 2;
        list.forEach(q => {
          if (q.npcOff) return;
          const m = q.m, x = m ? m.x : q.x, z = m ? m.z : q.z, y = m ? m.y : car.y, ry = m ? m.yaw : q.ry, sc = m ? (q.sx || q.sc || 1) : 0.8;
          const ddx = car.x - x; if (ddx > 8 || ddx < -8) return;
          if (Math.abs(y - car.y) > 1.6) return;
          const ddz = car.z - z, ux = Math.cos(ry), uz = -Math.sin(ry);
          const along = ddx * ux + ddz * uz, side = -ddx * uz + ddz * ux;
          const hl = gl * sc + VS.npcL, hw = gw * (m ? (q.sc || 1) : 0.8) + VS.npcW;
          if (Math.abs(along) > hl || Math.abs(side) > hw) return;
          const pa = hl - Math.abs(along), ps = hw - Math.abs(side);
          if (ps < pa) { const k = Math.sign(side || 1) * ps; car.x += -uz * k; car.z += ux * k; contact(-uz * Math.sign(k), ux * Math.sign(k), dt, 3); }
          else { const k = Math.sign(along || 1) * pa; car.x += ux * k; car.z += uz * k; contact(ux * Math.sign(k), uz * Math.sign(k), dt, 3); }
          npcTouch = npcTouch || 'town car';
        });
      });
      b.anim.people.forEach(q => {
        const x = q.m ? q.m.x : q.x0, z = q.m ? q.m.z : q.z;
        const ddx = car.x - x, ddz = car.z - z, d = Math.hypot(ddx, ddz);
        if (d > VS.person || d < 1e-3) return;
        car.x += ddx / d * (VS.person - d); car.z += ddz / d * (VS.person - d);
        car.v *= 1 - Math.min(0.9, dt * ((veh === 'euc' || veh === 'bike') ? 4 : 10));    // on the unicycle or bike you brush past walkers on a sidewalk rather than stop dead
        npcTouch = npcTouch || 'person';
      });
    });
    // nose up on a ramp, down on the way off it
    if (car.air) {   // round 3: in the air the car's nose follows its arc; the rider stays upright with a slight forward tuck
      const want = (veh === 'euc' || veh === 'bike') ? -0.08 : Math.atan2(car.vyA, Math.max(1, Math.abs(car.v) * car.airH));
      car.pitch += (clamp(want, -0.3, 0.3) - car.pitch) * Math.min(1, dt * 5);
    } else if (car.surf && car.surf.kind === 'park') {
      const f = parkRide.top(car.x + fwd.x * 1.2, car.z + fwd.z * 1.2, car.y + 0.4).y, r = parkRide.top(car.x - fwd.x * 1.2, car.z - fwd.z * 1.2, car.y + 0.4).y;
      car.pitch += (clamp(Math.atan2(f - r, 2.4), -0.45, 0.45) - car.pitch) * Math.min(1, dt * 10);
    } else
    { const pe2 = car.surf && car.surf.edge, f = net.surface(car.x + fwd.x * 1.6, car.z + fwd.z * 1.6, car.y, pe2), r = net.surface(car.x - fwd.x * 1.6, car.z - fwd.z * 1.6, car.y, pe2);
      const want = f && r ? Math.atan2(f.y - r.y, 3.2) : 0; car.pitch += (clamp(want, -0.3, 0.3) - car.pitch) * Math.min(1, dt * 8); }

    // the ends of the road: a gentle stop
    if (car.x < X_LO) { car.x += (X_LO - car.x) * Math.min(1, dt * 5); if (car.v * fwd.x < 0) car.v *= 1 - Math.min(1, dt * 4); }
    if (car.x > X_HI) { car.x += (X_HI - car.x) * Math.min(1, dt * 5); if (car.v * fwd.x > 0) car.v *= 1 - Math.min(1, dt * 4); }

    // traffic: a soft bump that slides you clear and takes some speed
    if (!ghost && car.y < net.ground(car.x, car.z) + 1.2) traffic.forEach(T => {   // not when you are up on a deck above them
      const m = T.m, a = m.instanceMatrix.array;
      for (let i = 0; i < m.count; i++) {
        const o = i * 16, tx = a[o + 12], tz = a[o + 14];
        const ddx = car.x - tx; if (ddx > 9 || ddx < -9) continue;
        const ddz = car.z - tz;
        const yx = a[o], yz = a[o + 2], s = Math.hypot(yx, yz) || 1;        // the other car's heading and size
        const ux = yx / s, uz = yz / s;
        const along = ddx * ux + ddz * uz, side = -ddx * uz + ddz * ux;
        const hl = T.hl * s + VS.trafL, hw = T.hw * s + VS.trafW;
        if (Math.abs(along) > hl || Math.abs(side) > hw) continue;
        const pa = hl - Math.abs(along), ps = hw - Math.abs(side);
        if (ps < pa) { const k = Math.sign(side || 1) * ps; car.x += -uz * k; car.z += ux * k; contact(-uz * Math.sign(k), ux * Math.sign(k), dt, 3); }
        else { const k = Math.sign(along || 1) * pa; car.x += ux * k; car.z += uz * k; contact(ux * Math.sign(k), uz * Math.sign(k), dt, 3); }
        npcTouch = npcTouch || 'traffic';
      }
    });
    // pinned in a corner (a wall one way, water the other): your speed follows how far you really moved, so you stop instead of buzzing in place
    { const real = Math.hypot(car.x - px, car.z - pz) / dt / hk, sp2 = Math.abs(car.v);   // round 3: measured against the jump's own pace in the air
      if (sp2 > 0.5 && real < sp2 * 0.45) { car.v = Math.sign(car.v) * (sp2 + (real - sp2) * Math.min(1, dt * 8)); phys.blockT = 0.6; } }
    // NPC contact episodes, and the stuck guard: pressing on but not moving for 0.8 s lets you ease through NPCs for 1.5 s
    if (npcTouch && !phys.npcContact) { phys.npcHits++; phys.recent = (phys.recent || []).filter(q => t - q < 3); phys.recent.push(t);
      if (phys.recent.length >= 3 && phys.ghost <= 0) { phys.ghost = 1.5; phys.npcBlocks++; phys.recent = []; }   // nudging the same slow car again and again: ease past it
      if (phys.hitLog.length < 400) phys.hitLog.push([npcTouch, +car.x.toFixed(1), +car.z.toFixed(1), car.surf && car.surf.kind]); }
    phys.npcContact = npcTouch;
    if (phys.ghost > 0) phys.ghost -= dt;
    if (phys.blockT > 0) phys.blockT -= dt;
    if (started && !jumping && gas > 0 && Math.abs(car.v) < 1.0) phys.stuckT += dt; else phys.stuckT = Math.max(0, phys.stuckT - dt * 2);
    if (phys.stuckT > 0.8 && npcTouch && phys.ghost <= 0) { phys.ghost = 1.5; phys.npcBlocks++; }
    if (phys.stuckT > 1.5 && !phys.stuckOn) { phys.stuckOn = true; phys.stuck++; if (phys.stuckLog.length < 40) phys.stuckLog.push([+car.x.toFixed(1), +car.z.toFixed(1), +car.y.toFixed(1), car.surf && car.surf.kind]); }
    if (phys.stuckT < 0.2) phys.stuckOn = false;
  }

  /* ---------- camera ---------- */
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), want = new THREE.Vector3(), wantLook = new THREE.Vector3();
  let snapCam = true;
  function placeCamera(dt) {
    fwd.set(Math.cos(car.yaw), 0, -Math.sin(car.yaw));
    const gy = car.y - 0.02, lift = Math.tan(car.pitch);
    const onEuc = veh === 'euc', onBike = veh === 'bike';
    if (chase) {
      if (onEuc) {   // the unicycle: lower and closer behind the rider
        want.set(car.x - fwd.x * 6.4, gy + 2.75, car.z - fwd.z * 6.4);
        wantLook.set(car.x + fwd.x * 7, gy + 1.25, car.z + fwd.z * 7);
      } else if (onBike) {   // the bike: a little higher and slightly further than the EUC
        want.set(car.x - fwd.x * 7.2, gy + 3.1, car.z - fwd.z * 7.2);
        wantLook.set(car.x + fwd.x * 7.5, gy + 1.45, car.z + fwd.z * 7.5);
      } else {
        want.set(car.x - fwd.x * 12.5, gy + 5.2, car.z - fwd.z * 12.5);
        wantLook.set(car.x + fwd.x * 9, gy + 1.4, car.z + fwd.z * 9);
      }
      // in a narrow street the camera comes in closer rather than sit inside a building
      const ox = car.x, oy = gy + 1.8, oz = car.z;
      let keep = 1;
      for (let t = 0.12; t <= 1.001 && keep === 1; t += 0.06) {
        const px = ox + (want.x - ox) * t, py = oy + (want.y - oy) * t, pz = oz + (want.z - oz) * t;
        let hit = py < net.ground(px, pz) + 0.6;
        if (!hit) net.solidsNear(px, pz, b => { if (hit || py < b.y0 - 0.3 || py > b.y1 + 0.4) return; const dx = px - b.x, dz = pz - b.z; if (Math.abs(dx * b.ux + dz * b.uz) < b.hl + 0.5 && Math.abs(-dx * b.uz + dz * b.ux) < b.hw + 0.5) hit = true; });
        if (hit) keep = Math.max(0.22, t - 0.1);
      }
      if (keep < 1) want.set(ox + (want.x - ox) * keep, oy + (want.y - oy) * keep + (1 - keep) * 1.2, oz + (want.z - oz) * keep);
    } else {
      // the driver's seat: just behind the windshield, eyes level, no bob. On the unicycle: the rider's eyes, inside the helmet
      if (onEuc) {
        want.set(car.x + fwd.x * 0.2, gy + 1.74 + car.hop * 0.6, car.z + fwd.z * 0.2);
        wantLook.set(car.x + fwd.x * 30, gy + 1.3 + lift * 30, car.z + fwd.z * 30);
      } else if (onBike) {
        want.set(car.x + fwd.x * 0.22, gy + 1.82 + car.hop * 0.55, car.z + fwd.z * 0.22);
        wantLook.set(car.x + fwd.x * 30, gy + 1.38 + lift * 30, car.z + fwd.z * 30);
      } else {
        want.set(car.x + fwd.x * 0.25, gy + 1.52, car.z + fwd.z * 0.25);
        wantLook.set(car.x + fwd.x * 30, gy + 1.15 + lift * 30, car.z + fwd.z * 30);
      }
    }
    const a = snapCam ? 1 : Math.min(1, dt * (chase ? 7 : 30));
    camPos.lerp(want, a); look.lerp(wantLook, snapCam ? 1 : Math.min(1, dt * (chase ? 8 : 30)));
    if (snapCam) { camPos.copy(want); look.copy(wantLook); snapCam = false; }
    camera.position.copy(camPos); camera.lookAt(look);
    // a touch wider at speed, only with calm motion off
    const fovT = (camera.aspect < 1 ? 72 : 58) + (calm ? 0 : 6 * clamp((Math.abs(car.v) - 12) / 18, 0, 1));
    fovNow += (fovT - fovNow) * Math.min(1, dt * 2);
    if (Math.abs(camera.fov - fovNow) > 0.01) { camera.fov = fovNow; camera.updateProjectionMatrix(); }
    // the sun's shadow box rides along just ahead of the car, snapped to whole texels so edges hold still
    sunC.set(car.x + fwd.x * 40, 0, car.z + fwd.z * 40);
    const sa = sunC.dot(sunR), sb = sunC.dot(sunU);
    sunC.addScaledVector(sunR, Math.round(sa / sunTex) * sunTex - sa).addScaledVector(sunU, Math.round(sb / sunTexV) * sunTexV - sb);
    sun.target.position.copy(sunC); sun.position.copy(sunC).add(sunOff);
  }

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  const viewF = new THREE.Frustum(), viewM = new THREE.Matrix4();
  const speedB = $('#dv-speed b'), speedEl = $('#dv-speed'), boostEl = $('#dv-boost');
  let lastBoost = -1;
  let t = 0, visible = true, lastMph = -1;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) clock.getDelta(); else for (const k in keys) keys[k] = false; });
  let qaHold = false;                 // QA: the automated driver steps the world itself
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || qaHold) return;
    step(Math.min(0.05, clock.getDelta()), true);
  }
  function step(dt, draw) {
    t += dt;
    const steps = Math.max(1, Math.ceil(dt / 0.017));
    for (let n = 0; n < steps; n++) drive(dt / steps);
    if (game && game.active && intro.hidden) game.update(dt, t);
    if (intro.hidden) notes.update(dt, t);
    // round 3: the easter eggs, the stuck hint and the key panel
    if (intro.hidden && started) eggs.update({ dt, t, mode, veh, wallHits: phys.wallHits, respawns: resp.count, switches: vehSwitches, jumps: jumpsTo });
    updateStuck();
    syncKeysUI();

    placeCamera(dt);
    camera.updateMatrixWorld();
    viewM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); viewF.setFromProjectionMatrix(viewM);
    world.setView(viewF, camera.position, scene.fog.far);    // traffic only changes where you are not looking
    world.update(dt, t, car.x, car.v * Math.cos(car.yaw + Math.atan(roadDZ(car.x))), false);
    townYield();
    town.update(t, dt, car.x, TOWN_Z, false);
    world.setZoomTint(0, themeName);

    // the amber car follows you, not the road's lane
    const onEuc = veh === 'euc';
    hero.group.position.set(car.x, car.y - 0.02, car.z); hero.group.rotation.set(0, car.yaw, car.pitch);
    hero.body.position.y = 0;
    hero.group.visible = chase && veh === 'car';
    if (ring) ring.visible = false;   // the Road's 'you are here' ring is not needed when you are the driver
    hood.visible = !chase && veh === 'car';
    euc.group.visible = chase && onEuc;
    bike.group.visible = chase && veh === 'bike';   // from the seat you are the rider: eyes at helmet height, nothing in the way
    if (onEuc) euc.update(car, dt, { yawRate: car.air ? car.yawRate * 0.3 : car.yawRate, calm, hopY: car.hop });
    if (veh === 'bike') bike.update(car, dt, { yawRate: car.air ? car.yawRate * 0.3 : car.yawRate, calm, hopY: car.hop, boost: car.boost, gas: drvIn.gas });
    // round 3: the unicycle's arms, measured in the air and on the first pose after each landing (QA)
    if ((onEuc || veh === 'bike') && jumpNow && jumpNow.arms.length < 6 && (jumpNow.armT = (jumpNow.armT || 0) + dt) > 0.15) { jumpNow.armT = 0; jumpNow.arms.push(['air', (onEuc ? euc : bike).armReport()]); }
    if ((onEuc || veh === 'bike') && landPending) { landPending.arms.push(['landing', (onEuc ? euc : bike).armReport()]); landPending = null; }
    hero.brake.material.opacity = (keys.s || keys.arrowdown || touch.brake || keys[' ']) && car.v > 0.3 ? 0.95 : 0.25;

    stages.forEach((st, i) => {
      const d = Math.abs(car.x - STOPS[i].x);
      const on = d < SHOW_R;
      st.group.visible = on;
      if (!on) return;
      const kt = 1 - smooth(4, 46, d);
      st.k += (kt - st.k) * Math.min(1, dt * 2.5);
      if (st.update) st.update(t, st.k, dt);
    });
    beacons.forEach(b => { const p = calm ? 0 : Math.sin(t * 1.6) * 0.05; b.m.opacity = 0.2 + p; });

    if (!draw) return;
    renderer.render(scene, camera); drawnN++;

    // HUD
    const mph = Math.round(Math.abs(car.v) * 2.237);
    if (mph !== lastMph) { speedB.textContent = mph; lastMph = mph; }
    const bq = Math.round(car.boost * 20) / 20;
    if (bq !== lastBoost && boostEl) { lastBoost = bq; boostEl.style.setProperty('--b', bq); speedEl.classList.toggle('boost', bq > 0.04); }
    carDot.style.left = lineAt(car.x) + '%';
    updateCard();
    if ((frameN++ & 1) === 0) map.draw(mapCss());
  }
  let frameN = 0;
  frame();

  if (QA) window.__drive = { laneDist, yieldStats, net, map, town, traffic, camPos, hero, snap: () => { snapCam = true; }, get game() { return game; }, startGame, endGame, fx, car, STOPS, jumpTo, get near() { return near; }, setCam: c => { chase = c; syncBtns(); }, begin, keys, Tour,
    routes, notes, phys, npcStats, choose, get mode() { return mode; },
    get veh() { return veh; }, get vehPref() { return vehPref; }, setVehicle: (w, instant) => { if (instant) { vehPref = w; saveVeh(); applyVehicle(wantVeh()); } else setVehPref(w); }, vehInfo: () => VEH[veh], VEH, euc, bike, toggleVeh, camera, scene, renderer, X_LO, X_HI,
    hold: h => { qaHold = !!h; if (!h) clock.getDelta(); }, step: (dt, draw) => step(dt, !!draw), render: () => { placeCamera(1); camera.updateMatrixWorld(); renderer.render(scene, camera); map.draw(mapCss()); updateCard(); },
    get t() { return t; }, get storiesPaused() { return storiesPaused; }, mapCss,
    // round 3
    resp, openRespawn, closeRespawn, confirmRespawn, findRespawn, doRespawn, spotOK, curv, parkRide, parkGroup, parkPeople, eggs, bayMesh, stuckHint, held, mouseHeld,
    get keysPref() { return keysPref; }, setKeysPref, get kpOn() { return kpOn; }, kp, respEl, hintEl, get jumpNow() { return jumpNow; }, sim: (sec, k) => { Object.assign(keys, k || {}); for (let n = 0; n < sec * 60; n++) drive(1 / 60); for (const q in keys) keys[q] = false; return { x: +car.x.toFixed(1), dz: +(car.z - roadZ(car.x)).toFixed(2), y: +car.y.toFixed(2), v: +car.v.toFixed(1), yaw: +car.yaw.toFixed(2), kind: car.surf && car.surf.kind, name: car.surf && car.surf.name }; } };
}
