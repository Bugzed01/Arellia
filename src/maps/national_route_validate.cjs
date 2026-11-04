/* Topologie nationale : contrôle de 18 grands centres et de localités fictives. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const worldAPI=require('../../site/assets/arelia-world.js');
const engine=require('../../site/assets/arelia-national-routing.js');
const root=path.resolve(__dirname,'../../site/assets');
const geo=JSON.parse(fs.readFileSync(path.join(root,'arelia-map-data.json'),'utf8'));
const world=worldAPI.makeWorld(geo);
const graph=engine.build(geo,world);
const major=geo.places.filter(p=>['capitale','metropole','ville'].includes(p.category));
const town=world.settlements;
assert.ok(graph.count.nodes>1000&&graph.count.edges>1000,'Graphe national trop simple');
assert.equal(Object.keys(graph.stops).length,major.length+town.length);
assert.ok(graph.count.crossings>20,'Raccordements entre voies non calculés');
assert.ok(graph.count.unqualifiedCrossings>100,'Aucun croisement sans qualification identifié');
assert.ok(graph.uncertainCrossings.length>0,'Inventaire des croisements absents');
assert.ok(graph.count.components>=1);
let tested=0,missing=[];
for(let i=0;i<major.length;i++)for(let j=0;j<major.length;j++){
 if(i===j)continue;
 const a=major[i],b=major[j],route=engine.shortest(graph,a.id,b.id);
 if(!route){missing.push([a.id,b.id]);continue}
 assert.deepEqual(route.points[0],[a.x,a.y],'Point de départ inexistant '+a.id);
 assert.deepEqual(route.points.at(-1),[b.x,b.y],'Arrivée non raccordée '+b.id);
 assert.ok(route.units>=Math.hypot(a.x-b.x,a.y-b.y)-.2,'Distance inférieure à la ligne droite');
 assert.ok(route.points.length>1&&route.roads.length>0);
 const back=engine.shortest(graph,b.id,a.id);
 assert.ok(back&&Math.abs(back.units-route.units)<.0002,'Tracés non symétriques');
 tested++;
}
assert.equal(missing.length,0,'Pôles majeurs isolés : '+JSON.stringify(missing.slice(0,8)));
let ruralTested=0,isolated=[];
for(const t of town){
 const route=engine.shortest(graph,'vesone',t.id);
 if(!route){isolated.push(t.id);continue;}
 assert.deepEqual(route.points.at(-1),[t.x,t.y]);
 ruralTested++;
}
assert.equal(isolated.length,0,'Localités sans voie connectée : '+isolated.slice(0,15).join(','));
assert.equal(graph.unconnected.length,0,'Pôles isolés de la composante principale');
console.log('Réseau national : '+graph.count.nodes+' nœuds, '+graph.count.edges+' arêtes et '+graph.count.crossings+' intersections.');
console.log('Itinéraires : '+tested+' trajets interurbains, '+ruralTested+' localités reliées ; aucune voie hors réseau détectée.');
