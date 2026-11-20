/* Drive mode v3, Phase B: Field notes. A Learn game: drive the open world and collect short notes about
   Marcin, each in a format The Road never uses (postcard, license plate, toolbox tag, ticket stub,
   passport stamp). Every line is restated from content/road-content.js; nothing here is a new fact.
   Notes stand off the main road, rest in place (fog fades them in and out, nothing pops), and file into
   the Glovebox when you drive through one. Plain ES module; drive-next.js loads it.
   Round 3 (Grok): a copy of fieldnotes-next.js for drive-r3.js, with one optional Glovebox line (extraHTML) for the easter egg count. */

export const NOTES = [
  { id: 'flint-coop',     fmt: 'postcard', city: 'Flint',    era: 'school',      at: [260, 0, -109],     skill: 'Co-op engineering',
    text: 'Every academic term paired with a paid industry term, four years running.' },
  { id: 'flint-seals',    fmt: 'plate',    city: 'Flint',    era: 'school',      at: [136, 5.8, -60],    deck: true, skill: 'Engine seal design',
    text: 'Co-op work: designed and tested PTFE and elastomeric engine seals.' },
  { id: 'flint-dfmea',    fmt: 'tag',      city: 'Flint',    era: 'school',      at: [116.8, 2.4, -10.3], deck: true, skill: 'DFMEA and validation plans',
    text: 'Ran DFMEAs, validation plans and design reviews with customers and plants.' },
  { id: 'flint-gasket',   fmt: 'tag',      city: 'Flint',    era: 'engineering', at: [203, 0, 33],       skill: 'Gasket design and validation',
    text: 'Replaced a fatigue-cracking head gasket with a multi-layer steel design, proven on test.' },
  { id: 'flint-call',     fmt: 'ticket',   city: 'Flint',    era: 'engineering', at: [136, 5.7, 28],     deck: true, skill: 'Quality leadership',
    text: 'Quality call: stopped a plant rather than ship suspect parts, then re-sourced the seal.' },
  { id: 'aa-toolkit',     fmt: 'tag',      city: 'Ann Arbor', era: 'mba',        at: [630, 0, -147],     skill: 'Market entry strategy',
    text: 'Consulting toolkit: Five Forces, SWOT, VRIO, risk analysis, weighted decision matrix.' },
  { id: 'aa-pivot',       fmt: 'postcard', city: 'Ann Arbor', era: 'mba',        at: [706, 0, -29],      skill: 'Engineering to business',
    text: 'The pivot: an MBA to move from engineering into business leadership.' },
  { id: 'det-opera',      fmt: 'postcard', city: 'Detroit',  era: 'program',     at: [886, 0, -48],      skill: 'Dealer culture program',
    text: 'Detroit Opera House: HQ workshops that brought a global dealer culture program home.' },
  { id: 'det-complexity', fmt: 'tag',      city: 'Detroit',  era: 'program',     at: [894, 9.8, -102],   skill: 'Build complexity tool',
    text: 'Built a build complexity tool that modeled which combinations buyers actually pick.' },
  { id: 'det-mexico',     fmt: 'stamp',    city: 'Ambassador Bridge', era: 'program', at: [933.5, 1.6, 57.5], deck: true, skill: 'National dealer rollout',
    text: 'Mexico City, Guadalajara, Monterrey: a national dealer rollout, city by city.' },
  { id: 'det-training',   fmt: 'ticket',   city: 'Detroit',  era: 'program',     at: [922, 0.4, -74],      skill: 'Dealer enablement',
    text: 'Dealer training website and video series, so the process scaled past the visits.' },
  { id: 'det-roof',       fmt: 'plate',    city: 'Detroit',  era: 'crossovers',  at: [1084, 0, -39],     skill: 'Fast product actions',
    text: 'Added a black roof package to a new crossover within six months of production start.' },
  { id: 'det-streams',    fmt: 'tag',      city: 'Detroit',  era: 'connected',   at: [1073, 0, -66],     skill: 'Connected services strategy',
    text: 'Five value streams: remote services, cameras, driver assist, performance and personalization.' },
  { id: 'sh-luxury',      fmt: 'stamp',    city: 'Shanghai', era: 'shanghai',    at: [1259, 8.6, -60],   deck: true, skill: 'Consumer insight',
    text: 'Shanghai: studies showed technology had become the new luxury for Chinese buyers.' },
  { id: 'sh-lens',        fmt: 'ticket',   city: 'Shanghai', era: 'shanghai',    at: [1261, 0, -130],    skill: 'Lifetime value strategy',
    text: "Value over the vehicle's life: connected hardware is an investment, not a cost." },
  { id: 'sh-pmv',         fmt: 'plate',    city: 'Shanghai', era: 'onstar',      at: [1243.3, 2.7, -15.2], deck: true, skill: 'Building with AI agents',
    text: 'Portfolio Made Visible: built solo with AI agents, any market-year view in seconds.' }
];
export const FORMAT = { postcard: 'Postcard', plate: 'License plate', tag: 'Toolbox tag', ticket: 'Ticket stub', stamp: 'Passport stamp' };
const LS = 'mf-glovebox-v1';

export function createFieldNotes(api) {
  const { THREE, scene, camera, car, net, routes, map, content, calm = () => false, theme = () => 'day', TOKENS = {}, ctl, extraHTML = null } = api;   // round 3: extraHTML adds a line to the Glovebox (the easter egg count)
  const eras = Object.fromEntries(((content && content.eras) || []).map(e => [e.id, e]));
  const eraLabel = id => { const e = eras[id]; return e ? `${e.short || e.label} · ${e.years}` : ''; };
  let found = [];
  try { const v = JSON.parse(localStorage.getItem(LS) || '{}'); if (Array.isArray(v.found)) found = v.found.filter(id => NOTES.some(n => n.id === id)); } catch (e) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify({ found })); } catch (e) {} };
  let active = false, hintId = null;

  /* ---------- the markers: a small card on a post, with a soft light above it, all procedural ---------- */
  const FCOL = { postcard: '#2E9C8F', plate: '#4A5562', tag: '#C8693A', ticket: '#7357D8', stamp: '#1F8FD1' };
  function cardTex(fmt) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d');
    const col = FCOL[fmt];
    g.fillStyle = '#FAFAF7'; g.fillRect(0, 0, 256, 160);
    g.strokeStyle = col; g.lineWidth = 10; g.strokeRect(5, 5, 246, 150);
    g.fillStyle = col;
    if (fmt === 'postcard') { g.fillRect(186, 20, 46, 54); g.fillStyle = '#FAFAF7'; g.fillRect(194, 28, 30, 38); g.fillStyle = col; for (let i = 0; i < 4; i++) g.fillRect(26, 96 + i * 14, 120, 5); }
    else if (fmt === 'plate') { g.fillRect(20, 20, 216, 22); g.font = '800 58px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('MF·26', 128, 112); }
    else if (fmt === 'tag') { g.beginPath(); g.arc(44, 80, 16, 0, Math.PI * 2); g.fill(); g.fillStyle = '#FAFAF7'; g.beginPath(); g.arc(44, 80, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = col; for (let i = 0; i < 3; i++) g.fillRect(84, 52 + i * 22, 140, 8); }
    else if (fmt === 'ticket') { for (let y = 16; y < 150; y += 16) { g.beginPath(); g.arc(178, y, 4, 0, Math.PI * 2); g.fill(); } g.font = '800 40px Inter, system-ui, sans-serif'; g.fillText('ADMIT', 26, 96); }
    else if (fmt === 'stamp') { g.lineWidth = 7; g.strokeStyle = col; g.beginPath(); g.arc(128, 80, 56, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(128, 80, 42, 0, Math.PI * 2); g.stroke(); g.font = '800 22px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('ENTRY', 128, 88); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const fadeTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c); })();
  const texCache = {};
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8); postGeo.translate(0, 0.8, 0);
  const cardGeo = new THREE.PlaneGeometry(1.6, 1.0);
  const beamGeo = new THREE.CylinderGeometry(0.35, 0.9, 16, 16, 1, true); beamGeo.translate(0, 8, 0);
  const postMat = new THREE.MeshLambertMaterial({ color: '#6E7B8A' });
  const items = NOTES.map(n => {
    const s = net.surfaces(n.at[0], n.at[2]);
    let y = s[0].y;                                            // on the deck when the note sits on one
    if (n.deck) { let bd = 9; s.forEach(q => { if (q.elev && Math.abs(q.y - n.at[1]) < bd) { bd = Math.abs(q.y - n.at[1]); y = q.y; } }); }
    const g = new THREE.Group(); g.position.set(n.at[0], y, n.at[2]);
    const post = new THREE.Mesh(postGeo, postMat); g.add(post);
    const tex = texCache[n.fmt] || (texCache[n.fmt] = cardTex(n.fmt));
    const card = new THREE.Mesh(cardGeo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })); card.position.y = 2.15; g.add(card);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: FCOL[n.fmt], alphaMap: fadeTex, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    g.add(beam);
    g.traverse(o => { if (o.isMesh && o !== beam) o.castShadow = true; });
    g.visible = false;
    scene.add(g);
    return { n, g, card, beam, y, got: found.includes(n.id), gone: found.includes(n.id) ? 1 : 0, fly: 0 };
  });
  items.forEach(it => { if (it.got) { scene.remove(it.g); } });

  /* ---------- toast and Glovebox ---------- */
  const toast = document.createElement('div'); toast.className = 'fn-toast'; toast.setAttribute('aria-live', 'polite'); toast.hidden = true; document.body.appendChild(toast);
  let toastT = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function noteHTML(n) {
    return `<div class="fn-card fn-${n.fmt}"><p class="fn-k">${esc(FORMAT[n.fmt])} · ${esc(n.city)}</p><p class="fn-t">${esc(n.text)}</p><p class="fn-e">${esc(eraLabel(n.era))}</p></div>`;
  }
  function showToast(n) {
    toast.innerHTML = `<p class="fn-head">Field note found <b>${found.length} of ${NOTES.length}</b></p>${noteHTML(n)}<p class="fn-foot">Filed to the Glovebox</p>`;
    toast.hidden = false; requestAnimationFrame(() => toast.classList.add('on')); toastT = 5.2;
  }
  const box = document.createElement('section'); box.className = 'fn-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Glovebox'); box.hidden = true; document.body.appendChild(box);
  function renderBox() {
    const list = NOTES.filter(n => found.includes(n.id));
    const skills = list.map(n => n.skill);
    box.innerHTML = `<div class="fn-box-in">
      <header><h2>Glovebox</h2><p class="fn-count">${found.length} of ${NOTES.length} found</p><button type="button" class="fn-x" aria-label="Close">✕</button></header>
      ${extraHTML ? extraHTML() : ''}
      ${found.length < NOTES.length ? `<button type="button" class="fn-where">Show me where</button><p class="fn-hint">${hintId ? 'The next note is marked on the map.' : 'Marks the nearest note you have not found on the map.'}</p>` : `<p class="fn-hint">Every note found.</p>`}
      ${skills.length ? `<p class="fn-sk-h">Skills on file</p><ul class="fn-skills">${skills.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      <div class="fn-list">${list.length ? list.map(noteHTML).join('') : '<p class="fn-empty">Nothing yet. Notes wait off the main road: side streets, decks, bridges and ramps.</p>'}</div>
    </div>`;
    box.querySelector('.fn-x').onclick = closeBox;
    const w = box.querySelector('.fn-where'); if (w) w.onclick = () => { showWhere(); renderBox(); };
  }
  function openBox() { renderBox(); box.hidden = false; requestAnimationFrame(() => box.classList.add('on')); const x = box.querySelector('.fn-where') || box.querySelector('.fn-x'); x && x.focus(); }
  function closeBox() { box.classList.remove('on'); box.hidden = true; }
  const toggleBox = () => (box.hidden ? openBox() : closeBox());
  box.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeBox(); } });

  // the header button: only shown in the Learn mode
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'fn-btn'; btn.title = 'Glovebox: your Field notes (B)'; btn.setAttribute('aria-label', 'Glovebox');
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18M10 14h4"/></svg><span class="fn-n">0</span>`;
  btn.onclick = toggleBox; btn.hidden = true;
  if (ctl) ctl.insertBefore(btn, ctl.firstChild);
  const syncBtn = () => { btn.querySelector('.fn-n').textContent = `${found.length}/${NOTES.length}`; };
  syncBtn();

  /* "Show me where": the nearest note you have not found, by the drive there */
  function nextNote() {
    let best = null, bd = Infinity;
    items.forEach(it => { if (it.got) return; const r = routes ? routes.route({ x: car.x, z: car.z, y: car.y }, { x: it.g.position.x, z: it.g.position.z, y: it.y }) : null; const d = r ? r.len : Math.hypot(it.g.position.x - car.x, it.g.position.z - car.z) * 1.5; if (d < bd) { bd = d; best = it; } });
    return best;
  }
  function showWhere() { const it = nextNote(); hintId = it ? it.n.id : null; syncMarks(); return it; }
  function syncMarks() {
    if (!map || !map.setMarks) return;
    if (!active) { map.setMarks('notes', null); return; }
    const T = TOKENS[theme()] || {};
    map.setMarks('notes', items.filter(it => !it.got).map(it => it.n.id === hintId
      ? { x: it.g.position.x, z: it.g.position.z, color: T.accent || '#E8A33D', r: 6, shape: 'ring', edge: true, id: it.n.id }
      : { x: it.g.position.x, z: it.g.position.z, color: '#7F8C9B', r: 3, id: it.n.id }));
  }

  function setActive(on) {
    active = !!on;
    items.forEach(it => { if (!it.got) it.g.visible = active; });   // only ever switched under the mode veil
    btn.hidden = !active;
    if (!active) { closeBox(); toast.classList.remove('on'); toast.hidden = true; }
    syncMarks();
  }

  function update(dt, t) {
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) { toast.classList.remove('on'); setTimeout(() => { if (toastT <= 0) toast.hidden = true; }, 350); } }
    items.forEach(it => {
      if (!it.g.parent) return;
      if (it.got) {
        // collected: the card flies into the car and folds away, it never blinks out
        it.fly = Math.min(1, it.fly + dt / 0.45);
        const k = it.fly, p = it.g.position;
        p.x += (car.x - p.x) * Math.min(1, dt * 9); p.z += (car.z - p.z) * Math.min(1, dt * 9); p.y += (car.y + 0.6 - p.y) * Math.min(1, dt * 9);
        it.g.scale.setScalar(Math.max(0.001, 1 - k));
        if (k >= 1) scene.remove(it.g);
        return;
      }
      if (!active) return;
      // the card turns to face you, and bobs a little unless calm motion is on
      it.card.rotation.y = Math.atan2(camera.position.x - it.g.position.x, camera.position.z - it.g.position.z);
      it.card.position.y = 2.15 + (calm() ? 0 : Math.sin(t * 1.8 + it.g.position.x) * 0.08);
      it.beam.material.opacity = it.n.id === hintId ? 0.32 : 0.18;
      const dx = car.x - it.g.position.x, dz = car.z - it.g.position.z;
      if (dx * dx + dz * dz < 3.2 * 3.2 && Math.abs(car.y - it.y) < 1.6) collect(it, t);
    });
  }
  function collect(it, t) {
    if (it.got) return;
    it.got = true; it.t = t;
    if (!found.includes(it.n.id)) found.push(it.n.id);
    save(); syncBtn();
    if (hintId === it.n.id) hintId = null;
    syncMarks(); showToast(it.n);
    if (!box.hidden) renderBox();
  }
  function reset() { found = []; save(); syncBtn(); }   // QA only (not wired to any button)
  function qaSetFound(ids) {                              // QA only: put the notes back as if these were found
    found = ids.slice(); save(); syncBtn(); hintId = null;
    items.forEach(it => { it.got = found.includes(it.n.id); it.fly = 0; if (!it.got && !it.g.parent) { it.g.position.set(it.n.at[0], it.y, it.n.at[2]); it.g.scale.setScalar(1); it.g.visible = active; scene.add(it.g); } if (it.got && it.g.parent) scene.remove(it.g); });
    syncMarks();
  }

  return {
    update, setActive, openBox, closeBox, toggleBox, showWhere, get active() { return active; }, get boxOpen() { return !box.hidden; }, refreshBox: () => { if (!box.hidden) renderBox(); },
    qa: () => ({ found: found.slice(), hintId, items: items.map(it => ({ id: it.n.id, x: it.g.position.x, y: it.y, z: it.g.position.z, got: it.got, inScene: !!it.g.parent })), toast: toast.hidden ? '' : toast.textContent, boxOpen: !box.hidden, count: box.hidden ? null : (box.querySelector('.fn-count') || {}).textContent }),
    spots: () => (active ? items.filter(it => !it.got).map(it => ({ x: it.g.position.x, y: it.y, z: it.g.position.z })) : []),   // for the town's yielding
    reset, qaSetFound, NOTES
  };
}
