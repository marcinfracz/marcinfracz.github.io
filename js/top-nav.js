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
