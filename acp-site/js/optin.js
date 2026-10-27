/* ACP Investor Brief email capture. Posts to /leads/subscribe on the forms worker. */
(function () {
  "use strict";
  var forms = document.querySelectorAll("form.optin-form");
  if (!forms.length) return;

  function msgFor(form) {
    var box = form.parentNode.querySelector(".optin-msg");
    return box || null;
  }
  function say(form, text, cls) {
    var box = msgFor(form);
    if (!box) return;
    box.textContent = text;
    box.className = "optin-msg " + (cls || "");
  }

  Array.prototype.forEach.call(forms, function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = (form.querySelector('input[name="email"]') || {}).value || "";
      email = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
        say(form, "Enter a valid email address.", "err");
        return;
      }
      var btn = form.querySelector("button");
      var label = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      say(form, "", "");

      var payload = {
        email: email,
        first_name: ((form.querySelector('input[name="first_name"]') || {}).value || "").trim(),
        company: ((form.querySelector('input[name="company"]') || {}).value || "").trim(),
        source: form.getAttribute("data-source") || location.pathname
      };

      fetch("/leads/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().catch(function () { return { ok: r.ok }; });
      }).then(function (d) {
        if (d && d.ok) {
          form.style.display = "none";
          say(form, "You are on the list. The next report goes to " + email + ".", "ok");
        } else {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          say(form, (d && d.error) || "That did not go through. Email owner@acp-lending.com and you will be added by hand.", "err");
        }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        say(form, "That did not go through. Email owner@acp-lending.com and you will be added by hand.", "err");
      });
    });
  });
})();
