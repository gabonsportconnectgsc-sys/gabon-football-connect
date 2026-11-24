/* gsc-ligue-effectifs : bouton « Voir les effectifs » déployable pour les ligues */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function actorOf(uid) { return (window.allActors || []).filter(function (x) { return (x.uid || x.id) === uid; })[0] || null; }
  function sec(title, n, body) {
    return '<details style="margin:6px 0;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;background:#fff;color:#0f172a"><summary style="font-weight:700;cursor:pointer">' + title + ' (' + n + ')</summary><div style="margin-top:6px;font-size:13px">' + body + '</div></details>';
  }
  function ul(arr) {
    return arr.length ? '<ul style="margin:4px 0 0 18px;padding:0">' + arr.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '<p style="margin:4px 0;color:#6b7280">—</p>';
  }
  function fd(d) { var p = String(d || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : esc(d || ''); }
  async function ligue(btn, a) {
    var panel = btn._gscLg;
    if (panel) { var op = btn.classList.toggle('open'); panel.style.display = op ? 'block' : 'none'; return; }
    panel = document.createElement('div');
    panel.style.cssText = 'margin:0 0 10px;padding:4px 0';
    panel.innerHTML = '<p style="text-align:center;margin:8px 0">Chargement…</p>';
    btn.insertAdjacentElement('afterend', panel);
    btn._gscLg = panel; btn.classList.add('open');
    var uid = a.ownerUid || a.uid || a.id, h = window.GSCLigueManager && window.GSCLigueManager._h;
    var st = null, cps = [];
    if (h) {
      try {
        var r = await h.fquery('ligueStats', [['ligueUid', '==', uid], ['public', '==', true]]);
        r.sort(function (x, y) { return String(y.data.saison).localeCompare(String(x.data.saison)); });
        if (r.length) st = r[0].data;
      } catch (e) {}
      try {
        var c = await h.fquery('ligueCompetitions', [['ligueUid', '==', uid], ['public', '==', true]]);
        c.sort(function (x, y) { return String(y.data.dateDebut || '').localeCompare(String(x.data.dateDebut || '')); });
        cps = c.map(function (x) { return x.data; });
      } catch (e) {}
    }
    var eq = {};
    cps.forEach(function (c) { (c.equipes || []).forEach(function (n) { eq[String(n).trim()] = 1; }); });
    var equipes = Object.keys(eq).sort();
    var clubs = (window.allActors || []).filter(function (x) { return x.role === 'club' && (x.ligueUid === uid || x.ligueId === uid); })
      .map(function (x) { return esc(x.nomOrganisation || x.nom || ''); });
    var nbClubs = st && st.clubs != null ? st.clubs : (a.clubsAffilies || clubs.length || 0);
    var total = st && st.total != null ? st.total : (a.licencies || 0);
    var sx = st && st.parSexe ? st.parSexe : {};
    var seen = {}, noms = clubs.concat(equipes.map(esc)).filter(function (n) { var k = String(n).toLowerCase(); if (!n || seen[k]) return false; seen[k] = 1; return true; });
    var postes = ((a.gouvernance || {}).bureau || []).map(function (m) { return esc(m.role); }).filter(Boolean);
    panel.innerHTML =
      sec('🏟️ Clubs / Équipes affiliés', nbClubs || noms.length, noms.length ? ul(noms) + (nbClubs > noms.length ? '<p style="margin:6px 0 0;color:#6b7280">' + esc(nbClubs) + ' au total, ' + noms.length + ' déjà listés.</p>' : '') : (nbClubs ? '<p style="margin:4px 0">' + esc(nbClubs) + ' club(s) / équipe(s) affilié(s)</p>' : '<p style="margin:4px 0;color:#6b7280">—</p>')) +
      sec('🎽 Licenciés', total, ((sx.M || sx.F) ? '<p style="margin:4px 0">Hommes / Femmes : ' + (sx.M || 0) + ' / ' + (sx.F || 0) + (st && st.saison ? ' · saison ' + esc(st.saison) : '') + '</p>' : '<p style="margin:4px 0;color:#6b7280">—</p>')) +
      sec('👔 Bureau exécutif', postes.length, ul(postes)) +
      sec('🏆 Compétitions', cps.length, ul(cps.map(function (c) { return '<b>' + esc(c.nom) + '</b> · ' + fd(c.dateDebut) + (c.ville ? ' · ' + esc(c.ville) : ''); })));
  }
  function install() {
    var o = window.gscToggleRosters;
    if (typeof o !== 'function') return false;
    if (o.__lg) return true;
    var f = function (btn) {
      var a = actorOf(btn.dataset.uid);
      if (a && (a.role === 'ligue' || a.typeLigue)) return ligue(btn, a);
      return o.apply(this, arguments);
    };
    f.__lg = 1; window.gscToggleRosters = f; return true;
  }
  var n = 0, iv = setInterval(function () { if (install() || ++n > 60) clearInterval(iv); }, 500);
})();
