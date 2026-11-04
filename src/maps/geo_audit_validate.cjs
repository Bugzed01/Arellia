/* Franchissements routiers et ferrés nationaux : diagnostic vérifiable. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('../../site/assets/arelia-geo-audit.js');
const worldAPI=require('../../site/assets/arelia-world.js');
const root=path.resolve(__dirname,'../../site/assets');
const geo=JSON.parse(fs.readFileSync(path.join(root,'arelia-map-data.json'),'utf8'));
const w=worldAPI.makeWorld(geo),audit=api.analyze(geo,w),repeat=api.analyze(geo,w);
assert.deepEqual(audit,repeat,'Audit non reproductible');
assert.equal(audit.version,'1.4.0');
assert.equal(audit.count.rivers,geo.rivers.length+w.streams.length);
assert.equal(audit.count.railLines,geo.railways.length);
assert.ok(audit.count.roadCrossings>2,'Croisements fluviaux nationaux absents');
assert.ok(audit.bridges.every(x=>x.kind==='franchissement-fluvial-à-qualifier'));
assert.ok(audit.lakeConflicts.every(x=>x.kind==='tracé-sur-le-lac'));
assert.ok(audit.coastalConflicts.every(x=>x.kind==='tracé-hors-terre'));
assert.equal(new Set(audit.bridges.map(x=>x.id)).size,audit.bridges.length,'Ponts dupliqués');
assert.equal(api.intersection([0,5],[10,5],[5,0],[5,10]).point[0],5);
assert.equal(api.intersection([0,5],[10,5],[5,0],[5,10]).point[1],5);
assert.equal(api.intersection([0,0],[1,0],[2,0],[3,0]),null);
assert.equal(api.inside([5,5],[[2,2],[8,2],[8,8],[2,8]]),true);
assert.equal(api.inside([10,5],[[2,2],[8,2],[8,8],[2,8]]),false);
const fictional={roads:[{id:'R',points:[[0,5],[10,5]]}],railways:[],
 rivers:[{id:'F',points:[[5,0],[5,10]]}],lake:[[2,2],[8,2],[8,8],[2,8]],
 coastline:[[0,0],[10,0],[10,10],[0,10]],islands:[]};
const sample=api.analyze(fictional,{arterials:[],feeders:[],streams:[]});
assert.equal(sample.count.roadCrossings,1);
assert.equal(sample.count.lakeConflicts,1);
assert.equal(sample.count.coastalConflicts,0);
const on=api.onRoute([[0,5],[10,5]],sample);
assert.equal(on.bridges.length,1);assert.equal(on.lakeConflicts.length,1);
for(const x of audit.bridges){
 const route=(x.mode==='route'?[...geo.roads,...w.arterials,...w.feeders]:geo.railways).find(r=>r.id===x.lineId);
 const river=[...geo.rivers,...w.streams].find(r=>r.id===x.riverId);
 assert.ok(route&&river);
 const distanceTo=(pts)=>Math.min(...pts.slice(1).map((p,i)=>api.nearest(x.point,pts[i],p)));
 assert.ok(distanceTo(route.points)<.002,'Franchissement hors axe '+x.id);
 assert.ok(distanceTo(river.points)<.002,'Franchissement hors eau '+x.id);
}
console.log('Hydrographie : '+audit.count.roadCrossings+' passages routiers et '+audit.count.railwayCrossings+' ferroviaires à qualifier.');
console.log('Anomalies : '+audit.count.lakeConflicts+' portions sur le lac, '+audit.count.coastalConflicts+' portions hors terre à examiner.');
