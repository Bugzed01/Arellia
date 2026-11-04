/* Arélia Maps 1.14 — conventions graphiques de la voirie fictive.
 * Seuls les sommets partagés dans le graphe produisent des carrefours.
 * Ce sont des objets de conception et non des routes attestées sur le terrain.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaRoadDetail=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function roadTier(road){
  const label=((road?.class||road?.kind||road?.type||'')+'').toLowerCase();
  if(label.includes('express')||label.includes('autoroute')||label.includes('rocade')||label.includes('contournement'))return 'express';
  if(label.includes('avenue')||label.includes('boulevard')||label==='avenues')return 'primary';
  if(label.includes('rue')||label.includes('locale')||label==='streets')return 'local';
  if(label.includes('lanes')||label.includes('ruelle')||label.includes('sentier'))return 'lane';
  return 'local';
 }
 const roadSizes={express:3.3,primary:1.8,local:.79,lane:.41};
 function paintRoad(ctx,road,night=false,level=25,options={}){
  const pts=road?.points;if(!Array.isArray(pts)||pts.length<2)return null;
  const tier=roadTier(road),width=roadSizes[tier];
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  function stroke(color,w,dash=null){
   ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
   for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
   ctx.strokeStyle=color;ctx.lineWidth=w;
   ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([]);
  }
  const border=night?'#6e7471':tier==='express'?'#978877':'#a99e8e';
  const fill=night?'#d9d7cb':tier==='express'?'#f3dfbd':tier==='primary'?'#fff4dd':'#faf6e9';
  stroke(border,width+.45);stroke(fill,width);
  if(level>=33&&tier==='express'){
   stroke(night?'#a49d83':'#baad8e',.075,[.85,.9]);
  }else if(level>=54&&tier==='primary'){
   stroke(night?'#b9b3a1':'#d4c6a3',.057,[.56,.67]);
  }
  ctx.restore();
  return {tier,width};
 }
 function junctions(graph,options={}){
  if(!graph?.nodes||!graph?.edges||!graph?.adj)throw new TypeError('Graphe routier absent');
  const minRoads=options.minRoads??2,result=[];
  for(let i=0;i<graph.nodes.length;i++){
   const links=graph.adj[i]||[];
   if(links.length<3)continue;
   const roads=new Set(),tiers=new Set(),provisional=[];
   for(const link of links){
    const edge=graph.edges[link.edgeId];if(!edge)continue;
    if(edge.provisional){provisional.push(edge.roadId);continue;}
    roads.add(edge.roadId);tiers.add(roadTier({kind:edge.kind}));
   }
   if(roads.size<minRoads)continue;
   result.push({id:'carrefour-'+i,point:graph.nodes[i],degree:links.length,
    roadCount:roads.size,roads:[...roads].sort(),
    tier:tiers.has('express')?'express':tiers.has('primary')?'primary':'local',
    provisionalAdjacent:provisional.length>0,status:'jonction explicite du graphe fictif'});
  }
  return result;
 }
 function bridgeGeometry(bridge){
  if(!Number.isFinite(bridge?.x)||!Number.isFinite(bridge?.y))return null;
  const span=Math.max(.4,Number(bridge.span)||3),width=Math.max(.3,Number(bridge.width)||1.3);
  const angle=Number.isFinite(bridge.angle)?bridge.angle:0;
  const tangent=[Math.cos(angle),Math.sin(angle)];
  return {
   id:bridge.id,center:[bridge.x,bridge.y],angle,span,width,
   ends:[
    [bridge.x-tangent[0]*span/2,bridge.y-tangent[1]*span/2],
    [bridge.x+tangent[0]*span/2,bridge.y+tangent[1]*span/2]
   ],status:'ouvrage proposé selon les données urbaines'
  };
 }
 function paintBridge(ctx,bridge,night=false,level=25){
  const g=bridgeGeometry(bridge);
  if(!g)return null;
  ctx.save();ctx.translate(g.center[0],g.center[1]);ctx.rotate(g.angle);
  const s=g.span,w=g.width;
  ctx.fillStyle=night?'#454f54':'#897e73';ctx.fillRect(-s/2,-w*.68,s,w*1.36);
  ctx.fillStyle=night?'#dad2c4':'#f7ebd7';ctx.fillRect(-s/2,-w*.48,s,w*.96);
  ctx.fillStyle=night?'#929a9d':'#c4ab8c';
  ctx.fillRect(-s/2,-w*.67,s,Math.max(.08,w*.15));
  ctx.fillRect(-s/2,w*.52,s,Math.max(.08,w*.15));
  if(level>=24){
   ctx.strokeStyle=night?'#8c948c':'#c9b593';ctx.lineWidth=.055;
   ctx.setLineDash([.32,.26]);ctx.beginPath();ctx.moveTo(-s*.38,0);ctx.lineTo(s*.38,0);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.restore();return g;
 }
 return {roadTier,roadSizes,paintRoad,junctions,bridgeGeometry,paintBridge};
});
