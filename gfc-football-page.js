(function () {
  "use strict";
  var URL = "https://firestore.googleapis.com/v1/projects/gabon-football-connect/databases/(default)/documents/app_config/footballPage";
  function val(f, k) { var v = f && f[k]; return v && typeof v.stringValue === "string" ? v.stringValue.trim() : ""; }
  function rich(el, t) {
    el.textContent = "";
    t.split(/(\*\*[^*]+\*\*)/).forEach(function (p) {
      if (!p) return;
      if (p.length > 4 && p.slice(0, 2) === "**" && p.slice(-2) === "**") {
        var s = document.createElement("strong"); s.textContent = p.slice(2, -2); el.appendChild(s);
      } else { el.appendChild(document.createTextNode(p)); }
    });
  }
  function apply(f) {
    [["fb-head-title", "headTitle", 0], ["fb-head-sub", "headSub", 0], ["fb-linafp-title", "linafpTitle", 0], ["fb-linafp-text", "linafpText", 1]].forEach(function (r) {
      var el = document.getElementById(r[0]); var v = val(f, r[1]);
      if (!el || !v) return;
      if (r[2]) rich(el, v); else el.textContent = v;
    });
  }
  function run() {
    fetch(URL).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.fields) apply(j.fields); }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
