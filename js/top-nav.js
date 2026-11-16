/* Round 28: links meant for the whole window (target="_top") go to the highest window of this
   site instead. That keeps them working inside the desktop's browser window, on the live site,
   and in a preview frame, where a jump to the very top window is not allowed. Other sites open
   in a new tab. */
(function () {
  function topWin() {
    var w = window;
    try { while (w.parent && w.parent !== w && w.parent.location.origin === location.origin) w = w.parent; } catch (e) {}
    return w;
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    var b = document.querySelector('base[target]');
    var t = a.getAttribute('target') || (b && b.getAttribute('target')) || '';
    if (t !== '_top') return;
    var u = new URL(a.getAttribute('href'), location.href);
    if (!/^https?:$/.test(u.protocol)) return;
    e.preventDefault();
    if (u.origin === location.origin) topWin().location.href = u.href;
    else window.open(u.href, '_blank', 'noopener');
  });
})();

/* v41: inside the Desktop's browser window, links to other pages of this site open as new tabs
   in that window (the Resume PDF too), Desktop shows the Desktop, Contact opens its note.
   The Road keeps its full-screen move. Other sites still open in a real new tab.
   On its own, outside the Desktop, every link works as before. */
(function () {
  var inDesk = false;
  try { inDesk = window.parent !== window && window.parent.location.origin === location.origin && /\/(index\.html)?$/.test(window.parent.location.pathname); } catch (e) {}
  if (!inDesk) return;
  function send(msg) { window.parent.postMessage({ mfStart: msg }, location.origin); }
  window.addEventListener('click', function (e) {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download') || a.hasAttribute('data-ext')) return;
    var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (!/^https?:$/.test(u.protocol) || u.origin !== location.origin) return;
    var path = u.pathname, here = location.pathname;
    if (path === here && u.search === location.search) return; /* a spot on this same page */
    if (/\/road\.html$/.test(path)) return; /* the Road keeps its own full-screen move */
    e.preventDefault(); e.stopPropagation();
    if (/\/(index\.html)?$/.test(path)) { send(u.hash === '#contact' ? { act: 'contact' } : { act: 'desktop' }); return; }
    send({ href: u.href, title: '' });
  }, true);
})();

/* v43: inside the Road's live demos window, The Road closes the window, the Resume and Contact
   open the Road's own sheets, and other pages of this site replace the Road. */
(function () {
  var inRoad = false;
  try { inRoad = window.parent !== window && window.parent.location.origin === location.origin && /\/road\.html$/.test(window.parent.location.pathname); } catch (e) {}
  if (!inRoad) return;
  window.addEventListener('click', function (e) {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download') || a.hasAttribute('data-ext')) return;
    var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (!/^https?:$/.test(u.protocol) || u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ mfRoad: { href: u.href } }, location.origin);
  }, true);
})();
