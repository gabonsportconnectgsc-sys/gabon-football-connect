/* GSC-LIGUE-ADMIN.JS v1 — entrée « Ligues » dans la navigation admin (licenciés + compétitions à valider) */
(function (w) {
  'use strict';
  var tries = 0;
  function inject() {
    if (document.getElementById('nav-ligues-valid')) return true;
    var after = document.getElementById('nav-effectifs') || document.getElementById('nav-liaison');
    if (!after || !w.GSCLigueManager) return false;
    var btn = document.createElement('button');
    btn.className = 'nav-item'; btn.id = 'nav-ligues-valid';
    btn.innerHTML = '<span class="nav-icon">🏆</span><span>Ligues à valider</span>';
    after.parentNode.insertBefore(btn, after.nextSibling);
    btn.addEventListener('click', function () {
      var h = w.GSCLigueManager._h;
      var d = h.ov('<h3>🏆 Ligues : validation</h3><div class="glm-row"><button class="glm-btn" id="gla-l">👥 Licenciés</button><button class="glm-btn" id="gla-c">🏆 Compétitions</button></div><div class="glm-row"><button class="glm-btn g" id="gla-x">Fermer</button></div>');
      d.querySelector('#gla-x').onclick = function () { d.remove(); };
      d.querySelector('#gla-l').onclick = function () { d.remove(); w.GSCLigueManager.adminOpen(); };
      d.querySelector('#gla-c').onclick = function () { d.remove(); w.GSCLigueCompetitions.adminOpen(); };
      var sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
      var ov = document.getElementById('sidebar-overlay'); if (ov) ov.classList.remove('open');
    });
    return true;
  }
  var t = setInterval(function () { if (inject() || ++tries > 60) clearInterval(t); }, 500);
})(window);
