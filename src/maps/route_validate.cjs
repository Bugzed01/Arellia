/* Regression tests for the Arélia Maps v0.8 route engine. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const routing=require('../../site/assets/arelia-routing.js');
const city=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../site/assets/vesone-city.json'),'utf8'));
const geo=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../site/assets/arelia-map-data.json'),'utf8'));
const metro=city.metropolitan;
assert.equal(city.meta.version,'0.8.0');
const road=routing.buildRoadGraph(metro.roads);
const rail=routing.buildRailGraph(metro.regional_rail);
const ids=['vesone',...metro.satellites.map(p=>p.id)];
assert.equal(ids.length,8);
assert.ok(road.nodes.length>100,'Intersections routières insuffisantes');
assert.ok(road.edges.length>road.nodes.length/2,'Graphe routier insuffisant');
assert.ok(road.intersectionCount>=7,'Rocade et pénétrantes sans intersections');
for(const a of ids)for(const b of ids){
  if(a===b)continue;
  const byRoad=routing.shortestRoad(road,a,b);
  const byRail=routing.shortestRail(rail,a,b);
  assert.ok(byRoad&&byRoad.points.length>=2,'Réseau routier déconnecté : '+a+' / '+b);
  assert.ok(byRail&&byRail.points.length>=2,'Réseau ferré déconnecté : '+a+' / '+b);
  assert.ok(byRoad.units>0&&byRail.units>0);
  assert.ok(byRoad.points.every(p=>p.length===2&&p.every(Number.isFinite)));
  assert.ok(byRail.points.every(p=>p.length===2&&p.every(Number.isFinite)));
  assert.ok(Math.abs(byRoad.units-routing.shortestRoad(road,b,a).units)<.00001);
}
assert.ok(geo.meta.kilometres_per_unit>0);
console.log('Routage v0.8 valide : '+road.nodes.length+' nœuds, '+road.edges.length+
  ' arcs, '+road.intersectionCount+' intersections identifiées, 56 OD routières et ferroviaires testées.');
