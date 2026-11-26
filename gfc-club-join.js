/* gfc-club-join.js — GFC : demandes d'intégration joueur / staff → club (clubJoinRequests)
 * Critères football : catégories d'âge, un club à la fois, mineurs et transferts contrôlés,
 * contrat professionnel et fonctions techniques/médicales/direction validés par l'admin,
 * périodes d'enregistrement configurables. Chargé sur index.html et admin.html. */
(function (window) {
  'use strict';

  const FS_URL = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
  const COLL = 'clubJoinRequests';
  const CFG = 'clubJoinConfig';
  const ORG_ROLES = ['club', 'federation', 'association', 'ligue'];
  const NO_JOIN_ROLES = ['admin', 'supporter', 'arbitre', 'journaliste', 'organisateur', 'expert', 'formateur'];
  const HIGH = ['president', 'vice_president', 'secretaire_general', 'tresorier', 'directeur_general', 'directeur_sportif', 'dirigeant',
    'medecin', 'kine', 'entraineur', 'entraineur_adjoint', 'entraineur_gardiens', 'responsable_securite', 'responsable_formation'];
  const COACH = ['entraineur', 'entraineur_adjoint', 'entraineur_gardiens'];
  const DIPLOMA_REQ = COACH.concat(['medecin', 'kine']);
  const STATUTS = [['amateur', '🏅 Amateur (licence amateur)'], ['sous_contrat', '📝 Sous contrat'], ['professionnel', '⭐ Professionnel (homologation fédérale)']];
  const DIPLOMES = ['Licence CAF C', 'Licence CAF B', 'Licence CAF A', 'Licence CAF Pro', 'Licence gardiens de but CAF', 'Diplôme FEGAFOOT', 'Formation en cours'];
  const FONCTIONS = [
    { g: 'Joueur', items: [['joueur', 'Joueur']] },
    { g: 'Encadrement technique', items: [['entraineur', 'Entraîneur principal'], ['entraineur_adjoint', 'Entraîneur adjoint'], ['entraineur_gardiens', 'Entraîneur des gardiens'], ['prepa_physique', 'Préparateur physique'], ['educateur', 'Éducateur / entraîneur des jeunes'], ['analyste', 'Analyste vidéo / data'], ['responsable_formation', 'Responsable centre de formation / jeunes']] },
    { g: 'Médical', items: [['medecin', 'Médecin du club'], ['kine', 'Kinésithérapeute'], ['soigneur', 'Soigneur / préparateur médical']] },
    { g: 'Direction', items: [['president', 'Président'], ['vice_president', 'Vice-président'], ['secretaire_general', 'Secrétaire général'], ['tresorier', 'Trésorier'], ['directeur_general', 'Directeur général'], ['directeur_sportif', 'Directeur sportif'], ['dirigeant', 'Dirigeant / membre du bureau']] },
    { g: 'Organisation', items: [['team_manager', 'Team manager / intendant'], ['delegue', 'Délégué / accompagnateur'], ['responsable_securite', 'Responsable sécurité / stadier'], ['communication', 'Chargé de communication / média']] }
  ];
  const LABEL = {};
  FONCTIONS.forEach(g => g.items.forEach(i => { LABEL[i[0]] = i[1]; }));
  const STATUT_LABEL = {};
  STATUTS.forEach(s => { STATUT_LABEL[s[0]] = s[1]; });
  const REASON_LABEL = {
    fonction_responsabilite: 'fonction à responsabilité',
    diplome_a_verifier: 'diplôme / licence d\'entraîneur à vérifier',
    transfert: 'changement de club (transfert)',
    mineur: 'joueur mineur',
    age_inconnu: 'date de naissance non vérifiable',
    contrat_pro: 'contrat professionnel (homologation fédérale)',
    hors_periode: 'hors période d\'enregistrement',
    international: 'joueur venant de l\'étranger (certificat de transfert international possible)'
  };

  const IS_ADMIN_PAGE = /admin\.html/i.test(location.pathname);

  /* ───────────── utilitaires ───────────── */
  function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function structName(s) { return (s.nom || s.name || s.nomStructure || '').toString(); }
  function iso() { return new Date().toISOString(); }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString('fr-FR'); } catch (e) { return ''; } }

  function myUid() {
    try { if (window.auth && window.auth.currentUser) return window.auth.currentUser.uid; } catch (e) {}
    try { if (window.firebase && firebase.auth && firebase.auth().currentUser) return firebase.auth().currentUser.uid; } catch (e) {}
    const c = window.currentUser || {};
    const p = window.userProfile || {};
    return c.uid || c.id || p.uid || p.id || null;
  }

  /* ───────────── accès Firestore (compat ou modulaire) ───────────── */
  let _fs = null;
  async function fs() {
    if (_fs) return _fs;
    const cdb = (window.db && typeof window.db.collection === 'function') ? window.db
      : ((window.firebase && firebase.firestore) ? firebase.firestore() : null);
    if (cdb) {
      _fs = {
        async list(c, wh) { let q = cdb.collection(c); (wh || []).forEach(w => { q = q.where(w[0], w[1], w[2]); }); const s = await q.get(); return s.docs.map(d => Object.assign({ id: d.id }, d.data())); },
        async get(c, id) { const d = await cdb.collection(c).doc(id).get(); return d.exists ? Object.assign({ id: d.id }, d.data()) : null; },
        async getPath(path) { const d = await cdb.doc(path).get(); return d.exists ? d.data() : null; },
        async set(c, id, data) { await cdb.collection(c).doc(id).set(data); },
        async update(c, id, data) { await cdb.collection(c).doc(id).update(data); }
      };
      return _fs;
    }
    if (!window.db || FS_URL.indexOf('http') !== 0) throw new Error('Firestore indisponible');
    const m = await import(FS_URL);
    _fs = {
      async list(c, wh) { const cs = (wh || []).map(w => m.where(w[0], w[1], w[2])); const s = await m.getDocs(m.query.apply(null, [m.collection(window.db, c)].concat(cs))); return s.docs.map(d => Object.assign({ id: d.id }, d.data())); },
      async get(c, id) { const d = await m.getDoc(m.doc(window.db, c, id)); return d.exists() ? Object.assign({ id: d.id }, d.data()) : null; },
      async getPath(path) { const d = await m.getDoc(m.doc(window.db, path)); return d.exists() ? d.data() : null; },
      async set(c, id, data) { await m.setDoc(m.doc(window.db, c, id), data); },
      async update(c, id, data) { await m.updateDoc(m.doc(window.db, c, id), data); }
    };
    return _fs;
  }

  /* ───────────── structures (clubs) ───────────── */
  let _structs = null;
  async function loadStructs() {
    if (_structs) return _structs;
    const all = await (await fs()).list('structuresSportives');
    _structs = all.filter(s => !/f[eé]d[eé]ration|ligue/i.test(String(s.type || '')));
    return _structs;
  }

  /* ───────────── contrôles football (côté app) ───────────── */
  async function memberAge() {
    const p = window.userProfile || {};
    let ddn = p.dateNaissance || '';
    if (!ddn) {
      try { const d = await (await fs()).getPath('users/' + myUid() + '/private/sensible'); ddn = (d && d.dateNaissance) || ''; } catch (e) {}
    }
    if (!ddn) return { age: null, categorie: '' };
    const d = new Date(ddn);
    if (isNaN(d)) return { age: null, categorie: '' };
    const n = new Date();
    let age = n.getFullYear() - d.getFullYear();
    const m = n.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < d.getDate())) age--;
    const y = n.getFullYear() - d.getFullYear();
    const cat = y <= 12 ? 'U13' : y <= 14 ? 'U15' : y <= 16 ? 'U17' : y <= 19 ? 'U20' : 'Seniors';
    return { age: age, categorie: cat };
  }

  async function loadPeriods() {
    try { const c = await (await fs()).get(CFG, 'windows'); return (c && c.periods) || []; } catch (e) { return []; }
  }

  async function inWindow() {
    const per = await loadPeriods();
    if (!per.length) return true;
    const t = new Date().toISOString().slice(0, 10);
    return per.some(p => p.start <= t && t <= p.end);
  }

  async function computeReasons(fonction, st, statutJoueur) {
    const reasons = [];
    const p = window.userProfile || {};
    if (COACH.indexOf(fonction) >= 0) reasons.push('diplome_a_verifier');
    if (HIGH.indexOf(fonction) >= 0) reasons.push('fonction_responsabilite');
    const emp = p.employeur || '';
    if (typeof emp === 'string' && emp !== '' && emp !== structName(st)) reasons.push('transfert');
    const a = await memberAge();
    if (a.age === null) reasons.push('age_inconnu'); else if (a.age < 18 && fonction === 'joueur') reasons.push('mineur');
    if (fonction === 'joueur') {
      if (statutJoueur === 'professionnel') reasons.push('contrat_pro');
      if (!(await inWindow())) reasons.push('hors_periode');
      if (/sportif_etranger|gabonais_diaspora/.test(p.role || '')) reasons.push('international');
    }
    return { reasons: reasons, categorie: a.categorie };
  }

  /* ═════════════════ PARTIE MEMBRE (index.html) ═════════════════ */
  let _picked = null;
  let _busy = false;
  let _applyError = '';

  function statusBadge(r) {
    if (r.status === 'pending') return r.needsAdmin ? '⏳ En attente de l\'administration' : '⏳ En attente du club';
    if (r.status === 'approved') return r.appliedAt ? '✅ Validée — rattachement appliqué' : '✅ Validée';
    if (r.status === 'rejected') return '❌ Refusée';
    if (r.status === 'cancelled') return '🚫 Annulée';
    return esc(r.status);
  }

  function reasonsText(r) {
    const a = (r.adminReasons || []).map(x => REASON_LABEL[x] || x);
    return a.length ? 'Contrôle administration : ' + a.join(', ') + '.' : '';
  }

  function extras(r) {
    const a = [];
    if (r.categorie) a.push('Catégorie ' + esc(r.categorie));
    if (r.statutJoueur) a.push(esc(STATUT_LABEL[r.statutJoueur] || r.statutJoueur));
    if (r.diplome) a.push('Diplôme : ' + esc(r.diplome));
    if (r.licence) a.push('Licence n° ' + esc(r.licence));
    if (r.clubQuitte) a.push('Club quitté : ' + esc(r.clubQuitte));
    return a.length ? '<div style="opacity:.85">' + a.join(' · ') + '</div>' : '';
  }

  function ensureMemberPanel() {
    let panel = document.getElementById('cjm-panel');
    if (panel) return panel;
    const anchor = document.getElementById('prof-club-info-card') || document.getElementById('ged-depot-panel');
    if (!anchor) return null;
    panel = document.createElement('div');
    panel.id = 'cjm-panel';
    panel.className = 'card mb-16 fade-up';
    panel.style.display = 'none';
    anchor.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function buildMemberForm(panel) {
    const p = window.userProfile || {};
    const role = norm(p.role);
    const pre = /joueu|player|independ|etranger|diaspora|eleve|handisport|ancien/.test(role) ? 'joueur' : '';
    const opts = FONCTIONS.map(g => '<optgroup label="' + esc(g.g) + '">' + g.items.map(i =>
      '<option value="' + i[0] + '"' + (i[0] === pre ? ' selected' : '') + '>' + esc(i[1]) + '</option>').join('') + '</optgroup>').join('');
    panel.innerHTML =
      '<div class="dash-card-title">🤝 Rejoindre un club</div>' +
      '<p style="font-size:12px;color:var(--gray-txt);margin:0 0 10px;">Choisissez votre club et votre fonction. Le club valide les demandes courantes ; l\'administration contrôle les mineurs, les transferts, les contrats professionnels, les entraîneurs, le médical et la direction.</p>' +
      '<div class="form-group"><label>Club</label>' +
      '<input type="text" id="cjm-search" placeholder="Rechercher un club…" autocomplete="off" oninput="GFCClubJoin.search()">' +
      '<div id="cjm-results"></div><div id="cjm-picked" style="margin-top:6px;font-size:13px;"></div></div>' +
      '<div class="form-group"><label>Votre fonction</label><select id="cjm-fonction" onchange="GFCClubJoin.hint()">' + opts + '</select>' +
      '<div id="cjm-hint" style="font-size:11.5px;color:var(--gray-txt);margin-top:4px;"></div></div>' +
      '<div class="form-group" id="cjm-wrap-statut"><label>Statut de joueur</label><select id="cjm-statut">' +
      STATUTS.map(s => '<option value="' + s[0] + '">' + esc(s[1]) + '</option>').join('') + '</select></div>' +
      '<div class="form-group" id="cjm-wrap-diplome" style="display:none;"><label>Diplôme / licence / titre</label>' +
      '<input type="text" id="cjm-diplome" maxlength="80" list="cjm-diplomes" placeholder="Ex : Licence CAF B, n° d\'ordre…">' +
      '<datalist id="cjm-diplomes">' + DIPLOMES.map(d => '<option value="' + esc(d) + '">').join('') + '</datalist></div>' +
      '<div class="form-group"><label>N° de licence FEGAFOOT (si vous en avez un)</label><input type="text" id="cjm-licence" maxlength="40"></div>' +
      '<div class="form-group"><label>Message (facultatif)</label><textarea id="cjm-msg" rows="2" maxlength="500" placeholder="Présentez-vous brièvement…"></textarea></div>' +
      '<button class="btn btn-primary" id="cjm-send" onclick="GFCClubJoin.submit()">📨 Envoyer la demande</button>' +
      '<div id="cjm-status" style="font-size:12.5px;margin-top:8px;"></div>' +
      '<div id="cjm-list" style="margin-top:14px;"></div>';
    panel.querySelector('#cjm-results').addEventListener('click', function (e) {
      const b = e.target.closest('[data-sid]');
      if (b) pick(b.getAttribute('data-sid'));
    });
    hint();
  }

  function hint() {
    const el = document.getElementById('cjm-hint');
    const f = document.getElementById('cjm-fonction');
    if (!el || !f) return;
    const v = f.value;
    el.textContent = HIGH.indexOf(v) >= 0
      ? 'ℹ️ Cette fonction est validée par l\'administration (contrôle de sécurité).'
      : 'ℹ️ Cette demande est validée par le club.';
    const ws = document.getElementById('cjm-wrap-statut');
    const wd = document.getElementById('cjm-wrap-diplome');
    if (ws) ws.style.display = v === 'joueur' ? '' : 'none';
    if (wd) wd.style.display = DIPLOMA_REQ.indexOf(v) >= 0 ? '' : 'none';
  }

  async function search() {
    const q = norm((document.getElementById('cjm-search') || {}).value || '');
    const box = document.getElementById('cjm-results');
    if (!box) return;
    if (q.length < 2) { box.innerHTML = ''; return; }
    try {
      const all = await loadStructs();
      const found = all.filter(s => norm(structName(s)).indexOf(q) >= 0).slice(0, 8);
      box.innerHTML = found.length ? found.map(s =>
        '<button type="button" class="btn btn-secondary" style="display:block;width:100%;text-align:left;margin-top:4px;" data-sid="' + esc(s.id) + '">' +
        esc(structName(s)) + (s.type ? ' <small style="opacity:.7">· ' + esc(s.type) + '</small>' : '') + '</button>').join('')
        : '<div style="font-size:12px;color:var(--gray-txt);margin-top:4px;">Aucun club trouvé.</div>';
    } catch (e) {
      console.error('[GFCClubJoin] recherche', e);
      box.innerHTML = '<div style="font-size:12px;color:#c0392b;">Impossible de charger les clubs.</div>';
    }
  }

  async function pick(sid) {
    const all = await loadStructs();
    _picked = all.find(s => s.id === sid) || null;
    const box = document.getElementById('cjm-picked');
    const res = document.getElementById('cjm-results');
    if (res) res.innerHTML = '';
    if (box) box.innerHTML = _picked ? '✅ Club choisi : <strong>' + esc(structName(_picked)) + '</strong>' : '';
  }

  function setStatus(msg, ok) {
    const el = document.getElementById('cjm-status');
    if (el) { el.style.color = ok ? '#1e8449' : '#c0392b'; el.textContent = msg; }
  }

  async function submit() {
    const uid = myUid();
    const p = window.userProfile || {};
    if (!uid) return setStatus('Connectez-vous pour envoyer une demande.', false);
    if (!_picked) return setStatus('Choisissez d\'abord un club.', false);
    const fonction = document.getElementById('cjm-fonction').value;
    const message = (document.getElementById('cjm-msg').value || '').trim().slice(0, 500);
    const diplome = (document.getElementById('cjm-diplome').value || '').trim().slice(0, 80);
    const licence = (document.getElementById('cjm-licence').value || '').trim().slice(0, 40);
    const statutJoueur = fonction === 'joueur' ? document.getElementById('cjm-statut').value : '';
    if (DIPLOMA_REQ.indexOf(fonction) >= 0 && !diplome) return setStatus('Indiquez votre diplôme, licence ou titre pour cette fonction.', false);
    const btn = document.getElementById('cjm-send');
    if (btn) btn.disabled = true;
    try {
      const F = await fs();
      const id = uid + '_' + _picked.id;
      const existing = await F.get(COLL, id);
      if (existing && existing.status === 'pending') { setStatus('Une demande est déjà en attente pour ce club.', false); return; }
      if (existing && existing.status === 'approved') { setStatus('Votre demande a déjà été validée pour ce club.', true); await refreshMember(); return; }
      const c = await computeReasons(fonction, _picked, statutJoueur);
      const now = iso();
      const data = {
        memberUid: uid,
        memberName: [p.prenom, p.nom].filter(Boolean).join(' ') || p.pseudo || p.nomOrganisation || '',
        memberRole: p.role || '',
        kind: fonction === 'joueur' ? 'player' : 'staff',
        fonction: fonction,
        structureId: _picked.id,
        structureName: structName(_picked),
        status: 'pending',
        needsAdmin: c.reasons.length > 0,
        adminReasons: c.reasons,
        message: message,
        createdAt: now,
        updatedAt: now
      };
      if (fonction === 'joueur') { data.statutJoueur = statutJoueur; if (c.categorie) data.categorie = c.categorie; }
      if (diplome) data.diplome = diplome;
      if (licence) data.licence = licence;
      if (c.reasons.indexOf('transfert') >= 0 && p.employeur) data.clubQuitte = String(p.employeur).slice(0, 120);
      await F.set(COLL, id, data);
      setStatus(c.reasons.length ? 'Demande envoyée — elle sera examinée par l\'administration.' : 'Demande envoyée au club.', true);
      document.getElementById('cjm-msg').value = '';
      await refreshMember();
    } catch (e) {
      console.error('[GFCClubJoin] envoi', e);
      setStatus('Envoi impossible : ' + (e.message || e), false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function cancel(id) {
    if (!confirm('Annuler cette demande ?')) return;
    try { await (await fs()).update(COLL, id, { status: 'cancelled', updatedAt: iso() }); await refreshMember(); }
    catch (e) { console.error(e); alert('Annulation impossible : ' + (e.message || e)); }
  }

  async function applyApproved(reqs) {
    const uid = myUid();
    const todo = reqs.filter(r => r.status === 'approved' && !r.appliedAt)
      .sort((a, b) => String(b.decidedAt || '').localeCompare(String(a.decidedAt || '')))[0];
    if (!todo) return false;
    const F = await fs();
    const upd = { employeur: todo.structureName, club: todo.structureName };
    if (todo.kind === 'player' && todo.statutJoueur) upd.statut = todo.statutJoueur;
    try {
      await F.update('users', uid, upd);
      const at = iso();
      await F.update(COLL, todo.id, { appliedAt: at });
      todo.appliedAt = at;
      _applyError = '';
      Object.assign(window.userProfile || {}, upd);
      return true;
    } catch (e) {
      console.error('[GFCClubJoin] application du rattachement', e);
      _applyError = 'Demande validée, mais le profil n\'a pas pu être mis à jour automatiquement : ' + (e.message || e);
      return false;
    }
  }

  async function refreshMember() {
    const list = document.getElementById('cjm-list');
    if (!list) return;
    const uid = myUid();
    if (!uid) { list.innerHTML = ''; return; }
    try {
      const reqs = (await (await fs()).list(COLL, [['memberUid', '==', uid]]))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const applied = await applyApproved(reqs);
      if (applied && typeof window.renderProfile === 'function') { try { window.renderProfile(); } catch (e) {} }
      list.innerHTML = (_applyError ? '<div style="color:#c0392b;font-size:12.5px;margin-bottom:6px;">' + esc(_applyError) + '</div>' : '') +
        (reqs.length ? '<div style="font-weight:600;margin-bottom:6px;">Mes demandes</div>' + reqs.map(r =>
        '<div style="border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:8px 10px;margin-top:6px;font-size:12.5px;">' +
        '<div><strong>' + esc(r.structureName) + '</strong> · ' + esc(LABEL[r.fonction] || r.fonction) + '</div>' +
        '<div>' + statusBadge(r) + ' <span style="opacity:.6">(' + fmtDate(r.createdAt) + ')</span></div>' +
        extras(r) +
        (r.status === 'pending' && reasonsText(r) ? '<div style="opacity:.75">' + esc(reasonsText(r)) + '</div>' : '') +
        (r.status === 'rejected' && r.rejectionMessage ? '<div style="color:#c0392b">Motif : ' + esc(r.rejectionMessage) + '</div>' : '') +
        (r.status === 'pending' ? '<button class="btn btn-secondary" style="margin-top:6px;" onclick="GFCClubJoin.cancel(\'' + esc(r.id) + '\')">Annuler la demande</button>' : '') +
        '</div>').join('') : '');
    } catch (e) {
      console.error('[GFCClubJoin] liste', e);
      list.innerHTML = '';
    }
  }

  /* ═════════════════ PARTIE CLUB (index.html) ═════════════════ */
  function ensureClubPanel() {
    let panel = document.getElementById('cjc-panel');
    if (panel) return panel;
    const anchor = document.getElementById('claim-club-panel') || document.getElementById('ged-depot-panel') || document.getElementById('prof-club-info-card');
    if (!anchor) return null;
    panel = document.createElement('div');
    panel.id = 'cjc-panel';
    panel.className = 'card mb-16 fade-up';
    panel.style.display = 'none';
    panel.innerHTML = '<div class="dash-card-title">📥 Demandes d\'intégration reçues</div><div id="cjc-list" style="margin-top:8px;"></div>';
    anchor.insertAdjacentElement('afterend', panel);
    return panel;
  }

  async function mySids() {
    const p = window.userProfile || {};
    const uid = myUid();
    const ids = new Set();
    if (p.structureId) ids.add(p.structureId);
    try { (await (await fs()).list('structuresSportives', [['addedBy', '==', uid]])).forEach(s => ids.add(s.id)); } catch (e) {}
    return Array.from(ids);
  }

  async function refreshClub() {
    const list = document.getElementById('cjc-list');
    if (!list) return;
    try {
      const F = await fs();
      let all = [];
      for (const sid of await mySids()) {
        try { all = all.concat(await F.list(COLL, [['structureId', '==', sid]])); } catch (e) { console.error('[GFCClubJoin] club', e); }
      }
      all.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const pend = all.filter(r => r.status === 'pending');
      const done = all.filter(r => r.status !== 'pending' && r.status !== 'cancelled').slice(0, 10);
      if (!all.length) { list.innerHTML = '<div style="font-size:12.5px;color:var(--gray-txt);">Aucune demande pour le moment.</div>'; return; }
      const card = (r, actions) =>
        '<div style="border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:8px 10px;margin-top:6px;font-size:12.5px;">' +
        '<div><strong>' + esc(r.memberName || 'Membre') + '</strong> · ' + esc(LABEL[r.fonction] || r.fonction) + '</div>' +
        '<div>' + statusBadge(r) + ' <span style="opacity:.6">(' + fmtDate(r.createdAt) + ')</span></div>' +
        extras(r) +
        (r.message ? '<div style="opacity:.85">« ' + esc(r.message) + ' »</div>' : '') + actions + '</div>';
      list.innerHTML =
        (pend.length ? '<div style="font-weight:600;">En attente (' + pend.length + ')</div>' + pend.map(r => card(r, r.needsAdmin
          ? '<div style="opacity:.75">Validation réservée à l\'administration. ' + esc(reasonsText(r)) + '</div>'
          : '<div style="margin-top:6px;display:flex;gap:8px;">' +
            '<button class="btn btn-primary" onclick="GFCClubJoin.decide(\'' + esc(r.id) + '\',\'approved\')">✅ Accepter</button>' +
            '<button class="btn btn-secondary" onclick="GFCClubJoin.decide(\'' + esc(r.id) + '\',\'rejected\')">❌ Refuser</button></div>')).join('') : '') +
        (done.length ? '<div style="font-weight:600;margin-top:12px;">Dernières décisions</div>' + done.map(r => card(r, '')).join('') : '');
    } catch (e) {
      console.error('[GFCClubJoin] panneau club', e);
    }
  }

  async function decide(id, status) {
    let reason = '';
    if (status === 'rejected') reason = prompt('Motif du refus (visible par le demandeur) :', '') || '';
    const upd = { status: status, decidedAt: iso(), decidedBy: myUid(), decidedByRole: 'club' };
    if (status === 'rejected') upd.rejectionMessage = reason || 'Demande non retenue par le club.';
    try { await (await fs()).update(COLL, id, upd); await refreshClub(); }
    catch (e) { console.error(e); alert('Décision impossible : ' + (e.message || e)); }
  }

  /* ───────────── visibilité selon le profil ───────────── */
  let _lastKey = '';
  async function updateVisibility() {
    if (_busy) return;
    _busy = true;
    try {
      const p = window.userProfile;
      if (!p) return;
      const role = p.role || '';
      const isOrg = ORG_ROLES.indexOf(role) >= 0;
      const noJoin = NO_JOIN_ROLES.indexOf(role) >= 0;
      const mp = ensureMemberPanel();
      if (mp) {
        const show = !isOrg && !noJoin;
        mp.style.display = show ? '' : 'none';
        if (show) { if (!mp.querySelector('#cjm-list')) buildMemberForm(mp); await refreshMember(); }
      }
      const cp = ensureClubPanel();
      if (cp) {
        cp.style.display = isOrg ? '' : 'none';
        if (isOrg) await refreshClub();
      }
      _lastKey = (myUid() || '') + '|' + role;
    } catch (e) { console.error('[GFCClubJoin]', e); }
    finally { _busy = false; }
  }

  function patchRenderProfile() {
    if (typeof window.renderProfile === 'function' && !window.renderProfile._joinPatched) {
      const _orig = window.renderProfile;
      window.renderProfile = function () {
        const r = _orig.apply(this, arguments);
        try { setTimeout(updateVisibility, 0); } catch (e) {}
        return r;
      };
      window.renderProfile._joinPatched = true;
    }
  }

  /* ═════════════════ PARTIE ADMIN (admin.html) ═════════════════ */
  const SEC = 'club-joins', NAV = 'nav-club-joins', MNAV = 'mnav-club-joins';

  function adminInject() {
    if (!document.getElementById(NAV)) {
      const anchor = document.getElementById('nav-club-validations') || document.getElementById('nav-clubs') || document.getElementById('nav-joueurs');
      if (anchor) anchor.insertAdjacentHTML('afterend', '<button class="nav-item" id="' + NAV + '"><span class="nav-icon">🤝</span><span>Intégrations clubs</span></button>');
    }
    if (!document.getElementById(MNAV)) {
      const mn = document.querySelector('.mobile-nav');
      if (mn) mn.insertAdjacentHTML('beforeend', '<button class="mn-btn" id="' + MNAV + '"><span class="mn-icon">🤝</span><span>Intégr.</span></button>');
    }
    [document.getElementById(NAV), document.getElementById(MNAV)].forEach(b => {
      if (b && !b._gfcJoin) { b._gfcJoin = true; b.addEventListener('click', adminShow); }
    });
    if (!document.getElementById(SEC)) {
      const main = document.querySelector('.main-content') || document.querySelector('main');
      if (main) main.insertAdjacentHTML('beforeend',
        '<div id="' + SEC + '" class="section"><div class="dash-card">' +
        '<div class="dash-card-title">🤝 Demandes d\'intégration club</div>' +
        '<p style="font-size:12px;color:var(--gray-txt);">Joueurs et membres du staff demandant à rejoindre un club. Le club tranche seul les cas courants ; ' +
        'mineurs, transferts, contrats professionnels, entraîneurs, médical et direction vous reviennent.</p>' +
        '<div style="border:1px dashed rgba(128,128,128,.4);border-radius:10px;padding:10px;margin:10px 0;">' +
        '<div style="font-weight:600;font-size:12.5px;">📅 Périodes d\'enregistrement des joueurs</div>' +
        '<div style="font-size:11.5px;color:var(--gray-txt);margin:4px 0 8px;">Hors de ces périodes, les demandes de joueurs passent par l\'administration. Sans période configurée, aucun contrôle de date.</div>' +
        '<div id="cj-periods"></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;">' +
        '<input type="date" id="cj-p-start"> <input type="date" id="cj-p-end"> <input type="text" id="cj-p-label" placeholder="Libellé (ex : mercato été)" style="min-width:140px;">' +
        '<button class="btn-sm" onclick="GFCClubJoin.addPeriod()">➕ Ajouter</button></div></div>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0;">' +
        '<select id="cj-filter" onchange="GFCClubJoin.adminRender()">' +
        '<option value="pending_admin">⏳ À valider par l\'admin</option><option value="pending">⏳ Toutes en attente</option>' +
        '<option value="approved">✅ Validées</option><option value="rejected">❌ Refusées</option><option value="all">Toutes</option></select>' +
        '<span id="cj-count" style="font-size:12px;color:var(--gray-txt);"></span></div>' +
        '<div id="cj-table"></div></div></div>');
    }
  }

  function adminShow() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById(SEC);
    if (sec) sec.classList.add('active');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    const n = document.getElementById(NAV); if (n) n.classList.add('active');
    const m = document.getElementById(MNAV); if (m) m.classList.add('active');
    const t = document.getElementById('topbar-title'); if (t && t.firstChild) t.firstChild.textContent = 'Intégrations clubs';
    const sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
    const ov = document.getElementById('sidebar-overlay'); if (ov) ov.classList.remove('open');
    adminRender();
  }

  async function renderPeriods() {
    const box = document.getElementById('cj-periods');
    if (!box) return;
    const per = await loadPeriods();
    box.innerHTML = per.length ? per.map((p, i) =>
      '<div style="font-size:12.5px;margin-top:3px;">' + esc(p.label || 'Période') + ' : ' + esc(p.start) + ' → ' + esc(p.end) +
      ' <button class="btn-sm" onclick="GFCClubJoin.delPeriod(' + i + ')">🗑️</button></div>').join('')
      : '<div style="font-size:12px;color:var(--gray-txt);">Aucune période configurée.</div>';
  }

  async function addPeriod() {
    const s = (document.getElementById('cj-p-start') || {}).value;
    const e = (document.getElementById('cj-p-end') || {}).value;
    const l = ((document.getElementById('cj-p-label') || {}).value || '').trim();
    if (!s || !e || e < s) { alert('Renseignez une date de début et une date de fin valides.'); return; }
    try {
      const per = await loadPeriods();
      per.push({ start: s, end: e, label: l });
      await (await fs()).set(CFG, 'windows', { periods: per, updatedAt: iso() });
      await renderPeriods();
    } catch (err) { console.error(err); alert('Enregistrement impossible : ' + (err.message || err)); }
  }

  async function delPeriod(i) {
    try {
      const per = await loadPeriods();
      per.splice(i, 1);
      await (await fs()).set(CFG, 'windows', { periods: per, updatedAt: iso() });
      await renderPeriods();
    } catch (err) { console.error(err); alert('Suppression impossible : ' + (err.message || err)); }
  }

  async function adminRender() {
    const box = document.getElementById('cj-table');
    if (!box) return;
    box.innerHTML = '<div style="font-size:12.5px;">Chargement…</div>';
    renderPeriods();
    try {
      let rows = await (await fs()).list(COLL);
      const f = (document.getElementById('cj-filter') || {}).value || 'pending_admin';
      rows = rows.filter(r => f === 'all' ? true : f === 'pending_admin' ? (r.status === 'pending' && r.needsAdmin) : r.status === f)
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const c = document.getElementById('cj-count'); if (c) c.textContent = rows.length + ' demande(s)';
      box.innerHTML = rows.length ? rows.map(r =>
        '<div style="border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:10px;margin-top:8px;font-size:12.5px;">' +
        '<div><strong>' + esc(r.memberName || r.memberUid) + '</strong> <span style="opacity:.7">(' + esc(r.memberRole) + ')</span> → <strong>' + esc(r.structureName) + '</strong></div>' +
        '<div>Fonction : ' + esc(LABEL[r.fonction] || r.fonction) + ' · ' + statusBadge(r) + ' · ' + fmtDate(r.createdAt) + '</div>' +
        extras(r) +
        (reasonsText(r) ? '<div style="opacity:.8">' + esc(reasonsText(r)) + '</div>' : '') +
        (r.message ? '<div style="opacity:.85">« ' + esc(r.message) + ' »</div>' : '') +
        (r.status === 'rejected' && r.rejectionMessage ? '<div style="color:#c0392b">Motif : ' + esc(r.rejectionMessage) + '</div>' : '') +
        (r.status === 'pending' ? '<div style="margin-top:8px;display:flex;gap:8px;">' +
          '<button class="btn-sm" onclick="GFCClubJoin.adminDecide(\'' + esc(r.id) + '\',\'approved\')">✅ Approuver</button>' +
          '<button class="btn-sm" onclick="GFCClubJoin.adminDecide(\'' + esc(r.id) + '\',\'rejected\')">❌ Refuser</button></div>' : '') +
        '</div>').join('') : '<div style="font-size:12.5px;color:var(--gray-txt);">Aucune demande.</div>';
    } catch (e) {
      console.error('[GFCClubJoin] admin', e);
      box.innerHTML = '<div style="color:#c0392b;font-size:12.5px;">Erreur de chargement : ' + esc(e.message || e) + '</div>';
    }
  }

  async function adminDecide(id, status) {
    let reason = '';
    if (status === 'rejected') reason = prompt('Motif du refus (visible par le demandeur) :', '') || '';
    const upd = { status: status, decidedAt: iso(), decidedBy: myUid(), decidedByRole: 'admin' };
    if (status === 'rejected') upd.rejectionMessage = reason || 'Demande non retenue par l\'administration.';
    try { await (await fs()).update(COLL, id, upd); await adminRender(); }
    catch (e) { console.error(e); alert('Décision impossible : ' + (e.message || e)); }
  }

  /* ───────────── démarrage ───────────── */
  function boot() {
    if (IS_ADMIN_PAGE) {
      let n = 0;
      const t = setInterval(function () {
        adminInject();
        if ((document.getElementById(NAV) && document.getElementById(SEC)) || ++n > 40) clearInterval(t);
      }, 750);
      return;
    }
    patchRenderProfile();
    if (typeof window.renderProfile !== 'function') window.addEventListener('load', patchRenderProfile);
    // Filet de sécurité : l'app peut appeler renderProfile() en interne sans passer par window
    setInterval(function () {
      const p = window.userProfile;
      if (!p || _busy) return;
      const key = (myUid() || '') + '|' + (p.role || '');
      const missing = !document.getElementById('cjm-panel') && !document.getElementById('cjc-panel') &&
        (document.getElementById('prof-club-info-card') || document.getElementById('ged-depot-panel'));
      if (key !== _lastKey || missing) updateVisibility();
    }, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GFCClubJoin = { search, pick, hint, submit, cancel, decide, refresh: updateVisibility, adminRender, adminDecide, addPeriod, delPeriod };

})(window);
