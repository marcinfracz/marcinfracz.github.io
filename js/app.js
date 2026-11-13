/* Marcin Fracz personal site: a fake desktop that works like one.
   Vanilla JS, no dependencies. */
(function () {
  var C = window.SITE_CONTENT;
  if (!C) return;

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
  el("intro-photo").src = C.intro.photo;
  el("intro-buttons").innerHTML = C.intro.buttons.map(function (b) {
    return '<button data-open="' + esc(b.target) + '">' + esc(b.label) + "</button>";
  }).join("");

  el("about-body").innerHTML =
    "<h2>" + esc(C.about.title) + "</h2>" +
    C.about.paragraphs.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
    "<h3>Education</h3><ul class=\"edu\">" +
    C.work.education.map(function (e) {
      return "<li><b>" + esc(e.school) + "</b> <span>(" + esc(e.year) + ")</span></li>";
    }).join("") + "</ul>";

  el("work-note").textContent = C.work.note;
  el("timeline").innerHTML = C.work.roles.map(function (r) {
    return '<div class="timeline-item">' +
      '<div class="years">' + esc(r.years) + "</div>" +
      "<h4>" + esc(r.role) + "</h4>" +
      '<div class="employer">' + esc(r.company) + "</div>" +
      "<p>" + esc(r.detail) + "</p></div>";
  }).join("");

  el("projects-body").innerHTML =
    "<h2>" + esc(C.projects.title) + "</h2>" +
    C.projects.items.map(function (p) {
      return '<div class="project"><h4>' + esc(p.name) + "</h4><p>" + esc(p.detail) + "</p></div>";
    }).join("");

  el("clocks-title").textContent = C.widgets.clocksTitle;
  el("clocks-sub").textContent = C.widgets.clocksSub || "";

  el("note-motto-text").textContent = C.notes.motto;
  el("note-resume-text").innerHTML = '<a href="assets/resume.pdf">' + esc(C.notes.resumeNote) + "</a>";
  var email = el("note-email");
  email.textContent = C.notes.contact.email;
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
  function applyZoom() { timeline.style.transform = "scale(" + zoom + ")"; }
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
    { id: "widgets", label: "Widget Settings" }
  ];
  function findWindow(name) {
    return el("window-" + name) || el("widget-" + name);
  }
  function isOpen(win) {
    return win && !win.classList.contains("hidden-window") && !win.classList.contains("minimised");
  }
  function openWindow(name) {
    if (name === "contact-note") {
      var note = el("note-contact");
      if (note) { bringToFront(note); }
      return;
    }
    var win = findWindow(name);
    if (!win) return;
    win.classList.remove("hidden-window", "minimised");
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
      else window.location.href = url;
    }
  });
  /* click anywhere on a window/widget/note brings it to front */
  document.addEventListener("pointerdown", function (e) {
    var node = e.target.closest(".window, .widget, .note");
    if (node) bringToFront(node);
  }, true);

  /* ================= dragging: transform while moving, commit on release ================= */
  var POS_KEY = "mf-pos-v6";
  var positions = {};
  try { positions = JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch (e) {}
  function savePositions() { try { localStorage.setItem(POS_KEY, JSON.stringify(positions)); } catch (e) {} }
  function restorePositions() {
    var vw = window.innerWidth, vh = window.innerHeight;
    Object.keys(positions).forEach(function (id) {
      var node = document.getElementById(id);
      var pos = positions[id];
      if (!node || !pos || typeof pos.left !== "number") return;
      /* clamp stale saved positions into the viewport so a bad save can never strand a window off-screen */
      var left = Math.max(0, Math.min(pos.left, vw - 120));
      var top = Math.max(40, Math.min(pos.top, vh - 80));
      positions[id] = { left: left, top: top };
      node.style.left = left + "px";
      node.style.top = top + "px";
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
    positions[drag.id] = { left: left, top: top };
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
    target.style.left = (rect.left - parentRect.left) + "px";
    target.style.top = (rect.top - parentRect.top) + "px";
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
  var prefs = {
    wallpaper: "shanghai-mist", mode: "framed", dark: false, wallColor: null,
    widgets: { clocks: { on: true, size: "M" }, weather: { on: false, size: "S" } },
    welcome: true
  };
  try {
    var saved = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    if (saved.wallpaper) prefs.wallpaper = saved.wallpaper;
    if (saved.wallColor) prefs.wallColor = saved.wallColor;
    if (saved.mode) prefs.mode = saved.mode;
    if (typeof saved.dark === "boolean") prefs.dark = saved.dark;
    if (saved.widgets) {
      Object.keys(prefs.widgets).forEach(function (k) {
        if (saved.widgets[k]) {
          if (typeof saved.widgets[k].on === "boolean") prefs.widgets[k].on = saved.widgets[k].on;
          if (saved.widgets[k].size) prefs.widgets[k].size = saved.widgets[k].size;
        }
      });
    }
    if (typeof saved.welcome === "boolean") prefs.welcome = saved.welcome;
  } catch (e) {}
  /* a widget removed in v16 may still have a saved preference; drop it
     here instead of breaking the widget panel */
  delete prefs.widgets.news;
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

  /* ================= wallpaper ================= */
  /* ================= wallpaper ================= */
  /* v17: 4 categories x 5 items, defined in content.js (wallpaperSettings).
     All 15 images are AI-generated for this site (no people). Old packs
     (Wikimedia prints, cars, EUC photos, Great Wave) removed. */
  var WP_CATEGORIES = C.wallpaperSettings.categories;
  function wpFind(id) {
    for (var i = 0; i < WP_CATEGORIES.length; i++) {
      var items = WP_CATEGORIES[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].id === id) return items[j];
    }
    return null;
  }
  function categoryOf(id) {
    for (var i = 0; i < WP_CATEGORIES.length; i++) {
      var items = WP_CATEGORIES[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].id === id) return WP_CATEGORIES[i].id;
    }
    return "mobility-ai";
  }
  var currentCategory = categoryOf(prefs.wallpaper);
  function applyWallpaper() {
    var art = wpFind(prefs.wallpaper);
    if (!art) { prefs.wallpaper = "shanghai-mist"; art = wpFind(prefs.wallpaper); } /* e.g. a removed pack id */
    if (art.type === "color") prefs.wallColor = art.value; /* picking a colour sets the wall colour */
    WP_CATEGORIES.forEach(function (c) { c.items.forEach(function (it) { document.body.classList.remove("wp-" + it.id); }); });
    document.body.classList.remove("wp-solid", "wp-framed", "wp-full");
    document.body.classList.add("wp-" + prefs.wallpaper, "wp-" + prefs.mode);
    if (art.type === "color") document.body.classList.add("wp-solid");
    var wallEl = document.querySelector(".wallpaper");
    if (wallEl) wallEl.style.background = art.type === "color" ? art.value : (prefs.wallColor || ""); /* the wall colour stays when an image is picked */
    var img = el("wallpaper-img");
    if (img) img.src = art.type === "image" ? art.src : "";
    var framedImg = el("framed-art-img");
    if (framedImg && art.type === "image") { framedImg.src = art.src; framedImg.alt = art.name; }
    var cap = el("framed-art-caption");
    if (cap) cap.textContent = art.type === "image" ? art.name : "";
    currentCategory = categoryOf(prefs.wallpaper);
    renderWallpaperPanel();
    document.querySelectorAll(".wp-mode").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-wp-mode") === prefs.mode);
    });
    savePrefs();
  }
  function renderWallpaperPanel() {
    var packsEl = el("wp-packs");
    if (packsEl) {
      packsEl.innerHTML = WP_CATEGORIES.map(function (c) {
        return '<button class="wp-pack-btn' + (c.id === currentCategory ? " on" : "") + '" data-wp-category="' + c.id + '">' + esc(c.name) + "</button>";
      }).join("");
    }
    var cat = null;
    WP_CATEGORIES.forEach(function (c) { if (c.id === currentCategory) cat = c; });
    if (!cat) cat = WP_CATEGORIES[0];
    el("wp-options").innerHTML = cat.items.map(function (w) {
      var sw = w.type === "color"
        ? "background:" + w.value + ";border:1px solid #d6d3d1"
        : "background-image:url('" + esc(w.src) + "')";
      var active = w.type === "color" ? (w.value === prefs.wallColor) : (w.id === prefs.wallpaper);
      return '<button class="wp-option' + (active ? " active" : "") + '" data-wp="' + w.id + '">' +
        '<span class="wp-swatch" style="' + sw + '"></span>' + esc(w.name) +
        '<span class="check">' + (active ? "✓" : "") + "</span></button>";
    }).join("");
  }
  document.addEventListener("click", function (e) {
    var pk = e.target.closest("[data-wp-category]");
    if (pk) { currentCategory = pk.getAttribute("data-wp-category"); renderWallpaperPanel(); return; }
    var wp = e.target.closest("[data-wp]");
    if (wp) { prefs.wallpaper = wp.getAttribute("data-wp"); applyWallpaper(); return; }
    var mode = e.target.closest("[data-wp-mode]");
    if (mode) { prefs.mode = mode.getAttribute("data-wp-mode"); applyWallpaper(); }
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
  var WIDGET_SIZES = { clocks: { S: 300, M: 480, L: 680 }, weather: { S: 300, M: 300, L: 300 } };
  var SIZE_ORDER = ["S", "M", "L"];
  function applyWidgets() {
    Object.keys(prefs.widgets).forEach(function (key) {
      var w = el("widget-" + key);
      var p = prefs.widgets[key];
      if (!w) return;
      w.style.display = p.on ? "" : "none";
      if (p.size === "custom" && p.customWidth) w.style.width = p.customWidth + "px";
      else if (WIDGET_SIZES[key] && WIDGET_SIZES[key][p.size]) w.style.width = WIDGET_SIZES[key][p.size] + "px";
    });
    renderWidgetPanel();
    savePrefs();
  }
  function renderWidgetPanel() {
    var labels = {
      clocks: { name: "World Clock", sub: "Detroit, Shanghai, Mexico City" },
      weather: { name: "Weather", sub: "A window, not a dashboard" }
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

  /* weather (Open-Meteo, no key) */
  var weatherLoaded = false;
  function loadWeather() {
    if (weatherLoaded) return;
    weatherLoaded = true;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=42.33&longitude=-83.05&current=temperature_2m,weather_code&temperature_unit=fahrenheit")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var code = d.current && d.current.weather_code;
        var temp = d.current && Math.round(d.current.temperature_2m);
        var cond = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Light showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm" }[code] || "—";
        el("weather-body").innerHTML =
          '<div class="weather-temp">' + temp + "°F</div>" +
          '<div class="weather-cond">Detroit · ' + esc(cond) + "</div>" +
          '<div class="weather-src">Data: Open-Meteo</div>';
      })
      .catch(function () {
        el("weather-body").innerHTML = '<div class="weather-cond">Weather unavailable right now.</div><div class="weather-src">Data: Open-Meteo</div>';
      });
  }

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
    else if (a === "open-work-showcase") browserOpenTab(BROWSER_HOME, "Work Showcase");
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
    else if (a === "reset-wallpaper") { prefs.wallpaper = "shanghai-mist"; prefs.mode = "framed"; prefs.wallColor = null; applyWallpaper(); }
    else if (a === "reset-widgets") {
      markPanelClick();
      prefs.widgets = { clocks: { on: true, size: "M" }, weather: { on: false, size: "S" } };
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
  function renderFinder() {
    var items = (C.finder || []).filter(function (it) {
      return finderCat === "start" || it.category === finderCat;
    });
    el("finder-grid").innerHTML = items.map(function (it, i) {
      return '<button class="finder-item' + (i === 0 ? " selected" : "") + '" data-finder="' + it.id + '">' +
        '<span class="fi-icon">' + esc(it.icon) + '</span><span class="fi-name">' + esc(it.name) + "</span></button>";
    }).join("");
    var first = items[0];
    el("finder-preview").innerHTML = first ? first.preview : "";
    document.querySelectorAll(".finder-side button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-finder-nav") === finderCat);
    });
  }
  function finderSelect(id) {
    var it = (C.finder || []).find(function (x) { return x.id === id; });
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
    var it = (C.finder || []).find(function (x) { return x.id === item.getAttribute("data-finder"); });
    if (it && it.target) openWindow(it.target);
  });
  renderFinder();

  /* ================= notes window ================= */
  var quoteIdx = 0;
  function renderNotes() {
    var pinned = [
      { tag: "Motto", text: C.notes.motto },
      { tag: "Resume", text: C.notes.resumeNote, href: "assets/resume.pdf" },
      { tag: "Contact", text: C.notes.contact.email + " · LinkedIn" }
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
    help: "whoami · now · history · links · projects · contact · clear · exit",
    whoami: "Marcin Fracz · strategist, global software & AI.",
    now: "Exploring new leadership opportunities. Building with AI.",
    history: "2003–2014 Engineering · 2014–2018 GM crossovers · 2018–2020 Encore GX & Trailblazer · 2020–2022 Connected & OTA · 2022–2025 SAIC-GM Shanghai · 2025 GM Global Planning & OnStar",
    links: "linkedin.com/in/marcinfracz · marcinfracz.github.io/work",
    projects: "Marcin Hub · OpenAutoLink · 3D Prints",
    contact: "marcin.fracz@gmail.com",
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
  var BROWSER_HOME = "https://marcinfracz.github.io/work/";
  var browserHistory = [], browserIndex = -1, browserCurrent = "";
  var frame = el("browser-frame"), urlBar = el("browser-url");
  var RESUME_URL = "https://marcinfracz.github.io/assets/resume.pdf";
  var browserTabs = []; /* {id, title, url, history, index} — one history stack per tab */
  var browserActiveId = null;
  var browserTabSeq = 0;
  function browserTitleFor(url) {
    if (url === BROWSER_HOME) return "Work Showcase";
    if (url === RESUME_URL) return "Resume";
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
      var t = { id: ++browserTabSeq, title: "Work Showcase", url: BROWSER_HOME, history: [BROWSER_HOME], index: 0 };
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
  frame.addEventListener("load", function () {
    clearTimeout(browserLoadTimer);
    browserHideBlocked(); /* the page loaded; a site that blocks embedding fires load too and shows its own refusal inside the frame */
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href$="resume.pdf"]');
    if (a) { e.preventDefault(); browserOpenTab(RESUME_URL, "Resume"); return; }
    var x = e.target.closest("[data-browser-tab-close]");
    if (x) { e.stopPropagation(); browserCloseTab(parseInt(x.getAttribute("data-browser-tab-close"), 10)); return; }
    var tb = e.target.closest("[data-browser-tab]");
    if (tb) browserSwitchTab(parseInt(tb.getAttribute("data-browser-tab"), 10));
  });

  /* ================= search palette ================= */
  var PALETTE_ITEMS = [
    { label: "About Marcin", hint: "Window", run: function () { openWindow("about"); } },
    { label: "Work", hint: "Window", run: function () { openWindow("work"); } },
    { label: "Browser", hint: "Window", run: function () { openWindow("browser"); } },
    { label: "Work Showcase", hint: "Browser", run: function () { browserOpenTab(BROWSER_HOME, "Work Showcase"); } },
    { label: "Projects", hint: "Window", run: function () { openWindow("projects"); } },
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
    else if (e.key === "Escape") { closeMenus(); closePalette(); closeWidgetPanel(); }
  });
  document.addEventListener("click", function (e) {
    var pal = el("palette");
    if (!pal.classList.contains("hidden-window") && !e.target.closest("#palette") && !e.target.closest(".menu")) closePalette();
    var wp = el("widget-panel");
    if (!panelClick && !wp.classList.contains("hidden-window") && !e.target.closest("#widget-panel") && !e.target.closest("#mb-widgets-btn") && !e.target.closest(".menu")) closeWidgetPanel();
  });
})();
