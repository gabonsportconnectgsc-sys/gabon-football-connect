/* Carte « QR code de l’application » en bas de l’accueil (ajoutée par patch-qr) */
(function () {
  'use strict';
  var NAME = 'Gabon Football Connect', SHORT = 'GFC';

  function appUrl() {
    var l = document.querySelector('link[rel="canonical"]');
    return (l && l.href) || (location.origin + '/');
  }

  function qrSvg(text, size) {
    if (typeof window.qrcode !== 'function') return '';
    var q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    var n = q.getModuleCount(), m = 2, s = n + 2 * m, d = '', r, c;
    for (r = 0; r < n; r++) {
      for (c = 0; c < n; c++) {
        if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '"' +
      ' shape-rendering="crispEdges" role="img" aria-label="QR code ' + NAME + '"' +
      ' style="width:' + size + ';height:auto;aspect-ratio:1/1;display:block;margin:0 auto">' +
      '<rect width="' + s + '" height="' + s + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }

  function closeOverlay() {
    var o = document.getElementById('app-qr-overlay');
    if (o) o.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') closeOverlay(); }

  function openOverlay() {
    if (document.getElementById('app-qr-overlay')) return;
    var u = appUrl();
    var o = document.createElement('div');
    o.id = 'app-qr-overlay';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';

    var p = document.createElement('div');
    p.style.cssText = 'background:#fff;color:#111;border-radius:16px;padding:20px;max-width:100%;text-align:center;box-sizing:border-box';

    var t = document.createElement('div');
    t.style.cssText = 'font-weight:800;font-size:18px;margin-bottom:12px';
    t.textContent = NAME;

    var box = document.createElement('div');
    box.style.cssText = 'line-height:0';
    box.innerHTML = qrSvg(u, 'min(80vw,55vh,420px)');

    var link = document.createElement('div');
    link.style.cssText = 'font-size:13px;margin:12px 0;word-break:break-all;opacity:.7';
    link.textContent = u;

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center';
    var bs = 'padding:12px 18px;border-radius:10px;border:none;font-weight:700;font-size:15px;cursor:pointer;';

    var share = document.createElement('button');
    share.type = 'button';
    share.style.cssText = bs + 'background:#006b40;color:#fff';
    share.textContent = 'Partager';
    share.onclick = function (ev) {
      ev.stopPropagation();
      if (navigator.share) {
        navigator.share({ title: NAME, text: 'Rejoins ' + NAME, url: u }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(u).then(function () {
          share.textContent = 'Lien copié ✓';
        }).catch(function () { window.prompt('Copiez le lien :', u); });
      } else {
        window.prompt('Copiez le lien :', u);
      }
    };

    var close = document.createElement('button');
    close.type = 'button';
    close.style.cssText = bs + 'background:#eee;color:#111';
    close.textContent = 'Fermer';
    close.onclick = function (ev) { ev.stopPropagation(); closeOverlay(); };

    row.appendChild(share);
    row.appendChild(close);
    p.appendChild(t);
    p.appendChild(box);
    p.appendChild(link);
    p.appendChild(row);
    p.onclick = function (ev) { ev.stopPropagation(); };
    o.appendChild(p);
    o.onclick = closeOverlay;
    document.body.appendChild(o);
    document.addEventListener('keydown', onKey);
  }

  function buildCard() {
    var c = document.createElement('div');
    c.id = 'app-qr-card';
    c.className = 'card fade-up mb-16';
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', 'Agrandir le QR code de ' + NAME);
    c.tabIndex = 0;
    c.style.cursor = 'pointer';
    c.innerHTML =
      '<div class="card-body" style="display:flex;align-items:center;gap:14px">' +
        '<div style="flex:none;width:96px;line-height:0;border-radius:8px;overflow:hidden;border:1px solid #e3e3e3">' +
          qrSvg(appUrl(), '96px') +
        '</div>' +
        '<div style="min-width:0">' +
          '<div style="font-weight:800;font-size:16px">📲 QR code de ' + SHORT + '</div>' +
          '<div style="font-size:13px;opacity:.75;margin-top:4px">Touchez pour agrandir, scanner ou partager l’application.</div>' +
        '</div>' +
      '</div>';
    c.onclick = openOverlay;
    c.onkeydown = function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openOverlay(); }
    };
    return c;
  }

  // Garde la carte en toute dernière position de l’accueil (sous « Football connecté »,
  // qui est ajouté plus tard par gsc-gfc-public.js).
  function mount() {
    var dv = document.getElementById('view-dashboard');
    if (!dv) return;
    var c = document.getElementById('app-qr-card');
    if (!c) {
      if (typeof window.qrcode !== 'function') return;
      try { c = buildCard(); } catch (e) { return; }
    }
    if (dv.lastElementChild !== c) dv.appendChild(c);
  }

  function init() {
    mount();
    var dv = document.getElementById('view-dashboard');
    if (dv && window.MutationObserver) {
      new MutationObserver(function () { mount(); }).observe(dv, { childList: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
