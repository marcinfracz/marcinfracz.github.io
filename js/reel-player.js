/* v57: the sizzle reel player, used on the Start page, the reel page and the Road's finish.
   On a computer: the wide cut with the browser's own controls.
   On a phone or tablet: the tall cut while the screen is upright and the wide cut when it is
   turned, swapped in place. Both cuts load together and stay in step; the wide one always
   carries the sound, so the soundtrack never restarts or skips when the picture changes.
   iPhone fullscreen is the system player, which shows the wide cut only. */
(function () {
  var R = window.MF_REEL || {};
  function mq(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }
  function touchDevice() { return mq('(pointer: coarse)'); }
  function upright() { return mq('(orientation: portrait)'); }
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }

  var cssDone = false;
  function addCss() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent =
      '.mfr-host{aspect-ratio:auto!important;height:auto!important;overflow:visible!important;background:none!important;box-shadow:none!important}' +
      '.mfr{position:relative;display:block;margin:0 auto;background:#000;overflow:hidden;border-radius:inherit;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:manipulation}' +
      '.mfr[data-o=l]{width:min(100%,calc(var(--mfr-maxhl,92svh) * 16 / 9));aspect-ratio:16/9}' +
      '.mfr[data-o=p]{width:min(100%,calc(var(--mfr-maxh,76svh) * 9 / 16));aspect-ratio:9/16}' +
      '.mfr .mfr-v{position:absolute;inset:0;width:100%!important;height:100%!important;object-fit:contain!important;background:#000;opacity:0;transition:opacity .3s ease;pointer-events:none}' +
      '.mfr[data-o=l] .mfr-l,.mfr[data-o=p] .mfr-p{opacity:1}' +
      '.mfr:fullscreen,.mfr:-webkit-full-screen{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;border-radius:0!important}' +
      '.mfr-big{all:unset;position:absolute;left:50%;top:50%;width:68px;height:68px;margin:-34px 0 0 -34px;border-radius:50%;background:rgba(255,255,255,.94);display:grid;place-items:center;box-shadow:0 14px 34px -10px rgba(0,0,0,.6);cursor:pointer;z-index:3;transition:opacity .2s ease}' +
      '.mfr-big svg{width:26px;height:26px;margin-left:4px;fill:#0b1020}' +
      '.mfr[data-state=playing] .mfr-big{opacity:0;pointer-events:none}' +
      '.mfr-bar{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;align-items:center;gap:6px;padding:22px 8px max(6px,env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.62));color:#fff;font:600 13px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;transition:opacity .25s ease}' +
      '.mfr.mfr-idle .mfr-bar{opacity:0;pointer-events:none}' +
      '.mfr-bar button{all:unset;flex:none;width:44px;height:44px;display:grid;place-items:center;cursor:pointer;border-radius:50%}' +
      '.mfr-bar button:focus-visible,.mfr-big:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
      '.mfr-bar svg{width:22px;height:22px;fill:currentColor}' +
      '.mfr-t{flex:none;min-width:34px;text-align:center;font-variant-numeric:tabular-nums}' +
      '.mfr-seek{flex:1;min-width:40px;height:44px;margin:0;background:transparent;accent-color:#fff;cursor:pointer}';
    document.head.appendChild(s);
  }

  var IC = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2zM18.4 6a8.5 8.5 0 0 1 0 12L17 16.6a6.5 6.5 0 0 0 0-9.2z"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16.3 9.7l1.4-1.4L20 10.6l2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3-1.4 1.4-2.3-2.3-2.3 2.3-1.4-1.4 2.3-2.3z"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z"/></svg>'
  };

  function single(host, o) {
    var v = document.createElement('video');
    v.controls = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.preload = o.preload || 'metadata';
    if (R.poster) v.poster = R.poster;
    v.src = R.src;
    v.setAttribute('aria-label', o.label || 'Sizzle reel');
    if (o.id) v.id = o.id;
    host.innerHTML = ''; host.appendChild(v);
    if (o.autoplay) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    return { video: v, play: function () { var q = v.play(); if (q && q.catch) q.catch(function () {}); }, pause: function () { v.pause(); } };
  }

  function dual(host, o) {
    addCss();
    host.classList.add('mfr-host');
    var root = document.createElement('div');
    root.className = 'mfr'; root.setAttribute('data-state', 'paused');
    if (o.id) root.id = o.id + '-player';
    root.innerHTML =
      '<video class="mfr-v mfr-l" playsinline webkit-playsinline preload="metadata"></video>' +
      '<video class="mfr-v mfr-p" playsinline webkit-playsinline muted preload="metadata"></video>' +
      '<button class="mfr-big" type="button" aria-label="Play the sizzle reel">' + IC.play + '</button>' +
      '<div class="mfr-bar">' +
        '<button class="mfr-pp" type="button" aria-label="Play">' + IC.play + '</button>' +
        '<span class="mfr-t mfr-cur">0:00</span>' +
        '<input class="mfr-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Position in the reel">' +
        '<span class="mfr-t mfr-dur">' + (R.length || '') + '</span>' +
        '<button class="mfr-mute" type="button" aria-label="Mute">' + IC.sound + '</button>' +
        '<button class="mfr-fs" type="button" aria-label="Full screen">' + IC.full + '</button>' +
      '</div>';
    var L = root.querySelector('.mfr-l'), P = root.querySelector('.mfr-p');
    if (R.poster) L.poster = R.poster;
    P.poster = R.phonePoster || R.poster || '';
    L.src = R.src; P.src = R.phoneSrc;
    P.muted = true; P.defaultMuted = true;
    L.setAttribute('aria-label', o.label || 'Sizzle reel'); P.setAttribute('aria-hidden', 'true');
    if (o.id) L.id = o.id;
    host.innerHTML = ''; host.appendChild(root);

    var big = root.querySelector('.mfr-big'), pp = root.querySelector('.mfr-pp'), seek = root.querySelector('.mfr-seek'),
      cur = root.querySelector('.mfr-cur'), dur = root.querySelector('.mfr-dur'), mute = root.querySelector('.mfr-mute'), fsb = root.querySelector('.mfr-fs');
    var want = false, seeking = false, idleT = 0, nativeFs = false;

    function orient() { root.setAttribute('data-o', upright() ? 'p' : 'l'); }
    orient();
    function hard() { /* put the picture exactly where the sound is */
      if (Math.abs(P.currentTime - L.currentTime) > 0.06) { try { P.currentTime = L.currentTime; } catch (e) {} }
      P.playbackRate = 1;
    }
    function quiet(p) { if (p && p.catch) p.catch(function () {}); return p; }
    function show() {
      var playing = want && !L.paused;
      root.setAttribute('data-state', want ? 'playing' : 'paused');
      pp.innerHTML = want ? IC.pause : IC.play; pp.setAttribute('aria-label', want ? 'Pause' : 'Play');
      mute.innerHTML = L.muted ? IC.muted : IC.sound; mute.setAttribute('aria-label', L.muted ? 'Unmute' : 'Mute');
      if (!want) root.classList.remove('mfr-idle');
      return playing;
    }
    function wake() {
      root.classList.remove('mfr-idle'); clearTimeout(idleT);
      if (want) idleT = setTimeout(function () { if (want && !seeking) root.classList.add('mfr-idle'); }, 2600);
    }
    function play() {
      want = true; hard();
      var a = L.play();
      quiet(P.play());
      if (a && a.catch) a.catch(function () { want = false; P.pause(); show(); });
      show(); wake();
    }
    function pause() { want = false; L.pause(); P.pause(); hard(); show(); wake(); }
    function toggle() { if (want) pause(); else play(); }

    /* keep the tall picture in step with the wide one, which carries the sound */
    setInterval(function () {
      if (!want || L.paused || P.paused || P.seeking || nativeFs) return;
      var d = P.currentTime - L.currentTime;
      if (Math.abs(d) > 0.35) { try { P.currentTime = L.currentTime + 0.08; } catch (e) {} P.playbackRate = 1; }
      else if (Math.abs(d) > 0.03) P.playbackRate = Math.max(0.85, Math.min(1.15, 1 - d * 1.6));
      else if (P.playbackRate !== 1) P.playbackRate = 1;
    }, 200);
    L.addEventListener('waiting', function () { if (want) P.pause(); });
    L.addEventListener('playing', function () { if (want && !nativeFs) { hard(); quiet(P.play()); } show(); });
    L.addEventListener('pause', function () { if (!nativeFs && want && !L.ended) { /* paused by the system */ want = false; P.pause(); show(); } });
    L.addEventListener('ended', function () { want = false; P.pause(); try { P.currentTime = L.currentTime; } catch (e) {} show(); });
    L.addEventListener('timeupdate', function () {
      if (!seeking && L.duration) seek.value = Math.round(L.currentTime / L.duration * 1000);
      cur.textContent = fmt(L.currentTime);
    });
    L.addEventListener('loadedmetadata', function () { if (L.duration) dur.textContent = fmt(L.duration); });
    L.addEventListener('volumechange', show);

    seek.addEventListener('input', function () {
      seeking = true;
      if (L.duration) { var t = seek.value / 1000 * L.duration; L.currentTime = t; try { P.currentTime = t; } catch (e) {} cur.textContent = fmt(t); }
      wake();
    });
    seek.addEventListener('change', function () { seeking = false; hard(); wake(); });

    big.addEventListener('click', function (e) { e.stopPropagation(); play(); });
    pp.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    mute.addEventListener('click', function (e) { e.stopPropagation(); L.muted = !L.muted; show(); wake(); });
    root.addEventListener('click', function (e) {
      if (e.target.closest('.mfr-bar')) return;
      if (!want) { play(); return; }
      if (root.classList.contains('mfr-idle')) wake(); else toggle();
    });

    function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
    function iphoneFs() { /* the system player: the wide cut, which has the sound */
      if (!L.webkitEnterFullscreen) return;
      nativeFs = true; P.pause();
      try { L.webkitEnterFullscreen(); } catch (e) { nativeFs = false; }
    }
    L.addEventListener('webkitendfullscreen', function () {
      nativeFs = false; want = !L.paused; hard(); if (want) quiet(P.play()); show();
    });
    fsb.addEventListener('click', function (e) {
      e.stopPropagation();
      if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (root.requestFullscreen) quiet(root.requestFullscreen({ navigationUI: 'hide' })).catch(iphoneFs);
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else iphoneFs();
      wake();
    });

    /* turning the phone: the picture changes, the sound carries on */
    function turned() {
      var was = root.getAttribute('data-o');
      orient();
      if (root.getAttribute('data-o') !== was) {
        hard(); if (want && P.paused && !nativeFs) quiet(P.play()); wake();
        /* keep a playing reel on screen after the page reflows */
        if (want && !fsEl()) requestAnimationFrame(function () { var b = root.getBoundingClientRect(); if (b.top < 0 || b.bottom > window.innerHeight) root.scrollIntoView({ block: 'center' }); });
      }
    }
    try { window.matchMedia('(orientation: portrait)').addEventListener('change', turned); } catch (e) {
      try { window.matchMedia('(orientation: portrait)').addListener(turned); } catch (e2) {}
    }
    window.addEventListener('resize', turned);
    window.addEventListener('orientationchange', function () { setTimeout(turned, 60); });

    show();
    if (o.autoplay) play();
    return { video: L, root: root, play: play, pause: function () { if (want) pause(); } };
  }

  function mount(host, o) {
    o = o || {};
    if (!host || !R.src) return null;
    return (R.phoneSrc && touchDevice() && !o.single) ? dual(host, o) : single(host, o);
  }
  window.MFReel = { mount: mount };
})();
