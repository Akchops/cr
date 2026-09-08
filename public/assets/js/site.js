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

  /* ============================ SIGNATURE 1 ============================
     Cinematic hero reveal. Frame opens from a centre slit, image settles
     from overscale, headline lines rise in stagger. Under 1.2s total.   */
  (function heroEntrance() {
    var hero = document.querySelector('.hero');
    var fig = document.querySelector('[data-hero-figure]');
    if (!hero || !fig) return;

    function open() {
      hero.classList.remove('is-arming'); hero.classList.add('is-open');
      fig.classList.remove('is-arming');  fig.classList.add('is-open');
    }
    if (prefersReduced()) { open(); return; }

    var net = window.setTimeout(open, 1400);   // safety net armed first
    hero.classList.add('is-arming');
    fig.classList.add('is-arming');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { window.clearTimeout(net); open(); });
    });
  })();

  /* --------------------------------------------------- scroll-in reveals */
  (function reveals() {
    if (!canObserve || prefersReduced()) return;
    var targets = [].slice.call(document.querySelectorAll(
      '.work .section-head, .ba__head, .services .section-head, .svc__row,' +
      '.svc__foot, .also, .about__shot, .about__copy, .reviews-sec .section-head,' +
      '.rv, .contact .section-head, .contact__actions, .contact__panel, .closing__inner'
    ));
    if (!targets.length) return;
    targets.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = el.parentElement ? [].slice.call(el.parentElement.children) : [];
        var i = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(i, 4) * 70 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
    window.setTimeout(function () {
      targets.forEach(function (el) { el.classList.add('is-in'); });
    }, 4000);
  })();

  /* ------------------------------------------- thin yellow rules draw in */
  (function rules() {
    if (!canObserve || prefersReduced()) {
      [].forEach.call(document.querySelectorAll('.eyebrow--rule'), function (r) { r.classList.add('is-in'); });
      return;
    }
    var rs = [].slice.call(document.querySelectorAll('.eyebrow--rule'));
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    rs.forEach(function (r) { io.observe(r); });
    window.setTimeout(function () { rs.forEach(function (r) { r.classList.add('is-in'); }); }, 4000);
  })();

  /* ------------------------------------------------ mask reveals (photos) */
  (function maskReveals() {
    if (!canObserve || prefersReduced()) return;
    var sel = ['.work-grid .shot__frame', '.about__shot .shot__frame', '.svc__shot .shot__frame'];
    var frames = [].slice.call(document.querySelectorAll(sel.join(',')));
    if (!frames.length) return;
    frames.forEach(function (f) { f.classList.add('mask'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var g = el.closest('li, .svc__row, .about__shot');
        var i = (g && g.parentElement) ? [].indexOf.call(g.parentElement.children, g) : 0;
        el.style.transitionDelay = Math.min(i, 3) * 90 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    frames.forEach(function (f) { io.observe(f); });
    window.setTimeout(function () { frames.forEach(function (f) { f.classList.add('is-in'); }); }, 4000);
  })();

  /* ============================ SIGNATURE 3 ============================
     Before/after comparison. Upgrades the side-by-side pair to an overlay
     with a draggable, keyboard-operable divider. Falls back to the pair. */
  (function compare() {
    var pair = document.querySelector('[data-compare]');
    if (!pair || prefersReduced()) return;
    var range = pair.querySelector('.ba__range');
    var after = pair.querySelector('.ba__half--after');
    if (!range || !after) return;

    pair.classList.add('is-compare');

    function set(v) {
      var pos = Math.max(0, Math.min(100, v));
      pair.style.setProperty('--pos', pos + '%');
      if (range.value !== String(pos)) range.value = pos;
      range.setAttribute('aria-valuetext', Math.round(pos) + '% of the after photograph shown');
    }
    set(50);
    range.addEventListener('input', function () { set(parseFloat(range.value)); });

    // Pointer sweep on fine pointers: hovering scrubs without needing a drag.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var raf = 0;
      pair.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = pair.getBoundingClientRect();
          set(((e.clientX - r.left) / r.width) * 100);
        });
      });
      pair.addEventListener('pointerleave', function () { set(50); });
    }
  })();

  /* ------------------------------------------------------------ scroll spy */
  (function scrollSpy() {
    if (!canObserve) return;
    var links = [].slice.call(document.querySelectorAll('.site-nav a[href^="#"]'));
    if (!links.length) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = map[e.target.id];
        if (a && e.isIntersecting) {
          links.forEach(function (l) { l.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  })();

  /* ---------------------- mobile beat index (no pinning, no scroll trap) */
  (function mobileIndex() {
    if (!canObserve) return;
    if (window.matchMedia('(min-width: 960px)').matches) return;
    var num = document.querySelector('[data-index-num]');
    var wrap = document.querySelector('.stage__index');
    var beats = [].slice.call(document.querySelectorAll('.stage__beat'));
    if (!num || !beats.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = String(beats.indexOf(e.target) + 1).padStart(2, '0');
        if (num.textContent === n) return;
        if (wrap) {
          wrap.classList.add('is-swapping');
          window.setTimeout(function () { num.textContent = n; wrap.classList.remove('is-swapping'); }, 160);
        } else { num.textContent = n; }
      });
    }, { rootMargin: '-35% 0px -45% 0px' });
    beats.forEach(function (b) { io.observe(b); });
  })();

  /* --------------------------------------------- GSAP scroll choreography */
  if (!hasGsap) return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  var gsap = window.gsap;
  var mm = gsap.matchMedia();
  var MOTION_OK = '(prefers-reduced-motion: no-preference)';

  /* Hero on scroll: the frame widens, the photograph drifts at its own rate,
     and the background word moves slower than everything in front of it. */
  mm.add('(min-width: 960px) and ' + MOTION_OK, function () {
    var fig = document.querySelector('[data-hero-figure]');
    var img = fig && fig.querySelector('.shot__frame img, .shot__frame .shot__pending');
    var ghost = document.querySelector('.hero__ghost');
    if (!fig) return;

    var pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 40;

    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=620', scrub: .5 } })
      .to(fig, { marginRight: -pad * 1.6, marginLeft: -pad * .5, ease: 'none' }, 0)
      .to(img || fig, { yPercent: 8, scale: 1.06, ease: 'none' }, 0);

    if (ghost) {
      gsap.to(ghost, { y: 150, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .9 } });
    }
  });

  /* Mobile hero: no pinning, just a gentle differential drift so the first
     screen has life without costing touch performance. */
  mm.add('(max-width: 959px) and ' + MOTION_OK, function () {
    var img = document.querySelector('[data-hero-figure] .shot__frame img, [data-hero-figure] .shot__frame .shot__pending');
    if (!img) return;
    gsap.to(img, { yPercent: 6, scale: 1.05, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } });
  });

  /* ============================ SIGNATURE 2 ============================
     Desktop scroll-driven work showcase. Pinned, three real photographs,
     directional wipes, scaling for depth, index and caption per beat, and
     it releases straight into the before/after.                          */
  mm.add('(min-width: 960px) and ' + MOTION_OK, function () {
    var stage = document.querySelector('[data-stage]');
    if (!stage) return;
    var beats = [].slice.call(stage.querySelectorAll('.stage__beat'));
    var numEl = stage.querySelector('[data-index-num]');
    var idxWrap = stage.querySelector('.stage__index');
    if (beats.length < 3) return;

    stage.classList.add('is-pinned');
    ScrollTrigger.refresh();

    var frames = beats.map(function (b) { return b.querySelector('.shot__frame'); });
    // Scale the picture inside the frame; scaling the frame itself would push
    // it past the viewport instead of creating depth within the crop.
    var inner = beats.map(function (b) { return b.querySelector('.shot__frame picture, .shot__frame .shot__pending'); });
    var caps = beats.map(function (b) { return b.querySelector('.shot__cap'); });
    // Alternate wipe direction so each transition reads as a deliberate cut.
    var FROM = ['inset(0% 0% 0% 100%)', 'inset(100% 0% 0% 0%)', 'inset(0% 100% 0% 0%)'];
    var SHOWN = 'inset(0% 0% 0% 0%)';

    gsap.set(beats[0], { clipPath: SHOWN });
    gsap.set([beats[1], beats[2]], { clipPath: function (i) { return FROM[i + 1]; } });
    gsap.set([caps[1], caps[2]], { opacity: 0, y: 18 });
    gsap.set([inner[1], inner[2]].filter(Boolean), { scale: 1.12 });

    var hdr = (document.querySelector('.site-header') || { offsetHeight: 72 }).offsetHeight;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage, start: 'top top+=' + hdr, end: 'bottom bottom', scrub: .5,
        onUpdate: function (self) {
          if (!numEl) return;
          var p = self.progress;
          // Thresholds sit mid-wipe so the number turns with the image.
          var n = p < 0.28 ? '01' : (p < 0.78 ? '02' : '03');
          if (numEl.textContent === n) return;
          if (idxWrap) {
            idxWrap.classList.add('is-swapping');
            window.setTimeout(function () { numEl.textContent = n; idxWrap.classList.remove('is-swapping'); }, 120);
          } else { numEl.textContent = n; }
        }
      }
    });

    [1, 2].forEach(function (i, k) {
      var at = k === 0 ? 0.15 : 1.35;
      tl.to(beats[i], { clipPath: SHOWN, ease: 'power2.inOut', duration: 1 }, at)
        .to(inner[i], { scale: 1, ease: 'power2.out', duration: 1.1 }, at)
        .to(inner[i - 1], { scale: 0.94, ease: 'power2.in', duration: 1 }, at)
        .to(caps[i - 1], { opacity: 0, y: -14, ease: 'power2.in', duration: .45 }, at)
        .to(caps[i], { opacity: 1, y: 0, ease: 'power2.out', duration: .55 }, at + .35);
    });

    return function cleanup() {
      stage.classList.remove('is-pinned');
      gsap.set(beats, { clearProps: 'clipPath' });
      gsap.set(inner.filter(Boolean), { clearProps: 'scale' });
      gsap.set(caps, { clearProps: 'opacity,transform' });
      if (numEl) numEl.textContent = '01';
    };
  });

  /* Mobile work cards: full-width, directional wipe and scale on entry.
     Native scrolling throughout - nothing is pinned. */
  mm.add('(max-width: 959px) and ' + MOTION_OK, function () {
    var beats = [].slice.call(document.querySelectorAll('.stage__beat'));
    beats.forEach(function (beat, i) {
      var frame = beat.querySelector('.shot__frame');
      var cap = beat.querySelector('.shot__cap');
      if (!frame) return;
      var from = i % 2 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)';
      var pic = frame.querySelector('picture, .shot__pending');
      gsap.fromTo(frame, { clipPath: from },
        { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', duration: .9,
          scrollTrigger: { trigger: beat, start: 'top 82%', once: true } });
      if (pic) {
        gsap.fromTo(pic, { scale: 1.12 },
          { scale: 1, ease: 'power2.out', duration: 1.1,
            scrollTrigger: { trigger: beat, start: 'top 82%', once: true } });
      }
      if (cap) {
        gsap.from(cap, { opacity: 0, y: 16, duration: .5, ease: 'power2.out',
          scrollTrigger: { trigger: beat, start: 'top 74%', once: true } });
      }
    });
  });
})();
