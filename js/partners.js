/* ACP Lending - /partners Referral Partner Program page. Added 26 Nov 2026.
   Shows the thank-you (or error) message after the form posts to /partners/submit. */
(function () {
  var qs = new URLSearchParams(location.search);
  var form = document.getElementById('partner-form');
  var msg = document.getElementById('partner-msg');
  if (!form || !msg) return;
  if (qs.get('sent')) {
    msg.textContent = 'Thanks, you are signed up. Steve Waller will reach out with the referral agreement. Have an investor ready now? Call or text 936-522-8951.';
    msg.hidden = false;
    form.hidden = true;
    document.getElementById('partner-box').scrollIntoView();
  } else if (qs.get('error')) {
    msg.textContent = qs.get('error') === 'missing'
      ? 'Please fill in every field marked * with a valid email.'
      : 'Something went wrong sending your sign-up. Please try again, or call or text 936-522-8951.';
    msg.className = 'ask-msg ask-err';
    msg.hidden = false;
  }
})();
