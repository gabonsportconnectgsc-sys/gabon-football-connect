(function () {
  "use strict";
  var FIELDS = ["headTitle", "headSub", "linafpTitle", "linafpText"];
  var DEF = {
    headTitle: "🇬🇦 Football Gabonais",
    headSub: "Fédérations · LINAFP · Ligues Provinciales · OGSSU Scolaire & Universitaire",
    linafpTitle: "⚽ LINAFP — Championnat National 2025-2026",
    linafpText: "Lancé le **7 mars 2026** à Lambaréné. Président : **Brice Mbika Ndjambou**. Champion 2024-2025 : **AS Mangasport** (10e titre). Format : poules + playoffs. D2 démarrée le 21 mars 2026."
  };
  var LIM = { headTitle: 80, headSub: 160, linafpTitle: 100, linafpText: 600 };
  function $(id) { return document.getElementById(id); }
  function db() { return (window.firebase && firebase.firestore) ? firebase.firestore() : null; }
  async function auth() {
    if (typeof window.ensureFirebaseAuthViaSupabase === "function" && window.firebase && typeof firebase.auth === "function") {
      try { await window.ensureFirebaseAuthViaSupabase(); } catch (e) {}
    }
  }
  function msg(t, ok) { var e = $("fbp-msg"); if (e) { e.textContent = t; e.style.color = ok ? "#007a47" : "#b91c1c"; } }
  function fill(d) {
    FIELDS.forEach(function (k) {
      var el = $("fbp-" + k);
      if (el) el.value = (d && typeof d[k] === "string" && d[k].trim()) ? d[k] : DEF[k];
    });
  }
  async function load() {
    var d = db();
    if (!d) { fill(null); msg("Base indisponible.", false); return; }
    try {
      await auth();
      var s = await d.collection("app_config").doc("footballPage").get();
      fill(s.exists ? s.data() : null); msg("", true);
    } catch (e) { fill(null); msg("Lecture impossible : " + (e && e.message || e), false); }
  }
  async function save() {
    var d = db();
    if (!d) { msg("Base indisponible.", false); return; }
    var o = {};
    FIELDS.forEach(function (k) { var el = $("fbp-" + k); o[k] = (el ? el.value : "").trim().slice(0, LIM[k]); });
    o.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    try {
      await auth();
      await d.collection("app_config").doc("footballPage").set(o, { merge: true });
      msg("Enregistré. Visible côté public au prochain chargement.", true);
    } catch (e) { msg("Échec : " + (e && e.message || e), false); }
  }
  function reset() { fill(null); msg("Textes d’origine remis dans les champs : clique sur Enregistrer pour confirmer.", true); }
  function build() {
    var st = 'style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;box-sizing:border-box;"';
    function field(k, label, rows) {
      var tag = rows ? '<textarea id="fbp-' + k + '" rows="' + rows + '" maxlength="' + LIM[k] + '" ' + st + '></textarea>' : '<input id="fbp-' + k + '" type="text" maxlength="' + LIM[k] + '" ' + st + '>';
      return '<div style="margin-bottom:14px;"><label style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;">' + label + '</label>' + tag + '</div>';
    }
    return '<div class="page-header"><div class="page-title">⚽ Football Gabon (page publique)</div></div>'
      + '<div style="background:#fff;border-radius:14px;padding:16px;max-width:640px;">'
      + '<p style="font-size:12.5px;color:#475569;margin:0 0 14px;">Modifie les textes de la page « Football Gabon » de l’application publique. Entoure un mot de **deux astérisques** pour l’afficher en gras.</p>'
      + field("headTitle", "Titre de l’en-tête", 0)
      + field("headSub", "Sous-titre de l’en-tête", 0)
      + field("linafpTitle", "Bannière LINAFP : titre", 0)
      + field("linafpText", "Bannière LINAFP : texte", 5)
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;"><button id="fbp-save" type="button" style="background:#009E60;color:#fff;border:0;border-radius:10px;padding:10px 16px;font-weight:700;">Enregistrer</button>'
      + '<button id="fbp-reset" type="button" style="background:#f1f5f9;color:#0A1628;border:0;border-radius:10px;padding:10px 16px;font-weight:700;">Rétablir les textes d’origine</button></div>'
      + '<div id="fbp-msg" style="margin-top:12px;font-size:12.5px;font-weight:600;"></div></div>';
  }
  function show() {
    document.querySelectorAll(".section").forEach(function (s) { s.classList.remove("active"); });
    var sec = $("fbpage"); if (sec) sec.classList.add("active");
    document.querySelectorAll(".nav-item, .mn-btn").forEach(function (b) { b.classList.remove("active"); });
    var nb = $("nav-fbpage"); if (nb) nb.classList.add("active");
    setTimeout(function () { var t = $("topbar-title"); if (t && t.firstChild) t.firstChild.textContent = "Football Gabon"; }, 0);
    var sb = $("sidebar"); if (sb) sb.classList.remove("open");
    var ov = $("sidebar-overlay"); if (ov) ov.classList.remove("open");
    load();
  }
  function injectSection() {
    if ($("fbpage")) return;
    var mc = document.querySelector(".main-content"); if (!mc) return;
    var sec = document.createElement("div"); sec.id = "fbpage"; sec.className = "section"; sec.innerHTML = build(); mc.appendChild(sec);
    $("fbp-save").addEventListener("click", save); $("fbp-reset").addEventListener("click", reset);
  }
  function injectNav() {
    if ($("nav-fbpage")) return;
    var cms = $("nav-cms"); if (!cms || !cms.parentNode) return;
    var b = document.createElement("button"); b.className = "nav-item"; b.id = "nav-fbpage";
    b.innerHTML = '<span class="nav-icon">⚽</span><span>Football Gabon</span>';
    cms.parentNode.insertBefore(b, cms.nextSibling); b.addEventListener("click", show);
  }
  function inject() { injectSection(); injectNav(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject); else inject();
  setTimeout(inject, 1500);
})();
