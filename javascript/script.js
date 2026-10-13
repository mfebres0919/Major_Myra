/* ==========================================================================
   MAJOR MYRA — HOMEPAGE SCRIPTS
   ========================================================================== */

/* ---------- Autoplay helper for every background video ----------
   All the videos are silent, so browsers allow them to start on their own
   as long as they're muted and inline. If a phone still blocks it (iPhone
   Low Power Mode), they start on the visitor's first touch or scroll.
   Videos play even with reduced motion turned on: they're the content of a
   filmmaker's site, and the hero has its own pause button. */
const blockedVideos = new Set();

function autoplay(video) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  const attempt = video.play();
  if (attempt && attempt.catch) {
    attempt.catch(() => blockedVideos.add(video));
  }
}

['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach((type) => {
  window.addEventListener(type, () => {
    blockedVideos.forEach((video) => {
      blockedVideos.delete(video);
      if (!video.dataset.held) video.play().catch(() => {});
    });
  }, { passive: true, capture: true });
});

/* ---------- Hero video: portrait cut on phones, pause button ---------- */
(function () {
  const hero = document.querySelector('.hero');
  const video = document.getElementById('hero-video');
  if (!hero || !video) return;

  // Phones get the portrait crop (set before it loads, so only one file downloads)
  if (window.matchMedia('(max-width: 767px)').matches) {
    video.poster = video.dataset.mobilePoster;
    video.querySelector('source').src = video.dataset.mobileSrc;
    video.load();
  }

  autoplay(video);
  // Start again once it can, in case the first try came before it was ready
  video.addEventListener('canplay', () => {
    if (!hero.classList.contains('is-paused')) autoplay(video);
  }, { once: true });

  // Keep it going when the visitor comes back to the tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !hero.classList.contains('is-paused')) autoplay(video);
  });

  const button = document.getElementById('hero-pause');

  function setPaused(paused) {
    hero.classList.toggle('is-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    // Paused by the visitor: the first-touch retry leaves it alone
    if (paused) {
      video.dataset.held = 'true';
      video.pause();
    } else {
      delete video.dataset.held;
      autoplay(video);
    }
    hero.dispatchEvent(new CustomEvent('hero:pause', { detail: paused }));
  }

  button.addEventListener('click', () => setPaused(!hero.classList.contains('is-paused')));
})();

/* ---------- Hero statements: fade between the three ---------- */
(function () {
  const hero = document.querySelector('.hero');
  const wrap = document.querySelector('.hero__statements');
  if (!wrap) return;

  const statements = [...wrap.querySelectorAll('.statement')];
  const bars = [...document.querySelectorAll('.hero__progress-item')];
  const DURATION = 6500; // ms each statement stays
  let current = 0;
  let timer = null;
  let paused = false;

  // Swap [hidden] for the fading classes now that JS is running
  statements.forEach((statement) => statement.removeAttribute('hidden'));
  wrap.classList.add('is-ready');
  document.documentElement.style.setProperty('--duration', `${DURATION}ms`);

  function show(index) {
    statements[current].classList.remove('is-active');
    current = index;
    statements[current].classList.add('is-active');

    bars.forEach((bar, i) => {
      bar.classList.toggle('is-done', i < current);
      bar.classList.remove('is-active');
    });
    // Restart the fill animation on the active bar
    void bars[current].offsetWidth;
    bars[current].classList.add('is-active');
  }

  function schedule() {
    clearTimeout(timer);
    if (paused) return;
    timer = setTimeout(() => {
      if (!document.hidden) show((current + 1) % statements.length);
      schedule();
    }, DURATION);
  }

  // The pause button holds the statements too
  hero.addEventListener('hero:pause', (event) => {
    paused = event.detail;
    schedule();
  });

  schedule();
})();


/* ---------- Scroll helpers shared by the projects sections ---------- */
const clamp01 = (value) => Math.min(1, Math.max(0, value));

// How far through a tall track the page has scrolled while its sticky child
// is pinned: 0 when the track's top reaches the top of the screen, 1 when its
// bottom does
function trackProgress(track, sticky) {
  const range = track.offsetHeight - sticky.offsetHeight;
  return range > 0 ? clamp01(-track.getBoundingClientRect().top / range) : 1;
}

/* ---------- Projects intro: words arrive and fill as they come, then "play." is underlined ----------
   One scroll timeline across the pinned track (0 → 1). Each word has its
   own window: it slides or fades in, and its colour sweeps in left to right
   starting partway through its arrival, so the two happen together. The
   line under "play." draws last. */
(function () {
  const section = document.querySelector('.statement-fill');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const track = section.querySelector('.statement-fill__track');
  const sticky = section.querySelector('.statement-fill__sticky');
  const words = [...section.querySelectorAll('.fill-word')];
  const underline = section.querySelector('.fill-text__underline');

  // [start, end] of each word's arrival, in word order: The, work, speaks., Press, play.
  const ENTER = [[0, 0.18], [0.1, 0.28], [0.22, 0.42], [0.36, 0.6], [0.4, 0.64]];
  const FILL_DELAY = 0.4; // fill starts this far into the word's arrival...
  const FILL_TAIL = 0.1; //  ...and finishes this long after it lands
  const DRAW = [0.7, 0.86];
  const span = (value, [start, end]) => clamp01((value - start) / (end - start));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const SMOOTHING = 0.12; // share of the gap closed each frame; lower = silkier
  let shown = trackProgress(track, sticky); // what's drawn, easing after the real scroll
  let running = false;

  section.classList.add('is-ready');

  // Draw the words at a given point on the timeline
  function render(progress) {
    words.forEach((word, i) => {
      const [start, end] = ENTER[i] || ENTER[ENTER.length - 1];
      word.style.setProperty('--enter', easeOut(span(progress, [start, end])).toFixed(3));
      const fill = span(progress, [start + (end - start) * FILL_DELAY, end + FILL_TAIL]);
      word.style.setProperty('--fill', `${(fill * 100).toFixed(1)}%`);
    });

    if (underline) underline.style.setProperty('--draw', span(progress, DRAW).toFixed(3));
  }

  // Each frame, close part of the gap to the real scroll position, so the
  // words glide even when the page jumps (touch flicks, keyboard, links)
  function frame() {
    const target = trackProgress(track, sticky);
    shown += (target - shown) * SMOOTHING;
    if (Math.abs(target - shown) < 0.0005) shown = target;
    render(shown);
    if (shown !== target) requestAnimationFrame(frame);
    else running = false;
  }

  function request() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  render(shown);
})();

/* ---------- Projects carousel: a slow, endless glide ----------
   Moves the row's scroll position a little every frame (so swiping and the
   arrows keep working), wrapping back by one set of cards when it reaches
   the clones. Hovering, touching or using the arrows stops it; it picks up
   again a few seconds after the visitor lets go. Reduced motion: no glide. */
(function () {
  const section = document.querySelector('.projects');
  if (!section) return;

  const viewport = section.querySelector('.projects__viewport');
  const cards = [...section.querySelectorAll('.reel:not(.reel--clone)')];
  const firstClone = section.querySelector('.reel--clone');
  const SPEED = 22; // px per second
  const RESUME = 3500; // ms after the visitor lets go

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.classList.add('is-static');
  }
  const gliding = !section.classList.contains('is-static');

  let pos = 0;
  let last = 0;
  let hovered = false;
  let heldUntil = 0;
  let onScreen = false;

  // Width of one full set of cards, gaps included: where the loop wraps
  const setWidth = () => (firstClone ? firstClone.offsetLeft - cards[0].offsetLeft : viewport.scrollWidth);
  const step = () => cards[0].offsetWidth + parseFloat(getComputedStyle(cards[0].parentElement).columnGap || 0);

  function hold() {
    heldUntil = performance.now() + RESUME;
  }

  function frame(now) {
    const dt = last ? Math.min(now - last, 100) / 1000 : 0;
    last = now;
    const paused = hovered || now < heldUntil || !onScreen || document.hidden;
    if (paused) {
      pos = viewport.scrollLeft; // pick up from wherever the visitor left it
    } else {
      pos += SPEED * dt;
      const wrap = setWidth();
      if (pos >= wrap) pos -= wrap;
      viewport.scrollLeft = pos;
    }
    requestAnimationFrame(frame);
  }

  function move(dir) {
    hold();
    const wrap = setWidth();
    // Going back from the start: jump to the same spot in the clones first
    if (gliding && dir < 0 && viewport.scrollLeft < step()) viewport.scrollLeft += wrap;
    viewport.scrollBy({ left: dir * step(), behavior: 'smooth' });
  }

  section.querySelectorAll('.projects__arrow').forEach((arrow) => {
    arrow.addEventListener('click', () => move(Number(arrow.dataset.dir)));
  });

  if (!gliding) return;

  viewport.addEventListener('mouseenter', () => { hovered = true; });
  viewport.addEventListener('mouseleave', () => { hovered = false; });
  viewport.addEventListener('focusin', () => { hovered = true; });
  viewport.addEventListener('focusout', () => { hovered = false; });
  ['pointerdown', 'touchstart', 'touchmove', 'wheel'].forEach((type) => {
    viewport.addEventListener(type, hold, { passive: true });
  });

  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(viewport);
  requestAnimationFrame(frame);
})();

/* ---------- Project clips: load and play only while the carousel is on screen ----------
   Each card's <video> has its file in data-src, so nothing downloads until
   the section is near. Off screen (or in a hidden tab) they pause. */
(function () {
  const section = document.querySelector('.projects');
  if (!section || !('IntersectionObserver' in window)) return;

  const videos = [...section.querySelectorAll('.reel__video')];
  let loaded = false;
  let visible = false;

  function load() {
    loaded = true;
    videos.forEach((video) => {
      video.src = video.dataset.src;
      video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    });
  }

  function sync() {
    videos.forEach((video) => {
      // Clones only show on desktop; skip any card that isn't rendered
      const shown = video.offsetParent !== null;
      if (visible && shown && !document.hidden) autoplay(video);
      else video.pause();
    });
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !loaded) load();
    sync();
  }, { rootMargin: '300px 0px' }).observe(section);

  document.addEventListener('visibilitychange', sync);
})();


/* ---------- About: portraits cross-fade, "About Me" drifts as you scroll ---------- */
(function () {
  const section = document.querySelector('.about');
  if (!section) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slides = [...section.querySelectorAll('.about__slide')];
  const dots = [...section.querySelectorAll('.about__dots li')];
  const watermark = section.querySelector('.about__watermark');
  const DURATION = 4500; // ms each portrait stays
  let current = 0;

  if (slides.length > 1) {
    setInterval(() => {
      if (document.hidden) return;
      slides[current].classList.remove('is-active');
      dots[current]?.classList.remove('is-active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('is-active');
      dots[current]?.classList.add('is-active');
    }, DURATION);
  }

  if (reduceMotion || !watermark) return;

  // --drift: 0 as the section enters the bottom of the screen, 1 as it leaves the top
  let queued = false;
  function update() {
    queued = false;
    const box = section.getBoundingClientRect();
    const drift = clamp01((window.innerHeight - box.top) / (window.innerHeight + box.height));
    watermark.style.setProperty('--drift', drift.toFixed(3));
  }
  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
})();


/* ---------- Final CTA: the film card grows to fill the screen ----------
   Across the pinned track (0 → 1): 0.05–0.62 the card grows (--grow),
   0.66–0.9 the headline fades in (--reveal). Eased toward the real scroll
   each frame like the projects headline. The clip loads and plays only
   while the section is near the screen. */
(function () {
  const section = document.querySelector('.cta-zoom');
  if (!section) return;

  const card = section.querySelector('.cta-zoom__card');
  const video = section.querySelector('.cta-zoom__video');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!video.getAttribute('src')) video.src = video.dataset.src;
        autoplay(video);
      } else {
        video.pause();
      }
    }, { rootMargin: '300px 0px' }).observe(section);
  }

  if (reduceMotion) return;

  const track = section.querySelector('.cta-zoom__track');
  const sticky = section.querySelector('.cta-zoom__sticky');
  const span = (value, start, end) => clamp01((value - start) / (end - start));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const SMOOTHING = 0.12;
  let running = false;

  section.classList.add('is-ready');
  let shown = trackProgress(track, sticky);

  function render(progress) {
    card.style.setProperty('--grow', ease(span(progress, 0.05, 0.62)).toFixed(4));
    const reveal = span(progress, 0.66, 0.9);
    card.style.setProperty('--reveal', reveal.toFixed(3));
    card.classList.toggle('is-revealed', reveal > 0.5);
  }

  function frame() {
    const target = trackProgress(track, sticky);
    shown += (target - shown) * SMOOTHING;
    if (Math.abs(target - shown) < 0.0005) shown = target;
    render(shown);
    if (shown !== target) requestAnimationFrame(frame);
    else running = false;
  }

  function request() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  render(shown);
})();


/* ---------- Contact form ----------
   "Join the Team" links pick that inquiry and reword the fields. On submit:
   checks the required fields, then shows the thank-you. CONCEPT: nothing is
   sent yet; connect a form service before launch. */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const error = document.getElementById('cf-error');
  const done = document.getElementById('cf-done');
  const labels = form.querySelectorAll('.field__label[data-team]');

  function reword() {
    const team = form.elements.inquiry.value === 'team';
    labels.forEach((label) => { label.textContent = team ? label.dataset.team : label.dataset.default; });
  }

  form.addEventListener('change', (event) => {
    if (event.target.name === 'inquiry') reword();
  });

  document.querySelectorAll('[data-inquiry]').forEach((link) => {
    link.addEventListener('click', () => {
      const option = form.querySelector(`input[name="inquiry"][value="${link.dataset.inquiry}"]`);
      if (option) {
        option.checked = true;
        reword();
      }
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let valid = true;
    ['name', 'email', 'message'].forEach((name) => {
      const input = form.elements[name];
      const ok = name === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) : input.value.trim() !== '';
      input.closest('.field').classList.toggle('is-invalid', !ok);
      if (!ok) valid = false;
    });
    error.hidden = valid;
    if (!valid) return;

    form.hidden = true;
    done.hidden = false;
    done.focus();
  });
})();

/* ---------- Footer year stays current ---------- */
(function () {
  const year = document.getElementById('footer-year');
  if (year) year.textContent = new Date().getFullYear();
})();
