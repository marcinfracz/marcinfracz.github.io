/* v45: on phones (under 768px) the site links fold into one Menu button.
   Same links, same targets: the menu holds copies of the page's own nav links, so every
   click rule on the page (Desktop window, Road window, new tabs) still applies.
   On the Desktop the app dock folds into the same menu. Tablet and desktop are untouched. */
(function () {
  var Q = matchMedia('(max-width: 767px)');
  var nav = document.querySelector('nav.pill.links, nav.bar-links, nav.mb-links');
  if (!nav) return;
  var dock = document.getElementById('dock-rail');

  var css = document.createElement('style');
  css.textContent =
    /* v45b: off the phone breakpoint the button, menu and shade never show, whatever the page's own styles say */
    'html:not(.pm-on) .pm-btn, html:not(.pm-on) .pm-sheet, html:not(.pm-on) .pm-shade, .pm-sheet[hidden], .pm-shade[hidden]{display:none!important}' +
    '@media (max-width:767px){' +
    ' html.pm-on nav.pill.links>a, html.pm-on nav.pill.links>.sep,' +
    ' html.pm-on nav.bar-links>a, html.pm-on nav.mb-links{display:none!important}' +
    ' html.pm-on #dock-rail{display:none!important}' +
    ' html.pm-on nav.pill.links, html.pm-on nav.bar-links{overflow:visible!important}' +
    ' html.pm-on .pm-btn{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;min-width:44px;height:44px!important;padding:0 14px!important;margin:0;border:0;border-radius:999px;background:transparent;color:inherit;font:700 15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    ' .pm-btn svg{width:20px;height:20px}' +
    ' .pm-sheet{position:fixed;left:10px;right:10px;z-index:10060;border-radius:18px;padding:8px;max-height:calc(100dvh - 90px);overflow:auto;box-shadow:0 18px 50px -12px rgba(0,0,0,.45);font:16px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    ' .pm-sheet[hidden]{display:none}' +
    ' .pm-sheet a,.pm-sheet button{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:0 14px;border:0;border-radius:12px;background:none;color:inherit;font-weight:600;font-size:16px;line-height:1.2;font-family:inherit;text-align:left;text-decoration:none;cursor:pointer}' +
    ' .pm-sheet a.pm-cur{font-weight:800}' +
    ' .pm-sheet a.pm-cur::after{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;margin-left:auto}' +
    ' .pm-sheet .pm-h{font-weight:800;font-size:11px;line-height:1;font-family:inherit;letter-spacing:.16em;text-transform:uppercase;opacity:.55;padding:14px 14px 6px}' +
    ' .pm-sheet .pm-apps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}' +
    ' .pm-sheet .pm-apps button{flex-direction:column;justify-content:center;gap:6px;min-height:72px;padding:6px 2px;font-weight:600;font-size:12px;line-height:1.15;font-family:inherit;text-align:center}' +
    ' .pm-sheet .pm-apps svg{width:24px;height:24px}' +
    ' .pm-shade{position:fixed;inset:0;z-index:10055;background:rgba(0,0,0,.18)}' +
    ' .pm-shade[hidden]{display:none}' +
    '}';
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'pm-btn';
  btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'pm-sheet');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Menu';
  if (nav.classList.contains('mb-links')) {
    var right = document.querySelector('.mb-right');
    right.insertBefore(btn, right.firstChild);
  } else {
    nav.insertBefore(btn, nav.firstChild);
  }

  var shade = document.createElement('div'); shade.className = 'pm-shade'; shade.hidden = true;
  var sheet = document.createElement('div');
  sheet.className = 'pm-sheet'; sheet.id = 'pm-sheet'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Site menu');

  var h = document.createElement('div'); h.className = 'pm-h'; h.textContent = 'Pages'; sheet.appendChild(h);
  [].forEach.call(nav.querySelectorAll('a, button[data-action="contact"]'), function (a) {
    var c = a.cloneNode(true);
    c.removeAttribute('id'); c.removeAttribute('data-action'); c.className = '';
    var label = (a.textContent || '').trim() || a.getAttribute('aria-label') || '';
    if (/desktop/i.test(a.getAttribute('aria-label') || '') && !/desktop/i.test(label)) label = 'Desktop';
    c.textContent = label;
    var isReel = a.hasAttribute('data-reel-name') || /reel\.html/i.test(a.getAttribute('href') || '') || /meet marcin/i.test(label);
    if (isReel) {
      var ico = document.createElement('span');
      ico.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block"><path d="M8 5v14l11-7z"/></svg>';
      ico.style.cssText = 'display:inline-flex;align-items:center;margin-right:8px;flex:none;width:16px;height:16px';
      c.insertBefore(ico, c.firstChild);
    }
    if (a.getAttribute('aria-current') === 'page' || a.classList.contains('cur') || a.classList.contains('cur-link')) c.classList.add('pm-cur');
    if (a.tagName === 'BUTTON') c.addEventListener('click', function () { close(); a.click(); });
    else c.addEventListener('click', function () { setTimeout(close, 0); });
    sheet.appendChild(c);
  });

  if (dock) {
    var h2 = document.createElement('div'); h2.className = 'pm-h'; h2.textContent = 'Apps'; sheet.appendChild(h2);
    var grid = document.createElement('div'); grid.className = 'pm-apps'; sheet.appendChild(grid);
    [].forEach.call(dock.querySelectorAll('button'), function (d) {
      if (d.dataset.href === 'road.html') return; /* already under Pages */
      var b = document.createElement('button'); b.type = 'button';
      var svg = d.querySelector('svg');
      b.innerHTML = (svg ? svg.outerHTML : '') + '<span></span>';
      b.lastChild.textContent = (d.getAttribute('title') || d.getAttribute('aria-label') || '').replace(/:.*/, '');
      b.addEventListener('click', function () { close(); d.click(); });
      grid.appendChild(b);
    });
  }
  document.body.appendChild(shade); document.body.appendChild(sheet);

  function paint() {
    var col = getComputedStyle(document.body).color.match(/\d+/g) || [30, 30, 30];
    var lum = (0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2]) / 255;
    var dark = lum > 0.6;
    sheet.style.background = dark ? '#1b2029' : '#ffffff';
    sheet.style.color = dark ? '#eef1f5' : '#1e2124';
    sheet.style.border = '1px solid ' + (dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)');
    var hdr = btn.closest('header') || nav;
    sheet.style.top = Math.round(hdr.getBoundingClientRect().bottom + 6) + 'px';
  }
  function open() { paint(); sheet.hidden = false; shade.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
  function close() { if (sheet.hidden) return; sheet.hidden = true; shade.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); sheet.hidden ? open() : close(); });
  shade.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  addEventListener('resize', function () { if (!Q.matches) close(); });

  function sync() { document.documentElement.classList.toggle('pm-on', Q.matches); if (!Q.matches) close(); }
  sync();
  if (Q.addEventListener) Q.addEventListener('change', sync); else Q.addListener(sync);
})();
