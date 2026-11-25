/* GSC-EXPERT.JS v1 - categorie Experts : specialites a cocher, donnees du formulaire, styles. */
(function (w, d) {
  'use strict';
  var SPEC = [['tactique', 'Entraînement et tactique'], ['physique', 'Préparation physique'], ['mental', 'Préparation mentale et psychologie du sport'],
    ['medecine', 'Médecine du sport et kinésithérapie'], ['nutrition', 'Nutrition sportive'], ['arbitrage', 'Arbitrage'],
    ['management', 'Management et administration sportive'], ['evenements', 'Organisation d\'événements et de compétitions'],
    ['formation', 'Formation d\'éducateurs et d\'entraîneurs'], ['detection', 'Détection et recrutement de talents'],
    ['jeunes', 'Football des jeunes et académies'], ['futsal', 'Futsal et football féminin'], ['analyse', 'Analyse vidéo et statistiques'],
    ['communication', 'Communication, médias et marketing sportif'], ['droit', 'Droit du sport'], ['infrastructures', 'Infrastructures et terrains'],
    ['securite', 'Sécurité des événements'], ['autre', 'Autre (à préciser)']];
  var ZONES = [['ville', 'Ma ville'], ['province', 'Ma province'], ['national', 'Tout le Gabon'], ['ligne', 'En ligne']];
  var css = '.gsc-chk-grid{display:grid;grid-template-columns:1fr;gap:6px}' +
    '.gsc-chk{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;cursor:pointer;background:#fff;color:#0f172a}' +
    '.gsc-chk input{width:18px;height:18px;flex:none}' +
    '.role-badge.expert{background:#0e7490;color:#fff}.badge-expert{background:#cffafe;color:#155e75}.acr-badge.expert{background:#cffafe;color:#155e75}' +
    '.actor-type-dot.expert{background:linear-gradient(135deg,#0e7490,#155e75)}' +
    '.actor-filter-btn[data-type="expert"]{border-color:#0e7490;color:#155e75;background:rgba(14,116,144,.07)}' +
    '.actor-filter-btn[data-type="expert"].active{background:linear-gradient(135deg,#0e7490,#155e75);color:#fff}' +
    '.stats-grid .stat-card:has(.stat-wm[data-wm-role="expert"]){--bc:#22D3EE}' +
    '.stats-grid .stat-card:has(#stat-total-experts){min-height:170px}';
  var st = d.createElement('style'); st.id = 'gsc-expert-css'; st.textContent = css; (d.head || d.documentElement).appendChild(st);
  function val(id) { var e = d.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function lines(id, max) { return val(id).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, max || 15); }
  function checked(name) { return [].slice.call(d.querySelectorAll('input[name="' + name + '"]:checked')).map(function (e) { return e.value; }); }
  function data() {
    var sp = checked('a-exp-spec'), dispo = !!(d.getElementById('a-exp-dispo') && d.getElementById('a-exp-dispo').checked);
    return {
      specialites: sp, autreSpecialite: sp.indexOf('autre') >= 0 ? val('a-exp-autre') : '',
      niveauExperience: val('a-exp-niveau'), niveauDiplome: val('a-exp-diplome'), titrePrincipal: val('a-exp-titre'),
      resumeParcours: val('a-exp-resume').slice(0, 600), diplomes: lines('a-exp-diplomes'), postes: lines('a-exp-postes'),
      participations: lines('a-exp-particip'), nbParticipations: val('a-exp-nbpart'), pratiquant: val('a-exp-pratique'), disponibleFormation: dispo, zonesFormation: dispo ? checked('a-exp-zone') : [],
      liensSociaux: val('a-exp-liens')
    };
  }
  function label(k) { for (var i = 0; i < SPEC.length; i++) if (SPEC[i][0] === k) return SPEC[i][1]; return k; }
  function fill(boxId, list, name) {
    var b = d.getElementById(boxId);
    if (!b || b.firstChild) return;
    b.className = 'gsc-chk-grid';
    list.forEach(function (s) {
      var l = d.createElement('label'); l.className = 'gsc-chk';
      l.innerHTML = '<input type="checkbox" name="' + name + '" value="' + s[0] + '"><span>' + s[1] + '</span>';
      b.appendChild(l);
    });
  }
  function build() {
    if (!d.getElementById('a-exp-spec-box')) return;
    fill('a-exp-spec-box', SPEC, 'a-exp-spec'); fill('a-exp-zone-box', ZONES, 'a-exp-zone');
    var b = d.getElementById('a-exp-spec-box'), dp = d.getElementById('a-exp-dispo');
    if (b && !b.__gsc) { b.__gsc = 1; b.addEventListener('change', function () { var a = d.getElementById('a-exp-autre-fg'); if (a) a.style.display = checked('a-exp-spec').indexOf('autre') >= 0 ? '' : 'none'; }); }
    if (dp && !dp.__gsc) { dp.__gsc = 1; dp.addEventListener('change', function () { var z = d.getElementById('a-exp-zone-fg'); if (z) z.style.display = dp.checked ? '' : 'none'; }); }
  }
  w.GSC_EXPERT = { SPEC: SPEC, ZONES: ZONES, data: data, label: label };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', build); else build();
  setTimeout(build, 500);
})(window, document);
