/* =========================================================
   TZ — v2 home : 3D gallery
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ------------------------------------------------------- intro
     the mattes are animated in CSS, so this only has to unlock the
     page partway through the open and clear the element afterwards */
  var intro = document.querySelector('.intro');
  if (intro && (window.tzFromNav || reduced)) {
    intro.remove();
    intro = null;
  }
  if (intro) {
    document.body.classList.add('is-locked');
    setTimeout(function () { document.body.classList.remove('is-locked'); }, 2700);
    setTimeout(function () { intro.remove(); }, 3700);
  }
  document.body.classList.add('is-ready');

  /* ------------------------------------------------------- facts
     v2.js adds .is-in to .facts and the CSS staggers the four figures;
     here each number counts up from zero on the same stagger */
  var facts = document.querySelector('.facts');
  if (facts && !reduced && 'IntersectionObserver' in window) {
    var pad = function (v, w) { var s = String(v); while (s.length < w) s = '0' + s; return s; };
    var nums = [].slice.call(facts.querySelectorAll('.fact b')).map(function (b) {
      var txt = b.textContent.trim();
      var n = { el: b, to: parseInt(txt, 10), w: txt.length };
      if (!isNaN(n.to)) b.textContent = pad(0, n.w);
      return n;
    }).filter(function (n) { return !isNaN(n.to); });

    /* timers, not rAF: the count is time based, so it still lands on the
       real figure when the tab is in the background and rAF is paused */
    var countUp = function (n, delay) {
      var dur = 1500;
      setTimeout(function () {
        var start = performance.now();
        (function tick() {
          var p = clamp((performance.now() - start) / dur, 0, 1);
          n.el.textContent = pad(Math.round(n.to * (1 - Math.pow(1 - p, 3))), n.w);
          if (p < 1) setTimeout(tick, 30);
        })();
      }, delay);
    };

    var factsIo = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      factsIo.disconnect();
      nums.forEach(function (n, i) { countUp(n, 150 + i * 120); });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    factsIo.observe(facts);
  }

  /* ------------------------------------------------------- gallery */
  var gal = document.querySelector('.gal');
  if (!gal) return;

  var rail = gal.querySelector('.gal__rail');
  var cards = [].slice.call(gal.querySelectorAll('.gcard'));
  var titles = [].slice.call(gal.querySelectorAll('.gal__title'));
  var counter = gal.querySelector('[data-gal-current]');
  var enter = gal.querySelector('.gal__enter');
  var enterName = gal.querySelector('[data-gal-name]');
  var bar = gal.querySelector('.gal__bar i');
  var n = cards.length;

  var pos = 0;      // smoothed index position
  var active = -1;

  function railIndex() {
    var step = rail.clientWidth;
    if (!step) return 0;
    return clamp(rail.scrollLeft / step, 0, n - 1);
  }

  function goTo(i, smooth) {
    rail.scrollTo({ left: clamp(i, 0, n - 1) * rail.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach(function (c, k) { c.classList.toggle('is-active', k === i); });
    titles.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
    if (counter) counter.textContent = ('0' + (i + 1)).slice(-2);
    var card = cards[i];
    if (card && enter) {
      enter.setAttribute('href', card.getAttribute('data-href'));
      if (enterName) enterName.textContent = card.getAttribute('data-name');
    }
  }

  function render() {
    var target = railIndex();
    pos = reduced ? target : lerp(pos, target, 0.16);

    var vw = window.innerWidth;
    var spread = vw < 760 ? 0.62 : 0.66;   // fraction of card width
    var depth = vw < 760 ? 130 : 230;
    var rotY = vw < 760 ? 20 : 27;

    for (var i = 0; i < n; i++) {
      var o = i - pos;
      var a = Math.abs(o);
      var cw = cards[i].offsetWidth;
      var x = o * cw * spread;
      var z = -a * depth;
      var ry = clamp(o * -rotY, -62, 62);
      var sc = 1 - Math.min(a, 4) * 0.045;
      var op = a > 3.4 ? 0 : 1 - Math.min(a / 3.6, 0.82);

      cards[i].style.transform =
        'translate3d(calc(-50% + ' + x.toFixed(1) + 'px), -50%, ' + z.toFixed(1) + 'px)' +
        ' rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      cards[i].style.opacity = op.toFixed(3);
      cards[i].style.zIndex = String(20 - Math.round(a * 3));
    }

    setActive(clamp(Math.round(pos), 0, n - 1));
    if (bar) bar.style.width = (clamp(pos / (n - 1), 0, 1) * 100).toFixed(2) + '%';

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  window.addEventListener('resize', function () { goTo(Math.round(railIndex()), false); });

  /* ------------------------------------------------------- mouse drag
     native scrollers don't drag with a mouse, so we do it by hand */
  var down = false, startX = 0, startLeft = 0, moved = 0;

  rail.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;
    down = true; moved = 0;
    startX = e.clientX;
    startLeft = rail.scrollLeft;
    rail.style.scrollSnapType = 'none';
    rail.setPointerCapture(e.pointerId);
  });

  rail.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    rail.scrollLeft = startLeft - dx;
  });

  function endDrag() {
    if (!down) return;
    down = false;
    rail.style.scrollSnapType = '';
    goTo(Math.round(railIndex()), true);
  }
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);

  /* click -> open the card in front (unless it was a drag) */
  rail.addEventListener('click', function () {
    if (moved > 8) return;
    var card = cards[clamp(Math.round(railIndex()), 0, n - 1)];
    if (!card) return;
    var a = document.createElement('a');
    a.href = card.getAttribute('data-href');
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  /* keyboard */
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var r = gal.getBoundingClientRect();
    if (r.bottom < window.innerHeight * 0.4 || r.top > window.innerHeight * 0.6) return;
    e.preventDefault();
    goTo(Math.round(railIndex()) + (e.key === 'ArrowRight' ? 1 : -1), true);
  });
})();
