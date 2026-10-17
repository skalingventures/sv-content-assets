(function () {
  'use strict';
  var d = document.documentElement;
  var root = document.getElementById('root');
  var reduce = false, fine = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  try { fine = window.matchMedia('(pointer: fine)').matches; } catch (e) {}
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var q = {
    hdr: $('.hdr'), bar: $('.progress'), hero: $('.hero'), stage: $('.hero-stage'), copy: $('.hero-copy'),
    quote: $('.lit'), words: $$('.qw'), chapters: $$('.ch'), panels: $$('.pnl'),
    spectrum: $('.spectrum'), bars: $$('.spectrum .bar'), labels: $$('.spectrum .lbl'),
    final: $('.final'), fmark: $('.final-mark'),
    secNum: document.getElementById('secNum'), secLabel: document.getElementById('secLabel')
  };
  var active = 0, lastY = 0, raf = 0;

  // ── Approval toggle (the one interaction on the page)
  var btn = document.getElementById('approveBtn');
  var stOk = document.getElementById('stOk'), stWait = document.getElementById('stWait');
  if (btn) btn.addEventListener('click', function () {
    var on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? 'Undo' : 'Send as rep';
    btn.classList.toggle('btn-graphite', !on);
    btn.classList.toggle('btn-line', on);
    stOk.hidden = !on; stWait.hidden = on;
  });

  function setActive(i) {
    if (i === active) return;
    active = i;
    q.chapters.forEach(function (c, k) { c.classList.toggle('on', k === i); });
    q.panels.forEach(function (p, k) { p.classList.toggle('on', k === i); });
  }

  // ── Section index + nav highlight
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('[data-nav]').forEach(function (a) { links[a.getAttribute('data-nav')] = a; });
    var secIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target;
        if (q.secNum) q.secNum.textContent = t.getAttribute('data-sec');
        if (q.secLabel) q.secLabel.textContent = t.getAttribute('data-label');
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === t.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    $$('[data-sec]').forEach(function (s) { secIo.observe(s); });
  }

  // ── Reveal system
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-reveal', 'fx');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  }

  // ── Pointer: hero glow + mark parallax, card spotlight, magnetic buttons
  if (!reduce && fine) {
    window.addEventListener('pointermove', function (e) {
      var h = q.hero; if (!h) return;
      var r = h.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      h.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      h.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (q.stage) {
        q.stage.style.setProperty('--tx', ((px - 0.5) * -14).toFixed(1) + 'px');
        q.stage.style.setProperty('--ty', ((py - 0.5) * -10).toFixed(1) + 'px');
      }
    }, { passive: true });
    $$('.module').forEach(function (m) {
      m.addEventListener('pointermove', function (e) {
        var r = m.getBoundingClientRect();
        m.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        m.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
    });
    $$('.mag').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--bx', (((e.clientX - (r.left + r.width / 2)) / r.width) * 10).toFixed(1) + 'px');
        b.style.setProperty('--by', (((e.clientY - (r.top + r.height / 2)) / r.height) * 8).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
  }

  // ── Scroll-driven frame
  function tick() {
    raf = 0;
    var y = window.scrollY || d.scrollTop, vh = window.innerHeight;
    var max = Math.max(1, d.scrollHeight - vh);
    if (q.bar) q.bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, y / max)).toFixed(4) + ')';

    if (q.hdr && !reduce) {
      var down = y > lastY;
      if (y > 420 && down && y - lastY > 2) q.hdr.classList.add('tuck');
      else if (!down || y < 120) q.hdr.classList.remove('tuck');
    }
    lastY = y;

    // instrument: chapter nearest viewport centre
    if (q.chapters.length) {
      var best = 0, bestD = Infinity;
      q.chapters.forEach(function (c, i) {
        var r = c.getBoundingClientRect();
        var dist = Math.abs((r.top + r.height / 2) - vh / 2);
        if (dist < bestD) { bestD = dist; best = i; }
      });
      setActive(best);
    }

    // spectrum fill
    if (q.spectrum && q.bars.length) {
      var sp = 1;
      if (!reduce) {
        var sr = q.spectrum.getBoundingClientRect();
        sp = Math.min(1, Math.max(0, (vh * 0.92 - sr.top) / (vh * 0.5)));
      }
      q.bars.forEach(function (b, i) {
        var f = Math.min(1, Math.max(0, sp * q.bars.length - i));
        b.style.setProperty('--fill', f.toFixed(3));
        if (q.labels[i]) q.labels[i].style.opacity = (0.35 + 0.65 * Math.min(1, f * 1.4)).toFixed(3);
      });
    }

    if (reduce) return;

    if (q.copy) {
      var hp = Math.min(1, Math.max(0, y / (vh * 0.9)));
      q.copy.style.transform = 'translate3d(0,' + (hp * -48).toFixed(1) + 'px,0)';
      q.copy.style.opacity = (1 - hp * 0.75).toFixed(3);
    }

    if (q.quote && q.words.length) {
      var qr = q.quote.getBoundingClientRect();
      var start = vh * 0.85, end = vh * 0.35;
      var p = Math.min(1, Math.max(0, (start - qr.top) / (start - end + qr.height * 0.5)));
      q.words.forEach(function (w, i) {
        var local = Math.min(1, Math.max(0, p * q.words.length - i));
        w.style.opacity = (0.24 + 0.76 * local).toFixed(3);
      });
    }

    if (q.final && q.fmark) {
      var fr = q.final.getBoundingClientRect();
      var fp = Math.min(1, Math.max(0, (vh - fr.top) / (vh + fr.height * 0.4)));
      q.fmark.style.transform = 'translate3d(0,' + ((1 - fp) * 90).toFixed(1) + 'px,0)';
    }
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(tick); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  tick();
})();
