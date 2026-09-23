/* =========================================================
   TZ — v2 core
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ------------------------------------------------------- overlays */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }

  var grain = el('div', 'grain');
  var vignette = el('div', 'vignette');
  var curtain = el('div', 'curtain');
  grain.setAttribute('aria-hidden', 'true');
  vignette.setAttribute('aria-hidden', 'true');
  curtain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(vignette);
  document.body.appendChild(grain);
  document.body.appendChild(curtain);

  /* ------------------------------------------------------- cursor */
  if (fine && !reduced) {
    var cur = el('div', 'cursor', '<span class="cursor__label"></span><img class="cursor__icon" alt="">');
    cur.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cur);
    var label = cur.querySelector('.cursor__label');
    var curIcon = cur.querySelector('.cursor__icon');

    /* warm the cache so the logo never pops in late, and while we're at it
       record its shape plus whether it is dark enough to need a backing */
    var iconInfo = {};
    var probe = document.createElement('canvas');
    probe.width = probe.height = 24;
    var pctx = probe.getContext('2d');

    function measure(src, img) {
      var info = { w: img.naturalWidth || 1, h: img.naturalHeight || 1, dark: false };
      try {
        pctx.clearRect(0, 0, 24, 24);
        pctx.drawImage(img, 0, 0, 24, 24);
        var d = pctx.getImageData(0, 0, 24, 24).data;
        var lum = function (i) { return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; };
        var sum = 0, count = 0, edge = 0, edgeCount = 0;
        for (var y = 0; y < 24; y++) {
          for (var x = 0; x < 24; x++) {
            var i = (y * 24 + x) * 4;
            if (d[i + 3] < 40) continue;
            var L = lum(i);
            sum += L;
            count++;
            if (y < 2 || y > 21 || x < 2 || x > 21) { edge += L; edgeCount++; }
          }
        }
        /* two ways a logo disappears on a near black page: it is dark overall,
           or it is a bright mark printed on a solid dark tile (pronto pizza),
           which shows up as an opaque border that is almost black */
        info.dark = count ? ((sum / count) < 70 ||
          (edgeCount > 158 && (edge / edgeCount) < 55)) : false;
      } catch (err) { /* tainted canvas */ }
      iconInfo[src] = info;
    }

    document.querySelectorAll('[data-hover-img]').forEach(function (n) {
      var src = n.getAttribute('data-hover-img');
      if (!src || iconInfo[src]) return;
      iconInfo[src] = null;
      var pre = new Image();
      pre.onload = function () { measure(src, pre); };
      pre.src = src;
    });

    function sizeToIcon(src) {
      var info = iconInfo[src];
      var h = 64;
      var w = info ? Math.round(info.w / info.h * h) : h;
      w = clamp(w, 44, 124);
      cur.classList.toggle('has-plate', !!(info && info.dark));
      cur.style.width = w + 'px';
      cur.style.height = h + 'px';
      cur.style.margin = (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px';
    }

    function resetSize() {
      cur.classList.remove('has-plate');
      cur.style.width = cur.style.height = cur.style.margin = '';
    }

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var cx = mx, cy = my;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!document.body.classList.contains('cursor-ready')) {
        document.body.classList.add('cursor-ready');
        cx = mx; cy = my;
      }
    }, { passive: true });

    (function loop() {
      cx = lerp(cx, mx, 0.16);
      cy = lerp(cy, my, 0.16);
      cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();

    var HOT = 'a, button, [data-cursor], [data-hover-img]';

    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest(HOT);
      if (!t) return;
      var withIcon = e.target.closest('[data-hover-img]');
      cur.classList.add('is-hover');
      if (withIcon) {
        var src = withIcon.getAttribute('data-hover-img');
        if (curIcon.getAttribute('src') !== src) curIcon.src = src;
        cur.classList.add('is-icon');
        sizeToIcon(src);
        label.textContent = '';
      } else {
        cur.classList.remove('is-icon');
        resetSize();
        label.textContent = t.getAttribute('data-cursor') || '';
      }
    });
    document.addEventListener('mouseout', function (e) {
      var t = e.target.closest(HOT);
      if (!t) return;
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOT)) return;
      cur.classList.remove('is-hover', 'is-icon');
      resetSize();
      label.textContent = '';
    });
  }

  /* ------------------------------------------------------- reveal */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

  document.querySelectorAll('[data-reveal], .clip-img').forEach(function (n) {
    io.observe(n);
  });

  /* ------------------------------------------------------- nav overlay */
  var navBtn = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('.nav');
  if (navBtn && nav) {
    var navLabel = navBtn.querySelector('[data-nav-label]');
    var navImgs = nav.querySelectorAll('.nav__media img');

    var setNav = function (open) {
      document.body.classList.toggle('nav-open', open);
      document.body.classList.toggle('is-locked', open);
      navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (navLabel) navLabel.textContent = open ? 'Close' : 'Menu';
      if (open && navImgs.length) navImgs[0].classList.add('is-on');
    };

    navBtn.addEventListener('click', function () {
      setNav(!document.body.classList.contains('nav-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });

  }

  /* ------------------------------------------------------- marquee / rail */
  function autoScroll(track, speed) {
    if (!track || reduced) return;
    var x = 0;
    var half = 0;
    var paused = false;
    var measure = function () { half = track.scrollWidth / 2; };
    measure();
    window.addEventListener('resize', measure);
    track.parentElement.addEventListener('mouseenter', function () { paused = true; });
    track.parentElement.addEventListener('mouseleave', function () { paused = false; });
    (function tick() {
      if (!paused && half) {
        x -= speed;
        if (-x >= half) x += half;
        track.style.transform = 'translate3d(' + x + 'px,0,0)';
      }
      requestAnimationFrame(tick);
    })();
  }
  document.querySelectorAll('[data-marquee]').forEach(function (t) {
    autoScroll(t, parseFloat(t.getAttribute('data-marquee')) || 0.6);
  });

  /* ------------------------------------------------------- float parallax */
  var floats = [].slice.call(document.querySelectorAll('[data-float]'));
  if (floats.length && !reduced) {
    var fx = 0, fy = 0, tx = 0, ty = 0, sy = 0;
    if (fine) {
      window.addEventListener('mousemove', function (e) {
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }
    (function tick() {
      fx = lerp(fx, tx, 0.07);
      fy = lerp(fy, ty, 0.07);
      sy = window.scrollY;
      floats.forEach(function (n) {
        var d = parseFloat(n.getAttribute('data-float')) || 1;
        n.style.transform =
          'translate3d(' + (fx * -26 * d).toFixed(2) + 'px,' +
          ((fy * -18 * d) + (sy * 0.12 * d)).toFixed(2) + 'px,0)';
      });
      requestAnimationFrame(tick);
    })();
  }

  /* ------------------------------------------------------- page transition */
  function isInternal(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var u;
    try { u = new URL(a.href); } catch (e) { return false; }
    if (u.origin !== location.origin) return false;
    if (u.pathname === location.pathname && u.hash) return false;
    if (/^(mailto|tel):/.test(a.getAttribute('href') || '')) return false;
    return true;
  }

  var FLAG = 'tz-curtain';

  function sweepOut() {
    curtain.classList.remove('is-in', 'is-out');
    curtain.classList.add('is-cover');
    void curtain.offsetHeight;                 // flush the covering state
    curtain.classList.remove('is-cover');
    curtain.classList.add('is-out');
  }

  /* arriving from an internal link: the sheet is still covering, let it
     finish its run off the top instead of just vanishing */
  try {
    if (sessionStorage.getItem(FLAG)) {
      sessionStorage.removeItem(FLAG);
      window.tzFromNav = true;
      if (!reduced) sweepOut();
    }
  } catch (err) { /* private mode */ }

  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var a = e.target.closest('a');
    if (!isInternal(a)) return;
    if (reduced) return;
    e.preventDefault();
    try { sessionStorage.setItem(FLAG, '1'); } catch (err) { /* private mode */ }
    curtain.classList.remove('is-out', 'is-cover');
    curtain.classList.add('is-in');
    setTimeout(function () { location.href = a.href; }, 600);
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.body.classList.remove('nav-open', 'is-locked');
      try { sessionStorage.removeItem(FLAG); } catch (err) { /* private mode */ }
      if (!reduced) sweepOut();
    }
  });

  /* ------------------------------------------------------- year */
  document.querySelectorAll('[data-year]').forEach(function (n) {
    n.textContent = new Date().getFullYear();
  });
})();
