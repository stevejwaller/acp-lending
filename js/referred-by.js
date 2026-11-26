/* ACP Lending - prefill the "Referred by" field on /request-financing from ?ref=
   so a referral partner can share acp-lending.com/request-financing?ref=Their+Name. Added 26 Nov 2026. */
(function () {
  try {
    var ref = new URLSearchParams(location.search).get('ref');
    var el = document.getElementById('f-referred_by');
    if (ref && el && !el.value) el.value = ref.slice(0, 120);
  } catch (e) {}
})();
