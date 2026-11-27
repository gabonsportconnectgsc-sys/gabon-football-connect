const fs=require('fs');
function req(m){try{return require(m)}catch(e){return require(process.env.HOME+'/node_modules/'+m)}}
const {initializeApp,cert}=req('firebase-admin/app');
const {getFirestore}=req('firebase-admin/firestore');
const key=JSON.parse(fs.readFileSync(process.env.HOME+'/cle-gfc.json','utf8'));
if(!key.private_key||!/football/i.test(key.project_id||'')){console.log('ARRET: mauvaise cle');process.exit(1);}
const go=process.argv.includes('--go');
initializeApp({credential:cert(key)});const db=getFirestore();
(async()=>{
console.log(go?'== ECRITURE ==':'== SIMULATION ==');
const q=await db.collection('users').where('source','==','web-2026-11').get();
let n=0;
for(const d of q.docs){const u=d.data();
 if(u.ownerUid||u.mergedInto||u.sport){console.log('. ignore',d.id);continue;}
 console.log((go?'+ sport ':'? sport ')+d.id);n++;
 if(go) await d.ref.update({sport:'Football'});
}
console.log(n+' fiche(s)');process.exit(0);
})().catch(e=>{console.log('ERREUR',e.message);process.exit(1)});
