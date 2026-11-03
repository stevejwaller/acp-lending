(function() {
  var f = document.getElementById("f"),
    ld = document.getElementById("ld"),
    er = document.getElementById("err");
  var PASS = "b029eed3f2094d8bdc6d1ae9b9c6fa2d4a840084fdcc649533c9bc5a34882bc3";
  var OWNER = false;
  try {
    OWNER = localStorage.getItem("acpOwner") === "1"
  } catch (e) {}
  var res = document.createElement("div");
  res.id = "da-res";
  er.parentNode.insertBefore(res, er.nextSibling);
  var ow = document.createElement("p");
  ow.style.cssText = "text-align:right;font-size:12px;margin:6px 24px 16px";
  ow.innerHTML = OWNER ? 'Owner mode &middot; <a href="#" id="daOut">sign out</a>' : '<a href="#" id="daIn" style="color:#9aa3ad">Owner sign-in</a>';
  res.parentNode.appendChild(ow);
  if (OWNER) {
    var sb = f.querySelector(".calc-submit");
    var lv = document.createElement("div");
    lv.className = "calc-field";
    lv.innerHTML = '<label for="daLevel">Report level</label><select id="daLevel"><option value="deal">$49.99 Deal Report</option><option value="full">$149.99 Full Package</option></select>';
    sb.parentNode.insertBefore(lv, sb);
    var fx = document.createElement("div");
    fx.id = "daFin";
    fx.innerHTML = '<div class="calc-field-row da-three"><div class="calc-field"><label for="daFico">Credit Score</label><input id="daFico" type="number" placeholder="700"></div><div class="calc-field"><label for="daExp">Deals Closed (36 mo)</label><input id="daExp" type="number" placeholder="3"></div><div class="calc-field"><label for="daTp">Third-Party Closing (% of loan)</label><input id="daTp" type="number" step="0.1" value="2.0"></div></div><div class="calc-field-row"><div class="calc-field"><label for="daLtcP">Approved LTC: % of Purchase</label><input id="daLtcP" type="number" step="1" value="90"></div><div class="calc-field"><label for="daLtcR">Approved LTC: % of Repairs</label><input id="daLtcR" type="number" step="1" value="100"></div></div><div class="calc-field-row"><div class="calc-field"><label for="daOrig">Broker Origination</label><select id="daOrig"><option value="0">0%</option><option value="1">1%</option><option value="2" selected>2%</option></select></div><div class="calc-field"><label for="daBcf">Broker Closing Fee</label><select id="daBcf"><option>500</option><option>750</option><option selected>1000</option></select></div></div><div class="calc-field-row"><div class="calc-field"><label for="daRent">Estimated Monthly Rent</label><span class="da-money"><input id="daRent" type="number" placeholder="blank = 0.8% of ARV"></span></div><div class="calc-field"><label for="daRefi">Rental Refinance Rate (%)</label><input id="daRefi" type="number" step="0.125" value="7.5"></div></div><div class="calc-field"><label><input id="daPhotos" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> Interior and exterior photos available</label></div><div class="calc-field"><label for="daAcpRep">ACP Repair Estimate from Photos</label><span class="da-money"><input id="daAcpRep" type="number" placeholder="from the photo repair chart"></span></div><div class="calc-field"><label><input id="daUseBor" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> Borrower showed why their repair number is better &mdash; use it</label></div><div class="calc-field"><label>Shown not needed (from photos or records):</label> <label><input id="daNoHvac" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> HVAC</label> &nbsp; <label><input id="daNoRoof" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> Roof</label> &nbsp; <label><input id="daNoFdn" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> Foundation</label></div>';
    sb.parentNode.insertBefore(fx, sb);
  }
  // A mouse wheel over a focused number field silently changes its value; blur it instead.
  document.addEventListener("wheel", function(e) {
    var t = document.activeElement;
    if (t && t.type === "number" && t === e.target) t.blur()
  }, { passive: true });
  document.addEventListener("click", async function(e) {
    if (e.target.id === "daOut") {
      e.preventDefault();
      try {
        localStorage.removeItem("acpOwner")
      } catch (x) {}
      location.reload()
    }
    if (e.target.id === "daIn") {
      e.preventDefault();
      var pw = prompt("Owner password");
      if (!pw) return;
      var t = await sha(await sha("acp-prospects:" + pw));
      if (t === PASS) {
        try {
          localStorage.setItem("acpOwner", "1")
        } catch (x) {}
        location.reload()
      } else {
        er.innerHTML = "<div class='da-err'>Wrong password</div>"
      }
    }
    if (e.target.id === "daMail") {
      e.preventDefault();
      location.href = e.target.getAttribute("data-href")
    }
  });
  f.addEventListener("submit", async function(e) {
    e.preventDefault();
    er.innerHTML = "";
    res.innerHTML = "";
    f.style.display = "none";
    ld.style.display = "block";
    var d = {
      propertyAddress: v("propertyAddress"),
      city: v("city"),
      state: v("state"),
      zip: v("zip"),
      purchasePrice: v("purchasePrice"),
      repairBudget: v("repairBudget"),
      arvEstimate: v("arvEstimate"),
      borrowerLiquidity: v("borrowerLiquidity"),
      borrowerName: v("borrowerName"),
      borrowerEmail: v("borrowerEmail"),
      borrowerPhone: v("borrowerPhone")
    };
    try {
      // Subdivision comps, widened in time until 20 closed sales; ARV = what the comps justify.
      CM = null;
      try {
        var cq = await fetch("/analyze-deal/comps", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            address: d.propertyAddress,
            city: d.city,
            state: d.state,
            zip: d.zip
          })
        });
        var cj = cq.ok ? await cq.json() : null;
        if (cj && cj.success && cj.arv > 0) {
          CM = cj;
          CM.entered = num(d.arvEstimate);
          d.arvEstimate = String(cj.arv)
        }
      } catch (ce) {}
      var r = await fetch("/deal-analyzer/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(d)
      });
      if (!r.ok) {
        var j = await r.json();
        throw new Error(j.error || "Report failed")
      }
      var raw = (await r.text()).replace(/\$-[\d,]+/g, function() {
        return "$0"
      });
      raw = injectComps(raw);
      if (!OWNER) {
        res.innerHTML = basic(raw, d);
        ld.style.display = "none";
        f.style.display = "block";
        res.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        return
      }
      var lvl = document.getElementById("daLevel").value;
      raw = repairs(raw, d);
      raw = common(raw, d);
      var html = addBar(tiers(lvl === "full" ? profit(offer(financing(raw, Object.assign({}, d, {
        __full: true
      })), d), d) : financing(summary(raw), d), lvl, d), d.borrowerEmail);
      var w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close()
      } else {
        document.open();
        document.write(html);
        document.close()
      }
    } catch (ex) {
      er.innerHTML = "<div class='da-err'>" + esc(ex.message) + "</div>"
    }
    ld.style.display = "none";
    f.style.display = "block"
  });

  function v(id) {
    return document.getElementById(id).value
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function(c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
      } [c]
    })
  }
  async function sha(s) {
    var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b)).map(function(x) {
      return x.toString(16).padStart(2, "0")
    }).join("")
  }

  var CM = null;
  function cmMonths() {
    return CM ? CM.months : 12
  }

  // Replaces the report's ARV and comp table with the widened subdivision comp set.
  function injectComps(raw) {
    if (!CM) return raw;
    var doc = new DOMParser().parseFromString(raw, "text/html");
    secs(doc).forEach(function(s) {
      if (/^ARV Analysis/.test(s.t)) {
        var src = "Source: " + CM.count + " closed comparables in " + esc(CM.subdivision || "the subdivision") + ", last " + CM.months + " months; ARV = " + CM.method + (CM.subjectSqft ? " ($" + CM.medianPpsf.toFixed(2) + " x " + Number(CM.subjectSqft).toLocaleString("en-US") + " SF)" : "");
        s.el.innerHTML = '<h2>ARV Analysis</h2><p class="big">' + usd(CM.arv) + '</p><p class="muted">' + src + ' | ' + CM.count + ' comparables</p><p class="muted">Filters: same subdivision, ' + esc(CM.sqftRange) + ' SF, date range widened to ' + CM.months + ' months to reach at least 20 closed sales | ' + CM.rawCount + ' raw -> ' + CM.count + ' comps</p>' + (CM.met ? "" : '<p class="muted"><b>Only ' + CM.count + ' closed sales were found in the subdivision in ' + CM.months + ' months.</b></p>') + (CM.entered && Math.abs(CM.entered - CM.arv) >= 1000 ? '<p class="muted">The entered ARV estimate of ' + usd(CM.entered) + ' is not used; the comparable sales support ' + usd(CM.arv) + '.</p>' : "")
      }
      if (/^Comparable Sales/.test(s.t)) {
        var ps = CM.comps.map(function(c) {
            return c.salePrice || 0
          }),
          pp = CM.comps.map(function(c) {
            return c.ppsf || 0
          }).filter(function(z) {
            return z > 0
          });
        var avg = ps.reduce(function(a, z) {
          return a + z
        }, 0) / (ps.length || 1);
        s.el.innerHTML = '<h2>Comparable Sales (Exhibit A) - Last ' + CM.months + ' Months</h2><table><tr><th>Address</th><th>Sale Price</th><th>$/SF</th><th>Bd/Ba</th><th>Sq Ft</th><th>Yr Built</th><th>Subdivision</th><th>Date Sold</th></tr>' + CM.comps.map(function(c) {
          var dt = new Date(c.saleDate);
          return "<tr><td>" + esc(c.address || "-") + "</td><td>" + usd(c.salePrice) + "</td><td>" + (c.ppsf ? "$" + c.ppsf.toFixed(2) : "-") + "</td><td>" + esc(c.beds == null ? "-" : c.beds) + "/" + esc(c.baths == null ? "-" : c.baths) + "</td><td>" + esc(c.sqft || "-") + "</td><td>" + esc(c.yearBuilt || "-") + "</td><td>" + esc(c.subdivision || "-") + "</td><td>" + (isNaN(dt) ? "-" : dt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          })) + "</td></tr>"
        }).join("") + '</table><p class="muted" style="margin-top:10px;">Median: ' + usd(CM.medianPrice) + ' | Average: ' + usd(avg) + ' | Median $/SF: $' + CM.medianPpsf.toFixed(2) + ' | Avg $/SF: $' + (pp.length ? (pp.reduce(function(a, z) {
          return a + z
        }, 0) / pp.length).toFixed(2) : "0") + '</p>'
      }
    });
    return "<!doctype html>" + doc.documentElement.outerHTML
  }

  function secs(doc) {
    return Array.from(doc.querySelectorAll(".sec")).map(function(s) {
      var h = s.querySelector("h2");
      return {
        el: s,
        t: h ? h.textContent.trim() : ""
      }
    })
  }

  function basic(raw, d) {
    var doc = new DOMParser().parseFromString(raw, "text/html");
    var kv = {};
    doc.querySelectorAll("table.kv tr").forEach(function(tr) {
      var c = tr.querySelectorAll("th,td");
      if (c.length >= 2 && !(c[0].textContent.trim() in kv)) kv[c[0].textContent.trim()] = c[1].textContent.trim()
    });
    var arv = "";
    secs(doc).forEach(function(s) {
      if (/^ARV Analysis/.test(s.t)) {
        var m = s.el.textContent.match(/\$[\d,]+/);
        if (m) arv = m[0]
      }
    });
    var addr = (kv["Address"] || d.propertyAddress) + ", " + (kv["City / State / Zip"] || (d.city + ", " + d.state + " " + d.zip));
    var rows = [
      ["Property", addr],
      ["Subdivision", kv["Subdivision"]],
      ["Beds / Baths", kv["Beds / Baths"]],
      ["Sq Ft", kv["Sq Ft"]],
      ["Year Built", kv["Year Built"]],
      ["Estimated ARV", arv]
    ].filter(function(x) {
      return x[1] && x[1] !== "-"
    });
    var pay = ["PayPal: owner@acp-lending.com", "Zelle: 936-522-8951", "Card: call or text 936-522-8951 for a secure Chase payment link"];
    var credit = "Full credit: the report fee is credited back in full at closing if your loan closes with ACP.";
    var photos = "Photos required: interior and exterior photos of the property must be provided, either your own or from the listing site or a prior MLS listing.";
    var note = "Include the property address and the report you want with your payment. Reports are generally delivered within 30 to 60 minutes, 9 a.m. to 5 p.m. Central.";
    var body = "Basic Deal Summary\n\n" + rows.map(function(x) {
      return x[0] + ": " + x[1]
    }).join("\n") + "\n\n$49.99 Deal Report: financing options, full cash to close, and a liquidity check.\n$149.99 Full Package: everything in the Deal Report plus comparable sales, street view, map, full property record, repair review, ACP's recommended offer and walk-away price, and a phone walkthrough.\n" + pay.join("\n") + "\n" + note + "\n" + credit + "\n" + photos + "\n\nACP Real Estate Lending | 936-522-8951 | acp-lending.com";
    var href = "mailto:" + encodeURIComponent(d.borrowerEmail || "") + "?cc=steve%40acp-lending.com&subject=" + encodeURIComponent("Basic Deal Summary - " + addr) + "&body=" + encodeURIComponent(body);
    var td = "padding:8px 10px;border-bottom:1px solid #e6e8eb;text-align:left;vertical-align:top";
    return '<div style="margin:0 24px 8px;border:1px solid #e6e8eb;border-top:3px solid var(--gold);border-radius:8px;padding:18px 20px;background:#fff"><h3 style="margin:0 0 10px">Basic Deal Summary</h3><table style="width:100%;border-collapse:collapse">' + rows.map(function(x) {
      return '<tr><th style="' + td + ';width:38%">' + esc(x[0]) + '</th><td style="' + td + '">' + esc(x[1]) + '</td></tr>'
    }).join("") + '</table><p style="margin:14px 0"><a href="#" id="daMail" class="btn" data-href="' + esc(href) + '">Email This Summary</a></p><h4 style="margin:18px 0 6px">$49.99 Deal Report</h4><p style="margin:0 0 8px">Financing options, full cash to close, and a liquidity check.</p><h4 style="margin:14px 0 6px">$149.99 Full Package</h4><p style="margin:0 0 8px">Everything in the Deal Report plus comparable sales, street view, map, full property record, repair review, ACP&#39;s recommended offer and walk-away price, and a phone walkthrough.</p><p style="margin:0 0 6px"><b>Pay by:</b></p><ul style="margin:0 0 8px 18px">' + pay.map(function(p) {
      return "<li>" + esc(p) + "</li>"
    }).join("") + '</ul><p style="margin:0 0 8px;font-size:14px">' + esc(note) + '</p><p style="margin:0 0 8px;font-size:14px"><b>' + esc(credit) + '</b></p><p style="margin:0;font-size:14px"><b>' + esc(photos) + '</b></p></div>'
  }

  function summary(raw) {
    var doc = new DOMParser().parseFromString(raw, "text/html");
    secs(doc).forEach(function(s) {
      if (/^(Comparable Sales|Pending Exhibits)/.test(s.t)) s.el.remove();
      if (/^Deal Economics/.test(s.t)) s.el.querySelectorAll("tr").forEach(function(tr) {
        if (/^\s*Max Offer/.test(tr.textContent)) tr.remove()
      });
      if (/^Property Record/.test(s.t)) {
        s.el.querySelectorAll("h3").forEach(function(h) {
          if (/Recent Transactions/.test(h.textContent)) {
            var n = h.nextElementSibling;
            h.remove();
            if (n && n.tagName === "TABLE") n.remove()
          }
        });
        s.el.querySelectorAll("a").forEach(function(a) {
          if (/Google Maps/.test(a.textContent)) a.remove()
        })
      }
    });
    return "<!doctype html>" + doc.documentElement.outerHTML
  }

  function ck(id) {
    var e = document.getElementById(id);
    return !!(e && e.checked)
  }
  var RNOTE = "Repair budget: ACP\u2019s repair figure is used unless the borrower can show why their number is better. The repair number must reflect what a third-party contractor would charge if the lender were forced to finish the project. If the borrower completes the work for less, any unused repair funds are returned when the loan is paid in full.";

  function repairs(raw, d) {
    var doc = new DOMParser().parseFromString(raw, "text/html");
    var kv = {};
    doc.querySelectorAll("table.kv tr").forEach(function(tr) {
      var c = tr.children;
      if (c.length > 1 && !(c[0].textContent.trim() in kv)) kv[c[0].textContent.trim()] = c[1].textContent.trim()
    });
    var sf = num(kv["Sq Ft"]) || 1500,
      yb = num(kv["Year Built"]),
      bb = String(kv["Beds / Baths"] || "").split("/"),
      ba = num(bb[1]) || 2,
      full = Math.max(1, Math.floor(ba)),
      half = ba - Math.floor(ba) > 0 ? 1 : 0,
      age = yb ? new Date().getFullYear() - yb : 40;
    var it = [];
    var ph = ck("daPhotos") && num(v("daAcpRep")) > 0;
    if (ph) it.push(["Photo review", "ACP repair estimate from borrower photos (full line-item chart" + (document.getElementById("daLevel").value === "full" ? " attached as an exhibit)" : " included in the Full Package)"), num(v("daAcpRep"))]);
    else {
      if (!ck("daNoHvac")) it.push(["Major", "HVAC (full replacement)", Math.max(7500, Math.round(4.5 * sf))]);
      if (!ck("daNoRoof")) it.push(["Major", "Roof (full replacement)", Math.max(9000, Math.round(5 * sf))]);
      if (!ck("daNoFdn")) it.push(["Major", "Foundation (leveling / repair)", sf > 2000 ? 10000 : 8000]);
      it.push(["Interior", "Flooring throughout (" + Math.round(sf).toLocaleString("en-US") + " SF)", Math.round(5 * sf)]);
      it.push(["Interior", "Kitchen remodel", age < 15 ? 8000 : 15000]);
      it.push(["Interior", "Bathroom remodel (" + full + " full" + (half ? " + " + half + " half" : "") + ")", full * (age < 15 ? 5000 : 8000) + half * 3000]);
      it.push(["Interior", "Paint, full interior", Math.round(2.5 * sf)]);
      it.push(["Exterior", "Paint, full exterior", Math.round(2 * sf)]);
    }
    var sub = it.reduce(function(a, x) {
        return a + x[2]
      }, 0),
      af = ph ? 0 : age >= 45 ? .15 : age >= 25 ? .10 : .05,
      adj = Math.round(sub * af),
      tot = sub + adj;
    if (!ph) it.push(["Age factor", "Built " + (yb || "unknown") + " (" + Math.round(af * 100) + "% of items above)", adj]);
    var bR = num(d.repairBudget),
      useB = ck("daUseBor") && bR > 0,
      used = useB ? bR : tot;
    d.repairBudget = String(used);
    var sec = doc.createElement("div");
    sec.className = "sec";
    sec.innerHTML = '<h2>' + (ph ? 'Repair Estimate (From Borrower Photos)' : 'Estimated Repairs (Level 1 Condition)') + '</h2><p class="muted">' + (ph ? 'ACP reviewed the interior and exterior photos provided and priced the work at third-party contractor rates.' : 'No photos provided. Estimate is based on age, size and configuration to bring the property to Level 1 condition. HVAC, roof and foundation are assumed needed unless shown otherwise. The repair budget is finalized once interior and exterior photos are reviewed.') + '</p><table><tr><th>Category</th><th>Item</th><th>Estimate</th></tr>' + (document.getElementById("daLevel").value === "full" ? it.map(function(x) {
      return "<tr><td>" + x[0] + "</td><td>" + esc(x[1]) + "</td><td>" + usd(x[2]) + "</td></tr>"
    }).join("") : "<tr><td>Total</td><td>Repair budget used in this report (line items included in the Full Package)</td><td>" + usd(used) + "</td></tr>") + '</table>';
    var snap = null;
    secs(doc).forEach(function(s2) {
      if (/^Property Snapshot/.test(s2.t)) snap = s2.el;
      if (/^Deal Economics/.test(s2.t)) s2.el.querySelectorAll("tr").forEach(function(tr) {
        if (/^\s*Repairs/.test(tr.textContent)) {
          tr.children[1].textContent = usd(used);
          tr.children[2].textContent = usd(used)
        }
      })
    });
    doc.querySelectorAll("table.kv tr").forEach(function(tr) {
      if (tr.children[0] && tr.children[0].textContent.trim() === "Purchase Price") tr.children[0].textContent = "Purchase Price (as submitted)";
      if (tr.children[0] && tr.children[0].textContent.trim() === "Repair Budget") tr.children[1].textContent = usd(used) + (useB ? " (borrower budget)" : " (ACP estimate; borrower " + (bR ? usd(bR) : "none") + ")")
    });
    if (snap) snap.parentNode.insertBefore(sec, snap.nextSibling);
    else doc.body.appendChild(sec);
    return "<!doctype html>" + doc.documentElement.outerHTML
  }
  var ACPC = 'ACP Real Estate Lending &middot; Steve Waller &middot; <a href="tel:+19365228951" style="color:inherit">936-522-8951</a> &middot; <a href="mailto:steve@acp-lending.com" style="color:inherit">steve@acp-lending.com</a> &middot; <a href="https://acp-lending.com" style="color:inherit">acp-lending.com</a>';

  function brand(doc, d) {
    var now = new Date().toLocaleString("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }) + " CT";
    doc.title = "ACP Deal Executive Summary - " + d.propertyAddress + " (Confidential)";
    var hd = doc.querySelector(".hd");
    if (hd) {
      var p = hd.querySelector("p");
      if (p) p.textContent = d.propertyAddress + ", " + d.city + ", " + d.state + " " + d.zip + " | " + now;
      var t = doc.createElement("p");
      t.style.cssText = "margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;opacity:1";
      t.textContent = "Prepared by ACP Real Estate Lending \u00b7 Confidential";
      hd.insertBefore(t, hd.firstChild);
      var c = doc.createElement("p");
      c.style.cssText = "margin:8px 0 0;font-size:13px;opacity:1";
      c.innerHTML = ACPC;
      hd.appendChild(c)
    }
    var ft = doc.querySelector(".foot");
    var fh = '<div style="font-size:13px;color:#333;margin-bottom:6px"><b>Confidential.</b> Prepared by ACP Real Estate Lending for the named borrower only. Do not distribute. Not a commitment to lend.</div><div style="font-size:13px;color:#333">' + ACPC + '</div>';
    if (ft) ft.innerHTML = fh;
    else {
      ft = doc.createElement("div");
      ft.className = "foot";
      ft.innerHTML = fh;
      (doc.querySelector(".wrap") || doc.body).appendChild(ft)
    }
  }

  // One deal calculation used by every section and every report level.
  // Loan = the lower of the approved loan-to-cost (default 90% of purchase + 100% of repairs)
  // and 75% of ARV.
  // Lender closing costs (lender 1.5% + broker) and third-party closing costs (estimated as a
  // percentage of the loan) are paid at closing, never in the loan.
  // Cash due at closing = purchase + repairs not covered by the loan + lender + third-party costs.
  // Liquidity after closing = 6 months interest (~11%) + 1/2 annual taxes + 1/3 of repairs.
  function deal(x, P) {
    var La = Math.round(.75 * x.arv),
      Lc = Math.round(x.F.lp * P + x.F.lr * x.R);
    var L = Math.min(La, Lc),
      bind = Lc < La ? "loan-to-cost" : "75% of ARV";
    var cc = Math.round((.015 + x.F.bo) * L + x.F.bc);
    var tp = Math.round(x.F.tpp * L);
    var gap = Math.max(0, Math.round(P + x.R - L));
    var due = gap + cc + tp;
    var liq = Math.round(L * .11 / 2 + x.T.t / 2 + x.R / 3);
    return { P: P, L: L, La: La, Lc: Lc, bind: bind, cc: cc, tp: tp, gap: gap, due: due, liq: liq, tot: due + liq }
  }

  function recPrice(x) {
    return Math.max(0, Math.round(.75 * x.arv - x.R))
  }

  function ltcLabel(x) {
    return Math.round(x.F.lp * 100) + "% of purchase + " + Math.round(x.F.lr * 100) + "% of repairs"
  }

  // Two columns: the ACP recommended purchase price and the purchase price as submitted.
  function chartRows(x, A, B) {
    var arvV = x.arv ? usd(x.arv) : "not determined";
    return [
      ["ARV" + (x.arv && x.n ? " (" + x.n + " closed comparables)" : ""), arvV, arvV],
      ["Purchase Price", usd(A.P), usd(B.P)],
      ["Loan Amount (lower of loan-to-cost, " + ltcLabel(x) + ", and 75% of ARV)", usd(A.L), usd(B.L)],
      ["Loan limited by", A.bind, B.bind],
      ["Repairs", usd(x.R), usd(x.R)],
      ["Purchase + repairs not covered by the loan", usd(A.gap), usd(B.gap)],
      ["Lender Closing Costs (lender points 1.5% + broker " + Math.round(x.F.bo * 100) + "% + " + usd(x.F.bc) + ")", usd(A.cc), usd(B.cc)],
      ["Third-Party Closing Costs (estimated at " + (x.F.tpp * 100).toFixed(1) + "% of the loan: title, escrow, appraisal, survey and recording)", usd(A.tp), usd(B.tp)],
      ["<b>Cash Due at Closing</b> (closing costs are paid at closing and cannot be included in the loan)", "<b>" + usd(A.due) + "</b>", "<b>" + usd(B.due) + "</b>"],
      ["&nbsp;", "", ""],
      ["Liquidity to manage the project after closing (6 months of interest and 1/2 of annual taxes + 1/3 of repair costs)", usd(A.liq), usd(B.liq)]
    ]
  }

  var COLS = '<th style="text-align:right">ACP Recommended Price</th><th style="text-align:right">Purchase Price as Submitted</th>';

  function chartTable(rows) {
    var R = 'style="text-align:right;white-space:nowrap"';
    return '<table><thead><tr><th></th>' + COLS + '</tr></thead><tbody>' + rows.map(function(r) {
      return "<tr><td><b>" + r[0] + "</b></td><td " + R + ">" + r[1] + "</td><td " + R + ">" + r[2] + "</td></tr>"
    }).join("") + '</tbody></table><p style="margin-top:6px;font-size:12px;font-style:italic">Amount is estimated and subject to final credit approval.</p>'
  }

  // Writes the same chart into the Executive Summary, Deal Economics and Liquidity Check.
  function applyChart(doc, x, A, B) {
    var tbl = chartTable(chartRows(x, A, B));
    var note = '';
    secs(doc).forEach(function(s) {
      if (/^Executive Summary/.test(s.t)) s.el.innerHTML = '<h2>Executive Summary</h2><p><b>' + esc(x.addr) + '</b></p>' + tbl + note;
      if (/^Deal Economics/.test(s.t)) s.el.innerHTML = '<h2>Deal Economics (Estimates)</h2>' + tbl;
      if (/^Liquidity Check/.test(s.t)) {
        var ok = function(v) {
          return x.liq ? (v <= x.liq ? ' <span class="pos">OK</span>' : ' <span class="neg">SHORT</span>') : ""
        };
        var R = 'style="text-align:right;white-space:nowrap"';
        s.el.innerHTML = '<h2>Liquidity Check</h2><table><thead><tr><th></th>' + COLS + '</tr></thead><tbody>' +
          (x.liq ? '<tr><td><b>Borrower Liquidity</b></td><td ' + R + '>' + usd(x.liq) + '</td><td ' + R + '>' + usd(x.liq) + '</td></tr>' : '') +
          '<tr><td>Cash Due at Closing</td><td ' + R + '>' + usd(A.due) + '</td><td ' + R + '>' + usd(B.due) + '</td></tr>' +
          '<tr><td>Liquidity to manage the project after closing</td><td ' + R + '>' + usd(A.liq) + '</td><td ' + R + '>' + usd(B.liq) + '</td></tr>' +
          '<tr><td><b>Total Cash Required</b> (cash due at closing + liquidity to manage the project)</td><td ' + R + '><b>' + usd(A.tot) + '</b>' + ok(A.tot) + '</td><td ' + R + '><b>' + usd(B.tot) + '</b>' + ok(B.tot) + '</td></tr></tbody></table>' +
          (x.liq ? '' : '<p class="muted">Borrower liquidity not provided.</p>')
      }
    })
  }

  function common(raw, d) {
    var doc = new DOMParser().parseFromString(raw, "text/html");
    var x = nums(doc, d);
    brand(doc, d);
    doc.querySelectorAll("img").forEach(function(i) {
      i.style.maxWidth = "460px"
    });
    secs(doc).forEach(function(s) {
      if (/^Deal Economics/.test(s.t)) s.el.querySelectorAll("tr").forEach(function(tr) {
        if (/^\s*Max Offer/.test(tr.textContent)) tr.remove()
      })
    });
    // No data-vendor names in client reports.
    doc.querySelectorAll("h2,h3,p,td,th,span,div.muted").forEach(function(el) {
      if (el.children.length === 0 && /PropertyReach/i.test(el.textContent)) el.textContent = el.textContent.replace(/\s*\(PropertyReach\)/gi, "").replace(/PropertyReach/gi, "public records")
    });
    // Deal Report level: the chart at the asking price.
    applyChart(doc, x, deal(x, recPrice(x)), deal(x, x.P));
    return "<!doctype html>" + doc.documentElement.outerHTML
  }

  function fees() {
    var g = function(id, dv) {
      var e = document.getElementById(id);
      return e && e.value !== "" ? num(e.value) : dv
    };
    return {
      bo: g("daOrig", 2) / 100,
      bc: g("daBcf", 1000),
      tpp: g("daTp", 2) / 100,
      lp: g("daLtcP", 90) / 100,
      lr: g("daLtcR", 100) / 100
    }
  }

  function tax(doc, P) {
    var t = 0;
    doc.querySelectorAll("table.kv tr").forEach(function(tr) {
      var c = tr.children;
      if (c.length > 1 && c[0].textContent.trim() === "Tax") t = num((c[1].textContent.match(/\$[\d,]+/) || [""])[0])
    });
    return t ? {
      t: t,
      est: false
    } : {
      t: Math.round(.025 * P),
      est: true
    }
  }

  function nums(doc, d) {
    var arv = 0,
      n = 0;
    secs(doc).forEach(function(s) {
      if (/^ARV Analysis/.test(s.t)) {
        var b = s.el.querySelector(".big");
        arv = num(b ? b.textContent : "");
        var m = s.el.textContent.match(/(\d+) comparables/);
        if (m) n = +m[1]
      }
    });
    var P = num(d.purchasePrice),
      R = num(d.repairBudget),
      F = fees();
    var T = tax(doc, P);
    return {
      arv: arv,
      n: n,
      P: P,
      R: R,
      F: F,
      T: T,
      liq: num(d.borrowerLiquidity),
      addr: d.propertyAddress + ", " + d.city + ", " + d.state + " " + d.zip
    }
  }

  function profit(html, d) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var x = nums(doc, d);
    if (!x.arv) return html;
    var x0 = x,
      recP = recPrice(x);

    function calc(x, atRec) {
      var D = deal(x, x.P),
        L = D.L,
        cc = D.cc,
        tx = x.T.t,
        ins = 3000,
        util = 200,
        mo = 6;
      // Out of pocket = all closing costs (lender + third-party) + 6 months of holding costs
      // + any purchase or repairs the loan does not cover. Repairs inside the loan come back
      // through draws, so the 1/3-of-repairs liquidity reserve is not cash invested.
      var tp = D.tp,
        ccAll = cc + tp,
        gap = D.gap;
      var hold = Math.round(L * .11 * mo / 12 + tx * mo / 12 + ins * mo / 12 + util * mo),
        sell = Math.round(.07 * x.arv);
      var fp = Math.round(x.arv - sell - x.P - x.R - ccAll - hold),
        fcash = Math.max(1, gap + ccAll + hold),
        froi = fp / fcash,
        fann = froi * 12 / mo,
        fmargin = fp / x.arv;
      var rIn = num(v("daRent")),
        rent = rIn || Math.round(.008 * x.arv),
        rr = (num(v("daRefi")) || 7.5) / 100;
      var refi = Math.round(.75 * x.arv),
        rcost = Math.round(.02 * refi),
        cashOut = refi - L - rcost,
        left = fcash - cashOut;
      var egi = rent * .95,
        opex = (tx + ins) / 12 + rent * .08 + egi * .08,
        noi = egi - opex,
        r = rr / 12,
        n = 360,
        pi = refi * r / (1 - Math.pow(1 + r, -n)),
        cf = noi - pi,
        dscr = pi ? noi / pi : 0,
        coc = left > 0 ? cf * 12 / left : null;
      var flipOK = fmargin >= .10,
        rentOK = dscr >= 1.20 && cf > 0,
        rec, why;
      if (flipOK && rentOK) {
        if (left <= 0 || (coc !== null && coc >= fann)) {
          rec = "Rent";
          why = "Both strategies work. Refinancing returns most or all of the cash and the rent covers the new loan, so holding builds equity without leaving much money in the deal."
        } else {
          rec = "Flip";
          why = "Both strategies work, but the sale returns more on the cash invested than the rental does on the cash left in after refinancing."
        }
      } else if (flipOK) {
        rec = "Flip";
        why = "The sale clears a 10% margin on the after-repair value. As a rental, the rent does not cover the refinance payment at a 1.20 DSCR."
      } else if (rentOK) {
        rec = "Rent";
        why = "The sale margin is under 10% of the after-repair value, but the rent covers the refinance payment at a 1.20 DSCR or better."
      } else {
        rec = "Neither at this price";
        why = atRec ? "At the ACP recommended purchase price the sale does not clear a 10% margin on the after-repair value and the rent does not cover a refinance at a 1.20 DSCR. At this ARV and repair budget the deal does not work as a flip or a rental." : "At this purchase price the sale does not clear a 10% margin and the rent does not cover a refinance at a 1.20 DSCR. The deal needs a lower price, see the ACP Recommended Offer above."
      }
      return {
        L: L,
        cc: cc,
        tp: tp,
        ccAll: ccAll,
        gap: gap,
        tx: tx,
        ins: ins,
        util: util,
        mo: mo,
        hold: hold,
        sell: sell,
        fp: fp,
        fcash: fcash,
        froi: froi,
        fann: fann,
        fmargin: fmargin,
        rIn: rIn,
        rent: rent,
        rr: rr,
        refi: refi,
        rcost: rcost,
        cashOut: cashOut,
        left: left,
        egi: egi,
        opex: opex,
        noi: noi,
        r: r,
        n: n,
        pi: pi,
        cf: cf,
        dscr: dscr,
        coc: coc,
        flipOK: flipOK,
        rentOK: rentOK,
        rec: rec,
        why: why
      }
    }
    var S = calc(x0),
      A = calc(nums(doc, Object.assign({}, d, {
        purchasePrice: String(recP)
      })), true);
    var pc = function(z) {
        return (Math.round(z * 1000) / 10).toFixed(1) + "%"
      },
      m = function(z) {
        return z < 0 ? "-" + usd(-z) : usd(z)
      };
    // The same flip-or-rent test run at both prices.
    var card = function(Z, P, title) {
      return '<h3 style="margin:14px 0 6px">' + title + ' (' + usd(P) + ')</h3><p style="margin:0 0 10px;padding:10px 12px;background:#eef6ee;border:1px solid #9cc79c;border-radius:6px"><b>ACP recommendation: ' + Z.rec + '.</b> ' + Z.why + '</p><table><tr><th></th><th>Flip</th><th>Rent (refinance and hold)</th></tr>' + [
        ["Sale price / after-repair value", usd(x.arv), usd(x.arv)],
        ["Loan (lower of loan-to-cost and 75% of ARV)", usd(Z.L), usd(Z.L)],
        ["Selling costs (7% of sale)", usd(Z.sell), "-"],
        ["Closing costs paid at closing (lender " + usd(Z.cc) + " + third-party, est. " + usd(Z.tp) + ")", usd(Z.ccAll), usd(Z.ccAll)],
        ["Holding costs, " + Z.mo + " months (interest payments, taxes, insurance, utilities)", usd(Z.hold), usd(Z.hold)],
        ["Estimated profit", '<b>' + m(Z.fp) + '</b> (' + pc(Z.fmargin) + ' of ARV)', "-"],
        ["Cash invested (closing costs + holding costs" + (Z.gap ? " + purchase and repairs not covered by the loan" : "") + "; repairs in the loan are reimbursed through draws)", usd(Z.fcash), usd(Z.fcash)],
        ["Refinance loan (75% of ARV)", "-", usd(Z.refi)],
        ["Cash back at refinance (after payoff and 2% costs)", "-", m(Z.cashOut)],
        ["Cash left in the deal", "-", Z.left > 0 ? usd(Z.left) : "None"],
        ["Monthly rent" + (Z.rIn ? "" : " (0.8% of ARV, verify with rent comps)"), "-", usd(Z.rent)],
        ["Net operating income / month (5% vacancy, 8% maintenance, 8% management)", "-", m(Math.round(Z.noi))],
        ["Principal and interest / month (" + (Z.rr * 100) + "%, 30 years)", "-", usd(Math.round(Z.pi))],
        ["Cash flow / month", "-", '<b>' + m(Math.round(Z.cf)) + '</b>'],
        ["DSCR (NOI / P&amp;I)", "-", (Math.round(Z.dscr * 100) / 100).toFixed(2)],
        ["Annual cash-on-cash", "-", Z.coc === null ? "Infinite, no cash left in" : pc(Z.coc)]
      ].map(function(r) {
        return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>"
      }).join("") + '</table>'
    };
    var sec = doc.createElement("div");
    sec.className = "sec";
    sec.innerHTML = '<h2>Profitability Estimate</h2>' + card(A, recP, "At the ACP recommended purchase price") + card(S, x0.P, "At the purchase price as submitted") + '<p class="muted" style="margin-top:8px">Both use the repairs in this report (' + usd(x.R) + '), a loan equal to the lower of loan-to-cost (' + ltcLabel(x) + ') and 75% of ARV, lender closing costs and estimated third-party closing costs (' + (x.F.tpp * 100).toFixed(1) + '% of the loan) paid at closing, annual taxes of ' + usd(A.tx) + ', insurance of ' + usd(A.ins) + ' a year and ' + usd(A.util) + ' a month in utilities. Recommendation rule: flip when the sale clears a 10% margin on ARV; rent when the rent covers the refinance at a 1.20 DSCR; when both work, the one with the better return on cash. Not a commitment to lend.</p>';
    var after = null;
    secs(doc).forEach(function(s2) {
      if (/^ACP Recommended Offer/.test(s2.t)) after = s2.el
    });
    if (after) after.parentNode.insertBefore(sec, after.nextSibling);
    else doc.body.appendChild(sec);
    return "<!doctype html>" + doc.documentElement.outerHTML
  }

  function offer(html, d) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var x = nums(doc, d);
    var rec = recPrice(x),
      D = deal(x, rec);
    var sec = doc.createElement("div");
    sec.className = "sec";
    sec.innerHTML = '<h2>ACP Recommended Offer</h2><table class="kv"><tr><td>Recommended offer</td><td><b>' + usd(rec) + '</b></td></tr></table><p class="muted" style="margin-top:10px">Recommended offer = 75% of ARV (' + usd(D.La) + ') less repairs (' + usd(x.R) + '). The loan is the lower of the approved loan-to-cost (' + ltcLabel(x) + ', ' + usd(D.Lc) + ') and 75% of ARV, so at this price the loan is ' + usd(D.L) + ' and ' + usd(D.gap) + ' of purchase and repairs is paid at closing. Lender closing costs (estimated ' + usd(D.cc) + ') and third-party closing costs (estimated ' + usd(D.tp) + ') are paid at closing and cannot be included in the loan.</p><p>Phone walkthrough: call or text 936-522-8951 to schedule.</p>';
    applyChart(doc, x, D, deal(x, x.P));
    var after = null;
    secs(doc).forEach(function(s) {
      if (/^Deal Economics/.test(s.t)) after = s.el
    });
    if (after) after.parentNode.insertBefore(sec, after.nextSibling);
    else doc.body.appendChild(sec);
    return "<!doctype html>" + doc.documentElement.outerHTML
  }

  function num(x) {
    return parseFloat(String(x || "").replace(/[^\d.]/g, "")) || 0
  }

  function usd(n) {
    return "$" + Math.round(n).toLocaleString("en-US")
  }
  var PROGS = [{
      c: "ACP-K",
      fico: 640,
      min: 100000,
      max: 5000000,
      pp: 1,
      rp: 1,
      ltc: .95,
      arv: function() {
        return .80
      },
      pts: .015,
      fixed: 0,
      no: []
    },
    {
      c: "ACP-RCN",
      fico: 650,
      min: 75000,
      max: 2000000,
      pp: .90,
      rp: 1,
      ltc: 1,
      arv: function() {
        return .75
      },
      pts: .015,
      fixed: 0,
      no: []
    },
    {
      c: "ACP-E",
      fico: 600,
      min: 75000,
      max: 5000000,
      pp: .90,
      rp: 1,
      ltc: .93,
      arv: function() {
        return .75
      },
      pts: .015,
      fixed: 1995,
      no: ["LA", "MN", "ND", "SD"]
    },
    {
      c: "ACP-F",
      fico: 650,
      min: 100000,
      max: 1250000,
      pp: 1,
      rp: 1,
      ltc: 1,
      arv: function(f, e) {
        return f >= 700 ? (e > 3 ? .75 : .70) : .65
      },
      pts: .015,
      fixed: 0,
      only: ["PA", "DE", "MA", "OH", "CT", "MD", "TX", "GA", "TN", "NJ", "NC", "SC", "MO", "IN", "AL", "VA", "KY"]
    },
    {
      c: "ACP-L",
      fico: 0,
      min: 100000,
      max: 3000000,
      pp: 1,
      rp: 1,
      ltc: .925,
      arv: function() {
        return .80
      },
      pts: 0,
      fixed: 1395 + 550,
      lfee: function(L) {
        return Math.max(.01 * L, 2000)
      },
      no: ["AK", "NV", "ND", "SD"]
    }
  ];

  function financing(html, d) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var P = num(d.purchasePrice),
      R = num(d.repairBudget),
      st = String(d.state || "").trim().toUpperCase().slice(0, 2);
    var arv = 0;
    secs(doc).forEach(function(s) {
      if (/^ARV Analysis/.test(s.t)) {
        var m = s.el.textContent.match(/\$[\d,]+/);
        if (m) arv = num(m[0])
      }
    });
    var FULL = !!d.__full;
    if (FULL && arv) P = Math.max(0, Math.round(.75 * arv - R));
    var f = num(document.getElementById("daFico").value),
      e = num(document.getElementById("daExp").value),
      tpp = fees().tpp,
      bo = num(document.getElementById("daOrig").value) / 100,
      bc = num(document.getElementById("daBcf").value);
    var T = tax(doc, P);
    var ok = [],
      out = [];
    PROGS.forEach(function(p) {
      var why = "";
      if (p.fico && f && f < p.fico) why = "credit below " + p.fico;
      else if (p.no && p.no.indexOf(st) >= 0) why = "not available in " + st;
      else if (p.only && p.only.indexOf(st) < 0) why = "not available in " + st;
      var a = p.arv(f, e),
        caps = [
          [Math.round(Math.min(a, .75) * 100) + "% of ARV", Math.min(a, .75) * arv],
          ["program maximum", p.max],
          ["loan-to-cost", Math.min(p.pp * P + p.rp * R, p.ltc * (P + R))]
        ];
      caps.sort(function(x, y) {
        return x[1] - y[1]
      });
      var L = Math.max(0, Math.floor(caps[0][1] + 1e-6));
      if (!why && L < p.min) why = "loan below " + usd(p.min) + " minimum";
      if (why) {
        out.push(p.c + " (" + why + ")");
        return
      }
      var lc = Math.round((p.lfee ? p.lfee(L) : p.pts * L) + p.fixed),
        bf = Math.round(bo * L + bc),
        tp = Math.round(tpp * L),
        eq = P + R - L,
        rs = L * .11 / 2 + T.t / 2,
        cash = eq + lc + bf + tp + rs;
      var liq = Math.round(L * .11 / 2 + T.t / 2 + R / 3);
      var due = Math.max(0, Math.round(eq)) + lc + bf + tp;
      cash = due + liq;
      ok.push({
        c: p.c,
        L: L,
        bind: caps[0][0],
        eq: eq,
        lc: lc,
        bf: bf,
        tp: tp,
        rs: rs,
        cash: cash,
        due: due,
        liq: liq
      })
    });
    ok.sort(function(x, y) {
      return x.cash - y.cash
    });
    var show = ok.slice(0, 2);
    var sec = doc.createElement("div");
    sec.className = "sec";
    var h = '<h2>Financing Options</h2><p><i>All figures are estimates, subject to lender review.</i></p>';
    if (!show.length) {
      h += '<p>None of the programs in the lender matrix fit this deal as submitted. ACP will review alternatives.</p>'
    } else {
      var lab = ["Best fit", "Alternative"];
      h += '<table><tr><th></th>' + show.map(function(o, i) {
          return "<th>" + lab[i] + ": " + o.c + "</th>"
        }).join("") + '</tr>' +
        [
          ["Estimated loan", function(o) {
            return usd(o.L)
          }],
          ["Loan limited by", function(o) {
            return o.bind
          }],
          ["Repairs", function() {
            return usd(R)
          }],
          [FULL ? "Purchase Price (ACP recommended)" : "Purchase Price", function() {
            return usd(P)
          }],
          ["Purchase + repairs not covered by loan", function(o) {
            return usd(Math.max(0, o.eq))
          }],
          ["Lender Closing Costs (lender + broker)", function(o) {
            return usd(o.lc + o.bf)
          }],
          ["Third-Party Closing Costs (estimated at " + (tpp * 100).toFixed(1) + "% of the loan)", function(o) {
            return usd(o.tp)
          }],
          ["<b>Cash Due at Closing</b>", function(o) {
            return "<b>" + usd(o.due) + "</b>"
          }],
          ["&nbsp;", function() {
            return ""
          }],
          ["Liquidity to manage the project after closing (6 months of interest and 1/2 of annual taxes + 1/3 of repair costs)", function(o) {
            return usd(o.liq)
          }]
        ].map(function(r) {
          return "<tr><td>" + r[0] + "</td>" + show.map(function(o) {
            return "<td style=\"text-align:right;white-space:nowrap\">" + r[1](o) + "</td>"
          }).join("") + "</tr>"
        }).join("") + '</table>'
    }
    if (out.length) h += '<p style="font-size:90%">Programs that do not fit as submitted: ' + out.join("; ") + '.</p>';
    h += '<p style="font-size:90%">Estimates from published lender program terms' + (f ? ", credit score " + f : "") + (document.getElementById("daExp").value !== "" ? ", " + e + " deals closed in 36 months" : "") + '. Lender costs are estimated where a lender does not publish them. Final terms depend on lender review, appraisal and approval. Not a commitment to lend.</p>';
    sec.innerHTML = h;
    var all = secs(doc),
      after = null;
    all.forEach(function(s) {
      if (/^Liquidity Check/.test(s.t)) after = s.el
    });
    if (after) after.parentNode.insertBefore(sec, after.nextSibling);
    else doc.body.appendChild(sec);
    return "<!doctype html>" + doc.documentElement.outerHTML
  }

  // Orders the report by level: what the free summary gives, what the $49.99 Deal Report adds,
  // and what the $149.99 Full Package adds. The Executive Summary stays first.
  function tiers(html, lvl, d) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var all = secs(doc);
    if (!all.length) return html;
    // Part 1 opens with one plain-language paragraph: what ACP is prepared to provide.
    var x = nums(doc, d),
      kv = {};
    doc.querySelectorAll("table.kv tr").forEach(function(tr) {
      var c = tr.children;
      if (c.length > 1 && !(c[0].textContent.trim() in kv)) kv[c[0].textContent.trim()] = c[1].textContent.trim()
    });
    var bb = (kv["Beds / Baths"] || "").split("/").map(function(z) {
      return z.trim()
    });
    var desc = [bb[0] ? bb[0] + "-bedroom" : "", bb[1] ? bb[1] + "-bath" : "", kv["Sq Ft"] ? Number(num(kv["Sq Ft"])).toLocaleString("en-US") + " SF" : "", "home", kv["Year Built"] ? "built in " + kv["Year Built"] : "", kv["Subdivision"] ? "in " + kv["Subdivision"] : ""].filter(Boolean).join(" ").replace("-bath ", "-bath, ");
    var D0 = deal(x, lvl === "full" ? recPrice(x) : x.P);
    var para = "ACP Real Estate Lending has reviewed " + esc(x.addr) + ", a " + desc + "." + (x.arv ? " Based on " + (x.n ? x.n + " closed comparable sales" : "comparable sales") + ", ACP estimates an after-repair value of " + usd(x.arv) + (x.R ? " with repairs of " + usd(x.R) : "") + ". ACP is prepared to provide an estimated loan of " + usd(D0.L) + ", the lower of the approved loan-to-cost (" + ltcLabel(x) + ") and 75% of the after-repair value, toward the purchase and repairs, subject to final credit approval." : "") + " Lender and third-party closing costs are paid at closing and cannot be included in the loan. The property details follow, and the financing figures are laid out in the sections below.";
    var ps = doc.createElement("div");
    ps.className = "sec";
    ps.innerHTML = "<h2>Summary</h2><p>" + para + "</p>";
    var snapEl = null;
    all.forEach(function(s) {
      if (/^Property Snapshot/.test(s.t)) snapEl = s.el
    });
    if (snapEl) snapEl.parentNode.insertBefore(ps, snapEl);
    all = secs(doc);
    var parent = all[0].el.parentNode;
    // Exhibits sit at the end, each lettered; each keeps a short summary in the body.
    // Order: comps, property record, repair estimate (Full Package), photos (Full Package),
    // and Financing Options always last. No exhibits in the free version.
    var exList = [[/^Comparable Sales/, "Comparable Sales (Last " + cmMonths() + " Months)", "comps"], [/^Property Record/, "Property Record", "record"]];
    if (lvl === "full") exList.push([/^Repair Estimate|^Estimated Repairs/, "Repair Estimate", "repairs"], ["PHOTOS", "Photos", ""]);
    exList.push([/^Financing Options/, "Financing Options", "fin"]);
    var letters = "ABCDEFG",
      li = 0;
    var rowv = function(el, re, col) {
      var out = "";
      el.querySelectorAll("tr").forEach(function(tr) {
        if (!out && tr.children.length > col && re.test(tr.children[0].textContent.trim())) out = tr.children[col].textContent.trim()
      });
      return out
    };
    var sumText = function(kind, el, L) {
      var t = el.textContent;
      if (kind === "comps") {
        var n = el.querySelectorAll("tr").length - 1;
        var m = t.match(/Median:\s*(\$[\d,]+)/), a = t.match(/Median \$\/SF:\s*(\$[\d,.]+)/) || t.match(/Avg \$\/SF:\s*(\$[\d,.]+)/);
        return (n > 0 ? n + " closed sales" : "Closed sales") + (kv["Subdivision"] ? " in " + esc(String(kv["Subdivision"]).replace(/\s+Sec(tion)?\s*\d+.*$/i, "")) : "") + " over the last " + cmMonths() + " months support the after-repair value of " + usd(x.arv) + "." + (m ? " The median sale price is " + m[1] + (a ? " and the " + (CM ? "median" : "average") + " is " + a[1] + " per square foot" : "") + "." : "") + " Each sale is listed with price, $/SF, size and date in Exhibit " + L + "."
      }
      if (kind === "record") {
        var occ = rowv(el, /^Occupancy/, 1), mv = rowv(el, /^Market Value/, 1), tx = rowv(el, /^Tax$/, 1), fz = rowv(el, /^Flood Zone/, 1), ln = rowv(el, /^Open Loans/, 1), dl = rowv(el, /^Tax Delinquent/, 1);
        return "Public records show the property as " + (occ ? occ.toLowerCase() : "on record") + (mv ? " with a county market value of " + mv : "") + (tx ? " and annual taxes of " + tx : "") + "." + (fz ? " Flood zone: " + fz + "." : "") + (ln ? " Open loans / liens: " + ln + "." : "") + (/yes/i.test(dl) ? " Taxes are shown as delinquent; confirm the payoff at title." : "") + " The full ownership and value record is Exhibit " + L + "."
      }
      if (kind === "repairs") {
        var ph = /Borrower Photos/.test(el.querySelector("h2").textContent);
        return "ACP's repair budget is " + usd(x.R) + (ph ? ", priced at third-party contractor rates from the interior and exterior photos provided" : ", estimated from the property's age, size and configuration to bring it to Level 1 condition; HVAC, roof and foundation are assumed needed unless shown otherwise") + ". This is the figure used in every calculation in this report. The line-item estimate is Exhibit " + L + "."
      }
      if (kind === "fin") {
        var hd = el.querySelector("tr"), best = hd && hd.children[1] ? hd.children[1].textContent.replace(/^Best fit:\s*/, "").trim() : "";
        var ln2 = rowv(el, /^Estimated loan/, 1), cd = rowv(el, /^Cash Due at Closing/, 1);
        return best ? "The best-fit program for this deal is " + esc(best) + ", with an estimated loan of " + ln2 + " and estimated cash due at closing of " + cd + ". All figures are estimates, subject to lender review. The programs reviewed and their terms are Exhibit " + L + "." : "None of the programs in the lender matrix fit this deal as submitted; ACP will review alternatives. The programs reviewed are Exhibit " + L + "."
      }
      return ""
    };
    exList.forEach(function(e) {
      var el = null;
      if (e[0] === "PHOTOS") {
        var img = doc.querySelector("img");
        if (!img) return;
        el = doc.createElement("div");
        el.className = "sec";
        var im = img.cloneNode(true);
        im.style.maxWidth = "100%";
        im.style.width = "100%";
        el.innerHTML = "<h2></h2>";
        var w = doc.createElement("div");
        w.style.cssText = "text-align:center";
        w.appendChild(im);
        el.appendChild(w);
        var cap = doc.createElement("p");
        cap.className = "muted";
        cap.textContent = "Street view of the property. Interior and exterior photos provided by the borrower are attached to this exhibit.";
        el.appendChild(cap);
        (all[all.length - 1].el).parentNode.insertBefore(el, all[all.length - 1].el.nextSibling)
      } else {
        secs(doc).forEach(function(s) {
          if (!el && e[0].test(s.t)) el = s.el
        })
      }
      if (!el) return;
      var L = letters[li++];
      if (e[2]) {
        var sm = doc.createElement("div");
        sm.className = "sec";
        sm.innerHTML = "<h2>" + e[1].replace(/ \(.*\)$/, "") + " Summary</h2><p>" + sumText(e[2], el, L) + "</p>";
        el.parentNode.insertBefore(sm, el)
      }
      el.querySelector("h2").textContent = "Exhibit " + L + " — " + e[1];
    });
    all = secs(doc);
    var groups = [
      ["Part 1 &mdash; Basic Deal Summary (Free)", [/^Summary$/, /^Property Snapshot/, /^ARV Analysis/]],
      ["Part 2 &mdash; Deal Report ($49.99)", [/^Executive Summary/, /^Repair Estimate|^Estimated Repairs/, /^Deal Economics/, /^Liquidity Check/, /^Comparable Sales Summary/, /^Property Record Summary/, /^Financing Options/]],
      ["Part 3 &mdash; Full Package ($149.99)", [/^ACP Recommended Offer/, /^Profitability Estimate/]],
      ["Exhibits", [/^Exhibit A/, /^Exhibit B/, /^Exhibit C/, /^Exhibit D/, /^Exhibit E/, /^Exhibit F/, /^Pending Exhibits/]]
    ];
    if (lvl !== "full") groups.splice(2, 1);
    var anchor = null;
    var used = [];
    var foot = doc.querySelector(".foot");
    var put = function(node) {
      if (anchor) anchor.parentNode.insertBefore(node, anchor.nextSibling);
      else parent.insertBefore(node, all[0].el);
      anchor = node
    };
    groups.forEach(function(g) {
      var hits = [];
      g[1].forEach(function(re) {
        all.forEach(function(s) {
          if (re.test(s.t) && used.indexOf(s.el) < 0) {
            hits.push(s.el);
            used.push(s.el)
          }
        })
      });
      if (!hits.length) return;
      var h = doc.createElement("div");
      h.className = "tier";
      h.style.cssText = "margin:22px 0 0;padding:8px 14px;background:#0f172a;color:#fff;font:700 14px Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;border-radius:4px";
      h.innerHTML = g[0];
      put(h);
      hits.forEach(put)
    });
    return "<!doctype html>" + doc.documentElement.outerHTML
  }

  function addBar(html, to) {
    var bs = "background:#c9a24a;color:#0f172a;border:0;border-radius:4px;padding:9px 16px;font:600 14px Arial,sans-serif;cursor:pointer";
    var bar = '<style>.hd{text-align:center}@media print{.acp-bar{display:none!important}}</style><div class="acp-bar" style="position:sticky;top:0;z-index:99;background:#0f172a;padding:10px 16px;display:flex;gap:10px;justify-content:flex-end"><button type="button" id="acpPdf" style="' + bs + '">Save as PDF</button><button type="button" id="acpMail" style="' + bs + '">Email Analysis</button></div>';
    var js = '<script>(function(){var to=' + JSON.stringify(to || "").replace(/</g, "\\u003c") + ';document.getElementById("acpPdf").onclick=function(){window.print()};document.getElementById("acpMail").onclick=function(){var b=document.querySelector(".acp-bar");b.style.display="none";var t=document.body.innerText.replace(/[ \\t]+\\n/g,"\\n").replace(/\\n{3,}/g,"\\n\\n").trim();b.style.display="flex";if(t.length>1800)t=t.slice(0,1800)+"\\n\\n(Full report attached as PDF.)";location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(document.title)+"&body="+encodeURIComponent(t)}})()<\/script>';
    html = /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, function(m) {
      return m + bar
    }) : bar + html;
    return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, js + "</body>") : html + js
  }
})();