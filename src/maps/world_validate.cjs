/* Arélia Maps : validation de la couverture nationale sur la source canonique. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const worldModule=require('../../site/assets/arelia-world.js');
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
 assert.ok(worldModule.inside([town.x,town.y],geo.coastline),town.id+' hors terre');
 assert.ok(town.x>=0&&town.x<=1500&&town.y>=0&&town.y<=1400);
 assert.ok(Number.isFinite(worldModule.height(town.x,town.y)));
}
for(const road of w.feeders){
 assert.equal(road.points.length,3);
 const town=w.settlements.find(s=>s.id===road.settlement);
 assert.deepEqual(road.points[0],[town.x,town.y]);
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
