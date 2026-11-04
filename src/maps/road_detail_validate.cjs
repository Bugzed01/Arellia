/* Arélia Maps 1.14 : lisibilité de la voirie, intersections explicites et accès.
 * Un croisement non raccordé NE DOIT PAS être représenté en carrefour.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=x=>JSON.parse(fs.readFileSync(path.join(root,'site/assets',x),'utf8'));
const urban=require('../../site/assets/arelia-urban-routing.js');
const national=require('../../site/assets/arelia-national-routing.js');
const worldAPI=require('../../site/assets/arelia-world.js');
const style=require('../../site/assets/arelia-road-detail.js');
const geo=read('arelia-map-data.json'),world=worldAPI.makeWorld(geo);
const vesone=read('vesone-city.json'),metro=vesone.metropolitan||{};
const others=read('arelia-other-cities.json').cities;
const cities={...others,...world.cityPlans,vesone:{
 ...vesone,id:'vesone',center:vesone.meta.center,outline:null,
 avenues:[...(vesone.avenues||[]),...(metro.roads||[])],
 streets:[...(vesone.streets||[]),...(metro.local_streets||[])],
 water:[...(vesone.water||[]),...(metro.terrain?.waterways||[])]
}};
assert.equal(style.roadTier({kind:'rocade'}),'express');
assert.equal(style.roadTier({kind:'expressways'}),'express');
assert.equal(style.roadTier({class:'avenue'}),'primary');
assert.equal(style.roadTier({kind:'boulevard'}),'primary');
assert.equal(style.roadTier({kind:'rue'}),'local');
assert.equal(style.roadTier({kind:'lanes'}),'lane');
let painted=0;
const fakeCtx={
 save(){},restore(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){painted++},
 translate(){},rotate(){},fillRect(){painted++},
};
assert.ok(style.paintRoad(fakeCtx,{kind:'express',points:[[0,0],[5,0],[8,1]]},false,65));
assert.ok(style.paintRoad(fakeCtx,{class:'avenue',points:[[0,0],[2,0]]},true,65));
assert.equal(style.paintRoad(fakeCtx,{points:[]}),null);
assert.ok(painted>=5);
const bridge=vesone.bridges[0],geometry=style.bridgeGeometry(bridge);
assert.ok(geometry);
assert.ok(Math.abs(Math.hypot(
 geometry.ends[0][0]-geometry.ends[1][0],
 geometry.ends[0][1]-geometry.ends[1][1])-bridge.span)<1e-8);
assert.equal(style.bridgeGeometry({x:NaN,y:0}),null);
assert.ok(style.paintBridge(fakeCtx,bridge,false,40));
const crossing=urban.buildLocal({id:'croisement',center:[0,0],avenues:[
 {id:'horizontal',points:[[0,0],[10,0]]},
 {id:'vertical',points:[[5,-5],[5,5]]}
]});
assert.equal(crossing.count.components,2);
assert.equal(style.junctions(crossing).length,0,'Faux carrefour dessiné au croisement sans sommet');
const tee=urban.buildLocal({id:'jonction-t',center:[0,0],avenues:[
 {id:'axe',points:[[0,0],[10,0]]},
 {id:'connexion',points:[[5,0],[5,5]]}
]});
const junctions=style.junctions(tee);
assert.equal(junctions.length,1,'Carrefour véritable non visible');
assert.deepEqual(junctions[0].point,[5,0]);
assert.equal(junctions[0].roadCount,2);
let totalJunctions=0,blocked=0,checked=0,unknown=0;
for(const city of Object.values(cities)){
 const graph=urban.buildLocal(city,geo);
 const nodes=style.junctions(graph);
 totalJunctions+=nodes.length;
 assert.ok(nodes.every(j=>j.roads.length>=2&&graph.nodes.some(p=>p[0]===j.point[0]&&p[1]===j.point[1])),
  'Carrefour créé sans sommet dans le graphe : '+city.id);
 const center=city.center||city.meta?.center;
 for(const poi of city.places||[]){
  const path=urban.shortestLocal(graph,center,[poi.x,poi.y],{
   accessCheck:(a,b)=>urban.connectorClear(a,b,city,geo)
  });
  assert.ok(path,'Lieu inaccessible après audit des accès : '+poi.id);
  assert.ok(path.blockedAccess===path.access.filter(a=>a.geometryClear===false).length);
  for(const a of path.access){
   assert.equal(typeof a.geometryClear,'boolean');
   assert.ok(a.status);
   checked++;
   if(!a.geometryClear)blocked++;
  }
 }
}
assert.ok(totalJunctions>400,'Carrefours explicites insuffisants');
assert.ok(checked>100,'Les accès hors réseau ne sont pas audités');
assert.ok(blocked>0,'Obstacles hors réseau non détectés');
const nationalGraph=national.build(geo,world);
const service=urban.createService(geo,world,cities,nationalGraph);
const a={...vesone.places.find(p=>p.id==='v-palais'),cityId:'vesone'};
const b=world.cityPlans.katoru.places[0];
const route=service.route(a,b);
assert.ok(route?.sections?.length>=2);
assert.equal(route.blockedAccess,route.access.filter(x=>x.geometryClear===false).length);
assert.ok(route.access.every(x=>typeof x.geometryClear==='boolean'));
console.log('Atlas 1.14 : '+totalJunctions+' carrefours explicitement modélisés ; '+
 checked+' accès testés dont '+blocked+' géométriquement bloqués, non comptabilisés comme voies.');
console.log('Croisement sans sommet, carrefour en T et ponts uniquement déclarés dans le plan : OK.');
