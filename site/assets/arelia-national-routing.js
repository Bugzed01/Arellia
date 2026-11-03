/* Arélia Maps — réseau national topologique fictif, v1.3.
   Construit ses nœuds à partir des lignes visibles, des intersections et
   des embranchements. Longueurs géométriques dans le repère XY Arélia.
   Les croisements sont supposés franchissables, faute de données d'ouvrages. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaNationalRouting=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const cellSize=32;
 const round=n=>Math.round(n*10000)/10000;
 const xy=a=>[round(a[0]),round(a[1])];
 const key=p=>round(p[0])+','+round(p[1]);
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
 function project(p,a,b){
  const v=[b[0]-a[0],b[1]-a[1]],l=v[0]*v[0]+v[1]*v[1];
  const t=l?Math.max(0,Math.min(1,((p[0]-a[0])*v[0]+(p[1]-a[1])*v[1])/l)):0;
  const q=[a[0]+v[0]*t,a[1]+v[1]*t];
  return {point:xy(q),distance:distance(p,q),t};
 }
 function intersection(a,b,c,d){
  const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=cross(r,s);
  if(Math.abs(den)<1e-10)return null;
  const delta=[c[0]-a[0],c[1]-a[1]],t=cross(delta,s)/den,u=cross(delta,r)/den;
  if(t< -1e-8||t>1+1e-8||u< -1e-8||u>1+1e-8)return null;
  const f=Math.max(0,Math.min(1,t)),g=Math.max(0,Math.min(1,u));
  return {t:f,u:g,point:xy([a[0]+f*r[0],a[1]+f*r[1]])};
 }
 function roadSegments(roads){
  const out=[];
  for(const road of roads){
   for(let i=0;i<road.points.length-1;i++){
    const a=road.points[i],b=road.points[i+1];
    if(distance(a,b)<1e-7)continue;
    out.push({a,b,roadId:road.id,kind:road.kind||'national',seq:i,
     breaks:[{t:0,p:xy(a)},{t:1,p:xy(b)}],
     left:Math.min(a[0],b[0]),right:Math.max(a[0],b[0]),
     top:Math.min(a[1],b[1]),bottom:Math.max(a[1],b[1])});
   }
  }
  return out;
 }
 function build(geo,world){
  const major=geo.places.filter(p=>['capitale','metropole','ville'].includes(p.category));
  const towns=world.settlements||[];
  const main=[...geo.roads.map(r=>({...r,kind:'national'})),...(world.arterials||[])];
  const secondary=world.feeders||[];
  const access=[];
  const mainSegments=roadSegments(main);
  const stops=new Map();
  for(const p of major){
   const pt=[p.x,p.y];
   let closest=null;
   for(const seg of mainSegments){
    const proj=project(pt,seg.a,seg.b);
    if(!closest||proj.distance<closest.distance)closest=proj;
   }
   if(!closest)throw Error('Aucune voie nationale');
   access.push({id:'access-'+p.id,kind:'access',points:[pt,closest.point]});
   stops.set(p.id,xy(pt));
  }
  for(const p of towns)stops.set(p.id,[p.x,p.y]);
  const routes=[...main,...secondary,...access];
  const segments=roadSegments(routes),cells=new Map(),used=new Set();
  // Index spatial : évite une comparaison quadratique globale.
  for(let i=0;i<segments.length;i++){
   const seg=segments[i];
   for(let x=Math.floor(seg.left/cellSize);x<=Math.floor(seg.right/cellSize);x++)
    for(let y=Math.floor(seg.top/cellSize);y<=Math.floor(seg.bottom/cellSize);y++){
     const id=x+','+y;if(!cells.has(id))cells.set(id,[]);
     cells.get(id).push(i);
    }
  }
  let crossings=0;
  for(const candidates of cells.values()){
   for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    const ia=candidates[i],ib=candidates[j],serial=ia<ib?ia+':'+ib:ib+':'+ia;
    if(used.has(serial))continue;used.add(serial);
    const a=segments[ia],b=segments[ib];
    if(a.roadId===b.roadId&&Math.abs(a.seq-b.seq)<=1)continue;
    if(a.right<b.left-1e-8||b.right<a.left-1e-8||a.bottom<b.top-1e-8||b.bottom<a.top-1e-8)continue;
    const hit=intersection(a.a,a.b,b.a,b.b);
    if(!hit)continue;
    a.breaks.push({t:hit.t,p:hit.point});b.breaks.push({t:hit.u,p:hit.point});
    crossings++;
   }
  }
  const nodes=[],adj=[],byKey=new Map(),edgeCount={national:0,regionale:0,desserte:0,access:0},edges=[];
  function node(p){
   const k=key(p);
   if(!byKey.has(k)){const id=nodes.length;nodes.push(xy(p));adj.push([]);byKey.set(k,id)}
   return byKey.get(k);
  }
  for(const s of segments){
   s.breaks.sort((a,b)=>a.t-b.t);
   for(let k=1;k<s.breaks.length;k++){
    const u=node(s.breaks[k-1].p),v=node(s.breaks[k].p);
    if(u===v)continue;
    const length=distance(nodes[u],nodes[v]);
    if(length<1e-5)continue;
    const edge={to:v,units:length,roadId:s.roadId,kind:s.kind};
    adj[u].push(edge);adj[v].push({...edge,to:u});
    edges.push({u,v,units:length,roadId:s.roadId,kind:s.kind});
    edgeCount[s.kind]=(edgeCount[s.kind]||0)+1;
   }
  }
  const stopNodes={};
  for(const [id,p] of stops){const index=byKey.get(key(p));if(index===undefined)throw Error('Pôle non connecté : '+id);stopNodes[id]=index}
  // Diagnostic des composantes : ne jamais inventer de liaison pour un pôle isolé.
  const component=new Int32Array(nodes.length).fill(-1);let componentCount=0;
  for(let i=0;i<nodes.length;i++){
   if(component[i]!==-1)continue;
   const queue=[i];component[i]=componentCount;
   for(let cursor=0;cursor<queue.length;cursor++)for(const link of adj[queue[cursor]])
    if(component[link.to]===-1){component[link.to]=componentCount;queue.push(link.to)}
   componentCount++;
  }
  return {nodes,edges,adj,stops:stopNodes,component:Array.from(component),componentCount,
   count:{segments:segments.length,crossings,edges:edges.length,nodes:nodes.length,places:stops.size,components:componentCount,
    edgeTypes:edgeCount},unconnected:major.concat(towns).filter(p=>component[stopNodes[p.id]]!==component[stopNodes[major[0].id]]).map(p=>p.id)};
 }
 class Heap{
  constructor(){this.a=[]}
  push(node,d){const arr=this.a;let i=arr.length;arr.push({node,d});while(i>0){const p=(i-1)>>1;if(arr[p].d<=d)break;arr[i]=arr[p];i=p;}arr[i]={node,d};}
  pop(){const arr=this.a;if(!arr.length)return null;const top=arr[0],last=arr.pop();if(arr.length){let i=0;while(true){let c=i*2+1;if(c>=arr.length)break;if(c+1<arr.length&&arr[c+1].d<arr[c].d)c++;if(last.d<=arr[c].d)break;arr[i]=arr[c];i=c;}arr[i]=last;}return top;}
  get size(){return this.a.length}
 }
 function shortest(graph,from,to){
  const start=graph.stops[from],finish=graph.stops[to];
  if(start===undefined||finish===undefined||start===finish)return null;
  if(graph.component[start]!==graph.component[finish])return null;
  const dist=new Float64Array(graph.nodes.length).fill(Infinity);
  const prev=new Int32Array(graph.nodes.length).fill(-1);
  const prevRoad=new Array(graph.nodes.length),heap=new Heap();
  dist[start]=0;heap.push(start,0);
  while(heap.size){
   const entry=heap.pop(),u=entry.node;
   if(entry.d>dist[u]+1e-9)continue;
   if(u===finish)break;
   for(const edge of graph.adj[u]){
    const nd=dist[u]+edge.units;
    if(nd<dist[edge.to]-1e-9){
     dist[edge.to]=nd;prev[edge.to]=u;prevRoad[edge.to]=edge.roadId;
     heap.push(edge.to,nd);
    }
   }
  }
  if(!Number.isFinite(dist[finish]))return null;
  const points=[],roads=[];let v=finish,safety=0;
  while(v!==start){
   if(++safety>graph.nodes.length||prev[v]<0)return null;
   points.push(graph.nodes[v]);roads.push(prevRoad[v]);v=prev[v];
  }
  points.push(graph.nodes[start]);points.reverse();roads.reverse();
  const unique=[...new Set(roads.filter(x=>!String(x).startsWith('access-')))];
  return {points,roads:unique,units:dist[finish],segments:points.length-1,
   mode:'road',from,to,status:'schématique : carrefours et franchissements non qualifiés'};
 }
 return {build,shortest,project,intersection};
});
