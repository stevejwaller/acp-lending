/* ACP Lending - /videos page. Added 25 Nov 2026.
   Each video shows a thumbnail link. The YouTube player is loaded only
   when the visitor taps it, so the page stays fast. Without JavaScript
   the link simply opens the video on YouTube. */
(function () {
  var links = document.querySelectorAll('a.video-frame[data-video-id]');
  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('data-video-id');
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) { return; }
      e.preventDefault();
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      frame.title = link.getAttribute('data-video-title') || 'ACP Lending video';
      frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      frame.setAttribute('allowfullscreen', '');
      var box = document.createElement('div');
      box.className = 'video-frame';
      box.appendChild(frame);
      link.parentNode.replaceChild(box, link);
    });
  });
})();
