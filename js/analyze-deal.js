(function(){
var f=document.getElementById("f"),ld=document.getElementById("ld"),er=document.getElementById("err");
var PASS="b029eed3f2094d8bdc6d1ae9b9c6fa2d4a840084fdcc649533c9bc5a34882bc3";
var OWNER=false;try{OWNER=localStorage.getItem("acpOwner")==="1"}catch(e){}
var res=document.createElement("div");res.id="da-res";er.parentNode.insertBefore(res,er.nextSibling);
var ow=document.createElement("p");ow.style.cssText="text-align:right;font-size:12px;margin:6px 24px 16px";
ow.innerHTML=OWNER?'Owner mode &middot; <a href="#" id="daOut">sign out</a>':'<a href="#" id="daIn" style="color:#9aa3ad">Owner sign-in</a>';
res.parentNode.appendChild(ow);
if(OWNER){var sb=f.querySelector(".calc-submit");var lv=document.createElement("div");lv.className="calc-field";lv.innerHTML='<label for="daLevel">Report level</label><select id="daLevel"><option value="summary">$49.99 Summary Report</option><option value="full">Full Report</option></select>';sb.parentNode.insertBefore(lv,sb)}
document.addEventListener("click",async function(e){
if(e.target.id==="daOut"){e.preventDefault();try{localStorage.removeItem("acpOwner")}catch(x){}location.reload()}
if(e.target.id==="daIn"){e.preventDefault();var pw=prompt("Owner password");if(!pw)return;var t=await sha(await sha("acp-prospects:"+pw));if(t===PASS){try{localStorage.setItem("acpOwner","1")}catch(x){}location.reload()}else{er.innerHTML="<div class='da-err'>Wrong password</div>"}}
if(e.target.id==="daMail"){e.preventDefault();location.href=e.target.getAttribute("data-href")}
});
f.addEventListener("submit",async function(e){e.preventDefault();er.innerHTML="";res.innerHTML="";f.style.display="none";ld.style.display="block";
var d={propertyAddress:v("propertyAddress"),city:v("city"),state:v("state"),zip:v("zip"),purchasePrice:v("purchasePrice"),repairBudget:v("repairBudget"),arvEstimate:v("arvEstimate"),borrowerLiquidity:v("borrowerLiquidity"),borrowerName:v("borrowerName"),borrowerEmail:v("borrowerEmail"),borrowerPhone:v("borrowerPhone")};
try{var r=await fetch("/deal-analyzer/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){var j=await r.json();throw new Error(j.error||"Report failed")}
var raw=await r.text();
if(!OWNER){res.innerHTML=basic(raw,d);ld.style.display="none";f.style.display="block";res.scrollIntoView({behavior:"smooth",block:"start"});return}
var lvl=document.getElementById("daLevel").value;var html=addBar(lvl==="summary"?summary(raw):raw,d.borrowerEmail);
var w=window.open("","_blank");if(w){w.document.write(html);w.document.close()}else{document.open();document.write(html);document.close()}}
catch(ex){er.innerHTML="<div class='da-err'>"+esc(ex.message)+"</div>"}ld.style.display="none";f.style.display="block"});
function v(id){return document.getElementById(id).value}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
async function sha(s){var b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,"0")}).join("")}
function secs(doc){return Array.from(doc.querySelectorAll(".sec")).map(function(s){var h=s.querySelector("h2");return{el:s,t:h?h.textContent.trim():""}})}
function basic(raw,d){var doc=new DOMParser().parseFromString(raw,"text/html");var kv={};
doc.querySelectorAll("table.kv tr").forEach(function(tr){var c=tr.querySelectorAll("th,td");if(c.length>=2&&!(c[0].textContent.trim() in kv))kv[c[0].textContent.trim()]=c[1].textContent.trim()});
var arv="";secs(doc).forEach(function(s){if(/^ARV Analysis/.test(s.t)){var m=s.el.textContent.match(/\$[\d,]+/);if(m)arv=m[0]}});
var addr=(kv["Address"]||d.propertyAddress)+", "+(kv["City / State / Zip"]||(d.city+", "+d.state+" "+d.zip));
var rows=[["Property",addr],["Subdivision",kv["Subdivision"]],["Beds / Baths",kv["Beds / Baths"]],["Sq Ft",kv["Sq Ft"]],["Year Built",kv["Year Built"]],["Estimated ARV",arv]].filter(function(x){return x[1]&&x[1]!=="-"});
var pay=["PayPal: owner@acp-lending.com","Zelle: 936-522-8951","Card: call or text 936-522-8951 for a secure Chase payment link"];
var note="Include the property address with your payment. The $49.99 report is credited back at closing if your loan closes with ACP, and is generally delivered within 30 to 60 minutes, 9 a.m. to 5 p.m. Central.";
var body="Basic Deal Summary\n\n"+rows.map(function(x){return x[0]+": "+x[1]}).join("\n")+"\n\nGet the $49.99 Summary Report: cash to close at 70% and 75% of ARV, a liquidity check and the property record.\n"+pay.join("\n")+"\n"+note+"\n\nACP Real Estate Lending | 936-522-8951 | acp-lending.com";
var href="mailto:"+encodeURIComponent(d.borrowerEmail||"")+"?cc=steve%40acp-lending.com&subject="+encodeURIComponent("Basic Deal Summary - "+addr)+"&body="+encodeURIComponent(body);
var td="padding:8px 10px;border-bottom:1px solid #e6e8eb;text-align:left;vertical-align:top";
return '<div style="margin:0 24px 8px;border:1px solid #e6e8eb;border-top:3px solid var(--gold);border-radius:8px;padding:18px 20px;background:#fff"><h3 style="margin:0 0 10px">Basic Deal Summary</h3><table style="width:100%;border-collapse:collapse">'+rows.map(function(x){return '<tr><th style="'+td+';width:38%">'+esc(x[0])+'</th><td style="'+td+'">'+esc(x[1])+'</td></tr>'}).join("")+'</table><p style="margin:14px 0"><a href="#" id="daMail" class="btn" data-href="'+esc(href)+'">Email This Summary</a></p><h4 style="margin:18px 0 6px">Get the $49.99 Summary Report</h4><p style="margin:0 0 8px">Cash to close at 70% and 75% of ARV, a liquidity check and the property record.</p><ul style="margin:0 0 8px 18px">'+pay.map(function(p){return "<li>"+esc(p)+"</li>"}).join("")+'</ul><p style="margin:0;font-size:14px">'+esc(note)+'</p></div>'}
function summary(raw){var doc=new DOMParser().parseFromString(raw,"text/html");
secs(doc).forEach(function(s){if(/^(Comparable Sales|Pending Exhibits)/.test(s.t))s.el.remove();
if(/^Deal Economics/.test(s.t))s.el.querySelectorAll("tr").forEach(function(tr){if(/^\s*Max Offer/.test(tr.textContent))tr.remove()});
if(/^Executive Summary/.test(s.t))s.el.querySelectorAll("p,div").forEach(function(p){if(p.children.length)return;p.textContent=(p.textContent.match(/[^.]+(\.\d[^.]*)*\.?/g)||[]).filter(function(x){return!/maximum offer|ceiling/i.test(x)}).join("").trim()});
if(/^Property Record/.test(s.t)){s.el.querySelectorAll("h3").forEach(function(h){if(/Recent Transactions/.test(h.textContent)){var n=h.nextElementSibling;h.remove();if(n&&n.tagName==="TABLE")n.remove()}});s.el.querySelectorAll("a").forEach(function(a){if(/Google Maps/.test(a.textContent))a.remove()})}});
doc.querySelectorAll("img").forEach(function(i){var p=i.parentElement;(p&&!p.classList.contains("sec")&&p.tagName==="DIV"?p:i).remove()});
return "<!doctype html>"+doc.documentElement.outerHTML}
function addBar(html,to){var bs="background:#c9a24a;color:#0f172a;border:0;border-radius:4px;padding:9px 16px;font:600 14px Arial,sans-serif;cursor:pointer";var bar='<style>@media print{.acp-bar{display:none!important}}</style><div class="acp-bar" style="position:sticky;top:0;z-index:99;background:#0f172a;padding:10px 16px;display:flex;gap:10px;justify-content:flex-end"><button type="button" id="acpPdf" style="'+bs+'">Save as PDF</button><button type="button" id="acpMail" style="'+bs+'">Email Analysis</button></div>';var js='<script>(function(){var to='+JSON.stringify(to||"").replace(/</g,"\\u003c")+';document.getElementById("acpPdf").onclick=function(){window.print()};document.getElementById("acpMail").onclick=function(){var b=document.querySelector(".acp-bar");b.style.display="none";var t=document.body.innerText.replace(/[ \\t]+\\n/g,"\\n").replace(/\\n{3,}/g,"\\n\\n").trim();b.style.display="flex";if(t.length>1800)t=t.slice(0,1800)+"\\n\\n(Full report attached as PDF.)";location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(document.title)+"&body="+encodeURIComponent(t)}})()<\/script>';html=/<body[^>]*>/i.test(html)?html.replace(/<body[^>]*>/i,function(m){return m+bar}):bar+html;return /<\/body>/i.test(html)?html.replace(/<\/body>/i,js+"</body>"):html+js}
})();
