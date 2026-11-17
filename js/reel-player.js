/* v62: the video about Marcin opens in a popup over whatever page you are on, with YouTube-style controls.
   Any link to reel.html, or anything marked data-reel, opens it. Inside the Desktop's windows it opens over
   the whole Desktop. Close with the X, Esc, or a click outside the video.
   On a phone held upright it shows the tall cut, and the wide cut when the phone is turned. Both cuts load
   together and stay in step; the wide one always carries the sound, so the soundtrack never restarts.
   Keys: Space or K play and pause, J and L skip 10 seconds, arrows skip 5 seconds and change the volume,
   M mutes, F is full screen, 0 to 9 jump through the video. */
(function () {
  var R = window.MF_REEL || {};
  function mq(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }
  function touchDevice() { return mq('(pointer: coarse)'); }
  function upright() { return mq('(orientation: portrait)'); }
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
  function quiet(p) { if (p && p.catch) p.catch(function () {}); return p; }
  function name() { return R.name || 'Meet Marcin'; }

  var cssDone = false;
  function addCss() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent = [
      /* the popup */
      '.mfl{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(6,8,12,.9);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .2s ease;font:500 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#fff}',
      '.mfl.on{opacity:1}',
      '.mfl-stage{width:min(92vw,calc((100vh - 120px) * 16 / 9));width:min(92vw,calc((100dvh - 120px) * 16 / 9))}',
      '.mfl-x{all:unset;position:fixed;top:14px;right:16px;z-index:3;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;cursor:pointer;background:rgba(255,255,255,.12);color:#fff;transition:background .15s ease}',
      '.mfl-x:hover{background:rgba(255,255,255,.24)}.mfl-x:focus-visible{outline:2px solid #fff;outline-offset:2px}',
      '.mfl-x svg{width:22px;height:22px;fill:currentColor}',
      'html.mfl-lock,html.mfl-lock body{overflow:hidden!important}',
      /* a phone: the video takes the whole screen; upright shows the tall cut */
      '.mfl.mfl-phone .mfl-stage{width:100vw;height:100vh;height:100dvh;display:grid;place-items:center}',
      '.mfl.mfl-phone .mfp{border-radius:0}',
      '.mfl.mfl-phone .mfp[data-o=p]{width:min(100vw,calc(100dvh * 9 / 16))}',
      '.mfl.mfl-phone .mfp[data-o=l]{width:min(100vw,calc(100dvh * 16 / 9))}',
      '.mfl.mfl-phone .mfl-x{top:max(10px,env(safe-area-inset-top,0px));right:10px;background:rgba(0,0,0,.45)}',

      /* the player */
      '.mfp{position:relative;display:block;width:100%;background:#000;border-radius:12px;overflow:hidden;outline:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:manipulation;box-shadow:0 30px 80px -20px rgba(0,0,0,.7)}',
      '.mfp[data-o=l]{aspect-ratio:16/9}.mfp[data-o=p]{aspect-ratio:9/16}',
      '.mfp:focus,.mfp:focus-visible{outline:none!important;box-shadow:0 30px 80px -20px rgba(0,0,0,.7)!important}',
      '.mfp:fullscreen,.mfp:-webkit-full-screen{width:100vw!important;height:100vh!important;aspect-ratio:auto!important;border-radius:0!important;box-shadow:none}',
      '.mfp-v{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;opacity:0;transition:opacity .3s ease;pointer-events:none}',
      '.mfp[data-o=l] .mfp-l,.mfp[data-o=p] .mfp-p{opacity:1}',
      '.mfp.mfp-hide{cursor:none}',
      '.mfp-shade{position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.72));pointer-events:none;transition:opacity .25s ease}',
      '.mfp-big{all:unset;position:absolute;left:50%;top:50%;z-index:2;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:rgba(0,0,0,.55);display:grid;place-items:center;cursor:pointer;transition:opacity .2s ease,transform .15s ease,background .15s ease}',
      '.mfp-big:hover{background:#f00;transform:scale(1.06)}.mfp-big:focus-visible{outline:2px solid #fff;outline-offset:3px}',
      '.mfp-big svg{width:34px;height:34px;fill:#fff}.mfp-big .i-play{margin-left:5px}',
      '.mfp[data-state=playing] .mfp-big{opacity:0;pointer-events:none}',
      '.mfp.mfp-touch[data-state=playing]:not(.mfp-hide) .mfp-big{opacity:1;pointer-events:auto}',
      '.mfp-flash{position:absolute;left:50%;top:50%;z-index:1;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(0,0,0,.5);display:grid;place-items:center;opacity:0;pointer-events:none}',
      '.mfp-flash svg{width:30px;height:30px;fill:#fff}',
      '.mfp-flash.go{animation:mfpflash .55s ease-out}',
      '@keyframes mfpflash{0%{opacity:.95;transform:scale(.8)}100%{opacity:0;transform:scale(1.5)}}',
      '.mfp-skip{position:absolute;top:50%;z-index:1;margin-top:-22px;padding:10px 14px;border-radius:22px;background:rgba(0,0,0,.5);font-weight:700;font-size:15px;opacity:0;pointer-events:none}',
      '.mfp-skip.l{left:12%}.mfp-skip.r{right:12%}.mfp-skip.go{animation:mfpskip .7s ease-out}',
      '@keyframes mfpskip{0%{opacity:1}70%{opacity:1}100%{opacity:0}}',
      '.mfp-spin{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;border:4px solid rgba(255,255,255,.25);border-top-color:#fff;animation:mfpspin .8s linear infinite;display:none;pointer-events:none}',
      '.mfp.mfp-wait[data-state=playing] .mfp-spin{display:block}',
      '@keyframes mfpspin{to{transform:rotate(360deg)}}',
      '.mfp-ctl{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:0 12px max(4px,env(safe-area-inset-bottom,0px));transition:opacity .25s ease}',
      '.mfp.mfp-hide .mfp-ctl,.mfp.mfp-hide .mfp-shade{opacity:0;pointer-events:none}',
      '.mfp.mfp-fresh .mfp-ctl,.mfp.mfp-fresh .mfp-shade{opacity:0;pointer-events:none}',
      /* the progress bar */
      '.mfp-prog{position:relative;height:18px;display:flex;align-items:center;cursor:pointer;touch-action:none;outline:none}',
      '.mfp-rail{position:relative;flex:1;height:3px;background:rgba(255,255,255,.25);transition:height .1s ease}',
      '.mfp-prog:hover .mfp-rail,.mfp-prog.drag .mfp-rail,.mfp-prog:focus-visible .mfp-rail{height:5px}',
      '.mfp-buf,.mfp-hov,.mfp-fill{position:absolute;left:0;top:0;bottom:0;width:0}',
      '.mfp-buf{background:rgba(255,255,255,.4)}.mfp-hov{background:rgba(255,255,255,.5);display:none}.mfp-prog:hover .mfp-hov{display:block}',
      '.mfp-fill{background:#f00}',
      '.mfp-knob{position:absolute;top:50%;left:0;width:13px;height:13px;margin:-6.5px 0 0 -6.5px;border-radius:50%;background:#f00;transform:scale(0);transition:transform .1s ease}',
      '.mfp-prog:hover .mfp-knob,.mfp-prog.drag .mfp-knob,.mfp-prog:focus-visible .mfp-knob,.mfp-touch .mfp-knob{transform:scale(1)}',
      '.mfp-tip{position:absolute;bottom:22px;left:0;padding:3px 7px;border-radius:4px;background:rgba(28,28,28,.92);font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;transform:translateX(-50%);white-space:nowrap;display:none;pointer-events:none}',
      '.mfp-prog:hover .mfp-tip,.mfp-prog.drag .mfp-tip{display:block}',
      /* the button row */
      '.mfp-row{display:flex;align-items:center;gap:2px;height:46px}',
      '.mfp-row button{all:unset;flex:none;width:42px;height:42px;display:grid;place-items:center;cursor:pointer;border-radius:6px;opacity:.92}',
      '.mfp-row button:hover{opacity:1}.mfp-row button:focus-visible{outline:2px solid #fff;outline-offset:-2px}',
      '.mfp-row svg{width:24px;height:24px;fill:#fff}',
      '.mfp-vol{display:flex;align-items:center}',
      '.mfp-vs{width:0;opacity:0;margin:0;transition:width .15s ease,opacity .15s ease,margin .15s ease;accent-color:#fff;cursor:pointer;height:20px}',
      '.mfp-vol:hover .mfp-vs,.mfp-vol:focus-within .mfp-vs{width:64px;opacity:1;margin:0 8px 0 2px}',
      '.mfp-touch .mfp-vs{display:none}',
      '.mfp-time{margin-left:8px;font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;text-shadow:0 0 2px rgba(0,0,0,.5)}',
      '.mfp-time i{font-style:normal;opacity:.75}',
      '.mfp-sp{flex:1}',
      '.mfp-cc.on{box-shadow:inset 0 -3px 0 #f00}',
      '.mfp-touch .mfp-row button{width:46px;height:46px}',

      /* a poster that opens the popup, used where the video sits inside a page */
      '.mft{all:unset;box-sizing:border-box;position:relative;display:block;width:100%;aspect-ratio:16/9;border-radius:inherit;overflow:hidden;background:#000 center/cover no-repeat;cursor:pointer}',
      '.mft:focus-visible{outline:3px solid #f00;outline-offset:3px}',
      '.mft .mft-b{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(0,0,0,.55);display:grid;place-items:center;transition:background .15s ease,transform .15s ease}',
      '.mft:hover .mft-b{background:#f00;transform:scale(1.06)}',
      '.mft .mft-b svg{width:28px;height:28px;fill:#fff;margin-left:4px}',
      '.mft .mft-n{position:absolute;left:12px;top:10px;padding:4px 9px;border-radius:5px;background:rgba(0,0,0,.6);color:#fff;font:600 13px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
      '.mft .mft-n i{font-style:normal;opacity:.75;margin-left:6px;font-variant-numeric:tabular-nums}'
    ].join('');
    document.head.appendChild(s);
  }

  var IC = {
    play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4.5v15L7 15H3zM15.5 8.2a5 5 0 0 1 0 7.6l-1.4-1.4a3 3 0 0 0 0-4.8zM18 5.6a8.6 8.6 0 0 1 0 12.8l-1.4-1.4a6.6 6.6 0 0 0 0-10z"/></svg>',
    low: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4.5v15L7 15H3zM15.5 8.2a5 5 0 0 1 0 7.6l-1.4-1.4a3 3 0 0 0 0-4.8z"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4.5v15L7 15H3zM15.6 9.4l1.4-1.4 2.3 2.3 2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3-1.4 1.4-2.3-2.3-2.3 2.3-1.4-1.4 2.3-2.3z"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z"/></svg>',
    unfull: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h2v6H4V8h4zM14 4h2v4h4v2h-6zM4 14h6v6H8v-4H4zM14 14h6v2h-4v4h-2z"/></svg>',
    cc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v10h16V7zm2.5 3.5c0-.8.7-1.5 1.5-1.5h2v1.5H8v2h2V14H8a1.5 1.5 0 0 1-1.5-1.5zm6 0c0-.8.7-1.5 1.5-1.5h2v1.5h-2v2h2V14h-2a1.5 1.5 0 0 1-1.5-1.5z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>'
  };

  /* ---------- the player ---------- */
  function player(host, o) {
    addCss();
    o = o || {};
    var touch = touchDevice(), dualCut = !!(R.phoneSrc && touch);
    var root = document.createElement('div');
    root.className = 'mfp mfp-fresh' + (touch ? ' mfp-touch' : '');
    root.setAttribute('data-state', 'paused'); root.setAttribute('data-o', 'l');
    root.setAttribute('role', 'region'); root.setAttribute('aria-label', name() + ' video player');
    root.tabIndex = -1;
    root.innerHTML =
      '<video class="mfp-v mfp-l" playsinline webkit-playsinline preload="auto"></video>' +
      (dualCut ? '<video class="mfp-v mfp-p" playsinline webkit-playsinline muted preload="auto"></video>' : '') +
      '<div class="mfp-shade"></div>' +
      '<div class="mfp-flash"></div><div class="mfp-skip l"></div><div class="mfp-skip r"></div><div class="mfp-spin"></div>' +
      '<button class="mfp-big" type="button" aria-label="Play">' + IC.play + '</button>' +
      '<div class="mfp-ctl">' +
        '<div class="mfp-prog" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">' +
          '<div class="mfp-rail"><div class="mfp-buf"></div><div class="mfp-hov"></div><div class="mfp-fill"></div><div class="mfp-knob"></div></div>' +
          '<div class="mfp-tip">0:00</div>' +
        '</div>' +
        '<div class="mfp-row">' +
          '<button class="mfp-pp" type="button" aria-label="Play (k)">' + IC.play + '</button>' +
          '<div class="mfp-vol"><button class="mfp-mute" type="button" aria-label="Mute (m)">' + IC.sound + '</button>' +
          '<input class="mfp-vs" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"></div>' +
          '<span class="mfp-time"><span class="mfp-cur">0:00</span> <i>/ <span class="mfp-dur">' + (R.length || '0:00') + '</span></i></span>' +
          '<span class="mfp-sp"></span>' +
          (R.captions ? '<button class="mfp-cc" type="button" aria-label="Subtitles (c)" aria-pressed="false">' + IC.cc + '</button>' : '') +
          '<button class="mfp-fs" type="button" aria-label="Full screen (f)">' + IC.full + '</button>' +
        '</div>' +
      '</div>';
    var L = root.querySelector('.mfp-l'), P = root.querySelector('.mfp-p');
    L.poster = R.poster || ''; L.src = R.src;
    L.setAttribute('aria-label', name());
    if (P) { P.poster = R.phonePoster || R.poster || ''; P.src = R.phoneSrc; P.muted = true; P.defaultMuted = true; P.setAttribute('aria-hidden', 'true'); }
    if (R.captions) { var tr = document.createElement('track'); tr.kind = 'captions'; tr.srclang = 'en'; tr.label = 'English'; tr.src = R.captions; L.appendChild(tr); }
    host.innerHTML = ''; host.appendChild(root);

    function $(c) { return root.querySelector(c); }
    var big = $('.mfp-big'), pp = $('.mfp-pp'), prog = $('.mfp-prog'), fill = $('.mfp-fill'), knob = $('.mfp-knob'), buf = $('.mfp-buf'),
      hov = $('.mfp-hov'), tip = $('.mfp-tip'), cur = $('.mfp-cur'), dur = $('.mfp-dur'), mute = $('.mfp-mute'), vs = $('.mfp-vs'),
      fsb = $('.mfp-fs'), ccb = $('.mfp-cc'), flash = $('.mfp-flash'), skL = $('.mfp-skip.l'), skR = $('.mfp-skip.r'), ctl = $('.mfp-ctl');
    var want = false, dragging = false, idleT = 0, nativeFs = false, dead = false, timers = [];

    function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
    function inFs() { var f = fsEl(); return !!f && (f === root || f.contains(root)); }
    function orient() { root.setAttribute('data-o', P && upright() && (o.fill || inFs()) ? 'p' : 'l'); }
    orient();
    function hard() { if (!P) return; if (Math.abs(P.currentTime - L.currentTime) > 0.06) { try { P.currentTime = L.currentTime; } catch (e) {} } P.playbackRate = 1; }

    function D() { return L.duration && isFinite(L.duration) ? L.duration : 0; }
    function paint(t) {
      var d = D(), f = d ? Math.min(1, Math.max(0, t / d)) : 0;
      fill.style.width = (f * 100) + '%'; knob.style.left = (f * 100) + '%';
      cur.textContent = fmt(t);
      prog.setAttribute('aria-valuenow', Math.floor(t)); prog.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(d));
    }
    function paintBuf() { try { var b = L.buffered, d = D(); if (b.length && d) buf.style.width = (b.end(b.length - 1) / d * 100) + '%'; } catch (e) {} }

    function show() {
      var ended = L.ended;
      root.setAttribute('data-state', want ? 'playing' : (ended ? 'ended' : 'paused'));
      var ic = want ? IC.pause : (ended ? IC.replay : IC.play), lab = want ? 'Pause (k)' : (ended ? 'Replay' : 'Play (k)');
      pp.innerHTML = ic; pp.setAttribute('aria-label', lab);
      big.innerHTML = ic; big.setAttribute('aria-label', want ? 'Pause' : (ended ? 'Replay' : 'Play'));
      var v = L.muted ? 0 : L.volume;
      mute.innerHTML = v === 0 ? IC.muted : (v < 0.5 ? IC.low : IC.sound);
      mute.setAttribute('aria-label', L.muted ? 'Unmute (m)' : 'Mute (m)');
      if (!dragging) vs.value = L.muted ? 0 : L.volume;
      fsb.innerHTML = inFs() ? IC.unfull : IC.full; fsb.setAttribute('aria-label', inFs() ? 'Exit full screen (f)' : 'Full screen (f)');
      if (!want) root.classList.remove('mfp-hide');
    }
    function wake() {
      root.classList.remove('mfp-hide'); clearTimeout(idleT);
      if (want) idleT = setTimeout(function () {
        if (!want || dragging) return;
        if (!touch && ctl.matches(':hover')) return wake();
        root.classList.add('mfp-hide');
      }, touch ? 3000 : 2500);
    }
    function doFlash(ic) { flash.innerHTML = ic; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
    function play() {
      if (dead) return;
      root.classList.remove('mfp-fresh');
      if (L.ended) { try { L.currentTime = 0; } catch (e) {} }
      want = true; hard();
      var a = L.play();
      if (P) quiet(P.play());
      if (a && a.catch) a.catch(function () { want = false; if (P) P.pause(); show(); });
      show(); wake();
    }
    function pause() { want = false; L.pause(); if (P) P.pause(); hard(); show(); wake(); }
    function toggle(fl) { if (want) { pause(); if (fl) doFlash(IC.pause); } else { play(); if (fl) doFlash(IC.play); } }
    function seekTo(t) {
      var d = D(); if (!d) return;
      t = Math.max(0, Math.min(d - 0.05, t));
      L.currentTime = t; if (P) { try { P.currentTime = t; } catch (e) {} }
      paint(t);
    }
    function skip(s) {
      root.classList.remove('mfp-fresh');
      seekTo(L.currentTime + s); wake();
      var el = s < 0 ? skL : skR; el.textContent = (s < 0 ? '« ' : '') + Math.abs(s) + ' seconds' + (s > 0 ? ' »' : '');
      el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    }
    function setVol(v) { v = Math.max(0, Math.min(1, v)); L.volume = v; L.muted = v === 0; show(); }

    /* keep the tall picture in step with the wide one, which carries the sound */
    if (P) timers.push(setInterval(function () {
      if (!want || L.paused || P.paused || P.seeking || nativeFs) return;
      var d = P.currentTime - L.currentTime;
      if (Math.abs(d) > 0.35) { try { P.currentTime = L.currentTime + 0.08; } catch (e) {} P.playbackRate = 1; }
      else if (Math.abs(d) > 0.03) P.playbackRate = Math.max(0.85, Math.min(1.15, 1 - d * 1.6));
      else if (P.playbackRate !== 1) P.playbackRate = 1;
    }, 200));
    L.addEventListener('waiting', function () { root.classList.add('mfp-wait'); if (want && P) P.pause(); });
    L.addEventListener('playing', function () { root.classList.remove('mfp-wait'); if (want && P && !nativeFs) { hard(); quiet(P.play()); } show(); });
    L.addEventListener('canplay', function () { root.classList.remove('mfp-wait'); });
    L.addEventListener('pause', function () { if (!nativeFs && want && !L.ended) { want = false; if (P) P.pause(); show(); } });
    L.addEventListener('ended', function () { want = false; if (P) { P.pause(); try { P.currentTime = L.currentTime; } catch (e) {} } show(); });
    L.addEventListener('timeupdate', function () { if (!dragging) paint(L.currentTime); });
    L.addEventListener('progress', paintBuf);
    L.addEventListener('loadedmetadata', function () { var d = D(); if (d) { dur.textContent = fmt(d); prog.setAttribute('aria-valuemax', Math.floor(d)); } paintBuf(); });
    L.addEventListener('volumechange', show);

    /* the progress bar: click or drag to move, hover shows the time */
    function tAt(x) { var r = prog.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)) * D(); }
    prog.addEventListener('pointermove', function (e) {
      var r = prog.getBoundingClientRect(), t = tAt(e.clientX), f = D() ? t / D() : 0;
      hov.style.width = (f * 100) + '%';
      tip.textContent = fmt(t);
      tip.style.left = Math.max(24, Math.min(r.width - 24, e.clientX - r.left)) + 'px';
      if (dragging) seekTo(t);
      wake();
    });
    prog.addEventListener('pointerdown', function (e) {
      e.stopPropagation(); if (e.button) return;
      dragging = true; prog.classList.add('drag');
      try { prog.setPointerCapture(e.pointerId); } catch (er) {}
      var r = prog.getBoundingClientRect(); tip.style.left = Math.max(24, Math.min(r.width - 24, e.clientX - r.left)) + 'px'; tip.textContent = fmt(tAt(e.clientX));
      seekTo(tAt(e.clientX)); wake();
    });
    function endDrag() { if (!dragging) return; dragging = false; prog.classList.remove('drag'); hard(); wake(); }
    prog.addEventListener('pointerup', endDrag); prog.addEventListener('pointercancel', endDrag); prog.addEventListener('lostpointercapture', endDrag);
    prog.addEventListener('click', function (e) { e.stopPropagation(); });
    ctl.addEventListener('click', function (e) { e.stopPropagation(); wake(); });

    /* buttons */
    big.addEventListener('click', function (e) { e.stopPropagation(); if (touch && want) toggle(false); else play(); });
    pp.addEventListener('click', function (e) { e.stopPropagation(); toggle(false); });
    mute.addEventListener('click', function (e) { e.stopPropagation(); if (L.muted || L.volume === 0) { L.muted = false; if (L.volume === 0) L.volume = 0.5; } else L.muted = true; show(); wake(); });
    vs.addEventListener('input', function (e) { e.stopPropagation(); setVol(+vs.value); wake(); });
    if (ccb) ccb.addEventListener('click', function (e) {
      e.stopPropagation(); var t = L.textTracks && L.textTracks[0]; if (!t) return;
      var on = t.mode !== 'showing'; t.mode = on ? 'showing' : 'hidden'; ccb.classList.toggle('on', on); ccb.setAttribute('aria-pressed', on ? 'true' : 'false'); wake();
    });

    function iphoneFs() { /* the iPhone's own player: the wide cut, which has the sound */
      if (!L.webkitEnterFullscreen) return;
      nativeFs = true; if (P) P.pause();
      try { L.webkitEnterFullscreen(); } catch (e) { nativeFs = false; }
    }
    L.addEventListener('webkitendfullscreen', function () { nativeFs = false; want = !L.paused; hard(); if (want && P) quiet(P.play()); show(); });
    function fullscreen() {
      if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (root.requestFullscreen) quiet(root.requestFullscreen({ navigationUI: 'hide' })).catch(iphoneFs);
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else iphoneFs();
    }
    fsb.addEventListener('click', function (e) { e.stopPropagation(); fullscreen(); wake(); });

    /* the picture: a click plays or pauses (a double click is full screen); on a phone a tap shows the controls first */
    var lastTap = 0, tapT = 0;
    root.addEventListener('click', function (e) {
      if (e.target.closest('.mfp-ctl') || e.target.closest('.mfp-big')) return;
      if (!touch) { toggle(true); return; }
      if (!want) { play(); return; }
      /* a phone: a double tap on either side skips 10 seconds, like YouTube */
      var now = Date.now(), r = root.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
      if (now - lastTap < 320 && (x < 0.35 || x > 0.65)) { clearTimeout(tapT); lastTap = 0; skip(x < 0.5 ? -10 : 10); return; }
      lastTap = now;
      clearTimeout(tapT);
      tapT = setTimeout(function () { if (root.classList.contains('mfp-hide')) wake(); else { root.classList.add('mfp-hide'); clearTimeout(idleT); } }, 240);
    });
    root.addEventListener('dblclick', function (e) { if (touch || e.target.closest('.mfp-ctl')) return; fullscreen(); });
    root.addEventListener('mousemove', function () { if (!touch) wake(); });
    root.addEventListener('mouseleave', function () { if (want && !dragging) { clearTimeout(idleT); idleT = setTimeout(function () { if (want) root.classList.add('mfp-hide'); }, 600); } });

    /* keys, like YouTube */
    function key(e) {
      if (dead || e.ctrlKey || e.metaKey || e.altKey) return false;
      var t = e.target, tag = t && t.tagName, k = e.key;
      if (tag === 'INPUT' && t !== vs) return false;
      if (t === vs && /^Arrow/.test(k)) return false;
      if (k === ' ' || k === 'k' || k === 'K') { if (tag === 'BUTTON' && k === ' ') return false; toggle(true); }
      else if (k === 'j' || k === 'J') skip(-10);
      else if (k === 'l' || k === 'L') skip(10);
      else if (k === 'ArrowLeft') skip(-5);
      else if (k === 'ArrowRight') skip(5);
      else if (k === 'ArrowUp') setVol((L.muted ? 0 : L.volume) + 0.05);
      else if (k === 'ArrowDown') setVol((L.muted ? 0 : L.volume) - 0.05);
      else if (k === 'm' || k === 'M') mute.click();
      else if (k === 'f' || k === 'F') fullscreen();
      else if ((k === 'c' || k === 'C') && ccb) ccb.click();
      else if (k === 'Home') seekTo(0);
      else if (k === 'End') seekTo(D());
      else if (/^[0-9]$/.test(k)) seekTo(D() * (+k) / 10);
      else return false;
      e.preventDefault(); wake(); return true;
    }
    root.addEventListener('keydown', function (e) { if (key(e)) e.stopPropagation(); });

    /* turning the phone: the picture changes, the sound carries on */
    function turned() {
      if (dead) return;
      var was = root.getAttribute('data-o'); orient(); show();
      if (root.getAttribute('data-o') !== was) { hard(); if (want && P && P.paused && !nativeFs) quiet(P.play()); wake(); }
    }
    var mql = null;
    try { mql = window.matchMedia('(orientation: portrait)'); mql.addEventListener('change', turned); } catch (e) { try { mql.addListener(turned); } catch (e2) {} }
    window.addEventListener('resize', turned);
    document.addEventListener('fullscreenchange', turned);
    document.addEventListener('webkitfullscreenchange', turned);

    show();
    return {
      root: root, video: L, play: play, pause: function () { if (want) pause(); }, key: key, fsEl: fsEl,
      destroy: function () {
        dead = true; want = false; timers.forEach(clearInterval); clearTimeout(idleT); clearTimeout(tapT);
        [L, P].forEach(function (v) { if (!v) return; try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} });
        window.removeEventListener('resize', turned);
        document.removeEventListener('fullscreenchange', turned); document.removeEventListener('webkitfullscreenchange', turned);
        try { mql.removeEventListener('change', turned); } catch (e) {}
      }
    };
  }

  /* ---------- the popup ---------- */
  var box = null;
  function topMF() { /* the highest window of this site, so the popup covers the whole Desktop */
    var w = window;
    try { while (w.parent && w.parent !== w && w.parent.location.origin === location.origin) w = w.parent; } catch (e) {}
    try { return w !== window && w.MFReel && w.MFReel.open ? w.MFReel : null; } catch (e) { return null; }
  }
  function open(o) {
    o = o || {};
    var up = !o.here && topMF();
    if (up) { up.open(o); return null; }
    if (box) return box;
    addCss();
    var phone = touchDevice() && Math.min(screen.width, screen.height) < 820;
    var back = document.activeElement;
    var el = document.createElement('div');
    el.className = 'mfl' + (phone ? ' mfl-phone' : '');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', name());
    el.innerHTML = '<div class="mfl-stage"></div><button class="mfl-x" type="button" aria-label="Close (Esc)">' + IC.close + '</button>';
    document.body.appendChild(el);
    document.documentElement.classList.add('mfl-lock');
    var p = player(el.querySelector('.mfl-stage'), { fill: phone });
    function close() {
      if (!box) return;
      if (p.fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} }
      p.destroy(); document.removeEventListener('keydown', onKey, true);
      el.classList.remove('on'); box = null;
      document.documentElement.classList.remove('mfl-lock');
      setTimeout(function () { el.remove(); }, 200);
      if (o.onClose) o.onClose();
      else if (back && back.focus) { try { back.focus({ preventScroll: true }); } catch (e) {} }
    }
    function onKey(e) {
      if (e.key === 'Escape') { if (!p.fsEl()) { e.preventDefault(); e.stopPropagation(); close(); } return; }
      if (e.key === 'Tab') { /* keep focus inside the popup */
        var f = [].slice.call(el.querySelectorAll('button,[tabindex="0"],input')).filter(function (x) { return x.getClientRects().length; });
        if (!f.length) return;
        var i = f.indexOf(document.activeElement);
        if (i < 0) { e.preventDefault(); f[0].focus(); }
        else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        return;
      }
      if (p.root.contains(e.target)) return; /* the player handles its own keys */
      if (p.key(e)) e.stopPropagation();
    }
    document.addEventListener('keydown', onKey, true);
    el.querySelector('.mfl-x').addEventListener('click', close);
    el.addEventListener('click', function (e) { if (e.target === el || e.target.classList.contains('mfl-stage')) close(); });
    box = { close: close, player: p, el: el };
    requestAnimationFrame(function () { el.classList.add('on'); });
    try { p.root.focus({ preventScroll: true }); } catch (e) {}
    /* a phone held upright: full screen with the tall cut, as before */
    if (phone && upright() && !o.noFs) { try { if (p.root.requestFullscreen) quiet(p.root.requestFullscreen({ navigationUI: 'hide' })); } catch (e) {} }
    if (o.autoplay !== false) p.play();
    return box;
  }
  function close() { if (box) box.close(); }

  /* a poster that opens the popup, for pages that show the video in place */
  function thumb(host, o) {
    addCss(); o = o || {};
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'mft'; b.setAttribute('data-reel', '1');
    b.setAttribute('aria-label', 'Play ' + name() + (R.length ? ', ' + R.length : ''));
    if (R.poster) b.style.backgroundImage = 'url("' + R.poster + '")';
    b.innerHTML = '<span class="mft-b">' + IC.play + '</span>' + (o.label === false ? '' : '<span class="mft-n">' + name() + (R.length ? '<i>' + R.length + '</i>' : '') + '</span>');
    host.innerHTML = ''; host.appendChild(b);
    return b;
  }

  /* any link to reel.html, or anything marked data-reel, opens the popup.
     This runs before the site's other link handlers, so it works the same on every page. */
  window.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target && e.target.closest && e.target.closest('a[href], [data-reel]');
    if (!t || t.closest('.mfl')) return;
    if (!t.hasAttribute('data-reel')) {
      var u; try { u = new URL(t.getAttribute('href'), location.href); } catch (er) { return; }
      if (u.origin !== location.origin || !/\/reel\.html$/.test(u.pathname)) return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    open();
  }, true);

  /* pages that showed the video in place now show its poster, which opens the popup */
  function mount(host, o) { if (!host || !R.src) return null; return thumb(host, o); }
  window.MFReel = { open: open, close: close, thumb: thumb, mount: mount, player: player };
})();
