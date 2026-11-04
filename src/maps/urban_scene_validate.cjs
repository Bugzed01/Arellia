/* Arélia Maps 1.15 — couverture des détails urbains, géométrie et rendu. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'site/assets',name),'utf8'));
const geo=read('arelia-map-data.json');
const worldAPI=require('../../site/assets/arelia-world.js');
const urbanScene=require('../../site/assets/arelia-urban-scene.js');
const world=worldAPI.makeWorld(geo);
const others=read('arelia-other-cities.json').cities;
const vesone=read('vesone-city.json');
const cities={...others,...world.cityPlans,vesone:{...vesone,id:'vesone',center:vesone.meta.center}};
const operations=[];
const ctx=new Proxy({},{
 get(obj,key){
  if(typeof key==='symbol')return undefined;
  if(!(key in obj))obj[key]=(...args)=>{operations.push(key);return undefined};
  return obj[key];
 },set(obj,key,value){obj[key]=value;return true}
});
let trees=0,parking=0,courts=0,yards=0,roofs=0;
assert.equal(Object.keys(cities).length,10);
for(const city of Object.values(cities)){
 const scene=urbanScene.create(city,geo);
 assert.equal(scene,urbanScene.create(city,geo),'Cache urbanisation instable : '+city.id);
 const clone={...city};
 assert.deepEqual(urbanScene.create(clone,geo),scene,'Graine non reproductible : '+city.id);
 assert.equal(scene.status,'détails urbains provisoires non canoniques');
 assert.ok(scene.trees.length>=70,'Alignement d’arbres absent : '+city.id);
 assert.ok(scene.parking.length>=12,'Stationnement insuffisant : '+city.id);
 assert.ok(scene.courts.length>=3,'Équipement sportif absent : '+city.id);
 for(const tree of scene.trees){
  assert.ok(worldAPI.isLand([tree.x,tree.y],geo),'Arbre dans l’eau : '+city.id);
  assert.ok(worldAPI.inside([tree.x,tree.y],city.outline),'Arbre hors de ville : '+city.id);
 }
 for(const lot of scene.parking){
  for(const p of lot.polygon){
   assert.ok(worldAPI.isLand(p,geo),'Parking dans l’eau : '+city.id);
   assert.ok(worldAPI.inside(p,city.outline),'Parking hors de ville : '+city.id);
  }
 }
 for(const court of scene.courts){
  assert.ok((city.parks||[]).some(park=>court.polygon.every(p=>worldAPI.inside(p,park.polygon))),
   'Équipement sportif hors parc : '+city.id);
 }
 urbanScene.paintLand(ctx,scene,false,45);
 urbanScene.paintStreet(ctx,scene,false,45);
 const first=(city.buildings||[])[0];
 assert.ok(first?.polygon?.length>=3,'Bâtiment absent : '+city.id);
 urbanScene.drawBuilding(ctx,first,false,45);
 urbanScene.drawBuilding(ctx,first,true,20);
 trees+=scene.trees.length;parking+=scene.parking.length;courts+=scene.courts.length;
 yards+=scene.yards.length;roofs+=(city.buildings||[]).length;
}
assert.ok(trees>=2500,'Masse végétale urbaine trop faible');
assert.ok(parking>=300,'Stationnements urbains trop peu nombreux');
assert.ok(courts>=50,'Parcs urbains sous-équipés');
assert.ok(yards>=3,'Sites d’activité portuaire absents');
assert.ok(roofs>=3500,'Empreintes de bâtiments existants manquantes');
assert.ok(operations.filter(q=>q==='fill').length>=500,'Le rendu ne dessine pas les objets');
console.log('Arélia Maps 1.15 : '+trees+' arbres en voirie, '+parking+' aires de stationnement, '+
 courts+' équipements de parc, '+yards+' cours portuaires et '+roofs+' bâtiments de référence.');
console.log('Reproductibilité, limites des villes, présence des parcelles sur terre et API de rendu : OK.');
