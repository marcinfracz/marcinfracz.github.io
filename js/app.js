/* Marcin Fracz personal site: content injection, absolute desktop windows,
   transform-free dragging (left/top), analog world clocks, timeline zoom,
   working menus, Finder, search palette, wallpaper + widget settings.
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

  /* ---- Intro ---- */
  el("intro-name").textContent = C.intro.name;
  el("intro-headline").textContent = C.intro.headline;
  el("intro-photo").src = C.intro.photo;
  el("intro-buttons").innerHTML = C.intro.buttons.map(function (b) {
    return '<button data-open="' + esc(b.target) + '">' + esc(b.label) + "</button>";
  }).join("");

  /* ---- About (with education) ---- */
  el("about-body").innerHTML =
    "<h2>" + esc(C.about.title) + "</h2>" +
    C.about.paragraphs.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
    "<h3>Education</h3><ul class=\"edu\">" +
    C.work.education.map(function (e) {
      return "<li><b>" + esc(e.school) + "</b> <span>(" + esc(e.year) + ")</span></li>";
    }).join("") + "</ul>";

  /* ---- Work ---- */
  el("work-note").textContent = C.work.note;
  el("timeline").innerHTML = C.work.roles.map(function (r) {
    return '<div class="timeline-item">' +
      '<div class="years">' + esc(r.years) + "</div>" +
      "<h4>" + esc(r.role) + "</h4>" +
      '<div class="employer">' + esc(r.company) + "</div>" +
      "<p>" + esc(r.detail) + "</p></div>";
  }).join("");

  /* ---- Projects ---- */
  el("projects-body").innerHTML =
    "<h2>" + esc(C.projects.title) + "</h2>" +
    C.projects.items.map(function (p) {
      return '<div class="project"><h4>' + esc(p.name) + "</h4><p>" + esc(p.detail) + "</p></div>";
    }).join("");

  /* ---- Widgets ---- */
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

  /* ---- Sticky notes ---- */
  el("note-motto").textContent = C.notes.motto;
  el("note-resume").textContent = C.notes.resumeNote;
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

  /* ---- Analog world clocks ---- */
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
    timeFmt[c.timeZone] = new Intl.DateTimeFormat("en-US", {
      timeZone: c.timeZone, hour: "numeric", minute: "2-digit"
    });
    dateFmt[c.timeZone] = new Intl.DateTimeFormat("en-US", {
      timeZone: c.timeZone, weekday: "short", month: "short", day: "numeric"
    });
    partsFmt[c.timeZone] = new Intl.DateTimeFormat("en-US", {
      timeZone: c.timeZone, hour: "numeric", minute: "numeric", second: "numeric", hour12: false
    });
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
    if (top) {
      top.textContent = "Detroit " + new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Detroit", weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit"
      }).format(now);
    }
  }
  tickClocks();
  setInterval(tickClocks, 1000);

  /* ---- Timeline zoom ---- */
  var zoom = 1;
  var timeline = el("timeline");
  function applyZoom() { timeline.style.transform = "scale(" + zoom + ")"; }
  el("zoom-in").addEventListener("click", function () {
    zoom = Math.min(zoom + 0.15, 1.6);
    applyZoom();
  });
  el("zoom-out").addEventListener("click", function () {
    zoom = Math.max(zoom - 0.15, 0.6);
    applyZoom();
  });

  /* ---- Window open / close ---- */
  function findWindow(name) {
    return el("window-" + name) || el("widget-" + name);
  }
  function openWindow(name) {
    if (name === "contact-note") {
      var note = el("contact-note");
      if (note) note.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    var win = findWindow(name);
    if (!win) return;
    win.classList.remove("hidden-window");
    if (!win.classList.contains("overlay-window")) {
      win.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  function closeWindow(name) {
    var win = findWindow(name);
    if (win) win.classList.add("hidden-window");
  }
  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-open]");
    if (opener) { closeMenus(); openWindow(opener.getAttribute("data-open")); return; }
    var closer = e.target.closest("[data-close]");
    if (closer) { closeWindow(closer.getAttribute("data-close")); }
  });

  /* ---- Dragging: windows are absolutely positioned from the start,
     so dragging only changes their own left/top — nothing else moves. ---- */
  var POS_KEY = "mf-window-pos";
  var positions = {};
  try { positions = JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch (e) {}
  function savePositions() { try { localStorage.setItem(POS_KEY, JSON.stringify(positions)); } catch (e) {} }
  ["intro", "work"].forEach(function (name) {
    var win = findWindow(name);
    var pos = positions[name];
    if (win && pos && typeof pos.left === "number" && typeof pos.top === "number") {
      win.style.left = pos.left + "px";
      win.style.top = pos.top + "px";
    }
  });
  var dragWin = null, dragName = "", startX = 0, startY = 0, origLeft = 0, origTop = 0;
  document.querySelectorAll("[data-drag]").forEach(function (bar) {
    bar.addEventListener("pointerdown", function (e) {
      if (window.innerWidth <= 1100) return;
      if (e.target.closest("button")) return;
      var win = bar.closest(".window, .widget");
      if (!win || win.classList.contains("overlay-window")) return;
      var name = win.getAttribute("data-window");
      if (name !== "intro" && name !== "work") return;
      dragWin = win;
      dragName = name;
      var rect = win.getBoundingClientRect();
      var desk = el("desktop").getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left - desk.left;
      origTop = rect.top - desk.top;
      win.style.left = origLeft + "px";
      win.style.top = origTop + "px";
      win.classList.add("dragging");
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", function (e) {
      if (dragWin !== bar.closest(".window, .widget")) return;
      var win = dragWin;
      win.style.left = Math.max(0, origLeft + e.clientX - startX) + "px";
      win.style.top = Math.max(0, origTop + e.clientY - startY) + "px";
    });
    bar.addEventListener("pointerup", function () {
      if (!dragWin) return;
      positions[dragName] = {
        left: parseInt(dragWin.style.left, 10),
        top: parseInt(dragWin.style.top, 10)
      };
      savePositions();
      dragWin.classList.remove("dragging");
      dragWin = null;
    });
  });

  /* ---- Preferences (persisted) ---- */
  var PREF_KEY = "mf-site-prefs";
  var prefs = { wallpaper: "skyline", dark: false, widgets: { clocks: true, news: true, notes: true }, welcome: true };
  try {
    var saved = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    if (saved.wallpaper) prefs.wallpaper = saved.wallpaper;
    if (typeof saved.dark === "boolean") prefs.dark = saved.dark;
    if (saved.widgets) {
      for (var k in prefs.widgets) {
        if (typeof saved.widgets[k] === "boolean") prefs.widgets[k] = saved.widgets[k];
      }
    }
    if (typeof saved.welcome === "boolean") prefs.welcome = saved.welcome;
  } catch (e) {}
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

  /* Wallpaper (swaps the <img>, or hides it for solid cream) */
  function applyWallpaper(id) {
    prefs.wallpaper = id;
    document.body.classList.remove("wp-skyline", "wp-cream", "wp-wave");
    document.body.classList.add("wp-" + id);
    var img = el("wallpaper-img");
    var wp = null;
    C.wallpapers.forEach(function (w) { if (w.id === id) wp = w; });
    if (img) {
      if (wp && wp.type === "image") { img.src = wp.src; img.style.display = ""; }
      else { img.style.display = "none"; }
    }
    document.querySelectorAll("#wp-options .wp-option").forEach(function (b) {
      var active = b.getAttribute("data-wp") === id;
      b.classList.toggle("active", active);
      var ck = b.querySelector(".check");
      if (ck) ck.textContent = active ? "✓" : "";
    });
    savePrefs();
  }
  el("wp-options").innerHTML = C.wallpapers.map(function (w) {
    var sw = w.type === "solid"
      ? "background:#efe9dc;border:1px solid #d6d3d1"
      : "background-image:url('" + esc(w.src) + "')";
    return '<button class="wp-option" data-wp="' + esc(w.id) + '">' +
      '<span class="wp-swatch" style="' + sw + '"></span>' + esc(w.label) +
      '<span class="check"></span></button>';
  }).join("");

  /* Dark / light */
  function applyTheme() {
    document.body.classList.toggle("dark", prefs.dark);
    el("check-light").textContent = prefs.dark ? "" : "✓";
    el("check-dark").textContent = prefs.dark ? "✓" : "";
    savePrefs();
  }

  /* Widgets */
  function applyWidgets() {
    el("widget-clocks").style.display = prefs.widgets.clocks ? "" : "none";
    el("widget-news").style.display = prefs.widgets.news ? "" : "none";
    el("notes").style.display = prefs.widgets.notes ? "" : "none";
    el("toggle-clocks").checked = prefs.widgets.clocks;
    el("toggle-news").checked = prefs.widgets.news;
    el("toggle-notes").checked = prefs.widgets.notes;
    savePrefs();
  }
  ["clocks", "news", "notes"].forEach(function (key) {
    el("toggle-" + key).addEventListener("change", function (e) {
      prefs.widgets[key] = e.target.checked;
      applyWidgets();
    });
  });

  /* Welcome visibility */
  function applyWelcome() {
    var win = el("window-intro");
    if (win) win.style.display = prefs.welcome ? "" : "none";
    el("check-welcome").textContent = prefs.welcome ? "✓" : "";
    savePrefs();
  }

  applyWallpaper(prefs.wallpaper);
  applyTheme();
  applyWidgets();
  applyWelcome();

  /* ---- Menus ---- */
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

  /* Window menu list */
  var WINDOWS = [
    { id: "intro", label: "Welcome" },
    { id: "about", label: "About" },
    { id: "work", label: "Work" },
    { id: "projects", label: "Projects" },
    { id: "sizzle", label: "Sizzle Reel" },
    { id: "finder", label: "Finder" }
  ];
  function buildWindowList() {
    el("window-list").innerHTML = WINDOWS.map(function (w) {
      var win = findWindow(w.id);
      var open = win && !win.classList.contains("hidden-window") && win.style.display !== "none";
      return '<button data-open="' + w.id + '"><span class="check">' + (open ? "✓" : "") + "</span> " + esc(w.label) + "</button>";
    }).join("");
  }

  /* Menu actions */
  function closeAllWindows() {
    ["about", "projects", "sizzle", "finder", "wallpaper", "widgets"].forEach(closeWindow);
    closePalette();
  }
  document.addEventListener("click", function (e) {
    var act = e.target.closest("[data-action]");
    if (!act) return;
    var a = act.getAttribute("data-action");
    closeMenus();
    if (a === "open-finder") openWindow("finder");
    else if (a === "open-about") openWindow("about");
    else if (a === "open-work") openWindow("work");
    else if (a === "open-projects") openWindow("projects");
    else if (a === "open-notes") { var n = el("notes"); if (n) n.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    else if (a === "contact") openWindow("contact-note");
    else if (a === "search") openPalette();
    else if (a === "wallpaper-settings") openWindow("wallpaper");
    else if (a === "widget-settings") openWindow("widgets");
    else if (a === "toggle-welcome") { prefs.welcome = !prefs.welcome; applyWelcome(); }
    else if (a === "reset-positions") {
      positions = {};
      savePositions();
      ["intro", "work"].forEach(function (name) {
        var w = findWindow(name);
        if (w) { w.style.left = ""; w.style.top = ""; w.classList.remove("dragging"); }
      });
    }
    else if (a === "show-desktop") closeAllWindows();
    else if (a === "light") { prefs.dark = false; applyTheme(); }
    else if (a === "dark") { prefs.dark = true; applyTheme(); }
    else if (a === "close-all") closeAllWindows();
  });
  document.addEventListener("click", function (e) {
    var wp = e.target.closest("[data-wp]");
    if (wp) applyWallpaper(wp.getAttribute("data-wp"));
  });

  /* ---- Search palette ---- */
  var PALETTE_ITEMS = [
    { label: "About Marcin", hint: "Window", run: function () { openWindow("about"); } },
    { label: "Work", hint: "Window", run: function () { openWindow("work"); } },
    { label: "Projects", hint: "Window", run: function () { openWindow("projects"); } },
    { label: "Sizzle Reel", hint: "Window", run: function () { openWindow("sizzle"); } },
    { label: "Finder", hint: "Window", run: function () { openWindow("finder"); } },
    { label: "World Clock", hint: "Widget", run: function () { var w = el("widget-clocks"); if (w) w.scrollIntoView({ behavior: "smooth", block: "nearest" }); } },
    { label: "AI Signals", hint: "Widget", run: function () { var w = el("widget-news"); if (w) w.scrollIntoView({ behavior: "smooth", block: "nearest" }); } },
    { label: "Contact Marcin", hint: "Email", run: function () { openWindow("contact-note"); } },
    { label: "Wallpaper Settings", hint: "Settings", run: function () { openWindow("wallpaper"); } },
    { label: "Widget Settings", hint: "Settings", run: function () { openWindow("widgets"); } },
    { label: "Dark Appearance", hint: "View", run: function () { prefs.dark = true; applyTheme(); } },
    { label: "Light Appearance", hint: "View", run: function () { prefs.dark = false; applyTheme(); } },
    { label: "Show Desktop", hint: "View", run: closeAllWindows }
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
  el("palette-input").addEventListener("input", renderPalette);
  el("palette-input").addEventListener("keydown", function (e) {
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
  el("palette-list").addEventListener("click", function (e) {
    var li = e.target.closest("li[data-idx]");
    if (li) runPaletteItem(+li.getAttribute("data-idx"));
  });

  /* Keyboard: Cmd/Ctrl+K opens search, Esc closes things */
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
    else if (e.key === "Escape") { closeMenus(); closePalette(); }
  });
  document.addEventListener("click", function (e) {
    var pal = el("palette");
    if (!pal.classList.contains("hidden-window") && !e.target.closest("#palette") && !e.target.closest(".menu")) closePalette();
  });
})();
