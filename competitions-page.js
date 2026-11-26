/* ==========================================================
   GSC — Page publique « Compétitions » (remplace l'onglet Sport)
   Fichier dédié : js/competitions-page.js
   Dépend de : timeline-competitions.js, competitions-data.js, competitions-service.js
   Usage :
     GSCCompetitionsPage.mount('#page-competitions');
   ========================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(ts) {
    var d = new Date(ts), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
  }

  function resume(liste) {
    var n = global.GSCTimeline._interne.normaliser(liste).filter(function (c) { return c.statut !== 'annule'; });
    var now = new Date(), t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var DAY = 86400000, enCours = [], prochaine = null;
    n.forEach(function (c) {
      var actif = c.segments.some(function (s) { return s.debut <= t && t < s.fin + DAY; });
      if (actif) enCours.push(c);
      c.segments.forEach(function (s) {
        if (s.debut > t && (!prochaine || s.debut < prochaine.date)) prochaine = { date: s.debut, nom: c.nom, label: s.label };
      });
    });
    return { enCours: enCours, prochaine: prochaine };
  }

  function mount(target, options) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return null;
    var opt = options || {};
    root.classList.add('gsc-cp');
    root.innerHTML = '<div class="gsc-cp__chips" data-r="chips"></div><div data-r="tl"></div><div class="gsc-cp__foot" data-r="foot"></div>';
    var chips = root.querySelector('[data-r="chips"]');
    var tlEl = root.querySelector('[data-r="tl"]');
    var foot = root.querySelector('[data-r="foot"]');
    var tl = null;

    function afficher(liste) {
      var r = resume(liste);
      chips.innerHTML =
        '<div class="gsc-cp__chip"><b>' + r.enCours.length + '</b>en cours aujourd\'hui</div>' +
        (r.prochaine ? '<div class="gsc-cp__chip"><b>' + fmt(r.prochaine.date) + '</b>Prochaine échéance : ' + esc(r.prochaine.label || r.prochaine.nom) + '</div>' : '');
      if (!tl) tl = global.GSCTimeline.render(tlEl, liste, { moisDebut: opt.moisDebut || 9, titre: opt.titre || 'Calendrier des compétitions' });
      else tl.mettreAJour(liste);
      foot.textContent = 'Dates issues de sources publiques (presse, CAF) — susceptibles d\'évoluer. Référence du ' +
        fmt(Date.parse(global.GSCCompetitions.versionReference())) + '.';
    }

    function recharger() { return global.GSCCompetitions.charger().then(afficher); }
    var maj = document.createElement('div');
    maj.style.cssText = 'margin-top:14px;text-align:center';
    maj.innerHTML = '<button type="button" style="display:none;width:100%;padding:18px;border:0;border-radius:16px;background:#00854f;color:#fff;font-size:18px;font-weight:800;box-shadow:0 6px 16px rgba(0,133,79,.35);cursor:pointer">🔄 ACTUALISER LE CALENDRIER</button><div role="status" style="margin-top:8px;font-size:14px;font-weight:600;color:#334155"></div>';
    root.appendChild(maj);
    var btn = maj.firstChild, etat = maj.lastChild;
    function estAdmin() {
      var u = (typeof userProfile !== 'undefined' && userProfile) || global.userProfile;
      return !!u && u.role === 'admin';
    }
    function montrer() { btn.style.display = estAdmin() ? 'block' : 'none'; }
    montrer(); setInterval(montrer, 1000);
    function lireEnLigne() {
      return new Promise(function (ok, ko) {
        var s = document.createElement('script');
        s.src = 'competitions-data.js?maj=' + Date.now();
        s.onload = function () { s.remove(); ok(); };
        s.onerror = function () { s.remove(); ko(new Error('données en ligne inaccessibles')); };
        document.head.appendChild(s);
      });
    }
    function garderFootball() {
      var ref = global.GSC_COMPETITIONS_REFERENCE;
      if (!ref || !ref.competitions) throw new Error('données de compétitions introuvables');
      ref.competitions = ref.competitions.filter(function (c) { return String(c.discipline || '').toLowerCase() === 'football'; });
      if (!ref.competitions.length) throw new Error('aucune compétition de football en ligne');
    }
    btn.onclick = function () {
      if (!estAdmin()) return;
      if (global.navigator && global.navigator.onLine === false) { etat.textContent = '⚠️ Connexion Internet requise.'; return; }
      btn.disabled = true; btn.style.opacity = '.6'; etat.textContent = '⏳ Mise à jour en cours…';
      lireEnLigne().then(function () {
        garderFootball();
        if (!global.GSCCompetitions.connecte()) global.GSCCompetitions.init({});
        return global.GSCCompetitions.synchroniser();
      }).then(function (r) {
        afficher(r.liste);
        etat.textContent = '✅ Calendrier football à jour : ' + r.ajoutees + ' ajoutée(s), ' + r.misesAJour + ' actualisée(s), ' + r.total + ' au total.';
      }).catch(function (e) { etat.textContent = '❌ Échec : ' + (e.message || e); })
        .then(function () { btn.disabled = false; btn.style.opacity = '1'; });
    };
    global.GSCCompetitions.derniereSynchro && global.GSCCompetitions.derniereSynchro().then(function (d) {
      if (d && d.date && !etat.textContent) etat.textContent = 'Dernière mise à jour : ' + new Date(d.date).toLocaleDateString('fr-FR');
    });

    recharger();
    return { recharger: recharger };
  }

  global.GSCCompetitionsPage = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
