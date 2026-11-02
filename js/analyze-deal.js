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
    fx.innerHTML = '<div class="calc-field-row da-three"><div class="calc-field"><label for="daFico">Credit Score</label><input id="daFico" type="number" placeholder="700"></div><div class="calc-field"><label for="daExp">Deals Closed (36 mo)</label><input id="daExp" type="number" placeholder="3"></div><div class="calc-field"><label for="daAdhoc">Title Ad Hoc Fees</label><span class="da-money"><input id="daAdhoc" type="number" value="1000"></span></div></div><div class="calc-field-row"><div class="calc-field"><label for="daOrig">Broker Origination</label><select id="daOrig"><option value="0">0%</option><option value="1">1%</option><option value="2" selected>2%</option></select></div><div class="calc-field"><label for="daBcf">Broker Closing Fee</label><select id="daBcf"><option>500</option><option>750</option><option selected>1000</option></select></div></div><div class="calc-field-row"><div class="calc-field"><label for="daRent">Estimated Monthly Rent</label><span class="da-money"><input id="daRent" type="number" placeholder="blank = 0.8% of ARV"></span></div><div class="calc-field"><label for="daRefi">Rental Refinance Rate (%)</label><input id="daRefi" type="number" step="0.125" value="7.5"></div></div><div class="calc-field"><label><input id="daPhotos" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> Interior and exterior photos available</label></div><div class="calc-field"><label for="daAcpRep">ACP Repair Estimate from Photos</label><span class="da-money"><input id="daAcpRep" type="number" placeholder="from the photo repair chart"></span></div><div class="calc-field"><label><input id="daUseBor" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> Borrower showed why their repair number is better &mdash; use it</label></div><div class="calc-field"><label>Shown not needed (from photos or records):</label> <label><input id="daNoHvac" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> HVAC</label> &nbsp; <label><input id="daNoRoof" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> Roof</label> &nbsp; <label><input id="daNoFdn" type="checkbox" style="width:auto;display:inline-block;margin:0 6px 0 0;vertical-align:middle"> Foundation</label></div>';
    sb.parentNode.insertBefore(fx, sb);
  }
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
      })), d), d) : financing(summary(raw), d), lvl), d.borrowerEmail);
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
    }).join("\n") + "\n\n$49.99 Deal Report: financing options, full cash to close at 70% and 75% of ARV, and a liquidity check.\n$149.99 Full Package: everything in the Deal Report plus comparable sales, street view, map, full property record, repair review, ACP's recommended offer and walk-away price, and a phone walkthrough.\n" + pay.join("\n") + "\n" + note + "\n" + credit + "\n" + photos + "\n\nACP Real Estate Lending | 936-522-8951 | acp-lending.com";
    var href = "mailto:" + encodeURIComponent(d.borrowerEmail || "") + "?cc=steve%40acp-lending.com&subject=" + encodeURIComponent("Basic Deal Summary - " + addr) + "&body=" + encodeURIComponent(body);
    var td = "padding:8px 10px;border-bottom:1px solid #e6e8eb;text-align:left;vertical-align:top";
    return '<div style="margin:0 24px 8px;border:1px solid #e6e8eb;border-top:3px solid var(--gold);border-radius:8px;padding:18px 20px;background:#fff"><h3 style="margin:0 0 10px">Basic Deal Summary</h3><table style="width:100%;border-collapse:collapse">' + rows.map(function(x) {
      return '<tr><th style="' + td + ';width:38%">' + esc(x[0]) + '</th><td style="' + td + '">' + esc(x[1]) + '</td></tr>'
    }).join("") + '</table><p style="margin:14px 0"><a href="#" id="daMail" class="btn" data-href="' + esc(href) + '">Email This Summary</a></p><h4 style="margin:18px 0 6px">$49.99 Deal Report</h4><p style="margin:0 0 8px">Financing options, full cash to close at 70% and 75% of ARV, and a liquidity check.</p><h4 style="margin:14px 0 6px">$149.99 Full Package</h4><p style="margin:0 0 8px">Everything in the Deal Report plus comparable sales, street view, map, full property record, repair review, ACP&#39;s recommended offer and walk-away price, and a phone walkthrough.</p><p style="margin:0 0 6px"><b>Pay by:</b></p><ul style="margin:0 0 8px 18px">' + pay.map(function(p) {
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
    doc.querySelectorAll("img").forEach(function(i) {
      var p = i.parentElement;
      (p && !p.classList.contains("sec") && p.tagName === "DIV" ? p : i).remove()
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
    sec.innerHTML = '<h2>' + (ph ? 'Repair Estimate (From Borrower Photos)' : 'Estimated Repairs (Level 1 Condition)') + '</h2><p class="muted">' + (ph ? 'ACP reviewed the interior and exterior photos provided and priced the work at third-party contractor rates.' : 'No photos provided. Estimate is based on age, size and configuration to bring the property to Level 1 condition. HVAC, roof and foundation are assumed needed unless shown otherwise. The repair budget is finalized once interior and exterior photos are reviewed.') + '</p><table><tr><th>Category</th><th>Item</th><th>Estimate</th></tr>' + it.map(function(x) {
      return "<tr><td>" + x[0] + "</td><td>" + esc(x[1]) + "</td><td>" + usd(x[2]) + "</td></tr>"
    }).join("") + '</table>';
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
  // Loan = advance x ARV, cut to need (never above purchase + repairs).
  // Lender closing costs (lender 1.5% + broker) are paid at closing, never in the loan.
  // Cash due at closing = purchase + repairs not covered by the loan + lender closing costs.
  // Liquidity after closing = 6 months interest (~11%) + 1/2 annual taxes + 1/3 of repairs.
  function deal(x, a, P) {
    var L = Math.round(Math.min(a * x.arv, P + x.R));
    var cc = Math.round((.015 + x.F.bo) * L + x.F.bc);
    var due = Math.max(0, Math.round(P + x.R - L)) + cc;
    var liq = Math.round(L * .11 / 2 + x.T.t / 2 + x.R / 3);
    return { a: a, P: P, L: L, cc: cc, due: due, liq: liq, tot: due + liq }
  }

  function recPrices(x) {
    return {
      p70: Math.max(0, Math.round(.70 * x.arv - x.R)),
      p75: Math.max(0, Math.round(.75 * x.arv - x.R))
    }
  }

  function chartRows(x, A, B, recd) {
    var arvV = x.arv ? usd(x.arv) : "not determined";
    return [
      ["ARV" + (x.arv && x.n ? " (" + x.n + " closed comparables)" : ""), arvV, arvV],
      ["Loan Amount", usd(A.L), usd(B.L)],
      ["Repairs", usd(x.R), usd(x.R)],
      ["Lender Closing Costs (third-party costs such as appraisal, survey, feasibility study and title policy not included)", usd(A.cc), usd(B.cc)],
      [recd ? "Purchase Price (ACP recommended)" : "Purchase Price", usd(A.P), usd(B.P)],
      ["Cash Due at Closing (lender and third-party closing costs are paid at closing and cannot be included in the loan; third-party costs additional)", usd(A.due), usd(B.due)],
      ["&nbsp;", "", ""],
      ["Liquidity to manage the project after closing (6 months of interest and 1/2 of annual taxes + 1/3 of repair costs)", usd(A.liq), usd(B.liq)]
    ]
  }

  function chartTable(rows) {
    var R = 'style="text-align:right;white-space:nowrap"';
    return '<table><thead><tr><th></th><th style="text-align:right">70%</th><th style="text-align:right">75%</th></tr></thead><tbody>' + rows.map(function(r) {
      return "<tr><td><b>" + r[0] + "</b></td><td " + R + ">" + r[1] + "</td><td " + R + ">" + r[2] + "</td></tr>"
    }).join("") + '</tbody></table><p style="margin-top:6px;font-size:12px;font-style:italic">Amount is estimated and subject to final credit approval.</p>'
  }

  // Writes the same chart into the Executive Summary, Deal Economics and Liquidity Check.
  function applyChart(doc, x, A, B, recd) {
    var tbl = chartTable(chartRows(x, A, B, recd));
    var note = '<p style="margin-top:10px;font-size:12px;font-weight:700">*The estimated final loan amount will be based on the lower of loan-to-cost advance or the advance approved based on ARV. The above estimates are based on the ARV only for illustrative purposes.</p>';
    secs(doc).forEach(function(s) {
      if (/^Executive Summary/.test(s.t)) s.el.innerHTML = '<h2>Executive Summary</h2><p><b>' + esc(x.addr) + '</b></p>' + tbl + note;
      if (/^Deal Economics/.test(s.t)) s.el.innerHTML = '<h2>Deal Economics (Estimates)</h2>' + tbl;
      if (/^Liquidity Check/.test(s.t)) {
        var ok = function(v) {
          return x.liq ? (v <= x.liq ? ' <span class="pos">OK</span>' : ' <span class="neg">SHORT</span>') : ""
        };
        var R = 'style="text-align:right;white-space:nowrap"';
        s.el.innerHTML = '<h2>Liquidity Check</h2><table><thead><tr><th></th><th style="text-align:right">70%</th><th style="text-align:right">75%</th></tr></thead><tbody>' +
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
    // Deal Report level: the chart at the asking price.
    applyChart(doc, x, deal(x, .70, x.P), deal(x, .75, x.P), false);
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
      adhoc: g("daAdhoc", 1000)
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
      F = fees(),
      k = .015 + F.bo,
      fx = F.bc;
    var T = tax(doc, P);
    var sz = function(a) {
      var L = Math.round(Math.min(a * arv, P + R));
      var cc = Math.round(k * L + fx);
      var rs = Math.round(L * .11 / 2 + T.t / 2);
      return {
        L: L,
        cc: cc,
        rs: rs,
        close: Math.max(0, Math.round(P + R + cc - L)),
        cash: Math.max(0, Math.round(P + R + cc - L)) + rs
      }
    };
    var s70 = sz(.70),
      s75 = sz(.75);
    return {
      arv: arv,
      n: n,
      P: P,
      R: R,
      F: F,
      T: T,
      l70: s70.L,
      l75: s75.L,
      cc70: s70.cc,
      cc75: s75.cc,
      rs70: s70.rs,
      rs75: s75.rs,
      c70: s70.cash,
      c75: s75.cash,
      k70: s70.close,
      k75: s75.close,
      liq: num(d.borrowerLiquidity),
      addr: d.propertyAddress + ", " + d.city + ", " + d.state + " " + d.zip
    }
  }

  function profit(html, d) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var x = nums(doc, d);
    if (!x.arv) return html;
    var x0 = x,
      recP = Math.max(0, Math.round(.70 * x.arv - x.R));

    function calc(x) {
      var L = x.l75,
        cc = x.cc75,
        tx = x.T.t,
        ins = 3000,
        util = 200,
        mo = 6;
      var hold = Math.round(L * .11 * mo / 12 + tx * mo / 12 + ins * mo / 12 + util * mo),
        sell = Math.round(.07 * x.arv);
      var fp = Math.round(x.arv - sell - x.P - x.R - cc - hold),
        fcash = Math.max(1, Math.round(x.P + x.R + cc + hold - L)),
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
        why = "At this purchase price the sale does not clear a 10% margin and the rent does not cover a refinance at a 1.20 DSCR. The deal needs a lower price, see the ACP Recommended Offer above."
      }
      return {
        L: L,
        cc: cc,
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
      })));
    var L = A.L,
      cc = A.cc,
      tx = A.tx,
      ins = A.ins,
      util = A.util,
      mo = A.mo,
      hold = A.hold,
      sell = A.sell,
      fp = A.fp,
      fcash = A.fcash,
      froi = A.froi,
      fann = A.fann,
      fmargin = A.fmargin,
      rIn = A.rIn,
      rent = A.rent,
      rr = A.rr,
      refi = A.refi,
      rcost = A.rcost,
      cashOut = A.cashOut,
      left = A.left,
      egi = A.egi,
      opex = A.opex,
      noi = A.noi,
      r = A.r,
      n = A.n,
      pi = A.pi,
      cf = A.cf,
      dscr = A.dscr,
      coc = A.coc,
      flipOK = A.flipOK,
      rentOK = A.rentOK,
      rec = A.rec,
      why = A.why;
    var pc = function(z) {
        return (Math.round(z * 1000) / 10).toFixed(1) + "%"
      },
      m = function(z) {
        return z < 0 ? "-" + usd(-z) : usd(z)
      };
    var sec = doc.createElement("div");
    sec.className = "sec";
    sec.innerHTML = '<h2>Profitability Estimate</h2><p style="margin:0 0 8px"><b>Based on the ACP recommended purchase price of ' + usd(recP) + '.</b></p><p style="margin:0 0 12px;padding:10px 12px;background:#eef6ee;border:1px solid #9cc79c;border-radius:6px"><b>ACP recommendation: ' + rec + '.</b> ' + why + '</p><table><tr><th></th><th>Flip</th><th>Rent (refinance and hold)</th></tr>' + [
      ["Sale price / after-repair value", usd(x.arv), usd(x.arv)],
      ["Selling costs (7% of sale)", usd(sell), "-"],
      ["Holding costs, " + mo + " months (interest, taxes, insurance, utilities)", usd(hold), usd(hold)],
      ["Estimated profit", '<b>' + m(fp) + '</b>', "-"],
      ["Cash invested", usd(fcash), usd(fcash)],
      ["Refinance loan (75% of ARV)", "-", usd(refi)],
      ["Cash back at refinance (after payoff and 2% costs)", "-", m(cashOut)],
      ["Cash left in the deal", "-", left > 0 ? usd(left) : "None"],
      ["Monthly rent" + (rIn ? "" : " (0.8% of ARV, verify with rent comps)"), "-", usd(rent)],
      ["Net operating income / month (5% vacancy, 8% maintenance, 8% management)", "-", m(Math.round(noi))],
      ["Principal and interest / month (" + (rr * 100) + "%, 30 years)", "-", usd(Math.round(pi))],
      ["Cash flow / month", "-", '<b>' + m(Math.round(cf)) + '</b>'],
      ["DSCR (NOI / P&amp;I)", "-", (Math.round(dscr * 100) / 100).toFixed(2)],
      ["Annual cash-on-cash", "-", coc === null ? "Infinite, no cash left in" : pc(coc)]
    ].map(function(r) {
      return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>"
    }).join("") + '</table><p class="muted" style="margin-top:8px">Estimates use the repairs in this report (' + usd(x.R) + '), a loan of ' + usd(L) + ' (up to 75% of ARV, cut to need), ' + usd(cc) + ' of lender closing costs paid at closing, annual taxes of ' + usd(tx) + ', insurance of ' + usd(ins) + ' a year and ' + usd(util) + ' a month in utilities. Recommendation rule: flip when the sale clears a 10% margin on ARV; rent when the rent covers the refinance at a 1.20 DSCR; when both work, the one with the better return on cash. Not a commitment to lend.</p><p class="muted" style="margin-top:6px">At the seller&#39;s asking price of ' + usd(x0.P) + ': flip profit ' + m(S.fp) + ' (' + pc(S.fmargin) + ' margin on ARV, ' + usd(S.fcash) + ' cash invested); rental cash flow ' + m(Math.round(S.cf)) + ' a month (DSCR ' + (Math.round(S.dscr * 100) / 100).toFixed(2) + '), ' + (S.left > 0 ? usd(S.left) : 'no cash') + ' left in after refinancing. ACP recommendation at that price: ' + S.rec + '.</p>';
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
    var bo = x.F.bo,
      bc = x.F.bc,
      adhoc = x.F.adhoc;
    var rp = recPrices(x),
      rec = rp.p70,
      walk = rp.p75;
    var D70 = deal(x, .70, rec),
      D75 = deal(x, .75, walk),
      L70 = D70.L,
      L75 = D75.L,
      cc70 = D70.cc,
      cc75 = D75.cc;
    var sec = doc.createElement("div");
    sec.className = "sec";
    sec.innerHTML = '<h2>ACP Recommended Offer</h2><table class="kv"><tr><td>Recommended offer</td><td><b>' + usd(rec) + '</b></td></tr><tr><td>Walk-away price</td><td><b>' + usd(walk) + '</b></td></tr></table><p class="muted" style="margin-top:10px">Recommended offer = 70% of ARV (' + usd(L70) + ') less repairs (' + usd(x.R) + '). Walk-away = 75% of ARV (' + usd(L75) + ') less repairs. Lender closing costs (estimated ' + usd(cc70) + ' at 70%, ' + usd(cc75) + ' at 75%: lender points 1.5%, broker ' + (bo * 100) + '% + ' + usd(bc) + ') and third-party costs (appraisal, survey, feasibility study, title policy, etc.) are paid at closing and cannot be included in the loan.</p><p>Phone walkthrough: call or text 936-522-8951 to schedule.</p>';
    applyChart(doc, x, deal(x, .70, rec), deal(x, .75, walk), true);
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
    if (FULL && arv) P = Math.max(0, Math.round(.70 * arv - R));
    var f = num(document.getElementById("daFico").value),
      e = num(document.getElementById("daExp").value),
      adhoc = num(document.getElementById("daAdhoc").value),
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
          ["purchase/rehab advance", p.pp * P + p.rp * R],
          ["loan-to-cost", p.ltc * (P + R)],
          [Math.round(a * 100) + "% of ARV", a * arv],
          ["program maximum", p.max]
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
        tp = .015 * L + adhoc,
        eq = P + R - L,
        rs = L * .11 / 2 + T.t / 2,
        cash = eq + lc + bf + tp + rs;
      var liq = Math.round(L * .11 / 2 + T.t / 2 + R / 3);
      var due = Math.max(0, Math.round(eq)) + lc + bf;
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
          ["Lender Closing Costs (lender + broker; third-party costs such as appraisal, survey, feasibility study and title policy not included)", function(o) {
            return usd(o.lc + o.bf)
          }],
          ["<b>Cash Due at Closing</b> (third-party costs additional)", function(o) {
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
  function tiers(html, lvl) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var all = secs(doc);
    if (!all.length) return html;
    var parent = all[0].el.parentNode;
    var groups = [
      ["Part 1 &mdash; Basic Deal Summary (Free)", [/^Property Snapshot/, /^ARV Analysis/]],
      ["Part 2 &mdash; Deal Report ($49.99)", [/^Repair Estimate|^Estimated Repairs/, /^Deal Economics/, /^Liquidity Check/, /^Financing Options/].concat(lvl === "full" ? [] : [/^Property Record/])],
      ["Part 3 &mdash; Full Package ($149.99)", [/^Comparable Sales/, /^ACP Recommended Offer/, /^Profitability Estimate/, /^Property Record/, /^Pending Exhibits/]]
    ];
    if (lvl !== "full") groups.pop();
    var anchor = null;
    all.forEach(function(s) {
      if (/^Executive Summary/.test(s.t)) anchor = s.el
    });
    var used = [];
    var foot = doc.querySelector(".foot");
    var put = function(node) {
      if (anchor) anchor.parentNode.insertBefore(node, anchor.nextSibling);
      else if (foot && foot.parentNode === parent) parent.insertBefore(node, foot);
      else parent.appendChild(node);
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