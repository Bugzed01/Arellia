/* Arélia Maps 1.11 : validation de la continuité routière réelle du modèle.
 * Le modèle distingue voies, accès non qualifiés et carrefours explicitement raccordés. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../site/assets',name),'utf8'));
const worldAPI=require('../../site/assets/arelia-world.js');
const national=require('../../site/assets/arelia-national-routing.js');
const urban=require('../../site/assets/arelia-urban-routing.js');
const geo=read('arelia-map-data.json'),world=worldAPI.makeWorld(geo);
const graph=national.build(geo,world);
const others=read('arelia-other-cities.json').cities,vesone=read('vesone-city.json');
const metro=vesone.metropolitan||{};
const vesoneNetwork={
 ...vesone,id:'vesone',center:vesone.meta.center,outline:null,
 avenues:[...(vesone.avenues||[]),...(metro.roads||[])],
 streets:[...(vesone.streets||[]),...(metro.local_streets||[])],
 water:[...(vesone.water||[]),...(metro.terrain?.waterways||[])]
};
const cities={...others,...world.cityPlans,vesone:vesoneNetwork};
assert.equal(world.settlements.length,790);
let townCount=0,localRoadCount=0;
for(const town of world.settlements){
 const plan=worldAPI.townPlan(town,geo);
 const city={id:town.id,center:[town.x,town.y],
  avenues:plan.roads.map((line,i)=>({id:town.id+'-road-'+i,points:line.points}))};
 const local=urban.buildLocal(city,geo);
 assert.ok(local.count.nodes>=3&&local.count.edges>=2,'Graphe local vide : '+town.id);
 const road=plan.roads.find(r=>r.points.length>2);
 assert.ok(road,'Rue villageoise absente : '+town.id);
 const path=urban.shortestLocal(local,[town.x,town.y],road.points.at(-1));
 assert.ok(path,'Accès villageois coupé : '+town.id);
 assert.ok(path.units>=0&&Number.isFinite(path.units));
 townCount++;localRoadCount+=local.count.roads;
}
let served=0,total=0,proposed=0,disconnect=0,unsafe=[];
for(const city of Object.values(cities)){
 const local=urban.buildLocal(city,geo);
 const center=city.center||city.meta?.center;
 assert.ok(center,'Centre urbain non défini : '+city.id);
 assert.ok(local.count.nodes>100&&local.count.edges>100,'Graphe urbain trop faible : '+city.id);
 proposed+=local.count.proposedConnectors;disconnect+=local.count.components;
 for(const c of local.connectors){
  assert.ok(urban.connectorClear(c.points[0],c.points[1],city,geo),'Raccordement interdit : '+city.id+'/'+c.id);
 }
 for(const poi of city.places||[]){
  const path=urban.shortestLocal(local,center,[poi.x,poi.y]);
  total++;
  if(!path){unsafe.push(city.id+'/'+poi.id);continue;}
  assert.ok(Number.isFinite(path.units)&&path.units>=0,'Longueur invalide '+poi.id);
  // Deux lieux peuvent partager le même nœud de route : 0 segment routier
  // est légitime si une connexion terminale hors voirie est déclarée.
  assert.ok(path.segments>0||path.access.length>0,'Lieu sans segment ni accès explicite '+poi.id);
  served++;
 }
}
assert.equal(unsafe.length,0,'Lieux urbains non desservis : '+unsafe.slice(0,20).join(', '));
assert.equal(served,total,'Couverture urbaine incomplète');
const cross=urban.createService(geo,world,cities,graph);
const occidian=others.occidian.places[0],katoru=world.cityPlans.katoru.places[0];
const palace=vesone.places.find(p=>p.id==='v-palais'),forum=vesone.places.find(p=>p.id==='v-forum');
const satellite=vesone.places.find(p=>p.id==='sat-belrives');
for(const [start,end] of [
 [occidian,katoru],[palace,katoru],[occidian,satellite],[palace,forum],
 [forum,geo.places.find(p=>p.id==='vesone')],[satellite,palace]
]){
 const a=start===palace||start===forum||start===satellite?{...start,cityId:'vesone'}:start;
 const b=end===palace||end===forum||end===satellite?{...end,cityId:'vesone'}:end;
 const path=cross.route(a,b);
 assert.ok(path&&path.sections?.length,'Itinéraire porte-à-porte absent : '+start.id+' -> '+end.id);
 assert.ok(Number.isFinite(path.units)&&path.units>=0);
 const sourceKm=path.sections.reduce((s,part)=>s+part.units,0);
 assert.ok(Math.abs(path.units-sourceKm)<.0001,'Distances des tronçons incorrectes');
 assert.ok(Array.isArray(path.access),'Accès hors voirie invisibles');
 assert.ok(path.points.every(p=>p.every(Number.isFinite)),'Coordonnées invalides');
}
const noCross=urban.buildLocal({id:'croisement',center:[0,0],
 avenues:[{id:'horizontale',points:[[0,0],[10,0]]},{id:'verticale',points:[[5,-5],[5,5]]}]});
assert.equal(noCross.count.components,2,'Un simple croisement ne doit pas devenir un échangeur');
const tJunction=urban.buildLocal({id:'carrefour',center:[0,0],
 avenues:[{id:'rue-a',points:[[0,0],[10,0]]},{id:'rue-b',points:[[5,0],[5,5]]}]});
assert.equal(tJunction.count.components,1,'La fin de voie sur segment doit ouvrir un carrefour');
assert.ok(urban.shortestLocal(tJunction,[0,0],[5,5]));
const water={id:'canal',water:[{points:[[5,-10],[5,10]],width:2}]};
assert.equal(urban.connectorClear([0,0],[10,0],water,null),false,'Pont inventé à travers un canal');
console.log('Référence 1.11 : '+townCount+' villages ('+localRoadCount+' axes locaux), '+served+'/'+total+
 ' lieux urbains atteints, '+proposed+' raccordements proposés dans 10 villes, '+
 disconnect+' composantes encore distinctes à qualifier.');
console.log('Carrefours explicites, absence de pont automatique, trajets multi-échelles : OK.');
