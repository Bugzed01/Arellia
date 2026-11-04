/* Arélia Maps 1.11 — routage local et porte-à-porte hiérarchique.
 * Aucune intersection implicite entre lignes qui se croisent sans sommet.
 * Les raccordements nouveaux sont explicites, contrôlés et provisoires.
 * Repère local fictif XY ; aucune indication de circulation ou de temps.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./arelia-world.js'):root.AreliaWorld,
  typeof module==='object'&&module.exports?require('./arelia-national-routing.js'):root.AreliaNationalRouting);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaUrbanRouting=api;
})(typeof window==='undefined'?globalThis:window,function(world,national){
 'use strict';
 const PRECISION=1000,CELL=12;
 const r=n=>Math.round(n*PRECISION)/PRECISION;
 const xy=p=>[r(p[0]),r(p[1])];
 const key=p=>r(p[0])+','+r(p[1]);
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const inside=(p,poly)=>world.inside(p,poly);
 const lineSets=['avenues','streets','expressways','lanes'];
 const coordValid=p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite);
 const isValid=route=>route&&Array.isArray(route.points)&&route.points.length>=2&&route.points.every(coordValid);
 const lineList=city=>{
  const lines=[];
  for(const kind of lineSets)for(const source of city[kind]||[]){
   if(!isValid(source))continue;
   lines.push({id:source.id||kind+'-'+lines.length,kind,points:source.points.map(xy),provisional:false});
  }
  return lines;
 };
 function projection(point,a,b){
  const vx=b[0]-a[0],vy=b[1]-a[1],d=vx*vx+vy*vy;
  const t=d?Math.max(0,Math.min(1,((point[0]-a[0])*vx+(point[1]-a[1])*vy)/d)):0;
  const foot=xy([a[0]+t*vx,a[1]+t*vy]);
  return {point:foot,t,distance:dist(point,foot)};
 }
 function waterClear(a,b,city){
  // Les canaux urbains ne peuvent être traversés par une voie créée automatiquement.
  const waters=[...(city.water||[]),...(city.canals||[])].filter(isValid);
  const steps=Math.max(1,Math.ceil(dist(a,b)/.20));
  for(let i=0;i<=steps;i++){
   const t=i/steps,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   for(const water of waters)for(let j=1;j<water.points.length;j++){
    if(projection(p,water.points[j-1],water.points[j]).distance<((water.width||1.4)/2+.16))return false;
   }
  }
  return true;
 }
 function connectorClear(a,b,city,geo){
  if(!coordValid(a)||!coordValid(b)||dist(a,b)<.005)return false;
  const n=Math.max(1,Math.ceil(dist(a,b)/.35));
  for(let i=0;i<=n;i++){
   const t=i/n,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   if(city.outline&&!inside(p,city.outline))return false;
   if(geo&&!world.isLand(p,geo))return false;
  }
  return waterClear(a,b,city);
 }
 function makeSegments(lines){
  const segments=[];
  for(const route of lines)for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i];
   if(dist(a,b)<.001)continue;
   segments.push({a,b,roadId:route.id,kind:route.kind,provisional:route.provisional,
    breaks:[{t:0,point:a},{t:1,point:b}]});
  }
  return segments;
 }
 function nearestSegment(point,segments,maxDistance=Infinity){
  let best=null;
  for(const segment of segments){
   const p=projection(point,segment.a,segment.b);
   if(p.distance>maxDistance)continue;
   if(!best||p.distance<best.distance)best={...p,segment};
  }
  return best;
 }
 function addLinks(lines,city,geo){
  const primary=lines.filter(q=>q.kind==='avenues'||q.kind==='expressways');
  const primarySeg=makeSegments(primary);
  const provisional=[],rejected=[],perRoute=new Set();
  // Raccordements limités aux extrémités des rues existantes ; les
  // croisements à niveau ou les ponts ne sont jamais présumés.
  for(const line of lines){
   if(line.kind!=='streets'&&line.kind!=='lanes')continue;
   const ends=[line.points[0],line.points[line.points.length-1]];
   for(let i=0;i<ends.length;i++){
    const a=ends[i],hit=nearestSegment(a,primarySeg,5.5);
    if(!hit||hit.distance<.006)continue;
    if(!connectorClear(a,hit.point,city,geo)){
     rejected.push({roadId:line.id,end:i,reason:'eau, côte ou territoire protégé'});
     continue;
    }
    const id='raccord-'+line.id+'-'+i;
    provisional.push({id,kind:'raccordement',points:[a,hit.point],provisional:true,attachedTo:hit.segment.roadId});
    perRoute.add(line.id);
   }
  }
  // Porte d'accès urbaine vers l'étape nationale, sans liaison invisible.
  const cityCenter=city.center||[city.meta?.center?.[0],city.meta?.center?.[1]];
  if(coordValid(cityCenter)){
   const center=xy(cityCenter),hit=nearestSegment(center,primarySeg.length?primarySeg:makeSegments(lines),9);
   if(hit&&hit.distance>=.006){
    if(connectorClear(center,hit.point,city,geo))
     provisional.push({id:'raccord-centre-'+(city.id||city.meta?.id||'vesone'),kind:'acces',points:[center,hit.point],provisional:true});
    else rejected.push({roadId:'centre',reason:'centre non raccordable sans franchissement inventé'});
   }
  }
  return {lines:[...lines,...provisional],provisional,rejected};
 }
 function buildLocal(city,geo){
  if(!city)throw new TypeError('Ville manquante');
  const sources=lineList(city),linked=addLinks(sources,city,geo),segments=makeSegments(linked.lines);
  const cells=new Map();
  const bucket=(x,y)=>Math.floor(x/CELL)+','+Math.floor(y/CELL);
  for(let i=0;i<segments.length;i++){
   const s=segments[i],l=Math.floor(Math.min(s.a[0],s.b[0])/CELL),rr=Math.floor(Math.max(s.a[0],s.b[0])/CELL),
    t=Math.floor(Math.min(s.a[1],s.b[1])/CELL),bb=Math.floor(Math.max(s.a[1],s.b[1])/CELL);
   for(let x=l;x<=rr;x++)for(let y=t;y<=bb;y++){
    const id=x+','+y;if(!cells.has(id))cells.set(id,[]);
    cells.get(id).push(i);
   }
  }
  // Une extrémité posée sur l'intérieur d'un segment le coupe en deux.
  // Deux segments qui se croisent sans extrémité commune ne le font PAS.
  const vertices=new Map();
  for(const line of linked.lines)for(const p of line.points)vertices.set(key(p),p);
  for(const p of vertices.values())for(const i of cells.get(bucket(p[0],p[1]))||[]){
   const s=segments[i],hit=projection(p,s.a,s.b);
   if(hit.distance>.0018||hit.t<.00001||hit.t>1-.00001)continue;
   s.breaks.push({t:hit.t,point:xy(p)});
  }
  const nodes=[],adj=[],edges=[],nodeIndex=new Map();
  function node(p){
   const id=key(p);
   if(!nodeIndex.has(id)){nodeIndex.set(id,nodes.length);nodes.push(xy(p));adj.push([]);}
   return nodeIndex.get(id);
  }
  for(const s of segments){
   s.breaks.sort((a,b)=>a.t-b.t);
   let last=null;
   for(const cut of s.breaks){
    const id=node(cut.point);
    if(last===null){last=id;continue;}
    if(last!==id){
     const units=dist(nodes[last],nodes[id]),edgeId=edges.length;
     if(units>.00001){
      edges.push({a:last,b:id,units,roadId:s.roadId,kind:s.kind,provisional:s.provisional});
      adj[last].push({to:id,edgeId,units});
      adj[id].push({to:last,edgeId,units});
     }
    }
    last=id;
   }
  }
  const component=new Int32Array(nodes.length).fill(-1);let components=0;
  for(let i=0;i<nodes.length;i++){
   if(component[i]>=0)continue;
   const queue=[i];component[i]=components;
   for(let k=0;k<queue.length;k++)for(const a of adj[queue[k]])
    if(component[a.to]<0){component[a.to]=components;queue.push(a.to);}
   components++;
  }
  const center=city.center||(city.meta?.center)||null;
  const count={roads:sources.length,proposedConnectors:linked.provisional.length,rejectedConnectors:linked.rejected.length,
   nodes:nodes.length,edges:edges.length,components};
  return {cityId:city.id||city.meta?.id||'vesone',center:center?xy(center):null,nodes,adj,edges,component:Array.from(component),
   count,rejected:linked.rejected,connectors:linked.provisional};
 }
 class Heap{
  constructor(){this.a=[]}
  push(id,d){let a=this.a,i=a.length;a.push({id,d});while(i){const p=(i-1)>>1;if(a[p].d<=d)break;a[i]=a[p];i=p;}a[i]={id,d};}
  pop(){const a=this.a,t=a[0],e=a.pop();if(a.length){let i=0;while(true){let j=i*2+1;if(j>=a.length)break;if(j+1<a.length&&a[j+1].d<a[j].d)j++;if(e.d<=a[j].d)break;a[i]=a[j];i=j;}a[i]=e;}return t;}
  get size(){return this.a.length}
 }
 function snap(graph,pt,maxDistance=12,componentId=null){
  let best=null;
  for(let i=0;i<graph.edges.length;i++){
   const e=graph.edges[i];
   if(componentId!==null&&graph.component[e.a]!==componentId)continue;
   const hit=projection(pt,graph.nodes[e.a],graph.nodes[e.b]);
   if(hit.distance>maxDistance)continue;
   if(!best||hit.distance<best.distance)best={...hit,edge:e,edgeId:i};
  }
  return best;
 }
 function shortestLocal(graph,from,to,options={}){
  if(!coordValid(from)||!coordValid(to)||!graph.edges.length)return null;
  const limit=options.maxAccess??14,nearA=new Map(),nearB=new Map();
  // Les anciens plans de Vésone comportent de nombreuses routes disjointes.
  // Explorer les composantes accessibles aux deux points évite un accrochage
  // sur un cul-de-sac plus proche mais totalement isolé.
  for(let i=0;i<graph.edges.length;i++){
   const e=graph.edges[i],component=graph.component[e.a],a=graph.nodes[e.a],b=graph.nodes[e.b];
   const p=projection(from,a,b),q=projection(to,a,b);
   if(p.distance<=limit&&(!nearA.has(component)||p.distance<nearA.get(component).distance))
    nearA.set(component,{...p,edge:e,edgeId:i});
   if(q.distance<=limit&&(!nearB.has(component)||q.distance<nearB.get(component).distance))
    nearB.set(component,{...q,edge:e,edgeId:i});
  }
  const candidates=[];
  for(const [component,a] of nearA){
   const b=nearB.get(component);if(!b)continue;
   candidates.push({component,a,b,gap:a.distance+b.distance});
  }
  candidates.sort((a,b)=>a.gap-b.gap);
  let chosen=null,quality=Infinity;
  for(const pair of candidates.slice(0,6)){
   const a=pair.a,b=pair.b;
   const n=graph.nodes.length,d=new Float64Array(n).fill(Infinity);
   const prev=new Int32Array(n).fill(-1),via=new Int32Array(n).fill(-1),heap=new Heap();
   const seed=(id,cost)=>{if(cost<d[id]){d[id]=cost;heap.push(id,cost)}};
   seed(a.edge.a,a.t*a.edge.units);seed(a.edge.b,(1-a.t)*a.edge.units);
   while(heap.size){
    const cur=heap.pop(),u=cur.id;if(cur.d>d[u]+1e-9)continue;
    for(const e of graph.adj[u]){
     const nd=d[u]+e.units;
     if(nd<d[e.to]-1e-9){d[e.to]=nd;prev[e.to]=u;via[e.to]=e.edgeId;heap.push(e.to,nd);}
    }
   }
   const optionsEnd=[
    {id:b.edge.a,units:d[b.edge.a]+b.t*b.edge.units},
    {id:b.edge.b,units:d[b.edge.b]+(1-b.t)*b.edge.units}
   ];
   if(a.edgeId===b.edgeId)optionsEnd.push({id:-1,units:Math.abs(a.t-b.t)*a.edge.units});
   optionsEnd.sort((a,b)=>a.units-b.units);
   const winner=optionsEnd[0];if(!Number.isFinite(winner.units))continue;
   const roads=[],points=[];
   if(winner.id===-1){points.push(a.point,b.point);roads.push(a.edge.roadId);}
   else {
    const nodes=[],roadEdges=[];let v=winner.id,k=0;
    while(v>=0){if(++k>graph.nodes.length+1)break;nodes.push(graph.nodes[v]);if(prev[v]>=0)roadEdges.push(via[v]);v=prev[v];}
    if(k>graph.nodes.length+1)continue;
    nodes.reverse();roadEdges.reverse();
    roads.push(a.edge.roadId,...roadEdges.map(id=>graph.edges[id].roadId),b.edge.roadId);
    points.push(a.point,...nodes,b.point);
   }
   const clean=[];for(const pt of points)if(!clean.length||dist(clean.at(-1),pt)>.00001)clean.push(pt);
   const access=[];
   if(a.distance>.02)access.push({from:xy(from),to:a.point,distance:a.distance});
   if(b.distance>.02)access.push({from:b.point,to:xy(to),distance:b.distance});
   const route={points:clean,units:winner.units,roads:[...new Set(roads)],
    segments:Math.max(0,clean.length-1),access,source:'local',cityId:graph.cityId,
    component:pair.component,provisionalConnectors:graph.count.proposedConnectors,
    status:'voies locales représentées ; accès hors voie signalés'};
   const penalty=winner.units+pair.gap*3.5;
   if(penalty<quality){quality=penalty;chosen=route;}
  }
  return chosen;
 }
 function createService(geo,worldData,cities,nationalGraph){
  if(!nationalGraph?.stops)throw new Error('Graphe national absent');
  const cache=new Map(),centers=new Map(geo.places.filter(p=>['ville','capitale','metropole'].includes(p.category)).map(p=>[p.id,p]));
  function localCity(id){
   if(!cache.has(id)){
    const city=cities[id];
    if(!city)return null;
    cache.set(id,buildLocal(city,geo));
   }
   return cache.get(id);
  }
  function endpoint(p){
   if(!p||!coordValid([p.x,p.y]))return null;
   if(nationalGraph.stops[p.id]!==undefined)return {stopId:p.id,cityId:null,point:[p.x,p.y],local:false};
   if(p.cityId&&centers.has(p.cityId)&&cities[p.cityId])
    return {stopId:p.cityId,cityId:p.cityId,point:[p.x,p.y],local:true};
   return null;
  }
  function route(from,to){
   const a=endpoint(from),b=endpoint(to);
   if(!a||!b||from.id===to.id)return null;
   if(a.local&&b.local&&a.cityId===b.cityId){
    const graph=localCity(a.cityId),local=graph&&shortestLocal(graph,a.point,b.point);
    return local?{...local,sections:[local],mode:'urban',from:from.id,to:to.id}:null;
   }
   const parts=[],access=[],roads=[];
   if(a.local){
    const graph=localCity(a.cityId),center=centers.get(a.stopId);
    const section=graph&&shortestLocal(graph,a.point,[center.x,center.y]);
    if(!section)return null;
    parts.push(section);access.push(...section.access);roads.push(...section.roads);
   }
   if(a.stopId!==b.stopId){
    const section=national.shortest(nationalGraph,a.stopId,b.stopId);
    if(!section)return null;
    parts.push(section);roads.push(...section.roads);
   }
   if(b.local){
    const graph=localCity(b.cityId),center=centers.get(b.stopId);
    const section=graph&&shortestLocal(graph,[center.x,center.y],b.point);
    if(!section)return null;
    parts.push(section);access.push(...section.access);roads.push(...section.roads);
   }
   if(!parts.length)return null;
   const points=[];
   for(const p of parts)for(const q of p.points)
    if(!points.length||dist(points.at(-1),q)>.00001)points.push(q);
   return {points,sections:parts,units:parts.reduce((s,p)=>s+p.units,0),
    roads:[...new Set(roads)],segments:Math.max(0,points.length-1),
    mode:'hierarchical',from:from.id,to:to.id,access,
    status:'liaisons nationales et urbaines représentées ; accès hors voie signalés'};
  }
  return {route,localCity,diagnostics:()=>[...cache].map(([id,g])=>({cityId:id,...g.count}))};
 }
 return {buildLocal,shortestLocal,createService,projection,connectorClear,waterClear};
});
