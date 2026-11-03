/* Arélia Maps 0.8 : calcul d'itinéraires sur les corridors géographiques fictifs.
   JavaScript autonome partagé entre navigateur et tests Node, sans service externe. */
(function(root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  root.AreliaRouting=api;
})(typeof window==='undefined' ? globalThis : window,function(){
  'use strict';
  const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
  const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const precision=n=>Math.round(n*10000)/10000;
  const key=p=>precision(p[0])+','+precision(p[1]);
  function intersection(s,t){
    const r=[s.b[0]-s.a[0],s.b[1]-s.a[1]];
    const v=[t.b[0]-t.a[0],t.b[1]-t.a[1]];
    const delta=[t.a[0]-s.a[0],t.a[1]-s.a[1]];
    const den=cross(r,v);if(Math.abs(den)<1e-9)return null;
    const u=cross(delta,r)/den,f=cross(delta,v)/den;
    if(f<-1e-8||f>1+1e-8||u<-1e-8||u>1+1e-8)return null;
    const p=[s.a[0]+Math.min(1,Math.max(0,f))*r[0],s.a[1]+Math.min(1,Math.max(0,f))*r[1]];
    return {f:Math.max(0,Math.min(1,f)),u:Math.max(0,Math.min(1,u)),p};
  }
  function buildRoadGraph(roads){
    const segments=[];
    for(const road of roads){
      for(let i=0;i<road.points.length-1;i++){
        const a=road.points[i],b=road.points[i+1];
        if(len(a,b)<1e-8)continue;
        segments.push({a,b,roadId:road.id,breaks:[{t:0,p:a},{t:1,p:b}]});
      }
    }
    for(let i=0;i<segments.length;i++){
      for(let j=i+1;j<segments.length;j++){
        const a=segments[i],b=segments[j];
        if(Math.max(a.a[0],a.b[0])<Math.min(b.a[0],b.b[0])-1e-7 ||
           Math.max(b.a[0],b.b[0])<Math.min(a.a[0],a.b[0])-1e-7 ||
           Math.max(a.a[1],a.b[1])<Math.min(b.a[1],b.b[1])-1e-7 ||
           Math.max(b.a[1],b.b[1])<Math.min(a.a[1],a.b[1])-1e-7)continue;
        const hit=intersection(a,b);if(!hit)continue;
        a.breaks.push({t:hit.f,p:hit.p});b.breaks.push({t:hit.u,p:hit.p});
      }
    }
    const nodes=[],adj=[],lookup=new Map(),edges=[];
    function get(p){
      const k=key(p);
      if(!lookup.has(k)){
        const id=nodes.length;lookup.set(k,id);nodes.push([precision(p[0]),precision(p[1])]);adj.push([]);
      }
      return lookup.get(k);
    }
    for(const seg of segments){
      seg.breaks.sort((a,b)=>a.t-b.t);
      for(let i=1;i<seg.breaks.length;i++){
        const a=get(seg.breaks[i-1].p),b=get(seg.breaks[i].p);
        if(a===b)continue;
        const distance=len(nodes[a],nodes[b]);if(distance<1e-5)continue;
        const edge={a,b,units:distance,roadId:seg.roadId};
        edges.push(edge);adj[a].push({to:b,units:distance,roadId:seg.roadId});
        adj[b].push({to:a,units:distance,roadId:seg.roadId});
      }
    }
    const stops={vesone:[]};
    for(const road of roads.filter(r=>r.kind==='radiale')){
      if(!road.satellite_id)continue;
      const gate=lookup.get(key(road.points[0]));
      const terminal=lookup.get(key(road.points[road.points.length-1]));
      if(gate===undefined||terminal===undefined)throw Error('Route non raccordée : '+road.id);
      stops.vesone.push(gate);
      stops[road.satellite_id]=[terminal];
    }
    stops.vesone=[...new Set(stops.vesone)];
    return {nodes,edges,adj,stops,intersectionCount:segments.reduce((n,s)=>n+Math.max(0,s.breaks.length-2),0)};
  }
  function dijkstra(nodes,adj,origins,goals){
    const goal=new Set(goals),dist=new Array(nodes.length).fill(Infinity);
    const prev=new Array(nodes.length).fill(null),visited=new Set();
    for(const id of origins){if(id<0||id>=nodes.length)continue;dist[id]=0}
    let best=null;
    for(let it=0;it<nodes.length;it++){
      let u=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&isFinite(dist[i])&&(u===-1||dist[i]<dist[u]))u=i;
      if(u<0)break;
      if(goal.has(u)){best=u;break}
      visited.add(u);
      for(const edge of adj[u]){
        const trial=dist[u]+edge.units;
        if(trial+1e-9<dist[edge.to]){dist[edge.to]=trial;prev[edge.to]={id:u,edge}}
      }
    }
    if(best===null)return null;
    const order=[best],legs=[];
    let at=best;
    while(prev[at]){legs.unshift(prev[at].edge);at=prev[at].id;order.unshift(at)}
    return {points:order.map(id=>nodes[id]),units:dist[best],roads:[...new Set(legs.map(e=>e.roadId).filter(Boolean))],nodes:order};
  }
  function shortestRoad(graph,start,finish){
    if(!graph.stops[start]||!graph.stops[finish]||start===finish)return null;
    const result=dijkstra(graph.nodes,graph.adj,graph.stops[start],graph.stops[finish]);
    if(result)result.mode='route';
    return result;
  }
  function buildRailGraph(lines){
    const nodes=[],byStop=new Map(),adj=[],stops={};
    const node=(id,p)=>{if(!byStop.has(id)){const n=nodes.length;byStop.set(id,n);nodes.push(p);adj.push([]);stops[id]=[n]}return byStop.get(id)};
    function add(id1,id2,pts,line){
      const a=node(id1,pts[0]),b=node(id2,pts[pts.length-1]);
      const units=pts.slice(1).reduce((sum,p,i)=>sum+len(pts[i],p),0);
      const forward={to:b,units,roadId:line,points:pts};
      const backward={to:a,units,roadId:line,points:pts.slice().reverse()};
      adj[a].push(forward);adj[b].push(backward);
    }
    for(const line of lines){
      if(line.stops.length!==3)throw Error('Ligne régionale non composée de trois pôles : '+line.id);
      const index=line.points.findIndex(p=>len(p,[1110,698])<.00001);
      if(index<=0||index>=line.points.length-1)throw Error('Correspondance centrale absente : '+line.id);
      add(line.stops[0],line.stops[1],line.points.slice(0,index+1),line.id);
      add(line.stops[1],line.stops[2],line.points.slice(index),line.id);
    }
    return {nodes,adj,stops};
  }
  function shortestRail(graph,start,finish){
    if(!graph.stops[start]||!graph.stops[finish]||start===finish)return null;
    const dist=new Array(graph.nodes.length).fill(Infinity),prev=new Array(graph.nodes.length).fill(null);
    const visited=new Set();dist[graph.stops[start][0]]=0;
    const goal=graph.stops[finish][0];
    for(let k=0;k<graph.nodes.length;k++){
      let at=-1;for(let i=0;i<graph.nodes.length;i++)if(!visited.has(i)&&isFinite(dist[i])&&(at<0||dist[i]<dist[at]))at=i;
      if(at<0||at===goal)break;
      visited.add(at);
      for(const e of graph.adj[at])if(dist[at]+e.units<dist[e.to]-1e-9){dist[e.to]=dist[at]+e.units;prev[e.to]={id:at,edge:e}};
    }
    if(!isFinite(dist[goal]))return null;
    let at=goal;const legs=[];
    while(prev[at]){legs.unshift(prev[at].edge);at=prev[at].id}
    const points=[];for(const e of legs)points.push(...(points.length?e.points.slice(1):e.points));
    return {mode:'rail',points,units:dist[goal],roads:[...new Set(legs.map(e=>e.roadId))],transfers:Math.max(0,new Set(legs.map(e=>e.roadId)).size-1)};
  }
  return {buildRoadGraph,shortestRoad,buildRailGraph,shortestRail};
});
