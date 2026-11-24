/* GSC-LIGUE-MANAGER.JS v1 — licenciés des Ligues (photo, n° licence, club, QR) + validation admin
 * Collections : ligueLicencies/{ligueUid}_{saison}_{discipline}_{categorie}  (+ sous-doc prive/data)
 *               ligueStats/{ligueUid}_{saison}
 * SDK compat ou modulaire. API : GSCLigueManager.open() · GSCLigueManager.adminOpen() */
(function (w) {
  'use strict';
  var CLOUD = 'djvzc3vqp', PRESET = 'gfc_uploads';
  var QR_CDN = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
  var S = { saison: '', disc: '', cat: '', items: [], prive: {}, status: '' };

  function compat() { return w.db && typeof w.db.collection === 'function'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() {
    var a = w.auth && w.auth.currentUser;
    if (!a && w.firebase && w.firebase.auth) { try { a = w.firebase.auth().currentUser; } catch (e) {} }
    if (!a && typeof w.getAuth === 'function') { try { a = w.getAuth().currentUser; } catch (e) {} }
    return w.__gfcActLigue || (a ? a.uid : null);
  }
  function now() {
    if (compat() && w.firebase && w.firebase.firestore) return w.firebase.firestore.FieldValue.serverTimestamp();
    return w.serverTimestamp ? w.serverTimestamp() : new Date().toISOString();
  }
  function slug(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function defSaison() { var d = new Date(), y = d.getFullYear(); return d.getMonth() >= 8 ? y + '-' + (y + 1) : (y - 1) + '-' + y; }
  function gid(u) { return u + '_' + S.saison + '_' + slug(S.disc) + '_' + slug(S.cat); }

  /* ── Firestore (compat / modulaire) ── */
  function ref(col, id, sub, sid) {
    if (compat()) { var r = w.db.collection(col).doc(id); return sub ? r.collection(sub).doc(sid) : r; }
    return sub ? w.doc(w.db, col, id, sub, sid) : w.doc(w.db, col, id);
  }
  async function fget(col, id, sub, sid) {
    var d = compat() ? await ref(col, id, sub, sid).get() : await w.getDoc(ref(col, id, sub, sid));
    var ex = typeof d.exists === 'function' ? d.exists() : d.exists;
    return ex ? d.data() : null;
  }
  async function fset(col, id, data, merge, sub, sid) {
    var o = merge ? { merge: true } : undefined;
    if (compat()) return ref(col, id, sub, sid).set(data, o);
    return w.setDoc(ref(col, id, sub, sid), data, o);
  }
  async function fquery(col, conds) {
    var snap;
    if (compat()) {
      var q = w.db.collection(col);
      conds.forEach(function (c) { q = q.where(c[0], '==', c[1]); });
      snap = await q.get();
    } else {
      var cs = conds.map(function (c) { return w.where(c[0], '==', c[1]); });
      snap = await w.getDocs(w.query.apply(null, [w.collection(w.db, col)].concat(cs)));
    }
    var out = []; snap.forEach(function (d) { out.push({ id: d.id, data: d.data() }); });
    return out;
  }

  async function fdel(col, id) {
    if (compat()) return ref(col, id).delete();
    return w.deleteDoc(ref(col, id));
  }

  /* ── Disciplines (GSCDisciplines, lecture défensive) ── */
  function norm(l) {
    if (!l) return [];
    if (!Array.isArray(l)) l = Object.keys(l).map(function (k) { var v = l[k]; return typeof v === 'object' ? Object.assign({ id: k }, v) : { id: k, nom: v }; });
    return l.map(function (d) {
      if (typeof d === 'string') return { id: d, nom: d };
      var id = d.id || d.key || d.slug || d.nom || d.name || d.label;
      return { id: id, nom: d.nom || d.name || d.label || id };
    });
  }
  function discs() { try { return norm(w.GSCDisciplines.list()); } catch (e) { return []; } }
  function cats(d) {
    var c = []; try { c = norm(w.GSCDisciplines.getCategories(d)); } catch (e) {}
    return c.length ? c : norm(['Seniors', 'Juniors', 'Cadets', 'Minimes']);
  }

  /* ── QR ── */
  function loadQr() {
    return new Promise(function (ok, ko) {
      if (typeof w.qrcode === 'function') return ok();
      var s = document.createElement('script'); s.src = QR_CDN; s.onload = ok; s.onerror = function () { ko(new Error('qrcode-generator non chargé')); };
      document.head.appendChild(s);
    });
  }
  function qrUrl(text) { var q = w.qrcode(0, 'M'); q.addData(text); q.make(); return q.createDataURL(5, 2); }
  function qrPayload(u, it) { return 'GSC|LIC|' + u + '|' + it.numLicence; }

  /* ── Photo : réduction 480px puis envoi Cloudinary non signé ── */
  function shrink(file) {
    return new Promise(function (ok, ko) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var m = 480, r = Math.min(1, m / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : ko(new Error('Image illisible')); }, 'image/jpeg', 0.8);
      };
      img.onerror = function () { ko(new Error('Image illisible')); }; img.src = url;
    });
  }
  async function upload(file) {
    var blob = await shrink(file), fd = new FormData();
    fd.append('file', blob); fd.append('upload_preset', PRESET); fd.append('folder', 'ligues');
    var r = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD + '/image/upload', { method: 'POST', body: fd });
    var j = await r.json(); if (!j.secure_url) throw new Error((j.error && j.error.message) || 'Envoi photo refusé');
    return j.secure_url;
  }

  /* ── Stats ── */
  async function recomputeStats(ligueUid, saison, validatedOnly) {
    var rows = await fquery('ligueLicencies', [['ligueUid', '==', ligueUid], ['saison', '==', saison]]);
    var st = { ligueUid: ligueUid, saison: saison, total: 0, parDiscipline: {}, parCategorie: {}, parSexe: { M: 0, F: 0 }, public: !!validatedOnly, updatedAt: now() };
    var clubs = {};
    rows.forEach(function (r) {
      var g = r.data; if (validatedOnly && g.validation !== 'validated') return;
      var n = (g.licencies || []).length; st.total += n;
      st.parDiscipline[slug(g.discipline)] = (st.parDiscipline[slug(g.discipline)] || 0) + n;
      st.parCategorie[slug(g.categorie)] = (st.parCategorie[slug(g.categorie)] || 0) + n;
      (g.licencies || []).forEach(function (l) { if (l.sexe === 'F') st.parSexe.F++; else st.parSexe.M++; if (l.club) clubs[l.club] = 1; });
    });
    st.clubs = Object.keys(clubs).length;
    await fset('ligueStats', ligueUid + '_' + saison, st, true);
  }

  /* ── UI commune ── */
  var CSS = '.glm-ov{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:99990;display:flex;align-items:flex-end;justify-content:center}'
    + '.glm-box{background:#fff;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:16px 16px 0 0;padding:14px;font:14px system-ui,sans-serif;color:#0f172a}'
    + '.glm-box h3{margin:0 0 8px}.glm-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.glm-row>*{flex:1;min-width:120px}'
    + '.glm-box input,.glm-box select{width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;box-sizing:border-box}'
    + '.glm-btn{padding:9px 12px;border:0;border-radius:8px;background:#0f766e;color:#fff;font:inherit;cursor:pointer}.glm-btn.g{background:#64748b}.glm-btn.r{background:#b91c1c}'
    + '.glm-card{display:flex;gap:10px;align-items:center;border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:8px}'
    + '.glm-card img.p{width:52px;height:52px;border-radius:50%;object-fit:cover;background:#e2e8f0}.glm-card .i{flex:1;min-width:0}'
    + '.glm-tag{display:inline-block;padding:2px 8px;border-radius:99px;font-size:12px;background:#e2e8f0}.glm-tag.validated{background:#bbf7d0}.glm-tag.pending{background:#fde68a}.glm-tag.rejected{background:#fecaca}';
  function ov(html) {
    if (!document.getElementById('glm-css')) { var s = document.createElement('style'); s.id = 'glm-css'; s.textContent = CSS; document.head.appendChild(s); }
    var d = document.createElement('div'); d.className = 'glm-ov'; d.innerHTML = '<div class="glm-box">' + html + '</div>';
    d.addEventListener('click', function (e) { if (e.target === d) d.remove(); });
    document.body.appendChild(d); return d;
  }
  function $(root, sel) { return root.querySelector(sel); }
  function msg(t) { w.alert(t); }

  /* ══ GESTIONNAIRE LIGUE ══ */
  async function open() {
    var u = uid(); if (!u) return msg('Connecte-toi pour gérer tes licenciés.');
    S.saison = S.saison || defSaison();
    var D = discs(); if (!S.disc && D.length) S.disc = D[0].id;
    var root = ov('<div id="glm-main"></div>'); root._u = u; await shell(root);
  }
  async function shell(root, local) {
    var u = root._u, D = discs(), C = cats(S.disc), g = root._g || null;
    if (!C.some(function (c) { return c.id === S.cat; })) S.cat = C[0].id;
    if (!local) {
      g = await fget('ligueLicencies', gid(u)); root._g = g;
      var p = await fget('ligueLicencies', gid(u), 'prive', 'data').catch(function () { return null; });
      S.items = g ? (g.licencies || []).slice() : []; S.prive = (p && p.items) || {}; S.status = g ? g.validation : '';
    }
    var h = '<h3>🏅 Licenciés de la Ligue</h3><div class="glm-row">'
      + '<input id="glm-s" value="' + esc(S.saison) + '" placeholder="Saison 2026-2027">'
      + '<select id="glm-d">' + D.map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === S.disc ? ' selected' : '') + '>' + esc(d.nom) + '</option>'; }).join('') + '</select>'
      + '<select id="glm-c">' + C.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === S.cat ? ' selected' : '') + '>' + esc(c.nom) + '</option>'; }).join('') + '</select></div>'
      + '<div class="glm-row"><span>' + S.items.length + ' licencié(s)' + (S.status ? ' · <span class="glm-tag ' + esc(S.status) + '">' + esc(S.status) + '</span>' : '') + (g && g.rejectReason ? ' · ' + esc(g.rejectReason) : '') + '</span></div>'
      + S.items.map(function (it, i) {
        return '<div class="glm-card"><img class="p" src="' + esc(it.photoUrl || '') + '" alt=""><div class="i"><b>' + esc(it.prenom) + ' ' + esc(it.nom) + '</b><br><small>' + esc(it.numLicence) + ' · ' + esc(it.club || 'Sans club') + '</small></div>'
          + '<button class="glm-btn g" data-qr="' + i + '">QR</button><button class="glm-btn g" data-ed="' + i + '">✎</button><button class="glm-btn r" data-del="' + i + '">✕</button></div>';
      }).join('')
      + '<div class="glm-row"><button class="glm-btn" id="glm-add">＋ Licencié</button><button class="glm-btn" id="glm-save">Enregistrer et soumettre</button><button class="glm-btn g" id="glm-x">Fermer</button></div>';
    $(root, '#glm-main').innerHTML = h;
    $(root, '#glm-s').onchange = function () { S.saison = this.value.trim(); shell(root); };
    $(root, '#glm-d').onchange = function () { S.disc = this.value; S.cat = ''; shell(root); };
    $(root, '#glm-c').onchange = function () { S.cat = this.value; shell(root); };
    $(root, '#glm-x').onclick = function () { root.remove(); };
    $(root, '#glm-add').onclick = function () { form(root, -1); };
    $(root, '#glm-save').onclick = function () { save(root); };
    root.querySelectorAll('[data-ed]').forEach(function (b) { b.onclick = function () { form(root, +b.dataset.ed); }; });
    root.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { if (w.confirm('Retirer ce licencié ?')) { var it = S.items.splice(+b.dataset.del, 1)[0]; delete S.prive[it.id]; shell2(root); } }; });
    root.querySelectorAll('[data-qr]').forEach(function (b) { b.onclick = function () { showQr(S.items[+b.dataset.qr], u); }; });
  }
  function shell2(root) { shell(root, true); } /* re-rendu local, sans relire Firestore */
  function form(root, idx) {
    var it = idx >= 0 ? S.items[idx] : null, pv = it ? (S.prive[it.id] || {}) : {};
    var f = ov('<h3>' + (it ? 'Modifier' : 'Nouveau') + ' licencié</h3>'
      + '<div class="glm-row"><input id="f-pr" placeholder="Prénom" value="' + esc(it && it.prenom) + '"><input id="f-nm" placeholder="Nom" value="' + esc(it && it.nom) + '"></div>'
      + '<div class="glm-row"><select id="f-sx"><option value="M">Masculin</option><option value="F"' + (it && it.sexe === 'F' ? ' selected' : '') + '>Féminin</option></select>'
      + '<input id="f-bd" type="date" value="' + esc(pv.naissance) + '"></div>'
      + '<div class="glm-row"><input id="f-tel" placeholder="Téléphone (privé)" value="' + esc(pv.tel) + '"><input id="f-cl" placeholder="Club d\'affiliation" value="' + esc(it && it.club) + '"></div>'
      + '<div class="glm-row"><input id="f-ph" type="file" accept="image/*"></div>'
      + '<div class="glm-row"><button class="glm-btn" id="f-ok">Valider</button><button class="glm-btn g" id="f-no">Annuler</button></div>');
    $(f, '#f-no').onclick = function () { f.remove(); };
    $(f, '#f-ok').onclick = async function () {
      var b = this, pr = $(f, '#f-pr').value.trim(), nm = $(f, '#f-nm').value.trim();
      if (!pr || !nm) return msg('Prénom et nom obligatoires.');
      b.disabled = true; b.textContent = '…';
      try {
        var file = $(f, '#f-ph').files[0], photo = it ? it.photoUrl : '';
        if (file) photo = await upload(file);
        var n = it || { id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) };
        if (!n.numLicence) n.numLicence = 'GSC-' + root._u.slice(0, 4).toUpperCase() + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
        n.prenom = pr; n.nom = nm; n.sexe = $(f, '#f-sx').value; n.club = $(f, '#f-cl').value.trim(); n.photoUrl = photo || '';
        S.prive[n.id] = { naissance: $(f, '#f-bd').value, tel: $(f, '#f-tel').value.trim() };
        if (idx < 0) S.items.push(n);
        f.remove(); shell2(root);
      } catch (e) { b.disabled = false; b.textContent = 'Valider'; msg('Erreur : ' + e.message); }
    };
  }
  async function showQr(it, u) {
    try { await loadQr(); } catch (e) { return msg(e.message); }
    var q = ov('<div style="text-align:center"><h3>' + esc(it.prenom) + ' ' + esc(it.nom) + '</h3><img src="' + qrUrl(qrPayload(u, it)) + '" style="width:220px;height:220px"><p>' + esc(it.numLicence) + '<br>' + esc(it.club || '') + '</p><button class="glm-btn g" id="q-x">Fermer</button></div>');
    $(q, '#q-x').onclick = function () { q.remove(); };
  }
  async function save(root) {
    var u = root._u; if (!S.items.length && !w.confirm('Enregistrer un groupe vide ?')) return;
    var b = $(root, '#glm-save'); b.disabled = true; b.textContent = '…';
    try {
      var id = gid(u);
      var pub = S.items.map(function (n) { return { id: n.id, prenom: n.prenom, nom: n.nom, sexe: n.sexe, club: n.club || '', numLicence: n.numLicence, photoUrl: n.photoUrl || '', qr: qrPayload(u, n) }; });
      await fset('ligueLicencies', id, { ligueUid: u, saison: S.saison, discipline: S.disc, categorie: S.cat, licencies: pub, count: pub.length, validation: 'pending', public: false, updatedBy: u, updatedAt: now() }, false);
      await fset('ligueLicencies', id, { items: S.prive }, false, 'prive', 'data');
      await recomputeStats(u, S.saison, false);
      msg('Liste enregistrée, en attente de validation admin.'); await shell(root);
    } catch (e) { b.disabled = false; b.textContent = 'Enregistrer et soumettre'; msg('Erreur : ' + e.message); }
  }

  /* ══ VALIDATION ADMIN ══ */
  async function adminOpen() {
    var root = ov('<h3>🏅 Licenciés de Ligues à valider</h3><div id="gla"></div>');
    var rows = await fquery('ligueLicencies', [['validation', '==', 'pending']]), box = $(root, '#gla');
    if (!rows.length) { box.innerHTML = '<p>✅ Aucune liste en attente.</p>'; return; }
    box.innerHTML = rows.map(function (r, i) {
      var g = r.data; return '<div class="glm-card"><div class="i"><b>' + esc(g.discipline) + ' · ' + esc(g.categorie) + '</b><br><small>' + esc(g.saison) + ' · ' + (g.count || 0) + ' licencié(s)</small></div>'
        + '<button class="glm-btn" data-ok="' + i + '">✅</button><button class="glm-btn r" data-ko="' + i + '">❌</button></div>';
    }).join('');
    async function decide(i, ok) {
      var r = rows[i], reason = '';
      if (!ok) { reason = w.prompt('Motif du refus :') || ''; if (!reason.trim()) return; }
      var upd = ok ? { validation: 'validated', public: true, rejectReason: '' } : { validation: 'rejected', public: false, rejectReason: reason.trim() };
      upd.validatedBy = uid(); upd.validatedAt = now();
      await fset('ligueLicencies', r.id, upd, true);
      await recomputeStats(r.data.ligueUid, r.data.saison, true);
      adminOpen(); root.remove();
    }
    root.querySelectorAll('[data-ok]').forEach(function (b) { b.onclick = function () { decide(+b.dataset.ok, true).catch(function (e) { msg(e.message); }); }; });
    root.querySelectorAll('[data-ko]').forEach(function (b) { b.onclick = function () { decide(+b.dataset.ko, false).catch(function (e) { msg(e.message); }); }; });
  }

  w.GSCLigueManager = {
    open: open, adminOpen: adminOpen,
    canManage: function (ligueUid) { var u = uid(); return !!u && u === ligueUid; },
    _h: { fget: fget, fset: fset, fquery: fquery, fdel: fdel, uid: uid, now: now, esc: esc, ov: ov, upload: upload, msg: msg,
          defSaison: defSaison, slug: slug, discs: discs, recomputeStats: recomputeStats }
  };
})(window);
