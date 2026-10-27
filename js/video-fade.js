/* video-fade.js - ACP Lending, 21 Oct 2026.
   When a video is not playing (before play, paused, or finished) the picture
   fades out to the navy panel and a play button shows. Pressing play fades the
   video back in. Additive: touches no other script. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = reduce ? '0s' : '0.6s';

  function fmt(s) {
    if (!isFinite(s) || s <= 0) return '';
    s = Math.round(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function setup(v) {
    if (v.getAttribute('data-vf')) return;
    v.setAttribute('data-vf', '1');

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;' +
      'background:radial-gradient(ellipse at center,#16304f 0%,#0a1729 75%);';
    v.parentNode.insertBefore(wrap, v);
    wrap.appendChild(v);

    v.style.aspectRatio = '16 / 9';
    v.style.transition = 'opacity ' + SPEED + ' ease';
    v.style.opacity = '0';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Play video');
    btn.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;' +
      'background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:14px;color:#fff;font:inherit;transition:opacity ' + SPEED + ' ease;';

    var circle = document.createElement('span');
    circle.style.cssText = 'width:78px;height:78px;border-radius:50%;background:#c9974a;display:flex;' +
      'align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,.35);';
    var tri = document.createElement('span');
    tri.style.cssText = 'width:0;height:0;margin-left:6px;border-style:solid;border-width:15px 0 15px 25px;' +
      'border-color:transparent transparent transparent #fff;';
    circle.appendChild(tri);

    var label = document.createElement('span');
    label.style.cssText = 'font-size:15px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;';

    btn.appendChild(circle);
    btn.appendChild(label);
    wrap.appendChild(btn);

    function setLabel() {
      var d = fmt(v.duration);
      var word = (v.currentTime > 0.5 && !v.ended) ? 'Resume' : 'Watch';
      label.textContent = d ? word + ' · ' + d : word;
      btn.setAttribute('aria-label', word + ' video');
    }

    function show() {
      v.style.opacity = '1';
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
    function hide() {
      setLabel();
      v.style.opacity = '0';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }

    btn.addEventListener('click', function () {
      if (v.ended) v.currentTime = 0;
      var p = v.play();
      if (p && p.catch) p.catch(function () { hide(); });
    });
    v.addEventListener('play', show);
    v.addEventListener('playing', show);
    v.addEventListener('pause', hide);
    v.addEventListener('ended', hide);
    v.addEventListener('loadedmetadata', setLabel);

    if (v.paused) hide(); else show();
  }

  function init() {
    var vids = document.querySelectorAll('main video');
    for (var i = 0; i < vids.length; i++) setup(vids[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
