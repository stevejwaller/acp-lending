/* ACP Lending - /videos page. Added 25 Nov 2026.
   Each video shows a thumbnail link. The YouTube player is loaded only
   when the visitor taps it, so the page stays fast. Without JavaScript
   the link simply opens the video on YouTube.
   The "Rates and markets" list is read from /data/market-videos.json
   so it can be refreshed without editing the page. */
(function () {
  var ID_RE = /^[A-Za-z0-9_-]{11}$/;

  // One click handler for every card, including ones rendered from JSON.
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a.video-frame[data-video-id]') : null;
    if (!link) { return; }
    var id = link.getAttribute('data-video-id');
    if (!ID_RE.test(id)) { return; }
    e.preventDefault();
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    frame.title = link.getAttribute('data-video-title') || 'Video';
    frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    frame.setAttribute('allowfullscreen', '');
    var box = document.createElement('div');
    box.className = 'video-frame';
    box.appendChild(frame);
    link.parentNode.replaceChild(box, link);
  });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text) { n.textContent = text; }
    return n;
  }

  function card(v) {
    var art = el('article', 'video-card');
    var a = el('a', 'video-frame');
    a.href = 'https://www.youtube.com/watch?v=' + v.id;
    a.setAttribute('data-video-id', v.id);
    a.setAttribute('data-video-title', v.title);
    a.setAttribute('aria-label', 'Play video: ' + v.title);
    var img = el('img');
    img.src = 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
    img.alt = '';
    img.width = 480; img.height = 360;
    img.loading = 'lazy'; img.decoding = 'async';
    var play = el('span', 'video-play');
    play.setAttribute('aria-hidden', 'true');
    a.appendChild(img); a.appendChild(play);
    art.appendChild(a);
    art.appendChild(el('h3', '', v.title));
    var meta = v.channel ? v.channel : '';
    if (v.date && /^\d{4}-\d{2}-\d{2}$/.test(v.date)) {
      var d = new Date(v.date + 'T12:00:00Z');
      meta += (meta ? ' · ' : '') + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }
    if (meta) { art.appendChild(el('p', 'brief-meta', meta)); }
    if (v.summary) { art.appendChild(el('p', 'video-summary', v.summary)); }
    return art;
  }

  var list = document.getElementById('market-videos');
  if (!list || !window.fetch) { return; }
  fetch(list.getAttribute('data-src') || '/data/market-videos.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
    .then(function (data) {
      var vids = (data && data.videos) || [];
      var frag = document.createDocumentFragment();
      var n = 0;
      for (var i = 0; i < vids.length && n < 8; i++) {
        var v = vids[i];
        if (!v || !ID_RE.test(v.id) || typeof v.title !== 'string' || !v.title) { continue; }
        frag.appendChild(card(v));
        n++;
      }
      if (n) {
        list.textContent = '';
        list.appendChild(frag);
      }
    })
    .catch(function () { /* keep the fallback link */ });
})();
