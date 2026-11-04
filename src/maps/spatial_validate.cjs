/* Arélia Maps 1.9 — validation complète de l'index spatial.
 * Chaque objet attendu dans un rayon de recherche doit être accessible
 * sans parcourir le monde entier lors du rendu d'une tuile. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const geo=JSON.parse(fs.readFileSync(path.join(__dirname,'../../site/assets/arelia-map-data.json'),'utf8'));
const worldAPI=require('../../site/assets/arelia-world.js');
const spatial=require('../../site/assets/arelia-spatial.js');
const detail=require('../../site/assets/arelia-detail.js');
const world=worldAPI.makeWorld(geo);
const index=spatial.createIndex(geo,world);
const roads=[...geo.roads,...world.arterials,...world.feeders];
const rivers=[...geo.rivers,...world.streams];
assert.equal(index.count.towns,world.settlements.length);
assert.equal(index.count.roadSegments,roads.reduce((n,r)=>n+r.points.length-1,0));
assert.equal(index.count.riverSegments,rivers.reduce((n,r)=>n+r.points.length-1,0));
assert.equal(index.size,48);
function bruteDistance(pt){
 let minimum=Infinity;
 for(const road of roads)for(let k=1;k<road.points.length;k++){
  const a=road.points[k-1],b=road.points[k];
  if(Math.abs(pt[0]-Math.min(a[0],b[0]))>36&&pt[0]<Math.min(a[0],b[0])-36)continue;
  const hit=worldAPI.segmentDistance(pt,a,b);
  minimum=Math.min(minimum,hit.distance);
 }
 return minimum;
}
for(const [x,y] of [[500,740],[562,670],[800,500],[1208,917],[490,338],[1100,860],[705,492],[932,789],[596,440],[640,1120]]){
 const candidates=index.roadsAt(x,y);
 const near=index.townsAt(x,y);
 const indexed=Math.min(Infinity,...candidates.map(r=>worldAPI.segmentDistance([x,y],r.a,r.b).distance));
 const brute=bruteDistance([x,y]);
 if(brute<=36)assert.ok(Math.abs(brute-indexed)<1e-5,'Route absente de la cellule '+x+','+y);
 for(const town of world.settlements){
  if(Math.abs(town.x-x)>78||Math.abs(town.y-y)>78)continue;
  assert.ok(near.includes(town),'Localité absente du secteur '+x+','+y);
 }
 const water=index.riversAt(x,y);
 for(const river of rivers)for(let k=1;k<river.points.length;k++){
  const a=river.points[k-1],b=river.points[k];
  const left=Math.min(a[0],b[0]),right=Math.max(a[0],b[0]),top=Math.min(a[1],b[1]),bottom=Math.max(a[1],b[1]);
  if(x>=left-16&&x<=right+16&&y>=top-16&&y<=bottom+16)
   assert.ok(water.some(s=>s.a===a&&s.b===b),'Rivière absente du secteur '+x+','+y);
 }
}
const independentWorld=worldAPI.makeWorld(geo);
const first=detail.tile(geo,worldAPI.localTile(geo,35,31),35,31,world);
const repeat=detail.tile(geo,worldAPI.localTile(geo,35,31),35,31,independentWorld);
assert.deepEqual(first,repeat,'Géométrie non reproductible après changement de contexte');
assert.ok(first.hedges.length>=4,'Haies agricoles absentes du territoire');
for(const hedge of first.hedges)assert.ok(detail.lineOnLand(hedge.points,geo),'Haie hors terre');
assert.equal(detail.spatialIndex(geo,world),detail.spatialIndex(geo,world),'Index mal mis en cache');
console.log('Arélia 1.9 : '+index.count.towns+' localités, '+index.count.roadSegments+' segments routiers, '+index.count.riverSegments+' segments hydrographiques indexés ; 10 sondes d’intégrité spatiale OK.');
