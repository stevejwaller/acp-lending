/* Sample Deal Report: click a topic card to magnify it; click again, X or Esc to close. */
(function () {
  var grid = document.getElementById('report-zoom');
  var box = null, last = null;
  function close() {
    if (!box) return;
    var b = box; box = null; b.classList.remove('open');
    document.documentElement.style.overflow = '';
    setTimeout(function () { b.remove(); }, 250);
    if (last) last.focus();
  }
  function open(t) {
    close(); last = t;
    var cap = t.querySelector('h3').textContent;
    box = document.createElement('div'); box.className = 'rz-box';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', cap);
    box.innerHTML = '<button type="button" class="rz-x" aria-label="Close">×</button>' +
      '<figure><div class="rz-big"><img alt="" draggable="false"></div><figcaption></figcaption></figure>';
    box.querySelector('img').src = t.getAttribute('data-img'); box.querySelector('img').alt = cap;
    box.querySelector('figcaption').textContent = cap;
    box.addEventListener('click', close);
    document.body.appendChild(box);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { box.classList.add('open'); box.querySelector('.rz-x').focus(); });
  }
  function openCard(c) {
    close(); last = c;
    box = document.createElement('div'); box.className = 'rz-box';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', c.querySelector('h3').textContent);
    box.innerHTML = '<button type="button" class="rz-x" aria-label="Close">\u00d7</button><figure><div class="fc-panel"></div><figcaption></figcaption></figure>';
    var panel = box.querySelector('.fc-panel');
    panel.innerHTML = '<h3></h3>' + c.querySelector('.fc-body').innerHTML;
    panel.querySelector('h3').textContent = c.querySelector('h3').textContent;
    box.querySelector('figcaption').textContent = 'Click outside to close';
    box.addEventListener('click', function (e) { if (!panel.contains(e.target)) close(); });
    document.body.appendChild(box);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { box.classList.add('open'); box.querySelector('.rz-x').focus(); });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.fc'), function (c) {
    c.setAttribute('tabindex', '0'); c.setAttribute('role', 'button');
    var go = function () { if (c.hasAttribute('data-img')) open(c); else openCard(c); };
    c.addEventListener('click', go);
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.rz, .rz-box')) e.preventDefault(); });
})();
