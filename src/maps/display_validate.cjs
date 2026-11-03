const assert=require('node:assert/strict');const d=require('../../site/assets/arelia-display.js');
assert.equal(d.fade(3,4,6),0);assert.equal(d.fade(5,4,6),.5);assert.equal(d.fade(7,4,6),1);
assert.deepEqual([2,7,17,29].map(d.band),['empire','agglomeration','quartiers','rues']);
const a=[1110,698],p=[190,280],c=d.pinchCamera(a,p,3,1.6,1,20);
assert.ok(Math.abs(a[0]*c.scale+c.tx-p[0])<1e-8&&Math.abs(a[1]*c.scale+c.ty-p[1])<1e-8);
assert.equal(d.pinchCamera(a,p,3,40,1,20).scale,20);
for(const z of [.4,1,4,12,25,50]){const b=d.scaleBar(z,1.000261);assert.ok(b.width>0&&b.label);assert.ok(Math.abs(b.width-b.km/1.000261*z)<1e-8)}
const h=d.declutter([{id:'a',x:20,y:60,name:'Vésone',priority:10,showsLabel:true},{id:'b',x:22,y:59,name:'Belrives',priority:1,showsLabel:true},{id:'c',x:200,y:60,name:'Port-Bréon',priority:4,showsLabel:true}]);assert.deepEqual([...h],['b']);
console.log('V1.0 : échelles, zoom ancré et collision de libellés validés.');

const fs=require('node:fs'),path=require('node:path');
const browser=fs.readFileSync(path.resolve(__dirname,'../../site/assets/arelia-maps.js'),'utf8');
const markup=fs.readFileSync(path.resolve(__dirname,'atlas_markup.py'),'utf8');
for(const token of ['pointercancel','lostpointercapture','pinchCamera','maps-detail-dismiss','collision-hidden','maps-zoom-band']){
 assert.ok((browser+markup).includes(token),'Fonction manquante : '+token);
}
