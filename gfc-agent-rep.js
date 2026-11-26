/* gfc-agent-rep.js — GFC : représentation d'un joueur par un agent (licence FIFA)
 * Parcours : l'agent déclare (n° de licence + accord écrit) → le joueur accepte
 * (consentement du représentant légal si mineur) → l'administration vérifie la licence → active.
 * Un joueur ne peut avoir qu'un seul agent actif à la fois. Dépend de gfc-club-join.js. */
(function (window) {
  'use strict';

  const COLL = 'agentRepresentations';
  const ORG = ['club', 'federation', 'association', 'ligue'];
  const NO_PANEL = ['admin', 'supporter'];
  const PLAYER_ROLES = ['joueur', 'independant', 'sportif_etranger', 'gabonais_diaspora', 'eleve_etudiant', 'handisport', 'ancien_sportif'];
  const ST = {
    pending_player: '⏳ En attente de l\'accord du joueur',
    pending_admin: '⏳ Licence en cours de vérification',
    active: '✅ Active',
    rejected: '❌ Refusée',
    cancelled: '🚫 Annulée',
    ended: '⏹️ Terminée'
  };
  const IS_ADMIN_PAGE = /admin\.html/i.test(location.pathname);

  function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function iso() { return new Date().toISOString(); }
  function fmt(d) { try { return new Date(d).toLocaleDateString('fr-FR'); } catch (e) { return ''; } }
  function $(id) { return document.getElementById(id); }
  function val(id) { const e = $(id); return e ? (e.value || '').trim() : ''; }
  function J() { return window.GFCClubJoin || {}; }
  async function F() { return J()._fs(); }
  function uid() { return J()._uid ? J()._uid() : null; }
  function nameOf(a) { return [a.prenom, a.nom].filter(Boolean).join(' ') || a.pseudo || a.nomOrganisation || ''; }

  async function isMinor() {
    const p = window.userProfile || {};
    let ddn = p.dateNaissance || '';
    if (!ddn) { try { const d = await (await F()).getPath('users/' + uid() + '/private/sensible'); ddn = (d && d.dateNaissance) || ''; } catch (e) {} }
    const d = new Date(ddn);
    if (!ddn || isNaN(d)) return false;
    const n = new Date();
    let age = n.getFullYear() - d.getFullYear();
    const m = n.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < d.getDate())) age--;
    return age < 18;
  }

  /* ═════════════════ PARTIE AGENT (index.html) ═════════════════ */
  let _player = null;
  let _busy = false;
  let _lastKey = '';

  function ensureAgentPanel() {
    let el = $('gar-agent-panel');
    if (el) return el;
    const anchor = $('cjm-panel') || $('prof-club-info-card');
    if (!anchor) return null;
    el = document.createElement('details');
    el.id = 'gar-agent-panel';
    el.className = 'card mb-16 fade-up';
    el.style.display = 'none';
    el.innerHTML =
      '<summary style="cursor:pointer;font-weight:600;">🧾 Je suis agent de joueur (licence FIFA)</summary>' +
      '<p style="font-size:12px;color:var(--gray-txt);margin:8px 0;">Réservé aux agents titulaires d\'une licence FIFA. Un accord de représentation écrit est obligatoire et un joueur ne peut avoir qu\'un seul agent à la fois. Le joueur doit accepter votre demande, puis l\'administration vérifie votre licence.</p>' +
      '<div class="form-group"><label>Joueur à représenter</label>' +
      '<input type="text" id="gar-search" placeholder="Rechercher un joueur…" autocomplete="off" oninput="GFCAgentRep.search()">' +
      '<div id="gar-results"></div><div id="gar-picked" style="margin-top:6px;font-size:13px;"></div></div>' +
      '<div class="form-group"><label>N° de licence d\'agent FIFA</label><input type="text" id="gar-licence" maxlength="40"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;"><div class="form-group"><label>Début de l\'accord</label><input type="date" id="gar-start"></div>' +
      '<div class="form-group"><label>Fin de l\'accord</label><input type="date" id="gar-end"></div></div>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin:6px 0;"><input type="checkbox" id="gar-written"> J\'atteste qu\'un accord de représentation écrit a été signé avec ce joueur.</label>' +
      '<button class="btn btn-primary" id="gar-send" onclick="GFCAgentRep.submit()">📨 Envoyer la demande</button>' +
      '<div id="gar-status" style="font-size:12.5px;margin-top:8px;"></div>' +
      '<div id="gar-mine" style="margin-top:12px;"></div>';
    el.querySelector('#gar-results').addEventListener('click', function (e) {
      const b = e.target.closest('[data-pid]');
      if (b) { _player = { id: b.getAttribute('data-pid'), name: b.getAttribute('data-pname') }; $('gar-results').innerHTML = ''; $('gar-picked').innerHTML = '✅ Joueur choisi : <strong>' + esc(_player.name) + '</strong>'; }
    });
    anchor.insertAdjacentElement('afterend', el);
    return el;
  }

  function search() {
    const q = norm(val('gar-search'));
    const box = $('gar-results');
    if (!box) return;
    if (q.length < 2) { box.innerHTML = ''; return; }
    const arr = Array.isArray(window.allActors) ? window.allActors : [];
    const me = uid();
    const found = arr.filter(a => a && (a.uid || a.id) && (a.uid || a.id) !== me && PLAYER_ROLES.indexOf(a.role) >= 0 &&
      norm(nameOf(a) + ' ' + (a.pseudo || '')).indexOf(q) >= 0).slice(0, 6);
    box.innerHTML = found.length ? found.map(a =>
      '<button type="button" class="btn btn-secondary" style="display:block;width:100%;text-align:left;margin-top:4px;" data-pid="' + esc(a.uid || a.id) + '" data-pname="' + esc(nameOf(a)) + '">' +
      esc(nameOf(a)) + ' <small style="opacity:.7">· ' + esc(a.role) + '</small></button>').join('')
      : '<div style="font-size:12px;color:var(--gray-txt);margin-top:4px;">Aucun joueur trouvé (l\'annuaire est peut-être encore en chargement).</div>';
  }

  function status(msg, ok) { const e = $('gar-status'); if (e) { e.style.color = ok ? '#1e8449' : '#c0392b'; e.textContent = msg; } }

  async function submit() {
    const me = uid();
    const p = window.userProfile || {};
    if (!me) return status('Connectez-vous pour envoyer une demande.', false);
    if (!_player) return status('Choisissez d\'abord un joueur.', false);
    const lic = val('gar-licence');
    if (!lic) return status('Indiquez votre numéro de licence d\'agent FIFA.', false);
    if (!($('gar-written') || {}).checked) return status('L\'accord de représentation écrit est obligatoire.', false);
    const btn = $('gar-send');
    if (btn) btn.disabled = true;
    try {
      const f = await F();
      const id = me + '_' + _player.id;
      const ex = await f.get(COLL, id);
      if (ex && ['pending_player', 'pending_admin', 'active'].indexOf(ex.status) >= 0) { status('Une demande existe déjà pour ce joueur.', false); return; }
      const now = iso();
      const data = {
        agentUid: me, agentName: nameOf(p).slice(0, 120), playerUid: _player.id, playerName: (_player.name || '').slice(0, 120),
        status: 'pending_player', fifaLicence: lic.slice(0, 40), agreementWritten: true, createdAt: now, updatedAt: now
      };
      if (val('gar-start')) data.agreementStart = val('gar-start');
      if (val('gar-end')) data.agreementEnd = val('gar-end');
      await f.set(COLL, id, data);
      status('Demande envoyée : le joueur doit maintenant l\'accepter.', true);
      await refreshMine();
    } catch (e) {
      console.error('[GFCAgentRep] envoi', e);
      status('Envoi impossible : ' + (e.message || e), false);
    } finally { if (btn) btn.disabled = false; }
  }

  async function cancel(id) {
    if (!confirm('Annuler cette demande ?')) return;
    try { await (await F()).update(COLL, id, { status: 'cancelled', updatedAt: iso() }); await refreshMine(); }
    catch (e) { console.error(e); alert('Annulation impossible : ' + (e.message || e)); }
  }

  async function refreshMine() {
    const box = $('gar-mine');
    if (!box) return;
    try {
      const rows = (await (await F()).list(COLL, [['agentUid', '==', uid()]])).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      box.innerHTML = rows.length ? '<div style="font-weight:600;margin-bottom:6px;">Mes représentations</div>' + rows.map(r =>
        '<div style="border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:8px 10px;margin-top:6px;font-size:12.5px;">' +
        '<div><strong>' + esc(r.playerName) + '</strong> · licence ' + esc(r.fifaLicence) + '</div>' +
        '<div>' + (ST[r.status] || esc(r.status)) + ' <span style="opacity:.6">(' + fmt(r.createdAt) + ')</span></div>' +
        (r.status === 'rejected' && r.rejectionMessage ? '<div style="color:#c0392b">Motif : ' + esc(r.rejectionMessage) + '</div>' : '') +
        ((r.status === 'pending_player' || r.status === 'pending_admin') ? '<button class="btn btn-secondary" style="margin-top:6px;" onclick="GFCAgentRep.cancel(\'' + esc(r.id) + '\')">Annuler</button>' : '') +
        '</div>').join('') : '';
    } catch (e) { console.error('[GFCAgentRep] liste agent', e); }
  }

  /* ═════════════════ PARTIE JOUEUR (index.html) ═════════════════ */
  function ensurePlayerPanel() {
    let el = $('gar-player-panel');
    if (el) return el;
    const anchor = $('gar-agent-panel') || $('cjm-panel') || $('prof-club-info-card');
    if (!anchor) return null;
    el = document.createElement('div');
    el.id = 'gar-player-panel';
    el.className = 'card mb-16 fade-up';
    el.style.display = 'none';
    el.innerHTML = '<div class="dash-card-title">🧾 Représentation par un agent</div><div id="gar-incoming" style="margin-top:8px;"></div>';
    anchor.insertAdjacentElement('afterend', el);
    return el;
  }

  async function refreshIncoming() {
    const panel = ensurePlayerPanel();
    const box = $('gar-incoming');
    if (!panel || !box) return;
    try {
      const rows = (await (await F()).list(COLL, [['playerUid', '==', uid()]])).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const shown = rows.filter(r => r.status !== 'cancelled');
      panel.style.display = shown.length ? '' : 'none';
      if (!shown.length) return;
      const minor = await isMinor();
      box.innerHTML = shown.map(r =>
        '<div style="border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:8px 10px;margin-top:6px;font-size:12.5px;">' +
        '<div><strong>' + esc(r.agentName) + '</strong> · licence FIFA ' + esc(r.fifaLicence) + '</div>' +
        '<div>' + (ST[r.status] || esc(r.status)) + (r.agreementStart ? ' · accord du ' + esc(r.agreementStart) + (r.agreementEnd ? ' au ' + esc(r.agreementEnd) : '') : '') + '</div>' +
        (r.status === 'pending_player' ?
          (minor ? '<label style="display:flex;gap:8px;margin-top:6px;"><input type="checkbox" id="gar-gc-' + esc(r.id) + '"> Mon représentant légal consent à cette représentation.</label>' : '') +
          '<div style="margin-top:6px;display:flex;gap:8px;">' +
          '<button class="btn btn-primary" onclick="GFCAgentRep.answer(\'' + esc(r.id) + '\',true)">✅ Accepter</button>' +
          '<button class="btn btn-secondary" onclick="GFCAgentRep.answer(\'' + esc(r.id) + '\',false)">❌ Refuser</button></div>' : '') +
        (r.status === 'active' ? '<button class="btn btn-secondary" style="margin-top:6px;" onclick="GFCAgentRep.endIt(\'' + esc(r.id) + '\')">Mettre fin à la représentation</button>' : '') +
        '</div>').join('');
      box._rows = rows;
    } catch (e) { console.error('[GFCAgentRep] liste joueur', e); }
  }

  async function answer(id, accept) {
    const box = $('gar-incoming');
    const rows = (box && box._rows) || [];
    try {
      const f = await F();
      if (accept) {
        if (rows.some(r => r.id !== id && (r.status === 'active' || r.status === 'pending_admin'))) { alert('Vous avez déjà un agent (actif ou en cours de vérification). Mettez d\'abord fin à cette représentation.'); return; }
        const upd = { status: 'pending_admin', playerDecidedAt: iso() };
        if (await isMinor()) {
          const c = $('gar-gc-' + id);
          if (!c || !c.checked) { alert('Le consentement du représentant légal est requis pour un joueur mineur.'); return; }
          upd.guardianConsent = true;
        }
        await f.update(COLL, id, upd);
      } else {
        await f.update(COLL, id, { status: 'rejected', playerDecidedAt: iso() });
      }
      await refreshIncoming();
    } catch (e) { console.error(e); alert('Action impossible : ' + (e.message || e)); }
  }

  async function endIt(id) {
    if (!confirm('Mettre fin à cette représentation ?')) return;
    try { await (await F()).update(COLL, id, { status: 'ended', endedAt: iso() }); await refreshIncoming(); }
    catch (e) { console.error(e); alert('Action impossible : ' + (e.message || e)); }
  }

  async function updateVisibility() {
    if (_busy) return;
    _busy = true;
    try {
      const p = window.userProfile;
      if (!p || !uid()) return;
      const role = p.role || '';
      const ap = ensureAgentPanel();
      if (ap) {
        const show = ORG.indexOf(role) < 0 && NO_PANEL.indexOf(role) < 0;
        ap.style.display = show ? '' : 'none';
        if (show) await refreshMine();
      }
      if (ORG.indexOf(role) < 0 && NO_PANEL.indexOf(role) < 0) await refreshIncoming();
      _lastKey = uid() + '|' + role;
    } catch (e) { console.error('[GFCAgentRep]', e); }
    finally { _busy = false; }
  }

  /* ═════════════════ PARTIE ADMIN (admin.html) ═════════════════ */
  const SEC = 'agent-reps', NAV = 'nav-agent-reps', MNAV = 'mnav-agent-reps';

  function adminInject() {
    if (!$(NAV)) {
      const anchor = $('nav-club-joins') || $('nav-clubs') || $('nav-joueurs');
      if (anchor) anchor.insertAdjacentHTML('afterend', '<button class="nav-item" id="' + NAV + '"><span class="nav-icon">🧾</span><span>Agents de joueurs</span></button>');
    }
    if (!$(MNAV)) {
      const mn = document.querySelector('.mobile-nav');
      if (mn) mn.insertAdjacentHTML('beforeend', '<button class="mn-btn" id="' + MNAV + '"><span class="mn-icon">🧾</span><span>Agents</span></button>');
    }
    [$(NAV), $(MNAV)].forEach(b => { if (b && !b._garBound) { b._garBound = true; b.addEventListener('click', adminShow); } });
    if (!$(SEC)) {
      const main = document.querySelector('.main-content') || (document.querySelector('.section') || {}).parentElement || document.querySelector('main');
      if (main) main.insertAdjacentHTML('beforeend',
        '<div id="' + SEC + '" class="section"><div class="dash-card">' +
        '<div class="dash-card-title">🧾 Représentation par un agent de joueur</div>' +
        '<p style="font-size:12px;color:var(--gray-txt);">Avant d\'activer : vérifiez le numéro de licence d\'agent FIFA, l\'existence d\'un accord de représentation écrit et, pour un mineur, le consentement du représentant légal. Un joueur ne peut avoir qu\'un seul agent actif.</p>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0;">' +
        '<select id="gar-filter" onchange="GFCAgentRep.adminRender()">' +
        '<option value="pending_admin">⏳ À vérifier</option><option value="pending_player">⏳ Attente du joueur</option>' +
        '<option value="active">✅ Actives</option><option value="rejected">❌ Refusées</option><option value="all">Toutes</option></select>' +
        '<span id="gar-count" style="font-size:12px;color:var(--gray-txt);"></span></div>' +
        '<div id="gar-table"></div></div></div>');
    }
  }

  function adminShow() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = $(SEC); if (sec) sec.classList.add('active');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    const n = $(NAV); if (n) n.classList.add('active');
    const m = $(MNAV); if (m) m.classList.add('active');
    const t = $('topbar-title'); if (t && t.firstChild) t.firstChild.textContent = 'Agents de joueurs';
    const sb = $('sidebar'); if (sb) sb.classList.remove('open');
    const ov = $('sidebar-overlay'); if (ov) ov.classList.remove('open');
    adminRender();
  }

  async function adminRender() {
    const box = $('gar-table');
    if (!box) return;
    box.innerHTML = '<div style="font-size:12.5px;">Chargement…</div>';
    try {
      let rows = await (await F()).list(COLL);
      const f = val('gar-filter') || 'pending_admin';
      rows = rows.filter(r => f === 'all' ? true : r.status === f).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const c = $('gar-count'); if (c) c.textContent = rows.length + ' demande(s)';
      box.innerHTML = rows.length ? rows.map(r =>
        '<div style="border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:10px;margin-top:8px;font-size:12.5px;">' +
        '<div><strong>' + esc(r.agentName || r.agentUid) + '</strong> → joueur <strong>' + esc(r.playerName || r.playerUid) + '</strong></div>' +
        '<div>Licence FIFA : <strong>' + esc(r.fifaLicence) + '</strong> · accord écrit déclaré : ' + (r.agreementWritten ? 'oui' : 'non') +
        (r.agreementStart ? ' · du ' + esc(r.agreementStart) + (r.agreementEnd ? ' au ' + esc(r.agreementEnd) : '') : '') + '</div>' +
        (r.guardianConsent ? '<div>👪 Consentement du représentant légal déclaré (joueur mineur)</div>' : '') +
        '<div>' + (ST[r.status] || esc(r.status)) + ' · ' + fmt(r.createdAt) + '</div>' +
        (r.status === 'rejected' && r.rejectionMessage ? '<div style="color:#c0392b">Motif : ' + esc(r.rejectionMessage) + '</div>' : '') +
        '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">' +
        ((r.status === 'pending_admin' || r.status === 'pending_player') ?
          (r.status === 'pending_admin' ? '<button class="btn-sm" onclick="GFCAgentRep.adminDecide(\'' + esc(r.id) + '\',\'active\')">✅ Licence vérifiée — activer</button>' : '') +
          '<button class="btn-sm" onclick="GFCAgentRep.adminDecide(\'' + esc(r.id) + '\',\'rejected\')">❌ Refuser</button>' : '') +
        (r.status === 'active' ? '<button class="btn-sm" onclick="GFCAgentRep.adminDecide(\'' + esc(r.id) + '\',\'ended\')">⏹️ Mettre fin</button>' : '') +
        '</div></div>').join('') : '<div style="font-size:12.5px;color:var(--gray-txt);">Aucune demande.</div>';
    } catch (e) {
      console.error('[GFCAgentRep] admin', e);
      box.innerHTML = '<div style="color:#c0392b;font-size:12.5px;">Erreur de chargement : ' + esc(e.message || e) + '</div>';
    }
  }

  async function adminDecide(id, status) {
    const upd = { status: status, updatedAt: iso() };
    try {
      const f = await F();
      if (status === 'active') {
        const r = await f.get(COLL, id);
        const others = (await f.list(COLL, [['playerUid', '==', r.playerUid]])).filter(x => x.id !== id && x.status === 'active');
        if (others.length) { alert('Ce joueur a déjà un agent actif (' + (others[0].agentName || others[0].agentUid) + '). Mettez d\'abord fin à cette représentation.'); return; }
        upd.verifiedAt = iso(); upd.verifiedBy = uid();
      }
      if (status === 'rejected') upd.rejectionMessage = prompt('Motif du refus (visible par l\'agent) :', '') || 'Demande non retenue par l\'administration.';
      if (status === 'ended') upd.endedAt = iso();
      await f.update(COLL, id, upd);
      await adminRender();
    } catch (e) { console.error(e); alert('Décision impossible : ' + (e.message || e)); }
  }

  /* ───────────── démarrage ───────────── */
  function boot() {
    if (IS_ADMIN_PAGE) {
      let n = 0;
      const t = setInterval(function () {
        adminInject();
        if (($(NAV) && $(SEC)) || ++n > 40) clearInterval(t);
      }, 750);
      return;
    }
    setInterval(function () {
      const p = window.userProfile;
      if (!p || _busy || !window.GFCClubJoin) return;
      const key = (uid() || '') + '|' + (p.role || '');
      const missing = !$('gar-agent-panel') && ($('cjm-panel') || $('prof-club-info-card'));
      if (key !== _lastKey || missing) updateVisibility();
    }, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GFCAgentRep = { search, submit, cancel, answer, endIt, adminRender, adminDecide };

})(window);
