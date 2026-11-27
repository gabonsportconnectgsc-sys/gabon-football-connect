const fs=require('fs');
function req(m){try{return require(m)}catch(e){return require(process.env.HOME+'/node_modules/'+m)}}
const {initializeApp,cert}=req('firebase-admin/app');
const {getFirestore}=req('firebase-admin/firestore');
const key=JSON.parse(fs.readFileSync(process.env.HOME+'/cle-gfc.json','utf8'));
if(!key.private_key||!/football/i.test(key.project_id||'')){console.log('ARRET: ce n\'est pas la cle du projet GFC ('+key.project_id+')');process.exit(1);}
const L=JSON.parse(fs.readFileSync('gfc-a-verifier.json','utf8'));
const go=process.argv.includes('--go');
initializeApp({credential:cert(key)});const db=getFirestore();
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
(async()=>{
console.log(go?'== SUPPRESSION ==':'== SIMULATION ==', key.project_id);
let n=0;
for(const o of L){
 const id='seed-'+o.role+'-'+slug(o.nomOrganisation);
 const ref=db.collection('users').doc(id);
 const snap=await ref.get();
 if(!snap.exists){console.log('. absent    ',id);continue;}
 const d=snap.data();
 if(d.source!=='web-2026-11'||d.nonReclame!==true||d.ownerUid||d.mergedInto){console.log('! IGNORE (modifie ou revendique)',id);continue;}
 console.log((go?'- supprime  ':'? supprimerait ')+id);
 if(go) await ref.delete();
 n++;
}
console.log(n+' fiche(s) '+(go?'supprimee(s)':'concernee(s)'));
process.exit(0);
})().catch(e=>{console.log('ERREUR',e.message);process.exit(1)});
