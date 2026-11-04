/* Arélia Maps 1.8 — territoire procédural structuré, hors canon.
   Ce module ne copie ni relief ni données ni éléments graphiques de GTA V. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./arelia-world.js'):root.AreliaWorld);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.AreliaDetail=api;
})(typeof window==='undefined'?globalThis:window,function(world){
 'use strict';
 const VERSION='1.8.0',TILE=24,LIMIT=180,cache=new Map();
 const round=n=>Math.round(n*1000)/1000;
 const pt=(x,y)=>[round(x),round(y)];
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const rng=s=>()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 const seedFor=(i,j)=>((Math.imul(i+8192,1103515245)^Math.imul(j+8192,2246822519)^20261104)>>>0);
 const inside=(p,i,j,pad=.22)=>p[0]>=i*TILE+pad&&p[0]<=i*TILE+TILE-pad&&p[1]>=j*TILE+pad&&p[1]<=j*TILE+TILE-pad;
 function onLand(points,geo,step=.7){
  if(!points?.length)return false;
  for(let i=0;i<points.length;i++){
   if(!world.isLand(points[i],geo))return false;
   if(i){
    const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(len(a,b)/step));
    for(let j=1;j<n;j++){
     const t=j/n;
     if(!world.isLand([a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t],geo))return false;
    }
   }
  }
  return true;
 }
 function shape(x,y,rx,ry,a,n=8,rough=.06){
  const p=[];
  for(let k=0;k<n;k++){
   const theta=a+Math.PI*2*k/n,f=1+rough*Math.sin(k*9.1+a*2);
   p.push(pt(x+Math.cos(theta)*rx*f,y+Math.sin(theta)*ry*f));
  }
  return p;
 }
 const STYLES={
  foret:{ground:'#8fad8a',edge:'#779e80',foliage:'#578369'},
  'foret-humide':{ground:'#8eac8b',edge:'#6a9e7a',foliage:'#43846c'},
  coniferes:{ground:'#a1b69b',edge:'#789482',foliage:'#567a67'},
  cultures:{ground:'#c6c29b',edge:'#aaa98a',foliage:'#789575'},
  prairie:{ground:'#b7c59a',edge:'#9ab38c',foliage:'#739774'},
  steppe:{ground:'#cfbea1',edge:'#b2a386',foliage:'#9b9874'},
  desert:{ground:'#d8c39b',edge:'#c2aa85',foliage:'#b29c76'},
  marais:{ground:'#a2bcb0',edge:'#80aa9e',foliage:'#508b7b'},
  roche:{ground:'#b0b1a6',edge:'#929c98',foliage:'#818b83'},
  glacier:{ground:'#d9e5e5',edge:'#b5cad1',foliage:'#9db9bf'}
 };
 const bbox=(a,b,margin=0)=>({
  minX:Math.min(a[0],b[0])-margin,maxX:Math.max(a[0],b[0])+margin,
  minY:Math.min(a[1],b[1])-margin,maxY:Math.max(a[1],b[1])+margin
 });
 const nearBox=(b,x,y,r)=>b.maxX>=x-r&&b.minX<=x+r&&b.maxY>=y-r&&b.minY<=y+r;
 function densityAt(x,y,geo,context){
  let nearest=Infinity,mainCity=Infinity,nearestRoad=Infinity,road=null,roadPoint=null;
  for(const town of context?.settlements||[]){
   if(Math.abs(town.x-x)>78||Math.abs(town.y-y)>78)continue;
   nearest=Math.min(nearest,Math.max(0,len([x,y],[town.x,town.y])-town.radius));
  }
  for(const city of geo.places||[]){
   if(!['ville','metropole','capitale'].includes(city.category))continue;
   mainCity=Math.min(mainCity,Math.hypot(city.x-x,city.y-y));
  }
  const roads=[...(geo.roads||[]),...(context?.arterials||[]),...(context?.feeders||[])];
  for(const r of roads){
   const pts=r.points||[];
   for(let k=1;k<pts.length;k++){
    const a=pts[k-1],b=pts[k];
    if(!nearBox(bbox(a,b,36),x,y,1))continue;
    const d=world.segmentDistance([x,y],a,b);
    if(d.distance<nearestRoad){nearestRoad=d.distance;road=r;roadPoint=d.point;}
   }
  }
  // Pas d'habitat dense arbitraire loin du réseau de déplacement.
  const townFactor=clamp(1-nearest/17,0,1);
  const roadFactor=clamp(1-nearestRoad/12,0,1);
  const cityFactor=clamp(1-mainCity/80,0,1);
  const slope=Math.hypot(world.height(x+2,y)-world.height(x-2,y),world.height(x,y+2)-world.height(x,y-2))/4;
  return {townFactor,roadFactor,cityFactor,nearest,mainCity,nearestRoad,road,roadPoint,slope};
 }
 function tile(geo,base,i,j,context){
  if(!base)return null;
  const id=i+','+j;
  if(cache.has(id)){const old=cache.get(id);cache.delete(id);cache.set(id,old);return old;}
  const rand=rng(seedFor(i,j)),ox=i*TILE,oy=j*TILE,kind=base.kind,style=STYLES[kind]||STYLES.prairie;
  const land=p=>inside(p,i,j)&&world.isLand(p,geo);
  const accept=poly=>poly.every(land);
  const agricultural=['cultures','prairie','steppe'].includes(kind),woodland=['foret','foret-humide','coniferes'].includes(kind);
  const wet=['marais','foret-humide'].includes(kind),hostile=['glacier','roche'].includes(kind);
  const mid=[ox+12,oy+12],settlement=densityAt(mid[0],mid[1],geo,context);
  const meadows=[],parcels=[],groves=[],paths=[],ponds=[],structures=[],orchards=[],scrub=[],riparian=[],cliffs=[];
  const largeScaleAngle=Math.atan2(world.height(mid[0],mid[1]+5)-world.height(mid[0],mid[1]-5),
   world.height(mid[0]+5,mid[1])-world.height(mid[0]-5,mid[1]))+.5;
  // Des parcelles voisines partagent une orientation locale ; les reliefs restent irréguliers.
  const count=hostile?7:woodland?17:20;
  for(let k=0;k<count;k++){
   const x=ox+1.7+rand()*20.6,y=oy+1.7+rand()*20.6;
   const poly=shape(x,y,1+rand()*2.8,.65+rand()*2.2,largeScaleAngle+(rand()-.5)*.6,9,.14);
   if(accept(poly))meadows.push({polygon:poly,tone:rand()});
  }
  if(agricultural||kind==='desert'){
   const amount=kind==='desert'?8:kind==='steppe'?22:44;
   for(let k=0;k<amount;k++){
    const x=ox+1.7+rand()*20.6,y=oy+1.7+rand()*20.6;
    const a=largeScaleAngle+(rand()-.5)*.21,w=.65+rand()*1.65,h=.55+rand()*1.3;
    const polygon=shape(x,y,w,h,a,4,0);
    if(accept(polygon))parcels.push({polygon,tone:rand(),furrows:rand()>.48,center:pt(x,y),angle:a,w,h});
   }
  }
  const nTrees=woodland?78:wet?55:kind==='prairie'?25:0;
  for(let k=0;k<nTrees;k++){
   const x=ox+.65+rand()*22.7,y=oy+.65+rand()*22.7;
   if(land([x,y]))groves.push({x:round(x),y:round(y),r:round(.12+rand()*(woodland?.65:.33)),tone:rand()});
  }
  const tr=base.tracks||[];
  for(const route of tr)if(onLand(route.points,geo))paths.push({kind:'piste',points:route.points});
  // Voies secondaires raccordées réellement aux sommets des pistes.
  if(!hostile){
   const density=settlement.townFactor*.8+settlement.roadFactor*.3+settlement.cityFactor*.45;
   const candidates=Math.round(3+6*density+(agricultural?4:0));
   for(let k=0;k<candidates;k++){
    const line=paths[k%Math.max(1,paths.length)];
    if(!line?.points||line.points.length<3)break;
    const idx=1+Math.floor(rand()*(line.points.length-2));
    const p=line.points[idx],a=line.points[idx-1],b=line.points[idx+1],dist=len(a,b);
    if(!dist)continue;
    const normal=[-(b[1]-a[1])/dist,(b[0]-a[0])/dist],side=rand()>.5?1:-1;
    const length=2+rand()*6.5;
    const end=pt(p[0]+normal[0]*length*side,p[1]+normal[1]*length*side);
    const middle=pt(p[0]+normal[0]*length*.52*side+(rand()-.5)*.55,p[1]+normal[1]*length*.52*side+(rand()-.5)*.55);
    const pts=[p,middle,end];
    if(pts.slice(1).every(land)&&onLand(pts,geo))paths.push({kind:k%4===0?'vicinale':'sentier',points:pts});
   }
   // Raccordement à une route du réseau national passant dans cette cellule.
   const roadPoint=settlement.roadPoint;
   if(roadPoint&&land(roadPoint)&&paths.length){
    const core=paths[0].points[Math.floor(paths[0].points.length/2)];
    if(len(core,roadPoint)<16&&len(core,roadPoint)>1){
     const points=[core,pt((core[0]+roadPoint[0])/2,(core[1]+roadPoint[1])/2),roadPoint];
     if(onLand(points,geo))paths.push({kind:'raccordement',points,connects: settlement.road?.id});
    }
   }
  }
  // Ferme ou hameau : bâtiments orientés par la route la plus proche, non dispersés.
  if(!hostile&&kind!=='marais'&&settlement.mainCity>40){
   const basic=agricultural?9:woodland?5:kind==='desert'?1:4;
   const factor=clamp(.3+settlement.roadFactor*.9+settlement.townFactor*.7,0,1.6);
   const target=Math.round(basic*factor+(settlement.townFactor>.4?12:0));
   const centres=[];
   let tries=0;
   while(structures.length<target&&tries++<target*35&&paths.length){
    const road=paths[Math.floor(rand()*paths.length)],pts=road.points;
    const s=Math.floor(rand()*(pts.length-1)),a=pts[s],b=pts[s+1],length=len(a,b);
    if(length<.2)continue;
    const t=.15+rand()*.7,side=rand()>.5?1:-1,d=.36+rand()*.65;
    const ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length;
    const x=a[0]*(1-t)+b[0]*t-uy*d*side,y=a[1]*(1-t)+b[1]*t+ux*d*side;
    if(!land([x,y])||centres.some(p=>len(p,[x,y])<.85))continue;
    const a0=Math.atan2(uy,ux),w=.12+rand()*.21,h=.15+rand()*.25;
    const polygon=[[-w,-h],[w,-h],[w,h],[-w,h]].map(([u,v])=>pt(x+u*Math.cos(a0)-v*Math.sin(a0),y+u*Math.sin(a0)+v*Math.cos(a0)));
    if(!accept(polygon))continue;
    centres.push([x,y]);structures.push({polygon,tone:rand(),road:road.kind});
   }
  }
  if(agricultural){
   for(let k=0;k<12;k++){
    const x=ox+2+rand()*20,y=oy+2+rand()*20,trees=[];
    for(let t=0;t<12;t++){
     const p=pt(x+(t%4)*.5,y+Math.floor(t/4)*.54);
     if(land(p))trees.push(p);
    }
    if(trees.length>=6)orchards.push({trees});
   }
  }
  if(['steppe','desert','roche','glacier'].includes(kind)){
   for(let k=0;k<52;k++){
    const x=ox+rand()*24,y=oy+rand()*24;
    if(land([x,y]))scrub.push({x:round(x),y:round(y),size:round(.1+rand()*.32),tone:rand()});
   }
  }
  // Le corridor humide suit uniquement les rivières existantes de l'atlas.
  const waters=[...(geo.rivers||[]),...(context?.streams||[])];
  for(const river of waters){
   if(riparian.length>=50)break;
   for(let s=1;s<(river.points||[]).length;s++){
    const a=river.points[s-1],b=river.points[s],span=len(a,b);
    if(!nearBox(bbox(a,b,4),mid[0],mid[1],12)||span<.2)continue;
    const n=Math.min(40,Math.ceil(span/2.6));
    for(let k=0;k<=n&&riparian.length<50;k++){
     const t=k/Math.max(1,n),x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
     if(!land([x,y]))continue;
     const radius=.58+rand()*.9;
     const polygon=shape(x,y,radius*1.5,radius,Math.atan2(b[1]-a[1],b[0]-a[0]),8,.09);
     if(accept(polygon))riparian.push({polygon});
    }
   }
  }
  if(wet){
   for(let k=0;k<8;k++){
    const x=ox+1.2+rand()*21.6,y=oy+1.2+rand()*21.6;
    const polygon=shape(x,y,.35+rand()*.9,.19+rand()*.52,rand()*6,9,.11);
    if(accept(polygon))ponds.push({polygon});
   }
  }
  if(hostile||settlement.slope>1.65){
   for(let k=0;k<30;k++){
    const x=ox+.7+rand()*22.6,y=oy+.7+rand()*22.6;
    if(!land([x,y]))continue;
    const dx=world.height(x+1,y)-world.height(x-1,y),dy=world.height(x,y+1)-world.height(x,y-1);
    const magnitude=Math.hypot(dx,dy);
    if(magnitude<1.2)continue;
    const unit=[-dy/magnitude,dx/magnitude],width=.3+rand()*1.15;
    const points=[pt(x-unit[0]*width,y-unit[1]*width),pt(x+unit[0]*width,y+unit[1]*width)];
    if(onLand(points,geo))cliffs.push({points,tone:rand()});
   }
  }
  const obj={id,i,j,version:VERSION,kind,style,landUse:{
   nearestTownKm:round(settlement.nearest),nearestRoadKm:round(settlement.nearestRoad),slopeIndex:round(settlement.slope)},
   meadows,parcels,groves,paths,ponds,structures,orchards,scrub,riparian,cliffs,status:'territoire procédural non canonique'};
  cache.set(id,obj);if(cache.size>LIMIT)cache.delete(cache.keys().next().value);
  return obj;
 }
 return {VERSION,TILE,tile,STYLES,lineOnLand:onLand,densityAt};
});