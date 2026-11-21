/* Drive mode radio (round 4, Claude): seven original stations, five music and two car talk.
   The music is written by this file as it plays (Web Audio), so every song is original, costs nothing to stream and
   needs no licence. Talk, ads and DJ lines are scripted here and read by the browser's own voices, with captions.
   Hosts, callers, artists and companies are all fictional. Radio starts off; Q or the radio button tunes it.
   It drops low under the Narrated drive voice and pauses its talk, and it goes quiet with the tab hidden. */

const root = document.documentElement;
const $ = s => document.querySelector(s);
const QA = /[?&]qa\b/.test(location.search);

/* ================= small helpers ================= */
const hash = str => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };

/* ================= the instruments: every sound is made here, nothing is downloaded ================= */
function makeRig(ac, out) {
  const rig = { ac, out };
  const sr = ac.sampleRate;
  const nb = ac.createBuffer(1, sr * 2, sr); const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  rig.noise = nb;
  const ir = ac.createBuffer(2, Math.floor(sr * 2.4), sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
  const conv = ac.createConvolver(); conv.buffer = ir;
  rig.rev = ac.createGain(); rig.rev.connect(conv);
  const revOut = ac.createGain(); revOut.gain.value = 0.32; conv.connect(revOut); revOut.connect(out);
  const dl = ac.createDelay(2); dl.delayTime.value = 0.36;
  const fb = ac.createGain(); fb.gain.value = 0.3;
  const dlf = ac.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2400;
  dl.connect(dlf); dlf.connect(fb); fb.connect(dl);
  const dOut = ac.createGain(); dOut.gain.value = 0.42; dlf.connect(dOut); dOut.connect(out);
  rig.dly = ac.createGain(); rig.dly.connect(dl); rig.delayNode = dl;
  const k = 18, n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; curve[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
  rig.curve = curve;
  return rig;
}
function perc(p, t, peak, att, dec) {
  p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + att);
  p.exponentialRampToValueAtTime(0.0001, t + att + dec);
}
function gainTo(rig, d, v) { const g = rig.ac.createGain(); g.gain.value = v; g.connect(d); return g; }
function noiseSrc(rig, t, dur) { const s = rig.ac.createBufferSource(); s.buffer = rig.noise; s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05); return s; }
function filt(rig, type, f, q = 0.7) { const b = rig.ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function send(rig, node, rev = 0, dly = 0) {
  if (rev > 0) { const g = rig.ac.createGain(); g.gain.value = rev; node.connect(g); g.connect(rig.rev); }
  if (dly > 0) { const g = rig.ac.createGain(); g.gain.value = dly; node.connect(g); g.connect(rig.dly); }
}

const I = {
  kick(rig, d, t, v = 1, tune = 1, len = 0.38) {
    const ac = rig.ac, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150 * tune, t); o.frequency.exponentialRampToValueAtTime(46 * tune, t + 0.11);
    perc(g.gain, t, v, 0.002, len); o.connect(g); g.connect(d); o.start(t); o.stop(t + len + 0.05);
    const n = noiseSrc(rig, t, 0.03), f = filt(rig, 'highpass', 1800), ng = ac.createGain();
    perc(ng.gain, t, 0.12 * v, 0.001, 0.015); n.connect(f); f.connect(ng); ng.connect(d);
  },
  snare(rig, d, t, v = 1, tone = 185, rev = 0.25, dec = 0.17) {
    const ac = rig.ac;
    const n = noiseSrc(rig, t, dec + 0.05), f = filt(rig, 'bandpass', 1900, 0.6), g = ac.createGain();
    perc(g.gain, t, 0.7 * v, 0.001, dec); n.connect(f); f.connect(g); g.connect(d); send(rig, g, rev);
    const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(tone, t); o.frequency.exponentialRampToValueAtTime(tone * 0.72, t + 0.08);
    perc(og.gain, t, 0.45 * v, 0.001, 0.09); o.connect(og); og.connect(d); o.start(t); o.stop(t + 0.15);
  },
  clap(rig, d, t, v = 1, rev = 0.3) {
    const ac = rig.ac, f = filt(rig, 'bandpass', 1250, 0.9), g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (const o of [0, 0.011, 0.022]) { g.gain.setValueAtTime(0.55 * v, t + o); g.gain.exponentialRampToValueAtTime(0.06 * v, t + o + 0.009); }
    g.gain.setValueAtTime(0.5 * v, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    const n = noiseSrc(rig, t, 0.25); n.connect(f); f.connect(g); g.connect(d); send(rig, g, rev);
  },
  hat(rig, d, t, v = 1, open = false) {
    const ac = rig.ac, dec = open ? 0.22 : 0.04;
    const n = noiseSrc(rig, t, dec + 0.03), f = filt(rig, 'highpass', 7600), g = ac.createGain();
    perc(g.gain, t, 0.26 * v, 0.001, dec); n.connect(f); f.connect(g); g.connect(d);
  },
  shaker(rig, d, t, v = 1) {
    const n = noiseSrc(rig, t, 0.09), f = filt(rig, 'bandpass', 6200, 1.2), g = rig.ac.createGain();
    perc(g.gain, t, 0.16 * v, 0.012, 0.05); n.connect(f); f.connect(g); g.connect(d);
  },
  crash(rig, d, t, v = 1) {
    const n = noiseSrc(rig, t, 1.6), f = filt(rig, 'highpass', 4800), g = rig.ac.createGain();
    perc(g.gain, t, 0.2 * v, 0.002, 1.4); n.connect(f); f.connect(g); g.connect(d); send(rig, g, 0.3);
  },
  wood(rig, d, t, v = 1, fr = 860) {
    const ac = rig.ac;
    for (const [m, a] of [[1, 0.38], [2.6, 0.12]]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = fr * m;
      perc(g.gain, t, a * v, 0.001, 0.05); o.connect(g); g.connect(d); o.start(t); o.stop(t + 0.08);
    }
  },
  bass(rig, d, t, m, dur, v = 1, cut = 900, type = 'sawtooth') {
    const ac = rig.ac, o = ac.createOscillator(), s = ac.createOscillator(), f = filt(rig, 'lowpass', cut, 3), g = ac.createGain();
    o.type = type; o.frequency.value = mtof(m); s.type = 'sine'; s.frequency.value = mtof(m);
    f.frequency.setValueAtTime(cut * 2.6, t); f.frequency.exponentialRampToValueAtTime(cut * 0.8, t + Math.min(dur, 0.25));
    const sg = ac.createGain(); sg.gain.value = 0.6;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * v, t + 0.006);
    g.gain.setValueAtTime(0.42 * v, t + Math.max(0.01, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(f); s.connect(sg); sg.connect(g); f.connect(g); g.connect(d);
    o.start(t); s.start(t); o.stop(t + dur + 0.1); s.stop(t + dur + 0.1);
  },
  sub(rig, d, t, m, dur, v = 1, from = null) {
    const ac = rig.ac, o = ac.createOscillator(), g = ac.createGain(), sh = ac.createWaveShaper();
    sh.curve = rig.curve;
    const pre = ac.createGain(); pre.gain.value = 0.18;
    if (from != null) { o.frequency.setValueAtTime(mtof(from), t); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.09); }
    else o.frequency.setValueAtTime(mtof(m), t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.62 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.25 * v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(pre); pre.connect(sh); sh.connect(g); g.connect(d); o.start(t); o.stop(t + dur + 0.12);
  },
  pad(rig, d, t, notes, dur, v = 1, cut = 1800, rev = 0.45, att = 0.25) {
    const ac = rig.ac, f = filt(rig, 'lowpass', cut, 0.5), g = ac.createGain();
    const lvl = 0.16 * v / Math.sqrt(notes.length);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl, t + att);
    g.gain.setValueAtTime(lvl, t + Math.max(att, dur - 0.1)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.35);
    for (const m of notes) for (const dt of [-8, 8]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
      o.connect(f); o.start(t); o.stop(t + dur + 0.4);
    }
    f.connect(g); g.connect(d); send(rig, g, rev);
  },
  ep(rig, d, t, notes, dur, v = 1, rev = 0.3, bright = 1) {
    const ac = rig.ac;
    for (const m of notes) {
      const g = ac.createGain(), o = ac.createOscillator(), o2 = ac.createOscillator(), g2 = ac.createGain();
      o.frequency.value = mtof(m); o2.frequency.value = mtof(m) * 2; o2.detune.value = 4; g2.gain.value = 0.18 * bright;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.1 + 0.3);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(d); send(rig, g, rev);
      o.start(t); o2.start(t); o.stop(t + dur * 1.1 + 0.35); o2.stop(t + dur * 1.1 + 0.35);
    }
  },
  pluck(rig, d, t, m, dur, v = 1, type = 'triangle', cut = 3200, dly = 0.25, rev = 0.15) {
    const ac = rig.ac, o = ac.createOscillator(), f = filt(rig, 'lowpass', cut, 2), g = ac.createGain();
    o.type = type; o.frequency.value = mtof(m);
    f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(Math.max(300, cut * 0.25), t + dur);
    perc(g.gain, t, 0.2 * v, 0.003, Math.max(0.08, dur)); o.connect(f); f.connect(g); g.connect(d); send(rig, g, rev, dly);
    o.start(t); o.stop(t + dur + 0.1);
  },
  lead(rig, d, t, m, dur, v = 1, type = 'sawtooth', cut = 2600, dly = 0.3, rev = 0.25, dist = false) {
    const ac = rig.ac, o = ac.createOscillator(), f = filt(rig, 'lowpass', cut, 1), g = ac.createGain();
    o.type = type; o.frequency.value = mtof(m);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(14, t + Math.min(0.4, dur));
    lfo.connect(lg); lg.connect(o.detune);
    let src = o;
    if (dist) { const pre = ac.createGain(); pre.gain.value = 2.2; const sh = ac.createWaveShaper(); sh.curve = rig.curve; o.connect(pre); pre.connect(sh); src = sh; }
    const lv = (dist ? 0.07 : 0.12) * v;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lv, t + 0.02);
    g.gain.setValueAtTime(lv, t + Math.max(0.03, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    src.connect(f); f.connect(g); g.connect(d); send(rig, g, rev, dly);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.12); lfo.stop(t + dur + 0.12);
  },
  gtr(rig, d, t, notes, dur, v = 1, muted = false) {
    const ac = rig.ac, pre = ac.createGain(), sh = ac.createWaveShaper(), f = filt(rig, 'lowpass', muted ? 1500 : 3300, 0.8), g = ac.createGain();
    pre.gain.value = 1.6; sh.curve = rig.curve;
    for (const m of notes) for (const dt of [-6, 6]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
      o.connect(pre); o.start(t); o.stop(t + dur + 0.1);
    }
    const lv = 0.075 * v;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lv, t + 0.004);
    if (muted) g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.13));
    else { g.gain.setValueAtTime(lv * 0.8, t + Math.max(0.01, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06); }
    pre.connect(sh); sh.connect(f); f.connect(g); g.connect(d); send(rig, g, 0.12);
  },
  bell(rig, d, t, m, v = 1, dly = 0.3) {
    const ac = rig.ac, c = ac.createOscillator(), mo = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
    c.frequency.value = mtof(m); mo.frequency.value = mtof(m) * 3.5;
    mg.gain.setValueAtTime(mtof(m) * 2, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.8);
    mo.connect(mg); mg.connect(c.frequency);
    perc(g.gain, t, 0.11 * v, 0.002, 1.1); c.connect(g); g.connect(d); send(rig, g, 0.35, dly);
    c.start(t); mo.start(t); c.stop(t + 1.2); mo.stop(t + 1.2);
  },
  crackle(rig, d, t, dur, n = 6) {
    for (let i = 0; i < n; i++) {
      const tt = t + Math.random() * dur, s = noiseSrc(rig, tt, 0.01), f = filt(rig, 'highpass', 2500), g = rig.ac.createGain();
      perc(g.gain, tt, 0.05 + Math.random() * 0.07, 0.0005, 0.004); s.connect(f); f.connect(g); g.connect(d);
    }
  },
  hiss(rig, d, t, dur, v = 0.012) {
    const s = noiseSrc(rig, t, dur), f = filt(rig, 'bandpass', 4000, 0.4), g = rig.ac.createGain(); g.gain.value = v;
    s.connect(f); f.connect(g); g.connect(d);
  },
};

/* ================= the songs: each title seeds its own key, chords, melody and drum variations ================= */
const GENRES = {
  synth: { bpm: [100, 112], swing: 0, scale: 'minor', keys: [45, 43, 47, 41, 48], progs: [[0, 5, 2, 6], [0, 5, 3, 4], [5, 3, 0, 6], [0, 2, 6, 5]], sevenths: false,
    form: [['intro', 4], ['A', 8], ['B', 8], ['A', 8], ['B', 8], ['outro', 4]], delayBeats: 0.75, busCut: 0, gain: 0.62 },
  lofi: { bpm: [74, 86], swing: 0.17, scale: 'major', keys: [48, 50, 46, 51, 53], progs: [[1, 4, 0, 5], [3, 2, 1, 4], [0, 5, 1, 4], [3, 4, 2, 5]], sevenths: true,
    form: [['intro', 4], ['A', 8], ['B', 8], ['A', 8], ['outro', 4]], delayBeats: 0.75, busCut: 3100, gain: 1 },
  hiphop: { bpm: [86, 94], swing: 0.12, scale: 'minor', keys: [43, 45, 41, 46, 44], progs: [[0, 3, 0, 4], [0, 5, 3, 4], [0, 6, 5, 4], [3, 0, 5, 4]], sevenths: true,
    form: [['intro', 4], ['A', 8], ['B', 8], ['A', 8], ['B', 4], ['outro', 4]], delayBeats: 0.5, busCut: 0, gain: 0.7 },
  rock: { bpm: [122, 134], swing: 0, scale: 'major', keys: [40, 45, 43, 38, 42], progs: [[0, 4, 5, 3], [0, 3, 4, 3], [5, 3, 0, 4], [0, 6, 3, 0]], sevenths: false,
    form: [['intro', 4], ['A', 8], ['B', 8], ['A', 8], ['B', 8], ['C', 4], ['B', 8], ['outro', 4]], delayBeats: 0.75, busCut: 0, gain: 0.3 },
  latin: { bpm: [94, 100], swing: 0, scale: 'minor', keys: [45, 47, 50, 43, 48], progs: [[0, 3, 4, 0], [0, 6, 5, 4], [0, 3, 6, 4], [5, 6, 0, 4]], sevenths: false,
    form: [['intro', 4], ['A', 8], ['B', 8], ['A', 8], ['B', 8], ['outro', 4]], delayBeats: 0.75, busCut: 0, raiseV: true, gain: 0.56 },
};

class Song {
  constructor(genre, title, artist) {
    const G = GENRES[genre], r = rng(hash(genre + '|' + title));
    this.genre = genre; this.title = title; this.artist = artist; this.G = G;
    this.bpm = Math.round(G.bpm[0] + r() * (G.bpm[1] - G.bpm[0]));
    this.sd = 60 / this.bpm / 4; this.barDur = this.sd * 16;
    this.key = G.keys[Math.floor(r() * G.keys.length)];
    this.scale = SCALES[G.scale];
    this.prog = G.progs[Math.floor(r() * G.progs.length)];
    this.progB = G.progs[Math.floor(r() * G.progs.length)];
    this.secOf = []; this.secStart = []; this.secLast = [];
    for (const [name, bars] of G.form) for (let i = 0; i < bars; i++) { this.secOf.push(name); this.secStart.push(i === 0); this.secLast.push(i === bars - 1); }
    this.bars = this.secOf.length; this.steps = this.bars * 16; this.dur = this.bars * this.barDur;
    this.motifA = this.motif(r, 0.55); this.motifB = this.motif(r, 0.72);
    this.kickVar = r(); this.fillVar = r(); this.r = r;
  }
  motif(r, density) {
    const out = new Array(32).fill(null); let deg = [0, 2, 4][Math.floor(r() * 3)];
    for (let s = 0; s < 32; s += 2) {
      if (r() > density && s % 8 !== 0) continue;
      const strong = s % 8 === 0;
      deg = strong ? [0, 2, 4, 7][Math.floor(r() * 4)] : Math.max(-2, Math.min(9, deg + [-2, -1, 1, 2, 0][Math.floor(r() * 5)]));
      const len = r() < 0.3 ? 4 : r() < 0.5 ? 3 : 2;
      out[s] = { deg, len };
    }
    for (let s = 16; s < 32; s++) if (s >= 24 && r() < 0.5) out[s] = null;   // the answer phrase breathes
    return out;
  }
  deg2m(base, deg) { const sc = this.scale, o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7; return base + sc[i] + 12 * o; }
  chord(bar) {
    const sec = this.secOf[bar], p = sec === 'B' || sec === 'C' ? this.progB : this.prog;
    const d = p[bar % 4];
    const notes = [0, 2, 4].concat(this.G.sevenths ? [6] : []).map(x => this.deg2m(this.key + 12, d + x));
    if (this.G.raiseV && d === 4) notes[1] += 1;   // the dominant chord gets its major third, as a Latin band would play it
    return { d, root: this.deg2m(this.key - 12, d), notes };
  }
  melody(bar, s, which) {
    const mo = which === 'B' ? this.motifB : this.motifA, ev = mo[(bar % 2) * 16 + s];
    if (!ev) return null;
    const c = this.chord(bar);
    return { m: this.deg2m(this.key + 24, c.d + ev.deg) - (ev.deg > 6 ? 12 : 0), len: ev.len };
  }
}

/* one sixteenth note of a song, per genre */
const PLAY = {
  synth(S, X, bar, s, t) {
    const { rig, bus, pump } = X, sec = S.secOf[bar], c = S.chord(bar), sd = S.sd, last = S.secLast[bar] && sec !== 'outro';
    const drums = sec !== 'intro' || bar >= 2;
    if (S.secStart[bar] && s === 0 && (sec === 'A' || sec === 'B')) I.crash(rig, bus, t, 0.8);
    if (drums && s % 4 === 0) { I.kick(rig, bus, t, 0.95); X.duckPump(t); }
    if (drums && (s === 4 || s === 12)) I.snare(rig, bus, t, 0.9, 190, 0.7, 0.2);
    if (last && s >= 12 && s % 1 === 0) I.snare(rig, bus, t, 0.35 + (s - 12) * 0.12, 210, 0.3, 0.1);
    if (drums && s % 4 === 2) I.hat(rig, bus, t, 0.7, false);
    if (sec === 'B' && s % 2 === 1) I.hat(rig, bus, t, 0.3);
    if (s === 0) I.pad(rig, pump, t, c.notes, S.barDur, sec === 'intro' ? 0.8 : 1, sec === 'B' ? 2400 : 1700);
    if (drums && s % 2 === 0) I.bass(rig, pump, t, c.root + (s % 4 === 2 ? 12 : 0), sd * 1.6, 0.9, 700);
    if (sec === 'B') I.pluck(rig, bus, t, c.notes[s % c.notes.length] + 12, sd * 1.2, 0.55, 'square', 2600, 0.35, 0.1);
    if (sec === 'A' || sec === 'outro') { const n = S.melody(bar, s, 'A'); if (n) I.lead(rig, bus, t, n.m, sd * n.len, 0.9, 'sawtooth', 2200, 0.35, 0.3); }
  },
  lofi(S, X, bar, s, t) {
    const { rig, bus } = X, sec = S.secOf[bar], c = S.chord(bar), sd = S.sd;
    const drums = sec !== 'intro' || bar >= 2;
    if (s === 0) I.crackle(rig, bus, t, S.barDur, 7);
    if (drums && (s === 0 || s === 10 || (s === 7 && S.kickVar > 0.5))) I.kick(rig, bus, t, s === 0 ? 0.75 : 0.55, 0.9, 0.3);
    if (drums && (s === 4 || s === 12)) I.snare(rig, bus, t, 0.5, 170, 0.35, 0.13);
    if (drums && s % 2 === 0) I.hat(rig, bus, t, s % 4 === 0 ? 0.45 : 0.3);
    if (s === 0) I.ep(rig, bus, t, c.notes, S.barDur * 0.55, 0.95, 0.35, 0.8);
    if (s === 10 && sec !== 'intro') I.ep(rig, bus, t, c.notes.slice(1), S.sd * 5, 0.5, 0.35, 0.6);
    if (drums && s === 0) I.sub(rig, bus, t, c.root, S.sd * 7, 0.7);
    if (drums && s === 8) I.sub(rig, bus, t, c.root + 7, S.sd * 5, 0.55);
    if (sec === 'B') { const n = S.melody(bar, s, 'B'); if (n && s % 4 === 0) I.bell(rig, bus, t, n.m, 0.8, 0.35); }
  },
  hiphop(S, X, bar, s, t) {
    const { rig, bus } = X, sec = S.secOf[bar], c = S.chord(bar), sd = S.sd, last = S.secLast[bar] && sec !== 'outro';
    const drums = sec !== 'intro';
    const kp = sec === 'B' ? [0, 6, 9, 13] : (S.kickVar > 0.5 ? [0, 6, 9] : [0, 7, 10]);
    if (drums && kp.includes(s)) { I.kick(rig, bus, t, 1, 0.85, 0.32); I.sub(rig, bus, t, c.root, sd * (s === 0 ? 5 : 3), 0.9, s === kp[kp.length - 1] && S.fillVar > 0.5 ? c.root + 12 : null); }
    if (drums && (s === 4 || s === 12)) { I.clap(rig, bus, t, 0.8, 0.2); I.snare(rig, bus, t, 0.45, 200, 0.1, 0.1); }
    if (last && (s === 14 || s === 15)) I.snare(rig, bus, t, 0.4, 210, 0.15, 0.08);
    if (drums) I.hat(rig, bus, t, s % 4 === 2 ? 0.55 : s % 2 === 0 ? 0.4 : 0.22);
    if (s === 0 || s === 3 || (s === 10 && sec !== 'intro')) I.ep(rig, bus, t, c.notes, sd * (s === 0 ? 3 : 2), s === 0 ? 0.9 : 0.6, 0.25, 1.3);
    if (sec === 'B' || sec === 'outro') { const n = S.melody(bar, s, 'B'); if (n) I.bell(rig, bus, t, n.m, 0.7, 0.3); }
  },
  rock(S, X, bar, s, t) {
    const { rig, bus } = X, sec = S.secOf[bar], c = S.chord(bar), sd = S.sd, last = S.secLast[bar] && sec !== 'outro';
    const pw = [c.root + 12, c.root + 19, c.root + 24];
    if (S.secStart[bar] && s === 0 && sec !== 'intro') I.crash(rig, bus, t, 1);
    const half = sec === 'C';
    if (sec !== 'intro' || bar >= 2) {
      const kp = half ? [0, 10] : sec === 'B' ? [0, 6, 8] : [0, 8, 10];
      if (kp.includes(s)) I.kick(rig, bus, t, 1, 1.05, 0.25);
      if (half ? s === 8 : (s === 4 || s === 12)) I.snare(rig, bus, t, 1, 200, 0.25, 0.18);
      if (last && s >= 8 && s % 2 === 0) I.snare(rig, bus, t, 0.5 + (s - 8) * 0.06, 220, 0.2, 0.1);
      if (s % 2 === 0) I.hat(rig, bus, t, sec === 'B' ? 0.5 : 0.6, sec === 'B' && s % 4 === 2);
      if (s % 2 === 0) I.bass(rig, bus, t, c.root, sd * 1.7, 0.85, 600, 'square');
    }
    if (sec === 'A' || sec === 'intro' || sec === 'outro') { if (s % 2 === 0) I.gtr(rig, bus, t, pw.slice(0, 2), sd * 1.8, 0.9, s % 8 !== 0); }
    else if (sec === 'B') { if (s === 0 || s === 8) I.gtr(rig, bus, t, pw, sd * 7.5, 1, false); const n = S.melody(bar, s, 'B'); if (n) I.lead(rig, bus, t, n.m, sd * n.len, 0.9, 'sawtooth', 3000, 0.25, 0.2, true); }
    else if (sec === 'C') { if (s % 2 === 0) I.pluck(rig, bus, t, c.notes[(s / 2) % 3] + 12, sd * 2, 0.8, 'triangle', 3000, 0.4, 0.2); }
  },
  latin(S, X, bar, s, t) {
    const { rig, bus } = X, sec = S.secOf[bar], c = S.chord(bar), sd = S.sd, last = S.secLast[bar] && sec !== 'outro';
    const drums = sec !== 'intro' || bar >= 2;
    if (drums && s % 4 === 0) I.kick(rig, bus, t, 0.9, 0.95, 0.28);
    if (drums && [3, 6, 11, 14].includes(s)) I.snare(rig, bus, t, 0.55, 230, 0.12, 0.1);
    if (last && s >= 12) I.wood(rig, bus, t, 0.6, 620);
    I.shaker(rig, bus, t, s % 4 === 2 ? 0.9 : 0.45);
    const clave = bar % 2 === 0 ? [0, 6, 12] : [4, 8];
    if (clave.includes(s)) I.wood(rig, bus, t, 0.75);
    if (drums && [0, 3, 8, 11].includes(s)) I.bass(rig, bus, t, c.root + (s === 11 ? 7 : 0), sd * 2.4, 0.85, 500, 'triangle');
    const mont = [0, 3, 6, 8, 10, 13];
    if (mont.includes(s)) I.ep(rig, bus, t, s % 2 ? c.notes.slice(1) : c.notes, sd * 1.4, 0.55, 0.15, 1.6);
    if (sec === 'B' || sec === 'outro') { const n = S.melody(bar, s, 'B'); if (n) I.lead(rig, bus, t, n.m, sd * n.len, 0.85, 'triangle', 3800, 0.3, 0.25); }
    else if (sec === 'A' && bar % 4 === 3) { const n = S.melody(bar, s, 'A'); if (n) I.lead(rig, bus, t, n.m + 12, sd * n.len, 0.6, 'square', 2400, 0.3, 0.2); }
  },
};

/* one song player: schedules ahead on the audio clock, so the beat stays tight whatever the frame rate does */
class Player {
  constructor(rig, dest, song, startBar = 0) {
    const ac = rig.ac;
    this.rig = rig; this.S = song;
    this.out = ac.createGain(); this.out.gain.value = 0.0001;
    let tail = this.out;
    if (song.G.busCut) { const f = filt(rig, 'lowpass', song.G.busCut, 0.4); tail.connect(f); tail = f; }
    tail.connect(dest);
    this.lvl = ac.createGain(); this.lvl.gain.value = song.G.gain || 1; this.lvl.connect(this.out);
    this.bus = ac.createGain(); this.bus.connect(this.lvl);
    this.pump = ac.createGain(); this.pump.connect(this.lvl);
    this.step = startBar * 16; this.next = ac.currentTime + 0.08;
    this.out.gain.setValueAtTime(0.0001, this.next - 0.05); this.out.gain.exponentialRampToValueAtTime(1, this.next + 0.25);
    rig.delayNode.delayTime.setValueAtTime(song.sd * 4 * song.G.delayBeats, ac.currentTime);
    rig.rev.gain.setValueAtTime(song.G.gain || 1, ac.currentTime); rig.dly.gain.setValueAtTime(song.G.gain || 1, ac.currentTime);   // the echo follows the song's level
    this.X = { rig, bus: this.bus, pump: this.pump, duckPump: t => { const g = this.pump.gain; g.setValueAtTime(0.35, t); g.linearRampToValueAtTime(1, t + song.sd * 3); } };
    this.done = false; this.fadeSet = false;
  }
  tick(ahead) {
    const S = this.S, ac = this.rig.ac;
    while (!this.done && this.next < ac.currentTime + ahead) {
      const bar = Math.floor(this.step / 16), s = this.step % 16;
      if (bar >= S.bars) { this.done = true; break; }
      if (S.secOf[bar] === 'outro' && s === 0 && !this.fadeSet) {
        const left = (S.bars - bar) * S.barDur; this.fadeSet = true;
        this.out.gain.setValueAtTime(1, this.next); this.out.gain.linearRampToValueAtTime(0.0001, this.next + left);
      }
      const sw = s % 2 === 1 ? S.G.swing * S.sd : 0;
      try { PLAY[S.genre](S, this.X, bar, s, this.next + sw); } catch (e) { if (QA) console.warn('radio step', e); }
      this.step++; this.next += S.sd;
    }
    return this.done;
  }
  stop(fade = 0.25) {
    const ac = this.rig.ac, g = this.out.gain;
    g.cancelScheduledValues(ac.currentTime); g.setValueAtTime(Math.max(g.value, 0.0001), ac.currentTime); g.exponentialRampToValueAtTime(0.0001, ac.currentTime + fade);
    this.done = true;
    setTimeout(() => { try { this.out.disconnect(); } catch (e) {} }, (fade + 2) * 1000);
  }
}

/* ================= the stations ================= */
// speakers: g = voice gender, p = pitch, r = rate, slot = which matching voice to prefer, so two hosts rarely share one
const SPK = {
  vega: { name: 'Vega', g: 'f', p: 1.05, r: 0.98, slot: 0 },
  moss: { name: 'Moss', g: 'm', p: 0.9, r: 0.92, slot: 1 },
  al: { name: 'Big Al', g: 'm', p: 0.82, r: 1.02, slot: 0 },
  jett: { name: 'Jett', g: 'f', p: 1.12, r: 1.08, slot: 1 },
  lucia: { name: 'Lucía', g: 'f', p: 1.02, r: 1.0, slot: 2, es: true },
  rusty: { name: 'Rusty', g: 'm', p: 0.86, r: 1.0, slot: 0 },
  dee: { name: 'Dee', g: 'f', p: 1.0, r: 1.04, slot: 0 },
  nadia: { name: 'Nadia', g: 'f', p: 1.08, r: 1.0, slot: 1 },
  theo: { name: 'Theo', g: 'm', p: 1.0, r: 1.03, slot: 1 },
  caller1: { name: 'Caller', g: 'm', p: 1.15, r: 1.06, slot: 2 },
  caller2: { name: 'Caller', g: 'f', p: 0.92, r: 1.02, slot: 2 },
  ad: { name: 'Ad', g: 'm', p: 0.95, r: 1.1, slot: 1 },
  ad2: { name: 'Ad', g: 'f', p: 1.1, r: 1.12, slot: 0 },
};

const ADS = [
  [['ad', 'Leaky engine? Gasket Guys. If it drips, we seal it.'], ['ad2', 'Gasket Guys. Holding engines together since engines.']],
  [['ad2', 'Spoiler Alert Car Wash.'], ['ad', 'Spoiler: your car comes out spotless.']],
  [['ad', 'Hiding your slides from the Deck Demander?'], ['ad2', 'Deck Vault Self Storage. Climate controlled. Demander proof.']],
  [['ad2', 'Lane Keepers Driving School. We keep you between the lines.'], ['ad', 'Mostly.']],
  [['ad', 'Range Buddy home chargers. Plug in at night, wake up full.'], ['ad2', "Range Buddy. Your car's favorite roommate."]],
  [['ad', 'Torque Tea. Brewed strong for the long commute. Now with forty percent more torque.'], ['ad2', "That's not how tea works. Drink it anyway."]],
];

const STATIONS = [
  { id: 'night', freq: '88.1', name: 'Night Shift FM', tag: 'Synthwave', kind: 'music', genre: 'synth', dj: 'vega', color: '#C77DFF',
    idLine: ['vega', 'Night Shift FM, 88.1. Neon, chrome and the long way home.', 'Night Shift FM, eighty-eight point one. Neon, chrome and the long way home.'],
    chatter: ['Keep it under the speed limit. Or at least make it look cool.', "If you can see the city lights, you're tuned in right.", "Night Shift FM. For drivers who don't need a destination."],
    songs: [['Woodward After Midnight', 'Chrome Horizon'], ['Neon Overpass', 'Vector Coast'], ['Tail Light Parade', 'Kara Volt'], ['Rearview Sunset', 'Night Fleet'], ['Lane Change', 'Sable Grid']] },
  { id: 'lowgear', freq: '94.7', name: 'Low Gear', tag: 'Lo-fi beats', kind: 'music', genre: 'lofi', dj: 'moss', color: '#7FB7A4',
    idLine: ['moss', 'Low Gear, 94.7. Slow beats for fast lanes.', 'Low Gear, ninety-four seven. Slow beats for fast lanes.'],
    chatter: ['Breathe in. Check your mirrors. Breathe out.', "Studying, coding or stuck in traffic, we've got you.", 'Low Gear. No rush. Seriously, no rush.'],
    songs: [['Idle Hands', 'Sunday Garage'], ['Rain on the Windshield', 'Moss & Mileage'], ['Cold Start', 'Quiet Torque'], ['Parking Lot Pastries', 'Juniper Lane'], ['Second Gear', 'Lo Tide']] },
  { id: 'blvd', freq: '97.3', name: 'Curbside 97', tag: 'Hip-hop instrumentals', kind: 'music', genre: 'hiphop', dj: 'al', color: '#E8A33D',
    idLine: ['al', 'Curbside 97.3. Beats from the curb, all night.', 'Curbside ninety-seven point three. Beats from the curb, all night.'],
    chatter: ['Turn it up, roll it down.', "If your trunk isn't rattling, you're doing it wrong.", 'Big Al on Curbside 97. Stay smooth out there.'],
    songs: [['Curbside Bounce', 'DJ Axle'], ['Corner Lot', 'Spare Parts Crew'], ['Dashboard Glow', 'Beatsmith Rae'], ['Cruise Control', 'Overdrive'], ['Low Rider Logic', 'Cylinder Kings']] },
  { id: 'redline', freq: '101.9', name: 'Redline Rock', tag: 'Rock', kind: 'music', genre: 'rock', dj: 'jett', color: '#E2574C',
    idLine: ['jett', 'Redline Rock, 101.9. Loud guitars, louder engines.', 'Redline Rock, one-oh-one point nine. Loud guitars, louder engines.'],
    chatter: ['Your neighbors loved that one.', 'Redline Rock. Shift late, play loud.', 'If the windows are rattling, the station is working.'],
    songs: [['Redline Fever', 'Iron Pistons'], ['Gasket Blown', 'The Torque Wrenches'], ['Interstate Thunder', 'Six Cylinder Sky'], ['Last Exit North', 'Rust Belt Riot'], ['Downshift', 'Highway Saints']] },
  { id: 'carretera', freq: '105.5', name: 'Radio Carretera', tag: 'Latin', kind: 'music', genre: 'latin', dj: 'lucia', color: '#3FB6C9',
    idLine: ['lucia', 'Radio Carretera, 105.5. Music for the road south.', 'Radio Carretera, one-oh-five point five. Music for the road south.',
      'Radio Carretera, ciento cinco punto cinco. Música para el camino.'],
    chatter: ['Windows down, volume up.', 'From Monterrey to Quito, this one is for the long drive.', 'Radio Carretera. Every road is better with a little rhythm.'],
    chatterEs: ['Ventanas abajo, volumen arriba.', 'De Monterrey a Quito, esta es para el camino largo.', 'Radio Carretera. Todo camino es mejor con ritmo.'],
    songs: [['Cumbia del Camino', 'Los Faros'], ['Noche en Monterrey', 'Sonido Ruta'], ['Ruta Sesenta', 'La Llanta'], ['Quito al Atardecer', 'Grupo Kilómetro'], ['Bailando en Reversa', 'DJ Volante']] },
  { id: 'gearbox', freq: '1010 AM', name: 'The Gearbox', tag: 'Car culture call-in', kind: 'talk', color: '#B0855A',
    idLine: ['rusty', "You're on The Gearbox, AM 1010. I'm Rusty.", "You're on The Gearbox, AM ten-ten. I'm Rusty."],
    segs: [
      [['dee', "And I'm Dee. Phones are open, so tell us what your car did this week."], ['rusty', "Line one, you're on The Gearbox."],
        ['caller1', 'Hey guys. My car whistles at exactly forty-two miles an hour. Not forty-one. Forty-two.'],
        ['dee', "That's not a problem, that's a feature. Name it and keep driving."], ['rusty', 'Check the window seals first. Then name it.']],
      [['dee', "Winter's coming, so let's settle it. Winter tires, yes or no?"],
        ['rusty', 'Yes. All-wheel drive helps you go. Tires help you stop. Stopping is the important part.'],
        ['dee', "Rusty's been saying that since the nineties."], ['rusty', "And I've been right since the nineties."]],
      [['caller2', 'Hi, first time caller. I just taught my teenager to drive stick.'], ['dee', "Brave. How's the clutch?"],
        ['caller2', 'The clutch is fine. My nerves are not.'], ['rusty', 'Fair trade. That kid will never be stuck at a valet stand.']],
      [['rusty', 'Question of the day. Best road trip you ever took. Dee?'],
        ['dee', 'Monterrey to the coast with the windows down. Twelve hours, three taco stands, zero regrets.'],
        ['rusty', 'Mine was Detroit to the Upper Peninsula in a car with no radio. Which is why I work in radio.']],
      [['caller1', 'Rusty, you ever think about the head gasket? Tiny part. Holds the whole engine together.'],
        ['rusty', 'Every day. Somebody designed that thing, tested it, and nobody ever says thanks.'], ['dee', 'Thank you, gasket people. You heard it here first.']],
      [['dee', 'Car meet rules, real quick. No burnouts in the parking lot.'], ['rusty', 'Ask before you touch. And compliment the paint, even if it is beige.'],
        ['dee', 'Especially if it is beige.']],
      [['rusty', "Last call. What's the one car you'd never sell?"], ['caller2', 'My first hatchback. Two hundred thousand miles and one working speaker.'],
        ['dee', "I hope that speaker's tuned to us."], ['caller2', "It's the only station it can pick up."]],
    ] },
  { id: 'ota', freq: '92.5', name: 'Over the Air', tag: 'EVs and software-defined cars', kind: 'talk', color: '#5AA9E6',
    idLine: ['nadia', "This is Over the Air, 92.5. I'm Nadia.", "This is Over the Air, ninety-two five. I'm Nadia."],
    segs: [
      [['theo', "I'm Theo. Today: what does software-defined vehicle actually mean?"],
        ['nadia', 'Short version: the car keeps getting better after you buy it, because the features live in software.'],
        ['theo', 'Long version: wiring, chips, and a lot of meetings.']],
      [['theo', 'Over-the-air updates. Raise your hand if your car updated overnight and moved a button.'],
        ['nadia', 'Both hands. But the good updates fix things you used to drive to a dealer for.']],
      [['nadia', 'Speed check. In China, a new cockpit feature can go from idea to the road in months, not years.'],
        ['theo', 'Which means everyone else had to learn to move a lot faster.'],
        ['nadia', 'Tech is the new luxury. Big screens, voice assistants, driver assist. Buyers expect them on day one.']],
      [['theo', 'Driver assist levels, decoded. Level 2 helps you steer and brake, hands on the wheel.'],
        ['nadia', 'L2++ takes on more of the trip, like lane changes on the highway. You are still the driver.'], ['theo', 'Eyes up, people.']],
      [['nadia', 'Charging etiquette. When you hit eighty percent, move the car.'],
        ['theo', "And never unplug someone else's car to plug in your own. That's how feuds start."]],
      [['theo', "Shout-out to Marcin, whose road you're driving on right now."],
        ['nadia', 'From engine gaskets to software strategy in Shanghai. That is pretty much the whole industry in one career.'],
        ['theo', 'If you are hiring for that, his contact details are back on the home page.']],
      [['nadia', 'Cold weather tip. Warm up the battery while the car is still plugged in.'], ['theo', 'Warm battery, warm cabin, happy driver.']],
      [['theo', 'Connected services. Crash response, remote start, stolen vehicle help.'],
        ['nadia', 'The stuff you forget about until the one night you really need it.']],
    ] },
];

/* how a line is said: the captions keep the spelling, the voice gets the pronunciation */
function sayify(t) {
  return t.replace(/\bMarcin\b/g, 'Mar-sin').replace(/\bSAIC-GM\b/g, 'S-A-I-C G-M').replace(/\bSAIC\b/g, 'S-A-I-C').replace(/\bSGM\b/g, 'S-G-M')
    .replace(/L2\+\+/g, 'L2-plus-plus').replace(/\bEVs\b/g, 'E-Vs').replace(/\bEV\b/g, 'E-V');
}

/* ================= voices: the browser's own speech, with a caption for every line ================= */
const TTS = { ok: typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined', voices: [], cache: {} };
const FEM = /female|zira|susan|hazel|samantha|karen|victoria|aria|jenny|michelle|emma|sonia|libby|natasha|clara|ava|allison|serena|tessa|moira|fiona|kate|helena|sabina|paulina|monica|lucia|elvira|dalia|salli|joanna|kendra|ivy|amy|ana\b|catherine|heera|linda|eva|laura|marisol/i;
const MAL = /\bmale|david|mark|george|guy|ryan|daniel|alex|fred|james|thomas|brian|eric|christopher|roger|steffan|tom\b|aaron|arthur|oliver|jorge|pablo|alvaro|raul|matthew|joey|justin|ravi|richard|sean|william|andrew|davis|jason|tony/i;
function loadVoices() { if (!TTS.ok) return; TTS.voices = speechSynthesis.getVoices() || []; TTS.cache = {}; }
if (TTS.ok) { loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) {} }
function voiceFor(spk, es) {
  const key = spk.name + spk.g + spk.slot + (es ? 'es' : '');
  if (key in TTS.cache) return TTS.cache[key];
  const lang = es ? /^es/i : /^en/i;
  const pool = TTS.voices.filter(v => lang.test(v.lang));
  const gOf = v => FEM.test(v.name) ? 'f' : MAL.test(v.name) ? 'm' : '?';
  const score = v => (/natural|online|neural/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/en-US|es-MX|es-US/i.test(v.lang) ? 1 : 0) + (v.localService ? 0 : 0.5);
  const match = pool.filter(v => gOf(v) === spk.g).sort((a, b) => score(b) - score(a));
  const other = pool.filter(v => gOf(v) === '?').sort((a, b) => score(b) - score(a));
  const list = match.length ? match : other.length ? other : pool;
  const v = list.length ? list[spk.slot % list.length] : null;
  TTS.cache[key] = v; return v;
}
let speakGen = 0;
function speak(spkId, text, vol, es = false) {
  const spk = SPK[spkId], gen = ++speakGen;
  const est = 1.2 + text.length / 13.5;
  return new Promise(res => {
    let done = false;
    const fin = ok => { if (done) return; done = true; clearTimeout(wd); res(ok && gen === speakGen); };
    const wd = setTimeout(() => fin(true), est * 1000 * 1.7 + 1500);   // some browsers forget to say they finished
    if (!TTS.ok || vol <= 0.001) { clearTimeout(wd); setTimeout(() => fin(true), est * 1000); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(sayify(text));
      const v = voiceFor(spk, es); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = es ? 'es-MX' : 'en-US';
      u.pitch = spk.p; u.rate = spk.r; u.volume = Math.min(1, vol);
      u.onend = () => fin(true); u.onerror = () => fin(false);
      speechSynthesis.speak(u);
    } catch (e) { setTimeout(() => fin(true), est * 1000); }
  });
}
function hush() { speakGen++; if (TTS.ok) try { speechSynthesis.cancel(); } catch (e) {} }
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ================= the radio itself ================= */
const VKEY = 'mf-drive-radio-vol-v1';
const R = {
  ac: null, rig: null, master: null, duck: null, musicDuck: null,
  idx: -1, player: null, gen: 0, timer: null, vol: 0.7,
  narrating: false, menu: false, hidden: false, held: false,
  talkPos: {}, songPos: {}, epoch: (typeof performance !== 'undefined' ? performance.now() / 1000 : 0),
  caption: '', lastSong: null,
};
try { const v = parseFloat(localStorage.getItem(VKEY)); if (v >= 0 && v <= 1) R.vol = v; } catch (e) {}

function ensureAudio() {
  if (R.ac) { if (R.ac.state === 'suspended' && !R.hidden) R.ac.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  const ac = new AC();
  R.ac = ac;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
  R.master = ac.createGain(); R.master.gain.value = R.vol * 0.9;
  R.duck = ac.createGain(); R.duck.gain.value = 1;
  R.musicDuck = ac.createGain(); R.musicDuck.gain.value = 1;
  R.musicDuck.connect(R.duck); R.duck.connect(R.master); R.master.connect(comp); comp.connect(ac.destination);
  R.rig = makeRig(ac, R.musicDuck);
  for (const st of STATIONS) if (st.kind === 'music' && !st.built) { st.built = st.songs.map(([t, a]) => new Song(st.genre, t, a)); st.total = st.built.reduce((s, x) => s + x.dur, 0); }
  return true;
}
const station = () => STATIONS[R.idx] || null;

function staticBurst() {
  if (!R.ac) return;
  const ac = R.ac, t = ac.currentTime, n = noiseSrc(R.rig, t, 0.35), f = filt(R.rig, 'bandpass', 2200, 0.5), g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(3800, t + 0.3);
  n.connect(f); f.connect(g); g.connect(R.duck);
}
function sting(st) {
  if (!R.ac || !st) return;
  const t = R.ac.currentTime + 0.32, base = { synth: 69, lofi: 72, hiphop: 67, rock: 64, latin: 69 }[st.genre] || 67;
  const seq = st.kind === 'talk' ? [0, 7, 12] : [0, 4, 7, 12];
  seq.forEach((iv, i) => {
    const m = base + iv + (st.kind === 'talk' ? -5 : 0);
    if (st.id === 'redline') I.lead(R.rig, R.duck, t + i * 0.11, m, 0.16, 1, 'sawtooth', 2800, 0.2, 0.2, true);
    else if (st.kind === 'talk') I.bell(R.rig, R.duck, t + i * 0.13, m, 1.1, 0.1);
    else I.pluck(R.rig, R.duck, t + i * 0.1, m, 0.25, 1.2, st.id === 'night' ? 'square' : 'triangle', 3800, 0.3, 0.3);
  });
}

function setMusicDuck(v, tc = 0.15) { if (R.musicDuck) R.musicDuck.gain.setTargetAtTime(v, R.ac.currentTime, tc); }

/* the station's clock keeps running while you are tuned elsewhere, so you come back in the middle of a song */
function songAt(st) {
  const now = performance.now() / 1000 - R.epoch + (hash(st.id) % 600);
  let e = now % st.total;
  for (let i = 0; i < st.built.length; i++) {
    const s = st.built[i];
    if (e < s.dur) return { i, bar: Math.min(s.bars - 6, Math.max(0, Math.floor(e / s.barDur))) };
    e -= s.dur;
  }
  return { i: 0, bar: 0 };
}

function startSong(st, i, bar, gen, intro) {
  if (gen !== R.gen) return;
  const S = st.built[i]; R.songPos[st.id] = i;
  if (R.player) R.player.stop(0.4);
  R.player = new Player(R.rig, R.musicDuck, S, bar);
  R.player.st = st; R.player.i = i;
  R.lastSong = S;
  showToast(st, `${S.title} · ${S.artist}`);
  if (intro) djBreak(st, gen, intro);
}
async function djBreak(st, gen, kind) {
  await wait(kind === 'tune' ? 1700 : 1200);
  if (gen !== R.gen || R.narrating) return;
  let line, es = false, spk = st.dj;
  const r = Math.random(), S = R.lastSong;
  if (kind === 'tune') { const [s, cap, say, sayEs] = st.idLine; spk = s; line = cap; if (st.id === 'carretera' && hasEs() && Math.random() < 0.6) { es = true; line = sayEs; } }
  else if (r < 0.22) { const ad = ADS[Math.floor(Math.random() * ADS.length)]; return playLines(ad, gen, 0.5); }
  else if (r < 0.55 && S) line = `That was ${S.title} by ${S.artist}.`;
  else if (st.id === 'carretera' && hasEs() && Math.random() < 0.5) { es = true; line = st.chatterEs[Math.floor(Math.random() * st.chatterEs.length)]; }
  else line = st.chatter[Math.floor(Math.random() * st.chatter.length)];
  setMusicDuck(0.42);
  setCaption(SPK[spk].name, line);
  await speak(spk, kind === 'tune' && !es ? st.idLine[2] : line, R.vol, es);
  if (gen === R.gen) { setCaption(); setMusicDuck(1, 0.4); }
}
const hasEs = () => TTS.ok && TTS.voices.some(v => /^es/i.test(v.lang));
async function playLines(lines, gen, duckTo) {
  setMusicDuck(duckTo, 0.2);
  for (const [spk, text] of lines) {
    if (gen !== R.gen) return;
    while (R.narrating && gen === R.gen) await wait(300);
    setCaption(SPK[spk].name === 'Ad' ? '' : SPK[spk].name, text);
    await speak(spk, text, R.vol);
    await wait(260);
  }
  if (gen === R.gen) { setCaption(); setMusicDuck(1, 0.4); }
}

async function runTalk(st, gen) {
  if (!(st.id in R.talkPos)) R.talkPos[st.id] = Math.floor(Math.random() * st.segs.length);
  await wait(900);
  if (gen !== R.gen) return;
  const [s, cap, say] = st.idLine;
  setCaption(SPK[s].name, cap); await speak(s, say, R.vol); await wait(300);
  let n = 0;
  while (gen === R.gen) {
    const seg = st.segs[R.talkPos[st.id] % st.segs.length];
    for (let k = 0; k < seg.length && gen === R.gen; k++) {
      const [spk, text] = seg[k];
      while ((R.narrating || R.hidden) && gen === R.gen) await wait(300);
      if (gen !== R.gen) return;
      setCaption(SPK[spk].name, text);
      const ok = await speak(spk, text, R.vol);
      if (!ok && (R.narrating || R.hidden)) { k--; continue; }   // cut off by the narration: say it again after
      await wait(320 + Math.random() * 250);
    }
    if (gen !== R.gen) return;
    R.talkPos[st.id]++; n++;
    setCaption(); await wait(700);
    if (n % 2 === 0) { sting(st); await wait(900); await playLines(ADS[(R.talkPos[st.id] + n) % ADS.length], gen, 1); await wait(600); sting(st); await wait(800); }
  }
}

function tune(i) {
  const prev = R.idx;
  R.gen++; hush(); setCaption();
  if (R.player) { R.player.stop(0.25); R.player = null; }
  if (i < 0 || i >= STATIONS.length) { R.idx = -1; showToast(null); syncUI(); return; }
  if (!ensureAudio()) { R.idx = -1; showToast(null, 'Radio needs a newer browser'); syncUI(); return; }
  R.idx = i; const st = STATIONS[i], gen = R.gen;
  setMusicDuck(1, 0.05);
  staticBurst();
  syncUI();
  if (st.kind === 'music') { const p = songAt(st); startSong(st, p.i, p.bar, gen, prev === i ? null : 'tune'); }
  else { showToast(st, st.tag); sting(st); runTalk(st, gen); }
}
function cycle(dir = 1) { const n = STATIONS.length + 1; const cur = R.idx + 1; tune(((cur + dir) % n + n) % n - 1); }

/* the scheduler and the ducking, on one light timer */
function loop() {
  if (R.ac && R.player && !R.hidden) {
    const done = R.player.tick(0.3);
    if (done) {
      const st = R.player.st, gen = R.gen, i = (R.player.i + 1) % st.built.length;
      startSong(st, i, 0, gen, Math.random() < 0.7 ? 'break' : null);
    }
  }
  const v = window.__dvVoice;
  const narr = !!(v && !v.paused && !v.ended && v.currentTime > 0);
  const intro = $('#dv-intro'), menu = !!(intro && !intro.hidden);
  if (narr !== R.narrating) { R.narrating = narr; if (narr) hush(); }
  R.menu = menu;
  const dk = R.narrating ? 0.12 : R.menu ? 0.4 : 1;
  if (R.duck && dk !== R.lastDuck) { R.lastDuck = dk; R.duck.gain.setTargetAtTime(dk, R.ac.currentTime, 0.12); }
}
setInterval(loop, 60);
document.addEventListener('visibilitychange', () => {
  R.hidden = document.hidden;
  if (!R.ac) return;
  if (R.hidden) { R.ac.suspend(); hush(); }
  else if (R.idx >= 0) { R.ac.resume(); const st = station(); if (st && st.kind === 'talk') { R.gen++; runTalk(st, R.gen); } }
});

/* ================= on screen: the radio button, the station list, the station toast and the captions ================= */
const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8.5" width="18" height="11.5" rx="2.4"/><path d="M7 8.5 16.5 4"/><circle cx="8.6" cy="14.2" r="2.4"/><path d="M14 12.6h4M14 15.8h4"/></svg>';
let btn, pop, toast, capEl, toastT = 0, kpCap = null;

function buildUI() {
  const ctl = $('.dv-ctl');
  if (!ctl) return false;
  btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'b-radio'; btn.className = 'r4-btn';
  btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Radio'); btn.title = 'Radio (Q)';
  btn.innerHTML = ICON + '<i class="r4-dot" aria-hidden="true"></i>';
  ctl.insertBefore(btn, ctl.firstChild);
  btn.addEventListener('click', e => { e.preventDefault(); togglePop(); if (pop.hidden) btn.blur(); });

  pop = document.createElement('div'); pop.className = 'r4-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Radio stations');
  pop.innerHTML = `<p class="r4-h">Radio <span>Q to switch</span></p>
    <div class="r4-list" role="group" aria-label="Stations">
      <button type="button" class="r4-st r4-off" data-i="-1"><b>Radio off</b></button>
      ${STATIONS.map((s, i) => `<button type="button" class="r4-st" data-i="${i}" style="--c:${s.color}"><i class="r4-sw" aria-hidden="true"></i><b>${s.name}</b><span>${s.freq} · ${s.tag}</span></button>`).join('')}
    </div>
    <label class="r4-vol"><span>Volume</span><input type="range" min="0" max="100" step="1" value="${Math.round(R.vol * 100)}" aria-label="Radio volume"></label>
    <p class="r4-note">Original music made live in your browser. Talk uses your browser's voices.</p>`;
  document.body.appendChild(pop);
  pop.querySelectorAll('.r4-st').forEach(b => b.addEventListener('click', () => { tune(+b.dataset.i); closePop(); }));
  const vol = pop.querySelector('input');
  vol.addEventListener('input', () => {
    R.vol = vol.value / 100;
    if (R.master) R.master.gain.setTargetAtTime(R.vol * 0.9, R.ac.currentTime, 0.05);
    try { localStorage.setItem(VKEY, String(R.vol)); } catch (e) {}
  });
  document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) closePop(); }, true);

  toast = document.createElement('div'); toast.className = 'r4-toast'; toast.setAttribute('aria-live', 'polite'); toast.hidden = true;
  document.body.appendChild(toast);
  capEl = document.createElement('p'); capEl.className = 'r4-cap'; capEl.hidden = true;
  document.body.appendChild(capEl);

  /* the on-screen keys panel gets a Q key, next to Esc */
  const more = document.querySelector('.r3-keys .r3-more');
  if (more) {
    kpCap = document.createElement('button'); kpCap.type = 'button'; kpCap.tabIndex = -1; kpCap.className = 'r3-cap'; kpCap.dataset.key = 'q';
    kpCap.setAttribute('aria-label', 'Q Radio'); kpCap.innerHTML = '<kbd>Q</kbd><span>Radio</span>';
    const esc = more.querySelector('[data-key="escape"]');
    more.insertBefore(kpCap, esc || null);
    kpCap.addEventListener('pointerdown', e => { e.preventDefault(); if (e.button) return; kpCap.classList.add('lit'); cycle(1); });
    const off = () => kpCap.classList.remove('lit');
    kpCap.addEventListener('pointerup', off); kpCap.addEventListener('pointerleave', off);
  }
  /* the controls list in the menu */
  const keysList = document.getElementById('dv-keys');
  if (keysList && !keysList.querySelector('.r4-li')) {
    const li = document.createElement('li'); li.className = 'r4-li'; li.innerHTML = '<kbd>Q</kbd> Radio';
    const escLi = [...keysList.children].find(x => /Esc/.test(x.textContent));
    keysList.insertBefore(li, escLi || null);
  }
  syncUI();
  return true;
}
function togglePop() { if (pop.hidden) openPop(); else closePop(); }
function openPop() {
  pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.classList.add('open');
  (pop.querySelector('.r4-st.on') || pop.querySelector('.r4-st')).focus({ preventScroll: true });
}
function closePop(refocus) {
  if (pop.hidden) return;
  pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('open');
  if (refocus) btn.focus({ preventScroll: true }); else if (document.activeElement && pop.contains(document.activeElement)) document.activeElement.blur();
}
function syncUI() {
  if (!btn) return;
  const st = station();
  btn.classList.toggle('on', !!st); btn.setAttribute('aria-pressed', st ? 'true' : 'false');
  btn.title = st ? `Radio: ${st.name} (Q)` : 'Radio off (Q)';
  btn.setAttribute('aria-label', st ? `Radio: ${st.name}` : 'Radio, off');
  btn.style.setProperty('--c', st ? st.color : 'transparent');
  pop.querySelectorAll('.r4-st').forEach(b => { const on = +b.dataset.i === R.idx; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
}
function showToast(st, sub) {
  if (!toast) return;
  clearTimeout(toastT);
  if (!st && !sub) { toast.innerHTML = '<b>Radio off</b>'; toast.style.setProperty('--c', 'var(--line)'); }
  else if (!st) { toast.innerHTML = `<b>${sub}</b>`; }
  else { toast.innerHTML = `<span class="r4-f">${st.freq}</span><b>${st.name}</b>${sub ? `<em>${sub}</em>` : ''}`; toast.style.setProperty('--c', st.color); }
  toast.hidden = false; requestAnimationFrame(() => toast.classList.add('on'));
  toastT = setTimeout(() => { toast.classList.remove('on'); setTimeout(() => { if (!toast.classList.contains('on')) toast.hidden = true; }, 350); }, 3200);
}
function setCaption(who, text) {
  R.caption = text ? (who ? `${who}: ${text}` : text) : '';
  if (!capEl) return;
  if (!text) { capEl.classList.remove('on'); return; }
  capEl.innerHTML = who ? `<b>${who}</b> ${text}` : text;
  capEl.hidden = false; capEl.classList.add('on');
}

/* the key: Q switches, Shift+Q goes back; Esc closes the station list first */
addEventListener('keydown', e => {
  if (!btn) return;
  const k = e.key.toLowerCase();
  if (!pop.hidden && k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); closePop(true); return; }
  if (k !== 'q' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && /input|textarea|select/i.test(e.target.tagName) && e.target.type !== 'range') return;
  const intro = $('#dv-intro'), resp = document.querySelector('.r3-resp');
  if ((intro && !intro.hidden) || (resp && !resp.hidden)) return;
  e.preventDefault();
  if (kpCap) kpCap.classList.add('lit');
  if (!e.repeat) cycle(e.shiftKey ? -1 : 1);
}, true);
addEventListener('keyup', e => { if (kpCap && e.key.toLowerCase() === 'q') kpCap.classList.remove('lit'); });

if (!root.classList.contains('dv-fallback') && $('.dv-ctl')) buildUI();

/* QA: renders a few seconds of any station offline, so its level can be checked without speakers */
if (QA) window.__radio = {
  R, STATIONS, tune, cycle, station, Song, GENRES,
  async render(stationId, secs = 12, bar = 8, only = null) {
    const st = STATIONS.find(s => s.id === stationId); const sr = 22050;
    const oac = new OfflineAudioContext(2, sr * secs, sr);
    const comp = oac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    const out = oac.createGain(); out.gain.value = 0.63; out.connect(comp); comp.connect(oac.destination);
    const rig = makeRig(oac, out);
    const S = new Song(st.genre, st.songs[0][0], st.songs[0][1]);
    const p = new Player(rig, out, S, bar); p.next = 0.05; p.out.gain.cancelScheduledValues(0); p.out.gain.setValueAtTime(1, 0);
    p.tick(secs);
    const buf = await oac.startRendering(); const d = buf.getChannelData(0);
    let pk = 0, sq = 0, clip = 0; for (const x of d) { const a = Math.abs(x); if (a > pk) pk = a; sq += x * x; if (a > 0.99) clip++; }
    return { id: stationId, bpm: S.bpm, peak: +pk.toFixed(3), rms: +Math.sqrt(sq / d.length).toFixed(4), clip };
  },
  voices: () => TTS.voices.map(v => v.name + ' ' + v.lang),
};
