(function () {
  'use strict';
  const frame = document.getElementById('game-frame');
  const viewport = document.getElementById('game-viewport');
  let requesting = false;
  function resize() {
    const width = viewport.clientWidth, height = viewport.clientHeight;
    const rotated = height > width;
    frame.style.width = (rotated ? height : width) + 'px';
    frame.style.height = (rotated ? width : height) + 'px';
    frame.style.transform = rotated ? 'translateX(' + width + 'px) rotate(90deg)' : 'none';
    document.documentElement.dataset.rotated = String(rotated);
  }
  // The browser transforms canvas picking and multi-touch into the same landscape viewport.
  async function enter() {
    if (requesting || !matchMedia('(any-pointer:coarse)').matches) return;
    requesting = true;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try { await document.documentElement.requestFullscreen(); } catch (_) {}
      }
      if (screen.orientation && screen.orientation.lock) {
        try { await screen.orientation.lock('landscape'); } catch (_) {}
      }
    } finally { requesting = false; resize(); }
  }
  window.InsectDisplay = { enter, resize };
  new ResizeObserver(resize).observe(viewport);
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', resize);
  window.addEventListener('pageshow', resize);
  window.addEventListener('pagehide', () => { try { screen.orientation?.unlock(); } catch (_) {} });
  frame.addEventListener('load', () => {
    // Request before the asynchronous character save consumes user activation.
    frame.contentDocument?.addEventListener('click', event => {
      if (event.target.closest('#enter-world')) enter();
    }, { capture: true });
  });
  resize();
  frame.src = 'game.html' + location.search + location.hash;
})();
