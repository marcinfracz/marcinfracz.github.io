/* v38: "Show me around": a guided tour that drives the Road for the visitor, with captions and an
   optional voice, plus three background music tracks (off by default, never autoplay).
   Audio hooks: when recorded files exist, list them below and they replace the built-in sound.
     AUDIO.voice  folder of per-step narration files named tour-d01.mp3 ... tour-d11.mp3 (desktop) and tour-p01.mp3 ... tour-p06.mp3 (phone)
     AUDIO.tracks[i].file  a looping music file for that track */
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

/* ---------------- voice ---------------- */
const Voice = (() => {
  let on = prefs.voice === true, cur = null, chosen = null;
  const synth = window.speechSynthesis;
  function pick() {
    if (!synth) return null;
    const vs = synth.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang));
    const score = v => (/natural|neural|online/i.test(v.name) ? 8 : 0) + (/aria|jenny|guy|davis|google us english|samantha|ava|allison/i.test(v.name) ? 4 : 0) + (/en-us/i.test(v.lang) ? 2 : 0) + (v.localService ? 0 : 1);
    vs.sort((a, b) => score(b) - score(a));
    return vs[0] || null;
  }
  if (synth) { chosen = pick(); synth.addEventListener && synth.addEventListener('voiceschanged', () => { chosen = pick(); }); }
  function stop() { if (cur && cur.pause) { cur.pause(); } cur = null; if (synth) synth.cancel(); Music.duck(false); }
  function say(text, id) {
    stop();
    if (!on) return Promise.resolve(false);
    return new Promise(res => {
      const done = ok => { Music.duck(false); res(ok); };
      if (AUDIO.voice) {
        const a = new Audio(`${AUDIO.voice}tour-${id}.mp3`); cur = a; a.volume = Math.min(1, Music.vol);
        a.onended = () => done(true); a.onerror = () => speak(); /* a missing file falls back to the browser voice */
        Music.duck(true); a.play().catch(() => speak()); return;
      }
      speak();
      function speak() {
      if (!synth) return done(false);
      const u = new SpeechSynthesisUtterance(text.replace(/Marcin/g, 'Marsin')); /* said MAR-sin */
      if (!chosen) chosen = pick();
      if (chosen) u.voice = chosen;
      u.rate = 1.02; u.pitch = 1; u.volume = Math.min(1, Music.vol);
      let fin = false; const end = ok => { if (!fin) { fin = true; done(ok); } };
      u.onend = () => end(true); u.onerror = () => end(false);
      setTimeout(() => end(false), 1000 + text.split(' ').length * 520); // never hang on a silent engine
      Music.duck(true); synth.speak(u);
      }
    });
  }
  window.__tourVoiceLevel = v => { if (cur && cur.pause) cur.volume = Math.min(1, v); };
  return { say, stop, get on() { return on; }, set(v) { on = v; prefs.voice = v; savePrefs(); if (!v) stop(); } };
})();

/* ---------------- the tour ---------------- */
const R = () => window.__road;
const click = sel => { const e = typeof sel === 'string' ? $(sel) : sel; if (e) e.click(); };
const hoverOn = (e, on) => { if (!e) return; try { e.dispatchEvent(new PointerEvent(on ? 'pointerenter' : 'pointerleave')); } catch (x) {} };
const stopIx = id => { const S = (window.ROAD_CONTENT || {}).stops || []; return Math.max(0, S.findIndex(s => s.id === id)); };

let theme0 = null;
const DESK = [
  { id: 'd01', t: 'Welcome to The Road. Marcin\'s career is laid out as a drive, one stop for each chapter. I\'ll drive it for you. You can skip at any time.', el: '#card' },
  { id: 'd02', t: 'Start the drive takes you to the first stop. Each stop shows the company, the role, the years and the results.', el: '#card',
    run: async () => { const b = $('#card [data-act="next"]'); if (b && R().cur === 0) b.click(); else R().go(1); await wait(1500); } },
  { id: 'd03', t: 'To keep driving, scroll, use the arrow keys, or drag the road. Here\'s the next stop.', el: '#card',
    run: async () => { for (let i = 0; i < 9; i++) { R().nudge(9); await wait(70); } await wait(1200); } },
  { id: 'd04', t: 'Each stop has a few short stories. Open one to see the work behind the result. The lettered pins in the scene match the stories.', el: '#card',
    run: async () => { R().openStory(0); await wait(2600); if (R().story !== null) R().openStory(1); } },
  { id: 'd05', t: 'The rail on the right is the whole career. Point at it to see each stop, and click to jump. Here\'s business school at Michigan Ross.', el: '#chapters',
    run: async () => { R().closeStory(); const tk = document.querySelectorAll('#progress .vr-tick')[stopIx('ross')]; hoverOn(tk, true); await wait(1400); hoverOn(tk, false); R().go(stopIx('ross')); await wait(1200); } },
  { id: 'd06', t: 'For the big picture, zoom out with the minus key, a pinch, or Control and scroll.', el: null,
    run: async () => { R().setZoom(1); await wait(2400); } },
  { id: 'd07', t: 'Press plus, or click any chapter, to fly back in.', el: null,
    run: async () => { R().setZoom(0); await wait(1600); } },
  { id: 'd08', t: 'The gear opens the settings: sensors, light, zoom, background music, and this tour, so you can replay it any time. Music stays off unless you pick a track.', el: '#ctl-pop',
    run: async () => { R().setCtl(true); } },
  { id: 'd09', t: 'The sun and moon button switches between day and dusk.', el: '#theme-btn',
    run: async () => { R().setCtl(false); theme0 = theme0 || root.getAttribute('data-theme'); click('#theme-btn'); await wait(2600); if (root.getAttribute('data-theme') !== theme0) click('#theme-btn'); } },
  { id: 'd10', t: 'Up top, you can always reach the Desktop, live demos of tools Marcin built, the timeline, his resume, and how to get in touch.', el: '.bar-links', links: true },
  { id: 'd11', t: 'That\'s the tour. Start the drive whenever you\'re ready.', el: '#card',
    run: async () => { R().toStart(); await wait(900); } },
];
const PHONE = [
  { id: 'p01', t: 'Welcome to The Road. Marcin\'s career is laid out as a drive, one stop for each chapter. I\'ll show you around. You can skip at any time.', el: '#m-start .fcard' },
  { id: 'p02', t: 'Scroll down to drive. Each stop shows the company, the role, the years and the results.', el: () => document.querySelector('#flow section:nth-child(2) .fcard'),
    run: async () => { const s = document.querySelector('#flow section:nth-child(2)'); if (s) s.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); await wait(1200); } },
  { id: 'p03', t: 'Each stop lists a few short stories: the work behind the result, with the brands and products involved.', el: () => document.querySelector('#flow section:nth-child(2) .card-callouts') || document.querySelector('#flow section:nth-child(2) .fcard'),
    run: async () => { const d = document.querySelector('#flow section:nth-child(2) .card-callouts'); if (d) d.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); await wait(1000); } },
  { id: 'p04', t: 'The moon button switches between day and dusk.', el: '#theme-btn',
    run: async () => { theme0 = theme0 || root.getAttribute('data-theme'); click('#theme-btn'); await wait(2400); if (root.getAttribute('data-theme') !== theme0) click('#theme-btn'); } },
  { id: 'p05', t: 'Up top, you can always reach the Desktop, live demos, the timeline, his resume, and how to get in touch. Swipe the links sideways to see them all.', el: '.bar-links', links: true },
  { id: 'p06', t: 'That\'s the tour. Scroll down to start the drive.', el: '#m-start .fcard',
    run: async () => { scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); await wait(700); } },
];

let ui = null, ring = null, steps = [], at = -1, running = false, paused = false, timer = null, token = 0, raf = 0, lastFocus = null;

function build() {
  if (ui) return;
  ring = document.createElement('div'); ring.className = 'tour-ring'; ring.setAttribute('aria-hidden', 'true');
  ui = document.createElement('div'); ui.className = 'tour-box'; ui.setAttribute('role', 'dialog'); ui.setAttribute('aria-label', 'Tour of The Road'); ui.hidden = true;
  ui.innerHTML = `<div class="tb-top"><span class="tb-n" id="tb-n"></span><div class="tb-bar"><i id="tb-fill"></i></div>
    <button type="button" class="tb-ic" id="tb-voice" aria-pressed="true" aria-label="Voice on" title="Voice"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path class="w" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="x" d="M16 9l5 6M21 9l-5 6"/></svg></button>
    <button type="button" class="tb-ic" id="tb-x" aria-label="End the tour" title="End the tour">×</button></div>
    <p class="tb-t" id="tb-t" aria-live="polite"></p>
    <div class="tb-acts"><button type="button" class="tb-btn" id="tb-back">Back</button><button type="button" class="tb-btn" id="tb-pause" aria-pressed="false">Pause</button><button type="button" class="tb-btn primary" id="tb-next">Next</button></div>`;
  document.body.append(ring, ui);
  $('#tb-x').addEventListener('click', () => end());
  $('#tb-next').addEventListener('click', () => (at >= steps.length - 1 ? end() : show(at + 1)));
  $('#tb-back').addEventListener('click', () => show(Math.max(0, at - 1)));
  $('#tb-pause').addEventListener('click', () => { paused = !paused; syncPause(); if (paused) { clearTimeout(timer); Voice.stop(); fillTo(null); } else show(at); });
  $('#tb-voice').addEventListener('click', () => { Voice.set(!Voice.on); syncVoice(); syncMenu(); if (Voice.on && !paused) show(at); });
  addEventListener('keydown', e => {
    if (!running) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); }
  }, true);
}
function syncPause() { const b = $('#tb-pause'); b.textContent = paused ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', String(paused)); }
function syncVoice() { const b = $('#tb-voice'); if (!b) return; b.setAttribute('aria-pressed', String(Voice.on)); b.setAttribute('aria-label', Voice.on ? 'Voice on' : 'Voice off'); b.classList.toggle('off', !Voice.on); }
function fillTo(ms) { const f = $('#tb-fill'); if (!f) return; f.style.transition = 'none'; f.style.width = '0%'; if (ms) { void f.offsetWidth; f.style.transition = `width ${ms}ms linear`; f.style.width = '100%'; } }

function target(st) { const e = typeof st.el === 'function' ? st.el() : st.el ? $(st.el) : null; return e && e.offsetParent !== null || (e && getComputedStyle(e).position === 'fixed') ? e : null; }
function place() {
  if (!running) return;
  const st = steps[at], e = st && target(st);
  if (e) {
    const r = e.getBoundingClientRect(), p = 6;
    if (r.width && r.height) {
      ring.style.cssText = `left:${r.left - p}px;top:${r.top - p}px;width:${r.width + p * 2}px;height:${r.height + p * 2}px`;
      ring.classList.add('on');
    } else ring.classList.remove('on');
  } else ring.classList.remove('on');
  if (!isPhone()) {
    const c = $('#card'), rail = $('#chapters');
    const cr = c && c.offsetParent !== null ? c.getBoundingClientRect() : { right: 16 };
    const rl = rail && rail.offsetParent !== null ? rail.getBoundingClientRect().left : innerWidth;
    const w = Math.min(440, innerWidth - 32);
    let left = (Math.max(cr.right, 16) + rl) / 2 - w / 2;
    left = Math.max(16, Math.min(left, innerWidth - w - 16));
    ui.style.left = left + 'px'; ui.style.width = w + 'px';
  } else { ui.style.left = ''; ui.style.width = ''; }
  raf = requestAnimationFrame(place);
}

async function show(i) {
  const my = ++token;
  clearTimeout(timer); Voice.stop();
  at = i; const st = steps[i];
  $('#tb-n').textContent = `${i + 1} of ${steps.length}`;
  $('#tb-t').textContent = st.t;
  $('#tb-back').disabled = i === 0;
  $('#tb-next').textContent = i === steps.length - 1 ? 'Done' : 'Next';
  root.querySelectorAll('.tour-hl').forEach(x => x.classList.remove('tour-hl'));
  const t0 = performance.now();
  const spoken = paused ? Promise.resolve(false) : Voice.say(st.t, st.id);
  const words = st.t.split(/\s+/).length;
  const readMs = Math.max(3800, words * 300);
  fillTo(paused ? null : readMs);
  try { if (st.run) await st.run(); } catch (e) {}
  if (my !== token) return;
  if (st.links) {
    for (const a of document.querySelectorAll('.bar-links > a')) {
      if (my !== token) return;
      a.classList.add('tour-hl'); if (isPhone()) a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      await wait(650); a.classList.remove('tour-hl');
    }
  }
  if (paused || my !== token) return;
  const ok = await spoken;
  if (my !== token || paused) return;
  const left = Math.max(ok ? 700 : 0, readMs - (performance.now() - t0));
  if (ok) fillTo(left);
  timer = setTimeout(() => { if (my === token && !paused) (at >= steps.length - 1 ? end() : show(at + 1)); }, left);
}

function begin() {
  if (!R() || running) { if (!R()) startNoGL(); return; }
  build();
  lastFocus = document.activeElement;
  steps = isPhone() ? PHONE : DESK;
  running = true; paused = false; theme0 = root.getAttribute('data-theme'); syncPause(); syncVoice();
  root.classList.add('touring');
  if (!isPhone()) { R().setCtl(false); R().closeStory(); R().setZoom(0); if (R().cur !== 0) R().toStart(); }
  else scrollTo({ top: 0 });
  ui.hidden = false; cancelAnimationFrame(raf); place();
  show(0);
  setTimeout(() => $('#tb-next').focus({ preventScroll: true }), 50);
}
function startNoGL() { /* the plain list version has nothing to drive; the tour starts on the phone steps */
  if (running) return; build(); steps = PHONE; running = true; paused = false; theme0 = root.getAttribute('data-theme'); syncPause(); syncVoice();
  root.classList.add('touring'); ui.hidden = false; place(); show(0);
}
function end() {
  if (!running) return;
  token++; clearTimeout(timer); Voice.stop(); cancelAnimationFrame(raf);
  running = false; ui.hidden = true; ring.classList.remove('on'); root.classList.remove('touring');
  root.querySelectorAll('.tour-hl').forEach(x => x.classList.remove('tour-hl'));
  if (theme0 && root.getAttribute('data-theme') !== theme0) click('#theme-btn');
  theme0 = null;
  if (R() && !isPhone()) { R().setCtl(false); R().setZoom(0); }
  if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

/* any "Show me around" button, on the first card or in the settings menu */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-act="tour"]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  begin();
});

/* ---------------- settings menu: music and voice ---------------- */
function syncMenu() {
  document.querySelectorAll('#music-seg button').forEach(b => { const on = +b.dataset.t === Music.track; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  document.querySelectorAll('#voice-seg button').forEach(b => { const on = (b.dataset.v === '1') === Voice.on; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const v = $('#music-vol'); if (v) v.value = Math.round(Music.vol * 100);
  const c = $('#ctl-btn'); if (c) c.classList.toggle('music-on', Music.track >= 0);
}
document.querySelectorAll('#music-seg button').forEach(b => b.addEventListener('click', () => { Music.set(+b.dataset.t); syncMenu(); }));
document.querySelectorAll('#voice-seg button').forEach(b => b.addEventListener('click', () => { Voice.set(b.dataset.v === '1'); syncMenu(); syncVoice(); }));
const vol = $('#music-vol'); if (vol) vol.addEventListener('input', () => Music.setVol(vol.value / 100));
syncMenu();

window.__tour = { begin, end, get running() { return running; }, get step() { return at; }, music: Music, voice: Voice };
