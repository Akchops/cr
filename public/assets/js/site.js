/* =============================================================================
   Carriagetown Detailing — unofficial concept
   Interaction layer.

   Contract: the page is complete and navigable without any of this file.
   Nothing here is required to read content, follow a link, or place a call.
   Every animated element is visible by default; JS opts elements in and a
   safety net restores final states if anything goes wrong.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var canObserve = 'IntersectionObserver' in window;

  function prefersReduced() { return reduced.matches; }

  /* ------------------------------------------------------------------ menu */
  (function mobileMenu() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    }

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!open);
      if (!open) {
        var first = nav.querySelector('a');
        if (first) first.focus();
      }
    });

    // Escape closes and returns focus to the button.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      setOpen(false);
      toggle.focus();
    });

    // Choosing a destination closes the menu.
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // Clicking outside closes it.
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.target.closest('#site-nav') || e.target.closest('.nav-toggle')) return;
      setOpen(false);
    });

    // Returning to desktop width must never leave a stale open panel.
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) {
      if (e.matches) setOpen(false);
    });
  })();

  /* ------------------------------------------------ copy a phone number */
  (function copyNumbers() {
    var buttons = [].slice.call(document.querySelectorAll('.copy'));
    if (!buttons.length) return;
    var status = document.getElementById('copy-status');

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:absolute;left:-9999px;top:0;';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var done = function (ok) {
          btn.textContent = ok ? 'Copied' : 'Select it';
          btn.classList.toggle('is-done', ok);
          if (status) status.textContent = ok ? text + ' copied' : 'Copy failed — select the number manually';
          window.setTimeout(function () {
            btn.textContent = 'Copy';
            btn.classList.remove('is-done');
          }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text)
            .then(function () { done(true); })
            .catch(function () { done(fallbackCopy(text)); });
        } else {
          done(fallbackCopy(text));
        }
      });
    });
  })();

  /* --------------------------------------------------- hero entrance (1/2) */
  (function heroEntrance() {
    var fig = document.querySelector('[data-hero-figure]');
    if (!fig) return;

    function open() { fig.classList.remove('is-arming'); fig.classList.add('is-open'); }

    if (prefersReduced()) { open(); return; }

    // Safety net first: if anything below throws, the frame still opens.
    var net = window.setTimeout(open, 1100);

    fig.classList.add('is-arming');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.clearTimeout(net);
        open();
      });
    });
  })();

  /* --------------------------------------------------- scroll-in reveals */
  (function reveals() {
    if (!canObserve || prefersReduced()) return;

    var targets = [].slice.call(document.querySelectorAll(
      '.work .section-head, .ba, .work-grid > li, .services .section-head, .svc__row,' +
      '.svc__foot, .about__shot, .about__copy, .contact .section-head,' +
      '.contact__actions, .contact__panel, .closing__inner'
    ));
    if (!targets.length) return;

    targets.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });

    // Anything still hidden after 4s is forced visible. Content never gets lost.
    window.setTimeout(function () {
      targets.forEach(function (el) { el.classList.add('is-in'); });
    }, 4000);
  })();

  /* ------------------------------------------------ mask reveals (photos) */
  (function maskReveals() {
    if (!canObserve || prefersReduced()) return;

    var sel = ['.ba .shot__frame', '.work-grid .shot__frame',
               '.about__shot .shot__frame', '.svc__shot .shot__frame'];
    // Above 960px the work stage runs its own pinned mask, so leave it alone.
    if (!window.matchMedia('(min-width: 960px)').matches) {
      sel.push('.stage__beat .shot__frame');
    }

    var frames = [].slice.call(document.querySelectorAll(sel.join(',')));
    if (!frames.length) return;

    frames.forEach(function (f) { f.classList.add('mask'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // Stagger siblings so a row resolves in sequence, not all at once.
        var group = el.closest('li, .ba__item, .svc__row, .about__shot');
        var idx = 0;
        if (group && group.parentElement) {
          idx = [].indexOf.call(group.parentElement.children, group);
        }
        el.style.transitionDelay = Math.min(idx, 3) * 90 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    frames.forEach(function (f) { io.observe(f); });

    // Nothing stays masked, whatever happens to the observer.
    window.setTimeout(function () {
      frames.forEach(function (f) { f.classList.add('is-in'); });
    }, 4000);
  })();

  /* ------------------------------------------------------------ scroll spy */
  (function scrollSpy() {
    if (!canObserve) return;
    var links = [].slice.call(document.querySelectorAll('.site-nav a[href^="#"]'));
    if (!links.length) return;

    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var sections = Object.keys(map)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var a = map[entry.target.id];
        if (!a) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  })();

  /* --------------------------------------------- GSAP scroll choreography */
  if (!hasGsap) return;

  window.gsap.registerPlugin(window.ScrollTrigger);
  var gsap = window.gsap;
  var mm = gsap.matchMedia();

  function padPx() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--pad');
    var n = parseFloat(v);
    return isNaN(n) ? 24 : (v.indexOf('rem') > -1 ? n * 16 : n);
  }

  /* Hero: frame expands modestly toward full width; the background word
     DETAIL shifts at a slower rate. The photograph itself is untouched. */
  mm.add('(min-width: 960px) and (prefers-reduced-motion: no-preference)', function () {
    var fig = document.querySelector('[data-hero-figure]');
    var ghost = document.querySelector('.hero__ghost');
    if (!fig) return;

    gsap.to(fig, {
      marginRight: -padPx(),
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=460', scrub: 0.6 }
    });

    if (ghost) {
      gsap.to(ghost, {
        y: 96, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
      });
    }
  });

  /* ------------------------------------- signature moment 2: pinned stage */
  mm.add('(min-width: 960px) and (prefers-reduced-motion: no-preference)', function () {
    var stage = document.querySelector('[data-stage]');
    if (!stage) return;

    var beats = [].slice.call(stage.querySelectorAll('.stage__beat'));
    var numEl = stage.querySelector('[data-index-num]');
    if (beats.length < 3) return;

    stage.classList.add('is-pinned');
    ScrollTrigger.refresh();

    var HIDDEN = 'inset(0% 100% 0% 0%)';
    var SHOWN = 'inset(0% 0% 0% 0%)';

    gsap.set([beats[1], beats[2]], { clipPath: HIDDEN });
    gsap.set(beats[0], { clipPath: SHOWN });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top top+=' + (document.querySelector('.site-header') || { offsetHeight: 72 }).offsetHeight,
        end: 'bottom bottom',
        scrub: 0.55,
        onUpdate: function (self) {
          if (!numEl) return;
          var p = self.progress;
          var n = p < 0.36 ? '01' : (p < 0.72 ? '02' : '03');
          if (numEl.textContent !== n) numEl.textContent = n;
        }
      }
    });

    tl.to(beats[1], { clipPath: SHOWN, ease: 'none', duration: 1 }, 0.12)
      .to(beats[2], { clipPath: SHOWN, ease: 'none', duration: 1 }, 1.32);

    // Leaving this breakpoint must restore an ordinary, readable gallery.
    return function cleanup() {
      stage.classList.remove('is-pinned');
      gsap.set(beats, { clearProps: 'clipPath' });
      if (numEl) numEl.textContent = '01';
    };
  });
})();
