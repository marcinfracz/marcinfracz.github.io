/* The Road: page app. Builds the 3D world, places one scene per stop, and
   drives the camera left to right (laptop and tablet) or top to bottom (phone). */
import { THREE, TOKENS, setTheme, tok, roadZ, smooth, clamp, lerp } from './core.js';
import { buildWorld } from './world.js?v=43';
import { buildStage } from './stages.js?v=43';
import { planCities, cityFootprints, buildCities } from './landmarks.js?v=43';
import { flagURL, COUNTRY } from './marks.js?v=28';

const C = window.ROAD_CONTENT;
const UI = C.ui;
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => innerWidth < 768;

/* ---------- chapters sized by their real years ---------- */
const ERA_COLORS = { engineering: '#C8693A', chevrolet: '#D9A21B', launch: '#2E9C8F', connected: '#7357D8', shanghai: '#D64545', onstar: '#1F8FD1', now: '#2FA36B' };
const MIN_SP = 72, PER_YEAR = 58;
const startYr = C.eras.map(e => parseInt(e.years, 10));
const ERAS = [];
{
  let X = 86;
  C.eras.forEach((e, k) => {
    const dur = k < C.eras.length - 1 ? Math.max(0.5, startYr[k + 1] - startYr[k]) : 0.9;
    const n = C.stops.filter(s => s.era === e.id).length;
    const len = Math.max(n * MIN_SP, dur * PER_YEAR);
    ERAS.push({ id: e.id, k, n: e.n, name: e.short || e.label, label: e.label, years: e.years, dur, count: n, x0: X, x1: X + len, color: e.color || ERA_COLORS[e.id] || '#E8A33D' });
    X += len;
  });
}
const ERA_END = ERAS.length ? ERAS[ERAS.length - 1].x1 : 86;
const seen = {};
const STOPS = C.stops.map((s, i) => {
  let x;
  const e = s.era && ERAS.find(q => q.id === s.era);
  if (e) { const j = seen[e.id] = (seen[e.id] || 0) + 1; x = e.x0 + (e.x1 - e.x0) * (j - 0.5) / e.count; }
  else x = i === 0 ? 40 : ERA_END + 46;
  return Object.assign({}, s, { i, x, region: s.region || (i === 0 ? 'us' : 'now') });
});
const CITY_VIEW = { traverse: 1.1, kettering: 1, chrysler: 0.7, ross: 1, equinox: 1.4, 'trailblazer-encore': 1, shanghai: 1 };
const XMIN = 0, XMAX = STOPS[STOPS.length - 1].x + 80;
window.__STOPS = STOPS.map(s => [s.id, Math.round(s.x), s.region]);
const ERA = Object.fromEntries(C.eras.map(e => [e.id, e]));
const ERAX = Object.fromEntries(ERAS.map(e => [e.id, e]));
const eraFirst = {}; STOPS.forEach(s => { if (s.era && !(s.era in eraFirst)) eraFirst[s.era] = s.i; });

function stopFromHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')).toLowerCase();
  if (!h) return -1;
  const s = STOPS.find(s => s.id === h || (s.alias || []).includes(h));
  if (s) return s.i;
  if (h in eraFirst) return eraFirst[h];
  return -1;
}

/* ---------- theme (shared with the desktop page) ---------- */
const PREF = 'mf-site-prefs-v6';
function savedDark() { try { const p = JSON.parse(localStorage.getItem(PREF) || '{}'); return typeof p.dark === 'boolean' ? p.dark : null; } catch (e) { return null; } }
function saveDark(d) { try { const p = JSON.parse(localStorage.getItem(PREF) || '{}'); p.dark = d; localStorage.setItem(PREF, JSON.stringify(p)); } catch (e) {} }
let themeName = /^(dusk|dark)$/.test(root.getAttribute('data-theme') || '') ? 'dusk' : 'day';

/* ---------- shared text builders ---------- */
function winsHTML(s) {
  if (!s.wins || !s.wins.length) return '';
  return '<ul class="wins">' + s.wins.map(w => `<li><span class="big">${esc(w.big)}</span><span class="tx">${esc(w.text)}</span></li>`).join('') + '</ul>';
}
const LETTER = k => String(k + 1);
const splitCallout = t => { const k = t.indexOf(': '); return k > 0 ? [t.slice(0, k), t.charAt(k + 2).toUpperCase() + t.slice(k + 3)] : [t.replace(/\.$/, ''), '']; };
function calloutsHTML(s) {
  if (!s.callouts || !s.callouts.length) return '';
  return '<ol class="card-callouts">' + s.callouts.map((c, k) => { const [lb, dt] = splitCallout(c.text); return `<li data-k="${k}"><span class="num">${LETTER(k)}</span><span><b>${esc(lb)}</b>${dt ? ' ' + esc(dt) : ''}</span></li>`; }).join('') + '</ol>';
}
function itemsHTML(s) {
  if (!s.callouts || !s.callouts.length) return '';
  return '<ol class="items">' + s.callouts.map((c, k) => { const [lb, dt] = splitCallout(c.text);
    return `<li><button type="button" class="item" data-k="${k}"><span class="lt">${LETTER(k)}</span><span class="ib"><b>${esc(lb)}</b>${dt ? `<span>${esc(dt)}</span>` : ''}</span><span class="go" aria-hidden="true">›</span></button></li>`; }).join('') + '</ol>';
}
/* one model for every stop's box: header, summary, highlights, numbered stories */
const PROF = C.profile || {};
const SQUARE = new Set(['generalmotors', 'onstar', 'kettering', 'chrysler-group']);
/* round 18: the real full-colour SAIC-GM, PATAC and SAIC-GM-Wuling marks sit on a white chip, never tinted */
const COLOR = new Set(['sgm', 'patac', 'sgmw', 'ross-stack', 'ideaconnection']);
/* round 27: the round full-colour Kettering seal sits on its own, no chip */
const SEAL = new Set(['kettering-seal']);
const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function logoHTML(p) {
  if (p.logo) return `<span class="co-logo${SQUARE.has(p.logo) ? ' sq' : ''}${COLOR.has(p.logo) ? ' color' : ''}${SEAL.has(p.logo) ? ' seal' : ''}"><img src="assets/road/logos/${p.logo}.png?v=38" alt="${esc(p.company)}"></span>`;
  return `<span class="co-logo mono" aria-hidden="true">${esc(p.mono || p.company.charAt(0))}</span>`;
}
const MARK_NAME = { nissan: 'Nissan', chevrolet: 'Chevrolet', buick: 'Buick', cadillac: 'Cadillac', onstar: 'OnStar', sgm: 'SAIC-GM', sgmw: 'SAIC-GM-Wuling', patac: 'PATAC, Pan Asia Technical Automotive Center', momenta: 'Momenta', ideaconnection: 'IdeaConnection' };
/* round 16: product logos live inside the story that features them, never in the main box */
const DISNEY_EARS = '<svg class="m-ears" viewBox="0 0 40 30" role="img" aria-label="Disney Institute"><title>Disney Institute</title><circle cx="20" cy="19" r="10" fill="currentColor"/><circle cx="8" cy="7.5" r="6.6" fill="currentColor"/><circle cx="32" cy="7.5" r="6.6" fill="currentColor"/></svg>';
function storyMarksHTML(p, k) {
  const ms = p.storyMarks && p.storyMarks[k];
  if (!ms || !ms.length) return '';
  return '<div class="st-marks">' + ms.map(m => m === 'disney'
    ? `<span class="st-ears">${DISNEY_EARS}<span>Disney Institute</span></span>`
    : `<img class="m-${m}${COLOR.has(m) ? ' color' : ''}" src="assets/road/logos/${m}.png" alt="${esc(MARK_NAME[m] || m)}" title="${esc(MARK_NAME[m] || m)}" loading="lazy">`).join('') + '</div>';
}
function headHTML(s, p, tag) {
  const e = s.era && ERA[s.era];
  return (s.milestone ? `<p class="ms-badge"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"/></svg>Milestone · ${esc(s.milestone)}</p>` : '')
    + `<div class="co-head">${logoHTML(p)}<div class="co-txt">`
    + (e ? `<span class="co-era" title="${esc(e.label)}">${e.n} · ${esc(e.short || e.label)}</span>` : '') + `<p class="co-name">${esc(p.company)}</p>${p.group ? `<p class="co-group">${p.group.split(' · ').map(x => `<span class="nw">${esc(x)}</span>`).join(' · ')}</p>` : ''}</div></div>`
    + `<${tag} class="co-role">${esc(s.role || s.title)}</${tag}><p class="meta">${metaLine(s)}</p>`;
}
/* round 14: the work you can open at this stop (Work & Tools page, synthetic data) */
const WORK = C.work || {};
/* round 16: the work you can open is a small pill beside the stories, not a card */
const WK_ICON = {
  demo: '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="currentColor" d="M5 3.2v9.6L12.6 8z"/></svg>',
  kit: '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M2.5 5.5h11v7h-11zM6 5.5V3.5h4v2M2.5 8.5h11"/></svg>'
};
const wkKind = x => /kit/i.test(x.pill || '') ? 'kit' : 'demo';
function workPills(id) {
  const w = WORK[id]; if (!w || !w.length) return '';
  /* round 27: the same pulse and icon as the matching marker in the scene; hovering one lights the other */
  return '<span class="wk-pills">' + w.map((x, j) => `<a class="wk-pill" data-w="${j}" href="${esc(x.href)}" title="${esc(x.title + ': ' + x.text + ' (' + (UI.workNote || 'Synthetic data') + ')')}" aria-label="${esc((x.pill || UI.workPill || 'Live demo') + ': ' + x.title)}">${WK_ICON[wkKind(x)]}${esc(x.pill || UI.workPill || 'Live demo')}</a>`).join('') + '</span>';
}
function hlHTML(p) { return p.hl && p.hl.length ? '<ul class="hl">' + p.hl.map(x => `<li>${md(x)}</li>`).join('') + '</ul>' : ''; }
function storyListHTML(s, p) {
  if (!s.callouts || !s.callouts.length) return '';
  return `<p class="sec-h">Stories ${workPills(s.id)}</p><ol class="card-callouts">` + s.callouts.map((c, k) => `<li><span class="num">${LETTER(k)}</span><span><b>${esc(splitCallout(c.text)[0])}</b> ${md((p.stories || [])[k] || splitCallout(c.text)[1])}${storyMarksHTML(p, k)}</span></li>`).join('') + '</ol>';
}
function flagsHTML(s) {
  if (!s.flags || !s.flags.length) return '';
  return '<ul class="flags">' + s.flags.map(([c, when, what, cities]) => `<li title="${esc(what || '')}"${cities ? ' class="trip"' : ''}><img src="${flagURL(c)}" alt="" width="24" height="16"><span><b>${esc(COUNTRY[c] || c)}</b> ${cities ? `${esc(cities)} · ` : ''}${esc(when)}</span></li>`).join('') + '</ul>';
}
function metaLine(s) { return [s.place, s.span].filter(Boolean).map(esc).join(' · '); }
function moreHTML(s, asDetails) {
  const m = s.more; if (!m) return '';
  const art = m.art ? `<div class="art" role="img" aria-label="Line drawing" style="-webkit-mask-image:url(assets/road/art-${m.art}.png);mask-image:url(assets/road/art-${m.art}.png)"></div>` : '';
  const blocks = (m.blocks || []).map(b => `<h3>${esc(b.h)}</h3><p>${esc(b.p)}</p>`).join('');
  const src = (m.sources && m.sources.length) ? `<div class="sources"><h3>${esc(UI.sources)}</h3>` + m.sources.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join('') + '</div>' : '';
  if (asDetails) return `<details><summary>${esc(m.title || UI.more)}</summary>${blocks}${src}</details>`;
  return `${art}<h2>${esc(m.title || UI.more)}</h2>${blocks}${src}`;
}
function eraTag(s) { const e = s.era && ERA[s.era]; return e ? `${e.n}. ${esc(e.short || e.label)}` : ''; }

/* ---------- WebGL check ---------- */
function hasGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

/* ======================================================================
   Vertical story (phones, and any browser without 3D)
   ====================================================================== */
function buildFlow(withGL) {
  const flow = $('#flow');
  const parts = [];
  if (!withGL) parts.push(`<p class="gl-note">${esc(UI.noGL)}</p>`);
  STOPS.forEach(s => {
    let inner = '';
    const p = PROF[s.id];
    if (p) {
      inner += headHTML(s, p, 'h2') + flagsHTML(s) + `<p class="summary">${esc(p.summary)}</p>` + hlHTML(p) + storyListHTML(s, p);
      parts.push(`<section id="m-${s.id}" data-i="${s.i}"${s.milestone ? ' class="ms"' : ''}><div class="fcard">${inner}</div></section>`);
      return;
    }
    const kick = s.era ? eraTag(s) : esc(s.kicker || '');
    inner += `<p class="kicker">${kick}</p>`;
    inner += s.i === 0 ? `<h1>${esc(s.title)}</h1>` : `<h2>${esc(s.title)}</h2>`;
    if (s.role) inner += `<p class="role">${esc(s.role)}</p>`;
    const meta = metaLine(s); if (meta) inner += `<p class="meta">${meta}</p>`;
    if (s.what) inner += `<p class="what">${esc(s.what)}</p>`;
    inner += flagsHTML(s);
    if (s.i === 0) inner += `<div class="card-actions"><button class="btn tour-btn" type="button" data-act="tour">Show me around</button></div>`;
    inner += winsHTML(s) + calloutsHTML(s);
    if (s.reel) inner += `<div class="reel"><video src="${esc(s.reel.src)}" ${s.reel.poster ? `poster="${esc(s.reel.poster)}"` : ''} controls playsinline preload="none" aria-label="${esc(s.reel.label)}"></video></div>`;
    if (s.reel) inner += `<div class="card-actions"><a class="btn primary" href="index.html">${esc(UI.back)}</a><a class="btn" href="${esc(UI.resumeHref)}" target="_blank" rel="noopener">${esc(UI.resume)}</a></div>`;
    inner += moreHTML(s, true);
    parts.push(`<section id="m-${s.id}" data-i="${s.i}"><div class="fcard">${inner}</div></section>`);
  });
  flow.innerHTML = parts.join('');
}

/* headshot sticker: round 27, always the blue-gray headshot used on the desktop page */
const HEADSHOT = 'assets/headshots/pro-blue-gray-avatar.jpg';
(function () {
  const face = document.querySelector('.bar-title .mono');
  if (!face) return;
  face.classList.add('face'); face.textContent = '';
  const img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = HEADSHOT; face.appendChild(img);
})();
/* round 27: the large start photo flies into the name pill when the drive starts, and back at the start */
/* v39: one smooth move. The photo is drawn at its larger size and scaled between the two spots,
   with no arc, so it stays sharp and glides straight between the start box and the name pill. */
function flyPhoto(from, to) {
  if (!from || !to) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !document.body.animate) return;
  const L = a.width >= b.width ? a : b;
  const at = q => `translate(${q.left - L.left}px, ${q.top - L.top}px) scale(${q.width / L.width})`;
  const f = new Image(); f.src = HEADSHOT; f.alt = ''; f.className = 'fly-photo';
  Object.assign(f.style, { left: L.left + 'px', top: L.top + 'px', width: L.width + 'px', height: L.height + 'px', transformOrigin: '0 0', transform: at(a) });
  document.body.appendChild(f);
  from.style.visibility = 'hidden'; to.style.visibility = 'hidden';
  const an = f.animate([{ transform: at(a) }, { transform: at(b) }], { duration: 640, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  let fin = false;
  const done = () => { if (fin) return; fin = true; to.style.visibility = ''; from.style.visibility = ''; f.remove(); };
  an.onfinish = done; setTimeout(done, 900);
}

/* page links (Desktop, Road) go by script, so a host frame that takes over plain links (the private
   preview does) can't stop them. If the host blocks the move itself, the Desktop opens full screen in place. */
let pageVeil = null;
function showPage(u) {
  if (!pageVeil) {
    pageVeil = document.createElement('div'); pageVeil.className = 'pg-veil';
    pageVeil.innerHTML = `<iframe title="Desktop" allow="fullscreen; autoplay" allowfullscreen></iframe><button class="pg-back" type="button">‹ The Road</button>`;
    document.body.appendChild(pageVeil);
    pageVeil.querySelector('.pg-back').addEventListener('click', () => { pageVeil.hidden = true; document.documentElement.classList.remove('rs-open'); });
  }
  const f = pageVeil.querySelector('iframe'); if (f.getAttribute('src') !== u) f.setAttribute('src', u);
  pageVeil.hidden = false; document.documentElement.classList.add('rs-open');
}
function goPage(href) {
  const u = new URL(href, location.href).href;
  let left = false; const mark = () => { left = true; };
  addEventListener('beforeunload', mark, { once: true }); addEventListener('pagehide', mark, { once: true });
  try { location.assign(u); } catch (err) {}
  setTimeout(() => { if (!left) showPage(u); }, 900);
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
  if (!/^(index|desktop)\.html(#[\w-]*)?$/.test(a.getAttribute('href'))) return;
  e.preventDefault(); goPage(a.getAttribute('href'));
});

/* resume: a floating sheet over a dimmed page, with a PDF download */
(function () {
  const PDF = 'assets/resume.pdf', PAGES = ['assets/resume/page-1.png', 'assets/resume/page-2.png'];
  let veil = null, lastFocus = null;
  function build() {
    veil = document.createElement('div'); veil.className = 'rs-veil'; veil.hidden = true;
    veil.setAttribute('role', 'dialog'); veil.setAttribute('aria-modal', 'true'); veil.setAttribute('aria-label', 'Resume');
    veil.innerHTML = `<div class="rs-sheet"><div class="rs-bar"><span class="rs-t">Marcin Fracz · Resume</span>`
      + `<a class="rs-dl" href="${PDF}" download="Marcin-Fracz-Resume.pdf"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>Download PDF</a>`
      + `<button class="rs-x" type="button" aria-label="Close the resume">×</button></div>`
      + `<div class="rs-pages">${PAGES.map((u, i) => `<img src="${u}" alt="Resume, page ${i + 1} of ${PAGES.length}" width="1445" height="1870">`).join('')}</div></div>`;
    document.body.appendChild(veil);
    veil.addEventListener('click', e => { if (e.target === veil) close(); });
    veil.querySelector('.rs-x').addEventListener('click', close);
  }
  function open() {
    if (!veil) build();
    lastFocus = document.activeElement;
    veil.hidden = false; document.documentElement.classList.add('rs-open');
    requestAnimationFrame(() => veil.classList.add('on'));
    veil.querySelector('.rs-x').focus({ preventScroll: true });
  }
  function close() {
    if (!veil || veil.hidden) return;
    veil.classList.remove('on'); document.documentElement.classList.remove('rs-open');
    setTimeout(() => { veil.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href$="resume.pdf"]');
    if (!a || a.classList.contains('rs-dl') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); open();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && veil && !veil.hidden) { e.stopImmediatePropagation(); close(); } }, true);
  window.__resume = { open, close };
})();

/* v43: live demos open in a browser window floating over the Road, like the Desktop's.
   Closing it (×, the red dot, Esc, a click outside or the browser's Back button) returns to the
   same spot on the Road. Phones keep the full page in a new tab. */
(function () {
  let veil = null, frame = null, full = null, lastFocus = null, pushed = false;
  const phone = () => matchMedia('(max-width: 767px)').matches;
  function build() {
    veil = document.createElement('div'); veil.className = 'rs-veil wk-veil fb-veil'; veil.hidden = true;
    veil.setAttribute('role', 'dialog'); veil.setAttribute('aria-modal', 'true'); veil.setAttribute('aria-label', 'Live demos');
    veil.innerHTML = `<div class="fb-win"><div class="fb-bar">`
      + `<button class="fb-dot r" type="button" data-fb="close" aria-label="Close live demos" title="Close"></button><span class="fb-dot y" aria-hidden="true"></span><button class="fb-dot g" type="button" data-fb="full" aria-label="Open live demos as a full page" title="Full page"></button>`
      + `<button class="fb-btn" type="button" data-fb="close" aria-label="Back to the Road" title="Back to the Road">‹</button>`
      + `<button class="fb-btn" type="button" disabled aria-hidden="true" tabindex="-1">›</button>`
      + `<button class="fb-btn" type="button" data-fb="reload" aria-label="Reload" title="Reload">↻</button>`
      + `<span class="fb-tab"><span>Live demos</span><button class="fb-x" type="button" data-fb="close" aria-label="Close live demos" title="Close">×</button></span>`
      + `<span class="fb-sp"></span>`
      + `<a class="fb-btn fb-full" href="work/brag-book.html" target="_blank" rel="noopener" aria-label="Open as a full page" title="Open as a full page">↗</a></div>`
      + `<iframe class="fb-frame" title="Live demos" allow="fullscreen" allowfullscreen></iframe></div>`;
    document.body.appendChild(veil);
    frame = veil.querySelector('iframe'); full = veil.querySelector('.fb-full');
    veil.addEventListener('click', e => {
      if (e.target === veil) { close(); return; }
      const b = e.target.closest('[data-fb]'); if (!b) return;
      const act = b.getAttribute('data-fb');
      if (act === 'close') close();
      else if (act === 'reload') { try { frame.contentWindow.location.reload(); } catch (err) { frame.src = frame.src; } }
      else if (act === 'full') { window.open(full.href, '_blank', 'noopener'); }
    });
  }
  function open(href) {
    const u = new URL(href || 'work/brag-book.html', location.href).href;
    if (phone()) { window.open(u, '_blank', 'noopener'); return; }
    if (!veil) build();
    lastFocus = document.activeElement;
    if (frame.getAttribute('src') !== u) frame.setAttribute('src', u);
    full.href = u;
    if (!veil.hidden) return;
    veil.hidden = false; document.documentElement.classList.add('rs-open');
    requestAnimationFrame(() => veil.classList.add('on'));
    try { history.pushState({ mfDemos: 1 }, '', location.href); pushed = true; } catch (e) { pushed = false; }
    veil.querySelector('.fb-x').focus({ preventScroll: true });
  }
  function hide() {
    if (!veil || veil.hidden) return;
    veil.classList.remove('on'); document.documentElement.classList.remove('rs-open');
    setTimeout(() => { veil.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function close() {
    if (!veil || veil.hidden) return;
    if (pushed) { pushed = false; history.back(); } /* popstate hides it */
    else hide();
  }
  addEventListener('popstate', () => { if (veil && !veil.hidden) { pushed = false; hide(); } });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href*="brag-book.html"]');
    if (!a || a.classList.contains('fb-full') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); open(a.getAttribute('href'));
  }, true); /* v45b: capture, so the page's base target="_top" rule never sends a demo or kit full page */
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && veil && !veil.hidden) { e.stopImmediatePropagation(); close(); } }, true);
  /* links inside the demos page: back to the Road closes the window; other pages of the site open here */
  addEventListener('message', e => {
    if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow) return;
    const m = e.data && e.data.mfRoad; if (!m) return;
    let u; try { u = new URL(m.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    const after = () => {
      if (/\/road\.html$/.test(u.pathname)) { if (u.hash && u.hash !== location.hash) location.hash = u.hash; }
      else if (/resume\.pdf$/.test(u.pathname) && window.__resume) window.__resume.open();
      else if (/\/(index\.html)?$/.test(u.pathname) && u.hash === '#contact' && window.__contact) window.__contact.open();
      else location.href = u.href;
    };
    if (pushed) { pushed = false; addEventListener('popstate', function once() { removeEventListener('popstate', once); setTimeout(after, 0); }); history.back(); }
    else { hide(); after(); }
  });
  window.__work = { open, close };
})();

/* contact: a small sheet over the Road, so Contact never leaves the page */
(function () {
  const EMAIL = UI.contactEmail || '', LI = UI.linkedin || '';
  let veil = null, lastFocus = null;
  function build() {
    veil = document.createElement('div'); veil.className = 'rs-veil ct-veil'; veil.hidden = true;
    veil.setAttribute('role', 'dialog'); veil.setAttribute('aria-modal', 'true'); veil.setAttribute('aria-label', 'Contact');
    veil.innerHTML = `<div class="rs-sheet ct-sheet"><div class="rs-bar"><span class="rs-t">Contact</span>`
      + `<button class="rs-x" type="button" aria-label="Close contact">×</button></div>`
      + `<div class="ct-body"><h2>Work with me</h2><p class="ct-sub">Exploring new leadership opportunities in automotive strategy, product and AI.</p>`
      + `<form class="ct-form" novalidate><label>Name<input name="name" type="text" autocomplete="name" required></label>`
      + `<label>Email<input name="email" type="email" autocomplete="email" required></label>`
      + `<label>Topic<select name="topic"><option>Job opportunity</option><option>Collaboration</option><option>Advisory</option><option>Speaking</option><option>Something else</option></select></label>`
      + `<label>Message<textarea name="message" rows="4" required></textarea></label>`
      + `<p class="ct-err" hidden>Please add your name, a valid email and a message.</p>`
      + `<button class="ct-send" type="submit">Send</button></form>`
      + `<p class="ct-alt">Prefer email? <a href="mailto:${EMAIL}">${esc(EMAIL)}</a>${LI ? ` · <a href="${LI}" target="_blank" rel="noopener">LinkedIn</a>` : ''}</p></div></div>`;
    document.body.appendChild(veil);
    veil.addEventListener('click', e => { if (e.target === veil) close(); });
    veil.querySelector('.rs-x').addEventListener('click', close);
    const f = veil.querySelector('form');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const ok = f.name.value.trim() && /\S+@\S+\.\S+/.test(f.email.value) && f.message.value.trim();
      f.querySelector('.ct-err').hidden = !!ok; if (!ok) return;
      const subject = 'Website contact: ' + f.topic.value;
      const body = 'Name: ' + f.name.value + '\nEmail: ' + f.email.value + '\n\n' + f.message.value;
      location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }
  function open() {
    if (!veil) build();
    lastFocus = document.activeElement;
    veil.hidden = false; document.documentElement.classList.add('rs-open');
    requestAnimationFrame(() => veil.classList.add('on'));
    setTimeout(() => { const i = veil.querySelector('input[name=name]'); if (i && !matchMedia('(pointer: coarse)').matches) i.focus({ preventScroll: true }); }, 60);
  }
  function close() {
    if (!veil || veil.hidden) return;
    veil.classList.remove('on'); document.documentElement.classList.remove('rs-open');
    setTimeout(() => { veil.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href$="#contact"], #contact-link');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); open();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && veil && !veil.hidden) { e.stopImmediatePropagation(); close(); } }, true);
  if (location.hash === '#contact') setTimeout(open, 300);
  window.__contact = { open, close };
})();

/* ======================================================================
   3D page
   ====================================================================== */
const withGL = hasGL();
buildFlow(withGL);
if (!withGL) {
  root.classList.add('no-gl');
  bindThemeButton(null);
} else {
  start();
}

function bindThemeButton(apply) {
  $('#theme-btn').addEventListener('click', () => {
    themeName = themeName === 'day' ? 'dusk' : 'day';
    root.setAttribute('data-theme', themeName);
    saveDark(themeName === 'dusk');
    if (apply) apply();
  });
}

function start() {
  const canvas = $('#world');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    root.classList.add('no-gl'); bindThemeButton(null); return;
  }
  const lite = (navigator.hardwareConcurrency || 8) <= 4 || isPhone();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 170, 420);
  scene.background = new THREE.Color();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 260;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  const sunOff = new THREE.Vector3(-40, 90, 75), sunC = new THREE.Vector3();
  const sunR = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), sunOff.clone().normalize()).normalize();
  const sunU = new THREE.Vector3().crossVectors(sunOff.clone().normalize(), sunR).normalize();
  const sunTex = (sc.right - sc.left) / sun.shadow.mapSize.x, sunTexV = (sc.top - sc.bottom) / sun.shadow.mapSize.y;

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 900);
  if (/[?&]qa\b/.test(location.search)) window.__cam = camera;

  /* world and scenes */
  const cities = planCities(STOPS); cityFootprints(cities);
  const world = buildWorld(scene, { stops: STOPS, xMin: XMIN, xMax: XMAX, lite, eras: ERAS, cities });
  const stages = STOPS.map(s => {
    const base = new THREE.Vector3(s.x, 0, roadZ(s.x) - 22);
    const st = buildStage(scene, s.scene, base, { lookoutY: world.lookoutY, height: world.height, base });
    st.k = 0;
    return st;
  });
  /* the cities keep their streets and blocks off each stop's own scene */
  // each stage's real footprint, piece by piece, so the towns can build right up to it
  const stageBoxes = [];
  stages.forEach(st => { st.group.updateMatrixWorld(true); const u = new THREE.Box3(); st.group.traverse(o => { if (!o.isMesh || !o.visible) return; const b = new THREE.Box3().setFromObject(o); if (b.isEmpty() || (b.max.x - b.min.x) * (b.max.z - b.min.z) > 2500 || b.max.y < 0.15 || b.max.z < -58) return; u.union(b); }); stageBoxes.push(u); });
  window.__scene = scene; window.__stageBoxes = stageBoxes.map(b => [b.min.x, b.max.x, b.min.z, b.max.z].map(v => Math.round(v)));
  const town = buildCities(scene, cities, { height: world.height, lite, stops: STOPS, stageBoxes }); window.__town = town;

  function applyTheme() {
    setTheme(themeName);
    const T = TOKENS[themeName];
    scene.background.set(T.sky);
    scene.fog.color.set(T.fog);
    hemi.color.set(T.hemiSky); hemi.groundColor.set(T.hemiGround); hemi.intensity = T.hemi;
    sun.color.set(T.dirColor); sun.intensity = T.dir;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', T.sky);
    lightSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === themeName));
  }

  /* ---------- HUD ---------- */
  const sensorSeg = $('#sensor-seg'), lightSeg = $('#light-seg');
  const MODES = ['all', 'vision', 'radar', 'lidar', 'v2x', 'off'];
  /* v39: an Off choice hides every sensor visual; the choice is remembered like the light setting */
  let sensSaved = 'all'; try { sensSaved = localStorage.getItem('road.sensors') || 'all'; } catch (e) {}
  if (!MODES.includes(sensSaved)) sensSaved = 'all';
  world.setMode(sensSaved);
  MODES.forEach((m, k) => {
    const lab = UI.sensors[k] || (m === 'off' ? 'Off' : m);
    const b = el('button', m === sensSaved ? 'on' : '', (m === 'all' || m === 'off' ? '' : '<i></i>') + esc(lab));
    b.type = 'button'; b.dataset.m = m; b.setAttribute('aria-pressed', m === sensSaved);
    if (m === 'vision') b.querySelector('i').style.color = 'var(--accent)';
    if (m === 'radar') b.querySelector('i').style.color = '#22D3EE';
    if (m === 'lidar') b.querySelector('i').style.color = 'var(--ink-3)';
    if (m === 'v2x') b.querySelector('i').style.color = 'var(--cobalt)';
    b.addEventListener('click', () => {
      world.setMode(m); try { localStorage.setItem('road.sensors', m); } catch (e) {}
      sensorSeg.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    });
    sensorSeg.appendChild(b);
  });
  [['day', UI.day], ['dusk', UI.dusk]].forEach(([t, lab]) => {
    const b = el('button', '', esc(lab)); b.type = 'button'; b.dataset.t = t;
    b.addEventListener('click', () => { themeName = t; root.setAttribute('data-theme', t); saveDark(t === 'dusk'); applyTheme(); });
    lightSeg.appendChild(b);
  });
  bindThemeButton(applyTheme);
  applyTheme();

  /* ---------- journey rail: a vertical tick per stop, a divider per chapter ---------- */
  const progress = $('#progress');
  const carDot = el('i', 'here'); progress.appendChild(carDot);
  const cap = $('#era-cap');
  const divs = [], ticks = [];
  STOPS.forEach((s, i) => {
    const e = s.era && ERAX[s.era];
    // two bands, as in the About Me deck: engineering before GM, then GM
    const grp = s.era === 'school' ? ['ENG', 'Before GM · engineering · 2003–2014'] : (s.era === 'program' ? ['GM', 'General Motors · 2014–2026'] : null);
    if (grp && STOPS[i - 1].era !== s.era) {
      const g = el('button', 'vr-grp', grp[0]); g.type = 'button'; g.dataset.tip = grp[1]; g.setAttribute('aria-label', grp[1]);
      g.addEventListener('click', () => { if (scrubbed) return; setZoom(0); go(i); });
      progress.appendChild(g);
    }
    if (e && (i === 0 || STOPS[i - 1].era !== s.era)) {
      const d = el('button', 'vr-div', `<b>${e.n}</b>`);
      d.type = 'button'; d.dataset.tip = `${e.name} · ${e.years}`; d.setAttribute('aria-label', `${e.label}, ${e.years}`);
      d.style.setProperty('--c', e.color);
      d.addEventListener('click', () => { if (scrubbed) return; setZoom(0); go(eraFirst[e.id]); });
      progress.appendChild(d); divs.push({ d, e });
    }
    const t = el('button', 'vr-tick' + (s.milestone ? ' ms' : ''));
    t.type = 'button'; t.dataset.tip = i === 0 ? 'Start' : (i === STOPS.length - 1 ? 'Finish' : s.title + (s.milestone ? ' ★' : ''));
    t.setAttribute('aria-label', `${t.dataset.tip}${s.span ? ', ' + s.span : ''}`);
    t.style.setProperty('--c', e ? e.color : 'var(--accent)');
    t.addEventListener('click', () => { if (scrubbed) return; setZoom(0); go(i); });
    progress.appendChild(t); ticks.push(t);
  });
  /* v33: pointing at the rail shows the same stacked label for every stop: company, role and function, years */
  const RAIL = C.rail || {};
  const tip = el('span', 'era-cap vr-tip'); tip.setAttribute('aria-hidden', 'true'); progress.appendChild(tip);
  function showTip(btn) {
    const d = btn && btn._tip; if (!d) return;
    tip.innerHTML = `<b class="cp-co">${esc(d.co)}</b>${d.ro ? `<span class="cp-ro">${esc(d.ro)}</span>` : ''}${d.yr ? `<span class="cp-yr">${esc(d.yr)}</span>` : ''}`;
    tip.style.setProperty('--c', d.c);
    tip.classList.add('show');
    const pr = progress.getBoundingClientRect();
    let y = btn.offsetTop + btn.offsetHeight / 2 - tip.offsetHeight / 2;
    y = Math.max(64 - pr.top, Math.min(y, innerHeight - 10 - pr.top - tip.offsetHeight));
    tip.style.transform = `translateY(${y.toFixed(1)}px)`;
  }
  const hideTip = () => tip.classList.remove('show');
  STOPS.forEach((s, i) => {
    const r = RAIL[s.id], e = s.era && ERAX[s.era];
    ticks[i]._tip = { co: r ? r.co : s.title, ro: r ? r.ro : '', yr: r ? r.yr : (s.span || ''), c: e ? e.color : 'var(--accent)' };
  });
  divs.forEach(({ d, e }) => { d._tip = { co: e.label, ro: `Chapter ${e.n}`, yr: e.years, c: e.color }; });
  progress.querySelectorAll('.vr-grp').forEach(g => { const p = g.dataset.tip.split(' · '); g._tip = { co: p[0], ro: p.length > 2 ? p[1].replace(/^./, c => c.toUpperCase()) : '', yr: p[p.length - 1], c: 'var(--ink-3)' }; });
  progress.querySelectorAll('.vr-tick, .vr-div, .vr-grp').forEach(b => {
    b.addEventListener('pointerenter', () => showTip(b));
    b.addEventListener('focus', () => showTip(b));
    b.addEventListener('pointerleave', () => { if (!progress.classList.contains('peeking')) hideTip(); });
    b.addEventListener('blur', hideTip);
  });
  // touch: drag along the rail to preview a stop, let go to drive there
  let scrubbed = false, scrubY = null, peek = null;
  const nearestTick = y => { let best = 0, bd = 1e9; tickY.forEach((ty, i) => { const d = Math.abs(ty - y); if (d < bd) { bd = d; best = i; } }); return best; };
  progress.addEventListener('pointerdown', e => { scrubY = e.clientY; scrubbed = false; });
  progress.addEventListener('pointermove', e => {
    if (scrubY === null || (e.pointerType === 'mouse' && !e.buttons)) return;
    if (!scrubbed && Math.abs(e.clientY - scrubY) < 8) return;
    if (!scrubbed) { scrubbed = true; try { progress.setPointerCapture(e.pointerId); } catch (er) {} }
    const k = nearestTick(e.clientY - progress.getBoundingClientRect().top);
    if (peek !== k) { if (peek !== null) ticks[peek].classList.remove('peek'); peek = k; ticks[k].classList.add('peek'); progress.classList.add('peeking'); showTip(ticks[k]); }
  });
  const endScrub = () => {
    if (scrubbed && peek !== null) { ticks[peek].classList.remove('peek'); setZoom(0); go(peek); }
    progress.classList.remove('peeking'); peek = null; scrubY = null; hideTip();
    setTimeout(() => { scrubbed = false; }, 0);
  };
  progress.addEventListener('pointerup', endScrub);
  progress.addEventListener('pointercancel', endScrub);

  /* ---------- view menu: sensors, light and zoom behind one button ---------- */
  const ctlBtn = $('#ctl-btn'), ctlPop = $('#ctl-pop');
  function setCtl(open) { ctlPop.hidden = !open; ctlBtn.setAttribute('aria-expanded', String(open)); ctlBtn.classList.toggle('on', open); }
  ctlBtn.addEventListener('click', e => { e.stopPropagation(); setCtl(ctlPop.hidden); });
  document.addEventListener('pointerdown', e => { if (!ctlPop.hidden && !(e.target.closest && e.target.closest('#controls'))) setCtl(false); });

  /* ---------- state ---------- */
  let cur = 0, shown = -1;
  let storyK = null, storyAt = 0; // story open in place of the card
  let idle = null;
  let pos = STOPS[0].x, target = STOPS[0].x, prevPos = pos, vel = 0, base = 0;
  let focus = -1; // selected callout
  let zOut = 0, zOutT = 0; // 0 = on the road, 1 = the whole career from above
  const ZMAX = 0.3; // wide enough to see the neighbours, never past the edge of the world
  /* v33: two states only, on the road or the overview. A pinch, Ctrl+wheel or key that moves past a
     small threshold goes all the way, so the view never rests half zoomed with the box half gone. */
  function setZoom(z) {
    z = clamp(z, 0, ZMAX);
    if (z === 0 || z === ZMAX) zOutT = z;
    else if (zOutT === 0) { if (z > 0.035) zOutT = ZMAX; }
    else if (z < ZMAX - 0.035) zOutT = 0;
    if (typeof syncOverview === 'function') syncOverview();
  }
  const card = $('#card'), panel = $('#panel'), panelBody = $('#panel-body');
  const markersEl = $('#markers'), leaders = $('#leaders');
  const prevBtn = $('#prev'), nextBtn = $('#next');

  const hashStop = stopFromHash();
  let startAt = hashStop;
  // A plain road.html link always starts at the beginning; only a #stop link opens a specific stop.
  if (startAt > 0) { cur = base = startAt; pos = target = prevPos = STOPS[cur].x; }

  function nearest(x) { let b = 0, d = 1e9; STOPS.forEach(s => { const e = Math.abs(s.x - x); if (e < d) { d = e; b = s.i; } }); return b; }

  function go(i, instant) {
    i = clamp(i, 0, STOPS.length - 1);
    closeStory();
    base = i; target = STOPS[i].x;
    clearTimeout(idle);
    if (instant) { pos = prevPos = target; vel = 0; cur = i; setFocus(-1); renderCard(); }
    try { history.replaceState(null, '', '#' + STOPS[i].id); localStorage.setItem('road.lastStop', STOPS[i].id); } catch (e) {}
  }

  /* ---------- card, rail, panel ---------- */
  function renderCard() {
    if (shown === cur) return;
    const was = shown;
    shown = cur;
    const s = STOPS[cur];
    const barFace = document.querySelector('.bar-title .mono');
    if (was === 0 && cur !== 0 && !renderCard.flown) flyPhoto(card.querySelector('.hero-photo img'), barFace);
    renderCard.flown = false;
    /* v39: at the start the big box stands where the name pill goes, and the pill shows only once the drive starts */
    if (cur !== 0 || was < 0) root.classList.toggle('at-start', cur === 0);
    if (storyK !== null) { storyK = null; card.classList.remove('story'); }
    card.classList.add('out');
    clearTimeout(renderCard.t);
    renderCard.t = setTimeout(() => {
      let h = '';
      const pf = PROF[s.id];
      if (pf) {
        h += headHTML(s, pf, 'h1') + flagsHTML(s);
        h += `<p class="summary">${esc(pf.summary)}</p>` + hlHTML(pf);
        if (s.callouts && s.callouts.length) { const wp = workPills(s.id); h += `<p class="sec-h">Stories ${wp || '<span>Tap a number</span>'}</p>` + itemsHTML(s); }
        card.innerHTML = h;
        card.classList.remove('finale', 'start'); card.classList.add('pro'); card.classList.toggle('ms', !!s.milestone);
        card.scrollTop = 0;
        card.querySelectorAll('.item').forEach(b => {
          const k = +b.dataset.k;
          b.addEventListener('click', () => openStory(k));
          b.addEventListener('mouseenter', () => hover(k, true));
          b.addEventListener('mouseleave', () => hover(k, false));
        });
        buildMarkers(s);
        card.classList.remove('out');
        resize();
        return;
      }
      card.classList.remove('pro');
      if (cur === 0) {
        h = `<div class="hero"><span class="hero-photo"><img src="${HEADSHOT}" alt="Marcin Fracz"></span><div class="hero-txt"><p class="kicker">${esc(s.kicker || '')}</p><h1>${esc(s.title)}</h1>${s.tag ? `<p class="hero-tag">${esc(s.tag)}</p>` : ''}</div></div>`
          + `<p class="role">${esc(s.role || '')}</p>` + (s.what ? `<p class="what">${esc(s.what)}</p>` : '') + flagsHTML(s)
          + `<div class="card-actions"><button class="btn primary go-btn" type="button" data-act="next">Start the drive <span aria-hidden="true">→</span></button><button class="btn tour-btn" type="button" data-act="tour"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>Show me around</button></div>`
          + `<p class="hint-mini"><span class="kbd">←</span><span class="kbd">→</span> or scroll to drive <span class="dot" aria-hidden="true">·</span> <span class="kbd">−</span><span class="kbd">+</span> wider view</p>`;
        card.innerHTML = h;
        card.classList.remove('finale', 'ms'); card.classList.add('start');
        card.scrollTop = 0;
        card.querySelectorAll('[data-act="next"]').forEach(b => b.addEventListener('click', () => {
          /* the photo leaves for the name pill the moment the drive starts */
          const img = card.querySelector('.hero-photo img');
          root.classList.remove('at-start'); flyPhoto(img, document.querySelector('.bar-title .mono'));
          renderCard.flown = true;
          card.classList.add('out');
          go(base + 1);
        }));
        buildMarkers(s);
        card.classList.remove('out');
        resize();
        if (was > 0) { flyPhoto(barFace, card.querySelector('.hero-photo img')); root.classList.add('at-start'); }
        return;
      }
      if (s.id === 'finale') {
        /* round 27: the finish: the photo again, the whole road in one list, and the ways to reach him */
        h = `<div class="hero fin"><span class="hero-photo sm"><img src="${HEADSHOT}" alt="Marcin Fracz"></span><div class="hero-txt"><p class="kicker">${esc(s.kicker || '')}</p><h1>${esc(s.title)}</h1></div></div>`
          + (s.role ? `<p class="role">${esc(s.role)}</p>` : '')
          + '<ol class="fin-eras">' + ERAS.map(e => `<li style="--c:${e.color}"><button type="button" data-era="${e.id}"><span class="n">${e.n}</span><b>${esc(e.name)}</b><i>${esc(e.years)}</i></button></li>`).join('') + '</ol>'
          + (s.what ? `<p class="fin-what">${esc(s.what)}</p>` : '')
          + `<div class="card-actions fin-acts"><a class="btn primary" href="${esc(UI.resumeHref)}" target="_blank" rel="noopener">${esc(UI.resume)}</a><a class="btn" href="${esc(UI.contactHref)}">${esc(UI.contact)}</a>`
          + (UI.linkedin ? `<a class="btn" href="${esc(UI.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : '') + `<a class="btn" href="index.html">${esc(UI.home || 'Desktop')}</a></div>`
          + (s.reel ? `<button class="link-btn fin-reel-btn" type="button" data-act="reel">Watch the ${esc((s.reel.label || '').replace(/^.*?,\s*/, '') || '')} reel <span aria-hidden="true">→</span></button><div class="reel" hidden></div>` : '');
        card.innerHTML = h;
        card.classList.remove('start', 'ms', 'pro'); card.classList.add('finale');
        card.scrollTop = 0;
        card.querySelectorAll('[data-era]').forEach(b => b.addEventListener('click', () => { const ix = STOPS.findIndex(x => x.era === b.dataset.era); if (ix >= 0) go(ix); }));
        const rb = card.querySelector('[data-act="reel"]');
        if (rb) rb.addEventListener('click', () => { const box = card.querySelector('.reel'); box.innerHTML = `<video id="reel" src="${esc(s.reel.src)}" controls playsinline preload="metadata" aria-label="${esc(s.reel.label)}"></video>`; box.hidden = false; rb.remove(); const v = box.querySelector('video'); v.play().catch(() => {}); });
        buildMarkers(s);
        card.classList.remove('out');
        resize();
        return;
      }
      const e = s.era && ERA[s.era];
      const kick = e ? `${e.n} · ${esc(e.short || e.label)}` : esc(s.kicker || '');
      h += `<p class="kicker">${kick}</p>`;
      h += `<h1>${esc(s.title)}</h1>`;
      if (s.role) h += `<p class="role">${esc(s.role)}</p>`;
      const meta = metaLine(s); if (meta) h += `<p class="meta">${meta}</p>`;
      const compact = !!(s.callouts && s.callouts.length);
      if (s.what && !compact) h += `<p class="what">${esc(s.what)}</p>`;
      h += flagsHTML(s);
      if (s.reel) h += `<div class="reel"><video id="reel" src="${esc(s.reel.src)}" ${s.reel.poster ? `poster="${esc(s.reel.poster)}"` : ''} controls muted playsinline preload="metadata" aria-label="${esc(s.reel.label)}"></video></div>`;
      if (compact) h += itemsHTML(s); else h += winsHTML(s);
      const acts = [];
      if (compact && (s.more || s.what || (s.wins && s.wins.length))) acts.push(`<button class="link-btn" type="button" data-act="more">${esc(s.more ? s.more.title : 'The whole story')} <span aria-hidden="true">→</span></button>`);
      if (s.reel) acts.push(`<a class="btn primary" href="index.html">${esc(UI.back)}</a>`, `<a class="btn" href="${esc(UI.resumeHref)}" target="_blank" rel="noopener">${esc(UI.resume)}</a>`, `<a class="btn" href="${esc(UI.contactHref)}">${esc(UI.contact)}</a>`);
      if (cur === 0) acts.push(`<button class="btn primary" type="button" data-act="next">Start the drive</button>`);
      if (acts.length) h += `<div class="card-actions">${acts.join('')}</div>`;
      if (s.hint) h += `<p class="hint"><span class="kbd">←</span><span class="kbd">→</span> ${esc(s.hint)}</p>`;
      if (cur === 0) h += `<p class="hint"><span class="kbd">−</span><span class="kbd">+</span> Pinch or Ctrl + scroll for a wider view.</p>`;
      card.innerHTML = h;
      card.classList.toggle('finale', !!s.reel);
      card.classList.toggle('start', cur === 0);
      card.scrollTop = 0;
      card.querySelectorAll('[data-act="more"]').forEach(b => b.addEventListener('click', () => openStory(-1)));
      card.querySelectorAll('.item').forEach(b => {
        const k = +b.dataset.k;
        b.addEventListener('click', () => openStory(k));
        b.addEventListener('mouseenter', () => hover(k, true));
        b.addEventListener('mouseleave', () => hover(k, false));
      });
      card.querySelectorAll('[data-act="next"]').forEach(b => b.addEventListener('click', () => go(base + 1)));
      const v = card.querySelector('#reel');
      if (v) { v.play().catch(() => {}); }
      buildMarkers(s);
      card.classList.remove('out');
      resize();
    }, shown === -1 ? 0 : 160);

    const ci = s.era ? ERAS.findIndex(e => e.id === s.era) : (cur === 0 ? -1 : 99);
    divs.forEach(({ d, e }) => { d.classList.toggle('on', e.k === ci); d.classList.toggle('done', e.k < ci); });
    ticks.forEach((t, ti) => { t.classList.toggle('on', ti === cur); t.classList.toggle('done', ti < cur); });
    const ce = ERAS[ci];
    root.style.setProperty('--era', ce ? ce.color : 'var(--accent)');
    // round 28: the rail label stacks company, role or domain, and years
    if (cap) {
      const pf = PROF[s.id], yr = s.span ? String(s.span).split(' · ')[0] : (ce ? ce.years : '');
      cap.innerHTML = pf ? `<b class="cp-co">${esc(pf.company)}</b><span class="cp-ro">${esc(pf.group)}</span><span class="cp-yr">${esc(yr)}</span>`
        : `<b class="cp-co">${cur === 0 ? 'Start' : 'Finish'}</b>`;
      cap.style.setProperty('--c', ce ? ce.color : 'var(--accent)');
    }
    prevBtn.disabled = cur === 0; nextBtn.disabled = cur === STOPS.length - 1; { const a = $('#step-prev'), z = $('#step-next'); if (a) a.disabled = cur === 0; if (z) z.disabled = cur === STOPS.length - 1; }
    requestAnimationFrame(measureEras);
    if (cur !== STOPS.length - 1) { const v = document.querySelector('#reel'); if (v) v.pause(); }
  }

  /* the story: opens in place of the card, and closes the moment you move on */
  function storyHTML(s, k) {
    const cs = s.callouts || [], p = PROF[s.id] || {};
    k = clamp(k, 0, cs.length - 1);
    const [lb, dt] = splitCallout(cs[k].text);
    let h = `<div class="story-bar"><button type="button" class="story-back" data-act="back" aria-label="Back to ${esc(p.company || s.title)}"><span aria-hidden="true">‹</span></button><div class="story-tabs" role="tablist">`
      + cs.map((c, j) => `<button type="button" role="tab" aria-selected="${j === k}" data-k="${j}" class="${j === k ? 'on' : ''}"><span class="lt">${LETTER(j)}</span><span class="tl">${esc(splitCallout(c.text)[0])}</span></button>`).join('')
      + `</div><button type="button" class="story-x" data-act="back" aria-label="Close the story">×</button></div>`;
    const art = p.art && !(p.noArt || []).includes(k);
    h += `<div class="story-grid${art ? '' : ' no-art'}"><div class="story-main">`;
    if (p.company) h += `<div class="story-co">${logoHTML(p)}<span><b>${esc(p.company)}</b> · ${esc(s.role || s.title)}${s.span ? ` · <span class="nw">${esc(s.span)}</span>` : ''}</span></div>`;
    h += `<p class="kicker">Story ${LETTER(k)} of ${cs.length}</p><h2>${esc(lb)}</h2>`;
    if (dt) h += `<p class="lede">${esc(dt)}</p>`;
    h += storyMarksHTML(p, k);
    if (p.stories && p.stories[k]) h += `<p class="story-body">${md(p.stories[k])}</p>`;
    const m = s.more;
    if (p.sources === k && m && m.sources && m.sources.length) h += `<div class="sources"><h3>${esc(UI.sources)}</h3>` + m.sources.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join('') + '</div>';
    if (cs.length > 1) h += `<button type="button" class="story-next" data-k="${(k + 1) % cs.length}">Next: ${LETTER((k + 1) % cs.length)} · ${esc(splitCallout(cs[(k + 1) % cs.length].text)[0])} <span aria-hidden="true">→</span></button>`;
    h += `</div>`;
    if (art) h += `<div class="story-art"><div class="art" role="img" aria-label="Line drawing" style="-webkit-mask-image:url(assets/road/art-${p.art}.png);mask-image:url(assets/road/art-${p.art}.png)"></div></div>`;
    h += `</div>`;
    return h;
  }
  function openStory(k) {
    const s = STOPS[cur];
    if (!s.callouts || !s.callouts.length) return;
    k = clamp(k, 0, s.callouts.length - 1);
    storyK = k; storyAt = performance.now();
    card.innerHTML = storyHTML(s, k);
    card.classList.add('story'); card.scrollTop = 0;
    card.querySelectorAll('[data-act="back"]').forEach(b => b.addEventListener('click', () => closeStory(true)));
    card.querySelectorAll('.story-tabs button, .story-next').forEach(b => b.addEventListener('click', () => openStory(+b.dataset.k)));
    setFocus(clamp(k, 0, (s.callouts || []).length - 1));
  }
  function closeStory(keepFocus) {
    if (storyK === null) return;
    storyK = null; card.classList.remove('story');
    if (!keepFocus) setFocus(-1);
    shown = -1; renderCard();
  }
  function openPanel() { openStory(-1); }

  /* markers with their own labels, placed in the scene next to each part */
  let markers = [];
  function buildMarkers(s) {
    markersEl.innerHTML = ''; markers = [];
    const st = stages[s.i];
    (s.callouts || []).forEach((c, k) => {
      const a = st.anchors && st.anchors[c.obj];
      if (!a) return;
      const [lb] = splitCallout(c.text);
      const m = el('button', 'marker hide', LETTER(k));
      m.type = 'button'; m.setAttribute('aria-label', `${LETTER(k)}: ${lb}`); m.dataset.tip = lb;
      m.style.setProperty('--d', (0.1 + k * 0.08) + 's');
      m.addEventListener('click', ev => { ev.stopPropagation(); openStory(k); });
      m.addEventListener('mouseenter', () => hover(k, true));
      m.addEventListener('mouseleave', () => hover(k, false));
      markersEl.appendChild(m);
      markers.push({ k, a, m });
    });
    /* round 27: a pulsing marker in the scene for each live demo or kit, matched by its pill in the box */
    (WORK[s.id] || []).forEach((x, j) => {
      const base = st.anchors && st.anchors[x.at];
      if (!base) return;
      const key = 'wk' + j + (x.off || []).join(',');
      let a = base.userData[key];
      if (!a) { a = new THREE.Object3D(); const o = x.off || [0, 0, 0]; a.position.set(o[0], o[1], o[2]); base.add(a); base.userData[key] = a; }
      const kind = wkKind(x), lbl = (x.pill || UI.workPill || 'Live demo') + ': ' + x.title;
      const m = el('a', 'marker wk-mk hide ' + kind, '');
      m.href = x.href; m.innerHTML = WK_ICON[kind]; m.setAttribute('aria-label', lbl); m.dataset.tip = lbl; m.dataset.w = j;
      m.style.setProperty('--d', (0.3 + j * 0.1) + 's');
      m.addEventListener('mouseenter', () => wkHover(j, true)); m.addEventListener('mouseleave', () => wkHover(j, false));
      markersEl.appendChild(m);
      markers.push({ k: 'w' + j, a, m });
    });
    card.querySelectorAll('.wk-pill').forEach(p => { const j = +p.dataset.w; p.addEventListener('mouseenter', () => wkHover(j, true)); p.addEventListener('mouseleave', () => wkHover(j, false)); });
    measureTags();
  }
  function wkHover(j, on) {
    markersEl.querySelectorAll(`.wk-mk[data-w="${j}"]`).forEach(m => m.classList.toggle('on', on));
    card.querySelectorAll(`.wk-pill[data-w="${j}"]`).forEach(p => p.classList.toggle('on', on));
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measureTags());
  function measureTags() {}
  let hovered = -1;
  function hover(k, on) { hovered = on ? k : (hovered === k ? -1 : hovered); paintOn(); }
  function setFocus(k) { focus = k; paintOn(); measureTags(); }
  function paintOn() {
    const act = focus >= 0 ? focus : hovered;
    markers.forEach(mk => mk.m.classList.toggle('on', mk.k === act));
    card.querySelectorAll('.item').forEach(b => b.classList.toggle('on', +b.dataset.k === act));
    markersEl.classList.toggle('has-focus', focus >= 0);
  }

  /* journey rail: a dot follows the car from tick to tick */
  let tickY = [];
  function measureEras() { tickY = ticks.map(t => t.offsetTop + t.offsetHeight / 2); }
  function updateFill() {
    if (!tickY.length || !tickY[tickY.length - 1]) return;
    let py;
    if (pos <= STOPS[0].x) py = tickY[0];
    else if (pos >= STOPS[STOPS.length - 1].x) py = tickY[tickY.length - 1];
    else { let k = 0; while (k < STOPS.length - 2 && pos > STOPS[k + 1].x) k++; const f = (pos - STOPS[k].x) / (STOPS[k + 1].x - STOPS[k].x); py = tickY[k] + (tickY[k + 1] - tickY[k]) * f; }
    carDot.style.transform = `translateY(${py.toFixed(1)}px)`;
    if (cap) cap.style.transform = `translateY(${(py - cap.offsetHeight / 2).toFixed(1)}px)`;
  }

  const v3 = new THREE.Vector3();
  let W = 1, H = 1;
  const pad = 8, GAP = 20;
  function hit(a, b) { return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y; }
  function updateOverlay(settle) {
    const cr = card.getBoundingClientRect();
    const blocks = [{ x: cr.left, y: cr.top, w: cr.width, h: cr.height }, rectOf(chaptersEl), rectOf(controlsEl), rectOf(ctlPop.hidden ? ctlBtn : ctlPop), { x: 0, y: 0, w: W, h: 58 }];
    const top = 64, bottom = H - 12;
    const placed = [];
    markers.forEach(mk => {
      mk.a.getWorldPosition(v3); v3.project(camera);
      mk.x = (v3.x * 0.5 + 0.5) * W; mk.y = (-v3.y * 0.5 + 0.5) * H;
      const r = { x: mk.x - 16, y: mk.y - 16, w: 32, h: 32 };
      mk.ok = settle > 0.6 && v3.z < 1 && mk.x > 16 && mk.x < W - 16 && mk.y > top && mk.y < bottom && !blocks.some(b => hit(r, b)) && !placed.some(b => hit(r, b));
      if (mk.ok) placed.push(r);
      mk.m.classList.toggle('hide', !mk.ok);
      mk.m.style.transform = `translate(${mk.x.toFixed(1)}px, ${mk.y.toFixed(1)}px)`;
    });
    if (updateOverlay.last !== '') { leaders.innerHTML = ''; updateOverlay.last = ''; }
  }
  const chaptersEl = $('#chapters'), controlsEl = $('#controls');
  /* v33: the zoomed-out view is a deliberate overview. The stop box gives way to one compact panel in
     the same place, with every chapter and stop, and the 3D view pulls back beside it. */
  const RAILC = C.rail || {};
  var ov = el('nav', 'ov-panel'); ov.id = 'overview'; ov.setAttribute('aria-label', 'Career overview'); ov.hidden = true;
  {
    let h = `<p class="ov-k">Career overview</p><h2 class="ov-t">${esc(C.name)}</h2><p class="ov-s">${ERAS.length} chapters, ${STOPS.length - 2} stops. Pick one to drive there.</p><ol class="ov-eras">`;
    ERAS.forEach(e => {
      h += `<li class="ov-era" style="--c:${e.color}"><p class="ov-eh"><b>${e.n}</b><span>${esc(e.label)}</span><em>${esc(e.years)}</em></p><ul>`;
      STOPS.forEach((s, i) => { if (s.era !== e.id) return; const r = RAILC[s.id] || { co: s.title, ro: s.role || '', yr: s.span || '' };
        /* v47: company and a short title that never cuts off, the date in one right-hand column, and the role's domain in the Timeline's words */
        const t = r.t || String(r.ro).split(' · ')[0];
        h += `<li><button type="button" class="ov-stop" data-i="${i}" title="${esc(r.co + ' · ' + r.ro)}"><b>${esc(r.co)}<i> · ${esc(t)}</i></b><em>${esc(r.yr)}</em>${r.dm ? `<span class="ov-dom f-${esc(r.f || 'eng')}"><i aria-hidden="true"></i>${esc(r.dm)}</span>` : ''}</button></li>`; });
      h += '</ul></li>';
    });
    h += `</ol><button type="button" class="ov-back">Back to the road <kbd>+</kbd></button>`;
    ov.innerHTML = h;
    document.body.appendChild(ov);
    ov.querySelectorAll('.ov-stop').forEach(b => b.addEventListener('click', () => { setZoom(0); go(+b.dataset.i); }));
    ov.querySelector('.ov-back').addEventListener('click', () => setZoom(0));
  }
  let ovT = null;
  function syncOverview() {
    if (!ov) return;
    const on = zOutT > 0 && !isPhone();
    clearTimeout(ovT);
    if (on) {
      ov.hidden = false;
      ov.querySelectorAll('.ov-stop').forEach(b => b.classList.toggle('on', +b.dataset.i === cur));
      requestAnimationFrame(() => ov.classList.add('on'));
    } else { ov.classList.remove('on'); ovT = setTimeout(() => { ov.hidden = true; }, 260); }
  }
  /* district names over the whole-career view; click one to fly back in */
  const distEl = $('#districts');
  const dists = ERAS.map(e => {
    const b = el('button', 'dist', `<b>${e.n}</b><span>${esc(e.name)}<em>${esc(e.years)}</em></span>`);
    b.type = 'button'; b.style.setProperty('--c', e.color);
    b.addEventListener('click', () => { setZoom(0); go(eraFirst[e.id]); });
    distEl.appendChild(b);
    const xm = (e.x0 + e.x1) / 2;
    return { b, p: new THREE.Vector3(xm, 18, roadZ(xm) - 34) };
  });
  const v4 = new THREE.Vector3();
  function updateDistricts() {
    const o = smooth(0.24, 0.36, zOut);
    distEl.style.opacity = o.toFixed(3);
    distEl.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    if (o <= 0) return;
    // stack names in rows so short chapters never overlap
    const rows = [];
    dists.forEach(d => { v4.copy(d.p).project(camera); d.x = (v4.x * 0.5 + 0.5) * W; d.y = (-v4.y * 0.5 + 0.5) * H; if (!d.w) d.w = d.b.offsetWidth; });
    dists.forEach(d => {
      let r = 0; while (rows[r] != null && d.x - d.w / 2 < rows[r] + 8) r++;
      rows[r] = d.x + d.w / 2;
      const lift = r * 34;
      d.b.style.setProperty('--stem', (16 + lift) + 'px');
      d.b.style.transform = `translate(${d.x.toFixed(1)}px, ${(d.y - lift).toFixed(1)}px) translate(-50%, -100%)`;
    });
  }
  function rectOf(e) { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }

  /* ---------- input (laptop and tablet: sideways only) ---------- */
  /* Input only moves the target; the car and camera glide to it on a
     critically damped spring every frame, so nothing ever jumps. When input
     stops, the target eases to the nearest stop, leaning the way you went. */
  function settleSoon(ms = 360) {
    clearTimeout(idle);
    idle = setTimeout(() => {
      let i = nearest(target);
      const d = target - STOPS[base].x;
      if (i === base && Math.abs(d) > 10) i = base + Math.sign(d);
      i = clamp(i, 0, STOPS.length - 1);
      base = i; target = STOPS[i].x;
      try { history.replaceState(null, '', '#' + STOPS[i].id); localStorage.setItem('road.lastStop', STOPS[i].id); } catch (e) {}
    }, ms);
  }
  function nudge(dx) {
    target = clamp(target + dx, STOPS[0].x, STOPS[STOPS.length - 1].x);
    settleSoon();
  }
  /* while a window is open over the Road (Resume, Contact, Work), its own page scrolls, never the Road */
  const openSheet = () => { const v = document.querySelector('.rs-veil.on:not([hidden])'); return v ? v.querySelector('.rs-pages, .ct-body') : null; };
  addEventListener('wheel', e => {
    if (document.documentElement.classList.contains('rs-open')) {
      const sc = openSheet();
      if (sc && e.target instanceof Node && sc.contains(e.target)) return; /* native scroll inside the sheet */
      e.preventDefault();
      if (sc && !e.ctrlKey) { let d = e.deltaY; if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= sc.clientHeight; sc.scrollTop += d; }
      return;
    }
    if (isPhone()) return;
    const tg = e.target instanceof Node ? e.target : null;
    if (tg && ctlPop.contains(tg)) return;
    const inCard = tg && card.contains(tg) && card.scrollHeight > card.clientHeight + 2 && Math.abs(e.deltaY) > Math.abs(e.deltaX);
    if (storyK !== null && !inCard) { e.preventDefault(); if (performance.now() - storyAt < 250) return; closeStory(); }
    if (inCard) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) { // Ctrl/Cmd + wheel, and trackpad pinch, zoom
      let dz = e.deltaY; if (e.deltaMode === 1) dz *= 32;
      setZoom(zOutT + clamp(dz, -60, 60) * 0.004);
      return;
    }
    let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= innerWidth;
    nudge(clamp(d, -120, 120) * (0.14 + 0.5 * zOut));
  }, { passive: false });

  let g0 = 0;
  addEventListener('gesturestart', e => { if (isPhone()) return; e.preventDefault(); g0 = zOutT; });
  addEventListener('gesturechange', e => { if (isPhone()) return; e.preventDefault(); setZoom(g0 + (1 - e.scale) * 0.9); });
  const touches = new Map(); let pinch = null;
  const pdist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  canvas.addEventListener('pointerdown', e => { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 2) { pinch = { d: pdist(), z: zOutT }; drag = null; } });
  canvas.addEventListener('pointermove', e => { if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch && touches.size === 2) setZoom(pinch.z + (pinch.d / pdist() - 1) * 0.8); });
  const unTouch = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
  canvas.addEventListener('pointerup', unTouch); canvas.addEventListener('pointercancel', unTouch);
  $('#zoom-out').addEventListener('click', () => setZoom(ZMAX));
  $('#zoom-in').addEventListener('click', () => setZoom(0));

  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    if (isPhone() || pinch) return;
    drag = { x: e.clientX, t: target, moved: 0 }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || pinch) return;
    const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx));
    if (drag.moved > 6) closeStory();
    target = clamp(drag.t - dx * (0.11 + 1.2 * zOut), STOPS[0].x, STOPS[STOPS.length - 1].x);
  });
  const endDrag = () => { if (!drag) return; if (drag.moved < 4 && (focus >= 0 || storyK !== null)) { closeStory(); setFocus(-1); } drag = null; canvas.classList.remove('dragging'); settleSoon(120); };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

  addEventListener('keydown', e => {
    if (document.documentElement.classList.contains('rs-open')) {
      const sc = openSheet(); if (!sc || (e.target.closest && e.target.closest('input, textarea, select'))) return;
      const step = { ArrowDown: 60, ArrowUp: -60, PageDown: sc.clientHeight * .9, PageUp: -sc.clientHeight * .9, ' ': sc.clientHeight * .9, Home: -1e6, End: 1e6 }[e.key];
      if (step) { e.preventDefault(); sc.scrollBy({ top: e.shiftKey && e.key === ' ' ? -step : step, behavior: 'smooth' }); }
      return;
    }
    if (e.target.closest && e.target.closest('input, textarea, video')) return;
    const k = e.key;
    if (k === 'Escape') { if (!ctlPop.hidden) return setCtl(false); if (storyK !== null) return closeStory(); if (focus >= 0) return setFocus(-1); if (zOutT > 0) return setZoom(0); goPage('index.html'); return; }
    if (!isPhone() && (k === '-' || k === '_')) { e.preventDefault(); setZoom(ZMAX); return; }
    if (!isPhone() && (k === '=' || k === '+')) { e.preventDefault(); setZoom(0); return; }
    if (k === 'h' || k === 'H') { goPage('index.html'); return; }
    if (isPhone()) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) { e.preventDefault(); go(base + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); go(base - 1); }
    else if (k === 'Home') { e.preventDefault(); toStart(); }
    else if (k === 'End') { e.preventDefault(); go(STOPS.length - 1); }
    else if (k === 'Enter' && storyK === null && document.activeElement === document.body && (STOPS[cur].callouts || []).length) openStory(-1);
  });
  // Start: a short eased glide back to the first stop, never the slow spring rewind
  function toStart() {
    setZoom(0); closeStory();
    if (isPhone()) { go(0); return; }
    const from = pos; go(0);
    if (Math.abs(from - target) < 1 || reduced) { go(0, true); return; }
    rush = { from, to: target, t0: performance.now(), dur: 550 };
    cur = 0; setFocus(-1); renderCard();
  }
  // keep the last few words of a line together, so no line ends up holding one to three words
  function bindTail(rootEl) {
    rootEl.querySelectorAll('p, li, h2, h3, .ib span, .co-role, .lede, .story-co > span').forEach(b => {
      if (b.dataset.tail || b.querySelector('p, li, .item')) return;
      // never split a hyphenated word such as co-op across two lines
      const texts = []; const hw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let tn;
      while ((tn = hw.nextNode())) if (!tn.parentElement.closest('.nw')) texts.push(tn);
      texts.forEach(node => {
        let m;
        while (node && (m = /[^\s]*\w[-–]\w[^\s]*/.exec(node.data)) && m[0].length <= 22) {
          const word = node.splitText(m.index), after = word.splitText(m[0].length), sp = document.createElement('span');
          sp.className = 'nw'; word.parentNode.insertBefore(sp, word); sp.appendChild(word); node = after;
        }
      });
      if (b.classList.contains('nw') || (b.textContent.trim().match(/\s+/g) || []).length < 7) return;
      const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n, last = null;
      while ((n = tw.nextNode())) if (n.data.trim()) last = n;
      if (!last) return;
      const d = last.data.replace(/\s+$/, ''); let i = d.length, k = 0;
      while (k < 4 && i > 0 && (k < 2 || d.length - i < 25)) { i = d.lastIndexOf(' ', i - 1); if (i < 0) break; k++; }
      if (i <= 0) return;
      const tail = last.splitText(i + 1), sp = document.createElement('span');
      sp.className = 'nw'; tail.parentNode.insertBefore(sp, tail); sp.appendChild(tail); b.dataset.tail = '1';
    });
  }
  new MutationObserver(() => bindTail(card)).observe(card, { childList: true, subtree: true });
  bindTail(document.querySelector('#flow') || document.body);
  const startBtn = $('#start-btn');
  if (startBtn) startBtn.addEventListener('click', toStart);
  prevBtn.addEventListener('click', () => go(base - 1));
  nextBtn.addEventListener('click', () => go(base + 1));
  /* v46: End jumps to the last stop; the round buttons bottom right step like the rail arrows */
  const endBtn = $('#end-btn'), stepPrev = $('#step-prev'), stepNext = $('#step-next');
  if (endBtn) endBtn.addEventListener('click', () => { setZoom(0); go(STOPS.length - 1); });
  if (stepPrev) stepPrev.addEventListener('click', () => go(base - 1));
  if (stepNext) stepNext.addEventListener('click', () => go(base + 1));
  addEventListener('hashchange', () => { const i = stopFromHash(); if (i >= 0 && i !== cur) go(i); });

  /* phone: the page scrolls down; the camera follows */
  const sections = [...document.querySelectorAll('#flow section')];
  function phoneTarget() {
    const mid = innerHeight * 0.45;
    for (let k = 0; k < sections.length; k++) {
      const r = sections[k].getBoundingClientRect();
      if (r.bottom > mid) {
        const f = clamp((mid - r.top) / Math.max(1, r.height), 0, 1);
        const a = STOPS[k].x, b = STOPS[Math.min(k + 1, STOPS.length - 1)].x;
        return lerp(a, b, smooth(0.55, 1, f));
      }
    }
    return STOPS[STOPS.length - 1].x;
  }
  let wasPhone = isPhone();
  if (wasPhone && cur > 0) requestAnimationFrame(() => sections[cur] && sections[cur].scrollIntoView());

  let baseShift = 0;
  /* ---------- resize ---------- */
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = isPhone() ? 38 : (W / H < 1.2 ? 36 : 30);
    // center the scene in the space right of the story plate
    if (!isPhone()) {
      const cr = card.getBoundingClientRect();
      baseShift = clamp(((cr.right + W) / 2 - W / 2) * 0.8, 0, W * 0.18);
      camera.setViewOffset(W, H, -baseShift, 0, W, H);
    } else camera.setViewOffset(W, H, 0, H * 0.06, W, H);
    camera.updateProjectionMatrix();
    measureEras(); measureTags();
    const p = isPhone();
    if (p !== wasPhone) { wasPhone = p; if (!p) { target = STOPS[cur].x; } }
  }
  addEventListener('resize', resize);
  resize();
  renderCard();
  setTimeout(resize, 400);

  /* ---------- camera ---------- */
  const look = new THREE.Vector3(), camPos = new THREE.Vector3(), tmp = new THREE.Vector3();
  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  let zoom = 0;
  const dirO = new THREE.Vector3(0, 0.9, 0.44).normalize();
  function placeCamera(dt, first) {
    const phone = isPhone();
    const fx = pos;
    const fz = roadZ(fx);
    const isFinale = Math.abs(fx - STOPS[STOPS.length - 1].x) < 40 ? smooth(40, 0, Math.abs(fx - STOPS[STOPS.length - 1].x)) : 0;
    const off = phone ? new THREE.Vector3(-6, 74, 96) : new THREE.Vector3(-12, 50, 77);
    const lookAt = tmp.set(fx - 2, 0, fz - (phone ? 26 : 15));
    // in the mini cities, tip the view up so the skyline is in the frame
    let cw = 0; STOPS.forEach(s => { if (CITY_VIEW[s.id]) cw = Math.max(cw, CITY_VIEW[s.id] * smooth(46, 8, Math.abs(fx - s.x))); });
    if (cw > 0) { off.x -= (phone ? 0 : 4) * cw; lookAt.x += (phone ? 0 : 7) * cw; lookAt.z -= (phone ? 10 : 22) * cw; lookAt.y += 3 * cw + 16 * Math.max(0, cw - 1); off.y -= 9 * cw + 8 * Math.max(0, cw - 1); off.z += 6 * cw; }
    // lift up to the lookout at the end
    if (isFinale > 0) {
      const lx = STOPS[STOPS.length - 1].x + 2;
      lookAt.lerp(v3.set(lx + 6, world.lookoutY + 2, roadZ(lx) - 30), 0.3 * isFinale);
    }
    // zoom toward the selected callout
    const zt = focus >= 0 && markers.find(m => m.k === focus) ? 1 : 0;
    zoom += (zt - zoom) * Math.min(1, dt * 3);
    if (zoom > 0.001) {
      const mk = markers.find(m => m.k === focus) || markers[0];
      if (mk) {
        mk.a.getWorldPosition(v3);
        /* round 16: with a story open, the wide card covers the left, so frame the part in the open space to its right */
        const wide = storyK !== null && !phone && card.offsetWidth > W * 0.45;
        if (wide) { lookAt.lerp(v3, 0.8 * zoom); lookAt.x -= 10 * zoom; } else lookAt.lerp(v3, 0.45 * zoom);
      }
      off.multiplyScalar(1 - 0.38 * zoom);
    }
    if (!reduced && !phone) { off.x += mx * 6 * (1 - zOut); off.y -= my * 4 * (1 - zOut); }
    // zoom out: pull back along a curve to one view of the whole career
    const ze = zOut * zOut * (3 - 2 * zOut);
    if (ze > 0.0005) {
      const xc = (XMIN + XMAX) / 2;
      const lookO = v3.set(xc, 0, roadZ(xc) - 40);
      const hf = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
      const D = (XMAX - XMIN + 60) * 0.5 / Math.tan(hf / 2) * 1.04;
      const dn = off.length();
      const dir = off.clone().normalize().lerp(dirO, ze).normalize();
      lookAt.lerp(lookO, smooth(0.3, 1, ze));
      off.copy(dir).multiplyScalar(Math.exp(lerp(Math.log(dn), Math.log(D), ze)));
    }
    const dist = off.length();
    camera.far = Math.max(900, dist * 2.2); camera.near = Math.max(1, dist * 0.004);
    scene.fog.near = 170 + Math.max(0, dist - 95) * 1.2; scene.fog.far = 420 + Math.max(0, dist - 95) * 2.4;
    const want = camPos.copy(lookAt).add(off);
    const a = first ? 1 : Math.min(1, dt * 6);
    camera.position.lerp(want, a);
    look.lerp(lookAt, a);
    camera.lookAt(look);
    // move the sun's shadow box with the view
    // v41: snap the shadow box to whole shadow-map texels so edges stay put as the view glides
    sunC.set(fx, 0, fz - 15);
    const sa = sunC.dot(sunR), sb = sunC.dot(sunU);
    sunC.addScaledVector(sunR, Math.round(sa / sunTex) * sunTex - sa).addScaledVector(sunU, Math.round(sb / sunTexV) * sunTexV - sb);
    sun.target.position.copy(sunC);
    sun.position.copy(sunC).add(sunOff);
  }

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let t = 0, first = true, visible = true, rush = null;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) clock.getDelta(); });
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(0.05, clock.getDelta());
    t += reduced ? 0 : dt;
    if (isPhone()) {
      target = phoneTarget();
      const n = nearest(target); if (n !== cur) { cur = n; shown = -1; renderCard(); }
    }
    // critically damped spring: continuous position and speed, no overshoot
    const K = isPhone() ? 30 : (reduced ? 22 : 7.5), Cd = 2 * Math.sqrt(K);
    const steps = Math.max(1, Math.ceil(dt / 0.016));
    for (let n = 0; n < steps; n++) {
      const h = dt / steps;
      vel += (K * (target - pos) - Cd * vel) * h;
      vel = clamp(vel, -240, 240);
      pos += vel * h;
    }
    if (rush) {
      if (rush.to !== target) rush = null;
      else {
        const f = Math.min(1, (performance.now() - rush.t0) / rush.dur), ease = f < .5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
        pos = rush.from + (rush.to - rush.from) * ease; vel = 0;
        if (f >= 1) { pos = target; rush = null; }
      }
    }
    if (first) { pos = target; vel = 0; }
    if (!isPhone()) {
      // the card follows the car, switching only once the car is close to a stop
      const n = nearest(pos);
      if (!rush && n !== cur && Math.abs(pos - STOPS[n].x) < 26 && (Math.abs(vel) < 45 || n === nearest(target))) { cur = n; setFocus(-1); renderCard(); }
    }
    const v = rush ? 0 : (pos - prevPos) / Math.max(dt, 1e-3); prevPos = pos;
    if (isPhone()) zOutT = 0;
    const zPrev = zOut;
    zOut += (zOutT - zOut) * Math.min(1, dt * (reduced ? 12 : 4));
    if (Math.abs(zOutT - zOut) < 0.001) zOut = zOutT;
    if (zOut !== zPrev) { camera.setViewOffset(W, H, -baseShift, 0, W, H); root.classList.toggle('zoomed', zOut > 0.08); }
    placeCamera(dt, first);
    camera.updateProjectionMatrix();
    world.update(dt, t, pos, v, reduced);
    town.update(t, dt, pos, zOut, reduced);
    world.setZoomTint(zOut, themeName);
    stages.forEach((st, i) => {
      const d = Math.abs(pos - STOPS[i].x);
      const near = d < 140 + zOut * 3000;
      st.group.visible = near;
      if (!near) return;
      const kt = 1 - smooth(4, 46, d);
      st.k += (kt - st.k) * Math.min(1, dt * 2.5);
      if (st.update) st.update(t, st.k, dt);
    });
    renderer.render(scene, camera);
    const settle = 1 - smooth(1.5, 8, Math.abs(pos - STOPS[cur].x));
    if (!isPhone()) { updateOverlay(settle * (1 - smooth(0.05, 0.2, zOut)), dt); updateFill(); updateDistricts(); }
    first = false;
  }
  frame();
  window.__road = { go, at: x => { pos = prevPos = target = x; vel = 0; }, setZoom, get zoom() { return zOut; }, get cur() { return cur; }, get pos() { return pos; }, get story() { return storyK; }, next: () => go(base + 1), nudge, openStory, closeStory: () => closeStory(), setCtl, toStart, stops: STOPS.length, setTheme: n => { themeName = n; root.setAttribute('data-theme', n); applyTheme(); }, world };
}
