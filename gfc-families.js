/* gfc-families : source unique des familles d'acteurs (index.html + inscription.html) */
window.GFC_FAMILIES=[
  {id:'joueurs',label:'⚽ Joueurs',roles:['joueur','eleve_etudiant','independant','gabonais_diaspora','sportif_etranger','ancien_sportif','handisport']},
  {id:'encadrement',label:'📋 Encadrement',roles:['entraineur','arbitre','formateur']},
  {id:'organisations',label:'🏟️ Organisations',roles:['club','association','ligue','organisateur','ecole_universite']},
  {id:'instance',label:'🏛️ Instance',roles:['federation']},
  {id:'autres',label:'💗 Autres',roles:['supporter']}
];
window.gfcFamilyOf=function(role){
  var f=window.GFC_FAMILIES.filter(function(x){return x.roles.indexOf(role)>=0;})[0];
  return f?f.id:'autres';
};
