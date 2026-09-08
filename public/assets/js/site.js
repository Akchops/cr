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


  /* ===================== REVERSIBLE SCROLL REVEALS =====================
     Every reveal is a ScrollTrigger with toggleActions
     "play reverse play reverse": it animates in whenever the element enters
     the viewport from either direction and animates back out when it leaves,
     so scrolling up replays exactly like scrolling down. Nothing is one-shot.
     These run on mobile and desktop alike - the only thing gated by width is
     the pinned stage.                                                       */
  mm.add(MOTION_OK, function () {
    var TA = 'play reverse play reverse';
    var made = [];

    function trig(el, start, end) {
      return { trigger: el, start: start || 'top 88%', end: end || 'bottom 6%', toggleActions: TA };
    }

    // --- single text blocks -------------------------------------------------
    gsap.utils.toArray([
      '.work .section-head', '.ba__head', '.services .section-head', '.svc__foot',
      '.also', '.about__copy', '.reviews-sec .section-head', '.contact .section-head',
      '.contact__actions', '.closing__inner'
    ].join(',')).forEach(function (el) {
      made.push(gsap.fromTo(el, { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: .72, ease: 'power2.out', scrollTrigger: trig(el) }));
    });

    // --- grouped, staggered -------------------------------------------------
    [['.svc', '.svc__row'], ['.rv__list', '.rv'], ['.work-grid', 'li'],
     ['.contact__grid', '.contact__panel'], ['.also__list', '.also__item']
    ].forEach(function (pair) {
      var box = document.querySelector(pair[0]);
      if (!box) return;
      var kids = box.querySelectorAll(pair[1]);
      if (!kids.length) return;
      made.push(gsap.fromTo(kids, { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: .7, ease: 'power2.out', stagger: .09,
          scrollTrigger: trig(box, 'top 85%') }));
    });

    // --- photography: directional mask + scale inside the crop --------------
    gsap.utils.toArray('.work-grid .shot__frame, .about__shot .shot__frame, .svc__shot .shot__frame')
      .forEach(function (frame, i) {
        var pic = frame.querySelector('picture, .shot__pending');
        var from = i % 2 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)';
        made.push(gsap.fromTo(frame, { clipPath: from },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: .85, ease: 'power2.out', scrollTrigger: trig(frame, 'top 86%') }));
        if (pic) {
          made.push(gsap.fromTo(pic, { scale: 1.12 },
            { scale: 1, duration: 1.05, ease: 'power2.out', scrollTrigger: trig(frame, 'top 86%') }));
        }
      });

    // --- thin yellow rules draw themselves, both directions -----------------
    gsap.utils.toArray('.eyebrow--rule').forEach(function (r) {
      made.push(gsap.fromTo(r, { '--rule-x': 0 }, { '--rule-x': 1, duration: .55, ease: 'power2.out',
        scrollTrigger: trig(r, 'top 92%') }));
      r.classList.add('is-in');
    });

    return function () { made.forEach(function (t) { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); }); };
  });

  /* Layout shifts as lazy images arrive, so positions are recalculated. */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  [].forEach.call(document.querySelectorAll('img'), function (img) {
    if (!img.complete) img.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
  });

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


  /* Hero replays. Scrolling back to the top re-arms the entrance so the
     reveal plays again on the way down, instead of only once per page load. */
  mm.add(MOTION_OK, function () {
    var hero = document.querySelector('.hero');
    var fig = document.querySelector('[data-hero-figure]');
    if (!hero || !fig) return;

    function arm()  { hero.classList.remove('is-open');  fig.classList.remove('is-open');
                      hero.classList.add('is-arming');   fig.classList.add('is-arming'); }
    function open() { hero.classList.remove('is-arming'); fig.classList.remove('is-arming');
                      hero.classList.add('is-open');      fig.classList.add('is-open'); }

    var st = ScrollTrigger.create({
      trigger: hero,
      start: 'bottom top',          // hero fully above the viewport
      onEnter: arm,                 // scrolled past it - reset, off-screen so unseen
      onLeaveBack: open             // coming back up into it - play again
    });
    return function () { st.kill(); open(); };
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
      var TA = 'play reverse play reverse';
      gsap.fromTo(frame, { clipPath: from },
        { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', duration: .9,
          scrollTrigger: { trigger: beat, start: 'top 84%', end: 'bottom 8%', toggleActions: TA } });
      if (pic) {
        gsap.fromTo(pic, { scale: 1.12 },
          { scale: 1, ease: 'power2.out', duration: 1.1,
            scrollTrigger: { trigger: beat, start: 'top 84%', end: 'bottom 8%', toggleActions: TA } });
      }
      if (cap) {
        gsap.fromTo(cap, { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: .5, ease: 'power2.out',
            scrollTrigger: { trigger: beat, start: 'top 78%', end: 'bottom 8%', toggleActions: TA } });
      }
    });
  });
})();
