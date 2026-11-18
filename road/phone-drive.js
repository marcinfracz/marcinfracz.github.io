/* Phone drive (v64 proposal): on phones the Road reads scene first.
   - each stop is one screen: the 3D scene on top, a short glance card below
   - one swipe = one stop (scroll snap), the camera drives between stops
   - summary, extra results and stories open in a bottom sheet
   - a slim chapter strip under the bar shows where you are; tap it for every stop
   Only runs under 768px with 3D on. Desktop and the no-3D page are untouched. */
(function () {
  'use strict';
  var MQ = window.matchMedia('(max-width: 767px)');
  var C = window.ROAD_CONTENT || {};
  var ERAS = C.eras || [], STOPS = C.stops || [];
  var HL_MAX = 3;
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&', '<': '<', '>': '>', '"': '"' }[c]; }); };

  function ready(fn) {
    var flow = document.getElementById('flow');
    if (flow && flow.querySelector('section')) return fn(flow);
    var mo = new MutationObserver(function () { if (flow && flow.querySelector('section')) { mo.disconnect(); fn(flow); } });
    if (flow) mo.observe(flow, { childList: true }); else document.addEventListener('DOMContentLoaded', function () { ready(fn); });
  }

  /* ---------- bottom sheet ---------- */
  var sheet, sheetBody, sheetTitle, lastFocus, home = null;
  function buildSheet() {
    sheet = document.createElement('div');
    sheet.className = 'pd-sheet'; sheet.hidden = true;
    sheet.innerHTML = '<div class="pd-veil" data-close="1"></div><div class="pd-panel" role="dialog" aria-modal="true" aria-labelledby="pd-title">'
      + '<div class="pd-grab" data-close="1" aria-hidden="true"><i></i></div>'
      + '<div class="pd-top"><p class="pd-title" id="pd-title"></p><button type="button" class="pd-x" data-close="1" aria-label="Close">×</button></div>'
      + '<div class="pd-body"></div></div>';
    document.body.appendChild(sheet);
    sheetBody = sheet.querySelector('.pd-body'); sheetTitle = sheet.querySelector('.pd-title');
    sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
    /* drag the handle down to close */
    var y0 = null, panel = sheet.querySelector('.pd-panel');
    panel.addEventListener('touchstart', function (e) { if (sheetBody.scrollTop > 0 && !e.target.closest('.pd-grab,.pd-top')) return; y0 = e.touches[0].clientY; }, { passive: true });
    panel.addEventListener('touchmove', function (e) { if (y0 == null) return; var d = e.touches[0].clientY - y0; if (d > 0) panel.style.transform = 'translateY(' + d + 'px)'; }, { passive: true });
    panel.addEventListener('touchend', function (e) { if (y0 == null) return; var d = (e.changedTouches[0].clientY - y0); y0 = null; panel.style.transform = ''; if (d > 90) closeSheet(); });
  }
  function openSheet(title, node) {
    lastFocus = document.activeElement;
    sheetTitle.textContent = title;
    if (node) { home = { node: node, parent: node.parentNode, next: node.nextSibling }; sheetBody.appendChild(node); node.hidden = false; }
    sheetBody.scrollTop = 0;
    sheet.hidden = false;
    document.documentElement.classList.add('pd-lock');
    requestAnimationFrame(function () { sheet.classList.add('on'); sheet.querySelector('.pd-x').focus({ preventScroll: true }); });
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('on');
    document.documentElement.classList.remove('pd-lock');
    setTimeout(function () {
      sheet.hidden = true;
      if (home) { home.node.hidden = true; home.parent.insertBefore(home.node, home.next); home = null; }
      sheetBody.innerHTML = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, 220);
  }

  /* ---------- glance cards ---------- */
  function shortTitle(s) {
    var p = (C.profile || {})[s.id];
    return p ? p.company : s.title;
  }
  function roleOf(s) { return s.role || s.title; }
  function nextName(a, b) {
    if (b.id === 'finale') return 'The finish';
    var P = C.profile || {}, pa = P[a.id], pb = P[b.id];
    if (pb && pa && pa.company === pb.company && pb.group) return pb.group.split(' · ')[0];
    return shortTitle(b);
  }
  /* results that do not fit the glance card move to the top of the sheet, so nothing is cut off */
  var cards = [];
  function fit() {
    cards.forEach(function (o) {
      var card = o.card, hl = card.querySelector(':scope > ul.hl');
      if (!hl) return;
      /* put back what an earlier pass moved, then measure again */
      while (o.moved.length) hl.appendChild(o.moved.pop());
      while ((hl.scrollHeight > hl.clientHeight + 1 || card.scrollHeight > card.clientHeight + 1) && hl.children.length > 1) { var li = hl.lastElementChild; o.moved.push(li); o.spill.insertBefore(li, o.spill.firstChild); }
      o.spill.hidden = !o.spill.children.length;
    });
  }

  function glance(sec, i) {
    var card = sec.querySelector('.fcard');
    if (!card || !card.querySelector('.co-head')) return;
    var s = STOPS[i] || {};
    var more = document.createElement('div');
    more.className = 'pd-more'; more.hidden = true;
    /* the summary leads the sheet */
    var sum = card.querySelector('.summary'); if (sum) more.appendChild(sum);
    var spill = document.createElement('ul'); spill.className = 'hl'; spill.hidden = true; more.appendChild(spill);
    /* results past the first three move to the sheet */
    var hl = card.querySelector('ul.hl');
    if (hl) {
      var extra = [].slice.call(hl.children, HL_MAX);
      if (extra.length) { var ul = document.createElement('ul'); ul.className = 'hl'; extra.forEach(function (li) { ul.appendChild(li); }); more.appendChild(ul); }
    }
    /* stories, their header and the read-more block */
    var pills = card.querySelector('.sec-h .wk-pills');
    var secH = card.querySelector('.sec-h'); var cal = card.querySelector('.card-callouts'); var det = card.querySelector('details');
    var nStories = cal ? cal.children.length : 0;
    if (secH) { if (pills) pills.remove(); more.appendChild(secH); secH.textContent = 'Stories'; }
    if (cal) more.appendChild(cal);
    if (det) { det.open = true; more.appendChild(det); }
    card.appendChild(more);

    var foot = document.createElement('div'); foot.className = 'pd-foot';
    var label = nStories ? 'Stories <span class="pd-n">' + nStories + '</span>' : 'Read more';
    foot.innerHTML = '<button type="button" class="pd-open">' + label + '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>';
    /* one demo sits beside Stories; two or more get one Demos button and their own row in the sheet */
    var nPills = pills ? pills.children.length : 0;
    if (nPills === 1) foot.appendChild(pills);
    else if (nPills > 1) {
      var dh = document.createElement('p'); dh.className = 'sec-h'; dh.textContent = 'Live demos';
      var dbox = document.createElement('div'); dbox.className = 'pd-demos'; dbox.appendChild(pills);
      var before = more.querySelector(':scope > .sec-h') || more.querySelector(':scope > details');
      more.insertBefore(dh, before); more.insertBefore(dbox, before);
      var db = document.createElement('button'); db.type = 'button'; db.className = 'pd-demo-btn';
      db.innerHTML = '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="currentColor" d="M5 3.2v9.6L12.6 8z"/></svg>Live demos <span class="pd-n">' + nPills + '</span>';
      db.addEventListener('click', function () { openSheet(shortTitle(s) + ' · ' + roleOf(s), more); });
      foot.appendChild(db);
    }
    card.appendChild(foot);
    foot.querySelector('.pd-open').addEventListener('click', function () { openSheet(shortTitle(s) + ' · ' + roleOf(s), more); });

    var nx = STOPS[i + 1];
    if (nx) {
      var hint = document.createElement('button');
      hint.type = 'button'; hint.className = 'pd-next';
      hint.innerHTML = '<span>Next: ' + esc(nextName(s, nx)) + '</span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
      hint.addEventListener('click', function () { goStop(i + 1); });
      sec.appendChild(hint);
    }
    sec.classList.add('pd-g');
    cards.push({ card: card, spill: spill, moved: [] });
  }

  /* ---------- chapter strip ---------- */
  var strip, segs = [], cap, secs = [], cur = -1;
  function buildStrip() {
    strip = document.createElement('button');
    strip.type = 'button'; strip.className = 'pd-strip'; strip.setAttribute('aria-label', 'All stops');
    strip.innerHTML = '<span class="pd-segs">' + ERAS.map(function (e) { return '<i style="--c:' + esc(e.color) + '"><b></b></i>'; }).join('') + '</span><span class="pd-cap"></span>';
    document.body.appendChild(strip);
    segs = [].slice.call(strip.querySelectorAll('.pd-segs i'));
    cap = strip.querySelector('.pd-cap');
    strip.addEventListener('click', openList);
  }
  function eraIndex(s) { for (var k = 0; k < ERAS.length; k++) if (ERAS[k].id === s.era) return k; return -1; }
  function setCur(i) {
    if (i === cur) return; cur = i;
    var s = STOPS[i] || {}, ek = eraIndex(s);
    document.documentElement.classList.toggle('pd-at-start', i === 0);
    var last = STOPS.length - 1;
    segs.forEach(function (g, k) {
      var stopsIn = STOPS.filter(function (x) { return x.era === ERAS[k].id; });
      var pos = stopsIn.indexOf(s);
      var f = i === last ? 1 : k < ek ? 1 : k > ek || ek < 0 ? 0 : (pos + 1) / stopsIn.length;
      g.querySelector('b').style.transform = 'scaleX(' + f + ')';
      g.classList.toggle('on', k === ek);
    });
    var e = ERAS[ek];
    cap.innerHTML = e ? '<b style="color:' + esc(e.color) + '">' + e.n + '</b> ' + esc(e.short || e.label) + '<em>' + i + ' / ' + (last - 1) + '</em>' : (i === last ? 'The finish' : 'The start');
    strip.style.setProperty('--c', e ? e.color : 'var(--accent)');
  }
  function goStop(i) { var t = secs[i]; if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function openList() {
    var box = document.createElement('div'); box.className = 'pd-list';
    var html = '', lastEra = null;
    // Mobile list: reverse chronological so latest role is at the top (desktop drive order unchanged)
    var ordered = STOPS.slice().reverse();
    ordered.forEach(function (s) {
      var i = STOPS.indexOf(s);
      var ek = eraIndex(s);
      if (ek >= 0 && s.era !== lastEra) { var e = ERAS[ek]; html += '<p class="pd-lh" style="--c:' + esc(e.color) + '"><b>' + e.n + '</b>' + esc(e.label) + '<span>' + esc(e.years) + '</span></p>'; lastEra = s.era; }
      if (ek < 0) lastEra = null;
      var t = s.id === 'start' ? 'The start' : s.id === 'finale' ? 'The finish' : shortTitle(s);
      var sub = s.id === 'start' || s.id === 'finale' ? '' : roleOf(s);
      html += '<button type="button" class="pd-li' + (i === cur ? ' on' : '') + '" data-i="' + i + '"><span class="pd-lt">' + esc(t) + '</span>' + (sub ? '<span class="pd-ls">' + esc(sub) + '</span>' : '') + '</button>';
    });
    box.innerHTML = html;
    box.addEventListener('click', function (e) { var b = e.target.closest('.pd-li'); if (!b) return; var i = +b.dataset.i; closeSheet(); setTimeout(function () { goStop(i); }, 240); });
    openSheet('Every stop', box);
    home = null; /* the list is rebuilt each time */
  }

  /* ---------- wire it up ---------- */
  function track() {
    var mid = innerHeight * 0.45, best = 0;
    for (var k = 0; k < secs.length; k++) { if (secs[k].getBoundingClientRect().top <= mid) best = k; }
    setCur(best);
  }

  ready(function (flow) {
    if (document.documentElement.classList.contains('no-gl')) return;
    secs = [].slice.call(flow.querySelectorAll(':scope > section'));
    secs.forEach(glance);
    buildSheet(); buildStrip();
    document.documentElement.classList.add('pd-on');
    var tick = false;
    document.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; track(); }); } }, { passive: true, capture: true });
    addEventListener('resize', function () { fit(); track(); });
    MQ.addEventListener ? MQ.addEventListener('change', function () { if (!MQ.matches) closeSheet(); }) : 0;
    fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    /* if 3D fails later, fall back to the plain list: show everything in place */
    new MutationObserver(function (_, mo) {
      if (!document.documentElement.classList.contains('no-gl')) return;
      mo.disconnect(); closeSheet();
      document.documentElement.classList.remove('pd-on');
      cards.forEach(function (o) { while (o.moved.length) o.card.querySelector(':scope > ul.hl').appendChild(o.moved.pop()); });
      flow.querySelectorAll('.pd-open, .pd-demo-btn, .pd-next').forEach(function (n) { n.remove(); });
      flow.querySelectorAll('.pd-more').forEach(function (n) { n.hidden = false; });
      if (strip) strip.remove();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    track();
    window.MFPhoneDrive = { open: function (i) { var b = secs[i] && secs[i].querySelector('.pd-open'); if (b) b.click(); }, close: closeSheet, list: openList, go: goStop };
  });
})();
