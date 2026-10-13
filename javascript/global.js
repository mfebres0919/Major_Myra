/* ==========================================================================
   MAJOR MYRA — GLOBAL SCRIPTS
   Loader; header: turns black once the page scrolls; mobile menu.
   ========================================================================== */

/* ---------- Loader: lift it once the line under "MYRA" has drawn ---------- */
(function () {
  const root = document.documentElement;
  const loader = document.querySelector('.loader');
  if (!loader || !root.classList.contains('is-loading')) return;

  const line = loader.querySelector('.loader__underline path');
  let lifted = false;

  function lift() {
    if (lifted) return;
    lifted = true;
    loader.classList.add('is-leaving');
    root.classList.remove('is-loading');
    loader.addEventListener('animationend', () => loader.remove(), { once: true });
  }

  // A short beat after the line finishes, then up it goes
  line.addEventListener('animationend', () => setTimeout(lift, 350), { once: true });
  // Failsafe in case the animation event never arrives
  setTimeout(lift, 4000);
})();

(function () {
  const header = document.getElementById('header');
  if (!header) return;

  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav');
  const desktop = window.matchMedia('(min-width: 1024px)');

  /* ---------- See-through over the hero, ivory once scrolled ---------- */
  function updateScrolled() {
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  }

  window.addEventListener('scroll', updateScrolled, { passive: true });
  updateScrolled();

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    header.classList.toggle('is-open', open);
    // Hold the page still behind the open menu
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.documentElement.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  // Tapping outside, or on the scrim (the header itself, via ::after), closes it
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target) || event.target === header) setMenu(false);
  });

  desktop.addEventListener('change', () => setMenu(false));
})();


/* ---------- Highlight the nav link for the section on screen ----------
   Each link names the sections it covers (the projects intro counts as
   Projects, the final CTA as Contact). The active one is the last whose top
   has passed 40% of the screen. "Join the Team" shares Contact's target, so
   only the plain Contact link lights up. */
(function () {
  const groups = [
    { link: '.nav__link[href="#top"]', sections: ['#top'] },
    { link: '.nav__link[href="#projects"]', sections: ['#work', '#projects'] },
    { link: '.nav__link[href="#about"]', sections: ['#about'] },
    { link: '.nav__link[href="#contact"]:not([data-inquiry])', sections: ['.cta-zoom', '#contact'] },
  ]
    .map((group) => ({
      link: document.querySelector(group.link),
      sections: group.sections.map((sel) => document.querySelector(sel)).filter(Boolean),
    }))
    .filter((group) => group.link && group.sections.length);
  if (!groups.length) return;

  const allLinks = document.querySelectorAll('.nav__link');
  let current = null;
  let queued = false;

  function update() {
    queued = false;
    const line = window.innerHeight * 0.4;
    let active = groups[0];
    groups.forEach((group) => {
      if (group.sections.some((section) => section.getBoundingClientRect().top <= line)) active = group;
    });
    // At the very bottom of the page, the last group wins
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      active = groups[groups.length - 1];
    }
    if (active === current) return;
    current = active;
    allLinks.forEach((link) => link.removeAttribute('aria-current'));
    active.link.setAttribute('aria-current', 'true');
  }

  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();


/* ---------- Back to top ----------
   Shows once the first screen has scrolled away; glides up through Lenis
   when smooth scrolling is on, then hands focus back to the top. */
(function () {
  const button = document.querySelector('.to-top');
  if (!button) return;
  button.hidden = false;

  let queued = false;
  function update() {
    queued = false;
    button.classList.toggle('is-visible', window.scrollY > window.innerHeight);
  }

  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();

  button.addEventListener('click', () => {
    if (window.lenis) window.lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('.logo')?.focus({ preventScroll: true });
  });
})();
