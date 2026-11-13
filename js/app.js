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
  el("news-title").textContent = C.widgets.newsTitle;
  el("news-sub").textContent = C.widgets.newsSub || "";
  el("news-list").innerHTML = C.widgets.news.map(function (n) {
    return '<li><a href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
      '<span class="news-tag">' + esc(n.tag) + '</span>' +
      '<span class="news-src">' + esc(n.source) + " · " + esc(n.date) + "</span>" +
      '<span class="news-title">' + esc(n.title) + "</span></a></li>";
  }).join("");
  el("sizzle-title").textContent = C.widgets.sizzleTitle;
  el("sizzle-note").textContent = C.widgets.sizzleNote;

  el("note-motto-text").textContent = C.notes.motto;
  el("note-resume-text").textContent = C.notes.resumeNote;
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
  var topFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
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
    if (top) top.textContent = topFmt.format(now);
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
    win.style.display = "";
    var dockBtn = document.querySelector('[data-dock="' + name + '"]');
    if (dockBtn) dockBtn.classList.remove("has-min");
    bringToFront(win);
    if (name === "terminal") setTimeout(function () { el("terminal-input").focus(); }, 50);
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
    Object.keys(positions).forEach(function (id) {
      var node = document.getElementById(id);
      var pos = positions[id];
      if (!node || !pos || typeof pos.left !== "number") return;
      node.style.left = pos.left + "px";
      node.style.top = pos.top + "px";
      /* only overlay windows need their centring transform cleared;
         notes keep their CSS tilt, desktop windows have none */
      if (node.classList.contains("overlay-window")) node.style.transform = "none";
    });
  }
  restorePositions();

  var drag = null;
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
    if (handle && handle.setPointerCapture) { try { handle.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  document.addEventListener("pointermove", function (e) {
    if (!drag) return;
    drag.dx = e.clientX - drag.startX;
    drag.dy = e.clientY - drag.startY;
    drag.node.style.transform = "translate(" + drag.dx + "px," + drag.dy + "px)";
  });
  document.addEventListener("pointerup", function () {
    if (!drag) return;
    var node = drag.node;
    var left = parseFloat(node.style.left) + drag.dx;
    var top = parseFloat(node.style.top) + drag.dy;
    node.style.left = Math.max(0, left) + "px";
    node.style.top = Math.max(0, top) + "px";
    node.style.transform = "";
    node.classList.remove("dragging");
    positions[drag.id] = { left: Math.max(0, left), top: Math.max(0, top) };
    savePositions();
    drag = null;
  });

  /* ================= preferences ================= */
  var PREF_KEY = "mf-site-prefs-v6";
  var prefs = {
    wallpaper: "skyline", mode: "framed", dark: false,
    widgets: { clocks: { on: true, size: "M" }, news: { on: true, size: "M" }, weather: { on: false, size: "S" } },
    welcome: true
  };
  try {
    var saved = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    if (saved.wallpaper) prefs.wallpaper = saved.wallpaper;
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
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

  /* ================= wallpaper ================= */
  var WP_ART = {
    skyline: { label: "Shanghai Skyline", type: "image", src: "assets/skyline.jpg", caption: "Shanghai · Lujiazui", credit: "Shanghai skyline at dawn." },
    wave: { label: "The Great Wave", type: "image", src: "assets/wallpaper.jpg", caption: "The Great Wave off Kanagawa", credit: "The Great Wave off Kanagawa, Hokusai, c. 1831. Public domain." },
    cream: { label: "Solid Cream", type: "solid", src: "", caption: "", credit: "A plain warm wall." }
  };
  function applyWallpaper() {
    var art = WP_ART[prefs.wallpaper] || WP_ART.skyline;
    document.body.classList.remove("wp-skyline", "wp-wave", "wp-cream", "wp-framed", "wp-full");
    document.body.classList.add("wp-" + prefs.wallpaper, "wp-" + prefs.mode);
    var img = el("wallpaper-img");
    if (img) img.src = art.type === "image" ? art.src : "";
    var framedImg = el("framed-art-img");
    if (framedImg && art.type === "image") framedImg.src = art.src;
    var cap = el("framed-art-caption");
    if (cap) cap.textContent = art.caption;
    var credit = el("wp-credit");
    if (credit) credit.textContent = art.credit;
    document.querySelectorAll("#wp-options .wp-option").forEach(function (b) {
      var active = b.getAttribute("data-wp") === prefs.wallpaper;
      b.classList.toggle("active", active);
      var ck = b.querySelector(".check");
      if (ck) ck.textContent = active ? "✓" : "";
    });
    document.querySelectorAll(".wp-mode").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-wp-mode") === prefs.mode);
    });
    savePrefs();
  }
  el("wp-options").innerHTML = Object.keys(WP_ART).map(function (id) {
    var w = WP_ART[id];
    var sw = w.type === "solid"
      ? "background:#e8e2d5;border:1px solid #d6d3d1"
      : "background-image:url('" + esc(w.src) + "')";
    return '<button class="wp-option" data-wp="' + id + '">' +
      '<span class="wp-swatch" style="' + sw + '"></span>' + esc(w.label) +
      '<span class="check"></span></button>';
  }).join("");
  document.addEventListener("click", function (e) {
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
  var WIDGET_SIZES = { clocks: { S: 300, M: 480, L: 680 }, news: { S: 300, M: 380, L: 520 }, weather: { S: 300, M: 300, L: 300 } };
  var SIZE_ORDER = ["S", "M", "L"];
  function applyWidgets() {
    Object.keys(prefs.widgets).forEach(function (key) {
      var w = el("widget-" + key);
      var p = prefs.widgets[key];
      if (!w) return;
      w.style.display = p.on ? "" : "none";
      if (WIDGET_SIZES[key] && WIDGET_SIZES[key][p.size]) w.style.width = WIDGET_SIZES[key][p.size] + "px";
    });
    renderWidgetPanel();
    savePrefs();
  }
  function renderWidgetPanel() {
    var labels = { clocks: "World Clock", news: "AI Signals", weather: "Weather" };
    el("widget-panel-list").innerHTML = Object.keys(prefs.widgets).map(function (key) {
      var p = prefs.widgets[key];
      return '<label class="widget-panel-row"><input type="checkbox" data-widget-toggle="' + key + '"' + (p.on ? " checked" : "") + "> " + labels[key] +
        '<span class="wp-size">' + p.size + "</span></label>";
    }).join("");
  }
  document.addEventListener("change", function (e) {
    var t = e.target.closest("[data-widget-toggle]");
    if (t) {
      prefs.widgets[t.getAttribute("data-widget-toggle")].on = t.checked;
      applyWidgets();
      if (t.getAttribute("data-widget-toggle") === "weather" && t.checked) loadWeather();
    }
  });
  document.addEventListener("click", function (e) {
    var sz = e.target.closest("[data-widget-size]");
    if (sz) {
      var key = sz.getAttribute("data-widget-size");
      var cur = SIZE_ORDER.indexOf(prefs.widgets[key].size);
      prefs.widgets[key].size = SIZE_ORDER[(cur + 1) % SIZE_ORDER.length];
      applyWidgets();
      return;
    }
    var hide = e.target.closest("[data-widget-hide]");
    if (hide) {
      prefs.widgets[hide.getAttribute("data-widget-hide")].on = false;
      applyWidgets();
    }
  });
  function openWidgetPanel() {
    el("widget-panel").classList.remove("hidden-window");
    renderWidgetPanel();
  }
  function closeWidgetPanel() { el("widget-panel").classList.add("hidden-window"); }
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
    else if (a === "contact") openWindow("contact-win");
    else if (a === "search") openPalette();
    else if (a === "wallpaper-settings") openWindow("wallpaper");
    else if (a === "widget-settings") openWidgetPanel();
    else if (a === "toggle-welcome") { prefs.welcome = !prefs.welcome; applyWelcome(); }
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
    else if (a === "reset-wallpaper") { prefs.wallpaper = "skyline"; prefs.mode = "framed"; applyWallpaper(); }
    else if (a === "reset-widgets") {
      prefs.widgets = { clocks: { on: true, size: "M" }, news: { on: true, size: "M" }, weather: { on: false, size: "S" } };
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
      { tag: "Resume", text: C.notes.resumeNote },
      { tag: "Contact", text: C.notes.contact.email + " · LinkedIn" }
    ];
    el("notes-body").innerHTML =
      '<p class="notes-section">Pinned on desktop · ' + pinned.length + "</p><ul class=\"notes-list\">" +
      pinned.map(function (n) {
        return "<li><span class=\"note-tag\">" + esc(n.tag) + "</span>" + esc(n.text) + "</li>";
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

  /* ================= search palette ================= */
  var PALETTE_ITEMS = [
    { label: "About Marcin", hint: "Window", run: function () { openWindow("about"); } },
    { label: "Work", hint: "Window", run: function () { openWindow("work"); } },
    { label: "Work Showcase", hint: "Page", run: function () { window.location.href = "work/"; } },
    { label: "Projects", hint: "Window", run: function () { openWindow("projects"); } },
    { label: "Marcin Hub", hint: "Project", run: function () { openWindow("projects"); } },
    { label: "OpenAutoLink", hint: "Project", run: function () { openWindow("projects"); } },
    { label: "3D Prints", hint: "Project", run: function () { openWindow("projects"); } },
    { label: "Finder", hint: "Window", run: function () { openWindow("finder"); } },
    { label: "Notes", hint: "Window", run: function () { openWindow("notes-win"); } },
    { label: "Terminal", hint: "Window", run: function () { openWindow("terminal"); } },
    { label: "Contact Marcin", hint: "Window", run: function () { openWindow("contact-win"); } },
    { label: "World Clock", hint: "Widget", run: function () { var w = el("widget-clocks"); if (w) { w.style.display = ""; bringToFront(w); } } },
    { label: "AI Signals", hint: "Widget", run: function () { var w = el("widget-news"); if (w) { w.style.display = ""; bringToFront(w); } } },
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
    if (!wp.classList.contains("hidden-window") && !e.target.closest("#widget-panel") && !e.target.closest("#mb-widgets-btn") && !e.target.closest(".menu")) closeWidgetPanel();
  });
})();
