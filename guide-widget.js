/*!
 * guide-widget.js — Module « Comment ça marche » — version Gabon Football Connect (GFC)
 *
 * Ajoute à l’application :
 *   1. une bulle éphémère au démarrage de l’accueil
 *   2. une ligne « Comment ça marche » dans le menu latéral
 *   3. un bouton permanent sur les pages admin
 *   4. une fenêtre de guide avec un onglet par profil :
 *      Visiteur, Acteur, Structure, Admin
 *
 * INSTALLATION : copier ce fichier à la racine du projet, puis ajouter
 * avant </body> de chaque page concernée :
 *     <script src="guide-widget.js" defer></script>
 * Tout se règle dans le bloc CONFIG ci-dessous. Rien d’autre à modifier.
 *
 * API : GuideWidget.open()            ouvre le guide (profil par défaut)
 *       GuideWidget.open("admin")     ouvre le guide sur un profil précis
 *       GuideWidget.close()           ferme le guide
 */
(function () {
  if (window.GuideWidget) return;

  /* ============================================================
   *  CONFIG — seul bloc à adapter
   * ============================================================ */
  var CONFIG = {
    title: "❓ Comment ça marche",

    // Reconnaissance des pages (expressions régulières sur l’adresse)
    homePathRegex: /(\/|index\.html)$/,
    adminPathRegex: /admin/i,

    // Ligne ajoutée au menu latéral, juste sous un élément existant
    // (lien, bouton ou ligne cliquable). null = ne pas toucher au menu.
    menuLabel: "❓ Comment ça marche",
    menuAnchor: { textRegex: /Rôles et accès/i, hrefContains: null },

    // Bulle éphémère affichée sur la page d’accueil
    toast: {
      enabled: true,
      text: "Comment ça marche ?",
      delayMs: 1500,
      durationMs: 7000,
      oncePerSession: true,
      bottomPx: 84 // à ajuster s’il y a une barre de navigation en bas
    },

    // Bouton permanent sur les pages admin
    fab: { enabled: true, text: "❓ Comment ça marche", side: "left" }, // "left" ou "right"

    color: "#009E60", // vert GFC
    defaultRole: "visiteur", // profil ouvert sur les pages normales
    defaultAdminRole: "admin", // profil ouvert sur les pages admin

    // Profils GFC
    roles: [
      {
        id: "visiteur",
        label: "🔍 Visiteur",
        intro: "Je consulte le football gabonais, avec ou sans compte.",
        secs: [
          { t: "✅ Ce que je peux faire", p: [
            "Consulter l’annuaire des acteurs sans inscription.",
            "Voir les statistiques et la carte des terrains.",
            "Lire les actualités et le forum.",
            "Créer un compte simple pour publier et commenter.",
            "Devenir supporter 💗 d’un club depuis mon profil."
          ]},
          { t: "⚠️ Ce que je dois faire", p: [
            "Créer un compte pour publier, commenter ou modifier.",
            "Indiquer mon prénom, mon nom et ma ville.",
            "Rester respectueux dans le forum."
          ]},
          { t: "🔧 Comment faire", p: [
            "Touchez ☰ pour ouvrir le menu.",
            "Choisissez Annuaire, Carte, Forum ou Actualités.",
            "Touchez Se connecter, puis Inscription pour créer un compte.",
            "Touchez 📲 Installer l’application pour l’ajouter à l’écran d’accueil."
          ]},
          { t: "⭐ Points importants", p: [
            "En mode visiteur, tout est en lecture seule.",
            "Ne partagez jamais votre mot de passe.",
            "Vous pouvez supprimer votre compte depuis le menu."
          ]}
        ]
      },
      {
        id: "acteur",
        label: "⚽ Acteur",
        intro: "Je suis joueur, entraîneur, arbitre ou autre acteur du football.",
        secs: [
          { t: "✅ Ce que je peux faire", p: [
            "Avoir ma fiche : photo, historique et palmarès.",
            "Apparaître dans l’annuaire dès mon inscription.",
            "Afficher mon QR code et scanner celui d’un autre acteur.",
            "Ajouter des photos et des documents à mon profil.",
            "Accepter ou refuser l’offre de rattachement d’un club.",
            "Publier dans le forum et ajouter un terrain sur la carte."
          ]},
          { t: "⚠️ Ce que je dois faire", p: [
            "Choisir le bon rôle dès l’inscription.",
            "Renseigner poste, pied fort, catégorie et club actuel.",
            "Indiquer mon statut : libre, sous contrat, amateur ou professionnel.",
            "Garder mes informations à jour."
          ]},
          { t: "🔧 Comment faire", p: [
            "Touchez Se connecter, puis Inscription.",
            "Choisissez votre rôle et remplissez le formulaire.",
            "Ouvrez Mon profil, puis ✏️ Modifier mon profil.",
            "Touchez 📱 Mon QR Code pour l’afficher ou l’imprimer.",
            "Touchez 📎 Ajouter pour joindre un document."
          ]},
          { t: "⭐ Points importants", p: [
            "Après acceptation d’un club, la fiche est gérée par ce club.",
            "Aux niveaux National et International, la fédération gère la fiche.",
            "Une bannière indique quelle structure contacter pour modifier.",
            "Un document marqué 🔒 sous contrat ne peut plus être supprimé."
          ]}
        ]
      },
      {
        id: "structure",
        label: "🏟️ Structure",
        intro: "Je représente un club, une association, une fédération ou un organisateur.",
        secs: [
          { t: "✅ Ce que je peux faire", p: [
            "Gérer ma fiche : identité, gouvernance et infrastructures.",
            "Créer mes effectifs par saison et par catégorie.",
            "Déposer mes documents administratifs obligatoires.",
            "Envoyer une offre de rattachement à un joueur.",
            "Publier une page publique de mes effectifs.",
            "Suivre mon badge de conformité Bronze, Argent ou Or."
          ]},
          { t: "⚠️ Ce que je dois faire", p: [
            "Déposer statuts, récépissé et licence fédérale.",
            "Attendre la validation de l’administration GFC.",
            "Mettre à jour mes effectifs à chaque saison.",
            "Répondre aux demandes de rattachement."
          ]},
          { t: "🔧 Comment faire", p: [
            "Inscrivez-vous avec le rôle Club, Association, Fédération ou Organisateur.",
            "Ouvrez Mon profil, puis touchez Gérer mes effectifs.",
            "Touchez Voir la page publique pour contrôler l’affichage.",
            "Ajoutez vos documents depuis votre fiche structure."
          ]},
          { t: "⭐ Points importants", p: [
            "Votre fiche est visible aussitôt, avec la mention ⏳ en attente de validation.",
            "Le public voit des effectifs agrégés, jamais la liste nominative.",
            "Un joueur doit accepter lui-même votre offre de rattachement."
          ]}
        ]
      },
      {
        id: "admin",
        label: "🛠️ Admin",
        intro: "Je supervise la plateforme GFC (accès réservé).",
        secs: [
          { t: "✅ Ce que je peux faire", p: [
            "Valider les inscriptions et les structures.",
            "Vérifier les documents administratifs.",
            "Gérer les rattachements entre clubs, fédérations et joueurs.",
            "Modérer le forum et traiter les signalements.",
            "Publier des actualités et gérer les terrains.",
            "Consulter les rapports et les statistiques."
          ]},
          { t: "⚠️ Ce que je dois faire", p: [
            "Contrôler les fiches en attente de validation.",
            "Vérifier les documents avant de valider une structure.",
            "Traiter rapidement les signalements.",
            "Garder l’accès admin confidentiel."
          ]},
          { t: "🔧 Comment faire", p: [
            "Ouvrez Administration depuis le menu, ou la Console Admin complète.",
            "Utilisez les onglets : Utilisateurs, Acteurs, Sites, Actualités, Rapports.",
            "Filtrez par rôle, statut, ville ou niveau.",
            "Utilisez les boutons d’action sur chaque ligne."
          ]},
          { t: "⭐ Points importants", p: [
            "Masquez d’abord un compte douteux, supprimez ensuite.",
            "Vérifiez deux fois avant toute suppression.",
            "Ne changez jamais un rôle sans vérification."
          ]}
        ]
      }
    ]
  };

  /* ============================================================
   *  Code du module — ne pas modifier
   * ============================================================ */
  var path = location.pathname;
  var isAdmin = CONFIG.adminPathRegex.test(path);
  var isHome = !isAdmin && CONFIG.homePathRegex.test(path);
  var c = CONFIG.color;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  var css =
    ".gw-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);padding:16px}" +
    ".gw-modal.on{display:flex}" +
    ".gw-card{background:#1b2030;color:#fff;max-width:440px;width:100%;max-height:85vh;overflow:auto;border-radius:16px;padding:18px;border:1px solid " + c + ";font-family:inherit}" +
    ".gw-card h3{margin:0 0 12px;color:#35d08a;font-size:18px}" +
    ".gw-card h4{margin:14px 0 6px;color:#ffd24d;font-size:14px}" +
    ".gw-card ol{margin:0;padding-left:20px;line-height:1.5;font-size:14px}" +
    ".gw-card li{margin-bottom:5px}" +
    ".gw-x{float:right;background:" + c + ";color:#fff;border:0;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer}" +
    ".gw-tabs{display:flex;gap:6px;margin:0 0 12px}" +
    ".gw-tab{flex:1;background:#2a3147;color:#fff;border:0;border-radius:10px;padding:8px 4px;font-size:12px;cursor:pointer}" +
    ".gw-tab.on{background:" + c + ";font-weight:700}" +
    ".gw-intro{margin:0;color:#ccc;font-size:13px}" +
    ".gw-toast{position:fixed;left:12px;right:12px;bottom:" + CONFIG.toast.bottomPx + "px;z-index:99998;max-width:360px;margin:auto;background:" + c + ";color:#fff;border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.4);transition:opacity .4s,transform .4s;cursor:pointer;font-size:14px}" +
    ".gw-toast.off{opacity:0;transform:translateY(10px)}" +
    ".gw-toast b{flex:1}" +
    ".gw-toast button{background:rgba(0,0,0,.25);color:#fff;border:0;border-radius:50%;width:26px;height:26px;cursor:pointer}" +
    ".gw-fab{position:fixed;" + (CONFIG.fab.side === "right" ? "right" : "left") + ":12px;bottom:16px;z-index:99997;background:" + c + ";color:#fff;border:0;border-radius:999px;padding:10px 16px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.4);cursor:pointer}";

  var modal, tabsEl, bodyEl;

  function findRole(id) {
    for (var i = 0; i < CONFIG.roles.length; i++) {
      if (CONFIG.roles[i].id === id) return CONFIG.roles[i];
    }
    return CONFIG.roles[0];
  }

  function render(id) {
    var r = findRole(id);
    tabsEl.innerHTML = CONFIG.roles.map(function (x) {
      return "<button class='gw-tab" + (x.id === r.id ? " on" : "") + "' data-r='" + esc(x.id) + "'>" + esc(x.label) + "</button>";
    }).join("");
    bodyEl.innerHTML = "<p class='gw-intro'>" + esc(r.intro) + "</p>" + r.secs.map(function (s) {
      return "<h4>" + esc(s.t) + "</h4><ol>" + s.p.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>";
    }).join("");
    modal.querySelector(".gw-card").scrollTop = 0;
  }

  function open(roleId) {
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "gw-modal";
      modal.innerHTML = "<div class='gw-card'><button class='gw-x' aria-label='Fermer'>✕</button><h3>" + esc(CONFIG.title) + "</h3><div class='gw-tabs'></div><div class='gw-body'></div></div>";
      tabsEl = modal.querySelector(".gw-tabs");
      bodyEl = modal.querySelector(".gw-body");
      modal.addEventListener("click", function (e) {
        var t = e.target;
        if (t === modal || t.className === "gw-x") close();
        else if (t.getAttribute && t.getAttribute("data-r")) render(t.getAttribute("data-r"));
      });
      document.body.appendChild(modal);
    }
    render(roleId || (isAdmin ? CONFIG.defaultAdminRole : CONFIG.defaultRole));
    modal.classList.add("on");
  }

  function close() {
    if (modal) modal.classList.remove("on");
  }

  // Cherche l’élément de référence : lien, bouton ou ligne cliquable.
  function addMenu() {
    var cfg = CONFIG.menuAnchor;
    if (!cfg || document.getElementById("gwMenuItem")) return;
    var els = [].slice.call(document.querySelectorAll("a, button, [onclick]"));
    var ref = els.filter(function (a) {
      var txt = (a.textContent || "").trim();
      if (txt.length > 60 || !cfg.textRegex.test(txt)) return false;
      if (cfg.hrefContains) return (a.getAttribute("href") || "").indexOf(cfg.hrefContains) > -1;
      return true;
    })[0];
    if (!ref) return;
    var a = ref.cloneNode(false);
    a.removeAttribute("onclick");
    a.id = "gwMenuItem";
    if (a.tagName === "A") a.setAttribute("href", "#");
    var ico = ref.querySelector(".smi-ico");
    if (ico) {
      // Même structure que les autres lignes du menu GFC : icône + texte
      var parts = CONFIG.menuLabel.split(" ");
      var emoji = parts.shift();
      a.innerHTML = "<span class='" + esc(ico.className) + "'>" + esc(emoji) + "</span>" + esc(parts.join(" "));
    } else {
      a.textContent = CONFIG.menuLabel;
    }
    a.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      open();
    });
    ref.parentNode.insertBefore(a, ref.nextSibling);
  }

  function showToast() {
    var T = CONFIG.toast;
    if (!T.enabled) return;
    if (T.oncePerSession) {
      try {
        if (sessionStorage.getItem("gwSeen")) return;
        sessionStorage.setItem("gwSeen", "1");
      } catch (e) {}
    }
    var t = document.createElement("div");
    t.className = "gw-toast";
    t.innerHTML = "<span>❓</span><b>" + esc(T.text) + "</b><button aria-label='Fermer'>✕</button>";
    function hide() {
      t.classList.add("off");
      setTimeout(function () { t.remove(); }, 500);
    }
    t.addEventListener("click", function (e) {
      if (e.target.tagName === "BUTTON") hide();
      else { hide(); open(); }
    });
    document.body.appendChild(t);
    setTimeout(hide, T.durationMs);
  }

  function addFab() {
    if (!CONFIG.fab.enabled) return;
    var b = document.createElement("button");
    b.className = "gw-fab";
    b.textContent = CONFIG.fab.text;
    b.addEventListener("click", function () { open(); });
    document.body.appendChild(b);
  }

  function init() {
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
    addMenu();
    var timer;
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(addMenu, 300);
    }).observe(document.body, { childList: true, subtree: true });
    if (isAdmin) {
      var gwOff = false;
      try { gwOff = !!localStorage.getItem("gwFabOff"); } catch (e) {}
      if (!gwOff) {
        addFab();
        var gwSt = document.createElement("style");
        gwSt.textContent = ".gw-fab{bottom:80px!important;padding:8px 12px!important;font-size:13px!important}.gw-fab .gw-fab-x{margin-left:8px;padding:2px 6px;border-left:1px solid rgba(255,255,255,.5);font-weight:700}";
        document.head.appendChild(gwSt);
        setTimeout(function () {
          var fb = document.querySelector(".gw-fab");
          if (!fb || fb.querySelector(".gw-fab-x")) return;
          var x = document.createElement("span");
          x.className = "gw-fab-x";
          x.textContent = "✕";
          x.setAttribute("aria-label", "Fermer");
          x.addEventListener("click", function (ev) {
            ev.stopPropagation(); ev.preventDefault();
            try { localStorage.setItem("gwFabOff", "1"); } catch (e) {}
            fb.remove();
          });
          fb.appendChild(x);
        }, 300);
      }
    }
    if (isHome) setTimeout(showToast, CONFIG.toast.delayMs);
  }

  window.GuideWidget = { open: open, close: close, config: CONFIG };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
