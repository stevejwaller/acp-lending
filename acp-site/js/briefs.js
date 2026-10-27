/* ACP Lending - latest Investor Brief posts on the homepage (v83). Same-origin RSS, no third parties. */
(function () {
  var box = document.querySelector('.brief-cards[data-feed]');
  if (!box || !window.fetch || !window.DOMParser) { return; }
  var count = parseInt(box.getAttribute('data-count'), 10) || 3;
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function dateFromPath(path) {
    var m = /\/(\d{4})-(\d{2})-(\d{2})-/.exec(path || '');
    if (!m) { return ''; }
    return MONTHS[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }
  function text(el, sel) {
    var n = el.querySelector(sel);
    return n ? (n.textContent || '').trim() : '';
  }
  function plain(html) {
    var d = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    return (d.body.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function clip(s, n) {
    if (s.length <= n) { return s; }
    var cut = s.slice(0, n);
    var sp = cut.lastIndexOf(' ');
    return (sp > 60 ? cut.slice(0, sp) : cut) + '…';
  }
  function localPath(link) {
    try {
      var u = new URL(link, window.location.origin);
      return u.pathname;
    } catch (e) { return ''; }
  }
  fetch(box.getAttribute('data-feed'), { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) { throw new Error('feed ' + r.status); } return r.text(); })
    .then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var items = Array.prototype.slice.call(doc.querySelectorAll('item'), 0, count);
      if (!items.length) { return; }
      var frag = document.createDocumentFragment();
      items.forEach(function (it) {
        var path = localPath(text(it, 'link'));
        if (path.indexOf('/investor-brief/daily/') !== 0) { return; }
        var card = document.createElement('article');
        card.className = 'brief-card';
        var dt = document.createElement('p');
        dt.className = 'brief-card-date';
        dt.textContent = dateFromPath(path);
        var h = document.createElement('h3');
        var a = document.createElement('a');
        a.href = path;
        a.textContent = text(it, 'title');
        h.appendChild(a);
        var p = document.createElement('p');
        p.textContent = clip(plain(text(it, 'description')), 190);
        var more = document.createElement('a');
        more.className = 'brief-card-more';
        more.href = path;
        more.textContent = 'Read the brief →';
        if (dt.textContent) { card.appendChild(dt); }
        card.appendChild(h);
        card.appendChild(p);
        card.appendChild(more);
        frag.appendChild(card);
      });
      if (!frag.childNodes.length) { return; }
      box.innerHTML = '';
      box.appendChild(frag);
    })
    .catch(function () { /* keep the static fallback link */ });
})();
