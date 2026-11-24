/* GFC-LIGUE-COMPLETION.JS v1 - complete une ligue depuis Comptes & Acces (province, clubs affilies, licencies, arbitres, educateurs)
 * Ajoute un bloc a la fenetre de gsc-actor-profile-editor.js sans modifier ce fichier. */
(function (w) {
  'use strict';
  var PROV = ['Estuaire', 'Haut-Ogooué', 'Moyen-Ogooué', 'Ngounié', 'Nyanga', 'Ogooué-Ivindo', 'Ogooué-Lolo', 'Ogooué-Maritime', 'Woleu-Ntem'];
  var NUM = [['clubsAffilies', 'Clubs affiliés', 'pe-lg-clubs'], ['licencies', 'Licenciés', 'pe-lg-licencies'], ['arbitres', 'Arbitres', 'pe-lg-arbitres'], ['educateurs', 'Éducateurs', 'pe-lg-educateurs']];
  var cur = null, filled = null;
  function users() { return (w.realtimeSync && w.realtimeSync.getCache && w.realtimeSync.getCache('users')) || []; }
  function find(uid) { var l = users(); for (var i = 0; i < l.length; i++) { if ((l[i].id || l[i].uid) === uid) return l[i]; } return null; }
  function toggle() {
    var b = document.getElementById('pe-lg-box'), r = document.getElementById('pe-role');
    if (b && r) { var lg = (r.value === 'ligue'); b.style.display = lg ? '' : 'none'; var ef = document.getElementById('pe-org-effectif'), efw = ef && ef.closest ? ef.closest('.gsc-pe-field') : null; if (efw) efw.style.display = lg ? 'none' : ''; }
  }
  function build() {
    if (document.getElementById('pe-lg-box')) return true;
    var anchor = document.getElementById('pe-org-fields');
    if (!anchor || !anchor.parentNode) return false;
    var box = document.createElement('div');
    box.id = 'pe-lg-box'; box.style.display = 'none';
    var h = '<div class="gsc-pe-field"><label>Province</label><select id="pe-lg-province"><option value="">—</option>' + PROV.map(function (p) { return '<option>' + p + '</option>'; }).join('') + '</select></div>';
    NUM.forEach(function (n) { h += '<div class="gsc-pe-field"><label>' + n[1] + '</label><input id="' + n[2] + '" type="number" min="0"></div>'; });
    box.innerHTML = h;
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    var r = document.getElementById('pe-role');
    if (r) r.addEventListener('change', toggle);
    return true;
  }
  function fill(uid) {
    if (!build()) return;
    var u = find(uid);
    if (!u) { filled = null; toggle(); return; }
    var sel = document.getElementById('pe-lg-province'), pv = u.provinceLigue || '';
    if (pv && PROV.indexOf(pv) < 0) { var o = document.createElement('option'); o.textContent = pv; sel.appendChild(o); }
    sel.value = pv;
    NUM.forEach(function (n) { var v = u[n[0]]; document.getElementById(n[2]).value = (v === undefined || v === null) ? '' : v; });
    filled = uid;
    toggle();
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.gsc-profile-edit-btn') : null;
    if (!b) return;
    var tr = b.closest('tr[data-id]');
    if (!tr) return;
    cur = tr.getAttribute('data-id'); filled = null;
    setTimeout(function () { fill(cur); }, 0);
  }, true);
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('#pe-save-btn') : null;
    if (!b || !cur || filled !== cur) return;
    var r = document.getElementById('pe-role');
    if (!r || r.value !== 'ligue' || w.__peContactReady !== true || !w.db) return;
    var upd = { provinceLigue: document.getElementById('pe-lg-province').value };
    NUM.forEach(function (n) { var x = parseInt(document.getElementById(n[2]).value, 10); if (!isNaN(x) && x >= 0) upd[n[0]] = x; });
    w.db.collection('users').doc(cur).update(upd).catch(function (err) { console.warn('[GFC] completion ligue', err); });
  });
  function tag() {
    var grid = document.getElementById('players-grid');
    if (!grid) return;
    var rows = grid.querySelectorAll('tr[data-id]');
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i], u = find(tr.getAttribute('data-id')), old = tr.querySelector('.gfc-lg-todo');
      var need = !!u && u.role === 'ligue' && (!u.ville || (!u.clubsAffilies && !u.licencies));
      if (need && !old) {
        var s = document.createElement('span');
        s.className = 'gfc-lg-todo'; s.textContent = '⚠️ À compléter';
        s.style.cssText = 'margin-left:6px;font-size:11px;font-weight:700;color:#b45309;background:#fef3c7;border-radius:6px;padding:2px 6px;white-space:nowrap';
        var td = tr.querySelector('td:last-child');
        if (td) td.appendChild(s);
      } else if (!need && old) { old.remove(); }
    }
  }
  var timer = null;
  function later() { clearTimeout(timer); timer = setTimeout(tag, 300); }
  var tries = 0, t = setInterval(function () {
    var g = document.getElementById('players-grid');
    if (g) { new MutationObserver(later).observe(g, { childList: true, subtree: true }); clearInterval(t); later(); }
    else if (++tries > 60) clearInterval(t);
  }, 500);
  setInterval(tag, 4000);
  /* Co-gestionnaires (lot 9) : ajout et retrait reserves a l'admin */
  function cogList(u) { return (u && Array.isArray(u.coGestionnaires)) ? u.coGestionnaires.slice() : []; }
  function cogName(x) { return (w.gfcName ? w.gfcName(x) : [x.prenom, x.nom].filter(Boolean).join(' ')) || x.id || x.uid || ''; }
  function cogBuild() {
    if (document.getElementById('pe-cog-box')) return true;
    var anchor = document.getElementById('pe-lg-box');
    if (!anchor || !anchor.parentNode) return false;
    var box = document.createElement('div');
    box.id = 'pe-cog-box'; box.style.display = 'none';
    box.innerHTML = '<div class="gsc-pe-field"><label>Co-gestionnaires de la ligue</label><div id="pe-cog-list" style="font-size:13px;margin-bottom:6px"></div>' +
      '<input id="pe-cog-q" placeholder="Nom du compte à ajouter"><div style="margin-top:6px"><button type="button" id="pe-cog-add" class="gsc-pe-save" style="width:100%;border:none;border-radius:8px;padding:8px;font-weight:700;cursor:pointer">Ajouter</button></div>' +
      '<div id="pe-cog-msg" style="font-size:12px;margin-top:6px"></div></div>';
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    document.getElementById('pe-cog-add').addEventListener('click', cogAdd);
    var r = document.getElementById('pe-role');
    if (r) r.addEventListener('change', cogRefresh);
    return true;
  }
  function cogRefresh() {
    if (!cur || !cogBuild()) return;
    var r = document.getElementById('pe-role'), box = document.getElementById('pe-cog-box');
    var lg = !!r && r.value === 'ligue';
    box.style.display = lg ? '' : 'none';
    if (!lg) return;
    var ids = cogList(find(cur)), l = document.getElementById('pe-cog-list');
    if (!ids.length) { l.textContent = 'Aucun co-gestionnaire.'; return; }
    l.innerHTML = '';
    ids.forEach(function (id) {
      var row = document.createElement('div'), p = find(id);
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0';
      var s = document.createElement('span'); s.textContent = p ? cogName(p) : id;
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Retirer';
      b.style.cssText = 'border:none;border-radius:6px;padding:4px 8px;background:#fee2e2;color:#991b1b;font-weight:700;cursor:pointer';
      b.onclick = function () { cogSave(ids.filter(function (x) { return x !== id; })); };
      row.appendChild(s); row.appendChild(b); l.appendChild(row);
    });
  }
  function cogSave(list) {
    var msg = document.getElementById('pe-cog-msg');
    if (!w.db || !cur) return;
    msg.style.color = '#334155'; msg.textContent = 'Enregistrement…';
    w.db.collection('users').doc(cur).update({ coGestionnaires: list, updatedAt: new Date() }).then(function () {
      var u = find(cur); if (u) u.coGestionnaires = list;
      msg.style.color = '#10b981'; msg.textContent = 'Co-gestionnaires mis à jour.'; cogRefresh();
    }).catch(function (e) { msg.style.color = '#dc2626'; msg.textContent = 'Erreur : ' + (e.message || e); });
  }
  function cogAdd() {
    var q = (document.getElementById('pe-cog-q').value || '').trim().toLowerCase(), msg = document.getElementById('pe-cog-msg');
    msg.style.color = '#dc2626';
    if (!q) { msg.textContent = 'Saisissez un nom.'; return; }
    var cur0 = cogList(find(cur));
    var m = users().filter(function (x) { var id = x.id || x.uid; return id && id !== cur && cur0.indexOf(id) < 0 && (String(id).toLowerCase() === q || cogName(x).toLowerCase().indexOf(q) >= 0); });
    if (m.length === 0) { msg.textContent = 'Aucun compte trouvé.'; return; }
    if (m.length > 1) { msg.textContent = 'Plusieurs comptes : ' + m.slice(0, 5).map(cogName).join(' · ') + '. Précisez le nom.'; return; }
    if (!w.confirm('Ajouter « ' + cogName(m[0]) + ' » comme co-gestionnaire de cette ligue ?')) return;
    cogSave(cur0.concat([m[0].id || m[0].uid]));
    document.getElementById('pe-cog-q').value = '';
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.gsc-profile-edit-btn') : null;
    if (b) setTimeout(cogRefresh, 60);
  }, true);
})(window);
