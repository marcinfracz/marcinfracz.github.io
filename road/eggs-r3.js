/* Drive mode round 3 (Grok): eight easter eggs in Field notes and Free play, found by driving or riding,
   never by clicking. Four for the car, four for the electric unicycle; the wrong vehicle, City Chase and
   The Road never count. A short toast in the Field notes style, a small one-shot confetti in the palette
   (none with calm motion), and a count in the Glovebox. Saved in localStorage 'mf-drive-eggs-v1'. */
const LS = 'mf-drive-eggs-v1';
export const EGGS = [
  { id: 'bus', veh: 'euc', name: 'Cleared the bus' },
  { id: 'pump', veh: 'euc', name: 'A full pump track lap' },
  { id: 'double', veh: 'euc', name: 'Both kickers in one run' },
  { id: 'bridge', veh: 'euc', name: 'Rode the Ambassador Bridge end to end' },
  { id: 'deck', veh: 'car', name: 'Full boost over the I-475 deck' },
  { id: 'donut', veh: 'car', name: 'A full donut' },
  { id: 'bay', veh: 'car', name: 'Parked right in the bay' },
  { id: 'clean', veh: 'car', name: 'Start to finish without a scrape' }
];
const TAU = Math.PI * 2;

export function createEggs(api) {
  const { car, parkRide, STOPS, roadZ, calm = () => false, onFound = () => {} } = api;
  let found = [];
  try { const v = JSON.parse(localStorage.getItem(LS) || '{}'); if (Array.isArray(v.found)) found = v.found.filter(id => EGGS.some(e => e.id === id)); } catch (e) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify({ found })); } catch (e) {} };
  const log = [];

  /* the parking bay: a painted outline on the open ground beside the start line, off the main road */
  const BAY = (() => { const x = STOPS[0].x + 14, z = roadZ(x) + 12.6; const dz = (roadZ(x + 1) - roadZ(x - 1)) / 2; return { x, z, yaw: -Math.atan(dz), L: 5.2, W: 2.6 }; })();

  /* ---------- toast and confetti ---------- */
  const toast = document.createElement('div'); toast.className = 'fn-toast r3-egg'; toast.setAttribute('aria-live', 'polite'); toast.hidden = true; document.body.appendChild(toast);
  let toastT = 0; const queue = [];                                  // two eggs in one moment show one after the other
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function showToast(e, n) {
    toast.innerHTML = `<p class="r3-egg-t">Easter egg found: <b>${esc(e.name)}.</b> <span>${n} of ${EGGS.length}</span></p>`;
    toast.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('on'))); toastT = 4.2;
    if (!calm()) confetti();
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'r3-confetti'; box.setAttribute('aria-hidden', 'true');
    const cols = ['var(--accent)', '#7F8C9B', '#AEB8C4', '#4A5562', 'var(--accent)'];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('i');
      s.style.setProperty('--x', ((Math.random() - 0.5) * 360).toFixed(0) + 'px');
      s.style.setProperty('--y', (120 + Math.random() * 160).toFixed(0) + 'px');
      s.style.setProperty('--r', ((Math.random() - 0.5) * 540).toFixed(0) + 'deg');
      s.style.setProperty('--d', (Math.random() * 0.25).toFixed(2) + 's');
      s.style.background = cols[i % cols.length];
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2200);
  }
  function hideToast() { toast.classList.remove('on'); setTimeout(() => { if (toastT <= 0) toast.hidden = true; }, 350); }

  function find(id, why) {
    if (found.includes(id)) return false;
    const e = EGGS.find(q => q.id === id);
    found.push(id); save();
    log.push({ id, why, toast: `Easter egg found: ${e.name}. ${found.length} of ${EGGS.length}` });
    if (toastT > 0) queue.push([e, found.length]); else showToast(e, found.length);
    onFound(e, found.length);
    return true;
  }

  /* ---------- the trackers ---------- */
  const S = { pump: null, bridge: null, deck: null, donut: null, bay: 0, clean: null, k1: -99, k1good: false, busOver: false };
  const unwrap = (d, L) => (d > L / 2 ? d - L : d < -L / 2 ? d + L : d);

  /* ctx each step: { dt, t, mode, veh, wallHits, respawns, switches, surf } */
  function update(ctx) {
    const { dt, t, mode, veh } = ctx;
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) { if (queue.length) { toast.classList.remove('on'); const [e, n] = queue.shift(); showToast(e, n); } else hideToast(); } }
    const on = mode === 'notes' || mode === 'free';
    if (!on) { reset(); return; }
    const sp = Math.abs(car.v), surf = car.surf, edge = surf && surf.edge;

    /* unicycle: a full lap of the pump track without stopping */
    if (veh === 'euc' && !car.air) {
      const r = parkRide.onRibbon('pump', car.x, car.z);
      if (r && Math.abs(r.n) < 2.2 && sp > 1.5) {
        if (!S.pump) S.pump = { s: r.s, sum: 0, off: 0 };
        else { S.pump.sum += unwrap(r.s - S.pump.s, parkRide.pump.L); S.pump.s = r.s; S.pump.off = 0; }
        if (Math.abs(S.pump.sum) >= parkRide.pump.L - 0.5) find('pump', `lap ${S.pump.sum.toFixed(1)} m of ${parkRide.pump.L.toFixed(1)} m`);
      } else if (S.pump) { S.pump.off += dt; if (S.pump.off > 0.4 || sp <= 1.5) S.pump = null; }
    } else if (veh !== 'euc') S.pump = null;

    /* unicycle: end to end over the Ambassador Bridge in one go */
    if (veh === 'euc' && edge && edge.name === 'Ambassador Bridge' && !car.air) {
      let bi = 0, bd = 1e9; edge.pts.forEach((q, i) => { const d = (q[0] - car.x) ** 2 + (q[2] - car.z) ** 2; if (d < bd) { bd = d; bi = i; } });
      if (!S.bridge || S.bridge.edge !== edge) S.bridge = { edge, lo: bi, hi: bi };
      S.bridge.lo = Math.min(S.bridge.lo, bi); S.bridge.hi = Math.max(S.bridge.hi, bi);
      if (S.bridge.lo <= 2 && S.bridge.hi >= edge.pts.length - 3) find('bridge', `points ${S.bridge.lo} to ${S.bridge.hi} of ${edge.pts.length}`);
    } else if (!car.air) S.bridge = null;

    /* car: boost speed (30 m/s or more) held over 120 m of the I-475 deck, most of its length from the ramps */
    if (veh === 'car' && edge && edge.name === 'I-475' && edge.kind === 'elev') {
      let bi = 0, bd = 1e9; edge.pts.forEach((q, i) => { const d = (q[0] - car.x) ** 2 + (q[2] - car.z) ** 2; if (d < bd) { bd = d; bi = i; } });
      if (sp < 30) S.deck = null;
      else {
        if (!S.deck) S.deck = { lo: bi, hi: bi, vmin: sp };
        S.deck.lo = Math.min(S.deck.lo, bi); S.deck.hi = Math.max(S.deck.hi, bi); S.deck.vmin = Math.min(S.deck.vmin, sp);
        if (S.deck.hi - S.deck.lo >= 120) find('deck', `${S.deck.hi - S.deck.lo} m of the deck (points ${S.deck.lo} to ${S.deck.hi} of ${edge.pts.length}), lowest speed ${S.deck.vmin.toFixed(1)} m/s`);
      }
    } else S.deck = null;

    /* car: a full 360 donut off the main road and outside the park, in under 8 s */
    if (veh === 'car' && surf && surf.kind !== 'main' && surf.kind !== 'park' && !surf.elev && sp > 1.5 && sp < 16) {
      const yr = car.yawRate || 0;
      if (!S.donut || Math.sign(yr) !== S.donut.sgn || t - S.donut.t0 > 8) S.donut = { sgn: Math.sign(yr) || 1, sum: 0, t0: t, x: car.x, z: car.z };
      S.donut.sum += Math.abs(yr) * dt;
      if (Math.hypot(car.x - S.donut.x, car.z - S.donut.z) > 20) S.donut = null;          // a spin in one spot, not a lap of something
      else if (S.donut.sum >= TAU) find('donut', `turned ${(S.donut.sum * 180 / Math.PI).toFixed(0)} degrees in ${(t - S.donut.t0).toFixed(1)} s on ${surf.kind}`);
    } else S.donut = null;

    /* car: parked in the bay, within 0.5 m, nose along the bay, stopped for a moment */
    if (veh === 'car') {
      const dx = car.x - BAY.x, dz = car.z - BAY.z, ux = Math.cos(BAY.yaw), uz = -Math.sin(BAY.yaw);
      const along = dx * ux + dz * uz, side = -dx * uz + dz * ux;
      let dy = Math.abs(((car.yaw - BAY.yaw) % Math.PI + Math.PI * 1.5) % Math.PI - Math.PI / 2);
      if (Math.hypot(along, side) < 0.5 && dy < 0.21 && sp < 0.3) { S.bay += dt; if (S.bay > 0.6) find('bay', `off by ${Math.hypot(along, side).toFixed(2)} m, ${(dy * 180 / Math.PI).toFixed(0)} degrees`); }
      else S.bay = 0;
    }

    /* car: from the start line to the End stop on the main road, no wall touched, no respawn, no switch */
    if (veh === 'car') {
      const x0 = STOPS[0].x, x1 = STOPS[STOPS.length - 1].x;
      if (!S.clean && car.x < x0 + 2 && car.x > x0 - 30) S.clean = { armed: true, w: ctx.wallHits, r: ctx.respawns, s: ctx.switches, j: ctx.jumps };
      if (S.clean) {
        if (S.clean.px != null && Math.hypot(car.x - S.clean.px, car.z - S.clean.pz) > 6) S.clean = null;   // never a jump across the map
      }
      if (S.clean) {
        S.clean.px = car.x; S.clean.pz = car.z;
        const bad = ctx.wallHits !== S.clean.w || ctx.respawns !== S.clean.r || ctx.switches !== S.clean.s || ctx.jumps !== S.clean.j || (surf && surf.elev);
        if (bad) S.clean = null;
        else if (car.x >= x1) find('clean', `from x ${x0} to ${x1.toFixed(0)}, wall hits unchanged at ${ctx.wallHits}`);
      }
    } else S.clean = null;
  }
  /* jumps from the park: called on each landing */
  function landed(j, ctx) {
    if (!(ctx.mode === 'notes' || ctx.mode === 'free') || ctx.veh !== 'euc') return;
    if (j.overBus && !j.onBus) find('bus', `launch ${j.launchV} m/s, cleared the bus top by ${j.busClear} m, landed ${j.landOn}`);
    if (j.kicker === 'K1' && j.good) { S.k1 = ctx.t; }
    if (j.kicker === 'K2' && j.good && ctx.t - S.k1 < 8) find('double', `K1 then K2 in ${(ctx.t - S.k1).toFixed(1)} s`);
  }
  function reset() { S.pump = S.bridge = S.deck = S.donut = S.clean = null; S.bay = 0; }
  return {
    update, landed, reset, BAY, log, EGGS,
    get found() { return found.slice(); },
    countHTML: () => `<p class="r3-eggs">Easter eggs <b>${found.length} of ${EGGS.length}</b></p>${found.length ? `<ul class="r3-egg-list">${EGGS.filter(e => found.includes(e.id)).map(e => `<li>${esc(e.name)}</li>`).join('')}</ul>` : ''}`,
    hideToast: () => { toastT = 0; queue.length = 0; toast.classList.remove('on'); toast.hidden = true; },
    qaReset: () => { found = []; queue.length = 0; save(); reset(); },
    qaForget: id => { found = found.filter(f => f !== id); save(); reset(); },
    get toastText() { return toast.hidden ? '' : toast.textContent.replace(/\s+/g, ' ').trim(); }
  };
}
