(function(){'use strict';
var BAD=/mail|phone|tel|whats|birth|naiss|pass|token|addr|adres|cni|iban|salar|private|sensible|secret|uid|doc|piece|fcm|push|device|login|ip$/i;
var SAFE=/^(numMaillot|passes|federationTutelle)$/;
var OFF=['pending','rejected','suspended','banned','deleted','blocked'];
function clean(o){var r={};Object.keys(o).forEach(function(k){if(BAD.test(k)&&!SAFE.test(k))return;var v=o[k],t=typeof v;if(v===null||t==='string'||t==='number'||t==='boolean')r[k]=v;else if(Array.isArray(v)&&v.every(function(x){return typeof x==='string'||typeof x==='number';}))r[k]=v;else if(v&&typeof v.toDate==='function')r[k]=v;});return r;}
var KINDS=[
{k:'structures',c:'structuresSportives'},{k:'sites',c:'sitesSportifs'},{k:'actualites',c:'actualites'},{k:'matchs',c:'matchs'},{k:'archives',c:'structuresSportives',sub:'archives'},
{k:'competitions',c:'competitions'},{k:'competitions_meta',c:'competitions_meta'},
{k:'rosters',c:'rosters',f:function(d){return d.validation==='validated'&&d.visibility==='public';}},
{k:'joueurs',c:'users',clean:true,f:function(d){return OFF.indexOf(String(d.status||'').toLowerCase())<0&&d.role!=='admin'&&d.isAdmin!==true&&d.role!=='visiteur';}}];
function $(i){return document.getElementById(i);}
function logTo(m){var l=$('gb-log');if(l){l.textContent+=m+'\n';l.scrollTop=l.scrollHeight;}}
async function getDocs(db,K){if(!K.sub)return db.collection(K.c).get();var ps=await db.collection(K.c).get(),out=[];for(var i=0;i<ps.docs.length;i++){var pd=ps.docs[i];var ss=await pd.ref.collection(K.sub).get();ss.forEach(function(d){out.push({id:pd.id+'__'+d.id,data:function(){return d.data();}});});}return {size:out.length,forEach:function(cb){out.forEach(cb);}};}
async function commit(db,ops){for(var i=0;i<ops.length;i+=400){var b=db.batch();ops.slice(i,i+400).forEach(function(o){if(o[0]==='set')b.set(o[1],o[2]);else b.delete(o[1]);});await b.commit();}}
async function run(){var db=window.db,btn=$('gb-run');if(!db){logTo('Firebase pas prêt');return;}
if(!confirm('Envoyer les données football de GFC vers GSC ?'))return;btn.disabled=true;$('gb-log').textContent='';
var FV=firebase.firestore.FieldValue.serverTimestamp(),counts={},errs=[],total=0;logTo('Début : '+new Date().toLocaleString('fr-FR'));
for(var n=0;n<KINDS.length;n++){var K=KINDS[n];try{
var snap=await getDocs(db,K),items=[];snap.forEach(function(d){var x=d.data();if(K.f&&!K.f(x))return;items.push({id:d.id,data:K.clean?clean(x):x});});
var ex=await db.collection('gscBridge').where('kind','==',K.k).get(),keep={},ops=[],rm=0;
items.forEach(function(i){var id=K.k+'__'+i.id;keep[id]=1;ops.push(['set',db.collection('gscBridge').doc(id),{kind:K.k,srcId:i.id,data:i.data,sentAt:FV}]);});
ex.forEach(function(d){if(!keep[d.id]){ops.push(['del',d.ref]);rm++;}});
await commit(db,ops);counts[K.k]=items.length;total+=items.length;logTo('✔ '+K.k+' : '+items.length+(rm?' (−'+rm+' supprimés)':''));
}catch(e){errs.push(K.k);logTo('✖ '+K.k+' : '+(e&&e.message||e));}}
try{var u=(firebase.auth&&firebase.auth().currentUser)||{};await db.collection('gscBridge').doc('_meta').set({sentAt:FV,counts:counts,by:u.email||u.uid||'admin'});}catch(e){logTo('✖ meta : '+e.message);}
logTo('Terminé : '+total+' éléments, '+errs.length+' erreur(s).');btn.disabled=false;}
async function diag(){var db=window.db,btn=$('gb-diag');if(!db){logTo('Firebase pas prêt');return;}btn.disabled=true;$('gb-log').textContent='';
var u=(firebase.auth&&firebase.auth().currentUser)||{};logTo('🩺 Diagnostic (aucune écriture) · '+new Date().toLocaleString('fr-FR'));
logTo('Connecté : '+(u.email?'oui ('+u.email.replace(/^(.).*(@.*)$/,'$1***$2')+')':'NON'));
var brg={};try{var bs=await db.collection('gscBridge').get();bs.forEach(function(d){var x=d.data();if(d.id==='_meta'){var s=x.sentAt;logTo('Dernier envoi : '+(s&&s.toDate?s.toDate().toLocaleString('fr-FR'):'jamais'));}else{brg[x.kind||'?']=(brg[x.kind||'?']||0)+1;}});}catch(e){logTo('✖ lecture du pont : '+(e&&e.code||e.message));}
for(var n=0;n<KINDS.length;n++){var K=KINDS[n];try{
var snap=await getDocs(db,K),tot=snap.size,ok=0,why={},rm={},roles={};
snap.forEach(function(d){var x=d.data();
if(K.f&&!K.f(x)){var r=K.k==='joueurs'?('rôle='+(x.role||'?')+' statut='+(x.status||'?')):('validation='+(x.validation||'?')+' visibilité='+(x.visibility||'?'));why[r]=(why[r]||0)+1;return;}
ok++;if(K.k==='joueurs'){var ro=x.role||'?';roles[ro]=(roles[ro]||0)+1;}
if(K.clean){Object.keys(x).forEach(function(f){if(BAD.test(f)&&!SAFE.test(f))rm[f]=1;});}});
logTo((ok?'✔ ':'• ')+K.k+' : '+tot+' en base → '+ok+' envoyé(s), '+(brg[K.k]||0)+' dans le pont');
if(!tot)logTo('    (collection vide dans GFC)');
Object.keys(why).forEach(function(r){logTo('    ✂ '+why[r]+' exclu(s) ['+r+']');});
if(Object.keys(roles).length)logTo('    👥 rôles envoyés : '+Object.keys(roles).map(function(r){return r+'×'+roles[r];}).join(', '));
if(Object.keys(rm).length)logTo('    🔒 champs retirés : '+Object.keys(rm).join(', '));
}catch(e){logTo('✖ '+K.k+' : '+(e&&e.code||e.message));}}
logTo('Fin du diagnostic.');btn.disabled=false;}
function copy(){var t=$('gb-log').textContent;if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){logTo('📋 Rapport copié');});else{var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();logTo('📋 Rapport copié');}}
function modal(){if($('gb-modal')){$('gb-modal').style.display='flex';return;}var m=document.createElement('div');m.id='gb-modal';m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px';
m.innerHTML='<div style="background:#fff;color:#111;border-radius:14px;max-width:560px;width:100%;padding:16px;max-height:90vh;overflow:auto"><h3 style="margin:0 0 6px">📤 Envoyer les données vers GSC</h3><p style="margin:0 0 10px;font-size:13px;color:#555">Publie un instantané des données football (profils nettoyés) que Gabon Sport Connect pourra récupérer. Sens unique : GFC → GSC.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="gb-run" style="background:#009e60;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:700">Envoyer maintenant</button><button id="gb-diag" style="border:1px solid #009e60;color:#009e60;background:#fff;border-radius:10px;padding:10px 14px;font-weight:700">🩺 Diagnostic</button><button id="gb-copy" style="border:1px solid #ccc;background:#fff;border-radius:10px;padding:10px 14px">📋 Copier le rapport</button><button id="gb-close" style="border:1px solid #ccc;background:#fff;border-radius:10px;padding:10px 14px">Fermer</button></div><pre id="gb-log" style="background:#0b1220;color:#9fe8c0;border-radius:10px;padding:10px;margin-top:10px;font-size:12px;min-height:120px;max-height:40vh;overflow:auto;white-space:pre-wrap"></pre></div>';
document.body.appendChild(m);$('gb-run').onclick=run;$('gb-copy').onclick=copy;$('gb-diag').onclick=diag;$('gb-close').onclick=function(){m.style.display='none';};}
function inject(){if($('nav-gfc-bridge'))return true;var a=$('nav-archivage')||$('nav-dashboard');if(!a)return false;var b=document.createElement('button');b.className='nav-item';b.id='nav-gfc-bridge';b.textContent='📤 Envoi vers GSC';b.onclick=modal;a.parentNode.insertBefore(b,a.nextSibling);return true;}
var tries=0,iv=setInterval(function(){if(inject()||++tries>40)clearInterval(iv);},1000);})();

/* GFC-TOOLS-SHEETS v2 */
(function(){
function $(i){return document.getElementById(i);}
var OFF=['pending','rejected','suspended','banned','deleted','blocked'];
var SRC=[
['Profils','users',function(d){return OFF.indexOf(String(d.status||'').toLowerCase())<0&&d.role!=='admin'&&d.isAdmin!==true&&d.role!=='visiteur';}],
['Effectifs','rosters',function(d){return d.validation==='validated'&&d.visibility==='public';}],
['Structures','structuresSportives',null]];
var F={n:['name','nom','displayName','nomComplet','fullName','raisonSociale','clubName','club','titre','title'],
r:['role','type','typeStructure','categorie','category'],v:['ville','city','localite','commune'],
s:['sport','sports','discipline','disciplines'],sa:['saison','season'],st:['status','statut','validation']};
function pick(d,k){for(var i=0;i<k.length;i++){var v=d[k[i]];
if(Array.isArray(v)&&v.length&&v.every(function(x){return typeof x!=='object';}))return v.join(' / ');
if(v!==undefined&&v!==null&&v!==''&&typeof v!=='object')return String(v);}return '';}
function cell(v){v=String(v==null?'':v).replace(/[\t\r\n]+/g,' ').replace(/"/g,"'").trim();if(/^[=+\-@]/.test(v))v=' '+v;return v;}
function build(){var db=window.db;if(!db)return Promise.reject(new Error('Firebase pas prêt'));
var items=[],bad=[],sm={};
return SRC.reduce(function(p,S){return p.then(function(){return db.collection(S[1]).get().then(function(sn){
sn.forEach(function(doc){var d=doc.data();if(S[2]&&!S[2](d))return;items.push([S[0],doc.id,d]);
if(S[0]==='Structures')sm[doc.id]={n:pick(d,F.n),v:pick(d,F.v)};});
}).catch(function(){bad.push(S[0]);});});},Promise.resolve()).then(function(){
var rows=['Type\tId\tNom\tRôle\tVille\tSport\tSaison\tStatut'];
items.forEach(function(it){var t=it[0],id=it[1],d=it[2],nom=pick(d,F.n),ville=pick(d,F.v),sa=pick(d,F.sa),ro=pick(d,F.r);
if(t==='Effectifs'){var sid=pick(d,['structureId','structureSportiveId','clubId','structure'])||(sa&&ro?id.replace('_'+sa+'_'+ro,''):''),s=sm[sid]||{};
if(!nom||nom===id)nom=s.n?s.n+' — '+(sa+' '+ro).trim():id;ville=ville||s.v||'';}
rows.push([t,id,nom||id,ro,ville,pick(d,F.s),sa,pick(d,F.st)].map(cell).join('\t'));});
return {rows:rows,bad:bad};});}
var G=['<p><b>1. Importer</b> : touchez « Copier les données », ouvrez Google Sheets ou Excel (en ligne : touchez d’abord Modifier), puis appui long sur A1 › Coller. Les colonnes se séparent toutes seules.</p>',
'<p><b>2. Nettoyer</b> : Données › Supprimer les doublons (colonnes Nom et Ville) ; =SUPPRESPACE(C2) retire les espaces en trop ; harmonisez les villes et les sports.</p>',
'<p><b>3. Calculer</b> : Insertion › Tableau croisé dynamique (lignes = Type ou Ville, valeurs = Id en NB), ou =NB.SI(A:A;"Profils").</p>',
'<p><b>4. Corriger à la source</b> : la colonne Id retrouve la fiche dans GFC. Corrigez-la dans GFC, puis relancez « 📤 Envoi vers GSC ». Le tableur ne réécrit rien dans GFC.</p>',
'<p><b>5. Échanger</b> : supprimez d’abord la colonne Id, puis Partager › lien en lecture seule, ou Fichier › Télécharger (PDF, Excel).</p>',
'<p><b>Confidentialité</b> : ce fichier ne contient que nom, rôle, ville, sport, saison et statut (plus l’Id), jamais e-mail, téléphone ni document.</p>'].join('');
var CSS='#gb-tools{margin-top:14px;padding-top:12px;border-top:1px solid #ddd;font-size:13px;color:#555}#gb-tools button,#gb-tools a{display:inline-block;margin:0 8px 8px 0;border:1px solid #009e60;color:#009e60;background:#fff;border-radius:10px;padding:10px 14px;font-weight:700;font-size:13px;text-decoration:none}#gb-guide{display:none;margin-top:6px;background:#f3faf6;border-radius:12px;padding:12px;line-height:1.45}#gb-guide b{color:#007a4a}#gb-guide p{margin:0 0 8px}';
var st=document.createElement('style');st.textContent=CSS;(document.head||document.documentElement).appendChild(st);
function prep(){var msg=$('gb-sheets-msg');msg.textContent='Lecture des données…';
build().then(function(r){var t=r.rows.join('\n'),n=r.rows.length-1;
function done(ok){msg.textContent=(n>0?n+' ligne(s) ':'Aucune ligne ')+(ok?'copiée(s). Étape 2 : ouvrez le tableur et collez en A1 (les colonnes se séparent seules).':'prête(s) : appui long dans la zone ci-dessous, Tout sélectionner, Copier.')+(r.bad.length?' (illisible : '+r.bad.join(', ')+')':'');
$('gb-sheets-go').style.display='block';if(!ok){var ta=$('gb-sheets-ta');ta.value=t;ta.style.display='block';}}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){done(true);},function(){done(false);});else done(false);
}).catch(function(e){msg.textContent='Erreur : '+(e&&e.message||e);});}
function inject(){var m=$('gb-modal');if(!m||!m.firstElementChild||$('gb-tools'))return;
var d=document.createElement('div');d.id='gb-tools';
d.innerHTML='<b>📗 Travailler les données dans un tableur</b><div style="margin-top:8px"><button id="gb-sheets-prep">1️⃣ Copier les données (tableur)</button><button id="gb-sheets-help">❓ Guide d’usage</button></div><div id="gb-sheets-msg" style="margin-bottom:8px"></div><div id="gb-sheets-go" style="display:none"><a href="https://sheets.new" target="_blank" rel="noopener">2️⃣ Ouvrir Google Sheets</a><a href="https://excel.new" target="_blank" rel="noopener">📘 Excel en ligne</a></div><textarea id="gb-sheets-ta" style="display:none;width:100%;height:90px;margin-bottom:8px"></textarea><div id="gb-guide">'+G+'</div>';
m.firstElementChild.appendChild(d);
$('gb-sheets-prep').onclick=prep;
$('gb-sheets-help').onclick=function(){var g=$('gb-guide');g.style.display=g.style.display==='block'?'none':'block';};}
new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
inject();
})();
