/* Arélia Maps 1.13 — inventaire des ruptures de voirie.
 * Diagnostique des lacunes géométriques, NE CREE AUCUNE VOIE.
 * Une proximité sur terre ne prouve ni carrefour ni chaussée existante.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./arelia-urban-routing.js'):root.AreliaUrbanRouting);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaRoadGaps=api;
})(typeof window==='undefined'?globalThis:window,function(urban){
 'use strict';
 const ROUND=n=>Math.round(n*1000)/1000, CELL=18,MAX_RADIUS=20;
 const key=(i,j)=>i+','+j;
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 function analyze(graph,city,geo){
  if(!graph||!graph.nodes||!graph.edges||!graph.component)throw new TypeError('Graphe local requis');
  if(graph.component.length!==graph.nodes.length)throw new RangeError('Composantes incohérentes');
  const groups=new Map();
  for(let i=0;i<graph.nodes.length;i++){
   const component=graph.component[i];
   if(!groups.has(component))groups.set(component,[]);
   groups.get(component).push(i);
  }
  const sorted=[...groups].sort((a,b)=>b[1].length-a[1].length||a[0]-b[0]);
  if(!sorted.length)return {cityId:graph.cityId,components:0,main:null,gaps:[],isolated:0,totalOrphanNodes:0,status:'aucune voie'};
  const [mainId,mainNodes]=sorted[0];
  const mainEdges=graph.edges.filter(e=>graph.component[e.a]===mainId);
  const cells=new Map();
  for(let id=0;id<mainEdges.length;id++){
   const e=mainEdges[id],a=graph.nodes[e.a],b=graph.nodes[e.b];
   const left=Math.floor((Math.min(a[0],b[0])-MAX_RADIUS)/CELL),right=Math.floor((Math.max(a[0],b[0])+MAX_RADIUS)/CELL);
   const top=Math.floor((Math.min(a[1],b[1])-MAX_RADIUS)/CELL),bottom=Math.floor((Math.max(a[1],b[1])+MAX_RADIUS)/CELL);
   for(let x=left;x<=right;x++)for(let y=top;y<=bottom;y++){
    const name=key(x,y);
    if(!cells.has(name))cells.set(name,[]);
    cells.get(name).push(id);
   }
  }
  const main={
   component:mainId,nodeCount:mainNodes.length,edgeCount:mainEdges.length,
   roadCount:new Set(mainEdges.map(e=>e.roadId)).size
  };
  function endpoints(group){
   const member=new Set(group),roads=new Set(),pts=group.map(n=>graph.nodes[n]);
   for(const edge of graph.edges)
    if(member.has(edge.a))roads.add(edge.roadId);
   const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
   return {
    roads:[...roads].sort(),
    center:[ROUND(xs.reduce((a,b)=>a+b,0)/pts.length),ROUND(ys.reduce((a,b)=>a+b,0)/pts.length)],
    bounds:[ROUND(Math.min(...xs)),ROUND(Math.min(...ys)),ROUND(Math.max(...xs)),ROUND(Math.max(...ys))]
   };
  }
  const gaps=[];
  for(const [component,nodeIds] of sorted.slice(1)){
   const shape=endpoints(nodeIds),candidates=[];
   // Chercher un point d'approche vers les chaussées de la composante principale.
   for(const nodeId of nodeIds){
    const point=graph.nodes[nodeId],cell=cells.get(key(Math.floor(point[0]/CELL),Math.floor(point[1]/CELL)))||[];
    let closest=null;
    for(const edgeId of new Set(cell)){
     const edge=mainEdges[edgeId],a=graph.nodes[edge.a],b=graph.nodes[edge.b];
     const projection=urban.projection(point,a,b);
     if(projection.distance>MAX_RADIUS)continue;
     if(!closest||projection.distance<closest.distance)
      closest={point,foot:projection.point,distance:projection.distance,roadId:edge.roadId};
    }
    if(closest)candidates.push(closest);
   }
   candidates.sort((a,b)=>a.distance-b.distance);
   const nearest=candidates[0]||null;
   // Tester les candidats les plus courts (jusqu'à 24) pour proposer
   // des pistes d'inspection sans supposer l'existence d'un ouvrage.
   let terrestrial=null,checked=0,blocked=0;
   const seen=new Set();
   for(const c of candidates){
    if(checked>=24)break;
    const code=c.point.join(',')+'|'+c.foot.join(',');
    if(seen.has(code))continue;
    seen.add(code);checked++;
    if(c.distance<.008||!urban.connectorClear(c.point,c.foot,city,geo)){blocked++;continue;}
    if(!terrestrial)terrestrial=c;
   }
   const format=c=>c?{
    from:c.point.map(ROUND),to:c.foot.map(ROUND),
    distanceUnits:ROUND(c.distance),nearestRoad:c.roadId
   }:null;
   gaps.push({
    id:(city.id||graph.cityId)+'-rupture-'+String(gaps.length+1).padStart(2,'0'),
    component,nodeCount:nodeIds.length,roads:shape.roads,
    center:shape.center,bounds:shape.bounds,nearest:format(nearest),
    candidate:format(terrestrial),tested:checked,blocked,
    reason:terrestrial?'Terre franchissable dans le modèle ; voie et carrefour non attestés'
      :nearest?'Intersection, eau ou limite à expertiser ; aucune liaison terrestre attestée'
      :'Aucune chaussée de la composante principale à proximité',
    status:'Rupture non qualifiée'
   });
  }
  return {cityId:graph.cityId,components:sorted.length,
   main,gaps,isolated:gaps.length,
   totalOrphanNodes:gaps.reduce((s,g)=>s+g.nodeCount,0),
   status:'Diagnostic géométrique sans création de route'};
 }
 return {analyze};
});
