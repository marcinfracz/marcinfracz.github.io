/* v45: on phones (under 768px) the site links fold into one Menu button.
   Same links, same targets: the menu holds copies of the page's own nav links, so every
   click rule on the page (Desktop window, Road window, new tabs) still applies.
   On the Desktop the app dock folds into the same menu. Tablet and desktop are untouched. */
(function () {
  /* v83: site root from this script's own address, so the Apps links work at any page depth */
  var ROOT = new URL('../', (document.currentScript && document.currentScript.src) || location.href).href;
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
    ' .pm-sheet .pm-apps button,.pm-sheet .pm-apps a{flex-direction:column;justify-content:center;gap:6px;min-height:72px;padding:6px 2px;font-weight:600;font-size:12px;line-height:1.15;font-family:inherit;text-align:center}' +
    ' .pm-sheet .pm-apps svg{width:24px;height:24px}' +
    /* v83: Meet Marcin keeps its label in line with the other rows; the play button sits at the row's end */
    ' .pm-sheet .pm-play{margin-left:auto;flex:none;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:currentColor}' +
    ' .pm-sheet .pm-play svg{width:14px;height:14px;margin-left:2px;fill:var(--pm-bg,#fff)}' +
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
  var navByLabel = {};
  [].forEach.call(nav.querySelectorAll('a, button[data-action="contact"]'), function (a) {
    var c = a.cloneNode(true);
    c.removeAttribute('id'); c.removeAttribute('data-action'); c.className = '';
    var label = (a.textContent || '').trim() || a.getAttribute('aria-label') || '';
    if (/desktop/i.test(a.getAttribute('aria-label') || '') && !/desktop/i.test(label)) label = 'Desktop';
    c.textContent = label;
    navByLabel[label.toLowerCase()] = a;
    var isReel = a.hasAttribute('data-reel-name') || /reel\.html/i.test(a.getAttribute('href') || '') || /meet marcin/i.test(label);
    if (isReel) {
      var ico = document.createElement('span');
      ico.className = 'pm-play'; ico.setAttribute('aria-hidden', 'true');
      ico.innerHTML = '<svg viewBox="0 0 12 12"><path d="M2.5 1.2v9.6l8-4.8z"/></svg>';
      c.appendChild(ico);
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
  } else {
    /* v83: pages without the Desktop's dock get the same Apps grid. A tile uses the page's own
       link when it has one (same click rules as the Pages rows), otherwise it opens that app on the Desktop. */
    var S = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
    var APPS = [
      ['Finder', 'index.html#finder', S + '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>'],
      ['Timeline', 'work/timeline.html', S + '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'],
      ['Tools I Built', 'work/brag-book.html', S + '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'],
      ['Meet Marcin', 'reel.html', S + '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10 9.2v5.6l4.6-2.8z" fill="currentColor"/></svg>'],
      ['Projects', 'index.html#projects', S + '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'],
      ['Notes', 'index.html#notes', S + '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z"/><path d="M15 3v6h6M9 13h6M9 17h4"/></svg>'],
      ['Terminal', 'index.html#terminal', S + '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12 15h5"/></svg>'],
      ['About', 'about.html', S + '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>'],
      ['Contact', 'index.html#contact', S + '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'],
      ['Browser', 'index.html#browser', S + '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none"/></svg>'],
      ['LinkedIn', 'https://www.linkedin.com/in/marcinfracz/', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>'],
      ['Drive mode (game)', 'drive.html', S + '<path d="M7 7h10a5 5 0 0 1 4.8 6.4l-.9 3.2a2.6 2.6 0 0 1-4.4 1.1L14.4 15.5H9.6l-2.1 2.2a2.6 2.6 0 0 1-4.4-1.1l-.9-3.2A5 5 0 0 1 7 7z"/><path d="M7.5 10v3M6 11.5h3"/><circle cx="15.5" cy="10.5" r=".6" fill="currentColor"/><circle cx="17.5" cy="12.5" r=".6" fill="currentColor"/></svg>']
    ];
    var h3 = document.createElement('div'); h3.className = 'pm-h'; h3.textContent = 'Apps'; sheet.appendChild(h3);
    var grid2 = document.createElement('div'); grid2.className = 'pm-apps'; sheet.appendChild(grid2);
    APPS.forEach(function (app) {
      var src = navByLabel[app[0].toLowerCase()], t;
      if (src && src.tagName === 'BUTTON') {
        t = document.createElement('button'); t.type = 'button';
        t.addEventListener('click', function () { close(); src.click(); });
      } else {
        if (src) { t = src.cloneNode(false); t.removeAttribute('id'); t.removeAttribute('aria-current'); t.className = ''; }
        else {
          t = document.createElement('a');
          if (/^https?:/.test(app[1])) { t.href = app[1]; t.target = '_blank'; t.rel = 'noopener'; t.setAttribute('data-ext', '1'); }
          else { t.href = ROOT + app[1]; t.target = '_top'; }
        }
        t.addEventListener('click', function () { setTimeout(close, 0); });
      }
      t.innerHTML = app[2] + '<span></span>';
      t.lastChild.textContent = app[0];
      grid2.appendChild(t);
    });
  }
  document.body.appendChild(shade); document.body.appendChild(sheet);

  function paint() {
    var col = getComputedStyle(document.body).color.match(/\d+/g) || [30, 30, 30];
    var lum = (0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2]) / 255;
    var dark = lum > 0.6;
    sheet.style.background = dark ? '#1b2029' : '#ffffff';
    sheet.style.setProperty('--pm-bg', dark ? '#1b2029' : '#ffffff');
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
