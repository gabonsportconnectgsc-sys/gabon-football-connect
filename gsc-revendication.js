/* gsc-revendication : demande de revendication d'une fiche existante (sans aucun droit avant validation admin) */
(function () {
  var URL = 'https://firestore.googleapis.com/v1/projects/gabon-football-connect/databases/(default)/documents:runQuery';
  var ROLES = { ligue: 'Ligue', club: 'Club', federation: 'Fédération', association: 'Association', organisateur: 'Organisateur', ecole_universite: 'École / Université' };
  var cache = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sv(f, k) { var x = f && f[k]; return x && x.stringValue !== undefined ? x.stringValue : ''; }
  async function load(r) {
    if (cache[r]) return cache[r];
    var res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'users' }], where: { fieldFilter: { field: { fieldPath: 'role' }, op: 'EQUAL', value: { stringValue: r } } }, limit: 300 } }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var rows = await res.json();
    var out = rows.filter(function (x) { return x.document; }).map(function (x) {
      var f = x.document.fields || {};
      return { id: x.document.name.split('/').pop(), nom: sv(f, 'nomOrganisation') || sv(f, 'nom'), ville: sv(f, 'ville'),
        locked: !!(f.editLocked && f.editLocked.booleanValue), owner: sv(f, 'ownerUid'), st: sv(f, 'ownershipStatus') };
    }).filter(function (x) { return x.nom && !x.owner && (x.locked || /^pending_owner_claim/.test(x.st)); });
    out.sort(function (a, b) { return a.nom.localeCompare(b.nom); });
    return (cache[r] = out);
  }
  async function onRole(r) {
    var old = document.getElementById('gsc-claim-box'); if (old) old.remove();
    if (!ROLES[r]) return;
    var anchor = document.getElementById('a-org-president'); anchor = anchor && anchor.closest('.fg');
    if (!anchor) return;
    var box = document.createElement('div'); box.className = 'fg'; box.id = 'gsc-claim-box';
    box.innerHTML = '<label>🙋 Cette entité existe déjà dans l’application ?</label><select id="a-revendication-select"><option value="">— Non, c’est une nouvelle structure —</option></select>'
      + '<div class="form-hint">Si vous dirigez une entité déjà listée, sélectionnez-la. Votre demande sera examinée par l’administration GSC : vous n’aurez aucun droit de gestion avant validation.</div>';
    anchor.parentNode.insertBefore(box, anchor);
    try {
      var list = await load(r), sel = document.getElementById('a-revendication-select');
      if (!sel) return;
      sel.insertAdjacentHTML('beforeend', list.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.nom) + (x.ville ? ' — ' + esc(x.ville) : '') + '</option>'; }).join(''));
    } catch (e) { var h = box.querySelector('.form-hint'); if (h) h.textContent = 'Liste indisponible pour le moment : vous pouvez continuer comme nouvelle structure.'; }
  }
  var n = 0, iv = setInterval(function () {
    var o = window.pickRole;
    if (typeof o === 'function' && !o.__gc) {
      var f = function (r) { var x = o.apply(this, arguments); try { onRole(r); } catch (e) {} return x; };
      f.__gc = 1; window.pickRole = f; clearInterval(iv);
    } else if (++n > 60) clearInterval(iv);
  }, 500);
})();
