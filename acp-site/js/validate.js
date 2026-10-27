(function(){
  var FLIP=['purchasePrice','repairsBudget','arvEstimate','arvPct','interestRate','originationPct','processingFee','appraisalFee','creditReportFee','titleInsurance','escrowFee','recordingFee','hoaTransferFee','surveyFee','misc1Fee','misc2Fee','earnestCredit','brokerOrigPct','brokerClosingFlat','monthsToSell','sellingCostsPct','annualTaxes','annualInsurance'];
  var RENT=FLIP.concat(['fr-rent','fr-months','fr-rate','fr-ltv','fr-term','fr-refiCost','fr-vac','fr-maint','fr-mgmt']);
  var REQ={'calc-recalc-btn':FLIP,'fr-run-btn':RENT};
  var MARK='acp-missing';
  function blank(el){return !el||String(el.value==null?'':el.value).trim()===''}
  function box(btn){
    var id='acp-req-msg-'+btn.id,m=document.getElementById(id);
    if(!m){m=document.createElement('p');m.id=id;m.setAttribute('role','alert');
      m.style.cssText='margin:10px 0 0;color:#8a1c1c;font-size:14px;font-weight:600;line-height:1.4';
      btn.parentNode.insertBefore(m,btn.nextSibling);}
    return m;
  }
  function flag(el,on){
    if(on){el.classList.add(MARK);el.style.borderColor='#c0392b';el.style.background='#fff6f6';}
    else{el.classList.remove(MARK);el.style.borderColor='';el.style.background='';}
  }
  function vnum(id){var el=document.getElementById(id);if(!el)return 0;var n=parseFloat(String(el.value).replace(/[^0-9.\-]/g,''));return isNaN(n)?0:n;}
  function range(){
    var pctEl=document.getElementById('arvPct'),arvEl=document.getElementById('arvEstimate');
    var pct=vnum('arvPct'),arv=vnum('arvEstimate'),cost=vnum('purchasePrice')+vnum('repairsBudget');
    if(pctEl&&pct>75){return {el:pctEl,msg:'The ARV advance runs 70-75 percent. Enter 75 or less.'};}
    if(arvEl&&cost>0&&arv>0&&(pct/100)*arv>cost*10){return {el:arvEl,msg:'Check the After-Repair Value: that ARV is more than ten times the project cost. Look for an extra zero.'};}
    return null;
  }
  function dashOut(){var a=document.getElementById('r-arvApplied');if(a)a.textContent='\u2014';var n=document.getElementById('r-arvAppliedNote');if(n)n.textContent='';var b=document.getElementById('r-maxLoan');if(b)b.textContent='\u2014';}
  document.addEventListener('input',function(ev){
    var t=ev.target;if(!t||!t.id)return;
    if(['arvPct','arvEstimate','purchasePrice','repairsBudget'].indexOf(t.id)<0)return;
    var btn=document.getElementById('calc-recalc-btn');if(!btn)return;
    var m=box(btn),r=range();
    if(r){dashOut();flag(r.el,true);m.textContent=r.msg;m.style.display='';m.setAttribute('data-range','1');}
    else if(m.getAttribute('data-range')==='1'){m.textContent='';m.style.display='none';m.removeAttribute('data-range');}
  });
  function check(btn){
    var ids=REQ[btn.id]||[],miss=[];
    ids.forEach(function(id){var el=document.getElementById(id);if(!el)return;
      if(blank(el)){miss.push(el);flag(el,true);}else{flag(el,false);}});
    var m=box(btn);
    if(miss.length){
      m.textContent='Fill in the '+miss.length+' highlighted field'+(miss.length>1?'s':'')+'. A blank entry is counted as zero, which makes the deal look better than it is.';
      m.style.display='';
      try{miss[0].focus();miss[0].scrollIntoView({block:'center',behavior:'smooth'});}catch(e){}
      return false;
    }
    var rng=range();
    if(rng){dashOut();flag(rng.el,true);m.textContent=rng.msg;m.style.display='';m.setAttribute('data-range','1');return false;}
    m.removeAttribute('data-range');
    m.textContent='';m.style.display='none';return true;
  }
  document.addEventListener('click',function(ev){
    var t=ev.target&&ev.target.closest?ev.target.closest('#calc-recalc-btn,#fr-run-btn'):null;
    if(!t)return;
    if(!check(t)){ev.preventDefault();ev.stopImmediatePropagation();}
  },true);
  document.addEventListener('input',function(ev){
    var t=ev.target;
    if(t&&t.classList&&t.classList.contains(MARK)&&String(t.value).trim()!=='')flag(t,false);
  },true);
})();
