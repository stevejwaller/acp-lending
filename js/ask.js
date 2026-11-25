/* ACP Lending - /ask "Ask a Lender" page. Added 25 Nov 2026.
   1) Shows the thank-you (or error) message after the form posts to /ask/submit.
   2) The Q&A list is normally rendered on the server (functions/ask/index.js) from
      /data/ask-qa.json. If it arrives empty, this script renders it from the same file. */
(function () {
  var qs = new URLSearchParams(location.search);
  var form = document.getElementById('ask-form');
  var msg = document.getElementById('ask-msg');
  if (form && msg) {
    if (qs.get('sent')) {
      msg.textContent = 'Thanks, your question is in. Steve Waller will get back to you by email or phone. Want to talk sooner? Call or text 936-522-8951.';
      msg.hidden = false;
      form.hidden = true;
      document.getElementById('ask-box').scrollIntoView();
    } else if (qs.get('error')) {
      msg.textContent = qs.get('error') === 'missing'
        ? 'Please fill in every field marked * with a valid email.'
        : 'Something went wrong sending your question. Please try again, or call or text 936-522-8951.';
      msg.className = 'ask-msg ask-err';
      msg.hidden = false;
    }
  }

  var box = document.getElementById('ask-qa');
  if (!box || box.querySelector('.faq-item')) { return; }
  fetch(box.getAttribute('data-src') || '/data/ask-qa.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.items) { return; }
      data.items.forEach(function (it) {
        if (!it || !it.q || !it.a) { return; }
        var d = document.createElement('div');
        d.className = 'faq-item';
        var h = document.createElement('h3');
        h.textContent = it.q;
        d.appendChild(h);
        String(it.a).split(/\n\s*\n/).forEach(function (para) {
          var p = document.createElement('p');
          p.textContent = para.trim();
          d.appendChild(p);
        });
        box.appendChild(d);
      });
    })
    .catch(function () {});
})();
