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
