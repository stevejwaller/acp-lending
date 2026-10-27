/* ACP Lending - mobile nav toggle + dropdown groups (v83) */
(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (!btn || !nav) { return; }
  var OPEN = '✕';
  var CLOSED = '☰';
  var groups = Array.prototype.slice.call(nav.querySelectorAll('.nav-group'));
  function isMobile() { return window.innerWidth <= 900; }
  function closeGroups(except) {
    groups.forEach(function (g) {
      if (g === except) { return; }
      g.classList.remove('open');
      var b = g.querySelector('.nav-label');
      if (b) { b.setAttribute('aria-expanded', 'false'); }
    });
  }
  function close() {
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = CLOSED;
  }
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', function () {
    if (nav.classList.contains('open')) {
      close();
    } else {
      nav.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      btn.textContent = OPEN;
    }
  });
  groups.forEach(function (g) {
    var b = g.querySelector('.nav-label');
    if (!b) { return; }
    b.addEventListener('click', function () {
      if (isMobile()) { return; }
      var willOpen = !g.classList.contains('open');
      closeGroups(g);
      g.classList.toggle('open', willOpen);
      b.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.nav-group')) { closeGroups(null); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeGroups(null); }
  });
  nav.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('a')) { close(); closeGroups(null); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && nav.classList.contains('open')) { close(); }
  });
})();
