/* Arélia Maps 1.4 — audit géométrique des franchissements.
   Les croisements des tracés fictifs ne prouvent pas l'existence d'un pont.
   Les tests exploitent la même géométrie que l'atlas, sans données externes. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaGeoAudit=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const round=n=>Math.round(n*1000)/1000;
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
 function intersection(a,b,c,d){
  const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=cross(r,s);
  if(Math.abs(den)<1e-10)return null;
  const delta=[c[0]-a[0],c[1]-a[1]],t=cross(delta,s)/den,u=cross(delta,r)/den;
  if(t< -1e-9||t>1+1e-9||u< -1e-9||u>1+1e-9)return null;
  const time=Math.max(0,Math.min(1,t)),portion=Math.max(0,Math.min(1,u));
  return {t:time,u:portion,point:[round(a[0]+time*r[0]),round(a[1]+time*r[1])]};
 }
 function inside(p,poly){
  if(!poly?.length)return false;
  let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if((a[1]>p[1])!== (b[1]>p[1]) &&
    p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
  }
  return yes;
 }
 function segmentMid(a,b){return [(a[0]+b[0])*.5,(a[1]+b[1])*.5]}
 function nearest(p,a,b){
  const v=[b[0]-a[0],b[1]-a[1]],sq=v[0]*v[0]+v[1]*v[1];
  const t=sq?Math.min(1,Math.max(0,((p[0]-a[0])*v[0]+(p[1]-a[1])*v[1])/sq)):0;
  return dist(p,[a[0]+v[0]*t,a[1]+v[1]*t]);
 }
 function segments(lines,mode){
  const out=[];
  for(const line of lines){
   if(!line.points?.length)continue;
   for(let i=1;i<line.points.length;i++){
    const a=line.points[i-1],b=line.points[i];
    if(dist(a,b)<1e-8)continue;
    out.push({lineId:line.id,mode,kind:line.kind||'',a,b,segment:i-1,
     minX:Math.min(a[0],b[0]),maxX:Math.max(a[0],b[0]),
     minY:Math.min(a[1],b[1]),maxY:Math.max(a[1],b[1])});
   }
  }
  return out;
 }
 function analyze(geo,world){
  const roadLines=[...(geo.roads||[]),...(world.arterials||[]),...(world.feeders||[])];
  const lines=segments(roadLines,'route').concat(segments(geo.railways||[],'rail'));
  const rivers=[...(geo.rivers||[]),...(world.streams||[])];
  const riverSegments=segments(rivers,'eau');
  const seen=new Set(),bridges=[],lakeConflicts=[],coastalConflicts=[];
  for(const line of lines){
   const {a,b,lineId,mode}=line;
   for(const river of riverSegments){
    if(line.maxX<river.minX-1e-8||river.maxX<line.minX-1e-8||
       line.maxY<river.minY-1e-8||river.maxY<line.minY-1e-8)continue;
    const hit=intersection(a,b,river.a,river.b);
    if(!hit)continue;
    const id=mode+':'+lineId+':'+river.lineId+':'+Math.round(hit.point[0]*20)+':'+Math.round(hit.point[1]*20);
    if(seen.has(id))continue;seen.add(id);
    bridges.push({id,mode,lineId,riverId:river.lineId,point:hit.point,kind:'franchissement-fluvial-à-qualifier',status:'proposition non vérifiée'});
   }
   if(geo.lake?.length>2){
    const times=[0,1];for(let i=0;i<geo.lake.length;i++){
     const hit=intersection(a,b,geo.lake[i],geo.lake[(i+1)%geo.lake.length]);
     if(hit)times.push(hit.t);
    }
    times.sort((x,y)=>x-y);
    for(let i=1;i<times.length;i++){
      const midpoint=(times[i-1]+times[i])*.5;
      const p=[a[0]+(b[0]-a[0])*midpoint,a[1]+(b[1]-a[1])*midpoint];
      if(!inside(p,geo.lake)||times[i]-times[i-1]<1e-7)continue;
      lakeConflicts.push({id:mode+':'+lineId+':'+line.segment+':lac-'+i,lineId,mode,
       point:[round(p[0]),round(p[1])],kind:'tracé-sur-le-lac',status:'anomalie à résoudre'});
    }
   }
   // Une liaison partiellement au large est un conflit à examiner,
   // non une interdiction automatique des infrastructures côtières.
   if(geo.coastline?.length>2){
    const samples=[.2,.4,.6,.8];
    const inLand=p=>inside(p,geo.coastline)||(geo.islands||[]).some(poly=>inside(p,poly));
    if(samples.some(t=>!inLand([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]))){
      coastalConflicts.push({id:mode+':'+lineId+':'+line.segment+':mer',
       lineId,mode,point:[round((a[0]+b[0])/2),round((a[1]+b[1])/2)],
       kind:'tracé-hors-terre',status:'anomalie à examiner'});
    }
   }
  }
  const count={roadCrossings:bridges.filter(b=>b.mode==='route').length,
   railwayCrossings:bridges.filter(b=>b.mode==='rail').length,
   lakeConflicts:lakeConflicts.length,coastalConflicts:coastalConflicts.length,
   rivers:rivers.length,roadLines:roadLines.length,railLines:(geo.railways||[]).length};
  return {version:'1.4.0',bridges,lakeConflicts,coastalConflicts,count,
    disclaimer:'Franchissements, passages maritimes et conflits : candidats géométriques seulement. Aucun pont, tunnel, échangeur ou risque réel n’est établi.'};
 }
 function onRoute(points,audit){
  if(!points||points.length<2||!audit)return {bridges:[],lakeConflicts:[],coastalConflicts:[]};
  const close=pt=>points.slice(1).some((end,i)=>nearest(pt,points[i],end)<.12);
  return {bridges:audit.bridges.filter(b=>b.mode==='route'&&close(b.point)),
    lakeConflicts:audit.lakeConflicts.filter(b=>b.mode==='route'&&close(b.point)),
    coastalConflicts:audit.coastalConflicts.filter(b=>b.mode==='route'&&close(b.point))};
 }
 return {analyze,onRoute,intersection,inside,nearest};
});
