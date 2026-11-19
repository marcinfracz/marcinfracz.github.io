/* v69: the audio tour. "Audio tour" and "Tour without sound" (start card and settings) run one brief
   narrated drive through all 13 stops, with an optional Stories stop at each, and captions.
   Narration files: assets/audio/tour3-<id>.mp3 (t00 intro, s01..s13 stops, s01a.. stories, t99 finish).
   Background music: three tracks, off by default, never autoplay. */
const AUDIO = {
  voice: 'assets/audio/', // narration recorded in ElevenLabs
  tracks: [
    { name: 'Open road', file: 'assets/audio/music-open-road.mp3' },
    { name: 'Night drive', file: 'assets/audio/music-night-drive.mp3' },
    { name: 'Sunday cruise', file: 'assets/audio/music-sunday-cruise.mp3' },
  ],
};

const $ = s => document.querySelector(s);
const root = document.documentElement;
const isPhone = () => innerWidth < 768;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'mf-road-audio-v1';
const prefs = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })();
const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- music: three gentle generated tracks ---------------- */
const Music = (() => {
  let ctx = null, master = null, bus = null, delay = null, timer = null, el = null, elSrc = null;
  let track = -1, nextT = 0, step = 0, vol = typeof prefs.master === 'number' ? prefs.master : 0.9, duck = 1; /* v40: one master level; music always sits at a fixed share of the voice, no ducking */
  const MUSIC_SHARE = 0.22;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const SONGS = [
    { bpm: 84, bars: 2, chords: [[62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]] }, // D A Bm G
    { bpm: 100, bars: 1, chords: [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]] }, // Am F C G
    { bpm: 74, bars: 1, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]] }, // Cmaj7 Am7 Dm7 G7
  ];
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.28; const dl = ctx.createGain(); dl.gain.value = 0.35;
    delay.connect(fb); fb.connect(delay); delay.connect(dl); dl.connect(bus);
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) { ctx.suspend(); if (el) el.pause(); } else if (track >= 0) { ctx.resume(); if (el) el.play().catch(() => {}); } });
  }
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function osc(type, f, t, end, out, detune = 0) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    o.connect(out); o.start(t); o.stop(end + 0.05); return o;
  }
  function pad(notes, t, dur, lvl = 0.035, cut = 1100) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = 0.4;
    g.connect(lp); lp.connect(bus);
    env(g, t, Math.min(1.2, dur * 0.4), lvl, Math.max(0.05, dur * 0.5), 1.4);
    notes.forEach(n => { osc('sawtooth', hz(n), t, t + dur + 1.5, g, -7); osc('sawtooth', hz(n), t, t + dur + 1.5, g, 7); });
  }
  function pluck(n, t, lvl = 0.05, echo = true) {
    const g = ctx.createGain(); g.connect(bus); if (echo) g.connect(delay);
    env(g, t, 0.005, lvl, 0, 0.55); osc('triangle', hz(n), t, t + 0.7, g);
  }
  function keys(notes, t, dur, lvl = 0.03) {
    notes.forEach(n => {
      const g = ctx.createGain(); g.connect(bus); g.connect(delay);
      env(g, t, 0.01, lvl, 0.05, Math.min(2.2, dur + 0.6));
      osc('sine', hz(n), t, t + dur + 0.8, g);
      const g2 = ctx.createGain(); g2.gain.value = 0.25; g2.connect(g); osc('sine', hz(n + 12), t, t + 0.6, g2);
    });
  }
  function bass(n, t, dur, lvl = 0.09, type = 'triangle', cut = 500) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut;
    g.connect(lp); lp.connect(bus); env(g, t, 0.01, lvl, dur * 0.6, 0.18); osc(type, hz(n), t, t + dur + 0.25, g);
  }
  let noise = null;
  function hat(t, lvl = 0.018) {
    if (!noise) { noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noise;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = ctx.createGain(); s.connect(hp); hp.connect(g); g.connect(bus); env(g, t, 0.002, lvl, 0, 0.05); s.start(t); s.stop(t + 0.1);
  }
  function kick(t, lvl = 0.16) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(bus);
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    env(g, t, 0.003, lvl, 0, 0.22); o.start(t); o.stop(t + 0.3);
  }
  function play16(t, i) {
    const S = SONGS[track], s16 = 60 / S.bpm / 4, perChord = 16 * S.bars;
    const ci = Math.floor(i / perChord) % S.chords.length, ch = S.chords[ci], st = i % perChord, b = st % 16;
    if (track === 0) { // Open road: wide pad, soft bass, slow arpeggio
      if (st === 0) pad(ch, t, perChord * s16, 0.03, 1000);
      if (b === 0 || b === 8) bass(ch[0] - 24, t, s16 * 7, 0.08);
      if (b % 4 === 2) pluck(ch[(b / 2 + Math.floor(st / 16)) % ch.length] + 12, t, 0.035);
    } else if (track === 1) { // Night drive: pulsing bass, pad, quiet arp, light beat
      if (st === 0) pad(ch, t, perChord * s16, 0.022, 900);
      if (b % 2 === 0) bass(ch[0] - 24, t, s16 * 1.6, 0.07, 'sawtooth', 380);
      pluck(ch[i % ch.length] + 12, t, 0.016, false);
      if (b % 4 === 0) kick(t, 0.12);
      if (b % 4 === 2) hat(t, 0.014);
    } else { // Sunday cruise: warm keys, lazy beat
      if (b === 0 || b === 10) keys(ch, t, s16 * (b === 0 ? 9 : 6), 0.026);
      if (b === 0 || b === 7) bass(ch[0] - 24, t, s16 * 5, 0.09);
      if (b === 0 || b === 8) kick(t, 0.1);
      if (b === 4 || b === 12) hat(t, 0.02);
    }
  }
  function tick() {
    if (!ctx || track < 0 || el) return;
    const s16 = 60 / SONGS[track].bpm / 4;
    while (nextT < ctx.currentTime + 0.4) { play16(nextT, step); nextT += s16; step++; }
  }
  function level() { if (!master) return; const v = track >= 0 ? vol * MUSIC_SHARE * 0.9 : 0; master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(v, ctx.currentTime, 0.4); if (el) el.volume = Math.min(1, vol * MUSIC_SHARE); if (window.__tourVoiceLevel) window.__tourVoiceLevel(vol); }
  function stopFile() { if (el) { el.pause(); el = null; } }
  function set(i) {
    init(); if (!ctx) return;
    ctx.resume();
    stopFile();
    track = i;
    clearInterval(timer); timer = null;
    if (i >= 0) {
      const f = AUDIO.tracks[i] && AUDIO.tracks[i].file;
      const gen = () => { el = null; if (track !== i) return; nextT = ctx.currentTime + 0.12; step = 0; clearInterval(timer); timer = setInterval(tick, 100); tick(); level(); };
      if (f) { el = new Audio(f); el.loop = true; el.volume = Math.min(1, vol * MUSIC_SHARE); el.onerror = gen; el.play().catch(gen); }
      else gen();
    }
    level();
  }
  return {
    set, get track() { return track; },
    get vol() { return vol; },
    setVol(v) { vol = v; prefs.master = v; savePrefs(); level(); if (window.__tourVoiceLevel) window.__tourVoiceLevel(v); },
    duck() { /* v40: no ducking, the music level never moves */ },
  };
})();

/* ---------------- voice: one audio element, unlocked by the click that starts the tour ---------------- */
const Voice = (() => {
  let on = prefs.voice === true, unlocking = false;
  const el = new Audio(); el.preload = 'auto';
  const pre = new Audio(); pre.preload = 'auto';
  /* v73: Marcin's v5 narration. Stories s09a to s13d keep the v3 clips until they are re-recorded. */
  const V5 = new Set(["s01", "s01a", "s01b", "s02", "s02a", "s02b", "s03", "s03a", "s03b", "s03c", "s04", "s04a", "s04b", "s05", "s05a", "s05b", "s05c", "s06", "s06a", "s06b", "s07", "s07a", "s07b", "s07c", "s08", "s08a", "s08b", "s08c", "s09", "s10", "s11", "s12", "s13", "t00", "t99"]);
  /* v74: the finish says he is open to his next role (tour5-t99b) */
  /* v77: stop 8 uses tour5-s08m, where "Marcin" is spliced in from the approved finish take (MAR-sin) */
  const FIX = { t99: 'tour5-t99b', s08: 'tour5-s08m' };
  const src = id => FIX[id] ? `${AUDIO.voice}${FIX[id]}.mp3` : `${AUDIO.voice}${V5.has(id) ? 'tour5' : 'tour3'}-${id}.mp3`;
  /* v76: stop 6 opens with a short bridge clip ("Ross led him to General Motors.") before its own line */
  const PRE = { s06: `${AUDIO.voice}tour5-s06pre.mp3` };
  const seq = id => PRE[id] ? [PRE[id], src(id)] : [src(id)];
  window.__tourVoiceLevel = v => { el.volume = Math.min(1, v); };
  el.volume = Math.min(1, Music.vol);
  return {
    el, src, seq,
    unlock(id) { /* a muted play inside the click lets later clips play on phones too */
      unlocking = true;
      const done = () => { if (unlocking) { unlocking = false; try { el.pause(); } catch (e) {} el.muted = false; } };
      try { el.src = src(id); el.muted = true; const p = el.play(); if (p && p.then) p.then(done, done); else done(); } catch (e) { done(); }
    },
    claim() { unlocking = false; el.muted = false; },
    preload(id) { if (!on || !id) return; try { pre.src = seq(id)[0]; pre.load(); } catch (e) {} },
    stop() { el.onended = el.onerror = null; try { el.pause(); } catch (e) {} },
    get on() { return on; },
    set(v) { on = !!v; prefs.voice = on; savePrefs(); },
  };
})();

/* ---------------- the audio tour (v69) ----------------
   One brief narrated drive: an intro at the start, then every stop in order. At each stop the camera
   drives there, a short line plays, then Stories is offered for a few seconds with a countdown. If the
   visitor taps it, that stop's stories play one by one, each opening on screen; then the drive goes on.
   Without voice, the same captions run on a reading timer. */
const CAPS = {
 "t00": "Twenty years inside the auto industry—from tier-one component engineering to running software strategy in Shanghai. This road traces how Marcin moves between hardware, commercial strategy, and AI to get complex programs shipped. The tour drives itself; tap Stories at any stop to dig into the decisions behind the work.",
 "s01": "Most engineers don't see a live production floor until after graduation. At Kettering, Marcin spent every other term inside Federal-Mogul, graduating cum laude with four years of real plant and testing discipline already built in.",
 "s01a": "Balancing a full mechanical engineering load with alternating industry terms meant theory was constantly tested against real manufacturing constraints.",
 "s01b": "Working across engine sealing programs for GM, Ford, Volkswagen, and Cummins—including gasket development on the 5.7-liter HEMI—gave him an early instinct for how suppliers and automakers actually negotiate trade-offs.",
 "s02": "Entering the industry during the 2007 downturn, Marcin stepped straight into value engineering and core program ownership—taking Chrysler's new 3.6-liter Pentastar head gasket from an early fatigue failure into volume production.",
 "s02a": "The original gasket design was cracking under thermal cycling. Marcin engineered a multi-layer steel replacement, proved it on thermal pulsator rigs, and cleared it for launch.",
 "s02b": "Driving three million dollars in annual cost reductions took more than a CAD change—he had to align purchasing, operations, sales, and suppliers around the same business case, generating four patent disclosures along the way.",
 "s03": "In 2010, Marcin moved across the table to Chrysler, taking end-to-end release ownership for every sealing system on the Pentastar V6—an architecture that went on to surpass ten million engines built.",
 "s03a": "Carrying a critical component from supplier validation into OEM release is rare. That continuity helped push the Pentastar past its first million engines within eighteen months of launch.",
 "s03b": "When a supplier quality spill threatened the rear main seal, Marcin made the call to halt plant shipments rather than risk field failures, then led the re-sourcing effort to protect launch volume.",
 "s03c": "Right as Chrysler and Fiat were integrating, he unified two separate purchasing playbooks into a single global head gasket strategy—cutting seven hundred thousand dollars a year in structural cost.",
 "s04": "At Johnson Controls, the scope expanded from powertrain components to full vehicle interiors—leading a cross-functional team to deliver complete seating systems for Nissan's Titan and Armada ahead of schedule.",
 "s04a": "Seating is where structure, safety, electronics, and craftsmanship collide. Marcin managed the program across twelve functions and two direct reports, beating launch timing while pulling cost out of every seat.",
 "s04b": "Working directly with Nissan's product planners, he stripped out low-take trim combinations that added plant complexity without moving the needle for buyers.",
 "s05": "While running Nissan seating programs full time, Marcin earned his MBA at Michigan Ross at night—shifting his focus from how to engineer a system to which products a company should bet on.",
 "s05a": "Four years of evening coursework alongside a full-time engineering leadership role built the financial and strategic toolkit he needed to step out of pure R&D.",
 "s05b": "For his multidisciplinary action project in British Columbia, he spent a week on site with an open-innovation firm and delivered a market-entry roadmap straight to its CEO.",
 "s05c": "That combination of deep engineering credibility and Ross strategy training opened the door to General Motors' three-year, up-or-out leadership rotation.",
 "s06": "Ross led him to General Motors. His first GM rotation put him on the Chevrolet Traverse, using buyer-behavior analytics to strip out unprofitable build combinations and sharpen entry-level pricing.",
 "s06a": "Trimming ten percent of build combinations cleaned up dealer inventory and plant scheduling, while a sharper entry price point lifted launch consideration by six percent.",
 "s06b": "To get commercial and manufacturing teams on the same page, Marcin built his own complexity-modeling tool—turning messy option data into clear margin and volume trade-offs.",
 "s07": "When GM wanted to raise global dealer service retention, Marcin studied the highest-scoring region in the company—Ecuador—and scaled what made it work into a worldwide Chevrolet culture program.",
 "s07a": "On the ground in Quito and Guayaquil, the differentiator wasn't software—it was transparency. Letting owners watch their vehicles being serviced eliminated skepticism and drove top-decile trust scores.",
 "s07b": "To translate that service mindset across global dealer networks, Marcin partnered with the Disney Institute in Orlando to design a repeatable training curriculum.",
 "s07c": "Back in Detroit, he managed the program budget and led executive workshops at the Detroit Opera House to roll the standard out across leadership.",
 "s08": "For his international rotation in Mexico City, Marcin led the nationwide rollout of dealer Business Development Centers—turning inconsistent showroom follow-up into a disciplined sales engine and earning a promotion home.",
 "s08a": "Over six months on the ground across Mexico City, Guadalajara, and Monterrey, he personally visited more than three hundred fifty dealerships to drive adoption.",
 "s08b": "Most lost deals die in the first twenty-four hours. Marcin stood up dedicated follow-up teams inside dealerships and reported rollout performance directly to GM Mexico's Managing Director.",
 "s08c": "Knowing field visits wouldn't scale forever, he built an online training portal and video library so dealers could onboard new reps long after the launch team left.",
 "s09": "Promoted to Global Product Manager, Marcin aligned leadership across the US, Canada, and Korea around a single content and pricing architecture for GM's compact and midsize crossovers.",
 "s09a": "Aligning executives in three countries on one plan cut post-refresh price decay by 5% and supported $200 per-vehicle profit improvements on Equinox and Traverse.",
 "s09b": "For the next-generation Equinox, he led global customer content workshops, informed by market research in China in 2018.",
 "s10": "Tasked with launching two Korea-built crossovers—the Buick Encore GX and Chevrolet Trailblazer—just as COVID-19 fractured global supply chains, Marcin kept both programs on schedule.",
 "s10a": "During the wire-harness shortage, he built a tool that matched builds to demand and harness supply. When the hero color wasn't ready, the show cars got off-line paint, and they arrived on time and under budget.",
 "s10b": "He added the Encore GX ST Black Roof Package within six months of production start, and built the greenhouse gas model that added a front-wheel-drive Trailblazer ACTIV to the lineup.",
 "s11": "In 2020, Marcin pivoted from vehicle hardware to recurring software revenue—building the commercial monetization strategy for Super Cruise and over-the-air upgrades across GM's North American brands.",
 "s11a": "He grew the team from 2 to 7 and won executive approval for an in-market trial of paid driver-assist upgrades, a high-margin revenue opportunity of about $30M.",
 "s11b": "He built the monetization strategy for Super Cruise across every GM brand in North America, then for the next-generation Ultra Cruise.",
 "s11c": "He also helped shape the over-the-air services behind revenue after the sale, part of GM's 2021 goal of $20 to 25B a year in software and services by 2030.",
 "s12": "In 2022, Marcin relocated to Shanghai as Deputy Director of Software Strategy at SAIC-GM—known as SGM—helping a legacy joint venture match the software pace of China's EV challengers.",
 "s12a": "He helped form SAIC-GM's software and digital business team of about 2,500 people, through approval by the GM, SAIC and SAIC-GM boards, and co-led a 49-person strategy, insights and research team.",
 "s12b": "He ran consumer research across Chinese cities on what drivers will pay for in driver assist. The research and pitch supported a nine-figure investment.",
 "s12c": "In the intelligent cockpit, he shaped an AI 'Model Integrator' strategy that brings voice and vision together.",
 "s12d": "GM China and SAIC-GM studies showed technology had become the new luxury for Chinese buyers. He helped realign the work and messaging to launch intelligent features faster.",
 "s13": "Returning to Michigan in 2025, Marcin took ownership of connected-service planning for China-built GM vehicles exported across eight global regions—aligning OnStar, regional P&Ls, and JV engineering teams on launch execution.",
 "s13a": "Each export region, from Mexico and South America to the Middle East, Korea, Israel, Australia and Central Asia, had its own connectivity needs and launch timing.",
 "s13b": "The plans covered the export portfolio: the Chevrolet Aveo, Spark EUV and Captiva, and the Cadillac XT5.",
 "s13c": "In August 2026 he kept driver assist in scope with a global strategy workshop on L2, L2+ and L2++. At GM Forward that October, GM said hands-free highway driving will expand: the same space this work covered.",
 "s13d": "Unprompted and solo, he built Portfolio Made Visible with AI agents. It turns 200+ programs across 50+ markets into any market-year view in seconds, at a fraction of the cost of a retired legacy tool, and grew by word of mouth to 40+ monthly users.",
 "t99": "That's the road so far. Marcin is now open to his next leadership role in automotive strategy, product and AI. Let's talk."
};
const R = () => window.__road;
const C = () => window.ROAD_CONTENT || {};
const STOPS = () => C().stops || [];
const LAST = () => STOPS().length - 1;            /* the finish */
const pad2 = n => String(n).padStart(2, '0');
const quickId = i => (i === 0 ? 't00' : i === LAST() ? 't99' : 's' + pad2(i));
const storyId = (i, k) => 's' + pad2(i) + 'abcdefgh'[k];
const nStories = i => (i > 0 && i < LAST() ? ((STOPS()[i] || {}).callouts || []).length : 0);
const storyLabel = (i, k) => { const c = ((STOPS()[i] || {}).callouts || [])[k]; if (!c) return ''; const t = c.text, j = t.indexOf(': '); return j > 0 ? t.slice(0, j) : t.replace(/\.$/, ''); };
const placeName = i => { const s = STOPS()[i] || {}, p = (C().profile || {})[s.id]; return p && p.company ? p.company : s.title || ''; };
const flowMode = () => isPhone() || !R();          /* phones, and the plain list without 3D, scroll the page instead */
const readMs = t => Math.max(3500, 1200 + t.split(/\s+/).length * 270);
const WINDOW_MS = 6000;
const LOG = []; const L = (...a) => { LOG.push([Math.round(performance.now()), ...a]); if (LOG.length > 120) LOG.shift(); };

let ui = null, running = false, paused = false, token = 0, raf = 0, lastFocus = null;
let lastCur = -1, at = 0, phase = '', storyK = -1, unit = null, only = false, capsOn = prefs.captions !== false, driving = false;

/* a unit is one caption: a voice clip, or a reading timer. It can be paused, skipped or cancelled. */
function runUnit(id, kind) {
  return new Promise(res => {
    const u = { id, kind, res, done: false, audio: false, left: 0, total: 0, t0: 0, timer: 0 };
    unit = u;
    const timed = ms => { u.audio = false; u.total = u.left = ms; startTimer(u); };
    if (kind === 'window') timed(WINDOW_MS);
    else if (Voice.on) {
      const a = Voice.el; u.audio = true;
      const parts = Voice.seq(id); let k = 0;
      a.onended = () => { if (++k < parts.length && unit === u && !u.done) { a.src = parts[k]; if (!paused) a.play().catch(() => {}); } else finish(u, true); };
      a.onerror = () => { if (unit === u && !u.done) timed(readMs(CAPS[id] || '')); };
      Voice.claim(); a.src = parts[0];
      if (!paused) a.play().catch(() => { if (unit === u && !u.done && !paused) timed(readMs(CAPS[id] || '')); });
    } else timed(readMs(CAPS[id] || ''));
  });
}
function startTimer(u) { clearTimeout(u.timer); u.t0 = performance.now(); if (!paused) u.timer = setTimeout(() => finish(u, true), u.left); }
function finish(u, ok) { if (!u.done) L('finish', u.id || u.kind, ok); if (u.done) return; u.done = true; clearTimeout(u.timer); if (u.audio) Voice.stop(); if (unit === u) unit = null; u.res(ok); }
function cancelUnit() { if (unit) finish(unit, false); }
function skipUnit() { if (unit) finish(unit, true); }
function pauseUnit() { if (!unit) return; if (unit.audio) Voice.el.pause(); else { clearTimeout(unit.timer); unit.left = Math.max(0, unit.left - (performance.now() - unit.t0)); } }
function resumeUnit() { if (!unit) return; if (unit.audio) Voice.el.play().catch(() => {}); else startTimer(unit); }
function unitProgress() {
  if (!unit) return null;
  if (unit.audio) { const a = Voice.el; return a.duration ? Math.min(1, a.currentTime / a.duration) : 0; }
  const gone = unit.total - unit.left + (paused ? 0 : performance.now() - unit.t0);
  return Math.min(1, Math.max(0, gone / unit.total));
}
const waitPlay = my => new Promise(r => { const t = () => (my !== token ? r(false) : paused ? setTimeout(t, 120) : r(true)); t(); });

/* ---------- driving ---------- */
const flowSec = i => { const s = STOPS()[i]; return s ? document.getElementById('m-' + s.id) : null; };
async function driveTo(i, my) {
  driving = true;
  try {
    if (flowMode()) {
      const sec = flowSec(i);
      if (sec) sec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      await wait(reduced ? 150 : 900);
      return;
    }
    const r = R();
    if (r.story !== null) r.closeStory();
    if (r.zoom) r.setZoom(0);
    if (i === 0) { if (r.cur !== 0) r.toStart(); }
    else if (r.cur !== i) {
      if (r.cur === 0) { const b = document.querySelector('#card [data-act="next"]'); if (b && i === 1) b.click(); else r.go(i); }
      else r.go(i);
    }
    const t0 = performance.now(), card = $('#card');
    while (performance.now() - t0 < 6500) {
      if (my !== token) return;
      if (r.cur === i && card && !card.classList.contains('out')) break;
      await wait(80);
    }
    await wait(reduced ? 60 : 350);
  } finally { driving = false; }
}

/* ---------- the script ---------- */
async function runFrom(i, opts = {}) {
  const my = ++token; L('runFrom', i, JSON.stringify(opts), phase);
  cancelUnit(); paused = false; syncPause();
  for (let s = i; s <= LAST(); s++) {
    if (my !== token) return;
    const go = await visit(s, my, s === i ? opts : {});
    if (!go || my !== token) return;
  }
}
async function visit(i, my, opts) {
  at = i; storyK = -1; only = false; phase = 'drive'; head();
  await driveTo(i, my);
  if (my !== token || !(await waitPlay(my))) return false;
  const n = nStories(i);
  let want = opts.story != null;
  if (!want) {
    phase = 'quick'; head(); caption(quickId(i));
    Voice.preload(n ? storyId(i, 0) : quickId(i + 1));
    const ok = await runUnit(quickId(i), 'quick');
    if (my !== token) return false;
    if (!ok) return false;
    if (i === LAST()) { outro(); return false; }
    if (!n) return true;
    phase = 'window'; head();
    const w = await runUnit('', 'window');
    if (my !== token) return false;
    if (!w) return false;
    want = phase === 'stories';
    if (!want) return true;
  }
  /* the stories, one after another, or just the one the visitor picked */
  only = !!opts.only;
  for (let k = opts.story || 0; k < n; k++) {
    if (my !== token) return false;
    storyK = k; phase = 'stories'; head(); caption(storyId(i, k));
    if (!flowMode()) { R().openStory(k); }
    Voice.preload(k + 1 < n ? storyId(i, k + 1) : quickId(i + 1));
    const ok = await runUnit(storyId(i, k), 'story');
    if (my !== token) return false;
    if (!ok) return false;
    if (only) break;
    if (!(await waitPlay(my))) return false;
  }
  storyK = -1;
  if (!flowMode() && R().story !== null) R().closeStory();
  if (only) { /* after a picked story, offer the rest again before driving on */
    only = false; phase = 'window'; head(); caption(quickId(i), true);
    const w = await runUnit('', 'window');
    if (my !== token || !w) return false;
    if (phase === 'stories') return visit(i, my, { story: 0 });
  }
  return true;
}
function outro() {
  phase = 'end'; head();
  const b = document.querySelector('#card .fin-reel-btn, #flow [data-mfreel], #flow .reel');
  if (b) b.classList.add('tour-pulse');
}

/* ---------- the tour box ---------- */
const ICON_CC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6"/></svg>';
const ICON_VOICE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path class="w" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="x" d="M16 9l5 6M21 9l-5 6"/></svg>';
function build() {
  if (ui) return;
  ui = document.createElement('div'); ui.className = 'tour-box tour3'; ui.setAttribute('role', 'region'); ui.setAttribute('aria-label', 'Audio tour of The Road'); ui.hidden = true;
  ui.innerHTML = `<div class="tb-top"><span class="tb-n" id="tb-n"></span><span class="tb-where" id="tb-where"></span><div class="tb-bar"><i id="tb-fill"></i></div>
    <button type="button" class="tb-ic" id="tb-cc" aria-pressed="true" aria-label="Captions" title="Captions">${ICON_CC}</button>
    <button type="button" class="tb-ic" id="tb-voice" aria-pressed="true" aria-label="Voice" title="Voice">${ICON_VOICE}</button>
    <button type="button" class="tb-ic" id="tb-x" aria-label="End the tour" title="End the tour (Esc)">×</button></div>
    <p class="tb-sub" id="tb-sub" hidden></p>
    <p class="tb-t" id="tb-t" aria-live="polite"></p>
    <div class="tb-acts"><button type="button" class="tb-btn" id="tb-back" title="Back (←)">Back</button><button type="button" class="tb-btn" id="tb-pause" aria-pressed="false" title="Pause (Space)">Pause</button>
      <button type="button" class="tb-btn tb-stories" id="tb-stories" title="Stories (S)"><svg class="tb-cd" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8"/><circle class="cd" cx="10" cy="10" r="8" pathLength="100"/></svg><span id="tb-stories-l">Stories</span></button>
      <button type="button" class="tb-btn primary" id="tb-next" title="Next (→)">Next stop</button></div>`;
  document.body.append(ui);
  $('#tb-x').addEventListener('click', () => end());
  $('#tb-next').addEventListener('click', next);
  $('#tb-back').addEventListener('click', back);
  $('#tb-pause').addEventListener('click', togglePause);
  $('#tb-stories').addEventListener('click', stories);
  $('#tb-voice').addEventListener('click', () => { Voice.set(!Voice.on); syncVoice(); syncMenu(); replay(); });
  $('#tb-cc').addEventListener('click', () => { capsOn = !capsOn; prefs.captions = capsOn; savePrefs(); syncCaps(); });
  addEventListener('keydown', e => {
    if (!running || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target && e.target.closest ? e.target : null;
    if (t && t.closest('input, select, textarea, [contenteditable]')) return;
    const own = t && ui.contains(t) && t.closest('button');
    if (own && (e.key === ' ' || e.key === 'Enter')) { e.stopImmediatePropagation(); return; } /* the focused tour button clicks itself */
    let hit = true;
    if (e.key === 'Escape') end();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') next();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') back();
    else if (e.key === ' ' || e.key === 'Spacebar') togglePause();
    else if (e.key === 's' || e.key === 'S') stories();
    else hit = false;
    if (hit) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  /* a story picked on screen during the tour plays just that story */
  document.addEventListener('click', e => {
    if (!running || at <= 0 || at >= LAST()) return;
    const m = e.target.closest && e.target.closest('#markers .marker, .marker, #card .item, #card .story-tabs button, #card .story-next');
    if (!m || !m.closest('#card, #markers, .markers, body')) return;
    let k = m.dataset && m.dataset.k != null && m.dataset.k !== '' ? +m.dataset.k : NaN;
    if (isNaN(k) && m.classList.contains('marker')) k = parseInt(m.textContent, 10) - 1;
    if (isNaN(k) || k < 0 || k >= nStories(at)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    runFrom(at, { story: k, only: true });
  }, true);
  /* driving the road by hand pauses the tour where the visitor stopped */
  const handDrive = e => { if (!running || paused || !flowMode() || !ui || ui.contains(e.target)) return; if (e.target.closest && e.target.closest('.bar, .ctl-pop, .pd-sheet, .pm-sheet, #reel-pop, .reel-pop')) return; pauseTour(); };
  addEventListener('wheel', handDrive, { passive: true, capture: true });
  addEventListener('touchmove', handDrive, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) pauseTour(); });
}
function caption(id, keep) { const t = $('#tb-t'); if (t && !keep) t.textContent = CAPS[id] || ''; }
function head() {
  if (!ui) return;
  const last = LAST(), n = nStories(at);
  $('#tb-n').textContent = at === 0 ? 'Intro' : at === last ? 'The finish' : `Stop ${at} of ${last - 1}`;
  $('#tb-where').textContent = at === 0 || at === last ? '' : placeName(at);
  const sub = $('#tb-sub');
  if (phase === 'stories' && storyK >= 0) { sub.textContent = `Story ${storyK + 1} of ${n} · ${storyLabel(at, storyK)}`; sub.hidden = false; }
  else sub.hidden = true;
  const sb = $('#tb-stories'), sl = $('#tb-stories-l');
  sb.hidden = !n || phase === 'end';
  sb.classList.toggle('ask', phase === 'window');
  sl.textContent = phase === 'stories' ? 'Back to the drive' : phase === 'window' ? `Hear the stories (${n})` : `Stories (${n})`;
  const nx = $('#tb-next');
  nx.textContent = phase === 'end' || at === last ? 'Done' : phase === 'stories' && storyK < n - 1 && !only ? 'Next story' : at === 0 ? 'Start' : at === last - 1 ? 'To the finish' : 'Next stop';
  $('#tb-back').disabled = at === 0 && phase !== 'stories';
  $('#tb-pause').hidden = phase === 'end';
  ui.classList.toggle('at-end', phase === 'end');
  ui.classList.toggle('at-last', at === last);
}
function syncPause() { const b = $('#tb-pause'); if (!b) return; b.textContent = paused ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', String(paused)); if (ui) ui.classList.toggle('paused', paused); }
function syncVoice() { const b = $('#tb-voice'); if (!b) return; b.setAttribute('aria-pressed', String(Voice.on)); b.setAttribute('aria-label', Voice.on ? 'Voice on' : 'Voice off'); b.classList.toggle('off', !Voice.on); syncCaps(); }
function syncCaps() { const b = $('#tb-cc'); if (!b) return; const show = capsOn || !Voice.on; b.setAttribute('aria-pressed', String(show)); b.classList.toggle('off', !show); b.disabled = !Voice.on; ui.classList.toggle('nocap', !show); }

/* ---------- controls ---------- */
function next() {
  L('next', at, phase, storyK);
  if (phase === 'end' || at >= LAST()) return end();
  if (phase === 'stories' && storyK < nStories(at) - 1 && !only) { if (paused) { paused = false; syncPause(); } return skipUnit(); }
  if (phase === 'window' && only) { only = false; }
  runFrom(Math.min(LAST(), at + 1));
}
function back() {
  L('back', at, phase, storyK);
  if (phase === 'stories' && storyK > 0) return runFrom(at, { story: storyK - 1 });
  if (phase === 'stories' || phase === 'window') return runFrom(at);
  runFrom(Math.max(0, at - 1));
}
function stories() {
  L('stories', at, phase, storyK, paused);
  const n = nStories(at); if (!n || phase === 'end') return;
  if (phase === 'stories') return runFrom(Math.min(LAST(), at + 1));
  if (phase === 'window' && unit && !paused) { phase = 'stories'; return skipUnit(); }
  runFrom(at, { story: 0 });
}
function pauseTour() { L('pause', at, phase); if (paused || phase === 'end') return; paused = true; syncPause(); pauseUnit(); }
function togglePause() {
  if (phase === 'end') return;
  if (!paused) return pauseTour();
  paused = false; syncPause();
  /* if the visitor drove elsewhere while paused, pick up from where they are */
  if (!flowMode() && R().cur !== at && !driving) return runFrom(R().cur);
  if (unit) resumeUnit(); else if (phase === 'drive') {} else runFrom(at);
}
function replay() { /* voice switched mid-step: say the same thing again the new way */
  if (!running || phase === 'end' || phase === 'drive') return;
  if (phase === 'window') return;
  runFrom(at, phase === 'stories' ? { story: storyK, only } : {});
}

function place() {
  if (!running) return;
  if (!isPhone()) {
    const c = $('#card'), rail = $('#chapters');
    /* v71: the card and rail are position:fixed, so offsetParent is always null; test their boxes instead */
    const shown = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' ? r : null; };
    const cr = shown(c), rr = shown(rail);
    const cardR = cr ? cr.right : 16, rl = rr && rr.left > innerWidth / 2 ? rr.left : innerWidth;
    let w = Math.min(460, innerWidth - 32);
    let left = (16 + innerWidth) / 2 - w / 2;          /* same centred spot as before on wide screens */
    if (left < cardR + 16) {                             /* tablets: centred would sit on the card, so dock beside it */
      left = cardR + 16;
      w = Math.max(300, Math.min(w, rl - 16 - left));
    }
    left = Math.max(16, Math.min(left, innerWidth - w - 16));
    ui.style.left = left + 'px'; ui.style.width = w + 'px';
  } else { ui.style.left = ''; ui.style.width = ''; }
  const p = unitProgress(), f = $('#tb-fill');
  if (unit && unit.kind === 'window') {
    const cd = ui.querySelector('.tb-cd .cd'); if (cd) cd.style.strokeDashoffset = String(100 * (p || 0));
  } else if (f && p != null) f.style.width = (p * 100).toFixed(1) + '%';
  /* the visitor drove the road by hand: pause where they stopped */
  if (!flowMode()) { const rc = R().cur; if (!driving && !paused && phase !== 'end' && rc !== lastCur && rc !== at) pauseTour(); lastCur = rc; }
  raf = requestAnimationFrame(place);
}

function begin(withVoice) {
  if (typeof withVoice === 'boolean') Voice.set(withVoice);
  build();
  if (Voice.on) Voice.unlock('t00');
  if (!running) lastFocus = document.activeElement;
  running = true; paused = false;
  root.classList.add('touring');
  if (!flowMode()) { R().setCtl(false); R().closeStory(); R().setZoom(0); }
  document.querySelectorAll('.tour-pulse').forEach(x => x.classList.remove('tour-pulse'));
  ui.hidden = false; syncPause(); syncVoice(); syncMenu();
  cancelAnimationFrame(raf); place();
  runFrom(0);
  setTimeout(() => $('#tb-next').focus({ preventScroll: true }), 50);
}
function end() {
  if (!running) return;
  token++; cancelUnit(); Voice.stop(); cancelAnimationFrame(raf);
  running = false; paused = false; phase = ''; ui.hidden = true; root.classList.remove('touring');
  document.querySelectorAll('.tour-pulse').forEach(x => x.classList.remove('tour-pulse'));
  if (!flowMode() && R().story !== null) R().closeStory();
  if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

/* the tour buttons: data-voice="1" with voice, "0" without, none keeps the last choice */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-act="tour"]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const v = b.dataset.voice;
  begin(v === '1' ? true : v === '0' ? false : undefined);
});

/* ---------------- settings menu: music and voice ---------------- */
function syncMenu() {
  document.querySelectorAll('#music-seg button').forEach(b => { const on = +b.dataset.t === Music.track; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  document.querySelectorAll('#voice-seg button').forEach(b => { const on = (b.dataset.v === '1') === Voice.on; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const v = $('#music-vol'); if (v) v.value = Math.round(Music.vol * 100);
  const c = $('#ctl-btn'); if (c) c.classList.toggle('music-on', Music.track >= 0);
}
document.querySelectorAll('#music-seg button').forEach(b => b.addEventListener('click', () => { Music.set(+b.dataset.t); try { sessionStorage.setItem('mf-road-music', String(Music.track)); } catch (e) {} syncMenu(); }));
/* v51: a track picked earlier in this visit comes back with the visitor's first tap or key (browsers never let sound start on its own) */
(() => {
  let t = -1; try { t = parseInt(sessionStorage.getItem('mf-road-music') || '-1', 10); } catch (e) {}
  if (!(t >= 0 && t < AUDIO.tracks.length)) return;
  const go = () => { removeEventListener('pointerdown', go, true); removeEventListener('keydown', go, true); if (Music.track < 0) { Music.set(t); syncMenu(); } };
  addEventListener('pointerdown', go, true); addEventListener('keydown', go, true);
})();
document.querySelectorAll('#voice-seg button').forEach(b => b.addEventListener('click', () => { Voice.set(b.dataset.v === '1'); syncMenu(); syncVoice(); replay(); }));
const vol = $('#music-vol'); if (vol) vol.addEventListener('input', () => Music.setVol(vol.value / 100));
syncMenu();

window.__tour = { begin, end, get running() { return running; }, get stop() { return at; }, get phase() { return phase; }, get story() { return storyK; }, get paused() { return paused; }, log: LOG, music: Music, voice: Voice };
