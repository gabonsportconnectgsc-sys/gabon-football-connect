const fs=require('fs');
function req(m){try{return require(m)}catch(e){return require(process.env.HOME+'/node_modules/'+m)}}
const {initializeApp,cert}=req('firebase-admin/app');
const {getFirestore,FieldValue}=req('firebase-admin/firestore');
const key=JSON.parse(fs.readFileSync(process.env.HOME+'/cle-gfc.json','utf8'));
if(!key.private_key||!/football/i.test(key.project_id||'')){console.log('ARRET: ce n\'est pas la cle du projet GFC ('+key.project_id+')');process.exit(1);}
const L=JSON.parse(fs.readFileSync('gfc-a-verifier.json','utf8'));
const go=process.argv.includes('--go');
initializeApp({credential:cert(key)});const db=getFirestore();
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
(async()=>{
console.log(go?'== ECRITURE ==':'== SIMULATION ==', key.project_id);
for(const o of L){
 const id='seed-'+o.role+'-'+slug(o.nomOrganisation);
 const ref=db.collection('users').doc(id);
 if((await ref.get()).exists){console.log('= existe deja',id);continue;}
 console.log((go?'+ ecrit  ':'? ecrirait ')+id);
 if(go) await ref.set(Object.assign({},o,{uid:id,createdAt:FieldValue.serverTimestamp()}));
}
process.exit(0);
})().catch(e=>{console.log('ERREUR',e.message);process.exit(1)});
