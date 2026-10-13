/* ==========================================================================
   SMOOTH SCROLLING
   Lenis (javascript/vendor/lenis.min.js) eases mouse-wheel and trackpad
   scrolling so the page glides instead of stepping, which also smooths every
   scroll-driven effect (the projects headline). Touch scrolling stays native.
   In-page links glide too, stopping below the fixed header. Off for reduced
   motion. Shared as window.lenis.
   ========================================================================== */

(function () {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) * 16 || 72;

  const lenis = new Lenis({
    duration: 1.2, // seconds a wheel scroll takes to settle; higher = floatier
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    anchors: { offset: -headerHeight },
  });

  window.lenis = lenis;

  // Hold the page still under the loader and the open mobile menu
  const root = document.documentElement;
  new MutationObserver(() => {
    const locked = root.classList.contains('is-loading') || root.style.overflow === 'hidden';
    if (locked) lenis.stop();
    else lenis.start();
  }).observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
  if (root.classList.contains('is-loading')) lenis.stop();

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();
