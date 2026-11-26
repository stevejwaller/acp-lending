/* ACP Lending - /commercial-bridge-loans page. Added 26 Nov 2026.
   Shows the thank-you (or error) message after the form posts to /commercial-bridge/submit. */
(function () {
  var qs = new URLSearchParams(location.search);
  var form = document.getElementById('cb-form');
  var msg = document.getElementById('cb-msg');
  if (!form || !msg) return;
  if (qs.get('sent')) {
    msg.textContent = 'Thanks, your deal is in. Steve Waller will review it and reach out. Need to talk sooner? Call or text 936-522-8951.';
    msg.hidden = false;
    form.hidden = true;
    document.getElementById('cb-box').scrollIntoView();
  } else if (qs.get('error')) {
    msg.textContent = qs.get('error') === 'missing'
      ? 'Please fill in every field marked * with a valid email.'
      : 'Something went wrong sending your deal. Please try again, or call or text 936-522-8951.';
    msg.className = 'ask-msg ask-err';
    msg.hidden = false;
  }
})();
