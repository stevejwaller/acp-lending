(function () {
'use strict';
var PAIRS = [['r-maxLoan', 'h-maxLoan'], ['r-cashAtClosing', 'h-cashAtClosing'], ['r-monthlyCarry', 'h-monthlyCarry']];
var hero = document.getElementById('calc-hero');
if (!hero) { return; }
function sync() {
var any = false;
for (var i = 0; i < PAIRS.length; i++) {
var src = document.getElementById(PAIRS[i][0]);
var dst = document.getElementById(PAIRS[i][1]);
if (!src || !dst) { continue; }
var t = (src.textContent || '').trim();
dst.textContent = t || '—';
if (t && t !== '—') { any = true; }
}
if (any) { hero.hidden = false; }
}
var obs = new MutationObserver(sync);
for (var j = 0; j < PAIRS.length; j++) {
var el = document.getElementById(PAIRS[j][0]);
if (el) { obs.observe(el, { childList: true, characterData: true, subtree: true }); }
}
function revealMissing() {
var flagged = document.querySelectorAll('#calc-form .acp-missing');
for (var i = 0; i < flagged.length; i++) {
var d = flagged[i].closest('details.calc-more');
if (d && !d.open) { d.open = true; }
}
}
window.addEventListener('click', function (e) {
var t = e.target;
if (!t || !t.id) { return; }
if (t.id === 'calc-recalc-btn' || t.id === 'fr-run-btn') {
setTimeout(revealMissing, 60);
setTimeout(sync, 140);
}
}, true);
var reopen = [];
window.addEventListener('beforeprint', function () {
reopen = [];
var all = document.querySelectorAll('details.calc-more');
for (var i = 0; i < all.length; i++) {
if (!all[i].open) { reopen.push(all[i]); all[i].open = true; }
}
});
window.addEventListener('afterprint', function () {
for (var i = 0; i < reopen.length; i++) { reopen[i].open = false; }
reopen = [];
});
sync();
})();
