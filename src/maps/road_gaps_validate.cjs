/* Arélia Maps 1.13 — inventaire des lacunes et non-qualification.
 * Une lacune sur terre n'est PAS une route ni un pont documenté. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../site/assets',name),'utf8'));
const worldAPI=require('../../site/assets/arelia-world.js');
const national=require('../../site/assets/arelia-national-routing.js');
const urban=require('../../site/assets/arelia-urban-routing.js');
const gapsAPI=require('../../site/assets/arelia-road-gaps.js');
const geo=read('arelia-map-data.json'),world=worldAPI.makeWorld(geo);
const others=read('arelia-other-cities.json').cities,ves=read('vesone-city.json'),metro=ves.metropolitan||{};
const cities={...others,...world.cityPlans,vesone:{
 ...ves,id:'vesone',center:ves.meta.center,outline:null,
 avenues:[...(ves.avenues||[]),...(metro.roads||[])],
 streets:[...(ves.streets||[]),...(metro.local_streets||[])],
 water:[...(ves.water||[]),...(metro.terrain?.waterways||[])]
}};
let totalComponents=0,totalGaps=0,landCandidates=0,blocked=0;
const distribution={};
for(const city of Object.values(cities)){
 const graph=urban.buildLocal(city,geo),before={nodes:graph.nodes.length,edges:graph.edges.length};
 const report=gapsAPI.analyze(graph,city,geo),again=gapsAPI.analyze(graph,city,geo);
 assert.deepEqual(report,again,'Inventaire non déterministe : '+city.id);
 assert.equal(graph.edges.length,before.edges,'Un audit ne doit ajouter aucune route : '+city.id);
 assert.equal(graph.nodes.length,before.nodes,'Un audit ne doit ajouter aucun carrefour : '+city.id);
 assert.equal(report.components,graph.count.components);
 assert.equal(report.isolated,graph.count.components-1);
 assert.equal(report.gaps.length,report.isolated);
 assert.ok(report.main.nodeCount>0);
 distribution[city.id]=report.isolated;
 totalComponents+=report.components;totalGaps+=report.isolated;
 for(const gap of report.gaps){
  assert.equal(gap.status,'Rupture non qualifiée');
  assert.ok(gap.nodeCount>0&&gap.roads.length>0);
  assert.ok(gap.center.every(Number.isFinite));
  assert.ok(gap.nearest,'Composante sans piste de rapprochement : '+gap.id);
  assert.ok(gap.nearest.distanceUnits>=0);
  assert.ok(gap.nearest.from.every(Number.isFinite));
  assert.ok(gap.nearest.to.every(Number.isFinite));
  if(gap.candidate){
   assert.ok(urban.connectorClear(gap.candidate.from,gap.candidate.to,city,geo),
    'Piste terrestre non validée : '+gap.id);
   landCandidates++;
  }else blocked++;
 }
}
assert.equal(totalComponents,17,'Nombre de composantes a changé : réexaminer le diagnostic');
assert.equal(totalGaps,7,'Le nombre de fragments isolés a changé');
assert.deepEqual(Object.fromEntries(Object.entries(distribution).filter(([,count])=>count>0)),
 {occidian:3,estrel:1,vesone:3},'Distribution des ruptures modifiée');
assert.equal(landCandidates+blocked,7);
assert.ok(landCandidates>=3&&blocked>=2,'Répartition des motifs de blocage incohérente');
const empty=gapsAPI.analyze({cityId:'vide',nodes:[],edges:[],component:[]});
assert.equal(empty.isolated,0);
assert.equal(empty.gaps.length,0);
const all=national.build(geo,world);
assert.ok(all.stops,'Le graphe national est resté inchangé');
console.log('Arélia 1.13 : 17 composantes, 7 fragments isolés (Occidian 3, Estrel 1, Vésone 3) ; '+
 landCandidates+' pistes terrestres non attestées, '+blocked+' ruptures bloquées.');
console.log('Aucune voie, aucun pont et aucun carrefour n’a été créé par le diagnostic.');
