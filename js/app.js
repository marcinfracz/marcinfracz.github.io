/* Marcin Fracz personal site: content injection, window dragging,
   dock, live world clocks, timeline zoom. Vanilla JS, no dependencies. */
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

  /* ---- About ---- */
  el("about-body").innerHTML =
    "<h2>" + esc(C.about.title) + "</h2>" +
    C.about.paragraphs.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");

  /* ---- Work ---- */
  el("work-note").textContent = C.work.note;
  el("timeline").innerHTML = C.work.roles.map(function (r) {
    return '<div class="timeline-item">' +
      '<div class="years">' + esc(r.years) + "</div>" +
      "<h4>" + esc(r.role) + "</h4>" +
      '<div class="company">' + esc(r.company) + "</div>" +
      "<p>" + esc(r.detail) + "</p></div>";
  }).join("");
  el("edu-list").innerHTML = C.work.education.map(function (e) {
    return "<li>" + esc(e.school) + " <span>(" + esc(e.year) + ")</span></li>";
  }).join("");

  /* ---- Projects ---- */
  el("projects-body").innerHTML =
    "<h2>" + esc(C.projects.title) + "</h2>" +
    C.projects.items.map(function (p) {
      return '<div class="project"><h4>' + esc(p.name) + "</h4><p>" + esc(p.detail) + "</p></div>";
    }).join("");

  /* ---- Widgets ---- */
  el("clocks-title").textContent = C.widgets.clocksTitle;
  el("clocks").innerHTML = C.widgets.clocks.map(function (c, i) {
    return '<div class="clock-row"><span class="city">' + esc(c.label) +
      '</span><span><span class="time" id="clock-time-' + i + '"></span> ' +
      '<span class="date" id="clock-date-' + i + '"></span></span></div>';
  }).join("");
  el("news-title").textContent = C.widgets.newsTitle;
  el("news-list").innerHTML = C.widgets.news.map(function (n) {
    return '<li><a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.label) + " &rarr;</a></li>";
  }).join("");
  el("sizzle-title").textContent = C.widgets.sizzleTitle;
  el("sizzle-note").textContent = C.widgets.sizzleNote;

  /* ---- Sticky notes ---- */
  el("note-motto").textContent = C.notes.motto;
  el("note-resume").textContent = C.notes.resumeNote;
  var email = el("note-email");
  email.textContent = C.notes.contact.email;
  email.href = "mailto:" + C.notes.contact.email;
  el("note-linkedin").textContent = C.notes.contact.linkedin.indexOf("PLACEHOLDER") === 0
    ? "LinkedIn URL coming soon."
    : C.notes.contact.linkedin;

  /* ---- Live world clocks: Intl.DateTimeFormat, no API key ---- */
  var timeFmt = {};
  var dateFmt = {};
  C.widgets.clocks.forEach(function (c) {
    timeFmt[c.timeZone] = new Intl.DateTimeFormat("en-US", {
      timeZone: c.timeZone, hour: "numeric", minute: "2-digit", second: "2-digit"
    });
    dateFmt[c.timeZone] = new Intl.DateTimeFormat("en-US", {
      timeZone: c.timeZone, weekday: "short", month: "short", day: "numeric"
    });
  });

  function tickClocks() {
    var now = new Date();
    C.widgets.clocks.forEach(function (c, i) {
      var t = el("clock-time-" + i);
      var d = el("clock-date-" + i);
      if (t) t.textContent = timeFmt[c.timeZone].format(now);
      if (d) d.textContent = dateFmt[c.timeZone].format(now);
    });
    var detroit = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Detroit", weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit"
    }).format(now);
    var top = el("topbar-clock");
    if (top) top.textContent = "Detroit " + detroit;
  }
  tickClocks();
  setInterval(tickClocks, 1000);

  /* ---- Timeline zoom ---- */
  var zoom = 1;
  var timeline = el("timeline");
  function applyZoom() {
    timeline.style.transform = "scale(" + zoom + ")";
  }
  el("zoom-in").addEventListener("click", function () {
    zoom = Math.min(zoom + 0.15, 1.6);
    applyZoom();
  });
  el("zoom-out").addEventListener("click", function () {
    zoom = Math.max(zoom - 0.15, 0.6);
    applyZoom();
  });

  /* ---- Window open / close + dock ---- */
  var dock = el("dock");
  var windows = ["intro", "about", "work", "projects"];
  var labels = { intro: "Welcome", about: "About", work: "Work", projects: "Projects" };
  dock.innerHTML = windows.map(function (w) {
    return '<button data-open="' + w + '">' + labels[w] + "</button>";
  }).join("");

  function openWindow(name) {
    var win = el("window-" + name);
    if (!win) return;
    win.classList.remove("hidden-window");
    win.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function closeWindow(name) {
    var win = el("window-" + name);
    if (win) win.classList.add("hidden-window");
  }
  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-open]");
    if (opener) { openWindow(opener.getAttribute("data-open")); return; }
    var closer = e.target.closest("[data-close]");
    if (closer) { closeWindow(closer.getAttribute("data-close")); }
  });

  /* ---- Window dragging (desktop only; disabled under 768px by CSS) ---- */
  var dragWin = null, startX = 0, startY = 0, origX = 0, origY = 0;
  document.querySelectorAll("[data-drag]").forEach(function (bar) {
    bar.addEventListener("pointerdown", function (e) {
      if (window.innerWidth <= 768) return;
      if (e.target.closest("button")) return;
      var win = bar.closest(".window");
      dragWin = win;
      var rect = win.getBoundingClientRect();
      var desk = el("desktop").getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origX = rect.left - desk.left;
      origY = rect.top - desk.top;
      win.style.position = "absolute";
      win.style.left = origX + "px";
      win.style.top = origY + "px";
      win.style.width = rect.width + "px";
      win.style.margin = "0";
      win.classList.add("dragging");
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", function (e) {
      if (dragWin !== bar.closest(".window")) return;
      var win = dragWin;
      win.style.left = (origX + e.clientX - startX) + "px";
      win.style.top = (origY + e.clientY - startY) + "px";
    });
    bar.addEventListener("pointerup", function () {
      if (dragWin) dragWin.classList.remove("dragging");
      dragWin = null;
    });
  });
})();
