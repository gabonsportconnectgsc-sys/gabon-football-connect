/* GFC-UX-FIX.JS v1 - tuile Formateurs, defilement vers la liste de l'annuaire, textes clairs sur la pelouse. */
(function (w, d) {
  'use strict';
  function card(role) {
    var i = d.querySelector('.stat-wm[data-wm-role="' + role + '"]');
    return i ? i.closest('.stat-card') : null;
  }
  function fixFormateurs() {
    var f = card('formateur');
    var ref = card('arbitre') || card('entraineur') || card('federation');
    if (!f || !ref || ref === f || ref.offsetParent === null) return;
    var r = ref.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var wd = Math.round(r.width) + 'px', ht = Math.round(r.height) + 'px';
    f.style.setProperty('grid-column', '1 / -1', 'important');
    f.style.setProperty('justify-self', 'center', 'important');
    f.style.setProperty('margin', '0', 'important');
    f.style.setProperty('max-width', 'none', 'important');
    f.style.setProperty('width', wd, 'important');
    f.style.setProperty('min-height', ht, 'important');
    f.style.setProperty('height', ht, 'important');
  }
  var LIST = ['acteurs sportifs', 'joueurs', 'encadrement', 'officiels', 'organisations', 'organisation', 'instance', 'instances', 'communauté', 'autres acteurs'];
  var SKIP = '.stat-card,button,.card,input,select,textarea,option,label,a';
  function norm(s) { return String(s || '').replace(/[^A-Za-zÀ-ÿ ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function lightTexts() {
    var els = d.querySelectorAll('div,span,h2,h3,h4,p');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.children.length > 2) continue;
      var t = el.textContent;
      if (!t || t.length > 140) continue;
      var ok = false;
      if (t.length <= 40 && LIST.indexOf(norm(t)) >= 0) ok = true;
      else if (el.children.length === 0 && t.trim().indexOf('Dates issues de sources publiques') === 0) ok = true;
      if (!ok || el.closest(SKIP)) continue;
      el.style.setProperty('color', '#F4FFE8', 'important');
      el.style.setProperty('text-shadow', '0 1px 4px rgba(0,0,0,.9)', 'important');
      el.style.setProperty('opacity', '1', 'important');
    }
  }
  function scrollToList() {
    var g = d.getElementById('actors-grid');
    if (!g) { var s = d.getElementById('annuaire-search'); g = s ? s.parentElement : null; }
    if (!g || g.offsetParent === null) return;
    g.style.scrollMarginTop = '80px';
    g.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  var orig = w.filterActors;
  if (typeof orig === 'function') {
    w.filterActors = function () {
      var r = orig.apply(this, arguments);
      setTimeout(scrollToList, 250);
      return r;
    };
  }
  function run() { try { fixFormateurs(); lightTexts(); } catch (e) { console.warn('[GFC] ux-fix', e); } }
  run();
  w.addEventListener('load', run);
  w.addEventListener('resize', run);
  setTimeout(run, 600);
  setTimeout(run, 1800);
  setInterval(run, 3000);
})(window, document);
