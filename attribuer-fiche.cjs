const fs=require('fs');
function req(m){try{return require(m)}catch(e){return require(process.env.HOME+'/node_modules/'+m)}}
const {initializeApp,cert}=req('firebase-admin/app');
const {getFirestore}=req('firebase-admin/firestore');
const key=JSON.parse(fs.readFileSync(process.env.HOME+'/cle-gfc.json','utf8'));
if(!key.private_key||!/football/i.test(key.project_id||'')){console.log('ARRET: ce n\'est pas la cle du projet GFC ('+key.project_id+')');process.exit(1);}
initializeApp({credential:cert(key)});const db=getFirestore();
const A=process.argv.slice(2);const go=A.includes('--go');
const nm=u=>u.nomOrganisation||[u.prenom,u.nom].filter(Boolean).join(' ')||'(sans nom)';
const stop=m=>{console.log('ARRET: '+m);process.exit(1);};
(async()=>{
 if(A[0]==='--lister'){
  if(!A[1]) stop('usage: --lister <role>  (club, ligue, federation...)');
  const q=await db.collection('users').where('role','==',A[1]).get();
  q.forEach(d=>{const u=d.data();console.log((u.ownerUid?'[pris]   ':(d.id.startsWith('seed-')?'[libre]  ':'[membre] '))+d.id+' | '+nm(u));});
  process.exit(0);
 }
 const ids=A.filter(x=>!x.startsWith('--'));
 if(ids.length!==2) stop('usage: node attribuer-fiche.cjs <idFiche> <idMembre> [--go]');
 const [idF,idM]=ids;
 const [sf,sm]=await Promise.all([db.collection('users').doc(idF).get(),db.collection('users').doc(idM).get()]);
 if(!sf.exists) stop('fiche introuvable: '+idF);
 if(!sm.exists) stop('membre introuvable: '+idM);
 const f=sf.data(),m=sm.data(),me=m.uid||idM;
 if(idF===idM) stop('la fiche et le membre sont le meme document');
 if(f.role!==m.role) stop('type different: '+f.role+' / '+m.role);
 if(f.ownerUid&&f.ownerUid!==me) stop('fiche deja attribuee a un autre compte');
 const rv=m.revendication;
 if(rv&&rv.statut==='en_attente'&&rv.cibleId!==idF) stop('le membre a une demande en attente vers une autre fiche');
 const fill={};['ville','province','anneeCreation','bio'].forEach(k=>{if(f[k]&&!m[k])fill[k]=f[k];});
 const now=new Date();
 const upF={ownerUid:me,ownershipStatus:'owner_confirmed',ownerConfirmedAt:now,mergedInto:me,mergedAt:now,ownerRef:{clubName:nm(m),email:'',contactName:''},updatedAt:now};
 const upM=Object.assign({revendication:Object.assign({},rv||{},{cibleType:'user',cibleId:idF,cibleNom:nm(f),statut:'approuvee',traiteLe:now.toISOString()}),updatedAt:now},fill);
 console.log(go?'== ECRITURE ==':'== SIMULATION ==');
 console.log('Fiche  : '+idF+' ('+nm(f)+') -> proprietaire '+me+' ('+nm(m)+')');
 console.log('Membre : revendication approuvee, champs copies: '+(Object.keys(fill).join(', ')||'aucun'));
 if(go){const b=db.batch();b.update(sf.ref,upF);b.update(sm.ref,upM);await b.commit();console.log('OK : attribution ecrite');}
 process.exit(0);
})().catch(e=>{console.log('ERREUR',e.message);process.exit(1);});
