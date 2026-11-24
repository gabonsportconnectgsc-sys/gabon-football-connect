/* GSC-LIGUE-COMPETITIONS.JS v1 — compétitions des Ligues (dates, province, ville, site, équipes, résultat, affiche)
 * + fiche publique (stats en 1 lecture + compétitions validées) + validation admin.
 * Dépend de gsc-ligue-manager.js (chargé avant). Collection : ligueCompetitions/{id} */
(function (w) {
  'use strict';
  function H() { return w.GSCLigueManager && w.GSCLigueManager._h; }

  function lines(s) { return String(s || '').split(/[\n,;]+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function fmtDate(d) { if (!d) return ''; var p = String(d).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d; }
  function $(root, sel) { return root.querySelector(sel); }

  /* ══ GESTION PAR LA LIGUE ══ */
  async function open() {
    var h = H(), u = h && h.uid(); if (!u) return w.alert('Connecte-toi pour gérer tes compétitions.');
    var root = h.ov('<div id="glc-main"></div>'); root._u = u; await list(root);
  }
  async function list(root) {
    var h = H(), u = root._u;
    var rows = await h.fquery('ligueCompetitions', [['ligueUid', '==', u]]);
    rows.sort(function (a, b) { return String(b.data.dateDebut || '').localeCompare(String(a.data.dateDebut || '')); });
    root._rows = rows;
    $(root, '#glc-main').innerHTML = '<h3>🏆 Compétitions de la Ligue</h3>'
      + (rows.length ? rows.map(function (r, i) {
        var c = r.data;
        return '<div class="glm-card">' + (c.afficheUrl ? '<img class="p" style="border-radius:8px" src="' + h.esc(c.afficheUrl) + '" alt="">' : '')
          + '<div class="i"><b>' + h.esc(c.nom) + '</b><br><small>' + h.esc(fmtDate(c.dateDebut)) + ' · ' + h.esc(c.ville || '') + ' · <span class="glm-tag ' + h.esc(c.validation) + '">' + h.esc(c.validation) + '</span></small>'
          + (c.rejectReason ? '<br><small>' + h.esc(c.rejectReason) + '</small>' : '') + '</div>'
          + '<button class="glm-btn g" data-ed="' + i + '">✎</button><button class="glm-btn r" data-del="' + i + '">✕</button></div>';
      }).join('') : '<p>Aucune compétition pour le moment.</p>')
      + '<div class="glm-row"><button class="glm-btn" id="glc-add">＋ Compétition</button><button class="glm-btn g" id="glc-x">Fermer</button></div>';
    $(root, '#glc-x').onclick = function () { root.remove(); };
    $(root, '#glc-add').onclick = function () { form(root, null); };
    root.querySelectorAll('[data-ed]').forEach(function (b) { b.onclick = function () { form(root, root._rows[+b.dataset.ed]); }; });
    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = async function () {
        if (!w.confirm('Supprimer cette compétition ?')) return;
        try { await h.fdel('ligueCompetitions', root._rows[+b.dataset.del].id); await list(root); } catch (e) { h.msg('Erreur : ' + e.message); }
      };
    });
  }
  function form(root, row) {
    var h = H(), c = row ? row.data : {}, D = h.discs();
    var f = h.ov('<h3>' + (row ? 'Modifier' : 'Nouvelle') + ' compétition</h3>'
      + '<div class="glm-row"><input id="c-nm" placeholder="Nom de la compétition" value="' + h.esc(c.nom) + '"></div>'
      + '<div class="glm-row"><select id="c-ds">' + D.map(function (d) { return '<option value="' + h.esc(d.id) + '"' + (d.id === c.discipline ? ' selected' : '') + '>' + h.esc(d.nom) + '</option>'; }).join('') + '</select></div>'
      + '<div class="glm-row"><input id="c-d1" type="date" value="' + h.esc(c.dateDebut) + '"><input id="c-d2" type="date" value="' + h.esc(c.dateFin) + '"></div>'
      + '<div class="glm-row"><input id="c-pr" placeholder="Province" value="' + h.esc(c.province) + '"><input id="c-vi" placeholder="Ville" value="' + h.esc(c.ville) + '"></div>'
      + '<div class="glm-row"><input id="c-si" placeholder="Site / stade / salle" value="' + h.esc(c.site) + '"></div>'
      + '<div class="glm-row"><textarea id="c-eq" rows="3" placeholder="Équipes ou participants (un par ligne)" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;box-sizing:border-box">' + h.esc((c.equipes || []).join('\n')) + '</textarea></div>'
      + '<div class="glm-row"><input id="c-re" placeholder="Résultat (ex : Champion : AS Mangasport)" value="' + h.esc(c.resultat) + '"></div>'
      + '<div class="glm-row"><label style="flex:1">Affiche<input id="c-af" type="file" accept="image/*"></label></div>'
      + '<div class="glm-row"><button class="glm-btn" id="c-ok">Soumettre</button><button class="glm-btn g" id="c-no">Annuler</button></div>');
    $(f, '#c-no').onclick = function () { f.remove(); };
    $(f, '#c-ok').onclick = async function () {
      var b = this, nm = $(f, '#c-nm').value.trim(), d1 = $(f, '#c-d1').value;
      if (!nm || !d1) return h.msg('Nom et date de début obligatoires.');
      b.disabled = true; b.textContent = '…';
      try {
        var file = $(f, '#c-af').files[0], aff = c.afficheUrl || '';
        if (file) aff = await h.upload(file);
        var d2 = $(f, '#c-d2').value || d1, u = root._u;
        var doc = { ligueUid: u, nom: nm, discipline: $(f, '#c-ds').value, dateDebut: d1, dateFin: d2, saison: c.saison || (d1 ? String(d1).slice(0, 4) + '' : ''),
          province: $(f, '#c-pr').value.trim(), ville: $(f, '#c-vi').value.trim(), site: $(f, '#c-si').value.trim(),
          equipes: lines($(f, '#c-eq').value), resultat: $(f, '#c-re').value.trim(), afficheUrl: aff,
          validation: 'pending', public: false, rejectReason: '', updatedBy: u, updatedAt: h.now() };
        if (!row) doc.createdAt = h.now();
        await h.fset('ligueCompetitions', row ? row.id : u + '_' + Date.now().toString(36), doc, !!row);
        f.remove(); await list(root);
      } catch (e) { b.disabled = false; b.textContent = 'Soumettre'; h.msg('Erreur : ' + e.message); }
    };
  }

  /* ══ VALIDATION ADMIN ══ */
  async function adminOpen() {
    var h = H(), root = h.ov('<h3>🏆 Compétitions de Ligues à valider</h3><div id="glc-a"></div>');
    var rows = await h.fquery('ligueCompetitions', [['validation', '==', 'pending']]), box = $(root, '#glc-a');
    if (!rows.length) { box.innerHTML = '<p>✅ Aucune compétition en attente.</p>'; return; }
    box.innerHTML = rows.map(function (r, i) {
      var c = r.data;
      return '<div class="glm-card">' + (c.afficheUrl ? '<img class="p" style="border-radius:8px" src="' + h.esc(c.afficheUrl) + '" alt="">' : '')
        + '<div class="i"><b>' + h.esc(c.nom) + '</b><br><small>' + h.esc(fmtDate(c.dateDebut)) + ' → ' + h.esc(fmtDate(c.dateFin)) + ' · ' + h.esc(c.ville || '') + ' (' + h.esc(c.province || '') + ')<br>'
        + (c.equipes || []).length + ' participant(s)' + (c.resultat ? ' · ' + h.esc(c.resultat) : '') + '</small></div>'
        + '<button class="glm-btn" data-ok="' + i + '">✅</button><button class="glm-btn r" data-ko="' + i + '">❌</button></div>';
    }).join('');
    async function decide(i, ok) {
      var r = rows[i], reason = '';
      if (!ok) { reason = w.prompt('Motif du refus :') || ''; if (!reason.trim()) return; }
      var upd = ok ? { validation: 'validated', public: true, rejectReason: '' } : { validation: 'rejected', public: false, rejectReason: reason.trim() };
      upd.validatedBy = h.uid(); upd.validatedAt = h.now();
      await h.fset('ligueCompetitions', r.id, upd, true);
      root.remove(); adminOpen();
    }
    root.querySelectorAll('[data-ok]').forEach(function (b) { b.onclick = function () { decide(+b.dataset.ok, true).catch(function (e) { h.msg(e.message); }); }; });
    root.querySelectorAll('[data-ko]').forEach(function (b) { b.onclick = function () { decide(+b.dataset.ko, false).catch(function (e) { h.msg(e.message); }); }; });
  }

  /* ══ FICHE PUBLIQUE ══ */
  async function renderPublic(el) {
    var h = H(), lu = el.getAttribute('data-uid'); if (!h || !lu) return;
    var out = '';
    try {
      var st = await h.fquery('ligueStats', [['ligueUid', '==', lu], ['public', '==', true]]);
      st.sort(function (a, b) { return String(b.data.saison).localeCompare(String(a.data.saison)); });
      if (st.length) {
        var s = st[0].data;
        out += '<div class="adm-section"><div class="adm-section-title">📊 Licenciés ' + h.esc(s.saison) + '</div>'
          + '<div class="adm-info-row"><span class="adm-info-label">Licenciés</span><span class="adm-info-val">' + (s.total || 0) + '</span></div>'
          + '<div class="adm-info-row"><span class="adm-info-label">Clubs affiliés</span><span class="adm-info-val">' + (s.clubs || 0) + '</span></div>'
          + '<div class="adm-info-row"><span class="adm-info-label">Hommes / Femmes</span><span class="adm-info-val">' + ((s.parSexe || {}).M || 0) + ' / ' + ((s.parSexe || {}).F || 0) + '</span></div></div>';
      }
    } catch (e) { /* stats non publiques : on n'affiche rien */ }
    try {
      var cp = await h.fquery('ligueCompetitions', [['ligueUid', '==', lu], ['public', '==', true]]);
      cp.sort(function (a, b) { return String(b.data.dateDebut || '').localeCompare(String(a.data.dateDebut || '')); });
      if (cp.length) {
        out += '<div class="adm-section"><div class="adm-section-title">🏆 Compétitions</div>' + cp.slice(0, 20).map(function (r) {
          var c = r.data;
          return '<div class="glm-card" style="border:1px solid #e2e8f0">' + (c.afficheUrl ? '<img class="p" style="border-radius:8px;width:64px;height:64px;object-fit:cover" src="' + h.esc(c.afficheUrl) + '" alt="">' : '')
            + '<div class="i"><b>' + h.esc(c.nom) + '</b><br><small>' + h.esc(fmtDate(c.dateDebut)) + (c.dateFin && c.dateFin !== c.dateDebut ? ' → ' + h.esc(fmtDate(c.dateFin)) : '') + ' · ' + h.esc(c.ville || '') + (c.province ? ' (' + h.esc(c.province) + ')' : '') + '</small>'
            + (c.site ? '<br><small>📍 ' + h.esc(c.site) + '</small>' : '') + ((c.equipes || []).length ? '<br><small>' + c.equipes.length + ' participant(s)</small>' : '')
            + (c.resultat ? '<br><small>🏅 ' + h.esc(c.resultat) + '</small>' : '') + '</div></div>';
        }).join('') + '</div>';
      }
    } catch (e) { /* aucune compétition publique */ }
    if (w.GSCLigueManager.canManage(lu)) {
      out += '<div class="glm-row" style="display:flex;gap:8px;margin:10px 0"><button type="button" class="glm-btn" id="glc-own-l">👥 Mes licenciés</button><button type="button" class="glm-btn" id="glc-own-c">🏆 Mes compétitions</button></div>';
    }
    el.innerHTML = out;
    var bl = el.querySelector('#glc-own-l'), bc = el.querySelector('#glc-own-c');
    if (bl) bl.onclick = function () { w.GSCLigueManager.open(); };
    if (bc) bc.onclick = function () { open(); };
  }
  function scan() {
    document.querySelectorAll('#gsc-ligue-pub[data-uid]:not([data-done])').forEach(function (el) {
      el.setAttribute('data-done', '1'); renderPublic(el);
    });
  }
  function boot() {
    scan();
    try { new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); } catch (e) { setInterval(scan, 1000); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  w.GSCLigueCompetitions = { open: open, adminOpen: adminOpen, renderPublic: renderPublic };
})(window);
