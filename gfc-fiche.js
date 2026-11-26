window.gfcLigues=function(l){
  if(!l||!l.length)return '';
  var e=function(s){return String(s).replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';';});};
  var re=/^ligue de football (?:de la |de l['’]|du |de )/i,nat=[],prov=[];
  l.forEach(function(x){var n=String(x.nomOrganisation||'').trim();if(re.test(n))prov.push(n.replace(re,''));else nat.push(n);});
  function bloc(t,a){if(!a.length)return '';a.sort(function(p,q){return p.localeCompare(q,'fr');});
    return '<div><div class="gfc-sous">'+t+' ('+a.length+')</div>'+a.map(function(n,i){return '<div class="gfc-item"><b>'+(i+1)+'</b><span>'+e(n)+'</span></div>';}).join('')+'</div>';}
  return '<div class="adm-section gfc-sec-lig"><div class="adm-section-title">⚽ Ligues affiliées ('+l.length+')</div>'+bloc('Ligues nationales',nat)+bloc('Ligues provinciales',prov)+'</div>';
};
