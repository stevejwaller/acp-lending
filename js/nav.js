/* ACP Lending - mobile nav toggle */
(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (!btn || !nav) { return; }
  var OPEN = '✕';
  var CLOSED = '☰';
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
  nav.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('a')) { close(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && nav.classList.contains('open')) { close(); }
  });
})();
