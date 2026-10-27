(function(){
  function $(id){ return document.getElementById(id); }
  function num(v){ if(v==null) return 0; var s=String(v).replace(/[^0-9.\-]/g,''); var n=parseFloat(s); return isFinite(n)?n:0; }
  function money(n){ var neg=n<0; n=Math.abs(Math.round(n)); return (neg?'-$':'$')+n.toLocaleString('en-US'); }
  function pct(n){ return (Math.round(n*10)/10).toFixed(1)+'%'; }
  function set(id,v){ var e=$(id); if(e) e.textContent=v; }
  function val(id){ var e=$(id); return e?num(e.value):0; }
  function txt(id){ var e=$(id); return e?num(e.textContent):0; }
  function compute(){
    var flipProfit=txt('p-netProfit'), flipCash=txt('p-cashInvested'), flipRoi=txt('p-roi');
    var maxLoan=txt('r-maxLoan'), cashClose=txt('r-cashAtClosing'), carry=txt('r-monthlyCarry');
    var arv=val('arvEstimate'), taxes=val('annualTaxes'), ins=val('annualInsurance'), hoa=val('annualHoa');
    var sellMonths=val('monthsToSell');
    var rent=val('fr-rent'), months=val('fr-months'), ltv=val('fr-ltv'), rate=val('fr-rate');
    var term=val('fr-term')||30, refiCost=val('fr-refiCost');
    var vac=val('fr-vac'), maint=val('fr-maint'), mgmt=val('fr-mgmt'), other=val('fr-other');
    if(!months) months=sellMonths;
    var refiLoan=arv*ltv/100;
    var cashOut=refiLoan-maxLoan-refiCost;
    var investedToRefi=cashClose+carry*months;
    var cashLeft=investedToRefi-cashOut;
    var egi=rent*(1-vac/100);
    var opex=(taxes+ins+hoa)/12 + rent*maint/100 + egi*mgmt/100 + other;
    var noi=egi-opex;
    var r=rate/100/12, n=term*12;
    var pi = (r>0&&n>0) ? refiLoan*r/(1-Math.pow(1+r,-n)) : (n>0?refiLoan/n:0);
    var cf=noi-pi;
    var dscr = pi>0 ? noi/pi : 0;
    set('fr-taxes',money(taxes)); set('fr-ins',money(ins)); set('fr-hoa',money(hoa));
    set('fr-tihMonthly',money((taxes+ins+hoa)/12));
    set('fr-flipProfit',money(flipProfit)); set('fr-flipCash',money(flipCash));
    set('fr-flipMonths', sellMonths?String(sellMonths):'\u2014');
    set('fr-flipRoi', flipCash>0?pct(flipRoi):'\u2014');
    set('fr-refiLoan',money(refiLoan)); set('fr-cashOut',money(cashOut));
    set('fr-cashLeft', cashLeft>0?money(cashLeft):'None \u2014 cash fully recovered');
    set('fr-noi',money(noi)); set('fr-pi',money(pi)); set('fr-cashflow',money(cf));
    set('fr-dscr', pi>0?(Math.round(dscr*100)/100).toFixed(2):'\u2014');
    set('fr-coc', cashLeft>0?pct(cf*12/cashLeft*100):'Infinite \u2014 no cash left in');
    var s;
    if(!rent||!rate){ s='Enter a monthly rent and a refinance rate to see the rental side.'; }
    else { s='Selling returns '+money(flipProfit)+' on '+money(flipCash)+' of cash in '+(sellMonths||months)+' months. Renting leaves '+(cashLeft>0?money(cashLeft):'no cash')+' in the deal and pays '+money(cf)+' a month at a '+(Math.round(dscr*100)/100).toFixed(2)+' DSCR.'; }
    set('fr-summary', s);
  }
  function run(){ var m=$('calc-recalc-btn'); if(m){ m.click(); setTimeout(compute,250); } else { compute(); } }
  function init(){ var b=$('fr-run-btn'); if(!b) return; b.addEventListener('click',function(e){ e.preventDefault(); run(); });
    var f=$('fr-form'); if(f) f.addEventListener('submit',function(e){ e.preventDefault(); run(); }); }
  window.__frCompute = compute; window.__frRun = run; window.__frInit = init;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
