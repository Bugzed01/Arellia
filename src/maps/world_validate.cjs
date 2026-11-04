/* Arélia Maps : validation de la couverture nationale sur la source canonique. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const worldModule=require('../../site/assets/arelia-world.js');
const detailModule=require('../../site/assets/arelia-detail.js');
const geo=JSON.parse(fs.readFileSync(path.join(__dirname,'../../site/assets/arelia-map-data.json'),'utf8'));
const w=worldModule.makeWorld(geo),w2=worldModule.makeWorld(geo);
assert.equal(w.version,worldModule.VERSION);
assert.equal(JSON.stringify(w),JSON.stringify(w2),'Géométrie nationale non reproductible');
assert.ok(w.land.regions.length>500,'Pas assez de territoires naturels');
assert.ok(w.land.fields.length>300,'Pas assez de parcelles agricoles');
assert.ok(w.land.forests.length>300,'Pas assez de points forestiers');
assert.ok(w.land.terrainLines.length>=6,'Relief national insuffisant');
assert.ok(w.settlements.length>=500,'Couverture des localités insuffisante');
assert.equal(new Set(w.settlements.map(s=>s.id)).size,w.settlements.length);
assert.equal(new Set(w.settlements.map(s=>s.name)).size,w.settlements.length,'Toponymes répétés');
assert.ok(w.arterials.length>=7,'Réseau régional insuffisant');
assert.ok(w.feeders.length>=500,'Dessertes territoriales insuffisantes');
assert.ok(w.streams.length>=8,'Hydrographie secondaire insuffisante');
const major=['katoru','namiya','valmere','azure','tessal','drel'];
for(const id of major){
 assert.ok(w.cityPlans[id],id+' absent');
 assert.ok(w.cityPlans[id].buildings.length>=150,id+' bâtiment incomplet');
 assert.ok(w.cityPlans[id].streets.length>=70,id+' rues absentes');
}
for(const town of w.settlements){
 assert.ok(worldModule.isLand([town.x,town.y],geo),town.id+' sur eau ou hors terre');
 assert.ok(town.x>=0&&town.x<=1500&&town.y>=0&&town.y<=1400);
 assert.ok(Number.isFinite(worldModule.height(town.x,town.y)));
}
for(const road of w.feeders){
 assert.ok(road.points.length>=2,'Desserte sans chemin '+road.id);
 const town=w.settlements.find(s=>s.id===road.settlement);
 assert.deepEqual(road.points[0],[town.x,town.y]);
}
assert.ok(w.landCorrections,'Diagnostic de correction manquant');
console.log('Détours terrestres : '+w.landCorrections.arterials+' liaisons régionales, '+w.landCorrections.feeders+' dessertes rurales ; '+w.landCorrections.unresolved.length+' cas non résolus.');
assert.equal(w.landCorrections.unresolved.length,0,'Détours non résolus '+JSON.stringify(w.landCorrections.unresolved.slice(0,20)));
for(const road of [...geo.roads,...geo.railways,...w.arterials,...w.feeders]){
 assert.ok(worldModule.pathOnLand(road.points,geo),'Tracé sur l’eau ou hors terre : '+road.id);
}
const testPlan=worldModule.townPlan(w.settlements[0]);
assert.ok(testPlan.roads.length>=4&&testPlan.houses.length>=20);
console.log('Arélia Maps '+w.version+': '+w.settlements.length+' localités, '+w.feeders.length+' dessertes, '+w.arterials.length+' liaisons régionales, '+Object.keys(w.cityPlans).length+' nouveaux plans de ville.');
console.log('Milieux naturels : '+w.land.regions.length+' ensembles, '+w.land.fields.length+' parcelles et '+w.streams.length+' affluents secondaires.');

const sample=worldModule.localTile(geo,35,31);
assert.ok(sample&&sample.origin&&sample.fields&&sample.tracks,'Tuile rurale manquante');
assert.deepEqual(sample,worldModule.localTile(geo,35,31),'Tuile incohérente au même endroit');
const left=worldModule.localTile(geo,34,31);
if(left?.tracks?.length&&sample?.tracks?.length){
 assert.deepEqual(left.tracks[0].points.at(-1),sample.tracks[0].points[0],'Chemin rural non raccordé en bord de tuile');
}

const vesone=JSON.parse(fs.readFileSync(path.join(__dirname,'../../site/assets/vesone-city.json'),'utf8'));
let cityHouses=0,vesoneHouses=0;
for(let j=87;j<=90;j++)for(let i=137;i<=140;i++){
 const tile=worldModule.cityTile(vesone,i,j);
 if(tile)vesoneHouses+=tile.buildings.length;
}
const cityTest=w.cityPlans.katoru;
for(let j=Math.floor(cityTest.center[1]/8)-2;j<=Math.floor(cityTest.center[1]/8)+2;j++)
for(let i=Math.floor(cityTest.center[0]/8)-2;i<=Math.floor(cityTest.center[0]/8)+2;i++){
 const tile=worldModule.cityTile(cityTest,i,j);
 if(tile)cityHouses+=tile.buildings.length;
}
assert.ok(vesoneHouses>=5,'Bâtiments urbains complémentaires absents de Vésone');
assert.ok(cityHouses>=10,'Bâtiments urbains complémentaires absents de Katoru');
assert.deepEqual(worldModule.cityTile(cityTest,61,42),worldModule.cityTile(cityTest,61,42));
console.log('Tuiles urbaines fines : '+vesoneHouses+' bâtiments autour de Vésone ; '+cityHouses+' près de Katoru.');

for(const polygon of geo.islands){
 const mean=polygon.reduce((a,p)=>[a[0]+p[0]/polygon.length,a[1]+p[1]/polygon.length],[0,0]);
 assert.ok(worldModule.isLand(mean,geo),'Îlot non reconnu comme terre émergée');
}
if(geo.lake?.length){
 const x=geo.lake.reduce((v,p)=>v+p[0]/geo.lake.length,0),y=geo.lake.reduce((v,p)=>v+p[1]/geo.lake.length,0);
 assert.ok(!worldModule.isLand([x,y],geo),'Le lac Orélys doit rester exclu des cellules terrestres');
}

// v1.7 : contrôler les tuiles fines, hors mer, sans variation aléatoire.
const atlasCells=[[35,31],[34,31],[36,31],[46,37],[22,38],[42,45],[49,44],[37,41]];
let illustrated=0,buildings=0,paths=0;
for(const [i,j] of atlasCells){
 const base=worldModule.localTile(geo,i,j);
 if(!base)continue;
 const fine=detailModule.tile(geo,base,i,j);
 assert.deepEqual(fine,detailModule.tile(geo,base,i,j),'Détails non stables');
 for(const feature of [...fine.meadows,...fine.parcels,...fine.ponds,...fine.structures]){
  assert.ok(feature.polygon.every(p=>worldModule.isLand(p,geo)),'Bâtiment/parcelle dans l’eau '+i+','+j);
 }
 for(const track of fine.paths){
  assert.ok(detailModule.lineOnLand(track.points,geo),'Chemin coupant l’eau '+i+','+j);
 }
 illustrated+=fine.meadows.length+fine.parcels.length+fine.groves.length;
 buildings+=fine.structures.length;paths+=fine.paths.length;
}
assert.ok(illustrated>=150,'Détails géographiques insuffisants');
assert.ok(buildings>=10,'Bâti rural insuffisant');
assert.ok(paths>=10,'Sentiers et chemins insuffisants');
console.log('Atlas détaillé 1.7 : '+illustrated+' éléments de paysages, '+buildings+' bâtiments, '+paths+' chemins sur cellules échantillons.');

// Arélia Maps 1.8 — voies contiguës et habitat local rattaché aux voies.
assert.deepEqual(sample.tracks[0].points[2],sample.tracks[1].points[2],
 'Les deux chemins de la cellule doivent se rejoindre au même carrefour');
let checkedVillages=0,housesOnLand=0,roadsOnLand=0;
for(const town of w.settlements.slice(0,45)){
 const plan=worldModule.townPlan(town,geo);
 assert.ok(plan.roads.length>=3,'Réseau du village absent : '+town.id);
 assert.ok(plan.houses.length>=15,'Village sans tissu bâti : '+town.id);
 for(const road of plan.roads){
  assert.ok(worldModule.pathOnLand(road.points,geo),'Rue sur l’eau : '+town.id);
  roadsOnLand++;
 }
 for(const house of plan.houses){
  assert.ok(house.polygon.every(p=>worldModule.isLand(p,geo)),'Maison hors terre : '+town.id);
  housesOnLand++;
 }
 checkedVillages++;
}
let parcelsOnLand=0,tracksOnLand=0,riparian=0,shadedMountains=0;
for(const [i,j] of [[35,31],[34,31],[36,31],[46,37],[22,38],[42,45],[49,44],[37,41],[23,27],[29,20],[32,11]]){
 const base=worldModule.localTile(geo,i,j);
 if(!base)continue;
 const fine=detailModule.tile(geo,base,i,j,w);
 assert.deepEqual(fine,detailModule.tile(geo,base,i,j,w),'Tuile fine non reproductible');
 for(const item of [...fine.parcels,...fine.structures,...fine.meadows,...fine.riparian]){
  assert.ok(item.polygon.every(p=>worldModule.isLand(p,geo)),'Micro-polygone hors terre '+fine.id);
  parcelsOnLand++;
 }
 for(const p of fine.paths){
  assert.ok(detailModule.lineOnLand(p.points,geo),'Chemin rural passant dans l’eau '+fine.id);
  tracksOnLand++;
 }
 riparian+=fine.riparian.length;shadedMountains+=fine.cliffs.length;
}
assert.ok(parcelsOnLand>250,'Habitat et cultures insuffisants');
assert.ok(tracksOnLand>45,'Réseau rural trop faible');
assert.ok(riparian>=6,'Végétation des berges absente');
console.log('Arélia Maps 1.8 : '+checkedVillages+' villages inspectés, '+housesOnLand+' bâtiments terrestres, '+roadsOnLand+' rues, '+tracksOnLand+' chemins, '+riparian+' éléments de ripisylve.');
