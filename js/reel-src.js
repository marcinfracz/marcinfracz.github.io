/* v62: "Meet Marcin", the one-minute video, used everywhere on the site. Its name and files are set here, in one place.
   name: what the video is called on every page. src and poster: the wide cut. phoneSrc and phonePoster: the tall
   cut that phones show while upright (js/reel-player.js). captions: a .vtt file, if one is added later. */
window.MF_REEL = { name: "Meet Marcin", src: "assets/sizzle-reel-1min.mp4", poster: "assets/reel-poster.jpg", phoneSrc: "assets/sizzle-reel-1min-phone.mp4", phonePoster: "assets/reel-poster-phone.jpg", length: "1:04", captions: "" };

/* file paths are relative to the site's root, so pages in folders (work/) find them too */
(function () {
  var R = window.MF_REEL, me = document.currentScript, base;
  try { base = new URL('../', me && me.src ? me.src : location.href); } catch (e) { return; }
  ['src', 'poster', 'phoneSrc', 'phonePoster', 'captions'].forEach(function (k) { if (R[k]) R[k] = new URL(R[k], base).href; });
  /* the name on the page: any element marked data-reel-name shows it */
  function fill() {
    document.querySelectorAll('[data-reel-name]').forEach(function (el) {
      var t = el.getAttribute('data-reel-name');
      if (t === 'title' || t === 'aria') { el.setAttribute('aria-label', R.name); if (t === 'title') el.setAttribute('title', R.name); }
      else el.textContent = R.name;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
