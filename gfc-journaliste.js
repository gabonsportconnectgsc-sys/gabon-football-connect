/* JOURNALISTE.JS v1 - profil Journaliste sportif (GSC / GFC) : formulaire, donnees, edition, fiche, styles. */
(function (w, d) {
  'use strict';
  var TYPES = [['presse', 'Presse écrite'], ['radio', 'Radio'], ['tv', 'Télévision'], ['web', 'Presse en ligne / site web'],
    ['photo', 'Photographe / photo-reportage'], ['video', 'Reporter d\'images / vidéo'], ['agence', 'Agence de presse'],
    ['podcast', 'Podcast, YouTube, réseaux sociaux'], ['pigiste', 'Indépendant / pigiste']];
  var RUBS = [['football', 'Football'], ['basket', 'Basket-ball'], ['athletisme', 'Athlétisme'], ['combat', 'Sports de combat'],
    ['handvolley', 'Handball et volley-ball'], ['tennis', 'Tennis, golf et sports individuels'], ['feminin', 'Sport féminin'],
    ['jeunes', 'Sport scolaire et jeunes talents'], ['handisport', 'Handisport'], ['traditionnels', 'Sports et jeux traditionnels'],
    ['business', 'Économie et business du sport'], ['tous', 'Tous les sports (généraliste)']];
  var EMET = [['ministere', 'Ministère chargé de la Communication (Commission nationale de la carte de presse)'], ['autre', 'Autre organisme (à préciser)']];
  var STAT = [['detenue', 'Je détiens une carte de presse'], ['en_cours', 'Ma demande est en cours'], ['aucune', 'Je n\'ai pas de carte de presse']];
  var EXPER = ['Moins de 3 ans', '3 à 5 ans', '5 à 10 ans', 'Plus de 10 ans'];
  var DIPL = ['Sans diplôme', 'Licence / Bac+3', 'Master / Bac+5', 'Doctorat', 'Diplôme d\'école de journalisme', 'Autre'];

  var css = '.jr-chk-grid{display:grid;grid-template-columns:1fr;gap:6px}' +
    '.jr-chk{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;cursor:pointer;background:#fff;color:#0f172a}' +
    '.jr-chk input{width:18px;height:18px;flex:none}' +
    '.role-badge.journaliste{background:#475569;color:#fff}.badge-journaliste{background:#e2e8f0;color:#1e293b}.acr-badge.journaliste{background:#e2e8f0;color:#1e293b}' +
    '.actor-type-dot.journaliste{background:linear-gradient(135deg,#475569,#1e293b)}' +
    '.actor-filter-btn[data-type="journaliste"]{border-color:#475569;color:#1e293b;background:rgba(71,85,105,.08)}' +
    '.actor-filter-btn[data-type="journaliste"].active{background:linear-gradient(135deg,#475569,#1e293b);color:#fff}' +
    '.stats-grid .stat-card:has(.stat-wm[data-wm-role="journaliste"]){--bc:#94A3B8}';
  if (d && d.createElement) {
    var st = d.createElement('style'); st.id = 'jr-css'; st.textContent = css; (d.head || d.documentElement).appendChild(st);
  }

  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function arr(x) { return Array.isArray(x) ? x.filter(Boolean) : []; }
  function el(id) { return d.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || '').trim() : ''; }
  function lines(id, max) { return val(id).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, max || 15); }
  function checked(name) { return [].slice.call(d.querySelectorAll('input[name="' + name + '"]:checked')).map(function (e) { return e.value; }); }
  function find(list, k) { for (var i = 0; i < list.length; i++) if (list[i][0] === k) return list[i][1]; return null; }
  function label(k) { return find(TYPES, k) || find(RUBS, k) || find(EMET, k) || k; }
  function labelType(k) { return find(TYPES, k) || k; }
  function labelRub(k) { return find(RUBS, k) || k; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function fmtDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (s || ''); }

  /* lecture d'un formulaire : prefix = 'a-jou' (inscription / profil) ou 'edit-jou' (edition) */
  function read(prefix, g) {
    var f = function (s) { return prefix + '-' + s; };
    var stt = val(f('statut')), det = stt === 'detenue', em = det ? val(f('emetteur')) : '';
    var dp = el(f('dispo'));
    return {
      titrePrincipal: val(f('titre')), mediaActuel: val(f('media')),
      typesPresse: checked(f('type')), rubriques: checked(f('rub')),
      niveauExperience: val(f('niveau')), niveauDiplome: val(f('diplome')),
      diplomes: lines(f('diplomes')), postes: lines(f('postes')), anciensMedias: lines(f('anciens')),
      evenementsCouverts: lines(f('events')), portfolio: lines(f('portfolio'), 10),
      resumeParcours: val(f('resume')).slice(0, 1200), liensSociaux: val(f('liens')),
      disponibleCollab: !!(dp && dp.checked),
      cartePresseStatut: stt,
      cartePresseNumero: det ? val(f('cp-num')) : '', cartePresseCode: det ? val(f('cp-code')) : '',
      cartePresseEmetteur: em, cartePresseEmetteurAutre: em === 'autre' ? val(f('cp-autre')) : '',
      cartePresseDelivrance: det ? val(f('cp-deliv')) : '', cartePresseValidite: det ? val(f('cp-valid')) : ''
    };
  }
  function data() { return read('a-jou'); }
  function editRead() { return read('edit-jou'); }

  function options(list, cur, pairs) {
    return ['<option value="">—</option>'].concat(list.map(function (s) {
      var v = pairs ? s[0] : s, t = pairs ? s[1] : s;
      return '<option value="' + E(v) + '"' + (v === cur ? ' selected' : '') + '>' + E(t) + '</option>';
    })).join('');
  }
  function checks(list, name, cur) {
    return '<div class="jr-chk-grid">' + list.map(function (s) {
      return '<label class="jr-chk"><input type="checkbox" name="' + name + '" value="' + s[0] + '"' + (cur && cur.indexOf(s[0]) >= 0 ? ' checked' : '') + '><span>' + s[1] + '</span></label>';
    }).join('') + '</div>';
  }

  /* ---------- formulaire d'inscription / profil (classes de inscription.html) ---------- */
  function formHtml() {
    return '<div class="notice"><span>📰</span><span>Le profil Journaliste sportif est vérifié par l\'administration avant d\'apparaître dans l\'annuaire. ' +
      'La carte de presse est facultative : au Gabon, elle est délivrée par le ministère chargé de la Communication. Son numéro et son code ne sont pas affichés publiquement.</span></div>' +
      '<div class="subsection">📰 Identité professionnelle</div>' +
      '<div class="fg"><label>Fonction actuelle *</label><input type="text" id="a-jou-titre" placeholder="ex: Journaliste reporter · Rédacteur en chef · Commentateur"/></div>' +
      '<div class="fg"><label>Média ou entreprise actuel</label><input type="text" id="a-jou-media" placeholder="Nom du journal, de la radio, de la chaîne, du site…"/></div>' +
      '<div class="subsection">✅ Type de média (cochez au moins un) *</div><div id="a-jou-type-box">' + checks(TYPES, 'a-jou-type') + '</div>' +
      '<div class="subsection">🏅 Rubriques sportives couvertes</div><div id="a-jou-rub-box">' + checks(RUBS, 'a-jou-rub') + '</div>' +
      '<div class="form-row">' +
      '<div class="fg"><label>Expérience</label><select id="a-jou-niveau">' + options(EXPER) + '</select></div>' +
      '<div class="fg"><label>Niveau de diplôme</label><select id="a-jou-diplome">' + options(DIPL) + '</select></div></div>' +
      '<div class="subsection">🎓 Formation et parcours</div>' +
      '<div class="fg"><label>Diplômes et formations</label><textarea id="a-jou-diplomes" placeholder="Un par ligne. ex: Master de journalisme&#10;Formation reporter radio"></textarea></div>' +
      '<div class="fg"><label>Postes occupés</label><textarea id="a-jou-postes" placeholder="Un par ligne. ex: Reporter sportif&#10;Chef de rubrique sports"></textarea></div>' +
      '<div class="fg"><label>Anciens médias</label><textarea id="a-jou-anciens" placeholder="Un par ligne"></textarea></div>' +
      '<div class="fg"><label>Événements couverts</label><textarea id="a-jou-events" placeholder="Un par ligne. ex: CAN 2017&#10;Jeux de la Francophonie"></textarea></div>' +
      '<div class="fg"><label>Biographie / CV résumé</label><textarea id="a-jou-resume" placeholder="Présentez votre parcours (max 1200 caractères)"></textarea></div>' +
      '<div class="fg"><label>Portfolio : liens vers vos articles, reportages, vidéos</label><textarea id="a-jou-portfolio" placeholder="Un lien par ligne (https://…)"></textarea></div>' +
      '<div class="fg"><label>Liens (site, réseaux sociaux)</label><input type="text" id="a-jou-liens" placeholder="https://…"/></div>' +
      '<div class="subsection">🪪 Carte professionnelle de presse</div>' +
      '<div class="fg"><label>Situation</label><select id="a-jou-statut">' + options(STAT, '', true) + '</select></div>' +
      '<div id="a-jou-cp-fg" style="display:none;">' +
      '<div class="form-row"><div class="fg"><label>N° de la carte</label><input type="text" id="a-jou-cp-num"/></div>' +
      '<div class="fg"><label>Code</label><input type="text" id="a-jou-cp-code"/></div></div>' +
      '<div class="fg"><label>Entité ayant délivré la carte</label><select id="a-jou-emetteur">' + options(EMET, '', true) + '</select></div>' +
      '<div class="fg" id="a-jou-cp-autre-fg" style="display:none;"><label>Précisez l\'organisme</label><input type="text" id="a-jou-cp-autre"/></div>' +
      '<div class="form-row"><div class="fg"><label>Date de délivrance</label><input type="date" id="a-jou-cp-deliv"/></div>' +
      '<div class="fg"><label>Valable jusqu\'au</label><input type="date" id="a-jou-cp-valid"/></div></div></div>' +
      '<div class="cb-row"><input type="checkbox" id="a-jou-dispo"/><label for="a-jou-dispo">Disponible pour des collaborations, interviews, reportages</label></div>';
  }
  function refresh() {
    var s = el('a-jou-statut'), g = el('a-jou-cp-fg'), e = el('a-jou-emetteur'), a = el('a-jou-cp-autre-fg');
    if (g && s) g.style.display = s.value === 'detenue' ? '' : 'none';
    if (a && e) a.style.display = e.value === 'autre' ? '' : 'none';
  }
  function build() {
    var root = el('a-jou-root');
    if (!root) return;
    if (!root.firstChild) root.innerHTML = formHtml();
    if (!root.__jr) { root.__jr = 1; root.addEventListener('change', refresh); }
    refresh();
  }
  function setV(id, v) { var e = el(id); if (e) e.value = (v == null ? '' : v); }
  function setChecks(name, a) { [].forEach.call(d.querySelectorAll('input[name="' + name + '"]'), function (c) { c.checked = a.indexOf(c.value) >= 0; }); }
  function fill(x, n) {
    x = x || {}; n = n || 0;
    var box = el('a-jou-type-box');
    if ((!box || !box.firstChild) && n < 20) { setTimeout(function () { build(); fill(x, n + 1); }, 250); return; }
    var j = function (a) { return arr(a).join('\n'); };
    setV('a-jou-titre', x.titrePrincipal); setV('a-jou-media', x.mediaActuel);
    setV('a-jou-niveau', x.niveauExperience); setV('a-jou-diplome', x.niveauDiplome);
    setV('a-jou-diplomes', j(x.diplomes)); setV('a-jou-postes', j(x.postes)); setV('a-jou-anciens', j(x.anciensMedias));
    setV('a-jou-events', j(x.evenementsCouverts)); setV('a-jou-portfolio', j(x.portfolio));
    setV('a-jou-resume', x.resumeParcours); setV('a-jou-liens', x.liensSociaux);
    setChecks('a-jou-type', arr(x.typesPresse)); setChecks('a-jou-rub', arr(x.rubriques));
    var dp = el('a-jou-dispo'); if (dp) dp.checked = !!x.disponibleCollab;
    setV('a-jou-statut', x.cartePresseStatut); setV('a-jou-cp-num', x.cartePresseNumero); setV('a-jou-cp-code', x.cartePresseCode);
    setV('a-jou-emetteur', x.cartePresseEmetteur); setV('a-jou-cp-autre', x.cartePresseEmetteurAutre);
    setV('a-jou-cp-deliv', x.cartePresseDelivrance); setV('a-jou-cp-valid', x.cartePresseValidite);
    refresh();
  }

  /* ---------- edition du profil (index.html : classes form-group) ---------- */
  function editHtml(p, esc) {
    esc = esc || E; p = p || {};
    var f = function (s) { return 'edit-jou-' + s; };
    var ls = function (a) { return esc(arr(a).join('\n')); };
    var h = '<div class="section-divider" style="border-color:#475569;">📰 Profil journaliste sportif</div>';
    h += '<div class="form-group"><label>Fonction actuelle</label><input type="text" id="' + f('titre') + '" value="' + esc(p.titrePrincipal || '') + '" placeholder="ex: Journaliste reporter · Rédacteur en chef"></div>';
    h += '<div class="form-group"><label>Média ou entreprise actuel</label><input type="text" id="' + f('media') + '" value="' + esc(p.mediaActuel || '') + '"></div>';
    h += '<div class="form-group"><label>Type de média</label>' + checks(TYPES, f('type'), arr(p.typesPresse)) + '</div>';
    h += '<div class="form-group"><label>Rubriques sportives couvertes</label>' + checks(RUBS, f('rub'), arr(p.rubriques)) + '</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div class="form-group"><label>Expérience</label><select id="' + f('niveau') + '">' + options(EXPER, p.niveauExperience) + '</select></div>' +
      '<div class="form-group"><label>Niveau de diplôme</label><select id="' + f('diplome') + '">' + options(DIPL, p.niveauDiplome) + '</select></div></div>';
    h += '<div class="form-group"><label>Diplômes et formations (un par ligne)</label><textarea id="' + f('diplomes') + '">' + ls(p.diplomes) + '</textarea></div>';
    h += '<div class="form-group"><label>Postes occupés (un par ligne)</label><textarea id="' + f('postes') + '">' + ls(p.postes) + '</textarea></div>';
    h += '<div class="form-group"><label>Anciens médias (un par ligne)</label><textarea id="' + f('anciens') + '">' + ls(p.anciensMedias) + '</textarea></div>';
    h += '<div class="form-group"><label>Événements couverts (un par ligne)</label><textarea id="' + f('events') + '">' + ls(p.evenementsCouverts) + '</textarea></div>';
    h += '<div class="form-group"><label>Biographie / CV résumé (1200 car. max)</label><textarea id="' + f('resume') + '" maxlength="1200">' + esc(p.resumeParcours || '') + '</textarea></div>';
    h += '<div class="form-group"><label>Portfolio : liens articles, reportages, vidéos (un par ligne)</label><textarea id="' + f('portfolio') + '">' + ls(p.portfolio) + '</textarea></div>';
    h += '<div class="form-group"><label>Liens (site, réseaux sociaux)</label><input type="text" id="' + f('liens') + '" value="' + esc(p.liensSociaux || '') + '" placeholder="https://…"></div>';
    h += '<div class="section-divider" style="border-color:#475569;">🪪 Carte professionnelle de presse</div>';
    h += '<div class="form-group"><label>Situation</label><select id="' + f('statut') + '">' + options(STAT, p.cartePresseStatut, true) + '</select></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div class="form-group"><label>N° de la carte</label><input type="text" id="' + f('cp-num') + '" value="' + esc(p.cartePresseNumero || '') + '"></div>' +
      '<div class="form-group"><label>Code</label><input type="text" id="' + f('cp-code') + '" value="' + esc(p.cartePresseCode || '') + '"></div></div>';
    h += '<div class="form-group"><label>Entité ayant délivré la carte</label><select id="' + f('emetteur') + '">' + options(EMET, p.cartePresseEmetteur, true) + '</select></div>';
    h += '<div class="form-group"><label>Si « Autre » : précisez l\'organisme</label><input type="text" id="' + f('cp-autre') + '" value="' + esc(p.cartePresseEmetteurAutre || '') + '"></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div class="form-group"><label>Délivrée le</label><input type="date" id="' + f('cp-deliv') + '" value="' + esc(p.cartePresseDelivrance || '') + '"></div>' +
      '<div class="form-group"><label>Valable jusqu\'au</label><input type="date" id="' + f('cp-valid') + '" value="' + esc(p.cartePresseValidite || '') + '"></div></div>';
    h += '<div class="form-group"><small style="color:#64748b;">Renseignez le numéro, le code, l\'entité et les dates uniquement si vous détenez une carte.</small></div>';
    h += '<div class="form-group"><label class="cb-inline"><input type="checkbox" id="' + f('dispo') + '"' + (p.disponibleCollab ? ' checked' : '') + '> Disponible pour des collaborations, interviews, reportages</label></div>';
    return h;
  }

  /* ---------- fiche (affichage) ---------- */
  function ficheHtml(a, esc, priv) {
    esc = esc || E; a = a || {};
    var row = function (l, v) { return v ? '<div class="adm-info-row"><span class="adm-info-label">' + l + '</span><span class="adm-info-val">' + esc(String(v)) + '</span></div>' : ''; };
    var links = arr(a.portfolio).map(function (u) {
      return /^https?:\/\//i.test(u) ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>' : esc(u);
    }).join('<br>');
    var h = '<div class="adm-section"><div class="adm-section-title">📰 Profil journaliste sportif</div>';
    h += row('Fonction', a.titrePrincipal);
    h += row('Média actuel', a.mediaActuel);
    h += row('Type de média', arr(a.typesPresse).map(labelType).join(' · '));
    h += row('Rubriques', arr(a.rubriques).map(labelRub).join(' · '));
    h += row('Expérience', a.niveauExperience);
    h += row('Niveau de diplôme', a.niveauDiplome);
    h += row('Diplômes et formations', arr(a.diplomes).join(' · '));
    h += row('Postes occupés', arr(a.postes).join(' · '));
    h += row('Anciens médias', arr(a.anciensMedias).join(' · '));
    h += row('Événements couverts', arr(a.evenementsCouverts).join(' · '));
    h += row('Biographie', a.resumeParcours);
    if (links) h += '<div class="adm-info-row"><span class="adm-info-label">Portfolio</span><span class="adm-info-val">' + links + '</span></div>';
    h += row('Liens', a.liensSociaux);
    h += row('Collaborations', a.disponibleCollab ? 'Disponible pour collaborations, interviews, reportages' : '');
    var s = a.cartePresseStatut;
    var st = s === 'detenue' ? '🪪 Carte de presse déclarée par le journaliste' : s === 'en_cours' ? '⏳ Demande de carte en cours' : s === 'aucune' ? 'Sans carte de presse' : '';
    h += row('Carte de presse', st);
    if (s === 'detenue') {
      h += row('Délivrée par', a.cartePresseEmetteur === 'autre' ? (a.cartePresseEmetteurAutre || 'Autre organisme') : (find(EMET, a.cartePresseEmetteur) || ''));
      h += row('Délivrée le', fmtDate(a.cartePresseDelivrance));
      var v = a.cartePresseValidite;
      h += row('Valable jusqu\'au', v ? fmtDate(v) + (v < today() ? ' (expirée)' : '') : '');
      if (priv) { h += row('N° de carte', a.cartePresseNumero); h += row('Code', a.cartePresseCode); }
    }
    return h + '</div>';
  }

  w.JOURNALISTE = { TYPES: TYPES, RUBS: RUBS, EMET: EMET, STAT: STAT, data: data, editRead: editRead, editHtml: editHtml, ficheHtml: ficheHtml,
    fill: fill, build: build, label: label, labelType: labelType, labelRub: labelRub };
  if (d && d.readyState) { if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', build); else build(); setTimeout(build, 500); }
})(window, document);
