/* Drive mode v3: a route graph over the open world (Phase C, also used by Field notes and the QA driver).
   It only reads what net-next.js already built: the main road, the streets, ramps, decks and bridges, and
   the solid boxes. Paths never cross a building, a pier or open water. Plain ES module, no Road file changes. */
const CELL = 8;

export function createRoutes({ net, roadZ, xLo = 6, xHi = 1850, mainStep = 6, step = 3, mainOff = 0 }) {
  const nodes = [];          // { x, y, z, kind, edge, elev, nb: [[j, cost]] }
  const hash = new Map();
  const key = (i, j) => i * 100003 + j;
  const add = (x, y, z, kind, edge, elev) => { const n = { id: nodes.length, x, y, z, kind, edge, elev, nb: [] }; nodes.push(n); return n; };
  const link = (a, b) => { if (a === b || a.nb.some(q => q[0] === b.id)) return; const c = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); a.nb.push([b.id, c]); b.nb.push([a.id, c]); };

  // clearance: how close a point (with a 2.2 m tall body) comes to any solid box
  function solidGap(x, z, y, h = 2.2) {
    let best = 99;
    net.solidsNear(x, z, b => {                      // every box within 1.6 m of this cell is listed in it
      if (y + h < b.y0 || y > b.y1 - 0.25) return;
      const ddx = x - b.x, ddz = z - b.z;
      const al = Math.abs(ddx * b.ux + ddz * b.uz) - b.hl, sd = Math.abs(-ddx * b.uz + ddz * b.ux) - b.hw;
      const d = al > 0 && sd > 0 ? Math.hypot(al, sd) : Math.max(al, sd);
      if (d < best) best = d;
    });
    return best;
  }
  function wet(x, z, y) { const s = net.surfaces(x, z); if (s[0].kind !== 'water') return false; return y < s[0].y + 1.0; }
  // a straight run between two points is clear of solids and water
  function clearLine(a, b, gap = 1.2) {         // the car is pushed off anything within about 1.15 m
    const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 1));
    for (let k = 0; k <= n; k++) {
      const f = k / n, x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f, y = a.y + (b.y - a.y) * f;
      if (wet(x, z, y) || solidGap(x, z, y) < gap) return false;
    }
    return true;
  }

  /* main road: one line of nodes, in the hero's own lane (mainOff) so routes keep out of the oncoming traffic */
  const main = [];
  for (let x = xLo; x <= xHi; x += mainStep) { const z = roadZ(x) + mainOff; main.push(add(x, net.ground(x, z), z, 'main', null, false)); }
  for (let i = 1; i < main.length; i++) link(main[i - 1], main[i]);
  const mainAt = x => main[Math.max(0, Math.min(main.length - 1, Math.round((x - xLo) / mainStep)))];

  /* streets, ramps, decks and bridges (paths and plazas are for people: left out) */
  const byEdge = new Map();
  net.edges.forEach(e => {
    if (e.kind === 'walk') return;
    const P = e.pts, n = P.length, list = [];
    let prev = null, broken = false;
    for (let i = 0; i < n; i++) {
      if (e.off && e.off[i]) { broken = true; continue; }
      if (i % step !== 0 && i !== n - 1) continue;
      const q = P[i];
      const nd = add(q[0], q[1], q[2], e.kind, e, !!e.elev);
      nd.i = i;
      if (solidGap(nd.x, nd.z, nd.y) < 1.0 || wet(nd.x, nd.z, nd.y)) { nd.dead = true; prev = null; broken = false; continue; }
      if (prev && !broken) link(prev, nd);
      prev = nd; broken = false; list.push(nd);
    }
    byEdge.set(e, list);
  });
  nodes.forEach(n => { if (!n.dead) { const k = key(Math.floor(n.x / CELL), Math.floor(n.z / CELL)); let a = hash.get(k); if (!a) hash.set(k, a = []); a.push(n); } });
  function near(x, z, r, f) {
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = hash.get(key(i, j)); if (a) for (const n of a) f(n); }
  }

  /* where streets meet: each other, the main road, and a ramp's foot on the ground */
  nodes.forEach(n => {
    if (n.dead || n.kind === 'main') return;
    const e = n.edge;
    // onto the main road where the street reaches its curb, at the same height
    if (Math.abs(n.z - roadZ(n.x)) < 8.3 + e.hw && n.y < net.ground(n.x, n.z) + 0.6) { const m = mainAt(n.x); if (Math.abs(m.y - n.y) < 0.8 && clearLine(n, m)) link(n, m); }
    near(n.x, n.z, 4, o => {
      if (o.dead || o === n || o.edge === e || o.kind === 'main') return;
      const r = Math.max(2.2, Math.min(e.hw, o.edge.hw) + 1.4);
      if (Math.hypot(o.x - n.x, o.z - n.z) > r || Math.abs(o.y - n.y) > 0.8) return;
      if (clearLine(n, o)) link(n, o);
    });
  });
  // the loose ends of each street or ramp: join the nearest drivable node within reach, ground to ground
  byEdge.forEach((list, e) => {
    // a ramp's foot joins the main road on a slant, the way you would drive onto it, not at a right angle
    if (e.kind === 'ramp' && list.length > 3) [[list[0], list[2]], [list[list.length - 1], list[list.length - 3]]].forEach(([n, q]) => {
      if (n.y > net.ground(n.x, n.z) + 0.8) return;
      const ux = q.x - n.x, uz = q.z - n.z, L = Math.hypot(ux, uz) || 1;
      let best = null, bs = Infinity;
      for (let dx = -30; dx <= 30; dx += mainStep) {
        const m = mainAt(n.x + dx), vx = n.x - m.x, vz = n.z - m.z, d = Math.hypot(vx, vz);
        if (d < 6 || d > 30 || Math.abs(m.y - n.y) > 0.8) continue;
        const al = (vx * ux + vz * uz) / (d * L); if (al < 0.5) continue;
        const sc = d * (2 - al); if (sc < bs && clearLine(m, n)) { bs = sc; best = m; }
      }
      if (best) { link(n, best); n.slant = true; }
    });
    [list[0], list[list.length - 1]].forEach(n => {
      if (!n || n.dead || n.slant || n.y > net.ground(n.x, n.z) + 0.8) return;
      let best = null, bd = 18;
      near(n.x, n.z, 18, o => { if (o.dead || o.edge === e || Math.abs(o.y - n.y) > 0.8) return; const d = Math.hypot(o.x - n.x, o.z - n.z); if (d < bd) { bd = d; best = o; } });
      const m = mainAt(n.x); { const d = Math.hypot(m.x - n.x, m.z - n.z); if (d < bd && Math.abs(m.y - n.y) < 0.8) { bd = d; best = m; } }
      if (best && !n.nb.some(q => q[0] === best.id) && clearLine(n, best)) link(n, best);
    });
  });

  /* the part of the network you can reach from the main road */
  const comp = new Int32Array(nodes.length).fill(-1);
  { const st = [main[0].id]; comp[main[0].id] = 0; while (st.length) { const a = st.pop(); for (const [b] of nodes[a].nb) if (comp[b] < 0) { comp[b] = 0; st.push(b); } } }
  const live = nodes.filter(n => !n.dead && comp[n.id] === 0);

  /* A*: shortest drive between two nodes */
  function astar(a, b) {
    if (a === b) return [a];
    const N = nodes.length, g = new Float64Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = []; const push = (id, f) => { heap.push([f, id]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const B = nodes[b], h = n => Math.hypot(n.x - B.x, n.y - B.y, n.z - B.z);
    g[a] = 0; push(a, h(nodes[a]));
    let pops = 0;
    while (heap.length) {
      const [, u] = pop(); if (closed[u]) continue; closed[u] = 1;
      if (u === b) break;
      if (++pops > 20000) return null;
      for (const [v, c] of nodes[u].nb) { if (closed[v]) continue; const ng = g[u] + c; if (ng < g[v]) { g[v] = ng; from[v] = u; push(v, ng + h(nodes[v])); } }
    }
    if (from[b] < 0) return null;
    const out = [b]; let u = b; while (u !== a) { u = from[u]; out.push(u); }
    return out.reverse();
  }
  // the node you are on or next to: same level first (a deck is not the street under it)
  function nearest(x, z, y = null, r = 14) {
    let best = null, bd = Infinity;
    near(x, z, r, n => {
      if (n.dead || comp[n.id] !== 0) return;
      const dy = y == null ? 0 : Math.abs(n.y - y);
      if (dy > 0.9) return;                          // a ramp beside you is not reachable from here
      const d = Math.hypot(n.x - x, n.z - z) + dy * 2;
      if (d < bd) { bd = d; best = n; }
    });
    if (!best && r < 60) return nearest(x, z, y, r * 2);
    if (!best) { const m = mainAt(x); return m; }
    return best;
  }
  function route(from, to) {
    const a = from.id != null ? from : nearest(from.x, from.z, from.y), b = to.id != null ? to : nearest(to.x, to.z, to.y);
    if (!a || !b) return null;
    const ids = astar(a.id, b.id); if (!ids) return null;
    const pts = ids.map(i => nodes[i]);
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
    return { pts, len, from: a, to: b };
  }
  return { nodes, live, main, mainAt, nearest, route, astar, clearLine, solidGap, wet, near };
}
