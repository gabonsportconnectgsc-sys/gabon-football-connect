/* Synchronisation des actualités sportives par l’administrateur (ajoutée par patch-sync-actus) */
(function () {
  'use strict';
  var MODE = 'gfc';
  var IS_GFC = MODE === 'gfc';
  var MAX_AGE_DAYS = 30;
  var MAX_NEW = IS_GFC ? 10 : 15;
  var LABEL = IS_GFC ? '🔄 Synchroniser les actualités football' : '🔄 Synchroniser les actualités sportives';

  // Flux des médias gabonais, lus via rss2json (déjà utilisé par l’application).
  // sport:true = flux déjà dédié au sport ; foot:true = flux dédié au football.
  var FEEDS = [
    { n: 'Gabonreview', u: 'https://www.gabonreview.com/category/sport/feed/', sport: true },
    { n: 'Gabon Media Time', u: 'https://gabonmediatime.com/cat/sport/feed/', sport: true },
    { n: 'GabonClic', u: 'https://gabonclic.info/categories/actualites-gabon/sport/feed/', sport: true },
    { n: 'FootGabon', u: 'https://footgabon.com/feed/', sport: true, foot: true },
    { n: 'Gabon All Sport', u: 'https://gabonallsport.com/feed/', sport: true },
    { n: 'Gabon Sport Actus', u: 'https://gabonsportactus.com/feed/', sport: true },
    { n: 'Sport241', u: 'https://sport241.com/feed/', sport: true },
    { n: 'L’Union', u: 'https://www.union.sonapresse.com/fr/rss.xml', sport: false },
    { n: 'Gabonactu', u: 'https://gabonactu.com/feed/', sport: false }
  ];

  var RE_FOOT = /foot|fifa|fégafoot|fegafoot|linafp|\bcaf\b|can 20\d\d|mangasport|mounana|migné|bouanga|aubameyang|éliminatoires/i;
  var RE_SPORT = /sport|foot|basket|hand-?ball|athl[eé]|\bcross\b|marathon|\bmma\b|judo|karat|taekwondo|boxe|tennis|cyclisme|natation|\bjoj\b|olymp|cnog|fegabab|fegahand|lineph|linafp|fegafoot|kung|rugby|volley/i;

  function isAdmin() {
    try { return !!(window.userProfile && window.userProfile.role === 'admin'); } catch (e) { return false; }
  }

  function txt(s) {
    var t = document.createElement('textarea');
    t.innerHTML = String(s || '').replace(/<[^>]*>/g, ' ');
    return t.value.replace(/\s+/g, ' ').trim();
  }

  function hash(s) {
    var x = 5381, i;
    for (i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0;
    return (x >>> 0).toString(36);
  }

  function parseDate(s) {
    if (!s) return null;
    var d = new Date(String(s).replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function catOf(t) {
    if (RE_FOOT.test(t)) return 'Football';
    if (/basket|fegabab|afrobasket/i.test(t)) return 'Basketball';
    if (/hand-?ball|fegahand|lineph/i.test(t)) return 'Handball';
    if (/athl[eé]|marathon|\bcross\b|sprint/i.test(t)) return 'Athlétisme';
    return 'Sport';
  }

  function fetchFeed(f) {
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    return fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(f.u), ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (d) {
        if (d.status !== 'ok' || !d.items) throw new Error('flux indisponible');
        return d.items.map(function (it) {
          return {
            title: txt(it.title),
            excerpt: txt(it.description || it.content).slice(0, 180),
            url: String(it.link || ''),
            date: parseDate(it.pubDate),
            source: f.n,
            feed: f
          };
        });
      });
  }

  function status(msg) {
    var el = document.getElementById('news-sync-status');
    if (!el) return;
    el.style.display = '';
    el.textContent = msg;
  }

  var busy = false;

  async function run() {
    if (busy || !isAdmin()) return;
    var btn = document.getElementById('news-sync-btn');
    busy = true;
    if (btn) { btn.disabled = true; btn.textContent = '⌛ Synchronisation…'; }
    status('Lecture des médias en ligne…');
    var reloading = false;
    try {
      var res = await Promise.allSettled(FEEDS.map(fetchFeed));
      var ok = 0, all = [];
      res.forEach(function (r) { if (r.status === 'fulfilled') { ok++; all = all.concat(r.value); } });

      var now = Date.now(), min = now - MAX_AGE_DAYS * 864e5;
      var cand = all.filter(function (it) {
        if (!it.date || !it.title || it.title.length < 12) return false;
        var t = it.date.getTime();
        if (t < min || t > now + 864e5) return false;
        if (!/^https?:\/\//i.test(it.url)) return false;
        var blob = it.title + ' ' + it.excerpt;
        if (IS_GFC) return !!it.feed.foot || RE_FOOT.test(blob);
        return !!it.feed.sport || RE_SPORT.test(blob);
      }).sort(function (a, b) { return b.date - a.date; });

      var seenT = {}, seenU = {}, keep = [];
      cand.forEach(function (it) {
        var k = it.title.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, ' ').trim().slice(0, 50);
        if (seenT[k] || seenU[it.url]) return;
        seenT[k] = true; seenU[it.url] = true;
        if (keep.length < MAX_NEW) keep.push(it);
      });

      if (!keep.length) {
        status('Aucune actualité récente trouvée (' + ok + '/' + FEEDS.length + ' sources répondent).');
        return;
      }

      var col = window.db.collection('actualites');
      var wr = await Promise.allSettled(keep.map(function (it) {
        var cat = IS_GFC ? 'Football' : catOf(it.title + ' ' + it.excerpt);
        return col.doc('auto-' + hash(it.url)).set({
          title: it.title, titre: it.title,
          excerpt: it.excerpt,
          cat: cat, categorie: cat,
          tag: it.source, source: it.source,
          url: it.url,
          date: it.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          createdAt: it.date,
          syncedAt: new Date(),
          auto: true
        });
      }));
      var done = wr.filter(function (r) { return r.status === 'fulfilled'; }).length;
      var denied = wr.some(function (r) {
        return r.status === 'rejected' && /permission/i.test(String((r.reason && (r.reason.code || r.reason.message)) || r.reason));
      });
      if (!done) {
        status(denied ? '⛔ Droits administrateur insuffisants pour enregistrer.' : '⚠️ Échec de l’enregistrement des actualités.');
        return;
      }
      status('✅ ' + done + ' actualités synchronisées (' + ok + '/' + FEEDS.length + ' sources). Rechargement…');
      reloading = true;
      setTimeout(function () { location.reload(); }, 1600);
    } catch (e) {
      status('⚠️ Erreur : ' + ((e && e.message) || e));
    } finally {
      busy = false;
      if (btn && !reloading) { btn.disabled = false; btn.textContent = LABEL; }
    }
  }

  function mount() {
    var prev = document.getElementById('latest-news-preview');
    if (!prev) return null;
    var card = prev.closest ? prev.closest('.card') : null;
    if (!card) return null;
    var w = document.getElementById('news-sync-wrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'news-sync-wrap';
      w.style.cssText = 'display:none;margin:0 0 16px';
      w.innerHTML =
        '<button type="button" id="news-sync-btn" style="width:100%;padding:14px 16px;border:none;border-radius:12px;background:#009E60;color:#fff;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)">' + LABEL + '</button>' +
        '<div id="news-sync-status" style="display:none;margin-top:8px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.92);color:#111;font-size:13px;text-align:center"></div>';
      card.insertAdjacentElement('afterend', w);
      w.querySelector('#news-sync-btn').onclick = run;
    }
    return w;
  }

  function refresh() {
    var w = mount();
    if (w) w.style.display = isAdmin() ? '' : 'none';
  }

  function init() {
    refresh();
    setInterval(refresh, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
