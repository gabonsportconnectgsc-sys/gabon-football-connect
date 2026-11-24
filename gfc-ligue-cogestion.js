/* GFC-LIGUE-COGESTION.JS v1 - lot 9 : un compte nomme co-gestionnaire par l'admin gere la fiche, les licencies et les competitions d'une ligue. */
(function (w) {
  'use strict';
  var PROV = ['Estuaire', 'Haut-Ogooué', 'Moyen-Ogooué', 'Ngounié', 'Nyanga', 'Ogooué-Ivindo', 'Ogooué-Lolo', 'Ogooué-Maritime', 'Woleu-Ntem'];
  var AFF = ['Affiliée', "En cours d'affiliation", 'Non affiliée'];
  var FIELDS = [['typeLigue', 'Type de ligue', 'text'], ['provinceLigue', 'Province', 'select', PROV], ['affiliationStatut', 'Affiliation', 'select', AFF],
    ['federationTutelle', 'Fédération de tutelle', 'text'], ['numeroRecepisse', 'N° de récépissé', 'text'], ['clubsAffilies', 'Clubs affiliés', 'num'],
    ['licencies', 'Licenciés', 'num'], ['arbitres', 'Arbitres', 'num'], ['educateurs', 'Éducateurs', 'num'], ['competitionsOrganisees', 'Compétitions organisées', 'area']];
  var shown = '';
  function H() { return w.GSCLigueManager && w.GSCLigueManager._h; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function realUid() {
    var a = w.auth && w.auth.currentUser;
    if (!a && w.firebase && w.firebase.auth) { try { a = w.firebase.auth().currentUser; } catch (e) {} }
    if (!a && typeof w.getAuth === 'function') { try { a = w.getAuth().currentUser; } catch (e) {} }
    return a ? a.uid : null;
  }
  function mine() {
    var me = realUid(), l = w.allActors || [];
    if (!me) return [];
    return l.filter(function (a) { return a && a.role === 'ligue' && Array.isArray(a.coGestionnaires) && a.coGestionnaires.indexOf(me) >= 0; });
  }
  function nameOf(a) { return (w.gfcName ? w.gfcName(a) : a.nomOrganisation) || 'Ligue'; }
  function openFiche(id) {
    var a = (w.allActors || []).filter(function (x) { return (x.id || x.uid) === id; })[0];
    if (!a) return;
    var old = document.getElementById('gfc-cog-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'gfc-cog-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px';
    var inS = 'width:100%;box-sizing:border-box;border:1.5px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;background:#fff;color:#0f172a';
    var h = '<div style="background:#fff;color:#0f172a;border-radius:14px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:16px"><h3 style="margin:0 0 10px">✏️ ' + esc(nameOf(a)) + '</h3>';
    FIELDS.forEach(function (f) {
      var v = a[f[0]]; v = (v == null) ? '' : v;
      h += '<div style="margin-bottom:10px"><label style="display:block;font-size:12px;font-weight:700;margin-bottom:3px">' + f[1] + '</label>';
      if (f[2] === 'select') {
        var opts = ['<option value="">—</option>'].concat(f[3].map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }));
        if (v && f[3].indexOf(v) < 0) opts.push('<option selected>' + esc(v) + '</option>');
        h += '<select data-k="' + f[0] + '" style="' + inS + '">' + opts.join('') + '</select>';
      } else if (f[2] === 'area') {
        h += '<textarea data-k="' + f[0] + '" rows="3" style="' + inS + '">' + esc(v) + '</textarea>';
      } else {
        h += '<input data-k="' + f[0] + '" type="' + (f[2] === 'num' ? 'number' : 'text') + '"' + (f[2] === 'num' ? ' min="0"' : '') + ' value="' + esc(v) + '" style="' + inS + '">';
      }
      h += '</div>';
    });
    h += '<div id="gfc-cog-msg" style="font-size:12px;min-height:16px"></div><div style="display:flex;gap:8px;margin-top:8px">' +
      '<button type="button" id="gfc-cog-cancel" style="flex:1;border:none;border-radius:8px;padding:10px;font-weight:700;background:#f1f5f9;color:#0f172a;cursor:pointer">Fermer</button>' +
      '<button type="button" id="gfc-cog-save" style="flex:1;border:none;border-radius:8px;padding:10px;font-weight:700;background:#009E60;color:#fff;cursor:pointer">Enregistrer</button></div></div>';
    ov.innerHTML = h;
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    ov.querySelector('#gfc-cog-cancel').onclick = function () { ov.remove(); };
    ov.querySelector('#gfc-cog-save').onclick = async function () {
      var h2 = H(), msg = ov.querySelector('#gfc-cog-msg'), data = {};
      if (!h2 || typeof h2.fset !== 'function') { msg.style.color = '#dc2626'; msg.textContent = 'Enregistrement indisponible.'; return; }
      ov.querySelectorAll('[data-k]').forEach(function (el) {
        var k = el.getAttribute('data-k');
        if (el.getAttribute('type') === 'number') { var n = parseInt(el.value, 10); if (!isNaN(n) && n >= 0) data[k] = n; }
        else data[k] = (el.value || '').trim();
      });
      var local = Object.assign({}, data);
      data.updatedAt = h2.now ? h2.now() : new Date();
      msg.style.color = '#334155'; msg.textContent = 'Enregistrement…';
      try { await h2.fset('users', id, data, true); Object.assign(a, local); msg.style.color = '#10b981'; msg.textContent = 'Enregistré.'; }
      catch (e) { msg.style.color = '#dc2626'; msg.textContent = 'Erreur : ' + (e.message || e); }
    };
  }
  function act(id, kind) {
    w.__gfcActLigue = id;
    if (kind === 'fiche') { openFiche(id); return; }
    if (kind === 'lic') { if (w.GSCLigueManager && w.GSCLigueManager.open) w.GSCLigueManager.open(); return; }
    var C = w.GSCLigueCompetitions;
    if (C && typeof C.open === 'function') C.open(); else w.alert('Compétitions indisponibles sur cette page.');
  }
  function render() {
    var l = mine(), key = l.map(function (a) { return a.id || a.uid; }).join(',');
    var old = document.getElementById('gfc-cogestion-card');
    if (!l.length) { if (old) old.remove(); shown = ''; return; }
    var anchor = document.getElementById('prof-effectifs-card');
    if (!anchor || !anchor.parentNode) return;
    if (old && key === shown) return;
    if (old) old.remove();
    shown = key;
    var c = document.createElement('div');
    c.id = 'gfc-cogestion-card'; c.className = 'card mb-16 fade-up';
    var h = '<div class="card-header"><div class="card-title">🏆 Ligue que je co-gère</div></div><div style="padding:12px 16px">';
    l.forEach(function (a) {
      var id = a.id || a.uid;
      h += '<div style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:6px">' + esc(nameOf(a)) + '</div><div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button type="button" class="btn" data-act="fiche" data-id="' + esc(id) + '">✏️ Informations</button>' +
        '<button type="button" class="btn" data-act="lic" data-id="' + esc(id) + '">👥 Licenciés</button>' +
        '<button type="button" class="btn" data-act="comp" data-id="' + esc(id) + '">🏆 Compétitions</button></div></div>';
    });
    c.innerHTML = h + '</div>';
    anchor.parentNode.insertBefore(c, anchor);
    c.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button[data-act]') : null;
      if (b) act(b.getAttribute('data-id'), b.getAttribute('data-act'));
    });
  }
  setInterval(function () { try { render(); } catch (e) { console.warn('[GFC] cogestion', e); } }, 3000);
})(window);
