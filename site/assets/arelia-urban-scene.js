/* Arélia Maps 1.15 — tissu urbain et mobilier cartographique fictifs.
 * Aucun fond de plan tiers, réseau externe ou donnée cadastrale. Les scènes
 * sont stables à chaque zoom et dérivées des voies et des parcs existants.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./arelia-world.js'):root.AreliaWorld);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaUrbanScene=api;
})(typeof window==='undefined'?globalThis:window,function(world){
 'use strict';
 const VERSION='1.15.0',cache=new WeakMap(),TAU=Math.PI*2;
 function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
 const round=n=>Math.round(n*1000)/1000;
 const point=(x,y)=>[round(x),round(y)];
 const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const rect=(cx,cy,a,b,theta)=>{
  const co=Math.cos(theta),si=Math.sin(theta);
  return [[-a,-b],[a,-b],[a,b],[-a,b]].map(([u,v])=>point(cx+u*co-v*si,cy+u*si+v*co));
 };
 function inside(p,poly){if(!poly?.length)return false;return world.inside(p,poly);}
 function lineDistance(p,pts){
  let best=Infinity;
  for(let i=1;i<pts.length;i++)best=Math.min(best,world.segmentDistance(p,pts[i-1],pts[i]).distance);
  return best;
 }
 function create(city,geo){
  if(!city?.outline?.length||!geo?.coastline)throw new TypeError('Plan de ville ou territoire absent');
  if(cache.has(city)&&cache.get(city).geo===geo)return cache.get(city).scene;
  const id=city.id||city.meta?.id||'vesone';
  let seed=20261104;for(const char of id)seed=Math.imul(seed^char.charCodeAt(0),16777619);
  const random=rng(seed),scene={version:VERSION,cityId:id,trees:[],parking:[],courts:[],yards:[],status:'détails urbains provisoires non canoniques'};
  const isSafe=p=>inside(p,city.outline)&&world.isLand(p,geo)&&
   ![...(city.water||[]),...(city.canals||[])].some(r=>lineDistance(p,r.points)<((r.width||1.4)/2+.9));
  const parks=(city.parks||[]).filter(p=>p?.polygon?.length>=3);
  const exclusion=[...parks,...(city.portYards||[]),...(city.harbourBasins||[]),...(city.harbour_basins||[])];
  const roadList=[...(city.avenues||[]),...(city.streets||[]),...(city.expressways||[]),...(city.portRoads||[])];
  const buildings=(city.buildings||[]).filter(b=>b.polygon?.length>=3);
  const spots=new Map(),CELL=4;
  function occupied(p,radius){
   const x=Math.floor(p[0]/CELL),y=Math.floor(p[1]/CELL);
   for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)
    for(const q of spots.get((x+dx)+','+(y+dy))||[])if(d(p,q)<radius)return true;
   return false;
  }
  function reserve(p){const k=Math.floor(p[0]/CELL)+','+Math.floor(p[1]/CELL);
   if(!spots.has(k))spots.set(k,[]);spots.get(k).push(p);
  }
  const bcenters=buildings.map(b=>b.polygon.reduce((p,q)=>[p[0]+q[0]/b.polygon.length,p[1]+q[1]/b.polygon.length],[0,0]));
  const nearBuilding=(p,radius)=>bcenters.some(q=>Math.abs(p[0]-q[0])<radius&&Math.abs(p[1]-q[1])<radius&&d(p,q)<radius);
  // Rideaux d'arbres et lampadaires situés au bord des routes longues.
  for(const road of roadList.filter(r=>(r.class==='avenue'||r.class==='boulevard'||r.kind==='rocade'||r.kind==='contournement'||r.kind==='express')&&r.points?.length>=2)){
   for(let k=1;k<road.points.length;k++){
    const a=road.points[k-1],b=road.points[k],len=d(a,b);if(len<1.5)continue;
    const nx=-(b[1]-a[1])/len,ny=(b[0]-a[0])/len;
    const count=Math.ceil(len/3.3);
    for(let z=0;z<count;z++){
     if(scene.trees.length>=950)break;
     const t=(z+.35)/count;
     for(const side of [-1,1]){
      if(random()<.23)continue;
      const margin=1.55+(road.kind==='rocade'?.5:0)+random()*.32;
      const p=point(a[0]+(b[0]-a[0])*t+nx*margin*side,a[1]+(b[1]-a[1])*t+ny*margin*side);
      if(!isSafe(p)||occupied(p,1.05)||nearBuilding(p,.95)||exclusion.some(q=>inside(p,q.polygon)))continue;
      reserve(p);
      scene.trees.push({x:p[0],y:p[1],radius:round(.22+random()*.22),shade:random(),kind:city.theme==='aride'?'dry':'avenue'});
     }
    }
   }
  }
  // Cours et petits parkings suivent l'orientation de leur voie d'accès.
  // Pas de routabilité implicite : ces cours ne sont que des détails de surface.
  const maxLots=id==='vesone'?58:city.cityType?50:42;
  for(let attempt=0;attempt<4000&&scene.parking.length<maxLots;attempt++){
   const road=roadList[Math.floor(random()*roadList.length)];
   if(!road?.points?.length||road.points.length<2)continue;
   const seg=Math.floor(random()*(road.points.length-1)),a=road.points[seg],b=road.points[seg+1],len=d(a,b);
   if(len<1.4)continue;
   const t=.13+random()*.74,ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len,side=random()<.5?-1:1;
   const offset=2.7+random()*2.5,p=point(a[0]+(b[0]-a[0])*t-uy*offset*side,a[1]+(b[1]-a[1])*t+ux*offset*side);
   if(occupied(p,4.4)||nearBuilding(p,2.8)||exclusion.some(q=>inside(p,q.polygon)))continue;
   const width=1.25+random()*1.25,depth=.65+random()*.5,theta=Math.atan2(uy,ux);
   const polygon=rect(p[0],p[1],width,depth,theta);
   if(!polygon.every(isSafe))continue;
   reserve(p);
   scene.parking.push({id:id+'-parking-'+scene.parking.length,polygon,center:p,angle:theta,spaces:3+Math.floor(random()*5),occupancy:random(),kind:random()<.2?'service':'stationnement'});
  }
  // Terrains de sports intégrés aux véritables polygones de parcs du plan.
  let sports=0;
  for(const park of parks){
   if(sports>=9)break;
   const poly=park.polygon,cx=poly.reduce((a,p)=>a+p[0]/poly.length,0),cy=poly.reduce((a,p)=>a+p[1]/poly.length,0);
   const angles=[0,.4,Math.PI/2,-.4];
   let added=false;
   for(const theta of angles){
    const shape=rect(cx,cy,1.15,.66,theta);
    if(!shape.every(p=>inside(p,poly)&&isSafe(p)))continue;
    scene.courts.push({id:id+'-sport-'+sports,polygon:shape,center:point(cx,cy),angle:theta,kind:sports%3===0?'terrain':'court'});
    sports++;added=true;break;
   }
   if(added)continue;
  }
  // Utilisation des emprises portuaires connues, sans créer de port ailleurs.
  for(const yard of (city.portYards||[]).slice(0,12)){
   const poly=yard.polygon;if(!poly?.length)continue;
   const center=poly.reduce((p,q)=>[p[0]+q[0]/poly.length,p[1]+q[1]/poly.length],[0,0]);
   if(!inside(center,city.outline))continue;
   scene.yards.push({center:point(...center),polygon:poly,id:yard.id});
  }
  cache.set(city,{geo,scene});return scene;
 }
 function shape(ctx,poly){if(!poly?.length)return false;ctx.beginPath();ctx.moveTo(poly[0][0],poly[0][1]);for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i][0],poly[i][1]);ctx.closePath();return true;}
 function drawBuilding(ctx,building,night=false,level=20){
  const p=building?.polygon;if(!p||p.length<3)return;
  const roof=night?'#aeb7af':building.roof||'#cfbfaa';
  ctx.save();
  if(level>=14){
   // Ombre projetée constante : le rendu reste identique à chaque session.
   const off=Math.min(.32,.10+level*.004);
   shape(ctx,p.map(([x,y])=>[x+off,y+off*.73]));
   ctx.fillStyle=night?'rgba(9,23,27,.33)':'rgba(72,66,57,.24)';ctx.fill();
  }
  shape(ctx,p);ctx.fillStyle=roof;ctx.fill();
  ctx.strokeStyle=night?'#777e76':'#a69a88';ctx.lineWidth=level>=30?.075:.10;ctx.stroke();
  if(level>=38&&p.length===4){
   const a=[(p[0][0]+p[3][0])/2,(p[0][1]+p[3][1])/2];
   const b=[(p[1][0]+p[2][0])/2,(p[1][1]+p[2][1])/2];
   ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);
   ctx.lineWidth=.055;ctx.strokeStyle=night?'rgba(231,224,204,.24)':'rgba(255,247,229,.56)';ctx.stroke();
  }
  ctx.restore();
 }
 function paintLand(ctx,scene,night=false,level=20){
  if(!scene||level<15)return;
  ctx.save();
  for(const area of scene.parking){
   if(!shape(ctx,area.polygon))continue;
   ctx.fillStyle=night?'#515a56':area.kind==='service'?'#c6beb0':'#d2c9b8';ctx.fill();
   ctx.lineWidth=.08;ctx.strokeStyle=night?'#777d75':'#a9a28f';ctx.stroke();
   if(level<22)continue;
   const [x,y]=area.center,co=Math.cos(area.angle),si=Math.sin(area.angle),n=area.spaces;
   ctx.strokeStyle=night?'#9c9f92':'#f2eadb';ctx.lineWidth=.055;
   for(let k=1;k<n;k++){
    const u=(k/n-.5)*2.15;
    const cx=x+co*u,cy=y+si*u;
    ctx.beginPath();ctx.moveTo(cx-si*.58,cy+co*.58);ctx.lineTo(cx+si*.58,cy-co*.58);ctx.stroke();
   }
   if(level>=40&&area.occupancy>.5){
    ctx.fillStyle=night?'#a9b9b1':'#667e82';
    for(let k=0;k<Math.floor(n*area.occupancy);k++){
     const u=(k/n-.46)*2.05,cx=x+co*u,cy=y+si*u;
     const car=rect(cx,cy,.14,.24,area.angle);
     shape(ctx,car);ctx.fill();
    }
   }
  }
  for(const court of scene.courts){
   if(!shape(ctx,court.polygon))continue;
   ctx.fillStyle=night?'#41665a':court.kind==='terrain'?'#759e76':'#bf836f';ctx.fill();
   ctx.strokeStyle='#f0e8d2';ctx.lineWidth=.065;ctx.stroke();
   if(level>=20){
    const [x,y]=court.center,co=Math.cos(court.angle),si=Math.sin(court.angle);
    ctx.beginPath();ctx.moveTo(x-co*.92,y-si*.92);ctx.lineTo(x+co*.92,y+si*.92);
    ctx.strokeStyle='rgba(255,248,223,.65)';ctx.lineWidth=.055;ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,.23,0,TAU);ctx.stroke();
   }
  }
  if(level>=28)for(const yard of scene.yards){
   const [x,y]=yard.center;
   for(let k=0;k<7;k++){
    ctx.fillStyle=night?'#7f8380':['#a98c6a','#7c9593','#c2a36e'][k%3];
    ctx.fillRect(x+(k%4)*.47-.93,y+Math.floor(k/4)*.52-.40,.39,.38);
   }
  }
  ctx.restore();
 }
 function paintStreet(ctx,scene,night=false,level=20){
  if(!scene||level<16)return;
  ctx.save();
  for(const tree of scene.trees){
   const {x,y,radius}=tree,r=radius;
   ctx.beginPath();ctx.arc(x+r*.35,y+r*.40,r*1.1,0,TAU);
   ctx.fillStyle=night?'rgba(13,31,32,.28)':'rgba(59,70,57,.22)';ctx.fill();
   ctx.beginPath();ctx.arc(x,y,r,0,TAU);
   ctx.fillStyle=night?'#547768':tree.kind==='dry'?'#839c67':tree.shade>.55?'#537f60':'#6f996c';ctx.fill();
   if(level>=32){
    ctx.beginPath();ctx.arc(x-r*.25,y-r*.28,r*.35,0,TAU);
    ctx.fillStyle=night?'rgba(190,208,178,.12)':'rgba(199,220,173,.24)';ctx.fill();
   }
  }
  ctx.restore();
 }
 return {VERSION,create,drawBuilding,paintLand,paintStreet};
});
