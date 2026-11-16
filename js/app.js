/* Marcin Fracz personal site: a fake desktop that works like one.
   Vanilla JS, no dependencies. */
(function () {
  var C = window.SITE_CONTENT;
  if (!C) return;

  /* Phone detection: phone only, not tablet. 700px covers iPhone / Android
     portrait (360-430px). iPad at 768px+ keeps the desktop. */
  function isPhone() { return window.matchMedia('(max-width: 700px)').matches; }
  if (isPhone()) document.body.classList.add('is-phone');
  window.addEventListener('resize', function () {
    document.body.classList.toggle('is-phone', isPhone());
  });

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function on(id, ev, fn) { var n = el(id); if (n) n.addEventListener(ev, fn); }

  /* ================= content injection ================= */
  el("intro-name").textContent = C.intro.name;
  el("intro-title").textContent = C.intro.title;
  el("intro-headline").textContent = C.intro.headline;
  /* site photo: the default from content, or a pick saved in this browser by the photo picker */
  var PHOTO_KEY = "mf-site-photo-v1";
  var HEADSHOTS = C.headshots || [];
  function photoById(id) { return HEADSHOTS.filter(function (h) { return h.id === id; })[0]; }
  var pickedPhoto = null;
  try { if (/[?&]pick\b/.test(window.location.search)) pickedPhoto = photoById(localStorage.getItem(PHOTO_KEY) || ""); } catch (e) {} /* a pick only shows with ?pick; visitors always get the default photo */
  el("intro-photo").src = pickedPhoto ? pickedPhoto.avatar : C.intro.photo;
  el("intro-buttons").innerHTML = C.intro.buttons.map(function (b) {
    return '<button class="intro-link" data-open="' + esc(b.target) + '">' + esc(b.label) + "</button>";
  }).join('<span class="intro-dot" aria-hidden="true">·</span>');

  el("about-body").innerHTML =
    "<h2>" + esc(C.about.title) + "</h2>" +
    C.about.paragraphs.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
    (C.about.howIWork ? "<h3>How I work</h3><ul class=\"how\">" + C.about.howIWork.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul>" : "") +
    "<h3>Education</h3><ul class=\"edu\">" +
    C.work.education.map(function (e) {
      return "<li><b>" + esc(e.school) + "</b> <span>(" + esc(e.year) + ")</span></li>";
    }).join("") + "</ul>";

  el("work-note").textContent = C.work.note;
  /* ================= Work timeline: a visual map like the About Me slide ================= */
  var V = C.work.visual;
  var tlZoom = 1;
  var FLAG_URL = {};
  function flagImg(code) { return FLAG_URL[code] ? '<img src="' + FLAG_URL[code] + '" alt="">' : ""; }
  function renderTimeline() {
    var host = el("timeline");
    if (!V) {
      host.innerHTML = C.work.roles.map(function (r) {
        return '<div class="timeline-item"><div class="years">' + esc(r.years) + "</div><h4>" + esc(r.role) + "</h4>" +
          '<div class="employer">' + esc(r.company) + "</div><p>" + esc(r.detail) + "</p></div>";
      }).join("");
      return;
    }
    host.className = "timeline tlv";
    var k = tlZoom, pad = 18, gap = 34;
    var knots = [[V.engineering[0].from, pad]];
    V.engineering.forEach(function (e) { knots.push([e.to, knots[knots.length - 1][1] + e.w * k]); });
    var gmX0 = knots[knots.length - 1][1] + gap, gmY0 = V.engineering[V.engineering.length - 1].to, perYr = 116 * k;
    function X(y) {
      if (y >= gmY0) return gmX0 + (y - gmY0) * perYr;
      for (var i = 1; i < knots.length; i++) if (y <= knots[i][0]) {
        var a = knots[i - 1], b = knots[i]; return a[1] + (y - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
      }
      return knots[knots.length - 1][1];
    }
    var end = 2026.6, W = Math.round(X(end) + 40);
    var h = [];
    function blk(b, cls) {
      var x = X(b.from), w = Math.max(X(b.to) - x - 3, cls === "down" ? 172 : 40);
      return '<a class="tlv-b ' + cls + " f-" + b.focus + '" href="road.html#' + esc(b.road) + '" style="left:' + x.toFixed(1) + "px;width:" + w.toFixed(1) + 'px" title="' + esc(b.label + " · " + b.years) + '">' +
        (b.flag ? '<span class="tlv-flag">' + flagImg(b.flag) + "</span>" : "") +
        '<span class="tlv-k">' + esc(b.kicker) + '</span><span class="tlv-t">' + esc(b.label) + '</span><span class="tlv-y">' + esc(b.years) + "</span></a>";
    }
    h.push('<p class="tlv-zone up" style="left:' + gmX0 + 'px">Domestic experience</p>');
    h.push('<p class="tlv-zone down" style="left:' + gmX0 + 'px">International experience</p>');
    h.push('<p class="tlv-zone up eng" style="left:' + pad + 'px">Engineering, before GM</p>');
    V.engineering.forEach(function (b) { h.push(blk(b, "up")); });
    V.domestic.forEach(function (b) { h.push(blk(b, "up")); });
    V.assignments.forEach(function (b) { h.push(blk(b, "down")); });
    /* the axis: an arrow per segment and year ticks */
    h.push('<div class="tlv-axis" style="left:' + pad + "px;width:" + (knots[knots.length - 1][1] - pad) + 'px"></div>');
    h.push('<div class="tlv-axis gm" style="left:' + gmX0 + "px;width:" + (W - gmX0 - 14) + 'px"></div>');
    h.push('<span class="tlv-break" style="left:' + (gmX0 - gap / 2 - 6) + 'px">//</span>');
    var ticks = [2003, 2007, 2010, 2011, 2014];
    for (var y = 2015; y <= 2026; y++) ticks.push(y);
    ticks.forEach(function (t) { h.push('<span class="tlv-tick' + (t < gmY0 ? " e" : "") + '" style="left:' + X(t === 2010 ? 2010.4 : t === 2011 ? 2011.4 : t === 2014 ? 2014.4 : t).toFixed(1) + 'px">' + t + "</span>"); });
    V.degrees.forEach(function (d) {
      h.push('<a class="tlv-deg" href="road.html#' + esc(d.road) + '" style="left:' + X(d.at).toFixed(1) + 'px" title="' + esc(d.label + " · " + d.years) + '"><span class="tlv-cap" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 4 1 9l11 5 9-4.1V16h2V9z" fill="currentColor"/><path d="M6 12.6V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.4l-6 2.7z" fill="currentColor"/></svg></span>' +
        "<b>" + esc(d.label) + "</b><i>" + esc(d.years) + "</i></a>");
    });
    V.projects.forEach(function (p) {
      h.push('<a class="tlv-p" href="road.html#' + esc(p.road) + '" style="left:' + X(p.at).toFixed(1) + 'px" title="' + esc(p.label + " · " + p.sub) + '"><span class="tlv-flag sm">' + flagImg(p.flag) + "</span><b>" + esc(p.label) + "</b><i>" + esc(p.sub) + "</i></a>");
    });
    host.style.width = W + "px";
    host.innerHTML = h.join("") ;
    var lg = el("tlv-legend");
    if (!lg) {
      lg = document.createElement("div"); lg.id = "tlv-legend"; lg.className = "tlv-legend";
      lg.innerHTML = '<span class="tlv-lt">Focus areas</span>' + V.legend.map(function (l) { return '<span class="tlv-li f-' + l.focus + '">' + esc(l.label) + "</span>"; }).join("");
      host.parentNode.parentNode.insertBefore(lg, host.parentNode.nextSibling);
    }
  }
  renderTimeline();
  if (V) {
    /* round flag badges from the Road's own flag drawings */
    import("../road/marks.js").then(function (m) {
      ["US", "EC", "MX", "CA", "CN", "KR"].forEach(function (c) {
        var cv = document.createElement("canvas"); cv.width = 96; cv.height = 64;
        m.drawFlag(cv.getContext("2d"), c, 96, 64); FLAG_URL[c] = cv.toDataURL("image/png");
      });
      renderTimeline();
    }).catch(function () {});
    /* drag to scroll */
    var vp = document.querySelector("#window-work .timeline-viewport"), dragX = null, moved = 0, sl = 0;
    vp.addEventListener("pointerdown", function (e) { if (e.button !== 0) return; dragX = e.clientX; sl = vp.scrollLeft; moved = 0; });
    window.addEventListener("pointermove", function (e) { if (dragX === null) return; var d = e.clientX - dragX; moved = Math.max(moved, Math.abs(d)); if (moved > 4) { vp.classList.add("dragging"); vp.scrollLeft = sl - d; } });
    window.addEventListener("pointerup", function () { dragX = null; setTimeout(function () { vp.classList.remove("dragging"); }, 0); });
    vp.addEventListener("click", function (e) { if (moved > 4) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
  }

  /* tool icons: one small line glyph on a coloured app tile */
  var GLYPHS = {
    globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.6 2.5 13.4 0 16M12 4c-2.5 2.6-2.5 13.4 0 16"/>',
    link: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
    loop: '<path d="M5 12a7 7 0 0 1 12-5l2 2M19 12a7 7 0 0 1-12 5l-2-2"/><path d="M19 4v5h-5M5 20v-5h5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    bars: '<path d="M4 6h9M7 12h11M5 18h7"/>',
    compass: '<circle cx="12" cy="12" r="8"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    play: '<circle cx="12" cy="12" r="8"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    check: '<path d="M5 6h10M5 12h6M5 18h6"/><path d="M14 16l2.5 2.5L21 13"/>',
    timeline: '<path d="M3 12h18"/><circle cx="7" cy="12" r="2"/><circle cx="13" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M7 6v4M13 14v4M18 6v4"/>'
  };
  var KIT_COLOR = "#475569";
  function appIcon(glyph, color, size) {
    return '<span class="app-ico" style="--app:' + (color || KIT_COLOR) + (size ? ";--s:" + size + "px" : "") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (GLYPHS[glyph] || GLYPHS.grid) + "</svg></span>";
  }
  var TOOLS = C.tools || { systems: [], kit: [] };
  function hubHref(view) { return "work/brag-book.html#" + view; }
  el("projects-body").innerHTML =
    '<div class="proj-head"><h2>' + esc(C.projects.title) + '</h2><p class="muted">Four systems I built, each rebuilt on synthetic data so you can use it.</p></div>' +
    '<div class="app-grid">' + TOOLS.systems.map(function (t) {
      return '<a class="app-card" href="' + hubHref(t.id) + '">' + appIcon(t.glyph, t.color) +
        '<span class="app-txt"><b>' + esc(t.name) + '</b><small>' + esc(t.org) + " · " + esc(t.years) + "</small><span>" + esc(t.blurb) + '</span><em>Open the live rebuild →</em></span></a>';
    }).join("") + "</div>" +
    '<p class="notes-section">Everyday kit</p><div class="kit-row">' + TOOLS.kit.map(function (k) {
      return '<a class="kit-chip" href="' + hubHref(k.live ? "kit" : "more") + '" title="' + esc(k.blurb) + '">' + appIcon(k.glyph, null, 22) + "<span>" + esc(k.name) + (k.live ? ' <i class="live-dot">Live</i>' : "") + "</span></a>";
    }).join("") +
    (TOOLS.timeline ? '<a class="kit-chip" href="' + TOOLS.timeline.href + '" title="' + esc(TOOLS.timeline.blurb) + '">' + appIcon("timeline", "#0369a1", 22) + "<span>" + esc(TOOLS.timeline.name) + "</span></a>" : "") + "</div>" +
    '<p class="notes-section">Personal builds</p>' +
    C.projects.items.map(function (p) {
      return '<div class="project"><h4>' + esc(p.name) + "</h4><p>" + esc(p.detail) + "</p></div>";
    }).join("");

  el("clocks-title").textContent = C.widgets.clocksTitle;
  el("clocks-sub").textContent = C.widgets.clocksSub || "";

  el("note-motto-text").textContent = C.notes.motto;
  el("note-resume-text").innerHTML = '<a href="assets/resume.pdf">' + esc(C.notes.resumeNote) + "</a>";
  var email = el("note-email");
  email.textContent = "Email me";
  email.href = "mailto:" + C.notes.contact.email;
  var li = el("note-linkedin");
  if (C.notes.contact.linkedin.indexOf("http") === 0) {
    li.textContent = "LinkedIn";
    li.href = C.notes.contact.linkedin;
  } else {
    li.textContent = C.notes.contact.linkedin;
    li.removeAttribute("href");
  }
  el("contact-email-link").href = "mailto:" + C.notes.contact.email;

  /* ================= clocks ================= */
  function dialSvg(i) {
    var ticks = "";
    for (var t = 0; t < 12; t++) {
      var a = t * 30 * Math.PI / 180;
      var x1 = 32 + Math.sin(a) * 27, y1 = 32 - Math.cos(a) * 27;
      var x2 = 32 + Math.sin(a) * 30, y2 = 32 - Math.cos(a) * 30;
      var w = t % 3 === 0 ? 2 : 1;
      ticks += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="#78716c" stroke-width="' + w + '"/>';
    }
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="30" fill="#fff" stroke="#d6d3d1"/>' + ticks +
      '<line id="clock-h-' + i + '" x1="32" y1="32" x2="32" y2="16" stroke="#1c1917" stroke-width="3" stroke-linecap="round"/>' +
      '<line id="clock-m-' + i + '" x1="32" y1="32" x2="32" y2="10" stroke="#1c1917" stroke-width="2" stroke-linecap="round"/>' +
      '<line id="clock-s-' + i + '" x1="32" y1="34" x2="32" y2="9" stroke="#dc2626" stroke-width="1" stroke-linecap="round"/>' +
      '<circle cx="32" cy="32" r="2.4" fill="#1c1917"/></svg>';
  }
  el("clocks").innerHTML = C.widgets.clocks.map(function (c, i) {
    return '<div class="clock-cell">' + dialSvg(i) +
      '<div class="clock-city">' + esc(c.label) + "</div>" +
      '<div class="clock-time" id="clock-time-' + i + '"></div>' +
      '<div class="clock-day" id="clock-date-' + i + '"></div></div>';
  }).join("");

  var timeFmt = {}, dateFmt = {}, partsFmt = {};
  C.widgets.clocks.forEach(function (c) {
    timeFmt[c.timeZone] = new Intl.DateTimeFormat("en-US", { timeZone: c.timeZone, hour: "numeric", minute: "2-digit" });
    dateFmt[c.timeZone] = new Intl.DateTimeFormat("en-US", { timeZone: c.timeZone, weekday: "short", month: "short", day: "numeric" });
    partsFmt[c.timeZone] = new Intl.DateTimeFormat("en-US", { timeZone: c.timeZone, hour: "numeric", minute: "numeric", second: "numeric", hour12: false });
  });
  var topDateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit", weekday: "short", month: "short", day: "numeric"
  });
  var topTimeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit", hour: "numeric", minute: "2-digit"
  });
  function tickClocks() {
    var now = new Date();
    C.widgets.clocks.forEach(function (c, i) {
      var t = el("clock-time-" + i), d = el("clock-date-" + i);
      if (t) t.textContent = timeFmt[c.timeZone].format(now);
      if (d) d.textContent = dateFmt[c.timeZone].format(now);
      var parts = {};
      partsFmt[c.timeZone].formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
      var h = (+parts.hour) % 12, m = +parts.minute, s = +parts.second;
      var hh = el("clock-h-" + i), mm = el("clock-m-" + i), ss = el("clock-s-" + i);
      if (hh) hh.setAttribute("transform", "rotate(" + ((h + m / 60) * 30) + " 32 32)");
      if (mm) mm.setAttribute("transform", "rotate(" + ((m + s / 60) * 6) + " 32 32)");
      if (ss) ss.setAttribute("transform", "rotate(" + (s * 6) + " 32 32)");
    });
    var top = el("topbar-clock");
    if (top) top.textContent = topDateFmt.format(now) + " · " + topTimeFmt.format(now);
  }
  tickClocks();
  setInterval(tickClocks, 1000);

  /* ================= timeline zoom ================= */
  var zoom = 1;
  var timeline = el("timeline");
  function applyZoom() {
    if (V) {
      /* re-lay the timeline at the new scale, keeping the same year in the middle */
      var vp = timeline.parentNode, mid = (vp.scrollLeft + vp.clientWidth / 2) / (timeline.offsetWidth || 1);
      tlZoom = zoom; renderTimeline();
      vp.scrollLeft = mid * timeline.offsetWidth - vp.clientWidth / 2;
    } else timeline.style.transform = "scale(" + zoom + ")";
  }
  on("zoom-in", "click", function () { zoom = Math.min(zoom + 0.15, 1.6); applyZoom(); });
  on("zoom-out", "click", function () { zoom = Math.max(zoom - 0.15, 0.6); applyZoom(); });

  /* ================= z-order / bring to front ================= */
  var zDesk = 20, zOver = 70;
  function bringToFront(node) {
    if (node.classList.contains("overlay-window")) node.style.zIndex = ++zOver;
    else node.style.zIndex = ++zDesk;
  }

  /* ================= window manager ================= */
  var APP_WINDOWS = [
    { id: "about", label: "About" },
    { id: "work", label: "Work" },
    { id: "projects", label: "Projects" },
    { id: "finder", label: "Finder" },
    { id: "notes-win", label: "Notes" },
    { id: "terminal", label: "Terminal" },
    { id: "contact-win", label: "Contact" },
    { id: "browser", label: "Browser" },
    { id: "wallpaper", label: "Wallpaper Settings" },
    { id: "widgets", label: "Widget Settings" },
    { id: "photos", label: "Choose photo" }
  ];
  function findWindow(name) {
    return el("window-" + name) || el("widget-" + name);
  }
  function isOpen(win) {
    return win && !win.classList.contains("hidden-window") && !win.classList.contains("minimised");
  }
  function openWindow(name) {
    if (name === "work") { openToolPage("work/timeline.html", "Work"); return; }
    /* v43: About is a page in the browser window, like Start and the Timeline */
    if (name === "about") { openToolPage("about.html", "About"); return; }
    if (name === "contact-note") {
      var note = el("note-contact");
      if (note) { bringToFront(note); }
      return;
    }
    var win = findWindow(name);
    if (!win) return;
    win.classList.remove("hidden-window", "minimised");
    if (name === "browser" && isPhone()) { window.location.href = BROWSER_HOME; return; }
    if (name === "browser") win.classList.add("maximised"); /* the browser opens fullscreen, so the showcase fills the screen */
    win.style.display = "";
    var dockBtn = document.querySelector('[data-dock="' + name + '"]');
    if (dockBtn) dockBtn.classList.remove("has-min");
    bringToFront(win);
    if (name === "terminal") setTimeout(function () { el("terminal-input").focus(); }, 50);
    if (name === "browser") browserInit();
  }
  function closeWindow(name) {
    var win = findWindow(name);
    if (win) { win.classList.add("hidden-window"); win.classList.remove("minimised"); win.style.display = ""; }
    var dockBtn = document.querySelector('[data-dock="' + name + '"]');
    if (dockBtn) dockBtn.classList.remove("has-min");
  }
  function minimiseWindow(name) {
    var win = findWindow(name);
    if (!win) return;
    win.classList.add("minimised");
    win.style.display = "none";
    var dockBtn = document.querySelector('[data-dock="' + name + '"]');
    if (dockBtn) dockBtn.classList.add("has-min");
  }
  function restoreWindow(name) {
    var win = findWindow(name);
    if (!win) return;
    win.classList.remove("minimised");
    win.style.display = "";
    var dockBtn = document.querySelector('[data-dock="' + name + '"]');
    if (dockBtn) dockBtn.classList.remove("has-min");
    bringToFront(win);
  }
  function frontWindow() {
    var best = null, bestZ = -1;
    APP_WINDOWS.forEach(function (w) {
      var win = findWindow(w.id);
      if (isOpen(win)) {
        var z = parseInt(win.style.zIndex || "0", 10);
        if (z > bestZ) { bestZ = z; best = w.id; }
      }
    });
    return best;
  }
  function closeAllWindows() {
    APP_WINDOWS.forEach(function (w) { closeWindow(w.id); });
    closePalette();
    closeWidgetPanel();
  }
  function showDesktop() {
    APP_WINDOWS.forEach(function (w) {
      var win = findWindow(w.id);
      if (isOpen(win)) minimiseWindow(w.id);
    });
    closePalette();
    closeWidgetPanel();
  }

  /* traffic-light dots */
  document.addEventListener("click", function (e) {
    var dot = e.target.closest(".dot[data-act]");
    if (!dot) return;
    e.stopPropagation();
    var win = dot.closest(".window, .widget");
    if (!win) return;
    var name = win.getAttribute("data-window");
    var act = dot.getAttribute("data-act");
    if (act === "close") closeWindow(name);
    else if (act === "min") minimiseWindow(name);
    else if (act === "max") win.classList.toggle("maximised");
  });

  /* open/close clicks */
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-close-win]")) return;
    var opener = e.target.closest("[data-open]");
    if (opener) {
      closeMenus();
      var name = opener.getAttribute("data-open");
      var win = findWindow(name);
      if (win && win.classList.contains("minimised")) restoreWindow(name);
      else if (win && !win.classList.contains("hidden-window")) bringToFront(win);
      else openWindow(name);
      return;
    }
    var href = e.target.closest("[data-href]");
    if (href) {
      var url = href.getAttribute("data-href");
      if (href.getAttribute("data-newtab")) window.open(url, "_blank", "noopener");
      else goPage(url);
    }
  });
  /* click anywhere on a window/widget/note brings it to front */
  document.addEventListener("pointerdown", function (e) {
    var node = e.target.closest(".window, .widget, .note");
    if (node) bringToFront(node);
  }, true);

  /* ================= dragging: transform while moving, commit on release ================= */
  /* v8: a moved window only stays moved for this visit (sessionStorage).
     Every new visit starts from the same computed layout, and spots saved
     by earlier versions are removed. */
  var POS_KEY = "mf-pos-v8";
  try { ["mf-pos-v5", "mf-pos-v6", "mf-pos-v7", "mf-pos"].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  var positions = {};
  try { positions = JSON.parse(sessionStorage.getItem(POS_KEY) || "{}"); } catch (e) {}
  function savePositions() { try { sessionStorage.setItem(POS_KEY, JSON.stringify(positions)); } catch (e) {} }
  /* pinning by left/top must also clear the CSS bottom/right anchors,
     or a note anchored to the bottom stretches down to the screen edge */
  function pinAt(node, left, top) { node.style.left = left + "px"; node.style.top = top + "px"; node.style.bottom = "auto"; node.style.right = "auto"; }
  function restorePositions() {
    if (isPhone()) return; /* phone is stacked, saved desktop positions would strand windows */
    var vw = window.innerWidth, vh = window.innerHeight;
    Object.keys(positions).forEach(function (id) {
      var node = document.getElementById(id);
      var pos = positions[id];
      if (!node || !pos || typeof pos.left !== "number") return;
      /* a spot saved on a different screen size would land on top of the default layout here */
      if (!pos.vw || Math.abs(pos.vw - vw) > 80 || Math.abs(pos.vh - vh) > 80) { delete positions[id]; return; }
      /* clamp stale saved positions into the viewport so a bad save can never strand a window off-screen */
      var left = Math.max(0, Math.min(pos.left, vw - 120));
      var top = Math.max(40, Math.min(pos.top, vh - 80));
      positions[id] = { left: left, top: top, vw: pos.vw, vh: pos.vh };
      pinAt(node, left, top);
      /* only overlay windows need their centring transform cleared;
         notes keep their CSS tilt, desktop windows have none */
      if (node.classList.contains("overlay-window")) node.style.transform = "none";
    });
    savePositions();
  }
  restorePositions();

  var drag = null;
  var unmaxTime = 0; /* when a drag last dropped a window out of fullscreen, so a double-click that caused it does not put it straight back */
  function endDrag() {
    if (!drag) return;
    var node = drag.node;
    var vw = window.innerWidth, vh = window.innerHeight;
    var left = Math.max(0, Math.min(parseFloat(node.style.left) + drag.dx, vw - 120));
    var top = Math.max(40, Math.min(parseFloat(node.style.top) + drag.dy, vh - 80));
    node.style.left = left + "px";
    node.style.top = top + "px";
    /* overlay windows are centred in CSS with translate(-50%,-50%); clearing the
       inline transform here would snap the window up-left by half its size on
       every drop. Keep "none" for them; other elements (notes) get their CSS
       tilt back by clearing it. */
    node.style.transform = node.classList.contains("overlay-window") ? "none" : "";
    node.classList.remove("dragging");
    document.body.classList.remove("is-dragging");
    positions[drag.id] = { left: left, top: top, vw: vw, vh: vh };
    savePositions();
    drag = null;
  }

  /* ================= resize windows + widgets ================= */
  var resize = null;
  document.querySelectorAll(".overlay-window, .widget").forEach(function (w) {
    var h = document.createElement("span");
    h.className = "resize-handle";
    h.setAttribute("data-resize", "");
    w.appendChild(h);
  });
  document.addEventListener("pointerdown", function (e) {
    if (window.innerWidth <= 1100) return;
    var h = e.target.closest("[data-resize]");
    if (!h) return;
    var win = h.closest(".overlay-window, .widget");
    if (!win) return;
    if (win.classList.contains("maximised")) win.classList.remove("maximised");
    var rect = win.getBoundingClientRect();
    resize = { node: win, startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height, customW: 0 };
    document.body.classList.add("is-resizing");
    bringToFront(win);
    e.preventDefault();
  });
  document.addEventListener("pointermove", function (e) {
    if (!resize) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var isWidget = resize.node.classList.contains("widget");
    var minW = isWidget ? 260 : 340;
    var w = Math.max(minW, Math.min(resize.startW + (e.clientX - resize.startX), vw - 24));
    resize.node.style.width = w + "px";
    if (isWidget) { resize.customW = w; return; }
    var hgt = Math.max(260, Math.min(resize.startH + (e.clientY - resize.startY), vh - 48));
    resize.node.style.height = hgt + "px";
  });
  function endResize() {
    if (!resize) return;
    document.body.classList.remove("is-resizing");
    if (resize.node.classList.contains("widget") && resize.customW) {
      var key = resize.node.id.replace("widget-", "");
      if (prefs.widgets[key]) {
        prefs.widgets[key].size = "custom";
        prefs.widgets[key].customWidth = resize.customW;
        savePrefs();
        renderWidgetPanel();
      }
    }
    resize = null;
  }
  document.addEventListener("pointerup", endResize);
  document.addEventListener("pointercancel", endResize);
  document.addEventListener("pointerdown", function (e) {
    if (window.innerWidth <= 1100) return;
    var handle = e.target.closest("[data-drag]");
    var note = e.target.closest(".note[data-draggable]");
    var target = null;
    if (handle) target = handle.closest(".window, .widget");
    else if (note) {
      if (e.target.closest("a")) return;
      target = note;
    }
    if (!target) return;
    if (e.target.closest("button, a, input, select, textarea, .dot[data-act]")) return;
    var id = target.id;
    if (!id) return;
    if (target.classList.contains("maximised")) { target.classList.remove("maximised"); unmaxTime = Date.now(); } /* dragging a fullscreen window drops it back to normal size first */
    var rect = target.getBoundingClientRect();
    var parentRect = { left: 0, top: 0 };
    if (!target.classList.contains("overlay-window")) {
      parentRect = el("desktop").getBoundingClientRect();
    }
    /* pin current position in px, clear any centring transform */
    pinAt(target, rect.left - parentRect.left, rect.top - parentRect.top);
    target.style.transform = "none";
    bringToFront(target);
    target.classList.add("dragging");
    drag = { node: target, id: id, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
    document.body.classList.add("is-dragging");
    var cap = handle || note;
    if (cap && cap.setPointerCapture) { try { cap.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  document.addEventListener("pointermove", function (e) {
    if (!drag) return;
    if (e.pointerType === "mouse" && e.buttons === 0) { endDrag(); return; } /* release happened outside the page; stop following the mouse */
    var vw = window.innerWidth, vh = window.innerHeight;
    var startLeft = parseFloat(drag.node.style.left) || 0;
    var startTop = parseFloat(drag.node.style.top) || 0;
    var dx = Math.max(-startLeft, Math.min(e.clientX - drag.startX, vw - 120 - startLeft));
    var dy = Math.max(40 - startTop, Math.min(e.clientY - drag.startY, vh - 80 - startTop));
    drag.dx = dx;
    drag.dy = dy;
    drag.node.style.transform = "translate(" + dx + "px," + dy + "px)";
  });
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  /* double-click a window's title bar to go fullscreen (and back) */
  document.addEventListener("dblclick", function (e) {
    var handle = e.target.closest("[data-drag]");
    if (!handle) return;
    if (e.target.closest("button, a, input, select, textarea, .dot[data-act]")) return;
    var win = handle.closest(".overlay-window");
    if (!win) return;
    if (Date.now() - unmaxTime < 600) return; /* this double-click already restored the window via the drag; do not put it back */
    win.classList.toggle("maximised");
  });

  /* ================= preferences ================= */
  var PREF_KEY = "mf-site-prefs-v6";
  var LAYERED_MIN = 1280; /* matches the v42 layered layout in styles.css */
  var prefs = {
    wallpaper: "shanghai-mist", mode: "framed", dark: false, wall: "auto", frame: "white", soften: 1, blur: false,
    widgets: { clocks: { on: true, size: "M" }, weather: { on: true, size: "S" }, career: { on: true, size: "M" }, building: { on: true, size: "M" } },
    welcome: true
  };
  try {
    var saved = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    if (saved.wallpaper) prefs.wallpaper = saved.wallpaper;
    if (saved.mode) prefs.mode = saved.mode;
    if (saved.wall) prefs.wall = saved.wall;
    else if (saved.wallColor) prefs.legacyWallColor = saved.wallColor; /* before v42 the colour was kept as a value */
    if (saved.frame) prefs.frame = saved.frame;
    if (typeof saved.soften === "number") prefs.soften = saved.soften;
    if (typeof saved.blur === "boolean") prefs.blur = saved.blur;
    if (typeof saved.dark === "boolean") prefs.dark = saved.dark;
    if (saved.widgets) {
      Object.keys(prefs.widgets).forEach(function (k) {
        if (saved.widgets[k]) {
          if (typeof saved.widgets[k].on === "boolean") prefs.widgets[k].on = saved.widgets[k].on;
          /* widget sizes only last for this visit; see SIZE_KEY */
        }
      });
    }
    if (typeof saved.welcome === "boolean") prefs.welcome = saved.welcome;
  } catch (e) {}
  /* a widget removed in v16 may still have a saved preference; drop it
     here instead of breaking the widget panel */
  delete prefs.widgets.news;
  var SIZE_KEY = "mf-sizes-v1"; /* widget sizes picked or dragged in this visit only */
  try {
    var ss = JSON.parse(sessionStorage.getItem(SIZE_KEY) || "{}");
    Object.keys(prefs.widgets).forEach(function (k) {
      if (ss[k] && ss[k].size) { prefs.widgets[k].size = ss[k].size; if (ss[k].customWidth) prefs.widgets[k].customWidth = ss[k].customWidth; }
    });
  } catch (e) {}
  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {}
    try {
      var ss = {}; Object.keys(prefs.widgets).forEach(function (k) { ss[k] = { size: prefs.widgets[k].size, customWidth: prefs.widgets[k].customWidth }; });
      sessionStorage.setItem(SIZE_KEY, JSON.stringify(ss));
    } catch (e) {}
  }

  /* ================= wallpaper ================= */
  /* ================= wallpaper ================= */
  /* v17: 4 categories x 5 items, defined in content.js (wallpaperSettings).
     All 15 images are AI-generated for this site (no people). Old packs
     (Wikimedia prints, cars, EUC photos, Great Wave) removed. */
  var WP_CATEGORIES = C.wallpaperSettings.categories.filter(function (c) { return c.items.some(function (it) { return it.type === "image"; }); });
  var WP_COLORS = C.wallpaperSettings.colors || [];
  /* v42: three ways to dress the wall. framed = the image hung on a wall colour,
     full = the image edge to edge, solid = a wall colour or gradient only. */
  var WP_MODES = [
    { id: "framed", name: "Image on color" },
    { id: "full", name: "Full image" },
    { id: "solid", name: "Color only" }
  ];
  function wpFind(id) {
    for (var i = 0; i < WP_CATEGORIES.length; i++) {
      var items = WP_CATEGORIES[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].id === id) return items[j];
    }
    return null;
  }
  function colorFind(id) {
    for (var i = 0; i < WP_COLORS.length; i++) {
      var items = WP_COLORS[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].id === id) return items[j];
    }
    return null;
  }
  function categoryOf(id) {
    for (var i = 0; i < WP_CATEGORIES.length; i++) {
      var items = WP_CATEGORIES[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].id === id) return WP_CATEGORIES[i].id;
    }
    return WP_CATEGORIES[0].id;
  }
  /* preferences saved before v42: a colour id in place of an image, or a colour value */
  (function migrateWallpaper() {
    if (!wpFind(prefs.wallpaper) && colorFind(prefs.wallpaper)) { prefs.wall = prefs.wallpaper; prefs.mode = "solid"; prefs.wallpaper = "shanghai-mist"; }
    if (prefs.legacyWallColor) {
      WP_COLORS.forEach(function (g) { g.items.forEach(function (c) { if (c.value && c.value.toLowerCase() === String(prefs.legacyWallColor).toLowerCase()) prefs.wall = c.id; }); });
      delete prefs.legacyWallColor;
    }
    if (["framed", "full", "solid"].indexOf(prefs.mode) < 0) prefs.mode = "framed";
    if (!colorFind(prefs.wall)) prefs.wall = "auto";
    if (["white", "black", "none"].indexOf(prefs.frame) < 0) prefs.frame = "white";
    if ([0, 1, 2].indexOf(prefs.soften) < 0) prefs.soften = 1;
  })();
  var currentCategory = categoryOf(prefs.wallpaper);
  function applyWallpaper() {
    var art = wpFind(prefs.wallpaper);
    if (!art) { prefs.wallpaper = "shanghai-mist"; art = wpFind(prefs.wallpaper); } /* e.g. a removed pack id */
    var col = colorFind(prefs.wall) || { id: "auto", value: "" };
    var b = document.body;
    WP_CATEGORIES.forEach(function (c) { c.items.forEach(function (it) { b.classList.remove("wp-" + it.id); }); });
    b.classList.remove("wp-solid", "wp-framed", "wp-full", "wp-frame-white", "wp-frame-black", "wp-frame-none", "wp-soften-0", "wp-soften-1", "wp-soften-2", "wp-blur");
    b.classList.add("wp-" + prefs.wallpaper, "wp-" + prefs.mode, "wp-frame-" + prefs.frame, "wp-soften-" + prefs.soften);
    if (prefs.blur && prefs.mode === "full") b.classList.add("wp-blur");
    var wallEl = document.querySelector(".wallpaper");
    if (wallEl) wallEl.style.background = prefs.mode === "full" ? "" : col.value; /* "" lets the theme colour show */
    var img = el("wallpaper-img");
    if (img && img.getAttribute("src") !== art.src) img.src = art.src;
    var framedImg = el("framed-art-img");
    if (framedImg && framedImg.getAttribute("src") !== art.src) { framedImg.src = art.src; framedImg.alt = art.name; }
    var cap = el("framed-art-caption");
    if (cap) cap.textContent = art.name;
    renderWallpaperPanel();
    savePrefs();
    if (typeof placeWeather === "function") setTimeout(placeWeather, 0);
  }
  function wpSeg(name, key, opts) {
    return '<div class="wps-row"><span class="wps-label">' + name + '</span><div class="wps-seg" role="radiogroup" aria-label="' + name + '">' +
      opts.map(function (o) {
        var on = String(prefs[key]) === String(o[0]);
        return '<button role="radio" aria-checked="' + on + '" class="' + (on ? "on" : "") + '" data-wp-set="' + key + '" data-wp-val="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + "</div></div>";
  }
  function renderWallpaperPanel() {
    var host = el("wp-panel");
    if (!host) return;
    var html = '<div class="wps-modes" role="radiogroup" aria-label="Wallpaper style">' + WP_MODES.map(function (m) {
      var on = m.id === prefs.mode;
      return '<button role="radio" aria-checked="' + on + '" class="wps-mode' + (on ? " on" : "") + '" data-wp-mode="' + m.id + '">' +
        '<span class="wps-mini wps-mini-' + m.id + '" aria-hidden="true"><i></i></span>' + esc(m.name) + "</button>";
    }).join("") + "</div>";
    if (prefs.mode !== "solid") {
      var cat = null;
      WP_CATEGORIES.forEach(function (c) { if (c.id === currentCategory) cat = c; });
      if (!cat) cat = WP_CATEGORIES[0];
      html += '<div class="wps-head"><span class="wps-title">Image</span><div class="wps-tabs">' + WP_CATEGORIES.map(function (c) {
        return '<button class="' + (c.id === cat.id ? "on" : "") + '" data-wp-category="' + c.id + '">' + esc(c.name) + "</button>";
      }).join("") + "</div></div>";
      html += '<div class="wps-images">' + cat.items.map(function (w) {
        var on = w.id === prefs.wallpaper;
        return '<button class="wps-img' + (on ? " on" : "") + '" data-wp="' + w.id + '" aria-pressed="' + on + '" title="' + esc(w.name) + '">' +
          '<span class="wps-thumb" style="background-image:url(\'' + esc(w.src) + '\')"></span><span class="wps-name">' + esc(w.name) + "</span></button>";
      }).join("") + "</div>";
    }
    if (prefs.mode !== "full") {
      html += '<div class="wps-head"><span class="wps-title">' + (prefs.mode === "solid" ? "Color" : "Wall color") + "</span></div>";
      html += WP_COLORS.map(function (g) {
        return '<div class="wps-group"><span class="wps-glabel">' + esc(g.group) + '</span><div class="wps-swatches">' + g.items.map(function (c) {
          var on = c.id === prefs.wall;
          var bg = c.id === "auto" ? "" : ' style="background:' + c.value + '"';
          return '<button class="wps-sw' + (c.id === "auto" ? " auto" : "") + (on ? " on" : "") + '"' + bg + ' data-wp-color="' + c.id + '" aria-pressed="' + on + '" title="' + esc(c.name) + '" aria-label="' + esc(c.name) + '"></button>';
        }).join("") + "</div></div>";
      }).join("");
      var cur = colorFind(prefs.wall);
      html += '<p class="wps-current">' + esc(cur ? cur.name : "") + "</p>";
    }
    if (prefs.mode === "framed") html += '<div class="wps-opts">' + wpSeg("Frame", "frame", [["white", "White"], ["black", "Black"], ["none", "None"]]) + "</div>";
    if (prefs.mode === "full") html += '<div class="wps-opts">' + wpSeg("Soften", "soften", [[0, "Off"], [1, "Light"], [2, "Strong"]]) + wpSeg("Blur", "blur", [[false, "Off"], [true, "On"]]) + "</div>";
    host.innerHTML = html;
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest("#window-wallpaper")) return;
    var pk = e.target.closest("[data-wp-category]");
    if (pk) { currentCategory = pk.getAttribute("data-wp-category"); renderWallpaperPanel(); return; }
    var wp = e.target.closest("[data-wp]");
    if (wp) { prefs.wallpaper = wp.getAttribute("data-wp"); applyWallpaper(); return; }
    var cb = e.target.closest("[data-wp-color]");
    if (cb) { prefs.wall = cb.getAttribute("data-wp-color"); applyWallpaper(); return; }
    var mode = e.target.closest("[data-wp-mode]");
    if (mode) { prefs.mode = mode.getAttribute("data-wp-mode"); currentCategory = categoryOf(prefs.wallpaper); applyWallpaper(); return; }
    var st = e.target.closest("[data-wp-set]");
    if (st) {
      var k = st.getAttribute("data-wp-set"), v = st.getAttribute("data-wp-val");
      prefs[k] = k === "soften" ? +v : k === "blur" ? v === "true" : v;
      applyWallpaper();
    }
  });

  /* ================= theme ================= */
  function applyTheme() {
    document.body.classList.toggle("dark", prefs.dark);
    el("check-light").textContent = prefs.dark ? "" : "✓";
    el("check-dark").textContent = prefs.dark ? "✓" : "";
    savePrefs();
  }
  on("mb-theme-btn", "click", function () { prefs.dark = !prefs.dark; applyTheme(); });

  /* ================= widgets ================= */
  var WIDGET_SIZES = { clocks: { S: 300, M: 480, L: 680 }, weather: { S: 300, M: 300, L: 300 }, career: { S: 260, M: 300, L: 360 }, building: { S: 260, M: 300, L: 360 } };
  var SIZE_ORDER = ["S", "M", "L"];
  function applyWidgets() {
    Object.keys(prefs.widgets).forEach(function (key) {
      var w = el("widget-" + key);
      var p = prefs.widgets[key];
      if (!w) return;
      w.style.display = p.on ? "" : "none";
      if (isPhone()) { w.style.width = ""; return; }
      if (p.size === "custom" && p.customWidth) w.style.width = p.customWidth + "px";
      else if (WIDGET_SIZES[key] && WIDGET_SIZES[key][p.size]) w.style.width = WIDGET_SIZES[key][p.size] + "px";
    });
    renderWidgetPanel();
    savePrefs();
    placeWeather();
  }
  /* the weather window sits under the right-hand widgets instead of on top of them,
     unless the visitor has dragged it somewhere of their own */
  /* on short laptop screens the career widget is tall enough to reach the "Now building" widget; keep a gap */
  function stackRight() {
    var c = el("widget-career"), b = el("widget-building");
    if (!c || !b || positions["widget-building"]) return;
    b.style.top = ""; b.classList.remove("nofit");
    if (isPhone() || window.innerWidth <= 1100 || c.style.display === "none" || b.style.display === "none" || positions["widget-career"]) return;
    var cr = c.getBoundingClientRect(), br = b.getBoundingClientRect();
    if (br.top < cr.bottom + 14 && br.left < cr.right && br.right > cr.left) {
      var pr = (b.offsetParent || document.body).getBoundingClientRect();
      b.style.top = Math.round(cr.bottom + 14 - pr.top) + "px";
      /* no room under it on a very short screen: leave it out rather than cover something */
      if (cr.bottom + 14 + br.height > window.innerHeight - 12) b.classList.add("nofit");
    }
  }
  function placeWeather() {
    stackRight();
    var w = el("widget-weather");
    if (!w || w.style.display === "none") return;
    w.classList.remove("wx-mini", "nofit");
    /* v42: on wide screens the layered layout puts the weather in the right column by CSS;
       here it only shrinks, or steps out, if this screen is too short for it */
    if (!isPhone() && !positions["widget-weather"] && window.innerWidth >= LAYERED_MIN) {
      w.style.top = w.style.bottom = w.style.left = w.style.right = "";
      var clash = function () { var me = w.getBoundingClientRect(), mr = { l: me.left, t: me.top, r: me.right, b: me.bottom };
        return me.bottom > window.innerHeight - 8 || deskRects().some(function (o) { return o.id !== "widget-weather" && o.id !== "window-intro" && hits(mr, o); }); };
      if (!clash()) return;
      w.classList.add("wx-mini"); if (!clash()) return;
      w.classList.add("nofit"); return;
    }
    if (isPhone() || positions["widget-weather"] || window.innerWidth <= 1100) { if (!positions["widget-weather"]) w.style.top = w.style.bottom = w.style.left = w.style.right = ""; return; }
    var anchor = ["career", "building"].map(function (k) { var n = el("widget-" + k); return prefs.widgets[k].on && n && !n.classList.contains("nofit") ? n : null; }).filter(Boolean).pop();
    var parent = w.offsetParent || document.body, pr = parent.getBoundingClientRect(), vh = window.innerHeight;
    var art = document.querySelector(".framed-art");
    var slots = [{ top: anchor ? anchor.getBoundingClientRect().bottom - pr.top + 14 : vh * 0.07, left: "" }];
    if (art && art.offsetParent) {
      var ar = art.getBoundingClientRect();
      slots.push({ top: ar.bottom - pr.top + 14, left: Math.round(ar.left + (ar.width - w.offsetWidth) / 2 - pr.left) + "px" });
    }
    function tryAt(sl, mini) {
      w.classList.toggle("wx-mini", mini);
      w.style.left = sl.left; w.style.right = sl.left ? "auto" : "";
      w.style.bottom = "auto"; w.style.top = sl.top + "px";
      if (sl.top + pr.top + w.offsetHeight > vh - 12) return false;
      var me = w.getBoundingClientRect(), mr = { l: me.left, t: me.top, r: me.right, b: me.bottom };
      return !deskRects().some(function (o) { return o.id !== "widget-weather" && hits(mr, o); });
    }
    for (var i = 0; i < slots.length; i++) { if (tryAt(slots[i], false) || tryAt(slots[i], true)) return; }
    /* no free spot on this screen: leave the optional weather window out instead of stacking it on a widget */
    tryAt(slots[0], true);
    w.classList.add("nofit");
  }
  /* Nothing on the desktop may sit on top of anything else when the page loads or the screen changes size.
     A saved spot or a resized widget that would cover another item goes back to its default. */
  var DESK_IDS = ["window-intro", "widget-clocks", "widget-weather", "widget-career", "widget-building", "framed-art", "note-motto", "note-resume", "note-contact"];
  function deskRects() {
    return DESK_IDS.map(function (id) {
      var n = el(id); if (!n || n.offsetParent === null) return null;
      var cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden") return null;
      var r = n.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return null;
      return { id: id, node: n, l: r.left, t: r.top, r: r.right, b: r.bottom };
    }).filter(Boolean);
  }
  var DEFAULT_SIZE = { clocks: "M", weather: "S", career: "M", building: "M" };
  function resized(id) { var k = id.slice(7), p = prefs.widgets[k]; return id.indexOf("widget-") === 0 && p && p.size !== DEFAULT_SIZE[k]; }
  function hits(a, b) { return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 6 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 6; }
  function untangle() {
    if (isPhone() || window.innerWidth <= 1100) return;
    var changed = false;
    for (var pass = 0; pass < 8; pass++) {
      var rs = deskRects(), fix = null;
      for (var i = 0; i < rs.length && !fix; i++) for (var j = i + 1; j < rs.length && !fix; j++) {
        if (!hits(rs[i], rs[j])) continue;
        /* in the layered layout the welcome window floats over the desk on purpose */
        if (window.innerWidth >= LAYERED_MIN && (rs[i].id === "window-intro" || rs[j].id === "window-intro")) continue;
        /* move the one the visitor placed or resized; a clash in the default layout itself is left to the CSS */
        var a = rs[i], b = rs[j];
        fix = positions[b.id] ? b : positions[a.id] ? a : resized(b.id) ? b : resized(a.id) ? a : null;
      }
      if (!fix) break;
      changed = true;
      if (positions[fix.id]) { delete positions[fix.id]; fix.node.style.left = fix.node.style.top = fix.node.style.transform = ""; }
      else { var k = fix.id.slice(7); prefs.widgets[k].size = DEFAULT_SIZE[k]; delete prefs.widgets[k].customWidth; fix.node.style.width = WIDGET_SIZES[k][DEFAULT_SIZE[k]] + "px"; }
      placeWeather();
    }
    if (changed) { savePositions(); savePrefs(); }
  }
  var untangleT = null;
  window.addEventListener("resize", function () { placeWeather(); clearTimeout(untangleT); untangleT = setTimeout(untangle, 150); });
  window.addEventListener("load", function () { setTimeout(untangle, 60); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(untangle, 60); });
  function renderWidgetPanel() {
    var labels = {
      clocks: { name: "World Clock", sub: "Detroit, Shanghai, Mexico City" },
      weather: { name: "Weather", sub: "A window, not a dashboard" },
      career: { name: "Career odometer", sub: "20+ years, three countries" },
      building: { name: "Now building", sub: "Marcin Hub, the AI loop" }
    };
    var onCount = Object.keys(prefs.widgets).filter(function (k) { return prefs.widgets[k].on; }).length;
    el("widget-panel-count").textContent = onCount + (onCount === 1 ? " widget visible" : " widgets visible");
    el("widget-panel-list").innerHTML = Object.keys(prefs.widgets).map(function (key) {
      var p = prefs.widgets[key];
      var seg = SIZE_ORDER.map(function (s) {
        return '<button data-widget-size-set="' + key + ":" + s + '" class="' + (p.size === s ? "on" : "") + '">' + s + "</button>";
      }).join("");
      return '<div class="widget-panel-row">' +
        '<button class="wp-switch" role="switch" aria-checked="' + p.on + '" data-widget-toggle="' + key + '" aria-label="' + labels[key].name + '"><span></span></button>' +
        '<span class="wp-name">' + labels[key].name + '<span class="wp-sub">' + labels[key].sub + "</span></span>" +
        '<span class="wp-seg">' + seg + "</span></div>";
    }).join("");
  }
  /* A click handled inside the widget panel must not close it. applyWidgets()
     re-renders the panel list (innerHTML), which detaches the clicked element
     from the document — so the outside-click closer below would see the click
     as "outside" and shut the panel. This flag tells it the click was inside. */
  var panelClick = false;
  function markPanelClick() {
    panelClick = true;
    setTimeout(function () { panelClick = false; }, 0);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-widget-toggle]");
    if (t) {
      markPanelClick();
      var key = t.getAttribute("data-widget-toggle");
      if (!prefs.widgets[key]) return; /* removed widget with a stale saved preference */
      prefs.widgets[key].on = !prefs.widgets[key].on;
      applyWidgets();
      if (key === "weather" && prefs.widgets[key].on) loadWeather();
      return;
    }
    var ss = e.target.closest("[data-widget-size-set]");
    if (ss) {
      markPanelClick();
      var parts = ss.getAttribute("data-widget-size-set").split(":");
      if (!prefs.widgets[parts[0]]) return;
      prefs.widgets[parts[0]].size = parts[1];
      applyWidgets();
      return;
    }
    var sz = e.target.closest("[data-widget-size]");
    if (sz) {
      var key2 = sz.getAttribute("data-widget-size");
      var cur = SIZE_ORDER.indexOf(prefs.widgets[key2].size);
      prefs.widgets[key2].size = SIZE_ORDER[(cur + 1) % SIZE_ORDER.length];
      applyWidgets();
      return;
    }
    var hide = e.target.closest("[data-widget-hide]");
    if (hide && prefs.widgets[hide.getAttribute("data-widget-hide")]) {
      prefs.widgets[hide.getAttribute("data-widget-hide")].on = false;
      applyWidgets();
    }
  });
  function openWidgetPanel() {
    el("widget-panel").classList.remove("hidden-window");
    el("mb-widgets-btn").classList.add("active");
    renderWidgetPanel();
  }
  function closeWidgetPanel() {
    el("widget-panel").classList.add("hidden-window");
    el("mb-widgets-btn").classList.remove("active");
  }
  on("mb-widgets-btn", "click", function () {
    var p = el("widget-panel");
    if (p.classList.contains("hidden-window")) openWidgetPanel();
    else closeWidgetPanel();
  });

  /* weather: a Detroit "window" that always renders (sky for local time),
     with live temperature from Open-Meteo laid on top when the fetch works */
  var weatherLoaded = false, wxLive = null, wxTimer = null;
  var WX_COND = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Light showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm" };
  var WX_SKYLINE = '<svg class="wx-city" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60V44h14v-8h10v12h8V30h12v-6h4v6h10v30zM62 60V38h16V22h6v-8h4v8h6v38zM100 60V34h10v-6h8v6h6v26zM128 60V12h8V4h4v8h8v8h6v40zM160 60V30h18v30zM182 60V40h12V26h10v34zM208 60V18h6v-6h10v6h6v42zM234 60V36h14v-6h8v30zM260 60V42h12v-8h10v26zM286 60V46h14v14z"/></svg>';
  function detroitNow() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes(), label = "";
    try {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hour: "numeric", minute: "2-digit", hour12: false }).formatToParts(d);
      parts.forEach(function (p) { if (p.type === "hour") h = +p.value % 24; if (p.type === "minute") m = +p.value; });
      label = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hour: "numeric", minute: "2-digit" }).format(d);
    } catch (e) { label = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
    /* rough Detroit sunrise and sunset by month (hours, local clock) */
    var mo = d.getMonth(), rise = [8, 7.6, 7.8, 7.1, 6.3, 6, 6.2, 6.7, 7.2, 7.7, 7.4, 7.9][mo], set = [17.4, 18, 19.6, 20.2, 20.8, 21.2, 21.1, 20.6, 19.8, 18.9, 17.2, 17][mo];
    var t = h + m / 60, phase = "night";
    if (t >= rise - 0.6 && t < rise + 0.8) phase = "dawn";
    else if (t >= rise + 0.8 && t < set - 0.8) phase = "day";
    else if (t >= set - 0.8 && t < set + 0.7) phase = "dusk";
    var frac = phase === "day" || phase === "dawn" || phase === "dusk" ? Math.max(0, Math.min(1, (t - rise) / (set - rise))) : ((t < rise ? t + 24 : t) - set) / (24 - set + rise);
    return { label: label, phase: phase, frac: Math.max(0, Math.min(1, frac)) };
  }
  function renderWeather() {
    var body = el("weather-body"); if (!body) return;
    var n = detroitNow(), x = 8 + n.frac * 84, y = 62 - Math.sin(n.frac * Math.PI) * 46;
    var temp = wxLive ? wxLive.temp + "°" : "";
    var line = wxLive ? esc(wxLive.cond) : "Live forecast unavailable here";
    body.innerHTML =
      '<div class="wx-scene wx-' + n.phase + (wxLive && wxLive.wet ? " wx-wet" : "") + '"><span class="wx-orb ' + (n.phase === "night" ? "moon" : "sun") + '" style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + '%"></span>' + WX_SKYLINE +
      (temp ? '<span class="weather-temp">' + temp + '<small>F</small></span>' : "") + "</div>" +
      '<div class="wx-row"><span class="weather-cond">' + line + '</span><span class="wx-time">' + esc(n.label) + " in Detroit</span></div>" +
      (wxLive ? '<div class="weather-src">Data: Open-Meteo</div>' : "");
    placeWeather();
  }
  function loadWeather() {
    renderWeather();
    if (!wxTimer) wxTimer = setInterval(renderWeather, 60000);
    if (weatherLoaded) return;
    weatherLoaded = true;
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var wt = setTimeout(function () { if (ctl) ctl.abort(); }, 7000);
    fetch("https://api.open-meteo.com/v1/forecast?latitude=42.33&longitude=-83.05&current=temperature_2m,weather_code&temperature_unit=fahrenheit", ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { clearTimeout(wt); if (!r.ok) throw new Error("weather " + r.status); return r.json(); })
      .then(function (d) {
        var code = d.current && d.current.weather_code;
        var temp = d.current && Math.round(d.current.temperature_2m);
        if (typeof temp !== "number" || isNaN(temp)) throw new Error("weather data");
        wxLive = { temp: temp, cond: WX_COND[code] || "Detroit", wet: code >= 51 };
        renderWeather();
      })
      .catch(function () { clearTimeout(wt); weatherFail(); });
  }
  function weatherFail() {
    /* the window still shows sky and local time; try the forecast again next time it opens */
    weatherLoaded = false;
    renderWeather();
  }

  /* ================= photo picker (preview only) ================= */
  var pickerOn = false;
  try { pickerOn = /[?&]pick\b/.test(window.location.search); } catch (e) {}
  if (pickerOn && HEADSHOTS.length) {
    var ppBtn = el("photo-pick-btn");
    ppBtn.hidden = false;
    ppBtn.addEventListener("click", function () { renderPicker(); openWindow("photos"); });
  }
  function currentPhotoId() {
    var id = null; try { id = localStorage.getItem(PHOTO_KEY); } catch (e) {}
    return photoById(id || "") ? id : (HEADSHOTS.filter(function (h) { return h.isDefault; })[0] || HEADSHOTS[0]).id;
  }
  function showBig(h) {
    el("pp-big").src = h.portrait || h.avatar; el("pp-big").alt = h.label;
    el("pp-cap").textContent = h.label + (h.source ? " · " + h.source : "");
  }
  function renderPicker() {
    var cur = currentPhotoId();
    el("pp-grid").innerHTML = HEADSHOTS.map(function (h) {
      return '<button type="button" class="pp-item' + (h.id === cur ? " selected" : "") + '" data-photo="' + esc(h.id) + '" aria-pressed="' + (h.id === cur) + '">' +
        '<img src="' + esc(h.avatar) + '" alt="" loading="lazy"><span>' + esc(h.label) + "</span></button>";
    }).join("");
    showBig(photoById(cur));
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-photo]");
    if (!b) return;
    var h = photoById(b.getAttribute("data-photo"));
    if (!h) return;
    try { localStorage.setItem(PHOTO_KEY, h.id); } catch (err) {}
    el("intro-photo").src = h.avatar;
    document.querySelectorAll(".pp-item").forEach(function (n) {
      var on = n === b; n.classList.toggle("selected", on); n.setAttribute("aria-pressed", on);
    });
    showBig(h);
  });
  document.addEventListener("mouseover", function (e) {
    var b = e.target.closest && e.target.closest("[data-photo]");
    if (b) showBig(photoById(b.getAttribute("data-photo")));
  });

  /* ================= welcome ================= */
  function applyWelcome() {
    var win = el("window-intro");
    if (win) win.style.display = prefs.welcome ? "" : "none";
    el("check-welcome").textContent = prefs.welcome ? "✓" : "";
    savePrefs();
  }

  applyWallpaper();
  applyTheme();
  applyWidgets();
  applyWelcome();
  if (prefs.widgets.weather.on) loadWeather();

  /* ================= menus ================= */
  function closeMenus() {
    document.querySelectorAll(".menu.open").forEach(function (m) { m.classList.remove("open"); });
  }
  document.querySelectorAll(".menu-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var menu = btn.closest(".menu");
      var wasOpen = menu.classList.contains("open");
      closeMenus();
      if (wasOpen) return;
      if (btn.getAttribute("data-menu") === "window") buildWindowList();
      menu.classList.add("open");
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".menu")) closeMenus();
  });

  function buildWindowList() {
    var open = APP_WINDOWS.filter(function (w) { return isOpen(findWindow(w.id)); });
    var html = "";
    if (!open.length) {
      html = '<button class="disabled">No app windows open.</button>';
    } else {
      html = open.map(function (w) {
        return '<button data-open="' + w.id + '"><span><span class="win-dot">●</span> ' + esc(w.label) + '</span><span class="win-x" data-close-win="' + w.id + '">×</span></button>';
      }).join("");
    }
    el("window-list").innerHTML = html;
    el("close-front-btn").classList.toggle("disabled", !open.length);
    el("close-all-btn").classList.toggle("disabled", !open.length);
  }
  document.addEventListener("click", function (e) {
    var x = e.target.closest("[data-close-win]");
    if (x) { e.stopPropagation(); closeWindow(x.getAttribute("data-close-win")); buildWindowList(); }
  });

  /* menu actions */
  document.addEventListener("click", function (e) {
    var act = e.target.closest("[data-action]");
    if (!act) return;
    var a = act.getAttribute("data-action");
    closeMenus();
    if (a === "open-finder") openWindow("finder");
    else if (a === "open-about") openWindow("about");
    else if (a === "open-work") openWindow("work");
    else if (a === "open-projects") openWindow("projects");
    else if (a === "open-notes-win") openWindow("notes-win");
    else if (a === "open-terminal") openWindow("terminal");
    else if (a === "open-browser") openWindow("browser");
    else if (a === "open-work-showcase") goPage("road.html");
    else if (a === "open-brag") browserOpenTab(BRAG_URL, "Work & Tools");
    else if (a === "contact") openWindow("contact-win");
    else if (a === "search") openPalette();
    else if (a === "wallpaper-settings") openWindow("wallpaper");
    else if (a === "widget-settings") openWidgetPanel();
    else if (a === "toggle-welcome") { prefs.welcome = !prefs.welcome; applyWelcome(); }
    else if (a === "reset-welcome") {
      delete positions["window-intro"];
      savePositions();
      var n = el("window-intro");
      if (n) { n.style.left = ""; n.style.top = ""; n.style.transform = ""; }
    }
    else if (a === "reset-positions") {
      positions = {};
      savePositions();
      document.querySelectorAll("[data-draggable]").forEach(function (n) {
        n.style.left = ""; n.style.top = ""; n.style.transform = "";
      });
    }
    else if (a === "reset-notes") {
      ["note-motto", "note-resume", "note-contact"].forEach(function (id) {
        var n = el(id);
        if (n) { n.style.left = ""; n.style.top = ""; n.style.transform = ""; }
        delete positions[id];
      });
      savePositions();
    }
    else if (a === "reset-wallpaper") { prefs.wallpaper = "shanghai-mist"; prefs.mode = "framed"; prefs.wall = "auto"; prefs.frame = "white"; prefs.soften = 1; prefs.blur = false; currentCategory = categoryOf(prefs.wallpaper); applyWallpaper(); }
    else if (a === "reset-widgets") {
      markPanelClick();
      prefs.widgets = { clocks: { on: true, size: "M" }, weather: { on: false, size: "S" }, career: { on: true, size: "M" }, building: { on: true, size: "M" } };
      applyWidgets();
    }
    else if (a === "close-widget-panel") closeWidgetPanel();
    else if (a === "show-desktop") showDesktop();
    else if (a === "light") { prefs.dark = false; applyTheme(); }
    else if (a === "dark") { prefs.dark = true; applyTheme(); }
    else if (a === "close-front") { var f = frontWindow(); if (f) closeWindow(f); }
    else if (a === "close-all") closeAllWindows();
  });
  on("mb-wallpaper-btn", "click", function () { openWindow("wallpaper"); });

  /* ================= finder ================= */
  var finderCat = "start";
  /* the tools appear as files: double-click opens the live rebuild in the browser window */
  function finderItems() {
    var sys = TOOLS.systems.map(function (t) {
      return { id: "tool-" + t.id, name: t.name, app: t.glyph, color: t.color, category: "tools", href: hubHref(t.id),
        preview: "<b>" + esc(t.name) + "</b> — " + esc(t.blurb) + ' <span class="fp-meta">' + esc(t.org) + " · " + esc(t.years) + ". Double-click to open the live rebuild.</span>" };
    });
    var kit = TOOLS.kit.map(function (k) {
      return { id: "kit-" + k.id, name: k.name, app: k.glyph, category: "kit", href: hubHref(k.live ? "kit" : "more"),
        preview: "<b>" + esc(k.name) + "</b> — " + esc(k.blurb) + ' <span class="fp-meta">Double-click to open the everyday kit.</span>' };
    });
    return (C.finder || []).concat(sys, kit);
  }
  function renderFinder() {
    var items = finderItems().filter(function (it) {
      return it.category === finderCat;
    });
    el("finder-grid").innerHTML = items.map(function (it, i) {
      var ico = it.app ? appIcon(it.app, it.color || (it.app === "timeline" ? "#0369a1" : null), 40) : esc(it.icon);
      return '<button class="finder-item' + (i === 0 ? " selected" : "") + '" data-finder="' + it.id + '">' +
        '<span class="fi-icon">' + ico + '</span><span class="fi-name">' + esc(it.name) + "</span></button>";
    }).join("");
    var first = items[0];
    el("finder-preview").innerHTML = first ? first.preview : "";
    document.querySelectorAll(".finder-side button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-finder-nav") === finderCat);
    });
  }
  function finderSelect(id) {
    var it = finderItems().find(function (x) { return x.id === id; });
    if (!it) return;
    el("finder-preview").innerHTML = it.preview;
    document.querySelectorAll(".finder-item").forEach(function (b) {
      b.classList.toggle("selected", b.getAttribute("data-finder") === id);
    });
  }
  document.addEventListener("click", function (e) {
    var nav = e.target.closest("[data-finder-nav]");
    if (nav) { finderCat = nav.getAttribute("data-finder-nav"); renderFinder(); return; }
    var item = e.target.closest("[data-finder]");
    if (item) finderSelect(item.getAttribute("data-finder"));
  });
  document.addEventListener("dblclick", function (e) {
    var item = e.target.closest("[data-finder]");
    if (!item) return;
    var it = finderItems().find(function (x) { return x.id === item.getAttribute("data-finder"); });
    if (!it) return;
    if (it.nav) { finderCat = it.nav; renderFinder(); return; }
    if (it.href) { openToolPage(it.href, it.name); return; }
    if (it.target) openWindow(it.target);
  });
  renderFinder();

  /* ================= notes window ================= */
  var quoteIdx = 0;
  function renderNotes() {
    var pinned = [
      { tag: "Motto", text: C.notes.motto },
      { tag: "Resume", text: C.notes.resumeNote, href: "assets/resume.pdf" },
      { tag: "Sizzle Reel", text: C.notes.reelNote, href: "reel.html" },
      { tag: "Contact", text: "Email · LinkedIn" }
    ];
    el("notes-body").innerHTML =
      '<p class="notes-section">Pinned on desktop · ' + pinned.length + "</p><ul class=\"notes-list\">" +
      pinned.map(function (n) {
        return "<li><span class=\"note-tag\">" + esc(n.tag) + "</span>" + (n.href ? '<a href="' + n.href + '">' + esc(n.text) + "</a>" : esc(n.text)) + "</li>";
      }).join("") + "</ul>" +
      '<p class="notes-section">In rotation</p><ul class="notes-list"><li><span class="note-tag">Daily Quote</span><span id="daily-quote">' + esc(C.quotes[quoteIdx]) + '</span> <button class="quote-btn" id="quote-next">Show another quote</button></li></ul>';
    on("quote-next", "click", function () {
      quoteIdx = (quoteIdx + 1) % C.quotes.length;
      el("daily-quote").textContent = C.quotes[quoteIdx];
    });
  }
  renderNotes();

  /* ================= terminal ================= */
  var termBody = el("terminal-body");
  function termPrint(text) {
    termBody.textContent += text + "\n";
    termBody.scrollTop = termBody.scrollHeight;
  }
  function termInit() {
    termBody.textContent = "";
    termPrint("Marcin Hub Terminal · type 'help'");
  }
  termInit();
  var TERM_COMMANDS = {
    help: "whoami · now · history · tools · open <tool> · links · projects · contact · clear · exit",
    whoami: "Marcin Fracz · strategist, global software & AI.",
    now: "Exploring new leadership opportunities. Building with AI.",
    history: "2003–2014 Engineering · 2014–2016 Chevrolet product, CX and GM de Mexico · 2017–2020 GM crossovers, Encore GX and Trailblazer · 2020–2022 Connected & OTA · 2022–2025 SAIC-GM Shanghai · 2025–2026 OnStar International",
    links: "linkedin.com/in/marcinfracz · marcinfracz.github.io/road.html",
    projects: "Export Command Center · JV Strategy Room · Subscription Lab · Portfolio Made Visible · Marcin Hub · OpenAutoLink · 3D Prints",
    contact: "Open Contact from the menu bar, or LinkedIn: linkedin.com/in/marcinfracz",
    coffee: "Brewing… ☕ (just kidding, this terminal makes no coffee.)",
    sudo: "Nice try. This terminal has no sudo.",
    "rm -rf /": "Nope. Not on my watch."
  };
  on("terminal-input", "keydown", function (e) {
    if (e.key !== "Enter") return;
    var input = el("terminal-input");
    var cmd = input.value.trim().toLowerCase();
    input.value = "";
    termPrint("marcin@desktop ~ % " + cmd);
    if (!cmd) return;
    if (cmd === "clear") { termBody.textContent = ""; return; }
    if (cmd === "exit") { closeWindow("terminal"); return; }
    if (cmd === "tools" || cmd === "ls") {
      var pad = function (x) { return ("  " + x + "            ").slice(0, 12); };
      termPrint(TOOLS.systems.map(function (t) { return pad(t.id) + t.name; }).join("\n") + "\n" + pad("kit") + "Everyday kit (" + TOOLS.kit.length + " tools)\n" + pad("timeline") + "Career timeline explorer\nType 'open export' to launch one.");
      return;
    }
    var m = cmd.match(/^open\s+(\S+)/);
    if (m) {
      var key = m[1], sys = TOOLS.systems.filter(function (t) { return t.id === key; })[0];
      if (sys) { termPrint("Opening " + sys.name + "…"); openToolPage(hubHref(sys.id), sys.name); return; }
      if (key === "kit") { termPrint("Opening the everyday kit…"); openToolPage(hubHref("kit"), "Everyday kit"); return; }
      if (key === "timeline") { termPrint("Opening the career timeline…"); openToolPage("work/timeline.html", "Career timeline"); return; }
      if (key === "road") { termPrint("Starting the drive…"); goPage("road.html"); return; }
      termPrint("open: no tool called '" + key + "'. Type 'tools' for the list."); return;
    }
    termPrint(TERM_COMMANDS[cmd] || ("command not found: " + cmd + " — type 'help'"));
  });

  /* ================= contact form ================= */
  on("contact-form", "submit", function (e) {
    e.preventDefault();
    var f = el("contact-form");
    var subject = "Website contact: " + f.topic.value;
    var body = "Name: " + f.name.value + "\nEmail: " + f.email.value + "\n\n" + f.message.value;
    window.location.href = "mailto:" + C.notes.contact.email +
      "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });

  /* ================= browser: a real browser window inside the desktop ================= */
  var BROWSER_HOME = new URL("start.html", window.location.href).href; /* v39: the browser opens on a launchpad of links */
  var ROAD_URL = new URL("road.html", window.location.href).href;
  var browserHistory = [], browserIndex = -1, browserCurrent = "";
  var frame = el("browser-frame"), urlBar = el("browser-url");
  var RESUME_URL = new URL("assets/resume.pdf", window.location.href).href;
  var REEL_URL = new URL("reel.html", window.location.href).href;
  var BRAG_URL = new URL("work/brag-book.html", window.location.href).href;
  var TIMELINE_URL = new URL("work/timeline.html", window.location.href).href;
  /* work pages open in the browser window on a desktop, and as a page on a phone */
  function openToolPage(href, label) {
    var u = new URL(href, window.location.href).href;
    /* v38: live demos open in their own tab, so the site stays one Back press away */
    /* v41: on the Desktop, live demos open as a tab in this window too (phones go to the page) */
    if (isPhone()) { window.location.href = u; return; }
    browserOpenTab(u, label || "Work & Tools");
  }
  var browserTabs = []; /* {id, title, url, history, index} — one history stack per tab */
  var browserActiveId = null;
  var browserTabSeq = 0;
  function browserTitleFor(url) {
    if (url === BROWSER_HOME) return "Start";
    if (url.split("#")[0] === ROAD_URL) return "The Road";
    if (url === RESUME_URL) return "Resume";
    if (url === REEL_URL) return "Sizzle Reel";
    if (url.split("#")[0] === BRAG_URL) return "Live demos";
    if (url.split("#")[0] === TIMELINE_URL) return "Timeline";
    if (url.split("#")[0] === new URL("about.html", window.location.href).href) return "About";
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return url; }
  }
  function browserActiveTab() {
    for (var i = 0; i < browserTabs.length; i++) if (browserTabs[i].id === browserActiveId) return browserTabs[i];
    return null;
  }
  function browserSyncTab() {
    var t = browserActiveTab();
    if (!t) return;
    t.url = browserCurrent; t.history = browserHistory; t.index = browserIndex;
    t.title = browserTitleFor(browserCurrent);
  }
  function browserLoadTab(t) {
    browserActiveId = t.id;
    browserHistory = t.history.slice();
    browserIndex = t.index;
    browserCurrent = t.url;
    urlBar.value = t.url;
    frame.src = t.url;
    browserButtons();
    browserHideBlocked();
    browserArmTimer();
    renderBrowserTabs();
  }
  function browserSwitchTab(id) {
    var t = null;
    browserTabs.forEach(function (x) { if (x.id === id) t = x; });
    if (!t || t.id === browserActiveId) return;
    browserSyncTab();
    browserLoadTab(t);
  }
  function browserOpenTab(url, title) {
    if (isPhone()) {
      /* phone: no browser-in-a-browser. Work goes to the real page,
         Resume / Reel open in a new tab so the site stays open. */
      if (url === BROWSER_HOME || url.split("#")[0] === ROAD_URL || url.split("#")[0] === BRAG_URL) window.location.href = url;
      else window.open(url, "_blank", "noopener");
      return;
    }
    var existing = null;
    browserTabs.forEach(function (t) { if (t.url === url) existing = t; });
    if (existing) browserSwitchTab(existing.id);
    else {
      var t = { id: ++browserTabSeq, title: title || browserTitleFor(url), url: url, history: [url], index: 0 };
      browserTabs.push(t);
      browserSyncTab();
      browserLoadTab(t);
    }
    openWindow("browser");
  }
  function browserCloseTab(id) {
    var i = -1;
    browserTabs.forEach(function (t, j) { if (t.id === id) i = j; });
    if (i < 0) return;
    var wasActive = (id === browserActiveId);
    browserTabs.splice(i, 1);
    if (!browserTabs.length) {
      browserActiveId = null; browserHistory = []; browserIndex = -1; browserCurrent = "";
      closeWindow("browser");
      renderBrowserTabs();
      return;
    }
    if (wasActive) browserLoadTab(browserTabs[Math.min(i, browserTabs.length - 1)]);
    else renderBrowserTabs();
  }
  function renderBrowserTabs() {
    var bar = el("browser-tabs");
    if (!bar) return;
    bar.innerHTML = browserTabs.map(function (t) {
      return '<button class="browser-tab' + (t.id === browserActiveId ? " active" : "") + '" data-browser-tab="' + t.id + '">' +
        '<span class="browser-tab-title">' + esc(t.title) + '</span>' +
        '<span class="browser-tab-x" data-browser-tab-close="' + t.id + '" title="Close tab">×</span></button>';
    }).join("");
  }
  function browserNormalize(raw) {
    raw = (raw || "").trim();
    if (!raw) return BROWSER_HOME;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(raw)) return "https://" + raw;
    return "https://en.wikipedia.org/wiki/Special:Search?search=" + encodeURIComponent(raw);
  }
  function browserButtons() {
    el("browser-back").disabled = browserIndex <= 0;
    el("browser-forward").disabled = browserIndex >= browserHistory.length - 1;
  }
  var browserLoadTimer = null;
  function browserHideBlocked() { el("browser-blocked").classList.add("hidden-window"); }
  function browserShowBlocked() { el("browser-blocked").classList.remove("hidden-window"); }
  function browserArmTimer() {
    clearTimeout(browserLoadTimer);
    /* Same-origin pages (the showcase) always load inside the frame, so the
       "doesn't allow embedding" notice must never fire for them. Only arm it
       for other cross-origin pages, where a blocked embed can leave the frame empty. */
    if (browserCurrent === BROWSER_HOME) return;
    try {
      if (new URL(browserCurrent, window.location.href).origin === window.location.origin) return;
    } catch (e) {}
    browserLoadTimer = setTimeout(function () { browserShowBlocked(); }, 8000);
  }
  function browserGo(url, push) {
    browserCurrent = url;
    urlBar.value = url;
    frame.src = url;
    if (push) {
      browserHistory = browserHistory.slice(0, browserIndex + 1);
      browserHistory.push(url);
      browserIndex = browserHistory.length - 1;
    }
    browserButtons();
    browserHideBlocked();
    browserArmTimer();
    browserSyncTab();
    renderBrowserTabs();
  }
  function browserNavigate(raw) { browserGo(browserNormalize(raw), true); }
  function browserInit() {
    if (!browserTabs.length) {
      var t = { id: ++browserTabSeq, title: "Start", url: BROWSER_HOME, history: [BROWSER_HOME], index: 0 };
      browserTabs.push(t);
      browserLoadTab(t);
    } else {
      urlBar.value = browserCurrent;
      browserButtons();
      renderBrowserTabs();
    }
  }
  on("browser-back", "click", function () {
    if (browserIndex > 0) { browserIndex--; browserGo(browserHistory[browserIndex], false); }
  });
  on("browser-forward", "click", function () {
    if (browserIndex < browserHistory.length - 1) { browserIndex++; browserGo(browserHistory[browserIndex], false); }
  });
  on("browser-reload", "click", function () {
    if (browserCurrent) { frame.src = browserCurrent; browserHideBlocked(); browserArmTimer(); }
  });
  on("browser-open-tab", "click", function () {
    if (browserCurrent) window.open(browserCurrent, "_blank", "noopener");
  });
  on("browser-blocked-open", "click", function () {
    if (browserCurrent) window.open(browserCurrent, "_blank", "noopener");
  });
  urlBar.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); browserNavigate(urlBar.value); urlBar.blur(); }
    else if (e.key === "Escape") { urlBar.value = browserCurrent; urlBar.blur(); }
  });
  urlBar.addEventListener("focus", function () { urlBar.select(); });
  /* v39: links on the launchpad open as new tabs in this window (only same-site pages, only from the frame) */
  window.addEventListener("message", function (e) {
    if (e.origin !== window.location.origin || e.source !== frame.contentWindow) return;
    var m = e.data && e.data.mfStart;
    if (!m) return;
    if (m.act === "contact") { openWindow("contact-win"); return; }
    if (m.act === "desktop") { minimiseWindow("browser"); return; }
    var u;
    try { u = new URL(m.href, window.location.href); } catch (err) { return; }
    if (u.origin !== window.location.origin) return;
    var title = typeof m.title === "string" && m.title.length < 40 ? m.title : "";
    browserOpenTab(u.href, title || browserTitleFor(u.href));
  });
  frame.addEventListener("load", function () {
    clearTimeout(browserLoadTimer);
    browserHideBlocked(); /* the page loaded; a site that blocks embedding fires load too and shows its own refusal inside the frame */
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href$="resume.pdf"]');
    if (a && !isPhone()) { e.preventDefault(); browserOpenTab(RESUME_URL, "Resume"); return; }
    var bb = e.target.closest('a[href*="brag-book.html"], [data-brag]');
    if (bb) { e.preventDefault(); var nm = bb.querySelector && bb.querySelector(".app-txt b, .kit-chip span"); openToolPage(bb.href || BRAG_URL, nm ? nm.textContent.replace(/\s*Live$/, "") : "Live demos"); return; }
    var tl = e.target.closest('a[href*="work/timeline.html"]');
    if (tl) { e.preventDefault(); openToolPage(tl.href, "Timeline"); return; }
    var r = e.target.closest('a[href$="reel.html"]');
    if (r && !isPhone()) { e.preventDefault(); browserOpenTab(REEL_URL, "Sizzle Reel"); return; }
    var x = e.target.closest("[data-browser-tab-close]");
    if (x) { e.stopPropagation(); browserCloseTab(parseInt(x.getAttribute("data-browser-tab-close"), 10)); return; }
    var tb = e.target.closest("[data-browser-tab]");
    if (tb) browserSwitchTab(parseInt(tb.getAttribute("data-browser-tab"), 10));
  });

  /* page links to the Road go by script, so a host frame that takes over plain links (the private
     preview does) can't stop them; if the host blocks the move, the Road opens in the browser window */
  function goPage(href) {
    var u = new URL(href, window.location.href).href, left = false;
    var mark = function () { left = true; };
    window.addEventListener("beforeunload", mark, { once: true }); window.addEventListener("pagehide", mark, { once: true });
    try { window.location.assign(u); } catch (err) {}
    setTimeout(function () { if (!left && !isPhone()) browserOpenTab(u, "The Road"); }, 900);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    if (!/^road\.html(#[\w-]*)?$/.test(a.getAttribute("href"))) return;
    e.preventDefault(); goPage(a.getAttribute("href"));
  });

  /* ================= search palette ================= */
  var PALETTE_ITEMS = [
    { label: "About Marcin", hint: "Window", run: function () { openWindow("about"); } },
    { label: "Work", hint: "Window", run: function () { openWindow("work"); } },
    { label: "Work & Tools: four live demos", hint: "Page", run: function () { browserOpenTab(BRAG_URL, "Work & Tools"); } },
    { label: "Browser", hint: "Window", run: function () { openWindow("browser"); } },
    { label: "The Road: career story", hint: "Page", run: function () { goPage("road.html"); } },
    { label: "Projects", hint: "Window", run: function () { openWindow("projects"); } },
    { label: "Career timeline explorer", hint: "Page", run: function () { openToolPage("work/timeline.html", "Career timeline"); } },
    { label: "Marcin Hub", hint: "Project", run: function () { openWindow("projects"); } },
    { label: "OpenAutoLink", hint: "Project", run: function () { openWindow("projects"); } },
    { label: "3D Prints", hint: "Project", run: function () { openWindow("projects"); } },
    { label: "Finder", hint: "Window", run: function () { openWindow("finder"); } },
    { label: "Notes", hint: "Window", run: function () { openWindow("notes-win"); } },
    { label: "Terminal", hint: "Window", run: function () { openWindow("terminal"); } },
    { label: "Contact Marcin", hint: "Window", run: function () { openWindow("contact-win"); } },
    { label: "World Clock", hint: "Widget", run: function () { var w = el("widget-clocks"); if (w) { w.style.display = ""; bringToFront(w); } } },
    { label: "Wallpaper Settings", hint: "Settings", run: function () { openWindow("wallpaper"); } },
    { label: "Widget Settings", hint: "Settings", run: openWidgetPanel },
    { label: "Dark Appearance", hint: "View", run: function () { prefs.dark = true; applyTheme(); } },
    { label: "Light Appearance", hint: "View", run: function () { prefs.dark = false; applyTheme(); } },
    { label: "Show Desktop", hint: "View", run: showDesktop }
  ];
  TOOLS.systems.forEach(function (t) {
    PALETTE_ITEMS.splice(3, 0, { label: t.name, hint: "Live demo", run: function () { openToolPage(hubHref(t.id), t.name); } });
  });
  TOOLS.kit.forEach(function (k) {
    PALETTE_ITEMS.push({ label: k.name, hint: "Tool", run: function () { openToolPage(hubHref(k.live ? "kit" : "more"), k.live ? "Everyday kit" : "More I built"); } });
  });
  var paletteSel = 0;
  function renderPalette() {
    var q = el("palette-input").value.trim().toLowerCase();
    var items = PALETTE_ITEMS.filter(function (it) { return it.label.toLowerCase().indexOf(q) !== -1; });
    paletteSel = 0;
    el("palette-list").innerHTML = items.map(function (it, i) {
      return '<li data-idx="' + i + '" class="' + (i === 0 ? "selected" : "") + '">' + esc(it.label) + '<span class="hint">' + esc(it.hint) + "</span></li>";
    }).join("") || '<li class="hint">No matches</li>';
    el("palette-list")._items = items;
  }
  function openPalette() {
    el("palette").classList.remove("hidden-window");
    el("palette-input").value = "";
    renderPalette();
    el("palette-input").focus();
  }
  function closePalette() { el("palette").classList.add("hidden-window"); }
  function runPaletteItem(i) {
    var items = el("palette-list")._items || [];
    if (items[i]) { closePalette(); items[i].run(); }
  }
  on("palette-input", "input", renderPalette);
  on("palette-input", "keydown", function (e) {
    var items = el("palette-list")._items || [];
    if (e.key === "ArrowDown") { e.preventDefault(); paletteSel = Math.min(paletteSel + 1, items.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); paletteSel = Math.max(paletteSel - 1, 0); }
    else if (e.key === "Enter") { e.preventDefault(); runPaletteItem(paletteSel); return; }
    else if (e.key === "Escape") { closePalette(); return; }
    else return;
    el("palette-list").querySelectorAll("li").forEach(function (li, i) {
      li.classList.toggle("selected", i === paletteSel);
    });
  });
  on("palette-list", "click", function (e) {
    var li = e.target.closest("li[data-idx]");
    if (li) runPaletteItem(+li.getAttribute("data-idx"));
  });

  /* keyboard */
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
    else if (e.key === "Escape") {
      var busy = !el("palette").classList.contains("hidden-window") || !el("widget-panel").classList.contains("hidden-window") || document.querySelector(".menu.open");
      closeMenus(); closePalette(); closeWidgetPanel();
      var tag = (e.target && e.target.tagName) || "";
      if (!busy && !/INPUT|TEXTAREA|SELECT/.test(tag)) { var fw = frontWindow(); if (fw && fw !== "intro") closeWindow(fw); }
    }
  });
  document.addEventListener("click", function (e) {
    var pal = el("palette");
    if (!pal.classList.contains("hidden-window") && !e.target.closest("#palette") && !e.target.closest(".menu")) closePalette();
    var wp = el("widget-panel");
    if (!panelClick && !wp.classList.contains("hidden-window") && !e.target.closest("#widget-panel") && !e.target.closest("#mb-widgets-btn") && !e.target.closest(".menu")) closeWidgetPanel();
  });
  /* ================= v23: field notes, parts, loop, deep links ================= */
  (function () {
    var notes = (C.notes && C.notes.field) || ["Find the gap. Build the mechanism. Bring the decision."];
    var ni = 0, nt = el("note-motto-text");
    function nextNote() { ni = (ni + 1) % notes.length; if (nt) { nt.style.opacity = 0; setTimeout(function () { nt.textContent = notes[ni]; nt.style.opacity = 1; }, 250); } }
    if (nt) { nt.textContent = notes[0]; nt.style.transition = "opacity .25s"; }
    var noteEl = el("note-motto");
    if (noteEl) noteEl.addEventListener("dblclick", nextNote);
    var parts = (C.widgets && C.widgets.parts) || [];
    var pi = 0, pe = el("career-part");
    function nextPart() { if (!pe || !parts.length) return; pi = (pi + 1) % parts.length; pe.style.opacity = 0; setTimeout(function () { pe.innerHTML = "<b>" + esc(parts[pi].name) + "</b><span>" + esc(parts[pi].detail) + "</span>"; pe.style.opacity = 1; }, 250); }
    if (pe && parts.length) { pe.innerHTML = "<b>" + esc(parts[0].name) + "</b><span>" + esc(parts[0].detail) + "</span>"; pe.style.transition = "opacity .25s"; pe.addEventListener("click", nextPart); }
    /* v38: the highlight box keeps the height of its longest entry, so the widget never changes size */
    function sizePart() {
      if (!pe || !parts.length || !pe.offsetWidth) return;
      var keep = pe.innerHTML, mx = 0; pe.style.minHeight = "0px";
      parts.forEach(function (p) { pe.innerHTML = "<b>" + esc(p.name) + "</b><span>" + esc(p.detail) + "</span>"; mx = Math.max(mx, pe.offsetHeight); });
      pe.innerHTML = keep; pe.style.minHeight = mx + "px";
    }
    if (pe && parts.length) {
      sizePart();
      var lastW = pe.offsetWidth;
      if ("ResizeObserver" in window) new ResizeObserver(function () { if (pe.offsetWidth !== lastW) { lastW = pe.offsetWidth; sizePart(); } }).observe(pe);
      else window.addEventListener("resize", sizePart);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizePart);
    }
    var loop = el("build-loop"), li = 0;
    function stepLoop() { if (!loop) return; var items = loop.querySelectorAll("li"); items.forEach(function (x, i) { x.classList.toggle("on", i === li); }); li = (li + 1) % items.length; }
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    stepLoop();
    if (!reduce) { setInterval(nextNote, 7000); setInterval(nextPart, 5000); setInterval(stepLoop, 1400); }
    function openFromHash() {
      var h = (window.location.hash || "").replace("#", "");
      var map = { contact: "contact-win", about: "about", work: "work", projects: "projects", notes: "notes-win", howiwork: "about" };
      if (map[h]) openWindow(map[h]);
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  })();
})();
